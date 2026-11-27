import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Each test here guards against a failure that passes the build and every
// other test, then shows up only on the live site. The Astro 7 upgrade hit
// all four.
const config = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');

test('pages prerender in Node, where build-time file reads can see public/', () => {
  // Under the Cloudflare adapter's default (workerd), node:fs sees an empty
  // filesystem. GrodSentence.astro, lib/imageSize.ts and lib/studyAsset.ts
  // then find nothing, and /grod ships without its hero film.
  assert.match(config, /prerenderEnvironment:\s*'node'/);
});

test('HTML whitespace follows HTML rules, not JSX rules', () => {
  // Astro 7's default ('jsx') drops the space between adjacent inline
  // elements, which every template here relies on.
  assert.match(config, /compressHTML:\s*true/);
});

test('sessions stay off, so deploys provision no KV namespace', () => {
  // Left on, the Cloudflare adapter adds a SESSION KV binding to the
  // generated Worker config and `wrangler deploy` creates a namespace for it.
  assert.match(config, /session:\s*false/);
});

test('CSS is minified by esbuild, with a target that keeps max-width queries', () => {
  // Vite 8 minifies with LightningCSS by default, and Astro's 'esnext' build
  // target gives it no browser list. It then treats `backdrop-filter` and
  // `-webkit-backdrop-filter` in one rule as duplicates and keeps only the
  // last: /afterframe/a's header lost its blur in Chrome and Firefox.
  assert.match(config, /cssMinify:\s*'esbuild'/);
  // Astro 7's compiler rewrites `@media (max-width: …)` in .astro styles as
  // `@media (width <= …)`, which Safari reads only from 16.4. A target at or
  // below Safari 16.3 makes esbuild write it back as max-width.
  const target = config.match(/cssTarget:\s*\[([^\]]*)\]/);
  assert.ok(target, 'cssTarget is not set');
  const safari = target[1].match(/'safari(\d+)(?:\.(\d+))?'/);
  assert.ok(safari, 'cssTarget names no Safari version');
  const [major, minor = '0'] = safari.slice(1);
  assert.ok(Number(major) < 16 || (Number(major) === 16 && Number(minor) <= 3), `safari${major}.${minor} is too new to lower range media queries`);
});
