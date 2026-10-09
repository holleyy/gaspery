---
name: grod-captures
description: Refresh every image on the GRØD pages from a new run of the app's Demo captures. Use when the GRØD app's look changes (a new sidebar, a re-dated Demo, a retaken screen), when Alex asks for "a new run", "recrop", "the screenshots again", or when a capture folder lands in ~/Downloads.
---

# GRØD captures: from a run of the Demo to the site

Every picture on gaspery.com/grod and its pages is a real capture of the
GRØD Demo, cut by one script. A change in the app means a new run of the
Demo's capture script (in the GRØD repo), then one command here, then a
look at the comparison sheets, then a pull request.

## 1. Ask for the run

Hand [ask-run.md](ask-run.md) to the session that drives the GRØD Demo. It
is a runnable script for `GROD/script/capture_demo_screenshots.sh` on the
GRØD repo's `main`, and it says which folders should come back and how to
check them. Read it first: the look settings at the top (theme, topping,
appearance, sidebar flags) are the ones to change when Alex names new ones.
Sidebar settings travel through `GROD_DEMO_EXTRA_ARGS`; the look flags
`--echo`, `--text-size` and `--grain` exist only on the branch
`claude/demo-capture-look-flags`, and `main`'s defaults are the house look.

The run has to happen on a Retina (2x) display; the ask says so.

Films are a separate ask, [ask-films.md](ask-films.md): the Demo's film
scenes cannot be captured as stills.

## 2. Cut the images

With the folder in `~/Downloads/<run>`:

```bash
node scripts/grod-crops.mjs ~/Downloads/<run> --compare
```

It writes `public/shots/grod/landing` (home, Features, Privacy),
`public/shots/grod/craft` (Craft), `src/lib/grodShots.json` (where each
pop-out's detail sits), and, when the run has a `docks-by-theme` folder,
the toppings-by-theme stages. `--out <dir>` is a dry run into another folder.

Every box is measured on the house capture. The script measures the pane's
left edge on the new run and moves left-anchored boxes with it, so a wider
sidebar does not slice the pane. It cannot see a part that moved for
another reason; that is what the sheets are for.

## 3. Look at the sheets

`--compare` writes `.impeccable/review/recrop/recrop-NN.jpg`: each image's
previous cut beside its new one. Open every page. A box that no longer
lands on the same part of the app shows as a cut through text or a missing
edge. Fix it by changing that box in `scripts/grod-crops.mjs` (its anchor
too, if the part is centred or right-aligned in the pane) and run again.

## 4. Check the words against the pictures

The pages describe what the captures show. After a run, read each `alt`
and `figcaption` on `src/pages/grod/*.astro` and `src/components/GrodSentence.astro`
against the new image: times ("08:42"), counts ("2 notes deleted"), names,
and which controls are visible. The Demo is dated 16 April 2026 until
HOL-734 re-dates it.

Known swaps still owed when the next light run lands:
- The Features page's pill (`src/pages/grod/features.astro`, `.gt-pill`)
  is the expanded pill, 80 by 328, with buttons in its `alt`. The run's
  `pill-recording` is the compact pill, 80 by 174 (the Ø, the meter, the
  time). Alex wants the compact one; change the `height` and the `alt`, and
  the copy may say it expands slightly on hover.

## 5. Verify and ship

`npm test` (the tests check that every image a page names exists and that
the pop-out records match), `npm run build`, then the usual proofs
(`.impeccable/review/shoot.mjs` for headless captures at desktop and phone
widths), then a branch, a commit and a pull request. The share card
(`scripts/grod-share-card.mjs`) uses `landing/window-agenda.webp`, so
reprint it in the same change.

## What the run does not refresh

- The first-run beats (`onboard-*`): their own capture folder, no sidebar.
- The hero films in `public/shots/grod/landing/loop/`: see ask-films.md.
- The grain patches on Craft, unless the run has a `grain` folder.
