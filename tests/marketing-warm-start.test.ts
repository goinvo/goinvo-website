import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  appendIntakeDraftEntries,
  buildWarmStartSuggestions,
  mergeWarmStartSuggestionsIntoIntake,
} from '@/lib/marketing'

describe('buildWarmStartSuggestions', () => {
  it('turns case-study clients into org-level entries with the case study as how-we-know', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [{ client: 'IPSOS', title: 'Ipsos Facto' }],
    })
    expect(out).toEqual([
      {
        name: 'IPSOS',
        organization: 'IPSOS',
        howWeKnow: 'Past client — “Ipsos Facto”',
        kind: 'client-org',
      },
    ])
  })

  it('merges the same client across case studies (case-insensitive) and sorts orgs alphabetically', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'Mount Sinai Hospital', title: 'Genetic Heroes' },
        { client: '3M', title: 'CodeRyte NLP' },
        { client: 'mount sinai hospital', title: 'Consent Redesign' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['3M', 'Mount Sinai Hospital'])
    expect(out[1].howWeKnow).toBe('Past client — “Genetic Heroes”, “Consent Redesign”')
  })

  it('dedupes repeated titles for the same client (a published doc + its open draft)', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'IPSOS', title: 'Ipsos Facto' },
        { client: 'IPSOS', title: 'Ipsos Facto' },
      ],
    })
    expect(out[0].howWeKnow).toBe('Past client — “Ipsos Facto”')
  })

  it('drops self-references and junk org labels', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'GoInvo', title: 'Own thing' },
        { client: 'GoInvo Studio', title: 'Own thing 2' },
        { client: 'Feature', title: 'Placeholder' },
        { client: '3M', title: 'Real' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['3M'])
  })

  it('drops current, hidden, and alumni team members plus obvious non-callable account labels', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: 'Federal, State and Local Government', title: 'Public-sector collection' },
        { client: 'Various clients', title: 'Portfolio' },
        { client: 'Acme Health / Beta Health', title: 'Combined write-up' },
        { client: 'Johnson & Johnson', title: 'Real account' },
      ],
      thankedPeople: [
        {
          text: [
            'Jen Patel',
            'Eric Benoit',
            'Sharon Lee',
            'Juhan Sonin',
            'Huahua Zhu',
            'GoInvo team',
            'Jane Buyer',
            'Peter Jones and Danny van Leeuwen',
          ].join('\n'),
          featureTitle: 'A',
        },
      ],
      teamMembers: [
        { name: 'Jen Patel' },
        { name: 'Eric Benoit' },
        { name: 'Sharon Lee' },
        { name: 'Juhan Sonin' },
        { name: 'Huahua Zhu' },
      ],
    })
    expect(out.map((suggestion) => suggestion.name)).toEqual(['Jane Buyer', 'Johnson & Johnson'])
  })

  it('loads every team-directory record for exclusion instead of applying roster filters', () => {
    const source = readFileSync(
      'src/sanity/components/marketing/OutreachWorkspace.tsx',
      'utf8',
    )
    const teamQuery = '"teamMembers": *[_type == "teamMember" && defined(name)]{name}'

    expect(source).toContain(teamQuery)
    expect(source).toContain("client.withConfig({ perspective: 'raw', useCdn: false })")
    expect(source).toContain('Could not verify the team directory, so no outreach suggestions were shown.')
    expect(source).not.toContain('isAlumni != true')
    expect(source).not.toContain('showOnAboutPage != false')
  })

  it('splits thanked people one per line, skipping prose-looking lines, and lists people before orgs', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [{ client: '3M', title: 'Real' }],
      thankedPeople: [
        {
          text: 'Peter Jones\nDanny van Leeuwen\n\nSpecial thanks to everyone who reviewed drafts: too many to name.\n',
          featureTitle: 'Determinants of Health',
        },
      ],
    })
    expect(out.map((s) => `${s.kind}:${s.name}`)).toEqual([
      'thanked-person:Peter Jones',
      'thanked-person:Danny van Leeuwen',
      'client-org:3M',
    ])
    expect(out[0].howWeKnow).toBe('Thanked on “Determinants of Health”')
    expect(out[0].organization).toBeUndefined()
  })

  it('drops a thanked person who already exists as a contact EVEN when that contact has an organization', () => {
    // The regression the review caught: intake-parsed contacts usually carry an
    // organization, so a name+org key would never match the org-less suggestion.
    const out = buildWarmStartSuggestions({
      thankedPeople: [{ text: 'Danny van Leeuwen\nJane Roe', featureTitle: 'A' }],
      existingContacts: [{ name: 'Danny van Leeuwen', organization: 'Health Hats' }],
    })
    expect(out.map((s) => s.name)).toEqual(['Jane Roe'])
  })

  it('drops a client org once ANY existing contact belongs to that org (named person at the account)', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [
        { client: '3M', title: 'Real' },
        { client: 'AHRQ', title: 'Guides' },
      ],
      existingContacts: [{ name: 'Jane Doe', organization: '3M' }],
    })
    expect(out.map((s) => s.name)).toEqual(['AHRQ'])
  })

  it('drops a client org that exists as an org-level contact (name = org, from a prior warm-start add)', () => {
    const out = buildWarmStartSuggestions({
      caseStudyClients: [{ client: '3M', title: 'Real' }],
      existingContacts: [{ name: '3M', organization: '3M' }],
    })
    expect(out).toEqual([])
  })

  it('dedupes repeated thanked people across features', () => {
    const out = buildWarmStartSuggestions({
      thankedPeople: [
        { text: 'Jane Roe', featureTitle: 'A' },
        { text: 'Jane Roe', featureTitle: 'B' },
      ],
    })
    expect(out.map((s) => s.name)).toEqual(['Jane Roe'])
  })

  it('handles empty/missing input without throwing', () => {
    expect(buildWarmStartSuggestions({})).toEqual([])
    expect(
      buildWarmStartSuggestions({
        caseStudyClients: [{ client: null, title: null }],
        thankedPeople: [{ text: null, featureTitle: null }],
        existingContacts: [{ name: null, organization: null }],
      }),
    ).toEqual([])
  })
})

describe('mergeWarmStartSuggestionsIntoIntake', () => {
  it('appends selected people and accounts to the editable intake draft', () => {
    const result = mergeWarmStartSuggestionsIntoIntake(['Existing Person — Acme'], [
      {
        name: 'Peter Jones',
        howWeKnow: 'Thanked on “Test. Treat. Trace.”',
        kind: 'thanked-person',
      },
      {
        name: '3M',
        organization: '3M',
        howWeKnow: 'Past client — “Natural Language Processing (NLP) Software for 3M”',
        kind: 'client-org',
      },
    ])

    expect(result).toEqual({
      entries: [
        'Existing Person — Acme',
        'Peter Jones — how we know: Thanked on “Test. Treat. Trace.”',
        '3M — account placeholder — organization: 3M — how we know: Past client — “Natural Language Processing (NLP) Software for 3M”',
      ],
      addedCount: 2,
    })
  })

  it('preserves the draft and skips selected lines already present', () => {
    const current = ['Intro note', 'PETER JONES — HOW WE KNOW: THANKED ON “TEST. TREAT. TRACE.”']
    const result = mergeWarmStartSuggestionsIntoIntake(current, [
      {
        name: 'Peter Jones',
        howWeKnow: 'Thanked on “Test. Treat. Trace.”',
        kind: 'thanked-person',
      },
    ])

    expect(result).toEqual({ entries: current, addedCount: 0 })
  })
})

describe('appendIntakeDraftEntries', () => {
  it('turns every pasted line into an ordered, trimmed entry', () => {
    expect(
      appendIntakeDraftEntries(['Existing Person — Acme'], ' Peter Jones — Health Hats \r\n\r\n3M — account placeholder '),
    ).toEqual({
      entries: [
        'Existing Person — Acme',
        'Peter Jones — Health Hats',
        '3M — account placeholder',
      ],
      addedCount: 2,
    })
  })

  it('does not add a duplicate entry with different casing or whitespace', () => {
    expect(
      appendIntakeDraftEntries(
        ['Peter Jones — Health Hats'],
        ' peter   jones — health hats \nDafna Gold Melchior',
      ),
    ).toEqual({
      entries: ['Peter Jones — Health Hats', 'Dafna Gold Melchior'],
      addedCount: 1,
    })
  })

  it('treats a blank draft as a no-op', () => {
    expect(appendIntakeDraftEntries(['Peter Jones'], ' \r\n  ')).toEqual({
      entries: ['Peter Jones'],
      addedCount: 0,
    })
  })
})
