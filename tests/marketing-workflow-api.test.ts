import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = vi.hoisted(() => ({
  fetch: vi.fn(),
  create: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => mockClient),
}))

vi.mock('@/sanity/env', () => ({
  apiVersion: '2025-01-01',
  dataset: 'production',
  projectId: 'test-project',
  writeToken: 'test-write-token',
}))

import { POST as draftContent } from '@/app/api/marketing/content/draft/route'
import { POST as convertResearch } from '@/app/api/marketing/research/convert/route'

const patchPayloads: Array<{ id: string; value: Record<string, unknown> }> = []

function workflowRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  patchPayloads.length = 0
  let createCounter = 0
  mockClient.create.mockImplementation(async (document: { _type: string }) => ({
    ...document,
    _id: `${document._type}-${(createCounter += 1)}`,
  }))
  mockClient.patch.mockImplementation((id: string) => ({
    set(value: Record<string, unknown>) {
      patchPayloads.push({ id, value })
      return this
    },
    commit: vi.fn(async () => ({ _id: id })),
  }))
})

afterEach(() => {
  mockClient.fetch.mockReset()
  mockClient.create.mockReset()
  mockClient.patch.mockReset()
  vi.unstubAllGlobals()
})

describe('marketing workflow APIs', () => {
  it('converts approved selected research findings into linked marketing records', async () => {
    mockClient.fetch.mockImplementation(async (query: string) => {
      if (query.includes('marketingResearchProject')) {
        return {
          _id: 'project-1',
          title: 'Boston Housing Truths',
          brief: 'Use reviewed evidence to plan a small Instagram content runway.',
          audience: 'Civic data and design teams',
          campaignObjective: 'awareness',
          canonicalUrl: 'https://housingtruths.org',
          generatedCampaignIds: [],
          generatedFunnelIds: [],
          generatedCalendarItemIds: [],
          generatedLinkItemIds: [],
        }
      }
      if (query.includes('marketingResearchResult')) {
        return [
          {
            _id: 'result-seo',
            title: 'Boston housing statistics keyword score',
            resultType: 'seoKeyword',
            keyword: 'Boston housing statistics',
            searchIntent: 'learn',
            volume: 120,
            difficulty: 38,
            canonicalUrl: 'https://housingtruths.org',
          },
          {
            _id: 'result-source',
            title: 'Housing Truths source evidence',
            resultType: 'sourceEvidence',
            claim: 'Housing affordability pressure can be explained visually.',
            sourceUrl: 'https://housingtruths.org',
          },
        ]
      }
      if (query.includes('marketingChannel')) return []
      if (query.includes('marketingLinkItem')) return 20
      throw new Error(`Unexpected query: ${query}`)
    })

    const response = await convertResearch(
      workflowRequest('http://localhost/api/marketing/research/convert', {
        projectId: 'project-1',
        resultIds: ['result-seo', 'result-source'],
      }) as never,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('converted')
    expect(payload.usedResultIds).toEqual(['result-seo', 'result-source'])
    expect(payload.campaignIds).toHaveLength(1)
    expect(payload.funnelIds).toHaveLength(1)
    expect(payload.calendarItemIds).toHaveLength(2)
    expect(payload.linkItemIds).toHaveLength(2)

    const createdTypes = mockClient.create.mock.calls.map(([document]) => document._type)
    expect(createdTypes).toEqual(
      expect.arrayContaining([
        'marketingChannel',
        'marketingFunnel',
        'marketingCampaign',
        'marketingCalendarItem',
        'marketingLinkItem',
      ]),
    )

    const createdCalendar = mockClient.create.mock.calls
      .map(([document]) => document)
      .find((document) => document._type === 'marketingCalendarItem')
    expect(createdCalendar).toMatchObject({
      status: 'drafting',
      channel: 'instagram',
      researchProject: { _type: 'reference', _ref: 'project-1' },
      researchResults: [{ _type: 'reference', _ref: 'result-seo' }],
    })

    const projectPatch = patchPayloads.find((payload) => payload.id === 'project-1')
    expect(projectPatch?.value).toMatchObject({
      status: 'converted',
      selectedResults: [
        { _type: 'reference', _ref: 'result-seo' },
        { _type: 'reference', _ref: 'result-source' },
      ],
    })
  })

  it('returns existing generated records instead of duplicating a converted project', async () => {
    mockClient.fetch.mockResolvedValueOnce({
      _id: 'project-1',
      title: 'Already Converted',
      generatedCampaignIds: ['campaign-existing'],
      generatedFunnelIds: ['funnel-existing'],
      generatedCalendarItemIds: ['calendar-existing'],
      generatedLinkItemIds: ['link-existing'],
    })

    const response = await convertResearch(
      workflowRequest('http://localhost/api/marketing/research/convert', {
        projectId: 'project-1',
      }) as never,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('alreadyConverted')
    expect(payload.calendarItemIds).toEqual(['calendar-existing'])
    expect(mockClient.create).not.toHaveBeenCalled()
  })

  it('drafts and saves planned content onto a calendar item', async () => {
    mockClient.fetch.mockResolvedValueOnce({
      _id: 'calendar-1',
      title: 'Boston Housing Truths Instagram carousel',
      status: 'idea',
      contentType: 'carousel',
      channel: 'instagram',
      brief: 'Use the approved findings without inventing unsupported statistics.',
      callToAction: 'See link in bio',
      workingUrl: 'https://housingtruths.org',
      researchResults: [
        {
          title: 'Boston housing statistics keyword score',
          resultType: 'seoKeyword',
          keyword: 'Boston housing statistics',
          volume: 120,
          difficulty: 38,
        },
      ],
      linkItems: [{ title: 'Housing Truths', url: 'https://housingtruths.org' }],
    })

    const assistFetch = vi.fn(async (_url: URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body.kind).toBe('contentDraft')
      expect(body.draft.title).toBe('Boston Housing Truths Instagram carousel')
      expect(body.prompt).toContain('Do not invent provider scores')

      return new Response(
        JSON.stringify({
          usedAi: true,
          suggestion: {
            contentDraft: {
              format: 'carousel',
              channel: 'instagram',
              headline: 'Boston housing pressure, in plain sight',
              caption: 'Boston housing data is easier to act on when the pattern is visible. See link in bio.',
              frames: [
                {
                  title: 'Start with the pattern',
                  body: 'Housing pressure is not one number. It is a pattern across rent, wages, and geography.',
                  visualDirection: 'Show a simple map or comparison grid.',
                  altText: 'A visual comparison of Boston housing pressure indicators.',
                },
              ],
              altText: 'Carousel explaining Boston housing data with a link to Housing Truths.',
              hashtags: ['BostonHousing', 'CivicDesign'],
              productionNotes: 'Source-check before publishing.',
              callToAction: 'See link in bio',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', assistFetch)

    const response = await draftContent(
      workflowRequest('http://localhost/api/marketing/content/draft', {
        calendarItemId: 'calendar-1',
        prompt: 'Keep it useful for designers.',
      }) as never,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.saved).toBe(true)
    expect(payload.usedAi).toBe(true)
    expect(payload.contentDraft.frames).toHaveLength(1)

    const calendarPatch = patchPayloads.find((payload) => payload.id === 'calendar-1')
    expect(calendarPatch?.value).toMatchObject({
      status: 'drafting',
      contentDraft: 'Boston housing data is easier to act on when the pattern is visible. See link in bio.',
      draftAltText: 'Carousel explaining Boston housing data with a link to Housing Truths.',
      draftHashtags: ['BostonHousing', 'CivicDesign'],
      contentProductionNotes: 'Source-check before publishing.',
    })
    expect((calendarPatch?.value.draftFrames as Array<{ _type: string }>)[0]._type).toBe('draftFrame')
  })
})
