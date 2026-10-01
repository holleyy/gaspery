/* The /grod landing page test. Same shape as /skal and /afterframe
   (src/lib/variants.ts): two static arms behind one on-demand coin-toss
   route, a functional cookie that keeps a returning visitor on their arm,
   and a /go page per arm so the beta click is counted as a pageview.

   Arm "a" is the year on the wall: the page is an office year planner
   printed in GRØD's two inks, the Demo workspace's real meeting dates
   plotted on it, today's cell open. Arm "b" is the things it noticed: a
   sequence of sentences GRØD wrote from its own records, each at poster
   size, each with the capture it came from. */

import { ARMS, isArm, pickArm, resolveArm, type Arm } from './variants.ts';

export const GROD_VARIANTS = ARMS;
export type GrodVariant = Arm;

export const GROD_VARIANT_COOKIE = 'grod-variant';
export const GROD_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

/* Until the first TestFlight build is up, the call to action is an email:
   no form, no tracker (docs/product/03-landing-page.md §10). The go pages
   count the click and then open this. */
export const BETA_URL = 'mailto:hello@gaspery.com?subject=GR%C3%98D%20beta';

export const isGrodVariant = isArm;
export const pickGrodVariant = pickArm;
export const resolveGrodVariant = resolveArm;

export function grodGoPath(variant: GrodVariant): string {
  return `/grod/${variant}/go/`;
}
