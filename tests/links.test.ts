import { test } from 'node:test';
import assert from 'node:assert/strict';
// The `.ts` extension is required here and only here: Node's native type
// stripping runs this file directly, and ESM in Node needs explicit
// extensions. Astro/Vite files import the same module extensionless.
import { isLink, isHttpUrl, sourceDomain, newestEssayId, toPostProps } from '../src/lib/links.ts';

test('isLink is true only when a source URL is present', () => {
  assert.equal(isLink({ sourceUrl: 'https://example.com/a' }), true);
  assert.equal(isLink({}), false);
  assert.equal(isLink({ sourceUrl: '' }), false);
  assert.equal(isLink({ sourceUrl: undefined }), false);
});

test('isLink narrows sourceUrl to string, so callers need no re-test or assertion', () => {
  // `data` carries extra fields beyond LinkFields (title), exercising the
  // generic `T extends LinkFields` — the predicate must narrow the whole
  // object type, not just a bare `{ sourceUrl?: string }`.
  const data: { title: string; sourceUrl?: string } = {
    title: 'Worry Stone',
    sourceUrl: 'https://ethanmarcotte.com/x',
  };
  if (isLink(data)) {
    // Only type-checks if `isLink` is a type predicate that narrows
    // `data.sourceUrl` from `string | undefined` to `string` — passing it
    // straight to `sourceDomain` (which takes `string`) would be a type
    // error under a plain `boolean` return. This is the property
    // WritingList.astro and writing/[...id].astro rely on.
    assert.equal(sourceDomain(data.sourceUrl), 'ethanmarcotte.com');
  } else {
    assert.fail('expected isLink to narrow a present sourceUrl to true');
  }
});

test('isHttpUrl is true for a valid http(s) URL', () => {
  assert.equal(isHttpUrl('https://daringfireball.net/linked/2026/08/11/x'), true);
  assert.equal(isHttpUrl('http://example.com'), true);
});

test('isHttpUrl returns false, and does not throw, for a scheme-less string', () => {
  assert.equal(isHttpUrl('daringfireball.net/linked/x'), false);
});

test('isHttpUrl returns false, and does not throw, for a non-http scheme', () => {
  assert.equal(isHttpUrl('mailto:someone@example.com'), false);
});

test('isHttpUrl returns false, and does not throw, for the empty string', () => {
  assert.equal(isHttpUrl(''), false);
});

test('sourceDomain drops the scheme, the www, and everything after the host', () => {
  assert.equal(sourceDomain('https://www.example.com/a/b?c=1'), 'example.com');
  assert.equal(sourceDomain('https://daringfireball.net/linked/2026/08/11/x'), 'daringfireball.net');
  assert.equal(sourceDomain('http://example.com'), 'example.com');
});

test('sourceDomain keeps a meaningful subdomain', () => {
  assert.equal(sourceDomain('https://blog.example.com/post'), 'blog.example.com');
});

test('sourceDomain ignores a port', () => {
  assert.equal(sourceDomain('https://example.com:8443/post'), 'example.com');
});

const essay = { id: 'two-ink', data: { title: 'The two-ink discipline', date: new Date('2026-07-18'), dek: 'A dek.', readingTime: '7 min' } };
const link = { id: 'worry-stone', data: { title: 'Worry Stone', date: new Date('2026-08-11'), dek: 'A remark.', sourceUrl: 'https://ethanmarcotte.com/x' } };

test('newestEssayId picks the first essay, ignoring links ahead of it', () => {
  assert.equal(newestEssayId([link, essay]), 'two-ink');
});

test('newestEssayId is null when a list holds no essays', () => {
  assert.equal(newestEssayId([link]), null);
  assert.equal(newestEssayId([]), null);
});

test('toPostProps maps an essay and flags it as new when it matches', () => {
  assert.deepEqual(toPostProps(essay, 'two-ink'), {
    href: '/writing/two-ink',
    title: 'The two-ink discipline',
    date: new Date('2026-07-18'),
    dek: 'A dek.',
    readingTime: '7 min',
    sourceUrl: undefined,
    isNew: true,
    isFeature: false,
  });
});

test('toPostProps carries sourceUrl through and never flags a link as new', () => {
  const props = toPostProps(link, 'two-ink');
  assert.equal(props.sourceUrl, 'https://ethanmarcotte.com/x');
  assert.equal(props.href, '/writing/worry-stone');
  assert.equal(props.isNew, false);
});
