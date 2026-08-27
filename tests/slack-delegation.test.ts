import { describe, expect, it } from 'vitest'

import {
  buildActionAcknowledgement,
  buildIdentityPromptBlocks,
  buildTaskAttachment,
  buildTaskDetailBlocks,
  buildTaskDetailView,
  buildWeeklyDigestBlocks,
  refreshTaskInAttachments,
  markTaskInBlocks,
  MARKETING_ANSWER_BLOCK,
  modalTitle,
  decodeActionValue,
  encodeActionValue,
  isMarketingAction,
  MARKETING_ACTION,
  MARKETING_RUNWAY_CALLBACK,
  RUNWAY_MONTHS_BLOCK,
  RUNWAY_MONTHS_INPUT,
  RUNWAY_LABEL_BLOCK,
  RUNWAY_LABEL_INPUT,
  buildRunwayBlocks,
  buildRunwayView,
  readRunwaySubmission,
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
    expect(decodeActionValue(value)).toEqual({ taskId: 'op1', ownerName: 'Juhan', status: '' })
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

  it('keeps all three buttons in ONE row', () => {
    // As an accessory the primary button sat detached in the corner, reading as
    // unrelated to the two below it.
    const blocks = buildTaskAttachment(task).blocks
    expect(blocks[0].accessory).toBeUndefined()
    const actions = blocks.filter((b: { type: string }) => b.type === 'actions')
    expect(actions).toHaveLength(1)
    expect(actions[0].elements.map((e: { action_id: string }) => e.action_id)).toEqual([
      MARKETING_ACTION.claim,
      MARKETING_ACTION.details,
      MARKETING_ACTION.decline,
    ])
  })

  it('lays the metadata out in two columns instead of a run-on line', () => {
    const fieldsBlock = buildTaskAttachment(task).blocks.find((b: { fields?: unknown }) => b.fields)
    const text = json(fieldsBlock)
    // Labelled 'Taken by' now, because 'Owner' read as ownership even when nobody had claimed it.
    expect(text).toContain('*Taken by*')
    expect(text).toContain('<@U123>')
    expect(text).toContain('*Effort*')
    expect(text).toContain('45m')
  })

  it('says unclaimed rather than leaving the owner field blank', () => {
    expect(json(buildTaskAttachment({ _id: 'x', title: 'T' }))).toContain('Unclaimed')
  })
})


describe('task cards without emoji', () => {
  it('shows the title alone', () => {
    const card = buildTaskAttachment({ _id: 'op1', title: 'Call MEDITECH', kind: 'outreach' })
    expect(card.blocks[0].text.text).toBe('*Call MEDITECH*')
  })

  it('keeps the WHOLE title after a state change', () => {
    // The old collapse stripped the first token to drop an emoji, which without
    // one ate the first word — "Call MEDITECH" became "MEDITECH". The card is
    // re-rendered from the record now, so the title cannot be mangled at all.
    const attachments = [buildTaskAttachment({ _id: 'op1', title: 'Call MEDITECH' })]
    const next = refreshTaskInAttachments(attachments, 'op1', {
      _id: 'op1',
      title: 'Call MEDITECH',
      ownerName: 'Juhan',
    })
    expect(json(next)).toContain('Call MEDITECH')
  })
})

describe('the card always offers the reverse action', () => {
  const base = { _id: 'op1', title: 'Call MEDITECH', kind: 'outreach', priority: 'normal' }

  it('an unowned task can be taken or passed', () => {
    const labels = buildTaskAttachment(base).blocks.at(-1).elements.map((e: { text: { text: string } }) => e.text.text)
    expect(labels).toEqual(["I'll take it", "What's involved", 'Not me'])
  })

  it('an OWNED task offers a way to hand it back', () => {
    // This is what "undo a claim" means once the card reads from the record.
    const labels = buildTaskAttachment({ ...base, ownerName: 'Juhan' }).blocks.at(-1).elements.map(
      (e: { text: { text: string } }) => e.text.text,
    )
    expect(labels).toContain('Hand it back')
    expect(labels).toContain('Take it over')
  })

  it('a PASSED task can still be picked up — never a dead end', () => {
    // Declining used to collapse the card; somebody who passed had no way back.
    const card = buildTaskAttachment({ ...base, ownerName: '', status: 'needsHuman' })
    const labels = card.blocks.at(-1).elements.map((e: { text: { text: string } }) => e.text.text)
    expect(labels).toContain("I'll take it")
    expect(labels).not.toContain('Not me')
    expect(card.color).toBe('#6f7a90')
  })

  it('notes what just happened without hiding the task', () => {
    const card = buildTaskAttachment({ ...base, ownerName: 'Juhan', note: '<@U1> picked it up.' })
    expect(json(card)).toContain('picked it up')
    expect(json(card)).toContain('Call MEDITECH')
  })
})

describe('refreshTaskInAttachments', () => {
  const attachments = [
    buildTaskAttachment({ _id: 'op1', title: 'Call MEDITECH' }),
    buildTaskAttachment({ _id: 'op2', title: 'Call MGB' }),
  ]

  it('re-renders only the task that changed', () => {
    const next = refreshTaskInAttachments(attachments, 'op1', {
      _id: 'op1',
      title: 'Call MEDITECH',
      ownerName: 'Juhan',
      note: 'claimed',
    })
    expect(json(next[0])).toContain('Hand it back')
    expect(next[1]).toEqual(attachments[1])
  })

  it('leaves everything alone for an unknown task', () => {
    expect(refreshTaskInAttachments(attachments, 'nope', { _id: 'nope', title: 'x' })).toEqual(attachments)
  })
})

describe('a suggestion is not a commitment', () => {
  const base = { _id: 'op1', title: 'Call MEDITECH', kind: 'outreach', priority: 'normal' }

  it('shows a recommended person as UNCLAIMED, not as the owner', () => {
    // Rendering "Owner: Juhan" for someone who never accepted makes the board
    // report commitment that does not exist — every one of the 23 owned records
    // in the dataset turned out to be a recommendation.
    const text = json(buildTaskAttachment({ ...base, suggestedOwner: 'Juhan' }))
    expect(text).toContain('Unclaimed')
    expect(text).toContain('suggested: Juhan')
    expect(text).not.toContain('Taken by')
  })

  it('says who actually took it once somebody has', () => {
    const text = json(buildTaskAttachment({ ...base, ownerName: 'Juhan', suggestedOwner: 'Juhan' }))
    expect(text).toContain('Taken by')
    expect(text).not.toContain('suggested:')
  })

  it('says anyone when there is no suggestion either', () => {
    expect(json(buildTaskAttachment(base))).toContain('anyone')
  })

  it('still offers the take button when only suggested', () => {
    const labels = buildTaskAttachment({ ...base, suggestedOwner: 'Juhan' })
      .blocks.at(-1)
      .elements.map((e: { text: { text: string } }) => e.text.text)
    expect(labels).toContain("I'll take it")
    expect(labels).not.toContain('Hand it back')
  })
})


describe('buildRunwayBlocks', () => {
  const quiet = { due: false, urgent: false, reason: '', question: '' }
  const asking = {
    due: true,
    urgent: false,
    reason: 'The runway was last confirmed 40 days ago.',
    question: 'Still 4.5 months of certain runway, or has that moved?',
  }

  it('says nothing when the number was recently confirmed', () => {
    // A permanent banner about money in a team channel is a banner people learn
    // to scroll past, and then it is worthless on the week it matters.
    expect(buildRunwayBlocks({ summary: '4.5 months', checkIn: quiet })).toEqual([])
  })

  it('asks when the record has gone stale', () => {
    const blocks = buildRunwayBlocks({ summary: '4.5 months of certain runway', checkIn: asking })
    const text = JSON.stringify(blocks)
    expect(text).toContain('Runway')
    expect(text).toContain('40 days ago')
  })

  it('leads with the number, not the bin', () => {
    // "Rebuild" invites the reader to assume somebody decided it; a date and a
    // count of months can be argued with, which is the entire point of asking.
    const blocks = buildRunwayBlocks({ summary: '4.5 months of certain runway (to 11 Jan 2027)', checkIn: asking })
    expect(JSON.stringify(blocks)).toContain('11 Jan 2027')
  })

  it('offers all three answers a principal actually has', () => {
    const ids = JSON.stringify(buildRunwayBlocks({ summary: 'x', checkIn: asking }))
    expect(ids).toContain(MARKETING_ACTION.runwayConfirm)
    expect(ids).toContain(MARKETING_ACTION.runwaySigned)
    expect(ids).toContain(MARKETING_ACTION.runwayUpdate)
  })

  it('does not make confirming the brightest button', () => {
    // Primary on "still right" would invite a reflex press on the one number
    // the whole strategy depends on.
    const blocks = buildRunwayBlocks({ summary: 'x', checkIn: asking })
    const actions = blocks.find((block) => block.type === 'actions')
    const confirm = (actions?.elements as Array<Record<string, unknown>>).find(
      (element) => element.action_id === MARKETING_ACTION.runwayConfirm,
    )
    expect(confirm?.style).toBeUndefined()
  })

  it('surfaces a disagreement even when nothing is due', () => {
    const blocks = buildRunwayBlocks({
      summary: '4.5 months',
      checkIn: quiet,
      disagreement: 'The date says Rebuild but the setting says Survival.',
    })
    expect(JSON.stringify(blocks)).toContain('Survival')
  })
})

describe('buildRunwayView', () => {
  it('asks what was signed, and what it buys', () => {
    const view = buildRunwayView('signed')
    const text = JSON.stringify(view)
    expect(view.callback_id).toBe(MARKETING_RUNWAY_CALLBACK)
    expect(view.private_metadata).toBe('signed')
    expect(text).toContain(RUNWAY_LABEL_BLOCK)
    expect(text).toContain(RUNWAY_MONTHS_BLOCK)
  })

  it('says signed months are added, not counted from today', () => {
    // The rule people get wrong, stated where they are about to get it wrong.
    expect(JSON.stringify(buildRunwayView('signed'))).toContain('not counted from today')
  })

  it('does not ask what was signed when nothing was', () => {
    expect(JSON.stringify(buildRunwayView('update'))).not.toContain(RUNWAY_LABEL_BLOCK)
  })

  it('keeps both titles inside Slack limit of 24 characters', () => {
    for (const kind of ['signed', 'update'] as const) {
      const title = (buildRunwayView(kind).title as { text: string }).text
      expect(title.length).toBeLessThanOrEqual(24)
    }
  })
})

describe('readRunwaySubmission', () => {
  const withMonths = (value: string) => ({
    [RUNWAY_MONTHS_BLOCK]: { [RUNWAY_MONTHS_INPUT]: { value } },
    [RUNWAY_LABEL_BLOCK]: { [RUNWAY_LABEL_INPUT]: { value: 'SoW - Acme' } },
  })

  it('takes the number out of what people actually type', () => {
    expect(readRunwaySubmission(withMonths('4.5')).months).toBe(4.5)
    expect(readRunwaySubmission(withMonths('4.5 months')).months).toBe(4.5)
    expect(readRunwaySubmission(withMonths('about 3')).months).toBe(3)
    expect(readRunwaySubmission(withMonths('4,5')).months).toBe(4.5)
  })

  it('returns null rather than storing a guess', () => {
    // NaN months becomes an invalid date, and an invalid date reads as "no
    // runway recorded" - which would quietly undo the number it replaced.
    expect(readRunwaySubmission(withMonths('a while')).months).toBeNull()
    expect(readRunwaySubmission(withMonths('')).months).toBeNull()
    expect(readRunwaySubmission(withMonths('-2')).months).toBeNull()
    expect(readRunwaySubmission(undefined).months).toBeNull()
  })

  it('keeps what was signed', () => {
    expect(readRunwaySubmission(withMonths('3')).label).toBe('SoW - Acme')
  })
})
