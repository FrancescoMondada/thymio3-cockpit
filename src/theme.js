// Colour themes. Only the accent family (phosphor/ink — the "signal" colours
// used for text, borders, meters and glows) and a light tint on the neutral
// panel chrome change between themes; amber/red keep the same meaning
// (warning/danger) in every theme so alerts stay legible regardless of which
// one is picked. `glow` is the accent as an "r,g,b" triplet for rgba(...)
// strings. `scanlines` is the one non-colour "effect" knob so far — CRT
// scanlines on for the two retro-styled themes, off for the flatter ones.
const PALETTES = {
  phosphor: {
    phosphor: '#7dfaa8', phosphorDim: '#5d8b71', phosphorDeep: '#3f6b52', glow: '125,250,168',
    ink: '#d9f2e3', amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    panel: '#060908', panelUp: '#0b1210', rule: '#2c3a33', ruleSoft: '#23402f', scanlines: true,
  },
  slate: {
    phosphor: '#6fc3ff', phosphorDim: '#5a7f95', phosphorDeep: '#2c4a63', glow: '111,195,255',
    ink: '#dceaf5', amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    panel: '#070a0d', panelUp: '#0c1319', rule: '#293947', ruleSoft: '#233b4a', scanlines: false,
  },
  amber: {
    phosphor: '#ffcf7a', phosphorDim: '#9c7f4a', phosphorDeep: '#6b4f22', glow: '255,207,122',
    ink: '#f5e6c8', amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    panel: '#0a0805', panelUp: '#120d08', rule: '#3a3020', ruleSoft: '#332815', scanlines: true,
  },
  violet: {
    phosphor: '#c9a8ff', phosphorDim: '#8a7096', phosphorDeep: '#5a4470', glow: '201,168,255',
    ink: '#ebe0f7', amber: '#ffc24a', amberDeep: '#6b4a12', amberGlow: '255,194,74',
    red: '#ff563c', redDeep: '#7c1405', redGlow: '255,86,60',
    panel: '#0a0810', panelUp: '#100c1a', rule: '#372f47', ruleSoft: '#2e2640', scanlines: false,
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
