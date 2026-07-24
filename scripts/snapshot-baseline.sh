#!/usr/bin/env bash
# Capture the current build's HTML as the visual-regression baseline.
# Run ONCE, before any migration work.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build >/dev/null
rm -rf .baseline
mkdir -p .baseline

while IFS= read -r f; do
  rel="${f#dist/}"
  mkdir -p ".baseline/$(dirname "$rel")"
  cp "$f" ".baseline/$rel"
done < <(find dist -name '*.html')

echo "Baseline captured: $(find .baseline -name '*.html' | wc -l | tr -d ' ') pages"
