import Markdoc from '@markdoc/markdoc';

/**
 * Render an inline Markdoc string (emphasis, links) to an HTML fragment
 * without Markdoc's structural wrappers, so the result can sit inside
 * existing markup such as `.now-page__entry p`.
 *
 * Intended for single-block inline content (what Keystatic's
 * `fields.markdoc.inline` produces). Wrapper `<article>`/`<p>` tags are
 * stripped globally rather than only at the ends, so a stray blank line
 * (e.g. from hand-editing the JSON) degrades to concatenated inline text
 * instead of leaking an unscoped `<p>` into the page. Literal `<p>` typed
 * in the source is HTML-escaped by Markdoc, so it is never matched here.
 */
export function renderInline(source: string): string {
  const html = Markdoc.renderers.html(Markdoc.transform(Markdoc.parse(source ?? '')));
  return html
    .replace(/<\/?article>/g, '')
    .replace(/<\/?p>/g, '')
    .trim();
}
