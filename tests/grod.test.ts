import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GROD_VARIANTS,
  GROD_VARIANT_COOKIE,
  BETA_URL,
  isGrodVariant,
  resolveGrodVariant,
  grodGoPath,
} from '../src/lib/grod.ts';
import {
  DEMO_MEETINGS,
  DEMO_TODAY,
  countIn,
  countsByDay,
  plannerRows,
} from '../src/lib/grodDemo.ts';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the test has exactly two arms, each with its own go page', () => {
  assert.deepEqual([...GROD_VARIANTS], ['a', 'b']);
  assert.equal(isGrodVariant('c'), false);
  assert.equal(grodGoPath('a'), '/grod/a/go/');
  assert.equal(GROD_VARIANT_COOKIE, 'grod-variant');
  assert.deepEqual(resolveGrodVariant(null, 'b', () => 0.1), { variant: 'b', fresh: false });
});

test('the beta link is an email, no form, no tracker', () => {
  assert.match(BETA_URL, /^mailto:hello@gaspery\.com\?subject=/);
});

/* The planner plots real meetings: the port of DemoHistory.swift must
   reproduce what the app's own year and month pages print. */
/* The app's sidebar prints April 7 and the year page 44: those counts
   include the one note in the Demo (Pilot demo checklist, 14 Apr). The
   planner plots meetings, so it holds 6 and 43. */
test('2026 has the meetings the year page shows, month by month', () => {
  assert.equal(countIn('2026-01'), 12);
  assert.equal(countIn('2026-02'), 12);
  assert.equal(countIn('2026-03'), 13);
  assert.equal(countIn('2026-04'), 6);
  assert.equal(countIn('2026'), 43);
});

test('November 2025 has 14 meetings, in the weeks the month page shows', () => {
  assert.equal(countIn('2025-11'), 14);
  const counts = countsByDay();
  const week = (from: number, to: number) => {
    let n = 0;
    for (let d = from; d <= to; d += 1) n += counts.get(`2025-11-${String(d).padStart(2, '0')}`) ?? 0;
    return n;
  };
  assert.deepEqual([week(1, 2), week(3, 9), week(10, 16), week(17, 23), week(24, 30)], [0, 4, 4, 3, 3]);
});

test('the month facts hold: Nils Rud is first met on Tue 4 Nov, and December is empty', () => {
  const nils = DEMO_MEETINGS.filter((m) => m.people.includes('Nils Rud')).map((m) => m.date).sort();
  assert.equal(nils[0], '2025-11-04');
  assert.equal(countIn('2025-12'), 0);
  const platformNov = DEMO_MEETINGS.filter((m) => m.date.startsWith('2025-11') && m.tags.includes('Platform')).length;
  const platformOct = DEMO_MEETINGS.filter((m) => m.date.startsWith('2025-10') && m.tags.includes('Platform')).length;
  assert.deepEqual([platformOct, platformNov], [2, 4]);
});

test('the planner is twelve full rows ending on the month that holds today', () => {
  const rows = plannerRows();
  assert.equal(rows.length, 12);
  assert.equal(rows[0].month, '2025-05');
  assert.equal(rows[11].month, '2026-04');
  assert.equal(rows[11].cells[15]?.date, DEMO_TODAY);
  assert.equal(rows[11].cells[15]?.weekday, 3); // Thursday
  assert.equal(rows[11].cells[30], null); // April has 30 days
  assert.equal(rows[0].cells[30]?.day, 31);
});

test('each arm carries its direction contract inside the page root', () => {
  for (const arm of GROD_VARIANTS) {
    const page = read(`src/pages/grod/${arm}.astro`);
    assert.match(page, /THESIS:/);
    assert.match(page, /FINISH: unreviewed and undocumented is unfinished/);
    assert.match(page, /grodGoPath\('[ab]'\)/);
  }
});
