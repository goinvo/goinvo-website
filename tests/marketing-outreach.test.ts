import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { NextRequest } from 'next/server'

import { schemaTypes } from '@/sanity/schemas'
import contactSchema from '@/sanity/schemas/marketingContact'
import offerSchema from '@/sanity/schemas/marketingOffer'
import {
  CALL_PLAN_STATUSES,
  OFFER_STATUS_OPTIONS,
  OUTREACH_SEGMENT_OPTIONS,
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_WARMTH_OPTIONS,
} from '@/lib/marketing/outreachEnums'
import {
  buildContactCreateDoc,
  buildEvidenceDoc,
  buildEvidenceExtractionPrompts,
  buildIntakePrompts,
  buildInteractionEntry,
  buildResearchPatch,
  buildResearchPrompts,
  compactEvidenceIndex,
  contactDedupeKey,
  DEFAULT_OFFERS,
  dueFollowUps,
  evidenceDocId,
  normalizeEvidence,
  normalizeParsedContacts,
  normalizeResearch,
  offerDocId,
  rankCallPlan,
  type EvidenceIndexItem,
  type OutreachContact,
} from '@/lib/marketing/outreach'
import { MANAGED_MARKETING_TYPES } from '@/lib/marketing/types'
import { ARRAY_ITEM_TYPES, DEFAULTS, REQUIRED_FIELDS } from '@/lib/marketing/defaults'
import { buildCreatePayload, MarketingValidationError } from '@/lib/marketing/crud'
import { MARKETING_SURFACES, MARKETING_TOOL_VIEWS, resolveMarketingViewParam } from '@/sanity/tools/marketingTool'

type SchemaField = { name?: string; options?: { list?: Array<{ value?: string } | string> } }

function schemaField(schema: unknown, name: string): SchemaField {
  const fields = ((schema as { fields?: SchemaField[] }).fields || []) as SchemaField[]
  const field = fields.find((candidate) => candidate.name === name)
  expect(field, `Expected field "${name}" to exist`).toBeDefined()
  return field as SchemaField
}

function optionValues(field: SchemaField): string[] {
  return (field.options?.list || [])
    .map((o) => (typeof o === 'string' ? o : o.value))
    .filter((v): v is string => Boolean(v))
}

describe('outreach schemas + shared enums', () => {
  it('registers marketingContact and marketingOffer in the schema list', () => {
    const names = schemaTypes.map((s) => (s as { name: string }).name)
    expect(names).toContain('marketingContact')
    expect(names).toContain('marketingOffer')
  })

  it('contact schema options come from the shared enums module', () => {
    expect(optionValues(schemaField(contactSchema, 'status'))).toEqual(
      OUTREACH_STATUS_OPTIONS.map((o) => o.value),
    )
    expect(optionValues(schemaField(contactSchema, 'segment'))).toEqual(
      OUTREACH_SEGMENT_OPTIONS.map((o) => o.value),
    )
    expect(optionValues(schemaField(contactSchema, 'warmth'))).toEqual(
      OUTREACH_WARMTH_OPTIONS.map((o) => o.value),
    )
    expect(optionValues(schemaField(offerSchema, 'status'))).toEqual(
      OFFER_STATUS_OPTIONS.map((o) => o.value),
    )
  })

  it('both types are managed with defaults, array item types, and required fields', () => {
    expect(MANAGED_MARKETING_TYPES).toContain('marketingContact')
    expect(MANAGED_MARKETING_TYPES).toContain('marketingOffer')
    expect(DEFAULTS.marketingContact).toEqual({ status: 'new', warmth: 'warm' })
    expect(DEFAULTS.marketingOffer).toEqual({ status: 'active', order: 100 })
    expect(ARRAY_ITEM_TYPES.marketingContact).toEqual({
      opportunities: 'outreachOpportunity',
      researchSources: 'outreachSource',
      relevantEvidence: 'outreachEvidenceRef',
      proposedOffers: 'outreachProposedOffer',
      interactions: 'outreachInteraction',
    })
    expect(REQUIRED_FIELDS.marketingContact).toEqual(['name', 'status'])
    expect(REQUIRED_FIELDS.marketingOffer).toEqual(['title', 'key', 'status'])
  })

  it('generic CRUD builds a contact create payload with defaults applied', () => {
    const payload = buildCreatePayload('marketingContact', { name: 'Sarah Chen' })
    expect(payload._type).toBe('marketingContact')
    expect(payload.name).toBe('Sarah Chen')
    expect(payload.status).toBe('new')
    expect(payload.warmth).toBe('warm')
    expect(() => buildCreatePayload('marketingContact', {})).toThrow(MarketingValidationError)
  })

  it('resolves ?view= deep links to a view id (by view id or surface id)', () => {
    // Exact view ids — including the two Outreach tabs a shared link targets.
    expect(resolveMarketingViewParam('outreach')).toBe('outreach')
    expect(resolveMarketingViewParam('workEvidence')).toBe('workEvidence')
    expect(resolveMarketingViewParam('calendar')).toBe('calendar')
    // A surface id resolves to its landing view (friendlier section links).
    expect(resolveMarketingViewParam('plan')).toBe('research')
    expect(resolveMarketingViewParam('outreach')).toBe(MARKETING_SURFACES.find((s) => s.id === 'outreach')?.landingView)
    // Unknown / empty → null (caller falls back to stored view).
    expect(resolveMarketingViewParam('bogus')).toBeNull()
    expect(resolveMarketingViewParam('')).toBeNull()
    expect(resolveMarketingViewParam(null)).toBeNull()
    expect(resolveMarketingViewParam(undefined)).toBeNull()
  })

  it('the Outreach + Evidence views and surface are registered in the marketing tool', () => {
    expect(MARKETING_TOOL_VIEWS.some((view) => view.id === 'outreach')).toBe(true)
    expect(MARKETING_TOOL_VIEWS.some((view) => view.id === 'workEvidence')).toBe(true)
    const surface = MARKETING_SURFACES.find((s) => s.id === 'outreach')
    expect(surface).toBeDefined()
    expect(surface?.landingView).toBe('outreach')
    expect(surface?.tabs.map((t) => t.view)).toEqual(['outreach', 'workEvidence'])
  })

  it('marketingWorkEvidence is a managed type with defaults + required fields', () => {
    expect(MANAGED_MARKETING_TYPES).toContain('marketingWorkEvidence')
    expect(DEFAULTS.marketingWorkEvidence).toEqual({
      status: 'active',
      sourceType: 'caseStudy',
      manuallyEdited: false,
    })
    expect(ARRAY_ITEM_TYPES.marketingWorkEvidence).toEqual({ highlights: 'evidenceHighlight' })
    expect(REQUIRED_FIELDS.marketingWorkEvidence).toEqual(['title', 'status'])
  })

  it('default offers have unique keys and deterministic doc ids', () => {
    const keys = DEFAULT_OFFERS.map((o) => o.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(offerDocId('ai-pilot-premortem')).toBe('marketingOffer-ai-pilot-premortem')
    for (const offer of DEFAULT_OFFERS) {
      expect(offer.title).toBeTruthy()
      expect(offer.oneLiner).toBeTruthy()
    }
  })
})

describe('intake parsing', () => {
  it('builds prompts that embed the pasted text and enum values', () => {
    const prompts = buildIntakePrompts('Jane Doe — Acme Health')
    expect(prompts.user).toContain('Jane Doe — Acme Health')
    expect(prompts.user).toContain('medDevice')
    expect(prompts.system).toContain('Do NOT invent facts')
  })

  it('normalizes parsed contacts: drops nameless, validates enums, flags duplicates', () => {
    const existing = new Set([contactDedupeKey('Tom Rivera', 'Verily')])
    const contacts = normalizeParsedContacts(
      {
        contacts: [
          { name: '  Sarah Chen ', organization: 'Medtronic', segment: 'medDevice', warmth: 'hot' },
          { name: 'Tom Rivera', organization: 'Verily', segment: 'not-a-segment', warmth: 'blazing' },
          { organization: 'No Name Corp' },
          { name: 'Sarah Chen', organization: 'Medtronic' }, // repeat within batch
        ],
      },
      existing,
    )
    expect(contacts).toHaveLength(2)
    expect(contacts[0].name).toBe('Sarah Chen')
    expect(contacts[0].segment).toBe('medDevice')
    expect(contacts[0].warmth).toBe('hot')
    expect(contacts[0].duplicate).toBeUndefined()
    expect(contacts[1].name).toBe('Tom Rivera')
    expect(contacts[1].segment).toBeUndefined() // invalid enum dropped
    expect(contacts[1].warmth).toBeUndefined()
    expect(contacts[1].duplicate).toBe(true)
  })

  it('returns an empty list for malformed model output', () => {
    expect(normalizeParsedContacts(null)).toEqual([])
    expect(normalizeParsedContacts({ contacts: 'nope' })).toEqual([])
    expect(normalizeParsedContacts({ contacts: [null, 42, 'x'] })).toEqual([])
  })

  it('dedupe key is case- and whitespace-insensitive', () => {
    expect(contactDedupeKey('  Sarah  CHEN ', 'medtronic')).toBe(contactDedupeKey('sarah chen', 'Medtronic '))
    expect(contactDedupeKey('Sarah Chen', 'Medtronic')).not.toBe(contactDedupeKey('Sarah Chen', 'Abbott'))
  })

  it('builds a create doc with only the fields that exist', () => {
    const doc = buildContactCreateDoc({ name: 'Jane', organization: 'Acme', sourceLine: 'Jane — Acme' })
    expect(doc).toEqual({
      _type: 'marketingContact',
      name: 'Jane',
      status: 'new',
      warmth: 'warm',
      organization: 'Acme',
      sourceNotes: 'Jane — Acme',
    })
  })
})

describe('research normalization + patch', () => {
  const offers = DEFAULT_OFFERS

  it('embeds the contact and the live offer catalog in the research prompts', () => {
    const prompts = buildResearchPrompts(
      { _id: 'c1', name: 'Sarah Chen', organization: 'Medtronic' },
      offers,
    )
    expect(prompts.user).toContain('Sarah Chen')
    expect(prompts.user).toContain('ai-pilot-premortem')
    expect(prompts.system).toContain('web_search')
  })

  it('clamps the feasibility score and validates offer keys', () => {
    const research = normalizeResearch(
      {
        researchSummary: 'Org is investing in surgical AI.',
        feasibilityScore: 187,
        opportunities: [
          { offerKey: 'human-factors-510k', headline: 'New 510(k) pipeline', rationale: 'Filed in March' },
          { offerKey: 'made-up-offer', headline: 'Bogus offer key survives as headline-only' },
        ],
        suggestedOfferKey: 'another-fake-key',
        sources: [{ title: 'Press release', url: 'https://example.com/pr' }, { title: 'no url' }],
      },
      offers,
    )
    expect(research.feasibilityScore).toBe(100)
    expect(research.opportunities).toHaveLength(2)
    expect(research.opportunities[0].offerKey).toBe('human-factors-510k')
    expect(research.opportunities[1].offerKey).toBeUndefined()
    // Unknown suggested key falls back to the first valid opportunity key.
    expect(research.suggestedOfferKey).toBe('human-factors-510k')
    expect(research.sources).toEqual([{ title: 'Press release', url: 'https://example.com/pr' }])
  })

  it('treats garbage scores as null (model-failed ≠ scored zero) and bounds array sizes', () => {
    const research = normalizeResearch(
      {
        feasibilityScore: 'very high',
        opportunities: Array.from({ length: 9 }, (_, i) => ({ headline: `opp ${i}` })),
        sources: Array.from({ length: 20 }, (_, i) => ({ url: `https://example.com/${i}` })),
      },
      offers,
    )
    expect(research.feasibilityScore).toBeNull()
    expect(normalizeResearch({ feasibilityScore: 0 }, offers).feasibilityScore).toBe(0)
    expect(research.opportunities).toHaveLength(5)
    expect(research.sources).toHaveLength(10)
  })

  const EVIDENCE_INDEX: EvidenceIndexItem[] = [
    { id: 'workEvidence-cs-facto', title: 'Ipsos Facto', client: 'Ipsos' },
    { id: 'workEvidence-cs-coderyte', title: 'CodeRyte', client: '3M' },
  ]

  it('validates evidence references and proposed offers against the index', () => {
    const research = normalizeResearch(
      {
        researchSummary: 'Org summary.',
        personVerified: true,
        identityConfidence: 'high',
        relevantEvidence: [
          { evidenceId: 'workEvidence-cs-facto', why: 'They are building internal AI.' },
          { evidenceId: 'workEvidence-cs-fabricated', title: 'Made up', why: 'nope' },
        ],
        proposedOffers: [
          {
            title: 'Medical-affairs AI adoption sprint',
            oneLiner: 'Six weeks to a clinician-adopted pilot.',
            priceBand: 'Fixed fee, $60–90K',
            evidenceIds: ['workEvidence-cs-facto', 'workEvidence-cs-fabricated'],
          },
          { oneLiner: 'no title → dropped' },
        ],
      },
      offers,
      EVIDENCE_INDEX,
    )
    expect(research.personVerified).toBe(true)
    expect(research.identityConfidence).toBe('high')
    expect(research.relevantEvidence).toHaveLength(1)
    expect(research.relevantEvidence[0].title).toBe('Ipsos Facto') // backfilled from the index
    expect(research.proposedOffers).toHaveLength(1)
    expect(research.proposedOffers[0].evidenceIds).toEqual(['workEvidence-cs-facto'])
  })

  it('defaults personVerified to false and drops invalid identityConfidence', () => {
    const research = normalizeResearch({ researchSummary: 'x', identityConfidence: 'certain!!' }, offers)
    expect(research.personVerified).toBe(false)
    expect(research.identityConfidence).toBeUndefined()
  })

  it('builds a patch that keys arrays and only advances status from new/researched', () => {
    const research = normalizeResearch(
      {
        researchSummary: 'Summary',
        feasibilityScore: 70,
        opportunities: [{ offerKey: 'ai-pilot-premortem', headline: 'Stalled pilot' }],
        suggestedOfferKey: 'ai-pilot-premortem',
        sources: [],
      },
      offers,
    )
    const patch = buildResearchPatch(research, {
      model: 'claude-opus-4-8',
      researchedAt: '2026-07-02T12:00:00.000Z',
      currentStatus: 'new',
      fallbackSources: [{ title: 'Fallback', url: 'https://example.com/f' }],
    })
    expect(patch.status).toBe('researched')
    expect(patch.researchModel).toBe('claude-opus-4-8')
    expect((patch.opportunities as Array<Record<string, unknown>>)[0]).toMatchObject({
      _key: 'opp-0',
      _type: 'outreachOpportunity',
      offerKey: 'ai-pilot-premortem',
    })
    // Model returned no sources → the web_search citations are used instead.
    expect((patch.researchSources as Array<Record<string, unknown>>)[0]).toMatchObject({
      _type: 'outreachSource',
      url: 'https://example.com/f',
    })

    const noRegress = buildResearchPatch(research, {
      model: 'm',
      researchedAt: '2026-07-02T12:00:00.000Z',
      currentStatus: 'contacted',
    })
    expect(noRegress.status).toBeUndefined()
  })
})

describe('call plan ranking + follow-ups', () => {
  const contact = (id: string, status: string, score?: number, warmth?: string, followUpAt?: string): OutreachContact => ({
    _id: id,
    name: id,
    status,
    feasibilityScore: score,
    warmth,
    followUpAt,
  })

  it('includes only researched/briefed contacts, ranked by score within a warmth tier', () => {
    const plan = rankCallPlan([
      contact('low', 'researched', 20),
      contact('contacted', 'contacted', 99),
      contact('high', 'briefed', 90),
      contact('new', 'new', 80),
      contact('unscored', 'researched'),
      contact('closed', 'closed', 95),
    ])
    expect(plan.map((c) => c._id)).toEqual(['high', 'low', 'unscored'])
    expect(CALL_PLAN_STATUSES).toEqual(['researched', 'briefed'])
  })

  it('ranks warmth ABOVE score — a hot friend beats a cold name with a shiny org', () => {
    const plan = rankCallPlan([
      contact('cold-shiny', 'researched', 95, 'cold'),
      contact('hot-modest', 'researched', 45, 'hot'),
      contact('warm-good', 'researched', 80, 'warm'),
      contact('warm-ok', 'researched', 60, 'warm'),
      contact('no-warmth', 'researched', 99),
    ])
    expect(plan.map((c) => c._id)).toEqual(['hot-modest', 'warm-good', 'warm-ok', 'cold-shiny', 'no-warmth'])
  })

  it('respects the limit', () => {
    const many = Array.from({ length: 15 }, (_, i) => contact(`c${i}`, 'researched', i))
    expect(rankCallPlan(many, { limit: 5 })).toHaveLength(5)
    expect(rankCallPlan(many)).toHaveLength(10)
  })

  it('surfaces due + overdue follow-ups for contacted-tier statuses only, oldest first', () => {
    const now = '2026-07-02T12:00:00.000Z'
    const due = dueFollowUps(
      [
        contact('overdue', 'contacted', undefined, undefined, '2026-06-20T00:00:00.000Z'),
        contact('due-soon', 'meeting', undefined, undefined, '2026-07-05T00:00:00.000Z'),
        contact('far-future', 'responded', undefined, undefined, '2026-09-01T00:00:00.000Z'),
        contact('no-date', 'contacted'),
        contact('wrong-status', 'researched', undefined, undefined, '2026-06-20T00:00:00.000Z'),
      ],
      { now },
    )
    expect(due.map((c) => c._id)).toEqual(['overdue', 'due-soon'])
  })

  it('builds append-only interaction entries with stable keys', () => {
    const entry = buildInteractionEntry({
      at: '2026-07-02T15:30:00.000Z',
      outcome: 'Left a voicemail.',
      statusAfter: 'contacted',
    })
    expect(entry._type).toBe('outreachInteraction')
    expect(entry.statusAfter).toBe('contacted')
    expect(String(entry._key)).toMatch(/^int-/)
  })
})

describe('work-evidence extraction', () => {
  it('embeds the case-study text and the project-work-only discipline in the prompts', () => {
    const prompts = buildEvidenceExtractionPrompts({
      _id: 'cs-1',
      title: 'Ipsos Facto',
      client: 'Ipsos',
      text: 'We designed and shipped an AI research assistant…',
    })
    expect(prompts.user).toContain('AI research assistant')
    expect(prompts.system).toContain('NEVER extract: webpage implementation details')
    expect(prompts.system).toContain('Banned vocabulary')
  })

  it('normalizes extraction output: bounds lists, keys highlights, validates segments', () => {
    const evidence = normalizeEvidence({
      summary: 'Built an AI assistant Ipsos researchers actually adopted.',
      segments: ['pharma', 'not-a-segment'],
      techniques: Array.from({ length: 15 }, (_, i) => `technique ${i}`),
      highlights: [
        { metric: '90%+ adoption', detail: 'internal rollout' },
        { nothing: true },
      ],
    })
    expect(evidence.segments).toEqual(['pharma'])
    expect(evidence.techniques).toHaveLength(10)
    expect(evidence.highlights).toHaveLength(1)
    expect((evidence.highlights || [])[0]).toMatchObject({ _key: 'hl-0', metric: '90%+ adoption' })
  })

  it('builds a deterministic createOrReplace doc per case study', () => {
    const doc = buildEvidenceDoc(
      { _id: 'cs-abc', title: 'Facto', slug: 'facto', client: 'Ipsos' },
      normalizeEvidence({ summary: 'S.' }),
      { model: 'claude-opus-4-8', extractedAt: '2026-07-02T00:00:00.000Z' },
    )
    expect(doc._id).toBe(evidenceDocId('cs-abc'))
    expect(doc._type).toBe('marketingWorkEvidence')
    expect(doc.status).toBe('active')
    expect(doc.url).toBe('https://www.goinvo.com/work/facto')
    // Same source id → same doc id (idempotent upsert)
    expect(evidenceDocId('cs-abc')).toBe(evidenceDocId('cs-abc'))
  })

  it('compacts the evidence index and skips excluded records', () => {
    const index = compactEvidenceIndex([
      {
        _id: 'workEvidence-1',
        title: 'Facto',
        status: 'active',
        techniques: Array.from({ length: 9 }, (_, i) => `t${i}`),
        highlights: [{ metric: '90%', detail: 'adoption' }],
      },
      { _id: 'workEvidence-2', title: 'Hidden', status: 'excluded' },
    ])
    expect(index).toHaveLength(1)
    expect(index[0].techniques).toHaveLength(5)
    expect(index[0].highlights).toEqual(['90% — adoption'])
  })
})

describe('outreach route auth (fail-closed)', () => {
  const originalMarketingKey = process.env.MARKETING_API_KEY
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    process.env.MARKETING_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalMarketingKey === undefined) delete process.env.MARKETING_API_KEY
    else process.env.MARKETING_API_KEY = originalMarketingKey
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey
  })

  const request = (url: string, headers: Record<string, string> = {}) =>
    new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ text: 'Jane Doe — Acme', id: 'contact-1' }),
    }) as unknown as NextRequest

  it('intake rejects unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/marketing/outreach/intake/route')
    const response = await POST(request('http://localhost/api/marketing/outreach/intake'))
    expect(response.status).toBe(401)
  })

  it('research rejects unauthenticated requests', async () => {
    const { POST } = await import('@/app/api/marketing/outreach/research/route')
    const response = await POST(request('http://localhost/api/marketing/outreach/research'))
    expect(response.status).toBe(401)
  })

  it('intake is disabled (503) without ANTHROPIC_API_KEY even when authenticated', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { POST } = await import('@/app/api/marketing/outreach/intake/route')
    const response = await POST(
      request('http://localhost/api/marketing/outreach/intake', {
        Authorization: 'Bearer test-key',
      }),
    )
    expect(response.status).toBe(503)
  })

  it('research is disabled (503) without ANTHROPIC_API_KEY even when authenticated', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { POST } = await import('@/app/api/marketing/outreach/research/route')
    const response = await POST(
      request('http://localhost/api/marketing/outreach/research', {
        Authorization: 'Bearer test-key',
      }),
    )
    expect(response.status).toBe(503)
  })
})
