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

## Deep interaction pass (2026-06-16/17) — "Verified OK" upgraded from surface-checked to interaction-exercised

The 2026-06-15 "Verified OK" list above was reached by surface checks (HTTP 200, scripts/CSVs
load, GLB "loads", no broken `<img>`). Those never prove a widget *does* anything — a D3 chart
can fetch its CSV and render an empty SVG; a 3D canvas can mount and stay a frozen first frame.
This pass headlessly **exercised every interactive widget** with before/after DOM assertions
(Puppeteer), proving behavior — not just presence. **Result: no functional regressions; every
interactive widget works when actually used.**

Method per widget type: charts → count *drawn* SVG shapes / canvas pixels (not "CSV 200");
carousels/sliders → capture active state, trigger control, assert the active item AND content
changed; 3D → assert canvas drew AND that a hotspot click *re-rendered* the scene (viewport
screenshot bytes change after camera move = live r3f, not a static frame); toggles → assert the
state attr/class/height changed, **not** element count.

Interaction-verified working: care-plans overview/1/2/3 (persona tabs, checkbox diagram, barriers
carousel, 131 popovers, part-3 scroll-spy); determinants-of-health (pie + legend→details swap);
healing-us-healthcare (D3 draws 2,789 shapes); coronavirus/killer-truths (static React SVG charts,
no handlers by design); bathroom-to-healthroom (Timeline/Date/Locations sliders); visual-
storytelling-with-genai (WebGL 3D — canvas drew + hotspot moves camera + re-renders); public-
healthroom (scrollspy frames); ACDS + living-health-lab (`ImageCarousel`); primary-self-care-
algorithms (icon selector + expand-all); oral-history-goinvo (rslides); disrupt parts 1–6 (scroll
color, hero videos readyState 4, nav, social); redesign-democracy (Embla govt tabbed carousel,
`ActionSection` Request-a-Copy iframe toggle, TOC scroll-spy).

Non-issues confirmed (do NOT re-chase): care-plans part-3 `button.see-the-future` is **commented
out in the legacy HAML source** (`legacy/part3.html`) — faithful, handler always vestigial;
coronavirus/killer-truths charts have no click/hover handlers in the legacy design; a one-time
React `unique "key" prop` warning on bathroom did NOT reproduce across clean loads (all sliders
keyed → transient dev artifact); `ActionSection` iframe is always mounted (toggle is class/height,
not element count) — an iframe-count check is the wrong assertion.

## Styling pass (2026-06-17) — no dead-CSS / bleed / overflow regressions

Companion to the interaction pass: checked every page for *visual* regressions (the project's
"dead-CSS" class — generic markup not mounting a page's own ported CSS — plus CSS bleed, overflow,
font-fallback). Probed **all 31 `vision/*` routes + 13 standard routes**: **0 horizontal overflow,
0 CSS/font 404s, Open Sans body everywhere (no Times/serif fallback), 0 collapsed sections.** Then
visually inspected ~20 legacy-injected / custom-CSS / chart / 3D pages (compact viewport JPEGs):
all render faithfully, no bleed (chat widget + header chrome correct on legacy routes), no
unstyled fallback.

**One real defect found + FIXED:** `visual-storytelling-with-genai` threw a **hydration mismatch** —
`ModelViewerSection` SSR-rendered the react-three-fiber `<Canvas>` (which can't SSR-match the
client), so React regenerated the 3D subtree on every load (dev "1 Issue" badge; possible viewport
flash). Fix: gate the Canvas behind a `mounted` flag (`useEffect`) so the server + first client
paint render an identical same-height (`h-[500px]`) placeholder, then mount the Canvas after
hydration. Verified: hydration error gone (1→0), canvas still renders 986×500, hotspot click still
moves the camera + re-renders the scene. (Non-defects: `/about` THREE "WebGL context" errors were a
flag-less headless-probe artifact — 0 errors with WebGL enabled; a guessed `/work/eim` slug 404'd —
work slugs are Sanity-driven.)

## Recovery source for ALL asset gaps (CONFIRMED)

**Public** GitHub repo **`goinvo/goinvo.com-2018-old-features`** — "still houses the live code for
old feature articles." Assets under `source/` (map to `public/<path-minus-source/>`). NO creds.
Find anything with `gh search code "<filename>" --owner goinvo`. The S3 bucket `www.goinvo.com-2018`
is redirect-only (not the source); CloudFront 404s these. Per-feature repos also exist
(`goinvo/Careplans`, `goinvo/EmergingTechnologiesBookWebsite` = disrupt, `goinvo/InvoUnderstandingZika`,
`goinvo/KillerTruths`, `goinvo/healthroom`) but are design-project repos — the deployed assets are
in `goinvo.com-2018-old-features`.
