import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/* Inlined SVGs are read from disk at build time and injected with set:html,
   so the path decides which bytes end up in a public page. The path comes
   from a plain Keystatic text field, so it is author input, not a constant.

   Two kinds of bad input reach here, and they are NOT treated the same:

   - A path that resolves outside public/studies/ (e.g. "/../.env") is a
     containment escape. That is never legitimate authoring — it's a
     security boundary, not a typo — so it still throws and fails the build.
   - A non-.svg path or a file that doesn't exist is an ordinary content
     mistake: a renamed file, a pasted screenshot path, a typo. Throwing for
     these is exactly what has frozen this site's Cloudflare build before,
     with nothing in the Keystatic editor to explain why — the author saves
     cleanly and the deploy dies. So this returns `undefined` instead, and
     the caller drops the mark from the render; the gap is visible on the
     page itself, not in a build log the author never sees.

   Containment is checked before the extension, deliberately: a malicious
   or fat-fingered path need not end in .svg to escape (see "/../.env"
   above), so the security check cannot be gated behind the content check. */
const ROOT = resolve('public/studies');

export function readStudySvg(src: unknown, label: string): string | undefined {
  if (typeof src !== 'string') {
    return undefined;
  }
  const full = resolve('public', `.${src}`);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) {
    throw new Error(`${label}: "${src}" resolves outside public/studies/ (${full})`);
  }
  if (!src.endsWith('.svg')) {
    return undefined;
  }
  try {
    return readFileSync(full, 'utf8');
  } catch {
    return undefined;
  }
}
