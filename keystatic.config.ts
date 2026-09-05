import { config, collection, fields, singleton } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

export const risoPhotoComponents = {
  RisoPhoto: block({
    label: 'Riso photo',
    schema: {
      src: fields.text({ label: 'Image path', validation: { isRequired: true } }),
      alt: fields.text({ label: 'Alt text', validation: { isRequired: true } }),
      caption: fields.text({ label: 'Caption (optional)' }),
    },
  }),
};

// A pull-quote's attribution line. `block()`, not `wrapper()`: a `wrapper`
// compiles to a ProseMirror node with `content: 'block+'`, so it can only
// wrap other block nodes (paragraphs) — a bare run of attribution text
// fails to parse ("tag has unexpected children"), confirmed against the
// live editor. It would also mean a nested <p> inside the <cite>, which
// would pick up the blockquote-paragraph styles (serif, 17px) and stomp
// the small-caps teal look. `block()` — one plain field, exactly like
// RisoPhoto's `caption` — sidesteps both problems.
//
// Kept out of `risoPhotoComponents`: `.prose blockquote cite` is styled only
// in src/pages/writing/[...id].astro, so offering it in the `appPages` or
// `about` editors would insert a tag that renders as unstyled UA-default
// italic there. `writingComponents` below adds it back for `writing` only.
const cite = block({
  label: 'Cite',
  description: 'A pull-quote attribution line (e.g. the source name).',
  schema: {
    text: fields.text({ label: 'Attribution', validation: { isRequired: true } }),
  },
});
// Feature-post blocks. `block()` not `wrapper()`: a wrapper compiles to a
// paired Markdoc tag, which parses inside a <p> — fatal for a full-bleed
// section. Same reason `cite` above is a block().
const featureComponents = {
  plate: block({
    label: 'Plate',
    description: 'Full-bleed artwork, optionally carrying the display headline.',
    schema: {
      src: fields.text({ label: 'Image path', description: 'e.g. /studies/grod-icon/primary-1024.webp' }),
      alt: fields.text({ label: 'Alt text', multiline: true }),
      // Split from `caption` so a bold lead-in never needs raw HTML in a
      // plain text field — see the comment on Plate.astro's figcaption.
      captionLead: fields.text({ label: 'Caption lead-in', description: 'Bold lead-in, e.g. "Primary — Listening Ø."' }),
      caption: fields.text({ label: 'Caption', multiline: true }),
      eyebrow: fields.text({ label: 'Eyebrow' }),
      heading: fields.text({ label: 'Display heading' }),
      accent: fields.text({ label: 'Heading accent line', description: 'Rendered italic in the brand ink, on its own line.' }),
      lede: fields.text({ label: 'Lede', multiline: true }),
      level: fields.integer({
        label: 'Heading level',
        description: 'Only the opening hero plate on a page should be 1. Leave every other plate at 2 — a page may only have one <h1>.',
        defaultValue: 2,
        validation: { min: 1, max: 2 },
      }),
      // Options must stay identical to markdoc.config.mjs's `matches` list.
      shape: fields.select({
        label: 'Artwork shape',
        description: 'Icon masks the image to the iOS squircle with a hairline edge. Use it for app icons; leave photographs and other artwork square.',
        options: [
          { label: 'Square', value: 'none' },
          { label: 'Icon (squircle)', value: 'icon' },
        ],
        defaultValue: 'none',
      }),
    },
  }),
  band: block({
    label: 'Band',
    description: 'The one full-bleed inversion in a piece. Use it once.',
    schema: {
      words: fields.array(fields.text({ label: 'Word' }), {
        label: 'Words',
        itemLabel: (props) => props.value,
      }),
      note: fields.text({ label: 'Note', multiline: true }),
      accentIndex: fields.integer({
        label: 'Accent index',
        description: 'Which word to pick out in brand ink, zero-based (0 = first word). Defaults to the second word.',
        defaultValue: 1,
      }),
    },
  }),
  spec: block({
    label: 'Spec',
    description: 'Numbered readings. One column stacks; two or three put the heading beside the grid.',
    schema: {
      columns: fields.integer({ label: 'Columns', defaultValue: 1, validation: { min: 1, max: 3 } }),
      heading: fields.text({ label: 'Heading' }),
      standfirst: fields.text({ label: 'Standfirst', multiline: true }),
      detail: fields.text({ label: 'Detail', multiline: true }),
      items: fields.array(
        fields.object({
          num: fields.text({ label: 'Number', description: 'e.g. "01" — rendered in the secondary ink.' }),
          key: fields.text({ label: 'Key', description: 'e.g. "Name" — rendered after the number.' }),
          glyph: fields.text({
            label: 'Glyph path',
            description: 'Optional. Must be an .svg file under /studies/, e.g. /studies/grod-icon/mb-idle.svg — anything else (wrong extension, missing file) is silently ignored.',
          }),
          ink: fields.text({
            label: 'Glyph ink',
            description: 'Tints the inlined glyph via currentColor. Leave empty to keep the ambient text colour, or set \'brand\', \'teal\', or a hex like #E08A5B.',
          }),
          inkDark: fields.text({
            label: 'Glyph ink (dark scheme)',
            description: 'Optional. The dark-scheme counterpart for a hex `ink` that would not survive the ground inverting — omit it and `ink` is used in both.',
          }),
          heading: fields.text({ label: 'Heading' }),
          body: fields.text({ label: 'Body', multiline: true }),
        }),
        { label: 'Items', itemLabel: (props) => props.fields.heading.value || props.fields.key.value || props.fields.num.value },
      ),
    },
  }),
  swatches: block({
    label: 'Swatches',
    description: 'Ink chips. These print the subject’s own colours, not the site’s.',
    schema: {
      heading: fields.text({ label: 'Heading' }),
      items: fields.array(
        fields.object({
          hex: fields.text({ label: 'Hex', validation: { isRequired: true } }),
          job: fields.text({ label: 'Job' }),
        }),
        { label: 'Swatches', itemLabel: (props) => props.fields.hex.value },
      ),
    },
  }),
  glyphs: block({
    label: 'Glyphs',
    description: 'A family of small marks, shown on both a light and a dark ground.',
    schema: {
      heading: fields.text({ label: 'Heading' }),
      standfirst: fields.text({ label: 'Standfirst', multiline: true }),
      grounds: fields.object({
        paper: fields.text({ label: 'Light-ground label', description: 'What the light strip is called in this study, e.g. "Light menu bar".' }),
        ink: fields.text({ label: 'Dark-ground label', description: 'What the dark strip is called in this study, e.g. "Dark menu bar".' }),
      }, { label: 'Ground labels' }),
      marks: fields.array(
        fields.object({
          src: fields.text({
            label: 'Mark path',
            description: 'A file under /studies/. An .svg (e.g. /studies/grod-icon/mb-idle.svg) is inlined and tints to the strip via currentColor; anything else (e.g. /studies/aftershot-icon/icon-120.webp) renders as a plain image with its own fixed colours. A missing file is silently ignored either way.',
            validation: { isRequired: true },
          }),
          label: fields.text({ label: 'State label' }),
        }),
        { label: 'Marks', itemLabel: (props) => props.fields.label.value || props.fields.src.value },
      ),
      markSize: fields.integer({
        label: 'Mark size (px)',
        description: 'The size in pixels the specimen is proved at, e.g. 120 for a Home Screen icon. Leave empty for the GRØD default of 28px (a menu-bar glyph).',
      }),
      note: fields.text({ label: 'Note', multiline: true }),
    },
  }),
  scaleProof: block({
    label: 'Scale proof',
    description: 'One artwork at descending sizes. Each rung points at its own derivative.',
    schema: {
      heading: fields.text({ label: 'Heading' }),
      // Options must stay identical to markdoc.config.mjs's `matches` list.
      shape: fields.select({
        label: 'Artwork shape',
        description: 'Icon masks each rung to the iOS squircle with a hairline edge. Leave square when the artwork already carries its own icon silhouette.',
        options: [
          { label: 'Square', value: 'none' },
          { label: 'Icon (squircle)', value: 'icon' },
        ],
        defaultValue: 'none',
      }),
      rungs: fields.array(
        fields.object({
          src: fields.text({ label: 'Image path', validation: { isRequired: true } }),
          size: fields.integer({ label: 'Rendered size in px', description: 'e.g. 128' }),
          label: fields.text({ label: 'Label' }),
          caption: fields.text({ label: 'Caption', multiline: true }),
        }),
        { label: 'Rungs', itemLabel: (props) => props.fields.label.value || props.fields.size.value },
      ),
    },
  }),
};
const writingComponents = { ...risoPhotoComponents, cite, ...featureComponents };

// Where an uploaded body image lands. Without this, Keystatic writes the file
// beside the entry as `src/content/<coll>/<slug>/content/<name>` but references
// it by bare filename, which resolves against `src/content/<coll>/` — so Astro
// can't find it and the upload fails the deploy. Pinning directory/publicPath
// sends uploads to /public, where the hand-placed images already live
// (e.g. /writing/so-well-planned-it-feels-unplanned/1.jpg).
const bodyImages = (folder: string) => ({
  image: {
    directory: `public/${folder}`,
    publicPath: `/${folder}/`,
    // A macOS screenshot arrives as "Screenshot 2026-08-24 at 01.23.36.png";
    // the spaces come back URL-encoded in the markup. Slugify so the reference
    // stays readable and needs no escaping.
    transformFilename: (name: string) => {
      const dot = name.lastIndexOf('.');
      const stem = dot === -1 ? name : name.slice(0, dot);
      const ext = dot === -1 ? '' : name.slice(dot).toLowerCase();
      const slug = stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      return `${slug || 'image'}${ext}`;
    },
  },
});

export default config({
  storage: import.meta.env.DEV
    ? { kind: 'local' }
    : { kind: 'github', repo: { owner: 'holleyy', name: 'gaspery' } },
  ui: {
    brand: { name: 'gaspery' },
  },
  collections: {
    writing: collection({
      label: 'Writing',
      path: 'src/content/writing/*',
      slugField: 'title',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        sourceUrl: fields.text({
          label: 'Source URL',
          description: 'Paste a URL to make this a link post — the headline will point there instead of here. Leave empty for an essay.',
          validation: {
            // Empty must stay valid — that's what makes the field optional
            // (Keystatic serialises '' to undefined). The alternation's first
            // branch matches only the empty string; the second requires an
            // http(s) scheme, so a bare domain like "ethanmarcotte.com" is
            // rejected here instead of failing the whole site's deploy when
            // Zod's schema (src/content.config.ts) rejects it later.
            pattern: {
              regex: /^$|^https?:\/\/\S+$/,
              message: 'Must start with http:// or https://',
            },
          },
        }),
        date: fields.date({
          label: 'Date',
          // Required here so an empty date picker can't be saved. Zod's schema
          // (src/content.config.ts) has `date` as non-optional, so a dateless
          // entry commits fine and then fails the site's deploy — same trap
          // `sourceUrl` above guards against.
          validation: { isRequired: true },
        }),
        readingTime: fields.text({
          label: 'Reading time',
          description: 'Essays only. Leave empty on a link post.',
        }),
        dek: fields.text({
          label: 'Dek / remark',
          description: 'An essay’s standfirst, or a link post’s remark. Shown in the stream and the feed.',
          multiline: true,
        }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        template: fields.select({
          label: 'Template',
          description: 'Standard is the reading column. Feature is the full-bleed, art-directed layout.',
          options: [
            { label: 'Standard', value: 'standard' },
            { label: 'Feature', value: 'feature' },
          ],
          defaultValue: 'standard',
        }),
        eyebrow: fields.text({
          label: 'Eyebrow',
          description: 'Feature template only. e.g. "Identity study 01".',
        }),
        app: fields.text({
          label: 'Related app',
          description: 'Feature template only. An app id, e.g. "grod" — links the study back to its app page.',
        }),
        content: fields.markdoc({
          label: 'Body',
          components: writingComponents,
          options: bodyImages('writing'),
        }),
      },
    }),
    appPages: collection({
      label: 'App pages',
      path: 'src/content/appPages/*',
      slugField: 'title',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        template: fields.select({
          label: 'Template',
          options: [
            { label: 'Quiet', value: 'quiet' },
            { label: 'Editorial', value: 'editorial' },
          ],
          defaultValue: 'quiet',
        }),
        spreads: fields.array(
          fields.object({
            heading: fields.text({ label: 'Heading' }),
            body: fields.text({ label: 'Body', multiline: true }),
            image: fields.text({
              label: 'Screenshot path',
              description: 'e.g. /shots/grod/agenda.webp — leave empty for the "coming soon" placeholder',
            }),
            alt: fields.text({ label: 'Screenshot alt text', multiline: true }),
          }),
          { label: 'Spreads', itemLabel: (props) => props.fields.heading.value },
        ),
        content: fields.markdoc({
          label: 'Body',
          components: risoPhotoComponents,
          options: bodyImages('apps'),
        }),
      },
    }),
    apps: collection({
      label: 'Apps',
      path: 'src/content/apps/*',
      slugField: 'name',
      format: { data: 'yaml' },
      schema: {
        name: fields.slug({ name: { label: 'Name' } }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        meta: fields.text({ label: 'Meta' }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Live', value: 'live' },
            { label: 'Dev', value: 'dev' },
            { label: 'Planning', value: 'planning' },
          ],
          defaultValue: 'planning',
        }),
        url: fields.text({ label: 'URL' }),
        order: fields.number({ label: 'Order' }),
      },
    }),
  },
  singletons: {
    about: singleton({
      label: 'About page',
      path: 'src/content/about/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        content: fields.markdoc({
          label: 'Body',
          components: risoPhotoComponents,
          options: bodyImages('about'),
        }),
      },
    }),
    company: singleton({
      label: 'Company page',
      path: 'src/content/company/',
      format: { contentField: 'content' },
      schema: {
        title: fields.text({ label: 'Title' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        content: fields.markdoc({
          label: 'Body',
          components: risoPhotoComponents,
          options: bodyImages('company'),
        }),
      },
    }),
    now: singleton({
      label: 'Now page',
      path: 'src/data/now/',
      format: { data: 'json' },
      schema: {
        updated: fields.date({ label: 'Updated' }),
        title: fields.text({ label: 'Title' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
        entries: fields.array(
          fields.object({
            heading: fields.text({ label: 'Heading' }),
            body: fields.markdoc.inline({ label: 'Body' }),
          }),
          { label: 'Entries', itemLabel: (props) => props.fields.heading.value },
        ),
      },
    }),
    home: singleton({
      label: 'Homepage',
      path: 'src/data/home/',
      format: { data: 'json' },
      schema: {
        hero: fields.object(
          {
            eyebrow: fields.text({ label: 'Eyebrow (leave empty to hide)' }),
            title: fields.text({ label: 'Title', multiline: true }),
            intro: fields.text({ label: 'Intro', multiline: true }),
          },
          { label: 'Hero' },
        ),
        nowSummary: fields.object(
          {
            building: fields.text({ label: 'Building', multiline: true }),
            reading: fields.text({ label: 'Reading' }),
            watching: fields.text({ label: 'Watching' }),
            listening: fields.text({ label: 'Listening' }),
            linkLabel: fields.text({ label: 'Link label' }),
          },
          { label: 'Now summary' },
        ),
      },
    }),
    sidebar: singleton({
      label: 'Sidebar',
      path: 'src/data/sidebar/',
      format: { data: 'json' },
      schema: {
        pulseEnabled: fields.checkbox({
          label: 'Show latest Bluesky post',
          defaultValue: true,
        }),
        pulseHandle: fields.text({
          label: 'Bluesky handle',
          defaultValue: 'alexholley.bsky.social',
        }),
        pulseMaxAgeDays: fields.number({
          label: 'Hide posts older than (days)',
          defaultValue: 90,
        }),
        elsewhere: fields.array(
          fields.object({
            label: fields.text({ label: 'Label', validation: { isRequired: true } }),
            href: fields.text({ label: 'URL', validation: { isRequired: true } }),
          }),
          { label: 'Elsewhere', itemLabel: (props) => props.fields.label.value },
        ),
      },
    }),
  },
});
