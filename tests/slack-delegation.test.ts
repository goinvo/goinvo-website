import { describe, expect, it } from 'vitest'

import { LABEL, RETIRED_LABELS } from '@/lib/marketing/marquetaStyle'
import { MARQUETA_ACTION, decodeContactRef } from '@/lib/marketing/marquetaActions'
import { assessDomain, domainsWorthMentioning } from '@/lib/marketing/domainWatch'
import { MARKETING_OPERATION_STATUSES } from '@/lib/marketing/operations'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import {
  buildActionAcknowledgement,
  buildDraftCaptureBlocks,
  buildIdeaCaptureBlocks,
  buildIdeaReviewBlocks,
  buildIdentityPromptBlocks,
  buildTaskAttachment,
  buildTaskDetailBlocks,
  buildTaskDetailView,
  buildWeeklyDigestBlocks,
  decodeActionValue,
  detailStatusWords,
  digestNotificationText,
  encodeActionValue,
  isMarketingAction,
  MARKETING_ACTION,
  MARKETING_ANSWER_BLOCK,
  MARKETING_RUNWAY_CALLBACK,
  modalTitle,
  refreshTaskInAttachments,
  RUNWAY_LABEL_BLOCK,
  RUNWAY_LABEL_INPUT,
  RUNWAY_MONTHS_BLOCK,
  RUNWAY_MONTHS_INPUT,
  buildRunwayBlocks,
  buildRunwayView,
  readRunwaySubmission,
  type DigestCard,
  type DigestInput,
} from '@/lib/marketing/slackDelegation'
import {
  buildMoneyAndDirectionBlocks,
  buildStrategySnapshot,
  moneyAnswer,
  monthWindow,
  strategyAnswer,
} from '@/lib/marketing/strategyCheck'
import { buildTaskCard, taskStatusWords, type CheckInTask, type TaskCardOptions } from '@/lib/marketing/weeklyCheckIn'
import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Monday 21 Sep 2026, 9am in Boston — when the tick runs. */
const NOW = new Date('2026-09-21T13:00:00Z')
const BASE = 'https://www.goinvo.com'
const json = (blocks: unknown) => JSON.stringify(blocks)
const sectionText = (block: Block | undefined) => String(block?.text?.text || '')
const buttonsOf = (blocks: Block[]) =>
  blocks.flatMap((block) => [...(block.elements || []), ...(block.accessory ? [block.accessory] : [])]).filter((element) => element.type === 'button')

const card = (task: Partial<CheckInTask> & { _id: string }, options: Partial<TaskCardOptions> = {}): DigestCard => ({
  taskId: task._id,
  blocks: buildTaskCard({ title: `Task ${task._id}`, status: 'queued', ...task }, { now: NOW, mode: 'plan', studioBaseUrl: BASE, ...options }),
})

const digest = (input: Partial<DigestInput> = {}) =>
  buildWeeklyDigestBlocks({ now: NOW, weekStart: '2026-09-21', budgetMinutes: 480, studioBaseUrl: BASE, ...input })

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

// ── The Monday plan ─────────────────────────────────────────────────────────

describe('buildWeeklyDigestBlocks', () => {
  it('opens with its name and the planned week, and ends on the two things anyone can do', () => {
    const blocks = digest({ plan: { plannedMinutes: 450, theme: 'Start calling your warmest contacts' } })
    expectValidSlackBlocks(blocks)
    expect(blocks[0]).toMatchObject({ type: 'header', text: { text: 'Monday plan' } })
    expect(blocks[1].elements[0].text).toBe('Week of Mon 21 Sep · 7h 30m planned of 8h · _Start calling your warmest contacts_')
    const last = blocks.at(-1)!
    expect(last.type).toBe('actions')
    expect(last.elements.map((element: Block) => element.text.text)).toEqual(['Open This week', LABEL.AWAY])
    expect(last.elements[0].url).toBe(`${BASE}/studio/marketing?view=thisWeek`)
    expect(last.elements[1].action_id).toBe(MARKETING_ACTION.away)
  })

  it('says when the open work does not fit, rather than calling it a plan', () => {
    const over = digest({ openMinutes: 600 })
    expect(over[1].elements[0].text).toBe('Week of Mon 21 Sep · 10h of open work for an 8h week — more than fits')
    expect(digest({ openMinutes: 60, budgetMinutes: 240 })[1].elements[0].text).toBe('Week of Mon 21 Sep · 1h of open work for a 4h week')
    expect(digest({ openMinutes: 300 })[1].elements[0].text).not.toContain('more than fits')
  })

  it('warns, second, when the plan did not save — and keeps the footer when there is no Studio', () => {
    const blocks = digest({ planRecorded: false, studioBaseUrl: undefined })
    expect(blocks[2].elements[0].text).toBe(
      ':warning: This week’s plan didn’t save, so this is the open board, not the planned week — re-plan on This week.',
    )
    // Without a Studio the footer is just the away button — never a button Slack would refuse.
    expect(blocks.at(-1)!.elements.map((element: Block) => element.text.text)).toEqual([LABEL.AWAY])
    expectValidSlackBlocks(blocks)
  })

  it('draws each task once: asked, away cover, asked twice, then at most two others — five cards, the rest counted', () => {
    const blocks = digest({
      needsOwner: {
        asked: [card({ _id: 'a1' }, { ask: { slackUserId: 'U3', name: 'Eric', reason: 'suggested' } })],
        away: [card({ _id: 'w1', ownerName: 'Eric' }, { context: 'away', awayNote: 'Eric is away · free this week: Juhan, Shirley' })],
        exhausted: [card({ _id: 'x1' }, { context: 'exhausted' })],
        open: ['o1', 'o2', 'o3', 'a1'].map((id) => card({ _id: id })),
      },
    })
    expectValidSlackBlocks(blocks)
    const ids = blocks.filter((block) => String(block.block_id || '').startsWith('mq_task_actions_')).map((block) => block.block_id)
    expect(ids).toEqual(['a1', 'w1', 'x1', 'o1', 'o2'].map((id) => `mq_task_actions_${id}`))
    const heading = blocks.findIndex((block) => sectionText(block) === '*Needs an owner*')
    expect(blocks[heading - 1].type).toBe('divider')
    // o3 is counted — a1 was already a card, so it is not counted twice.
    expect(json(blocks)).toContain(`+1 more on <${BASE}/studio/marketing?view=thisWeek|This week>`)
  })

  it('never trims an ask, and asks come first', () => {
    const asked = Array.from({ length: 5 }, (_, i) => card({ _id: `a${i}` }, { ask: { slackUserId: 'U2', name: 'Shirley' } }))
    const blocks = digest({ needsOwner: { asked, open: [card({ _id: 'o1' })] } })
    const ids = blocks.filter((block) => String(block.block_id || '').startsWith('mq_task_actions_')).map((block) => block.block_id)
    expect(ids).toEqual(asked.map((entry) => `mq_task_actions_${entry.taskId}`))
    expect(json(blocks)).toContain('+1 more on')
  })

  it('shows two decisions with Answer…, and counts the rest', () => {
    const decision = (id: string) =>
      card({ _id: id, kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish F1–F8?' })
    const blocks = digest({ decisions: ['d1', 'd2', 'd3'].map(decision) })
    expectValidSlackBlocks(blocks)
    expect(blocks.some((block) => sectionText(block) === '*Decisions waiting*')).toBe(true)
    const answers = buttonsOf(blocks).filter((button) => button.text.text === LABEL.ANSWER)
    expect(answers).toHaveLength(2)
    expect(answers.every((button) => button.style === 'primary')).toBe(true)
    expect(json(blocks)).toContain('+1 more on <https://www.goinvo.com/studio/marketing?view=thisWeek&focus=decisions|This week>')
  })

  it('lists owned work as a roll call, alphabetical, and stuck work with what is in the way', () => {
    const blocks = digest({
      taken: [
        { name: 'Shirley', slackUserId: 'U2', count: 1 },
        { name: 'Juhan', slackUserId: 'U1', count: 2 },
        { name: 'Jen <x>', count: 1 },
      ],
      stuck: [
        { title: 'Pin <the> kit', ownerName: 'Shirley', slackUserId: 'U2', blocker: 'need the <numbers>', url: `${BASE}/studio/marketing?view=thisWeek&task=t9` },
        { title: 'Nobody’s thing' },
        { title: 'Third' },
      ],
    })
    expectValidSlackBlocks(blocks)
    const text = json(blocks)
    expect(text).toContain('Already taken: Jen &lt;x&gt; 1 · <@U1> 2 · <@U2> 1 — ask `Marqueta, my tasks` for yours')
    expect(text).toContain(
      `:warning: Stuck: <${BASE}/studio/marketing?view=thisWeek&task=t9|Pin &lt;the&gt; kit> (<@U2>) — in the way: need the &lt;numbers&gt; · Nobody’s thing (nobody has it) · +1 more`,
    )
  })

  it('groups outreach: three follow-ups with Prep and Log it…, the rest counted, who to reach out to, undrafted posts', () => {
    const followUps = Array.from({ length: 5 }, (_, i) => ({
      label: `*Follow up with P${i}*`,
      detail: 'due Tue 22 Sep',
      contactRef: `{"c":"c${i}","o":"O"}`,
    }))
    const blocks = digest({
      followUps,
      followUpsTotal: 7,
      callSheet: [
        { organization: 'AT&T <Health>', contacts: [{ name: 'A' }], signal: 'Cut costs <5%', quote: 'q', sourceUrl: 'https://example.org/a|b>c', opening: 'o', offer: null, context: '' },
      ],
      undraftedPosts: [{ title: 'LinkedIn: pilots <5%' }, { title: 'Newsletter' }],
    })
    expectValidSlackBlocks(blocks)
    const start = blocks.findIndex((block) => sectionText(block) === '*Outreach this week*')
    expect(blocks[start - 1].type).toBe('divider')
    const rows = blocks.filter((block) => sectionText(block).startsWith('*Follow up with'))
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      const actions = blocks[blocks.indexOf(row) + 1]
      expect(actions.elements.map((element: Block) => [element.text.text, element.action_id])).toEqual([
        [LABEL.PREP, MARQUETA_ACTION.prepCall],
        [LABEL.LOG, MARQUETA_ACTION.logCall],
      ])
    }
    const text = json(blocks)
    expect(text).toContain('+4 more follow-ups due — ask `Marqueta, my calls`')
    expect(text).toContain('*Who to reach out to, and why now*')
    const entry = blocks.find((block) => sectionText(block).includes('AT&amp;T &lt;Health&gt;'))!
    expect(sectionText(entry)).toContain('Cut costs &lt;5%')
    expect(sectionText(entry)).not.toContain('a|b>c')
    expect(entry.accessory.text.text).toBe(LABEL.PREP)
    expect(decodeContactRef(entry.accessory.value)).toMatchObject({ contactId: '', organization: 'AT&T <Health>' })
    expect(text).toContain(':warning: 2 posts go out this week with no draft yet: LinkedIn: pilots &lt;5% · Newsletter')
  })

  it('drops a follow-up’s buttons rather than send a value Slack would refuse', () => {
    const blocks = digest({ followUps: [{ label: '*Follow up with P*', detail: 'd', contactRef: 'x'.repeat(2500) }] })
    expectValidSlackBlocks(blocks)
    expect(json(blocks)).not.toContain(MARQUETA_ACTION.logCall)
  })

  it('says nothing of a group with nothing in it', () => {
    const text = json(digest())
    for (const heading of ['Needs an owner', 'Decisions waiting', 'Outreach this week', 'Already taken', 'Stuck', 'One-time setup']) {
      expect(text).not.toContain(heading)
    }
  })

  it('closes with the ideas, the identity prompt and how to ask, in that order, before the footer', () => {
    const blocks = digest({
      ideas: [{ title: 'Town Day <merch>' }, { title: 'B' }, { title: 'C' }, { title: 'D' }],
      unmappedOwners: ['Jen'],
      money: [{ type: 'section', block_id: 'mq_money_runway', text: { type: 'mrkdwn', text: 'money' } }],
    })
    expectValidSlackBlocks(blocks)
    const at = (needle: string) => blocks.findIndex((block) => json(block).includes(needle))
    expect(at('mq_money_runway')).toBeLessThan(at('ideas I caught'))
    expect(at('ideas I caught')).toBeLessThan(at('One-time setup'))
    expect(at('One-time setup')).toBeLessThan(at('Ask me:'))
    expect(at('Ask me:')).toBe(blocks.length - 2)
    expect(json(blocks)).toContain(
      '*4 ideas I caught still need a yes or no:* Town Day &lt;merch&gt; · B · C …and 1 more — ' +
        `<${BASE}/studio/marketing?view=thisWeek&focus=caught|Review them on This week>`,
    )
    expect(blocks[at('Ask me:')].elements[0].text).toBe(
      'Ask me: `Marqueta, my calls` · `Marqueta, my tasks` · `Marqueta, prep &lt;name&gt;`',
    )
  })

  it('rewrites a registry note’s "(s)", escapes it, and marks it at risk', () => {
    const blocks = digest({ renewals: ['*goinvo.com expires in 5 day(s)* (1 Oct). Renew <now> & 1 day(s) left.'] })
    expect(json(blocks)).toContain(':warning: *goinvo.com expires in 5 days* (1 Oct). Renew &lt;now&gt; &amp; 1 day left.')
    expect(json(blocks)).not.toContain('(s)')
  })

  it('prints the registry’s own notes with the studio’s days, never an ISO date', () => {
    // The notes exactly as domainWatch writes them — the fixture above is
    // hand-written, and domainWatch never says "(1 Oct)".
    const notes = domainsWorthMentioning([
      assessDomain({ domain: 'goinvo.com', expiresAt: '2026-09-26T04:00:00Z' }, NOW),
      assessDomain({ domain: 'old.org', expiresAt: '2026-09-19T04:00:00Z' }, NOW),
      assessDomain({ domain: 'lapsed.net', expiresAt: '2025-12-01T05:00:00Z' }, NOW),
    ]).map((status) => status.message)
    expect(notes.join(' ')).toMatch(/\(2026-09-26\)/)
    const text = json(digest({ renewals: notes }))
    expect(text).toContain(':warning: *goinvo.com expires in 4 days* (Sat 26 Sep).')
    // A lapsed one reads the same way, and a different year keeps its year.
    expect(text).toContain('*old.org expired 3 days ago* (Sat 19 Sep).')
    expect(text).toContain('(Mon 1 Dec 2025)')
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(text).not.toContain('(s)')
  })

  const decision = (id: string) => card({ _id: id, kind: 'decision', status: 'needsHuman', humanQuestion: 'Q?' })
  const moneyOf = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ type: 'section', block_id: `mq_money_${i}`, text: { type: 'mrkdwn', text: `m${i}` } }))
  const fullWeek = (money: number): Partial<DigestInput> => ({
    planRecorded: false,
    renewals: ['a', 'b', 'c'],
    lastWeek: 'Last week: 2 tasks done',
    needsOwner: {
      asked: Array.from({ length: 3 }, (_, i) => card({ _id: `a${i}` }, { ask: { slackUserId: 'U2', name: 'Shirley' } })),
      away: [card({ _id: 'w1', ownerName: 'Eric' }, { context: 'away' })],
      exhausted: [card({ _id: 'x1' }, { context: 'exhausted' })],
      open: Array.from({ length: 6 }, (_, i) => card({ _id: `o${i}` })),
    },
    decisions: ['d1', 'd2', 'd3', 'd4'].map(decision),
    taken: [{ name: 'Juhan', slackUserId: 'U1', count: 2 }],
    stuck: [{ title: 'Stuck one' }],
    followUps: Array.from({ length: 3 }, (_, i) => ({ label: `*Follow up with P${i}*`, detail: 'd', contactRef: `{"c":"c${i}"}` })),
    followUpsTotal: 30,
    callSheet: Array.from({ length: 3 }, (_, i) => ({ organization: `Org ${i}`, contacts: [{ _id: `c${i}` }], signal: 's', quote: 'q', sourceUrl: '', opening: '', offer: null, context: '' })),
    undraftedPosts: [{ title: 'Post' }],
    money: moneyOf(money),
    ideas: [{ title: 'Idea' }],
    unmappedOwners: ['Jen'],
  })
  const cardIds = (blocks: Block[]) =>
    blocks.filter((block) => String(block.block_id || '').startsWith('mq_task_actions_')).map((block) => String(block.block_id).slice(16))

  it('fits every group at its maximum inside fifty blocks without giving anything up', () => {
    // Three money blocks is the most the money group ever draws (question, answers, "next").
    const blocks = digest(fullWeek(3))
    expectValidSlackBlocks(blocks)
    expect(blocks.length).toBeLessThanOrEqual(50)
    expect(cardIds(blocks)).toEqual(['a0', 'a1', 'a2', 'w1', 'x1', 'd1', 'd2'])
    expect(blocks.filter((block) => sectionText(block).startsWith('*Follow up with'))).toHaveLength(3)
    expect(blocks.filter((block) => block.accessory?.text?.text === LABEL.PREP)).toHaveLength(3)
    expect(blocks.at(-1)!.block_id).toBe('mq_footer')
  })

  it('gives way whole groups at a time, in order — follow-ups, call sheet, asked-twice, away, decisions — each leaving a count', () => {
    // A money group padded far past anything real forces the order, one step at a time.
    const some = digest(fullWeek(14))
    expectValidSlackBlocks(some)
    expect(some.length).toBeLessThanOrEqual(50)
    // Follow-up rows, the call sheet and the asked-twice card went, in that order; away and decisions stayed.
    expect(some.filter((block) => sectionText(block).startsWith('*Follow up with'))).toHaveLength(0)
    expect(json(some)).toContain('30 follow-ups due — ask `Marqueta, my calls`')
    expect(json(some)).toContain('3 organisations worth a call this week — on')
    expect(cardIds(some)).toEqual(['a0', 'a1', 'a2', 'w1', 'd1', 'd2'])
    // What went is counted, and nothing slid into its place.
    expect(json(some)).toContain('+7 more on <https://www.goinvo.com/studio/marketing?view=thisWeek|This week>')

    const all = digest(fullWeek(20))
    expectValidSlackBlocks(all)
    expect(all.length).toBeLessThanOrEqual(50)
    // Only the asks are still cards; everything that went is counted.
    expect(cardIds(all)).toEqual(['a0', 'a1', 'a2'])
    const text = json(all)
    expect(text).toContain('+8 more on <https://www.goinvo.com/studio/marketing?view=thisWeek|This week>')
    expect(text).toContain('*Decisions waiting:* 4 — answer them on')
    expect(text).toContain('30 follow-ups due')
    expect(text).toContain('3 organisations worth a call this week')
    // Never a raw slice: the footer is still the last block.
    expect(all.at(-1)!.block_id).toBe('mq_footer')
  })
})

describe('digestNotificationText', () => {
  const ask = (slackUserId: string) => ({ taskId: 't', name: 'X', slackUserId, reason: 'open' as const })

  it('leads with the mentions and the ask, then the message and its numbers, inside ninety characters', () => {
    const text = digestNotificationText({ asks: [ask('U3'), ask('U2')], needsOwner: 3, followUps: 3, weekStart: '2026-09-21', now: NOW })
    expect(text).toBe('<@U3> <@U2> — could you take a task each? · Monday plan: 3 tasks need an owner, 3 follow-ups due')
    expect(text.indexOf('Monday plan: 3')).toBeLessThan(90)
  })

  it('reads naturally with one, and with nothing to ask', () => {
    expect(digestNotificationText({ asks: [], needsOwner: 1, followUps: 1, weekStart: '2026-09-21', now: NOW })).toBe(
      'Monday plan: 1 task needs an owner, 1 follow-up due',
    )
    expect(digestNotificationText({ asks: [], needsOwner: 0, followUps: 0, weekStart: '2026-09-21', now: NOW })).toBe(
      'Monday plan: week of Mon 21 Sep',
    )
  })

  it('never says "(s)" or an ISO week', () => {
    const text = digestNotificationText({ asks: [ask('U1')], needsOwner: 2, followUps: 0, weekStart: '2026-09-21', now: NOW })
    expect(text).not.toMatch(/\(s\)|W\d\d|\d{4}-\d{2}-\d{2}/)
  })
})

describe('buildIdentityPromptBlocks', () => {
  it('is one section with the choice beside it', () => {
    const blocks = buildIdentityPromptBlocks(['Juhan', 'Shirley'])
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].accessory.action_id).toBe(MARKETING_ACTION.linkIdentity)
    expect(blocks[0].accessory.options.map((option: Block) => option.value)).toEqual(['Juhan', 'Shirley'])
  })

  it('states what is stored before anyone presses anything', () => {
    // The asking IS the consent, so the prompt has to say what it keeps — and that it keeps nothing else.
    expect(sectionText(buildIdentityPromptBlocks(['Juhan'])[0])).toBe(
      '*One-time setup:* which name on the list is yours? I’ll store your Slack ID against it so I can ' +
        '@-mention you on your own tasks — nothing else.',
    )
  })

  it('disappears entirely once everyone is mapped, rather than nagging', () => {
    expect(buildIdentityPromptBlocks([])).toEqual([])
    expect(buildIdentityPromptBlocks(['', ''])).toEqual([])
  })

  it('caps the list so one enormous team cannot break the message', () => {
    const many = Array.from({ length: 40 }, (_, i) => `Person ${i}`)
    const blocks = buildIdentityPromptBlocks([...many, 'x'.repeat(200)])
    expect(blocks[0].accessory.options).toHaveLength(20)
    expectValidSlackBlocks(buildIdentityPromptBlocks(['x'.repeat(200)]))
  })
})

// ── Captures ────────────────────────────────────────────────────────────────

describe('buildIdeaCaptureBlocks', () => {
  const blocks = buildIdeaCaptureBlocks({
    title: 'Merch <table> at Town Day & more',
    category: 'event',
    channel: 'C1',
    ts: '1.2',
    studioUrl: `${BASE}/studio/marketing?view=thisWeek`,
  })

  it('says it was filed on a guess, escaped, with Keep it · Not an idea · Open This week — none green', () => {
    expectValidSlackBlocks(blocks)
    expect(sectionText(blocks[0])).toBe(
      'Filed as an idea so it doesn’t scroll away:\n*Merch &lt;table&gt; at Town Day &amp; more* · event\n' +
        '_My guess — nothing happens until someone keeps it._',
    )
    const buttons = buttonsOf(blocks)
    expect(buttons.map((button) => button.text.text)).toEqual([LABEL.IDEA_KEEP, LABEL.IDEA_DISCARD, 'Open This week'])
    expect(buttons.map((button) => button.action_id)).toEqual([MARKETING_ACTION.ideaKeep, MARKETING_ACTION.ideaDiscard, undefined])
    expect(buttons.some((button) => button.style === 'primary')).toBe(false)
  })

  it('drops the link, not the message, without a Studio', () => {
    const plain = buildIdeaCaptureBlocks({ title: 'x', channel: 'C1', ts: '1.2' })
    expectValidSlackBlocks(plain)
    expect(buttonsOf(plain)).toHaveLength(2)
  })
})

describe('buildDraftCaptureBlocks', () => {
  it('says where an undated draft actually is, and offers Open Calendar · Not for the calendar', () => {
    const blocks = buildDraftCaptureBlocks({
      title: 'Pre-mortem <teaser>',
      contentType: 'newsletter',
      channel: 'C1',
      ts: '1.2',
      studioUrl: `${BASE}/studio/marketing?view=calendar`,
    })
    expectValidSlackBlocks(blocks)
    expect(sectionText(blocks[0])).toBe(
      'That looks like a finished draft, so it’s on the calendar with the copy attached:\n' +
        '*Pre-mortem &lt;teaser&gt;* · newsletter · drafting, no date\n' +
        '_It won’t post itself — it’s under *Unscheduled*, below the month grid._',
    )
    // The link last, as on the idea receipt that sits beside it in the thread.
    const buttons = buttonsOf(blocks)
    expect(buttons.map((button) => button.text.text)).toEqual([LABEL.DRAFT_DISCARD, 'Open Calendar'])
    expect(buttons[0].action_id).toBe(MARKETING_ACTION.ideaDiscard)
    expect(buttons[1].url).toBe(`${BASE}/studio/marketing?view=calendar`)
    expect(buttons.some((button) => button.style === 'primary')).toBe(false)
  })
})

describe('buildIdeaReviewBlocks', () => {
  it('counts every idea waiting, and "…and N more" only the ones not named', () => {
    const four = buildIdeaReviewBlocks([{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }], { studioBaseUrl: BASE })
    expectValidSlackBlocks(four)
    expect(four[0].elements[0].text).toBe(
      `*4 ideas I caught still need a yes or no:* A · B · C …and 1 more — <${BASE}/studio/marketing?view=thisWeek&focus=caught|Review them on This week>`,
    )
    const one = buildIdeaReviewBlocks([{ title: 'A' }], { total: 1 })
    expect(one[0].elements[0].text).toBe('*1 idea I caught still needs a yes or no:* A — Review them on This week')
    expect(buildIdeaReviewBlocks([], {})).toEqual([])
    // More waiting than were read: the total is the number said.
    expect(buildIdeaReviewBlocks([{ title: 'A' }], { total: 9 })[0].elements[0].text).toContain('*9 ideas I caught')
  })
})

// ── Task details ────────────────────────────────────────────────────────────

describe('detailStatusWords', () => {
  it('says exactly what the card and the Studio pill say, for every status, owned or not, decision or not', () => {
    for (const status of [...MARKETING_OPERATION_STATUSES, 'garbage', undefined]) {
      for (const ownerName of ['Juhan', '']) {
        for (const shape of [
          { kind: 'decision', humanQuestion: 'Which?' },
          { kind: 'content', humanQuestion: 'Eric passed on this — who should pick it up?' },
          { kind: 'outreach' },
        ]) {
          const task = { status, ownerName, ...shape } as Parameters<typeof taskStatusWords>[0]
          expect(detailStatusWords(task), JSON.stringify(task)).toBe(taskStatusWords(task))
        }
      }
    }
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
    dueAt: '2026-09-25T16:00:00.000Z',
    minutes: 20,
  }

  it('leads with what needs doing, because that is the missing bit', () => {
    const text = json(buildTaskDetailBlocks(task, { now: NOW }))
    expect(text).toContain('What needs doing')
    expect(text).toContain('Mark each offer public or call-only')
    expect(text.indexOf('What needs doing')).toBeLessThan(text.indexOf('Background'))
  })

  it('shows a decision as a question to answer', () => {
    const text = json(buildTaskDetailBlocks(task, { now: NOW }))
    expect(text).toContain('The question to answer')
    expect(text).toContain('comfortable publishing')
    expect(text).toContain('Why now')
  })

  it('puts the facts in the card’s words, with a day, never an ISO date', () => {
    const blocks = buildTaskDetailBlocks(task, { now: NOW })
    expect(blocks[1].elements[0].text).toBe('Decision · Urgent · needs a decision · nobody has it · due Fri 25 Sep · ~20m')
    const owned = buildTaskDetailBlocks({ ...task, kind: 'content', status: 'working', ownerName: 'Juhan & co', priority: 'normal' }, { now: NOW })
    expect(owned[1].elements[0].text).toBe('Content · in progress · owner Juhan &amp; co · due Fri 25 Sep · ~20m')
    expect(json(blocks)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('says "nobody has it" once for unowned work not started', () => {
    const chips = buildTaskDetailBlocks({ _id: 'x', title: 'T', nextAction: 'do it' }, { now: NOW })[1].elements[0].text
    expect(chips).toBe('nobody has it')
  })

  it('admits when a task has no detail instead of showing an empty modal', () => {
    expect(json(buildTaskDetailBlocks({ _id: 'x', title: 'Bare task' }, { now: NOW }))).toContain('no detail recorded yet')
  })

  it('omits sections that have no content, and escapes the ones it shows', () => {
    const text = json(buildTaskDetailBlocks({ _id: 'x', title: 'T <b>', nextAction: 'do <!here> it' }, { now: NOW }))
    expect(text).not.toContain('In the way')
    expect(text).not.toContain('Background')
    expect(text).not.toContain('<!here>')
    expect(text).toContain('*T &lt;b&gt;*')
  })
})

describe('modalTitle', () => {
  it('trims to Slack’s 24-character limit, which the API enforces', () => {
    const title = modalTitle('Decide which price bands go public on the services pages')
    expect(title.length).toBeLessThanOrEqual(24)
    expect(title.endsWith('…')).toBe(true)
  })

  it('leaves a short title alone and falls back when empty', () => {
    expect(modalTitle('Call ten')).toBe('Call ten')
    expect(modalTitle('')).toBe('Task')
  })
})

describe('buildTaskDetailView', () => {
  const decision = {
    _id: 'op1',
    title: 'Decide the price bands',
    kind: 'decision',
    status: 'needsHuman',
    humanQuestion: 'Which bands go public?',
    nextAction: 'Mark each offer public or call-only.',
  }

  it('offers a text box for a decision, so it can be answered in place', () => {
    const view = buildTaskDetailView(decision, { now: NOW })
    expectValidSlackModal(view)
    const text = json(view)
    expect(text).toContain(MARKETING_ANSWER_BLOCK)
    expect(text).toContain('Save answer')
    expect(view.private_metadata).toBe('op1')
  })

  it('does NOT offer a text box for work a modal cannot do', () => {
    const view = buildTaskDetailView({ _id: 'op2', title: 'Write the article', kind: 'content' }, { now: NOW })
    expectValidSlackModal(view)
    expect(json(view)).not.toContain(MARKETING_ANSWER_BLOCK)
    expect(view.submit).toBeUndefined()
  })

  it('names the link after the tab it opens — a decision on This week, whatever its record says', () => {
    const view = buildTaskDetailView({ ...decision, targetView: 'outreach' }, { studioBaseUrl: BASE, now: NOW })
    const [link] = buttonsOf(view.blocks as Block[])
    expect(link.text.text).toBe('Open This week')
    expect(link.url).toBe(`${BASE}/studio/marketing?view=thisWeek&task=op1`)
    // With an answer box, Save answer is the one green thing.
    expect(link.style).toBeUndefined()
  })

  it('opens Outreach or the Calendar by name, and This week for a tab Slack does not name', () => {
    const outreach = buildTaskDetailView({ _id: 'o1', title: 'Call MGB', kind: 'outreach' }, { studioBaseUrl: BASE, now: NOW })
    expect(buttonsOf(outreach.blocks as Block[])[0]).toMatchObject({
      text: { text: 'Open Outreach' },
      url: `${BASE}/studio/marketing?view=outreach&task=o1`,
      style: 'primary',
    })
    const research = buildTaskDetailView({ _id: 'r1', title: 'Look into it', kind: 'research' }, { now: NOW, studioUrl: `${BASE}/studio/marketing?view=research&task=r1` })
    expect(buttonsOf(research.blocks as Block[])[0]).toMatchObject({ text: { text: 'Open This week' }, url: `${BASE}/studio/marketing?view=thisWeek&task=r1` })
  })

  it('omits the link rather than emitting a button with no url', () => {
    expect(buttonsOf(buildTaskDetailView(decision, { now: NOW }).blocks as Block[])).toHaveLength(0)
  })
})

// ── Legacy attachment cards ─────────────────────────────────────────────────

describe('buildTaskAttachment (Monday plans posted before the blocks-only plan)', () => {
  const base = { _id: 'op1', title: 'Call the <top> ten', kind: 'outreach', priority: 'urgent', minutes: 45 }
  const labels = (attachment: Block) => attachment.blocks.at(-1).elements.map((element: Block) => element.text.text)
  const ids = (attachment: Block) => attachment.blocks.at(-1).elements.map((element: Block) => element.action_id)

  it('keeps the old action ids, so the route still handles a press on an old message', () => {
    expect(ids(buildTaskAttachment(base))).toEqual([MARKETING_ACTION.claim, MARKETING_ACTION.details, MARKETING_ACTION.decline])
  })

  it('speaks the current vocabulary: I’ll take it · Details… · Not me, and Not me once owned', () => {
    expect(labels(buildTaskAttachment(base))).toEqual([LABEL.TAKE, LABEL.DETAILS, LABEL.NOT_ME])
    // The owned card's button is the old decline — a pass, recorded as one —
    // so it says Not me. Hand back is handBackTask, which records no pass.
    const owned = buildTaskAttachment({ ...base, ownerName: 'Juhan' })
    expect(labels(owned)).toEqual([LABEL.NOT_ME, LABEL.DETAILS])
    expect(ids(owned)).toEqual([MARKETING_ACTION.decline, MARKETING_ACTION.details])
    expect(labels(owned)).not.toContain(LABEL.HAND_BACK)
    // A passed task has nothing to pass on again — never a dead end, though.
    expect(labels(buildTaskAttachment({ ...base, status: 'needsHuman' }))).toEqual([LABEL.TAKE, LABEL.DETAILS])
    const retired = new Set<string>(RETIRED_LABELS)
    for (const task of [base, { ...base, ownerName: 'Juhan' }]) {
      for (const label of labels(buildTaskAttachment(task))) expect(retired.has(label)).toBe(false)
    }
  })

  it('never makes taking a colleague’s work the green button, and has no colour bar', () => {
    const owned = buildTaskAttachment({ ...base, ownerName: 'Eric', slackUserId: 'UERIC' })
    expect(owned.blocks.at(-1).elements.some((element: Block) => element.style === 'primary')).toBe(false)
    expect(owned.color).toBeUndefined()
    expect(sectionText(owned.blocks[0])).toBe('*Call the &lt;top&gt; ten*\n*Urgent* · Taken by <@UERIC> · ~45m')
  })

  it('shows a suggestion or an ask as nobody having it', () => {
    const suggested = buildTaskAttachment({ ...base, priority: 'normal', suggestedOwner: 'Juhan' })
    expectValidSlackBlocks(suggested.blocks)
    expect(sectionText(suggested.blocks[0])).toBe('*Call the &lt;top&gt; ten*\nNobody has it · suggested Juhan · ~45m')
    const asked = buildTaskAttachment({ ...base, priority: 'normal', askedName: 'Juhan <x>', suggestedOwner: 'Eric' })
    expect(sectionText(asked.blocks[0])).toContain('Nobody has it · asked Juhan &lt;x&gt;')
    expect(json(asked)).not.toContain('suggested')
  })

  it('notes what just happened without hiding the task', () => {
    const card = buildTaskAttachment({ ...base, ownerName: 'Juhan', note: '<@U1> picked it up.' })
    expect(json(card)).toContain('picked it up')
    expect(json(card)).toContain('Call the &lt;top&gt; ten')
  })
})

describe('refreshTaskInAttachments', () => {
  const attachments = [
    buildTaskAttachment({ _id: 'op1', title: 'Call MEDITECH' }),
    buildTaskAttachment({ _id: 'op2', title: 'Call MGB' }),
  ]

  it('re-renders only the task that changed, keeping its whole title', () => {
    const next = refreshTaskInAttachments(attachments, 'op1', { _id: 'op1', title: 'Call MEDITECH', ownerName: 'Juhan', note: 'claimed' })
    expect(json(next[0])).toContain('Taken by Juhan')
    expect(json(next[0])).not.toContain(LABEL.TAKE)
    expect(json(next[0])).toContain('Call MEDITECH')
    expect(next[1]).toEqual(attachments[1])
  })

  it('leaves everything alone for an unknown task', () => {
    expect(refreshTaskInAttachments(attachments, 'nope', { _id: 'nope', title: 'x' })).toEqual(attachments)
  })
})

describe('buildActionAcknowledgement', () => {
  it('says what happened, so the channel still makes sense afterwards', () => {
    expect(buildActionAcknowledgement({ action: MARKETING_ACTION.claim, userId: 'U1', taskTitle: 'Call ten' })).toBe('<@U1> picked up *Call ten*.')
    expect(buildActionAcknowledgement({ action: MARKETING_ACTION.decline, userId: 'U1', taskTitle: 'Call <ten>' })).toBe(
      '<@U1> passed on *Call &lt;ten&gt;* — it needs another owner.',
    )
    expect(buildActionAcknowledgement({ action: MARKETING_ACTION.away, userId: 'U1' })).toContain('away this week')
  })
})

// ── Money: the runway question ──────────────────────────────────────────────

describe('buildRunwayBlocks', () => {
  const quiet = { due: false, urgent: false, reason: '', question: '' }
  const asking = {
    due: true,
    urgent: false,
    reason: 'The runway was last confirmed 32 days ago.',
    question: 'Still 4.5 months of certain runway, or has that moved?',
  }
  const facts = { months: 4.5, certainUntil: '2027-01-11', now: NOW }

  it('says nothing when the number was recently confirmed', () => {
    // A permanent banner about money in a team channel is a banner people learn
    // to scroll past, and then it is worthless on the week it matters.
    expect(buildRunwayBlocks({ summary: '4.5 months', checkIn: quiet, ...facts })).toEqual([])
  })

  it('asks one question with the number and its date, and says why it is asking', () => {
    const blocks = buildRunwayBlocks({ summary: 'x', checkIn: asking, ...facts, heading: true })
    expectValidSlackBlocks(blocks)
    expect(blocks[0].block_id).toBe('mq_money_runway')
    expect(sectionText(blocks[0])).toBe(
      '*Money and direction*\nStill 4.5 months of certain runway (to 11 Jan 2027), or has that moved?\n_Last confirmed 32 days ago._',
    )
  })

  it('offers the three answers a principal actually has — none green', () => {
    // Green on "Still right" would invite a reflex press on the one number the
    // whole strategy depends on.
    const blocks = buildRunwayBlocks({ summary: 'x', checkIn: asking, ...facts })
    const actions = blocks[1]
    expect(actions.block_id).toBe('mq_money_runway_actions')
    expect(actions.elements.map((element: Block) => [element.text.text, element.action_id])).toEqual([
      [LABEL.RUNWAY_OK, MARKETING_ACTION.runwayConfirm],
      [LABEL.RUNWAY_SIGNED, MARKETING_ACTION.runwaySigned],
      [LABEL.RUNWAY_CHANGED, MARKETING_ACTION.runwayUpdate],
    ])
    expect(actions.elements.some((element: Block) => element.style)).toBe(false)
  })

  it('asks the check-in’s own question when there is no date to state', () => {
    const none = { due: true, urgent: false, reason: 'No runway is recorded, so the strategy is running on a guess.', question: 'How many months can the studio pay for, assuming nothing new closes?' }
    const blocks = buildRunwayBlocks({ summary: 'Rebuild — no runway date recorded', checkIn: none, months: null, now: NOW })
    expect(sectionText(blocks[0])).toBe(
      'How many months can the studio pay for, assuming nothing new closes?\n_No runway is recorded, so the strategy is running on a guess._',
    )
  })

  it('surfaces a disagreement even when nothing is due, and escapes everything', () => {
    const blocks = buildRunwayBlocks({
      summary: '4.5 months',
      checkIn: { ...asking, reason: 'AT&T was marked won on 20 Sep 2026 — did it extend the runway?' },
      disagreement: 'Posture <b>',
      ...facts,
    })
    expectValidSlackBlocks(blocks)
    expect(sectionText(blocks[0])).toContain('AT&amp;T was marked won')
    expect(sectionText(blocks[0])).toContain('_Posture &lt;b&gt;_')
    expect(buildRunwayBlocks({ summary: 'x', checkIn: quiet, disagreement: 'The setting says Survival.', ...facts })).toHaveLength(2)
  })
})

describe('buildRunwayView', () => {
  it('asks what was signed, and what it buys', () => {
    const view = buildRunwayView('signed')
    expectValidSlackModal(view)
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
    expectValidSlackModal(buildRunwayView('update', '4.5 months'))
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
    [RUNWAY_LABEL_BLOCK]: { [RUNWAY_LABEL_INPUT]: { value: 'SoW — Acme' } },
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
    expect(readRunwaySubmission(withMonths('3')).label).toBe('SoW — Acme')
  })
})

// ── One label, one action ───────────────────────────────────────────────────

describe('every label means one action, in every message (rule 4)', () => {
  const MONEY_NOW = NOW
  const pulseOf = (offset: number) => summarizeOutreach([], { ...monthWindow(MONEY_NOW, offset), now: MONEY_NOW })
  const snapshot = buildStrategySnapshot({
    now: MONEY_NOW,
    runwaySummary: 'Certain to 11 Jan 2027',
    postureId: 'rebuild',
    thisMonth: pulseOf(0),
    lastMonth: pulseOf(-1),
    pipelineContacts: [],
    gates: [],
  })
  const runway = {
    summary: 'Certain to 11 Jan 2027',
    checkIn: { due: true, urgent: false, reason: 'The runway was last confirmed 32 days ago.', question: 'Still?' },
    resolved: { id: 'rebuild' as const, source: 'runway' as const, months: 3.5, certainUntil: '2027-01-11', disagreement: null },
  }
  const due = { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' }
  const past = '2026-09-01T16:00:00Z' // three weeks overdue: slipping
  const task = (extra: Partial<CheckInTask>): CheckInTask => ({ _id: 'op1', title: 'Pin the kit', status: 'queued', ...extra })
  const drawn = (extra: Partial<CheckInTask>, options: Partial<TaskCardOptions> = {}) =>
    buildTaskCard(task(extra), { now: NOW, mode: 'mine', studioBaseUrl: BASE, ...options })

  /** Every button each builder can draw, by builder, across the states it has. */
  const builders: Record<string, Block[]> = {
    'task card': [
      ...drawn({ ownerName: 'Juhan', status: 'working' }),
      ...drawn({ ownerName: 'Juhan', status: 'blocked', blocker: 'numbers' }),
      ...drawn({ ownerName: 'Juhan', dueAt: past }),
      ...drawn({ ownerName: 'Juhan' }, { mode: 'plan' }),
      ...drawn({ ownerName: 'Eric' }, { mode: 'plan', context: 'away' }),
      ...drawn({}, { mode: 'plan' }),
      ...drawn({}, { mode: 'plan', ask: { slackUserId: 'U3', name: 'Eric' } }),
      ...drawn({}, { mode: 'plan', context: 'exhausted' }),
      ...drawn({ kind: 'decision', status: 'needsHuman', humanQuestion: 'Q?' }, { mode: 'plan' }),
      ...drawn({ kind: 'decision', status: 'needsHuman', humanQuestion: 'Q?', ownerName: 'Juhan' }),
      ...drawn({ status: 'done', ownerName: 'Juhan' }),
      ...drawn({ status: 'dismissed' }),
    ],
    'Monday plan': digest({
      needsOwner: { asked: [card({ _id: 'a1' }, { ask: { slackUserId: 'U2', name: 'Shirley' } })], open: [card({ _id: 'o1' })] },
      followUps: [{ label: '*Follow up with Jane*', detail: 'd', contactRef: '{"c":"c1"}' }],
      callSheet: [{ organization: 'Acme', contacts: [{ _id: 'c1' }], signal: 's', quote: 'q', sourceUrl: '', opening: '', offer: null, context: '' } as never],
      money: buildMoneyAndDirectionBlocks({ now: NOW, runway, snapshot, strategyDue: due }),
    }),
    'legacy attachment': [
      ...buildTaskAttachment({ _id: 'op1', title: 'x' }).blocks,
      ...buildTaskAttachment({ _id: 'op1', title: 'x', ownerName: 'Juhan' }).blocks,
      ...buildTaskAttachment({ _id: 'op1', title: 'x', status: 'needsHuman' }).blocks,
    ],
    'idea capture': buildIdeaCaptureBlocks({ title: 'Merch', channel: 'C1', ts: '1.2', studioUrl: `${BASE}/studio/marketing?view=thisWeek` }),
    'draft capture': buildDraftCaptureBlocks({ title: 'Draft', channel: 'C1', ts: '1.2', studioUrl: `${BASE}/studio/marketing?view=calendar` }),
    'task detail': buildTaskDetailView({ _id: 'op1', title: 'x', kind: 'decision', humanQuestion: 'Q?' }, { studioBaseUrl: BASE, now: NOW })
      .blocks as Block[],
    'money receipts': [
      ...buildMoneyAndDirectionBlocks({ now: NOW, runway, snapshot, strategyDue: due, receipt: { kind: 'runwayConfirmed', who: '<@U1>' } }),
      ...buildMoneyAndDirectionBlocks({
        now: NOW,
        runway,
        snapshot,
        receipt: { kind: 'rethink', who: '<@U1>', decisionTaskId: 'op9' },
        studioBaseUrl: BASE,
      }),
    ],
    'money answers': [
      ...moneyAnswer({ now: NOW, runway, snapshot }).blocks,
      ...strategyAnswer({ now: NOW, snapshot, due, runway }).blocks,
    ],
  }

  /** What a press does: the action id, or `url` for a link. */
  const effect = (button: Block) => String(button.action_id || (button.url ? 'url' : ''))
  /**
   * The one tolerated second id: a Monday plan posted before this one carries
   * `claim` on its "I’ll take it", which the route still answers with the same
   * takeTask write (claimMarketingTask). Nothing new draws it.
   */
  const LEGACY_ALIASES: Record<string, { builder: string; actionId: string }> = {
    [LABEL.TAKE]: { builder: 'legacy attachment', actionId: MARKETING_ACTION.claim },
  }

  it('gives each label one action id within every builder', () => {
    for (const [builder, blocks] of Object.entries(builders)) {
      const seen = new Map<string, Set<string>>()
      for (const button of buttonsOf(blocks)) {
        const label = String(button.text.text)
        seen.set(label, new Set([...(seen.get(label) || []), effect(button)]))
      }
      for (const [label, ids] of seen) expect({ builder, label, ids: [...ids] }).toEqual({ builder, label, ids: [[...ids][0]] })
    }
  })

  it('gives each label one action id across every builder', () => {
    const across = new Map<string, Set<string>>()
    for (const [builder, blocks] of Object.entries(builders)) {
      for (const button of buttonsOf(blocks)) {
        const label = String(button.text.text)
        const alias = LEGACY_ALIASES[label]
        if (alias && alias.builder === builder && alias.actionId === effect(button)) continue
        across.set(label, new Set([...(across.get(label) || []), effect(button)]))
      }
    }
    for (const [label, ids] of across) expect({ label, ids: [...ids] }).toEqual({ label, ids: [[...ids][0]] })
    // The two that were crossed: Hand back is handBackTask; Not me is the pass.
    expect([...(across.get(LABEL.HAND_BACK) || [])]).toEqual([MARQUETA_ACTION.taskHandBack])
    expect([...(across.get(LABEL.NOT_ME) || [])]).toEqual([MARKETING_ACTION.decline])
    // Every label the vocabulary names for these builders was actually drawn.
    for (const label of [LABEL.TAKE, LABEL.NOT_ME, LABEL.HAND_BACK, LABEL.DETAILS, LABEL.ANSWER, LABEL.DONE, LABEL.REOPEN, LABEL.STUCK, LABEL.UNSTUCK, LABEL.KEEP_NEXT_WEEK, LABEL.DROP, LABEL.PREP, LABEL.LOG, LABEL.RUNWAY_OK, LABEL.RUNWAY_SIGNED, LABEL.RUNWAY_CHANGED, LABEL.PLAN_FITS, LABEL.PLAN_RETHINK, LABEL.IDEA_KEEP, LABEL.IDEA_DISCARD, LABEL.DRAFT_DISCARD, LABEL.AWAY]) {
      expect({ label, drawn: across.has(label) }).toEqual({ label, drawn: true })
    }
  })
})
