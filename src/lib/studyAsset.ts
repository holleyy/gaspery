import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/* Every reader in this file resolves a Keystatic text field to a path on
   disk before trusting it, so the containment check lives once, here.

   Two kinds of bad input reach these functions, and they are NOT treated
   the same:

   - A path that resolves outside public/studies/ (e.g. "/../.env") is a
     containment escape. That is never legitimate authoring — it's a
     security boundary, not a typo — so it still throws and fails the build.
   - A non-.svg path (for readStudySvg) or a file that doesn't exist is an
     ordinary content mistake: a renamed file, a pasted screenshot path, a
     typo. Throwing for these is exactly what has frozen this site's
     Cloudflare build before, with nothing in the Keystatic editor to
     explain why — the author saves cleanly and the deploy dies. So each
     reader returns `undefined` instead, and the caller drops the mark from
     the render; the gap is visible on the page itself, not in a build log
     the author never sees.

   Containment is checked before any content check, deliberately: a
   malicious or fat-fingered path need not end in .svg (or exist at all) to
   escape (see "/../.env" above), so the security check cannot be gated
   behind a content check. */
const ROOT = resolve('public/studies');

function resolveStudyPath(src: string, label: string): string {
  const full = resolve('public', `.${src}`);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) {
    throw new Error(`${label}: "${src}" resolves outside public/studies/ (${full})`);
  }
  return full;
}

/* Inlined SVGs are read from disk at build time and injected with set:html,
   so the path decides which bytes end up in a public page. */
export function readStudySvg(src: unknown, label: string): string | undefined {
  if (typeof src !== 'string') {
    return undefined;
  }
  const full = resolveStudyPath(src, label);
  if (!src.endsWith('.svg')) {
    return undefined;
  }
  try {
    return readFileSync(full, 'utf8');
  } catch {
    return undefined;
  }
}

/* A raster mark (a .webp app icon, say) is never inlined — there is no
   markup to inject, and unlike an SVG it carries its own fixed colours
   rather than inheriting currentColor, so there is nothing an inlined
   document would gain it. The browser fetches it directly from an <img
   src>. But `src` is still author input reaching a public page, so it
   still has to clear the same public/studies/ containment boundary before
   a caller is allowed to trust it — this is that check for the non-SVG
   path. Returns `src` unchanged (ready to hand to <img>) once containment
   and existence both hold, or `undefined` for a contained path that simply
   names a file that isn't there — the same non-throwing, ordinary-mistake
   contract as readStudySvg. */
export function readStudyRaster(src: unknown, label: string): string | undefined {
  if (typeof src !== 'string') {
    return undefined;
  }
  const full = resolveStudyPath(src, label);
  return existsSync(full) ? src : undefined;
}
