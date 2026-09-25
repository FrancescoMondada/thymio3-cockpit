import React, { useCallback, useEffect, useRef, useState } from 'react';
import Cockpit from './cockpit.jsx';
import { RobotSim } from './robot-sim.js';
import { LiveLink } from './live-link.js';
import { thymio, EVENTS } from './api.js';
import { SPEED_LIMIT, isGreen } from './theme.js';
import { DataLogger } from './logger.js';
import { Trajectory } from './trajectory.js';

const clamp = (v) => Math.max(-SPEED_LIMIT, Math.min(SPEED_LIMIT, Math.round(v)));

export default function App() {
  const sim = useRef(new RobotSim());
  const link = useRef(null);
  const cmd = useRef({
    left: 0, right: 0, leds: [0, 1, 2, 3].map(() => ({ r: 0, g: 0, b: 0 })),
    mix: 'FREE', yoke: { x: 0, y: 0 },
    runLeftSpeed: 200, runRightSpeed: 200, runTenths: 30, runRemaining: 0,
    stopwatch: { running: false, ms: 0 },
    keys: {}, buttons: {}, manual: false,
    stopGreen: false, greenTicks: 0, onGreen: false, blocked: false,
    ir: 0, irAt: 0,
  });
  const [, tick] = useState(0);
  const [conn, setConn] = useState({ status: 'disconnected', device: '', firmware: null, error: '', reconnect: false });
  const [live, setLive] = useState(false);
  const sweep = useRef(0);
  const logger = useRef(new DataLogger());
  const traj = useRef(new Trajectory());
  // The firmware doesn't expose a "reset" for the integrated gyro angle, so
  // zeroing is a local display offset applied to the raw telemetry below.
  const [gyroZero, setGyroZero] = useState({ angle: 0, heading: 0 });

  // --- connection ---------------------------------------------------------
  useEffect(() => {
    link.current = new LiveLink(() => tick((n) => n + 1));
    link.current.attach();

    const onConnected = async (event) => {
      if (event.detail) {
        let firmware = null;
        try { firmware = await thymio.getFirmwareInfo(); } catch { /* older firmware */ }
        setConn({ status: 'connected', device: thymio.getDeviceName?.() || 'THYMIO 3', firmware, error: '', reconnect: false });
        setLive(true);
      } else {
        setConn((c) => ({ ...c, status: 'connecting', device: '', firmware: null }));
      }
    };
    const onManual = () => setConn({ status: 'disconnected', device: '', firmware: null, error: '', reconnect: true });

    document.addEventListener(EVENTS.connected, onConnected);
    document.addEventListener(EVENTS.manualReconnect, onManual);
    return () => {
      document.removeEventListener(EVENTS.connected, onConnected);
      document.removeEventListener(EVENTS.manualReconnect, onManual);
      link.current.detach();
    };
  }, []);

  const connect = useCallback(async () => {
    setConn((c) => ({ ...c, status: 'connecting', error: '', reconnect: false }));
    try {
      await thymio.requestAndConnect();
    } catch (err) {
      setConn((c) => ({ ...c, status: 'disconnected', error: err?.message || 'connection cancelled' }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    try { await thymio.disconnect(); } catch { /* ignore */ }
    setConn({ status: 'disconnected', device: '', firmware: null, error: '', reconnect: false });
    setLive(false);
  }, []);

  // --- keyboard drive -----------------------------------------------------
  useEffect(() => {
    const keys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
    const down = (e) => { const k = e.key.toLowerCase(); if (keys.includes(k)) { cmd.current.keys[k] = true; e.preventDefault(); } };
    const up = (e) => { cmd.current.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // --- main loop ----------------------------------------------------------
  useEffect(() => {
    // Sim and live have unrelated coordinate origins, so start a fresh map
    // whenever the source changes.
    traj.current.reset();
    const id = setInterval(() => {
      const c = cmd.current;
      const k = c.keys, b = c.buttons;
      let fw = 0, turn = 0;
      if (k.arrowup || k.w || b.forward) fw += 1;
      if (k.arrowdown || k.s || b.back) fw -= 1;
      if (k.arrowleft || k.a || b.left) turn -= 1;
      if (k.arrowright || k.d || b.right) turn += 1;
      if (fw || turn) {
        c.left = clamp(250 * fw + 170 * turn);
        c.right = clamp(250 * fw - 170 * turn);
        c.manual = true;
      } else if (c.manual) {
        c.manual = false;
        c.left = 0;
        c.right = 0;
      }

      if (c.stopwatch.running) c.stopwatch.ms += 40;
      if (c.runRemaining > 0) {
        c.runRemaining = Math.max(0, c.runRemaining - 0.04);
        if (c.runRemaining === 0) { c.left = 0; c.right = 0; }
      }

      // Stop over green: green ground marks the edge of the arena. Needs two
      // consecutive green samples (debounce). On arrival the commanded speeds
      // and any timed run are cancelled; while on green, forward motion is
      // filtered out of what is sent (reverse and spinning stay allowed so the
      // robot can get away again).
      const tel = live ? link.current.tel : sim.current.tel;
      c.greenTicks = isGreen(tel.color) ? c.greenTicks + 1 : 0;
      const onGreen = c.greenTicks >= 2;
      if (c.stopGreen && onGreen && !c.onGreen) { c.left = 0; c.right = 0; c.runRemaining = 0; }
      c.onGreen = onGreen;
      let outL = c.left, outR = c.right;
      c.blocked = false;
      if (c.stopGreen && onGreen && (outL + outR) / 2 > 0) {
        const spin = (outR - outL) / 2;
        outL = -spin; outR = spin;
        c.blocked = true;
      }

      if (live) {
        link.current.send({ motorLeft: outL, motorRight: outR, leds: c.leds });
      } else {
        sim.current.step(0.04, { left: outL, right: outR });
      }
      // Log the raw telemetry (pre gyro-zero-offset) and the motor command
      // actually sent, so an export reflects what really happened.
      logger.current.record(tel, { left: outL, right: outR, leds: c.leds }, live);
      traj.current.update(tel, Date.now());
      sweep.current = (sweep.current + 0.11) % (Math.PI * 2);
      tick((n) => n + 1);
    }, 40);
    return () => clearInterval(id);
  }, [live]);

  const rawTel = (live ? link.current?.tel : sim.current.tel) || sim.current.tel;
  const telemetry = {
    ...rawTel,
    angle: rawTel.angle - gyroZero.angle,
    heading: ((rawTel.heading - gyroZero.heading) % 360 + 360) % 360,
  };
  const zeroGyro = useCallback(() => {
    setGyroZero({ angle: rawTel.angle, heading: rawTel.heading });
  }, [rawTel]);

  const toggleLog = useCallback(() => {
    if (logger.current.enabled) logger.current.stop(); else logger.current.start();
    tick((n) => n + 1);
  }, []);
  const clearLog = useCallback(() => { logger.current.clear(); tick((n) => n + 1); }, []);
  const exportLog = useCallback(() => { logger.current.export(); }, []);
  const initMap = useCallback(() => { traj.current.reset(); tick((n) => n + 1); }, []);

  return (
    <Cockpit
      telemetry={telemetry}
      command={cmd.current}
      connection={conn}
      live={live}
      sweep={sweep.current}
      traj={traj.current}
      logging={{ enabled: logger.current.enabled, rows: logger.current.rows.length, full: logger.current.full }}
      onConnect={connect}
      onDisconnect={disconnect}
      onZeroGyro={zeroGyro}
      onToggleLog={toggleLog}
      onClearLog={clearLog}
      onExportLog={exportLog}
      onInitMap={initMap}
      onCommand={(mutate) => { mutate(cmd.current); tick((n) => n + 1); }}
    />
  );
}
