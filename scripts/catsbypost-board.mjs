// Builds the playable Sorting Office board on /catsbypost from the game's own
// repository, so the page plays by the game's rules in the game's art.
//
//   node scripts/catsbypost-board.mjs [path to the game repo]
//
// The game repo is not part of this one (default: ~/Git/cosysortie), so the
// two files this writes are committed, like the typefaces in public/fonts:
//
//   public/shots/catsbypost/board/board.js     the game's rules, score, board
//       animation, projection, acting and paper pieces, unmodified, followed by
//       scripts/catsbypost-host.js; minified, as one classic script
//   public/shots/catsbypost/board/acting.webp  the game's acting sprite sheet,
//       repacked at two-thirds size
//
// Run it again when the game's rules, art or the two Sorting Office puzzles
// change. tests/catsbypost.test.ts checks the built file still carries them.
//
// The plate (board/office.webp) is not built here. It is the game's own render
// of the Sorting Office with the 5 x 4 floor emptied, shot as four 1600 x 1200
// tiles at camera scale 6 and stitched; the board's back corner sits at
// (1480, 1103) in the 2800 x 2100 plate and a tile is 192 px wide. The page
// states those numbers on the board element.
import sharp from 'sharp';
import { transform } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const game = process.argv[2] || join(homedir(), 'Git/cosysortie');
const out = join(here, '../public/shots/catsbypost/board');
mkdirSync(out, { recursive: true });
const src = (p) => readFileSync(join(game, p), 'utf8');

// ---- sprites: every acting sprite the pieces draw, repacked with clear gutters ----
const acting = JSON.parse(src('src/fidelity/office-paper/assets/acting.json'));
const sheetPath = join(game, 'src/fidelity/office-paper/assets/acting.webp');
const SCALE = 2 / 3, PAD = 4, SHEET_W = 1400;
const names = Object.keys(acting.sprites).filter((n) => !/^(carrier|fold)-/.test(n)).sort();
let x = PAD, y = PAD, rowH = 0;
const placed = [], sprites = {};
for (const name of names) {
  const [sx, sy, sw, sh] = acting.sprites[name].rect;
  const w = Math.round(sw * SCALE), h = Math.round(sh * SCALE);
  if (x + w + PAD > SHEET_W) { x = PAD; y += rowH + PAD; rowH = 0; }
  const input = await sharp(sheetPath).extract({ left: sx, top: sy, width: sw, height: sh }).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  placed.push({ input, left: x, top: y });
  sprites[name] = { rect: [x, y, w, h] };
  x += w + PAD; rowH = Math.max(rowH, h);
}
const sheetH = y + rowH + PAD;
const info = await sharp({ create: { width: SHEET_W, height: sheetH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(placed).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(join(out, 'acting.webp'));

// ---- levels: a warm-up on the same floor, then the game's two 5 x 4 Sorting Office puzzles ----
const all = JSON.parse(src('src/data/levels.json')).levels;
const pick = (id) => { const i = all.findIndex((l) => l.id === id); return { ...all[i], label: `Puzzle ${i + 1} of ${all.length}` }; };
const levels = [
  { id: 'warm-up', title: 'A first delivery', label: 'Warm-up', idea: 'A plain turntable turns a cat', nudge: true,
    board: { w: 5, h: 4, roomX: 0, roomY: 0 }, timeLimit: 36,
    hatches: [{ x: 0, y: 1, dir: 'R', cats: ['ginger'] }], baskets: [{ x: 3, y: 3, coat: 'ginger' }], dogs: [],
    tray: { plain: 1, ginger: 0, blue: 0 }, solution: [{ x: 3, y: 1, type: 'plain', dir: 'D' }], minTurntables: 1 },
  pick('2-2'), pick('2-3'),
];

// ---- the bundle ----
const bundle = [
  '(function () {',
  'const OfficeRules = (function () { const module = { exports: {} };',
  src('src/sim/10_rules.js'),
  'return module.exports; })();',
  src('src/sim/16_score.js'),
  src('src/sim/12_boardanim.js'),
  src('src/fidelity/office-paper/projection.js'),
  src('src/fidelity/office-paper/acting.js'),
  src('src/fidelity/office-paper/pieces.js'),
  readFileSync(join(here, 'catsbypost-host.js'), 'utf8').replace('__SPRITES__', JSON.stringify(sprites)).replace('__LEVELS__', JSON.stringify(levels)),
  'window.CatsByPostBoard = CatsByPostBoard;',
  '})();',
].join('\n');
const { code } = await transform(bundle, { minify: true, target: 'es2020', legalComments: 'none' });
const banner = '/* Cats by Post: the Sorting Office board. Built by scripts/catsbypost-board.mjs from the game repository; do not edit by hand. */\n';
writeFileSync(join(out, 'board.js'), banner + code);
console.log(`acting.webp ${SHEET_W}x${sheetH} ${info.size} bytes, ${names.length} sprites; board.js ${bundle.length} bytes, ${banner.length + code.length} minified; levels ${levels.map((l) => l.id).join(', ')}`);
