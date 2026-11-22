// cards.js — the Emberfall Duel card catalogue.
//
// Every card belongs to one of four Houses. Houses are told apart by colour
// AND by shape (a triangle, a circle, a cross, a diamond), never by text
// alone. Champions stay on the table and fight; Tricks resolve at once.
//
// Keywords:
//   Swift  — may attack on the turn it is played.
//   Guard  — enemies must attack this champion before any other target.
//   Thorns — attackers take 1 damage back when they strike this champion.
//   Drain  — damage this champion deals also heals its owner's Heart.
//   Freeze — (from Frostbite) a frozen champion cannot attack next turn.
//
// Kindle: when you play a card while you already control a champion of the
// same House, the card is Kindled — champions enter with +1/+1 and Tricks
// gain the bonus written on them. Sequencing your plays by House is the
// game's central decision.

export const HOUSES = {
  ember: { name: 'Ember', glyph: '▲', color: '#f06423', deep: '#7a2a0e' },
  tide: { name: 'Tide', glyph: '●', color: '#2f8fe8', deep: '#123f6e' },
  thorn: { name: 'Thorn', glyph: '✚', color: '#43b04c', deep: '#1d5426' },
  gale: { name: 'Gale', glyph: '◆', color: '#a55eea', deep: '#4e2472' },
};

export const CARDS = {
  // ——— Ember champions ———
  cinderImp: {
    name: 'Cinder Imp', house: 'ember', kind: 'champion', cost: 1, atk: 2, hp: 1,
    motif: 'flame', text: 'Small, rude, flammable.',
  },
  ashHound: {
    name: 'Ash Hound', house: 'ember', kind: 'champion', cost: 2, atk: 3, hp: 2,
    keyword: 'swift', motif: 'fang', text: 'Swift. It runs before the fire does.',
  },
  forgeGolem: {
    name: 'Forge Golem', house: 'ember', kind: 'champion', cost: 4, atk: 4, hp: 5,
    keyword: 'guard', motif: 'anvil', text: 'Guard. Built to stand in the doorway.',
  },
  pyreDrake: {
    name: 'Pyre Drake', house: 'ember', kind: 'champion', cost: 6, atk: 6, hp: 5,
    motif: 'wing', text: 'The sky over Emberfall belongs to it.',
  },
  // ——— Tide champions ———
  brookSprite: {
    name: 'Brook Sprite', house: 'tide', kind: 'champion', cost: 1, atk: 1, hp: 2,
    motif: 'drop', text: 'It giggles in a language of rain.',
  },
  mistArcher: {
    name: 'Mist Archer', house: 'tide', kind: 'champion', cost: 2, atk: 2, hp: 3,
    motif: 'bow', text: 'You hear the bowstring a moment too late.',
  },
  reefTurtle: {
    name: 'Reef Turtle', house: 'tide', kind: 'champion', cost: 3, atk: 2, hp: 6,
    keyword: 'guard', motif: 'shell', text: 'Guard. Older than the harbour, twice as patient.',
  },
  stormLeviathan: {
    name: 'Storm Leviathan', house: 'tide', kind: 'champion', cost: 7, atk: 7, hp: 7,
    motif: 'wave', text: 'When it surfaces, the tide apologises.',
  },
  // ——— Thorn champions ———
  seedling: {
    name: 'Seedling', house: 'thorn', kind: 'champion', cost: 1, atk: 1, hp: 3,
    keyword: 'thorns', motif: 'sprout', text: 'Thorns. Harmless, until you grab it.',
  },
  brambleWolf: {
    name: 'Bramble Wolf', house: 'thorn', kind: 'champion', cost: 3, atk: 4, hp: 3,
    motif: 'fang', text: 'The thicket hunts in winter.',
  },
  elderTreant: {
    name: 'Elder Treant', house: 'thorn', kind: 'champion', cost: 5, atk: 4, hp: 8,
    keyword: 'guard', motif: 'root', text: 'Guard, Thorns. It was here before the road.',
    keyword2: 'thorns',
  },
  thornMatriarch: {
    name: 'Thorn Matriarch', house: 'thorn', kind: 'champion', cost: 6, atk: 5, hp: 6,
    keyword: 'thorns', motif: 'bloom', text: 'Thorns. Every rose in the valley answers to her.',
  },
  // ——— Gale champions ———
  zephyrFox: {
    name: 'Zephyr Fox', house: 'gale', kind: 'champion', cost: 1, atk: 2, hp: 2,
    keyword: 'swift', motif: 'swirl', text: 'Swift. Gone before the dust settles.',
  },
  cloudDjinn: {
    name: 'Cloud Djinn', house: 'gale', kind: 'champion', cost: 3, atk: 3, hp: 4,
    motif: 'orb', text: 'It grants wishes. Mostly its own.',
  },
  skyRoc: {
    name: 'Sky Roc', house: 'gale', kind: 'champion', cost: 5, atk: 5, hp: 4,
    keyword: 'swift', motif: 'wing', text: 'Swift. Its shadow is a weather warning.',
  },
  tempestSphinx: {
    name: 'Tempest Sphinx', house: 'gale', kind: 'champion', cost: 6, atk: 4, hp: 6,
    keyword: 'drain', motif: 'eye', text: 'Drain. Her riddles drink the listener dry.',
  },
  // ——— Tricks ———
  sparkBolt: {
    name: 'Spark Bolt', house: 'ember', kind: 'trick', cost: 1,
    motif: 'bolt', effect: { type: 'damage', amount: 2 }, kindleBonus: 1,
    text: 'Deal 2 damage to any target. Kindled: 3 instead.',
  },
  wildfire: {
    name: 'Wildfire', house: 'ember', kind: 'trick', cost: 5,
    motif: 'flame', effect: { type: 'damageAllEnemyChampions', amount: 3 }, kindleBonus: 1,
    text: 'Deal 3 damage to ALL enemy champions. Kindled: 4 instead.',
  },
  healingRain: {
    name: 'Healing Rain', house: 'tide', kind: 'trick', cost: 2,
    motif: 'drop', effect: { type: 'healDraw', amount: 5, draw: 1 }, kindleBonus: 2,
    text: 'Restore 5 Heart and draw a card. Kindled: restore 7 instead.',
  },
  frostbite: {
    name: 'Frostbite', house: 'tide', kind: 'trick', cost: 3,
    motif: 'shard', effect: { type: 'freezeDamage', amount: 3 }, kindleBonus: 1,
    text: 'Deal 3 damage to a champion and Freeze it. Kindled: 4 instead.',
  },
  overgrowth: {
    name: 'Overgrowth', house: 'thorn', kind: 'trick', cost: 2,
    motif: 'bloom', effect: { type: 'buff', atk: 2, hp: 2 }, kindleBonus: 1,
    text: 'Give a friendly champion +2/+2. Kindled: +3/+3 instead.',
  },
  secondWind: {
    name: 'Second Wind', house: 'gale', kind: 'trick', cost: 1,
    motif: 'swirl', effect: { type: 'draw', amount: 2 }, kindleBonus: 1,
    text: 'Draw 2 cards. Kindled: draw 3 instead.',
  },
  gust: {
    name: 'Gust', house: 'gale', kind: 'trick', cost: 2,
    motif: 'wave', effect: { type: 'bounce' }, kindleBonus: 0,
    text: 'Return an enemy champion to its owner’s hand.',
  },
};

// The 35-card deck both duelists bring. Cheap cards come in pairs so the
// early game always has plays; the big finishers are single, precious copies.
export const DECKLIST = [
  'cinderImp', 'cinderImp', 'brookSprite', 'brookSprite',
  'seedling', 'seedling', 'zephyrFox', 'zephyrFox',
  'ashHound', 'ashHound', 'mistArcher', 'mistArcher',
  'sparkBolt', 'sparkBolt', 'secondWind',
  'reefTurtle', 'reefTurtle', 'brambleWolf', 'brambleWolf',
  'cloudDjinn', 'cloudDjinn', 'overgrowth', 'overgrowth', 'frostbite',
  'forgeGolem', 'forgeGolem', 'healingRain', 'gust',
  'elderTreant', 'skyRoc', 'wildfire',
  'pyreDrake', 'thornMatriarch', 'tempestSphinx', 'stormLeviathan',
];

export const KEYWORD_TEXT = {
  swift: 'Swift — can attack the turn it is played.',
  guard: 'Guard — enemies must attack this champion first.',
  thorns: 'Thorns — attackers take 1 damage back.',
  drain: 'Drain — damage it deals also heals your Heart.',
};
