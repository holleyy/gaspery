import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SKAL_VARIANTS,
  SKAL_VARIANT_COOKIE,
  isSkalVariant,
  pickSkalVariant,
  resolveSkalVariant,
  skalGoPath,
  TESTFLIGHT_URL,
} from '../src/lib/skal.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the test has exactly two arms, a and b', () => {
  assert.deepEqual([...SKAL_VARIANTS], ['a', 'b']);
  assert.equal(isSkalVariant('a'), true);
  assert.equal(isSkalVariant('b'), true);
  assert.equal(isSkalVariant('c'), false);
  assert.equal(isSkalVariant(''), false);
  assert.equal(isSkalVariant(undefined), false);
});

test('a fresh visitor gets a coin toss, and the cookie is set', () => {
  assert.deepEqual(resolveSkalVariant(null, undefined, () => 0.1), { variant: 'a', fresh: true });
  assert.deepEqual(resolveSkalVariant(null, undefined, () => 0.9), { variant: 'b', fresh: true });
  assert.equal(pickSkalVariant(() => 0.4999), 'a');
  assert.equal(pickSkalVariant(() => 0.5), 'b');
});

test('a returning visitor keeps their arm without a new cookie', () => {
  assert.deepEqual(resolveSkalVariant(null, 'b', () => 0.1), { variant: 'b', fresh: false });
  assert.deepEqual(resolveSkalVariant('nonsense', 'a', () => 0.9), { variant: 'a', fresh: false });
});

test('?v= wins so a specific arm can be shared, and re-pins the cookie when it differs', () => {
  assert.deepEqual(resolveSkalVariant('b', 'a'), { variant: 'b', fresh: true });
  assert.deepEqual(resolveSkalVariant('a', 'a'), { variant: 'a', fresh: false });
  assert.deepEqual(resolveSkalVariant('a', undefined), { variant: 'a', fresh: true });
});

test('each arm links to its own go page, so the click is counted per arm', () => {
  for (const v of SKAL_VARIANTS) {
    const page = read(`src/pages/skal/${v}.astro`);
    assert.match(page, new RegExp(`href="${skalGoPath(v)}"`));
    const other = v === 'a' ? 'b' : 'a';
    assert.doesNotMatch(page, new RegExp(`href="${skalGoPath(other)}"`));
    assert.doesNotMatch(page, /data-placeholder=/);
    assert.match(page, /THESIS:/);
  }
});

test('the go page moves on to TestFlight both with and without scripts', () => {
  const go = read('src/components/SkalGo.astro');
  assert.match(go, /http-equiv="refresh"/);
  assert.match(go, /location\.replace/);
  assert.match(go, /TESTFLIGHT_URL/);
  assert.ok(TESTFLIGHT_URL.startsWith('https://testflight.apple.com/'));
});

test('/skal is the only on-demand route in the test and it never renders', () => {
  const index = read('src/pages/skal/index.astro');
  assert.match(index, /export const prerender = false/);
  assert.match(index, /Astro\.redirect\(`\/skal\/\$\{variant\}\/`, 302\)/);
  assert.match(index, new RegExp(`Astro\\.cookies\\.set\\(${SKAL_VARIANT_COOKIE.replace('-', '\\-')}|SKAL_VARIANT_COOKIE`));
  for (const v of SKAL_VARIANTS) {
    assert.doesNotMatch(read(`src/pages/skal/${v}.astro`), /prerender = false/);
  }
});

test('the arms request Blekk\'s faces, not the site pair', () => {
  for (const v of SKAL_VARIANTS) {
    const page = read(`src/pages/skal/${v}.astro`);
    assert.match(page, /Source\+Serif\+4/);
    assert.doesNotMatch(page, /Merriweather/);
  }
  // Arm b (the double-click story) carries no monospace at all.
  assert.doesNotMatch(read('src/pages/skal/b.astro'), /Plex\+Mono/);
});
