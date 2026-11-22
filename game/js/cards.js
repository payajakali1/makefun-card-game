// cards.js — the Emberfall Duel catalogue: four Houses, twenty-three cards.
//
// A House is known by its colour AND its shape — triangle, circle, cross,
// diamond — so two Houses are never told apart by words alone. Champions
// stay on the table and fight for you; Tricks fire once and are gone.
//
// The keywords:
//   Swift  — no summoning sickness; it may attack the turn it arrives.
//   Guard  — the enemy must spend their attacks on Guards before anything
//            else on that side of the table.
//   Thorns — whatever strikes this champion takes 1 damage back.
//   Drain  — when this champion deals damage, its keeper's Heart mends
//            by the same amount.
//   Rooted — not a printed keyword: Tangling Vines roots a champion so it
//            cannot attack on its keeper's next turn.
//
// KINDLE, the heart of the game: the second card you play in a turn from a
// House you have already played that turn is Kindled. A Kindled champion
// walks in with +1/+1; a Kindled Trick does the bigger thing its text
// promises. So a turn is a small puzzle: spend your cards in House order
// and the second one always lands harder.

export const HOUSES = {
  ember: { name: 'Ember', glyph: '▲', colour: '#e85d1f', deep: '#6e2405' },
  tide: { name: 'Tide', glyph: '●', colour: '#2e8de0', deep: '#0f3a63' },
  thorn: { name: 'Thorn', glyph: '✚', colour: '#3fa34d', deep: '#17451f' },
  gloom: { name: 'Gloom', glyph: '◆', colour: '#8b5cc7', deep: '#38204f' },
};

export const CARDS = {
  // ——— Ember: fast, hot, and first to the throat ———
  emberSprite: {
    name: 'Ember Sprite', house: 'ember', kind: 'champion', cost: 1, atk: 2, hp: 1,
    motif: 'spark', text: 'A coal that learned to grin.',
  },
  cinderHound: {
    name: 'Cinder Hound', house: 'ember', kind: 'champion', cost: 2, atk: 3, hp: 2,
    keyword: 'swift', motif: 'fang', text: 'Swift. The ash has not settled before it bites.',
  },
  forgeSentinel: {
    name: 'Forge Sentinel', house: 'ember', kind: 'champion', cost: 4, atk: 3, hp: 6,
    keyword: 'guard', motif: 'anvil', text: 'Guard. It holds the gate and hums with heat.',
  },
  infernoDrake: {
    name: 'Inferno Drake', house: 'ember', kind: 'champion', cost: 6, atk: 6, hp: 5,
    motif: 'wing', text: 'Emberfall burns a little brighter when it hunts.',
  },
  flameLance: {
    name: 'Flame Lance', house: 'ember', kind: 'trick', cost: 1,
    motif: 'bolt', effect: { type: 'damage', amount: 2 }, kindleBonus: 1,
    text: 'Deal 2 damage to anything. Kindled: 3 instead.',
  },
  conflagration: {
    name: 'Conflagration', house: 'ember', kind: 'trick', cost: 5,
    motif: 'flame', effect: { type: 'damageAllEnemyChampions', amount: 3 }, kindleBonus: 1,
    text: 'Deal 3 damage to every enemy champion. Kindled: 4 instead.',
  },
  // ——— Tide: patient water, sudden depths ———
  brookNymph: {
    name: 'Brook Nymph', house: 'tide', kind: 'champion', cost: 1, atk: 1, hp: 3,
    motif: 'drop', text: 'She counts the rain and keeps the change.',
  },
  mistRanger: {
    name: 'Mist Ranger', house: 'tide', kind: 'champion', cost: 2, atk: 2, hp: 3,
    motif: 'bow', text: 'The arrow arrives before the fog does.',
  },
  coralBulwark: {
    name: 'Coral Bulwark', house: 'tide', kind: 'champion', cost: 3, atk: 2, hp: 5,
    keyword: 'guard', motif: 'shell', text: 'Guard. A reef that decided to stand up.',
  },
  abyssalLeviathan: {
    name: 'Abyssal Leviathan', house: 'tide', kind: 'champion', cost: 7, atk: 7, hp: 7,
    motif: 'wave', text: 'Sailors pray to it by not naming it.',
  },
  mendingRain: {
    name: 'Mending Rain', house: 'tide', kind: 'trick', cost: 2,
    motif: 'drop', effect: { type: 'healDraw', amount: 5, draw: 1 }, kindleBonus: 2,
    text: 'Mend 5 Heart and draw a card. Kindled: mend 7 instead.',
  },
  riptide: {
    name: 'Riptide', house: 'tide', kind: 'trick', cost: 3,
    motif: 'wave', effect: { type: 'bounce' }, kindleBonus: 0,
    text: 'Sweep an enemy champion back into its keeper’s hand.',
  },
  // ——— Thorn: the green that pushes back ———
  sproutling: {
    name: 'Sproutling', house: 'thorn', kind: 'champion', cost: 1, atk: 1, hp: 2,
    keyword: 'thorns', motif: 'sprout', text: 'Thorns. Pet it and learn.',
  },
  briarWolf: {
    name: 'Briar Wolf', house: 'thorn', kind: 'champion', cost: 3, atk: 4, hp: 3,
    motif: 'fang', text: 'The hedge has teeth after dark.',
  },
  ancientTreant: {
    name: 'Ancient Treant', house: 'thorn', kind: 'champion', cost: 5, atk: 4, hp: 8,
    keyword: 'guard', keyword2: 'thorns', motif: 'root',
    text: 'Guard, Thorns. It remembers when this was all forest.',
  },
  thornQueen: {
    name: 'Thorn Queen', house: 'thorn', kind: 'champion', cost: 6, atk: 5, hp: 6,
    keyword: 'thorns', motif: 'bloom', text: 'Thorns. Every bramble in the vale kneels to her.',
  },
  overgrowth: {
    name: 'Overgrowth', house: 'thorn', kind: 'trick', cost: 2,
    motif: 'bloom', effect: { type: 'buff', atk: 2, hp: 2 }, kindleBonus: 1,
    text: 'A friendly champion grows +2/+2. Kindled: +3/+3 instead.',
  },
  tanglingVines: {
    name: 'Tangling Vines', house: 'thorn', kind: 'trick', cost: 2,
    motif: 'root', effect: { type: 'rootDamage', amount: 2 }, kindleBonus: 1,
    text: 'Deal 2 damage to an enemy champion and Root it. Kindled: 3 instead.',
  },
  // ——— Gloom: what the dark lends, it collects ———
  gloomWisp: {
    name: 'Gloom Wisp', house: 'gloom', kind: 'champion', cost: 1, atk: 1, hp: 2,
    motif: 'orb', text: 'A lantern with no one carrying it.',
  },
  nightStalker: {
    name: 'Night Stalker', house: 'gloom', kind: 'champion', cost: 3, atk: 3, hp: 3,
    keyword: 'drain', motif: 'eye', text: 'Drain. It drinks the warmth out of a room.',
  },
  cryptHorror: {
    name: 'Crypt Horror', house: 'gloom', kind: 'champion', cost: 4, atk: 5, hp: 4,
    motif: 'fang', text: 'The tomb was locked from the inside.',
  },
  dreadSphinx: {
    name: 'Dread Sphinx', house: 'gloom', kind: 'champion', cost: 6, atk: 4, hp: 6,
    keyword: 'drain', motif: 'eye', text: 'Drain. Answer her riddle or feed it.',
  },
  soulSap: {
    name: 'Soul Sap', house: 'gloom', kind: 'trick', cost: 2,
    motif: 'orb', effect: { type: 'sap', amount: 2 }, kindleBonus: 1,
    text: 'Deal 2 damage to the enemy Heart and mend yours by 2. Kindled: 3 and 3.',
  },
};

// The 32-card deck both duelists carry. Small cards come in pairs so the
// opening turns always have a play; the great beasts and the wildfire
// are single, precious copies.
export const DECKLIST = [
  'emberSprite', 'emberSprite', 'brookNymph', 'brookNymph',
  'sproutling', 'sproutling', 'gloomWisp', 'gloomWisp',
  'cinderHound', 'cinderHound', 'mistRanger', 'mistRanger',
  'flameLance', 'flameLance', 'nightStalker', 'nightStalker',
  'coralBulwark', 'briarWolf', 'cryptHorror',
  'overgrowth', 'tanglingVines', 'riptide', 'mendingRain', 'soulSap',
  'forgeSentinel', 'forgeSentinel', 'ancientTreant', 'conflagration',
  'infernoDrake', 'thornQueen', 'dreadSphinx', 'abyssalLeviathan',
];

export const KEYWORD_HELP = {
  swift: 'Swift — may attack the turn it is played.',
  guard: 'Guard — enemies must attack this champion before other targets.',
  thorns: 'Thorns — attackers take 1 damage back.',
  drain: 'Drain — damage it deals also mends its keeper’s Heart.',
};
