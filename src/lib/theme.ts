/* Theme preference logic, kept free of the DOM so it can be unit-tested
   under `node --test` alongside src/lib/links.ts. The DOM work lives in
   ThemeToggle.astro and in Base.astro's pre-paint script. */

/** The localStorage key. Repeated as a literal in Base.astro's inline
    script, which runs before the bundle exists and so cannot import this. */
export const THEME_STORAGE_KEY = 'theme';

/** What the reader has asked for. `system` is the default and stays
    reachable, which is why there are three of these and not two: a
    two-state toggle can never hand control back to the OS. */
export type ThemePreference = 'light' | 'dark' | 'system';

/** What actually gets painted. */
export type Appearance = 'light' | 'dark';

const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value);
}

/** Anything unrecognised — absent, corrupt, hand-edited — is `system`.
    Storage is user-writable, so this must never throw. */
export function readPreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : 'system';
}

export function resolveTheme(stored: unknown, systemPrefersDark: boolean): Appearance {
  const preference = readPreference(stored);
  if (preference !== 'system') return preference;
  return systemPrefersDark ? 'dark' : 'light';
}
