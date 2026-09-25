// @vitest-environment jsdom
/**
 * Where "Open Outreach", Prep and Log it… land, and what the page shows there.
 *
 * The Outreach half of the Studio landing work: a Slack link or a This week
 * button asks for one contact, and the page must open THAT contact — their
 * call prep, or their "How did it go?" form — showing the same outline Slack
 * posted and offering the same eight outcomes Slack's log does.
 *
 * Three kinds of check, because each catches a different way this breaks:
 *   - pure helpers (the chip mapping, follow-up choices, history line, week
 *     window) pinned directly;
 *   - the outline view rendered against outlines the real composer made, and
 *     compared with the Slack message built from the same outline;
 *   - the workspace itself rendered in jsdom with a fake client, so "the log
 *     panel is open on first render" is observed, not inferred from source.
 */
// The tool shell FIRST, as the Studio loads it: it imports Outreach, which
// imports the outline panel, which imports the shell back. A panel that read
// `styles` while loading would crash here (it did once).
import { styles } from '@/sanity/tools/marketingTool'

import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'

import { CALL_OUTCOMES, FOLLOW_UP_CHOICES } from '@/lib/marketing/callLog'
import {
  buildCallOutlineMessages,
  composeCallOutline,
  parsePrepRequest,
  type CallOutline,
  type PrepContact,
} from '@/lib/marketing/callPrep'
import { PREP_DATA_QUERY } from '@/lib/marketing/callPrep.server'
import { getFinancialPosture } from '@/lib/marketing/financialPosture'
import { formatSlackDay } from '@/lib/marketing/marquetaStyle'
import { LOG_STATUS_VALUES, OUTREACH_CHANNEL_OPTIONS } from '@/lib/marketing/outreachEnums'
import { describePulse, summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { resolveRunwayPosture } from '@/lib/marketing/runway'
import { decodeSlackText } from '@/lib/marketing/slackText'
import {
  CALL_OUTLINE_QUERY,
  CallOutlineView,
  studioSenderName,
} from '@/sanity/components/marketing/CallOutlinePanel'
import {
  interactionHistoryLine,
  OutreachWorkspaceContent,
  outreachDateLabel,
  outreachFollowUpOptions,
  outreachLogChoice,
  outreachPulseSentence,
  outreachWeekWindow,
} from '@/sanity/components/marketing/OutreachWorkspace'

const NOW = new Date('2026-09-24T15:00:00.000Z') // Thu 24 Sep 2026
const WORKSPACE = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')
const PANEL = readFileSync('src/sanity/components/marketing/CallOutlinePanel.tsx', 'utf8').replace(/\r\n/g, '\n')

// ── Fixtures ─────────────────────────────────────────────────────────────────

const JANE: PrepContact = {
  _id: 'marketingContact.jane',
  name: 'Jane Doe',
  organization: 'Mass General Brigham',
  role: 'CMIO',
  segment: 'provider',
  warmth: 'warm',
  status: 'contacted',
  howWeKnow: 'worked together on the patient portal',
  researchReviewedAt: '2026-09-01T12:00:00.000Z',
  interactions: [
    { _key: 'i1', at: '2026-09-15T14:00:00.000Z', by: 'Shirley', outcome: 'Left a voicemail', statusAfter: 'contacted', channel: 'phone' },
  ],
}
const JANE_SMITH: PrepContact = { _id: 'marketingContact.smith', name: 'Jane Smith', organization: 'Acme Health', role: 'VP Product', warmth: 'cold', status: 'researched' }
const LEO: PrepContact = { _id: 'marketingContact.leo', name: 'Leo Park', organization: 'Beacon Health', warmth: 'warm', status: 'meeting' }
const HELD: PrepContact = {
  _id: 'marketingContact.held',
  name: 'Priya Patel',
  organization: 'Acme Health',
  warmth: 'warm',
  status: 'responded',
  channelOverrides: [
    { channel: 'phone', state: 'doNotUse' },
    { channel: 'email', state: 'doNotUse' },
  ],
}

const outlineFor = (contact: PrepContact): CallOutline =>
  composeCallOutline({
    match: { kind: 'contact', contact },
    research: [],
    offers: [],
    evidence: [],
    senderName: 'Shirley',
    includeContactDetails: false,
    now: NOW,
    request: null,
  })

const decodeHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

const sectionsOf = (html: string) => [...html.matchAll(/data-outline-section="(\w+)"/g)].map((match) => match[1])

const renderView = (outline: CallOutline, withActions = true) =>
  renderToStaticMarkup(
    createElement(CallOutlineView, {
      outline,
      actions: withActions ? createElement('button', { type: 'button' }, 'Log it…') : undefined,
    }),
  )

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe('the outcome chips (Slack’s eight outcomes, on the Studio form)', () => {
  it('covers every outcome, each filling in what one press of Slack’s log would', () => {
    expect(CALL_OUTCOMES).toHaveLength(8)
    const channels = OUTREACH_CHANNEL_OPTIONS.map((option) => option.value)
    for (const outcome of CALL_OUTCOMES) {
      const choice = outreachLogChoice('researched', outcome.key)
      expect(choice.outcome).toBe(outcome.label)
      expect(choice.statusAfter).toBe(outcome.status)
      expect(channels).toContain(choice.channel)
      expect(choice.channel).toBe(outcome.channel)
      expect(choice.followUpDays).toBe(['won', 'lost', 'closed'].includes(outcome.status) ? null : outcome.defaultFollowUpDays)
    }
  })

  it('only ever lands on a status the form’s status select offers, from any starting point', () => {
    for (const from of [undefined, 'new', 'researched', ...LOG_STATUS_VALUES]) {
      for (const outcome of CALL_OUTCOMES) {
        expect(LOG_STATUS_VALUES, `${from} + ${outcome.key}`).toContain(outreachLogChoice(from, outcome.key).statusAfter)
      }
    }
  })

  it('never moves a contact backwards on an attempt, and Won absorbs everything', () => {
    expect(outreachLogChoice('meeting', 'noAnswer').statusAfter).toBe('meeting')
    expect(outreachLogChoice('opportunity', 'voicemail').statusAfter).toBe('opportunity')
    for (const outcome of CALL_OUTCOMES) {
      const choice = outreachLogChoice('won', outcome.key)
      expect(choice.statusAfter).toBe('won')
      expect(choice.followUpDays).toBeNull()
    }
    // An explicit disposition is taken at its word — the form then shows the change.
    expect(outreachLogChoice('responded', 'notNow').statusAfter).toBe('dormant')
  })
})

describe('the follow-up choices', () => {
  const values = (options: Array<{ value: string }>) => options.map((option) => option.value)
  const slackChoices = FOLLOW_UP_CHOICES.filter((choice) => choice.value !== 'default')

  it('are Slack’s list without “When the outcome suggests”', () => {
    const options = outreachFollowUpOptions(null, 7)
    expect(values(options)).toEqual(slackChoices.map((choice) => (choice.days === null ? 'none' : String(choice.days))))
    expect(options.map((option) => option.label)).toEqual(slackChoices.map((choice) => choice.label))
    expect(options.some((option) => /suggest/i.test(option.label))).toBe(false)
  })

  it('name the outcome’s suggestion instead of making people guess it', () => {
    expect(outreachFollowUpOptions(3, 3)[0]).toEqual({ value: '3', label: 'In 3 days (suggested)' })
    expect(outreachFollowUpOptions(60, 60)[0]).toEqual({ value: '60', label: 'In 60 days (suggested)' })
    // A suggestion that IS one of the choices is marked, not duplicated.
    const two = outreachFollowUpOptions(2, 2)
    expect(values(two).filter((value) => value === '2')).toHaveLength(1)
    expect(two.find((option) => option.value === '2')?.label).toBe('In 2 days (suggested)')
  })

  it('keep whatever the form holds selectable, and never repeat a value', () => {
    expect(outreachFollowUpOptions(null, 42)).toContainEqual({ value: '42', label: 'In 42 days' })
    for (const [suggested, current] of [[null, 7], [3, 7], [3, 3], [2, 2], [60, 90], [null, null]] as const) {
      const options = values(outreachFollowUpOptions(suggested, current))
      expect(new Set(options).size).toBe(options.length)
      expect(options).not.toContain('default')
      expect(options).toContain(current === null ? 'none' : String(current))
    }
  })
})

describe('call history rows', () => {
  it('read like Slack: “Thu 24 Sep — Shirley, phone”', () => {
    expect(interactionHistoryLine({ at: '2026-09-24T14:00:00.000Z', by: 'Shirley Xu', channel: 'phone' }, NOW)).toBe(
      'Thu 24 Sep — Shirley, phone',
    )
    expect(interactionHistoryLine({ at: '2026-09-15T14:00:00.000Z', channel: 'inPerson' }, NOW)).toBe('Tue 15 Sep — in person')
    expect(interactionHistoryLine({ at: '2025-09-21T14:00:00.000Z', by: 'Juhan', channel: 'email' }, NOW)).toBe(
      'Sun 21 Sep 2025 — Juhan, email',
    )
    expect(interactionHistoryLine({ by: 'Eric' }, NOW)).toBe('Undated — Eric')
    expect(interactionHistoryLine({ at: '2026-09-24T14:00:00.000Z' }, NOW)).toBe('Thu 24 Sep')
  })

  it('never show an ISO date or a locale-formatted one', () => {
    const line = interactionHistoryLine({ at: '2026-09-24T14:00:00.000Z', by: 'Shirley', channel: 'phone' }, NOW)
    expect(line).not.toMatch(/\d{4}-\d{2}-\d{2}|\d+\/\d+\/\d+/)
  })
})

describe('the outreach pulse window', () => {
  it('is Monday to Monday (UTC), the week Slack’s check-in counts', () => {
    expect(outreachWeekWindow(NOW)).toMatchObject({ from: '2026-09-21T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' })
    expect(outreachWeekWindow(new Date('2026-09-27T23:30:00.000Z')).from).toBe('2026-09-21T00:00:00.000Z')
    expect(outreachWeekWindow(new Date('2026-09-28T00:30:00.000Z')).from).toBe('2026-09-28T00:00:00.000Z')
  })

  it('counts a touch this week and not one from last week', () => {
    const pulse = summarizeOutreach(
      [
        { _id: 'a', status: 'contacted', interactions: [{ at: '2026-09-22T14:00:00.000Z', channel: 'phone', statusAfter: 'contacted' }] },
        { _id: 'b', status: 'contacted', interactions: [{ at: '2026-09-18T14:00:00.000Z', channel: 'phone', statusAfter: 'contacted' }] },
      ],
      outreachWeekWindow(NOW),
    )
    expect(pulse.touches).toBe(1)
  })
})

describe('the outreach pulse sentence', () => {
  // The route-level parity (this helper vs plan-week's `pulse`, run for real)
  // is tests/marketing-outreach-pulse-parity.test.ts; this pins the case.
  const followUps = [
    { _id: 'mon', name: 'Ada Park', status: 'contacted', warmth: 'warm', followUpAt: '2026-09-28T14:00:00.000Z', interactions: [] },
    { _id: 'tue', name: 'Bo Chen', status: 'responded', followUpAt: '2026-09-29T14:00:00.000Z', interactions: [] },
  ]

  it('counts follow-ups the way This week does — Thursday, with Monday and Tuesday still to come', () => {
    // What the page said before: the ISO week ends Sunday, so both were missed…
    expect(describePulse(summarizeOutreach(followUps, outreachWeekWindow(NOW)), 'Outreach this week')).toBe(
      'Outreach this week: no outreach logged yet.',
    )
    // …while This week, one tab over, said two were waiting.
    expect(outreachPulseSentence(followUps, NOW)).toBe('Outreach this week: no outreach logged yet. 2 follow-ups waiting.')
  })

  it('leaves out a draft beside its published contact', () => {
    const touched = { ...followUps[0], interactions: [{ at: '2026-09-22T14:00:00.000Z', by: 'Juhan', channel: 'phone', statusAfter: 'contacted' }] }
    expect(outreachPulseSentence([touched, { ...touched, _id: 'drafts.mon' }], NOW)).toBe(outreachPulseSentence([touched], NOW))
  })
})

describe('dates on Outreach cards', () => {
  it('read like Slack’s — “Mon 28 Sep” — never “9/28/2026”', () => {
    expect(outreachDateLabel('2026-09-28T12:00:00.000Z', NOW)).toBe('Mon 28 Sep')
    expect(outreachDateLabel('2026-09-28', NOW)).toBe('Mon 28 Sep')
    expect(outreachDateLabel('2027-01-11T12:00:00.000Z', NOW)).toBe('Mon 11 Jan 2027')
    for (const nothing of [undefined, null, '', 'not a date']) expect(outreachDateLabel(nothing, NOW)).toBe('—')
  })
})

describe('the sender name', () => {
  it('is the first word of the Studio user’s name, or nothing for the composer to fill', () => {
    expect(studioSenderName('Shirley Xu')).toBe('Shirley')
    expect(studioSenderName('  Juhan  ')).toBe('Juhan')
    expect(studioSenderName('')).toBe('')
    expect(studioSenderName(null)).toBe('')
    // Empty is left to the composer, which writes a placeholder rather than somebody else's name.
    expect(composeCallOutline({ match: { kind: 'contact', contact: JANE }, research: [], offers: [], evidence: [], senderName: '', includeContactDetails: false, now: NOW }).cheatSheet.say).toContain('[your name]')
  })
})

// ── The outline view ─────────────────────────────────────────────────────────

describe('the call outline in the Studio', () => {
  it('shows Slack’s cheat sheet, line for line and in the same order', () => {
    const outline = outlineFor(JANE)
    const slack = buildCallOutlineMessages(outline)
    const slackText = decodeSlackText(
      slack.first
        .map((block) =>
          [block.text?.text, ...(block.elements || []).map((element: { text?: unknown }) => element?.text)]
            .filter((text): text is string => typeof text === 'string')
            .join('\n'),
        )
        .join('\n'),
    )
    const studioText = decodeHtml(renderView(outline))
    const lines = [outline.cheatSheet.say, outline.cheatSheet.ask, outline.cheatSheet.ifNo, outline.cheatSheet.exit]
    expect(lines.every((line) => line.trim())).toBe(true)
    for (const line of lines) {
      expect(slackText, 'Slack carries the line').toContain(line)
      expect(studioText, 'the Studio carries the same line').toContain(line)
    }
    const order = (text: string) => lines.map((line) => text.indexOf(line))
    expect(order(studioText)).toEqual([...order(studioText)].sort((a, b) => a - b))
    expect(order(slackText)).toEqual([...order(slackText)].sort((a, b) => a - b))
    // Same questions and pushback answers as Slack posts.
    for (const question of outline.questions.slice(0, 4)) expect(studioText).toContain(question)
    for (const line of outline.ifTheySay) expect(studioText).toContain(line.youSay)
  })

  it('reads top-down in the order of the minute before a call', () => {
    const html = renderView(outlineFor(JANE))
    const sections = sectionsOf(html)
    expect(sections.indexOf('cheatSheet')).toBeGreaterThanOrEqual(0)
    const ordered = ['cheatSheet', 'actions', 'questions', 'ifTheySay', 'voicemail', 'email']
    const positions = ordered.map((name) => sections.indexOf(name))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(html).toContain('>On the call<')
    expect(html).toContain('aria-label="Copy the voicemail"')
    expect(html).toContain('aria-label="Copy the email draft"')
  })

  it('leads an email-first outline with the email, and has no voicemail script', () => {
    const outline = outlineFor(JANE_SMITH)
    expect(outline.mode).toBe('emailFirst')
    const html = renderView(outline)
    const sections = sectionsOf(html)
    expect(sections.indexOf('email')).toBeLessThan(sections.indexOf('cheatSheet'))
    expect(sections.indexOf('actions')).toBeLessThan(sections.indexOf('cheatSheet'))
    expect(sections).not.toContain('voicemail')
    expect(html).toMatch(/<details data-outline-section="email" open=""/)
    expect(html).toContain('Today: send this email')
    expect(html).toContain('>If you end up talking<')
    expect(decodeHtml(html)).toContain(outline.email.split('\n')[0])
  })

  it('has no “If they say…” in a meeting, even from an outline that carries some', () => {
    const outline = outlineFor(LEO)
    expect(outline.mode).toBe('meeting')
    const withObjections = { ...outline, ifTheySay: [{ theySay: 'Who is this?', youSay: 'It’s Shirley from GoInvo.' }] }
    const html = renderView(withObjections)
    expect(sectionsOf(html)).not.toContain('ifTheySay')
    expect(html).not.toContain('If they say')
    expect(html).toContain('>In the meeting<')
    expect(sectionsOf(html)).toContain('agenda')
  })

  it('gives a hold-off no script — only the action row Slack keeps, under “Don’t contact them”', () => {
    const outline = outlineFor(HELD)
    expect(outline.mode).toBe('holdOff')
    const html = renderView(outline)
    const sections = sectionsOf(html)
    for (const name of ['cheatSheet', 'voicemail', 'email', 'questions', 'ifTheySay']) expect(sections).not.toContain(name)
    expect(html).toContain('Don’t contact them')
    // Someone we may not call can still call us: Slack keeps a Log it… here,
    // plain (not green), and so does the Studio — right under the reason.
    expect(sections.indexOf('actions')).toBe(sections.indexOf('holdOff') + 1)
    const slackRow = buildCallOutlineMessages(outline, { logRef: 'ref' }).first.find((block) => block.type === 'actions')
    const slackLog = slackRow?.elements?.find((element: { text?: { text?: string } }) => element.text?.text === 'Log it…')
    expect(slackLog, 'Slack’s hold-off offers Log it…').toBeTruthy()
    expect(slackLog.style, 'and not in green').toBeUndefined()
  })

  it('keeps unreviewed research under a “not reviewed” label, last', () => {
    const unreviewed: PrepContact = { ...JANE, researchReviewedAt: null, callBrief: 'An AI brief nobody has checked yet, long enough to count.' }
    const html = renderView(outlineFor(unreviewed))
    const sections = sectionsOf(html)
    expect(sections[sections.length - 1]).toBe('background')
    expect(html).toContain('Background — not reviewed')
    expect(decodeHtml(html)).toContain('An AI brief nobody has checked yet')
  })

  it('links a source only when it is http(s)', () => {
    const outline = { ...outlineFor(JANE), whyNow: { signal: 'They spun out a company', quote: 'We spun out a company', sourceUrl: 'javascript:alert(1)' } }
    const html = renderView(outline)
    expect(html).toContain('We spun out a company')
    expect(html).not.toContain('javascript:')
    const linked = renderView({ ...outline, whyNow: { ...outline.whyNow, sourceUrl: 'https://example.org/news#:~:text=spun' } })
    expect(linked).toContain('href="https://example.org/news#:~:text=spun"')
  })
})

describe('what the Studio outline cannot know', () => {
  it('is composed from the record: a meeting Slack read from the message is not a meeting here', () => {
    // Slack composes with what the person typed; the Open Outreach link it
    // carries names only the contact and `prep`, and the panel passes
    // `request: null`. Named here so nobody assumes full parity.
    const base = { match: { kind: 'contact' as const, contact: JANE_SMITH }, research: [], offers: [], evidence: [], senderName: 'Shirley', includeContactDetails: false, now: NOW }
    const slack = composeCallOutline({ ...base, request: parsePrepRequest('prep me for my meeting with Jane Smith tomorrow') })
    const studio = composeCallOutline({ ...base, request: null })
    expect(slack.mode).toBe('meeting')
    expect(slack.cheatSheet.say).toContain('Thanks for making the time')
    expect(studio.mode).toBe('emailFirst')
    expect(PANEL).toContain('request: null,')
    expect(PANEL).toContain('One known difference from Slack')
    // The record decides where it can: Meeting booked is meeting prep in both.
    expect(outlineFor({ ...JANE_SMITH, status: 'meeting' }).mode).toBe('meeting')
  })
})

describe('the outline reads what Slack reads', () => {
  /** Each top-level `"key": *[filter][0]?{projection}` of a GROQ object query. */
  function projections(query: string): Record<string, { filter: string; projection: string }> {
    const out: Record<string, { filter: string; projection: string }> = {}
    const squash = (value: string) => value.replace(/\s+/g, ' ').trim()
    for (const match of query.matchAll(/"(\w+)":\s*\*\[/g)) {
      let i = (match.index || 0) + match[0].length
      let depth = 1
      while (depth > 0 && i < query.length) {
        if (query[i] === '[') depth += 1
        else if (query[i] === ']') depth -= 1
        i += 1
      }
      const filter = query.slice((match.index || 0) + match[0].length - 2, i)
      const start = query.indexOf('{', i)
      let j = start + 1
      depth = 1
      while (depth > 0 && j < query.length) {
        if (query[j] === '{') depth += 1
        else if (query[j] === '}') depth -= 1
        j += 1
      }
      out[match[1]] = { filter: squash(filter), projection: squash(query.slice(start, j)) }
    }
    return out
  }

  it('projects exactly the fields Slack’s prep projects, so the composer gets the same record', () => {
    const slack = projections(PREP_DATA_QUERY)
    const studio = projections(CALL_OUTLINE_QUERY)
    const drift = 'the Studio outline reads different fields from Slack’s prep — update CALL_OUTLINE_QUERY to match PREP_DATA_QUERY'
    expect(studio.contact?.projection, drift).toBe(slack.contacts?.projection)
    for (const key of ['research', 'offers', 'evidence']) {
      expect(studio[key]?.projection, `${key}: ${drift}`).toBe(slack[key]?.projection)
      expect(studio[key]?.filter, `${key}: ${drift}`).toBe(slack[key]?.filter)
    }
    // One contact, by id, still never a draft.
    expect(studio.contact.filter).toContain('_id == $id')
    expect(studio.contact.filter).toContain('!(_id in path("drafts.**"))')
  })
})

describe('the outline panel is client-safe', () => {
  const root = process.cwd()
  const resolveImport = (from: string, spec: string): string | null => {
    const base = spec.startsWith('@/') ? path.join(root, 'src', spec.slice(2)) : path.resolve(path.dirname(from), spec)
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      try {
        if (statSync(candidate).isFile()) return candidate
      } catch {
        // not there; try the next spelling
      }
    }
    return null
  }
  const runtimeImports = (file: string): string[] => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    const specs: string[] = []
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly) {
        specs.push((statement.moduleSpecifier as ts.StringLiteral).text)
      }
      if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.isTypeOnly) {
        specs.push((statement.moduleSpecifier as ts.StringLiteral).text)
      }
    }
    return specs
  }

  it('imports no .server module, no server-only guard, no node built-in and no model SDK — directly or through the lib', () => {
    const start = path.join(root, 'src/sanity/components/marketing/CallOutlinePanel.tsx')
    const seen = new Set<string>()
    const offending: string[] = []
    const queue = [start]
    while (queue.length) {
      const file = queue.shift()!
      if (seen.has(file)) continue
      seen.add(file)
      for (const spec of runtimeImports(file)) {
        if (/\.server$|^server-only$|^node:|@anthropic-ai|^openai$/.test(spec)) offending.push(`${path.relative(root, file)} → ${spec}`)
        if (!spec.startsWith('.') && !spec.startsWith('@/')) continue
        const resolved = resolveImport(file, spec)
        if (!resolved) continue
        // The lib modules it pulls in are walked; the Studio shell is client code by definition.
        if (resolved.includes(`${path.sep}src${path.sep}lib${path.sep}`)) queue.push(resolved)
      }
    }
    expect(offending).toEqual([])
    expect([...seen].some((file) => file.endsWith('callPrep.ts'))).toBe(true)
  })
})

// ── The workspace, rendered ──────────────────────────────────────────────────

type OutreachFixture = {
  contacts?: Array<Record<string, unknown>>
  offers?: Array<Record<string, unknown>>
  evidenceLinks?: Array<Record<string, unknown>>
  /** The record, or a bare bin — the shape this query returned before (the e2e harness still sends one). */
  financialPosture?: Record<string, unknown> | string | null
}

const USER = { id: 'u-shirley', name: 'Shirley Xu', roles: [{ name: 'administrator' }] }

function fakeClient(fixture: OutreachFixture = {}) {
  const contacts = fixture.contacts || [{ ...JANE, _rev: 'rev-1' }]
  const outreach = {
    fetch: async (query: string, params?: { id?: string }) => {
      if (query === CALL_OUTLINE_QUERY) {
        return { contact: contacts.find((contact) => contact._id === params?.id) || null, research: [], offers: [], evidence: [] }
      }
      if (query.includes('"contacts": *[_type == "marketingContact"]')) {
        return {
          contacts,
          offers: fixture.offers || [],
          evidenceLinks: fixture.evidenceLinks || [],
          intakeCheckpoints: [],
          financialPosture: fixture.financialPosture ?? null,
        }
      }
      return null
    },
    createOrReplace: async () => ({}),
  }
  return { withConfig: () => outreach, fetch: async () => [] }
}

let mounted: { root: Root; host: HTMLElement } | null = null

async function renderWorkspace(props: Record<string, unknown>) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Element.prototype.scrollIntoView = () => undefined
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted = { root, host }
  await act(async () => {
    root.render(createElement(OutreachWorkspaceContent as never, { client: fakeClient(), currentUser: USER, ...props }))
  })
  // The private records load, then the landing, then the outline's own read.
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
  return host
}

const settle = async (ticks = 6) => {
  for (let i = 0; i < ticks; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
}

const press = async (element: Element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await settle(2)
}

/** Every button that reads "Log it…" inside `root`. */
const logButtons = (root: Element) => [...root.querySelectorAll('button')].filter((button) => button.textContent === 'Log it…')

/** Drawn with `styles.primaryButton` — the one green button. */
const isGreen = (button: Element) => {
  const style = (button as HTMLElement).style
  return [style.background, style.backgroundColor].some((value) => /#007385|rgb\(0, 115, 133\)/i.test(value || ''))
}

async function unmount() {
  if (!mounted) return
  const { root, host } = mounted
  await act(async () => root.unmount())
  host.remove()
  mounted = null
}

afterEach(unmount)

describe('landing on Outreach from Slack or This week', () => {
  it('?action=log: the “How did it go?” form for that contact is open on first render', async () => {
    const host = await renderWorkspace({ focusContact: { id: JANE._id, action: 'log', nonce: 1 } })
    const panel = host.querySelector('#outreach-log-panel')
    expect(panel, 'the log panel is open').not.toBeNull()
    expect(panel?.textContent).toContain('How did it go?')
    expect(panel?.textContent).toContain('Logging a touch with Jane Doe.')
    expect(panel?.textContent).toContain('Marqueta sent you here — log how the call went.')
    // Inside that contact's call prep, not the ad-hoc log section.
    expect(host.querySelector('#outreach-tracker-detail #outreach-log-panel')).not.toBeNull()
    expect(host.querySelector('#outreach-ad-hoc-log')).toBeNull()
  })

  it('?action=prep: call prep for that contact, with Slack’s outline under the heading', async () => {
    const host = await renderWorkspace({ focusContact: { id: JANE._id, action: 'prep', nonce: 1 } })
    const detail = host.querySelector('#outreach-tracker-detail')
    expect(detail?.querySelector('h3')?.textContent).toBe('Call prep: Jane Doe')
    expect(detail?.textContent).toContain('Marqueta sent you here — prep this call.')
    const outline = detail?.querySelector('[data-call-outline]')
    expect(outline, 'the outline panel rendered').not.toBeNull()
    expect(outline?.textContent).toContain('On the call')
    // Spoken as the person reading it, not as whoever wrote the code.
    expect(outline?.textContent).toContain('it’s Shirley from GoInvo')
    expect(host.querySelector('#outreach-log-panel')).toBeNull()
  })

  it('offers Slack’s outcomes as chips, and a chip fills in the form the way Slack’s log would', async () => {
    const host = await renderWorkspace({ focusContact: { id: JANE._id, action: 'log', nonce: 1 } })
    const chips = [...host.querySelectorAll('[data-outreach-log-outcomes] button')]
    expect(chips.map((chip) => chip.textContent)).toEqual(CALL_OUTCOMES.map((outcome) => outcome.label))
    const voicemail = chips.find((chip) => chip.textContent === 'Left a voicemail')!
    await act(async () => {
      voicemail.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const panel = host.querySelector('#outreach-log-panel')!
    expect(voicemail.getAttribute('aria-pressed')).toBe('true')
    expect((panel.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Left a voicemail')
    const selects = [...panel.querySelectorAll('select')] as HTMLSelectElement[]
    const followUp = selects[selects.length - 1]
    expect(followUp.value).toBe('3')
    expect(followUp.selectedOptions[0]?.textContent).toBe('In 3 days (suggested)')
    expect([...followUp.options].map((option) => option.value)).not.toContain('default')
  })

  it('acts on a request once: coming back to the tab does not re-open it', async () => {
    const request = { id: JANE._id, action: 'prep' as const, nonce: 1 }
    let host = await renderWorkspace({ focusContact: request })
    expect(host.querySelector('#outreach-tracker-detail')).not.toBeNull()
    await unmount()
    host = await renderWorkspace({ focusContact: request })
    expect(host.querySelector('#outreach-tracker-detail')).toBeNull()
    await unmount()
    // A new request — even for the same contact — lands again.
    host = await renderWorkspace({ focusContact: { ...request, nonce: 2 } })
    expect(host.querySelector('#outreach-tracker-detail')).not.toBeNull()
  })

  it('says so, in the one error pattern, when the contact is not on file', async () => {
    const host = await renderWorkspace({ focusContact: { id: 'marketingContact.gone', action: 'prep', nonce: 1 } })
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      'Couldn’t find that contact on Outreach — nothing changed. Search Contact records below.',
    )
    expect(host.querySelector('#outreach-tracker-detail')).toBeNull()
  })

  it('waits out a failed load: after Retry it lands, instead of reporting the contact missing', async () => {
    const client = fakeClient()
    const outreach = client.withConfig()
    const realFetch = outreach.fetch
    let failures = 1
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    outreach.fetch = async (query: string, params?: { id?: string }) => {
      if (query.includes('"contacts": *[_type == "marketingContact"]')) {
        if (failures > 0) {
          failures -= 1
          throw new Error('Network down')
        }
        await gate // the retry is slow: the list is empty while it runs
      }
      return realFetch(query, params)
    }
    const host = await renderWorkspace({ client: { ...client, withConfig: () => outreach }, focusContact: { id: JANE._id, action: 'prep', nonce: 1 } })
    const retry = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Retry')!
    expect(retry, 'the load failed and offers Retry').toBeTruthy()
    await act(async () => {
      retry.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    for (let i = 0; i < 3; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(host.textContent).not.toContain('Couldn’t find that contact')
    release()
    for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)))
    expect(host.querySelector('#outreach-tracker-detail h3')?.textContent).toBe('Call prep: Jane Doe')
  })

  it('sends a contact whose research awaits review to their prep, and says why there is no form yet', async () => {
    const pending = { ...JANE, _rev: 'rev-1', researchedAt: '2026-09-20T12:00:00.000Z', researchReviewedAt: undefined }
    const client = fakeClient({ contacts: [pending] })
    const host = await renderWorkspace({ client, focusContact: { id: JANE._id, action: 'log', nonce: 1 } })
    expect(host.querySelector('#outreach-log-panel')).toBeNull()
    expect(host.querySelector('#outreach-tracker-detail')?.textContent).toContain('Approve their research below first')
  })

  it('acts on an equal request once, even when the parent rebuilds it on every render', async () => {
    // The contract says the nonce is what makes a request new. A parent that
    // builds `{ id, action, nonce }` inline hands over a new object on every
    // render; that must not re-open a panel the person just closed.
    const client = fakeClient()
    const rerender = async (nonce: number) => {
      await act(async () => {
        mounted!.root.render(
          createElement(OutreachWorkspaceContent as never, { client, currentUser: USER, focusContact: { id: JANE._id, action: 'prep', nonce } }),
        )
      })
      await settle()
    }
    const host = await renderWorkspace({ client, focusContact: { id: JANE._id, action: 'prep', nonce: 1 } })
    await press(host.querySelector('[aria-label="Close call prep for Jane Doe"]')!)
    expect(host.querySelector('#outreach-tracker-detail'), 'closed').toBeNull()
    await rerender(1)
    expect(host.querySelector('#outreach-tracker-detail'), 'an equal request, re-rendered, stays handled').toBeNull()
    await rerender(2)
    expect(host.querySelector('#outreach-tracker-detail h3')?.textContent, 'a new nonce lands again').toBe('Call prep: Jane Doe')
  })

  it('drops “prep this call” once the log form opens — the banner describes the step before it', async () => {
    const host = await renderWorkspace({ focusContact: { id: JANE._id, action: 'prep', nonce: 1 } })
    const detail = host.querySelector('#outreach-tracker-detail')!
    expect(detail.textContent).toContain('Marqueta sent you here — prep this call.')
    await press(logButtons(detail)[0])
    expect(host.querySelector('#outreach-log-panel')?.textContent).toContain('How did it go?')
    expect(host.textContent).not.toContain('Marqueta sent you here')
    expect(host.querySelector('[data-outreach-landing]')).toBeNull()
  })
})

describe('the principal browser journey’s Log it…', () => {
  it('is the button named “Log it for <name>” in Recommended next, and opens “How did it go?”', async () => {
    // The CI browser job (scripts/test-marketing-principal-e2e.ts) clicks this
    // by role and name after approving a researched contact. This is the same
    // contact the harness ends up with, so a rename shows up here, in vitest,
    // instead of only in the browser job.
    const offer = { _id: 'marketingOffer.harness', title: 'Rapid healthcare design diagnostic', key: 'rapid-diagnostic', status: 'active', priceBand: 'Fixed fee, $40–60K' }
    const evidence = { _id: 'marketingWorkEvidence.harness', sourceId: 'caseStudy.harness', url: 'https://example.com/work', title: 'Healthcare product strategy', status: 'active' }
    const principal = {
      _id: 'marketingContact.principal',
      _rev: 'rev-1',
      name: 'Pipeline Principal',
      organization: 'Northstar Health',
      status: 'researched',
      warmth: 'warm',
      howWeKnow: 'Known through prior GoInvo work',
      email: 'principal-pipeline@example.com',
      researchedAt: '2026-09-20T12:00:00.000Z',
      researchReviewedAt: '2026-09-21T12:00:00.000Z',
      personVerified: true,
      identityConfidence: 'high',
      callBrief: 'Discuss the active healthcare initiative, show the relevant work, and offer a focused diagnostic.',
      suggestedOfferKey: offer.key,
      relevantEvidence: [{ _key: 'e', evidenceId: evidence._id, title: evidence.title }],
    }
    const host = await renderWorkspace({ client: fakeClient({ contacts: [principal], offers: [offer], evidenceLinks: [evidence] }) })
    const region = host.querySelector('[role="region"][aria-label="Recommended next outreach"]')!
    const named = [...region.querySelectorAll('button')].filter((button) => button.getAttribute('aria-label') === 'Log it for Pipeline Principal')
    expect(named, 'exactly one, as the journey’s exact-name locator needs').toHaveLength(1)
    expect(named[0].textContent).toBe('Log it…')
    expect(host.querySelector('[aria-label^="Log result for"]')).toBeNull()
    await press(named[0])
    const panel = host.querySelector('#outreach-log-panel')!
    expect(panel.textContent).toContain('How did it go?')
    expect(panel.querySelector('textarea[placeholder="Outcome of the call/message"]')).not.toBeNull()
    expect([...panel.querySelectorAll('button')].filter((button) => button.textContent === 'Save log')).toHaveLength(1)
  })
})

describe('call prep has one Log it…, and it does what Slack’s does', () => {
  const withRev = (contact: PrepContact) => ({ ...contact, _rev: 'rev-1' })

  it('a follow-up: one green Log it…, under the cheat sheet, opening the form with nothing chosen', async () => {
    const host = await renderWorkspace({ focusContact: { id: JANE._id, action: 'prep', nonce: 1 } })
    const detail = host.querySelector('#outreach-tracker-detail')!
    const buttons = logButtons(detail)
    expect(buttons, 'one Log it… in the panel — the card below has none').toHaveLength(1)
    expect(buttons[0].closest('[data-call-outline] [data-outline-section="actions"]'), 'it is the outline’s').not.toBeNull()
    expect(isGreen(buttons[0])).toBe(true)
    expect(buttons[0].getAttribute('aria-label')).toBe('Log it for Jane Doe')
    await press(buttons[0])
    const chips = [...host.querySelectorAll('[data-outreach-log-outcomes] button')]
    expect(chips.some((chip) => chip.getAttribute('aria-pressed') === 'true')).toBe(false)
  })

  it('email-first: the same one button, with “Sent an email” chosen — as Slack presets it', async () => {
    const host = await renderWorkspace({
      client: fakeClient({ contacts: [withRev(JANE_SMITH)] }),
      focusContact: { id: JANE_SMITH._id, action: 'prep', nonce: 1 },
    })
    const detail = host.querySelector('#outreach-tracker-detail')!
    expect(detail.querySelector('[data-call-outline]')?.getAttribute('data-call-outline')).toBe('emailFirst')
    const buttons = logButtons(detail)
    expect(buttons).toHaveLength(1)
    await press(buttons[0])
    const emailed = CALL_OUTCOMES.find((outcome) => outcome.key === 'emailed')!
    const chosen = [...host.querySelectorAll('[data-outreach-log-outcomes] button')].filter((chip) => chip.getAttribute('aria-pressed') === 'true')
    expect(chosen.map((chip) => chip.textContent)).toEqual([emailed.label])
  })

  it('a hold-off: one plain Log it…, under “Don’t contact them”', async () => {
    const host = await renderWorkspace({
      client: fakeClient({ contacts: [withRev(HELD)] }),
      focusContact: { id: HELD._id, action: 'prep', nonce: 1 },
    })
    const detail = host.querySelector('#outreach-tracker-detail')!
    expect(detail.querySelector('[data-call-outline]')?.getAttribute('data-call-outline')).toBe('holdOff')
    const buttons = logButtons(detail)
    expect(buttons).toHaveLength(1)
    expect(isGreen(buttons[0])).toBe(false)
    expect(detail.querySelectorAll('button').length).toBeGreaterThan(0)
    expect([...detail.querySelectorAll('button')].some(isGreen), 'nothing green on a hold-off').toBe(false)
  })

  it('an outline that could not be read still leaves one plain Log it…', async () => {
    const client = fakeClient()
    const outreach = client.withConfig()
    const realFetch = outreach.fetch
    outreach.fetch = async (query: string, params?: { id?: string }) => {
      if (query === CALL_OUTLINE_QUERY) throw new Error('Network down')
      return realFetch(query, params)
    }
    const host = await renderWorkspace({ client: { ...client, withConfig: () => outreach }, focusContact: { id: JANE._id, action: 'prep', nonce: 1 } })
    const detail = host.querySelector('#outreach-tracker-detail')!
    const missing = detail.querySelector('[data-call-outline-missing]')
    expect(missing?.textContent).toContain('Couldn’t load the call outline — nothing changed.')
    const buttons = logButtons(detail)
    expect(buttons).toHaveLength(1)
    expect(missing?.contains(buttons[0])).toBe(true)
    expect(isGreen(buttons[0])).toBe(false)
    await press(buttons[0])
    expect(host.querySelector('#outreach-log-panel')).not.toBeNull()
  })

  it('shows the follow-up date the way the history rows beside it show theirs', async () => {
    const followUpAt = '2026-09-22T12:00:00.000Z'
    const host = await renderWorkspace({
      client: fakeClient({ contacts: [{ ...JANE, _rev: 'rev-1', followUpAt }] }),
      focusContact: { id: JANE._id, action: 'prep', nonce: 1 },
    })
    const text = host.querySelector('#outreach-tracker-detail')!.textContent || ''
    const day = formatSlackDay(followUpAt, new Date())
    expect(text).toMatch(new RegExp(`(Due|Overdue since) ${day}`))
    expect(text).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/)
  })
})

describe('the Outreach page’s money and pulse', () => {
  it('still reads a bare bin as that bin (the older shape; the browser-journey harness sends one)', async () => {
    const host = await renderWorkspace({ client: fakeClient({ financialPosture: 'stable' }) })
    expect(getFinancialPosture('stable')!.strategy).not.toBe(getFinancialPosture('survival')!.strategy)
    expect(host.textContent).toContain(getFinancialPosture('stable')!.strategy)
  })

  it('plans against the runway date, not a stale hand-set bin', async () => {
    const stored = { posture: 'survival', setAt: '2026-07-11T12:00:00.000Z', runway: { certainUntil: '2027-06-01', confirmedAt: '2026-09-20T12:00:00.000Z' } }
    const resolved = resolveRunwayPosture(stored)
    expect(resolved.source).toBe('runway')
    expect(resolved.id).not.toBe('survival')
    const host = await renderWorkspace({ client: fakeClient({ financialPosture: stored }) })
    const strategy = getFinancialPosture(resolved.id)!.strategy
    expect(host.textContent).toContain(strategy)
    expect(host.textContent).not.toContain(getFinancialPosture('survival')!.strategy)
  })

  it('puts This week’s pulse sentence above the tracker pills', async () => {
    const host = await renderWorkspace({})
    const pulse = host.querySelector('[data-outreach-pulse]')
    expect(pulse?.textContent).toMatch(/^Outreach this week: /)
    expect(WORKSPACE).toContain('{outreachPulseSentence(contacts, new Date())}')
    const pills = host.querySelector('[aria-label="Outreach progress summary"]')!
    expect(pulse!.compareDocumentPosition(pills) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// ── Source-level wiring a render cannot show ──────────────────────────────────

describe('Outreach wiring', () => {
  it('declares the landing effect above the loading returns, so the hook order never changes', () => {
    const effect = WORKSPACE.indexOf('if (handledLandings.has(focusContact) || handledLandingKeysRef.current.has(key)) return')
    expect(effect).toBeGreaterThan(0)
    // Handled by object across mounts AND by id + action + nonce within one.
    expect(WORKSPACE).toContain('const key = landingKey(focusContact)')
    expect(WORKSPACE).toContain('handledLandingKeysRef.current.add(key)')
    expect(effect).toBeLessThan(WORKSPACE.indexOf('  if (loading) {'))
    expect(WORKSPACE).toContain('}, [canManageOutreach, contacts, focusContact, loadFailure, loading, recordsLoaded])')
    // Waits for a SUCCESSFUL load: Retry clears the failure before the list arrives.
    expect(WORKSPACE).toContain('if (!canManageOutreach || loading || !recordsLoaded || loadFailure) return')
    expect(WORKSPACE).toContain('logging ? openTrackerLog(contact, row) : showTrackerDetail(contact)')
    expect(WORKSPACE).toContain("revealWhenDrawn(logging ? 'outreach-log-panel' : 'outreach-tracker-detail'")
  })

  it('reads the posture through resolveRunwayPosture, never the raw bin', () => {
    expect(WORKSPACE).toContain('[0]{ posture, setAt, runway }')
    expect(WORKSPACE).toContain('resolveRunwayPosture(storedPosture || {})')
    expect(WORKSPACE).not.toContain('[0].posture')
  })

  it('uses the shared labels and retires the old ones', () => {
    for (const retired of ['Open brief', 'Log result', 'Log interaction for', '>Log interaction<', 'Brief and activity for', 'Close brief']) {
      expect(WORKSPACE, retired).not.toContain(retired)
    }
    expect(WORKSPACE).toContain('{LABEL.PREP}')
    expect(WORKSPACE).toContain('{LABEL.LOG}')
    expect(WORKSPACE).toContain('How did it go?')
    expect(WORKSPACE).toContain("{savingLog ? 'Saving…' : 'Save log'}")
    expect(WORKSPACE).not.toContain('@Marqueta')
    expect(PANEL).not.toContain('@Marqueta')
  })

  it('mounts the outline at the top of call prep, spoken as the reader', () => {
    const detail = WORKSPACE.indexOf('id="outreach-tracker-detail"')
    const panel = WORKSPACE.indexOf('<CallOutlinePanel', detail)
    const card = WORKSPACE.indexOf('{renderPlanCard(trackerDetailContact', detail)
    expect(panel).toBeGreaterThan(detail)
    expect(panel).toBeLessThan(card)
    expect(WORKSPACE).toContain('senderName={studioSenderName(currentUser?.name)}')
    expect(WORKSPACE).toContain("outline?.mode === 'emailFirst' ? 'emailed' : undefined")
    // Green only when a call is what the outline asks for (Slack's rule).
    expect(WORKSPACE).toContain("style={outline && outline.mode !== 'holdOff' ? styles.primaryButton : styles.button}")
  })

  it('names the Recommended next Log it… the way the principal browser journey finds it', () => {
    // scripts/test-marketing-principal-e2e.ts clicks, inside the "Recommended
    // next outreach" region, the button named `Log it for <name>`. Renaming it
    // breaks CI's browser job, which vitest does not run — update both.
    const region = WORKSPACE.slice(WORKSPACE.indexOf('aria-label="Recommended next outreach"'), WORKSPACE.indexOf('data-outreach-pulse="true"'))
    expect(region).toContain('aria-label={`Log it for ${row.name}`}')
    expect(WORKSPACE).not.toMatch(/Log result for/)
  })

  it('keeps one shared style object untouched at module scope in the panel (it arrives through a cycle)', () => {
    const moduleScope = PANEL.slice(0, PANEL.indexOf('export function CallOutlineView('))
    expect(moduleScope).not.toMatch(/\.\.\.styles\.|styles\.\w+\s*[,}]/)
    expect(styles.button).toBeTruthy()
  })
})
