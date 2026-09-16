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
