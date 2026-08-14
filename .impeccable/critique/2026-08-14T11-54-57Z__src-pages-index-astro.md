---
target: critique (homepage)
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-08-14T11-54-57Z
slug: src-pages-index-astro
---
Method: dual-agent (A: design-review agent · B: detector-evidence agent)

# Critique — Homepage (`src/pages/index.astro`)

## Design Health Score — 29/40 (Good: solid foundation, address weak areas)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | `aria-current="page"` + → marker claim "Writing" while the visitor is at `/`; Subscribe swap is silent to assistive tech |
| 2 | Match System / Real World | 3 | Print metaphors are self-explained by the colophon; "Est. MMXXVI" and the name-only hero ("Gaspery.") ask a little decoding |
| 3 | User Control and Freedom | 3 | Linked-post headlines exit the site with only a 14px ★ as the route back; Subscribe click is irreversible in-session |
| 4 | Consistency and Standards | 3 | Post titles are h3s, app names are plain spans; nav mixes idioms (Writing → archive page, Apps → `/#apps` anchor) |
| 5 | Error Prevention | 3 | Form-free simplicity prevents most errors — but the CTA invites a click it cannot fulfil |
| 6 | Recognition Rather Than Recall | 3 | The ★ permalink's meaning is unexplained for sighted users (sr-only text exists, no visible affordance) |
| 7 | Flexibility and Efficiency | 2 | RSS + autodiscovery is real; no skip link (11 tab stops before content), no archive filters on home |
| 8 | Aesthetic and Minimalist Design | 4 | The strongest axis — one loud moment, hierarchy via weight/size/space, every element earns its pixel |
| 9 | Error Recovery (wayfinding) | 2 | No `404.astro` on a site whose whole audience "arrives by link"; "Coming soon" is announced to no one (no aria-live, focus dropped) |
| 10 | Help and Documentation | 3 | Colophon explains the system in a sentence; nothing explains ★ or the Gaspery/Alex naming |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict

**Does this look AI-generated? No — decisively authored.** The two-ink constraint is real and load-bearing (no third accent exists anywhere in the stylesheet), the misregistration is spent exactly once on "Gaspery.", registration marks stitch rail → stream heads → footer, and the copy narrates the system it lives in. Form and content make the same argument — the PRODUCT.md thesis working. The one place the slop test bites is mechanical, not aesthetic: **text overflow at tablet widths** (P1 below).

**LLM assessment (per-ban):** Pass on side-stripes, gradient text, glassmorphism, hero-metric template, card grids, and numbered scaffolding (01–04 enumerate one ordered roster, not sections). *Pass with caution* on the tracked-uppercase label: the `.label` idiom is a named print-label system used as counterweights beside serif headings — voice, not scaffold — but it appears 10+ times and is at its saturation ceiling. *Fail* on text-overflows-container at 861–1000px (measured, below). Merriweather + Inter and bone paper would be reflex picks greenfield; here they're the locked identity — identity-preservation, not a violation.

**Deterministic scan:** 2 CLI findings. (1) `overused-font` — Google Fonts Inter, `src/layouts/Base.astro:33`; the in-page detector measured Inter at 76% of text. Real, but it's the committed body face; the actionable angle is self-hosting, not replacement. (2) `broken-image` — `src/components/RisoPhoto.astro:13` is a **false positive**: line 13 is a code comment containing the string `<img>`; the real image is built as an interpolated template string the static scanner can't see, and no broken image renders. In-page, the detector reported 15 findings: 13 are the site's own teal ink `#5CC7E8` (permalink ★/↗ marks, app numerals 01–04, Now-panel row labels — the documented second-ink idiom, including one definitionally-false hit on visually-hidden sr-only text), one is the halftone dot-screen misread as a "cyan gradient," and the all-caps hit is the hero eyebrow label. **Where the two assessments agree:** the detector's all-caps and Inter-dominance findings line up with the design review's caution that the label idiom and workhorse sans are at their ceiling. The detector caught nothing the review missed; the review caught everything the detector can't see (the tablet break, the decoy CTA, small-text contrast).

**Visual overlays:** injection succeeded — the in-page detector rendered yellow badge overlays (teal-ink hits, all-caps label, font banner) in a fresh browser tab and they were screenshotted as evidence. The tab was reset during cleanup, so they are no longer on screen.

## Overall Impression

This is the rare personal site where the design system *is* the argument: two inks genuinely constrain every decision, and the craft claim mostly survives close reading — which is exactly the standard the site sets for itself. The gut reaction is admiration with two winces: a visibly broken tablet band on a page that argues "the craft is the credential," and a Subscribe button that converts the most-engaged visitor into a dead end. The single biggest opportunity is strategic, not visual: the homepage auditions a product manager without ever saying the words.

## What's Working

1. **The constraint is real, not cosmetic.** No third accent in the entire stylesheet; hierarchy solved with weight, size, and space — essay titles 21px vs. link posts 18px so "a busy link week never outranks the long-form." A point of view encoded in a font size.
2. **Accessibility as engineering, not claims.** The reduced-transparency/contrast gates drop every blend to solid ink; status is dot **plus** label; teal split into a mark ink (2.50:1, never text) and a text ink (5.09:1) shows contrast literacy baked into the token layer.
3. **IA matches the visitor's 60-second job.** Writing (proof of judgment) gets the wide column; apps (proof of shipping) get statuses signaling momentum; the Now panel humanizes; one fold-and-a-half tells the whole story.

## Priority Issues

**[P1] Tablet-band layout break (861–1000px).**
Measured at 900px: the "In Planning" status pill overflows its row by 95px, Afterframe's by 62px; "Writing"/"LATEST FIRST" and "Apps"/"SMALL TOOLS" collide at 0px gap; dates wrap mid-date. iPad-landscape and half-screen desktop windows are mainstream widths for a referral audience, and the craft claim visibly fails there.
**Fix:** raise the collapse breakpoint to ~1000px, or make the band wrap-safe: let `.app__head` wrap (status drops under the name), remove `white-space: nowrap` guards, give `.stream__head` `flex-wrap` + `row-gap`, set a min-width floor on the apps column.
**Suggested command:** `/impeccable adapt`

**[P1] The Subscribe CTA is a decoy.**
The page's only `<button>`, in brand ink, promises "Subscribe →"; clicking swaps it to disabled "Coming soon" — no capture, no `aria-live` announcement, focus dropped, no path forward. PRODUCT.md names subscribe as the secondary conversion; peak-end rule says the final beat matters most, and the most-converted visitor gets the only broken promise.
**Fix:** say "Coming soon" *before* the click ("The letter starts soon — follow by RSS meanwhile →" linking `/rss.xml`), or wire real capture. If the swap stays: `aria-live="polite"` and keep the button focusable.
**Suggested command:** `/impeccable clarify`

**[P2] Magenta and status inks fail AA at small sizes (light mode).**
Brand `#D63A86` on bone = 3.88:1, used on "Older notes →" (14px), "More on all this →" (13px), the mobile active-nav item, and as the "New" tag ground. Positive (4.45:1) and warning (4.39:1) miss 4.5:1 at their 10px labels. PRODUCT.md targets AA; these are computable failures on the exact "value to watch."
**Fix:** in light mode make brand-bright `#B82E70` (5.09:1) the small-text link ink at rest (hover goes brand); darken positive/warning one step for the 10px pills; use brand-bright as the "New" tag ground. Dark mode already passes everywhere.
**Suggested command:** `/impeccable polish`

**[P2] Now panel "Building" renders as a run-on.**
The JSON value's `\n` collapses in HTML: "…recurring meetings differently Applying the finishing touches to Tavle." Reads as a typo on a page whose claim is precision.
**Fix:** `white-space: pre-line` on `.now-panel__row-value`, or model the field as an array rendered as lines.
**Suggested command:** `/impeccable polish`

**[P3] Keyboard/AT wayfinding bundle.**
No skip link (11 tab stops before content); focus is the undesigned UA ring in a system that sweats every pixel; `aria-current="page"` on "Writing" while at `/`; the ★ permalink is a 14×22px target (below WCAG 2.5.8's 24px) with no visible explanation; no custom 404 on a link-arrival site.
**Fix:** skip link; a two-ink `:focus-visible` style (2px brand outline + offset); correct the aria-current; give ★ a visible text label; ship a 404 in the house style.
**Suggested command:** `/impeccable harden`

## Persona Red Flags

- **Jordan (first-timer):** The ★ under linked posts is a mystery glyph. Clicking the top headline unexpectedly leaves the site with no warning. "New" sits on the second row while a newer item sits above it (deliberate newest-*essay* scoping — Jordan reads it as a bug). "Gaspery." vs "Alex Holley" — which is this place called?
- **Riley (stress tester):** Found the three best bugs — the 95px pill overflow at 900px, the run-on Building line, and the Subscribe button that "works" once then stays disabled for the session. Plus: no 404 page for mangled shared links.
- **Casey (mobile):** Clean collapse at 375px (0px overflow, verified), sensible single-column order — but the ★ permalink is a 14×22px thumb target and the active nav item is magenta at 3.88:1 in sunlight. No perf flags (two font families, no images).
- **Priya (project persona — hiring manager, 60 seconds):** **The homepage never says Alex is a product manager.** The role line reads "Words, design, tools & links"; Elsewhere offers Email/GitHub/Bluesky/Mastodon/Letterboxd/RSS — no CV, no LinkedIn, no role statement. Priya leaves thinking "tasteful indie designer-developer" — adjacent to, but not, the job PRODUCT.md says the site is auditioning for. The craft argument lands; the *category* of the argument is missing.

## Minor Observations

- Two `<h1>`s in DOM (misregistration ghost) — correctly `aria-hidden`, verified live.
- Post titles are `h3`s but app names are plain spans — apps invisible to heading navigation.
- Nav mixes destinations (archive page vs. same-page anchor); from other pages the anchor round-trips through home.
- Dark mode collapses the two teal weights into one and loses the bone-paper warmth — the least distinctive rendering of the brand (documented, and it passes contrast).
- Fonts load from Google's CDN; self-hosting would be more consistent with the craft thesis (and faster first paint). This is also the honest fix for the detector's `overused-font` flag.
- No entrance motion at all — explicitly permitted as voice for "quiet and precise"; correct call.
- Copy voice is a genuine asset ("I've read it three times and it keeps getting better").
- Not verified this run: the Bluesky Pulse block live (`pulseEnabled: false` — code review only), the reduced-transparency/contrast gates in-browser (verified in CSS only), and production 404 behavior (no `404.astro` exists; the dev server masks the deployed response).

## Questions to Consider

1. The site auditions a product manager without ever using the words — would one quiet line under the wordmark ("Product manager by trade; printer by temperament") cost any craft, or is withholding the category itself the point?
2. On a site whose thesis is "the craft is the credential," what does a decoy Subscribe button spend? Is "Coming soon" honesty delivered one click too late?
3. Two names share one page — "Gaspery." gets the loud moment, "Alex Holley" gets the rail and the `<title>`. Which name should the hiring manager remember, and does splitting the impression between them halve both?
