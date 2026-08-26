import { describe, expect, it } from 'vitest'

import {
  buildActionAcknowledgement,
  buildIdentityPromptBlocks,
  buildTaskAttachment,
  buildTaskDetailBlocks,
  buildTaskDetailView,
  buildWeeklyDigestBlocks,
  markTaskInAttachments,
  markTaskInBlocks,
  MARKETING_ANSWER_BLOCK,
  modalTitle,
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

describe('buildTaskDetailBlocks', () => {
  const task = {
    _id: 'op1',
    title: 'Decide which price bands go public on the services pages',
    nextAction: 'Mark each offer public or call-only.',
    whyNow: 'The pricing calendar item is blocked on this.',
    summary: 'Public price bands qualify buyers before the first call.',
    humanQuestion: 'Which of the five bands are we comfortable publishing?',
    kind: 'decision',
    priority: 'high',
    status: 'needsHuman',
    ownerName: 'Juhan',
    dueAt: '2026-11-06T17:00:00.000Z',
  }

  it('leads with what needs doing, because that is the missing bit', () => {
    const text = json(buildTaskDetailBlocks(task))
    expect(text).toContain('What needs doing')
    expect(text).toContain('Mark each offer public or call-only')
    // It must come before the background.
    expect(text.indexOf('What needs doing')).toBeLessThan(text.indexOf('Background'))
  })

  it('shows a decision as a question to answer', () => {
    const text = json(buildTaskDetailBlocks(task))
    expect(text).toContain('The question to answer')
    expect(text).toContain('comfortable publishing')
    // "Why now" still appears when both exist.
    expect(text).toContain('Why now')
  })

  it('puts the facts in a context line', () => {
    const text = json(buildTaskDetailBlocks({ ...task, minutes: 45 }))
    expect(text).toContain('high priority')
    expect(text).toContain('owner: Juhan')
    expect(text).toContain('due 2026-11-06')
    expect(text).toContain('45m')
  })

  it('says "unowned" rather than leaving the owner blank', () => {
    expect(json(buildTaskDetailBlocks({ _id: 'x', title: 'T', nextAction: 'do it' }))).toContain('unowned')
  })

  it('admits when a task has no detail instead of showing an empty modal', () => {
    const text = json(buildTaskDetailBlocks({ _id: 'x', title: 'Bare task' }))
    expect(text).toContain('no detail recorded yet')
  })

  it('omits sections that have no content', () => {
    const text = json(buildTaskDetailBlocks({ _id: 'x', title: 'T', nextAction: 'do it' }))
    expect(text).not.toContain('Blocked by')
    expect(text).not.toContain('Background')
  })
})

describe('modalTitle', () => {
  it('trims to Slack’s 24-character limit, which the API enforces', () => {
    // views.open REJECTS a longer title outright, so a real task title cannot
    // be passed through untouched.
    const title = modalTitle('Decide which price bands go public on the services pages')
    expect(title.length).toBeLessThanOrEqual(24)
    expect(title.endsWith('…')).toBe(true)
  })

  it('leaves a short title alone and falls back when empty', () => {
    expect(modalTitle('Call ten')).toBe('Call ten')
    expect(modalTitle('')).toBe('Task')
  })
})

describe('markTaskInBlocks', () => {
  const blocks = buildWeeklyDigestBlocks(baseDigest)

  it('checks the task off and strikes its title', () => {
    const next = markTaskInBlocks(blocks, 'op1', '<@U1> picked it up.')
    const text = json(next)
    expect(text).toContain('white_check_mark')
    expect(text).toContain('~Call the top ten~')
    expect(text).toContain('picked it up')
  })

  it('removes that task’s buttons so it cannot be claimed twice', () => {
    const before = blocks.filter((b) => b.type === 'actions').length
    const next = markTaskInBlocks(blocks, 'op1', 'done')
    expect(next.filter((b) => b.type === 'actions').length).toBe(before - 1)
    // The other task keeps its buttons.
    expect(json(next)).toContain('op2')
  })

  it('leaves the rest of the message untouched', () => {
    const next = markTaskInBlocks(blocks, 'op1', 'done')
    expect(json(next)).toContain('Start calling your warmest contacts')
    expect(json(next)).toContain('Put price bands in writing')
    expect(next[0]).toMatchObject({ type: 'header' })
  })

  it('does nothing for a task that is not in the message', () => {
    expect(markTaskInBlocks(blocks, 'nope', 'done')).toEqual(blocks)
    expect(markTaskInBlocks(blocks, '', 'done')).toEqual(blocks)
  })
})

describe('buildTaskDetailView', () => {
  const decision = {
    _id: 'op1',
    title: 'Decide the price bands',
    kind: 'decision',
    humanQuestion: 'Which bands go public?',
    nextAction: 'Mark each offer public or call-only.',
  }

  it('offers a text box for a decision, so it can be answered in place', () => {
    const view = buildTaskDetailView(decision)
    const text = json(view)
    expect(text).toContain(MARKETING_ANSWER_BLOCK)
    expect(text).toContain('Save answer')
    expect(view.private_metadata).toBe('op1')
  })

  it('does NOT offer a text box for work a modal cannot do', () => {
    // Promising "write the article" can be finished here would be a lie.
    const view = buildTaskDetailView({ _id: 'op2', title: 'Write the article', kind: 'content' })
    expect(json(view)).not.toContain(MARKETING_ANSWER_BLOCK)
    expect(view.submit).toBeUndefined()
  })

  it('links to where the work happens when a url is available', () => {
    const view = buildTaskDetailView(decision, { studioUrl: 'https://x.test/studio/marketing?view=shop' })
    expect(json(view)).toContain('Open where this happens')
    expect(json(view)).toContain('view=shop')
  })

  it('omits the link rather than emitting a button with no url', () => {
    expect(json(buildTaskDetailView(decision))).not.toContain('Open where this happens')
  })
})

describe('buildTaskAttachment', () => {
  const task = {
    _id: 'op1',
    title: 'Call the top ten',
    ownerName: 'Juhan',
    slackUserId: 'U123',
    minutes: 45,
    kind: 'outreach',
    priority: 'urgent',
    whyNow: 'Wave 1 begins Sep 18.',
  }

  it('colours the card by priority — the only custom colour Slack allows', () => {
    expect(buildTaskAttachment(task).color).toBe('#d94d2f')
    expect(buildTaskAttachment({ ...task, priority: 'normal' }).color).toBe('#4fb3a5')
    // An unknown priority must still render, not vanish.
    expect(buildTaskAttachment({ ...task, priority: 'weird' }).color).toBeTruthy()
  })

  it('puts the primary action on the title row as an accessory, saving a row', () => {
    const first = buildTaskAttachment(task).blocks[0]
    expect(first.accessory).toMatchObject({ action_id: MARKETING_ACTION.claim })
    expect(first.text.text).toContain('Call the top ten')
  })

  it('lays the metadata out in two columns instead of a run-on line', () => {
    const fieldsBlock = buildTaskAttachment(task).blocks.find((b: { fields?: unknown }) => b.fields)
    const text = json(fieldsBlock)
    expect(text).toContain('*Owner*')
    expect(text).toContain('<@U123>')
    expect(text).toContain('*Effort*')
    expect(text).toContain('45m')
  })

  it('says unclaimed rather than leaving the owner field blank', () => {
    expect(json(buildTaskAttachment({ _id: 'x', title: 'T' }))).toContain('unclaimed')
  })
})

describe('markTaskInAttachments', () => {
  const attachments = [
    buildTaskAttachment({ _id: 'op1', title: 'Call the top ten', priority: 'urgent' }),
    buildTaskAttachment({ _id: 'op2', title: 'Write the article', priority: 'normal' }),
  ]

  it('collapses the finished card to one struck-through line', () => {
    const next = markTaskInAttachments(attachments, 'op1', '<@U1> picked it up.')
    expect(next[0].blocks).toHaveLength(1)
    expect(json(next[0])).toContain('~Call the top ten~')
    expect(json(next[0])).toContain('picked it up')
    expect(next[0].color).toBe('#3f7d5c')
  })

  it('leaves the other cards completely alone', () => {
    const next = markTaskInAttachments(attachments, 'op1', 'done')
    expect(next[1]).toEqual(attachments[1])
  })

  it('does nothing for a task that is not there', () => {
    expect(markTaskInAttachments(attachments, 'nope', 'done')).toEqual(attachments)
  })
})
