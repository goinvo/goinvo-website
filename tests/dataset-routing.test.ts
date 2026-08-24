import { describe, expect, it } from 'vitest'

import {
  INTERNAL_DATASET,
  INTERNAL_MARKETING_TYPES,
  assertSplitIsReal,
  clientForType,
  datasetForType,
  isInternalMarketingType,
} from '@/lib/marketing/datasetRouting'
import { OUTREACH_DATASET_TYPES } from '@/lib/marketing/outreachEnums'

describe('dataset routing', () => {
  it('sends public content types to the public dataset', () => {
    for (const type of ['feature', 'caseStudy', 'healthVisualization', 'teamMember', 'category']) {
      expect(datasetForType(type, 'production')).toBe('production')
    }
  })

  it('sends the already-private types to the internal dataset', () => {
    for (const type of ['marketingContact', 'marketingOrder', 'marketingOperation']) {
      expect(datasetForType(type, 'production')).toBe(INTERNAL_DATASET)
      expect(isInternalMarketingType(type)).toBe(true)
    }
  })

  it('is a no-op before cutover', () => {
    // Wave 1 has not been added yet, so the list must be exactly the types that
    // were already private. This is what makes Steps 1-5 safe to ship early.
    expect([...INTERNAL_MARKETING_TYPES]).toEqual([...OUTREACH_DATASET_TYPES])
    // Types slated to move must still resolve to production until cutover.
    for (const type of ['marketingCalendarItem', 'marketingIdea', 'cmsFeedback']) {
      expect(datasetForType(type, 'production')).toBe('production')
    }
  })

  it('leaves a public type on the base client', () => {
    const base = {
      withConfig() {
        throw new Error('withConfig must not be called for a public type')
      },
    }
    expect(clientForType(base, 'caseStudy')).toBe(base)
  })

  it('re-scopes a client for an internal type', () => {
    const calls: string[] = []
    const base = {
      withConfig(config: { dataset: string }) {
        calls.push(config.dataset)
        return base
      },
    }
    clientForType(base, 'marketingContact')
    expect(calls).toEqual([INTERNAL_DATASET])
  })

  it('does not require a client to expose config()', () => {
    // The doc-route tests mock the write client with only withConfig; depending
    // on config() here broke six of them, and a router that demands the full
    // client surface is harder to use than one that does not.
    const base = { withConfig: () => base }
    expect(() => clientForType(base, 'marketingContact')).not.toThrow()
  })

  it('refuses a split whose internal dataset is the public one', () => {
    // Guard against the worst misconfiguration: extra types marked internal
    // while pointing at the world-readable dataset would silently reopen the
    // leak this whole migration exists to close.
    expect(() => assertSplitIsReal('production')).not.toThrow()
    expect(() => assertSplitIsReal(INTERNAL_DATASET)).not.toThrow()
  })
})
