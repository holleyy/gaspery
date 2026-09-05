# Manual theme toggle — design

**Date:** 2026-09-05
**Status:** approved, not yet implemented

## Problem

The site's dark palette exists only inside `@media (prefers-color-scheme: dark)`
in `src/styles/global.css`. A reader whose OS sits in dark mode can never see the
light version, and vice versa — there is no way to express a preference for *this
site* that differs from the one their operating system expresses for everything.

That is a real editorial loss here, because the two appearances are not the same
design wearing different colours. The light appearance is the one the theme was
drawn for: bone paper, two spot inks, misregistration. The dark appearance is an
adaptation. The author works in dark mode and therefore rarely sees the version
he prefers.

A second, quieter problem: because the dark palette is reachable only through a
media query, it has never been documented. `DESIGN.md` describes the light
palette alone, which is why the design tooling reports the site's own dark tokens
as palette drift.

## Non-goals

- No change to either palette. Both appearances keep exactly the colours they
  have today. This is a control and a plumbing change, not a redesign.
- No per-page or per-post theme. One preference, site-wide.
- No server-side persistence, cookie, or account. The preference is local to the
  browser.
- Not the feature-post format. That is a separate spec, sequenced after this one.

## Behaviour

Three states, not two:

| State    | Meaning                                                    |
| -------- | ---------------------------------------------------------- |
| `system` | Follow `prefers-color-scheme`. **Default.**                |
| `light`  | Force the light appearance regardless of OS.               |
| `dark`   | Force the dark appearance regardless of OS.                |

`system` must be the default and must remain reachable. A first-time visitor gets
the appearance their OS already asked for; choosing `light` or `dark` overrides
it; choosing `system` hands control back. A two-state toggle cannot express that
last transition — once touched it can never return to following the OS — which is
why three states rather than two.

The choice persists in `localStorage` and applies on the next page load without a
flash of the wrong appearance.

## Architecture

### The resolution chain

```
localStorage['theme']  ──▶  inline <script> in <head>  ──▶  <html data-theme="…">  ──▶  CSS
   'light' | 'dark'                                          (absent when 'system')
   | absent
```

The attribute is the single source of truth for CSS. It is **absent** in the
`system` state so that the bare media query governs, and present only when the
reader has overridden.

### CSS restructure — `src/styles/global.css`

Three blocks change. Each dark rule gains an attribute-selector twin:

```css
:root { /* light tokens — unchanged */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* dark tokens — unchanged values */ }
}

:root[data-theme='dark'] { /* dark tokens — same values again */ }
```

The `:not([data-theme='light'])` guard is what lets an explicit light choice win
over an OS that says dark. The same shape applies to the two blend-mode rules at
lines 244 and 265, which flip `.halftone` and `.riso-photo::after` from
`multiply` to `screen`.

`color-scheme` moves from the `<meta>` tag into CSS, declared per state, so form
controls, scrollbars, and the canvas match the chosen appearance:

```css
:root { color-scheme: light dark; }
:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']  { color-scheme: dark; }
```

**Rejected: `light-dark()`.** It would express each token once instead of twice
and remove the duplication entirely. It cannot carry `mix-blend-mode`, though, so
the two blend rules would still need attribute selectors — leaving two different
mechanisms in one stylesheet for one concept. One obvious, greppable mechanism is
worth eighteen duplicated lines. The duplication is guarded by a test (below)
rather than by discipline.

### `theme-color`

`Base.astro` currently carries two media-scoped `theme-color` tags. Under an
explicit override they would disagree with the page — browser chrome painted
light above a dark page. They are replaced by one unconditional tag whose
`content` the inline script sets from the resolved appearance, which is correct
in all three states rather than two.

### Files

| File | Change |
| --- | --- |
| `src/lib/theme.ts` | **New.** Pure logic: the storage key, `resolveTheme()`, `nextTheme()`. No DOM access, so it is unit-testable under the existing runner. |
| `src/styles/global.css` | Three dark blocks gain attribute twins; `color-scheme` per state. |
| `src/layouts/Base.astro` | Inline pre-paint script; single `theme-color` tag. |
| `src/components/ThemeToggle.astro` | **New.** The control plus its behaviour script. |
| `src/components/Rail.astro` | Mounts `<ThemeToggle />`. |
| `src/pages/writing/[...id].astro` | Mounts `<ThemeToggle />` in the existing meta row. |
| `src/pages/apps/[id].astro` | Mounts `<ThemeToggle />` in its header. |
| `src/pages/404.astro` | Mounts `<ThemeToggle />`. |
| `tests/theme.test.ts` | **New.** Unit tests plus the token-parity test. |
| `DESIGN.md` | Documents the dark ramp, and adds `--color-brand-on-ink`. |

### Placement — one component, two mounts

Seven pages render `Rail.astro`; three do not (`/writing/[id]`, `/apps/[id]`,
`404`). Article pages are where most readers land, since the audience arrives by
link — so a Rail-only control would be missing from the site's most-visited
surface.

`ThemeToggle.astro` is therefore mounted in two frames: the Rail on Rail pages,
and the existing meta row on article and app pages — the row that already holds
the back link, the date, and the reading time. No new page chrome is introduced
anywhere; the control joins rows that already exist.

### The control

A `<fieldset>` with a visually-hidden legend and three radio inputs
(`Light` / `Dark` / `Auto`), styled to match the existing `.label` treatment —
11px, uppercase, letter-spaced. Native radios give keyboard navigation, grouping,
and screen-reader semantics for free, with no focus management to write.

The control is rendered `hidden` and unhidden by the inline script, so a reader
without JavaScript is never shown a dead input.

### The pre-paint script

`<script is:inline>` in `<head>`, deliberately minimal — it reads storage and
sets the attribute, nothing else:

```js
try {
  var t = localStorage.getItem('theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
```

It must be inline and unbundled, because a deferred or module script runs after
first paint and the flash is exactly what we are preventing. `localStorage`
throws in some privacy modes, so every access is wrapped — a throw must leave the
site rendering correctly in the `system` state, not blank.

The duplication between this script and `src/lib/theme.ts` is intentional and
bounded: the inline copy only *applies* a stored value, while the module holds
the logic the interactive control uses. The test suite pins the storage key so
the two cannot drift apart silently.

## Testing

The repo runs `node --test "tests/**/*.test.ts"` over pure modules in `src/lib`.
This design keeps its logic there so it fits that pattern.

1. **`resolveTheme()`** — every combination of stored value (`light`, `dark`,
   absent, and a corrupt value) against system preference dark/light. A corrupt
   stored value must resolve as `system`, never throw.
2. **`nextTheme()`** — cycles `system → light → dark → system`.
3. **Token parity.** Parse `global.css`, extract the declaration blocks for
   `:root:not([data-theme='light'])` and `:root[data-theme='dark']`, and assert
   they declare an identical set of properties with identical values. This is the
   guard that makes the accepted duplication safe: the two dark blocks cannot
   drift without a red test.
4. **Storage key** — asserted to be the exact literal the inline script uses.

Manual verification, since none of it is unit-testable:

- All three states, each against both OS settings — six combinations.
- No flash on reload in a forced state, with the network throttled.
- `localStorage` disabled: the site renders in the system appearance and the
  control stays hidden.

### The parity gate

`scripts/verify-parity.sh` diffs the built HTML against `.baseline/`. This change
alters markup on every page by design — a new inline script and a new control —
so the gate **will** report changes, and that is correct rather than a failure.

The procedure: run it first to see the diff, confirm every changed line is the
toggle and nothing else, then re-snapshot with `scripts/snapshot-baseline.sh`.

Note the baseline is already stale — it holds six writing posts against the
repo's eight, so the gate reports a route-set change before this work touches
anything. Re-snapshotting resolves that too, and should be a separate commit from
the feature so the two diffs stay readable.

## Risks

| Risk | Mitigation |
| --- | --- |
| The two dark token blocks drift apart. | The token-parity test fails the build. |
| Flash of wrong theme on load. | Inline, unbundled, in `<head>`, before paint. Verified throttled. |
| `localStorage` throws in private mode. | Every access wrapped; the failure mode is `system`, which is the default anyway. |
| The parity gate is re-snapshotted carelessly, hiding an unrelated regression. | Read the diff before snapshotting; snapshot in its own commit. |
| Dark tokens were never reviewed as a first-class palette. | `DESIGN.md` gains the dark ramp as part of this work. |

## Follow-ups, deliberately out of scope

- **`--color-brand-on-ink`.** The feature-post format needs an accent that runs
  opposite the page, because the inverted band's ground flips with the scheme.
  Measured at 2.3:1 without it. It belongs to the format spec, but it is recorded
  here because it is a token addition and this is the token work.
- **The feature-post format** — its own spec, next.
- **`this-isn-t-a-teaser.mdoc`** carries `readingTime: '1'` where every other post
  uses `'N min'`. Cosmetic; it renders as a bare "1".
