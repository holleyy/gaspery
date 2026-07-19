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
    status: z.enum(['live', 'wip']),
    url: z.string().optional(),
    order: z.number(),
  }),
});

export const collections = { writing, apps };
