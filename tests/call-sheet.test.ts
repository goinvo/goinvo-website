import { describe, expect, it } from 'vitest'

import {
  buildOutreachCallSheet,
  draftOutreachNote,
  firstNameFor,
  type CallSheetResearchInput,
} from '@/lib/marketing/callSheet'

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
