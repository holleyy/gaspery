# Decisions

Design and product calls that are deliberate, revisitable, and not obvious from
reading the code. Each entry says what was decided, why, and what would make it
worth reopening.

This is not a changelog. If a decision stops being true, edit or delete its
entry — a stale decision log is worse than none.

---

## The "New" tag marks the newest *essay*, not the newest entry

**Decided:** 2026-08-12, with linked posts.

The `New` chip in the writing stream flags the most recent essay. A linked post
never carries it, even when it is the most recent thing published.

**Why.** Link posts are meant to be cheap and frequent — that is the whole point
of the second gear. If the tag tracked the newest *entry*, it would live on a
link permanently and stop meaning anything within a week. Scoping it to essays
keeps it pointing at the substantial work, which is what the primary audience in
`PRODUCT.md` came for.

**The cost, accepted.** The tag can sit visibly below newer entries. With one
link post published it is already on row two with a newer row above it; after a
run of five it would be on row six. To a reader who doesn't know the rule, that
reads as a bug rather than a policy.

**Revisit if** it starts to grate in practice. Two known options, neither taken:
relabel the chip `New essay` so it explains itself in place, or render it only
when the newest essay also happens to be the newest entry — which never looks
wrong but means the tag silently disappears for stretches, including for a new
essay published mid-run.

**Where it lives:** `newestEssayId()` in `src/lib/links.ts`, called by
`index.astro`, `writing/index.astro`, `essays.astro`, `links.astro`.

---

## `dek` is required on every entry and doubles as a link post's remark

**Decided:** 2026-08-11, during linked-posts planning.

For an essay, `dek` is the standfirst. For a linked post it is the *remark* —
your actual commentary — and it is what appears in the stream, on the permalink
page, and in the feed. A linked post's Markdoc body is optional, and holds a
pull-quote or a longer riff that only the permalink page shows.

**Why.** The original design put the remark in the Markdoc body. The stream
cannot cheaply render N Markdoc bodies, and the approved stream design shows
remark text under every link headline. Frontmatter was the only shape that
worked for all three surfaces at once.

**The cost, accepted.** A pull-quote living in the body does not reach the feed.
Feed subscribers get the remark and the ★, which is enough to decide whether to
click.

**Revisit if** you find yourself routinely wanting the quote in the feed.

---

## Both entry types permalink at `/writing/<slug>`

**Decided:** 2026-08-11.

A linked post's own page lives at `/writing/<slug>`, same as an essay — not at a
separate `/links/<slug>`.

**Why.** One route file, one shape of ★ target, one thing to reason about. The
remark is still your writing.

**Related:** the three archive views are `/writing` (everything), `/essays` and
`/links`. They are deliberately *not* nested as `/writing/essays` and
`/writing/links`, which would permanently reserve those two slugs — Keystatic
would happily let you create a post named "Links" that then silently never
rendered.

---

## Teal comes in two weights, and only one of them may be type

**Decided:** 2026-08-12.

`--color-teal` (`#2AA7C8`) is for marks that are *printed* — the halftone, the
monogram ghost, registration marks, status dots. `--color-teal-ink` (`#1A6F86`
light, `#5CC7E8` dark) is for the small set of teal things that are *read*.

**Why.** Display teal measures 2.50:1 on the bone ground — below every WCAG
threshold. It was already being used as type in two shipped components
(`.app__num`, `.now-panel__row-label`), which is a real accessibility failure
against `PRODUCT.md`'s stated AA target. Darkening the whole ink would have
changed the halftone and the registration marks, which are the signature.

**The tightest figure in the system** is the pull-quote attribution at 4.56:1 —
teal-ink on `--color-surface`. It clears AA by 0.06. If the surface tint darkens
or teal-ink lightens, that is the first thing that breaks.

---

## The archive filter signals the current view by colour alone

**Decided:** 2026-08-12.

`All · Essays · Links` marks the active view with `--color-ink` against
`--color-ink-secondary`. The rail nav, by contrast, gives active and default the
same ink and distinguishes them with a marker glyph.

**Why.** The stream head is a tight horizontal slot; a marker glyph per item
would crowd it.

**Not an accessibility problem** — `aria-current="page"` is set, so assistive
technology gets the state explicitly. It is a sighted-user consistency
inconsistency, knowingly taken.

**Revisit if** the site grows a third navigation idiom, at which point picking
one convention matters more than saving the space.

---

## The pull-quote style applies to essays too

**Decided:** 2026-08-11.

The tint-block `blockquote` treatment targets all prose, not just linked posts.

**Why.** The site had no blockquote styling at all, and one shipped essay
already contained one (the Zadie Smith passage in
`so-well-planned-it-feels-unplanned`). Two quote treatments on one site would be
worse than one, and an unstyled browser-default blockquote is a gap rather than
a choice.

**The cost, accepted.** That essay's appearance changed. Its attribution is
written as trailing plain text inside the quote, so it does not pick up the
`<cite>` styling — converting it is a content edit, deliberately left alone.

---

## Deferred, with the schema already shaped for them

**MarsEdit.** MarsEdit speaks MetaWeblog/AtomPub XML-RPC and does not support
Micropub; Keystatic commits from the browser, so there is no server write path
for it to reach. Enabling it means an XML-RPC endpoint as an Astro API route.
The current design keeps that cheap — one flat collection maps to MetaWeblog's
single notion of "a blog", and `sourceUrl` maps to one custom field. Note the
coherence risk: two CMSes writing the same files should mean MarsEdit
*replacing* Keystatic for links, not joining it.

**Bluesky cross-posting.** A GitHub Action on push to `main`, firing when a push
*adds* a file to the writing directory. The git diff is the idempotency key, so
no `crossposted` flag pollutes content and no schema field is needed. Known
gotchas: `facets` use **byte** offsets into UTF-8, so an em dash in the remark
will shift a link built on character offsets; link cards need
`app.bsky.embed.external` with a blob-uploaded thumbnail; the trigger must
respect `draft`; posts cap at 300 graphemes. Open question: the rail already
shows your latest Bluesky post, so auto-posting every link makes the pulse a
mirror of the site's own links.
