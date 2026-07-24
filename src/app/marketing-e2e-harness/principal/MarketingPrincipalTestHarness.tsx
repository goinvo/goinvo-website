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

const HARNESS_USER = { roles: [{ name: 'administrator' }] }

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
          evidenceLinks: [],
          financialPosture: 'survival',
        }
      }
      if (query.includes('brandVoices')) return []
      throw new Error(`The Marketing E2E harness received an unexpected query: ${query.slice(0, 80)}`)
    },
  }
  const request: HarnessRequest = async <T,>(path: string, body?: unknown) => {
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
      <OutreachWorkspaceContent
        client={runtime.client}
        currentUser={HARNESS_USER}
        request={runtime.request}
        onAutopilotComplete={setCompletion}
      />
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
