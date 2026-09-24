import { describe, expect, it } from 'vitest'

import {
  buildCallOutlineMessages,
  buildPrepCandidatesBlocks,
  buildPrepListBlocks,
  composeCallOutline,
  newContactDocument,
  parsePrepRequest,
  resolvePrepTarget,
  type CallOutline,
  type PrepContact,
  type PrepEvidence,
  type PrepOffer,
  type PrepResearch,
  type PrepTargetMatch,
} from '@/lib/marketing/callPrep'
import { CALL_ASK, PREMORTEM_QUESTION } from '@/lib/marketing/executionPlan'
import { MARQUETA_ACTION, decodeContactRef, encodeContactRef } from '@/lib/marketing/marquetaActions'
import { decodeSlackText } from '@/lib/marketing/slackText'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

// Thursday 24 September 2026, 11:00 in Arlington.
const NOW = new Date('2026-09-24T15:00:00Z')

const HOSTILE = `<!here> R&D <5% ${'x'.repeat(5000)} <@U123> & more`

const offers: PrepOffer[] = [
  {
    key: 'ai-pilot-premortem',
    title: 'Clinical AI Pilot Pre-Mortem',
    oneLiner: 'A fixed-scope 4–6 week de-risk of a stalled or pre-launch clinical AI pilot.',
    proofPoints: 'Ipsos Facto: 90%+ internal adoption.',
  },
  {
    key: 'human-factors-510k',
    title: 'Human Factors & Usability for FDA Submissions',
    oneLiner: 'IEC 62366 / 510(k)-ready usability engineering.',
    proofPoints: '20 years shipping regulated software.',
  },
  {
    key: 'clinician-adoption-rescue',
    title: 'Clinician Adoption Rescue',
    oneLiner: 'Diagnose and fix why clinicians route around your software.',
    proofPoints: '3M/CodeRyte: 200% coding-efficiency gain.',
  },
]

const evidence: PrepEvidence[] = [
  { _id: 'ev-ipsos', title: 'Ipsos Facto', client: 'Ipsos' },
  { _id: 'ev-coderyte', title: 'CodeRyte coding assistant', client: '3M' },
  { _id: 'ev-hhs', title: 'HHS open data' },
]

const verifiedResearch = (organization: string, extra: Partial<PrepResearch> = {}): PrepResearch => ({
  organization,
  recentSignal: `${organization} spun out AIwithCare in December`,
  reachableAbout: 'how AIwithCare gets clinicians to adopt its tools',
  suggestedOfferKey: 'ai-pilot-premortem',
  context: 'VERIFIED-RECORD-CONTEXT',
  verification: {
    status: 'verified',
    evidence: [
      {
        url: 'https://example.org/news',
        quote: 'fewer than <5% of pilots scale & most stall',
        textFragmentUrl: 'https://example.org/news#:~:text=pilots',
      },
    ],
  },
  ...extra,
})

const contact = (overrides: Partial<PrepContact> & { _id: string }): PrepContact => ({
  name: 'Jane Doe',
  organization: 'Mass General Brigham',
  role: 'CMIO',
  segment: 'provider',
  warmth: 'warm',
  status: 'researched',
  ...overrides,
})

function outlineFor(
  match: Exclude<PrepTargetMatch, { kind: 'ambiguous' }>,
  extra: Partial<Parameters<typeof composeCallOutline>[0]> = {},
): CallOutline {
  return composeCallOutline({
    match,
    research: [],
    offers,
    evidence,
    senderName: 'Juhan',
    includeContactDetails: false,
    now: NOW,
    ...extra,
  })
}

/** The words a caller may read out: everything except Background and the labelled caveats. */
function sayThisMaterial(outline: CallOutline): string {
  return JSON.stringify({
    cheatSheet: outline.cheatSheet,
    ifTheySay: outline.ifTheySay,
    voicemail: outline.voicemail,
    email: outline.email,
    brief: outline.brief,
    questions: outline.questions,
    plan: outline.plan,
    agenda: outline.agenda,
    whyNow: outline.whyNow,
    offer: outline.offer,
  })
}

/** Every mrkdwn string in a message (plain_text is not parsed by Slack, so it cannot ping). */
function mrkdwnIn(blocks: Block[]): string[] {
  const out: string[] = []
  const visit = (value: any) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach(visit)
    if (value.type === 'mrkdwn' && typeof value.text === 'string') out.push(value.text)
    Object.values(value).forEach(visit)
  }
  visit(blocks)
  return out
}

function buttons(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => [
    ...(block.type === 'actions' ? block.elements : []),
    ...(block.accessory ? [block.accessory] : []),
  ])
}

// ── Parsing ──────────────────────────────────────────────────────────────────

describe('parsePrepRequest', () => {
  const cases: [string, Partial<{ name: string; organization: string; role: string; note: string }>][] = [
    ['prep Jane Doe, CMIO at Acme — met her at HIMSS', { name: 'Jane Doe', role: 'CMIO', organization: 'Acme', note: 'met her at HIMSS' }],
    ['prep someone at Acme', { name: '', organization: 'Acme', role: '' }],
    ['prep Acme', { name: '', organization: 'Acme' }],
    ['prepare me for my call with Jane Doe tomorrow', { name: 'Jane Doe', organization: '' }],
    ['call prep for Jane at Mass General Brigham', { name: 'Jane', organization: 'Mass General Brigham' }],
    ['outline for calling the CMIO at Acme on Friday', { name: '', role: 'CMIO', organization: 'Acme' }],
    ["brief me on Acme's CMIO", { name: '', role: 'CMIO', organization: 'Acme' }],
    ['script for Jane Doe at Acme at 3pm', { name: 'Jane Doe', organization: 'Acme' }],
    ['draft an email to Jane Doe at Acme', { name: 'Jane Doe', organization: 'Acme' }],
    ['help me call Jane Doe', { name: 'Jane Doe', organization: '' }],
    ['can you prep Jane Doe at Acme next week?', { name: 'Jane Doe', organization: 'Acme' }],
    [
      'could you please prep a call with Scott Shreeve at Crossover Health this week',
      { name: 'Scott Shreeve', organization: 'Crossover Health' },
    ],
    ['I need you to prep Jane Doe at Acme today', { name: 'Jane Doe', organization: 'Acme' }],
    ['prep Jane Doe (CMIO) at Acme', { name: 'Jane Doe', role: 'CMIO', organization: 'Acme' }],
    ["get me ready for Jane Doe from Acme; she's worried about adoption", { name: 'Jane Doe', organization: 'Acme', note: "she's worried about adoption" }],
    ['prep Dr. Jane Doe at St. Jude', { name: 'Jane Doe', organization: 'St. Jude' }],
    ['prep someone at 3M', { name: '', organization: '3M' }],
    ['prep Jane at Health at Scale', { name: 'Jane', organization: 'Health at Scale' }],
    ['prep Jane Doe who I met at HIMSS', { name: 'Jane Doe', note: 'who I met at HIMSS' }],
    ['prep Head of Product at Acme', { name: '', role: 'Head of Product', organization: 'Acme' }],
    ['prep Dean Smith at Acme', { name: 'Dean Smith', role: '', organization: 'Acme' }],
    ['Marqueta, prep US Foods', { name: '', organization: 'US Foods' }],
    ['prep the CMIO at Mass General Brigham tomorrow at 10:30', { role: 'CMIO', organization: 'Mass General Brigham' }],
    ['prep Jane Doe, Acme Health', { name: 'Jane Doe', organization: 'Acme Health', role: '' }],
    ['prep Jane Doe, VP Product, Acme', { name: 'Jane Doe', role: 'VP Product', organization: 'Acme' }],
    ['prep mgb.org', { name: '', organization: 'mgb.org' }],
    ['prep me for my meeting with Sam Rivera at Acme on Friday', { name: 'Sam Rivera', organization: 'Acme' }],
    ['help me reach Jane Doe at Acme', { name: 'Jane Doe', organization: 'Acme' }],
    ['prep Reach Health', { name: '', organization: 'Reach Health' }],
    ['Brief me on Acme', { name: '', organization: 'Acme' }],
    ['prep someone at The Broad Institute', { name: '', organization: 'The Broad Institute' }],
    // The time takes its own words with it — nothing is left glued to the organisation.
    ['prep Jane at Acme this Friday afternoon', { name: 'Jane', organization: 'Acme', role: '' }],
    ['prep Jane at Mass General Brigham on Friday morning', { name: 'Jane', organization: 'Mass General Brigham' }],
    ['prep Jane at Acme for tomorrow', { name: 'Jane', organization: 'Acme' }],
    ['prep Jane at Acme by Friday', { name: 'Jane', organization: 'Acme' }],
    ['prep Jane at Acme at 10am ET', { name: 'Jane', organization: 'Acme' }],
    ['prep Jane at Acme tmrw', { name: 'Jane', organization: 'Acme' }],
    ['prep Jane at Acme in the morning', { name: 'Jane', organization: 'Acme' }],
    ['prep Jane for tomorrow at Acme', { name: 'Jane', organization: 'Acme' }],
    ["prep me for tomorrow's call with Jane Doe", { name: 'Jane Doe', organization: '' }],
    ['prep someone at Mt Sinai at 3pm', { name: '', organization: 'Mt Sinai' }],
    // A preposition is only an orphan when a time was taken from beside it.
    ['prep Jane at Hands On', { name: 'Jane', organization: 'Hands On' }],
    ['prep Jane at Acme for Friday', { name: 'Jane', organization: 'Acme' }],
    // A title can come after the organisation, or say where they work with "of".
    ['prep Jane at Acme, CMIO', { name: 'Jane', organization: 'Acme', role: 'CMIO' }],
    ['prep Jane Doe, Acme, CMIO', { name: 'Jane Doe', organization: 'Acme', role: 'CMIO' }],
    ['prep the CIO of Acme', { name: '', organization: 'Acme', role: 'CIO' }],
    ['prep Jane Doe, CIO of Acme', { name: 'Jane Doe', organization: 'Acme', role: 'CIO' }],
    ['prep the Dean of Harvard Medical School', { name: '', organization: 'Harvard Medical School', role: 'Dean' }],
    ['prep Acme CMIO', { name: '', organization: 'Acme', role: 'CMIO' }],
    ['prep Mass General Brigham Chief Medical Officer', { name: '', organization: 'Mass General Brigham', role: 'Chief Medical Officer' }],
    ['prep Boston Medical Center CIO', { name: '', organization: 'Boston Medical Center', role: 'CIO' }],
    ['prep Jane Doe CMIO', { name: 'Jane Doe', organization: '', role: 'CMIO' }],
    // …but a title that is all title stays whole.
    ['prep Head of Product', { name: '', organization: '', role: 'Head of Product' }],
    ['prep the VP of Clinical Informatics', { name: '', organization: '', role: 'VP of Clinical Informatics' }],
    ['prep Chief of Staff at Acme', { name: '', organization: 'Acme', role: 'Chief of Staff' }],
    ['prep the director of nursing', { name: '', organization: '', role: 'director of nursing' }],
  ]

  it.each(cases)('%s', (text, expected) => {
    const parsed = parsePrepRequest(text)
    expect(parsed).toMatchObject(expected)
    expect(parsed.raw).toBe(text)
  })

  it('reads what Slack actually delivers, once decoded', () => {
    expect(parsePrepRequest(decodeSlackText('prep a call with AT&amp;T'))).toMatchObject({ organization: 'AT&T', name: '' })
    expect(parsePrepRequest(decodeSlackText('prep <mailto:jane@mgb.org|jane@mgb.org>'))).toMatchObject({
      name: 'jane@mgb.org',
      organization: '',
    })
    expect(parsePrepRequest(decodeSlackText('<@U0BOT> prep <http://mgb.org|mgb.org>'))).toMatchObject({ organization: 'mgb.org' })
  })

  it('keeps a typed email out of the name but in raw, for the resolver', () => {
    const parsed = parsePrepRequest('prep Jane Doe jane@mgb.org')
    expect(parsed.name).toBe('Jane Doe')
    expect(parsed.raw).toContain('jane@mgb.org')
  })

  it('never throws, whatever it is given', () => {
    for (const input of ['', 'prep', '   ', '— — —', '((((', HOSTILE, 'at at at', undefined as unknown as string, null as unknown as string]) {
      const parsed = parsePrepRequest(input)
      expect(typeof parsed.name).toBe('string')
      expect(typeof parsed.organization).toBe('string')
    }
    expect(parsePrepRequest('prep')).toMatchObject({ name: '', organization: '', role: '', note: '' })
  })
})

// ── Resolution ───────────────────────────────────────────────────────────────

describe('resolvePrepTarget', () => {
  const jane = contact({ _id: 'c-jane', email: 'jane.doe@mgb.org' })
  const bob = contact({ _id: 'c-bob', name: 'Bob Roe', role: 'CIO', warmth: 'cold', status: 'contacted' })
  const ann = contact({ _id: 'c-ann', name: 'Ann Lee', role: 'VP', warmth: 'hot', status: 'researched' })
  const zed = contact({ _id: 'c-zed', name: 'Zed Zo', role: 'CTO', warmth: 'warm', status: 'new' })
  const scott = contact({
    _id: 'c-scott',
    name: 'scott.shreeve@crossoverhealth.com',
    organization: 'Crossover Health',
    segment: 'healthtech',
  })
  const janeAcme = contact({ _id: 'c-jane-acme', name: 'Jane Smith', organization: 'Acme Health' })
  const nameless = contact({ _id: 'c-nameless', name: 'nobody@mgb.org', organization: '', email: 'nobody@mgb.org' })
  const people = [jane, bob, ann, zed, scott, janeAcme]
  const resolve = (text: string, list = people, research: PrepResearch[] = []) =>
    resolvePrepTarget(parsePrepRequest(text), list, research)

  it('finds a person by full name', () => {
    expect(resolve('prep Jane Doe')).toEqual({ kind: 'contact', contact: jane })
  })

  it('finds a person by a typed email, exactly', () => {
    expect(resolve('prep jane.doe@mgb.org')).toEqual({ kind: 'contact', contact: jane })
    expect(resolve('prep scott.shreeve@crossoverhealth.com')).toEqual({ kind: 'contact', contact: scott })
  })

  it('reads a first.last email as a name — both ways round', () => {
    expect(resolve('prep Scott Shreeve')).toEqual({ kind: 'contact', contact: scott })
    const typed = contact({ _id: 'c-typed', name: 'Scott Shreeve', email: 'scott.shreeve@crossoverhealth.com' })
    // A different address for a name we know: offer the person on file rather than guess.
    expect(resolvePrepTarget(parsePrepRequest('prep scott.shreeve@example.org'), [typed])).toEqual({
      kind: 'ambiguous',
      candidates: [{ label: 'Scott Shreeve, CMIO — Mass General Brigham', contactId: 'c-typed', organization: 'Mass General Brigham' }],
    })
    expect(resolvePrepTarget(parsePrepRequest('prep scott.shreeve@crossoverhealth.com'), [typed])).toEqual({ kind: 'contact', contact: typed })
  })

  it('treats a first name hitting two people as ambiguous — unless the org narrows it', () => {
    const match = resolve('prep Jane')
    expect(match.kind).toBe('ambiguous')
    if (match.kind === 'ambiguous') {
      expect(match.candidates.map((candidate) => candidate.contactId).sort()).toEqual(['c-jane', 'c-jane-acme'])
      expect(match.candidates.find((candidate) => candidate.contactId === 'c-jane')?.label).toBe(
        'Jane Doe, CMIO — Mass General Brigham',
      )
    }
    expect(resolve('prep Jane at Acme')).toEqual({ kind: 'contact', contact: janeAcme })
    expect(resolve('prep Jane at MGB')).toEqual({ kind: 'contact', contact: jane })
  })

  it('prefers the person at the named organisation when two share a name', () => {
    const twin = contact({ _id: 'c-twin', organization: 'Beta Corp' })
    expect(resolve('prep Jane Doe at Beta Corp', [jane, twin])).toEqual({ kind: 'contact', contact: twin })
    expect(resolve('prep Jane Doe at Mass General', [jane, twin])).toEqual({ kind: 'contact', contact: jane })
    expect(resolve('prep Jane Doe', [jane, twin]).kind).toBe('ambiguous')
  })

  it('caps candidates at five', () => {
    const many = Array.from({ length: 7 }, (_, index) => contact({ _id: `c-${index}`, name: `Jane Person${index}` }))
    const match = resolve('prep Jane', many)
    expect(match.kind).toBe('ambiguous')
    if (match.kind === 'ambiguous') expect(match.candidates).toHaveLength(5)
  })

  it('matches an organisation by name, containment, acronym and email domain', () => {
    for (const text of ['prep Mass General Brigham', 'prep Brigham', 'prep MGB', 'prep mgb.org', 'prep someone at mass general brigham']) {
      const match = resolve(text, [jane, bob, ann, zed, nameless])
      expect(match.kind, text).toBe('organization')
      if (match.kind === 'organization') {
        expect(match.organization).toBe('Mass General Brigham')
        expect(match.contacts.map((entry) => entry._id)).toContain('c-nameless')
      }
    }
  })

  it('sorts an organisation: not yet contacted, then warmth, then name', () => {
    const match = resolve('prep MGB', [bob, zed, jane, ann])
    expect(match.kind).toBe('organization')
    if (match.kind === 'organization') {
      // Ann (hot), then Jane and Zed (warm, by name), then Bob (already contacted).
      expect(match.contacts.map((entry) => entry._id)).toEqual(['c-ann', 'c-jane', 'c-zed', 'c-bob'])
    }
  })

  it('does not find "care" inside "healthcare", or an organisation in a free-mail domain', () => {
    const acmeHealthcare = contact({ _id: 'c-hc', organization: 'Acme Healthcare' })
    expect(resolve('prep Care', [acmeHealthcare]).kind).toBe('none')
    const gmail = contact({ _id: 'c-gmail', name: 'Pat Gee', organization: '', email: 'pat.gee@gmail.com' })
    expect(resolve('prep gmail.com', [gmail]).kind).toBe('none')
  })

  it('knows an organisation from research alone', () => {
    const match = resolve('prep Ochsner', people, [verifiedResearch('Ochsner Health')])
    expect(match).toEqual({ kind: 'organization', organization: 'Ochsner Health', contacts: [] })
  })

  it('asks which one when two different organisations fit the words typed', () => {
    const general = contact({ _id: 'c-gd', name: 'Gene Ral', organization: 'General Dynamics Health' })
    const match = resolve('prep General', [jane, general])
    expect(match.kind).toBe('ambiguous')
    if (match.kind === 'ambiguous') {
      expect(match.candidates).toEqual([
        { label: 'Someone at General Dynamics Health', organization: 'General Dynamics Health' },
        { label: 'Someone at Mass General Brigham', organization: 'Mass General Brigham' },
      ])
    }
  })

  it('returns none for a named person not on file at an organisation we know', () => {
    const match = resolve('prep Sam Rivera at MGB')
    expect(match).toEqual({ kind: 'none', request: parsePrepRequest('prep Sam Rivera at MGB') })
  })

  it('offers the known person when the organisation typed is unknown', () => {
    const match = resolve('prep Bob Roe at Nowhere Inc')
    expect(match).toEqual({
      kind: 'ambiguous',
      candidates: [{ label: 'Bob Roe, CIO — Mass General Brigham', contactId: 'c-bob', organization: 'Mass General Brigham' }],
    })
  })

  it('still finds the person when the request carries a time of day or a title', () => {
    // "Acme afternoon" contains neither "Acme Health" nor the other way round — this used to return none.
    expect(resolve('prep Jane at Acme this Friday afternoon')).toEqual({ kind: 'contact', contact: janeAcme })
    expect(resolve('prep Jane at Acme for tomorrow')).toEqual({ kind: 'contact', contact: janeAcme })
    expect(resolve('prep Jane at Acme, CMIO')).toEqual({ kind: 'contact', contact: janeAcme })
    const cio = resolve('prep the CIO of Acme')
    expect(cio.kind).toBe('organization')
    if (cio.kind === 'organization') expect(cio.contacts.map((entry) => entry._id)).toEqual(['c-jane-acme'])
    expect(resolve('prep Brigham CMIO').kind).toBe('organization')
  })

  it('puts someone we may neither call nor email last in an organisation', () => {
    const blocked = contact({
      _id: 'c-blocked',
      name: 'Aaron Able',
      warmth: 'hot',
      channelOverrides: [
        { channel: 'phone', state: 'doNotUse' },
        { channel: 'email', state: 'doNotUse' },
      ],
    })
    const phoneOnlyBlocked = contact({ _id: 'c-phone', name: 'Abe Bee', warmth: 'hot', channelOverrides: [{ channel: 'phone', state: 'doNotUse' }] })
    const match = resolve('prep MGB', [blocked, zed, phoneOnlyBlocked])
    expect(match.kind).toBe('organization')
    if (match.kind === 'organization') expect(match.contacts.map((entry) => entry._id)).toEqual(['c-phone', 'c-zed', 'c-blocked'])
  })

  it('tries a single word as a person when it is not an organisation', () => {
    expect(resolve('prep Zed')).toEqual({ kind: 'contact', contact: zed })
  })

  it('returns none when nothing fits, and ignores drafts', () => {
    expect(resolve('prep Nobody Known')).toMatchObject({ kind: 'none' })
    expect(resolve('prep')).toMatchObject({ kind: 'none' })
    const draft = contact({ _id: 'drafts.c-jane' })
    expect(resolve('prep Jane Doe', [draft]).kind).toBe('none')
  })

  it('never puts an email address into a candidate label', () => {
    const emailOnly = contact({ _id: 'c-e1', name: 'lgartley@mgb.org' })
    const emailOnly2 = contact({ _id: 'c-e2', name: 'scott.x@mgb.org' })
    const match = resolve('prep MGB people', [emailOnly, emailOnly2])
    const all = resolvePrepTarget({ name: '', organization: 'MGB', role: '', note: '', raw: 'prep MGB' }, [emailOnly, emailOnly2, jane, zed])
    expect(JSON.stringify(match)).not.toContain('"label":"lgartley')
    if (all.kind === 'organization') {
      const outline = outlineFor({ kind: 'organization', organization: all.organization, contacts: [emailOnly, emailOnly2] })
      expect(JSON.stringify(outline)).not.toContain('lgartley@')
      expect(JSON.stringify(outline)).not.toContain('scott.x@')
    }
    const twoScotts = resolvePrepTarget(parsePrepRequest('prep Scott'), [emailOnly2, contact({ _id: 'c-s2', name: 'Scott Other' })])
    expect(twoScotts.kind).toBe('ambiguous')
    expect(JSON.stringify(twoScotts)).not.toContain('@')
  })
})

// ── The outline ──────────────────────────────────────────────────────────────

describe('composeCallOutline', () => {
  it('titles the outline the way the spec shows', () => {
    const outline = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1' }) })
    expect(outline.title).toBe('Call prep — Jane Doe, CMIO at Mass General Brigham')
    expect(outline.contactId).toBe('c1')
    expect(outline.personLabel).toBe('Jane Doe')
    expect(outline.who).toBe('CMIO · Mass General Brigham · warm — knows us · not contacted yet (Researched)')
    expect(outline.askNote).toBe(CALL_ASK)
    expect(outline.reassurance).toMatch(/A quick no is a fine outcome/)
  })

  it('uses research as "why now" only when it is verified and carries a quote', () => {
    const c = contact({ _id: 'c1' })
    const unverified = verifiedResearch('Mass General Brigham', {
      recentSignal: 'UNVERIFIED-SIGNAL',
      context: 'UNVERIFIED-CONTEXT',
      verification: { status: 'unsupported', evidence: [{ url: 'https://x.org', quote: 'UNVERIFIED-QUOTE' }] },
    })
    const noQuote = verifiedResearch('Mass General Brigham', {
      recentSignal: 'NOQUOTE-SIGNAL',
      verification: { status: 'verified', evidence: [{ url: 'https://x.org' }] },
    })
    const withoutVerified = outlineFor({ kind: 'contact', contact: c }, { research: [unverified, noQuote] })
    expect(withoutVerified.whyNow).toBeNull()
    for (const secret of ['UNVERIFIED-SIGNAL', 'UNVERIFIED-QUOTE', 'NOQUOTE-SIGNAL']) {
      expect(JSON.stringify(withoutVerified)).not.toContain(secret)
    }
    // Unverified context is still useful to the caller — as labelled background.
    expect(withoutVerified.background.join('\n')).toContain('Not verified — don’t repeat as fact: UNVERIFIED-CONTEXT')
    expect(sayThisMaterial(withoutVerified)).not.toContain('UNVERIFIED-CONTEXT')

    const withVerified = outlineFor({ kind: 'contact', contact: c }, { research: [unverified, verifiedResearch('Mass General Brigham')] })
    expect(withVerified.whyNow).toEqual({
      signal: 'Mass General Brigham spun out AIwithCare in December',
      quote: 'fewer than <5% of pilots scale & most stall',
      sourceUrl: 'https://example.org/news#:~:text=pilots',
    })
    expect(sayThisMaterial(withVerified)).not.toContain('VERIFIED-RECORD-CONTEXT')
    expect(withVerified.background.join('\n')).toContain('VERIFIED-RECORD-CONTEXT')
  })

  it('keeps an unreviewed brief and opener out of everything a caller reads out', () => {
    const unreviewed = contact({
      _id: 'c1',
      callBrief: 'UNREVIEWED-BRIEF',
      suggestedOpener: 'Hi Jane — UNREVIEWED-OPENER sentence.',
      researchReviewedAt: null,
    })
    const outline = outlineFor({ kind: 'contact', contact: unreviewed })
    expect(outline.brief).toBeNull()
    expect(sayThisMaterial(outline)).not.toContain('UNREVIEWED')
    expect(outline.background.join('\n')).toMatch(/not reviewed — don’t repeat as fact: UNREVIEWED-BRIEF/)
    expect(outline.background.join('\n')).toMatch(/not reviewed — don’t use it as written: .*UNREVIEWED-OPENER/)
    expect(outline.caveats.join('\n')).toMatch(/hasn’t been reviewed/)
  })

  it('uses a reviewed brief as the brief, and a reviewed opener in the opening line', () => {
    const reviewed = contact({
      _id: 'c1',
      warmth: 'hot',
      howWeKnow: null,
      callBrief: 'REVIEWED-BRIEF',
      suggestedOpener: 'Hi Jane — I saw your talk on sepsis alerts at HIMSS. Would love to compare notes.',
      researchReviewedAt: '2026-09-01T00:00:00Z',
      interactions: [],
    })
    const outline = outlineFor({ kind: 'contact', contact: reviewed })
    expect(outline.brief).toBe('REVIEWED-BRIEF')
    expect(outline.cheatSheet.say).toBe(
      'Hi Jane, it’s Juhan from GoInvo — I saw your talk on sepsis alerts at HIMSS. Have you got two minutes, or is this a bad time?',
    )
    expect(outline.background).toEqual([])
  })

  it('never carries contact details unless asked, and then only in contactDetails', () => {
    const c = contact({
      _id: 'c1',
      email: 'jane.doe@mgb.org',
      phone: '+1 617 555 0100',
      howWeKnow: 'Old colleague — her cell is 617-555-0199, email jane.personal@gmail.com',
    })
    const hidden = outlineFor({ kind: 'contact', contact: c })
    const serialized = JSON.stringify(hidden)
    for (const secret of ['jane.doe@mgb.org', '555 0100', '617-555-0199', 'jane.personal@gmail.com']) {
      expect(serialized).not.toContain(secret)
    }
    expect(hidden.contactDetails).toBeUndefined()
    expect(hidden.cheatSheet.say).toContain('[phone]')

    const shown = outlineFor({ kind: 'contact', contact: c }, { includeContactDetails: true })
    expect(shown.contactDetails).toEqual(['Email: jane.doe@mgb.org', 'Phone: +1 617 555 0100'])
    const { first, second, text } = buildCallOutlineMessages(shown, {})
    const rendered = JSON.stringify({ first, second, text })
    expect(rendered).not.toContain('jane.doe@mgb.org')
    expect(rendered).not.toContain('555 0100')
  })

  it('never shows an email that lives in the name field', () => {
    const c = contact({ _id: 'c1', name: 'scott.shreeve@crossoverhealth.com', organization: 'Crossover Health', role: null })
    const outline = outlineFor({ kind: 'contact', contact: c })
    expect(outline.personLabel).toBe('Scott')
    expect(outline.title).toBe('Call prep — Scott at Crossover Health')
    const rendered = JSON.stringify(buildCallOutlineMessages(outline, {}))
    expect(JSON.stringify(outline)).not.toContain('@crossoverhealth.com')
    expect(rendered).not.toContain('@crossoverhealth.com')
    const withDetails = outlineFor({ kind: 'contact', contact: c }, { includeContactDetails: true })
    expect(withDetails.contactDetails).toEqual(['Email: scott.shreeve@crossoverhealth.com'])
  })

  describe('mode', () => {
    it('cold: warm, never touched — a permission-based opener that references how we know them', () => {
      const outline = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', howWeKnow: 'Worked together at Partners' }) })
      expect(outline.mode).toBe('cold')
      expect(outline.cheatSheet.say).toBe(
        'Hi Jane, it’s Juhan from GoInvo — [how you know them: Worked together at Partners]. Have you got two minutes, or is this a bad time?',
      )
      expect(outline.plan).toBeNull()
      expect(outline.agenda).toBeNull()
      expect(outline.ifTheySay.find((line) => /Who is this/.test(line.theySay))?.youSay).toContain('Worked together at Partners')
    })

    it('followUp: references the last touch date and status, never the notes', () => {
      const c = contact({
        _id: 'c1',
        status: 'contacted',
        warmth: 'cold',
        nextStep: 'SECRET-NEXT-STEP',
        interactions: [
          { at: '2026-09-01T15:00:00Z', statusAfter: 'contacted', channel: 'email', outcome: 'OLD-NOTES' },
          // 9pm in Arlington on the 12th is the 13th in UTC.
          { at: '2026-09-13T01:00:00Z', statusAfter: 'responded', channel: 'phone', outcome: 'SECRET-NOTES', nextStep: 'SECRET-NEXT' },
        ],
      })
      const outline = outlineFor({ kind: 'contact', contact: c })
      expect(outline.mode).toBe('followUp')
      expect(outline.cheatSheet.say).toBe(
        'Hi Jane, it’s Juhan from GoInvo — following up on when we spoke on 12 Sep. Is now an OK time for two minutes?',
      )
      expect(outline.who).toContain('last touch 12 Sep (Responded)')
      expect(JSON.stringify(outline)).not.toMatch(/SECRET|OLD-NOTES/)
      expect(outline.email).toContain('Following up on when we spoke on 12 Sep.')
    })

    it('followUp: does not claim a conversation for a call nobody answered', () => {
      const c = contact({
        _id: 'c1',
        status: 'contacted',
        interactions: [{ at: '2026-09-12T15:00:00Z', statusAfter: 'contacted', channel: 'phone', outcome: 'No answer' }],
      })
      const outline = outlineFor({ kind: 'contact', contact: c })
      expect(outline.cheatSheet.say).toContain('following up on my call on 12 Sep')
      expect(outline.cheatSheet.say).not.toContain('spoke')
      const byEmail = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c2', status: 'contacted', lastContactedAt: '2026-09-10T15:00:00Z', interactions: [{ at: '2026-09-10T15:00:00Z', statusAfter: 'contacted', channel: 'email' }] }),
      })
      expect(byEmail.cheatSheet.say).toContain('following up on my note from 10 Sep')
    })

    it('meeting: an agenda instead of a cold opener', () => {
      const outline = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', status: 'meeting' }) })
      expect(outline.mode).toBe('meeting')
      expect(outline.title).toMatch(/^Meeting prep — /)
      expect(outline.agenda).toHaveLength(4)
      expect(outline.agenda!.join(' ')).toMatch(/5 min.*15 min.*10 min.*After/)
      expect(outline.plan).toBeNull()
      expect(outline.cheatSheet.say).toMatch(/^Thanks for making the time, Jane/)
    })

    it('emailFirst: no relationship and no history — email today, call if no reply by a weekday', () => {
      const outline = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', warmth: 'unknown', status: 'new' }) })
      expect(outline.mode).toBe('emailFirst')
      // Thursday + 3 days is a Sunday, so the call moves to Monday.
      expect(outline.plan).toBe(
        'Email first today (the draft is in the next message). If there’s no reply by Mon 28 Sep, call and open with “I sent you a note on Thursday”.',
      )
      expect(outline.cheatSheet.say).toContain('I sent you a short note on Thursday')
      expect(outlineFor({ kind: 'contact', contact: contact({ _id: 'c2', warmth: null, status: null }) }).mode).toBe('emailFirst')
      expect(outlineFor({ kind: 'contact', contact: contact({ _id: 'c3', warmth: 'cold' }) }).mode).toBe('emailFirst')
    })

    it('do-not-call: email only, with the reason said plainly', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', warmth: 'hot', status: 'contacted', channelOverrides: [{ channel: 'phone', state: 'doNotUse' }], interactions: [{ at: '2026-09-01T12:00:00Z', statusAfter: 'contacted', channel: 'email' }] }),
      })
      expect(outline.mode).toBe('emailFirst')
      expect(outline.caveats).toContain('They asked not to be called — email only.')
      expect(outline.plan).toMatch(/^Email only — they asked not to be called\./)
      expect(outline.plan).not.toMatch(/call and open/)

      const unavailable = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c2', channelOverrides: [{ channel: 'phone', state: 'unavailable' }] }),
      })
      expect(unavailable.mode).toBe('emailFirst')
      expect(unavailable.plan).toMatch(/phone isn’t an option/)
    })

    const blockedOn = (...pairs: [string, string][]) => pairs.map(([channel, state]) => ({ channel, state }))

    /** The lines a caller would say or send — none may reach for a channel they closed. */
    const reachesFor = (outline: CallOutline) =>
      [outline.cheatSheet.say, outline.cheatSheet.exit, outline.voicemail, outline.email].join(' | ')

    it('do-not-contact: phone and email both blocked — no script at all, just "hold off"', () => {
      const c = contact({
        _id: 'c1',
        warmth: 'unknown',
        callBrief: 'REVIEWED-BRIEF',
        researchReviewedAt: '2026-09-01T00:00:00Z',
        channelOverrides: blockedOn(['phone', 'doNotUse'], ['email', 'doNotUse']),
      })
      const outline = outlineFor({ kind: 'contact', contact: c }, { research: [verifiedResearch('Mass General Brigham')] })
      expect(outline.mode).toBe('holdOff')
      expect(outline.title).toBe('Hold off — Jane Doe, CMIO at Mass General Brigham')
      expect(outline.cheatSheet).toEqual({ say: '', ask: '', ifNo: '', exit: '' })
      expect(outline.voicemail).toBe('')
      expect(outline.email).toBe('')
      expect(outline.ifTheySay).toEqual([])
      expect(outline.questions).toEqual([])
      expect(outline.offer).toBeNull()
      expect(outline.whyNow).toBeNull()
      expect(outline.askNote).toBe('')
      expect(outline.agenda).toBeNull()
      expect(outline.plan).toBe(
        'Don’t call or email — they asked not to be called or emailed. Check their record in the Studio before any outreach; if something has changed, update it there and ask me again.',
      )
      // One caveat, not "email only" followed by "don't email".
      expect(outline.caveats.filter((line) => /called|emailed/.test(line))).toEqual([
        'They asked not to be called or emailed — check the Studio before any outreach.',
      ])
      expect(JSON.stringify(outline.caveats)).not.toMatch(/email only/)
      // What we know is still there, for whoever checks the record.
      expect(outline.brief).toBe('REVIEWED-BRIEF')
      expect(outline.background.join(' ')).toContain('VERIFIED-RECORD-CONTEXT')

      const { first, second, text } = buildCallOutlineMessages(outline, {})
      expectValidSlackBlocks(first, { maxBlocks: 15 })
      expectValidSlackBlocks(second, { maxBlocks: 20 })
      expect(first[2].text.text).toMatch(/^\*Don’t contact — check the Studio\*\nDon’t call or email — /)
      const rendered = JSON.stringify({ first, second })
      for (const absent of ['*Say:*', '*Plan*', '*Email draft*', 'voicemail', '*Questions*', '*If they say', '*Why now*']) {
        expect(rendered).not.toContain(absent)
      }
      expect(text).toMatch(/^Hold off — /)
    })

    it('do-not-contact even when a meeting is on file — the record needs a look first', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', status: 'meeting', channelOverrides: blockedOn(['phone', 'doNotUse'], ['email', 'doNotUse']) }),
      })
      expect(outline.mode).toBe('holdOff')
      expect(outline.email).toBe('')
    })

    it('phone "do not use" plus email "unavailable" is a hold-off too, with both reasons', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', channelOverrides: blockedOn(['phone', 'doNotUse'], ['email', 'unavailable']) }),
      })
      expect(outline.mode).toBe('holdOff')
      expect(outline.plan).toMatch(/^Don’t call or email — they asked not to be called, and email isn’t an option for them\./)
      expect(outline.plan).not.toMatch(/Email only/)
      expect(outline.email).toBe('')
      expect(outline.caveats).toContain(
        'They asked not to be called, and email isn’t an option for them — check the Studio before any outreach.',
      )
    })

    it('do-not-email, never touched: a phone call, never "email first", and nothing that promises an email', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', warmth: 'unknown', status: 'new', channelOverrides: blockedOn(['email', 'doNotUse']) }),
      })
      expect(outline.mode).toBe('cold')
      expect(outline.email).toBe('')
      expect(outline.plan).toBe('Phone only — they asked not to be emailed, so there’s no email draft. If it goes to voicemail, try again another day.')
      expect(reachesFor(outline)).not.toMatch(/e-?mail|note|sent you/i)
      expect(outline.voicemail).toMatch(/no need to call back/)
      expect(outline.cheatSheet.exit).toBe('Thanks for picking up — I’ll let you get back to your day.')
      expect(outline.ifTheySay.find((line) => /send me an email/.test(line.theySay))?.youSay).toBe('Happy to — what’s the best address for you?')
      expect(outline.caveats).toContain(
        'They asked not to be emailed — keep it to the phone. If they ask for an email on the call, update their record in the Studio afterwards.',
      )
      expect(JSON.stringify(outline.caveats)).not.toMatch(/email only/i)
      const { first, second } = buildCallOutlineMessages(outline, {})
      expect(first[2].text.text).toMatch(/^\*On the call\*/)
      expect(JSON.stringify(second)).not.toContain('*Email draft*')
      expectValidSlackBlocks(first, { maxBlocks: 15 })
      expectValidSlackBlocks(second, { maxBlocks: 20 })
    })

    it('do-not-email, already touched: a follow-up call whose voicemail does not promise an email', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({
          _id: 'c1',
          status: 'contacted',
          interactions: [{ at: '2026-09-10T15:00:00Z', statusAfter: 'contacted', channel: 'phone' }],
          channelOverrides: blockedOn(['email', 'doNotUse']),
        }),
      })
      expect(outline.mode).toBe('followUp')
      expect(outline.email).toBe('')
      expect(reachesFor(outline)).not.toMatch(/e-?mail|a (?:short|two-line) note/i)
      expect(outline.voicemail).toBe(
        'Hi Jane, it’s Juhan from GoInvo, following up on my call on 10 Sep. I’ll try you again later in the week — no need to call back. Thanks, and have a good day.',
      )
    })

    it('email "unavailable" counts as blocked when deciding on email first', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', warmth: 'cold', status: 'new', channelOverrides: blockedOn(['email', 'unavailable']) }),
      })
      expect(outline.mode).toBe('cold')
      expect(outline.email).toBe('')
      expect(outline.plan).toMatch(/^Phone only — email isn’t an option for them/)
      expect(outline.caveats.join(' ')).toMatch(/Email is marked unavailable for them/)
    })

    it('do-not-email in a meeting: no follow-up email draft, and the agenda says to agree how to follow up', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', status: 'meeting', channelOverrides: blockedOn(['email', 'doNotUse']) }),
      })
      expect(outline.mode).toBe('meeting')
      expect(outline.email).toBe('')
      expect(outline.agenda![3]).toBe('After — they asked not to be emailed, so agree in the meeting how they’d like to hear back.')
      expect(reachesFor(outline)).not.toMatch(/e-?mail|send a short note/i)
    })

    it('do-not-call: no voicemail script, and "not a good time" is answered by email, not a call back', () => {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: 'c1', warmth: 'unknown', channelOverrides: blockedOn(['phone', 'doNotUse']) }),
      })
      expect(outline.mode).toBe('emailFirst')
      expect(outline.voicemail).toBe('')
      expect(outline.email).toMatch(/^Subject: /)
      expect(outline.ifTheySay.find((line) => /good time/.test(line.theySay))?.youSay).toBe('No problem — I’ll follow up by email instead.')
      expect(JSON.stringify(buildCallOutlineMessages(outline, {}).second)).not.toContain('voicemail')
    })

    it('a request that says the call or meeting is booked counts for someone on file too', () => {
      const jane = contact({ _id: 'c-jane', warmth: 'unknown', status: 'new' })
      const meetingText = 'prep me for my meeting with Jane Doe tomorrow at 3pm'
      const match = resolvePrepTarget(parsePrepRequest(meetingText), [jane])
      expect(match).toEqual({ kind: 'contact', contact: jane })
      if (match.kind === 'ambiguous') return
      // Without the request, a never-touched stranger is "email first"…
      expect(outlineFor(match).mode).toBe('emailFirst')
      // …but they said it is a meeting.
      const meeting = outlineFor(match, { request: parsePrepRequest(meetingText) })
      expect(meeting.mode).toBe('meeting')
      expect(meeting.agenda).toHaveLength(4)

      const call = outlineFor(match, { request: parsePrepRequest('prep my call with Jane Doe at 3pm') })
      expect(call.mode).not.toBe('emailFirst')
      expect(call.mode).toBe('cold')
      expect(JSON.stringify(call)).not.toMatch(/sent you a|Email first today/)

      // The request never turns a contact into a generic outline.
      expect(call.generic).toBe(false)
      expect(call.fromYourMessage).toBeUndefined()
      expect(meeting.who).not.toContain('from your message')

      // Organisation matches follow the same rule.
      const org = outlineFor(
        { kind: 'organization', organization: 'Mass General Brigham', contacts: [jane] },
        { request: parsePrepRequest('prep me for my meeting with MGB on Friday') },
      )
      expect(org.mode).toBe('meeting')
      // A plain request changes nothing.
      expect(outlineFor(match, { request: parsePrepRequest('prep Jane Doe') }).mode).toBe('emailFirst')
    })

    it('a generic request that names a time or a meeting is a call that is happening', () => {
      const booked = parsePrepRequest('prep me for my call with Sam Rivera at Acme tomorrow at 3pm')
      expect(outlineFor({ kind: 'none', request: booked }).mode).toBe('cold')
      const meeting = parsePrepRequest('prep me for my meeting with Sam Rivera at Acme on Friday')
      expect(outlineFor({ kind: 'none', request: meeting }).mode).toBe('meeting')
      const plain = parsePrepRequest('prep Sam Rivera at Acme')
      expect(outlineFor({ kind: 'none', request: plain }).mode).toBe('emailFirst')
    })
  })

  it('shows dates in the studio’s time zone', () => {
    const c = contact({ _id: 'c1', status: 'contacted', interactions: [{ at: '2026-09-13T02:30:00Z', statusAfter: 'contacted', channel: 'phone' }] })
    expect(outlineFor({ kind: 'contact', contact: c }).cheatSheet.say).toContain('my call on 12 Sep')
  })

  it('picks the offer: contact, then research, then segment default, then the general one', () => {
    const base = contact({ _id: 'c1', segment: 'medDevice', suggestedOfferKey: 'not-in-catalog' })
    expect(outlineFor({ kind: 'contact', contact: { ...base, suggestedOfferKey: 'clinician-adoption-rescue' } }).offer?.title).toBe(
      'Clinician Adoption Rescue',
    )
    expect(
      outlineFor({ kind: 'contact', contact: base }, { research: [verifiedResearch('Mass General Brigham')] }).offer?.title,
    ).toBe('Clinical AI Pilot Pre-Mortem')
    expect(outlineFor({ kind: 'contact', contact: base }).offer?.title).toBe('Human Factors & Usability for FDA Submissions')
    expect(outlineFor({ kind: 'contact', contact: { ...base, segment: 'pharma' } }).offer?.title).toBe('Clinical AI Pilot Pre-Mortem')
    expect(outlineFor({ kind: 'contact', contact: { ...base, segment: 'government' } }).offer?.title).toBe('Clinician Adoption Rescue')
    expect(outlineFor({ kind: 'contact', contact: base }, { offers: [] }).offer).toBeNull()
    expect(outlineFor({ kind: 'contact', contact: base }, { offers: [offers[0]] }).offer).toBeNull()
  })

  it('does not name the problem as theirs when the offer is only a blind fallback', () => {
    const outline = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', segment: null }) })
    expect(outline.offer?.title).toBe('Clinician Adoption Rescue')
    expect(outline.cheatSheet.ask).toBe(
      'Would it be worth 30 minutes together — free — on whatever’s most stuck for you right now? Who else should be in the room?',
    )
    expect(outline.cheatSheet.ifNo).toBe('Totally fair. Is there someone else who owns this? Otherwise I’ll leave you be.')
    const known = outlineFor({ kind: 'contact', contact: contact({ _id: 'c2' }) })
    expect(known.cheatSheet.ask).toBe(
      'Would it be worth 30 minutes together — free — on what could quietly stall your AI pilot? Who else should be in the room?',
    )
    expect(known.cheatSheet.exit).toBe('Thanks for picking up — mind if I send a two-line note so you have it?')
  })

  it('builds proof from the offer plus at most two evidence titles that exist in the catalogue', () => {
    const c = contact({
      _id: 'c1',
      relevantEvidence: [{ evidenceId: 'ev-missing', title: 'NOT-IN-CATALOG' }, { evidenceId: 'ev-ipsos' }, { evidenceId: 'ev-coderyte' }, { evidenceId: 'ev-hhs' }],
    })
    const outline = outlineFor({ kind: 'contact', contact: c })
    expect(outline.offer?.proof).toBe('Ipsos Facto: 90%+ internal adoption. Related work: Ipsos Facto (Ipsos); CodeRyte coding assistant (3M).')
    expect(JSON.stringify(outline)).not.toContain('NOT-IN-CATALOG')
  })

  it('asks the pre-mortem question of pharma, provider, healthtech and payer — not med-device', () => {
    for (const segment of ['pharma', 'provider', 'healthtech', 'payer']) {
      const questions = outlineFor({ kind: 'contact', contact: contact({ _id: segment, segment }) }).questions
      expect(questions).toContain(PREMORTEM_QUESTION)
      expect(questions.length).toBeGreaterThanOrEqual(3)
      expect(questions.length).toBeLessThanOrEqual(4)
    }
    const device = outlineFor({ kind: 'contact', contact: contact({ _id: 'd', segment: 'medDevice' }) }).questions
    expect(device).not.toContain(PREMORTEM_QUESTION)
    expect(device).toHaveLength(3)
    // Research's suggested segment counts when nobody set one.
    expect(
      outlineFor({ kind: 'contact', contact: contact({ _id: 'r', segment: null, researchSuggestedSegment: 'payer' }) }).questions,
    ).toContain(PREMORTEM_QUESTION)
  })

  it('has calm answers for the pushback people actually get', () => {
    const outline = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', howWeKnow: null }) }, { research: [verifiedResearch('Mass General Brigham')] })
    const said = outline.ifTheySay.map((line) => line.theySay).join(' | ')
    for (const pattern of [/not a good time/i, /send me an email/i, /who is this/i, /number/i, /not the right person/i, /vendor/i, /budget/i, /not interested/i]) {
      expect(said).toMatch(pattern)
    }
    const whoIsThis = outline.ifTheySay.find((line) => /Who is this/.test(line.theySay))!.youSay
    expect(whoIsThis).toBe(
      'I’m Juhan at GoInvo, a design studio in Arlington — I read that Mass General Brigham spun out AIwithCare in December, and wanted to talk to whoever looks after it.',
    )
    expect(outline.ifTheySay.find((line) => /right person/.test(line.theySay))!.youSay).toBe(
      'Who would you point me to? Mind if I say you sent me?',
    )
    const noResearch = outlineFor({ kind: 'contact', contact: contact({ _id: 'c2', howWeKnow: null }) })
    expect(noResearch.ifTheySay.find((line) => /Who is this/.test(line.theySay))!.youSay).toContain(
      'I came across your work as CMIO at Mass General Brigham.',
    )
  })

  it('leaves a short voicemail that never asks for a call back', () => {
    for (const status of ['researched', 'contacted', 'meeting']) {
      const outline = outlineFor({
        kind: 'contact',
        contact: contact({ _id: status, status, interactions: status === 'contacted' ? [{ at: '2026-09-12T15:00:00Z', statusAfter: 'contacted', channel: 'phone' }] : [] }),
      })
      expect(outline.voicemail).toMatch(/no need to call back/)
      expect(outline.voicemail).not.toMatch(/call me back|give me a (call|ring)|call me at/i)
      // About twenty seconds spoken.
      expect(outline.voicemail.split(/\s+/).length).toBeLessThanOrEqual(55)
    }
    const warm = outlineFor({ kind: 'contact', contact: contact({ _id: 'w' }) })
    expect(warm.voicemail).not.toContain('design studio')
    const stranger = outlineFor({ kind: 'contact', contact: contact({ _id: 's', warmth: 'cold', status: 'new' }) })
    expect(stranger.voicemail).toContain('design studio in Arlington')
  })

  it('drafts the first-touch email from verified research, with capitals intact', () => {
    const outline = outlineFor(
      { kind: 'contact', contact: contact({ _id: 'c1', warmth: 'unknown' }) },
      { research: [verifiedResearch('Mass General Brigham')] },
    )
    expect(outline.email).toMatch(/^Subject: A quick thought from GoInvo\n\nHi Jane,\n\nI saw that Mass General Brigham spun out AIwithCare in December\./)
    expect(outline.email).toContain('clinical AI pilot')
    expect(outline.email).toContain('— Juhan, GoInvo')
  })

  it('builds a generic outline from the request alone, labelled as such', () => {
    const request = parsePrepRequest('prep Sam Rivera, CMIO at Acme — met her at HIMSS')
    const outline = outlineFor({ kind: 'none', request })
    expect(outline.generic).toBe(true)
    expect(outline.contactId).toBeUndefined()
    expect(outline.title).toBe('Call prep — Sam Rivera, CMIO at Acme')
    expect(outline.fromYourMessage).toEqual(['Name: Sam Rivera', 'Role: CMIO', 'Organization: Acme', 'Note: met her at HIMSS'])
    expect(outline.who).toBe('CMIO · Acme · from your message · not on file yet')
    expect(outline.caveats[0]).toMatch(/^Nothing on file for them yet/)
    expect(outline.whyNow).toBeNull()
    expect(outline.email).toContain('[From your message — use it in your own words, or delete: met her at HIMSS]')
  })

  it('uses verified research for someone not on file, and is then not generic', () => {
    const request = parsePrepRequest('prep Sam Rivera at MGB')
    const outline = outlineFor({ kind: 'none', request }, { research: [verifiedResearch('Mass General Brigham')] })
    expect(outline.generic).toBe(false)
    expect(outline.whyNow?.signal).toContain('AIwithCare')
    expect(outline.caveats[0]).toBe('Nobody by that name is on file at MGB yet — only our research on the organization.')
  })

  it('preps an organisation with nobody on file by asking for whoever owns the problem', () => {
    const outline = outlineFor(
      { kind: 'organization', organization: 'Ochsner Health', contacts: [] },
      { research: [verifiedResearch('Ochsner Health')] },
    )
    expect(outline.personLabel).toBe('someone at Ochsner Health')
    expect(outline.title).toBe('Call prep — someone at Ochsner Health')
    expect(outline.cheatSheet.say).toBe(
      'Hi, it’s Juhan from GoInvo — I’m hoping to reach whoever looks after clinical AI pilots at Ochsner Health. Is that you, or could you point me the right way?',
    )
  })

  it('preps an organisation around its best contact, and names the others', () => {
    const people = [contact({ _id: 'a', name: 'Ann Lee' }), contact({ _id: 'b', name: 'Bob Roe' }), contact({ _id: 'c', name: 'Cy Dee' }), contact({ _id: 'd', name: 'Di Eff' }), contact({ _id: 'e', name: 'Ed Gee' })]
    const outline = outlineFor({ kind: 'organization', organization: 'Mass General Brigham', contacts: people })
    expect(outline.contactId).toBe('a')
    expect(outline.caveats).toContain('Also on file at Mass General Brigham: Bob Roe, Cy Dee, Di Eff and 1 more.')
  })

  it('flags doubt about identity and a closed relationship', () => {
    const doubtful = outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', identityConfidence: 'low' }) })
    expect(doubtful.caveats.join(' ')).toMatch(/couldn’t confirm this is the right person/)
    expect(doubtful.who).toContain('identity not confirmed')
    const lost = outlineFor({ kind: 'contact', contact: contact({ _id: 'c2', status: 'lost' }) })
    expect(lost.caveats).toContain('Marked Lost on file — check the Studio for why before calling.')
    expect(lost.mode).toBe('followUp')
    const won = outlineFor({ kind: 'contact', contact: contact({ _id: 'c3', status: 'won' }) })
    expect(won.caveats.join(' ')).toMatch(/Already a client/)
  })

  it('never throws on thin or hostile records', () => {
    const thin = outlineFor({ kind: 'contact', contact: { _id: 'thin' } })
    expect(thin.title).toBe('Call prep — someone')
    const empty = outlineFor({ kind: 'none', request: parsePrepRequest('') })
    expect(empty.personLabel).toBe('someone')
    const invalidNow = composeCallOutline({
      match: { kind: 'contact', contact: contact({ _id: 'x', warmth: 'unknown' }) },
      research: [],
      offers,
      evidence,
      senderName: '',
      includeContactDetails: false,
      now: new Date('nope'),
    })
    expect(invalidNow.cheatSheet.say).toContain('[your name]')
  })
})

// ── Block Kit ────────────────────────────────────────────────────────────────

describe('buildCallOutlineMessages', () => {
  const hostileContact = contact({
    _id: 'c-hostile',
    name: HOSTILE,
    organization: `AT&T ${HOSTILE}`,
    role: HOSTILE,
    howWeKnow: HOSTILE,
    callBrief: `${HOSTILE} \`\`\` fence breaker`,
    suggestedOpener: HOSTILE,
    researchReviewedAt: '2026-09-01T00:00:00Z',
    status: 'contacted',
    interactions: [{ at: '2026-09-12T15:00:00Z', statusAfter: 'contacted', channel: 'phone' }],
    relevantEvidence: [{ evidenceId: 'ev-ipsos' }],
  })
  const hostileResearch = verifiedResearch(`AT&T ${HOSTILE}`, {
    recentSignal: HOSTILE,
    reachableAbout: HOSTILE,
    context: HOSTILE,
    verification: { status: 'verified', evidence: [{ url: 'https://example.org/a b|c', quote: `${HOSTILE}\nsecond line <5%` }] },
  })
  const hostileOffers: PrepOffer[] = [{ key: 'ai-pilot-premortem', title: HOSTILE, oneLiner: HOSTILE, proofPoints: HOSTILE }]

  const outlines: Record<string, CallOutline> = {
    cold: outlineFor({ kind: 'contact', contact: contact({ _id: 'c1', howWeKnow: 'Old colleague' }) }, { research: [verifiedResearch('Mass General Brigham')] }),
    followUp: outlineFor({ kind: 'contact', contact: contact({ _id: 'c2', status: 'contacted', interactions: [{ at: '2026-09-12T15:00:00Z', statusAfter: 'contacted', channel: 'phone' }] }) }),
    meeting: outlineFor({ kind: 'contact', contact: contact({ _id: 'c3', status: 'meeting' }) }),
    emailFirst: outlineFor({ kind: 'contact', contact: contact({ _id: 'c4', warmth: 'unknown' }) }),
    generic: outlineFor({ kind: 'none', request: parsePrepRequest('prep Sam Rivera, CMIO at Acme — met her at HIMSS') }),
    orgOnly: outlineFor({ kind: 'organization', organization: 'Ochsner Health', contacts: [] }),
    hostile: outlineFor(
      { kind: 'contact', contact: hostileContact },
      { research: [hostileResearch], offers: hostileOffers, senderName: HOSTILE, includeContactDetails: true },
    ),
    hostileGeneric: outlineFor({
      kind: 'none',
      request: { name: HOSTILE, organization: HOSTILE, role: HOSTILE, note: HOSTILE, raw: HOSTILE },
    }),
    holdOff: outlineFor({
      kind: 'contact',
      contact: contact({ _id: 'c5', channelOverrides: [{ channel: 'phone', state: 'doNotUse' }, { channel: 'email', state: 'doNotUse' }] }),
    }),
    phoneOnly: outlineFor({ kind: 'contact', contact: contact({ _id: 'c6', warmth: 'unknown', channelOverrides: [{ channel: 'email', state: 'doNotUse' }] }) }),
    hostileHoldOff: outlineFor(
      { kind: 'contact', contact: { ...hostileContact, channelOverrides: [{ channel: 'phone', state: 'unavailable' }, { channel: 'email', state: 'doNotUse' }] } },
      { research: [hostileResearch], offers: hostileOffers, senderName: HOSTILE, includeContactDetails: true, request: parsePrepRequest(HOSTILE) },
    ),
    hostilePhoneOnly: outlineFor(
      { kind: 'contact', contact: { ...hostileContact, channelOverrides: [{ channel: 'email', state: 'unavailable' }] } },
      { research: [hostileResearch], offers: hostileOffers, senderName: HOSTILE, request: parsePrepRequest(`prep my meeting with ${HOSTILE}`) },
    ),
  }

  const logRef = encodeContactRef({ contactId: 'c1', organization: 'Mass General Brigham', name: 'Jane Doe' })
  const addRef = encodeContactRef({ organization: 'Acme', name: 'Sam Rivera', role: 'CMIO', note: 'met her at HIMSS' })

  it.each(Object.entries(outlines))('%s: both messages are valid Block Kit within their budgets', (_name, outline) => {
    for (const opts of [{}, { logRef, addRef, studioUrl: 'https://www.goinvo.com/studio/marketing?view=outreach' }]) {
      const { first, second, text } = buildCallOutlineMessages(outline, opts)
      expectValidSlackBlocks(first, { maxBlocks: 15 })
      expectValidSlackBlocks(second, { maxBlocks: 20 })
      expect(text.length).toBeGreaterThan(0)
      expect(text.length).toBeLessThanOrEqual(4000)
    }
  })

  it('puts the header, who, and the cheat sheet first — before anything else', () => {
    const { first } = buildCallOutlineMessages(outlines.cold, {})
    expect(first[0]).toEqual({
      type: 'header',
      text: { type: 'plain_text', text: 'Call prep — Jane Doe, CMIO at Mass General Brigham', emoji: false },
    })
    expect(first[1].type).toBe('context')
    expect(first[2].text.text).toMatch(/^\*On the call\*\n\*Say:\* .+\n\*Ask:\* .+\n\*If no:\* .+\n\*Exit:\* .+$/)
    const order = first.map((block) => (block.text?.text || '').split('\n')[0])
    expect(order.indexOf('*Why now*')).toBeGreaterThan(2)
    expect(order.indexOf('*Questions*')).toBeGreaterThan(order.indexOf('*Why now*'))
  })

  it('labels the cheat sheet for the situation', () => {
    expect(buildCallOutlineMessages(outlines.meeting, {}).first[2].text.text).toMatch(/^\*In the meeting\*/)
    expect(buildCallOutlineMessages(outlines.emailFirst, {}).first[2].text.text).toMatch(/^\*If you end up talking\*/)
    expect(JSON.stringify(buildCallOutlineMessages(outlines.meeting, {}).first)).toContain('*Agenda (30 min)*')
    expect(JSON.stringify(buildCallOutlineMessages(outlines.emailFirst, {}).first)).toContain('*Plan*')
  })

  it('shows why-now as a blockquote with a safe source link', () => {
    const { first } = buildCallOutlineMessages(outlines.cold, {})
    const whyNow = first.find((block) => block.text?.text?.startsWith('*Why now*'))!
    expect(whyNow.text.text).toBe(
      '*Why now*\nMass General Brigham spun out AIwithCare in December\n>fewer than &lt;5% of pilots scale &amp; most stall\n<https://example.org/news#:~:text=pilots|Source>',
    )
  })

  it('escapes every record string — nothing can ping a channel or break a link', () => {
    for (const outline of [outlines.hostile, outlines.hostileGeneric, outlines.hostileHoldOff, outlines.hostilePhoneOnly]) {
      const { first, second, text } = buildCallOutlineMessages(outline, { logRef, addRef })
      for (const value of [...mrkdwnIn(first), ...mrkdwnIn(second), text]) {
        expect(value).not.toContain('<!here>')
        expect(value).not.toContain('<@U123>')
        expect(value).not.toMatch(/&(?!amp;|lt;|gt;)/)
        expect(value).not.toMatch(/<(?!https?:\/\/)/)
      }
    }
    const { first } = buildCallOutlineMessages(outlines.hostile, {})
    expect(JSON.stringify(mrkdwnIn(first))).toContain('AT&amp;T')
    expect(buildCallOutlineMessages(outlines.hostile, {}).text).toMatch(/^Call prep — /)
    expect(buildCallOutlineMessages(outlines.hostile, {}).text).toContain('&lt;!here&gt;')
  })

  it('renders a hold-off with its reason where the cheat sheet would be, and a phone-only outline with no draft', () => {
    const holdOff = buildCallOutlineMessages(outlines.hostileHoldOff, { logRef, addRef })
    expect(outlines.hostileHoldOff.mode).toBe('holdOff')
    expect(holdOff.first[2].text.text).toMatch(/^\*Don’t contact — check the Studio\*\nDon’t call or email — phone isn’t an option for them, and they asked not to be emailed\./)
    expect(JSON.stringify(holdOff)).not.toContain('*Email draft*')
    const phoneOnly = buildCallOutlineMessages(outlines.hostilePhoneOnly, {})
    expect(outlines.hostilePhoneOnly.mode).toBe('meeting')
    expect(JSON.stringify(phoneOnly.second)).not.toContain('*Email draft*')
  })

  it('clips the email body before fencing it, so the fence always closes', () => {
    for (const outline of [outlines.hostile, outlines.hostileGeneric, outlines.cold]) {
      const { second } = buildCallOutlineMessages(outline, {})
      const email = second.find((block) => block.text?.text?.startsWith('*Email draft*'))!
      expect(email.text.text).toMatch(/^\*Email draft\* — edit before sending\n```[\s\S]*```$/)
      expect(email.text.text.match(/```/g)).toHaveLength(2)
    }
  })

  it('never renders contact details, even when the outline carries them', () => {
    expect(outlines.hostile.contactDetails).toBeDefined()
    const withDetails = outlineFor(
      { kind: 'contact', contact: contact({ _id: 'c1', email: 'jane.doe@mgb.org', phone: '6175550100' }) },
      { includeContactDetails: true },
    )
    const rendered = JSON.stringify(buildCallOutlineMessages(withDetails, { logRef, addRef }))
    expect(rendered).not.toContain('jane.doe@mgb.org')
    expect(rendered).not.toContain('6175550100')
  })

  it('shows "Log how it went" iff logRef, "Add … to outreach" iff addRef, Studio iff an http url', () => {
    const none = buttons(buildCallOutlineMessages(outlines.cold, {}).first)
    expect(none).toEqual([])
    expect(buildCallOutlineMessages(outlines.cold, {}).first.some((block) => block.type === 'actions')).toBe(false)

    const log = buttons(buildCallOutlineMessages(outlines.cold, { logRef }).first)
    expect(log).toEqual([
      { type: 'button', action_id: MARQUETA_ACTION.logCall, text: { type: 'plain_text', text: 'Log how it went' }, value: logRef, style: 'primary' },
    ])

    const add = buttons(buildCallOutlineMessages(outlines.generic, { addRef }).first)
    expect(add).toEqual([
      { type: 'button', action_id: MARQUETA_ACTION.addContact, text: { type: 'plain_text', text: 'Add Sam Rivera to outreach' }, value: addRef },
    ])
    expect(decodeContactRef(add[0].value)).toMatchObject({ name: 'Sam Rivera', organization: 'Acme' })
    const orgAdd = buttons(buildCallOutlineMessages(outlines.orgOnly, { addRef }).first)
    expect(orgAdd[0].text.text).toBe('Add Ochsner Health to outreach')

    const studio = buttons(buildCallOutlineMessages(outlines.cold, { studioUrl: 'https://www.goinvo.com/studio' }).first)
    expect(studio).toEqual([{ type: 'button', text: { type: 'plain_text', text: 'Open in Studio' }, url: 'https://www.goinvo.com/studio' }])
    expect(buttons(buildCallOutlineMessages(outlines.cold, { studioUrl: 'javascript:alert(1)' }).first)).toEqual([])
  })

  it('drops a button whose value Slack would reject, rather than the whole message', () => {
    const { first } = buildCallOutlineMessages(outlines.cold, { logRef: 'x'.repeat(2001), addRef })
    expect(buttons(first).map((button) => button.action_id)).toEqual([MARQUETA_ACTION.addContact])
    expectValidSlackBlocks(first, { maxBlocks: 15 })
  })

  it('keeps the threaded message to the back-pocket material, labelled', () => {
    const { second } = buildCallOutlineMessages(outlines.cold, {})
    const text = JSON.stringify(second)
    expect(text).toContain('*Offer to have ready:* Clinical AI Pilot Pre-Mortem')
    expect(text).toContain('The ask — for you, not to read out:')
    expect(text).toContain('*If it goes to voicemail*')
    expect(text).toContain('*Background — for you, not for the call*')
    const generic = JSON.stringify(buildCallOutlineMessages(outlines.generic, {}).second)
    expect(generic).toContain('*From your message*')
    expect(generic).toContain('Note: met her at HIMSS')
  })
})

describe('buildPrepCandidatesBlocks', () => {
  it('returns nothing when there is nothing to choose between', () => {
    expect(buildPrepCandidatesBlocks([], 'Which one?')).toEqual([])
    expect(buildPrepCandidatesBlocks([{ label: 'x', organization: '' }], 'Which one?')).toEqual([])
  })

  it('gives each candidate a Prep button carrying a decodable ref', () => {
    const blocks = buildPrepCandidatesBlocks(
      [
        { label: 'Jane Doe, CMIO — Mass General Brigham', contactId: 'c-jane', organization: 'Mass General Brigham' },
        { label: 'Someone at General Dynamics Health', organization: 'General Dynamics Health' },
      ],
      'I know two — which one?',
    )
    expectValidSlackBlocks(blocks)
    expect(blocks[0].text.text).toBe('I know two — which one?')
    expect(blocks).toHaveLength(3)
    expect(blocks[1].text.text).toBe('*Jane Doe, CMIO — Mass General Brigham*')
    expect(blocks[1].accessory.action_id).toBe(MARQUETA_ACTION.prepCall)
    expect(decodeContactRef(blocks[1].accessory.value)).toMatchObject({ contactId: 'c-jane', organization: 'Mass General Brigham' })
    expect(decodeContactRef(blocks[2].accessory.value)).toMatchObject({ contactId: '', organization: 'General Dynamics Health' })
  })

  it('caps at five and survives hostile labels', () => {
    const candidates = Array.from({ length: 9 }, (_, index) => ({
      label: `${HOSTILE} ${index}`,
      contactId: `c-${index}-${'y'.repeat(400)}`,
      organization: HOSTILE,
    }))
    const blocks = buildPrepCandidatesBlocks(candidates, HOSTILE)
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(6)
    for (const text of mrkdwnIn(blocks)) {
      expect(text).not.toContain('<!here>')
      expect(text).not.toContain('<@U123>')
    }
  })
})

describe('buildPrepListBlocks', () => {
  const handle = '<@U0MARQUETA>'
  const entry = (index: number, temperature: 'replied' | 'knowsUs' | 'cold' = 'knowsUs') => ({
    label: `Person ${index} (Org ${index})`,
    temperature,
    detail: `Follow-up due Mon 28 Sep · last: Contacted on 14 Sep`,
    contactId: `c-${index}`,
    organization: `Org ${index}`,
  })

  it('labels how warm each call is, with a Prep button each', () => {
    const blocks = buildPrepListBlocks([entry(1, 'replied'), entry(2, 'knowsUs'), entry(3, 'cold')], { heading: 'Your calls this week', handle })
    expectValidSlackBlocks(blocks)
    expect(blocks).toHaveLength(4)
    expect(blocks[1].text.text).toBe('*Person 1 (Org 1)* — they replied\nFollow-up due Mon 28 Sep · last: Contacted on 14 Sep')
    expect(blocks[2].text.text).toMatch(/— they know us/)
    expect(blocks[3].text.text).toMatch(/— cold — email first/)
    expect(decodeContactRef(blocks[3].accessory.value)).toMatchObject({ contactId: 'c-3', organization: 'Org 3' })
    expect(blocks[3].accessory.action_id).toBe(MARQUETA_ACTION.prepCall)
  })

  it('shows at most eight, and says how many more', () => {
    const blocks = buildPrepListBlocks(
      Array.from({ length: 11 }, (_, index) => entry(index)),
      { heading: 'Your calls', handle },
    )
    expectValidSlackBlocks(blocks)
    expect(blocks.filter((block) => block.accessory)).toHaveLength(8)
    expect(blocks[blocks.length - 1].elements[0].text).toBe('…and 3 more on file.')
  })

  it('says plainly when the list is short, and how to prep someone not on file', () => {
    const short = buildPrepListBlocks([entry(1)], { heading: 'Your calls', handle })
    expectValidSlackBlocks(short)
    expect(short[short.length - 1].elements[0].text).toBe(
      'That’s everyone on your list right now. For someone who isn’t on file yet, tell <@U0MARQUETA> `prep Sam Rivera at Acme` and I’ll put an outline together.',
    )
    const empty = buildPrepListBlocks([], { heading: 'Your calls', handle })
    expectValidSlackBlocks(empty)
    expect(empty[empty.length - 1].elements[0].text).toMatch(/^Nobody is on your call list right now\./)
    expect(buildPrepListBlocks(Array.from({ length: 3 }, (_, index) => entry(index)), { heading: 'x', handle }).some((block) => block.type === 'context')).toBe(false)
  })

  it('survives hostile entries', () => {
    const blocks = buildPrepListBlocks(
      Array.from({ length: 9 }, (_, index) => ({ label: HOSTILE, temperature: 'cold' as const, detail: HOSTILE, contactId: `c-${index}`, organization: HOSTILE })),
      { heading: HOSTILE, handle },
    )
    expectValidSlackBlocks(blocks)
    for (const text of mrkdwnIn(blocks)) {
      expect(text).not.toContain('<!here>')
      expect(text).not.toContain('<@U123>')
    }
  })
})

describe('newContactDocument', () => {
  const base = { name: 'Sam Rivera', organization: 'Acme', role: 'CMIO', note: 'met her at HIMSS', ownerName: 'Juhan', now: NOW }

  it('stores only what was typed, as a new contact of unknown warmth', () => {
    const doc = newContactDocument(base)!
    expect(doc).toEqual({
      _id: doc._id,
      _type: 'marketingContact',
      name: 'Sam Rivera',
      organization: 'Acme',
      role: 'CMIO',
      status: 'new',
      warmth: 'unknown',
      owner: 'Juhan',
      howWeKnow: 'met her at HIMSS',
      sourceNotes: 'Added from Slack by Juhan on 2026-09-24',
    })
    expect(String(doc._id)).toMatch(/^marketingContact\.slack-[0-9a-z]+$/)
    for (const field of ['email', 'phone', 'segment']) expect(doc).not.toHaveProperty(field)
  })

  it('has a deterministic id, so a retry lands on the same record', () => {
    const a = newContactDocument(base)!
    const b = newContactDocument({ ...base, name: '  sam  RIVERA ', organization: 'ACME', role: '', note: '', now: new Date('2027-01-01T00:00:00Z') })!
    const c = newContactDocument({ ...base, organization: 'Acme Health' })!
    expect(a._id).toBe(b._id)
    expect(a._id).not.toBe(c._id)
    expect(newContactDocument({ ...base, name: 'José García' })!._id).toBe(newContactDocument({ ...base, name: 'Jose Garcia' })!._id)
  })

  it('leaves out role and note when none were typed, and never stores contact details', () => {
    const doc = newContactDocument({ ...base, role: '', note: '' })!
    expect(doc).not.toHaveProperty('role')
    expect(doc).not.toHaveProperty('howWeKnow')
    const noisy = newContactDocument({ ...base, name: 'sam@acme.com', note: 'cell 617-555-0100, sam.personal@gmail.com' })!
    expect(noisy).not.toHaveProperty('name')
    expect(JSON.stringify(noisy)).not.toMatch(/555-0100|@gmail|sam@acme/)
    expect(noisy.howWeKnow).toBe('cell [phone], [email]')
  })

  it('gives two people added by email alone two records, each filed under their domain', () => {
    const emailOnly = { organization: '', role: '', note: '', ownerName: 'Juhan', now: NOW }
    const jane = newContactDocument({ ...emailOnly, name: 'jane@mgb.org' })!
    const bob = newContactDocument({ ...emailOnly, name: 'bob@acme.com' })!
    expect(jane._id).not.toBe(bob._id)
    expect(jane).toEqual({
      _id: jane._id,
      _type: 'marketingContact',
      organization: 'mgb.org',
      status: 'new',
      warmth: 'unknown',
      owner: 'Juhan',
      sourceNotes: 'Added from Slack by Juhan on 2026-09-24',
    })
    expect(bob.organization).toBe('acme.com')
    for (const doc of [jane, bob]) expect(JSON.stringify(doc)).not.toMatch(/jane@|bob@/)

    // Two addresses at the same organisation are still two people.
    const atMgb = { ...emailOnly, organization: 'MGB' }
    const one = newContactDocument({ ...atMgb, name: 'jane@mgb.org' })!
    const two = newContactDocument({ ...atMgb, name: 'sam@mgb.org' })!
    expect(one._id).not.toBe(two._id)
    expect(one.organization).toBe('MGB')
    // …and the same address typed twice is the same record.
    expect(newContactDocument({ ...emailOnly, name: 'JANE@mgb.org' })!._id).toBe(jane._id)
  })

  it('writes nothing when there is neither a name nor an organisation to file it under', () => {
    const empty = { name: '', organization: '', role: '', note: '', ownerName: 'Juhan', now: NOW }
    expect(newContactDocument(empty)).toBeNull()
    // "prep the CIO" — a title alone is nobody.
    expect(newContactDocument({ ...empty, role: 'CIO', note: 'met at HIMSS' })).toBeNull()
    expect(newContactDocument({ ...empty, name: 'someone' })).toBeNull()
    // A free-mail address has no organisation behind it, and the address itself is never stored.
    expect(newContactDocument({ ...empty, name: 'jane.doe@gmail.com' })).toBeNull()
    expect(newContactDocument({ ...empty, name: '   ', organization: '  ' })).toBeNull()
    // An organisation alone is enough: "someone at Acme".
    expect(newContactDocument({ ...empty, name: 'someone', organization: 'Acme' })).toMatchObject({ organization: 'Acme' })
    expect(newContactDocument({ ...empty, name: 'someone', organization: 'Acme' })!._id).toBe(
      newContactDocument({ ...empty, organization: 'Acme' })!._id,
    )
  })
})
