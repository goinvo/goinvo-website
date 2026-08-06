# Clinical AI Pilot Pre-Mortem — Worksheet + Facilitator's Kit (DRAFT)

Two artifacts. The **scorecard** stays ungated (it's the forwardable growth loop —
execs circulate one-pagers, not PDFs behind forms). The **facilitator's kit** is the
email gate: the person who wants to *run* the session is the real lead.

---

## Artifact 1 — The Scorecard (one page, ungated, print-ready)

> Design intent: this sheet IS the proof of craft. It should look unmistakably
> GoInvo — the design quality of the printed page is the studio's portfolio in
> miniature. Letter + A4. Works in grayscale. Scannable in 10 seconds.

**Header:**
THE CLINICAL AI PILOT PRE-MORTEM
It is 18 months from now. Your AI pilot is dead. What killed it?

**Instructions line:**
One hour, whole team, no blame. Score each failure mode: how plausibly did it kill
the pilot? **0** not us · **1** watch it · **2** active risk · **3** this is what killed us

| # | Failure mode | The tell (ask it out loud) | Score 0–3 |
|---|---|---|---|
| 1 | Workflow doesn't survive reality | Does the happy path survive a real clinician's first interruption, override, or edge case? | |
| 2 | Clinicians route around it | Does a shadow workflow exist — the sticky note, the side spreadsheet, the export-to-Excel? | |
| 3 | Black box at the moment of decision | Can a skeptical clinician see *why* the system said what it said, before acting on it? | |
| 4 | Patient burden never measured | Has anyone counted the taps, trips, and reading-level demands pushed onto the patient? | |
| 5 | Day 1 works, day 200 collapses | What has to keep going right — integrations, configs, monitoring, retraining — for the demo to stay deployed? | |
| 6 | Maps the org chart, not the care | Whose convenience does the design optimize: the care, or the reporting line that funded it? | |
| 7 | No path to shippable | Is there a working prototype in a real environment — or a deck? | |
| 8 | Illegible data layer | Is the data standards-based (FHIR) and legible, or a bespoke schema only one vendor can read? | |

**Footer block:**
- **Cause of death** (one sentence, from your top score): ______________________
- **Three cheapest interventions that change the ending:** 1) ____ 2) ____ 3) ____
- Small print: Method: prospective hindsight (Klein, HBR 2007). Evidence for each
  failure mode: goinvo.com/vision/clinical-ai-pilot-pre-mortem
- Logo + "Designed by GoInvo. Free to use, share, and adapt." (CC BY — on brand
  with the open-source ethos; also how it spreads with attribution.)

---

## Artifact 2 — The Facilitator's Kit (email-gated download)

Contents (single PDF, ~6 pages):

1. **Cover** — same visual system as the scorecard.
2. **The 60-minute agenda**
   - 0:00 Set the frame. Read aloud: "It is 18 months from now. The pilot is dead —
     quietly defunded, worked around, unrenewed. Nobody failed; the system did.
     Our job is the autopsy, in advance."
   - 0:05 Silent scoring — everyone scores all 8 modes alone first (prevents
     anchoring on the loudest voice; this is the point of a pre-mortem).
   - 0:15 Round-robin — each person names their #1 killer and the evidence they'd
     expect to see first ("what would we notice at month 3?").
   - 0:35 Converge — team agrees on top 2 modes; write the cause-of-death sentence.
   - 0:45 Interventions — three cheapest changes that rewrite the ending; assign an
     owner and a "tell we'll re-check" date for each.
   - 0:55 Photograph the sheet. Done.
3. **Scoring guide** — one paragraph per failure mode: what a 1 vs a 3 looks like in
   practice, with the public evidence citation for each (from the article).
4. **Board-slide template** — a single pre-formatted slide:
   "We pre-mortemed [pilot] on [date]. Primary risk: [mode]. Mitigations in flight:
   [3 items with owners]. Re-check: [date]."
   (This is the artifact the CMIO actually needs — diligence they can show. It maps
   to Joint Commission/CHAI responsible-AI governance language.)
5. **Facilitation notes** — who to invite (a working clinician who touches the tool
   is non-negotiable; the vendor is not invited), how to keep it blameless, what to
   do when scores diverge wildly (that disagreement IS the finding).
6. **Back cover** — "If the pre-mortem found a mode you can't design your way out of:
   the Pre-Mortem engagement — 4–6 weeks, fixed scope, ends in a failure-mode map
   and a working prototype of the fix." + contact.

---

## What is deliberately NOT in either artifact (the paid layer)

- How to *fix* each failure mode (workflow redesign method, trust-surface patterns,
  evidence-display patterns, shippable-path scoping) — that's the engagement.
- The full Design Diagnostic process (Reality Check → Design to Learn → Design the
  Future → Product Blueprint) beyond a one-line mention.
- Any client work not already public on goinvo.com. Nothing from the private
  outreach dataset. All stats are from published, cited sources.
