import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Each setting pinned here guards against a failure that passes the build and
// every other test, then shows up only on the live site. The Astro 7 upgrade
// hit all three.
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
