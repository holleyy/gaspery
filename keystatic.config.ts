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
  // A pull-quote's attribution line. `block()`, not `wrapper()`: a `wrapper`
  // compiles to a ProseMirror node with `content: 'block+'`, so it can only
  // wrap other block nodes (paragraphs) — a bare run of attribution text
  // fails to parse ("tag has unexpected children"), confirmed against the
  // live editor. It would also mean a nested <p> inside the <cite>, which
  // would pick up the blockquote-paragraph styles (serif, 17px) and stomp
  // the small-caps teal look. `block()` — one plain field, exactly like
  // RisoPhoto's `caption` — sidesteps both problems.
  cite: block({
    label: 'Cite',
    description: 'A pull-quote attribution line (e.g. the source name).',
    schema: {
      text: fields.text({ label: 'Attribution', validation: { isRequired: true } }),
    },
  }),
};

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
        }),
        date: fields.date({ label: 'Date' }),
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
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
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
          }),
          { label: 'Spreads', itemLabel: (props) => props.fields.heading.value },
        ),
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
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
        content: fields.markdoc({ label: 'Body', components: risoPhotoComponents }),
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
            eyebrow: fields.text({ label: 'Eyebrow' }),
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
