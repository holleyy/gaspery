#!/usr/bin/env bash
# Rebuild and compare HTML against the baseline, ignoring asset hashes
# and Astro scope attributes. Exit 0 = no structural/content change.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ ! -d .baseline ]; then
  echo "ERROR: no .baseline/ — run scripts/snapshot-baseline.sh first" >&2
  exit 2
fi

npm run build >/dev/null || { echo "BUILD FAILED" >&2; exit 2; }

norm() {
  sed -E \
    -e 's#/_astro/[A-Za-z0-9_.-]+\.(css|js)#/_astro/ASSET#g' \
    -e 's# ?data-astro-cid-[a-z0-9]+(="[^"]*")?##g' \
    -e 's# ?astro-[a-z0-9]{8}##g' \
    "$1"
}

fail=0

# Route set must match exactly.
if ! diff <(cd dist && find . -name '*.html' | sort) \
          <(cd .baseline && find . -name '*.html' | sort) > /tmp/routes.diff; then
  echo "ROUTE SET CHANGED:"; cat /tmp/routes.diff; fail=1
fi

while IFS= read -r f; do
  rel="${f#dist/}"
  [ -f ".baseline/$rel" ] || continue
  if ! diff -q <(norm "$f") <(norm ".baseline/$rel") >/dev/null; then
    echo "CHANGED: $rel"
    diff -u <(norm ".baseline/$rel") <(norm "$f") | head -30
    fail=1
  fi
done < <(find dist -name '*.html' | sort)

# The theme control is single-instance per page (see ThemeToggle.astro):
# two mounted copies would share one native radio group via `name="theme"`
# and fight over which is checked instead of staying in sync.
while IFS= read -r f; do
  count=$(grep -o 'class="theme-toggle"' "$f" | wc -l | tr -d ' ')
  if [ "$count" -ne 1 ]; then
    echo "THEME TOGGLE COUNT WRONG: $f has $count, expected 1"
    fail=1
  fi
done < <(find dist -name '*.html' | sort)

# The old app URL's redirects must survive into the built output. They live in
# public/_redirects as raw rules; a build that drops them still succeeds and
# still passes every test, and the only symptom is the old link 404ing in
# production. So the gate that already builds checks for them.
for rule in '/apps/afterframe/' '/apps/afterframe'; do
  if ! grep -qE "^${rule}[[:space:]]" dist/_redirects 2>/dev/null; then
    echo "REDIRECT MISSING from dist/_redirects: $rule"
    fail=1
  fi
done

[ $fail -eq 0 ] && echo "PARITY OK — all pages match baseline"
exit $fail
