# Aftershot Icon Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalise three points where the feature format is shaped around its first study, rename the app the study is about, and publish the second study.

**Architecture:** Five tasks in order — format fixes (with GRØD migrated in the same commit so nothing regresses), the rename plus a permanent redirect, assets, the port, then docs and baseline. Nothing here changes the format's shape; it removes assumptions baked in by having only one example.

**Tech Stack:** Astro 5, Markdoc, Keystatic, `node --test`. No new dependencies.

## Global Constraints

- **Nothing in the content schema becomes newly required.** Content mistakes degrade; they never fail the build. This site's deploys have frozen twice on content.
- Every block tag stays `selfClosing`; Keystatic stays `block()` not `wrapper()`.
- **No raw HTML from author-editable fields**, and no `set:html` on anything but repo-shipped SVG read through `readStudySvg`.
- Site tokens in chrome. A study's own inks appear only as subject matter.
- `apps/<id>.yaml` and `appPages/<id>.mdoc` must be renamed together — `src/pages/apps/[id].astro` throws otherwise, by design.
- Test runner `npm test` → `node --test "tests/**/*.test.ts"`; currently 34 passing. `./scripts/verify-parity.sh` must end green, and it also enforces exactly one `.theme-toggle` per built page.

---

## File Structure

| File | Change |
| --- | --- |
| `src/components/feature/Glyphs.astro` | Strip labels become props. |
| `src/components/feature/Spec.astro` | `ink` accepts a hex; `inkDark` added; `aubergine` leaves the enum. |
| `src/components/feature/Swatches.astro` | Hairline on every chip. |
| `src/styles/feature.css` | `--grod-aubergine` removed. |
| `markdoc.config.mjs`, `keystatic.config.ts` | Attributes and schemas for the above. |
| `src/content/writing/grod-listening-o.mdoc` | Migrated to the generalised fields. |
| `src/content/apps/aftershot.yaml`, `src/content/appPages/aftershot.mdoc` | Renamed from `afterframe`. |
| `src/content/company/index.mdoc` | Prose link updated. |
| `astro.config.mjs` | Permanent redirect for the old app URL. |
| `public/studies/aftershot-icon/*` | Derivatives. |
| `src/content/writing/aftershot-afterimage-ribbon.mdoc` | **New.** The study. |
| `tests/feature.test.ts` | Ladder-label, Glyphs-props and ink-enum guards. |

---

### Task 1: Generalise the three format assumptions

**Files:** modify `src/components/feature/Glyphs.astro`, `Spec.astro`, `Swatches.astro`, `src/styles/feature.css`, `markdoc.config.mjs`, `keystatic.config.ts`, `src/content/writing/grod-listening-o.mdoc`, `tests/feature.test.ts`

**Interfaces:**
- Produces: `Glyphs` taking `grounds`; `Spec` items taking `ink`/`inkDark`; bordered `Swatches` chips. Task 4 uses all three.

- [ ] **Step 1: Write the failing tests**

Append to `tests/feature.test.ts`:

```ts
import { readdirSync } from 'node:fs';

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
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test`
Expected: FAIL — the Glyphs and ink assertions. The ladder test should **pass** immediately: GRØD's rungs were corrected already, so it is a regression guard from birth rather than a red test. Say so in your report if it passes on the first run.

- [ ] **Step 3: Make `Glyphs`' labels content**

In `Glyphs.astro`, replace the module-level `strips` constant with a prop. Change `Props` to add:

```ts
  /* The two grounds are fixed — paper and ink are the site's two — but what
     they are CALLED is the study's business. GRØD proves a menu-bar glyph;
     Aftershot proves an app icon against a light and a dark field. Same
     shape, different words, so the words are content. */
  grounds?: { paper?: string; ink?: string };
```

and build the strips from it, defaulting to neutral wording rather than either study's:

```ts
const { heading, standfirst, marks = [], note, grounds } = Astro.props;
const strips = [
  { key: 'paper', context: grounds?.paper ?? 'Light ground' },
  { key: 'ink', context: grounds?.ink ?? 'Dark ground' },
];
```

Register `grounds` in `markdoc.config.mjs`'s `glyphs` attributes as `{ type: Object }`, and in the Keystatic `glyphs` schema as a `fields.object` of two texts, each described as what the ground is called in this study.

- [ ] **Step 4: Make `Spec`'s ink general**

`ink` currently only accepts `brand | teal | aubergine`, mapped to CSS by attribute selector. Change it to accept a **named site token or a hex**, and add an optional dark counterpart.

The dark counterpart matters: `--grod-aubergine` existed precisely because `#48234F` on the dark ground is unreadable. A single literal hex would regress that, so the mechanism that solved it becomes general rather than disappearing.

In `Spec.astro`'s `Item`, replace the `ink` type with:

```ts
  /* A named site token (scheme-aware, resolved in CSS) or a literal hex —
     a study's own ink is content, the same as a Swatches chip. `inkDark`
     is the dark-scheme counterpart for a hex that would not survive the
     ground inverting; omit it and `ink` is used in both. */
  ink?: string;
  inkDark?: string;
```

In the item mapping, replace the `dataInk` line with:

```ts
const HEX = /^#[0-9a-fA-F]{3,8}$/;
// ...per item:
  dataInk: item.ink === 'brand' || item.ink === 'teal' ? item.ink : undefined,
  inkStyle: HEX.test(item.ink ?? '')
    ? { '--spec-ink': item.ink, '--spec-ink-dark': HEX.test(item.inkDark ?? '') ? item.inkDark : item.ink }
    : undefined,
```

and render `<span class="spec__glyph" data-ink={item.dataInk} style={item.inkStyle} set:html={item.glyphSvg} />`.

Replace the three `[data-ink]` colour rules with two named ones plus the custom-property path, using the same three-state pattern `global.css` uses so an explicit light choice on a dark OS still gets the light ink:

```css
  .spec__glyph[data-ink='brand'] { color: var(--color-brand-strong); }
  .spec__glyph[data-ink='teal']  { color: var(--color-teal-ink); }
  /* A study's own ink, supplied inline. Same three-state shape as the
     palette in global.css — without the guard, forcing light on a dark OS
     would still get the dark ink. */
  .spec__glyph[style*='--spec-ink'] { color: var(--spec-ink); }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) .spec__glyph[style*='--spec-ink'] { color: var(--spec-ink-dark, var(--spec-ink)); }
  }
  :root[data-theme='dark'] .spec__glyph[style*='--spec-ink'] { color: var(--spec-ink-dark, var(--spec-ink)); }
```

Update the Markdoc `spec` attributes (items already ride as an Array, so nothing to add there) and the Keystatic item schema: replace the `ink` select with a text field described as `'brand', 'teal', or a hex like #E08A5B'`, and add `inkDark` described as the dark-scheme counterpart, optional.

Remove `--grod-aubergine` from `feature.css` entirely — all three declarations.

- [ ] **Step 5: Give every swatch chip an edge**

In `Swatches.astro`, change the chip rule:

```css
  /* Every chip, not just pale ones. This palette runs #000000 to #F2F1EE:
     without an edge the near-white chip vanishes on the bone ground and the
     black one becomes a hole in dark mode. A swatch you cannot see is not a
     swatch. */
  .swatch__chip { height: 120px; border-bottom: 1px solid var(--color-hairline); }
```

- [ ] **Step 6: Migrate GRØD so nothing regresses**

In `src/content/writing/grod-listening-o.mdoc`:
- the `glyphs` block gains `grounds={"paper":"Light menu bar","ink":"Dark menu bar"}` so its wording is unchanged;
- the Construction `spec`'s third item changes `"ink":"aubergine"` to `"ink":"#48234F","inkDark":"#C79BD0"` — the exact values `--grod-aubergine` held.

- [ ] **Step 7: Verify**

Run: `npm test` — expected 37 passing (34 + 3 new), pristine.
Run: `npm run build` — completes.
Run: `./scripts/verify-parity.sh` — will report the GRØD page changed (its markup legitimately changes). Confirm the diff is only the glyph tint mechanism and the strip labels being identical text from a different source, then re-snapshot.

In a browser at `/writing/grod-listening-o/`, in **both** appearances: the menu-bar strips still read "Light menu bar" / "Dark menu bar", and the third Construction glyph is aubergine on light and the lighter mauve on dark. Report the computed colours.

- [ ] **Step 8: Commit**

```bash
git add src/components/feature src/styles/feature.css markdoc.config.mjs keystatic.config.ts src/content/writing/grod-listening-o.mdoc tests/feature.test.ts
git commit -m "feat: generalise the format's three single-study assumptions

Glyphs hardcoded 'Light/Dark menu bar', which is meaningless for a study
of an icon with no menu bar; the labels are content now. Spec's ink enum
shipped one study's private aubergine to every future study's CMS
dropdown and gave the next study no way to name its own; it takes a site
token or a hex, with an optional dark counterpart because a literal hex
would not survive the ground inverting. Swatches chips get an edge,
without which a near-white chip vanishes on bone and a black one becomes
a hole in dark mode.

GRØD migrates in the same commit and renders identically."
```

---

### Task 2: Rename Afterframe to Aftershot, with a redirect

**Files:** rename `src/content/apps/afterframe.yaml` → `aftershot.yaml`, `src/content/appPages/afterframe.mdoc` → `aftershot.mdoc`; modify both, `src/content/company/index.mdoc`, `astro.config.mjs`

- [ ] **Step 1: Rename both content files together**

```bash
git mv src/content/apps/afterframe.yaml src/content/apps/aftershot.yaml
git mv src/content/appPages/afterframe.mdoc src/content/appPages/aftershot.mdoc
```

They must move in one step: `src/pages/apps/[id].astro` throws when the two ids disagree, and its comment says so.

- [ ] **Step 2: Update their contents**

In `aftershot.yaml`: `name: Aftershot`, and `url: /apps/aftershot`.
In `aftershot.mdoc`: `title: "Aftershot"`, and the body's "Afterframe" becomes "Aftershot".

- [ ] **Step 3: Update the prose link**

`src/content/company/index.mdoc` line 15 reads `[Afterframe](/apps/afterframe)`. Both halves change.

- [ ] **Step 4: Redirect the old URL**

`/apps/afterframe/` returns 200 today — it is live and linkable. In `astro.config.mjs`, add to the config object:

```js
  /* /apps/afterframe/ was live before the app was renamed. The route id is
     the content filename, so renaming the file moves the URL; without this
     anyone holding the old link gets a 404. Permanent, because the move is. */
  redirects: {
    '/apps/afterframe': { status: 301, destination: '/apps/aftershot' },
  },
```

- [ ] **Step 5: Verify**

```bash
npm run build
grep -rl "afterframe" src/ | grep -v '\.superpowers' || echo "no stale references"
ls dist/apps/
```

Expected: build completes, no stale references, and `dist/apps/` contains `aftershot`. Confirm the redirect is emitted — with the Cloudflare adapter it appears in the build output or `dist/_redirects`; report which, and its exact contents.

Then check the built app page renders the new name, and that the homepage apps list links to `/apps/aftershot`.

- [ ] **Step 6: Commit**

```bash
git add -A src/content astro.config.mjs
git commit -m "feat: rename Afterframe to Aftershot

The app's real name; the site was stale. apps/<id>.yaml and
appPages/<id>.mdoc carry the route id in their filename and the route
throws if they disagree, so both move together.

/apps/afterframe/ was live and linkable, so the old path gets a
permanent redirect rather than a 404."
```

---

### Task 3: Assets

**Files:** create `public/studies/aftershot-icon/*`

Source: `/Users/magneticadmin/Git/afterframe/.worktrees/aftershot-icon-story/Design/AppIcon/story/assets/aftershot-app-icon.png` — 1024², **opaque** (no alpha), 1.15MB.

- [ ] **Step 1: Generate the derivatives**

Use `sharp` from the repo root — it is already a dependency (Astro's image pipeline). `sips` on this machine reads webp but cannot write it, and the only `cwebp` present is an x86_64 binary that will not run.

Sizes the ladder actually renders: 1024, 180, 120, 60, 40, 29.

```js
const sharp = require('sharp');
const SRC = '/Users/magneticadmin/Git/afterframe/.worktrees/aftershot-icon-story/Design/AppIcon/story/assets/aftershot-app-icon.png';
for (const size of [1024, 180, 120, 60, 40, 29]) {
  await sharp(SRC).resize(size, size).webp({ quality: 82 })
    .toFile(`public/studies/aftershot-icon/icon-${size}.webp`);
}
```

Write it as a one-off script from the repo root, run it, then delete it — it is not a build step and must not be committed.

- [ ] **Step 2: Verify they are real**

```bash
file public/studies/aftershot-icon/*.webp
node -e "const s=require('sharp'),f=require('fs');(async()=>{for(const n of f.readdirSync('public/studies/aftershot-icon')){const m=await s('public/studies/aftershot-icon/'+n).metadata();console.log(n,m.format,m.width+'x'+m.height,'alpha='+m.hasAlpha,f.statSync('public/studies/aftershot-icon/'+n).size+'B');}})()"
```

Every file must report `Web/P image` and the expected dimensions. Report each size in bytes and the total. The source has no alpha, so these should compress harder than the GRØD set did — if the total exceeds ~150KB, say so.

- [ ] **Step 3: Commit**

```bash
git add public/studies/aftershot-icon
git commit -m "assets: Aftershot icon study artwork

webp derivatives at the sizes the ladder renders. The master is 1.15MB
and the ladder shows it six times; the source is opaque, so these
compress harder than the GRØD set."
```

---

### Task 4: Port the study

**Files:** create `src/content/writing/aftershot-afterimage-ribbon.mdoc`

Source: `~/Git/afterframe/.worktrees/aftershot-icon-story/Design/AppIcon/story/index.html` — read it.

- [ ] **Step 1: Write the post**

Frontmatter: `template: feature`, `app: aftershot`, `eyebrow: "Icon study 02"`, a `date` of 2026-09-05, a `readingTime`, a `dek`, and `draft: true` while you work.

Section mapping — every one of these is a block that already exists:

| Source | Block |
| --- | --- |
| "A moment that stays." / Afterimage Ribbon | `plate` (hero, `level=1`) |
| Watch / Notice / Capture / Remember | `band` |
| Origin — four moves | `spec columns=1` |
| Scale — 1024 → 29px | `scaleProof` |
| Dark field / Light field at 120px | `glyphs` with `grounds` naming them |
| Anatomy — four parts | `spec columns=1` |
| Process — five steps | `spec columns=1` |
| Palette — three inks | `swatches` |
| Internal specification | `spec columns=1` |

Constraints while writing it:

- Every block self-closing (`{% tag /%}`).
- No raw HTML in any field. A bold caption lead-in is `captionLead`; a numbered key is `num` plus `key`.
- **`glyphs` marks must be `.svg` under `/studies/`** — `readStudySvg` only reads SVG. The dark/light field pair uses the icon **png-derived webp**, which `glyphs` cannot inline. Use `scaleProof` with two 120px rungs labelled "Dark field" and "Light field" instead, **or** report that `glyphs` cannot carry it and say what you did. Do not force it.
- `spec columns=1` throughout — the beside layout is capped at 3 and none of these sections has glyphs to fill a tall column.
- The `swatches` block carries `#000000`, `#E08A5B`, `#F2F1EE` with their jobs.

The "Canonical asset" line names an Xcode path. That is a note to Alex, not something the site should assert to a reader. Port it as prose or cut it — your call, with reasoning in the report.

Drop the source's "Wallpaper proof" toggle. The site has a real theme control and a per-post appearance switch fights the reader's own choice.

- [ ] **Step 2: Clear the draft flag and verify**

Set `draft: false`.

```bash
npm test && npm run build
```

Then, on the rendered page:

```bash
npm run dev &
sleep 6
curl -s http://localhost:4321/writing/aftershot-afterimage-ribbon/ > /tmp/af.html
echo -n "blocks inside a <p> (must be 0): "; grep -c '<p[^>]*>[^<]*<section class="\(plate\|band\|spec\|swatches\|glyphs\|ladder\)' /tmp/af.html
echo -n "h1 count (must be 1): "; grep -o '<h1' /tmp/af.html | wc -l
kill %1
```

- [ ] **Step 3: Read it in a browser**

At 1280px and at mobile, in **both** appearances. Report section by section what you saw — specifically:
- the ladder reads as one descent and every label matches its rendered size;
- all three palette chips are **visible**, including the near-white one on bone and the black one on dark;
- the black icon does not disappear against the dark ground.

- [ ] **Step 4: Commit**

```bash
git add src/content/writing/aftershot-afterimage-ribbon.mdoc
git commit -m "feat: publish the Aftershot icon study

The format's second study, and the first written in it rather than
around it — every section maps to a block that already existed."
```

---

### Task 5: Document and re-snapshot

**Files:** modify `DESIGN.md`, regenerate `.baseline/**`

- [ ] **Step 1: Record what changed in the design system**

`DESIGN.md` states the two-ink exception for studies. Update it to reflect that a study's ink is now supplied by the study rather than registered in the stylesheet, and remove any reference to `--grod-aubergine`, which no longer exists.

- [ ] **Step 2: Isolate the branch**

Build the branch base in a temporary worktree and compare the two builds directly. Do not read the parity gate's diff against the old baseline — that shortcut has already failed twice on this repo.

```bash
BASE=$(git merge-base main HEAD)
git worktree add --detach /tmp/as-base "$BASE"
ln -s "$(git rev-parse --show-toplevel)/node_modules" /tmp/as-base/node_modules
(cd /tmp/as-base && npm run build)
```

Expected categories and **nothing else**:
1. The new `writing/aftershot-afterimage-ribbon/` route plus its listing/RSS/sitemap entries.
2. `apps/afterframe/` → `apps/aftershot/`, plus the redirect.
3. The GRØD page's glyph tint markup, and the swatch chip border in the shared stylesheet.

If an unrelated page's body changed, stop and report it. Then clean up:

```bash
rm -f /tmp/as-base/node_modules && git worktree remove --force /tmp/as-base
```

- [ ] **Step 3: Re-snapshot and verify**

```bash
./scripts/snapshot-baseline.sh && ./scripts/verify-parity.sh
```

Expected `PARITY OK`.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md
git commit -m "docs: record the generalised study ink, and re-snapshot

A study's ink is now supplied by the study rather than registered as a
token in the stylesheet, so DESIGN.md's two-ink exception says that
instead of naming one app's colour.

Baseline verified against a build of the branch base, not against the
old baseline."
```

---

## Verification

Done when:

- `npm test` passes — 37 tests.
- `npm run build` completes; `./scripts/verify-parity.sh` prints `PARITY OK`.
- `/apps/aftershot/` renders and `/apps/afterframe/` redirects to it.
- The new study renders all its blocks, none inside a `<p>`, with one `<h1>`.
- Every ladder label matches its rendered size.
- All three palette chips are visible in **both** appearances.
- GRØD's study is unchanged to the eye — same strip labels, same aubergine tint light and dark.
