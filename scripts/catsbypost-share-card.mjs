// Prints the Cats by Post share card: the picture a link to /catsbypost
// unfurls with in Messages, Slack or a post. 1200 x 630, written to
// public/og/catsbypost.jpg.
//
// The card is the top of the page itself: the headline in the page's own
// faces over the sunset, beside the game's render of the Sorting Office.
// Drawn by headless Chrome at twice size and reduced, as the GRØD card is
// (scripts/grod-share-card.mjs). Run from the repo root (sharp resolves
// there) on a Mac with Google Chrome installed:
//
//   node scripts/catsbypost-share-card.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/og/catsbypost.jpg');
const W = 1200, H = 630;
const pub = (path) => `file://${join(ROOT, 'public', path)}`;

// The site's own @font-face rules, pointed at the files on disk.
const faces = JSON.parse(readFileSync(join(ROOT, 'src/lib/fonts.json'), 'utf8'));
const fontCss = ['family=Besley:ital,wght@0,500;0,800;1,500', 'family=Signika:wght@400;500;600']
  .map((f) => faces[f].replaceAll('url(/fonts/', `url(${pub('fonts/')}`)).join('');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
* { margin: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { position: relative; background: #f9a08a; color: #17392e; font-family: Signika, sans-serif; -webkit-font-smoothing: antialiased; }
/* The plate, as on the page: the game's render of the Sorting Office with
   its sky faded into the card's own, and its left edge let go so the words
   have the sunset to themselves. */
.plate { position: absolute; left: 118px; top: -250px; width: 1500px; height: 1125px;
  -webkit-mask-image: linear-gradient(90deg, #0000 29%, #000 47%); mask-image: linear-gradient(90deg, #0000 29%, #000 47%); }
.words { position: absolute; left: 72px; top: 64px; width: 560px; display: grid; gap: 26px; }
.wm { font: 800 30px/1 Besley, serif; letter-spacing: -.015em; }
h1 { font: 800 66px/1.03 Besley, serif; letter-spacing: -.022em; margin-top: 44px; }
h1 span { display: block; white-space: nowrap; }
p { font-size: 26px; line-height: 1.35; font-weight: 500; max-width: 15em; }
</style></head><body>
<img class="plate" src="${pub('shots/catsbypost/board/office.webp')}" alt="">
<div class="words">
  <div class="wm">Cats by Post</div>
  <h1><span>The post</span><span>has arrived.</span><span>It’s mostly cats.</span></h1>
  <p>A cosy routing puzzle game for iPhone, iPad and Mac. Out now.</p>
</div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'cbp-card-'));
const page = join(dir, 'card.html');
writeFileSync(page, html);

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(dir, 'profile')}`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  let target;
  for (let i = 0; i < 50 && !target; i += 1) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((resolve) => { id += 1; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  await send('Page.navigate', { url: `file://${page}` });
  await sleep(800);
  const ready = await send('Runtime.evaluate', {
    expression: `(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode().catch(() => null))); return [...document.fonts].filter((f) => f.status === 'loaded').length + ' faces, ' + [...document.images].filter((i) => i.naturalWidth).length + ' images'; })()`,
    awaitPromise: true, returnByValue: true,
  });
  console.log(ready.result?.result?.value);
  await sleep(300);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const info = await sharp(Buffer.from(shot.result.data, 'base64')).resize({ width: W, height: H, kernel: 'lanczos3' })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(OUT);
  console.log('wrote', OUT, info.width, info.height, Math.round(info.size / 1024) + ' KB');
  ws.close();
} finally {
  chrome.kill();
}
