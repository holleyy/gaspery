/* A two-arm landing test, shared by /skal and /afterframe.

   The arm lives in the URL (/x/a, /x/b) because Counterscale counts
   pageviews by path; the only on-demand route is the bare /x, which reads a
   functional cookie, tosses a coin when there is none, and redirects. Each
   arm's call to action lands on that arm's own /go page so the click is a
   pageview too. See src/lib/skal.ts and src/lib/afterframe.ts for the two
   tests' own constants. */

export const ARMS = ['a', 'b'] as const;
export type Arm = (typeof ARMS)[number];

export function isArm(value: unknown): value is Arm {
  return value === 'a' || value === 'b';
}

/* A fair coin, from the platform's own randomness. */
export function pickArm(random: () => number = Math.random): Arm {
  return random() < 0.5 ? 'a' : 'b';
}

/* The arm a request should see: an explicit ?v= wins (so a specific arm can
   be shared or checked), then the cookie, then a fresh coin. */
export function resolveArm(
  query: string | null,
  cookie: string | undefined,
  random: () => number = Math.random,
): { variant: Arm; fresh: boolean } {
  if (isArm(query)) return { variant: query, fresh: query !== cookie };
  if (isArm(cookie)) return { variant: cookie, fresh: false };
  return { variant: pickArm(random), fresh: true };
}
