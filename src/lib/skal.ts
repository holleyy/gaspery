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
   the arm they first saw. It carries a letter and nothing else.

   The arm logic itself is shared with /afterframe in src/lib/variants.ts. */

import { ARMS, isArm, pickArm, resolveArm, type Arm } from './variants.ts';

export const SKAL_VARIANTS = ARMS;
export type SkalVariant = Arm;

export const SKAL_VARIANT_COOKIE = 'skal-variant';
export const SKAL_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

/* The public TestFlight invitation for build 0.1. The go pages count the
   click and land here. */
export const TESTFLIGHT_URL = 'https://testflight.apple.com/join/UenrAtQX';
export const TESTFLIGHT_URL_IS_PLACEHOLDER = TESTFLIGHT_URL === 'https://testflight.apple.com/';

export const isSkalVariant = isArm;
export const pickSkalVariant = pickArm;
export const resolveSkalVariant = resolveArm;

export function skalGoPath(variant: SkalVariant): string {
  return `/skal/${variant}/go/`;
}
