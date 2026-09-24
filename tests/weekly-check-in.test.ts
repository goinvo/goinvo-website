import { describe, expect, it } from 'vitest'

import {
  checkInFallbackText,
  checkInAcknowledgement,
  checkInPhoneLines,
  CHECK_IN_FOOTER_BLOCK,
  buildCheckInTaskBlocks,
  buildTaskCard,
  buildTaskStuckView,
  buildWeeklyCheckInBlocks,
  findTaskTitleInBlocks,
  groupCheckInTasks,
  inCheckInScope,
  isDecisionTask,
  isSlipping,
  MAX_CHECK_IN_BLOCKS,
  MAX_CHECK_IN_PHONE_LINES,
  readTaskStuckSubmission,
  replaceCheckInTask,
  TASK_STATUS_WORDS,
  taskStatusWords,
  type CheckInFollowUp,
  type CheckInGroup,
  type CheckInTask,
} from '@/lib/marketing/weeklyCheckIn'
import {
  checkInTaskActionsBlockId,
  checkInTaskBlockId,
  decodeTaskCardValue,
  encodeContactRef,
  encodeTaskStuckMetadata,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_BLOCKER_INPUT,
  TASK_STUCK_CALLBACK,
  type MarquetaActionId,
} from '@/lib/marketing/marquetaActions'
import { MARKETING_OPERATION_STATUSES } from '@/lib/marketing/operations'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { decodeActionValue, MARKETING_ACTION } from '@/lib/marketing/slackDelegation'
import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

// Thursday. ISO week Mon 21 – Sun 27 Sep; next week ends Sun 4 Oct.
const NOW = new Date('2026-09-24T14:00:00Z')
const BASE = 'https://www.goinvo.com'
const STUDIO = `${BASE}/studio/marketing?view=thisWeek`
const HOSTILE = '<!here> & <5% of pilots > ' + 'x'.repeat(5000)

const task = (overrides: Partial<CheckInTask> = {}): CheckInTask => ({
  _id: 't1',
  title: 'Write the pre-mortem post',
  ownerName: 'Juhan',
  slackUserId: 'U1',
  status: 'queued',
  dueAt: '2026-09-25T12:00:00Z',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...overrides,
})

const actionsOf = (blocks: Block[]) => blocks.find((block) => block.type === 'actions')?.elements || []
const actionIds = (blocks: Block[]): string[] => actionsOf(blocks).map((element: Block) => element.action_id)
const sectionText = (blocks: Block[]) => String(blocks.find((block) => block.type === 'section')?.text?.text || '')
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1
const taskBlockCount = (blocks: Block[]) => blocks.filter((block) => String(block.block_id || '').startsWith('mq_task_actions_')).length
const followUpLineCount = (blocks: Block[]) =>
  blocks.filter(
    (block) => block.type === 'actions' && block.elements.some((element: Block) => element.action_id === MARQUETA_ACTION.logCall),
  ).length

const pulse = (touches: number) =>
  summarizeOutreach(
    touches
      ? [
          {
            _id: 'c1',
            status: 'contacted',
            interactions: Array.from({ length: touches }, () => ({ at: '2026-09-22T15:00:00Z', by: 'Zebedee', channel: 'phone' })),
          },
        ]
      : [],
    { from: '2026-09-21T00:00:00Z', to: '2026-09-28T00:00:00Z', now: NOW },
  )

/**
 * What a teammate sees on a phone, one line per 40 characters — the measure
 * every Marqueta message is held to (the Monday plan's test uses the same).
 * Mentions become names, links their labels, buttons sit two to a row, and
 * the bold/italic/strike markers go, as Slack draws them.
 */
function phoneLines(blocks: Block[]): string[] {
  const plain = (value: string) =>
    String(value || '')
      .replace(/<@([UW][A-Z0-9]+)>/g, '@$1')
      .replace(/<(https?:[^|>]+)\|([^>]+)>/g, '$2')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[*_~]/g, '')
  const wrap = (value: string, width = 40) =>
    plain(value)
      .split('\n')
      .flatMap((paragraph) => {
        const lines: string[] = []
        let line = ''
        for (const word of paragraph.split(' ')) {
          if (`${line} ${word}`.trim().length > width && line) {
            lines.push(line)
            line = word
          } else line = `${line} ${word}`.trim()
        }
        lines.push(line)
        return lines
      })
  const button = (element: Block) => (element.style === 'primary' ? `【${element.text.text}】` : `[${element.text.text}]`)
  const lines: string[] = []
  for (const block of blocks) {
    if (block.type === 'header') lines.push(...wrap(block.text.text, 28))
    else if (block.type === 'divider') lines.push('────')
    else if (block.type === 'context') lines.push(...wrap(block.elements.map((element: Block) => element.text).join(' '), 46))
    else if (block.type === 'section') {
      lines.push(...wrap(block.text.text))
      if (block.accessory) lines.push(block.accessory.text ? button(block.accessory) : '⟨select⟩')
    } else if (block.type === 'actions') {
      for (let index = 0; index < block.elements.length; index += 2) lines.push(block.elements.slice(index, index + 2).map(button).join(' '))
    }
  }
  return lines
}

const followUp = (label: string): CheckInFollowUp => ({
  label: `*Follow up with ${label}*`,
  detail: 'overdue since Mon 21 Sep · last: Contacted on 14 Sep · they know us',
  contactRef: encodeContactRef({ contactId: `contact-${label}`, organization: 'Acme' }),
})

describe('inCheckInScope', () => {
  it('asks only about open, owned work that is not a planner record', () => {
    expect(inCheckInScope(task(), NOW)).toBe(true)
    expect(inCheckInScope(task({ status: 'done' }), NOW)).toBe(false)
    expect(inCheckInScope(task({ status: 'dismissed' }), NOW)).toBe(false)
    expect(inCheckInScope(task({ ownerName: '  ' }), NOW)).toBe(false)
    expect(inCheckInScope(task({ ownerName: undefined }), NOW)).toBe(false)
    expect(inCheckInScope(task({ sourceKey: 'weekly-plan/2026-W39' }), NOW)).toBe(false)
    expect(inCheckInScope(task({ sourceKey: 'exec-plan-2026q4/phase1/x' }), NOW)).toBe(true)
  })

  it('covers overdue work and everything due by the end of NEXT week', () => {
    expect(inCheckInScope(task({ dueAt: '2026-08-01T12:00:00Z' }), NOW)).toBe(true)
    expect(inCheckInScope(task({ dueAt: '2026-09-27' }), NOW)).toBe(true)
    expect(inCheckInScope(task({ dueAt: '2026-10-04T23:30:00Z' }), NOW)).toBe(true)
    expect(inCheckInScope(task({ dueAt: '2026-10-05T00:00:00Z' }), NOW)).toBe(false)
    expect(inCheckInScope(task({ dueAt: '2026-11-15T12:00:00Z' }), NOW)).toBe(false)
  })

  it('always includes work in progress or stuck, whatever its date', () => {
    expect(inCheckInScope(task({ status: 'working', dueAt: '2026-11-15T12:00:00Z' }), NOW)).toBe(true)
    expect(inCheckInScope(task({ status: 'blocked', dueAt: '2026-11-15T12:00:00Z' }), NOW)).toBe(true)
  })

  it('does not nag about undated work somebody picked up this week', () => {
    const fresh = task({ dueAt: undefined, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-22T09:00:00Z' })
    expect(inCheckInScope(fresh, NOW)).toBe(false)
    expect(inCheckInScope({ ...fresh, status: 'working' }, NOW)).toBe(true)
    expect(inCheckInScope({ ...fresh, status: 'blocked' }, NOW)).toBe(true)
  })

  it('does ask about undated work that has sat for a week or more', () => {
    expect(inCheckInScope(task({ dueAt: undefined, updatedAt: '2026-09-10T00:00:00Z' }), NOW)).toBe(true)
    expect(inCheckInScope(task({ dueAt: undefined, createdAt: undefined, updatedAt: undefined }), NOW)).toBe(true)
    // An unparseable date is no date.
    expect(inCheckInScope(task({ dueAt: 'soon', updatedAt: '2026-09-23T00:00:00Z' }), NOW)).toBe(false)
  })
})

describe('isSlipping', () => {
  it('is two weeks past its due day', () => {
    expect(isSlipping(task({ dueAt: '2026-09-10T12:00:00Z' }), NOW)).toBe(true)
    expect(isSlipping(task({ dueAt: '2026-09-11T12:00:00Z' }), NOW)).toBe(false)
  })

  it('is stuck with nobody touching it for a week', () => {
    expect(isSlipping(task({ status: 'blocked', updatedAt: '2026-09-16T12:00:00Z' }), NOW)).toBe(true)
    expect(isSlipping(task({ status: 'blocked', updatedAt: '2026-09-20T12:00:00Z' }), NOW)).toBe(false)
  })

  it('needs evidence, and never applies to finished work', () => {
    expect(isSlipping(task({ status: 'blocked', createdAt: undefined, updatedAt: undefined }), NOW)).toBe(false)
    expect(isSlipping(task({ status: 'done', dueAt: '2026-01-01' }), NOW)).toBe(false)
    expect(isSlipping(task({ status: 'dismissed', dueAt: '2026-01-01' }), NOW)).toBe(false)
  })
})

describe('isDecisionTask', () => {
  it('treats a decline as a task looking for an owner, not a decision', () => {
    expect(isDecisionTask({ kind: 'decision' })).toBe(true)
    expect(isDecisionTask({ status: 'needsHuman', humanQuestion: 'Publish the taxonomy?' })).toBe(true)
    expect(isDecisionTask({ status: 'needsHuman', humanQuestion: 'Jen passed on this — who should pick it up?' })).toBe(false)
    expect(isDecisionTask({ status: 'needsHuman' })).toBe(false)
    expect(isDecisionTask({ status: 'queued', humanQuestion: 'x' })).toBe(false)
  })
})

describe('groupCheckInTasks', () => {
  it('groups by person case-insensitively and by Slack id, so nobody is split in two', () => {
    const { groups } = groupCheckInTasks(
      [
        task({ _id: 'a', ownerName: 'Juhan', slackUserId: 'U1' }),
        task({ _id: 'b', ownerName: 'juhan', slackUserId: undefined }),
        task({ _id: 'c', ownerName: 'Juhan Sonin', slackUserId: 'U1' }),
        task({ _id: 'd', ownerName: 'Shirley', slackUserId: 'U2' }),
      ],
      { now: NOW },
    )
    expect(groups.map((group) => group.ownerName)).toEqual(['Juhan', 'Shirley'])
    expect(groups[0].slackUserId).toBe('U1')
    expect(groups[0].tasks.map((item) => item._id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('orders slipping, overdue, stuck, then by date, and shows three', () => {
    const { groups } = groupCheckInTasks(
      [
        task({ _id: 'later', dueAt: '2026-10-02T12:00:00Z' }),
        task({ _id: 'soon', dueAt: '2026-09-25T12:00:00Z' }),
        task({ _id: 'stuck', status: 'blocked', dueAt: '2026-10-03T12:00:00Z', updatedAt: '2026-09-23T00:00:00Z' }),
        task({ _id: 'overdue', dueAt: '2026-09-22T12:00:00Z' }),
        task({ _id: 'slipping', dueAt: '2026-09-01T12:00:00Z' }),
      ],
      { now: NOW },
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].tasks.map((item) => item._id)).toEqual(['slipping', 'overdue', 'stuck'])
    expect(groups[0].hidden).toBe(2)
  })

  it('honours perPerson and drops tasks out of scope', () => {
    const { groups } = groupCheckInTasks(
      [task({ _id: 'a' }), task({ _id: 'b' }), task({ _id: 'far', dueAt: '2026-12-01T12:00:00Z' }), task({ _id: 'a' })],
      { now: NOW, perPerson: 1 },
    )
    expect(groups[0].tasks.map((item) => item._id)).toEqual(['a'])
    expect(groups[0].hidden).toBe(1)
  })

  it('attaches follow-ups by lower-cased owner, and gives a follow-up-only person a group', () => {
    const { groups } = groupCheckInTasks([task({ _id: 'a', ownerName: 'Juhan' })], {
      now: NOW,
      followUpsByOwner: { juhan: [followUp('Jane')], shirley: [followUp('Sam')], '': [followUp('Nobody')] },
      team: [{ ownerName: 'Shirley', slackUserId: 'U2' }],
    })
    expect(groups.map((group) => [group.ownerName, group.slackUserId, group.followUps.length])).toEqual([
      ['Juhan', 'U1', 1],
      ['Shirley', 'U2', 1],
    ])
    expect(groups[1].tasks).toEqual([])
  })

  describe('the roster, not a task, decides who a name is in Slack', () => {
    const summary = (groups: CheckInGroup[]) =>
      groups.map((group) => [group.ownerName, group.slackUserId, group.tasks.map((item) => item._id)])
    const mentionsIn = (value: string) => value.match(/<@[UW][A-Z0-9]+>/g) || []

    it("never files one person's work under another's stale Slack id (the reviewed case)", () => {
      // Juhan claimed task `a` in Slack, then it was reassigned to Eric in the
      // Studio — which has no field for the id, so U1 stayed on the record.
      const tasks = [
        task({ _id: 'a', ownerName: 'Eric', slackUserId: 'U1' }),
        task({ _id: 'b', ownerName: 'Eric', slackUserId: undefined }),
        task({ _id: 'c', ownerName: 'Juhan', slackUserId: 'U1' }),
      ]
      const team = [
        { ownerName: 'Juhan', slackUserId: 'U1' },
        { ownerName: 'Eric', slackUserId: 'U3' },
      ]
      const { groups } = groupCheckInTasks(tasks, { now: NOW, team })
      expect(summary(groups)).toEqual([
        ['Eric', 'U3', ['a', 'b']],
        ['Juhan', 'U1', ['c']],
      ])
      expect(checkInFallbackText(groups)).toBe('<@U3> <@U1> — Thursday check-in: 3 open tasks')

      const blocks = buildWeeklyCheckInBlocks({ weekLabel: 'Week of Mon 21 Sep', groups, unowned: [], pulse: null, now: NOW })
      expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
      const serialised = JSON.stringify(blocks)
      expect(count(serialised, '<@U1>')).toBe(1)
      expect(count(serialised, '<@U3>')).toBe(1)
      // Juhan's line is followed by Juhan's task only.
      const juhanAt = blocks.findIndex((block) => String(block.text?.text || '').startsWith('*<@U1>*'))
      expect(blocks[juhanAt + 1].block_id).toBe(checkInTaskBlockId('c'))
    })

    it('ignores a task id the roster gives to someone else, even for a name the roster does not know', () => {
      const { groups } = groupCheckInTasks(
        [task({ _id: 'a', ownerName: 'Eric', slackUserId: 'U1' }), task({ _id: 'c', ownerName: 'Juhan', slackUserId: 'U1' })],
        { now: NOW, team: [{ ownerName: 'Juhan', slackUserId: 'U1' }] },
      )
      expect(summary(groups)).toEqual([
        ['Eric', undefined, ['a']],
        ['Juhan', 'U1', ['c']],
      ])
      // Eric is named, not mentioned; Juhan is mentioned once, for his own work.
      expect(mentionsIn(checkInFallbackText(groups))).toEqual(['<@U1>'])
    })

    it('ignores a task id that disagrees with the roster entry for its own owner', () => {
      const { groups } = groupCheckInTasks([task({ _id: 'a', ownerName: 'juhan', slackUserId: 'U9' })], {
        now: NOW,
        team: [{ ownerName: 'Juhan', slackUserId: 'U1' }],
      })
      expect(summary(groups)).toEqual([['Juhan', 'U1', ['a']]])
    })

    it('still merges names the roster links to one id', () => {
      const { groups } = groupCheckInTasks(
        [task({ _id: 'a', ownerName: 'Juhan', slackUserId: undefined }), task({ _id: 'b', ownerName: 'Juhan Sonin', slackUserId: undefined })],
        { now: NOW, team: [{ ownerName: 'Juhan', slackUserId: 'U1' }, { ownerName: 'Juhan Sonin', slackUserId: 'U1' }] },
      )
      expect(summary(groups)).toEqual([['Juhan', 'U1', ['a', 'b']]])
    })

    it('mentions nobody when the evidence for a name disagrees with itself', () => {
      // Two tasks, no roster, two ids for one name: at least one is stale.
      const fromTasks = groupCheckInTasks(
        [task({ _id: 'a', ownerName: 'Eric', slackUserId: 'U5' }), task({ _id: 'b', ownerName: 'Eric', slackUserId: 'U6' })],
        { now: NOW },
      ).groups
      expect(summary(fromTasks)).toEqual([['Eric', undefined, ['a', 'b']]])
      expect(mentionsIn(checkInFallbackText(fromTasks))).toEqual([])

      // The roster disagreeing with itself is no better — and still outranks the task.
      const fromRoster = groupCheckInTasks([task({ _id: 'a', ownerName: 'Eric', slackUserId: 'U5' })], {
        now: NOW,
        team: [{ ownerName: 'Eric', slackUserId: 'U5' }, { ownerName: 'eric', slackUserId: 'U6' }],
      }).groups
      expect(summary(fromRoster)).toEqual([['Eric', undefined, ['a']]])
    })

    it('does not let a malformed id link two people', () => {
      const { groups } = groupCheckInTasks(
        [task({ _id: 'a', ownerName: 'Eric', slackUserId: 'undefined' }), task({ _id: 'b', ownerName: 'Jen', slackUserId: 'undefined' })],
        { now: NOW, team: [{ ownerName: 'Jen', slackUserId: '<!here>' }] },
      )
      expect(summary(groups)).toEqual([
        ['Eric', undefined, ['a']],
        ['Jen', undefined, ['b']],
      ])
    })

    it("uses the roster's id for someone with only follow-ups, never a task's", () => {
      const { groups } = groupCheckInTasks([task({ _id: 'a', ownerName: 'Eric', slackUserId: 'U1', status: 'done' })], {
        now: NOW,
        followUpsByOwner: { eric: [followUp('Jane')] },
        team: [{ ownerName: 'Eric', slackUserId: 'U3' }, { ownerName: 'Juhan', slackUserId: 'U1' }],
      })
      expect(groups.map((group) => [group.ownerName, group.slackUserId, group.followUps.length])).toEqual([['Eric', 'U3', 1]])
    })
  })

  it('lists unowned work nobody has taken — but not decisions, far-off work, or planner records', () => {
    const { unowned, groups } = groupCheckInTasks(
      [
        task({ _id: 'free', ownerName: undefined, slackUserId: undefined, dueAt: '2026-09-30T12:00:00Z' }),
        task({ _id: 'undated', ownerName: '', dueAt: undefined, title: 'Aardvark' }),
        task({
          _id: 'declined',
          ownerName: '',
          status: 'needsHuman',
          humanQuestion: 'Jen passed on this — who should pick it up?',
          dueAt: '2026-09-26T12:00:00Z',
        }),
        task({ _id: 'decision', ownerName: '', kind: 'decision' }),
        task({ _id: 'question', ownerName: '', status: 'needsHuman', humanQuestion: 'Which segment first?' }),
        task({ _id: 'far', ownerName: '', dueAt: '2026-12-01T12:00:00Z' }),
        task({ _id: 'plan', ownerName: '', sourceKey: 'weekly-plan/2026-W39' }),
        task({ _id: 'finished', ownerName: '', status: 'done' }),
      ],
      { now: NOW },
    )
    expect(groups).toEqual([])
    expect(unowned.map((item) => item._id)).toEqual(['declined', 'free', 'undated'])
  })
})

describe('buildCheckInTaskBlocks', () => {
  it('names the task and where it stands, with ids that let a press redraw it', () => {
    const blocks = buildCheckInTaskBlocks(task({ dueAt: '2026-09-22T12:00:00Z', blocker: 'Waiting on logos' }), { now: NOW })
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].block_id).toBe(checkInTaskBlockId('t1'))
    expect(blocks[1].block_id).toBe(checkInTaskActionsBlockId('t1'))
    expect(blocks[0].text.text).toBe('*Write the pre-mortem post*\noverdue since Tue 22 Sep · not started · in the way: Waiting on logos')
  })

  it('says today and tomorrow in words, and no date when there is none', () => {
    expect(sectionText(buildCheckInTaskBlocks(task({ dueAt: '2026-09-24T09:00:00Z' }), { now: NOW }))).toContain('due today')
    expect(sectionText(buildCheckInTaskBlocks(task({ dueAt: '2026-09-25' }), { now: NOW }))).toContain('due tomorrow')
    expect(sectionText(buildCheckInTaskBlocks(task({ dueAt: '2026-10-02T12:00:00Z' }), { now: NOW }))).toContain('due Fri 2 Oct')
    expect(sectionText(buildCheckInTaskBlocks(task({ dueAt: undefined }), { now: NOW }))).toContain('no date')
  })

  it('offers Done · Stuck… · Hand back on open work', () => {
    for (const status of ['queued', 'working', 'scheduled', 'waiting', 'needsHuman']) {
      expect(actionIds(buildCheckInTaskBlocks(task({ status }), { now: NOW })), status).toEqual([
        MARQUETA_ACTION.taskDone,
        MARQUETA_ACTION.taskStuck,
        MARQUETA_ACTION.taskHandBack,
      ])
    }
    const elements = actionsOf(buildCheckInTaskBlocks(task(), { now: NOW }))
    expect(elements.map((element: Block) => element.text.text)).toEqual(['Done', 'Stuck…', 'Hand back'])
    expect(elements[0].style).toBe('primary')
  })

  it('offers Done · Unstuck · Hand back on stuck work — Done stays leftmost', () => {
    const blocks = buildCheckInTaskBlocks(task({ status: 'blocked', updatedAt: '2026-09-23T00:00:00Z' }), { now: NOW })
    expect(actionIds(blocks)).toEqual([MARQUETA_ACTION.taskDone, MARQUETA_ACTION.taskProgress, MARQUETA_ACTION.taskHandBack])
    expect(actionsOf(blocks).map((element: Block) => element.text.text)).toEqual(['Done', 'Unstuck', 'Hand back'])
    expect(sectionText(blocks)).toContain('stuck')
  })

  it('asks whether slipping work is still worth doing', () => {
    const blocks = buildCheckInTaskBlocks(task({ dueAt: '2026-09-01T12:00:00Z' }), { now: NOW })
    expect(sectionText(blocks)).toContain('_Still worth doing?_')
    expect(actionIds(blocks)).toEqual([MARQUETA_ACTION.taskDone, MARQUETA_ACTION.taskSnooze, MARQUETA_ACTION.taskDrop])
    expect(actionsOf(blocks).map((element: Block) => element.text.text)).toEqual(['Done', 'Keep — next week', 'Drop it'])
  })

  it('never offers Drop where the board would refuse it (work in progress cannot be dismissed)', () => {
    const blocks = buildCheckInTaskBlocks(task({ status: 'working', dueAt: '2026-09-01T12:00:00Z' }), { now: NOW })
    expect(actionIds(blocks)).not.toContain(MARQUETA_ACTION.taskDrop)
    expect(actionIds(blocks)).toContain(MARQUETA_ACTION.taskSnooze)
    // Hand back takes the third slot: "somebody else should" answers "still worth doing?".
    expect(actionIds(blocks)).toEqual([MARQUETA_ACTION.taskDone, MARQUETA_ACTION.taskSnooze, MARQUETA_ACTION.taskHandBack])
  })

  it('offers only Reopen on finished or dropped work', () => {
    const done = buildCheckInTaskBlocks(task({ status: 'done' }), { now: NOW })
    const dropped = buildCheckInTaskBlocks(task({ status: 'dismissed' }), { now: NOW })
    expect(actionIds(done)).toEqual([MARQUETA_ACTION.taskReopen])
    expect(actionIds(dropped)).toEqual([MARQUETA_ACTION.taskReopen])
    expect(sectionText(done)).toMatch(/^:white_check_mark: \*Write the pre-mortem post\*\ndone$/)
    expect(sectionText(dropped)).toMatch(/^~\*Write the pre-mortem post\*~\ndropped$/)
  })

  it('offers I’ll take it once a task has been handed back', () => {
    const blocks = buildCheckInTaskBlocks(task({ ownerName: undefined, slackUserId: undefined }), { now: NOW })
    expect(actionIds(blocks)).toEqual([MARQUETA_ACTION.taskTake, MARKETING_ACTION.details])
    expect(actionsOf(blocks).map((element: Block) => element.text.text)).toEqual(['I’ll take it', 'Details…'])
    expect(sectionText(blocks)).toContain('Nobody has it')
  })

  it('has no "Still on it" button in any state — silence means still on it', () => {
    const states = [
      task(),
      task({ status: 'working' }),
      task({ status: 'blocked' }),
      task({ status: 'blocked', updatedAt: '2026-09-01T00:00:00Z' }),
      task({ dueAt: '2026-08-01' }),
      task({ status: 'done' }),
      task({ status: 'dismissed' }),
      task({ ownerName: '' }),
    ]
    for (const state of states) {
      const elements = actionsOf(buildCheckInTaskBlocks(state, { now: NOW }))
      expect(elements.length).toBeGreaterThan(0)
      for (const element of elements) {
        expect(element.text.text).not.toMatch(/still on it/i)
        if (element.action_id === MARQUETA_ACTION.taskProgress) expect(element.text.text).toBe('Unstuck')
      }
    }
  })

  it('carries the task, owner and prior status in every button value', () => {
    for (const element of actionsOf(buildCheckInTaskBlocks(task({ status: 'working' }), { now: NOW }))) {
      expect(decodeActionValue(element.value)).toEqual({ taskId: 't1', ownerName: 'Juhan', status: 'working' })
    }
  })

  it('appends the note from a press, and neutralises broadcasts in it', () => {
    const blocks = buildCheckInTaskBlocks(task(), { now: NOW, note: '<@U2> took *it*. <!channel>' })
    expect(sectionText(blocks)).toContain('<@U2> took *it*.')
    expect(sectionText(blocks)).not.toContain('<!channel>')
  })

  it('survives hostile and huge values', () => {
    const blocks = buildCheckInTaskBlocks(
      task({ _id: 'hostile', title: HOSTILE, blocker: HOSTILE, ownerName: HOSTILE, status: '<!here>' }),
      { now: NOW, note: HOSTILE },
    )
    expectValidSlackBlocks(blocks)
    const serialised = JSON.stringify(blocks.map((block) => block.text?.text || ''))
    expect(serialised).not.toContain('<!here>')
    expect(serialised).not.toContain('<5%')
    expect(sectionText(blocks)).toContain('&lt;5%')
    for (const element of actionsOf(blocks)) {
      expect(decodeActionValue(element.value)?.taskId).toBe('hostile')
    }
  })

  it('renders nothing for a task without an id', () => {
    expect(buildCheckInTaskBlocks(task({ _id: '' }), { now: NOW })).toEqual([])
  })
})

describe('every state offers the action that reverses it', () => {
  const open = task({ _id: 'rev' })
  const blocked = task({ _id: 'rev', status: 'blocked', blocker: 'Logos', updatedAt: '2026-09-23T00:00:00Z' })
  const slipping = task({ _id: 'rev', dueAt: '2026-09-01T12:00:00Z' })
  const unowned = task({ _id: 'rev', ownerName: undefined, slackUserId: undefined })
  const done = task({ _id: 'rev', status: 'done' })
  const dropped = task({ _id: 'rev', status: 'dismissed', dueAt: '2026-09-01T12:00:00Z' })

  // What each press leaves behind (the record the server returns), and the
  // button that must be on the redrawn card to take it back.
  const cases: Array<{
    name: string
    press: MarquetaActionId
    before: CheckInTask
    after: CheckInTask
    reverse: MarquetaActionId
    mode?: 'plan' | 'mine'
  }> = [
    { name: 'Done ⇄ Reopen', press: MARQUETA_ACTION.taskDone, before: open, after: { ...open, status: 'done' }, reverse: MARQUETA_ACTION.taskReopen },
    { name: 'Done (stuck) ⇄ Reopen', press: MARQUETA_ACTION.taskDone, before: blocked, after: { ...blocked, status: 'done' }, reverse: MARQUETA_ACTION.taskReopen },
    { name: 'Done (slipping) ⇄ Reopen', press: MARQUETA_ACTION.taskDone, before: slipping, after: { ...slipping, status: 'done' }, reverse: MARQUETA_ACTION.taskReopen },
    { name: 'Reopen ⇄ Done', press: MARQUETA_ACTION.taskReopen, before: done, after: { ...done, status: 'queued' }, reverse: MARQUETA_ACTION.taskDone },
    { name: 'Drop ⇄ Reopen', press: MARQUETA_ACTION.taskDrop, before: slipping, after: { ...slipping, status: 'dismissed' }, reverse: MARQUETA_ACTION.taskReopen },
    { name: 'Reopen (dropped) ⇄ Drop', press: MARQUETA_ACTION.taskReopen, before: dropped, after: { ...dropped, status: 'queued' }, reverse: MARQUETA_ACTION.taskDrop },
    {
      name: 'Hand back ⇄ Take',
      press: MARQUETA_ACTION.taskHandBack,
      before: open,
      after: { ...open, ownerName: undefined, slackUserId: undefined },
      reverse: MARQUETA_ACTION.taskTake,
    },
    {
      // Only a slipping card that cannot be dropped (in progress) offers Hand back.
      name: 'Hand back (slipping, in progress) ⇄ Take',
      press: MARQUETA_ACTION.taskHandBack,
      before: { ...slipping, status: 'working' },
      after: { ...slipping, status: 'working', ownerName: undefined, slackUserId: undefined },
      reverse: MARQUETA_ACTION.taskTake,
    },
    { name: 'Take ⇄ Hand back', press: MARQUETA_ACTION.taskTake, before: unowned, after: { ...unowned, ownerName: 'Juhan', slackUserId: 'U1' }, reverse: MARQUETA_ACTION.taskHandBack },
    {
      // A slipping card in someone's own list is Done · Keep · Drop — its way
      // back is Drop/Keep, not Hand back. Taken from the room's view, the card
      // stays a plan card, and that one offers Hand back.
      name: 'Take (slipping, plan view) ⇄ Hand back',
      press: MARQUETA_ACTION.taskTake,
      before: { ...slipping, ownerName: undefined },
      after: { ...slipping, ownerName: 'Juhan' },
      reverse: MARQUETA_ACTION.taskHandBack,
      mode: 'plan',
    },
    {
      name: 'Stuck ⇄ Unstuck',
      press: MARQUETA_ACTION.taskStuck,
      before: open,
      after: { ...open, status: 'blocked', blocker: 'Logos', updatedAt: NOW.toISOString() },
      reverse: MARQUETA_ACTION.taskProgress,
    },
    {
      name: 'Unstuck ⇄ Stuck',
      press: MARQUETA_ACTION.taskProgress,
      before: blocked,
      after: { ...blocked, status: 'working', blocker: undefined },
      reverse: MARQUETA_ACTION.taskStuck,
    },
  ]

  for (const item of cases) {
    it(item.name, () => {
      const mode = item.mode || 'mine'
      expect(actionIds(buildTaskCard(item.before, { now: NOW, mode }))).toContain(item.press)
      const redrawn = buildTaskCard(item.after, { now: NOW, mode })
      expectValidSlackBlocks(redrawn)
      expect(actionIds(redrawn)).toContain(item.reverse)
    })
  }
})

describe('buildWeeklyCheckInBlocks', () => {
  const group = (ownerName: string, slackUserId: string, taskCount: number, followUpCount = 0, hidden = 0): CheckInGroup => ({
    ownerName,
    slackUserId,
    tasks: Array.from({ length: taskCount }, (_, index) => task({ _id: `${slackUserId}-${index}`, ownerName, slackUserId, title: `${ownerName} task ${index}` })),
    hidden,
    followUps: Array.from({ length: followUpCount }, (_, index) => followUp(`${ownerName}-${index}`)),
  })

  const base = {
    weekLabel: 'Week of Mon 21 Sep',
    unowned: [] as CheckInTask[],
    pulse: pulse(3),
    studioBaseUrl: BASE,
    now: NOW,
  }
  const texts = (blocks: Block[]) => blocks.map((block) => String(block.text?.text || block.elements?.map((e: Block) => e.text?.text ?? e.text).join(' ') || ''))
  const unownedTask = (id: string, title = `Loose end ${id}`) => task({ _id: id, ownerName: '', slackUserId: undefined, title })

  it('reads in the order people act on it, and ends on Open This week', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 2, 1)], unowned: [unownedTask('u1')] })
    expectValidSlackBlocks(blocks)
    expect(blocks[0]).toEqual({ type: 'header', text: { type: 'plain_text', text: 'Thursday check-in', emoji: true } })
    expect(blocks[1]).toMatchObject({ type: 'context', elements: [{ text: 'Week of Mon 21 Sep · 2 working days left' }] })
    expect(blocks[2]).toMatchObject({ type: 'context', elements: [{ text: 'Outreach this week: 3 touches (1 person).' }] })
    expect(blocks[3]).toEqual({ type: 'divider' })
    expect(blocks[4].text.text).toBe('*<@U1>* · 2 tasks, 1 follow-up')
    expect(taskBlockCount(blocks)).toBe(3)
    expect(followUpLineCount(blocks)).toBe(1)
    const nobody = blocks.findIndex((block) => block.text?.text === '*Nobody has taken*')
    expect(blocks[nobody - 1]).toEqual({ type: 'divider' })
    expect(blocks[nobody + 1].block_id).toBe(checkInTaskBlockId('u1'))
    expect(texts(blocks).at(-2)).toBe('Ask me: `Marqueta, my tasks` · `Marqueta, my calls` · `Marqueta, help`')
    const last = blocks[blocks.length - 1]
    expect(last).toMatchObject({ type: 'actions', block_id: CHECK_IN_FOOTER_BLOCK })
    expect(last.elements).toEqual([expect.objectContaining({ url: STUDIO, text: expect.objectContaining({ text: 'Open This week' }) })])
  })

  it('counts the working days left in words, and none at the weekend', () => {
    const on = (now: Date) => buildWeeklyCheckInBlocks({ ...base, now, groups: [group('Juhan', 'U1', 1)] })[1].elements[0].text
    expect(on(new Date('2026-09-21T14:00:00Z'))).toBe('Week of Mon 21 Sep · 5 working days left')
    expect(on(new Date('2026-09-25T14:00:00Z'))).toBe('Week of Mon 21 Sep · 1 working day left')
    expect(on(new Date('2026-09-26T14:00:00Z'))).toBe('Week of Mon 21 Sep')
  })

  it('gives follow-ups Prep and Log it… carrying the contact ref, and no Done', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 0, 1)] })
    const actions = blocks.find((block) => block.type === 'actions' && block.elements.some((e: Block) => e.action_id === MARQUETA_ACTION.prepCall))!
    expect(actions.elements.map((element: Block) => element.action_id)).toEqual([MARQUETA_ACTION.prepCall, MARQUETA_ACTION.logCall])
    expect(actions.elements.map((element: Block) => element.text.text)).toEqual(['Prep', 'Log it…'])
    expect(actions.elements[0].value).toBe(followUp('Juhan-0').contactRef)
    expect(blocks.find((block) => String(block.text?.text || '').startsWith('*<@U1>*'))!.text.text).toBe('*<@U1>* · 1 follow-up')
  })

  it('shows at most three tasks and two follow-ups a person, and links the rest to This week filtered to them', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 5, 4, 2)] })
    expect(taskBlockCount(blocks)).toBe(3)
    expect(followUpLineCount(blocks)).toBe(2)
    expect(blocks.find((block) => String(block.text?.text || '').startsWith('*<@U1>*'))!.text.text).toBe('*<@U1>* · 7 tasks, 4 follow-ups')
    expect(JSON.stringify(blocks)).toContain(`+4 more — <${STUDIO}&owner=Juhan|on This week> · 2 more follow-ups — ask \`Marqueta, my calls\``)
  })

  it('draws every task with the shared card, its title linked to the task in the Studio', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 1)] })
    const card = blocks.find((block) => block.block_id === checkInTaskBlockId('U1-0'))!
    expect(card.text.text.split('\n')[0]).toBe(`*<${BASE}/studio/marketing?view=thisWeek&task=U1-0|Juhan task 0>*`)
    const buttons = blocks.find((block) => block.block_id === checkInTaskActionsBlockId('U1-0'))!.elements
    expect(buttons.map((element: Block) => element.text.text)).toEqual(['Done', 'Stuck…', 'Hand back'])
    expect(decodeTaskCardValue(buttons[0].value)?.mode).toBe('mine')
  })

  it('mentions each person exactly once, even if a caller split them into two groups', () => {
    const blocks = buildWeeklyCheckInBlocks({
      ...base,
      groups: [group('Juhan', 'U1', 2, 2), group('Shirley', 'U2', 3, 1), { ...group('Juhan S', 'U1', 1), tasks: [task({ _id: 'x9' })] }],
    })
    const serialised = JSON.stringify(blocks)
    expect(count(serialised, '<@U1>')).toBe(1)
    expect(count(serialised, '<@U2>')).toBe(1)
    expectValidSlackBlocks(blocks)
  })

  it('says how to log calls from people not on file when nothing is logged — as a phrase to type, never a mention of her', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, pulse: pulse(0), groups: [group('Juhan', 'U1', 1)] })
    expect(blocks[2].elements[0].text).toBe('Outreach this week: no outreach logged yet.')
    // The outreach line has just said nothing was logged; the hint does not say it again.
    expect(texts(blocks).at(-2)).toBe(
      'Called someone not on file? Say `Marqueta, called Sam Rivera at Acme, no answer` — or `Marqueta, prep Sam Rivera at Acme` first.',
    )
    expect(JSON.stringify(blocks)).not.toMatch(/@Marqueta|<@UBOT>|\bDM\b/)
    // One line on how to talk to her, not two in a row: the hint takes the place of "Ask me".
    expect(JSON.stringify(blocks)).not.toContain('Ask me:')
    // With touches logged, no hint — and "Ask me" is back.
    const logged = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 1)] })
    expect(JSON.stringify(logged)).not.toContain('not on file')
    expect(texts(logged).at(-2)).toBe('Ask me: `Marqueta, my tasks` · `Marqueta, my calls` · `Marqueta, help`')
  })

  it('never renders the per-person touch counts (that is a leaderboard)', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, pulse: pulse(4), groups: [group('Juhan', 'U1', 1)] })
    expect(JSON.stringify(blocks)).not.toContain('Zebedee')
  })

  it('shows up to three cards nobody has taken — the room’s cards, I’ll take it first — and counts the rest', () => {
    const unowned = Array.from({ length: 5 }, (_, index) => unownedTask(`u${index}`, `Loose end ${index} & <co>`))
    const blocks = buildWeeklyCheckInBlocks({ ...base, unowned, groups: [group('Juhan', 'U1', 1)] })
    expectValidSlackBlocks(blocks)
    for (const id of ['u0', 'u1', 'u2']) {
      const buttons = blocks.find((block) => block.block_id === checkInTaskActionsBlockId(id))!.elements
      expect(buttons.map((element: Block) => [element.text.text, element.style])).toEqual([
        ['I’ll take it', 'primary'],
        ['Details…', undefined],
      ])
      // A take on the room's card reads "Taken by …" with Hand back — not somebody's own list.
      expect(decodeTaskCardValue(buttons[0].value)?.mode).toBe('plan')
    }
    expect(blocks.some((block) => block.block_id === checkInTaskBlockId('u3'))).toBe(false)
    expect(JSON.stringify(blocks)).toContain('Loose end 0 &amp; &lt;co&gt;')
    expect(texts(blocks)).toContain(`+2 more — <${STUDIO}|on This week>`)
  })

  it('places the lines about work nobody is asked about, escaped, above the hints', () => {
    const notes = ['Follow-ups nobody owns: Robin (Acme), overdue since Mon 21 Sep', ':palm_tree: Away, so not asked this week: Eric <!here> (1 task).']
    const blocks = buildWeeklyCheckInBlocks({ ...base, notes, groups: [group('Juhan', 'U1', 1)] })
    expectValidSlackBlocks(blocks)
    const holder = blocks.find((block) => block.type === 'context' && JSON.stringify(block).includes('Follow-ups nobody owns'))!
    expect(holder.elements.map((element: Block) => element.text)).toEqual([notes[0], ':palm_tree: Away, so not asked this week: Eric &lt;!here&gt; (1 task).'])
    expect(blocks.indexOf(holder)).toBeLessThan(blocks.findIndex((block) => JSON.stringify(block).includes('Ask me:')))
    // Set apart from Juhan's list, so it is not read as his.
    expect(blocks[blocks.indexOf(holder) - 1]).toEqual({ type: 'divider' })
  })

  // The design target: a normal week reads on a phone in two screens, with
  // the first Done on the first. Rendered the rough way every message is
  // measured — 40 characters to a line, two buttons to a row.
  it('fits a three-person week in 45 phone lines, with the first Done on the first screen', () => {
    const blocks = buildWeeklyCheckInBlocks({
      ...base,
      groups: [
        { ownerName: 'Eric', slackUserId: 'U3', hidden: 0, tasks: [task({ _id: 'e1', ownerName: 'Eric', slackUserId: 'U3', title: 'Update the case study page', minutes: 45 })], followUps: [followUp('Leo Park')] },
        {
          ownerName: 'Juhan',
          slackUserId: 'U1',
          hidden: 0,
          tasks: [task({ _id: 'j1', title: 'Send the kit to five CMIOs', dueAt: '2026-09-02T12:00:00Z', createdAt: '2026-08-20T00:00:00Z', updatedAt: '2026-08-21T00:00:00Z' })],
          followUps: [followUp('Jane Doe')],
        },
        {
          ownerName: 'Shirley',
          slackUserId: 'U2',
          hidden: 0,
          tasks: [task({ _id: 's1', ownerName: 'Shirley', slackUserId: 'U2', title: 'Fix the signup form', status: 'blocked', blocker: 'Need the API key' })],
          followUps: [],
        },
      ],
      unowned: [unownedTask('u1', 'Town Day merch table'), unownedTask('u2', 'Newsletter teaser')],
    })
    expectValidSlackBlocks(blocks)
    const lines = phoneLines(blocks)
    expect(lines.length).toBeLessThanOrEqual(45)
    expect(checkInPhoneLines(blocks)).toBeLessThanOrEqual(MAX_CHECK_IN_PHONE_LINES)
    expect(lines.findIndex((line) => line.includes('【Done】'))).toBeLessThan(22)
    // Nothing was given up to get there.
    expect(taskBlockCount(blocks)).toBe(5)
    expect(followUpLineCount(blocks)).toBe(2)
  })

  // The two-screen budget gives up, in order, only while the message is still
  // over: the per-person dividers, the hint's second example, each person's
  // follow-ups beyond their first — and the room's cards LAST, and only when
  // that makes it fit. Those cards carry the check-in's only I’ll take it.
  const personHeadings = (blocks: Block[]) => blocks.filter((block) => /^\*(<@U\w+>|[^*]+)\* · /.test(String(block.text?.text || '')))

  it('on a crowded week, gives up the dividers and each person’s extra follow-ups first — and never hides a person’s task for length', () => {
    const groups = [group('Juhan', 'U1', 3, 2), group('Shirley', 'U2', 3, 2), group('Eric', 'U3', 2, 1)]
    const unowned = [unownedTask('u1', 'Town Day merch table'), unownedTask('u2', 'Newsletter teaser'), unownedTask('u3', 'Pin the kit')]
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups, unowned })
    expectValidSlackBlocks(blocks)
    // No rule above anybody's list: the bold mention separates people.
    for (const heading of personHeadings(blocks)) expect(blocks[blocks.indexOf(heading) - 1].type).not.toBe('divider')
    // Follow-ups beyond each person's first go to `my calls`; every task stays.
    expect(followUpLineCount(blocks)).toBe(3)
    expect(JSON.stringify(blocks)).toContain('1 more follow-up — ask `Marqueta, my calls`')
    expect(taskBlockCount(blocks)).toBe(8 + 3)
    // Still over two screens even with the room's cards as a count — so the
    // cards stay: giving them up would lose the take buttons AND the budget.
    expect(checkInPhoneLines(blocks)).toBeGreaterThan(MAX_CHECK_IN_PHONE_LINES)
    expect(blocks.some((block) => block.text?.text === '*Nobody has taken*')).toBe(true)
    expect(JSON.stringify(blocks)).not.toContain('Nobody has taken:')
  })

  it('makes the room’s cards one line — titles first, then only how many — when that brings it within two screens', () => {
    const groups = [group('Juhan', 'U1', 3, 1), group('Shirley', 'U2', 2, 1), group('Eric', 'U3', 1)]
    const unowned = [unownedTask('u1', 'Town Day merch table'), unownedTask('u2', 'Newsletter teaser'), unownedTask('u3', 'Pin the kit')]
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups, unowned })
    expectValidSlackBlocks(blocks)
    expect(checkInPhoneLines(blocks)).toBeLessThanOrEqual(MAX_CHECK_IN_PHONE_LINES)
    expect(blocks.some((block) => block.text?.text === '*Nobody has taken*')).toBe(false)
    expect(texts(blocks)).toContain(`*Nobody has taken:* Town Day merch table · Newsletter teaser · Pin the kit — <${STUDIO}|on This week>`)
    // Set apart from Eric's list, so it is not read as his.
    const line = blocks.find((block) => JSON.stringify(block).includes('Nobody has taken:'))!
    expect(blocks[blocks.indexOf(line) - 1]).toEqual({ type: 'divider' })
    expect(taskBlockCount(blocks)).toBe(6)
    expect(followUpLineCount(blocks)).toBe(2)
  })

  // §4's Thursday, as the gallery renders it from the real route: three
  // people asked (Jon is on nobody's roster), a stuck task, a slipping one, two
  // follow-ups, three tasks nobody has taken, nothing logged all week, and
  // Eric away. It measured 55 lines before the budget above.
  it('fits the gallery’s Thursday in 45 phone lines — and still asks every person about every task', () => {
    const contactRef = (contactId: string, organization: string, name: string) => encodeContactRef({ contactId, organization, name })
    const galleryPulse = summarizeOutreach(
      [
        { _id: 'jd', status: 'contacted', followUpAt: '2026-09-22T14:00:00Z', interactions: [{ at: '2026-09-15T15:00:00Z', by: 'Juhan', channel: 'email', statusAfter: 'contacted' }] },
        { _id: 'pp', status: 'responded', followUpAt: '2026-09-25T14:00:00Z', interactions: [{ at: '2026-09-18T19:00:00Z', by: 'Shirley', channel: 'email', statusAfter: 'responded' }] },
      ],
      { from: '2026-09-21T00:00:00Z', to: '2026-09-28T00:00:00Z', now: NOW },
    )
    const op = (fields: Partial<CheckInTask> & { _id: string; title: string }): CheckInTask => ({ status: 'queued', kind: 'content', priority: 'normal', ...fields })
    const groups: CheckInGroup[] = [
      {
        ownerName: 'Jon',
        hidden: 0,
        followUps: [],
        tasks: [op({ _id: 'marketingOperation.offer-one-pager', title: 'Refresh the offer one-pager', ownerName: 'Jon', dueAt: '2026-10-02T16:00:00Z', minutes: 45 })],
      },
      {
        ownerName: 'Juhan',
        slackUserId: 'U1',
        hidden: 0,
        tasks: [
          op({
            _id: 'marketingOperation.ipsos-numbers',
            title: 'Get the Ipsos adoption numbers approved for the case study',
            ownerName: 'Juhan',
            slackUserId: 'U1',
            status: 'blocked',
            kind: 'outreach',
            priority: 'high',
            blocker: 'Waiting on Ipsos legal to approve the 90% adoption figure',
            dueAt: '2026-09-28T16:00:00Z',
            minutes: 30,
            updatedAt: '2026-09-19T15:00:00Z',
          }),
        ],
        followUps: [
          {
            label: '*Follow up with Jane Doe (Mass General Brigham)*',
            detail: 'overdue since Tue 22 Sep · last: Contacted on 15 Sep · they know us',
            overdue: true,
            contactRef: contactRef('marketingContact.jane-doe-mgb', 'Mass General Brigham', 'Jane Doe'),
          },
        ],
      },
      {
        ownerName: 'Shirley',
        slackUserId: 'U2',
        hidden: 0,
        tasks: [
          op({ _id: 'marketingOperation.services-page', title: 'Rewrite the services page around the pre-mortem', ownerName: 'Shirley', slackUserId: 'U2', dueAt: '2026-09-08T16:00:00Z', minutes: 90, updatedAt: '2026-09-02T12:00:00Z' }),
          op({ _id: 'marketingOperation.premortem-v2', title: 'Draft the pre-mortem article (v2)', ownerName: 'Shirley', slackUserId: 'U2', status: 'working', priority: 'high', dueAt: '2026-09-25T16:00:00Z', minutes: 180, updatedAt: '2026-09-22T15:00:00Z' }),
        ],
        followUps: [
          {
            label: '*Follow up with Priya Patel (Acme Health)*',
            detail: 'due Fri 25 Sep · last: Responded on 18 Sep · they replied',
            contactRef: contactRef('marketingContact.priya-patel-acme', 'Acme Health', 'Priya Patel'),
          },
        ],
      },
    ]
    const unowned = [
      op({ _id: 'marketingOperation.town-day-merch', title: 'Arlington Town Day merch table', dueAt: '2026-09-26T14:00:00Z', minutes: 120 }),
      op({ _id: 'marketingOperation.newsletter-teaser', title: 'Newsletter: pre-mortem teaser', dueAt: '2026-09-29T16:00:00Z', minutes: 60 }),
      op({ _id: 'marketingOperation.pin-kit-linkedin', title: 'Pin the kit on LinkedIn', priority: 'low', minutes: 15 }),
    ]
    const notes = [':palm_tree: Away, so not asked this week: Eric (1 follow-up). That list is on This week if anything needs cover.']
    const blocks = buildWeeklyCheckInBlocks({ ...base, pulse: galleryPulse, groups, unowned, notes })
    expectValidSlackBlocks(blocks)

    expect(checkInPhoneLines(blocks)).toBeLessThanOrEqual(MAX_CHECK_IN_PHONE_LINES)
    expect(phoneLines(blocks).length).toBeLessThanOrEqual(45)
    expect(phoneLines(blocks).findIndex((line) => line.includes('【Done】'))).toBeLessThan(22)
    // Every person's every task and follow-up is still asked about, with its buttons.
    expect(taskBlockCount(blocks)).toBe(4)
    expect(followUpLineCount(blocks)).toBe(2)
    expect(personHeadings(blocks).map((block) => block.text.text)).toEqual(['*Jon* · 1 task', '*<@U1>* · 1 task, 1 follow-up', '*<@U2>* · 2 tasks, 1 follow-up'])
    // What gave way: the dividers, the hint's second example, and the room's
    // cards — as a count, beside the away line, one link from This week.
    expect(texts(blocks)).toContain(`*Nobody has taken:* 3 tasks — <${STUDIO}|on This week> ${notes[0]}`)
    expect(texts(blocks).at(-2)).toBe('Called someone not on file? Say `Marqueta, called Sam Rivera at Acme, no answer`.')
    expect(blocks.filter((block) => block.type === 'divider')).toHaveLength(1)
    expect(blocks.at(-1)).toMatchObject({ type: 'actions', block_id: CHECK_IN_FOOTER_BLOCK })
  })

  it('stays within Slack’s fifty blocks by giving things up in order, but never a person', () => {
    const groups = Array.from({ length: 8 }, (_, index) => group(`Person ${index}`, `U10${index}`, 3, 3))
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups, unowned: [unownedTask('u1')] })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    expect(followUpLineCount(blocks)).toBe(0)
    expect(blocks.some((block) => block.block_id === checkInTaskBlockId('u1'))).toBe(false)
    expect(taskBlockCount(blocks)).toBeLessThan(24)
    const serialised = JSON.stringify(blocks)
    for (let index = 0; index < 8; index += 1) expect(count(serialised, `<@U10${index}>`)).toBe(1)
    // What was given up is counted, never silently dropped.
    expect(serialised).toContain('more follow-up')
    expect(serialised).toContain('Nobody has taken:')
  })

  it('still mentions everyone once when there are more people than lines', () => {
    const groups = Array.from({ length: 40 }, (_, index) => group(`Person ${index}`, `U${String(index).padStart(3, '0')}`, 5, 5, 3))
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups, unowned: [unownedTask('u')], notes: ['Follow-ups nobody owns: Robin (Acme)'] })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    const serialised = JSON.stringify(blocks)
    for (let index = 0; index < 40; index += 1) expect(count(serialised, `<@U${String(index).padStart(3, '0')}>`)).toBe(1)
    // The ownerless follow-ups are never what did not fit.
    expect(serialised).toContain('Follow-ups nobody owns: Robin (Acme)')
    expect(blocks.at(-1)).toMatchObject({ block_id: CHECK_IN_FOOTER_BLOCK })
  })

  it('survives hostile and huge values everywhere', () => {
    const hostileGroup: CheckInGroup = {
      ownerName: HOSTILE,
      slackUserId: 'not-an-id',
      hidden: 1,
      tasks: [task({ _id: 'h1', title: HOSTILE, blocker: HOSTILE, ownerName: HOSTILE }), task({ _id: 'h2', title: '' })],
      followUps: [
        { label: HOSTILE, detail: HOSTILE, contactRef: encodeContactRef({ contactId: 'c', organization: HOSTILE, note: HOSTILE }) },
        { label: '*Ok*', detail: '', contactRef: 'x'.repeat(5000) },
        { label: '', detail: '', contactRef: 'x' },
      ],
    }
    const blocks = buildWeeklyCheckInBlocks({
      ...base,
      weekLabel: HOSTILE,
      groups: [hostileGroup],
      unowned: [unownedTask('hu', HOSTILE)],
      notes: [HOSTILE],
    })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    const serialised = JSON.stringify(blocks.flatMap((block) => [block.text?.text, ...(block.elements || []).map((e: Block) => e.text)]))
    expect(serialised).not.toContain('<!here>')
    expect(serialised).not.toContain('<5%')
  })

  it("keeps a follow-up line's own mentions and links, and escapes anything else in it", () => {
    const blocks = buildWeeklyCheckInBlocks({
      ...base,
      groups: [
        {
          ...group('Juhan', 'U1', 0),
          followUps: [
            {
              label: '*Follow up with Jane (AT&amp;T)*',
              detail: 'ask <@U2> · <https://x.org/a|source> · <5% & more · <!everyone>',
              contactRef: 'r',
            },
          ],
        },
      ],
    })
    expectValidSlackBlocks(blocks)
    const line = blocks.find((block) => block.type === 'section' && String(block.text.text).startsWith('*Follow up'))!
    expect(line.text.text).toBe(
      '*Follow up with Jane (AT&amp;T)*\nask <@U2> · <https://x.org/a|source> · &lt;5% &amp; more · &lt;!everyone&gt;',
    )
  })

  it('ignores a studio base that is not a web link: no links, no Open button, and no message Slack would refuse', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, studioBaseUrl: 'javascript:alert(1)', groups: [group('Juhan', 'U1', 1, 0, 2)] })
    expectValidSlackBlocks(blocks)
    expect(JSON.stringify(blocks)).not.toContain('javascript:')
    expect(texts(blocks)).toContain('+2 more — on This week')
    expect(blocks.at(-1)!.type).toBe('context')
  })

  it('is one line when nothing is on anyone’s list — still posted, so a quiet week never looks like a dead job', () => {
    const quiet = buildWeeklyCheckInBlocks({ ...base, groups: [] })
    expectValidSlackBlocks(quiet)
    expect(quiet).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Thursday check-in:* nothing is on anyone’s list for this week or next. Outreach this week: 3 touches (1 person).',
        },
      },
    ])
    expect(buildWeeklyCheckInBlocks({ ...base, pulse: null, groups: [] })).toEqual([
      { type: 'section', text: { type: 'mrkdwn', text: '*Thursday check-in:* nothing is on anyone’s list for this week or next.' } },
    ])
  })

  it('writes no ISO dates, no ISO weeks and no "(s)" anywhere', () => {
    const blocks = buildWeeklyCheckInBlocks({
      ...base,
      pulse: pulse(0),
      groups: [group('Juhan', 'U1', 3, 3, 1), group('Shirley', 'U2', 1, 1)],
      unowned: [unownedTask('u1'), unownedTask('u2')],
      notes: ['Follow-ups nobody owns: Robin (Acme), overdue since Mon 21 Sep'],
    })
    const all = JSON.stringify(blocks.map((block) => [block.text?.text, ...(block.elements || []).map((e: Block) => e.text?.text ?? e.text)]))
    expect(all).not.toMatch(/\d{4}-\d{2}-\d{2}|\bW\d{2}\b|\(s\)|DM me/)
  })
})

describe('checkInFallbackText — the lock-screen line', () => {
  const people: CheckInGroup[] = [
    { ownerName: 'Juhan', slackUserId: 'U1', tasks: [task(), task({ _id: 't2' })], hidden: 1, followUps: [{ ...followUp('A'), overdue: true }] },
    { ownerName: 'Juhan S', slackUserId: 'U1', tasks: [], hidden: 0, followUps: [followUp('B')] },
    { ownerName: 'Jen & <Co>', tasks: [task({ _id: 't3' })], hidden: 0, followUps: [{ ...followUp('C'), overdue: true }, followUp('D')] },
    { ownerName: 'Shirley', slackUserId: 'U2', tasks: [task({ _id: 't4' })], hidden: 0, followUps: [] },
  ]

  it('leads with the mentions, once each, then what it is and how much', () => {
    expect(checkInFallbackText(people, { unowned: 2 })).toBe('<@U1> <@U2> — Thursday check-in: 7 open tasks, 4 follow-ups (2 overdue)')
  })

  it('mentions only people Slack can notify — a bare name notifies nobody', () => {
    const text = checkInFallbackText(people)
    expect(text).not.toContain('Jen')
    expect(text.slice(0, 90)).toContain('Thursday check-in')
  })

  it('says only the counts that are not zero, and says so when there is nothing', () => {
    expect(checkInFallbackText([{ ownerName: 'Juhan', slackUserId: 'U1', tasks: [], hidden: 0, followUps: [followUp('A')] }])).toBe(
      '<@U1> — Thursday check-in: 1 follow-up',
    )
    expect(checkInFallbackText([], { unowned: 1 })).toBe('Thursday check-in: 1 open task')
    expect(checkInFallbackText([])).toBe('Thursday check-in: nothing is on anyone’s list for this week or next.')
  })
})

describe('replaceCheckInTask', () => {
  const groups: CheckInGroup[] = [
    {
      ownerName: 'Juhan',
      slackUserId: 'U1',
      hidden: 1,
      tasks: [task({ _id: 'a', title: 'First' }), task({ _id: 'b', title: 'Second' }), task({ _id: 'c', title: 'Third' })],
      followUps: [followUp('Jane')],
    },
    { ownerName: 'Shirley', slackUserId: 'U2', hidden: 0, tasks: [task({ _id: 'd', ownerName: 'Shirley', slackUserId: 'U2' })], followUps: [] },
  ]
  const message = () =>
    buildWeeklyCheckInBlocks({
      weekLabel: 'Week of Mon 21 Sep',
      groups,
      unowned: [task({ _id: 'u', ownerName: '' })],
      pulse: pulse(2),
      studioBaseUrl: BASE,
      now: NOW,
    })

  it('redraws exactly one task and leaves every other block byte-identical', () => {
    const blocks = message()
    const before = JSON.stringify(blocks)
    const note = checkInAcknowledgement(MARQUETA_ACTION.taskDone, '<@U1>', NOW)
    const next = replaceCheckInTask(blocks, 'b', task({ _id: 'b', title: 'Second', status: 'done' }), { now: NOW, note })

    expect(JSON.stringify(blocks)).toBe(before)
    expect(next).toHaveLength(blocks.length)
    const ids = new Set([checkInTaskBlockId('b'), checkInTaskActionsBlockId('b')])
    let changed = 0
    next.forEach((block, index) => {
      if (ids.has(block.block_id)) {
        changed += 1
        return
      }
      expect(block).toBe(blocks[index])
      expect(JSON.stringify(block)).toBe(JSON.stringify(blocks[index]))
    })
    expect(changed).toBe(2)

    const section = next.find((block) => block.block_id === checkInTaskBlockId('b'))!
    expect(section.text.text).toContain(':white_check_mark: *Second*')
    expect(section.text.text).toContain('_Done by <@U1> · Thu 24 Sep_')
    expect(actionIds([next.find((block) => block.block_id === checkInTaskActionsBlockId('b'))!])).toEqual([MARQUETA_ACTION.taskReopen])
    expectValidSlackBlocks(next)
  })

  it('keeps the block ids even if the fresh record arrives with a different id', () => {
    const next = replaceCheckInTask(message(), 'a', task({ _id: 'something-else', status: 'blocked' }), { now: NOW })
    expect(next.filter((block) => String(block.block_id || '').endsWith('_a'))).toHaveLength(2)
    expectValidSlackBlocks(next)
  })

  it('is a no-op when the task is not in the message', () => {
    const blocks = message()
    expect(replaceCheckInTask(blocks, 'missing', task({ _id: 'missing' }), { now: NOW })).toBe(blocks)
    expect(replaceCheckInTask(undefined as unknown as Block[], 'a', task(), { now: NOW })).toBeUndefined()
  })

  it('works on a message that holds only the section (an older render)', () => {
    const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: 'hello' } }, buildCheckInTaskBlocks(task({ _id: 'a' }), { now: NOW })[0]]
    const next = replaceCheckInTask(blocks, 'a', task({ _id: 'a', status: 'done' }), { now: NOW })
    expect(next).toHaveLength(3)
    expect(next[0]).toBe(blocks[0])
    expectValidSlackBlocks(next)
  })
})

describe('the Stuck modal', () => {
  const metadata = encodeTaskStuckMetadata({ taskId: 't1', channel: 'C1', threadTs: '1.1', messageTs: '1.1' })

  it('is a modal Slack will open, asking one required question', () => {
    const view = buildTaskStuckView({ taskTitle: 'Write the post', metadata }) as Block
    expectValidSlackModal(view)
    expect(view.callback_id).toBe(TASK_STUCK_CALLBACK)
    expect(view.title.text).toBe('What’s in the way?')
    expect(view.submit.text).toBe('Save')
    expect(view.close.text).toBe('Cancel')
    expect(view.private_metadata).toBe(metadata)
    const input = view.blocks.find((block: Block) => block.type === 'input')
    expect(input.block_id).toBe(TASK_BLOCKER_BLOCK)
    expect(input.optional).not.toBe(true)
    expect(input.element).toMatchObject({ type: 'plain_text_input', action_id: TASK_BLOCKER_INPUT, multiline: true, max_length: 600 })
  })

  it('escapes and clips a hostile title', () => {
    const view = buildTaskStuckView({ taskTitle: HOSTILE, metadata }) as Block
    expectValidSlackModal(view)
    expect(JSON.stringify(view.blocks)).not.toContain('<!here>')
  })

  it('reads the blocker back, trimmed and capped', () => {
    const values = (value: string | null) => ({ [TASK_BLOCKER_BLOCK]: { [TASK_BLOCKER_INPUT]: { value } } })
    expect(readTaskStuckSubmission(values('  Waiting on the logo files  '))).toBe('Waiting on the logo files')
    expect(readTaskStuckSubmission(values(null))).toBe('')
    expect(readTaskStuckSubmission(undefined)).toBe('')
    expect(readTaskStuckSubmission({})).toBe('')
    expect(readTaskStuckSubmission(values('y'.repeat(5000)))).toHaveLength(600)
  })
})

describe('findTaskTitleInBlocks', () => {
  it('recovers the plain title from the card, whatever its state', () => {
    const title = 'Call AT&T about <5% pilots'
    for (const status of ['queued', 'done', 'dismissed', 'blocked']) {
      const blocks = [
        { type: 'section', text: { type: 'mrkdwn', text: 'other' } },
        ...buildCheckInTaskBlocks(task({ title, status }), { now: NOW, note: 'x' }),
      ]
      expect(findTaskTitleInBlocks(blocks, 't1'), status).toBe(title)
    }
  })

  it('says nothing when the card is not there', () => {
    expect(findTaskTitleInBlocks(buildCheckInTaskBlocks(task(), { now: NOW }), 'other')).toBe('')
    expect(findTaskTitleInBlocks(undefined, 't1')).toBe('')
  })
})

describe('checkInAcknowledgement — the state note a press leaves (§2.4 rule 11)', () => {
  it('is stateNote for the press, for every task action — no title, no straight apostrophe', () => {
    const table: Array<[string, string]> = [
      [MARQUETA_ACTION.taskDone, '_Done by <@U1> · Thu 24 Sep_'],
      [MARQUETA_ACTION.taskProgress, '_Unstuck by <@U1>_'],
      [MARQUETA_ACTION.taskStuck, '_Stuck — <@U1> added what’s in the way_'],
      [MARQUETA_ACTION.taskHandBack, '_Handed back by <@U1> — anyone can take it_'],
      [MARQUETA_ACTION.taskReopen, '_Reopened by <@U1>_'],
      [MARQUETA_ACTION.taskTake, '_Taken by <@U1> · Thu 24 Sep_'],
      [MARQUETA_ACTION.taskDrop, '_Dropped by <@U1> — Reopen brings it back_'],
      [MARQUETA_ACTION.taskSnooze, '_Moved to next week by <@U1>_'],
      [MARKETING_ACTION.claim, '_Taken by <@U1> · Thu 24 Sep_'],
      [MARKETING_ACTION.decline, '_<@U1> passed — still needs someone_'],
    ]
    for (const [action, note] of table) {
      expect(checkInAcknowledgement(action, '<@U1>', NOW), action).toBe(note)
      expect(note, action).not.toContain("'")
    }
    // A press with no note of its own still says who.
    expect(checkInAcknowledgement('goinvo_marqueta_something_new', '<@U1>', NOW)).toBe('_Updated by <@U1> · Thu 24 Sep_')
  })

  it('escapes anything that is not a mention', () => {
    expect(checkInAcknowledgement(MARQUETA_ACTION.taskTake, '<!here>', NOW)).toBe('_Taken by Someone · Thu 24 Sep_')
    expect(checkInAcknowledgement(MARQUETA_ACTION.taskDone, 'Jen & Co', NOW)).toBe('_Done by Jen &amp; Co · Thu 24 Sep_')
  })
})

describe('buildTaskCard — one card for every message (§2.5)', () => {
  const BASE = 'https://www.goinvo.com'
  const labelsOf = (blocks: Block[]) => actionsOf(blocks).map((element: Block) => element.text.text)
  const metaOf = (blocks: Block[]) => sectionText(blocks).split('\n')[1] || ''

  // Every card state in the plan's table, as the builder is asked for it.
  const states: Array<{ name: string; card: Block[]; labels: string[]; meta: RegExp | string }> = [
    {
      name: 'owned, open (mine)',
      card: buildTaskCard(task({ status: 'working', dueAt: '2026-09-28', minutes: 30 }), { now: NOW, mode: 'mine' }),
      labels: ['Done', 'Stuck…', 'Hand back'],
      meta: 'due Mon 28 Sep · ~30m · in progress',
    },
    {
      name: 'owned, stuck',
      card: buildTaskCard(task({ status: 'blocked', blocker: 'Need the logos', minutes: 30, updatedAt: '2026-09-23T00:00:00Z' }), {
        now: NOW,
        mode: 'mine',
      }),
      labels: ['Done', 'Unstuck', 'Hand back'],
      meta: 'due tomorrow · ~30m · stuck · in the way: Need the logos',
    },
    {
      name: 'owned, slipping',
      card: buildTaskCard(task({ dueAt: '2026-09-10T12:00:00Z', minutes: 90 }), { now: NOW, mode: 'mine' }),
      labels: ['Done', 'Keep — next week', 'Drop it'],
      // The question ends the meta line (§2.5) rather than costing a line of its own.
      meta: 'overdue since Thu 10 Sep · ~1h 30m · not started _Still worth doing?_',
    },
    {
      name: 'owned, plan view',
      card: buildTaskCard(task({ minutes: 30 }), { now: NOW, mode: 'plan' }),
      labels: ['Hand back'],
      meta: 'Taken by <@U1> · ~30m',
    },
    {
      name: 'owned, stuck, plan view',
      card: buildTaskCard(task({ status: 'blocked', blocker: 'Need the logos', minutes: 30 }), { now: NOW, mode: 'plan' }),
      labels: ['Hand back'],
      meta: 'Taken by <@U1> · ~30m · stuck · in the way: Need the logos',
    },
    {
      name: 'unowned',
      card: buildTaskCard(task({ ownerName: '', slackUserId: undefined, minutes: 30, dueAt: '2026-09-28' }), { now: NOW, mode: 'plan' }),
      labels: ['I’ll take it', 'Details…'],
      meta: 'Nobody has it · due Mon 28 Sep · ~30m',
    },
    {
      name: 'unowned, asked',
      card: buildTaskCard(task({ ownerName: '', slackUserId: undefined, minutes: 30 }), {
        now: NOW,
        mode: 'plan',
        ask: { slackUserId: 'U3', name: 'Eric', reason: 'suggested' },
      }),
      labels: ['I’ll take it', 'Not me', 'Details…'],
      meta: '<@U3>, could you take this one? · ~30m · the plan had you in mind',
    },
    {
      name: 'away cover',
      card: buildTaskCard(task({ ownerName: 'Eric', slackUserId: 'U3' }), {
        now: NOW,
        mode: 'plan',
        context: 'away',
        awayNote: 'Eric is away · free this week: Juhan, Shirley',
      }),
      labels: ['I’ll take it', 'Details…'],
      meta: ':palm_tree: Eric is away · free this week: Juhan, Shirley',
    },
    {
      name: 'exhausted (asked twice)',
      card: buildTaskCard(task({ ownerName: '', slackUserId: undefined }), { now: NOW, mode: 'plan', context: 'exhausted' }),
      labels: ['I’ll take it', 'Drop it', 'Details…'],
      meta: 'Asked twice, nobody took it — still worth doing?',
    },
    {
      name: 'decision',
      card: buildTaskCard(
        task({ ownerName: '', slackUserId: undefined, kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish F1–F8?', dueAt: '2026-09-28' }),
        { now: NOW, mode: 'plan' },
      ),
      labels: ['Answer…'],
      meta: 'Needs a decision · due Mon 28 Sep',
    },
    {
      // Seeded decisions are OWNED: in the owner's own list they keep Done and Hand back.
      name: 'decision, own (mine)',
      card: buildTaskCard(task({ kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish F1–F8?', dueAt: '2026-09-28' }), {
        now: NOW,
        mode: 'mine',
      }),
      labels: ['Answer…', 'Done', 'Hand back'],
      meta: 'Needs a decision · due Mon 28 Sep',
    },
    {
      name: 'decision, own, not answerable here (mine)',
      card: buildTaskCard(task({ kind: 'content', status: 'needsHuman', humanQuestion: 'Which client story leads?', dueAt: '2026-09-28' }), {
        now: NOW,
        mode: 'mine',
      }),
      labels: ['Done', 'Details…', 'Hand back'],
      meta: 'Needs a decision · due Mon 28 Sep',
    },
    {
      // Answered: queued again, question kept. Ordinary work now — not "Needs a decision" forever.
      name: 'decision, answered (mine)',
      card: buildTaskCard(task({ kind: 'decision', status: 'queued', humanQuestion: 'Publish F1–F8?', dueAt: '2026-09-28' }), {
        now: NOW,
        mode: 'mine',
      }),
      labels: ['Done', 'Stuck…', 'Hand back'],
      meta: 'due Mon 28 Sep · not started',
    },
    {
      name: 'decision, answered, nobody has it (plan)',
      card: buildTaskCard(
        task({ ownerName: '', slackUserId: undefined, kind: 'decision', status: 'queued', humanQuestion: 'Publish F1–F8?', dueAt: '2026-09-28' }),
        { now: NOW, mode: 'plan' },
      ),
      labels: ['I’ll take it', 'Details…'],
      meta: 'Nobody has it · due Mon 28 Sep',
    },
    {
      name: 'reopened (mine)',
      card: buildTaskCard(task({ status: 'queued', minutes: 30 }), { now: NOW, mode: 'mine', note: '_Reopened by <@U1>_' }),
      labels: ['Done', 'Stuck…', 'Hand back'],
      // The note says where it stands; "not started" would contradict it.
      meta: 'due tomorrow · ~30m',
    },
    {
      name: 'done',
      card: buildTaskCard(task({ status: 'done' }), { now: NOW, mode: 'mine', note: '_Done by <@U1> · Thu 24 Sep_' }),
      labels: ['Reopen'],
      meta: '_Done by <@U1> · Thu 24 Sep_',
    },
    {
      name: 'dropped',
      card: buildTaskCard(task({ status: 'dismissed' }), { now: NOW, mode: 'plan', note: '_Dropped by <@U1> — Reopen brings it back_' }),
      labels: ['Reopen'],
      meta: '_Dropped by <@U1> — Reopen brings it back_',
    },
  ]

  for (const state of states) {
    it(`${state.name}: ${state.labels.join(' · ')}`, () => {
      expectValidSlackBlocks(state.card)
      expect(labelsOf(state.card)).toEqual(state.labels)
      if (typeof state.meta === 'string') expect(metaOf(state.card)).toBe(state.meta)
      else expect(metaOf(state.card)).toMatch(state.meta)
    })
  }

  it('never shows more than three buttons, and at most one green one — leftmost', () => {
    for (const state of states) {
      const elements = actionsOf(state.card)
      expect(elements.length, state.name).toBeLessThanOrEqual(3)
      const primaries = elements.map((element: Block, index: number) => (element.style === 'primary' ? index : -1)).filter((index: number) => index >= 0)
      expect(primaries.length, state.name).toBeLessThanOrEqual(1)
      if (primaries.length) expect(primaries[0], state.name).toBe(0)
    }
  })

  it('is green only where the card is asking for it — never on an exhausted task or a finished one', () => {
    const green = (name: string) => actionsOf(states.find((state) => state.name === name)!.card).some((element: Block) => element.style === 'primary')
    expect(green('exhausted (asked twice)')).toBe(false)
    // Green is never for taking a colleague's work, even while they are away.
    expect(green('away cover')).toBe(false)
    expect(green('done')).toBe(false)
    expect(green('owned, plan view')).toBe(false)
    expect(green('owned, open (mine)')).toBe(true)
    expect(green('decision')).toBe(true)
  })

  it('uses the same action for the same label everywhere — the away cover included', () => {
    const byLabel = new Map<string, Set<string>>()
    for (const state of states) {
      for (const element of actionsOf(state.card)) {
        const ids = byLabel.get(element.text.text) || new Set<string>()
        ids.add(element.action_id)
        byLabel.set(element.text.text, ids)
      }
    }
    for (const [label, ids] of byLabel) expect(ids.size, label).toBe(1)
    expect([...byLabel.get('I’ll take it')!]).toEqual([MARQUETA_ACTION.taskTake])
    expect([...byLabel.get('Not me')!]).toEqual([MARKETING_ACTION.decline])
    expect([...byLabel.get('Details…')!]).toEqual([MARKETING_ACTION.details])
    expect([...byLabel.get('Answer…')!]).toEqual([MARKETING_ACTION.details])
    // Nothing the shared card draws is the legacy claim ("Take it over").
    for (const state of states) expect(actionIds(state.card), state.name).not.toContain(MARKETING_ACTION.claim)
  })

  it('marks only the away cover’s take as a cover, for the owner it was drawn for', () => {
    const cover = actionsOf(states.find((state) => state.name === 'away cover')!.card)[0]
    expect(decodeTaskCardValue(cover.value)).toEqual({ taskId: 't1', ownerName: 'Eric', status: 'queued', mode: 'plan', cover: true })
    for (const state of states.filter((item) => item.name !== 'away cover')) {
      for (const element of actionsOf(state.card)) expect(decodeTaskCardValue(element.value)?.cover, state.name).toBeUndefined()
    }
    // A cover names whose work it covers; a value without a name is not one.
    expect(decodeTaskCardValue(JSON.stringify({ t: 't1', o: '', m: 'plan', c: 1 }))?.cover).toBeUndefined()
  })

  it('offers Details…, not Answer…, on a decision that has no written question to answer', () => {
    const card = buildTaskCard(task({ ownerName: '', kind: 'decision', status: 'needsHuman', humanQuestion: '' }), { now: NOW, mode: 'plan' })
    expect(labelsOf(card)).toEqual(['Details…'])
    expect(actionsOf(card)[0].style).toBeUndefined()
  })

  it('treats a task somebody passed on as work looking for an owner, not a decision', () => {
    const passed = task({ ownerName: '', slackUserId: undefined, status: 'needsHuman', humanQuestion: 'Eric passed on this — who should pick it up?' })
    const card = buildTaskCard(passed, { now: NOW, mode: 'plan', note: '_<@U3> passed — still needs someone_' })
    expect(labelsOf(card)).toEqual(['I’ll take it', 'Details…'])
    expect(metaOf(card)).toBe('Nobody has it · due tomorrow')
    expect(sectionText(card)).toContain('_<@U3> passed — still needs someone_')
  })

  it('says it once after a take in the room’s view: the note names who, the meta line does not repeat it', () => {
    const card = buildTaskCard(task({ minutes: 30 }), { now: NOW, mode: 'plan', note: '_Taken by <@U1> · Thu 24 Sep_' })
    expect(sectionText(card)).toBe('*Write the pre-mortem post*\ndue tomorrow · ~30m\n_Taken by <@U1> · Thu 24 Sep_')
  })

  it('marks urgent and high priority work in words, not colour', () => {
    for (const priority of ['urgent', 'high']) {
      expect(metaOf(buildTaskCard(task({ priority, dueAt: '2026-09-28' }), { now: NOW, mode: 'mine' }))).toBe(
        '*Urgent* · due Mon 28 Sep · not started',
      )
    }
    expect(metaOf(buildTaskCard(task({ priority: 'normal', dueAt: '2026-09-28' }), { now: NOW, mode: 'mine' }))).toBe('due Mon 28 Sep · not started')
  })

  it('links the title to the task in the Studio — decisions to This week, whatever the record says', () => {
    const work = buildTaskCard(task({ targetView: 'outreach' }), { now: NOW, mode: 'mine', studioBaseUrl: BASE })
    expect(sectionText(work).split('\n')[0]).toBe(`*<${BASE}/studio/marketing?view=outreach&task=t1|Write the pre-mortem post>*`)
    const decision = buildTaskCard(task({ kind: 'decision', humanQuestion: 'Which?', targetView: 'outreach' }), {
      now: NOW,
      mode: 'plan',
      studioBaseUrl: BASE,
    })
    expect(sectionText(decision)).toContain('view=thisWeek&task=t1')
    // No base, or not a web link: a plain bold title, never a broken link.
    expect(sectionText(buildTaskCard(task(), { now: NOW, mode: 'mine', studioBaseUrl: 'javascript:alert(1)' })).split('\n')[0]).toBe(
      '*Write the pre-mortem post*',
    )
    // The title still reads back out of a linked card.
    expect(findTaskTitleInBlocks(buildTaskCard(task({ title: 'AT&T <5%' }), { now: NOW, mode: 'mine', studioBaseUrl: BASE }), 't1')).toBe('AT&T <5%')
  })

  it('carries the card’s mode in every button, readable by the legacy decoder too', () => {
    for (const mode of ['plan', 'mine'] as const) {
      for (const element of actionsOf(buildTaskCard(task({ status: 'working' }), { now: NOW, mode }))) {
        expect(decodeTaskCardValue(element.value)).toEqual({ taskId: 't1', ownerName: 'Juhan', status: 'working', mode })
        expect(decodeActionValue(element.value)).toEqual({ taskId: 't1', ownerName: 'Juhan', status: 'working' })
      }
    }
  })

  it('writes no ISO dates, no ISO weeks and no "(s)" in any state', () => {
    for (const state of states) {
      const shown = JSON.stringify(state.card.map((block) => [block.text?.text, ...(block.elements || []).map((e: Block) => e.text?.text)]))
      expect(shown, state.name).not.toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(shown, state.name).not.toMatch(/\bW\d\d\b/)
      expect(shown, state.name).not.toContain('(s)')
    }
  })

  it('survives hostile asks, away notes and notes', () => {
    const card = buildTaskCard(task({ ownerName: HOSTILE, title: HOSTILE }), {
      now: NOW,
      mode: 'plan',
      context: 'away',
      awayNote: HOSTILE,
      note: HOSTILE,
    })
    // What Slack renders; a button's value is data it never displays.
    const rendered = (blocks: Block[]) => JSON.stringify(blocks.map((block) => [block.text?.text, ...(block.elements || []).map((e: Block) => e.text)]))
    expectValidSlackBlocks(card)
    expect(rendered(card)).not.toContain('<!here>')
    expect(rendered(card)).not.toContain('<5%')
    const asked = buildTaskCard(task({ ownerName: '' }), { now: NOW, mode: 'plan', ask: { name: HOSTILE, slackUserId: 'not-an-id' } })
    expectValidSlackBlocks(asked)
    expect(rendered(asked)).not.toContain('<!here>')
  })

  it('redraws in the mode the pressed button carried', () => {
    const message = [
      { type: 'section', text: { type: 'mrkdwn', text: 'Monday plan' } },
      ...buildTaskCard(task({ ownerName: '', slackUserId: undefined }), { now: NOW, mode: 'plan' }),
    ]
    const taken = replaceCheckInTask(message, 't1', task(), { now: NOW, mode: 'plan', note: '_Taken by <@U1> · Thu 24 Sep_' })
    expect(taken[0]).toBe(message[0])
    expect(actionIds(taken)).toEqual([MARQUETA_ACTION.taskHandBack])
    // Without a mode: `mine`, which is what every card was before modes existed.
    expect(actionIds(replaceCheckInTask(message, 't1', task(), { now: NOW }))).toEqual([
      MARQUETA_ACTION.taskDone,
      MARQUETA_ACTION.taskStuck,
      MARQUETA_ACTION.taskHandBack,
    ])
  })
})

describe('taskStatusWords — one set of words for the Slack card and the Studio pill', () => {
  const words = (overrides: Partial<CheckInTask>) => taskStatusWords({ ownerName: 'Juhan', ...overrides })

  it('names every status the plan’s table names', () => {
    expect(words({ status: 'queued' })).toBe('Not started')
    expect(words({ status: 'working' })).toBe('In progress')
    expect(words({ status: 'working', ownerName: '' })).toBe('Marqueta working')
    expect(words({ status: 'blocked' })).toBe('Stuck')
    expect(words({ status: 'waiting' })).toBe('Waiting on someone')
    expect(words({ status: 'needsHuman', humanQuestion: 'Publish it?' })).toBe('Needs a decision')
    expect(words({ status: 'needsHuman', kind: 'decision' })).toBe('Needs a decision')
    expect(words({ status: 'needsHuman', ownerName: '', humanQuestion: 'Eric passed on this — who should pick it up?' })).toBe('Needs someone')
    expect(words({ status: 'dismissed' })).toBe('Dropped')
    expect(words({ status: 'done' })).toBe('Done')
    expect(words({ status: 'queued', ownerName: '' })).toBe('Nobody has it')
    expect(words({ status: 'scheduled' })).toBe('Scheduled')
  })

  it('calls a decision "Needs a decision" only while it waits on a person (needsHuman) — as the planner does', () => {
    // Answered: queued again with the question kept (answerMarketingTask, the Studio banner).
    expect(words({ status: 'queued', kind: 'decision', humanQuestion: 'Publish it?' })).toBe('Not started')
    expect(words({ status: 'queued', kind: 'decision', humanQuestion: 'Publish it?', ownerName: '' })).toBe('Nobody has it')
    expect(words({ status: 'working', kind: 'decision' })).toBe('In progress')
    expect(words({ status: 'blocked', kind: 'decision' })).toBe('Stuck')
    expect(words({ status: 'done', kind: 'decision' })).toBe('Done')
  })

  it('reads an unknown status as not started, the way the board does, and never echoes it', () => {
    expect(words({ status: '<!here>' })).toBe('Not started')
    expect(words({ status: undefined, ownerName: '' })).toBe('Nobody has it')
  })

  it('gives the Studio a word for every status it can select', () => {
    for (const status of MARKETING_OPERATION_STATUSES) expect(TASK_STATUS_WORDS[status], status).toBeTruthy()
  })
})
