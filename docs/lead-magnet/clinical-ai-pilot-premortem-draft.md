# The Clinical AI Pilot Pre-Mortem

*Assume the pilot is dead. Find what killed it — while it's still cheap to fix.*

> **DRAFT for review — not published.** Byline needs real humans (GoInvo signs its work).
> Citation cautions are flagged inline and listed in `README.md`. Run the verify-sources
> pass before this goes anywhere public.

---

**The short version:** Most clinical AI pilots don't die because the model was wrong.
They die because the pilot was designed to prove the technology works — not to prove
care can run on it. A pre-mortem is a one-hour exercise that names the likely cause of
death early, while the fix is still a design change and not a write-off. The worksheet
is free. Run it on your own pilot.

---

## Healthcare is in pilot purgatory

The numbers are not kind.

Ninety-five percent of organizations investing in generative AI report zero measurable
return — not because the tools were cancelled, but because they never changed a P&L
line.¹ Gartner predicted at least 30% of generative AI projects would be abandoned
after proof of concept by the end of 2025.² By March 2025, 42% of companies were
abandoning most of their AI initiatives — up from 17% a year earlier.³

Healthcare is worse.

Fewer than 2% of clinical AI models make it past prototyping to the bedside.⁴
In the most mature category health systems have — ambient clinical documentation —
pilots still outnumber full rollouts two to one.⁵ Among 43 US health systems surveyed
in JAMIA, every single one was piloting ambient documentation. Only 53% called it a
success.⁶

Meanwhile 71% of US hospitals now run predictive AI inside the EHR.⁷ The pilots are
everywhere. The production wins are not. Industry press has already named the
condition: pilot purgatory.⁸

Your board has read these numbers. That's why the question in the room has changed
from "what's our AI strategy?" to "what did we get for it?"

## It's rarely the model

Here is the pattern nobody puts on the slide: when a clinical AI pilot stalls, the
model usually did roughly what it claimed. What failed was everything wrapped around
it.

The canonical case is public. When Michigan Medicine externally validated a widely
deployed proprietary sepsis prediction model on 27,697 of its own patients, the model
missed 67% of sepsis cases while generating alerts on 18% of all hospitalized
patients.⁹ Not a broken algorithm — a tool validated somewhere else, dropped into a
new population, drowning clinicians in alerts. The failure lived in validation,
workflow, and trust. The demo never sees those.

The research agrees on where pilots actually die. RAND's root-cause analysis of AI
project failure puts "stakeholders misunderstood or miscommunicated the problem the
AI needed to solve" at the top of the list — ahead of any technical cause.¹⁰ Health
systems surveyed in JAMIA name immature tools (77%), financial concerns (47%), and
regulatory uncertainty (40%), alongside low clinician adoption.⁶ And the sharpest
diagnosis comes from inside the industry: most healthcare AI proofs of concept
"are designed to prove that the technology works and not to change the way a team or
a business operates."⁸

The technology worked. Adoption didn't. That sentence is the autopsy report for most
of the invisible graveyard of clinical AI tools — and it describes a design failure,
not a data-science failure.

## The eight ways clinical AI pilots die

Twenty years of shipping clinical software has taught us that failures repeat. The
same eight modes, over and over, in different costumes. Each one comes with a tell —
a falsifiable question you can ask about your own pilot today.

**1 · The workflow doesn't survive reality.**
The happy path was designed for the demo, not the messy clinic floor.
*The tell: does it hold up under the first interruption, override, or edge case of a
real clinician's day?* This is why ambient AI scribes that shine in quiet outpatient
visits stall in noisy, multi-speaker acute settings — the pilot's success was a
property of the pilot's context.¹¹ When we redesigned CodeRyte's NLP-assisted medical
coding into a full hospital coding system, the 200% efficiency gain at Memorial
Hermann came from re-imagining the coder's queue and workflow around the model — not
from more model accuracy.¹²

**2 · Clinicians route around it.**
Users don't file complaints. They build shadow workflows — the sticky note, the side
spreadsheet, the export-to-Excel that means the tool already lost.
*The tell: go look for the workaround. If it exists, the pilot is dying.* The
counter-example is designable: Ipsos's Facto AI platform reached 90%+ internal
adoption and 700,000+ prompts a month after the experience was rebuilt around guided
workflows and embedded prompts — adoption was the design target, not a hoped-for
side effect.¹³

**3 · The AI is a black box at the moment of decision.**
*The tell: can a skeptical clinician see why the system said what it said — before
they're asked to act on it?* "Trust the model" is not a clinical argument. We designed
AHRQ's CDS Connect, the national repository for clinical decision support, around
human-readable clinical logic with explorable evidence¹⁴ — and InfoBionic's FDA-cleared
cardiac monitoring around making machine-detected arrhythmias legible and reviewable
next to patient-detected ones.¹⁵ Inspectability is buildable. Its absence is a choice.

**4 · Patient burden was never measured.**
Every consent screen, extra tap, and reading-level demand quietly taxes the patient.
*The tell: has anyone counted?* Enrolling 700,000+ participants into the NIH All of
Us research program came down to exactly this — consent and onboarding designed for
people biomedical research usually leaves out.¹⁶

**5 · It works on day 1 and collapses by day 200.**
Integrations, configs, handoffs, model monitoring, retraining — the operational bill
arrives after the pilot ends. *The tell: trace what has to keep going right for the
demo to stay deployed.* The capacity to pay that bill is unevenly distributed: 86% of
system-affiliated hospitals run predictive AI versus 37% of independents⁷ — and 74%
of CIOs name dependence on their EHR vendor's roadmap as a top obstacle.¹⁷

**6 · It maps the org chart, not the care.**
Pilots get scoped by whichever department had budget and enthusiasm — which is how a
health system ends up running 25 AI pilots at once¹⁸ while the actual care pathway
stays untouched. *The tell: whose convenience does the design optimize — the care, or
the reporting line that funded it?* RAND found misaligned problem selection is the
leading root cause of AI project failure.¹⁰

**7 · There was never a path to shippable.**
PoC theater: a pilot that could not have become production no matter how well it went,
because nobody scoped the integration, the procurement path, or the budget line that
scale would require. Vendors know this one as death by pilots.¹⁹
*The tell: is there a working prototype in a real environment — or a deck?*

**8 · The data layer is illegible.**
Bespoke schemas rot. Models starve. Gartner's first-listed cause of GenAI abandonment
is poor data quality²; RAND's practitioners rank data problems second only to problem
selection.¹⁰ *The tell: is the data standards-based and legible — FHIR, or a format
only one vendor can read?* This is why we spent years helping build the Standard
Health Record and getting it adopted into the FHIR standard as an oncology profile.²⁰

## Run the pre-mortem

The pre-mortem is a standard tool from decision research: instead of asking "what
could go wrong?", the team assumes the project **has already failed** and works
backward to explain why.²¹ Prospective hindsight makes the awkward risks speakable —
nobody has to be the pessimist in the room, because failure is the premise.

Ours takes one meeting:

1. **Set the frame (5 minutes).** It is 18 months from now. The pilot is dead —
   quietly defunded, worked around, unrenewed. No one is to blame; the system is.
2. **Score the eight modes (30 minutes).** For each failure mode, ask its tell.
   Score 0–3: *not us / watch it / active risk / this is what killed us.*
3. **Write the cause of death (15 minutes).** One sentence, from the top-scoring
   mode. Then the three cheapest interventions that would change the ending.

The output is one page. It drops into a board deck as evidence of diligence, and it
speaks the same language as the Joint Commission and CHAI responsible-AI guidance
your governance committee already cites.²²

The scorecard is free and ungated — print it, run it, forward it. If you want the
facilitator's kit (session agenda, scoring guide, board-slide template), we'll trade
it for an email address.

## Why we give this away

Naming the failure mode is diagnosis. Fixing it is design — and that part is genuinely
hard: rebuilding the workflow so the model's output lands inside a clinician's
30-second decision, making the evidence inspectable, finding the path to shippable.
That's the work we do, and our receipts are public: the case studies cited above are
on this site, most of the underlying work is open source, and you can verify all of it
before you ever talk to us.

If your pilot's pre-mortem turns up a failure mode you can't design your way out of
alone, that's the conversation: a fixed-scope, 4–6 week engagement that ends in a
failure-mode map and a **working prototype of the fix** — not a strategy deck.

It's 18 months from now. The pilot is alive. What changed?

---

## Sources

1. MIT Media Lab / Project NANDA, *The GenAI Divide: State of AI in Business 2025* — 95% of organizations report zero measurable return on GenAI investment; ~5% of pilots reach production with P&L impact. (Phrase carefully: zero ROI ≠ cancelled.) https://mlq.ai/media/quarterly_decks/v0.1_State_of_AI_in_Business_2025_Report.pdf
2. Gartner press release, July 2024 — prediction that ≥30% of GenAI projects will be abandoned after PoC by end of 2025; causes: data quality, risk controls, cost, unclear value. https://www.gartner.com/en/newsroom/press-releases/2024-07-29-gartner-predicts-30-percent-of-generative-ai-projects-will-be-abandoned-after-proof-of-concept-by-end-of-2025
3. S&P Global Market Intelligence (via CIO Dive), March 2025 — 42% abandoned most AI initiatives, up from 17%; average org scrapped 46% of PoCs. https://www.ciodive.com/news/AI-project-fail-data-SPGlobal/742590/
4. van de Sande et al., *npj Digital Medicine*, 2024 — "less than 2% of AI models reach beyond the prototyping phase." https://www.nature.com/articles/s41746-024-01064-1
5. Bain/KLAS survey, October 2025 — ambient documentation: ~1 in 5 providers at full rollout vs 2 in 5 piloting.
6. Poon et al., *JAMIA*, 2025 — 43 health systems: 100% pursuing ambient documentation, 53% high success; barriers: immature tools 77%, financial 47%, regulatory 40%. https://academic.oup.com/jamia/advance-article/doi/10.1093/jamia/ocaf065/8125015
7. ASTP/ONC Data Brief No. 80, September 2025 — 71% of hospitals use EHR-integrated predictive AI; 86% system-affiliated vs 37% independent. https://www.healthit.gov/sites/default/files/2025-09/hospital-trends-use-evaluation-and-governance-predictive-ai-2023-2024.pdf
8. Healthcare Brew, May 2026 — "pilot purgatory"; Komodo Health co-founders: PoCs "designed to prove that the technology works and not to change the way a team or a business operates." https://www.healthcare-brew.com/stories/healthcare-companies-trapped-ai-pilot-purgatory
9. Wong et al., *JAMA Internal Medicine*, 2021 — external validation of the Epic Sepsis Model: AUC 0.63, missed 67% of sepsis, alerts on 18% of all hospitalizations. https://pubmed.ncbi.nlm.nih.gov/34152373/
10. RAND Corporation, RRA2680-1, August 2024 — root causes of AI project failure; >80% of AI projects fail. https://www.rand.org/pubs/research_reports/RRA2680-1.html
11. Ohde et al., *npj Digital Medicine*, 2026 — ambient scribe scaling barriers across care settings. https://www.nature.com/articles/s41746-026-02554-0
12. GoInvo, *NLP software for 3M / CodeRyte* — 200% coding-efficiency gain at Memorial Hermann; 250+ hospitals. https://www.goinvo.com/work/3m-coderyte
13. GoInvo, *Ipsos Facto* — 90%+ adoption, 700K+ prompts/month. https://www.goinvo.com/work/ipsos-facto
14. GoInvo, *CDS Connect for AHRQ*. https://www.goinvo.com/work/ahrq-cds
15. GoInvo, *InfoBionic remote cardiac monitoring* — FDA approval + CE mark. https://www.goinvo.com/work/infobionic-heart-monitoring
16. GoInvo, *NIH All of Us participant portal*. https://www.goinvo.com/work/all-of-us
17. Qventus, *Beyond the Pilot: 2026 CIO report* — 74% cite EHR-vendor roadmap dependence; only 4% have scaled AI with measurable outcomes. https://www.qventus.com/resources/resource-library/cio-research-report-2026/
18. ACL Digital, 2026 — health system running 25 concurrent AI pilots; "pilot fatigue." https://www.acldigital.com/blogs/enterprise-ai-in-healthcare-2026-is-the-year-it-gets-real
19. MDisrupt — "death by pilot." https://mdisrupt.com/blog/healthtech/how-companies-can-avoid-death-by-pilot/
20. GoInvo, *Standard Health Record with MITRE* — adopted into FHIR as an oncology profile (2018). https://www.goinvo.com/work/mitre-shr
21. Gary Klein, "Performing a Project Premortem," *Harvard Business Review*, September 2007. https://hbr.org/2007/09/performing-a-project-premortem
22. Joint Commission + Coalition for Health AI (CHAI), *Guidance to Support Responsible AI Adoption Across U.S. Health Systems*, September 2025. https://www.jointcommission.org/en-us/knowledge-library/news/2025-09-jc-and-chai-release-initial-guidance-to-support-responsible-ai-adoption
