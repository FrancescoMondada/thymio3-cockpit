import { thymio, EVENTS } from './api.js';

// Bridges the API's DOM events into the same telemetry shape the simulator
// produces, and pushes actuator state back to the robot at a fixed rate.
export class LiveLink {
  constructor(onChange) {
    this.onChange = onChange;
    this.connected = false;
    this.lastSend = 0;
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
    t.roll = (Math.atan2(y, z) * 180) / Math.PI;
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
    t.ground.ambientLeft = d.groundAmbient.left;
    t.ground.ambientRight = d.groundAmbient.right;
    t.ground.left = d.groundReflected.left;
    t.ground.right = d.groundReflected.right;
    t.angle = d.angleDegrees;
    t.heading = (d.angleDegrees + 360) % 360;
    t.motor = { left: d.motor.leftSpeed, right: d.motor.rightSpeed };
    t.battery = d.batteryVoltage / 1000;
    if (d.eventFlags.tapDetected) t.events.tap = Date.now();
    if (d.eventFlags.clapDetected) t.events.clap = Date.now();
    if (d.eventFlags.freefallDetected) t.events.freefall = Date.now();
    this.onChange?.();
  }

  // Full actuator frame — the API expects every field on every write.
  async send({ motorLeft, motorRight, leds, sound = 0 }) {
    if (!this.connected) return;
    const now = Date.now();
    if (now - this.lastSend < 100) return; // ~10 Hz
    this.lastSend = now;
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
    }
  }
}
