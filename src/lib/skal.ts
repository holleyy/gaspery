/* The /skal landing page test.

   Two arms, "a" (the page is a document open in Skål) and "b" (the
   double-click story), served from /skal/a and /skal/b. /skal itself is the
   only on-demand route: it reads the arm from a cookie, assigns one at
   random when there is none, and redirects. The URL changes on purpose:
   Counterscale counts pageviews by path, so the arm has to be in the path
   for the numbers to split. The TestFlight link on each arm points at that
   arm's own /go page, a tiny static page that the tracker counts before it
   sends the visitor on, so the conversion is a pageview too.

   The cookie is functional, not analytics: it keeps a returning visitor on
   the arm they first saw. It carries a letter and nothing else. */

export const SKAL_VARIANTS = ['a', 'b'] as const;
export type SkalVariant = (typeof SKAL_VARIANTS)[number];

export const SKAL_VARIANT_COOKIE = 'skal-variant';
export const SKAL_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

/* Replace when the build clears TestFlight review. Until then the go page
   still counts the click and lands on TestFlight's own front door. */
export const TESTFLIGHT_URL = 'https://testflight.apple.com/';
export const TESTFLIGHT_URL_IS_PLACEHOLDER = TESTFLIGHT_URL === 'https://testflight.apple.com/';

export function isSkalVariant(value: unknown): value is SkalVariant {
  return value === 'a' || value === 'b';
}

/* A fair coin, from the platform's own randomness. */
export function pickSkalVariant(random: () => number = Math.random): SkalVariant {
  return random() < 0.5 ? 'a' : 'b';
}

/* The arm a request should see: an explicit ?v= wins (so a specific arm can
   be shared or checked), then the cookie, then a fresh coin. */
export function resolveSkalVariant(
  query: string | null,
  cookie: string | undefined,
  random: () => number = Math.random,
): { variant: SkalVariant; fresh: boolean } {
  if (isSkalVariant(query)) return { variant: query, fresh: query !== cookie };
  if (isSkalVariant(cookie)) return { variant: cookie, fresh: false };
  return { variant: pickSkalVariant(random), fresh: true };
}

export function skalGoPath(variant: SkalVariant): string {
  return `/skal/${variant}/go/`;
}
