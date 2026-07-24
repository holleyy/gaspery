import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts — one markdown file per entry.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    readingTime: z.string(),
    dek: z.string(),
    draft: z.boolean().default(false),
  }),
});

// Small apps / tools — one YAML file per app; the entry's id is its filename.
const apps = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/apps' }),
  schema: z.object({
    name: z.string(),
    dek: z.string(),
    meta: z.string(),
    status: z.enum(['live', 'dev', 'planning']),
    url: z.string().optional(),
    order: z.number(),
  }),
});

// App detail pages (/apps/[id]) — one markdown file per app that has one.
// `template` picks which body renders: "quiet" (a paragraph, a screenshot,
// a link) or "editorial" (standfirst + alternating feature spreads).
const appPages = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/appPages' }),
  schema: z.object({
    title: z.string(),
    template: z.enum(['quiet', 'editorial']),
    spreads: z
      .array(
        z.object({
          heading: z.string(),
          body: z.string(),
        })
      )
      .optional(),
  }),
});

// About page singleton — one markdown file holding the page's prose body.
const about = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/about' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
  }),
});

export const collections = { writing, apps, appPages, about };
