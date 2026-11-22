// deck.js — seeded randomness and deck building.
//
// One small mulberry32 generator drives every shuffle and coin-flip in a
// duel, so a game begun with ?seed=N deals the same cards in the same
// order every time. That is what makes the screenshot tables honest:
// they are ordinary games, just dealt from a known seed.

export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher–Yates, driven by the duel's own generator.
export function shuffled(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

// A fresh deck is the shared decklist shuffled; the top of the deck is
// the END of the array, so drawing is a pop().
export function buildDeck(decklist, rng) {
  return shuffled(decklist, rng);
}
