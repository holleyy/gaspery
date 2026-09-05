import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// The `.ts` extension is required here and only here: Node's native type
// stripping runs this file directly, and ESM in Node needs explicit
// extensions. Astro/Vite files import the same module extensionless.
import { isFeature } from '../src/lib/links.ts';

test('isFeature is true only for template: feature', () => {
  assert.equal(isFeature({ template: 'feature' }), true);
  assert.equal(isFeature({ template: 'standard' }), false);
  assert.equal(isFeature({}), false);
  assert.equal(isFeature({ template: undefined }), false);
});

test('isFeature ignores anything it does not recognise', () => {
  // `template` comes from frontmatter, which a human edits by hand.
  assert.equal(isFeature({ template: 'Feature' }), false);
  assert.equal(isFeature({ template: '' }), false);
});

const zodSchema = readFileSync(new URL('../src/content.config.ts', import.meta.url), 'utf8');
const keystatic = readFileSync(new URL('../keystatic.config.ts', import.meta.url), 'utf8');

test('every feature field is optional in Zod', () => {
  // A field required in Zod but not in Keystatic commits cleanly through the
  // CMS and then fails the Cloudflare build, with nothing in the editor to
  // explain it. That froze this site's deploys once already. The format's
  // fields degrade honestly instead — so none of them may be required.
  for (const field of ['eyebrow', 'heroImage', 'heroAlt', 'app']) {
    const declaration = zodSchema.match(new RegExp(`${field}:\\s*z\\.[^,]+`));
    assert.ok(declaration, `${field} is not declared in the Zod schema`);
    assert.match(declaration[0], /\.optional\(\)/, `${field} must be .optional() in Zod`);
  }
});

test('template is a flat select in Keystatic, not a conditional', () => {
  // fields.conditional serialises to a nested { discriminant, value } object,
  // which would make `template` an object rather than a string and break the
  // parallel with appPages.
  assert.match(keystatic, /template:\s*fields\.select\(/);
  assert.doesNotMatch(keystatic, /template:\s*fields\.conditional\(/);
});
