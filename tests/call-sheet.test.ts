// The tool shell first, as the Studio loads it (the call sheet and the shell import each other).
import '@/sanity/tools/marketingTool'

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  buildOutreachCallSheet,
  draftOutreachNote,
  firstNameFor,
  type CallSheetResearchInput,
} from '@/lib/marketing/callSheet'
import { callSheetSender } from '@/sanity/components/marketing/OutreachCallSheet'

const verified = (organization: string, extra: Partial<CallSheetResearchInput> = {}): CallSheetResearchInput => ({
  organization,
  recentSignal: `${organization} announced a thing`,
  reachableAbout: `Ask about the thing at ${organization}`,
  suggestedOfferKey: 'ai-pilot-premortem',
  verification: {
    status: 'verified',
    evidence: [
      {
        url: 'https://example.org/news',
        quote: `${organization} announced a thing`,
        textFragmentUrl: 'https://example.org/news#:~:text=announced',
      },
    ],
  },
  ...extra,
})

const offers = [
  { key: 'ai-pilot-premortem', title: 'AI Pilot Pre-Mortem', oneLiner: 'De-risk a stalled pilot' },
]

describe('buildOutreachCallSheet', () => {
  it('joins verified research to the people who work there', () => {
    const sheet = buildOutreachCallSheet({
      research: [verified('Mass General Brigham')],
      contacts: [
        { name: 'Ada Lovelace', organization: 'Mass General Brigham', role: 'CMIO' },
        { name: 'Alan Turing', organization: 'mass general brigham' },
      ],
      offers,
    })
    expect(sheet).toHaveLength(1)
    expect(sheet[0].contacts.map((c) => c.name)).toEqual(['Ada Lovelace', 'Alan Turing'])
    expect(sheet[0].offer?.title).toBe('AI Pilot Pre-Mortem')
    expect(sheet[0].sourceUrl).toContain('#:~:text=')
  })

  it('EXCLUDES research that was not verified', () => {
    // The point of the whole verification pipeline: an unverified signal must
    // never reach the page where somebody picks up the phone.
    for (const status of ['overreach', 'unsupported', 'unchecked', undefined]) {
      const sheet = buildOutreachCallSheet({
        research: [verified('Acme', { verification: { status, evidence: [{ quote: 'x', url: 'u' }] } })],
        contacts: [{ name: 'Someone', organization: 'Acme' }],
      })
      expect(sheet).toEqual([])
    }
  })

  it('excludes an organisation with nobody to call', () => {
    expect(
      buildOutreachCallSheet({ research: [verified('Nobody Inc')], contacts: [] }),
    ).toEqual([])
  })

  it('leaves out people who are already in conversation', () => {
    const sheet = buildOutreachCallSheet({
      research: [verified('Acme')],
      contacts: [
        { name: 'Fresh', organization: 'Acme' },
        { name: 'Already Talking', organization: 'Acme', status: 'meeting' },
      ],
    })
    expect(sheet[0].contacts.map((c) => c.name)).toEqual(['Fresh'])
  })

  it('puts the organisation where we have the most people first', () => {
    const sheet = buildOutreachCallSheet({
      research: [verified('One Person Co'), verified('Three People Co')],
      contacts: [
        { name: 'A', organization: 'One Person Co' },
        { name: 'B', organization: 'Three People Co' },
        { name: 'C', organization: 'Three People Co' },
        { name: 'D', organization: 'Three People Co' },
      ],
    })
    expect(sheet.map((entry) => entry.organization)).toEqual(['Three People Co', 'One Person Co'])
  })

  it('caps the week and the people per organisation', () => {
    const research = Array.from({ length: 9 }, (_, i) => verified(`Org ${i}`))
    const contacts = research.flatMap((entry) =>
      Array.from({ length: 6 }, (_, i) => ({ name: `P${i}`, organization: entry.organization })),
    )
    const sheet = buildOutreachCallSheet({ research, contacts, limit: 3, maxContactsPerOrg: 2 })
    expect(sheet).toHaveLength(3)
    expect(sheet[0].contacts).toHaveLength(2)
  })

  it('carries context through but keeps it separate from the signal', () => {
    const sheet = buildOutreachCallSheet({
      research: [verified('Acme', { context: 'Unverified background' })],
      contacts: [{ name: 'A', organization: 'Acme' }],
    })
    expect(sheet[0].context).toBe('Unverified background')
    expect(sheet[0].signal).not.toContain('Unverified background')
  })
})

describe('draftOutreachNote', () => {
  const sheet = buildOutreachCallSheet({
    research: [verified('Cityblock Health')],
    contacts: [{ name: 'Ada Lovelace', organization: 'Cityblock Health' }],
    offers,
  })

  it('opens with their news, not with us', () => {
    const note = draftOutreachNote(sheet[0])
    expect(note.startsWith('Hi Ada,')).toBe(true)
    expect(note).toContain('I saw that Cityblock Health announced a thing')
    // Their news must appear before anything about our offer.
    expect(note.indexOf('I saw that')).toBeLessThan(note.indexOf('AI Pilot Pre-Mortem'))
  })

  it('offers help rather than pitching', () => {
    const note = draftOutreachNote(sheet[0])
    expect(note).toMatch(/Happy to just talk it through/)
    // The offer's one-liner already ends in a period; we must not add a second.
    expect(note).not.toMatch(/\.\./)
    expect(note).not.toMatch(/capabilit(y|ies) deck|schedule a demo|synergy/i)
  })

  it('still works when we have no name or no matching offer', () => {
    const anonymous = buildOutreachCallSheet({
      research: [verified('Acme')],
      contacts: [{ organization: 'Acme' }],
    })
    const note = draftOutreachNote(anonymous[0], 'Shirley')
    expect(note.startsWith('Hi,')).toBe(true)
    expect(note).toContain('no pitch attached')
    expect(note.trimEnd().endsWith('— Shirley, GoInvo')).toBe(true)
  })
})

describe('firstNameFor', () => {
  it('uses a real name when there is one', () => {
    expect(firstNameFor({ name: 'Ada Lovelace' })).toBe('Ada')
  })

  it('never greets someone by their email address', () => {
    // The newsletter import put the email into `name`, and "Hi
    // scott.shreeve@crossoverhealth.com," announces that a machine wrote it.
    expect(firstNameFor({ name: 'scott.shreeve@crossoverhealth.com' })).toBe('Scott')
    expect(firstNameFor({ email: 'nate.murray@crossoverhealth.com' })).toBe('Nate')
  })

  it('gives up rather than guess a wrong name', () => {
    // A wrong name is worse than no name.
    expect(firstNameFor({ email: 'jsmith12@acme.com' })).toBe('')
    // An initial glued to a surname yields "Lgartley", which is not a name.
    expect(firstNameFor({ email: 'lgartley@segterra.com' })).toBe('')
    expect(firstNameFor({ email: 'gblander@insidetracker.com' })).toBe('')
    expect(firstNameFor({ email: 'hr@acme.com' })).toBe('')
    expect(firstNameFor({})).toBe('')
  })
})

describe('draftOutreachNote framing', () => {
  it('introduces the opening instead of gluing a fragment onto the news', () => {
    const sheet = buildOutreachCallSheet({
      research: [verified('Acme', { reachableAbout: 'The just-completed merger of two organizations' })],
      contacts: [{ name: 'Ada Lovelace', organization: 'Acme' }],
    })
    const note = draftOutreachNote(sheet[0])
    expect(note).toContain('What caught my eye: The just-completed merger')
  })
})

describe('the call sheet on This week', () => {
  const source = readFileSync('src/sanity/components/marketing/OutreachCallSheet.tsx', 'utf8').replace(/\r\n/g, '\n')
  const sheet = buildOutreachCallSheet({
    research: [verified('Cityblock Health')],
    contacts: [{ _id: 'marketingContact.ada', name: 'Ada Lovelace', organization: 'Cityblock Health' }],
    offers,
  })

  it('signs the draft as whoever is copying it, never a fixed colleague', () => {
    // It used to sign every draft "— Juhan", whoever sent it.
    expect(source).not.toContain("'Juhan'")
    expect(source).toContain('const senderName = callSheetSender(explicitSender, currentUser?.name)')
    expect(callSheetSender(undefined, 'Shirley Xu')).toBe('Shirley')
    expect(callSheetSender('Eric', 'Shirley Xu')).toBe('Eric')
    expect(draftOutreachNote(sheet[0], callSheetSender(undefined, 'Shirley Xu')).trimEnd().endsWith('— Shirley, GoInvo')).toBe(true)
  })

  it('leaves a placeholder, not somebody else’s name, when it has no name to use', () => {
    expect(callSheetSender(undefined, '')).toBe('[your name]')
    expect(callSheetSender('  ', null)).toBe('[your name]')
    expect(draftOutreachNote(sheet[0], callSheetSender(undefined, undefined)).trimEnd().endsWith('— [your name], GoInvo')).toBe(true)
  })

  it('is headed the way the Monday plan names the same list', () => {
    expect(source).toContain("const CALL_SHEET_HEADING = 'Who to reach out to, and why now'")
    expect(source.match(/\{CALL_SHEET_HEADING\}/g)).toHaveLength(3)
    expect(source).not.toContain('Your outreach this week')
  })

  it('gives each organisation a Prep that opens its first person on Outreach', () => {
    expect(source).toContain('onPrepContact?: (contactId: string) => void')
    expect(source).toContain('{onPrepContact && firstContact?._id && (')
    expect(source).toContain('onClick={() => onPrepContact(firstContact._id as string)}')
    expect(source).toContain('{LABEL.PREP}')
    // Prep leads the row.
    const row = source.slice(source.indexOf('{onPrepContact && firstContact?._id && ('), source.indexOf('read the source ↗'))
    expect(row.indexOf('{LABEL.PREP}')).toBeLessThan(row.indexOf('Copy draft note'))
  })

  it('draws Prep plain, as This week’s Follow-ups due rows draw theirs — no green in the row', () => {
    // §2.3 stars Log it…, not Prep. It was green here while the follow-up
    // rows one section up drew theirs plain, so the page showed up to five
    // green Preps under grey ones for the same action.
    const row = source.slice(source.indexOf('{onPrepContact && firstContact?._id && ('), source.indexOf('read the source ↗'))
    expect(row).not.toMatch(/styles\.primaryButton/)
    const prepStyle = (text: string) => {
      const button = text.slice(0, text.indexOf('{LABEL.PREP}'))
      return /style=\{([^}]+)\}/.exec(button.slice(button.lastIndexOf('<button')))?.[1]
    }
    const week = readFileSync('src/sanity/components/marketing/WeeklyPlanWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')
    expect(prepStyle(row)).toBe('styles.button')
    expect(prepStyle(week), 'This week’s follow-up Prep').toBe(prepStyle(row))
  })
})
