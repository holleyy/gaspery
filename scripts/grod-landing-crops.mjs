// Crops the GRØD Demo captures (2224x1664 PNGs with alpha, the window at
// 112,76 sized 2000x1440 with 48px corners, a faint shadow around it) into
// the page-ready details for /grod. Run from the homepage repo root so sharp
// resolves. Coordinates are in the capture's own pixels (2x).
//
// Two kinds of output. A window keeps its alpha: it is cut to the opaque
// bounds and masked to its own corner radius, so the page can lay it on
// paper and give it a real shadow. A detail is an opaque region inside the
// window, cut at the UI's own edges.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SRC = '/Users/magneticadmin/Downloads/grod-demo-screenshots-6c9cd70b';
const OUT = '/Users/magneticadmin/Git/homepage/public/shots/grod/landing';
mkdirSync(OUT, { recursive: true });

const WIN = { left: 112, top: 76, width: 2000, height: 1440 };
const RADIUS = 48;
// Kept at the capture's own width. An earlier 1600px export was resampled
// twice (here, then by the browser) and the sidebar's small type went soft.
const WINDOW_WIDTH = 2000;

const windows = [
  ['meeting-enhanced-notes', 'window-notes'],
  ['meeting-summary', 'window-summary'],
  ['meeting-transcript', 'window-transcript'],
  ['timeline-year', 'window-year'],
  ['timeline-year-2025', 'window-year-2025'],
  ['month-page-facts', 'window-month'],
  ['people-overview', 'window-people'],
  ['series-ladder', 'window-series'],
  ['meeting-answer-with-evidence', 'window-answer'],
  ['person-context', 'window-person'],
  ['meeting-series-context', 'window-continuity'],
  ['agenda-overview', 'window-agenda'],
  ['recording-active', 'window-recording'],
  ['people-collective', 'window-shared'],
  ['tags-queue', 'window-tags'],
  ['tags-map', 'window-tags-map'],
  ['search-project-decision', 'window-search'],
];

// The first-run beats (680x640-point windows, already cut to the window
// with alpha). Beat 7 is a real workspace, not the Demo, and stays out.
const ONBOARDING = '/Users/magneticadmin/Downloads/grod-onboarding-beats-2da5d44d';
const onboarding = [
  ['2-invitation', 'onboard-invitation'],
  ['3-proof', 'onboard-proof'],
  ['4-disclosure', 'onboard-disclosure'],
];

// UI elements that float over the window (a popover, a toast): traced to
// their own rounded shape with alpha, so the page lays them on paper like a
// window. Boxes measured on the capture at 1px inside the antialiased edge.
const elements = [
  // the popover is cut 2px inside its own border: its corners are not quite
  // circular, and at the border the window behind showed through as specks
  ['meeting-series-context', 'popover', { left: 975, top: 312, width: 698, height: 870 }, 28],
  ['agenda-deleting', 'toast', { left: 1623, top: 1407, width: 375, height: 67 }, 10],
  ['month-page-palette', 'palette', { left: 554, top: 314, width: 1116, height: 956 }, 31],
  // the recording bar and the Agenda's docked card: square-cornered print
  // stock with a cut edge beneath, measured to the pixel
  ['recording-system-stalled', 'bar-stalled', { left: 604, top: 1352, width: 1283, height: 124 }, 3],
  ['recording-processing', 'bar-processing', { left: 604, top: 1364, width: 794, height: 112 }, 3],
  ['agenda-end-of-day', 'dock-breathe', { left: 701, top: 256, width: 1200, height: 118 }, 3],
];

const details = [
  ['month-page-facts', 'stood-out', { left: 662, top: 329, width: 1280, height: 242 }],
  ['month-page-facts', 'weeks', { left: 690, top: 625, width: 1215, height: 300 }],
  ['month-page-facts', 'week45', { left: 690, top: 1205, width: 1215, height: 165 }],
  // between the ladder's two rules, with even padding round the row
  ['series-ladder', 'skipped', { left: 662, top: 652, width: 1240, height: 196 }],
  ['meeting-series-context', 'continuity', { left: 940, top: 270, width: 780, height: 930 }],
  ['meeting-answer-with-evidence', 'line-0302', { left: 678, top: 714, width: 1202, height: 164 }],
  ['meeting-answer-with-evidence', 'ask', { left: 606, top: 1076, width: 790, height: 282 }],
  ['meeting-transcript', 'transcript-lines', { left: 690, top: 640, width: 1215, height: 420 }],
  ['tags-index', 'merge', { left: 677, top: 294, width: 1250, height: 195 }],
  ['person-context', 'voice', { left: 662, top: 312, width: 1280, height: 200 }],
  ['agenda-deleting', 'deleted', { left: 1600, top: 1385, width: 420, height: 110 }],
  ['intelligence-retry-unavailable', 'retry', { left: 668, top: 503, width: 1272, height: 302 }],
];

const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIN.width}" height="${WIN.height}"><rect width="${WIN.width}" height="${WIN.height}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`,
);

for (const [src, name] of windows) {
  // sharp composites after resizing whatever the call order, so mask at
  // the capture's size first, then resize the masked buffer.
  const masked = await sharp(`${SRC}/${src}.png`)
    .extract(WIN)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const info = await sharp(masked)
    .resize({ width: WINDOW_WIDTH })
    .webp({ quality: 90, alphaQuality: 92 })
    .toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
}

for (const [src, name] of onboarding) {
  const info = await sharp(`${ONBOARDING}/${src}.png`).webp({ quality: 86, alphaQuality: 90 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
}

// The first run's two proof moments, captured later with the system shadow
// and with the pointer over the paper. The window is at 112,76 sized
// 1360x1280 with 48px corners. The pointer is painted out with a patch of
// the same rows from 108px to the left: the paper's dot texture repeats on
// a 9px pitch, so the patch lines up with it exactly.
const proof = [
  ['Screenshot 2026-10-01 at 11.47.36', 'onboard-voice', { left: 1190, top: 1040, width: 56, height: 62 }],
  ['Screenshot 2026-10-01 at 11.47.50', 'onboard-both', { left: 990, top: 1138, width: 56, height: 64 }],
];
const PROOF_WIN = { left: 112, top: 76, width: 1360, height: 1280 };
const proofMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${PROOF_WIN.width}" height="${PROOF_WIN.height}"><rect width="${PROOF_WIN.width}" height="${PROOF_WIN.height}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`,
);
for (const [src, name, pointer] of proof) {
  const file = `${ONBOARDING}/${src}.png`;
  const patch = await sharp(file).extract({ ...pointer, left: pointer.left - 108 }).png().toBuffer();
  const clean = await sharp(file).composite([{ input: patch, left: pointer.left, top: pointer.top }]).png().toBuffer();
  const masked = await sharp(clean).extract(PROOF_WIN).composite([{ input: proofMask, blend: 'dest-in' }]).png().toBuffer();
  const info = await sharp(masked).webp({ quality: 86, alphaQuality: 90 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
}

for (const [src, name, box, radius] of elements) {
  const m = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}"><rect width="${box.width}" height="${box.height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  const info = await sharp(`${SRC}/${src}.png`)
    .extract(box)
    .composite([{ input: m, blend: 'dest-in' }])
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
}

// The settings window is white, not paper.
{
  const info = await sharp(`${SRC}/settings-transcription.png`).extract({ left: 380, top: 164, width: 1464, height: 308 }).flatten({ background: '#FFFFFF' }).webp({ quality: 88 }).toFile(`${OUT}/engines.webp`);
  console.log('engines', info.width, info.height, Math.round(info.size / 1024) + 'k');
}

// Two floating elements captured by themselves, with the system shadow and
// the pointer over them (~/Downloads/ftshot). Each is cut to its own opaque
// shape (the shadow is dropped by thresholding the alpha) after the pointer
// is painted out with patches of the same element: plain grained paper for
// the card; for the pill, the meter bar one pitch (13px) to the left, then
// paper and the red strip from 46 rows above.
const FT = '/Users/magneticadmin/Downloads/ftshot';
const floating = [
  ['Screenshot 2026-10-01 at 15.31.05', 'card', { left: 56, top: 8, width: 640, height: 124 },
    [[{ left: 422, top: 12, width: 28, height: 42 }, 488, 47]]],
  ['Screenshot 2026-10-01 at 15.31.45', 'pill', { left: 48, top: 48, width: 80, height: 328 },
    [[{ left: 85, top: 112, width: 13, height: 46 }, 98, 112], [{ left: 111, top: 66, width: 7, height: 46 }, 111, 112], [{ left: 118, top: 66, width: 10, height: 46 }, 118, 112]]],
];
for (const [src, name, box, patches] of floating) {
  const file = `${FT}/${src}.png`;
  const layers = [];
  for (const [from, left, top] of patches) layers.push({ input: await sharp(file).extract(from).png().toBuffer(), left, top });
  const clean = await sharp(file).composite(layers).png().toBuffer();
  const { data, info: raw } = await sharp(clean).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // The system shadow is darkest in the gaps outside the element's rounded
  // corners, where the threshold alone would keep it as black wedges. In
  // each corner, anything darker than the element's own edge is shadow:
  // fade it out by its lightness (edge grey is 0x99 and up, shadow 0x40
  // and down).
  const CORNER = 12;
  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const i = (y * raw.width + x) * 4;
      data[i + 3] = data[i + 3] >= 140 ? 255 : 0;
      const inCorner = (x < CORNER || x >= raw.width - CORNER) && (y < CORNER || y >= raw.height - CORNER);
      if (!inCorner) continue;
      const light = Math.max(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = Math.min(data[i + 3], Math.round(Math.max(0, Math.min(1, (light - 0x40) / (0x99 - 0x40))) * 255));
    }
  }
  const info = await sharp(data, { raw }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
}

for (const [src, name, box] of details) {
  const info = await sharp(`${SRC}/${src}.png`).extract(box).flatten({ background: '#F6F1E6' }).webp({ quality: 84 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, info.width, info.height, Math.round(info.size / 1024) + 'k');
}

// Where each detail and element sits inside its window, as percentages of
// the window, and its pixel size. The pop-out component reads this, so a
// box changed here moves the card on the page with it.
const pct = (v, of) => Math.round((v / of) * 10000) / 100;
const shots = {};
for (const [, name, box] of [...details, ...elements]) {
  shots[name] = {
    w: box.width, h: box.height,
    rect: [pct(box.left - WIN.left, WIN.width), pct(box.top - WIN.top, WIN.height), pct(box.width, WIN.width), pct(box.height, WIN.height)],
  };
}
writeFileSync('/Users/magneticadmin/Git/homepage/src/lib/grodShots.json', JSON.stringify(shots, null, 2) + '\n');
console.log('wrote src/lib/grodShots.json');
