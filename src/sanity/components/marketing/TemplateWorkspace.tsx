import { useEffect, useMemo, useState } from 'react'
import { DashboardIcon } from '@sanity/icons'
import { useToast } from '@sanity/ui'

import { randomKey } from '@/lib/marketing'
import { useConfirmDialog } from './ConfirmDialog'
import { campaignObjectiveOptions, searchIntentOptions } from '../../schemas/marketingCampaign'
import { funnelStageOptions } from '../../schemas/marketingFunnel'
import { marketingTemplateKindOptions, marketingTemplateStatusOptions } from '../../schemas/marketingTemplate'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports TemplateWorkspace only for JSX
// rendering, and TemplateWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  AdvancedFieldsDropdown,
  aiFunnelStages,
  aiOption,
  aiString,
  aiStringList,
  aiTemplateSuccessMetrics,
  buildAnalyticsInterpretations,
  EmptyInline,
  EmptyPanel,
  emptyKeys,
  GuidanceChecklist,
  InputField,
  labelFor,
  MarketingAiAssistPanel,
  normalizeFunnelStages,
  normalizeStringList,
  normalizeSuccessMetrics,
  PanelHeading,
  PanelTitle,
  Select,
  Stack,
  StatusPill,
  styles,
  useMarketingUnsavedGuard,
  type FunnelStage,
  type MarketingAiSuggestion,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingTemplate,
  type StudioClient,
} from '../../tools/marketingTool'

// Template-only: the starter document each "Add template" button creates. Used
// solely by this workspace, so it lives here instead of in the shared tool.
function defaultMarketingTemplateDocument(kind: 'campaign' | 'funnel'): MarketingDocumentInput {
  if (kind === 'campaign') {
    return {
      _type: 'marketingTemplate',
      title: '',
      kind: 'campaign',
      status: 'active',
      order: 100,
      campaignObjective: 'awareness',
      searchIntent: 'learn',
      targetQueries: [],
      channels: [],
      successMetrics: [],
      designerGuidance: [],
    }
  }

  return {
    _type: 'marketingTemplate',
    title: '',
    kind: 'funnel',
    status: 'active',
    order: 100,
    stages: [],
  }
}

interface TemplateWorkspaceProps {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}

export function TemplateWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: TemplateWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(data.templates[0]?._id || null)
  const [kindFilter, setKindFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)
  const toast = useToast()
  const { confirm, confirmDialog } = useConfirmDialog()
  const { clearUnsavedChanges, markUnsavedChange } = useMarketingUnsavedGuard()
  const filteredTemplates = useMemo(
    () => data.templates.filter((template) => kindFilter === 'all' || template.kind === kindFilter),
    [data.templates, kindFilter],
  )
  const selected = data.templates.find((template) => template._id === selectedId) || null

  useEffect(() => {
    if (selectedId && data.templates.some((template) => template._id === selectedId)) return
    setSelectedId(filteredTemplates[0]?._id || data.templates[0]?._id || null)
  }, [data.templates, filteredTemplates, selectedId])

  useEffect(() => {
    if (editorDirty) markUnsavedChange('marketing-template-editor', 'template draft')
    else clearUnsavedChanges('marketing-template-editor')
  }, [clearUnsavedChanges, editorDirty, markUnsavedChange])

  const prepareToSwitch = async () => {
    if (!editorDirty) return true
    const shouldDiscard = await confirm({
      title: 'Discard unsaved changes?',
      message: `Discard unsaved changes to "${selected?.title || 'Untitled template'}"? Your edits will be lost.`,
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      tone: 'caution',
    })
    if (!shouldDiscard) return false
    clearUnsavedChanges('marketing-template-editor')
    setEditorDirty(false)
    return true
  }

  const createTemplate = async (kind: 'campaign' | 'funnel') => {
    if (!(await prepareToSwitch())) return
    const createdId = await createDocument(defaultMarketingTemplateDocument(kind))
    setKindFilter(kind)
    setSelectedId(createdId)
  }

  const selectTemplate = async (id: string) => {
    if (id === selectedId || !(await prepareToSwitch())) return
    setSelectedId(id)
  }

  const selectKindFilter = async (kind: string) => {
    if (kind === kindFilter || !(await prepareToSwitch())) return
    setKindFilter(kind)
  }

  const deleteTemplate = async (template: MarketingTemplate) => {
    try {
      const blockers = await client.fetch<Array<{ _id: string; _type: string; title?: string }>>(
        '*[references($id)]{_id, _type, title}',
        { id: template._id },
      )
      if (blockers.length > 0) {
        toast.push({
          status: 'warning',
          title: 'Template is still in use',
          description: `Disconnect it from ${blockers.length} referring record${blockers.length === 1 ? '' : 's'} first. No records were changed.`,
        })
        return
      }

      const message = `Delete "${template.title || 'Untitled template'}"? Existing campaigns and funnels created from it will not change, but this template will disappear from future pickers.`
      if (!(await confirm({ title: 'Delete template?', message, confirmLabel: 'Delete' }))) return

      setDeletingId(template._id)
      await client.delete(template._id)
      setSelectedId(data.templates.find((candidate) => candidate._id !== template._id)?._id || null)
      await loadData()
      toast.push({ status: 'success', title: `Deleted "${template.title || 'template'}"` })
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not delete template',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '390px minmax(0, 1fr)', gap: 16 }}>
      {confirmDialog}
      <section style={styles.panel}>
        <PanelHeading
          title="Templates"
          description="Create reusable campaign and funnel setup patterns that designers can pick from instead of rebuilding strategy every time."
        />
        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createTemplate('campaign')}>
            Add campaign template
          </button>
          <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createTemplate('funnel')}>
            Add funnel template
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
          {[
            { title: 'All', value: 'all' },
            { title: 'Campaigns', value: 'campaign' },
            { title: 'Funnels', value: 'funnel' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              style={{
                ...styles.button,
                padding: '8px 10px',
                borderColor: kindFilter === option.value ? '#007385' : 'var(--card-border-color)',
                background: kindFilter === option.value ? 'rgba(0, 115, 133, 0.10)' : 'var(--card-bg-color)',
              }}
              onClick={() => void selectKindFilter(option.value)}
            >
              {option.title}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredTemplates.map((template) => (
            <button
              key={template._id}
              type="button"
              style={{
                ...styles.templateButton,
                borderColor: selectedId === template._id ? '#007385' : 'var(--card-border-color)',
                background: selectedId === template._id ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
              }}
              onClick={() => void selectTemplate(template._id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <strong style={{ fontSize: 13 }}>{template.title || 'Untitled template'}</strong>
                <StatusPill status={template.status} options={marketingTemplateStatusOptions} />
              </div>
              <span style={{ ...styles.small, ...styles.muted }}>
                {labelFor(marketingTemplateKindOptions, template.kind)} / {template.description || 'No description yet'}
              </span>
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <EmptyInline title="No managed templates in this category yet. Built-in starter templates still appear in the campaign and funnel creation flows." />
          )}
        </div>
      </section>

      <TemplateEditor
        template={selected}
        data={data}
        saving={savingId === selected?._id || deletingId === selected?._id}
        onSave={commitPatch}
        onDelete={deleteTemplate}
        onDirtyChange={setEditorDirty}
      />
    </div>
  )
}

function TemplateEditor({
  template,
  data,
  saving,
  onSave,
  onDelete,
  onDirtyChange,
}: {
  template: MarketingTemplate | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onDelete: (template: MarketingTemplate) => Promise<void>
  onDirtyChange: (dirty: boolean) => void
}) {
  const [draft, setDraft] = useState<MarketingTemplate | null>(template)
  const { confirm, confirmDialog } = useConfirmDialog()

  useEffect(() => setDraft(template), [template])

  const dirty = Boolean(draft && template && JSON.stringify(draft) !== JSON.stringify(template))

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  if (!draft || !template) {
    return <EmptyPanel icon={DashboardIcon} title="Select a template" description="Create or choose a template to manage its reusable setup fields." />
  }

  const isCampaign = draft.kind !== 'funnel'

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const templateSuggestion = suggestion.template || {}
    const nextKind = aiOption(templateSuggestion.kind, marketingTemplateKindOptions) || draft.kind || 'campaign'
    const nextDraft: MarketingTemplate = {
      ...draft,
      title: aiString(templateSuggestion.title) || draft.title,
      kind: nextKind,
      status: aiOption(templateSuggestion.status, marketingTemplateStatusOptions) || draft.status || 'active',
      description: aiString(templateSuggestion.description) || draft.description,
      whenToUse: aiString(templateSuggestion.whenToUse) || draft.whenToUse,
      audience: aiString(templateSuggestion.audience) || draft.audience,
    }

    if (nextKind === 'funnel') {
      nextDraft.conversionGoal = aiString(templateSuggestion.conversionGoal) || draft.conversionGoal
      nextDraft.stages = aiFunnelStages(templateSuggestion.stages) || draft.stages
    } else {
      nextDraft.campaignObjective = aiOption(templateSuggestion.campaignObjective, campaignObjectiveOptions) || draft.campaignObjective
      nextDraft.primaryGoal = aiString(templateSuggestion.primaryGoal) || draft.primaryGoal
      nextDraft.primaryKpi = aiString(templateSuggestion.primaryKpi) || draft.primaryKpi
      nextDraft.topicCluster = aiString(templateSuggestion.topicCluster) || draft.topicCluster
      nextDraft.searchIntent = aiOption(templateSuggestion.searchIntent, searchIntentOptions) || draft.searchIntent
      nextDraft.targetQueries = aiStringList(templateSuggestion.targetQueries) || draft.targetQueries
      nextDraft.positioning = aiString(templateSuggestion.positioning) || draft.positioning
      nextDraft.channels = aiStringList(templateSuggestion.channels) || draft.channels
      nextDraft.successMetrics = aiTemplateSuccessMetrics(templateSuggestion.successMetrics) || draft.successMetrics
      nextDraft.designerGuidance = aiStringList(templateSuggestion.designerGuidance) || draft.designerGuidance
      nextDraft.notes = aiString(templateSuggestion.notes) || draft.notes
    }

    setDraft(nextDraft)
  }

  const save = async () => {
    if ((draft.kind || 'campaign') !== (template.kind || 'campaign')) {
      const convertingTo = draft.kind === 'funnel' ? 'funnel' : 'campaign'
      const fieldsRemoved = convertingTo === 'funnel'
        ? 'campaign goals, search targeting, channels, metrics, guidance, and notes'
        : 'the funnel conversion goal and stage map'
      const shouldConvert = await confirm({
        title: `Convert to a ${convertingTo} template?`,
        message: `Saving this type change permanently removes ${fieldsRemoved} from this template. This cannot be undone from this screen.`,
        confirmLabel: 'Convert and save',
        cancelLabel: 'Keep editing',
        tone: 'caution',
      })
      if (!shouldConvert) return
    }
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled template',
      kind: isCampaign ? 'campaign' : 'funnel',
      status: draft.status || 'active',
      description: draft.description,
      whenToUse: draft.whenToUse,
      order: draft.order,
      audience: draft.audience,
    }
    const unset: string[] = []

    if (isCampaign) {
      Object.assign(set, {
        campaignObjective: draft.campaignObjective || 'awareness',
        primaryGoal: draft.primaryGoal,
        primaryKpi: draft.primaryKpi,
        topicCluster: draft.topicCluster,
        searchIntent: draft.searchIntent || 'learn',
        targetQueries: normalizeStringList(draft.targetQueries || []),
        positioning: draft.positioning,
        channels: normalizeStringList(draft.channels || []),
        successMetrics: normalizeSuccessMetrics(draft.successMetrics || []),
        designerGuidance: normalizeStringList(draft.designerGuidance || []),
        notes: draft.notes,
      })
      unset.push('conversionGoal', 'stages')
    } else {
      Object.assign(set, {
        conversionGoal: draft.conversionGoal,
        stages: normalizeFunnelStages(draft.stages || []),
      })
      unset.push('campaignObjective', 'primaryGoal', 'primaryKpi', 'topicCluster', 'searchIntent', 'targetQueries', 'positioning', 'channels', 'successMetrics', 'designerGuidance', 'notes')
    }

    const empty = emptyKeys(set)
    empty.forEach((key) => delete set[key])
    await onSave(template._id, set, [...unset, ...empty])
  }

  return (
    <section style={styles.panel}>
      {confirmDialog}
      <PanelTitle title="Template editor" type="marketingTemplate" id={template._id} />
      {dirty && <div role="status" style={{ ...styles.small, color: '#9a5a00', marginBottom: 12 }}>Unsaved template changes</div>}
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', gap: 10 }}>
            <InputField label="Template title">
              <input style={styles.input} value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} />
            </InputField>
            <InputField label="Type">
              <Select value={draft.kind || 'campaign'} options={marketingTemplateKindOptions} onChange={(kind) => setDraft({ ...draft, kind })} />
            </InputField>
            <InputField label="Status">
              <Select value={draft.status || 'active'} options={marketingTemplateStatusOptions} onChange={(status) => setDraft({ ...draft, status })} />
            </InputField>
          </div>
          <InputField label="Short description">
            <textarea rows={2} style={styles.input} value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })} />
          </InputField>
          <InputField label="When to use">
            <textarea rows={3} style={styles.input} value={draft.whenToUse || ''} onChange={(event) => setDraft({ ...draft, whenToUse: event.currentTarget.value })} />
          </InputField>
          <InputField label="Audience">
            <textarea rows={3} style={styles.input} value={draft.audience || ''} onChange={(event) => setDraft({ ...draft, audience: event.currentTarget.value })} />
          </InputField>

          {isCampaign ? (
            <CampaignTemplateFields draft={draft} onChange={setDraft} />
          ) : (
            <FunnelTemplateFields draft={draft} onChange={setDraft} />
          )}
        </Stack>

        <Stack gap={12}>
          <MarketingAiAssistPanel
            kind="template"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={buildAnalyticsInterpretations(data)}
            onApply={applyAiSuggestion}
          />
          <GuidanceChecklist
            title="Template checklist"
            items={[
              { label: 'Title is specific', done: !!draft.title?.trim() },
              { label: 'When to use is clear', done: !!draft.whenToUse?.trim() },
              { label: 'Audience is defined', done: !!draft.audience?.trim() },
              isCampaign
                ? { label: 'Campaign has KPI and goal', done: !!draft.primaryGoal?.trim() && !!draft.primaryKpi?.trim() }
                : { label: 'Funnel has stages and CTA', done: (draft.stages || []).length > 0 && (draft.stages || []).some((stage) => !!stage.callToAction?.trim()) },
            ]}
          />
          <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Used by creation flows</h3>
            <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
              Active managed templates appear before built-in fallbacks when designers create a new campaign or funnel.
            </p>
          </div>
          <AdvancedFieldsDropdown type="marketingTemplate" id={template._id} />
          <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save template'}
          </button>
          <button
            type="button"
            style={{ ...styles.button, borderColor: 'rgba(227, 98, 22, 0.45)', color: '#E36216' }}
            disabled={saving}
            onClick={() => void onDelete(template)}
          >
            Delete template
          </button>
        </Stack>
      </div>
    </section>
  )
}

function CampaignTemplateFields({
  draft,
  onChange,
}: {
  draft: MarketingTemplate
  onChange: (draft: MarketingTemplate) => void
}) {
  return (
    <Stack gap={12}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10 }}>
        <InputField label="Objective">
          <Select
            value={draft.campaignObjective || 'awareness'}
            options={campaignObjectiveOptions}
            onChange={(campaignObjective) => onChange({ ...draft, campaignObjective })}
          />
        </InputField>
        <InputField label="Search intent">
          <Select
            value={draft.searchIntent || 'learn'}
            options={searchIntentOptions}
            onChange={(searchIntent) => onChange({ ...draft, searchIntent })}
          />
        </InputField>
        <InputField label="Order">
          <input
            type="number"
            style={styles.input}
            value={draft.order ?? 100}
            onChange={(event) => onChange({ ...draft, order: Number(event.currentTarget.value) })}
          />
        </InputField>
      </div>
      <InputField label="Primary goal">
        <textarea rows={3} style={styles.input} value={draft.primaryGoal || ''} onChange={(event) => onChange({ ...draft, primaryGoal: event.currentTarget.value })} />
      </InputField>
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <InputField label="Primary KPI">
          <input style={styles.input} value={draft.primaryKpi || ''} onChange={(event) => onChange({ ...draft, primaryKpi: event.currentTarget.value })} />
        </InputField>
        <InputField label="Topic / keyword cluster">
          <input style={styles.input} value={draft.topicCluster || ''} onChange={(event) => onChange({ ...draft, topicCluster: event.currentTarget.value })} />
        </InputField>
      </div>
      <InputField label="Positioning">
        <textarea rows={3} style={styles.input} value={draft.positioning || ''} onChange={(event) => onChange({ ...draft, positioning: event.currentTarget.value })} />
      </InputField>
      <StringListEditor title="Target queries" items={draft.targetQueries || []} placeholder="Add a search phrase" onChange={(targetQueries) => onChange({ ...draft, targetQueries })} />
      <StringListEditor title="Starter channel keys" items={draft.channels || []} placeholder="website, instagram, linkedin..." onChange={(channels) => onChange({ ...draft, channels })} />
      <SuccessMetricListEditor metrics={draft.successMetrics || []} onChange={(successMetrics) => onChange({ ...draft, successMetrics })} />
      <StringListEditor title="Designer guidance" items={draft.designerGuidance || []} placeholder="Add a production note" onChange={(designerGuidance) => onChange({ ...draft, designerGuidance })} />
      <InputField label="Notes">
        <textarea rows={4} style={styles.input} value={draft.notes || ''} onChange={(event) => onChange({ ...draft, notes: event.currentTarget.value })} />
      </InputField>
    </Stack>
  )
}

function FunnelTemplateFields({
  draft,
  onChange,
}: {
  draft: MarketingTemplate
  onChange: (draft: MarketingTemplate) => void
}) {
  return (
    <Stack gap={12}>
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
        <InputField label="Conversion goal">
          <textarea rows={3} style={styles.input} value={draft.conversionGoal || ''} onChange={(event) => onChange({ ...draft, conversionGoal: event.currentTarget.value })} />
        </InputField>
        <InputField label="Order">
          <input
            type="number"
            style={styles.input}
            value={draft.order ?? 100}
            onChange={(event) => onChange({ ...draft, order: Number(event.currentTarget.value) })}
          />
        </InputField>
      </div>
      <FunnelStageListEditor stages={draft.stages || []} onChange={(stages) => onChange({ ...draft, stages })} />
    </Stack>
  )
}

function StringListEditor({
  title,
  items,
  placeholder,
  onChange,
}: {
  title: string
  items: string[]
  placeholder: string
  onChange: (items: string[]) => void
}) {
  const [newItem, setNewItem] = useState('')
  const normalized = normalizeStringList(items)

  const addItem = () => {
    if (!newItem.trim()) return
    onChange([...normalized, newItem.trim()])
    setNewItem('')
  }

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {normalized.map((item, index) => (
          <div key={`${item}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              style={styles.input}
              value={item}
              onChange={(event) => onChange(normalized.map((value, valueIndex) => (valueIndex === index ? event.currentTarget.value : value)))}
            />
            <button type="button" style={styles.button} onClick={() => onChange(normalized.filter((_, valueIndex) => valueIndex !== index))}>
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input style={styles.input} value={newItem} placeholder={placeholder} onChange={(event) => setNewItem(event.currentTarget.value)} />
          <button type="button" style={styles.button} onClick={addItem}>
            Add item
          </button>
        </div>
      </div>
    </div>
  )
}

function SuccessMetricListEditor({
  metrics,
  onChange,
}: {
  metrics: Array<{ _key?: string; label?: string; target?: string }>
  onChange: (metrics: Array<{ _key?: string; label?: string; target?: string }>) => void
}) {
  const normalized = (metrics || []).map((metric) => ({ ...metric, _key: metric._key || randomKey() }))
  const updateMetric = (key: string, patch: { label?: string; target?: string }) => {
    onChange(normalized.map((metric) => (metric._key === key ? { ...metric, ...patch } : metric)))
  }

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Success metrics</h3>
        <button type="button" style={styles.button} onClick={() => onChange([...normalized, { _key: randomKey(), label: '', target: '' }])}>
          Add metric
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {normalized.map((metric) => (
          <div key={metric._key} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
              <input style={styles.input} value={metric.label || ''} placeholder="Metric" onChange={(event) => updateMetric(metric._key || '', { label: event.currentTarget.value })} />
              <button type="button" style={styles.button} onClick={() => onChange(normalized.filter((candidate) => candidate._key !== metric._key))}>
                Remove
              </button>
            </div>
            <textarea rows={2} style={styles.input} value={metric.target || ''} placeholder="How should we judge it?" onChange={(event) => updateMetric(metric._key || '', { target: event.currentTarget.value })} />
          </div>
        ))}
        {normalized.length === 0 && <EmptyInline title="No metrics yet. Add the one or two signals designers should care about." />}
      </div>
    </div>
  )
}

function FunnelStageListEditor({
  stages,
  onChange,
}: {
  stages: FunnelStage[]
  onChange: (stages: FunnelStage[]) => void
}) {
  const normalized = normalizeFunnelStages(stages || [])
  const updateStage = (key: string, patch: Partial<FunnelStage>) => {
    onChange(normalized.map((stage) => (stage._key === key ? { ...stage, ...patch } : stage)))
  }

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Funnel stages</h3>
        <button
          type="button"
          style={styles.button}
          onClick={() => onChange([...normalized, { _key: randomKey(), _type: 'funnelStage', stage: 'awareness', goal: '', callToAction: '', metrics: [] }])}
        >
          Add funnel stage
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {normalized.map((stage, index) => (
          <div key={stage._key} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 8, marginBottom: 8 }}>
              <Select ariaLabel={`Funnel stage ${index + 1}`} value={stage.stage || 'awareness'} options={funnelStageOptions} onChange={(value) => updateStage(stage._key, { stage: value })} />
              <input style={styles.input} value={stage.callToAction || ''} placeholder="CTA" onChange={(event) => updateStage(stage._key, { callToAction: event.currentTarget.value })} />
              <button type="button" style={styles.button} onClick={() => onChange(normalized.filter((candidate) => candidate._key !== stage._key))}>
                Remove
              </button>
            </div>
            <textarea rows={2} style={{ ...styles.input, marginBottom: 8 }} value={stage.goal || ''} placeholder="Stage goal" onChange={(event) => updateStage(stage._key, { goal: event.currentTarget.value })} />
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={styles.input} value={stage.offer || ''} placeholder="Offer" onChange={(event) => updateStage(stage._key, { offer: event.currentTarget.value })} />
              <input
                style={styles.input}
                value={(stage.metrics || []).join(', ')}
                placeholder="Metrics"
                onChange={(event) =>
                  updateStage(stage._key, {
                    metrics: event.currentTarget.value
                      .split(',')
                      .map((metric) => metric.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
        ))}
        {normalized.length === 0 && <EmptyInline title="No stages yet. Add the path a visitor should move through." />}
      </div>
    </div>
  )
}
