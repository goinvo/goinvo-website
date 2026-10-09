# Marqueta as strategist — slice 1 live runs (2026-10-05)

Local dev server against the real sources, model (`claude-opus-4-8`) and the private dataset.
Counts and timings only; the intent and the sitrep are private strategy and are not recorded here.

## Terrain scan (`/api/marketing/strategy/recon`)

| run | wall time | FDA | App Store | HN | PubMed | web (kept / dropped) | web quotes confirmed | pains | sitrep by | result |
|-----|-----------|-----|-----------|----|--------|----------------------|----------------------|-------|-----------|--------|
| dry 1 (before fixes) | 262 s | **HTTP 404** | 72 | 36 | 15 | — | — | 0 | rules | grouping cut off at 6k output tokens |
| dry 2 (after fixes)  | 161 s | 40 | 72 | 36 | 15 | 8 / 0 | 5 of 8 | 8 | model | ok |
| real (stored W41)    | 228 s | 40 | 72 | 36 | 15 | 8 / 0 | 6 of 8 | 8 | model | ok, stored, heartbeat written |

Signals sent to the model after per-source caps (20) and dedupe: 75 structured + 8 web = 83.

What the first run caught, and the fix:
- openFDA returns **404 for "no matches"**, and its data lags 6+ weeks: no "use error" report
  received in the last 30 days was published yet (the Aug–Oct window held 2,323). Window → 75 days
  with dedupe; 404 → empty.
- Asking for up to 15 web quotes overflowed 6,000 output tokens. Capped at 8 quotes + 8 pains,
  `maxTokens` 10,000.
- Quote checks now share one 25 s deadline (the stored run predates this; it ran batches of 4).

## Intent draft (`scripts/seed-strategy-intent.ts --write`)

24 s; version 1, 3 objectives, no approval blockers. Grounded in the live records (weekly hours
from Settings, the runway record) plus the private seed notes.

## Slack rendering of the stored records (limits: 50 blocks, 3,000 chars per text)

| card | blocks | longest text | bytes |
|------|--------|--------------|-------|
| terrain | 8 | 807 | 4,699 |
| sitrep | 7 | 819 | 2,935 |
| Monday lines | 2 | 572 | 757 |
| intent | 8 | 1,425 | 4,065 |
