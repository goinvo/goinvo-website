import { useEffect, useMemo, useState } from 'react'
import { CloseIcon, MasterDetailIcon } from '@sanity/icons'

import { randomKey, refsFromIds, toDateInputValue } from '@/lib/marketing'
import { analyticsProviderOptions } from '../../schemas/marketingAnalyticsSource'
import { campaignStatusOptions } from '../../schemas/marketingCampaign'
import { funnelStageOptions, funnelStatusOptions } from '../../schemas/marketingFunnel'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports FunnelWorkspace only for JSX
// rendering, and FunnelWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  AdvancedFieldsDropdown,
  aiFunnelStages,
  aiString,
  buildAnalyticsInterpretations,
  dateRange,
  EmptyPanel,
  emptyKeys,
  FunnelTabButton,
  getFunnelTemplates,
  GuidanceChecklist,
  InputField,
  labelFor,
  MarketingAiAssistPanel,
  normalizeFunnelStages,
  PanelHeading,
  PanelTitle,
  RelationshipChecklist,
  RelationshipUsagePanel,
  Select,
  Stack,
  StatusPill,
  styles,
  TemplateRail,
  type FunnelStage,
  type FunnelTemplate,
  type MarketingAiSuggestion,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingFunnel,
  type RefSummary,
  type StudioClient,
} from '../../tools/marketingTool'

interface FunnelWorkspaceProps {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}

export function FunnelWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: FunnelWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(data.funnels[0]?._id || null)
  const [openFunnelIds, setOpenFunnelIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('browser')
  const activeFunnel = activeTab === 'browser' ? null : data.funnels.find((funnel) => funnel._id === activeTab) || null
  const funnelTemplates = useMemo(() => getFunnelTemplates(data), [data])

  useEffect(() => {
    if (!selectedId && data.funnels.length > 0) setSelectedId(data.funnels[0]._id)
  }, [data.funnels, selectedId])

  useEffect(() => {
    setOpenFunnelIds((current) => current.filter((id) => data.funnels.some((funnel) => funnel._id === id)))
    if (activeTab !== 'browser' && !data.funnels.some((funnel) => funnel._id === activeTab)) {
      setActiveTab('browser')
    }
  }, [activeTab, data.funnels])

  const openFunnel = (id: string) => {
    setOpenFunnelIds((current) => (current.includes(id) ? current : [...current, id]))
    setSelectedId(id)
    setActiveTab(id)
  }

  const closeFunnel = (id: string) => {
    setOpenFunnelIds((current) => current.filter((openId) => openId !== id))
    if (activeTab === id) setActiveTab('browser')
  }

  const createFunnel = async () => {
    const createdId = await createDocument({
      _type: 'marketingFunnel',
      title: '',
      status: 'draft',
      stages: [],
    })
    openFunnel(createdId)
  }

  const addStage = async (funnelId: string, stage: FunnelStage) => {
    await client
      .patch(funnelId)
      .setIfMissing({ stages: [] })
      .append('stages', [{ ...stage, _key: randomKey(), _type: 'funnelStage' }])
      .commit()
    await loadData()
  }
  const showFunnelTabs = activeTab !== 'browser'

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <PanelHeading title="Funnels" description="Build reusable stage maps for campaigns, pages, and CTAs." />
        <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createFunnel()}>
          Add funnel
        </button>
      </div>

      {showFunnelTabs && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            borderBottom: '1px solid var(--card-border-color)',
            marginBottom: 16,
            paddingBottom: 1,
          }}
        >
          <FunnelTabButton active={activeTab === 'browser'} onClick={() => setActiveTab('browser')}>
            All funnels
          </FunnelTabButton>
          {openFunnelIds.map((id) => {
            const funnel = data.funnels.find((candidate) => candidate._id === id)
            if (!funnel) return null
            return (
              <FunnelTabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {funnel.title || 'Untitled funnel'}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${funnel.title || 'funnel'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeFunnel(id)
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    display: 'inline-flex',
                    padding: 2,
                    cursor: 'pointer',
                  }}
                >
                  <CloseIcon style={{ width: 14, height: 14 }} />
                </button>
              </FunnelTabButton>
            )
          })}
        </div>
      )}

      {activeTab === 'browser' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {data.funnels.map((funnel) => (
            <div
              key={funnel._id}
              style={{
                ...styles.card,
                padding: 14,
                display: 'grid',
                gap: 10,
                borderColor: selectedId === funnel._id ? '#007385' : 'var(--card-border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{funnel.title || 'Untitled funnel'}</strong>
                <StatusPill status={funnel.status} options={funnelStatusOptions} />
              </div>
              <div style={{ ...styles.small, ...styles.muted }}>
                {[
                  `${funnel.stages?.length || 0} stage${(funnel.stages?.length || 0) === 1 ? '' : 's'}`,
                  `${data.campaigns.filter((campaign) => (campaign.funnels || []).some((ref) => ref._id === funnel._id)).length} campaign links`,
                  `${data.calendarItems.filter((item) => item.funnel?._id === funnel._id).length} calendar items`,
                ].join(' / ')}
              </div>
              <button type="button" style={styles.primaryButton} onClick={() => openFunnel(funnel._id)}>
                Open funnel
              </button>
            </div>
          ))}
          {data.funnels.length === 0 && (
            <EmptyPanel
              icon={MasterDetailIcon}
              title="No funnels yet"
              description="Add a funnel, then fill its stage map in the editor."
            />
          )}
        </div>
      ) : (
        <FunnelManager
          funnel={activeFunnel}
          data={data}
          funnelTemplates={funnelTemplates}
          saving={savingId === activeFunnel?._id}
          onSave={commitPatch}
          onAddStage={addStage}
        />
      )}
    </section>
  )
}

function FunnelManager({
  funnel,
  data,
  funnelTemplates,
  saving,
  onSave,
  onAddStage,
}: {
  funnel: MarketingFunnel | null
  data: MarketingData
  funnelTemplates: FunnelTemplate[]
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onAddStage: (funnelId: string, stage: FunnelStage) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingFunnel | null>(funnel)
  const [newStage, setNewStage] = useState<FunnelStage>({ _key: '', stage: 'awareness', goal: '', callToAction: '' })

  useEffect(() => setDraft(funnel), [funnel])

  if (!draft || !funnel) {
    return (
      <EmptyPanel
        icon={MasterDetailIcon}
        title="Select a funnel"
        description="Create or choose a funnel to manage its stage map."
      />
    )
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled funnel',
      status: draft.status || 'draft',
      audience: draft.audience,
      conversionGoal: draft.conversionGoal,
      notes: draft.notes,
      stages: normalizeFunnelStages(draft.stages || []),
      analyticsSources: refsFromIds((draft.analyticsSources || []).map((source) => source._id)),
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(funnel._id, set, unset)
  }

  const stagesByType = new Map<string, FunnelStage[]>()
  ;(draft.stages || []).forEach((stage) => {
    const key = stage.stage || 'awareness'
    stagesByType.set(key, [...(stagesByType.get(key) || []), stage])
  })

  const applyFunnelTemplate = (template: FunnelTemplate) => {
    setDraft({
      ...draft,
      audience: draft.audience || template.audience,
      conversionGoal: draft.conversionGoal || template.conversionGoal,
      stages: normalizeFunnelStages(template.stages),
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const funnelSuggestion = suggestion.funnel || {}
    setDraft({
      ...draft,
      title: aiString(funnelSuggestion.title) || draft.title,
      audience: aiString(funnelSuggestion.audience) || draft.audience,
      conversionGoal: aiString(funnelSuggestion.conversionGoal) || draft.conversionGoal,
      notes: aiString(funnelSuggestion.notes) || draft.notes,
      stages: aiFunnelStages(funnelSuggestion.stages) || draft.stages,
    })
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Funnels manager" type="marketingFunnel" id={funnel._id} />
      <GuidanceChecklist
        title="Funnel checklist"
        items={[
          { label: 'Audience is defined', done: !!draft.audience?.trim() },
          { label: 'Conversion goal is specific', done: !!draft.conversionGoal?.trim() },
          { label: 'Stages cover the path from awareness to action', done: (draft.stages || []).length >= 3 },
          { label: 'Each stage has a goal', done: (draft.stages || []).length > 0 && (draft.stages || []).every((stage) => !!stage.goal?.trim()) },
          { label: 'CTAs tell the visitor what to do next', done: (draft.stages || []).some((stage) => !!stage.callToAction?.trim()) },
          { label: 'Analytics sources are connected', done: (draft.analyticsSources || []).length > 0 },
        ]}
      />
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 18 }}>
        <div>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
            <InputField label="Funnel name">
              <input
                style={styles.input}
                value={draft.title || ''}
                onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
              />
            </InputField>
            <InputField label="Status">
              <Select
                value={draft.status || 'draft'}
                options={funnelStatusOptions}
                onChange={(status) => setDraft({ ...draft, status })}
              />
            </InputField>
            <div style={{ alignSelf: 'end' }}>
              <button type="button" style={{ ...styles.primaryButton, width: '100%' }} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving...' : 'Save funnel'}
              </button>
            </div>
          </div>

          <div data-mobile-scroll="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(160px, 1fr))', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {funnelStageOptions.map((option) => (
              <div key={option.value} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, minHeight: 300 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--card-border-color)',
                    fontWeight: 800,
                    background: 'rgba(0, 115, 133, 0.08)',
                  }}
                >
                  {option.title}
                </div>
                <div style={{ padding: 10, display: 'grid', gap: 10 }}>
                  {(stagesByType.get(option.value) || []).map((stage) => (
                    <StageCard key={stage._key} stage={stage} />
                  ))}
                  {(stagesByType.get(option.value) || []).length === 0 && (
                    <div style={{ ...styles.muted, ...styles.small }}>No step yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Stack gap={12}>
          <TemplateRail
            title="Funnel templates"
            description="Apply a complete stage map, then tune the audience, offers, and CTAs for this campaign."
            templates={funnelTemplates}
            onApply={applyFunnelTemplate}
          />
          <MarketingAiAssistPanel
            kind="funnel"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={buildAnalyticsInterpretations(data)}
            onApply={applyAiSuggestion}
          />
          <InputField label="Audience">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.audience || ''}
              onChange={(event) => setDraft({ ...draft, audience: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Conversion goal">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.conversionGoal || ''}
              onChange={(event) => setDraft({ ...draft, conversionGoal: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Notes">
            <textarea
              rows={4}
              style={styles.input}
              value={draft.notes || ''}
              onChange={(event) => setDraft({ ...draft, notes: event.currentTarget.value })}
            />
          </InputField>
          <RelationshipChecklist
            title="Analytics sources"
            items={data.analyticsSources}
            selectedIds={(draft.analyticsSources || []).map((source) => source._id)}
            getSubtitle={(source) => labelFor(analyticsProviderOptions, source.provider)}
            onChange={(ids) =>
              setDraft({
                ...draft,
                analyticsSources: ids.map((id) => data.analyticsSources.find((source) => source._id === id)).filter(Boolean) as RefSummary[],
              })
            }
          />
          <RelationshipUsagePanel
            title="Campaigns using this funnel"
            items={data.campaigns.filter((campaign) => (campaign.funnels || []).some((ref) => ref._id === funnel._id))}
            emptyText="No campaigns are linked to this funnel yet."
            renderMeta={(campaign) =>
              [
                labelFor(campaignStatusOptions, campaign.status),
                dateRange(campaign.startDate, campaign.endDate),
              ].filter(Boolean).join(' / ')
            }
          />
          <RelationshipUsagePanel
            title="Calendar items in this funnel"
            items={data.calendarItems.filter((item) => item.funnel?._id === funnel._id)}
            emptyText="No calendar items are assigned to this funnel yet."
            renderMeta={(item) =>
              [
                toDateInputValue(item.publishAt),
                item.campaign?.title,
                item.channelRef?.title || item.channel,
              ].filter(Boolean).join(' / ')
            }
          />
          <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Add funnel stage</h3>
            <Stack gap={10}>
              <InputField label="Stage">
                <Select
                  value={newStage.stage || 'awareness'}
                  options={funnelStageOptions}
                  onChange={(stage) => setNewStage({ ...newStage, stage })}
                />
              </InputField>
              <InputField label="Goal">
                <textarea
                  rows={2}
                  style={styles.input}
                  value={newStage.goal || ''}
                  onChange={(event) => setNewStage({ ...newStage, goal: event.currentTarget.value })}
                />
              </InputField>
              <InputField label="CTA">
                <input
                  style={styles.input}
                  value={newStage.callToAction || ''}
                  onChange={(event) => setNewStage({ ...newStage, callToAction: event.currentTarget.value })}
                />
              </InputField>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  void onAddStage(funnel._id, newStage)
                  setNewStage({ _key: '', stage: 'awareness', goal: '', callToAction: '' })
                }}
              >
                Add funnel stage
              </button>
            </Stack>
          </div>
          <AdvancedFieldsDropdown type="marketingFunnel" id={funnel._id} />
        </Stack>
      </div>
    </section>
  )
}

function StageCard({ stage }: { stage: FunnelStage }) {
  return (
    <div style={{ border: '1px solid var(--card-border-color)', borderRadius: 6, padding: 10, background: 'var(--card-bg-color)' }}>
      {stage.goal && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{stage.goal}</div>}
      {stage.offer && <div style={{ ...styles.small, ...styles.muted }}>Offer: {stage.offer}</div>}
      {stage.callToAction && <div style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>CTA: {stage.callToAction}</div>}
      {stage.destinationUrl && (
        <a href={stage.destinationUrl} target="_blank" rel="noreferrer" style={{ ...styles.small, color: '#007385' }}>
          Destination
        </a>
      )}
    </div>
  )
}
