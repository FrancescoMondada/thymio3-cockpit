// Dead-reckoned 2D trajectory. Heading comes from the gyro-integrated angle
// (CCW positive), distance from the wheel-speed feedback. World frame is in
// millimetres with y up; the robot starts at the origin facing +y.
//
// Speed units -> mm/s is approximate (Thymio-class robots are ~0.4 mm/s per
// unit); check it against a known distance and adjust if the map is off.
export const MM_PER_UNIT_S = 0.4;

const MIN_STEP_MM = 3;
const MAX_POINTS = 40_000;

export class Trajectory {
  constructor() { this.reset(); }

  // Clears the trail and makes the robot's current pose the map origin.
  reset() {
    this.x = 0;
    this.y = 0;
    this.th = 0;
    this.length = 0;
    this.trail = [[0, 0]];
    this.angle0 = null;
    this.lastTime = null;
  }

  update(tel, now) {
    // Live telemetry isn't trustworthy until the secondary sensor stream
    // (which carries the gyro angle) has delivered at least one packet.
    if (tel.fresh === false) return;
    if (this.angle0 === null) this.angle0 = tel.angle;

    const dt = this.lastTime === null ? 0 : Math.min(0.2, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.th = ((tel.angle - this.angle0) * Math.PI) / 180;
    const dist = ((tel.motor.left + tel.motor.right) / 2) * MM_PER_UNIT_S * dt;
    this.x += -Math.sin(this.th) * dist;
    this.y += Math.cos(this.th) * dist;
    this.length += Math.abs(dist);

    const last = this.trail[this.trail.length - 1];
    if (Math.hypot(this.x - last[0], this.y - last[1]) >= MIN_STEP_MM) {
      this.trail.push([this.x, this.y]);
      if (this.trail.length > MAX_POINTS) this.trail = this.trail.filter((_, i) => i % 2 === 0);
    }
  }

  get headingDeg() { return (((this.th * 180) / Math.PI) % 360 + 360) % 360; }
}
