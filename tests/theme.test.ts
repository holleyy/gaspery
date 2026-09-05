import { test } from 'node:test';
import assert from 'node:assert/strict';
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
