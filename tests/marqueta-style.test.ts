/**
 * Marqueta's design system (`marquetaStyle.ts`): the formats every message
 * uses, and a guard that keeps button labels in one place.
 *
 * The guard exists because the vocabulary drifted before: "I'll take it" was a
 * take in one message and a take-OVER in another, "Hand it back" and "Not me
 * this week" did the same write under two names, and the plan's link was
 * called three different things. A label is learned once and pressed on
 * reflex, so a label typed by hand anywhere but `LABEL` fails here — as does
 * any retired label, wherever it reappears.
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import {
  actionsRow,
  addContactLabel,
  askMarqueta,
  countLabel,
  errorLine,
  formatEffort,
  formatSlackDay,
  formatSlackRange,
  LABEL,
  MARQUETA_IDENTITY,
  openViewButton,
  replaceBlocksByPrefix,
  RETIRED_LABELS,
  slackDayKey,
  slackReadable,
  STATE_EMOJI,
  stateNote,
  VIEW_TITLE,
  weekOfLabel,
  type StateNoteKind,
} from '@/lib/marketing/marquetaStyle'
import { MARKETING_TOOL_VIEWS } from '@/sanity/components/marketing/domain'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Thursday 24 Sep 2026, 10am in Boston. */
const NOW = new Date('2026-09-24T14:00:00Z')

describe('formatSlackDay', () => {
  it('writes "Mon 21 Sep", with the year only when it is not this year’s', () => {
    expect(formatSlackDay('2026-09-21', NOW)).toBe('Mon 21 Sep')
    expect(formatSlackDay('2027-01-11', NOW)).toBe('Mon 11 Jan 2027')
    expect(formatSlackDay('2025-12-31', NOW)).toBe('Wed 31 Dec 2025')
    expect(formatSlackDay(new Date('2026-09-25T16:00:00Z'), NOW)).toBe('Fri 25 Sep')
  })

  it('reads an instant on the studio’s calendar (America/New_York), whatever machine renders it', () => {
    // 02:00 UTC on Friday is Thursday evening in Boston.
    expect(formatSlackDay('2026-09-25T02:00:00Z', NOW)).toBe('Thu 24 Sep')
    // Daylight saving has ended by December: 04:30 UTC is still the day before.
    expect(formatSlackDay('2026-12-01T04:30:00Z', NOW)).toBe('Mon 30 Nov')
  })

  it('crosses the year the way Boston does, not the way UTC does', () => {
    const newYearsEveInBoston = new Date('2027-01-01T03:00:00Z')
    expect(slackDayKey(newYearsEveInBoston)).toBe('2026-12-31')
    expect(formatSlackDay(newYearsEveInBoston, NOW)).toBe('Thu 31 Dec')
    // Said on New Year's Eve in Boston, the 1st of January is next year's.
    expect(formatSlackDay('2027-01-01', newYearsEveInBoston)).toBe('Fri 1 Jan 2027')
    expect(formatSlackDay('2026-12-30', newYearsEveInBoston)).toBe('Wed 30 Dec')
  })

  it('never shifts a calendar date, and says nothing for no date', () => {
    expect(slackDayKey('2026-09-21')).toBe('2026-09-21')
    expect(formatSlackDay('', NOW)).toBe('')
    expect(formatSlackDay('soon', NOW)).toBe('')
    expect(formatSlackDay('2026-02-31', NOW)).toBe('')
  })
})

describe('formatSlackRange', () => {
  it('writes both ends, and the month once when they share it', () => {
    expect(formatSlackRange('2026-09-28', '2026-10-04', NOW)).toBe('Mon 28 Sep – Sun 4 Oct')
    expect(formatSlackRange('2026-09-21', '2026-09-27', NOW)).toBe('Mon 21 – Sun 27 Sep')
    expect(formatSlackRange('2026-09-25', '2026-09-25', NOW)).toBe('Fri 25 Sep')
  })

  it('names the year where it is not this one', () => {
    expect(formatSlackRange('2026-12-28', '2027-01-03', NOW)).toBe('Mon 28 Dec – Sun 3 Jan 2027')
    expect(formatSlackRange('2027-01-04', '2027-01-08', NOW)).toBe('Mon 4 – Fri 8 Jan 2027')
  })

  it('handles an open end', () => {
    expect(formatSlackRange('2026-09-28', '', NOW)).toBe('from Mon 28 Sep')
    expect(formatSlackRange('', '2026-10-02', NOW)).toBe('until Fri 2 Oct')
    expect(formatSlackRange('', '', NOW)).toBe('')
  })
})

describe('formatEffort, weekOfLabel, countLabel', () => {
  it('says an estimate is an estimate', () => {
    expect(formatEffort(30)).toBe('~30m')
    expect(formatEffort(90)).toBe('~1h 30m')
    expect(formatEffort(120)).toBe('~2h')
    expect(formatEffort(0)).toBe('')
    expect(formatEffort(Number.NaN)).toBe('')
    expect(formatEffort(-5)).toBe('')
  })

  it('names the week by its Monday, never as "2026-W39"', () => {
    expect(weekOfLabel('2026-09-21', NOW)).toBe('Week of Mon 21 Sep')
    expect(weekOfLabel('', NOW)).toBe('This week')
  })

  it('counts in words, never "(s)"', () => {
    expect(countLabel(1, 'task')).toBe('1 task')
    expect(countLabel(6, 'task')).toBe('6 tasks')
    expect(countLabel(0, 'follow-up')).toBe('0 follow-ups')
    expect(countLabel(2, 'person', 'people')).toBe('2 people')
  })
})

describe('slackReadable', () => {
  it('rewrites prose recorded for a log into Slack’s formats', () => {
    expect(slackReadable('4 item(s) planned for 2026-W39.', NOW)).toBe('4 items planned for the week of Mon 21 Sep.')
    expect(slackReadable('digest posted with 1 task(s).', NOW)).toBe('digest posted with 1 task.')
    expect(slackReadable('goinvo.com expires in 5 day(s) (2026-09-26).', NOW)).toBe('goinvo.com expires in 5 days (Sat 26 Sep).')
    // Week 1 of 2027 starts in 2026; the year shows only when it is not this one.
    expect(slackReadable('ran for 2027-W01', NOW)).toBe('ran for the week of Mon 4 Jan 2027')
    expect(slackReadable('stamped 2026-09-25T02:00:00Z', NOW)).toBe('stamped Thu 24 Sep')
  })

  it('leaves anything that is not a real week or day exactly as it was', () => {
    expect(slackReadable('week 2026-W60, day 2026-02-31, v1.2026-09', NOW)).toBe('week 2026-W60, day 2026-02-31, v1.2026-09')
    expect(slackReadable('', NOW)).toBe('')
  })
})

describe('the Studio tabs Slack links to', () => {
  it('are named exactly as the Studio names them', () => {
    for (const [id, title] of Object.entries(VIEW_TITLE)) {
      expect(MARKETING_TOOL_VIEWS.find((view) => view.id === id)?.title, id).toBe(title)
    }
  })

  it('link as "Open <tab>", and never as a button Slack would refuse', () => {
    expect(openViewButton('thisWeek', 'https://www.goinvo.com/studio/marketing?view=thisWeek')).toEqual({
      type: 'button',
      text: { type: 'plain_text', text: 'Open This week', emoji: true },
      url: 'https://www.goinvo.com/studio/marketing?view=thisWeek',
    })
    expect(openViewButton('outreach', '')).toBeNull()
    expect(openViewButton('calendar', 'javascript:alert(1)')).toBeNull()
  })

  it('leave no empty actions block behind when the link cannot be made', () => {
    expect(actionsRow([openViewButton('thisWeek', ''), null, false])).toEqual([])
    const row = actionsRow([openViewButton('calendar', 'https://x.test/studio'), undefined], 'mq_footer')
    expectValidSlackBlocks(row)
    expect(row).toEqual([{ type: 'actions', block_id: 'mq_footer', elements: [expect.objectContaining({ text: expect.objectContaining({ text: 'Open Calendar' }) })] }])
  })
})

describe('stateNote', () => {
  const who = '<@U1>'
  const table: Record<StateNoteKind, string> = {
    done: '_Done by <@U1> · Thu 24 Sep_',
    taken: '_Taken by <@U1> · Thu 24 Sep_',
    handedBack: '_Handed back by <@U1> — anyone can take it_',
    dropped: '_Dropped by <@U1> — Reopen brings it back_',
    snoozed: '_Moved to next week by <@U1>_',
    stuck: '_Stuck — <@U1> added what’s in the way_',
    unstuck: '_Unstuck by <@U1>_',
    reopened: '_Reopened by <@U1>_',
    passed: '_<@U1> passed — still needs someone_',
    answered: '_Answered by <@U1> · Thu 24 Sep_',
  }

  it('says who did what, and when where it matters — with no pronouns', () => {
    for (const [kind, note] of Object.entries(table)) expect(stateNote(kind as StateNoteKind, who, NOW), kind).toBe(note)
    for (const note of Object.values(table)) expect(note).not.toMatch(/\b(he|she|him|her|his|hers)\b/i)
  })

  it('keeps a mention, and neutralises anything else a display name could smuggle in', () => {
    expect(stateNote('done', '<!here>', NOW)).toBe('_Done by Someone · Thu 24 Sep_')
    // Read as Slack delivered it: `<Co>` is a token, and only its text survives.
    expect(stateNote('done', 'Jen & <Co>', NOW)).toBe('_Done by Jen &amp; Co · Thu 24 Sep_')
    expect(stateNote('done', 'Jen &amp; &lt;Co&gt;', NOW)).toBe('_Done by Jen &amp; &lt;Co&gt; · Thu 24 Sep_')
    // Underscores and asterisks would end the italics early.
    expect(stateNote('unstuck', 'jen_x*', NOW)).toBe('_Unstuck by jen x_')
  })
})

describe('errorLine and askMarqueta', () => {
  it('says what failed, that nothing changed, and where to do it instead', () => {
    expect(errorLine('update that task', 'Open This week.')).toBe('Couldn’t update that task — nothing changed. Open This week.')
    expect(errorLine('log that', 'Use the Outreach tab')).toBe('Couldn’t log that — nothing changed. Use the Outreach tab.')
    expect(errorLine('save that', '')).toBe('Couldn’t save that — nothing changed.')
  })

  it('shows how to ask as a phrase people can copy — never "@Marqueta", never "DM me"', () => {
    expect(askMarqueta('my calls')).toBe('`Marqueta, my calls`')
    expect(askMarqueta(' prep `Jane`  Doe ')).toBe('`Marqueta, prep ’Jane’ Doe`')
    expect(askMarqueta('')).toBe('`Marqueta, help`')
    expect(askMarqueta('my calls')).not.toMatch(/@Marqueta|DM/)
  })
})

describe('replaceBlocksByPrefix', () => {
  const blocks: Block[] = [
    { type: 'header', text: { type: 'plain_text', text: 'Monday plan' } },
    { type: 'section', block_id: 'mq_money_runway', text: { type: 'mrkdwn', text: 'Still 4.5 months?' } },
    { type: 'context', block_id: 'mq_money_next', elements: [{ type: 'mrkdwn', text: 'Next: the plan' }] },
    { type: 'actions', block_id: 'mq_footer', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open This week' }, url: 'https://x.test' }] },
  ]

  it('swaps every block with the prefix at the first one’s place, and leaves the rest the very same objects', () => {
    const receipt = { type: 'section', block_id: 'mq_money_receipt', text: { type: 'mrkdwn', text: '✅ Runway confirmed' } }
    const next = replaceBlocksByPrefix(blocks, 'mq_money', [receipt])
    expect(next).toEqual([blocks[0], receipt, blocks[3]])
    expect(next[0]).toBe(blocks[0])
    expect(next[2]).toBe(blocks[3])
  })

  it('returns the same array when nothing matches, so the caller can tell an older message apart', () => {
    expect(replaceBlocksByPrefix(blocks, 'mq_task_', [])).toBe(blocks)
    expect(replaceBlocksByPrefix(blocks, '', [])).toBe(blocks)
  })

  it('matches a whole id segment, never a longer id that merely starts the same way', () => {
    const neighbours: Block[] = [
      { type: 'section', block_id: 'mq_money', text: { type: 'mrkdwn', text: 'the group itself' } },
      { type: 'section', block_id: 'mq_moneyball', text: { type: 'mrkdwn', text: 'someone else’s' } },
      // Why task cards must use replaceCheckInTask: another task's card shares the prefix.
      { type: 'section', block_id: 'mq_task_ab', text: { type: 'mrkdwn', text: 'task ab' } },
      { type: 'section', block_id: 'mq_task_abc', text: { type: 'mrkdwn', text: 'task abc' } },
    ]
    const receipt = { type: 'section', block_id: 'mq_money_receipt', text: { type: 'mrkdwn', text: 'receipt' } }
    expect(replaceBlocksByPrefix(neighbours, 'mq_money', [receipt])).toEqual([receipt, neighbours[1], neighbours[2], neighbours[3]])
    expect(replaceBlocksByPrefix(neighbours, 'mq_task_ab', [])).toEqual([neighbours[0], neighbours[1], neighbours[3]])
    // A prefix that already ends in "_" matches whatever follows it.
    expect(replaceBlocksByPrefix(blocks, 'mq_money_', [receipt])).toEqual([blocks[0], receipt, blocks[3]])
  })
})

describe('LABEL', () => {
  const labels = Object.values(LABEL) as string[]
  const normalise = (label: string) => label.replace(/[‘’]/g, "'").trim().toLowerCase()

  it('uses no retired label, and no label twice', () => {
    const retired = new Set(RETIRED_LABELS.map(normalise))
    for (const label of labels) expect(retired.has(normalise(label)), label).toBe(false)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('ends in "…" exactly where pressing opens a form', () => {
    expect(labels.filter((label) => label.endsWith('…')).sort()).toEqual(
      [LABEL.DETAILS, LABEL.ANSWER, LABEL.STUCK, LABEL.LOG, LABEL.RUNWAY_SIGNED, LABEL.RUNWAY_CHANGED].sort(),
    )
  })

  it('uses curly apostrophes and fits a button', () => {
    for (const label of labels) {
      expect(label, label).not.toContain("'")
      expect(label.length, label).toBeLessThanOrEqual(75)
    }
    expect(addContactLabel('Alex Chen')).toBe('Add Alex Chen to outreach')
    expect(addContactLabel('Alex Chen', true)).toBe('Add Alex Chen and log it')
    expect(addContactLabel('x'.repeat(200), true).length).toBeLessThanOrEqual(75)
    expect(addContactLabel('   ')).toBe('Add them to outreach')
  })

  it('keeps her identity and the state emoji in one place', () => {
    expect(MARQUETA_IDENTITY).toEqual({ username: 'Marqueta', iconEmoji: ':chart_with_upwards_trend:' })
    expect(STATE_EMOJI).toEqual({ done: ':white_check_mark:', away: ':palm_tree:', risk: ':warning:' })
  })
})

// ── The label-drift guard ─────────────────────────────────────────────────────

const ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Every Slack builder: the marketing library and the Slack routes. `marquetaStyle.ts` is the source, so it is not scanned. */
const SCANNED = [
  ...readdirSync(join(ROOT, 'src/lib/marketing'))
    .filter((file) => file.endsWith('.ts') && file !== 'marquetaStyle.ts')
    .map((file) => `src/lib/marketing/${file}`),
  'src/app/api/slack/interactions/route.ts',
  'src/app/api/slack/events/route.ts',
  'src/app/api/marketing/slack/digest/route.ts',
  'src/app/api/marketing/checkin/route.ts',
]

const normaliseLabel = (label: string) => label.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()

/** A file's `const` declarations by name, so a label kept in a constant is still read. */
type Consts = Map<string, ts.Expression[]>

function constsOf(sourceFile: ts.SourceFile): Consts {
  const consts: Consts = new Map()
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      node.parent.flags & ts.NodeFlags.Const
    ) {
      consts.set(node.name.text, [...(consts.get(node.name.text) || []), node.initializer])
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return consts
}

/**
 * The literal text a label expression can evaluate to: a string, the fixed
 * start of a template (`Add ${name}` → "Add …"), both sides of a `?:`, `||` or
 * `??`, and — through `consts` — whatever a same-file `const` holds, so
 * `const label = 'Take it over'; button(id, label, v)` is caught too. Not
 * inside calls, property reads or template holes: `LABEL.DONE` and
 * `addContactLabel(name)` are what sourcing a label from the system looks like.
 * A parameter or `let` is not followed — it could hold anything, and flagging
 * every identifier would flag every button's value and action id.
 */
function literalsOf(node: ts.Node, consts: Consts = new Map(), seen = new Set<string>()): string[] {
  const again = (next: ts.Node) => literalsOf(next, consts, seen)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text]
  if (ts.isTemplateExpression(node)) return node.head.text.trim() ? [`${node.head.text.trimEnd()} …`] : []
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return again(node.expression)
  if (ts.isConditionalExpression(node)) return [...again(node.whenTrue), ...again(node.whenFalse)]
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
    return [...again(node.left), ...again(node.right)]
  }
  if (ts.isIdentifier(node) && consts.has(node.text) && !seen.has(node.text)) {
    seen.add(node.text)
    return (consts.get(node.text) || []).flatMap(again)
  }
  return []
}

/** Strings a button builder takes that are not labels. */
const NOT_A_LABEL = new Set(['primary', 'danger'])

/**
 * Every button label typed as a literal in a source file:
 *   - `{ type: 'button', text: { type: 'plain_text', text: <here> } }`
 *   - any argument to a function named `button…` / `…Button` (`buttonElement`,
 *     `actionButton`), except `openViewButton`, whose argument is a view key.
 */
function hardCodedLabels(source: string, file = 'source.ts'): string[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const consts = constsOf(sourceFile)
  const found: string[] = []
  const propertyNamed = (object: ts.ObjectLiteralExpression, name: string) =>
    object.properties.find((property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === name)
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const type = propertyNamed(node, 'type')
      const text = propertyNamed(node, 'text')
      if (type && ts.isStringLiteral(type.initializer) && type.initializer.text === 'button' && text && ts.isObjectLiteralExpression(text.initializer)) {
        const label = propertyNamed(text.initializer, 'text')
        if (label) found.push(...literalsOf(label.initializer, consts))
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text
          : ''
      if (/^(button\w*|\w+Button)$/.test(callee) && callee !== 'openViewButton') {
        for (const argument of node.arguments) found.push(...literalsOf(argument, consts))
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found.map(normaliseLabel).filter((label) => label && !NOT_A_LABEL.has(label) && !label.startsWith('goinvo_'))
}

/**
 * Every string literal in a file — where a retired label could hide — and each
 * fixed piece of a template (`Take it over ${x}` yields "Take it over").
 */
function stringLiterals(source: string, file = 'source.ts'): string[] {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.push(node.text)
    if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) found.push(node.text)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found.map(normaliseLabel)
}

/**
 * "The board" is retired from Slack copy (§2.3): a place is named by the tab
 * that shows it — This week, Outreach, Calendar — and a refusal says what
 * happened, not where some abstract board stands.
 */
const BOARD = /\bthe board\b/i
/** A GROQ query is not copy, whatever its string says. */
const isGroq = (literal: string) => /\*\[\s*_type\b|_type\s*==/.test(literal)

describe('the label-drift guard', () => {
  const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

  it('finds hand-typed labels in every shape a builder writes them (so a pass means something)', () => {
    const fixture = `
      const a = { type: 'button', text: { type: 'plain_text', text: 'Take it over' }, value: 'x' }
      const b = { type: 'button', text: { type: 'plain_text', text: owner ? "Hand it back" : 'Not me' } }
      const c = button(MARQUETA_ACTION.logCall, 'Log result', ref, 'primary')
      const d = buttonElement(id, \`Add \${name} to outreach\`, value)
      const e = actionButton(label || 'Open in Studio', id, value)
      const kept = 'Log how it went'
      const f = button(MARQUETA_ACTION.logCall, kept, ref)
      const g = { type: 'button', text: { type: 'plain_text', text: kept } }
      const fromTheSystem = LABEL.DONE
      const fine = [button(id, LABEL.DONE, value, true), button(id, addContactLabel(name), value), openViewButton('thisWeek', url), button(id, fromTheSystem, value)]
      const notAButton = { type: 'section', text: { type: 'mrkdwn', text: 'Open the plan' } }
      const hidden = \`\${who} — Take it over \${when}\`
    `
    expect(hardCodedLabels(fixture)).toEqual([
      'Take it over',
      'Hand it back',
      'Not me',
      'Log result',
      'Add …',
      'Open in Studio',
      'Log how it went',
      'Log how it went',
    ])
    expect(stringLiterals(fixture)).toContain('Open the plan')
    // The fixed middle of a template is read too, trimmed.
    expect(stringLiterals(fixture)).toContain('— Take it over')
    expect(stringLiterals('const x = `Take it over ${y}`')).toContain('Take it over')
  })

  it('scans every Slack builder there is', () => {
    expect(SCANNED).toContain('src/lib/marketing/weeklyCheckIn.ts')
    expect(SCANNED).toContain('src/lib/marketing/slackDelegation.ts')
    expect(SCANNED).not.toContain('src/lib/marketing/marquetaStyle.ts')
    for (const file of SCANNED) expect(() => read(file), file).not.toThrow()
  })

  it('finds no button label typed outside LABEL', () => {
    const offenders = SCANNED.flatMap((file) =>
      hardCodedLabels(read(file), file).map((label) => `${file}: "${label}"`),
    )
    expect(offenders).toEqual([])
  })

  it('finds no retired label anywhere, as a button or as a string waiting to become one', () => {
    const retired = new Set(RETIRED_LABELS.map(normaliseLabel))
    const offenders = SCANNED.flatMap((file) =>
      stringLiterals(read(file), file)
        .filter((literal) => retired.has(literal))
        .map((literal) => `${file}: "${literal}"`),
    )
    expect(offenders).toEqual([])
  })

  it('names places by the tab that shows them — never "the board" in a string Slack could show', () => {
    const offenders = SCANNED.flatMap((file) =>
      stringLiterals(read(file), file)
        .filter((literal) => BOARD.test(literal) && !isGroq(literal))
        .map((literal) => `${file}: "${literal}"`),
    )
    expect(offenders).toEqual([])
  })

  it('catches "the board" in every string shape, and leaves code comments and GROQ alone', () => {
    const fixture = `
      // Where the board would refuse it — a comment, not copy.
      /** The board name, as the roster has it. */
      const a = 'It’s no longer on the board.'
      const b = \`Nothing on the board is under \${name}.\`
      const groq = \`*[_type == "marketingOperation" && board == "the board"]\`
    `
    const found = stringLiterals(fixture).filter((literal) => BOARD.test(literal) && !isGroq(literal))
    // Read as the other guards read them: apostrophes straightened, templates by their fixed parts.
    expect(found).toEqual(["It's no longer on the board.", 'Nothing on the board is under'])
  })

  it('covers every builder the UX pass moved onto LABEL — with no allowlist left to hide behind', () => {
    // Each of these once carried hand-typed or retired labels. The guard above
    // is strict now: a label typed outside LABEL in any of them fails CI, and
    // so does a file that stops being scanned.
    for (const file of [
      'src/lib/marketing/weeklyCheckIn.ts',
      'src/lib/marketing/weeklyCheckIn.server.ts',
      'src/lib/marketing/slackDelegation.ts',
      'src/lib/marketing/strategyCheck.ts',
      'src/lib/marketing/callPrep.ts',
      'src/lib/marketing/callLog.ts',
      'src/lib/marketing/marquetaChat.server.ts',
      'src/app/api/slack/interactions/route.ts',
      'src/app/api/slack/events/route.ts',
      'src/app/api/marketing/slack/digest/route.ts',
      'src/app/api/marketing/checkin/route.ts',
    ]) {
      expect(SCANNED, file).toContain(file)
      expect(hardCodedLabels(read(file), file), file).toEqual([])
    }
  })
})
