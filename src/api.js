// Single import site for the Thymio 3 API.
//
// 'thymio-api' is a Vite alias pointing at lib/thymio3-ts-api/src/thymio.ts
// (a git submodule of Mobsya/thymio3-ts-api). Nothing from the API is copied
// into this repo, so the next build always compiles the current upstream code.
//
// Swap this one line if you would rather consume a published package or the
// prebuilt IIFE global:
//   import * as api from 'thymio3-ts-api';        // published package
//   const api = window.thymio;                    // dist/thymio.iife.js
import * as api from 'thymio-api';

export const thymio = api;

export const EVENTS = {
  connected: 'thymio-connected',
  manualReconnect: 'thymio-prompt-manual-reconnection',
  sensors: 'thymio-sensor-values',
  otherSensors: 'thymio-sensor-other-values',
};
