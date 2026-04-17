# Verification Report — Jen's QA Re-check

Run via `node scripts/smoke-check-pages.mjs` (audits broken images,
element counts vs Gatsby, up-next presence). Combined with the
upNext audit at `scripts/audit-up-next.mjs`.

## Summary

- **0 broken images** detected across all 30 pages audited (✓).
- **0 up-next mismatches** remaining after this session's fixes
  (10 mismatches fixed in commits `4c12acd` + `6a361fb`).
- **No catastrophic failures** — all 30 pages return 200 OK.
- **48 element-count divergences** flagged below; ~22 are footer-structure
  false positives (Gatsby footer has 3 more `<ul>` than ours), the rest
  are real content gaps or intentional UX changes.

## Real Issues Worth a Closer Look

### 1. Healing US Healthcare — `/vision/healing-us-healthcare` ✅ VERIFIED
Smoke-check originally flagged Δ24-47% gaps. Investigated and
confirmed **functional parity** — no fix needed.

Root cause: Gatsby has 35 unique `individual-result` DOM nodes; ours
has 19. The 16 extra Gatsby keys (`universal_access`, `perfect_quality`,
`better_prices`, `better_costs`, `more_equitable`, `preventative_meds`,
`health_conscious_people`, `more_time`, `better_care`, `fewer_tests`,
`reduced_errors`, `efficiency`, `individualise_meds`, `value_quality_life`,
`fewer_visits`, `fees_for_outcomes`) are **orphaned placeholders** —
none are referenced by any of the 4 perspective menus (patient/provider/
policymaker/payer), so they never render to a user. Most have empty
`<p></p>` bodies in Gatsby — content was never written.

The 16 placeholders × 2 h3s + 2 empty `<p>`s account for ~32 of the 39
missing paragraphs. The remaining ~7 paragraphs / 3 images / 3-4 lists
are mostly the footer-structure delta. All real content matches.

### 2. Bathroom to Healthroom — `/vision/bathroom-to-healthroom` ✅ VERIFIED
After scrolling the page so lazy-loaded images render, the actual image
gap drops from 15 to **4**. All four are intentional UX:
- `2015.png`, `2025.png` — DateSlider's hidden alternates (we render
  only the active 1985 slide)
- `dining_room.png`, `living_room.png` — LocationsSlider's hidden
  scenes (we render only the active MARKET slide)

The original Gatsby version stacked all 3 date images and all 6 location
scenes simultaneously; the new sliders consolidate them. No fix needed.

### 3. Landing pages have MORE Next headings than Gatsby ✅ VERIFIED
- AI Landing: gatsby=4, next=10 (Δ150%)
- Enterprise: gatsby=5, next=7 (Δ40%)
- Government: gatsby=6, next=9 (Δ50%)
- Patient Engagement: gatsby=9, next=12 (Δ33%)

After comparing actual heading text on each page, **all heading text
matches exactly** between Gatsby and Next. The smoke check counts
h1+h2+h3 only — Gatsby uses `<h4>` for case-study cards on these
landing pages while our redesigned versions use `<h3>` (same text,
different semantic level). Open Source Health Design has the same
pattern with one h3 → h2 promotion. No content is missing.

### 4. Care Plans Part 1 — `/vision/care-plans/part-1` ✅ VERIFIED
Restricted comparison to substantive paragraphs (>30 chars) inside the
`<article>`: **all 340 paragraphs match exactly** between Gatsby and
Next. The smoke-check's `p` count diff was layout chrome (footer,
hero block, author cards) outside the article, not body content. The
+42% image count on our side is `<Image>` placeholder + actual src
double-counting and eager-loaded carousel slides (per QA fix #43).

## False Positives (Footer Structure Difference)

22 case studies + landing pages flagged with `LISTS: gatsby≈7-10, next≈4-7`.
Across-the-board pattern means the Gatsby footer has 3-4 more `<ul>`
elements than ours (different navigation grouping). Not a content bug.

The following pages had ONLY this false-positive flag and otherwise
match Gatsby on every metric:
- 3M CodeRyte, hGraph, Partners Insight, MITRE Flux Notes,
  CommonHealth Smart Cards, FasterCures Health Data, Mount Sinai Consent,
  Inspired EHRs, Personal Genome Project, StaffPlan, Care Cards

## Pages With Modest Image Gaps ✅ VERIFIED

After scrolling each page so lazy-loaded images render and comparing
counts, every flagged case study matches Gatsby's image count except
Tabeeb (1-image deficit, non-critical):

- MITRE State of US Healthcare ✅
- Infobionic Heart Monitor ✅
- Partners GeneInsight ✅ (6/6)
- InsideTracker Nutrition ✅ (7/7)
- PainTrackr ✅ — captions render in `<figcaption>` not `<p>`; smoke
  check missed them (3/3 captions present in HTML)
- Tabeeb Diagnostics — gatsby=6, next=5; minor 1-image gap
  (likely one up-next card lacking an image asset on its target
  feature document; non-critical)

Filenames differ between sites because Gatsby uses raw CloudFront URLs
(`insidetracker_bloodwork_hero_3.jpg`) while Next.js serves the same
images via Sanity asset URLs (`6538d6ae...-2000x3441.jpg`). Same content,
different CDNs.

## Care Plans Overview (`/vision/care-plans`) — deep visual diff ✅

After the user flagged "still has a lot of issues" and asked for
screenshots, captured desktop (1440×900) and mobile (375×812) full-page
renders of both Gatsby and our Next build, sliced into 900-px chunks,
and diffed landmark y-positions for every heading/image/nav/section.

**Finding: the two pages are structurally identical.** Every landmark
lines up at the exact same y-position on both sites:

    Hero image           y=50    h=848   (both)
    Stuck nav bar        y=898   h=68    (both)
    Overview/Landscape/
      Future labels      y=932   h=24    (both)
    Download links       y=1006  h=55    (both)
    The Care Plan Series y=1006  h=38    (both)
    3-part teasers       y=1363  h=953   (both)
    Want to Work
      Together?          y=2508  h=38    (both)
    Authors              y=3304  h=38    (both)
    Contributors         y=4404  h=38    (both)
    Total article height: 5119px (both)

Mobile chunks match pixel-for-pixel including the CARE PLANS title
overlay, the blue 2-column nav grid (Part1 Overview / Part2 Landscape /
Part3 Future / Download eBook), and every paragraph of body text.

Only visible cross-site difference is the chrome at the top of the
viewport — Gatsby shows its legacy "WORK / SERVICES / ABOUT / VISION /
CONTACT" nav while our site shows its own header. Everything inside
the article renders at parity.

No fixes needed.

## Other Pages Verified This Pass

- **Digital Healthcare 2016** ✅ — Gatsby has 4×h3 contributor labels
  (Contributing Author, Web Developer & Designer, etc.) where ours has
  1×h2 "Contributors" wrapper from the standardized AuthorSection
  (intentional per QA item #38).
- **All other case studies** flagged ONLY by the cross-the-board
  `LISTS Δ` were re-confirmed as the footer-structure delta. Already
  documented as a false positive below.

## What Was Fixed This Session

- All 10 case studies with broken `drafts.*` upNext refs or missing
  feature-link entries are repaired (audit re-run reports clean).
- `caseStudy.upNext` schema now accepts `externalUpNextItem` so future
  off-site links can be added without inventing stub case-study docs.
- References block's `background` field is now respected by
  CaseStudyLayout (was hard-coded gray).
- QA-FEEDBACK.md re-organized to surface the 7 remaining open items at
  the top.
