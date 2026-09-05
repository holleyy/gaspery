# Rail Masthead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the homepage Hero and make the rail the site's only masthead, reading "Gaspery." with a display wordmark, a G plate, and the halftone dots.

**Architecture:** All rail chrome lives in `src/components/Rail.astro` with its styles in `src/styles/global.css`; the seven pages that render the rail pass only `current`. The Hero component survives for the 404. Tests are file-content assertions in `tests/`, run by `node --test`, matching the existing `theme.test.ts` style.

**Tech Stack:** Astro 5, plain CSS in `global.css`, Keystatic (`keystatic.config.ts`), Node's built-in test runner (`npm test`).

Spec: `docs/superpowers/specs/2026-09-05-rail-masthead-design.md`.

## Global Constraints

- Work on a branch in the **main checkout**, not a worktree: `/keystatic` is blank in worktrees (Vite `fs.allow`), and verification step 8 needs it.
- `.wordmark`, `.identity`, `.monogram*` are reused by `src/components/AppPageHeader.astro`. Their existing rules must not change. The rail's new wordmark uses the **new** class `.rail-wordmark`.
- Wordmark: Merriweather, weight `400`, `38px` desktop / `32px` at `≤1000px`, `line-height: 1.1`, `letter-spacing: -0.01em`, ghost `translate(2px, 2px)` in `var(--color-brand)`, `mix-blend-mode: multiply`, flipped to `screen` in dark under **both** guards (`@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) … }` and `:root[data-theme='dark'] …`).
- Dots in the rail: `170px × 120px`, `top: -58px`, `right: -48px` desktop; `150px × 120px`, `top: -36px`, `right: -24px` at `≤1000px`. Hero keeps `320 × 200`, `top: -20px`, `right: -6px` desktop and `150 × 120`, `top: -8px` at `≤1000px`.
- Rail defaults: `name = 'Gaspery.'`, `role = 'Words, design, tools & links'`, `monogram = 'G'`. `aria-label` reads `Gaspery, home`.
- Colophon sign-off is two `.label` lines: `Alex Holley` then `© MMXXVI · London`.
- Rename copy: `Gaspery · a working notebook` (home title, RSS title, autodiscovery title); `· Gaspery` title suffix on every other page; `← Gaspery` on the three back links.
- Prose about Alex in `src/content/about/` and `src/content/company/` is untouched.
- `public/og/card.png` is untouched.
- Every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- `npm test` and `npm run build` must pass before the PR.

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Confirm a clean tree on main and branch**

Run:
```bash
cd /Users/magneticadmin/Git/homepage && git status --short && git branch --show-current
```
Expected: no output from status, then `main`. If status shows changes, stop and ask.

Run:
```bash
git fetch origin && git checkout -b feat/rail-masthead origin/main
```
Expected: `branch 'feat/rail-masthead' set up to track 'origin/main'.`

- [ ] **Step 2: Confirm the baseline passes**

Run: `npm test`
Expected: all tests pass, `# fail 0`.

---

### Task 1: Rail identity — wordmark, plate, defaults, colophon

**Files:**
- Modify: `src/components/Rail.astro:9-30` (props), `:41-51` (identity markup), `:85-91` (colophon)
- Modify: `src/styles/global.css:191-206` (identity rules), `:521-525` (accessibility gate), `:562-566` (collapsed overrides)
- Modify: `tests/theme.test.ts:92` (blend-flip list)
- Create: `tests/rail.test.ts`

**Interfaces:**
- Produces: `Rail` renders with no props other than `current`. Class names `.rail-wordmark`, `.rail-wordmark__ink`, `.rail-wordmark__ghost` (Task 2 layers the dots beneath them; Task 5 documents them).

- [ ] **Step 1: Write the failing tests**

Create `tests/rail.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const rail = read('src/components/Rail.astro');
const css = read('src/styles/global.css');

test('Rail defaults to the Gaspery identity so pages pass only `current`', () => {
  assert.match(rail, /name = 'Gaspery\.'/);
  assert.match(rail, /role = 'Words, design, tools & links'/);
  assert.match(rail, /monogram = 'G'/);
});

test('rail wordmark is two stacked copies with a decorative ghost', () => {
  // Same construction as the hero title: the ghost is aria-hidden so
  // assistive tech reads "Gaspery." once, not twice.
  assert.match(rail, /class="rail-wordmark__ghost" aria-hidden="true"/);
  assert.match(rail, /class="rail-wordmark__ink"/);
  // The rail must not fall back to the app-page wordmark class.
  assert.doesNotMatch(rail, /class="wordmark"/);
});

test('home link is labelled without the wordmark full stop', () => {
  assert.match(rail, /aria-label=\{`\$\{name\.replace\(\/\\\.\$\/, ''\)\}, home`\}/);
});

test('colophon signs off with the author on their own label line', () => {
  assert.match(rail, /<div class="label">Alex Holley<\/div>\s*<div class="label">© MMXXVI · London<\/div>/);
});

test('rail wordmark is set at Regular with a 2px ghost, and is not .wordmark', () => {
  const block = css.match(/\.rail-wordmark__ink,\s*\.rail-wordmark__ghost\s*\{([^}]*)\}/);
  assert.ok(block, 'no shared rail-wordmark rule');
  assert.match(block![1], /font-weight:\s*400/);
  assert.match(block![1], /font-size:\s*38px/);
  assert.match(block![1], /letter-spacing:\s*-0\.01em/);
  assert.match(css, /\.rail-wordmark__ghost\s*\{[^}]*transform:\s*translate\(2px,\s*2px\)/);
  // The app-page wordmark keeps its rule exactly.
  assert.match(css, /\.wordmark \{ font-family: var\(--font-serif\); font-weight: 700; font-size: 24px; line-height: 1\.15; letter-spacing: -0\.01em; transition: color \.15s ease; \}/);
});

test('rail wordmark drops to 32px when the layout collapses', () => {
  const collapsed = css.slice(css.indexOf('@media (max-width: 1000px)'));
  assert.match(collapsed, /\.rail-wordmark__ink,\s*\.rail-wordmark__ghost\s*\{[^}]*font-size:\s*32px/);
});

test('accessibility gate hides the rail ghost alongside the hero ghost', () => {
  // Pinned to the multi-line gate block (the riso-photo gate is a one-liner
  // earlier in the file and must not satisfy this).
  assert.match(
    css,
    /\(prefers-contrast: more\)\s*\{\s*\.hero-title \.ghost \{ display: none; \}\s*\.rail-wordmark__ghost \{ display: none; \}/
  );
});
```

In `tests/theme.test.ts`, change line 92 from

```ts
  for (const target of ['.halftone', '.riso-photo::after']) {
```
to
```ts
  for (const target of ['.halftone', '.riso-photo::after', '.rail-wordmark__ghost']) {
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the seven `rail.test.ts` tests fail (`name = 'Gaspery.'` not found, etc.) and `both blend-mode flips are duplicated for the attribute state` fails with `no attribute-state blend flip for .rail-wordmark__ghost`.

- [ ] **Step 3: Update `Rail.astro` props and identity markup**

Replace lines 10–31 of `src/components/Rail.astro` (from `interface Props {` through `} = Astro.props;`; leave `NavItem` and `Link` above it) with:

```ts
interface Props {
  name?: string;
  role?: string;
  monogram?: string;
  current?: string;
  nav?: NavItem[];
  elsewhere?: Link[];
}
const {
  /* The rail is the site's masthead, so the identity defaults to the
     imprint. Pages pass only `current`; the props stay overridable. */
  name = 'Gaspery.',
  role = 'Words, design, tools & links',
  monogram = 'G',
  current = 'Writing',
  nav = [
    { label: 'Writing', href: '/writing' },
    { label: 'Apps', href: '/#apps' },
    { label: 'About', href: '/about' },
    { label: 'Now', href: '/now' },
  ],
  // Edited at /keystatic under "Sidebar"; pass the prop to override per-page.
  elsewhere = sidebar.elsewhere,
} = Astro.props;
```

Replace the identity block (currently lines 41–51, from `<a class="identity"` to its closing `</a>`) with:

```astro
  <a class="identity" href="/" aria-label={`${name.replace(/\.$/, '')}, home`}>
    <div class="monogram">
      <div class="monogram__ghost"></div>
      <div class="monogram__ink">{monogram}</div>
    </div>
    <div class="identity__text">
      <div class="rail-wordmark">
        {/* Two stacked copies = the deliberate misregistration. Ghost is decorative. */}
        <div class="rail-wordmark__ghost" aria-hidden="true">{name}</div>
        <div class="rail-wordmark__ink">{name}</div>
      </div>
      <div class="label">{role}</div>
    </div>
  </a>
```

- [ ] **Step 4: Update the colophon sign-off**

Replace the colophon's comment and label line (currently lines 87–90) with:

```astro
    {/* The print colophon's own sign-off: the author, then the run. The
        legal entity is stated once, in the statutory <Imprint /> at the foot
        of the page; the wordmark above is the brand mark, not the legal
        name, so the two may share a screen. */}
    <div class="label">Alex Holley</div>
    <div class="label">© MMXXVI · London</div>
```

- [ ] **Step 5: Add the wordmark CSS**

In `src/styles/global.css`, directly after line 206 (`.identity:hover .wordmark { … }`), insert:

```css

/* Rail wordmark — the site's masthead. Merriweather Regular riding a 2px
   magenta ghost: the hero's misregistration at rail scale. At weight 400 a
   3px shift is wider than the stroke and reads as an outline, hence 2px.
   Its own class, not .wordmark: AppPageHeader reuses .wordmark at 24/700. */
.rail-wordmark { position: relative; z-index: 1; }
.rail-wordmark__ink,
.rail-wordmark__ghost {
  font-family: var(--font-serif); font-weight: 400;
  font-size: 38px; line-height: 1.1; letter-spacing: -0.01em;
}
.rail-wordmark__ink { position: relative; z-index: 1; transition: color .15s ease; }
.rail-wordmark__ghost {
  position: absolute; inset: 0; transform: translate(2px, 2px);
  color: var(--color-brand); mix-blend-mode: multiply;
  z-index: 0; pointer-events: none;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) .rail-wordmark__ghost { mix-blend-mode: screen; } }
:root[data-theme='dark'] .rail-wordmark__ghost { mix-blend-mode: screen; }
.identity:hover .rail-wordmark__ink { color: var(--color-brand-bright); }
```

- [ ] **Step 6: Gate and collapse rules**

In the accessibility gate (line 521 onward), change

```css
  .hero-title .ghost { display: none; }
```
to
```css
  .hero-title .ghost { display: none; }
  .rail-wordmark__ghost { display: none; }
```

In the collapsed block, directly after `  .hero-title .ghost { transform: translate(2px, 2px); }` (line 565), insert:

```css
  .rail-wordmark__ink, .rail-wordmark__ghost { font-size: 32px; }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 8: Commit**

```bash
git add src/components/Rail.astro src/styles/global.css tests/rail.test.ts tests/theme.test.ts
git commit -m "feat(rail): Gaspery wordmark, G plate, author in colophon

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Move the halftone dots into the rail

**Files:**
- Modify: `src/components/Rail.astro` (identity block from Task 1)
- Modify: `src/styles/global.css:192` (`.identity`), `:193` (`.monogram`), `:280-289` (`.halftone`), `:566` (collapsed `.halftone`)
- Modify: `tests/rail.test.ts`

**Interfaces:**
- Consumes: `.identity`, `.rail-wordmark` from Task 1.
- Produces: placement rules `.hero .halftone` and `.identity .halftone`; the unscoped `.halftone` is recipe-only. `Hero.astro` is untouched.

- [ ] **Step 1: Write the failing tests**

Append to `tests/rail.test.ts`:

```ts
test('rail identity carries the halftone dots', () => {
  assert.match(rail, /<a class="identity"[^>]*>\s*<div class="halftone" aria-hidden="true"><\/div>/);
});

test('halftone placement is scoped: recipe unscoped, position per host', () => {
  const recipe = css.match(/\n\.halftone\s*\{([^}]*)\}/);
  assert.ok(recipe, 'unscoped .halftone rule missing');
  assert.match(recipe![1], /background-image:\s*radial-gradient\(var\(--color-teal\)/);
  assert.doesNotMatch(recipe![1], /\btop:/);
  assert.doesNotMatch(recipe![1], /\bwidth:/);

  const hero = css.match(/\.hero \.halftone\s*\{([^}]*)\}/);
  assert.ok(hero, '.hero .halftone missing');
  assert.match(hero![1], /top:\s*-20px/);
  assert.match(hero![1], /width:\s*320px/);

  const identity = css.match(/\.identity \.halftone\s*\{([^}]*)\}/);
  assert.ok(identity, '.identity .halftone missing');
  assert.match(identity![1], /top:\s*-58px/);
  assert.match(identity![1], /right:\s*-48px/);
  assert.match(identity![1], /width:\s*170px/);
  assert.match(identity![1], /height:\s*120px/);
});

test('collapsed layout keeps the rail dots inside the viewport', () => {
  const collapsed = css.slice(css.indexOf('@media (max-width: 1000px)'));
  assert.match(collapsed, /\.identity \.halftone\s*\{[^}]*right:\s*-24px/);
  assert.match(collapsed, /\.identity \.halftone\s*\{[^}]*top:\s*-36px/);
  assert.match(collapsed, /\.hero \.halftone\s*\{[^}]*top:\s*-8px/);
  // The old unscoped override would drag the hero's values onto the rail.
  assert.doesNotMatch(collapsed, /\n\s*\.halftone\s*\{/);
});

test('plate and wordmark sit above the dots', () => {
  assert.match(css, /\.identity\s*\{[^}]*position:\s*relative/);
  assert.match(css, /\.monogram\s*\{[^}]*z-index:\s*1/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: the four new tests fail; everything else passes.

- [ ] **Step 3: Add the dots to the rail markup**

In `src/components/Rail.astro`, insert the dots as the first child of the identity link:

```astro
  <a class="identity" href="/" aria-label={`${name.replace(/\.$/, '')}, home`}>
    <div class="halftone" aria-hidden="true"></div>
    <div class="monogram">
```

- [ ] **Step 4: Scope the halftone CSS**

Change line 192–193 of `global.css` to:

```css
.identity { display: flex; flex-direction: column; gap: 18px; position: relative; }
/* Text block and plate are lifted above the dots (z-index 0). */
.identity__text { position: relative; z-index: 1; }
.monogram { position: relative; width: 46px; height: 46px; z-index: 1; }
```

Replace the `.halftone` rule (lines 280–289) with:

```css
/* Halftone dot field — teal, multiply on light / screen on dark, fading out.
   The recipe is shared; where it sits depends on the host. */
.halftone {
  position: absolute;
  background-image: radial-gradient(var(--color-teal) 1.1px, transparent 1.5px);
  background-size: 7px 7px;
  mix-blend-mode: multiply;
  -webkit-mask-image: radial-gradient(120% 120% at 92% 8%, #000 0%, rgba(0,0,0,.5) 34%, transparent 68%);
          mask-image: radial-gradient(120% 120% at 92% 8%, #000 0%, rgba(0,0,0,.5) 34%, transparent 68%);
  pointer-events: none;
}
/* In the Hero (404 only now) it balances the 56px headline. */
.hero .halftone { top: -20px; right: -6px; width: 320px; height: 200px; z-index: 1; }
/* In the rail it bleeds off the identity block's top-right corner, behind
   the plate and wordmark (both z-index: 1). */
.identity .halftone { top: -58px; right: -48px; width: 170px; height: 120px; z-index: 0; }
```

In the collapsed block, replace line 566

```css
  .halftone { width: 150px; height: 120px; top: -8px; }
```
with
```css
  .hero .halftone { width: 150px; height: 120px; top: -8px; }
  /* right: -24px meets the page's 24px side padding exactly, so the dots
     touch the viewport edge without creating horizontal scroll. */
  .identity .halftone { width: 150px; height: 120px; top: -36px; right: -24px; }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Rail.astro src/styles/global.css tests/rail.test.ts
git commit -m "feat(rail): move the halftone dots into the identity block

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Remove the homepage Hero

**Files:**
- Modify: `src/pages/index.astro:5`, `:35-39`
- Modify: `src/data/home/index.json`
- Modify: `keystatic.config.ts:393-400`
- Modify: `src/styles/global.css:553` (collapsed `.hero { order: 3; }`)
- Modify: `tests/rail.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `home.hero` no longer exists; `home.nowSummary` is unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `tests/rail.test.ts`:

```ts
test('homepage has no Hero; the rail is the only masthead', () => {
  const index = read('src/pages/index.astro');
  assert.doesNotMatch(index, /Hero/);
  const home = JSON.parse(read('src/data/home/index.json'));
  assert.equal('hero' in home, false);
  assert.ok(home.nowSummary, 'nowSummary must survive');
  const keystatic = read('keystatic.config.ts');
  const homeSingleton = keystatic.slice(keystatic.indexOf('home: singleton('), keystatic.indexOf('sidebar: singleton('));
  assert.doesNotMatch(homeSingleton, /hero:/);
});

test('404 keeps its Hero', () => {
  assert.match(read('src/pages/404.astro'), /<Hero\b/);
  assert.match(read('src/components/Hero.astro'), /class="halftone"/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: `homepage has no Hero` fails on the first assertion; `404 keeps its Hero` passes.

- [ ] **Step 3: Remove the Hero from `index.astro`**

Delete line 5 (`import Hero from '../components/Hero.astro';`) and the `<Hero … />` element (lines 35–39), so `<main>` reads:

```astro
    <main class="main" id="main">
      <div class="streams">
```

- [ ] **Step 4: Remove the hero data and its Keystatic fields**

Replace `src/data/home/index.json` with:

```json
{
  "nowSummary": {
    "building": "Teaching GRØD to view recurring meetings differently\nApplying the finishing touches to Tavle",
    "reading": "The Faith of Beasts by James S. A. Corey",
    "watching": "The Agency on Paramount+",
    "listening": "Every single pod about The Odyssey",
    "linkLabel": "More on all this"
  }
}
```

(Copy the current `nowSummary` values verbatim from the file at the time; do not retype them from this plan if the file has moved on.)

In `keystatic.config.ts`, delete the `hero: fields.object(…)` entry (lines 393–400) so the `home` singleton's schema contains only `nowSummary`.

- [ ] **Step 5: Drop the collapsed-layout order for the hero**

In `global.css`, delete line 553: `  .hero       { order: 3; }`. Leave the other order numbers as they are.

- [ ] **Step 6: Run the tests and the build**

Run: `npm test`
Expected: `# fail 0`.

Run: `npm run build`
Expected: exits 0. (This is the check that Astro no longer references `home.hero`.)

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro src/data/home/index.json keystatic.config.ts src/styles/global.css tests/rail.test.ts
git commit -m "feat(home): remove the Hero; the rail is the masthead

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: The rename across the chrome

**Files:**
- Modify: `src/pages/index.astro:30,32`, `links.astro:17,19`, `essays.astro:16,18`, `now.astro:14,18`, `about.astro:12,14`, `company.astro:17,19`, `writing/index.astro:16,18`, `404.astro:12`, `apps/[id].astro:33,38`, `writing/[...id].astro:40,48`
- Modify: `src/components/FeatureArticle.astro:44`
- Modify: `src/layouts/Base.astro:84`
- Modify: `src/pages/rss.xml.js:39`
- Modify: `tests/rail.test.ts`

**Interfaces:**
- Consumes: `Rail` defaults from Task 1.

- [ ] **Step 1: Write the failing test**

Append to `tests/rail.test.ts`:

```ts
test('the chrome says Gaspery; only content and the colophon name Alex', () => {
  const walk = (dir: string): string[] =>
    readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(`${dir}/${d.name}`) : [`${dir}/${d.name}`]);
  const chrome = [...walk('src/pages'), ...walk('src/layouts'), ...walk('src/components')]
    .filter((f) => !f.endsWith('Rail.astro'));
  for (const f of chrome) {
    assert.doesNotMatch(read(f), /Alex Holley/, `${f} still names Alex Holley`);
  }
  assert.match(read('src/pages/index.astro'), /title="Gaspery · a working notebook"/);
  assert.match(read('src/pages/rss.xml.js'), /title: 'Gaspery · a working notebook'/);
  assert.match(read('src/layouts/Base.astro'), /title="Gaspery · a working notebook"/);
  for (const f of ['src/pages/writing/[...id].astro', 'src/pages/apps/[id].astro', 'src/components/FeatureArticle.astro']) {
    assert.match(read(f), /Gaspery<\/a>/, `${f} back link`);
  }
  // Pages pass only `current`; the identity comes from Rail's defaults.
  for (const f of walk('src/pages')) {
    assert.doesNotMatch(read(f), /<Rail[^>]*\bname=/, `${f} overrides the rail name`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: fails with `src/pages/index.astro still names Alex Holley` (or another chrome file).

- [ ] **Step 3: Drop the rail props on all seven pages**

In each of `index.astro`, `links.astro`, `essays.astro`, `now.astro`, `about.astro`, `company.astro`, `writing/index.astro`, replace

```astro
<Rail name="Alex Holley" role="Words, design, tools & links" monogram="A" current="…" />
```
with
```astro
<Rail current="…" />
```
keeping each page's own `current` value (`Writing`, `Writing`, `Writing`, `Now`, `About`, `""`, `Writing`).

Exact sed, run from the repo root:

```bash
sed -i '' 's/<Rail name="Alex Holley" role="Words, design, tools \& links" monogram="A" current=/<Rail current=/' \
  src/pages/index.astro src/pages/links.astro src/pages/essays.astro src/pages/now.astro \
  src/pages/about.astro src/pages/company.astro src/pages/writing/index.astro
grep -rn "<Rail" src/pages
```
Expected: seven lines, each `<Rail current="…" />`.

- [ ] **Step 4: Titles**

- `src/pages/index.astro:30`: `<Base title="Gaspery · a working notebook">`
- `src/layouts/Base.astro:84`: `title="Gaspery · a working notebook"`
- `src/pages/rss.xml.js:39`: `title: 'Gaspery · a working notebook',`
- Every other `· Alex Holley` title suffix becomes `· Gaspery`:

```bash
sed -i '' 's/ · Alex Holley/ · Gaspery/' \
  src/pages/about.astro src/pages/now.astro src/pages/company.astro src/pages/writing/index.astro \
  src/pages/apps/\[id\].astro src/pages/404.astro src/pages/links.astro src/pages/essays.astro \
  src/pages/writing/\[...id\].astro
```

- [ ] **Step 5: Back links**

- `src/pages/writing/[...id].astro:48`: `<a class="back" href="/">← Gaspery</a>`
- `src/pages/apps/[id].astro:38`: `<a class="app-page__back" href="/">&larr; Gaspery</a>`
- `src/components/FeatureArticle.astro:44`: `<a class="feature__back" href="/">&larr; Gaspery</a>`

- [ ] **Step 6: Run the tests and build**

Run: `npm test`
Expected: `# fail 0`.

Run: `grep -rn "Alex Holley" src`
Expected: only `src/components/Rail.astro` (colophon), `src/content/company/index.mdoc`, and any `src/content/about/` prose.

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/pages src/components/FeatureArticle.astro src/layouts/Base.astro tests/rail.test.ts
git commit -m "feat: the site's chrome says Gaspery

Titles, RSS, autodiscovery, and the three back links follow the rail.
Prose about the author is untouched.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: DESIGN.md, browser verification, PR

**Files:**
- Modify: `DESIGN.md:145`, `:286`, `:295`, `:397`, `:453`, `:396`

- [ ] **Step 1: Update DESIGN.md**

Line 145, replace `The one loud moment per page is the misregistered hero headline; everything else is composed and calm.` with:

`The one loud moment per page is the misregistered wordmark in the rail (the hero headline, on the 404); everything else is composed and calm.`

Line 286, after the **Display** bullet, add a bullet:

`- **Masthead** (Merriweather 400, 38px — 32px ≤1000px — line-height 1.1, letter-spacing -0.01em, on a 2px magenta ghost): the rail wordmark, "Gaspery.", on every page. Regular weight because the G plate above it already carries the heavy mark; 2px not 3px because at this weight a 3px shift is wider than the stroke and reads as an outline. Class `.rail-wordmark`, deliberately not `.wordmark`.`

Line 286, change `the one hero headline per page.` to `the one hero headline on the 404.`

Line 295, change `24/700 serif (wordmark)` to `24/700 serif (app-page wordmark)`.

Line 396, append to the link-preview bullet: ` The card keeps the 56/800 hero recipe on purpose: the rail wordmark is its rail-scale cousin, not a replacement.`

Line 397, change `above the hero;` to `above the streams;`.

Line 453, change `Decorative only, near a hero` to `Decorative only, beside a masthead — the rail's identity block, or the 404's hero`.

Run: `npm test`
Expected: `# fail 0` (the DESIGN.md token test only reads the palette table, which is untouched).

- [ ] **Step 2: Commit**

```bash
git add DESIGN.md
git commit -m "docs(design): the rail masthead

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 3: Browser verification — desktop, both themes**

Start the dev server with `preview_start {name: "homepage"}` and open `http://localhost:4321/`. Then, in `javascript_tool`:

```js
const ghost = document.querySelector('.rail-wordmark__ghost');
const ink = document.querySelector('.rail-wordmark__ink');
const g = ghost.getBoundingClientRect(), i = ink.getBoundingClientRect();
const dots = document.querySelector('.identity .halftone').getBoundingClientRect();
({
  hero: !!document.querySelector('.hero'),
  wordmark: ink.textContent,
  weight: getComputedStyle(ink).fontWeight,
  size: getComputedStyle(ink).fontSize,
  ghostBox: [g.width, g.height],
  ghostOffset: [g.left - i.left, g.top - i.top],
  ghostBlend: getComputedStyle(ghost).mixBlendMode,
  dotsBox: [dots.width, dots.height],
  plate: document.querySelector('.monogram__ink').textContent,
  title: document.title,
})
```
Expected: `hero: false`, `wordmark: "Gaspery."`, `weight: "400"`, `size: "38px"`, `ghostBox` non-zero and equal to the ink box, `ghostOffset: [2, 2]`, `dotsBox: [170, 120]`, `plate: "G"`, `title: "Gaspery · a working notebook"`. `ghostBlend` is `multiply` under a light OS theme.

Force dark: `document.documentElement.setAttribute('data-theme', 'dark')` and re-read `ghostBlend` and `getComputedStyle(document.querySelector('.identity .halftone')).mixBlendMode`. Expected: both `screen`. Remove the attribute afterwards.

Take a screenshot in each theme and look at the identity block at zoom: the ghost must be visible as a magenta fringe down-right of the ink copy, and the dots must fade from the top-right corner.

- [ ] **Step 4: Browser verification — collapsed**

`resize_window {preset: "mobile"}`, reload, then:

```js
({
  scrollWidth: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
  size: getComputedStyle(document.querySelector('.rail-wordmark__ink')).fontSize,
  dots: (() => { const r = document.querySelector('.identity .halftone').getBoundingClientRect(); return [r.width, r.height, r.right]; })(),
})
```
Expected: `scrollWidth === viewport` (no horizontal scroll), `size: "32px"`, dots `[150, 120, <= viewport]`. Screenshot. Then `resize_window {preset: "desktop"}`.

- [ ] **Step 5: Browser verification — the pages that must not change**

- `/apps/grod`: `javascript_tool` → `getComputedStyle(document.querySelector('.app-page .wordmark')).fontSize` is `"24px"` and weight `"700"`; the header looks as it did.
- `/404` (any bad URL): a `.hero .halftone` exists with box `[320, 200]`; the headline is `Blank page.`; the title ends `· Gaspery`.
- `/keystatic` → Homepage: only "Now summary" is listed.
- `/writing/<any post>`: back link reads `← Gaspery`; `document.title` ends `· Gaspery`.
- `read_console_messages {onlyErrors: true}` on the homepage: none.

- [ ] **Step 6: Finish the branch**

Run `npm test` and `npm run build` one last time; both must pass. Then invoke `superpowers:finishing-a-development-branch` and open a PR against `main` titled `feat: the rail is the masthead` whose body summarises the spec's Decision section and ends with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
