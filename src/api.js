// Single import site for the Thymio 3 API.
import * as api from 'thymio-api';

export const thymio = api;

export const EVENTS = {
  connected: 'thymio-connected',
  manualReconnect: 'thymio-prompt-manual-reconnection',
  sensors: 'thymio-sensor-values',
  otherSensors: 'thymio-sensor-other-values',
};
