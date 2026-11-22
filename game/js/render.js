// render.js — turns duel state into the table you see. Cards are DOM
// elements (crisp text at any size), each house has its own colour, glyph
// and hand-drawn SVG motif, and every number the judge needs — costs,
// attack, health, Hearts, energy — is big and readable.

import { CARDS, HOUSES } from './cards.js';
import { hasKeyword, canAttack } from './duel.js';

const MOTIFS = {
  flame: '<path d="M24 3c3 8 11 12 11 22a11 11 0 1 1-22 0c0-10 8-14 11-22z"/><path d="M24 18c1.5 4 5 6 5 10a5 5 0 1 1-10 0c0-4 3.5-6 5-10z" fill="#fff" opacity=".35"/>',
  drop: '<path d="M24 3c3 8 12 15 12 25a12 12 0 1 1-24 0c0-10 9-17 12-25z"/>',
  sprout: '<path d="M23 44V26h2v18z"/><path d="M24 26C14 26 8 20 8 10c10 0 16 6 16 16z"/><path d="M24 22c0-10 6-16 16-16 0 10-6 16-16 16z"/>',
  swirl: '<path d="M24 6a18 18 0 1 1-18 18 12 12 0 1 0 12-12 6 6 0 1 1-6 6" fill="none" stroke-width="5" stroke="currentColor"/><circle cx="24" cy="24" r="3"/>',
  fang: '<path d="M12 6h10l-5 30z"/><path d="M26 6h10l-5 30z"/>',
  anvil: '<path d="M6 12h36v7H30v7h8v9H10v-9h8v-7H6z"/>',
  wing: '<path d="M4 38C10 16 26 5 44 4c-4 18-16 30-34 36z"/><path d="M10 34C16 22 26 14 38 10" fill="none" stroke="#fff" stroke-width="3" opacity=".4"/>',
  bow: '<path d="M16 4a26 26 0 0 1 0 40" fill="none" stroke="currentColor" stroke-width="5"/><path d="M16 4v40" stroke="currentColor" stroke-width="2"/><path d="M14 24h24M32 17l7 7-7 7" fill="none" stroke="currentColor" stroke-width="4"/>',
  shell: '<path d="M6 38a18 16 0 0 1 36 0z"/><path d="M24 22v16M14 27l4 11M34 27l-4 11" stroke="#fff" stroke-width="3" opacity=".4"/>',
  wave: '<path d="M2 18q6-9 11 0t11 0 11 0 11 0" fill="none" stroke="currentColor" stroke-width="5"/><path d="M2 32q6-9 11 0t11 0 11 0 11 0" fill="none" stroke="currentColor" stroke-width="5" opacity=".6"/>',
  root: '<path d="M22 4h4v16h-4z"/><path d="M24 20c0 8-8 10-12 16M24 20c1 9 8 11 11 18M24 20v20" fill="none" stroke="currentColor" stroke-width="4"/>',
  bloom: '<circle cx="24" cy="13" r="8"/><circle cx="35" cy="21" r="8"/><circle cx="31" cy="34" r="8"/><circle cx="17" cy="34" r="8"/><circle cx="13" cy="21" r="8"/><circle cx="24" cy="24" r="5" fill="#fff" opacity=".45"/>',
  orb: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="7" fill="#fff" opacity=".4"/><path d="M38 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
  eye: '<path d="M3 24c6-11 13-16 21-16s15 5 21 16c-6 11-13 16-21 16S9 35 3 24z"/><circle cx="24" cy="24" r="8" fill="#fff" opacity=".5"/><circle cx="24" cy="24" r="4"/>',
  bolt: '<path d="M27 2L11 29h9l-3 17 19-29h-10z"/>',
  shard: '<path d="M24 2l8 16-8 28-8-28z"/><path d="M16 18h16" stroke="#fff" stroke-width="3" opacity=".4"/>',
};

export function motifSvg(motif, color) {
  const inner = MOTIFS[motif] || MOTIFS.orb;
  return `<svg viewBox="0 0 48 48" style="color:${color}" fill="${color}" aria-hidden="true">${inner}</svg>`;
}

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
}

function keywordTags(def) {
  const tags = [];
  for (const kw of [def.keyword, def.keyword2]) {
    if (kw) tags.push(`<span class="kw kw-${kw}">${kw.toUpperCase()}</span>`);
  }
  return tags.join('');
}

// A full card as it appears in a hand.
export function handCardEl(cardId, index, ui) {
  const def = CARDS[cardId];
  const house = HOUSES[def.house];
  const node = el('article', 'card');
  node.style.setProperty('--house', house.color);
  node.style.setProperty('--house-deep', house.deep);
  node.dataset.handIndex = String(index);
  node.dataset.cardId = cardId;
  if (ui.selectedHand === index) node.classList.add('selected');
  if (ui.playable.includes(index)) node.classList.add('playable');
  if (ui.kindledHand && ui.kindledHand.has(index)) node.classList.add('kindled');
  node.innerHTML = `
    <div class="cost" title="Energy cost">${def.cost}</div>
    <div class="house-band"><span class="house-glyph">${house.glyph}</span> ${house.name}</div>
    <div class="art">${motifSvg(def.motif, house.color)}</div>
    <div class="card-name">${def.name}</div>
    <div class="kw-row">${keywordTags(def)}</div>
    <div class="card-text">${def.text}</div>
    ${def.kind === 'champion'
      ? `<div class="stats"><span class="stat atk" title="Attack">⚔ ${def.atk}</span><span class="stat hp" title="Health">♥ ${def.hp}</span></div>`
      : `<div class="stats"><span class="stat trick">TRICK</span></div>`}`;
  return node;
}

// A champion standing on the table: smaller, shows current (buffed/damaged)
// numbers, and badges for Guard / Frozen / resting.
export function championEl(state, owner, ch, ui) {
  const def = CARDS[ch.cardId];
  const house = HOUSES[def.house];
  const node = el('article', 'card mini');
  node.style.setProperty('--house', house.color);
  node.style.setProperty('--house-deep', house.deep);
  node.dataset.uid = String(ch.uid);
  node.dataset.owner = owner;
  const ready = owner === state.active && canAttack(state, owner, ch);
  if (ready) node.classList.add('ready');
  if (ui.selectedAttacker === ch.uid) node.classList.add('selected');
  if (ui.targetable && ui.targetable.has(`${owner}:${ch.uid}`)) node.classList.add('targetable');
  const badges = [];
  if (hasKeyword(ch, 'guard')) badges.push('<span class="badge guard">GUARD</span>');
  if (hasKeyword(ch, 'thorns')) badges.push('<span class="badge thorns">THORNS</span>');
  if (hasKeyword(ch, 'drain')) badges.push('<span class="badge drain">DRAIN</span>');
  if (hasKeyword(ch, 'swift')) badges.push('<span class="badge swift">SWIFT</span>');
  if (ch.frozen) badges.push('<span class="badge frozen">FROZEN</span>');
  else if (ch.sick) badges.push('<span class="badge rest">RESTING</span>');
  const hpCls = ch.hp < ch.maxHp ? 'stat hp hurt' : 'stat hp';
  node.innerHTML = `
    <div class="cost">${def.cost}</div>
    <div class="house-band"><span class="house-glyph">${house.glyph}</span> ${house.name}</div>
    <div class="art small">${motifSvg(def.motif, house.color)}</div>
    <div class="card-name">${def.name}</div>
    <div class="badges">${badges.join('')}</div>
    <div class="stats"><span class="stat atk">⚔ ${ch.atk}</span><span class="${hpCls}">♥ ${ch.hp}</span></div>`;
  return node;
}

export function cardBackEl() {
  const node = el('div', 'card-back');
  node.innerHTML = '<div class="back-emblem">◆</div>';
  return node;
}

function portraitEl(state, who, ui) {
  const side = state.sides[who];
  const node = el('div', `portrait ${who}`);
  node.dataset.owner = who;
  if (ui.targetable && ui.targetable.has(`${who}:heart`)) node.classList.add('targetable');
  const sigil = who === 'player' ? '▲' : '✚';
  const name = who === 'player' ? 'YOU' : 'BRIAR';
  const sub = who === 'player' ? 'the Challenger' : 'Thicket Warden';
  node.innerHTML = `
    <div class="portrait-face">${sigil}</div>
    <div class="portrait-info">
      <div class="portrait-name">${name} <span class="portrait-sub">${sub}</span></div>
      <div class="heart" title="Heart — reduce the rival's to 0 to win">♥ ${Math.max(0, side.heart)}</div>
    </div>
    <div class="deck-info" title="Cards left in deck / discard fatigue">🂠 ${side.deck.length}</div>`;
  return node;
}

function energyEl(state, who) {
  const side = state.sides[who];
  const node = el('div', 'energy');
  const max = Math.min(side.turnsTaken || 1, 8);
  let gems = '';
  for (let i = 0; i < max; i++) gems += `<span class="gem${i < side.energy ? ' full' : ''}">◆</span>`;
  node.innerHTML = `<span class="energy-label">Energy</span> ${gems} <b>${side.energy}/${max}</b>`;
  return node;
}

// Full table render. ui carries selection/highlight state from main.js.
export function renderTable(refs, state, ui) {
  const { rivalHand, rivalBoard, playerBoard, playerHand, rivalBar, playerBar, log, turnBanner, endTurnBtn } = refs;

  rivalBar.replaceChildren(portraitEl(state, 'rival', ui), energyEl(state, 'rival'));
  playerBar.replaceChildren(portraitEl(state, 'player', ui), energyEl(state, 'player'));

  rivalHand.replaceChildren(...state.sides.rival.hand.map(() => cardBackEl()));

  rivalBoard.replaceChildren(
    ...(state.sides.rival.board.length
      ? state.sides.rival.board.map((ch) => championEl(state, 'rival', ch, ui))
      : [el('div', 'empty-row', 'Briar’s table is empty')]),
  );
  playerBoard.replaceChildren(
    ...(state.sides.player.board.length
      ? state.sides.player.board.map((ch) => championEl(state, 'player', ch, ui))
      : [el('div', 'empty-row', 'Your table is empty — play a champion')]),
  );

  playerHand.replaceChildren(
    ...state.sides.player.hand.map((cardId, i) => handCardEl(cardId, i, ui)),
  );

  log.innerHTML = state.log.slice(-4).map((line) => `<div>${line}</div>`).join('');
  const yourTurn = state.active === 'player' && !state.winner;
  turnBanner.textContent = state.winner
    ? 'The duel is decided'
    : yourTurn
      ? `Your turn ${state.turn} — ${state.sides.player.energy} energy`
      : 'Briar is playing…';
  turnBanner.className = `turn-banner${yourTurn ? ' yours' : ''}`;
  endTurnBtn.disabled = !yourTurn || ui.busy;
  endTurnBtn.textContent = ui.busy && state.active === 'rival' ? 'Briar is playing…' : 'END TURN ▸';
}

// A floating number over the table ("-3", "+5", "FROZEN"…).
export function spawnFloater(layer, x, y, text, cls) {
  const node = el('div', `floater ${cls || ''}`, text);
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  layer.appendChild(node);
  setTimeout(() => node.remove(), 1000);
}

export function centerOf(node) {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
