# SEO Suite Revamp Plan

_Synthesized from three research passes: (1) an audit of the current suite, (2) a benchmark of best-in-class SEO/GEO tools, (3) a capability map of the connected GSC / GA4 / TextFocus MCPs._

## 1. The core problem

The current suite is a **GSC-demand ranker with a static advice card bolted on.** It scores pages by impression-weighted opportunity, but **it never fetches or parses a page**, so it can tell you _where_ demand exists but not _what is wrong_ with any page. The per-page "Do this" list is the **same hardcoded 5 steps for every page** — so it tells you to "add a canonical tag" on pages that already have one and misses pages that genuinely lack one.

Meanwhile the three tools that would close that gap are **already provisioned and entirely unused**:
- **GSC URL Inspection / coverage / period-comparison** — only `searchAnalytics` is used today.
- **GA4 behavioral + conversion metrics** — only `screenPageViews` is pulled, and it doesn't even affect the score.
- **TextFocus on-page / GEO family** (`tf_seo`, `tf_structured_data`, `tf_geo`, `tf_perf`, `tf_links`, `tf_semantic`) — zero calls anywhere in the code.

## 2. The vision

Turn the suite from a demand-ranker into an **audit + guided-action engine** that:
1. Actually **inspects each page** (fetch + parse).
2. **Detects concrete issues** across standard SEO categories + a new GEO axis.
3. **Prioritizes** by impact × effort × spread (not a flat list).
4. Gives **guided what/why/how-to-fix** actions written for non-SEO **designers** (the real audience here).
5. **Tracks resolution** and proves progress (audit-over-audit deltas).
6. Closes the loop into the existing `marketingIdea` backlog and A/B measurement.

## 3. The unified finding model

Every detected issue is one object (the single most important structural change — it makes prioritization, UX, and tracking uniform):

```ts
type SeoFinding = {
  id: string
  category: 'technical' | 'indexation' | 'onpage' | 'content'
          | 'structured-data' | 'performance' | 'internal-linking'
          | 'eeat' | 'geo'
  severity: 'error' | 'warning' | 'notice'   // only `error` moves the Health Score
  priorityWeight: number                      // configurable, data-driven (not hardcoded)
  urlsAffected: number
  pctSite: number
  indexable: boolean
  what: string                                // plain-language definition
  why: string                                 // SEO/UX/business "so what"
  howToFix: string                            // concrete remediation, designer-friendly
  affectedUrls: string[]
  source: 'gsc' | 'ga4' | 'textfocus' | 'html-parse' | 'citation-check'
  status: 'open' | 'snoozed' | 'fixed'
  detectedAt: string
}
```

## 4. Detection modules (the check taxonomy)

Nine category groups (the convergent taxonomy across Screaming Frog / Ahrefs / Semrush / Sitebulb / Lighthouse), each mapped to the tool that powers it and a reliability note. **Do not build all at once** — these are the namespaces.

| Group | Concrete checks | Powered by | Reliability |
|---|---|---|---|
| **Indexation** | sitemap registered & fresh, noindex, canonical conflict/missing, indexed-vs-submitted gap, soft-404 | GSC `inspect_url_enhanced`, `check_indexing_issues`, `list_sitemaps_enhanced` | **High (verified live)** |
| **On-page** | title/meta length+dup+missing, single H1, heading order, canonical/OG/Twitter presence, alt-text coverage | **Fetch + parse the page HTML** (extend the fetch already in citation-check / research) | **High (no external dep)** |
| **Structured data** | JSON-LD parses, Article/FAQ/Org/Breadcrumb present, rich-result eligibility | Parse JSON-LD directly **or** `tf_structured_data` | High (direct parse) / Low (TF) |
| **Content quality** | thin content, readability, **coverage gap vs SERP**, semantic term targets | `tf_semantic` / `tf_lexical` + GSC | Low (TF down this session) |
| **Technical / crawl** | broken links, redirect chains, robots blocks, crawl depth | Lightweight crawl + `tf_robotstxt` | Med |
| **Internal linking** | orphan pages, click depth, anchor text, link-equity flow | `tf_links` or own crawl | Low (TF) / Med |
| **Performance / CWV** | LCP, CLS, INP; lab vs field | `tf_perf` or PageSpeed API | Low (TF) / Med |
| **E-E-A-T** | author bios + Author schema, cited/peer-reviewed sources | HTML parse + the **existing citation-check** | High |
| **GEO / AI-readiness** | direct-answer-first, FAQ Q&A, quotable **cited** stats, freshness, AI-crawler access | `tf_geo`, `tf_robotstxt`, structured-data + HTML parse | Med (parse) / Low (TF) |

## 5. Prioritization model

- **One headline Health Score** where **only Errors count** (Ahrefs formula: `errorless URLs / total URLs × 100`; bands Weak/Fair/Good/Excellent). Warnings/notices don't move it → the score stays signal, not noise.
- **Per-finding severity × spread** (Sitebulb Hint model): every finding shows importance **and** URLs-affected count + %-of-site + indexable/not split — so "critical but 2 pages" reads differently from "medium but 80% of site."
- **Quick-wins lane**: high-impact / low-effort / broad-spread, separated from big projects (Lighthouse Opportunities vs Diagnostics). Use the `effort` field that already exists on `marketingIdea`.
- **Severity weights are configurable data**, not hardcoded — users can re-tier/disable a check and the score recomputes.
- Frame scores as **guidance, not gospel** (Screaming Frog is explicit that priority lacks context).

## 6. Actionability

- **Three-part panel per finding: what it is / why it matters / how to fix** — the universal winning structure. Written designer-friendly, copy-paste-able.
- **Drill from finding → exact affected URLs**, filterable.
- **Promote-to-backlog**: a button that writes a finding straight into `marketingIdea` (today the engine and the ideas list are visually adjacent but disconnected — a designer must hand-copy).
- **Wire citation-check into the page score** (today it's a separate manual tool; flagged claims should affect E-E-A-T/content scoring).
- **Content fixes in both modes**: prescriptive term targets (Surfer-style) _and_ coverage-gap suggestions (Clearscope-style).

## 7. UX

- **Tabbed category navigation** + a single color-coded Health Score (red error / yellow warning / blue notice).
- **Quick-wins lane + thematic sub-reports** (Crawlability, CWV, Internal Linking…) instead of one flat dump.
- **Guided "missions" workflow** — ordered, small tasks — for the non-SEO designers who use this.
- **Resolution tracking**: hide/snooze (excluded findings stop affecting the score), a restore tab, and **audit-over-audit deltas** to prove progress.
- **Label data provenance** (GSC field data vs a lab CWV number) so the team trusts each value.

## 8. Reliability guardrails (from the tooling pass)

- **TextFocus was 100% down this session** (every call, even zero-credit ones, errored). It holds the highest _unbuilt_ value, but the build must treat it as **unverified**: a health-check before use + graceful fallback to direct HTML parsing / GSC. Never a hard dependency.
- TextFocus `tf_seo_bulk` / `tf_geo_bulk` / `tf_competition` are **async/webhook** — integrating them needs a callback endpoint, not request/response.
- **Fix the 28-day GA4 vs 90-day GSC window mismatch** that currently skews any join.

## 9. Phased build

**Phase 0 — Quick wins (no new infra):**
- **Submit the missing sitemap to GSC** (the site generates one; GSC exposes `submit_sitemap`). _Immediate, confirmed finding._
- Wire **GA4 engagement/conversion metrics into the page score** (distinguishes "ranks well but fails users" from pure ranking problems).
- Fix the GSC/GA4 window mismatch.

**Phase 1 — The audit engine + finding model (the core, no TextFocus dependency):**
- Per-page **fetch + parse**; implement the **on-page**, **structured-data** (direct JSON-LD), and **indexation** (GSC URL Inspection + `check_indexing_issues`) checks.
- The **unified finding model**, the **Health Score**, and the **what/why/how-to-fix** UI with drill-to-URL.
- **Promote-to-backlog** + wire **citation-check** into scoring.

**Phase 2 — Search-data enrichment:**
- GSC **period-comparison** → regression/win detection (flag pages _losing_ rank — often the highest ROI).
- GA4 **SEO → conversion loop** (organic sessions/leads joined to the GSC keyword data).
- **Keyword-cannibalization** detection (the suite already has page×query data).

**Phase 3 — TextFocus enrichment (behind the health-check + fallback):**
- On-page audit at route scale (`tf_seo_bulk`), content coverage-gap (`tf_semantic`), internal-link/orphan graph (`tf_links`), CWV (`tf_perf`), keyword volume/difficulty (`tf_keyword`, `tf_related`, `tf_competition`).

**Phase 4 — GEO module (new axis):**
- On-page **AI-readiness** checks (direct-answer-first, FAQ Q&A, quotable cited stats, Author schema, freshness) + **AI-crawler access audit** (`tf_robotstxt`: are GPTBot/Claude-Web/PerplexityBot blocked?).
- Optional: AI-citation / share-of-voice detection (needs a GEO data source).

## 10. Open decisions for the user

1. **Audience scope** — is this strictly for the GoInvo team's own designers (favors the "missions" guided workflow), or also a client-facing deliverable (favors exportable reports)?
2. **Crawl scope** — audit only the curated CMS/page routes, or a full-site crawl?
3. **TextFocus** — invest in making it reliable (it's the biggest unbuilt-value source), or build Phases 1–2 on the verified GSC/GA4 + direct HTML parse and treat TextFocus as bonus?
4. **Build order** — start with Phase 0 quick wins immediately, or design the Phase 1 finding-model/UX first so quick-win output lands in the new shell?

## 11. Decisions (locked 2026-06-05)

- **Build order:** Phase 0 quick wins **and** the Phase 1 finding-model / audit-engine shell together ("both at once") — stand up the new finding model + Health Score UI so even the quick-win output lands in the new structure, no rework.
- **TextFocus:** Incorporate it (behind a health-check + HTML-parse/GSC fallback — never a hard dependency). **Its API keys must be uploaded to Vercel** for the MCP/REST integration to work; it was unreachable this session, almost certainly for that reason. Build Phases 1–2 so they don't block on it, but wire it in where it adds the on-page/GEO/CWV/internal-link checks.
- **Audience:** Internal designers **and** client-facing → build the guided "missions" workflow **and** exportable, shareable audit reports with data-provenance labels.

## 12. SEO-expert persona panel — integrated findings (2026-06-05)

Four web-search-armed experts reviewed the suite: a **Technical SEO architect**, a **Content & Topical-Authority strategist**, a **GEO / AI-Search specialist**, and an **SEO Measurement & Growth lead**. Their strongest recommendations converge hard.

### The three shifts they agree on
1. **GEO / AI-search is the strategic center — pull it forward from Phase 4 to Phase 1.** GoInvo's moat (original, cited healthcare research) is exactly what AI answer engines surface, but AI crawlers don't execute JS and healthcare is YMYL (highest trust bar). The parse-based GEO checks reuse the existing engine (the `'geo'` finding category is declared but never emitted) — low-cost, high-strategic-value.
2. **Move scoring from traffic to business outcomes.** Nothing in the score knows which pages drive discovery calls / RFPs. Add a **Business-Value Opportunity Score** (GA4 key-events × GSC). One-hour prerequisite: register GoInvo's contact-form / RFP-CTA actions as GA4 **key events**.
3. **The per-page fetch-parse model is blind to graph- and render-level issues.** Add (a) a **raw-HTML-vs-hydrated-DOM render diff** (what AI crawlers + Googlebot's first wave see) and (b) **one lightweight crawl pass** — together they unlock render-gap, orphan, redirect-chain, and sitemap↔indexed↔crawled coverage findings the current model structurally cannot produce.

### Corrections to the plan as written
- **FAQ rich results are being retired (May 2026)** — the structured-data check must NOT reward `FAQPage` for rich-result eligibility; FAQ markup is still useful for AI extraction → score it under GEO.
- **Core Web Vitals: use CrUX field data (PageSpeed Insights API, free) as PRIMARY**, not TextFocus lab — the plan had it backwards. Label provenance (field vs lab).
- **Add `Dataset` schema checks** — GoInvo's open data is a citation magnet AI rarely sees in this space.
- **Wire the existing citation-checker into scoring** (E-E-A-T / GEO) — the panel makes it the linchpin of credibility.

### Re-prioritized additions (de-duped; persona in brackets)

**Phase 1 — parse-based, highest leverage, no new infra:**
- **E-E-A-T / Author-schema / citation-density scoring** [Content, GEO, Tech] — HIGH/M. Byline + linked bio + `Person`/`Author` schema + outbound citations to authoritative (NIH/CDC/PubMed/.gov/.edu) sources; pipe unsourced claims through the existing citation-check. Top YMYL lever + GEO foundation.
- **On-page AI-readiness checks → emit `geo` findings** [GEO, Tech] — HIGH/M. Direct-answer-first lead, quotable stats WITH inline source, FAQ Q&A pairs, tables/lists, chunkability, freshness.
- **AI-crawler access audit** [Tech, GEO] — HIGH/S. Parse robots.txt + CDN live-probe; ERROR if a search/citation bot (OAI-SearchBot, PerplexityBot, ClaudeBot, Googlebot/Bingbot) is blocked; notice for training bots (GPTBot, Google-Extended).
- **Raw-vs-hydrated render diff** [Tech, GEO] — HIGH/M. Dual fetch (raw + Puppeteer); flag content/links/headings/schema present only after hydration. Validates the SSR assumption per route.
- **AI-helpful schema expansion + validation** [GEO, Tech] — HIGH/S-M. Add `Dataset`/`Person`/`BreadcrumbList`; validate required props on Article/Organization; demote FAQPage from rich-results to GEO.
- **Position-adjusted, AIO-aware CTR-gap quick-win lane** [Measure] — HIGH/Low. Actual vs expected CTR by position, segmented by AI-Overview presence → title/meta-rewrite list. Cheapest high-yield win.
- **Keyword cannibalization** [Content, Measure] — HIGH/M. Pure analysis of GSC page×query already pulled — no new data.
- **hreflang / i18n correctness (EN↔ES)** [Tech] — MED-now/S. Reciprocal return tags, `es-ES` not `es-SP`, x-default, canonical-vs-hreflang conflict. Live now the Spanish page shipped.
- **Indexability edge-cases** [Tech] — MED/S. `X-Robots-Tag` header noindex, mixed content (legacy CloudFront assets), mobile parity — from headers/sub-resources already fetched.

**Phase 2 — search-data + crawl:**
- **Business-Value Opportunity Score** (GA4 key-events × GSC) [Measure] — HIGH/M. The primary-score reframe. Prereq: GA4 key events.
- **Search→lead funnel** (impr→click→engaged→lead) [Measure] — HIGH/M.
- **Conversion-rate checks on service/landing pages → new `conversion` category** [Measure] — HIGH/S-M. Feeds the existing A/B system.
- **Content decay / freshness detection** [Content] — HIGH/M. GSC period-comparison; gate "refresh" on substantive change.
- **Regression detection tied to deploys** [Measure, Content] — HIGH/M. Annotate drops against the git/deploy timeline + Google-update calendar (the suite is in-repo).
- **Site-graph crawl** (redirect chains, broken links, orphans, depth) [Tech] — HIGH/M-L. The one new infra; unlocks the graph findings.
- **Sitemap↔indexed↔crawled coverage reconciliation** [Tech] — HIGH/S-M.
- **CWV from CrUX field (PageSpeed API)** [Tech] — HIGH/S.
- **Search-intent classification per query** [Content] — HIGH/M.
- **Internal-linking topic-cluster graph** [Content] — MED/M-L.

**Phase 3-4 — enrichment + the measurement loop:**
- **AI-citation / share-of-voice tracking** (DIY v1: GSC-seeded prompts × LLM/search APIs; v2: Profound / Ahrefs Brand Radar / Semrush / Otterly) [GEO, Measure] — HIGH (closes the GEO loop)/L. Track trends over a fixed prompt panel, not absolutes.
- **Semantic-gap / coverage scoring vs SERP** [Content] — MED-HIGH/L. TextFocus or own SERP parse.
- **AI-bot hit monitoring** (Vercel/CloudFront logs by UA) [GEO] — MED/M.
- **Keyword volume/difficulty enrichment** [Measure, Content] — MED/M.
- **Competitor / SERP-feature SOV for money queries** [Measure, GEO] — MED/M-H.
- **Client-ready ROI reporting / exports** [Measure] — MED/M. Matches the client-facing decision.
- **`llms.txt`** generate + check [GEO] — LOW (honest: no proven citation lift yet; cheap + on-brand)/S.
- **Content-brief generation from GSC queries** [Content] — MED/M.

### Recommended next build (on top of the shipped Phase-1 engine + UI)
1. **The GEO / AI-readiness pack** — E-E-A-T + on-page AI-readiness + AI-crawler access + AI-helpful schema. All parse-based, emits the unused `geo`/`eeat` findings; GoInvo's strategic center. Phase 4 made concrete and pulled to the front.
2. **The two cheap GSC quick-wins** — the CTR-gap lane + cannibalization (no new data).
3. **The render-diff + lightweight crawl** — the architectural unlock for graph/render findings.
4. **The Business-Value score** — after the GA4 key-events config.
