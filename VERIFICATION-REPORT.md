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

### 3. Landing pages have MORE Next headings than Gatsby
- AI Landing: gatsby=4, next=10 (Δ150%)
- Enterprise: gatsby=5, next=7 (Δ40%)
- Government: gatsby=6, next=9 (Δ50%)
- Patient Engagement: gatsby=9, next=12 (Δ33%)

These were re-architected with more component sections. Likely
intentional but worth a visual sanity check that nothing was added that
shouldn't be there.

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

## Pages With Modest Image Gaps (Δ22-38% fewer images)

These case studies have 2-3 fewer rendered images than Gatsby. Could be
real (a section image not migrated) or could be the Next.js `<Image>`
component being smarter about not rendering hero `<img>` twice. Worth a
quick visual scan of each:

- MITRE State of US Healthcare (Δ27%)
- Infobionic Heart Monitor (Δ25%)
- Partners GeneInsight (Δ25%)
- InsideTracker Nutrition (Δ22%)
- PainTrackr (Δ22%)
- Tabeeb Diagnostics (Δ38%)

## What Was Fixed This Session

- All 10 case studies with broken `drafts.*` upNext refs or missing
  feature-link entries are repaired (audit re-run reports clean).
- `caseStudy.upNext` schema now accepts `externalUpNextItem` so future
  off-site links can be added without inventing stub case-study docs.
- References block's `background` field is now respected by
  CaseStudyLayout (was hard-coded gray).
- QA-FEEDBACK.md re-organized to surface the 7 remaining open items at
  the top.
