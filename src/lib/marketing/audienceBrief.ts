/**
 * Who the outreach list actually contains.
 *
 * The Sep–Nov plan is written around warm-network outreach ("call the top-ranked
 * ten warm contacts"), but the list it runs against arrived from EmailOctopus:
 * emails and little else. This module turns that list into the handful of
 * numbers a person needs to decide which segment to lead with, and it is kept
 * pure so the page can be trusted without a Sanity round-trip in a test.
 *
 * Everything here is derived from a domain. A domain can prove where somebody
 * works; it cannot prove that they know us. That distinction is the whole point
 * of the brief, so `readiness` reports contact history separately and never
 * folds it into a "warm" count.
 */

import { OUTREACH_SEGMENT_OPTIONS } from './outreachEnums'

/** Sectors that can actually buy design work, as opposed to peers and students. */
export const BUYER_SEGMENTS = ['provider', 'healthtech', 'pharma', 'payer', 'medDevice'] as const
export type BuyerSegment = (typeof BUYER_SEGMENTS)[number]

export const SEGMENT_LABEL: Record<string, string> = Object.fromEntries(
  OUTREACH_SEGMENT_OPTIONS.map((option) => [option.value, option.title]),
)

export type BriefContact = {
  organization?: string | null
  researchSuggestedSegment?: string | null
  segment?: string | null
  warmth?: string | null
  status?: string | null
  email?: string | null
}

export type SegmentRow = {
  segment: string
  label: string
  count: number
  share: number
  isBuyer: boolean
}

/**
 * Count contacts by their suggested segment.
 *
 * Confirmed `segment` wins when a person has set it — the suggestion is only a
 * stand-in until someone confirms, and a brief that ignored the confirmed value
 * would quietly out-rank human judgement with a domain guess.
 */
export function summariseSegments(contacts: BriefContact[]): {
  rows: SegmentRow[]
  classified: number
  unclassified: number
  buyerSide: number
  total: number
} {
  const counts = new Map<string, number>()
  let unclassified = 0

  for (const contact of contacts) {
    const segment = (contact.segment || contact.researchSuggestedSegment || '').trim()
    if (!segment) {
      unclassified += 1
      continue
    }
    counts.set(segment, (counts.get(segment) || 0) + 1)
  }

  const total = contacts.length
  const rows: SegmentRow[] = [...counts.entries()]
    .map(([segment, count]) => ({
      segment,
      label: SEGMENT_LABEL[segment] || segment,
      count,
      share: total > 0 ? count / total : 0,
      isBuyer: (BUYER_SEGMENTS as readonly string[]).includes(segment),
    }))
    .sort((a, b) => b.count - a.count || a.segment.localeCompare(b.segment))

  const classified = total - unclassified
  const buyerSide = rows.filter((row) => row.isBuyer).reduce((sum, row) => sum + row.count, 0)
  return { rows, classified, unclassified, buyerSide, total }
}

export type OrgCluster = {
  segment: string
  label: string
  organizations: { name: string; count: number }[]
  total: number
}

/**
 * The named organisations behind each buyer segment.
 *
 * A count alone does not tell you whether a segment is worth leading with —
 * "33 providers" could be one hospital or thirty. Naming them is what turns the
 * number into a decision.
 */
export function clusterOrganizations(
  contacts: BriefContact[],
  options: { perSegment?: number } = {},
): OrgCluster[] {
  const perSegment = options.perSegment ?? 10
  const bySegment = new Map<string, Map<string, number>>()

  for (const contact of contacts) {
    const segment = (contact.segment || contact.researchSuggestedSegment || '').trim()
    if (!(BUYER_SEGMENTS as readonly string[]).includes(segment)) continue
    const name = String(contact.organization || '').trim()
    if (!name) continue
    if (!bySegment.has(segment)) bySegment.set(segment, new Map())
    const orgs = bySegment.get(segment)!
    orgs.set(name, (orgs.get(name) || 0) + 1)
  }

  return BUYER_SEGMENTS.filter((segment) => bySegment.has(segment))
    .map((segment) => {
      const orgs = [...bySegment.get(segment)!.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      return {
        segment,
        label: SEGMENT_LABEL[segment] || segment,
        organizations: orgs.slice(0, perSegment),
        total: orgs.reduce((sum, org) => sum + org.count, 0),
      }
    })
    .sort((a, b) => b.total - a.total)
}

export type Readiness = {
  total: number
  withOrganization: number
  everContacted: number
  checkpointsLogged: number
  confirmedSegment: number
  claimedWarm: number
  /** True when the list has no relationship history at all behind it. */
  isColdList: boolean
}

/**
 * Can this list support the outreach plan that was written for it?
 *
 * `isColdList` is deliberately strict: any logged contact or checkpoint at all
 * flips it. A plan that says "call the warm ten" against a list where this is
 * true is not behind schedule, it is missing its input.
 */
export function assessReadiness(input: {
  contacts: BriefContact[]
  checkpointsLogged: number
  interactionsLogged: number
}): Readiness {
  const { contacts, checkpointsLogged, interactionsLogged } = input
  const withOrganization = contacts.filter((contact) => String(contact.organization || '').trim()).length
  const confirmedSegment = contacts.filter((contact) => String(contact.segment || '').trim()).length
  const claimedWarm = contacts.filter((contact) =>
    ['warm', 'hot'].includes(String(contact.warmth || '').trim()),
  ).length
  const everContacted = contacts.filter((contact) =>
    ['contacted', 'responded', 'meeting', 'opportunity'].includes(String(contact.status || '').trim()),
  ).length

  return {
    total: contacts.length,
    withOrganization,
    everContacted,
    checkpointsLogged,
    confirmedSegment,
    claimedWarm,
    isColdList: everContacted === 0 && checkpointsLogged === 0 && interactionsLogged === 0,
  }
}

export type BriefDecision = {
  _id: string
  title: string
  ownerName?: string
  humanQuestion?: string
  dueAt?: string
  priority?: string
}

/**
 * Split decisions into the reader's own and everyone else's.
 *
 * This page is written for one person. A flat list of fourteen decisions makes
 * them hunt for the three that are actually theirs, so the ones they can act on
 * today come first and the rest stay visible as context.
 */
export function groupDecisionsByOwner(
  decisions: BriefDecision[],
  reader: string,
): { mine: BriefDecision[]; others: BriefDecision[] } {
  const target = reader.trim().toLowerCase()
  const mine: BriefDecision[] = []
  const others: BriefDecision[] = []
  for (const decision of decisions) {
    const owner = String(decision.ownerName || '').trim().toLowerCase()
    // Match on the first name too: owners are stored as "Juhan", but a record
    // written as "Juhan Sonin" is the same person and must not fall through.
    const isMine = target !== '' && (owner === target || owner.split(/\s+/)[0] === target)
    ;(isMine ? mine : others).push(decision)
  }
  return { mine, others }
}

export type LeadRecommendation = {
  lead: OrgCluster | null
  doorOpener: OrgCluster | null
  /** Distinct organisations per contact, 0–1. High means spread thin. */
  spread: (cluster: OrgCluster) => number
}

/**
 * Which segment to lead with, derived rather than asserted.
 *
 * The page used to state "lead with providers and health IT" as prose. That was
 * true when it was written and would have quietly kept saying so after the data
 * moved. Deriving it means the headline claim cannot drift away from the table
 * underneath it.
 *
 * `lead` is simply the biggest buyer cluster. `doorOpener` is the one whose
 * contacts are spread thinnest across distinct organisations — one person at
 * each of ten companies is a set of doors to knock on, not a book of business,
 * and that is a different play from a segment where we know nine people at the
 * same hospital.
 */
export function leadRecommendation(clusters: OrgCluster[], allContacts: BriefContact[]): LeadRecommendation {
  const distinctOrgs = new Map<string, Set<string>>()
  for (const contact of allContacts) {
    const segment = (contact.segment || contact.researchSuggestedSegment || '').trim()
    const name = String(contact.organization || '').trim()
    if (!segment || !name) continue
    if (!distinctOrgs.has(segment)) distinctOrgs.set(segment, new Set())
    distinctOrgs.get(segment)!.add(name)
  }
  const spread = (cluster: OrgCluster) => {
    const orgs = distinctOrgs.get(cluster.segment)?.size ?? cluster.organizations.length
    return cluster.total > 0 ? orgs / cluster.total : 0
  }

  const ranked = [...clusters].sort((a, b) => b.total - a.total)
  const lead = ranked[0] ?? null
  // Needs enough contacts to be worth a play at all; below that it is noise.
  const candidates = ranked.filter((cluster) => cluster !== lead && cluster.total >= 5)
  const doorOpener =
    candidates.length > 0
      ? candidates.reduce((best, cluster) => (spread(cluster) > spread(best) ? cluster : best))
      : null

  return { lead, doorOpener, spread }
}

/** A segment named in the strategy that the list cannot actually support. */
export type CoverageGap = {
  segment: string
  label: string
  count: number
}

/**
 * Segments the plan targets but the audience does not contain.
 *
 * Med-device human factors is the live example: it is named in the turnaround
 * plan and has a handful of contacts, so choosing it means cold outreach with
 * no warm entry. Better to see that before committing a quarter to it.
 */
export function coverageGaps(
  contacts: BriefContact[],
  targeted: readonly string[],
  threshold = 10,
): CoverageGap[] {
  const { rows } = summariseSegments(contacts)
  const bySegment = new Map(rows.map((row) => [row.segment, row.count]))
  return targeted
    .map((segment) => ({
      segment,
      label: SEGMENT_LABEL[segment] || segment,
      count: bySegment.get(segment) || 0,
    }))
    .filter((gap) => gap.count < threshold)
    .sort((a, b) => a.count - b.count)
}
