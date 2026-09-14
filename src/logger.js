// Records one row per drive-loop tick (telemetry + actuator command) while
// enabled, and exports the buffer as CSV. Capped so a long-forgotten
// recording can't grow without bound.
const MAX_ROWS = 200_000; // ~2.2h at the 25Hz drive-loop rate

export const LOG_COLUMNS = [
  't_ms', 'source',
  'prox_left', 'prox_frontLeft', 'prox_center', 'prox_frontRight', 'prox_right', 'prox_backLeft', 'prox_backRight',
  'ground_left', 'ground_right', 'ground_ambientLeft', 'ground_ambientRight',
  'color_h', 'color_s', 'color_v',
  'pitch_deg', 'roll_deg', 'angle_deg', 'gyroRate_degPerSec', 'heading_deg',
  'micVolume', 'battery_v', 'irCode',
  'motorFeedback_left', 'motorFeedback_right',
  'button_forward', 'button_back', 'button_left', 'button_right', 'button_center',
  'cmd_motorLeft', 'cmd_motorRight',
  'led_frontLeft_r', 'led_frontLeft_g', 'led_frontLeft_b',
  'led_frontRight_r', 'led_frontRight_g', 'led_frontRight_b',
  'led_rearLeft_r', 'led_rearLeft_g', 'led_rearLeft_b',
  'led_rearRight_r', 'led_rearRight_g', 'led_rearRight_b',
];

const round1 = (v) => Math.round(v * 10) / 10;
const round2 = (v) => Math.round(v * 100) / 100;
const bit = (v) => (v ? 1 : 0);

export class DataLogger {
  constructor() {
    this.enabled = false;
    this.full = false;
    this.startedAt = 0;
    this.rows = [];
  }

  start() {
    this.enabled = true;
    this.full = false;
    this.startedAt = Date.now();
    this.rows = [];
  }

  stop() {
    this.enabled = false;
  }

  clear() {
    this.rows = [];
    this.full = false;
  }

  // t: telemetry (raw, not display-adjusted), c: command state, live: source
  record(t, c, live) {
    if (!this.enabled || this.full) return;
    if (this.rows.length >= MAX_ROWS) { this.full = true; this.enabled = false; return; }
    this.rows.push([
      Date.now() - this.startedAt, live ? 'ROBOT' : 'SIM',
      t.prox.left, t.prox.frontLeft, t.prox.center, t.prox.frontRight, t.prox.right, t.prox.backLeft, t.prox.backRight,
      t.ground.left, t.ground.right, Math.round(t.ground.ambientLeft), Math.round(t.ground.ambientRight),
      t.color.h, t.color.s, t.color.v,
      round1(t.pitch), round1(t.roll), round1(t.angle), round1(t.rate), round1(t.heading || 0),
      t.micVolume, round2(t.battery), t.tvRemote,
      t.motor.left, t.motor.right,
      bit(t.buttons.forward), bit(t.buttons.back), bit(t.buttons.left), bit(t.buttons.right), bit(t.buttons.center),
      c.left, c.right,
      ...c.leds.flatMap((l) => [l.r, l.g, l.b]),
    ]);
  }

  toCsv() {
    const lines = [LOG_COLUMNS.join(',')];
    for (const row of this.rows) lines.push(row.join(','));
    return lines.join('\n');
  }

  export(filename = `thymio3-log-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`) {
    const blob = new Blob([this.toCsv()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
