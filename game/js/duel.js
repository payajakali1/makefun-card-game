// duel.js — the Emberfall Duel rules engine. No DOM in here: the engine
// keeps the whole game state, validates every action, and appends visual
// effect notes to state.fx for the renderer to animate. The renderer and
// the rival both drive the game only through these functions.

import { CARDS, DECKLIST } from './cards.js';
import { makeRng, shuffleInPlace, makeChampionInstance, resetUidCounter } from './deck.js';

export const MAX_BOARD = 5;
export const MAX_ENERGY = 8;
export const START_HEART = 20;

export function other(who) {
  return who === 'player' ? 'rival' : 'player';
}

export function createDuel(seed) {
  resetUidCounter();
  const rng = makeRng(seed);
  const mkSide = () => ({
    heart: START_HEART,
    energy: 0,
    turnsTaken: 0,
    fatigue: 0,
    deck: shuffleInPlace([...DECKLIST], rng),
    hand: [],
    board: [],
  });
  const state = {
    rng,
    seed,
    turn: 1,
    active: 'player',
    winner: null,
    log: [],
    fx: [],
    plays: { player: 0, rival: 0 },
    sides: { player: mkSide(), rival: mkSide() },
  };
  drawCards(state, 'player', 4);
  // Going second is a real disadvantage, so Briar opens with five cards.
  drawCards(state, 'rival', 5);
  beginTurn(state, 'player', true);
  logLine(state, 'The duel begins. You take the first turn; Briar drew an extra card for going second.');
  return state;
}

export function logLine(state, text) {
  state.log.push(text);
  if (state.log.length > 40) state.log.shift();
}

export function drawCards(state, who, count) {
  const side = state.sides[who];
  for (let i = 0; i < count; i++) {
    if (side.deck.length === 0) {
      side.fatigue += 1;
      damageHeart(state, who, side.fatigue, 'fatigue');
      logLine(state, `${label(who)} is out of cards and takes ${side.fatigue} fatigue damage.`);
      if (state.winner) return;
      continue;
    }
    side.hand.push(side.deck.pop());
  }
}

export function label(who) {
  return who === 'player' ? 'You' : 'Briar';
}

export function beginTurn(state, who, isFirstTurnOfGame = false) {
  const side = state.sides[who];
  state.active = who;
  side.turnsTaken += 1;
  state.turn = side.turnsTaken;
  side.energy = Math.min(side.turnsTaken, MAX_ENERGY);
  for (const ch of side.board) {
    ch.sick = false;
    ch.attacked = false;
    // Note: frozen is NOT cleared here. A champion frozen during the
    // opponent's turn must sit out this whole turn; endTurn thaws it.
  }
  if (!isFirstTurnOfGame) drawCards(state, who, 1);
}

export function houseOnBoard(state, who, house) {
  return state.sides[who].board.some((ch) => CARDS[ch.cardId].house === house);
}

export function isKindled(state, who, def) {
  return houseOnBoard(state, who, def.house);
}

export function playableCards(state, who) {
  const side = state.sides[who];
  const out = [];
  side.hand.forEach((cardId, index) => {
    const def = CARDS[cardId];
    if (def.cost > side.energy) return;
    if (def.kind === 'champion' && side.board.length >= MAX_BOARD) return;
    out.push(index);
  });
  return out;
}

// Does this trick need a target, and of what kind?
export function trickTargetKind(def) {
  if (def.kind !== 'trick') return null;
  switch (def.effect.type) {
    case 'damage': return 'anyTarget';
    case 'freezeDamage': return 'anyChampion';
    case 'buff': return 'friendlyChampion';
    case 'bounce': return 'enemyChampion';
    default: return null;
  }
}

export function guardChampions(state, who) {
  return state.sides[who].board.filter((ch) => hasKeyword(ch, 'guard'));
}

export function hasKeyword(ch, keyword) {
  const def = CARDS[ch.cardId];
  return def.keyword === keyword || def.keyword2 === keyword;
}

export function findChampion(state, who, uid) {
  return state.sides[who].board.find((ch) => ch.uid === uid) || null;
}

// Play a card from hand. target: null, or { owner, uid } for a champion, or
// { owner, heart: true } for a duelist's Heart. Returns true when legal.
export function playCard(state, who, handIndex, target = null) {
  if (state.winner || state.active !== who) return false;
  const side = state.sides[who];
  const foe = state.sides[other(who)];
  const cardId = side.hand[handIndex];
  if (!cardId) return false;
  const def = CARDS[cardId];
  if (def.cost > side.energy) return false;
  const kindled = isKindled(state, who, def);

  if (def.kind === 'champion') {
    if (side.board.length >= MAX_BOARD) return false;
    side.hand.splice(handIndex, 1);
    side.energy -= def.cost;
    const ch = makeChampionInstance(cardId, def);
    if (kindled) { ch.atk += 1; ch.hp += 1; ch.maxHp += 1; }
    side.board.push(ch);
    state.plays[who] += 1;
    state.fx.push({ type: 'summon', owner: who, uid: ch.uid, kindled });
    logLine(state, `${label(who)} played ${def.name}${kindled ? ' (Kindled +1/+1)' : ''}.`);
    return true;
  }

  // Tricks: validate the target before paying anything.
  const need = trickTargetKind(def);
  if (need && !target) return false;
  let targetChamp = null;
  let targetOwner = null;
  if (target && target.uid != null) {
    targetOwner = target.owner;
    targetChamp = findChampion(state, targetOwner, target.uid);
    if (!targetChamp) return false;
  }
  if (need === 'friendlyChampion' && targetOwner !== who) return false;
  if (need === 'enemyChampion' && targetOwner === who) return false;
  if (need === 'anyTarget' && !target) return false;

  side.hand.splice(handIndex, 1);
  side.energy -= def.cost;
  const bonus = kindled ? def.kindleBonus || 0 : 0;
  const eff = def.effect;
  const foeWho = other(who);

  switch (eff.type) {
    case 'damage': {
      const amount = eff.amount + bonus;
      if (target.heart) damageHeart(state, target.owner, amount, 'trick');
      else damageChampion(state, targetOwner, targetChamp, amount, who);
      break;
    }
    case 'damageAllEnemyChampions': {
      const amount = eff.amount + bonus;
      for (const ch of [...foe.board]) damageChampion(state, foeWho, ch, amount, who);
      break;
    }
    case 'healDraw': {
      healHeart(state, who, eff.amount + bonus);
      drawCards(state, who, eff.draw);
      break;
    }
    case 'freezeDamage': {
      damageChampion(state, targetOwner, targetChamp, eff.amount + bonus, who);
      if (targetChamp.hp > 0) {
        targetChamp.frozen = true;
        state.fx.push({ type: 'freeze', owner: targetOwner, uid: targetChamp.uid });
      }
      break;
    }
    case 'buff': {
      targetChamp.atk += eff.atk + bonus;
      targetChamp.hp += eff.hp + bonus;
      targetChamp.maxHp += eff.hp + bonus;
      state.fx.push({ type: 'buff', owner: who, uid: targetChamp.uid });
      break;
    }
    case 'draw': {
      drawCards(state, who, eff.amount + bonus);
      break;
    }
    case 'bounce': {
      const idx = foe.board.indexOf(targetChamp);
      if (idx >= 0) {
        foe.board.splice(idx, 1);
        foe.hand.push(targetChamp.cardId);
        state.fx.push({ type: 'bounce', owner: foeWho, uid: targetChamp.uid });
      }
      break;
    }
    default:
      return false;
  }
  state.plays[who] += 1;
  logLine(state, `${label(who)} played ${def.name}${kindled && bonus ? ' (Kindled)' : ''}.`);
  sweepDeaths(state);
  checkWinner(state);
  return true;
}

export function canAttack(state, who, ch) {
  return (
    !state.winner &&
    state.active === who &&
    !ch.sick &&
    !ch.frozen &&
    !ch.attacked &&
    ch.atk > 0
  );
}

// Attack with a champion. target: { owner, uid } or { owner, heart: true }.
export function attack(state, who, attackerUid, target) {
  if (state.winner || state.active !== who) return false;
  const side = state.sides[who];
  const foeWho = other(who);
  const foe = state.sides[foeWho];
  const attacker = findChampion(state, who, attackerUid);
  if (!attacker || !canAttack(state, who, attacker)) return false;

  const guards = guardChampions(state, foeWho);
  let defender = null;
  if (target.heart) {
    if (guards.length > 0) return false;
  } else {
    defender = findChampion(state, foeWho, target.uid);
    if (!defender) return false;
    if (guards.length > 0 && !hasKeyword(defender, 'guard')) return false;
  }

  attacker.attacked = true;
  state.fx.push({ type: 'lunge', owner: who, uid: attacker.uid });

  if (defender) {
    damageChampion(state, foeWho, defender, attacker.atk, who, attacker);
    // The defender strikes back only if it still stands; a defender killed
    // by the blow does not answer (keeps trades readable).
    if (defender.hp > 0) damageChampion(state, who, attacker, defender.atk, foeWho, defender);
    if (hasKeyword(defender, 'thorns') && attacker.hp > 0) {
      damageChampion(state, who, attacker, 1, foeWho, defender);
    }
    logLine(state, `${CARDS[attacker.cardId].name} struck ${CARDS[defender.cardId].name}.`);
  } else {
    damageHeart(state, foeWho, attacker.atk, 'attack');
    if (hasKeyword(attacker, 'drain')) healHeart(state, who, attacker.atk);
    logLine(state, `${CARDS[attacker.cardId].name} hit ${label(foeWho)}’s Heart for ${attacker.atk}.`);
  }

  sweepDeaths(state);
  checkWinner(state);
  return true;
}

export function damageChampion(state, owner, ch, amount, sourceWho, sourceChamp = null) {
  ch.hp -= amount;
  state.fx.push({ type: 'damage', owner, uid: ch.uid, amount });
  if (sourceChamp && hasKeyword(sourceChamp, 'drain')) {
    healHeart(state, sourceWho, amount);
  }
}

export function damageHeart(state, who, amount, _cause) {
  state.sides[who].heart -= amount;
  state.fx.push({ type: 'heartDamage', owner: who, amount });
}

export function healHeart(state, who, amount) {
  const side = state.sides[who];
  const healed = Math.min(amount, START_HEART - side.heart);
  side.heart += healed;
  if (healed > 0) state.fx.push({ type: 'heal', owner: who, amount: healed });
}

export function sweepDeaths(state) {
  for (const who of ['player', 'rival']) {
    const side = state.sides[who];
    const dead = side.board.filter((ch) => ch.hp <= 0);
    for (const ch of dead) {
      state.fx.push({ type: 'death', owner: who, uid: ch.uid });
      logLine(state, `${CARDS[ch.cardId].name} fell.`);
    }
    side.board = side.board.filter((ch) => ch.hp > 0);
  }
}

export function checkWinner(state) {
  const p = state.sides.player.heart;
  const r = state.sides.rival.heart;
  if (r <= 0 && p > 0) state.winner = 'player';
  else if (p <= 0 && r > 0) state.winner = 'rival';
  else if (p <= 0 && r <= 0) state.winner = 'player'; // a mutual fall goes to the challenger
}

export function endTurn(state, who) {
  if (state.winner || state.active !== who) return false;
  // Freeze lasts exactly one of the frozen champion's turns: it thaws as
  // that turn ends, having been unable to attack throughout it.
  for (const ch of state.sides[who].board) ch.frozen = false;
  beginTurn(state, other(who));
  return true;
}
