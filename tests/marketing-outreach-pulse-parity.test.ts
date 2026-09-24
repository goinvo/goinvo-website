/**
 * "Outreach this week: …" on Outreach and on This week are one sentence.
 *
 * Both Studio tabs print it under the same label. Outreach used to build it
 * from `summarizeOutreach` alone, which counts follow-ups due before the end
 * of the ISO week, while This week's header (plan-week's `pulse`) counts the
 * follow-ups it lays out as rows — a rolling seven days. On a Thursday with
 * follow-ups on Monday and Tuesday, Outreach said "no outreach logged yet."
 * and This week said "… 2 follow-ups waiting." about the same two people.
 *
 * So this runs the real plan-week route (against a mocked Sanity, as
 * tests/plan-week-route.test.ts does) and the Outreach helper over the same
 * contacts at the same instant, and requires the same words.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const client = () => ({
    fetch: vi.fn(),
    createIfNotExists: vi.fn(),
    patch: vi.fn(() => {
      const chain: Record<string, unknown> = {}
      for (const op of ['set', 'unset', 'setIfMissing', 'ifRevisionId', 'insert']) chain[op] = () => chain
      chain.commit = async () => ({})
      return chain
    }),
  })
  return { planWeek: client(), outreach: client(), settings: client() }
})

vi.mock('@/lib/marketing/auth', () => {
  class TestMarketingAuthError extends Error {
    status = 401
  }
  return { assertStudioWriterOrApiKey: vi.fn(async () => {}), MarketingAuthError: TestMarketingAuthError }
})
vi.mock('@/lib/marketing/outreachClient.server', () => ({ getOutreachClient: () => mocks.outreach }))
vi.mock('@/lib/marketing/client', () => ({ getMarketingWriteClientFor: () => mocks.settings }))
// plan-week pins its own client with createClient; everything else in the
// Studio import graph keeps the real package.
vi.mock('@sanity/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sanity/client')>()),
  createClient: () => mocks.planWeek,
}))
vi.mock('@/lib/marketing/anthropicJson', () => ({
  isAnthropicConfigured: () => false,
  generateClaudeText: vi.fn(),
  parseJsonObject: vi.fn(),
  resolveMarketingModel: vi.fn(),
}))

// The tool shell first, as the Studio loads it (Outreach and the shell import each other).
import '@/sanity/tools/marketingTool'
import { GET as PLAN_WEEK_GET } from '@/app/api/marketing/plan-week/route'
import { outreachPulseSentence } from '@/sanity/components/marketing/OutreachWorkspace'

type Contact = {
  _id: string
  name?: string
  organization?: string
  owner?: string
  status?: string
  warmth?: string
  followUpAt?: string | null
  interactions?: Array<{ at?: string; by?: string; channel?: string; statusAfter?: string; value?: number }>
}

const contact = (id: string, extra: Partial<Contact> = {}): Contact => ({
  _id: id,
  name: `Person ${id}`,
  organization: 'Acme Health',
  owner: 'Juhan',
  status: 'contacted',
  warmth: 'warm',
  followUpAt: null,
  interactions: [],
  ...extra,
})

/** This week's sentence: the plan-week route's `pulse`, over `published` (its GROQ never returns drafts). */
async function thisWeekSays(published: Contact[]): Promise<string> {
  mocks.outreach.fetch.mockResolvedValue({ contacts: published, team: [{ ownerName: 'Juhan', slackUserId: 'UJUHAN' }] })
  const response = await PLAN_WEEK_GET(
    new NextRequest('https://www.goinvo.com/api/marketing/plan-week', { headers: { authorization: 'Bearer key' } }),
  )
  const body = await response.json()
  expect(typeof body.pulse, 'plan-week returned a pulse').toBe('string')
  return body.pulse as string
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  for (const client of [mocks.planWeek, mocks.outreach, mocks.settings]) client.fetch.mockReset()
  mocks.planWeek.fetch.mockImplementation(async (query: string) => (query.includes('"marketingOperation"') ? [] : null))
  mocks.settings.fetch.mockResolvedValue({ weeklyMarketingHours: 4 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the outreach pulse on Outreach and on This week', () => {
  it('agrees on a Thursday whose follow-ups fall on Monday and Tuesday', async () => {
    const now = new Date('2026-09-24T15:00:00.000Z') // Thu 24 Sep
    vi.setSystemTime(now)
    const contacts = [
      contact('mon', { followUpAt: '2026-09-28T14:00:00.000Z' }),
      contact('tue', { status: 'responded', followUpAt: '2026-09-29T14:00:00.000Z' }),
    ]
    const outreach = outreachPulseSentence(contacts, now)
    expect(outreach).toBe('Outreach this week: no outreach logged yet. 2 follow-ups waiting.')
    expect(outreach).toBe(await thisWeekSays(contacts))
  })

  it('agrees on a week with touches, one from last week, and overdue follow-ups', async () => {
    const now = new Date('2026-09-24T15:00:00.000Z')
    vi.setSystemTime(now)
    const contacts = [
      contact('called', {
        followUpAt: '2026-09-22T14:00:00.000Z',
        interactions: [
          { at: '2026-09-17T14:00:00.000Z', by: 'Juhan', channel: 'phone', statusAfter: 'contacted' },
          { at: '2026-09-22T14:00:00.000Z', by: 'Shirley', channel: 'phone', statusAfter: 'responded' },
        ],
        status: 'responded',
      }),
      contact('emailed', {
        followUpAt: '2026-09-30T14:00:00.000Z',
        interactions: [{ at: '2026-09-23T14:00:00.000Z', by: 'Juhan', channel: 'email', statusAfter: 'contacted' }],
      }),
      contact('later', { followUpAt: '2026-10-09T14:00:00.000Z' }),
      contact('closed', { status: 'won', followUpAt: '2026-09-23T14:00:00.000Z' }),
    ]
    const outreach = outreachPulseSentence(contacts, now)
    expect(outreach).toMatch(/^Outreach this week: 2 touches \(2 people\) · 1 reply · 2 follow-ups due \(1 overdue\)\.$/)
    expect(outreach).toBe(await thisWeekSays(contacts))
  })

  it('agrees when a draft sits beside its published contact (plan-week never reads drafts)', async () => {
    const now = new Date('2026-09-21T13:00:00.000Z') // Mon 21 Sep
    vi.setSystemTime(now)
    const published = contact('jane', {
      followUpAt: '2026-09-23T14:00:00.000Z',
      interactions: [{ at: '2026-09-21T12:00:00.000Z', by: 'Juhan', channel: 'phone', statusAfter: 'contacted' }],
    })
    const draft = { ...published, _id: 'drafts.jane' }
    expect(outreachPulseSentence([published, draft], now)).toBe(await thisWeekSays([published]))
  })
})
