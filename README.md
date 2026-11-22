[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/payajakali1/makefun-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/payajakali1/makefun-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Entry for the [make.fun bounty: best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) by **payaja**.

---

# Emberfall Duel

An original card game for two duelists, played in a desktop browser from
static files — no build step, no network. Open `game/index.html` (or serve
`game/` with any static file server) and click **⚔ Start the duel**.

## The game

Across the felt sits **Vesper, the Gloom Herald**. Both duelists start at
**♥ 20 Heart** and carry the same 32-card deck, built from 23 designs.
Reduce Vesper's Heart to 0 before she reduces yours.

- **Energy ◆** grows by 1 on each of your turns (max 8), refills every
  turn, and pays for cards. Vesper, answering second, opens with an
  extra card.
- **Champions** (16 designs) stay on the table and fight. A fresh
  champion is sleepy and cannot attack until your next turn, unless it
  has **Swift**. Keywords: **Swift** (attacks at once), **Guard** (must
  be attacked before other targets), **Thorns** (attackers take 1 damage
  back), **Drain** (damage it deals also mends its keeper's Heart). A
  champion killed by a blow does not strike back; a champion tangled by
  Tangling Vines is **Rooted** and skips its next attack.
- **Tricks** (7 designs) resolve at once: a burning lance, a board-wide
  conflagration, mending rain that also draws, a riptide that sweeps a
  champion back to its keeper's hand, a growth buff, tangling vines, and
  a soul sap that wounds one Heart while mending the other.
- **Kindle 🔥** is the central decision: the *second* card you play in a
  turn from a House you have already played that turn is Kindled —
  champions enter with +1/+1 and Tricks gain the bonus printed on them.
  Sequencing a turn House by House is how duels are won.
- The four Houses are told apart by colour **and** shape: Ember ▲
  orange, Tide ● blue, Thorn ✚ green, Gloom ◆ violet.
- Vesper plays by readable rules — she takes the kill a Trick offers,
  builds cheap House-mates first so her second card lands Kindled,
  removes what she can kill cleanly, mends when low, and goes for your
  Heart when she can finish — so her turns can be read and countered.
- An empty deck bites back: drawing from it costs growing **fatigue**
  damage. A duel lasts about 8–10 rounds.

## Controls

Mouse: click a glowing hand card to play it (then a glowing target, if
it asks for one); click one of your ready champions, then a glowing
target, to attack; **End turn** hands over to Vesper. Keyboard: **1–9**
pick a hand card, **E** or **Enter** ends the turn, **Esc** cancels a
selection. The 🔊 button mutes the synthesised sounds — every sound is
made in code with WebAudio; there are no audio files.

A game dealt from `?seed=N` is reproducible, and the game's own demo
states (`?shot=title|table|victory|defeat&seed=N`) produce the
screenshots below: the table is a real game auto-played to round 3, and
the victory and defeat are complete games the rival's rules played
against themselves, rendered by the game's own code.

## Layout of this repository

- `main.ts` — the hand-in program (Node 22, standard library only). It
  copies `game/` and `screenshots/` to the output directory, writes
  `dossier.json` with the vendored library, and checks its own delivery
  against the gate's caps. Run it with
  `MAKEFUN_OUTPUT_DIR=out node main.ts`.
- `game/` — the game itself:
  - `index.html` — title screen, table and end screen markup
  - `css/table.css` — the felt table, parchment cards, animations
  - `js/cards.js` — the 23-card catalogue and the four Houses
  - `js/deck.js` — seeded shuffling (a `?seed=N` game is reproducible)
  - `js/duel.js` — the rules engine: turns, combat, Kindle, fatigue
  - `js/ai.js` — Vesper's decision-making
  - `js/render.js` — cards and table rendering, combat floaters
  - `js/sound.js` — synthesised WebAudio sounds (no audio files)
  - `js/main.js` — input, the rival's animated turn, the demo states
- `screenshots/` — four real renders of the game in a browser: title,
  a mid-game table, victory and defeat.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `LICENSE` — MIT, © 2026 payaja.
