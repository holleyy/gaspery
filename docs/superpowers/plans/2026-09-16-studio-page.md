# /studio Plate Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `gaspery.com/studio`, a one-screen studio landing page: the app names as a wrapping cloud of large two-tone type, a category beside each, a proof card that follows the cursor, on a full-bleed magenta plate by default with a three-dot switch to the site's light or dark palettes.

**Architecture:** A new Astro route (`src/pages/studio.astro`) using `Base.astro` without the rail, its own top bar, a `StudioSwitch.astro` control, and a page-only stylesheet (`src/styles/studio.css`) that carries the plate token block. Appearance logic and the category rule live in `src/lib/studio.ts` so they are unit-testable under `node --test`. Proof images come from a new optional `proof` field on the `apps` collection, declared in both the Zod and Keystatic schemas.

**Tech Stack:** Astro 5 (Cloudflare adapter), Keystatic, Zod content schemas, `node --test` with native TypeScript stripping, plain CSS with custom properties, no framework on the page.

**Spec:** `docs/superpowers/specs/2026-09-16-studio-page-design.md`. Two implementation choices deviate from its letter and are recorded here so a reviewer does not flag them as drift:

1. The plate token block lives in `src/styles/studio.css`, loaded only by the studio route, not in `global.css`. Tokens declared on `:root` apply the same wherever the file is loaded, and keeping every studio rule in one file keeps `global.css` and its tests untouched.
2. The spec set the plate's secondary ink as paper at 72% opacity and asked the implementer to measure it. Measured: 3.32:1 against brand-strong, and 3.78:1 even at 80%, both under AA. So on the plate `--color-ink-secondary` is full paper (5.09:1), and only Top Secret's name, which is display-size, dims by `opacity: .72` (3.32:1, above the 3:1 large-text floor).
3. The statutory `<Imprint />` is added under the foot. `src/components/Imprint.astro` documents that the trading disclosure must be findable at the bottom of every page; the spec's foot omitted it by oversight.

## Global Constraints

- **No em dashes** in any visible text (house rule from `PRODUCT.md`). Use a full stop, colon, comma, or parentheses. Page title uses the middot: `Studio · Gaspery`.
- **Two inks on bone everywhere except the plate.** No new colours. The plate ground is the existing brand-strong token value `#B82E70`; the plate ghost and plate card are the ink `#232019`.
- **Every word on the plate clears 4.5:1.** Paper `#F6F1E6` on `#B82E70` is 5.09:1. Do not introduce any text colour on the plate other than paper (or paper at ≥ 92% for nothing smaller than display size).
- **Optional in both schemas.** `proof` is optional in `src/content.config.ts` (Zod) and `keystatic.config.ts`. A field required in one and optional in the other commits fine and then fails the Cloudflare build.
- **Images live in `/public` by absolute path.** Keystatic uploads go to `public/shots`, referenced as `/shots/...`.
- **The `hidden` attribute trap.** Any author-origin `display` on a `[hidden]` element defeats it. Every `display` rule on the switch must be scoped `:not([hidden])`.
- **Blend modes are load-bearing** and must be gated: under `prefers-reduced-transparency: reduce` or `prefers-contrast: more` the ghosts and offset cards drop out.
- **Attribution.** Every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Branch.** Work on `feat/studio-page` (already exists, holds the spec). Do not commit to `main`.
- **Test runner.** `npm test` runs `node --test "tests/**/*.test.ts"`. Test files import source with the `.ts` extension (`../src/lib/studio.ts`); Astro files import extensionless.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/studio.ts` (create) | Pure logic: storage key, appearance type and reader, `categoryFor`. No DOM. |
| `tests/studio.test.ts` (create) | Unit tests for the module, plus source-level drift guards (schemas, CSS blocks, switch, pre-paint script, parity gate). |
| `src/content.config.ts` (modify, `apps` schema ~line 46) | Add `proof: z.string().optional()`. |
| `keystatic.config.ts` (modify, `apps` collection ~line 319) | Add the `Proof` image field. |
| `src/content/apps/grod.yaml` (modify) | `proof: /shots/grod/briefing.webp`. |
| `src/styles/studio.css` (create) | Plate token block, page-local ghost/plate properties, all studio layout and the proof card. |
| `src/components/StudioSwitch.astro` (create) | The three-dot radio control and its apply-and-store script. |
| `src/pages/studio.astro` (create) | The route: data, pre-paint script, markup, proof-follows-cursor script. |
| `scripts/verify-parity.sh` (modify, theme-toggle count loop) | Admit one `.studio-switch` in place of `.theme-toggle`. |
| `DECISIONS.md` (modify, append) | Record the plate default and the brand-strong ground. |

---

### Task 1: `src/lib/studio.ts` (appearance reader and category rule)

**Files:**
- Create: `src/lib/studio.ts`
- Test: `tests/studio.test.ts`

**Interfaces:**
- Produces:
  - `export const STUDIO_STORAGE_KEY = 'studio'`
  - `export type StudioAppearance = 'plate' | 'light' | 'dark'`
  - `export function isStudioAppearance(value: unknown): value is StudioAppearance`
  - `export function readStudioAppearance(value: unknown): StudioAppearance` (anything unrecognised is `'plate'`)
  - `export function categoryFor(app: { meta: string; status: string }): string`

- [ ] **Step 1: Write the failing tests**

Create `tests/studio.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/studio.test.ts` (or `node --test tests/studio.test.ts`)
Expected: FAIL, with `Cannot find module '.../src/lib/studio.ts'`.

- [ ] **Step 3: Write the module**

Create `src/lib/studio.ts`:

```ts
/* /studio appearance and category logic, kept free of the DOM so it can be
   unit-tested under `node --test` alongside src/lib/theme.ts. The DOM work
   lives in StudioSwitch.astro and in studio.astro's pre-paint script. */

/** The localStorage key. Its own key, never the site-wide 'theme': picking
    an appearance on /studio changes this page only. Repeated as a literal
    in studio.astro's inline script, which runs before the bundle exists;
    tests/studio.test.ts pins the two together. */
export const STUDIO_STORAGE_KEY = 'studio';

/** Three states, no `system`: the plate is the page's default and is not
    an OS state, so there is nothing to hand control back to. */
export type StudioAppearance = 'plate' | 'light' | 'dark';

const APPEARANCES: readonly StudioAppearance[] = ['plate', 'light', 'dark'];

export function isStudioAppearance(value: unknown): value is StudioAppearance {
  return typeof value === 'string' && (APPEARANCES as readonly string[]).includes(value);
}

/** Anything unrecognised (absent, corrupt, hand-edited) is `plate`.
    Storage is user-writable, so this must never throw. */
export function readStudioAppearance(value: unknown): StudioAppearance {
  return isStudioAppearance(value) ? value : 'plate';
}

/** The small label after each name on /studio. Derived from the app record
    rather than stored: `planning` reads "Soon"; otherwise the platform is
    the segment of `meta` before its first middot, with Apple's "macOS"
    shortened to the studio's "Mac". Anything else passes through. */
export function categoryFor(app: { meta: string; status: string }): string {
  if (app.status === 'planning') return 'Soon';
  const segment = app.meta.split('·')[0].trim();
  return segment === 'macOS' ? 'Mac' : segment;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/studio.test.ts`
Expected: 4 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/studio.ts tests/studio.test.ts
git commit -m "feat(studio): appearance reader and category rule

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: The `proof` field on apps

**Files:**
- Modify: `src/content.config.ts` (the `apps` collection, ~lines 46-56)
- Modify: `keystatic.config.ts` (the `apps` collection, ~lines 319-340)
- Modify: `src/content/apps/grod.yaml`
- Test: `tests/studio.test.ts` (append)

**Interfaces:**
- Produces: `app.data.proof?: string`, an absolute public path such as `/shots/grod/briefing.webp`, on every entry of the `apps` collection. Task 5 reads it.

- [ ] **Step 1: Write the failing drift-guard tests**

Append to `tests/studio.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/studio.test.ts`
Expected: the three new tests FAIL (no `proof` in either schema, no proof line in grod.yaml). The four from Task 1 still pass.

- [ ] **Step 3: Add the field to the Zod schema**

In `src/content.config.ts`, inside `const apps = defineCollection({ ... schema: z.object({ ... }) })`, after `url: z.string().optional(),` add:

```ts
    /* A proof of the work for /studio: a real screenshot, served from
       /public by absolute path (e.g. "/shots/grod/briefing.webp"). Optional
       in both schemas on purpose; without one the studio page shows an
       honest "Proof pending" card, or "Redacted" while in planning. */
    proof: z.string().optional(),
```

- [ ] **Step 4: Add the field to the Keystatic schema**

In `keystatic.config.ts`, inside `apps: collection({ ... schema: { ... } })`, after `url: fields.text({ label: 'URL' }),` add:

```ts
        /* Optional here and in src/content.config.ts. Uploads land in
           public/shots and the YAML holds the absolute /shots/... path, the
           only place Astro can serve them from (see bodyImages above). */
        proof: fields.image({
          label: 'Proof',
          description: 'A screenshot for the studio page. Leave empty for "Proof pending".',
          directory: 'public/shots',
          publicPath: '/shots/',
        }),
```

- [ ] **Step 5: Give GRØD its proof**

In `src/content/apps/grod.yaml`, add a final line:

```yaml
proof: /shots/grod/briefing.webp
```

- [ ] **Step 6: Run the tests and the build**

Run: `node --test tests/studio.test.ts`
Expected: 7 passing.

Run: `npm run build 2>&1 | tail -5`
Expected: the build completes (`[build] Complete!` or the Cloudflare adapter's equivalent) with no schema error. Three apps have no `proof`; one has it.

- [ ] **Step 7: Commit**

```bash
git add src/content.config.ts keystatic.config.ts src/content/apps/grod.yaml tests/studio.test.ts
git commit -m "feat(apps): optional proof image for the studio page

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: `src/styles/studio.css` (the plate and the page)

**Files:**
- Create: `src/styles/studio.css`
- Test: `tests/studio.test.ts` (append)

**Interfaces:**
- Produces the class names Task 5's markup uses: `.studio-page`, `.studio-top`, `.studio-wm`, `.studio-wm__ghost`, `.studio-wm__ink`, `.studio-nav`, `.studio-work`, `.studio-cloud`, `.studio-item`, `.studio-name`, `.studio-name__ghost`, `.studio-name__ink`, `.studio-name--dim`, `.studio-cat`, `.studio-foot`, `.studio-foot__line`, `.studio-foot__links`, `.studio-imprint`, `.studio-proof`, `.studio-proof__plate`, `.studio-card`, `.studio-card--blank`, `.studio-card__big`, `.studio-card__label`, and the state class `.is-on`.
- Produces the custom properties Task 4's switch relies on: `--studio-ghost`, `--studio-plate`, `--studio-blend`.
- Consumes from `global.css`: `--color-*` tokens, `--font-serif/sans/mono`, `--page-max`, `--margin`, `.label`, `.sr-only`, `.imprint`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/studio.test.ts`:

```ts
const studioCss = read('src/styles/studio.css');
const globalCss = read('src/styles/global.css');

/** Custom-property declarations in the rule starting at `selector`.
    Assumes no nested braces inside the block. */
function tokensIn(source: string, selector: string): Record<string, string> {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `selector not found: ${selector}`);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return Object.fromEntries(
    [...source.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, n, v]) => [n, v.trim()])
  );
}

const PLATE = ":root:has(.studio-page):not([data-studio='light']):not([data-studio='dark'])";

test('the plate block redeclares every token the dark block declares', () => {
  // The plate wins over the OS dark palette by specificity, token by
  // token. Any token it leaves out would leak the dark value through on a
  // dark OS, so the two blocks must cover the same keys.
  const plate = tokensIn(studioCss, PLATE);
  const dark = tokensIn(globalCss, ":root[data-theme='dark']");
  const colourKeys = Object.keys(plate).filter((k) => k.startsWith('--color-')).sort();
  assert.deepEqual(colourKeys, Object.keys(dark).sort());
});

test('the plate ground is brand-strong and its type is paper, for 5.09:1', () => {
  const plate = tokensIn(studioCss, PLATE);
  const light = tokensIn(globalCss, ':root {');
  assert.equal(plate['--color-paper'].toUpperCase(), light['--color-brand-strong'].toUpperCase());
  assert.equal(plate['--color-ink'].toUpperCase(), light['--color-paper'].toUpperCase());
  // No dimmed small text on the plate: secondary is full paper too.
  assert.equal(plate['--color-ink-secondary'].toUpperCase(), light['--color-paper'].toUpperCase());
  assert.match(studioCss, new RegExp(`${PLATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*color-scheme:\\s*light`));
});

test('the page-local ghost and plate inks are defined in all three states', () => {
  const plate = tokensIn(studioCss, PLATE);
  assert.equal(plate['--studio-ghost'], '#232019');
  assert.equal(plate['--studio-plate'], '#232019');
  assert.equal(plate['--studio-blend'], 'multiply');
  // Light and dark resolve to the site's own inks, and the blend flips for
  // dark both ways it can be reached, guarded against an explicit light.
  const base = tokensIn(studioCss, ':root {');
  assert.equal(base['--studio-ghost'], 'var(--color-brand)');
  assert.equal(base['--studio-plate'], 'var(--color-teal)');
  assert.equal(base['--studio-blend'], 'multiply');
  assert.equal(tokensIn(studioCss, ":root:not([data-theme='light'])")['--studio-blend'], 'screen');
  assert.equal(tokensIn(studioCss, ":root[data-theme='dark']")['--studio-blend'], 'screen');
});

test('the accessibility gate drops every studio blend effect', () => {
  const gate = studioCss.slice(studioCss.indexOf('prefers-reduced-transparency'));
  for (const target of ['.studio-name__ghost', '.studio-wm__ghost', '.studio-proof__plate']) {
    assert.ok(gate.includes(target), `${target} is not gated`);
  }
});

test('selection is readable on the plate', () => {
  // global.css paints ::selection brand-strong on paper; on the plate both
  // resolve to paper, so the page pins its own.
  assert.match(studioCss, /\.studio-page ::selection\s*\{[^}]*background:\s*var\(--studio-ghost\)/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/studio.test.ts`
Expected: the five new tests FAIL with `ENOENT ... src/styles/studio.css`.

- [ ] **Step 3: Write the stylesheet**

Create `src/styles/studio.css`:

```css
/* =====================================================================
   /studio — the plate page. Loaded by src/pages/studio.astro only.
   One screen: the app names as a wrapping cloud of large two-tone type,
   a category beside each, a proof card that trails the cursor. The plate
   (magenta ground, paper type, the black ink layer off register) is the
   page's no-JavaScript state; a reader opts out to the site's light or
   dark palette with the three-dot switch.
   ===================================================================== */

/* ---- Page-local inks ------------------------------------------------
   The ghost under every name and the offset card under every proof read
   these instead of brand and teal directly, so the plate can swap both
   for the black ink without touching the site's tokens. Declared three
   times like global.css declares dark: once for the base, once behind the
   OS media query (guarded against an explicit light choice), once behind
   the attribute. */
:root {
  --studio-ghost: var(--color-brand);
  --studio-plate: var(--color-teal);
  --studio-blend: multiply;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { --studio-blend: screen; }
}
:root[data-theme='dark'] { --studio-blend: screen; }

/* ---- The plate ------------------------------------------------------
   Declared on :root, gated on the page's root element, beaten only by an
   explicit opt-out attribute. (0,4,0) outranks both dark blocks in
   global.css at (0,2,0), so under a dark OS every token below still
   wins. Every token the dark block declares is redeclared here for that
   reason: an omission would leak the dark value through.

   Ground is brand-strong, "the same ink pressed harder": paper on the
   display magenta is 3.88:1, short of AA for the 12px categories and the
   14px foot links; on this press it is 5.09:1, so every word on the plate
   clears 4.5:1 with no size exception. Secondary is full paper for the
   same reason (paper at 72% measured 3.32:1). The only dimmed thing is
   Top Secret's display-size name, by opacity, below. */
:root:has(.studio-page):not([data-studio='light']):not([data-studio='dark']) {
  --color-paper:          #B82E70;
  --color-surface:        #A5285F;
  --color-surface-raised: #C4327A;
  --color-hairline:       #CC6C96;
  --color-ink:            #F6F1E6;
  --color-ink-secondary:  #F6F1E6;
  --color-brand:          #F6F1E6;
  --color-brand-bright:   #F6F1E6;
  --color-brand-strong:       #F6F1E6;
  --color-brand-strong-hover: #F6F1E6;
  --color-teal:           #F6F1E6;
  --color-teal-ink:       #F6F1E6;
  --color-positive:       #F6F1E6;
  --color-warning:        #F6F1E6;
  --color-error:          #F6F1E6;
  --color-brand-on-ink:   #232019;
  --studio-ghost: #232019;
  --studio-plate: #232019;
  --studio-blend: multiply;
  color-scheme: light;
}

/* global.css paints ::selection brand-strong on paper. On the plate both
   are paper, so the page pins the black ink on paper instead; in light
   and dark this resolves to brand on paper, the site's own. */
.studio-page ::selection { background: var(--studio-ghost); color: var(--color-paper); }

/* ---- Frame ---------------------------------------------------------- */
.studio-page {
  min-height: 100vh;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 40px var(--margin) 40px;
  display: flex;
  flex-direction: column;
}

/* ---- Top bar --------------------------------------------------------
   Wordmark, the switch, the nav. The wordmark is the rail's recipe at
   28px: Merriweather 400 on a 2px ghost. */
.studio-top { display: flex; align-items: baseline; gap: 28px; }
.studio-wm {
  position: relative; display: inline-block;
  font-family: var(--font-serif); font-weight: 400; font-size: 28px; line-height: 1.1; letter-spacing: -0.01em;
}
.studio-wm__ghost {
  position: absolute; inset: 0; transform: translate(2px, 2px);
  color: var(--studio-ghost); mix-blend-mode: var(--studio-blend); pointer-events: none;
}
.studio-wm__ink { position: relative; z-index: 1; transition: color .15s ease; }
.studio-wm:hover .studio-wm__ink { color: var(--color-brand-bright); }
.studio-top .studio-switch { margin-left: auto; }
.studio-nav { display: flex; gap: 28px; }
.studio-nav a {
  font-family: var(--font-serif); font-weight: 700; font-size: 17px; line-height: 1.15;
  transition: color .15s ease;
}
.studio-nav a:hover { color: var(--color-brand-bright); }
.studio-nav a[aria-current] { color: var(--color-brand-strong); }
/* On the plate there is no second ink to colour the current item with, so
   it is underlined in paper instead. */
:root:has(.studio-page):not([data-studio='light']):not([data-studio='dark']) .studio-nav a[aria-current] {
  border-bottom: 2px solid currentColor;
}

/* ---- The cloud ------------------------------------------------------ */
.studio-work { flex: 1; display: grid; align-content: center; padding: 48px 0; }
.studio-cloud {
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-wrap: wrap; align-items: baseline;
  column-gap: .42em; row-gap: .12em;
  font-size: clamp(56px, 8.4vw, 120px);
  max-width: 1120px;
}
.studio-item { display: inline-flex; align-items: baseline; gap: .14em; }

/* The name, printed twice: the rail wordmark's misregistration at display
   scale, on at rest. Hover pushes the ghost further off register; nothing
   else moves. */
.studio-name {
  position: relative; display: inline-block;
  font-family: var(--font-serif); font-weight: 400; font-size: 1em; line-height: 1; letter-spacing: -0.025em;
}
.studio-name__ghost {
  position: absolute; inset: 0; transform: translate(.035em, .035em);
  color: var(--studio-ghost); mix-blend-mode: var(--studio-blend); pointer-events: none;
  transition: transform .35s cubic-bezier(.25, 1, .5, 1);
}
.studio-name__ink { position: relative; z-index: 1; }
.studio-item:hover .studio-name__ghost { transform: translate(.07em, .07em); }
/* Not a link (Top Secret). Secondary ink in light and dark; on the plate
   secondary is paper, so the dim comes from opacity: 3.32:1 on the ground,
   above the 3:1 floor for text this size. */
.studio-name--dim .studio-name__ink { color: var(--color-ink-secondary); }
:root:has(.studio-page):not([data-studio='light']):not([data-studio='dark']) .studio-name--dim .studio-name__ink { opacity: .72; }

.studio-cat {
  font-family: var(--font-mono); font-weight: 600; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--color-ink-secondary); white-space: nowrap; margin-right: .1em;
}

/* ---- The proof ------------------------------------------------------
   One fixed element, positioned by script, that trails the cursor. One
   card per app is pre-rendered inside it; the script shows the matching
   one. The offset card behind it is the monogram's misregistration at
   card scale. */
.studio-proof {
  position: fixed; left: 0; top: 0; width: 400px;
  pointer-events: none; z-index: 5;
  opacity: 0; transform: rotate(-3deg) scale(.96);
  transition: opacity .22s ease, transform .35s cubic-bezier(.25, 1, .5, 1);
  will-change: transform;
}
.studio-proof.is-on { opacity: 1; transform: rotate(0) scale(1); }
.studio-proof__plate {
  position: absolute; inset: 0; transform: translate(8px, 8px);
  background: var(--studio-plate); mix-blend-mode: var(--studio-blend); border-radius: 2px;
}
.studio-card {
  position: relative; z-index: 1; display: none;
  aspect-ratio: 3 / 2; border-radius: 2px; overflow: hidden;
  /* Cards are always paper, whatever the page is: a proof is a print. */
  background: #F6F1E6; border: 1px solid #D9D3C6; color: #232019;
}
.studio-card.is-on { display: block; }
.studio-card img { width: 100%; height: 100%; object-fit: cover; object-position: top left; }
.studio-card--blank.is-on { display: grid; place-items: center; text-align: center; }
.studio-card__big { font-family: var(--font-serif); font-weight: 400; font-size: 40px; letter-spacing: -0.02em; line-height: 1.1; }
.studio-card__label {
  font-family: var(--font-mono); font-weight: 600; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  color: #6C6759; margin-top: 8px;
}

/* ---- Foot ----------------------------------------------------------- */
.studio-foot {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 32px;
  padding-top: 20px; border-top: 1px solid var(--color-hairline);
}
.studio-foot__line { font-family: var(--font-serif); font-weight: 400; font-size: 17px; margin: 0 0 12px; }
.studio-foot__links { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: 14px; font-weight: 500; }
.studio-foot__links a { color: var(--color-ink-secondary); transition: color .15s ease; }
.studio-foot__links a:hover { color: var(--color-brand-bright); }
.studio-imprint { margin-top: 28px; }

/* ---- Accessibility gate --------------------------------------------
   Same gate as global.css: every blend effect degrades to nothing and the
   two-colour logic survives as flat shapes. The plate stays magenta with
   paper type. */
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .studio-name__ghost, .studio-wm__ghost, .studio-proof__plate { display: none; }
}

/* ---- Collapse ------------------------------------------------------- */
@media (max-width: 1000px) {
  .studio-page { padding: 36px 24px 32px; }
  .studio-top { flex-wrap: wrap; gap: 16px 24px; }
  .studio-top .studio-switch { order: 3; margin-left: 0; flex-basis: 100%; }
  .studio-nav { margin-left: auto; gap: 18px; }
  .studio-nav a { font-size: 15px; }
  .studio-work { padding: 32px 0; }
  .studio-cloud { flex-direction: column; align-items: flex-start; row-gap: .3em; font-size: clamp(40px, 11vw, 64px); }
  /* Touch never shows the proof (the script ignores touch pointers) and
     at these widths a fine pointer gets none either: the card would cover
     the names. */
  .studio-proof { display: none; }
  .studio-foot { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/studio.test.ts`
Expected: 12 passing.

- [ ] **Step 5: Commit**

```bash
git add src/styles/studio.css tests/studio.test.ts
git commit -m "feat(studio): the plate and the page stylesheet

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `StudioSwitch.astro` (the three dots)

**Files:**
- Create: `src/components/StudioSwitch.astro`
- Test: `tests/studio.test.ts` (append)

**Interfaces:**
- Consumes: `STUDIO_STORAGE_KEY`, `readStudioAppearance` from `src/lib/studio` (Task 1); `--color-*` tokens.
- Produces: a `<fieldset class="studio-switch" hidden>` with three radios `name="studio"`, values `plate`, `light`, `dark` in that order. Its script unhides it, reads the stored state, and on change writes storage, sets or clears `data-studio` and `data-theme` on `<html>`, and updates `meta[name="theme-color"]`. Task 5 mounts it exactly once.

- [ ] **Step 1: Write the failing tests**

Append to `tests/studio.test.ts`:

```ts
const studioSwitch = read('src/components/StudioSwitch.astro');

test('the switch is three radios named studio, plate first, rendered hidden', () => {
  assert.match(studioSwitch, /<fieldset class="studio-switch" hidden>/);
  const values = [...studioSwitch.matchAll(/<input type="radio" name="studio" value="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(values, ['plate', 'light', 'dark']);
  // A different radio name from ThemeToggle's `theme`, so the two controls
  // can never form one native group.
  assert.doesNotMatch(studioSwitch, /name="theme"/);
});

test("the switch's display rule is scoped to :not([hidden])", () => {
  // The UA sheet implements `hidden` as display:none at user-agent origin;
  // an unscoped author `display` beats it regardless of specificity.
  assert.match(studioSwitch, /\.studio-switch:not\(\[hidden\]\)\s*\{[^}]*display:/);
  assert.doesNotMatch(studioSwitch, /\.studio-switch\s*\{[^}]*display:/);
});

test('the switch writes the studio key, never the site-wide theme key', () => {
  assert.match(studioSwitch, /STUDIO_STORAGE_KEY/);
  assert.doesNotMatch(studioSwitch, /localStorage\.\w+\(\s*['"]theme['"]/);
});

test('the switch theme-color literals match the real tokens', () => {
  const light = tokensIn(globalCss, ':root {');
  const dark = tokensIn(globalCss, ":root[data-theme='dark']");
  const plate = tokensIn(studioCss, PLATE);
  for (const hex of [light['--color-paper'], dark['--color-paper'], plate['--color-paper']]) {
    assert.ok(studioSwitch.includes(hex), `StudioSwitch.astro is missing the literal ${hex}`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/studio.test.ts`
Expected: the four new tests FAIL with `ENOENT ... StudioSwitch.astro`.

- [ ] **Step 3: Write the component**

Create `src/components/StudioSwitch.astro`:

```astro
---
/* Three radios, three dots: magenta (the plate), paper (light), ink
   (dark). Native radios bring keyboard support, grouping, and screen-
   reader semantics for free; the dots are the labels. Its own radio name
   and its own storage key, so it can never share a native group with
   ThemeToggle or write the site-wide preference.

   Rendered hidden and unhidden by the script below: a reader without
   JavaScript gets the plate and never sees a control that cannot act. */
---
<fieldset class="studio-switch" hidden>
  <legend class="sr-only">Appearance</legend>
  <label>
    <input type="radio" name="studio" value="plate" />
    <span class="studio-switch__dot" data-state="plate"></span>
    <span class="sr-only">Magenta</span>
  </label>
  <label>
    <input type="radio" name="studio" value="light" />
    <span class="studio-switch__dot" data-state="light"></span>
    <span class="sr-only">Light</span>
  </label>
  <label>
    <input type="radio" name="studio" value="dark" />
    <span class="studio-switch__dot" data-state="dark"></span>
    <span class="sr-only">Dark</span>
  </label>
</fieldset>

<script>
  import { STUDIO_STORAGE_KEY, readStudioAppearance, type StudioAppearance } from '../lib/studio';

  const root = document.documentElement;
  const group = document.querySelector<HTMLFieldSetElement>('.studio-switch');

  /* The grounds, as literals: a script cannot read a custom property before
     the element carrying it has painted. tests/studio.test.ts pins these to
     the real tokens. */
  const GROUND: Record<StudioAppearance, string> = {
    plate: '#B82E70',
    light: '#F6F1E6',
    dark: '#191712',
  };

  /* Mirrors the pre-paint script in src/pages/studio.astro exactly. The
     plate is the absence of an opt-out; light and dark set data-studio to
     switch the plate block off and data-theme so the site's own palette
     paints regardless of the OS. */
  function apply(state: StudioAppearance) {
    if (state === 'plate') {
      delete root.dataset.studio;
      delete root.dataset.theme;
    } else {
      root.dataset.studio = state;
      root.dataset.theme = state;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', GROUND[state]);
  }

  if (group) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STUDIO_STORAGE_KEY);
    } catch {
      /* Private mode. Fall through to the plate, which is the default. */
    }
    const current = readStudioAppearance(stored);
    const checked = group.querySelector<HTMLInputElement>(`input[value="${current}"]`);
    if (checked) checked.checked = true;
    group.hidden = false;

    group.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.name !== 'studio') return;
      const next = readStudioAppearance(input.value);
      try {
        if (next === 'plate') localStorage.removeItem(STUDIO_STORAGE_KEY);
        else localStorage.setItem(STUDIO_STORAGE_KEY, next);
      } catch {
        /* Preference will not survive the page, but the page still flips. */
      }
      apply(next);
    });
  }
</script>

<style>
  /* Scoped to :not([hidden]) so the `hidden` attribute (user-agent origin,
     display: none) is not beaten by this author-origin display. */
  .studio-switch:not([hidden]) {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .studio-switch label {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    padding: 4px;
  }
  /* The radio is hidden but focusable; the ring lands on the label. */
  .studio-switch input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .studio-switch__dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px var(--color-ink);
    transition: transform .15s ease;
  }
  .studio-switch__dot[data-state='plate'] { background: #B82E70; }
  .studio-switch__dot[data-state='light'] { background: #F6F1E6; }
  .studio-switch__dot[data-state='dark']  { background: #191712; }
  .studio-switch label:hover .studio-switch__dot { transform: scale(1.15); }
  .studio-switch input:checked + .studio-switch__dot {
    outline: 2px solid var(--color-ink);
    outline-offset: 2px;
  }
  .studio-switch label:focus-within {
    outline: 2px solid var(--color-brand);
    outline-offset: 3px;
    border-radius: 2px;
  }
</style>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/studio.test.ts`
Expected: 16 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/StudioSwitch.astro tests/studio.test.ts
git commit -m "feat(studio): three-dot appearance switch

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: `src/pages/studio.astro` (the route)

**Files:**
- Create: `src/pages/studio.astro`
- Test: `tests/studio.test.ts` (append)

**Interfaces:**
- Consumes: `categoryFor` (Task 1); `app.data.proof` (Task 2); every class in `studio.css` (Task 3); `<StudioSwitch />` (Task 4); `Base.astro` with `mono`; `Imprint.astro`; `src/data/sidebar/index.json`'s `elsewhere` array of `{ label, href }`.
- Produces: the built page `dist/studio/index.html`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/studio.test.ts`:

```ts
const studioPage = read('src/pages/studio.astro');

test('the pre-paint script is inline and reads the same key the module exports', () => {
  assert.match(studioPage, /<script is:inline>/);
  const match = studioPage.match(/localStorage\.getItem\(\s*['"]([^'"]+)['"]\s*\)/);
  assert.ok(match, 'studio.astro does not read localStorage in its inline script');
  assert.equal(match[1], STUDIO_STORAGE_KEY);
});

test('the page mounts the studio switch once and never the theme toggle', () => {
  assert.equal((studioPage.match(/<StudioSwitch \/>/g) ?? []).length, 1);
  assert.doesNotMatch(studioPage, /ThemeToggle/);
});

test('the page is built on Base without the rail, in the mono face', () => {
  assert.doesNotMatch(studioPage, /import Rail/);
  assert.match(studioPage, /<Base[^>]*\smono\b/);
  assert.match(studioPage, /title="Studio · Gaspery"/);
});

test('every name is printed twice with a decorative ghost, and the ghost never carries a heading', () => {
  assert.match(studioPage, /class="studio-name__ghost" aria-hidden="true"/);
  assert.match(studioPage, /class="studio-name__ink"/);
  assert.match(studioPage, /<h1 class="sr-only">Apps<\/h1>/);
});

test('the foot carries the tagline, the Elsewhere links, and the imprint', () => {
  assert.match(studioPage, /Small software, printed in two inks\./);
  assert.match(studioPage, /sidebar\.elsewhere\.map/);
  assert.match(studioPage, /<Imprint \/>/);
});

test('no em dashes in the page', () => {
  assert.doesNotMatch(studioPage, /—/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/studio.test.ts`
Expected: the six new tests FAIL with `ENOENT ... studio.astro`.

- [ ] **Step 3: Write the page**

Create `src/pages/studio.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import StudioSwitch from '../components/StudioSwitch.astro';
import Imprint from '../components/Imprint.astro';
import sidebar from '../data/sidebar/index.json';
import { categoryFor } from '../lib/studio';
import '../styles/studio.css';

/* The studio landing page: one screen, the work as large type, a proof on
   hover. Reachable by URL only for now; the rail's Index does not list it
   (see docs/superpowers/specs/2026-09-16-studio-page-design.md). */
const apps = (await getCollection('apps'))
  .sort((a, b) => a.data.order - b.data.order)
  .map((a) => ({
    id: a.id,
    name: a.data.name,
    url: a.data.url,
    proof: a.data.proof,
    status: a.data.status,
    category: categoryFor(a.data),
  }));
---
<Base title="Studio · Gaspery" description="Small software, printed in two inks." mono>
  <div class="studio-page">
    {/* Runs before the rest of the body parses, so a reader who chose
        light or dark never sees a magenta flash. The plate needs nothing:
        it is the absence of an opt-out, painted by studio.css. Mirrors
        StudioSwitch.astro's apply() exactly; the key is repeated as a
        literal because this runs before the bundle exists, and
        tests/studio.test.ts pins the two together. */}
    <script is:inline>
      (function () {
        var stored = null;
        try { stored = localStorage.getItem('studio'); } catch (e) {}
        var root = document.documentElement;
        var ground = '#B82E70';
        if (stored === 'light' || stored === 'dark') {
          root.dataset.studio = stored;
          root.dataset.theme = stored;
          ground = stored === 'dark' ? '#191712' : '#F6F1E6';
        }
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', ground);
      })();
    </script>

    <header class="studio-top">
      <a class="studio-wm" href="/" aria-label="Gaspery, home">
        <span class="studio-wm__ghost" aria-hidden="true">Gaspery.</span>
        <span class="studio-wm__ink">Gaspery.</span>
      </a>
      <StudioSwitch />
      <nav class="studio-nav" aria-label="Primary">
        <a href="/writing">Writing</a>
        <a href="/studio" aria-current="page">Studio</a>
        <a href="/about">About</a>
        <a href="/now">Now</a>
      </nav>
    </header>

    <main class="studio-work" id="main">
      <h1 class="sr-only">Apps</h1>
      <ul class="studio-cloud">
        {apps.map((app) => (
          <li class="studio-item" data-proof={app.id}>
            {app.url ? (
              <a class="studio-name" href={app.url}>
                <span class="studio-name__ghost" aria-hidden="true">{app.name}</span>
                <span class="studio-name__ink">{app.name}</span>
              </a>
            ) : (
              <span class="studio-name studio-name--dim">
                <span class="studio-name__ghost" aria-hidden="true">{app.name}</span>
                <span class="studio-name__ink">{app.name}</span>
              </span>
            )}
            <span class="studio-cat">{app.category}</span>
          </li>
        ))}
      </ul>
    </main>

    <footer class="studio-foot">
      <div>
        <p class="studio-foot__line">Small software, printed in two inks.</p>
        <div class="studio-foot__links">
          {sidebar.elsewhere.map((item) => (
            <a href={item.href}>{item.label}</a>
          ))}
        </div>
      </div>
      <span class="label">Alex Holley · © MMXXVI · London</span>
    </footer>
    {/* The trading disclosure is findable at the bottom of every page;
        see Imprint.astro. */}
    <div class="studio-imprint"><Imprint /></div>

    {/* One proof element, one pre-rendered card per app. The script shows
        the card whose data-card matches the hovered item's data-proof. A
        real screenshot when the app has one; otherwise "Proof pending",
        or "Redacted" while the app is still in planning. The pending and
        redacted cards are markup, not images. */}
    <div class="studio-proof" aria-hidden="true">
      <div class="studio-proof__plate"></div>
      {apps.map((app) =>
        app.proof ? (
          <div class="studio-card" data-card={app.id}>
            <img src={app.proof} alt="" loading="lazy" decoding="async" />
          </div>
        ) : app.status === 'planning' ? (
          <div class="studio-card studio-card--blank" data-card={app.id}>
            <div>
              <div class="studio-card__big">████ ██████</div>
              <div class="studio-card__label">Redacted</div>
            </div>
          </div>
        ) : (
          <div class="studio-card studio-card--blank" data-card={app.id}>
            <div>
              <div class="studio-card__big">{app.name}</div>
              <div class="studio-card__label">Proof pending</div>
            </div>
          </div>
        )
      )}
    </div>
  </div>
</Base>

<script>
  /* The proof trails the cursor: 28px to its right, vertically centred on
     it, clamped inside the viewport, with a short lag so it follows rather
     than snaps. Touch pointers are ignored, so a phone never sees it and a
     tap simply follows the link. */
  const proof = document.querySelector<HTMLElement>('.studio-proof');
  const items = document.querySelectorAll<HTMLElement>('.studio-item[data-proof]');
  if (proof && items.length) {
    const cards = [...proof.querySelectorAll<HTMLElement>('.studio-card')];
    const W = 400;
    const H = (W * 2) / 3;
    let tx = 0, ty = 0, x = 0, y = 0;
    let on = false;
    let snap = true;

    const place = (e: PointerEvent) => {
      tx = Math.min(e.clientX + 28, window.innerWidth - W - 16);
      ty = Math.min(Math.max(e.clientY - H / 2, 16), window.innerHeight - H - 16);
    };

    items.forEach((item) => {
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        cards.forEach((c) => c.classList.toggle('is-on', c.dataset.card === item.dataset.proof));
        place(e);
        if (snap) { x = tx; y = ty; snap = false; }
        on = true;
        proof.classList.add('is-on');
      });
      item.addEventListener('pointerleave', () => {
        on = false;
        snap = true;
        proof.classList.remove('is-on');
      });
    });
    document.addEventListener('pointermove', (e) => { if (on) place(e); });

    const tick = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      proof.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(tick);
    };
    tick();
  }
</script>
```

Note on the transform: `.studio-proof`'s CSS `transform` (the rotate/scale reveal) is overwritten by the script's `translate` on every frame. That is intended; the reveal is carried by `opacity` and the first-frame snap, and the CSS transform only applies before the script runs. If a reviewer wants the rotate reveal kept, wrap the cards in an inner element and put the CSS transform on that. Not required.

- [ ] **Step 4: Run the tests and the build**

Run: `node --test tests/studio.test.ts`
Expected: 22 passing.

Run: `npm run build 2>&1 | tail -8 && ls dist/studio/`
Expected: build completes; `dist/studio/index.html` exists.

Run: `grep -c 'class="studio-item"' dist/studio/index.html && grep -o 'class="studio-cat">[^<]*' dist/studio/index.html`
Expected: `4`, then the four categories: `Mac`, `Mac`, `iOS`, `Soon`.

Run: `grep -o 'src="/shots/grod/briefing.webp"' dist/studio/index.html | wc -l && grep -c 'Proof pending' dist/studio/index.html && grep -c 'Redacted' dist/studio/index.html`
Expected: `1`, `2`, `1`.

- [ ] **Step 5: Run the whole suite**

Run: `npm test 2>&1 | tail -5`
Expected: every test file passes, including the pre-existing `theme`, `rail`, `links`, `feature` suites.

- [ ] **Step 6: Commit**

```bash
git add src/pages/studio.astro tests/studio.test.ts
git commit -m "feat(studio): the /studio route

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Parity gate (admit the studio switch, grow the baseline)

**Files:**
- Modify: `scripts/verify-parity.sh` (the "theme control is single-instance" loop, ~lines 44-52)
- Test: `tests/studio.test.ts` (append)

**Interfaces:**
- Consumes: `dist/studio/index.html` (Task 5).
- Produces: a gate that passes on the new route set.

- [ ] **Step 1: Write the failing test**

Append to `tests/studio.test.ts`:

```ts
const parity = read('scripts/verify-parity.sh');

test('the parity gate admits one studio switch in place of the theme toggle', () => {
  // Original guarantee kept: no page ever carries two theme radio groups.
  // New: a page may carry the studio switch instead of the theme toggle.
  assert.match(parity, /class="studio-switch"/);
  assert.match(parity, /-gt 1/);
  assert.match(parity, /-lt 1/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/studio.test.ts`
Expected: the new test FAILS (`studio-switch` not in the script).

- [ ] **Step 3: Amend the gate**

In `scripts/verify-parity.sh`, replace the theme-toggle loop:

```bash
# The theme control is single-instance per page (see ThemeToggle.astro):
# two mounted copies would share one native radio group via `name="theme"`
# and fight over which is checked instead of staying in sync.
while IFS= read -r f; do
  count=$(grep -o 'class="theme-toggle"' "$f" | wc -l | tr -d ' ')
  if [ "$count" -ne 1 ]; then
    echo "THEME TOGGLE COUNT WRONG: $f has $count, expected 1"
    fail=1
  fi
done < <(find dist -name '*.html' | sort)
```

with:

```bash
# Every page carries exactly one appearance control: the site's theme
# toggle (ThemeToggle.astro) or, on /studio, the studio switch
# (StudioSwitch.astro). Never two of either: each is a native radio group
# and two mounted copies would fight over which is checked. Never none:
# a page without a control cannot leave a forced appearance.
while IFS= read -r f; do
  theme=$(grep -o 'class="theme-toggle"' "$f" | wc -l | tr -d ' ')
  studio=$(grep -o 'class="studio-switch"' "$f" | wc -l | tr -d ' ')
  if [ "$theme" -gt 1 ] || [ "$studio" -gt 1 ] || [ $((theme + studio)) -lt 1 ]; then
    echo "APPEARANCE CONTROL COUNT WRONG: $f has theme=$theme studio=$studio, expected exactly one of either"
    fail=1
  fi
done < <(find dist -name '*.html' | sort)
```

- [ ] **Step 4: Run the gate against the old baseline, then re-snapshot**

Run: `bash scripts/verify-parity.sh; echo "exit $?"`
Expected: `ROUTE SET CHANGED:` listing only `./studio/index.html` as added, no `CHANGED:` lines for any existing page, no `APPEARANCE CONTROL COUNT WRONG`, then `exit 1`. If any existing page shows `CHANGED:`, stop: this work must not alter another page.

Run: `bash scripts/snapshot-baseline.sh && bash scripts/verify-parity.sh; echo "exit $?"`
Expected: `Baseline captured: 10 pages` (one more than before), then a clean gate and `exit 0`.

- [ ] **Step 5: Run the tests**

Run: `node --test tests/studio.test.ts`
Expected: 23 passing.

- [ ] **Step 6: Commit**

`.baseline/` is gitignored; only the script and the test are committed.

```bash
git add scripts/verify-parity.sh tests/studio.test.ts
git commit -m "chore(parity): admit the studio switch as a page's appearance control

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Rendered verification and the decision record

**Files:**
- Modify: `DECISIONS.md` (append one entry)
- Scratch (not committed): screenshots under the session scratchpad directory

**Interfaces:**
- Consumes: everything above, running on the dev server.

- [ ] **Step 1: Start the dev server and open the page**

Use the Browser pane: `preview_start` with `{ name: "homepage" }` (from `.claude/launch.json`, `npm run dev` on port 4321), then `navigate` to `http://localhost:4321/studio`. Set the viewport with `resize_window` to 1440 × 900 and `colorScheme: "light"`. Do not use Bash to run the server.

- [ ] **Step 2: Check the plate at rest**

Run `read_console_messages` with `onlyErrors: true`. Expected: none.

Run `javascript_tool`:

```js
({
  studio: document.documentElement.dataset.studio ?? null,
  paper: getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim(),
  ink: getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim(),
  bodyBg: getComputedStyle(document.body).backgroundColor,
  ghost: getComputedStyle(document.querySelector('.studio-name__ghost')).color,
  blend: getComputedStyle(document.querySelector('.studio-name__ghost')).mixBlendMode,
  switchVisible: !document.querySelector('.studio-switch').hidden,
  checked: document.querySelector('.studio-switch input:checked')?.value,
  themeColor: document.querySelector('meta[name="theme-color"]').content,
  cloudWidth: document.querySelector('.studio-cloud').getBoundingClientRect().width,
  nameSize: getComputedStyle(document.querySelector('.studio-name')).fontSize,
})
```

Expected: `studio: null`, `paper: "#B82E70"`, `ink: "#F6F1E6"`, `bodyBg: "rgb(184, 46, 112)"`, `ghost: "rgb(35, 32, 25)"`, `blend: "multiply"`, `switchVisible: true`, `checked: "plate"`, `themeColor: "#B82E70"`, `cloudWidth` ≤ 1120, `nameSize` about `120px`.

Take a `screenshot`. Expected: magenta page, four paper names in two lines with black ghosts, small mono categories, three dots in the top bar with the magenta one ringed, hairline foot with tagline, links, and the imprint below.

- [ ] **Step 3: Check the proof on hover, all three card types**

Use `find` for "GRØD", then `computer` `hover` on its ref; `wait` 1s; `screenshot`. Expected: the GRØD screenshot card appears to the right of the cursor on a black offset plate.

Repeat for "tavle." (expected: a paper card reading "tavle." over "PROOF PENDING") and "Top Secret" (expected: a paper card of block characters over "REDACTED").

Run `javascript_tool` while hovering Top Secret: `document.querySelector('.studio-card.is-on')?.dataset.card`. Expected: `"top-secret"`.

- [ ] **Step 4: Check the light and dark opt-outs**

Click the paper dot (`find` "Light", `computer` `left_click` on its ref). Run `javascript_tool`:

```js
({
  studio: document.documentElement.dataset.studio,
  theme: document.documentElement.dataset.theme,
  paper: getComputedStyle(document.documentElement).getPropertyValue('--color-paper').trim(),
  ghost: getComputedStyle(document.querySelector('.studio-name__ghost')).color,
  stored: localStorage.getItem('studio'),
  siteKey: localStorage.getItem('theme'),
  themeColor: document.querySelector('meta[name="theme-color"]').content,
})
```

Expected: `studio: "light"`, `theme: "light"`, `paper: "#F6F1E6"`, `ghost: "rgb(214, 58, 134)"`, `stored: "light"`, `siteKey: null` (unchanged from whatever it was before; it must not become "light"), `themeColor: "#F6F1E6"`. Screenshot. Expected: bone page, ink names with magenta ghosts.

Reload the page (`navigate` to the same URL). Run `javascript_tool`: `document.documentElement.dataset.studio`. Expected: `"light"` (the pre-paint script restored it). Screenshot must show no magenta.

Click the ink dot ("Dark"). Expected from the same probe: `studio: "dark"`, `theme: "dark"`, `paper: "#191712"`, ghost `rgb(240, 106, 166)`, blend on `.studio-name__ghost` is `screen`, `themeColor: "#191712"`. Screenshot.

Click the magenta dot. Expected: `studio` undefined, `theme` undefined, `stored: null`, page magenta again.

- [ ] **Step 5: Check the phone layout**

`resize_window` with `preset: "mobile"`, reload. Run `javascript_tool`:

```js
({
  scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
  proofDisplay: getComputedStyle(document.querySelector('.studio-proof')).display,
  cloudDir: getComputedStyle(document.querySelector('.studio-cloud')).flexDirection,
  switchRow: document.querySelector('.studio-switch').getBoundingClientRect().top > document.querySelector('.studio-nav').getBoundingClientRect().top,
})
```

Expected: `scrollW === innerW` (no horizontal scroll), `proofDisplay: "none"`, `cloudDir: "column"`, `switchRow: true` (the switch sits on its own row under the nav). Screenshot. Then `resize_window` with `preset: "desktop"`.

- [ ] **Step 6: A file proof for the user, rendered headless**

The Browser pane's screenshots cannot be saved. Render the default plate to a file with headless Chrome against the dev server, in the background, polling for the file, then kill Chrome (it hangs after writing when a page runs a requestAnimationFrame loop):

```bash
S="$CLAUDE_SCRATCHPAD_DIR"   # or the session's scratchpad path from the system prompt
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for size in 1440,900 375,812; do
  n=${size/,/x}; rm -f "$S/studio-$n.png"
  ( "$CH" --headless=new --user-data-dir="$S/.chrome-$n" --hide-scrollbars --disable-gpu \
      --window-size=$size --virtual-time-budget=8000 --screenshot="$S/studio-$n.png" \
      "http://localhost:4321/studio" >/dev/null 2>&1 & )
done
for i in $(seq 1 240); do [ -s "$S/studio-1440x900.png" ] && [ -s "$S/studio-375x812.png" ] && break; sleep 1; done
pkill -f "headless=new"; ls -la "$S"/studio-*.png
```

Expected: two PNGs. Read both. They must show the plate (magenta), never bone or dark: headless Chrome inherits the Mac's dark appearance, and the plate must beat it by specificity. If either is not magenta, the plate block is losing the cascade; stop and fix `studio.css` before continuing. Send both files to the user with `SendUserFile`.

- [ ] **Step 7: Record the decision**

Append to `DECISIONS.md`:

```markdown
## /studio defaults to the magenta plate, on the brand-strong press

**Decided:** 2026-09-16, with the studio page.

`/studio` is the one page that chooses an appearance for the reader. It
paints the plate (the magenta ink as the ground, paper type, the black ink
layer off register) by default, ignores the OS, and offers light and dark
as page-local opt-outs through its own three-dot switch and its own storage
key. It never reads or writes the site-wide `theme` preference.

**Why.** The brief was a studio landing page in the manner of the bold
agency demos, where the brand colour is the whole ground. Making it opt-in
would make it a novelty; making it the default makes it the page.

**The press.** The ground is brand-strong (#B82E70), not the display
magenta (#D63A86). Paper on the display ink is 3.88:1, short of AA for the
12px categories and the 14px foot links; on brand-strong it is 5.09:1, so
every word on the plate clears 4.5:1 with no size exception to remember.
Secondary ink on the plate is full paper for the same reason; only Top
Secret's display-size name dims, by opacity, to 3.32:1 against a 3:1 floor.

**Not linked yet.** The rail's Index does not list Studio. The page is a
sibling reachable by URL until it earns a place, or replaces the homepage.

**Revisit if** the bold default stops being wanted: add a `system` state
to the switch and make it the default, and the plate becomes a choice.
```

- [ ] **Step 8: Run everything once more and commit**

Run: `npm test 2>&1 | tail -3 && bash scripts/verify-parity.sh; echo "exit $?"`
Expected: all suites pass; parity `exit 0`.

```bash
git add DECISIONS.md
git commit -m "docs: record the studio plate default

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Then stop the dev server (`preview_stop` with its serverId) and hand off to `superpowers:finishing-a-development-branch` for the merge or PR decision. The PR description ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
