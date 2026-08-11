# Riso Notebook — a personal homepage theme for Astro

A two-column personal site in the **Risograph / Overprint D2** style: a warm bone
ground, two spot inks (magenta + teal), deliberate misregistration, and a
halftone dot field. Lots of whitespace, editorial typography — Daring Fireball
restraint with a bit more print character.

Palette and type are pulled verbatim from the GRØD design system (`Themes.swift`
`riso`, `Toppings.swift` `overprintD2`), expressed as CSS custom properties.

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in ./dist
npm run preview
```

Requires Node 18.17+ (or 20+). Fonts (Merriweather + Inter) load from Google
Fonts — the only external request.

## What's where

```
src/
  styles/global.css        # the theme: tokens, layout, components, responsive, a11y
  layouts/Base.astro       # <html> shell + font links
  components/
    Rail.astro             # identity, nav, elsewhere links, colophon
    Hero.astro             # eyebrow + misregistered headline + halftone
    WritingList.astro      # the blog stream
    AppsList.astro         # small tools + "Currently" note
    Footer.astro           # subscribe + registration marks
    RegistrationMark.astro # the printer's crosshair motif
  content.config.ts        # collections: `writing` (markdown) + `apps` (json)
  content/
    writing/*.md           # one file per post (title, date, readingTime, dek)
    apps.json              # the small-tools list
  pages/
    index.astro            # the homepage
    writing/[...id].astro  # a post page
```

## The two inks

- **Magenta** (`--color-brand`) is the primary accent: links, the hero mark, the
  "New" tag.
- **Teal** (`--color-teal`) is the second ink — the halftone, the misregistered
  monogram ghost, and every registration mark. Used sparingly; it's a signature.

The hero headline's magenta offset is the one loud print moment: two stacked
copies of the text, the lower one shifted 3px and set to `mix-blend-mode:
multiply` — the near-miss registration that reads as printed.

## Theme-aware

Light by default; `prefers-color-scheme: dark` swaps in the project's Riso **dark**
palette and flips the halftone blend from `multiply` to `screen`.

## Accessibility

Following Overprint D2's spec, `prefers-reduced-transparency` or
`prefers-contrast: more` drops the blend-mode effects (ghost, halftone) to solid
tokenised ink — the two-colour logic survives as flat shapes, so meaning never
depends on the blend.

## Responsive

Two columns (232px rail + wide main) collapse at 860px to the single-column
mobile layout: identity + horizontal nav on top, then hero, writing, apps,
elsewhere links, subscribe, and colophon.

## Editing content

- **New essay:** add a markdown file to `src/content/writing/` with `title`,
  `date`, `readingTime` and `dek`. Newest date sorts first; the latest essay
  gets the "New" tag.
- **New link post:** the same, but add `sourceUrl` and omit `readingTime`. The
  headline will point at the source, `dek` becomes the remark, and the ★ links
  back here. A Markdoc body is optional — use it for a pull quote.
- **New app:** add a YAML file to `src/content/apps/` (`status` is `live`,
  `dev` or `planning`; omit `url` for an unlinked entry).

Everything above is also editable through the CMS at `/keystatic`.

## Placeholders to replace

Name ("Alex Holley"), links (email/GitHub/Mastodon/RSS), and the `/about`,
`/now`, `/subscribe`, `/rss.xml` routes are placeholders — wire them to real
pages or drop them from `Rail.astro` / `Footer.astro`. Add an RSS feed with
[`@astrojs/rss`](https://docs.astro.build/en/guides/rss/) if you want `/rss.xml`
to resolve.
