// main.ts — Emberfall Duel's hand-in program (Node 22, standard library
// only). The game itself is the static game/ folder beside this file;
// this program delivers it: it copies game/ and screenshots/ into the
// output directory and writes dossier.json — the summary the judge
// reads — with the kit's vendored library (vendor/makefun-game.ts),
// then double-checks its own delivery against the gate's caps before
// finishing, so a bad hand-in fails here instead of at the scorer.
//
// Run it the way the grader does, with MAKEFUN_OUTPUT_DIR standing in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, as the kit's RULES.txt states them.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function deliver(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function walk(dir, base, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, acc);
    else acc.push({ path: full.slice(base.length + 1), bytes: statSync(full).size });
  }
  return acc;
}

// 1. The game and its screenshots change hands exactly as they are.
deliver(join(repoDir, 'game'), join(outDir, 'game'));
if (existsSync(join(repoDir, 'screenshots'))) {
  deliver(join(repoDir, 'screenshots'), join(outDir, 'screenshots'));
}

// 2. The dossier is written from the delivered files, not the sources,
// so what the judge reads is what was actually handed in.
const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

// 3. A last look at the delivery against the caps.
const gameFiles = walk(join(outDir, 'game'), join(outDir, 'game'), []);
const gameBytes = gameFiles.reduce((sum, f) => sum + f.bytes, 0);
if (gameFiles.length > CAPS.game_max_files) {
  throw new Error(`game/ holds ${gameFiles.length} files, over the ${CAPS.game_max_files} cap`);
}
if (gameBytes > CAPS.game_max_bytes) {
  throw new Error(`game/ weighs ${gameBytes} bytes, over the ${CAPS.game_max_bytes} cap`);
}
const shotsDir = join(outDir, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => !f.startsWith('.')) : [];
if (shots.length > CAPS.screenshots.max) {
  throw new Error(`${shots.length} screenshots, over the ${CAPS.screenshots.max} cap`);
}
for (const shot of shots) {
  const bytes = statSync(join(shotsDir, shot)).size;
  if (bytes > CAPS.screenshots.max_bytes) {
    throw new Error(`screenshot ${shot} weighs ${bytes} bytes, over the ${CAPS.screenshots.max_bytes} cap`);
  }
  const head = readFileSync(join(shotsDir, shot)).subarray(0, 3);
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e;
  if (!isJpeg && !isPng) throw new Error(`screenshot ${shot} is neither a whole JPEG nor a PNG`);
}
console.log(`Emberfall Duel handed in: ${gameFiles.length} game files (${gameBytes} bytes), ${shots.length} screenshots, dossier ${dossier.length} bytes.`);
