# Vision/Feature Migration: Gatsby → Sanity

## Status Legend
- [x] Done
- [~] Partial (content extracted but may need manual review)
- [ ] Not started / External link only

---

## Phase 0: Setup
- [x] Update `feature` Sanity schema (added content, metaDescription, order, expanded categories)
- [x] Add `featureBySlugQuery` to GROQ queries
- [x] Update `/vision/[slug]` page to use `feature` type instead of `visionProject`
- [x] Write migration script (`scripts/migrate-features.mjs`)
- [x] Run migration — 51 features, 251 images uploaded, 0 errors

## Phase 1: All 51 Features — MIGRATED

### Internal Vision Pages (with content extraction)

| # | Slug | Title | Hero | Content Blocks | Issues |
|---|------|-------|------|----------------|--------|
| 1 | rethinking-ai-beyond-chat | Rethinking AI Beyond Chat | OK | 23 | |
| 2 | human-centered-design-for-ai | The Human-Centered Design Behind AI Clinicians Can Trust | OK | 46 | |
| 4 | visual-storytelling-with-genai | Reimagining Visual Storytelling with GenAI | OK | 37 | |
| 5 | healthcare-dollars-redux | Where Your Health Dollars Go (Redux) | OK | 19 | |
| 7 | eligibility-engine | Eligibility Engine for Massachusetts | OK | 44 | |
| 8 | fraud-waste-abuse-in-healthcare | Fraud, Waste, Abuse in US Healthcare | OK | 52 | |
| 9 | augmented-clinical-decision-support | Augmented Clinical Decision Support | OK | 25 | |
| 10 | healthcare-ai | The AI Healthcare Future We Need | OK | 53 | Videos use mediaUrl() — need manual review |
| 12 | national-cancer-navigation | National Cancer Navigation | OK | 22 | 2 dynamic images (${i}-prob.png, ${i}-solve.png) failed |
| 13 | history-of-health-design | History of Health Design | OK | 7 | Minimal content (mostly interactive timeline) |
| 14 | living-health-lab | Living Health Lab | OK | 67 | Has carousel components not fully extracted |
| 15 | virtual-diabetes-care | Virtual Diabetes Care | OK | 32 | |
| 16 | public-healthroom | From Public Restroom to Public Healthroom | OK | 36 | 2 dynamic images failed (template literals) |
| 20 | primary-self-care-algorithms | Primary Self Care Algorithms | OK | 54 | |
| 21 | digital-health-trends-2022 | Digital Health Trends to Watch | OK | 44 | |
| 22 | faces-in-health-communication | Faces in Health Communication | OK | 116 | |
| 23 | health-design-thinking | Health Design Thinking Book | OK | 8 | |
| 24 | own-your-health-data | Own Your Health Data | OK | 16 | |
| 25 | us-healthcare-problems | US Healthcare Problems | OK | 26 | |
| 26 | precision-autism | Precision Autism | OK | 8 | Has interactive poster component |
| 27 | test-treat-trace | Test. Treat. Trace. | OK | 5 | Mostly poster image |
| 28 | physician-burnout | Physician Burnout: The Silent Killer | OK | 51 | |
| 29 | determinants-of-health | Determinants of Health | OK | 64 | Has interactive chart component |
| 30 | coronavirus | Understanding the 2019 Novel Coronavirus | OK | 154 | Very large page |
| 31 | patient-centered-consent | A Guide to Patient-Centered Consent | OK | 46 | |
| 32 | vapepocolypse | Vapepocolypse | OK | 4 | Mostly poster image |
| 33 | who-uses-my-health-data | Who Uses My Health Data? | OK | 14 | |
| 34 | open-pro | openPRO: Your health. Your voice. | OK | 73 | |
| 35 | healthcare-dollars | Where Your Health Dollars Go | OK | 31 | Has interactive flow diagram |
| 36 | virtual-care | Virtual Care | OK | 32 | |
| 37 | loneliness-in-our-human-code | Loneliness in Our Human Code | OK | 72 | |
| 38 | open-source-healthcare | Open Source Healthcare | OK | 20 | |

### External Links (metadata only, no page content)

| # | Slug | Title | Hero | External URL |
|---|------|-------|------|-------------|
| 3 | doodle-to-demo | Doodle to Demo | Video | https://doodletodemo.com/ |
| 6 | goinvo-timeline | Our Time Machine | OK | /about/studio-timeline/ |
| 11 | healthcare-mottos | Healthcare Mottos | OK | https://www.healthcaremottos.com/ |
| 17 | digital-health-connections-model | Digital Health Connections Model | OK | https://goinvo.github.io/DigitalHealthServiceComponents/ |
| 18 | us-healthcare-system-map | US Healthcare System Map | OK | https://goinvo.github.io/healthcare-map/ |
| 19 | whats-on-fhir | What's on FHIR? | OK | https://www.whatsonfhir.org/ |
| 39 | carrier-testing | Carrier Testing | OK | https://goinvo.github.io/CarrierTestingDesignTenets/ |
| 40 | print-big | Print big. Print often. | OK | https://www.goinvo.com/features/print-big/ |
| 41 | killer-truths | Killer Truths | OK | https://www.goinvo.com/features/killer-truths/ |
| 42 | care-plans | Care Plans that Drive Recovery | OK | https://www.goinvo.com/features/careplans/ |
| 43 | understanding-zika | Understanding Zika | OK | https://www.goinvo.com/features/zika/ |
| 44 | digital-healthcare | Digital Healthcare in 2016 | OK | https://www.goinvo.com/features/digital-healthcare/ |
| 45 | healing-us-healthcare | Healing U.S. Healthcare | OK | https://www.goinvo.com/features/us-healthcare/ |
| 46 | disrupt | Disrupt! | OK | https://www.goinvo.com/features/disrupt/ |
| 47 | bathroom-to-healthroom | From Bathroom to Healthroom | OK | https://www.goinvo.com/features/from-bathroom-to-healthroom/ |
| 48 | oral-history-goinvo | An Oral History of GoInvo | OK | https://www.goinvo.com/features/an-oral-history/ |
| 49 | redesign-democracy | Redesign Democracy | OK | https://www.goinvo.com/features/redesign-democracy/ |
| 50 | understanding-ebola | Understanding Ebola | OK | https://www.goinvo.com/features/ebola/ |
| 51 | ebola-care-guideline | Ebola Care Guideline | OK | https://www.goinvo.com/features/ebola-care-guideline/ |

## Known Issues

### Content Extraction Limitations
- **Dynamic images** (`${variable}` in JSX src attributes) could not be uploaded. Affected: national-cancer-navigation (2 images), public-healthroom (2 images)
- **Interactive components** (Chart, SlickCarousel, custom React components) were skipped. Pages with interactive elements still have their text and static images extracted.
- **Video embeds using `mediaUrl()`**: Some videos used Gatsby helper functions for URLs. The parser extracted what it could; some videos may need manual URL updates.
- **References/footnotes**: The `<References>` component content was not extracted. These can be added manually in Sanity Studio.
- **Author sections**: `<Author name="...">` components were not converted to content blocks. Author info can be managed separately if needed.

### Pages Needing Manual Review
These pages have significant interactive components that couldn't be auto-extracted:
- `determinants-of-health` — Interactive determinant chart + details panel
- `healthcare-dollars` — Interactive flow diagram
- `healthcare-dollars-redux` — Interactive visualization
- `history-of-health-design` — Interactive timeline
- `living-health-lab` — Carousel components
- `precision-autism` — Interactive poster
- `national-cancer-navigation` — Dynamic image grid

## Phase 2: Verification
- [x] All 51 features created in Sanity
- [x] All slugs match features.json IDs
- [x] 251 images uploaded (hero + inline)
- [ ] Internal pages rendering correctly via `/vision/[slug]`
- [ ] External links working from grid
- [ ] Category filtering working
- [ ] Sort order matches Gatsby
