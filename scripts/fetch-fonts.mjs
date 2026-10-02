// Brings the site's typefaces home, so no page asks Google for them.
//
// Every page names its faces as Google Fonts family strings (the `fonts`
// prop on src/layouts/Base.astro, or Base's own pair). This script finds
// every such string in src/, asks Google Fonts once for each, downloads the
// font files it points to into public/fonts/, and writes src/lib/fonts.json:
// the @font-face rules for each string, pointing at the local files. Base
// inlines those rules; a string with no entry fails the build and says to
// run this.
//
//   node scripts/fetch-fonts.mjs
//
// Run it again after adding a page with a new family string, or to pick up
// a new release of a face. Only the Latin and Latin Extended subsets are
// kept; the site is written in English with a few Nordic names.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'public/fonts');
const MANIFEST = join(ROOT, 'src/lib/fonts.json');
const KEEP = new Set(['latin', 'latin-ext']);
// A current browser's name, so Google answers with woff2 and variable files.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const families = new Set();
for (const file of walk(join(ROOT, 'src'))) {
  if (!/\.(astro|ts|mjs|js)$/.test(file)) continue;
  for (const m of readFileSync(file, 'utf8').matchAll(/family=[A-Za-z0-9+]+(?::[A-Za-z0-9,.;@]+)?/g)) families.add(m[0]);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const saved = new Map(); // remote address -> local address
const manifest = {};
let bytes = 0;
for (const family of [...families].sort()) {
  const res = await fetch(`https://fonts.googleapis.com/css2?${family}&display=swap`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${family}: Google Fonts answered ${res.status}`);
  const css = await res.text();
  const slug = family.replace(/^family=/, '').split(':')[0].replace(/\+/g, '-').toLowerCase();
  const rules = [];
  for (const m of css.matchAll(/\/\* ([a-z0-9-]+) \*\/\s*(@font-face\s*\{[^}]*\})/g)) {
    const [, subset, rule] = m;
    if (!KEEP.has(subset)) continue;
    const remote = rule.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
    if (!remote) throw new Error(`${family}: no woff2 in the ${subset} rule`);
    if (!saved.has(remote)) {
      const file = Buffer.from(await (await fetch(remote)).arrayBuffer());
      const name = `${slug}-${createHash('sha1').update(file).digest('hex').slice(0, 10)}.woff2`;
      writeFileSync(join(OUT, name), file);
      saved.set(remote, `/fonts/${name}`);
      bytes += file.length;
    }
    rules.push(rule.replace(remote, saved.get(remote)).replace(/\s+/g, ' ').replace(/ ?([{};:,]) ?/g, '$1').replace(/;}/g, '}'));
  }
  if (!rules.length) throw new Error(`${family}: no Latin rules came back`);
  manifest[family] = rules.join('');
  console.log(family, rules.length, 'rules');
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(join(OUT, 'README.md'), `# Typefaces

The site's typefaces, served from here rather than from Google Fonts, so a
visit sends nothing to Google. The files are the ones Google Fonts serves,
fetched by \`scripts/fetch-fonts.mjs\`; do not edit this folder by hand.

Each face is published under the SIL Open Font License 1.1
(https://openfontlicense.org), which allows it to be hosted and served like
this: ${[...new Set([...families].map((f) => f.replace(/^family=/, '').split(':')[0].replace(/\+/g, ' ')))].sort().join(', ')}.
`);
console.log(`${saved.size} files, ${Math.round(bytes / 1024)} KB, ${Object.keys(manifest).length} family strings`);
