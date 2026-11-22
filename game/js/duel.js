// duel.js — the Emberfall Duel rules engine. No DOM, no rendering: this
// file only knows cards, hearts, energy and whose turn it is, so the same
// code can be driven by the browser table, by Vesper the rival, or by a
// headless balance harness.
//
// Shape of a duel:
//   state.sides.player / state.sides.rival — { heart, energy, maxEnergy,
//     deck: [cardId], hand: [cardId], board: [champion], fatigue }
//   champion — { uid, id, atk, hp, maxHp, sick, spent, rooted, holdFast,
//     kindled }
//   state.active — whose turn it is; state.winner — null, 'player',
//     'rival' or 'draw' once a Heart reaches 0.
// Every mutating call returns a list of event objects ({type, ...}) that
// the table uses for floaters and sounds; the engine itself stays silent.

import { CARDS, DECKLIST } from './cards.js';
import { makeRng, buildDeck } from './deck.js';

export const MAX_HEART = 20;
export const BOARD_MAX = 5;
export const HAND_MAX = 9;
export const ENERGY_MAX = 8;

export const otherSide = (side) => (side === 'player' ? 'rival' : 'player');

function freshSide(deck) {
  return {
    heart: MAX_HEART, energy: 0, maxEnergy: 0,
    deck, hand: [], board: [], fatigue: 0,
  };
}

// A new duel: both duelists carry the same 32-card deck, shuffled from
// the seed. The player opens with four cards; the rival, who answers
// second, opens with five.
export function newDuel(seed) {
  const rng = makeRng(seed);
  const state = {
    rng,
    seed,
    active: 'player',
    winner: null,
    round: 1,
    nextUid: 1,
    housesPlayed: { player: {}, rival: {} },
    felled: { player: 0, rival: 0 },
    sides: {
      player: freshSide(buildDeck(DECKLIST, rng)),
      rival: freshSide(buildDeck(DECKLIST, rng)),
    },
  };
  drawCards(state, 'player', 4, []);
  drawCards(state, 'rival', 5, []);
  return state;
}

// Draw n cards. An empty deck bites: the draw becomes fatigue damage
// that grows by 1 every time. A full hand burns the card instead.
export function drawCards(state, sideKey, n, events) {
  const side = state.sides[sideKey];
  for (let i = 0; i < n; i++) {
    if (state.winner) return;
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.heart -= side.fatigue;
      events.push({ type: 'fatigue', side: sideKey, amount: side.fatigue });
      settleWinner(state, events);
    } else if (side.hand.length >= HAND_MAX) {
      const burned = side.deck.pop();
      events.push({ type: 'burn', side: sideKey, cardId: burned });
    } else {
      side.hand.push(side.deck.pop());
      events.push({ type: 'draw', side: sideKey });
    }
  }
}

function settleWinner(state, events) {
  if (state.winner) return;
  const p = state.sides.player.heart;
  const r = state.sides.rival.heart;
  if (p <= 0 && r <= 0) state.winner = 'draw';
  else if (r <= 0) state.winner = 'player';
  else if (p <= 0) state.winner = 'rival';
  if (state.winner) events.push({ type: 'gameover', winner: state.winner });
}

// Begin the active side's turn: energy grows and refills, last turn's
// champions wake, rooted champions stay tangled for this one turn, and
// a card is drawn.
export function startTurn(state) {
  const events = [];
  const sideKey = state.active;
  const side = state.sides[sideKey];
  side.maxEnergy = Math.min(ENERGY_MAX, side.maxEnergy + 1);
  side.energy = side.maxEnergy;
  state.housesPlayed[sideKey] = {};
  for (const champ of side.board) {
    champ.sick = false;
    champ.spent = false;
    champ.holdFast = champ.rooted;
    champ.rooted = false;
  }
  events.push({ type: 'turn', side: sideKey, round: state.round });
  drawCards(state, sideKey, 1, events);
  return events;
}

export function endTurn(state) {
  if (state.winner) return [];
  state.active = otherSide(state.active);
  if (state.active === 'player') state.round += 1;
  return startTurn(state);
}

export function championByUid(state, sideKey, uid) {
  return state.sides[sideKey].board.find((c) => c.uid === uid) || null;
}

function hasKeyword(champ, word) {
  const def = CARDS[champ.id];
  return def.keyword === word || def.keyword2 === word;
}

// Is this card playable right now, and if so, is it Kindled, and what
// may it target? targetMode: null (no choice), 'anything', 'enemyChamp',
// 'friendChamp'.
export function cardPlayInfo(state, sideKey, handIndex) {
  const side = state.sides[sideKey];
  const cardId = side.hand[handIndex];
  if (!cardId || state.winner || state.active !== sideKey) return null;
  const def = CARDS[cardId];
  if (def.cost > side.energy) return null;
  const kindled = (state.housesPlayed[sideKey][def.house] || 0) > 0;
  if (def.kind === 'champion') {
    if (side.board.length >= BOARD_MAX) return null;
    return { cardId, def, kindled, targetMode: null };
  }
  switch (def.effect.type) {
    case 'damage': return { cardId, def, kindled, targetMode: 'anything' };
    case 'bounce':
    case 'rootDamage': {
      if (state.sides[otherSide(sideKey)].board.length === 0) return null;
      return { cardId, def, kindled, targetMode: 'enemyChamp' };
    }
    case 'buff': {
      if (side.board.length === 0) return null;
      return { cardId, def, kindled, targetMode: 'friendChamp' };
    }
    default: return { cardId, def, kindled, targetMode: null };
  }
}

export function playableCards(state, sideKey) {
  const out = [];
  state.sides[sideKey].hand.forEach((_, i) => {
    const info = cardPlayInfo(state, sideKey, i);
    if (info) out.push({ handIndex: i, ...info });
  });
  return out;
}

// Damage a champion; if the blow came from a Drain champion, its keeper
// mends by the damage dealt. Deaths are swept by the caller.
function strikeChampion(state, events, ownerKey, champ, amount, attackerChamp, attackerKey) {
  champ.hp -= amount;
  events.push({ type: 'championHurt', side: ownerKey, uid: champ.uid, amount });
  if (attackerChamp && hasKeyword(attackerChamp, 'drain')) {
    mendHeart(state, events, attackerKey, amount);
  }
}

function mendHeart(state, events, sideKey, amount) {
  const side = state.sides[sideKey];
  const healed = Math.min(MAX_HEART, side.heart + amount) - side.heart;
  if (healed > 0) {
    side.heart += healed;
    events.push({ type: 'heal', side: sideKey, amount: healed });
  }
}

function hurtHeart(state, events, sideKey, amount, attackerChamp, attackerKey) {
  state.sides[sideKey].heart -= amount;
  events.push({ type: 'heartHurt', side: sideKey, amount });
  if (attackerChamp && hasKeyword(attackerChamp, 'drain')) {
    mendHeart(state, events, attackerKey, amount);
  }
  settleWinner(state, events);
}

// Remove the dead from both boards, counting the fallen for the end panel.
function sweepDeaths(state, events) {
  for (const sideKey of ['player', 'rival']) {
    const side = state.sides[sideKey];
    const dead = side.board.filter((c) => c.hp <= 0);
    if (dead.length) {
      side.board = side.board.filter((c) => c.hp > 0);
      for (const champ of dead) {
        state.felled[otherSide(sideKey)] += 1;
        events.push({ type: 'death', side: sideKey, uid: champ.uid, cardId: champ.id });
      }
    }
  }
}

// Play the card at handIndex. target, when the card needs one:
//   { kind: 'heart', side } or { kind: 'champion', side, uid }
export function playCard(state, sideKey, handIndex, target) {
  const info = cardPlayInfo(state, sideKey, handIndex);
  if (!info) return { ok: false, reason: 'not playable', events: [] };
  const events = [];
  const side = state.sides[sideKey];
  const foeKey = otherSide(sideKey);
  const { def, kindled } = info;
  const bonus = kindled ? def.kindleBonus || 0 : 0;

  side.energy -= def.cost;
  side.hand.splice(handIndex, 1);
  state.housesPlayed[sideKey][def.house] = (state.housesPlayed[sideKey][def.house] || 0) + 1;
  events.push({ type: 'play', side: sideKey, cardId: info.cardId, kindled });

  if (def.kind === 'champion') {
    const champ = {
      uid: state.nextUid++,
      id: info.cardId,
      atk: def.atk + (kindled ? 1 : 0),
      hp: def.hp + (kindled ? 1 : 0),
      maxHp: def.hp + (kindled ? 1 : 0),
      sick: def.keyword !== 'swift',
      spent: false,
      rooted: false,
      holdFast: false,
      kindled,
    };
    side.board.push(champ);
    events.push({ type: 'summon', side: sideKey, uid: champ.uid, cardId: champ.id, kindled });
  } else {
    resolveTrick(state, events, sideKey, foeKey, def, bonus, target);
  }
  sweepDeaths(state, events);
  settleWinner(state, events);
  return { ok: true, events };
}

function resolveTrick(state, events, sideKey, foeKey, def, bonus, target) {
  const foe = state.sides[foeKey];
  const e = def.effect;
  switch (e.type) {
    case 'damage': {
      const amount = e.amount + bonus;
      if (target && target.kind === 'heart') {
        hurtHeart(state, events, target.side, amount, null, sideKey);
      } else if (target && target.kind === 'champion') {
        const champ = championByUid(state, target.side, target.uid);
        if (champ) strikeChampion(state, events, target.side, champ, amount, null, sideKey);
      }
      break;
    }
    case 'damageAllEnemyChampions': {
      const amount = e.amount + bonus;
      for (const champ of foe.board.slice()) {
        strikeChampion(state, events, foeKey, champ, amount, null, sideKey);
      }
      break;
    }
    case 'healDraw': {
      mendHeart(state, events, sideKey, e.amount + bonus);
      drawCards(state, sideKey, e.draw || 0, events);
      break;
    }
    case 'bounce': {
      const champ = target && championByUid(state, foeKey, target.uid);
      if (champ) {
        foe.board = foe.board.filter((c) => c.uid !== champ.uid);
        if (foe.hand.length < HAND_MAX) foe.hand.push(champ.id);
        events.push({ type: 'bounce', side: foeKey, uid: champ.uid, cardId: champ.id });
      }
      break;
    }
    case 'buff': {
      const champ = target && championByUid(state, sideKey, target.uid);
      if (champ) {
        champ.atk += e.atk + bonus;
        champ.hp += e.hp + bonus;
        champ.maxHp += e.hp + bonus;
        events.push({ type: 'buff', side: sideKey, uid: champ.uid });
      }
      break;
    }
    case 'rootDamage': {
      const champ = target && championByUid(state, foeKey, target.uid);
      if (champ) {
        strikeChampion(state, events, foeKey, champ, e.amount + bonus, null, sideKey);
        if (champ.hp > 0) {
          champ.rooted = true;
          events.push({ type: 'root', side: foeKey, uid: champ.uid });
        }
      }
      break;
    }
    case 'sap': {
      const amount = e.amount + bonus;
      hurtHeart(state, events, foeKey, amount, null, sideKey);
      mendHeart(state, events, sideKey, amount);
      break;
    }
    default: break;
  }
}

// Which targets may this champion attack? Guards narrow the choice:
// while any enemy Guard stands, only Guards may be attacked.
export function attackTargets(state, sideKey, uid) {
  const foe = state.sides[otherSide(sideKey)];
  const guards = foe.board.filter((c) => hasKeyword(c, 'guard'));
  if (guards.length) {
    return guards.map((c) => ({ kind: 'champion', side: otherSide(sideKey), uid: c.uid }));
  }
  return [
    { kind: 'heart', side: otherSide(sideKey) },
    ...foe.board.map((c) => ({ kind: 'champion', side: otherSide(sideKey), uid: c.uid })),
  ];
}

export function canAttack(state, sideKey, uid) {
  if (state.winner || state.active !== sideKey) return false;
  const champ = championByUid(state, sideKey, uid);
  return !!champ && !champ.sick && !champ.spent && !champ.holdFast;
}

// One champion attacks one target. The defender strikes back only if it
// survives the blow; a Thorns defender stings the attacker for 1 more.
export function attack(state, sideKey, uid, target) {
  if (!canAttack(state, sideKey, uid)) return { ok: false, reason: 'cannot attack', events: [] };
  const legal = attackTargets(state, sideKey, uid);
  const isLegal = legal.some((t) => t.kind === target.kind && t.side === target.side && t.uid === target.uid);
  if (!isLegal) return { ok: false, reason: 'illegal target', events: [] };
  const events = [];
  const foeKey = otherSide(sideKey);
  const attacker = championByUid(state, sideKey, uid);
  attacker.spent = true;
  events.push({ type: 'attack', side: sideKey, uid, target });

  if (target.kind === 'heart') {
    hurtHeart(state, events, foeKey, attacker.atk, attacker, sideKey);
  } else {
    const defender = championByUid(state, foeKey, target.uid);
    strikeChampion(state, events, foeKey, defender, attacker.atk, attacker, sideKey);
    if (defender.hp > 0) {
      strikeChampion(state, events, sideKey, attacker, defender.atk, defender, foeKey);
      if (hasKeyword(defender, 'thorns') && attacker.hp > 0) {
        strikeChampion(state, events, sideKey, attacker, 1, null, foeKey);
      }
    }
  }
  sweepDeaths(state, events);
  settleWinner(state, events);
  return { ok: true, events };
}
