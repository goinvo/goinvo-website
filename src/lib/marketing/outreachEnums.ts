/**
 * Shared typed constants for the Outreach feature (contacts + offers).
 *
 * Single source of truth imported by BOTH the Sanity schemas
 * (`marketingContact`, `marketingOffer` — options.list) and every consumer
 * (core lib, API routes, Studio workspace) — never re-hardcode these values.
 * Pure data: no `sanity` import, safe in server routes and client bundles.
 */

export interface OutreachOption {
  title: string
  value: string
}

/** Market segment a contact belongs to (mirrors the 2026 pivot segments). */
export const OUTREACH_SEGMENT_OPTIONS: OutreachOption[] = [
  { title: 'Pharma / Life Sciences', value: 'pharma' },
  { title: 'Med-Device / Diagnostics', value: 'medDevice' },
  { title: 'Provider / Health System', value: 'provider' },
  { title: 'Payer / Health Plan', value: 'payer' },
  { title: 'Healthtech / Startup', value: 'healthtech' },
  { title: 'Government / Public Sector', value: 'government' },
  { title: 'Research / Academic', value: 'research' },
  { title: 'Other', value: 'other' },
]

/** Relationship warmth — how strong the personal connection is today. */
export const OUTREACH_WARMTH_OPTIONS: OutreachOption[] = [
  { title: 'Hot — would take a call this week', value: 'hot' },
  { title: 'Warm — knows us, would respond', value: 'warm' },
  { title: 'Cool — past contact, needs a re-intro', value: 'cool' },
  { title: 'Cold — name only', value: 'cold' },
]

/**
 * Contact lifecycle. `new` → research fills fields → `researched` → a principal
 * calls → `contacted` → outcomes. `researched`/`briefed` contacts appear in the
 * call plan; `contacted`+ do not (until moved back).
 */
export const OUTREACH_STATUS_OPTIONS: OutreachOption[] = [
  { title: 'New — not researched yet', value: 'new' },
  { title: 'Researched — brief ready', value: 'researched' },
  { title: 'Briefed — assigned for a call', value: 'briefed' },
  { title: 'Contacted — call/message made', value: 'contacted' },
  { title: 'Responded', value: 'responded' },
  { title: 'Meeting booked', value: 'meeting' },
  { title: 'Opportunity — real scope discussed', value: 'opportunity' },
  { title: 'Dormant — revisit later', value: 'dormant' },
  { title: 'Closed — no fit', value: 'closed' },
]

/** Offer catalog status. */
export const OFFER_STATUS_OPTIONS: OutreachOption[] = [
  { title: 'Active', value: 'active' },
  { title: 'Paused', value: 'paused' },
]

export const OUTREACH_SEGMENTS = OUTREACH_SEGMENT_OPTIONS.map((o) => o.value)
export const OUTREACH_WARMTH_LEVELS = OUTREACH_WARMTH_OPTIONS.map((o) => o.value)
export const OUTREACH_STATUSES = OUTREACH_STATUS_OPTIONS.map((o) => o.value)
export const OFFER_STATUSES = OFFER_STATUS_OPTIONS.map((o) => o.value)

export type OutreachSegment = (typeof OUTREACH_SEGMENT_OPTIONS)[number]['value']
export type OutreachWarmth = (typeof OUTREACH_WARMTH_OPTIONS)[number]['value']
export type OutreachStatus = (typeof OUTREACH_STATUS_OPTIONS)[number]['value']

/** Statuses that qualify a researched contact for the ranked call plan. */
export const CALL_PLAN_STATUSES = ['researched', 'briefed']

/** Statuses a "Log call" form may move a contact into. */
export const LOG_STATUS_VALUES = ['contacted', 'responded', 'meeting', 'opportunity', 'dormant', 'closed']

/** Statuses whose contacts can carry a due follow-up (the follow-ups strip). */
export const FOLLOW_UP_STATUSES = ['contacted', 'responded', 'meeting', 'dormant']

/** Warmth sort rank for the call plan — relationship beats model score. */
export const WARMTH_RANK: Record<string, number> = { hot: 0, warm: 1, cool: 2, cold: 3 }

/**
 * The PRIVATE Sanity dataset outreach documents live in (contacts, offers,
 * work evidence). Deliberately separate from the public website dataset: the
 * production dataset is world-readable by design, and contact PII + candid
 * feasibility notes must never be. Server routes may override via
 * SANITY_OUTREACH_DATASET; the Studio uses the same default constant.
 */
export const OUTREACH_DATASET =
  (typeof process !== 'undefined' && process.env?.SANITY_OUTREACH_DATASET) || 'outreach'

/** Managed marketing types that are stored in the private outreach dataset. */
export const OUTREACH_DATASET_TYPES = ['marketingContact', 'marketingOffer', 'marketingWorkEvidence']

/** Identity-verification confidence for person research (wrong-person guard). */
export const IDENTITY_CONFIDENCE_OPTIONS: OutreachOption[] = [
  { title: 'High — person confidently identified', value: 'high' },
  { title: 'Medium — likely but not certain', value: 'medium' },
  { title: 'Low — org researched, person unverified', value: 'low' },
  { title: 'None — could not verify; org-level only', value: 'none' },
]
export const IDENTITY_CONFIDENCE_LEVELS = IDENTITY_CONFIDENCE_OPTIONS.map((o) => o.value)

export function isOutreachSegment(value: string): boolean {
  return OUTREACH_SEGMENTS.includes(value)
}

export function isOutreachWarmth(value: string): boolean {
  return OUTREACH_WARMTH_LEVELS.includes(value)
}

export function isOutreachStatus(value: string): boolean {
  return OUTREACH_STATUSES.includes(value)
}
