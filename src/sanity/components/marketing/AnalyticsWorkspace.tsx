import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CloseIcon, LaunchIcon, TrendUpwardIcon } from '@sanity/icons'

import { randomKey, refsFromIds, toDateInputValue } from '@/lib/marketing'
import { analyticsProviderOptions, analyticsStatusOptions } from '../../schemas/marketingAnalyticsSource'
import { campaignStatusOptions } from '../../schemas/marketingCampaign'
import { channelPlatformOptions, channelStatusOptions } from '../../schemas/marketingChannel'
import { funnelStatusOptions } from '../../schemas/marketingFunnel'
import { getChannelUsage } from './shared'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports AnalyticsWorkspace only for JSX
// rendering, and AnalyticsWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  AdvancedFieldsDropdown,
  aiKeyMetrics,
  aiOption,
  aiString,
  AnalyticsMetricCard,
  analyticsSourceConnectionError,
  buildAnalyticsInterpretations,
  dateRange,
  emptyKeys,
  EmptyInline,
  EmptyPanel,
  formatDateTime,
  getAnalyticsInterpretationTone,
  getAnalyticsReadinessStats,
  getCampaignCalendarCount,
  getFunnelCampaignCount,
  hasUsableAnalyticsRefs,
  InputField,
  labelFor,
  MarketingAiAssistPanel,
  MetricSummary,
  PanelHeading,
  PanelTitle,
  RelationshipUsagePanel,
  Select,
  Stack,
  StatusPill,
  styles,
  isUsableConnectedAnalyticsSource,
  useMarketingCompactLayout,
  type AnalyticsInterpretation,
  type MarketingAiSuggestion,
  type MarketingAnalyticsSource,
  type MarketingData,
  type MarketingDocumentInput,
  type RefSummary,
  type SelectOption,
} from '../../tools/marketingTool'

interface AnalyticsWorkspaceProps {
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}

export function AnalyticsWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
}: AnalyticsWorkspaceProps) {
  const compactLayout = useMarketingCompactLayout()
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(data.analyticsSources[0]?._id || null)
  const [sourceDraftDirty, setSourceDraftDirty] = useState(false)
  const usableSources = data.analyticsSources.filter(isUsableConnectedAnalyticsSource)
  const vercelSources = usableSources.filter((source) =>
    source.provider === 'vercelAnalytics' || source.provider === 'vercelSpeedInsights',
  )
  const selectedSource = data.analyticsSources.find((source) => source._id === selectedSourceId) || null
  const campaignLinkedCount = data.campaigns.filter((campaign) => hasUsableAnalyticsRefs(campaign.analyticsSources, data.analyticsSources)).length
  const funnelLinkedCount = data.funnels.filter((funnel) => hasUsableAnalyticsRefs(funnel.analyticsSources, data.analyticsSources)).length
  const channelLinkedCount = data.channels.filter((channel) => hasUsableAnalyticsRefs(channel.analyticsSources, data.analyticsSources)).length
  const connectedSourceCount = usableSources.length
  const analyticsInterpretations = useMemo(() => buildAnalyticsInterpretations(data), [data])
  const workspaceGridStyle: CSSProperties = compactLayout
    ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, alignItems: 'start' }
    : { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }
  const metricGridStyle: CSSProperties = compactLayout
    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }
    : { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }
  const sidePanelStyle: CSSProperties = compactLayout
    ? { ...styles.panel, position: 'static' }
    : { ...styles.panel, position: 'sticky', top: 16 }

  useEffect(() => {
    if (!selectedSourceId && data.analyticsSources.length > 0) setSelectedSourceId(data.analyticsSources[0]._id)
  }, [data.analyticsSources, selectedSourceId])

  const createSource = async () => {
    if (sourceDraftDirty && typeof window !== 'undefined' && !window.confirm('Discard the unsaved source edits and create a new source?')) return
    const createdId = await createDocument({
      _type: 'marketingAnalyticsSource',
      title: '',
      provider: 'ga4',
      status: 'planned',
      reportingCadence: 'monthly',
    })
    setSourceDraftDirty(false)
    setSelectedSourceId(createdId)
  }

  const setAnalyticsSourcesForDocument = async (id: string, sourceIds: string[]) => {
    if (sourceDraftDirty) return
    await commitPatch(id, { analyticsSources: refsFromIds(sourceIds) }, sourceIds.length > 0 ? [] : ['analyticsSources'])
  }

  return (
    <div data-mobile-stack="true" style={workspaceGridStyle}>
      <section style={{ display: 'grid', gap: 16 }}>
        <section style={styles.panel}>
          <PanelHeading
            title="Analytics Dashboard"
            description="Connect measurement sources to marketing work once, then reuse those connections across campaigns, funnels, and channels."
          />
          <div style={metricGridStyle}>
            <AnalyticsMetricCard label="Sources" value={`${connectedSourceCount}/${data.analyticsSources.length}`} detail="connected" />
            <AnalyticsMetricCard label="Campaigns" value={`${campaignLinkedCount}/${data.campaigns.length}`} detail="linked to analytics" />
            <AnalyticsMetricCard label="Funnels" value={`${funnelLinkedCount}/${data.funnels.length}`} detail="linked to analytics" />
            <AnalyticsMetricCard label="Channels" value={`${channelLinkedCount}/${data.channels.length}`} detail="linked to analytics" />
          </div>
        </section>

        <AnalyticsInterpretationPanel data={data} interpretations={analyticsInterpretations} />

        <VercelAnalyticsSummary sources={vercelSources} />

        <AnalyticsEditor
          source={selectedSource}
          data={data}
          saving={savingId === selectedSource?._id}
          onSave={commitPatch}
          onDirtyChange={setSourceDraftDirty}
        />

        {sourceDraftDirty && (
          <div role="status" style={{ ...styles.panel, boxShadow: 'none', borderColor: 'rgba(214, 169, 63, 0.55)', padding: 12 }}>
            Save or discard the source edits before changing campaign, funnel, or channel connections.
          </div>
        )}

        <AnalyticsConnectionSection
          title="Campaign measurement"
          description="Attach sources to campaigns so success metrics, content, and reporting all point to the same measurement surface."
          emptyTitle="No campaigns yet"
          items={data.campaigns}
          sources={usableSources}
          disabled={sourceDraftDirty}
          savingId={savingId}
          getStatusOptions={() => campaignStatusOptions}
          getMeta={(campaign) =>
            [
              dateRange(campaign.startDate, campaign.endDate) || 'No dates',
              `${getCampaignCalendarCount(data, campaign._id)} calendar item${getCampaignCalendarCount(data, campaign._id) === 1 ? '' : 's'}`,
              `${campaign.funnels?.length || 0} funnel${(campaign.funnels?.length || 0) === 1 ? '' : 's'}`,
            ].join(' / ')
          }
          onChange={setAnalyticsSourcesForDocument}
        />

        <AnalyticsConnectionSection
          title="Funnel measurement"
          description="Attach sources to reusable funnel maps so every connected campaign inherits the same measurement logic."
          emptyTitle="No funnels yet"
          items={data.funnels}
          sources={usableSources}
          disabled={sourceDraftDirty}
          savingId={savingId}
          getStatusOptions={() => funnelStatusOptions}
          getMeta={(funnel) =>
            [
              `${funnel.stages?.length || 0} stage${(funnel.stages?.length || 0) === 1 ? '' : 's'}`,
              `${getFunnelCampaignCount(data, funnel._id)} campaign link${getFunnelCampaignCount(data, funnel._id) === 1 ? '' : 's'}`,
            ].join(' / ')
          }
          onChange={setAnalyticsSourcesForDocument}
        />

        <AnalyticsConnectionSection
          title="Channel measurement"
          description="Attach default analytics sources to channels so new campaigns and content know how each channel is measured."
          emptyTitle="No channels yet"
          items={data.channels}
          sources={usableSources}
          disabled={sourceDraftDirty}
          savingId={savingId}
          getStatusOptions={() => channelStatusOptions}
          getMeta={(channel) =>
            [
              labelFor(channelPlatformOptions, channel.platform),
              `${getChannelUsage(data, channel).calendarCount} calendar item${getChannelUsage(data, channel).calendarCount === 1 ? '' : 's'}`,
              `${getChannelUsage(data, channel).campaignCount} campaign${getChannelUsage(data, channel).campaignCount === 1 ? '' : 's'}`,
            ].filter(Boolean).join(' / ')
          }
          onChange={setAnalyticsSourcesForDocument}
        />
      </section>

      <aside style={sidePanelStyle}>
        <PanelHeading title="Sources" description="Where the numbers come from — add a source here, then connect it below." />
        <button
          type="button"
          style={{ ...styles.primaryButton, width: '100%', marginBottom: 16 }}
          disabled={savingId === 'new'}
          onClick={() => void createSource()}
        >
          Add analytics source
        </button>
        <div style={{ display: 'grid', gap: 8 }}>
          {data.analyticsSources.map((source) => (
            <button
              key={source._id}
              type="button"
              onClick={() => {
                if (source._id === selectedSourceId) return
                if (sourceDraftDirty && typeof window !== 'undefined' && !window.confirm('Discard the unsaved source edits and switch sources?')) return
                setSourceDraftDirty(false)
                setSelectedSourceId(source._id)
              }}
              style={{
                ...styles.card,
                padding: 10,
                boxShadow: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--card-fg-color)',
                borderColor: source._id === selectedSourceId ? '#007385' : 'var(--card-border-color)',
                background: source._id === selectedSourceId ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{source.title || 'Untitled source'}</strong>
                  <div style={{ ...styles.small, ...styles.muted, marginTop: 3 }}>
                    {labelFor(analyticsProviderOptions, source.provider)}
                  </div>
                </div>
                <StatusPill status={source.status} options={analyticsStatusOptions} />
              </div>
              {source.dashboardUrl && (
                <div style={{ ...styles.small, color: 'var(--card-fg-color)', marginTop: 8 }}>Dashboard URL set</div>
              )}
            </button>
          ))}
          {data.analyticsSources.length === 0 && <EmptyInline title="No analytics sources yet" />}
        </div>
      </aside>
    </div>
  )
}

function AnalyticsInterpretationPanel({
  data,
  interpretations,
}: {
  data: MarketingData
  interpretations: AnalyticsInterpretation[]
}) {
  const stats = getAnalyticsReadinessStats(data)
  const priorityCount = interpretations.filter((insight) => insight.severity === 'urgent' || insight.severity === 'warning').length
  // Same tone mapping the Home "Measurement" tile uses (risk at 0, warn under 50).
  const readinessColor = stats.readinessScore === 0 ? '#E36216' : stats.readinessScore < 50 ? '#b8860b' : '#007385'

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ maxWidth: 720 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Interpretation and next actions</h2>
          <p style={{ ...styles.muted, margin: '4px 0 0', lineHeight: 1.55 }}>
            A plain-language summary of what the current analytics setup implies, where measurement will break, and what to do next.
          </p>
        </div>
        <div
          style={{
            border: '1px solid rgba(0, 115, 133, 0.35)',
            background: 'rgba(0, 115, 133, 0.08)',
            borderRadius: 8,
            padding: '10px 12px',
            minWidth: 160,
            maxWidth: 260,
          }}
        >
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Work linked to analytics
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: readinessColor, marginTop: 2 }}>{stats.readinessScore}%</div>
          <div style={{ ...styles.small, ...styles.muted }}>
            {stats.measurementTargets > 0
              ? `${stats.connectedMeasurementTargets} of ${stats.measurementTargets} campaigns, funnels, channels, posts & links point at a source`
              : 'No active work yet'}
          </div>
        </div>
      </div>

      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <AnalyticsMetricCard
          label="Priority actions"
          value={`${priorityCount}`}
          detail={priorityCount === 1 ? 'fix first' : 'fix first'}
        />
        <AnalyticsMetricCard
          label="Connected sources"
          value={`${stats.connectedSources}/${stats.activeSources}`}
          detail="available for analysis"
        />
        <AnalyticsMetricCard
          label="Review rhythm"
          value={stats.reviewCadence}
          detail="suggested by sources"
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {interpretations.map((insight) => (
          <AnalyticsInterpretationCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  )
}

function AnalyticsInterpretationCard({ insight }: { insight: AnalyticsInterpretation }) {
  const tone = getAnalyticsInterpretationTone(insight.severity)

  return (
    <article
      style={{
        ...styles.card,
        boxShadow: 'none',
        padding: 14,
        borderColor: tone.border,
        background: tone.bg,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${tone.border}`,
              background: 'var(--card-bg-color)',
              color: tone.fg,
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            {tone.label}
          </div>
          <h3 style={{ margin: 0, fontSize: 17 }}>{insight.title}</h3>
        </div>
        {insight.affected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 380 }}>
            {insight.affected.map((title) => (
              <span
                key={title}
                style={{
                  ...styles.small,
                  border: '1px solid var(--card-border-color)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  background: 'var(--card-bg-color)',
                  color: 'var(--card-muted-fg-color)',
                  fontWeight: 700,
                }}
              >
                {title}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginTop: 10 }}>
        <div>
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, marginBottom: 4 }}>What this means</div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{insight.interpretation}</p>
        </div>
        <div>
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, marginBottom: 4 }}>Do next</div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{insight.action}</p>
        </div>
      </div>
    </article>
  )
}

function AnalyticsConnectionSection<T extends { _id: string; title?: string; status?: string; analyticsSources?: RefSummary[] }>({
  title,
  description,
  emptyTitle,
  items,
  sources,
  disabled,
  savingId,
  getStatusOptions,
  getMeta,
  onChange,
}: {
  title: string
  description: string
  emptyTitle: string
  items: T[]
  sources: MarketingAnalyticsSource[]
  disabled: boolean
  savingId: string | null
  getStatusOptions: (item: T) => SelectOption[]
  getMeta: (item: T) => string
  onChange: (id: string, sourceIds: string[]) => Promise<void>
}) {
  const sourceIds = new Set(sources.map((source) => source._id))
  const connected = items.filter((item) => (item.analyticsSources || []).some((source) => sourceIds.has(source._id))).length

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          <p style={{ ...styles.muted, margin: '4px 0 0', lineHeight: 1.5 }}>{description}</p>
        </div>
        <div style={{ ...styles.small, ...styles.muted, textAlign: 'right', minWidth: 100 }}>
          <strong style={{ color: 'var(--card-fg-color)', fontSize: 18 }}>{connected}/{items.length}</strong>
          <div>connected</div>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyInline title={emptyTitle} />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <AnalyticsConnectionRow
              key={item._id}
              item={item}
              sources={sources}
              disabled={disabled}
              saving={savingId === item._id}
              statusOptions={getStatusOptions(item)}
              meta={getMeta(item)}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function AnalyticsConnectionRow<T extends { _id: string; title?: string; status?: string; analyticsSources?: RefSummary[] }>({
  item,
  sources,
  disabled,
  saving,
  statusOptions,
  meta,
  onChange,
}: {
  item: T
  sources: MarketingAnalyticsSource[]
  disabled: boolean
  saving: boolean
  statusOptions: SelectOption[]
  meta: string
  onChange: (id: string, sourceIds: string[]) => Promise<void>
}) {
  const selectedIds = (item.analyticsSources || []).map((source) => source._id)
  const availableSources = sources.filter((source) => !selectedIds.includes(source._id))

  return (
    <div
      data-mobile-stack="true"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.3fr) 220px',
        gap: 12,
        alignItems: 'center',
        border: '1px solid var(--card-border-color)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>{item.title || 'Untitled'}</strong>
          <StatusPill status={item.status} options={statusOptions} />
        </div>
        <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>{meta}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(item.analyticsSources || []).length === 0 && (
          <span style={{ ...styles.small, ...styles.muted }}>No analytics connected</span>
        )}
        {(item.analyticsSources || []).map((source) => (
          <button
            key={source._id}
            type="button"
            title={`Remove ${source.title || 'analytics source'}`}
            disabled={saving || disabled}
            onClick={() => void onChange(item._id, selectedIds.filter((id) => id !== source._id))}
            style={{
              border: '1px solid rgba(0, 115, 133, 0.35)',
              background: 'rgba(0, 115, 133, 0.08)',
              color: 'var(--card-fg-color)',
              borderRadius: 999,
              padding: '5px 8px',
              cursor: saving || disabled ? 'default' : 'pointer',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {source.title || 'Untitled source'}
            <CloseIcon style={{ width: 12, height: 12 }} />
          </button>
        ))}
      </div>
      <Select
        ariaLabel="Connect analytics source"
        value=""
        options={[
          { title: sources.length === 0 ? 'Add analytics source first' : 'Connect source...', value: '' },
          ...availableSources.map((source) => ({
            title: `${source.title || 'Untitled source'} (${labelFor(analyticsProviderOptions, source.provider)})`,
            value: source._id,
          })),
        ]}
        disabled={saving || disabled || availableSources.length === 0}
        onChange={(sourceId) => {
          if (!sourceId) return
          void onChange(item._id, [...selectedIds, sourceId])
        }}
      />
    </div>
  )
}

function VercelAnalyticsSummary({ sources }: { sources: MarketingAnalyticsSource[] }) {
  if (sources.length === 0) return null

  const project = sources.find((source) => source.vercelProject)?.vercelProject || 'Vercel project'
  const productionUrl = sources.find((source) => source.productionUrl)?.productionUrl
  const team = sources.find((source) => source.vercelTeamSlug)?.vercelTeamSlug

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Vercel connection</h3>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
            {[project, team ? `Team ${team}` : '', productionUrl].filter(Boolean).join(' / ')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, flex: '1 1 520px' }}>
          {sources.map((source) => (
            <div key={source._id} style={{ ...styles.card, padding: 12, boxShadow: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <strong>{labelFor(analyticsProviderOptions, source.provider)}</strong>
                  <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
                    Synced {formatDateTime(source.lastSyncedAt) || 'from Vercel CLI'}
                  </div>
                </div>
                <StatusPill status={source.status} options={analyticsStatusOptions} />
              </div>
              {source.dashboardUrl && (
                <a
                  href={source.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Open ${labelFor(analyticsProviderOptions, source.provider)} dashboard`}
                  style={{ ...styles.button, marginTop: 10 }}
                >
                  <LaunchIcon style={{ width: 15, height: 15 }} />
                  Open provider dashboard
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AnalyticsEditor({
  source,
  data,
  saving,
  onSave,
  onDirtyChange,
}: {
  source: MarketingAnalyticsSource | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}) {
  const [draft, setDraft] = useState<MarketingAnalyticsSource | null>(source)
  const [saveError, setSaveError] = useState<string | null>(null)
  const sourceSnapshotRef = useRef(source)
  sourceSnapshotRef.current = source

  useEffect(() => {
    setDraft(sourceSnapshotRef.current)
    setSaveError(null)
    onDirtyChange(false)
  }, [source?._id, onDirtyChange])

  useEffect(() => {
    onDirtyChange(Boolean(draft && source && analyticsSourceDraftFingerprint(draft) !== analyticsSourceDraftFingerprint(source)))
  }, [draft, source, onDirtyChange])

  if (!draft || !source) {
    return (
      <EmptyPanel
        icon={TrendUpwardIcon}
        title="Select an analytics source"
        description="Choose or create a source to manage its setup."
      />
    )
  }

  const save = async () => {
    const connectionError = draft.status === 'connected' ? analyticsSourceConnectionError(draft) : null
    if (connectionError) {
      setSaveError(connectionError)
      return
    }
    setSaveError(null)
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled analytics source',
      provider: draft.provider || 'ga4',
      status: draft.status || 'planned',
      propertyId: draft.propertyId,
      measurementId: draft.measurementId,
      containerId: draft.containerId,
      vercelProject: draft.vercelProject,
      dashboardUrl: draft.dashboardUrl,
      reportingCadence: draft.reportingCadence,
      implementationNotes: draft.implementationNotes,
      targetSites: draft.targetSites,
      keyMetrics: aiKeyMetrics(draft.keyMetrics),
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    try {
      await onSave(source._id, set, unset)
      onDirtyChange(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this analytics source.')
    }
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const analyticsSuggestion = suggestion.analyticsSource || {}
    setDraft({
      ...draft,
      title: aiString(analyticsSuggestion.title) || draft.title,
      provider: aiOption(analyticsSuggestion.provider, analyticsProviderOptions) || draft.provider,
      reportingCadence:
        aiOption(analyticsSuggestion.reportingCadence, [
          { value: 'daily' },
          { value: 'weekly' },
          { value: 'monthly' },
          { value: 'quarterly' },
          { value: 'asNeeded' },
        ]) || draft.reportingCadence,
      implementationNotes: aiString(analyticsSuggestion.implementationNotes) || draft.implementationNotes,
      keyMetrics: aiKeyMetrics(analyticsSuggestion.keyMetrics) || draft.keyMetrics,
    })
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title={`Analytics setup — ${source.title || 'Untitled source'}`} type="marketingAnalyticsSource" id={source._id} />
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <MarketingAiAssistPanel
            kind="analyticsSource"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={buildAnalyticsInterpretations(data)}
            onApply={applyAiSuggestion}
          />
          <InputField label="Source name">
            <input
              style={styles.input}
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
            />
          </InputField>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Provider">
              <Select
                ariaLabel="Analytics provider"
                value={draft.provider || 'ga4'}
                options={analyticsProviderOptions}
                onChange={(provider) => setDraft({ ...draft, provider })}
              />
            </InputField>
            <InputField label="Status">
              <Select
                ariaLabel="Analytics source status"
                value={draft.status || 'planned'}
                options={analyticsStatusOptions}
                onChange={(status) => setDraft({ ...draft, status })}
              />
            </InputField>
          </div>
          {draft.provider === 'ga4' && (
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InputField label="GA4 Property ID">
                <input
                  style={styles.input}
                  value={draft.propertyId || ''}
                  onChange={(event) => setDraft({ ...draft, propertyId: event.currentTarget.value })}
                />
              </InputField>
              <InputField label="Measurement ID">
                <input
                  style={styles.input}
                  value={draft.measurementId || ''}
                  onChange={(event) => setDraft({ ...draft, measurementId: event.currentTarget.value })}
                />
              </InputField>
            </div>
          )}
          {draft.provider === 'gtm' && (
            <InputField label="GTM Container ID">
              <input
                style={styles.input}
                value={draft.containerId || ''}
                onChange={(event) => setDraft({ ...draft, containerId: event.currentTarget.value })}
              />
            </InputField>
          )}
          {(draft.provider === 'vercelAnalytics' || draft.provider === 'vercelSpeedInsights') && (
            <Stack gap={10}>
              <InputField label="Vercel project">
                <input
                  style={styles.input}
                  value={draft.vercelProject || ''}
                  onChange={(event) => setDraft({ ...draft, vercelProject: event.currentTarget.value })}
                />
              </InputField>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InputField label="Project ID">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={draft.vercelProjectId || ''} readOnly />
                </InputField>
                <InputField label="Team">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={draft.vercelTeamSlug || ''} readOnly />
                </InputField>
              </div>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InputField label="Production URL">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={draft.productionUrl || ''} readOnly />
                </InputField>
                <InputField label="Last synced">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={formatDateTime(draft.lastSyncedAt)} readOnly />
                </InputField>
              </div>
            </Stack>
          )}
          <InputField label="Dashboard URL">
            <input
              style={styles.input}
              value={draft.dashboardUrl || ''}
              onChange={(event) => setDraft({ ...draft, dashboardUrl: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Covered sites" help="One per line: label | URL. This tells the team which property or reporting surface to choose.">
            <textarea
              rows={3}
              style={styles.input}
              value={analyticsTargetSitesText(draft.targetSites)}
              onChange={(event) => setDraft({ ...draft, targetSites: parseAnalyticsTargetSites(event.currentTarget.value) })}
            />
          </InputField>
          <InputField label="Key metrics" help="One per line: metric | plain-language definition. Keep this to the 2–4 numbers used for decisions.">
            <textarea
              rows={4}
              style={styles.input}
              value={analyticsKeyMetricsText(draft.keyMetrics)}
              onChange={(event) => setDraft({ ...draft, keyMetrics: parseAnalyticsKeyMetrics(event.currentTarget.value) })}
            />
          </InputField>
          <InputField label="Implementation notes">
            <textarea
              rows={5}
              style={styles.input}
              value={draft.implementationNotes || ''}
              onChange={(event) => setDraft({ ...draft, implementationNotes: event.currentTarget.value })}
            />
          </InputField>
        </Stack>

        <Stack gap={12}>
          <InputField label="Reporting cadence">
            <Select
              ariaLabel="Reporting cadence"
              value={draft.reportingCadence || 'monthly'}
              options={[
                { title: 'Daily', value: 'daily' },
                { title: 'Weekly', value: 'weekly' },
                { title: 'Monthly', value: 'monthly' },
                { title: 'Quarterly', value: 'quarterly' },
                { title: 'As needed', value: 'asNeeded' },
              ]}
              onChange={(reportingCadence) => setDraft({ ...draft, reportingCadence })}
            />
          </InputField>
          <MetricSummary metrics={draft.keyMetrics || []} title="Key metrics" />
          {draft.dashboardUrl && (
            <a href={draft.dashboardUrl} target="_blank" rel="noreferrer" style={{ ...styles.button, width: '100%' }}>
              <LaunchIcon style={{ width: 15, height: 15 }} />
              Open provider dashboard
            </a>
          )}
          <RelationshipUsagePanel
            title="Campaigns using this source"
            items={data.campaigns.filter((campaign) =>
              (campaign.analyticsSources || []).some((ref) => ref._id === source._id) ||
              (campaign.successMetrics || []).some((metric) => 'source' in metric && (metric as { source?: RefSummary }).source?._id === source._id),
            )}
            emptyText="No campaigns are linked to this analytics source yet."
            renderMeta={(campaign) =>
              [
                labelFor(campaignStatusOptions, campaign.status),
                dateRange(campaign.startDate, campaign.endDate),
              ].filter(Boolean).join(' / ')
            }
          />
          <RelationshipUsagePanel
            title="Funnels using this source"
            items={data.funnels.filter((funnel) => (funnel.analyticsSources || []).some((ref) => ref._id === source._id))}
            emptyText="No funnels are linked to this analytics source yet."
            renderMeta={(funnel) => [labelFor(funnelStatusOptions, funnel.status), `${funnel.stages?.length || 0} stages`].join(' / ')}
          />
          <RelationshipUsagePanel
            title="Calendar items using this source"
            items={data.calendarItems.filter((item) => item.analyticsSource?._id === source._id)}
            emptyText="No calendar items are linked to this analytics source yet."
            renderMeta={(item) =>
              [
                toDateInputValue(item.publishAt),
                item.campaign?.title,
                item.funnel?.title,
              ].filter(Boolean).join(' / ')
            }
          />
          <AdvancedFieldsDropdown type="marketingAnalyticsSource" id={source._id} />
          {saveError && <div role="alert" style={{ ...styles.small, color: '#d98a8a' }}>{saveError}</div>}
          <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save analytics source'}
          </button>
        </Stack>
      </div>
    </section>
  )
}

function analyticsSourceDraftFingerprint(source: MarketingAnalyticsSource) {
  return JSON.stringify({
    title: source.title || '',
    provider: source.provider || '',
    status: source.status || '',
    propertyId: source.propertyId || '',
    measurementId: source.measurementId || '',
    containerId: source.containerId || '',
    vercelProject: source.vercelProject || '',
    dashboardUrl: source.dashboardUrl || '',
    reportingCadence: source.reportingCadence || '',
    implementationNotes: source.implementationNotes || '',
    targetSites: (source.targetSites || []).map(({ label, url }) => ({ label: label || '', url: url || '' })),
    keyMetrics: (source.keyMetrics || []).map(({ label, definition }) => ({ label: label || '', definition: definition || '' })),
  })
}

function analyticsTargetSitesText(items: MarketingAnalyticsSource['targetSites']) {
  return (items || []).map((item) => [item.label, item.url].filter(Boolean).join(' | ')).join('\n')
}

function parseAnalyticsTargetSites(value: string): NonNullable<MarketingAnalyticsSource['targetSites']> {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label = '', url = ''] = line.split('|').map((part) => part.trim())
    return { _key: randomKey(), _type: 'targetSite' as const, label, url }
  })
}

function analyticsKeyMetricsText(items: MarketingAnalyticsSource['keyMetrics']) {
  return (items || []).map((item) => [item.label, item.definition].filter(Boolean).join(' | ')).join('\n')
}

function parseAnalyticsKeyMetrics(value: string): NonNullable<MarketingAnalyticsSource['keyMetrics']> {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label = '', definition = ''] = line.split('|').map((part) => part.trim())
    return { _key: randomKey(), _type: 'keyMetric' as const, label, definition }
  })
}
