# Art-directed feature posts — design

**Date:** 2026-09-05
**Status:** approved, not yet implemented

## Problem

Writing for an app release doesn't fit the notebook's single column. The GRØD
identity study — the piece that prompted this — is ten sections of display type,
plates, swatches, a scale ladder and a menu-bar state grid. Rendered as an ordinary
essay it becomes a wall of prose with the argument stripped out, because in a piece
about a *mark*, the artwork **is** the argument.

The site already has the pattern: `appPages` carries `template: 'quiet' | 'editorial'`
and picks a body component from it. `writing` already has two post kinds — essay and
link, discriminated by `sourceUrl`. A third treatment is a well-worn groove here, not
a new idea.

This is the first of a recurring format, not a one-off. Alex expects one per app
release or design study.

## Non-goals

- **Not a separate collection.** Feature posts stay in `writing`, so the stream,
  `/essays`, `/writing`, RSS, the sitemap and the New tag all keep working with no
  merge logic. This was chosen over a `studies` collection deliberately.
- **Not a full takeover.** The post keeps the site's typefaces, palette and dark
  mode. It is a *framed* takeover: site chrome top and bottom, the post's own world
  between.
- **No per-post CSS field.** Art direction comes from a fixed block vocabulary, not
  a stylesheet the author edits.
- **Not the "Ink proof" toggle** from the source one-pager. The site now has a real
  theme control; a per-post appearance gimmick would fight the reader's own choice.

## The framed takeover

Site chrome is a slim bar at the top — back link, date, reading time, the Study tag,
the theme control — and the imprint at the bottom. Everything between is the post's
own world: full-bleed, its own grid, display scale far above the column's.

Drawn in the site's own riso tokens, not a separate palette. That is not a
compromise against the source material: the GRØD artwork is *already* printed
magenta-over-teal out of register, which is the site's own ink language. The
one-pager's `#D41467` / `#168A96` are an unregistered fork of `--color-brand` and
`--color-teal`. Bringing it onto the tokens is a correction.

## Content model

`writing`'s schema gains four fields, **all optional, none newly required**:

```ts
template: z.enum(['standard', 'feature']).default('standard'),
eyebrow:   z.string().optional(),   // "Identity study 01"
heroImage: z.string().optional(),   // "/studies/grod-icon/primary.webp"
heroAlt:   z.string().optional(),
app:       z.string().optional(),   // "grod" — ties the study back to /apps/grod
```

**No new `superRefine` branches and nothing newly required.** This is the most
important constraint in the spec. The repo's known failure mode is a field optional
in Keystatic but required in Zod: it commits cleanly and then fails the Cloudflare
build with nothing visible in the editor. A feature post missing its hero therefore
renders without the plate, exactly the honest-degradation idiom `appPages` already
uses for its "screenshot coming soon" placeholder.

`template` is a flat `fields.select` in Keystatic, mirroring `appPages` verbatim —
**not** `fields.conditional`, which serialises to a nested `{ discriminant, value }`
object and would make `template` an object rather than a string. The four
feature-only fields sit flat beside it with `description: 'Feature template only.'`
The cost is honest: four fields that do nothing on an ordinary post. That is the
right trade against a bug class that takes the whole site down.

## The block vocabulary

Six blocks cover nine of the source piece's ten sections.

| Block | Attributes | Used for |
| --- | --- | --- |
| `Plate` | `src`, `alt`, `caption?`, `eyebrow?`, `heading?`, `lede?`, `wide?` | The hero; the secondary mark |
| `Band` | `words[]`, `note?` | The inverted Listen / Distil / Remember / Move statement |
| `Spec` | `columns` (1\|3\|4), `heading?`, `standfirst?`, `detail?`, `items[]` | Origin steps, the three readings, the menu-bar rules |
| `Swatches` | `heading?`, `items[]` (`hex`, `job`) | The ink register |
| `Glyphs` | `heading?`, `standfirst?`, `marks[]` (`src`, `label`), `note?` | The menu-bar state family |
| `ScaleProof` | `heading?`, `src`, `rungs[]` (`size`, `label`, `caption?`) | 256px → 16px, plus the secondary at 64px |

`Spec` is one component, not three. `columns=1` stacks rows with the heading above;
`columns>1` puts the heading **beside** the grid in a left column. That asymmetry is
what lets the display type run three lines deep — it is the thing that makes the
multi-column variant work at all, not a special case.

### Two constraints established by testing, not assumption

1. **Blocks are self-closing tags.** `{% spec /%}` lands at block level;
   `{% spec %}{% /spec %}` gets wrapped in a `<p>`. A full-bleed section inside a
   paragraph is invalid HTML and breaks the layout. This matches Keystatic's
   `block()` (self-closing) versus `wrapper()` (paired) — the same reason the
   existing `cite` component is a `block()`.
2. **Array-of-objects attributes round-trip cleanly** through Markdoc — validated
   with zero errors, object fields intact. This is what lets `Spec`, `Swatches`,
   `Glyphs` and `ScaleProof` carry repeatable items while staying editable as a form
   in Keystatic.

### Prose between blocks

The feature body is full-width, so ordinary paragraphs would run the full measure and
become unreadable. The container constrains its own direct text children — `p`, `h2`,
`ul`, `blockquote` — to a centred reading measure, and the block components opt out
by being full-bleed. Prose and art direction interleave without the author thinking
about it.

## Typography

The format adds **IBM Plex Mono** for eyebrows and the `01 / NAME` keys. Letter-spaced
Inter reads as a UI label; mono reads as a printer's mark, which is what these are.

It loads **only on feature pages**. `Base.astro` gains an optional prop that adds the
face to the existing Google Fonts request, so ordinary posts pay nothing. This is a
third documented face in `DESIGN.md`, which is a real design-system addition and is
recorded as such.

## Colour, and the two-ink discipline

The site has a published essay arguing for two inks. This format renders GRØD's
aubergine as a third.

The rule, stated so it isn't drift: **an app's own inks may appear inside a study
when the study is about that identity, never in site chrome.** `Swatches` already
works this way — its chips *are* the subject matter. The glyphs illustrating a mark's
readings are the same thing.

`Band` uses `--color-brand-on-ink`, already shipped with the theme toggle. The band's
ground is `--color-ink`, which inverts with the scheme, so its accent must run
opposite the page. Without it the accent measured 2.3:1.

## In the stream

A feature post gets a small **"Study"** tag in the existing `post__meta` row, reusing
the `tag-new` treatment in teal rather than brand. It signals there is something more
on the other side of the click without breaking the stream's deliberate evenness.

Everything else is free, because it is still one `writing` entry: permalink, RSS
(dek as description), sitemap, filters, the New tag.

## Assets

The source PNGs are 1.5MB each. They become `.webp` derivatives at the sizes actually
used, in `/public/studies/grod-icon/`. The scale ladder alone would otherwise load
1.5MB eight times.

The menu-bar glyphs ship as individual SVG files in the same directory, referenced by
path — which is what makes `Glyphs` authorable in Keystatic rather than an escape
hatch.

## Content

Port the GRØD icon study as post #1, then rewrite in place through Keystatic. The
port exists so there is something real on the page to react to.

## Testing

Following the repo's pattern — pure logic in `src/lib/`, tested by `node --test`:

1. **`isFeature()`** — a predicate beside `isLink()`, unit-tested.
2. **Block attribute contracts** — each Markdoc tag's declared attributes validate
   the shapes the components expect; a malformed `items` array fails at build, not
   silently at render.
3. **Self-closing enforcement** — a test asserting every block tag is declared
   `selfClosing`, since a paired tag would silently reintroduce the `<p>` wrapper.
4. **Keystatic/Zod agreement** — assert no feature field is required in Zod without
   being required in Keystatic. The build-freeze guard, generalised from the toggle's
   token-parity test.

Verification that isn't unit-testable: the parity gate (feature pages are new routes,
so the baseline grows), a build, and browser checks of the format at desktop and
mobile in both appearances.

## Risks

| Risk | Mitigation |
| --- | --- |
| A required-in-Zod field freezes the deploy. | Nothing new is required; honest degradation instead. Plus test 4. |
| A paired block tag reintroduces the `<p>` wrapper. | Test 3. |
| `Spec` becomes a dumping ground as the format grows. | `columns` is its only variant axis. A seventh shape means a new block, reviewed on its merits. |
| The format drifts from the site's palette. | The colour rule above, and `DESIGN.md` records the mono face. |
| Images regress page weight. | `.webp` derivatives at used sizes; no source PNG ships. |

## Follow-ups, out of scope

- The remaining source section — the "identity status" archive table — has no block.
  It is one table in one piece; hand-set it in prose or cut it.
- A `/studies` index, if these accumulate enough to want their own page.
