[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/payajakali1/makefun-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/payajakali1/makefun-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Entry for the [make.fun bounty: best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) by **payaja**.

---

# Emberfall Duel

An original card game for two duelists, played in a desktop browser from
static files — no build step, no network. Open `game/index.html` (or serve
`game/` with any static file server) and click **START THE DUEL**.

## The game

You face **Briar, the Thicket Warden**, across a green-felt table. Both
duelists start on **♥ 20 Heart** and draw from the same 35-card deck.
Reduce Briar's Heart to 0 before she reduces yours.

- **Energy ◆** grows by 1 on each of your turns (max 8) and pays for cards.
  Briar, going second, opens with an extra card.
- **Champions** (16 designs) stay on the table and attack from the next
  turn. Keywords: **Swift** (attacks at once), **Guard** (must be attacked
  first), **Thorns** (attackers take 1 back), **Drain** (damage it deals
  heals your Heart). A champion killed by a blow does not strike back.
- **Tricks** (7 designs) resolve at once: damage, a freezing strike, a
  board-wide wildfire, healing rain, a growth buff, a gust that bounces a
  champion back to its owner's hand, and fresh draws.
- **Kindle 🔥** is the central decision: play a card while a champion of
  its House is already on your table and it enters stronger — champions
  get +1/+1, Tricks gain the bonus printed on them. Sequencing your plays
  House by House is how games are won.
- The four Houses are told apart by colour **and** shape: Ember ▲ orange,
  Tide ● blue, Thorn ✚ green, Gale ◆ violet.
- Briar plays by readable rules — she removes what she can kill cleanly,
  hides behind Guards, heals when low and goes for the Heart when she can
  finish — so her turns can be read and countered. Empty decks bite back:
  drawing from an empty deck costs growing fatigue damage.

A duel lasts about 6–9 turns. Wins land with golden rays and falling
embers; the end panel reports the true score of the game.

## Layout of this repository

- `main.ts` — the hand-in program (Node 22, standard library only). It
  copies `game/` and `screenshots/` to the output directory and writes
  `dossier.json` with the vendored library. Run it with
  `MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `game/` — the game itself:
  - `index.html` — title screen, table and end screen markup
  - `css/table.css` — the felt table, parchment cards, animations
  - `js/cards.js` — the card catalogue and the four Houses
  - `js/deck.js` — seeded shuffling (a `?seed=N` game is reproducible)
  - `js/duel.js` — the rules engine: turns, combat, Kindle, fatigue
  - `js/ai.js` — Briar's decision-making
  - `js/render.js` — cards and table rendering, combat floaters
  - `js/sound.js` — synthesised WebAudio sounds (no audio files)
  - `js/main.js` — input, the rival's animated turn, screenshot states
- `screenshots/` — four real renders of the game in a browser: title,
  a mid-game table (seed 17), victory and defeat. The game's own
  `?shot=title|table|victory|defeat&seed=N` states produce them.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `LICENSE` — MIT, © payaja.
