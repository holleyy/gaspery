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
        date: fields.date({ label: 'Date' }),
        readingTime: fields.text({ label: 'Reading time' }),
        dek: fields.text({ label: 'Dek', multiline: true }),
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
  },
});
