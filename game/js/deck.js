// deck.js — seeded randomness and deck handling.
//
// A duel is driven by one seeded generator (mulberry32), so a game started
// with ?seed=N plays out identically every time — the screenshot states and
// the automated playtests rely on that.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  }
  return list;
}

let nextUid = 1;

export function makeChampionInstance(cardId, def) {
  return {
    uid: nextUid++,
    cardId,
    atk: def.atk,
    hp: def.hp,
    maxHp: def.hp,
    sick: def.keyword !== 'swift',
    frozen: false,
    attacked: false,
  };
}

export function resetUidCounter() {
  nextUid = 1;
}
