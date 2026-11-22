// ai.js — Vesper, the Gloom Herald, plays the rival's side.
//
// She is deliberately readable: no hidden information (she never peeks at
// the player's hand or either deck's order), no dice — the same table
// always earns the same answer from her. Her habits, in order:
//   1. If a Trick finishes the player's Heart this turn, she casts it.
//   2. She builds her board, cheap House-mates first so the second card
//      of a House lands Kindled, the way the game teaches the player to.
//   3. She spends removal on champions she can kill cleanly, bounces the
//      expensive ones, and roots the ones she cannot kill.
//   4. She mends when her Heart is low and her hand is thin.
//   5. Her champions trade up when a trade is free, clear Guards when
//      they block a kill, and otherwise go for the Heart — face damage
//      never strikes back.
// nextAction returns ONE action at a time so the table can animate each
// step; call it again after applying the action until it says 'end'.

import { CARDS } from './cards.js';
import {
  otherSide, playableCards, attackTargets, canAttack, championByUid,
} from './duel.js';

function foeBoard(state, sideKey) {
  return state.sides[otherSide(sideKey)].board;
}

function bodyValue(champ) {
  return champ.atk + champ.hp;
}

// Score every card she could play; return the best play above the
// "worth doing" line, or null to move on to attacks.
function choosePlay(state, sideKey) {
  const me = state.sides[sideKey];
  const foe = state.sides[otherSide(sideKey)];
  let best = null;
  const consider = (score, play) => {
    if (!best || score > best.score) best = { score, play };
  };

  for (const cand of playableCards(state, sideKey)) {
    const { def, kindled } = cand;
    const idx = cand.handIndex;
    if (def.kind === 'champion') {
      let score = def.atk + def.hp + (kindled ? 3 : 0) - def.cost * 0.25;
      // Setting up a Kindle: a cheap House-mate is worth more when a
      // bigger card of its House is waiting behind it.
      if (!kindled) {
        const setsUp = me.hand.some((id, j) => {
          if (j === idx) return false;
          const other = CARDS[id];
          return other.house === def.house && other.cost > def.cost && other.cost <= me.energy - def.cost + 1;
        });
        if (setsUp) score += 1.5;
      }
      consider(score, { type: 'play', handIndex: idx, target: null });
      continue;
    }
    const amount = (def.effect.amount || 0) + (kindled ? def.kindleBonus || 0 : 0);
    switch (def.effect.type) {
      case 'damage': {
        if (foe.heart <= amount) { consider(100, { type: 'play', handIndex: idx, target: { kind: 'heart', side: otherSide(sideKey) } }); break; }
        const killable = foeBoard(state, sideKey)
          .filter((c) => c.hp <= amount)
          .sort((a, b) => bodyValue(b) - bodyValue(a))[0];
        if (killable) {
          consider(4 + bodyValue(killable) * 0.6, { type: 'play', handIndex: idx, target: { kind: 'champion', side: otherSide(sideKey), uid: killable.uid } });
        }
        break;
      }
      case 'damageAllEnemyChampions': {
        const kills = foeBoard(state, sideKey).filter((c) => c.hp <= amount).length;
        const boardAtk = foeBoard(state, sideKey).reduce((s, c) => s + c.atk, 0);
        if (kills >= 2 || (kills === 1 && boardAtk >= 7)) consider(8 + kills, { type: 'play', handIndex: idx, target: null });
        break;
      }
      case 'healDraw': {
        if (me.heart <= 10) consider(6, { type: 'play', handIndex: idx, target: null });
        else if (me.hand.length <= 2) consider(3, { type: 'play', handIndex: idx, target: null });
        break;
      }
      case 'bounce': {
        const biggest = foeBoard(state, sideKey).slice().sort((a, b) => CARDS[b.id].cost - CARDS[a.id].cost)[0];
        if (biggest && CARDS[biggest.id].cost >= 4) {
          consider(5 + CARDS[biggest.id].cost * 0.3, { type: 'play', handIndex: idx, target: { kind: 'champion', side: otherSide(sideKey), uid: biggest.uid } });
        }
        break;
      }
      case 'buff': {
        const mine = me.board.slice().sort((a, b) => b.atk - a.atk)[0];
        if (mine && mine.atk >= 3) consider(3.5, { type: 'play', handIndex: idx, target: { kind: 'champion', side: sideKey, uid: mine.uid } });
        break;
      }
      case 'rootDamage': {
        const killable = foeBoard(state, sideKey).filter((c) => c.hp <= amount).sort((a, b) => bodyValue(b) - bodyValue(a))[0];
        if (killable) { consider(4.5 + bodyValue(killable) * 0.5, { type: 'play', handIndex: idx, target: { kind: 'champion', side: otherSide(sideKey), uid: killable.uid } }); break; }
        const threat = foeBoard(state, sideKey).filter((c) => c.atk >= 4).sort((a, b) => b.atk - a.atk)[0];
        if (threat) consider(4, { type: 'play', handIndex: idx, target: { kind: 'champion', side: otherSide(sideKey), uid: threat.uid } });
        break;
      }
      case 'sap': {
        if (foe.heart <= amount) consider(100, { type: 'play', handIndex: idx, target: null });
        else if (me.heart <= 12) consider(4, { type: 'play', handIndex: idx, target: null });
        else consider(1.2, { type: 'play', handIndex: idx, target: null });
        break;
      }
      default: break;
    }
  }
  return best && best.score >= 2.5 ? best.play : null;
}

// Score the best attack among her ready champions, or null if none of
// them may attack at all.
function chooseAttack(state, sideKey) {
  const foeKey = otherSide(sideKey);
  const foe = state.sides[foeKey];
  const ready = state.sides[sideKey].board.filter((c) => canAttack(state, sideKey, c.uid));
  if (!ready.length) return null;

  const guardsUp = foe.board.some((c) => CARDS[c.id].keyword === 'guard' || CARDS[c.id].keyword2 === 'guard');
  const readyAtk = ready.reduce((s, c) => s + c.atk, 0);
  let best = null;
  const consider = (score, action) => {
    if (!best || score > best.score) best = { score, action };
  };

  for (const champ of ready) {
    for (const target of attackTargets(state, sideKey, champ.uid)) {
      if (target.kind === 'heart') {
        // Lethal, or free pressure: face damage never strikes back.
        consider(readyAtk >= foe.heart ? 90 : 2 + champ.atk, { type: 'attack', uid: champ.uid, target });
        continue;
      }
      const defender = championByUid(state, foeKey, target.uid);
      if (!defender) continue;
      const kills = defender.hp <= champ.atk;
      const backswing = kills ? 0 : defender.atk + ((CARDS[defender.id].keyword === 'thorns' || CARDS[defender.id].keyword2 === 'thorns') ? 1 : 0);
      const survives = champ.hp > backswing;
      const isGuard = CARDS[defender.id].keyword === 'guard' || CARDS[defender.id].keyword2 === 'guard';
      if (kills && survives) consider(6 + bodyValue(defender) * 0.7, { type: 'attack', uid: champ.uid, target });
      else if (kills && isGuard && guardsUp) consider(4.5, { type: 'attack', uid: champ.uid, target });
      else if (kills && defender.atk >= 5) consider(4, { type: 'attack', uid: champ.uid, target });
      else if (!kills && defender.atk >= 6 && champ.atk >= 3) consider(2.6, { type: 'attack', uid: champ.uid, target });
    }
  }
  return best ? best.action : null;
}

export function nextAction(state, sideKey) {
  if (state.winner || state.active !== sideKey) return { type: 'end' };
  const play = choosePlay(state, sideKey);
  if (play) return play;
  const atk = chooseAttack(state, sideKey);
  if (atk) return atk;
  // Nothing scored — but a champion in hand still beats an empty table.
  const anyChamp = playableCards(state, sideKey).find((c) => c.def.kind === 'champion');
  if (anyChamp) return { type: 'play', handIndex: anyChamp.handIndex, target: null };
  const anyAttack = chooseAttack(state, sideKey);
  if (anyAttack) return anyAttack;
  return { type: 'end' };
}
