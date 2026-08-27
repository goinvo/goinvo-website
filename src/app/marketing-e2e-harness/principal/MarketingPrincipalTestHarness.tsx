'use client'

import { useMemo, useState } from 'react'

import { GuidedTutorialOverlay } from '@/sanity/components/GuidedTutorialOverlay'
import { OutreachWorkspaceContent } from '@/sanity/components/marketing/OutreachWorkspace'
import {
  advanceScriptedAutopilotPlan,
  buildAutopilotCoachTutorial,
  buildPrincipalOutreachPlan,
  type AutopilotCompletionPayload,
  type StudioClient,
} from '@/sanity/tools/marketingTool'

const HARNESS_USER = {
  id: 'harness-principal-user',
  name: 'Harness Principal',
  roles: [{ name: 'administrator' }],
}

const HARNESS_OFFERS = [
  {
    _id: 'marketingOffer.harness',
    title: 'Rapid healthcare design diagnostic',
    key: 'rapid-diagnostic',
    status: 'active',
    oneLiner: 'A fixed-scope diagnostic for a blocked healthcare product.',
    priceBand: 'Fixed fee, $40–60K',
    order: 1,
  },
]

const HARNESS_EVIDENCE = [
  {
    _id: 'marketingWorkEvidence.harness',
    sourceId: 'caseStudy.harness',
    sourceType: 'caseStudy',
    sourceSlug: 'harness-work',
    title: 'Healthcare product strategy and delivery',
    summary: 'GoInvo helped a healthcare team move from evidence to a shipped product.',
    status: 'active',
    tags: ['healthcare', 'product strategy'],
    services: ['Product design'],
    outcomes: ['Shipped product'],
    highlights: ['Evidence-backed roadmap'],
  },
]

const HARNESS_WARM_START = {
  caseStudyClients: [
    { client: '3M', title: 'Natural Language Processing Software for 3M' },
    { client: 'IPSOS', title: 'The Future of Research Intelligence' },
  ],
  thankedPeople: [
    {
      text: [
        'Peter Jones',
        'Jen Patel',
        'Eric Benoit',
        'Sharon Lee',
        'Juhan Sonin',
        'Huahua Zhu',
      ].join('\n'),
      featureTitle: 'Test. Treat. Trace.',
    },
  ],
  teamMembers: [
    { name: 'Jen Patel' },
    { name: 'Eric Benoit' },
    { name: 'Sharon Lee' },
    { name: 'Juhan Sonin' },
    { name: 'Huahua Zhu' },
  ],
}

type HarnessRequest = <T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method?: 'POST' | 'GET',
  proofClient?: unknown,
) => Promise<T>

function parseHarnessContact(line: string) {
  const parts = line.split('—').map((part) => part.trim()).filter(Boolean)
  const organizationLabel = line.match(/organization:\s*([^—]+)/i)?.[1]?.trim()
  const fallbackOrganization = parts[1] && !/^(?:account placeholder|how we know:)/i.test(parts[1])
    ? parts[1]
    : undefined
  return {
    name: parts[0] || line.trim(),
    organization: organizationLabel || fallbackOrganization,
    howWeKnow: line.match(/how we know:\s*(.+)$/i)?.[1]?.trim(),
    warmth: 'warm',
    status: 'new',
    sourceLine: line,
  }
}

function createHarnessRuntime(onRequest: (event: string) => void): {
  client: StudioClient
  request: HarnessRequest
} {
  // Keep the fake client honest: Sanity fetches return fresh snapshots. Returning
  // one mutable array lets React memos stay stale after a create, which can make
  // the harness both invent UI bugs and conceal real update behavior.
  let contacts: Array<Record<string, unknown>> = []
  let intakeCheckpoints: Array<Record<string, unknown>> = []
  const updateContact = (id: string, update: (contact: Record<string, unknown>) => Record<string, unknown>) => {
    contacts = contacts.map((contact) => (contact._id === id ? update(contact) : contact))
  }
  const client = {
    withConfig: () => client,
    fetch: async (query: string) => {
      if (query.includes('"caseStudyClients"')) {
        if (!query.includes('"teamMembers": *[_type == "teamMember" && defined(name)]{name}')) {
          throw new Error('Warm-start must load every named team-directory record for exclusion.')
        }
        return HARNESS_WARM_START
      }
      if (query.includes('"contacts"')) {
        return {
          contacts: contacts.map((contact) => ({ ...contact })),
          offers: HARNESS_OFFERS,
          evidenceLinks: HARNESS_EVIDENCE,
          intakeCheckpoints: intakeCheckpoints.map((checkpoint) => ({ ...checkpoint })),
          financialPosture: 'survival',
        }
      }
      if (query.includes('brandVoices')) return []
      throw new Error(`The Marketing E2E harness received an unexpected query: ${query.slice(0, 80)}`)
    },
    createOrReplace: async (document: Record<string, unknown>) => {
      intakeCheckpoints = [
        { ...document },
        ...intakeCheckpoints.filter((checkpoint) => checkpoint._id !== document._id),
      ]
      return { ...document }
    },
    patch: (id: string) => {
      let valuesToSet: Record<string, unknown> = {}
      let valuesToSetIfMissing: Record<string, unknown> = {}
      let fieldsToUnset: string[] = []
      let entriesToInsert: Array<Record<string, unknown>> = []
      const patch = {
        set: (values: Record<string, unknown>) => {
          valuesToSet = { ...valuesToSet, ...values }
          return patch
        },
        setIfMissing: (values: Record<string, unknown>) => {
          valuesToSetIfMissing = { ...valuesToSetIfMissing, ...values }
          return patch
        },
        unset: (fields: string[]) => {
          fieldsToUnset = [...fieldsToUnset, ...fields]
          return patch
        },
        insert: (_position: string, path: string, entries: Array<Record<string, unknown>>) => {
          if (path !== 'interactions[-1]') {
            throw new Error(`The Marketing E2E harness received an unexpected insert path: ${path}`)
          }
          entriesToInsert = [...entriesToInsert, ...entries]
          return patch
        },
        ifRevisionId: () => patch,
        commit: async () => {
          updateContact(id, (contact) => {
            const next = { ...contact }
            for (const [key, value] of Object.entries(valuesToSetIfMissing)) {
              if (next[key] === undefined) next[key] = value
            }
            Object.assign(next, valuesToSet)
            for (const field of fieldsToUnset) delete next[field]
            if (entriesToInsert.length > 0) {
              next.interactions = [
                ...((next.interactions as Array<Record<string, unknown>> | undefined) || []),
                ...entriesToInsert,
              ]
            }
            next._rev = `harness-${Date.now()}`
            next._updatedAt = new Date().toISOString()
            return next
          })
          return { _id: id }
        },
      }
      return patch
    },
  }
  const request: HarnessRequest = async <T,>(path: string, body?: unknown) => {
    if (path === '/api/marketing/outreach/research') {
      const contactId = (body as { id?: string } | undefined)?.id
      if (!contactId || !contacts.some((contact) => contact._id === contactId)) {
        throw new Error('The Marketing E2E harness research request did not identify a saved contact.')
      }
      onRequest(`research:${contactId}`)
      updateContact(contactId, (contact) => ({
        ...contact,
        status: 'needsReview',
        researchedAt: new Date().toISOString(),
        researchSummary: 'Verified healthcare leader with a relevant active initiative.',
        personVerified: true,
        identityConfidence: 'high',
        warmth: contact.warmth || 'warm',
        howWeKnow: contact.howWeKnow || 'Known through prior GoInvo work',
        email: contact.email || 'principal-pipeline@example.com',
        callBrief: 'Discuss the active healthcare initiative, show the relevant work, and offer a focused diagnostic.',
        suggestedOpener: 'I thought of your current initiative after reviewing a similar product challenge we shipped.',
        suggestedOfferKey: HARNESS_OFFERS[0]?.key,
        relevantEvidence: [
          {
            _key: 'harness-evidence',
            evidenceId: HARNESS_EVIDENCE[0]?._id,
            title: HARNESS_EVIDENCE[0]?.title,
            why: 'Relevant healthcare product strategy and delivery work.',
          },
        ],
        researchSources: [
          {
            _key: 'harness-source',
            title: 'Harness organization profile',
            url: 'https://example.com/harness-profile',
          },
        ],
      }))
      return { feasibilityScore: 85, personVerified: true, evidenceIndexSize: 1 } as T
    }
    if (path !== '/api/marketing/outreach/intake') {
      throw new Error(`The Marketing E2E harness received an unexpected request: ${path}`)
    }
    const payload = body as {
      text?: string
      dryRun?: boolean
      contacts?: Array<Record<string, unknown>>
    }
    if (payload.dryRun) {
      if (payload.text?.includes('FAIL_PREVIEW')) {
        onRequest('intake:preview:error')
        throw new Error('Synthetic preview failure. Correct the row and try again.')
      }
      const structured = (payload.contacts || []).map((contact) => ({ ...contact }))
      const parsedText = (payload.text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseHarnessContact)
      const parsed = [...structured, ...parsedText]
      const requestKind = payload.contacts && payload.text
        ? `mixed:${structured.length}+${parsedText.length}`
        : payload.contacts
          ? `structured:${structured.length}`
          : String(parsedText.length)
      onRequest(`intake:preview:${requestKind}`)
      return { contacts: parsed, duplicates: 0 } as T
    }
    onRequest(`intake:create:${payload.contacts?.length || 0}`)
    const startingContactCount = contacts.length
    const created = (payload.contacts || []).map((contact, index) => {
      const id = `marketingContact.harness-${startingContactCount + index + 1}`
      const savedContact = {
        ...contact,
        _id: id,
        _rev: `harness-${index + 1}`,
        _updatedAt: new Date(0).toISOString(),
      }
      contacts = [...contacts, savedContact]
      return { id }
    })
    return { created, skipped: [], seededOffers: 0 } as T
  }
  return { client: client as unknown as StudioClient, request }
}

export function MarketingPrincipalTestHarness() {
  const [requestEvents, setRequestEvents] = useState<string[]>([])
  const [completion, setCompletion] = useState<AutopilotCompletionPayload | null>(null)
  const runtime = useMemo(
    () => createHarnessRuntime((event) => setRequestEvents((current) => [...current, event])),
    [],
  )
  const [coachStep, setCoachStep] = useState<0 | 1 | null>(null)
  const principalPlan = useMemo(() => buildPrincipalOutreachPlan(), [])
  const intakePlan = useMemo(
    () => advanceScriptedAutopilotPlan(principalPlan, 'principal-plan-warm-network'),
    [principalPlan],
  )
  const coachPlan = coachStep === 1 ? intakePlan : principalPlan
  const tutorial = useMemo(
    () =>
      buildAutopilotCoachTutorial(coachPlan, () => undefined, () => undefined, {
        checkingPrerequisites: false,
        prerequisiteNotice: null,
        contactCount: 0,
      }),
    [coachPlan],
  )

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background: '#101119',
        color: '#f6f7fb',
        '--card-bg-color': '#151824',
        '--card-fg-color': '#f6f7fb',
        '--card-muted-fg-color': '#aab1c2',
        '--card-border-color': 'rgba(255, 255, 255, 0.2)',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <button type="button" data-testid="show-preflight-coach" onClick={() => setCoachStep(0)}>
          Show preflight coach
        </button>
        <button type="button" data-testid="show-intake-coach" onClick={() => setCoachStep(1)}>
          Show intake coach
        </button>
        <output data-testid="harness-request-log" aria-label="Harness request log">
          {requestEvents.length ? requestEvents.join(', ') : 'none'}
        </output>
        <output data-testid="harness-completion" aria-label="Harness Autopilot completion">
          {completion?.action || 'none'}
        </output>
      </div>
      <div data-tour-id="autopilot-outreach-workflow">
        <OutreachWorkspaceContent
          client={runtime.client}
          currentUser={HARNESS_USER}
          request={runtime.request}
          onAutopilotComplete={setCompletion}
        />
      </div>
      {coachStep !== null && (
        <GuidedTutorialOverlay
          active
          compact
          tutorial={tutorial}
          stepIndex={coachStep}
          onStepChange={(index) => setCoachStep(index === 0 ? 0 : 1)}
          onClose={() => setCoachStep(null)}
          onRestart={() => undefined}
          onShowLibrary={() => undefined}
        />
      )}
    </main>
  )
}
