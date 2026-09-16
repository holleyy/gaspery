# /studio: the plate page — design

**Date:** 2026-09-16
**Status:** approved in conversation, not yet implemented

## Problem

The homepage is a working notebook: a rail, two streams, hairlines, a lot of
bone. That is right for readers. It is not a studio landing page. For the
audience that arrives wanting to know "what does Gaspery make", a one-screen
page in the manner of a design studio (big names, a category beside each, a
proof of the work on hover) says it faster than the notebook can.

The reference direction is the Vavo "bold" demo: one screen, the brand colour
as the whole ground, the work as a wrapping cloud of large names, a small
category after each, a tagline and links in the foot. Rendered in this site's
two inks it becomes the plate: the magenta ink as the page, the paper as the
type, the black ink layer slipping off register.

## Non-goals

- No change to any existing page, the rail, or the site-wide nav. `/studio` is
  reachable by URL only until a later decision links it. The rail's Index does
  not gain a "Studio" item in this piece of work.
- No app descriptions, status pills, deks, or "Now" panel on this page. Names,
  a category, a proof. That is all.
- No new palette. The plate is built from tokens that already exist.
- No change to the site-wide theme preference or its storage key. The studio
  switch is its own control with its own key (see Appearance).
- Not a replacement for the homepage. "Happy to go bold but may switch later"
  is the brief; the page is a sibling route, not a rewrite.

## The page

**Route.** `src/pages/studio.astro`, title `Studio · Gaspery`, description
"Small software, printed in two inks." Uses `Base.astro` with `mono` on, since
the category labels are set in IBM Plex Mono. No `Rail`. The page is a flex
column filling the viewport: top bar, the cloud centred in the remaining
height, the foot at the bottom. On short viewports it scrolls; nothing is
clipped.

**Top bar.** The wordmark at 28px in the rail's recipe (Merriweather 400, 2px
ghost), linking home. To the right, a horizontal nav in the rail's nav face
(Merriweather 700, 17px): Writing, Studio, About, Now. Studio carries
`aria-current="page"`. On the plate the current item is underlined in paper
rather than coloured, because there is no second ink to colour it with.

**The cloud.** One `<ul>`; one `<li>` per app from the `apps` collection in
`order`. Each item is the name followed by its category:

- The name is Merriweather 400 at `clamp(56px, 8.4vw, 120px)`, line-height 1,
  letter-spacing -0.025em, printed twice: a ghost underneath offset
  `0.035em` on both axes in the ghost ink, the ink copy on top. That is the
  rail wordmark's misregistration at display scale, and it is on at rest.
  Hover slides the ghost to `0.07em`; nothing else moves. The name is an `<a>`
  to the app's `url` when it has one, a `<span>` when it does not (Top
  Secret), in which case the ink copy prints in the secondary ink.
- The category is IBM Plex Mono 600, 12px, 0.14em tracking, uppercase, in the
  secondary ink, sitting on the name's baseline with a `0.14em` gap.
- Items wrap as inline content with `0.42em` between them horizontally and
  `0.12em` between lines, capped at 1120px wide so four names make two lines
  at 1440.

**Category.** Derived, not stored. `src/lib/studio.ts` exports
`categoryFor(app)`: if `status` is `planning`, "Soon"; otherwise the segment of
`meta` before the first middot, with `macOS` rewritten to "Mac" and `iOS` left
as is; any other segment passes through unchanged. Unit-tested.

**The proof.** A 400px card at 3:2 that follows the cursor (28px to its
right, vertically centred, clamped inside the viewport, with a short lag so it
trails rather than snaps), sitting on a second card offset 8px in the plate
ink. It appears on `pointerenter` of an item and goes on `pointerleave`;
`pointerType === 'touch'` is ignored, so a phone never shows it and a tap
simply follows the link. It is `aria-hidden` and `pointer-events: none`.

Its content, per app:

| App has         | Card shows                                                     |
| --------------- | -------------------------------------------------------------- |
| a `proof` image | the image, `object-fit: cover`, anchored top-left               |
| no proof, `status` ≠ `planning` | "Proof pending": the name in Merriweather 400 at 40px over a mono "Proof pending" label, on paper |
| no proof, `status` = `planning` | "Redacted": a run of block characters over a mono "Redacted" label, on paper |

The pending and redacted cards are markup and CSS, not images. There is
nothing to upload for them.

**`proof` field.** A new optional field on `apps`, in both schemas, so that
one being optional and the other required cannot freeze a Cloudflare build:

- Keystatic: `fields.image({ label: 'Proof', directory: 'public/shots',
  publicPath: '/shots/' })`, so an upload lands where Astro can serve it and
  the YAML holds an absolute `/shots/...` path.
- Zod: `proof: z.string().optional()`.
- `grod.yaml` gets `proof: /shots/grod/briefing.webp` by hand; the file is
  already there. The other three start without one and show the fallback
  cards. Aftershot's icon card from the prototype is dropped: the rule is
  "proof or fallback", with no third case to remember.

**The foot.** A hairline, then two columns. Left: the tagline "Small
software, printed in two inks." in Merriweather 400 at 17px, and under it the
Elsewhere links from `src/data/sidebar/index.json` as a wrapping row of 14px
sans links. Right, bottom-aligned: the label "Alex Holley · © MMXXVI ·
London", matching the rail colophon.

**Below 1000px.** Page padding drops to the mobile values. The cloud becomes
a single column with `0.3em` between names at `clamp(40px, 11vw, 64px)`. The
foot stacks. The proof never appears (touch), and at these widths the floating
card is `display: none` regardless of pointer.

## Appearance: the three-dot switch

The page has three appearances and one control with three dots, in the top
bar between the wordmark and the nav on desktop, and on its own row under the
nav on mobile.

| State   | Dot     | Ground                       | Type              | Ghost ink            |
| ------- | ------- | ---------------------------- | ----------------- | -------------------- |
| `plate` | magenta | `--color-brand-strong` #B82E70 | paper #F6F1E6     | ink #232019, multiply |
| `light` | paper   | the site's light palette     | the site's light  | brand, multiply      |
| `dark`  | ink     | the site's dark palette      | the site's dark   | brand, screen        |

**Default is `plate`.** This is the one place the site chooses a mode for the
reader; the brief is "go bold". The page does not follow the OS and does not
read the site-wide `theme` key, because none of its three states is "system"
and `plate` is not a site-wide state. A reader who picks `light` or `dark`
here changes this page only.

**Why brand-strong, not brand.** Paper on the display magenta (#D63A86) is
3.88:1: fine for the names, short of AA for the 12px categories and the 14px
foot links. Paper on brand-strong is 5.09:1, so every word on the plate clears
4.5:1 with no size exceptions to remember. Brand-strong is already "the same
ink pressed harder" in `global.css`; the plate is that press, full-bleed.

**Mechanism.** `src/lib/studio.ts` exports `STUDIO_STORAGE_KEY = 'studio'`,
`type StudioAppearance = 'plate' | 'light' | 'dark'`, and
`readStudioAppearance(value): StudioAppearance` which returns `plate` for
anything unrecognised. Storage is user-writable and must never throw.

The plate is the no-JavaScript state, so it is expressed as the absence of an
opt-out. `studio.astro` renders its root element as `<div class="studio-page">`,
and the plate tokens are declared in `global.css` on

```
:root:has(.studio-page):not([data-studio='light']):not([data-studio='dark'])
```

That selector has higher specificity than both the OS dark block
(`:root:not([data-theme='light'])`) and the explicit `:root[data-theme='dark']`
block, so the plate wins on `/studio` whatever the reader's site-wide theme
says, with no attribute needed. The same selector re-pins `mix-blend-mode:
multiply` on the page's ghosts and offset cards, since the site's dark blocks
would otherwise flip them to `screen` under a dark OS and screen the black ink
ghost into nothing on magenta. It redefines paper, surface, hairline, ink,
ink-secondary, brand-strong, brand-bright and teal (the last three all paper,
so the few marks that use them print in paper), and sets two page-local
properties, `--studio-ghost` and `--studio-plate`, both #232019, which the
ghosts and the proof's offset card read in place of brand and teal. In the
light and dark states those two resolve to brand and teal. `color-scheme:
light` on the plate, so form controls and scrollbars match.

Opting out sets two attributes on `<html>`:

- `light`: `data-studio="light"` and `data-theme="light"`.
- `dark`: `data-studio="dark"` and `data-theme="dark"`.
- `plate`: both removed.

`data-studio` switches the plate block off; `data-theme` is set alongside so
the site's own palettes paint the chosen appearance regardless of the OS.
This overrides the site-wide `data-theme` attribute on this page load only.
It never touches the site-wide `theme` key, so leaving `/studio` restores
whatever the reader chose for the rest of the site.

`ink-secondary` on the plate is paper at 72% opacity. The only text set in it
is the categories, the foot links, and Top Secret's name; the smallest is 12px
at 600 weight. The implementation measures paper-at-72%-over-brand-strong
with the same contrast maths as the existing pill notes and, if it falls under
4.5:1, raises the opacity rather than accepting the miss.

**Pre-paint.** A small inline script in `studio.astro`, placed as early as the
page can place it (the head slot if `Base.astro` offers one, else the first
child of the page root), reads the `studio` key and applies the opt-out
attributes, so a reader who chose `light` never sees a magenta flash. It
mirrors the key as a literal, as `Base.astro`'s theme script does, because it
runs before the bundle exists. With JavaScript off the plate paints, by
construction.

**The control.** `StudioSwitch.astro`: a `<fieldset>` of three native radios
named `studio` with values `plate`, `light`, `dark`, in that order, each
label a 12px round dot in the state's ground colour with a 1px ring in the
current ink and a screen-reader-only text label ("Magenta", "Light", "Dark").
The checked dot gets a 2px ring offset 2px. Focus lands on the label via
`:focus-within` in the current brand ink, as the theme toggle does. It is
rendered `hidden` and unhidden by its script, so a no-JS reader never sees a
control that does nothing. Changing it writes the key (or removes it for
`plate`, the default), applies the attributes, and updates
`meta[name=theme-color]` to the new ground.

This is a separate control from `ThemeToggle.astro`, with a different radio
`name`, so the two can never share a native group. `/studio` mounts the
studio switch and not the theme toggle. `scripts/verify-parity.sh` currently
asserts exactly one `.theme-toggle` per built page; it changes to "at most
one `.theme-toggle` and at most one `.studio-switch`, and at least one of the
two", which keeps the original guarantee (no page ever has two theme radio
groups) and admits this page.

**Reduced transparency / more contrast.** Under the existing gate the ghosts,
the proof's offset card, and the wordmark ghost all drop, as they do
site-wide. The plate stays magenta with paper type; the two-colour logic
survives as flat shapes.

## Data flow

```
apps collection (YAML, Keystatic-edited)
  └─ studio.astro: sort by order → { name, url, proof, category: categoryFor(app), status }
       ├─ <li class="item" data-proof="…"> name + category
       └─ <div class="proof"> one card per app, shown by data-proof match
sidebar/index.json → foot links
localStorage['studio'] → pre-paint opt-out attributes (light/dark only) → StudioSwitch checked state
```

## Testing

- `tests/studio.test.ts`: `categoryFor` for macOS, iOS, planning, and an
  unknown segment; `readStudioAppearance` for each valid value, `null`, and
  garbage.
- The same file, in the manner of `tests/theme.test.ts`: the plate block
  defines every token the dark block defines (no drift), the page-local
  `--studio-ghost` and `--studio-plate` are both defined in all three states,
  and the switch's stylesheet scopes its `display` to `:not([hidden])`.
- `npm run build` passes with the `proof` field absent from three apps and
  present on one; the parity gate passes with its amended rule after the
  baseline is re-snapshotted, since the route set has legitimately grown.
- A rendered check of `/studio` in all three states at 1440 and 375, light
  and dark from the switch, with the proof card forced open on GRØD, tavle.,
  and Top Secret, so all three card types are seen once. Screenshots are
  taken headless with the theme forced by attribute, not by OS, because the
  build machine's OS appearance has already produced one wrong proof.

## Open for later

- Linking `/studio` from the rail, or making it the homepage.
- A `system` state for the studio switch if `plate` stops being the default.
- Whether the tagline in the foot should become the page's `<h1>`; today the
  `<h1>` is a visually hidden "Apps" so the page has a heading and the names
  are list items, not headings.
