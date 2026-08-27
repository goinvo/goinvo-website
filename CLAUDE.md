# GoInvo Website — Project Instructions

> Append durable operational facts here (auth, deploy steps, gotchas). This file
> loads every session; uncommitted scratch notes get lost. **Commit changes to it.**

> **Practices & open work:** durable engineering practices + architecture decisions live in
> [`docs/engineering-practices.md`](docs/engineering-practices.md); anything that still needs
> work is tracked in [GitHub Issues](https://github.com/goinvo/goinvo-website/issues) (labeled
> `tech-debt` / `analytics` / `seo` / `infra`) — file an issue rather than leaving it implicit.

> **OLD GATSBY SITE (pre-Next migration — the migration source of truth):**
> `C:\Users\quest\Programming\GoInvo\goinvo.com`. Reference for migration fidelity (legacy
> markup, styles, behavior); run with `npm run develop` (Gatsby dev :8000) to compare. NOTE:
> the legacy `/features/*` interactive microsites (careplans, disrupt, design-for-life, zika…)
> are NOT in this repo — Gatsby only *linked* to them.
>
> ### Recovering legacy `/old/` feature assets — NO credentials needed
> The deployed legacy feature microsites + their assets live in the **public** GitHub repo
> **`goinvo/goinvo.com-2018-old-features`** (described as "still houses the live code for old
> feature articles"), under `source/` (e.g. `source/features/careplans/data/conditions.json`,
> `source/images/features/careplans/*_obese.png`, `source/images/features/disrupt/slideshow/*.jpg`,
> `source/images/features/design-for-life/{timeline,dates,locations}/*`). Pull with
> `gh`/`raw.githubusercontent.com` and drop into `public/<path-minus-source/>`. To FIND an asset
> across the org: `gh search code "<distinctive-filename>" --owner goinvo`. Individual features
> also have their own public repos (`goinvo/Careplans` [design PDFs], `goinvo/EmergingTechnologiesBookWebsite`
> [disrupt], `goinvo/InvoUnderstandingZika` [the PDF], `goinvo/KillerTruths`, `goinvo/healthroom`).
>
> ### THE OLD SITE'S S3 BUCKET IS LIVE AND PUBLIC — try it FIRST
> ```
> https://s3.amazonaws.com/goinvo.com/<path>          # e.g. images/history/foo.jpg
> https://s3.amazonaws.com/www.goinvo.com/<path>      # same content, both public, no creds
> ```
> It serves the **whole 2018 site's** assets at their original paths, so a dead `/old/images/X`
> becomes `https://s3.amazonaws.com/goinvo.com/images/X`. Verified 2026-08-12: byte-identical to
> the GitHub copy (`images/history/invoSV_dirk_andrei_start.jpg`, 111,198 bytes, `image/jpeg`).
> **No credentials needed** — it is a public read. `scripts/recover-old-assets.mjs` does the pull.
>
> A previous note here said "do NOT chase S3, the public repo is the source". That was WRONG and
> cost real time twice. It was concluded from the ONE bucket `www.goinvo.com-2018` (403, and it is
> genuinely redirect-only) and generalised to all of S3 without testing `goinvo.com` /
> `www.goinvo.com`. Order of attack for any missing legacy asset: **S3 bucket first** (complete,
> original paths), then the public repo `goinvo/goinvo.com-2018-old-features` under `source/`
> (has the old *feature microsites* but not everything), then
> `gh search code "<filename>" --owner goinvo`. CloudFront 404s for anything not migrated; that
> part of the old note is correct.
>
> Gotchas that cost time on the 2026-08-12 timeline recovery (55 photos):
> - **Strip query strings** before treating a URL as an object key — `...jpg?dl=0` 403s.
> - **The requested path is not always where the file lives.** `images/team_photos/adam_pere.jpg`
>   only exists at `images/features/us-healthcare/adam_pere.jpg`; copy it to the requested path.
> - **Some legacy paths carry an extra segment**: the Ebola PDF is
>   `features/ebola/files/understanding_ebola.pdf`, not `images/features/ebola/...`.
> - **Git Bash mangles a leading `/old/...` argument** into `C:/Program Files/Git/old/...` —
>   pass the path without the leading slash.
> - **Not everything on a legacy page is ours.** `hs-fs/hub/356419/...` is HubSpot-hosted
>   (`yes.goinvo.com`) and was never broken; don't hunt for it.
> - Content that lives **outside the repo** (the studio timeline's slides come from a Google
>   Sheet) is invisible to grep. `tests/fixtures/legacy-timeline-media.txt` pins those URLs and
>   `tests/legacy-timeline-media.test.ts` fails if a file goes missing again.
>
> **Broken links across the CMS:** `node scripts/check-cms-links.mjs` scans every published
> document for relative hrefs (`../x/` resolves differently per page depth — always a latent
> 404), dead internal paths and, with `--external`, off-site links. `--fix` rewrites relative
> hrefs to absolute and applies its documented old-slug → new-slug map.
>
> Caveat: legacy scripts hard-code `/old/images/...`, but this site serves the
> canonical `/images/...`. The careplans whitepaper + zika guide PDFs were **consolidated OUT of
> `public/old/`** (that dir is now removed) to their canonical `public/images/features/...` path
> and serve directly; **reverse** redirects in `redirects.json` (`old/images/.../*.pdf` →
> `/images/.../*.pdf`) keep the historical `/old/...` URLs (which the old 308-permanent redirect may
> have cached) resolving. Guard: `tests/legacy-pdf-urls.test.ts` pins the invariant. If you re-add a
> legacy asset, place it at its canonical `public/images/...` path, not `/old/`.

## Driving / screenshotting the Sanity Studio with an authenticated session

To see or headlessly drive the Studio UI (e.g. the Marketing **Calendar**), use the
committed helper — it is the established, working method:

```
# app must be running at :3000 first (npm run dev  OR  npx next start)
node scripts/studio-screenshot.mjs --tab "Calendar" --out c:/tmp/studio-calendar.png
node scripts/studio-screenshot.mjs --path /studio/marketing --tab "Channels" --expect "Channels"
```

How auth works: the script injects a Sanity **USER SESSION token** into the Studio's
localStorage key `__studio_auth_token_<NEXT_PUBLIC_SANITY_PROJECT_ID>` *before* the bundle
loads, then asserts the authenticated workspace rendered (fails loudly on a login wall —
never silently "passes").

- The token comes from **`npx sanity login`** (writes `~/.config/sanity/config.json`,
  `authType: "normal"`) **or** the `SANITY_AUTH_TOKEN` env var.
- This must be a **user session token**, NOT `SANITY_API_WRITE_TOKEN` (that is a
  robot/manage token — it authenticates the data API but will NOT authenticate the Studio UI).
- **The user is already logged in** (`~/.config/sanity/config.json` present) — confirmed
  driving the Marketing Calendar headlessly on 2026-06-09. No per-session login needed
  unless the token expires; if it does, the user re-runs `npx sanity login`.
- Flags: `--path` (default `/studio/marketing`), `--tab "<exact view name>"`
  (Dashboard / Research / SEO / Strategy / Strategy Brief / A/B Tests / Calendar /
  Channels / Quick Links), `--expect "<text>"`, `--out <file>`, `--scroll <0..1|bottom>`,
  `--base <url>`.

## Sharing draft previews (built 2026-07)

Unpublished drafts 404 on the public site (verified: unauth GROQ returns `[]` for `drafts.*`,
even though PUBLISHED prod data is world-readable). Three ways to show one to a reviewer:

- **"Share preview" document action** — the primary, self-serve path. On any `feature` or
  `caseStudy` (the two types with a public page: `/vision/<slug>`, `/work/<slug>`), the editor's
  action menu (⋯ next to Publish, in Content OR the Presentation side panel) has **Share
  preview** → dialog to mint a **no-login, expiring (7/14/30-day), revocable** link
  `https://www.goinvo.com/preview/<token>`. Copy-once: only the token's SHA-256 hash is stored,
  so the link can't be re-shown (create a fresh one) — but active links are listed with Revoke.
- **Sanity project members** (Juhan, Eric, Jon, Shirley all have accounts): send the Presentation
  deep link `.../studio/presentation?preview=/vision/<slug>` — draft rendered next to its editor,
  supports in-Studio comments.
- **Sanity's built-in shared-preview toggle** (Presentation URL-bar share menu) also works but is
  short-lived (`SECRET_TTL` = 1h) and project-global — prefer the document action for review links.

How the token links work (`/preview/<token>`):
- **Storage** = a `previewShareLink` doc (managed purely via the data API — NOT a Studio schema)
  holding `{ tokenHash (sha256), docId (bare), createdAt, expiresAt, revokedAt }`. Safe in the
  world-readable prod dataset: hash reveals nothing, `docId` is an opaque uuid (no title/path
  leak — the consume route resolves the slug server-side at open time). Raw 256-bit token lives
  only in the URL.
- **Core:** `src/lib/previewShare.ts` (pure, isomorphic, unit-tested: paths, expiry clamp,
  `isShareLinkActive`, `shareLinkUrl`) + `src/lib/previewShare.server.ts` (node:crypto token
  gen/hash, server-only). **Routes:** `/api/preview-share` POST create / GET list / DELETE revoke
  (all `assertStudioOrApiKey` — Studio session via `x-sanity-session` OR `MARKETING_API_KEY`;
  fail-closed 503 without `SANITY_API_WRITE_TOKEN`), and the public `app/preview/[token]/route.ts`
  (validates → `draftMode().enable()` → redirects to the real page `#sanity-preview`; anything
  invalid/expired/revoked → `/preview/invalid`). **Action UI:**
  `src/sanity/actions/previewShareAction.tsx`, wired in `sanity.config.ts` `document.actions`.
- **Clean page = the actual site page in draft mode** (site header/footer, NOT the Studio shell).
  Reuses the `#sanity-preview` DraftModeGuard marker (below) so no login is needed and draft mode
  survives in-tab navigation. Env: needs `SANITY_API_WRITE_TOKEN` (create/revoke) — already on
  Vercel; the clean URL host prefers `MARKETING_PUBLIC_BASE_URL` else the request origin.

Underlying draft-mode plumbing (shared by all three paths): `src/app/api/draft-mode/enable/route.ts`
is a hand-rolled `defineEnableDraftMode` that tags **top-level** redirects with `#sanity-preview`
(skipped when `Sec-Fetch-Dest: iframe`). `DraftModeGuard` promotes that fragment to a **per-tab**
sessionStorage marker (constants in `src/lib/draftPreview.ts` — import, don't re-hardcode) and
keeps draft mode only in marked tabs; any unmarked tab still auto-disables the draft cookie (the
stale-cookie-leak protection). Consequence: browsing the site in a normal tab clears the cookie
globally, so an open preview tab loses drafts on its next reload — re-open the share link to
re-enable. Requires `SANITY_API_READ_TOKEN` or the write token (`previewToken` in
`src/sanity/env.ts`).

Verify (dev server on :3000): `node scripts/verify-preview-share-links.mjs` (token links:
401-unauth, mint, no-login render of the real page, list, revoke→invalid, expired→invalid) and
`node scripts/verify-preview-share.mjs` (the underlying enable-route: previews in a plain tab, no
leak in a fresh tab). Unit: `npx vitest run tests/preview-share.test.ts`.

## Gated internal plan pages: /marketing-plan, /outreach-plan, /action-plan, /audience-brief

Three unlisted, noindexed internal decks, all gated by ONE `MARKETING_PLAN_KEY` (HMAC session
cookie `goinvo_marketing_plan_session`, 8h, minted by `POST /api/marketing/plan-session` with a
hidden allowlisted `next` field). `/marketing-plan` = strategy deck (public-dataset CMS records);
`/outreach-plan` = warm-network brief (private outreach dataset); **`/action-plan` = the
execution plan (built 2026-08-17)** — the 12-week Sep–Nov 2026 plan rendered from LIVE CMS docs:
timeline with phase progress, month calendar (`?month=YYYY-MM`, clamped), next-two-weeks queue,
decision gates, and live-composed supporting documents (per-segment call scripts from real
openers/offers/evidence, email templates, offer one-pagers).

- **Data model:** plan actions are REAL documents. 16 `marketingOperation` docs in the PRIVATE
  outreach dataset (sourceKey prefix `exec-plan-2026q4/`, deterministic `_id`s, phases
  `phase1|phase2|phase3|gate`) + 13 neutral `marketingCalendarItem` docs in production (`_id`
  prefix `mcal-plan2026q4-`, `idea`/`drafting`, `autoPublish:false` — the publish worker can
  never claim them). Mark work done in Studio (Operations board / Calendar) → the page follows.
- **Seed:** `npx tsx scripts/seed-execution-plan.ts` (dry-run default; `--write --confirm
  seed:exec-plan-2026q4`). `createIfNotExists` ONLY — re-runs are no-ops, Studio edits always
  survive, catalog edits do NOT propagate (birth certificate, not a sync source). Catalog:
  `src/lib/marketing/executionPlanSeed.ts`; pure helpers `src/lib/marketing/executionPlan.ts`;
  tests `tests/execution-plan.test.ts` include a **neutrality guard** (production-bound
  titles/briefs must carry no crisis framing / person names / emails — that dataset is
  world-readable; candid framing lives only on the outreach-dataset operations).
- **/audience-brief (built 2026-08-24)** answers WHO WE ACTUALLY HAVE — the other three are
  written around a warm network the CMS does not contain. Renders live from the private
  dataset: segment mix, the named organisations behind each buyer segment, coverage gaps
  (a segment the plan targets but the list cannot support), offers whose price band has no
  numbers, and the open `needsHuman` decisions. Pure helpers + tests:
  `src/lib/marketing/audienceBrief.ts`, `tests/audience-brief.test.ts`.
  Never write `warmth` or `segment` from a domain — a domain proves where someone works,
  never that they know us. Enrichment: `node scripts/enrich-outreach-contacts.mjs [--apply]`,
  which sets `organization` + `researchSuggestedSegment` ONLY. An unambiguous TLD (.edu/.gov)
  is allowed to correct a stored suggestion — a umd.edu contact was sitting in the
  med-device cluster and inflating the very segment the brief flags as unreachable.
- All four pages now set `robots: { index: false, follow: false }`. They were only *unlisted*
  before (absent from the sitemap), which does not stop a crawler that finds the URL.
- **Gotchas fixed 2026-08-17, don't regress:** the session cookie must be `path: '/'` (it was
  `/marketing-plan`, which made every OTHER gated page loop on its gate forever — covered in
  `tests/marketing-plan-session-route.test.ts`); a new gated route must be added to
  `ALLOWED_DESTINATIONS` in the plan-session route; calendar-style CSS grids need
  `repeat(7, minmax(0,1fr))` (bare `1fr` floors at the widest nowrap chip and scrolls the page
  sideways); GROQ `count(*[...].array[])` counts a NULL per doc missing the array — use
  `math::sum(*[...]{"n": count(coalesce(array, []))}.n)`.

## Lead magnet: Clinical AI Pilot Pre-Mortem (started 2026-08-03)

Pipeline-first strategy (Juhan approved via Slack): lead magnet before homepage
experiments. **The drafts now live in the CMS, not the repo** (moved 2026-08-17; this repo is
PUBLIC, so unpublished drafts must not be committed here). Three `marketingIdea` documents hold
the byte-exact markdown — `marketingIdea.lead-magnet-premortem-article`,
`…-premortem-worksheet`, `…-package-strategy`. `marketingIdea` is anon-hidden (verified: 23 docs
with a token, 0 without), which is what makes it a safe home for an article whose taxonomy
question is still undecided. The open decisions + citation cautions are also
`marketingOperation` docs under `exec-plan-2026q4/phase2/decision-*` in the private outreach
dataset, so they surface on the Operations board and on /action-plan.
Key facts: ungated article + ungated one-page scorecard, email gate ONLY on the
facilitator's kit; public info + published case studies only (the fix methodology
stays paid); the F1–F8 failure taxonomy is INTERNAL-only strategy content today —
publishing it is an open decision (Shirley). Email capture today = third-party
EmailOctopus embeds (`eocampaign1.com`, form id in `src/lib/config.ts`) — blockable,
uninstrumented (zero signup events in GA4 ever); the build plan replaces it with a
first-party `/api/newsletter/subscribe` route (needs `EMAILOCTOPUS_API_KEY`).
Citation cautions: never cite the "KLAS 23%" vendor-blog stat; HIMSS 18% unverified.

## The weekly marketing plan — "This week" (built 2026-08-24)

The suite decides WHAT to do (gap detection + `marketingOperation` board); this decides HOW MUCH
fits in the hours the studio has. **`marketingSettings.weeklyMarketingHours`** (default 4) is the
budget; **`marketingOperation.estimatedMinutes`** is the per-task cost (explicit wins; otherwise
inferred from `kind` in `src/lib/marketing/effort.ts`).

- **Planner:** `src/lib/marketing/weeklyPlan.ts` — pure + unit-tested (`tests/weekly-plan.test.ts`).
  Order: overdue → due this week → undated → future (pulled forward only when hours are spare).
  `survival`/`rebuild` posture promotes outreach. Greedy fill that BACKFILLS (a 3h task never
  starves the week). Decisions always surface but are **capped at 4/week**. Every deferral carries
  a reason; invariant: every operation returns exactly once (item | decision | deferral).
- **Route:** `POST|GET /api/marketing/plan-week` (`?dryRun=1`), `assertStudioWriterOrApiKey`,
  reads the PRIVATE outreach dataset. Idempotent per ISO week via
  `sourceKey: weekly-plan/<YYYY-Www>` — re-planning updates the same doc, never forks the week.
- **AI does NOT budget.** Claude is handed the already-decided plan and only writes the theme +
  rationale; it cannot add/drop/reorder. Missing `ANTHROPIC_API_KEY` = plan still returns, minus
  the narrative.
- **View:** `WeeklyPlanWorkspace.tsx`, first tab of the Home surface. Studio components MUST call
  marketing routes through `authenticatedMarketingRequest` (sends `x-sanity-session`) — a bare
  `fetch` is silently 401'd.
- Two lessons pinned by tests: excluding future-dated work **emptied the week** (the seeded
  quarter is Sep–Nov), and 13 open decisions ate 205 of 240 minutes.

## Runway — the number the whole strategy is derived from (built 2026-08-27)

The financial posture used to be a hand-picked bin (`survival`) with a timestamp. A bin does
not decay: it was set 2026-07-11 and would still have read "survival" in 2027. So the stored
fact is now a DATE — the last day the studio is confident it can pay for — and the bin is
COMPUTED from it. Recorded 2026-08-27: **4.5 months, `certainUntil: 2027-01-11` → Rebuild**
(it was reading Survival).

- **Pure core:** `src/lib/marketing/runway.ts` — `monthsOfRunway`, `postureForRunwayMonths`
  (bounds come from `maxMonths` on the bins in `financialPosture.ts`, one source),
  `resolveRunwayPosture`, `runwayCheckIn`, `applyCommitment`, `describeRunway`. Tests:
  `tests/runway.test.ts`.
- **Recency decides.** A hand-set bin newer than the runway confirmation WINS (someone knows
  something the date does not); a runway confirmed later wins instead. They never silently
  disagree — `resolved.disagreement` says which was used and why, and the digest shows it.
- **Signed work EXTENDS, never replaces.** 3 months signed in August against a runway already
  reaching January means April, not November — `applyCommitment`, tested. If the runway has
  already run out it extends from today instead (signed money cannot buy back spent months).
- **Storage:** `runway` object on the `marketingFinancialPosture` doc in the PRIVATE outreach
  dataset. Server helpers `runway.server.ts`; every write stamps `confirmedAt`, which is the
  entire mechanism behind the check-in.
- **Inputs:** `npx tsx scripts/set-runway.ts [--months 4.5|--until DATE|--confirm|--signed "X" --months 3]`
  (no args = read); `GET|POST /api/marketing/runway` (`confirm`/`set`/`signed`); and in Slack
  the digest's **Runway** card — *Still right* / *We signed something* / *It has changed*.
- **Consumers wired:** `plan-week` and `assist` now resolve through the runway instead of
  reading `.posture` raw, so the plan tightens on its own as the money runs down.

### GOTCHA that cost a real leak: an unlisted type writes to the PUBLIC dataset
`getMarketingWriteClientFor(type)` → `clientForType` **passes any type not in
`INTERNAL_MARKETING_TYPES` straight through to the public dataset and reports success.**
`marketingTeamAvailability` and `marketingFinancialPosture` were both missing. Consequence:
pressing "I'm away" in Slack wrote to **production** while the digest read **outreach** — the
change silently did nothing — and it put a colleague's name + Slack id in the world-readable
dataset (one real record, found and removed 2026-08-27). Both types are now listed, with
guards in `tests/dataset-routing.test.ts` including one asserting availability routes to the
same dataset the digest reads. **When adding any `marketing*` type, add it to the router in
the same commit.**

## Marketing CMS (the "marketing tool")

- Custom Sanity Studio tool: `src/sanity/tools/marketingTool.tsx`, at `/studio` → **Marketing**.
- The content **calendar** = `marketingCalendarItem` documents, placed on the grid by their
  `publishAt`. Schema: `src/sanity/schemas/marketingCalendarItem.ts` (status =
  idea/drafting/review/scheduled/published/canceled; `contentType`; `channel` + `channelRef`;
  `brief`; `contentDraft`; `draftFrames`; funnel/audience/pillar/proof/cta references).
- Already seeded in the **production** dataset: 7 channels, 5 audience profiles, 7 message
  pillars, 12 proof points, 3 CTAs, and a June 2026 demo month (`_id` prefix
  `mcal-june2026-*`, `utmCampaign june2026-*` — easy to find/bulk-remove).
- Content creation currently goes through the Sanity write client (`createDocument`/`patch`),
  same as the Studio forms. **REST endpoints under `/api/marketing/` that mirror the UI's
  writes (for testability) are in progress** — see the audit/endpoint work.

### GA4 Measurement Protocol forward for A/B events (recovers blocker loss)

The homepage A/B experiment events reach GA4 even when the client GA tag is blocked.
The first-party beacon already delivers ~100% of experiment events server-side to
`/api/marketing/analytics/collect`; GA4's client gtag only delivers ~5% (ad/tracking
blockers). The `/collect` route re-sends each **event** to GA4 via the **Measurement
Protocol** to recover the rest.

- Lib: `src/lib/marketing/ga4MeasurementProtocol.ts` —
  `sendGa4MpEvents(clientId, events)` POSTs `{ client_id, events }` to
  `https://www.google-analytics.com/mp/collect?measurement_id=<id>&api_secret=<secret>`.
  Reads `GA4_MP_API_SECRET` + `GA4_MEASUREMENT_ID` (default `G-P00K4KL2Y9`). **INERT
  until `GA4_MP_API_SECRET` is set** (returns false, forwards nothing — no errors).
  Best-effort: short timeout, swallows errors, never throws. Injects
  `engagement_time_msec: 1` per event so hits land as engaged sessions.
- **No double-count:** in `src/lib/analytics.ts`, `trackEvent` skips `window.gtag('event', …)`
  when `experimentContext` is set (those go to GA4 via MP only). Non-experiment events still
  use gtag (GA's normal role); the `gtag('set','user_properties', …)` call is kept.
- **client_id:** the client adds `ga_client_id` to BOTH experiment beacons (event +
  engagement). It is derived from the `_ga` cookie (`GA1.<n>.<clientId>` → last two
  dot-segments), falling back to the `goinvo_marketing_visitor_id` cookie when `_ga` is
  absent (blocked visitors). A `ga_session_id` from `_ga_<container>` is added when readily
  available. Only the engagement beacon is **not** forwarded to GA4 (stays first-party).
- **Env:** `GA4_MP_API_SECRET` (GA4 Admin → Data streams → web stream → Measurement Protocol
  API secrets) and optional `GA4_MEASUREMENT_ID`. Set in `.env.local` and on Vercel; the
  feature is inert until the secret exists. Privacy: only experiment dimensions + the GA
  client_id the visitor's own GA cookie already holds — no new identifiers.

## Key checks & scripts

- `npm run check:charts` — chart-label alignment (catches dead-CSS / label-drift regressions).
- `node scripts/page-visual-audit.mjs <url> <out.png>` — HTTP status, overflow, broken images, screenshot.
- `.audit/legacy-features/<slug>-legacy.png` — Gatsby reference screenshots for migration fidelity.
- `node scripts/studio-screenshot.mjs ...` — authenticated Studio screenshots (above).
- `node scripts/check-cms-links.mjs [--fix] [--external]` — every link stored in Sanity;
  relative hrefs (`../x/`) are always a latent 404 because they resolve against page depth.
- `node scripts/check-shop-button-fit.mjs --base <url>` — storefront controls whose text
  outgrows its box. Page-level overflow checks miss this: the document doesn't scroll
  sideways, a single grid cell just spills past its edge.
- `node scripts/check-disrupt-heroes.mjs --base <url>` — proves the Disrupt heroes actually
  paint by reading back rendered pixels. `naturalWidth > 0` passed the whole time they were
  invisible white voids.
- `node scripts/recover-old-assets.mjs --list <file> --apply` — pull missing legacy assets
  from the public 2018 S3 bucket (see the top of this file).
- `python scripts/compress-poster-pdfs.py --src <dir> --out public/pdf/vision/posters` —
  flatten oversized poster PDFs; rejects any rebuild that drifts from the original per pixel.

- `node scripts/check-list-markers.mjs --base <url>` — every sitemap route, for list items
  painting TWO markers or none. Distinguishes a deliberate `list-style: none` from Tailwind
  preflight's by looking for an author rule that NAMES the list.
- `node scripts/scope-page-css.mjs --file <css> --scope <class> --write` — confine a ported
  legacy stylesheet to its page. Refuses to write if the rule count changes.
- `npx vitest run tests/page-css-scoping.test.ts` — fails if any page stylesheet uses a
  selector that doesn't start with a class/id.

**When fixing a rendering/layout bug, run the detector against PRODUCTION first.** A checker
that doesn't fail on the broken site isn't evidence of anything. Both checkers above earned
their keep that way — and both produced large batches of FALSE positives first (a DOM
ancestor-walk for contrast; counting deliberate `overflow: hidden` crops), so confirm a
failure visually before treating it as real.

## Ported CSS: globals.css vs the 22 per-page stylesheets

The Gatsby port copied each page's stylesheet verbatim into `src/app/**/<page>.css` AND
re-implemented Gatsby's GLOBAL layer as `globals.css`. Where a copied page file kept a chunk
of Gatsby's *global* rules, one visual is implemented twice — and because the two use
different MECHANISMS they STACK rather than override. Scoping the page rule does not help.
Three cascade facts make these invisible; check them before diagnosing anything CSS-shaped:

1. **`list-style-type: none` does NOT suppress a `list-style-image`** — the type is only a
   fallback for when the image fails to load. (This drew every Determinants bullet twice.)
2. **A page stylesheet is GLOBAL and is never unloaded.** It is merely *imported* by one
   route; after client-side navigation it keeps applying. A bare `body {}` / `header {}`
   selector in a page file restyles the WHOLE SITE for the rest of the session — zika.css
   left every page dark, careplans.css kept overriding the site header. Reach outside the
   page only via `body:has(.page-wrapper)`, which releases when the wrapper unmounts.
3. **globals.css sits in `@layer utilities`; page CSS is UNLAYERED.** Unlayered *normal*
   declarations BEAT layered ones, so page CSS silently overrides globals. But for
   `!important` the cascade REVERSES layer order — an unlayered `!important` LOSES to a
   layered one. A page therefore cannot override an `!important` in globals at all; that fix
   must go in globals.

Also: `view-transition-name` must be unique per document — a duplicate ABORTS the transition
(a bare `header {}` rule disabled view transitions on 9 pages), and `.gatsby-article ul
{ padding-left: 2em }` in globals outranks globals' own `.ul { padding-left: 0 }`, so a page
deleting its own `.ul` padding gets bullets 32px out of place.

## Critical lessons

- **Verify visual fixes on PROD (goinvo.com), not just the local dev server.** The dev server
  carries uncommitted code, so a fix split across a page *and* a shared renderer can look fixed
  locally while only half-shipping to prod (this bit own-your-health-data's peach poster frame).
- **Deploy:** prod = `main` (push → Vercel auto-deploys). Feature work lives on
  `codex/marketing-cms` and reaches prod by merging to `main`.
- The Gatsby→Next port shipped "dead-CSS" regressions (generic markup not mounting a page's own
  ported CSS); compare against the Gatsby legacy refs, not just structural DOM checks.

## Marqueta in Slack: weekly digest + task delegation (built 2026-08-26)

Posts the week's marketing work to **#marketing-bot** (`C0BSFACJY6T`) with a button per task, so
the plan is delegated rather than announced. Extends the EXISTING Slack app (the one behind the
website chat widget) — same bot token, same signing secret, same
`/api/slack/interactions` route, which already verifies signatures and dispatches on `action_id`.

- **Post it:** `POST /api/marketing/slack/digest` (`?dryRun=1` returns the exact blocks without
  posting). Auth: `assertStudioWriterOrApiKey`. **Fail-closed** — no token/channel, nothing posts.
- **Channel:** `SLACK_MARKETING_CHANNEL_ID`, separate from `SLACK_CHANNEL_ID` (the website-chat
  channel) so a weekly plan never lands in the middle of live visitor conversations.
- **Buttons:** "I'll take it" sets the owner; "Not me this week" CLEARS it and marks the task
  `needsHuman` — deliberately NOT reassigning to someone else, because picking a colleague
  without asking is how a plan loses the team's trust. "I'm away this week" writes a
  `marketingTeamAvailability` record and the next digest surfaces that person's work with the
  names of whoever is actually free.
- **Identity:** owners are names ("Juhan"); Slack has user IDs. The digest appends a one-time
  consent prompt (a select of unmapped owners) that stores the presser's Slack ID against the
  name they choose. It states what it stores, and removes itself once everyone is mapped.
- **Core:** `src/lib/marketing/availability.ts` (pure date logic — both bounds INCLUSIVE, because
  "away 1st–5th" must mean away ON the 5th), `slackDelegation.ts` (Block Kit + action encoding),
  `slackActions.server.ts` (the writes; all safe to run twice, since Slack retries).

**TWO MANUAL SLACK STEPS — the code cannot do these itself:**
1. **Invite the bot to the channel.** In #marketing-bot: `/invite @goinvo_website_chat`.
   Without it every post fails `not_in_channel`. The bot cannot self-join (needs `channels:join`)
   and cannot self-invite (`conversations.invite` requires already being in the channel).
2. **Add the `chat:write.customize` scope and reinstall** for the digest to appear as
   **Marqueta**. Granted scopes today are `chat:write, channels:history, users:read,
   channels:manage, files:write`; without `chat:write.customize` Slack silently IGNORES the
   `username`/`icon_emoji` fields and posts under the app name. Identity is set per message on
   purpose — renaming the app itself would rename it for the website chat too.

## Outreach research: identity from registries, claims from Claude, then verified

Three stages, in this order, because each answers a different KIND of question. Getting them
mixed up is what produced "Carolinashealthcare" as an organisation name and twenty claims that
failed verification.

1. **Identity is a LOOKUP, not a judgement.** `node scripts/resolve-outreach-organizations.mjs
   [--apply]` resolves a domain to an official name via **Clearbit autocomplete** and a sector
   via **Wikidata** — both keyless and free. Never ask a model to recall a company's name.
   - Clearbit returns FUZZY matches: querying `partners.org` returns "Charleys Philly Steaks".
     Only accept a hit whose domain is EXACTLY the one queried.
   - Wikidata's top hit for "MITRE" is the surname ("family name"). Reject descriptions that
     prove the match is not an organisation.
   - Sector needles must name health explicitly. "software company" made Salesforce healthtech;
     "clinic" matched inside "clinical trial". A generic word is worse than no answer.
   - SEC EDGAR also works keyless (10,403 US filers) if tickers/SIC codes are ever wanted.

2. **What they are reachable about is live, and genuinely needs a model.**
   `npx tsx scripts/research-organizations.ts [--apply] [--limit N] [--concurrency N]
   [--segment X] [--refresh]` runs Claude with the built-in `web_search` tool. One record per
   ORGANISATION (`marketingOrgResearch`, data-API managed like `previewShareLink`), not per
   contact — nine people at one hospital share one answer.
   - **NO thinking alongside web_search** — that combination 500s server-side.
   - Records written before the quote requirement (no `quote` field) are re-researched
     automatically; `--refresh` redoes everything.

3. **A claim is publishable because its evidence is inspectable, not because a model agreed.**
   `npx tsx scripts/verify-org-research.ts [--apply] [--refresh]`, adapted from
   `plig-framework/scripts/verify-quotes.ts` + `verify-claims.ts` and the evidence-pipeline
   plan in `bioinfo-workspace/biopharma-stewardship-discovery`. Two stages that must not be
   collapsed: **deterministic** (the quoted span must literally occur in the fetched page —
   plain containment, no fuzzy matching) then **advisory** (does the quote support the claim).
   A model asked to confirm a quote it just produced will confirm it.

**Verification costs NOTHING now — do not reintroduce per-claim API calls.** The research
prompt makes the model return the exact passage it relied on plus its URL, so checking it is a
fetch and a string comparison:
- `npx tsx scripts/check-org-quotes.ts --render --only-absent --apply --out <file>` proves the
  quote is literally in the cited page. No model.
- `npx tsx scripts/judge-org-claims.ts <file> --apply` checks the claim asserts nothing the
  quote lacks (`findUncitedSpecifics`). No model. It names the offending token, so the verdict
  is auditable.
- `npx tsx scripts/diagnose-unfetchable.ts` classifies a failure as bot-wall / paywall / thin /
  no-match. Those need completely different responses and "the fetcher is bad" hides all four.
- `src/lib/marketing/textProvider.ts` picks `none | ollama | anthropic`, defaulting to **none**
  so no script can spend by accident.

**The fetcher: Puppeteer IS client-side rendering.** A VM or heavier browser runs the same
engine, so if a quote is missing the cause is something else. Three self-inflicted bugs cost
real time, all of which silently discarded a good render:
- Accepting a render only when it was LONGER than the fetched text. `innerText` is usually
  SHORTER than crude tag-stripping (which keeps nav), so every success was thrown away. Judge
  by whether it CONTAINS the quote; length is only a tie-break.
- Aborting image/font requests to save bandwidth — sites hang intersection observers off
  exactly those loads, so article bodies never attach. Do not intercept.
- Scrolling in steps and back to the top, which re-virtualises long lists and unloads the text.
  **One scroll to `scrollHeight`, settle ~1.4s, and STAY at the bottom.** Measured against a
  no-scroll baseline and a progressive scroll (`scripts/compare-scroll-strategies.ts`):
  progressive reads ~3% more text and recovered nothing extra, so simple wins. Re-measure
  before adding complexity — an elaborate scroll lost to the naive one twice.

**Hard-won rules, all of which cost a wrong answer to learn:**
- The prompt forbids any date, number, name or superlative that is not in the quote. Under the
  earlier prompt **0 of 20 claims verified** — not fabrications, but over-specified: true in
  substance while asserting more than the page states. Unprovable richness goes to `context`,
  shown on the page collapsed and labelled "not verified, do not repeat as fact".
- **`unchecked` is never a pass.** When fewer than half the cited pages could be fetched
  (paywalls and bot-blocks are the norm — 17 in one run), the status is `unchecked`, not
  `unsupported`. Reporting a fetch failure as a failed claim blames the research for the network.
- Attaching one claim to a BAG of sources is the "broadening a citation to every quote from a
  source" anti-pattern; verification binds a claim to the sources whose text supports it.
- Judge a claim against ALL its verified quotes. Judging a multi-source claim against one of
  them manufactures false "overreach".

Surfaced on **/audience-brief** as "Openings we could make this week": the verified quote leads
with a `#:~:text=` deep link, the fuller claim is demoted to "Unverified", and verified
openings sort first. Pure helpers + tests: `src/lib/marketing/orgResearch.ts`,
`src/lib/marketing/sourceVerification.ts`, `tests/org-research.test.ts`,
`tests/source-verification.test.ts`.

## Marketing dataset split — internal records out of the public dataset (in progress 2026-08-24)

Sanity's public-dataset grant is `_id in path("*")`, which matches every id **without a dot** —
so today's "privacy" is an accident of id naming, not a rule. 75 internal marketing documents
(calendar, research, ideas, experiments…) are readable by anyone who knows the project id.
Full plan: [`docs/dataset-split-migration-plan.md`](docs/dataset-split-migration-plan.md).

- **The rule lives in ONE place:** `src/lib/marketing/datasetRouting.ts` —
  `INTERNAL_MARKETING_TYPES` / `datasetForType(type, publicDataset)` /
  `clientForType(base, type)`. Server code uses `getMarketingWriteClientFor(type)`
  (`src/lib/marketing/client.ts`); Studio components use `clientForType(useClient(...), type)`.
  **Never** hand a bare workspace client to a marketing read/write — it writes to whatever
  dataset the workspace happens to be on and reports success.
- **Escape hatch:** `NEXT_PUBLIC_MARKETING_INTERNAL_DATASET` set back to the public dataset
  reverts the whole split in ~a minute, no git operation.
- **`clientForType` only re-scopes INTERNAL types** — public types pass through on the
  caller's client. Anything that must read one specific dataset regardless of caller has to
  pin it explicitly with `withConfig({ dataset: datasetForType(type, PUBLIC_DATASET) })`
  (this is what `resolveMarketingModel` does for the `marketingSettings` singleton).
- **Health probe — run before AND after every step:** `node scripts/check-dataset-split.mjs`
  (needs a server + `MARKETING_API_KEY`) wraps `/api/marketing/health/dataset`. Per type it
  reports configured dataset, count there, count in the other, and **anonymouslyReadable**.
  Every failure mode here is silent — a repointed query that misses returns `[]`, not an
  error — so this number is the only real evidence. **Baseline: 75.** The watch list is
  derived from `INTERNAL_MARKETING_TYPES`, so a type the router protects cannot escape the
  probe; it read 73 until `marketingLeadMagnet` was found missing from BOTH source lists.
- **Data move:** `node scripts/split-marketing-dataset.mjs --wave 1 --copy|--verify|--delete`
  (dry-run by default). Copy writes the whole wave in **ONE transaction** — Sanity validates
  strong references at end-of-transaction, so batching breaks any reference whose target
  lands in a later batch. References pointing *outside* the wave are weakened in transit
  (weakening a schema field only governs new writes; stored documents keep their strong refs).
- **State: CUT OVER 2026-08-24 (Steps 1–7 done).** The 24 Wave-1 types are in
  `INTERNAL_MARKETING_TYPES`, so all reads/writes for them now resolve to `outreach`
  (probe: `internalTypes=31`). The documents ALSO still exist in production, so the window
  stays reversible — and **the leak is NOT closed yet**: the probe correctly reports 12 types
  as `LEAKING` and `anonymouslyReadable` is still **75**. **Step 8 (delete from production
  after a soak) is what closes it.** Waves 2/3 = `previewShareLink`, `cmsFeedback`.
- **Cutover gotchas, all silent:** a mock/client without `withConfig` now throws inside
  `clientForType` for any internal type (the assist tests hit this — fix the mock, do NOT
  make the router fall back to the base client, which would quietly read the public copy);
  `assertSplitIsReal` only bites once the type list grows, so its "internal === public"
  test flips from not-throwing to throwing at cutover; and `tests/dataset-routing.test.ts`
  pins the router against `WAVE_1` in the mover script so the two cannot drift (a drift
  reads from a dataset the documents were never copied to and returns `[]`, not an error).

## Marketing suite architecture — portable + testable (decided 2026-06)

Goal: decompose the `marketingTool.tsx` monolith, expose every CMS write as a testable HTTP
endpoint, and keep the suite **portable** (extractable to other Sanity sites). The tool's
write/derive logic moves into a shared core that both the Studio tool AND the REST API import
(single source of truth — no drift).

- **Portable core: `src/lib/marketing/`** (site-agnostic; config via env, no hardcoding):
  `derive` (slugify, randomKey, refs, slug/UTM/date derivations, inferences),
  `defaults` (per-type `initialValue` + array-item `_type` maps + required-field map for the
  ~20 managed `marketingXxx` types), `crud` (buildCreatePayload / buildPatch + channel-delete
  cascade + ensureMarketingChannel), `cascades` (create-linked-drafts + clones),
  `client` (write client from `@/sanity/env`), `auth` (MARKETING_API_KEY).
- **REST API: `/api/marketing/doc/[type]`** — POST create / PATCH / DELETE / GET for every
  managed type, applying the SAME server-side defaults/derivations the Studio applies; plus
  special-flow endpoints (cascade, AI-persist, seed, clone). **All gated by `MARKETING_API_KEY`**
  (`Authorization: Bearer <key>` or `x-marketing-api-key`); **fail-closed** if the key is unset.
  This is how to test + headlessly drive marketing writes without the Studio UI.
- **Tool rewire:** `marketingTool.tsx` imports the core (drops its inline
  slugify/randomKey/defaults/cascades) → smaller, no duplicated logic.
- **Auth gap closed:** ai-citation, citation-check, research/run (write routes that had
  no request auth) move behind `MARKETING_API_KEY`. (The `ga4-ab` route, once part of this
  set, was later retired/removed — per-variant engagement is now first-party.)
- **Env:** set `MARKETING_API_KEY` in `.env.local` and on Vercel.

## Social auto-publishing — scheduled posts to LinkedIn + Instagram (built 2026-06)

Posts the marketing **calendar** to social channels at their scheduled time. Built as a portable
extension of the core, **fail-closed**: with no platform credentials nothing is ever posted.

- **How an item publishes:** set `autoPublish: true` on a `marketingCalendarItem`, give it
  `status: "scheduled"`, a `publishAt`, and a `channelRef`/`channel` of `linkedin` or `instagram`.
  At that exact time the publish worker (`/api/marketing/publish/run`) claims it with an
  **optimistic revision lock** (no double-posts across overlapping runs), publishes via the
  platform adapter, and writes back `status: published` + `externalPostId` + `publishedUrl`, or
  `publishState: failed` + `publishError`.
- **Trigger = Upstash QStash (exact-time, no cron).** When an item is scheduled,
  `POST /api/marketing/publish/schedule` enqueues a one-shot QStash callback for its exact
  `publishAt` (QStash `Upstash-Not-Before`). QStash POSTs `/publish/run?id=<doc>&onlyIfDue=1` at
  that time, **forwarding our `MARKETING_API_KEY`** as the bearer (`Upstash-Forward-Authorization`)
  so the callback authenticates with the normal API auth — no JWT verification. `onlyIfDue`
  re-checks the item is still due, so a stale/rescheduled message is a safe no-op. (There is NO
  Vercel publish cron — QStash replaced it, avoiding the Pro per-15-min cron limit.)
- **Worker state** lives in new calendar fields (group "Publishing"): `autoPublish`,
  `publishState` (queued/publishing/published/failed/skipped, worker-owned), `externalPostId`,
  `publishAttemptedAt`, `publishError`, `publishLockAt` (hidden). Media: `socialImage` (single
  post / carousel cover) + per-`draftFrame` `image` (carousel slides). Instagram **requires** an
  image — text-only IG posts are rejected.
- **Core:** `src/lib/marketing/publishers/` — `types` (SocialPublisher interface), `content`
  (pure `buildPublishContent` + GROQ `DUE_ITEMS_QUERY` + claim/published/failed patch builders,
  all unit-tested), `linkedin` (Posts API + Images upload: text / single-image / link share),
  `instagram` (Graph container→publish: single image + carousel, **plus Reels/video**), `index`
  (registry + `connectionStatus`). **Reels/video are async:** publishing a `reel`/`video` item
  (with a `socialVideo` asset) creates a REELS container, then a single status check publishes it
  if FINISHED or returns `pending` (still processing). On pending the worker sets
  `publishState: processing` + `externalContainerId` and the `/run` route enqueues a QStash
  **finalize** re-check (`/run?id=&finalize=1` → `publisher.finalize(containerId)`), bounded to
  ~15 checks × 90s (override via `INSTAGRAM_REEL_MAX_CHECKS` / `INSTAGRAM_REEL_CHECK_DELAY_SEC`).
  No serverless function blocks waiting on the render. The finalize path takes its own revision
  lock (QStash is at-least-once, so a duplicate delivery can't double-publish). **Backstop:** a
  batch `/run` (no `id`) also sweeps **stale `processing` items** (not re-checked in ~3 cycles) and
  re-finalizes them — so a lost QStash callback or a failed write-back still recovers if you run a
  periodic `/run` (e.g. a daily Vercel cron).
- **Endpoints** (under `/api/marketing/publish/`): `POST /schedule` (enqueue a QStash callback for
  one item, or publish-now if already due; `?dryRun=1` previews; accepts `?id=`/`body.id`/webhook
  `_id`); `GET|POST /run` (the worker; cron-secret OR `MARKETING_API_KEY` auth; `?dryRun=1`,
  `?id=<docId>`, `?onlyIfDue=1`); `GET /status` (per-platform connection + due count). Worker/
  scheduling logic lives in the core (`publishers/worker.ts`, `publishers/schedule.ts`) so the
  routes stay thin.
- **Studio "not connected" indicator:** `components/marketing/PublishConnectionStatus.tsx` is a
  banner shown on the **Calendar** (above the grid) and **Channels** (full-width) tabs. It reads
  `/status` as the logged-in Studio user (the route uses `assertStudioOrApiKey`, so a Studio
  `x-sanity-session` token OR `MARKETING_API_KEY` works) and shows amber "LinkedIn/Instagram · Not
  connected" pills until credentials are set — so it's obvious that scheduled posts won't actually
  post yet. `/status` only ever returns platform names + missing-var NAMES + a due count (no secrets).
- **Connect a platform (only these unlock live posting — same "set the secret" gate as the rest):**
  - LinkedIn: `LINKEDIN_ACCESS_TOKEN` (w_organization_social), `LINKEDIN_AUTHOR_URN`
    (`urn:li:organization:<id>`), optional `LINKEDIN_API_VERSION` (YYYYMM). Needs the
    **Community Management API** product approved + an org admin.
  - Instagram: `INSTAGRAM_ACCESS_TOKEN` (instagram_content_publish), `INSTAGRAM_BUSINESS_ACCOUNT_ID`,
    optional `INSTAGRAM_GRAPH_VERSION`/`INSTAGRAM_GRAPH_HOST`. Needs an IG **Business/Creator**
    account + linked FB Page + Meta App Review.
- **Wire the trigger (QStash + Sanity webhook):**
  - Set `QSTASH_TOKEN` (Upstash console → QStash) and optional `MARKETING_PUBLIC_BASE_URL` (the
    absolute prod URL QStash calls back; otherwise the request origin is used) in `.env.local` + Vercel.
  - Add a **Sanity webhook** (manage.sanity.io → API → Webhooks) on `marketingCalendarItem`
    create/update → `POST https://www.goinvo.com/api/marketing/publish/schedule` with header
    `Authorization: Bearer <MARKETING_API_KEY>`. The webhook posts the doc `_id`; the endpoint
    enqueues/reschedules QStash for its `publishAt`. (Or call `/schedule` from a Studio action.)
  - Optional backstop: a daily Vercel cron (Hobby-safe) on `/publish/run` to sweep any item whose
    QStash enqueue was missed.
- **Verify locally** (dev server on :3000 + `MARKETING_API_KEY` in `.env.local`):
  `curl -X POST -H "Authorization: Bearer $KEY" "localhost:3000/api/marketing/publish/schedule?dryRun=1&id=<doc>"`
  and `curl -H "Authorization: Bearer $KEY" "localhost:3000/api/marketing/publish/run?dryRun=1"`.

## Rendomat → Instagram ingest (auto-post rendered videos as Reels, built 2026-06)

Pulls completed renders from **Rendomat** (the `vsl-generator` project at
`C:\Users\quest\Programming\vsl-generator`) and turns them into scheduled, auto-publishing
Instagram **Reels**. Rendomat is export-only (it renders; our calendar owns scheduling + tokens),
which matches the publishing suite exactly.

- **Flow:** `POST /api/marketing/rendomat/ingest` lists completed Rendomat videos with a `publish_at`
  in a look-ahead window, **dedupes by `rendomatVideoId`**, pulls each export manifest, downloads
  the MP4 (with the `rmk_` key) and **re-uploads it to Sanity** (stable public URL Instagram can
  fetch), creates a `marketingCalendarItem` (`contentType: reel`, `autoPublish`, `status: scheduled`,
  `socialVideo` asset, caption→`contentDraft`, alt→`draftAltText`, `publish_at`→`publishAt`), and
  enqueues the exact-time QStash publish. From there the normal publish worker posts the Reel.
- **Core:** `src/lib/marketing/rendomat.ts` — `isRendomatConfigured`, `listCompletedVideos`,
  `getRendomatExport`, `downloadRendomatAsset`, `resolveRendomatUrl` (relative `/api/files/…` →
  absolute), `buildCalendarItemFields` (pure, unit-tested). Route:
  `src/app/api/marketing/rendomat/ingest/route.ts` (cron-secret OR `MARKETING_API_KEY`; `?dryRun=1`,
  `?days=N`, `?limit=N`). Fail-closed: nothing ingests unless `RENDOMAT_API_BASE` + `RENDOMAT_API_KEY`
  are set (503 otherwise).
- **Connect Rendomat:** `RENDOMAT_API_BASE` (the Rendomat app URL) + `RENDOMAT_API_KEY` (an `rmk_…`
  key with `read` scope, from Rendomat **Account → API keys**). The external API only exposes the
  rendered **video** (no per-slide images), so Instagram posts are **Reels**, not image carousels.
- **Trigger:** call `/ingest` from a QStash schedule or a Vercel cron (or Rendomat's planned
  `export.ready` webhook). Verify: `curl -X POST -H "Authorization: Bearer $KEY" "localhost:3000/api/marketing/rendomat/ingest?dryRun=1"`.
- **Storage note:** each ingested render is **re-hosted to Sanity** (a public `cdn.sanity.io` file
  URL) so Instagram can fetch it independently of Rendomat uptime — it counts against Sanity asset
  storage/bandwidth, and the asset stays public (these are marketing videos bound for a public IG
  post anyway). Downloads are timeout-bounded (25s) to stay within the serverless limit. If a
  render's `publish_at` is past, schedulePublish enqueues it for immediate posting; if QStash is
  unset the item is still created (status scheduled) and a periodic `/publish/run` sweep posts it.

## Posting-time research — "best time to post" per channel (built 2026-06, runs on Claude)

Researches the best posting times for each content source (channel) via **live web research**
and stores them on the channel so they can default a calendar item's `publishAt`.

- **Engine = Claude `web_search`, NOT OpenAI.** `src/lib/marketing/postingTimeResearch.ts`:
  `buildPostingTimePlan(channel)` derives a research plan (platform/contentTypes/audience/goal +
  the ET→PT timezone logic); `researchChannelPostingTimes` consumes it by calling Claude
  (**`claude-sonnet-4-6`** by default — see the model setting below) **with the built-in `web_search`
  server tool** via `@anthropic-ai/sdk` (searches the live web, returns a structured recommendation +
  cited sources — streamed, **NO `thinking`**: thinking + web_search 500s server-side, web_search alone
  is reliable; no temperature/top_p); `applyPostingTimeResearch` persists it;
  `nextRecommendedPublishAt(slots, from, contentType?)` is the DST-aware next-slot helper for
  defaulting `publishAt`. **Gated by `ANTHROPIC_API_KEY`** (fail-closed). **Why Claude not OpenAI:**
  the OpenAI account is **`insufficient_quota`** (no billing), so **all marketing AI now runs on
  Claude** — the `assist`/strategist, `citation-check`, and `ai-citation` (web_search visibility
  panel) routes were moved to the shared helper `src/lib/marketing/anthropicJson.ts`
  (`generateClaudeText` + `parseJsonObject`); the OpenAI env vars (`OPENAI_API_KEY`,
  `MARKETING_AI_MODEL`, `MARKETING_STRATEGIST_AI_MODEL`) are no longer used.
- **Schema:** `marketingChannel` has `recommendedPostingTimes` (slot array: dayOfWeek/time/timezone/
  label/contentType/rationale/confidence) + `postingTimesResearch` (summary/timezoneLogic/avoid/
  model/sources) — both readOnly.
- **API:** `POST /api/marketing/research/posting-times` — body/query `channelId` or `all=1`,
  `dryRun=1` (returns the plan, no LLM call), optional `audience`/`goal`/`model`. Studio or
  `MARKETING_API_KEY` auth; `maxDuration=300` (live research is ~60–135s/channel, batched concurrently).
- **Model setting (two ways to change it):** the whole suite (assist, citation-check, ai-citation,
  posting-time) resolves its model via **`resolveMarketingModel(client)`** in `anthropicJson.ts` —
  precedence **explicit override > in-Studio picker > `MARKETING_CLAUDE_MODEL` env > Opus default**.
  (1) **In-Studio picker** on the Dashboard (`MarketingAiModelSetting.tsx` → `marketingSettings`
  singleton, field `aiModel`) lets designers switch with no env var. (2) **`MARKETING_CLAUDE_MODEL`**
  env is the deploy-level fallback. Default **`claude-opus-4-8`** (best quality: sharper strategic
  judgment head-to-head; also the FASTEST for these output-heavy gens — ~8s Opus vs ~16s Sonnet for
  an 1800-tok suggestion; cost ~cents/call → a few $/month). Options: `claude-sonnet-4-6` (~3× cheaper,
  ~equal quality), `claude-haiku-4-5` (cheapest, rougher). `MARKETING_RESEARCH_AI_MODEL` overrides
  just research; `MARKETING_RESEARCH_TIMEOUT_MS` the timeout. (`marketingClaudeModel()` = the sync
  env-only fallback used when no client is available.) Also set `ANTHROPIC_API_KEY` in `.env.local`
  **and on Vercel**.
- **UI (done):** a **"Research posting times" / "Re-research" button** + recommended-times panel on
  the Channels tab (`ChannelWorkspace.tsx`), and a **"Use recommended day"** button on the calendar
  item's publish-date field (`CalendarWorkspace.tsx`) that defaults from the channel's times
  (day-granular — the calendar stores noon-anchored dates). The scheduler is SDK-free in
  `src/lib/marketing/postingTimeSchedule.ts` so the Studio client doesn't bundle the Anthropic SDK.
- **Verified** live: all 7 channels researched + stored (Instagram → Wed 12:00 ET carousel), Channels
  panel render screenshot-verified, calendar button shows the next recommended day.
