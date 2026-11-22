// main.js — wires the table together: screens, clicks, the rival's turn,
// floating combat numbers, and the deterministic screenshot states the
// maker captures with ?shot=title|table|victory|defeat&seed=N.

import { CARDS } from './cards.js';
import {
  createDuel, playCard, attack, endTurn, playableCards, isKindled,
  trickTargetKind, guardChampions, canAttack, findChampion, other,
} from './duel.js';
import { nextRivalAction } from './ai.js';
import { renderTable, spawnFloater, centerOf } from './render.js';
import { sfx } from './sound.js';

const $ = (id) => document.getElementById(id);
const refs = {
  rivalBar: $('rival-bar'),
  playerBar: $('player-info'),
  rivalHand: $('rival-hand'),
  rivalBoard: $('rival-board'),
  playerBoard: $('player-board'),
  playerHand: $('player-hand'),
  log: $('log'),
  turnBanner: $('turn-banner'),
  endTurnBtn: $('end-turn-btn'),
};
const fxLayer = $('fx-layer');
const params = new URLSearchParams(location.search);

let state = null;
const ui = {
  busy: false,
  selectedHand: null,
  selectedAttacker: null,
  playable: [],
  kindledHand: new Set(),
  targetable: new Set(),
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function showScreen(name) {
  $('title-screen').hidden = name !== 'title';
  $('table-screen').hidden = name !== 'table';
  $('end-screen').hidden = name !== 'end';
}

function currentTargets() {
  const set = new Set();
  if (!state || state.winner) return set;
  if (ui.selectedHand != null) {
    const def = CARDS[state.sides.player.hand[ui.selectedHand]];
    const need = trickTargetKind(def);
    if (need === 'anyTarget' || need === 'anyChampion') {
      for (const who of ['player', 'rival']) {
        for (const ch of state.sides[who].board) set.add(`${who}:${ch.uid}`);
      }
      if (need === 'anyTarget') { set.add('player:heart'); set.add('rival:heart'); }
    } else if (need === 'friendlyChampion') {
      for (const ch of state.sides.player.board) set.add(`player:${ch.uid}`);
    } else if (need === 'enemyChampion') {
      for (const ch of state.sides.rival.board) set.add(`rival:${ch.uid}`);
    }
  } else if (ui.selectedAttacker != null) {
    const guards = guardChampions(state, 'rival');
    if (guards.length > 0) {
      for (const ch of guards) set.add(`rival:${ch.uid}`);
    } else {
      for (const ch of state.sides.rival.board) set.add(`rival:${ch.uid}`);
      set.add('rival:heart');
    }
  }
  return set;
}

function refreshUi() {
  const myTurn = state && state.active === 'player' && !state.winner && !ui.busy;
  ui.playable = myTurn ? playableCards(state, 'player') : [];
  ui.kindledHand = new Set(
    state
      ? state.sides.player.hand
          .map((cardId, i) => (isKindled(state, 'player', CARDS[cardId]) ? i : -1))
          .filter((i) => i >= 0)
      : [],
  );
  ui.targetable = currentTargets();
}

function render() {
  refreshUi();
  renderTable(refs, state, ui);
}

function snapshotPositions() {
  const map = new Map();
  document.querySelectorAll('[data-uid]').forEach((node) => {
    map.set(node.dataset.uid, centerOf(node));
  });
  document.querySelectorAll('.portrait').forEach((node) => {
    map.set(`${node.dataset.owner}:heart`, centerOf(node));
  });
  return map;
}

// Play the engine's fx notes as floaters and shakes, using the positions
// captured just before the action changed the table.
function playFx(before) {
  const fx = state.fx.splice(0, state.fx.length);
  for (const note of fx) {
    if (note.type === 'damage' || note.type === 'death') {
      const pos = before.get(String(note.uid));
      const node = document.querySelector(`[data-uid="${note.uid}"]`);
      if (node) node.classList.add('hit');
      if (pos) {
        spawnFloater(fxLayer, pos.x, pos.y, note.type === 'death' ? 'FELL' : `-${note.amount}`, note.type === 'death' ? 'info' : 'damage');
      }
      if (note.type === 'death') sfx.death();
      else sfx.hit();
    } else if (note.type === 'heartDamage') {
      const pos = before.get(`${note.owner}:heart`);
      if (pos) spawnFloater(fxLayer, pos.x, pos.y - 10, `-${note.amount}`, 'heart');
      sfx.hit();
    } else if (note.type === 'heal') {
      const pos = before.get(`${note.owner}:heart`);
      if (pos) spawnFloater(fxLayer, pos.x, pos.y - 10, `+${note.amount}`, 'heal');
      sfx.heal();
    } else if (note.type === 'freeze') {
      const node = document.querySelector(`[data-uid="${note.uid}"]`);
      if (node) { const p = centerOf(node); spawnFloater(fxLayer, p.x, p.y, 'FROZEN', 'info'); }
    } else if (note.type === 'buff') {
      const node = document.querySelector(`[data-uid="${note.uid}"]`);
      if (node) { const p = centerOf(node); spawnFloater(fxLayer, p.x, p.y, 'BUFFED', 'info'); }
    } else if (note.type === 'summon' && note.kindled) {
      sfx.kindle();
    }
  }
}

function afterAction(before) {
  render();
  playFx(before);
  if (state.winner) setTimeout(showEnd, 900);
}

function clearSelection() {
  ui.selectedHand = null;
  ui.selectedAttacker = null;
}

function doPlay(handIndex, target) {
  const before = snapshotPositions();
  const def = CARDS[state.sides.player.hand[handIndex]];
  const ok = playCard(state, 'player', handIndex, target);
  if (ok) {
    sfx.play();
    clearSelection();
    afterAction(before);
  }
  return ok;
}

async function doAttack(who, uid, target) {
  const attackerNode = document.querySelector(`[data-uid="${uid}"]`);
  let targetNode = null;
  if (target.heart) {
    targetNode = document.querySelector(`.portrait.${target.owner}`);
  } else {
    targetNode = document.querySelector(`[data-uid="${target.uid}"]`);
  }
  if (attackerNode && targetNode) {
    const a = centerOf(attackerNode);
    const t = centerOf(targetNode);
    attackerNode.style.setProperty('--dx', `${(t.x - a.x) * 0.55}px`);
    attackerNode.style.setProperty('--dy', `${(t.y - a.y) * 0.55}px`);
    attackerNode.classList.add('lunging');
    sfx.attack();
    await wait(210);
    attackerNode.classList.remove('lunging');
  }
  const before = snapshotPositions();
  attack(state, who, uid, target);
  afterAction(before);
}

// ————— Player input —————

refs.playerHand.addEventListener('click', (ev) => {
  if (!state || ui.busy || state.active !== 'player' || state.winner) return;
  const node = ev.target.closest('.card');
  if (!node) return;
  const index = Number(node.dataset.handIndex);
  if (!ui.playable.includes(index)) { sfx.select(); return; }
  const def = CARDS[state.sides.player.hand[index]];
  const need = trickTargetKind(def);
  if (def.kind === 'trick' && need) {
    ui.selectedAttacker = null;
    ui.selectedHand = ui.selectedHand === index ? null : index;
    sfx.select();
    render();
  } else {
    doPlay(index, null);
  }
});

refs.playerBoard.addEventListener('click', (ev) => {
  if (!state || ui.busy || state.active !== 'player' || state.winner) return;
  const node = ev.target.closest('.card');
  if (!node) return;
  const uid = Number(node.dataset.uid);
  // A selected friendly-target trick (Overgrowth) lands here.
  if (ui.selectedHand != null && ui.targetable.has(`player:${uid}`)) {
    doPlay(ui.selectedHand, { owner: 'player', uid });
    return;
  }
  const ch = findChampion(state, 'player', uid);
  if (ch && canAttack(state, 'player', ch)) {
    ui.selectedHand = null;
    ui.selectedAttacker = ui.selectedAttacker === uid ? null : uid;
    sfx.select();
    render();
  }
});

function enemyClicked(target) {
  if (!state || ui.busy || state.active !== 'player' || state.winner) return;
  if (ui.selectedHand != null) {
    const key = target.heart ? 'rival:heart' : `rival:${target.uid}`;
    if (ui.targetable.has(key)) doPlay(ui.selectedHand, target);
  } else if (ui.selectedAttacker != null) {
    const key = target.heart ? 'rival:heart' : `rival:${target.uid}`;
    if (ui.targetable.has(key)) {
      const uid = ui.selectedAttacker;
      ui.selectedAttacker = null;
      ui.busy = true;
      doAttack('player', uid, target).then(() => { ui.busy = false; render(); });
    }
  }
}

refs.rivalBoard.addEventListener('click', (ev) => {
  const node = ev.target.closest('.card');
  if (node) enemyClicked({ owner: 'rival', uid: Number(node.dataset.uid) });
});
refs.rivalBar.addEventListener('click', (ev) => {
  if (ev.target.closest('.portrait')) enemyClicked({ owner: 'rival', heart: true });
});
$('table-screen').addEventListener('click', (ev) => {
  if (ev.target === $('table-screen')) { clearSelection(); render(); }
});

refs.endTurnBtn.addEventListener('click', async () => {
  if (!state || ui.busy || state.active !== 'player' || state.winner) return;
  clearSelection();
  ui.busy = true;
  endTurn(state, 'player');
  render();
  sfx.turn();
  await wait(500);
  while (!state.winner) {
    const action = nextRivalAction(state);
    if (!action) break;
    if (action.type === 'play') {
      const before = snapshotPositions();
      playCard(state, 'rival', action.handIndex, action.target);
      afterAction(before);
    } else if (action.type === 'attack') {
      await doAttack('rival', action.uid, action.target);
    }
    if (state.winner) break;
    await wait(560);
  }
  if (!state.winner) {
    endTurn(state, 'rival');
    ui.busy = false;
    render();
    sfx.turn();
  } else {
    ui.busy = false;
  }
});

// ————— Duel lifecycle —————

function startDuel(seed) {
  state = createDuel(seed);
  clearSelection();
  ui.busy = false;
  showScreen('table');
  render();
  sfx.deal();
}

function showEnd() {
  if (!state || !state.winner) return;
  const won = state.winner === 'player';
  const end = $('end-screen');
  end.className = won ? 'victory' : 'defeat';
  $('end-title').textContent = won ? 'VICTORY' : 'DEFEAT';
  $('end-text').textContent = won
    ? 'Briar’s Heart is spent and the thicket bows to a new Warden. The four Houses sing your name.'
    : 'Your Heart fades under the thorns — this time. Briar keeps the thicket, and waits for your return.';
  $('end-stats').textContent =
    `The duel ran ${state.sides.player.turnsTaken} of your turns · you played ${state.plays.player} cards, Briar played ${state.plays.rival} · ` +
    `your Heart ${Math.max(0, state.sides.player.heart)}, Briar’s ${Math.max(0, state.sides.rival.heart)}.`;
  showScreen('end');
  // Keep the finished table visible behind the panel.
  $('table-screen').hidden = false;
  if (won) {
    sfx.win();
    const layer = $('end-screen');
    for (let i = 0; i < 26; i++) {
      const ember = document.createElement('div');
      ember.className = 'ember';
      const size = 5 + Math.random() * 8;
      ember.style.width = `${size}px`;
      ember.style.height = `${size}px`;
      ember.style.left = `${Math.random() * 100}%`;
      ember.style.animationDuration = `${2.4 + Math.random() * 2.6}s`;
      ember.style.animationDelay = `${Math.random() * 1.4}s`;
      layer.appendChild(ember);
      setTimeout(() => ember.remove(), 7000);
    }
  } else {
    sfx.lose();
  }
}

$('start-btn').addEventListener('click', () => {
  sfx.unlock();
  const seed = Number(params.get('seed')) || (Date.now() % 100000) + 1;
  startDuel(seed);
});
$('again-btn').addEventListener('click', () => {
  document.querySelectorAll('.ember').forEach((n) => n.remove());
  startDuel((Date.now() % 100000) + 1);
});

// ————— Screenshot states (the maker's own renders, like the kit starter) —
// A policy that plays a fair, aggressive game for the player side, used to
// reach real mid-game and end states deterministically from a seed.

function shotPlayerPolicy(s) {
  const P = 'player';
  let guard = 0;
  while (!s.winner && guard++ < 30) {
    const idxs = playableCards(s, P);
    if (idxs.length === 0) break;
    let acted = false;
    // Champions first, biggest affordable.
    const champIdx = idxs
      .filter((i) => CARDS[s.sides[P].hand[i]].kind === 'champion')
      .sort((a, b) => CARDS[s.sides[P].hand[b]].cost - CARDS[s.sides[P].hand[a]].cost)[0];
    if (champIdx != null) { playCard(s, P, champIdx, null); acted = true; }
    if (!acted) {
      for (const i of idxs) {
        const def = CARDS[s.sides[P].hand[i]];
        if (def.kind !== 'trick') continue;
        const eff = def.effect;
        if (eff.type === 'draw') { playCard(s, P, i, null); acted = true; break; }
        if (eff.type === 'healDraw' && s.sides[P].heart <= 12) { playCard(s, P, i, null); acted = true; break; }
        if (eff.type === 'buff' && s.sides[P].board.length) {
          const big = [...s.sides[P].board].sort((a, b) => b.atk - a.atk)[0];
          playCard(s, P, i, { owner: P, uid: big.uid }); acted = true; break;
        }
        if ((eff.type === 'damage' || eff.type === 'freezeDamage')) {
          const amount = eff.amount + (isKindled(s, P, def) ? def.kindleBonus || 0 : 0);
          const kill = s.sides.rival.board.filter((c) => c.hp <= amount).sort((a, b) => b.atk - a.atk)[0];
          if (kill) { playCard(s, P, i, { owner: 'rival', uid: kill.uid }); acted = true; break; }
          if (eff.type === 'damage' && s.sides.rival.heart <= amount) {
            playCard(s, P, i, { owner: 'rival', heart: true }); acted = true; break;
          }
        }
        if (eff.type === 'damageAllEnemyChampions') {
          const amount = eff.amount + (isKindled(s, P, def) ? def.kindleBonus || 0 : 0);
          if (s.sides.rival.board.filter((c) => c.hp <= amount).length >= 2) {
            playCard(s, P, i, null); acted = true; break;
          }
        }
        if (eff.type === 'bounce') {
          const big = [...s.sides.rival.board].sort((a, b) => CARDS[b.cardId].cost - CARDS[a.cardId].cost)[0];
          if (big && CARDS[big.cardId].cost >= 4) { playCard(s, P, i, { owner: 'rival', uid: big.uid }); acted = true; break; }
        }
      }
    }
    if (!acted) break;
  }
  // Attacks: Guards first, then clean kills, then the Heart.
  guard = 0;
  while (!s.winner && guard++ < 20) {
    const ready = s.sides[P].board.filter((ch) => canAttack(s, P, ch));
    if (!ready.length) break;
    const ch = ready[0];
    const guards = guardChampions(s, 'rival');
    if (guards.length) { attack(s, P, ch.uid, { owner: 'rival', uid: guards[0].uid }); continue; }
    const kill = s.sides.rival.board.filter((t) => t.hp <= ch.atk && t.atk >= ch.atk)[0];
    if (kill) { attack(s, P, ch.uid, { owner: 'rival', uid: kill.uid }); continue; }
    attack(s, P, ch.uid, { owner: 'rival', heart: true });
  }
}

function shotRivalPhase(s) {
  let guard = 0;
  while (!s.winner && guard++ < 40) {
    const action = nextRivalAction(s);
    if (!action) break;
    if (action.type === 'play') playCard(s, 'rival', action.handIndex, action.target);
    else attack(s, 'rival', action.uid, action.target);
  }
}

function buildShotState(seed, mode) {
  const s = createDuel(seed);
  let rounds = 0;
  while (!s.winner && rounds++ < 40) {
    if (mode === 'table' && s.sides.player.turnsTaken >= 4) break;
    if (mode !== 'defeat') shotPlayerPolicy(s);
    if (s.winner) break;
    endTurn(s, 'player');
    shotRivalPhase(s);
    if (s.winner) break;
    endTurn(s, 'rival');
  }
  s.fx.length = 0;
  return s;
}

function initShots() {
  const shot = params.get('shot');
  const seed = Number(params.get('seed')) || 7;
  if (!shot || shot === 'title') {
    showScreen('title');
    window.__shotDone = true;
    return;
  }
  state = buildShotState(seed, shot);
  clearSelection();
  showScreen('table');
  render();
  if (shot === 'victory' || shot === 'defeat') {
    showEnd();
  }
  setTimeout(() => { window.__shotDone = true; }, 450);
}

window.__duel = {
  get state() { return state; },
  startDuel,
  buildShotState,
};

initShots();
