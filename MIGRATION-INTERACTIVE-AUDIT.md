# Migration Interactive-Feature Audit (2026-06-15)

Behavioral audit of the Gatsby→Next port: does every ported page's **interactivity**
and its **dynamically-loaded assets** actually work on prod? (The original migration QA
checked *visual* parity — HTTP 200, layout, broken `<img>` — which never exercises
interaction-triggered behavior or JS-fetched data. That is the blind spot this audits.)

Reference (old site source of truth): `C:\Users\quest\Programming\GoInvo\goinvo.com` (Gatsby).

## Two kinds of gap

- **CODE gap** — interactive behavior was not re-implemented in the port. Fixable now, no old files needed.
- **ASSET gap** — behavior works, but images/data/PDF it loads were never copied into `public/`.
  Recovery source (NO creds): the **public** GitHub repo `goinvo/goinvo.com-2018-old-features`
  under `source/` (NOT the S3 bucket — that's redirect-only; NOT CloudFront — 404). Find any asset
  with `gh search code "<filename>" --owner goinvo`.

> **STATUS 2026-06-15: all gaps below are FIXED.** Code gaps re-implemented; asset gaps recovered
> from `goinvo/goinvo.com-2018-old-features` into `public/` (51 files) — verified rendering, 0
> broken images. Nothing committed yet.

## Findings

| Page | Gap | Type | Detail |
|---|---|---|---|
| `/vision/care-plans/part-1` | History-timeline popups dead | CODE | **FIXED** this session — jQuery + `case_studies.js` now load after mount (`CarePlansLegacyScripts.tsx`). |
| `/vision/care-plans/part-1` | Checkbox care-plan diagram | ASSET | **FIXED** — `conditions.json` + 6 persona images recovered to `public/`; `checkboxes.js` `/old/` prefix → `/images/`; re-enabled in loader. Verified: checking "Obesity" injects content + swaps image. |
| `/vision/bathroom-to-healthroom` | Timeline / Date / Locations sliders show broken images | ASSET | **FIXED** — recovered 8 timeline + 3 date + 7 location images to `public/images/features/design-for-life/`. 0 broken. |
| `/vision/disrupt/part-4` | Tech-grid slideshow shows broken image on every click | ASSET | **FIXED** — recovered all 20 `public/images/features/disrupt/slideshow/*.jpg`. |
| `/vision/disrupt` (all parts) | Social share buttons | CODE | **FIXED (social only)** — `DisruptSocialButtons.tsx` restores the Part 6 `.social-buttons.end` (FB/Twitter/LinkedIn; Google+ dropped — defunct; URL → `/vision/disrupt`). The legacy Part 1 top buttons were `display:none` in the old CSS, so nothing visible was lost there. |
| `/vision/disrupt/part-6` | Disqus comments thread | CODE | **Intentionally not restored** (third-party widget retired) per decision 2026-06-15. |
| `/vision/redesign-democracy` | Sticky Table-of-Contents scroll-nav | CODE | **FIXED** — `RedesignDemocracyNav.tsx` (+ scoped CSS) restores the sticky TOC with scroll-spy + jump, matching the `ScrollNav` pattern used on digital-healthcare/zika. |
| `/vision/understanding-zika` | "Download" PDF button → 404 | ASSET | **FIXED** — recovered `understanding_zika.pdf` to `public/old/images/features/zika/` (the `redirects.json` target for that URL). Download now resolves 200. |

## Verified OK (no gaps)

augmented-clinical-decision-support, determinants-of-health, killer-truths, coronavirus,
healing-us-healthcare (verbatim D3 scripts + CSVs all 200), living-health-lab,
oral-history-goinvo, primary-self-care-algorithms, public-healthroom,
visual-storytelling-with-genai (3D GLB loads), digital-healthcare, eligibility-engine,
healthcare-ai.

Minor non-blocking notes: coronavirus chart copy still says "Live update" over a now-static
data snapshot; `EligibilityVideos.tsx`/`HealthcareAIVideos.tsx` are unused dead code (pages
render video from Sanity instead).

## Recovery source for ALL asset gaps (CONFIRMED)

**Public** GitHub repo **`goinvo/goinvo.com-2018-old-features`** — "still houses the live code for
old feature articles." Assets under `source/` (map to `public/<path-minus-source/>`). NO creds.
Find anything with `gh search code "<filename>" --owner goinvo`. The S3 bucket `www.goinvo.com-2018`
is redirect-only (not the source); CloudFront 404s these. Per-feature repos also exist
(`goinvo/Careplans`, `goinvo/EmergingTechnologiesBookWebsite` = disrupt, `goinvo/InvoUnderstandingZika`,
`goinvo/KillerTruths`, `goinvo/healthroom`) but are design-project repos — the deployed assets are
in `goinvo.com-2018-old-features`.
