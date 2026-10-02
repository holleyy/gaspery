// Prints GRØD's share card: the picture a link to any GRØD page unfurls
// with in Messages, Slack or a post. 1200 x 630, written to
// public/og/grod.jpg.
//
// The card is a small page, set in the site's own faces and tokens with a
// real capture of the app, drawn by headless Chrome at twice size and
// reduced, so the type is as smooth as a browser sets it. Run from the repo
// root (sharp resolves there) on a Mac with Google Chrome installed:
//
//   node scripts/grod-share-card.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/og/grod.jpg');
const W = 1200, H = 630;
const pub = (path) => `file://${join(ROOT, 'public', path)}`;

// The site's own @font-face rules, pointed at the files on disk.
const faces = JSON.parse(readFileSync(join(ROOT, 'src/lib/fonts.json'), 'utf8'));
const fontCss = ['family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900', 'family=Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800']
  .map((f) => faces[f].replaceAll('url(/fonts/', `url(${pub('fonts/')}`)).join('');

// The paper's grain, as on the site (src/styles/grod.css, --g-grain).
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.137 0 0 0 0 0.125 0 0 0 0 0.098 0 0 0 0.62 -0.27'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
* { margin: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  position: relative; background: #F6F1E6 ${GRAIN} 0 0 / 240px 240px; color: #232019;
  font-family: "Atkinson Hyperlegible Next", sans-serif; -webkit-font-smoothing: antialiased;
}
/* The night ground, as a band down the right half: the light theme's ink
   with the teal dot field, and the magenta pass showing 3px past its edge,
   as under every night band on the site. */
.night { position: absolute; top: 0; right: 0; bottom: 0; width: 606px; background: #232019; box-shadow: -3px 0 0 #D63A86; }
.night::before {
  content: ""; position: absolute; inset: 0;
  background-image: radial-gradient(circle, #2AA7C8 1.3px, transparent 1.5px); background-size: 17px 17px; background-position: 6px 9px;
  opacity: .22; -webkit-mask: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, .6) 55%, transparent 100%);
}
.brand { position: absolute; left: 72px; top: 62px; font-weight: 700; font-size: 25px; letter-spacing: .12em; color: #D63A86; }
h1 {
  position: absolute; left: 68px; top: 132px;
  font-family: "Merriweather", serif; font-weight: 300; font-optical-sizing: auto;
  font-size: 128px; line-height: .98; letter-spacing: -.035em;
}
/* 3px here, where the site uses 2px: the card is nearly always seen reduced */
h1 span { position: absolute; inset: 0; transform: translate(3px, 3px); color: #D63A86; mix-blend-mode: multiply; }
.sub {
  position: absolute; left: 72px; top: 410px; width: 470px;
  font-family: "Merriweather", serif; font-weight: 300; font-optical-sizing: auto;
  font-size: 30px; line-height: 1.22; letter-spacing: -.015em; color: #6C6759;
}
.promise {
  position: absolute; left: 72px; bottom: 52px;
  font-family: "Merriweather", serif; font-style: italic; font-weight: 400; font-optical-sizing: auto;
  font-size: 21px; letter-spacing: -.005em; color: #232019;
}
/* The app, oversized, running off the right and the bottom of the card,
   seated with the app's own card lift. */
.win {
  position: absolute; left: 662px; top: 84px; width: 1000px; height: auto;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, .55)) drop-shadow(0 2px 2px rgba(0, 0, 0, .45)) drop-shadow(0 10px 14px rgba(0, 0, 0, .3));
}
</style></head><body>
  <div class="night"></div>
  <div class="brand">GRØD</div>
  <h1><span aria-hidden="true">Meetings,<br>distilled.</span>Meetings,<br>distilled.</h1>
  <p class="sub">It remembers what was said, who said it, and what you decided.</p>
  <p class="promise">Your meeting content never leaves this Mac.</p>
  <img class="win" src="${pub('shots/grod/landing/window-agenda.webp')}" alt="">
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'grod-card-'));
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
  // A JPEG: the paper's grain makes a PNG four times the size, and some
  // apps will not show a preview that heavy. Full chroma keeps the magenta
  // edges of the type clean.
  const info = await sharp(Buffer.from(shot.result.data, 'base64')).resize({ width: W, height: H, kernel: 'lanczos3' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true }).toFile(OUT);
  console.log('wrote', OUT, info.width, info.height, Math.round(info.size / 1024) + ' KB');
  ws.close();
} finally {
  chrome.kill();
}
