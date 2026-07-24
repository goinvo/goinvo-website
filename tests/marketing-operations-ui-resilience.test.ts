import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { LatestExclusiveRequestGate } from '@/sanity/components/marketing/asyncRequestGate'
import {
  MARKETING_OPERATIONS_PAGE_SIZE,
  MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE,
  getMarketingOperationsPage,
} from '@/sanity/components/marketing/MarketingOperationsBoard'
import {
  findReusableMarketerBriefProject,
  normalizeMarketerBriefProject,
  type MarketerBriefProject,
} from '@/sanity/components/marketing/marketerBrief'
import { normalizeKnowledgeBaseProgress } from '@/sanity/tools/gettingStarted'

describe('Marketing Operations UI request integrity', () => {
  it('rejects a same-tick duplicate and makes cancelled or superseded results stale', () => {
    const gate = new LatestExclusiveRequestGate<'preview' | 'save'>()
    const first = gate.begin('preview', 'draft-a')

    expect(first).not.toBeNull()
    expect(gate.pending).toBe(true)
    expect(gate.begin('preview', 'draft-a')).toBeNull()
    expect(gate.isCurrent(first!)).toBe(true)

    gate.cancel()
    expect(gate.pending).toBe(false)
    expect(gate.isCurrent(first!)).toBe(false)
    expect(gate.finish(first!)).toBe(false)

    const second = gate.begin('preview', 'draft-b')!
    const latest = gate.supersede('save', 'record-2')
    expect(gate.isCurrent(second)).toBe(false)
    expect(gate.isCurrent(latest)).toBe(true)
    expect(gate.finish(latest)).toBe(true)
    expect(gate.pending).toBe(false)
  })

  it('bounds high-cardinality operations and signal queues and clamps hostile page input', () => {
    const rows = Array.from({ length: 10_001 }, (_, index) => index)
    const first = getMarketingOperationsPage(rows, -500, MARKETING_OPERATIONS_PAGE_SIZE)
    const last = getMarketingOperationsPage(rows, Number.MAX_SAFE_INTEGER, MARKETING_OPERATIONS_PAGE_SIZE)
    const signals = getMarketingOperationsPage(rows, 1, MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE)

    expect(first).toMatchObject({ page: 0, pageCount: 401, start: 0, end: 25 })
    expect(first.items).toHaveLength(25)
    expect(last.page).toBe(400)
    expect(last.items).toEqual([10_000])
    expect(signals.items).toEqual([4, 5, 6, 7])
    expect(getMarketingOperationsPage(rows, Number.NaN, 0).items).toEqual([0])
  })
})

describe('rough-update normalization under hostile input', () => {
  it('sanitizes and de-duplicates model-controlled Sanity array keys', () => {
    const normalized = normalizeMarketerBriefProject({
      researchProject: {
        title: 'Hostile keys',
        researchQuestions: [
          { _key: 'bad key-3', question: 'Question zero?' },
          { _key: '../../ bad key !', question: 'Question one?' },
          { _key: '../../ bad key !', question: 'Question two?' },
        ],
        collaborators: [
          { _key: '<same key>', name: 'Alex', organization: 'One' },
          { _key: '<same key>', name: 'Sam', organization: 'Two' },
        ],
      },
    })

    const keys = [
      ...normalized.researchQuestions.map((item) => item._key),
      ...normalized.collaborators.map((item) => item._key),
    ]
    expect(new Set(normalized.researchQuestions.map((item) => item._key)).size).toBe(3)
    expect(new Set(normalized.collaborators.map((item) => item._key)).size).toBe(2)
    expect(keys.every((key) => /^[a-zA-Z0-9_-]{1,96}$/.test(key))).toBe(true)
  })

  it('finds a unique reusable project without multiplying scans across a large list', () => {
    const projects: MarketerBriefProject[] = Array.from({ length: 5_000 }, (_, index) => ({
      _id: `project-${index}`,
      title: `Unrelated project ${index}`,
      status: 'researching',
      canonicalUrl: `https://example.com/work/${index}`,
    }))
    projects.push({
      _id: 'project-target',
      title: 'Target project',
      status: 'researching',
      canonicalUrl: 'https://www.goinvo.com/work/target/',
    })

    expect(findReusableMarketerBriefProject(projects, {
      researchProject: { title: 'Incoming', canonicalUrl: 'https://www.goinvo.com/work/target/#details' },
    })).toMatchObject({ project: { _id: 'project-target' }, reason: 'same canonical destination' })
  })
})

describe('guide resilience and integration guards', () => {
  it('accepts only known, explicitly completed guide steps from browser storage', () => {
    const allowed = new Set(['known-a', 'known-b'])
    expect(normalizeKnowledgeBaseProgress({
      'known-a': true,
      'known-b': false,
      forged: true,
      __proto__: { polluted: true },
    }, allowed)).toEqual({ 'known-a': true })
    expect(normalizeKnowledgeBaseProgress(['known-a'], allowed)).toEqual({})
    expect(normalizeKnowledgeBaseProgress(null, allowed)).toEqual({})
    expect(normalizeKnowledgeBaseProgress(Object.create({ 'known-a': true }), allowed)).toEqual({})
  })

  it('wires the tested guards into the rendered Operations, Autopilot, update, and guide surfaces', () => {
    const operations = readFileSync('src/sanity/components/marketing/MarketingOperationsBoard.tsx', 'utf8')
    const intake = readFileSync('src/sanity/components/marketing/WorkUpdateIntake.tsx', 'utf8')
    const tool = readFileSync('src/sanity/tools/marketingTool.tsx', 'utf8')
    const guide = readFileSync('src/sanity/tools/gettingStarted.tsx', 'utf8')

    expect(operations).toContain('loadGenerationRef')
    expect(operations).toContain('pendingSaveIdsRef')
    expect(operations).toContain('pagedItems.map')
    expect(operations).toContain('pagedSignals.map')
    expect(operations).toContain('Retry loading the desk')
    expect(operations).not.toContain('.slice(0, 4),')

    expect(intake).toContain("new LatestExclusiveRequestGate<'analysis'>()")
    expect(intake).toContain('updateRef.current.trim() !== trimmed')
    expect(intake).toContain('adoptionPendingRef.current')
    expect(intake).toContain('disabled={adopting}')

    expect(tool).toContain("new LatestExclusiveRequestGate<'chat' | 'suggestion'>()")
    expect(tool).toContain('manualRefreshPendingRef.current')
    expect(tool).toContain('creationPendingRef.current')
    expect(tool).toContain('aria-labelledby="marketing-autopilot-role-label"')
    expect(tool).toContain('inert={tutorialLibraryOpen ? true : undefined}')

    expect(guide).toContain('normalizeKnowledgeBaseProgress')
    expect(guide).toContain('hidden={!open}')
    expect(guide).toContain('{open ? (')
    expect(guide).toContain('width: 44')
    expect(guide).toContain('scope="col"')
  })
})
