---
name: Riso Notebook
description: Two spot inks — magenta and teal — printed slightly out of register on a warm bone ground.
colors:
  paper: "#F6F1E6"
  surface: "#E9E5DC"
  surface-raised: "#F3EFE6"
  hairline: "#D9D3C6"
  ink: "#232019"
  ink-secondary: "#6C6759"
  brand: "#D63A86"
  brand-bright: "#B82E70"
  brand-strong: "#B82E70"
  brand-strong-hover: "#D63A86"
  teal: "#2FA68E"
  teal-ink: "#16755F"
  positive: "#4A7441"
  warning: "#94600F"
  error: "#C0392B"
typography:
  display:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "22px"
    fontWeight: 700
  title:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.28
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.14em"
rounded:
  sm: "2px"
  card: "8px"
  card-expanded: "10px"
components:
  monogram:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
  tag-new:
    backgroundColor: "{colors.brand-strong}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  link:
    textColor: "{colors.brand}"
  link-hover:
    textColor: "{colors.brand-bright}"
  status-live:
    textColor: "{colors.positive}"
  status-wip:
    textColor: "{colors.warning}"
---

# Design System: Riso Notebook

The token and component reference for the Riso / Overprint D2 visual system. This
is the concrete companion to [`PRODUCT.md`](PRODUCT.md) (why it looks this way)
and [`README.md`](README.md) (how the theme runs) — the lookup table for building
anything new without drifting from what's already shipped.

The design is locked. `src/styles/global.css` is the actual source of truth; if
anything here ever disagrees with it, the code wins and this doc is stale — fix
the doc, not the other way around. The machine-readable tokens above mirror the
`:root` light appearance; the prose below carries the dark values, the signature
motifs, and the states the frontmatter can't hold.

## 1. Overview

**Creative North Star: "The Proof Sheet"**

A proof sheet is the test pull a printer takes off the press to check the
registration and ink before committing to the run — the sheet where the craft is
right there to see. That's this system: two spot inks, magenta and teal, on a
warm bone ground, printed slightly out of register. The constraint is the whole
point — with only two colors you stop reaching for a third to solve a hierarchy
problem and solve it with weight, size, and space instead. Restraint is the
method, not an absence of ideas. As `PRODUCT.md` puts it, "the craft is the
credential": the system earns trust by being visibly, precisely made.

The feel is quiet, exact, crafted, and warmly personal — a working notebook, not
a marketing site. Density is generous: a lot of bone whitespace, a two-column
layout (a sticky identity rail beside a wide main column), and content set in
rows divided by hairlines rather than boxed into cards. The one loud moment per
page is the misregistered hero headline; everything else is composed and calm.
Print character carries the warmth — ink, paper, and registration marks — not a
tinted-neutral "cozy" background.

What it explicitly rejects (from `PRODUCT.md`'s anti-references): the generic
SaaS/startup landing (gradient hero, feature grid, "Get started free"); the
salesy funnel (pop-ups, urgency, subscribe-walls, growth hacks); the sterile
minimalist portfolio template (a cold Dribbble/Behance grid with no point of
view); and anything loud or maximalist. Nothing that trades craft or restraint
for reach.

**Key Characteristics:**
- **Two inks, one ground.** Magenta + teal over bone paper. No third accent, ever.
- **Serif prints, sans functions.** Merriweather for anything that should read as printed; Inter for everything operational.
- **Flat by tone, not shadow.** Depth comes from `paper → surface → surface-raised` layering and hairlines; there are no box-shadows.
- **One loud moment.** The misregistered headline is spent once per page; the rest is quiet.
- **Accessibility-gated ink.** Every blend-mode effect degrades to solid ink under `prefers-reduced-transparency` / `prefers-contrast: more`; meaning never depends on a blend.

**Layout.** The page is a two-column grid inside a centered max width; one
breakpoint collapses it to one column, with a tablet refinement inside the
collapsed range.

| Token | Value | Note |
|---|---|---|
| `--page-max` | 1360px | max page width |
| `--margin` | 96px | outer page padding |
| `--rail-w` | 232px | sticky left rail width |
| `--gutter` | 88px | rail ↔ main gap |

Collapse at **1000px**: the two-column grid becomes one column (identity +
horizontal nav on top, then hero, streams, elsewhere, subscribe, colophon).
The rail, gutter, and margins are 320px of fixed overhead, so below ~1080px
the apps column cannot hold its longest name + status pill — the two-column
grid has no honest room under 1000px. Inside the collapsed range, a **tablet
band (861–1000px)** sets the column as a centered 768px notebook measure with
a 40px hero and 56px/32px padding; **≤860px** keeps the 375px-designed mobile
values (24px padding, 34px hero), and the type-only **420px** step shrinks
the hero to 30px. Flex rows that pair a fixed label with variable text
(`.stream__head`, `.app__head`, `.post__meta`, `.site-footer`) wrap instead
of overflowing when a future long value outgrows its row.

## 2. Colors

A warm bone ground carrying two saturated spot inks and a quiet tonal-neutral
ramp; semantic colors appear only on status and error states.

### Primary
- **Editorial Magenta** (`--color-brand`, `#D63A86` light / `#F06AA6` dark): the primary ink. Display-size links and marks — the hero mark, the monogram, the subscribe line, the focus ring. **Brand Bright** (`--color-brand-bright`, `#B82E70` / `#F582B5`) is its hover-only companion.
- **Brand Strong** (`--color-brand-strong`, `#B82E70` light / `#F06AA6` dark): the same ink pressed harder. Brand is 3.88:1 on bone — fine at WCAG-large sizes, short of AA below ~19px — so small-text links at rest (more-links, prose links, page-end links, the skip link), the "New" tag ground, and the mobile active nav take this 5.09:1 press; hover lifts to **Brand Strong Hover** (`--color-brand-strong-hover`, `#D63A86` / `#F582B5`). In dark, brand already clears 6.24:1, so both resolve to the ordinary dark brand ramp and nothing changes there.

### Secondary
- **Registration Teal** (`--color-teal`, `#2FA68E` light / `#63CCAF` dark): the second ink, pressed as **verdigris** — oxidized copper rather than electric cyan (repressed 2026-08: the cyan axis had become the saturated AI-dashboard accent; verdigris reads print and patina, and magenta + green-teal is a classic risograph pairing). The halftone field, the monogram ghost, and every registration mark. Used sparingly — its rarity is what makes it a signature. **Never set type in it**: on the bone ground it measures 2.68:1, below every WCAG threshold. It is a mark, not a word.
- **Teal Ink** (`--color-teal-ink`, `#16755F` light / `#63CCAF` dark): the same ink darkened enough to be read. 4.98:1 on bone — the weight of the secondary ink — and unchanged in dark, where the display pressing already clears 9.2:1. Used for the small set of teal things that are text: app enumerations, Now-panel field labels, quote attributions, and the ↗ / ★ marks on linked posts.

### Neutral
- **Bone Paper** (`--color-paper`, `#F6F1E6` / `#191712`): the page ground.
- **Surface** (`--color-surface`, `#E9E5DC` / `#1E1C18`): recessed fills.
- **Raised Surface** (`--color-surface-raised`, `#F3EFE6` / `#29261F`): raised cards/panels.
- **Hairline** (`--color-hairline`, `#D9D3C6` / `#39352C`): dividers and borders.
- **Ink** (`--color-ink`, `#232019` / `#EDE8DC`): primary text.
- **Secondary Ink** (`--color-ink-secondary`, `#6C6759` / `#A8A18E`): meta and secondary text.

### Semantic
- **Positive** (`--color-positive`, `#4A7441` / `#9DBB7F`): status "Live". One step darker than the original `#4E7A44` (4.45:1) so the 10px pill clears AA at 4.82:1.
- **Warning** (`--color-warning`, `#94600F` / `#E0A33E`): status "WIP". One step darker than the original `#9A6516` (4.39:1); now 4.73:1.
- **Error** (`--color-error`, `#C0392B` / `#E86254`): error state.

Full light/dark reference (dark values are theme-aware by default via
`prefers-color-scheme: dark`):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#F6F1E6` | `#191712` | page background |
| `--color-surface` | `#E9E5DC` | `#1E1C18` | recessed fills |
| `--color-surface-raised` | `#F3EFE6` | `#29261F` | raised cards/panels |
| `--color-hairline` | `#D9D3C6` | `#39352C` | dividers, borders |
| `--color-ink` | `#232019` | `#EDE8DC` | primary text |
| `--color-ink-secondary` | `#6C6759` | `#A8A18E` | secondary/meta text |
| `--color-brand` | `#D63A86` | `#F06AA6` | primary accent — display-size links and marks |
| `--color-brand-bright` | `#B82E70` | `#F582B5` | hover state for brand |
| `--color-brand-strong` | `#B82E70` | `#F06AA6` | brand for small text (≤14px links at rest), "New" tag ground, mobile active nav |
| `--color-brand-strong-hover` | `#D63A86` | `#F582B5` | hover state for brand-strong |
| `--color-teal` | `#2FA68E` | `#63CCAF` | second ink (verdigris) — halftone, ghost, registration marks. Never type |
| `--color-teal-ink` | `#16755F` | `#63CCAF` | teal as text — labels, enumerations, attributions, permalink marks |
| `--color-positive` | `#4A7441` | `#9DBB7F` | status: live |
| `--color-warning` | `#94600F` | `#E0A33E` | status: WIP |
| `--color-error` | `#C0392B` | `#E86254` | error state |

### Named Rules
**The Two-Ink Rule.** Every screen prints in exactly two inks — magenta and teal
— over one bone ground. A third accent color is never introduced; hierarchy is
solved with weight, size, and space. Teal is the rarer ink, and it comes in two
weights of the same colour: `--color-teal` for marks that are *printed* rather
than read — halftone, ghost, registration marks, status dots — and
`--color-teal-ink` for the small set of labels and markers that are *read*:
enumerations, field labels, attributions, and printer's marks that happen to
carry a link. Teal is never body copy, and never an ordinary hyperlink. Magenta
remains the link ink.

**The Token Rule.** Dark values are theme-aware by default. Never hardcode a
light value where a token exists — the token already carries its dark twin.

## 3. Typography

**Display Font:** Merriweather (with Georgia, "Times New Roman", serif)
**Body Font:** Inter (with -apple-system, "Segoe UI", sans-serif)

**Character:** A high-contrast pairing on the classic axis — a warm, printed
transitional serif for anything that should feel set in type, and a neutral,
functional grotesque for everything operational. The contrast is the point; the
two are never blurred.

### Hierarchy
- **Display** (Merriweather 800, 56px — 40px in the 861–1000px tablet band, 34px ≤860px, 30px ≤420px — line-height 1.1, letter-spacing -0.02em): the one hero headline per page.
- **Headline** (Merriweather 700, 22px): section headings (`## Writing`, `## Apps`).
- **Title** (Merriweather 700, 21px/1.28; also 18–20px across app names, the subscribe line, and nav): content titles — post rows, app rows, wordmark.
- **Body** (Inter 400, 17px/1.6): intro and body copy. **Dek** (Inter 400, 15px/1.53, secondary ink) carries deks and secondary copy. Cap prose measure at 65–75ch.
- **Label** (Inter 600, 11–12px, uppercase, letter-spacing 0.14em, secondary ink): eyebrows, meta lines, status pills.

Sizes in real use that aren't tokenized — kept consistent by convention rather
than a variable. Reuse these rather than picking new ones:

24/700 serif (wordmark) · 21/700 serif (post title) · 20/700 serif (subscribe
line) · 19/700 serif (nav item) · 18/700 serif (app name) · 14/600 sans ("more"
links) · 13/600 sans (currently link) · 10/700 sans upper (tag/status pill).

### Named Rules
**The Printed-Heading Rule.** Serif (Merriweather) is reserved for what should
read as printed — display, headings, titles, the wordmark. Sans (Inter) carries
everything functional — body, meta, labels, UI. The two are never swapped, and a
heading is never set in sans "to be modern."

**The Single-Impression Rule.** By default, the misregistration is spent once
per page — on the single most important headline. Its power is scarcity: a
second offset headline of equal weight halves the impact of both. Break it only
on purpose — a distinct page *type*, or a spread where a second region genuinely
earns its own loud moment — never as decoration or reflex. The test: if you
can't say what the second impression is *for*, it stays in register.

## 4. Elevation

This system is flat. There are no box-shadows anywhere in `global.css`. Depth is
conveyed tonally — the `paper → surface → surface-raised` neutral ramp, separated
by 1px hairlines — and, at the hero, by the misregistration offset, which reads
as a second ink laid slightly off the first, i.e. as *print*, not as a floating
surface. No blur, no glow, no drop shadow.

### Named Rules
**The Flat Press Rule.** Surfaces never lift off the page. If something needs to
feel separate, change its tonal layer (`surface` / `surface-raised`) or divide it
with a hairline — never add a shadow. The only apparent "offset" allowed is the
misregistration, and that is ink, not elevation.

## 5. Components

The site is content-first and link-driven; there are no filled push-buttons.
Primary actions are text links in the brand ink. Measurements below are the
patterns used across the site — for full annotated specs (states, exact padding
on every side) see the Paper file **"Warm glacier"** → artboard "Component Spec
Sheet."

### Buttons
- **Shape:** n/a — the system uses text links, not filled buttons. If a filled button ever becomes necessary, it inherits `--radius-card` (8px) and the two-ink palette; it does not introduce a new shape or a third color.
- **Text link (primary action):** `--color-brand` at display sizes; `--color-brand-strong` at rest when the link is small text (≤14px, and any text under ~19px that isn't WCAG-large).
- **Hover / Focus:** brand links shift to `--color-brand-bright`, brand-strong links to `--color-brand-strong-hover`, both over 150ms ease. Keyboard focus gets the global 2px brand `:focus-visible` ring.

### Chips
- **"New" tag:** `--color-brand-strong` background (paper text needs 4.5:1 at 10px; brand only manages 3.88:1 in light), `--color-paper` text, 2px radius, 2px 6px padding, Inter 700 10px uppercase, 0.12em tracking. Marks the newest *essay*, not the newest entry — link posts can run weekly, and an unscoped tag would camp on whichever link ran most recently instead of surfacing the newest long-form piece (`newestEssayId` in `src/lib/links.ts`).
- **Status pill:** a 6px dot + Inter 600 10px uppercase label. `--color-positive` for "Live", `--color-warning` for "WIP". Color is never the only signal — the text label always states the status.

### Cards / Containers
- **Corner style:** `--radius-card` 8px; `--radius-card-expanded` 10px is defined but not yet used — reserved for a more prominent card treatment.
- **Preference:** rows over cards. Content lists (writing, apps) are rows divided by 1px hairlines, not boxed cards. Reach for a card only when a row genuinely won't do; never nest cards.
- **Surface:** if a raised panel is needed, `--color-surface-raised` on `--color-paper`, hairline border, no shadow.

### Linked posts
A stream entry whose headline points out. Headline set at 18px against an
essay's 21px, so a busy link week never outranks the long-form. The source
domain replaces the reading time in the meta line. Two marks in
`--color-teal-ink`: a trailing ↗ on the headline (decorative, `aria-hidden`)
and a ★ below the remark that is the permalink back to our copy — the only
route home once the headline points away. The ★ carries a visible
"Permalink" word (10px/600 uppercase, 0.12em — the `.now-panel__row-label`
recipe) and a ≥24px hit target; its accessible name is
`Permalink — <post title>`.

### Pull quote
`blockquote` inside `.prose`. Set on `--color-surface` with `--radius-card`,
body in the serif at 17px, attribution as a `<cite>` in `--color-teal-ink`
small caps. Separates a source's voice from your own. Authors reach the
attribution with a Markdoc tag, not raw HTML: `{% cite text="Ethan Marcotte" /%}`
inside the blockquote renders `<cite>Ethan Marcotte</cite>`; the same field is
exposed in Keystatic as the `cite` block's "Attribution" input.

### Inputs / Fields
- No form inputs ship today. When one is added: `--color-surface` fill, 1px `--color-hairline` stroke, `--radius-card` (8px). Focus shifts the border to `--color-brand` (no glow — flat press). Error state uses `--color-error` on the border and message.

### Navigation
- **Rail nav:** Merriweather 700 19px/1.15. A 12px fixed-width marker slot shows `→` in `--color-brand` on the visually-current item and is empty otherwise — active and default share the same ink text; only the marker and hover differ. Hover: `--color-brand-bright`, 150ms ease. The visual marker (`data-current`, set by the page's `current` prop) and `aria-current="page"` are deliberately split: home shows the marker on Writing because home *is* the writing stream, but only the link whose href matches the real URL claims `aria-current` — assistive tech is never told home is `/writing`.
- **Keyboard:** a global `:focus-visible` ring — 2px `--color-brand` outline, 3px offset, no glow (flat press) — and a skip link in `Base.astro` (`href="#main"`; every page's main landmark carries `id="main"`), parked above the viewport until focused. `::selection` prints in `--color-brand-strong` with paper text (4.5:1+ both schemes).
- **Touch (≤1000px):** collapsed nav links carry 6px and Elsewhere links 4px vertical padding, lifting the wrapping rows past WCAG 2.5.8's 24px target floor (measured 29px / 32px at 375).
- **Essay rows:** the whole-row anchor puts the `h3` first in DOM (its accessible name leads with the title, not the date); `order` in `global.css` restores the visual stack of meta above title. Decorative glyphs (`↗`, the `→` marker, `/` separators) are `aria-hidden`.
- **Link-preview card:** every page ships canonical + OG/Twitter meta and dual-scheme `theme-color` from `Base.astro`; the shared `og:image` is `/public/og/card.png` — a 1200×630 riso print of the misregistered wordmark on bone with the halftone field and registration marks, i.e. the hero's exact recipe at card scale. Regenerate it in the same two inks if the wordmark or palette ever changes.
- **Collapsed (≤1000px):** the rail nav becomes a horizontal wrapping row above the hero; the marker slot is hidden and the active item is colored brand instead.
- **Stream filter (`.stream__filter`):** `All · Essays · Links`, set in `.label` typography (Inter 600 11px uppercase, 0.14em tracking). Lives in the stream head's "Latest first" slot on the three archive views only (`/writing`, `/essays`, `/links`) — the home stream keeps "Latest first". `aria-current="page"` is set, so it is sound for assistive tech, but it is a **deliberate second idiom**, not an oversight to reconcile with the rail: it signals the current view by colour alone — `--color-ink` active, `--color-ink-secondary` default, no marker glyph — where the rail nav rule above holds active and default to the same ink and differs only by marker and hover. Scoped to this control; don't carry it into the rail.

### Component measurements
- **Writing post row** — 22px 0 padding, 1px hairline bottom border. Meta row: 8px gap, 9px margin-bottom. Title: serif 700 21px/1.28, hovers to `--color-brand-bright`. Dek: 15px/1.53, max-width 440px, 7px margin-top.
- **App row + status pill** — 20px 0 padding, 14px gap. Index number: 22px fixed slot, serif 700 15px teal-ink. Name: serif 700 18px. Status: 6px dot + 10px/600 uppercase label. Dek: 14px/1.5.
- **Now panel** — closes the Apps stream: 18px top padding, 1px hairline top border, 12px gap. Head: 7px teal dot + `.label` "Now". Four rows (Building/Reading/Watching/Listening), each a teal-ink 10px/600 uppercase row-label over a 15px value line; every row after the first gets an 11px-padded hairline divider above it. Values honour real newlines (`white-space: pre-line`) so two builds in flight read as two lines. Closing link 13px/600 brand-strong → brand-strong-hover. Links through to `/now` for the longer version.

### Signature motifs
The four devices that make a new page read as part of this system rather than a
generic layout. Reuse them deliberately; don't invent competing ones.

- **Misregistration** — the one loud print moment, spent on one headline per page. Two stacked copies of the same text: the base copy normal, a second copy offset `translate(3px, 3px)`, colored `--color-brand`, set to `mix-blend-mode: multiply`. Under `prefers-reduced-transparency: reduce` or `prefers-contrast: more`, the offset copy is hidden entirely — meaning must never depend on the blend.
- **Halftone dot field** — a `radial-gradient(--color-teal 1.1px, transparent 1.5px)` at `7px 7px`, `mix-blend-mode: multiply` (flips to `screen` in dark mode), masked to fade out radially. Decorative only, near a hero — never load-bearing for content.
- **Registration mark** (`RegistrationMark.astro`) — a crosshair (teal stroke) plus a ring (brand stroke), default 16px, stroke-width 1. Three variants: `full`, `cross`, `ring`. The connective thread between sections — rail, stream headers, footer.
- **Riso-duotone photography** (`.riso-photo`, filter defined once in `Base.astro`) — the treatment for real photographs, introduced with the site's first (the running essay). The image is piped through an SVG `feColorMatrix` grayscale + `feComponentTransfer` duotone remap (ink → paper, the site's own tokens, fixed to light-mode values on purpose — a photographic negative is a bad dark-mode adaptation), then the *same* halftone dot recipe above is laid over it full-bleed and unmasked (`mix-blend-mode: multiply`, flips to `screen` in dark mode). Under the accessibility gate the halftone drops out and the duotone photo stands alone, still fully legible. A photo run through the same press as everything else, not a full-color image dropped in.

## 6. Do's and Don'ts

### Do:
- **Do** reuse an existing token before adding a new one. If nothing fits, that's a real gap — add it here and to `global.css` together, never leave it implicit in one component's inline values.
- **Do** set anything printed (display, headings, titles, wordmark) in Merriweather and anything functional (body, meta, labels) in Inter.
- **Do** let new page *types* break from the two-column rail layout (the GRØD app page is the first test) — but keep the same palette, type scale, and signature motifs. "Different structure, same ink," never "different structure, different system."
- **Do** check both color schemes **and** the accessibility gates (`prefers-reduced-transparency`, `prefers-contrast: more`) before calling any illustrated component done.
- **Do** pair every status color with a text label — color is never the only signal.

### Don't:
- **Don't** introduce a third ink or accent color. Two inks and a ground; solve hierarchy with weight, size, and space.
- **Don't** add box-shadows, glows, or glassmorphism — the system is flat (see The Flat Press Rule).
- **Don't** scatter the misregistration across headlines by reflex — spend it once by default (see The Single-Impression Rule), and never let meaning depend on a blend mode.
- **Don't** hardcode a light color value where a token exists — the token carries its dark twin.
- **Don't** build a generic SaaS/startup landing: gradient hero, feature grid, "Get started free."
- **Don't** add salesy-funnel patterns — pop-ups, urgency, subscribe-walls, growth hacks.
- **Don't** flatten this into a sterile minimalist portfolio grid with no point of view, and don't go loud or maximalist. Nothing that trades craft or restraint for reach.
- **Don't** use a colored `border-left`/`border-right` stripe as an accent, or gradient text (`background-clip: text`) — neither belongs in this system or any.
