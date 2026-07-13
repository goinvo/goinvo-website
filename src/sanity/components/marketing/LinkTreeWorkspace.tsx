import { useEffect, useState } from 'react'
import { LaunchIcon, LinkIcon } from '@sanity/icons'

import { dateInputToIso, optionalSlug, refsFromIds, toDateInputValue } from '@/lib/marketing'
import { linkItemStatusOptions, linkItemTypeOptions } from '../../schemas/marketingLinkItem'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports LinkTreeWorkspace only for JSX
// rendering, and LinkTreeWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  AdvancedFieldsDropdown,
  aiOption,
  aiString,
  buildAnalyticsInterpretations,
  calendarContentTypeToLinkType,
  EmptyInline,
  EmptyPanel,
  emptyKeys,
  GuidanceChecklist,
  InputField,
  labelFor,
  MarketingAiAssistPanel,
  nextLinkOrder,
  PanelHeading,
  PanelTitle,
  Select,
  Stack,
  StatusPill,
  styles,
  trimDescription,
  type AnalyticsInterpretation,
  type AutopilotCompletionPayload,
  type AutopilotWorkspaceTarget,
  type MarketingAiSuggestion,
  type MarketingCalendarItem,
  type MarketingCampaign,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingLinkItem,
  type StudioClient,
} from '../../tools/marketingTool'

// LinkTree-only: compare two URLs ignoring trailing slash and case, to dedupe
// calendar candidates against existing managed links. Used solely here.
function normalizeUrl(value?: string) {
  return (value || '').trim().replace(/\/+$/, '').toLowerCase()
}

// LinkTree-only: resolve the cover-image URL for a managed link list row.
function getLinkImageUrl(item: MarketingLinkItem) {
  return item.image?.asset?.url || ''
}

interface LinkTreeWorkspaceProps {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  autopilotTarget?: AutopilotWorkspaceTarget | null
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}

export function LinkTreeWorkspace({
  client,
  data,
  savingId,
  createDocument,
  commitPatch,
  autopilotTarget,
  onAutopilotComplete,
}: LinkTreeWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(data.linkItems[0]?._id || null)
  const selected = data.linkItems.find((item) => item._id === selectedId) || null
  const calendarCandidates = data.calendarItems.filter((item) => {
    const url = item.publishedUrl || item.workingUrl
    if (!url) return false
    return !data.linkItems.some((link) => link.calendarItem?._id === item._id || normalizeUrl(link.url) === normalizeUrl(url))
  })

  useEffect(() => {
    if (!selectedId && data.linkItems.length > 0) setSelectedId(data.linkItems[0]._id)
  }, [data.linkItems, selectedId])

  useEffect(() => {
    if (autopilotTarget?.view !== 'linkTree') return
    const targetItem = autopilotTarget.recordId
      ? data.linkItems.find((item) => item._id === autopilotTarget.recordId)
      : null
    if (targetItem || data.linkItems[0]) setSelectedId(targetItem?._id || data.linkItems[0]._id)
  }, [autopilotTarget?.targetId, autopilotTarget?.recordId, autopilotTarget?.view, data.linkItems])

  const createLink = async () => {
    const createdId = await createDocument({
      _type: 'marketingLinkItem',
      title: '',
      status: 'draft',
      type: 'other',
      order: nextLinkOrder(data.linkItems),
    })
    setSelectedId(createdId)
  }

  const addFromCalendarItem = async (item: MarketingCalendarItem) => {
    const url = item.publishedUrl || item.workingUrl
    if (!url) return

    const createdId = await createDocument({
      _type: 'marketingLinkItem',
      title: item.title || 'Untitled calendar link',
      url,
      description: trimDescription(item.brief),
      type: calendarContentTypeToLinkType(item.contentType),
      status: ['published', 'scheduled'].includes(item.status || '') ? 'active' : 'draft',
      sourceChannel: item.channelRef?.key || item.channel || 'instagram',
      order: nextLinkOrder(data.linkItems),
      publishAt: item.publishAt ? dateInputToIso(toDateInputValue(item.publishAt)) : undefined,
      calendarItem: { _type: 'reference', _ref: item._id },
      calendarItems: refsFromIds([item._id]),
      ...(item.campaign?._id ? { campaign: { _type: 'reference', _ref: item.campaign._id } } : {}),
    })
    await commitPatch(item._id, {
      linkItems: refsFromIds(Array.from(new Set([...(item.linkItems || []).map((link) => link._id), createdId]))),
    })
    setSelectedId(createdId)
  }

  const uploadCoverImage = async (file: File) => {
    if (!selected) return
    const asset = await client.assets.upload('image', file, { filename: file.name })
    await commitPatch(selected._id, {
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      },
    })
  }

  const removeCoverImage = async () => {
    if (!selected) return
    await commitPatch(selected._id, {}, ['image'])
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '430px minmax(0, 1fr)', gap: 16 }}>
        <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <PanelHeading
            title="Quick Links"
            description="Manage the public /links page for Instagram, social posts, and launch moments."
          />
          <button
            type="button"
            data-tour-id="autopilot-link-add"
            style={{ ...styles.primaryButton, whiteSpace: 'nowrap' }}
            disabled={savingId === 'new'}
            onClick={() => void createLink()}
          >
            Create quick link
          </button>
        </div>
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 13 }}>Public page</strong>
            </div>
            <a
              href="/links"
              target="_blank"
              rel="noreferrer"
              aria-label="Open Quick Links page"
              title="/links is ready for the Instagram bio. /ig redirects there too."
              style={{
                ...styles.button,
                width: 48,
                height: 48,
                padding: 0,
                border: 'none',
                background: 'transparent',
                boxShadow: 'none',
                color: 'var(--card-fg-color)',
              }}
            >
              <LaunchIcon style={{ width: 26, height: 26 }} />
            </a>
          </div>
        </div>
        <LinkItemList
          items={data.linkItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <details style={{ ...styles.panel, boxShadow: 'none', padding: 12, marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Create from calendar</summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {calendarCandidates.length === 0 ? (
              <div style={{ ...styles.small, ...styles.muted }}>
                Calendar items with working or published URLs will appear here when they are not already on /links.
              </div>
            ) : (
              calendarCandidates.slice(0, 5).map((item) => (
                <button
                  key={item._id}
                  type="button"
                  style={styles.templateButton}
                  onClick={() => void addFromCalendarItem(item)}
                >
                  <strong style={{ fontSize: 13 }}>{item.title || 'Untitled calendar item'}</strong>
                  <span style={{ ...styles.small, ...styles.muted }}>
                    Create Quick Link from {[item.channelRef?.title || item.channel, item.publishedUrl ? 'published URL' : 'working URL'].filter(Boolean).join(' / ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </details>
        </section>

        <LinkItemEditor
          item={selected}
          campaigns={data.campaigns}
          calendarItems={data.calendarItems}
          analyticsTakeaways={buildAnalyticsInterpretations(data)}
          saving={savingId === selected?._id}
          onSave={commitPatch}
          onUploadCover={uploadCoverImage}
          onRemoveCover={removeCoverImage}
          onAutopilotComplete={onAutopilotComplete}
        />
      </div>
    </div>
  )
}

function LinkItemList({
  items,
  selectedId,
  onSelect,
}: {
  items: MarketingLinkItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyInline title="No managed links yet. Add a link above or create one from a calendar item to control what appears on /links." />
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item) => {
        const imageUrl = getLinkImageUrl(item)
        const active = item._id === selectedId
        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect(item._id)}
            style={{
              ...styles.card,
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--card-fg-color)',
              borderColor: active ? '#007385' : 'var(--card-border-color)',
              background: active ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
              display: 'grid',
              gridTemplateColumns: '64px minmax(0, 1fr)',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--card-border-color)',
                background: 'rgba(0, 115, 133, 0.08)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--card-fg-color)',
                fontWeight: 800,
              }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Studio thumbnails may use arbitrary Sanity asset hosts that Next Image cannot safely preconfigure.
                <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                item.title?.slice(0, 2).toUpperCase() || 'LI'
              )}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title || 'Untitled link'}
                </strong>
                <StatusPill status={item.status} options={linkItemStatusOptions} />
              </span>
              <span
                style={{
                  ...styles.small,
                  color: 'var(--card-fg-color)',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                }}
              >
                {item.url || 'No URL yet'}
              </span>
              {item.description && (
                <span
                  style={{
                    ...styles.small,
                    ...styles.muted,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginTop: 4,
                    lineHeight: 1.45,
                  }}
                >
                  {item.description}
                </span>
              )}
              <span style={{ ...styles.small, ...styles.muted, display: 'block', marginTop: 6 }}>
                {[labelFor(linkItemTypeOptions, item.type), item.featured ? 'Featured' : '', item.sourceChannel ? `Promoted from ${item.sourceChannel}` : '']
                  .filter(Boolean)
                  .join(' / ') || 'No metadata yet'}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LinkItemEditor({
  item,
  campaigns,
  calendarItems,
  analyticsTakeaways,
  saving,
  onSave,
  onUploadCover,
  onRemoveCover,
  onAutopilotComplete,
}: {
  item: MarketingLinkItem | null
  campaigns: MarketingCampaign[]
  calendarItems: MarketingCalendarItem[]
  analyticsTakeaways: AnalyticsInterpretation[]
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onUploadCover: (file: File) => Promise<void>
  onRemoveCover: () => Promise<void>
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}) {
  const [draft, setDraft] = useState<MarketingLinkItem | null>(item)
  const [campaignId, setCampaignId] = useState('')
  const [calendarItemId, setCalendarItemId] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setDraft(item)
    setCampaignId(item?.campaign?._id || '')
    setCalendarItemId(item?.calendarItem?._id || '')
  }, [item])

  if (!draft || !item) {
    return (
      <EmptyPanel
        icon={LinkIcon}
        title="Select a link"
        description="Add or choose a link to manage the public /links page."
      />
    )
  }

  const relationshipRequired = !['site', 'project', 'other'].includes(draft.type || 'other')

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const linkSuggestion = suggestion.linkItem || {}
    setDraft({
      ...draft,
      title: aiString(linkSuggestion.title) || draft.title,
      description: aiString(linkSuggestion.description) || draft.description,
      type: aiOption(linkSuggestion.type, linkItemTypeOptions) || draft.type,
      sourceChannel: aiString(linkSuggestion.sourceChannel) || draft.sourceChannel,
    })
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled link',
      url: draft.url,
      description: draft.description,
      type: draft.type || 'other',
      status: draft.status || 'active',
      featured: !!draft.featured,
      order: Number.isFinite(draft.order) ? draft.order : 100,
      publishAt: draft.publishAt ? dateInputToIso(toDateInputValue(draft.publishAt)) : undefined,
      expiresAt: draft.expiresAt ? dateInputToIso(toDateInputValue(draft.expiresAt)) : undefined,
      sourceChannel: draft.sourceChannel,
    }
    const unset: string[] = []

    if (campaignId) {
      set.campaign = { _type: 'reference', _ref: campaignId }
    } else {
      unset.push('campaign')
    }

    if (calendarItemId) {
      set.calendarItem = { _type: 'reference', _ref: calendarItemId }
      set.calendarItems = refsFromIds(Array.from(new Set([...(item.calendarItems || []).map((calendarItem) => calendarItem._id), calendarItemId])))
    } else {
      unset.push('calendarItem')
    }

    emptyKeys(set).forEach((key) => {
      delete set[key]
      unset.push(key)
    })

    await onSave(item._id, set, unset)
    onAutopilotComplete?.({ action: 'link:save', recordId: item._id })
  }

  return (
    <section data-tour-id="autopilot-link-editor" style={styles.panel}>
      <PanelTitle title="Link editor" type="marketingLinkItem" id={item._id} />
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <GuidanceChecklist
            title="Link checklist"
            items={[
              { label: 'Title is clear without Instagram context', done: !!draft.title?.trim() },
              { label: 'URL is set', done: !!draft.url?.trim() },
              { label: 'Short description explains why to click', done: !!draft.description?.trim() },
              {
                label: 'Campaign or calendar item is connected for timed posts, events, or campaign links',
                done: !relationshipRequired || !!campaignId || !!calendarItemId,
              },
            ]}
          />
          <MarketingAiAssistPanel
            kind="linkItem"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={analyticsTakeaways}
            onApply={applyAiSuggestion}
          />
          <InputField label="What should the link say?" help="This has to make sense outside Instagram or any one post.">
            <input
              style={styles.input}
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Where should it send people?">
            <input
              style={styles.input}
              value={draft.url || ''}
              onChange={(event) => setDraft({ ...draft, url: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Why should someone click it?" help="One or two short sentences that explain the value of the destination.">
            <textarea
              rows={4}
              style={styles.input}
              value={draft.description || ''}
              onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
            />
          </InputField>
          <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="What kind of destination is it?">
              <Select
                ariaLabel="Link destination type"
                value={draft.type || 'other'}
                options={linkItemTypeOptions}
                onChange={(type) => setDraft({ ...draft, type })}
              />
            </InputField>
            <InputField label="Is it mainly promoted from one place?" help="Optional. Use this only when the link exists because of a specific source like Instagram.">
              <input
                style={styles.input}
                value={draft.sourceChannel || ''}
                onChange={(event) => setDraft({ ...draft, sourceChannel: optionalSlug(event.currentTarget.value) })}
                placeholder="instagram"
              />
              <div style={{ ...styles.small, ...styles.muted, marginTop: 5, lineHeight: 1.45 }}>
                Only use this when a link is mainly promoted somewhere specific, like the Instagram bio. Evergreen links can leave it blank.
              </div>
            </InputField>
          </div>
        </Stack>
        <Stack gap={12}>
          <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Cover image</h3>
            {draft.image?.asset?.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- This editor preview renders a user-selected Sanity asset URL before its host is known to Next Image.
              <img
                src={draft.image.asset.url}
                alt=""
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--card-border-color)',
                  marginBottom: 10,
                }}
              />
            ) : (
              <div
                style={{
                  border: '1px dashed var(--card-border-color)',
                  borderRadius: 8,
                  aspectRatio: '1 / 1',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--card-muted-fg-color)',
                  marginBottom: 10,
                }}
              >
                No image
              </div>
            )}
            <label htmlFor={`link-cover-${item._id}`} style={{ ...styles.label, display: 'block', marginBottom: 6 }}>
              Upload cover image
            </label>
            <input
              id={`link-cover-${item._id}`}
              type="file"
              accept="image/*"
              disabled={uploading || saving}
              style={{ ...styles.input, padding: 8 }}
              onChange={(event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (!file) return
                setUploading(true)
                void onUploadCover(file).finally(() => {
                  setUploading(false)
                  input.value = ''
                })
              }}
            />
            {draft.image?.asset?.url && (
              <button
                type="button"
                style={{ ...styles.button, width: '100%', marginTop: 8 }}
                disabled={uploading || saving}
                onClick={() => void onRemoveCover()}
              >
                Remove image
              </button>
            )}
            <div style={{ ...styles.small, ...styles.muted, marginTop: 8 }}>
              {uploading ? 'Uploading image...' : 'Used as the thumbnail on /links.'}
            </div>
          </div>
          <InputField label="Should this show on the public page?">
            <Select
              ariaLabel="Public link visibility status"
              value={draft.status || 'active'}
              options={linkItemStatusOptions}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </InputField>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 24, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 24, height: 24, margin: 0, flexShrink: 0 }}
              checked={!!draft.featured}
              onChange={(event) => setDraft({ ...draft, featured: event.currentTarget.checked })}
            />
            Featured
          </label>
          <InputField label="Where should it appear in the list?">
            <input
              type="number"
              style={styles.input}
              value={draft.order ?? 100}
              onChange={(event) => setDraft({ ...draft, order: Number(event.currentTarget.value) })}
            />
          </InputField>
          <InputField label="When should it start showing?">
            <input
              type="date"
              style={styles.input}
              value={toDateInputValue(draft.publishAt)}
              onChange={(event) => setDraft({ ...draft, publishAt: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="When should it stop showing?">
            <input
              type="date"
              style={styles.input}
              value={toDateInputValue(draft.expiresAt)}
              onChange={(event) => setDraft({ ...draft, expiresAt: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Which campaign is this connected to?">
            <Select
              ariaLabel="Connected campaign"
              value={campaignId}
              options={[{ title: 'No campaign', value: '' }, ...campaigns.map((campaign) => ({ title: campaign.title || 'Untitled campaign', value: campaign._id }))]}
              onChange={setCampaignId}
            />
          </InputField>
          <InputField label="Which post or content item uses this link?">
            <Select
              ariaLabel="Connected calendar item"
              value={calendarItemId}
              options={[{ title: 'No calendar item', value: '' }, ...calendarItems.map((calendarItem) => ({ title: calendarItem.title || 'Untitled item', value: calendarItem._id }))]}
              onChange={setCalendarItemId}
            />
          </InputField>
          <AdvancedFieldsDropdown type="marketingLinkItem" id={item._id} />
          <button type="button" data-tour-id="autopilot-link-save" style={styles.primaryButton} disabled={saving || !draft.url?.trim()} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save link'}
          </button>
        </Stack>
      </div>
    </section>
  )
}
