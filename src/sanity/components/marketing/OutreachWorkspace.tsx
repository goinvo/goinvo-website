import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SearchIcon, UsersIcon } from '@sanity/icons'
import { useCurrentUser } from 'sanity'

import { useConfirmDialog } from './ConfirmDialog'
import { BrandVoiceLearningReview } from './BrandVoiceLearningReview'
import { authenticatedMarketingRequest as outreachApi } from './authenticatedMarketingRequest'

import {
  LOG_STATUS_VALUES,
  OUTREACH_CHANNEL_OPTIONS,
  OUTREACH_CHANNEL_OVERRIDE_STATE_OPTIONS,
  OUTREACH_DATASET,
  OUTREACH_SEGMENT_OPTIONS,
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_WARMTH_OPTIONS,
  isOutreachWriterRole,
  type OutreachChannel,
  type OutreachChannelOverride,
  type OutreachChannelOverrideState,
} from '@/lib/marketing/outreachEnums'
import {
  normalizeMarketingBrandVoices,
  type MarketingBrandVoice,
} from '@/lib/marketing/brandVoice'
import type {
  BrandVoiceLearningProposal,
  BrandVoiceLearningSelection,
} from '@/lib/marketing/brandVoiceLearning'
import {
  buildOutreachProgress,
  isUsableOutreachEmail,
  isUsableOutreachPhone,
  type OutreachProgressAction,
  type OutreachProgressContact,
  type OutreachProgressRow,
  type OutreachProgressUrgency,
} from '@/lib/marketing/outreachProgress'
import {
  buildInteractionEntry,
  buildWarmStartSuggestions,
  compactEvidenceIndex,
  contactDedupeKey,
  DEFAULT_FINANCIAL_POSTURE_ID,
  FINANCIAL_POSTURE_DOC_ID,
  getFinancialPosture,
  hasPricedOffer,
  isFinancialPostureId,
  normalizeOutreachUrl,
  slugify,
  type FinancialPosture,
  type ParsedIntakeContact,
  type WarmStartSuggestion,
  type WorkEvidence,
} from '@/lib/marketing'
// Deliberate circular import, same as every other workspace: the tool imports
// these components only for JSX rendering, and these exports are touched only
// at runtime inside the component bodies.
import {
  EmptyInline,
  InputField,
  PanelHeading,
  StatusPill,
  styles,
  type MarketingContact,
  type MarketingOffer,
  type StudioClient,
  useMarketingUnsavedGuard,
} from '../../tools/marketingTool'

// Contacts/offers/evidence live in the PRIVATE outreach dataset (contact PII
// must never enter the world-readable production dataset), so this workspace
// fetches and writes through its own dataset-scoped client rather than the
// tool's shared MarketingData.
interface OutreachWorkspaceProps {
  client: StudioClient
  /** Optional: switch to the Evidence tab (the tool shell owns view state; the banner button renders only when this is wired). */
  onOpenEvidence?: () => void
  /** Optional: open shared Marketing Settings to add or edit reusable voice profiles. */
  onOpenSettings?: () => void
}

const STATUS_SHORT_OPTIONS = OUTREACH_STATUS_OPTIONS.map((o) => ({
  value: o.value,
  title: o.title.split(' — ')[0],
}))
const WARMTH_SHORT_OPTIONS = OUTREACH_WARMTH_OPTIONS.map((o) => ({
  value: o.value,
  title: o.title.split(' — ')[0],
}))

const CONTACT_FIELDS = `
  _id, _rev, _updatedAt, name, organization, role, segment, owner, warmth, status,
  email, phone, linkedinUrl, howWeKnow, sourceNotes, brandVoiceKey,
  channelOverrides[]{_key, channel, state, note},
  researchedAt, researchReviewedAt, researchSummary, personVerified, identityConfidence,
  opportunities[]{_key, offerKey, headline, rationale},
  relevantEvidence[]{_key, evidenceId, title, why},
  proposedOffers[]{_key, title, oneLiner, priceBand, rationale, evidenceIds, chosen},
  feasibilityScore, feasibilityReasoning, suggestedOfferKey, suggestedOpener, callBrief,
  researchModel, researchBrandVoiceKey, researchBrandVoiceName, researchSources[]{_key, title, url},
  lastContactedAt, followUpAt, nextStep, outcomeNotes, intelGathered,
  estimatedValue, closedValue, currency, attributionChannel, attributedOfferKey, attributedOfferTitle,
  attributedEvidenceIds, closedAt, closeReason,
  interactions[]{_key, at, by, outcome, intel, nextStep, statusAfter, channel, offerKey, offerTitle, evidenceIds, value}
`

const FOLLOW_UP_PRESETS = [
  { label: 'No follow-up', days: null },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 6 weeks', days: 42 },
  { label: 'Next quarter', days: 90 },
]

const OUTREACH_INTAKE_UNSAVED_ID = 'outreach-intake-draft'
const OUTREACH_OFFER_UNSAVED_ID = 'outreach-tailored-offer-draft'
const OUTREACH_BRIEF_UNSAVED_ID = 'outreach-call-brief-draft'
const OUTREACH_LOG_UNSAVED_ID = 'outreach-call-log-draft'
const OUTREACH_CONTACT_UNSAVED_ID = 'outreach-contact-draft'
const OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID = 'outreach-channel-options-draft'
const OUTREACH_CATALOG_UNSAVED_ID = 'outreach-offer-catalog-draft'
const OUTREACH_EVIDENCE_UNSAVED_ID = 'outreach-evidence-draft'
const REVIEW_MANAGED_STATUSES = new Set(['needsReview', 'researched', 'briefed'])
const CONTACT_EDITOR_STATUS_OPTIONS = STATUS_SHORT_OPTIONS.filter(
  (option) => !REVIEW_MANAGED_STATUSES.has(option.value),
)

type ChannelOptionDraft = {
  _key?: string
  channel: string
  state: '' | OutreachChannelOverrideState
  note: string
}

const TRACKER_CONTACT_FIELD_IDS = new Set([
  'name',
  'organization',
  'role',
  'warmth',
  'owner',
  'howWeKnow',
  'email',
  'phone',
  'linkedinUrl',
  'status',
  'followUpAt',
  'nextStep',
])

function followUpDateInput(value?: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10)
}

function followUpDateIso(value: string): string | null {
  const normalized = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null
  const parsed = new Date(`${normalized}T12:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function outreachDateLabel(value?: string): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-US', { timeZone: 'UTC' })
}

function buildChannelOptionDrafts(overrides: OutreachChannelOverride[] = []): ChannelOptionDraft[] {
  return OUTREACH_CHANNEL_OPTIONS.map((option) => {
    const saved = overrides.find((override) => override.channel === option.value)
    return {
      _key: saved?._key,
      channel: option.value,
      state: saved?.state || '',
      note: saved?.note || '',
    }
  })
}

function trackerUrgencyLabel(urgency: OutreachProgressUrgency): string {
  const labels: Record<OutreachProgressUrgency, string> = {
    overdue: 'Overdue',
    dueToday: 'Due today',
    dueSoon: 'Due soon',
    ready: 'Ready now',
    needsAttention: 'Needs prep',
    blocked: 'Blocked',
    scheduled: 'Scheduled',
    waiting: 'Waiting',
    complete: 'Complete',
  }
  return labels[urgency]
}

function trackerUrgencyColors(urgency: OutreachProgressUrgency) {
  if (urgency === 'overdue' || urgency === 'blocked') return RED
  if (urgency === 'dueToday' || urgency === 'dueSoon' || urgency === 'needsAttention') return AMBER
  if (urgency === 'ready') return TEAL
  return { bg: 'transparent', fg: 'var(--card-muted-fg-color)', border: 'var(--card-border-color)' }
}

function trackerChannelRuleSummary(row: OutreachProgressRow): string {
  if (row.action === 'complete') return ''
  return row.recommendation.availability
    .filter((item) => Boolean(item.overrideState))
    .map((item) => item.overrideState === 'preferred' ? `${item.label} is marked preferred` : item.reason)
    .join('; ')
}

function trackerActionLabel(action: OutreachProgressAction, modality?: string): string {
  if (action === 'firstTouch' || action === 'followUp') {
    if (modality === 'phone') return 'Call now'
    if (modality === 'email') return 'Open email'
    if (modality === 'linkedin') return 'Open LinkedIn'
    return 'Log result'
  }
  if (action === 'research') return 'Research'
  if (action === 'reviewResearch') return 'Review brief'
  if (action === 'scheduleFollowUp') return 'Log / schedule'
  if (action === 'editContact') return 'Fix blocker'
  return ''
}

type OutreachVoiceCopy = {
  suggestedOpener: string
}

type OutreachVoiceLearningState = {
  status: 'proposing' | 'ready' | 'applying' | 'applied' | 'error'
  proposal?: BrandVoiceLearningProposal
  error?: string
  message?: string
  needsFreshProposal?: boolean
}

function normalizeVoiceEditText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function hasMaterialOutreachVoiceEdit(
  before: OutreachVoiceCopy,
  after: OutreachVoiceCopy,
): boolean {
  return normalizeVoiceEditText(before.suggestedOpener) !== normalizeVoiceEditText(after.suggestedOpener)
}

/**
 * Correlates async learning work without retaining the copy being compared.
 * Starting a newer operation for one contact supersedes the older token;
 * invalidating a contact makes every outstanding response a no-op.
 */
export function createOutreachVoiceLearningRequestTracker() {
  let sequence = 0
  const currentRequestByContact = new Map<string, string>()

  return {
    begin(contactId: string): string {
      const requestId = `outreach-voice-learning-${++sequence}`
      currentRequestByContact.set(contactId, requestId)
      return requestId
    },
    isCurrent(contactId: string, requestId: string): boolean {
      return currentRequestByContact.get(contactId) === requestId
    },
    invalidate(contactId: string): void {
      currentRequestByContact.delete(contactId)
    },
  }
}

function needsFreshVoiceLearningProposal(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  return /proposal.*(?:expired|modified|invalid|incomplete)|revision|settings changed|conflict|stale/i.test(
    message,
  )
}

function voiceLearningFailureMessage(error: unknown, action: 'propose' | 'apply'): string {
  const message = error instanceof Error ? error.message : 'The request failed.'
  if (/proposal.*(?:expired|modified|invalid|incomplete)/i.test(message)) {
    return 'This voice-learning proposal expired or was modified, so nothing was applied. Edit and save the suggested opener to prepare a fresh proposal.'
  }
  if (needsFreshVoiceLearningProposal(error)) {
    return 'The brand voice changed after this proposal was prepared, so nothing was applied. Edit and save the suggested opener to prepare a fresh proposal.'
  }
  return action === 'propose'
    ? `Your wording was saved, but Outreach could not prepare a voice-learning proposal: ${message}`
    : `The wording is still saved, but the selected learning was not applied: ${message}`
}

function canManagePrivateOutreach(user: { roles?: Array<{ name?: string }> } | null): boolean {
  return Boolean(
    user?.roles?.some((role) => isOutreachWriterRole(role.name)),
  )
}

const OUTREACH_RESPONSIVE_CSS = `
  [data-outreach-mobile-list="true"] { display: none !important; }
  [data-outreach-filter-grid="true"] { grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(140px, 0.6fr)); }
  @media (max-width: 720px) {
    [data-outreach-desktop-table="true"] { display: none !important; }
    [data-outreach-mobile-list="true"] { display: grid !important; }
    [data-outreach-filter-grid="true"] { grid-template-columns: 1fr !important; }
    [data-outreach-plan-actions="true"] { align-items: stretch !important; }
    [data-outreach-plan-actions="true"] button { width: 100%; justify-content: center; }
  }
`

function labelForValue(options: Array<{ title: string; value: string }>, value?: string) {
  if (!value) return ''
  return options.find((o) => o.value === value)?.title || value
}

function hasRealPrice(priceBand?: string) {
  return hasPricedOffer(priceBand)
}

function canHardDeleteContact(contact: MarketingContact) {
  return (
    (contact.status || 'new') === 'new' &&
    !contact.researchedAt &&
    (contact.interactions || []).length === 0 &&
    !contact.lastContactedAt
  )
}

function contactHasHistoricalAttribution(contact: MarketingContact) {
  return Boolean(
    (contact.interactions || []).length > 0 ||
      contact.lastContactedAt ||
      contact.closedAt ||
      contact.attributedOfferKey ||
      contact.attributedOfferTitle ||
      (contact.attributedEvidenceIds || []).length > 0 ||
      typeof contact.closedValue === 'number',
  )
}

// Buckets, not two-digit false precision — a per-contact LLM score is a
// traffic light; the exact number lives in the tooltip.
function fitBucket(score?: number | null): { label: string; colors: { bg: string; fg: string; border: string } } {
  if (typeof score !== 'number') {
    return {
      label: 'Unscored',
      colors: { bg: 'transparent', fg: 'var(--card-muted-fg-color)', border: 'var(--card-border-color)' },
    }
  }
  if (score >= 70)
    return { label: 'High fit', colors: { bg: 'rgba(43, 122, 64, 0.16)', fg: '#63c47d', border: 'rgba(99, 196, 125, 0.4)' } }
  if (score >= 40)
    return { label: 'Medium fit', colors: { bg: 'rgba(124, 101, 39, 0.16)', fg: '#d6a93f', border: 'rgba(214, 169, 63, 0.4)' } }
  return { label: 'Low fit', colors: { bg: 'rgba(140, 60, 60, 0.14)', fg: '#d98a8a', border: 'rgba(217, 138, 138, 0.35)' } }
}

function Pill({
  text,
  colors,
  title,
}: {
  text: string
  colors: { bg: string; fg: string; border: string }
  title?: string
}) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        padding: '3px 9px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.fg,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}

const AMBER = { bg: 'rgba(124, 101, 39, 0.16)', fg: '#d6a93f', border: 'rgba(214, 169, 63, 0.4)' }
const RED = { bg: 'rgba(140, 60, 60, 0.14)', fg: '#d98a8a', border: 'rgba(217, 138, 138, 0.35)' }
const TEAL = { bg: 'rgba(0, 115, 133, 0.12)', fg: '#4dc4d6', border: 'rgba(77, 196, 214, 0.4)' }

/** The offer a call presents: the chosen proposed draft, else the catalog match. */
function presentedOffer(
  contact: MarketingContact,
  offerByKey: Map<string, MarketingOffer>,
): { title?: string; oneLiner?: string; priceBand?: string; source: 'draft' | 'catalog' | 'none' } {
  const chosen = (contact.proposedOffers || []).find((o) => o.chosen)
  if (chosen) return { title: chosen.title, oneLiner: chosen.oneLiner, priceBand: chosen.priceBand, source: 'draft' }
  const key = contact.suggestedOfferKey
  if (key) {
    const cms = offerByKey.get(key)
    if (cms) {
      if (cms.status !== 'active') return { source: 'none' }
      return { title: cms.title, oneLiner: cms.oneLiner, priceBand: cms.priceBand, source: 'catalog' }
    }
  }
  return { source: 'none' }
}

/**
 * The plan, as contextual setup: why outreach-first is the current strategy,
 * what is already loaded to power it (live counts), and the four steps. Always
 * rendered — it is the orientation header for the surface AND the anchor the
 * principal Autopilot's step 1 spotlights (data-tour-id below), so it must
 * exist whether or not contacts do yet.
 *
 * The "why" reads the studio's financial posture (the runway bin set in
 * Settings) — strategy is a step function of runway, so the framing changes
 * with the bin. Unset/unreadable falls back to survival, the confirmed 2026-07
 * reality this surface was built for.
 */
function OutreachPlanPanel({
  posture,
  evidenceCount,
  offerReadyCount,
  offerTotal,
  contactCount,
}: {
  posture: FinancialPosture
  evidenceCount: number | null
  offerReadyCount: number
  offerTotal: number
  contactCount: number
}) {
  const shortRunway = posture.id === 'survival' || posture.id === 'rebuild'
  const offerCount = offerReadyCount
  return (
    <section data-tour-id="autopilot-plan-warm-network" style={{ ...styles.panel, borderColor: 'rgba(0, 115, 133, 0.45)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <UsersIcon style={{ width: 20, height: 20, color: '#007385', flexShrink: 0, marginTop: 2 }} />
        <div style={{ display: 'grid', gap: 10, minWidth: 0, width: '100%', maxWidth: '78ch' }}>
          <strong style={{ fontSize: 16, lineHeight: 1.35 }}>Line up work through people who already know GoInvo</strong>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{posture.strategy}</p>
          <div data-outreach-plan-actions="true" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => document.getElementById('outreach-add-contacts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {contactCount > 0 ? 'Add another contact' : 'Add named contacts'}
            </button>
            {offerTotal > 0 && offerReadyCount === 0 && (
              <button
                type="button"
                style={styles.button}
                onClick={() => document.getElementById('outreach-offers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Set a real offer price
              </button>
            )}
            <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--card-muted-fg-color)' }}>
              {evidenceCount ?? '...'} unique work examples / {offerReadyCount} of {offerTotal} offers call-ready
            </span>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>Why this plan and what happens next</summary>
            <div style={{ display: 'grid', gap: 10, marginTop: 8, fontSize: 14, lineHeight: 1.65 }}>
          <div>
            <strong style={{ fontSize: 14 }}>The plan: line up work through people we already know</strong>
            <p style={{ ...styles.small, margin: '5px 0 0', lineHeight: 1.6 }}>
              <strong>Why this, why now:</strong> {posture.outreachWhy}
            </p>
          </div>
          <div>
            <strong style={{ ...styles.small, fontWeight: 850 }}>What’s already loaded to power each call</strong>
            <ul style={{ ...styles.small, margin: '5px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>
                {evidenceCount === null
                  ? 'Real shipped work to show — loading the evidence library…'
                  : `${evidenceCount} case studies distilled into “show them this work” evidence, so every call points at real projects.`}
              </li>
              <li>{offerCount > 0 ? `${offerCount} ready-to-present offers` : 'A starter offer catalog (seeded on first use)'} — research drafts a tailored pitch from these per person.</li>
              <li>Live web research on each person: what their org is doing right now, which of our work fits, and a call brief with an opener.</li>
            </ul>
          </div>
          <div>
            <strong style={{ ...styles.small, fontWeight: 850 }}>What to do</strong>
            <ol style={{ ...styles.small, margin: '5px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Add the people worth a call below — any format, a name and a company is enough.{contactCount > 0 ? ` (${contactCount} added so far.)` : ''}</li>
              <li>Run research — about 1–2 minutes per person, progress saves as it goes.</li>
              <li>Call from the top of the ranked list — warmest relationships first.</li>
              <li>Log every call — even a no teaches us where the budgets are.</li>
            </ol>
          </div>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
            {shortRunway
              ? 'This is the strategy for a short runway. Once finances stabilize, the plan shifts back toward longer-horizon marketing.'
              : 'Finances have breathing room, so outreach runs alongside longer-horizon marketing rather than replacing it. If the posture changes, update it in Settings and this plan follows.'}
          </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  )
}

export function OutreachWorkspace({ client, onOpenEvidence, onOpenSettings }: OutreachWorkspaceProps) {
  const outreachClient = useMemo(() => client.withConfig({ dataset: OUTREACH_DATASET }), [client])
  const currentUser = useCurrentUser()
  const canManageOutreach = canManagePrivateOutreach(currentUser)
  const {
    clearUnsavedChanges,
    confirmDiscardUnsavedChange,
    markUnsavedChange,
  } = useMarketingUnsavedGuard()

  const [contacts, setContacts] = useState<MarketingContact[]>([])
  const [offers, setOffers] = useState<MarketingOffer[]>([])
  const [brandVoices, setBrandVoices] = useState<MarketingBrandVoice[]>([])
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null)
  const [evidenceLinks, setEvidenceLinks] = useState<Array<WorkEvidence & { _id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [loadFailure, setLoadFailure] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirmDialog()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [intakeText, setIntakeText] = useState('')
  const [intakePreview, setIntakePreview] = useState<ParsedIntakeContact[] | null>(null)
  const [intakeBusy, setIntakeBusy] = useState<'preview' | 'create' | null>(null)

  const [postureId, setPostureId] = useState<string | null>(null)
  const [warmStart, setWarmStart] = useState<WarmStartSuggestion[] | null>(null)
  const [warmStartSelected, setWarmStartSelected] = useState<ReadonlySet<string>>(new Set())
  const [warmStartBusy, setWarmStartBusy] = useState<'load' | 'add' | null>(null)

  const [researchingId, setResearchingId] = useState<string | null>(null)
  const [batch, setBatch] = useState<{ done: number; total: number; current: string } | null>(null)

  const [loggingId, setLoggingId] = useState<string | null>(null)
  const [logStatus, setLogStatus] = useState('contacted')
  const [logOutcome, setLogOutcome] = useState('')
  const [logIntel, setLogIntel] = useState('')
  const [logNextStep, setLogNextStep] = useState('')
  const [logFollowUpDays, setLogFollowUpDays] = useState<number | null>(7)
  const [logChannel, setLogChannel] = useState('phone')
  const [logValue, setLogValue] = useState('')
  const [logOfferRef, setLogOfferRef] = useState('')
  const [logEvidenceIds, setLogEvidenceIds] = useState<string[]>([])
  const [savingLog, setSavingLog] = useState(false)

  const [editingOffer, setEditingOffer] = useState<{ contactId: string; key: string } | null>(null)
  const [offerDraft, setOfferDraft] = useState({ title: '', oneLiner: '', priceBand: '' })

  const [editingBriefId, setEditingBriefId] = useState<string | null>(null)
  const [briefDraft, setBriefDraft] = useState({ suggestedOpener: '', callBrief: '' })
  const [savingBrief, setSavingBrief] = useState(false)
  const [voiceLearningByContact, setVoiceLearningByContact] = useState<
    Record<string, OutreachVoiceLearningState>
  >({})
  const [voiceLearningRequests] = useState(() => createOutreachVoiceLearningRequestTracker())

  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactDraft, setContactDraft] = useState<Record<string, string>>({})
  const [savingContact, setSavingContact] = useState(false)
  const [channelOptionsContactId, setChannelOptionsContactId] = useState<string | null>(null)
  const [channelOptionDrafts, setChannelOptionDrafts] = useState<ChannelOptionDraft[]>([])
  const [savingChannelOptions, setSavingChannelOptions] = useState(false)
  const [trackerDetailContactId, setTrackerDetailContactId] = useState<string | null>(null)
  const [showCompletedTrackerRows, setShowCompletedTrackerRows] = useState(false)
  const channelOptionsEditorRef = useRef<HTMLDivElement>(null)
  const trackerDetailRef = useRef<HTMLDivElement>(null)
  const logPanelRef = useRef<HTMLDivElement>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [segmentFilter, setSegmentFilter] = useState('all')
  const [warmthFilter, setWarmthFilter] = useState('all')
  const [contactSearch, setContactSearch] = useState('')
  const [seedingOffers, setSeedingOffers] = useState(false)
  const [catalogSaveState, setCatalogSaveState] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})

  const say = (message: string) => {
    setError(null)
    setNotice(message)
  }
  const fail = (err: unknown, fallback: string) => {
    setNotice(null)
    setError(err instanceof Error ? err.message : fallback)
  }

  const loadOutreach = useCallback(async () => {
    if (!canManageOutreach) {
      setLoading(false)
      return
    }
    setLoadFailure(null)
    try {
      const [result, voiceSettings] = await Promise.all([
        outreachClient.fetch<{
          contacts: MarketingContact[]
          offers: MarketingOffer[]
          evidenceLinks: Array<WorkEvidence & { _id: string }>
          financialPosture: string | null
        }>(
          `{
            "contacts": *[_type == "marketingContact"]|order(coalesce(feasibilityScore, -1) desc, _updatedAt desc){${CONTACT_FIELDS}},
            "offers": *[_type == "marketingOffer"]|order(coalesce(order, 100) asc, title asc){
              _id, _updatedAt, title, key, status, oneLiner, description, priceBand, idealBuyer, proofPoints, order
            },
            "evidenceLinks": *[_type == "marketingWorkEvidence" && status == "active"]{
              _id, sourceId, slug, url, manuallyEdited, extractedAt, title, status
            },
            "financialPosture": *[_id == "${FINANCIAL_POSTURE_DOC_ID}"][0].posture
          }`,
        ),
        client
          .fetch<unknown[]>(
            `*[_id == "marketingSettings"][0].brandVoices[]{_key, name, purpose, guidance, do, avoid, examples, status, isDefault}`,
          )
          .catch(() => []),
      ])
      const nextEvidenceLinks = result.evidenceLinks || []
      setContacts(result.contacts || [])
      setOffers(result.offers || [])
      setBrandVoices(normalizeMarketingBrandVoices(voiceSettings))
      setEvidenceCount(
        compactEvidenceIndex(nextEvidenceLinks, { max: Math.max(nextEvidenceLinks.length, 1) }).length,
      )
      setEvidenceLinks(nextEvidenceLinks)
      // The posture doc shares the PRIVATE outreach dataset (candid feasibility
      // data — never the world-readable production dataset). Unset/unknown
      // falls back to the survival copy in the plan panel.
      setPostureId(isFinancialPostureId(result.financialPosture) ? result.financialPosture : null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load outreach data.'
      setLoadFailure(message)
      fail(err, 'Could not load outreach data.')
    } finally {
      setLoading(false)
    }
  }, [canManageOutreach, client, outreachClient])

  useEffect(() => {
    if (canManageOutreach) void loadOutreach()
  }, [canManageOutreach, loadOutreach])

  const offerByKey = useMemo(() => {
    const map = new Map<string, MarketingOffer>()
    for (const offer of offers) if (offer.key) map.set(offer.key, offer)
    return map
  }, [offers])
  const evidenceUrlById = useMemo(() => {
    const canonicalIds = new Set(
      compactEvidenceIndex(evidenceLinks, { max: Math.max(evidenceLinks.length, 1) }).map((item) => item.id),
    )
    return new Map(
      evidenceLinks
        .filter((item) => canonicalIds.has(item._id))
        .map((item) => [item._id, item.url]),
    )
  }, [evidenceLinks])
  const readyOffers = useMemo(
    () => offers.filter((offer) => offer.status === 'active' && hasRealPrice(offer.priceBand)),
    [offers],
  )
  const activeBrandVoices = useMemo(
    () => brandVoices.filter((voice) => voice.status === 'active'),
    [brandVoices],
  )
  const defaultBrandVoice = useMemo(
    () => activeBrandVoices.find((voice) => voice.isDefault) || activeBrandVoices[0] || null,
    [activeBrandVoices],
  )

  const trackerReadinessIssues = useCallback(
    (value: OutreachProgressContact): string[] => {
      const contact = value as MarketingContact
      const present = presentedOffer(contact, offerByKey)
      const selectedBrandVoice = contact.brandVoiceKey
        ? activeBrandVoices.find((voice) => voice._key === contact.brandVoiceKey) || null
        : null
      const intendedBrandVoice = selectedBrandVoice || defaultBrandVoice
      return [
        !(contact.relevantEvidence || []).some(
          (item) => item.evidenceId && evidenceUrlById.has(item.evidenceId),
        )
          ? 'Choose currently active work evidence.'
          : null,
        !hasRealPrice(present.priceBand) ? 'Choose an offer with a real price band.' : null,
        contact.brandVoiceKey && !selectedBrandVoice
          ? 'Choose an active writing voice or inherit the suite default.'
          : null,
        contact.researchedAt &&
        (contact.researchBrandVoiceKey || null) !== (intendedBrandVoice?._key || null)
          ? 'Re-research the wording in the selected writing voice.'
          : null,
      ].filter((issue): issue is string => Boolean(issue))
    },
    [activeBrandVoices, defaultBrandVoice, evidenceUrlById, offerByKey],
  )

  const nowIso = new Date().toISOString()
  const outreachProgress = useMemo(
    () =>
      buildOutreachProgress(contacts, {
        now: nowIso,
        readinessIssues: trackerReadinessIssues,
      }),
    [contacts, nowIso, trackerReadinessIssues],
  )
  const unresearched = useMemo(() => contacts.filter((c) => (c.status || 'new') === 'new'), [contacts])
  const trackerDetailContact = useMemo(
    () => contacts.find((contact) => contact._id === trackerDetailContactId) || null,
    [contacts, trackerDetailContactId],
  )
  const adHocLogContact = useMemo(() => {
    if (!loggingId) return null
    return trackerDetailContactId === loggingId
      ? null
      : contacts.find((contact) => contact._id === loggingId) || null
  }, [contacts, loggingId, trackerDetailContactId])
  const visibleContacts = useMemo(
    () => {
      const query = contactSearch.trim().toLowerCase()
      return contacts.filter((contact) => {
        if (statusFilter !== 'all' && (contact.status || 'new') !== statusFilter) return false
        if (segmentFilter !== 'all' && (contact.segment || '') !== segmentFilter) return false
        if (warmthFilter !== 'all' && (contact.warmth || 'unknown') !== warmthFilter) return false
        if (!query) return true
        return [contact.name, contact.organization, contact.role, contact.owner, contact.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      })
    },
    [contactSearch, contacts, segmentFilter, statusFilter, warmthFilter],
  )

  // ---- Intake ----

  const previewIntake = async () => {
    if (!intakeText.trim()) return
    setIntakeBusy('preview')
    setIntakePreview(null)
    try {
      const result = await outreachApi<{ contacts: ParsedIntakeContact[]; duplicates: number }>(
        '/api/marketing/outreach/intake',
        { text: intakeText, dryRun: true },
        'POST',
        outreachClient,
      )
      setIntakePreview(result.contacts)
      say(
        `Parsed ${result.contacts.length} contact${result.contacts.length === 1 ? '' : 's'}` +
          (result.duplicates ? ` (${result.duplicates} already exist and will be skipped)` : '') +
          '. Check the names below, then add.',
      )
    } catch (err) {
      fail(err, 'Could not parse the pasted text.')
    } finally {
      setIntakeBusy(null)
    }
  }

  const createFromIntake = async () => {
    if (!intakePreview) return
    setIntakeBusy('create')
    try {
      // Commit EXACTLY the previewed parse — the route skips the model when
      // given pre-parsed contacts, so what was approved is what gets saved.
      const result = await outreachApi<{ created: Array<{ id: string }>; skipped: unknown[]; seededOffers: number }>(
        '/api/marketing/outreach/intake',
        { contacts: intakePreview },
        'POST',
        outreachClient,
      )
      setIntakeText('')
      setIntakePreview(null)
      clearUnsavedChanges(OUTREACH_INTAKE_UNSAVED_ID)
      await loadOutreach()
      say(
        `Added ${result.created.length} contact${result.created.length === 1 ? '' : 's'}` +
          (result.skipped.length ? `, skipped ${result.skipped.length} duplicate${result.skipped.length === 1 ? '' : 's'}` : '') +
          (result.seededOffers ? `, and set up the ${result.seededOffers} standard offers` : '') +
          '. Next: run research to build the call plan.',
      )
    } catch (err) {
      fail(err, 'Could not add contacts.')
    } finally {
      setIntakeBusy(null)
    }
  }

  // ---- Warm-start suggestions (from the site's own CMS data) ----

  const loadWarmStart = async () => {
    setWarmStartBusy('load')
    try {
      // Public site data lives in the PRODUCTION dataset — the base client.
      // Exclude drafts: the Studio client reads the raw perspective, and an
      // open draft would otherwise double every case study (duplicate titles,
      // unpublished client names) — suggestions must come from PUBLISHED work.
      const raw = await client.fetch<{
        caseStudyClients: Array<{ client?: string | null; title?: string | null }>
        thankedPeople: Array<{ text?: string | null; featureTitle?: string | null }>
        teamMembers: Array<{ name?: string | null }>
      }>(
        `{
          "caseStudyClients": *[_type == "caseStudy" && defined(client) && !(_id in path("drafts.**"))]{client, title},
          "thankedPeople": *[_type == "feature" && defined(specialThanks) && !(_id in path("drafts.**"))]{"text": pt::text(specialThanks), "featureTitle": title},
          "teamMembers": *[_type == "teamMember" && defined(name) && isAlumni != true &&
            showOnAboutPage != false && !(_id in path("drafts.**"))]{name}
        }`,
      )
      const suggestions = buildWarmStartSuggestions({
        caseStudyClients: raw.caseStudyClients || [],
        thankedPeople: raw.thankedPeople || [],
        teamMembers: raw.teamMembers || [],
        existingContacts: contacts,
      })
      setWarmStart(suggestions)
      // Suggestions are leads for human review, not approved contacts. Never
      // bulk-select org placeholders or thanked names by default.
      setWarmStartSelected(new Set())
      say(
        suggestions.length
          ? `Found ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} from our published work — select only named people or accounts with a clear owner.`
          : 'No new suggestions — everyone from our published work is already in the contacts list.',
      )
    } catch (err) {
      fail(err, 'Could not load suggestions from the site data.')
    } finally {
      setWarmStartBusy(null)
    }
  }

  const addWarmStart = async () => {
    if (!warmStart) return
    const chosen = warmStart.filter((s) => warmStartSelected.has(contactDedupeKey(s.name, s.organization)))
    if (!chosen.length) return
    setWarmStartBusy('add')
    try {
      // Same commit path as pasted contacts: the route re-validates, dedupes
      // against existing docs, and applies the standard contact defaults.
      const result = await outreachApi<{ created: Array<{ id: string }>; skipped: unknown[] }>(
        '/api/marketing/outreach/intake',
        {
          contacts: chosen.map((s) => ({
            name: s.name,
            organization: s.organization,
            howWeKnow: s.howWeKnow,
            warmth: 'warm',
          })),
        },
        'POST',
        outreachClient,
      )
      setWarmStart(null)
      setWarmStartSelected(new Set())
      await loadOutreach()
      say(
        `Added ${result.created.length} from our past work` +
          (result.skipped.length ? ` (${result.skipped.length} already existed)` : '') +
          '. Org-level entries research the organization — put a person’s name on them when you know who to call.',
      )
    } catch (err) {
      fail(err, 'Could not add the selected suggestions.')
    } finally {
      setWarmStartBusy(null)
    }
  }

  // ---- Research ----

  const researchOne = async (contact: MarketingContact) => {
    if (
      contact.researchedAt &&
      !(await confirm({
        title: 'Run fresh research?',
        message: `Re-research ${contact.name || 'this contact'}? The prior research summary, sources, and generated brief will be replaced. Your chosen and edited offer drafts will be preserved.`,
        confirmLabel: 'Run research',
      }))
    ) {
      return
    }
    setResearchingId(contact._id)
    try {
      const result = await outreachApi<{ feasibilityScore: number | null; personVerified: boolean; evidenceIndexSize?: number }>(
        '/api/marketing/outreach/research',
        { id: contact._id },
        'POST',
        outreachClient,
      )
      await loadOutreach()
      say(
        `Researched ${contact.name || 'contact'} — review identity, evidence, and the priced offer before approving the call brief` +
          (result.personVerified === false ? ' (person unverified — org-level research only)' : '') +
          '.' +
          (result.evidenceIndexSize === 0
            ? ' Researched without case-study evidence — extract evidence on the Evidence tab and re-research to get the show-them list.'
            : ''),
      )
    } catch (err) {
      fail(err, 'Research failed.')
    } finally {
      setResearchingId(null)
    }
  }

  const researchAllNew = async () => {
    const targets = [...unresearched]
    if (targets.length === 0) return
    setBatch({ done: 0, total: targets.length, current: targets[0]?.name || '' })
    const failures: string[] = []
    let missingEvidence = false
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i]
      setBatch({ done: i, total: targets.length, current: target.name || 'contact' })
      try {
        const result = await outreachApi<{ evidenceIndexSize?: number }>(
          '/api/marketing/outreach/research',
          { id: target._id },
          'POST',
          outreachClient,
        )
        if (result.evidenceIndexSize === 0) missingEvidence = true
      } catch (err) {
        failures.push(`${target.name || target._id}: ${err instanceof Error ? err.message : 'failed'}`)
      }
      // Progress persists per contact — safe to close and come back; anyone
      // still marked New just needs Research again.
      await loadOutreach()
    }
    setBatch(null)
    if (failures.length) {
      fail(new Error(`${failures.length} of ${targets.length} failed — ${failures[0]}`), 'Research batch failed.')
    } else {
      say(
        `Researched ${targets.length} contact${targets.length === 1 ? '' : 's'}. Review and approve each brief before it enters the call plan.` +
          (missingEvidence
            ? ' Researched without case-study evidence — extract evidence on the Evidence tab and re-research to get the show-them list.'
            : ''),
      )
    }
  }

  // ---- Offer choosing / editing ----

  const chooseOffer = async (contact: MarketingContact, key: string | null) => {
    const updated = (contact.proposedOffers || []).map((o) => ({ ...o, chosen: o._key === key }))
    try {
      let patch = outreachClient.patch(contact._id).set({ proposedOffers: updated }).unset(['researchReviewedAt'])
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      await patch.commit()
      await loadOutreach()
      say(key ? 'Offer chosen — the call now presents this draft.' : 'Reset to the catalog offer.')
    } catch (err) {
      fail(err, 'Could not choose the offer.')
    }
  }

  const startEditOffer = (contact: MarketingContact, key: string) => {
    if (editingOffer?.contactId === contact._id && editingOffer.key === key) return
    if (
      editingOffer &&
      (editingOffer.contactId !== contact._id || editingOffer.key !== key) &&
      !confirmDiscardUnsavedChange(OUTREACH_OFFER_UNSAVED_ID)
    ) {
      return
    }
    const offer = (contact.proposedOffers || []).find((o) => o._key === key)
    if (!offer) return
    clearUnsavedChanges(OUTREACH_OFFER_UNSAVED_ID)
    setEditingOffer({ contactId: contact._id, key })
    setOfferDraft({ title: offer.title || '', oneLiner: offer.oneLiner || '', priceBand: offer.priceBand || '' })
  }

  const saveOfferEdit = async (contact: MarketingContact) => {
    if (!editingOffer) return
    const updated = (contact.proposedOffers || []).map((o) =>
      o._key === editingOffer.key
        ? { ...o, title: offerDraft.title, oneLiner: offerDraft.oneLiner, priceBand: offerDraft.priceBand }
        : o,
    )
    try {
      let patch = outreachClient.patch(contact._id).set({ proposedOffers: updated }).unset(['researchReviewedAt'])
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      await patch.commit()
      setEditingOffer(null)
      await loadOutreach()
      clearUnsavedChanges(OUTREACH_OFFER_UNSAVED_ID)
      say('Offer draft updated.')
    } catch (err) {
      fail(err, 'Could not save the offer edit.')
    }
  }

  const promoteToCatalog = async (offer: { title?: string; oneLiner?: string; priceBand?: string; rationale?: string }) => {
    if (!offer.title) return
    try {
      await outreachClient.create({
        _type: 'marketingOffer',
        title: offer.title,
        key: `${slugify(offer.title).slice(0, 48)}-${Math.random().toString(36).slice(2, 6)}`,
        status: 'active',
        oneLiner: offer.oneLiner,
        priceBand: offer.priceBand,
        description: offer.rationale,
        order: 60,
      })
      await loadOutreach()
      say(`"${offer.title}" saved to the offer catalog.`)
    } catch (err) {
      fail(err, 'Could not save to the catalog.')
    }
  }

  // ---- Call logging (append-only history + follow-up date) ----

  const openLog = (contact: MarketingContact, recommendedChannel?: OutreachChannel) => {
    if (loggingId === contact._id) {
      focusRevealedPanel(logPanelRef)
      return true
    }
    if (loggingId && loggingId !== contact._id && !confirmDiscardUnsavedChange(OUTREACH_LOG_UNSAVED_ID)) return false
    clearUnsavedChanges(OUTREACH_LOG_UNSAVED_ID)
    setLoggingId(contact._id)
    // Default to the contact's CURRENT status when it's a loggable one — a
    // 'meeting' contact must not silently regress to 'contacted'.
    setLogStatus(LOG_STATUS_VALUES.includes(contact.status || '') ? (contact.status as string) : 'contacted')
    setLogOutcome('')
    setLogIntel('')
    setLogNextStep(contact.nextStep || '')
    setLogFollowUpDays(7)
    setLogChannel(recommendedChannel || 'phone')
    setLogValue('')
    // Attribution must describe what actually happened, not silently inherit
    // the AI brief. The person logging the interaction makes both selections.
    setLogOfferRef('')
    setLogEvidenceIds([])
    focusRevealedPanel(logPanelRef)
    return true
  }

  const focusRevealedPanel = (
    panelRef: { current: HTMLDivElement | null },
    block: ScrollLogicalPosition = 'center',
  ) => {
    window.setTimeout(() => {
      const panel = panelRef.current
      if (!panel) return
      panel.scrollIntoView({ behavior: 'smooth', block })
      panel.focus({ preventScroll: true })
    }, 0)
  }

  const requestVoiceLearningProposal = async (
    contactId: string,
    voiceKey: string,
    before: OutreachVoiceCopy,
    after: OutreachVoiceCopy,
  ) => {
    const requestId = voiceLearningRequests.begin(contactId)
    setVoiceLearningByContact((current) => ({
      ...current,
      [contactId]: { status: 'proposing' },
    }))
    try {
      const result = await outreachApi<{ proposal: BrandVoiceLearningProposal }>(
        '/api/marketing/brand-voice/learn',
        {
          action: 'propose',
          voiceKey,
          surface: 'outreach',
          before,
          after,
        },
        'POST',
        outreachClient,
      )
      if (!result.proposal || result.proposal.voice.key !== voiceKey) {
        throw new Error('The learning service returned a proposal for the wrong voice.')
      }
      if (!voiceLearningRequests.isCurrent(contactId, requestId)) return
      setVoiceLearningByContact((current) => ({
        ...current,
        [contactId]: { status: 'ready', proposal: result.proposal },
      }))
    } catch (err) {
      if (!voiceLearningRequests.isCurrent(contactId, requestId)) return
      setVoiceLearningByContact((current) => ({
        ...current,
        [contactId]: {
          status: 'error',
          error: voiceLearningFailureMessage(err, 'propose'),
        },
      }))
    }
  }

  const dismissVoiceLearning = (contactId: string) => {
    voiceLearningRequests.invalidate(contactId)
    setVoiceLearningByContact((current) => {
      const next = { ...current }
      delete next[contactId]
      return next
    })
  }

  const applyVoiceLearning = async (
    contactId: string,
    selection: BrandVoiceLearningSelection,
  ) => {
    const currentState = voiceLearningByContact[contactId]
    const proposal = currentState?.proposal
    if (!proposal || currentState.status === 'applying') return
    const requestId = voiceLearningRequests.begin(contactId)
    const outreachSelection: BrandVoiceLearningSelection = {
      ...selection,
      examples: false,
    }

    setVoiceLearningByContact((current) => ({
      ...current,
      [contactId]: { ...current[contactId], status: 'applying', error: undefined },
    }))
    try {
      const result = await outreachApi<{
        applied: true
        voice: { key: string; name: string }
        settingsRevision: string
      }>(
        '/api/marketing/brand-voice/learn',
        { action: 'apply', proposal, selection: outreachSelection },
        'POST',
        outreachClient,
      )
      if (!result.applied || result.voice.key !== proposal.voice.key) {
        throw new Error('The learning service did not confirm the selected voice update.')
      }
      await loadOutreach()
      if (!voiceLearningRequests.isCurrent(contactId, requestId)) return
      setVoiceLearningByContact((current) => ({
        ...current,
        [contactId]: {
          status: 'applied',
          message: `${result.voice.name} was updated. The saved opener and brief did not change; selected learning will guide future drafts.`,
        },
      }))
    } catch (err) {
      if (!voiceLearningRequests.isCurrent(contactId, requestId)) return
      const error = voiceLearningFailureMessage(err, 'apply')
      const needsFreshProposal = needsFreshVoiceLearningProposal(err)
      setVoiceLearningByContact((current) => ({
        ...current,
        [contactId]: needsFreshProposal
          ? { status: 'error', error, needsFreshProposal: true }
          : { status: 'ready', proposal, error },
      }))
    }
  }

  const startEditBrief = (contact: MarketingContact) => {
    if (editingBriefId === contact._id) return true
    if (
      editingBriefId &&
      editingBriefId !== contact._id &&
      !confirmDiscardUnsavedChange(OUTREACH_BRIEF_UNSAVED_ID)
    ) {
      return false
    }
    dismissVoiceLearning(contact._id)
    clearUnsavedChanges(OUTREACH_BRIEF_UNSAVED_ID)
    setEditingBriefId(contact._id)
    setBriefDraft({
      suggestedOpener: contact.suggestedOpener || '',
      callBrief: contact.callBrief || '',
    })
    return true
  }

  const startFreshVoiceLearningProposal = (contact: MarketingContact) => {
    if (!startEditBrief(contact)) return
    say('Edit the suggested opener, then save it to prepare a fresh voice-learning proposal.')
  }

  const saveBriefEdit = async (contact: MarketingContact) => {
    if (editingBriefId !== contact._id) return
    const suggestedOpener = briefDraft.suggestedOpener.trim()
    const callBrief = briefDraft.callBrief.trim()
    const before: OutreachVoiceCopy = {
      suggestedOpener: contact.suggestedOpener || '',
    }
    const after: OutreachVoiceCopy = { suggestedOpener }
    const shouldPrepareVoiceLearning = Boolean(
      contact.researchBrandVoiceKey && hasMaterialOutreachVoiceEdit(before, after),
    )
    const set: Record<string, string> = {}
    const unset = ['researchReviewedAt']
    if (suggestedOpener) set.suggestedOpener = suggestedOpener
    else unset.push('suggestedOpener')
    if (callBrief) set.callBrief = callBrief
    else unset.push('callBrief')

    setSavingBrief(true)
    try {
      let patch = outreachClient.patch(contact._id).unset(unset)
      if (Object.keys(set).length > 0) patch = patch.set(set)
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      await patch.commit()
      setEditingBriefId(null)
      await loadOutreach()
      clearUnsavedChanges(OUTREACH_BRIEF_UNSAVED_ID)
      say(`${contact.name || 'Contact'}'s wording is saved. Review and approve the updated brief before it returns to the call plan.`)
      if (shouldPrepareVoiceLearning && contact.researchBrandVoiceKey) {
        void requestVoiceLearningProposal(
          contact._id,
          contact.researchBrandVoiceKey,
          before,
          after,
        )
      }
    } catch (err) {
      fail(err, 'Could not save the updated opener and call brief.')
    } finally {
      setSavingBrief(false)
    }
  }

  const saveLog = async (contact: MarketingContact) => {
    if (savingLog) return
    if (!logOutcome.trim()) {
      fail(new Error('Describe what happened before saving this interaction.'), 'Could not save the call log.')
      return
    }
    const numericValue = logValue.trim() ? Number(logValue) : undefined
    if (numericValue !== undefined && (!Number.isFinite(numericValue) || numericValue < 0)) {
      fail(new Error('Opportunity value must be a non-negative number.'), 'Could not save the call log.')
      return
    }
    if (logStatus === 'won' && numericValue === undefined) {
      fail(new Error('Enter the actual closed value before marking an opportunity Won.'), 'Could not save the call log.')
      return
    }
    setSavingLog(true)
    const at = new Date().toISOString()
    const selectedProposal = (contact.proposedOffers || []).find(
      (offer) => logOfferRef === `proposal:${offer._key || slugify(offer.title || 'offer')}`,
    )
    const selectedCatalog = !selectedProposal && logOfferRef ? offerByKey.get(logOfferRef) : undefined
    const selectedOfferKey = selectedProposal ? logOfferRef : selectedCatalog?.key
    const selectedOfferTitle = selectedProposal?.title || selectedCatalog?.title
    const evidenceIds = [...new Set(logEvidenceIds.filter((id) => evidenceUrlById.has(id)))].slice(0, 10)
    const terminal = ['won', 'lost', 'closed'].includes(logStatus)
    const entry = buildInteractionEntry({
      at,
      by: currentUser?.name || currentUser?.id,
      outcome: logOutcome.trim() || undefined,
      intel: logIntel.trim() || undefined,
      nextStep: terminal ? undefined : logNextStep.trim() || undefined,
      statusAfter: logStatus,
      channel: logChannel,
      offerKey: selectedOfferKey,
      offerTitle: selectedOfferTitle,
      evidenceIds,
      value: numericValue,
    })
    const set: Record<string, unknown> = { status: logStatus, lastContactedAt: at }
    set.attributionChannel = logChannel
    if (selectedOfferKey) set.attributedOfferKey = selectedOfferKey
    if (selectedOfferTitle) set.attributedOfferTitle = selectedOfferTitle
    if (evidenceIds.length > 0) set.attributedEvidenceIds = evidenceIds
    if (numericValue !== undefined) {
      if (logStatus === 'won') set.closedValue = numericValue
      else set.estimatedValue = numericValue
    }
    if (logStatus === 'lost') set.closedValue = 0
    if (terminal) {
      set.closedAt = at
      if (logOutcome.trim()) set.closeReason = logOutcome.trim()
    }
    if (!terminal && logNextStep.trim()) set.nextStep = logNextStep.trim()
    if (!terminal && logFollowUpDays !== null) {
      set.followUpAt = new Date(Date.now() + logFollowUpDays * 86400000).toISOString()
    }
    try {
      let patch = outreachClient
        .patch(contact._id)
        .setIfMissing({ interactions: [] })
        .set(set)
      const unset: string[] = []
      if (terminal || !logNextStep.trim()) unset.push('nextStep')
      if (terminal || logFollowUpDays === null) unset.push('followUpAt')
      if (
        !terminal &&
        (contact.closedAt || typeof contact.closedValue === 'number' || contact.closeReason)
      ) {
        unset.push('closedAt', 'closedValue', 'closeReason')
      }
      if (unset.length > 0) patch = patch.unset(unset)
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      await patch
        .insert('after', 'interactions[-1]', [entry])
        .commit()
      setLoggingId(null)
      await loadOutreach()
      clearUnsavedChanges(OUTREACH_LOG_UNSAVED_ID)
      say(
        `Logged ${labelForValue(STATUS_SHORT_OPTIONS, logStatus).toLowerCase()} for ${contact.name || 'contact'}` +
          (!terminal && logFollowUpDays !== null ? ` — follows up in ${logFollowUpDays} day${logFollowUpDays === 1 ? '' : 's'}` : '') +
          '. The progress tracker has recalculated.',
      )
    } catch (err) {
      fail(err, 'Could not save the call log.')
    } finally {
      setSavingLog(false)
    }
  }

  // ---- Contact editing / deletion (private dataset — edited here, not via
  // Structure intent links, which only reach the public dataset) ----

  const focusContactEditor = (field?: string) => {
    window.setTimeout(() => {
      const editor = document.getElementById('outreach-contact-editor')
      editor?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (!field || !TRACKER_CONTACT_FIELD_IDS.has(field)) return
      editor?.querySelector<HTMLElement>(`[data-outreach-contact-field="${field}"]`)?.focus()
    }, 0)
  }

  const startChannelOptions = (contact: MarketingContact) => {
    if (channelOptionsContactId === contact._id) {
      focusRevealedPanel(channelOptionsEditorRef)
      return
    }
    if (
      channelOptionsContactId &&
      !confirmDiscardUnsavedChange(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)
    ) {
      return
    }
    if (editingContactId && !confirmDiscardUnsavedChange(OUTREACH_CONTACT_UNSAVED_ID)) return
    clearUnsavedChanges(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)
    clearUnsavedChanges(OUTREACH_CONTACT_UNSAVED_ID)
    setEditingContactId(null)
    setChannelOptionsContactId(contact._id)
    setChannelOptionDrafts(buildChannelOptionDrafts(contact.channelOverrides))
    focusRevealedPanel(channelOptionsEditorRef)
  }

  const updateChannelOptionState = (
    channel: string,
    state: '' | OutreachChannelOverrideState,
  ) => {
    markUnsavedChange(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID, 'channel options draft')
    setChannelOptionDrafts((current) =>
      current.map((draft) => {
        if (state === 'preferred' && draft.channel !== channel && draft.state === 'preferred') {
          return { ...draft, state: '', note: '' }
        }
        if (draft.channel !== channel) return draft
        return { ...draft, state, note: state ? draft.note : '' }
      }),
    )
  }

  const saveChannelOptions = async () => {
    if (!channelOptionsContactId) return
    const contact = contacts.find((candidate) => candidate._id === channelOptionsContactId)
    if (!contact) {
      fail(new Error('This contact is no longer available. Reload and try again.'), 'Could not save channel options.')
      return
    }
    if (channelOptionDrafts.filter((draft) => draft.state === 'preferred').length > 1) {
      fail(new Error('Only one channel can be preferred.'), 'Could not save channel options.')
      return
    }
    const overrides = channelOptionDrafts
      .filter((draft) => Boolean(draft.state))
      .map((draft) => ({
        _type: 'outreachChannelOverride',
        _key:
          draft._key ||
          `channel-${draft.channel.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}-${Date.now().toString(36)}`,
        channel: draft.channel,
        state: draft.state,
        ...(draft.note.trim() ? { note: draft.note.trim().slice(0, 240) } : {}),
      }))
    setSavingChannelOptions(true)
    try {
      let patch = outreachClient.patch(contact._id)
      patch = overrides.length > 0
        ? patch.set({ channelOverrides: overrides })
        : patch.unset(['channelOverrides'])
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      await patch.commit()
      setChannelOptionsContactId(null)
      setChannelOptionDrafts([])
      clearUnsavedChanges(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)
      await loadOutreach()
      say(
        overrides.length > 0
          ? `Channel options saved for ${contact.name || 'this contact'}. The tracker has recalculated its advice.`
          : `Channel options returned to Auto for ${contact.name || 'this contact'}.`,
      )
    } catch (err) {
      fail(err, 'Could not save channel options.')
    } finally {
      setSavingChannelOptions(false)
    }
  }

  const startEditContact = (contact: MarketingContact, focusField?: string) => {
    if (
      channelOptionsContactId &&
      !confirmDiscardUnsavedChange(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)
    ) {
      return
    }
    if (channelOptionsContactId) {
      setChannelOptionsContactId(null)
      setChannelOptionDrafts([])
      clearUnsavedChanges(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)
    }
    if (editingContactId === contact._id) {
      focusContactEditor(focusField)
      return
    }
    if (
      editingContactId &&
      editingContactId !== contact._id &&
      !confirmDiscardUnsavedChange(OUTREACH_CONTACT_UNSAVED_ID)
    ) {
      return
    }
    clearUnsavedChanges(OUTREACH_CONTACT_UNSAVED_ID)
    setEditingContactId(contact._id)
    setContactDraft({
      name: contact.name || '',
      organization: contact.organization || '',
      role: contact.role || '',
      segment: contact.segment || '',
      warmth: contact.warmth || '',
      owner: contact.owner || '',
      brandVoiceKey: contact.brandVoiceKey || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedinUrl: contact.linkedinUrl || '',
      howWeKnow: contact.howWeKnow || '',
      status: contact.status || 'new',
      followUpAt: followUpDateInput(contact.followUpAt),
      nextStep: contact.nextStep || '',
    })
    focusContactEditor(focusField)
  }

  const saveContactEdit = async () => {
    if (!editingContactId) return
    const original = contacts.find((contact) => contact._id === editingContactId)
    if (!original) {
      fail(new Error('This contact is no longer available. Reload and try again.'), 'Could not save the contact.')
      return
    }
    const requestedStatus = contactDraft.status || 'new'
    if (REVIEW_MANAGED_STATUSES.has(requestedStatus) && requestedStatus !== original.status) {
      fail(
        new Error('Needs review, Researched, and Briefed can only be set through the research approval workflow.'),
        'Could not save the contact.',
      )
      return
    }
    const requestedBrandVoiceKey = (contactDraft.brandVoiceKey || '').trim()
    if (
      requestedBrandVoiceKey &&
      !activeBrandVoices.some((voice) => voice._key === requestedBrandVoiceKey)
    ) {
      fail(
        new Error('That writing voice is unavailable. Choose an active voice or inherit the suite default.'),
        'Could not save the contact.',
      )
      return
    }
    const normalizedLinkedIn = normalizeOutreachUrl(contactDraft.linkedinUrl, { linkedinOnly: true })
    if (contactDraft.linkedinUrl?.trim() && !normalizedLinkedIn) {
      fail(new Error('LinkedIn URL must be an http(s) linkedin.com address.'), 'Could not save the contact.')
      return
    }
    const requestedFollowUpDate = (contactDraft.followUpAt || '').trim()
    const normalizedFollowUpAt = requestedFollowUpDate
      ? followUpDateIso(requestedFollowUpDate)
      : null
    if (requestedFollowUpDate && !normalizedFollowUpAt) {
      fail(new Error('Follow-up date must be a valid calendar date.'), 'Could not save the contact.')
      return
    }
    const identityChanged = (['name', 'organization', 'role'] as const).some(
      (field) => (contactDraft[field] || '').trim() !== (original[field] || '').trim(),
    )
    const brandVoiceChanged =
      (contactDraft.brandVoiceKey || '').trim() !== (original.brandVoiceKey || '').trim()
    const hasHistoricalAttribution = contactHasHistoricalAttribution(original)
    if (
      identityChanged &&
      (original.researchedAt || hasHistoricalAttribution) &&
      !(await confirm({
        title: hasHistoricalAttribution ? 'Save a correction to this identity?' : 'Identity changed — clear stale research?',
        message: hasHistoricalAttribution
          ? 'This record has interaction or revenue history. Only continue to correct the same person; create a new contact for a different person. The previous name, organization, and role will be retained in an audit snapshot, and stale research will be cleared.'
          : 'Changing the name, organization, or role invalidates the existing identity check and call brief. Save the identity and clear that research so it can be run again?',
        confirmLabel: hasHistoricalAttribution ? 'Save correction + audit snapshot' : 'Save and clear research',
      }))
    ) {
      return
    }
    setSavingContact(true)
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    for (const [key, value] of Object.entries(contactDraft)) {
      if (key === 'followUpAt') continue
      if (value.trim()) set[key] = value.trim()
      else unset.push(key)
    }
    if (normalizedLinkedIn) set.linkedinUrl = normalizedLinkedIn
    set.name = contactDraft.name.trim() || 'Unnamed'
    set.status = requestedStatus
    const terminalStatuses = ['won', 'lost', 'closed']
    const requestedTerminal = terminalStatuses.includes(requestedStatus)
    const reopenedTerminal = terminalStatuses.includes(original.status || '') && !requestedTerminal
    if (requestedTerminal) {
      delete set.nextStep
      unset.push('followUpAt', 'nextStep')
    } else if (normalizedFollowUpAt) {
      set.followUpAt = normalizedFollowUpAt
    } else {
      unset.push('followUpAt')
    }
    if (reopenedTerminal) unset.push('closedAt', 'closedValue', 'closeReason')
    if (identityChanged && original.researchedAt && ['new', 'needsReview', 'researched', 'briefed'].includes(original.status || '')) {
      set.status = 'new'
    }
    if (brandVoiceChanged && original.researchedAt) {
      unset.push('researchReviewedAt')
      if (['new', 'needsReview', 'researched', 'briefed'].includes(original.status || '')) {
        set.status = 'needsReview'
      }
    }
    try {
      let patch = outreachClient
        .patch(editingContactId)
        .set(set)
        .unset([...new Set(unset.filter((k) => !['name', 'status'].includes(k)))])
      if (identityChanged && hasHistoricalAttribution) {
        patch = patch
          .setIfMissing({ identityHistory: [] })
          .append('identityHistory', [
            {
              _type: 'outreachIdentitySnapshot',
              _key: `identity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
              name: original.name,
              organization: original.organization,
              role: original.role,
              changedAt: new Date().toISOString(),
              changedBy: currentUser?.name || currentUser?.id || 'Studio user',
            },
          ])
      }
      if (identityChanged && original.researchedAt) {
        patch = patch.unset([
          'researchedAt',
          'researchReviewedAt',
          'researchSummary',
          'personVerified',
          'identityConfidence',
          'opportunities',
          'relevantEvidence',
          'proposedOffers',
          'feasibilityScore',
          'feasibilityReasoning',
          'suggestedOfferKey',
          'suggestedOpener',
          'callBrief',
          'researchModel',
          'researchBrandVoiceKey',
          'researchBrandVoiceName',
          'researchSources',
        ])
      }
      if (original._rev) patch = patch.ifRevisionId(original._rev)
      await patch.commit()
      setEditingContactId(null)
      await loadOutreach()
      clearUnsavedChanges(OUTREACH_CONTACT_UNSAVED_ID)
      say(
        brandVoiceChanged && original.researchedAt
          ? 'Contact updated. The writing voice changed, so re-research the wording and approve the refreshed brief.'
          : 'Contact updated.',
      )
    } catch (err) {
      fail(err, 'Could not save the contact.')
    } finally {
      setSavingContact(false)
    }
  }

  const deleteContact = async (contact: MarketingContact) => {
    const hardDelete = canHardDeleteContact(contact)
    const message = hardDelete
      ? `Delete "${contact.name || 'this contact'}"? This untouched contact has no research or interaction history.`
      : `Archive "${contact.name || 'this contact'}"? Its research, interaction history, and attribution will be preserved in a closed record.`
    if (!(await confirm({
      title: hardDelete ? 'Delete untouched contact?' : 'Archive contact?',
      message,
      confirmLabel: hardDelete ? 'Delete' : 'Archive',
    }))) return
    try {
      if (hardDelete) {
        await outreachClient.delete(contact._id)
      } else {
        let patch = outreachClient.patch(contact._id).set({
          status: 'closed',
          closedAt: new Date().toISOString(),
          closeReason: 'Archived from the Outreach workspace',
        }).unset(['followUpAt', 'nextStep'])
        if (contact._rev) patch = patch.ifRevisionId(contact._rev)
        await patch.commit()
      }
      await loadOutreach()
      say(`${hardDelete ? 'Deleted' : 'Archived'} ${contact.name || 'contact'}.`)
    } catch (err) {
      fail(err, 'Could not delete the contact.')
    }
  }

  const seedOffers = async () => {
    setSeedingOffers(true)
    try {
      const result = await outreachApi<{ created: string[] }>(
        '/api/marketing/outreach/seed-offers',
        undefined,
        'POST',
        outreachClient,
      )
      await loadOutreach()
      say(
        result.created.length
          ? `Added ${result.created.length} standard offer${result.created.length === 1 ? '' : 's'}.`
          : 'All standard offers already exist.',
      )
    } catch (err) {
      fail(err, 'Could not add the standard offers.')
    } finally {
      setSeedingOffers(false)
    }
  }

  const saveOfferField = async (offer: MarketingOffer, field: 'oneLiner' | 'priceBand', value: string) => {
    const key = `${offer._id}:${field}`
    setCatalogSaveState((current) => ({ ...current, [key]: 'saving' }))
    try {
      const affectedContacts = offer.key
        ? await outreachClient.fetch<Array<{ _id: string }>>(
            `*[_type == "marketingContact" && suggestedOfferKey == $offerKey &&
              defined(researchReviewedAt) && !defined(proposedOffers[chosen == true][0])]{_id}`,
            { offerKey: offer.key },
          )
        : []
      let patch = outreachClient.patch(offer._id).set({ [field]: value })
      if (offer._rev) patch = patch.ifRevisionId(offer._rev)
      await patch.commit()
      await Promise.all(
        affectedContacts.map((contact) =>
          outreachClient.patch(contact._id).unset(['researchReviewedAt']).commit(),
        ),
      )
      await loadOutreach()
      clearUnsavedChanges(`${OUTREACH_CATALOG_UNSAVED_ID}:${key}`)
      setCatalogSaveState((current) => ({ ...current, [key]: 'saved' }))
    } catch (err) {
      setCatalogSaveState((current) => ({ ...current, [key]: 'error' }))
      fail(err, 'Could not save the offer.')
    }
  }

  // Unset/unreadable posture falls back to survival — the confirmed reality
  // this surface was built for (see the module comment).
  const activePosture = getFinancialPosture(postureId) ?? getFinancialPosture(DEFAULT_FINANCIAL_POSTURE_ID)!

  if (!currentUser) {
    return (
      <section aria-live="polite" style={styles.panel}>
        <PanelHeading title="Outreach access" description="Checking your Studio permissions…" />
      </section>
    )
  }

  if (!canManageOutreach) {
    return (
      <section role="alert" style={{ ...styles.panel, borderColor: 'rgba(217, 138, 138, 0.5)' }}>
        <PanelHeading
          title="Outreach is restricted"
          description="This private workspace contains personal contact details. Ask a Studio administrator for the Administrator, Developer, or Editor role if you need access."
        />
      </section>
    )
  }

  if (loading) {
    // Lightweight scaffold instead of a bare spinner line — the intro reads
    // while the private-dataset fetch runs, and the section names stay put.
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <style>{OUTREACH_RESPONSIVE_CSS}</style>
        <OutreachPlanPanel posture={activePosture} evidenceCount={null} offerReadyCount={0} offerTotal={0} contactCount={0} />
        {['Outreach progress tracker', 'Add contacts', 'Contact records', 'Offers'].map((title) => (
          <section key={title} style={styles.panel}>
            <PanelHeading title={title} description="Loading…" />
          </section>
        ))}
      </div>
    )
  }

  const approveContactBrief = async (contact: MarketingContact) => {
    try {
      const returnsToCallPlan =
        !contact.status || ['new', 'needsReview', 'researched', 'briefed'].includes(contact.status)
      let patch = outreachClient.patch(contact._id).set({
          ...(returnsToCallPlan ? { status: 'researched' } : {}),
          researchReviewedAt: new Date().toISOString(),
        })
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      await patch.commit()
      await loadOutreach()
      say(
        returnsToCallPlan
          ? `${contact.name || 'Contact'} approved for the ranked call plan.`
          : `${contact.name || 'Contact'}'s updated research was approved without changing the pipeline status.`,
      )
    } catch (err) {
      fail(err, 'Could not approve this research brief.')
    }
  }

  if (loadFailure) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <style>{OUTREACH_RESPONSIVE_CSS}</style>
        <section role="alert" style={{ ...styles.panel, borderColor: 'rgba(217, 138, 138, 0.5)' }}>
          <PanelHeading title="Outreach could not load" description={loadFailure} />
          <button type="button" style={styles.primaryButton} onClick={() => void loadOutreach()}>
            Retry
          </button>
        </section>
      </div>
    )
  }

  const renderPlanCard = (contact: MarketingContact, index: number, context: 'plan' | 'followUp' | 'review') => {
    const bucket = fitBucket(contact.feasibilityScore)
    const present = presentedOffer(contact, offerByKey)
    const isLogging = loggingId === contact._id
    const linkedInHref = normalizeOutreachUrl(contact.linkedinUrl, { linkedinOnly: true })
    const overdue = context === 'followUp' && contact.followUpAt && new Date(contact.followUpAt) < new Date()
    const selectedBrandVoice = contact.brandVoiceKey
      ? activeBrandVoices.find((voice) => voice._key === contact.brandVoiceKey) || null
      : null
    const intendedBrandVoice = selectedBrandVoice || defaultBrandVoice
    const missingSelectedVoice = Boolean(contact.brandVoiceKey && !selectedBrandVoice)
    const researchVoiceStale = Boolean(
      contact.researchedAt &&
        (contact.researchBrandVoiceKey || null) !== (intendedBrandVoice?._key || null),
    )
    const readinessIssues = [
      contact.personVerified !== true || !['medium', 'high'].includes(contact.identityConfidence || '')
        ? 'verify the named person with medium or high confidence'
        : null,
      !contact.warmth || contact.warmth === 'unknown' ? 'confirm relationship warmth' : null,
      !contact.owner && !contact.howWeKnow ? 'record who knows them or how GoInvo knows them' : null,
      !contact.callBrief || contact.callBrief.trim().length < 40 ? 'complete the call brief' : null,
      !(contact.relevantEvidence || []).some((item) => item.evidenceId && evidenceUrlById.has(item.evidenceId))
        ? 'choose currently active work evidence'
        : null,
      !hasRealPrice(present.priceBand) ? 'choose an offer with a real price band' : null,
      missingSelectedVoice ? 'choose an active writing voice or inherit the suite default' : null,
      researchVoiceStale ? 're-research the wording in the selected brand voice' : null,
    ].filter((issue): issue is string => Boolean(issue))
    const researchNeedsReview = Boolean(contact.researchedAt && !contact.researchReviewedAt)
    const isEditingBrief = editingBriefId === contact._id
    const voiceLearning = voiceLearningByContact[contact._id]
    const outreachLearningProposal = voiceLearning?.proposal
      ? { ...voiceLearning.proposal, curatedExamples: [] }
      : null
    return (
      <div key={contact._id} style={{ ...styles.card, padding: 14, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 16 }}>
            {context === 'plan' ? `${index + 1}. ` : ''}
            {contact.name || 'Unnamed'}
          </span>
          <span style={styles.muted}>{[contact.organization, contact.role].filter(Boolean).join(' · ')}</span>
          {contact.warmth && (
            <Pill text={labelForValue(WARMTH_SHORT_OPTIONS, contact.warmth)} colors={TEAL} title="Relationship warmth — ranks above the fit score" />
          )}
          <Pill
            text={bucket.label}
            colors={bucket.colors}
            title={
              typeof contact.feasibilityScore === 'number'
                ? `Feasibility ${contact.feasibilityScore}/100 — ${contact.feasibilityReasoning || ''}`
                : 'Research did not produce a usable score'
            }
          />
          {contact.personVerified === false && (
            <Pill text="Person unverified — org research only" colors={AMBER} title={`Identity confidence: ${contact.identityConfidence || 'none'}. Facts below are about the ORGANIZATION; verify the person before citing personal details.`} />
          )}
          {context === 'followUp' && contact.followUpAt && (
            <Pill
              text={`${overdue ? 'Overdue: ' : 'Due '}${outreachDateLabel(contact.followUpAt)}`}
              colors={overdue ? RED : AMBER}
            />
          )}
          <StatusPill status={contact.status} options={STATUS_SHORT_OPTIONS} />
          {contact.owner && <span style={{ ...styles.small, ...styles.muted }}>owner: {contact.owner}</span>}
          <span style={{ ...styles.small, ...styles.muted }}>
            writing as: {intendedBrandVoice?.name || 'neutral fallback'}{contact.brandVoiceKey ? ' (override)' : ' (suite default)'}
          </span>
          {researchVoiceStale && (
            <Pill
              text="Voice changed — re-research"
              colors={AMBER}
              title={`This brief was generated with ${contact.researchBrandVoiceName || 'the prior neutral/default voice'}. Re-research updates only generated research fields; human-curated offer choices remain preserved.`}
            />
          )}
        </div>

        {context === 'followUp' && contact.nextStep && (
          <div style={{ borderLeft: '3px solid #d6a93f', paddingLeft: 10, fontSize: 14, lineHeight: 1.5 }}>
            <strong>Next:</strong> {contact.nextStep}
          </div>
        )}

        {context !== 'review' && (contact.email || contact.phone || linkedInHref) && (
          <div style={{ ...styles.small, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {contact.phone && <a href={`tel:${contact.phone}`} style={styles.inlineLink}>Call {contact.phone}</a>}
            {contact.email && <a href={`mailto:${contact.email}`} style={styles.inlineLink}>{contact.email}</a>}
            {linkedInHref && (
              <a href={linkedInHref} target="_blank" rel="noreferrer" style={styles.inlineLink}>
                LinkedIn
              </a>
            )}
          </div>
        )}

        {present.source !== 'none' && (
          <div style={{ ...styles.small }}>
            <strong>Present:</strong> {present.title}
            {present.priceBand ? ` — ${present.priceBand}` : ''}
            {!hasRealPrice(present.priceBand) && (
              <>
                {' '}
                <Pill text="No price set — this call will be vague" colors={AMBER} title="Put a real dollar band on this offer before the call. A priced offer is the whole strategy." />
              </>
            )}
            {present.oneLiner ? <span style={styles.muted}> · {present.oneLiner}</span> : null}
            {present.source === 'draft' && <span style={{ ...styles.muted }}> (tailored draft)</span>}
          </div>
        )}

        {(contact.relevantEvidence || []).length > 0 && (
          <div style={{ ...styles.small, display: 'grid', gap: 4 }}>
            <strong>Show them:</strong>
            {(contact.relevantEvidence || []).map((ev) => (
              <div key={ev._key || ev.evidenceId} style={{ paddingLeft: 10 }}>
                •{' '}
                {ev.evidenceId && evidenceUrlById.get(ev.evidenceId) ? (
                  <a href={evidenceUrlById.get(ev.evidenceId)} target="_blank" rel="noreferrer" style={styles.inlineLink}>
                    <strong>{ev.title || ev.evidenceId}</strong>
                  </a>
                ) : (
                  <strong>{ev.title || ev.evidenceId}</strong>
                )}
                {ev.why ? <span style={styles.muted}> — {ev.why}</span> : null}
              </div>
            ))}
          </div>
        )}

        {(contact.proposedOffers || []).length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Tailored offer drafts ({(contact.proposedOffers || []).length}) — review, edit, choose
            </summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {(contact.proposedOffers || []).map((po) => {
                const isEditing = editingOffer?.contactId === contact._id && editingOffer.key === po._key
                return (
                  <div
                    key={po._key}
                    style={{
                      border: `1px solid ${po.chosen ? '#007385' : 'var(--card-border-color)'}`,
                      borderRadius: 6,
                      padding: 10,
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <InputField label="Title" unsavedId={OUTREACH_OFFER_UNSAVED_ID} unsavedLabel="tailored offer draft">
                          <input style={styles.input} value={offerDraft.title} onChange={(e) => setOfferDraft((d) => ({ ...d, title: e.target.value }))} />
                        </InputField>
                        <InputField label="One-liner (as said on the call)" unsavedId={OUTREACH_OFFER_UNSAVED_ID} unsavedLabel="tailored offer draft">
                          <textarea style={{ ...styles.input, minHeight: 44 }} value={offerDraft.oneLiner} onChange={(e) => setOfferDraft((d) => ({ ...d, oneLiner: e.target.value }))} />
                        </InputField>
                        <InputField label="Price band" unsavedId={OUTREACH_OFFER_UNSAVED_ID} unsavedLabel="tailored offer draft">
                          <input style={styles.input} value={offerDraft.priceBand} placeholder='e.g. "Fixed fee, $40–80K, 4–6 weeks"' onChange={(e) => setOfferDraft((d) => ({ ...d, priceBand: e.target.value }))} />
                        </InputField>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" style={styles.primaryButton} onClick={() => void saveOfferEdit(contact)}>Save</button>
                          <button
                            type="button"
                            style={styles.button}
                            onClick={() => {
                              setEditingOffer(null)
                              clearUnsavedChanges(OUTREACH_OFFER_UNSAVED_ID)
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                          <strong>{po.title}</strong>
                          {po.priceBand && <span style={{ ...styles.small, ...styles.muted }}>{po.priceBand}</span>}
                          {po.chosen && <Pill text="Chosen" colors={TEAL} />}
                        </div>
                        {po.oneLiner && <div style={{ ...styles.small }}>{po.oneLiner}</div>}
                        {po.rationale && <div style={{ ...styles.small, ...styles.muted }}>{po.rationale}</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {po.chosen ? (
                            <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => void chooseOffer(contact, null)}>
                              Un-choose (use catalog offer)
                            </button>
                          ) : (
                            <button type="button" style={{ ...styles.primaryButton, padding: '5px 9px', fontSize: 12 }} onClick={() => void chooseOffer(contact, po._key || null)}>
                              Use this offer
                            </button>
                          )}
                          <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => startEditOffer(contact, po._key || '')}>
                            Edit
                          </button>
                          <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => void promoteToCatalog(po)}>
                            Save to catalog
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </details>
        )}

        {isEditingBrief ? (
          <div style={{ border: '1px solid var(--card-border-color)', borderRadius: 6, padding: 10, display: 'grid', gap: 10 }}>
            <div>
              <strong>Make this sound like me</strong>
              <div style={{ ...styles.small, ...styles.muted, marginTop: 3, lineHeight: 1.45 }}>
                Adjust the wording, not the verified facts. Saving clears approval so the updated copy gets one final review.
                {contact.researchBrandVoiceKey
                  ? ' If the suggested opener changes, Outreach will separately propose reusable voice principles; call-brief edits do not train the voice, and nothing is learned until you approve it.'
                  : ''}
              </div>
            </div>
            <InputField label="Suggested opener" unsavedId={OUTREACH_BRIEF_UNSAVED_ID} unsavedLabel="outreach opener and call brief draft">
              <textarea
                aria-label={`Suggested opener for ${contact.name || 'contact'}`}
                style={{ ...styles.input, minHeight: 84 }}
                value={briefDraft.suggestedOpener}
                onChange={(event) => setBriefDraft((draft) => ({ ...draft, suggestedOpener: event.target.value }))}
                placeholder="The first message or voicemail, in your own words"
              />
            </InputField>
            <InputField label="Call brief" unsavedId={OUTREACH_BRIEF_UNSAVED_ID} unsavedLabel="outreach opener and call brief draft">
              <textarea
                aria-label={`Call brief for ${contact.name || 'contact'}`}
                style={{ ...styles.input, minHeight: 132 }}
                value={briefDraft.callBrief}
                onChange={(event) => setBriefDraft((draft) => ({ ...draft, callBrief: event.target.value }))}
                placeholder="Context, what to present, the specific ask, and one intelligence question"
              />
            </InputField>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" style={styles.primaryButton} disabled={savingBrief} onClick={() => void saveBriefEdit(contact)}>
                {savingBrief ? 'Saving…' : 'Save my wording'}
              </button>
              <button
                type="button"
                style={styles.button}
                disabled={savingBrief}
                onClick={() => {
                  setEditingBriefId(null)
                  clearUnsavedChanges(OUTREACH_BRIEF_UNSAVED_ID)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : contact.callBrief ? (
          <div style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{contact.callBrief}</div>
        ) : null}

        {voiceLearning?.status === 'proposing' && (
          <div
            aria-live="polite"
            data-brand-voice-learning-status="proposing"
            role="status"
            style={{
              background: 'rgba(0, 115, 133, 0.08)',
              border: '1px solid var(--card-border-color)',
              borderRadius: 7,
              display: 'grid',
              gap: 4,
              padding: 10,
            }}
          >
            <strong style={{ fontSize: 13 }}>Preparing a voice-learning proposal…</strong>
            <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
              Your wording is already saved. Outreach is looking for reusable style principles,
              ignoring factual corrections, and will not update the voice without your review.
            </span>
          </div>
        )}

        {(voiceLearning?.status === 'ready' || voiceLearning?.status === 'applying') &&
          outreachLearningProposal && (
            <BrandVoiceLearningReview
              applying={voiceLearning.status === 'applying'}
              error={voiceLearning.error}
              onApply={(selection) => applyVoiceLearning(contact._id, selection)}
              onDismiss={() => dismissVoiceLearning(contact._id)}
              proposal={outreachLearningProposal}
            />
          )}

        {voiceLearning?.status === 'applied' && voiceLearning.message && (
          <div
            aria-live="polite"
            data-brand-voice-learning-status="applied"
            role="status"
            style={{
              background: 'rgba(45, 150, 80, 0.12)',
              border: '1px solid #8ac5a2',
              borderRadius: 7,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1.5 }}>{voiceLearning.message}</span>
            <button
              type="button"
              onClick={() => dismissVoiceLearning(contact._id)}
              style={{ ...styles.button, minHeight: 44 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {voiceLearning?.status === 'error' && voiceLearning.error && (
          <div
            data-brand-voice-learning-status="error"
            role="alert"
            style={{
              background: 'rgba(161, 58, 50, 0.12)',
              border: '1px solid #d5a0a0',
              borderRadius: 7,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'space-between',
              padding: 10,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1.5 }}>{voiceLearning.error}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {voiceLearning.needsFreshProposal && (
                <button
                  type="button"
                  onClick={() => startFreshVoiceLearningProposal(contact)}
                  style={{ ...styles.button, minHeight: 44 }}
                >
                  Edit opener for fresh proposal
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissVoiceLearning(contact._id)}
                style={{ ...styles.button, minHeight: 44 }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {contact.feasibilityReasoning && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Why this fit?</summary>
            <div style={{ ...styles.small, marginTop: 6, lineHeight: 1.55 }}>{contact.feasibilityReasoning}</div>
          </details>
        )}

        {!isEditingBrief && contact.suggestedOpener && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Suggested opener</summary>
            <div style={{ ...styles.small, marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{contact.suggestedOpener}</div>
            {context !== 'review' && (
              <button
                type="button"
                style={{ ...styles.button, marginTop: 8, padding: '6px 10px', fontSize: 12 }}
                onClick={() => copyContactOpener(contact)}
              >
                Copy opener
              </button>
            )}
          </details>
        )}

        {!isEditingBrief && !isLogging && (
          <button type="button" style={{ ...styles.button, justifySelf: 'start' }} onClick={() => startEditBrief(contact)}>
            Make this sound like me
          </button>
        )}

        {(contact.interactions || []).length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Call history ({(contact.interactions || []).length})
            </summary>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {[...(contact.interactions || [])].reverse().map((it) => (
                <div key={it._key} style={{ ...styles.small, borderLeft: '2px solid var(--card-border-color)', paddingLeft: 8 }}>
                  <strong>{it.at ? new Date(it.at).toLocaleDateString() : '?'}</strong>
                  {it.statusAfter ? ` · ${labelForValue(STATUS_SHORT_OPTIONS, it.statusAfter)}` : ''}
                  {it.outcome ? ` — ${it.outcome}` : ''}
                  {it.intel ? <div style={styles.muted}>Intel: {it.intel}</div> : null}
                  {it.nextStep ? <div style={styles.muted}>Next: {it.nextStep}</div> : null}
                </div>
              ))}
            </div>
          </details>
        )}

        {researchNeedsReview && (
          <div style={{ border: '1px solid rgba(214, 169, 63, 0.45)', borderRadius: 6, padding: 10, display: 'grid', gap: 8 }}>
            <strong style={{ fontSize: 14 }}>Human review required</strong>
            {isEditingBrief ? (
              <div style={{ ...styles.small, lineHeight: 1.55 }}>Save or cancel your wording edits before approval.</div>
            ) : readinessIssues.length > 0 ? (
              <div style={{ ...styles.small, lineHeight: 1.55 }}>Before approval: {readinessIssues.join('; ')}.</div>
            ) : (
              <div style={{ ...styles.small, lineHeight: 1.55 }}>Identity, relationship, evidence, and pricing are ready for a human decision.</div>
            )}
            <button
              type="button"
              style={styles.primaryButton}
              disabled={isEditingBrief || readinessIssues.length > 0}
              onClick={() => void approveContactBrief(contact)}
            >
              {contact.status === 'needsReview' ? 'Approve for call plan' : 'Approve updated brief'}
            </button>
          </div>
        )}

        {(contact.researchSources || []).length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Sources ({(contact.researchSources || []).length})
            </summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {(contact.researchSources || []).map((source) => {
                const sourceHref = normalizeOutreachUrl(source.url)
                return sourceHref ? (
                  <li key={source._key || source.url} style={styles.small}>
                    <a href={sourceHref} target="_blank" rel="noreferrer" style={styles.inlineLink}>
                      {source.title || sourceHref}
                    </a>
                  </li>
                ) : null
              })}
            </ul>
          </details>
        )}

        {context === 'review' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" style={styles.button} disabled={isEditingBrief || researchingId === contact._id} onClick={() => void researchOne(contact)}>
              {researchingId === contact._id ? 'Re-researching…' : 'Re-research'}
            </button>
            <button type="button" style={styles.button} disabled={isEditingBrief} onClick={() => startEditContact(contact)}>
              Edit details
            </button>
          </div>
        ) : isLogging ? (
          <div
            ref={logPanelRef}
            id="outreach-log-panel"
            role="region"
            aria-labelledby="outreach-log-panel-heading"
            tabIndex={-1}
            style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--card-border-color)', paddingTop: 10 }}
          >
            <h4 id="outreach-log-panel-heading" style={{ fontSize: 15, margin: 0 }}>
              Log interaction for {contact.name || 'this contact'}
            </h4>
            <InputField label="What happened?" help="Required: this becomes the durable interaction record." unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
              <textarea required style={{ ...styles.input, minHeight: 60 }} value={logOutcome} onChange={(e) => setLogOutcome(e.target.value)} placeholder="Outcome of the call/message" />
            </InputField>
            <InputField label="Intelligence gathered (optional)" help="e.g. what actually got funded in their org this year" unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
              <textarea style={{ ...styles.input, minHeight: 48 }} value={logIntel} onChange={(e) => setLogIntel(e.target.value)} />
            </InputField>
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InputField label="Channel" unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
                <select style={styles.input} value={logChannel} onChange={(event) => setLogChannel(event.target.value)}>
                  {OUTREACH_CHANNEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.title}</option>)}
                </select>
              </InputField>
              <InputField label="Opportunity value (optional)" help="Numbers only; saved as USD" unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
                <input type="number" min="0" step="1000" style={styles.input} value={logValue} onChange={(event) => setLogValue(event.target.value)} placeholder="50000" />
              </InputField>
            </div>
            <InputField label="Offer actually presented" help="Choose what was used in this interaction; leave blank if no offer was discussed." unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
              <select
                style={styles.input}
                value={logOfferRef}
                onChange={(event) => {
                  const nextRef = event.target.value
                  setLogOfferRef(nextRef)
                  setLogEvidenceIds([])
                }}
              >
                <option value="">No offer recorded</option>
                {offers.filter((offer) => offer.status === 'active' && offer.key).map((offer) => (
                  <option key={offer._id} value={offer.key}>{offer.title || offer.key} — catalog</option>
                ))}
                {(contact.proposedOffers || []).map((offer) => {
                  const ref = `proposal:${offer._key || slugify(offer.title || 'offer')}`
                  return <option key={ref} value={ref}>{offer.title || 'Tailored offer'} — tailored</option>
                })}
              </select>
            </InputField>
            {(contact.relevantEvidence || []).length > 0 && (
              <fieldset style={{ border: '1px solid var(--card-border-color)', borderRadius: 6, padding: 10, display: 'grid', gap: 6 }}>
                <legend style={{ ...styles.small, fontWeight: 700 }}>Evidence actually shown</legend>
                {(contact.relevantEvidence || []).map((item) => item.evidenceId && evidenceUrlById.has(item.evidenceId) ? (
                  <label key={item.evidenceId} style={{ ...styles.small, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={logEvidenceIds.includes(item.evidenceId)}
                      onChange={(event) => {
                        markUnsavedChange(OUTREACH_LOG_UNSAVED_ID, 'call log draft')
                        setLogEvidenceIds((current) =>
                          event.target.checked
                            ? [...new Set([...current, item.evidenceId as string])]
                            : current.filter((id) => id !== item.evidenceId),
                        )
                      }}
                    />
                    {item.title || item.evidenceId}
                  </label>
                ) : null)}
              </fieldset>
            )}
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <InputField label="Next step (optional)" unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
                <input style={styles.input} disabled={['won', 'lost', 'closed'].includes(logStatus)} value={logNextStep} onChange={(e) => setLogNextStep(e.target.value)} />
              </InputField>
              <InputField label="New status" unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
                <select
                  style={styles.input}
                  value={logStatus}
                  onChange={(e) => {
                    setLogStatus(e.target.value)
                    if (['won', 'lost', 'closed'].includes(e.target.value)) setLogFollowUpDays(null)
                  }}
                >
                  {STATUS_SHORT_OPTIONS.filter((o) => LOG_STATUS_VALUES.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Follow up" help="They'll resurface in the progress tracker" unsavedId={OUTREACH_LOG_UNSAVED_ID} unsavedLabel="call log draft">
                <select
                  style={styles.input}
                  disabled={['won', 'lost', 'closed'].includes(logStatus)}
                  value={logFollowUpDays === null ? 'none' : String(logFollowUpDays)}
                  onChange={(e) => setLogFollowUpDays(e.target.value === 'none' ? null : Number(e.target.value))}
                >
                  {FOLLOW_UP_PRESETS.map((p) => (
                    <option key={p.label} value={p.days === null ? 'none' : String(p.days)}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </InputField>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={styles.primaryButton} disabled={savingLog} onClick={() => void saveLog(contact)}>
                {savingLog ? 'Saving…' : 'Save log'}
              </button>
              <button
                type="button"
                style={styles.button}
                disabled={savingLog}
                onClick={() => {
                  setLoggingId(null)
                  clearUnsavedChanges(OUTREACH_LOG_UNSAVED_ID)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" style={styles.primaryButton} disabled={isEditingBrief} onClick={() => openLog(contact)}>
              Log interaction
            </button>
            <button type="button" style={styles.button} disabled={isEditingBrief || researchingId === contact._id} onClick={() => void researchOne(contact)}>
              {researchingId === contact._id ? 'Re-researching…' : 'Re-research'}
            </button>
            <button type="button" style={styles.button} disabled={isEditingBrief} onClick={() => startEditContact(contact)}>
              Edit details
            </button>
          </div>
        )}
      </div>
    )
  }

  const showTrackerDetail = (contact: MarketingContact) => {
    if (
      editingBriefId &&
      editingBriefId !== contact._id &&
      !confirmDiscardUnsavedChange(OUTREACH_BRIEF_UNSAVED_ID)
    ) {
      return false
    }
    if (
      loggingId &&
      loggingId !== contact._id &&
      !confirmDiscardUnsavedChange(OUTREACH_LOG_UNSAVED_ID)
    ) {
      return false
    }
    setTrackerDetailContactId(contact._id)
    focusRevealedPanel(trackerDetailRef, 'start')
    return true
  }

  const openTrackerLog = (contact: MarketingContact, row: OutreachProgressRow) => {
    const channel = row.recommendation.channel as OutreachChannel | null
    if (!openLog(contact, channel || undefined)) return
    setTrackerDetailContactId(contact._id)
  }

  const trackerEditField = (row: OutreachProgressRow): string | undefined => {
    const explicit = row.editFields.find((field) => TRACKER_CONTACT_FIELD_IDS.has(field))
    if (explicit) return explicit
    if (row.recommendation.channel !== null) return undefined
    const missingDirect = row.recommendation.availability.find(
      (item) =>
        !item.available &&
        !item.overrideState &&
        ['phone', 'email', 'linkedin'].includes(item.channel),
    )
    return missingDirect?.channel === 'linkedin' ? 'linkedinUrl' : missingDirect?.channel
  }

  const copyContactOpener = (contact: MarketingContact) => {
    const opener = (contact.suggestedOpener || '').trim()
    if (!opener) return
    void navigator.clipboard.writeText(opener).then(
      () => say('Opener copied.'),
      () => fail(new Error('Clipboard access was unavailable.'), 'Could not copy the opener.'),
    )
  }

  const trackerContactHref = (
    contact: MarketingContact,
    row: OutreachProgressRow,
  ): { href: string; external?: boolean } | null => {
    if (row.recommendation.channel === 'phone' && isUsableOutreachPhone(contact.phone)) {
      return { href: `tel:${contact.phone}` }
    }
    if (row.recommendation.channel === 'email' && isUsableOutreachEmail(contact.email)) {
      const subject = row.action === 'followUp'
        ? `Quick follow-up${contact.organization ? ` — ${contact.organization}` : ''}`
        : `Quick thought${contact.organization ? ` — ${contact.organization}` : ''}`
      const body = [
        contact.suggestedOpener,
        row.nextStep ? `What I had in mind: ${row.nextStep}` : '',
      ].filter(Boolean).join('\n\n')
      return {
        href: `mailto:${contact.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`,
      }
    }
    if (row.recommendation.channel === 'linkedin') {
      const href = normalizeOutreachUrl(contact.linkedinUrl, { linkedinOnly: true })
      return href ? { href, external: true } : null
    }
    return null
  }

  const runTrackerAction = (contact: MarketingContact, row: OutreachProgressRow) => {
    if (row.repairTarget === 'followUpSchedule' || row.action === 'scheduleFollowUp') {
      startEditContact(contact, 'followUpAt')
      return
    }
    if (row.action === 'research') {
      void researchOne(contact)
      return
    }
    if (row.action === 'reviewResearch') {
      showTrackerDetail(contact)
      return
    }
    if (row.action === 'firstTouch' || row.action === 'followUp') {
      openTrackerLog(contact, row)
      return
    }
    if (row.action === 'editContact') {
      const field = trackerEditField(row)
      if (field) startEditContact(contact, field)
      else if (row.editFields.includes('channelOverrides')) startChannelOptions(contact)
      else showTrackerDetail(contact)
    }
  }

  const renderTrackerPrimaryAction = (
    contact: MarketingContact,
    row: OutreachProgressRow,
    compact = false,
  ) => {
    const label = row.repairTarget === 'followUpSchedule'
      ? 'Set revisit date'
      : trackerActionLabel(row.action, row.recommendation.channel || undefined)
    if (!label) return null
    const href =
      row.action === 'firstTouch' || row.action === 'followUp'
        ? trackerContactHref(contact, row)
        : null
    const actionStyle = compact
      ? { ...styles.primaryButton, padding: '5px 9px', fontSize: 12 }
      : styles.primaryButton
    if (href) {
      return (
        <a
          aria-label={`${label} for ${contact.name || 'contact'}`}
          href={href.href}
          rel={href.external ? 'noreferrer' : undefined}
          style={{ ...actionStyle, textDecoration: 'none' }}
          target={href.external ? '_blank' : undefined}
        >
          {label}
        </a>
      )
    }
    return (
      <button
        type="button"
        aria-label={`${label} for ${contact.name || 'contact'}`}
        disabled={row.action === 'research' && (researchingId === contact._id || batch !== null)}
        onClick={() => runTrackerAction(contact, row)}
        style={actionStyle}
      >
        {row.action === 'research' && researchingId === contact._id ? 'Researching…' : label}
      </button>
    )
  }

  const trackerPreparingCount = outreachProgress.rows.filter((row) =>
    ['research', 'reviewResearch', 'editContact'].includes(row.action),
  ).length
  const trackerConversationCount = outreachProgress.rows.filter((row) =>
    ['contacted', 'responded', 'meeting', 'opportunity'].includes(row.status),
  ).length
  const trackerOutcomeCount = outreachProgress.rows.filter((row) =>
    ['won', 'lost', 'closed'].includes(row.status),
  ).length
  const trackerVisibleRows = showCompletedTrackerRows
    ? outreachProgress.rows
    : outreachProgress.rows.filter((row) => row.action !== 'complete')
  const channelOptionsContact = channelOptionsContactId
    ? contacts.find((contact) => contact._id === channelOptionsContactId) || null
    : null
  const trackerDetailRow = trackerDetailContact
    ? outreachProgress.rows.find((row) => row.contactId === trackerDetailContact._id) || null
    : null
  const trackerDetailContext: 'plan' | 'followUp' | 'review' = trackerDetailContact
    ? trackerDetailContact.researchedAt && !trackerDetailContact.researchReviewedAt
      ? 'review'
      : ['contacted', 'responded', 'meeting', 'opportunity', 'dormant'].includes(
            trackerDetailContact.status || '',
          )
        ? 'followUp'
        : 'plan'
    : 'plan'

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <style>{OUTREACH_RESPONSIVE_CSS}</style>
      {confirmDialog}
      {(notice || error) && (
        <div
          role={error ? 'alert' : 'status'}
          aria-live={error ? 'assertive' : 'polite'}
          style={{
            ...styles.panel,
            padding: '10px 14px',
            borderColor: error ? 'rgba(217, 138, 138, 0.5)' : 'rgba(0, 115, 133, 0.4)',
            color: error ? '#d98a8a' : undefined,
          }}
        >
          {error || notice}
        </div>
      )}

      <OutreachPlanPanel
        posture={activePosture}
        evidenceCount={evidenceCount}
        offerReadyCount={readyOffers.length}
        offerTotal={offers.filter((offer) => offer.status === 'active').length}
        contactCount={contacts.length}
      />

      <section style={{ ...styles.panel, padding: '10px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ ...styles.small, lineHeight: 1.5 }}>
            <strong>Writing voice:</strong>{' '}
            {defaultBrandVoice
              ? `${defaultBrandVoice.name} is the suite default. Every contact inherits it unless you choose another voice while editing that contact.`
              : 'no active voice is saved yet, so outreach uses its neutral, quiet-confidence fallback.'}
            <span style={styles.muted}> Voice changes wording only — never research facts, proof, scores, prices, or sources.</span>
          </div>
          {onOpenSettings && (
            <button type="button" style={styles.button} onClick={onOpenSettings}>
              {defaultBrandVoice ? 'Manage brand voices' : 'Set up a brand voice'}
            </button>
          )}
        </div>
      </section>

      {evidenceCount === 0 && (
        <section style={{ ...styles.panel, padding: '10px 14px', borderColor: 'rgba(214, 169, 63, 0.5)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <span style={{ ...styles.small, color: '#d6a93f', lineHeight: 1.5 }}>
              <strong>No work evidence yet</strong> — research can’t point at real case studies. Run Extract on
              the Evidence tab first (one-time, ~15–20 min).
            </span>
            {onOpenEvidence && (
              <button type="button" style={styles.button} onClick={onOpenEvidence}>
                Open the Evidence tab
              </button>
            )}
          </div>
        </section>
      )}

      <section id="outreach-progress-tracker" style={styles.panel}>
        <PanelHeading
          title={`Outreach progress tracker (${outreachProgress.counts.total})`}
          description="Your next best contact, recommended modality, progress, and blockers in one queue. Advice is deterministic and changes immediately when saved contact data or channel options change."
        />
        {contacts.length === 0 ? (
          <EmptyInline title="No contacts yet — add people below and the tracker will build the queue." />
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <div
              role="region"
              aria-label="Recommended next outreach"
              style={{
                ...styles.card,
                borderColor: outreachProgress.nextContact
                  ? 'rgba(0, 115, 133, 0.55)'
                  : 'rgba(214, 169, 63, 0.45)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                justifyContent: 'space-between',
                padding: 14,
              }}
            >
              {outreachProgress.nextContact ? (() => {
                const row = outreachProgress.nextContact
                const contact = contacts.find((candidate) => candidate._id === row.contactId)
                if (!contact) return null
                const directHref = trackerContactHref(contact, row)
                const channelRuleSummary = trackerChannelRuleSummary(row)
                return (
                  <>
                    <div style={{ display: 'grid', gap: 5, minWidth: 0, maxWidth: 680 }}>
                      <span style={{ ...styles.small, color: '#4dc4d6', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0.7 }}>
                        Recommended next
                      </span>
                      <strong style={{ fontSize: 18 }}>
                        {row.name} via {row.recommendation.label}
                      </strong>
                      <span style={{ ...styles.small, lineHeight: 1.5 }}>{row.whyNext}</span>
                      {row.nextStep && (
                        <span style={{ ...styles.small, lineHeight: 1.5 }}>
                          <strong>Do this:</strong> {row.nextStep}
                        </span>
                      )}
                      <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.5 }}>{row.whyChannel}</span>
                      {channelRuleSummary && (
                        <span style={{ ...styles.small, lineHeight: 1.5 }}>
                          <strong>Saved channel rules:</strong> {channelRuleSummary}
                        </span>
                      )}
                    </div>
                    <div style={{ alignSelf: 'center', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                      {renderTrackerPrimaryAction(contact, row)}
                      {contact.suggestedOpener && (
                        <button type="button" aria-label={`Copy opener for ${row.name}`} style={styles.button} onClick={() => copyContactOpener(contact)}>
                          Copy opener
                        </button>
                      )}
                      {contact.researchedAt && (
                        <button type="button" aria-label={`Open brief for ${row.name}`} style={styles.button} onClick={() => showTrackerDetail(contact)}>
                          Open brief
                        </button>
                      )}
                      {directHref && (row.action === 'firstTouch' || row.action === 'followUp') && (
                        <button type="button" aria-label={`Log result for ${row.name}`} style={styles.button} onClick={() => openTrackerLog(contact, row)}>
                          Log result
                        </button>
                      )}
                      <button type="button" aria-label={`Change modality for ${row.name}`} style={styles.button} onClick={() => startChannelOptions(contact)}>
                        Change modality
                      </button>
                    </div>
                  </>
                )
              })() : (
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong>No contact is ready right now.</strong>
                  <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.5 }}>
                    Work the first preparation or blocker row below. The tracker will name the next contact after the required data and review are saved.
                  </span>
                </div>
              )}
            </div>

            <div role="group" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} aria-label="Outreach progress summary">
              <Pill text={`${outreachProgress.counts.contactNow} ready now`} colors={TEAL} />
              <Pill text={`${outreachProgress.counts.due} due / upcoming`} colors={AMBER} />
              <Pill text={`${trackerPreparingCount} need preparation`} colors={AMBER} />
              <Pill text={`${trackerConversationCount} in conversation`} colors={TEAL} />
              <Pill text={`${trackerOutcomeCount} outcomes`} colors={{ bg: 'transparent', fg: 'var(--card-muted-fg-color)', border: 'var(--card-border-color)' }} />
            </div>

            {trackerOutcomeCount > 0 && (
              <div>
                <button
                  type="button"
                  aria-expanded={showCompletedTrackerRows}
                  style={{ ...styles.button, padding: '6px 10px', fontSize: 12 }}
                  onClick={() => setShowCompletedTrackerRows((shown) => !shown)}
                >
                  {showCompletedTrackerRows ? 'Hide completed contacts' : `Show completed contacts (${trackerOutcomeCount})`}
                </button>
              </div>
            )}

            <details style={{ ...styles.guidePanel, boxShadow: 'none', padding: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 850 }}>
                Guide: how ranking and channel overrides work
              </summary>
              <ol style={{ ...styles.small, margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.65 }}>
                <li>Due and overdue follow-ups come first, followed by human-approved first touches. Preparation stays visible; completed contacts are collapsed below the summary and can never become “Recommended next.”</li>
                <li>The modality uses only saved contact details, interaction history, relationship warmth, and your channel options. It never guesses a phone number or address.</li>
                <li><strong>Channel options</strong> changes the advice: Preferred raises one usable channel; Unavailable, Unresponsive, and Do not use remove it. Auto removes your override. <strong>Edit contact info</strong> corrects the actual details.</li>
                <li>Call, email, and LinkedIn links only open your own app. Email includes the reviewed opener when one is available. Nothing is sent automatically; log the result afterward so the queue advances.</li>
              </ol>
            </details>

            <div data-outreach-desktop-table="true" style={{ maxWidth: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 13 }}>
                <caption style={{ ...styles.small, ...styles.muted, textAlign: 'left', paddingBottom: 8 }}>
                  Contacts ordered by recommended next action. The first actionable row is the current recommendation.
                </caption>
                <thead>
                  <tr>
                    {['Priority', 'Contact', 'Progress', 'Next action', 'Modality', 'Why next', 'Timing', 'Actions'].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        style={{
                          borderBottom: '1px solid var(--card-border-color)',
                          color: 'var(--card-muted-fg-color)',
                          fontSize: 11,
                          letterSpacing: 0.6,
                          padding: '7px 12px 7px 0',
                          textAlign: 'left',
                          textTransform: 'uppercase',
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trackerVisibleRows.map((row) => {
                    const contact = contacts.find((candidate) => candidate._id === row.contactId)
                    if (!contact) return null
                    const selectedAvailability = row.recommendation.availability.find(
                      (item) => item.channel === row.recommendation.channel,
                    )
                    const channelRuleSummary = trackerChannelRuleSummary(row)
                    const latestInteraction = [...(contact.interactions || [])]
                      .filter((interaction) => interaction.at)
                      .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())[0]
                    const directHref = trackerContactHref(contact, row)
                    const editField = trackerEditField(row)
                    const showContactInfoEdit = Boolean(editField) || row.action === 'research' || row.action === 'complete'
                    return (
                      <tr
                        key={row.contactId}
                        style={{
                          background: row.isNext ? 'rgba(0, 115, 133, 0.08)' : undefined,
                          borderBottom: '1px solid var(--card-border-color)',
                        }}
                      >
                        <td style={{ padding: '10px 12px 10px 6px', verticalAlign: 'top', width: 116 }}>
                          <div style={{ display: 'grid', gap: 5 }}>
                            <strong>{row.isNext ? 'Recommended next' : row.rank ? `#${row.rank}` : trackerUrgencyLabel(row.urgency)}</strong>
                            <Pill text={trackerUrgencyLabel(row.urgency)} colors={trackerUrgencyColors(row.urgency)} />
                          </div>
                        </td>
                        <th scope="row" style={{ padding: '10px 12px 10px 0', textAlign: 'left', verticalAlign: 'top', width: 170 }}>
                          <strong>{row.name}</strong>
                          <div style={{ ...styles.small, ...styles.muted, fontWeight: 400, lineHeight: 1.45 }}>
                            {[row.organization, contact.role, row.owner ? `owner: ${row.owner}` : ''].filter(Boolean).join(' · ') || 'Contact details incomplete'}
                          </div>
                        </th>
                        <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top', width: 150 }}>
                          <div style={{ display: 'grid', gap: 5 }}>
                            <StatusPill status={row.status} options={STATUS_SHORT_OPTIONS} />
                            <span style={{ ...styles.small, lineHeight: 1.4 }}>{row.progressLabel}</span>
                            <progress aria-label={`${row.name} outreach progress`} max={100} value={row.progressPercent} style={{ width: 120, accentColor: '#007385' }} />
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top', width: 170 }}>
                          <strong>{row.actionLabel}</strong>
                          {row.nextStep && <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45, marginTop: 4 }}>Next: {row.nextStep}</div>}
                        </td>
                        <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top', width: 180 }}>
                          <div style={{ display: 'grid', gap: 5 }}>
                            <strong>{row.recommendation.label}</strong>
                            <Pill
                              text={row.action === 'complete' ? 'Terminal status' : selectedAvailability?.overrideState === 'preferred' ? 'Preferred override' : channelRuleSummary ? row.recommendation.channel ? 'Channel rules applied' : 'Channel rules block outreach' : row.recommendation.channel ? 'Auto recommendation' : 'Needs options / data'}
                              colors={row.action === 'complete' ? { bg: 'transparent', fg: 'var(--card-muted-fg-color)', border: 'var(--card-border-color)' } : selectedAvailability?.overrideState === 'preferred' || (channelRuleSummary && row.recommendation.channel) ? TEAL : row.recommendation.channel ? { bg: 'transparent', fg: 'var(--card-muted-fg-color)', border: 'var(--card-border-color)' } : RED}
                            />
                            <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.4 }}>{row.whyChannel}</span>
                            {channelRuleSummary && (
                              <span style={{ ...styles.small, lineHeight: 1.4 }}><strong>Saved channel rules:</strong> {channelRuleSummary}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top', minWidth: 170, lineHeight: 1.45 }}>{row.whyNext}</td>
                        <td style={{ padding: '10px 12px 10px 0', verticalAlign: 'top', width: 125 }}>
                          {row.dueAt ? <strong>{outreachDateLabel(row.dueAt)}</strong> : <span>—</span>}
                          {latestInteraction?.at && (
                            <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45, marginTop: 4 }}>
                              Last touch {new Date(latestInteraction.at).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 0', verticalAlign: 'top', minWidth: 215 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {renderTrackerPrimaryAction(contact, row, true)}
                            {directHref && (row.action === 'firstTouch' || row.action === 'followUp') && (
                              <button type="button" aria-label={`Log result for ${row.name}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => openTrackerLog(contact, row)}>Log result</button>
                            )}
                            {(row.action !== 'complete' || showContactInfoEdit || contact.researchedAt) && (
                              <details>
                                <summary aria-label={`More actions for ${row.name}`} style={{ ...styles.button, cursor: 'pointer', listStyle: 'none', padding: '5px 9px', fontSize: 12 }}>More</summary>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                  {row.action !== 'complete' && (
                                    <button type="button" aria-label={`Channel options for ${row.name}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => startChannelOptions(contact)}>Channel options</button>
                                  )}
                                  {showContactInfoEdit && (
                                    <button type="button" aria-label={`Edit contact info for ${row.name}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => startEditContact(contact, editField)}>Edit contact info</button>
                                  )}
                                  {contact.researchedAt && (
                                    <button type="button" aria-label={`Open brief for ${row.name}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => showTrackerDetail(contact)}>Open brief</button>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div data-outreach-mobile-list="true" style={{ display: 'none', gap: 10 }}>
              {trackerVisibleRows.map((row) => {
                const contact = contacts.find((candidate) => candidate._id === row.contactId)
                if (!contact) return null
                const directHref = trackerContactHref(contact, row)
                const channelRuleSummary = trackerChannelRuleSummary(row)
                const editField = trackerEditField(row)
                const showContactInfoEdit = Boolean(editField) || row.action === 'research' || row.action === 'complete'
                return (
                  <article
                    key={row.contactId}
                    style={{
                      ...styles.card,
                      borderColor: row.isNext ? 'rgba(0, 115, 133, 0.6)' : undefined,
                      display: 'grid',
                      gap: 10,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                      {row.isNext && <strong style={{ color: '#4dc4d6' }}>Recommended next</strong>}
                      {row.rank && !row.isNext && <strong>#{row.rank}</strong>}
                      <Pill text={trackerUrgencyLabel(row.urgency)} colors={trackerUrgencyColors(row.urgency)} />
                      <StatusPill status={row.status} options={STATUS_SHORT_OPTIONS} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 16 }}>{row.name}</strong>
                      <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
                        {[row.organization, contact.role, row.owner ? `owner: ${row.owner}` : ''].filter(Boolean).join(' · ') || 'Contact details incomplete'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 5 }}>
                      <progress aria-label={`${row.name} outreach progress`} max={100} value={row.progressPercent} style={{ width: '100%', accentColor: '#007385' }} />
                      <span style={styles.small}>{row.progressLabel} · <strong>{row.actionLabel}</strong></span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                      <div><strong>Why next:</strong> {row.whyNext}</div>
                      <div><strong>Modality:</strong> {row.recommendation.label}</div>
                      <div style={styles.muted}>{row.whyChannel}</div>
                      {channelRuleSummary && <div><strong>Saved channel rules:</strong> {channelRuleSummary}</div>}
                      {row.nextStep && <div style={{ marginTop: 4 }}><strong>Next step:</strong> {row.nextStep}</div>}
                      {row.dueAt && <div style={{ marginTop: 4 }}><strong>Due:</strong> {outreachDateLabel(row.dueAt)}</div>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {renderTrackerPrimaryAction(contact, row)}
                      {directHref && (row.action === 'firstTouch' || row.action === 'followUp') && (
                        <button type="button" aria-label={`Log result for ${row.name}`} style={styles.button} onClick={() => openTrackerLog(contact, row)}>Log result</button>
                      )}
                      {(row.action !== 'complete' || showContactInfoEdit || contact.researchedAt) && (
                        <details>
                          <summary aria-label={`More actions for ${row.name}`} style={{ ...styles.button, cursor: 'pointer', listStyle: 'none' }}>More actions</summary>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {row.action !== 'complete' && (
                              <button type="button" aria-label={`Channel options for ${row.name}`} style={styles.button} onClick={() => startChannelOptions(contact)}>Channel options</button>
                            )}
                            {showContactInfoEdit && (
                              <button type="button" aria-label={`Edit contact info for ${row.name}`} style={styles.button} onClick={() => startEditContact(contact, editField)}>Edit contact info</button>
                            )}
                            {contact.researchedAt && (
                              <button type="button" aria-label={`Open brief for ${row.name}`} style={styles.button} onClick={() => showTrackerDetail(contact)}>Open brief</button>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {channelOptionsContact && (
              <div
                ref={channelOptionsEditorRef}
                id="outreach-channel-options-editor"
                role="region"
                aria-labelledby="outreach-channel-options-heading"
                tabIndex={-1}
                style={{ ...styles.card, borderColor: 'rgba(0, 115, 133, 0.5)', display: 'grid', gap: 12, padding: 14 }}
              >
                <div>
                  <h3 id="outreach-channel-options-heading" style={{ fontSize: 15, margin: 0 }}>Channel options for {channelOptionsContact.name || 'this contact'}</h3>
                  <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.5, marginTop: 4 }}>
                    Auto uses saved data and history. An override changes recommendations without deleting the email, phone, or LinkedIn URL. Only one channel can be Preferred; choosing another returns the previous one to Auto. Add a short reason only when it will help the next person understand the exception.
                  </div>
                </div>
                <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {channelOptionDrafts.map((draft) => {
                    const option = OUTREACH_CHANNEL_OPTIONS.find((candidate) => candidate.value === draft.channel)
                    const canonicalValue = draft.channel === 'phone'
                      ? channelOptionsContact.phone
                      : draft.channel === 'email'
                        ? channelOptionsContact.email
                        : draft.channel === 'linkedin'
                          ? channelOptionsContact.linkedinUrl
                          : ''
                    const preferredWithoutData = draft.state === 'preferred' && ['phone', 'email', 'linkedin'].includes(draft.channel) && !canonicalValue
                    return (
                      <div key={draft.channel} style={{ border: '1px solid var(--card-border-color)', borderRadius: 7, display: 'grid', gap: 8, padding: 10 }}>
                        <div>
                          <strong>{option?.title || draft.channel}</strong>
                          <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.4 }}>
                            {['phone', 'email', 'linkedin'].includes(draft.channel)
                              ? canonicalValue || `No ${option?.title.toLowerCase() || 'contact data'} saved`
                              : 'Manual modality — available when preferred or previously used'}
                          </div>
                        </div>
                        <label>
                          <span style={styles.label}>Recommendation rule</span>
                          <select
                            aria-label={`${option?.title || draft.channel} recommendation rule for ${channelOptionsContact.name || 'contact'}`}
                            style={styles.input}
                            value={draft.state}
                            onChange={(event) => updateChannelOptionState(draft.channel, event.currentTarget.value as '' | OutreachChannelOverrideState)}
                          >
                            <option value="">Auto</option>
                            {OUTREACH_CHANNEL_OVERRIDE_STATE_OPTIONS.map((stateOption) => (
                              <option key={stateOption.value} value={stateOption.value}>{stateOption.title}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span style={styles.label}>Reason (optional)</span>
                          <input
                            aria-label={`${option?.title || draft.channel} override reason for ${channelOptionsContact.name || 'contact'}`}
                            disabled={!draft.state}
                            maxLength={240}
                            placeholder={draft.state ? 'e.g. Their team ignores this inbox' : 'Select an override first'}
                            style={styles.input}
                            value={draft.note}
                            onChange={(event) => {
                              const note = event.currentTarget.value
                              markUnsavedChange(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID, 'channel options draft')
                              setChannelOptionDrafts((current) => current.map((candidate) => candidate.channel === draft.channel ? { ...candidate, note } : candidate))
                            }}
                          />
                        </label>
                        {preferredWithoutData && (
                          <div role="status" style={{ ...styles.small, color: '#d6a93f', lineHeight: 1.4 }}>
                            Add the missing {option?.title.toLowerCase()} with Edit contact info before Preferred can take effect.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" style={styles.primaryButton} disabled={savingChannelOptions} onClick={() => void saveChannelOptions()}>
                    {savingChannelOptions ? 'Saving…' : 'Save channel options'}
                  </button>
                  <button
                    type="button"
                    style={styles.button}
                    disabled={savingChannelOptions}
                    onClick={() => {
                      if (!confirmDiscardUnsavedChange(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)) return
                      setChannelOptionsContactId(null)
                      setChannelOptionDrafts([])
                      clearUnsavedChanges(OUTREACH_CHANNEL_OPTIONS_UNSAVED_ID)
                    }}
                  >
                    Cancel
                  </button>
                  <button type="button" style={styles.button} disabled={savingChannelOptions} onClick={() => startEditContact(channelOptionsContact)}>
                    Edit contact data
                  </button>
                </div>
              </div>
            )}

            {trackerDetailContact && (
              <div
                ref={trackerDetailRef}
                id="outreach-tracker-detail"
                role="region"
                aria-labelledby="outreach-tracker-detail-heading"
                tabIndex={-1}
                style={{ ...styles.card, borderColor: 'rgba(0, 115, 133, 0.5)', display: 'grid', gap: 10, padding: 14 }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'start', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <h3 id="outreach-tracker-detail-heading" style={{ fontSize: 15, margin: 0 }}>Brief and activity for {trackerDetailContact.name || 'contact'}</h3>
                    {trackerDetailRow && <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45, marginTop: 3 }}>{trackerDetailRow.whyNext}</div>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Close brief for ${trackerDetailContact.name || 'contact'}`}
                    style={styles.button}
                    onClick={() => {
                      if (editingBriefId === trackerDetailContact._id && !confirmDiscardUnsavedChange(OUTREACH_BRIEF_UNSAVED_ID)) return
                      if (loggingId === trackerDetailContact._id && !confirmDiscardUnsavedChange(OUTREACH_LOG_UNSAVED_ID)) return
                      if (editingBriefId === trackerDetailContact._id) {
                        setEditingBriefId(null)
                        clearUnsavedChanges(OUTREACH_BRIEF_UNSAVED_ID)
                      }
                      if (loggingId === trackerDetailContact._id) {
                        setLoggingId(null)
                        clearUnsavedChanges(OUTREACH_LOG_UNSAVED_ID)
                      }
                      setTrackerDetailContactId(null)
                    }}
                  >
                    Close brief
                  </button>
                </div>
                {renderPlanCard(trackerDetailContact, Math.max(0, (trackerDetailRow?.rank || 1) - 1), trackerDetailContext)}
              </div>
            )}
          </div>
        )}
      </section>

      {adHocLogContact && (
        <section id="outreach-ad-hoc-log" style={{ ...styles.panel, borderColor: 'rgba(0, 115, 133, 0.5)' }}>
          <PanelHeading
            title="Log an interaction"
            description="Record an inbound response or unscheduled touch without waiting for the follow-up window."
          />
          {renderPlanCard(adHocLogContact, 0, 'followUp')}
        </section>
      )}

      <section id="outreach-add-contacts" data-tour-id="autopilot-outreach-intake" style={styles.panel}>
        <PanelHeading
          title="Add contacts"
          description="Paste names — one per line, as messy as you like: “Name — company — how we know them”. AI parses them into contact records; duplicates are skipped automatically."
        />
        <p style={{ ...styles.small, ...styles.muted, margin: '0 0 10px', lineHeight: 1.55 }}>
          Private workflow: <strong>Check names sends this raw paste to Claude</strong> for structuring. Later,
          Research sends the selected person&apos;s public identity and relationship context for web research. Do
          not paste sensitive personal, medical, financial, or confidential client information.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <textarea
            aria-label="Contacts to add"
            style={{ ...styles.input, minHeight: 120, fontFamily: 'inherit' }}
            value={intakeText}
            onChange={(event) => {
              setIntakeText(event.target.value)
              markUnsavedChange(OUTREACH_INTAKE_UNSAVED_ID, 'contact intake draft')
              // Edited text invalidates the old preview — never commit a parse
              // the user hasn't seen.
              setIntakePreview(null)
            }}
            placeholder={
              'Sarah Chen — VP Product at Medtronic — met at HIMSS 2023, Juhan knows her well\nTom Rivera, ex-client from the All of Us project, now at Verily\n…'
            }
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              style={styles.primaryButton}
              disabled={!intakeText.trim() || intakeBusy !== null}
              onClick={() => void previewIntake()}
            >
              {intakeBusy === 'preview' ? 'Checking names…' : 'Check names'}
            </button>
            {intakePreview && intakePreview.some((c) => !c.duplicate) && (
              <button type="button" style={styles.primaryButton} disabled={intakeBusy !== null} onClick={() => void createFromIntake()}>
                {intakeBusy === 'create'
                  ? 'Adding…'
                  : `Add ${intakePreview.filter((c) => !c.duplicate).length} contact${intakePreview.filter((c) => !c.duplicate).length === 1 ? '' : 's'}`}
              </button>
            )}
            <button
              type="button"
              style={styles.button}
              disabled={warmStartBusy !== null}
              onClick={() => (warmStart ? setWarmStart(null) : void loadWarmStart())}
            >
              {warmStartBusy === 'load' ? 'Scanning our site…' : warmStart ? 'Hide suggestions' : 'Suggest from our past work'}
            </button>
            {(intakeText || intakePreview) && (
              <button
                type="button"
                style={styles.button}
                disabled={intakeBusy !== null}
                onClick={() => {
                  setIntakeText('')
                  setIntakePreview(null)
                  clearUnsavedChanges(OUTREACH_INTAKE_UNSAVED_ID)
                }}
              >
                Clear draft
              </button>
            )}
          </div>
          {warmStart && (
            <div style={{ ...styles.panel, boxShadow: 'none', borderStyle: 'dashed', padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ ...styles.small, lineHeight: 1.5 }}>
                <strong>From our published work:</strong> people we thanked and past-client organizations, with
                “how we know them” pre-filled. Org entries research the organization — add the person’s name
                once you know who to call there. Nothing is selected automatically, and this does not discover
                external prospects or send a message.
              </div>
              {warmStart.length === 0 ? (
                <EmptyInline title="Nothing new — everyone from our published work is already in the list." />
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      style={{ ...styles.button, padding: '6px 10px', fontSize: 12 }}
                      onClick={() =>
                        setWarmStartSelected(
                          new Set(
                            warmStart
                              .filter((suggestion) => suggestion.kind === 'thanked-person')
                              .map((suggestion) => contactDedupeKey(suggestion.name, suggestion.organization)),
                          ),
                        )
                      }
                    >
                      Select named people
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.button, padding: '6px 10px', fontSize: 12 }}
                      disabled={warmStartSelected.size === 0}
                      onClick={() => setWarmStartSelected(new Set())}
                    >
                      Clear selection
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                  {warmStart.map((s) => {
                    const key = contactDedupeKey(s.name, s.organization)
                    const checked = warmStartSelected.has(key)
                    return (
                      <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 14, lineHeight: 1.45 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(warmStartSelected)
                            if (checked) next.delete(key)
                            else next.add(key)
                            setWarmStartSelected(next)
                          }}
                        />
                        <span style={{ display: 'grid', gap: 2 }}>
                          <strong>{s.name}</strong>
                          <span style={{ ...styles.muted, fontSize: 13 }}>
                            {s.kind === 'client-org' ? 'Account lead — needs a named buyer' : 'Named person — verify relationship'} · {s.howWeKnow}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                  </div>
                </div>
              )}
              {warmStart.length > 0 && (
                <div>
                  <button
                    type="button"
                    style={styles.primaryButton}
                    disabled={warmStartBusy !== null || warmStartSelected.size === 0}
                    onClick={() => void addWarmStart()}
                  >
                    {warmStartBusy === 'add' ? 'Adding…' : `Add ${warmStartSelected.size} selected`}
                  </button>
                </div>
              )}
            </div>
          )}
          {intakePreview && (
            <div style={{ display: 'grid', gap: 6 }}>
              {intakePreview.map((contact) => (
                <div
                  key={`${contact.name}-${contact.organization || ''}`}
                  style={{ ...styles.small, display: 'flex', flexWrap: 'wrap', gap: 8, opacity: contact.duplicate ? 0.55 : 1 }}
                >
                  <strong>{contact.name}</strong>
                  <span style={styles.muted}>{[contact.organization, contact.role, contact.howWeKnow].filter(Boolean).join(' · ')}</span>
                  {contact.segment && <span style={styles.muted}>[{labelForValue(OUTREACH_SEGMENT_OPTIONS, contact.segment)}]</span>}
                  {contact.duplicate && (
                    <span style={{ color: '#d6a93f', fontWeight: 700 }}>
                      {contact.duplicateReason || 'duplicate identity'} — will skip
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${contact.name} from this intake preview`}
                    style={{ ...styles.button, padding: '4px 8px', fontSize: 12 }}
                    onClick={() => setIntakePreview((current) => current?.filter((item) => item !== contact) || null)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <PanelHeading
          title={`Contact records (${contacts.length})`}
          description="Search, research, correct, archive, or delete the underlying records. Use the progress tracker above for daily outreach order and modality advice."
        />
        {contacts.length > 0 && (
          <div data-outreach-filter-grid="true" style={{ display: 'grid', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <input
              type="search"
              aria-label="Search contacts"
              style={styles.input}
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder="Search name, organization, owner, or email"
            />
            <select
              aria-label="Filter contacts by segment"
              style={styles.input}
              value={segmentFilter}
              onChange={(event) => setSegmentFilter(event.target.value)}
            >
              <option value="all">All segments</option>
              {OUTREACH_SEGMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.title}</option>)}
            </select>
            <select
              aria-label="Filter contacts by warmth"
              style={styles.input}
              value={warmthFilter}
              onChange={(event) => setWarmthFilter(event.target.value)}
            >
              <option value="all">All warmth levels</option>
              {WARMTH_SHORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.title}</option>)}
            </select>
            <button
              type="button"
              style={styles.primaryButton}
              disabled={unresearched.length === 0 || batch !== null || researchingId !== null}
              onClick={() => void researchAllNew()}
            >
              <SearchIcon style={{ width: 15, height: 15 }} />
              {batch ? `Researching ${batch.done + 1}/${batch.total}: ${batch.current}…` : `Research all new (${unresearched.length})`}
            </button>
            <span style={{ ...styles.small, ...styles.muted }}>
              ~1–2 min per contact. Progress saves after each person — safe to close and come back.
            </span>
            <select
              aria-label="Filter contacts by status"
              style={{ ...styles.input, width: 'auto' }}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {STATUS_SHORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.title}
                </option>
              ))}
            </select>
            <span style={{ ...styles.small, ...styles.muted, gridColumn: '1 / -1' }}>
              Showing {visibleContacts.length} of {contacts.length} contacts.
            </span>
          </div>
        )}

        {visibleContacts.length === 0 ? (
          <EmptyInline title={contacts.length === 0 ? 'No contacts yet — paste some names above.' : 'No contacts match this filter.'} />
        ) : (
          <>
          <div data-outreach-desktop-table="true" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Name', 'Organization', 'Segment', 'Warmth', 'Owner', 'Status', 'Fit', 'Next', 'Actions'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px 6px 0',
                        borderBottom: '1px solid var(--card-border-color)',
                        color: 'var(--card-muted-fg-color)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleContacts.map((contact) => {
                  const bucket = fitBucket(contact.feasibilityScore)
                  return (
                    <tr key={contact._id}>
                      <td style={{ padding: '8px 10px 8px 0', fontWeight: 700 }}>
                        {contact.name || 'Unnamed'}
                        {contact.role && <div style={{ ...styles.small, ...styles.muted, fontWeight: 400 }}>{contact.role}</div>}
                      </td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{contact.organization || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{labelForValue(OUTREACH_SEGMENT_OPTIONS, contact.segment) || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{labelForValue(WARMTH_SHORT_OPTIONS, contact.warmth) || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{contact.owner || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0' }}>
                        <StatusPill status={contact.status} options={STATUS_SHORT_OPTIONS} />
                      </td>
                      <td style={{ padding: '8px 10px 8px 0' }}>
                        <Pill text={bucket.label} colors={bucket.colors} title={typeof contact.feasibilityScore === 'number' ? `Feasibility ${contact.feasibilityScore}/100` : undefined} />
                      </td>
                      <td style={{ padding: '8px 10px 8px 0', whiteSpace: 'nowrap' }}>
                        {outreachDateLabel(contact.followUpAt)}
                      </td>
                      <td style={{ padding: '8px 0', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            aria-label={`Log interaction for ${contact.name || 'contact'}`}
                            style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }}
                            disabled={Boolean(contact.researchedAt && !contact.researchReviewedAt)}
                            onClick={() => {
                              openLog(contact)
                              window.setTimeout(() => document.getElementById('outreach-ad-hoc-log')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
                            }}
                          >
                            Log
                          </button>
                          <button
                            type="button"
                            aria-label={`${contact.researchedAt ? 'Re-research' : 'Research'} ${contact.name || 'contact'}`}
                            style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }}
                            disabled={researchingId === contact._id || batch !== null}
                            onClick={() => void researchOne(contact)}
                          >
                            {researchingId === contact._id ? 'Researching…' : contact.researchedAt ? 'Re-research' : 'Research'}
                          </button>
                          <button type="button" aria-label={`Edit ${contact.name || 'contact'}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => startEditContact(contact)}>
                            Edit
                          </button>
                          <button type="button" aria-label={`${canHardDeleteContact(contact) ? 'Delete' : 'Archive'} ${contact.name || 'contact'}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => void deleteContact(contact)}>
                            {canHardDeleteContact(contact) ? 'Delete' : 'Archive'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div data-outreach-mobile-list="true" style={{ display: 'none', gap: 10 }}>
            {visibleContacts.map((contact) => {
              const bucket = fitBucket(contact.feasibilityScore)
              return (
                <article key={contact._id} style={{ ...styles.card, padding: 12, display: 'grid', gap: 9 }}>
                  <div style={{ display: 'grid', gap: 3 }}>
                    <strong style={{ fontSize: 15 }}>{contact.name || 'Unnamed'}</strong>
                    <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--card-muted-fg-color)' }}>
                      {[contact.organization, contact.role].filter(Boolean).join(' · ') || 'No organization or role yet'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <StatusPill status={contact.status} options={STATUS_SHORT_OPTIONS} />
                    <Pill text={bucket.label} colors={bucket.colors} />
                    <Pill text={labelForValue(WARMTH_SHORT_OPTIONS, contact.warmth) || 'Unknown warmth'} colors={TEAL} />
                  </div>
                  {(contact.nextStep || contact.followUpAt) && (
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {contact.nextStep && <div><strong>Next:</strong> {contact.nextStep}</div>}
                      {contact.followUpAt && <div style={styles.muted}>Due {outreachDateLabel(contact.followUpAt)}</div>}
                    </div>
                  )}
                  {(contact.owner || contact.email) && (
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--card-muted-fg-color)' }}>
                      {contact.owner && <div><strong>Owner:</strong> {contact.owner}</div>}
                      {contact.email && <div><strong>Email:</strong> {contact.email}</div>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      aria-label={`Log interaction for ${contact.name || 'contact'}`}
                      style={styles.button}
                      disabled={Boolean(contact.researchedAt && !contact.researchReviewedAt)}
                      onClick={() => {
                        openLog(contact)
                        window.setTimeout(() => document.getElementById('outreach-ad-hoc-log')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
                      }}
                    >
                      Log interaction
                    </button>
                    <button type="button" style={styles.button} disabled={researchingId === contact._id || batch !== null} onClick={() => void researchOne(contact)}>
                      {researchingId === contact._id ? 'Researching…' : contact.researchedAt ? 'Re-research' : 'Research'}
                    </button>
                    <button type="button" aria-label={`Edit ${contact.name || 'contact'}`} style={styles.button} onClick={() => startEditContact(contact)}>Edit</button>
                    <button type="button" aria-label={`${canHardDeleteContact(contact) ? 'Delete' : 'Archive'} ${contact.name || 'contact'}`} style={styles.button} onClick={() => void deleteContact(contact)}>{canHardDeleteContact(contact) ? 'Delete' : 'Archive'}</button>
                  </div>
                </article>
              )
            })}
          </div>
          </>
        )}

        {editingContactId && (
          <div id="outreach-contact-editor" style={{ ...styles.card, padding: 14, marginTop: 12, display: 'grid', gap: 10 }}>
            <strong>Edit contact</strong>
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <InputField label="Name" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="name" style={styles.input} value={contactDraft.name || ''} onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))} />
              </InputField>
              <InputField label="Organization" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="organization" style={styles.input} value={contactDraft.organization || ''} onChange={(e) => setContactDraft((d) => ({ ...d, organization: e.target.value }))} />
              </InputField>
              <InputField label="Role" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="role" style={styles.input} value={contactDraft.role || ''} onChange={(e) => setContactDraft((d) => ({ ...d, role: e.target.value }))} />
              </InputField>
              <InputField label="Segment" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <select data-outreach-contact-field="segment" style={styles.input} value={contactDraft.segment || ''} onChange={(e) => setContactDraft((d) => ({ ...d, segment: e.target.value }))}>
                  <option value="">—</option>
                  {OUTREACH_SEGMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Warmth" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <select data-outreach-contact-field="warmth" style={styles.input} value={contactDraft.warmth || ''} onChange={(e) => setContactDraft((d) => ({ ...d, warmth: e.target.value }))}>
                  <option value="">Unknown</option>
                  {WARMTH_SHORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Relationship owner" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="owner" style={styles.input} value={contactDraft.owner || ''} onChange={(e) => setContactDraft((d) => ({ ...d, owner: e.target.value }))} />
              </InputField>
              <InputField
                label="Writing voice"
                help="Controls only generated offer wording, opener, and call ask. Facts, evidence, scores, prices, and citations stay neutral."
                unsavedId={OUTREACH_CONTACT_UNSAVED_ID}
                unsavedLabel="contact edit draft"
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                  <select
                    aria-label="Writing voice for this contact"
                    style={{ ...styles.input, minWidth: 0 }}
                    value={contactDraft.brandVoiceKey || ''}
                    onChange={(event) => setContactDraft((draft) => ({ ...draft, brandVoiceKey: event.currentTarget.value }))}
                  >
                    <option value="">
                      Suite default{defaultBrandVoice ? ` — ${defaultBrandVoice.name}` : ' — neutral fallback'}
                    </option>
                    {contactDraft.brandVoiceKey && !activeBrandVoices.some((voice) => voice._key === contactDraft.brandVoiceKey) && (
                      <option value={contactDraft.brandVoiceKey}>Unavailable saved voice — choose another</option>
                    )}
                    {activeBrandVoices.map((voice) => (
                      <option key={voice._key} value={voice._key}>
                        {voice.name}{voice.purpose ? ` — ${voice.purpose}` : ''}
                      </option>
                    ))}
                  </select>
                  {onOpenSettings && (
                    <button type="button" style={{ ...styles.button, whiteSpace: 'nowrap' }} onClick={onOpenSettings}>
                      Manage voices
                    </button>
                  )}
                </div>
              </InputField>
              <InputField label="Email" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="email" type="email" style={styles.input} value={contactDraft.email || ''} onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))} />
              </InputField>
              <InputField label="Phone" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="phone" type="tel" style={styles.input} value={contactDraft.phone || ''} onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))} />
              </InputField>
              <InputField label="LinkedIn URL" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
                <input data-outreach-contact-field="linkedinUrl" type="url" style={styles.input} value={contactDraft.linkedinUrl || ''} onChange={(e) => setContactDraft((d) => ({ ...d, linkedinUrl: e.target.value }))} />
              </InputField>
              <InputField
                label="Status"
                help={REVIEW_MANAGED_STATUSES.has(contactDraft.status || '') ? 'This status is managed by research review or call logging.' : undefined}
                unsavedId={OUTREACH_CONTACT_UNSAVED_ID}
                unsavedLabel="contact edit draft"
              >
                <select
                  data-outreach-contact-field="status"
                  style={styles.input}
                  value={contactDraft.status || 'new'}
                  disabled={REVIEW_MANAGED_STATUSES.has(contactDraft.status || '')}
                  onChange={(e) => setContactDraft((d) => ({ ...d, status: e.target.value }))}
                >
                  {REVIEW_MANAGED_STATUSES.has(contactDraft.status || '') && (
                    <option value={contactDraft.status}>{labelForValue(STATUS_SHORT_OPTIONS, contactDraft.status)} — managed</option>
                  )}
                  {CONTACT_EDITOR_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField
                label="Follow-up date"
                help="Schedules when this contact should resurface in the progress tracker."
                unsavedId={OUTREACH_CONTACT_UNSAVED_ID}
                unsavedLabel="contact edit draft"
              >
                <input
                  data-outreach-contact-field="followUpAt"
                  type="date"
                  style={styles.input}
                  disabled={['won', 'lost', 'closed'].includes(contactDraft.status || '')}
                  value={contactDraft.followUpAt || ''}
                  onChange={(event) => setContactDraft((draft) => ({ ...draft, followUpAt: event.currentTarget.value }))}
                />
              </InputField>
              <InputField
                label="Next step"
                help="The concrete action shown in the tracker."
                unsavedId={OUTREACH_CONTACT_UNSAVED_ID}
                unsavedLabel="contact edit draft"
              >
                <input
                  data-outreach-contact-field="nextStep"
                  style={styles.input}
                  disabled={['won', 'lost', 'closed'].includes(contactDraft.status || '')}
                  value={contactDraft.nextStep || ''}
                  onChange={(event) => setContactDraft((draft) => ({ ...draft, nextStep: event.currentTarget.value }))}
                />
              </InputField>
            </div>
            <InputField label="How we know them" unsavedId={OUTREACH_CONTACT_UNSAVED_ID} unsavedLabel="contact edit draft">
              <textarea data-outreach-contact-field="howWeKnow" style={{ ...styles.input, minHeight: 48 }} value={contactDraft.howWeKnow || ''} onChange={(e) => setContactDraft((d) => ({ ...d, howWeKnow: e.target.value }))} />
            </InputField>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={styles.primaryButton} disabled={savingContact} onClick={() => void saveContactEdit()}>
                {savingContact ? 'Saving…' : 'Save contact'}
              </button>
              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  setEditingContactId(null)
                  clearUnsavedChanges(OUTREACH_CONTACT_UNSAVED_ID)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section id="outreach-offers" style={styles.panel}>
        <PanelHeading
          title={`Offers (${offers.filter((o) => o.status === 'active').length} active)`}
          description="The standing offer catalog research matches against — tailored per-contact drafts appear on each call card. Price bands are editable right here; a call without a real dollar band is a 'got any work?' call."
        />
        {offers.length === 0 ? (
          <div style={{ display: 'grid', gap: 10, justifyItems: 'start' }}>
            <EmptyInline title="No offers yet. Add the 5 standard offers (Pre-Mortem, 510(k) human factors, adoption rescue, capacity, cost redesign) and edit from there." />
            <button type="button" style={styles.primaryButton} disabled={seedingOffers} onClick={() => void seedOffers()}>
              {seedingOffers ? 'Adding…' : 'Add our 5 standard offers'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {offers.map((offer) => (
              <div key={offer._id} style={{ display: 'grid', gap: 6, borderBottom: '1px solid var(--card-border-color)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
                  <strong>{offer.title || offer.key}</strong>
                  {offer.status === 'paused' && <span style={{ ...styles.small, color: '#d6a93f' }}>paused</span>}
                  {!hasRealPrice(offer.priceBand) && <Pill text="No price set" colors={AMBER} title='Add a real dollar band, e.g. "Fixed fee, $40–80K, 4–6 weeks"' />}
                </div>
                <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                  <input
                    aria-label={`One-liner for ${offer.title || offer.key} (${offer.key || offer._id})`}
                    style={styles.input}
                    defaultValue={offer.oneLiner || ''}
                    placeholder="One-liner, as said on a call"
                    onChange={() => markUnsavedChange(`${OUTREACH_CATALOG_UNSAVED_ID}:${offer._id}:oneLiner`, `${offer.title || 'offer'} one-liner`)}
                    onBlur={(e) => {
                      if (e.target.value !== (offer.oneLiner || '')) void saveOfferField(offer, 'oneLiner', e.target.value)
                    }}
                  />
                  <input
                    aria-label={`Price band for ${offer.title || offer.key} (${offer.key || offer._id})`}
                    style={styles.input}
                    defaultValue={offer.priceBand || ''}
                    placeholder='Price band, e.g. "Fixed fee, $40–80K"'
                    onChange={() => markUnsavedChange(`${OUTREACH_CATALOG_UNSAVED_ID}:${offer._id}:priceBand`, `${offer.title || 'offer'} price band`)}
                    onBlur={(e) => {
                      if (e.target.value !== (offer.priceBand || '')) void saveOfferField(offer, 'priceBand', e.target.value)
                    }}
                  />
                  {(catalogSaveState[`${offer._id}:oneLiner`] || catalogSaveState[`${offer._id}:priceBand`]) && (
                    <span role="status" aria-live="polite" style={{ ...styles.small, ...styles.muted, gridColumn: '1 / -1' }}>
                      {Object.values({
                        oneLiner: catalogSaveState[`${offer._id}:oneLiner`],
                        priceBand: catalogSaveState[`${offer._id}:priceBand`],
                      }).includes('saving')
                        ? 'Saving offer changes…'
                        : Object.values({
                              oneLiner: catalogSaveState[`${offer._id}:oneLiner`],
                              priceBand: catalogSaveState[`${offer._id}:priceBand`],
                            }).includes('error')
                          ? 'Offer save failed — your draft is still here.'
                          : 'Offer changes saved.'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---- Evidence workspace (second tab of the Outreach surface) ----------------

interface OutreachEvidenceWorkspaceProps {
  client: StudioClient
}

export function OutreachEvidenceWorkspace({ client }: OutreachEvidenceWorkspaceProps) {
  const outreachClient = useMemo(() => client.withConfig({ dataset: OUTREACH_DATASET }), [client])
  const currentUser = useCurrentUser()
  const canManageOutreach = canManagePrivateOutreach(currentUser)
  const { confirm, confirmDialog } = useConfirmDialog()
  const { clearUnsavedChanges, confirmDiscardUnsavedChange } = useMarketingUnsavedGuard()

  const [evidence, setEvidence] = useState<WorkEvidence[]>([])
  const [caseStudyCount, setCaseStudyCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState<{ done: number; total: number } | null>(null)
  const [reExtractingId, setReExtractingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [evidenceSearch, setEvidenceSearch] = useState('')
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState('all')
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null)
  const [savingEvidence, setSavingEvidence] = useState(false)
  const [evidenceDraft, setEvidenceDraft] = useState({
    title: '',
    summary: '',
    url: '',
    segments: '',
    techniques: '',
    businessOutcomes: '',
  })

  const load = useCallback(async () => {
    if (!canManageOutreach) {
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [docs, count] = await Promise.all([
        outreachClient.fetch<WorkEvidence[]>(
          `*[_type == "marketingWorkEvidence"]|order(title asc){
            _id, _rev, sourceId, sourceType, title, slug, client, url, status, manuallyEdited,
            summary, segments, techniques, skills, frameworks, technicalImplementation,
            domainExpertise, businessOutcomes, highlights[]{_key, metric, detail},
            editedAt, editedBy, extractedAt, extractionModel
          }`,
        ),
        client.fetch<number>(`count(*[_type == "caseStudy" && !(_id in path("drafts.**"))])`),
      ])
      setEvidence(docs)
      setCaseStudyCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load evidence.')
    } finally {
      setLoading(false)
    }
  }, [canManageOutreach, client, outreachClient])

  useEffect(() => {
    if (canManageOutreach) void load()
  }, [canManageOutreach, load])

  const visibleEvidence = useMemo(() => {
    const query = evidenceSearch.trim().toLowerCase()
    return evidence.filter((doc) => {
      if (evidenceStatusFilter !== 'all' && (doc.status || 'active') !== evidenceStatusFilter) return false
      if (!query) return true
      return [
        doc.title,
        doc.client,
        doc.summary,
        ...(doc.segments || []),
        ...(doc.techniques || []),
        ...(doc.businessOutcomes || []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [evidence, evidenceSearch, evidenceStatusFilter])
  const activeEvidenceCount = useMemo(
    () => evidence.filter((doc) => doc._id && doc.status !== 'excluded').length,
    [evidence],
  )
  const canonicalActiveEvidence = useMemo(
    () => compactEvidenceIndex(evidence, { max: Math.max(evidence.length, 1) }),
    [evidence],
  )
  const canonicalActiveEvidenceIds = useMemo(
    () => new Set(canonicalActiveEvidence.map((item) => item.id)),
    [canonicalActiveEvidence],
  )
  const duplicateActiveEvidenceCount = Math.max(0, activeEvidenceCount - canonicalActiveEvidence.length)

  const startEditEvidence = (doc: WorkEvidence) => {
    if (!doc._id) return
    if (extracting || reExtractingId) return
    if (editingEvidenceId === doc._id) {
      setExpandedId(doc._id)
      return
    }
    if (editingEvidenceId && !confirmDiscardUnsavedChange(OUTREACH_EVIDENCE_UNSAVED_ID)) return
    clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID)
    setExpandedId(doc._id)
    setEditingEvidenceId(doc._id)
    setEvidenceDraft({
      title: doc.title || '',
      summary: doc.summary || '',
      url: doc.url || '',
      segments: (doc.segments || []).join('\n'),
      techniques: (doc.techniques || []).join('\n'),
      businessOutcomes: (doc.businessOutcomes || []).join('\n'),
    })
  }

  const saveEvidenceEdit = async () => {
    if (!editingEvidenceId) return
    const original = evidence.find((doc) => doc._id === editingEvidenceId)
    if (!original) {
      setError('This evidence record is no longer available. Reload and try again.')
      return
    }
    const list = (value: string) => value.split(/\n/).map((item) => item.trim()).filter(Boolean)
    const normalizedUrl = normalizeOutreachUrl(evidenceDraft.url)
    if (evidenceDraft.url.trim() && !normalizedUrl) {
      setError('Public case-study URL must be a valid http(s) address.')
      return
    }
    setSavingEvidence(true)
    try {
      let patch = outreachClient
        .patch(editingEvidenceId)
        .set({
          title: evidenceDraft.title.trim() || 'Untitled evidence',
          summary: evidenceDraft.summary.trim(),
          ...(normalizedUrl ? { url: normalizedUrl } : {}),
          segments: list(evidenceDraft.segments),
          techniques: list(evidenceDraft.techniques),
          businessOutcomes: list(evidenceDraft.businessOutcomes),
          manuallyEdited: true,
          editedAt: new Date().toISOString(),
          editedBy: currentUser?.name || currentUser?.id || 'Studio user',
        })
      if (!normalizedUrl) patch = patch.unset(['url'])
      if (original._rev) patch = patch.ifRevisionId(original._rev)
      await patch.commit()
      setEditingEvidenceId(null)
      clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID)
      await load()
      setNotice('Evidence edits saved. Re-run contact research when these changes materially affect matching.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save evidence edits.')
    } finally {
      setSavingEvidence(false)
    }
  }

  const extractAll = async (force = false) => {
    if (extracting || reExtractingId) return
    if (!confirmDiscardUnsavedChange(OUTREACH_EVIDENCE_UNSAVED_ID, 'Starting extraction will close the current unsaved evidence draft. Continue?')) return
    clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID)
    setEditingEvidenceId(null)
    setError(null)
    setNotice(null)
    const total = caseStudyCount || 0
    // A forced sweep re-does every case study, so the counter starts at 0 —
    // starting at evidence.length would show done=N/N for the whole run.
    setExtracting({ done: force ? 0 : Math.min(total, canonicalActiveEvidence.length), total })
    try {
      // The route returns an opaque continuation. Carrying it forward is what
      // prevents a forced sweep from repeatedly selecting the first batch.
      let cursor: string | undefined
      let finalResult: {
        extracted: number
        failed: number
        failedTotal: number
        remaining: number
        complete: boolean
        nextCursor: string | null
        protectedManual: number
      } | null = null
      const maxRounds = Math.max(2, Math.ceil(Math.max(total, 1) / 3) + 2)
      for (let round = 0; round < maxRounds; round += 1) {
        const result = await outreachApi<{
          extracted: number
          failed: number
          failedTotal: number
          remaining: number
          complete: boolean
          nextCursor: string | null
          protectedManual: number
        }>(
          '/api/marketing/outreach/extract-evidence',
          { limit: 3, force, cursor },
          'POST',
          outreachClient,
        )
        finalResult = result
        await load()
        setExtracting((prev) => (prev ? { ...prev, done: Math.min(total, prev.done + result.extracted) } : prev))
        if (!result.nextCursor) break
        cursor = result.nextCursor
      }
      if (!finalResult || finalResult.nextCursor) {
        throw new Error('Evidence extraction stopped before the server reported the sweep finished.')
      }
      if (finalResult.failedTotal > 0) {
        throw new Error(`Evidence extraction finished with ${finalResult.failedTotal} failed case stud${finalResult.failedTotal === 1 ? 'y' : 'ies'}.`)
      }
      if (!finalResult.complete && finalResult.protectedManual > 0) {
        setNotice(`Eligible evidence was refreshed; ${finalResult.protectedManual} manually edited record${finalResult.protectedManual === 1 ? ' was' : 's were'} preserved. Review those records individually before replacing them.`)
      } else if (finalResult.complete) {
        setNotice('Evidence extraction complete. Research now matches contacts against this work.')
      } else {
        throw new Error('Evidence extraction ended without a complete result.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.')
    } finally {
      setExtracting(null)
    }
  }

  const toggleStatus = async (doc: WorkEvidence) => {
    if (!doc._id || extracting || reExtractingId) return
    try {
      let patch = outreachClient
        .patch(doc._id)
        .set({ status: doc.status === 'excluded' ? 'active' : 'excluded' })
      if (doc._rev) patch = patch.ifRevisionId(doc._rev)
      await patch.commit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the record.')
    }
  }

  const reExtractOne = async (doc: WorkEvidence) => {
    if (!doc.sourceId || !doc._id || extracting || reExtractingId) return
    if (!confirmDiscardUnsavedChange(OUTREACH_EVIDENCE_UNSAVED_ID, 'Re-extracting will close the current unsaved evidence draft. Continue?')) return
    if (
      doc.manuallyEdited &&
      !(await confirm({
        title: 'Replace manual evidence edits?',
        message: `Re-extracting "${doc.title || 'this evidence record'}" will replace its hand-edited summary, tags, outcomes, highlights, and source fields with new AI output. This cannot be undone from this workspace.`,
        confirmLabel: 'Replace manual edits',
      }))
    ) return
    clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID)
    setEditingEvidenceId(null)
    setReExtractingId(doc._id)
    setError(null)
    setNotice(`Re-extracting "${doc.title}"…`)
    try {
      const result = await outreachApi<{ complete: boolean; failedTotal: number }>(
        '/api/marketing/outreach/extract-evidence',
        {
          id: doc.sourceId,
          force: true,
          ...(doc.manuallyEdited
            ? {
                overwriteManual: true,
                confirmOverwriteManual: 'OVERWRITE_MANUAL_EVIDENCE',
              }
            : {}),
          limit: 1,
        },
        'POST',
        outreachClient,
      )
      if (!result.complete || result.failedTotal > 0) throw new Error('The evidence record was not replaced successfully.')
      await load()
      setNotice(`Re-extracted "${doc.title}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-extraction failed.')
    } finally {
      setReExtractingId(null)
    }
  }

  const extractionBusy = extracting !== null || reExtractingId !== null

  if (!currentUser) {
    return (
      <section aria-live="polite" style={styles.panel}>
        <PanelHeading title="Evidence access" description="Checking your Studio permissions…" />
      </section>
    )
  }

  if (!canManageOutreach) {
    return (
      <section role="alert" style={{ ...styles.panel, borderColor: 'rgba(217, 138, 138, 0.5)' }}>
        <PanelHeading
          title="Evidence is restricted"
          description="This evidence corpus supports a private contact workflow. Ask a Studio administrator for the Administrator, Developer, or Editor role if you need access."
        />
      </section>
    )
  }

  if (loading)
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <style>{OUTREACH_RESPONSIVE_CSS}</style>
        <section style={styles.panel}>
          <PanelHeading
            title="Work evidence"
            description="Techniques, outcomes, and quantified highlights extracted from our real case studies — the corpus research uses to pick 'show them THIS work' for each contact and to ground tailored offers."
          />
          <EmptyInline title="Loading evidence…" />
        </section>
      </div>
    )

  if (error && caseStudyCount === null) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <style>{OUTREACH_RESPONSIVE_CSS}</style>
        <section role="alert" style={{ ...styles.panel, borderColor: 'rgba(217, 138, 138, 0.5)' }}>
          <PanelHeading title="Evidence could not load" description={error} />
          <button type="button" style={styles.primaryButton} onClick={() => void load()}>Retry</button>
        </section>
      </div>
    )
  }

  const listPreview = (items?: string[]) => (items && items.length ? items.slice(0, 4).join(', ') + (items.length > 4 ? '…' : '') : '—')

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <style>{OUTREACH_RESPONSIVE_CSS}</style>
      {confirmDialog}
      {(notice || error) && (
        <div
          role={error ? 'alert' : 'status'}
          aria-live={error ? 'assertive' : 'polite'}
          style={{
            ...styles.panel,
            padding: '10px 14px',
            borderColor: error ? 'rgba(217, 138, 138, 0.5)' : 'rgba(0, 115, 133, 0.4)',
            color: error ? '#d98a8a' : undefined,
          }}
        >
          {error || notice}
        </div>
      )}

      <section style={styles.panel}>
        <PanelHeading
          title={`Work evidence (${canonicalActiveEvidence.length} unique active${caseStudyCount !== null ? ` / ${caseStudyCount} case studies` : ''})`}
          description="Techniques, outcomes, and quantified highlights extracted from our real case studies — the corpus research uses to pick 'show them THIS work' for each contact and to ground tailored offers. Re-run after new work ships."
        />
        {duplicateActiveEvidenceCount > 0 && (
          <div role="status" style={{ ...styles.card, padding: 10, marginBottom: 12, borderColor: 'rgba(214, 169, 63, 0.45)' }}>
            <strong>{duplicateActiveEvidenceCount} active duplicate record{duplicateActiveEvidenceCount === 1 ? '' : 's'} ignored during contact research.</strong>{' '}
            <span style={styles.muted}>Review the sibling records below and exclude obsolete copies only after checking existing contact references.</span>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <button type="button" style={styles.primaryButton} disabled={extractionBusy} onClick={() => void extractAll(false)}>
            <SearchIcon style={{ width: 15, height: 15 }} />
            {extracting ? `Extracting… ${extracting.done}/${extracting.total}` : 'Extract from case studies'}
          </button>
          {evidence.length > 0 && (
            <button type="button" style={styles.button} disabled={extractionBusy} onClick={() => void extractAll(true)}>
              Re-extract everything
            </button>
          )}
          <span style={{ ...styles.small, ...styles.muted, alignSelf: 'center' }}>
            ~20–30s per case study
            {caseStudyCount ? ` — all ${caseStudyCount} takes roughly ${Math.ceil((caseStudyCount * 25) / 60)} min` : ''}.
            Progress saves as it goes — safe to leave and come back.
          </span>
        </div>

        {evidence.length > 0 && (
          <div data-outreach-filter-grid="true" style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <input
              type="search"
              aria-label="Search evidence"
              style={styles.input}
              value={evidenceSearch}
              onChange={(event) => setEvidenceSearch(event.target.value)}
              placeholder="Search project, client, technique, or outcome"
            />
            <select
              aria-label="Filter evidence by status"
              style={styles.input}
              value={evidenceStatusFilter}
              onChange={(event) => setEvidenceStatusFilter(event.target.value)}
            >
              <option value="all">All evidence</option>
              <option value="active">Active</option>
              <option value="excluded">Excluded</option>
            </select>
            <span style={{ ...styles.small, ...styles.muted, alignSelf: 'center' }}>
              Showing {visibleEvidence.length} of {evidence.length} records.
            </span>
          </div>
        )}

        {evidence.length === 0 ? (
          <EmptyInline title="No evidence extracted yet. Run the extraction — it reads every case study and builds the matching corpus." />
        ) : visibleEvidence.length === 0 ? (
          <EmptyInline title="No evidence matches these filters." />
        ) : (
          <>
          <div data-outreach-desktop-table="true" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Project', 'Client', 'Techniques', 'Highlights', 'Status', 'Actions'].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px 6px 0',
                        borderBottom: '1px solid var(--card-border-color)',
                        color: 'var(--card-muted-fg-color)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleEvidence.map((doc) => (
                  <Fragment key={doc._id}>
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', fontWeight: 700 }}>
                        <button
                          type="button"
                          aria-expanded={expandedId === doc._id}
                          style={{
                            background: 'none',
                            border: 0,
                            color: 'inherit',
                            font: 'inherit',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            minWidth: 24,
                            minHeight: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            textAlign: 'left',
                          }}
                          onClick={() => setExpandedId(expandedId === doc._id ? null : (doc._id as string))}
                        >
                          {expandedId === doc._id ? '▾ ' : '▸ '}
                          {doc.title || 'Untitled'}
                        </button>
                        {doc.manuallyEdited && <div style={{ marginTop: 4 }}><Pill text="Manual edits" colors={AMBER} /></div>}
                      </td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{doc.client || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0', maxWidth: 300 }}>
                        <span style={styles.muted}>{listPreview(doc.techniques)}</span>
                      </td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{(doc.highlights || []).length || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0' }}>
                        {doc.status === 'excluded' ? (
                          <Pill text="Excluded" colors={AMBER} />
                        ) : canonicalActiveEvidenceIds.has(doc._id || '') ? (
                          <Pill text="Active" colors={TEAL} />
                        ) : (
                          <Pill text="Ignored duplicate" colors={AMBER} />
                        )}
                      </td>
                      <td style={{ padding: '8px 0', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                           <button type="button" aria-label={`${doc.status === 'excluded' ? 'Include' : 'Exclude'} ${doc.title || 'evidence record'}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} disabled={extractionBusy} onClick={() => void toggleStatus(doc)}>
                            {doc.status === 'excluded' ? 'Include' : 'Exclude'}
                           </button>
                           <button type="button" aria-label={`Edit ${doc.title || 'evidence record'}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} disabled={extractionBusy} onClick={() => startEditEvidence(doc)}>
                             Edit
                           </button>
                          <button type="button" aria-label={`Re-extract ${doc.title || 'evidence record'}`} style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} disabled={extractionBusy} onClick={() => void reExtractOne(doc)}>
                            {reExtractingId === doc._id ? 'Re-extracting…' : 'Re-extract'}
                          </button>
                          {normalizeOutreachUrl(doc.url) && (
                            <a href={normalizeOutreachUrl(doc.url)} target="_blank" rel="noreferrer" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }}>
                              View
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedId === doc._id && (
                      <tr>
                        <td colSpan={6} style={{ padding: '4px 0 12px' }}>
                          <div style={{ ...styles.card, padding: 12, display: 'grid', gap: 8 }}>
                            {editingEvidenceId === doc._id ? (
                              <div style={{ display: 'grid', gap: 10 }}>
                                <strong>Edit the reviewed evidence record</strong>
                                <InputField label="Project title" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                                  <input style={styles.input} value={evidenceDraft.title} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, title: event.target.value }))} />
                                </InputField>
                                <InputField label="Summary" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                                  <textarea style={{ ...styles.input, minHeight: 90 }} value={evidenceDraft.summary} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, summary: event.target.value }))} />
                                </InputField>
                                <InputField label="Public case-study URL" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                                  <input type="url" style={styles.input} value={evidenceDraft.url} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, url: event.target.value }))} />
                                </InputField>
                                <InputField label="Audience / segment tags (one per line)" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                                  <textarea style={{ ...styles.input, minHeight: 72 }} value={evidenceDraft.segments} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, segments: event.target.value }))} />
                                </InputField>
                                <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  <InputField label="Techniques (one per line)" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                                    <textarea style={{ ...styles.input, minHeight: 100 }} value={evidenceDraft.techniques} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, techniques: event.target.value }))} />
                                  </InputField>
                                  <InputField label="Business outcomes (one per line)" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                                    <textarea style={{ ...styles.input, minHeight: 100 }} value={evidenceDraft.businessOutcomes} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, businessOutcomes: event.target.value }))} />
                                  </InputField>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  <button type="button" style={styles.primaryButton} disabled={savingEvidence} onClick={() => void saveEvidenceEdit()}>
                                    {savingEvidence ? 'Saving…' : 'Save evidence edits'}
                                  </button>
                                  <button
                                    type="button"
                                    style={styles.button}
                                    disabled={savingEvidence}
                                    onClick={() => {
                                      setEditingEvidenceId(null)
                                      clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID)
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                            {doc.summary && <div style={{ lineHeight: 1.5 }}>{doc.summary}</div>}
                            {(doc.highlights || []).length > 0 && (
                              <div style={{ ...styles.small, display: 'grid', gap: 3 }}>
                                <strong>Highlights:</strong>
                                {(doc.highlights || []).map((h) => (
                                  <div key={h._key} style={{ paddingLeft: 10 }}>
                                    • <strong>{h.metric}</strong>
                                    {h.detail ? ` — ${h.detail}` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                            {(
                              [
                                ['Techniques', doc.techniques],
                                ['Skills', doc.skills],
                                ['Frameworks', doc.frameworks],
                                ['Tech', doc.technicalImplementation],
                                ['Domain', doc.domainExpertise],
                                ['Outcomes', doc.businessOutcomes],
                              ] as Array<[string, string[] | undefined]>
                            )
                              .filter(([, items]) => items && items.length)
                              .map(([label, items]) => (
                                <div key={label} style={{ ...styles.small }}>
                                  <strong>{label}:</strong> <span style={styles.muted}>{(items || []).join(', ')}</span>
                                </div>
                              ))}
                            {doc.extractedAt && (
                              <div style={{ ...styles.small, ...styles.muted }}>
                                Extracted {new Date(doc.extractedAt).toLocaleDateString()} · {doc.extractionModel}
                              </div>
                            )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div data-outreach-mobile-list="true" style={{ display: 'none', gap: 10 }}>
            {visibleEvidence.map((doc) => (
              <article key={doc._id} style={{ ...styles.card, padding: 12, display: 'grid', gap: 9 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ fontSize: 15 }}>{doc.title || 'Untitled'}</strong>
                  <span style={{ fontSize: 13, color: 'var(--card-muted-fg-color)' }}>{doc.client || 'No client listed'}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {doc.status === 'excluded' ? (
                    <Pill text="Excluded" colors={AMBER} />
                  ) : canonicalActiveEvidenceIds.has(doc._id || '') ? (
                    <Pill text="Active" colors={TEAL} />
                  ) : (
                    <Pill text="Ignored duplicate" colors={AMBER} />
                  )}
                  {doc.manuallyEdited && <Pill text="Manual edits" colors={AMBER} />}
                </div>
                {doc.summary && <div style={{ fontSize: 14, lineHeight: 1.55 }}>{doc.summary}</div>}
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--card-muted-fg-color)' }}>
                  <strong style={{ color: 'inherit' }}>Techniques:</strong> {listPreview(doc.techniques)}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--card-muted-fg-color)' }}>
                  <strong style={{ color: 'inherit' }}>Outcomes:</strong> {listPreview(doc.businessOutcomes)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button type="button" aria-label={`${doc.status === 'excluded' ? 'Include' : 'Exclude'} ${doc.title || 'evidence record'}`} style={styles.button} disabled={extractionBusy} onClick={() => void toggleStatus(doc)}>{doc.status === 'excluded' ? 'Include' : 'Exclude'}</button>
                  <button type="button" aria-label={`Edit ${doc.title || 'evidence record'}`} style={styles.button} disabled={extractionBusy} onClick={() => startEditEvidence(doc)}>Edit</button>
                  <button type="button" aria-label={`Re-extract ${doc.title || 'evidence record'}`} style={styles.button} disabled={extractionBusy} onClick={() => void reExtractOne(doc)}>{reExtractingId === doc._id ? 'Re-extracting…' : 'Re-extract'}</button>
                  {normalizeOutreachUrl(doc.url) && <a href={normalizeOutreachUrl(doc.url)} target="_blank" rel="noreferrer" style={styles.button}>View case study</a>}
                </div>
                {editingEvidenceId === doc._id && (
                  <div style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--card-border-color)', paddingTop: 10 }}>
                    <InputField label="Project title" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                      <input style={styles.input} value={evidenceDraft.title} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, title: event.target.value }))} />
                    </InputField>
                    <InputField label="Summary" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                      <textarea style={{ ...styles.input, minHeight: 90 }} value={evidenceDraft.summary} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, summary: event.target.value }))} />
                    </InputField>
                    <InputField label="Public case-study URL" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                      <input type="url" style={styles.input} value={evidenceDraft.url} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, url: event.target.value }))} />
                    </InputField>
                    <InputField label="Audience / segment tags (one per line)" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                      <textarea style={{ ...styles.input, minHeight: 72 }} value={evidenceDraft.segments} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, segments: event.target.value }))} />
                    </InputField>
                    <InputField label="Techniques (one per line)" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                      <textarea style={{ ...styles.input, minHeight: 90 }} value={evidenceDraft.techniques} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, techniques: event.target.value }))} />
                    </InputField>
                    <InputField label="Business outcomes (one per line)" unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID} unsavedLabel="evidence edit draft">
                      <textarea style={{ ...styles.input, minHeight: 90 }} value={evidenceDraft.businessOutcomes} onChange={(event) => setEvidenceDraft((draft) => ({ ...draft, businessOutcomes: event.target.value }))} />
                    </InputField>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button type="button" style={styles.primaryButton} disabled={savingEvidence} onClick={() => void saveEvidenceEdit()}>{savingEvidence ? 'Saving…' : 'Save edits'}</button>
                      <button type="button" style={styles.button} disabled={savingEvidence} onClick={() => { setEditingEvidenceId(null); clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID) }}>Cancel</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
          </>
        )}
      </section>
    </div>
  )
}
