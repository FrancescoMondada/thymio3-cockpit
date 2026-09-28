# Thymio 3 — Inside the Robot Control

A cockpit-style web dashboard for the [Thymio 3](https://www.thymio.org): you sit *inside* the
robot and look out through its sensors. Proximity array, ground and colour sensors, ambient
light, accelerometer inclination, integrated gyro angle, microphone and IR receiver on the
instrument panels; differential-drive commands, speed presets, a timed run and the four main
LEDs on the consoles.

It runs with **no robot attached** — a simulated Thymio drives around a room with obstacles,
black lines and colour pads — and switches to live telemetry the moment a real robot connects.

## Try it now

**https://francescomondada.github.io/thymio3-cockpit/**

No install, no build — just open the link. Simulation works in any browser. To fly a real
Thymio 3 from it, use Chrome or Edge (Web Bluetooth isn't implemented in Firefox or Safari,
which stay in simulation) and click CONNECT ROBOT.

## Run it locally

Only needed for development — the live demo above always tracks `main`.

```bash
git clone <this-repo>
cd thymio3-cockpit
npm install
npm run dev
```

Then open the printed `http://localhost:5173`.

## Cockpit layout

The instrument panel is fixed for a wide desktop (≥1560 px), laid out around a central canopy
with a sensor console on the left, a drive console on the right, and an auxiliary rack that
slides in from the right (SHOW AUX / HIDE AUX, hidden by default). Every panel has two copy
sets, switched with the EXPERT ▸ / ◂ SIMPLE button top-right: SIMPLE ("WHAT IS IN FRONT OF ME",
"DRIVE MY WHEELS", …) for a classroom-friendly read, EXPERT ("PROXIMITY ARRAY · FRONT",
"DIFFERENTIAL DRIVE", …) for the underlying signal names. Only the copy changes — every control
behaves identically in both modes.

The top-right corner also has a **THEME** switcher (4 colour dots) and a **LANG** switcher
(EN/FR/IT/DE), both persisted in `localStorage` so they survive a reload. Themes swap the accent
colour used for text, borders, meters and glows — Phosphor (green, default), Slate (blue), Amber
(warm gold) and Violet — plus a scanline effect on/off; warning/danger colours (amber/red) stay
fixed across themes so alerts remain legible whichever one is picked. The two retro-styled themes
(Phosphor, Amber) keep the CRT scanline effect, the two flatter ones (Slate, Violet) turn it off.
See `THEME_IDS`/`applyTheme` in `src/theme.js`. Languages translate every panel — the SIMPLE/EXPERT
copy above, plus every button, status and hint in the UI — via `src/i18n.js`; TANDEM/SPIN/FREE
(drive-mix names) and the theme names are kept untranslated as short technical/stylistic labels,
and the data log's CSV column headers always stay in English (it's a data-interchange format,
not UI chrome).

### Overhead console

The strip across the top of the cockpit:

- **LINK** — CONNECT ROBOT / DISCONNECT, plus the connection state (disconnected, connecting,
  connected, or "reconnect manually" after the API's own auto-retry gives up).
- **DEVICE**, **FIRMWARE** (ESP32 / STM32 versions once connected), **SOURCE** (ROBOT or
  SIMULATION — the cockpit falls back to the simulator whenever nothing is connected), and
  **BATTERY** voltage.
- **HULL PROXIMITY** — a standing alarm (CLEAR / OBSTACLE NEAR / CONTACT IMMINENT) driven by the
  single highest reading across all 7 proximity sensors, thresholds at 1200 and 2600.
- **ALL STOP** — zeroes both motors, cancels a timed run, re-centres the joystick and turns every
  LED off, regardless of what else is happening.

### Left console — sensors

- **WHAT IS IN FRONT OF ME** / **WHAT IS BEHIND ME** — bar meters for the 5 front and 2 rear
  proximity sensors, 0–4000, coloured green/amber/red by distance.
- **WHAT AM I STANDING ON** — the two ground (line-following) sensors as numeric + bar readouts,
  0–1000, labelled NO GROUND/BLACK, GREY or WHITE GROUND; plus the calibrated colour-sensor swatch
  and its HSV reading (see the API's own demo for what "calibrated" means here — the swatch is a
  proper HSV→RGB conversion of `colorSensor`, not the separate raw RGB channels).
- **HOW BRIGHT IS IT?** — the two ground sensors' ambient-light mode, shown as round glowing dots
  sized by reading; the raw samples are smoothed (EMA) since they're naturally noisy frame to
  frame.

### Canopy — map and attitude

The centre screen has three view modes (top toolbar): **MAP**, **RADAR**, and **COMBO** (map with
the 7 proximity beams overlaid directly on the robot, in world scale, rotating with its heading).

The map is a dead-reckoned 2D trajectory of the robot (`src/trajectory.js`): heading from the
gyro-integrated angle, distance from the wheel-speed feedback. Since it's dead reckoning, it
drifts over long runs — same caveat as the gyro angle itself. Controls: drag to pan, mouse wheel
to zoom, Shift/right-drag (or the ⟲ ⟳ buttons) to rotate, **FOLLOW** to keep the robot centred,
**HDG UP** to keep it pointing up, **RESET VIEW** for pan/zoom/rotation only, and **INIT MAP** to
clear the trail and make the robot's current pose the new origin. The distance scale
(`MM_PER_UNIT_S` in `src/trajectory.js`) is an approximation — calibrate it against a measured
run if you need it to be accurate. Standalone **RADAR** is the same 7 sensors on a compass-style
dial, independent of position.

Below the canopy, two gauges:

- **AM I TILTED?** — pitch/roll on a small attitude ball, derived from the raw accelerometer via
  `atan2` (approximate).
- **WHICH WAY AM I POINTING?** — integrated angle and turn rate, plus a compass rose. The
  firmware doesn't expose a hardware reset for the integrated angle, so **ZERO** applies a local
  display offset instead (it re-zeros the map's heading readout too, but not the trajectory
  already drawn). The panel warns that this angle drifts and should be re-zeroed regularly.

### Right console — drive

- **DRIVE MY WHEELS** — a drag joystick (forward/back = speed, left/right = turn) with three
  mix modes: **TANDEM** (turn ignored, both wheels together), **SPIN** (turn only, opposite
  wheels), **FREE** (forward and turn combined — the default). The robot moves only while the
  joystick is actively being dragged; releasing the mouse button, or dragging off the pad while
  still pressed, snaps it back to centre and stops both motors. Just hovering over the pad
  without pressing never affects whatever else is driving the robot.
- **STOP OVER GREEN** — an off-by-default toggle for arenas where green ground marks the edge.
  When armed and the colour sensor reads green for two consecutive samples, the commanded speeds
  and any timed run are cancelled; while still on green, forward motion is filtered out of what's
  sent, but reverse and spinning stay allowed so the robot can back off. What counts as green is
  `GREEN` in `src/theme.js` (hue 75–170°, saturation ≥ 30, value ≥ 12) — adjust it if your
  mission's green reads differently on the real sensor.
- Numeric **LEFT** / **RIGHT** sliders mirror and can also directly set the current wheel speeds,
  plus one-tap speed presets (CREEP/SLOW/CRUISE/FAST, both wheels together) and pivot presets
  (PIVOT L/PIVOT R, wheels opposite).
- **QUICK MOVES** — six one-tap actuator presets combining a motor command with an LED pattern:
  All Off, Headlights, Stop (motors only, LEDs left alone), Spin In Place, Cruise Forward, Alert.
- **GO FOR A SET TIME** — independent left/right speed sliders and a duration (tenths of a
  second); EXECUTE runs it once, with a live T-MINUS countdown.
- **STOPWATCH** — free-running timer, independent of everything else, with start/stop/reset.

### Auxiliary rack

Hidden by default (SHOW AUX to open):

- **MY FOUR LIGHTS** — the 4 corner LEDs (front-left/right, rear-left/right), each with its own
  colour swatch and an 8-colour palette.
- **MY OWN BUTTONS** — an on-screen D-pad (FWD/L/OK/R/REV) that drives the robot the same way the
  joystick does; the same 5 buttons also light up when the robot's own physical buttons are
  pressed, so it doubles as a live readout of the hardware buttons.
- **MY EARS** — a live microphone-level meter, plus RECORD / PLAY / STOP for the robot's onboard
  recording (up to 10 s). Both recording and playback happen on the robot itself — its own mic,
  its own speaker — not through the computer; the controls are only enabled while connected to a
  real robot.
- **REMOTE CONTROL** — the last IR receiver code, if any.
- **MY FLIGHT RECORDER** (DATA LOG in expert copy) — RECORD/STOP, EXPORT CSV and CLEAR for a full
  data log. While recording it captures one row per drive-loop tick (25 Hz): every proximity,
  ground, ambient and colour reading, pitch/roll/angle/gyro-rate/heading, mic level, battery, IR
  code, all 5 hardware buttons, the motor command actually sent (after any STOP OVER GREEN
  filtering), and all 4 LED colours — see `src/logger.js` for the exact columns. Capped at 200k
  rows (~2.2 h) so a forgotten recording can't grow without bound.

## The API is not vendored here

This project depends on [`Mobsya/thymio3-ts-api`](https://github.com/Mobsya/thymio3-ts-api)
as a **git dependency** in `package.json` (`github:Mobsya/thymio3-ts-api#main`), fetched by npm
into `node_modules/thymio3-ts-api`. Vite aliases its TypeScript entry point directly:

```js
// vite.config.js
resolve: { alias: { 'thymio-api': resolve(here, 'node_modules/thymio3-ts-api/src/thymio.ts') } }
```

No API source is copied into this repository, so **every build compiles the current upstream
code**. To take upstream changes:

```bash
npm run api:update    # npm update thymio3-ts-api
npm run build          # next compilation picks them up
```

`src/api.js` is the single import site. Swap that one line if you would rather consume a
published package (`import * as api from 'thymio3-ts-api'`) or the prebuilt IIFE global
(`window.thymio` from `dist/thymio.iife.js`).

## How it is wired

| File | Role |
| --- | --- |
| `src/api.js` | The only import of the Thymio API, plus the DOM event names |
| `src/live-link.js` | Turns `thymio-sensor-values` / `thymio-sensor-other-values` into telemetry; sends a full actuator frame at ~20 Hz |
| `src/robot-sim.js` | The simulated robot and room — same telemetry shape as the live link |
| `src/trajectory.js` | Dead-reckoned position: gyro heading + wheel-speed feedback |
| `src/viewport.js` | Canvas trajectory map, on-robot sensor overlay, and proximity radar |
| `src/logger.js` | The enable/disable/export data log |
| `src/cockpit.jsx` | The cockpit UI |
| `src/App.jsx` | Connection state, the 25 Hz command loop, sim ↔ live switch |
| `src/theme.js` | Colour themes, LED palette, speed presets, drive presets, green-detection |
| `src/i18n.js` | All translated UI text (EN/FR/IT/DE) |

Telemetry in (from `startAllSensorStreaming()`):

- `thymio-sensor-values` → 5 front + 2 rear proximity (0–4000), ground reflected (0–1000),
  colour HSV, raw accelerometer, raw gyro, the 5 buttons, microphone volume, IR code
- `thymio-sensor-other-values` → ground ambient, integrated `angleDegrees`, motor feedback,
  tap / clap / freefall flags, battery voltage

Commands out: one `setActuatorState()` frame carrying `motorLeft`, `motorRight`, the four corner
RGB LEDs, and the bottom LED (driven from the calibrated colour reading so it reflects the sensed
floor colour, rather than being forced off). Speeds are **robot units**, no metric conversion —
the cockpit is scaled for classroom use with FAST = 300 and a ±400 limit, well inside the API's
±1000.

## Notes

- The integrated gyro angle drifts; the panel says so and offers a zero.
- The cockpit is laid out for a wide desktop (≥1560 px) — it is an instrument panel, not a
  responsive site.
- Inclination is derived from `accelerationRaw` with `atan2`, which is approximate.
- Reloading or closing the tab while connected disconnects the BLE link cleanly
  (`pagehide`/`beforeunload` in `App.jsx`), so the robot doesn't have to wait out its own
  supervision timeout before a fresh CONNECT ROBOT can succeed.

## Deploy

`.github/workflows/deploy.yml` runs `npm install && npm run build` and publishes to GitHub
Pages on push to `main`. Enable Pages → "GitHub Actions" in the repository settings.

## License

ISC, matching the upstream API.
