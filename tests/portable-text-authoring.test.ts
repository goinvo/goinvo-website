import { describe, expect, it } from 'vitest'

import portableTextSchema from '../src/sanity/schemas/objects/portableText'

describe('Portable Text authoring', () => {
  it('exposes per-list bullet styles in the block toolbar', () => {
    const blockMember = portableTextSchema.of?.find((member) => member.type === 'block') as
      | { lists?: Array<{ title: string; value: string }> }
      | undefined

    expect(blockMember).toBeDefined()
    expect((blockMember?.lists || []).map((list) => list.value)).toEqual([
      'bullet',
      'plainBullet',
      'number',
    ])
    expect((blockMember?.lists || []).map((list) => list.title)).toEqual([
      'Star bullet',
      'Disc bullet',
      'Numbered',
    ])
  })
})
