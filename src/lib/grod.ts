/* The GRØD landing page at /grod.

   One page, built in the app's own world and reached from /studio and from
   /apps/grod. Its call to action lands on /grod/go/, a tiny static page the
   tracker counts before it opens the beta email, so the click is a pageview
   too (the same pattern as /skal and /afterframe).

   The page was chosen from eight explorations. The other seven are kept in
   src/explorations/grod and are served in development only, at
   /grod/<letter>/, so they can still be compared; they are not built for
   the live site. */

/* Until the first TestFlight build is up, the call to action is an email:
   no form, no tracker (docs/product/03-landing-page.md §10 in the GRØD
   repo). The go page counts the click and then opens this. */
export const BETA_URL = 'mailto:hello@gaspery.com?subject=GR%C3%98D%20beta';

export const GROD_GO_PATH = '/grod/go/';

/* The explorations served in development. */
export const GROD_EXPLORATIONS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
