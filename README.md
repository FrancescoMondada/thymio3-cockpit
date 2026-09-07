# Thymio 3 — Inside the Robot Control

A cockpit-style web dashboard for the [Thymio 3](https://www.thymio.org): you sit *inside* the
robot and look out through its sensors. Proximity array, ground and colour sensors, ambient
light, accelerometer inclination, integrated gyro angle, microphone and IR receiver on the
instrument panels; differential-drive commands, speed presets, a timed run and the four main
LEDs on the consoles.

It runs with **no robot attached** — a simulated Thymio drives around a room with obstacles,
black lines and colour pads — and switches to live telemetry the moment a real robot connects.

## The API is not vendored here

This project depends on [`Mobsya/thymio3-ts-api`](https://github.com/Mobsya/thymio3-ts-api)
as a **git submodule** in `lib/thymio3-ts-api`, and Vite aliases its TypeScript entry point
directly:

```js
// vite.config.js
resolve: { alias: { 'thymio-api': resolve(here, 'lib/thymio3-ts-api/src/thymio.ts') } }
```

No API source is copied into this repository, so **every build compiles the current upstream
code**. To take upstream changes:

```bash
npm run api:update   # git submodule update --remote --merge
npm run build        # next compilation picks them up
```

`src/api.js` is the single import site. Swap that one line if you would rather consume a
published package (`import * as api from 'thymio3-ts-api'`) or the prebuilt IIFE global
(`window.thymio` from `dist/thymio.iife.js`).

## Run it

```bash
git clone --recurse-submodules <this-repo>
cd thymio3-cockpit
npm install
npm run dev
```

Then open the printed `http://localhost:5173`. Already cloned without submodules?
`npm run api:init`.

**Connecting to a real robot** needs Web Bluetooth: Chrome or Edge, over `https://` or
`localhost`, and a user click on CONNECT ROBOT. Firefox and Safari do not implement Web
Bluetooth; the cockpit still runs in simulation there.

## How it is wired

| File | Role |
| --- | --- |
| `src/api.js` | The only import of the Thymio API, plus the DOM event names |
| `src/live-link.js` | Turns `thymio-sensor-values` / `thymio-sensor-other-values` into telemetry; sends a full actuator frame at ~10 Hz |
| `src/robot-sim.js` | The simulated robot and room — same telemetry shape as the live link |
| `src/viewport.js` | Canvas HUD and proximity radar |
| `src/cockpit.jsx` | The cockpit UI |
| `src/App.jsx` | Connection state, the 25 Hz command loop, sim ↔ live switch |
| `src/theme.js` | Colours, LED palette, speed presets, instrument copy |

Telemetry in (from `startAllSensorStreaming()`):

- `thymio-sensor-values` → 5 front + 2 rear proximity (0–4000), ground reflected (0–1000),
  colour HSV, raw accelerometer, raw gyro, the 5 buttons, microphone volume, IR code
- `thymio-sensor-other-values` → ground ambient, integrated `angleDegrees`, motor feedback,
  tap / clap / freefall flags, battery voltage

Commands out: one `setActuatorState()` frame carrying `motorLeft`, `motorRight` and the four
corner RGB LEDs (plus the fields the protocol requires). Speeds are **robot units**, no metric
conversion — the cockpit is scaled for classroom use with FAST = 300 and a ±400 limit, well
inside the API's ±1000.

## Notes

- The integrated gyro angle drifts; the panel says so and offers a zero.
- The cockpit is laid out for a wide desktop (≥1560 px) — it is an instrument panel, not a
  responsive site.
- Inclination is derived from `accelerationRaw` with `atan2`, which is approximate.

## Deploy

`.github/workflows/deploy.yml` builds with submodules and publishes to GitHub Pages on push
to `main`. Enable Pages → "GitHub Actions" in the repository settings.

## License

ISC, matching the upstream API.
