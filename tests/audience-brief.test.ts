import { describe, expect, it } from 'vitest'

import {
  assessReadiness,
  clusterOrganizations,
  coverageGaps,
  summariseSegments,
  type BriefContact,
} from '@/lib/marketing/audienceBrief'

const contacts: BriefContact[] = [
  { organization: 'Mass General Brigham', researchSuggestedSegment: 'provider' },
  { organization: 'Mass General Brigham', researchSuggestedSegment: 'provider' },
  { organization: 'MEDITECH', researchSuggestedSegment: 'healthtech' },
  { organization: 'MEDITECH', researchSuggestedSegment: 'healthtech' },
  { organization: 'MEDITECH', researchSuggestedSegment: 'healthtech' },
  { organization: 'Sanofi', researchSuggestedSegment: 'pharma' },
  { organization: 'ResMed', researchSuggestedSegment: 'medDevice' },
  { organization: 'Umich', researchSuggestedSegment: 'research' },
  { organization: null, researchSuggestedSegment: null },
  { organization: '', researchSuggestedSegment: '' },
]

describe('summariseSegments', () => {
  it('counts by segment and separates buyer-side from the rest', () => {
    const summary = summariseSegments(contacts)
    expect(summary.total).toBe(10)
    expect(summary.unclassified).toBe(2)
    expect(summary.classified).toBe(8)
    // provider 2 + healthtech 3 + pharma 1 + medDevice 1 = 7; research is not a buyer.
    expect(summary.buyerSide).toBe(7)
    expect(summary.rows[0]).toMatchObject({ segment: 'healthtech', count: 3, isBuyer: true })
    expect(summary.rows.find((row) => row.segment === 'research')?.isBuyer).toBe(false)
  })

  it('lets a human-confirmed segment beat the domain suggestion', () => {
    // The suggestion is a guess from an email domain. If someone has actually
    // confirmed the segment, a brief that still counted the guess would rank a
    // machine inference above a person's decision.
    const summary = summariseSegments([
      { organization: 'Acme', researchSuggestedSegment: 'healthtech', segment: 'payer' },
    ])
    expect(summary.rows).toEqual([
      expect.objectContaining({ segment: 'payer', count: 1 }),
    ])
  })

  it('reports zero shares rather than dividing by zero on an empty list', () => {
    const summary = summariseSegments([])
    expect(summary).toMatchObject({ total: 0, classified: 0, unclassified: 0, buyerSide: 0 })
    expect(summary.rows).toEqual([])
  })
})

describe('clusterOrganizations', () => {
  it('names the organisations behind each buyer segment, largest first', () => {
    const clusters = clusterOrganizations(contacts)
    expect(clusters.map((cluster) => cluster.segment)).toEqual([
      'healthtech',
      'provider',
      'pharma',
      'medDevice',
    ])
    expect(clusters[0].organizations).toEqual([{ name: 'MEDITECH', count: 3 }])
    expect(clusters[1].organizations).toEqual([{ name: 'Mass General Brigham', count: 2 }])
  })

  it('excludes non-buyer segments and contacts with no organisation', () => {
    const clusters = clusterOrganizations(contacts)
    expect(clusters.some((cluster) => cluster.segment === 'research')).toBe(false)
    const named = clusters.flatMap((cluster) => cluster.organizations.map((org) => org.name))
    expect(named).not.toContain('')
  })

  it('caps the list per segment', () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      organization: `Org ${index}`,
      researchSuggestedSegment: 'provider',
    }))
    expect(clusterOrganizations(many, { perSegment: 5 })[0].organizations).toHaveLength(5)
    // total still counts everyone, so the cap cannot silently shrink the number.
    expect(clusterOrganizations(many, { perSegment: 5 })[0].total).toBe(25)
  })
})

describe('assessReadiness', () => {
  it('calls a list cold when nothing has ever been logged against it', () => {
    const readiness = assessReadiness({ contacts, checkpointsLogged: 0, interactionsLogged: 0 })
    expect(readiness.isColdList).toBe(true)
    expect(readiness.everContacted).toBe(0)
    expect(readiness.claimedWarm).toBe(0)
    expect(readiness.withOrganization).toBe(8)
  })

  it('stops calling it cold as soon as any real contact exists', () => {
    expect(
      assessReadiness({ contacts, checkpointsLogged: 1, interactionsLogged: 0 }).isColdList,
    ).toBe(false)
    expect(
      assessReadiness({ contacts, checkpointsLogged: 0, interactionsLogged: 3 }).isColdList,
    ).toBe(false)
    expect(
      assessReadiness({
        contacts: [...contacts, { organization: 'X', status: 'meeting' }],
        checkpointsLogged: 0,
        interactionsLogged: 0,
      }).isColdList,
    ).toBe(false)
  })

  it('counts claimed warmth separately so it can never be inferred', () => {
    const readiness = assessReadiness({
      contacts: [{ organization: 'X', warmth: 'warm' }, { organization: 'Y', warmth: 'unknown' }],
      checkpointsLogged: 0,
      interactionsLogged: 0,
    })
    expect(readiness.claimedWarm).toBe(1)
    // Warmth claimed without any logged contact still leaves the list cold.
    expect(readiness.isColdList).toBe(true)
  })
})

describe('coverageGaps', () => {
  it('flags a targeted segment the audience cannot support', () => {
    const gaps = coverageGaps(contacts, ['medDevice', 'healthtech'], 3)
    expect(gaps).toEqual([{ segment: 'medDevice', label: 'Med-Device / Diagnostics', count: 1 }])
  })

  it('flags a targeted segment with no contacts at all', () => {
    expect(coverageGaps(contacts, ['payer'], 3)).toEqual([
      { segment: 'payer', label: 'Payer / Health Plan', count: 0 },
    ])
  })

  it('returns nothing when every targeted segment clears the threshold', () => {
    expect(coverageGaps(contacts, ['healthtech'], 3)).toEqual([])
  })
})
