import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/* Inlined SVGs are read from disk at build time and injected with set:html,
   so the path decides which bytes end up in a public page. The path comes
   from a plain Keystatic text field, so it is author input, not a constant —
   a typo like "/../.env" would otherwise inline that file's contents into
   the built HTML. Containment is asserted here rather than assumed. */
const ROOT = resolve('public/studies');

export function readStudySvg(src: unknown, label: string): string {
  if (typeof src !== 'string' || !src.endsWith('.svg')) {
    throw new Error(`${label}: expected an .svg path under /studies/, got ${JSON.stringify(src)}`);
  }
  const full = resolve('public', `.${src}`);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) {
    throw new Error(`${label}: "${src}" resolves outside public/studies/ (${full})`);
  }
  try {
    return readFileSync(full, 'utf8');
  } catch {
    throw new Error(`${label}: no such file "${src}" (looked in ${full})`);
  }
}
