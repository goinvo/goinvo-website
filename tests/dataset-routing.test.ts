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
import { resolveMarketingModel } from '@/lib/marketing/anthropicJson'

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

describe('resolveMarketingModel dataset routing', () => {
  /**
   * The model picker is written by the Studio to wherever the router says
   * marketingSettings lives. Callers of resolveMarketingModel hand over
   * whatever client they already hold — the outreach routes pass an
   * outreach-bound one, the assist route a production-bound one — so reading
   * through the caller's client made the setting apply to some routes and not
   * others, with no error on either side.
   */
  function fakeClient(byDataset: Record<string, string | null>, startDataset: string) {
    const make = (dataset: string) => ({
      dataset,
      fetch: async () => byDataset[dataset] ?? null,
      withConfig: (config: { dataset?: string }) => make(config.dataset ?? dataset),
    })
    return make(startDataset)
  }

  it('reads the setting from the settings dataset, not the caller dataset', async () => {
    const settingsDataset = datasetForType('marketingSettings', 'production')
    const client = fakeClient(
      { [settingsDataset]: 'claude-haiku-4-5', somewhere_else: 'claude-sonnet-4-6' },
      'somewhere_else',
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await resolveMarketingModel(client as any)).toBe('claude-haiku-4-5')
  })

  it('still works for a client that cannot re-scope itself', async () => {
    const client = { fetch: async () => 'claude-sonnet-4-6' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await resolveMarketingModel(client as any)).toBe('claude-sonnet-4-6')
  })
})
