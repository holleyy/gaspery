/* The app's themes and dock styles, for the Craft page.

   The palettes are a port of `GROD/Sources/DesignSystem/Themes.swift` in the
   GRØD repo (the fields this site prints with), and the dock styles' names
   and one-line characters are from `Toppings.swift`. The Craft page can be
   printed in any of these inks: `inkCss()` turns each theme's light palette
   into the page's paper bands and its dark palette into the night bands.

   Sepia Contrast and Flexoki Contrast are left out: they differ from their
   parents only in the app's sidebar, which the page does not have. */

export interface Palette {
  paper: string; surface: string; surfaceRaised: string; hairline: string;
  ink: string; inkSecondary: string; brand: string; brandBright: string;
}
export interface Theme { id: string; name: string; light: Palette; dark: Palette }

const p = (paper: string, surface: string, surfaceRaised: string, hairline: string, ink: string, inkSecondary: string, brand: string, brandBright: string): Palette =>
  ({ paper, surface, surfaceRaised, hairline, ink, inkSecondary, brand, brandBright });

/* The house theme first, then the order the page lists them in. */
export const THEMES: Theme[] = [
  { id: 'riso', name: 'Riso',
    light: p('#F6F1E6', '#E9E5DC', '#F3EFE6', '#D9D3C6', '#232019', '#6C6759', '#D63A86', '#B82E70'),
    dark: p('#191712', '#1E1C18', '#29261F', '#39352C', '#EDE8DC', '#A8A18E', '#F06AA6', '#F582B5') },
  { id: 'grod-warm', name: 'GRØD Warm',
    light: p('#FBF8F1', '#ECE8DF', '#F5F1E8', '#DED8C9', '#23201A', '#6A6455', '#4234C2', '#3B2FAE'),
    dark: p('#1B1914', '#201E19', '#2A271F', '#3A362C', '#ECE7DB', '#A8A28F', '#7A6BF0', '#9B8CFF') },
  { id: 'nord', name: 'Nord',
    light: p('#ECEFF4', '#E5E9F0', '#F5F7FA', '#D8DEE9', '#2E3440', '#4C566A', '#5E81AC', '#3F6591'),
    dark: p('#2E3440', '#272C36', '#3B4252', '#434C5E', '#ECEFF4', '#D8DEE9', '#5E81AC', '#88C0D0') },
  { id: 'sepia', name: 'Sepia',
    light: p('#F6F0E4', '#EFE7D6', '#FBF7EE', '#E0D5BF', '#3B3226', '#6E6250', '#8F5B2E', '#8F5B2E'),
    dark: p('#221E19', '#1E1A16', '#2B2620', '#3E372E', '#EDE5D8', '#B3A894', '#C89A66', '#D2A46A') },
  { id: 'red-graphite', name: 'Red Graphite',
    light: p('#F6F8F8', '#EFF1F2', '#FFFFFF', '#DDE0E1', '#292C2E', '#5C6467', '#CB4C48', '#BC403C'),
    dark: p('#282E3E', '#232838', '#2E3547', '#39415A', '#EFF1F5', '#B8BECF', '#F6CD74', '#F6CD74') },
  { id: 'flexoki', name: 'Flexoki',
    light: p('#FFFCF0', '#F2F0E5', '#FFFCF0', '#DAD8CE', '#100F0F', '#6F6E69', '#24837B', '#24837B'),
    dark: p('#100F0F', '#1C1B1A', '#282726', '#343331', '#CECDC3', '#918F8A', '#3AA99F', '#3AA99F') },
  { id: 'braun', name: 'Braun',
    light: p('#FAF8F3', '#E7E4DD', '#F3F0E9', '#D8D3C8', '#1F1D1A', '#6B665C', '#E8482A', '#C2432A'),
    dark: p('#1B1917', '#201E1B', '#2A2723', '#3C3833', '#EDEAE3', '#A8A296', '#E8482A', '#FF7A5C') },
];
export const HOUSE_THEME = 'riso';

/* The dock styles, which the app calls toppings, in the order the page
   lists them: the house one first. The house one is named Overprint here
   (the app's "Overprint D2" is being renamed; its id and the capture file
   names keep the old one), and its line is written for a reader rather
   than taken from the app, whose own called it "the hero". */
export const DOCK_STYLES = [
  { id: 'overprintd2', name: 'Overprint', character: 'The house topping: risograph print, a little off register.' },
  { id: 'fukasawa', name: 'Fukasawa', character: 'Matte tray, super-normal.' },
  { id: 'ledger', name: 'Ledger', character: 'Ruled account book.' },
  { id: 'marginalia', name: 'Marginalia', character: 'Annotated margin.' },
  { id: 'castiglioni', name: 'Castiglioni', character: 'The provocation.' },
  { id: 'jensen', name: 'Jensen', character: 'Dark instrument on light paper.' },
  { id: 'crunchy2', name: 'Crunchy 2', character: 'Serif calendar-leaf.' },
] as const;

/* ---- Colour arithmetic --------------------------------------------------- */
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
export const mix = (a: string, b: string, t: number) => { const [x, y] = [rgb(a), rgb(b)]; return hex(x.map((v, i) => v + (y[i] - v) * t)); };
/* Nudges a colour toward another until it reads at 4.5:1 on its ground: a
   theme's accent is tuned for the app's own uses, and here it sets links. */
const readable = (colour: string, ground: string, toward: string, min = 4.5) => {
  let c = colour;
  for (let t = 0.08; contrast(c, ground) < min && t <= 1; t += 0.08) c = mix(colour, toward, t);
  return c;
};

/* What the page's tokens become on one ground. */
export function tokens(pal: Palette, dark: boolean) {
  const strong = readable(pal.brandBright, pal.paper, pal.ink);
  const hover = contrast(pal.brand, pal.paper) >= 4.5 ? pal.brand : mix(strong, pal.ink, 0.2);
  /* The key: the accent with whichever label reads on it. */
  const key = dark ? pal.brandBright : strong;
  const keyInk = contrast('#FFFFFF', key) >= 4.5 ? '#FFFFFF' : readable(pal.paper, key, dark ? '#000000' : '#FFFFFF');
  const shade = dark ? '#FFFFFF' : pal.ink;
  return {
    '--color-paper': pal.paper,
    '--color-surface': pal.surface,
    '--color-surface-raised': pal.surfaceRaised,
    '--color-hairline': pal.hairline,
    '--color-ink': pal.ink,
    '--color-ink-secondary': readable(pal.inkSecondary, pal.paper, pal.ink),
    '--color-brand': pal.brand,
    '--color-brand-bright': strong,
    '--color-brand-strong': strong,
    '--color-brand-strong-hover': hover,
    '--color-teal': strong,
    '--color-teal-ink': strong,
    '--g-key': key,
    '--g-key-hover': mix(key, shade, 0.1),
    '--g-key-press': mix(key, shade, 0.18),
    '--g-key-ink': keyInk,
  };
}

/* The stylesheet that prints the Craft page in each ink but the house one,
   which is the page's own. `root` is the page root's selector. */
export function inkCss(root: string): string {
  const block = (sel: string, t: Record<string, string>) => `${sel}{${Object.entries(t).map(([k, v]) => `${k}:${v}`).join(';')}}`;
  return THEMES.filter((t) => t.id !== HOUSE_THEME).map((t) => {
    const at = `${root}[data-ink="${t.id}"]`;
    return [
      block(at, { ...tokens(t.light, false), '--g-ghost': t.light.brand, '--g-night': t.dark.paper, '--g-night-teal': t.dark.brandBright, '--gc-rule': t.light.brand }),
      block(`${at} .ge-clause[data-band="dark"],${at} .g-night`, { ...tokens(t.dark, true), color: t.dark.ink, '--gc-rule': t.dark.brandBright }),
    ].join('\n');
  }).join('\n');
}
