import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
  // heroImage/heroAlt were removed: the hero was a dead field pair (read by
  // nothing — the actual hero comes from the first `plate` block's own
  // `src`/`alt`) with Keystatic help text promising behaviour ("leave empty
  // and the hero plate is omitted") that was never true.
  for (const field of ['eyebrow', 'app']) {
    const declaration = zodSchema.match(new RegExp(`\\b${field}:\\s*z\\.[^,]+`));
    assert.ok(declaration, `${field} is not declared in the Zod schema`);
    assert.match(declaration[0], /\.optional\(\)/, `${field} must be .optional() in Zod`);
  }
});

test('template is a flat select in Keystatic, not a conditional', () => {
  // Scope this to the `writing` collection's own schema. Matching file-wide
  // would also match appPages' pre-existing `template: fields.select(...)`,
  // so the assertion would pass even if writing's `template` field were
  // deleted outright — it would be guarding appPages, not writing.
  const start = keystatic.indexOf('writing: collection(');
  const end = keystatic.indexOf('appPages: collection(');
  assert.ok(
    start !== -1 && end !== -1 && start < end,
    'could not locate the writing/appPages collection boundaries in keystatic.config.ts — did one get renamed?'
  );
  const writingSchema = keystatic.slice(start, end);

  // fields.conditional serialises to a nested { discriminant, value } object,
  // which would make `template` an object rather than a string and break the
  // parallel with appPages.
  assert.match(writingSchema, /template:\s*fields\.select\(/);

  // Deliberately file-wide, unlike the assertion above: a fields.conditional
  // anywhere in this config — not just inside `writing` — would reintroduce
  // the object-shaped `template` this test exists to rule out.
  assert.doesNotMatch(keystatic, /template:\s*fields\.conditional\(/);
});

const markdocConfig = readFileSync(new URL('../markdoc.config.mjs', import.meta.url), 'utf8');

const FEATURE_TAGS = ['plate', 'band', 'spec', 'swatches', 'glyphs', 'scaleProof'];

test('every registered feature block tag is declared selfClosing', () => {
  // A paired {% tag %}…{% /tag %} is parsed inside a <p>; a self-closing
  // {% tag /%} lands at block level. A full-bleed section inside a paragraph
  // is invalid HTML and collapses the layout. Verified against Markdoc
  // directly before this format was designed.
  //
  // Each tag's slice runs to the START OF THE NEXT tag, not a fixed window —
  // otherwise a missing `selfClosing` would be masked by the next tag's.
  // A raw `indexOf(\`${tag}: {\`)` would match a substring of a longer tag
  // name (e.g. "plate: {" inside "template: {"). No collision exists today,
  // but that's exactly the kind of latent false-pass a guard shouldn't have.
  // Word-bound the tag name so each match is the tag's own declaration.
  const starts = FEATURE_TAGS
    .map((tag) => {
      const match = markdocConfig.match(new RegExp(`\\b${tag}:\\s*\\{`));
      return [tag, match ? match.index : -1];
    })
    .filter(([, at]) => at >= 0)
    .sort((a, b) => a[1] - b[1]);

  assert.ok(starts.length > 0, 'no feature block tags are registered at all');

  starts.forEach(([tag, start], i) => {
    const end = i + 1 < starts.length ? starts[i + 1][1] : markdocConfig.length;
    assert.match(
      markdocConfig.slice(start, end),
      /selfClosing:\s*true/,
      `${tag} must be selfClosing, or it renders inside a <p>`
    );
  });
});

test('the blocks registered so far include plate and band', () => {
  for (const tag of ['plate', 'band']) {
    assert.match(markdocConfig, new RegExp(`\\b${tag}:\\s*\\{`), `${tag} is not registered`);
  }
});

const glyphsSrc = readFileSync(new URL('../src/components/feature/Glyphs.astro', import.meta.url), 'utf8');
const specSrc = readFileSync(new URL('../src/components/feature/Spec.astro', import.meta.url), 'utf8');
const featureCss = readFileSync(new URL('../src/styles/feature.css', import.meta.url), 'utf8');

test('Glyphs takes its strip labels as content, not hardcoded words', () => {
  // The block's idea — one mark proved on both grounds — is general. Its words
  // were not: "Light menu bar" is meaningless for a study of an app icon that
  // has no menu bar. A second study inheriting the first one's labels is the
  // failure this guards.
  assert.doesNotMatch(glyphsSrc, /menu bar/i, 'Glyphs still hardcodes menu-bar labels');
  assert.match(glyphsSrc, /grounds/, 'Glyphs should take a `grounds` prop');
});

test('every scale-proof rung’s label matches its declared size', () => {
  // GRØD shipped "256 PX" under an image rendering at 160px, at every width,
  // through three rounds of verification that checked layout, contrast, block
  // nesting and page weight — every generic property except the single claim
  // that section makes to a reader. This is that lesson made mechanical: the
  // one thing a scale proof asserts is now asserted back.
  const dir = new URL('../src/content/writing/', import.meta.url);
  let checked = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdoc'))) {
    const src = readFileSync(new URL(file, dir), 'utf8');
    for (const block of src.matchAll(/\{%\s*scaleProof[\s\S]*?\/%\}/g)) {
      for (const rung of block[0].matchAll(/\{[^{}]*\}/g)) {
        const size = rung[0].match(/"size":\s*"?(\d+)"?/);
        const label = rung[0].match(/"label":\s*"([^"]*)"/);
        if (!size || !label) continue;
        const claimed = label[1].match(/\d+/);
        if (!claimed) continue; // e.g. "Secondary" — the label claims no size
        assert.equal(
          claimed[0],
          size[1],
          `${file}: rung labelled "${label[1]}" renders at ${size[1]}px`
        );
        checked++;
      }
    }
  }
  assert.ok(checked > 0, 'no scale-proof rungs were found to check');
});

test('no app’s private ink is baked into the format', () => {
  // A study's own colour is content. Shipping one study's third ink as a
  // permanent option in every future study's CMS dropdown is not.
  assert.doesNotMatch(specSrc, /aubergine/i, 'Spec still names a specific study’s ink');
  assert.doesNotMatch(featureCss, /grod/i, 'feature.css still carries a study-specific token');
});
