// Simulated Thymio 3 in a simple walled room. Produces the same telemetry
// shape as the live robot (see telemetry.js), so the cockpit does not care
// which source it is reading.

export const WORLD = { w: 2000, h: 1400 };

const OBSTACLES = [
  { x: 280, y: 180, w: 230, h: 230 },
  { x: 1180, y: 150, w: 320, h: 150 },
  { x: 880, y: 760, w: 170, h: 430 },
  { x: 1520, y: 880, w: 270, h: 270 },
  { x: 120, y: 880, w: 150, h: 310 },
];

const FLOOR = [
  { x: 0, y: 600, w: 2000, h: 74, c: '#0a0a0a', n: 'BLACK LINE' },
  { x: 600, y: 0, w: 74, h: 1400, c: '#0a0a0a', n: 'BLACK LINE' },
  { x: 1640, y: 280, w: 210, h: 210, c: '#d92b12', n: 'RED PAD' },
  { x: 230, y: 1120, w: 210, h: 210, c: '#1e6fd9', n: 'BLUE PAD' },
  { x: 1080, y: 1120, w: 210, h: 210, c: '#1fa85c', n: 'GREEN PAD' },
];

const FRONT_ANGLES = [-0.61, -0.31, 0, 0.31, 0.61];

export function rgbToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: Math.round((h + 360) % 360), s: Math.round(mx ? (d / mx) * 100 : 0), v: Math.round(mx * 100) };
}

export class RobotSim {
  constructor() {
    this.pose = { x: 400, y: 1030, th: -Math.PI / 2 };
    this.trail = [];
    this.prevV = 0;
    this.batt = 4.12;
    this.mic = new Array(36).fill(6);
    this.tel = {
      prox: { left: 0, frontLeft: 0, center: 0, frontRight: 0, right: 0, backLeft: 0, backRight: 0 },
      ground: { left: 900, right: 900, ambientLeft: 310, ambientRight: 305 },
      color: { h: 0, s: 0, v: 96, css: '#e8e6e2', name: 'WHITE FLOOR' },
      angle: 0, rate: 0, pitch: 0, roll: 0,
      micVolume: 420, micHistory: this.mic,
      buttons: { forward: false, back: false, left: false, right: false, center: false },
      tvRemote: 0, battery: 4.12,
      motor: { left: 0, right: 0 },
      events: { tap: 0, clap: 0, freefall: 0 },
    };
  }

  blocked(x, y) {
    if (x < 50 || y < 50 || x > WORLD.w - 50 || y > WORLD.h - 50) return true;
    return OBSTACLES.some((o) => x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h);
  }

  ray(a) {
    for (let d = 56; d < 250; d += 3) {
      if (this.blocked(this.pose.x + Math.cos(a) * d, this.pose.y + Math.sin(a) * d)) return d;
    }
    return 250;
  }

  static proxValue(d) {
    const dd = d - 55;
    if (dd >= 190) return 0;
    return Math.max(0, Math.min(4000, Math.round(4000 * Math.pow(1 - dd / 190, 1.5))));
  }

  floorAt(x, y) {
    return FLOOR.find((f) => x > f.x && x < f.x + f.w && y > f.y && y < f.y + f.h) || null;
  }

  groundAt(offset) {
    const a = this.pose.th;
    const px = this.pose.x + Math.cos(a) * 50 - Math.sin(a) * offset;
    const py = this.pose.y + Math.sin(a) * 50 + Math.cos(a) * offset;
    const f = this.floorAt(px, py);
    if (!f) return 940;
    const r = parseInt(f.c.slice(1, 3), 16), g = parseInt(f.c.slice(3, 5), 16), b = parseInt(f.c.slice(5, 7), 16);
    return Math.round(((0.299 * r + 0.587 * g + 0.114 * b) / 255) * 1000);
  }

  // dt in seconds; command is { left, right } in robot speed units.
  step(dt, command) {
    const t = this.tel;
    const mL = command.left, mR = command.right;
    const vL = mL * 0.4, vR = mR * 0.4;
    const v = (vL + vR) / 2, om = (vR - vL) / 95;

    const nth = this.pose.th + om * dt;
    const nx = this.pose.x + Math.cos(nth) * v * dt;
    const ny = this.pose.y + Math.sin(nth) * v * dt;
    this.pose.th = nth;
    if (!this.blocked(nx, ny) || this.blocked(this.pose.x, this.pose.y)) {
      this.pose.x = nx;
      this.pose.y = ny;
    } else if (v !== 0) {
      t.events.tap = Date.now();
      t.collided = true;
    }

    t.rate = (om * 180) / Math.PI;
    t.angle = (t.angle + t.rate * dt + 360) % 360;
    t.motor = { left: mL, right: mR };

    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(this.pose.x - last[0], this.pose.y - last[1]) > 14) {
      this.trail.push([this.pose.x, this.pose.y]);
      if (this.trail.length > 260) this.trail.shift();
    }

    const acc = (v - this.prevV) / dt;
    this.prevV = v;
    t.pitch += (-acc * 0.012 - t.pitch) * 0.14;
    t.roll += (-t.rate * 0.07 - t.roll) * 0.12;

    const front = FRONT_ANGLES.map((o) => RobotSim.proxValue(this.ray(this.pose.th + o)));
    t.prox = {
      left: front[0], frontLeft: front[1], center: front[2], frontRight: front[3], right: front[4],
      backLeft: RobotSim.proxValue(this.ray(this.pose.th + Math.PI - 0.34)),
      backRight: RobotSim.proxValue(this.ray(this.pose.th + Math.PI + 0.34)),
    };

    t.ground.left = this.groundAt(-12.5);
    t.ground.right = this.groundAt(12.5);
    t.ground.ambientLeft = 300 + Math.round(Math.sin(Date.now() / 1700) * 22 + Math.random() * 8);
    t.ground.ambientRight = t.ground.ambientLeft + Math.round(Math.random() * 9 - 4);

    const f = this.floorAt(this.pose.x, this.pose.y);
    const hex = f ? f.c : '#e8e6e2';
    t.color = { ...rgbToHsv(hex), css: hex, name: f ? f.n : 'WHITE FLOOR' };

    const load = (Math.abs(mL) + Math.abs(mR)) / 2;
    const level = Math.min(100, Math.round(14 + load * 0.055 + Math.random() * 11 + (Date.now() - t.events.tap < 400 ? 55 : 0)));
    t.micVolume = level * 10;
    this.mic.push(level);
    if (this.mic.length > 36) this.mic.shift();
    t.micHistory = this.mic;
    if (level > 78) t.events.clap = Date.now();

    this.batt = Math.max(3.3, this.batt - (2e-6 + load * 4e-8));
    t.battery = this.batt;
    t.heading = ((this.pose.th * 180) / Math.PI + 450) % 360;
    return t;
  }
}
