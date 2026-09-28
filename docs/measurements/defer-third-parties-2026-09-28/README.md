# Mobile Lighthouse performance: `perf/defer-third-parties` (2026-09-28)

Production (`https://www.goinvo.com`, which was still the pre-branch code throughout) measured
against a Vercel preview of the branch after each step. Every raw Lighthouse JSON is in the
step folders; `summary.json` in each holds the medians.

## Method

- Lighthouse 12.8.2, default **mobile** preset, simulated throttling, headless Chrome 148,
  one Windows machine. Runner: `lh_ab.py` (session scratchpad; the loop is described here so
  it can be rebuilt): for each run, for each page, for each target → one Lighthouse run, so
  production and preview alternate and share network conditions.
- Pages: `/`, `/work`, `/work/mitre-flux-notes`. 5 runs per page and target for steps 1–2,
  7 for steps 3–5. Scores are **medians**; the bracket is the min–max across runs.
- Production and preview were measured in the same session each time, so compare within a
  step, not across steps (production itself drifts 44–57 on the same page between steps).

## Results (performance score, median [range])

| Step | Change | Home prod → preview | /work prod → preview | Flux Notes prod → preview |
|---|---|---|---|---|
| 1 | Calendly to viewport, HubSpot tracker removed | 52 → 62 | 51 → 58 | 57 → 62 |
| 2 | Font stylesheets non-render-blocking | 50 → 60 | 57 → 74 | 44 → 61 |
| 3 | Newsletter popup to viewport, `/work` hero visible from server, JotForm lazy | 53 → 64 | 48 → 86 | 55 → 63 |
| 4 | Reveals and case-study hero visible without JS | 49 → 59 | 45 → 92 | 56 → 74 |
| 5 | Case-study hero space reserved outside `<main>` | **47 → 62** [59–87] | **48 → 89** [64–98] | **53 → 93** [63–98] |

Step 5 metrics (median, preview vs production):

| Page | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|
| Home | 4.3 s vs 4.9 s | 6.9 s vs 8.1 s | 220 vs 530 ms | 0 vs 0 | 4.3 s vs 6.9 s |
| /work | 1.8 s vs 5.7 s | 2.9 s vs 10.2 s | 224 vs 508 ms | 0.001 vs 0 | 1.8 s vs 5.7 s |
| Flux Notes | 1.2 s vs 4.0 s | 1.8 s vs 5.3 s | 256 vs 498 ms | 0.006 vs 0 (0.328 in 2 of 7) | 1.9 s vs 5.2 s |

Accessibility is unchanged (98–100). The preview's SEO score (69) and best-practices score
(75) are preview artefacts: Vercel previews send `x-robots-tag: noindex` and load the Vercel
toolbar (third-party cookies, console issues). Production scores 100 and 79 on those.

## What mattered, in order

1. **Content hidden until JavaScript ran.** Framer Motion writes `initial` values into the
   server HTML, so `initial={{ opacity: 0 }}` kept first-screen content invisible until
   hydration: the persistent hero (`/work`, `/about`, `/vision`), every `Reveal` and CMS
   article block, and the home page's CSS reveal. Case-study heroes were not in the server
   HTML at all and were inserted after hydration, moving the page 270 px (CLS 0.33 whenever
   hydration lost the race with first paint). Fixed by `src/lib/useScrollReveal.ts` and a
   server-rendered hero stand-in; guarded by `scripts/check-hidden-until-hydration.mjs`
   (failed 5 of 6 default routes on production; passes 14 of 14 on the preview).
2. **Main-thread time from third parties:** Calendly (about 2.8 MB with the Stripe it
   embeds) and the EmailOctopus popup now load as their section nears the viewport; the
   unused HubSpot tracker is gone. Total blocking time roughly halved on every page.
3. **Render-blocking font CSS:** Typekit and Google Fonts stylesheets now load without
   blocking first paint.

Kept as they were, by the owner's decision: GA4 and Google Ads tags (about 260 ms of main
thread in the lab).

## The spread is Chrome, not the site

Every page is bimodal (for example home 59–62 or 87–88). In the slow runs Chrome's
**paint holding** keeps the first frame back for about a second after the page is ready;
the observed first paint lands at about 1.3 s instead of about 0.4 s, and Lighthouse's
simulation then counts every request and task before it. Evidence: four runs with
`--disable-features=PaintHolding` all painted at about 430 ms and scored 82–88, while
blocking all web fonts did not remove the slow mode (3 of 4 still slow). The old Gatsby site
shows the same hold (about 2.4 s). Scores here are measured with Chrome's default behaviour;
do not switch paint holding off to report a better number.

In every slow run the content was already painted at 340-450 ms, and the frame was shown
almost exactly 1.0 s later (339 -> 1339 ms, 446 -> 1435 ms): a Chrome timer, not site work.
Home was in the slow mode far more often on this machine (7 of 10) than the other pages.

**Negative result:** the Typekit font (`font-display: auto`) is not the cause. Ten
alternating runs each: slow mode in 7 of 10 normally and 8 of 10 with Typekit blocked
(`home-paint-hold/typekit/`). Blocking every web font did not remove it either. A Puppeteer-
driven Lighthouse never reproduced the hold, so it depends on how Chrome is launched.

## GitHub's runners (the numbers CI gates on)

`lighthouse.yml` dispatched with `base_url` = the step-5 preview (twice) and production,
5 runs per page, median run:

| Page | Production | Preview (pass 1, pass 2) |
|---|---|---|
| Home | 48 | 74, 72 |
| /work | 45 | 77, 76 |
| Flux Notes | 43 (CLS 0.328 in 5 of 5) | 83, 74 (CLS 0.003) |

On these Linux runners the paint hold shows up in about 1 run in 5 per page, so home scores
like the other pages. The runners' CPUs are slower: TBT reads 340-490 ms on the preview and
630-900 ms on production.

Two later changes, each measured with two CI passes (median of 5 runs per page):

| Build | Home | /work | Flux Notes |
|---|---|---|---|
| Step 5 (above) | 74, 72 | 77, 76 | 83, 74 |
| + Open Sans and Montserrat self-hosted | 76, 73 | 77, 79 | 71, 73 |
| + page hero fetched at high priority | 62, 92 | 83, 93 | 82, 92 |

- **Self-hosted fonts** moved home's simulated FCP from 2.9 s to 2.45 s in both passes; the
  score change is inside the noise. The real gain is two fewer third-party origins per page.
  Screenshots of 8 pages at two widths are pixel-identical to the Google-hosted build.
- **`fetchpriority="high"`** on the hero (the LCP element on /work and case studies) cut
  their LCP render delay from about 1.2-1.9 s to 0.4-0.7 s. Home's code did not change in
  this build: its 62 vs 92 is runner-to-runner variance. GitHub gives each job a different
  machine and a slow one moves the whole pass (that pass's home TBT was 478 ms against 248).

**Gate** (`lighthouserc.json`, per page via `assertMatrix`): performance at least 0.60 on
home and 0.70 elsewhere (median run), TBT at most 600 ms (median run) and CLS at most 0.1
(worst run) everywhere. The score floors leave room for a slow runner; TBT and CLS are the
sharp gates. Production before this branch fails it (performance 0.46-0.57, CLS 0.328).
