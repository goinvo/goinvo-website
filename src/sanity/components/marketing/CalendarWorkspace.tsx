import { useCallback, useEffect, useMemo, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { CalendarIcon, CloseIcon } from '@sanity/icons'

import { addMonths, dateInputToIso, monthLabel, randomKey, refsFromIds, startOfMonth, stringListFromText, toDateInputValue } from '@/lib/marketing'
// SDK-free module on purpose: keeps the Anthropic SDK (pulled in by
// postingTimeResearch) out of the Studio client bundle.
import { nextRecommendedPublishAt } from '@/lib/marketing/postingTimeSchedule'
import { calendarStatusOptions } from '../../schemas/marketingCalendarItem'
import { searchIntentOptions } from '../../schemas/marketingCampaign'
import { funnelStageOptions } from '../../schemas/marketingFunnel'
import { linkItemStatusOptions } from '../../schemas/marketingLinkItem'
import { PublishConnectionStatus } from './PublishConnectionStatus'
import { PublishPreview } from './PublishPreview'
// Shared data-model types, UI primitives, and helpers that remain owned by the
// marketing tool (used across all workspaces) are imported back from it. This is
// a deliberate circular import: the tool imports CalendarWorkspace only for JSX
// rendering, and CalendarWorkspace touches these tool exports only at runtime
// (inside component bodies), so no binding is read before it is initialized.
import {
  ADD_CHANNEL_VALUE,
  AdvancedFieldsDropdown,
  aiOption,
  aiString,
  buildAnalyticsInterpretations,
  buildCalendarCells,
  CALENDAR_ITEM_TEMPLATES,
  calendarContentTypeToLinkType,
  EmptyInline,
  EmptyPanel,
  getCalendarGroupLabel,
  getCalendarItemDisplayGroup,
  getCalendarItemsByDisplayGroup,
  getChannelByKey,
  getChannelOptions,
  getContentTypeOptionsForChannel,
  getPostLinkedLinks,
  getSavedCalendarGroups,
  getStatusColor,
  groupCalendarItemsByDay,
  GuidanceChecklist,
  InputField,
  isCalendarItemPublishReady,
  labelFor,
  MarketingAiAssistPanel,
  normalizeDraftContentFrames,
  nextLinkOrder,
  PanelTitle,
  Select,
  Stack,
  StatusPill,
  styles,
  TemplateRail,
  trimDescription,
  type AnalyticsInterpretation,
  type AutopilotCompletionPayload,
  type AutopilotWorkspaceTarget,
  type CalendarDisplayGroup,
  type CalendarItemTemplate,
  type MarketingAiSuggestion,
  type MarketingAnalyticsSource,
  type MarketingCalendarItem,
  type MarketingCampaign,
  type MarketingChannel,
  type MarketingData,
  type MarketingDocumentInput,
  type MarketingFunnel,
  type MarketingLinkItem,
  type StudioClient,
} from '../../tools/marketingTool'

// Max chips rendered inside a day cell before the "+N more" expander appears.
const CALENDAR_DAY_CHIP_CAP = 3

// Compute a new publishAt ISO string for a calendar item dropped on a different
// day. The destination day comes from the droppableId (a YYYY-MM-DD date key);
// the original time-of-day is preserved from the item's existing publishAt, and
// defaults to 09:00 local when the source had no recoverable time component.
function computeRescheduledPublishAt(item: MarketingCalendarItem, destDateKey: string): string | null {
  const match = destDateKey.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const [, year, month, day] = match

  let hours = 9
  let minutes = 0
  if (item.publishAt) {
    const previous = new Date(item.publishAt)
    if (!Number.isNaN(previous.getTime())) {
      hours = previous.getHours()
      minutes = previous.getMinutes()
    }
  }

  const next = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes, 0, 0)
  if (Number.isNaN(next.getTime())) return null
  return next.toISOString()
}

interface CalendarWorkspaceProps {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenChannels: () => void
  autopilotTarget?: AutopilotWorkspaceTarget | null
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}

export function CalendarWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
  onOpenChannels,
  autopilotTarget,
  onAutopilotComplete,
}: CalendarWorkspaceProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedId, setSelectedId] = useState<string | null>(data.calendarItems[0]?._id || null)
  // Per-day "+N more" expansion (keyed by YYYY-MM-DD date key).
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  // Optimistic publishAt overrides applied while a drag-reschedule save is in
  // flight, so the chip jumps to its new day immediately. Cleared once the data
  // reload reflects the saved value.
  const [pendingMoves, setPendingMoves] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selectedId && data.calendarItems.length > 0) setSelectedId(data.calendarItems[0]._id)
  }, [data.calendarItems, selectedId])

  useEffect(() => {
    if (autopilotTarget?.view !== 'calendar') return
    const targetItem = autopilotTarget.recordId
      ? data.calendarItems.find((item) => item._id === autopilotTarget.recordId)
      : null
    const draftItem = targetItem || data.calendarItems.find((item) => getCalendarItemDisplayGroup(item) === 'draft')
    if (draftItem) setSelectedId(draftItem._id)
  }, [autopilotTarget?.targetId, autopilotTarget?.recordId, autopilotTarget?.view, data.calendarItems])

  const channels = data.channels
  const selectedItem = data.calendarItems.find((item) => item._id === selectedId) || null
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth])
  // Apply any in-flight drag reschedules optimistically before grouping, so a
  // dropped chip renders on its new day without waiting for the save round-trip.
  const optimisticCalendarItems = useMemo(() => {
    if (Object.keys(pendingMoves).length === 0) return data.calendarItems
    return data.calendarItems.map((item) =>
      pendingMoves[item._id] ? { ...item, publishAt: pendingMoves[item._id] } : item,
    )
  }, [data.calendarItems, pendingMoves])
  const itemsByDay = useMemo(() => groupCalendarItemsByDay(optimisticCalendarItems), [optimisticCalendarItems])
  const unscheduled = optimisticCalendarItems.filter((item) => !item.publishAt)
  const savedCalendarGroups = useMemo(() => getSavedCalendarGroups(optimisticCalendarItems), [optimisticCalendarItems])

  // Drop optimistic overrides once the reloaded data already matches them, so the
  // grid follows the source of truth and stale overrides never linger.
  useEffect(() => {
    setPendingMoves((current) => {
      const entries = Object.entries(current)
      if (entries.length === 0) return current
      const next = Object.fromEntries(
        entries.filter(([id, publishAt]) => {
          const item = data.calendarItems.find((candidate) => candidate._id === id)
          return item ? item.publishAt !== publishAt : false
        }),
      )
      return Object.keys(next).length === entries.length ? current : next
    })
  }, [data.calendarItems])

  const createCalendarItem = async (publishDate?: Date) => {
    const createdId = await createDocument({
      _type: 'marketingCalendarItem',
      title: '',
      status: 'idea',
      ...(publishDate ? { publishAt: dateInputToIso(toDateInputValue(publishDate)) } : {}),
    })
    setSelectedId(createdId)
    onAutopilotComplete?.({ action: 'calendar:createDraft', recordId: createdId })
  }

  const toggleDayExpanded = useCallback((dayKey: string) => {
    setExpandedDays((current) => ({ ...current, [dayKey]: !current[dayKey] }))
  }, [])

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, source, destination } = result
      // No destination (dropped outside) or dropped back on the same day: no-op.
      if (!destination) return
      const destDayKey = destination.droppableId
      if (destDayKey === source.droppableId) return

      const item = data.calendarItems.find((candidate) => candidate._id === draggableId)
      if (!item) return

      const nextPublishAt = computeRescheduledPublishAt(item, destDayKey)
      if (!nextPublishAt) return

      // Optimistically move the chip, then persist through the existing patch path.
      setPendingMoves((current) => ({ ...current, [draggableId]: nextPublishAt }))
      try {
        await commitPatch(draggableId, { publishAt: nextPublishAt })
      } catch {
        // Roll back the optimistic move so a failed save never corrupts the grid.
        setPendingMoves((current) => {
          const next = { ...current }
          delete next[draggableId]
          return next
        })
      }
    },
    [commitPatch, data.calendarItems],
  )

  return (
    <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Content Calendar</h2>
            <p style={{ ...styles.muted, margin: '4px 0 0' }}>A month-by-month planning surface for upcoming work.</p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0 12px',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18 }}>{monthLabel(visibleMonth)}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={styles.button} onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}>
            Previous month
          </button>
          <button type="button" style={styles.button} onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
            Today
          </button>
          <button type="button" style={styles.button} onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}>
            Next month
          </button>
          <button type="button" data-tour-id="autopilot-calendar-add" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createCalendarItem()}>
            {savingId === 'new' ? 'Creating…' : 'Add calendar item'}
          </button>
          </div>
        </div>
        <PublishConnectionStatus variant="banner" />
        <DragDropContext onDragEnd={(result) => void handleDragEnd(result)}>
          <div data-mobile-scroll="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(96px, 1fr))', gap: 1, overflowX: 'auto', paddingBottom: 4 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} style={{ ...styles.small, ...styles.muted, padding: '0 8px 8px', fontWeight: 800 }}>
                {day}
              </div>
            ))}
            {calendarCells.map((cell) => {
              const key = toDateInputValue(cell.date)
              const dayItems = itemsByDay.get(key) || []
              const orderedDayItems = getCalendarItemsByDisplayGroup(dayItems)
              const expanded = !!expandedDays[key]
              const visibleItems = expanded ? orderedDayItems : orderedDayItems.slice(0, CALENDAR_DAY_CHIP_CAP)
              const overflowCount = orderedDayItems.length - visibleItems.length
              return (
                <Droppable droppableId={key} key={key}>
                  {(dropProvided, dropSnapshot) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      style={{
                        display: 'block',
                        width: '100%',
                        minHeight: 132,
                        padding: 8,
                        textAlign: 'left',
                        verticalAlign: 'top',
                        border: '1px solid var(--card-border-color)',
                        borderRadius: 0,
                        background: dropSnapshot.isDraggingOver
                          ? 'rgba(0, 115, 133, 0.08)'
                          : cell.inMonth
                            ? 'var(--card-bg-color)'
                            : 'rgba(128, 128, 128, 0.05)',
                        color: 'var(--card-fg-color)',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          display: 'flex',
                          width: '100%',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: cell.inMonth ? 'var(--card-fg-color)' : 'var(--card-muted-fg-color)',
                          fontWeight: cell.isToday ? 800 : 700,
                          marginBottom: 6,
                        }}
                        title="Add calendar item on this day"
                        onClick={() => void createCalendarItem(cell.date)}
                      >
                        <span>{cell.date.getDate()}</span>
                        {cell.isToday && <span style={{ color: '#007385' }}>Today</span>}
                      </button>
                      <div style={{ display: 'grid', gap: 5 }}>
                        {visibleItems.map(({ item, group }, index) => (
                          <Draggable draggableId={item._id} index={index} key={item._id}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => setSelectedId(item._id)}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  cursor: 'grab',
                                  opacity: savingId === item._id ? 0.55 : 1,
                                }}
                              >
                                <CalendarChip
                                  item={item}
                                  channels={channels}
                                  active={item._id === selectedId}
                                  group={group}
                                  dragging={dragSnapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {dropProvided.placeholder}
                        {overflowCount > 0 && (
                          <button
                            type="button"
                            style={{ ...styles.small, ...styles.muted, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                            onClick={() => toggleDayExpanded(key)}
                          >
                            +{overflowCount} more
                          </button>
                        )}
                        {expanded && orderedDayItems.length > CALENDAR_DAY_CHIP_CAP && (
                          <button
                            type="button"
                            style={{ ...styles.small, ...styles.muted, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                            onClick={() => toggleDayExpanded(key)}
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>

        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 16 }}>
          <CalendarGroupSummary
            group="draft"
            count={savedCalendarGroups.draft.length}
            description="Saved calendar items that still need content or review."
          />
          <CalendarGroupSummary
            group="final"
            count={savedCalendarGroups.final.length}
            description="Scheduled or published items with real release timing."
          />
        </div>

        {unscheduled.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Unscheduled</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {unscheduled.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => setSelectedId(item._id)}
                  style={{
                    ...styles.button,
                    borderColor: item._id === selectedId ? '#007385' : 'var(--card-border-color)',
                  }}
                >
                  {item.title || 'Untitled item'}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <CalendarItemEditor
        item={selectedItem}
        channels={channels}
        campaigns={data.campaigns}
        funnels={data.funnels}
        analyticsSources={data.analyticsSources}
        linkItems={data.linkItems}
        analyticsTakeaways={buildAnalyticsInterpretations(data)}
        saving={savingId === selectedItem?._id}
        createDocument={createDocument}
        onSave={commitPatch}
        onOpenChannels={onOpenChannels}
        onAutopilotComplete={onAutopilotComplete}
      />
    </div>
  )
}

function CalendarChip({
  item,
  channels,
  active,
  group = getCalendarItemDisplayGroup(item),
  dragging = false,
}: {
  item: MarketingCalendarItem
  channels: MarketingChannel[]
  active: boolean
  group?: CalendarDisplayGroup
  dragging?: boolean
}) {
  const colors = getStatusColor(group === 'preview' ? 'preview' : item.status)
  const channel = getChannelByKey(channels, item.channel) || item.channelRef
  const contentTypeOptionsForChannel = getContentTypeOptionsForChannel(item.channel, channels)

  return (
    <div
      style={{
        padding: '6px 7px',
        border: `1px solid ${active ? '#007385' : colors.border}`,
        // Status-colored accent so each chip reads its workflow state at a glance.
        borderLeft: `4px solid ${colors.fg}`,
        borderStyle: group === 'preview' ? 'dotted' : 'solid',
        borderRadius: 6,
        background: colors.bg,
        color: colors.fg,
        overflow: 'hidden',
        boxShadow: dragging ? '0 6px 16px rgba(0, 0, 0, 0.18)' : undefined,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.title || 'Untitled item'}
      </div>
      <div style={{ fontSize: 11, opacity: 0.82 }}>
        {[channel?.title || item.channel, labelFor(contentTypeOptionsForChannel, item.contentType), item.campaign?.title]
          .filter(Boolean)
          .join(' / ')}
      </div>
      <div style={{ fontSize: 10, opacity: 0.78, fontWeight: 800, marginTop: 3 }}>
        {getCalendarGroupLabel(group)}
      </div>
    </div>
  )
}

function CalendarGroupSummary({
  group,
  count,
  description,
}: {
  group: CalendarDisplayGroup
  count: number
  description: string
}) {
  const colors = getStatusColor(group)
  return (
    <div
      style={{
        border: `1px ${group === 'preview' ? 'dotted' : 'solid'} ${colors.border}`,
        borderRadius: 8,
        background: colors.bg,
        color: colors.fg,
        padding: 10,
        minHeight: 98,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <strong>{getCalendarGroupLabel(group)}</strong>
        <span style={{ fontSize: 22, fontWeight: 900 }}>{count}</span>
      </div>
      <div style={{ ...styles.small, color: 'inherit', opacity: 0.82, lineHeight: 1.45, marginTop: 6 }}>
        {description}
      </div>
    </div>
  )
}

function CalendarItemEditor({
  item,
  channels,
  campaigns,
  funnels,
  analyticsSources,
  linkItems,
  analyticsTakeaways,
  saving,
  createDocument,
  onSave,
  onOpenChannels,
  onAutopilotComplete,
}: {
  item: MarketingCalendarItem | null
  channels: MarketingChannel[]
  campaigns: MarketingCampaign[]
  funnels: MarketingFunnel[]
  analyticsSources: MarketingAnalyticsSource[]
  linkItems: MarketingLinkItem[]
  analyticsTakeaways: AnalyticsInterpretation[]
  saving: boolean
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenChannels: () => void
  onAutopilotComplete?: (signal: AutopilotCompletionPayload) => void
}) {
  const [draft, setDraft] = useState<MarketingCalendarItem | null>(item)
  const [campaignId, setCampaignId] = useState('')
  const [funnelId, setFunnelId] = useState('')
  const [analyticsSourceId, setAnalyticsSourceId] = useState('')
  const [linkedLinkIds, setLinkedLinkIds] = useState<string[]>([])
  const [linkToAddId, setLinkToAddId] = useState('')

  useEffect(() => {
    setDraft(item)
    setCampaignId(item?.campaign?._id || '')
    setFunnelId(item?.funnel?._id || '')
    setAnalyticsSourceId(item?.analyticsSource?._id || '')
    setLinkedLinkIds(item ? getPostLinkedLinks(item, linkItems).map((link) => link._id) : [])
    setLinkToAddId('')
  }, [item, linkItems])

  const channelKey = draft?.channel || draft?.channelRef?.key || ''
  const channelOptions = getChannelOptions(channels)
  const selectedChannel = getChannelByKey(channels, channelKey)
  const typeOptions = getContentTypeOptionsForChannel(channelKey, channels)
  // Next recommended publish day from the channel's researched posting times
  // (for the content type, if set). Day-granular: the calendar stores dates.
  const recommendedNext = nextRecommendedPublishAt(
    selectedChannel?.recommendedPostingTimes,
    new Date(),
    draft?.contentType,
  )
  const linkedLinks = linkedLinkIds
    .map((id) => linkItems.find((link) => link._id === id) || draft?.linkItems?.find((link) => link._id === id))
    .filter(Boolean) as MarketingLinkItem[]
  const availableLinks = linkItems.filter((link) => !linkedLinkIds.includes(link._id))
  const postUrl = draft?.publishedUrl || draft?.workingUrl || ''

  if (!draft || !item) {
    return (
      <EmptyPanel
        icon={CalendarIcon}
        title="Select a calendar item"
        description="Create or choose a content item to edit its plan."
      />
    )
  }

  const save = async () => {
    const unset: string[] = []
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled item',
      status: draft.status || 'idea',
      publishAt: draft.publishAt ? dateInputToIso(toDateInputValue(draft.publishAt)) : undefined,
      contentType: draft.contentType,
      channel: channelKey,
      brief: draft.brief,
      contentDraft: draft.contentDraft,
      draftFrames: normalizeDraftContentFrames(draft.draftFrames),
      draftAltText: draft.draftAltText,
      draftHashtags: draft.draftHashtags || [],
      contentProductionNotes: draft.contentProductionNotes,
      callToAction: draft.callToAction,
      workingUrl: draft.workingUrl,
      publishedUrl: draft.publishedUrl,
      utmCampaign: draft.utmCampaign,
      funnelStage: draft.funnelStage,
      topicCluster: draft.topicCluster,
      searchIntent: draft.searchIntent,
      targetQueries: draft.targetQueries || [],
    }

    if (linkedLinkIds.length > 0) {
      set.linkItems = refsFromIds(linkedLinkIds)
    } else {
      unset.push('linkItems')
    }

    if (campaignId) {
      set.campaign = { _type: 'reference', _ref: campaignId }
    } else {
      unset.push('campaign')
    }

    if (funnelId) {
      set.funnel = { _type: 'reference', _ref: funnelId }
    } else {
      unset.push('funnel')
    }

    if (analyticsSourceId) {
      set.analyticsSource = { _type: 'reference', _ref: analyticsSourceId }
    } else {
      unset.push('analyticsSource')
    }

    if (selectedChannel?._id && !selectedChannel._id.startsWith('default-')) {
      set.channelRef = { _type: 'reference', _ref: selectedChannel._id }
    } else {
      unset.push('channelRef')
    }

    Object.keys(set).forEach((key) => {
      if (set[key] === undefined || set[key] === '') {
        delete set[key]
        unset.push(key)
      }
    })

    await onSave(item._id, set, unset)
    onAutopilotComplete?.({ action: 'calendar:saveDraft', recordId: item._id })
  }

  const applyTemplate = (template: CalendarItemTemplate) => {
    const channel = getChannelByKey(channels, template.channel)
    setDraft({
      ...draft,
      channel: channel?.key || draft.channel,
      channelRef: channel || draft.channelRef,
      contentType: template.contentType,
      funnelStage: template.funnelStage,
      brief: draft.brief || template.brief,
      callToAction: draft.callToAction || template.callToAction,
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const itemSuggestion = suggestion.calendarItem || {}
    const suggestedChannel = aiString(itemSuggestion.channel)
    const channel = getChannelByKey(channels, suggestedChannel)
    const typeOptionsForSuggestion = getContentTypeOptionsForChannel(channel?.key || suggestedChannel || channelKey, channels)
    const suggestedContentType = aiString(itemSuggestion.contentType)
    const validSuggestedContentType = suggestedContentType
      ? typeOptionsForSuggestion.some((option) => option.value === suggestedContentType)
      : false

    setDraft({
      ...draft,
      title: aiString(itemSuggestion.title) || draft.title,
      channel: channel?.key || suggestedChannel || draft.channel,
      channelRef: channel || draft.channelRef,
      contentType: validSuggestedContentType ? suggestedContentType : draft.contentType || typeOptionsForSuggestion[0]?.value,
      funnelStage: aiOption(itemSuggestion.funnelStage, funnelStageOptions) || draft.funnelStage,
      brief: aiString(itemSuggestion.brief) || draft.brief,
      callToAction: aiString(itemSuggestion.callToAction) || draft.callToAction,
      workingUrl: aiString(itemSuggestion.workingUrl) || draft.workingUrl,
      utmCampaign: aiString(itemSuggestion.utmCampaign) || draft.utmCampaign,
    })
  }

  const syncPostLinks = async (nextIds: string[]) => {
    const dedupedIds = Array.from(new Set(nextIds))
    setLinkedLinkIds(dedupedIds)
    await onSave(item._id, dedupedIds.length > 0 ? { linkItems: refsFromIds(dedupedIds) } : {}, dedupedIds.length > 0 ? [] : ['linkItems'])
  }

  const createLinkFromPost = async () => {
    if (!postUrl) return
    const linkIsPublishReady = isCalendarItemPublishReady(draft)
    const createdId = await createDocument({
      _type: 'marketingLinkItem',
      title: draft.title || 'Untitled post link',
      url: postUrl,
      description: trimDescription(draft.brief),
      type: calendarContentTypeToLinkType(draft.contentType),
      status: linkIsPublishReady ? 'active' : 'draft',
      publishAt: draft.publishAt ? dateInputToIso(toDateInputValue(draft.publishAt)) : undefined,
      sourceChannel: draft.channelRef?.key || draft.channel || 'instagram',
      order: nextLinkOrder(linkItems),
      calendarItem: { _type: 'reference', _ref: item._id },
      calendarItems: refsFromIds([item._id]),
      ...(campaignId ? { campaign: { _type: 'reference', _ref: campaignId } } : {}),
    })
    await syncPostLinks([...linkedLinkIds, createdId])
  }

  const addExistingLinkToPost = async () => {
    if (!linkToAddId) return
    const link = linkItems.find((candidate) => candidate._id === linkToAddId)
    const nextIds = Array.from(new Set([...linkedLinkIds, linkToAddId]))
    await syncPostLinks(nextIds)
    if (link) {
      const postIds = Array.from(new Set([...(link.calendarItems || []).map((post) => post._id), item._id]))
      const set: Record<string, unknown> = { calendarItems: refsFromIds(postIds) }
      if (!link.calendarItem?._id) set.calendarItem = { _type: 'reference', _ref: item._id }
      await onSave(link._id, set)
    }
    setLinkToAddId('')
  }

  const removeLinkFromPost = async (linkId: string) => {
    const link = linkItems.find((candidate) => candidate._id === linkId) || linkedLinks.find((candidate) => candidate._id === linkId)
    await syncPostLinks(linkedLinkIds.filter((id) => id !== linkId))
    if (!link) return

    const remainingPostIds = (link.calendarItems || []).map((post) => post._id).filter((id) => id !== item._id)
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    if (remainingPostIds.length > 0) {
      set.calendarItems = refsFromIds(remainingPostIds)
    } else {
      unset.push('calendarItems')
    }
    if (link.calendarItem?._id === item._id) unset.push('calendarItem')
    await onSave(link._id, set, unset)
  }

  return (
    <aside data-tour-id="autopilot-calendar-editor" style={styles.panel}>
      <PanelTitle title="Calendar item" type="marketingCalendarItem" id={item._id} />
      <Stack gap={12}>
        <GuidanceChecklist
          title="Designer checklist"
          items={[
            { label: 'Date is set', done: !!draft.publishAt },
            { label: 'Channel and content type are chosen', done: !!channelKey && !!draft.contentType },
            { label: 'Brief has enough context to make the artifact', done: !!draft.brief?.trim() },
            { label: 'CTA says what the viewer should do next', done: !!draft.callToAction?.trim() },
            { label: 'Campaign or funnel connection is set', done: !!campaignId || !!funnelId },
            { label: 'Working URL points to the draft/design/source', done: !!draft.workingUrl?.trim() },
          ]}
        />
        <TemplateRail
          title="Content templates"
          description="Apply a prompt set, then replace the bracketed thinking with the actual artifact details."
          templates={CALENDAR_ITEM_TEMPLATES}
          onApply={applyTemplate}
        />
        <MarketingAiAssistPanel
          kind="calendarItem"
          draft={draft as unknown as Record<string, unknown>}
          analyticsTakeaways={analyticsTakeaways}
          onApply={applyAiSuggestion}
        />
        <InputField label="What are we making?" help="Use the working title a designer would recognize on the calendar.">
          <input
            style={styles.input}
            value={draft.title || ''}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
        </InputField>
        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InputField label="Where is it in the workflow?">
            <Select
              value={draft.status || 'idea'}
              options={calendarStatusOptions}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </InputField>
          <InputField label="Publish date">
            <input
              type="date"
              style={styles.input}
              value={toDateInputValue(draft.publishAt)}
              onChange={(event) => setDraft({ ...draft, publishAt: event.currentTarget.value })}
            />
            {recommendedNext && toDateInputValue(recommendedNext) !== toDateInputValue(draft.publishAt) && (
              <button
                type="button"
                onClick={() => setDraft({ ...draft, publishAt: toDateInputValue(recommendedNext) })}
                title="From this channel's researched posting times"
                style={{
                  ...styles.small,
                  ...styles.muted,
                  background: 'none',
                  border: 'none',
                  padding: '4px 0 0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  textDecoration: 'underline',
                }}
              >
                Use recommended day:{' '}
                {recommendedNext.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </button>
            )}
          </InputField>
        </div>
        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InputField label="Where will this be published?">
            <Select
              value={channelKey}
              options={[
                { title: 'None', value: '' },
                ...channelOptions,
                { title: 'Add new channel...', value: ADD_CHANNEL_VALUE },
              ]}
              onChange={(channel) => {
                if (channel === ADD_CHANNEL_VALUE) {
                  onOpenChannels()
                  return
                }
                const nextTypes = getContentTypeOptionsForChannel(channel, channels)
                setDraft({
                  ...draft,
                  channel,
                  channelRef: getChannelByKey(channels, channel),
                  contentType: nextTypes[0]?.value || '',
                })
              }}
            />
          </InputField>
          <InputField label="What format is it?">
            <Select
              value={draft.contentType || ''}
              options={[{ title: 'None', value: '' }, ...typeOptions]}
              onChange={(contentType) => setDraft({ ...draft, contentType })}
            />
          </InputField>
        </div>
        {item && (channelKey === 'linkedin' || channelKey === 'instagram') && (
          <PublishPreview itemId={item._id} />
        )}
        <InputField label="Which campaign is it part of?" help="Leave blank if this is a one-off item or not connected yet.">
          <Select
            value={campaignId}
            options={[{ title: 'No campaign', value: '' }, ...campaigns.map((campaign) => ({ title: campaign.title || 'Untitled campaign', value: campaign._id }))]}
            onChange={setCampaignId}
          />
        </InputField>
        <InputField label="Which funnel path should it support?" help="Use this when the item should lead people through a known path.">
          <Select
            value={funnelId}
            options={[{ title: 'No funnel', value: '' }, ...funnels.map((funnel) => ({ title: funnel.title || 'Untitled funnel', value: funnel._id }))]}
            onChange={setFunnelId}
          />
        </InputField>
        <InputField label="What stage is this for?">
          <Select
            value={draft.funnelStage || ''}
            options={[{ title: 'None', value: '' }, ...funnelStageOptions]}
            onChange={(funnelStage) => setDraft({ ...draft, funnelStage })}
          />
        </InputField>
        <details style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>SEO and targeting</summary>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <InputField label="Topic / keyword cluster">
              <input
                style={styles.input}
                value={draft.topicCluster || ''}
                onChange={(event) => setDraft({ ...draft, topicCluster: event.currentTarget.value })}
              />
            </InputField>
            <InputField label="Search / visitor intent">
              <Select
                value={draft.searchIntent || ''}
                options={[{ title: 'None', value: '' }, ...searchIntentOptions]}
                onChange={(searchIntent) => setDraft({ ...draft, searchIntent })}
              />
            </InputField>
            <InputField label="Target queries / phrases">
              <textarea
                rows={3}
                style={styles.input}
                value={(draft.targetQueries || []).join('\n')}
                onChange={(event) => setDraft({ ...draft, targetQueries: stringListFromText(event.currentTarget.value) })}
                placeholder="One phrase per line"
              />
            </InputField>
          </div>
        </details>
        <InputField label="Analytics source">
          <Select
            value={analyticsSourceId}
            options={[
              { title: 'No analytics source', value: '' },
              ...analyticsSources.map((source) => ({
                title: source.title || 'Untitled analytics source',
                value: source._id,
              })),
            ]}
            onChange={setAnalyticsSourceId}
          />
        </InputField>
        <InputField label="What does the designer need to know before making it?" help="Plain-language context, audience, source, angle, and must-include points.">
          <textarea
            rows={5}
            style={styles.input}
            value={draft.brief || ''}
            onChange={(event) => setDraft({ ...draft, brief: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Write the actual copy here" help="Caption, post copy, newsletter section, page draft, or script. This can be rough.">
          <textarea
            rows={8}
            style={styles.input}
            value={draft.contentDraft || ''}
            onChange={(event) => setDraft({ ...draft, contentDraft: event.currentTarget.value })}
            placeholder="Write or generate the actual post, caption, newsletter section, or page copy here."
          />
        </InputField>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <label style={styles.label}>Frames or slides</label>
            <button
              type="button"
              style={styles.button}
              onClick={() =>
                setDraft({
                  ...draft,
                  draftFrames: [
                    ...(draft.draftFrames || []),
                    { _key: randomKey(), title: '', body: '', visualDirection: '', altText: '' },
                  ],
                })
              }
            >
              Add frame
            </button>
          </div>
          {(draft.draftFrames || []).length === 0 ? (
            <EmptyInline title="No frame copy yet." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {(draft.draftFrames || []).map((frame, index) => (
                <div key={frame._key || index} style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
                    <InputField label={`Frame ${index + 1} title`}>
                      <input
                        style={styles.input}
                        value={frame.title || ''}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                              itemIndex === index ? { ...item, title: event.currentTarget.value } : item,
                            ),
                          })
                        }
                      />
                    </InputField>
                    <button
                      type="button"
                      style={{ ...styles.button, width: 40, height: 40, padding: 0 }}
                      aria-label={`Remove frame ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <InputField label="Body copy">
                    <textarea
                      rows={3}
                      style={styles.input}
                      value={frame.body || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, body: event.currentTarget.value } : item,
                          ),
                        })
                      }
                    />
                  </InputField>
                  <InputField label="Visual direction">
                    <textarea
                      rows={2}
                      style={styles.input}
                      value={frame.visualDirection || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, visualDirection: event.currentTarget.value } : item,
                          ),
                        })
                      }
                    />
                  </InputField>
                  <InputField label="Alt text">
                    <textarea
                      rows={2}
                      style={styles.input}
                      value={frame.altText || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, altText: event.currentTarget.value } : item,
                          ),
                        })
                      }
                    />
                  </InputField>
                </div>
              ))}
            </div>
          )}
        </div>
        <InputField label="Overall draft alt text">
          <textarea
            rows={3}
            style={styles.input}
            value={draft.draftAltText || ''}
            onChange={(event) => setDraft({ ...draft, draftAltText: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Draft hashtags / tags">
          <textarea
            rows={2}
            style={styles.input}
            value={(draft.draftHashtags || []).join('\n')}
            onChange={(event) => setDraft({ ...draft, draftHashtags: stringListFromText(event.currentTarget.value) })}
            placeholder="One tag per line"
          />
        </InputField>
        <InputField label="Content production notes">
          <textarea
            rows={4}
            style={styles.input}
            value={draft.contentProductionNotes || ''}
            onChange={(event) => setDraft({ ...draft, contentProductionNotes: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="What should the viewer do next?">
          <input
            style={styles.input}
            value={draft.callToAction || ''}
            onChange={(event) => setDraft({ ...draft, callToAction: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Where is the draft, design, or source?">
          <input
            style={styles.input}
            value={draft.workingUrl || ''}
            onChange={(event) => setDraft({ ...draft, workingUrl: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Where will the public link go?">
          <input
            style={styles.input}
            value={draft.publishedUrl || ''}
            onChange={(event) => setDraft({ ...draft, publishedUrl: event.currentTarget.value })}
          />
        </InputField>
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Quick Links</h3>
              <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
                These links show on the public /links page automatically once this post is published (or its publish date arrives).
              </div>
            </div>
            <StatusPill status={isCalendarItemPublishReady(draft) ? 'active' : 'draft'} options={linkItemStatusOptions} />
          </div>
          {linkedLinks.length === 0 ? (
            <EmptyInline title="No links connected to this post yet." />
          ) : (
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {linkedLinks.map((link) => (
                <div
                  key={link._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 10,
                    alignItems: 'center',
                    border: '1px solid var(--card-border-color)',
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.title || 'Untitled link'}
                    </strong>
                    <div
                      style={{
                        ...styles.small,
                        color: '#007385',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 3,
                      }}
                    >
                      {link.url || 'No URL yet'}
                    </div>
                  </div>
                  <button type="button" style={styles.button} onClick={() => void removeLinkFromPost(link._id)}>
                    Remove from post
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, marginTop: 12 }}>
            <Select
              value={linkToAddId}
              options={[
                { title: availableLinks.length > 0 ? 'Choose existing link...' : 'No other links available', value: '' },
                ...availableLinks.map((link) => ({
                  title: link.title || link.url || 'Untitled link',
                  value: link._id,
                })),
              ]}
              onChange={setLinkToAddId}
            />
            <button type="button" style={styles.button} disabled={!linkToAddId} onClick={() => void addExistingLinkToPost()}>
              Attach link
            </button>
          </div>
          <button
            type="button"
            style={{ ...styles.primaryButton, width: '100%', marginTop: 8 }}
            disabled={!postUrl}
            onClick={() => void createLinkFromPost()}
          >
            Create link from this post
          </button>
          {!postUrl && (
            <div style={{ ...styles.small, ...styles.muted, marginTop: 8 }}>
              Add a Published URL or Working URL before creating a link from this post.
            </div>
          )}
        </div>
        <AdvancedFieldsDropdown type="marketingCalendarItem" id={item._id} />
        <button type="button" data-tour-id="autopilot-calendar-save" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving...' : 'Save calendar item'}
        </button>
      </Stack>
    </aside>
  )
}
