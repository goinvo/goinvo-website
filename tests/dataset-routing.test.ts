import { readFileSync } from 'node:fs'

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

  it('routes the wave-1 marketing core to the internal dataset after cutover', () => {
    // Cut over on 2026-08-24. Every already-private type must survive the
    // change, and the wave-1 core must now resolve internally — reading these
    // from production would silently return the stale copies that are still
    // there until the step-8 delete.
    for (const type of OUTREACH_DATASET_TYPES) {
      expect(isInternalMarketingType(type)).toBe(true)
    }
    for (const type of ['marketingCalendarItem', 'marketingIdea', 'marketingSettings']) {
      expect(datasetForType(type, 'production')).toBe(INTERNAL_DATASET)
    }
  })

  it('has not moved the types still waiting on waves 2 and 3', () => {
    for (const type of ['cmsFeedback', 'previewShareLink']) {
      expect(datasetForType(type, 'production')).toBe('production')
    }
  })

  it('keeps the routing table in step with the mover script', () => {
    // The script copies exactly WAVE_1; the router decides where reads go. If
    // the two drift, documents are read from a dataset they were never copied
    // to and the query just returns nothing — no error anywhere.
    const mover = readFileSync(
      new URL('../scripts/split-marketing-dataset.mjs', import.meta.url),
      'utf8',
    )
    const block = mover.split('const WAVE_1 = [')[1]?.split(']')[0] ?? ''
    const waveTypes = [...block.matchAll(/'([^']+)'/g)].map((match) => match[1])
    expect(waveTypes.length).toBeGreaterThan(0)
    for (const type of waveTypes) {
      expect(isInternalMarketingType(type)).toBe(true)
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
    // A real public dataset is fine.
    expect(() => assertSplitIsReal('production')).not.toThrow()
    // Pointing the internal dataset AT the public one is the misconfiguration.
    // Before cutover this was inert because no extra types were marked
    // internal; now that wave 1 is live it must throw rather than quietly serve
    // private records from the world-readable dataset.
    expect(() => assertSplitIsReal(INTERNAL_DATASET)).toThrow(/internal dataset is the public one/)
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

describe('marketingOrgResearch routing', () => {
  it('resolves to the private dataset', () => {
    // It names prospects and how we plan to approach them, and it only ever
    // existed in outreach — reading it from production returns nothing at all.
    expect(datasetForType('marketingOrgResearch', 'production')).toBe(INTERNAL_DATASET)
    expect(isInternalMarketingType('marketingOrgResearch')).toBe(true)
  })
})

describe('availability and financial posture routing', () => {
  it('keeps who is around this week out of the public dataset', () => {
    // Both were missing from the list, and getMarketingWriteClientFor passes an
    // unlisted type straight through to the PUBLIC dataset. A real record was
    // found in production on 2026-08-27 carrying a colleague's name and Slack
    // id, written by the Slack identity-link button the day before.
    expect(datasetForType('marketingTeamAvailability', 'production')).toBe(INTERNAL_DATASET)
    expect(isInternalMarketingType('marketingTeamAvailability')).toBe(true)
  })

  it('keeps the runway out of the public dataset', () => {
    // This one says in plain numbers how close the studio is to running out of
    // money. An unauthenticated GROQ query must never be able to answer it.
    expect(datasetForType('marketingFinancialPosture', 'production')).toBe(INTERNAL_DATASET)
    expect(isInternalMarketingType('marketingFinancialPosture')).toBe(true)
  })

  it('routes the Slack availability write to the same place the digest reads', () => {
    // The failure was not a leak alone: the digest reads outreach, so pressing
    // "I'm away" wrote to production, changed nothing, and reported success.
    expect(datasetForType('marketingTeamAvailability', 'production')).toBe(
      datasetForType('marketingOperation', 'production'),
    )
  })
})
