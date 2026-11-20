/* /catsbypost: the page's facts, and the town window's clock.

   The facts come from the game itself (~/Git/cosysortie, src/data/levels.json):
   eight chapters, a hundred puzzles, six places. They sit here rather than in
   the markup so the page and tests/catsbypost.test.ts read one copy.

   The clock is kept free of the DOM so it can be tested under `node --test`;
   the page's script imports it and does the DOM work. */

export const ASSETS = '/shots/catsbypost';

export interface Stop {
  name: string;
  /** The custom property (declared in catsbypost.css) holding this place's sky. */
  sky: string;
  /** A dark sky takes paper type. */
  dark: boolean;
  chapters: string;
  puzzles: number;
  copy: string;
  /** Three of its puzzles, by the names the game gives them. */
  names: [string, string, string];
  image: { src: string; width: number; height: number; alt: string };
}

export const STOPS: Stop[] = [
  {
    name: 'The Sorting Office', sky: '--sunset', dark: false, chapters: 'Chapters 1 and 2', puzzles: 15,
    copy: 'Where everyone starts. Plain turntables first, then coloured coats, and a sleeping dog or two in the way.',
    names: ['First post', 'Let sleeping dogs lie', 'Loop the loop'],
    image: { src: `${ASSETS}/rooms/office.webp`, width: 2000, height: 1500, alt: 'The Sorting Office floor part-way through a puzzle: a ginger cat in a box at the hatch, plain, blue and ginger turntables laid out, and a blue and a ginger basket waiting' },
  },
  {
    name: 'The Town Depot', sky: '--rose', dark: false, chapters: 'Chapters 3 and 4', puzzles: 25,
    copy: 'Vans to load, and a whole town of front doors. Gates switch behind each cat, so the order of the queue starts to matter.',
    names: ['Mind the order', 'A door of their own', 'Every door in town'],
    image: { src: `${ASSETS}/rooms/depot.webp`, width: 960, height: 600, alt: 'The Town Depot under a rose sunset: an open brick depot with a red van at the door and the puzzle floor in the middle of the yard' },
  },
  {
    name: 'The Night Mail', sky: '--dusk', dark: true, chapters: 'Chapter 5', puzzles: 15,
    copy: 'A sorting carriage on the viaduct at dusk. Railway points send one bag up the line and the next one down.',
    names: ['Up line, down line', 'Do not wake the sleeper', 'The night mail'],
    image: { src: `${ASSETS}/rooms/night-mail.webp`, width: 960, height: 600, alt: 'The Night Mail crossing a brick viaduct at dusk, a green engine ahead and a sorting carriage cut open to show cats on the board inside' },
  },
  {
    name: 'The Great Postal Vault', sky: '--day', dark: false, chapters: 'Chapter 6', puzzles: 15,
    copy: 'A glass roof, a gold clock and tunnels under the floor. A cat goes in one end and comes out the other, still facing the same way.',
    names: ['Same heading, new place', 'Passing in the pipes', 'The great sorting hall'],
    image: { src: `${ASSETS}/rooms/vault.webp`, width: 2000, height: 1500, alt: 'The Great Postal Vault: a glass-roofed hall with a central staircase, a gold clock and a pale stone puzzle floor, set in a formal square' },
  },
  {
    name: 'Morning Dispatch', sky: '--dawn', dark: false, chapters: 'Chapter 7', puzzles: 15,
    copy: 'The parcel room first thing, with the van waiting. Big cats in big boxes take their time, and the little ones overtake.',
    names: ['A parcel takes its time', 'Just in time for a nap', 'The big cat parade'],
    image: { src: `${ASSETS}/rooms/dispatch.webp`, width: 2000, height: 1500, alt: 'Morning Dispatch in early light: a parcel room with shelves of boxes, the blue puzzle floor and a red delivery van waiting at the door' },
  },
  {
    name: 'Christmas Post', sky: '--snow', dark: true, chapters: 'Chapter 8', puzzles: 15,
    copy: 'Snow outside and everything at once inside. It finishes with thirty-two cats and the last post of the year.',
    names: ['Before the rush', 'One warm doorstep', 'The last post'],
    image: { src: `${ASSETS}/rooms/christmas.webp`, width: 960, height: 600, alt: 'Christmas Post: the sorting room in deep snow at blue hour, a decorated tree beside the board and lit shopfronts behind' },
  },
];

/** The duty rota: three more ways to play, once the round is known. */
export const ROTA: { duty: string; when: string; what: string }[] = [
  { duty: 'Today’s post', when: 'Every day', what: 'One fresh puzzle, with time to think and a hint if you need one.' },
  { duty: 'Practice', when: 'Monday to Sunday', what: 'Freshly generated puzzles at the difficulty you choose, from a gentle Monday to a challenging Sunday.' },
  { duty: 'Night Shift', when: 'Weekly, or a fresh route', what: 'Round after round, with a helpful favour at each tea break. Three wrong baskets end the shift.' },
];

/** The coats Night Shift deliveries bring in; ginger and blue do the round. */
export const STAFF: { file: string; name: string; alt: string }[] = [
  { file: 'black', name: 'Black', alt: 'A black and white cat sitting on the sorting desk, looking out of the window' },
  { file: 'calico', name: 'Calico', alt: 'A calico cat perched on a stool' },
  { file: 'cream', name: 'Cream', alt: 'A cream cat on a folded blanket' },
  { file: 'siamese', name: 'Siamese', alt: 'A Siamese cat sitting upright among parcels' },
  { file: 'smoke', name: 'Smoke', alt: 'A smoke-grey long-haired cat on the counter' },
  { file: 'tabby', name: 'Tabby', alt: 'A silver tabby on a stool in front of the pigeonholes' },
  { file: 'tortoiseshell', name: 'Tortie', alt: 'A tortoiseshell cat under a brass desk lamp' },
  { file: 'white', name: 'White', alt: 'A white cat with blue eyes on a green chair' },
];

/** The three turntables in the tray, in the game's own colours. */
export const TURNTABLES: { type: 'plain' | 'ginger' | 'blue'; fill: string }[] = [
  { type: 'plain', fill: '#467e7b' },
  { type: 'ginger', fill: '#d9913f' },
  { type: 'blue', fill: '#627f9e' },
];

/* ---- The town window ------------------------------------------------------
   Eight views of one town: four seasons, by day and by night. The window opens
   on the visitor's own season and hour. */

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export const LIGHTS = ['day', 'night'] as const;
export type Season = (typeof SEASONS)[number];
export type Light = (typeof LIGHTS)[number];

export interface TownTime { season: Season; light: Light; word: string }

/** The view for a moment in the visitor's own clock. Seasons are the
    meteorological ones of the northern hemisphere, where the town is. */
export function townAt(date: Date): TownTime {
  const m = date.getMonth(), h = date.getHours();
  const season: Season = m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  const light: Light = h >= 7 && h < 17 ? 'day' : 'night';
  const word = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night';
  return { season, light, word };
}

/** What the window shows, in words. The visitor's own view says "It's";
    any other, chosen with the buttons, says "This is". */
export function townLine(season: Season, light: Light, mine: TownTime): { own: boolean; phrase: string; headline: string } {
  const own = season === mine.season && light === mine.light;
  const word = own ? mine.word : light === 'day' ? 'afternoon' : 'night';
  const phrase = `${/^[aeiou]/.test(season) ? 'an' : 'a'} ${season} ${word}`;
  return { own, phrase, headline: `${own ? 'It’s' : 'This is'} ${phrase} in town.` };
}

export const townImage = (season: Season, light: Light) => `${ASSETS}/town/${season}-${light}.webp`;
