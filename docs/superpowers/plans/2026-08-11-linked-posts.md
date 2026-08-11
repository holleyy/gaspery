# Linked Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Daring Fireball style linked posts — entries whose headline links out to a source, with a short remark of your own and the permalink demoted to a ★ — interleaved with the essays.

**Architecture:** One `writing` collection discriminated by the presence of `sourceUrl`. A pure helper module (`src/lib/links.ts`) is the only place that knows what makes an entry a link post. The home stream interleaves both types; `/writing`, `/essays` and `/links` are three static filtered views of one archive; both types permalink at `/writing/<slug>`.

**Tech Stack:** Astro 5, Markdoc, Keystatic, Zod (via `astro:content`), `@astrojs/rss` v4, Cloudflare Workers. Node v24.14.1.

**Design of record:** [`docs/superpowers/specs/2026-08-11-linked-posts-design.md`](../specs/2026-08-11-linked-posts-design.md)

## Global Constraints

- **Never alter the essays' rendered HTML.** Essay rows and essay permalinks must stay byte-identical to the baseline captured in Task 1. `scripts/verify-parity.sh` is the gate, and it compares HTML only — so the new quote style, being pure CSS, must produce **no** parity diff even on `so-well-planned-it-feels-unplanned`, the one essay that already contains a blockquote. Its *appearance* changes; its markup must not. The only permitted parity diffs are new routes and the new link rows.
- **Two inks only.** Magenta and teal over the bone ground; no third accent. Use `--color-teal-ink` (already in `global.css`) for any teal that is *read*; `--color-teal` is for marks that are *printed* and must never be set as type — it measures 2.50:1 on bone.
- **WCAG 2.1 AA.** Body text ≥ 4.5:1. Never convey state by colour alone.
- **No new runtime dependencies.** Tests use Node's built-in `node:test` with native TypeScript type stripping.
- **No JavaScript for the filter views.** They are three static routes.
- **Existing tokens only** for type sizes and radii — `--radius-card` is 8px; the type ramp lives in `DESIGN.md` §3.

## Resolved ambiguity — read before Task 1

The spec (§3, §8) says a link post's Markdoc body *is* the remark and implies `dek` is essay-only. That conflicts with the approved stream mockup, which shows remark text under a link headline — the stream cannot cheaply render N Markdoc bodies.

**Resolution, adopted by this plan:** `dek` is **required for every entry**. For an essay it is the standfirst, as today. For a link post it is the remark, and it is what the stream and the feed show. The Markdoc **body is optional for link posts**, holding a pull-quote or a longer riff that only appears on the permalink page.

This makes `readingTime` the only conditionally-required field. Task 1 amends the spec to match.

**Knock-on effect on §7.** The spec says a link post's feed description is its *rendered* remark, requiring Markdoc rendering inside the RSS endpoint. Under this resolution the remark is already a plain string in frontmatter, so the endpoint needs no renderer and that risk disappears. The trade: a pull-quote living in the body does **not** reach the feed. The feed carries the remark and the ★, which is what the stream shows and what a reader needs in order to decide whether to click. Accepted.

---

### Task 1: Schema, helpers, and the parity baseline

**Files:**
- Create: `src/lib/links.ts`
- Create: `tests/links.test.ts`
- Modify: `src/content.config.ts:5-14`
- Modify: `package.json:7-13` (add `test` script)
- Modify: `docs/superpowers/specs/2026-08-11-linked-posts-design.md` (§3 amendment)

**Interfaces:**
- Consumes: nothing.
- Produces, all from `src/lib/links.ts`: `isLink(data): boolean`, `sourceDomain(sourceUrl): string`, `newestEssayId(entries): string | null`, and `toPostProps(entry, newestEssayId): PostProps`. The `writing` collection schema gains an optional `sourceUrl: string`, and `readingTime` becomes optional at the type level.

> **Amendment (owner decision, pre-flight).** The mapping from a collection
> entry to `WritingList`'s prop shape is used by four pages. It lives in
> `toPostProps` here rather than being copy-pasted into each, so the four call
> sites cannot drift. `newestEssayId` comes with it: because it returns the
> first non-link entry, a links-only list yields `null` and needs no
> special-casing at the call site.

> **Prerequisite — needs a human answer before Task 5 can be trusted.**
> `astro.config.mjs:14` still reads `site: 'https://your-domain.com'`. That
> placeholder is live: every `<link>` in `dist/rss.xml` and every URL in the
> sitemap currently points at `your-domain.com`. Task 5 builds the `<guid>` and
> the ★ href from `context.site`, so linked posts would ship broken permalinks
> on top of an already-broken feed.
>
> **Confirmed by the owner: `https://gaspery.com`.** Set it, rebuild, and check
> `grep -oE '<link>[^<]*' dist/rss.xml` shows `gaspery.com`. Commit separately
> as `fix: point the site URL at the production domain`. This is a pre-existing
> bug, not linked-posts work; it is here only because Task 5 depends on it.

- [ ] **Step 1: Capture the parity baseline before touching anything**

```bash
scripts/snapshot-baseline.sh
```

Expected: `Baseline captured: 13 pages`. If `.baseline/` already exists it is replaced. Do not commit `.baseline/` — it is gitignored.

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, after `"astro": "astro"`, add:

```json
    "test": "node --test \"tests/**/*.test.ts\""
```

Remember the comma on the preceding line.

- [ ] **Step 3: Write the failing test**

Create `tests/links.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
// The `.ts` extension is required here and only here: Node's native type
// stripping runs this file directly, and ESM in Node needs explicit
// extensions. Astro/Vite files import the same module extensionless.
import { isLink, sourceDomain } from '../src/lib/links.ts';

test('isLink is true only when a source URL is present', () => {
  assert.equal(isLink({ sourceUrl: 'https://example.com/a' }), true);
  assert.equal(isLink({}), false);
  assert.equal(isLink({ sourceUrl: '' }), false);
  assert.equal(isLink({ sourceUrl: undefined }), false);
});

test('sourceDomain drops the scheme, the www, and everything after the host', () => {
  assert.equal(sourceDomain('https://www.example.com/a/b?c=1'), 'example.com');
  assert.equal(sourceDomain('https://daringfireball.net/linked/2026/08/11/x'), 'daringfireball.net');
  assert.equal(sourceDomain('http://example.com'), 'example.com');
});

test('sourceDomain keeps a meaningful subdomain', () => {
  assert.equal(sourceDomain('https://blog.example.com/post'), 'blog.example.com');
});

test('sourceDomain ignores a port', () => {
  assert.equal(sourceDomain('https://example.com:8443/post'), 'example.com');
});

const essay = { id: 'two-ink', data: { title: 'The two-ink discipline', date: new Date('2026-07-18'), dek: 'A dek.', readingTime: '7 min' } };
const link = { id: 'worry-stone', data: { title: 'Worry Stone', date: new Date('2026-08-11'), dek: 'A remark.', sourceUrl: 'https://ethanmarcotte.com/x' } };

test('newestEssayId picks the first essay, ignoring links ahead of it', () => {
  assert.equal(newestEssayId([link, essay]), 'two-ink');
});

test('newestEssayId is null when a list holds no essays', () => {
  assert.equal(newestEssayId([link]), null);
  assert.equal(newestEssayId([]), null);
});

test('toPostProps maps an essay and flags it as new when it matches', () => {
  assert.deepEqual(toPostProps(essay, 'two-ink'), {
    href: '/writing/two-ink',
    title: 'The two-ink discipline',
    date: new Date('2026-07-18'),
    dek: 'A dek.',
    readingTime: '7 min',
    sourceUrl: undefined,
    isNew: true,
  });
});

test('toPostProps carries sourceUrl through and never flags a link as new', () => {
  const props = toPostProps(link, 'two-ink');
  assert.equal(props.sourceUrl, 'https://ethanmarcotte.com/x');
  assert.equal(props.href, '/writing/worry-stone');
  assert.equal(props.isNew, false);
});
```

Update the import at the top of the file to pull in all four:

```ts
import { isLink, sourceDomain, newestEssayId, toPostProps } from '../src/lib/links.ts';
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/lib/links.ts'`.

- [ ] **Step 5: Write the helper module**

Create `src/lib/links.ts`:

```ts
/* The only module that knows what makes an entry a link post. Pure functions
   over plain data, so they can be tested without an Astro build. */

export type LinkFields = { sourceUrl?: string };

/** An entry is a link post if, and only if, it carries a source URL. */
export function isLink(data: LinkFields): boolean {
  return typeof data.sourceUrl === 'string' && data.sourceUrl.length > 0;
}

/** Display form of a source's host: no scheme, no `www.`, no port, no path.
    Safe to call unguarded — the schema has already rejected anything that is
    not an http(s) URL. */
export function sourceDomain(sourceUrl: string): string {
  return new URL(sourceUrl).hostname.replace(/^www\./, '');
}

export type WritingData = LinkFields & {
  title: string;
  date: Date;
  dek: string;
  readingTime?: string;
};
export type WritingEntry = { id: string; data: WritingData };

export type PostProps = {
  href: string;
  title: string;
  date: Date;
  dek: string;
  readingTime?: string;
  sourceUrl?: string;
  isNew: boolean;
};

/** The newest essay in a date-sorted list, or null if it holds none.
    "New" marks essays only: links post often, and left unscoped the tag would
    sit on a link permanently and stop meaning anything. A links-only list
    therefore yields null, so callers need no special case. */
export function newestEssayId(entries: WritingEntry[]): string | null {
  return entries.find((e) => !isLink(e.data))?.id ?? null;
}

/** Map a collection entry to what WritingList renders. The single place that
    knows the prop shape — four pages call it. */
export function toPostProps(entry: WritingEntry, newestId: string | null): PostProps {
  return {
    href: `/writing/${entry.id}`,
    title: entry.data.title,
    date: entry.data.date,
    dek: entry.data.dek,
    readingTime: entry.data.readingTime,
    sourceUrl: entry.data.sourceUrl,
    isNew: entry.id === newestId,
  };
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm test
```

Expected: `pass 8`, `fail 0`.

- [ ] **Step 7: Extend the collection schema**

In `src/content.config.ts`, replace the whole `writing` collection definition with:

```ts
// Blog posts — one markdown file per entry. An entry carrying `sourceUrl` is a
// linked post: its headline points out, and `dek` holds the remark.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/writing' }),
  schema: z
    .object({
      title: z.string(),
      date: z.coerce.date(),
      sourceUrl: z
        .string()
        .url()
        .refine((u) => /^https?:$/.test(new URL(u).protocol), {
          message: 'Source URL must be an http(s) address.',
        })
        .optional(),
      readingTime: z.string().optional(),
      dek: z.string(),
      draft: z.boolean().default(false),
    })
    .superRefine((v, ctx) => {
      /* Only essays carry a reading time; a linked post has nothing to time. */
      if (!v.sourceUrl && !v.readingTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['readingTime'],
          message: 'Essays require a readingTime.',
        });
      }
    }),
});
```

- [ ] **Step 8: Verify Astro accepts a refined schema**

```bash
npm run build
```

Expected: build succeeds, 13 pages. **This is the risk flagged in spec §11** — Astro must accept a `ZodEffects` (the result of `.superRefine()`), not just a plain `ZodObject`.

If it fails with a schema-type error, fall back: drop `.superRefine()` from the collection, keep the plain `z.object`, and instead export from `src/lib/links.ts`:

```ts
/** Throws at build time if an essay is missing its reading time. */
export function assertEssayFields(id: string, data: LinkFields & { readingTime?: string }): void {
  if (!isLink(data) && !data.readingTime) {
    throw new Error(`Essay "${id}" requires a readingTime.`);
  }
}
```

…and call it from `src/pages/index.astro` while mapping entries. Add a test for it in `tests/links.test.ts` mirroring the style of Step 3.

- [ ] **Step 9: Verify parity — nothing should have changed yet**

```bash
scripts/verify-parity.sh
```

Expected: `PARITY OK — all pages match baseline`.

- [ ] **Step 10: Amend the spec to match the resolved ambiguity**

In `docs/superpowers/specs/2026-08-11-linked-posts-design.md` §3, replace the sentence beginning "`dek` and `readingTime` relax from required…" with:

```markdown
`readingTime` relaxes from required to essay-only. `dek` stays required for
every entry: for an essay it is the standfirst, for a link post it is the
remark, and it is what the stream and the feed display. A link post's Markdoc
body is optional and holds a pull-quote or a longer riff shown only on the
permalink page — the stream cannot cheaply render N Markdoc bodies.
```

- [ ] **Step 11: Commit**

```bash
git add src/lib/links.ts tests/links.test.ts src/content.config.ts package.json docs/superpowers/specs/2026-08-11-linked-posts-design.md
git commit -m "feat: add the linked-post discriminator to the writing schema"
```

---

### Task 2: Link rows in the stream

**Files:**
- Modify: `src/components/WritingList.astro` (whole file)
- Modify: `src/pages/index.astro:12-23`
- Modify: `src/pages/writing/index.astro:9-20`
- Modify: `src/styles/global.css` (after the `.more-link` rule, ~line 261)
- Create: `src/content/writing/let-a-website-be-a-worry-stone.mdoc`

**Interfaces:**
- Consumes: `sourceDomain` from `src/lib/links.ts`.
- Produces: `WritingList`'s `Post` prop shape — `{ href: string; title: string; date: Date; dek: string; readingTime?: string; sourceUrl?: string; isNew?: boolean }` — and a `filter?: 'all' | 'essays' | 'links'` prop consumed by Task 3.

- [ ] **Step 1: Add a real link post to exercise the path**

Create `src/content/writing/let-a-website-be-a-worry-stone.mdoc`:

```markdown
---
title: Let a Website Be a Worry Stone
date: 2026-08-11
sourceUrl: https://ethanmarcotte.com/wrote/a-worry-stone/
dek: A lovely piece about tending your own small patch of the web. I've read it three times and it keeps getting better.
---

The framing I keep coming back to is maintenance as its own reward. Not an
audience, not a funnel. Just the tending.
```

- [ ] **Step 2: Rewrite `WritingList.astro`**

Replace the whole file:

```astro
---
import RegistrationMark from './RegistrationMark.astro';
import { sourceDomain } from '../lib/links';

interface Post {
  href: string;
  title: string;
  date: Date;
  dek: string;
  readingTime?: string;
  sourceUrl?: string;
  isNew?: boolean;
}
interface Props {
  posts: Post[];
  moreHref?: string;
  showMore?: boolean;
  filter?: 'all' | 'essays' | 'links';
}
const { posts, moreHref = '/writing', showMore = true, filter } = Astro.props;

const fmt = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

const FILTERS = [
  { key: 'all', label: 'All', href: '/writing' },
  { key: 'essays', label: 'Essays', href: '/essays' },
  { key: 'links', label: 'Links', href: '/links' },
] as const;
---
<section class="stream" id="writing">
  <div class="stream__head">
    <div class="title-group">
      <RegistrationMark size={14} />
      <h2>Writing</h2>
    </div>
    {filter ? (
      <nav class="stream__filter" aria-label="Filter writing">
        {FILTERS.map((f) => (
          <a class="label" href={f.href} aria-current={f.key === filter ? 'page' : undefined}>{f.label}</a>
        ))}
      </nav>
    ) : (
      <span class="label">Latest first</span>
    )}
  </div>

  {posts.map((post) => post.sourceUrl ? (
    <article class="post post--link">
      <div class="post__meta">
        <span class="label">{fmt(post.date)}</span>
        <span class="sep">/</span>
        <span class="label">{sourceDomain(post.sourceUrl)}</span>
        {post.isNew && <span class="tag-new">New</span>}
      </div>
      <h3><a href={post.sourceUrl}>{post.title}</a><span class="post__out" aria-hidden="true">↗</span></h3>
      <p class="post__dek">{post.dek}</p>
      <a class="post__permalink" href={post.href}>
        <span aria-hidden="true">★</span><span class="sr-only">Permalink to this post</span>
      </a>
    </article>
  ) : (
    <a class="post" href={post.href}>
      <div class="post__meta">
        <span class="label">{fmt(post.date)}</span>
        <span class="sep">/</span>
        <span class="label">{post.readingTime}</span>
        {post.isNew && <span class="tag-new">New</span>}
      </div>
      <h3>{post.title}</h3>
      <p class="post__dek">{post.dek}</p>
    </a>
  ))}

  {showMore && <a class="more-link" href={moreHref}>Older notes <span>→</span></a>}
</section>
```

The essay branch is character-for-character the original markup. That is what keeps parity.

- [ ] **Step 3: Add the styles**

In `src/styles/global.css`, immediately after the `.more-link:hover` rule, insert:

```css
/* Linked posts — the headline points out, the ★ points home. Smaller than an
   essay headline so a busy link week never outranks the long-form. */
.post--link h3 { font-family: var(--font-serif); font-weight: 700; font-size: 18px; line-height: 1.28; }
.post--link h3 a { transition: color .15s ease; }
.post--link:hover h3 a { color: var(--color-brand-bright); }
.post__out { margin-left: 6px; font-size: 14px; color: var(--color-teal-ink); }
.post__permalink { display: inline-block; margin-top: 9px; font-size: 14px; color: var(--color-teal-ink); }
.post__permalink:hover { color: var(--color-brand-bright); }

/* Filter control — takes the "Latest first" slot on the archive views. */
.stream__filter { display: flex; align-items: center; gap: 12px; }
.stream__filter a { color: var(--color-ink-secondary); transition: color .15s ease; }
.stream__filter a:hover { color: var(--color-brand-bright); }
.stream__filter a[aria-current="page"] { color: var(--color-ink); }

/* Visually hidden but reachable — names the ★ for screen readers. */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
```

- [ ] **Step 4: Pass the new fields from the homepage**

In `src/pages/index.astro`, add to the imports:

```ts
import { newestEssayId, toPostProps } from '../lib/links';
```

…then replace the block from `const newestId` through the end of `postProps` with:

```ts
const newestId = newestEssayId(posts);
const postProps = posts.map((p) => toPostProps(p, newestId));
```

- [ ] **Step 5: Apply the same change in `src/pages/writing/index.astro`**

Add the import — note the path is one level deeper:

```ts
import { newestEssayId, toPostProps } from '../../lib/links';
```

…then replace its `const newestId` / `postProps` block with:

```ts
const newestId = newestEssayId(posts);
const postProps = posts.map((p) => toPostProps(p, newestId));
```

- [ ] **Step 6: Build and inspect the diff**

```bash
npm run build && scripts/verify-parity.sh
```

Expected: **fails, with an enumerated and expected set of changes.** Confirm every reported diff is one of:
- `ROUTE SET CHANGED` adding `./writing/let-a-website-be-a-worry-stone/index.html`
- `CHANGED: index.html` — the new link row appears in the stream
- `CHANGED: writing/index.html` — same

**If any of the six essay permalink pages appear as `CHANGED`, stop and fix it.** The essay branch must emit identical markup.

- [ ] **Step 7: Verify the rendered result in the browser**

Start the dev server via the `homepage` config in `.claude/launch.json`, then confirm on `/`:

```js
(() => {
  const row = document.querySelector('.post--link');
  return {
    domain: row.querySelectorAll('.label')[1].textContent,
    headlineHref: row.querySelector('h3 a').getAttribute('href'),
    permalinkHref: row.querySelector('.post__permalink').getAttribute('href'),
    outHidden: row.querySelector('.post__out').getAttribute('aria-hidden'),
    srName: row.querySelector('.post__permalink .sr-only').textContent,
    newTagOnLink: !!row.querySelector('.tag-new'),
  };
})()
```

Expected: `domain` `"ethanmarcotte.com"`, `headlineHref` the external URL, `permalinkHref` `/writing/let-a-website-be-a-worry-stone`, `outHidden` `"true"`, `srName` `"Permalink to this post"`, `newTagOnLink` `false`.

- [ ] **Step 8: Commit**

```bash
git add src/components/WritingList.astro src/pages/index.astro src/pages/writing/index.astro src/styles/global.css src/content/writing/let-a-website-be-a-worry-stone.mdoc
git commit -m "feat: render linked posts in the writing stream"
```

---

### Task 3: The three archive views

**Files:**
- Create: `src/pages/essays.astro`
- Create: `src/pages/links.astro`
- Modify: `src/pages/writing/index.astro` (add `filter="all"`)

**Interfaces:**
- Consumes: `WritingList`'s `filter` prop and `Post` shape from Task 2; `isLink` from Task 1.
- Produces: routes `/essays` and `/links`.

- [ ] **Step 1: Mark `/writing` as the "All" view**

In `src/pages/writing/index.astro`, change the `WritingList` call to:

```astro
      <WritingList posts={postProps} showMore={false} filter="all" />
```

- [ ] **Step 2: Create `/essays`**

Create `src/pages/essays.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Rail from '../components/Rail.astro';
import WritingList from '../components/WritingList.astro';
import Footer from '../components/Footer.astro';
import { isLink, newestEssayId, toPostProps } from '../lib/links';

// Essays only — the long-form view of the notebook.
const posts = (await getCollection('writing'))
  .filter((p) => !p.data.draft && !isLink(p.data))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
const newestId = newestEssayId(posts);
const postProps = posts.map((p) => toPostProps(p, newestId));
---
<Base title="Essays — Alex Holley" description="The long-form writing, newest first.">
  <div class="page">
    <Rail name="Alex Holley" role="Words, design, tools & links" monogram="A" current="Writing" />

    <main class="main">
      <WritingList posts={postProps} showMore={false} filter="essays" />
      <Footer />
    </main>
  </div>
</Base>
```

- [ ] **Step 3: Create `/links`**

Create `src/pages/links.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Rail from '../components/Rail.astro';
import WritingList from '../components/WritingList.astro';
import Footer from '../components/Footer.astro';
import { isLink, newestEssayId, toPostProps } from '../lib/links';

/* Linked posts only — things worth pointing at, newest first. `newestEssayId`
   returns null for a links-only list, so nothing here gets the "New" tag. */
const posts = (await getCollection('writing'))
  .filter((p) => !p.data.draft && isLink(p.data))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
const newestId = newestEssayId(posts);
const postProps = posts.map((p) => toPostProps(p, newestId));
---
<Base title="Links — Alex Holley" description="Things worth pointing at, newest first.">
  <div class="page">
    <Rail name="Alex Holley" role="Words, design, tools & links" monogram="A" current="Writing" />

    <main class="main">
      <WritingList posts={postProps} showMore={false} filter="links" />
      <Footer />
    </main>
  </div>
</Base>
```

- [ ] **Step 4: Build and check the route set**

```bash
npm run build && ls dist/essays/index.html dist/links/index.html
```

Expected: both files exist.

- [ ] **Step 5: Verify each view holds the right entries**

```bash
grep -c 'class="post ' dist/essays/index.html; grep -c 'post--link' dist/essays/index.html
grep -c 'post--link' dist/links/index.html
```

Expected: `/essays` has 6 essay rows and **0** occurrences of `post--link`; `/links` has 1.

- [ ] **Step 6: Verify the filter control marks the current view**

```bash
grep -o 'aria-current="page">[A-Za-z]*' dist/writing/index.html dist/essays/index.html dist/links/index.html
```

Expected: `All`, `Essays`, `Links` respectively — exactly one per page.

- [ ] **Step 7: Commit**

```bash
git add src/pages/essays.astro src/pages/links.astro src/pages/writing/index.astro
git commit -m "feat: add the essays and links archive views"
```

---

### Task 4: The link permalink page

**Files:**
- Modify: `src/pages/writing/[...id].astro` (frontmatter + template + `<style>`)

**Interfaces:**
- Consumes: `sourceDomain` from Task 1.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Import the helper and derive the link fields**

In the frontmatter of `src/pages/writing/[...id].astro`, after the existing imports add:

```ts
import { sourceDomain } from '../../lib/links';
```

…and after the `const fmt = …` line add:

```ts
const src = post.data.sourceUrl;
```

- [ ] **Step 2: Branch the meta line, the title, and the end block**

Replace the whole `<article class="article">` element with:

```astro
  <article class="article">
    <a class="back" href="/">← Alex Holley</a>

    <div class="article__meta">
      <span class="label">{fmt.toUpperCase()}</span>
      <span class="sep">/</span>
      <span class="label">{src ? sourceDomain(src) : post.data.readingTime}</span>
    </div>

    {src ? (
      <h1 class="article__title">
        <a class="article__source" href={src}>{post.data.title}</a><span class="article__out" aria-hidden="true">↗</span>
      </h1>
      <p class="article__dek">{post.data.dek}</p>
    ) : (
      <h1 class="article__title">{post.data.title}</h1>
      <p class="article__dek">{post.data.dek}</p>
    )}

    <div class="prose">
      <Content />
    </div>

    <div class="article__end">
      {src
        ? <span class="article__star" aria-hidden="true">★</span>
        : <RegistrationMark size={14} />}
      <a href="/">Back to the notebook →</a>
    </div>
  </article>
```

- [ ] **Step 3: Add the styles**

In the same file's `<style>` block, after the `.prose :global(a)` rule, insert:

```css
  .article__source { color: inherit; }
  .article__source:hover { color: var(--color-brand-bright); }
  .article__out { margin-left: 10px; font-size: 24px; color: var(--color-teal-ink); }
  .article__star { font-size: 16px; color: var(--color-teal-ink); }

  /* Quoting a source — the tint block, so their voice and yours are
     visually separable. Applies to essays too; the site had no
     blockquote style at all before this. */
  .prose :global(blockquote) {
    margin: 28px 0 26px;
    padding: 22px 26px;
    background: var(--color-surface);
    border-radius: var(--radius-card);
  }
  .prose :global(blockquote p) {
    font-family: var(--font-serif);
    font-size: 17px;
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .prose :global(blockquote p:last-child) { margin-bottom: 0; }
  .prose :global(blockquote cite) {
    display: block;
    margin-top: 12px;
    font-family: var(--font-sans);
    font-style: normal;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-teal-ink);
  }
```

- [ ] **Step 4: Add a pull-quote to the sample link post**

In `src/content/writing/let-a-website-be-a-worry-stone.mdoc`, replace the body with:

```markdown
> The worry stone is not a monument. You are not building for posterity; you
> are building because the building is the thing.

The framing I keep coming back to is maintenance as its own reward. Not an
audience, not a funnel. Just the tending.
```

- [ ] **Step 5: Build and verify the link permalink**

```bash
npm run build && grep -oE '(article__source|article__out|article__star|<blockquote)' dist/writing/let-a-website-be-a-worry-stone/index.html | sort -u
```

Expected: all four present.

- [ ] **Step 6: Verify an essay permalink is unchanged apart from the sanctioned blockquote**

```bash
scripts/verify-parity.sh
```

Expected: **no essay permalink appears as `CHANGED` at all**, including `so-well-planned-it-feels-unplanned`. The quote style is pure CSS, so that essay's appearance changes while its markup does not, and parity compares markup. The only diffs should be the new routes and the link rows from Task 2. If any essay permalink shows a markup diff, stop and fix it — something has leaked into the essay branch.

- [ ] **Step 7: Confirm the quote's contrast in the browser**

Load `/writing/let-a-website-be-a-worry-stone` in both colour schemes and check:

```js
(() => {
  const lin = c => { c/=255; return c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4; };
  const L = s => { const [r,g,b] = s.match(/\d+/g).map(Number); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); };
  const ratio = (a,b) => { const [x,y] = [L(a),L(b)].sort((p,q)=>q-p); return ((x+0.05)/(y+0.05)).toFixed(2); };
  const bq = document.querySelector('.prose blockquote');
  const bg = getComputedStyle(bq).backgroundColor;
  return {
    body: ratio(getComputedStyle(bq.querySelector('p')).color, bg),
    star: ratio(getComputedStyle(document.querySelector('.article__star')).color,
                getComputedStyle(document.body).backgroundColor),
  };
})()
```

Expected light: body ≈ `12.93`, star ≈ `5.09`. Expected dark: body ≈ `13.91`, star ≈ `9.20`. Anything under `4.50` fails the build's intent — stop and fix.

- [ ] **Step 8: Commit**

```bash
git add "src/pages/writing/[...id].astro" src/content/writing/let-a-website-be-a-worry-stone.mdoc
git commit -m "feat: render the linked-post permalink and the quote block"
```

---

### Task 5: RSS

**Files:**
- Modify: `src/pages/rss.xml.js` (whole file)

**Interfaces:**
- Consumes: `isLink` from Task 1.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Find out whether `@astrojs/rss` already emits a `<guid>`**

```bash
npm run build && grep -c '<guid' dist/rss.xml
```

Record the answer. `0` means we add ours freely. Any other number means the package emits its own from `link`, and Step 2's `customData` would produce a **duplicate** — in that case keep `customData` but strip the generated one by post-processing the string the endpoint returns, and note it in the file's comment.

- [ ] **Step 2: Rewrite the feed**

Replace the whole of `src/pages/rss.xml.js`:

```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isLink } from '../lib/links';

/* Gruber's convention. For a linked post the item's <link> is the *source* —
   that is where a reader clicking the headline wants to go — while the
   permalink travels as a non-permalink <guid> for de-duplication and as the
   trailing ★, which is the only route back to our copy from a feed reader. */
export async function GET(context) {
  const posts = (await getCollection('writing'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const site = context.site.href.replace(/\/$/, '');

  return rss({
    title: 'Alex Holley — a working notebook',
    description: 'Product, design & small software — a working notebook.',
    site: context.site,
    items: posts.map((post) => {
      const permalink = `${site}/writing/${post.id}/`;
      const linked = isLink(post.data);
      const star = `<p><a href="${permalink}" title="Permanent link to this post">★</a></p>`;
      return {
        title: post.data.title,
        pubDate: post.data.date,
        link: linked ? post.data.sourceUrl : `/writing/${post.id}/`,
        description: linked
          ? `<![CDATA[<p>${post.data.dek}</p>${star}]]>`
          : post.data.dek,
        customData: `<guid isPermaLink="${linked ? 'false' : 'true'}">${permalink}</guid>`,
      };
    }),
  });
}
```

- [ ] **Step 3: Build and inspect both item shapes**

```bash
npm run build && python3 -c "
import re,sys
x=open('dist/rss.xml').read()
for m in re.findall(r'<item>.*?</item>', x, re.S)[:2]:
    print(re.sub(r'\s+',' ', m)[:400], '\n---')
"
```

Expected: the link item's `<link>` is `ethanmarcotte.com`, its `<guid isPermaLink="false">` is the gaspery permalink, and the ★ anchor is in the description. The essay item's `<link>` and `<guid isPermaLink="true">` match.

- [ ] **Step 4: Verify there is exactly one guid per item**

```bash
python3 -c "
import re
x=open('dist/rss.xml').read()
for i,m in enumerate(re.findall(r'<item>.*?</item>', x, re.S)):
    n=len(re.findall(r'<guid', m))
    print(i, n, 'OK' if n==1 else 'DUPLICATE — fix per Task 5 Step 1')
"
```

Expected: every line reports `1 OK`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/rss.xml.js
git commit -m "feat: carry linked posts in the feed with the source as the item link"
```

---

### Task 6: Keystatic authoring

**Files:**
- Modify: `keystatic.config.ts:22-36`

**Interfaces:**
- Consumes: the schema from Task 1.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Add the field and relax `readingTime`**

In `keystatic.config.ts`, replace the `writing` collection's `schema` block with:

```ts
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        sourceUrl: fields.text({
          label: 'Source URL',
          description: 'Paste a URL to make this a link post — the headline will point there instead of here. Leave empty for an essay.',
        }),
        date: fields.date({ label: 'Date' }),
        readingTime: fields.text({
          label: 'Reading time',
          description: 'Essays only. Leave empty on a link post.',
        }),
        dek: fields.text({
          label: 'Dek / remark',
          description: 'An essay’s standfirst, or a link post’s remark. Shown in the stream and the feed.',
          multiline: true,
        }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
      },
```

- [ ] **Step 2: Build to confirm the config still compiles**

```bash
npm run build
```

Expected: succeeds. Keystatic's config is type-checked during the build.

- [ ] **Step 3: Note the known worktree limitation**

Do **not** treat a blank `/keystatic` in a git worktree as a regression — it is a Vite `fs.allow` issue affecting worktrees only, documented in `docs/keystatic-setup.md`. Verify the CMS in the main checkout, or after merge.

- [ ] **Step 4: Commit**

```bash
git add keystatic.config.ts
git commit -m "feat: add the Source URL field to the Keystatic writing form"
```

---

### Task 7: Document and verify the whole feature

**Files:**
- Modify: `DESIGN.md` (§5 Components)
- Modify: `README.md:74-79` (the "Editing content" section)

**Interfaces:**
- Consumes: everything.
- Produces: the finished feature.

- [ ] **Step 1: Document the two new components in `DESIGN.md`**

In §5, after the `### Cards / Containers` entry, add:

```markdown
### Linked posts
A stream entry whose headline points out. Headline set at 18px against an
essay's 21px, so a busy link week never outranks the long-form. The source
domain replaces the reading time in the meta line. Two marks in
`--color-teal-ink`: a trailing ↗ on the headline (decorative, `aria-hidden`)
and a ★ below the remark that is the permalink back to our copy — the only
route home once the headline points away.

### Pull quote
`blockquote` inside `.prose`. Set on `--color-surface` with `--radius-card`,
body in the serif at 17px, attribution as a `<cite>` in `--color-teal-ink`
small caps. Separates a source's voice from your own.
```

- [ ] **Step 2: Correct the stale "Editing content" section in `README.md`**

Replace the two bullets under `## Editing content` with:

```markdown
- **New essay:** add a markdown file to `src/content/writing/` with `title`,
  `date`, `readingTime` and `dek`. Newest date sorts first; the latest essay
  gets the "New" tag.
- **New link post:** the same, but add `sourceUrl` and omit `readingTime`. The
  headline will point at the source, `dek` becomes the remark, and the ★ links
  back here. A Markdoc body is optional — use it for a pull quote.
- **New app:** add a YAML file to `src/content/apps/` (`status` is `live`,
  `dev` or `planning`; omit `url` for an unlinked entry).

Everything above is also editable through the CMS at `/keystatic`.
```

- [ ] **Step 3: Run the full verification sweep**

```bash
npm test && npm run build
```

Expected: `pass 8 / fail 0`, then a successful build listing `/essays`, `/links`, and the link permalink.

- [ ] **Step 4: Confirm drafts still stay out**

```bash
printf -- '---\ntitle: Draft link check\ndate: 2026-08-11\nsourceUrl: https://example.com/x\ndek: Scratch.\ndraft: true\n---\n' > src/content/writing/zz-draft-check.mdoc
npm run build >/dev/null 2>&1
ls dist/writing/ | grep -c 'zz-draft-check' || echo "0 — correctly excluded"
grep -c 'zz-draft-check' dist/links/index.html dist/rss.xml || echo "absent from links view and feed"
rm src/content/writing/zz-draft-check.mdoc
```

Expected: excluded everywhere. **Confirm the temp file is deleted** with `git status --short`.

- [ ] **Step 5: Browser sweep in both appearances**

Check `/`, `/writing`, `/essays`, `/links`, `/writing/let-a-website-be-a-worry-stone` and `/writing/the-two-ink-discipline` in light and dark. Confirm: no console errors, the filter marks the current view, link headlines are visibly smaller than essay headlines, and the ★ and ↗ read as teal in both schemes.

- [ ] **Step 6: Keyboard pass on a link row**

Tab through a link row on `/links`. Expected: two stops — the headline (going out) and the ★ (coming home) — both with a visible focus ring, and the ↗ never announced.

- [ ] **Step 7: Commit**

```bash
git add DESIGN.md README.md
git commit -m "docs: document linked posts and the pull-quote block"
```

---

## Done when

- `npm test` passes and `npm run build` emits `/essays`, `/links`, and a permalink for every non-draft entry.
- No essay page's markup differs from the Task 1 baseline.
- The feed carries both item shapes, one `<guid>` each, with the ★ reachable in every linked item.
- A link row offers exactly two keyboard stops, and every teal thing that is read measures ≥ 4.5:1 in both appearances.
