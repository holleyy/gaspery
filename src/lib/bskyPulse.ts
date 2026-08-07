import sidebar from '../data/sidebar/index.json';

/* The only module that knows Bluesky exists. Everything above it deals in
   `Pulse | null` and never has to handle a network error. */

export type Pulse = { text: string; url: string; isoDate: string };

const ENDPOINT = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed';
const MAX_CHARS = 100;
const TIMEOUT_MS = 4000;

const handle = () => (sidebar.pulseHandle ?? '').trim();

export function isPulseEnabled(): boolean {
  return sidebar.pulseEnabled === true && handle().length > 0;
}

export function ageToken(isoDate: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - Date.parse(isoDate)) / 60_000);
  if (minutes < 60) return 'now';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function truncate(raw: string): string {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (text.length <= MAX_CHARS) return text;
  const cut = text.slice(0, MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

export async function fetchLatestPost(): Promise<Pulse | null> {
  if (!isPulseEnabled()) return null;
  const actor = handle();
  const url = `${ENDPOINT}?actor=${encodeURIComponent(actor)}&limit=10&filter=posts_no_replies`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { feed?: any[] };
    const feed = Array.isArray(data.feed) ? data.feed : [];
    /* Clearing the number field in Keystatic writes null, which would make
       every comparison against NaN false and disable the cutoff silently. */
    const cutoffMs = (Number(sidebar.pulseMaxAgeDays) || 90) * 86_400_000;

    for (const item of feed) {
      if (item?.reason) continue;              // a repost, not their post
      const post = item?.post;
      const record = post?.record;
      if (!post || !record) continue;
      if (record.reply) continue;              // defensive: the filter param misses these
      const isoDate = record.createdAt;
      if (!isoDate || Number.isNaN(Date.parse(isoDate))) continue;
      const text = truncate(record.text ?? '');
      if (!text) continue;
      const rkey = String(post.uri ?? '').split('/').pop();
      if (!rkey) continue;

      /* Age is enforced here, not at render time, so the route and the
         component can never disagree about what counts as too old. */
      if (Date.now() - Date.parse(isoDate) > cutoffMs) return null;

      return { text, url: `https://bsky.app/profile/${actor}/post/${rkey}`, isoDate };
    }
    return null;
  } catch {
    return null;
  }
}

/* Memoised for build time only: one request per build no matter how many
   pages render the rail. Deliberately NOT used by the API route -- a
   module-level cache lives as long as the Worker isolate, which would
   freeze the endpoint on one post long past its edge-cache expiry. */
let cached: Promise<Pulse | null> | undefined;
export function getLatestPost(): Promise<Pulse | null> {
  cached ??= fetchLatestPost();
  return cached;
}
