import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { LaunchIcon } from '@sanity/icons'

import { dateInputToIso, randomKey, refsFromIds, toDateInputValue, uniqueById } from '@/lib/marketing'
import { analyticsProviderOptions, analyticsStatusOptions } from '../../schemas/marketingAnalyticsSource'
import { experimentTargetTypeOptions } from '../../schemas/marketingExperiment'
import type { AbTestingEditorTab } from './types'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports AbTestingWorkspace only for JSX
// rendering, and AbTestingWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  AdvancedFieldsDropdown,
  aiExperimentSuccessTrackers,
  aiExperimentTrackedMetrics,
  aiExperimentVariants,
  aiOption,
  aiString,
  buildAbTestingInsights,
  buildAnalyticsInterpretations,
  EmptyInline,
  EXPERIMENT_FORCE_VARIANT_PARAM,
  emptyKeys,
  experimentDecisionOptions,
  experimentHasControlVariant,
  experimentHasSuccessTracker,
  experimentHasTrackedMetric,
  experimentListMeta,
  experimentSignalIds,
  experimentStatusOptions,
  experimentSuccessTrackersFromDraft,
  experimentSuccessTrackerText,
  experimentTrackedMetricsFromDraft,
  experimentTrackedMetricText,
  experimentVariantsFromDraft,
  experimentVariantText,
  formatAbTestingAvgTime,
  formatAbTestingBounceRate,
  formatAbTestingEventCount,
  formatAbTestingEventRate,
  formatDateOnly,
  formatDateTime,
  formatOptionalNumber,
  getAbTestingComparativeResults,
  getAbTestingComparisonScoreboard,
  getAbTestingComparisonSummary,
  getAbTestingComparisonTone,
  getAbTestingDashboardStatusDetail,
  getAbTestingDashboardUrl,
  getAbTestingDesignerNextStep,
  getAbTestingDisplayStatus,
  getAbTestingDisplayStatusLabel,
  getAbTestingInsightActionTarget,
  getAbTestingLaunchChecklistItems,
  getAbTestingStats,
  getAbTestingTrackedVercelEvents,
  getAbTestingVariantValidationError,
  getAbTestingVariantEngagement,
  getAbTestingVariantEventRows,
  getAbTestingVariantOptions,
  getAbTestingVariantPairLabel,
  getAbTestingVercelSource,
  getAnalyticsInterpretationTone,
  getStatusColor,
  GuidanceChecklist,
  InputField,
  labelFor,
  labelForAnalyticsProvider,
  marketingExperimentTitle,
  MARKETING_OPAQUE_CARD_BG,
  MarketingAiAssistPanel,
  normalizeMarketingExperimentPath,
  PanelHeading,
  PanelTitle,
  referenceFromId,
  isAbTestingSignalInMeasurementWindow,
  isUsableConnectedAnalyticsSource,
  Select,
  Stack,
  styles,
  useMarketingCompactLayout,
  type AbTestingComparisonResult,
  type AbTestingComparisonSummary,
  type AbTestingInsight,
  type AbTestingVariantEngagement,
  type MarketingAiSuggestion,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingExperiment,
  type MarketingPerformanceSignal,
  type MarketingViewId,
} from '../../tools/marketingTool'

type AbTestingPageMode = 'dashboard' | 'configuration'

interface AbTestingWorkspaceProps {
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenView: (view: MarketingViewId) => void
}

export function AbTestingWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
}: AbTestingWorkspaceProps) {
  const compactLayout = useMarketingCompactLayout()
  const [selectedId, setSelectedId] = useState<string | null>(data.experiments[0]?._id || null)
  const selectedExperiment = data.experiments.find((experiment) => experiment._id === selectedId) || data.experiments[0] || null
  const [draft, setDraft] = useState<MarketingExperiment | null>(selectedExperiment)
  const [activeEditorTab, setActiveEditorTab] = useState<AbTestingEditorTab>('setup')
  const [pageMode, setPageMode] = useState<AbTestingPageMode>('dashboard')
  const [saveError, setSaveError] = useState<string | null>(null)
  const stats = useMemo(() => getAbTestingStats(data), [data])
  const insights = useMemo(() => buildAbTestingInsights(data), [data])

  useEffect(() => {
    const nextSelected = selectedExperiment || data.experiments[0] || null
    setDraft(nextSelected)
    if (!selectedId && nextSelected?._id) setSelectedId(nextSelected._id)
  }, [data.experiments, selectedExperiment, selectedId])

  const createHomepageExperiment = async () => {
    const createdId = await createDocument({
      _type: 'marketingExperiment',
      title: 'Homepage 2026 concept test',
      status: 'idea',
      hypothesis: 'If the concept homepage frames GoInvo around enterprise software outcomes, then more qualified visitors will book discovery calls because the offer is clearer.',
      expectedSignal: 'Higher qualified discovery-call clicks without reducing work exploration.',
      targetType: 'homepage',
      targetPath: '/',
      flagKey: 'home-2026-variant',
      // The measurement window starts when the test is created, so every metric
      // compares variants over the same period from day one.
      measurementStart: new Date().toISOString(),
      variants: [
        { _key: randomKey(), _type: 'experimentVariant', key: 'control', label: 'Current homepage' },
        { _key: randomKey(), _type: 'experimentVariant', key: 'concept', label: '2026 concept homepage' },
      ],
      primaryMetric: 'Qualified discovery-call clicks',
      trackedMetrics: [
        { _key: randomKey(), _type: 'experimentMetric', key: 'qualified-discovery-call-clicks', label: 'Qualified discovery-call clicks', role: 'primary', comparison: 'comparative', source: 'vercelEvent', eventName: 'qualified_discovery_call_click', unit: 'events' },
        { _key: randomKey(), _type: 'experimentMetric', key: 'discovery-calls-booked', label: 'Discovery calls booked', role: 'primary', comparison: 'comparative', source: 'vercelEvent', eventName: 'discovery_call_booked', unit: 'events' },
        { _key: randomKey(), _type: 'experimentMetric', key: 'work-exploration-clicks', label: 'Work exploration clicks', role: 'guardrail', comparison: 'comparative', source: 'vercelEvent', eventName: 'view_work_click', unit: 'events' },
        { _key: randomKey(), _type: 'experimentMetric', key: 'top-navbar-clicks', label: 'Top navbar clicks', role: 'diagnostic', comparison: 'comparative', source: 'vercelEvent', eventName: 'nav_click', unit: 'events' },
        { _key: randomKey(), _type: 'experimentMetric', key: 'discovery-form-starts', label: 'Discovery form starts', role: 'diagnostic', comparison: 'conceptual', source: 'vercelEvent', eventName: 'discovery_form_start', unit: 'events' },
        { _key: randomKey(), _type: 'experimentMetric', key: 'chat-messages-sent', label: 'Chat messages sent', role: 'diagnostic', comparison: 'conceptual', source: 'vercelEvent', eventName: 'chat_message_sent', unit: 'events', notes: 'Organic chat-widget engagement (the bubble exists on both variants). Conceptual: visible in the readout, never blocks measurement or picks a winner.' },
      ],
      successTrackers: [
        {
          _key: randomKey(),
          _type: 'experimentSuccessTracker',
          title: 'Primary CTA lift',
          trackerType: 'metricRule',
          metricKeys: ['qualified-discovery-call-clicks'],
          condition: 'increase',
          successWhen: 'Concept beats control on qualified discovery-call clicks.',
        },
        {
          _key: randomKey(),
          _type: 'experimentSuccessTracker',
          title: 'Booked calls lift',
          trackerType: 'metricRule',
          metricKeys: ['discovery-calls-booked'],
          condition: 'increase',
          successWhen: 'Concept beats control on discovery calls actually booked, not just CTA clicks.',
        },
        {
          _key: randomKey(),
          _type: 'experimentSuccessTracker',
          title: 'Work exploration guardrail',
          trackerType: 'metricRule',
          metricKeys: ['work-exploration-clicks'],
          condition: 'notDecrease',
          successWhen: 'Work exploration clicks do not drop materially while CTA clicks improve.',
        },
      ],
      qaNotes: 'Verify control and concept render at desktop and mobile, then confirm experiment_exposure, qualified_discovery_call_click, discovery_call_booked, view_work_click, discovery_form_start, and chat_message_sent events include experiment_id, flag_key, variant, and page_path. Do not send raw visitor IDs.',
    })
    setSelectedId(createdId)
    setActiveEditorTab('setup')
    setPageMode('configuration')
  }

  const createResultSignal = async () => {
    if (!draft || !selectedExperiment) return
    if (abTestingTrackingFingerprint(draft) !== abTestingTrackingFingerprint(selectedExperiment)) {
      setSaveError('Save the tracking changes first so the result signal starts in the new measurement window.')
      return
    }
    const createdId = await createDocument({
      _type: 'marketingPerformanceSignal',
      title: `${marketingExperimentTitle(draft)} result readout`,
      provider: 'manual',
      status: 'new',
      signalType: 'abTestVariantReadout',
      experiment: referenceFromId(selectedExperiment._id),
      metricDate: new Date().toISOString().slice(0, 10),
    })
    const placeholder: MarketingPerformanceSignal = {
      _id: createdId,
      title: `${marketingExperimentTitle(draft)} result readout`,
      provider: 'manual',
      status: 'new',
      signalType: 'abTestVariantReadout',
      experiment: { _id: selectedExperiment._id, title: selectedExperiment.title },
      metricDate: new Date().toISOString().slice(0, 10),
    }
    setDraft({ ...draft, performanceSignals: uniqueById([...(draft.performanceSignals || []), placeholder]) })
  }

  const updateDraft = (field: keyof MarketingExperiment, value: unknown) => {
    if (!draft) return
    setDraft({ ...draft, [field]: value })
  }

  const updateAnalyticsSource = (sourceId: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      analyticsSource: data.analyticsSources.find((source) => source._id === sourceId),
    })
  }

  const updateSignalSelection = (signal: MarketingPerformanceSignal, checked: boolean) => {
    if (!draft) return
    const current = draft.performanceSignals || []
    const next = checked
      ? uniqueById([...current, signal])
      : current.filter((item) => item._id !== signal._id)
    setDraft({ ...draft, performanceSignals: next })
  }

  const updateVariantPreviewUrl = (variantKey: string, previewUrl: string) => {
    if (!draft) return
    setDraft({
      ...draft,
      variants: (draft.variants || []).map((variant) =>
        variant.key === variantKey ? { ...variant, previewUrl } : variant,
      ),
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    if (!draft) return
    const experimentSuggestion = suggestion.experiment || {}
    setDraft({
      ...draft,
      title: aiString(experimentSuggestion.title) || draft.title,
      status: aiOption(experimentSuggestion.status, experimentStatusOptions) || draft.status,
      hypothesis: aiString(experimentSuggestion.hypothesis) || draft.hypothesis,
      expectedSignal: aiString(experimentSuggestion.expectedSignal) || draft.expectedSignal,
      targetType: aiOption(experimentSuggestion.targetType, experimentTargetTypeOptions) || draft.targetType,
      targetPath: aiString(experimentSuggestion.targetPath) || draft.targetPath,
      flagKey: aiString(experimentSuggestion.flagKey) || draft.flagKey,
      variants: aiExperimentVariants(experimentSuggestion.variants) || draft.variants,
      primaryMetric: aiString(experimentSuggestion.primaryMetric) || draft.primaryMetric,
      trackedMetrics: aiExperimentTrackedMetrics(experimentSuggestion.trackedMetrics) || draft.trackedMetrics,
      successTrackers: aiExperimentSuccessTrackers(experimentSuggestion.successTrackers) || draft.successTrackers,
      qaNotes: aiString(experimentSuggestion.qaNotes) || draft.qaNotes,
      rolloutStart: aiString(experimentSuggestion.rolloutStart) || draft.rolloutStart,
      rolloutEnd: aiString(experimentSuggestion.rolloutEnd) || draft.rolloutEnd,
      vercelDashboardUrl: aiString(experimentSuggestion.vercelDashboardUrl) || draft.vercelDashboardUrl,
      result: aiString(experimentSuggestion.result) || draft.result,
      decision: aiOption(experimentSuggestion.decision, experimentDecisionOptions) || draft.decision,
      notes: aiString(experimentSuggestion.notes) || draft.notes,
    })
  }

  const save = async () => {
    if (!draft || !selectedExperiment) return
    const variantError = getAbTestingVariantValidationError(draft)
    if (variantError) {
      setSaveError(variantError)
      setActiveEditorTab('setup')
      return
    }
    setSaveError(null)
    const trackingChanged = abTestingTrackingFingerprint(draft) !== abTestingTrackingFingerprint(selectedExperiment)
    const signalIds = trackingChanged ? [] : experimentSignalIds(draft)
    const measurementStart = trackingChanged
      ? new Date().toISOString()
      : draft.measurementStart || new Date().toISOString()
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled experiment',
      status: draft.status || 'idea',
      hypothesis: draft.hypothesis,
      expectedSignal: draft.expectedSignal,
      targetType: draft.targetType,
      targetPath: draft.targetPath,
      flagKey: draft.flagKey,
      measurementStart,
      variants: experimentVariantsFromDraft(draft as unknown as Record<string, unknown>),
      primaryMetric: draft.primaryMetric,
      trackedMetrics: experimentTrackedMetricsFromDraft(draft as unknown as Record<string, unknown>),
      successTrackers: experimentSuccessTrackersFromDraft(draft as unknown as Record<string, unknown>),
      analyticsSource: draft.analyticsSource?._id ? referenceFromId(draft.analyticsSource._id) : undefined,
      qaNotes: draft.qaNotes,
      rolloutStart: dateInputToIso(toDateInputValue(draft.rolloutStart)),
      rolloutEnd: dateInputToIso(toDateInputValue(draft.rolloutEnd)),
      vercelDashboardUrl: draft.vercelDashboardUrl,
      performanceSignals: signalIds.length > 0 ? refsFromIds(signalIds) : undefined,
      result: draft.result,
      decision: draft.decision,
      decisionDate: toDateInputValue(draft.decisionDate),
      notes: draft.notes,
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    try {
      await commitPatch(selectedExperiment._id, set, unset)
      setDraft({ ...draft, measurementStart, performanceSignals: trackingChanged ? [] : draft.performanceSignals })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this experiment.')
    }
  }

  const scrollToAbTestingSection = (id: string) => {
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openAbTestingEditorTab = (tab: AbTestingEditorTab, sectionId = 'ab-test-configuration') => {
    setPageMode('configuration')
    setActiveEditorTab(tab)
    if (typeof window === 'undefined') return
    window.setTimeout(() => scrollToAbTestingSection(sectionId), 0)
  }

  const openSelectedNextStep = () => {
    if (selectedNextStep.targetId === 'ab-test-create') void createHomepageExperiment()
    else if (selectedNextStep.targetId === 'analytics') openAbTestingEditorTab('results', 'ab-test-decision-review')
    else if (selectedNextStep.targetId === 'ab-test-launch-checklist') openAbTestingEditorTab('launch', selectedNextStep.targetId)
    else if (selectedNextStep.targetId === 'ab-test-decision-review' || selectedNextStep.targetId === 'ab-test-results-evidence') openAbTestingEditorTab('results', selectedNextStep.targetId)
    else openAbTestingEditorTab('setup', selectedNextStep.targetId)
  }

  const selectedSignalIds = draft ? experimentSignalIds(draft) : []
  const selectedSignals = selectedSignalIds
    .map((id) => data.performanceSignals.find((signal) => signal._id === id) || draft?.performanceSignals?.find((signal) => signal._id === id))
    .filter(Boolean) as MarketingPerformanceSignal[]
  const selectedNextStep = getAbTestingDesignerNextStep(draft)
  const hasPendingTrackingChange = Boolean(
    draft && selectedExperiment && abTestingTrackingFingerprint(draft) !== abTestingTrackingFingerprint(selectedExperiment),
  )
  const usableAnalyticsSources = data.analyticsSources.filter(isUsableConnectedAnalyticsSource)
  const matchingSignals = draft
    ? data.performanceSignals.filter((signal) => isAbTestingSignalInMeasurementWindow(draft, signal))
    : []
  const selectedExperimentTitle = selectedExperiment ? marketingExperimentTitle(selectedExperiment) : ''
  const selectedInsights = selectedExperiment
    ? insights.filter((insight) => insight.experimentId === selectedExperiment._id || insight.affected.includes(selectedExperimentTitle))
    : insights
  const primarySelectedInsight = selectedInsights.find((insight) => insight.severity !== 'healthy') || selectedInsights[0] || null
  const primarySelectedInsightAction = primarySelectedInsight ? getAbTestingInsightActionTarget(primarySelectedInsight) : null
  const selectedLaunchItems = draft ? getAbTestingLaunchChecklistItems(draft, selectedSignalIds.length) : []
  const selectedLaunchReady = selectedLaunchItems.filter((item) => item.done).length
  const selectedLaunchPercent = selectedLaunchItems.length > 0 ? Math.round((selectedLaunchReady / selectedLaunchItems.length) * 100) : 0
  const selectedComparisons = draft ? getAbTestingComparativeResults(draft, 5) : []
  const selectedResultSummary = draft ? getAbTestingComparisonSummary(draft, selectedComparisons) : null
  // The main dashboard list hides both archived and 'idea' (draft) tests so the
  // initial view only shows tests that are at least scheduled/launched. A newly
  // created test starts as 'idea' and is reached through the create flow, which
  // selects it and opens its editor directly (pageMode 'configuration') rather
  // than relying on this list — so hidden idea tests are never lost.
  const listedExperiments = data.experiments.filter(
    (experiment) => experiment.status !== 'archived' && experiment.status !== 'idea',
  )
  const hasAnyTests = listedExperiments.length > 0
  const workspaceGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: compactLayout ? 12 : 16, alignItems: 'start' }
  const setupGridStyle: CSSProperties = compactLayout
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14, alignItems: 'start' }
    : { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 320px)', gap: 20, alignItems: 'start' }
  const abTestCardGridStyle: CSSProperties = compactLayout
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }
    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 460px))', gap: 8, justifyContent: 'start', alignItems: 'stretch' }
  const twoColumnFormStyle: CSSProperties = compactLayout
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 10 }
    : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }
  const decisionGridStyle: CSSProperties = compactLayout
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }
    : { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }

  if (pageMode === 'configuration' && draft && selectedExperiment) {
    return (
      <div style={workspaceGridStyle}>
        <section id="ab-test-configuration" style={{ ...styles.panel, display: 'grid', gap: 18, scrollMarginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ ...styles.kicker, marginBottom: 6 }}>A/B test setup</div>
              <PanelTitle title={marketingExperimentTitle(selectedExperiment)} type="marketingExperiment" id={selectedExperiment._id} />
              <p style={{ ...styles.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
                Edit the page path, variants, analytics source, QA links, evidence, and decision trail here.
              </p>
            </div>
            <button type="button" style={styles.button} onClick={() => setPageMode('dashboard')}>
              Back to A/B tests
            </button>
          </div>
          <div
            role="tablist"
            aria-label="A/B test editor sections"
            style={{
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              borderBottom: '1px solid var(--card-border-color)',
            }}
          >
            <AbTestingEditorTabButton active={activeEditorTab === 'setup'} title="Setup" detail="Bet, page, versions, metrics" onClick={() => setActiveEditorTab('setup')} />
            <AbTestingEditorTabButton active={activeEditorTab === 'launch'} title="Launch" detail="Checklist, source, rollout" onClick={() => setActiveEditorTab('launch')} />
            <AbTestingEditorTabButton active={activeEditorTab === 'results'} title="Results" detail="Evidence, readout, decision" onClick={() => setActiveEditorTab('results')} />
          </div>

          {activeEditorTab === 'setup' && (
            <div style={{ maxWidth: compactLayout ? undefined : 820 }}>
              <Stack gap={12}>
                {primarySelectedInsight && (
                  <div id="ab-test-suggested-improvements" style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)', padding: '10px 0', display: 'grid', gap: 6 }}>
                    <div style={{ ...styles.kicker }}>Suggested improvements</div>
                    <strong style={{ display: 'block', fontSize: 16 }}>{primarySelectedInsight.title}</strong>
                    <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.45 }}>{primarySelectedInsight.interpretation}</p>
                    <p style={{ margin: 0, lineHeight: 1.45 }}>
                      <strong>Do next: </strong>
                      {primarySelectedInsight.action}
                    </p>
                    {primarySelectedInsightAction && (
                      <button type="button" style={{ ...styles.button, justifySelf: 'start' }} onClick={() => openAbTestingEditorTab(primarySelectedInsightAction.tab, primarySelectedInsightAction.sectionId)}>
                        {primarySelectedInsightAction.label}
                      </button>
                    )}
                  </div>
                )}
                <MarketingAiAssistPanel
                  kind="experiment"
                  draft={draft as unknown as Record<string, unknown>}
                  analyticsTakeaways={buildAnalyticsInterpretations(data)}
                  onApply={applyAiSuggestion}
                />
                <InputField label="Experiment name">
                  <input style={styles.input} value={draft.title || ''} onChange={(event) => updateDraft('title', event.currentTarget.value)} />
                </InputField>
                <div style={twoColumnFormStyle}>
                  <InputField label="Status">
                    <Select value={draft.status || 'idea'} options={experimentStatusOptions} onChange={(status) => updateDraft('status', status)} />
                  </InputField>
                  <InputField label="Target type">
                    <Select value={draft.targetType || 'page'} options={experimentTargetTypeOptions} onChange={(targetType) => updateDraft('targetType', targetType)} />
                  </InputField>
                </div>
                <InputField label="Design bet" help="Example: If the concept homepage leads with enterprise outcomes, qualified CTA clicks should increase because the offer is clearer.">
                  <textarea rows={4} style={styles.input} value={draft.hypothesis || ''} onChange={(event) => updateDraft('hypothesis', event.currentTarget.value)} />
                </InputField>
                <InputField label="Expected result">
                  <input style={styles.input} value={draft.expectedSignal || ''} onChange={(event) => updateDraft('expectedSignal', event.currentTarget.value)} />
                </InputField>
                <div style={twoColumnFormStyle}>
                  <InputField label="Public page path">
                    <input style={styles.input} value={draft.targetPath || ''} onChange={(event) => updateDraft('targetPath', event.currentTarget.value)} />
                  </InputField>
                  <InputField label="Traffic split key" help="Engineering/Vercel uses this key to assign visitors. Designers usually only need to confirm it matches the test.">
                    <input style={styles.input} value={draft.flagKey || ''} onChange={(event) => updateDraft('flagKey', event.currentTarget.value)} />
                  </InputField>
                </div>
                <InputField label="Page versions" help="Exactly two lines: one control and one treatment. Format: key | label | notes | custom preview link.">
                  <textarea
                    rows={4}
                    style={styles.input}
                    value={experimentVariantText(draft.variants)}
                    onChange={(event) => updateDraft('variants', experimentVariantsFromDraft({ variantsText: event.currentTarget.value }))}
                  />
                </InputField>
                <InputField label="Primary success metric">
                  <input style={styles.input} value={draft.primaryMetric || ''} onChange={(event) => updateDraft('primaryMetric', event.currentTarget.value)} />
                </InputField>
                <InputField label="Tracked metrics" help="List what the test watches. Format: key | label | event name | unit | role | notes. Use primary, guardrail, or diagnostic.">
                  <textarea
                    rows={5}
                    style={styles.input}
                    value={experimentTrackedMetricText(draft.trackedMetrics)}
                    onChange={(event) => updateDraft('trackedMetrics', experimentTrackedMetricsFromDraft({ trackedMetricsText: event.currentTarget.value }))}
                  />
                </InputField>
                <InputField label="Success rules" help="Say which metric has to move and what counts as success. Format: title | metric keys | condition | threshold | success rule.">
                  <textarea
                    rows={5}
                    style={styles.input}
                    value={experimentSuccessTrackerText(draft.successTrackers)}
                    onChange={(event) => updateDraft('successTrackers', experimentSuccessTrackersFromDraft({ successTrackersText: event.currentTarget.value }))}
                  />
                </InputField>
                <InputField label="QA notes">
                  <textarea rows={4} style={styles.input} value={draft.qaNotes || ''} onChange={(event) => updateDraft('qaNotes', event.currentTarget.value)} />
                </InputField>
              </Stack>
            </div>
          )}

          {activeEditorTab === 'launch' && (
            <div id="ab-test-launch-checklist" style={{ ...setupGridStyle, scrollMarginTop: 18 }}>
              <GuidanceChecklist
                title="Launch readiness"
                items={[
                  { label: 'Public page chosen', done: Boolean(draft.targetPath?.trim()) },
                  { label: 'Traffic split key set', done: Boolean(draft.flagKey?.trim()) },
                  { label: 'Exactly two versions (control + treatment)', done: experimentHasControlVariant(draft) },
                  { label: 'Primary success metric named', done: Boolean(draft.primaryMetric?.trim()) },
                  { label: 'Tracked metrics listed', done: experimentHasTrackedMetric(draft) },
                  { label: 'Success rule set', done: experimentHasSuccessTracker(draft) },
                  { label: 'Connected results source linked', done: Boolean(draft.analyticsSource && isUsableConnectedAnalyticsSource(draft.analyticsSource)) },
                  { label: 'Decision evidence linked', done: selectedSignalIds.length > 0 },
                ]}
              />
              <Stack gap={12}>
                <AbTestingVercelReadout experiment={draft} onOpenSignals={() => setActiveEditorTab('results')} />
                <InputField label="Where results will be reviewed">
                  <Select
                    value={draft.analyticsSource?._id || ''}
                    options={[
                      { title: 'No analytics source', value: '' },
                      ...usableAnalyticsSources.map((source) => ({
                        title: `${source.title || labelFor(analyticsProviderOptions, source.provider)} (${labelFor(analyticsProviderOptions, source.provider)})`,
                        value: source._id,
                      })),
                    ]}
                    onChange={updateAnalyticsSource}
                  />
                </InputField>
                <InputField label="Rollout start">
                  <input type="date" style={styles.input} value={toDateInputValue(draft.rolloutStart)} onChange={(event) => updateDraft('rolloutStart', event.currentTarget.value)} />
                </InputField>
                <InputField label="Rollout end">
                  <input type="date" style={styles.input} value={toDateInputValue(draft.rolloutEnd)} onChange={(event) => updateDraft('rolloutEnd', event.currentTarget.value)} />
                </InputField>
                <InputField label="Results dashboard link">
                  <input style={styles.input} value={draft.vercelDashboardUrl || ''} onChange={(event) => updateDraft('vercelDashboardUrl', event.currentTarget.value)} />
                </InputField>
                {getAbTestingDashboardUrl(draft) && (
                  <a href={getAbTestingDashboardUrl(draft)} target="_blank" rel="noreferrer" style={{ ...styles.button, width: '100%' }}>
                    <LaunchIcon style={{ width: 15, height: 15 }} />
                    Open Vercel results dashboard
                  </a>
                )}
                <AbTestingVariantSummary experiment={draft} />
                <ExperimentPreviewLinks experiment={draft} onPreviewUrlChange={updateVariantPreviewUrl} />
              </Stack>
            </div>
          )}

          {activeEditorTab === 'results' && (
            <div id="ab-test-decision-review" style={{ ...decisionGridStyle, scrollMarginTop: 18 }}>
              <Stack gap={12}>
                <h3 style={{ margin: 0, fontSize: 18 }}>Result and decision</h3>
                <AbTestingVariantEventTable experiment={draft} />
                <AbTestingComparisonRows results={getAbTestingComparativeResults(draft, 5)} />
                <InputField label="Result summary">
                  <textarea rows={4} style={styles.input} value={draft.result || ''} onChange={(event) => updateDraft('result', event.currentTarget.value)} />
                </InputField>
                <div style={twoColumnFormStyle}>
                  <InputField label="Decision">
                    <Select value={draft.decision || ''} options={[{ title: 'No decision yet', value: '' }, ...experimentDecisionOptions]} onChange={(decision) => updateDraft('decision', decision)} />
                  </InputField>
                  <InputField label="Decision date">
                    <input type="date" style={styles.input} value={toDateInputValue(draft.decisionDate)} onChange={(event) => updateDraft('decisionDate', event.currentTarget.value)} />
                  </InputField>
                </div>
                <InputField label="Decision notes">
                  <textarea rows={4} style={styles.input} value={draft.notes || ''} onChange={(event) => updateDraft('notes', event.currentTarget.value)} />
                </InputField>
              </Stack>

              <div id="ab-test-results-evidence" style={{ scrollMarginTop: 18 }}>
              <Stack gap={12}>
                <h3 style={{ margin: 0, fontSize: 18 }}>Results evidence</h3>
                <button type="button" style={{ ...styles.button, justifySelf: 'start' }} disabled={savingId === 'new' || hasPendingTrackingChange} onClick={() => void createResultSignal()}>
                  Add result signal for this test
                </button>
                {hasPendingTrackingChange && (
                  <p style={{ ...styles.small, ...styles.muted, margin: 0 }}>Save the tracking changes before adding evidence; saving starts a new measurement window.</p>
                )}
                {matchingSignals.length === 0 ? (
                  <EmptyInline title="No in-window result signals reference this experiment yet. Add one here or assign this experiment on an existing A/B readout." />
                ) : (
                  <div style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)', maxHeight: 280, overflow: 'auto' }}>
                    {matchingSignals.map((signal, index) => {
                      const checked = selectedSignalIds.includes(signal._id)
                      return (
                        <label
                          key={signal._id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto minmax(0, 1fr)',
                            gap: 10,
                            alignItems: 'start',
                            cursor: 'pointer',
                            padding: '10px 0',
                            borderBottom: index === matchingSignals.length - 1 ? 'none' : '1px solid var(--card-border-color)',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => updateSignalSelection(signal, event.currentTarget.checked)}
                          />
                          <span>
                            <strong style={{ display: 'block', fontSize: 13 }}>{signal.title || 'Untitled signal'}</strong>
                            <span style={{ ...styles.small, ...styles.muted }}>
                              {[labelFor(analyticsProviderOptions, signal.provider), signal.signalType, formatDateOnly(signal.metricDate)].filter(Boolean).join(' / ')}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <AbTestingSignalSummary signals={selectedSignals} />
              </Stack>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            <AdvancedFieldsDropdown type="marketingExperiment" id={selectedExperiment._id} />
            {saveError && <div role="alert" style={{ ...styles.small, color: '#d98a8a' }}>{saveError}</div>}
            <button type="button" style={styles.primaryButton} disabled={savingId === selectedExperiment._id} onClick={() => void save()}>
              {savingId === selectedExperiment._id ? 'Saving...' : 'Save experiment'}
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div style={workspaceGridStyle}>
      <section style={{ display: 'grid', gap: 16 }}>
        <section style={{ ...styles.panel, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <PanelHeading
              title="A/B tests"
              description="Compact readouts for live page tests. Click one to review the result, then open setup only when something needs editing."
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                style={{ ...styles.primaryButton, minHeight: 34, padding: '8px 10px' }}
                disabled={savingId === 'new'}
                onClick={() => void createHomepageExperiment()}
              >
                {savingId === 'new' ? 'Creating…' : 'Add A/B test'}
              </button>
            </div>
          </div>

          {listedExperiments.length > 1 && (
            <div data-mobile-scroll="true" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              <AbTestingSummaryChip label="Tests" value={`${stats.pageTests}`} detail={`${stats.active} active`} />
              <AbTestingSummaryChip label="Running" value={`${stats.running}`} detail="collecting data" />
              <AbTestingSummaryChip label="Blocked" value={`${stats.blocked}`} detail="measurement gaps" />
              <AbTestingSummaryChip label="Setup" value={`${stats.ready}/${stats.pageTests}`} detail="fields complete" />
              <AbTestingSummaryChip label="Results" value={`${stats.withSignals}/${stats.pageTests}`} detail="results connected" />
            </div>
          )}

          {hasAnyTests ? (
            <div data-mobile-stack="true" style={abTestCardGridStyle}>
              {listedExperiments.map((experiment) => (
                <AbTestingDashboardCard
                  key={experiment._id}
                  experiment={experiment}
                  selected={experiment._id === selectedExperiment?._id}
                  onSelect={() => {
                    setSelectedId(experiment._id)
                    setPageMode('dashboard')
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)', padding: '18px 0', display: 'grid', gap: 8 }}>
              <strong>No A/B tests yet</strong>
              <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
                Start from the two-version homepage template, then change the page, hypothesis, treatment, and success metric in Setup.
              </p>
              <button type="button" style={{ ...styles.primaryButton, justifySelf: 'start' }} disabled={savingId === 'new'} onClick={() => void createHomepageExperiment()}>
                {savingId === 'new' ? 'Creating…' : 'Create first A/B test'}
              </button>
            </div>
          )}
        </section>

        {draft && selectedExperiment ? (
          <section id="ab-test-dashboard-detail" style={{ ...styles.panel, display: 'grid', gap: 12, scrollMarginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ maxWidth: 760 }}>
                <div style={{ ...styles.kicker, marginBottom: 6 }}>Selected test</div>
                <h2 style={{ margin: 0, fontSize: 21 }}>How this test is going</h2>
                <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>
                  {marketingExperimentTitle(selectedExperiment)} on {normalizeMarketingExperimentPath(selectedExperiment.targetPath) || 'an unassigned page'}.
                  {draft.measurementStart
                    ? ` Measurement window starts ${formatDateOnly(draft.measurementStart)}. Changing the page, flag, versions, or tracked events starts a new window and unlinks older evidence.`
                    : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button type="button" style={selectedNextStep.primary ? styles.primaryButton : styles.button} disabled={selectedNextStep.targetId === 'ab-test-create' && savingId === 'new'} onClick={openSelectedNextStep}>
                  {selectedNextStep.actionLabel}
                </button>
                <button
                  type="button"
                  style={styles.button}
                  onClick={() => openAbTestingEditorTab('setup')}
                >
                  Open setup
                </button>
              </div>
            </div>

            <AbTestingVerdictBanner
              experiment={draft}
              summary={selectedResultSummary}
              comparisons={selectedComparisons}
              launchReady={selectedLaunchReady}
              launchTotal={selectedLaunchItems.length}
              launchPercent={selectedLaunchPercent}
            />

            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0, borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)' }}>
              <AbTestingSummaryCell label="State" value={getAbTestingDisplayStatusLabel(draft)} detail={getAbTestingDashboardStatusDetail(draft)} />
              <AbTestingSummaryCell label="Launch readiness" value={`${selectedLaunchReady}/${selectedLaunchItems.length}`} detail={`${selectedLaunchPercent}% complete`} />
              <AbTestingSummaryCell label="Current direction" value={selectedResultSummary?.label || 'No direction yet'} detail={draft.decision ? `Decision: ${labelFor(experimentDecisionOptions, draft.decision)}` : 'Directional read only; no statistical-significance calculation'} last />
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gap: 10 }}>
                <AbTestingLeaderSummary experiment={draft} results={selectedComparisons} summary={selectedResultSummary} />
                <AbTestingVariantEventTable experiment={draft} />
                <AbTestingComparisonRows results={selectedComparisons} />
                <div style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
                  <div style={{ ...styles.kicker, marginBottom: 6 }}>Suggested improvements</div>
                  <strong style={{ display: 'block', fontSize: 18 }}>{primarySelectedInsight?.title || 'No blockers on this test'}</strong>
                  <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
                    {primarySelectedInsight?.interpretation || 'The selected test has no flagged setup or result issues. Keep checking the linked dashboard on the review cadence.'}
                  </p>
                  {primarySelectedInsightAction && (
                    <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => openAbTestingEditorTab(primarySelectedInsightAction.tab, primarySelectedInsightAction.sectionId)}>
                      {primarySelectedInsightAction.label}
                    </button>
                  )}
                </div>

                {selectedInsights.length > 1 && (
                  <div style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)' }}>
                    {selectedInsights.slice(0, 4).map((insight, index) => (
                      <AbTestingInsightRow key={insight.id} insight={insight} last={index === Math.min(selectedInsights.length, 4) - 1} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </div>
  )
}
function AbTestingSummaryCell({
  label,
  value,
  detail,
  last = false,
}: {
  label: string
  value: string
  detail: string
  last?: boolean
}) {
  return (
    <div
      data-ab-summary-cell="true"
      data-last={last ? 'true' : undefined}
      style={{
        padding: '9px 12px',
        borderRight: last ? 'none' : '1px solid var(--card-border-color)',
        minWidth: 0,
      }}
    >
      <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>{value}</div>
      <div style={{ ...styles.small, ...styles.muted, marginTop: 2 }}>{detail}</div>
    </div>
  )
}

function AbTestingSummaryChip({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 7,
        minWidth: 0,
        border: '1px solid var(--card-border-color)',
        borderRadius: 999,
        padding: '5px 9px',
        background: MARKETING_OPAQUE_CARD_BG,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ ...styles.small, ...styles.muted, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <strong style={{ fontSize: 14 }}>{value}</strong>
      <span style={{ ...styles.small, ...styles.muted }}>{detail}</span>
    </div>
  )
}

function AbTestingDashboardCard({
  experiment,
  selected,
  onSelect,
}: {
  experiment: MarketingExperiment
  selected: boolean
  onSelect: () => void
}) {
  const displayStatus = getAbTestingDisplayStatus(experiment)
  const tone = getStatusColor(displayStatus)
  const launchItems = getAbTestingLaunchChecklistItems(experiment)
  const launchReady = launchItems.filter((item) => item.done).length
  const statusLabel = getAbTestingDisplayStatusLabel(experiment)
  const comparisons = getAbTestingComparativeResults(experiment, 3)
  const resultSummary = getAbTestingComparisonSummary(experiment, comparisons)
  const variantPairLabel = getAbTestingVariantPairLabel(experiment)

  return (
    <button
      type="button"
      data-ab-dashboard-card="true"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        ...styles.card,
        appearance: 'none',
        color: 'var(--card-fg-color)',
        cursor: 'pointer',
        display: 'grid',
        gap: 8,
        padding: 10,
        textAlign: 'left',
        boxShadow: selected ? '0 0 0 1px rgba(77, 196, 214, 0.7)' : 'none',
        borderColor: selected ? '#4dc4d6' : 'var(--card-border-color)',
        background: selected ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ ...styles.kicker, display: 'block', marginBottom: 3 }}>{experimentListMeta(experiment)}</span>
          <strong style={{ display: 'block', fontSize: 14, lineHeight: 1.22 }}>{marketingExperimentTitle(experiment)}</strong>
          <span style={{ ...styles.small, ...styles.muted, display: 'block', marginTop: 3 }}>
            {variantPairLabel}
          </span>
        </span>
        <span
          style={{
            ...styles.small,
            border: `1px solid ${tone.border}`,
            background: tone.bg,
            color: tone.fg,
            borderRadius: 999,
            padding: '3px 8px',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'end', borderTop: '1px solid var(--card-border-color)', paddingTop: 8 }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ ...styles.small, ...styles.muted, display: 'block' }}>Current direction</span>
          <strong style={{ display: 'block', fontSize: 15, lineHeight: 1.2 }}>{resultSummary.label}</strong>
        </span>
        <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ ...styles.small, border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>
            Ready {launchReady}/{launchItems.length}
          </span>
          <span style={{ ...styles.small, border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>
            {comparisons.length} metric{comparisons.length === 1 ? '' : 's'}
          </span>
        </span>
      </div>

    </button>
  )
}
function AbTestingInsightRow({ insight, last = false }: { insight: AbTestingInsight; last?: boolean }) {
  const tone = getAnalyticsInterpretationTone(insight.severity)

  return (
    <div style={{ padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--card-border-color)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...styles.small, color: tone.fg, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>{tone.label}</span>
        <strong style={{ fontSize: 13 }}>{insight.title}</strong>
      </div>
      <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>{insight.action}</p>
    </div>
  )
}

function AbTestingVerdictBanner({
  experiment,
  summary,
  comparisons,
  launchReady,
  launchTotal,
  launchPercent,
}: {
  experiment: MarketingExperiment
  summary: AbTestingComparisonSummary | null
  comparisons: AbTestingComparisonResult[]
  launchReady: number
  launchTotal: number
  launchPercent: number
}) {
  const scoreboard = getAbTestingComparisonScoreboard(experiment, comparisons)
  const leader = summary || getAbTestingComparisonSummary(experiment, comparisons)
  const setupIncomplete = launchTotal > 0 && launchReady < launchTotal
  const noVerdict = scoreboard.total === 0 || scoreboard.pendingCount >= scoreboard.total
  const hasClearLeader = leader.status === 'control' || leader.status === 'variant'
  const leaderWins = leader.status === 'control' ? scoreboard.controlWins : scoreboard.variantWins
  const decisionLabel = experiment.decision ? labelFor(experimentDecisionOptions, experiment.decision) : ''
  const decided = Boolean(experiment.decision)
  // Winning every compared metric AND fully launched = a confident call.
  const winsAllMetrics = hasClearLeader && scoreboard.total > 0 && leaderWins >= scoreboard.total
  const callable = winsAllMetrics && launchPercent >= 100

  // Tone tracks the verdict branch so colors stay consistent with the rest of
  // the suite: amber when setup is incomplete (control tone), neutral while
  // collecting/even (needsComparison tone), leader tone once a page is ahead.
  let tone = getAbTestingComparisonTone('needsComparison')
  if (setupIncomplete) tone = getAbTestingComparisonTone('control')
  else if (decided) tone = getAbTestingComparisonTone('variant')
  else if (!noVerdict && hasClearLeader) tone = getAbTestingComparisonTone(leader.status)

  let headline: string
  let recommendation: string
  if (setupIncomplete) {
    headline = "Setup isn't finished yet"
    recommendation = 'Finish the launch checklist before trusting the result.'
  } else if (noVerdict) {
    headline = 'Collecting data — no verdict yet'
    recommendation = 'Keep it running and check back as visits accumulate — not enough signal to call yet.'
  } else if (hasClearLeader) {
    headline = `${leader.status === 'control' ? scoreboard.controlLabel : scoreboard.variantLabel} is ahead — winning ${leaderWins} of ${scoreboard.total} metrics`
    recommendation = callable
      ? 'Looks callable — review the evidence and record the decision.'
      : "It's leading but not conclusive — keep running for a confident call."
  } else {
    headline = `No clear winner yet — ${scoreboard.controlWins}–${scoreboard.variantWins} across ${scoreboard.total} metrics`
    recommendation = 'Keep it running and check back as visits accumulate — not enough signal to call yet.'
  }

  // A recorded decision overrides the live readout — the test is settled.
  if (decided) {
    headline = `Decision recorded: ${decisionLabel}`
    recommendation = 'Roll out the winning page and archive the test.'
  }

  return (
    <div
      data-ab-verdict-banner="true"
      style={{
        borderRadius: 8,
        border: `1px solid ${tone.border}`,
        borderLeft: `4px solid ${tone.fg}`,
        background: tone.bg,
        padding: '12px 14px',
        display: 'grid',
        gap: 7,
      }}
    >
      <span
        style={{
          ...styles.small,
          justifySelf: 'start',
          border: `1px solid ${tone.border}`,
          color: tone.fg,
          borderRadius: 999,
          padding: '3px 9px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        {getAbTestingDisplayStatusLabel(experiment)}
      </span>
      <strong style={{ fontSize: 18, lineHeight: 1.2 }}>{headline}</strong>
      <p style={{ ...styles.small, margin: 0, lineHeight: 1.5 }}>
        <span style={{ fontWeight: 800 }}>Next:</span> {recommendation}
      </p>
    </div>
  )
}

function AbTestingLeaderSummary({
  experiment,
  results,
  summary,
}: {
  experiment: MarketingExperiment
  results: AbTestingComparisonResult[]
  summary: AbTestingComparisonSummary | null
}) {
  const scoreboard = getAbTestingComparisonScoreboard(experiment, results)
  const leader = summary || getAbTestingComparisonSummary(experiment, results)
  const leaderTone = getAbTestingComparisonTone(leader.status)
  const hasComparedMetrics = scoreboard.total > 0 && scoreboard.pendingCount < scoreboard.total

  return (
    <div
      style={{
        borderTop: '1px solid var(--card-border-color)',
        borderBottom: '1px solid var(--card-border-color)',
        padding: '10px 0',
        display: 'grid',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, maxWidth: 720 }}>
          <div style={{ ...styles.kicker, marginBottom: 4 }}>Which page is performing better?</div>
          <strong style={{ display: 'block', fontSize: 20, lineHeight: 1.15 }}>
            {leader.status === 'needsComparison'
              ? 'No winner yet'
              : leader.status === 'even'
                ? 'No clear winner yet'
                : leader.label}
          </strong>
        </div>
        <span
          style={{
            ...styles.small,
            alignSelf: 'flex-start',
            border: `1px solid ${leaderTone.border}`,
            background: leaderTone.bg,
            color: leaderTone.fg,
            borderRadius: 999,
            padding: '5px 10px',
            fontWeight: 900,
            whiteSpace: 'nowrap',
          }}
        >
          {hasComparedMetrics ? 'Compared metrics' : 'Waiting for comparison'}
        </span>
      </div>

      <div
        data-mobile-stack="true"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          borderTop: '1px solid var(--card-border-color)',
          borderBottom: '1px solid var(--card-border-color)',
        }}
      >
        <AbTestingLeaderScoreCell
          label={scoreboard.controlLabel}
          detail="Current page"
          wins={scoreboard.controlWins}
          total={scoreboard.total}
          active={leader.status === 'control'}
        />
        <AbTestingLeaderScoreCell
          label={scoreboard.variantLabel}
          detail="Test page"
          wins={scoreboard.variantWins}
          total={scoreboard.total}
          active={leader.status === 'variant'}
          last
        />
      </div>

    </div>
  )
}

function AbTestingLeaderScoreCell({
  label,
  detail,
  wins,
  total,
  active,
  last = false,
}: {
  label: string
  detail: string
  wins: number
  total: number
  active: boolean
  last?: boolean
}) {
  return (
    <div
      data-ab-summary-cell="true"
      data-last={last ? 'true' : undefined}
      style={{
        padding: '9px 12px',
        borderRight: last ? 'none' : '1px solid var(--card-border-color)',
        background: active ? 'rgba(0, 115, 133, 0.12)' : 'transparent',
        minWidth: 0,
      }}
    >
      <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {detail}
      </div>
      <strong style={{ display: 'block', marginTop: 3, fontSize: 15, lineHeight: 1.25 }}>{label}</strong>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginTop: 5 }}>
        <span style={{ ...styles.small, ...styles.muted }}>Metric wins</span>
        <strong style={{ fontSize: 17 }}>{wins}/{total || 0}</strong>
      </div>
    </div>
  )
}

function AbTestingComparisonRows({
  results,
  compact = false,
}: {
  results: AbTestingComparisonResult[]
  compact?: boolean
}) {
  if (results.length === 0) {
    if (compact) return null
    return (
      <div style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Result comparison</h3>
        <p style={{ ...styles.small, ...styles.muted, margin: '5px 0 0', lineHeight: 1.45 }}>
          Add tracked metrics to compare the page versions for qualified discoveries, work exploration, and other success signals.
        </p>
      </div>
    )
  }

  const visibleResults = compact ? results.slice(0, 3) : results

  return (
    <div style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: compact ? 9 : 12, display: 'grid', gap: compact ? 7 : 10 }}>
      {!compact && (
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Result comparison</h3>
          <p style={{ ...styles.small, ...styles.muted, margin: '5px 0 0', lineHeight: 1.45 }}>
            Shows which page version is leading once linked signals include variant-level counts and comparison values.
          </p>
        </div>
      )}
      <div style={{ display: 'grid', gap: compact ? 6 : 8 }}>
        {visibleResults.map((result, index) => {
          const tone = getAbTestingComparisonTone(result.status)
          return (
            <div
              key={result.key}
              style={{
                display: 'grid',
                gap: compact ? 3 : 5,
                padding: compact ? '6px 0' : '8px 0',
                borderBottom: index === visibleResults.length - 1 ? 'none' : '1px solid var(--card-border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: compact ? 12 : 13, lineHeight: 1.25 }}>{result.metricLabel}</strong>
                  {!compact && result.metricRole && <span style={{ ...styles.small, ...styles.muted }}>{result.metricRole}</span>}
                </span>
                <span
                  style={{
                    ...styles.small,
                    color: tone.fg,
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    borderRadius: 999,
                    padding: '3px 8px',
                    fontWeight: 900,
                  }}
                >
                  {result.winnerLabel}
                </span>
              </div>
              <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.4 }}>{result.detail}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AbTestingVariantEventTable({ experiment }: { experiment: MarketingExperiment }) {
  const rows = getAbTestingVariantEventRows(experiment)
  const variants = getAbTestingVariantOptions(experiment)
  const gridTemplateColumns = `minmax(190px, 1.1fr) repeat(${variants.length}, minmax(150px, 1fr))`

  // Per-variant SESSION engagement (bounce rate, avg time on page) read off the
  // linked signals. This is now FIRST-PARTY measured — the same reliable pipeline
  // as the Vercel visit/event counts above (a client engagement beacon ->
  // /api/marketing/analytics/collect -> Vercel KV -> drain-cron rollup), NOT a
  // separate GA4 sample. `sessions` is the count of measured page-sessions the
  // bounce/time are based on. Backward-compatible: missing values render as '—'.
  const engagementByVariant = variants.map((variant) => ({ variant, engagement: getAbTestingVariantEngagement(experiment, variant) }))
  const engagementRows: Array<{ key: string; label: string; sublabel: string; format: (engagement: AbTestingVariantEngagement) => string }> = [
    { key: 'engagement-bounce', label: 'Bounce rate', sublabel: 'First-party measured', format: (engagement) => formatAbTestingBounceRate(engagement.bounceRate) },
    { key: 'engagement-avg-time', label: 'Avg time on page', sublabel: 'First-party measured', format: (engagement) => formatAbTestingAvgTime(engagement.averageSessionDuration) },
    { key: 'engagement-sessions', label: 'Sessions', sublabel: 'First-party measured', format: (engagement) => (engagement.sessions === null ? '—' : formatOptionalNumber(engagement.sessions)) },
  ]
  const hasEngagement = engagementByVariant.some(
    ({ engagement }) => engagement.sessions !== null || engagement.bounceRate !== null || engagement.averageSessionDuration !== null,
  )

  return (
    <div style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12, display: 'grid', gap: 10 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16 }}>Visits and events</h3>
        <p style={{ ...styles.small, ...styles.muted, margin: '5px 0 0', lineHeight: 1.45 }}>
          Shows total visits or exposures for each version, then how many visitors triggered each tracked event, plus per-version bounce rate and avg time on page.
        </p>
        <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>
          Every metric here is first-party measured from the same on-page pipeline. Bounce rate and avg time on page come from each session&apos;s visible time on the page (a session counts as engaged at 10s visible or once it converts); Sessions is the number of measured page-sessions behind those figures.
        </p>
        <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>
          Primary = picks the winner · Guardrail = must not get worse · Diagnostic = context only.
        </p>
      </div>
      <div data-mobile-scroll="true" style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns, minWidth: 190 + variants.length * 150, borderTop: '1px solid var(--card-border-color)' }}>
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 900, padding: '8px 10px', borderBottom: '1px solid var(--card-border-color)' }}>
            Metric
          </div>
          {variants.map((variant) => (
            <div key={variant.key} style={{ ...styles.small, ...styles.muted, fontWeight: 900, padding: '8px 10px', borderBottom: '1px solid var(--card-border-color)', borderLeft: '1px solid var(--card-border-color)' }}>
              {variant.label}
            </div>
          ))}
          {rows.map((row) => (
            <Fragment key={row.key}>
              <div style={{ padding: '9px 10px', borderBottom: '1px solid var(--card-border-color)' }}>
                <strong style={{ display: 'block', fontSize: 13, lineHeight: 1.25 }}>{row.label}</strong>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                  {row.role && <span style={{ ...styles.small, ...styles.muted }}>{row.role}</span>}
                  {row.comparison === 'conceptual' && (
                    <span title="Captured for context only — it does not pick a winner or block measurement" style={{ ...styles.small, color: 'var(--card-muted-fg-color)', border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '0 7px', whiteSpace: 'nowrap' }}>
                      Captured · not compared
                    </span>
                  )}
                </span>
              </div>
              {row.cells.map((cell) => (
                <div key={`${row.key}-${cell.variant.key}`} style={{ padding: '9px 10px', borderBottom: '1px solid var(--card-border-color)', borderLeft: '1px solid var(--card-border-color)', display: 'grid', gap: 3 }}>
                  <strong style={{ fontSize: 14, lineHeight: 1.2 }}>{formatAbTestingEventCount(cell.value, row.isExposure ? cell.unit || 'visits' : cell.unit || 'events')}</strong>
                  {!row.isExposure && (
                    <span style={{ ...styles.small, ...styles.muted }}>
                      {formatAbTestingEventRate(cell)}
                    </span>
                  )}
                </div>
              ))}
            </Fragment>
          ))}
          {engagementRows.map((engagementRow) => (
            <Fragment key={engagementRow.key}>
              <div style={{ padding: '9px 10px', borderBottom: '1px solid var(--card-border-color)' }}>
                <strong style={{ display: 'block', fontSize: 13, lineHeight: 1.25 }}>{engagementRow.label}</strong>
                <span style={{ ...styles.small, ...styles.muted }}>{engagementRow.sublabel}</span>
              </div>
              {engagementByVariant.map(({ variant, engagement }) => (
                <div key={`${engagementRow.key}-${variant.key}`} style={{ padding: '9px 10px', borderBottom: '1px solid var(--card-border-color)', borderLeft: '1px solid var(--card-border-color)', display: 'grid', gap: 3 }}>
                  <strong style={{ fontSize: 14, lineHeight: 1.2 }}>{engagementRow.format(engagement)}</strong>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      {!hasEngagement && (
        <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.45 }}>
          Bounce rate, avg time on page, and measured sessions fill in once the first-party engagement rollup has run for this test.
        </p>
      )}
    </div>
  )
}

function AbTestingVariantSummary({ experiment }: { experiment: MarketingExperiment }) {
  const variants = experiment.variants || []

  return (
    <div style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
      <div style={{ ...styles.kicker, marginBottom: 6 }}>Page versions</div>
      {variants.length === 0 ? (
        <p style={{ ...styles.small, ...styles.muted, margin: 0 }}>No versions are defined yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {variants.map((variant, index) => (
            <div key={variant._key || variant.key || index} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderTop: index === 0 ? 'none' : '1px solid var(--card-border-color)', paddingTop: index === 0 ? 0 : 8 }}>
              <span>
                <strong style={{ display: 'block', fontSize: 13 }}>{variant.label || variant.key || 'Untitled version'}</strong>
                <span style={{ ...styles.small, ...styles.muted }}>{variant.notes || (variant.key === 'control' ? 'Current page' : 'Test version')}</span>
              </span>
              <code style={{ ...styles.small, color: 'var(--card-muted-fg-color)' }}>{variant.key || 'missing-key'}</code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AbTestingVercelReadout({
  experiment,
  onOpenSignals,
}: {
  experiment: MarketingExperiment
  onOpenSignals: () => void
}) {
  const source = getAbTestingVercelSource(experiment)
  const dashboardUrl = getAbTestingDashboardUrl(experiment)
  const trackedEvents = getAbTestingTrackedVercelEvents(experiment)

  return (
    <div style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
      <div style={{ ...styles.kicker, marginBottom: 6 }}>Vercel Analytics readout</div>
      {source || dashboardUrl ? (
        <div style={{ display: 'grid', gap: 9 }}>
          <div>
            <strong style={{ display: 'block', fontSize: 14 }}>
              {source?.title || 'Vercel dashboard connected'}
            </strong>
            <span style={{ ...styles.small, ...styles.muted, display: 'block', marginTop: 3, lineHeight: 1.45 }}>
              {[labelForAnalyticsProvider(source?.provider) || 'Vercel Analytics', source?.status ? labelFor(analyticsStatusOptions, source.status) : '', source?.lastSyncedAt ? `synced ${formatDateTime(source.lastSyncedAt)}` : ''].filter(Boolean).join(' / ')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {trackedEvents.map((eventName) => (
              <code key={eventName} style={{ ...styles.small, color: 'var(--card-muted-fg-color)', border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '3px 7px' }}>
                {eventName}
              </code>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {dashboardUrl && (
              <a href={dashboardUrl} target="_blank" rel="noreferrer" style={styles.button}>
                <LaunchIcon style={{ width: 15, height: 15 }} />
                Open Vercel dashboard
              </a>
            )}
            <button type="button" style={styles.button} onClick={onOpenSignals}>
              Open linked signals
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
            Choose Vercel Web Analytics in Launch setup so this test can read exposure and conversion signals from the same source as the site events.
          </p>
          <button type="button" style={styles.button} onClick={onOpenSignals}>
            Open analytics sources
          </button>
        </div>
      )}
    </div>
  )
}

function AbTestingSignalSummary({ signals }: { signals: MarketingPerformanceSignal[] }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Linked result evidence</h3>
      {signals.length === 0 ? (
        <div style={{ ...styles.small, ...styles.muted }}>Link at least one result signal before the test moves to review.</div>
      ) : (
        <div style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)' }}>
          {signals.map((signal, index) => (
            <div key={signal._id} style={{ padding: '10px 0', borderBottom: index === signals.length - 1 ? 'none' : '1px solid var(--card-border-color)' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{signal.title || 'Untitled signal'}</strong>
              <div style={{ ...styles.small, ...styles.muted, marginTop: 3 }}>
                {[labelForAnalyticsProvider(signal.provider), signal.signalType, formatDateOnly(signal.metricDate) || formatDateTime(signal._updatedAt)].filter(Boolean).join(' / ')}
              </div>
              {(signal.metrics || []).length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {(signal.metrics || []).slice(0, 4).map((metric) => (
                    <span key={metric._key || metric.label} style={{ ...styles.small, border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '3px 8px' }}>
                      {[metric.label, typeof metric.value === 'number' ? formatOptionalNumber(metric.value) : '', metric.unit, metric.change].filter((part) => part !== undefined && part !== '').join(' ')}
                    </span>
                  ))}
                </div>
              )}
              {signal.recommendation && <p style={{ ...styles.small, margin: '6px 0 0', lineHeight: 1.45 }}>{signal.recommendation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExperimentPreviewLinks({
  experiment,
  onPreviewUrlChange,
}: {
  experiment: MarketingExperiment
  onPreviewUrlChange: (variantKey: string, previewUrl: string) => void
}) {
  const variants = experiment.variants || []
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.goinvo.com'

  if (variants.length === 0) {
    return <EmptyInline title="Add page versions before creating forced preview links." />
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16 }}>Forced preview links</h3>
        <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>
          Share these links to force a specific version for QA. Normal visitors still use the Vercel traffic split.
        </p>
      </div>
      <div style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)' }}>
        {variants.map((variant, index) => {
          const variantKey = variant.key || ''
          const baseHref = variant.previewUrl?.trim() || experiment.targetPath || '/'
          const forcedUrl = variantKey ? buildMarketingForcedExperimentUrl(baseHref, variantKey, origin) : ''
          return (
            <div
              key={variant._key || variantKey || index}
              style={{
                display: 'grid',
                gap: 8,
                padding: '10px 0',
                borderBottom: index === variants.length - 1 ? 'none' : '1px solid var(--card-border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13 }}>{variant.label || variantKey || 'Untitled version'}</strong>
                  <span style={{ ...styles.small, ...styles.muted }}>{variantKey || 'Missing variant key'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" style={styles.button} disabled={!forcedUrl} onClick={() => void copyTextToClipboard(forcedUrl)}>
                    Copy forced link
                  </button>
                  <a href={forcedUrl || '#'} target="_blank" rel="noreferrer" style={styles.button} aria-disabled={!forcedUrl}>
                    <LaunchIcon style={{ width: 15, height: 15 }} />
                    Open
                  </a>
                </div>
              </div>
              <InputField label="Custom link for this version" help="Optional. Use a relative path like /?utm_source=qa or a full URL. The forced-version parameter is added automatically.">
                <input
                  style={styles.input}
                  placeholder={experiment.targetPath || '/'}
                  value={variant.previewUrl || ''}
                  onChange={(event) => variantKey && onPreviewUrlChange(variantKey, event.currentTarget.value)}
                  disabled={!variantKey}
                />
              </InputField>
              {forcedUrl && <code style={{ ...styles.small, color: 'var(--card-muted-fg-color)', overflowWrap: 'anywhere' }}>{forcedUrl}</code>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildMarketingForcedExperimentUrl(href: string, variant: string, origin: string) {
  const url = new URL(href || '/', origin)
  url.searchParams.set(EXPERIMENT_FORCE_VARIANT_PARAM, variant)
  return url.toString()
}

async function copyTextToClipboard(value: string) {
  if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return
  await navigator.clipboard.writeText(value)
}

function abTestingTrackingFingerprint(experiment: MarketingExperiment) {
  return JSON.stringify({
    targetPath: normalizeMarketingExperimentPath(experiment.targetPath),
    flagKey: experiment.flagKey?.trim() || '',
    variants: (experiment.variants || []).map((variant) => variant.key?.trim() || ''),
    metrics: (experiment.trackedMetrics || []).map((metric) => ({
      key: metric.key?.trim() || '',
      eventName: metric.eventName?.trim() || '',
      source: metric.source || '',
      comparison: metric.comparison || '',
    })),
  })
}

function AbTestingEditorTabButton({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 0,
        borderBottom: `2px solid ${active ? '#4dc4d6' : 'transparent'}`,
        borderRadius: 0,
        background: active ? 'rgba(0, 115, 133, 0.12)' : 'transparent',
        color: 'var(--card-fg-color)',
        cursor: 'pointer',
        font: 'inherit',
        minWidth: 158,
        padding: '10px 12px',
        textAlign: 'left',
      }}
    >
      <strong style={{ display: 'block', fontSize: 13 }}>{title}</strong>
      <span style={{ ...styles.small, ...styles.muted, display: 'block', marginTop: 2 }}>{detail}</span>
    </button>
  )
}
