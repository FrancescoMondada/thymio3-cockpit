// Canvas viewport: first-person HUD + proximity radar, drawn from telemetry.
const P = '#7dfaa8', PD = '#3f6b52', AM = '#ffc24a', RD = '#ff563c';
const tone = (v) => (v > 2600 ? RD : v > 1200 ? AM : P);

export function drawViewport(canvas, tel, { mode = 'COMBO', scanlines = true, sweep = 0 }) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr)) {
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
    hud(g, tel, w, h);
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
  vig.addColorStop(1, 'rgba(0,0,0,.72)');
  g.fillStyle = vig;
  g.fillRect(0, 0, w, h);
}

function hud(g, tel, w, h) {
  const cx = w / 2, cy = h / 2 + tel.pitch * 5;
  g.save();
  g.translate(cx, cy);
  g.rotate((tel.roll * Math.PI) / 180);
  g.strokeStyle = 'rgba(125,250,168,.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-w * 0.42, 0); g.lineTo(-60, 0);
  g.moveTo(60, 0); g.lineTo(w * 0.42, 0);
  g.stroke();
  g.font = '600 11px Archivo';
  g.fillStyle = 'rgba(125,250,168,.5)';
  for (let p = -30; p <= 30; p += 10) {
    if (!p) continue;
    const y = -p * 5.2, len = p % 20 ? 52 : 88;
    g.beginPath();
    g.moveTo(-len, y); g.lineTo(-22, y);
    g.moveTo(22, y); g.lineTo(len, y);
    g.stroke();
    g.fillText(String(Math.abs(p)), len + 7, y + 4);
    g.fillText(String(Math.abs(p)), -len - 22, y + 4);
  }
  g.restore();

  const bars = [
    ['L', tel.prox.left, -0.61], ['FL', tel.prox.frontLeft, -0.31], ['C', tel.prox.center, 0],
    ['FR', tel.prox.frontRight, 0.31], ['R', tel.prox.right, 0.61],
  ];
  bars.forEach(([label, v, a]) => {
    const x = w / 2 + (a / 0.61) * (w * 0.33), bw = 74, n = v / 4000;
    const bh = Math.max(4, n * (h * 0.42));
    const col = tone(v);
    g.fillStyle = col;
    g.globalAlpha = 0.22 + n * 0.5;
    g.fillRect(x - bw / 2, h * 0.72 - bh, bw, bh);
    g.globalAlpha = 1;
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - bw / 2, h * 0.72 - bh + 12); g.lineTo(x - bw / 2, h * 0.72 - bh); g.lineTo(x - bw / 2 + 14, h * 0.72 - bh);
    g.moveTo(x + bw / 2, h * 0.72 - bh + 12); g.lineTo(x + bw / 2, h * 0.72 - bh); g.lineTo(x + bw / 2 - 14, h * 0.72 - bh);
    g.stroke();
    g.font = '800 13px Archivo';
    g.fillStyle = col;
    g.fillText(String(v), x - bw / 2, h * 0.72 + 20);
    g.font = '600 10px Archivo';
    g.fillStyle = PD;
    g.fillText(label, x - bw / 2, h * 0.72 + 36);
  });

  g.strokeStyle = 'rgba(125,250,168,.3)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(w * 0.16, h * 0.72); g.lineTo(w * 0.84, h * 0.72); g.stroke();

  [[tel.prox.backLeft, -1], [tel.prox.backRight, 1]].forEach(([v, side]) => {
    const x = side < 0 ? 26 : w - 58, n = v / 4000;
    g.fillStyle = tone(v);
    g.globalAlpha = 0.2 + n * 0.7;
    g.fillRect(x, h * 0.42, 32, h * 0.16);
    g.globalAlpha = 1;
    g.font = '800 11px Archivo';
    g.fillStyle = PD;
    g.fillText('AFT ' + v, x, h * 0.42 - 9);
  });

  g.strokeStyle = P;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(w / 2 - 26, h / 2); g.lineTo(w / 2 - 8, h / 2);
  g.moveTo(w / 2 + 8, h / 2); g.lineTo(w / 2 + 26, h / 2);
  g.moveTo(w / 2, h / 2 - 26); g.lineTo(w / 2, h / 2 - 8);
  g.moveTo(w / 2, h / 2 + 8); g.lineTo(w / 2, h / 2 + 26);
  g.stroke();

  const hd = tel.heading || 0;
  g.strokeStyle = '#23402f';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(w * 0.2, 34); g.lineTo(w * 0.8, 34); g.stroke();
  g.font = '600 10px Archivo';
  for (let d = -60; d <= 60; d += 15) {
    const label = (Math.round(hd / 15) * 15 + d + 360) % 360;
    const x = w / 2 + (d - (hd % 15)) * ((w * 0.6) / 120);
    if (x < w * 0.2 || x > w * 0.8) continue;
    g.strokeStyle = PD;
    g.beginPath(); g.moveTo(x, 34); g.lineTo(x, 24); g.stroke();
    g.fillStyle = PD;
    g.fillText(String(label).padStart(3, '0'), x - 10, 18);
  }
  g.fillStyle = P;
  g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w / 2 - 7, 50); g.lineTo(w / 2 + 7, 50); g.closePath(); g.fill();

  [[tel.ground.left, -1], [tel.ground.right, 1]].forEach(([v, side]) => {
    const x = w / 2 + side * 44 - 22, shade = v / 1000;
    g.strokeStyle = '#23402f';
    g.lineWidth = 2;
    g.strokeRect(x, h - 58, 44, 30);
    g.fillStyle = 'rgba(217,242,227,' + (0.12 + shade * 0.85) + ')';
    g.fillRect(x + 2, h - 56, 40, 26);
    g.font = '700 10px Archivo';
    g.fillStyle = PD;
    g.fillText(String(v), x, h - 14);
  });
  g.font = '600 10px Archivo';
  g.fillStyle = PD;
  g.fillText('GROUND', w / 2 - 92, h - 38);
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
