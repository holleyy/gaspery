import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isLink } from '../lib/links';

/* Gruber's convention. For a linked post the item's <link> is the *source* —
   that is where a reader clicking the headline wants to go — while the
   permalink travels as a non-permalink <guid> for de-duplication and as the
   trailing ★, which is the only route back to our copy from a feed reader.

   Two things below were confirmed by inspecting @astrojs/rss's build, not
   assumed (Task 5, Step 1 and its follow-on description check):

   1. It always derives its own <guid isPermaLink="true"> from `link`
      (node_modules/@astrojs/rss/dist/index.js) — confirmed by building the
      pre-Task-5 feed and finding one <guid> per item, all isPermaLink=true.
      That does not produce a duplicate here: `customData` is merged into
      the same item object via `Object.assign(item, parsedCustomData)`, and
      our <guid> below lands on the identical `guid` key, so it *replaces*
      the generated one rather than sitting alongside it. Confirmed by
      building with the code below: every item still carries exactly one
      <guid>, now with our permalink and the right isPermaLink value.

   2. The builder (fast-xml-builder, used internally) always entity-escapes
      string field values — it has no CDATA passthrough wired up, so a
      literal "<![CDATA[...]]>" string is escaped like any other text and
      its own delimiters leak into the description as visible "![CDATA["
      junk. So `description` below is a plain string: @astrojs/rss escapes
      it into ordinary entity-encoded HTML — the standard, interoperable
      way RSS carries embedded markup — and any compliant reader decodes it
      back to the <p> and the ★ anchor. */
export async function GET(context) {
  const posts = (await getCollection('writing'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const site = context.site.href.replace(/\/$/, '');

  return rss({
    title: 'Gaspery · a working notebook',
    description: 'Product, design & small software. A working notebook.',
    site: context.site,
    items: posts.map((post) => {
      // Built by hand, independently of @astrojs/rss's own `createCanonicalURL`
      // (node_modules/@astrojs/rss/dist/util.js), which derives the essay
      // <link> below from the relative `/writing/${post.id}/` path. The two
      // agree today because both assume a trailing slash — this hand-built
      // one always adds one, and `createCanonicalURL` defaults its own
      // `trailingSlash` option to `true` — but they are not wired together,
      // so a future `trailingSlash` config change could silently split them.
      const permalink = `${site}/writing/${post.id}/`;
      const linked = isLink(post.data);
      const star = `<p><a href="${permalink}" title="Permanent link to this post">★</a></p>`;
      return {
        title: post.data.title,
        pubDate: post.data.date,
        link: linked ? post.data.sourceUrl : `/writing/${post.id}/`,
        description: linked ? `<p>${post.data.dek}</p>${star}` : post.data.dek,
        customData: `<guid isPermaLink="${linked ? 'false' : 'true'}">${permalink}</guid>`,
      };
    }),
  });
}
