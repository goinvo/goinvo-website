import type { SanityClient } from '@sanity/client'
import { describe, expect, it, vi } from 'vitest'
import {
  ensureDrainSignalLinked,
  type ExperimentForDrain,
} from '@/lib/marketing/drainSink'

describe('drain signal link concurrency', () => {
  it('uses the experiment revision so concurrent server instances append one reference', async () => {
    const state: ExperimentForDrain = {
      _id: 'experiment-1',
      _rev: 'revision-1',
      performanceSignals: [],
    }
    let revision = 1
    let successfulAppends = 0
    const fetch = vi.fn(async () => structuredClone(state))
    const patch = vi.fn((id: string) => {
      let expectedRevision = ''
      let references: Array<{ _ref: string }> = []
      const chain = {
        ifRevisionId(value: string) {
          expectedRevision = value
          return chain
        },
        setIfMissing() {
          return chain
        },
        append(_path: string, value: Array<{ _ref: string }>) {
          references = value
          return chain
        },
        async commit() {
          if (id !== state._id) throw new Error('unexpected document')
          if (expectedRevision !== state._rev) {
            throw Object.assign(new Error('revision conflict'), { statusCode: 409 })
          }
          successfulAppends += 1
          state.performanceSignals = [...(state.performanceSignals || []), ...references]
          revision += 1
          state._rev = `revision-${revision}`
          return structuredClone(state)
        },
      }
      return chain
    })
    const client = { fetch, patch } as unknown as SanityClient
    const staleSnapshot = structuredClone(state)

    await Promise.all([
      ensureDrainSignalLinked(client, structuredClone(staleSnapshot), 'signal-1'),
      ensureDrainSignalLinked(client, structuredClone(staleSnapshot), 'signal-1'),
    ])

    expect(successfulAppends).toBe(1)
    expect(state.performanceSignals).toHaveLength(1)
    expect(state.performanceSignals?.[0]).toMatchObject({ _ref: 'signal-1' })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
