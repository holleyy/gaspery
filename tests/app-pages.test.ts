import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { imageSize } from '../src/lib/imageSize.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the quiet template screenshot is optional in both schemas', () => {
  // Required in Zod but optional in Keystatic is how deploys froze in August.
  const zod = read('src/content.config.ts');
  const block = zod.slice(zod.indexOf('const appPages'), zod.indexOf('const about'));
  assert.match(block, /image:\s*z\.string\(\)\.optional\(\)/);
  assert.match(block, /alt:\s*z\.string\(\)\.optional\(\)/);
  const ks = read('keystatic.config.ts');
  const kblock = ks.slice(ks.indexOf('appPages: collection'), ks.indexOf('apps: collection'));
  assert.match(kblock, /^\s{8}image: fields\.text\(/m);
  assert.match(kblock, /^\s{8}alt: fields\.text\(/m);
});

test('every quiet-page screenshot exists, has alt text, and is served from /shots', () => {
  const dir = new URL('../src/content/appPages/', import.meta.url);
  let found = 0;
  for (const file of readdirSync(dir)) {
    const src = readFileSync(new URL(file, dir), 'utf8');
    const fm = src.slice(0, src.indexOf('\n---', 3));
    const image = fm.match(/^image:\s*(\S+)\s*$/m);
    if (!image) continue;
    found++;
    assert.match(image[1], /^\/shots\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|png)$/, `${file}: screenshot path`);
    assert.match(fm, /^alt:\s*\S/m, `${file}: a screenshot needs alt text`);
    assert.ok(imageSize(image[1]), `${file}: screenshot missing or unreadable`);
  }
  assert.ok(found >= 1, 'expected at least one quiet page with a screenshot');
});

test('imageSize reads the dimensions the site states on <img>', () => {
  assert.deepEqual(imageSize('/shots/grod/briefing.webp'), { width: 1840, height: 1242 });
  assert.deepEqual(imageSize('/shots/skal/proof.png'), { width: 1084, height: 758 });
  assert.equal(imageSize('/shots/nope/missing.webp'), undefined);
});

test('the quiet body prints a real shot flat and keeps the placeholder otherwise', () => {
  const quiet = read('src/components/QuietAppBody.astro');
  assert.match(quiet, /class="app-shot"/);
  assert.match(quiet, /Screenshot coming soon/);
  assert.doesNotMatch(quiet, /riso-duotone/);
  // A quiet page carrying a shot takes the wide stage, like an editorial one.
  const route = read('src/pages/apps/[id].astro');
  assert.match(route, /page\.data\.template === 'editorial' \|\| page\.data\.image\) && 'app-page--wide'/);
});
