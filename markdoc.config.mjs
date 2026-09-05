import Markdoc from '@markdoc/markdoc';
import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

// Interleave a `\n` between each sibling so consecutive block-level
// elements land on their own line, matching how the pre-migration
// remark/rehype pipeline serialized block content.
function withNewlinesBetween(children) {
  const out = [];
  children.forEach((child, i) => {
    if (i > 0) out.push('\n');
    out.push(child);
  });
  return out;
}

export default defineMarkdocConfig({
  nodes: {
    // The pre-migration markdown pipeline rendered post bodies with no
    // wrapping element (the Astro template supplies `.prose`). Markdoc's
    // default `document` node wraps output in `<article>` — disable that
    // wrapper, but keep the newline-per-block-sibling formatting the old
    // pipeline produced, so rendered HTML stays byte-identical to the
    // baseline.
    document: {
      transform(node, config) {
        return withNewlinesBetween(node.transformChildren(config));
      },
    },
    // The old pipeline (remark) preserved soft line breaks as literal
    // newlines in the output HTML. Markdoc's default collapses them to a
    // single space, which would fail the byte-parity gate.
    softbreak: { transform: () => '\n' },
    // Match the old pipeline's formatting of blockquote contents: a
    // newline before/after the block children, and between them.
    blockquote: {
      render: 'blockquote',
      transform(node, config) {
        const children = withNewlinesBetween(node.transformChildren(config));
        return new Markdoc.Tag('blockquote', node.transformAttributes(config), [
          '\n',
          ...children,
          '\n',
        ]);
      },
    },
  },
  tags: {
    RisoPhoto: {
      render: component('./src/components/RisoPhoto.astro'),
      attributes: {
        src: { type: String, required: true },
        alt: { type: String, required: true },
        caption: { type: String },
      },
    },
    // Pull-quote attribution. No Astro component needed — the `.prose
    // :global(blockquote cite)` rule in [...id].astro does the styling; this
    // just needs to land a plain <cite> element in the output. The Keystatic
    // content component (keystatic.config.ts) is field-based (`block()`), so
    // the attribution arrives as a `text` attribute, not tag children —
    // transform it into the tag's rendered content instead of leaving it as
    // a (non-standard) HTML attribute.
    cite: {
      render: 'cite',
      attributes: {
        text: { type: String, required: true },
      },
      transform(node, config) {
        const { text } = node.transformAttributes(config);
        return new Markdoc.Tag('cite', {}, [text]);
      },
    },
    /* Feature-post blocks. Every one is `selfClosing`: a paired tag parses
       inside a <p>, and a full-bleed section inside a paragraph is invalid
       HTML that collapses the layout. Their repeatable content rides as
       array-of-object attributes, which Markdoc round-trips cleanly and
       Keystatic edits as a form. */
    plate: {
      render: component('./src/components/feature/Plate.astro'),
      selfClosing: true,
      attributes: {
        src: { type: String },
        alt: { type: String },
        caption: { type: String },
        eyebrow: { type: String },
        heading: { type: String },
        accent: { type: String },
        lede: { type: String },
      },
    },
    band: {
      render: component('./src/components/feature/Band.astro'),
      selfClosing: true,
      attributes: {
        words: { type: Array, required: true },
        note: { type: String },
      },
    },
  },
});
