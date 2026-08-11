# Linked Posts — Design

**Date:** 2026-08-11
**Status:** Approved design, ready for implementation planning
**Repo:** `holleyy/gaspery` (branch `main`)

## 1. Context & goal

The site publishes at one speed. Every entry in `src/content/writing/` is an essay with a dek and a reading time, and the bar to publish is correspondingly high — six posts exist. Meanwhile `Rail.astro` already describes the site as "Words, design, tools **& links**", a promise nothing currently keeps.

A **linked post**, in the Daring Fireball sense, is an entry whose headline links *out* to someone else's page rather than to your own permalink. Your contribution is a short remark, often wrapped around a quote from the source. Your permalink is demoted to a small glyph — Gruber uses ★ — at the end of the item. Linked posts run in the same reverse-chronological stream as essays, distinguished but not segregated.

The goal is a second, lower gear: somewhere to put a good link and two sentences without pretending it is an essay. The essays remain the headline act, because the primary audience in `PRODUCT.md` — people sizing up product judgment — came for the long-form.

## 2. Decisions

1. **One collection, discriminated by `sourceUrl`.** A `writing` entry with a `sourceUrl` is a link post; without one it is an essay. No `type` field for an author to set or forget.
2. **The home stream interleaves both types** in date order. Three archive views: `/writing` (everything), `/essays`, `/links`.
3. **Both types permalink at `/writing/<slug>`.** One route file, one ★ target shape.
4. **Stream treatment — "A's typography with B's teal glyphs".** Link headlines set at 18px against the essays' 21px; the source domain occupies the reading-time slot; the ↗ and ★ take `--color-teal-ink`. Essay rows are untouched.
5. **The permalink page is the existing article shell, stripped, plus a quote convention** set as a tint block on `--color-surface`.
6. **One RSS feed** carrying both types, using the Gruber convention (§7).
7. **One new palette token, `--color-teal-ink`**, because display teal fails contrast on the bone ground.
8. **The "New" tag scopes to the newest essay**, not the newest entry.
9. **MarsEdit is a stated future direction.** The schema is shaped to suit it; the endpoint is deferred (§12).
10. **Bluesky cross-posting is deferred** and costs this design nothing (§12).

### Known trade-offs, accepted

- **The Keystatic form shows every field for both types.** Keystatic's schema cannot branch on a field's value, so link posts display `dek` and `readingTime` inputs they don't use. Accepted because MarsEdit is the intended long-term surface for links, where a bookmarklet pre-fills title and URL from the page you're reading.
- **Link rows lose whole-card click.** A link row has two destinations — headline out, ★ home — and nested anchors are invalid HTML, so the row cannot also be one big anchor. Essay rows keep the existing behaviour.
- **The two-ink signature reads softer in light than dark.** `--color-teal-ink` is darkened for the bone ground but identical to display teal against the dark ground, so the glyphs match the registration marks in dark and sit a shade deeper in light.

## 3. Content model

`src/content.config.ts`, `writing` collection:

```ts
schema: z
  .object({
    title: z.string(),
    date: z.coerce.date(),
    sourceUrl: z.string().url().optional(),
    dek: z.string().optional(),
    readingTime: z.string().optional(),
    draft: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.sourceUrl) return;
    if (!v.dek) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dek'],
      message: 'Essays require a dek.' });
    if (!v.readingTime) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['readingTime'],
      message: 'Essays require a reading time.' });
  })
```

`dek` and `readingTime` relax from required to conditionally required. Essays keep exactly the guarantees they have today; link posts carry no dead fields.

**No content migration.** All six existing entries already have both fields and validate unchanged.

**The source domain is derived, never authored:** `new URL(sourceUrl).hostname.replace(/^www\./, '')`. One less field to keep in sync.

A single helper — `isLink(entry) => Boolean(entry.data.sourceUrl)` — is the only place the discriminator is expressed. Everything downstream calls it rather than re-testing `sourceUrl`.

**Implementation note:** confirm Astro's `defineCollection` accepts a refined schema (a `ZodEffects`, not a plain `ZodObject`). If it does not, move the conditional check into the helper module and surface failures at build time there instead.

## 4. Routes

| Route | Contents |
|---|---|
| `/` | Interleaved, truncated; `Older notes →` points at `/writing` |
| `/writing` | Everything, newest first |
| `/essays` | Essays only |
| `/links` | Link posts only |
| `/writing/<slug>` | A single entry of either type |

The filter views are deliberately **not** nested under `/writing/`. `/writing/essays` and `/writing/links` would permanently reserve the slugs `essays` and `links`; Keystatic would happily create a post with either name, and it would silently never render. Top-level filter routes have no collision surface.

They stay out of the rail nav. The `All · Essays · Links` control lives in the stream head **on those three archive views only**, in the slot currently holding `Latest first` ([WritingList.astro:28](../../../src/components/WritingList.astro)); the home stream keeps `Latest first` exactly as it is, so `WritingList` takes a prop choosing between the two. Three static routes, no JavaScript.

## 5. Stream rendering

`WritingList.astro` currently wraps each entry in a single `<a class="post">` ([WritingList.astro:32](../../../src/components/WritingList.astro)). That must change for link rows only:

- **Essay row** — unchanged: one anchor wrapping the whole card, `href` = permalink.
- **Link row** — a non-anchor container holding two discrete links: `<h3><a href={sourceUrl}>` and the trailing `<a href={permalink}>★</a>`.

The `Post` prop interface gains `sourceUrl?: string`; the component derives the domain and picks the row shape.

**Accessibility.** The ★ link needs an accessible name — the glyph alone is meaningless to a screen reader. The ↗ is decorative and takes `aria-hidden="true"`, since the destination is already conveyed by the headline link and the visible domain.

**The New tag** moves from "newest entry" to "newest essay". Behaviour is identical today, since every entry is an essay; without the change the tag would sit permanently on a link once links post weekly and stop carrying meaning.

## 6. The permalink page

`src/pages/writing/[...id].astro` renders both types from one file. For a link post, three swaps against the essay layout:

- `.article__meta` shows `DATE / source-domain` instead of `DATE / reading-time`.
- `.article__title` is wrapped in an anchor to `sourceUrl` and followed by a ↗ in `--color-teal-ink`. The headline itself stays in `--color-ink`; magenta at that size clears AA for large text (3.88:1) but shouts.
- `.article__dek` is omitted. `.article__end` leads with the ★ in place of the registration mark.

### The quote convention

One new component in `global.css`, applied to `blockquote` inside `.prose`:

```css
background: var(--color-surface);
border-radius: var(--radius-card);   /* 8px, existing token */
padding: 22px 26px;
margin: 28px 0 26px;
```

Quote body in `var(--font-serif)` at 17px/1.6 in `--color-ink`. Attribution as `<cite>`: block, `margin-top: 12px`, sans, 600, 11px, `letter-spacing: var(--tracking-label)`, uppercase, `font-style: normal`, coloured `--color-teal-ink`.

This activates `--color-surface`, which nothing on the site currently uses.

Measured contrast:

| | Light | Dark |
|---|---|---|
| Quote body on surface | 12.93:1 | 13.91:1 |
| Attribution on surface | 4.56:1 | 8.74:1 |

All pass AA. **The light attribution at 4.56:1 is the value to watch** — it is the first thing that breaks if the surface tint is ever darkened or teal-ink lightened.

### This changes one existing essay

There is no `blockquote` styling anywhere in the codebase today, and one shipped essay already uses one: the Zadie Smith passage in `so-well-planned-it-feels-unplanned.mdoc`. It currently renders as the browser default.

The style is deliberately applied to `blockquote` inside `.prose` generally, not scoped to link posts. Two quote treatments on one site would be worse than one, and an unstyled UA blockquote is a visible gap rather than a design choice. **The consequence is that this essay's appearance changes** — from browser default to the tint block.

That essay's attribution is written inline inside the quote (`— Zadie Smith`) rather than as a `<cite>`, so it will not pick up the attribution style. It will read correctly regardless; converting it is optional and is the author's call, not the implementation's.

## 7. RSS

One feed at `/rss.xml` carrying both types. A second essays-only feed would split subscribers for no reader benefit and is the kind of machinery `PRODUCT.md` rules out; it remains a ten-line file if ever wanted.

```xml
<!-- essay: link and identity are the same -->
<item>
  <title>The two-ink discipline</title>
  <link>https://gaspery.com/writing/the-two-ink-discipline/</link>
  <guid isPermaLink="true">https://gaspery.com/writing/the-two-ink-discipline/</guid>
  <pubDate>Sat, 18 Jul 2026 00:00:00 GMT</pubDate>
  <description>What a Risograph's two colours taught me about restraint…</description>
</item>

<!-- link: link and identity come apart -->
<item>
  <title>Let a Website Be a Worry Stone</title>
  <link>https://ethanmarcotte.com/…</link>
  <guid isPermaLink="false">https://gaspery.com/writing/worry-stone/</guid>
  <pubDate>Tue, 11 Aug 2026 09:00:00 GMT</pubDate>
  <description><![CDATA[
    <p>The remark.</p>
    <blockquote><p>The quote.</p></blockquote>
    <p><a href="https://gaspery.com/writing/worry-stone/" title="Permanent link">★</a></p>
  ]]></description>
</item>
```

Three rules:

1. `<link>` is **where the reader is being sent** — external for a link post. A reader that only respects `<link>` behaves correctly with no special handling.
2. `<guid isPermaLink="false">` is **identity, not destination**, so readers dedupe without treating it as the click target. Daring Fireball achieves the same decoupling in Atom with an opaque `tag:` URI; `isPermaLink="false"` is the RSS 2.0 equivalent.
3. **The ★ is load-bearing.** Once `<link>` points outward it is the only route from a feed reader back to your copy.

`@astrojs/rss` v4 exposes no first-class `guid`, but items accept `customData` — raw XML appended inside `<item>` — which carries it.

**Two things to resolve during implementation:**

- Whether `@astrojs/rss` already emits its own `<guid>` derived from `link`, so the `customData` entry overrides rather than duplicates it.
- A link post's `description` is its **rendered remark**, not frontmatter, so the endpoint must render Markdoc. Use the documented container recipe. Fallback if it proves awkward: plain-text remark plus the ★ anchor.

## 8. Keystatic

The `writing` collection gains one field, placed directly beneath `title`:

```ts
sourceUrl: fields.text({
  label: 'Source URL',
  description: 'Paste a URL to make this a link post. Leave empty for an essay.',
}),
```

`dek` and `readingTime` stop being required in the Keystatic schema; Zod enforces them conditionally instead. `content` stays as-is — for a link post the Markdoc body *is* the remark, which is what gives the quote convention somewhere to live.

## 9. Design system

Add to `global.css`, both appearances:

```css
:root                              { --color-teal-ink: #1A6F86; }
@media (prefers-color-scheme: dark) { :root { --color-teal-ink: #5CC7E8; } }
```

Display `--color-teal` is **not** touched — the halftone, the monogram ghost and every registration mark print exactly as they do today.

Why the token exists: display teal `#2AA7C8` on the bone ground measures **2.50:1**, below every WCAG threshold, so it cannot carry text in light mode. It is fine in dark at 9.20:1, which is why the problem is easy to miss. `#1A6F86` measures **5.09:1**, near-identical to the existing secondary ink's 5.01:1, so it sits at the same optical weight.

**Status: already landed** (see §12) — the token exists and `DESIGN.md` documents it. The implementation plan consumes it rather than creating it.

Documenting it required amending the **Two-Ink Rule**, which previously read "halftone, ghost, and registration marks only, never body or links." Two of the shipped components already broke that rule, and this design adds more teal text (the ↗, the ★, the quote attribution). The rule now distinguishes teal that is *printed* from teal that is *read*, and holds the line that matters: teal is never body copy and never an ordinary hyperlink — magenta remains the link ink. The ★ is the one deliberate edge, admitted as a printer's mark that happens to carry a link.

## 10. Verification plan

1. `npm run build` passes; all six existing essays validate unchanged.
2. A sample link post and a sample essay render correctly on `/`, `/writing`, `/essays`, `/links`, and their permalinks.
3. Visual check of the stream and one link permalink in **both** appearances.
4. Contrast re-measured against the shipped CSS, not the mockups — specifically teal-ink on paper and the attribution on surface.
5. Keyboard and screen-reader pass on a link row: headline and ★ are separately reachable, ★ has an accessible name, ↗ is not announced.
6. Feed validates with both item types present; confirm exactly one `<guid>` per item and that the ★ anchor survives into the description.
7. Drafts stay out of the stream, the archives and the feed.
8. `/writing/so-well-planned-it-feels-unplanned` checked in both appearances — its existing blockquote now renders as the tint block (§6).

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Astro rejects a refined (`ZodEffects`) collection schema | Medium | Fall back to validating in the `isLink` helper module |
| `@astrojs/rss` emits a duplicate `<guid>` | Medium | Inspect generated XML during implementation; override or drop `customData` accordingly |
| Rendering Markdoc inside the RSS endpoint proves awkward | Medium | Plain-text remark plus ★ anchor as the fallback description |
| Links flood the home stream and bury the essays | Low | Headline size already favours essays; `/essays` exists as the clean view |
| A future palette tweak drops the 4.56:1 attribution below AA | Low | Recorded in §6 as the value to watch |
| The new blockquote style is unwelcome on the one essay that already has one | Low | Called out in §6; scoping it to link posts only is a one-selector change if preferred |

## 12. Out of scope

**Deferred, by decision:**

- **MarsEdit publishing.** MarsEdit speaks MetaWeblog/AtomPub XML-RPC and [does not support Micropub](https://indieweb.org/MarsEdit); Keystatic commits from the browser, so there is no server write path for it to reach. Enabling it means an XML-RPC endpoint as an Astro API route — `getRecentPosts`, `newPost`, `editPost`, `newMediaObject`, plus WordPress's `custom_fields` extension, authenticating on an app password and committing `.mdoc` files via the GitHub API. This design keeps that cheap: one flat collection maps to MetaWeblog's single notion of "a blog", and `sourceUrl` maps to one custom field. **Note the coherence risk** — two CMSes writing the same files should mean MarsEdit *replacing* Keystatic for links, not joining it.
- **Bluesky cross-posting.** A GitHub Action on push to `main`, firing when a push *adds* a file to the writing directory. The git diff is the idempotency key, so no `crossposted` flag pollutes content and **no schema field is needed now**. Known gotchas: `facets` use **byte** offsets into UTF-8 (an em dash in the remark will shift a link built on character offsets); link cards need `app.bsky.embed.external` with a blob-uploaded thumbnail; the trigger must respect `draft`; posts cap at 300 graphemes. Open editorial question: the rail already shows the latest Bluesky post ([Rail.astro:64](../../../src/components/Rail.astro)), so auto-posting every link makes the pulse a mirror of the site's own links.
- **An essays-only RSS feed.**

**Landed ahead of this feature** (commit precedes the implementation plan, so the plan can assume them):

- `--color-teal-ink` added to `global.css` and documented in `DESIGN.md`. §9 describes the token; it already exists.
- `.app__num` and `.now-panel__row-label` moved onto it, closing a pre-existing **2.50:1** AA gap against `PRODUCT.md`'s WCAG 2.1 AA target.
- `getStaticPaths` in `writing/[...id].astro` now filters drafts in production builds only, so a draft is still previewable at its real URL under `astro dev` but never ships.

**Corrected:** an earlier draft of this spec claimed `DESIGN.md` documents the light palette but not the dark tokens. That is wrong — §2 carries a full light/dark reference table and every bullet lists both values. Design-hook runs flag shipped dark values because of how the hook parses the file, not because they are undocumented.
