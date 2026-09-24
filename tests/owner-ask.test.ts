import { describe, expect, it } from 'vitest'

import {
  askMentionsText,
  buildAskBlocks,
  describeAsk,
  proposeOwnerAsks,
  type AskTask,
  type AskTeamMember,
  type OwnerAsk,
} from '@/lib/marketing/ownerAsk'
import type { TeamMemberAvailability } from '@/lib/marketing/availability'
import { expectValidSlackBlocks } from './support/slackBlocks'

const TEAM: AskTeamMember[] = [
  { name: 'Juhan', slackUserId: 'U1' },
  { name: 'Shirley', slackUserId: 'U2' },
  { name: 'Eric', slackUserId: 'U3' },
]

const task = (overrides: Partial<AskTask> = {}): AskTask => ({
  _id: 't1',
  title: 'Write the pre-mortem post',
  minutes: 30,
  ...overrides,
})

const propose = (
  tasks: AskTask[],
  overrides: Partial<Parameters<typeof proposeOwnerAsks>[0]> = {},
) =>
  proposeOwnerAsks({
    tasks,
    team: TEAM,
    availability: [],
    ownedMinutesByName: {},
    dateKey: '2026-09-24',
    defaultHours: 4,
    ...overrides,
  })

// Words that make a claim about a colleague's week. None may appear in an ask.
const CAPACITY_CLAIM = /free time|free this|capacity|availab|busy|hours left|spare|room this week|most time/i

describe('proposeOwnerAsks', () => {
  it("asks the plan's suggested owner when they have room", () => {
    const { asks } = propose([task({ suggestedOwner: 'shirley' })])
    expect(asks).toEqual([{ taskId: 't1', name: 'Shirley', slackUserId: 'U2', reason: 'suggested' }])
  })

  it('asks whoever has the most room when the suggested owner is full, ties broken by name', () => {
    const { asks } = propose([task({ suggestedOwner: 'Shirley' })], { ownedMinutesByName: { Shirley: 230 } })
    expect(asks).toEqual([{ taskId: 't1', name: 'Eric', slackUserId: 'U3', reason: 'open' }])
  })

  it('reads owned minutes case-insensitively', () => {
    const { asks } = propose([task()], { ownedMinutesByName: { eric: 200, JUHAN: 100 } })
    expect(asks[0].name).toBe('Shirley')
  })

  it('never asks somebody who is away that day', () => {
    const availability: TeamMemberAvailability[] = [
      { ownerName: 'Eric', slackUserId: 'U3', status: 'away', from: '2026-09-21', until: '2026-09-30' },
      { ownerName: 'Juhan', slackUserId: 'U1', status: 'away', from: '2026-09-24', until: '2026-09-24' },
    ]
    const { asks } = propose([task({ suggestedOwner: 'Eric' })], { availability })
    expect(asks).toEqual([{ taskId: 't1', name: 'Shirley', slackUserId: 'U2', reason: 'open' }])
  })

  it('uses a reduced week, and never asks past anybody’s hours', () => {
    const availability: TeamMemberAvailability[] = [{ ownerName: 'Juhan', status: 'available', weeklyHours: 1 }]
    const { asks } = propose([task({ _id: 'a', minutes: 40 }), task({ _id: 'b', minutes: 40 })], {
      team: [TEAM[0]],
      availability,
    })
    expect(asks.map((ask) => ask.taskId)).toEqual(['a'])
  })

  it('spreads work as load accumulates within the round', () => {
    const { asks } = propose(
      [task({ _id: 'a', minutes: 120 }), task({ _id: 'b', minutes: 120 }), task({ _id: 'c', minutes: 120 })],
      { team: [TEAM[0], TEAM[1]] },
    )
    expect(asks.map((ask) => [ask.taskId, ask.name])).toEqual([
      ['a', 'Juhan'],
      ['b', 'Shirley'],
      ['c', 'Juhan'],
    ])
  })

  it('asks nobody more than twice in a round, unless told otherwise', () => {
    const tasks = Array.from({ length: 5 }, (_, index) => task({ _id: `t${index}`, minutes: 10 }))
    expect(propose(tasks, { team: [TEAM[0]] }).asks).toHaveLength(2)
    expect(propose(tasks, { team: [TEAM[0]], maxAsksPerPerson: 3 }).asks).toHaveLength(3)
  })

  it('never asks the same person about the same task twice', () => {
    const { asks } = propose([task({ suggestedOwner: 'Eric', askedSlackUserIds: ['U3'] })])
    expect(asks[0].slackUserId).not.toBe('U3')
    expect(asks[0].reason).toBe('open')
  })

  it('marks a task exhausted after two different people have been asked', () => {
    const result = propose([task({ askedSlackUserIds: ['U1', 'U3'] }), task({ _id: 't2' })])
    expect(result.exhausted).toEqual(['t1'])
    expect(result.asks.map((ask) => ask.taskId)).toEqual(['t2'])
  })

  it('counts people, not entries: a duplicated ask record is still one person', () => {
    const result = propose([task({ askedSlackUserIds: ['U1', 'U1'] })])
    expect(result.exhausted).toEqual([])
    expect(result.asks).toHaveLength(1)
    expect(result.asks[0].slackUserId).not.toBe('U1')
  })

  it('leaves owned work and decisions alone', () => {
    const result = propose([
      task({ _id: 'owned', ownerName: 'Juhan' }),
      task({ _id: 'decision', kind: 'decision' }),
      task({ _id: 'decision2', kind: 'decision', askedSlackUserIds: ['U1', 'U2'] }),
    ])
    expect(result).toEqual({ asks: [], exhausted: [] })
  })

  it('never asks somebody with no hours this week, even about an unestimated task', () => {
    const availability: TeamMemberAvailability[] = [{ ownerName: 'Juhan', status: 'available', weeklyHours: 0 }]
    const { asks } = propose([task({ minutes: 0 })], { team: [TEAM[0]], availability })
    expect(asks).toEqual([])
  })

  it('is deterministic whatever order the team arrives in, and ignores duplicate people', () => {
    const tasks = [task({ _id: 'a' }), task({ _id: 'b', suggestedOwner: 'Juhan' }), task({ _id: 'c' }), task({ _id: 'a' })]
    const first = propose(tasks)
    const shuffled = propose(tasks, { team: [TEAM[2], { name: 'Juhan again', slackUserId: 'U1' }, ...TEAM].reverse() })
    expect(propose(tasks)).toEqual(first)
    expect(shuffled.asks.map((ask) => [ask.taskId, ask.slackUserId])).toEqual(first.asks.map((ask) => [ask.taskId, ask.slackUserId]))
    expect(first.asks.map((ask) => ask.taskId)).toEqual(['a', 'b', 'c'])
  })

  it('asks nobody when there is nobody mapped', () => {
    expect(propose([task()], { team: [{ name: 'Ghost', slackUserId: '' }] })).toEqual({ asks: [], exhausted: [] })
  })
})

describe('describeAsk', () => {
  const ask = (reason: OwnerAsk['reason']): OwnerAsk => ({ taskId: 't1', name: 'Shirley', slackUserId: 'U2', reason })

  it('says who, what it costs, and — only when true — that the plan had them in mind', () => {
    expect(describeAsk(ask('suggested'), 30)).toBe('<@U2> could you take this one? (~30m) The plan had you in mind.')
    expect(describeAsk(ask('open'), 30)).toBe('<@U2> could you take this one? (~30m)')
    expect(describeAsk(ask('open'), 90)).toBe('<@U2> could you take this one? (~1h 30m)')
    expect(describeAsk(ask('open'), 0)).toBe('<@U2> could you take this one?')
  })

  it('makes no claim about anybody’s capacity', () => {
    for (const reason of ['suggested', 'open'] as const) {
      expect(describeAsk(ask(reason), 45)).not.toMatch(CAPACITY_CLAIM)
    }
  })

  it('falls back to an escaped name without a usable Slack id', () => {
    expect(describeAsk({ taskId: 't', name: 'Jen & <Co>', slackUserId: 'nope', reason: 'open' }, 15)).toBe(
      'Jen &amp; &lt;Co&gt; could you take this one? (~15m)',
    )
  })
})

describe('buildAskBlocks', () => {
  it('has nothing to say when there is nothing to ask', () => {
    expect(buildAskBlocks([])).toEqual([])
  })

  it('is one section: a heading and a line per ask', () => {
    const blocks = buildAskBlocks([
      { taskId: 'a', name: 'Shirley', slackUserId: 'U2', reason: 'suggested', title: 'Call AT&T', minutes: 30 },
      { taskId: 'b', name: 'Eric', slackUserId: 'U3', reason: 'open', title: 'Draft the <5% post', minutes: 60 },
    ])
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text.text).toBe(
      '*Could you take these?*\n' +
        '• *Call AT&amp;T* — <@U2> could you take this one? (~30m) The plan had you in mind.\n' +
        '• *Draft the &lt;5% post* — <@U3> could you take this one? (~1h)',
    )
    expect(blocks[0].text.text).not.toMatch(CAPACITY_CLAIM)
  })

  it('survives hostile and huge values', () => {
    const hostile = '<!here> & <5% of pilots > ' + 'x'.repeat(5000)
    const blocks = buildAskBlocks(
      Array.from({ length: 40 }, (_, index) => ({
        taskId: `t${index}`,
        name: hostile,
        slackUserId: index % 2 ? `U${index}` : 'bad id',
        reason: 'open' as const,
        title: hostile,
        minutes: 30,
      })),
    )
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text.text).not.toContain('<!here>')
    expect(blocks[0].text.text).not.toContain('<5%')
  })
})

describe('askMentionsText', () => {
  const ask = (slackUserId: string, name = 'X'): OwnerAsk => ({ taskId: 't', name, slackUserId, reason: 'open' })

  it('puts the mentions in the notification text, once each', () => {
    expect(askMentionsText([])).toBe('')
    expect(askMentionsText([ask('U1')])).toBe('<@U1> — could you take a task?')
    expect(askMentionsText([ask('U1'), ask('U1')])).toBe('<@U1> — could you take a couple of tasks?')
    expect(askMentionsText([ask('U1'), ask('U1'), ask('U1')])).toBe('<@U1> — could you take 3 tasks?')
    expect(askMentionsText([ask('U1'), ask('U2'), ask('U1')])).toBe('<@U1> <@U2> — could you take a task each?')
  })

  it('never lets a name smuggle markup into the notification', () => {
    expect(askMentionsText([ask('', '<!channel>')])).toBe('&lt;!channel&gt; — could you take a task?')
  })
})
