import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { isHttpUrl } from './lib/links';

// Blog posts — one markdown file per entry. An entry carrying `sourceUrl` is a
// linked post: its headline points out, and `dek` holds the remark.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/writing' }),
  schema: z
    .object({
      title: z.string(),
      date: z.coerce.date(),
      sourceUrl: z
        .string()
        .url()
        .refine(isHttpUrl, { message: 'Source URL must be an http(s) address.' })
        .optional(),
      readingTime: z.string().optional(),
      dek: z.string(),
      draft: z.boolean().default(false),
    })
    .superRefine((v, ctx) => {
      /* Only essays carry a reading time; a linked post has nothing to time. */
      if (!v.sourceUrl && !v.readingTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['readingTime'],
          message: 'Essays require a readingTime.',
        });
      }
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
          /* A real screenshot for this spread, served from /public (e.g.
             "/shots/grod/agenda.webp"). Omit and the spread falls back to
             the honest "screenshot coming soon" placeholder — never a fake
             one. `alt` is required alongside it. */
          image: z.string().optional(),
          alt: z.string().optional(),
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

// Company page singleton — the organisation's own page, kept separate from
// `about` so the personal writing and the legal entity never blur together.
const company = defineCollection({
  loader: glob({ pattern: '**/*.mdoc', base: './src/content/company' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
  }),
});

export const collections = { writing, apps, appPages, about, company };
