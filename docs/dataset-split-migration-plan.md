I verified the contested claims directly against the live datasets and the code. Several premises in the brief are wrong; the plan below corrects them.

---

# Migration Plan: split internal marketing types into the private `outreach` dataset

## 0. Ground truth I re-verified (corrections to the brief)

Probed live via `https://a1wsimxr.api.sanity.io/v2024-01-01/data/query/<dataset>` with and without `SANITY_API_WRITE_TOKEN`.

**Type inventory (`production`, total / anon-visible):**

| type | docs | anon | hidden by dotted `_id` |
|---|---|---|---|
| marketingCalendarItem | 36 | **36** | 0 |
| cmsFeedback | 8 | **8** | 0 |
| marketingChannel | 7 | **7** | 0 |
| marketingResearchResult | 7 | **7** | 0 |
| marketingMessagePillar | 7 | **2** | 5 |
| marketingAudienceProfile | 5 | **1** | 4 |
| marketingExperiment | 4 | **1** | 3 |
| previewShareLink | 3 | **3** | 0 |
| marketingResearchRun | 2 | **2** | 0 |
| marketingAnalyticsSource | 2 | **2** | 0 |
| marketingLeadMagnet | 2 | **2** | 0 |
| marketingCampaign / Funnel / PerformanceSignal / ResearchProject | 1 each | **1 each** | 0 |
| marketingIdea 26, marketingProofPoint 12, marketingQualityGate 4, marketingCta 3, marketingLinkItem 2, marketingCitationCheck 2 | — | **0** | all |
| marketingProduct 31, chatThread 18, orderPreset 2 | — | **0** | all |
| marketingTemplate, marketingTrackingRule, marketingResearchPlan, aiCitationSnapshot, marketingSettings, marketingShopSettings | **0 docs** | 0 | — |

`outreach` anonymous read returns `[]` (confirmed). It contains exactly: marketingContact, marketingContactIdentity, marketingDispute, marketingFinancialPosture, marketingOffer, marketingOperation, marketingOrder, marketingWorkEvidence, sanity.imageAsset.

**Correction 1 — "reference integrity is clean" is FALSE.** There are **23 STRONG references from moving docs to staying docs**: every `marketingCalendarItem.owner → teamMember` (e.g. `mcal-june2026-coderyte-casestudy → team-craig-mcginley`). I proved the consequence with a real scratch mutation into `outreach` and cleaned it up:

```
STRONG: HTTP 409  {"type":"documentReferenceDoesNotExistError",
   "description":"Document \"zz-…\" references non-existent document \"team-alexandra\""}
WEAK  : HTTP 200
```

So the copy **cannot** be a straight dump, and `marketingCalendarItem.owner` cannot be assigned in the Studio after the move until the schema field is `weak: true`. Direction `staying → moving` is genuinely clean today (0 refs), but the *schema* allows it (`marketingProduct.campaign`, `.audiences`), so an editor can create one and get a 409.

**Correction 2 — no moving document has any asset reference.** Zero `socialImage`/`socialVideo`/`draftFrames[].image`/`marketingLinkItem.image`/`marketingLeadMagnet.gatedAsset` are populated. The `asset->` cross-dataset hazard is entirely forward-looking, not a migration problem.

**Correction 3 — `marketingLeadMagnet`, `marketingCitationCheck`, `previewShareLink` have NO Sanity schema** (not in `src/sanity/schemas/index.ts`). They are written purely via the data API, so they have zero Studio surface and moving them costs nothing in the editor.

**Correction 4 — `/links` is already broken on production.** `curl https://www.goinvo.com/links` → 200 rendering "No links are currently published", while `marketingLinkItem.goinvo` and `marketingLinkItem.housing-truths` are both `status: "active"`. The dotted `_id` hides them from the untokened `sanityFetch`. The migration *fixes* this page rather than breaking it.

**Correction 5 — `marketingSettings` `_id` has no dot** (`src/sanity/schemas/marketingSettings.ts`), and the document does not exist in either dataset. `/api/marketing/brand-voice/learn` already 409s today.

---

## 1. FINAL TYPE LIST

### MOVES to `outreach` — 26 types

**Wave 1 — the marketing core** (all read through `MARKETING_QUERY` / the marketing API; one atomic set because they reference each other densely):

`marketingCalendarItem`, `marketingCampaign`, `marketingChannel`, `marketingFunnel`, `marketingAnalyticsSource`, `marketingAudienceProfile`, `marketingMessagePillar`, `marketingProofPoint`, `marketingCta`, `marketingTrackingRule`, `marketingQualityGate`, `marketingExperiment`, `marketingPerformanceSignal`, `marketingLinkItem`, `marketingIdea`, `marketingTemplate`, `marketingResearchProject`, `marketingResearchResult`, `marketingResearchRun`, `marketingResearchPlan`, `marketingSettings`, `marketingCitationCheck`, `aiCitationSnapshot`, `marketingLeadMagnet`

> `marketingResearchPlan` is **not** in the brief's list but is fetched by `MARKETING_QUERY` (`src/sanity/tools/marketingTool.tsx:2994`) and declares `owner → teamMember` (`marketingResearchPlan.ts:143`). It has 0 docs; include it so the type list matches the tool's read set.

**Wave 2 — `previewShareLink`** (independent; needs a client *split*, not a repoint — see §2).

**Wave 3 — `cmsFeedback`** (independent; blocked on porting the Content-desk inbox — see §2).

### STAYS in `production` — with the reason

| type | why it must not move |
|---|---|
| `marketingProduct` | Public storefront display **and** checkout pricing read it through the same tokened client, `getCatalogClient()` at `src/lib/shop/catalog.ts:73` (display `:114`, charging `:150`). The comment at `catalog.ts:99-105` records the real money bug caused by those two disagreeing. Also referenced `_weak` from outreach orders (`src/lib/shop/fulfillment.ts:191`). |
| `marketingShopSettings` | Public storefront config (`shopStorefrontQuery`, `src/sanity/lib/queries.ts:359`) + the Stripe webhook's contact-sync decision (`src/lib/shop/fulfillment.ts:152`, whose comment says explicitly "configuration, not PII — they stay in the public dataset"). |
| **`orderPreset`** | **Not a marketing type at all.** It is the Content desk's drag-to-reorder machinery for the *public* types Case Study / Vision Piece / Team Member (`src/sanity/structure.ts:30,31,38` → `goinvoOrderableDocumentListDeskItem`). It is read/written exclusively through `context.getClient()` inside `structureTool`, which is hardwired to the workspace dataset (`src/sanity/orderable/OrderableDocumentList.tsx:161,176,235,323`). There is no dataset plumbing anywhere in that subsystem. Moving it kills Save/Load/Delete Order Preset on three public lists. It is already dot-hidden (0 anon). **Reject the brief's suggestion to move it.** |
| `chatThread` | Not on the brief's list; already dot-hidden (0 anon, 18 docs). Its reader is a `S.documentList()` inbox in `structure.ts:120+`, the same workspace blocker as `cmsFeedback`. Defer to the same wave as Wave 3 if you want it. |
| `feature`, `caseStudy`, `healthVisualization`, `teamMember`, `category`, `job`, `visionSpotlight`, `sanity.*Asset` | Read anonymously by `sitemap.ts:54,64`, `llms.txt/route.ts:30,36`, `/about`, `/vision`, `/work`, `HomePageRenderer.tsx`, and `/vision/health-visualizations/page.tsx:380`. |

### Explicit exception decision on `marketingLeadMagnet`

It **moves**, despite being read by a *public unauthenticated* POST route. The dotted-id alternative does not work here: `/api/newsletter/subscribe` reads through a deliberately untokened client (`route.ts:112`), so dotting the ids breaks the route exactly as a move does. Since it must be tokened either way, move it and use the **outreach client that already exists in that same file** (`getOutreachClient()`, `route.ts:117-130`). Hard requirement: when `writeToken` is absent the magnet lookup must **503**, never fall through to the existing `404 'Unknown lead magnet'` at `route.ts:235` — otherwise a missing env var silently rejects every gated signup.

---

## 2. ORDERED STEPS

**The cutover point is Step 6** (adding types to `INTERNAL_MARKETING_TYPES` and deploying). Steps 1–5 change no behavior. Step 7 (delete from production) is what actually closes the leak, and it is deliberately *after* a soak, so the whole window from Step 5 to Step 7 has the data present in **both** datasets and is instantly reversible.

---

### Step 1 — Build the single routing chokepoint (code only, no behavior change)

There is no chokepoint today. `clientForType` is **duplicated** in `src/app/api/marketing/doc/[type]/route.ts:32-35` and `src/app/api/marketing/doc/[type]/[id]/route.ts:51-54`, and those are its only two consumers. Everything else builds its own client bound to `dataset` from `@/sanity/env`.

Create **`src/lib/marketing/datasetRouting.ts`** (pure, no `sanity` import — safe in the Studio bundle):

```ts
import { OUTREACH_DATASET, OUTREACH_DATASET_TYPES } from './outreachEnums'
import { dataset as PUBLIC_DATASET } from '@/sanity/env'   // via a param in client-safe callers

// Global kill switch. Set to 'production' on Vercel to revert the whole split
// in ~60s with no git operation. NEXT_PUBLIC_ so the Studio bundle sees it too.
export const INTERNAL_DATASET =
  process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || OUTREACH_DATASET

// ONE list. Folds in the 7 types already private.
export const INTERNAL_MARKETING_TYPES: string[] = [
  ...OUTREACH_DATASET_TYPES,
  // Wave 1 types added here at Step 6.
]

export function datasetForType(type: string, publicDataset: string): string {
  return INTERNAL_MARKETING_TYPES.includes(type) ? INTERNAL_DATASET : publicDataset
}

export function clientForType<C extends { withConfig(c: {dataset: string}): C; config(): {dataset?: string} }>(
  base: C, type: string,
): C {
  const target = datasetForType(type, base.config().dataset || 'production')
  return target === base.config().dataset ? base : base.withConfig({ dataset: target })
}

/** Mirror of assertPrivateMarketingOperationsDataset (operations/route.ts:40). */
export function assertSplitIsReal(publicDataset: string) {
  if (INTERNAL_MARKETING_TYPES.length > OUTREACH_DATASET_TYPES.length
      && INTERNAL_DATASET === publicDataset) {
    throw new Error('Marketing split is enabled but INTERNAL_DATASET === public dataset.')
  }
}
```

Then **delete both duplicate `clientForType` definitions** in the two doc routes and import this one.

**Verify:** `npx tsc --noEmit && npx vitest run tests/marketing-enums.test.ts tests/marketing-doc-route-security.test.ts` — plus a new unit test asserting `datasetForType('caseStudy') === 'production'` and `datasetForType('marketingOrder') === 'outreach'` with the Wave-1 list still empty.

---

### Step 2 — Weaken every reference that will cross the boundary (schema, code only)

Add `weak: true` to these seven fields. Without this, Step 6 makes the corresponding Studio saves fail with the 409 I reproduced above.

| file:line | field |
|---|---|
| `src/sanity/schemas/marketingCalendarItem.ts:111-117` | `owner → teamMember` — **23 live refs** |
| `src/sanity/schemas/marketingCalendarItem.ts:229-238` | `canonicalSiteContent[] → feature \| caseStudy \| healthVisualization` |
| `src/sanity/schemas/marketingCampaign.ts:78-83` | `owner → teamMember` |
| `src/sanity/schemas/marketingExperiment.ts:258-266` | `targetFeature → feature` |
| `src/sanity/schemas/marketingFunnel.ts:146-160` | `stages[].content[] → feature \| caseStudy \| marketingCalendarItem` |
| `src/sanity/schemas/marketingResearchProject.ts:71-75` | `owner → teamMember` |
| `src/sanity/schemas/marketingResearchPlan.ts:140-144` | `owner → teamMember` |

And the reverse direction, on a **staying** type:

| `src/sanity/schemas/marketingProduct.ts:237-243` | `campaign → marketingCampaign` — weaken **or delete** |
| `src/sanity/schemas/marketingProduct.ts:244-250` | `audiences[] → marketingAudienceProfile` — weaken **or delete** |

0 products use either today (31/31 use only `sourceVisualization`), so deleting them is the cleaner choice; if kept, `ShopWorkspace.tsx:489/492` will 409 the first time someone sets Campaign on a product.

**Verify:** `npx vitest run tests/marketing-cms.test.ts` + open `/studio/marketing?view=calendar`, assign an owner, save. Still production-to-production, so it must still work.

---

### Step 3 — Replace every cross-dataset `->` dereference with a client-side join

Weak references do not dereference across datasets — they return `null` silently. Three projections break:

| file:line | projection | fix |
|---|---|---|
| `src/sanity/tools/marketingTool.tsx:346` | `"owner": owner->{_id, "title": name}` | keep the raw `owner._ref`; resolve against `data.teamMembers`, which the same query already fetches at `:807` and stores at `:3016` |
| `src/sanity/tools/marketingTool.tsx:520` | `"targetFeature": targetFeature->{_id, title, slug}` | add a `features` sub-query to the production half (below) and join client-side |
| `src/sanity/components/marketing/CalendarWorkspace.tsx:870` | writes `owner` as a strong ref from a `data.teamMembers` dropdown | emit `{_type:'reference', _ref, _weak:true}` |

**Verify:** Calendar cards still show owner initials/names; A/B Tests tab still shows the target article. `node scripts/studio-screenshot.mjs --tab "Calendar" --expect "<an owner name>"`.

---

### Step 4 — Split every client that serves two datasets in one query

These are the sites a blanket dataset swap gets wrong, because a single client or a single query spans the boundary.

| file:line | what to do |
|---|---|
| `src/sanity/tools/marketingTool.tsx:2994` (`MARKETING_QUERY`, 20 sub-queries) | **Split into two fetches.** The 19 marketing sub-queries → `clientForType(client,'marketingCalendarItem')`; `"teamMembers"` at `:807` (+ a new `features` list for Step 3) stays on the default client. Merge in `setData` at `:2996-3017`. |
| `src/sanity/tools/marketingTool.tsx:3161` (`commitPatch`) | Receives only an `_id`, no `_type`, so it cannot route per type. Since **all 19 types move together**, close it over the internal client. Add a dev-time guard that throws if the id belongs to a non-internal type. |
| `src/sanity/tools/marketingTool.tsx:3187` (`createDocument`) | Receives `_type` → route with `clientForType`. **This is the most dangerous single line in the migration**: unrouted it *succeeds*, writing new internal docs into the world-readable dataset while the tool reads outreach — the record vanishes from the UI and the leak reopens on every "New" click. |
| `src/app/api/marketing/assist/route.ts:169,663` | `MARKETING_CONTEXT_QUERY` mixes `feature` (`:170`), `caseStudy` (`:178`), `category` (`:187`) with 15 marketing sub-queries (`:192-282`). **Split into two fetches and merge**, do not repoint. |
| `src/app/preview/[token]/route.ts:15,26,34` | One `reader` doing two jobs. `:26` (previewShareLink) → outreach; `:34` (feature/caseStudy slug resolve) stays production. **Wave 2.** |
| `src/app/api/preview-share/route.ts:17,47,75,85,106,125,131` | Same split: `:47` `resolveDoc` stays production; create/list/revoke/cleanup → outreach. Unsplit, minting writes to one dataset while `/preview` reads the other and every link 404s. **Wave 2.** |
| `src/app/api/marketing/outreach/extract-evidence/route.ts:39,397,473` | `readClient` reads `caseStudy` (stays) *and* `resolveMarketingModel` reads `marketingSettings` (moves). Repoint only the `:473` call. |
| `src/app/api/marketing/outreach/research/route.ts:60` | `getMarketingSettingsClient()` exists *solely* to read `marketingSettings` from production. **Delete it**; use the route's `getOutreachClient()`. |

---

### Step 5 — Repoint every remaining single-dataset reader/writer

All still no-ops while `INTERNAL_MARKETING_TYPES` is empty.

**Server routes / libs**

| file:line | types | breaks silently if missed |
|---|---|---|
| `src/lib/marketing/client.ts:29` `getMarketingWriteClient()` | 9 route modules | route each call through `clientForType` |
| `src/lib/marketing/drainSink.ts:153,210,213` | Experiment + PerformanceSignal | `*[_type=="marketingExperiment" && flagKey==$flagKey][0]` misses → warning only, **0 signals written, drain reports success**. A/B readout freezes. |
| `src/app/api/marketing/analytics/drain-cron/route.ts:42` | same | as above (`CRON_SECRET`) |
| `src/app/api/marketing/analytics/vercel-drain/route.ts:50` | same | as above |
| `src/lib/marketing/publishers/worker.ts:444,453,464` (via `publish/run/route.ts:167`) | CalendarItem | **DUE_ITEMS_QUERY returns [] → "0 due" is indistinguishable from "nothing scheduled".** Scheduled LinkedIn/IG posts stop, QStash keeps reporting 200. |
| `src/app/api/marketing/publish/schedule/route.ts:46,125` | CalendarItem | Sanity webhook silently no-ops; nothing ever enqueued |
| `src/app/api/marketing/publish/status/route.ts:19,46` | CalendarItem | banner always "0 due" |
| `src/app/api/marketing/publish/preview/route.ts:49` | CalendarItem | dry-run "item not found" |
| `src/app/api/marketing/rendomat/ingest/route.ts:29,227,302` | CalendarItem | dedupe misses → **every render re-ingested as a duplicate Reel**; `client.assets.upload` at `:302` must follow the item |
| `src/app/api/marketing/seed/channels/route.ts:54` → `src/lib/marketing/seed.ts:165,185` | Channel | idempotency check misses → duplicate set of 7 channels |
| `src/app/api/marketing/research/posting-times/route.ts:30,162,177` | Channel + Settings | "Research posting times" finds no channels; calendar "Use recommended day" goes dead |
| `src/app/api/marketing/research/run/route.ts:293,332,445,718` | ResearchProject/Run/Result | 404s; fingerprint idempotency misses → full re-run on retry |
| `src/app/api/marketing/cascade/research-records/route.ts:58,109` → `cascades.ts:290,535` | 6 types | 404 "No marketingResearchProject found"; all six move together or it 409s mid-cascade |
| `src/app/api/marketing/clone/link-from-post/route.ts:56,68` | CalendarItem + LinkItem | both move together |
| `src/app/api/marketing/clone/proof-from-result/route.ts:87` | ResearchResult + ProofPoint | both move together |
| `src/app/api/marketing/ai-citation/route.ts:39,46,178,191` | aiCitationSnapshot + Settings | Studio panel and `/marketing-plan` disagree |
| `src/app/api/marketing/citation-check/route.ts:61,282,285` | CitationCheck + Settings | writes land in the wrong dataset (nothing reads them — lowest risk) |
| `src/app/api/marketing/brand-voice/learn/route.ts:143,192` | Settings | the **only loud** failure in the set (409 "Marketing Settings must be saved") |
| `src/lib/marketing/anthropicJson.ts:48` `resolveMarketingModel` | Settings | caller-supplied client. Production callers: `assist:609`, `brand-voice/learn:192`, `citation-check:282`, `ai-citation:178`, `posting-times:177`, `extract-evidence:473`, `outreach/research:202`. Miss any → silent fallback to `MARKETING_CLAUDE_MODEL`, in-Studio picker ignored. |
| `src/lib/marketing/brandVoice.ts:6,177` | Settings | `assist:613` + `outreach/research:203`. Silent: generated copy loses the approved voice with no error. Rewrite the header comment. |
| `src/lib/marketing/crud.ts:297` | CalendarItem + Channel | channel-delete cascade assumes one dataset |
| `src/sanity/components/marketing/marketerBrief.ts:151` | hardcoded `dataset: 'production' as const` labelling a `marketingResearchProject` linked record → flip to the internal dataset; already-stored `marketingOperation` docs carry the stale label |

**Public pages**

| file:line | change |
|---|---|
| `src/app/links/page.tsx:36` | **Drop `sanityFetch`.** It is untokened by construction: `node_modules/@sanity/next-loader/dist/index.js:47` only sends `serverToken` when perspective ≠ `published`, so a public page read is always anonymous. Replace with a module-level `createClient({ projectId, dataset: INTERNAL_DATASET, token: previewToken, useCdn:false, perspective:'published' })`, keeping `export const revalidate = 60`. Move `linkInBioItemsQuery` **out of** `src/sanity/lib/queries.ts:174` into the page — it is the only candidate-type query in the shared public query module. This also **fixes** the page, which is broken today. |
| `src/app/api/newsletter/subscribe/route.ts:223` | Use the file's existing `getOutreachClient()` (`:117`). **Return 503, not 404, when it is null.** |
| `src/app/marketing-plan/page.tsx:39` (`getSanityClient`) | One-line `dataset` change; it feeds all 8 queries at `:151-182` through `safeFetch:185`, which swallows every error and only `console.error`s → 8 blank deck sections with no visible failure. |
| `src/app/action-plan/page.tsx:77,129,234` | Run `CONTENT_QUERY` on the file's existing `getOutreachClient()` (`:60`) and **delete `getProductionClient()`** — it has no other consumer. Then update `tests/execution-plan.test.ts:280` (the "production-bound content is neutral" guard), the header comment in `src/lib/marketing/executionPlanSeed.ts:8`, and `scripts/seed-execution-plan.ts:55,93`. |

**Studio components not covered by the chokepoint** — 14 sites that build or receive a raw client:

`CalendarWorkspace.tsx:291,305,323,363,944` · `ChannelWorkspace.tsx:145,168,696` · `TemplateWorkspace.tsx:151,168` · `ResearchWorkspace.tsx:457,586` · `LinkTreeWorkspace.tsx:162` (`client.assets.upload`) · `SeoWorkspace.tsx:463,606` (marketingIdea) · `MarketingAiModelSetting.tsx` + `MarketingBrandVoiceSetting.tsx:78,157` (own `useClient`) · `domain.ts:4081,4115,4140,4163,4583,4891,4933,4973,4994,5011,7903,7955,8037` (take a `client` **param** — fixed automatically once callers `marketingTool.tsx:3211,3235` pass the internal client).

The two delete paths are the nastiest: `CalendarWorkspace.tsx:305` / `ChannelWorkspace.tsx:145` run `*[references($id)]` as a pre-delete safety check (`references()` never crosses datasets → always "0 blockers", guard silently disabled) and `:323`/`:168` then `client.delete()` against the wrong dataset — **a no-op that reports success**, adds the id to `deletedIds`, hides the row, and the row reappears on refresh.

**Scripts:** `scripts/inspect-ab-drain.ts:27`, `scripts/migrate-ab-events.ts:54`, `scripts/reset-ab-measurement.ts:51`, `scripts/sync-vercel-analytics.ts:238`, `scripts/seed-execution-plan.ts:55` all take `NEXT_PUBLIC_SANITY_DATASET` — repoint via `datasetForType`.

**Dead escape hatches:** `advancedEditHref` (`domain.ts:8145`) renders `<a href="/studio/content/intent/edit/id=…">` from `AbTestingWorkspace:628`, `AnalyticsWorkspace:861`, `CalendarWorkspace:1465`, `CampaignWorkspace:615`, `FunnelWorkspace:524`, `LinkTreeWorkspace:696`, `TemplateWorkspace:437`. `sanity.config.ts:20` defines **one workspace on one dataset**, so after the move the intent route opens an **empty new-document form** for that id, and saving it creates a ghost duplicate in production. **Remove these 7 links in Step 5**, and add `socialImage`/`socialVideo` to the Calendar form (the only fields they were reaching).

**Verify Step 5:** `npx tsc --noEmit && npx vitest run` (full suite). Then with `npm run dev` and `INTERNAL_MARKETING_TYPES` still empty: `curl -H "Authorization: Bearer $MARKETING_API_KEY" "localhost:3000/api/marketing/publish/run?dryRun=1"` and `.../publish/status` — record the **due count and per-type counts as the pre-move baseline**. Screenshot Calendar + Channels + A/B Tests. Everything must be byte-identical to before Step 1.

---

### Step 5b — Build the anti-silent-failure probe (do this before cutover, not after)

Add **`src/app/api/marketing/health/dataset/route.ts`** (`assertStudioOrApiKey`), returning for each managed type: the configured dataset, the doc count **in that dataset**, and the count still **anonymously readable in production**. This is the one check that catches every silent failure in this migration at once — a zero count for a type that had documents is an immediate, unambiguous alarm, where "0 due items" is not.

Add `scripts/check-dataset-split.mjs` wrapping it plus the raw anonymous GROQ probe (§5).

---

### Step 6 — COPY the data (production untouched — nothing can break)

Run `scripts/split-marketing-dataset.mjs --wave 1 --copy --dry-run`, inspect, then `--apply`. Both datasets now hold identical documents. Production still serves everything.

**Verify:** the script's own verify phase (§3) plus `node scripts/check-dataset-split.mjs` — outreach counts must equal the production counts in the table in §0. Production anon counts unchanged (leak still open, by design).

---

### Step 7 — ★ CUTOVER ★ — flip the routing list

Add the 24 Wave-1 types to `INTERNAL_MARKETING_TYPES`, commit, deploy. Immediately **re-run Step 6's copy** (`createOrReplace`, idempotent) to sweep up anything written to production during the deploy window.

**This is the cutover point.** Everything now reads and writes `outreach`, which already has the data. Production still holds a full, intact copy.

**Verify — all of these, in order:**

1. `node scripts/check-dataset-split.mjs` — every type reports non-zero from outreach.
2. Public site: `curl -s -o /dev/null -w "%{http_code}" https://www.goinvo.com/{,vision,work,about,vision/health-visualizations,links,shop}` all 200; `curl -s https://www.goinvo.com/sitemap.xml | grep -c "<loc>"` unchanged; `curl -s https://www.goinvo.com/links | grep -c "goinvo\|housing-truths"` → **2** (this page starts working).
3. Storefront money check: `node scripts/check-shop-button-fit.mjs --base https://www.goinvo.com` and confirm a displayed price equals the Stripe checkout amount for one product (`marketingProduct` did not move — this proves it).
4. Studio: `node scripts/studio-screenshot.mjs --tab "Calendar" --expect "<a known item title>"`, then `--tab "Channels" --expect "Instagram"`, `--tab "A/B Tests"`. Create a scratch calendar item, assign an owner, drag it to another day, delete it — all four must succeed.
5. Publish worker parity: `curl -H "Authorization: Bearer $KEY" ".../api/marketing/publish/run?dryRun=1"` — due count **must equal the Step-5 baseline**. A zero here is the migration's signature failure.
6. Preview links (if Wave 2 shipped): `node scripts/verify-preview-share-links.mjs`.
7. `npx vitest run`.

**Soak 48 hours.** During the soak, confirm at least one write of each shape landed in outreach and *not* production: compare `count(*[_type=="marketingCalendarItem"])` in both datasets — production's must stay frozen at 36.

---

### Step 8 — DELETE from production (this is what closes the leak)

`scripts/split-marketing-dataset.mjs --wave 1 --delete --dry-run` → `--apply`. Deletes only ids recorded in the Step-6 manifest whose content hash re-verified.

**Verify — the anonymous probe (the actual acceptance test):**

```bash
P=a1wsimxr
for T in marketingCalendarItem marketingCampaign marketingChannel marketingFunnel \
         marketingAnalyticsSource marketingAudienceProfile marketingMessagePillar \
         marketingProofPoint marketingCta marketingTrackingRule marketingQualityGate \
         marketingExperiment marketingPerformanceSignal marketingLinkItem marketingIdea \
         marketingTemplate marketingResearchProject marketingResearchResult \
         marketingResearchRun marketingResearchPlan marketingSettings \
         marketingCitationCheck aiCitationSnapshot marketingLeadMagnet; do
  N=$(curl -s "https://$P.api.sanity.io/v2024-01-01/data/query/production?query=$(printf 'count(*[_type=="%s"])' "$T" | jq -sRr @uri)" | jq -r .result)
  echo "$T anon=$N"; [ "$N" = "0" ] || echo "  *** STILL WORLD-READABLE ***"
done
```

Every line must read `anon=0` — with **no token in the request**. Then re-run the *entire* Step-7 verification list, because Step 8 is the first moment a missed reader actually fails.

---

### Step 9 — Waves 2 and 3

- **Wave 2 (`previewShareLink`)**: Steps 4/6/7/8 for one type. Prerequisite: the client split in `preview/[token]/route.ts` and `api/preview-share/route.ts`. Verify with `node scripts/verify-preview-share-links.mjs` (401-unauth → mint → no-login render → list → revoke → invalid).
- **Wave 3 (`cmsFeedback`)**: **prerequisite** — port the four `S.documentList()` inbox views (`structure.ts:72-119`) into a read view inside the existing `feedbackTool.tsx` (a custom tool that already owns its client at `:98`), then repoint the writer at `:142`. Only then copy/flip/delete. Without the port the inbox is structurally unreachable, because `sanity.config.ts:20` is a single-dataset workspace.

---

### Out-of-code follow-ups (will not be caught by any test)

1. **Sanity webhooks are configured per dataset.** The `marketingCalendarItem` create/update webhook → `POST /api/marketing/publish/schedule` must be **re-created on the `outreach` dataset** at manage.sanity.io. Miss this and nothing is ever enqueued to QStash — with a perfectly healthy-looking `/publish/run`.
2. Set `NEXT_PUBLIC_MARKETING_INTERNAL_DATASET` on Vercel (prod **and** preview) — omit it and it defaults to `outreach`, which is what you want; set it to `production` only to roll back.
3. Confirm `SANITY_API_WRITE_TOKEN` has read+write on `outreach`. I verified it reads both datasets and *writes* outreach (the 409/200 probe above proves the write path).

---

## 3. DATA MOVE MECHANISM

`scripts/split-marketing-dataset.mjs` — `_id`s are preserved exactly across datasets.

```
--wave <1|2|3> | --types <csv>     which documents
--copy | --delete | --verify       phase (default: verify only)
--reverse                          outreach → production (rollback)
--dry-run                          DEFAULT ON; --apply required to write
--manifest <path>                  default .migration/marketing-split-<ts>.json
```

**Copy phase**
1. Fetch `*[_type in $types]` from the source **with the write token**, including `drafts.*`. (No drafts exist among these types — every candidate's total equals its published count — but handle them generically.)
2. Compute the moving id set. Walk each document; for every `_ref` whose target is **not** in that set, set `_weak: true`. This is what makes the 23 `owner → teamMember` refs land instead of 409-ing.
3. Strip `_rev`, `_updatedAt`, `_createdAt`. Keep `_id` and `_type`.
4. `createOrReplace` in transactions of 50. **Idempotent and re-runnable** — safe to run repeatedly, which is exactly how the Step-6/Step-7 window is closed.
5. Write the manifest: `{ id, type, sha256(canonicalJSON(doc)), weakenedRefs: [...] }` per document.

**Verify phase** — re-fetch from the target, recompute the hash, compare against the manifest; compare per-type counts both ways. Prints a table and exits non-zero on any mismatch. `--delete` refuses to run unless this passes.

**Delete phase** — deletes **by explicit id list from the manifest**, never by `*[_type == ...]` query. A query-based delete would take out anything created in production after the copy. Deleting a missing id is a no-op, so this is re-runnable too.

**Reversibility** — `--reverse --copy` runs the identical pipeline outreach → production. Because ids are preserved and the weakening pass is idempotent (weak refs whose targets *do* exist in production simply stay weak; re-strengthening is a separate optional `--restrengthen` pass), a reverse run restores byte-equivalent documents.

**Assets** — none to move (verified zero asset refs among all 136 moving documents). The script asserts this and **aborts** if it finds any, so a future run does not silently orphan `socialImage`/`gatedAsset`.

---

## 4. ROLLBACK

**Between Step 7 and Step 8 (data still in both datasets) — ~60 seconds, no git:**
Set `NEXT_PUBLIC_MARKETING_INTERNAL_DATASET=production` on Vercel and redeploy. `datasetForType` returns the public dataset for every type; every reader and writer is back on production, which still holds everything. Any documents written to outreach during the window are recovered with `--reverse --copy`. This is the entire reason the delete lags the flip.

**After Step 8:**
1. `node scripts/split-marketing-dataset.mjs --wave 1 --reverse --copy --apply --manifest <the step-6 manifest>` (restores every id and hash to production).
2. Flip `NEXT_PUBLIC_MARKETING_INTERNAL_DATASET=production`, redeploy.
3. Re-run Step 7's verification list.
4. The 7 schema `weak: true` changes and the client splits can stay — they are correct in both configurations. The only thing that must be reverted is the routing list/env var.

**Partial rollback:** remove individual types from `INTERNAL_MARKETING_TYPES` and re-copy just those (`--types <csv> --reverse`). Do not do this for types that reference each other (the cascade set: ResearchProject/Funnel/Campaign/CalendarItem/LinkItem/Channel; Experiment+PerformanceSignal; ResearchProject/Run/Result) — split them and the cascades 409 mid-way.

---

## 5. RISKS — ranked, with the silent ones first

**Silent failures — each looks exactly like "nothing to do":**

1. **Publish worker finds 0 due items.** `worker.ts:453` `DUE_ITEMS_QUERY` against an empty dataset returns `[]`, `/publish/run` returns a clean 200 "0 due", QStash records success. Scheduled LinkedIn/Instagram posts simply stop. *Mitigation:* the Step-5 baseline due count + the `/api/marketing/health/dataset` probe; make `/publish/run` emit a `warnings` entry when `count(*[_type=="marketingCalendarItem"]) === 0`.
2. **A/B measurement freezes.** `drainSink.ts:153` misses, logs `"No marketingExperiment found for flag key …"` into a `warnings` array, writes nothing, and reports success. The readout keeps showing its last value. Ingest (`/analytics/collect`) touches no Sanity, and `src/lib/experiments/registry.ts` reads no Sanity — so **visitors see the correct variants throughout**; only the readout dies. That asymmetry is what makes it easy to miss.
3. **`createDocument` writes to the wrong dataset and succeeds.** `marketingTool.tsx:3187` unrouted → every "New" button silently deposits an internal document into the world-readable dataset, re-opening the exact leak this migration closes, while the record never appears in the UI.
4. **Delete buttons become no-ops that report success.** `CalendarWorkspace.tsx:323`, `ChannelWorkspace.tsx:168`, `TemplateWorkspace.tsx:168` — the row disappears via local `deletedIds` state and returns on refresh.
5. **Reference-check guards silently disabled.** `CalendarWorkspace.tsx:305` / `ChannelWorkspace.tsx:145` — `references()` never crosses datasets, so the "is this in use?" guard always answers "no".
6. **Rendomat re-ingests every render.** `rendomat/ingest/route.ts:29` dedupes on `rendomatVideoId` against the wrong dataset → duplicate scheduled Reels.
7. **`marketingSettings` falls back everywhere.** 7 call sites through `resolveMarketingModel`/`resolveMarketingBrandVoice`. Miss any and the in-Studio model picker and approved brand voice are ignored with no error. (Note: 0 docs exist today, so this is latent — it bites the day someone saves settings.)
8. **`/marketing-plan` renders 8 blank sections.** `safeFetch` (`page.tsx:185`) returns the fallback on any failure and only `console.error`s.
9. **`/action-plan` content column empties.** `.catch(() => EMPTY)`.
10. **Seeding loses idempotency.** `seed.ts:165` existence check against the wrong dataset → a duplicate set of 7 channels.

**Loud failures (good — these you will notice):**

11. **409 `documentReferenceDoesNotExistError` on save**, if Step 2 is skipped. Reproduced above. Hits the Calendar owner dropdown first (23 live refs), then Campaign owner, Experiment target article, Funnel stage content, and — from the *other* side — ShopWorkspace product Campaign/Audiences.
12. `brand-voice/learn` 409 "Marketing Settings must be saved" (already the case today).

**Structural — will not fail, will just be gone:**

13. **Moved types become unreachable in the document editor.** `sanity.config.ts:20` is a single-dataset workspace: no global search (Ctrl+K), no publish/unpublish, no draft machinery, no `/studio/content/intent/edit/id=…`. This is accepted (the 7 existing outreach types already live this way via custom `withConfig` UIs), but it means the 7 `advancedEditHref` links must be deleted — left in place they open an empty new-document form and **saving one creates a ghost duplicate in production**.
14. **`cmsFeedback` inbox and `orderPreset` presets** are pure `structureTool` constructs with no dataset plumbing — hence Wave 3's prerequisite and `orderPreset`'s exclusion.
15. **The Sanity webhook is dataset-scoped and lives outside the repo.** No test, lint, or type check can catch it.

**Data-integrity:**

16. **Writes to production between copy (Step 6) and flip (Step 7) are lost.** Mitigated by re-running the idempotent copy immediately after the flip deploy goes live, and by keeping the window to minutes.
17. **A query-based delete would destroy post-copy documents.** Mitigated by deleting strictly from the verified manifest id list.