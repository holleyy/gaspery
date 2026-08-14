---
target: critique (homepage, post-fix re-run)
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-08-14T13-00-44Z
slug: src-pages-index-astro
---
Method: dual-agent (A: design-review agent · B: detector-evidence agent)

# Critique — Homepage (`src/pages/index.astro`) — post-fix re-run

## Design Health Score — 32/40 (Good: top of the band; was 29)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Marker/aria-current split now correct; "Apps" never marks current at `/#apps` |
| 2 | Match System / Real World | 3 | Print metaphors + roman numerals ask a little literacy — a deliberate wink, small toll |
| 3 | User Control and Freedom | 3 | Linked-post headline still exits the site with only a subtle ↗ as warning |
| 4 | Consistency and Standards | 3 | Token discipline exemplary; non-link app row hovers like a link; ↗ aria-hidden on one, not others |
| 5 | Error Prevention | 3 | Nothing risky exists; external links marked |
| 6 | Recognition Rather Than Recall | 3 | ★/Permalink idiom needs one beat of learning (the visible label saves it); sections unnamed for SR region nav |
| 7 | Flexibility and Efficiency | 3 | Skip link + RSS + clean keyboard order (was 2) |
| 8 | Aesthetic and Minimalist Design | 4 | One loud moment; zero overflow measured at 375/900/1024/1280 |
| 9 | Error Recovery | 4 | The 404 is a model: real status, in-world plain-language diagnosis, two labeled exits (was 2) |
| 10 | Help and Documentation | 3 | Colophon documents the system in a sentence |
| **Total** | | **32/40** | **Good — top of band** |

## Anti-Patterns Verdict

**Does this look AI-generated? No — "unmistakably authored."** The two-ink system is enforced in code, not painted on; rows and hairlines instead of cards; zero shadows and gradients; the misregistration spent exactly once; a copy voice that couldn't be transplanted to another product. One themed-surface miss: `::selection` is unthemed (default blue over bone paper — in the one act, close reading, this site invites).

**Deterministic scan:** the configured CLI scan is down to **one finding, a known false positive** (`broken-image` at `src/components/RisoPhoto.astro:13` — the string `<img>` inside a code comment). B verified the reviewed ignore config is honoured (a raw `--no-config` run adds back only the adjudicated Inter flag). The in-page detector reported 21 hits, adjudicated: 13 are the second ink doing its documented job (teal marks, numerals, labels), the "occlusion" is the misregistration itself, the all-caps hit is the masthead eyebrow, the 10px labels are the documented convention (now all ≥4.5:1), a transient 46px text-overflow did not reproduce (and A measured zero overflow at every width), and "11 em-dashes in body text" is the author's genuine prose voice, not a tell. **The detector caught nothing real that A missed; A caught five things no detector can see** (below).

**Visual overlays:** injection succeeded; badge overlays rendered and were screenshotted in the evidence tab, then cleared during cleanup.

## Overall Impression

The three fixes that carried the last critique's P1s landed cleanly: the tablet band is now a considered middle state, the 404 went from absent to the single best page-for-page expression of the brand, and peak-end is genuinely strong — the final impression is literally "Made with two inks." What remains is one strategic gap and a short tail of small-surface polish: **the site has no link-preview metadata at all**, on a site whose entire audience arrives by link. The craft is impeccable on-site; it doesn't yet travel.

## What's Working

1. **The system's claims and the shipped code agree exactly.** A computed 24 contrast pairs: every text ink now clears AA in both schemes (brand-strong 5.09, positive 4.82, warning 4.73, teal-ink 5.09; dark 6.2–14.7). The "teal is never a word" rule is real and enforced.
2. **One loud moment with the gates to match**, and zero horizontal overflow at every measured width; the 861–1000 band reads as designed, not stretched.
3. **Copy carries the brand as hard as the ink** — the 404 ("Blank page. / Nothing printed at this address") and the honest subscribe line are the proof.

## Priority Issues

**[P1] No link-preview metadata at all.**
No `og:*`, `twitter:*`, canonical, or `theme-color` anywhere (verified by grep). PRODUCT.md's audience "arrives by link" — today a shared gaspery.com URL renders as a bare domain with no card, so the first impression happens off-site, unstyled.
**Fix:** add OG/Twitter meta + canonical + dual-scheme `theme-color` to `src/layouts/Base.astro`; design an og:image in the two-ink world — a misregistered riso card is the brand traveling, not a chore.
**Suggested command:** `/impeccable craft` (the og:image is a small design artifact) or `/impeccable harden` for meta-only.

**[P2] Mobile primary-nav tap targets are ~17px tall.**
Measured at 375px: `.nav a` is 17px high (no padding); `.elsewhere` links similar — below WCAG 2.5.8's 24px, far under the 44px comfort zone, at the top of a one-thumb page.
**Fix:** vertical padding (e.g. 8px 0, margin-compensated) on `.nav a` and `.elsewhere a` inside the ≤1000px collapse.
**Suggested command:** `/impeccable adapt`

**[P2] Essay-row block links lead with meta in their accessible name.**
Every essay announces as "22 JUL 2026 / 3 min New So Well Planned…" — in a screen-reader link list the stream is a wall of dates with titles buried.
**Fix:** put the `h3` first in DOM order inside `a.post`, restore visual order with CSS.
**Suggested command:** `/impeccable harden`

**[P2] The non-link app row inherits link affordances.**
"Top Secret" is a `div` (no URL) but still hovers its name to brand-bright — a false affordance; the identical lesson was already learned and documented for `.post--link` and not carried over.
**Fix:** scope the rule to `a.app:hover .app__name`.
**Suggested command:** `/impeccable polish`

**[P3] Browser-surface and consistency polish bundle.**
(a) Theme `::selection` from the brand ink. (b) aria-hide the decorative glyphs consistently (Elsewhere ↗, nav → marker, meta "/" separators). (c) One title-case essay title in a sentence-case house. (d) `scroll-margin-top` on `#apps` for future safety.
**Suggested command:** `/impeccable polish`

## Persona Red Flags

- **Sam (accessibility):** Strongest showing — precise aria-current, real focus ring, working skip link, dot+label statuses, all-AA text. Remaining: date-first essay names (P2), announced decorative glyphs, unnamed `<section>`s, app names invisible to heading nav, footer inside `<main>`.
- **Casey (mobile):** The 17px nav targets are the real failure; otherwise clean — zero overflow, light page, tidy single column. The halftone slightly overprints the eyebrow at 375 (legible, the one noisy spot).
- **Jordan (first-timer):** The linked-post headline silently leaving the site remains the trap — the ↗ is 14px and means nothing to Jordan. The visible "Permalink" label now saves the ★.
- **Priya (hiring manager, 60 seconds):** Taste verdict lands in ~10 seconds; Email is findable when she's convinced. Two risks: the top of "Writing" is currently another author's headline — her one sample click may spend her first 20 seconds crediting someone else's craft — and the link that brought her had no preview card (the P1).

## Minor Observations

- The 1001–1080 band wraps unevenly (documented tradeoff; safe, just ragged).
- "Apps" is the nav's only anchor among page links — a mixed nav model, harmless today.
- The subscribe CTA is distinguished by color alone at 3.72:1 vs ink — clears the 3:1 technique threshold with hover/focus cues; fine.
- Pulse (Bluesky) is disabled in data and degrades to nothing, correctly.
- Self-hosting Merriweather/Inter remains the known nice-to-have.

## Questions to Consider

1. When a link post is newest, should it own the top of home — or should the newest *essay* always anchor position one, the way `newestEssayId` already scopes the New tag past links?
2. What does a gaspery.com link look like while it's still in someone else's timeline? The og:card is the only surface not yet printed in two inks — and for this audience it's the first one.
3. Is one quiet email field a funnel, or hospitality? "Starting soon" currently means "come back and check."
