import { describe, expect, it, vi } from 'vitest'
import type { SanityClient } from '@sanity/client'
import { rollbackCreatedRecords } from '@/lib/marketing/cascades'

function mockClient() {
  const deletes: string[] = []
  const tx = {
    delete: vi.fn((id: string) => {
      deletes.push(id)
      return tx
    }),
    commit: vi.fn(async () => undefined),
  }
  const client = { transaction: vi.fn(() => tx) }
  return { client: client as unknown as SanityClient, raw: client, tx, deletes }
}

describe('rollbackCreatedRecords (cascade atomicity)', () => {
  it('deletes every created id in a single transaction', async () => {
    const m = mockClient()
    await rollbackCreatedRecords(m.client, ['funnel1', 'campaign1', 'cal1', 'link1'])
    // One transaction (so calendar↔link mutual references delete together).
    expect(m.raw.transaction).toHaveBeenCalledTimes(1)
    expect(m.deletes).toEqual(['funnel1', 'campaign1', 'cal1', 'link1'])
    expect(m.tx.commit).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when there is nothing to roll back', async () => {
    const m = mockClient()
    await rollbackCreatedRecords(m.client, [])
    expect(m.raw.transaction).not.toHaveBeenCalled()
  })

  it('swallows cleanup errors so the original cascade failure can surface', async () => {
    const m = mockClient()
    m.tx.commit.mockRejectedValueOnce(new Error('network'))
    await expect(rollbackCreatedRecords(m.client, ['a'])).resolves.toBeUndefined()
  })
})
