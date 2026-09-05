# Art-Directed Feature Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third body treatment on the `writing` collection — `template: 'feature'` — that renders a full-bleed, art-directed post from a fixed vocabulary of six blocks, while staying an ordinary entry in the stream, the feed and the archive.

**Architecture:** `writing` gains an optional `template` discriminator, mirroring what `appPages` already does with `quiet | editorial`. `writing/[...id].astro` branches to a `FeatureArticle` shell — slim site chrome top and bottom, full-bleed between. The six blocks are self-closing Markdoc tags backed by Astro components, exposed in Keystatic as `block()` content components so they stay GUI-editable.

**Tech Stack:** Astro 5, Markdoc, Keystatic, plain CSS custom properties, `node --test` with native TypeScript stripping. One new webfont (IBM Plex Mono, via the existing Google Fonts request). No new npm dependencies.

## Global Constraints

- **Nothing in the schema becomes newly required.** Four new fields, all optional, no new `superRefine` branches. A field required in Zod but optional in Keystatic commits cleanly and then fails the Cloudflare build — that is how this site's deploys froze in August. A feature post missing its hero degrades honestly instead.
- **Every block tag must be `selfClosing: true`.** A paired `{% tag %}…{% /tag %}` gets wrapped in a `<p>`; a full-bleed section inside a paragraph is invalid HTML. Verified by testing, and enforced by a test in Task 4.
- **`template` is a flat `fields.select` in Keystatic**, mirroring `appPages`. Never `fields.conditional` — it serialises to a nested `{ discriminant, value }` object and would make `template` an object rather than a string.
- **Site tokens only in chrome.** An app's own inks may appear inside a study *as subject matter* (`Swatches` chips, `Spec` glyphs) but never in page chrome.
- **`Band` uses `--color-brand-on-ink`**, not `--color-brand`. The band's ground is `--color-ink`, which inverts with the scheme, so its accent must run opposite the page. `--color-brand` measures 2.3:1 there.
- Astro/Vite source files import `src/lib/*` extensionless; `tests/` imports carry `.ts`. Component imports carry `.astro`.
- Test runner: `npm test` → `node --test "tests/**/*.test.ts"`. Currently 28 passing.
- The parity gate (`scripts/verify-parity.sh`) also fails if any built page lacks exactly one `.theme-toggle`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/content.config.ts` | Four optional fields on `writing`. |
| `keystatic.config.ts` | Mirrors them; registers the six block components. |
| `src/lib/links.ts` | `isFeature()` predicate; `PostProps` gains `isFeature`. |
| `markdoc.config.mjs` | Six self-closing tags → components. |
| `src/components/FeatureArticle.astro` | The framed-takeover shell. |
| `src/components/feature/Plate.astro` | Full-bleed artwork + optional display heading. |
| `src/components/feature/Band.astro` | Inverted full-width statement. |
| `src/components/feature/Spec.astro` | The `columns` block — 1 stacks, >1 puts the heading beside. |
| `src/components/feature/Swatches.astro` | Hex + job chips. |
| `src/components/feature/Glyphs.astro` | Small marks on paper and ink grounds. |
| `src/components/feature/ScaleProof.astro` | One artwork, descending sizes. |
| `src/styles/feature.css` | The format's own scale and grid, imported by `FeatureArticle`. |
| `src/pages/writing/[...id].astro` | Branches on `template`. |
| `src/layouts/Base.astro` | Optional `mono` prop adds Plex Mono to the font request. |
| `src/components/WritingList.astro` | The "Study" tag. |
| `public/studies/grod-icon/*` | webp derivatives + menu-bar SVGs. |
| `src/content/writing/grod-listening-o.mdoc` | Post #1. |
| `tests/feature.test.ts` | Predicate, self-closing enforcement, Keystatic/Zod agreement. |
| `DESIGN.md` | Records the mono face. |

---

### Task 1: Schema, predicate, and the drift guard

**Files:**
- Modify: `src/content.config.ts` (the `writing` collection)
- Modify: `keystatic.config.ts` (the `writing` collection schema)
- Modify: `src/lib/links.ts`
- Create: `tests/feature.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isFeature(data): boolean` and `FeatureFields` from `src/lib/links.ts`; the `template` field on `writing`. Tasks 3 and 8 consume both.

- [ ] **Step 1: Write the failing tests**

Create `tests/feature.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `isFeature` is not exported from `src/lib/links.ts`.

- [ ] **Step 3: Add the predicate**

In `src/lib/links.ts`, after the `isLink` definition, add:

```ts
export type FeatureFields = { template?: string };

/** A feature post is one whose body renders as an art-directed, full-bleed
    layout instead of the reading column. Deliberately a plain boolean, not a
    type predicate like `isLink`: nothing downstream needs `template` narrowed,
    and the value carries no payload a caller would use. */
export function isFeature(data: FeatureFields): boolean {
  return data.template === 'feature';
}
```

Then extend the shared types so the stream can render the tag in Task 8. Change `WritingData` to include `template?: string;`, change `PostProps` to include `isFeature: boolean;`, and in `toPostProps` add `isFeature: isFeature(entry.data),` to the returned object.

- [ ] **Step 4: Add the Zod fields**

In `src/content.config.ts`, inside the `writing` collection's `z.object({...})`, after `draft`:

```ts
      /* Which body renders. "standard" is the reading column every post has
         had; "feature" is the full-bleed, art-directed treatment — same idea
         as appPages' quiet/editorial. */
      template: z.enum(['standard', 'feature']).default('standard'),
      /* Feature-only, and all optional on purpose. A feature post missing its
         hero renders without the plate, the way an appPages spread without a
         screenshot falls back to the honest placeholder. Requiring any of
         these in Zod without also requiring them in Keystatic is how this
         site's deploys froze in August. */
      eyebrow: z.string().optional(),
      heroImage: z.string().optional(),
      heroAlt: z.string().optional(),
      app: z.string().optional(),
```

**Do not add a `superRefine` branch.** A feature post that also carries `sourceUrl` is allowed; nothing breaks, and an error here could freeze a deploy over an authoring choice.

- [ ] **Step 5: Mirror in Keystatic**

In `keystatic.config.ts`, inside the `writing` collection's `schema`, after `draft`:

```ts
        template: fields.select({
          label: 'Template',
          description: 'Standard is the reading column. Feature is the full-bleed, art-directed layout.',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Feature', value: 'feature' },
          ],
          defaultValue: 'standard',
        }),
        eyebrow: fields.text({
          label: 'Eyebrow',
          description: 'Feature template only. e.g. "Identity study 01".',
        }),
        heroImage: fields.text({
          label: 'Hero image path',
          description: 'Feature template only. e.g. /studies/grod-icon/primary.webp — leave empty and the hero plate is omitted.',
        }),
        heroAlt: fields.text({
          label: 'Hero alt text',
          description: 'Feature template only. Required whenever a hero image is set.',
          multiline: true,
        }),
        app: fields.text({
          label: 'Related app',
          description: 'Feature template only. An app id, e.g. "grod" — links the study back to its app page.',
        }),
```

- [ ] **Step 6: Run tests and build**

Run: `npm test`
Expected: PASS — 32 tests (28 existing + 4 new).

Run: `npm run build`
Expected: `[build] Complete!` — no post sets `template` yet, so every entry takes the `standard` default and nothing renders differently.

- [ ] **Step 7: Commit**

```bash
git add src/content.config.ts keystatic.config.ts src/lib/links.ts tests/feature.test.ts
git commit -m "feat: add the feature template discriminator

Four optional fields on the writing collection, mirroring what appPages
does with quiet/editorial. Nothing is newly required: a feature post
missing its hero degrades honestly rather than failing the Cloudflare
build, which is how this site's deploys froze in August.

A test asserts every new field is .optional() in Zod and that template
is a flat select rather than a conditional, which would serialise as a
nested object."
```

---

### Task 2: Assets

**Files:**
- Create: `public/studies/grod-icon/primary.webp` and `-512/-256/-128/-64/-32/-16` derivatives
- Create: `public/studies/grod-icon/secondary.webp`
- Create: `public/studies/grod-icon/mb-{idle,detected,recording,paused,processing}.svg`

**Interfaces:**
- Consumes: nothing.
- Produces: the asset paths Tasks 4-7 reference. No code.

Sources are on this machine at:
`/Users/magneticadmin/.codex/visualizations/2026/07/22/019f8a3f-d83f-7c92-89c0-94c49d92702b/grod-icon-story/`
— `assets/grod-primary-listening-o.png` (1024², ~1.5MB), `assets/grod-secondary-signal-stamp.png`, and an SVG sprite of five menu-bar symbols inside `index.html`.

- [ ] **Step 1: Generate the webp derivatives**

The scale ladder shows one artwork at six sizes. Shipping the 1.5MB PNG six times is the single biggest page-weight risk in this format.

```bash
mkdir -p public/studies/grod-icon
SRC="/Users/magneticadmin/.codex/visualizations/2026/07/22/019f8a3f-d83f-7c92-89c0-94c49d92702b/grod-icon-story/assets"
for size in 1024 512 256 128 64 32 16; do
  sips -Z $size -s format webp "$SRC/grod-primary-listening-o.png" \
    --out "public/studies/grod-icon/primary-$size.webp" >/dev/null
done
sips -Z 512 -s format webp "$SRC/grod-secondary-signal-stamp.png" \
  --out public/studies/grod-icon/secondary-512.webp >/dev/null
ls -la public/studies/grod-icon/
```

Expected: eight files. Report each size in bytes. If the 1024 derivative exceeds ~200KB, drop it — the largest the layout actually renders is the hero at roughly 640px, so `primary-1024.webp` is only worth keeping if it is cheap.

- [ ] **Step 2: Extract the menu-bar glyphs to standalone SVGs**

The source has five `<symbol>` elements (`mb-idle`, `mb-detected`, `mb-recording`, `mb-paused`, `mb-processing`), each `viewBox="0 0 28 22"` and drawn with `stroke="currentColor"`.

Extract each into its own file at `public/studies/grod-icon/<id>.svg`, converting `<symbol id="…" viewBox="…">` into `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 22">` and keeping the paths byte-identical.

**Keep `stroke="currentColor"` and `fill="currentColor"` exactly as they are.** These are macOS template-icon studies: the whole point is that the glyph takes its colour from context, which is what lets the same file render on both the paper strip and the ink strip in Task 6.

Verify each file parses and keeps its geometry:

```bash
for f in public/studies/grod-icon/mb-*.svg; do
  printf '%s: %s paths, %s bytes, currentColor=%s\n' "$f" \
    "$(grep -o '<path' "$f" | wc -l | tr -d ' ')" \
    "$(wc -c < "$f" | tr -d ' ')" \
    "$(grep -c currentColor "$f")"
done
```

Expected: five files, each with 2-4 paths and a non-zero `currentColor` count.

- [ ] **Step 3: Commit**

```bash
git add public/studies/grod-icon
git commit -m "assets: GRØD icon study artwork

webp derivatives at the sizes the scale ladder actually renders — the
source PNGs are 1.5MB each and the ladder shows one artwork six times.

The five menu-bar glyphs become standalone SVGs keeping stroke=
currentColor, so one file renders on both the paper and the ink strip."
```

---

### Task 3: The feature shell

**Files:**
- Create: `src/components/FeatureArticle.astro`
- Create: `src/styles/feature.css`
- Modify: `src/layouts/Base.astro` (optional `mono` prop)
- Modify: `src/pages/writing/[...id].astro` (branch)
- Create: `src/content/writing/grod-listening-o.mdoc` (frontmatter + two paragraphs only)

**Interfaces:**
- Consumes: `isFeature` (Task 1); the hero asset (Task 2).
- Produces: `FeatureArticle.astro` taking `post` and rendering `<slot />` inside the framed shell; the `.feature` CSS scope every block in Tasks 4-6 renders into.

- [ ] **Step 1: Add the mono prop to Base.astro**

`Base.astro` currently builds one Google Fonts `<link>`. Make the face list conditional so ordinary posts pay nothing for a font they don't use.

In the frontmatter, add `mono` to `Props` (`mono?: boolean`) and destructure it with a `false` default. Then replace the hardcoded `href` on the fonts `<link>` with a computed one:

```astro
/* IBM Plex Mono is the feature format's meta face — eyebrows and the
   `01 / NAME` keys. Only feature pages request it; every other page's
   font payload is unchanged. */
const families = [
  'family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..600',
  'family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900',
];
if (mono) families.push('family=IBM+Plex+Mono:wght@400;600');
const fontsHref = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
```

and use `href={fontsHref}`.

**Verify the non-feature href is byte-identical to the current one** before moving on — every existing page's markup depends on it, and the parity gate will catch a difference but a mismatch here is cheaper to find now:

```bash
node -e "
const f=['family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..600','family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900'];
console.log('https://fonts.googleapis.com/css2?'+f.join('&')+'&display=swap');
"
```

Expected output, exactly:
`https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..600&family=Merriweather:ital,opsz,wght@0,18..144,300..900;1,18..144,300..900&display=swap`

- [ ] **Step 2: Write the format's stylesheet**

Create `src/styles/feature.css`:

```css
/* =====================================================================
   Feature posts — the art-directed body.

   A framed takeover: site chrome top and bottom, the post's own world
   between. Same two inks, same typefaces, a much wider stage and a
   display scale the reading column never needs.

   The container is full width, so its own text children are constrained
   to a reading measure here and the block components opt out by being
   full-bleed. Prose and art direction interleave without the author
   thinking about it.
   ===================================================================== */

.feature {
  --feature-max: 1180px;
  --feature-pad: clamp(22px, 5vw, 48px);
  --feature-measure: 68ch;
}

/* Site chrome — deliberately the same weight as an ordinary post's. */
.feature__frame {
  max-width: 680px;
  margin: 0 auto;
  padding: 56px 24px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feature__back { font-weight: 600; font-size: 14px; color: var(--color-brand-strong); }
.feature__back:hover { color: var(--color-brand-strong-hover); }
.feature__meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.feature__meta .sep { color: var(--color-hairline); }

/* The stage. */
.feature__body { margin-top: 8px; }

/* Prose between blocks stays at a reading measure; blocks go full-bleed. */
.feature__body > p,
.feature__body > h2,
.feature__body > h3,
.feature__body > ul,
.feature__body > ol,
.feature__body > blockquote {
  max-width: var(--feature-measure);
  margin-inline: auto;
  padding-inline: var(--feature-pad);
}
.feature__body > p { font-size: 18px; line-height: 1.7; margin: 0 0 20px; }
.feature__body > h2 {
  font-family: var(--font-serif);
  font-weight: 800;
  font-size: clamp(26px, 3vw, 34px);
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 48px auto 14px;
}
.feature__body > a { color: var(--color-brand-strong); }

/* Shared block furniture. */
.feature-wrap { max-width: var(--feature-max); margin: 0 auto; padding-inline: var(--feature-pad); }
.feature-eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-ink-secondary);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.feature-eyebrow::before { content: ''; width: 28px; height: 2px; background: currentColor; flex: none; }
.feature-key {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-ink);
  display: block;
}
.feature-key b { color: var(--color-ink-secondary); font-weight: 600; }
.feature-h {
  font-family: var(--font-serif);
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: clamp(30px, 3.8vw, 56px);
  line-height: 1.04;
}

.feature__end {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 680px;
  margin: 64px auto 0;
  padding: 24px 24px 0;
  border-top: 1px solid var(--color-hairline);
}
.feature__end a { font-weight: 600; font-size: 14px; color: var(--color-brand-strong); }
```

Add the mono token to `src/styles/global.css`, next to the existing font tokens in the light `:root` block:

```css
  --font-mono:  "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
```

It is a font stack, not a colour, so it belongs only in the base `:root` — do **not** add it to the two dark blocks, or the token-parity test in `tests/theme.test.ts` will fail (it compares `--color-*` only, but keeping palette and type tokens separate is the convention that test protects).

- [ ] **Step 3: Write the shell**

Create `src/components/FeatureArticle.astro`:

```astro
---
import '../styles/feature.css';
import Imprint from './Imprint.astro';
import ThemeToggle from './ThemeToggle.astro';
import { isLink, sourceDomain } from '../lib/links';

interface Props {
  post: {
    id: string;
    data: {
      title: string;
      date: Date;
      dek: string;
      eyebrow?: string;
      readingTime?: string;
      sourceUrl?: string;
      app?: string;
    };
  };
}
const { post } = Astro.props;
const fmt = post.data.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
---
<main class="feature" id="main">
  {/* Site chrome, deliberately the same weight as an ordinary post's — the
      takeover happens between these two, not instead of them. */}
  <div class="feature__frame">
    <a class="feature__back" href="/">&larr; Alex Holley</a>
    <div class="feature__meta">
      <span class="label">{fmt.toUpperCase()}</span>
      <span class="sep" aria-hidden="true">/</span>
      <span class="label">{isLink(post.data) ? sourceDomain(post.data.sourceUrl) : post.data.readingTime}</span>
      {post.data.eyebrow && (
        <>
          <span class="sep" aria-hidden="true">/</span>
          <span class="label">{post.data.eyebrow}</span>
        </>
      )}
      <span class="tag-study">Study</span>
      <ThemeToggle />
    </div>
  </div>

  <div class="feature__body">
    <slot />
  </div>

  <div class="feature__end">
    {post.data.app
      ? <a href={`/apps/${post.data.app}`}>More about {post.data.app.toUpperCase()} &rarr;</a>
      : <a href="/">Back to the notebook &rarr;</a>}
  </div>

  <Imprint />
</main>

<style>
  /* Push the theme control to the end of the meta row, the same way the
     standard article template does. */
  .feature__meta > :global(.theme-toggle) { margin-left: auto; }
</style>
```

Add the Study tag style to `src/styles/global.css`, immediately after the `.tag-new` rule so the two read as a pair:

```css
/* The stream and a feature post's own meta row both carry this. Teal rather
   than brand, so it reads as a category and not as urgency the way New does. */
.tag-study {
  font-family: var(--font-sans); font-weight: 700; font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--color-paper); background: var(--color-teal-ink);
  padding: 2px 6px; border-radius: 2px;
}
```

- [ ] **Step 4: Branch the route**

In `src/pages/writing/[...id].astro`, add to the imports:

```astro
import FeatureArticle from '../../components/FeatureArticle.astro';
import { isLink, isFeature, sourceDomain } from '../../lib/links';
```

Pass `mono` to `Base` and wrap the existing `<main class="article">` in a ternary:

```astro
<Base title={`${post.data.title} · Alex Holley`} description={post.data.dek} mono={isFeature(post.data)}>
  {isFeature(post.data) ? (
    <FeatureArticle post={post}><Content /></FeatureArticle>
  ) : (
    <main class="article" id="main">
      ...everything that is already there, unchanged...
    </main>
  )}
</Base>
```

**Do not restructure the standard branch.** Its `.article__dek` placement carries a comment about whitespace serialisation and a past regression; leave every line inside it as it is. The acceptance condition is that the parity gate reports no change to any existing page.

- [ ] **Step 5: Create the post stub**

Create `src/content/writing/grod-listening-o.mdoc`. Body is two paragraphs for now — Task 7 ports the real content:

```markdoc
---
title: A mark that listens
date: 2026-09-05
readingTime: 9 min
dek: How GRØD's icon became a recording target, a directional needle, and the most distinctive letter in the name — resolved as one instrument.
draft: true
template: feature
eyebrow: Identity study 01
heroImage: /studies/grod-icon/primary-1024.webp
heroAlt: The GRØD primary mark — a recording target with a directional needle, printed magenta over teal, slightly out of register.
app: grod
---

GRØD begins with attention, then turns conversation into direction.

The work was not to replace the first idea, but to make it unmistakable.
```

`draft: true` keeps it out of the production build while the format is under construction. Task 7 clears it.

- [ ] **Step 6: Verify**

```bash
npm test          # 32 passing
npm run build     # must complete
npm run dev       # then open /writing/grod-listening-o/
```

Drafts build under `astro dev` but not in production, so the page is reachable at its real URL in dev only.

Confirm: the frame renders, the two paragraphs sit at a reading measure rather than full width, the Study tag appears, the theme control works, and `view-source` shows the Plex Mono family in the fonts URL on this page and **not** on `/writing/the-two-ink-discipline/`.

```bash
./scripts/verify-parity.sh
```

Expected: `PARITY OK`. The draft adds no production route, and no existing page's markup should change. **If any existing page changed, stop** — the likely cause is the ternary in Step 4 altering whitespace serialisation in the standard branch, or the fonts href not matching byte-for-byte.

- [ ] **Step 7: Commit**

```bash
git add src/components/FeatureArticle.astro src/styles/feature.css src/styles/global.css src/layouts/Base.astro "src/pages/writing/[...id].astro" src/content/writing/grod-listening-o.mdoc
git commit -m "feat: add the feature post shell

A framed takeover — site chrome top and bottom, full-bleed between. The
container constrains its own text children to a reading measure so prose
and full-bleed blocks can interleave without the author thinking about it.

IBM Plex Mono is requested only on feature pages, so every other page's
font payload is unchanged."
```

---

### Task 4: Plate and Band

**Files:**
- Create: `src/components/feature/Plate.astro`, `src/components/feature/Band.astro`
- Modify: `markdoc.config.mjs`, `keystatic.config.ts`, `tests/feature.test.ts`
- Modify: `src/content/writing/grod-listening-o.mdoc` (exercise both blocks)

**Interfaces:**
- Consumes: the `.feature` CSS scope (Task 3); `/studies/grod-icon/*` (Task 2).
- Produces: the `plate` and `band` Markdoc tags. Tasks 5-6 follow the same registration pattern.

- [ ] **Step 1: Write the failing test**

Append to `tests/feature.test.ts`:

```ts
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
  const starts = FEATURE_TAGS
    .map((tag) => [tag, markdocConfig.indexOf(`${tag}: {`)])
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — `plate is not registered`.

- [ ] **Step 3: Write Plate**

Create `src/components/feature/Plate.astro`:

```astro
---
/* A full-bleed artwork with its caption, optionally carrying the piece's
   display headline — which is what makes it the hero. Given no `src` it
   renders the copy alone rather than an empty frame or a fake placeholder,
   the same honest degradation appPages uses for a missing screenshot. */
interface Props {
  src?: string;
  alt?: string;
  caption?: string;
  eyebrow?: string;
  heading?: string;
  accent?: string;
  lede?: string;
}
const { src, alt = '', caption, eyebrow, heading, accent, lede } = Astro.props;
---
<section class="plate">
  <div class="feature-wrap plate__grid" data-solo={src ? undefined : ''}>
    <div class="plate__copy">
      {eyebrow && <p class="feature-eyebrow">{eyebrow}</p>}
      {heading && (
        <h1 class="feature-h">{heading}{accent && <><br /><em>{accent}</em></>}</h1>
      )}
      {lede && <p class="plate__lede">{lede}</p>}
    </div>
    {src && (
      <figure class="plate__figure">
        <img src={src} alt={alt} width="640" height="640" loading="eager" decoding="async" />
        {(captionLead || caption) && (
          <figcaption>{captionLead && <b>{captionLead}</b>}{captionLead && caption ? ' ' : ''}{caption}</figcaption>
        )}
      </figure>
    )}
  </div>
</section>

<style>
  .plate { padding: 56px 0 80px; }
  .plate__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.85fr);
    gap: clamp(32px, 5vw, 64px);
    align-items: center;
  }
  .plate__grid[data-solo] { grid-template-columns: minmax(0, 1fr); }
  .plate__copy :global(.feature-h) em { font-style: italic; color: var(--color-brand-strong); }
  .plate__lede {
    margin-top: 24px;
    font-size: clamp(18px, 1.6vw, 21px);
    line-height: 1.5;
    color: var(--color-ink-secondary);
    max-width: 34em;
  }
  .plate__figure { margin: 0; }
  .plate__figure img { width: 100%; height: auto; }
  .plate__figure figcaption {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid var(--color-hairline);
    font-size: 13px;
    line-height: 1.5;
    color: var(--color-ink-secondary);
  }
  @media (max-width: 900px) {
    .plate__grid { grid-template-columns: minmax(0, 1fr); }
  }
</style>
```

**Correction, found in review:** an earlier draft rendered the caption through `set:html` so it could carry a bold lead-in, justified as "the same trust boundary `RisoPhoto.astro` documents". That justification was wrong — `RisoPhoto` *escapes* its caption before injecting, precisely so literal HTML is never interpreted. Rendering a plain Keystatic text field as live HTML is the opposite of that precedent.

`captionLead` is a separate field instead. It gives the same typography with no injection surface, and it is clearer in the CMS than asking an author to type `<b>` into a text box.

- [ ] **Step 4: Write Band**

Create `src/components/feature/Band.astro`:

```astro
---
/* The one full-bleed inversion in a piece. Its job is to break the reading
   rhythm exactly once, so a second Band in one post is a smell. */
interface Props {
  words: string[];
  note?: string;
}
const { words = [], note } = Astro.props;
---
<section class="band">
  <div class="feature-wrap band__inner">
    {words.map((word, i) => <p class="band__word" data-accent={i === 1 ? '' : undefined}>{word}</p>)}
    {note && <span class="band__note">{note}</span>}
  </div>
</section>

<style>
  .band {
    background: var(--color-ink);
    color: var(--color-paper);
    padding: clamp(44px, 5vw, 64px) 0;
    margin: 8px 0 72px;
  }
  .band__inner { display: flex; flex-wrap: wrap; gap: 18px clamp(28px, 4vw, 56px); align-items: baseline; }
  .band__word {
    font-family: var(--font-serif);
    font-weight: 300;
    font-size: clamp(28px, 4.4vw, 54px);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  /* The band's ground is --color-ink, which inverts with the scheme — so the
     accent has to run opposite the page. --color-brand measures 2.3:1 here. */
  .band__word[data-accent] { color: var(--color-brand-on-ink); }
  .band__note {
    flex: 1;
    min-width: 200px;
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.5;
    opacity: 0.75;
  }
</style>
```

- [ ] **Step 5: Register the tags**

In `markdoc.config.mjs`, inside `tags`, after `cite`:

```js
    /* Feature-post blocks. Every one is `selfClosing`: a paired tag parses
       inside a <p>, and a full-bleed section inside a paragraph is invalid
       HTML that collapses the layout. Their repeatable content rides as
       array-of-object attributes, which Markdoc round-trips cleanly and
       Keystatic edits as a form. */
    plate: {
      render: component('./src/components/feature/Plate.astro'),
      selfClosing: true,
      attributes: {
        src: { type: String },
        alt: { type: String },
        caption: { type: String },
        eyebrow: { type: String },
        heading: { type: String },
        accent: { type: String },
        lede: { type: String },
      },
    },
    band: {
      render: component('./src/components/feature/Band.astro'),
      selfClosing: true,
      attributes: {
        words: { type: Array, required: true },
        note: { type: String },
      },
    },
```

- [ ] **Step 6: Expose them in Keystatic**

In `keystatic.config.ts`, above the `writingComponents` definition:

```ts
// Feature-post blocks. `block()` not `wrapper()`: a wrapper compiles to a
// paired Markdoc tag, which parses inside a <p> — fatal for a full-bleed
// section. Same reason `cite` above is a block().
const featureComponents = {
  plate: block({
    label: 'Plate',
    description: 'Full-bleed artwork, optionally carrying the display headline.',
    schema: {
      src: fields.text({ label: 'Image path', description: 'e.g. /studies/grod-icon/primary-1024.webp' }),
      alt: fields.text({ label: 'Alt text', multiline: true }),
      caption: fields.text({ label: 'Caption', multiline: true }),
      eyebrow: fields.text({ label: 'Eyebrow' }),
      heading: fields.text({ label: 'Display heading' }),
      accent: fields.text({ label: 'Heading accent line', description: 'Rendered italic in the brand ink, on its own line.' }),
      lede: fields.text({ label: 'Lede', multiline: true }),
    },
  }),
  band: block({
    label: 'Band',
    description: 'The one full-bleed inversion in a piece. Use it once.',
    schema: {
      words: fields.array(fields.text({ label: 'Word' }), {
        label: 'Words',
        itemLabel: (props) => props.value,
      }),
      note: fields.text({ label: 'Note', multiline: true }),
    },
  }),
};
```

and change `writingComponents` to `{ ...risoPhotoComponents, cite, ...featureComponents }`.

- [ ] **Step 7: Exercise both blocks**

Replace the body of `src/content/writing/grod-listening-o.mdoc` (keep the frontmatter) with:

```markdoc
{% plate
   src="/studies/grod-icon/primary-1024.webp"
   alt="The GRØD primary mark — a recording target with a directional needle, printed magenta over teal, slightly out of register."
   eyebrow="Identity study 01"
   heading="A mark that"
   accent="listens."
   lede="GRØD begins with attention, then turns conversation into direction."
   caption="<b>Primary — Listening Ø.</b> A recording target, a directional needle, and the most distinctive letter in the name, resolved as one instrument." /%}

{% band words=["Listen.","Distil.","Remember.","Move."] note="The one full-bleed inversion in the piece. Its job is to break the reading rhythm exactly once." /%}

The work was not to replace the first idea, but to make it unmistakable.
```

- [ ] **Step 8: Verify**

Run: `npm test` → 34 passing.
Run: `npm run build` → completes.

Then check the rendered markup — this is the step that catches the `<p>` trap:

```bash
npm run dev &
sleep 6
curl -s http://localhost:4321/writing/grod-listening-o/ > /tmp/feature.html
echo -n "plate inside a <p>: "; grep -c '<p[^>]*>[^<]*<section class="plate"' /tmp/feature.html
echo -n "band inside a <p>: ";  grep -c '<p[^>]*>[^<]*<section class="band"' /tmp/feature.html
echo -n "band accent token: ";  grep -c 'color-brand-on-ink' /tmp/feature.html
kill %1
```

Expected: both `<p>` counts are `0`. A `1` means the tag was written paired rather than self-closing.

In the browser, confirm at 1280px and at mobile, in both appearances: the hero splits copy from artwork, the band inverts, and the band's second word is the accent ink in **both** light and dark.

- [ ] **Step 9: Commit**

```bash
git add src/components/feature markdoc.config.mjs keystatic.config.ts tests/feature.test.ts src/content/writing/grod-listening-o.mdoc
git commit -m "feat: add the Plate and Band feature blocks

Both are self-closing Markdoc tags backed by Keystatic block()
components — a paired tag parses inside a <p>, which would put a
full-bleed section in a paragraph. A test enforces selfClosing on every
block in the vocabulary.

Band takes --color-brand-on-ink rather than --color-brand: its ground is
--color-ink, which inverts with the scheme, so the accent runs opposite
the page."
```

---

### Task 5: Spec and Swatches

**Files:**
- Create: `src/components/feature/Spec.astro`, `src/components/feature/Swatches.astro`
- Modify: `markdoc.config.mjs`, `keystatic.config.ts`, `src/content/writing/grod-listening-o.mdoc`

**Interfaces:**
- Consumes: the `.feature` scope and `feature-key` / `feature-h` furniture (Task 3).
- Produces: the `spec` and `swatches` tags.

- [ ] **Step 1: Write Spec**

This is the block the whole vocabulary leans on — it absorbs the origin steps, the three readings, and the menu-bar rules.

Create `src/components/feature/Spec.astro`:

```astro
---
/* One component, one variant axis. `columns=1` stacks rows with the heading
   above; `columns>1` puts the heading BESIDE the grid in a left column, which
   is what gives the display type room to run several lines deep. That
   asymmetry is not a special case — it is what makes the multi-column form
   work at all. */
interface Item {
  /* `num` and `key` are separate fields, not one string carrying markup.
     An earlier draft rendered `key` through set:html so a caption could
     bold its number — but that makes a plain Keystatic text field a live
     HTML sink, and the RisoPhoto precedent cited for it actually ESCAPES
     before injecting. Two fields give the same typography with no
     injection surface. */
  num?: string;
  key?: string;
  glyph?: string;
  heading?: string;
  body?: string;
}
interface Props {
  columns?: number;
  heading?: string;
  standfirst?: string;
  detail?: string;
  items: Item[];
}
const { columns = 1, heading, standfirst, detail, items = [] } = Astro.props;
const beside = columns > 1;
---
<section class="spec" data-beside={beside ? '' : undefined}>
  <div class="feature-wrap spec__layout">
    {(heading || standfirst || detail) && (
      <div class="spec__head">
        {heading && <h2 class="feature-h">{heading}</h2>}
        {standfirst && <p class="spec__standfirst">{standfirst}</p>}
        {detail && <p class="spec__detail">{detail}</p>}
      </div>
    )}
    <ul class="spec__list" style={`--spec-columns:${columns}`}>
      {items.map((item) => (
        <li class="spec__item">
          {item.glyph && <img class="spec__glyph" src={item.glyph} alt="" width="120" height="120" loading="lazy" />}
          {(item.num || item.key) && (
            <span class="feature-key">{item.num && <b>{item.num}</b>}{item.num && item.key ? ' / ' : ''}{item.key}</span>
          )}
          {item.heading && <h3 class="spec__heading">{item.heading}</h3>}
          {item.body && <p class="spec__body">{item.body}</p>}
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .spec { padding: 0 0 80px; }
  .spec__standfirst {
    font-family: var(--font-serif);
    font-size: clamp(19px, 2vw, 30px);
    line-height: 1.32;
    letter-spacing: -0.01em;
    margin-top: 24px;
  }
  .spec__detail { margin-top: 22px; font-size: 16px; line-height: 1.62; color: var(--color-ink-secondary); max-width: 46ch; }
  .spec__list { list-style: none; margin: 0; padding: 0; display: grid; }

  /* columns=1 — heading above, hairline rows. */
  .spec:not([data-beside]) .spec__head { margin-bottom: 44px; }
  .spec:not([data-beside]) .spec__item {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 44px;
    padding: 30px 0;
    border-top: 1px solid var(--color-hairline);
  }
  .spec:not([data-beside]) .spec__item:last-child { border-bottom: 1px solid var(--color-hairline); }

  /* columns>1 — heading beside, tall ruled columns. No cards: hairlines and
     vertical void, so the marks carry the section rather than boxes. */
  .spec[data-beside] .spec__layout {
    display: grid;
    grid-template-columns: minmax(0, 0.86fr) minmax(0, 1.14fr);
    gap: clamp(36px, 5vw, 72px);
    align-items: start;
  }
  .spec[data-beside] .spec__list {
    grid-template-columns: repeat(var(--spec-columns), 1fr);
    border: 1px solid var(--color-hairline);
  }
  .spec[data-beside] .spec__item {
    display: flex;
    flex-direction: column;
    min-height: 420px;
    padding: 0;
  }
  .spec[data-beside] .spec__item + .spec__item { border-left: 1px solid var(--color-hairline); }
  .spec[data-beside] .spec__glyph {
    flex: 1;
    width: clamp(72px, 8vw, 112px);
    height: auto;
    align-self: center;
    margin: 44px 0;
    object-fit: contain;
  }
  .spec[data-beside] .feature-key,
  .spec[data-beside] .spec__heading,
  .spec[data-beside] .spec__body { padding-inline: 26px; }
  .spec[data-beside] .feature-key { padding-top: 22px; border-top: 1px solid var(--color-hairline); }
  .spec[data-beside] .spec__body { padding-bottom: 30px; }

  .spec__heading { font-family: var(--font-serif); font-size: 20px; font-weight: 700; margin: 10px 0 9px; }
  .spec__body { font-size: 15px; line-height: 1.55; color: var(--color-ink-secondary); max-width: 52ch; }
  .spec:not([data-beside]) .spec__body { font-size: 17px; }

  @media (max-width: 1000px) {
    .spec[data-beside] .spec__layout { grid-template-columns: 1fr; }
    .spec[data-beside] .spec__list { grid-template-columns: 1fr; }
    .spec[data-beside] .spec__item { min-height: 0; }
    .spec[data-beside] .spec__item + .spec__item { border-left: 0; border-top: 1px solid var(--color-hairline); }
    .spec:not([data-beside]) .spec__item { grid-template-columns: 1fr; gap: 10px; }
  }
</style>
```

- [ ] **Step 2: Write Swatches**

Create `src/components/feature/Swatches.astro`:

```astro
---
/* The one block that legitimately prints inks other than the site's own: the
   chips ARE the subject matter. The rule the format follows is that an app's
   colours may appear inside a study about that identity, never in chrome. */
interface Props {
  heading?: string;
  items: { hex: string; job?: string }[];
}
const { heading, items = [] } = Astro.props;
---
<section class="swatches">
  <div class="feature-wrap">
    {heading && <h2 class="feature-h swatches__heading">{heading}</h2>}
    <ul class="swatches__grid">
      {items.map((item) => (
        <li class="swatch">
          <div class="swatch__chip" style={`background:${item.hex}`}></div>
          <div class="swatch__body">
            <div class="swatch__hex">{item.hex.toUpperCase()}</div>
            {item.job && <div class="swatch__job">{item.job}</div>}
          </div>
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .swatches { padding: 0 0 80px; }
  .swatches__heading { margin-bottom: 40px; }
  .swatches__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .swatch { border: 1px solid var(--color-hairline); border-radius: var(--radius-card); overflow: hidden; }
  .swatch__chip { height: 120px; }
  .swatch__body { padding: 14px 16px 18px; }
  .swatch__hex { font-family: var(--font-mono); font-weight: 600; font-size: 13px; letter-spacing: 0.04em; }
  .swatch__job { font-size: 13px; color: var(--color-ink-secondary); margin-top: 2px; }
  @media (max-width: 900px) { .swatches__grid { grid-template-columns: repeat(2, 1fr); } }
</style>
```

- [ ] **Step 3: Register both**

In `markdoc.config.mjs`, alongside `plate` and `band`:

```js
    spec: {
      render: component('./src/components/feature/Spec.astro'),
      selfClosing: true,
      attributes: {
        columns: { type: Number },
        heading: { type: String },
        standfirst: { type: String },
        detail: { type: String },
        items: { type: Array, required: true },
      },
    },
    swatches: {
      render: component('./src/components/feature/Swatches.astro'),
      selfClosing: true,
      attributes: {
        heading: { type: String },
        items: { type: Array, required: true },
      },
    },
```

In `keystatic.config.ts`, add to `featureComponents`:

```ts
  spec: block({
    label: 'Spec',
    description: 'Numbered readings. One column stacks; three or four put the heading beside the grid.',
    schema: {
      columns: fields.integer({ label: 'Columns', defaultValue: 1 }),
      heading: fields.text({ label: 'Heading' }),
      standfirst: fields.text({ label: 'Standfirst', multiline: true }),
      detail: fields.text({ label: 'Detail', multiline: true }),
      items: fields.array(
        fields.object({
          num: fields.text({ label: 'Number', description: 'e.g. "01" — rendered in the secondary ink.' }),
          key: fields.text({ label: 'Key', description: 'e.g. "Name" — rendered after the number.' }),
          glyph: fields.text({ label: 'Glyph path', description: 'Optional SVG, e.g. /studies/grod-icon/mb-idle.svg' }),
          heading: fields.text({ label: 'Heading' }),
          body: fields.text({ label: 'Body', multiline: true }),
        }),
        { label: 'Items', itemLabel: (props) => props.fields.heading.value || props.fields.key.value },
      ),
    },
  }),
  swatches: block({
    label: 'Swatches',
    description: 'Ink chips. These print the subject’s own colours, not the site’s.',
    schema: {
      heading: fields.text({ label: 'Heading' }),
      items: fields.array(
        fields.object({
          hex: fields.text({ label: 'Hex', validation: { isRequired: true } }),
          job: fields.text({ label: 'Job' }),
        }),
        { label: 'Swatches', itemLabel: (props) => props.fields.hex.value },
      ),
    },
  }),
```

- [ ] **Step 4: Exercise all three Spec variants**

Append to `src/content/writing/grod-listening-o.mdoc`:

```markdoc
{% spec columns=1 heading="The G was the start. The Ø made it ours." standfirst="How the mark arrived at itself, in four moves." items=[{"num":"01","key":"Preserve","heading":"Keep the useful grammar","body":"The first idea already held three relevant cues: a letter, a recording target, and a needle. The work was not to replace that thought, but to make it unmistakable."},{"num":"02","key":"Enlarge","heading":"Let the mark fill the object","body":"Early frames spent too much space on cream surround and layered bevels. The chosen form grows until the symbol, rather than the container, owns the Dock."},{"num":"03","key":"Name","heading":"Move from G to Ø","body":"The wildcard became the answer. The slash in GRØD's Ø already carries direction. Turn its centre into a listening aperture and the name becomes the mechanism."},{"num":"04","key":"Print","heading":"Trade clinical polish for memory","body":"Warm paper, dense ink, halftone edges, and slight misregistration make the icon feel handled. The software is precise. The identity is allowed to feel human."}] /%}

{% swatches heading="Colour with a job." items=[{"hex":"#D41467","job":"Recording energy"},{"hex":"#168A96","job":"Signal and echo"},{"hex":"#48234F","job":"Direction and depth"},{"hex":"#F3E7CF","job":"Warm paper"}] /%}
```

- [ ] **Step 5: Verify**

Run: `npm test` → 34 passing (the selfClosing test now covers four tags).
Run: `npm run build` → completes.

In the browser at 1280px: the `columns=1` Spec stacks with hairline rows; the swatch chips print GRØD's four inks while everything around them stays on site tokens. Check mobile collapses both to a single column, and check both appearances.

- [ ] **Step 6: Commit**

```bash
git add src/components/feature markdoc.config.mjs keystatic.config.ts src/content/writing/grod-listening-o.mdoc
git commit -m "feat: add the Spec and Swatches feature blocks

Spec is one component with a columns axis, not three blocks: columns=1
stacks with the heading above, columns>1 moves the heading beside the
grid so the display type has room to run deep. Rules and vertical void
rather than cards.

Swatches prints the subject's own inks by design — the chips are the
content. Site chrome around them stays on site tokens."
```

---

### Task 6: Glyphs and ScaleProof

**Files:**
- Create: `src/components/feature/Glyphs.astro`, `src/components/feature/ScaleProof.astro`
- Modify: `markdoc.config.mjs`, `keystatic.config.ts`, `src/content/writing/grod-listening-o.mdoc`

**Interfaces:**
- Consumes: the menu-bar SVGs and webp derivatives (Task 2).
- Produces: the `glyphs` and `scaleProof` tags — completing the six-block vocabulary.

- [ ] **Step 1: Write Glyphs**

Create `src/components/feature/Glyphs.astro`:

```astro
---
/* A family of small monochrome marks shown on both grounds they must survive.
   The SVGs are drawn with stroke="currentColor", so one file renders dark on
   the paper strip and light on the ink strip — which is exactly the macOS
   template-icon contract the marks are studying. */
interface Props {
  heading?: string;
  standfirst?: string;
  marks: { src: string; label?: string }[];
  note?: string;
}
const { heading, standfirst, marks = [], note } = Astro.props;
const strips = [
  { key: 'paper', context: 'Light menu bar' },
  { key: 'ink', context: 'Dark menu bar' },
];
---
<section class="glyphs">
  <div class="feature-wrap">
    {heading && <h2 class="feature-h">{heading}</h2>}
    {standfirst && <p class="glyphs__standfirst">{standfirst}</p>}

    {strips.map((strip) => (
      <div class:list={['glyphs__strip', `glyphs__strip--${strip.key}`]}>
        <span class="glyphs__context">{strip.context}</span>
        {marks.map((mark) => (
          <span class="glyphs__state">
            <img src={mark.src} alt="" width="28" height="22" loading="lazy" />
            {mark.label}
          </span>
        ))}
      </div>
    ))}

    {note && <p class="glyphs__note">{note}</p>}
  </div>
</section>

<style>
  .glyphs { padding: 0 0 80px; }
  .glyphs__standfirst { margin: 20px 0 32px; color: var(--color-ink-secondary); max-width: 56ch; }
  .glyphs__strip {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px clamp(20px, 3vw, 34px);
    padding: 16px 22px;
    border-radius: var(--radius-card);
    margin-bottom: 12px;
  }
  .glyphs__strip--paper { background: var(--color-surface); border: 1px solid var(--color-hairline); color: var(--color-ink); }
  .glyphs__strip--ink { background: var(--color-ink); color: var(--color-paper); }
  .glyphs__context {
    font-family: var(--font-mono);
    font-weight: 600; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    opacity: 0.6; min-width: 118px;
  }
  .glyphs__state { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; }
  .glyphs__note { margin-top: 14px; font-size: 13px; color: var(--color-ink-secondary); }
</style>
```

**Note the limitation, and record it in your report:** `<img src="…svg">` does *not* inherit `currentColor` — an externally-referenced SVG renders in its own colours, isolated from the page. On the ink strip the marks will therefore render dark-on-dark and be invisible.

Resolve it by reading the SVG files at build time and inlining them, so `currentColor` resolves against the strip. In the frontmatter:

```ts
import { readFileSync } from 'node:fs';
/* Inlined, not <img src>: an externally-referenced SVG is an isolated
   document and does not inherit currentColor, so on the ink strip the marks
   would render dark-on-dark. Build-time read of files we ship ourselves. */
const inlined = marks.map((mark) => ({
  ...mark,
  svg: readFileSync(`public${mark.src}`, 'utf8'),
}));
```

and render `<span class="glyphs__mark" set:html={mark.svg} />` instead of the `<img>`. Size the glyph with `.glyphs__mark svg { width: 28px; height: 22px; display: block; }`.

- [ ] **Step 2: Write ScaleProof**

Create `src/components/feature/ScaleProof.astro`:

```astro
---
/* One gesture, from poster to pixel. Each rung renders its own derivative
   rather than one large file scaled down six times — the source artwork is
   1.5MB and this block would otherwise ship it once per rung. */
interface Props {
  heading?: string;
  rungs: { src: string; size?: string; label?: string; caption?: string }[];
}
const { heading, rungs = [] } = Astro.props;
---
<section class="ladder">
  <div class="feature-wrap">
    {heading && <h2 class="feature-h ladder__heading">{heading}</h2>}
    <ul class="ladder__rungs">
      {rungs.map((rung) => (
        <li class="rung">
          <img
            src={rung.src}
            alt=""
            width={rung.size ?? 64}
            height={rung.size ?? 64}
            style={`width:${rung.size ?? 64}px;height:${rung.size ?? 64}px`}
            loading="lazy"
          />
          {rung.label && <span class="label rung__label">{rung.label}</span>}
          {rung.caption && <small>{rung.caption}</small>}
        </li>
      ))}
    </ul>
  </div>
</section>

<style>
  .ladder { padding: 0 0 88px; }
  .ladder__heading { margin-bottom: 40px; }
  .ladder__rungs { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: clamp(24px, 3vw, 44px); align-items: flex-end; }
  .rung { text-align: center; max-width: 15ch; }
  .rung img { margin: 0 auto; }
  .rung__label { display: block; margin-top: 12px; }
  .rung small { display: block; font-size: 12px; color: var(--color-ink-secondary); margin-top: 4px; }
</style>
```

- [ ] **Step 3: Register both**

`markdoc.config.mjs`:

```js
    glyphs: {
      render: component('./src/components/feature/Glyphs.astro'),
      selfClosing: true,
      attributes: {
        heading: { type: String },
        standfirst: { type: String },
        marks: { type: Array, required: true },
        note: { type: String },
      },
    },
    scaleProof: {
      render: component('./src/components/feature/ScaleProof.astro'),
      selfClosing: true,
      attributes: {
        heading: { type: String },
        rungs: { type: Array, required: true },
      },
    },
```

`keystatic.config.ts`, added to `featureComponents`:

```ts
  glyphs: block({
    label: 'Glyphs',
    description: 'A family of small marks, shown on both a light and a dark ground.',
    schema: {
      heading: fields.text({ label: 'Heading' }),
      standfirst: fields.text({ label: 'Standfirst', multiline: true }),
      marks: fields.array(
        fields.object({
          src: fields.text({ label: 'SVG path', validation: { isRequired: true } }),
          label: fields.text({ label: 'State label' }),
        }),
        { label: 'Marks', itemLabel: (props) => props.fields.label.value || props.fields.src.value },
      ),
      note: fields.text({ label: 'Note', multiline: true }),
    },
  }),
  scaleProof: block({
    label: 'Scale proof',
    description: 'One artwork at descending sizes. Each rung points at its own derivative.',
    schema: {
      heading: fields.text({ label: 'Heading' }),
      rungs: fields.array(
        fields.object({
          src: fields.text({ label: 'Image path', validation: { isRequired: true } }),
          size: fields.text({ label: 'Rendered size in px', description: 'e.g. 128' }),
          label: fields.text({ label: 'Label' }),
          caption: fields.text({ label: 'Caption', multiline: true }),
        }),
        { label: 'Rungs', itemLabel: (props) => props.fields.label.value || props.fields.size.value },
      ),
    },
  }),
```

- [ ] **Step 4: Exercise both**

Append to `src/content/writing/grod-listening-o.mdoc`:

```markdoc
{% glyphs heading="Keep the gesture. Lose the print." standfirst="The menu-bar family should inherit the open circle, pivot, and directional diagonal from Listening Ø. It should not inherit paper, colour, halftone, shadow, or frame." marks=[{"src":"/studies/grod-icon/mb-idle.svg","label":"Idle"},{"src":"/studies/grod-icon/mb-detected.svg","label":"Detected"},{"src":"/studies/grod-icon/mb-recording.svg","label":"Recording"},{"src":"/studies/grod-icon/mb-paused.svg","label":"Paused"},{"src":"/studies/grod-icon/mb-processing.svg","label":"Processing"}] note="Directional study only. Final masters require pixel-fitting at 16 pt and 18 pt." /%}

{% scaleProof heading="One gesture, from poster to pixel." rungs=[{"src":"/studies/grod-icon/primary-256.webp","size":"256","label":"256 px","caption":"Dock / Spotlight"},{"src":"/studies/grod-icon/primary-128.webp","size":"128","label":"128 px","caption":"Dock working size"},{"src":"/studies/grod-icon/primary-64.webp","size":"64","label":"64 px","caption":"Compact UI"},{"src":"/studies/grod-icon/primary-32.webp","size":"32","label":"32 px","caption":"Circle and slash still resolve"},{"src":"/studies/grod-icon/primary-16.webp","size":"16","label":"16 px","caption":"A silhouette test, not a menu-bar asset"},{"src":"/studies/grod-icon/secondary-512.webp","size":"64","label":"Secondary","caption":"Signal Stamp, for when the needle would dominate"}] /%}
```

- [ ] **Step 5: Verify**

Run: `npm test` → 34 passing, with the selfClosing test now covering all six tags.
Run: `npm run build` → completes.

The check that matters here — the marks must be visible on **both** strips:

```bash
npm run dev &
sleep 6
curl -s http://localhost:4321/writing/grod-listening-o/ > /tmp/feature.html
echo -n "inlined svg elements in the glyph strips: "; grep -o '<svg' /tmp/feature.html | wc -l
echo -n "external svg <img> (should be 0): "; grep -c 'img src="/studies/grod-icon/mb-' /tmp/feature.html
kill %1
```

Expected: ten inlined `<svg>` (five marks × two strips) and zero external `<img>` references to the mb- files.

Then look at it: the marks must be legible on the ink strip as well as the paper strip. If they are invisible on one, `currentColor` is not resolving and the inlining did not take.

- [ ] **Step 6: Commit**

```bash
git add src/components/feature markdoc.config.mjs keystatic.config.ts src/content/writing/grod-listening-o.mdoc
git commit -m "feat: add the Glyphs and ScaleProof feature blocks

Glyphs inlines the SVGs at build time rather than referencing them with
<img>: an externally-referenced SVG is an isolated document and does not
inherit currentColor, so the marks would render dark-on-dark on the ink
strip. Inlining is what lets one file serve both grounds — the same
template-icon contract the marks are studying.

ScaleProof points each rung at its own derivative instead of scaling one
large file six times."
```

---

### Task 7: Port the study, and the stream tag

**Files:**
- Modify: `src/content/writing/grod-listening-o.mdoc` (full content, `draft: false`)
- Modify: `src/components/WritingList.astro` (the Study tag)

**Interfaces:**
- Consumes: all six blocks; `PostProps.isFeature` (Task 1).
- Produces: the first real feature post, live in the stream.

- [ ] **Step 1: Add the Study tag to the stream**

`WritingList.astro`'s `Post` interface gains `isFeature?: boolean;`, and both branches of the map get the tag beside the existing New tag. In the link branch and the essay branch alike, after `{post.isNew && <span class="tag-new">New</span>}`:

```astro
        {post.isFeature && <span class="tag-study">Study</span>}
```

The `.tag-study` rule already exists in `global.css` from Task 3.

- [ ] **Step 2: Complete the port**

Fill in the remaining source sections against the original at
`/Users/magneticadmin/.codex/visualizations/2026/07/22/019f8a3f-d83f-7c92-89c0-94c49d92702b/grod-icon-story/index.html`.

Still missing after Tasks 4-6: the **Construction** section (`spec columns=3`, the three readings), the **secondary mark** (a second `plate`, with its use/don't-use pair as a `spec columns=2`), and the **internal specification** (`spec columns=4`).

**Gap found in Task 5's verification — the three reading glyphs do not exist.** Task 2 produced only the five `mb-*.svg` menu-bar marks. The three glyphs the Construction section needs (the Ø as circle-and-slash, the ◎ as concentric rings, the ↗ as an arrow) were only ever inline SVG in the design comp. Create them here, at `public/studies/grod-icon/read-{name,attention,direction}.svg`, `viewBox="0 0 120 120"`, drawn with `stroke="currentColor"` and no literal colour:

```
read-name:      <circle cx="60" cy="60" r="42" stroke-width="7" fill="none"/>
                <path d="M27 93 L93 27" stroke-width="7" stroke-linecap="round" fill="none"/>
read-attention: <circle cx="60" cy="60" r="42" stroke-width="7" fill="none"/>
                <circle cx="60" cy="60" r="21" stroke-width="7" fill="none"/>
read-direction: <path d="M26 94 L90 30" stroke-width="7" stroke-linecap="round" fill="none"/>
                <path d="M60 28 H92 V60" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
```

`currentColor`, not baked hexes, for the reason Task 6 documents: an `<img>`-referenced SVG is an isolated document that cannot inherit page colour, and a literal ink would not survive the scheme inverting. Task 6 must therefore extend its inlining to `Spec`'s glyphs and give each item an optional `ink` (`brand` | `teal` | `aubergine`) that sets `color` on the inlined mark — three inks, matching the comp, adapting to light and dark. Aubergine is the one case of the study's own third ink, sanctioned by the colour rule above.

The source's tenth section — the identity-status archive table — has no block and does not earn one. Hand-set it as prose, or cut it. Say which you chose and why in your report.

Set `draft: false`.

- [ ] **Step 3: Verify**

```bash
npm test          # 34 passing
npm run build     # the post is now a production route
```

```bash
grep -c 'tag-study' dist/index.html            # 1 — the stream entry
grep -c 'tag-study' dist/writing/index.html    # 1
ls -la dist/writing/grod-listening-o/
```

Then the page-weight check, which is the reason Task 2 exists:

```bash
find dist/studies -name '*.webp' -exec du -h {} + | sort -h
```

Report the total. If the page's images exceed ~600KB combined, say so rather than shipping it quietly.

Browser: read the whole post top to bottom at 1280px and at mobile, in both appearances. Confirm prose sits at a reading measure between full-bleed blocks, the Study tag appears in the stream, and the `columns=3` Construction section reads as strongly as the original.

- [ ] **Step 4: Commit**

```bash
git add src/content/writing/grod-listening-o.mdoc src/components/WritingList.astro
git commit -m "feat: publish the GRØD identity study

The first feature post, and the format's first real customer. Carries a
Study tag in the stream — teal rather than brand, so it reads as a
category and not as urgency."
```

---

### Task 8: Document, and re-snapshot

**Files:**
- Modify: `DESIGN.md`
- Modify: `.baseline/**` (regenerated)

**Interfaces:**
- Consumes: the finished format.
- Produces: an accurate design system and a meaningful parity gate.

- [ ] **Step 1: Record the mono face AND the format's display scale**

`DESIGN.md`'s `typography:` block documents `display`, `headline`, `title`, `body` — a scale drawn for the reading column. The feature format deliberately runs above it, and the design tooling correctly reports the difference as drift because nothing documents it. Both halves get recorded.

The mono face, the format's third typeface:

```yaml
  meta:
    fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.14em"
    textTransform: "uppercase"
```

And the scale itself. Note what is genuinely new versus what is not: `featureDisplay`'s **maximum is 56px, the existing `display` step** — the format reaches it through a clamp rather than adding a step above it. The clamp minimum is a responsive floor, not a new size. What *is* new is a section heading above `headline`, and an 18px body a step above the column's 17px:

```yaml
  featureDisplay:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(30px, 3.8vw, 56px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
    note: "Tops out at the documented display step; the clamp floor is a responsive minimum, not a new step."
  featureSection:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(26px, 3vw, 34px)"
    fontWeight: 800
    lineHeight: 1.15
  featureBody:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "18px"
    lineHeight: 1.7
```

Add a line noting the mono face is requested only on feature pages, so ordinary pages carry two faces as before, and that the `feature*` steps apply only inside `.feature`.

**Then confirm the drift reports actually clear**, rather than assuming the documentation was sufficient — run `/impeccable audit` (or the project's design hook) over `src/styles/feature.css` and report what remains. Anything still flagged is either a real step you failed to document or a genuine design problem; say which.

- [ ] **Step 2: Isolate what this branch changed**

The lesson from the toggle: do not read the parity diff against a stale baseline and try to spot your own changes in it. Build the branch base and compare directly.

```bash
BASE=$(git merge-base main HEAD)
git worktree add --detach /tmp/fp-base "$BASE"
ln -s "$(git rev-parse --show-toplevel)/node_modules" /tmp/fp-base/node_modules
(cd /tmp/fp-base && npm run build)
```

Compare `dist/` against `/tmp/fp-base/dist/`. Two categories are expected and **nothing else**:

1. **One new route** — `writing/grod-listening-o/`, plus its entry appearing in `index.html`, `writing/index.html` and `essays/index.html`, and a new item in `rss.xml` and the sitemap.
2. **The `.tag-study` rule** added to the shared stylesheet.

Every other existing page must be byte-identical. **If an existing page's body changed, stop and investigate** — the likely cause is the Task 3 ternary altering whitespace serialisation in the standard article branch.

Then clean up:

```bash
rm -f /tmp/fp-base/node_modules
git worktree remove --force /tmp/fp-base
```

- [ ] **Step 3: Re-snapshot and verify**

```bash
./scripts/snapshot-baseline.sh
./scripts/verify-parity.sh
```

Expected: `PARITY OK`. Note the gate also enforces exactly one `.theme-toggle` per page — the feature shell renders one, so a `THEME TOGGLE COUNT WRONG` line means `FeatureArticle` is missing it or has two.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md
git commit -m "docs: record the feature format's mono face

IBM Plex Mono is the format's meta face — eyebrows and the 01 / NAME
keys — and the site's third documented typeface. Requested only on
feature pages, so ordinary pages carry two as before.

Baseline re-snapshotted: the branch adds one route and one shared CSS
rule, verified against a build of the branch base rather than against
the old baseline."
```

---

## Verification

The format is done when:

- `npm test` passes — 34 tests.
- `npm run build` completes.
- `./scripts/verify-parity.sh` prints `PARITY OK`.
- `/writing/grod-listening-o/` renders all six blocks, and **no block appears inside a `<p>`**.
- The menu-bar marks are legible on both the paper strip and the ink strip.
- Prose between blocks sits at a reading measure; blocks run full-bleed.
- The Study tag appears in the stream and on the post.
- Plex Mono is requested on the feature page and **not** on any other page.
- Both appearances, desktop and mobile, read correctly.
