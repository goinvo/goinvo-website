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

### 1. Healing US Healthcare — `/vision/healing-us-healthcare`
Largest content gap of any page audited:
- HEADINGS: gatsby=99, next=67 (Δ32%)
- PARAGRAPHS: gatsby=161, next=122 (Δ24%)
- IMAGES: gatsby=10, next=7 (Δ30%)
- LISTS: gatsby=15, next=8 (Δ47%)

Per QA-FEEDBACK item #39 the missing pieces were: PARTICIPATE / CREATING
content sections (marked partial), the OG Knight Lab timeline (broken on
Gatsby too), and the 3+2 restored charts (already done). The remaining
24-47% gap suggests body-text sections may still be missing — needs a
content diff pass.

### 2. Bathroom to Healthroom — `/vision/bathroom-to-healthroom`
- IMAGES: gatsby=28, next=13 (Δ54%)
- LISTS: gatsby=10, next=6 (Δ40%)

Likely intentional: the LocationsSlider now renders only the active scene
(1 image) instead of all 6 simultaneously, and DateSlider renders 1 of 3.
That accounts for ~10 of the missing 15 images. The rest may be inline
illustrations not yet ported. **Verify visually before declaring this
acceptable.**

### 3. Landing pages have MORE Next headings than Gatsby
- AI Landing: gatsby=4, next=10 (Δ150%)
- Enterprise: gatsby=5, next=7 (Δ40%)
- Government: gatsby=6, next=9 (Δ50%)
- Patient Engagement: gatsby=9, next=12 (Δ33%)

These were re-architected with more component sections. Likely
intentional but worth a visual sanity check that nothing was added that
shouldn't be there.

### 4. Care Plans Part 1 — `/vision/care-plans/part-1`
- PARAGRAPHS: gatsby=641, next=479 (Δ25%)
- IMAGES: gatsby=48, next=68 (Δ42% MORE on Next)

The extra images likely come from Next.js `<Image>` rendering both a
poster `<img>` and an `<img>` placeholder for picture sources, and from
the carousel images all being eagerly rendered (per the lazy-loading fix
in QA item #43). The paragraph deficit is more concerning — possibly
some text content didn't migrate. Worth diffing block-by-block.

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
