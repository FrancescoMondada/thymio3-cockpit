import { thymio, EVENTS } from './api.js';

const ema = (prev, next, a = 0.25) => prev + a * (next - prev);

// Bridges the API's DOM events into the same telemetry shape the simulator
// produces, and pushes actuator state back to the robot at a fixed rate.
export class LiveLink {
  constructor(onChange) {
    this.onChange = onChange;
    this.connected = false;
    this.sending = false;
    this.lastSent = 0;
    this.tel = {
      prox: { left: 0, frontLeft: 0, center: 0, frontRight: 0, right: 0, backLeft: 0, backRight: 0 },
      ground: { left: 0, right: 0, ambientLeft: 0, ambientRight: 0 },
      color: { h: 0, s: 0, v: 0, css: '#000000', name: 'COLOR' },
      angle: 0, rate: 0, pitch: 0, roll: 0,
      micVolume: 0, micHistory: new Array(36).fill(0),
      buttons: { forward: false, back: false, left: false, right: false, center: false },
      tvRemote: 0, battery: 0,
      motor: { left: 0, right: 0 },
      events: { tap: 0, clap: 0, freefall: 0 },
      heading: 0,
    };
  }

  attach() {
    this.onConnected = async (event) => {
      this.connected = Boolean(event.detail);
      if (this.connected) {
        try { await thymio.startAllSensorStreaming(); } catch (err) { console.warn('sensor streaming failed', err); }
      }
      this.onChange?.();
    };
    this.onMain = (event) => this.applyMain(event.detail);
    this.onOther = (event) => this.applyOther(event.detail);

    document.addEventListener(EVENTS.connected, this.onConnected);
    document.addEventListener(EVENTS.sensors, this.onMain);
    document.addEventListener(EVENTS.otherSensors, this.onOther);
  }

  detach() {
    document.removeEventListener(EVENTS.connected, this.onConnected);
    document.removeEventListener(EVENTS.sensors, this.onMain);
    document.removeEventListener(EVENTS.otherSensors, this.onOther);
  }

  applyMain(d) {
    if (!d) return;
    const t = this.tel;
    t.prox = { ...d.proximitySensors };
    t.ground.left = d.groundSensors.left;
    t.ground.right = d.groundSensors.right;
    t.buttons = { ...d.buttons };
    t.micVolume = d.microphoneVolume;
    t.tvRemote = d.tvRemote;
    const { h, s, v } = d.colorSensor;
    t.color = { h, s: Math.round((s / 255) * 100), v: Math.round((v / 255) * 100), css: `hsl(${h} ${(s / 255) * 100}% ${(v / 255) * 50}%)`, name: 'COLOR SENSOR' };
    // Inclination from the raw accelerometer (approximate, in degrees).
    const { x, y, z } = d.accelerationRaw;
    t.roll = -(Math.atan2(y, z) * 180) / Math.PI;
    t.pitch = (Math.atan2(-x, Math.hypot(y, z)) * 180) / Math.PI;
    t.rate = d.gyroRaw.z / 16;
    const hist = t.micHistory.slice(1);
    hist.push(Math.min(100, Math.round(d.microphoneVolume / 10)));
    t.micHistory = hist;
    this.onChange?.();
  }

  applyOther(d) {
    if (!d) return;
    const t = this.tel;
    // Raw ambient-light samples are noisy frame to frame (indoor lighting
    // flicker, IR crosstalk with the ground-reflectance pulses); the round
    // gauges scale directly off these values, so smooth them with an EMA
    // instead of driving the dial from the raw single sample.
    t.ground.ambientLeft = ema(t.ground.ambientLeft, d.groundAmbient.left);
    t.ground.ambientRight = ema(t.ground.ambientRight, d.groundAmbient.right);
    // groundReflected here duplicates groundSensors from the main stream
    // (applyMain, above) at a different cadence — writing it here made the
    // ground-sensor readout race between two independently-timed samples of
    // the same signal, which reads as oscillation. The main stream is the
    // one documented (README) as carrying ground-reflected data; leave it
    // as the single source.
    // Firmware reports angleDegrees increasing clockwise; the cockpit uses
    // the opposite (CCW-positive) convention, so negate it here — the one
    // place both the ANGLE readout and the heading/compass derive from.
    t.angle = -d.angleDegrees;
    t.heading = ((-d.angleDegrees % 360) + 360) % 360;
    t.motor = { left: d.motor.leftSpeed, right: d.motor.rightSpeed };
    t.battery = d.batteryVoltage / 1000;
    if (d.eventFlags.tapDetected) t.events.tap = Date.now();
    if (d.eventFlags.clapDetected) t.events.clap = Date.now();
    if (d.eventFlags.freefallDetected) t.events.freefall = Date.now();
    this.onChange?.();
  }

  // Full actuator frame — the API expects every field on every write.
  // Each frame is two writeValueWithResponse() GATT calls, serialized by the
  // API's own bluetooth queue; that round trip can take longer than our send
  // interval. Gating on "still sending" (instead of a fixed timestamp) means
  // a slow link never backs up a queue of stale commands — we always send
  // the freshest cmd.current as soon as the previous write actually lands.
  // A floor of ~50ms between sends caps it at 20Hz: fast enough to feel
  // responsive, but leaves the BLE link headroom for other GATT operations
  // (audio record/play) instead of saturating it with back-to-back writes.
  async send({ motorLeft, motorRight, leds, sound = 0 }) {
    if (!this.connected || this.sending || Date.now() - this.lastSent < 50) return;
    this.sending = true;
    try {
      await thymio.setActuatorState({
        circleLEDs: Array(8).fill(0),
        frontLegoLEDs: Array(8).fill(0),
        rearLegoLEDs: Array(8).fill(0),
        flRGB: leds[0], frRGB: leds[1], blRGB: leds[2], brRGB: leds[3],
        motorLeft, motorRight, sound,
        smallBottomRGB: { r: 0, g: 0, b: 0 },
        smallBackRGB: { r: 0, g: 0, b: 0 },
        buttonLEDs: Array(4).fill(0),
        receiverLED: 0,
        microphoneLED: false,
      });
    } catch (err) {
      console.warn('actuator write failed', err);
    } finally {
      this.lastSent = Date.now();
      this.sending = false;
    }
  }
}
