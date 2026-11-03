import { LexoRank } from 'lexorank'
import { describe, expect, it } from 'vitest'

import { initialRank } from '../src/sanity/orderable/rank'
import caseStudy from '../src/sanity/schemas/caseStudy'
import feature from '../src/sanity/schemas/feature'
import teamMember from '../src/sanity/schemas/teamMember'

// Rule: a new item placed "before" the list never ties with an existing one. genPrev() stops at the minimum
// rank, so once one vision piece sat there (a bulk write put several there), every piece created after it got
// that same rank and the Studio list showed them as duplicates in an arbitrary order.

const MIN = LexoRank.min().toString()

describe('initialRank before the first item', () => {
  it('stays distinct, strictly earlier and above the minimum across many inserts', () => {
    let first = LexoRank.min().genNext().genNext().toString()
    const seen = new Set([first])
    for (let i = 0; i < 40; i++) {
      const next = initialRank(first, 'before')
      expect(next).not.toBe(MIN)
      expect(next < first).toBe(true)
      expect(seen.has(next)).toBe(false)
      seen.add(next)
      first = next
    }
  })

  it('does not tie with an item already on the minimum', () => {
    expect(initialRank(MIN, 'before')).not.toBe(MIN)
  })
})

describe('orderable schemas use the fixed resolver, not the plugin default', () => {
  it.each([
    ['feature', feature],
    ['caseStudy', caseStudy],
    ['teamMember', teamMember],
  ])('%s', async (type, schema) => {
    const field = (schema as { fields: Array<{ name: string; initialValue?: unknown }> }).fields.find(
      (f) => f.name === 'orderRank',
    )
    expect(typeof field?.initialValue).toBe('function')
    const lowest = LexoRank.min().genNext().genNext().toString()
    const getClient = () => ({ fetch: async () => lowest })
    const rank = await (field!.initialValue as (p: unknown, c: unknown) => Promise<string>)(undefined, { getClient })
    expect(rank).not.toBe(MIN)
    expect(rank < lowest).toBe(true)
    expect(type).toBeTruthy()
  })
})
