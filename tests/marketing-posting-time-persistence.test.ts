import { describe, expect, it, vi } from 'vitest'
import { applyPostingTimeResearch, type PostingTimeRecommendation } from '@/lib/marketing/postingTimeResearch'

describe('posting-time persistence', () => {
  it('binds the write to the revision that research was based on', async () => {
    const chain = {
      ifRevisionId: vi.fn(),
      set: vi.fn(),
      commit: vi.fn(async () => undefined),
    }
    chain.ifRevisionId.mockReturnValue(chain)
    chain.set.mockReturnValue(chain)
    const client = { patch: vi.fn(() => chain) }
    const rec: PostingTimeRecommendation = {
      summary: 'Use Tuesday',
      timezoneLogic: 'ET',
      avoid: [],
      slots: [],
      sources: [],
      model: 'test',
      researchedAt: '2026-07-20T00:00:00.000Z',
      plan: {
        channelId: 'channel-1', channelTitle: 'Channel', platform: 'social', audience: 'A', goal: 'G',
        contentTypes: [], questions: [], timezoneLogic: 'ET',
      },
    }

    await applyPostingTimeResearch(client as never, 'channel-1', rec, 'rev-1')
    expect(chain.ifRevisionId).toHaveBeenCalledWith('rev-1')
    expect(chain.set).toHaveBeenCalledTimes(1)
    expect(chain.commit).toHaveBeenCalledTimes(1)
  })
})
