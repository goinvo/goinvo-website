import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runPublish, type PublishableItem } from '@/lib/marketing/publishers'

const baseItem: PublishableItem = {
  _id: 'calendar-1',
  _rev: 'source-rev',
  title: 'A post',
  status: 'scheduled',
  publishState: 'queued',
  contentType: 'post',
  channelKey: 'instagram',
  contentDraft: 'Hello',
  socialImageUrl: 'https://cdn.sanity.io/images/project/dataset/image.jpg',
  frames: [],
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function revisionClient(item: PublishableItem) {
  const revisions: string[] = []
  const patches: Array<Record<string, unknown>> = []
  const client = {
    fetch: vi.fn(async (query: string) =>
      String(query).includes('publishState == "processing"') ? [] : item,
    ),
    patch: vi.fn(() => {
      const values: Record<string, unknown> = {}
      const chain = {
        ifRevisionId: (revision: string) => {
          revisions.push(revision)
          return chain
        },
        set: (set: Record<string, unknown>) => {
          Object.assign(values, set)
          return chain
        },
        unset: () => chain,
        commit: vi.fn(async () => {
          patches.push({ ...values })
          if (values.publishState === 'publishing') return { _rev: 'claimed-rev' }
          return { _rev: 'written-rev' }
        }),
      }
      return chain
    }),
    revisions,
    patches,
  }
  return client
}

describe('publish worker replay and stale-write integrity', () => {
  beforeEach(() => {
    vi.stubEnv('INSTAGRAM_ACCESS_TOKEN', 'token')
    vi.stubEnv('INSTAGRAM_BUSINESS_ACCOUNT_ID', 'ig-user')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each([
    [{ publishState: 'published', status: 'published' }, /already published/i],
    [{ publishState: 'publishing' }, /already claimed/i],
    [{ publishState: 'processing' }, /already processing/i],
  ])('does not replay an item in an already-handled state', async (state, reason) => {
    const item = { ...baseItem, ...state }
    const client = revisionClient(item)
    const network = vi.fn()
    vi.stubGlobal('fetch', network)

    const result = await runPublish(client as never, {
      now: '2026-07-20T12:00:00.000Z',
      id: item._id,
    })

    expect(result.skipped).toBe(1)
    expect(result.results[0].reason).toMatch(reason)
    expect(client.patch).not.toHaveBeenCalled()
    expect(network).not.toHaveBeenCalled()
  })

  it('revision-guards the result so a late platform response cannot overwrite an editor', async () => {
    const client = revisionClient(baseItem)
    const originalPatch = client.patch
    client.patch = vi.fn(() => {
      const chain = originalPatch()
      const originalCommit = chain.commit
      chain.commit = vi.fn(async () => {
        const result = await originalCommit()
        if (client.revisions.at(-1) === 'claimed-rev') throw { statusCode: 409, message: 'revision conflict' }
        return result
      })
      return chain
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const url = String(input)
        if (url.includes('fields=permalink')) return response({ permalink: 'https://www.instagram.com/p/one/' })
        if (url.includes('/media_publish')) return response({ id: 'external-post-1' })
        return response({ id: 'container-1' })
      }),
    )

    const result = await runPublish(client as never, {
      now: '2026-07-20T12:00:00.000Z',
      id: baseItem._id,
    })

    expect(client.revisions).toEqual(['source-rev', 'claimed-rev'])
    expect(result.published).toBe(0)
    expect(result.failed).toBe(1)
    expect(result.results[0]).toMatchObject({ outcome: 'failed', externalId: 'external-post-1' })
    expect(result.results[0].reason).toMatch(/write-back failed/i)
  })

  it('rejects an oversized caption before platform I/O and records the failure', async () => {
    const client = revisionClient({ ...baseItem, contentDraft: 'x'.repeat(2_201) })
    const network = vi.fn()
    vi.stubGlobal('fetch', network)

    const result = await runPublish(client as never, {
      now: '2026-07-20T12:00:00.000Z',
      id: baseItem._id,
    })

    expect(network).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
    expect(result.results[0].reason).toMatch(/2200-character limit/i)
    expect(client.patches.at(-1)).toMatchObject({ publishState: 'failed' })
  })

  it('hard-caps internal batch requests at 25 records', async () => {
    vi.unstubAllEnvs()
    const items = Array.from({ length: 40 }, (_, index) => ({
      ...baseItem,
      _id: `calendar-${index}`,
      channelKey: 'instagram',
    }))
    const client = {
      fetch: vi.fn(async (query: string) =>
        String(query).includes('publishState == "processing"') ? [] : items,
      ),
      patch: vi.fn(() => {
        throw new Error('unconnected items must not be patched')
      }),
    }

    const result = await runPublish(client as never, {
      now: '2026-07-20T12:00:00.000Z',
      maxItems: 1_000_000,
    })
    expect(result.considered).toBe(40)
    expect(result.processed).toBe(25)
    expect(result.skipped).toBe(25)
  })
})
