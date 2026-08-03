# Lead Magnet: Clinical AI Pilot Pre-Mortem — strategy + build plan

Status: **CONTENT DRAFT, awaiting Shirley's review.** Nothing public yet.
Started 2026-08-03 after the pipeline-first decision (Slack, Juhan approved).

## The package

| File | What it is |
|---|---|
| `clinical-ai-pilot-premortem-draft.md` | The ungated web article (the whitepaper itself), fully cited |
| `premortem-worksheet-draft.md` | Scorecard (ungated one-pager) + Facilitator's Kit (email-gated PDF) |

## Format strategy (from competitive research, 2026-08-03)

- **Ungated article + ungated one-page scorecard + gated facilitator's kit.**
  Rationale: every vendor competitor gates a survey/readiness PDF (Qventus, Aidoc);
  DiMe's free assessment is org-level, not project-level. The forwardable one-pager
  is the growth loop; the email gate goes on the thing only a real lead wants (the
  kit to actually run the session). Failure-framing beats readiness-framing for the
  buyer ("we pre-mortemed it" = diligence; "we're not ready" = career risk).
- **Positioning whitespace:** no design studio offers any downloadable instrument on
  clinical-AI failure. The most-cited cause of death (adoption/workflow — "the
  technology worked, adoption didn't") is the one failure mode a UX studio has
  standing to own.
- **Guardrail (per Shirley):** public info + published case studies only. The paid
  layer (HOW to fix each mode, the Design Diagnostic process detail) stays out of
  both artifacts. Nothing from the private outreach dataset.

## Open decisions (Shirley)

1. **Publish the F1–F8 taxonomy?** The 8 failure modes exist only as internal
   strategy content (StrategyBriefWorkspace / internal marketing-plan page). This is
   their first public articulation. Recommendation: publish — mode NAMES + tells are
   diagnosis-by-name; the fix methodology stays paid. But it's genuinely the
   "evergreen IP," so it's your call (option: trim to the public 5-risk radar
   language from /services/design-diagnostic instead).
2. **Byline** — GoInvo signs work with named humans + dates. Who authors this?
3. **Slug/placement** — proposed: `/vision/clinical-ai-pilot-pre-mortem` (vision
   library = the discoverable, citable shelf) + prominent link from
   `/services/design-diagnostic`. CTA on both pointing at the Pre-Mortem engagement.
4. **Scorecard license** — proposed CC BY (spreads with attribution, on brand).

## Build status

**Lead magnet system v1 — BUILT (this branch, awaiting Juhan's sign-off):**
- `marketingLeadMagnet` managed type (title/slug/status/articlePath/gatedAsset PDF/
  emailOctopusTag/offerKey/`createOutreachContacts` toggle) — full registry + REST
  (`/api/marketing/doc/marketingLeadMagnet`) + server-enforced status enum.
- `POST /api/newsletter/subscribe` — first-party capture: origin allowlist, honeypot,
  per-IP rate limit (fail-open by design: a dropped real lead is worse than a spam
  burst; EO upsert + deterministic contact ids are idempotent), 16KB bounded body.
  Fail-LOUD when unconfigured (503) or EO rejects (502). On success: EO upsert w/
  magnet tag → cold `marketingContact` + identity claims in the PRIVATE outreach
  dataset (per-magnet opt-out; team members excluded; same identity hashing as
  intake so any source converges on one row) → best-effort GA4 MP
  `newsletter_signup` → returns `downloadUrl` of the gated asset.
- Studio Dashboard **Lead Magnets panel**: per-magnet signup counts (from outreach
  contacts' `attributionChannel`) + "EmailOctopus · Not connected" pill
  (`GET /api/marketing/lead-magnets/status`).
- Tests: `tests/marketing-lead-magnet.test.ts` (registry, pure signup core, route
  security incl. honeypot/origin/422/503/502/opt-out/team-exclusion).
- Env still needed (Shirley): `EMAILOCTOPUS_API_KEY` + `EMAILOCTOPUS_LIST_ID`
  (.env.local + Vercel). Everything 503s loudly until set.
- Mark `newsletter_signup` as a GA4 key event once events flow.

## Build plan (remaining, after content approval)

2. **Page build** — article page in the site design system; scorecard as a designed
   print sheet (PDF + print CSS); gated kit download flow posting to
   `/api/newsletter/subscribe` with `magnetSlug`. Also swap the EO embed forms
   (`SubscribeForm`/`NewsletterForm`) to the first-party endpoint. Public-facing →
   needs Shirley's review before merge (push policy).
3. **Verification** — run the verify-sources pass on all citations before publish
   (two flagged: HIMSS "18% ready" got a 403 (unverified — currently NOT cited);
   the "KLAS 23%" stat circulating in vendor blogs is untraceable — NEVER cite).
   Bain/KLAS Oct 2025 (source #5) needs its URL confirmed pre-publish.
4. **Distribution** — outreach door-opener (Juhan's warm emails link the article /
   attach the scorecard); newsletter announcement; capture modules on
   determinants-of-health + open-source pages pointing at the kit.
5. **Measurement** — scoreboard metrics: signups/month by source, kit downloads,
   discovery calls/month. (Baseline 2026-07: ~6 qualified discovery clicks/mo,
   signups unmeasured.)

## Research provenance

Workflow run `wf_f6cb5c38-9e6` (2026-08-03): 3 agents (external evidence /
internal proof-mining / buyer language + competitive scan). Full structured results:
session scratchpad `tasks/wehdakxbi.output`. Notable citation cautions preserved in
the article's Sources section.
