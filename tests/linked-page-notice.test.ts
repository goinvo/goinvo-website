import { describe, expect, it } from 'vitest'

import { changedFields, linkedNoticeStorageKey, shouldShowLinkedNotice } from '../src/sanity/linkedPageNotice'

// Rule: editing a vision piece that is also on /work says so once, per person and per piece, and never for an
// edit to the "Also show on /work" switch itself.

const base = { onBothPages: true, editedFields: ['title'], dismissedForever: false, shownThisSession: false }

describe('linked page edit notice', () => {
  it('shows on the first edit to a piece on both pages', () => {
    expect(shouldShowLinkedNotice(base)).toBe(true)
  })

  it.each([
    ['the piece is on /vision only', { onBothPages: false }],
    ['the person chose "don\'t show again"', { dismissedForever: true }],
    ['it was already shown this session', { shownThisSession: true }],
    ['the edit only toggles "Also show on /work"', { editedFields: ['featured'] }],
  ])('stays quiet when %s', (_label, change) => {
    expect(shouldShowLinkedNotice({ ...base, ...change })).toBe(false)
  })

  it('remembers per person and per piece, treating the draft and published piece as one', () => {
    expect(linkedNoticeStorageKey('u1', 'drafts.abc')).toBe(linkedNoticeStorageKey('u1', 'abc'))
    expect(linkedNoticeStorageKey('u1', 'abc')).not.toBe(linkedNoticeStorageKey('u2', 'abc'))
    expect(linkedNoticeStorageKey('u1', 'abc')).not.toBe(linkedNoticeStorageKey('u1', 'xyz'))
  })

  it('finds the edited fields, ignoring bookkeeping fields', () => {
    const content = [{ _key: 'a' }]
    const before = { _rev: '1', title: 'A', content }
    expect(changedFields(before, { _rev: '2', title: 'B', content })).toEqual(['title'])
  })
})
