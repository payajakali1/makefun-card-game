// Emberfall Duel — hand-in program (Node 22, standard library only).
//
// The game itself is the static site in game/ (open game/index.html in a
// desktop browser; it plays fully offline). This program hands the entry in:
// it copies game/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there with buildDossier from the vendored
// make.fun library, byte for byte as the gate expects. The output directory
// is /output in the grader; anywhere else, MAKEFUN_OUTPUT_DIR stands in for
// it:   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same repository always produces the same
// output bytes, so the grader's two runs agree.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps for this bounty: the dossier text is capped at 160 KiB,
// screenshots at 4 files of 256 KiB each, game/ at 993 entries and 48 MiB,
// and no path under game/ may exceed 1,000 UTF-8 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
