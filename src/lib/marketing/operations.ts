/**
 * Pure domain rules for the shared Marketing Operations queue.
 *
 * The documents described here are PRIVATE operational records. Server routes
 * must store them in OUTREACH_DATASET, never the public website dataset. Keep
 * the action allowlist closed: model output and request JSON are untrusted data.
 */

export const MARKETING_OPERATION_TYPE = 'marketingOperation' as const

export const MARKETING_OPERATION_STATUSES = [
  'queued',
  'working',
  'needsHuman',
  'waiting',
  'blocked',
  'scheduled',
  'done',
  'dismissed',
] as const

export const MARKETING_OPERATION_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const
export const MARKETING_OPERATION_KINDS = [
  'update',
  'research',
  'content',
  'outreach',
  'measurement',
  'maintenance',
  'decision',
  'blocker',
] as const

export const MARKETING_OPERATION_ORIGINS = [
  'workUpdate',
  'dashboardGap',
  'research',
  'outreach',
  'calendar',
  'performance',
  'manual',
] as const

export const MARKETING_OPERATION_AUTONOMY = [
  'safeInternal',
  'humanReview',
  'externalAction',
  'paidAction',
] as const

export const MARKETING_OPERATION_TARGET_VIEWS = [
  'dashboard',
  'strategy',
  'strategyBrief',
  'research',
  'seo',
  'abTesting',
  'analytics',
  'calendar',
  'campaigns',
  'funnels',
  'channels',
  'templates',
  'linkTree',
  'outreach',
  'workEvidence',
  'shop',
] as const

export type MarketingOperationStatus = (typeof MARKETING_OPERATION_STATUSES)[number]
export type MarketingOperationPriority = (typeof MARKETING_OPERATION_PRIORITIES)[number]
export type MarketingOperationKind = (typeof MARKETING_OPERATION_KINDS)[number]
export type MarketingOperationOrigin = (typeof MARKETING_OPERATION_ORIGINS)[number]
export type MarketingOperationAutonomy = (typeof MARKETING_OPERATION_AUTONOMY)[number]
export type MarketingOperationTargetView = (typeof MARKETING_OPERATION_TARGET_VIEWS)[number]
export type MarketingOperationGroup = 'needsHuman' | 'marketingHandling' | 'comingUp' | 'history'

export type MarketingOperationLinkedRecord = {
  _key: string
  dataset: 'production' | 'outreach'
  type: string
  id: string
  title: string
  relationship: string
}

export type MarketingOperationEvidence = {
  _key: string
  title: string
  url?: string
  recordType?: string
  recordId?: string
  matchedTerms?: string[]
}

export type MarketingOperationActivity = {
  _key: string
  at: string
  actor: 'marketing' | 'person' | 'system'
  action: string
  outcome?: string
}

export type MarketingOperation = {
  _id: string
  _type: typeof MARKETING_OPERATION_TYPE
  _rev?: string
  _createdAt?: string
  _updatedAt?: string
  title: string
  summary?: string
  whyNow?: string
  nextAction: string
  humanQuestion?: string
  humanResponse?: string
  status: MarketingOperationStatus
  priority: MarketingOperationPriority
  kind: MarketingOperationKind
  origin: MarketingOperationOrigin
  autonomy: MarketingOperationAutonomy
  ownerName?: string
  ownerSanityUserId?: string
  dueAt?: string
  nextCheckAt?: string
  blocker?: string
  lastOutcome?: string
  targetView: MarketingOperationTargetView
  sourceKey: string
  sourceFingerprint: string
  sourceRevision?: string
  linkedRecords?: MarketingOperationLinkedRecord[]
  evidence?: MarketingOperationEvidence[]
  activity?: MarketingOperationActivity[]
  completedAt?: string
  dismissedUntil?: string
  lastEvaluatedAt?: string
}

export type MarketingOperationInput = Omit<
  MarketingOperation,
  '_id' | '_type' | '_rev' | '_createdAt' | '_updatedAt'
> & { _id?: string }

export type MarketingOperationPatch = Partial<
  Pick<
    MarketingOperation,
    | 'status'
    | 'priority'
    | 'ownerName'
    | 'ownerSanityUserId'
    | 'dueAt'
    | 'nextCheckAt'
    | 'blocker'
    | 'humanQuestion'
    | 'humanResponse'
    | 'nextAction'
    | 'lastOutcome'
    | 'completedAt'
    | 'dismissedUntil'
  >
>

export type MarketingOperationDashboardSignal = {
  id: string
  title: string
  why: string
  action: string
  view: MarketingOperationTargetView
  severity: string
  affected?: string[]
}

const STATUS_SET = new Set<string>(MARKETING_OPERATION_STATUSES)
const PRIORITY_SET = new Set<string>(MARKETING_OPERATION_PRIORITIES)
const KIND_SET = new Set<string>(MARKETING_OPERATION_KINDS)
const ORIGIN_SET = new Set<string>(MARKETING_OPERATION_ORIGINS)
const AUTONOMY_SET = new Set<string>(MARKETING_OPERATION_AUTONOMY)
const TARGET_VIEW_SET = new Set<string>(MARKETING_OPERATION_TARGET_VIEWS)

function compactText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : ''
}

function safeIso(value: unknown) {
  const candidate = compactText(value, 40)
  if (!candidate) return ''
  const parsed = new Date(candidate)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

function member<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T {
  return (typeof value === 'string' && allowed.has(value) ? value : fallback) as T
}

/** Small deterministic hash suitable for Sanity IDs and idempotency keys. */
export function marketingOperationHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

export function marketingOperationDocumentId(sourceKey: string) {
  const normalized = compactText(sourceKey, 300).toLowerCase()
  return `marketingOperation.${marketingOperationHash(normalized || 'manual')}`
}

export function marketingOperationFingerprint(value: unknown) {
  const stable = typeof value === 'string' ? value : JSON.stringify(value)
  return marketingOperationHash(stable.toLowerCase().replace(/\s+/g, ' ').trim())
}

function normalizeLinkedRecords(value: unknown): MarketingOperationLinkedRecord[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? item as Partial<MarketingOperationLinkedRecord> : {}
      const dataset = record.dataset === 'outreach' ? 'outreach' : 'production'
      const type = compactText(record.type, 80)
      const id = compactText(record.id, 180)
      const title = compactText(record.title, 180)
      const relationship = compactText(record.relationship, 100) || 'related'
      const identity = `${dataset}:${type}:${id}`
      if (!type || !id || seen.has(identity)) return null
      seen.add(identity)
      return {
        _key: compactText(record._key, 96) || `linked-${marketingOperationHash(identity)}-${index + 1}`,
        dataset,
        type,
        id,
        title: title || id,
        relationship,
      }
    })
    .filter((item): item is MarketingOperationLinkedRecord => Boolean(item))
    .slice(0, 12)
}

function normalizeEvidence(value: unknown): MarketingOperationEvidence[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? item as Partial<MarketingOperationEvidence> : {}
      const title = compactText(record.title, 180)
      if (!title) return null
      const rawUrl = compactText(record.url, 500)
      let url = ''
      if (rawUrl) {
        try {
          const parsed = new URL(rawUrl)
          if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
            parsed.hash = ''
            url = parsed.toString()
          }
        } catch {
          url = ''
        }
      }
      const matchedTerms = Array.isArray(record.matchedTerms)
        ? record.matchedTerms.map((term) => compactText(term, 80)).filter(Boolean).slice(0, 8)
        : []
      return {
        _key: compactText(record._key, 96) || `evidence-${marketingOperationHash(`${title}:${url}`)}-${index + 1}`,
        title,
        ...(url ? { url } : {}),
        ...(compactText(record.recordType, 80) ? { recordType: compactText(record.recordType, 80) } : {}),
        ...(compactText(record.recordId, 180) ? { recordId: compactText(record.recordId, 180) } : {}),
        ...(matchedTerms.length > 0 ? { matchedTerms } : {}),
      }
    })
    .filter((item): item is MarketingOperationEvidence => Boolean(item))
    .slice(0, 10)
}

function normalizeActivity(value: unknown): MarketingOperationActivity[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? item as Partial<MarketingOperationActivity> : {}
      const at = safeIso(record.at)
      const action = compactText(record.action, 180)
      if (!at || !action) return null
      const actor = record.actor === 'person' || record.actor === 'system' ? record.actor : 'marketing'
      return {
        _key: compactText(record._key, 96) || `activity-${marketingOperationHash(`${at}:${action}`)}-${index + 1}`,
        at,
        actor,
        action,
        ...(compactText(record.outcome, 500) ? { outcome: compactText(record.outcome, 500) } : {}),
      }
    })
    .filter((item): item is MarketingOperationActivity => Boolean(item))
    .slice(-20)
}

/** Strip every unknown/model-provided field and bound every persisted value. */
export function normalizeMarketingOperationInput(value: unknown): MarketingOperationInput {
  const input = value && typeof value === 'object' ? value as Partial<MarketingOperationInput> : {}
  const sourceKey = compactText(input.sourceKey, 300) || 'manual:unkeyed'
  const sourceFingerprint = compactText(input.sourceFingerprint, 100) || marketingOperationFingerprint(sourceKey)
  const status = member<MarketingOperationStatus>(input.status, STATUS_SET, 'queued')
  const completedAt = status === 'done' ? safeIso(input.completedAt) || new Date().toISOString() : ''
  return {
    _id: marketingOperationDocumentId(sourceKey),
    title: compactText(input.title, 180) || 'Untitled marketing work',
    summary: compactText(input.summary, 1200),
    whyNow: compactText(input.whyNow, 900),
    nextAction: compactText(input.nextAction, 600) || 'Review this work and choose the next move.',
    humanQuestion: compactText(input.humanQuestion, 600),
    humanResponse: compactText(input.humanResponse, 900),
    status,
    priority: member<MarketingOperationPriority>(input.priority, PRIORITY_SET, 'normal'),
    kind: member<MarketingOperationKind>(input.kind, KIND_SET, 'update'),
    origin: member<MarketingOperationOrigin>(input.origin, ORIGIN_SET, 'manual'),
    autonomy: member<MarketingOperationAutonomy>(input.autonomy, AUTONOMY_SET, 'humanReview'),
    ownerName: compactText(input.ownerName, 120),
    ownerSanityUserId: compactText(input.ownerSanityUserId, 180),
    dueAt: safeIso(input.dueAt),
    nextCheckAt: safeIso(input.nextCheckAt),
    blocker: compactText(input.blocker, 600),
    lastOutcome: compactText(input.lastOutcome, 700),
    targetView: member<MarketingOperationTargetView>(input.targetView, TARGET_VIEW_SET, 'dashboard'),
    sourceKey,
    sourceFingerprint,
    sourceRevision: compactText(input.sourceRevision, 180),
    linkedRecords: normalizeLinkedRecords(input.linkedRecords),
    evidence: normalizeEvidence(input.evidence),
    activity: normalizeActivity(input.activity),
    ...(completedAt ? { completedAt } : {}),
    ...(safeIso(input.dismissedUntil) ? { dismissedUntil: safeIso(input.dismissedUntil) } : {}),
    lastEvaluatedAt: safeIso(input.lastEvaluatedAt) || new Date().toISOString(),
  }
}

export function normalizeMarketingOperationPatch(value: unknown): MarketingOperationPatch {
  const input = value && typeof value === 'object' ? value as MarketingOperationPatch : {}
  const patch: MarketingOperationPatch = {}
  if (typeof input.status === 'string' && STATUS_SET.has(input.status)) patch.status = input.status
  if (typeof input.priority === 'string' && PRIORITY_SET.has(input.priority)) patch.priority = input.priority
  if ('ownerName' in input) patch.ownerName = compactText(input.ownerName, 120)
  if ('ownerSanityUserId' in input) patch.ownerSanityUserId = compactText(input.ownerSanityUserId, 180)
  if ('dueAt' in input) patch.dueAt = safeIso(input.dueAt)
  if ('nextCheckAt' in input) patch.nextCheckAt = safeIso(input.nextCheckAt)
  if ('blocker' in input) patch.blocker = compactText(input.blocker, 600)
  if ('humanQuestion' in input) patch.humanQuestion = compactText(input.humanQuestion, 600)
  if ('humanResponse' in input) patch.humanResponse = compactText(input.humanResponse, 900)
  if ('nextAction' in input) patch.nextAction = compactText(input.nextAction, 600)
  if ('lastOutcome' in input) patch.lastOutcome = compactText(input.lastOutcome, 700)
  if ('completedAt' in input) patch.completedAt = safeIso(input.completedAt)
  if ('dismissedUntil' in input) patch.dismissedUntil = safeIso(input.dismissedUntil)
  return patch
}

const ALLOWED_TRANSITIONS: Record<MarketingOperationStatus, readonly MarketingOperationStatus[]> = {
  queued: ['working', 'needsHuman', 'waiting', 'blocked', 'scheduled', 'done', 'dismissed'],
  working: ['queued', 'needsHuman', 'waiting', 'blocked', 'scheduled', 'done'],
  needsHuman: ['queued', 'working', 'waiting', 'blocked', 'scheduled', 'done', 'dismissed'],
  waiting: ['queued', 'working', 'needsHuman', 'blocked', 'scheduled', 'done', 'dismissed'],
  blocked: ['queued', 'working', 'needsHuman', 'waiting', 'done', 'dismissed'],
  scheduled: ['queued', 'working', 'needsHuman', 'waiting', 'blocked', 'done', 'dismissed'],
  done: ['queued'],
  dismissed: ['queued'],
}

export function canTransitionMarketingOperation(from: MarketingOperationStatus, to: MarketingOperationStatus) {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to)
}

export type AutomaticMarketingOperationAction =
  | 'inspectCms'
  | 'deduplicate'
  | 'rankQueue'
  | 'prepareInternalDraft'
  | 'scheduleInternalCheck'

const AUTOMATIC_ACTIONS = new Set<AutomaticMarketingOperationAction>([
  'inspectCms',
  'deduplicate',
  'rankQueue',
  'prepareInternalDraft',
  'scheduleInternalCheck',
])

/** Server invariant: a model cannot relabel a forbidden action as low risk. */
export function assertAutomaticMarketingOperationAction(value: unknown): AutomaticMarketingOperationAction {
  if (typeof value !== 'string' || !AUTOMATIC_ACTIONS.has(value as AutomaticMarketingOperationAction)) {
    throw new Error('This action requires explicit human approval and cannot run automatically.')
  }
  return value as AutomaticMarketingOperationAction
}

export function marketingOperationGroup(item: MarketingOperation, now = new Date()): MarketingOperationGroup {
  if (item.status === 'done' || item.status === 'dismissed') return 'history'
  if (item.status === 'needsHuman' || item.status === 'blocked') return 'needsHuman'
  if (item.status === 'working' || item.status === 'queued') return 'marketingHandling'
  const checkTime = item.nextCheckAt ? new Date(item.nextCheckAt).getTime() : Number.POSITIVE_INFINITY
  if ((item.status === 'waiting' || item.status === 'scheduled') && checkTime <= now.getTime()) return 'marketingHandling'
  return 'comingUp'
}

export function marketingOperationIsOverdue(item: MarketingOperation, now = new Date()) {
  if (!item.dueAt || ['done', 'dismissed'].includes(item.status)) return false
  return new Date(item.dueAt).getTime() < now.getTime()
}

function operationRank(item: MarketingOperation, now: Date) {
  const group = marketingOperationGroup(item, now)
  const groupScore = group === 'needsHuman' ? 0 : group === 'marketingHandling' ? 1000 : group === 'comingUp' ? 2000 : 4000
  const overdue = marketingOperationIsOverdue(item, now) ? -500 : 0
  const statusScore = item.status === 'blocked' ? -90 : item.status === 'needsHuman' ? -70 : item.status === 'working' ? -30 : 0
  const priorityScore = { urgent: -40, high: -25, normal: 0, low: 20 }[item.priority]
  const due = item.dueAt ? Math.max(-20, Math.min(200, (new Date(item.dueAt).getTime() - now.getTime()) / 86_400_000)) : 220
  return groupScore + overdue + statusScore + priorityScore + due
}

export function rankMarketingOperations(items: MarketingOperation[], now = new Date()) {
  return [...items].sort((left, right) => {
    const score = operationRank(left, now) - operationRank(right, now)
    if (score !== 0) return score
    return (right._updatedAt || '').localeCompare(left._updatedAt || '') || left.title.localeCompare(right.title)
  })
}

export function getMarketingOperationCounts(items: MarketingOperation[], now = new Date()) {
  return items.reduce(
    (counts, item) => {
      const group = marketingOperationGroup(item, now)
      counts[group] += 1
      if (marketingOperationIsOverdue(item, now)) counts.overdue += 1
      if (!item.ownerName && group !== 'history') counts.unassigned += 1
      return counts
    },
    { needsHuman: 0, marketingHandling: 0, comingUp: 0, history: 0, overdue: 0, unassigned: 0 },
  )
}

export function operationInputFromDashboardSignal(signal: MarketingOperationDashboardSignal): MarketingOperationInput {
  const priority: MarketingOperationPriority = signal.severity === 'urgent'
    ? 'urgent'
    : ['warning', 'setup', 'measurement'].includes(signal.severity)
      ? 'high'
      : 'normal'
  const sourceKey = `dashboard-gap:${compactText(signal.id, 180)}`
  return normalizeMarketingOperationInput({
    title: signal.title,
    summary: signal.why,
    whyNow: signal.why,
    nextAction: signal.action,
    status: 'queued',
    priority,
    kind: signal.severity === 'measurement' ? 'measurement' : 'maintenance',
    origin: 'dashboardGap',
    autonomy: 'safeInternal',
    targetView: signal.view,
    sourceKey,
    sourceFingerprint: marketingOperationFingerprint({
      title: signal.title,
      why: signal.why,
      action: signal.action,
      affected: signal.affected || [],
    }),
    lastOutcome: 'Queued from a current Marketing health check.',
  })
}
