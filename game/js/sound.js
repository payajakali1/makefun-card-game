// sound.js — a pocket synthesiser. Every sound is a few oscillators and
// envelopes shaped in code; there are no audio files to load, so the
// game stays fully offline. The context is created lazily on the first
// user gesture, as browsers require.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(value) { muted = value; }
export function isMuted() { return muted; }

// One soft tone: frequency glides from f0 to f1 over the duration.
function tone(f0, f1, dur, type = 'sine', gain = 0.12, when = 0) {
  const a = ac();
  if (!a || muted) return;
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const amp = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  click() { tone(660, 520, 0.06, 'triangle', 0.06); },
  deal() { tone(320, 210, 0.09, 'triangle', 0.07); },
  play() { tone(240, 480, 0.14, 'triangle', 0.09); },
  kindle() { tone(523, 523, 0.09, 'sine', 0.09); tone(659, 659, 0.09, 'sine', 0.09, 0.07); tone(784, 784, 0.16, 'sine', 0.1, 0.14); },
  attack() { tone(180, 60, 0.16, 'sawtooth', 0.1); },
  hurt() { tone(300, 90, 0.18, 'square', 0.07); },
  death() { tone(420, 40, 0.4, 'sawtooth', 0.09); },
  heal() { tone(392, 392, 0.1, 'sine', 0.07); tone(587, 587, 0.2, 'sine', 0.07, 0.08); },
  turn() { tone(440, 440, 0.07, 'triangle', 0.06); tone(440, 440, 0.07, 'triangle', 0.05, 0.1); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.1, i * 0.11)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.94, 0.24, 'triangle', 0.09, i * 0.13)); },
};
