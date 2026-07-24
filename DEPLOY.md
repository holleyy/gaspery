# Deploy guide

Copy-paste steps for running this site locally, adding content, and shipping it to
Cloudflare Pages. See [README.md](README.md) for the theme itself.

## Local dev

```sh
npm install
npm run dev
```

Site runs at `http://localhost:4321`. Every public page is prerendered to static
HTML; `npm run build` outputs to `dist/` as a Cloudflare Pages bundle (`_worker.js/`
for the on-demand `/keystatic` admin route, plus the prerendered pages as static
assets). `npm run preview` serves the build locally.

Node version is pinned in `.nvmrc` (22). If you use nvm: `nvm use`.

The content editor (Keystatic) lives at `http://localhost:4321/keystatic` while the
dev server is running — see [Editing content](#adding-content).

## Adding content

Content is edited through **Keystatic**, a GUI CMS. Run `npm run dev` and open
`http://localhost:4321/keystatic`. In local dev it edits the files on disk directly
(no login); in production it commits to GitHub — see [keystatic-setup.md](docs/keystatic-setup.md).

Keystatic covers everything editable: **Writing**, **App pages**, **Apps** (the roster),
and the **Homepage / About / Now** singletons. The underlying files still live under
`src/content/` and `src/data/` if you prefer to edit them by hand — the formats:

- **Writing** — one Markdoc file per post: `src/content/writing/<slug>.mdoc`. Frontmatter
  `title`, `date` (`YYYY-MM-DD`), `readingTime`, `dek`, optional `draft`. The most recent
  non-draft post is tagged "New" on the homepage. Body is Markdoc (a Markdown superset);
  photo figures use a `{% RisoPhoto src="…" alt="…" /%}` block.
- **Apps** (roster) — one YAML file per app: `src/content/apps/<id>.yaml`, where the
  filename is the id. Fields `name`, `dek`, `meta`, `status` (`live` | `dev` | `planning`),
  optional `url`, `order`.
- **App detail pages** — `src/content/appPages/<id>.mdoc` (`template`, optional `spreads`).
- **Homepage / Now** — `src/data/home/index.json`, `src/data/now/index.json`.
- **About** — `src/content/about/index.mdoc`.

`.astro` pages (layouts, the Rail, components) are code, not content, and are not editable
in Keystatic — change those in `src/`.

## Deploy to Cloudflare (recommended)

**1. Push to GitHub.** Create an empty repo on GitHub first, then:

```sh
git remote add origin https://github.com/<your-username>/<repo-name>.git
git branch -M main
git push -u origin main
```

**2. Connect to Cloudflare (Workers Builds).**

`gaspery` is a Cloudflare **Worker** (with static assets), Git-connected via Workers Builds
and deployed with `npx wrangler deploy`. Since adopting Keystatic the site is no longer a
pure static upload — it builds an SSR bundle so the `/keystatic` admin route can run — but
every public page is still prerendered, so visitors get the same static site.

1. Cloudflare dashboard → **Workers & Pages** → connect the `holleyy/gaspery` repo
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy`

`wrangler.jsonc` at the root declares the Worker entry and static assets:

```jsonc
{
	"name": "gaspery",
	"main": "./dist/_worker.js/index.js",
	"compatibility_date": "2026-07-19",
	"compatibility_flags": ["nodejs_compat"],
	"assets": { "directory": "./dist", "binding": "ASSETS" }
}
```

The `postbuild` script writes `dist/.assetsignore` so the adapter's `_worker.js` and
`_routes.json` aren't served as public static assets.

**3. Configure Keystatic's GitHub mode.** The production `/keystatic` admin authenticates
via a GitHub App and needs four values set on the Worker (one build variable + three runtime
secrets). Full steps are in [docs/keystatic-setup.md](docs/keystatic-setup.md) — do this once
before relying on the hosted editor.

That's it — Cloudflare builds and hosts it on the free tier. Every push to `main` triggers
an automatic redeploy; pushes to other branches get their own preview URL.

## Alternative: Netlify

1. New site from Git → select the repo
2. Build command: `npm run build`
3. Publish directory: `dist`

## Custom domain

1. In the Cloudflare dashboard, open the Worker → **Settings** → **Domains & Routes** → add
   your domain. Cloudflare walks you through DNS if the domain is already on Cloudflare, or
   gives you a CNAME target otherwise.
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
- `src/components/Rail.astro` — the `elsewhere` links (email, GitHub, Mastodon, etc.)
  point to placeholder addresses.
- `src/components/Footer.astro` — the "Subscribe" link points to `/subscribe`, which
  doesn't have a page yet and 404s until you add one or remove the link.

(`/about` and `/now` are real pages now, editable in Keystatic — no longer placeholders.)
