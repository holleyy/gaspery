import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  AFTERFRAME_VARIANTS,
  AFTERFRAME_VARIANT_COOKIE,
  isAfterframeVariant,
  pickAfterframeVariant,
  resolveAfterframeVariant,
  afterframeGoPath,
  EARLY_LIST_URL,
} from '../src/lib/afterframe.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the test has exactly two arms, a and b', () => {
  assert.deepEqual([...AFTERFRAME_VARIANTS], ['a', 'b']);
  assert.equal(isAfterframeVariant('a'), true);
  assert.equal(isAfterframeVariant('b'), true);
  assert.equal(isAfterframeVariant('c'), false);
  assert.equal(isAfterframeVariant(undefined), false);
});

test('a fresh visitor gets a coin toss; a returning one keeps their arm; ?v= wins', () => {
  assert.deepEqual(resolveAfterframeVariant(null, undefined, () => 0.1), { variant: 'a', fresh: true });
  assert.deepEqual(resolveAfterframeVariant(null, undefined, () => 0.9), { variant: 'b', fresh: true });
  assert.equal(pickAfterframeVariant(() => 0.4999), 'a');
  assert.deepEqual(resolveAfterframeVariant(null, 'b', () => 0.1), { variant: 'b', fresh: false });
  assert.deepEqual(resolveAfterframeVariant('b', 'a'), { variant: 'b', fresh: true });
  assert.deepEqual(resolveAfterframeVariant('a', 'a'), { variant: 'a', fresh: false });
});

test('each arm links only to its own go page, carries its contract, and never a mailto', () => {
  for (const v of AFTERFRAME_VARIANTS) {
    const page = read(`src/pages/afterframe/${v}.astro`);
    assert.match(page, new RegExp(`href="${afterframeGoPath(v)}"`));
    const other = v === 'a' ? 'b' : 'a';
    assert.doesNotMatch(page, new RegExp(`href="${afterframeGoPath(other)}"`));
    assert.doesNotMatch(page, /href="mailto:/);
    assert.match(page, /THESIS:/);
    assert.doesNotMatch(page, /prerender = false/);
    /* Images are served from /public; the concept folder's relative paths must not leak. */
    assert.doesNotMatch(page, /src="assets\//);
  }
});

test('the go page opens the early list both with and without scripts', () => {
  const go = read('src/components/AfterframeGo.astro');
  assert.match(go, /http-equiv="refresh"/);
  assert.match(go, /location\.href/);
  assert.match(go, /EARLY_LIST_URL/);
  assert.ok(EARLY_LIST_URL.startsWith('mailto:'));
});

test('/afterframe is the only on-demand route in the test and it never renders', () => {
  const index = read('src/pages/afterframe/index.astro');
  assert.match(index, /export const prerender = false/);
  assert.match(index, /Astro\.redirect\(`\/afterframe\/\$\{variant\}\/`, 302\)/);
  assert.match(index, /AFTERFRAME_VARIANT_COOKIE/);
  assert.equal(AFTERFRAME_VARIANT_COOKIE, 'afterframe-variant');
});

test('the arms request their own faces, not the site pair', () => {
  assert.match(read('src/pages/afterframe/a.astro'), /Schibsted\+Grotesk/);
  assert.match(read('src/pages/afterframe/b.astro'), /League\+Gothic/);
  for (const v of AFTERFRAME_VARIANTS) {
    assert.doesNotMatch(read(`src/pages/afterframe/${v}.astro`), /Merriweather/);
  }
});

test('the app page points at the site, and the old app URL redirects to the new one', () => {
  assert.match(read('src/content/apps/afterframe.yaml'), /^site: \/afterframe$/m);
  const redirects = read('public/_redirects');
  assert.match(redirects, /^\/apps\/aftershot\/\s+\/apps\/afterframe\/\s+301$/m);
  assert.match(redirects, /^\/apps\/aftershot\s+\/apps\/afterframe\s+301$/m);
});
