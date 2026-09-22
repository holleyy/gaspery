/* The /afterframe landing page test. Same shape as /skal (src/lib/skal.ts,
   src/lib/variants.ts): two static arms behind one on-demand coin-toss
   route, a functional cookie that keeps a returning visitor on their arm,
   and a /go page per arm so the early-list click is counted as a pageview.

   Arm "a" is the proof sheet: the page is a 35mm contact sheet on a
   darkroom bench and the kept frame is circled in grease pencil. Arm "b" is
   the full listings: tonight's television schedule as a teletext page, time
   running down the left edge, the kept frames in their own column. */

import { ARMS, isArm, pickArm, resolveArm, type Arm } from './variants.ts';

export const AFTERFRAME_VARIANTS = ARMS;
export type AfterframeVariant = Arm;

export const AFTERFRAME_VARIANT_COOKIE = 'afterframe-variant';
export const AFTERFRAME_VARIANT_MAX_AGE = 60 * 60 * 24 * 90;

/* Before launch the call to action is the early list: an email, no form,
   no tracker, the same pattern as the GRØD site. The go pages count the
   click and then open this. */
export const EARLY_LIST_URL = 'mailto:hello@gaspery.com?subject=Afterframe%20early%20list';

export const isAfterframeVariant = isArm;
export const pickAfterframeVariant = pickArm;
export const resolveAfterframeVariant = resolveArm;

export function afterframeGoPath(variant: AfterframeVariant): string {
  return `/afterframe/${variant}/go/`;
}
