export const C = {
  phosphor: '#7dfaa8',
  phosphorDim: '#5d8b71',
  phosphorDeep: '#3f6b52',
  ink: '#d9f2e3',
  amber: '#ffc24a',
  red: '#ff563c',
  redDeep: '#7c1405',
  panel: '#060908',
  panelUp: '#0b1210',
  rule: '#2c3a33',
  ruleSoft: '#23402f',
};

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

export const SPEEDS = [
  { label: 'CREEP', v: 50 },
  { label: 'SLOW', v: 120 },
  { label: 'CRUISE', v: 200 },
  { label: 'FAST', v: 300 },
  { label: 'PIVOT L', v: 0, spin: -150 },
  { label: 'PIVOT R', v: 0, spin: 150 },
];

export const PRESETS = [
  { id: 'all-off', label: 'All Off', desc: 'Zero LEDs, stop motors', ml: 0, mr: 0, led: { r: 0, g: 0, b: 0 }, sw: '#1a2420' },
  { id: 'headlights', label: 'Headlights', desc: 'Front pair bright white', ml: 0, mr: 0, front: { r: 15, g: 15, b: 15 }, rear: { r: 0, g: 0, b: 0 }, sw: '#ffffff' },
  { id: 'brake', label: 'Brake Lights', desc: 'Rear pair red, motors stopped', ml: 0, mr: 0, front: { r: 0, g: 0, b: 0 }, rear: { r: 15, g: 0, b: 0 }, sw: '#ff2a10' },
  { id: 'spin', label: 'Spin In Place', desc: 'Motors opposite, blue corners', ml: 150, mr: -150, led: { r: 0, g: 0, b: 15 }, sw: '#2a49ff' },
  { id: 'forward', label: 'Cruise Forward', desc: 'Both motors +200', ml: 200, mr: 200, led: { r: 4, g: 12, b: 4 }, sw: '#4fd07a' },
  { id: 'alert', label: 'Alert', desc: 'All LEDs high', ml: 0, mr: 0, led: { r: 15, g: 0, b: 0 }, sw: '#ff563c' },
];

export const COPY = {
  kid: {
    proxTitle: 'WHAT IS IN FRONT OF ME', proxBackTitle: 'WHAT IS BEHIND ME',
    groundTitle: 'WHAT AM I STANDING ON', colorTitle: 'FLOOR COLOUR',
    ambTitle: 'HOW BRIGHT IS IT?', ambHint: 'The two ground sensors also read the light around me.',
    attTitle: 'AM I TILTED?', gyroTitle: 'WHICH WAY AM I POINTING?',
    gyroWarn: 'Careful: this angle slowly drifts away from the truth. Zero it often.',
    motorTitle: 'DRIVE MY WHEELS', presetTitle: 'QUICK MOVES', timedTitle: 'GO FOR A SET TIME',
    swTitle: 'STOPWATCH', ledTitle: 'MY FOUR LIGHTS', ledHint: 'PICK A COLOUR',
    padTitle: 'MY OWN BUTTONS', padHint: 'Press my buttons or use the arrow keys / W A S D to fly me around.',
    audioTitle: 'MY EARS', irTitle: 'REMOTE CONTROL',
    distLabel: 'That should move me about', distUnit: 'robot units',
    yokeFwd: 'FORWARD', yokeRev: 'BACKWARD',
  },
  expert: {
    proxTitle: 'PROXIMITY ARRAY · FRONT', proxBackTitle: 'PROXIMITY ARRAY · AFT',
    groundTitle: 'GROUND SENSORS', colorTitle: 'COLOR SENSOR (HSV)',
    ambTitle: 'AMBIENT LIGHT', ambHint: 'Ground sensors in ambient mode (groundAmbient).',
    attTitle: 'ATTITUDE · ACCELEROMETER', gyroTitle: 'GYRO · INTEGRATED ANGLE',
    gyroWarn: 'Integrated from gyro rate — subject to drift. Re-zero regularly.',
    motorTitle: 'DIFFERENTIAL DRIVE', presetTitle: 'ACTUATOR PRESETS', timedTitle: 'TIMED TRANSLATION',
    swTitle: 'STOPWATCH', ledTitle: 'MAIN LED 2×2', ledHint: 'COLOUR PER LED',
    padTitle: 'ONBOARD BUTTONS', padHint: 'Buttons stream in the 0x01 frame. Arrow keys / WASD drive.',
    audioTitle: 'MICROPHONE', irTitle: 'IR RECEIVER',
    distLabel: 'Estimated travel', distUnit: 'speed × s',
    yokeFwd: 'FWD', yokeRev: 'REV',
  },
};

export const ledCss = (l) => `rgb(${Math.round((l.r / 15) * 255)},${Math.round((l.g / 15) * 255)},${Math.round((l.b / 15) * 255)})`;
export const tone = (v) => (v > 2600 ? C.red : v > 1200 ? C.amber : C.phosphor);
