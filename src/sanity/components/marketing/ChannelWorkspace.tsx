import { useEffect, useState } from 'react'
import { LaunchIcon, TagIcon } from '@sanity/icons'

import { randomKey, slugify } from '@/lib/marketing'
import { channelPlatformOptions, channelStatusOptions } from '../../schemas/marketingChannel'
import { funnelStageOptions } from '../../schemas/marketingFunnel'
import { getChannelUsage, normalizeContentTypes } from './shared'
import { PublishConnectionStatus } from './PublishConnectionStatus'
import type { ChannelContentType } from './types'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports ChannelWorkspace only for JSX
// rendering, and ChannelWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  advancedEditHref,
  aiChannelPlatform,
  aiContentTypes,
  aiOption,
  aiString,
  buildAnalyticsInterpretations,
  EmptyInline,
  EmptyPanel,
  emptyKeys,
  InputField,
  MarketingAiAssistPanel,
  PanelHeading,
  Select,
  Stack,
  StatusPill,
  styles,
  type MarketingAiSuggestion,
  type MarketingChannel,
  type MarketingData,
  type MarketingDocumentInput,
  type StudioClient,
} from '../../tools/marketingTool'

interface ChannelWorkspaceProps {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}

export function ChannelWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: ChannelWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(data.channels[0]?._id || null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const selected = data.channels.find((channel) => channel._id === selectedId) || null

  useEffect(() => {
    if (!selectedId && data.channels.length > 0) setSelectedId(data.channels[0]._id)
  }, [data.channels, selectedId])

  const createChannel = async () => {
    const createdId = await createDocument({
      _type: 'marketingChannel',
      title: '',
      key: `new-channel-${Date.now()}`,
      status: 'active',
      platform: 'social',
      contentTypes: [],
    })
    setSelectedId(createdId)
  }

  const deleteChannel = async (channel: MarketingChannel) => {
    const usage = getChannelUsage(data, channel)
    const usageText = [
      usage.calendarCount ? `${usage.calendarCount} calendar item${usage.calendarCount === 1 ? '' : 's'}` : '',
      usage.campaignCount ? `${usage.campaignCount} campaign${usage.campaignCount === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' and ')

    const message = usage.total > 0
      ? `Delete "${channel.title || channel.key}"? It is currently used by ${usageText}. Calendar items will keep their saved channel key, but the managed channel and its content type options will be removed.`
      : `Delete "${channel.title || channel.key}"?`

    if (!window.confirm(message)) return

    setDeletingId(channel._id)
    try {
      const calendarItemsWithChannelRef = data.calendarItems.filter((item) => item.channelRef?._id === channel._id)
      await Promise.all(
        calendarItemsWithChannelRef.map((item) => client.patch(item._id).unset(['channelRef']).commit()),
      )
      await client.delete(channel._id)
      setSelectedId(data.channels.find((candidate) => candidate._id !== channel._id)?._id || null)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '390px minmax(0, 1fr)', gap: 16 }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <PublishConnectionStatus variant="banner" />
      </div>
      <section style={styles.panel}>
        <PanelHeading
          title="Channels"
          description="Manage where calendar content goes and which content types each channel supports."
        />
        <button
          type="button"
          style={{ ...styles.primaryButton, width: '100%', marginBottom: 16 }}
          disabled={savingId === 'new'}
          onClick={() => void createChannel()}
        >
          Add channel
        </button>

        <div style={{ display: 'grid', gap: 8 }}>
          {data.channels.map((channel) => (
            <button
              key={channel._id}
              type="button"
              onClick={() => setSelectedId(channel._id)}
              style={{
                ...styles.card,
                padding: 12,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--card-fg-color)',
                borderColor: channel._id === selectedId ? '#007385' : 'var(--card-border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{channel.title || channel.key || 'Untitled channel'}</strong>
                <StatusPill status={channel.status} options={channelStatusOptions} />
              </div>
              <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
                {(channel.contentTypes || []).map((type) => type.label || type.value).filter(Boolean).join(', ') ||
                  'No content types yet'}
              </div>
            </button>
          ))}
          {data.channels.length === 0 && (
            <EmptyInline title="No channels yet. Add one here, then add its content types in the manager." />
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <PanelHeading
            title="Channel manager"
            description="Calendar content type menus are generated from the selected channel's content types."
          />
          <div style={{ ...styles.small, ...styles.muted, textAlign: 'right' }}>
            {data.channels.length} channels available to calendar
          </div>
        </div>
        <ChannelEditor
          channel={selected}
          data={data}
          saving={savingId === selected?._id || deletingId === selected?._id}
          onSave={commitPatch}
          onDelete={deleteChannel}
        />
      </section>
    </div>
  )
}

function ChannelEditor({
  channel,
  data,
  saving,
  onSave,
  onDelete,
}: {
  channel: MarketingChannel | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onDelete: (channel: MarketingChannel) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingChannel | null>(channel)
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newTypeValue, setNewTypeValue] = useState('')
  const [newTypeDescription, setNewTypeDescription] = useState('')

  useEffect(() => {
    setDraft(channel ? { ...channel, contentTypes: normalizeContentTypes(channel.contentTypes || []) } : null)
    setNewTypeLabel('')
    setNewTypeValue('')
    setNewTypeDescription('')
  }, [channel])

  if (!draft || !channel) {
    return <EmptyPanel icon={TagIcon} title="Select a channel" description="Add a channel, then choose it to edit." />
  }

  const updateContentType = (key: string, patch: Partial<ChannelContentType>) => {
    setDraft({
      ...draft,
      contentTypes: normalizeContentTypes(draft.contentTypes || []).map((type) =>
        type._key === key ? { ...type, ...patch } : type,
      ),
    })
  }

  const addContentType = () => {
    const label = newTypeLabel.trim()
    if (!label) return

    setDraft({
      ...draft,
      contentTypes: [
        ...normalizeContentTypes(draft.contentTypes || []),
        {
          _key: randomKey(),
          _type: 'channelContentType',
          label,
          value: slugify(newTypeValue || label),
          description: newTypeDescription.trim() || undefined,
        },
      ],
    })
    setNewTypeLabel('')
    setNewTypeValue('')
    setNewTypeDescription('')
  }

  const removeContentType = (contentType: ChannelContentType) => {
    const usage = getContentTypeUsage(data, channel, contentType)
    const message = usage > 0
      ? `Remove "${contentType.label || contentType.value}" from "${channel.title || channel.key}"? It is used by ${usage} calendar item${usage === 1 ? '' : 's'}. Existing items will keep the saved content type value, but it will no longer be a managed option.`
      : `Remove "${contentType.label || contentType.value}" from "${channel.title || channel.key}"?`

    if (!window.confirm(message)) return

    setDraft({
      ...draft,
      contentTypes: normalizeContentTypes(draft.contentTypes || []).filter((type) => type._key !== contentType._key),
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const channelSuggestion = suggestion.channel || {}
    setDraft({
      ...draft,
      title: aiString(channelSuggestion.title) || draft.title,
      key: aiString(channelSuggestion.key) || draft.key,
      platform: aiChannelPlatform(channelSuggestion.platform) || draft.platform,
      description: aiString(channelSuggestion.description) || draft.description,
      defaultFunnelStage: aiOption(channelSuggestion.defaultFunnelStage, funnelStageOptions) || draft.defaultFunnelStage,
      contentTypes: aiContentTypes(channelSuggestion.contentTypes) || draft.contentTypes,
    })
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled channel',
      key: slugify(draft.key || draft.title || 'channel'),
      status: draft.status || 'active',
      platform: draft.platform || 'other',
      description: draft.description,
      defaultFunnelStage: draft.defaultFunnelStage,
      contentTypes: normalizeContentTypes(draft.contentTypes || []),
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(channel._id, set, unset)
  }

  const usage = getChannelUsage(data, channel)

  return (
    <Stack gap={12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Channel setup</h2>
        <button
          type="button"
          style={{
            ...styles.button,
            borderColor: 'rgba(227, 98, 22, 0.6)',
            color: '#e36216',
            alignSelf: 'flex-start',
          }}
          disabled={saving}
          onClick={() => void onDelete(channel)}
        >
          Delete channel
        </button>
      </div>
      {usage.total > 0 && (
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: 'rgba(214, 169, 63, 0.35)' }}>
          <strong style={{ fontSize: 13 }}>Currently in use</strong>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
            {usage.calendarCount} calendar item{usage.calendarCount === 1 ? '' : 's'} and {usage.campaignCount} campaign
            {usage.campaignCount === 1 ? '' : 's'} reference this channel key.
          </div>
        </div>
      )}
      <MarketingAiAssistPanel
        kind="channel"
        draft={draft as unknown as Record<string, unknown>}
        analyticsTakeaways={buildAnalyticsInterpretations(data)}
        onApply={applyAiSuggestion}
      />
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
        <InputField label="Channel name">
          <input
            style={styles.input}
            value={draft.title || ''}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Key">
          <input
            style={styles.input}
            value={draft.key || ''}
            onChange={(event) => setDraft({ ...draft, key: event.currentTarget.value })}
          />
        </InputField>
      </div>
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <InputField label="Status">
          <Select
            value={draft.status || 'active'}
            options={channelStatusOptions}
            onChange={(status) => setDraft({ ...draft, status })}
          />
        </InputField>
        <InputField label="Platform">
          <Select
            value={draft.platform || 'other'}
            options={channelPlatformOptions}
            onChange={(platform) => setDraft({ ...draft, platform })}
          />
        </InputField>
        <InputField label="Default funnel stage">
          <Select
            value={draft.defaultFunnelStage || ''}
            options={[{ title: 'None', value: '' }, ...funnelStageOptions]}
            onChange={(defaultFunnelStage) => setDraft({ ...draft, defaultFunnelStage })}
          />
        </InputField>
      </div>
      <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Content types</h3>
        <Stack gap={10}>
          {normalizeContentTypes(draft.contentTypes || []).map((contentType) => {
            const usageCount = getContentTypeUsage(data, channel, contentType)
            return (
              <div
                data-mobile-stack="true"
                key={contentType._key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px 1fr auto',
                  gap: 8,
                  alignItems: 'start',
                  border: '1px solid var(--card-border-color)',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <InputField label="Label">
                  <input
                    style={styles.input}
                    value={contentType.label || ''}
                    onChange={(event) => updateContentType(contentType._key || '', { label: event.currentTarget.value })}
                  />
                </InputField>
                <InputField label="Value">
                  <input
                    style={styles.input}
                    value={contentType.value || ''}
                    onChange={(event) => updateContentType(contentType._key || '', { value: slugify(event.currentTarget.value) })}
                  />
                  {usageCount > 0 && (
                    <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
                      Used by {usageCount} item{usageCount === 1 ? '' : 's'}
                    </div>
                  )}
                </InputField>
                <InputField label="Description">
                  <input
                    style={styles.input}
                    value={contentType.description || ''}
                    onChange={(event) =>
                      updateContentType(contentType._key || '', { description: event.currentTarget.value })
                    }
                  />
                </InputField>
                <button
                  type="button"
                  style={{
                    ...styles.button,
                    borderColor: usageCount > 0 ? 'rgba(227, 98, 22, 0.6)' : 'var(--card-border-color)',
                    color: usageCount > 0 ? '#e36216' : 'var(--card-fg-color)',
                    marginTop: 20,
                  }}
                  onClick={() => removeContentType(contentType)}
                >
                  Delete
                </button>
              </div>
            )
          })}
          {normalizeContentTypes(draft.contentTypes || []).length === 0 && (
            <EmptyInline title="No content types yet. Add each option as its own managed object." />
          )}
          <div
            data-mobile-stack="true"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 150px 1fr auto',
              gap: 8,
              alignItems: 'end',
              borderTop: '1px solid var(--card-border-color)',
              paddingTop: 12,
            }}
          >
            <InputField label="New label">
              <input
                style={styles.input}
                value={newTypeLabel}
                onChange={(event) => setNewTypeLabel(event.currentTarget.value)}
                placeholder="Carousel"
              />
            </InputField>
            <InputField label="New value">
              <input
                style={styles.input}
                value={newTypeValue}
                onChange={(event) => setNewTypeValue(event.currentTarget.value)}
                placeholder="carousel"
              />
            </InputField>
            <InputField label="Description">
              <input
                style={styles.input}
                value={newTypeDescription}
                onChange={(event) => setNewTypeDescription(event.currentTarget.value)}
              />
            </InputField>
            <button type="button" style={styles.button} disabled={!newTypeLabel.trim()} onClick={addContentType}>
              Add content type
            </button>
          </div>
        </Stack>
      </div>
      <InputField label="Description">
        <textarea
          rows={3}
          style={styles.input}
          value={draft.description || ''}
          onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
        />
      </InputField>
      <details style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced fields</summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
            Use the full Sanity document only when this manager does not expose the field you need.
          </p>
          <a href={advancedEditHref('marketingChannel', channel._id)} style={styles.inlineLink}>
            <LaunchIcon style={{ width: 15, height: 15 }} />
            Open full channel document
          </a>
        </div>
      </details>
      <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving...' : 'Save channel'}
      </button>
    </Stack>
  )
}

// Channel-only: how many calendar items use one content-type value on a channel.
function getContentTypeUsage(data: MarketingData, channel: MarketingChannel, contentType: ChannelContentType) {
  const channelKey = channel.key || ''
  const typeValue = contentType.value || ''
  if (!channelKey || !typeValue) return 0

  return data.calendarItems.filter((item) => {
    const matchesChannel = item.channelRef?._id === channel._id || item.channel === channelKey
    return matchesChannel && item.contentType === typeValue
  }).length
}
