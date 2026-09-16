/* /studio appearance and category logic, kept free of the DOM so it can be
   unit-tested under `node --test` alongside src/lib/theme.ts. The DOM work
   lives in StudioSwitch.astro and in studio.astro's pre-paint script. */

/** The localStorage key. Its own key, never the site-wide 'theme': picking
    an appearance on /studio changes this page only. Repeated as a literal
    in studio.astro's inline script, which runs before the bundle exists;
    tests/studio.test.ts pins the two together. */
export const STUDIO_STORAGE_KEY = 'studio';

/** Three states, no `system`: the plate is the page's default and is not
    an OS state, so there is nothing to hand control back to. */
export type StudioAppearance = 'plate' | 'light' | 'dark';

const APPEARANCES: readonly StudioAppearance[] = ['plate', 'light', 'dark'];

export function isStudioAppearance(value: unknown): value is StudioAppearance {
  return typeof value === 'string' && (APPEARANCES as readonly string[]).includes(value);
}

/** Anything unrecognised (absent, corrupt, hand-edited) is `plate`.
    Storage is user-writable, so this must never throw. */
export function readStudioAppearance(value: unknown): StudioAppearance {
  return isStudioAppearance(value) ? value : 'plate';
}

/** The small label after each name on /studio. Derived from the app record
    rather than stored: `planning` reads "Soon"; otherwise the platform is
    the segment of `meta` before its first middot, with Apple's "macOS"
    shortened to the studio's "Mac". Anything else passes through. */
export function categoryFor(app: { meta: string; status: string }): string {
  if (app.status === 'planning') return 'Soon';
  const segment = app.meta.split('·')[0].trim();
  return segment === 'macOS' ? 'Mac' : segment;
}
