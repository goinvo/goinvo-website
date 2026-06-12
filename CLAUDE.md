# GoInvo Website — Project Instructions

> Append durable operational facts here (auth, deploy steps, gotchas). This file
> loads every session; uncommitted scratch notes get lost. **Commit changes to it.**

> **Practices & open work:** durable engineering practices + architecture decisions live in
> [`docs/engineering-practices.md`](docs/engineering-practices.md); anything that still needs
> work is tracked in [GitHub Issues](https://github.com/goinvo/goinvo-website/issues) (labeled
> `tech-debt` / `analytics` / `seo` / `infra`) — file an issue rather than leaving it implicit.

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
  `status: "scheduled"`, a past-due `publishAt`, and a `channelRef`/`channel` of `linkedin` or
  `instagram`. A Vercel cron (`/api/marketing/publish/run`, every 15 min — see `vercel.json`)
  claims due items with an **optimistic revision lock** (no double-posts across overlapping runs),
  publishes via the platform adapter, and writes back `status: published` + `externalPostId` +
  `publishedUrl`, or `publishState: failed` + `publishError`.
- **Worker state** lives in new calendar fields (group "Publishing"): `autoPublish`,
  `publishState` (queued/publishing/published/failed/skipped, worker-owned), `externalPostId`,
  `publishAttemptedAt`, `publishError`, `publishLockAt` (hidden). Media: `socialImage` (single
  post / carousel cover) + per-`draftFrame` `image` (carousel slides). Instagram **requires** an
  image — text-only IG posts are rejected.
- **Core:** `src/lib/marketing/publishers/` — `types` (SocialPublisher interface), `content`
  (pure `buildPublishContent` + GROQ `DUE_ITEMS_QUERY` + claim/published/failed patch builders,
  all unit-tested), `linkedin` (Posts API + Images upload: text / single-image / link share),
  `instagram` (Graph container→publish: single image + carousel), `index` (registry +
  `connectionStatus`). Reels/video are NOT yet supported (need async status polling) — they fail
  with a clear message.
- **Endpoints** (under `/api/marketing/publish/`): `GET|POST /run` (the worker; cron-secret OR
  `MARKETING_API_KEY` auth; `?dryRun=1` to preview, `?id=<docId>` to publish one now);
  `GET /status` (per-platform connection + due count, key-gated — for a Studio indicator).
- **Connect a platform (only these unlock live posting — same "set the secret" gate as the rest):**
  - LinkedIn: `LINKEDIN_ACCESS_TOKEN` (w_organization_social), `LINKEDIN_AUTHOR_URN`
    (`urn:li:organization:<id>`), optional `LINKEDIN_API_VERSION` (YYYYMM). Needs the
    **Community Management API** product approved + an org admin.
  - Instagram: `INSTAGRAM_ACCESS_TOKEN` (instagram_content_publish), `INSTAGRAM_BUSINESS_ACCOUNT_ID`,
    optional `INSTAGRAM_GRAPH_VERSION`/`INSTAGRAM_GRAPH_HOST`. Needs an IG **Business/Creator**
    account + linked FB Page + Meta App Review.
- **⚠ Cron frequency needs Vercel Pro.** `*/15 * * * *` is Pro-only; on Hobby, cron is limited to
  once/day — drop the schedule to daily before merging to `main`, or trigger `/run` externally.
- **Verify locally** (dev server on :3000 + `MARKETING_API_KEY` in `.env.local`):
  `curl -H "Authorization: Bearer $KEY" "localhost:3000/api/marketing/publish/run?dryRun=1"`.
