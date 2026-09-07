import React, { useEffect, useRef, useState } from 'react';
import { drawViewport } from './viewport.js';
import { C, COPY, HUES, SWATCHES, SPEEDS, PRESETS, SPEED_LIMIT, ledCss, tone } from './theme.js';

const label = { font: '500 9px/1 Archivo', letterSpacing: '.14em', color: C.phosphorDim };
const value = { font: '800 16px/1 Archivo', color: C.ink };
const well = { border: `2px solid ${C.rule}`, background: C.panel, boxShadow: 'inset 0 2px 8px rgba(0,0,0,.7)' };
const btn = { border: `2px solid ${C.rule}`, background: C.panelUp, color: C.ink, font: '700 10px/1 Archivo', letterSpacing: '.1em', padding: '8px 11px', textAlign: 'left', cursor: 'pointer', boxShadow: '0 2px 0 rgba(0,0,0,.6)' };
const Bolt = () => <span style={{ width: 7, height: 7, flex: 'none', borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#5b6d63,#151b18)', boxShadow: 'inset 0 0 0 1px #050806' }} />;
const H = ({ children, sub }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
    <h2 style={{ margin: 0, font: '800 12px/1 Archivo', letterSpacing: '.1em', color: C.phosphor }}>{children}</h2>
    {sub ? <span style={label}>{sub}</span> : null}
  </div>
);

function Meter({ name, v }) {
  const col = tone(v);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ font: '700 11px/1 Archivo', color: v > 1200 ? col : C.ink }}>{v}</div>
      <div style={{ position: 'relative', height: 128, ...well }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${(v / 4000) * 100}%`, background: col }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '34%', borderTop: `1px dashed ${C.ruleSoft}` }} />
      </div>
      <div style={{ font: '600 9px/1 Archivo', letterSpacing: '.06em', color: C.phosphorDim }}>{name}</div>
    </div>
  );
}

export default function Cockpit({ telemetry: t, command: c, connection, live, sweep, onConnect, onDisconnect, onCommand }) {
  const [kid, setKid] = useState(true);
  const [view, setView] = useState('COMBO');
  const [drawer, setDrawer] = useState(true);
  const canvas = useRef(null);
  const pad = useRef(null);
  const copy = kid ? COPY.kid : COPY.expert;

  useEffect(() => { if (canvas.current) drawViewport(canvas.current, t, { mode: view, sweep }); });

  const set = (mutate) => onCommand(mutate);
  const motors = (l, r) => set((cc) => { cc.left = Math.max(-SPEED_LIMIT, Math.min(SPEED_LIMIT, Math.round(l))); cc.right = Math.max(-SPEED_LIMIT, Math.min(SPEED_LIMIT, Math.round(r))); });
  const yokeTo = (x, y) => set((cc) => {
    cc.yoke = { x, y };
    const fw = -y * SPEED_LIMIT, turn = x * SPEED_LIMIT;
    if (cc.mix === 'TANDEM') { cc.left = fw; cc.right = fw; }
    else if (cc.mix === 'SPIN') { cc.left = turn; cc.right = -turn; }
    else { cc.left = fw - turn * 0.85; cc.right = fw + turn * 0.85; }
    cc.left = Math.round(cc.left); cc.right = Math.round(cc.right);
  });
  const padPoint = (e) => {
    const el = pad.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)),
            Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))];
  };
  const dragging = useRef(false);

  const near = Math.max(...Object.values(t.prox));
  const alarm = near > 2600 ? 'CONTACT IMMINENT' : near > 1200 ? 'OBSTACLE NEAR' : 'CLEAR';
  const alarmInk = near > 2600 ? C.red : near > 1200 ? C.amber : C.phosphor;
  const connected = connection.status === 'connected';
  const connecting = connection.status === 'connecting';
  const seconds = (c.runTenths / 10).toFixed(1);

  const hold = (key) => ({
    onPointerDown: () => set((cc) => { cc.buttons[key] = true; }),
    onPointerUp: () => set((cc) => { cc.buttons = {}; }),
    onPointerLeave: () => set((cc) => { cc.buttons = {}; }),
  });

  return (
    <div style={{ minWidth: 1560, maxWidth: 1920, margin: '0 auto', height: '100vh', minHeight: 880, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 0%,#141a17 0%,#080b09 55%,#040605 100%)', perspective: 1800, perspectiveOrigin: '50% 42%' }}>

      {/* overhead console */}
      <div style={{ flex: 'none', transform: 'rotateX(6deg)', transformOrigin: '50% 100%', background: 'linear-gradient(#1b221e,#0e1311 62%,#080b09)', borderBottom: `2px solid ${C.rule}`, boxShadow: '0 10px 26px rgba(0,0,0,.6)' }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <div style={{ padding: '12px 20px 11px', borderRight: `2px solid ${C.rule}`, minWidth: 264, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bolt />
            <div>
              <div style={{ font: '800 19px/1 Archivo', letterSpacing: '.02em', color: C.phosphor, textShadow: '0 0 14px rgba(125,250,168,.35)' }}>THYMIO&nbsp;III</div>
              <div style={{ marginTop: 5, ...label, letterSpacing: '.2em' }}>INSIDE THE ROBOT CONTROL</div>
            </div>
            <Bolt />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, padding: '0 20px', borderRight: `2px solid ${C.rule}`, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: connected ? C.phosphor : connecting ? C.amber : C.rule, boxShadow: connected ? `0 0 12px ${C.phosphor}` : 'none' }} />
              <div>
                <div style={label}>LINK</div>
                <div style={{ marginTop: 4, font: '700 13px/1 Archivo', color: connected ? C.phosphor : connecting ? C.amber : C.red }}>
                  {connected ? 'CONNECTED' : connecting ? 'CONNECTING…' : connection.reconnect ? 'RECONNECT MANUALLY' : 'DISCONNECTED'}
                </div>
              </div>
              <button type="button" disabled={connecting} onClick={connected ? onDisconnect : onConnect}
                style={{ ...btn, border: `2px solid ${connected ? C.rule : C.phosphor}`, background: connected ? C.panelUp : C.phosphor, color: connected ? C.phosphor : '#05130b', font: '800 11px/1 Archivo', padding: '10px 15px', opacity: connecting ? 0.45 : 1 }}>
                {connected ? 'DISCONNECT' : connecting ? 'CONNECTING…' : 'CONNECT ROBOT'}
              </button>
            </div>
            <div style={{ width: 2, alignSelf: 'stretch', background: C.rule }} />
            <div><div style={label}>DEVICE</div><div style={{ marginTop: 4, font: '700 13px/1 Archivo', color: C.phosphor }}>{connected ? connection.device : '——'}</div></div>
            <div><div style={label}>FIRMWARE</div><div style={{ marginTop: 4, font: '700 13px/1 Archivo' }}>{connection.firmware ? `ESP32 ${connection.firmware.esp32_ver || '?'} · STM32 ${connection.firmware.stm32_ver || '?'}` : connection.error || '——'}</div></div>
            <div><div style={label}>SOURCE</div><div style={{ marginTop: 4, font: '700 13px/1 Archivo', color: live ? C.phosphor : C.amber }}>{live ? 'ROBOT' : 'SIMULATION'}</div></div>
            <div><div style={label}>BATTERY</div><div style={{ marginTop: 4, font: '700 13px/1 Archivo' }}>{t.battery.toFixed(2)} V</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ padding: '7px 13px', border: `2px solid ${C.rule}`, background: near > 2600 ? 'rgba(255,86,60,.18)' : C.panelUp }}>
              <div style={label}>HULL PROXIMITY</div>
              <div style={{ marginTop: 4, font: '800 13px/1 Archivo', color: alarmInk }}>{alarm}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRight: `2px solid ${C.rule}`, background: 'repeating-linear-gradient(45deg,#2a1410 0 7px,#140806 7px 14px)' }}>
            <button type="button" onClick={() => set((cc) => { cc.left = 0; cc.right = 0; cc.runRemaining = 0; cc.yoke = { x: 0, y: 0 }; cc.leds = [0, 1, 2, 3].map(() => ({ r: 0, g: 0, b: 0 })); })}
              style={{ ...btn, border: `2px solid ${C.redDeep}`, background: C.red, color: '#1a0603', font: '800 14px/1 Archivo', padding: '13px 22px', boxShadow: `0 3px 0 ${C.redDeep}` }}>ALL STOP</button>
          </div>
          <button type="button" onClick={() => setKid((k) => !k)} style={{ ...btn, border: 0, background: '#0e1311', color: C.phosphor, width: 104, borderRadius: 0 }}>{kid ? 'EXPERT ▸' : '◂ SIMPLE'}</button>
          <button type="button" onClick={() => setDrawer((d) => !d)} style={{ ...btn, border: 0, background: '#0e1311', color: C.phosphor, width: 118, borderRadius: 0 }}>{drawer ? 'HIDE AUX ▸' : '◂ SHOW AUX'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0 }}>

        {/* left console — sensors */}
        <div style={{ width: 296, flex: 'none', transform: 'rotateY(11deg)', transformOrigin: '100% 50%', background: 'linear-gradient(100deg,#0a0d0c,#141a17 70%)', borderRight: `2px solid ${C.rule}`, boxShadow: 'inset -14px 0 26px rgba(0,0,0,.55)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 0' }}><Bolt /><Bolt /></div>
          <section style={{ padding: '8px 16px 16px', borderBottom: `2px solid ${C.rule}` }}>
            <H sub="0 – 4000">{copy.proxTitle}</H>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginTop: 12, alignItems: 'end' }}>
              <Meter name="LEFT" v={t.prox.left} />
              <Meter name="F-LEFT" v={t.prox.frontLeft} />
              <Meter name="CENTER" v={t.prox.center} />
              <Meter name="F-RIGHT" v={t.prox.frontRight} />
              <Meter name="RIGHT" v={t.prox.right} />
            </div>
          </section>
          <section style={{ padding: '15px 16px 17px', borderBottom: `2px solid ${C.rule}` }}>
            <H sub="0 – 4000">{copy.proxBackTitle}</H>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, marginTop: 11, alignItems: 'end' }}>
              <div />
              <Meter name="LEFT" v={t.prox.backLeft} />
              <div />
              <Meter name="RIGHT" v={t.prox.backRight} />
              <div />
            </div>
          </section>
          <section style={{ padding: '15px 16px 18px' }}>
            <H>{copy.groundTitle}</H>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 11 }}>
              {[['GROUND L', t.ground.left], ['GROUND R', t.ground.right]].map(([name, v]) => (
                <div key={name} style={{ ...well, padding: '8px 9px 9px' }}>
                  <div style={{ font: '600 9px/1 Archivo', letterSpacing: '.1em', color: C.phosphorDim }}>{name}</div>
                  <div style={{ marginTop: 6, font: '800 19px/1 Archivo', color: v < 300 ? C.amber : C.ink }}>{v}</div>
                  <div style={{ marginTop: 6, height: 9, border: `2px solid ${C.rule}`, position: 'relative', background: '#000' }}>
                    <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(v / 1000) * 100}%`, background: C.ink }} />
                  </div>
                  <div style={{ marginTop: 5, font: '500 9px/1.2 Archivo', color: C.phosphorDim }}>{v < 300 ? 'NO GROUND / BLACK' : v < 700 ? 'GREY' : 'WHITE GROUND'}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 10, ...well, padding: 9 }}>
              <div style={{ width: 42, height: 42, border: `2px solid ${C.rule}`, background: t.color.css }} />
              <div style={{ flex: 1 }}>
                <div style={{ font: '600 9px/1 Archivo', letterSpacing: '.1em', color: C.phosphorDim }}>{copy.colorTitle}</div>
                <div style={{ marginTop: 5, font: '800 14px/1 Archivo', color: C.phosphor }}>{t.color.name}</div>
                <div style={{ marginTop: 5, font: '500 9px/1 Archivo', color: C.phosphorDim }}>H {t.color.h}° · S {t.color.s} · V {t.color.v}</div>
              </div>
            </div>
            <div style={{ marginTop: 11, paddingTop: 10, borderTop: `2px solid ${C.rule}` }}>
              <H sub="0 – 1000">{copy.ambTitle}</H>
              <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['GROUND L', t.ground.ambientLeft], ['GROUND R', t.ground.ambientRight]].map(([name, v]) => {
                  const n = Math.max(0, Math.min(1, v / 1000));
                  return (
                    <div key={name} style={{ ...well, padding: '8px 9px 9px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 56, height: 56, flex: 'none', border: `2px solid ${C.rule}`, background: '#040605', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 6 + n * 44, height: 6 + n * 44, borderRadius: '50%', background: C.amber, boxShadow: `0 0 ${4 + n * 26}px rgba(255,194,74,.55)` }} />
                      </div>
                      <div>
                        <div style={{ font: '600 9px/1 Archivo', letterSpacing: '.1em', color: C.phosphorDim }}>{name}</div>
                        <div style={{ marginTop: 6, font: '800 17px/1 Archivo', color: C.amber }}>{v}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, font: '500 9px/1.4 Archivo', color: C.phosphorDim }}>{copy.ambHint}</div>
            </div>
          </section>
        </div>

        {/* canopy */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '14px 18px 0', background: 'linear-gradient(#0a0d0c,#0f1412)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 2px 10px' }}>
            <div style={{ ...label, letterSpacing: '.18em' }}>CANOPY</div>
            <div style={{ font: '800 12px/1 Archivo', letterSpacing: '.06em', color: C.phosphor }}>
              {{ HUD: 'FIRST-PERSON HUD', RADAR: 'PROXIMITY RADAR', COMBO: 'HUD + RADAR INSET' }[view]}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['HUD', 'RADAR', 'COMBO'].map((id) => (
                <button key={id} type="button" onClick={() => setView(id)}
                  style={{ ...btn, background: view === id ? 'rgba(125,250,168,.16)' : '#0e1311', color: view === id ? C.phosphor : C.phosphorDim, padding: '7px 12px' }}>{id}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={label}>HEADING</div>
              <div style={{ marginTop: 4, font: '800 14px/1 Archivo', color: C.phosphor }}>{String(Math.round(t.heading || 0)).padStart(3, '0')}°</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 260, position: 'relative', padding: 14, background: 'linear-gradient(#242e28,#131a16 40%,#0b0f0d)', border: `2px solid ${C.rule}`, boxShadow: 'inset 0 3px 0 rgba(255,255,255,.06),0 -8px 26px rgba(0,0,0,.7)', clipPath: 'polygon(34px 0,calc(100% - 34px) 0,100% 26px,100% 100%,0 100%,0 26px)' }}>
            <div style={{ position: 'absolute', left: 16, top: 9, display: 'flex', gap: 8 }}><Bolt /><Bolt /></div>
            <div style={{ position: 'absolute', right: 16, top: 9, display: 'flex', gap: 8 }}><Bolt /><Bolt /></div>
            <div style={{ position: 'absolute', inset: 14, border: '2px solid #050806', background: '#050706', boxShadow: 'inset 0 0 0 3px #111814' }}>
              <canvas ref={canvas} style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }} />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(112deg,rgba(255,255,255,.055) 0 24%,rgba(255,255,255,0) 26%,rgba(255,255,255,0) 68%,rgba(255,255,255,.03) 70% 100%)' }} />
              <div style={{ position: 'absolute', left: 14, top: 52, font: '600 10px/1.6 Archivo', letterSpacing: '.1em', color: '#4f7f62' }}>
                POV · SENSOR RECONSTRUCTION<br />RAW SENSOR UNITS 0 – 4000
              </div>
            </div>
          </div>
          {/* glare shield */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', flex: 'none', borderLeft: `2px solid ${C.rule}`, borderRight: `2px solid ${C.rule}`, background: 'linear-gradient(#111713,#0a0d0c)' }}>
            <section style={{ padding: '12px 16px 13px', borderRight: `2px solid ${C.rule}`, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 104, height: 104, flex: 'none', ...well, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.ruleSoft }} />
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: C.ruleSoft }} />
                <div style={{ position: 'absolute', left: `${50 + Math.max(-46, Math.min(46, t.roll * 2.4))}%`, top: `${50 + Math.max(-46, Math.min(46, t.pitch * 2.4))}%`, width: 20, height: 20, margin: '-10px 0 0 -10px', border: `2px solid ${C.phosphor}`, background: 'rgba(125,250,168,.25)', boxShadow: '0 0 12px rgba(125,250,168,.45)' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, font: '800 11px/1.2 Archivo', letterSpacing: '.1em', color: C.phosphor }}>{copy.attTitle}</h2>
                <div style={{ marginTop: 10 }}><div style={label}>PITCH F/B</div><div style={{ marginTop: 3, ...value }}>{t.pitch.toFixed(1)}°</div></div>
                <div style={{ marginTop: 8 }}><div style={label}>ROLL L/R</div><div style={{ marginTop: 3, ...value }}>{t.roll.toFixed(1)}°</div></div>
              </div>
            </section>
            <section style={{ padding: '12px 16px 13px', display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 104, height: 104, flex: 'none', ...well, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'relative', width: 88, height: 88, border: `2px solid #2f5a43`, borderRadius: '50%' }}>
                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 36, marginLeft: -1, transformOrigin: '50% 100%', transform: `translateY(-36px) rotate(${Math.round(t.heading || 0)}deg)`, background: C.red }} />
                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, margin: '-3px 0 0 -3px', background: C.phosphor }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, font: '800 11px/1.2 Archivo', letterSpacing: '.1em', color: C.phosphor }}>{copy.gyroTitle}</h2>
                <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
                  <div><div style={label}>ANGLE</div><div style={{ marginTop: 3, ...value, color: C.phosphor }}>{t.angle.toFixed(0)}°</div></div>
                  <div><div style={label}>RATE</div><div style={{ marginTop: 3, ...value }}>{t.rate.toFixed(0)}°/s</div></div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 8, border: '2px solid #6b4a12', background: 'rgba(255,194,74,.10)', padding: '7px 9px' }}>
                  <span style={{ width: 8, height: 8, flex: 'none', marginTop: 3, background: C.amber }} />
                  <span style={{ font: '500 9px/1.35 Archivo', color: C.amber }}>{copy.gyroWarn}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* right console — every motor command */}
        <div style={{ width: 306, flex: 'none', transform: 'rotateY(-11deg)', transformOrigin: '0 50%', background: 'linear-gradient(260deg,#0a0d0c,#141a17 70%)', borderLeft: `2px solid ${C.rule}`, boxShadow: 'inset 14px 0 26px rgba(0,0,0,.55)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px 0' }}><Bolt /><Bolt /></div>
          <section style={{ padding: '10px 16px 18px' }}>
            <H sub={`MIX ${c.mix}`}>{copy.motorTitle}</H>
            <div ref={pad}
              onPointerDown={(e) => { dragging.current = true; const p = padPoint(e); if (p) yokeTo(p[0], p[1]); }}
              onPointerMove={(e) => { if (!dragging.current) return; const p = padPoint(e); if (p) yokeTo(p[0], p[1]); }}
              onPointerUp={() => { dragging.current = false; }}
              onPointerLeave={() => { dragging.current = false; }}
              style={{ marginTop: 10, position: 'relative', height: 118, ...well, cursor: 'crosshair', touchAction: 'none' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.ruleSoft }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: C.ruleSoft }} />
              <div style={{ position: 'absolute', left: 8, top: 7, font: '600 9px/1 Archivo', letterSpacing: '.1em', color: C.phosphorDeep }}>{copy.yokeFwd}</div>
              <div style={{ position: 'absolute', left: 8, bottom: 7, font: '600 9px/1 Archivo', letterSpacing: '.1em', color: C.phosphorDeep }}>{copy.yokeRev}</div>
              <div style={{ position: 'absolute', left: `${50 + c.yoke.x * 46}%`, top: `${50 + c.yoke.y * 46}%`, width: 34, height: 34, margin: '-17px 0 0 -17px', border: `2px solid ${C.phosphor}`, background: 'rgba(125,250,168,.22)', boxShadow: '0 0 14px rgba(125,250,168,.4)' }} />
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 8 }}>
              {['TANDEM', 'SPIN', 'FREE'].map((m) => (
                <button key={m} type="button" onClick={() => set((cc) => { cc.mix = m; })}
                  style={{ ...btn, flex: 1, border: `2px solid ${c.mix === m ? C.phosphor : C.rule}`, background: c.mix === m ? 'rgba(125,250,168,.14)' : C.panelUp, color: c.mix === m ? C.phosphor : C.ink, padding: '7px 8px' }}>{m}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 9 }}>
              {[['LEFT', c.left], ['RIGHT', c.right]].map(([name, v]) => (
                <div key={name} style={{ flex: 1, ...well, padding: '7px 9px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={label}>{name}</span><span style={{ font: '800 15px/1 Archivo', color: C.phosphor }}>{v}</span>
                  </div>
                  <input type="range" min={-SPEED_LIMIT} max={SPEED_LIMIT} step={20} value={v} style={{ width: '100%', marginTop: 5 }}
                    onChange={(e) => { const n = +e.target.value; name === 'LEFT' ? motors(n, c.right) : motors(c.left, n); }} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {SPEEDS.map((s) => (
                <button key={s.label} type="button" onClick={() => (s.spin ? motors(-s.spin, s.spin) : motors(s.v, s.v))}
                  style={{ ...btn, font: '700 10px/1.15 Archivo', padding: '7px 8px' }}>
                  {s.label}<br /><span style={{ color: C.phosphorDim, fontWeight: 500 }}>{s.spin ? `${s.spin} / ${-s.spin}` : `${s.v} both`}</span>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 10, paddingTop: 9, borderTop: `2px solid ${C.rule}` }}>
              <h2 style={{ margin: 0, font: '800 11px/1 Archivo', letterSpacing: '.1em', color: C.phosphor }}>{copy.presetTitle}</h2>
              <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {PRESETS.map((p) => (
                  <button key={p.id} type="button" title={p.desc}
                    onClick={() => set((cc) => {
                      if (p.ml !== undefined) { cc.left = p.ml; cc.right = p.mr; cc.yoke = { x: 0, y: 0 }; }
                      if (p.led) cc.leds = [0, 1, 2, 3].map(() => ({ ...p.led }));
                      if (p.front) { cc.leds[0] = { ...p.front }; cc.leds[1] = { ...p.front }; }
                      if (p.rear) { cc.leds[2] = { ...p.rear }; cc.leds[3] = { ...p.rear }; }
                    })}
                    style={{ ...btn, display: 'flex', alignItems: 'center', gap: 7, padding: 7 }}>
                    <span style={{ width: 8, height: 8, flex: 'none', background: p.sw }} />
                    <span style={{ font: '700 10px/1.1 Archivo', color: C.ink }}>{p.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 11, border: `2px solid ${C.rule}`, background: 'rgba(125,250,168,.04)', padding: '10px 11px 11px' }}>
              <h2 style={{ margin: 0, font: '800 13px/1 Archivo', letterSpacing: '.1em', color: C.phosphor }}>{copy.timedTitle}</h2>
              <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[['SPEED L', 'runLeftSpeed', c.runLeftSpeed, -300, 300, 10],
                  ['SPEED R', 'runRightSpeed', c.runRightSpeed, -300, 300, 10],
                  ['DURATION ×0.1 s', 'runTenths', c.runTenths, 1, 100, 1]].map(([name, key, v, min, max, step]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ font: '600 10px/1 Archivo', letterSpacing: '.12em', color: C.phosphorDim }}>{name}</span>
                      <span style={{ font: '800 16px/1 Archivo', color: key === 'runTenths' ? C.ink : C.phosphor }}>
                        {key === 'runTenths' ? `${v} → ${seconds}s` : v}
                      </span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={v} style={{ display: 'block', width: '100%', marginTop: 4 }}
                      onChange={(e) => set((cc) => { cc[key] = +e.target.value; })} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 9, marginTop: 9, alignItems: 'stretch' }}>
                <button type="button" onClick={() => set((cc) => { cc.left = cc.runLeftSpeed; cc.right = cc.runRightSpeed; cc.runRemaining = cc.runTenths / 10; })}
                  style={{ ...btn, flex: 1, border: '2px solid #2f5a43', background: C.phosphor, color: '#05130b', font: '800 11px/1.2 Archivo', padding: '9px 10px', boxShadow: '0 2px 0 #2f5a43' }}>
                  EXECUTE<br /><span style={{ font: '600 9px/1.25 Archivo' }}>{Math.round(((c.runLeftSpeed + c.runRightSpeed) / 2) * (c.runTenths / 10))} {copy.distUnit}</span>
                </button>
                <div style={{ width: 88, flex: 'none', ...well, padding: '6px 9px' }}>
                  <div style={label}>T-MINUS</div>
                  <div style={{ marginTop: 4, font: '800 15px/1 Archivo', color: c.runRemaining > 0 ? C.amber : C.phosphorDim }}>{c.runRemaining > 0 ? `${c.runRemaining.toFixed(1)}s` : 'IDLE'}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, ...well, padding: '9px 11px 10px' }}>
              <H sub="0.1 s">{copy.swTitle}</H>
              <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ font: '800 26px/1 Archivo', color: c.stopwatch.running ? C.phosphor : C.ink }}>{(Math.floor(c.stopwatch.ms / 100) / 10).toFixed(1)}</div>
                <span style={{ ...label, letterSpacing: '.14em' }}>s</span>
                <div style={{ flex: 1 }} />
                <button type="button" onClick={() => set((cc) => { cc.stopwatch.running = !cc.stopwatch.running; })}
                  style={{ ...btn, border: `2px solid ${c.stopwatch.running ? C.red : '#2f5a43'}`, background: c.stopwatch.running ? 'rgba(255,86,60,.14)' : C.panelUp, color: c.stopwatch.running ? C.red : C.phosphor }}>
                  {c.stopwatch.running ? 'STOP' : 'START'}
                </button>
                <button type="button" onClick={() => set((cc) => { cc.stopwatch.ms = 0; })} style={btn}>RESET</button>
              </div>
              <div style={{ marginTop: 7, height: 7, border: `2px solid ${C.rule}`, background: '#040605', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${((c.stopwatch.ms / 1000) % 10) * 10}%`, background: c.stopwatch.running ? C.phosphor : C.ink }} />
              </div>
            </div>
          </section>
        </div>

        {/* auxiliary rack */}
        {drawer ? (
          <div style={{ width: 318, flex: 'none', borderLeft: `2px solid ${C.rule}`, background: 'linear-gradient(260deg,#080b09,#101614)', overflowY: 'auto' }}>
            <div style={{ padding: '11px 15px', borderBottom: `2px solid ${C.rule}`, background: '#0e1311' }}>
              <div style={{ font: '800 11px/1 Archivo', letterSpacing: '.1em', color: C.phosphor }}>AUXILIARY RACK</div>
              <div style={{ marginTop: 4, ...label }}>LIGHTS · BUTTONS · AUDIO · IR</div>
            </div>

            <section style={{ padding: '13px 15px 14px', borderBottom: `2px solid ${C.rule}` }}>
              <H sub={copy.ledHint}>{copy.ledTitle}</H>
              <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {c.leds.map((l, i) => {
                  const on = Math.max(l.r, l.g, l.b);
                  const current = SWATCHES.find((s) => s.r === l.r && s.g === l.g && s.b === l.b);
                  return (
                    <div key={i} style={{ ...well, padding: '6px 7px 7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ font: '500 9px/1 Archivo', letterSpacing: '.1em', color: C.phosphorDim }}>{['FRONT L', 'FRONT R', 'REAR L', 'REAR R'][i]}</span>
                        <span style={{ font: '700 9px/1 Archivo', color: C.phosphorDim }}>{current ? current.n : 'CUSTOM'}</span>
                      </div>
                      <div style={{ marginTop: 6, height: 26, border: `2px solid ${C.rule}`, background: on ? ledCss(l) : C.panelUp, boxShadow: on ? `0 0 ${4 + on * 1.6}px ${ledCss(l)}` : 'none' }} />
                      <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 3 }}>
                        {SWATCHES.map((s) => (
                          <button key={s.n} type="button" title={s.n} onClick={() => set((cc) => { cc.leds[i] = { r: s.r, g: s.g, b: s.b }; })}
                            style={{ height: 16, border: `2px solid ${current && current.n === s.n ? C.phosphor : C.ruleSoft}`, background: s.n === 'OFF' ? C.panelUp : ledCss(s), cursor: 'pointer' }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ padding: '13px 15px 14px', borderBottom: `2px solid ${C.rule}` }}>
              <h3 style={{ margin: 0, font: '700 11px/1 Archivo', letterSpacing: '.1em', color: C.ink }}>{copy.padTitle}</h3>
              <div style={{ marginTop: 11, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,40px)', gap: 6, width: 196, marginLeft: 'auto', marginRight: 'auto' }}>
                <div />
                <button type="button" {...hold('forward')} style={{ ...btn, background: c.buttons.forward ? 'rgba(125,250,168,.22)' : C.panelUp, textAlign: 'center', font: '700 11px/1 Archivo' }}>FWD</button>
                <div />
                <button type="button" {...hold('left')} style={{ ...btn, background: c.buttons.left ? 'rgba(125,250,168,.22)' : C.panelUp, textAlign: 'center', font: '700 11px/1 Archivo' }}>L</button>
                <button type="button" onPointerDown={() => motors(0, 0)} style={{ ...btn, textAlign: 'center', font: '700 10px/1 Archivo' }}>OK</button>
                <button type="button" {...hold('right')} style={{ ...btn, background: c.buttons.right ? 'rgba(125,250,168,.22)' : C.panelUp, textAlign: 'center', font: '700 11px/1 Archivo' }}>R</button>
                <div />
                <button type="button" {...hold('back')} style={{ ...btn, background: c.buttons.back ? 'rgba(125,250,168,.22)' : C.panelUp, textAlign: 'center', font: '700 11px/1 Archivo' }}>REV</button>
                <div />
              </div>
              <div style={{ marginTop: 10, font: '500 10px/1.45 Archivo', color: C.phosphorDim, textAlign: 'center' }}>{copy.padHint}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' }}>
                {['forward', 'back', 'left', 'right', 'center'].map((k) => (
                  <span key={k} title={`robot button: ${k}`} style={{ width: 10, height: 10, background: t.buttons[k] ? C.phosphor : C.rule }} />
                ))}
              </div>
            </section>

            <section style={{ padding: '13px 15px 14px', borderBottom: `2px solid ${C.rule}` }}>
              <h3 style={{ margin: 0, font: '700 11px/1 Archivo', letterSpacing: '.1em', color: C.ink }}>{copy.audioTitle}</h3>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-end', gap: 2, height: 50, border: `2px solid ${C.rule}`, background: '#040605', padding: 4 }}>
                {t.micHistory.map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${Math.max(3, v)}%`, background: i > t.micHistory.length - 4 ? C.phosphor : 'rgba(125,250,168,.45)' }} />
                ))}
              </div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', font: '500 9px/1 Archivo', color: C.phosphorDim }}>
                <span>LEVEL {t.micVolume}</span><span>{live ? 'ROBOT MIC' : 'SIMULATED'}</span>
              </div>
            </section>

            <section style={{ padding: '13px 15px 16px' }}>
              <h3 style={{ margin: 0, font: '700 11px/1 Archivo', letterSpacing: '.1em', color: C.ink }}>{copy.irTitle}</h3>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, ...well, background: t.tvRemote ? 'rgba(125,250,168,.35)' : '#050806' }} />
                <div>
                  <div style={label}>LAST CODE</div>
                  <div style={{ marginTop: 4, font: '800 19px/1 Archivo', color: C.phosphor }}>{t.tvRemote ? `0x${t.tvRemote.toString(16).toUpperCase().padStart(2, '0')}` : '——'}</div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
