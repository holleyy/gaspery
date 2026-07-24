// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // TODO: replace with your real production domain once the custom domain is live.
  // Used for canonical URLs, the sitemap, and the RSS feed.
  site: 'https://your-domain.com',

  integrations: [sitemap(), react(), markdoc({ typographer: true }), keystatic()],
  adapter: cloudflare(),
});
