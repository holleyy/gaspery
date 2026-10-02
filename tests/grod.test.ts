import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BETA_URL, GROD_CARD, GROD_EXPLORATIONS, GROD_FAQ_PATH, GROD_GO_PATH, GROD_PAGES, GROD_POLICY_PATH, GROD_PRIVACY_PATH } from '../src/lib/grod.ts';
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

test('one bar on every GRØD page, and on a phone its pages fold into a menu', () => {
  for (const file of ['src/components/GrodSentence.astro', 'src/pages/grod/features.astro', 'src/pages/grod/craft.astro', 'src/pages/grod/privacy.astro', 'src/pages/grod/faq.astro', 'src/pages/grod/privacy-policy.astro']) {
    const page = read(file);
    assert.match(page, /<GrodBar[ >]/, file);
    assert.doesNotMatch(page, /<header class="g-top">/, file);
  }
  const bar = read('src/components/GrodBar.astro');
  assert.match(bar, /GROD_PAGES\.map/);
  assert.match(bar, /<button type="button" class="g-menu" aria-expanded="false" aria-controls="g-links">Menu<\/button>/);
  assert.match(bar, /href=\{GROD_GO_PATH\}/);
  const css = read('src/styles/grod.css');
  // the menu exists only once the script has marked the bar, and only on a phone
  assert.match(css, /\.g-menu \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*\.has-menu \.g-links\.is-open \{ display: grid; \}/);
  assert.match(css, /\.g-nav a\[href\^="#"\] \{ display: none; \}/);
});

test('the Features page is reachable from the home page and counts its beta click', () => {
  const page = read('src/pages/grod/features.astro');
  assert.match(page, /THESIS:/);
  assert.match(page, /href=\{GROD_GO_PATH\}/);
  // the bar and the footer list the site's pages from one list, and the
  // home page offers Features beside each call to action
  assert.ok(GROD_PAGES.some((p) => p.href === '/grod/features/'));
  const home = read('src/pages/grod/index.astro');
  assert.match(home, /more=\{\{ href: GROD_PAGES\[0\]\.href/);
  assert.match(read('src/components/GrodNight.astro'), /\.\.\.GROD_PAGES,/);
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
    const id = inner.match(/^<a class="g-anchor" href="#([a-z-]+)">/)?.[1];
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

test('the beta link is an email, with no form', () => {
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

/* ---- The privacy policy -------------------------------------------------- */
const policy = () => read('src/pages/grod/privacy-policy.astro');
/* the text a visitor reads: the markup without its comments */
const policyText = () => policy().replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<!--[\s\S]*?-->/g, '').split('<main')[1];

test('the privacy policy is published whole: nothing left to fill in, and no em dash', () => {
  const text = policyText();
  assert.doesNotMatch(text, /\[[^\]]*\]/, 'a [placeholder] is still in the policy');
  assert.doesNotMatch(text, /—/);
  assert.match(text, /Your meeting content never leaves this Mac\./);
  assert.match(policy(), /const UPDATED = '\d{1,2} [A-Z][a-z]+ 20\d\d';/);
});

test('the policy and the imprint state the same company facts', () => {
  const imprint = read('src/components/Imprint.astro');
  const number = imprint.match(/company number (\d+)/)?.[1];
  const office = imprint.match(/Registered office: ([^<]+?)\.</)?.[1];
  assert.ok(number && office);
  assert.ok(policyText().includes(`company number ${number}`), 'company number');
  assert.ok(policyText().includes(`Registered office: ${office}`), 'registered office');
});

test('the policy describes what this website really loads', () => {
  const base = read('src/layouts/Base.astro');
  const text = policyText();
  // if the site counts page views, the policy says so, and no GRØD page says otherwise
  assert.equal(/counterscale/i.test(base), /It counts page views\./.test(text));
  for (const file of ['src/components/GrodSentence.astro', 'src/pages/grod/features.astro', 'src/pages/grod/craft.astro']) {
    assert.doesNotMatch(read(file), /no tracker/i, file);
  }
  // the typefaces are served from this site, so the policy names no font service
  assert.doesNotMatch(base, /fonts\.(googleapis|gstatic)\.com/);
  assert.doesNotMatch(text, /Google Fonts|Google supplies/);
  // the beta button is counted through its own page, as the policy says
  assert.equal(GROD_GO_PATH, '/grod/go/');
  assert.match(text, /It counts presses of "Join the beta"\./);
});

test('every GRØD page\'s footer links the policy, and the bar does not', () => {
  assert.equal(GROD_POLICY_PATH, '/grod/privacy-policy/');
  assert.match(read('src/components/GrodNight.astro'), /href=\{GROD_POLICY_PATH\}/);
  assert.ok(!GROD_PAGES.some((p) => p.href === GROD_POLICY_PATH));
});

/* ---- Typefaces ------------------------------------------------------------ */
const sources = (dir: string): string[] => readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? sources(`${dir}/${e.name}`) : /\.(astro|ts|css)$/.test(e.name) ? [`${dir}/${e.name}`] : []);

test('no page asks a font service for its typefaces', () => {
  for (const file of sources('src')) {
    assert.doesNotMatch(read(file), /fonts\.(googleapis|gstatic)\.com/, file);
  }
});

test('every family a page names has local rules, and every file they point to exists', () => {
  const faces = JSON.parse(read('src/lib/fonts.json')) as Record<string, string>;
  const named = new Set<string>();
  for (const file of sources('src')) {
    for (const m of read(file).matchAll(/family=[A-Za-z0-9+]+(?::[A-Za-z0-9,.;@]+)?/g)) named.add(m[0]);
  }
  assert.ok(named.size >= 10);
  for (const family of named) assert.ok(faces[family], `no local rules for ${family}: run node scripts/fetch-fonts.mjs`);
  for (const css of Object.values(faces)) {
    assert.doesNotMatch(css, /https?:/);
    for (const m of css.matchAll(/url\((\/fonts\/[^)]+)\)/g)) readFileSync(new URL(`../public${m[1]}`, import.meta.url));
  }
});

/* ---- The Privacy page and the FAQ ------------------------------------------ */
const visible = (file: string) => read(file).replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

test('Privacy is in the bar, the FAQ and the policy are in the footer', () => {
  assert.equal(GROD_PRIVACY_PATH, '/grod/privacy/');
  assert.equal(GROD_FAQ_PATH, '/grod/faq/');
  assert.ok(GROD_PAGES.some((p) => p.href === GROD_PRIVACY_PATH));
  assert.ok(!GROD_PAGES.some((p) => p.href === GROD_FAQ_PATH));
  const foot = read('src/components/GrodNight.astro');
  assert.match(foot, /\{ href: GROD_FAQ_PATH, label: 'FAQ' \}/);
  assert.match(foot, /href=\{GROD_POLICY_PATH\}/);
});

test('the Privacy page says the promise exactly and none of the lines it must never say', () => {
  const page = visible('src/pages/grod/privacy.astro');
  assert.match(page, /Your meeting content never leaves this Mac\./);
  for (const banned of [/nothing leaves your mac/i, /works fully offline/i, /exactly one file/i, /network monitor/i, /100% on-device/i, /no cloud\./i, /cannot reach the network/i, /don't trust us/i, /architecture, not policy/i, /—/]) {
    assert.doesNotMatch(page, banned, String(banned));
  }
  // every receipt has an address, and the page points at the policy and the questions
  for (const id of ['ledger', 'network', 'servers', 'account', 'downloads', 'telemetry', 'diagnostics', 'failure', 'permissions', 'deletion', 'macos', 'calendars', 'join', 'export', 'mcp']) {
    assert.match(page, new RegExp(` id="${id}"`), id);
  }
  assert.match(page, /href=\{GROD_POLICY_PATH\}/);
  assert.match(page, /href=\{GROD_FAQ_PATH\}/);
  assert.match(read('src/pages/grod/privacy.astro'), /THESIS:[\s\S]*FINISH: unreviewed and undocumented is unfinished/);
});

test('the ledger never says a meeting app carries nothing: only that GRØD passes a link', () => {
  const page = read('src/pages/grod/privacy.astro');
  const rows = [...page.matchAll(/\{ who: '([^']+)', href: '#([a-z]+)', what: '((?:[^'\\]|\\.)+)', meetings: '([^']+)' \}/g)];
  assert.equal(rows.length, 6);
  const app = rows.find((r) => /meeting app/.test(r[1]));
  assert.equal(app?.[4], 'Never from GRØD. It passes the address, never meeting content.');
  assert.equal(rows[0][4], 'Never');
  // each sender links to its receipt, and the receipt exists
  for (const row of rows) assert.match(page, new RegExp(` id="${row[2]}"`), row[2]);
  // macOS fetching Apple's assets is hedged, as in the source
  assert.match(rows.find((r) => r[1] === 'Your Mac, to Apple')?.[3] ?? '', /^macOS may fetch/);
});

test('every question in the FAQ has an address of its own, and nothing is left to fill in', () => {
  const page = read('src/pages/grod/faq.astro');
  const ids = [...page.matchAll(/\{ id: '([a-z-]+)', q: '|\{ id: '([a-z-]+)', q: "/g)].map((m) => m[1] ?? m[2]);
  const groups = [...page.matchAll(/\{ id: '([a-z-]+)', name: '/g)].map((m) => m[1]);
  assert.equal(groups.length, 4);
  assert.ok(ids.length >= 20, String(ids.length));
  assert.equal(new Set([...ids, ...groups]).size, ids.length + groups.length, 'an address is used twice');
  const text = visible('src/pages/grod/faq.astro');
  assert.doesNotMatch(text, /\[[a-z -]+\]/i, 'a [placeholder] is still in the FAQ');
  assert.doesNotMatch(text, /—/);
  assert.doesNotMatch(text, /works fully offline|nothing leaves your mac/i);
  assert.match(page, /href="\$\{GROD_POLICY_PATH\}"/);
  assert.match(page, /href="\$\{GROD_PRIVACY_PATH\}"/);
  assert.match(page, /THESIS:[\s\S]*FINISH: unreviewed and undocumented is unfinished/);
});

test('an answer that points somewhere points at an address that exists', () => {
  const faq = read('src/pages/grod/faq.astro');
  const sees = [...faq.matchAll(/see: \{ href: ['`]([^'`]+)['`], label: '([^']+)' \}/g)].map((m) => m[1].replace('${GROD_PRIVACY_PATH}', GROD_PRIVACY_PATH));
  assert.ok(sees.length >= 10, String(sees.length));
  const pages: Record<string, string> = {
    '/grod/features/': read('src/pages/grod/features.astro'),
    '/grod/craft/': read('src/pages/grod/craft.astro'),
    '/grod/privacy/': read('src/pages/grod/privacy.astro'),
  };
  for (const href of sees) {
    const [path, id] = href.split('#');
    assert.ok(pages[path], `no such page: ${href}`);
    if (id) assert.match(pages[path], new RegExp(` id="${id}"`), href);
  }
  // and Features sends its reader on to the questions
  assert.match(pages['/grod/features/'], /<a class="g-more" href=\{GROD_FAQ_PATH\}>/);
});

test('every GRØD page unfurls with GRØD\'s own share card', () => {
  assert.equal(GROD_CARD.src, '/og/grod.jpg');
  const card = readFileSync(new URL('../public/og/grod.jpg', import.meta.url));
  assert.ok(card.length > 20_000 && card.length < 300_000, `${card.length} bytes`);
  assert.doesNotMatch(GROD_CARD.alt, /—/);
  for (const file of ['src/components/GrodSentence.astro', 'src/pages/grod/features.astro', 'src/pages/grod/craft.astro', 'src/pages/grod/privacy.astro', 'src/pages/grod/faq.astro', 'src/pages/grod/privacy-policy.astro']) {
    assert.match(read(file), /card=\{GROD_CARD\}/, file);
  }
  const base = read('src/layouts/Base.astro');
  assert.match(base, /new URL\(card\?\.src \?\? '\/og\/card\.png', Astro\.site\)/);
  assert.match(base, /<meta property="og:image:alt" content=\{ogAlt\} \/>/);
});

