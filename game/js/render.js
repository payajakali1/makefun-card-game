// render.js — paints the duel. The engine owns the truth; this file only
// turns state into parchment and felt: card faces for the hand, smaller
// battle-worn faces for the board, hearts, energy crystals, the rival's
// face-down hand, and a short memory of what just happened (the log).
//
// Cards are told apart by colour AND shape: each House has a glyph that
// appears on the cost band, in the art, and beside the name, so Ember's
// orange triangle never reads as Gloom's violet diamond.

import { CARDS, HOUSES } from './cards.js';
import { MAX_HEART, ENERGY_MAX, otherSide } from './duel.js';

const MOTIFS = {
  spark: '✦', fang: '⋈', anvil: '⬣', wing: '≫', bolt: '⚡', flame: '✺',
  drop: '◎', bow: '➶', shell: '◕', wave: '≋', sprout: '♧', bloom: '✿',
  root: '⋔', orb: '◉', eye: '◐', shard: '✧',
};

function node(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function keywordsOf(def) {
  return [def.keyword, def.keyword2].filter(Boolean);
}

// A card face. For a catalogue card (in hand) pass the definition; for a
// champion on the board pass its live instance as `inst` so the numbers
// are the battle's numbers, scars included.
export function cardFace(def, inst) {
  const house = HOUSES[def.house];
  const atk = inst ? inst.atk : def.atk;
  const hp = inst ? inst.hp : def.hp;
  const classes = ['card', `house-${def.house}`, `kind-${def.kind}`];
  if (inst && inst.kindled) classes.push('kindled');
  if (inst && hp < inst.maxHp) classes.push('wounded');
  const kws = keywordsOf(def);
  const stats = def.kind === 'champion'
    ? `<div class="stats"><span class="atk" title="Attack">${atk} ⚔</span><span class="hp" title="Health">${hp} ♥</span></div>`
    : `<div class="stats trick-stats"><span class="trick-tag">TRICK</span></div>`;
  return node(`
    <article class="${classes.join(' ')}" style="--house:${house.colour};--house-deep:${house.deep}">
      <header class="card-top">
        <span class="cost" title="Energy cost">${def.cost}</span>
        <h4 class="card-name">${def.name}</h4>
        <span class="house-glyph" title="House ${house.name}">${house.glyph}</span>
      </header>
      <div class="art"><span class="art-house">${house.glyph}</span><span class="art-motif">${MOTIFS[def.motif] || '✦'}</span></div>
      ${stats}
      <p class="card-text">${def.text}</p>
      ${kws.length ? `<footer class="kw">${kws.map((k) => k.toUpperCase()).join(' · ')}</footer>` : ''}
      ${inst && inst.kindled ? '<span class="kindle-mark" title="Kindled: entered with +1/+1">🔥</span>' : ''}
    </article>`);
}

// A face-down card for the rival's hand: just the ember sigil on a back.
export function cardBack() {
  return node('<div class="card card-back"><span class="back-sigil">✦</span></div>');
}

function crystals(energy, maxEnergy) {
  let out = '';
  for (let i = 0; i < ENERGY_MAX; i++) {
    out += `<span class="crystal${i < energy ? ' lit' : ''}${i >= maxEnergy ? ' unborn' : ''}">◆</span>`;
  }
  return out;
}

// Human sentences for the log, from engine events.
export function eventText(state, ev) {
  const who = ev.side === 'player' ? 'You' : 'Vesper';
  const name = ev.cardId ? CARDS[ev.cardId].name : '';
  switch (ev.type) {
    case 'play': return `${who} played ${name}${ev.kindled ? ' — KINDLED 🔥' : ''}.`;
    case 'summon': return null;
    case 'attack': return `${who} attacked with ${name || 'a champion'}.`;
    case 'death': return `${name} fell.`;
    case 'heal': return `${who} mended ${ev.amount} Heart.`;
    case 'heartHurt': return `${ev.side === 'player' ? 'Your' : 'Vesper’s'} Heart took ${ev.amount}.`;
    case 'championHurt': return null;
    case 'fatigue': return `${who} drew from an empty deck — fatigue ${ev.amount}.`;
    case 'burn': return `${who} burned ${name} — hand full.`;
    case 'bounce': return `${name} was swept back to its keeper’s hand.`;
    case 'buff': return `${name || 'A champion'} grew stronger.`;
    case 'root': return `${name || 'A champion'} is Rooted.`;
    case 'turn': return ev.side === 'player' ? `— Round ${ev.round}: your turn —` : `— Vesper’s turn —`;
    case 'gameover': return ev.winner === 'player' ? 'Vesper’s Heart is spent. You win!' : ev.winner === 'rival' ? 'Your Heart is spent.' : 'Both Hearts spent — a draw.';
    default: return null;
  }
}

// Repaint everything from state. `ui` carries the human's current
// selection so the legal choices glow:
//   ui.selectedHand — hand index chosen, or null
//   ui.selectedAttacker — board uid chosen to attack, or null
//   ui.legalTargets — targets the current selection may strike
//   ui.playInfo — Map of handIndex -> cardPlayInfo for the player
export function render(state, refs, ui) {
  const me = state.sides.player;
  const foe = state.sides.rival;

  refs.rivalHeart.textContent = `♥ ${Math.max(0, foe.heart)}`;
  refs.rivalHeart.classList.toggle('critical', foe.heart <= 6);
  refs.playerHeart.textContent = `♥ ${Math.max(0, me.heart)}`;
  refs.playerHeart.classList.toggle('critical', me.heart <= 6);
  refs.rivalMeta.innerHTML =
    `<span title="Cards in hand">🂠 ${foe.hand.length}</span>` +
    `<span title="Cards left in deck">Deck ${foe.deck.length}</span>` +
    `<span title="Energy">${crystals(foe.energy, foe.maxEnergy)}</span>`;
  refs.playerMeta.innerHTML =
    `<span title="Cards left in deck">Deck ${me.deck.length}</span>` +
    `<span title="Energy">${crystals(me.energy, me.maxEnergy)}</span>` +
    `<span title="Round">Round ${state.round}</span>`;

  // Rival's hand: backs only.
  refs.rivalHand.replaceChildren(...foe.hand.map(() => cardBack()));

  // Boards.
  for (const [sideKey, holder] of [['rival', refs.rivalBoard], ['player', refs.playerBoard]]) {
    const side = state.sides[sideKey];
    holder.replaceChildren(...side.board.map((champ) => {
      const face = cardFace(CARDS[champ.id], champ);
      face.dataset.uid = String(champ.uid);
      face.dataset.side = sideKey;
      if (champ.sick) face.classList.add('sick');
      if (champ.spent) face.classList.add('spent');
      if (champ.holdFast) face.classList.add('rooted');
      if (sideKey === 'player' && ui.selectedAttacker === champ.uid) face.classList.add('selected');
      if (ui.legalTargets.some((t) => t.kind === 'champion' && t.side === sideKey && t.uid === champ.uid)) {
        face.classList.add('targetable');
      }
      return face;
    }));
    if (!side.board.length) {
      holder.append(node('<div class="empty-board">— no champions —</div>'));
    }
  }

  // The player's hand.
  refs.playerHand.replaceChildren(...me.hand.map((cardId, i) => {
    const def = CARDS[cardId];
    const face = cardFace(def, null);
    face.dataset.handIndex = String(i);
    const info = ui.playInfo.get(i);
    if (info) {
      face.classList.add('playable');
      if (info.kindled) face.classList.add('will-kindle');
    } else {
      face.classList.add('unplayable');
    }
    if (ui.selectedHand === i) face.classList.add('selected');
    return face;
  }));

  // Hearts as targets glow when a selection may strike them.
  refs.rivalHeart.classList.toggle('targetable',
    ui.legalTargets.some((t) => t.kind === 'heart' && t.side === 'rival'));
  refs.playerHeart.classList.toggle('targetable',
    ui.legalTargets.some((t) => t.kind === 'heart' && t.side === 'player'));

  refs.endTurn.disabled = state.active !== 'player' || !!state.winner || ui.busy;
  refs.turnBanner.textContent = state.winner
    ? 'The duel is decided.'
    : state.active === 'player'
      ? `Your turn — round ${state.round}. Play a card, or send a champion in.`
      : 'Vesper is playing…';
}

// A floating number over the table: -3, +5, ✦ KINDLED.
export function spawnFloater(layer, anchor, text, cls) {
  if (!anchor || !layer) return;
  const host = layer.getBoundingClientRect();
  const box = anchor.getBoundingClientRect();
  const f = node(`<span class="floater ${cls || ''}">${text}</span>`);
  f.style.left = `${box.left - host.left + box.width / 2}px`;
  f.style.top = `${box.top - host.top}px`;
  layer.append(f);
  setTimeout(() => f.remove(), 1250);
}
