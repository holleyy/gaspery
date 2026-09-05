import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const rail = read('src/components/Rail.astro');
const css = read('src/styles/global.css');

test('Rail defaults to the Gaspery identity so pages pass only `current`', () => {
  assert.match(rail, /name = 'Gaspery\.'/);
  assert.match(rail, /role = 'Words, design, tools & links'/);
  assert.match(rail, /monogram = 'G'/);
});

test('rail wordmark is two stacked copies with a decorative ghost', () => {
  // Same construction as the hero title: the ghost is aria-hidden so
  // assistive tech reads "Gaspery." once, not twice.
  assert.match(rail, /class="rail-wordmark__ghost" aria-hidden="true"/);
  assert.match(rail, /class="rail-wordmark__ink"/);
  // The rail must not fall back to the app-page wordmark class.
  assert.doesNotMatch(rail, /class="wordmark"/);
});

test('home link is labelled without the wordmark full stop', () => {
  assert.match(rail, /aria-label=\{`\$\{name\.replace\(\/\\\.\$\/, ''\)\}, home`\}/);
});

test('colophon signs off with the author on their own label line', () => {
  assert.match(rail, /<div class="label">Alex Holley<\/div>\s*<div class="label">© MMXXVI · London<\/div>/);
});

test('rail wordmark is set at Regular with a 2px ghost, and is not .wordmark', () => {
  const block = css.match(/\.rail-wordmark__ink,\s*\.rail-wordmark__ghost\s*\{([^}]*)\}/);
  assert.ok(block, 'no shared rail-wordmark rule');
  assert.match(block![1], /font-weight:\s*400/);
  assert.match(block![1], /font-size:\s*38px/);
  assert.match(block![1], /letter-spacing:\s*-0\.01em/);
  assert.match(css, /\.rail-wordmark__ghost\s*\{[^}]*transform:\s*translate\(2px,\s*2px\)/);
  // The app-page wordmark keeps its rule exactly.
  assert.match(css, /\.wordmark \{ font-family: var\(--font-serif\); font-weight: 700; font-size: 24px; line-height: 1\.15; letter-spacing: -0\.01em; transition: color \.15s ease; \}/);
});

test('rail wordmark drops to 32px when the layout collapses', () => {
  const collapsed = css.slice(css.indexOf('@media (max-width: 1000px)'));
  assert.match(collapsed, /\.rail-wordmark__ink,\s*\.rail-wordmark__ghost\s*\{[^}]*font-size:\s*32px/);
});

test('accessibility gate hides the rail ghost alongside the hero ghost', () => {
  // Pinned to the multi-line gate block (the riso-photo gate is a one-liner
  // earlier in the file and must not satisfy this).
  assert.match(
    css,
    /\(prefers-contrast: more\)\s*\{\s*\.hero-title \.ghost \{ display: none; \}\s*\.rail-wordmark__ghost \{ display: none; \}/
  );
});
