# GoInvo Website — Project Instructions

> Append durable operational facts here (auth, deploy steps, gotchas). This file
> loads every session; uncommitted scratch notes get lost. **Commit changes to it.**

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
- **Auth gap closed:** ai-citation, citation-check, research/run, ga4-ab (write routes that had
  no request auth) move behind `MARKETING_API_KEY`.
- **Env:** set `MARKETING_API_KEY` in `.env.local` and on Vercel.
