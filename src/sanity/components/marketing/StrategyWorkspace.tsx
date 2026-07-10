import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { randomKey, slugify } from '@/lib/marketing'
import { funnelStageOptions } from '../../schemas/marketingFunnel'
import { researchConfidenceOptions } from '../../schemas/marketingResearchPlan'
import { CampaignWorkspace } from './CampaignWorkspace'
import { FunnelWorkspace } from './FunnelWorkspace'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces, the dashboard, and the autopilot
// planner) are imported back from it. This is a deliberate circular import: the
// tool imports StrategyWorkspace only for JSX rendering, and StrategyWorkspace
// touches these tool exports only at runtime (inside component bodies), so no
// binding is read before it is initialized.
import {
  buildAutofillGuidedPrompt,
  buildEmptyStrategyDocument,
  buildStrategyPatch,
  clearStrategyWorkingDraft,
  dispatchMarketingAutopilotStatus,
  editedTextValue,
  experimentDecisionOptions,
  experimentStatusOptions,
  experimentVariantText,
  getLatestActiveResearchProject,
  getNextStrategySectionForPrefetch,
  getStrategyDependencyTarget,
  getStrategyFillQuestions,
  getStrategyResearchResults,
  getStrategySectionItems,
  getStrategySectionQuestion,
  GuidedAutofillControls,
  isResearchResultApproved,
  loadStrategyWorkingDraft,
  MARKETING_AUTOPILOT_ACTION_EVENT,
  MARKETING_UNSAVED_FORM_ID,
  performanceMetricText,
  proofTypeFromResearchResult,
  qualityCheckText,
  saveStrategyWorkingDraft,
  serializeAnalyticsTakeawaysForAi,
  STRATEGY_SECTIONS,
  stringListValue,
  stripResearchProjectSuffix,
  strategyDraftNeedsResearchFill,
  strategyPrefetchCacheKey,
  strategySectionActionLabel,
  strategyWorkingDraftStorageKey,
  buildAnalyticsInterpretations,
  describeResearchResult,
  researchResultKindLabel,
  styles,
  textFieldValue,
  trackingValueText,
  useMarketingUnsavedGuard,
  type AutopilotCompletionPayload,
  type AutopilotWorkspaceTarget,
  type MarketingAiAssistResponse,
  type MarketingAudienceProfile,
  type MarketingCta,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingExperiment,
  type MarketingMessagePillar,
  type MarketingPerformanceSignal,
  type MarketingProofPoint,
  type MarketingQualityGate,
  type MarketingResearchProject,
  type MarketingResearchResult,
  type MarketingStrategyAssetSuggestion,
  type MarketingTrackingRule,
  type MarketingAutopilotActionDetail,
  type MarketingViewId,
  type SelectOption,
  type StrategyAssetKind,
  type StrategyAssistAssetType,
  type StrategyDocument,
  type StrategyWorkspaceMode,
  type StudioClient,
} from '../../tools/marketingTool'

interface StrategyWorkspaceProps {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenView: (view: MarketingViewId) => void
  autopilotTarget?: AutopilotWorkspaceTarget | null
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}

const audiencePriorityOptions: SelectOption[] = [
  { title: 'Primary', value: 'primary' },
  { title: 'Secondary', value: 'secondary' },
  { title: 'Niche / Experimental', value: 'niche' },
  { title: 'Paused', value: 'paused' },
]
const proofTypeOptions: SelectOption[] = [
  { title: 'Statistic', value: 'statistic' },
  { title: 'Quote', value: 'quote' },
  { title: 'Case Evidence', value: 'caseEvidence' },
  { title: 'Research Item', value: 'researchFinding' },
  { title: 'Visual Artifact', value: 'visualArtifact' },
  { title: 'Team Knowledge', value: 'teamKnowledge' },
  { title: 'Other', value: 'other' },
]
const ctaPriorityOptions: SelectOption[] = [
  { title: 'Primary', value: 'primary' },
  { title: 'Secondary', value: 'secondary' },
  { title: 'Contextual', value: 'contextual' },
  { title: 'Experimental', value: 'experimental' },
]
const documentStatusOptions: SelectOption[] = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]
const performanceProviderOptions: SelectOption[] = [
  { title: 'Google Search Console', value: 'gsc' },
  { title: 'GA4', value: 'ga4' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'Vercel Analytics', value: 'vercel' },
  { title: 'Manual', value: 'manual' },
  { title: 'Other', value: 'other' },
]
const performanceStatusOptions: SelectOption[] = [
  { title: 'New', value: 'new' },
  { title: 'Reviewed', value: 'reviewed' },
  { title: 'Suggests Strategy Update', value: 'suggestsUpdate' },
  { title: 'Archived', value: 'archived' },
]
const confidenceOptions = researchConfidenceOptions
export function StrategyWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
  onOpenView,
  autopilotTarget,
  onAutopilotComplete,
}: StrategyWorkspaceProps) {
  const { confirmDiscardUnsavedChanges, markUnsavedChange } = useMarketingUnsavedGuard()
  const [workspaceMode, setWorkspaceMode] = useState<StrategyWorkspaceMode>('foundation')
  const [sectionId, setSectionId] = useState<StrategyAssetKind>('audiences')
  const section = STRATEGY_SECTIONS.find((candidate) => candidate.id === sectionId) || STRATEGY_SECTIONS[0]
  const items = getStrategySectionItems(data, section.id)
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?._id || null)
  const selected = items.find((item) => item._id === selectedId) || items[0] || null
  const [draft, setDraft] = useState<Record<string, unknown>>(selected ? { ...selected } : {})
  const [fillLoading, setFillLoading] = useState(false)
  const [fillMessage, setFillMessage] = useState('')
  const [fillError, setFillError] = useState('')
  const [fillGuidance, setFillGuidance] = useState<Record<string, string>>({})
  const [fillNotes, setFillNotes] = useState('')
  const [autoFillAfterCreateId, setAutoFillAfterCreateId] = useState<string | null>(null)
  const [autoFilledAutopilotKeys, setAutoFilledAutopilotKeys] = useState<string[]>([])
  const [saveAfterFill, setSaveAfterFill] = useState(false)
  const [prefetchedStrategyDrafts, setPrefetchedStrategyDrafts] = useState<Record<string, Record<string, unknown>>>({})
  const [prefetchingStrategyKey, setPrefetchingStrategyKey] = useState<string | null>(null)
  const [localDraftActiveKey, setLocalDraftActiveKey] = useState<string | null>(null)

  useEffect(() => {
    const nextItems = getStrategySectionItems(data, sectionId)
    const nextSelected = nextItems.find((item) => item._id === selectedId) || nextItems[0] || null
    setSelectedId(nextSelected?._id || null)
    const restoredDraft = nextSelected ? loadStrategyWorkingDraft(sectionId, nextSelected._id, nextSelected._updatedAt)?.draft : null
    setDraft(nextSelected ? { ...nextSelected, ...(restoredDraft || {}) } : {})
    setLocalDraftActiveKey(restoredDraft && nextSelected ? strategyWorkingDraftStorageKey(sectionId, nextSelected._id) : null)
    if (restoredDraft && nextSelected) {
      dispatchMarketingAutopilotStatus({
        activity: 'restored-local-draft',
        busy: false,
        message: 'Restored an unsaved local draft for this answer.',
        sectionId,
        recordId: nextSelected._id,
      })
    }
  }, [data, sectionId, selectedId])

  useEffect(() => {
    setFillMessage('')
    setFillError('')
  }, [sectionId, selectedId])

  useEffect(() => {
    if (autopilotTarget?.view !== 'strategy') return
    setWorkspaceMode('foundation')
    if (autopilotTarget.strategySection) {
      const nextItems = getStrategySectionItems(data, autopilotTarget.strategySection)
      setSectionId(autopilotTarget.strategySection)
      const targetItem = autopilotTarget.recordId
        ? nextItems.find((item) => item._id === autopilotTarget.recordId)
        : null
      setSelectedId(targetItem?._id || nextItems[0]?._id || null)
    }
  }, [autopilotTarget?.targetId, autopilotTarget?.strategySection, autopilotTarget?.recordId, autopilotTarget?.view, data])

  const readiness = getStrategyReadiness(data)
  const readyFoundations = readiness.filter((item) => item.ready).length
  const missingFoundations = readiness.filter((item) => !item.ready)
  const researchResultsForFill = useMemo(() => getStrategyResearchResults(data), [data])
  const approvedResearchCount = useMemo(() => data.researchResults.filter(isResearchResultApproved).length, [data.researchResults])
  const sectionQuestion = getStrategySectionQuestion(section.id)

  const handleAdd = async () => {
    const createdId = await createDocument(buildEmptyStrategyDocument(section))
    if (createdId) {
      setSelectedId(createdId)
      const cachedDraft =
        prefetchedStrategyDrafts[strategyPrefetchCacheKey(section.id, 'new')] ||
        loadStrategyWorkingDraft(section.id, 'new')?.draft
      if (cachedDraft) {
        setDraft((current) => ({ ...current, ...cachedDraft, _id: createdId }))
        setFillMessage('Pre-drafted from research while you reviewed the previous answer. Review, then save.')
        saveStrategyWorkingDraft(section.id, createdId, cachedDraft)
        clearStrategyWorkingDraft(section.id, 'new')
        setLocalDraftActiveKey(strategyWorkingDraftStorageKey(section.id, createdId))
        dispatchMarketingAutopilotStatus({
          activity: 'restored-local-draft',
          busy: false,
          message: 'Applied the pre-drafted local answer. Review, then save.',
          sectionId: section.id,
          recordId: createdId,
        })
        setPrefetchedStrategyDrafts((current) => {
          const next = { ...current }
          delete next[strategyPrefetchCacheKey(section.id, 'new')]
          next[strategyPrefetchCacheKey(section.id, createdId)] = cachedDraft
          return next
        })
      } else if (researchResultsForFill.length > 0) {
        setAutoFillAfterCreateId(createdId)
      }
    }
  }

  const handleSave = async () => {
    if (!selected) return
    if (savingId === selected._id) return
    await commitPatch(selected._id, buildStrategyPatch(section.id, draft))
    clearStrategyWorkingDraft(section.id, selected._id)
    setLocalDraftActiveKey(null)
    onAutopilotComplete?.({ action: `strategy:save:${section.id}`, recordId: selected._id })
  }

  const requestStrategyDraftFromResearch = async (
    targetSectionId: StrategyAssetKind,
    targetDraft: Record<string, unknown>,
    options: { guidance?: Record<string, string>; notes?: string } = {},
  ) => {
    const targetQuestion = getStrategySectionQuestion(targetSectionId)
    const guidance = options.guidance ?? fillGuidance
    const notes = options.notes ?? fillNotes
    const fallbackDraft = buildStrategyDraftFromResearch(targetSectionId, data, targetDraft)

    try {
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'strategyAsset',
          draft: {
            ...buildStrategyResearchAssistDraft(targetSectionId, targetDraft, data),
            autofillGuidance: guidance,
          },
          prompt: buildAutofillGuidedPrompt({
            basePrompt: `Draft an answer for "${targetQuestion.question}" from trusted Research findings. Use the supplied findings as evidence and keep fields concise enough for designers to review before saving.`,
            guidance,
            notes,
            questions: getStrategyFillQuestions(targetSectionId),
          }),
          analyticsTakeaways: serializeAnalyticsTakeawaysForAi(buildAnalyticsInterpretations(data)),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      return {
        draft:
          response.ok && payload.usedAi && payload.suggestion?.strategyAsset
            ? strategyAssetSuggestionToDraft(targetSectionId, payload.suggestion.strategyAsset, fallbackDraft)
            : fallbackDraft,
        usedAi: response.ok && !!payload.usedAi,
      }
    } catch (requestError) {
      console.error('Strategy research fill used fallback:', requestError)
      return { draft: fallbackDraft, usedAi: false }
    }
  }

  const handleFillFromResearch = async (options: { auto?: boolean } = {}) => {
    if (!selected) {
      setFillError('Add or select a saved answer before drafting from research.')
      return
    }
    if (researchResultsForFill.length === 0) {
      setFillError('Get evidence and trust at least one finding first, then use it to fill this answer.')
      return
    }
    if (!options.auto && !confirmDiscardUnsavedChanges('Filling from research can replace fields in the current unsaved answer. Continue?')) return

    setFillLoading(true)
    setFillMessage(options.auto ? 'Drafting this from research...' : '')
    setFillError('')

    try {
      const result = await requestStrategyDraftFromResearch(section.id, draft)
      const nextDraft = { ...draft, ...result.draft }
      setDraft((current) => ({ ...current, ...result.draft }))
      markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'research-filled strategy draft')
      saveStrategyWorkingDraft(section.id, selected._id, nextDraft, selected._updatedAt)
      setLocalDraftActiveKey(strategyWorkingDraftStorageKey(section.id, selected._id))
      setFillMessage(
        result.usedAi
          ? `Drafted this from ${researchResultsForFill.length} finding${researchResultsForFill.length === 1 ? '' : 's'} with AI. Review, then save.`
          : `Drafted this from ${researchResultsForFill.length} stored finding${researchResultsForFill.length === 1 ? '' : 's'} with the rule-based fallback. Review, then save.`,
      )
    } finally {
      setFillLoading(false)
    }
  }

  useEffect(() => {
    if (!autoFillAfterCreateId || !selected || selected._id !== autoFillAfterCreateId || fillLoading) return
    setAutoFillAfterCreateId(null)
    void handleFillFromResearch({ auto: true })
  }, [autoFillAfterCreateId, selected?._id, fillLoading])

  useEffect(() => {
    if (!selected || !localDraftActiveKey) return
    const currentKey = strategyWorkingDraftStorageKey(section.id, selected._id)
    if (currentKey !== localDraftActiveKey) return
    saveStrategyWorkingDraft(section.id, selected._id, draft, selected._updatedAt)
    dispatchMarketingAutopilotStatus({
      activity: 'autosaved-local-draft',
      busy: false,
      message: 'Saved this draft locally. Sanity is unchanged until you click Save.',
      sectionId: section.id,
      recordId: selected._id,
    })
  }, [draft, localDraftActiveKey, section.id, selected?._id, selected?._updatedAt])

  useEffect(() => {
    if (fillLoading) {
      dispatchMarketingAutopilotStatus({
        activity: 'drafting-current',
        busy: true,
        message: 'Drafting the current answer from research...',
        sectionId: section.id,
        recordId: selected?._id,
      })
      return
    }
    if (prefetchingStrategyKey) {
      dispatchMarketingAutopilotStatus({
        activity: 'prefetching-next',
        busy: true,
        message: 'Drafting the next answer in the background...',
        sectionId: section.id,
        recordId: selected?._id,
      })
      return
    }
  }, [fillLoading, prefetchingStrategyKey, section.id, selected?._id])

  useEffect(() => {
    if (autopilotTarget?.view !== 'strategy' || autopilotTarget.strategySection !== section.id) return
    if (!selected || fillLoading || savingId === selected._id || researchResultsForFill.length === 0) return
    if (!strategyDraftNeedsResearchFill(section.id, draft)) return
    const autoFillKey = `${autopilotTarget.targetId}:${section.id}:${selected._id}`
    if (autoFilledAutopilotKeys.includes(autoFillKey)) return
    setAutoFilledAutopilotKeys((current) => [...current.filter((key) => key !== autoFillKey), autoFillKey].slice(-20))
    void handleFillFromResearch({ auto: true })
  }, [
    autoFilledAutopilotKeys,
    autopilotTarget?.targetId,
    autopilotTarget?.strategySection,
    autopilotTarget?.view,
    draft,
    fillLoading,
    researchResultsForFill.length,
    savingId,
    section.id,
    selected?._id,
  ])

  useEffect(() => {
    if (!selected || fillLoading) return
    const cacheKey = strategyPrefetchCacheKey(section.id, selected._id)
    const cachedDraft = prefetchedStrategyDrafts[cacheKey]
    if (!cachedDraft || !strategyDraftNeedsResearchFill(section.id, draft)) return

    setDraft((current) => ({ ...current, ...cachedDraft }))
    setFillMessage('Pre-drafted from research while you reviewed the previous answer. Review, then save.')
    saveStrategyWorkingDraft(section.id, selected._id, { ...draft, ...cachedDraft }, selected._updatedAt)
    setLocalDraftActiveKey(strategyWorkingDraftStorageKey(section.id, selected._id))
    setPrefetchedStrategyDrafts((current) => {
      const next = { ...current }
      delete next[cacheKey]
      return next
    })
  }, [draft, fillLoading, prefetchedStrategyDrafts, section.id, selected?._id, selected?._updatedAt])

  useEffect(() => {
    if (autopilotTarget?.view !== 'strategy' || autopilotTarget.strategySection !== section.id) return
    if (!selected || fillLoading || researchResultsForFill.length === 0) return

    const nextSectionId = getNextStrategySectionForPrefetch(section.id)
    if (!nextSectionId) return

    const nextSection = STRATEGY_SECTIONS.find((candidate) => candidate.id === nextSectionId)
    if (!nextSection) return

    const nextItems = getStrategySectionItems(data, nextSectionId)
    const nextRecord = nextItems[0] || null
    const nextDraft = nextRecord ? { ...nextRecord } : buildEmptyStrategyDocument(nextSection)
    if (!strategyDraftNeedsResearchFill(nextSectionId, nextDraft)) return

    const cacheKey = strategyPrefetchCacheKey(nextSectionId, nextRecord?._id || 'new')
    if (prefetchedStrategyDrafts[cacheKey] || prefetchingStrategyKey === cacheKey) return

    let cancelled = false
    setPrefetchingStrategyKey(cacheKey)
    void requestStrategyDraftFromResearch(nextSectionId, nextDraft, { guidance: {}, notes: '' }).then((result) => {
      if (cancelled) return
      setPrefetchedStrategyDrafts((current) => ({ ...current, [cacheKey]: result.draft }))
      saveStrategyWorkingDraft(nextSectionId, nextRecord?._id || 'new', result.draft, nextRecord?._updatedAt)
      setPrefetchingStrategyKey((current) => (current === cacheKey ? null : current))
      dispatchMarketingAutopilotStatus({
        activity: 'autosaved-local-draft',
        busy: false,
        message: 'Pre-drafted and saved the next answer locally.',
        sectionId: nextSectionId,
        recordId: nextRecord?._id,
      })
    })

    return () => {
      cancelled = true
      setPrefetchingStrategyKey((current) => (current === cacheKey ? null : current))
    }
  }, [
    autopilotTarget?.strategySection,
    autopilotTarget?.targetId,
    autopilotTarget?.view,
    data,
    fillLoading,
    prefetchedStrategyDrafts,
    researchResultsForFill.length,
    section.id,
    selected?._id,
  ])

  useEffect(() => {
    if (!saveAfterFill || fillLoading) return
    setSaveAfterFill(false)
    if (selected) void handleSave()
  }, [draft, fillLoading, saveAfterFill, selected?._id])

  useEffect(() => {
    const handleAutopilotAction = (event: Event) => {
      const detail = (event as CustomEvent<MarketingAutopilotActionDetail>).detail
      if (!detail || detail.step.view !== 'strategy' || detail.step.strategySection !== section.id) return

      if (detail.intent === 'dependency') {
        setSaveAfterFill(false)
        const dependencyTarget = getStrategyDependencyTarget(section.id, data)
        if (dependencyTarget.view === 'strategy' && dependencyTarget.strategySection) {
          const dependencyItems = getStrategySectionItems(data, dependencyTarget.strategySection)
          setWorkspaceMode('foundation')
          setSectionId(dependencyTarget.strategySection)
          setSelectedId(dependencyTarget.recordId || dependencyItems[0]?._id || null)
          return
        }
        onOpenView(dependencyTarget.view)
        return
      }

      if (fillLoading) {
        setSaveAfterFill(true)
        return
      }

      if (!selected) {
        setSaveAfterFill(true)
        void handleAdd()
        return
      }

      if (strategyDraftNeedsResearchFill(section.id, draft) && researchResultsForFill.length > 0) {
        setSaveAfterFill(true)
        void handleFillFromResearch({ auto: true })
        return
      }

      void handleSave()
    }

    window.addEventListener(MARKETING_AUTOPILOT_ACTION_EVENT, handleAutopilotAction)
    return () => window.removeEventListener(MARKETING_AUTOPILOT_ACTION_EVENT, handleAutopilotAction)
  }, [data, draft, fillLoading, onOpenView, researchResultsForFill.length, section.id, selected?._id])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...styles.panel, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={styles.kicker}>Strategy Q&amp;A · guided setup questions</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Answer the few things every piece of content needs</h2>
            <p style={{ ...styles.muted, margin: '8px 0 0', maxWidth: 780 }}>
              Pick the closest answer when it already exists. Let research draft a new answer only when the current one does not fit.
            </p>
          </div>
          <div style={{ display: 'grid', justifyItems: 'end', gap: 6, maxWidth: 260 }}>
            <button
              type="button"
              data-tour-id="autopilot-strategy-add"
              style={styles.primaryButton}
              onClick={handleAdd}
              disabled={savingId === 'new'}
              title={`Creates a saved ${sectionQuestion.shortLabel.toLowerCase()} record designers can reuse across campaigns and content.`}
            >
              {strategySectionActionLabel(section.id)}
            </button>
            <div style={{ ...styles.small, ...styles.muted, textAlign: 'right' }}>
              Adds a saved option for the current question.
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: '1px solid var(--card-border-color)',
            paddingTop: 12,
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, auto) minmax(0, 1fr)',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ ...styles.small, ...styles.muted, fontWeight: 850 }}>Questions answered</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>
              {readyFoundations} of {readiness.length} ready
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(160, 171, 197, 0.18)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round((readyFoundations / Math.max(1, readiness.length)) * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: '#007385',
                }}
              />
            </div>
            <div style={{ ...styles.small, ...styles.muted }}>
              {missingFoundations.length > 0
                ? `Next unanswered: ${missingFoundations.slice(0, 3).map((item) => item.label).join(', ')}${missingFoundations.length > 3 ? '...' : ''}. Use research to answer only what is missing.`
                : 'Each setup question has at least one saved answer.'}
            </div>
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Strategy workspace sections"
          style={{
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            borderTop: '1px solid var(--card-border-color)',
            borderBottom: '1px solid var(--card-border-color)',
          }}
        >
          <StrategyModeButton
            active={workspaceMode === 'foundation'}
            onClick={() => setWorkspaceMode('foundation')}
            description="Save reusable answers for audience, message, proof, CTA, tracking, and review."
          >
            Answer setup questions
          </StrategyModeButton>
          <StrategyModeButton
            active={workspaceMode === 'campaigns'}
            onClick={() => setWorkspaceMode('campaigns')}
            description="Turn the saved answers into campaign briefs and launch plans."
          >
            Build campaign plans
          </StrategyModeButton>
          <StrategyModeButton
            active={workspaceMode === 'funnels'}
            onClick={() => setWorkspaceMode('funnels')}
            description="Map the audience journey from first touch to CTA and measurement."
          >
            Map funnel paths
          </StrategyModeButton>
        </div>
      </div>

      {workspaceMode === 'campaigns' && (
        <CampaignWorkspace data={data} savingId={savingId} createDocument={createDocument} commitPatch={commitPatch} />
      )}

      {workspaceMode === 'funnels' && (
        <FunnelWorkspace
          client={client}
          data={data}
          savingId={savingId}
          createDocument={createDocument}
          loadData={loadData}
          commitPatch={commitPatch}
        />
      )}

      {workspaceMode === 'foundation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(0, 1.5fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ ...styles.panel, display: 'grid', gap: 10 }}>
          {STRATEGY_SECTIONS.map((candidate) => {
            const count = getStrategySectionItems(data, candidate.id).length
            const active = candidate.id === section.id
            return (
              <button
                key={candidate.id}
                type="button"
                data-tour-id={`autopilot-strategy-section-${candidate.id}`}
                style={{
                  ...styles.templateButton,
                  textAlign: 'left',
                  justifyContent: 'space-between',
                  borderColor: active ? '#007385' : 'var(--card-border-color)',
                  background: active ? 'rgba(0, 115, 133, 0.12)' : 'var(--card-bg-color)',
                }}
                onClick={() => {
                  setSectionId(candidate.id)
                  setSelectedId(getStrategySectionItems(data, candidate.id)[0]?._id || null)
                }}
              >
                <span style={{ display: 'grid', gap: 3, minWidth: 0 }}>
                  <strong>{candidate.title}</strong>
                  <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.35 }}>{getStrategySectionQuestion(candidate.id).question}</span>
                </span>
                <span style={{ ...styles.small, ...styles.muted, alignSelf: 'start' }}>{count}</span>
              </button>
            )
          })}
        </div>

        <div style={{ ...styles.panel, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 1.2fr)', gap: 16 }}>
            <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
              <div>
                <div style={styles.kicker}>{section.title}</div>
                <h3 style={{ margin: '3px 0 0' }}>{sectionQuestion.question}</h3>
                <p style={{ ...styles.muted, margin: '6px 0 0' }}>{sectionQuestion.reason}</p>
              </div>
              <div
                style={{
                  borderLeft: '3px solid #007385',
                  padding: '2px 0 2px 12px',
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ ...styles.small, color: '#007385', fontWeight: 850 }}>Choose this when</div>
                  <p style={{ ...styles.small, ...styles.muted, margin: '3px 0 0', lineHeight: 1.45 }}>{sectionQuestion.when}</p>
                </div>
                <div>
                  <div style={{ ...styles.small, color: '#007385', fontWeight: 850 }}>This helps with</div>
                  <p style={{ ...styles.small, ...styles.muted, margin: '3px 0 0', lineHeight: 1.45 }}>{sectionQuestion.helps}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ ...styles.small, ...styles.muted, fontWeight: 850 }}>
                  Saved answers
                </div>
                {items.length === 0 ? (
                  <div style={{ ...styles.card, padding: 14, ...styles.muted }}>
                    No answer saved yet. Click {strategySectionActionLabel(section.id)} to start with an empty draft, or use research to draft one.
                  </div>
                ) : (
                  items.map((item) => {
                    const active = item._id === selected?._id
                    return (
                      <button
                        key={item._id}
                        type="button"
                        style={{
                          ...styles.templateButton,
                          textAlign: 'left',
                          borderColor: active ? '#007385' : 'var(--card-border-color)',
                          background: active ? 'rgba(0, 115, 133, 0.12)' : 'var(--card-bg-color)',
                        }}
                        onClick={() => setSelectedId(item._id)}
                      >
                        <strong>{item.title || `Untitled ${section.singular}`}</strong>
                        <span style={{ ...styles.small, ...styles.muted }}>{strategyDocumentSubtitle(section.id, item)}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div
              data-tour-id={selected ? `autopilot-strategy-editor-${section.id}` : undefined}
              style={{ display: 'grid', gap: 12, minWidth: 0 }}
            >
              {selected ? (
                <>
                  <div
                    style={{
                      ...styles.guidePanel,
                      background: 'rgba(0, 115, 133, 0.18)',
                      border: '1px solid rgba(0, 166, 184, 0.58)',
                      boxShadow: 'none',
                      padding: 14,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 220, flex: '1 1 260px' }}>
                        <div style={{ ...styles.kicker, marginBottom: 4 }}>Fastest path</div>
                        <strong style={{ fontSize: 16 }}>Let research answer this</strong>
                        <p style={{ ...styles.small, margin: '5px 0 0', lineHeight: 1.45, color: 'rgba(255, 255, 255, 0.78)' }}>
                          Draft an answer from trusted findings, then edit anything that feels off. Nothing is saved until you click Save.
                        </p>
                      </div>
                      <button
                        type="button"
                        data-tour-id="autopilot-strategy-fill"
                        style={{ ...styles.primaryButton, minWidth: 180 }}
                        disabled={fillLoading || researchResultsForFill.length === 0}
                        onClick={() => void handleFillFromResearch()}
                      >
                        {fillLoading ? 'Drafting...' : 'Draft from research'}
                      </button>
                    </div>
                    <div style={{ ...styles.small, color: 'rgba(255, 255, 255, 0.72)', marginTop: 8 }}>
                      {approvedResearchCount > 0
                        ? `${approvedResearchCount} trusted finding${approvedResearchCount === 1 ? '' : 's'} available.`
                        : researchResultsForFill.length > 0
                          ? `${researchResultsForFill.length} stored finding${researchResultsForFill.length === 1 ? '' : 's'} available; trust the strongest credible ones when possible.`
                          : 'No findings yet.'}
                    </div>
                    {prefetchingStrategyKey && (
                      <div style={{ ...styles.small, color: '#4dc4d6', marginTop: 6, fontWeight: 800 }}>
                        Drafting the next answer in the background...
                      </div>
                    )}
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
                        Guide the draft
                        <span style={{ ...styles.small, ...styles.muted, marginLeft: 6 }}>(optional)</span>
                      </summary>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        <GuidedAutofillControls
                          questions={getStrategyFillQuestions(section.id)}
                          values={fillGuidance}
                          onChange={setFillGuidance}
                        />
                        <textarea
                          aria-label={`Optional notes for filling this ${section.singular}`}
                          rows={2}
                          style={styles.input}
                          value={fillNotes}
                          onChange={(event) => setFillNotes(event.currentTarget.value)}
                          placeholder="Optional: add a topic, audience, source, or constraint to guide the fill."
                        />
                      </div>
                    </details>
                    {fillMessage && <div style={{ ...styles.small, color: '#7dd69e', marginTop: 8 }}>{fillMessage}</div>}
                    {fillError && <div style={{ ...styles.small, color: '#E36216', marginTop: 8 }}>{fillError}</div>}
                  </div>
                  {fillLoading ? (
                    <StrategyEditorSkeleton sectionId={section.id} />
                  ) : (
                    <StrategyEditorFields sectionId={section.id} draft={draft} onChange={setDraft} />
                  )}
                  <details style={{ ...styles.card, padding: 12 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced document details</summary>
                    <div style={{ ...styles.small, ...styles.muted, marginTop: 10 }}>
                      Sanity ID: {selected._id}
                      <br />
                      Updated: {selected._updatedAt || 'Unknown'}
                    </div>
                  </details>
                  <button type="button" data-tour-id="autopilot-strategy-save" style={{ ...styles.primaryButton, width: '100%' }} onClick={handleSave} disabled={savingId === selected._id}>
                    {savingId === selected._id ? 'Saving...' : 'Save this answer'}
                  </button>
                </>
              ) : (
                <div style={{ ...styles.card, padding: 18, textAlign: 'center' }}>
                  <strong>Select a saved answer or add a new one</strong>
                  <p style={{ ...styles.muted, margin: '8px 0 0' }}>The editor appears here once there is an answer to review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
function StrategyModeButton({
  active,
  onClick,
  description,
  children,
}: {
  active: boolean
  onClick: () => void
  description: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={description}
      role="tab"
      aria-selected={active}
      style={{
        appearance: 'none',
        border: 0,
        borderBottom: `2px solid ${active ? '#4dc4d6' : 'transparent'}`,
        borderRadius: 0,
        background: active ? 'rgba(0, 115, 133, 0.12)' : 'transparent',
        color: 'var(--card-fg-color)',
        alignItems: 'flex-start',
        cursor: 'pointer',
        display: 'inline-flex',
        flexDirection: 'column',
        font: 'inherit',
        gap: 3,
        justifyContent: 'flex-start',
        minWidth: 190,
        padding: '10px 12px',
        textAlign: 'left',
      }}
      onClick={onClick}
    >
      <span>{children}</span>
      <span
        style={{
          color: active ? '#b9eaf0' : 'var(--card-muted-color)',
          fontSize: 11,
          fontWeight: 650,
          lineHeight: 1.35,
        }}
      >
        {description}
      </span>
    </button>
  )
}
function strategyAssistAssetType(sectionId: StrategyAssetKind): StrategyAssistAssetType {
  if (sectionId === 'audiences') return 'audience'
  if (sectionId === 'messages') return 'message'
  if (sectionId === 'proof') return 'proof'
  if (sectionId === 'ctas') return 'cta'
  if (sectionId === 'tracking') return 'trackingRule'
  if (sectionId === 'quality') return 'qualityGate'
  if (sectionId === 'experiments') return 'experiment'
  return 'performanceSynthesis'
}
function buildStrategyResearchAssistDraft(sectionId: StrategyAssetKind, draft: Record<string, unknown>, data: MarketingData) {
  const project = getLatestActiveResearchProject(data)
  return {
    assetType: strategyAssistAssetType(sectionId),
    currentDraft: draft,
    researchProject: project
      ? {
          title: project.title,
          researchType: project.researchType,
          audience: project.audience,
          goals: project.goals,
          seedKeywords: project.seedKeywords,
          canonicalUrl: project.canonicalUrl,
          status: project.status,
        }
      : null,
    researchResults: getStrategyResearchResults(data).map(serializeStrategyResearchResultForDraft),
    channels: data.channels
      .filter((channel) => channel.status !== 'archived')
      .map((channel) => ({ title: channel.title, key: channel.key, platform: channel.platform }))
      .slice(0, 8),
    existingStrategyCounts: {
      audiences: data.audienceProfiles.length,
      messages: data.messagePillars.length,
      proof: data.proofPoints.length,
      ctas: data.ctas.length,
      tracking: data.trackingRules.length,
      quality: data.qualityGates.length,
      experiments: data.experiments.length,
      performance: data.performanceSignals.length,
    },
  }
}
function serializeStrategyResearchResultForDraft(result: MarketingResearchResult) {
  return {
    id: result._id,
    title: result.title,
    resultType: result.resultType,
    status: result.status,
    selectedForSynthesis: result.selectedForSynthesis,
    priority: result.priority,
    keyword: result.keyword,
    searchIntent: result.searchIntent,
    volume: result.volume,
    difficulty: result.difficulty,
    provider: result.provider,
    scoreSource: result.scoreSource,
    canonicalUrl: result.canonicalUrl,
    contentGap: result.contentGap,
    sourceTitle: result.sourceTitle,
    sourceUrl: result.sourceUrl,
    claim: result.claim,
    confidence: result.confidence,
    implication: result.implication,
    competitorName: result.competitorName,
    collaboratorName: result.collaboratorName,
    organization: result.organization,
    topicArea: result.topicArea,
    expectedContribution: result.expectedContribution,
  }
}
function buildStrategyDraftFromResearch(sectionId: StrategyAssetKind, data: MarketingData, currentDraft: Record<string, unknown> = {}) {
  const results = getStrategyResearchResults(data)
  const project = getLatestActiveResearchProject(data)
  const first = results[0]
  const topic = strategyResearchTopic(project, results)
  const claims = uniqueStrategyStrings(results.map((result) => result.claim || result.contentGap || result.implication || result.title)).slice(0, 6)
  const keywords = uniqueStrategyStrings(results.map((result) => result.keyword || result.topicArea || result.competitorName)).slice(0, 6)
  const destination = first?.canonicalUrl || first?.sourceUrl || project?.canonicalUrl || '/contact'
  const sourceTitle = first?.sourceTitle || first?.title || project?.title || ''
  const sourceUrl = first?.sourceUrl || first?.canonicalUrl || project?.canonicalUrl || ''
  const notes = strategyResearchBasisNote(results)
  const title = textFieldValue(currentDraft.title)

  if (sectionId === 'audiences') {
    const needs = claims.length > 0 ? claims.slice(0, 4) : [`Understand why ${topic} matters`, 'See the evidence behind the claim', 'Know what next step to take']
    const desiredActions = destination ? ['Open the source or destination', 'Save or share the useful evidence', 'Explore related GoInvo work'] : ['Save or share the useful evidence', 'Start a conversation']
    return withStrategyListText({
      title: title || `${topic} audience`,
      priority: data.audienceProfiles.length === 0 ? 'primary' : 'secondary',
      audience: project?.audience || `People who need a clear, evidence-backed explanation of ${topic}.`,
      needs,
      pains: ['The topic feels abstract or hard to trust', 'Relevant evidence is scattered across sources', 'The useful next step is unclear'],
      misconceptions: ['A strong visual is enough without a source destination', 'Everyone already understands the project context'],
      trustTriggers: ['Trusted findings', 'Concrete source links', 'Plain-language explanation', 'Visible proof or examples'],
      desiredActions,
      objections: ['Too abstract', 'Unsupported claim', 'No clear next step'],
      notes,
    })
  }

  if (sectionId === 'messages') {
    return withStrategyListText({
      title: title || `${topic} message pillar`,
      coreClaim: first?.claim || first?.contentGap || `${topic} needs an evidence-backed explanation people can understand and act on.`,
      supportingClaims: claims.length > 0 ? claims : ['Use trusted findings as the source of the claim', 'Connect the useful idea to a clear destination'],
      approvedPhrases: keywords.length > 0 ? keywords : ['evidence-backed', 'clear source path', 'useful explanation'],
      phrasesToAvoid: ['revolutionary', 'game-changing', 'world-class', 'trust us'],
      topicCluster: keywords[0] || topic,
      notes,
    })
  }

  if (sectionId === 'proof') {
    return {
      title: title || `${topic} proof point`,
      claim: first?.claim || first?.contentGap || describeResearchResult(first),
      proofType: first ? proofTypeFromResearchResult(first) : 'researchFinding',
      sourceTitle,
      sourceUrl,
      confidence: first?.confidence || (first && isResearchResultApproved(first) ? 'medium' : 'needsValidation'),
      topicCluster: keywords[0] || topic,
      usageNotes: notes,
    }
  }

  if (sectionId === 'ctas') {
    return {
      title: title || `${topic} CTA`,
      label: destination && destination !== '/contact' ? 'Read the source' : 'Start a conversation',
      funnelStage: 'interest',
      destination,
      successSignal: destination && destination !== '/contact' ? 'People click through to the source or related work.' : 'People start a qualified conversation.',
      priority: 'contextual',
      notes,
    }
  }

  if (sectionId === 'tracking') {
    const sources = data.channels.map((channel) => channel.key || channel.title).filter(Boolean) as string[]
    const allowedSources = sources.length > 0 ? sources : ['instagram', 'linkedin', 'newsletter', 'website']
    return {
      title: title || `${topic} tracking rule`,
      status: 'active',
      utmSourceRule: 'Use the channel where the link is promoted.',
      utmMediumRule: 'Use social, email, referral, organic, or paid to group traffic consistently.',
      utmCampaignPattern: `${slugify(topic)}-research`,
      utmContentPattern: 'channel-format-angle',
      allowedSourcesText: allowedSources.join('\n'),
      allowedMediumsText: ['social', 'email', 'referral', 'organic'].join('\n'),
      notes,
    }
  }

  if (sectionId === 'quality') {
    const checks = [
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'Claim is backed by a trusted finding', category: 'claims', guidance: 'Reference the selected finding before final copy.', required: false },
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'CTA points to the intended destination', category: 'cta', guidance: 'Use one clear next step.', required: false },
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'Source and UTM links are present where needed', category: 'utm', guidance: 'Use the tracking rule before publishing.', required: false },
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'Alt text explains the useful information', category: 'altText', guidance: 'Describe meaningful visuals in plain language.', required: false },
    ]
    return {
      title: title || `${topic} quality gate`,
      status: 'active',
      whenToUse: `Use before publishing content based on ${topic} research.`,
      checks,
      checksText: qualityCheckText(checks),
      notes,
    }
  }

  if (sectionId === 'experiments') {
    return {
      title: title || `${topic} experiment`,
      status: 'idea',
      hypothesis: `If ${topic} content leads with the strongest trusted finding and one clear CTA, more visitors will reach the intended destination because the value and next step are easier to understand.`,
      expectedSignal: 'Higher useful visits, saves, replies, or CTA clicks than a generic post.',
      decision: 'inconclusive',
      notes,
    }
  }

  const analyticsResult = results.find((result) => result.resultType === 'analyticsSignal' || result.provider === 'analytics')
  const signal = analyticsResult?.performanceSignals?.[0]
  const metrics = signal?.metrics || [{ _key: randomKey(), _type: 'performanceMetric', label: 'Useful visits', unit: 'visits', change: '' }]
  return {
    title: title || `${topic} performance signal`,
    provider: signal?.provider || 'manual',
    status: 'new',
    signalType: signal?.signalType || analyticsResult?.resultType || 'research-backed content',
    sourceLabel: signal?.sourceLabel || analyticsResult?.sourceTitle || sourceTitle || 'Research review',
    query: analyticsResult?.keyword || keywords[0] || '',
    pageUrl: signal?.pageUrl || analyticsResult?.canonicalUrl || destination,
    metrics,
    metricsText: performanceMetricText(metrics),
    interpretation: analyticsResult?.claim || analyticsResult?.implication || `Review whether ${topic} content is moving people toward the intended destination.`,
    recommendation: analyticsResult?.contentGap || 'Use this signal to decide whether the hook, CTA, destination, or channel should change.',
    rawImport: '',
  }
}
function strategyAssetSuggestionToDraft(
  sectionId: StrategyAssetKind,
  suggestion: MarketingStrategyAssetSuggestion,
  fallback: Record<string, unknown>,
) {
  const merged = { ...fallback }
  const title = textFieldValue(suggestion.title) || textFieldValue(merged.title)
  if (title) merged.title = title
  if (textFieldValue(suggestion.notes) || textFieldValue(suggestion.summary)) merged.notes = textFieldValue(suggestion.notes) || textFieldValue(suggestion.summary)

  if (sectionId === 'audiences') {
    copyStrategyText(merged, suggestion, ['priority', 'audience'])
    copyStrategyLists(merged, suggestion, ['needs', 'pains', 'misconceptions', 'trustTriggers', 'desiredActions', 'objections'])
    return merged
  }
  if (sectionId === 'messages') {
    copyStrategyText(merged, suggestion, ['coreClaim', 'topicCluster'])
    copyStrategyLists(merged, suggestion, ['supportingClaims', 'approvedPhrases', 'phrasesToAvoid'])
    return merged
  }
  if (sectionId === 'proof') {
    copyStrategyText(merged, suggestion, ['proofType', 'claim', 'sourceTitle', 'sourceUrl', 'confidence', 'topicCluster', 'usageNotes'])
    return merged
  }
  if (sectionId === 'ctas') {
    merged.label = textFieldValue(suggestion.label) || textFieldValue(suggestion.ctaLabel) || textFieldValue(merged.label)
    copyStrategyText(merged, suggestion, ['funnelStage', 'destination', 'successSignal', 'priority'])
    return merged
  }
  if (sectionId === 'tracking') {
    copyStrategyText(merged, suggestion, ['status', 'utmSourceRule', 'utmMediumRule', 'utmCampaignPattern', 'utmContentPattern'])
    const sources = strategyStringArray(suggestion.allowedSources)
    const mediums = strategyStringArray(suggestion.allowedMediums)
    if (sources.length > 0) merged.allowedSourcesText = sources.join('\n')
    if (mediums.length > 0) merged.allowedMediumsText = mediums.join('\n')
    return merged
  }
  if (sectionId === 'quality') {
    copyStrategyText(merged, suggestion, ['status', 'whenToUse'])
    const checks = Array.isArray(suggestion.qualityChecklist) && suggestion.qualityChecklist.length > 0 ? suggestion.qualityChecklist : suggestion.checks
    if (Array.isArray(checks) && checks.length > 0) {
      merged.checks = checks
      merged.checksText = qualityCheckText(checks)
    }
    return merged
  }
  if (sectionId === 'experiments') {
    copyStrategyText(merged, suggestion, ['status', 'hypothesis', 'expectedSignal', 'result', 'decision', 'decisionDate'])
    return merged
  }
  copyStrategyText(merged, suggestion, ['provider', 'status', 'signalType', 'sourceLabel', 'query', 'pageUrl', 'metricDate', 'interpretation', 'recommendation', 'rawImport'])
  if (Array.isArray(suggestion.metrics) && suggestion.metrics.length > 0) {
    merged.metrics = suggestion.metrics
    merged.metricsText = performanceMetricText(suggestion.metrics)
  }
  return merged
}
function copyStrategyText(target: Record<string, unknown>, source: Record<string, unknown>, fields: string[]) {
  fields.forEach((field) => {
    const value = textFieldValue(source[field])
    if (value) target[field] = value
  })
}

function copyStrategyLists(target: Record<string, unknown>, source: Record<string, unknown>, fields: string[]) {
  fields.forEach((field) => {
    const values = strategyStringArray(source[field])
    if (values.length > 0) {
      target[field] = values
      target[`${field}Text`] = values.join('\n')
    }
  })
}

function withStrategyListText<T extends Record<string, unknown>>(draft: T) {
  ;['needs', 'pains', 'misconceptions', 'trustTriggers', 'desiredActions', 'objections', 'supportingClaims', 'approvedPhrases', 'phrasesToAvoid'].forEach((field) => {
    const values = strategyStringArray(draft[field])
    if (values.length > 0) draft[`${field}Text` as keyof T] = values.join('\n') as T[keyof T]
  })
  return draft
}

function strategyStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const record = item as { label?: string; title?: string; value?: string; guidance?: string }
        return (record.label || record.title || record.value || record.guidance || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function uniqueStrategyStrings(values: Array<string | undefined>) {
  const seen = new Set<string>()
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false
      seen.add(value.toLowerCase())
      return true
    })
}

function strategyResearchTopic(project: MarketingResearchProject | null, results: MarketingResearchResult[]) {
  const keyword = results.find((result) => result.keyword)?.keyword
  const topic = keyword || project?.seedKeywords?.[0] || project?.title || results[0]?.title || 'research-backed content'
  return stripResearchProjectSuffix(topic).replace(/\s+research\s*$/i, '').trim() || 'research-backed content'
}

function strategyResearchBasisNote(results: MarketingResearchResult[]) {
  if (results.length === 0) return 'Drafted before trusted findings were available. Review carefully before saving.'
  return `Drafted from ${results.length} finding${results.length === 1 ? '' : 's'}: ${results
    .slice(0, 3)
    .map((result) => result.title || result.keyword || result.sourceTitle || 'Untitled research item')
    .join('; ')}.`
}
function StrategyEditorSkeleton({ sectionId }: { sectionId: StrategyAssetKind }) {
  return (
    <div aria-busy="true" style={{ display: 'grid', gap: 12 }}>
      {getStrategySkeletonLabels(sectionId).map((label, index) => (
        <div key={`${sectionId}-${label}`} style={{ display: 'grid', gap: 7 }}>
          <span style={{ ...styles.label, color: 'rgba(255, 255, 255, 0.72)' }}>{label}</span>
          <div
            style={{
              height: index === 0 || label.toLowerCase().includes('topic') ? 47 : 86,
              borderRadius: 6,
              border: '1px solid rgba(160, 171, 197, 0.2)',
              background:
                'linear-gradient(90deg, rgba(160, 171, 197, 0.08) 0%, rgba(0, 115, 133, 0.16) 48%, rgba(160, 171, 197, 0.08) 100%)',
            }}
          />
        </div>
      ))}
      <div style={{ ...styles.small, ...styles.muted }}>
        Autopilot is drafting this answer from trusted findings. The draft appears here before anything is saved.
      </div>
    </div>
  )
}

function getStrategySkeletonLabels(sectionId: StrategyAssetKind) {
  if (sectionId === 'audiences') return ['Name this audience answer', 'Who are they?', 'What do they need?', 'What makes them trust us?']
  if (sectionId === 'messages') return ['Name this message answer', 'What is the main thing people should understand?', 'What smaller points support it?', 'What topic or keyword group does this belong to?']
  if (sectionId === 'proof') return ['Name this proof answer', 'What fact, quote, example, or source supports the claim?', 'Where did it come from?', 'How can designers use it safely?']
  if (sectionId === 'ctas') return ['Name this CTA answer', 'What should the button or link say?', 'Where should it send someone?', 'How would we know it worked?']
  if (sectionId === 'tracking') return ['Name this tracking answer', 'How should utm_source be chosen?', 'How should utm_medium be chosen?', 'How should campaign names be written?']
  if (sectionId === 'quality') return ['Name this checklist answer', 'When should designers use this checklist?', 'What should be checked?', 'What should a designer remember?']
  if (sectionId === 'experiments') return ['Name this test', 'What change are we testing?', 'Expected result', 'What should we do next?']
  return ['Name this signal', 'What kind of signal is it?', 'What does this tell us?', 'What should change because of it?']
}
function StrategyEditorFields({
  sectionId,
  draft,
  onChange,
}: {
  sectionId: StrategyAssetKind
  draft: Record<string, unknown>
  onChange: (draft: Record<string, unknown>) => void
}) {
  const setField = (name: string, value: unknown) => onChange({ ...draft, [name]: value })
  const linkedResearchResults = Array.isArray(draft.researchResults)
    ? (draft.researchResults as MarketingResearchResult[])
    : []
  const sectionQuestion = getStrategySectionQuestion(sectionId)
  const nameLabel =
    sectionId === 'ctas'
      ? 'Name this CTA answer'
      : sectionId === 'performance'
        ? 'Name this signal'
        : `Name this ${sectionQuestion.shortLabel.toLowerCase()} answer`

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <StrategyTextField
        label={nameLabel}
        help="Short internal name so we can find and reuse this later."
        value={textFieldValue(draft.title)}
        onChange={(value) => setField('title', value)}
      />

      {sectionId === 'audiences' && (
        <>
          <StrategySelectField label="How broadly should we use this audience?" help="Primary means this is a default audience for many pieces of content. Niche means use it only for specific tests." value={textFieldValue(draft.priority) || 'secondary'} options={audiencePriorityOptions} onChange={(value) => setField('priority', value)} />
          <StrategyTextareaField label="Who are they?" help="Describe the person plainly enough that a designer can picture them." value={textFieldValue(draft.audience)} onChange={(value) => setField('audience', value)} />
          <StrategyTextareaField label="What do they need?" help="One need per line. Focus on what would make the content useful to them." value={editedTextValue(draft, 'needsText', stringListValue(draft.needs))} onChange={(value) => setField('needsText', value)} />
          <StrategyTextareaField label="What frustrates them?" help="One pain point per line. This helps the content feel specific instead of generic." value={editedTextValue(draft, 'painsText', stringListValue(draft.pains))} onChange={(value) => setField('painsText', value)} />
          <StrategyTextareaField label="What might they misunderstand?" help="Use this to prevent captions or visuals from accidentally reinforcing the wrong idea." value={editedTextValue(draft, 'misconceptionsText', stringListValue(draft.misconceptions))} onChange={(value) => setField('misconceptionsText', value)} />
          <StrategyTextareaField label="What makes them trust us?" help="Examples: source quality, visible craft, plain language, domain expertise, public work." value={editedTextValue(draft, 'trustTriggersText', stringListValue(draft.trustTriggers))} onChange={(value) => setField('trustTriggersText', value)} />
          <StrategyTextareaField label="What would we like them to do?" help="One desired action per line. Keep it realistic for this audience." value={editedTextValue(draft, 'desiredActionsText', stringListValue(draft.desiredActions))} onChange={(value) => setField('desiredActionsText', value)} />
          <StrategyTextareaField label="What would stop them?" help="Objections, doubts, missing context, or reasons they might ignore the content." value={editedTextValue(draft, 'objectionsText', stringListValue(draft.objections))} onChange={(value) => setField('objectionsText', value)} />
          <StrategyTextareaField label="What should a designer remember?" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'messages' && (
        <>
          <StrategyTextareaField label="What is the main thing people should understand?" help="One clear claim. If there are three claims, the content probably needs multiple items." value={textFieldValue(draft.coreClaim)} onChange={(value) => setField('coreClaim', value)} />
          <StrategyTextareaField label="What smaller points support it?" help="One supporting point per line. These can become slide beats, captions, or sections." value={editedTextValue(draft, 'supportingClaimsText', stringListValue(draft.supportingClaims))} onChange={(value) => setField('supportingClaimsText', value)} />
          <StrategyTextareaField label="What themes or wording are safe to reuse?" help="These are reusable message themes, not final copy. Keep them natural." value={editedTextValue(draft, 'approvedPhrasesText', stringListValue(draft.approvedPhrases))} onChange={(value) => setField('approvedPhrasesText', value)} />
          <StrategyTextareaField label="What framing should we avoid?" help="List wording, angles, or simplifications that would make the message weaker or misleading." value={editedTextValue(draft, 'phrasesToAvoidText', stringListValue(draft.phrasesToAvoid))} onChange={(value) => setField('phrasesToAvoidText', value)} />
          <StrategyTextField label="What topic or keyword group does this belong to?" value={textFieldValue(draft.topicCluster)} onChange={(value) => setField('topicCluster', value)} />
          <StrategyTextareaField label="What should a designer remember?" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'proof' && (
        <>
          {linkedResearchResults.length > 0 && (
            <div
              style={{
                borderLeft: '3px solid #007385',
                padding: '2px 0 2px 12px',
                display: 'grid',
                gap: 8,
              }}
            >
              <div>
                <div style={{ ...styles.small, color: '#007385', fontWeight: 850 }}>Linked inspiration / research</div>
                <p style={{ ...styles.small, ...styles.muted, margin: '3px 0 0', lineHeight: 1.45 }}>
                  This proof came from reviewed Research. Keep the source attached so designers know why the claim is safe to reuse.
                </p>
              </div>
              {linkedResearchResults.map((result) => (
                <div key={result._id} style={{ display: 'grid', gap: 3 }}>
                  <strong style={{ fontSize: 13 }}>{result.title || result.keyword || 'Research item'}</strong>
                  <span style={{ ...styles.small, ...styles.muted }}>
                    {researchResultKindLabel(result)}: {describeResearchResult(result)}
                  </span>
                  {result.sourceUrl && (
                    <a href={result.sourceUrl} target="_blank" rel="noreferrer" style={{ ...styles.small, color: '#00A0B6', fontWeight: 850 }}>
                      Open evidence source
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          <StrategyTextareaField label="What fact, quote, example, or source supports the claim?" help="Write the usable proof, not just the source name." value={textFieldValue(draft.claim)} onChange={(value) => setField('claim', value)} />
          <StrategySelectField label="What kind of proof is it?" value={textFieldValue(draft.proofType) || 'researchFinding'} options={proofTypeOptions} onChange={(value) => setField('proofType', value)} />
          <StrategyTextField label="Where did it come from?" help="Source, article, report, project, or person." value={textFieldValue(draft.sourceTitle)} onChange={(value) => setField('sourceTitle', value)} />
          <StrategyTextField label="What link should we keep with it?" value={textFieldValue(draft.sourceUrl)} onChange={(value) => setField('sourceUrl', value)} />
          <StrategySelectField label="How confident are we using it?" help="Low confidence does not delete it. It tells designers to be careful." value={textFieldValue(draft.confidence) || 'medium'} options={confidenceOptions} onChange={(value) => setField('confidence', value)} />
          <StrategyTextField label="What topic or keyword group does this support?" value={textFieldValue(draft.topicCluster)} onChange={(value) => setField('topicCluster', value)} />
          <StrategyTextareaField label="How can designers use it safely?" help="Mention caveats, citation needs, or where this proof should not be used." value={textFieldValue(draft.usageNotes)} onChange={(value) => setField('usageNotes', value)} />
        </>
      )}

      {sectionId === 'ctas' && (
        <>
          <StrategyTextField label="What should the button or link say?" value={textFieldValue(draft.label)} onChange={(value) => setField('label', value)} />
          <StrategySelectField label="Where in the funnel does this fit?" help="Awareness is early interest; later stages ask for more commitment." value={textFieldValue(draft.funnelStage) || 'awareness'} options={funnelStageOptions} onChange={(value) => setField('funnelStage', value)} />
          <StrategyTextField label="Where should it send someone?" value={textFieldValue(draft.destination)} onChange={(value) => setField('destination', value)} />
          <StrategyTextField label="How would we know it worked?" help="Example: useful visits, saves, replies, contact form starts, downloads, or qualified conversations." value={textFieldValue(draft.successSignal)} onChange={(value) => setField('successSignal', value)} />
          <StrategySelectField label="How often should we use this action?" value={textFieldValue(draft.priority) || 'contextual'} options={ctaPriorityOptions} onChange={(value) => setField('priority', value)} />
          <StrategyTextareaField label="What should a designer remember?" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'tracking' && (
        <>
          <StrategySelectField label="Is this rule active?" value={textFieldValue(draft.status) || 'active'} options={documentStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextareaField label="How should utm_source be chosen?" help="Usually the platform or source people came from, such as instagram, linkedin, email, or website." value={textFieldValue(draft.utmSourceRule)} onChange={(value) => setField('utmSourceRule', value)} />
          <StrategyTextareaField label="How should utm_medium be chosen?" help="Usually the broad channel type, such as social, email, referral, paid, or organic." value={textFieldValue(draft.utmMediumRule)} onChange={(value) => setField('utmMediumRule', value)} />
          <StrategyTextField label="How should campaign names be written?" help="Keep this consistent so similar work groups together in analytics." value={textFieldValue(draft.utmCampaignPattern)} onChange={(value) => setField('utmCampaignPattern', value)} />
          <StrategyTextField label="How should content names be written?" help="Use this to tell different posts, links, or creative versions apart." value={textFieldValue(draft.utmContentPattern)} onChange={(value) => setField('utmContentPattern', value)} />
          <StrategyTextareaField label="Which source values are allowed?" help="One value per line. Example: instagram, linkedin, newsletter." value={editedTextValue(draft, 'allowedSourcesText', trackingValueText(draft.allowedSources))} onChange={(value) => setField('allowedSourcesText', value)} />
          <StrategyTextareaField label="Which medium values are allowed?" help="One value per line. Example: social, email, organic." value={editedTextValue(draft, 'allowedMediumsText', trackingValueText(draft.allowedMediums))} onChange={(value) => setField('allowedMediumsText', value)} />
          <StrategyTextareaField label="What should a designer remember?" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'quality' && (
        <>
          <StrategySelectField label="Is this checklist active?" value={textFieldValue(draft.status) || 'active'} options={documentStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextareaField label="When should designers use this checklist?" value={textFieldValue(draft.whenToUse)} onChange={(value) => setField('whenToUse', value)} />
          <StrategyTextareaField label="What should be checked?" help="One check per line. Optional format: check | category | guidance." value={editedTextValue(draft, 'checksText', qualityCheckText(draft.checks))} onChange={(value) => setField('checksText', value)} />
          <StrategyTextareaField label="What should a designer remember?" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'experiments' && (
        <>
          <StrategySelectField label="Where is this test?" value={textFieldValue(draft.status) || 'idea'} options={experimentStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextareaField label="What do we think will happen?" help="Write the bet in plain language: if we do X, we expect Y because Z." value={textFieldValue(draft.hypothesis)} onChange={(value) => setField('hypothesis', value)} />
          <StrategyTextField label="Expected result" value={textFieldValue(draft.expectedSignal)} onChange={(value) => setField('expectedSignal', value)} />
          <StrategyTextField label="Which public path is being tested?" help="Example: / or /vision/determinants-of-health." value={textFieldValue(draft.targetPath)} onChange={(value) => setField('targetPath', value)} />
          <StrategyTextField label="What traffic split key should engineering use?" help="Example: home-2026-variant." value={textFieldValue(draft.flagKey)} onChange={(value) => setField('flagKey', value)} />
          <StrategyTextareaField label="Which page versions are in the test?" help="One version per line. Optional format: key | label | notes | custom preview link. Include control/current." value={editedTextValue(draft, 'variantsText', experimentVariantText(draft.variants))} onChange={(value) => setField('variantsText', value)} />
          <StrategyTextField label="Primary success metric" value={textFieldValue(draft.primaryMetric)} onChange={(value) => setField('primaryMetric', value)} />
          <StrategyTextareaField label="What should QA check before rollout?" value={textFieldValue(draft.qaNotes)} onChange={(value) => setField('qaNotes', value)} />
          <StrategyTextareaField label="What happened?" value={textFieldValue(draft.result)} onChange={(value) => setField('result', value)} />
          <StrategySelectField label="What should we do next?" value={textFieldValue(draft.decision)} options={experimentDecisionOptions} onChange={(value) => setField('decision', value)} />
          <StrategyTextField label="When did we decide?" value={textFieldValue(draft.decisionDate)} type="date" onChange={(value) => setField('decisionDate', value)} />
          <StrategyTextareaField label="What should a designer remember?" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'performance' && (
        <>
          <StrategySelectField label="Where did this signal come from?" value={textFieldValue(draft.provider) || 'manual'} options={performanceProviderOptions} onChange={(value) => setField('provider', value)} />
          <StrategySelectField label="What should we do with it?" value={textFieldValue(draft.status) || 'new'} options={performanceStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextField label="What kind of signal is it?" help="Example: ranking query, high-exit page, saved post, qualified visit, or manual observation." value={textFieldValue(draft.signalType)} onChange={(value) => setField('signalType', value)} />
          <StrategyTextField label="Where did you see it?" help="Dashboard name, social post, report, page title, or source label." value={textFieldValue(draft.sourceLabel)} onChange={(value) => setField('sourceLabel', value)} />
          <StrategyTextField label="Which search query, if any?" value={textFieldValue(draft.query)} onChange={(value) => setField('query', value)} />
          <StrategyTextField label="Which page or destination?" value={textFieldValue(draft.pageUrl)} onChange={(value) => setField('pageUrl', value)} />
          <StrategyTextField label="When was this measured?" value={textFieldValue(draft.metricDate)} type="date" onChange={(value) => setField('metricDate', value)} />
          <StrategyTextareaField label="What numbers matter?" help="One metric per line. Optional format: label | value | unit | change | variant key | event name." value={editedTextValue(draft, 'metricsText', performanceMetricText(draft.metrics))} onChange={(value) => setField('metricsText', value)} />
          <StrategyTextareaField label="What does this tell us?" value={textFieldValue(draft.interpretation)} onChange={(value) => setField('interpretation', value)} />
          <StrategyTextareaField label="What should change because of it?" value={textFieldValue(draft.recommendation)} onChange={(value) => setField('recommendation', value)} />
          <StrategyTextareaField label="Paste raw notes or import data here if useful" value={textFieldValue(draft.rawImport)} onChange={(value) => setField('rawImport', value)} />
        </>
      )}
    </div>
  )
}

function StrategyTextField({
  label,
  help,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label>
      <span style={styles.label}>{label}</span>
      {help && <span style={{ ...styles.small, ...styles.muted, display: 'block', margin: '3px 0 6px', lineHeight: 1.4 }}>{help}</span>}
      <input type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} style={styles.input} />
    </label>
  )
}

function StrategyTextareaField({
  label,
  help,
  value,
  onChange,
}: {
  label: string
  help?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span style={styles.label}>{label}</span>
      {help && <span style={{ ...styles.small, ...styles.muted, display: 'block', margin: '3px 0 6px', lineHeight: 1.4 }}>{help}</span>}
      <textarea value={value} onChange={(event) => onChange(event.currentTarget.value)} style={{ ...styles.input, minHeight: 86, resize: 'vertical' }} />
    </label>
  )
}

function StrategySelectField({
  label,
  help,
  value,
  options,
  onChange,
}: {
  label: string
  help?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span style={styles.label}>{label}</span>
      {help && <span style={{ ...styles.small, ...styles.muted, display: 'block', margin: '3px 0 6px', lineHeight: 1.4 }}>{help}</span>}
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)} style={{ ...styles.input, paddingRight: 34 }}>
        <option value="">No selection</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.title}
          </option>
        ))}
      </select>
    </label>
  )
}
function getStrategyReadiness(data: MarketingData) {
  return [
    { label: getStrategySectionQuestion('audiences').shortLabel, value: data.audienceProfiles.length, ready: data.audienceProfiles.length > 0 },
    { label: getStrategySectionQuestion('messages').shortLabel, value: data.messagePillars.length, ready: data.messagePillars.length > 0 },
    { label: getStrategySectionQuestion('proof').shortLabel, value: data.proofPoints.length, ready: data.proofPoints.length > 0 },
    { label: getStrategySectionQuestion('ctas').shortLabel, value: data.ctas.length, ready: data.ctas.length > 0 },
    { label: getStrategySectionQuestion('tracking').shortLabel, value: data.trackingRules.length, ready: data.trackingRules.length > 0 },
    { label: getStrategySectionQuestion('quality').shortLabel, value: data.qualityGates.length, ready: data.qualityGates.length > 0 },
    { label: getStrategySectionQuestion('experiments').shortLabel, value: data.experiments.length, ready: data.experiments.length > 0 },
    { label: getStrategySectionQuestion('performance').shortLabel, value: data.performanceSignals.length, ready: data.performanceSignals.length > 0 },
  ]
}
function strategyDocumentSubtitle(sectionId: StrategyAssetKind, item: StrategyDocument) {
  if (sectionId === 'audiences') return [textFieldValue((item as MarketingAudienceProfile).priority), textFieldValue((item as MarketingAudienceProfile).audience)].filter(Boolean).join(' / ') || 'No audience detail'
  if (sectionId === 'messages') return textFieldValue((item as MarketingMessagePillar).topicCluster) || textFieldValue((item as MarketingMessagePillar).coreClaim) || 'No claim yet'
  if (sectionId === 'proof') return [textFieldValue((item as MarketingProofPoint).confidence), textFieldValue((item as MarketingProofPoint).sourceTitle)].filter(Boolean).join(' / ') || 'No source yet'
  if (sectionId === 'ctas') return [textFieldValue((item as MarketingCta).label), textFieldValue((item as MarketingCta).funnelStage)].filter(Boolean).join(' / ') || 'No CTA label yet'
  if (sectionId === 'tracking') return textFieldValue((item as MarketingTrackingRule).utmCampaignPattern) || textFieldValue((item as MarketingTrackingRule).status) || 'No pattern yet'
  if (sectionId === 'quality') return `${((item as MarketingQualityGate).checks || []).length} checks`
  if (sectionId === 'experiments') return textFieldValue((item as MarketingExperiment).hypothesis) || textFieldValue((item as MarketingExperiment).status) || 'No design bet yet'
  return [textFieldValue((item as MarketingPerformanceSignal).provider), textFieldValue((item as MarketingPerformanceSignal).signalType)].filter(Boolean).join(' / ') || 'No signal detail'
}
