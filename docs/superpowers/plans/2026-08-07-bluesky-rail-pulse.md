# Bluesky Rail Pulse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small "latest Bluesky post" pulse to the bottom of the left rail, switchable from Keystatic.

**Architecture:** A single lib module owns all Bluesky knowledge and fails soft. `Rail.astro` awaits it at build time so the post is in the served HTML; a non-prerendered `/api/pulse.json` route on the existing Cloudflare Worker refreshes it client-side from an edge cache. A Keystatic `sidebar` singleton carries the on/off switch, the handle, and the staleness cutoff.

**Tech Stack:** Astro 5.18.2, `@astrojs/cloudflare` 12.6.13, `@keystatic/core` 0.6, Node 22 (`.nvmrc`), plain CSS with existing design tokens. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-07-bluesky-rail-pulse-design.md`

## Global Constraints

- **No new dependencies.** Everything here uses built-in `fetch` and existing packages.
- **No test framework in this repo, and none is being added.** Per spec §8, verification is by build and inspection. Every task below ends with exact commands and their expected output — treat those as the test cycle. Do not add Vitest.
- **Never use `innerHTML`.** Post text reaches the DOM via `textContent` only.
- **The lib never throws.** Every failure path returns `null`.
- **Reuse existing design tokens.** No new colours, no new font sizes outside the tokens in `src/styles/global.css`. Do not restyle anything that already exists.
- **Handle:** `alexholley.bsky.social`. **Endpoint:** `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed` (no auth, no key).
- **Truncation:** 100 characters, cut at the last space at or before 100, append `…` (U+2026).
- **Cache header on the route, verbatim:** `public, s-maxage=3600, stale-while-revalidate=86400`
- Commit after every task. Conventional-commit prefixes (`feat:`, `style:`, `chore:`), matching this repo's history.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/data/sidebar/index.json` | **Create.** Config values, written by Keystatic. |
| `keystatic.config.ts` | **Modify.** Add the `sidebar` singleton. |
| `src/lib/bskyPulse.ts` | **Create.** The only module that knows Bluesky exists: fetch, filter, normalise, age-format, fail soft. |
| `src/pages/api/pulse.json.ts` | **Create.** On-demand route wrapping the lib. |
| `src/components/Pulse.astro` | **Create.** Presentation only — markup plus refresh script. |
| `src/components/Rail.astro` | **Modify.** Await the lib, render `<Pulse>`. |
| `src/styles/global.css` | **Modify.** One `.pulse` block; bump `.colophon` mobile order. |

No page files change. `Rail.astro` fetches for itself.

---

## Task 1: Keystatic switch and config data

The switch lands first so that every later task has something real to read, and so the off-state is provable from the start.

**Files:**
- Create: `src/data/sidebar/index.json`
- Modify: `keystatic.config.ts` (add a singleton after the `home` singleton, which ends at line 137)

**Interfaces:**
- Consumes: nothing.
- Produces: `src/data/sidebar/index.json`, importable as a module with the shape `{ pulseEnabled: boolean; pulseHandle: string; pulseMaxAgeDays: number }`.

- [ ] **Step 1: Create the config file**

Create `src/data/sidebar/index.json`:

```json
{
  "pulseEnabled": true,
  "pulseHandle": "alexholley.bsky.social",
  "pulseMaxAgeDays": 90
}
```

- [ ] **Step 2: Register the singleton in Keystatic**

In `keystatic.config.ts`, inside the `singletons: { ... }` object, add a `sidebar` entry after the existing `home` singleton. The `home` singleton closes with `}),` — add this immediately after it, before the closing `},` of `singletons`:

```ts
    sidebar: singleton({
      label: 'Sidebar',
      path: 'src/data/sidebar/',
      format: { data: 'json' },
      schema: {
        pulseEnabled: fields.checkbox({
          label: 'Show latest Bluesky post',
          defaultValue: true,
        }),
        pulseHandle: fields.text({
          label: 'Bluesky handle',
          defaultValue: 'alexholley.bsky.social',
        }),
        pulseMaxAgeDays: fields.number({
          label: 'Hide posts older than (days)',
          defaultValue: 90,
        }),
      },
    }),
```

No new imports are needed — `singleton` and `fields` are already imported on line 1.

- [ ] **Step 3: Verify the panel renders**

Run:

```bash
npm run dev
```

Open `http://localhost:4321/keystatic` in a browser. Expected: a **Sidebar** entry in the left-hand list alongside About page, Now page, and Homepage. Opening it shows three controls — a checked "Show latest Bluesky post" checkbox, a "Bluesky handle" text field reading `alexholley.bsky.social`, and a "Hide posts older than (days)" number field reading `90`.

Stop the dev server (Ctrl-C) before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/data/sidebar/index.json keystatic.config.ts
git commit -m "feat: add sidebar singleton for rail pulse config"
```

---

## Task 2: The lib and the API route

These ship together because the route is the only way to exercise the lib without a component, and a reviewer cannot sensibly accept one without the other.

**Files:**
- Create: `src/lib/bskyPulse.ts`
- Create: `src/pages/api/pulse.json.ts`

**Interfaces:**
- Consumes: `src/data/sidebar/index.json` from Task 1.
- Produces, all from `src/lib/bskyPulse.ts`:
  - `type Pulse = { text: string; url: string; isoDate: string }`
  - `isPulseEnabled(): boolean`
  - `fetchLatestPost(): Promise<Pulse | null>` — uncached
  - `getLatestPost(): Promise<Pulse | null>` — memoised, build-time only
  - `ageToken(isoDate: string, now?: number): string`
- Also produces the route response shape: `{ post: { text: string; url: string; isoDate: string; age: string } | null }`

- [ ] **Step 1: Write the lib**

Create `src/lib/bskyPulse.ts`:

```ts
import sidebar from '../data/sidebar/index.json';

/* The only module that knows Bluesky exists. Everything above it deals in
   `Pulse | null` and never has to handle a network error. */

export type Pulse = { text: string; url: string; isoDate: string };

const ENDPOINT = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
const MAX_CHARS = 100;
const TIMEOUT_MS = 4000;

const handle = () => (sidebar.pulseHandle ?? '').trim();

export function isPulseEnabled(): boolean {
  return sidebar.pulseEnabled === true && handle().length > 0;
}

export function ageToken(isoDate: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(isoDate)) / 60_000);
  if (minutes < 60) return 'now';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function truncate(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length <= MAX_CHARS) return text;
  const cut = text.slice(0, MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

export async function fetchLatestPost(): Promise<Pulse | null> {
  if (!isPulseEnabled()) return null;
  const actor = handle();
  const url = `${ENDPOINT}?actor=${encodeURIComponent(actor)}&limit=10&filter=posts_no_replies`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { feed?: any[] };
    const feed = Array.isArray(data.feed) ? data.feed : [];
    /* Clearing the number field in Keystatic writes null, which would make
       every comparison against NaN false and disable the cutoff silently. */
    const cutoffMs = (Number(sidebar.pulseMaxAgeDays) || 90) * 86_400_000;

    for (const item of feed) {
      if (item?.reason) continue;              // a repost, not their post
      const post = item?.post;
      const record = post?.record;
      if (!post || !record) continue;
      if (record.reply) continue;              // defensive: the filter param misses these
      const isoDate = record.createdAt;
      if (!isoDate || Number.isNaN(Date.parse(isoDate))) continue;
      const text = truncate(record.text ?? '');
      if (!text) continue;
      const rkey = String(post.uri ?? '').split('/').pop();
      if (!rkey) continue;

      /* Age is enforced here, not at render time, so the route and the
         component can never disagree about what counts as too old. */
      if (Date.now() - Date.parse(isoDate) > cutoffMs) return null;

      return { text, url: `https://bsky.app/profile/${actor}/post/${rkey}`, isoDate };
    }
    return null;
  } catch {
    return null;
  }
}

/* Memoised for build time only: one request per build no matter how many
   pages render the rail. Deliberately NOT used by the API route -- a
   module-level cache lives as long as the Worker isolate, which would
   freeze the endpoint on one post long past its edge-cache expiry. */
let cached: Promise<Pulse | null> | undefined;
export function getLatestPost(): Promise<Pulse | null> {
  cached ??= fetchLatestPost();
  return cached;
}
```

- [ ] **Step 2: Write the API route**

Create `src/pages/api/pulse.json.ts`:

```ts
import type { APIRoute } from 'astro';
import { fetchLatestPost, ageToken } from '../../lib/bskyPulse';

/* The site's only on-demand route. Everything else prerenders. */
export const prerender = false;

export const GET: APIRoute = async () => {
  const post = await fetchLatestPost();
  const body = post ? { post: { ...post, age: ageToken(post.isoDate) } } : { post: null };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
```

Note it always returns 200 — a failure is `{"post":null}`, never an error status, so a bad upstream moment is never cached as an error.

- [ ] **Step 3: Verify the happy path**

Start the dev server in one terminal:

```bash
npm run dev
```

In another terminal:

```bash
curl -s -D- http://localhost:4321/api/pulse.json
```

Expected: `HTTP/1.1 200 OK`, a `cache-control: public, s-maxage=3600, stale-while-revalidate=86400` header, and a body of the form `{"post":{"text":"…","url":"https://bsky.app/profile/alexholley.bsky.social/post/…","isoDate":"…","age":"…"}}`. The `url` must end in a record key like `3mrkkx33o622j`, and `age` must match the `d`/`h`/`mo` grammar.

- [ ] **Step 4: Verify the off switch**

Edit `src/data/sidebar/index.json` and set `"pulseEnabled": false`. The dev server hot-reloads. Then:

```bash
curl -s http://localhost:4321/api/pulse.json
```

Expected: exactly `{"post":null}`.

Now set `pulseEnabled` back to `true` and set `"pulseHandle": ""`. Re-run the same curl. Expected: `{"post":null}` again — an empty handle counts as off.

- [ ] **Step 5: Verify soft failure and the age cutoff**

Set `"pulseHandle": "this-handle-does-not-exist.invalid"` and re-run the curl. Expected: `{"post":null}` — a 400 from Bluesky must not surface as an error.

Restore `"pulseHandle": "alexholley.bsky.social"`, then set `"pulseMaxAgeDays": 1`. Re-run the curl. Expected: `{"post":null}` — the newest real post is older than a day.

Finally restore the file to its Task 1 state:

```json
{
  "pulseEnabled": true,
  "pulseHandle": "alexholley.bsky.social",
  "pulseMaxAgeDays": 90
}
```

Confirm with a final curl that a real post comes back. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/lib/bskyPulse.ts src/pages/api/pulse.json.ts
git commit -m "feat: fetch latest Bluesky post via lib and on-demand route"
```

---

## Task 3: Render the pulse in the rail

Server-rendered only. The refresh script comes in Task 4, so this task is reviewable as "does it look right and is the post in the HTML".

**Files:**
- Create: `src/components/Pulse.astro`
- Modify: `src/components/Rail.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `Pulse`, `isPulseEnabled`, `getLatestPost`, `ageToken` from Task 2.
- Produces: a `.pulse` block in the rail with `[data-pulse-link]`, `[data-pulse-text]`, `[data-pulse-age]` hooks that Task 4 targets.

- [ ] **Step 1: Create the component**

Create `src/components/Pulse.astro`. Presentation only — it receives a post and formats it. A future "dispatch card" treatment rewrites this file and the CSS block from Step 3, and nothing else.

```astro
---
import { ageToken, type Pulse } from '../lib/bskyPulse';

interface Props { post: Pulse; }
const { post } = Astro.props;
---
<div class="pulse">
  <a class="pulse__link" href={post.url} data-pulse-link>
    <div class="pulse__head">
      <span class="pulse__dot" aria-hidden="true"></span>
      <span class="label">Latest · <span data-pulse-age>{ageToken(post.isoDate)}</span></span>
    </div>
    <p class="pulse__text" data-pulse-text>{post.text}</p>
  </a>
</div>
```

The label string stays lowercase; `.label` already applies `text-transform: uppercase`, so it renders as `LATEST · 12D`.

- [ ] **Step 2: Wire it into the rail**

In `src/components/Rail.astro`, add two imports to the frontmatter, immediately after the existing `import RegistrationMark` on line 2:

```astro
import Pulse from './Pulse.astro';
import { isPulseEnabled, getLatestPost } from '../lib/bskyPulse';
```

Then, after the `} = Astro.props;` line that closes the props destructure (line 33), add:

```astro
const pulse = isPulseEnabled() ? await getLatestPost() : null;
```

In the markup, insert the pulse between the closing `</div>` of `.elsewhere-group` and the opening `<div class="colophon">`:

```astro
  {pulse && <Pulse post={pulse} />}
```

Do not change anything else in this file.

- [ ] **Step 3: Add the styles**

In `src/styles/global.css`, add this block immediately after the `.elsewhere a:hover` rule (currently line 149) and before the `/* Colophon */` comment:

```css
/* Rail pulse — latest Bluesky post. Structured like the other rail groups
   on purpose: the head doubles as the group title, so the age rides the
   label instead of taking a line of its own. */
.pulse { display: flex; flex-direction: column; gap: 14px; }
.pulse__head {
  display: flex; align-items: center; gap: 7px;
  padding-bottom: 4px; border-bottom: 1px solid var(--color-hairline);
}
.pulse__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-teal); flex-shrink: 0; }
.pulse__text { font-size: 13px; line-height: 1.5; color: var(--color-ink); transition: color .15s ease; }
.pulse__link:hover .pulse__text { color: var(--color-brand-bright); }
```

Then, in the `@media (max-width: 860px)` block, find the line reading `.colophon   { order: 7; }` and replace it with these two lines, keeping the surrounding alignment:

```css
  .pulse      { order: 7; }
  .colophon   { order: 8; }
```

- [ ] **Step 4: Verify it renders and is in the HTML**

```bash
npm run dev
```

Then, in another terminal:

```bash
curl -s http://localhost:4321/ | grep -A4 'class="pulse"'
```

Expected: the real post text appears in the served HTML — this is the no-JS guarantee, so the text must be present here, not just in the browser.

In the browser at `http://localhost:4321/`, confirm: the pulse sits below Elsewhere and above the colophon; the head reads `LATEST · 12D` (or whatever the current age is) with a teal dot; the text is one to three lines at rail width; hovering turns the text magenta.

- [ ] **Step 5: Verify mobile placement**

With the dev server still running, open devtools and set the viewport to 375px wide. Expected: the pulse appears near the bottom of the single-column flow — after the subscribe/footer block, directly above the colophon paragraph about Merriweather and Inter.

- [ ] **Step 6: Verify the off switch hides it completely**

Set `"pulseEnabled": false` in `src/data/sidebar/index.json`, then:

```bash
curl -s http://localhost:4321/ | grep -c 'class="pulse"'
```

Expected: `0` — no empty container, no placeholder, nothing. Restore `"pulseEnabled": true` and confirm the count returns to `1`. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/Pulse.astro src/components/Rail.astro src/styles/global.css
git commit -m "feat: render latest Bluesky post in the left rail"
```

---

## Task 4: Client-side refresh

**Files:**
- Modify: `src/components/Pulse.astro`

**Interfaces:**
- Consumes: the `[data-pulse-link]` / `[data-pulse-text]` / `[data-pulse-age]` hooks from Task 3, and the `/api/pulse.json` response shape from Task 2.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the script**

Append this to the bottom of `src/components/Pulse.astro`, after the closing `</div>` of `.pulse`:

```astro
<script is:inline>
  /* Build-time HTML is already correct; this only catches posts made since
     the last deploy. It updates an existing block and never creates one --
     if the build found nothing, the rail stays short until the next deploy. */
  (async () => {
    const root = document.querySelector('.pulse');
    if (!root) return;
    try {
      const res = await fetch('/api/pulse.json');
      if (!res.ok) return;
      const { post } = await res.json();
      if (!post) return;
      const link = root.querySelector('[data-pulse-link]');
      const text = root.querySelector('[data-pulse-text]');
      const age = root.querySelector('[data-pulse-age]');
      if (!link || !text || !age) return;
      if (link.getAttribute('href') === post.url) return;
      link.setAttribute('href', post.url);
      text.textContent = post.text;
      age.textContent = post.age;
    } catch {
      /* leave the server-rendered post in place */
    }
  })();
</script>
```

`is:inline` keeps Astro from bundling fifteen lines into a separate request. `textContent` is deliberate — never `innerHTML`.

- [ ] **Step 2: Verify the script is a no-op when nothing changed**

```bash
npm run dev
```

Load `http://localhost:4321/` with devtools open. Expected on the Network tab: one request to `/api/pulse.json` returning 200. Expected on the Console tab: no errors. The rendered text must be unchanged, because the build-time and runtime values agree — the early `href` comparison returns before touching the DOM.

- [ ] **Step 3: Verify it actually updates when the values differ**

Prove the update path fires rather than assuming it. With the dev server running, temporarily edit the rendered baseline: in `src/components/Pulse.astro`, change `{post.text}` to `{'STALE PLACEHOLDER'}` and change `href={post.url}` to `href="https://bsky.app/stale"`.

Reload the page. Expected: the text flips from `STALE PLACEHOLDER` to the real post shortly after load, and the age token populates from the endpoint.

Revert both edits before continuing, and reload once more to confirm the real post renders server-side again.

- [ ] **Step 4: Verify graceful degradation**

In devtools, disable JavaScript and reload. Expected: the pulse still renders with the real post — the server HTML carries it.

Re-enable JavaScript. Set `"pulseEnabled": false` in `src/data/sidebar/index.json`, reload, and confirm the console shows no errors — the script's `if (!root) return;` guard handles the missing block. Restore `"pulseEnabled": true`. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Pulse.astro
git commit -m "feat: refresh rail pulse from the edge-cached endpoint"
```

---

## Task 5: Production build and route verification

**Correction to spec §9, established during Task 2:** the spec claims this is the site's first on-demand route. It is not. `@keystatic/astro` already injects `/keystatic/[...params]` and `/api/keystatic/[...params]`, both of which are Worker-handled — they appear in the worker manifest and have no static directory in `dist`. The original check grepped `src/` for `prerender`, which cannot see integration-injected routes. `_routes.json` therefore already had its final shape (`include: ["/*"]` plus an exclude list of prerendered paths) and `.assetsignore` was already load-bearing. The risk here is lower than the spec states.

What still needs proving: that `/api/pulse.json` lands in the worker bundle rather than as a static file, and that it actually responds through Wrangler. **`astro dev` will happily serve a route that is misconfigured in production**, so the dev-server checks in earlier tasks do not establish this.

**Files:** none modified. This task is verification only, plus a possible fix if it fails.

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: nothing.

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: exit code 0. In the output, `/api/pulse.json` is listed as a server route (not prerendered) while `/`, `/about`, `/now`, `/writing`, and the app pages are listed as prerendered.

- [ ] **Step 2: Confirm the route split**

```bash
cat dist/_routes.json && echo '---' && cat dist/.assetsignore
```

Expected: `_routes.json` `include`s `/api/pulse.json` (or a pattern covering it) so the Worker handles it, while static assets stay excluded. `.assetsignore` contains `_worker.js` and `_routes.json`, written by the existing `postbuild` script.

- [ ] **Step 3: Confirm the post is baked into the built HTML**

```bash
grep -o 'class="pulse__text"[^<]*<' dist/index.html | head -1
```

Expected: the real post text. If this is empty, the build-time fetch failed and the pulse would ship absent — investigate before deploying rather than shipping a silently dead feature.

- [ ] **Step 4: Serve the real Worker locally**

```bash
npm run preview
```

This runs the built Worker through Wrangler rather than Astro's dev server. In another terminal:

```bash
curl -s -D- http://localhost:4321/api/pulse.json | head -20
```

Expected: 200, the `cache-control` header verbatim, and a real post. Also load `http://localhost:4321/` in a browser and confirm the pulse renders and the Network tab shows the endpoint returning 200.

**Confirmed during execution: `npm run preview` does not work in this repo.** `@astrojs/cloudflare` does not support `astro preview`, so the script at `package.json:12` fails immediately without binding a port. Use `npx wrangler dev` instead, which serves the built Worker on **port 8787**. Substitute that port in the curl above. This is a pre-existing repo issue, unrelated to the pulse.

- [ ] **Step 5: Commit any fix**

If Steps 1–4 all passed, there is nothing to commit — say so and move on. If a fix to `astro.config.mjs`, `wrangler.jsonc`, or the `postbuild` script was needed:

```bash
git add -A
git commit -m "fix: configure the first on-demand route for the Worker build"
```

- [ ] **Step 6: Post-deploy check (requires the branch to be merged and deployed)**

Once the branch is merged to `main` and Workers Builds has deployed:

```bash
curl -s -D- https://gaspery.com/api/pulse.json | head -20
```

Expected: 200 with a real post and the cache header. Load `https://gaspery.com/` and confirm the pulse renders in the rail.

Then confirm the switch works end to end in the real UI: at `https://gaspery.com/keystatic`, open **Sidebar**, untick "Show latest Bluesky post", and save. Wait for the deploy to finish (a minute or two — it commits to `main` and triggers Workers Builds), then reload the homepage and confirm the pulse is gone and `/api/pulse.json` returns `{"post":null}`. Re-tick it and confirm it comes back.
