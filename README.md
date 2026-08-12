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
npm test         # unit tests (node:test, native TS type stripping)
npm run build    # static output in ./dist
npm run preview
```

Requires Node 22.18+ — `npm test` runs on Node's native TypeScript type
stripping, which is unflagged only from that version on. `.nvmrc` pins `22`;
developed and tested on v24.14.1. Fonts (Merriweather + Inter) load from
Google Fonts — the only external request.

## What's where

```
src/
  styles/global.css   # the theme: tokens, layout, components, responsive, a11y
  layouts/Base.astro  # <html> shell + font links
  lib/
    links.ts          # the only module that knows what makes a `writing` entry a link post
    bskyPulse.ts      # latest-post fetch for the rail's Bluesky pulse
    appStatus.ts      # app status-pill helpers
    inlineMarkdoc.ts  # inline Markdoc render helper (Now-panel entries)
  components/
    Rail.astro              # identity, nav, elsewhere links, pulse, colophon
    Hero.astro              # eyebrow + misregistered headline + halftone
    WritingList.astro       # the writing stream — essays and link posts
    AppsList.astro          # small tools + "Currently" note
    Footer.astro            # subscribe + registration marks
    RegistrationMark.astro  # the printer's crosshair motif
    Pulse.astro             # rail's latest-Bluesky-post block
    RisoPhoto.astro         # duotone photo + halftone, for prose bodies
    AppPageHeader.astro     # /apps/[id] header
    QuietAppBody.astro      # /apps/[id] "quiet" template body
    EditorialAppBody.astro  # /apps/[id] "editorial" template body
  content.config.ts  # 4 Zod-validated collections: writing, apps, appPages, about
  content/
    writing/*.mdoc  # title, date, dek, draft; readingTime required only for essays;
                    # a present sourceUrl (http/https) makes it a link post
    apps/*.yaml       # the small-tools list, one file per app
    appPages/*.mdoc   # long-form /apps/[id] pages (quiet or editorial)
    about/index.mdoc  # the /about singleton's prose body
  data/
    home/index.json     # homepage hero + now-summary copy
    now/index.json      # the /now page's entries
    sidebar/index.json  # rail "elsewhere" links + Bluesky pulse settings
  pages/
    index.astro            # the homepage
    writing/index.astro    # /writing — every entry, newest first
    writing/[...id].astro  # a single post — essay or link post
    essays.astro           # /essays — essays only
    links.astro            # /links — link posts only
    apps/[id].astro        # a single app's detail page
    about.astro            # /about
    now.astro              # /now
    rss.xml.js             # the feed — both post types, Gruber's <link> rule
    api/pulse.json.ts      # edge-cached Bluesky pulse endpoint
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

## Personalizing this for yourself

`/about`, `/now` and `/rss.xml` are real, built routes, not placeholders — the
whole site builds from content, and the feed carries both essays and link
posts. What you'll actually want to change if you're reusing this as your own
theme:

- **Name, role, monogram:** hardcoded as `Rail` props on every page (e.g.
  `<Rail name="Alex Holley" role="Words, design, tools & links" monogram="A" ... />`
  in `src/pages/index.astro`) rather than pulled from content — find-and-replace
  across `src/pages/*.astro`.
- **Elsewhere links:** Email/GitHub/Bluesky/Mastodon/Letterboxd/RSS live in
  `src/data/sidebar/index.json`, also editable at `/keystatic` → Sidebar.
- **Subscribe button:** `src/components/Footer.astro` is an honest stand-in —
  it swaps to "Coming soon" on click rather than linking anywhere, until
  there's a real newsletter behind it.
