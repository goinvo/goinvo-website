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
> Do NOT chase S3 creds (`www.goinvo.com-2018` is redirect-only) or CloudFront — the public repo
> is the source. Caveat: scripts hard-code `/old/images/...`; this site serves `/images/...`
> (redirect list `redirects.json` routes specific legacy URLs, e.g. PDFs, to `/old/` — place
> those at `public/old/...`).

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

## Critical lessons

- **Verify visual fixes on PROD (goinvo.com), not just the local dev server.** The dev server
  carries uncommitted code, so a fix split across a page *and* a shared renderer can look fixed
  locally while only half-shipping to prod (this bit own-your-health-data's peach poster frame).
- **Deploy:** prod = `main` (push → Vercel auto-deploys). Feature work lives on
  `codex/marketing-cms` and reaches prod by merging to `main`.
- The Gatsby→Next port shipped "dead-CSS" regressions (generic markup not mounting a page's own
  ported CSS); compare against the Gatsby legacy refs, not just structural DOM checks.

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
- **Env / model setting:** set `ANTHROPIC_API_KEY` in `.env.local` **and on Vercel**.
  **`MARKETING_CLAUDE_MODEL` is the one model setting for the whole marketing suite** (assist,
  citation-check, ai-citation, posting-time — all route through `marketingClaudeModel()` in
  `anthropicJson.ts`) — default **`claude-opus-4-8`** (best quality: sharper strategic judgment in a
  head-to-head; also the FASTEST for these output-heavy generations — ~8s Opus vs ~16s Sonnet for an
  1800-tok suggestion; cost ~cents/call → a few $/month at this volume). Set it to
  `claude-sonnet-4-6` (~3x cheaper, ~equal quality) or `claude-haiku-4-5` (cheapest, rougher) to
  change it suite-wide. Optional `MARKETING_RESEARCH_AI_MODEL` overrides just the research model;
  `MARKETING_RESEARCH_TIMEOUT_MS` the timeout.
- **UI (done):** a **"Research posting times" / "Re-research" button** + recommended-times panel on
  the Channels tab (`ChannelWorkspace.tsx`), and a **"Use recommended day"** button on the calendar
  item's publish-date field (`CalendarWorkspace.tsx`) that defaults from the channel's times
  (day-granular — the calendar stores noon-anchored dates). The scheduler is SDK-free in
  `src/lib/marketing/postingTimeSchedule.ts` so the Studio client doesn't bundle the Anthropic SDK.
- **Verified** live: all 7 channels researched + stored (Instagram → Wed 12:00 ET carousel), Channels
  panel render screenshot-verified, calendar button shows the next recommended day.
