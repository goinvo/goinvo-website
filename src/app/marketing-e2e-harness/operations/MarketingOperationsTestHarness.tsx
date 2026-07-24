'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  MarketingOperationsBoardContent,
} from '@/sanity/components/marketing/MarketingOperationsBoard'
import { WorkUpdateIntake } from '@/sanity/components/marketing/WorkUpdateIntake'
import type {
  MarketingOperation,
  MarketingOperationDashboardSignal,
  MarketingOperationPatch,
} from '@/lib/marketing/operations'
import type {
  MarketerBriefHandoffResult,
  MarketerBriefProposal,
} from '@/sanity/components/marketing/marketerBrief'

function operation(index: number): MarketingOperation {
  const history = index > 55
  return {
    _id: `marketingOperation.harness-${index}`,
    _type: 'marketingOperation',
    _rev: `rev-${index}-1`,
    title: `Operation ${String(index).padStart(2, '0')}`,
    summary: `Harness work item ${index}.`,
    nextAction: 'Review the bounded test item.',
    status: history ? 'done' : index > 50 ? 'working' : 'needsHuman',
    priority: index % 3 === 0 ? 'high' : 'normal',
    kind: 'update',
    origin: 'manual',
    autonomy: 'humanReview',
    targetView: 'dashboard',
    sourceKey: `harness:${index}`,
    sourceFingerprint: `fingerprint-${index}`,
    humanQuestion: history || index > 50 ? undefined : 'What should Marketing do next?',
  }
}

const SIGNALS: MarketingOperationDashboardSignal[] = Array.from({ length: 11 }, (_, index) => ({
  id: `harness-signal-${index + 1}`,
  title: `System check ${index + 1}`,
  why: `The harness found condition ${index + 1}.`,
  action: 'Review before assigning it.',
  view: 'dashboard',
  severity: index % 2 === 0 ? 'workflow' : 'measurement',
}))

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function createHarnessRuntime() {
    let items = Array.from({ length: 60 }, (_, index) => operation(index + 1))
    let getCount = 0
    const events: string[] = []
    const listeners = new Set<() => void>()
    const publish = (event: string) => {
      events.push(event)
      for (const listener of listeners) listener()
    }
    const request = async <T,>(path: string, body?: unknown, method: 'POST' | 'GET' = 'POST') => {
      if (path !== '/api/marketing/operations') throw new Error(`Unexpected harness request: ${path}`)
      if (method === 'GET') {
        getCount += 1
        const requestNumber = getCount
        const snapshot = items.map((item) => ({ ...item }))
        if (requestNumber === 2) snapshot[0] = { ...snapshot[0], title: 'Stale refresh result' }
        if (requestNumber >= 3) snapshot[0] = { ...snapshot[0], title: 'Latest refresh result' }
        publish(`get:${requestNumber}`)
        await delay(requestNumber === 2 ? 140 : requestNumber === 3 ? 15 : 1)
        return { items: snapshot } as T
      }

      const payload = body as { action?: string; id?: string; patch?: MarketingOperationPatch; operation?: MarketingOperation }
      if (payload.action === 'update' && payload.id) {
        publish(`update:${payload.id}`)
        await delay(80)
        const current = items.find((item) => item._id === payload.id)
        if (!current) throw new Error('Harness operation disappeared.')
        const updated = {
          ...current,
          ...payload.patch,
          _rev: `${current._rev || 'rev'}-next`,
        }
        items = items.map((item) => item._id === updated._id ? updated : item)
        return { item: { ...updated } } as T
      }
      if (payload.action === 'create' && payload.operation) {
        publish(`create:${payload.operation.sourceKey}`)
        await delay(80)
        const created = {
          ...payload.operation,
          _id: payload.operation._id || `marketingOperation.signal-${items.length + 1}`,
          _type: 'marketingOperation' as const,
          _rev: `created-${items.length + 1}`,
        }
        items = [created, ...items]
        return { item: { ...created } } as T
      }
      throw new Error('Unsupported harness operation.')
    }
    return { events, listeners, request }
}

export function MarketingOperationsTestHarness() {
  const runtime = useMemo(() => createHarnessRuntime(), [])
  const [, renderEvents] = useState(0)
  const [refreshToken, setRefreshToken] = useState(0)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [workEvents, setWorkEvents] = useState<string[]>([])

  useEffect(() => {
    const listener = () => renderEvents((current) => current + 1)
    runtime.listeners.add(listener)
    return () => {
      runtime.listeners.delete(listener)
    }
  }, [runtime])

  const requestAssist = async <T extends { error?: string }>(body: Record<string, unknown>) => {
    const prompt = String(body.prompt || '')
    setWorkEvents((current) => [...current, `analyze:${prompt}`])
    await delay(prompt.includes('slow') ? 120 : 20)
    if (prompt.includes('fail')) throw new Error('Synthetic analysis failure.')
    return {
      usedAi: true,
      suggestion: {
        summary: `Plan for ${prompt}`,
        researchProject: {
          title: prompt,
          brief: `Reviewed brief for ${prompt}.`,
          goals: ['Confirm the useful next move.'],
        },
      },
    } as unknown as T
  }

  const adopt = async (proposal: MarketerBriefProposal): Promise<MarketerBriefHandoffResult> => {
    const title = proposal.researchProject?.title || 'Untitled'
    setWorkEvents((current) => [...current, `adopt:${title}`])
    await delay(80)
    return {
      operationId: 'marketingOperation.work-update-harness',
      title,
      reused: false,
      createdResults: 0,
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 20,
        display: 'grid',
        gap: 20,
        background: '#101119',
        color: '#f6f7fb',
        '--card-bg-color': '#151824',
        '--card-fg-color': '#f6f7fb',
        '--card-muted-fg-color': '#aab1c2',
        '--card-border-color': 'rgba(255, 255, 255, 0.2)',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="race-refreshes"
          onClick={() => {
            setRefreshToken((current) => current + 1)
            window.setTimeout(() => setRefreshToken((current) => current + 1), 5)
          }}
        >
          Race refreshes
        </button>
        <button type="button" data-testid="focus-operation-30" onClick={() => setFocusId('marketingOperation.harness-30')}>
          Focus operation 30
        </button>
        <output data-testid="operations-request-log" aria-label="Operations request log">{runtime.events.join(', ') || 'none'}</output>
      </div>

      <MarketingOperationsBoardContent
        gaps={SIGNALS}
        owners={[{ _id: 'owner-1', title: 'Owner One' }]}
        refreshToken={refreshToken}
        focusOperationId={focusId}
        onOpenView={() => undefined}
        proofClient={undefined}
        request={runtime.request}
      />

      <section aria-labelledby="work-update-harness-title">
        <h2 id="work-update-harness-title">Work-update failure harness</h2>
        <output data-testid="work-update-request-log" aria-label="Work-update request log">{workEvents.join(', ') || 'none'}</output>
        <WorkUpdateIntake
          existingProjects={[]}
          requestAssist={requestAssist}
          onAdopt={adopt}
          onOpenOperations={() => undefined}
        />
      </section>
    </main>
  )
}
