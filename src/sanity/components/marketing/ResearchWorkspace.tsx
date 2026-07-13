import React, { useEffect, useMemo, useRef, useState } from 'react'
import { SearchIcon } from '@sanity/icons'

import { refsFromIds } from '@/lib/marketing'
import { campaignObjectiveOptions } from '../../schemas/marketingCampaign'
import {
  researchConfidenceOptions,
  researchMethodOptions,
  researchPriorityOptions,
} from '../../schemas/marketingResearchPlan'
import { researchProjectStatusOptions, researchProjectTypeOptions } from '../../schemas/marketingResearchProject'
import { researchResultStatusOptions } from '../../schemas/marketingResearchResult'
import { researchRunStatusOptions } from '../../schemas/marketingResearchRun'
import { requestMarketingAssist } from './marketingAssistRequest'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports ResearchWorkspace only for JSX
// rendering, and ResearchWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  buildAnalyticsInterpretations,
  buildInspirationResearchResultDocument,
  buildProofPointFromResearchResult,
  buildResearchProjectSavePayload,
  createResearchProjectCollaborator,
  createResearchProjectDocument,
  createResearchProjectGeneratedRecords,
  createResearchProjectQuestion,
  defaultResearchMethodsForType,
  defaultResearchQuestionsForType,
  describeResearchResult,
  emptyResearchInspirationDraft,
  EmptyInline,
  EmptyPanel,
  formatOptionalMoney,
  formatOptionalNumber,
  getResearchResultsForProject,
  getResearchRunsForProject,
  hasInspirationDraftContent,
  inspirationActionOptions,
  inspirationKindOptions,
  InputField,
  isResearchResultApproved,
  labelFor,
  MARKETING_UNSAVED_FORM_ID,
  MarketingAiAssistPanel,
  mergeIds,
  mergeInspirationIntoResearchProject,
  mergeResearchProjectSuggestion,
  migrateLegacyResearchPlanToProject,
  PanelHeading,
  refIdsFromRecords,
  removeResearchArrayItem,
  researchResultKindLabel,
  researchResultReviewerInstruction,
  Select,
  serializeAnalyticsTakeawaysForAi,
  StatusPill,
  stringListToText,
  studioSessionToken,
  styles,
  summarizeResearchResultForAi,
  textToStringList,
  updateResearchArrayItem,
  useMarketingUnsavedGuard,
  type AutopilotCompletionPayload,
  type AutopilotWorkspaceTarget,
  type MarketingAiAssistResponse,
  type MarketingAiSuggestion,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingResearchPlan,
  type MarketingResearchProject,
  type MarketingResearchResult,
  type MarketingViewId,
  type ResearchInspirationDraft,
  type StudioClient,
} from '../../tools/marketingTool'

export function ResearchWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
  onOpenView,
  autopilotTarget,
  onAutopilotComplete,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenView: (view: MarketingViewId) => void
  autopilotTarget?: AutopilotWorkspaceTarget | null
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}) {
  const [selectedId, setSelectedId] = useState(data.researchProjects[0]?._id || '')
  const [migrationMessage, setMigrationMessage] = useState('')

  useEffect(() => {
    if (selectedId && data.researchProjects.some((project) => project._id === selectedId)) return
    setSelectedId(data.researchProjects[0]?._id || '')
  }, [data.researchProjects, selectedId])

  useEffect(() => {
    if (autopilotTarget?.view !== 'research' || !autopilotTarget.recordId) return
    if (data.researchProjects.some((project) => project._id === autopilotTarget.recordId)) {
      setSelectedId(autopilotTarget.recordId)
    }
  }, [autopilotTarget?.recordId, autopilotTarget?.view, data.researchProjects])

  const selectedProject = data.researchProjects.find((project) => project._id === selectedId) || null

  const createProject = async () => {
    const id = await createDocument(createResearchProjectDocument(data))
    setSelectedId(id)
    onAutopilotComplete?.({ action: 'research:createProject', recordId: id })
  }

  const importLegacyPlan = async (plan: MarketingResearchPlan) => {
    setMigrationMessage('')
    const project = await migrateLegacyResearchPlanToProject(client, plan)
    await loadData()
    setSelectedId(project._id)
    setMigrationMessage(`Imported "${plan.title || 'legacy plan'}" as a research project. The original plan was left intact.`)
  }

  return (
    <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <section style={styles.panel}>
        <PanelHeading
          title="Research projects"
          description="Start with a question, gather findings, then create drafts only from trusted results."
        />
        <button type="button" data-tour-id="autopilot-research-add-project" style={{ ...styles.primaryButton, width: '100%', marginBottom: 12 }} onClick={() => void createProject()}>
          Add research project
        </button>
        {data.researchProjects.length === 0 ? (
          <EmptyInline title="No research projects yet. Add one before creating release plans or drafts." />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.researchProjects.map((project) => {
              const resultCount = data.researchResults.filter((result) => result.project?._id === project._id).length
              const approvedCount = data.researchResults.filter((result) => result.project?._id === project._id && isResearchResultApproved(result)).length
              return (
              <button
                key={project._id}
                type="button"
                style={{
                  ...styles.templateButton,
                  borderColor: project._id === selectedId ? '#007385' : 'var(--card-border-color)',
                  background: project._id === selectedId ? 'rgba(0, 115, 133, 0.1)' : 'var(--card-bg-color)',
                }}
                onClick={() => setSelectedId(project._id)}
              >
                <span style={{ fontWeight: 800 }}>{project.title || 'Untitled research project'}</span>
                <span style={{ ...styles.small, ...styles.muted }}>
                  {labelFor(researchProjectStatusOptions, project.status) || 'Draft'} / {labelFor(researchProjectTypeOptions, project.researchType) || 'Topic research'} / {project.targetGeography || 'us'}
                </span>
                <span style={{ ...styles.small, ...styles.muted }}>
                  {approvedCount}/{resultCount} trusted finding{resultCount === 1 ? '' : 's'}
                </span>
              </button>
            )})}
          </div>
        )}
        {data.researchPlans.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ ...styles.small, fontWeight: 800, cursor: 'pointer' }}>Legacy research plans ({data.researchPlans.length})</summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {migrationMessage && <div style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>{migrationMessage}</div>}
              {data.researchPlans.map((plan) => (
                <div key={plan._id} style={{ ...styles.card, boxShadow: 'none', padding: 10 }}>
                  <strong style={{ fontSize: 13 }}>{plan.title || 'Untitled legacy plan'}</strong>
                  <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 8px' }}>
                    Legacy plan docs are preserved. Import one to map its fields into project/results.
                  </p>
                  <button type="button" style={styles.button} onClick={() => void importLegacyPlan(plan)}>
                    Import as project
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <ResearchProjectEditor
        client={client}
        project={selectedProject}
        data={data}
        saving={!!selectedProject && savingId === selectedProject._id}
        onSave={commitPatch}
        loadData={loadData}
        onOpenView={onOpenView}
        autopilotTarget={autopilotTarget}
        onAutopilotComplete={onAutopilotComplete}
      />
    </div>
  )
}

function getResearchPageForAutopilotTarget(autopilotTarget?: AutopilotWorkspaceTarget | null): 'setup' | 'review' | 'synthesize' {
  if (autopilotTarget?.view !== 'research') return 'setup'
  if (autopilotTarget.targetId === 'autopilot-research-review') return 'review'
  if (autopilotTarget.targetId === 'autopilot-research-create-setup') return 'synthesize'
  return 'setup'
}

function ResearchProjectEditor({
  client,
  project,
  data,
  saving,
  onSave,
  loadData,
  onOpenView,
  autopilotTarget,
  onAutopilotComplete,
}: {
  client: StudioClient
  project: MarketingResearchProject | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  loadData: () => Promise<void>
  onOpenView: (view: MarketingViewId) => void
  autopilotTarget?: AutopilotWorkspaceTarget | null
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}) {
  const { clearUnsavedChanges, confirmDiscardUnsavedChanges, markUnsavedChange } = useMarketingUnsavedGuard()
  const [draft, setDraft] = useState<MarketingResearchProject | null>(project)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [converting, setConverting] = useState(false)
  const [researchPage, setResearchPage] = useState<'setup' | 'review' | 'synthesize'>('setup')
  const [pendingResultIds, setPendingResultIds] = useState<string[]>([])
  const [optimisticApprovedIds, setOptimisticApprovedIds] = useState<string[]>([])
  const [optimisticRejectedIds, setOptimisticRejectedIds] = useState<string[]>([])
  const [optimisticSelectedIds, setOptimisticSelectedIds] = useState<string[]>([])
  const [optimisticDeselectedIds, setOptimisticDeselectedIds] = useState<string[]>([])
  const [inspirationDraft, setInspirationDraft] = useState<ResearchInspirationDraft>(emptyResearchInspirationDraft)
  const [capturingInspiration, setCapturingInspiration] = useState(false)
  const [creatingProofResultIds, setCreatingProofResultIds] = useState<string[]>([])
  const runPanelRef = useRef<HTMLElement | null>(null)
  const analyticsTakeaways = useMemo(() => buildAnalyticsInterpretations(data), [data])
  const autopilotResearchPage = getResearchPageForAutopilotTarget(autopilotTarget)

  useEffect(() => {
    setDraft(project)
    setMessage('')
    setError('')
    setResearchPage(autopilotResearchPage)
    setInspirationDraft(emptyResearchInspirationDraft())
  }, [project, autopilotResearchPage])

  useEffect(() => {
    if (autopilotTarget?.view !== 'research') return
    setResearchPage(autopilotResearchPage)
  }, [autopilotResearchPage, autopilotTarget?.view])

  const draftId = draft?._id
  const projectResults = useMemo(() => (draftId ? getResearchResultsForProject(data, draftId) : []), [data, draftId])
  const projectRuns = useMemo(() => (draftId ? getResearchRunsForProject(data, draftId) : []), [data, draftId])
  const projectResultIds = useMemo(() => new Set(projectResults.map((result) => result._id)), [projectResults])
  const storedSelectedResultIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...(draft?.selectedResults || []).map((result) => result._id).filter(Boolean),
          ...projectResults.filter((result) => result.selectedForSynthesis || result.status === 'selected').map((result) => result._id),
        ]),
      ),
    [draft?.selectedResults, projectResults],
  )
  const selectedResultIds = Array.from(new Set([...storedSelectedResultIds, ...optimisticSelectedIds, ...optimisticApprovedIds]))
    .filter((id) => !optimisticDeselectedIds.includes(id) && !optimisticRejectedIds.includes(id))
  const approvedResultIds = Array.from(new Set([...projectResults.filter(isResearchResultApproved).map((result) => result._id), ...optimisticApprovedIds]))
  const selectedApprovedIds = selectedResultIds.filter((id) => approvedResultIds.includes(id))
  const hasGeneratedResearch = projectRuns.length > 0 || projectResults.length > 0

  useEffect(() => {
    setPendingResultIds((current) => current.filter((id) => projectResultIds.has(id)))
    setOptimisticApprovedIds((current) =>
      current.filter((id) => {
        const result = projectResults.find((candidate) => candidate._id === id)
        return result && result.status !== 'approved'
      }),
    )
    setOptimisticRejectedIds((current) =>
      current.filter((id) => {
        const result = projectResults.find((candidate) => candidate._id === id)
        return result && result.status !== 'rejected'
      }),
    )
    setOptimisticSelectedIds((current) =>
      current.filter((id) => projectResultIds.has(id) && !storedSelectedResultIds.includes(id)),
    )
    setOptimisticDeselectedIds((current) =>
      current.filter((id) => projectResultIds.has(id) && storedSelectedResultIds.includes(id)),
    )
  }, [projectResultIds, projectResults, storedSelectedResultIds])

  if (!draft) {
    return <EmptyPanel icon={SearchIcon} title="Select a research project" description="Create or reopen a project before making plans, campaigns, calendar items, or Quick Links." />
  }

  const updateDraft = <K extends keyof MarketingResearchProject>(key: K, value: MarketingResearchProject[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
    markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'research project draft')
    setMessage('')
    setError('')
  }

  const saveDraft = async () => {
    if (!draft._id) return
    await onSave(draft._id, buildResearchProjectSavePayload(draft))
    clearUnsavedChanges()
    setMessage('Research project saved.')
    onAutopilotComplete?.({ action: 'research:createProject', recordId: draft._id })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const projectSuggestion = suggestion.researchProject || {}
    setDraft((current) => (current ? mergeResearchProjectSuggestion(current, projectSuggestion) : current))
    markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'AI-assisted research project draft')
    setMessage('Suggested research setup applied. Review it, then get evidence.')
    setError('')
  }

  const regenerateResearchSetup = async () => {
    if (!draft._id) return
    if (!hasGeneratedResearch) {
      setMessage('Get evidence once before reworking this setup.')
      return
    }
    if (!confirmDiscardUnsavedChanges('Reworking the setup will replace the current research setup draft. Continue?')) return
    setRegenerating(true)
    setError('')
    setMessage('')
    try {
      const prompt = [
        `Regenerate this as ${labelFor(researchProjectTypeOptions, draft.researchType) || 'topic research'}.`,
        'Use the current title, directive, audience, seed inputs, and GoInvo site context.',
        'Refresh the methods, seed keywords, seed URLs, and research questions so the project matches the selected research type.',
        'Preserve reviewed results and linked drafts; only update the project setup.',
      ].join(' ')
      const payload = await requestMarketingAssist<MarketingAiAssistResponse>({
        kind: 'researchProject',
        draft,
        prompt,
        analyticsTakeaways: serializeAnalyticsTakeawaysForAi(analyticsTakeaways),
      })
      if (!payload.suggestion?.researchProject) throw new Error('Research setup could not be reworked.')
      const nextDraft = mergeResearchProjectSuggestion(draft, payload.suggestion.researchProject)
      setDraft(nextDraft)
      await onSave(draft._id, buildResearchProjectSavePayload(nextDraft))
      clearUnsavedChanges()
      await loadData()
      setMessage(`Research setup refreshed${payload.usedAi ? ' with AI' : ' from rule-based drafting'}. Check the updated questions, then get evidence again when ready.`)
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : 'Research setup could not be reworked.')
    } finally {
      setRegenerating(false)
    }
  }

  const runResearch = async () => {
    if (!draft._id) return
    setRunning(true)
    setError('')
    setMessage('')
    try {
      await onSave(draft._id, buildResearchProjectSavePayload(draft))
      clearUnsavedChanges()
      const token = studioSessionToken()
      const response = await fetch('/api/marketing/research/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-sanity-session': token } : {}),
        },
        body: JSON.stringify({
          projectId: draft._id,
          methods: draft.methods && draft.methods.length > 0 ? draft.methods : defaultResearchMethodsForType(draft.researchType),
          seedKeywords: draft.seedKeywords || [],
          seedUrls: draft.seedUrls || [],
          database: draft.targetGeography || 'us',
        }),
      })
      const payload = (await response.json()) as { runId?: string; createdResults?: number; warnings?: string[]; errors?: string[]; error?: string }
      if (!response.ok) throw new Error(payload.error || payload.errors?.[0] || 'Research run failed.')
      await loadData()
      const warningText = payload.warnings && payload.warnings.length > 0 ? ` Warnings: ${payload.warnings.join(' ')}` : ''
      setMessage(`Research run complete. Created ${payload.createdResults || 0} finding${payload.createdResults === 1 ? '' : 's'} to review.${warningText}`)
      setResearchPage('review')
      if ((payload.createdResults || 0) > 0) onAutopilotComplete?.({ action: 'research:run', recordId: draft._id })
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Research run failed.')
    } finally {
      setRunning(false)
    }
  }

  const captureInspiration = async () => {
    if (!draft._id) return
    if (!hasInspirationDraftContent(inspirationDraft)) {
      setError('Add the idea, source title, URL, or note that inspired the content.')
      return
    }

    setCapturingInspiration(true)
    setError('')
    setMessage('')
    try {
      const nextDraft = mergeInspirationIntoResearchProject(draft, inspirationDraft)
      const created = await client.create(buildInspirationResearchResultDocument(draft, inspirationDraft))
      await onSave(draft._id, buildResearchProjectSavePayload(nextDraft))
      clearUnsavedChanges()
      setDraft(nextDraft)
      await loadData()
      setInspirationDraft(emptyResearchInspirationDraft())
      setResearchPage('review')
      setMessage(`Captured "${created.title || 'inspiration'}" for review. Trust it only if it is useful enough to guide drafts.`)
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Could not capture this inspiration.')
    } finally {
      setCapturingInspiration(false)
    }
  }

  const setResultSelected = async (result: MarketingResearchResult, selected: boolean) => {
    setPendingResultIds((current) => Array.from(new Set([...current, result._id])))
    if (selected) {
      setOptimisticSelectedIds((current) => Array.from(new Set([...current, result._id])))
      setOptimisticDeselectedIds((current) => current.filter((id) => id !== result._id))
    } else {
      setOptimisticDeselectedIds((current) => Array.from(new Set([...current, result._id])))
      setOptimisticSelectedIds((current) => current.filter((id) => id !== result._id))
    }
    setError('')
    const nextSelected = selected
      ? Array.from(new Set([...selectedResultIds, result._id]))
      : selectedResultIds.filter((id) => id !== result._id)
    try {
      await client
        .patch(result._id)
        .set({
          selectedForSynthesis: selected,
          status: selected ? (result.status === 'approved' ? 'approved' : 'selected') : result.status === 'selected' ? 'needsReview' : result.status || 'needsReview',
        })
        .commit()
      await onSave(draft._id, { selectedResults: refsFromIds(nextSelected) }, nextSelected.length > 0 ? [] : ['selectedResults'])
      await loadData()
    } catch (selectionError) {
      if (selected) {
        setOptimisticSelectedIds((current) => current.filter((id) => id !== result._id))
      } else {
        setOptimisticDeselectedIds((current) => current.filter((id) => id !== result._id))
      }
      setError(selectionError instanceof Error ? selectionError.message : 'Could not update this research item.')
    } finally {
      setPendingResultIds((current) => current.filter((id) => id !== result._id))
    }
  }

  const approveResult = async (result: MarketingResearchResult) => {
    setPendingResultIds((current) => Array.from(new Set([...current, result._id])))
    setOptimisticApprovedIds((current) => Array.from(new Set([...current, result._id])))
    setOptimisticRejectedIds((current) => current.filter((id) => id !== result._id))
    setOptimisticSelectedIds((current) => Array.from(new Set([...current, result._id])))
    setOptimisticDeselectedIds((current) => current.filter((id) => id !== result._id))
    setError('')
    const nextSelected = Array.from(new Set([...selectedResultIds, result._id]))
    const nextApproved = Array.from(new Set([...approvedResultIds, result._id]))
    try {
      await client
        .patch(result._id)
        .set({
          status: 'approved',
          selectedForSynthesis: true,
          approvedAt: new Date().toISOString(),
        })
        .commit()
      await onSave(draft._id, {
        selectedResults: refsFromIds(nextSelected),
        approvedResults: refsFromIds(nextApproved),
      })
      await loadData()
      onAutopilotComplete?.({ action: 'research:approve', recordId: result._id })
    } catch (approvalError) {
      setOptimisticApprovedIds((current) => current.filter((id) => id !== result._id))
      setError(approvalError instanceof Error ? approvalError.message : 'Could not mark this finding as trusted.')
    } finally {
      setPendingResultIds((current) => current.filter((id) => id !== result._id))
    }
  }

  const rejectResult = async (result: MarketingResearchResult) => {
    setPendingResultIds((current) => Array.from(new Set([...current, result._id])))
    setOptimisticRejectedIds((current) => Array.from(new Set([...current, result._id])))
    setOptimisticApprovedIds((current) => current.filter((id) => id !== result._id))
    setOptimisticSelectedIds((current) => current.filter((id) => id !== result._id))
    setOptimisticDeselectedIds((current) => Array.from(new Set([...current, result._id])))
    setError('')
    const nextSelected = selectedResultIds.filter((id) => id !== result._id)
    const nextApproved = approvedResultIds.filter((id) => id !== result._id)
    try {
      await client
        .patch(result._id)
        .set({
          status: 'rejected',
          selectedForSynthesis: false,
        })
        .unset(['approvedAt'])
        .commit()
      await onSave(
        draft._id,
        {
          selectedResults: refsFromIds(nextSelected),
          approvedResults: refsFromIds(nextApproved),
        },
        [
          ...(nextSelected.length > 0 ? [] : ['selectedResults']),
          ...(nextApproved.length > 0 ? [] : ['approvedResults']),
        ],
      )
      await loadData()
    } catch (rejectError) {
      setOptimisticRejectedIds((current) => current.filter((id) => id !== result._id))
      setError(rejectError instanceof Error ? rejectError.message : 'Could not reject this research item.')
    } finally {
      setPendingResultIds((current) => current.filter((id) => id !== result._id))
    }
  }

  const createProofPointFromResult = async (result: MarketingResearchResult) => {
    if (!draft._id) return
    setCreatingProofResultIds((current) => Array.from(new Set([...current, result._id])))
    setError('')
    setMessage('')
    try {
      const created = await client.create(buildProofPointFromResearchResult(result, draft))
      const nextProofIds = mergeIds(refIdsFromRecords(result.proofPoints), [created._id])
      await client
        .patch(result._id)
        .set({ proofPoints: refsFromIds(nextProofIds) })
        .commit()
      await onSave(draft._id, {
        proofPoints: refsFromIds(mergeIds(refIdsFromRecords(draft.proofPoints), [created._id])),
      })
      await loadData()
      setMessage(`Created proof draft "${created.title || 'Proof point'}" and linked it to this finding. Open Strategy > Proof to review it before reuse.`)
      onAutopilotComplete?.({ action: 'strategy:save:proof', recordId: created._id })
    } catch (proofError) {
      setError(proofError instanceof Error ? proofError.message : 'Could not create a proof point from this research item.')
    } finally {
      setCreatingProofResultIds((current) => current.filter((id) => id !== result._id))
    }
  }

  const generateLinkedRecords = async () => {
    if (!draft._id) return
    setConverting(true)
    setError('')
    setMessage('')
    try {
      if (selectedApprovedIds.length === 0) throw new Error('Trust and select at least one finding before creating setup drafts.')
      await onSave(draft._id, buildResearchProjectSavePayload(draft))
      clearUnsavedChanges()
      const result = await createResearchProjectGeneratedRecords(client, data, draft, selectedApprovedIds)
      await loadData()
      setMessage(`Created ${result.calendarItemIds.length} draft calendar item${result.calendarItemIds.length === 1 ? '' : 's'}, plus campaign, funnel, and Quick Link drafts from trusted findings.`)
      onAutopilotComplete?.({ action: 'research:generateRecords', recordId: draft._id })
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Could not create linked drafts.')
    } finally {
      setConverting(false)
    }
  }

  const addQuestion = () => updateDraft('researchQuestions', [...(draft.researchQuestions || []), createResearchProjectQuestion(draft)])
  const addCollaborator = () => updateDraft('collaborators', [...(draft.collaborators || []), createResearchProjectCollaborator()])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={styles.kicker}>Research first</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{draft.title || 'Untitled research project'}</h2>
            <p style={{ ...styles.muted, margin: '5px 0 0', lineHeight: 1.55 }}>
              Start with the question. Research collects evidence. You choose what is useful before anything becomes a campaign, calendar item, or Quick Link.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['converted', 'archived'].includes(draft.status || '') && (
              <button type="button" style={styles.button} onClick={() => updateDraft('status', 'reviewing')}>
                Reopen project
              </button>
            )}
            <button
              type="button"
              style={{
                ...styles.button,
                opacity: hasGeneratedResearch ? 1 : 0.45,
                cursor: hasGeneratedResearch ? 'pointer' : 'not-allowed',
              }}
              title={hasGeneratedResearch ? 'Rewrites this setup form from the latest findings — does not fetch new evidence.' : 'Get evidence first. There are no findings to rework from yet.'}
              onClick={() => void regenerateResearchSetup()}
              disabled={!hasGeneratedResearch || regenerating || running || saving}
            >
              {regenerating ? 'Reworking setup...' : 'Rework setup with AI'}
            </button>
          </div>
        </div>

        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {[
            { step: '1', title: 'What should we learn?', detail: draft.brief ? 'Ready' : 'Needs question', page: 'setup' as const, enabled: true, scrollToRunPanel: false },
            { step: '2', title: 'Get evidence', detail: `${projectRuns.length} run${projectRuns.length === 1 ? '' : 's'}`, page: 'setup' as const, enabled: true, scrollToRunPanel: true },
            { step: '3', title: 'What can we trust?', detail: `${selectedApprovedIds.length}/${projectResults.length} chosen`, page: 'review' as const, enabled: hasGeneratedResearch, scrollToRunPanel: false },
            { step: '4', title: 'Make editable drafts', detail: selectedApprovedIds.length > 0 ? 'Ready' : 'Waiting', page: 'synthesize' as const, enabled: hasGeneratedResearch, scrollToRunPanel: false },
          ].map((card) => {
            const active = researchPage === card.page
            return (
              <button
                key={card.step}
                type="button"
                style={{
                  ...styles.card,
                  boxShadow: 'none',
                  padding: 10,
                  textAlign: 'left',
                  color: 'var(--card-fg-color)',
                  opacity: card.enabled ? 1 : 0.45,
                  cursor: card.enabled ? 'pointer' : 'not-allowed',
                  borderColor: active ? '#007385' : 'var(--card-border-color)',
                  background: active ? 'rgba(0, 115, 133, 0.1)' : 'var(--card-bg-color)',
                }}
                title={card.enabled ? undefined : 'Get evidence before opening this page.'}
                disabled={!card.enabled}
                onClick={() => {
                  if (!card.enabled) return
                  setResearchPage(card.page)
                  if (card.scrollToRunPanel) {
                    window.setTimeout(() => runPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
                  }
                }}
              >
                <div style={styles.kicker}>Step {card.step}</div>
                <strong>{card.title}</strong>
                <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>{card.detail}</div>
              </button>
            )
          })}
        </div>

        <MarketingAiAssistPanel
          kind="researchProject"
          draft={draft as unknown as Record<string, unknown>}
          analyticsTakeaways={analyticsTakeaways}
          onApply={applyAiSuggestion}
        />

        {message && <div style={{ ...styles.small, color: '#007385', fontWeight: 800, marginTop: 12 }}>{message}</div>}
        {error && <div role="alert" style={{ ...styles.small, color: '#E36216', fontWeight: 800, marginTop: 12 }}>{error}</div>}
      </section>

      {researchPage === 'setup' && (
        <>
          <ResearchInspirationIntake
            value={inspirationDraft}
            disabled={capturingInspiration || saving}
            onChange={setInspirationDraft}
            onCapture={() => void captureInspiration()}
          />

      <section data-tour-id="autopilot-research-project-editor" style={styles.panel}>
        <PanelHeading title="What should Research answer?" description="Give the system just enough direction to know what to score, scan, and review." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <InputField label="What should we call this research?" help="A short internal name is enough. It can be a topic, article, campaign idea, or source.">
            <input style={styles.input} value={draft.title || ''} onChange={(event) => updateDraft('title', event.currentTarget.value)} />
          </InputField>
          <InputField label="Where is this research in the workflow?">
            <Select ariaLabel="Research project status" value={draft.status || 'draft'} options={researchProjectStatusOptions} onChange={(value) => updateDraft('status', value)} />
          </InputField>
          <InputField label="What kind of research is this?" help="Pick the closest shape. The choice changes the starter questions and scan methods.">
            <Select
              ariaLabel="Research type"
              value={draft.researchType || 'topic'}
              options={researchProjectTypeOptions}
              onChange={(value) => {
                const nextType = value || 'topic'
                updateDraft('researchType', nextType)
                updateDraft('methods', defaultResearchMethodsForType(nextType))
                updateDraft('researchQuestions', defaultResearchQuestionsForType(nextType, draft.title || 'this research project'))
              }}
            />
          </InputField>
          <InputField label="Why are we doing it?" help="This keeps the research tied to the marketing goal instead of becoming trivia collection.">
            <Select ariaLabel="Research objective" value={draft.campaignObjective || 'awareness'} options={campaignObjectiveOptions} onChange={(value) => updateDraft('campaignObjective', value)} />
          </InputField>
          <InputField label="Where should keyword scores come from?" help="Use us for United States search data unless this work targets another market.">
            <input style={styles.input} value={draft.targetGeography || 'us'} onChange={(event) => updateDraft('targetGeography', event.currentTarget.value)} />
          </InputField>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <InputField label="What are we trying to learn?" help="Write this like a request to a careful researcher. Example: Find evidence and search demand for a Boston housing statistics carousel.">
            <textarea rows={4} style={styles.input} value={draft.brief || ''} onChange={(event) => updateDraft('brief', event.currentTarget.value)} />
          </InputField>
          <InputField label="Who should the research help us understand?">
            <textarea rows={3} style={styles.input} value={draft.audience || ''} onChange={(event) => updateDraft('audience', event.currentTarget.value)} />
          </InputField>
          <InputField label="What decisions should this help us make?" help="One decision per line. Example: whether this deserves an Instagram carousel; what URL it should point to.">
            <textarea rows={3} style={styles.input} value={stringListToText(draft.goals)} onChange={(event) => updateDraft('goals', textToStringList(event.currentTarget.value))} />
          </InputField>
          <InputField label="What do we think might be true?" help="Optional. The research can confirm, improve, or reject this starting idea.">
            <textarea rows={3} style={styles.input} value={draft.positioning || ''} onChange={(event) => updateDraft('positioning', event.currentTarget.value)} />
          </InputField>
          <InputField label="What page or source should this point toward?" help="Use the destination we expect to send people to, if one exists.">
            <input style={styles.input} value={draft.canonicalUrl || ''} onChange={(event) => updateDraft('canonicalUrl', event.currentTarget.value)} />
          </InputField>
        </div>
      </section>

      <section ref={runPanelRef} data-tour-id="autopilot-research-run-panel" style={styles.panel}>
        <PanelHeading title="Get evidence" description="This creates reviewable findings: keyword scores, source checks, site context, gaps, analytics signals, and competitor examples." />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <InputField label="What phrases should we score?" help="One phrase per line. These become keyword-score findings when Semrush is available.">
            <textarea rows={5} style={styles.input} value={stringListToText(draft.seedKeywords)} onChange={(event) => updateDraft('seedKeywords', textToStringList(event.currentTarget.value))} />
          </InputField>
          <InputField label="What pages or sources should we inspect?" help="One URL per line. These become source or site-context findings to review.">
            <textarea rows={5} style={styles.input} value={stringListToText(draft.seedUrls)} onChange={(event) => updateDraft('seedUrls', textToStringList(event.currentTarget.value))} />
          </InputField>
        </div>
        <div style={{ ...styles.label, marginTop: 12 }}>Where should Research look?</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            { title: 'Semrush keyword scores', value: 'seoReview' },
            { title: 'CMS / site scan', value: 'cmsScan' },
            { title: 'Source and proof check', value: 'sourceReview' },
            { title: 'Analytics review', value: 'analyticsReview' },
            { title: 'Competitive scan', value: 'competitiveScan' },
          ].map((method) => (
            <label key={method.value} style={{ display: 'inline-flex', gap: 7, alignItems: 'center', ...styles.small }}>
              <input
                type="checkbox"
                data-mobile-tap-target="true"
                checked={(draft.methods || defaultResearchMethodsForType(draft.researchType)).includes(method.value)}
                onChange={(event) => {
                  const current = draft.methods || defaultResearchMethodsForType(draft.researchType)
                  updateDraft('methods', event.currentTarget.checked ? Array.from(new Set([...current, method.value])) : current.filter((item) => item !== method.value))
                }}
              />
              {method.title}
            </label>
          ))}
        </div>
        {projectRuns.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
            {projectRuns.slice(0, 4).map((run) => (
              <div key={run._id} style={{ ...styles.card, boxShadow: 'none', padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{run.title || 'Research run'}</strong>
                  <StatusPill status={run.status} options={researchRunStatusOptions} />
                </div>
                <div style={{ ...styles.small, ...styles.muted, marginTop: 5 }}>
                  {(run.methods || []).join(', ') || 'No methods'} / {(run.createdResults || []).length} finding{(run.createdResults || []).length === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <button type="button" data-tour-id="autopilot-research-save-project" style={styles.button} onClick={() => void saveDraft()} disabled={saving || running}>
            {saving ? 'Saving...' : 'Save project'}
          </button>
          <button type="button" data-tour-id="autopilot-research-run" style={styles.primaryButton} onClick={() => void runResearch()} disabled={running || saving}>
            {running ? 'Getting evidence...' : 'Get evidence'}
          </button>
        </div>
      </section>
        </>
      )}

      {researchPage === 'review' && (
      <section data-tour-id="autopilot-research-review" style={styles.panel}>
        <PanelHeading title="Choose what is useful enough to guide drafts" description="Mark only the findings, sources, or inspiration that are credible and relevant enough to influence setup drafts. This does not publish anything." />
        <ResearchReviewExplainer />
        {projectResults.length === 0 ? (
          <EmptyInline title="No findings yet. Get evidence to fetch SEO scores, scan CMS content, and summarize source pages." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {projectResults.map((result) => {
              const approving = pendingResultIds.includes(result._id)
              const creatingProof = creatingProofResultIds.includes(result._id)
              const linkedProofIds = refIdsFromRecords(result.proofPoints)
              const effectiveStatus = optimisticApprovedIds.includes(result._id)
                ? 'approved'
                : optimisticRejectedIds.includes(result._id)
                  ? 'rejected'
                  : result.status
              const selected = selectedResultIds.includes(result._id) || optimisticApprovedIds.includes(result._id)
              const isApproved = effectiveStatus === 'approved'
              const isRejected = effectiveStatus === 'rejected'
              return (
                <div key={result._id} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{result.title || result.keyword || 'Untitled finding'}</strong>
                        <StatusPill status={researchResultKindLabel(result)} options={[{ title: researchResultKindLabel(result), value: researchResultKindLabel(result) }]} />
                        <StatusPill status={effectiveStatus} options={researchResultStatusOptions} />
                        {result.confidence && <MetricBadge label="Confidence" value={labelFor(researchConfidenceOptions, result.confidence) || result.confidence} />}
                        {result.priority && <MetricBadge label="Priority" value={labelFor(researchPriorityOptions, result.priority) || result.priority} />}
                      </div>
                      <div style={{ ...styles.small, ...styles.muted, marginTop: 6, lineHeight: 1.5 }}>
                        {researchResultReviewerInstruction(result)}
                      </div>
                      <div style={{ ...styles.small, marginTop: 7, lineHeight: 1.5 }}>
                        <strong style={{ color: '#93A4C8' }}>What this tells us: </strong>
                        <span style={styles.muted}>{describeResearchResult(result)}</span>
                      </div>
                      <label style={{ display: 'inline-flex', gap: 7, alignItems: 'center', ...styles.small, marginTop: 8, fontWeight: 800 }}>
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={approving || isRejected}
                          onChange={(event) => void setResultSelected(result, event.currentTarget.checked)}
                        />
                        Let this guide drafts
                      </label>
                      {(result.sourceUrl || result.competitorUrl || result.canonicalUrl) && (
                        <a
                          href={result.sourceUrl || result.competitorUrl || result.canonicalUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...styles.small, color: '#00A0B6', display: 'inline-block', marginTop: 7, fontWeight: 800 }}
                        >
                          Open evidence source
                        </a>
                      )}
                      {result.provider === 'semrush' && result.scoreSource === 'provider' && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          <MetricBadge label="Volume" value={formatOptionalNumber(result.volume)} />
                          <MetricBadge label="KD" value={formatOptionalNumber(result.difficulty)} />
                          <MetricBadge label="CPC" value={formatOptionalMoney(result.cpc)} />
                          <MetricBadge label="Competition" value={formatOptionalNumber(result.competition)} />
                        </div>
                      )}
                      {result.implication && <FindingDetail label="Why it matters" text={result.implication} />}
                      {result.contentGap && <FindingDetail label={result.resultType === 'contentGap' ? 'Gap to resolve' : 'Human check before using'} text={result.contentGap} />}
                      {linkedProofIds.length > 0 && (
                        <FindingDetail
                          label="Connected proof"
                          text={`${linkedProofIds.length} proof point${linkedProofIds.length === 1 ? '' : 's'} linked. Use Strategy > Proof to review or reuse them.`}
                        />
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 8, minWidth: 112 }}>
                      <button
                        type="button"
                        style={isApproved ? styles.button : styles.primaryButton}
                        onClick={() => void approveResult(result)}
                        disabled={approving || isApproved}
                      >
                        {isApproved ? 'Ready to use' : approving ? 'Marking...' : 'Trust + use'}
                      </button>
                      {!isApproved && (
                        <button
                          type="button"
                          style={styles.button}
                          onClick={() => void rejectResult(result)}
                          disabled={approving || isRejected}
                        >
                          {approving && optimisticRejectedIds.includes(result._id) ? 'Rejecting...' : isRejected ? 'Rejected' : 'Reject'}
                        </button>
                      )}
                      {linkedProofIds.length > 0 ? (
                        <button type="button" style={styles.button} onClick={() => onOpenView('strategy')}>
                          Review proof points
                        </button>
                      ) : (
                        <button
                          type="button"
                          style={styles.button}
                          onClick={() => void createProofPointFromResult(result)}
                          disabled={creatingProof}
                          title="Create an editable proof point linked to this research item. Review the proof before using it in content."
                        >
                          {creatingProof ? 'Creating...' : 'Create proof draft'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {researchPage === 'synthesize' && (
      <section data-tour-id="autopilot-research-create-setup" style={styles.panel}>
        <PanelHeading title="Make setup drafts from trusted findings" description="Use the trusted items you selected to create editable drafts. Nothing is published." />
        <div style={{ ...styles.card, boxShadow: 'none', padding: 12, marginBottom: 12, background: 'rgba(0, 115, 133, 0.08)' }}>
          <strong style={{ fontSize: 14 }}>What this creates</strong>
          <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0', lineHeight: 1.5 }}>
            One campaign draft, one funnel draft, draft calendar items, and a Quick Link when there is a public destination. These drafts stay connected to the findings that justified them.
          </p>
        </div>
        <MarketingAiAssistPanel
          kind="researchSynthesis"
          draft={{
            projectId: draft._id,
            title: draft.title,
            brief: draft.brief,
            selectedResultIds: selectedApprovedIds,
            selectedResults: projectResults.filter((result) => selectedApprovedIds.includes(result._id)).map(summarizeResearchResultForAi),
          }}
          analyticsTakeaways={analyticsTakeaways}
          onApply={(suggestion) => {
            const synthesis = suggestion.researchSynthesis
            setMessage(synthesis?.releaseRecommendation || synthesis?.summary || 'Recommendation received. Review the selected findings before creating setup drafts.')
          }}
        />
        <button
          type="button"
          style={{ ...styles.primaryButton, width: '100%', marginTop: 12 }}
          onClick={() => void generateLinkedRecords()}
          disabled={converting || selectedApprovedIds.length === 0}
        >
          {converting ? 'Creating...' : 'Create setup drafts'}
        </button>
        {selectedApprovedIds.length === 0 && (
          <p style={{ ...styles.small, ...styles.muted, margin: '8px 0 0' }}>
            Trust and select at least one finding before creating setup drafts.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" style={styles.button} onClick={() => onOpenView('campaigns')}>Review campaign drafts</button>
          <button type="button" style={styles.button} onClick={() => onOpenView('funnels')}>Review funnel drafts</button>
          <button type="button" style={styles.button} onClick={() => onOpenView('calendar')}>Review calendar drafts</button>
          <button type="button" style={styles.button} onClick={() => onOpenView('linkTree')}>Review Quick Link drafts</button>
        </div>
      </section>
      )}

      {researchPage === 'setup' && (
        <>
      <ResearchArrayModule
        title="Research questions"
        description="Manual questions stay on the project; answers should become findings."
        actionLabel="Add question"
        onAdd={addQuestion}
      >
        {(draft.researchQuestions || []).length === 0 ? (
          <EmptyInline title="No research questions yet." />
        ) : (
          (draft.researchQuestions || []).map((question, index) => (
            <div key={question._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(150px, 0.4fr) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Question">
                  <input
                    style={styles.input}
                    value={question.question || ''}
                    onChange={(event) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { question: event.currentTarget.value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <InputField label="Method">
                  <Select
                    ariaLabel={`Research question ${index + 1} method`}
                    value={question.method || 'deskResearch'}
                    options={researchMethodOptions}
                    onChange={(value) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { method: value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('researchQuestions', removeResearchArrayItem(draft.researchQuestions, index))}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Collaborators and interns"
        description="Add people and capacity signals before research synthesis so timing can shift around real availability."
        actionLabel="Add collaborator"
        onAdd={addCollaborator}
      >
        {(draft.collaborators || []).length === 0 ? (
          <EmptyInline title="No collaborators yet." />
        ) : (
          (draft.collaborators || []).map((collaborator, index) => (
            <div key={collaborator._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <InputField label="Name">
                  <input
                    style={styles.input}
                    value={collaborator.name || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { name: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
                <InputField label="Organization">
                  <input
                    style={styles.input}
                    value={collaborator.organization || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { organization: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
                <InputField label="Topic area">
                  <input
                    style={styles.input}
                    value={collaborator.topicArea || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { topicArea: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
                <InputField label="Capacity">
                  <input
                    style={styles.input}
                    value={collaborator.capacity || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { capacity: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
              </div>
              <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => updateDraft('collaborators', removeResearchArrayItem(draft.collaborators, index))}>
                Remove collaborator
              </button>
            </div>
          ))
        )}
      </ResearchArrayModule>
        </>
      )}
    </div>
  )
}

function ResearchInspirationIntake({
  value,
  disabled,
  onChange,
  onCapture,
}: {
  value: ResearchInspirationDraft
  disabled: boolean
  onChange: (value: ResearchInspirationDraft) => void
  onCapture: () => void
}) {
  const setField = (field: keyof ResearchInspirationDraft, fieldValue: string) => onChange({ ...value, [field]: fieldValue })

  return (
    <section data-tour-id="autopilot-research-inspiration" style={{ ...styles.panel, borderColor: 'rgba(0, 166, 184, 0.36)', background: 'rgba(0, 115, 133, 0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={styles.kicker}>Idea inbox</div>
          <h3 style={{ margin: 0 }}>Save something that could become content</h3>
          <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0', maxWidth: 760, lineHeight: 1.55 }}>
            Use this when an article, resource, website, peer example, or stray idea makes you think "we should make something about this." It becomes a finding to review before it can guide drafts.
          </p>
        </div>
        <button type="button" style={styles.primaryButton} disabled={disabled || !hasInspirationDraftContent(value)} onClick={onCapture}>
          {disabled ? 'Saving...' : 'Save for review'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <InputField label="What kind of thing is it?">
          <Select ariaLabel="Inspiration type" value={value.sourceKind || 'idea'} options={inspirationKindOptions} onChange={(nextValue) => setField('sourceKind', nextValue)} disabled={disabled} />
        </InputField>
        <InputField label="What might we do with it?">
          <Select ariaLabel="Inspiration next action" value={value.action || 'respond'} options={inspirationActionOptions} onChange={(nextValue) => setField('action', nextValue)} disabled={disabled} />
        </InputField>
        <InputField label="What should we call it?">
          <input
            style={styles.input}
            value={value.title}
            disabled={disabled}
            onChange={(event) => setField('title', event.currentTarget.value)}
            placeholder="Example: Boston housing data article"
          />
        </InputField>
        <InputField label="Where is it?">
          <input
            style={styles.input}
            value={value.url}
            disabled={disabled}
            onChange={(event) => setField('url', event.currentTarget.value)}
            placeholder="https://..."
          />
        </InputField>
      </div>
      <InputField label="What did it make us want to say or make?">
        <textarea
          rows={3}
          style={styles.input}
          value={value.note}
          disabled={disabled}
          onChange={(event) => setField('note', event.currentTarget.value)}
          placeholder="Example: Use this as a jumping-off point for a carousel that explains what the stat means and where to learn more."
        />
      </InputField>
      <p style={{ ...styles.small, ...styles.muted, margin: '8px 0 0', lineHeight: 1.5 }}>
        Saved ideas are not trusted automatically. The next screen asks whether this is credible, relevant, and worth using.
      </p>
    </section>
  )
}

function ResearchArrayModule({
  title,
  description,
  actionLabel,
  onAdd,
  children,
}: {
  title: string
  description: string
  actionLabel: string
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <PanelHeading title={title} description={description} />
        <button type="button" style={{ ...styles.button, whiteSpace: 'nowrap' }} onClick={onAdd}>
          {actionLabel}
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </section>
  )
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        ...styles.small,
        border: '1px solid rgba(0, 115, 133, 0.24)',
        borderRadius: 6,
        padding: '4px 7px',
        background: 'rgba(0, 115, 133, 0.08)',
        fontWeight: 800,
      }}
    >
      {label}: {value}
    </span>
  )
}

function FindingDetail({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ ...styles.small, marginTop: 8, lineHeight: 1.5 }}>
      <strong style={{ color: '#93A4C8' }}>{label}: </strong>
      <span style={styles.muted}>{text}</span>
    </div>
  )
}

function ResearchReviewExplainer() {
  return (
    <details style={{ ...styles.card, boxShadow: 'none', padding: 12, margin: '10px 0 14px', background: 'rgba(0, 115, 133, 0.08)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 850 }}>What does Trust + use mean?</summary>
      <div style={{ display: 'grid', gap: 8, marginTop: 10, ...styles.small, ...styles.muted, lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          These cards are inputs, not finished content. Some are facts or gaps, some are source candidates, and some are inspiration someone saved.
          Trust + use means "this is relevant and credible enough to shape the next draft." It does not publish anything.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <div>
            <strong style={{ color: '#fff' }}>Source candidate</strong>
            <br />
            A page, article, or URL the system found. Open it and confirm it actually supports the project.
          </div>
          <div>
            <strong style={{ color: '#fff' }}>Captured inspiration</strong>
            <br />
            An idea, article, resource, or website someone saved because it might be worth responding to, citing, contrasting, or learning from.
          </div>
          <div>
            <strong style={{ color: '#fff' }}>Finding</strong>
            <br />
            A claim, keyword score, content gap, analytics signal, or collaborator signal that can shape the plan.
          </div>
          <div>
            <strong style={{ color: '#fff' }}>Let it guide drafts</strong>
            <br />
            Only trusted, selected items are allowed to generate campaigns, funnels, calendar drafts, or Quick Links.
          </div>
        </div>
      </div>
    </details>
  )
}

