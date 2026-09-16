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
