// ai.js — Briar, the Thicket Warden. The rival plays by readable rules a
// human can learn and counter: she removes champions she can kill cleanly,
// hides behind her Guards, heals when she is low, and goes for the Heart
// when she smells a finish. nextRivalAction returns ONE action at a time so
// the table can animate each of her moves; it returns null when she is done.

import { CARDS } from './cards.js';
import {
  other, findChampion, guardChampions, hasKeyword, canAttack, isKindled,
} from './duel.js';

const ME = 'rival';

function mySide(state) { return state.sides[ME]; }
function foeSide(state) { return state.sides[other(ME)]; }

function trickAmount(state, def) {
  const bonus = isKindled(state, ME, def) ? def.kindleBonus || 0 : 0;
  return (def.effect.amount || 0) + bonus;
}

function bestRemovalTarget(state, amount) {
  // The most dangerous player champion this much damage kills outright.
  let best = null;
  for (const ch of foeSide(state).board) {
    if (ch.hp <= amount && (!best || ch.atk > best.atk)) best = ch;
  }
  return best;
}

function planTrick(state, cardId, handIndex) {
  const def = CARDS[cardId];
  const eff = def.effect;
  const heart = mySide(state).heart;
  const foeHeart = foeSide(state).heart;
  const play = (target) => ({ type: 'play', handIndex, target });

  switch (eff.type) {
    case 'damage': {
      const amount = trickAmount(state, def);
      if (foeHeart <= amount) return play({ owner: 'player', heart: true });
      const kill = bestRemovalTarget(state, amount);
      if (kill) return play({ owner: 'player', uid: kill.uid });
      return null; // she holds a bolt with nothing worth burning
    }
    case 'freezeDamage': {
      const amount = trickAmount(state, def);
      const kill = bestRemovalTarget(state, amount);
      if (kill) return play({ owner: 'player', uid: kill.uid });
      // Otherwise freeze the biggest threat that would survive and swing.
      let big = null;
      for (const ch of foeSide(state).board) {
        if (!big || ch.atk > big.atk) big = ch;
      }
      if (big && big.atk >= 4) return play({ owner: 'player', uid: big.uid });
      return null;
    }
    case 'damageAllEnemyChampions': {
      const amount = trickAmount(state, def);
      const kills = foeSide(state).board.filter((ch) => ch.hp <= amount).length;
      if (kills >= 2) return play(null);
      return null;
    }
    case 'healDraw':
      if (heart <= 11) return play(null);
      return null;
    case 'buff': {
      let big = null;
      for (const ch of mySide(state).board) {
        if (!big || ch.atk + ch.hp > big.atk + big.hp) big = ch;
      }
      if (big) return play({ owner: ME, uid: big.uid });
      return null;
    }
    case 'draw':
      if (mySide(state).hand.length <= 3) return play(null);
      return null;
    case 'bounce': {
      let big = null;
      for (const ch of foeSide(state).board) {
        if (!big || CARDS[ch.cardId].cost > CARDS[big.cardId].cost) big = ch;
      }
      if (big && CARDS[big.cardId].cost >= 4) return play({ owner: 'player', uid: big.uid });
      return null;
    }
    default:
      return null;
  }
}

function planPlay(state) {
  const side = mySide(state);
  // Tricks with a good target first — they change the board most.
  for (let i = 0; i < side.hand.length; i++) {
    const def = CARDS[side.hand[i]];
    if (def.kind === 'trick' && def.cost <= side.energy) {
      const action = planTrick(state, side.hand[i], i);
      if (action) return action;
    }
  }
  // Then the most expensive champion that fits the table.
  let bestIdx = -1;
  for (let i = 0; i < side.hand.length; i++) {
    const def = CARDS[side.hand[i]];
    if (def.kind !== 'champion') continue;
    if (def.cost > side.energy) continue;
    if (side.board.length >= 5) break;
    if (bestIdx < 0 || def.cost > CARDS[side.hand[bestIdx]].cost) bestIdx = i;
  }
  if (bestIdx >= 0) return { type: 'play', handIndex: bestIdx, target: null };
  // Cheap tricks with no condition left (draw when the hand is fat is waste;
  // a leftover bolt to the face is not, late in the game).
  for (let i = 0; i < side.hand.length; i++) {
    const def = CARDS[side.hand[i]];
    if (def.kind === 'trick' && def.cost <= side.energy && def.effect.type === 'damage') {
      if (state.turn >= 5) return { type: 'play', handIndex: i, target: { owner: 'player', heart: true } };
    }
  }
  return null;
}

function planAttack(state) {
  const side = mySide(state);
  const foe = foeSide(state);
  const ready = side.board.filter((ch) => canAttack(state, ME, ch));
  if (ready.length === 0) return null;

  const guards = guardChampions(state, 'player');
  const totalAtk = ready.reduce((sum, ch) => sum + ch.atk, 0);

  for (const ch of ready) {
    if (guards.length > 0) {
      // Focus the weakest Guard with the weakest sufficient attacker is the
      // fancy play; Briar simply leads with her strongest — readable.
      const guard = guards.reduce((a, b) => (a.hp <= b.hp ? a : b));
      const lead = ready.reduce((a, b) => (a.atk >= b.atk ? a : b));
      return { type: 'attack', uid: lead.uid, target: { owner: 'player', uid: guard.uid } };
    }
    if (totalAtk >= foe.heart) {
      return { type: 'attack', uid: ch.uid, target: { owner: 'player', heart: true } };
    }
    // A clean kill on something at least as scary as the attacker.
    let prey = null;
    for (const target of foe.board) {
      if (target.hp <= ch.atk && target.atk >= ch.atk) {
        if (!prey || target.atk > prey.atk) prey = target;
      }
    }
    if (prey) return { type: 'attack', uid: ch.uid, target: { owner: 'player', uid: prey.uid } };
    // Nothing to trade with: test the Heart.
    return { type: 'attack', uid: ch.uid, target: { owner: 'player', heart: true } };
  }
  return null;
}

export function nextRivalAction(state) {
  if (state.winner || state.active !== ME) return null;
  return planPlay(state) || planAttack(state);
}

export function rivalChampionName(uid, state) {
  const ch = findChampion(state, ME, uid);
  return ch ? CARDS[ch.cardId].name : 'A champion';
}

export { hasKeyword };
