import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// The `.ts` extension is required here and only here: Node's native type
// stripping runs this file directly, and ESM in Node needs explicit
// extensions. Astro/Vite files import the same module extensionless.
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  readPreference,
  resolveTheme,
} from '../src/lib/theme.ts';

test('THEME_STORAGE_KEY is the literal the inline script hardcodes', () => {
  // src/layouts/Base.astro cannot import this module — it runs before the
  // bundle — so it repeats the string. Task 3 adds the test that pins the
  // two together; this pins the value itself.
  assert.equal(THEME_STORAGE_KEY, 'theme');
});

test('isThemePreference accepts exactly the three states', () => {
  assert.equal(isThemePreference('light'), true);
  assert.equal(isThemePreference('dark'), true);
  assert.equal(isThemePreference('system'), true);
  assert.equal(isThemePreference('Dark'), false);
  assert.equal(isThemePreference(''), false);
  assert.equal(isThemePreference(null), false);
  assert.equal(isThemePreference(undefined), false);
  assert.equal(isThemePreference(0), false);
});

test('readPreference normalises anything unrecognised to system', () => {
  assert.equal(readPreference('light'), 'light');
  assert.equal(readPreference('dark'), 'dark');
  assert.equal(readPreference('system'), 'system');
  // A corrupt or hand-edited value must degrade to the default, not throw.
  assert.equal(readPreference('aubergine'), 'system');
  assert.equal(readPreference(null), 'system');
  assert.equal(readPreference(undefined), 'system');
});

test('resolveTheme lets an explicit choice beat the OS in both directions', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('resolveTheme follows the OS when no choice has been made', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('resolveTheme treats a corrupt stored value as system, and never throws', () => {
  assert.equal(resolveTheme('aubergine', true), 'dark');
  assert.equal(resolveTheme('aubergine', false), 'light');
  assert.equal(resolveTheme(42, false), 'light');
});

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

/** Pull the custom-property declarations out of the rule that starts at
    `selector`. Assumes no nested braces inside the block, which holds for
    both token blocks. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `selector not found in global.css: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  );
}

test('the two dark token blocks declare identical values', () => {
  // The dark palette is written twice — once behind the media query, once
  // behind the attribute — because light-dark() cannot carry the
  // mix-blend-mode flips further down the file, and one mechanism beats two.
  // This is the guard that makes that duplication safe.
  const viaMedia = tokensIn(":root:not([data-theme='light'])");
  const viaAttribute = tokensIn(":root[data-theme='dark']");

  assert.ok(Object.keys(viaMedia).length > 0, 'media-query dark block declared no tokens');
  assert.deepEqual(viaAttribute, viaMedia);
});

test('both blend-mode flips are duplicated for the attribute state', () => {
  // Same duplication, same reason. A forced dark appearance must flip the
  // halftone to `screen` or the print sits inverted on the dark ground.
  for (const target of ['.halftone', '.riso-photo::after']) {
    assert.match(
      css,
      new RegExp(`:root\\[data-theme='dark'\\]\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*mix-blend-mode:\\s*screen`),
      `no attribute-state blend flip for ${target}`
    );
    assert.match(
      css,
      new RegExp(`:root:not\\(\\[data-theme='light'\\]\\)\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `media-query blend flip for ${target} is not guarded against an explicit light choice`
    );
  }
});

test('color-scheme is declared for all three states', () => {
  assert.match(css, /:root\s*\{[^}]*color-scheme:\s*light dark/);
  assert.match(css, /:root\[data-theme='light'\]\s*\{[^}]*color-scheme:\s*light\s*;/);
  assert.match(css, /:root\[data-theme='dark'\]\s*\{[^}]*color-scheme:\s*dark\s*;/);
});

const baseLayout = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');

test('the pre-paint script reads the same storage key the module exports', () => {
  // Base.astro runs before the bundle exists, so it cannot import
  // THEME_STORAGE_KEY and repeats the literal instead. This is the seam
  // where the two could silently drift apart.
  const match = baseLayout.match(/localStorage\.getItem\(\s*['"]([^'"]+)['"]\s*\)/);
  assert.ok(match, 'Base.astro does not read localStorage in its inline script');
  assert.equal(match[1], THEME_STORAGE_KEY);
});

test('the pre-paint script is inline, so it runs before first paint', () => {
  // A bundled or deferred script runs after paint, which is exactly the
  // flash of the wrong appearance this exists to prevent.
  assert.match(baseLayout, /<script is:inline>/);
});

test('theme-color is a single unconditional tag, not media-scoped', () => {
  // Two media-scoped tags cannot follow an explicit override — the browser
  // chrome would sit light above a dark page.
  const tags = baseLayout.match(/<meta name="theme-color"[^>]*>/g) ?? [];
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0], /media=/);
});

const themeToggle = readFileSync(
  new URL('../src/components/ThemeToggle.astro', import.meta.url),
  'utf8'
);

test("the toggle's display rule is scoped to :not([hidden])", () => {
  // The `hidden` attribute is implemented by the UA stylesheet as
  // `display: none` at user-agent origin. Origin is resolved before
  // specificity, so an author-origin `.theme-toggle { display: flex; }`
  // rule — unscoped — would beat it outright, making the fieldset visible
  // from first paint whether or not the unhiding script has run yet. This
  // pins the fix: the display declaration must live behind :not([hidden]),
  // and there must be no bare, unguarded rule fighting it.
  assert.match(themeToggle, /\.theme-toggle:not\(\[hidden\]\)\s*\{[^}]*display:/);
  assert.doesNotMatch(themeToggle, /\.theme-toggle\s*\{[^}]*display:/);
});
