// Canvas viewport: trajectory map + proximity radar, drawn from telemetry.
const P = '#7dfaa8', PD = '#3f6b52', AM = '#ffc24a', RD = '#ff563c';
const tone = (v) => (v > 2600 ? RD : v > 1200 ? AM : P);

// Map view state (owned by the cockpit): pan centre (mm), zoom (px per mm),
// rotation (deg, CCW), follow the robot, and heading-up orientation.
export const MAP_DEFAULT = { cx: 0, cy: 0, zoom: 0.3, rot: 0, follow: true, headingUp: false };

// World (mm, y up) <-> screen mapping shared by drawing and pointer input.
export function mapTransform(mv, traj, w, h) {
  const R = (mv.rot * Math.PI) / 180 + (mv.headingUp ? -traj.th : 0);
  const cx = mv.follow ? traj.x : mv.cx, cy = mv.follow ? traj.y : mv.cy;
  const cosR = Math.cos(R), sinR = Math.sin(R), z = mv.zoom;
  return {
    R, cx, cy, cosR, sinR, z,
    toScreen: (px, py) => {
      const dx = px - cx, dy = py - cy;
      return [w / 2 + z * (dx * cosR - dy * sinR), h / 2 - z * (dx * sinR + dy * cosR)];
    },
    fromScreen: (sx, sy) => {
      const u = (sx - w / 2) / z, v = -(sy - h / 2) / z;
      return [cx + u * cosR + v * sinR, cy - u * sinR + v * cosR];
    },
  };
}

const NICE = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

export function drawViewport(canvas, tel, { mode = 'COMBO', scanlines = true, sweep = 0, traj, mv = MAP_DEFAULT }) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#050806';
  g.fillRect(0, 0, w, h);

  if (mode === 'RADAR') {
    radar(g, tel, 0, 0, w, h, sweep, false);
  } else {
    if (traj) mapView(g, traj, mv, w, h);
    if (mode === 'COMBO') {
      const s = 210;
      g.save();
      g.translate(w - s - 22, h - s - 22);
      g.fillStyle = 'rgba(5,8,6,.88)';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#23402f';
      g.lineWidth = 2;
      g.strokeRect(1, 1, s - 2, s - 2);
      radar(g, tel, 0, 0, s, s, sweep, true);
      g.restore();
    }
  }

  if (scanlines) {
    g.globalAlpha = 0.16;
    g.fillStyle = '#0d1f14';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.globalAlpha = 1;
  }
  const vig = g.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);
}

function mapView(g, traj, mv, w, h) {
  const T = mapTransform(mv, traj, w, h);
  const { z, toScreen } = T;

  // Grid, sized so lines stay roughly 70px apart at any zoom.
  const step = NICE.find((n) => n * z >= 70) || NICE[NICE.length - 1];
  const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([sx, sy]) => T.fromScreen(sx, sy));
  const minX = Math.min(...corners.map((c) => c[0])), maxX = Math.max(...corners.map((c) => c[0]));
  const minY = Math.min(...corners.map((c) => c[1])), maxY = Math.max(...corners.map((c) => c[1]));
  const line = (x1, y1, x2, y2) => {
    const a = toScreen(x1, y1), b = toScreen(x2, y2);
    g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  };
  g.lineWidth = 1;
  for (let k = Math.ceil(minX / step); k <= Math.floor(maxX / step); k++) {
    g.strokeStyle = k % 5 === 0 ? '#23402f' : '#142219';
    g.beginPath(); line(k * step, minY, k * step, maxY); g.stroke();
  }
  for (let k = Math.ceil(minY / step); k <= Math.floor(maxY / step); k++) {
    g.strokeStyle = k % 5 === 0 ? '#23402f' : '#142219';
    g.beginPath(); line(minX, k * step, maxX, k * step); g.stroke();
  }
  g.strokeStyle = '#3f6b52';
  g.lineWidth = 1.5;
  g.beginPath(); line(0, minY, 0, maxY); line(minX, 0, maxX, 0); g.stroke();

  // Trajectory.
  g.strokeStyle = P;
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.beginPath();
  traj.trail.forEach(([x, y], i) => {
    const [sx, sy] = toScreen(x, y);
    if (i) g.lineTo(sx, sy); else g.moveTo(sx, sy);
  });
  const [rx, ry] = toScreen(traj.x, traj.y);
  g.lineTo(rx, ry);
  g.stroke();

  // Start marker.
  const [ox, oy] = toScreen(0, 0);
  g.strokeStyle = AM;
  g.lineWidth = 2;
  g.beginPath(); g.arc(ox, oy, 6, 0, Math.PI * 2); g.stroke();
  g.font = '700 10px Archivo';
  g.fillStyle = AM;
  g.fillText('START', ox + 10, oy - 8);

  // Robot: footprint (11 cm) when zoomed in enough, plus a heading arrow.
  const fx = -Math.sin(traj.th), fy = Math.cos(traj.th);
  const sdx = fx * T.cosR - fy * T.sinR, sdy = -(fx * T.sinR + fy * T.cosR);
  if (55 * z > 8) {
    g.strokeStyle = 'rgba(125,250,168,.55)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(rx, ry, 55 * z, 0, Math.PI * 2); g.stroke();
  }
  g.save();
  g.translate(rx, ry);
  g.rotate(Math.atan2(sdx, -sdy));
  g.fillStyle = P;
  g.beginPath(); g.moveTo(0, -12); g.lineTo(-8, 9); g.lineTo(0, 5); g.lineTo(8, 9); g.closePath(); g.fill();
  g.restore();

  // Scale bar.
  const bar = [...NICE].reverse().find((n) => n * z <= 150) || NICE[0];
  const bx = 24, by = h - 28, bl = bar * z;
  g.strokeStyle = P;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(bx, by - 5); g.lineTo(bx, by); g.lineTo(bx + bl, by); g.lineTo(bx + bl, by - 5);
  g.stroke();
  g.font = '700 10px Archivo';
  g.fillStyle = P;
  g.fillText(bar >= 1000 ? `${bar / 1000} m` : `${bar} mm`, bx, by + 14);

  // Orientation marker: which way the initial heading (0°) points on screen.
  const ax = 34, ay = 34;
  g.strokeStyle = '#23402f';
  g.lineWidth = 2;
  g.beginPath(); g.arc(ax, ay, 16, 0, Math.PI * 2); g.stroke();
  const tx = ax - 16 * T.sinR, ty = ay - 16 * T.cosR;
  g.strokeStyle = RD;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(tx, ty); g.stroke();
  g.fillStyle = RD;
  g.beginPath(); g.arc(tx, ty, 3, 0, Math.PI * 2); g.fill();
  g.font = '700 10px Archivo';
  g.fillStyle = PD;
  g.fillText('0°', ax + 22, ay + 4);
}

function radar(g, tel, ox, oy, w, h, sweep, mini) {
  const cx = ox + w / 2, cy = oy + h / 2 + (mini ? 0 : 10), R = Math.min(w, h) * 0.4;
  g.strokeStyle = '#23402f';
  g.lineWidth = mini ? 1 : 2;
  for (let i = 1; i <= 4; i++) { g.beginPath(); g.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); g.stroke(); }
  g.beginPath();
  g.moveTo(cx - R, cy); g.lineTo(cx + R, cy);
  g.moveTo(cx, cy - R); g.lineTo(cx, cy + R);
  g.stroke();

  const sensors = [
    [tel.prox.left, -0.61], [tel.prox.frontLeft, -0.31], [tel.prox.center, 0],
    [tel.prox.frontRight, 0.31], [tel.prox.right, 0.61],
    [tel.prox.backLeft, Math.PI - 0.34], [tel.prox.backRight, Math.PI + 0.34],
  ];
  sensors.forEach(([v, a]) => {
    const ang = a - Math.PI / 2, n = v / 4000, col = tone(v);
    g.fillStyle = col;
    g.globalAlpha = 0.1 + n * 0.6;
    g.beginPath();
    g.moveTo(cx, cy);
    g.arc(cx, cy, R * (n ? Math.max(0.14, 1 - n * 0.82) : 1), ang - 0.13, ang + 0.13);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    if (n > 0.02) {
      const d = R * (1 - n * 0.82);
      g.fillStyle = col;
      g.beginPath();
      g.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, mini ? 2.5 : 4.5, 0, Math.PI * 2);
      g.fill();
    }
  });

  const sa = sweep - Math.PI / 2;
  const grad = g.createLinearGradient(cx, cy, cx + Math.cos(sa) * R, cy + Math.sin(sa) * R);
  grad.addColorStop(0, 'rgba(125,250,168,.55)');
  grad.addColorStop(1, 'rgba(125,250,168,0)');
  g.strokeStyle = grad;
  g.lineWidth = mini ? 1.5 : 3;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R); g.stroke();

  g.fillStyle = P;
  g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx - 7, cy + 7); g.lineTo(cx + 7, cy + 7); g.closePath(); g.fill();

  if (!mini) {
    g.font = '600 10px Archivo';
    g.fillStyle = PD;
    ['3000', '2000', '1000', '0'].forEach((label, i) => g.fillText(label, cx + 6, cy - (R * (i + 1)) / 4 + 13));
  }
}
