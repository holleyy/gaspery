# Bluesky Rail Pulse — Design

**Date:** 2026-08-07
**Status:** Approved design, ready for implementation planning
**Repo:** `holleyy/gaspery` (branch `main`)

## 1. Context & goal

The left rail currently ends: identity → Index → Elsewhere → colophon. Everything in it is hand-authored, and the rail's argument is that nothing in it was left to chance.

The goal is a small, honest signal that the person behind the site is active — a **pulse**, not a feed. One line of the most recent post, its age, and a link out. It sits below Elsewhere, above the colophon.

## 2. Decisions

**Source: Bluesky only (`alexholley.bsky.social`).**
Mastodon (`@alexholley@mastodon.social`) was considered and rejected. Its voice is more developer-facing — JIRA, Teams, RSS-vs-newsletter — but the account is dormant: 14 posts across 3¼ years, only two in the last 26 months, and the most recent is a 27-character reaction. A pulse wired to it would be hidden for most of the year. Bluesky posts roughly weekly-to-monthly and the posts are self-contained.

**Freshness: build-time baseline + on-demand refresh.**
The site prerenders to static, and deploys fire on Keystatic saves. A build-time-only fetch would let the rail state "12 days ago" on a morning the post was hours old — wrong, not merely stale. So the build renders a real post into the HTML (correct without JS, no layout shift, never empty), and a small inline script refreshes it from an edge-cached Worker route.

**Presentation: the quiet variant.**
Teal dot + `LATEST · 12D` on one label line, post text below, whole block linking out. Age folds into the label rather than taking its own line. Rejected: a serif, quote-marked treatment, which promotes an automated post to a pull-quote and over-promises on something unselected.

**A kill switch is a first-class requirement, not an afterthought.**
The feature must be switchable from `/keystatic` without a code change.

### Known trade-off, accepted

Roughly six of ten recent posts read well cold. The rest are either legible-but-empty ("YES ARSENAL") or opaque — the most recent post is a layered joke requiring both *Industry* and Marvel casting news to land. The failure mode is *mildly confusing*, not embarrassing, and the posts that do land are self-deprecating and developer-facing. This is accepted deliberately: sanding the personality off leaves a worse version of the Writing list, which already does considered thoughts with real craft.

## 3. Architecture

Five source files, plus the two Keystatic changes described in §6 (`keystatic.config.ts` and a seeded `src/data/sidebar/index.json`). The seam is placed so that a future "dispatch card" treatment touches only presentation.

| File | Responsibility |
| --- | --- |
| `src/lib/bskyPulse.ts` | The only module that knows Bluesky exists. Fetch, filter, normalise, fail soft. |
| `src/pages/api/pulse.json.ts` | On-demand route (`prerender = false`). Wraps the lib, sets cache headers. |
| `src/components/Pulse.astro` | Presentation only: markup + refresh script. |
| `src/components/Rail.astro` | Awaits the lib in frontmatter, renders `<Pulse>`. |
| `src/styles/global.css` | One `.pulse` block + a mobile `order`. |

`Rail.astro` fetches for itself, so **no page files change**. The lib memoises its promise at module level, so a build rendering many pages makes one request.

## 4. Data contract

```ts
type Pulse = { text: string; url: string; isoDate: string };

fetchLatestPost(): Promise<Pulse | null>  // uncached — used by the API route
getLatestPost():   Promise<Pulse | null>  // memoised wrapper — used at build time
ageToken(isoDate: string): string         // pure formatter, no I/O
isPulseEnabled(): boolean
```

**The memoisation is build-time only, and the split matters.** A module-level cache lives as long as the Worker isolate does, so an endpoint calling the memoised function would keep serving one frozen post well past its edge-cache expiry. The route calls `fetchLatestPost()`; only build-time rendering calls `getLatestPost()`.

`ageToken` is computed server-side in both paths — the API route returns it alongside the post — so the browser never does date maths and there is one implementation of the rule.

**Request:** `GET https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor={handle}&limit=10&filter=posts_no_replies`

No auth, no key. `limit=10` rather than `1` so that skipped items leave a fallback candidate. A 4-second `AbortSignal.timeout` bounds the call so a hung upstream cannot stall a build.

**Filtering.** Walk the feed in order and take the first item that is neither a repost (`item.reason` present) nor a reply (`post.record.reply` present). `filter=posts_no_replies` already excludes replies; the check is defensive, because that parameter does not exclude reposts.

**Normalisation.**
- `text` — collapse all whitespace runs (including newlines) to single spaces, then trim. If longer than 100 characters, cut at the last space at or before 100 and append `…`; if there is no such space, hard-cut at 100 and append `…`.
- `url` — `https://bsky.app/profile/{handle}/post/{rkey}`, where `rkey` is the final path segment of `post.uri` (e.g. `at://did:plc:…/app.bsky.feed.post/3mrkkx33o622j` → `3mrkkx33o622j`).
- `isoDate` — `post.record.createdAt`, passed through unchanged. An item whose `createdAt` is missing or fails to parse as a date is treated as invalid and skipped along with reposts and replies, since age is what the pulse is actually asserting.

**Failure.** Any non-200, network error, timeout, malformed payload, or empty result set returns `null`. The function never throws.

## 5. Rendering & behaviour

```html
<div class="pulse">
  <a class="pulse__link" href="{url}">
    <div class="pulse__head">
      <span class="pulse__dot"></span>
      <span class="label">Latest · 12D</span>
    </div>
    <p class="pulse__text">Buy the dip, short the VIX, Wakanda Forever</p>
  </a>
</div>
```

**Age token**, appended to the label after `·`: under 60 minutes → `now`; under 24 hours → `{n}h`; under 30 days → `{n}d`; otherwise `{n}mo` where `n = floor(days / 30)`. The source string is lowercase; the existing `.label` rule applies `text-transform: uppercase`, so it renders as `LATEST · 12D` without the component hardcoding case.

**The block renders nothing at all** — no spinner, no error text, no empty container — when the lookup returns `null` or the feature is disabled. The `pulseMaxAgeDays` cutoff is applied inside the lib rather than at render time, so the route and the component cannot disagree about what counts as too old. Absence is the correct empty state; a rail that admits it failed to load is worse than a rail that is simply shorter.

**Styling** reuses existing tokens throughout: `.label` for the head, `var(--color-teal)` for a 7px dot matching `.now-panel__head .dot` exactly, `var(--color-ink)` at 13px/1.5 for the text, `var(--color-hairline)` for the group rule. Hover shifts the text to `var(--color-brand-bright)`, consistent with every other rail link.

**Refresh script.** After load, fetch `/api/pulse.json`. If the returned post differs from what is rendered, update the text via `textContent`, the `href`, and the age token — never `innerHTML`. If the response is `null` or the fetch fails, leave the server-rendered markup untouched. Without JavaScript nothing degrades, because the server HTML is already correct.

The script **updates an existing block; it never creates one.** So if the build-time fetch found nothing — an upstream blip, or a post already past the age cutoff — the pulse stays absent until the next deploy, even if the endpoint would now return something. Accepted deliberately: the alternative is duplicating the markup inside the script, and the failure is one shorter rail section on a site that redeploys on every content save.

**Mobile.** The rail unspools via hand-assigned `order` values at the 860px breakpoint. The pulse takes `order: 7`, directly above the colophon, which moves from `7` to `8`. It is the least important element on a phone, and placing it mid-flow would interrupt the run from Elsewhere into the subscribe block.

## 6. Keystatic control

A new singleton, `src/data/sidebar/index.json`, following the established `now` / `home` pattern:

```ts
sidebar: singleton({
  label: 'Sidebar',
  path: 'src/data/sidebar/',
  format: { data: 'json' },
  schema: {
    pulseEnabled: fields.checkbox({ label: 'Show latest Bluesky post', defaultValue: true }),
    pulseHandle: fields.text({ label: 'Bluesky handle', defaultValue: 'alexholley.bsky.social' }),
    pulseMaxAgeDays: fields.number({ label: 'Hide posts older than (days)', defaultValue: 90 }),
  },
}),
```

It is a **Sidebar** singleton rather than a field under Homepage because the rail appears on every page, so filing it under Homepage would misrepresent its reach.

When `pulseEnabled` is false, `Rail.astro` skips the fetch entirely and renders nothing, **and** `/api/pulse.json` short-circuits to `{ "post": null }` without calling Bluesky — so a cached page running an old script cannot keep the requests alive. An empty or whitespace-only `pulseHandle` is treated identically to disabled, so clearing the field in the UI cannot produce a malformed request.

**Timing caveat:** toggling in Keystatic commits to `main` and triggers a Workers build, so the change lands on the next deploy — a minute or two — not instantly. This matches how every other content change on the site behaves.

`pulseMaxAgeDays` defaults to 90. Real gaps in the feed run about six weeks, so 90 tolerates a normal quiet spell while still catching genuine abandonment.

## 7. Caching

`/api/pulse.json` returns `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`. Cloudflare's edge serves it, so Bluesky sees roughly one request per hour per colo regardless of traffic. The route always returns HTTP 200 — `{ post: null }` on failure — so a failed upstream is never cached as an error response.

## 8. Verification plan

The repo has no test framework. Verification is by build and inspection:

1. `npm run build` succeeds; `dist/_routes.json` lists `/api/pulse.json` as non-static while everything else stays prerendered.
2. `npm run preview` → `curl -i localhost:4321/api/pulse.json` returns the current post and the expected `Cache-Control` header.
3. Dev server: the pulse renders below Elsewhere at desktop width, and above the colophon at 375px.
4. View source with JS disabled: the real post text is present in the served HTML.
5. Set `pulseEnabled: false`, rebuild — pulse absent from markup, endpoint returns `{ post: null }`.
6. Point `pulseHandle` at a nonexistent handle, rebuild — build still succeeds, pulse absent.
7. Set `pulseMaxAgeDays: 1`, rebuild — pulse absent (the live post is 12 days old).
8. Deployed Worker: confirm `/api/pulse.json` responds in production, not just in preview.

Steps 5–7 are performed by temporary edits and reverted afterwards.

The normaliser in `bskyPulse.ts` is the one genuinely unit-testable surface — repost skipping, truncation on a word boundary, permalink construction, empty-feed handling. Adding Vitest for it is a reasonable option but is **not** part of this spec; the checks above cover the same ground for a five-function module.

## 9. Risks

**This is the site's first on-demand route.** Every route prerenders today, so the Worker only ever serves static assets. Adding one changes the shape of `_routes.json` and makes the `postbuild` `.assetsignore` step load-bearing in a way it has not been. Verification must include a real build and a deployed check — `astro dev` will happily serve a route that misconfigures in production.

**The build now touches a third party.** Mitigated by the 4-second timeout, soft failure, and memoisation: worst case the build is a few seconds slower and the pulse is absent that deploy.

**Legibility is a coin flip** (~6 in 10). Accepted, per §2. If it grates in practice, the smallest fix is to pull the latest post carrying a specific tag rather than the latest post outright — a change confined to the filter step in `bskyPulse.ts`.

## 10. Out of scope

- Mastodon as a source, and any merged multi-network feed.
- The "dispatch card" treatment. Deliberately left reachable: it would rewrite `Pulse.astro` and the CSS block only, leaving the lib and the endpoint untouched.
- Tag-filtered pulses (noted above as a fallback, not built).
- Post images, embeds, link cards, or rich-text facet rendering — the pulse is plain text.
- The placeholder `hello@example.com` and bare `github.com` entries in `Rail.astro`'s `elsewhere` defaults. A real bug, unrelated to this work.
