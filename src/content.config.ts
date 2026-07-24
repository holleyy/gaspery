import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

// Blog posts — one markdown file per entry.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    readingTime: z.string(),
    dek: z.string(),
    draft: z.boolean().default(false),
  }),
});

// Small apps / tools — a single JSON file of records.
const apps = defineCollection({
  loader: file('./src/content/apps.json'),
  schema: z.object({
    id: z.string(),
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
  loader: glob({ pattern: '**/*.md', base: './src/content/appPages' }),
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

export const collections = { writing, apps, appPages };
