/* The GRØD Demo workspace's meetings, as dates on a planner.

   The landing page plots real meetings, never invented ones. The Demo has
   two sources: a year of ordinary history that the app generates in code
   (GROD/Sources/Demo/DemoHistory.swift, HOL-679) and the canonical five
   weeks in GROD/Resources/Demo/demo-workspace.json. The history is
   deterministic, so it is ported here line for line rather than copied as
   data; tests/grod.test.ts pins the month counts the app's own year page
   shows (January 12, February 12, March 13, April 7: 44 so far in 2026;
   November 2025 has 14). When HOL-734 re-dates the Demo, this file moves
   with it. */

export interface DemoMeeting {
  /* YYYY-MM-DD, in the Demo's own calendar (Europe/London). */
  date: string;
  title: string;
  tags: string[];
  people: string[];
}

/* The Demo's today: Thursday 16 April 2026. */
export const DEMO_TODAY = '2026-04-16';

const HISTORY_FIRST_DAY = Date.UTC(2025, 3, 7);
/* History stops before the canonical window's lower bound, 12 Mar 2026. */
const HISTORY_END_BEFORE = Date.UTC(2026, 2, 12);
const HOLIDAYS_START = Date.UTC(2025, 11, 1);
const HOLIDAYS_END = Date.UTC(2026, 0, 5);

const TOPICS = ['onboarding', 'agenda density', 'people page', 'search'];
const CUSTOMERS = ['Havn', 'Fjord Bank', 'Vide', 'Lumo'];

const DAY = 24 * 60 * 60 * 1000;

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function ymd(ms: number): { y: number; m: number; d: number } {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function history(): DemoMeeting[] {
  const out: DemoMeeting[] = [];
  const add = (title: string, at: number, people: string[], tags: string[]) => {
    if (!(at < HISTORY_END_BEFORE)) return;
    if (at >= HOLIDAYS_START && at < HOLIDAYS_END) return;
    out.push({ date: iso(at), title, tags, people });
  };

  let monday = HISTORY_FIRST_DAY;
  let week = 0;
  while (monday < HISTORY_END_BEFORE) {
    const { y, m, d } = ymd(monday);
    const at = (offset: number) => monday + offset * DAY;

    // Monday: the team sync. #Platform on the first two Mondays of
    // September and October 2025, and every Monday in November.
    const platform = y === 2025 && (((m === 9 || m === 10) && d <= 14) || m === 11);
    const syncTeam = monday >= Date.UTC(2026, 0, 5)
      ? ['Maya Chen', 'Tomas Varga', 'Lena Ortiz', 'Nils Rud']
      : ['Maya Chen', 'Tomas Varga', 'Lena Ortiz'];
    add('Team sync', at(0), syncTeam, platform ? ['Team', 'Platform'] : ['Team']);

    // Tuesday: hiring loops, four in October 2025, two in November with
    // the candidate.
    if (y === 2025 && m === 10) {
      add('Hiring loop: Senior iOS', at(1), ['Tomas Varga', 'Lena Ortiz'], ['Hiring']);
    }
    if (y === 2025 && m === 11 && d <= 10) {
      add('Hiring loop: Senior iOS', at(1), ['Tomas Varga', 'Lena Ortiz', 'Nils Rud'], ['Hiring']);
    }

    // The week of 18 Aug 2025 is quiet: its Monday sync only.
    const quiet = y === 2025 && m === 8 && d === 18;
    if (!quiet) {
      const designers = y === 2026 && m === 1 && (d === 12 || d === 19)
        ? ['Ellis Morgan', 'Nia Okafor', 'Samir Bell', 'Hege Sæther']
        : ['Ellis Morgan', 'Nia Okafor', 'Samir Bell'];
      add(`Design review: ${TOPICS[week % TOPICS.length]}`, at(2), designers, ['Design review']);

      const thursday = at(3);
      const t = ymd(thursday);
      const saraAttends = t.y === 2025 && t.m === 6 && t.d >= 12;
      const callers = saraAttends
        ? ['Jonah Reed', 'Priya Shah', 'Sara Lind']
        : ['Jonah Reed', 'Priya Shah'];
      const customer = saraAttends ? 'Havn' : CUSTOMERS[week % CUSTOMERS.length];
      add(`Customer call: ${customer}`, thursday, callers, ['Customers']);
    }

    week += 1;
    monday += 7 * DAY;
  }
  return out;
}

/* The canonical five weeks, from demo-workspace.json (titles and tags
   verbatim; people omitted where the page does not need them). */
const CANONICAL: DemoMeeting[] = [
  { date: '2026-03-13', title: 'Customer interview synthesis: recommendation trust', tags: ['Research', 'Customer signal', 'Trust'], people: [] },
  { date: '2026-03-17', title: 'Weekly product review: research readout', tags: ['Product review', 'Research', 'Trust', 'Team'], people: [] },
  { date: '2026-03-17', title: 'Onboarding framing workshop', tags: ['Onboarding', 'Product writing'], people: [] },
  { date: '2026-03-20', title: 'Confidence ribbon design critique', tags: ['Confidence ribbon', 'Design critique', 'Trust', 'Accessibility', 'Design reviews'], people: [] },
  { date: '2026-03-24', title: 'Weekly product review: critique follow-through', tags: ['Product review', 'Design critique', 'Pilot scope', 'Team'], people: [] },
  { date: '2026-03-24', title: 'Evidence service engineering scope', tags: ['Engineering', 'Scoping'], people: [] },
  { date: '2026-03-27', title: 'Spring pilot readiness: first pass', tags: ['Pilot', 'Launch readiness', 'Pilot review'], people: [] },
  { date: '2026-03-31', title: 'Weekly product review: evidence prototype', tags: ['Product review', 'Prototype', 'Team'], people: [] },
  { date: '2026-04-03', title: 'Accessibility review: evidence and motion', tags: ['Accessibility', 'Quality', 'Design review'], people: [] },
  { date: '2026-04-07', title: 'Reliability incident review: delayed recommendations', tags: ['Incident review', 'Reliability', 'Pilot'], people: [] },
  { date: '2026-04-10', title: 'Customer advisory: evidence language', tags: ['Customer advisory', 'Product writing', 'Customers'], people: [] },
  { date: '2026-04-13', title: 'Spring pilot launch readiness', tags: ['Launch readiness', 'Pilot', 'Decision'], people: [] },
  { date: '2026-04-15', title: 'Speaker attribution QA', tags: ['Quality', 'Speaker review'], people: [] },
  { date: '2026-04-16', title: 'Weekly product review: pilot narrative', tags: ['Product review', 'Pilot', 'Narrative', 'Pilot review'], people: ['Maya Chen', 'Ellis Morgan', 'Nia Okafor', 'Tomas Varga', 'Jonah Reed'] },
];

export const DEMO_MEETINGS: DemoMeeting[] = [...history(), ...CANONICAL];

/* The weekly product review's instances, as the series ladder shows them. */
export const WEEKLY_REVIEW_DATES = ['2026-03-17', '2026-03-24', '2026-03-31', '2026-04-16'];
export const WEEKLY_REVIEW_SKIPPED = '2026-04-09';
export const WEEKLY_REVIEW_NEXT = '2026-04-21';

/* Meetings per day, keyed YYYY-MM-DD. */
export function countsByDay(meetings: DemoMeeting[] = DEMO_MEETINGS): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of meetings) counts.set(m.date, (counts.get(m.date) ?? 0) + 1);
  return counts;
}

export interface PlannerCell {
  date: string;
  day: number;
  /* 0 = Monday … 6 = Sunday. */
  weekday: number;
  count: number;
}

export interface PlannerRow {
  /* YYYY-MM. */
  month: string;
  label: string;
  year: number;
  total: number;
  /* Always 31 entries; null where the month has no such day. */
  cells: (PlannerCell | null)[];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* Twelve month rows ending at the month that holds `today`, so the planner
   is always full: with the Demo set on 16 April 2026 it runs May 2025 to
   April 2026, and the December gap on it is the Demo's real holiday. */
export function plannerRows(today: string = DEMO_TODAY, meetings: DemoMeeting[] = DEMO_MEETINGS): PlannerRow[] {
  const counts = countsByDay(meetings);
  const [ty, tm] = today.split('-').map(Number);
  const rows: PlannerRow[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    let y = ty;
    let m = tm - i;
    while (m < 1) { m += 12; y -= 1; }
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (PlannerCell | null)[] = [];
    let total = 0;
    for (let d = 1; d <= 31; d += 1) {
      if (d > days) { cells.push(null); continue; }
      const ms = Date.UTC(y, m - 1, d);
      const date = iso(ms);
      const count = counts.get(date) ?? 0;
      total += count;
      cells.push({ date, day: d, weekday: (new Date(ms).getUTCDay() + 6) % 7, count });
    }
    rows.push({ month: `${y}-${String(m).padStart(2, '0')}`, label: MONTHS[m - 1], year: y, total, cells });
  }
  return rows;
}

export function countIn(month: string, meetings: DemoMeeting[] = DEMO_MEETINGS): number {
  return meetings.filter((m) => m.date.startsWith(month)).length;
}
