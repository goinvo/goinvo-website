import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  analyticsSourceConnectionError,
  experimentSignalIds,
  getAbTestingVariantValidationError,
  isAbTestingSignalInMeasurementWindow,
  isUsableConnectedAnalyticsSource,
} from '@/sanity/tools/marketingTool'
import {
  marketingClaudeModel,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'

const previousModel = process.env.MARKETING_CLAUDE_MODEL

afterEach(() => {
  if (previousModel === undefined) delete process.env.MARKETING_CLAUDE_MODEL
  else process.env.MARKETING_CLAUDE_MODEL = previousModel
})

describe('A/B evidence boundaries', () => {
  const experiment = {
    _id: 'experiment-1',
    measurementStart: '2026-06-01T12:00:00.000Z',
    variants: [
      { key: 'control', label: 'Control' },
      { key: 'concept', label: 'Concept' },
    ],
  }

  it('accepts exactly one control and one treatment', () => {
    expect(getAbTestingVariantValidationError(experiment)).toBeNull()
    expect(getAbTestingVariantValidationError({
      ...experiment,
      variants: [...experiment.variants, { key: 'third', label: 'Third' }],
    })).toContain('exactly two')
    expect(getAbTestingVariantValidationError({
      ...experiment,
      variants: [{ key: 'control' }, { key: 'control' }],
    })).toContain('unique key')
  })

  it('uses only signals that explicitly reference the experiment and fall inside its window', () => {
    const current = {
      _id: 'current',
      experiment: { _id: 'experiment-1' },
      metricDate: '2026-06-01',
    }
    const stale = {
      _id: 'stale',
      experiment: { _id: 'experiment-1' },
      metricDate: '2026-05-31',
    }
    const other = {
      _id: 'other',
      experiment: { _id: 'experiment-2' },
      metricDate: '2026-06-02',
    }
    const withSignals = { ...experiment, performanceSignals: [current, stale, other] }

    expect(isAbTestingSignalInMeasurementWindow(withSignals, current)).toBe(true)
    expect(isAbTestingSignalInMeasurementWindow(withSignals, stale)).toBe(false)
    expect(isAbTestingSignalInMeasurementWindow(withSignals, other)).toBe(false)
    expect(experimentSignalIds(withSignals)).toEqual(['current'])
  })
})

describe('analytics connection evidence', () => {
  it('does not count a status label without provider-specific evidence', () => {
    const blankGa4 = { _id: 'ga4', title: 'GA4', provider: 'ga4', status: 'connected' }
    expect(isUsableConnectedAnalyticsSource(blankGa4)).toBe(false)
    expect(analyticsSourceConnectionError(blankGa4)).toContain('Property ID')
    expect(isUsableConnectedAnalyticsSource({ ...blankGa4, propertyId: '123456' })).toBe(true)

    const vercel = { _id: 'vercel', title: 'Vercel', provider: 'vercelAnalytics', status: 'connected' }
    expect(isUsableConnectedAnalyticsSource(vercel)).toBe(false)
    expect(isUsableConnectedAnalyticsSource({ ...vercel, vercelProject: 'goinvo-website' })).toBe(true)
  })
})

describe('marketing AI model allowlist', () => {
  it('rejects arbitrary request, CMS, and environment model values', async () => {
    delete process.env.MARKETING_CLAUDE_MODEL
    const client = { fetch: vi.fn(async () => 'attacker-controlled-model') }

    expect(await resolveMarketingModel(client as never, 'unapproved-request-model')).toBe('claude-opus-4-8')
    expect(client.fetch).toHaveBeenCalledOnce()

    process.env.MARKETING_CLAUDE_MODEL = 'unapproved-env-model'
    expect(marketingClaudeModel()).toBe('claude-opus-4-8')
    expect(marketingClaudeModel('claude-sonnet-4-6')).toBe('claude-sonnet-4-6')
  })
})
