// Cuts every image the GRØD pages use from one run of the Demo's capture
// script, so a new run of the app (a redesigned sidebar, a re-dated Demo)
// is one command here.
//
//   node scripts/grod-crops.mjs <run-root> [--compare] [--out <dir>] [--only landing,craft,docks]
//
// <run-root> holds the capture script's output folders, named as the ask
// names them (.impeccable/review/grod-capture-ask-2.md): full-riso-light,
// full-riso-dark, full-braun-light-castiglioni, themes, docks, and
// optionally docks-by-theme and grain. Files inside keep the script's own
// names: <scene>-<topping>-<theme>[-dark].png, 2224 x 1664, the window at
// 112,76 sized 2000 x 1440 with 48px corners; the pill and the card are
// their own small panels.
//
// --compare lays each image's previous cut beside its new one in contact
// sheets under .impeccable/review/recrop/, which is how a crop that no
// longer lands on the same part of the app is caught. --out writes
// somewhere other than public/shots/grod (a dry run). Run from the repo root
// so sharp resolves; coordinates are in the capture's own pixels (2x).
//
// Boxes are measured on the house capture (Riso light, Overprint D2). The
// pane's left edge is measured on every run and compared with the edge the
// boxes were measured against; a box anchored to the pane's left moves with
// it, one anchored to its right or centre does not, or moves half way.
import sharp from 'sharp';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const RUN = args.find((a) => !a.startsWith('--'));
if (!RUN) { console.error('usage: node scripts/grod-crops.mjs <run-root> [--compare] [--out <dir>] [--only landing,craft,docks]'); process.exit(1); }
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = new URL('..', import.meta.url).pathname;
const OUT_ROOT = opt('--out') ?? join(ROOT, 'public/shots/grod');
const ONLY = (opt('--only') ?? 'landing,craft,docks').split(',');
const COMPARE = args.includes('--compare');
const LANDING = join(OUT_ROOT, 'landing');
const CRAFT = join(OUT_ROOT, 'craft');
mkdirSync(LANDING, { recursive: true });
mkdirSync(CRAFT, { recursive: true });

const WIN = { left: 112, top: 76, width: 2000, height: 1440 };
const RADIUS = 48;
/* The pane's left edge in the captures the boxes were measured on, as
   paneLeft() reads it there: the sidebar is 192 points wide, and its edge
   is the step between window columns 379 and 380. */
const MEASURED_PANE_LEFT = 491;
const THEMES = ['riso', 'grod-warm', 'nord', 'sepia', 'red-graphite', 'flexoki', 'braun'];
const DOCKS = ['overprintd2', 'fukasawa', 'ledger', 'marginalia', 'castiglioni', 'jensen', 'crunchy2'];

/* A capture by its look. The capture script adds a suffix for each look
   setting that departs from its default (-noecho, -comfortable,
   -finegrain), so a file is found with whatever suffixes this run carries. */
const suffixes = new Map();
const file = (folder, scene, topping = 'overprintd2', theme = 'riso', mode = 'light') => {
  const base = `${scene}-${topping}-${theme}${mode === 'dark' ? '-dark' : ''}`;
  const dir = join(RUN, folder);
  if (!suffixes.has(dir)) {
    const names = existsSync(dir) ? readdirSync(dir) : [];
    const sample = names.find((n) => /^agenda-overview-/.test(n) && n.endsWith('.png')) ?? '';
    const m = sample.match(/((?:-(?:noecho|compact|comfortable|nonegrain|finegrain|inactive))+)\.png$/);
    suffixes.set(dir, m ? m[1] : '');
  }
  return join(dir, `${base}${suffixes.get(dir)}.png`);
};
const house = (scene) => file('full-riso-light', scene);
const have = (path) => existsSync(path);

/* Before anything is written, keep what is there for the comparison. */
let before = null;
if (COMPARE) {
  before = mkdtempSync(join(tmpdir(), 'grod-crops-before-'));
  for (const set of ['landing', 'craft']) if (existsSync(join(OUT_ROOT, set))) cpSync(join(OUT_ROOT, set), join(before, set), { recursive: true });
}

const written = [];
const report = (set, name, info) => { written.push([set, name]); console.log(`${set}/${name}`, info.width, info.height, Math.round(info.size / 1024) + 'k'); };
const mask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);

/* Where the pane begins in this run: the sidebar's edge, read as the
   sharpest vertical step in a band of rows below the content. Rows are
   averaged so the sidebar's grain does not count as an edge. The boxes
   shift by the difference from the reference. */
async function paneLeft(path) {
  const band = { left: WIN.left, top: 1100, width: WIN.width, height: 200 };
  const { data, info } = await sharp(path).extract(band).raw().toBuffer({ resolveWithObject: true });
  const mean = new Float32Array(band.width);
  for (let y = 0; y < band.height; y += 1) for (let x = 0; x < band.width; x += 1) {
    const i = (y * band.width + x) * info.channels;
    mean[x] += (data[i] + data[i + 1] + data[i + 2]) / 3 / band.height;
  }
  let best = { x: MEASURED_PANE_LEFT - WIN.left, g: 0 };
  // a sidebar edge is between 330 and 480: the card's and the rows' edges
  // further right are sharper steps and must not be taken for it
  for (let x = 330; x < 480; x += 1) {
    const g = Math.abs((mean[x + 1] + mean[x + 2] + mean[x + 3]) - (mean[x - 3] + mean[x - 2] + mean[x - 1])) / 3;
    if (g > best.g) best = { x, g };
  }
  return WIN.left + best.x;
}
const read = have(house('agenda-overview')) ? (await paneLeft(house('agenda-overview'))) - MEASURED_PANE_LEFT : 0;
// a pixel either way is the edge's antialiasing, not a moved sidebar
const delta = Math.abs(read) <= 2 ? 0 : read;
console.log(`pane left: measured ${MEASURED_PANE_LEFT}, this run ${MEASURED_PANE_LEFT + delta} (${delta >= 0 ? '+' : ''}${delta})`);
const shift = (box, anchor = 'left') => ({ ...box, left: box.left + Math.round(delta * (anchor === 'left' ? 1 : anchor === 'centre' ? 0.5 : 0)) });

/* ---- The cuts ------------------------------------------------------------ */
async function win(path, set, name) {
  const info = await sharp(path).extract(WIN).composite([{ input: mask(WIN.width, WIN.height, RADIUS), blend: 'dest-in' }])
    .webp({ quality: set === 'landing' ? 90 : 86, alphaQuality: 92 }).toFile(join(OUT_ROOT, set, `${name}.webp`));
  report(set, name, info);
}
async function region(path, set, name, box, quality = 84, background = '#F6F1E6') {
  const info = await sharp(path).extract(box).flatten({ background }).webp({ quality }).toFile(join(OUT_ROOT, set, `${name}.webp`));
  report(set, name, info);
}
async function traced(path, set, name, box, radius, quality = 84) {
  const info = await sharp(path).extract(box).composite([{ input: mask(box.width, box.height, radius), blend: 'dest-in' }])
    .webp({ quality, alphaQuality: 90 }).toFile(join(OUT_ROOT, set, `${name}.webp`));
  report(set, name, info);
}
/* A floating panel captured by itself with the system shadow round it: keep
   the opaque shape, and in each corner fade out what is darker than the
   panel's own edge (the shadow showing through the rounded corner). */
async function panel(path, set, name, box) {
  const { data, info: raw } = await sharp(path).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const CORNER = 12;
  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const i = (y * raw.width + x) * 4;
      data[i + 3] = data[i + 3] >= 250 ? 255 : 0;
      const inCorner = (x < CORNER || x >= raw.width - CORNER) && (y < CORNER || y >= raw.height - CORNER);
      if (!inCorner) continue;
      const light = Math.max(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = Math.min(data[i + 3], Math.round(Math.max(0, Math.min(1, (light - 0x40) / (0x99 - 0x40))) * 255));
    }
  }
  const info = await sharp(data, { raw }).webp({ quality: 90, alphaQuality: 100 }).toFile(join(OUT_ROOT, set, `${name}.webp`));
  report(set, name, info);
}

/* ---- The landing set: the home, Features and Privacy pages ---------------- */
const windows = [
  ['meeting-enhanced-notes', 'window-notes'], ['meeting-summary', 'window-summary'], ['meeting-transcript', 'window-transcript'],
  ['timeline-year', 'window-year'], ['timeline-year-2025', 'window-year-2025'], ['month-page-facts', 'window-month'],
  ['people-overview', 'window-people'], ['series-ladder', 'window-series'], ['meeting-answer-with-evidence', 'window-answer'],
  ['person-context', 'window-person'], ['meeting-series-context', 'window-continuity'], ['agenda-overview', 'window-agenda'],
  ['recording-active', 'window-recording'], ['people-collective', 'window-shared'], ['tags-queue', 'window-tags'],
  ['tags-map', 'window-tags-map'], ['search-project-decision', 'window-search'],
];
/* Parts that float over the window, traced to their own shape: scene,
   name, box, corner radius, anchor. The popover is cut 2px inside its
   border, whose corners are not quite circular. */
const elements = [
  // the popover grew on 9 Oct 2026: its Today row now carries the meeting's
  // first line, and Open the series sits under it
  ['meeting-series-context', 'popover', { left: 975, top: 312, width: 698, height: 934 }, 28, 'left'],
  ['agenda-deleting', 'toast', { left: 1623, top: 1407, width: 375, height: 67 }, 10, 'right'],
  ['month-page-palette', 'palette', { left: 554, top: 314, width: 1116, height: 956 }, 31, 'centre'],
  ['recording-system-stalled', 'bar-stalled', { left: 604, top: 1352, width: 1283, height: 124 }, 3, 'left'],
  ['recording-processing', 'bar-processing', { left: 604, top: 1364, width: 794, height: 112 }, 3, 'left'],
  ['agenda-end-of-day', 'dock-breathe', { left: 701, top: 256, width: 1200, height: 118 }, 3, 'left'],
];
/* Regions inside a window, cut at the UI's own edges. */
const details = [
  ['month-page-facts', 'stood-out', { left: 662, top: 329, width: 1280, height: 242 }],
  ['month-page-facts', 'weeks', { left: 690, top: 625, width: 1215, height: 300 }],
  ['month-page-facts', 'week45', { left: 690, top: 1205, width: 1215, height: 165 }],
  ['series-ladder', 'skipped', { left: 662, top: 652, width: 1240, height: 196 }],
  ['meeting-series-context', 'continuity', { left: 940, top: 270, width: 780, height: 994 }],
  ['meeting-answer-with-evidence', 'line-0302', { left: 678, top: 486, width: 1202, height: 132 }],
  ['meeting-answer-with-evidence', 'ask', { left: 606, top: 1076, width: 790, height: 282 }],
  // the Transcript lost its fixture label and search field on 9 Oct 2026,
  // so its lines start 143px higher than they did
  ['meeting-transcript', 'transcript-lines', { left: 690, top: 497, width: 1215, height: 420 }],
  ['tags-index', 'merge', { left: 677, top: 294, width: 1250, height: 195 }],
  ['person-context', 'voice', { left: 662, top: 312, width: 1280, height: 200 }],
  ['agenda-deleting', 'deleted', { left: 1600, top: 1385, width: 420, height: 110 }, 'right'],
  ['intelligence-retry-unavailable', 'retry', { left: 668, top: 503, width: 1272, height: 302 }],
];

if (ONLY.includes('landing')) {
  for (const [scene, name] of windows) await win(house(scene), 'landing', name);
  for (const [scene, name, box, radius, anchor] of elements) await traced(house(scene), 'landing', name, shift(box, anchor), radius);
  for (const [scene, name, box, anchor] of details) await region(house(scene), 'landing', name, shift(box, anchor));
  // the settings window is white, not paper; it sits at the window's own left
  await region(house('settings-transcription'), 'landing', 'engines', { left: 380, top: 164, width: 1464, height: 308 }, 88, '#FFFFFF');
  // the pre-meeting card and the compact pill, each its own panel
  await panel(house('premeeting-card'), 'landing', 'card', { left: 44, top: 6, width: 640, height: 124 });
  await panel(house('pill-recording'), 'landing', 'pill', { left: 48, top: 48, width: 80, height: 174 });

  // Where each detail and element sits inside its window, as percentages of
  // the window, and its pixel size. GrodPopOut reads this.
  const pct = (v, of) => Math.round((v / of) * 10000) / 100;
  const shots = {};
  for (const [, name, box, anchorOrRadius, anchor] of [...details, ...elements]) {
    const b = shift(box, typeof anchorOrRadius === 'string' ? anchorOrRadius : anchor);
    shots[name] = { w: b.width, h: b.height, rect: [pct(b.left - WIN.left, WIN.width), pct(b.top - WIN.top, WIN.height), pct(b.width, WIN.width), pct(b.height, WIN.height)] };
  }
  const shotsPath = opt('--out') ? join(OUT_ROOT, 'grodShots.json') : join(ROOT, 'src/lib/grodShots.json');
  writeFileSync(shotsPath, `${JSON.stringify(shots, null, 2)}\n`);
  console.log('wrote', shotsPath);
}

/* ---- The Craft set --------------------------------------------------------- */
if (ONLY.includes('craft')) {
  const themed = (scene, theme, mode) => theme === 'riso' ? file(`full-riso-${mode}`, scene, 'overprintd2', 'riso', mode) : file('themes', scene, 'overprintd2', theme, mode);
  for (const theme of THEMES) {
    await win(themed('agenda-overview', theme, 'light'), 'craft', `agenda-${theme}`);
    await win(themed('meeting-enhanced-notes', theme, 'light'), 'craft', `notes-${theme}`);
    await win(themed('meeting-enhanced-notes', theme, 'dark'), 'craft', `notes-${theme}-dark`);
  }
  for (const [scene, name] of [['agenda-overview', 'braun-agenda'], ['tags-map', 'braun-tags'], ['month-page-facts', 'braun-month']]) {
    await win(file('full-braun-light-castiglioni', scene, 'castiglioni', 'braun'), 'craft', name);
  }
  // the top of the Agenda, the same region for each topping, from below the
  // page title's descenders (row 231 in the house capture)
  const STAGE = shift({ left: 640, top: 240, width: 1440, height: 508 });
  for (const dock of DOCKS) {
    await region(dock === 'overprintd2' ? house('agenda-overview') : file('docks', 'agenda-overview', dock), 'craft', `dock-${dock}-riso`, STAGE, 88);
  }
  // close-ups at the capture's own pixels
  const HOUSE = house('agenda-overview');
  await region(HOUSE, 'craft', 'macro-card', shift({ left: 648, top: 236, width: 1180, height: 420 }), 92);
  await region(HOUSE, 'craft', 'macro-mark', shift({ left: 656, top: 240, width: 620, height: 232 }), 92);
  await region(HOUSE, 'craft', 'macro-stamp', shift({ left: 1420, top: 240, width: 500, height: 232 }, 'right'), 92);
  // the grain patches, only when the run has the grain sweep: bare paper
  // beside the page's title, doubled and unsmoothed
  const PATCH = shift({ left: 1320, top: 110, width: 140, height: 80 }, 'centre');
  const grainRun = [['none', join(RUN, 'grain', 'agenda-overview-overprintd2-riso-nonegrain.png')], ['fine', join(RUN, 'grain', 'agenda-overview-overprintd2-riso-finegrain.png')], ['medium', HOUSE]];
  if (grainRun.every(([, p]) => have(p))) {
    for (const [level, p] of grainRun) {
      const info = await sharp(p).extract(PATCH).resize({ width: PATCH.width * 2, kernel: 'nearest' }).png().toFile(join(CRAFT, `grain-${level}.png`));
      report('craft', `grain-${level}`, info);
    }
  } else console.log('no grain sweep in this run: the grain patches are kept as they are');
  // the instrument
  await traced(house('recording-active'), 'craft', 'bar', shift({ left: 604, top: 1352, width: 1016, height: 124 }), 3, 88);
  await panel(house('pill-recording'), 'craft', 'pill', { left: 48, top: 48, width: 80, height: 174 });
  await panel(house('premeeting-card'), 'craft', 'card', { left: 44, top: 6, width: 640, height: 124 });
}

/* ---- Toppings by theme, for a stage that follows the ink ------------------ */
if (ONLY.includes('docks')) {
  if (!existsSync(join(RUN, 'docks-by-theme'))) console.log('no docks-by-theme folder in this run: skipped');
  else {
    const STAGE = shift({ left: 640, top: 240, width: 1440, height: 508 });
    for (const theme of THEMES.filter((t) => t !== 'riso')) {
      await region(file('themes', 'agenda-overview', 'overprintd2', theme), 'craft', `dock-overprintd2-${theme}`, STAGE, 88);
      for (const dock of DOCKS.filter((d) => d !== 'overprintd2')) {
        await region(file('docks-by-theme', 'agenda-overview', dock, theme), 'craft', `dock-${dock}-${theme}`, STAGE, 88);
      }
    }
  }
}

/* ---- The comparison -------------------------------------------------------- */
if (COMPARE) {
  const dir = join(ROOT, '.impeccable/review/recrop');
  mkdirSync(dir, { recursive: true });
  const TW = 560;
  const tiles = [];
  for (const [set, name] of written) {
    const ext = name.startsWith('grain-') ? 'png' : 'webp';
    const now = join(OUT_ROOT, set, `${name}.${ext}`);
    const old = join(before, set, `${name}.${ext}`);
    const render = async (p) => (existsSync(p) ? sharp(p).flatten({ background: '#9A9A9A' }).resize({ width: TW }).png().toBuffer({ resolveWithObject: true }) : null);
    tiles.push({ label: `${set}/${name}`, a: await render(old), b: await render(now) });
  }
  const PER = 6;
  for (let i = 0; i < tiles.length; i += PER) {
    const chunk = tiles.slice(i, i + PER);
    const rowH = (t) => Math.max(t.a?.info.height ?? 60, t.b?.info.height ?? 60) + 40;
    const H = chunk.reduce((s, t) => s + rowH(t), 0) + 10;
    const comp = []; let y = 10;
    for (const t of chunk) {
      comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TW * 2 + 30}" height="30"><text x="2" y="22" font-family="Helvetica" font-size="20" font-weight="700" fill="#111">${t.label}   (before | after)</text></svg>`), left: 10, top: y });
      y += 32;
      if (t.a) comp.push({ input: t.a.data, left: 10, top: y });
      if (t.b) comp.push({ input: t.b.data, left: 10 + TW + 20, top: y });
      y += rowH(t) - 32;
    }
    const page = i / PER + 1;
    await sharp({ create: { width: TW * 2 + 40, height: H, channels: 3, background: '#C8C8C8' } }).composite(comp).jpeg({ quality: 78 }).toFile(join(dir, `recrop-${String(page).padStart(2, '0')}.jpg`));
  }
  console.log(`comparison sheets: .impeccable/review/recrop/ (${Math.ceil(tiles.length / PER)} pages, ${tiles.length} images)`);
}
