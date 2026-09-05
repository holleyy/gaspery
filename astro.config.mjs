// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // Used for canonical URLs, the sitemap, and the RSS feed.
  site: 'https://gaspery.com',

  integrations: [sitemap(), react(), markdoc({ typographer: true }), keystatic()],
  adapter: cloudflare(),

  /* /apps/afterframe/ was live before the app was renamed. The route id is
     the content filename, so renaming the file moves the URL; without this
     anyone holding the old link gets a 404. Permanent, because the move is. */
  redirects: {
    '/apps/afterframe': { status: 301, destination: '/apps/aftershot' },
  },
});
