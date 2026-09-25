import { describe, expect, it } from 'vitest'

import { lastWeekNumbersBlock, type LastWeekNumbers } from '@/lib/marketing/slackDelegation'

import { expectValidSlackBlocks } from './support/slackBlocks'

const week = (outreach: Partial<NonNullable<LastWeekNumbers['outreach']>> | null, tasksDone = 2): LastWeekNumbers => ({
  tasksDone,
  outreach: outreach
    ? { touches: 0, people: 0, replies: 0, meetings: 0, opportunities: 0, won: 0, previousTouches: 0, ...outreach }
    : null,
})

const fields = (numbers: LastWeekNumbers) => (lastWeekNumbersBlock(numbers).fields || []).map((field: { text: string }) => field.text)

describe('last week, in numbers', () => {
  it('is a two-by-two grid of bold figures, each followed by what was counted', () => {
    const block = lastWeekNumbersBlock(week({ touches: 12, people: 7, replies: 3, meetings: 1, previousTouches: 9 }, 4))
    expectValidSlackBlocks([block])
    expect(block.fields).toHaveLength(4)
    expect(fields(week({ touches: 12, people: 7, replies: 3, meetings: 1, previousTouches: 9 }, 4))).toEqual([
      '*4* tasks done',
      '*12* touches · +3 on the week before',
      '*7* people reached',
      '*3* replies · *1* meeting',
    ])
  })

  it('writes the trend out in words, down as well as up — never an arrow a screen reader names', () => {
    expect(fields(week({ touches: 4, previousTouches: 9 }))[1]).toBe('*4* touches · −5 on the week before')
    expect(fields(week({ touches: 5, previousTouches: 5 }))[1]).toBe('*5* touches · same as the week before')
    expect(fields(week({ touches: 1 }))[1]).toBe('*1* touch · +1 on the week before')
    for (const text of fields(week({ touches: 4, previousTouches: 9 }))) expect(text).not.toMatch(/[↑↓]/)
  })

  it('says plainly when nothing moved, and counts a win', () => {
    expect(fields(week({ touches: 3, people: 3 }))[3]).toBe('*0* conversations moved forward')
    expect(fields(week({ touches: 3, people: 2, opportunities: 1, won: 1 }))[3]).toBe('*1* scoped · *1* won')
  })

  it('falls back to the sentence when the call log could not be read — only what is known', () => {
    const block = lastWeekNumbersBlock(week(null, 3))
    expect(block).toMatchObject({ type: 'context', elements: [{ text: 'Last week: 3 tasks done' }] })
    expect(lastWeekNumbersBlock(week(null, 1)).elements[0].text).toBe('Last week: 1 task done')
  })
})
