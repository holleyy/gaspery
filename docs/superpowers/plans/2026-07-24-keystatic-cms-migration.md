# Keystatic CMS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Astro Editor with Keystatic so every page of the site — writing, app pages, the apps roster, and the About/Now/homepage copy currently hardcoded in `.astro` files — is editable in a GUI, with zero visual change to the rendered site.

**Architecture:** Add React + Markdoc + Keystatic + the Cloudflare adapter to an Astro 5 static site. Public pages stay prerendered; only `/keystatic` and `/api/keystatic/*` render on demand, which converts the Cloudflare deploy from static assets to a Worker. Content moves from `.md` to `.mdoc` (Keystatic cannot write plain `.md`), hardcoded page prose moves into Keystatic singletons, and `apps.json` becomes one file per app.

**Tech Stack:** Astro 5, Keystatic, Markdoc, React, Cloudflare Workers, Zod (via `astro:content`).

## Global Constraints

- **The rendered site must not change.** This is a plumbing migration, not a redesign. Any visual difference is a bug, not an improvement.
- **CSS scoping:** only two selectors need a `:global()` fix, both verified — `.about-page__prose p` (Task 7) and `.now-page__entry em` (Task 8). `.riso-photo` is in `src/styles/global.css` and `src/pages/writing/[...id].astro` already uses `:global()`, so neither needs changing. Do not go hunting for others.
- Repo is `holleyy/gaspery`; work happens on branch `keystatic-cms`. Never commit to `main`.
- Content files are `.mdoc` (Markdoc), never `.md` or `.mdx`.
- Existing entry IDs / filenames must be preserved exactly: `grod`, `pls-fix`, `afterframe`, `top-secret`, and all six writing slugs. URLs must not move.
- `.env` must never be committed (already gitignored).
- Keystatic storage: `local` in dev, `github` in production.
- Commits go straight to `main` in Keystatic's GitHub config (no PR workflow).
- Never run a dev server with `Bash`; use the preview/browser tooling.
- **Steps marked `[CONTROLLER]` are performed by the controlling session, not by task implementers** — screenshots cannot be handed between fresh subagents. Implementers skip those steps and rely on `./scripts/verify-parity.sh`.

**Reference spec:** `docs/superpowers/specs/2026-07-24-keystatic-cms-migration-design.md`

---

## File Structure

**Create:**
- `scripts/snapshot-baseline.sh` — capture pre-migration HTML baseline
- `scripts/verify-parity.sh` — normalized HTML diff of current build vs baseline
- `keystatic.config.ts` — Keystatic schema: storage, collections, singletons
- `markdoc.config.mjs` — Astro Markdoc tag registry
- `src/components/RisoPhoto.astro` — renders the riso figure markup
- `src/lib/inlineMarkdoc.ts` — inline Markdoc → HTML fragment helper
- `src/content/apps/{grod,pls-fix,afterframe,top-secret}.yaml`
- `src/content/about/index.mdoc`
- `src/data/now/index.json`
- `src/data/home/index.json`
- `docs/keystatic-setup.md` — the credential steps only Alex can perform

**Modify:**
- `astro.config.mjs`, `src/content.config.ts`, `wrangler.jsonc`, `.gitignore`, `package.json`
- `src/content/writing/*.md` → `*.mdoc` (6 files)
- `src/content/appPages/*.md` → `*.mdoc` (3 files)
- `src/pages/about.astro`, `src/pages/now.astro`, `src/pages/index.astro`

**Delete:**
- `src/content/apps.json`

---

### Task 1: Regression harness — baseline the current site

**Files:**
- Create: `scripts/snapshot-baseline.sh`
- Create: `scripts/verify-parity.sh`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `.baseline/` (gitignored HTML snapshot) and `./scripts/verify-parity.sh`, which exits `0` when the built HTML matches the baseline and non-zero otherwise. Every later task runs `./scripts/verify-parity.sh` as its regression gate.

**Why normalization:** Astro emits hashed asset paths (`/_astro/x.Ab3dEf.css`) and per-component scope attributes (`data-astro-cid-xxxx`). Both change legitimately during this migration, so the diff strips them and compares meaningful structure and text only. Because scope attributes are stripped, this harness **cannot** catch CSS-scoping regressions — that is what the screenshots in Step 5 are for.

- [ ] **Step 1: Add the baseline directory to `.gitignore`**

Append to `.gitignore` under the `# build output` section:

```
# visual regression baseline
.baseline/
```

- [ ] **Step 2: Write the snapshot script**

Create `scripts/snapshot-baseline.sh`:

```bash
#!/usr/bin/env bash
# Capture the current build's HTML as the visual-regression baseline.
# Run ONCE, before any migration work.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build >/dev/null
rm -rf .baseline
mkdir -p .baseline

while IFS= read -r f; do
  rel="${f#dist/}"
  mkdir -p ".baseline/$(dirname "$rel")"
  cp "$f" ".baseline/$rel"
done < <(find dist -name '*.html')

echo "Baseline captured: $(find .baseline -name '*.html' | wc -l | tr -d ' ') pages"
```

- [ ] **Step 3: Write the parity verification script**

Create `scripts/verify-parity.sh`:

```bash
#!/usr/bin/env bash
# Rebuild and compare HTML against the baseline, ignoring asset hashes
# and Astro scope attributes. Exit 0 = no structural/content change.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .baseline ]; then
  echo "ERROR: no .baseline/ — run scripts/snapshot-baseline.sh first" >&2
  exit 2
fi

npm run build >/dev/null || { echo "BUILD FAILED" >&2; exit 2; }

norm() {
  sed -E \
    -e 's#/_astro/[A-Za-z0-9_.-]+\.(css|js)#/_astro/ASSET#g' \
    -e 's# ?data-astro-cid-[a-z0-9]+(="[^"]*")?##g' \
    -e 's# ?astro-[a-z0-9]{8}##g' \
    "$1"
}

fail=0

# Route set must match exactly.
if ! diff <(cd dist && find . -name '*.html' | sort) \
          <(cd .baseline && find . -name '*.html' | sort) > /tmp/routes.diff; then
  echo "ROUTE SET CHANGED:"; cat /tmp/routes.diff; fail=1
fi

while IFS= read -r f; do
  rel="${f#dist/}"
  [ -f ".baseline/$rel" ] || continue
  if ! diff -q <(norm "$f") <(norm ".baseline/$rel") >/dev/null; then
    echo "CHANGED: $rel"
    diff -u <(norm ".baseline/$rel") <(norm "$f") | head -30
    fail=1
  fi
done < <(find dist -name '*.html' | sort)

[ $fail -eq 0 ] && echo "PARITY OK — all pages match baseline"
exit $fail
```

- [ ] **Step 4: Make both scripts executable and capture the baseline**

Run:
```bash
chmod +x scripts/snapshot-baseline.sh scripts/verify-parity.sh && ./scripts/snapshot-baseline.sh
```
Expected: `Baseline captured: 13 pages`

- [ ] **Step 5: `[CONTROLLER]` Capture baseline screenshots — skip if you are a task implementer**

Performed by the controlling session before this task is dispatched. Scoped to `/about` and `/now` at desktop (1280x800) and mobile (375x812) — the only two routes whose CSS this migration changes. Every other route is covered by the HTML parity diff, since unchanged HTML plus unchanged CSS cannot render differently.

- [ ] **Step 6: Verify the harness detects a real change**

Prove the gate works before trusting it. Temporarily edit `src/pages/now.astro`, changing the `<h1>` text `Now` to `Nowx`, then run:
```bash
./scripts/verify-parity.sh
```
Expected: non-zero exit, printing `CHANGED: now/index.html`. Revert the edit and re-run; expected `PARITY OK — all pages match baseline`.

- [ ] **Step 7: Commit**

```bash
git add scripts/ .gitignore
git commit -m "test: add HTML parity regression harness for the Keystatic migration"
```

---

### Task 2: Install integrations and the Cloudflare adapter

**Files:**
- Modify: `astro.config.mjs`, `package.json`

**Interfaces:**
- Consumes: `./scripts/verify-parity.sh` (Task 1).
- Produces: a build with `react()`, `markdoc()`, `keystatic()` integrations and the `cloudflare()` adapter registered. Later tasks assume `@astrojs/markdoc` and `@keystatic/core` are installed.

- [ ] **Step 1: Install packages**

Run:
```bash
npm install @keystatic/core @keystatic/astro @astrojs/react @astrojs/markdoc @astrojs/cloudflare react react-dom
```
Expected: installs succeed, `package.json` dependencies updated.

- [ ] **Step 2: Update `astro.config.mjs`**

Replace the file with:

```js
// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // TODO: replace with your real production domain once the custom domain is live.
  // Used for canonical URLs, the sitemap, and the RSS feed.
  site: 'https://your-domain.com',

  integrations: [sitemap(), react(), markdoc(), keystatic()],
  adapter: cloudflare(),
});
```

Note: `output` is intentionally left at its default (`static`) so public pages stay prerendered.

- [ ] **Step 3: Verify the build still produces identical HTML**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

If the route set diff reports Keystatic routes as new `.html` files, that means they were prerendered — they must not be. Confirm they are on-demand instead by checking the build log lists them under server routes (`λ`), not prerendered (`▶`).

- [ ] **Step 4: Confirm public routes are still prerendered**

Run:
```bash
npm run build 2>&1 | grep -E '^\s*(▶|λ)' | head -20
```
Expected: all `src/pages/*` entries appear with `▶` (prerendered). Only Keystatic/API routes may appear as `λ`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "feat: add react, markdoc, keystatic and cloudflare adapter"
```

---

### Task 3: Keystatic config and a reachable admin

**Files:**
- Create: `keystatic.config.ts`

**Interfaces:**
- Consumes: Task 2's integrations.
- Produces: `export default config({...})` from `keystatic.config.ts`. Later tasks add entries to its `collections` and `singletons` objects. Storage resolves to `local` in dev and `github` in production.

This task deliberately ships an empty schema so the integration itself is proven working before any content is migrated.

- [ ] **Step 1: Create `keystatic.config.ts` at the project root**

```ts
import { config } from '@keystatic/core';

export default config({
  storage: import.meta.env.DEV
    ? { kind: 'local' }
    : { kind: 'github', repo: { owner: 'holleyy', name: 'gaspery' } },
  ui: {
    brand: { name: 'gaspery' },
  },
  collections: {},
  singletons: {},
});
```

- [ ] **Step 2: Verify the admin loads**

Start the dev server via `preview_start` and navigate to `/keystatic`. Use `read_page` to confirm the Keystatic admin shell renders (in local mode it loads without a GitHub login). Check `read_console_messages` for errors.

Expected: admin UI renders, no console errors.

- [ ] **Step 3: Verify parity is unaffected**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

- [ ] **Step 4: Commit**

```bash
git add keystatic.config.ts
git commit -m "feat: add keystatic config with local/github dual storage"
```

---

### Task 4: Markdoc rendering, the RisoPhoto block, and the writing collection

This is the largest task because the pieces are inseparable: converting writing to `.mdoc` immediately breaks the photography post's raw HTML, so the `RisoPhoto` component must land in the same change.

**Files:**
- Create: `src/components/RisoPhoto.astro`, `markdoc.config.mjs`
- Modify: `src/content.config.ts`, `keystatic.config.ts`
- Rename: `src/content/writing/*.md` → `*.mdoc` (6 files)
- Modify: `src/content/writing/so-well-planned-it-feels-unplanned.mdoc`

**Interfaces:**
- Consumes: `keystatic.config.ts` (Task 3).
- Produces: `RisoPhoto` Markdoc tag accepting `src: String` and `alt: String`; a `risoPhotoComponents` object exported from `keystatic.config.ts` for reuse; the `writing` Astro collection now globbing `**/*.mdoc`.

- [ ] **Step 1: Create the RisoPhoto component**

Create `src/components/RisoPhoto.astro`. The markup must match the existing hand-written figures byte for byte:

```astro
---
interface Props {
  src: string;
  alt: string;
}
const { src, alt } = Astro.props;
---
<figure class="riso-photo">
  <img src={src} alt={alt} loading="lazy" />
</figure>
```

- [ ] **Step 2: Register the Markdoc tag**

Create `markdoc.config.mjs` at the project root:

```js
import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  tags: {
    RisoPhoto: {
      render: component('./src/components/RisoPhoto.astro'),
      attributes: {
        src: { type: String, required: true },
        alt: { type: String, required: true },
      },
    },
  },
});
```

- [ ] **Step 3: Rename the writing files to `.mdoc`**

Run:
```bash
cd src/content/writing && for f in *.md; do git mv "$f" "${f%.md}.mdoc"; done && ls
```
Expected: six `.mdoc` files, no `.md` remaining.

- [ ] **Step 4: Convert the photography post's figures**

In `src/content/writing/so-well-planned-it-feels-unplanned.mdoc`, replace each of the 11 blocks of the form:

```html
<figure class="riso-photo">
  <img src="/writing/so-well-planned-it-feels-unplanned/1.jpg" alt="Sunrise mist over Hampstead Heath, a lone dog walker cutting through the gold." loading="lazy" />
</figure>
```

with the equivalent Markdoc tag, preserving each `src` and `alt` exactly:

```
{% RisoPhoto src="/writing/so-well-planned-it-feels-unplanned/1.jpg" alt="Sunrise mist over Hampstead Heath, a lone dog walker cutting through the gold." /%}
```

Do this for images `1.jpg` through `11.jpg`. Verify none remain:
```bash
grep -c '<figure' src/content/writing/so-well-planned-it-feels-unplanned.mdoc
```
Expected: `0`

- [ ] **Step 5: Point the writing collection at `.mdoc`**

In `src/content.config.ts`, change the `writing` loader pattern:

```ts
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/writing' }),
```

- [ ] **Step 6: Add the writing collection to Keystatic**

In `keystatic.config.ts`, add the imports and the collection. Export the components object so Task 5 can reuse it:

```ts
import { config, collection, fields } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

export const risoPhotoComponents = {
  RisoPhoto: block({
    label: 'Riso photo',
    schema: {
      src: fields.text({ label: 'Image path', validation: { isRequired: true } }),
      alt: fields.text({ label: 'Alt text', validation: { isRequired: true } }),
    },
  }),
};
```

and inside `collections`:

```ts
    writing: collection({
      label: 'Writing',
      path: 'src/content/writing/*',
      slugField: 'title',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        date: fields.date({ label: 'Date' }),
        readingTime: fields.text({ label: 'Reading time' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
      },
    }),
```

- [ ] **Step 7: Verify HTML parity**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

This is the critical gate: it proves all six posts still render identically **and** that the 11 converted figures produce the same HTML as the hand-written originals.

- [ ] **Step 8: Verify the figures specifically**

Run:
```bash
grep -c 'class="riso-photo"' dist/writing/so-well-planned-it-feels-unplanned/index.html
```
Expected: `11`

- [ ] **Step 9: Commit**

```bash
git add -A src/content/writing src/content.config.ts src/components/RisoPhoto.astro markdoc.config.mjs keystatic.config.ts
git commit -m "feat: migrate writing to markdoc with a RisoPhoto content block"
```

---

### Task 5: App pages collection

**Files:**
- Rename: `src/content/appPages/*.md` → `*.mdoc` (3 files)
- Modify: `src/content.config.ts`, `keystatic.config.ts`

**Interfaces:**
- Consumes: `risoPhotoComponents` from `keystatic.config.ts` (Task 4).
- Produces: `appPages` collection editable in Keystatic with `spreads` as a repeatable block editor.

- [ ] **Step 1: Rename to `.mdoc`**

Run:
```bash
cd src/content/appPages && for f in *.md; do git mv "$f" "${f%.md}.mdoc"; done && ls
```
Expected: `afterframe.mdoc grod.mdoc pls-fix.mdoc`

- [ ] **Step 2: Update the loader**

In `src/content.config.ts`:

```ts
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/appPages' }),
```

- [ ] **Step 3: Add the collection to Keystatic**

In `keystatic.config.ts`, inside `collections`:

```ts
    appPages: collection({
      label: 'App pages',
      path: 'src/content/appPages/*',
      slugField: 'title',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        template: fields.select({
          label: 'Template',
          options: [
            { label: 'Quiet', value: 'quiet' },
            { label: 'Editorial', value: 'editorial' },
          ],
          defaultValue: 'quiet',
        }),
        spreads: fields.array(
          fields.object({
            heading: fields.text({ label: 'Heading' }),
            body: fields.text({ label: 'Body', multiline: true }),
          }),
          { label: 'Spreads', itemLabel: (props) => props.fields.heading.value },
        ),
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
      },
    }),
```

- [ ] **Step 4: Verify parity**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

- [ ] **Step 5: Verify the spreads editor**

In the running preview, navigate to `/keystatic` → App pages → GRØD. Use `read_page` to confirm `spreads` renders as four discrete repeatable items with Heading and Body inputs — **not** a raw JSON textarea. This is the specific defect that motivated the migration.

- [ ] **Step 6: Commit**

```bash
git add -A src/content/appPages src/content.config.ts keystatic.config.ts
git commit -m "feat: migrate app pages to markdoc with repeatable spreads"
```

---

### Task 6: Apps roster — JSON file to per-app entries

**Files:**
- Create: `src/content/apps/{grod,pls-fix,afterframe,top-secret}.yaml`
- Delete: `src/content/apps.json`
- Modify: `src/content.config.ts`, `keystatic.config.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `apps` collection loaded via `glob()`, where each entry's `id` is its filename. `src/pages/apps/[id].astro` already matches on `a.id === page.id`, so filenames must stay exactly `grod`, `pls-fix`, `afterframe`, `top-secret`. The `id` field is removed from the schema because it is now the filename.

- [ ] **Step 1: Create the four YAML files**

`src/content/apps/grod.yaml`:
```yaml
name: GRØD
dek: A private, Mac-native memory for your meetings — notes you'd keep, not just a transcript.
meta: macOS · SwiftUI
status: live
url: /apps/grod
order: 1
```

`src/content/apps/pls-fix.yaml`:
```yaml
name: pls fix.
dek: Edits the HTML decks Claude generates — without opening an HTML editor.
meta: macOS · SwiftUI
status: dev
url: /apps/pls-fix
order: 2
```

`src/content/apps/afterframe.yaml`:
```yaml
name: Afterframe
dek: Pulls stills and GIFs straight off whatever's playing on your Plex server.
meta: iOS · SwiftUI
status: dev
url: /apps/afterframe
order: 3
```

`src/content/apps/top-secret.yaml`:
```yaml
name: Top Secret
dek: Something new — details when it's ready.
meta: Details soon
status: planning
order: 4
```

Note `top-secret.yaml` has no `url` key — it is optional and that app has no detail page.

- [ ] **Step 2: Update the loader and schema**

In `src/content.config.ts`, replace the `apps` collection and drop the now-unused `file` import (change `import { glob, file } from 'astro/loaders';` to `import { glob } from 'astro/loaders';`):

```ts
const apps = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/apps' }),
  schema: z.object({
    name: z.string(),
    dek: z.string(),
    meta: z.string(),
    status: z.enum(['live', 'dev', 'planning']),
    url: z.string().optional(),
    order: z.number(),
  }),
});
```

- [ ] **Step 3: Delete the old JSON**

Run:
```bash
git rm src/content/apps.json
```

- [ ] **Step 4: Add the collection to Keystatic**

In `keystatic.config.ts`, inside `collections`:

```ts
    apps: collection({
      label: 'Apps',
      path: 'src/content/apps/*',
      slugField: 'name',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        meta: fields.text({ label: 'Meta' }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Live', value: 'live' },
            { label: 'Dev', value: 'dev' },
            { label: 'Planning', value: 'planning' },
          ],
          defaultValue: 'planning',
        }),
        url: fields.text({ label: 'URL' }),
        order: fields.number({ label: 'Order' }),
      },
    }),
```

- [ ] **Step 5: Verify parity**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`. This proves the homepage apps list and all three `/apps/*` pages still render identically from the new per-file source.

- [ ] **Step 6: Commit**

```bash
git add -A src/content/apps src/content.config.ts keystatic.config.ts
git commit -m "feat: split apps roster into per-app entries for GUI editing"
```

---

### Task 7: About page singleton

**Files:**
- Create: `src/content/about/index.mdoc`
- Modify: `src/pages/about.astro`, `src/content.config.ts`, `keystatic.config.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: an Astro collection named `about` with a single entry whose id is `index`, fetched via `getEntry('about', 'index')` and rendered via `render(entry)`.

**Critical:** moving prose out of the template means Astro's scoped CSS stops matching it. `.about-page__prose p` must become `.about-page__prose :global(p)` or the typography silently changes.

- [ ] **Step 1: Create the content file**

Create `src/content/about/index.mdoc`. Frontmatter holds title and dek; the body is the seven paragraphs from `about.astro` converted to Markdown, with the three inline links as Markdown links:

```
---
title: About
dek: Product, running, film, and music — the rest of what's true, not just the CV.
---

I've spent most of my career finding out what happens when you take something complicated and make it feel like it isn't. That's the throughline, if there is one — in the product work, in the running, in the taste. I like things that are precisely built and don't announce it.

I started in education, working inside charities before I'd ever heard the phrase "product manager" said out loud. Then, in 2018, I became the first product hire at a blockchain ticketing startup — two years spent making sure nobody buying a ticket ever had to know what a blockchain was. That's still mostly the job: find the complicated, slightly frightening thing underneath, and let the person on the other end just tap a button.

Since then there's been an InsurTech platform running across four international regions, a Member Communications tool that finally told Nationwide who it had said what to and when, and a driver-coaching app for Michelin that turned machine-learning signals into something a driver could act on mid-shift. Currently it's Fresenius Medical Care, where the software I work on supports over 300,000 home dialysis patients worldwide — which has a way of putting a product roadmap into perspective — alongside running discovery workshops for the kind of organisations that still print their strategy decks. The long version is on [LinkedIn](https://linkedin.com/in/aholley/).

The other discipline is running — marathons and cross country, including the British Marathon Championships, and for one brief week, a spot somewhere in the top 100 marathoners in the country. I wrote up the last long run before my personal best — 2:41 in San Sebastián — [over here](/writing/so-well-planned-it-feels-unplanned). Most of the training happens on Hampstead Heath, which I'm unreasonably attached to.

I clearly like the same thing in film as I do at my desk. Fincher, Nolan, Park Chan-wook, Barry Jenkins — directors who build something exact and let you feel the precision rather than explain it. Inception, Moonlight, Parasite, The Social Network, Cloud Atlas and Kill Bill are the ones I'll always stop and rewatch. On television I've apparently spent a decade watching people at work — Halt and Catch Fire, Industry, Mad Men, Succession, Andor — alongside The Leftovers, Station Eleven, The Americans and Atlanta, which are mostly about grief and getting away with things instead. I log all of it on [Letterboxd](https://letterboxd.com/holley/).

Music's been a constant longer than any of this — Kendrick, Kanye before Life of Pablo, and Solange for the version of hip-hop that's still doing something formally interesting; Nils Frahm, Darkside, Caribou, Four Tet, Bonobo and Theon Cross for when I want texture and rhythm over lyrics. Most of it ends up soundtracking a run eventually, whether it was built for one or not — ask the Jacques Greene techno that carried me through the back half in Spain.

Some of this you were always going to see — the essays, the apps, the CV. The rest I just wanted written down somewhere.
```

- [ ] **Step 2: Register the Astro collection**

In `src/content.config.ts`, add:

```ts
const about = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/about' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
  }),
});
```

and update the export:

```ts
export const collections = { writing, apps, appPages, about };
```

- [ ] **Step 3: Rewrite `about.astro` to read from the collection**

Replace the frontmatter and the prose block. The full new file:

```astro
---
import { getEntry, render } from 'astro:content';
import Base from '../layouts/Base.astro';
import Rail from '../components/Rail.astro';
import RegistrationMark from '../components/RegistrationMark.astro';

const entry = await getEntry('about', 'index');
if (!entry) throw new Error('Missing about singleton at src/content/about/index.mdoc');
const { Content } = await render(entry);
---
<Base title={`${entry.data.title} — Alex Holley`} description={entry.data.dek}>
  <div class="page">
    <Rail name="Alex Holley" role="Words, design, tools & links" monogram="A" current="About" />

    <main class="main">
      <section class="about-page">
        <h1 class="about-page__title">{entry.data.title}</h1>
        <p class="about-page__dek">{entry.data.dek}</p>

        <div class="about-page__prose">
          <Content />
        </div>

        <div class="about-page__end">
          <RegistrationMark size={14} />
          <a href="/">Back to the notebook →</a>
        </div>
      </section>
    </main>
  </div>
</Base>
```

Keep the entire existing `<style>` block, with one change in Step 4.

- [ ] **Step 4: Fix the CSS scoping**

In the `<style>` block of `about.astro`, change the paragraph rule so it matches rendered content:

```css
  .about-page__prose :global(p) { font-size: var(--text-body); line-height: 1.7; max-width: 62ch; }
```

The `:global(a)` and `:global(a:hover)` rules already use `:global` and need no change.

- [ ] **Step 5: Verify parity**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

- [ ] **Step 6: `[CONTROLLER]` Verify visually — skip if you are a task implementer**

The controlling session screenshots `/about` at desktop and mobile and compares against the baseline, confirming paragraph size, line height, measure (`62ch` wrap point), and link colour are unchanged. A structural diff pass with a visual mismatch means the `:global` fix is incomplete. Report your parity result and stop; the controller runs this gate.

- [ ] **Step 7: Add the singleton to Keystatic**

In `keystatic.config.ts`, add `singleton` to the import from `@keystatic/core` and add to `singletons`:

```ts
    about: singleton({
      label: 'About page',
      path: 'src/content/about',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
      },
    }),
```

- [ ] **Step 8: Commit**

```bash
git add -A src/content/about src/pages/about.astro src/content.config.ts keystatic.config.ts
git commit -m "feat: move About page copy into a Keystatic singleton"
```

---

### Task 8: Now page singleton

**Files:**
- Create: `src/data/now/index.json`, `src/lib/inlineMarkdoc.ts`
- Modify: `src/pages/now.astro`, `keystatic.config.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `renderInline(source: string): string` exported from `src/lib/inlineMarkdoc.ts` — converts an inline Markdoc string to an HTML fragment with no wrapping `<p>`, so it can be injected inside existing markup.

The Now entries contain `<em>` emphasis that must survive. The date must render exactly as `21 Jul 2026`, so formatting is done with an explicit month table rather than `toLocaleDateString`, which is locale- and platform-dependent.

- [ ] **Step 1: Create the inline Markdoc helper**

Create `src/lib/inlineMarkdoc.ts`:

```ts
import Markdoc from '@markdoc/markdoc';

/**
 * Render an inline Markdoc string (emphasis, links) to an HTML fragment
 * without Markdoc's wrapping <article>/<p>, so the result can sit inside
 * existing markup such as `.now-page__entry p`.
 */
export function renderInline(source: string): string {
  const html = Markdoc.renderers.html(Markdoc.transform(Markdoc.parse(source ?? '')));
  return html
    .replace(/^<article>\s*/, '')
    .replace(/\s*<\/article>$/, '')
    .replace(/^<p>/, '')
    .replace(/<\/p>$/, '')
    .trim();
}
```

- [ ] **Step 2: Create the data file**

Create `src/data/now/index.json`:

```json
{
  "updated": "2026-07-21",
  "title": "Now",
  "dek": "What's actually on my desk and in my ears right now — not a highlight reel.",
  "entries": [
    {
      "heading": "Building",
      "body": "Teaching GRØD to notice a meeting on its own, and folding this same two-ink palette into the app itself. Both are still mid-shape — a proper post is coming once there's something worth showing rather than telling."
    },
    {
      "heading": "Reading",
      "body": "*The Faith of Beasts*, by James S. A. Corey — the pen name behind The Expanse. Early into this one; more once I'm further in."
    },
    {
      "heading": "Watching",
      "body": "*The Agency*, on Paramount+."
    },
    {
      "heading": "Listening",
      "body": "Every Odyssey podcast I can find. There's no such thing as too many takes on one story that old."
    }
  ]
}
```

- [ ] **Step 3: Rewrite `now.astro`**

Replace the frontmatter and the four entry blocks:

```astro
---
import Base from '../layouts/Base.astro';
import Rail from '../components/Rail.astro';
import RegistrationMark from '../components/RegistrationMark.astro';
import now from '../data/now/index.json';
import { renderInline } from '../lib/inlineMarkdoc';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d = new Date(now.updated);
const updatedLabel = `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
---
<Base
  title="Now — Alex Holley"
  description="What I'm building, reading, watching, and listening to right now."
>
  <div class="page">
    <Rail name="Alex Holley" role="Words, design, tools & links" monogram="A" current="Now" />

    <main class="main">
      <section class="now-page">
        <div class="now-page__meta label">Updated {updatedLabel}</div>
        <h1 class="now-page__title">{now.title}</h1>
        <p class="now-page__dek">{now.dek}</p>

        {now.entries.map((entry) => (
          <div class="now-page__entry">
            <h2>{entry.heading}</h2>
            <p set:html={renderInline(entry.body)} />
          </div>
        ))}

        <div class="now-page__end">
          <RegistrationMark size={14} />
          <a href="/">Back to the notebook →</a>
        </div>
      </section>
    </main>
  </div>
</Base>
```

Keep the entire existing `<style>` block, with one change in Step 4.

- [ ] **Step 4: Fix the CSS scoping for injected emphasis**

The `<h2>` and `<p>` elements are still written in this template, so their scoped rules keep working. The `<em>` inside the injected HTML is not, so change:

```css
  .now-page__entry :global(em) { font-style: italic; color: var(--color-ink); }
```

- [ ] **Step 5: Verify parity**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

This is a precise test of `renderInline`: the baseline contains `<em>The Faith of Beasts</em>`, so any wrapper leakage or lost emphasis fails the diff.

- [ ] **Step 6: `[CONTROLLER]` Verify visually — skip if you are a task implementer**

The controlling session screenshots `/now` at desktop and mobile and compares against the baseline, confirming the italics render and the entry spacing/rules are unchanged. Report your parity result and stop; the controller runs this gate.

- [ ] **Step 7: Add the singleton to Keystatic**

In `keystatic.config.ts`, inside `singletons`:

```ts
    now: singleton({
      label: 'Now page',
      path: 'src/data/now',
      format: { data: 'json' },
      schema: {
        updated: fields.date({ label: 'Updated' }),
        title: fields.text({ label: 'Title' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        entries: fields.array(
          fields.object({
            heading: fields.text({ label: 'Heading' }),
            body: fields.markdoc.inline({ label: 'Body' }),
          }),
          { label: 'Entries', itemLabel: (props) => props.fields.heading.value },
        ),
      },
    }),
```

- [ ] **Step 8: Verify the round-trip does not corrupt the data**

In the preview, open `/keystatic` → Now page, make a trivial edit to the Watching entry and save, then revert it and save again. Run:
```bash
git diff --stat src/data/now/index.json
```
Expected: no diff (or a diff you can revert cleanly). Then re-run `./scripts/verify-parity.sh` — expected `PARITY OK`. This confirms `fields.markdoc.inline` serializes back to the same Markdown emphasis syntax the renderer expects.

- [ ] **Step 9: Commit**

```bash
git add -A src/data/now src/lib/inlineMarkdoc.ts src/pages/now.astro keystatic.config.ts
git commit -m "feat: move Now page copy into a Keystatic singleton"
```

---

### Task 9: Homepage singleton

**Files:**
- Create: `src/data/home/index.json`
- Modify: `src/pages/index.astro`, `keystatic.config.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `src/data/home/index.json` with `hero` and `nowSummary` objects, imported directly by `index.astro`.

The homepage's `now` summary duplicates the Now page content by design (see spec §9). It stays duplicated — deduplicating is explicitly out of scope.

- [ ] **Step 1: Create the data file**

Create `src/data/home/index.json`:

```json
{
  "hero": {
    "eyebrow": "A working notebook · Est. MMXXVI",
    "title": "Things people should see; things I want to remember.",
    "intro": "Essays & experiments. But also unloading my favourites folder, because there's a lot to share."
  },
  "nowSummary": {
    "building": "Teaching GRØD to spot meetings on its own, and folding this very two-ink palette into the app.",
    "reading": "The Faith of Beasts — James S. A. Corey",
    "watching": "The Agency — Paramount+",
    "listening": "Every single pod about The Odyssey",
    "linkLabel": "More on all this"
  }
}
```

- [ ] **Step 2: Wire it into `index.astro`**

Add the import to the frontmatter:

```ts
import home from '../data/home/index.json';
```

Replace the `<Hero ... />` element with:

```astro
      <Hero
        eyebrow={home.hero.eyebrow}
        title={home.hero.title}
        intro={home.hero.intro}
      />
```

Replace the `now={{...}}` prop on `<AppsList>` with:

```astro
          now={{
            building: home.nowSummary.building,
            reading: home.nowSummary.reading,
            watching: home.nowSummary.watching,
            listening: home.nowSummary.listening,
            href: '/now',
            linkLabel: home.nowSummary.linkLabel,
          }}
```

`href` stays hardcoded — it is structural, not copy.

- [ ] **Step 3: Verify parity**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

- [ ] **Step 4: Add the singleton to Keystatic**

In `keystatic.config.ts`, inside `singletons`:

```ts
    home: singleton({
      label: 'Homepage',
      path: 'src/data/home',
      format: { data: 'json' },
      schema: {
        hero: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow' }),
            title: fields.text({ label: 'Title', multiline: true }),
            intro: fields.text({ label: 'Intro', multiline: true }),
          },
          { label: 'Hero' },
        ),
        nowSummary: fields.object(
          {
            building: fields.text({ label: 'Building', multiline: true }),
            reading: fields.text({ label: 'Reading' }),
            watching: fields.text({ label: 'Watching' }),
            listening: fields.text({ label: 'Listening' }),
            linkLabel: fields.text({ label: 'Link label' }),
          },
          { label: 'Now summary' },
        ),
      },
    }),
```

- [ ] **Step 5: Commit**

```bash
git add -A src/data/home src/pages/index.astro keystatic.config.ts
git commit -m "feat: move homepage hero and now summary into a Keystatic singleton"
```

---

### Task 10: Cloudflare Worker deployment config

**Files:**
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: the `cloudflare()` adapter from Task 2.
- Produces: a `wrangler.jsonc` that serves prerendered assets plus the on-demand Keystatic routes.

- [ ] **Step 1: Rewrite `wrangler.jsonc`**

```jsonc
{
	"name": "gaspery",
	"main": "@astrojs/cloudflare/entrypoints/server",
	"compatibility_date": "2026-07-19",
	"compatibility_flags": ["nodejs_compat"]
}
```

The `ASSETS` binding is configured automatically by the adapter, so the previous `assets.directory` key is removed.

- [ ] **Step 2: Verify the build emits both assets and a worker**

Run:
```bash
npm run build >/dev/null && ls dist/_worker.js >/dev/null && echo "worker OK" && ls dist/index.html >/dev/null && echo "assets OK"
```
Expected: `worker OK` then `assets OK`.

- [ ] **Step 3: Verify parity one more time**

Run:
```bash
./scripts/verify-parity.sh
```
Expected: `PARITY OK — all pages match baseline`.

- [ ] **Step 4: Commit**

```bash
git add wrangler.jsonc
git commit -m "chore: point wrangler at the Cloudflare worker entrypoint"
```

---

### Task 11: Final verification and handover documentation

**Files:**
- Create: `docs/keystatic-setup.md`

**Interfaces:**
- Consumes: everything above.
- Produces: written instructions for the four steps only Alex can perform.

- [ ] **Step 1: `[CONTROLLER]` Full visual comparison — skip if you are a task implementer**

The controlling session re-screenshots `/about` and `/now` at desktop and mobile and compares against the baselines, and confirms `./scripts/verify-parity.sh` passes for every other route. Any difference is a bug to fix before merge — this is the primary acceptance gate for the whole migration.

- [ ] **Step 2: Verify RSS and sitemap**

Run:
```bash
npm run build >/dev/null && head -20 dist/rss.xml && ls dist/sitemap-index.xml
```
Expected: RSS lists the six posts with correct titles/links; the sitemap index exists.

- [ ] **Step 3: Verify every collection and singleton round-trips**

In the preview at `/keystatic`, confirm all seven entries appear and open cleanly: collections **Writing** (6), **App pages** (3), **Apps** (4); singletons **Homepage**, **About page**, **Now page**. Make and revert one trivial edit in each, then run `./scripts/verify-parity.sh` — expected `PARITY OK`.

- [ ] **Step 4: Confirm no stale files remain**

Run:
```bash
ls src/content/apps.json 2>/dev/null && echo "STALE — should be deleted"
find src/content -name '*.md' | grep -v node_modules
```
Expected: no `apps.json`; no `.md` files remaining in `src/content`.

- [ ] **Step 5: Write the handover doc**

Create `docs/keystatic-setup.md`:

```markdown
# Keystatic setup — steps only Alex can do

Keystatic runs in `local` storage during `npm run dev` (no login needed).
Production uses `github` storage, which requires a GitHub App and four secrets.

## 1. Create the GitHub App

1. Deploy the branch, or run `npm run build && npx wrangler dev`.
2. Visit `/keystatic` and click **Log in with GitHub**.
3. Follow the **Create GitHub App** wizard. Name it anything (e.g. `gaspery-cms`).
4. Grant it access to the `holleyy/gaspery` repository.

The wizard writes four values into a local `.env` (already gitignored):

- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`
- `KEYSTATIC_SECRET`
- `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`

## 2. Add the same four values as Cloudflare secrets

```bash
npx wrangler secret put KEYSTATIC_GITHUB_CLIENT_ID
npx wrangler secret put KEYSTATIC_GITHUB_CLIENT_SECRET
npx wrangler secret put KEYSTATIC_SECRET
npx wrangler secret put PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
```

## 3. Deploy

```bash
npm run build && npx wrangler deploy
```

## 4. Editing

Visit `/keystatic` on the live site. Anyone with **write** access to
`holleyy/gaspery` can log in. Saves commit straight to `main`, which
triggers your normal deploy.
```

- [ ] **Step 6: Commit**

```bash
git add docs/keystatic-setup.md
git commit -m "docs: add Keystatic credential setup handover"
```

---

## Post-Plan Notes

**Known uncertainty:** `fields.markdoc.inline()`'s exact serialization into JSON is the one API in this plan verified only from documentation prose, not from a running instance. Task 8 Step 8 exists specifically to catch it. If the round-trip corrupts `src/data/now/index.json`, the fallback is to change `body` to `fields.text({ multiline: true })` storing Markdown source — `renderInline` works unchanged either way, and only the editing UI degrades from rich-text to plain text.

**Not done by this plan (requires Alex):** GitHub App creation, Cloudflare secrets, production cutover approval, and merging `keystatic-cms` into `main`.
