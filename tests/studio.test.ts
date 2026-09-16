import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// `.ts` is required here: Node's native type stripping runs this file
// directly and ESM needs the extension. Astro files import extensionless.
import {
  STUDIO_STORAGE_KEY,
  isStudioAppearance,
  readStudioAppearance,
  categoryFor,
} from '../src/lib/studio.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('STUDIO_STORAGE_KEY is its own key, not the site-wide theme key', () => {
  // The studio switch must never write the site-wide preference: picking
  // "dark" on /studio changes this page only.
  assert.equal(STUDIO_STORAGE_KEY, 'studio');
  assert.notEqual(STUDIO_STORAGE_KEY, 'theme');
});

test('isStudioAppearance accepts exactly the three states', () => {
  assert.equal(isStudioAppearance('plate'), true);
  assert.equal(isStudioAppearance('light'), true);
  assert.equal(isStudioAppearance('dark'), true);
  assert.equal(isStudioAppearance('system'), false);
  assert.equal(isStudioAppearance('Plate'), false);
  assert.equal(isStudioAppearance(''), false);
  assert.equal(isStudioAppearance(null), false);
  assert.equal(isStudioAppearance(undefined), false);
  assert.equal(isStudioAppearance(0), false);
});

test('readStudioAppearance normalises anything unrecognised to plate', () => {
  // Storage is user-writable; a corrupt value must degrade to the bold
  // default, not throw.
  assert.equal(readStudioAppearance('plate'), 'plate');
  assert.equal(readStudioAppearance('light'), 'light');
  assert.equal(readStudioAppearance('dark'), 'dark');
  assert.equal(readStudioAppearance('system'), 'plate');
  assert.equal(readStudioAppearance('aubergine'), 'plate');
  assert.equal(readStudioAppearance(null), 'plate');
  assert.equal(readStudioAppearance(undefined), 'plate');
  assert.equal(readStudioAppearance(42), 'plate');
});

test('categoryFor derives the platform from meta and Soon from status', () => {
  assert.equal(categoryFor({ meta: 'macOS · SwiftUI', status: 'dev' }), 'Mac');
  assert.equal(categoryFor({ meta: 'iOS · SwiftUI', status: 'dev' }), 'iOS');
  assert.equal(categoryFor({ meta: 'macOS · SwiftUI', status: 'live' }), 'Mac');
  // Planning wins over whatever meta says.
  assert.equal(categoryFor({ meta: 'Details soon', status: 'planning' }), 'Soon');
  assert.equal(categoryFor({ meta: 'macOS · SwiftUI', status: 'planning' }), 'Soon');
  // No middot: the whole string is the segment.
  assert.equal(categoryFor({ meta: 'macOS', status: 'dev' }), 'Mac');
  // Unknown platforms pass through untouched.
  assert.equal(categoryFor({ meta: 'watchOS · SwiftUI', status: 'dev' }), 'watchOS');
  // Whitespace around the segment is trimmed.
  assert.equal(categoryFor({ meta: '  iOS  · SwiftUI', status: 'dev' }), 'iOS');
});

const contentConfig = read('src/content.config.ts');
const keystaticConfig = read('keystatic.config.ts');

test('proof is optional in the Zod apps schema', () => {
  // A field required in one schema and optional in the other commits fine
  // in Keystatic and then fails the Cloudflare build. Both are pinned.
  const apps = contentConfig.slice(contentConfig.indexOf('const apps = defineCollection'));
  const block = apps.slice(0, apps.indexOf('});') + 3);
  assert.match(block, /proof:\s*z\.string\(\)\.optional\(\)/);
});

test('proof is an image field in the Keystatic apps collection, uploading to /shots', () => {
  const start = keystaticConfig.indexOf('apps: collection({');
  assert.notEqual(start, -1, 'apps collection not found in keystatic.config.ts');
  const block = keystaticConfig.slice(start, keystaticConfig.indexOf('singletons: {', start));
  assert.match(block, /proof:\s*fields\.image\(\{/);
  assert.match(block, /directory:\s*'public\/shots'/);
  assert.match(block, /publicPath:\s*'\/shots\/'/);
  // fields.image is optional by default; a `validation: { isRequired: true }`
  // here would be the exact drift this test exists to catch.
  const field = block.slice(block.indexOf('proof:'), block.indexOf('}),', block.indexOf('proof:')));
  assert.doesNotMatch(field, /isRequired/);
});

test('GRØD carries the one real proof and the file exists', () => {
  const grod = read('src/content/apps/grod.yaml');
  const match = grod.match(/^proof:\s*(\S+)\s*$/m);
  assert.ok(match, 'grod.yaml has no proof line');
  assert.equal(match[1], '/shots/grod/briefing.webp');
  assert.doesNotThrow(() => readFileSync(new URL(`../public${match[1]}`, import.meta.url)));
});

const studioCss = read('src/styles/studio.css');
const globalCss = read('src/styles/global.css');

/** Custom-property declarations in the rule starting at `selector`.
    Assumes no nested braces inside the block. */
function tokensIn(source: string, selector: string): Record<string, string> {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `selector not found: ${selector}`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return Object.fromEntries(
    [...source.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, n, v]) => [n, v.trim()])
  );
}

const PLATE = ":root:has(.studio-page):not([data-studio='light']):not([data-studio='dark'])";

test('the plate block redeclares every token the dark block declares', () => {
  // The plate wins over the OS dark palette by specificity, token by
  // token. Any token it leaves out would leak the dark value through on a
  // dark OS, so the two blocks must cover the same keys.
  const plate = tokensIn(studioCss, PLATE);
  const dark = tokensIn(globalCss, ":root[data-theme='dark']");
  const colourKeys = Object.keys(plate).filter((k) => k.startsWith('--color-')).sort();
  assert.deepEqual(colourKeys, Object.keys(dark).sort());
});

test('the plate ground is brand-strong and its type is paper, for 5.09:1', () => {
  const plate = tokensIn(studioCss, PLATE);
  const light = tokensIn(globalCss, ':root {');
  assert.equal(plate['--color-paper'].toUpperCase(), light['--color-brand-strong'].toUpperCase());
  assert.equal(plate['--color-ink'].toUpperCase(), light['--color-paper'].toUpperCase());
  // No dimmed small text on the plate: secondary is full paper too.
  assert.equal(plate['--color-ink-secondary'].toUpperCase(), light['--color-paper'].toUpperCase());
  assert.match(studioCss, new RegExp(`${PLATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*color-scheme:\\s*light`));
});

test('the page-local ghost and plate inks are defined in all three states', () => {
  const plate = tokensIn(studioCss, PLATE);
  assert.equal(plate['--studio-ghost'], '#232019');
  assert.equal(plate['--studio-plate'], '#232019');
  assert.equal(plate['--studio-blend'], 'multiply');
  // Light and dark resolve to the site's own inks, and the blend flips for
  // dark both ways it can be reached, guarded against an explicit light.
  const base = tokensIn(studioCss, ':root {');
  assert.equal(base['--studio-ghost'], 'var(--color-brand)');
  assert.equal(base['--studio-plate'], 'var(--color-teal)');
  assert.equal(base['--studio-blend'], 'multiply');
  assert.equal(tokensIn(studioCss, ":root:not([data-theme='light'])")['--studio-blend'], 'screen');
  assert.equal(tokensIn(studioCss, ":root[data-theme='dark']")['--studio-blend'], 'screen');
});

test('the accessibility gate drops every studio blend effect', () => {
  const gateStart = studioCss.indexOf('@media (prefers-reduced-transparency: reduce), (prefers-contrast: more)');
  assert.notEqual(gateStart, -1, 'no accessibility gate in studio.css');
  const open = studioCss.indexOf('{', gateStart);
  const inner = studioCss.indexOf('{', open + 1);
  const close = studioCss.indexOf('}', inner);
  const selectors = studioCss.slice(open + 1, inner);
  const body = studioCss.slice(inner + 1, close);
  for (const target of ['.studio-name__ghost', '.studio-wm__ghost', '.studio-proof__plate']) {
    assert.ok(selectors.includes(target), `${target} is not in the gate's selector list`);
  }
  assert.match(body, /display:\s*none/);
});

test('selection is readable on the plate', () => {
  // global.css paints ::selection brand-strong on paper; on the plate both
  // resolve to paper, so the page pins the black ink under paper, and only
  // on the plate: light and dark keep the site's own rule.
  const escaped = PLATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = studioCss.match(new RegExp(`${escaped} ::selection\\s*\\{([^}]*)\\}`));
  assert.ok(rule, 'no plate-scoped ::selection rule');
  assert.match(rule[1], /background:\s*var\(--studio-ghost\)/);
  assert.match(rule[1], /color:\s*var\(--color-ink\)/);
  assert.doesNotMatch(studioCss, /\.studio-page ::selection/);
});

test('no em dashes in the studio stylesheet', () => {
  assert.doesNotMatch(studioCss, /—/);
});
