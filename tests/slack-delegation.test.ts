import { describe, expect, it } from 'vitest'

import {
  buildActionAcknowledgement,
  buildIdentityPromptBlocks,
  buildWeeklyDigestBlocks,
  decodeActionValue,
  encodeActionValue,
  isMarketingAction,
  MARKETING_ACTION,
} from '@/lib/marketing/slackDelegation'

const baseDigest = {
  theme: 'Start calling your warmest contacts',
  weekStart: '2026-08-24',
  weekEnd: '2026-08-30',
  plannedMinutes: 200,
  budgetMinutes: 240,
  tasks: [
    { _id: 'op1', title: 'Call the top ten', ownerName: 'Juhan', slackUserId: 'U123', minutes: 45 },
    { _id: 'op2', title: 'Put price bands in writing', ownerName: 'Juhan', minutes: 30 },
  ],
}

const json = (blocks: unknown) => JSON.stringify(blocks)

describe('encode/decodeActionValue', () => {
  it('round-trips a task and owner', () => {
    const value = encodeActionValue({ taskId: 'op1', ownerName: 'Juhan' })
    expect(decodeActionValue(value)).toEqual({ taskId: 'op1', ownerName: 'Juhan' })
  })

  it('stays inside Slack’s value limit', () => {
    // Slack silently drops a message whose action value exceeds 2000 chars.
    const value = encodeActionValue({ taskId: 'x'.repeat(5000), ownerName: 'y'.repeat(5000) })
    expect(value.length).toBeLessThanOrEqual(1900)
  })

  it('returns null for junk rather than throwing', () => {
    expect(decodeActionValue(undefined)).toBeNull()
    expect(decodeActionValue('not json')).toBeNull()
    expect(decodeActionValue('{}')).toBeNull()
  })
})

describe('isMarketingAction', () => {
  it('recognises only our namespaced actions', () => {
    expect(isMarketingAction(MARKETING_ACTION.claim)).toBe(true)
    expect(isMarketingAction('goinvo_chat_mark_resolved')).toBe(false)
    expect(isMarketingAction(undefined)).toBe(false)
  })
})

describe('buildWeeklyDigestBlocks', () => {
  it('leads with the theme and the hours', () => {
    const blocks = buildWeeklyDigestBlocks(baseDigest)
    expect(blocks[0]).toMatchObject({ type: 'header' })
    expect(json(blocks)).toContain('Start calling your warmest contacts')
    expect(json(blocks)).toContain('3h 20m of open work')
    expect(json(blocks)).toContain('4h budget')
  })

  it('@-mentions the owner when we know their Slack id, and names them when we do not', () => {
    const text = json(buildWeeklyDigestBlocks(baseDigest))
    expect(text).toContain('<@U123>')
    // op2 has no slackUserId, so it must still say who it belongs to.
    expect(text).toContain('Juhan')
  })

  it('gives every task both replies a person actually has', () => {
    const blocks = buildWeeklyDigestBlocks(baseDigest)
    const actions = blocks.filter((block) => block.type === 'actions')
    // One per task, plus the trailing week-level row.
    expect(actions.length).toBe(3)
    expect(json(actions)).toContain(MARKETING_ACTION.claim)
    expect(json(actions)).toContain(MARKETING_ACTION.decline)
  })

  it('says when there is more work than fits, rather than calling it a plan', () => {
    // Claiming work is "planned" when it exceeds the budget is how a plan
    // quietly loses the team's trust.
    const over = buildWeeklyDigestBlocks({ ...baseDigest, plannedMinutes: 300, budgetMinutes: 240 })
    expect(json(over)).toContain('more than fits')
    expect(json(buildWeeklyDigestBlocks(baseDigest))).not.toContain('more than fits')
  })

  it('always offers a way to say you are away', () => {
    expect(json(buildWeeklyDigestBlocks(baseDigest))).toContain(MARKETING_ACTION.away)
  })

  it('names who is free when someone is away, and admits when nobody is', () => {
    const withCandidates = buildWeeklyDigestBlocks({
      ...baseDigest,
      awayNotices: [{ awayOwner: 'Juhan', taskTitle: 'Call the top ten', candidates: ['Jon'] }],
    })
    expect(json(withCandidates)).toContain('Free this week: Jon')

    const none = buildWeeklyDigestBlocks({
      ...baseDigest,
      awayNotices: [{ awayOwner: 'Juhan', taskTitle: 'Call the top ten', candidates: [] }],
    })
    expect(json(none)).toContain('Nobody is free this week')
  })

  it('caps the task list and the call sheet so the message stays readable', () => {
    const blocks = buildWeeklyDigestBlocks({
      ...baseDigest,
      tasks: Array.from({ length: 20 }, (_, i) => ({ _id: `op${i}`, title: `Task ${i}` })),
      callSheet: Array.from({ length: 9 }, (_, i) => ({
        organization: `Org ${i}`,
        contacts: [{ name: 'A' }],
        signal: 'something happened',
        quote: 'q',
        sourceUrl: 'https://example.org',
        opening: 'o',
        offer: null,
        context: '',
      })),
    })
    expect(json(blocks)).toContain('Task 7')
    expect(json(blocks)).not.toContain('Task 8')
    expect(json(blocks)).toContain('Org 2')
    expect(json(blocks)).not.toContain('Org 3')
  })

  it('links the source for each call-sheet entry', () => {
    const blocks = buildWeeklyDigestBlocks({
      ...baseDigest,
      callSheet: [
        {
          organization: 'MEDITECH',
          contacts: [{ name: 'A' }, { name: 'B' }],
          signal: 'MEDITECH announced something',
          quote: 'q',
          sourceUrl: 'https://example.org/news#:~:text=announced',
          opening: 'o',
          offer: null,
          context: '',
        },
      ],
    })
    expect(json(blocks)).toContain('2 people')
    expect(json(blocks)).toContain('example.org/news')
  })

  it('omits the plan link when there is no url rather than emitting a broken button', () => {
    const withUrl = json(buildWeeklyDigestBlocks({ ...baseDigest, studioUrl: 'https://x.test/studio' }))
    expect(withUrl).toContain('Open the plan')
    expect(json(buildWeeklyDigestBlocks(baseDigest))).not.toContain('Open the plan')
  })
})

describe('buildActionAcknowledgement', () => {
  it('says what happened, so the channel still makes sense afterwards', () => {
    expect(
      buildActionAcknowledgement({ action: MARKETING_ACTION.claim, userId: 'U1', taskTitle: 'Call ten' }),
    ).toBe('<@U1> picked up *Call ten*.')
    expect(
      buildActionAcknowledgement({ action: MARKETING_ACTION.decline, userId: 'U1', taskTitle: 'Call ten' }),
    ).toContain('needs another owner')
    expect(buildActionAcknowledgement({ action: MARKETING_ACTION.away, userId: 'U1' })).toContain(
      'away this week',
    )
  })
})

describe('buildIdentityPromptBlocks', () => {
  it('offers each unmapped owner as a choice', () => {
    const blocks = buildIdentityPromptBlocks(['Juhan', 'Shirley'])
    expect(json(blocks)).toContain(MARKETING_ACTION.linkIdentity)
    expect(json(blocks)).toContain('Juhan')
    expect(json(blocks)).toContain('Shirley')
  })

  it('states what is stored before anyone presses anything', () => {
    // The asking IS the consent, so the prompt has to say what it keeps.
    const text = json(buildIdentityPromptBlocks(['Juhan']))
    expect(text).toContain('Slack user ID')
    expect(text).toContain('only for the people who choose to')
  })

  it('disappears entirely once everyone is mapped, rather than nagging', () => {
    expect(buildIdentityPromptBlocks([])).toEqual([])
    expect(buildIdentityPromptBlocks(['', ''])).toEqual([])
  })

  it('caps the list so one enormous team cannot break the message', () => {
    const many = Array.from({ length: 40 }, (_, i) => `Person ${i}`)
    const select = buildIdentityPromptBlocks(many)[2].elements[0]
    expect(select.options).toHaveLength(20)
  })
})
