import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BETA_URL, GROD_EXPLORATIONS, GROD_GO_PATH, GROD_PAGES } from '../src/lib/grod.ts';
import {
  DEMO_MEETINGS,
  DEMO_TODAY,
  countIn,
  countsByDay,
  plannerRows,
} from '../src/lib/grodDemo.ts';
import { DOCK_STYLES, HOUSE_THEME, THEMES, contrast, inkCss, tokens } from '../src/lib/grodThemes.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the page is /grod, and its call to action is counted on its own go page', () => {
  assert.equal(GROD_GO_PATH, '/grod/go/');
  const page = read('src/pages/grod/index.astro');
  assert.match(page, /home="\/grod\/"/);
  assert.match(read('src/components/GrodSentence.astro'), /href=\{GROD_GO_PATH\}/);
  assert.match(read('src/pages/grod/go.astro'), /GrodGo/);
});

test('a phone keeps the page links in the bar and drops only the in-page ones', () => {
  const css = read('src/styles/grod.css');
  assert.match(css, /@media \(max-width: 640px\) \{[^}]*\}\s*\.g-top \{[^}]*\}\s*\.g-nav a\[href\^="#"\] \{ display: none; \}/);
  assert.doesNotMatch(css, /\.g-nav a:not\(\.g-bezel\) \{ display: none; \}/);
});

test('the Features page is reachable from the home page and counts its beta click', () => {
  const page = read('src/pages/grod/features.astro');
  assert.match(page, /THESIS:/);
  assert.match(page, /href=\{GROD_GO_PATH\}/);
  // the bar and the footer list the site's pages from one list, and the
  // home page offers Features beside each call to action
  assert.ok(GROD_PAGES.some((p) => p.href === '/grod/features/'));
  const home = read('src/pages/grod/index.astro');
  assert.match(home, /nav=\{\[\.\.\.GROD_PAGES,/);
  assert.match(home, /more=\{\{ href: GROD_PAGES\[0\]\.href/);
  assert.match(read('src/components/GrodNight.astro'), /\.\.\.GROD_PAGES\]/);
  assert.equal(read('src/components/GrodSentence.astro').match(/\{more && <a class="g-more"/g)?.length, 2);
  // every time on the line has its section
  const ids = [...page.matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
  assert.equal(ids.length, 7);
  for (const id of ids) assert.match(page, new RegExp(`<section class="ge-clause[^"]*" id="${id}"`), id);
});

test('the site has one footer: Features ends on the home page\'s motif', () => {
  const motif = read('src/pages/grod/index.astro').match(/motif="([a-z]+)"/)?.[1];
  assert.equal(motif, 'oats');
  assert.match(read('src/pages/grod/features.astro'), new RegExp(`<GrodNight motif="${motif}"`));
});

test('every stack on the Features page names windows that exist', () => {
  const page = read('src/pages/grod/features.astro');
  const srcs = [...page.matchAll(/\{ n: \d, src: '([a-z-]+)'/g)].map((m) => m[1]);
  assert.equal(srcs.length, 5);
  for (const src of srcs) readFileSync(new URL(`../public/shots/grod/landing/${src}.webp`, import.meta.url));
});

test('every feature on the Features page has an address of its own', () => {
  const page = read('src/pages/grod/features.astro');
  // each heading links to its own row, lead or list, which carries the id
  const headings = [...page.matchAll(/<h3 class="g-h2">(.*?)<\/h3>/g)];
  assert.ok(headings.length >= 20);
  for (const [, inner] of headings) {
    const id = inner.match(/^<a class="gt-anchor" href="#([a-z-]+)">/)?.[1];
    assert.ok(id, `no address on: ${inner}`);
    assert.match(page, new RegExp(`<div class="(ge-row|gt-lead|gt-needs)" id="${id}">`), id);
  }
  // receipts are addressable too, and no address is used twice (the seven
  // times' own ids are in the same list, so a clash with one fails here)
  assert.doesNotMatch(page, /<div><dt>/);
  const ids = [...page.matchAll(/ id="([^"{]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
});

test('the Features page never counts the options', () => {
  const page = read('src/pages/grod/features.astro');
  assert.doesNotMatch(page, /\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(themes|toppings|fonts|dock styles)\b/i);
  assert.doesNotMatch(page, /—/);
});

test('the explorations are built in development only', () => {
  const route = read('src/pages/grod/[arm].astro');
  assert.match(route, /if \(!import\.meta\.env\.DEV\) return \[\];/);
  for (const arm of GROD_EXPLORATIONS) read(`src/explorations/grod/${arm}.astro`);
});

test('the app roster sends /studio and /apps/grod to the page', () => {
  assert.match(read('src/content/apps/grod.yaml'), /^site: \/grod$/m);
});

test('the beta link is an email, no form, no tracker', () => {
  assert.match(BETA_URL, /^mailto:hello@gaspery\.com\?subject=/);
});

/* The planner plots real meetings: the port of DemoHistory.swift must
   reproduce what the app's own year and month pages print. */
/* The app's sidebar prints April 7 and the year page 44: those counts
   include the one note in the Demo (Pilot demo checklist, 14 Apr). The
   planner plots meetings, so it holds 6 and 43. */
test('2026 has the meetings the year page shows, month by month', () => {
  assert.equal(countIn('2026-01'), 12);
  assert.equal(countIn('2026-02'), 12);
  assert.equal(countIn('2026-03'), 13);
  assert.equal(countIn('2026-04'), 6);
  assert.equal(countIn('2026'), 43);
});

test('November 2025 has 14 meetings, in the weeks the month page shows', () => {
  assert.equal(countIn('2025-11'), 14);
  const counts = countsByDay();
  const week = (from: number, to: number) => {
    let n = 0;
    for (let d = from; d <= to; d += 1) n += counts.get(`2025-11-${String(d).padStart(2, '0')}`) ?? 0;
    return n;
  };
  assert.deepEqual([week(1, 2), week(3, 9), week(10, 16), week(17, 23), week(24, 30)], [0, 4, 4, 3, 3]);
});

test('the month facts hold: Nils Rud is first met on Tue 4 Nov, and December is empty', () => {
  const nils = DEMO_MEETINGS.filter((m) => m.people.includes('Nils Rud')).map((m) => m.date).sort();
  assert.equal(nils[0], '2025-11-04');
  assert.equal(countIn('2025-12'), 0);
  const platformNov = DEMO_MEETINGS.filter((m) => m.date.startsWith('2025-11') && m.tags.includes('Platform')).length;
  const platformOct = DEMO_MEETINGS.filter((m) => m.date.startsWith('2025-10') && m.tags.includes('Platform')).length;
  assert.deepEqual([platformOct, platformNov], [2, 4]);
});

test('the planner is twelve full rows ending on the month that holds today', () => {
  const rows = plannerRows();
  assert.equal(rows.length, 12);
  assert.equal(rows[0].month, '2025-05');
  assert.equal(rows[11].month, '2026-04');
  assert.equal(rows[11].cells[15]?.date, DEMO_TODAY);
  assert.equal(rows[11].cells[15]?.weekday, 3); // Thursday
  assert.equal(rows[11].cells[30], null); // April has 30 days
  assert.equal(rows[0].cells[30]?.day, 31);
});

test('the page and each exploration carry a direction contract', () => {
  for (const file of ['src/pages/grod/index.astro', ...GROD_EXPLORATIONS.map((arm) => `src/explorations/grod/${arm}.astro`)]) {
    const page = read(file);
    assert.match(page, /THESIS:/, file);
    assert.match(page, /FINISH: unreviewed and undocumented is unfinished/, file);
  }
});

/* ---- The Craft page ----------------------------------------------------- */
test('the Craft page is listed with the site\'s pages and carries its contract', () => {
  assert.ok(GROD_PAGES.some((p) => p.href === '/grod/craft/'));
  const page = read('src/pages/grod/craft.astro');
  assert.match(page, /THESIS:/);
  assert.match(page, /FINISH: unreviewed and undocumented is unfinished/);
  assert.match(page, /href=\{GROD_GO_PATH\}/);
  assert.match(page, /<GrodNight motif="oats"/);
});

test('the Craft page never counts the options, and has no em dash', () => {
  const page = read('src/pages/grod/craft.astro');
  assert.doesNotMatch(page, /\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+(other\s+)?(themes|toppings|fonts|dock styles|inks)\b/i);
  assert.doesNotMatch(page, /—/);
});

test('every ink the Craft page offers has its captures, and every topping its stage', () => {
  const shot = (name: string) => readFileSync(new URL(`../public/shots/grod/craft/${name}.webp`, import.meta.url));
  assert.equal(THEMES[0].id, HOUSE_THEME);
  for (const t of THEMES) {
    shot(`agenda-${t.id}`);
    shot(`notes-${t.id}`);
    shot(`notes-${t.id}-dark`);
  }
  for (const d of DOCK_STYLES) shot(`dock-${d.id}`);
  for (const name of ['braun-agenda', 'braun-tags', 'braun-month', 'macro-card', 'macro-mark', 'macro-stamp', 'bar', 'pill', 'card']) shot(name);
});

test('every ink keeps the page readable: text, links and the key at 4.5 to 1', () => {
  for (const t of THEMES) {
    for (const [pal, dark] of [[t.light, false], [t.dark, true]] as const) {
      const k = tokens(pal, dark);
      const on = k['--color-paper'];
      for (const key of ['--color-ink', '--color-ink-secondary', '--color-brand-strong'] as const) {
        assert.ok(contrast(k[key], on) >= 4.5, `${t.id} ${dark ? 'dark' : 'light'} ${key} ${contrast(k[key], on).toFixed(2)}`);
      }
      assert.ok(contrast(k['--g-key-ink'], k['--g-key']) >= 4.5, `${t.id} ${dark ? 'dark' : 'light'} key ${contrast(k['--g-key-ink'], k['--g-key']).toFixed(2)}`);
    }
  }
});

test('the re-ink stylesheet covers every ink but the house one, on both grounds', () => {
  const css = inkCss('.gc');
  for (const t of THEMES) {
    const has = css.includes(`.gc[data-ink="${t.id}"]{`);
    assert.equal(has, t.id !== HOUSE_THEME, t.id);
    if (t.id !== HOUSE_THEME) assert.ok(css.includes(`.gc[data-ink="${t.id}"] .ge-clause[data-band="dark"]`), t.id);
  }
});

test('the Craft page can be opened in an ink, and its address follows the ink', () => {
  const page = read('src/pages/grod/craft.astro');
  // set before the first paint, from a list of the inks that exist
  assert.match(page, /<script is:inline define:vars=\{\{ inks: THEMES\.map\(\(t\) => t\.id\), house: HOUSE_THEME \}\}>/);
  assert.match(page, /new URLSearchParams\(location\.search\)\.get\('ink'\)/);
  assert.match(page, /inks\.indexOf\(ink\) !== -1/);
  assert.match(page, /history\.replaceState/);
});

test('Features ends on the craft: the wipe, and the way to the Craft page', () => {
  const page = read('src/pages/grod/features.astro');
  assert.match(page, /<div class="gt-lead" id="craft">/);
  assert.match(page, /<GrodWipe\s+left="notes-riso" right="notes-riso-dark"/);
  assert.match(page, /<a class="g-more" href="\/grod\/craft\/">/);
  // the wipe's styles are shared, since two pages use it
  assert.match(read('src/styles/grod.css'), /\.g-wipe__range \{/);
  assert.doesNotMatch(read('src/styles/grod-craft.css'), /wipe__range/);
});

