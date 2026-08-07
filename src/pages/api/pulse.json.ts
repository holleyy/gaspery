import type { APIRoute } from 'astro';
import { fetchLatestPost, ageToken } from '../../lib/bskyPulse';

/* On-demand: this route runs on the Worker, alongside Keystatic's injected routes. */
export const prerender = false;

export const GET: APIRoute = async () => {
  const post = await fetchLatestPost();
  const body = post ? { post: { ...post, age: ageToken(post.isoDate) } } : { post: null };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
