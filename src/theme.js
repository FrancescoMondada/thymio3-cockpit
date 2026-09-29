// Colour themes. Three, deliberately different from each other rather than
// hue-shifted variants of the same look: a cool dark terminal, a warm dark
// cockpit, and a light console. Every background gradient stop in the
// cockpit is one of bg0 (deepest) / bg1 (mid) / bg2 (lighter) / bg3
// (brightest, header highlight) — no hardcoded near-black hex left outside
// this file — plus panel/panelUp/rule/ruleSoft for wells and borders and
// onAccent for text sitting on a bright accent-coloured button. amber/red
// (warning/danger) are identical in all three themes so alerts stay
// legible regardless of which is picked; only the accent family, the
// backgrounds and neutrals vary. `scanlines` is the CRT-effect toggle,
// `vignette` the canvas corner-darkening colour.
const PALETTES = {
  phosphor: {
    phosphor: '#7dfaa8', phosphorDim: '#5d8b71', phosphorDeep: '#3f6b52', glow: '125,250,168',
    ink: '#d9f2e3', onAccent: '#05130b',
    amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    bg0: '#040605', bg1: '#0a0d0c', bg2: '#141a17', bg3: '#1b221e',
    panel: '#060908', panelUp: '#0b1210', rule: '#2c3a33', ruleSoft: '#23402f',
    canvasBg: '#050806', scanlineColor: '#0d1f14', vignette: 'rgba(0,0,0,.5)', scanlines: true,
  },
  ember: {
    phosphor: '#ffb454', phosphorDim: '#a67a45', phosphorDeep: '#6b4520', glow: '255,180,84',
    ink: '#f3e2c8', onAccent: '#1c0f02',
    amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    bg0: '#0d0704', bg1: '#160d06', bg2: '#241407', bg3: '#301a09',
    panel: '#0a0603', panelUp: '#150c05', rule: '#3d2712', ruleSoft: '#33200e',
    canvasBg: '#0d0704', scanlineColor: '#2a1706', vignette: 'rgba(20,8,0,.55)', scanlines: true,
  },
  daylight: {
    phosphor: '#0e7c74', phosphorDim: '#4b8f89', phosphorDeep: '#0a5951', glow: '14,124,116',
    ink: '#132420', onAccent: '#ffffff',
    amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    bg0: '#e6edea', bg1: '#eef3f1', bg2: '#f6f9f8', bg3: '#ffffff',
    panel: '#ffffff', panelUp: '#f2f7f5', rule: '#c3d2cd', ruleSoft: '#d3e0db',
    canvasBg: '#eef3f1', scanlineColor: '#000000', vignette: 'rgba(20,40,35,.08)', scanlines: false,
  },
};
export const THEME_IDS = Object.keys(PALETTES);
export const THEME_SWATCHES = Object.fromEntries(THEME_IDS.map((id) => [id, PALETTES[id].phosphor]));

// C is deliberately a stable, mutable object — every module imports this one
// binding and reads C.xxx at render/draw time, so mutating its properties
// in place (instead of reassigning C itself) is enough to reskin the whole
// app without threading theme props through every component.
export const C = { ...PALETTES.phosphor };
export function applyTheme(id) {
  Object.assign(C, PALETTES[id] || PALETTES.phosphor);
}

export const HUES = [
  { n: 'RED', r: 15, g: 0, b: 0 },
  { n: 'AMBER', r: 15, g: 8, b: 0 },
  { n: 'LIME', r: 6, g: 15, b: 0 },
  { n: 'GREEN', r: 0, g: 15, b: 4 },
  { n: 'CYAN', r: 0, g: 12, b: 15 },
  { n: 'BLUE', r: 0, g: 3, b: 15 },
  { n: 'VIOLET', r: 10, g: 0, b: 15 },
  { n: 'WHITE', r: 15, g: 15, b: 15 },
];
export const SWATCHES = [{ n: 'OFF', r: 0, g: 0, b: 0 }, ...HUES];

// Motor values are robot speed units; the API accepts -1000..1000 but this
// cockpit is scaled for classroom use, with FAST = 300.
export const SPEED_LIMIT = 400;

// `id` is the stable key used for i18n lookups and React keys; `label` is
// the English fallback if a translation is ever missing.
export const SPEEDS = [
  { id: 'creep', label: 'CREEP', v: 50 },
  { id: 'slow', label: 'SLOW', v: 120 },
  { id: 'cruise', label: 'CRUISE', v: 200 },
  { id: 'fast', label: 'FAST', v: 300 },
  { id: 'pivotL', label: 'PIVOT L', v: 0, spin: -150 },
  { id: 'pivotR', label: 'PIVOT R', v: 0, spin: 150 },
];

export const PRESETS = [
  { id: 'all-off', label: 'All Off', desc: 'Zero LEDs, stop motors', ml: 0, mr: 0, led: { r: 0, g: 0, b: 0 }, sw: '#1a2420' },
  { id: 'headlights', label: 'Headlights', desc: 'Front pair bright white', ml: 0, mr: 0, front: { r: 15, g: 15, b: 15 }, rear: { r: 0, g: 0, b: 0 }, sw: '#ffffff' },
  { id: 'stop', label: 'Stop', desc: 'Motors stopped, LEDs left as they are', ml: 0, mr: 0, sw: '#ff2a10' },
  { id: 'spin', label: 'Spin In Place', desc: 'Motors opposite, blue corners', ml: 150, mr: -150, led: { r: 0, g: 0, b: 15 }, sw: '#2a49ff' },
  { id: 'forward', label: 'Cruise Forward', desc: 'Both motors +200', ml: 200, mr: 200, led: { r: 4, g: 12, b: 4 }, sw: '#4fd07a' },
  { id: 'alert', label: 'Alert', desc: 'All LEDs high', ml: 0, mr: 0, led: { r: 15, g: 0, b: 0 }, sw: '#ff563c' },
];

// "Green ground" test on the calibrated colour reading (hue in degrees,
// saturation and value 0-100). Tune these if the mission's green reads
// differently on the real sensor.
export const GREEN = { hueMin: 75, hueMax: 170, minSat: 30, minVal: 12 };
export const isGreen = (c) => Boolean(c)
  && c.s >= GREEN.minSat && c.v >= GREEN.minVal && c.h >= GREEN.hueMin && c.h <= GREEN.hueMax;

export const ledCss = (l) => `rgb(${Math.round((l.r / 15) * 255)},${Math.round((l.g / 15) * 255)},${Math.round((l.b / 15) * 255)})`;
export const tone = (v) => (v > 2600 ? C.red : v > 1200 ? C.amber : C.phosphor);
