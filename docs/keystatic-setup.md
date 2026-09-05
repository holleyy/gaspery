# Keystatic setup — steps only Alex can do

Keystatic runs in `local` storage during `npm run dev` (edit at
`http://localhost:4321/keystatic`, no login, writes straight to the files on disk).
Production uses `github` storage, which authenticates via a GitHub App and needs four
values set on the Cloudflare **Worker**. This is a one-time setup.

> **Deploy model:** `gaspery` is a Cloudflare **Worker** (Workers Builds, Git-connected;
> deploy command `npx wrangler deploy`), not a Pages project. `wrangler.jsonc` uses the
> Workers config (`main` + `assets`), and `postbuild` writes `dist/.assetsignore` so the
> server bundle isn't served as a static asset.

## 1. Create the GitHub App

The "Log in with GitHub" flow only appears in **github** storage mode, but the config keeps
`npm run dev` in **local** mode. So force github mode just for this one-time step:

1. In `keystatic.config.ts`, temporarily replace the `storage:` line with:
   `storage: { kind: 'github', repo: { owner: 'holleyy', name: 'gaspery' } },`
2. `npm run dev`, open `http://localhost:4321/keystatic`, click **Log in with GitHub**.
3. Follow the **Create GitHub App** wizard (name it e.g. `holleyy-keystatic`) and grant it
   access to the `holleyy/gaspery` repo. A localhost callback warning is expected/fine.
4. It writes four values into a local `.env` (gitignored). **Revert the `storage:` line** to
   the `import.meta.env.DEV ? { kind: 'local' } : { kind: 'github', ... }` split.

The four values:

- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`
- `KEYSTATIC_SECRET`
- `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`  (already known: `holleyy-keystatic`)

## 2. Add the four values to the Cloudflare **Worker**

Dashboard → **Workers & Pages → gaspery → Settings**. There are two places, and the split matters:

- **`PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`** → a **Build** variable (Settings → Build → Variables
  and secrets). It's a build-time public value that Astro inlines into the client bundle, so
  it must be present when `npm run build` runs. Value: `holleyy-keystatic`.
- **The three `KEYSTATIC_*` values** → **runtime Secrets** on the Worker (Settings → the
  Worker's **Variables and Secrets**, added as encrypted **Secrets**). The `/keystatic` OAuth
  routes read these at request time. Copy each value from your local `.env`.

CLI equivalent for the three runtime secrets:

```bash
npx wrangler secret put KEYSTATIC_GITHUB_CLIENT_ID
npx wrangler secret put KEYSTATIC_GITHUB_CLIENT_SECRET
npx wrangler secret put KEYSTATIC_SECRET
```

## 3. Deploy

Your Worker deploys from Git (production branch `main`). Merge `keystatic-cms` into `main` and
Cloudflare runs `npm run build && npx wrangler deploy` automatically. To deploy from the CLI
instead: `npm run build && npx wrangler deploy`.

Note: local `wrangler dev` warns it caps `compatibility_date` at an earlier date than the
requested `2026-07-19` — a local-runtime limitation only; the real Workers runtime honors it.

## 4. Add the production callback URL to the GitHub App

The GitHub App was created from `localhost` (Step 1), so its OAuth callback only points at
localhost. Production login will fail on the redirect until you add the live callback:

1. Go to **github.com/settings/apps/holleyy-keystatic** → **Callback URL**.
2. Add `https://gaspery.com/api/keystatic/github/oauth/callback` (GitHub Apps allow multiple
   callback URLs — keep the localhost one too if you still develop against github mode locally).
3. Save.

## 5. Editing

Visit `/keystatic` on the live site. Anyone with **write** access to `holleyy/gaspery`
can log in. Saves commit straight to `main`, which triggers the normal deploy.

## Good to know — Keystatic normalizes files on first save

The first time you edit each of these in the CMS, the resulting git commit will show a
small, harmless reformatting diff (the rendered site is unaffected):

- **Now page** entries gain a trailing newline on each body.
- **Apps** deks may reflow to a YAML block scalar (`>-`).
- **Quiet app pages** (pls fix., Aftershot) gain an empty `spreads: []` line — Keystatic
  can't represent an absent list. (If this ever bothers you, it can be removed with a
  small schema change; ask and it's a quick follow-up.)

These are one-time normalizations; subsequent edits are clean.
