import { describe, expect, it } from 'vitest'

import {
  checkInFallbackText,
  checkInAcknowledgement,
  buildCheckInTaskBlocks,
  buildTaskStuckView,
  buildWeeklyCheckInBlocks,
  findTaskTitleInBlocks,
  groupCheckInTasks,
  inCheckInScope,
  isDecisionTask,
  isSlipping,
  MAX_CHECK_IN_BLOCKS,
  readTaskStuckSubmission,
  replaceCheckInTask,
  type CheckInFollowUp,
  type CheckInGroup,
  type CheckInTask,
} from '@/lib/marketing/weeklyCheckIn'
import {
  checkInTaskActionsBlockId,
  checkInTaskBlockId,
  encodeContactRef,
  encodeTaskStuckMetadata,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_BLOCKER_INPUT,
  TASK_STUCK_CALLBACK,
  type MarquetaActionId,
} from '@/lib/marketing/marquetaActions'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { decodeActionValue } from '@/lib/marketing/slackDelegation'
import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

// Thursday. ISO week Mon 21 – Sun 27 Sep; next week ends Sun 4 Oct.
const NOW = new Date('2026-09-24T14:00:00Z')
const HANDLE = '<@UBOT>'
const STUDIO = 'https://www.goinvo.com/studio/marketing?view=thisWeek'
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
      expect(checkInFallbackText(groups)).toBe("Thursday check-in — <@U3> <@U1>: here's what's on your list.")

      const blocks = buildWeeklyCheckInBlocks({ weekLabel: 'Week of 21 Sep', groups, unowned: [], pulse: null, handle: HANDLE, now: NOW })
      expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
      const serialised = JSON.stringify(blocks)
      expect(count(serialised, '<@U1>')).toBe(1)
      expect(count(serialised, '<@U3>')).toBe(1)
      // Juhan's line is followed by Juhan's task only.
      const juhanAt = blocks.findIndex((block) => String(block.text?.text || '').startsWith('<@U1>'))
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

  it('offers Done · Stuck · Hand back on open work', () => {
    for (const status of ['queued', 'working', 'scheduled', 'waiting', 'needsHuman']) {
      expect(actionIds(buildCheckInTaskBlocks(task({ status }), { now: NOW })), status).toEqual([
        MARQUETA_ACTION.taskDone,
        MARQUETA_ACTION.taskStuck,
        MARQUETA_ACTION.taskHandBack,
      ])
    }
    const done = actionsOf(buildCheckInTaskBlocks(task(), { now: NOW }))[0]
    expect(done.style).toBe('primary')
  })

  it('offers Unstuck · Done · Hand back on stuck work', () => {
    const blocks = buildCheckInTaskBlocks(task({ status: 'blocked', updatedAt: '2026-09-23T00:00:00Z' }), { now: NOW })
    expect(actionIds(blocks)).toEqual([MARQUETA_ACTION.taskProgress, MARQUETA_ACTION.taskDone, MARQUETA_ACTION.taskHandBack])
    expect(actionsOf(blocks)[0].text.text).toBe('Unstuck')
  })

  it('asks whether slipping work is still worth doing', () => {
    const blocks = buildCheckInTaskBlocks(task({ dueAt: '2026-09-01T12:00:00Z' }), { now: NOW })
    expect(sectionText(blocks)).toContain('_Still worth doing?_')
    expect(actionIds(blocks)).toEqual([
      MARQUETA_ACTION.taskSnooze,
      MARQUETA_ACTION.taskDrop,
      MARQUETA_ACTION.taskDone,
      MARQUETA_ACTION.taskHandBack,
    ])
    expect(actionsOf(blocks).map((element: Block) => element.text.text)).toEqual(['Keep — next week', 'Drop it', 'Done', 'Hand back'])
  })

  it('never offers Drop where the board would refuse it (work in progress cannot be dismissed)', () => {
    const blocks = buildCheckInTaskBlocks(task({ status: 'working', dueAt: '2026-09-01T12:00:00Z' }), { now: NOW })
    expect(actionIds(blocks)).not.toContain(MARQUETA_ACTION.taskDrop)
    expect(actionIds(blocks)).toContain(MARQUETA_ACTION.taskSnooze)
  })

  it('offers only Reopen on finished or dropped work', () => {
    const done = buildCheckInTaskBlocks(task({ status: 'done' }), { now: NOW })
    const dropped = buildCheckInTaskBlocks(task({ status: 'dismissed' }), { now: NOW })
    expect(actionIds(done)).toEqual([MARQUETA_ACTION.taskReopen])
    expect(actionIds(dropped)).toEqual([MARQUETA_ACTION.taskReopen])
    expect(sectionText(done)).toMatch(/^:white_check_mark: \*Write the pre-mortem post\*\ndone$/)
    expect(sectionText(dropped)).toMatch(/^~\*Write the pre-mortem post\*~\ndropped$/)
  })

  it('offers I will take it once a task has been handed back', () => {
    const blocks = buildCheckInTaskBlocks(task({ ownerName: undefined, slackUserId: undefined }), { now: NOW })
    expect(actionIds(blocks)).toEqual([MARQUETA_ACTION.taskTake])
    expect(sectionText(blocks)).toContain('nobody has it')
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
  const cases: Array<{ name: string; press: MarquetaActionId; before: CheckInTask; after: CheckInTask; reverse: MarquetaActionId }> = [
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
      name: 'Hand back (slipping) ⇄ Take',
      press: MARQUETA_ACTION.taskHandBack,
      before: slipping,
      after: { ...slipping, ownerName: undefined, slackUserId: undefined },
      reverse: MARQUETA_ACTION.taskTake,
    },
    { name: 'Take ⇄ Hand back', press: MARQUETA_ACTION.taskTake, before: unowned, after: { ...unowned, ownerName: 'Juhan', slackUserId: 'U1' }, reverse: MARQUETA_ACTION.taskHandBack },
    {
      name: 'Take (slipping) ⇄ Hand back',
      press: MARQUETA_ACTION.taskTake,
      before: { ...slipping, ownerName: undefined },
      after: { ...slipping, ownerName: 'Juhan' },
      reverse: MARQUETA_ACTION.taskHandBack,
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
      expect(actionIds(buildCheckInTaskBlocks(item.before, { now: NOW }))).toContain(item.press)
      const redrawn = buildCheckInTaskBlocks(item.after, { now: NOW })
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
    weekLabel: 'Week of 21 Sep',
    unowned: [] as CheckInTask[],
    pulse: pulse(3),
    handle: HANDLE,
    studioUrl: STUDIO,
    now: NOW,
  }

  it('reads header, week, outreach, then one list per person, then the way into the plan', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 2, 1)] })
    expectValidSlackBlocks(blocks)
    expect(blocks[0]).toEqual({ type: 'header', text: { type: 'plain_text', text: 'Thursday check-in', emoji: true } })
    expect(blocks[1].elements[0].text).toBe('Week of 21 Sep')
    expect(blocks[2].text.text).toBe('Outreach this week: 3 touches (1 person).')
    expect(blocks[3].text.text).toBe("<@U1> — here's what's on your list")
    expect(taskBlockCount(blocks)).toBe(2)
    expect(followUpLineCount(blocks)).toBe(1)
    const last = blocks[blocks.length - 1]
    expect(last.elements[0]).toMatchObject({ url: STUDIO, text: { text: 'Open the plan' } })
  })

  it('gives follow-ups Prep and Log buttons carrying the contact ref, and no Done', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 0, 1)] })
    const actions = blocks.find((block) => block.type === 'actions' && block.elements.some((e: Block) => e.action_id === MARQUETA_ACTION.prepCall))!
    expect(actions.elements.map((element: Block) => element.action_id)).toEqual([MARQUETA_ACTION.prepCall, MARQUETA_ACTION.logCall])
    expect(actions.elements.map((element: Block) => element.text.text)).toEqual(['Prep', 'Log how it went'])
    expect(actions.elements[0].value).toBe(followUp('Juhan-0').contactRef)
  })

  it('never shows more than three tasks for a person, counting the rest', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups: [group('Juhan', 'U1', 5, 0, 2)] })
    expect(taskBlockCount(blocks)).toBe(3)
    expect(JSON.stringify(blocks)).toContain(`+4 more <${STUDIO}|in the Studio>`)
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

  it('says plainly when nothing is logged, and tells people how to fix that', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, pulse: pulse(0), groups: [group('Juhan', 'U1', 1)] })
    const line = blocks[2].text.text
    expect(line).toContain('Outreach this week: no outreach logged yet.')
    expect(line).toContain("If you called people who aren't on file, tell me <@UBOT> `called Sam Rivera at Acme`")
    expect(line).toContain('<@UBOT> `prep Sam Rivera` before you call')
    expect(line).not.toContain('@Marqueta')
  })

  it('never renders the per-person touch counts (that is a leaderboard)', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, pulse: pulse(4), groups: [group('Juhan', 'U1', 1)] })
    expect(JSON.stringify(blocks)).not.toContain('Zebedee')
  })

  it('names at most five unowned tasks, then says how many more', () => {
    const unowned = Array.from({ length: 7 }, (_, index) => task({ _id: `u${index}`, ownerName: '', title: `Loose end ${index} & <co>` }))
    const blocks = buildWeeklyCheckInBlocks({ ...base, unowned, groups: [group('Juhan', 'U1', 1)] })
    const line = blocks.find((block) => block.type === 'context' && String(block.elements[0].text).startsWith('Nobody has taken'))!
    expect(line.elements[0].text).toContain('Loose end 4 &amp; &lt;co&gt;')
    expect(line.elements[0].text).not.toContain('Loose end 5')
    expect(line.elements[0].text).toMatch(/…and 2 more$/)
  })

  it('stays within thirty blocks by giving up follow-up lines first', () => {
    // 4 fixed + 2 × (1 + 3 tasks × 2 + 3 follow-ups × 2) + unowned = 31: one follow-up must go.
    const blocks = buildWeeklyCheckInBlocks({
      ...base,
      unowned: [task({ _id: 'u', ownerName: '' })],
      groups: [group('Juhan', 'U1', 3, 3), group('Shirley', 'U2', 3, 3)],
    })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    expect(blocks).toHaveLength(30)
    expect(taskBlockCount(blocks)).toBe(6)
    expect(followUpLineCount(blocks)).toBe(5)
    expect(JSON.stringify(blocks)).toContain('1 more follow-up — ask <@UBOT> `my calls`')
  })

  it('then gives up tasks, but never a person', () => {
    const groups = Array.from({ length: 8 }, (_, index) => group(`Person ${index}`, `U10${index}`, 3, 3))
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    expect(followUpLineCount(blocks)).toBe(0)
    expect(taskBlockCount(blocks)).toBeLessThan(24)
    const serialised = JSON.stringify(blocks)
    for (let index = 0; index < 8; index += 1) expect(count(serialised, `<@U10${index}>`)).toBe(1)
  })

  it('still mentions everyone once when there are more people than lines', () => {
    const groups = Array.from({ length: 40 }, (_, index) => group(`Person ${index}`, `U${String(index).padStart(3, '0')}`, 5, 5, 3))
    const blocks = buildWeeklyCheckInBlocks({ ...base, groups, unowned: [task({ _id: 'u', ownerName: '' })] })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    const serialised = JSON.stringify(blocks)
    for (let index = 0; index < 40; index += 1) expect(count(serialised, `<@U${String(index).padStart(3, '0')}>`)).toBe(1)
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
      handle: HANDLE,
      groups: [hostileGroup],
      unowned: [task({ _id: 'hu', ownerName: '', title: HOSTILE })],
    })
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    const texts = JSON.stringify(blocks.flatMap((block) => [block.text?.text, ...(block.elements || []).map((e: Block) => e.text)]))
    expect(texts).not.toContain('<!here>')
    expect(texts).not.toContain('<5%')
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

  it('ignores a studio url that is not a web link', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, studioUrl: 'javascript:alert(1)', groups: [group('Juhan', 'U1', 1, 0, 2)] })
    expectValidSlackBlocks(blocks)
    expect(JSON.stringify(blocks)).not.toContain('javascript:')
    expect(JSON.stringify(blocks)).toContain('+2 more in the Studio')
  })

  it('has nothing to say when there is nothing at all', () => {
    expect(buildWeeklyCheckInBlocks({ ...base, pulse: null, groups: [] })).toEqual([])
  })

  it('still reports outreach when nobody has anything due', () => {
    const blocks = buildWeeklyCheckInBlocks({ ...base, studioUrl: undefined, groups: [] })
    expectValidSlackBlocks(blocks)
    expect(JSON.stringify(blocks)).toContain("Nothing is on anyone's list")
  })
})

describe('checkInFallbackText', () => {
  it('puts every mention in the notification text, once each', () => {
    expect(
      checkInFallbackText([
        { ownerName: 'Juhan', slackUserId: 'U1', tasks: [], hidden: 0, followUps: [] },
        { ownerName: 'Juhan S', slackUserId: 'U1', tasks: [], hidden: 0, followUps: [] },
        { ownerName: 'Jen & <Co>', tasks: [], hidden: 0, followUps: [] },
      ]),
    ).toBe("Thursday check-in — <@U1> Jen &amp; &lt;Co&gt;: here's what's on your list.")
    expect(checkInFallbackText([])).toBe('Thursday check-in.')
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
      weekLabel: 'Week of 21 Sep',
      groups,
      unowned: [task({ _id: 'u', ownerName: '' })],
      pulse: pulse(2),
      handle: HANDLE,
      studioUrl: STUDIO,
      now: NOW,
    })

  it('redraws exactly one task and leaves every other block byte-identical', () => {
    const blocks = message()
    const before = JSON.stringify(blocks)
    const note = checkInAcknowledgement(MARQUETA_ACTION.taskDone, '<@U1>', 'Second')
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
    expect(section.text.text).toContain('<@U1> marked *Second* done.')
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
    expect(view.title.text).toBe("What's in the way?")
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

describe('checkInAcknowledgement', () => {
  it('says who did what to which task, for every task action', () => {
    const actions = [
      MARQUETA_ACTION.taskDone,
      MARQUETA_ACTION.taskProgress,
      MARQUETA_ACTION.taskStuck,
      MARQUETA_ACTION.taskHandBack,
      MARQUETA_ACTION.taskReopen,
      MARQUETA_ACTION.taskTake,
      MARQUETA_ACTION.taskDrop,
      MARQUETA_ACTION.taskSnooze,
    ]
    const lines = actions.map((action) => checkInAcknowledgement(action, '<@U1>', 'AT&T intro'))
    expect(new Set(lines).size).toBe(actions.length)
    for (const line of lines) {
      expect(line.startsWith('<@U1> ')).toBe(true)
      expect(line).toContain('*AT&amp;T intro*')
    }
    expect(lines[0]).toBe('<@U1> marked *AT&amp;T intro* done.')
    expect(lines[6]).toBe('<@U1> dropped *AT&amp;T intro*. Reopen brings it back.')
  })

  it('escapes anything that is not a mention', () => {
    expect(checkInAcknowledgement(MARQUETA_ACTION.taskTake, '<!here>', 'x')).toBe('Someone took *x*.')
    expect(checkInAcknowledgement(MARQUETA_ACTION.taskTake, 'Jen & Co', '<!channel>')).toBe('Jen &amp; Co took *&lt;!channel&gt;*.')
  })
})
