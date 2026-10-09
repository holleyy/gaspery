# Capture run 2: the new sidebar, for every GRØD page

Run this from the `GROD` directory on `main`, after the look flags branch
(`claude/demo-capture-look-flags`) is merged in: the sidebar programme is on
`main`, and the `--echo` flag the run needs is on that branch. The merge has
three small conflicts; [merge-look-flags.md](merge-look-flags.md) resolves
them.

## The look

Every capture: **Riso, Overprint D2, light** unless the sweep says otherwise,
**with the Super-Bar not echoing the topping** (`--echo off`, so the bar is
the plain instrument under every topping), medium paper grain and default
text size, and the sidebar set by launch arguments the script passes through
`GROD_DEMO_EXTRA_ARGS`:

- **Sidebar grain on** (`--demo-sidebar-grain on`): the sidebar's own paper
  tile, which is a different texture from the Super-Bar's.
- **Sidebar icons on** (`--demo-sidebar-icons show`), in the Imprinted
  finish, which is the default now. No `-sidebar.iconFinish` argument.
- **Sidebar text size: Match System** (the default; nothing to pass).
  This Mac has no system sidebar size set, so that draws Medium.

## What is wanted

The same sets as the last run, all again, because every one shows the
sidebar, plus the toppings-by-theme sweep that was still owed.

| Folder | Looks | Scenes |
|---|---|---|
| `full-riso-light` | Riso light, Overprint D2 | all |
| `full-riso-dark` | Riso dark, Overprint D2 | all |
| `full-braun-light-castiglioni` | Braun light, Castiglioni | all |
| `themes` | Nord, Sepia, Red Graphite, Flexoki, Braun, GRØD Warm; light and dark; Overprint D2 | `agenda-overview`, `meeting-enhanced-notes` |
| `docks` | Fukasawa, Ledger, Marginalia, Castiglioni, Jensen, Crunchy 2; Riso light and dark | `agenda-overview` |
| `docks-by-theme` | the six toppings above on the six themes above, light | `agenda-overview` |

Not wanted this time: the grain sweep (its patches show the pane, not the
sidebar, so the existing ones stand) and the first-run beats (no sidebar).

With the bar no longer following the topping, the dock sweep needs only the
Agenda. That is 3 full runs plus 72 single captures, about 195 images.

## The run

```bash
#!/bin/bash
# From the GROD directory, on main with claude/demo-capture-look-flags merged in.
set -euo pipefail
OUT="$HOME/Downloads/grod-captures-2"
CAP=./script/capture_demo_screenshots.sh
LOOK=(--echo off --text-size default --grain medium)
export GROD_DEMO_EXTRA_ARGS="--demo-sidebar-grain on --demo-sidebar-icons show"

# Build once; every later call skips it.
"$CAP" --all --topping overprintd2 --theme riso --appearance light "${LOOK[@]}" --output "$OUT/full-riso-light"
"$CAP" --all --topping overprintd2 --theme riso --appearance dark  "${LOOK[@]}" --output "$OUT/full-riso-dark" --skip-build
"$CAP" --all --topping castiglioni --theme braun --appearance light "${LOOK[@]}" --output "$OUT/full-braun-light-castiglioni" --skip-build

for theme in nord sepia red-graphite flexoki braun grod-warm; do
  for mode in light dark; do
    for scene in agenda-overview meeting-enhanced-notes; do
      "$CAP" --scene "$scene" --topping overprintd2 --theme "$theme" --appearance "$mode" "${LOOK[@]}" --output "$OUT/themes" --skip-build
    done
  done
done

for topping in fukasawa ledger marginalia castiglioni jensen crunchy2; do
  for mode in light dark; do
    "$CAP" --scene agenda-overview --topping "$topping" --theme riso --appearance "$mode" "${LOOK[@]}" --output "$OUT/docks" --skip-build
  done
done

for theme in grod-warm nord sepia red-graphite flexoki braun; do
  for topping in fukasawa ledger marginalia castiglioni jensen crunchy2; do
    "$CAP" --scene agenda-overview --topping "$topping" --theme "$theme" --appearance light "${LOOK[@]}" --output "$OUT/docks-by-theme" --skip-build
  done
done
```

## What comes back

One folder, `~/Downloads/grod-captures-2`, with the six subfolders above. The
script's own names are kept (`agenda-overview-overprintd2-riso.png`,
`agenda-overview-overprintd2-riso-dark.png`, `agenda-overview-castiglioni-braun.png`).

## Before starting

- **Run it on the Retina display.** The captures must be 2x: the script
  checks for 2224 × 1664 and rejects anything else, and a Demo window that
  opens on a 1x external display captures at half that. Put the Demo on the
  Mac's own screen, or a 2x display, and leave it there for the whole run.

## Checks before handing it over

- Every main-window image is 2224 × 1664 with the window at the same place as
  before. The pill and the card are their own panels and much smaller.
- The sidebar shows icons and its grain in every capture (open one from each
  folder). If a capture shows the old sidebar, the Demo was not built from
  `main`.
- No pointer in any frame.
- One image per theme and per topping has been looked at: the script does not
  check ids, and the app falls back to Riso and Overprint D2 for one it does
  not know.
- If `GROD_DEMO_EXTRA_ARGS` had no effect (sidebar icons hidden everywhere),
  the script on this checkout predates 4 October; pull `main`.
- The recording bar in `recording-active` is the plain bar, with no halftone
  field: that is `--echo off` working. If the script rejects `--echo`, the
  look flags branch is not merged in.
- File names carry `-noecho`, which the script adds for a departure from the
  default. That is expected; the site's crop script allows for it.

## Still worth fixing in the Demo first, if cheap

Unchanged from last time: the Transcript's "GROD-DEMO-FIXTURE" label, the
retry notice's internal wording, the Record/Ready dock covering text, and
`tags-index` and `tags-queue` coming out as the same image.
