# Deploy guide

Copy-paste steps for running this site locally, adding content, and shipping it to
Cloudflare Pages. See [README.md](README.md) for the theme itself.

## Local dev

```sh
npm install
npm run dev
```

Site runs at `http://localhost:4321`. `npm run build` outputs the static site to `dist/`;
`npm run preview` serves that build locally.

Node version is pinned in `.nvmrc` (22). If you use nvm: `nvm use`.

## Adding content

### A new blog post

Add a markdown file to `src/content/writing/`, e.g. `src/content/writing/my-new-post.md`:

```md
---
title: My new post
date: 2026-07-19
readingTime: 5 min
dek: One or two sentences describing the post — shown in the list view and RSS.
---

Post content in markdown goes here.

## A subheading

More content.
```

Frontmatter fields (defined in `src/content.config.ts`):

| Field         | Type    | Required | Notes                                      |
| ------------- | ------- | -------- | ------------------------------------------- |
| `title`       | string  | yes      |                                              |
| `date`        | date    | yes      | `YYYY-MM-DD`. Newest date sorts first.      |
| `readingTime` | string  | yes      | Free text, e.g. `"5 min"`.                  |
| `dek`         | string  | yes      | Standfirst/summary shown in list + RSS.     |
| `draft`       | boolean | no       | Defaults to `false`. `true` hides the post. |

The most recent non-draft post is automatically tagged "New" on the homepage.

### A new app

Add a record to the array in `src/content/apps.json`:

```json
{
  "id": "my-app",
  "name": "My App",
  "dek": "One sentence describing what it does.",
  "meta": "macOS · SwiftUI",
  "status": "live",
  "url": "https://example.com/my-app",
  "order": 5
}
```

Fields (defined in `src/content.config.ts`):

| Field    | Type                | Required | Notes                                   |
| -------- | ------------------- | -------- | ---------------------------------------- |
| `id`     | string               | yes      | Unique slug.                             |
| `name`   | string               | yes      | App title.                               |
| `dek`    | string               | yes      | Tagline.                                 |
| `meta`   | string               | yes      | Platform/tech line, e.g. `"Web tool"`.   |
| `status` | `"live"` \| `"wip"`  | yes      | Drives the status pill.                  |
| `url`    | string               | no       | Omit for an unlinked (not-yet-live) app. |
| `order`  | number               | yes      | Sort order, ascending.                   |

## Deploy to Cloudflare (recommended)

**1. Push to GitHub.** Create an empty repo on GitHub first, then:

```sh
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

**2. Connect to Cloudflare.**

Cloudflare's Git-connected onboarding now goes through **Workers** rather than a separate
"Pages" product, and deploys via Wrangler instead of a framework-preset picker — so you
won't see a "Framework preset" or "Build output directory" field. That's expected.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → connect the repo
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy` (Cloudflare fills this in by default)
4. Deploy

This repo already has `wrangler.jsonc` at the root, which is what tells `wrangler deploy`
where the static build output lives:

```jsonc
{
	"name": "gaspery",
	"compatibility_date": "2026-07-19",
	"assets": { "directory": "./dist" }
}
```

Without this file, `npx wrangler deploy` has nothing to deploy and the build step fails —
if you ever start a similar project from scratch, add this file before connecting Git.

That's it — Cloudflare builds and hosts it on the free tier. Every push to `main` triggers
an automatic redeploy; pushes to other branches get their own preview URL (via `npx
wrangler versions upload`, which Cloudflare also fills in by default).

## Alternative: Netlify

1. New site from Git → select the repo
2. Build command: `npm run build`
3. Publish directory: `dist`

## Custom domain

1. In the Cloudflare dashboard, open the Worker project → **Settings** → **Domains &
   Routes** (or **Custom domains**, depending on what Cloudflare labels it when you get
   there) → add your domain. Cloudflare walks you through DNS if the domain is already on
   Cloudflare, or gives you a CNAME target otherwise.
2. Update `site` in `astro.config.mjs` to the real domain:
   ```js
   site: 'https://your-actual-domain.com',
   ```
3. Commit and push — this updates canonical URLs, the sitemap, and the RSS feed to use
   the real domain:
   ```sh
   git add astro.config.mjs
   git commit -m "Set production domain"
   git push
   ```

## Before you go live

A few placeholders ship with the theme and are **intentionally left for you** to fill in
or remove — they won't break the build, but they're worth a pass before sharing the URL:

- `astro.config.mjs` — `site` is a placeholder (`your-domain.com`) until you complete the
  custom domain step above.
- `src/components/Rail.astro` — nav links to `/about` and `/now`, and the `elsewhere`
  links (email, GitHub, Mastodon) point to placeholder addresses.
- `src/components/Footer.astro` — the "Subscribe" link points to `/subscribe`, which
  doesn't have a page yet.
- `/about`, `/now`, and `/subscribe` have no corresponding pages in `src/pages/` yet.
  They 404 until you either add pages for them or remove the links from `Rail.astro` /
  `Footer.astro`. Left as-is deliberately since the content is personal (bio, current
  status, newsletter provider) — not something to invent on your behalf.
