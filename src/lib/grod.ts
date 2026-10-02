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

/* The site's pages after the home page, in the order the bar and the footer
   list them. One list, so a new page is one line here and appears in both
   on every page. The bar holds two on a phone; a third page means the phone
   bar needs a menu (see the note in src/styles/grod.css). */
export const GROD_HOME = '/grod/';
export const GROD_PAGES = [
  { href: '/grod/features/', label: 'Features' },
  { href: '/grod/craft/', label: 'Craft' },
] as const;

/* The explorations served in development. */
export const GROD_EXPLORATIONS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
