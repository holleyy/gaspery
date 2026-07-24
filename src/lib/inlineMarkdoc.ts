import Markdoc from '@markdoc/markdoc';

/**
 * Render an inline Markdoc string (emphasis, links) to an HTML fragment
 * without Markdoc's wrapping <article>/<p>, so the result can sit inside
 * existing markup such as `.now-page__entry p`.
 */
export function renderInline(source: string): string {
  const html = Markdoc.renderers.html(Markdoc.transform(Markdoc.parse(source ?? '')));
  return html
    .replace(/^<article>\s*/, '')
    .replace(/\s*<\/article>$/, '')
    .replace(/^<p>/, '')
    .replace(/<\/p>$/, '')
    .trim();
}
