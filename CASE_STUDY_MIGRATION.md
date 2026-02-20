# Case Study Migration: Gatsby → Sanity

## Status Legend
- [ ] Not started
- [x] Done

---

## Phase 0: Setup
- [x] Create categories in Sanity (11 categories)
- [x] Write migration script (`scripts/migrate-case-studies.mjs`)
- [x] Run migration — 26 case studies, 25+ hero images, all content blocks

## Phase 1: All 26 Case Studies — MIGRATED

| # | Slug | Title | Hero | Content | Categories | upNext | Issues |
|---|------|-------|------|---------|------------|--------|--------|
| 1 | ipsos-facto | The Future of Research Intelligence | OK | OK | OK | partial | upNext: `national-cancer-navigation` not found |
| 2 | prior-auth | Faster Approvals, Better Outcomes | OK | OK | OK | OK | |
| 3 | public-sector | Designing for the Public Sector | OK | OK | OK | OK | |
| 4 | all-of-us | Participant-Focused Design in All of Us | OK | OK | OK | OK | |
| 5 | mitre-shr | Driving a National Health Data Standard | OK | OK | OK | partial | upNext: `determinants-of-health`, `open-source-healthcare` not found |
| 6 | maya-ehr | Care Over Clicks | OK | OK | OK | OK | |
| 7 | mass-snap | Closing the SNAP Gap | OK | OK | OK | partial | upNext: `care-plans`, `determinants-of-health` not found |
| 8 | wuxi-nextcode-familycode | Carrier Screening for Everyone | OK | OK | OK | partial | upNext: `carrier-testing` not found |
| 9 | mitre-state-of-us-healthcare | Showing & Telling National Healthcare Stories | OK | OK | OK | partial | upNext: `healthcare-dollars`, `determinants-of-health` not found |
| 10 | 3m-coderyte | NLP Software for 3M | OK | OK | OK | OK | |
| 11 | hgraph | hGraph | OK | OK | OK | OK | |
| 12 | partners-insight | Designing an Efficient IRB | OK | OK | OK | OK | |
| 13 | mitre-flux-notes | Health Data Capture at Point of Care | OK | OK | OK | partial | upNext: `determinants-of-health`, `open-source-healthcare` not found |
| 14 | commonhealth-smart-health-cards | Vaccination Cards for the Nation | OK | OK | OK | partial | upNext: `determinants-of-health`, `open-source-healthcare` not found |
| 15 | fastercures-health-data-basics | Health Data Basics | OK | OK | OK | partial | upNext: `open-source-healthcare`, `determinants-of-health` not found |
| 16 | mount-sinai-consent | A Search for Unexpected Genetic Heroes | FIXED | OK | FIXED | partial | upNext: `care-plans` not found (originally had quote issues, now fixed) |
| 17 | inspired-ehrs | Inspired EHRs | OK | OK | OK | partial | upNext: `determinants-of-health` not found |
| 18 | ahrq-cds | CDS Repository for Standards of Care | OK | OK | OK | partial | upNext: `determinants-of-health`, `open-source-healthcare` not found |
| 19 | infobionic-heart-monitoring | Visualizing Real-Time Cardiac Arrhythmias | OK | OK | OK | partial | upNext: `bathroom-to-healthroom` not found |
| 20 | personal-genome-project-vision | OpenHumans | OK | OK | OK | partial | upNext: `carrier-testing` not found |
| 21 | staffplan | StaffPlan | OK | OK | OK | partial | upNext: `augmented-clinical-decision-support` not found |
| 22 | care-cards | Care Cards | OK | OK | OK | OK | |
| 23 | partners-geneinsight | Gene Insight | OK | OK | OK | OK | |
| 24 | insidetracker-nutrition-science | Your Food in Code | OK | OK | OK | partial | upNext: `bathroom-to-healthroom`, `open-source-healthcare` not found |
| 25 | paintrackr | PainTrackr | OK | OK | OK | partial | upNext: `killer-truths` not found |
| 26 | tabeeb-diagnostics | Connecting Rural Clinics | OK | OK | OK | partial | upNext: `understanding-ebola` not found |

## Missing upNext Targets (not case studies — likely vision/feature pages)

These slugs are referenced in `upNext` but don't exist as case study MDX files:
- `determinants-of-health` (7 refs)
- `open-source-healthcare` (6 refs)
- `care-plans` (2 refs)
- `carrier-testing` (2 refs)
- `bathroom-to-healthroom` (2 refs)
- `national-cancer-navigation` (1 ref)
- `healthcare-dollars` (1 ref)
- `killer-truths` (1 ref)
- `augmented-clinical-decision-support` (1 ref)
- `understanding-ebola` (1 ref)

These are likely vision projects or features pages from the Gatsby site, not case studies.

## Phase 2: Verification
- [x] All 26 case studies created in Sanity
- [x] All slugs match Gatsby URLs
- [x] All 26 hero images uploaded
- [ ] Inline images rendering correctly
- [ ] All quotes rendering
- [ ] All references rendering
- [ ] upNext links working (partial — see missing targets above)
- [ ] Category filtering working
- [ ] Sort order matches Gatsby
