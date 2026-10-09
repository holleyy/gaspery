# Merge `claude/demo-capture-look-flags` into `main`

For the session that drives the GRØD Demo. The branch makes the three look
pins the picker can set (Super-Bar echo, reading text size, paper grain)
into capture flags, and captures the pill and the card through their own
panels. It was built from `d004df44` on 29 September and used for two
capture runs, but never merged. The sidebar programme has landed on `main`
since (HOL-758), and the two touch the same lines, so the merge has three
conflicts. Each is "keep both sides"; nothing on either side is wrong.

```bash
git checkout main && git pull
git merge origin/claude/demo-capture-look-flags
```

## 1. `GROD/Sources/Demo/DemoArtDirection.swift` (one hunk, in `apply`)

`main` resets echo and grain to the fresh-install values and applies the
three sidebar flags; the branch makes echo and grain take their flags.
Resolve to both:

```swift
        store.barEchoesTopping = configuration?.echoesTopping ?? true
        store.paperGrain = configuration?.paperGrain ?? .medium
        store.sidebarGrain = configuration?.sidebarGrain ?? .on
        store.sidebarIcons = configuration?.sidebarIcons ?? .hide
        store.sidebarTextSize = configuration?.sidebarTextSize ?? .matchSystem
```

Check the list of keys `apply` resets just above it holds all five
(`barEchoesTopping`, `paperGrainLevel`, `sidebarGrain`, `sidebarIcons`,
`sidebarTextSize`) plus the reading text size; both sides add to that list
and git should have merged it, but look.

## 2. `GROD/DemoTests/DemoArtDirectionTests.swift` (two hunks)

Two tests want the same place in the file: `main`'s
`sidebarFlagsReachTheStore` and `aFlaglessLaunchResetsTheSidebarSettings`,
and the branch's `lookFlagsOverrideTheCanonicalPins`. Keep all three, whole,
one after another. The first hunk is the two tests' opening doc comments and
declarations, the second is their bodies; take `main`'s side of each and
then the branch's, and make sure each test's opening matches its own body
(`lookFlagsOverrideTheCanonicalPins` is the one that passes `--demo-echo
off`, `--demo-text-size comfortable`, `--demo-grain fine`).

## 3. `GROD/script/capture_demo_screenshots.sh` (two hunks)

`main` added `GROD_DEMO_EXTRA_ARGS`, word-split into `extra_args`; the branch
added `look_args` from `--echo`, `--text-size` and `--grain`. Keep both
blocks:

```bash
look_args=()
[[ -n "$ECHO_TOPPING" ]] && look_args+=(--demo-echo "$ECHO_TOPPING")
[[ -n "$TEXT_SIZE" ]] && look_args+=(--demo-text-size "$TEXT_SIZE")
[[ -n "$GRAIN" ]] && look_args+=(--demo-grain "$GRAIN")
# Extra launch arguments for the Demo, word-split (4 Oct 2026; it first carried the notes
# editor's flag, removed with the rendered editor on 7 Oct 2026).
extra_args=()
if [[ -n "${GROD_DEMO_EXTRA_ARGS:-}" ]]; then
  read -r -a extra_args <<<"$GROD_DEMO_EXTRA_ARGS"
fi
```

and pass all three to the launch:

```bash
    ${look_args[@]+"${look_args[@]}"} \
    ${inactive_args[@]+"${inactive_args[@]}"} \
    ${extra_args[@]+"${extra_args[@]}"}
```

The dry-run `printf` near the top of the script (the `launch:` line) has the
branch's `$look_flags`; it merged without conflict, but confirm it prints the
look flags and that `test_capture_demo_screenshots.sh` still passes.

## 4. Then

- Build the Demo and run `DemoTests` and `script/test_capture_demo_screenshots.sh`.
- One capture to prove the merge, before the full run:
  `GROD_DEMO_EXTRA_ARGS="--demo-sidebar-grain on --demo-sidebar-icons show" ./script/capture_demo_screenshots.sh --scene recording-active --topping overprintd2 --theme riso --appearance light --echo off`
  The file should be named `recording-active-overprintd2-riso-noecho.png`,
  show the new sidebar with icons, and show a plain recording bar with no
  halftone field under it.
- Merge to `main` through a pull request, then run the capture ask
  (`ask-run.md` in this folder) from `main`.
