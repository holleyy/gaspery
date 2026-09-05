# Manual Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader choose light, dark, or system for this site, persisted locally and applied before first paint.

**Architecture:** A `data-theme` attribute on `<html>` is the single source of truth for CSS; it is absent in the `system` state so the bare media query governs. Every dark rule in `global.css` gains an attribute-selector twin guarded by `:not([data-theme='light'])`, so an explicit light choice beats an OS that says dark. A tiny inline script in `<head>` sets the attribute before paint; a radio control mounted in two frames writes the preference.

**Tech Stack:** Astro 5, plain CSS custom properties, `node --test` with native TypeScript stripping. No new dependencies.

## Global Constraints

- **Neither palette changes.** Every colour value in this plan is copied verbatim from the existing `global.css`. This is plumbing, not a redesign.
- **`system` is the default** and must stay reachable. Three states, never two.
- **Every `localStorage` access is wrapped in `try/catch`.** It throws in some privacy modes; the failure mode must be the `system` state, never a blank page.
- **The pre-paint script must be `is:inline`** and in `<head>`. A bundled or deferred script runs after first paint, which is the flash we are preventing.
- **The two dark token blocks must stay byte-identical in their declarations.** Task 2 adds the test that enforces this.
- Node version comes from `.nvmrc` (22). Test runner: `npm test` → `node --test "tests/**/*.test.ts"`.
- Existing test imports use an explicit `.ts` extension (see `tests/links.test.ts`); new tests must too.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/lib/theme.ts` | **New.** Pure preference logic — the storage key, normalisation, resolution. No DOM, so it is unit-testable. |
| `tests/theme.test.ts` | **New.** Unit tests for the above, plus the CSS token-parity guard and the storage-key pin. |
| `src/styles/global.css` | Three dark blocks gain attribute twins; `color-scheme` declared per state. |
| `src/layouts/Base.astro` | Pre-paint inline script; single unconditional `theme-color` meta. |
| `src/components/ThemeToggle.astro` | **New.** The radio control, its scoped styles, and its behaviour script. |
| `src/components/Rail.astro` | Mounts the control (7 pages). |
| `src/pages/writing/[...id].astro` | Mounts the control in the existing meta row. |
| `src/pages/apps/[id].astro` | Mounts the control beside the back link. |
| `src/pages/404.astro` | Mounts the control. |
| `DESIGN.md` | Documents the dark ramp and adds `--color-brand-on-ink`. |

**Note on `nextTheme()`:** the spec mentioned it, but the control is three radios, so nothing ever needs to cycle. It is omitted deliberately — YAGNI.

---

### Task 1: Preference logic

**Files:**
- Create: `src/lib/theme.ts`
- Create: `tests/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `THEME_STORAGE_KEY: 'theme'`, `type ThemePreference = 'light' | 'dark' | 'system'`, `type Appearance = 'light' | 'dark'`, `isThemePreference(v: unknown): v is ThemePreference`, `readPreference(v: unknown): ThemePreference`, `resolveTheme(stored: unknown, systemPrefersDark: boolean): Appearance`. Tasks 4 and 5 import `THEME_STORAGE_KEY` and `readPreference`.

- [ ] **Step 1: Write the failing test**

Create `tests/theme.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
// The `.ts` extension is required here and only here: Node's native type
// stripping runs this file directly, and ESM in Node needs explicit
// extensions. Astro/Vite files import the same module extensionless.
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  readPreference,
  resolveTheme,
} from '../src/lib/theme.ts';

test('THEME_STORAGE_KEY is the literal the inline script hardcodes', () => {
  // src/layouts/Base.astro cannot import this module — it runs before the
  // bundle — so it repeats the string. Task 3 adds the test that pins the
  // two together; this pins the value itself.
  assert.equal(THEME_STORAGE_KEY, 'theme');
});

test('isThemePreference accepts exactly the three states', () => {
  assert.equal(isThemePreference('light'), true);
  assert.equal(isThemePreference('dark'), true);
  assert.equal(isThemePreference('system'), true);
  assert.equal(isThemePreference('Dark'), false);
  assert.equal(isThemePreference(''), false);
  assert.equal(isThemePreference(null), false);
  assert.equal(isThemePreference(undefined), false);
  assert.equal(isThemePreference(0), false);
});

test('readPreference normalises anything unrecognised to system', () => {
  assert.equal(readPreference('light'), 'light');
  assert.equal(readPreference('dark'), 'dark');
  assert.equal(readPreference('system'), 'system');
  // A corrupt or hand-edited value must degrade to the default, not throw.
  assert.equal(readPreference('aubergine'), 'system');
  assert.equal(readPreference(null), 'system');
  assert.equal(readPreference(undefined), 'system');
});

test('resolveTheme lets an explicit choice beat the OS in both directions', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('resolveTheme follows the OS when no choice has been made', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('resolveTheme treats a corrupt stored value as system, and never throws', () => {
  assert.equal(resolveTheme('aubergine', true), 'dark');
  assert.equal(resolveTheme('aubergine', false), 'light');
  assert.equal(resolveTheme(42, false), 'light');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/lib/theme.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/theme.ts`:

```ts
/* Theme preference logic, kept free of the DOM so it can be unit-tested
   under `node --test` alongside src/lib/links.ts. The DOM work lives in
   ThemeToggle.astro and in Base.astro's pre-paint script. */

/** The localStorage key. Repeated as a literal in Base.astro's inline
    script, which runs before the bundle exists and so cannot import this. */
export const THEME_STORAGE_KEY = 'theme';

/** What the reader has asked for. `system` is the default and stays
    reachable, which is why there are three of these and not two: a
    two-state toggle can never hand control back to the OS. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What actually gets painted. */
export type Appearance = 'light' | 'dark';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value);
}

/** Anything unrecognised — absent, corrupt, hand-edited — is `system`.
    Storage is user-writable, so this must never throw. */
export function readPreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : 'system';
}

export function resolveTheme(stored: unknown, systemPrefersDark: boolean): Appearance {
  const preference = readPreference(stored);
  if (preference !== 'system') return preference;
  return systemPrefersDark ? 'dark' : 'light';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 19 tests (13 existing + 6 new)

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts tests/theme.test.ts
git commit -m "feat: add theme preference logic

Three states, with system as the default and always reachable. Anything
unrecognised in storage resolves to system rather than throwing, since
localStorage is user-writable."
```

---

### Task 2: CSS restructure and the token-parity guard

**Files:**
- Modify: `src/styles/global.css:62-82` (token block), `:244` (`.halftone`), `:265` (`.riso-photo::after`), and the `:root` block at `:11`
- Modify: `tests/theme.test.ts` (append)

**Interfaces:**
- Consumes: nothing from Task 1 at runtime; the test file created there is appended to.
- Produces: the `[data-theme]` contract every later task depends on — `data-theme="dark"` forces dark, `data-theme="light"` forces light, absent follows the OS.

- [ ] **Step 1: Write the failing test**

Append to `tests/theme.test.ts`. The `readFileSync` import belongs at the top of the file with the others — ESM hoists imports, but a reader should not have to know that:

```ts
// Add to the imports at the top of the file:
import { readFileSync } from 'node:fs';

// Add at the bottom of the file:
const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

/** Pull the custom-property declarations out of the rule that starts at
    `selector`. Assumes no nested braces inside the block, which holds for
    both token blocks. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `selector not found in global.css: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])
  );
}

test('the two dark token blocks declare identical values', () => {
  // The dark palette is written twice — once behind the media query, once
  // behind the attribute — because light-dark() cannot carry the
  // mix-blend-mode flips further down the file, and one mechanism beats two.
  // This is the guard that makes that duplication safe.
  const viaMedia = tokensIn(":root:not([data-theme='light'])");
  const viaAttribute = tokensIn(":root[data-theme='dark']");

  assert.ok(Object.keys(viaMedia).length > 0, 'media-query dark block declared no tokens');
  assert.deepEqual(viaAttribute, viaMedia);
});

test('both blend-mode flips are duplicated for the attribute state', () => {
  // Same duplication, same reason. A forced dark appearance must flip the
  // halftone to `screen` or the print sits inverted on the dark ground.
  for (const target of ['.halftone', '.riso-photo::after']) {
    assert.match(
      css,
      new RegExp(`:root\\[data-theme='dark'\\]\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*mix-blend-mode:\\s*screen`),
      `no attribute-state blend flip for ${target}`
    );
    assert.match(
      css,
      new RegExp(`:root:not\\(\\[data-theme='light'\\]\\)\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      `media-query blend flip for ${target} is not guarded against an explicit light choice`
    );
  }
});

test('color-scheme is declared for all three states', () => {
  assert.match(css, /:root\s*\{[^}]*color-scheme:\s*light dark/);
  assert.match(css, /:root\[data-theme='light'\]\s*\{[^}]*color-scheme:\s*light\s*;/);
  assert.match(css, /:root\[data-theme='dark'\]\s*\{[^}]*color-scheme:\s*dark\s*;/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `selector not found in global.css: :root:not([data-theme='light'])`

- [ ] **Step 3: Add `color-scheme` to the light `:root` block**

In `src/styles/global.css`, inside the existing `:root {` block that opens at line 11, add one line immediately after `--margin:   96px;`:

```css
  /* Drives form controls, scrollbars, and the canvas. Overridden per state
     below so they follow an explicit choice, not just the OS. */
  color-scheme: light dark;
```

- [ ] **Step 4: Replace the dark token block**

Replace lines 62-82 of `src/styles/global.css` — the comment plus the whole `@media (prefers-color-scheme: dark) { :root { … } }` — with:

```css
/* Riso — dark appearance (project's `riso.dark` palette). Declared twice on
   purpose: once behind the media query, for a reader who has expressed no
   preference for this site, and once behind [data-theme='dark'] for one who
   has. The `:not([data-theme='light'])` guard is what lets an explicit light
   choice beat an OS that says dark.

   light-dark() would collapse these into one block, but it cannot carry the
   mix-blend-mode flips further down this file — so it would leave two
   mechanisms in play for one idea. One obvious mechanism is worth the
   duplication; tests/theme.test.ts asserts the two blocks never drift. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --color-paper:          #191712;
    --color-surface:        #1E1C18;
    --color-surface-raised: #29261F;
    --color-hairline:       #39352C;
    --color-ink:            #EDE8DC;
    --color-ink-secondary:  #A8A18E;
    --color-brand:          #F06AA6;
    --color-brand-bright:   #F582B5;
    --color-brand-strong:       #F06AA6;
    --color-brand-strong-hover: #F582B5;
    --color-teal:           #63CCAF;
    --color-teal-ink:       #63CCAF;
    --color-positive:       #9DBB7F;
    --color-warning:        #E0A33E;
    --color-error:          #E86254;
  }
}

:root[data-theme='dark'] {
  --color-paper:          #191712;
  --color-surface:        #1E1C18;
  --color-surface-raised: #29261F;
  --color-hairline:       #39352C;
  --color-ink:            #EDE8DC;
  --color-ink-secondary:  #A8A18E;
  --color-brand:          #F06AA6;
  --color-brand-bright:   #F582B5;
  --color-brand-strong:       #F06AA6;
  --color-brand-strong-hover: #F582B5;
  --color-teal:           #63CCAF;
  --color-teal-ink:       #63CCAF;
  --color-positive:       #9DBB7F;
  --color-warning:        #E0A33E;
  --color-error:          #E86254;
}

:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']  { color-scheme: dark; }
```

Note the `/* 9.2:1 on the dark ground already */` comment that followed `--color-teal-ink` has been dropped from both copies rather than duplicated — the parity test compares values, and a comment in one copy only would be a needless difference for a reader to puzzle over.

- [ ] **Step 5: Duplicate the two blend-mode flips**

Replace line 244:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) .halftone { mix-blend-mode: screen; } }
:root[data-theme='dark'] .halftone { mix-blend-mode: screen; }
```

Replace line 265:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) .riso-photo::after { mix-blend-mode: screen; } }
:root[data-theme='dark'] .riso-photo::after { mix-blend-mode: screen; }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 22 tests

- [ ] **Step 7: Verify nothing rendered changed yet**

Run: `npm run build`
Expected: `[build] Complete!` — no page sets `data-theme` yet, so both appearances must look exactly as before.

- [ ] **Step 8: Commit**

```bash
git add src/styles/global.css tests/theme.test.ts
git commit -m "feat: make the dark palette reachable by explicit choice

Each dark rule gains an attribute-selector twin guarded by
:not([data-theme='light']), so a forced light appearance beats an OS
that says dark. Nothing renders differently yet — no page sets the
attribute until the toggle lands.

The duplication is deliberate: light-dark() would remove it but cannot
carry mix-blend-mode, leaving two mechanisms for one idea. A test
parses global.css and asserts the two dark blocks never drift."
```

---

### Task 3: Pre-paint script and `theme-color`

**Files:**
- Modify: `src/layouts/Base.astro:25-27` (the three meta tags) and `<head>`
- Modify: `tests/theme.test.ts` (append)

**Interfaces:**
- Consumes: the `[data-theme]` contract from Task 2; `THEME_STORAGE_KEY` from Task 1 (as a repeated literal, not an import).
- Produces: `data-theme` set on `<html>` before first paint, and one `<meta name="theme-color">` whose content matches the resolved appearance.

- [ ] **Step 1: Write the failing test**

Append to `tests/theme.test.ts`:

```ts
const baseLayout = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');

test('the pre-paint script reads the same storage key the module exports', () => {
  // Base.astro runs before the bundle exists, so it cannot import
  // THEME_STORAGE_KEY and repeats the literal instead. This is the seam
  // where the two could silently drift apart.
  const match = baseLayout.match(/localStorage\.getItem\(\s*['"]([^'"]+)['"]\s*\)/);
  assert.ok(match, 'Base.astro does not read localStorage in its inline script');
  assert.equal(match[1], THEME_STORAGE_KEY);
});

test('the pre-paint script is inline, so it runs before first paint', () => {
  // A bundled or deferred script runs after paint, which is exactly the
  // flash of the wrong appearance this exists to prevent.
  assert.match(baseLayout, /<script is:inline>/);
});

test('theme-color is a single unconditional tag, not media-scoped', () => {
  // Two media-scoped tags cannot follow an explicit override — the browser
  // chrome would sit light above a dark page.
  const tags = baseLayout.match(/<meta name="theme-color"[^>]*>/g) ?? [];
  assert.equal(tags.length, 1);
  assert.doesNotMatch(tags[0], /media=/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Base.astro does not read localStorage in its inline script`

- [ ] **Step 3: Replace the meta tags and add the script**

In `src/layouts/Base.astro`, replace lines 25-27:

```astro
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F6F1E6" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#191712" />
```

with:

```astro
    {/* One unconditional tag, corrected by the inline script below. The two
        media-scoped tags this replaces could not follow an explicit choice —
        a reader forcing dark on a light OS got light browser chrome above a
        dark page. `color-scheme` now lives in global.css, declared per
        state, for the same reason. */}
    <meta name="theme-color" content="#F6F1E6" />

    {/* Runs before first paint, which is why it is inline and unbundled: a
        module script runs after paint and the flash of the wrong appearance
        is the whole thing we are avoiding. It only *applies* a stored value
        — all the logic lives in src/lib/theme.ts, which the interactive
        control imports. The storage key is repeated here because this runs
        before the bundle exists; tests/theme.test.ts pins the two together.
        localStorage throws in some privacy modes, so a failure here must
        leave the site rendering in the system appearance, not blank. */}
    <script is:inline>
      (function () {
        var stored = null;
        try { stored = localStorage.getItem('theme'); } catch (e) {}
        if (stored === 'light' || stored === 'dark') {
          document.documentElement.dataset.theme = stored;
        }
        var dark = stored === 'dark'
          || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#191712' : '#F6F1E6');
      })();
    </script>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 25 tests

- [ ] **Step 5: Verify the attribute lands before paint**

Run: `npm run build`
Expected: `[build] Complete!`

Then check the built markup:

```bash
grep -c 'localStorage.getItem' dist/index.html
```

Expected: `1` — the script survived into the output un-bundled.

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Base.astro tests/theme.test.ts
git commit -m "feat: apply a stored theme before first paint

Sets data-theme from localStorage in an inline head script, and folds
the two media-scoped theme-color tags into one the script corrects.
Media-scoped tags cannot follow an explicit override, so a reader
forcing dark on a light OS got light browser chrome over a dark page."
```

---

### Task 4: The control

**Files:**
- Create: `src/components/ThemeToggle.astro`

**Interfaces:**
- Consumes: `THEME_STORAGE_KEY` and `readPreference` from `src/lib/theme.ts` (Task 1); the `[data-theme]` contract from Task 2.
- Produces: `<ThemeToggle />`, taking no props. Renders a `<fieldset class="theme-toggle">` that is `hidden` until its script unhides it. Task 5 mounts it.

- [ ] **Step 1: Create the component**

Create `src/components/ThemeToggle.astro`:

```astro
---
/* Three radios, not a two-state switch: `system` has to stay reachable, or
   a reader who once tapped the toggle can never hand control back to their
   OS. Native radios bring keyboard support, grouping, and screen-reader
   semantics with no focus management to write.

   Rendered hidden and unhidden by the script below, so a reader without
   JavaScript is never shown a control that cannot do anything. */
---
<fieldset class="theme-toggle" hidden>
  <legend class="sr-only">Theme</legend>
  <label><input type="radio" name="theme" value="light" /><span>Light</span></label>
  <label><input type="radio" name="theme" value="dark" /><span>Dark</span></label>
  <label><input type="radio" name="theme" value="system" /><span>Auto</span></label>
</fieldset>

<script>
  import { THEME_STORAGE_KEY, readPreference } from '../lib/theme';

  const root = document.documentElement;
  const group = document.querySelector<HTMLFieldSetElement>('.theme-toggle');

  /* The meta tag is corrected on every change, and — in the `system` state —
     whenever the OS itself flips, so the browser chrome never disagrees
     with the page. */
  function syncThemeColor() {
    const dark =
      root.dataset.theme === 'dark' ||
      (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#191712' : '#F6F1E6');
  }

  if (group) {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* Private mode. Fall through to `system`, which is the default. */
    }

    const current = readPreference(stored);
    const checked = group.querySelector<HTMLInputElement>(`input[value="${current}"]`);
    if (checked) checked.checked = true;
    group.hidden = false;

    group.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.name !== 'theme') return;
      const next = readPreference(input.value);

      try {
        if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
        else localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* Preference will not survive the page, but the page still flips. */
      }

      if (next === 'system') delete root.dataset.theme;
      else root.dataset.theme = next;
      syncThemeColor();
    });
  }

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', syncThemeColor);
</script>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .theme-toggle label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-ink-secondary);
    cursor: pointer;
  }
  /* The radio itself is hidden, but focusable — the ring lands on the label
     via :focus-within, so keyboard users still see where they are. */
  .theme-toggle input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
  .theme-toggle label:hover { color: var(--color-ink); }
  .theme-toggle label:focus-within {
    outline: 2px solid var(--color-brand);
    outline-offset: 3px;
  }
  .theme-toggle input:checked + span {
    color: var(--color-brand-strong);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: `[build] Complete!` — the component is unmounted so far, so nothing renders yet; this only proves it type-checks and bundles.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.astro
git commit -m "feat: add the theme control

Three radios rather than a switch, because system has to stay
reachable. Hidden until its script unhides it, so a reader without
JavaScript never sees a dead control."
```

---

### Task 5: Mount the control in both frames

**Files:**
- Modify: `src/components/Rail.astro` (import, and a new group before `.colophon`)
- Modify: `src/pages/writing/[...id].astro` (import, and the `.article__meta` row)
- Modify: `src/pages/apps/[id].astro` (import, and a row around the back link)
- Modify: `src/pages/404.astro` (import, and after `.paths`)

**Interfaces:**
- Consumes: `<ThemeToggle />` from Task 4.
- Produces: the control on every page. Seven pages get it via the Rail; three get it directly.

- [ ] **Step 1: Mount in the Rail**

In `src/components/Rail.astro`, add to the frontmatter imports:

```astro
import ThemeToggle from './ThemeToggle.astro';
```

Then insert immediately before `<div class="colophon">`:

```astro
  <div class="theme-group rail-group">
    <div class="rail-group__title label">Appearance</div>
    <ThemeToggle />
  </div>
```

- [ ] **Step 2: Mount on article pages**

In `src/pages/writing/[...id].astro`, add to the frontmatter imports:

```astro
import ThemeToggle from '../../components/ThemeToggle.astro';
```

Then add the control as the last child of the existing `.article__meta` div, after the second `<span class="label">`:

```astro
    <div class="article__meta">
      <span class="label">{fmt.toUpperCase()}</span>
      <span class="sep" aria-hidden="true">/</span>
      <span class="label">{isLink(post.data) ? sourceDomain(post.data.sourceUrl) : post.data.readingTime}</span>
      <ThemeToggle />
    </div>
```

The row is already `display: flex; align-items: center; gap: 8px`, so the control needs no new layout. Push it to the right by adding one declaration to the existing `.article__meta` rule in that file's `<style>` block:

```css
  .article__meta > :global(.theme-toggle) { margin-left: auto; }
```

- [ ] **Step 3: Mount on app pages**

In `src/pages/apps/[id].astro`, add to the frontmatter imports:

```astro
import ThemeToggle from '../../components/ThemeToggle.astro';
```

Then replace the bare back link:

```astro
    <a class="app-page__back" href="/">&larr; Alex Holley</a>
```

with a row holding both:

```astro
    <div class="app-page__topbar">
      <a class="app-page__back" href="/">&larr; Alex Holley</a>
      <ThemeToggle />
    </div>
```

and add to that file's `<style>` block:

```css
  .app-page__topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
```

- [ ] **Step 4: Mount on the 404 page**

In `src/pages/404.astro`, add to the frontmatter imports:

```astro
import ThemeToggle from '../components/ThemeToggle.astro';
```

Then insert immediately after the closing `</nav>` of `.paths`:

```astro
    <ThemeToggle />
```

- [ ] **Step 5: Verify every page has exactly one control**

Run: `npm run build`
Expected: `[build] Complete!`

Then:

```bash
find dist -name '*.html' | while read -r f; do
  n=$(grep -c 'class="theme-toggle' "$f")
  [ "$n" = "1" ] || echo "WRONG ($n): $f"
done; echo "check complete"
```

Expected: `check complete` with no `WRONG` lines above it. A `0` means a page was missed; a `2` means two controls share one radio group name on one page, which would break the checked state.

- [ ] **Step 6: Verify behaviour in the browser**

Run the dev server and check, in order:

1. All three states against an OS set to dark, then to light — six combinations.
2. Reload in a forced state with the network throttled: no flash of the wrong appearance.
3. `localStorage` disabled: the site renders in the system appearance and the control stays hidden.
4. Tab to the control: the focus ring is visible on the label, and arrow keys move between options.

- [ ] **Step 7: Commit**

```bash
git add src/components/Rail.astro src/pages/writing/\[...id\].astro src/pages/apps/\[id\].astro src/pages/404.astro
git commit -m "feat: mount the theme control on every page

The Rail covers seven pages; /writing/[id], /apps/[id] and 404 have no
Rail and get it directly, in rows that already exist. Article pages
especially — that is where most readers land, since the audience
arrives by link."
```

---

### Task 6: Document the dark ramp

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: the token values from Task 2.
- Produces: nothing code depends on. This closes the gap that makes the design tooling report the site's own dark tokens as palette drift.

- [ ] **Step 1: Add the dark ramp to the frontmatter**

In `DESIGN.md`, immediately after the existing `colors:` block, add a sibling key with the values from `global.css`:

```yaml
colorsDark:
  paper: "#191712"
  surface: "#1E1C18"
  surface-raised: "#29261F"
  hairline: "#39352C"
  ink: "#EDE8DC"
  ink-secondary: "#A8A18E"
  brand: "#F06AA6"
  brand-bright: "#F582B5"
  brand-strong: "#F06AA6"
  brand-strong-hover: "#F582B5"
  teal: "#63CCAF"
  teal-ink: "#63CCAF"
  positive: "#9DBB7F"
  warning: "#E0A33E"
  error: "#E86254"
```

- [ ] **Step 2: Add `--color-brand-on-ink` to both ramps**

The inverted band in the forthcoming feature format sits on a `--color-ink` ground, which flips with the scheme — so its accent has to run opposite the page. Measured at 2.3:1 without it. Add to `colors:`:

```yaml
  brand-on-ink: "#F06AA6"
```

and to `colorsDark:`:

```yaml
  brand-on-ink: "#B82E70"
```

Then add the token to `global.css`, in the light `:root` block:

```css
  /* The one accent that runs OPPOSITE the page. A full-bleed band's ground
     is --color-ink, so it inverts with the scheme: a light page gives a
     dark band, which needs the light pink. 5.66:1 light, 4.69:1 dark. */
  --color-brand-on-ink:   #F06AA6;
```

and to **both** dark token blocks (the media-query one and the attribute one — the parity test enforces this):

```css
  --color-brand-on-ink:   #B82E70;
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS — 25 tests. The token-parity test now compares 16 properties per block; if you added the token to only one dark block, this fails with a `deepEqual` diff naming `--color-brand-on-ink`.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md src/styles/global.css
git commit -m "docs: document the dark ramp, and add --color-brand-on-ink

DESIGN.md described only the light palette, which is why the design
tooling reported the site's own dark tokens as drift.

brand-on-ink is the one accent that runs opposite the page: a band's
ground is --color-ink, so it inverts with the scheme. 5.66:1 light,
4.69:1 dark."
```

---

### Task 7: Re-snapshot the parity baseline

**Files:**
- Modify: `.baseline/**` (regenerated)

**Interfaces:**
- Consumes: the finished feature.
- Produces: a baseline that matches the shipped site, so `verify-parity.sh` is meaningful again.

This is a separate task, and a separate commit, so the feature diff and the baseline diff stay readable. `.baseline/` is gitignored, so this commit may be empty of tracked changes — that is expected; the point is the reviewed diff, not the commit.

- [ ] **Step 1: Look at what changed**

Run: `./scripts/verify-parity.sh`

Expected: a `ROUTE SET CHANGED` block plus `CHANGED:` lines for every page.

- [ ] **Step 2: Confirm every change is accounted for**

Two categories are expected, and **nothing else**:

1. **Route set** — `writing/blonde-turns-10`, `writing/let-a-website-be-a-worry-stone` and `writing/this-isn-t-a-teaser` are new since the baseline was taken. Pre-existing staleness, not this work.
2. **Per page** — the inline `<script>` in `<head>`, the single `theme-color` meta replacing two, and one `fieldset.theme-toggle`.

Read the diff. If a line falls outside those two categories, stop and investigate — that is a real regression, and re-snapshotting would bury it.

- [ ] **Step 3: Re-snapshot**

Run: `./scripts/snapshot-baseline.sh`
Expected: `Baseline captured: N pages`

- [ ] **Step 4: Verify the gate is green**

Run: `./scripts/verify-parity.sh`
Expected: `PARITY OK — all pages match baseline`

- [ ] **Step 5: Commit**

```bash
git commit --allow-empty -m "chore: re-snapshot the parity baseline

The theme toggle changes markup on every page by design — an inline
head script, one theme-color meta in place of two, and the control
itself. Each diff was read before snapshotting.

Also clears pre-existing staleness: the baseline held six writing posts
against the repo's eight."
```

---

## Verification

The whole feature is done when:

- `npm test` passes — 25 tests.
- `npm run build` completes.
- `./scripts/verify-parity.sh` prints `PARITY OK`.
- Every built page contains exactly one `class="theme-toggle"`.
- All six state/OS combinations render correctly, with no flash on reload.
- With `localStorage` disabled, the site renders in the system appearance and the control is hidden.
