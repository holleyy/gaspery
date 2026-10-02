// Cuts the Craft page's images from the GRØD Demo capture set
// (~/Downloads/grod-craft-captures: three full runs and the theme, dock style
// and grain sweeps, all 2224x1664 with the window at 112,76 sized 2000x1440).
// Run from the homepage repo root so sharp resolves. Coordinates are in the
// capture's own pixels (2x).
//
// The file names carry the look: `<scene>-<dock style>-<theme>[-dark]`, as
// the Demo's capture script writes them.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = '/Users/magneticadmin/Downloads/grod-craft-captures';
const OUT = '/Users/magneticadmin/Git/homepage/public/shots/grod/craft';
mkdirSync(OUT, { recursive: true });

const WIN = { left: 112, top: 76, width: 2000, height: 1440 };
const RADIUS = 48;
const THEMES = ['riso', 'grod-warm', 'nord', 'sepia', 'red-graphite', 'flexoki', 'braun'];
const DOCKS = ['overprintd2', 'fukasawa', 'ledger', 'marginalia', 'castiglioni', 'jensen', 'crunchy2'];

const report = (name, info) => console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
const mask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);

// A whole window: cut to its bounds, masked to its corners, kept at the
// capture's width with alpha.
async function win(file, name) {
  const info = await sharp(file).extract(WIN).composite([{ input: mask(WIN.width, WIN.height, RADIUS), blend: 'dest-in' }])
    .webp({ quality: 86, alphaQuality: 92 }).toFile(`${OUT}/${name}.webp`);
  report(name, info);
}
// A region inside a window, opaque, at its own pixels.
async function region(file, name, box, quality = 88) {
  const info = await sharp(file).extract(box).flatten({ background: '#F6F1E6' }).webp({ quality }).toFile(`${OUT}/${name}.webp`);
  report(name, info);
}
// A part with a shape of its own, traced to a rounded rectangle with alpha.
async function traced(file, name, box, radius) {
  const info = await sharp(file).extract(box).composite([{ input: mask(box.width, box.height, radius), blend: 'dest-in' }])
    .webp({ quality: 88, alphaQuality: 92 }).toFile(`${OUT}/${name}.webp`);
  report(name, info);
}
// A floating panel captured by itself with the system shadow round it: keep
// the opaque shape, and in each corner fade out what is darker or lighter
// than the panel's own edge (the shadow showing through the rounded corner).
async function panel(file, name, box) {
  const { data, info: raw } = await sharp(file).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  const info = await sharp(data, { raw }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/${name}.webp`);
  report(name, info);
}

const source = (scene, theme, mode) => {
  const dark = mode === 'dark' ? '-dark' : '';
  if (theme === 'riso') return `${SRC}/full-riso-${mode}/${scene}-overprintd2-riso${dark}.png`;
  return `${SRC}/themes/${scene}-overprintd2-${theme}${dark}.png`;
};

// ---- The inks: the Agenda in each theme's light, and one meeting in each
// theme's light and dark (the pair the wipe compares).
for (const theme of THEMES) {
  await win(source('agenda-overview', theme, 'light'), `agenda-${theme}`);
  await win(source('meeting-enhanced-notes', theme, 'light'), `notes-${theme}`);
  await win(source('meeting-enhanced-notes', theme, 'dark'), `notes-${theme}-dark`);
}

// ---- One complete other look: Braun with Castiglioni.
const BRAUN = `${SRC}/full-braun-light-castiglioni`;
await win(`${BRAUN}/agenda-overview-castiglioni-braun.png`, 'braun-agenda');
await win(`${BRAUN}/tags-map-castiglioni-braun.png`, 'braun-tags');
await win(`${BRAUN}/month-page-facts-castiglioni-braun.png`, 'braun-month');

// ---- The dock styles: the top of the Agenda, the same region for each, so
// the docked card changes and nothing else does.
// (it starts below the page title's descenders, which end at row 231)
const STAGE = { left: 640, top: 240, width: 1440, height: 508 };
for (const dock of DOCKS) {
  const file = dock === 'overprintd2' ? `${SRC}/full-riso-light/agenda-overview-overprintd2-riso.png` : `${SRC}/docks/agenda-overview-${dock}-riso.png`;
  await region(file, `dock-${dock}`, STAGE);
}

// ---- Close-ups, at the capture's own pixels (shown at twice life size).
const HOUSE = `${SRC}/full-riso-light/agenda-overview-overprintd2-riso.png`;
await region(HOUSE, 'macro-card', { left: 648, top: 236, width: 1180, height: 420 }, 92);
// the card's corner: from the crop mark to the end of the title, down to
// just past "Next 2 days", so nothing is cut through
await region(HOUSE, 'macro-mark', { left: 656, top: 240, width: 620, height: 232 }, 92);
// the card's other corner, the same height: the end of the halftone field,
// the stamp, and the card's right edge
await region(HOUSE, 'macro-stamp', { left: 1420, top: 240, width: 500, height: 232 }, 92);
// The grain, off, fine and medium: the same patch of bare paper beside the
// page's title, where no text falls.
const PATCH = { left: 1320, top: 110, width: 140, height: 80 };
for (const [level, file] of [['none', `${SRC}/grain/agenda-overview-overprintd2-riso-nonegrain.png`], ['fine', `${SRC}/grain/agenda-overview-overprintd2-riso-finegrain.png`], ['medium', HOUSE]]) {
  // doubled here, unsmoothed, so the page can show it at whole pixels at any width
  const info = await sharp(file).extract(PATCH).resize({ width: PATCH.width * 2, kernel: 'nearest' }).png().toFile(`${OUT}/grain-${level}.png`);
  report(`grain-${level}`, info);
}

// ---- The instrument: the recording bar, the pill and the card.
const LIGHT = `${SRC}/full-riso-light`;
await traced(`${LIGHT}/recording-active-overprintd2-riso.png`, 'bar', { left: 604, top: 1352, width: 1016, height: 124 }, 3);
await panel(`${LIGHT}/pill-recording-overprintd2-riso.png`, 'pill', { left: 48, top: 48, width: 80, height: 174 });
await panel(`${LIGHT}/premeeting-card-overprintd2-riso.png`, 'card', { left: 44, top: 6, width: 640, height: 124 });
