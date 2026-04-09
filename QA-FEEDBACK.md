# QA Feedback Tracker

Feedback from Jen Patel via FigJam board review.

## Status Key
- [x] Fixed
- [ ] Pending
- [~] Partially fixed

---

## 1. AI Design Certification
- [x] Missing text in section 4 (wellness/medical world paragraph + bullet list)
- [x] Item 7 "The point" missing haiku-style linebreaks
- [x] "We're building this in the open:" should be smaller header (h3), not bullet
- [x] "Studies of AI..." quote moved to before item 4
- [x] "Trust grows..." quote added as standalone Quote at end

## 3. Human-Centered Design for AI
- [x] "Studies of AI..." should be a quote (blockquote) before section 3
- [x] "Trust grows..." missing standalone Quote at end
- [x] Both instances preserved (inline prose + featured quote)

## 4. Visual Storytelling with GenAI
- [ ] Not using same preview images for videos (noted, not critical)
- [x] Hotspots off — fixed with translate(-50%,-50%) + w-fit container
- [x] Hotspots move after click — fixed transition-colors
- [x] Mobile equation layout — responsive grid + spacing
- [x] Scene buttons — changed to tab style
- [x] 3D viewer border rounding removed
- [ ] Text differences from Gatsby (needs investigation)
- [ ] Authors + contributors ordering consistency

## 6. Eligibility Engine
- [x] Doubled superscripts (sup "1" and "4") — removed duplicates
- [x] Quote "(3)" not a superscript — set refNumber=3

## 7. Fraud Waste Abuse in Healthcare
- [x] Missing haiku-style linebreaks in intro paragraph
- [x] "30%" heading alignment (sectionTitle → h2, left-aligned)

## 8. Augmented Clinical Decision Support
- [x] Button border: 2px → 1px
- [x] Button border color: #E36216 → #FFB992 (lighter orange)
- [x] Button padding: 12px 24px → 6px 16px
- [x] Button-group flex override removed (pure-g side-by-side works)
- [x] Missing disc bullet list styles added
- [ ] Cagri Zaman and Mollie Williams author images broken (path needs cloudfrontImage)

## 9. Healthcare AI
- [x] Storyboard images rendering stacked instead of side-by-side — fixed columns renderer
- [ ] Not using same preview images for videos
- [ ] Chat image too narrow (should be full width with caption)
- [ ] Text content differences
- [ ] Authors + contributors ordering

## 10. National Cancer Navigation
- [x] Links open in new tabs (global fix)
- [x] Authors listed vertically (linebreaks added)
- [ ] Spaces between links and periods
- [ ] Missing contributor links (not critical per Jen)

## 12. Living Health Lab
- [x] Missing content after "Next Steps: Digital Design" (114 lines added)

## 17. Faces in Health Communication
- [ ] Layout differences make circles + text harder to follow
- [ ] Weird amount of superscripts where there were originally no references
- [ ] Another weird layout (Human Faces and Communication section)
- [ ] "Humans are born to look at faces." should be a header
- [ ] Next sections became "salad" (broken layout)
- [ ] More layout, image + text mismatch
- [ ] Image sizes and layouts vary — prefer original design for balance
- [ ] Next section also doesn't work (Healthcare Graphics section)
- [ ] Some more layout issues in later sections

## Global Issues
- [x] Paragraph margin-top: 0 → my-4 (matching Gatsby 1em)
- [x] External links auto-open in new tabs
- [x] Firefox banner seam — merged to single image
- [x] Mobile vision hero — 3 stacked mobile images
- [x] Duplicate banners on 5 legacy pages (zika, redesign-democracy, bathroom, oral-history, print-big)
- [x] 32 duplicate sectionTitle headings removed from case studies
- [x] Drafts section showing on public site — fixed condition
- [x] Orange bullets on enterprise/government results sections

---

## 17. Faces in Health Communication (MAJOR — extensive issues)
- [ ] Layout differences make circles + text harder to follow/see they're related
- [ ] Weird amount of superscripts where there were originally no references
- [ ] Another weird layout (Human Faces and Communication section)
- [ ] "Humans are born to look at faces." should be a header
- [ ] Next sections became "salad" (broken layout)
- [ ] More layout, image + text mismatch
- [ ] Image sizes and layouts vary — prefer original design for balance/readability
- [ ] Healthcare Graphics section doesn't work
- [ ] More layout issues in later sections
- [ ] "Appendix. A Lean Experiment Evaluating Healthcare Information Graphics" should be a header

## 18. Health Design Thinking
- [ ] All-caps issue — text rendering in all uppercase that shouldn't be

## 23. Physician Burnout
- [ ] Mobile version of contributors/burnout illustration should show text list of contributors (desktop image reveals names that mobile crops)

## hGraph (Case Study)
- [ ] All-caps too much

## 24. Determinants of Health
- [ ] Why different style of buttons? (should match Gatsby button style)
- [ ] Wrong icons for the chart (not the right icons we want)
- [ ] Chart looks different from Gatsby (our custom SVG donut vs react-google-charts)
- [ ] Big sans-serif header "Individual Behavior" is weird — should be serif like Gatsby
- [ ] Little sub-headers (Psychological Assets, etc.) weird as serif — font mismatch
- [ ] Blue-on-blue contrast issue: grey text on blue background doesn't have good contrast
- [ ] Missing Edwin's and Bryson's headshots

## 25. Coronavirus (COVID-19)
- [ ] Chart shows massive difference/undercount (static data vs Gatsby's live data — our 704M is final but chart component may show old March 2020 snapshot)
- [ ] Missing bullets from timeline (some timeline events have sub-bullets on Gatsby)
- [ ] Icons should be vertically centered with text, with extra space below (subtle alignment)

## 28. Who Uses My Health Data
- [ ] Missing download poster link
- [ ] Image could be wider
- [ ] Consider removing orange border for consistency

## Script Improvements Needed
- [ ] batch-verify should also compare MOBILE viewport (375px) not just desktop
- [ ] page-tree.ts should detect broken/unloaded images (naturalWidth === 0)

## Pages with Major Remaining Work
1. **Faces in Health Communication** — extensive layout issues throughout, image+text pairing broken in multiple sections. This page needs a deep re-port from the Gatsby source.
2. **Healthcare AI** — chat image width, video preview images, text differences
3. **National Cancer Navigation** — spacing issues, contributor links
4. **Health Design Thinking** — all-caps issue
5. **Physician Burnout** — mobile contributor illustration
