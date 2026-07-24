import { normalizeOutreachUrl, type OutreachContact } from './outreach'
import {
  CALL_PLAN_STATUSES,
  FOLLOW_UP_STATUSES,
  WARMTH_RANK,
} from './outreachEnums'
import type {
  OutreachChannelOverride,
  OutreachChannelOverrideState,
} from './outreachEnums'

/** Channels the progress tracker can recommend. Values match interaction attribution. */
export const OUTREACH_PROGRESS_CHANNELS = [
  'phone',
  'email',
  'linkedin',
  'referral',
  'video',
  'inPerson',
  'other',
] as const

export type OutreachProgressChannel = (typeof OUTREACH_PROGRESS_CHANNELS)[number]

export interface OutreachProgressInteraction {
  at?: string
  outcome?: string
  statusAfter?: string
  channel?: string
}

/**
 * The tracker deliberately accepts a structural superset of OutreachContact so
 * it can remain a pure, portable recommendation engine.
 */
export interface OutreachProgressContact extends OutreachContact {
  email?: string
  phone?: string
  linkedinUrl?: string
  nextStep?: string
  interactions?: OutreachProgressInteraction[]
  channelOverrides?: OutreachChannelOverride[]
}

export type OutreachProgressUrgency =
  | 'overdue'
  | 'dueToday'
  | 'dueSoon'
  | 'ready'
  | 'needsAttention'
  | 'blocked'
  | 'scheduled'
  | 'waiting'
  | 'complete'

export type OutreachDueState = 'overdue' | 'today' | 'upcoming' | 'scheduled' | 'none'

export type OutreachProgressAction =
  | 'followUp'
  | 'firstTouch'
  | 'scheduleFollowUp'
  | 'research'
  | 'reviewResearch'
  | 'editContact'
  | 'wait'
  | 'complete'

/**
 * A non-contacting workflow the surface can open to repair an informational
 * row. Kept separate from `action` so scheduling a dormant revisit never has
 * to masquerade as a completed interaction.
 */
export type OutreachProgressRepairTarget = 'followUpSchedule'

export interface OutreachChannelAvailability {
  channel: OutreachProgressChannel
  label: string
  available: boolean
  preferred: boolean
  reason: string
  overrideState?: OutreachChannelOverrideState
  /** Direct coordinate is absent; this is computed and never persisted as an override. */
  coordinateMissing?: boolean
}

export interface OutreachChannelRecommendation {
  channel: OutreachProgressChannel | null
  label: string
  reason: string
  alternatives: Array<{ channel: OutreachProgressChannel; label: string }>
  availability: OutreachChannelAvailability[]
}

export interface OutreachProgressRow {
  contactId: string
  name: string
  organization?: string
  owner?: string
  status: string
  progressLabel: string
  progressPercent: number
  urgency: OutreachProgressUrgency
  action: OutreachProgressAction
  actionLabel: string
  actionReason: string
  /** Short table copy explaining why this row is next or needs attention. */
  whyNext: string
  /** Short table copy explaining the channel choice (or channel blocker). */
  whyChannel: string
  dueState: OutreachDueState
  dueAt?: string
  nextStep?: string
  recommendation: OutreachChannelRecommendation
  workflowReady: boolean
  blockers: string[]
  editFields: string[]
  repairTarget?: OutreachProgressRepairTarget
  /** Rank among contacts that the user can contact now; null means informational. */
  rank: number | null
  isNext: boolean
}

export interface OutreachProgressSummary {
  rows: OutreachProgressRow[]
  nextContact: OutreachProgressRow | null
  counts: {
    total: number
    contactNow: number
    due: number
    blocked: number
    complete: number
  }
}

export interface BuildOutreachProgressOptions {
  /** Required for deterministic date handling. */
  now: string
  /** Upcoming follow-ups shown as due soon. Defaults to seven days. */
  withinDays?: number
  /**
   * Surface-specific first-touch gates (for example priced offer, live
   * evidence URL, or current voice). Returned messages are merged with the
   * portable core readiness checks.
   */
  readinessIssues?: (contact: OutreachProgressContact) => string[]
}

const DAY_MS = 86_400_000
const TERMINAL_STATUSES = new Set(['won', 'lost', 'closed'])
const FOLLOW_UP_STATUS_SET = new Set(FOLLOW_UP_STATUSES)
const FIRST_TOUCH_STATUSES = new Set(CALL_PLAN_STATUSES)
const ADVANCED_STATUSES = new Set(['responded', 'meeting', 'opportunity', 'won'])
const DIRECT_CHANNELS = new Set<OutreachProgressChannel>(['phone', 'email', 'linkedin'])
const CHANNEL_ORDER = new Map(OUTREACH_PROGRESS_CHANNELS.map((channel, index) => [channel, index]))
const WARMTH_ORDER = WARMTH_RANK

const CHANNEL_LABELS: Record<OutreachProgressChannel, string> = {
  phone: 'Phone call',
  email: 'Email',
  linkedin: 'LinkedIn',
  referral: 'Referral / introduction',
  video: 'Video meeting',
  inPerson: 'In person',
  other: 'Other',
}

const STATUS_PROGRESS: Record<string, { label: string; percent: number }> = {
  new: { label: 'Needs research', percent: 10 },
  needsReview: { label: 'Research needs review', percent: 30 },
  researched: { label: 'Ready for outreach', percent: 45 },
  briefed: { label: 'Assigned and ready', percent: 55 },
  contacted: { label: 'Contact attempted', percent: 60 },
  responded: { label: 'Responded', percent: 70 },
  meeting: { label: 'Meeting booked', percent: 80 },
  opportunity: { label: 'Opportunity active', percent: 90 },
  won: { label: 'Won', percent: 100 },
  lost: { label: 'Lost', percent: 100 },
  dormant: { label: 'Dormant', percent: 65 },
  closed: { label: 'Closed', percent: 100 },
}

const INITIAL_CHANNEL_SCORES: Record<string, Record<OutreachProgressChannel, number>> = {
  hot: { phone: 86, email: 80, linkedin: 58, referral: 74, video: 48, inPerson: 46, other: 20 },
  warm: { phone: 76, email: 82, linkedin: 62, referral: 74, video: 46, inPerson: 44, other: 20 },
  cool: { phone: 54, email: 76, linkedin: 72, referral: 68, video: 40, inPerson: 38, other: 20 },
  cold: { phone: 44, email: 70, linkedin: 74, referral: 66, video: 35, inPerson: 32, other: 20 },
  unknown: { phone: 42, email: 68, linkedin: 72, referral: 64, video: 34, inPerson: 31, other: 20 },
}

type InternalRow = OutreachProgressRow & {
  sortBucket: number
  sortTime: number
  sortWarmth: number
  sortScore: number
  canContactNow: boolean
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Conservative external-email validation for recommendation safety. This is
 * deliberately narrower than the full RFC grammar: if a saved value is
 * ambiguous, the tracker treats it as data to repair instead of opening a
 * malformed mail link.
 */
export function isUsableOutreachEmail(value: unknown): boolean {
  const email = clean(value)
  if (!email || email.length > 254 || /\s|[\u0000-\u001f\u007f]/.test(email)) return false

  const parts = email.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (
    !local ||
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)
  ) {
    return false
  }

  const labels = domain.split('.')
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label),
    )
  )
}

/**
 * Conservative dialable-number validation. Common punctuation and a short
 * extension are accepted; prose/placeholders are not. Seven through fifteen
 * base digits covers local business numbers through E.164 without guessing.
 */
export function isUsableOutreachPhone(value: unknown): boolean {
  const phone = clean(value)
  if (!phone || /[\u0000-\u001f\u007f]/.test(phone)) return false
  if (/^(?:n\/?a|none|unknown|unavailable|missing|tbd|no\s+number|-+|[—–]+|\?+)$/i.test(phone)) {
    return false
  }

  const match = phone.match(
    /^(\+?[\d\s().-]+?)(?:\s*(?:x|ext\.?|extension)\s*\d{1,6})?$/i,
  )
  if (!match) return false
  const digits = match[1].replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 && !/^0+$/.test(digits)
}

function compareText(a: string, b: string): number {
  return a === b ? 0 : a < b ? -1 : 1
}

function validTime(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

function utcDay(value: number): string {
  return new Date(value).toISOString().slice(0, 10)
}

function isProgressChannel(value: unknown): value is OutreachProgressChannel {
  return typeof value === 'string' && (OUTREACH_PROGRESS_CHANNELS as readonly string[]).includes(value)
}

type NormalizedChannelOverride = OutreachChannelOverride & {
  channel: OutreachProgressChannel
  state: OutreachChannelOverrideState
}

function isOverrideState(value: unknown): value is OutreachChannelOverrideState {
  return typeof value === 'string' &&
    ['preferred', 'unavailable', 'unresponsive', 'doNotUse'].includes(value)
}

function overrideMap(contact: OutreachProgressContact): Map<OutreachProgressChannel, NormalizedChannelOverride> {
  const result = new Map<OutreachProgressChannel, NormalizedChannelOverride>()
  for (const override of contact.channelOverrides || []) {
    if (!override || !isProgressChannel(override.channel)) continue
    if (!isOverrideState(override.state)) continue
    result.set(override.channel, override as NormalizedChannelOverride)
  }
  return result
}

function sortedInteractions(contact: OutreachProgressContact): OutreachProgressInteraction[] {
  return [...(contact.interactions || [])].sort(
    (a, b) => (validTime(b.at) ?? 0) - (validTime(a.at) ?? 0),
  )
}

function directChannelPresent(contact: OutreachProgressContact, channel: OutreachProgressChannel): boolean {
  if (channel === 'phone') return isUsableOutreachPhone(contact.phone)
  if (channel === 'email') return isUsableOutreachEmail(contact.email)
  if (channel === 'linkedin') {
    return Boolean(normalizeOutreachUrl(contact.linkedinUrl, { linkedinOnly: true }))
  }
  return false
}

function channelAvailability(contact: OutreachProgressContact): OutreachChannelAvailability[] {
  const overrides = overrideMap(contact)
  const usedChannels = new Set(
    (contact.interactions || []).map((interaction) => interaction.channel).filter(isProgressChannel),
  )

  return OUTREACH_PROGRESS_CHANNELS.map((channel) => {
    const override = overrides.get(channel)
    const label = CHANNEL_LABELS[channel]
    if (override && override.state !== 'preferred') {
      const explanation: Record<Exclude<OutreachChannelOverrideState, 'preferred'>, string> = {
        unavailable: `${label} is marked unavailable`,
        unresponsive: `${label} is marked unresponsive`,
        doNotUse: `${label} is marked do not use`,
      }
      return {
        channel,
        label,
        available: false,
        preferred: false,
        reason: [explanation[override.state], clean(override.note)].filter(Boolean).join(': '),
        overrideState: override.state,
        coordinateMissing: DIRECT_CHANNELS.has(channel)
          ? !directChannelPresent(contact, channel)
          : undefined,
      }
    }

    if (DIRECT_CHANNELS.has(channel)) {
      const available = directChannelPresent(contact, channel)
      return {
        channel,
        label,
        available,
        preferred: available && override?.state === 'preferred',
        reason: available
          ? `${label} contact data is saved`
          : `${label} cannot be used because the contact data is missing or invalid`,
        overrideState: override?.state,
        coordinateMissing: !available,
      }
    }

    const available = override?.state === 'preferred' || usedChannels.has(channel)
    return {
      channel,
      label,
      available,
      preferred: available && override?.state === 'preferred',
      reason: available
        ? override?.state === 'preferred'
          ? `${label} is marked preferred`
          : `${label} has been used with this contact before`
        : `${label} has not been marked available or used before`,
      overrideState: override?.state,
    }
  })
}

function channelScore(
  contact: OutreachProgressContact,
  availability: OutreachChannelAvailability,
  phase: 'firstTouch' | 'followUp',
  latestInteraction?: OutreachProgressInteraction,
): number {
  if (!availability.available) return Number.NEGATIVE_INFINITY
  const warmth = clean(contact.warmth) || 'unknown'
  let score = (INITIAL_CHANNEL_SCORES[warmth] || INITIAL_CHANNEL_SCORES.unknown)[availability.channel]
  if (availability.preferred) score += 1_000

  if (phase === 'followUp' && latestInteraction?.channel === availability.channel) {
    score += ADVANCED_STATUSES.has(latestInteraction.statusAfter || contact.status || '') ? 28 : -12
  }
  return score
}

function recommendationFor(
  contact: OutreachProgressContact,
  phase: 'firstTouch' | 'followUp',
): OutreachChannelRecommendation {
  const availability = channelAvailability(contact)
  const latestInteraction = sortedInteractions(contact)[0]
  const ranked = availability
    .filter((item) => item.available)
    .map((item) => ({ item, score: channelScore(contact, item, phase, latestInteraction) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (CHANNEL_ORDER.get(a.item.channel) ?? 99) - (CHANNEL_ORDER.get(b.item.channel) ?? 99),
    )
  const selected = ranked[0]?.item

  if (!selected) {
    return {
      channel: null,
      label: 'No usable channel',
      reason: 'Add contact details or mark a safe channel as preferred before reaching out.',
      alternatives: [],
      availability,
    }
  }

  const excludedPrevious =
    latestInteraction && isProgressChannel(latestInteraction.channel)
      ? availability.find((item) => item.channel === latestInteraction.channel && !item.available)
      : undefined
  const missingPreferred = availability.find(
    (item) => item.overrideState === 'preferred' && !item.available,
  )
  let reason: string
  if (selected.preferred) {
    reason = `${selected.label} is explicitly preferred and available.`
  } else if (missingPreferred?.coordinateMissing) {
    reason = `${missingPreferred.label} is preferred but its contact data is missing; use ${selected.label} until it is updated.`
  } else if (excludedPrevious?.overrideState === 'unresponsive') {
    reason = `${excludedPrevious.label} is marked unresponsive, so switch to ${selected.label}.`
  } else if (
    phase === 'followUp' &&
    latestInteraction?.channel === selected.channel &&
    ADVANCED_STATUSES.has(latestInteraction.statusAfter || contact.status || '')
  ) {
    reason = `Continue on ${selected.label}; the last interaction there advanced the relationship.`
  } else if (phase === 'followUp') {
    reason = `${selected.label} is the strongest available channel for this follow-up.`
  } else if (selected.channel === 'phone' && ['cold', 'unknown'].includes(clean(contact.warmth))) {
    reason = 'Phone is the strongest available option; treat this as a cold call.'
  } else {
    const warmth = clean(contact.warmth) || 'unknown'
    reason = `${selected.label} is the best available fit for a ${warmth} first touch.`
  }

  return {
    channel: selected.channel,
    label:
      selected.channel === 'phone' && ['cold', 'unknown'].includes(clean(contact.warmth))
        ? 'Cold call'
        : selected.label,
    reason,
    alternatives: ranked.slice(1).map(({ item }) => ({ channel: item.channel, label: item.label })),
    availability,
  }
}

function workflowReadiness(contact: OutreachProgressContact): { blockers: string[]; editFields: string[] } {
  const blockers: string[] = []
  const editFields = new Set<string>()
  if (!contact.researchReviewedAt) {
    blockers.push('Research has not been reviewed by a person.')
    editFields.add('researchReviewedAt')
  }
  if (contact.personVerified !== true || !['medium', 'high'].includes(contact.identityConfidence || '')) {
    blockers.push('The person or identity confidence is not verified enough for outreach.')
    editFields.add('research')
  }
  if (!contact.warmth || contact.warmth === 'unknown') {
    blockers.push('Relationship warmth is unknown.')
    editFields.add('warmth')
  }
  if (!clean(contact.owner) && !clean(contact.howWeKnow)) {
    blockers.push('Add a relationship owner or how the studio knows this person.')
    editFields.add('owner')
    editFields.add('howWeKnow')
  }
  if (clean(contact.callBrief).length < 40) {
    blockers.push('The call brief is missing or too short to support a responsible conversation.')
    editFields.add('callBrief')
  }
  if ((contact.relevantEvidence || []).length === 0) {
    blockers.push('No relevant work evidence is attached.')
    editFields.add('relevantEvidence')
  }
  return { blockers, editFields: [...editFields] }
}

function missingChannelEditFields(recommendation: OutreachChannelRecommendation): string[] {
  const fields = new Set<string>()
  for (const item of recommendation.availability) {
    if (item.available) continue
    if (item.overrideState) fields.add('channelOverrides')
    if (item.channel === 'phone' && item.coordinateMissing) fields.add('phone')
    if (item.channel === 'email' && item.coordinateMissing) fields.add('email')
    if (item.channel === 'linkedin' && item.coordinateMissing) fields.add('linkedinUrl')
  }
  fields.add('channelOverrides')
  return [...fields]
}

function dueDescription(dueAt: string, dueTime: number, nowTime: number): string {
  if (utcDay(dueTime) === utcDay(nowTime)) return 'Follow-up is due today.'
  if (dueTime < nowTime) {
    const days = Math.max(1, Math.ceil((nowTime - dueTime) / DAY_MS))
    return `Follow-up is overdue by ${days} day${days === 1 ? '' : 's'}.`
  }
  return `Follow-up is due ${new Date(dueAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })}.`
}

function buildRow(
  contact: OutreachProgressContact,
  nowTime: number,
  horizonTime: number,
  readinessIssues?: (contact: OutreachProgressContact) => string[],
): InternalRow {
  const status = clean(contact.status) || 'new'
  const progress = STATUS_PROGRESS[status] || { label: 'Status needs review', percent: 10 }
  const dueTime = validTime(contact.followUpAt)
  const isTerminal = TERMINAL_STATUSES.has(status)
  const isFollowUp = FOLLOW_UP_STATUS_SET.has(status)
  const phase = isFollowUp ? 'followUp' : 'firstTouch'
  const recommendation = recommendationFor(contact, phase)
  const noChannel = recommendation.channel === null
  const dueState: OutreachDueState =
    dueTime === null
      ? 'none'
      : utcDay(dueTime) === utcDay(nowTime)
        ? 'today'
        : dueTime < nowTime
          ? 'overdue'
          : dueTime <= horizonTime
            ? 'upcoming'
            : 'scheduled'
  const base: Omit<InternalRow, 'urgency' | 'action' | 'actionLabel' | 'actionReason' | 'workflowReady' | 'blockers' | 'editFields' | 'sortBucket' | 'sortTime' | 'sortWarmth' | 'sortScore' | 'canContactNow'> = {
    contactId: contact._id,
    name: clean(contact.name) || 'Unnamed contact',
    organization: clean(contact.organization) || undefined,
    owner: clean(contact.owner) || undefined,
    status,
    progressLabel: progress.label,
    progressPercent: progress.percent,
    dueAt: dueTime === null ? undefined : contact.followUpAt,
    nextStep: clean(contact.nextStep) || undefined,
    recommendation,
    whyNext: '',
    whyChannel: recommendation.reason,
    dueState,
    rank: null,
    isNext: false,
  }
  const commonSort = {
    sortTime: dueTime ?? Number.POSITIVE_INFINITY,
    sortWarmth: WARMTH_ORDER[contact.warmth || 'unknown'] ?? 5,
    sortScore: contact.feasibilityScore ?? -1,
  }

  if (isTerminal) {
    const terminalChannelReason = `No channel is recommended while this contact is ${status}. Reopen the status before planning more outreach.`
    return {
      ...base,
      ...commonSort,
      dueAt: undefined,
      dueState: 'none',
      nextStep: undefined,
      recommendation: {
        channel: null,
        label: 'No outreach',
        reason: terminalChannelReason,
        alternatives: [],
        availability: recommendation.availability,
      },
      urgency: 'complete',
      action: 'complete',
      actionLabel: 'No further outreach',
      actionReason: `This contact is ${status}. Reopen the status before doing more outreach.`,
      whyNext: `This contact is ${status}; it is retained for progress reporting, not the next-contact queue.`,
      whyChannel: terminalChannelReason,
      workflowReady: false,
      blockers: [],
      editFields: ['status'],
      sortBucket: 9,
      canContactNow: false,
    }
  }

  if (isFollowUp && dueTime !== null && dueTime <= horizonTime) {
    const urgency: OutreachProgressUrgency =
      dueState === 'today' ? 'dueToday' : dueState === 'overdue' ? 'overdue' : 'dueSoon'
    const blockers = noChannel ? ['No usable outreach channel is available.'] : []
    return {
      ...base,
      ...commonSort,
      urgency: noChannel ? 'blocked' : urgency,
      action: noChannel ? 'editContact' : 'followUp',
      actionLabel: noChannel ? 'Add or restore a contact method' : 'Follow up',
      actionReason: `${dueDescription(contact.followUpAt as string, dueTime, nowTime)}${
        clean(contact.nextStep) ? ` Next: ${clean(contact.nextStep)}` : ''
      }`,
      whyNext: noChannel
        ? 'This follow-up is due, but contact data or channel overrides block outreach.'
        : dueDescription(contact.followUpAt as string, dueTime, nowTime),
      workflowReady: !noChannel,
      blockers,
      editFields: noChannel ? missingChannelEditFields(recommendation) : [],
      sortBucket: noChannel ? 2 : 0,
      canContactNow: !noChannel,
    }
  }

  if (FIRST_TOUCH_STATUSES.has(status)) {
    const readiness = workflowReadiness(contact)
    const externalIssues = readinessIssues?.(contact) || []
    for (const issue of externalIssues) {
      const normalizedIssue = clean(issue)
      if (normalizedIssue) readiness.blockers.push(normalizedIssue)
    }
    if (externalIssues.some((issue) => clean(issue))) readiness.editFields.push('workflowReadiness')
    if (noChannel) {
      readiness.blockers.push('No usable outreach channel is available.')
      readiness.editFields.push(...missingChannelEditFields(recommendation))
    }
    const blockers = [...new Set(readiness.blockers)]
    const editFields = [...new Set(readiness.editFields)]
    if (blockers.length > 0) {
      return {
        ...base,
        ...commonSort,
        urgency: 'blocked',
        action: 'editContact',
        actionLabel: 'Fix readiness blockers',
        actionReason: blockers[0],
        whyNext: blockers[0],
        workflowReady: false,
        blockers,
        editFields,
        sortBucket: 5,
        canContactNow: false,
      }
    }
    return {
      ...base,
      ...commonSort,
      urgency: 'ready',
      action: 'firstTouch',
      actionLabel: 'Make first contact',
      actionReason: 'The research, relationship context, call brief, evidence, and contact method are ready.',
      whyNext: 'Approved first touch; readiness checks pass.',
      workflowReady: true,
      blockers: [],
      editFields: [],
      sortBucket: 1,
      canContactNow: true,
    }
  }

  if (status === 'needsReview') {
    return {
      ...base,
      ...commonSort,
      urgency: 'needsAttention',
      action: 'reviewResearch',
      actionLabel: 'Review research',
      actionReason: 'Approve or correct the research before this contact enters the outreach plan.',
      whyNext: 'Human research review is the next required step.',
      workflowReady: false,
      blockers: ['Research is waiting for human review.'],
      editFields: ['research'],
      sortBucket: 6,
      canContactNow: false,
    }
  }

  if (status === 'new') {
    return {
      ...base,
      ...commonSort,
      urgency: 'needsAttention',
      action: 'research',
      actionLabel: 'Research contact',
      actionReason: 'Research and verify this person before choosing an outreach approach.',
      whyNext: 'Research and identity verification are required before outreach.',
      workflowReady: false,
      blockers: ['Contact research has not been completed.'],
      editFields: ['identity', 'research'],
      sortBucket: 7,
      canContactNow: false,
    }
  }

  if (isFollowUp && dueTime !== null) {
    return {
      ...base,
      ...commonSort,
      urgency: noChannel ? 'blocked' : 'scheduled',
      action: noChannel ? 'editContact' : 'wait',
      actionLabel: noChannel ? 'Add or restore a contact method' : 'Follow-up scheduled',
      actionReason: dueDescription(contact.followUpAt as string, dueTime, nowTime),
      whyNext: 'The follow-up is scheduled beyond the current planning window.',
      workflowReady: !noChannel,
      blockers: noChannel ? ['No usable outreach channel is available for the scheduled follow-up.'] : [],
      editFields: noChannel ? missingChannelEditFields(recommendation) : [],
      sortBucket: 3,
      canContactNow: false,
    }
  }

  if (isFollowUp && status !== 'dormant') {
    return {
      ...base,
      ...commonSort,
      urgency: noChannel ? 'blocked' : 'needsAttention',
      action: noChannel ? 'editContact' : 'scheduleFollowUp',
      actionLabel: noChannel ? 'Add or restore a contact method' : 'Set a follow-up',
      actionReason: 'This active relationship has no follow-up date or next action.',
      whyNext: 'An active relationship needs a dated next step.',
      workflowReady: !noChannel,
      blockers: noChannel ? ['No usable outreach channel is available.'] : [],
      editFields: [...(noChannel ? missingChannelEditFields(recommendation) : []), 'followUpAt', 'nextStep'],
      sortBucket: 2,
      canContactNow: false,
    }
  }

  return {
    ...base,
    ...commonSort,
    urgency: 'waiting',
    action: 'wait',
    actionLabel: status === 'dormant' ? 'Waiting for a revisit date' : 'Review status',
    actionReason:
      status === 'dormant'
        ? 'Set a follow-up date when this relationship should resurface.'
        : 'Choose a supported pipeline status to get a recommendation.',
    whyNext:
      status === 'dormant'
        ? 'Dormant contact is waiting for a revisit date.'
        : 'The pipeline status needs review before the tracker can advise outreach.',
    workflowReady: false,
    blockers: [],
    editFields: status === 'dormant' ? ['followUpAt', 'nextStep'] : ['status'],
    repairTarget: status === 'dormant' ? 'followUpSchedule' : undefined,
    sortBucket: 8,
    canContactNow: false,
  }
}

/**
 * Builds a deterministic, table-ready pipeline and names the next contact.
 * Due follow-ups lead; ready first touches are warmth-first with feasibility as
 * a tie-breaker. Blocked rows remain visible but are never selected as next.
 */
export function buildOutreachProgress(
  contacts: OutreachProgressContact[],
  options: BuildOutreachProgressOptions,
): OutreachProgressSummary {
  const nowTime = validTime(options.now)
  if (nowTime === null) throw new Error('buildOutreachProgress requires a valid `now` date.')
  const withinDays = Number.isFinite(options.withinDays)
    ? Math.max(0, options.withinDays as number)
    : 7
  const horizonTime = nowTime + withinDays * DAY_MS

  const internalRows = contacts
    .map((contact) => buildRow(contact, nowTime, horizonTime, options.readinessIssues))
    .sort(
      (a, b) =>
        a.sortBucket - b.sortBucket ||
        a.sortTime - b.sortTime ||
        a.sortWarmth - b.sortWarmth ||
        b.sortScore - a.sortScore ||
        compareText(a.name, b.name) ||
        compareText(a.contactId, b.contactId),
    )

  let contactRank = 0
  const rows: OutreachProgressRow[] = internalRows.map((row) => {
    const canContactNow = row.canContactNow
    const publicRow: Partial<InternalRow> = { ...row }
    delete publicRow.sortBucket
    delete publicRow.sortTime
    delete publicRow.sortWarmth
    delete publicRow.sortScore
    delete publicRow.canContactNow
    const tableRow = publicRow as OutreachProgressRow
    if (!canContactNow) return tableRow
    contactRank += 1
    return { ...tableRow, rank: contactRank, isNext: contactRank === 1 }
  })
  const nextContact = rows.find((row) => row.isNext) || null

  return {
    rows,
    nextContact,
    counts: {
      total: rows.length,
      contactNow: rows.filter((row) => row.rank !== null).length,
      due: rows.filter(
        (row) =>
          FOLLOW_UP_STATUS_SET.has(row.status) &&
          ['overdue', 'today', 'upcoming'].includes(row.dueState),
      ).length,
      blocked: rows.filter((row) => row.urgency === 'blocked').length,
      complete: rows.filter((row) => row.urgency === 'complete').length,
    },
  }
}
