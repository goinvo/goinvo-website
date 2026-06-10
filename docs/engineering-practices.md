# Engineering Practices

Durable practices for this codebase, and how we track outstanding work. These are drawn from
real incidents — they are the rules that would have caught those issues earlier.

## Where work is tracked

- **Outstanding work / known issues → [GitHub Issues](https://github.com/goinvo/goinvo-website/issues)**,
  labeled by domain (`tech-debt`, `analytics`, `seo`, `infra`). Anything that "still needs work"
  gets an issue, so it can't silently rot in an uncommitted branch.
- **Durable lessons + architecture decisions → this file.**
- **Operational facts / deploy gotchas → `CLAUDE.md`** (loaded every session).

## Practices

### 1. Validate a data source before you build on it
Confirm a source's volume, coverage, and reliability *before* building a feature or a decision on
it. *(2026-06: an engagement feature was built on GA4 per-variant data that turned out to be ~5%
complete — third-party blockers strip the client tag. Validate first.)*

### 2. One writer per metric
A stored metric/field has exactly one source of truth that writes it. Two systems writing the
same field race and clobber. *(2026-06: the GA4 readout overwrote the Vercel-sourced A/B counts
because both wrote the same signal field.)*

### 3. First-party for decisions; third-party for the hub
Decisions (e.g. which A/B variant wins) run on first-party data — a same-origin beacon isn't
blockable. Third-party tools (Google Analytics) are the cross-property reporting hub; know their
blocking gap (~95% for our audience) and never decide on a blocked source. Recover third-party
coverage **server-side** (Measurement Protocol) rather than fighting blockers in the browser.

### 4. Test the dormant paths, not just the happy one
A test that exercises only the active path lets latent bugs sit in secondary/dormant code until a
feature trips over them. *(2026-06: a host-filter + window-mismatch bug sat in a GA4 route the
original A/B test never exercised.)*

### 5. Verify claims against the data before asserting them
For diagnoses, pull the actual numbers/code first — don't assert a mechanism from intuition.
Adversarially verify (a second look that tries to *refute*) before shipping a conclusion.

### 6. Verify fixes on PROD, not just the local dev server
The dev server carries uncommitted code, so a fix split across two files can look done locally
while half-shipping. *(See `CLAUDE.md` → Critical lessons.)*

## Architecture Decision Records

### ADR-001: A/B measurement is first-party authoritative; GA4 is fed server-side
**Context.** GA4's client tag is third-party and ad/privacy blockers strip it — for our audience
it captured ~5 of ~105 real exposures. Vercel Web Analytics doesn't forward custom events to us.

**Decision.**
- The **first-party beacon** (`/api/marketing/analytics/collect` → Vercel KV → drain-cron →
  `marketingPerformanceSignal`) is the **authoritative** source for A/B exposure/conversion counts
  *and* engagement (time-on-page, bounce). Same-origin, so it isn't blocked.
- **GA4** receives the experiment events **server-side** via the Measurement Protocol forward
  (from `/collect`), recovering the blocked ~95%, so GA stays the reporting hub with accurate A/B
  numbers. To avoid double-counting, the client `gtag('event')` is skipped for experiment events
  (MP is their single path); general events + the `user_properties` segmentation tag keep firing
  client-side.

**Consequences / caveats.**
- Activating the GA4 forward requires `GA4_MP_API_SECRET` (issue #20). Inert until set.
- GA4 session/user metrics for the blocker-affected experiment cohort are **approximate**
  (cookieless visitors share a per-variant fallback client_id) — trust the first-party counts for
  decisions.
- Engagement accumulates from deploy forward (no backfill); historical per-variant bounce/time was
  never captured reliably.
