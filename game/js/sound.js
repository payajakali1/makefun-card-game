// sound.js — tiny WebAudio blips, synthesised live: no audio files, nothing
// to load. Sounds start only after the player's first click (browsers keep
// audio locked until then), and every call is safe when audio is absent.

let ctx = null;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.08, when = 0, slideTo = null) {
  const ac = ensureCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  unlock() { ensureCtx(); },
  deal() { tone(520, 0.06, 'triangle', 0.05); },
  play() { tone(340, 0.09, 'triangle', 0.07, 0, 520); },
  select() { tone(660, 0.05, 'sine', 0.05); },
  attack() { tone(180, 0.12, 'sawtooth', 0.06, 0, 90); },
  hit() { tone(120, 0.1, 'square', 0.05, 0, 70); },
  death() { tone(300, 0.25, 'sawtooth', 0.05, 0, 60); },
  heal() { tone(520, 0.12, 'sine', 0.06, 0, 780); },
  kindle() { tone(880, 0.1, 'triangle', 0.06); tone(1174, 0.12, 'triangle', 0.05, 0.07); },
  turn() { tone(440, 0.07, 'sine', 0.05); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, i * 0.11)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, i * 0.11)); },
};
