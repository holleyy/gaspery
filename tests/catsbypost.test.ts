import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  ASSETS,
  LIGHTS,
  PRIVACY_PATH,
  ROTA,
  SEASONS,
  STAFF,
  STOPS,
  STORE_URL,
  SUPPORT_PATH,
  TURNTABLES,
  townAt,
  townImage,
  townLine,
} from '../src/lib/catsbypost.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const served = (path: string) => existsSync(new URL(`../public${path}`, import.meta.url));

const page = read('src/pages/catsbypost.astro');
const css = read('src/styles/catsbypost.css');
const board = read('public/shots/catsbypost/board/board.js');
const faces = JSON.parse(read('src/lib/fonts.json')) as Record<string, string>;

test('the page is static, light-only, and set in the game\'s faces, not the site pair', () => {
  assert.doesNotMatch(page, /prerender = false/);
  assert.match(page, /theme="light"/);
  assert.match(page, /family=Besley:ital,wght@0,500;0,800;1,500/);
  assert.match(page, /family=Signika:wght@400;500;600/);
  assert.doesNotMatch(page, /Merriweather|Inter:/);
  // Base fails the build on a family string with no local files; this says why sooner.
  for (const family of ['family=Besley:ital,wght@0,500;0,800;1,500', 'family=Signika:wght@400;500;600']) {
    assert.ok(faces[family], `${family} is not in src/lib/fonts.json; run node scripts/fetch-fonts.mjs`);
    for (const [, file] of faces[family].matchAll(/url\((\/fonts\/[^)]+)\)/g)) assert.ok(served(file), `${file} is missing`);
  }
});

test('the roster entry sends both the home page and Studio to the page', () => {
  const yaml = read('src/content/apps/catsbypost.yaml');
  assert.match(yaml, /^site: \/catsbypost$/m);
  assert.match(yaml, /^url: \/catsbypost$/m);
  assert.match(yaml, /^proof: \/shots\/catsbypost\/proof\.webp$/m);
  assert.ok(served('/shots/catsbypost/proof.webp'));
});

test('the round is the game\'s: six places, eight chapters, a hundred puzzles', () => {
  assert.equal(STOPS.length, 6);
  assert.equal(STOPS.reduce((n, s) => n + s.puzzles, 0), 100);
  assert.deepEqual(STOPS.map((s) => s.chapters).join(' '), 'Chapters 1 and 2 Chapters 3 and 4 Chapter 5 Chapter 6 Chapter 7 Chapter 8');
  for (const stop of STOPS) {
    // Each place's sky is a colour the stylesheet declares; the page sets it by name.
    assert.match(css, new RegExp(`${stop.sky}: #[0-9a-f]{6};`), `${stop.sky} is not declared in catsbypost.css`);
    assert.equal(stop.names.length, 3);
    assert.ok(stop.image.alt.length > 20);
  }
  assert.equal(ROTA.length, 3);
  assert.equal(STAFF.length, 8);
});

test('every picture, film and script the page names is in public', () => {
  const paths = [
    ...STOPS.map((s) => s.image.src),
    ...STAFF.map((c) => `${ASSETS}/coats/${c.file}.webp`),
    ...SEASONS.flatMap((s) => LIGHTS.map((l) => townImage(s, l))),
    ...[...page.matchAll(/\$\{ASSETS\}(\/[a-z0-9/.-]+)/g)].map((m) => ASSETS + m[1]),
    ...[...page.matchAll(/"(\/(?:shots|og)\/catsbypost[a-z0-9/.-]*\.[a-z0-9]+)"/g)].map((m) => m[1]),
    ...[...page.matchAll(/'(\/og\/[a-z0-9/.-]+)'/g)].map((m) => m[1]),
    ...[...css.matchAll(/url\((\/shots\/[^)]+)\)/g)].map((m) => m[1]),
  ];
  assert.ok(paths.length >= 30, `only ${paths.length} paths found; the page's asset references have changed shape`);
  for (const path of paths) assert.ok(served(path), `${path} is not in public`);
  for (const must of ['/shots/catsbypost/board/board.js', '/shots/catsbypost/board/office.webp', '/shots/catsbypost/board/acting.webp', '/shots/catsbypost/film.mp4', '/og/catsbypost.jpg']) {
    assert.ok(paths.includes(must), `${must} is no longer referenced`);
  }
});

test('the board is the built bundle, served as a classic script, with the three puzzles', () => {
  assert.match(page, /<script is:inline defer src="\/shots\/catsbypost\/board\/board\.js"><\/script>/);
  assert.match(board, /^\/\* Cats by Post: the Sorting Office board\. Built by scripts\/catsbypost-board\.mjs/);
  assert.match(board, /window\.CatsByPostBoard=/);
  for (const id of ['warm-up', '2-2', '2-3']) assert.match(board, new RegExp(`id:"${id}"`), `level ${id} is not in the bundle`);
  // The plate's numbers: where the game's floor sits on the render (see the build script).
  assert.match(page, /data-plate-w="2800" data-plate-h="2100" data-origin-x="1480" data-origin-y="1103" data-hw="96"/);
  // The host mounts whatever carries this attribute and reads these hooks from it.
  for (const hook of ['data-cbp-board', 'data-stage', 'data-title', 'data-status', 'data-send', 'data-next', 'data-store', 'data-hint', 'data-clear', 'data-stamps', 'data-done', 'data-when="start"', 'data-when="tried"']) {
    assert.ok(page.includes(hook), `${hook} is missing from the page`);
  }
});

test('the docket is written in the warm-up\'s opening state, so it does not change shape when the script arrives', () => {
  assert.deepEqual(TURNTABLES.map((t) => t.type), ['plain', 'ginger', 'blue']);
  assert.match(page, /data-tray=\{t\.type\} hidden=\{t\.type !== 'plain'\}/);
  assert.match(page, /data-level="0" aria-current="true"/);
  assert.match(page, /data-clear disabled/);
  for (const hidden of ['data-when="tried" hidden', 'data-stamps hidden', 'data-done hidden', 'data-next hidden', 'data-store hidden']) {
    assert.ok(page.includes(hidden), `${hidden} should start hidden`);
  }
});

test('nothing hidden is un-hidden by a display rule', () => {
  // An author `display` beats the hidden attribute. The board hides and shows
  // by that attribute, and the dials are rendered hidden until the script runs.
  assert.match(css, /\.play \[hidden\] \{ display: none !important; \}/);
  assert.match(css, /\.dials:not\(\[hidden\]\) \{ display: grid;/);
  assert.doesNotMatch(css, /\.dials \{[^}]*display/);
  assert.match(page, /<div class="dials" hidden>/);
});

test('the film and the store link work without the script', () => {
  assert.match(page, /<a class="link" href=\{`\$\{ASSETS\}\/film\.mp4`\} data-film>/);
  assert.match(page, /<a class="play__btn play__btn--main" href=\{STORE_URL\} data-store hidden>/);
  assert.match(page, /<section class="close" id="release">/);
});

test('the window opens on the visitor\'s own season and hour', () => {
  assert.deepEqual(townAt(new Date(2026, 10, 20, 15, 0)), { season: 'autumn', light: 'day', word: 'afternoon' });
  assert.deepEqual(townAt(new Date(2026, 0, 3, 23, 0)), { season: 'winter', light: 'night', word: 'night' });
  assert.deepEqual(townAt(new Date(2026, 11, 24, 8, 0)), { season: 'winter', light: 'day', word: 'morning' });
  assert.deepEqual(townAt(new Date(2026, 5, 21, 6, 0)), { season: 'summer', light: 'night', word: 'morning' });
  assert.deepEqual(townAt(new Date(2026, 3, 1, 19, 30)), { season: 'spring', light: 'night', word: 'evening' });
  assert.deepEqual(townAt(new Date(2026, 8, 1, 3, 0)), { season: 'autumn', light: 'night', word: 'night' });
});

test('the line beside the window says whose view it is', () => {
  const mine = townAt(new Date(2026, 10, 20, 19, 0));
  assert.equal(townLine('autumn', 'night', mine).headline, 'It’s an autumn evening in town.');
  assert.equal(townLine('winter', 'night', mine).headline, 'This is a winter night in town.');
  assert.equal(townLine('autumn', 'day', mine).headline, 'This is an autumn afternoon in town.');
  assert.equal(townLine('spring', 'day', mine).phrase, 'a spring afternoon');
});

test('no em dashes on the page, in its stylesheet or in its facts', () => {
  for (const [name, text] of [['page', page], ['stylesheet', css], ['facts', read('src/lib/catsbypost.ts')]] as const) {
    assert.doesNotMatch(text, /—/, `em dash in the ${name}`);
  }
});

/* ---- Privacy and support --------------------------------------------------- */
const doc = read('src/pages/catsbypost/support.astro');
/* the text a visitor reads: the markup without its comments */
const docText = doc.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<!--[\s\S]*?-->/g, '').split('<main')[1];

test('the policy is published whole: nothing left to fill in, a date, and its three parts', () => {
  assert.doesNotMatch(docText, /\[[^\]]*\]/, 'a [placeholder] is still in the policy');
  assert.doesNotMatch(doc, /—/);
  assert.match(docText, /The game never goes online\./);
  assert.match(doc, /const UPDATED = '\d{1,2} [A-Z][a-z]+ 20\d\d';/);
  for (const id of ['privacy', 'support', 'small-print', 'contact']) assert.ok(docText.includes(`id="${id}"`), `#${id} is missing`);
  assert.match(doc, /const MAIL = 'alex@gaspery\.com';/);
});

test('the policy and the imprint state the same company facts', () => {
  const imprint = read('src/components/Imprint.astro');
  const number = imprint.match(/company number (\d+)/)?.[1];
  const office = imprint.match(/Registered office: ([^<]+?)\.</)?.[1];
  assert.ok(number && office);
  assert.ok(docText.includes(`company number ${number}`), 'company number');
  assert.ok(docText.includes(`Registered office: ${office}`), 'registered office');
});

test('the policy describes what this website really does', () => {
  const base = read('src/layouts/Base.astro');
  // if the site counts page views, the policy says so
  assert.equal(/counterscale/i.test(base), /It counts page views\./.test(docText));
  // the typefaces are served from this site, so the policy names no font service
  assert.doesNotMatch(base, /fonts\.(googleapis|gstatic)\.com/);
  // "the puzzles stay in your browser": the board and the page store and send nothing
  for (const file of ['scripts/catsbypost-host.js', 'src/pages/catsbypost.astro']) {
    assert.doesNotMatch(read(file), /localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon|WebSocket/, file);
  }
  assert.match(docText, /The puzzles on the game’s page stay in your browser\./);
});

test('both Cats by Post pages end in the foot that links the policy, and /privacy forwards to it', () => {
  assert.equal(SUPPORT_PATH, '/catsbypost/support/');
  assert.equal(PRIVACY_PATH, '/catsbypost/privacy/');
  assert.match(read('src/components/CbpFoot.astro'), /href=\{SUPPORT_PATH\}/);
  for (const text of [page, doc]) assert.match(text, /<CbpFoot \/>/);
  // The forward is a raw rule, in both forms: Workers Static Assets matches them literally.
  const rules = read('public/_redirects');
  for (const from of [PRIVACY_PATH, PRIVACY_PATH.replace(/\/$/, '')]) {
    assert.match(rules, new RegExp(`^${from}\\s+${SUPPORT_PATH}\\s+301$`, 'm'), `${from} does not forward`);
  }
  // The policy is the first thing in the document, so the forward needs no fragment.
  assert.ok(docText.indexOf('id="privacy"') < docText.indexOf('id="support"'));
});

/* ---- Released --------------------------------------------------------------- */
test('the game is out: every way to it is the App Store, and nothing still says it is coming', () => {
  // No country in the address, so Apple sends each visitor to their own storefront.
  assert.equal(STORE_URL, 'https://apps.apple.com/app/cats-by-post/id6834231907');
  // the wordmark row, the docket after the last puzzle, and the close
  assert.equal(page.match(/href=\{STORE_URL\}/g)?.length, 3);
  for (const [name, text] of [['page', page], ['policy', doc], ['share card', read('scripts/catsbypost-share-card.mjs')]] as const) {
    assert.doesNotMatch(text, /Coming to|release day/, `the ${name} still says the game is coming`);
  }
  assert.match(read('src/content/apps/catsbypost.yaml'), /^status: live$/m);
  // the wordmark row's link is the one thing in it a phone keeps
  assert.match(css, /\.mast span\.small \{ display: none; \}/);
});
