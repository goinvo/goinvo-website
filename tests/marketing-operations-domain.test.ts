import { describe, expect, it } from 'vitest'

import {
  assertAutomaticMarketingOperationAction,
  canTransitionMarketingOperation,
  getMarketingOperationCounts,
  marketingOperationDocumentId,
  marketingOperationGroup,
  normalizeMarketingOperationInput,
  operationInputFromDashboardSignal,
  rankMarketingOperations,
  type MarketingOperation,
} from '@/lib/marketing/operations'
import { findWorkUpdatePrivacyIssue } from '@/lib/marketing/workUpdateSafety'
import { buildMarketerBriefOperationInput } from '@/sanity/components/marketing/marketerBrief'

function item(overrides: Partial<MarketingOperation>): MarketingOperation {
  return {
    _id: overrides._id || marketingOperationDocumentId(overrides.sourceKey || overrides.title || 'item'),
    _type: 'marketingOperation',
    title: 'Work item',
    nextAction: 'Take the next step.',
    status: 'queued',
    priority: 'normal',
    kind: 'update',
    origin: 'manual',
    autonomy: 'humanReview',
    targetView: 'dashboard',
    sourceKey: 'manual:item',
    sourceFingerprint: 'fingerprint',
    ...overrides,
  }
}

describe('private Marketing Operations domain', () => {
  it('uses stable idempotent ids and strips model-controlled escape hatches', () => {
    expect(marketingOperationDocumentId('work-update:care-navigation')).toBe(
      marketingOperationDocumentId(' WORK-UPDATE:CARE-NAVIGATION '),
    )
    const normalized = normalizeMarketingOperationInput({
      title: 'Care navigation update',
      sourceKey: 'work-update:care-navigation',
      sourceFingerprint: 'condition-1',
      status: 'not-real',
      priority: 'invented',
      action: 'publish',
      safetyClass: 'low',
      dataset: 'production',
      patch: { autoPublish: true },
      rawNote: 'RAW-PRIVATE-NOTE-991',
    }) as unknown as Record<string, unknown>

    expect(normalized.status).toBe('queued')
    expect(normalized.priority).toBe('normal')
    expect(normalized).not.toHaveProperty('action')
    expect(normalized).not.toHaveProperty('safetyClass')
    expect(normalized).not.toHaveProperty('dataset')
    expect(normalized).not.toHaveProperty('patch')
    expect(JSON.stringify(normalized)).not.toContain('RAW-PRIVATE-NOTE-991')
  })

  it('hard-denies every non-allowlisted automatic action regardless of claimed safety', () => {
    expect(assertAutomaticMarketingOperationAction('inspectCms')).toBe('inspectCms')
    for (const forbidden of ['publish', 'schedule', 'email', 'call', 'linkedin', 'paidSeo', 'delete', 'approveClaim', 'changeBrandVoice', { action: 'publish', safetyClass: 'low' }]) {
      expect(() => assertAutomaticMarketingOperationAction(forbidden)).toThrow(/explicit human approval/i)
    }
  })

  it('ranks blocked, human-needed, and overdue work ahead of internal and upcoming work', () => {
    const now = new Date('2026-07-18T12:00:00.000Z')
    const ranked = rankMarketingOperations([
      item({ _id: 'marketingOperation.upcoming', sourceKey: 'upcoming', title: 'Upcoming', status: 'scheduled', nextCheckAt: '2026-07-25T12:00:00.000Z' }),
      item({ _id: 'marketingOperation.working', sourceKey: 'working', title: 'Working', status: 'working' }),
      item({ _id: 'marketingOperation.decision', sourceKey: 'decision', title: 'Decision', status: 'needsHuman' }),
      item({ _id: 'marketingOperation.blocked', sourceKey: 'blocked', title: 'Blocked', status: 'blocked', dueAt: '2026-07-17T12:00:00.000Z' }),
    ], now)

    expect(ranked.map((candidate) => candidate.title)).toEqual(['Blocked', 'Decision', 'Working', 'Upcoming'])
    expect(getMarketingOperationCounts(ranked, now)).toMatchObject({ needsHuman: 2, marketingHandling: 1, comingUp: 1, overdue: 1 })
  })

  it('brings a scheduled check back to Marketing only after its check time', () => {
    const scheduled = item({ status: 'scheduled', nextCheckAt: '2026-07-19T12:00:00.000Z' })
    expect(marketingOperationGroup(scheduled, new Date('2026-07-18T12:00:00.000Z'))).toBe('comingUp')
    expect(marketingOperationGroup(scheduled, new Date('2026-07-20T12:00:00.000Z'))).toBe('marketingHandling')
  })

  it('enforces the explicit state transition matrix', () => {
    expect(canTransitionMarketingOperation('queued', 'working')).toBe(true)
    expect(canTransitionMarketingOperation('needsHuman', 'done')).toBe(true)
    expect(canTransitionMarketingOperation('done', 'queued')).toBe(true)
    expect(canTransitionMarketingOperation('done', 'blocked')).toBe(false)
    expect(canTransitionMarketingOperation('dismissed', 'working')).toBe(false)
  })

  it('turns a live dashboard signal into an explicit, deduplicated queue candidate', () => {
    const first = operationInputFromDashboardSignal({
      id: 'analytics-source-gap',
      title: 'Connect measurement',
      why: 'No measurement source is connected.',
      action: 'Choose the source the team actually checks.',
      view: 'analytics',
      severity: 'measurement',
    })
    const second = operationInputFromDashboardSignal({
      id: 'analytics-source-gap',
      title: 'Connect measurement',
      why: 'No measurement source is connected.',
      action: 'Choose the source the team actually checks.',
      view: 'analytics',
      severity: 'measurement',
    })

    expect(first._id).toBe(second._id)
    expect(first.sourceKey).toBe('dashboard-gap:analytics-source-gap')
    expect(first.priority).toBe('high')
    expect(first.autonomy).toBe('safeInternal')
  })

  it('builds a private reviewed handoff without copying raw proposal metadata', () => {
    const rawMarker = 'RAW-COWORKER-MARKER-771'
    const operation = buildMarketerBriefOperationInput({
      summary: 'A safe normalized update.',
      rationale: [rawMarker],
      siteReferences: [{ title: rawMarker }],
      researchProject: {
        title: 'Care navigation launch',
        brief: 'Review reusable evidence for a launch.',
        canonicalUrl: 'https://www.goinvo.com/work/care-navigation/',
      },
    }, null)

    expect(operation.origin).toBe('workUpdate')
    expect(operation.sourceKey).toMatch(/^work-update:/)
    expect(JSON.stringify(operation)).not.toContain(rawMarker)
    expect(operation.linkedRecords).toEqual([])
  })
})

describe('Tell Marketing privacy preflight', () => {
  it('quarantines credentials, contact PII, and health identifiers before AI', () => {
    expect(findWorkUpdatePrivacyIssue('password = supersecret123')).toMatchObject({ code: 'credential' })
    expect(findWorkUpdatePrivacyIssue('Email alex@example.com about the launch')).toMatchObject({ code: 'contactPii' })
    expect(findWorkUpdatePrivacyIssue('Patient MRN 12345 needs a campaign')).toMatchObject({ code: 'healthIdentifier' })
    expect(findWorkUpdatePrivacyIssue('The HIMSS abstract is due October 2 and Priya owns the talk.')).toBeNull()
  })
})
