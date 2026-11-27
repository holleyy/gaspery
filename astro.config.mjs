// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

/* `astro dev` runs on Node, everything else (build, preview, sync) on the
   Cloudflare adapter. Since adapter v13 the Cloudflare dev server runs
   on-demand routes inside workerd, and Keystatic's local storage mode, the
   one `npm run dev` edits files with, refuses to run outside Node: every
   /api/keystatic request fails and the editor opens nothing. Astro 5's dev
   server ran on Node too, so this keeps the old behaviour. The Node adapter
   is a devDependency and only loaded here, so builds never import it. */
const command = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const devAdapter =
  command === 'dev' ? (await import('@astrojs/node')).default({ mode: 'standalone' }) : undefined;

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs, the sitemap, and the RSS feed.
  site: 'https://gaspery.com',

  /* Astro 7 changed the default to 'jsx', which strips the whitespace
     between inline elements the way React does. Every template here was
     written for HTML whitespace rules, so keep them. */
  compressHTML: true,

  /* Nothing here uses Astro.session. Without this, the Cloudflare adapter
     wires a SESSION KV binding into the generated Worker config, and
     `wrangler deploy` would provision a KV namespace for it. */
  session: false,

  integrations: [sitemap(), react(), markdoc({ typographer: true }), keystatic()],
  adapter:
    devAdapter ??
    cloudflare({
      /* 'compile' was the adapter's default until v13, which switched to
         'cloudflare-binding' and provisions a Cloudflare Images binding on
         deploy. Nothing here uses astro:assets, so keep the old default. */
      imageService: 'compile',
      /* Since v13 the adapter prerenders pages inside workerd, where node:fs
         sees an empty filesystem. GrodSentence.astro, lib/imageSize.ts and
         lib/studyAsset.ts read files from public/ at build time, and under
         workerd they quietly find nothing: /grod lost its hero film and the
         build still passed. Prerender in Node, as before. On-demand routes
         (/keystatic, /api/*, /skal, /afterframe) still run in workerd. */
      prerenderEnvironment: 'node',
    }),
});
