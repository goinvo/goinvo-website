import { useEffect, useMemo, useState } from 'react'
import { CloseIcon, TargetIcon } from '@sanity/icons'

import { refsFromIds, slugify, optionalSlug, stringListFromText, toDateInputValue, uniqueById } from '@/lib/marketing'
import { analyticsProviderOptions } from '../../schemas/marketingAnalyticsSource'
import { campaignObjectiveOptions, campaignStatusOptions, searchIntentOptions } from '../../schemas/marketingCampaign'
import { funnelStatusOptions } from '../../schemas/marketingFunnel'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports CampaignWorkspace only for JSX
// rendering, and CampaignWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  AdvancedFieldsDropdown,
  aiOption,
  aiString,
  aiStringList,
  buildAnalyticsInterpretations,
  dateRange,
  EmptyPanel,
  emptyKeys,
  FunnelTabButton,
  getCampaignChannelKeys,
  getCampaignTemplates,
  getChannelByKey,
  getChannelOptions,
  GuidanceChecklist,
  InputField,
  labelFor,
  MarketingAiAssistPanel,
  MetricSummary,
  normalizeSuccessMetrics,
  PanelHeading,
  PanelTitle,
  RelationshipChecklist,
  RelationshipUsagePanel,
  Select,
  Stack,
  StatusPill,
  styles,
  TemplateRail,
  trimDescription,
  type AnalyticsInterpretation,
  type CampaignTemplate,
  type MarketingAiSuggestion,
  type MarketingAnalyticsSource,
  type MarketingCalendarItem,
  type MarketingCampaign,
  type MarketingChannel,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingFunnel,
  type RefSummary,
} from '../../tools/marketingTool'

interface CampaignWorkspaceProps {
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}

export function CampaignWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
}: CampaignWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(data.campaigns[0]?._id || null)
  const [openCampaignIds, setOpenCampaignIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('browser')
  const activeCampaign = activeTab === 'browser' ? null : data.campaigns.find((campaign) => campaign._id === activeTab) || null
  const campaignTemplates = useMemo(() => getCampaignTemplates(data), [data])

  useEffect(() => {
    if (!selectedId && data.campaigns.length > 0) setSelectedId(data.campaigns[0]._id)
  }, [data.campaigns, selectedId])

  useEffect(() => {
    setOpenCampaignIds((current) => current.filter((id) => data.campaigns.some((campaign) => campaign._id === id)))
    if (activeTab !== 'browser' && !data.campaigns.some((campaign) => campaign._id === activeTab)) {
      setActiveTab('browser')
    }
  }, [activeTab, data.campaigns])

  const openCampaign = (id: string) => {
    setOpenCampaignIds((current) => (current.includes(id) ? current : [...current, id]))
    setSelectedId(id)
    setActiveTab(id)
  }

  const closeCampaign = (id: string) => {
    setOpenCampaignIds((current) => current.filter((openId) => openId !== id))
    if (activeTab === id) setActiveTab('browser')
  }

  const createCampaign = async () => {
    const createdId = await createDocument({
      _type: 'marketingCampaign',
      title: '',
      slug: { _type: 'slug', current: `new-campaign-${Date.now()}` },
      status: 'idea',
    })
    openCampaign(createdId)
  }
  const showCampaignTabs = activeTab !== 'browser'

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <PanelHeading title="Campaigns" description="Organize campaign strategy, timing, content, funnels, and measurement." />
        <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createCampaign()}>
          Add campaign
        </button>
      </div>

      {showCampaignTabs && (
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
            All campaigns
          </FunnelTabButton>
          {openCampaignIds.map((id) => {
            const campaign = data.campaigns.find((candidate) => candidate._id === id)
            if (!campaign) return null
            return (
              <FunnelTabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {campaign.title || 'Untitled campaign'}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${campaign.title || 'campaign'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeCampaign(id)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {data.campaigns.map((campaign) => {
            const campaignCalendarItems = data.calendarItems.filter((item) => item.campaign?._id === campaign._id)
            return (
              <div
                key={campaign._id}
                style={{
                  ...styles.card,
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                  borderColor: selectedId === campaign._id ? '#007385' : 'var(--card-border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong>{campaign.title || 'Untitled campaign'}</strong>
                  <StatusPill status={campaign.status} options={campaignStatusOptions} />
                </div>
                <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
                  {trimDescription(campaign.primaryGoal) || 'No goal written yet.'}
                </p>
                <div style={{ ...styles.small, ...styles.muted }}>
                  {[
                    labelFor(campaignObjectiveOptions, campaign.campaignObjective) || 'No objective',
                    dateRange(campaign.startDate, campaign.endDate) || 'No dates',
                    campaign.primaryKpi || 'No KPI',
                    `${campaignCalendarItems.length} calendar item${campaignCalendarItems.length === 1 ? '' : 's'}`,
                    `${campaign.funnels?.length || 0} funnel link${(campaign.funnels?.length || 0) === 1 ? '' : 's'}`,
                  ].join(' / ')}
                </div>
                {getCampaignChannelKeys(campaign).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {getCampaignChannelKeys(campaign).slice(0, 5).map((channel) => (
                      <span key={channel} style={{ ...styles.small, border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '3px 8px' }}>
                        {getChannelByKey(data.channels, channel)?.title || channel}
                      </span>
                    ))}
                  </div>
                )}
                <button type="button" style={styles.primaryButton} onClick={() => openCampaign(campaign._id)}>
                  Open campaign
                </button>
              </div>
            )
          })}
          {data.campaigns.length === 0 && (
            <EmptyPanel
              icon={TargetIcon}
              title="No campaigns yet"
              description="Add a campaign, then fill its strategy in the editor."
            />
          )}
        </div>
      ) : (
        <CampaignEditor
          campaign={activeCampaign}
          channels={data.channels}
          funnels={data.funnels}
          analyticsSources={data.analyticsSources}
          calendarItems={data.calendarItems}
          campaignTemplates={campaignTemplates}
          analyticsTakeaways={buildAnalyticsInterpretations(data)}
          saving={savingId === activeCampaign?._id}
          onSave={commitPatch}
        />
      )}
    </section>
  )
}

function CampaignEditor({
  campaign,
  channels,
  funnels,
  analyticsSources,
  calendarItems,
  campaignTemplates,
  analyticsTakeaways,
  saving,
  onSave,
}: {
  campaign: MarketingCampaign | null
  channels: MarketingChannel[]
  funnels: MarketingFunnel[]
  analyticsSources: MarketingAnalyticsSource[]
  calendarItems: MarketingCalendarItem[]
  campaignTemplates: CampaignTemplate[]
  analyticsTakeaways: AnalyticsInterpretation[]
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingCampaign | null>(campaign)

  useEffect(() => setDraft(campaign), [campaign])

  if (!draft || !campaign) {
    return (
      <EmptyPanel
        icon={TargetIcon}
        title="Select a campaign"
        description="Create or choose a campaign to edit its strategy."
      />
    )
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled campaign',
      slug: { _type: 'slug', current: slugify(draft.title || 'untitled-campaign') },
      status: draft.status || 'idea',
      startDate: draft.startDate,
      endDate: draft.endDate,
      primaryGoal: draft.primaryGoal,
      campaignObjective: draft.campaignObjective,
      audience: draft.audience,
      topicCluster: draft.topicCluster,
      searchIntent: draft.searchIntent,
      targetQueries: draft.targetQueries || [],
      positioning: draft.positioning,
      canonicalUrl: draft.canonicalUrl,
      channels: draft.channels || [],
      channelRefs: refsFromIds((draft.channelRefs || []).map((channel) => channel._id)),
      funnels: refsFromIds((draft.funnels || []).map((funnel) => funnel._id)),
      analyticsSources: refsFromIds((draft.analyticsSources || []).map((source) => source._id)),
      successMetrics: normalizeSuccessMetrics(draft.successMetrics || []),
      primaryKpi: draft.primaryKpi,
      utmCampaign: draft.utmCampaign,
      notes: draft.notes,
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(campaign._id, set, unset)
  }

  const applyCampaignTemplate = (template: CampaignTemplate) => {
    const channelRefs = template.channels
      .map((key) => getChannelByKey(channels, key))
      .filter(Boolean) as MarketingChannel[]

    setDraft({
      ...draft,
      campaignObjective: draft.campaignObjective || template.campaignObjective,
      primaryGoal: draft.primaryGoal || template.primaryGoal,
      primaryKpi: draft.primaryKpi || template.primaryKpi,
      audience: draft.audience || template.audience,
      topicCluster: draft.topicCluster || template.topicCluster,
      searchIntent: draft.searchIntent || template.searchIntent,
      targetQueries: draft.targetQueries?.length ? draft.targetQueries : template.targetQueries,
      positioning: draft.positioning || template.positioning,
      utmCampaign: draft.utmCampaign || slugify(draft.title || template.title),
      channels: Array.from(new Set([...(draft.channels || []), ...template.channels])),
      channelRefs: uniqueById([...(draft.channelRefs || []), ...channelRefs]),
      successMetrics: draft.successMetrics?.length ? draft.successMetrics : normalizeSuccessMetrics(template.successMetrics),
      notes: draft.notes || template.notes,
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const campaignSuggestion = suggestion.campaign || {}
    setDraft({
      ...draft,
      title: aiString(campaignSuggestion.title) || draft.title,
      campaignObjective: aiOption(campaignSuggestion.campaignObjective, campaignObjectiveOptions) || draft.campaignObjective,
      primaryGoal: aiString(campaignSuggestion.primaryGoal) || draft.primaryGoal,
      primaryKpi: aiString(campaignSuggestion.primaryKpi) || draft.primaryKpi,
      audience: aiString(campaignSuggestion.audience) || draft.audience,
      topicCluster: aiString(campaignSuggestion.topicCluster) || draft.topicCluster,
      searchIntent: aiOption(campaignSuggestion.searchIntent, searchIntentOptions) || draft.searchIntent,
      targetQueries: aiStringList(campaignSuggestion.targetQueries) || draft.targetQueries,
      positioning: aiString(campaignSuggestion.positioning) || draft.positioning,
      canonicalUrl: aiString(campaignSuggestion.canonicalUrl) || draft.canonicalUrl,
      utmCampaign: aiString(campaignSuggestion.utmCampaign) || draft.utmCampaign,
      notes: aiString(campaignSuggestion.notes) || draft.notes,
    })
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Campaign editor" type="marketingCampaign" id={campaign._id} />
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <TemplateRail
            title="Campaign templates"
            description="Pick the closest pattern. It fills the strategy prompts, channels, and starter metrics."
            templates={campaignTemplates}
            onApply={applyCampaignTemplate}
          />
          <MarketingAiAssistPanel
            kind="campaign"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={analyticsTakeaways}
            onApply={applyAiSuggestion}
          />
          <GuidanceChecklist
            title="Strategy checklist"
            items={[
              { label: 'Objective is broader than one post', done: !!draft.campaignObjective },
              { label: 'Primary goal says what should change', done: !!draft.primaryGoal?.trim() },
              { label: 'Primary KPI names the success metric', done: !!draft.primaryKpi?.trim() },
              { label: 'Audience is specific enough to design for', done: !!draft.audience?.trim() },
              {
                label: 'Topic, intent, or target phrases guide titles and captions',
                done: !!draft.topicCluster?.trim() || !!draft.searchIntent || (draft.targetQueries || []).length > 0,
              },
              { label: 'Positioning explains the useful idea', done: !!draft.positioning?.trim() },
              { label: 'Stable UTM campaign name is set', done: !!draft.utmCampaign?.trim() },
              { label: 'At least one channel is selected', done: (draft.channels || []).length > 0 || (draft.channelRefs || []).length > 0 },
              { label: 'A funnel or next-step path is attached', done: (draft.funnels || []).length > 0 },
            ]}
          />
          <InputField label="What should we call this campaign?" help="Use a simple name designers can recognize when linking calendar items.">
            <input
              style={styles.input}
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
            />
          </InputField>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="What is the main goal?">
              <Select
                value={draft.campaignObjective || ''}
                options={[{ title: 'Choose objective...', value: '' }, ...campaignObjectiveOptions]}
                onChange={(campaignObjective) => setDraft({ ...draft, campaignObjective })}
              />
            </InputField>
            <InputField label="How will we know it worked?">
              <input
                style={styles.input}
                value={draft.primaryKpi || ''}
                onChange={(event) => setDraft({ ...draft, primaryKpi: event.currentTarget.value })}
                placeholder="e.g. qualified conversations"
              />
            </InputField>
          </div>
          <InputField label="What should change because this campaign exists?" help="Write the outcome in plain language, not a slogan.">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.primaryGoal || ''}
              onChange={(event) => setDraft({ ...draft, primaryGoal: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Who should this reach?">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.audience || ''}
              onChange={(event) => setDraft({ ...draft, audience: event.currentTarget.value })}
            />
          </InputField>
          <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Discovery and search cues</h3>
            <p style={{ ...styles.small, ...styles.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
              Optional, but useful when captions, titles, articles, or social posts need to meet how people actually describe the problem.
            </p>
            <Stack gap={10}>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InputField label="Topic / keyword cluster">
                  <input
                    style={styles.input}
                    value={draft.topicCluster || ''}
                    onChange={(event) => setDraft({ ...draft, topicCluster: event.currentTarget.value })}
                    placeholder="e.g. healthcare service design"
                  />
                </InputField>
                <InputField label="Visitor intent">
                  <Select
                    value={draft.searchIntent || ''}
                    options={[{ title: 'No intent selected', value: '' }, ...searchIntentOptions]}
                    onChange={(searchIntent) => setDraft({ ...draft, searchIntent })}
                  />
                </InputField>
              </div>
              <InputField label="Target queries / phrases">
                <textarea
                  rows={3}
                  style={styles.input}
                  value={(draft.targetQueries || []).join('\n')}
                  onChange={(event) => setDraft({ ...draft, targetQueries: stringListFromText(event.currentTarget.value) })}
                  placeholder={'One phrase per line\ne.g. healthcare design case study'}
                />
              </InputField>
            </Stack>
          </div>
          <InputField label="What useful idea should the campaign carry?">
            <textarea
              rows={5}
              style={styles.input}
              value={draft.positioning || ''}
              onChange={(event) => setDraft({ ...draft, positioning: event.currentTarget.value })}
            />
          </InputField>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Where should interested people go?">
              <input
                style={styles.input}
                value={draft.canonicalUrl || ''}
                onChange={(event) => setDraft({ ...draft, canonicalUrl: event.currentTarget.value })}
                placeholder="https://..."
              />
            </InputField>
            <InputField label="How should analytics name this campaign?">
              <input
                style={styles.input}
                value={draft.utmCampaign || ''}
                onChange={(event) => setDraft({ ...draft, utmCampaign: optionalSlug(event.currentTarget.value) })}
                placeholder={slugify(draft.title || 'campaign-name')}
              />
            </InputField>
          </div>
          <InputField label="What should the team remember?">
            <textarea
              rows={5}
              style={styles.input}
              value={draft.notes || ''}
              onChange={(event) => setDraft({ ...draft, notes: event.currentTarget.value })}
            />
          </InputField>
        </Stack>

        <Stack gap={12}>
          <InputField label="Where is this campaign in the workflow?">
            <Select
              value={draft.status || 'idea'}
              options={campaignStatusOptions}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </InputField>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="When should it start?">
              <input
                type="date"
                style={styles.input}
                value={draft.startDate || ''}
                onChange={(event) => setDraft({ ...draft, startDate: event.currentTarget.value })}
              />
            </InputField>
            <InputField label="When should it end?">
              <input
                type="date"
                style={styles.input}
                value={draft.endDate || ''}
                onChange={(event) => setDraft({ ...draft, endDate: event.currentTarget.value })}
              />
            </InputField>
          </div>
          <InputField label="Where will we publish or promote it?">
            <div style={{ display: 'grid', gap: 8 }}>
              {getChannelOptions(channels).map((option) => {
                const checked = draft.channels?.includes(option.value) || false
                const channel = getChannelByKey(channels, option.value)
                return (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const current = draft.channels || []
                        const nextChannels = event.currentTarget.checked
                          ? [...current, option.value]
                          : current.filter((value) => value !== option.value)
                        const currentRefs = draft.channelRefs || []
                        const nextRefs = event.currentTarget.checked && channel
                          ? [...currentRefs.filter((ref) => ref._id !== channel._id), channel]
                          : currentRefs.filter((ref) => ref.key !== option.value)
                        setDraft({ ...draft, channels: nextChannels, channelRefs: nextRefs })
                      }}
                    />
                    {option.title}
                  </label>
                )
              })}
            </div>
          </InputField>
          <RelationshipChecklist
            title="Funnels"
            items={funnels}
            selectedIds={(draft.funnels || []).map((funnel) => funnel._id)}
            getSubtitle={(funnel) =>
              [
                labelFor(funnelStatusOptions, funnel.status),
                `${funnel.stages?.length || 0} stages`,
              ].filter(Boolean).join(' / ')
            }
            onChange={(ids) => setDraft({ ...draft, funnels: ids.map((id) => funnels.find((funnel) => funnel._id === id)).filter(Boolean) as RefSummary[] })}
          />
          <RelationshipChecklist
            title="Analytics sources"
            items={analyticsSources}
            selectedIds={(draft.analyticsSources || []).map((source) => source._id)}
            getSubtitle={(source) => labelFor(analyticsProviderOptions, source.provider)}
            onChange={(ids) =>
              setDraft({
                ...draft,
                analyticsSources: ids.map((id) => analyticsSources.find((source) => source._id === id)).filter(Boolean) as RefSummary[],
              })
            }
          />
          <RelationshipUsagePanel
            title="Calendar items in this campaign"
            items={calendarItems.filter((item) => item.campaign?._id === campaign._id)}
            emptyText="No calendar items are assigned to this campaign yet."
            renderMeta={(item) =>
              [
                toDateInputValue(item.publishAt),
                item.channelRef?.title || getChannelByKey(channels, item.channel)?.title || item.channel,
                item.funnel?.title,
              ].filter(Boolean).join(' / ')
            }
          />
          <MetricSummary metrics={draft.successMetrics || []} />
          <AdvancedFieldsDropdown type="marketingCampaign" id={campaign._id} />
          <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save campaign'}
          </button>
        </Stack>
      </div>
    </section>
  )
}
