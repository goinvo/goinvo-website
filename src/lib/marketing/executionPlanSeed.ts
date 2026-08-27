/**
 * The Sep–Nov 2026 execution-plan seed catalog: the dated actions the
 * /action-plan page renders, expressed as real CMS documents.
 *
 * Two audiences, two datasets, one hard boundary:
 *  - marketingOperation docs → the PRIVATE outreach dataset. Candid framing is
 *    allowed here (decision gates, runway questions, named owners).
 *  - marketingCalendarItem docs → the PRODUCTION dataset, which is
 *    world-readable. Titles and briefs must stay neutral: no contact names, no
 *    crisis framing, nothing we would not put on a public content calendar.
 *    tests/execution-plan.test.ts enforces this with a neutrality guard.
 *
 * The catalog is a birth certificate, not a sync source: the seed script only
 * ever `createIfNotExists`, so edits made in the Studio after seeding always
 * survive a re-run, and editing this file later does NOT propagate to
 * already-created docs.
 */

import { dateInputToIso } from './dates'
import { buildCreatePayload, type MarketingFields } from './crud'
import {
  marketingOperationFingerprint,
  normalizeMarketingOperationInput,
  type MarketingOperationAutonomy,
  type MarketingOperationInput,
  type MarketingOperationKind,
  type MarketingOperationPriority,
} from './operations'
import { offerDocId } from './outreach'
import { EXEC_PLAN_CALENDAR_PREFIX, EXEC_PLAN_OP_PREFIX } from './executionPlan'

export interface SeedOperationDef {
  /** Appended to EXEC_PLAN_OP_PREFIX to form the sourceKey (and thus the _id). */
  slug: string
  title: string
  summary: string
  whyNow: string
  nextAction: string
  kind: MarketingOperationKind
  priority: MarketingOperationPriority
  autonomy: MarketingOperationAutonomy
  /** Gates/asks seed as needsHuman (with humanQuestion) so the board surfaces them. */
  status: 'queued' | 'needsHuman'
  humanQuestion?: string
  ownerName: 'Juhan' | 'Shirley'
  /** YYYY-MM-DD → dueAt via dateInputToIso (noon-anchored). */
  dueOn: string
  /** Linked marketingOffer keys → linkedRecords in the outreach dataset. */
  linkedOfferKeys?: string[]
}

export interface SeedCalendarDef {
  /** Appended to EXEC_PLAN_CALENDAR_PREFIX to form the _id. */
  slug: string
  title: string
  status: 'idea' | 'drafting'
  contentType: string
  channel: string
  publishOn: string
  brief: string
}

const ALL_OFFER_KEYS = [
  'ai-pilot-premortem',
  'human-factors-510k',
  'clinician-adoption-rescue',
  'design-eng-capacity',
  'cost-efficiency-redesign',
]

export const EXEC_PLAN_SEED_OPERATIONS: SeedOperationDef[] = [
  {
    slug: 'phase1/mark-hot-contacts',
    title: 'Mark the hot contacts in the researched list',
    summary:
      'The researched list is ranked by feasibility score, but warmth beats a model score: a handful of true believers who would take a call this week should jump the queue before wave 1 starts.',
    whyNow: 'Wave 1 begins Sep 18 — the call order needs human warmth judgment before then.',
    nextAction:
      'In Studio → Marketing → Outreach, set warmth on the people you actually know and flag hot anyone who would take a call this week.',
    kind: 'outreach',
    priority: 'urgent',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion: 'Who on this list would take your call this week? Mark them hot so they top every wave.',
    ownerName: 'Juhan',
    dueOn: '2026-09-02',
  },
  {
    slug: 'phase1/price-bands-in-writing',
    title: 'Put price bands for the five active offers in writing',
    summary:
      'The offers currently read "quoted per engagement". Real ranges qualify buyers before the call, filter out work we do not want, and answer the first question a buying committee checks.',
    whyNow:
      'Every call script and email template on /action-plan renders the price band straight from the offer docs — blank bands weaken every touch.',
    nextAction: 'Set priceBand on each of the five active offers in Outreach → Offers.',
    kind: 'decision',
    priority: 'urgent',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion:
      'What range goes on each of the five offers — and which of those are you comfortable saying out loud on a call?',
    ownerName: 'Juhan',
    dueOn: '2026-09-04',
    linkedOfferKeys: ALL_OFFER_KEYS,
  },
  {
    slug: 'phase1/weekly-cadence',
    title: 'Start the weekly cadence: Mon review batch, Tue–Thu 3–5 calls, Fri log + follow-ups',
    summary:
      'The cadence that actually tests the network: Monday research/review batch, three to five calls Tuesday–Thursday, Friday log every outcome and set the follow-ups.',
    whyNow: 'The plan only moves if calls happen every week; the cadence is the unit of execution.',
    nextAction:
      'Block the recurring hours. The "next two weeks" list on /action-plan is the working queue.',
    kind: 'outreach',
    priority: 'high',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-09-08',
  },
  {
    slug: 'gate/lead-magnet-approval',
    title: 'Gate: approve the pre-mortem lead-magnet package',
    summary:
      'The Clinical AI Pilot Pre-Mortem package (ungated article + scorecard, email-gated facilitator kit) is drafted in docs/lead-magnet/ with PRs #38 and #39 open. Phase 2 builds nothing until this is approved.',
    whyNow: 'Ship steps are scheduled from Sep 16; approval is the critical path.',
    nextAction: 'Review docs/lead-magnet/ and the two open PRs; record each decision on this operation.',
    kind: 'decision',
    priority: 'urgent',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion:
      'Approve the article + scorecard drafts; decide whether the F1–F8 taxonomy publishes or stays internal; settle the byline and the CC-BY license on the scorecard.',
    ownerName: 'Shirley',
    dueOn: '2026-09-11',
    linkedOfferKeys: ['ai-pilot-premortem'],
  },
  {
    slug: 'phase1/wave-1-calls',
    title: 'Wave 1: call the top-ranked ten warm contacts',
    summary:
      'First ten calls from the ranked call plan (warmth first, feasibility as tiebreak). Each contact has a reviewed brief, an opener, and a matched offer — the warm network finally gets tested instead of discussed.',
    whyNow: 'Everything before this was preparation; this is the test.',
    nextAction:
      'Work the top of the call plan in the Outreach tab. Log every call on the contact and schedule the follow-up before Friday.',
    kind: 'outreach',
    priority: 'urgent',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-09-18',
  },
  {
    slug: 'phase2/baseline-metrics',
    title: 'Record pre-launch baselines: signups and discovery calls per month',
    summary:
      'Capture the "before" while it still exists: newsletter signups per month by source, and qualified discovery calls per month, so the lead magnet has a measurable effect.',
    whyNow: 'Once the article ships there is no clean baseline to recover.',
    nextAction: 'Write the baseline numbers into this operation before the article publishes.',
    kind: 'measurement',
    priority: 'normal',
    autonomy: 'safeInternal',
    status: 'queued',
    ownerName: 'Shirley',
    dueOn: '2026-09-23',
  },
  {
    slug: 'gate/september-pipeline-review',
    title: 'Gate: September review — calls made, meetings booked, offers sent',
    summary: 'Four weeks in: did the cadence hold, and what did the first waves produce?',
    whyNow: 'Course-correct after one month, not after three.',
    nextAction: 'Review wave 1–2 outcomes in the Outreach tab and record the verdict here.',
    kind: 'decision',
    priority: 'high',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion:
      'Calls made vs planned, meetings booked, offers sent — keep the cadence, tighten the list, or change the offer?',
    ownerName: 'Juhan',
    dueOn: '2026-09-30',
  },
  {
    slug: 'phase1/wave-2-calls',
    title: 'Wave 2: next ten warm calls plus wave-1 follow-ups',
    summary: 'The second block of ranked calls, interleaved with every follow-up wave 1 generated.',
    whyNow: 'Momentum: the follow-up is where wave 1 converts.',
    nextAction:
      'Work the refreshed call plan and the follow-ups due strip. Log every call and set the next follow-up before Friday.',
    kind: 'outreach',
    priority: 'high',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-10-02',
  },
  {
    slug: 'phase2/warm-distribution',
    title: 'Send the shipped article and scorecard through warm-outreach emails',
    summary:
      'Gift-first distribution of the pre-mortem article + scorecard to the warm list — a reason to hear from us that is not a pitch. No popups, no gating beyond the facilitator kit.',
    whyNow: 'The article is the touch that warms the colder half of the list before their calls.',
    nextAction:
      'Use the email templates on /action-plan; personalize the opener from each contact’s brief.',
    kind: 'outreach',
    priority: 'high',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-10-09',
    linkedOfferKeys: ['ai-pilot-premortem'],
  },
  {
    slug: 'phase1/wave-3-calls',
    title: 'Wave 3: second-segment calls and re-touches',
    summary:
      'Extend past the first segment into the next-ranked cohort, and re-touch non-responders once — then stop; a second silence is an answer.',
    whyNow: 'The first segments will be worked out by mid-October; breadth keeps the funnel fed.',
    nextAction: 'Work the next segment in the call plan; one polite re-touch per non-responder, logged.',
    kind: 'outreach',
    priority: 'high',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-10-16',
  },
  {
    slug: 'phase3/security-partner',
    title: 'Choose and confirm the named security/compliance partner',
    summary:
      'Committees verify security posture first. We have working knowledge but no in-house cybersecurity expert — the honest, stronger answer is de-identified/synthetic data by default plus a named partner for the certified pieces (pen-testing, SOC 2 attestation, BAAs that mean something), with the division of labor explicit. Never overclaim: no "we are SOC 2", no CISO.',
    whyNow: 'The security page on the content calendar (Nov 11) cannot be written until the partner is real.',
    nextAction:
      'Shortlist partners, confirm one, and hand the agreed copy points to the security-page calendar item.',
    kind: 'decision',
    priority: 'high',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion: 'Which security/compliance partner do we name, and what exactly do they cover vs us?',
    ownerName: 'Juhan',
    dueOn: '2026-10-23',
  },
  {
    slug: 'gate/trough-vs-structural',
    title: 'Gate: trough vs structural — decide the Q1 posture',
    summary:
      'Decide whether the federal freeze is a trough to survive or a structural shift to reposition around. The answer changes Q1 entirely: bridge-and-wait vs permanent client-mix re-weighting.',
    whyNow: 'Two months of real pipeline data exist by end of October — enough to decide with, not guess with.',
    nextAction: 'Hold the review against September–October pipeline data; record the verdict and the Q1 posture here.',
    kind: 'decision',
    priority: 'urgent',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion:
      'Bring the four numbers only the studio can supply: % of last-3-years revenue that was federal/NIH/state/SDOH; runway at current burn; which relationships froze vs merely paused; current utilization.',
    ownerName: 'Juhan',
    dueOn: '2026-10-30',
  },
  {
    slug: 'phase3/public-price-bands',
    title: 'Decide which price bands go public on the services pages',
    summary:
      'Public price bands qualify buyers before the first call and answer the committee’s procurement question. Decide which of the five bands publish and which stay call-only.',
    whyNow: 'The pricing-guidance calendar item (Nov 18) is blocked on this decision.',
    nextAction: 'Mark each offer public or call-only; hand the public ones to the pricing-guidance calendar item.',
    kind: 'decision',
    priority: 'high',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion: 'Which of the five offer price bands are we comfortable publishing on goinvo.com?',
    ownerName: 'Juhan',
    dueOn: '2026-11-06',
    linkedOfferKeys: ALL_OFFER_KEYS,
  },
  {
    slug: 'phase3/subcontracting-primes',
    title: 'Open subcontracting conversations with three primes',
    summary:
      'Bridge revenue: subcontract design-and-engineering capacity to larger firms holding the surviving contracts. Three conversations opened is the target, not three wins.',
    whyNow: 'Prime pipelines move slowly — conversations must start before the end-of-plan review.',
    nextAction: 'Pick three primes from the network map and open with the design-eng capacity offer.',
    kind: 'outreach',
    priority: 'high',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-11-13',
    linkedOfferKeys: ['design-eng-capacity'],
  },
  {
    slug: 'phase1/wave-4-calls',
    title: 'Wave 4: refreshed-ranking sweep and follow-up clean-up',
    summary:
      'Re-run the call plan against October’s logged interactions, sweep the refreshed top of the list, and clear every overdue follow-up before the end-of-plan review.',
    whyNow: 'The end-of-plan review needs a worked list, not a half-worked one.',
    nextAction: 'Work the refreshed plan; zero overdue follow-ups by Nov 21.',
    kind: 'outreach',
    priority: 'normal',
    autonomy: 'externalAction',
    status: 'queued',
    ownerName: 'Juhan',
    dueOn: '2026-11-20',
  },
  {
    slug: 'gate/end-of-plan-review',
    title: 'Gate: end-of-plan review — pipeline vs bridge-revenue need; set Q1',
    summary:
      'End of the 12-week window. Measure the pipeline the plan produced against the bridge-revenue need, and set the Q1 plan from evidence.',
    whyNow: 'The window closes; what happens next should be a decision, not a drift.',
    nextAction: 'Compile wave outcomes, meetings, proposals, and signed work; write the Q1 plan.',
    kind: 'decision',
    priority: 'urgent',
    autonomy: 'humanReview',
    status: 'needsHuman',
    humanQuestion:
      'Did the plan produce enough qualified pipeline — and what is Q1: double down, change segments, or change the plan?',
    ownerName: 'Juhan',
    dueOn: '2026-11-30',
  },
]

export const EXEC_PLAN_SEED_CALENDAR: SeedCalendarDef[] = [
  {
    slug: 'linkedin-2026-09-09',
    title: 'LinkedIn: clinician adoption evidence post',
    status: 'idea',
    contentType: 'socialPost',
    channel: 'linkedin',
    publishOn: '2026-09-09',
    brief:
      'One shipped-work story about clinicians actually adopting a tool — evidence-first, no pitch. Draft from the work-evidence corpus.',
  },
  {
    slug: 'subscribe-endpoint',
    title: 'First-party newsletter signup endpoint',
    status: 'drafting',
    contentType: 'other',
    channel: 'website',
    publishOn: '2026-09-16',
    brief:
      'Build /api/newsletter/subscribe (server-side list provider call) so signups are instrumented and unaffected by content blockers; replaces the third-party embed.',
  },
  {
    slug: 'linkedin-2026-09-23',
    title: 'LinkedIn: failure-mode insight post',
    status: 'idea',
    contentType: 'socialPost',
    channel: 'linkedin',
    publishOn: '2026-09-23',
    brief:
      'Share one failure pattern from the pre-mortem work with a practical tell readers can run on their own product.',
  },
  {
    slug: 'premortem-article',
    title: 'Clinical AI pilot pre-mortem — article',
    status: 'drafting',
    contentType: 'article',
    channel: 'website',
    publishOn: '2026-09-30',
    brief: 'Publish the clinical AI pilot pre-mortem article (ungated). Draft in docs/lead-magnet/.',
  },
  {
    slug: 'premortem-scorecard',
    title: 'Pilot pre-mortem scorecard — printable one-pager',
    status: 'drafting',
    contentType: 'other',
    channel: 'website',
    publishOn: '2026-09-30',
    brief: 'One-page printable scorecard companion to the article, offered as an ungated download.',
  },
  {
    slug: 'premortem-kit',
    title: 'Facilitator kit — gated download flow',
    status: 'drafting',
    contentType: 'landingPage',
    channel: 'website',
    publishOn: '2026-10-07',
    brief:
      'Facilitator kit download behind an email gate — the only gated piece; wire it to the first-party signup endpoint.',
  },
  {
    slug: 'linkedin-2026-10-07',
    title: 'LinkedIn: pre-mortem article launch post',
    status: 'idea',
    contentType: 'socialPost',
    channel: 'linkedin',
    publishOn: '2026-10-07',
    brief: 'Announce the pre-mortem article. Link the article directly; nothing gated.',
  },
  {
    slug: 'premortem-newsletter',
    title: 'Newsletter: pre-mortem article announcement',
    status: 'idea',
    contentType: 'newsletter',
    channel: 'newsletter',
    publishOn: '2026-10-14',
    brief: 'Newsletter announcement of the article + scorecard to the existing list.',
  },
  {
    slug: 'capture-modules',
    title: 'Email capture modules on library pages',
    status: 'idea',
    contentType: 'other',
    channel: 'website',
    publishOn: '2026-10-21',
    brief: 'Gift-first email capture modules on the most-visited library pages. No popups, no exit-intent.',
  },
  {
    slug: 'linkedin-2026-10-28',
    title: 'LinkedIn: scorecard walk-through',
    status: 'idea',
    contentType: 'socialPost',
    channel: 'linkedin',
    publishOn: '2026-10-28',
    brief: 'Walk through the scorecard with one worked example.',
  },
  {
    slug: 'security-page',
    title: 'Security and data-handling practices page',
    status: 'idea',
    contentType: 'landingPage',
    channel: 'website',
    publishOn: '2026-11-11',
    brief:
      'Security and data-handling practices page: accurate posture, de-identified and synthetic data by default, named partner for certified pieces.',
  },
  {
    slug: 'linkedin-2026-11-18',
    title: 'LinkedIn: regulated-delivery case highlight',
    status: 'idea',
    contentType: 'socialPost',
    channel: 'linkedin',
    publishOn: '2026-11-18',
    brief: 'Highlight one regulated-environment delivery story (med-device or clinical workflow).',
  },
  {
    slug: 'pricing-guidance',
    title: 'Engagement pricing guidance on services pages',
    status: 'idea',
    contentType: 'landingPage',
    channel: 'website',
    publishOn: '2026-11-18',
    brief: 'Add engagement pricing guidance to the services pages once the bands are approved.',
  },
]

/** Normalized, deterministic operation documents (private outreach dataset). */
export function buildSeedOperationDocs(): MarketingOperationInput[] {
  return EXEC_PLAN_SEED_OPERATIONS.map((def) => {
    const sourceKey = EXEC_PLAN_OP_PREFIX + def.slug
    return normalizeMarketingOperationInput({
      sourceKey,
      sourceFingerprint: marketingOperationFingerprint(`${sourceKey}:${def.title}:${def.dueOn}`),
      title: def.title,
      summary: def.summary,
      whyNow: def.whyNow,
      nextAction: def.nextAction,
      humanQuestion: def.humanQuestion,
      status: def.status,
      priority: def.priority,
      kind: def.kind,
      origin: 'manual',
      autonomy: def.autonomy,
      ownerName: def.ownerName,
      dueAt: dateInputToIso(def.dueOn),
      targetView: 'outreach',
      linkedRecords: (def.linkedOfferKeys || []).map((key) => ({
        dataset: 'outreach' as const,
        type: 'marketingOffer',
        id: offerDocId(key),
        title: key,
        relationship: 'offer',
      })),
    })
  })
}

/** Validated calendar-item documents with deterministic _ids (production dataset). */
export function buildSeedCalendarDocs(): Array<MarketingFields & { _id: string; _type: string }> {
  return EXEC_PLAN_SEED_CALENDAR.map((def) => {
    const payload = buildCreatePayload('marketingCalendarItem', {
      _id: EXEC_PLAN_CALENDAR_PREFIX + def.slug,
      title: def.title,
      status: def.status,
      contentType: def.contentType,
      channel: def.channel,
      publishAt: dateInputToIso(def.publishOn),
      brief: def.brief,
      autoPublish: false,
    })
    return payload as MarketingFields & { _id: string; _type: string }
  })
}
