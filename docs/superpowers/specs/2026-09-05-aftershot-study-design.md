# Aftershot icon study — design

**Date:** 2026-09-05
**Status:** approved, not yet implemented

## Problem

The feature-post format was built around one piece. A second study, on a different
app, is the only real test of whether it is a vocabulary or scaffolding — and the
whole-branch review predicted exactly where it would strain.

The Aftershot icon story is the test. Source:
`~/Git/afterframe/.worktrees/aftershot-icon-story/Design/AppIcon/story/index.html`.
Eight sections: a hero, a four-word manifesto, origin, scale, anatomy, process,
palette, and an internal specification.

**Most of it maps with nothing invented.** `Spec` alone carries four unrelated
sections — origin, anatomy, process, specification — in a study it was not designed
for. That is the evidence the block is real.

Three things do strain, and one name is wrong.

## Non-goals

- **Not a redesign of the format.** Three targeted fixes, each one a gap this port
  exposed or the last review named. Nothing else moves.
- **Not the "Wallpaper proof" toggle.** The source has one, as GRØD's had "Ink
  proof". The site now has a real theme control; a per-post appearance gimmick
  fights the reader's own choice.
- **Not a rewrite of the prose.** This is a port. Alex rewrites in Keystatic after.

## The name

The study is titled **Aftershot**. The site lists the app as **Afterframe**, and the
site is the stale one. So the roster is renamed as part of this work, not after it —
a study that links back to an app under the wrong name is worse than no link.

`/apps/afterframe/` currently returns **200**. It is live and linkable, and the route
id is the filename. Renaming it without a redirect simply breaks it, so a permanent
redirect from the old path is part of the rename, not a follow-up.

`src/pages/apps/[id].astro` throws when `apps/<id>.yaml` and `appPages/<id>.mdoc`
disagree — the codebase already documents that they must be renamed together. Three
files reference the old name, including a prose link in `company`.

## Format fixes

### `Glyphs` — the strip labels become content

`Glyphs.astro` hardcodes `[{paper, 'Light menu bar'}, {ink, 'Dark menu bar'}]` as a
module constant. The *idea* — one mark proved on both grounds — is fully general.
The words are not. Aftershot has no menu bar; it has a dark-field/light-field pair at
120px, which is the identical shape with different labels.

Two grounds remain fixed (paper and ink are the site's two), but the author names
them. GRØD's post supplies its own "Light menu bar" / "Dark menu bar".

### `Spec`'s ink — a study's own colour is content

`ink` is currently an enum of `brand | teal | aubergine`, which ships GRØD's private
third colour to every future study as a permanent CMS option, and gives the next
study no way to name its own.

It becomes: **`brand`, `teal`, or a hex.** Named tokens stay scheme-aware, which is
why they are worth keeping; a study's own ink is content, exactly as `Swatches` chips
already are. `--grod-aubergine` leaves `feature.css` and GRØD's post carries
`#48234F` itself.

This follows the colour rule the format already states: an app's own inks appear
inside a study about that identity, never in site chrome.

### `Swatches` — every chip needs an edge

Chips have no border. GRØD's four inks were all mid-tone, so it never showed.
Aftershot's palette is `#000000`, `#E08A5B`, `#F2F1EE`: on the bone ground the near-
white chip is invisible, and in dark mode the black one becomes a hole. A swatch you
cannot see is not a swatch. Every chip gets a hairline.

## The port

| Source section | Block |
| --- | --- |
| "A moment that stays." / Afterimage Ribbon | `Plate` |
| Watch / Notice / Capture / Remember | `Band` |
| Origin — four moves | `Spec` |
| Scale — 1024 → 29px | `ScaleProof` |
| Dark field / Light field at 120px | `Glyphs` |
| Anatomy — four parts | `Spec` |
| Process — five steps | `Spec` |
| Palette — three inks | `Swatches` |
| Internal specification | `Spec` |

The mark is an **opaque black square**, where GRØD's was a cream squircle that sat on
the page like a print. On the bone ground it reads as a solid black field, and on the
dark ground it nearly merges. That is not a problem to design around — it is the
actual design question for this icon, and the source already answers it by showing
the mark on both fields. The `Glyphs` section carries that.

## Assets

One source master: 1024², **opaque** (no alpha), 1.15MB. Derivatives at the sizes the
ladder actually renders — 1024, 180, 120, 60, 40, 29 — plus the 120px field pair.
Without alpha these compress harder than GRØD's did.

## Testing

Following the repo's pattern — pure logic in `src/lib/`, tested by `node --test`:

1. **The ladder tells the truth.** A test asserting every `ScaleProof` rung's label
   matches its declared size. GRØD shipped with "256 PX" under a 160px image at every
   width, through three rounds of verification that checked layout, contrast, nesting
   and page weight — every generic property except the one the section claims. This
   is that lesson made mechanical.
2. **`Glyphs` has no hardcoded labels** — a test asserting the component takes them
   as props, so the next study cannot inherit GRØD's words.
3. **`Spec`'s ink accepts a hex**, and the enum no longer names any app's private
   colour.
4. **The apps/appPages pairing holds** after the rename — the existing build-time
   throw covers it, but a route-set check catches a half-done rename earlier.

Not unit-testable, so verified by hand: the redirect actually redirects, the palette
chips are visible on both grounds, and the ladder reads as one descent at both
widths.

## Risks

| Risk | Mitigation |
| --- | --- |
| The rename half-lands and the build throws. | Both files renamed in one commit; a route-set check in the same task. |
| `/apps/afterframe/` breaks for anyone holding the link. | Permanent redirect, verified live after deploy. |
| A study's own hex is illegible on one ground. | Same class as `Swatches`; checked against both grounds before shipping. |
| GRØD's post regresses when the ink enum changes. | Its `aubergine` migrates to `#48234F` in the same commit, and its page is re-checked. |

## Follow-ups, out of scope

- `primary-1024.webp` from the GRØD study is still unreferenced on disk.
- The source's "Canonical asset" line names an Xcode path; it is a note to Alex, not
  something the site should assert. Port it as prose or cut it — implementer's call,
  with reasoning.
