# Keystatic setup — steps only Alex can do

Keystatic runs in `local` storage during `npm run dev` (edit at
`http://localhost:4321/keystatic`, no login, writes straight to the files on disk).
Production uses `github` storage, which authenticates via a GitHub App and needs four
values set in the Cloudflare Pages project. This is a one-time setup.

## 1. Create the GitHub App

1. Build and run the site as a Pages worker locally: `npm run build && npx wrangler pages dev ./dist`.
2. Visit `/keystatic` and click **Log in with GitHub**.
3. Follow the **Create GitHub App** wizard. Name it anything (e.g. `gaspery-cms`).
4. Grant it access to the `holleyy/gaspery` repository.

The wizard writes four values into a local `.env` (already gitignored):

- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`
- `KEYSTATIC_SECRET`
- `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`

## 2. Add the four values to the Cloudflare **Pages** project

`gaspery` is a Cloudflare **Pages** project, so use Pages variables/secrets — NOT
`wrangler secret put` (that is the Workers command). Easiest via the dashboard:
**Workers & Pages → gaspery → Settings → Variables and Secrets**, for the **Production**
environment:

- Add the three `KEYSTATIC_*` values as **Secrets**.
- Add `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` as a **plaintext variable**. It is a build-time
  public value (Astro inlines `PUBLIC_*` into the client bundle), so it must also be
  available when the site builds — set it in the Pages **build** variables too (or in your
  local `.env` if you build before deploying).

CLI equivalent for the three secrets:

```bash
npx wrangler pages secret put KEYSTATIC_GITHUB_CLIENT_ID --project-name gaspery
npx wrangler pages secret put KEYSTATIC_GITHUB_CLIENT_SECRET --project-name gaspery
npx wrangler pages secret put KEYSTATIC_SECRET --project-name gaspery
```

## 3. Deploy

If the Pages project deploys from Git, merge `keystatic-cms` into `main` and Pages
builds/deploys automatically. To deploy from the CLI instead:

```bash
npm run build && npx wrangler pages deploy ./dist --project-name gaspery
```

Note: the local `wrangler pages dev` runtime may warn that it caps `compatibility_date`
at an earlier date than the requested `2026-07-19`. That is a local-runtime limitation
only — the real Cloudflare Pages runtime honors the requested date.

## 4. Editing

Visit `/keystatic` on the live site. Anyone with **write** access to `holleyy/gaspery`
can log in. Saves commit straight to `main`, which triggers the normal Pages deploy.

## Good to know — Keystatic normalizes files on first save

The first time you edit each of these in the CMS, the resulting git commit will show a
small, harmless reformatting diff (the rendered site is unaffected):

- **Now page** entries gain a trailing newline on each body.
- **Apps** deks may reflow to a YAML block scalar (`>-`).
- **Quiet app pages** (pls fix., Afterframe) gain an empty `spreads: []` line — Keystatic
  can't represent an absent list. (If this ever bothers you, it can be removed with a
  small schema change; ask and it's a quick follow-up.)

These are one-time normalizations; subsequent edits are clean.
