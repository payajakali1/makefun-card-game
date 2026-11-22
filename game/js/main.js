// main.js — the table's hands and ears. It owns the DOM, the human's
// clicks and keys, the clock that lets Vesper's turn play out step by
// step, and the game's demo states (?shot=title|table|victory|defeat,
// ?seed=N) that its screenshots are taken from: every one of them is a
// real game dealt and played by the engine and the rival's own rules.

import { CARDS } from './cards.js';
import {
  newDuel, startTurn, endTurn, playCard, attack, canAttack,
  cardPlayInfo, attackTargets, championByUid, otherSide,
} from './duel.js';
import { nextAction } from './ai.js';
import { render, eventText, spawnFloater } from './render.js';
import { sfx, setMuted, isMuted } from './sound.js';

const $ = (id) => document.getElementById(id);
const refs = {
  rivalHeart: $('rivalHeart'), rivalMeta: $('rivalMeta'), rivalHand: $('rivalHand'),
  rivalBoard: $('rivalBoard'), playerBoard: $('playerBoard'), playerHand: $('playerHand'),
  playerHeart: $('playerHeart'), playerMeta: $('playerMeta'),
  endTurn: $('endTurn'), turnBanner: $('turnBanner'),
};
const logEl = $('log');
const floaterLayer = $('floaterLayer');
const params = new URLSearchParams(location.search);
const baseSeed = Number(params.get('seed')) || 7;

let state = null;
let busy = false;
const ui = { selectedHand: null, selectedAttacker: null, legalTargets: [], playInfo: new Map() };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ——— log, sound, floaters ———
function announce(events, namesByUid) {
  for (const ev of events) {
    if (ev.type === 'attack' && namesByUid[ev.uid]) ev.cardId = namesByUid[ev.uid];
    const line = eventText(state, ev);
    if (line) {
      const li = document.createElement('li');
      li.textContent = line;
      logEl.prepend(li);
      while (logEl.children.length > 5) logEl.lastChild.remove();
    }
    if (ev.type === 'play') { sfx.play(); if (ev.kindled) sfx.kindle(); }
    if (ev.type === 'attack') sfx.attack();
    if (ev.type === 'death') sfx.death();
    if (ev.type === 'heal') sfx.heal();
    if (ev.type === 'fatigue') sfx.hurt();
  }
}

function floaters(events) {
  for (const ev of events) {
    if (ev.type === 'championHurt') {
      const anchor = document.querySelector(`.board .card[data-uid="${ev.uid}"]`);
      spawnFloater(floaterLayer, anchor, `-${ev.amount}`, '');
      if (anchor) { anchor.classList.add('shaken'); setTimeout(() => anchor.classList.remove('shaken'), 320); }
    }
    if (ev.type === 'heartHurt') {
      spawnFloater(floaterLayer, ev.side === 'player' ? refs.playerHeart : refs.rivalHeart, `-${ev.amount} ♥`, '');
      sfx.hurt();
    }
    if (ev.type === 'heal') {
      spawnFloater(floaterLayer, ev.side === 'player' ? refs.playerHeart : refs.rivalHeart, `+${ev.amount} ♥`, 'good');
    }
    if (ev.type === 'play' && ev.kindled) {
      spawnFloater(floaterLayer, refs.turnBanner, '🔥 KINDLED', 'gold');
    }
  }
}

function namesSnapshot() {
  const map = {};
  for (const sideKey of ['player', 'rival']) {
    for (const champ of state.sides[sideKey].board) map[champ.uid] = champ.id;
  }
  return map;
}

// ——— rendering with the human's selection ———
function targetsFor(info) {
  if (!info || !info.targetMode) return [];
  const foeKey = otherSide('player');
  if (info.targetMode === 'anything') {
    return [
      { kind: 'heart', side: 'rival' }, { kind: 'heart', side: 'player' },
      ...state.sides.rival.board.map((c) => ({ kind: 'champion', side: 'rival', uid: c.uid })),
      ...state.sides.player.board.map((c) => ({ kind: 'champion', side: 'player', uid: c.uid })),
    ];
  }
  if (info.targetMode === 'enemyChamp') {
    return state.sides[foeKey].board.map((c) => ({ kind: 'champion', side: foeKey, uid: c.uid }));
  }
  return state.sides.player.board.map((c) => ({ kind: 'champion', side: 'player', uid: c.uid }));
}

function refresh() {
  ui.playInfo = new Map();
  if (state.active === 'player' && !state.winner) {
    state.sides.player.hand.forEach((_, i) => {
      const info = cardPlayInfo(state, 'player', i);
      if (info) ui.playInfo.set(i, info);
    });
  }
  ui.legalTargets = [];
  if (ui.selectedHand !== null && ui.playInfo.get(ui.selectedHand)) {
    ui.legalTargets = targetsFor(ui.playInfo.get(ui.selectedHand));
  } else if (ui.selectedAttacker !== null) {
    ui.legalTargets = attackTargets(state, 'player', ui.selectedAttacker);
  }
  render(state, refs, { ...ui, busy });
  if (state.active === 'player' && !busy && !state.winner) {
    for (const champ of state.sides.player.board) {
      if (canAttack(state, 'player', champ.uid)) {
        const el = refs.playerBoard.querySelector(`[data-uid="${champ.uid}"]`);
        if (el) el.classList.add('can-attack');
      }
    }
  }
}

function clearSelection() {
  ui.selectedHand = null;
  ui.selectedAttacker = null;
}

// ——— applying actions ———
function applyPlay(sideKey, handIndex, target) {
  const names = namesSnapshot();
  const result = playCard(state, sideKey, handIndex, target);
  if (!result.ok) return false;
  refresh();
  announce(result.events, names);
  floaters(result.events);
  return true;
}

async function applyAttack(sideKey, uid, target) {
  const names = namesSnapshot();
  const anchor = document.querySelector(`.board .card[data-uid="${uid}"]`);
  if (anchor) anchor.classList.add('lunging');
  await sleep(300);
  const result = attack(state, sideKey, uid, target);
  if (!result.ok) { refresh(); return false; }
  refresh();
  announce(result.events, names);
  floaters(result.events);
  return true;
}

function checkEnd() {
  if (!state.winner) return false;
  const won = state.winner === 'player';
  const end = $('endScreen');
  end.classList.remove('hidden', 'victory', 'defeat');
  end.classList.add(state.winner === 'draw' ? 'defeat' : won ? 'victory' : 'defeat');
  $('endTitle').textContent = state.winner === 'draw' ? 'A DRAW' : won ? 'VICTORY' : 'DEFEAT';
  $('endText').textContent = state.winner === 'draw'
    ? 'Both Hearts guttered out together. The ember keeps neither of you.'
    : won
      ? 'Vesper bows, and the last ember of Emberfall settles in your palm.'
      : 'The Gloom Herald takes the ember. The table goes dark — this time.';
  $('endStats').textContent =
    `Rounds: ${state.round} · Champions you felled: ${state.felled.player} · Champions you lost: ${state.felled.rival} · ` +
    `Your Heart: ${Math.max(0, state.sides.player.heart)} · Vesper's Heart: ${Math.max(0, state.sides.rival.heart)}`;
  if (won) sfx.win(); else sfx.lose();
  return true;
}

// ——— the human's turn ———
function onHandClick(index) {
  if (busy || state.active !== 'player' || state.winner) return;
  const info = ui.playInfo.get(index);
  if (!info) { clearSelection(); refresh(); return; }
  sfx.click();
  if (!info.targetMode) {
    clearSelection();
    applyPlay('player', index, null);
    checkEnd();
    return;
  }
  ui.selectedHand = ui.selectedHand === index ? null : index;
  ui.selectedAttacker = null;
  refresh();
}

function onBoardClick(sideKey, uid) {
  if (busy || state.active !== 'player' || state.winner) return;
  // A chosen card looking for its target?
  if (ui.selectedHand !== null) {
    const hit = ui.legalTargets.find((t) => t.kind === 'champion' && t.side === sideKey && t.uid === uid);
    if (hit) {
      const index = ui.selectedHand;
      clearSelection();
      applyPlay('player', index, hit);
      checkEnd();
    } else { clearSelection(); refresh(); }
    return;
  }
  // A chosen attacker looking for its target?
  if (ui.selectedAttacker !== null) {
    const hit = ui.legalTargets.find((t) => t.kind === 'champion' && t.side === sideKey && t.uid === uid);
    if (hit) {
      const attackerUid = ui.selectedAttacker;
      clearSelection();
      applyAttack('player', attackerUid, hit).then(() => checkEnd());
    } else { clearSelection(); refresh(); }
    return;
  }
  // Choosing an attacker.
  if (sideKey === 'player' && canAttack(state, 'player', uid)) {
    ui.selectedAttacker = uid;
    sfx.click();
    refresh();
  }
}

function onHeartClick(sideKey) {
  if (busy || state.active !== 'player' || state.winner) return;
  const pending = ui.selectedHand !== null
    ? { from: 'hand', target: ui.legalTargets.find((t) => t.kind === 'heart' && t.side === sideKey) }
    : ui.selectedAttacker !== null
      ? { from: 'board', target: ui.legalTargets.find((t) => t.kind === 'heart' && t.side === sideKey) }
      : { from: null, target: null };
  if (!pending.target) return;
  if (pending.from === 'hand') {
    const index = ui.selectedHand;
    clearSelection();
    applyPlay('player', index, pending.target);
    checkEnd();
  } else {
    const attackerUid = ui.selectedAttacker;
    clearSelection();
    applyAttack('player', attackerUid, pending.target).then(() => checkEnd());
  }
}

async function runRivalTurn() {
  busy = true; clearSelection(); refresh();
  announce(endTurn(state), namesSnapshot()); // hands the turn to Vesper
  refresh();
  await sleep(550);
  let guard = 0;
  while (!state.winner && guard++ < 40) {
    const action = nextAction(state, 'rival');
    if (action.type === 'end') break;
    if (action.type === 'play') applyPlay('rival', action.handIndex, action.target);
    else if (action.type === 'attack') await applyAttack('rival', action.uid, action.target);
    if (checkEnd()) { busy = false; refresh(); return; }
    await sleep(600);
  }
  if (!state.winner) {
    const events = endTurn(state); // back to the player: energy, wake, draw
    busy = false;
    refresh();
    announce(events, namesSnapshot());
    sfx.turn();
  }
  refresh();
}

// ——— starting, restarting, demo states ———
function startGame(seed) {
  state = newDuel(seed);
  logEl.replaceChildren();
  clearSelection();
  busy = false;
  const opening = startTurn(state);
  refresh();
  announce(opening, {});
  sfx.deal();
}

// Play a whole game headlessly with Vesper's brain on both sides; used
// only by the demo states below, never by a human's game.
function autoplay(seed, stopAt) {
  const s = newDuel(seed);
  startTurn(s);
  let guard = 0;
  while (!s.winner && guard++ < 500) {
    if (stopAt && stopAt(s)) break;
    const action = nextAction(s, s.active);
    if (action.type === 'end') endTurn(s);
    else if (action.type === 'play') playCard(s, s.active, action.handIndex, action.target);
    else if (action.type === 'attack') attack(s, s.active, action.uid, action.target);
  }
  return s;
}

function adoptDemoState(s) {
  state = s;
  logEl.replaceChildren();
  clearSelection();
  busy = false;
  refresh();
}

// A mid-game table worth looking at: round 3 or 4, both boards manned,
// the player's hand still holding choices. Seeds are tried in order
// until one deals such a table.
function livelyTable() {
  const lively = (s) => s.round >= 3 && s.active === 'player'
    && s.sides.rival.board.length >= 2 && s.sides.player.board.length >= 2
    && s.sides.player.hand.length >= 4;
  for (let seed = baseSeed; seed < baseSeed + 60; seed++) {
    const s = autoplay(seed, lively);
    if (lively(s)) return s;
  }
  return autoplay(baseSeed, (s) => s.round >= 3 && s.active === 'player');
}

function setupShot(kind) {
  $('titleScreen').classList.add('hidden');
  if (kind === 'table') {
    adoptDemoState(livelyTable());
  } else if (kind === 'victory' || kind === 'defeat') {
    const want = kind === 'victory' ? 'player' : 'rival';
    let found = null;
    for (let seed = baseSeed; seed < baseSeed + 300 && !found; seed++) {
      const s = autoplay(seed);
      if (s.winner === want) found = s;
    }
    adoptDemoState(found || autoplay(baseSeed));
    checkEnd();
  }
}

// ——— wiring ———
refs.playerHand.addEventListener('click', (e) => {
  const card = e.target.closest('[data-hand-index]');
  if (card) onHandClick(Number(card.dataset.handIndex));
});
for (const holder of [refs.playerBoard, refs.rivalBoard]) {
  holder.addEventListener('click', (e) => {
    const card = e.target.closest('[data-uid]');
    if (card) onBoardClick(card.dataset.side, Number(card.dataset.uid));
  });
}
refs.rivalHeart.addEventListener('click', () => onHeartClick('rival'));
refs.playerHeart.addEventListener('click', () => onHeartClick('player'));
refs.endTurn.addEventListener('click', () => { if (!busy) runRivalTurn(); });
document.addEventListener('keydown', (e) => {
  if (!$('titleScreen').classList.contains('hidden')) return;
  if (e.key === 'Escape') { clearSelection(); refresh(); }
  if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && !busy && state.active === 'player') runRivalTurn();
  const n = Number(e.key);
  if (n >= 1 && n <= 9) onHandClick(n - 1);
});
$('startBtn').addEventListener('click', () => {
  $('titleScreen').classList.add('hidden');
  startGame((Math.random() * 1e9) | 0);
});
$('againBtn').addEventListener('click', () => {
  $('endScreen').classList.add('hidden');
  startGame((Math.random() * 1e9) | 0);
});
$('helpBtn').addEventListener('click', () => $('helpScreen').classList.remove('hidden'));
$('helpClose').addEventListener('click', () => $('helpScreen').classList.add('hidden'));
$('muteBtn').addEventListener('click', (e) => {
  setMuted(!isMuted());
  e.currentTarget.textContent = isMuted() ? '🔇 Muted' : '🔊 Sound';
});

// First paint: a living table behind the title, or a demo state when a
// screenshot asked for one.
const shot = params.get('shot');
if (shot) {
  setupShot(shot);
} else {
  adoptDemoState(livelyTable());
}
