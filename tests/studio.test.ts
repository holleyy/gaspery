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

test('the nav, not the switch, carries the push to the right edge', () => {
  // StudioSwitch.astro's scoped style resets the switch's margin, so a
  // margin-left: auto on the switch never wins. The nav has no competing
  // margin, so the push lives there.
  assert.match(studioCss, /\.studio-top \.studio-nav\s*\{[^}]*margin-left:\s*auto/);
  assert.doesNotMatch(studioCss, /\.studio-top \.studio-switch\s*\{[^}]*margin-left/);
});

test('no em dashes in the studio stylesheet', () => {
  assert.doesNotMatch(studioCss, /—/);
});

const studioSwitch = read('src/components/StudioSwitch.astro');

test('the switch is three radios named studio, plate first, rendered hidden', () => {
  assert.match(studioSwitch, /<fieldset class="studio-switch" hidden>/);
  const values = [...studioSwitch.matchAll(/<input type="radio" name="studio" value="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(values, ['plate', 'light', 'dark']);
  // A different radio name from ThemeToggle's `theme`, so the two controls
  // can never form one native group.
  assert.doesNotMatch(studioSwitch, /name="theme"/);
});

test("the switch's display rule is scoped to :not([hidden])", () => {
  // The UA sheet implements `hidden` as display:none at user-agent origin;
  // an unscoped author `display` beats it regardless of specificity.
  assert.match(studioSwitch, /\.studio-switch:not\(\[hidden\]\)\s*\{[^}]*display:/);
  assert.doesNotMatch(studioSwitch, /\.studio-switch\s*\{[^}]*display:/);
});

test('the switch writes the studio key, never the site-wide theme key', () => {
  assert.match(studioSwitch, /STUDIO_STORAGE_KEY/);
  assert.doesNotMatch(studioSwitch, /localStorage\.\w+\(\s*['"]theme['"]/);
});

test('the switch theme-color literals match the real tokens', () => {
  const light = tokensIn(globalCss, ':root {');
  const dark = tokensIn(globalCss, ":root[data-theme='dark']");
  const plate = tokensIn(studioCss, PLATE);
  for (const hex of [light['--color-paper'], dark['--color-paper'], plate['--color-paper']]) {
    assert.ok(studioSwitch.includes(hex), `StudioSwitch.astro is missing the literal ${hex}`);
  }
});

const studioPage = read('src/pages/studio.astro');

test('the pre-paint script is inline and reads the same key the module exports', () => {
  assert.match(studioPage, /<script is:inline>/);
  const match = studioPage.match(/localStorage\.getItem\(\s*['"]([^'"]+)['"]\s*\)/);
  assert.ok(match, 'studio.astro does not read localStorage in its inline script');
  assert.equal(match[1], STUDIO_STORAGE_KEY);
});

test('the page mounts the studio switch once and never the theme toggle', () => {
  assert.equal((studioPage.match(/<StudioSwitch \/>/g) ?? []).length, 1);
  assert.doesNotMatch(studioPage, /ThemeToggle/);
});

test('the page is built on Base without the rail, in the mono face', () => {
  assert.doesNotMatch(studioPage, /import Rail/);
  assert.match(studioPage, /<Base[^>]*\smono\b/);
  assert.match(studioPage, /title="Studio · Gaspery"/);
});

test('every name is printed twice with a decorative ghost, and the ghost never carries a heading', () => {
  assert.match(studioPage, /class="studio-name__ghost" aria-hidden="true"/);
  assert.match(studioPage, /class="studio-name__ink"/);
  assert.match(studioPage, /<h1 class="sr-only">Apps<\/h1>/);
});

test('the foot carries the tagline, the Elsewhere links, and the imprint', () => {
  assert.match(studioPage, /Small software, printed in two inks\./);
  assert.match(studioPage, /sidebar\.elsewhere\.map/);
  assert.match(studioPage, /<Imprint \/>/);
});

test('no em dashes in the page', () => {
  assert.doesNotMatch(studioPage, /—/);
});

test('the proof image is not lazy: its card is display none until hover', () => {
  assert.doesNotMatch(studioPage, /loading="lazy"/);
  assert.match(studioPage, /fetchpriority="low"/);
});

test('the pre-paint script and the switch use the same three grounds, pinned to the tokens', () => {
  // Both hardcode hex literals because a script cannot read a custom
  // property before the element carrying it has painted. This pins them
  // to the real tokens, as tests/theme.test.ts does for the site toggle.
  const light = tokensIn(globalCss, ':root {')['--color-paper'];
  const dark = tokensIn(globalCss, ":root[data-theme='dark']")['--color-paper'];
  const plate = tokensIn(studioCss, PLATE)['--color-paper'];
  for (const [name, source] of [['studio.astro', studioPage], ['StudioSwitch.astro', studioSwitch]] as const) {
    for (const hex of [light, dark, plate]) {
      assert.ok(source.includes(hex), `${name} is missing the literal ${hex}`);
    }
    // Both write the same two attributes, and both clear them for the plate.
    assert.match(source, /dataset\.studio = /);
    assert.match(source, /dataset\.theme = /);
    assert.match(source, /delete root\.dataset\.studio/);
    assert.match(source, /delete root\.dataset\.theme/);
  }
});

test('the page uses the dynamic viewport height and gates motion', () => {
  assert.match(studioCss, /\.studio-page\s*\{[^}]*min-height:\s*100dvh/);
  assert.match(studioCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(studioCss, /\.studio-proof__plate\s*\{[^}]*mix-blend-mode/);
  // The switch's dot transition is killed inside the component's own
  // scoped style, where it can win; the page-level gate must not claim it.
  assert.match(studioSwitch, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.studio-switch__dot\s*\{[^}]*transition:\s*none/);
  assert.doesNotMatch(studioCss, /prefers-reduced-motion[^}]*\.studio-switch__dot/);
});

const parity = read('scripts/verify-parity.sh');

test('the parity gate admits one studio switch in place of the theme toggle', () => {
  // Original guarantee kept and tightened: every page carries exactly one
  // appearance control, of either kind. Two of a kind and one of each both
  // fail, since each is a native radio group.
  assert.match(parity, /class="studio-switch"/);
  assert.match(parity, /\$\(\(theme \+ studio\)\) -ne 1/);
  assert.doesNotMatch(parity, /-gt 1/);
});
