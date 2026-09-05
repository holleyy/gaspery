# Rail masthead — design

**Date:** 2026-09-05
**Status:** approved, not yet implemented

## Problem

The homepage carries two mastheads. The rail says "Alex Holley" with an "A"
plate; the main column opens with a 56px "Gaspery." wordmark and an intro
sentence. A first-time visitor has to work out how the two relate. Every other
page already runs on the rail alone, and works.

Meanwhile the company is Gaspery Limited, the apps ship under Gaspery, and the
letterhead carries the Gaspery wordmark. The site's identity has drifted toward
the imprint; the rail hasn't followed.

## Decision

Remove the homepage Hero. The rail becomes the only masthead, on every page,
and it says **Gaspery.** The rail is the mockup's option B: a display-size
wordmark at Regular weight with the magenta misregistration ghost, the plate
kept above it as a "G", and the teal halftone dots moved from the Hero into the
rail's identity block. Alex's name moves to the colophon.

Mockups: `.superpowers/brainstorm/98812-1788633604/content/rail-identity-v2.html`
(option B).

## Non-goals

- No toggle between the old and new rail. Option A (24px / 700 / no ghost) is
  three CSS values away from B; a switch would only let the two drift.
- No change to the Hero component itself. The 404 still uses it, with its
  eyebrow as the diagnosis line, and keeps its own halftone.
- No change to the palette, the plate's construction, the nav, Elsewhere, the
  Pulse, or the theme toggle.
- No new Keystatic fields. The rail's name, role, and monogram were never
  editable and stay that way.
- The static OG card at `public/og/card.png` is unchanged.
- The About and Company pages keep their prose about Alex as-is.

## The rail identity block

### Markup (`src/components/Rail.astro`)

```html
<a class="identity" href="/" aria-label="Gaspery, home">
  <div class="halftone" aria-hidden="true"></div>
  <div class="monogram">
    <div class="monogram__ghost"></div>
    <div class="monogram__ink">G</div>
  </div>
  <div>
    <div class="rail-wordmark">
      <div class="rail-wordmark__ghost" aria-hidden="true">Gaspery.</div>
      <div class="rail-wordmark__ink">Gaspery.</div>
    </div>
    <div class="label">Words, design, tools & links</div>
  </div>
</a>
```

The `name`, `role`, and `monogram` props stay on `Rail` but gain defaults
(`"Gaspery."`, `"Words, design, tools & links"`, `"G"`). All seven call sites
currently pass the same three values; they drop them and pass only `current`.

### Wordmark

A **new class**, `.rail-wordmark`, not a restyle of `.wordmark`.
`AppPageHeader.astro` reuses `.identity`, `.monogram`, and `.wordmark` for the
app page headers and must keep rendering exactly as today.

| Property        | Desktop                     | Collapsed (≤1000px) |
| --------------- | --------------------------- | ------------------- |
| font            | Merriweather                | same                |
| weight          | 400                         | same                |
| size            | 38px                        | 32px                |
| line-height     | 1.1                         | same                |
| letter-spacing  | −0.01em                     | same                |
| ghost offset    | translate(2px, 2px)         | same                |
| ghost colour    | `--color-brand`             | same                |
| ghost blend     | multiply; `screen` in dark  | same                |

The ghost is the same two-copies construction as `.hero-title`: ink copy on
top, ghost absolutely positioned behind it, `aria-hidden`, `pointer-events:
none`. The offset is 2px rather than the hero's 3px because at weight 400 a 3px
shift is wider than the stroke and reads as an outline, not misregistration.

The dark-mode `screen` flip is written twice, under both the media-query and
the attribute guard, exactly like `.halftone`. `tests/theme.test.ts` has a
list of selectors whose blend flip must be duplicated; `.rail-wordmark__ghost`
joins that list.

Hover: `.identity:hover .rail-wordmark__ink` goes `--color-brand-bright`, the
same as today's `.wordmark` hover. The ghost does not change on hover.

Accessibility gate (`prefers-reduced-transparency`, `prefers-contrast: more`):
the ghost is hidden, alongside `.hero-title .ghost` and `.halftone` in the
existing rule.

### Plate

Unchanged in construction. The letter becomes "G". Weight stays 900, size 46px.

### Dots

The `.halftone` element moves from `Hero.astro` into the rail's `.identity`
(which becomes `position: relative`). The global `.halftone` recipe, the blend
flips, and the accessibility gate all stay where they are; only the placement
rule changes:

| Property | Desktop            | Collapsed (≤1000px)                       |
| -------- | ------------------ | ----------------------------------------- |
| size     | 170 × 120px        | 150 × 120px (existing mobile rule)        |
| top      | −58px              | −36px                                     |
| right    | −48px              | −24px (sits at the viewport edge; the page has 24px side padding, so no horizontal scroll) |
| z-index  | 0 (behind the plate and wordmark, which get `z-index: 1`) | same |

Because `Hero.astro` keeps its own `.halftone` for the 404, the placement rule
is scoped: `.identity .halftone { … }` for the rail, and the existing `.hero
.halftone` values stay for the Hero. The unscoped `.halftone` rule loses its
position values and keeps only the recipe. The same applies to the collapsed
breakpoint: today's unscoped mobile override (`150 × 120px, top: −8px`) becomes
`.hero .halftone`, and the rail gets its own `.identity .halftone` override
with the values in the table above.

### Colophon

Two label lines replace the one:

```html
<div class="label">Alex Holley</div>
<div class="label">© MMXXVI · London</div>
```

The comment above the sign-off currently says the company is never stated twice
on one screen. That rule survives in narrower form and the comment is rewritten
to say so: the **legal** name is stated once, in `<Imprint />`; the wordmark is
the brand mark, not the legal name, and may appear with it.

## The homepage (`src/pages/index.astro`)

- Remove the `Hero` import and element. `main` opens directly with `.streams`.
- Remove the `hero` object from `src/data/home/index.json` and the matching
  `hero` field group from the `home` singleton in `keystatic.config.ts`. Nothing
  else reads it. (`home` is a plain JSON import, not a content collection, so
  there is no Zod schema to keep in step.)
- In the collapsed-layout `order` list in `global.css`, the `.hero { order: 3 }`
  line goes; the other orders keep their numbers.

The intro sentence is retired. The `og:description` and RSS description already
use a separate string ("Product, design & small software. A working notebook.")
and are unaffected.

## The rename elsewhere

The rail is now the site's name, so the rest of the chrome follows it. Prose
about the person (About, Company) does not.

| Where                                     | From                              | To                            |
| ----------------------------------------- | --------------------------------- | ----------------------------- |
| `index.astro` title, `Base.astro` RSS autodiscovery title, `rss.xml.js` title | `Alex Holley · a working notebook` | `Gaspery · a working notebook` |
| Every other page's `<title>` suffix       | `· Alex Holley`                   | `· Gaspery`                   |
| Back links in `writing/[...id].astro`, `apps/[id].astro`, `FeatureArticle.astro` | `← Alex Holley`         | `← Gaspery`                   |
| Rail `aria-label`                         | `Alex Holley, home`               | `Gaspery, home`               |

`og:site_name` is already "Gaspery".

## Verification

1. `npm test` passes, including the extended blend-flip test.
2. `npm run build` succeeds (the Cloudflare build runs the same command).
3. Dev server, homepage, desktop width, both themes: the rail shows plate,
   wordmark with visible 2px magenta ghost, tagline, and dots bleeding off the
   top-right; no Hero; Writing starts at the top of the main column. Measure
   the ghost element's box, not just its colour: it must have a non-zero size
   and sit 2px down-right of the ink copy.
4. Collapsed width (375px): identity on top with dots at the corner, no
   horizontal scroll (`document.documentElement.scrollWidth` equals the
   viewport width).
5. `/apps/grod`: the app page header is pixel-identical to before.
6. `/404`: Hero and its dots unchanged.
7. Forced `data-theme="dark"` with OS in light mode: the ghost and dots are
   on `screen`, not `multiply`.
8. `/keystatic` → Homepage: only "Now summary" remains.
9. Page titles and back links read "Gaspery".

## Sequencing

One branch, one PR. The rail change, the Hero removal, and the rename are
each small but they only make sense together; landing the rename without the
new rail would leave two "Gaspery." mastheads on the homepage.
