/* The only module that knows what makes an entry a link post. Pure functions
   over plain data, so they can be tested without an Astro build. */

export type LinkFields = { sourceUrl?: string };

/** An entry is a link post if, and only if, it carries a source URL. A type
    predicate, not a plain boolean, so a caller that branches on `isLink(x)`
    gets `x.sourceUrl` narrowed from `string | undefined` to `string` —
    that's what lets rendering surfaces call this instead of re-testing the
    raw field just to satisfy the type checker at the `sourceDomain(...)`
    call site. */
export function isLink<T extends LinkFields>(data: T): data is T & { sourceUrl: string } {
  return typeof data.sourceUrl === 'string' && data.sourceUrl.length > 0;
}

export type FeatureFields = { template?: string };

/** A feature post is one whose body renders as an art-directed, full-bleed
    layout instead of the reading column. Deliberately a plain boolean, not a
    type predicate like `isLink`: nothing downstream needs `template` narrowed,
    and the value carries no payload a caller would use. */
export function isFeature(data: FeatureFields): boolean {
  return data.template === 'feature';
}

/** True when the string parses as an http(s) URL. Must not throw: Zod's
    `.url()` marks a bad string dirty without aborting, so this predicate
    still runs on input that already failed URL parsing. */
export function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Display form of a source's host: no scheme, no `www.`, no port, no path.
    Safe to call unguarded — the schema has already rejected anything that is
    not an http(s) URL. */
export function sourceDomain(sourceUrl: string): string {
  return new URL(sourceUrl).hostname.replace(/^www\./, '');
}

export type WritingData = LinkFields & {
  title: string;
  date: Date;
  dek: string;
  readingTime?: string;
  template?: string;
};
export type WritingEntry = { id: string; data: WritingData };

export type PostProps = {
  href: string;
  title: string;
  date: Date;
  dek: string;
  readingTime?: string;
  sourceUrl?: string;
  isNew: boolean;
  isFeature: boolean;
};

/** The newest essay in a date-sorted list, or null if it holds none.
    "New" marks essays only: links post often, and left unscoped the tag would
    sit on a link permanently and stop meaning anything. A links-only list
    therefore yields null, so callers need no special case. */
export function newestEssayId(entries: WritingEntry[]): string | null {
  return entries.find((e) => !isLink(e.data))?.id ?? null;
}

/** Map a collection entry to what WritingList renders. The single place that
    knows the prop shape — four pages call it. */
export function toPostProps(entry: WritingEntry, newestId: string | null): PostProps {
  return {
    href: `/writing/${entry.id}`,
    title: entry.data.title,
    date: entry.data.date,
    dek: entry.data.dek,
    readingTime: entry.data.readingTime,
    sourceUrl: entry.data.sourceUrl,
    isNew: entry.id === newestId,
    isFeature: isFeature(entry.data),
  };
}
