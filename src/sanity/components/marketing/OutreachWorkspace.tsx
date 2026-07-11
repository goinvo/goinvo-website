import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { SearchIcon, UsersIcon } from '@sanity/icons'

import { useConfirmDialog } from './ConfirmDialog'

import {
  LOG_STATUS_VALUES,
  OUTREACH_DATASET,
  OUTREACH_SEGMENT_OPTIONS,
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_WARMTH_OPTIONS,
} from '@/lib/marketing/outreachEnums'
import {
  buildInteractionEntry,
  buildWarmStartSuggestions,
  contactDedupeKey,
  DEFAULT_FINANCIAL_POSTURE_ID,
  DEFAULT_OFFERS,
  dueFollowUps,
  FINANCIAL_POSTURE_DOC_ID,
  getFinancialPosture,
  isFinancialPostureId,
  rankCallPlan,
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
  studioSessionToken,
  styles,
  type MarketingContact,
  type MarketingOffer,
  type StudioClient,
} from '../../tools/marketingTool'

// Contacts/offers/evidence live in the PRIVATE outreach dataset (contact PII
// must never enter the world-readable production dataset), so this workspace
// fetches and writes through its own dataset-scoped client rather than the
// tool's shared MarketingData.
interface OutreachWorkspaceProps {
  client: StudioClient
  /** Optional: switch to the Evidence tab (the tool shell owns view state; the banner button renders only when this is wired). */
  onOpenEvidence?: () => void
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
  _id, _updatedAt, name, organization, role, segment, owner, warmth, status,
  email, phone, linkedinUrl, howWeKnow, sourceNotes,
  researchedAt, researchSummary, personVerified, identityConfidence,
  opportunities[]{_key, offerKey, headline, rationale},
  relevantEvidence[]{_key, evidenceId, title, why},
  proposedOffers[]{_key, title, oneLiner, priceBand, rationale, evidenceIds, chosen},
  feasibilityScore, feasibilityReasoning, suggestedOfferKey, suggestedOpener, callBrief,
  researchModel, researchSources[]{_key, title, url},
  lastContactedAt, followUpAt, nextStep, outcomeNotes, intelGathered,
  interactions[]{_key, at, by, outcome, intel, nextStep, statusAfter}
`

const FOLLOW_UP_PRESETS = [
  { label: 'No follow-up', days: null },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 6 weeks', days: 42 },
  { label: 'Next quarter', days: 90 },
]

async function outreachApi<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  method: 'POST' | 'GET' = 'POST',
): Promise<T> {
  const token = studioSessionToken()
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'x-sanity-session': token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status}).`)
  return json
}

function labelForValue(options: Array<{ title: string; value: string }>, value?: string) {
  if (!value) return ''
  return options.find((o) => o.value === value)?.title || value
}

function hasRealPrice(priceBand?: string) {
  return /\d/.test(priceBand || '')
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
    if (cms) return { title: cms.title, oneLiner: cms.oneLiner, priceBand: cms.priceBand, source: 'catalog' }
    const fallback = DEFAULT_OFFERS.find((o) => o.key === key)
    if (fallback)
      return { title: fallback.title, oneLiner: fallback.oneLiner, priceBand: fallback.priceBand, source: 'catalog' }
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
  offerCount,
  contactCount,
}: {
  posture: FinancialPosture
  evidenceCount: number | null
  offerCount: number
  contactCount: number
}) {
  const shortRunway = posture.id === 'survival' || posture.id === 'rebuild'
  return (
    <section data-tour-id="autopilot-plan-warm-network" style={{ ...styles.panel, borderColor: 'rgba(0, 115, 133, 0.45)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <UsersIcon style={{ width: 20, height: 20, color: '#007385', flexShrink: 0, marginTop: 2 }} />
        <div style={{ display: 'grid', gap: 10 }}>
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
      </div>
    </section>
  )
}

export function OutreachWorkspace({ client, onOpenEvidence }: OutreachWorkspaceProps) {
  const outreachClient = useMemo(() => client.withConfig({ dataset: OUTREACH_DATASET }), [client])

  const [contacts, setContacts] = useState<MarketingContact[]>([])
  const [offers, setOffers] = useState<MarketingOffer[]>([])
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
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

  const [editingOffer, setEditingOffer] = useState<{ contactId: string; key: string } | null>(null)
  const [offerDraft, setOfferDraft] = useState({ title: '', oneLiner: '', priceBand: '' })

  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [contactDraft, setContactDraft] = useState<Record<string, string>>({})
  const [savingContact, setSavingContact] = useState(false)

  const [statusFilter, setStatusFilter] = useState('all')
  const [seedingOffers, setSeedingOffers] = useState(false)

  const say = (message: string) => {
    setError(null)
    setNotice(message)
  }
  const fail = (err: unknown, fallback: string) => {
    setNotice(null)
    setError(err instanceof Error ? err.message : fallback)
  }

  const loadOutreach = useCallback(async () => {
    try {
      const result = await outreachClient.fetch<{
        contacts: MarketingContact[]
        offers: MarketingOffer[]
        evidenceCount: number
        financialPosture: string | null
      }>(
        `{
          "contacts": *[_type == "marketingContact"]|order(coalesce(feasibilityScore, -1) desc, _updatedAt desc){${CONTACT_FIELDS}},
          "offers": *[_type == "marketingOffer"]|order(coalesce(order, 100) asc, title asc){
            _id, _updatedAt, title, key, status, oneLiner, description, priceBand, idealBuyer, proofPoints, order
          },
          "evidenceCount": count(*[_type == "marketingWorkEvidence" && status == "active"]),
          "financialPosture": *[_id == "${FINANCIAL_POSTURE_DOC_ID}"][0].posture
        }`,
      )
      setContacts(result.contacts || [])
      setOffers(result.offers || [])
      setEvidenceCount(typeof result.evidenceCount === 'number' ? result.evidenceCount : 0)
      // The posture doc shares the PRIVATE outreach dataset (candid feasibility
      // data — never the world-readable production dataset). Unset/unknown
      // falls back to the survival copy in the plan panel.
      setPostureId(isFinancialPostureId(result.financialPosture) ? result.financialPosture : null)
    } catch (err) {
      fail(err, 'Could not load outreach data.')
    } finally {
      setLoading(false)
    }
  }, [outreachClient])

  useEffect(() => {
    void loadOutreach()
  }, [loadOutreach])

  const offerByKey = useMemo(() => {
    const map = new Map<string, MarketingOffer>()
    for (const offer of offers) if (offer.key) map.set(offer.key, offer)
    return map
  }, [offers])

  const nowIso = new Date().toISOString()
  const followUps = useMemo(() => dueFollowUps(contacts, { now: nowIso }), [contacts, nowIso])
  const plan = useMemo(() => rankCallPlan(contacts, { limit: 8 }), [contacts])
  const unresearched = useMemo(() => contacts.filter((c) => (c.status || 'new') === 'new'), [contacts])
  const visibleContacts = useMemo(
    () => (statusFilter === 'all' ? contacts : contacts.filter((c) => (c.status || 'new') === statusFilter)),
    [contacts, statusFilter],
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
      )
      setIntakeText('')
      setIntakePreview(null)
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
      }>(
        `{
          "caseStudyClients": *[_type == "caseStudy" && defined(client) && !(_id in path("drafts.**"))]{client, title},
          "thankedPeople": *[_type == "feature" && defined(specialThanks) && !(_id in path("drafts.**"))]{"text": pt::text(specialThanks), "featureTitle": title}
        }`,
      )
      const suggestions = buildWarmStartSuggestions({
        caseStudyClients: raw.caseStudyClients || [],
        thankedPeople: raw.thankedPeople || [],
        existingContacts: contacts,
      })
      setWarmStart(suggestions)
      setWarmStartSelected(new Set(suggestions.map((s) => contactDedupeKey(s.name, s.organization))))
      say(
        suggestions.length
          ? `Found ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} from our published work — untick any that don't fit, then add.`
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
    setResearchingId(contact._id)
    try {
      const result = await outreachApi<{ feasibilityScore: number | null; personVerified: boolean; evidenceIndexSize?: number }>(
        '/api/marketing/outreach/research',
        { id: contact._id },
      )
      await loadOutreach()
      say(
        `Researched ${contact.name || 'contact'} — ${fitBucket(result.feasibilityScore).label.toLowerCase()}` +
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
        const result = await outreachApi<{ evidenceIndexSize?: number }>('/api/marketing/outreach/research', { id: target._id })
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
        `Researched ${targets.length} contact${targets.length === 1 ? '' : 's'}. The call plan is ready.` +
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
      await outreachClient.patch(contact._id).set({ proposedOffers: updated }).commit()
      await loadOutreach()
      say(key ? 'Offer chosen — the call now presents this draft.' : 'Reset to the catalog offer.')
    } catch (err) {
      fail(err, 'Could not choose the offer.')
    }
  }

  const startEditOffer = (contact: MarketingContact, key: string) => {
    const offer = (contact.proposedOffers || []).find((o) => o._key === key)
    if (!offer) return
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
      await outreachClient.patch(contact._id).set({ proposedOffers: updated }).commit()
      setEditingOffer(null)
      await loadOutreach()
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

  const openLog = (contact: MarketingContact) => {
    setLoggingId(contact._id)
    // Default to the contact's CURRENT status when it's a loggable one — a
    // 'meeting' contact must not silently regress to 'contacted'.
    setLogStatus(LOG_STATUS_VALUES.includes(contact.status || '') ? (contact.status as string) : 'contacted')
    setLogOutcome('')
    setLogIntel('')
    setLogNextStep(contact.nextStep || '')
    setLogFollowUpDays(7)
  }

  const saveLog = async (contact: MarketingContact) => {
    const at = new Date().toISOString()
    const entry = buildInteractionEntry({
      at,
      outcome: logOutcome.trim() || undefined,
      intel: logIntel.trim() || undefined,
      nextStep: logNextStep.trim() || undefined,
      statusAfter: logStatus,
    })
    const set: Record<string, unknown> = { status: logStatus, lastContactedAt: at }
    if (logNextStep.trim()) set.nextStep = logNextStep.trim()
    if (logFollowUpDays !== null) {
      set.followUpAt = new Date(Date.now() + logFollowUpDays * 86400000).toISOString()
    }
    try {
      await outreachClient
        .patch(contact._id)
        .setIfMissing({ interactions: [] })
        .set(set)
        .insert('after', 'interactions[-1]', [entry])
        .commit()
      setLoggingId(null)
      await loadOutreach()
      say(
        `Logged ${labelForValue(STATUS_SHORT_OPTIONS, logStatus).toLowerCase()} for ${contact.name || 'contact'}` +
          (logFollowUpDays !== null ? ` — follows up in ${logFollowUpDays} day${logFollowUpDays === 1 ? '' : 's'}` : '') +
          '. Moved off the first-call list.',
      )
    } catch (err) {
      fail(err, 'Could not save the call log.')
    }
  }

  // ---- Contact editing / deletion (private dataset — edited here, not via
  // Structure intent links, which only reach the public dataset) ----

  const startEditContact = (contact: MarketingContact) => {
    setEditingContactId(contact._id)
    setContactDraft({
      name: contact.name || '',
      organization: contact.organization || '',
      role: contact.role || '',
      segment: contact.segment || '',
      warmth: contact.warmth || '',
      owner: contact.owner || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedinUrl: contact.linkedinUrl || '',
      howWeKnow: contact.howWeKnow || '',
      status: contact.status || 'new',
    })
  }

  const saveContactEdit = async () => {
    if (!editingContactId) return
    setSavingContact(true)
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    for (const [key, value] of Object.entries(contactDraft)) {
      if (value.trim()) set[key] = value.trim()
      else unset.push(key)
    }
    set.name = contactDraft.name.trim() || 'Unnamed'
    set.status = contactDraft.status || 'new'
    try {
      await outreachClient
        .patch(editingContactId)
        .set(set)
        .unset(unset.filter((k) => !['name', 'status'].includes(k)))
        .commit()
      setEditingContactId(null)
      await loadOutreach()
      say('Contact updated.')
    } catch (err) {
      fail(err, 'Could not save the contact.')
    } finally {
      setSavingContact(false)
    }
  }

  const deleteContact = async (contact: MarketingContact) => {
    const message = `Delete "${contact.name || 'this contact'}"? This removes the record, its research, and its call history.`
    if (!(await confirm({ title: 'Delete contact?', message, confirmLabel: 'Delete' }))) return
    try {
      await outreachClient.delete(contact._id)
      await loadOutreach()
      say(`Deleted ${contact.name || 'contact'}.`)
    } catch (err) {
      fail(err, 'Could not delete the contact.')
    }
  }

  const seedOffers = async () => {
    setSeedingOffers(true)
    try {
      const result = await outreachApi<{ created: string[] }>('/api/marketing/outreach/seed-offers')
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
    try {
      await outreachClient.patch(offer._id).set({ [field]: value }).commit()
      await loadOutreach()
    } catch (err) {
      fail(err, 'Could not save the offer.')
    }
  }

  // Unset/unreadable posture falls back to survival — the confirmed reality
  // this surface was built for (see the module comment).
  const activePosture = getFinancialPosture(postureId) ?? getFinancialPosture(DEFAULT_FINANCIAL_POSTURE_ID)!

  if (loading) {
    // Lightweight scaffold instead of a bare spinner line — the intro reads
    // while the private-dataset fetch runs, and the section names stay put.
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <OutreachPlanPanel posture={activePosture} evidenceCount={null} offerCount={0} contactCount={0} />
        {["This week's calls", 'Add contacts', 'Contacts', 'Offers'].map((title) => (
          <section key={title} style={styles.panel}>
            <PanelHeading title={title} description="Loading…" />
          </section>
        ))}
      </div>
    )
  }

  const renderPlanCard = (contact: MarketingContact, index: number, context: 'plan' | 'followUp') => {
    const bucket = fitBucket(contact.feasibilityScore)
    const present = presentedOffer(contact, offerByKey)
    const isLogging = loggingId === contact._id
    const overdue = context === 'followUp' && contact.followUpAt && new Date(contact.followUpAt) < new Date()
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
              text={`${overdue ? 'Overdue: ' : 'Due '}${new Date(contact.followUpAt).toLocaleDateString()}`}
              colors={overdue ? RED : AMBER}
            />
          )}
          <StatusPill status={contact.status} options={STATUS_SHORT_OPTIONS} />
          {contact.owner && <span style={{ ...styles.small, ...styles.muted }}>owner: {contact.owner}</span>}
        </div>

        {(contact.email || contact.phone || contact.linkedinUrl) && (
          <div style={{ ...styles.small, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {contact.phone && <span>☎ {contact.phone}</span>}
            {contact.email && <a href={`mailto:${contact.email}`} style={styles.inlineLink}>{contact.email}</a>}
            {contact.linkedinUrl && (
              <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" style={styles.inlineLink}>
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
                • <strong>{ev.title || ev.evidenceId}</strong>
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
                        <InputField label="Title">
                          <input style={styles.input} value={offerDraft.title} onChange={(e) => setOfferDraft((d) => ({ ...d, title: e.target.value }))} />
                        </InputField>
                        <InputField label="One-liner (as said on the call)">
                          <textarea style={{ ...styles.input, minHeight: 44 }} value={offerDraft.oneLiner} onChange={(e) => setOfferDraft((d) => ({ ...d, oneLiner: e.target.value }))} />
                        </InputField>
                        <InputField label="Price band">
                          <input style={styles.input} value={offerDraft.priceBand} placeholder='e.g. "Fixed fee, $40–80K, 4–6 weeks"' onChange={(e) => setOfferDraft((d) => ({ ...d, priceBand: e.target.value }))} />
                        </InputField>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" style={styles.primaryButton} onClick={() => void saveOfferEdit(contact)}>Save</button>
                          <button type="button" style={styles.button} onClick={() => setEditingOffer(null)}>Cancel</button>
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

        {contact.callBrief && <div style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{contact.callBrief}</div>}

        {contact.suggestedOpener && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Suggested opener</summary>
            <div style={{ ...styles.small, marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{contact.suggestedOpener}</div>
          </details>
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
                </div>
              ))}
            </div>
          </details>
        )}

        {(contact.researchSources || []).length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              Sources ({(contact.researchSources || []).length})
            </summary>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {(contact.researchSources || []).map((source) => (
                <li key={source._key || source.url} style={styles.small}>
                  <a href={source.url} target="_blank" rel="noreferrer" style={styles.inlineLink}>
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        {isLogging ? (
          <div style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--card-border-color)', paddingTop: 10 }}>
            <InputField label="What happened? (optional)">
              <textarea style={{ ...styles.input, minHeight: 60 }} value={logOutcome} onChange={(e) => setLogOutcome(e.target.value)} placeholder="Outcome of the call/message" />
            </InputField>
            <InputField label="Intelligence gathered (optional)" help="e.g. what actually got funded in their org this year">
              <textarea style={{ ...styles.input, minHeight: 48 }} value={logIntel} onChange={(e) => setLogIntel(e.target.value)} />
            </InputField>
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <InputField label="Next step (optional)">
                <input style={styles.input} value={logNextStep} onChange={(e) => setLogNextStep(e.target.value)} />
              </InputField>
              <InputField label="New status">
                <select style={styles.input} value={logStatus} onChange={(e) => setLogStatus(e.target.value)}>
                  {STATUS_SHORT_OPTIONS.filter((o) => LOG_STATUS_VALUES.includes(o.value)).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Follow up" help="They'll resurface in the follow-ups strip">
                <select
                  style={styles.input}
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
              <button type="button" style={styles.primaryButton} onClick={() => void saveLog(contact)}>
                Save log
              </button>
              <button type="button" style={styles.button} onClick={() => setLoggingId(null)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" style={styles.primaryButton} onClick={() => openLog(contact)}>
              Log call
            </button>
            <button type="button" style={styles.button} disabled={researchingId === contact._id} onClick={() => void researchOne(contact)}>
              {researchingId === contact._id ? 'Re-researching…' : 'Re-research'}
            </button>
            <button type="button" style={styles.button} onClick={() => startEditContact(contact)}>
              Edit details
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {confirmDialog}
      {(notice || error) && (
        <div
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

      <OutreachPlanPanel posture={activePosture} evidenceCount={evidenceCount} offerCount={offers.length} contactCount={contacts.length} />

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

      {followUps.length > 0 && (
        <section style={{ ...styles.panel, borderColor: 'rgba(214, 169, 63, 0.5)' }}>
          <PanelHeading
            title={`Follow-ups due (${followUps.length})`}
            description="People you already reached who are due (or overdue) for the next touch — they come before new first calls."
          />
          <div style={{ display: 'grid', gap: 12 }}>{followUps.map((c, i) => renderPlanCard(c as MarketingContact, i, 'followUp'))}</div>
        </section>
      )}

      {contacts.length > 0 && (
        <section style={styles.panel}>
          <PanelHeading
            title="This week's calls"
            description="Researched contacts ranked warmth-first (relationship beats model score), fit as tiebreak. Each card is the brief for one call: the work to show, the offer to present, how to open, and the intelligence question to ask no matter what."
          />
          {plan.length === 0 ? (
            <EmptyInline title="No researched contacts yet. Paste names below, run research, and the ranked plan appears here." />
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>{plan.map((c, i) => renderPlanCard(c as MarketingContact, i, 'plan'))}</div>
          )}
        </section>
      )}

      <section data-tour-id="autopilot-outreach-intake" style={styles.panel}>
        <PanelHeading
          title="Add contacts"
          description="Paste names — one per line, as messy as you like: “Name — company — how we know them”. AI parses them into contact records; duplicates are skipped automatically."
        />
        <div style={{ display: 'grid', gap: 10 }}>
          <textarea
            style={{ ...styles.input, minHeight: 120, fontFamily: 'inherit' }}
            value={intakeText}
            onChange={(event) => {
              setIntakeText(event.target.value)
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
          </div>
          {warmStart && (
            <div style={{ ...styles.panel, boxShadow: 'none', borderStyle: 'dashed', padding: 12, display: 'grid', gap: 8 }}>
              <div style={{ ...styles.small, lineHeight: 1.5 }}>
                <strong>From our published work:</strong> people we thanked and past-client organizations, with
                “how we know them” pre-filled. Org entries research the organization — add the person’s name
                once you know who to call there.
              </div>
              {warmStart.length === 0 ? (
                <EmptyInline title="Nothing new — everyone from our published work is already in the list." />
              ) : (
                <div style={{ display: 'grid', gap: 4 }}>
                  {warmStart.map((s) => {
                    const key = contactDedupeKey(s.name, s.organization)
                    const checked = warmStartSelected.has(key)
                    return (
                      <label key={key} style={{ ...styles.small, display: 'flex', gap: 8, alignItems: 'baseline', cursor: 'pointer' }}>
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
                        <strong>{s.name}</strong>
                        <span style={styles.muted}>
                          {s.kind === 'client-org' ? 'past client org' : 'person'} · {s.howWeKnow}
                        </span>
                      </label>
                    )
                  })}
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
                  {contact.duplicate && <span style={{ color: '#d6a93f', fontWeight: 700 }}>already exists — will skip</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <PanelHeading
          title={`Contacts (${contacts.length})`}
          description="Everyone in the outreach pipeline. Research fills in the work to show, the offers to present, and the call brief for each contact."
        />
        {contacts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
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
            <span style={{ flex: 1 }} />
            <select style={{ ...styles.input, width: 'auto' }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {STATUS_SHORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {visibleContacts.length === 0 ? (
          <EmptyInline title={contacts.length === 0 ? 'No contacts yet — paste some names above.' : 'No contacts match this filter.'} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Name', 'Organization', 'Segment', 'Warmth', 'Owner', 'Status', 'Fit', 'Next', ''].map((heading) => (
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
                        {contact.followUpAt ? new Date(contact.followUpAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '8px 0', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }}
                            disabled={researchingId === contact._id || batch !== null}
                            onClick={() => void researchOne(contact)}
                          >
                            {researchingId === contact._id ? 'Researching…' : contact.researchedAt ? 'Re-research' : 'Research'}
                          </button>
                          <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => startEditContact(contact)}>
                            Edit
                          </button>
                          <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => void deleteContact(contact)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingContactId && (
          <div style={{ ...styles.card, padding: 14, marginTop: 12, display: 'grid', gap: 10 }}>
            <strong>Edit contact</strong>
            <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <InputField label="Name">
                <input style={styles.input} value={contactDraft.name || ''} onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))} />
              </InputField>
              <InputField label="Organization">
                <input style={styles.input} value={contactDraft.organization || ''} onChange={(e) => setContactDraft((d) => ({ ...d, organization: e.target.value }))} />
              </InputField>
              <InputField label="Role">
                <input style={styles.input} value={contactDraft.role || ''} onChange={(e) => setContactDraft((d) => ({ ...d, role: e.target.value }))} />
              </InputField>
              <InputField label="Segment">
                <select style={styles.input} value={contactDraft.segment || ''} onChange={(e) => setContactDraft((d) => ({ ...d, segment: e.target.value }))}>
                  <option value="">—</option>
                  {OUTREACH_SEGMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Warmth">
                <select style={styles.input} value={contactDraft.warmth || ''} onChange={(e) => setContactDraft((d) => ({ ...d, warmth: e.target.value }))}>
                  <option value="">Unknown</option>
                  {WARMTH_SHORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
              <InputField label="Relationship owner">
                <input style={styles.input} value={contactDraft.owner || ''} onChange={(e) => setContactDraft((d) => ({ ...d, owner: e.target.value }))} />
              </InputField>
              <InputField label="Email">
                <input style={styles.input} value={contactDraft.email || ''} onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))} />
              </InputField>
              <InputField label="Phone">
                <input style={styles.input} value={contactDraft.phone || ''} onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))} />
              </InputField>
              <InputField label="LinkedIn URL">
                <input style={styles.input} value={contactDraft.linkedinUrl || ''} onChange={(e) => setContactDraft((d) => ({ ...d, linkedinUrl: e.target.value }))} />
              </InputField>
              <InputField label="Status">
                <select style={styles.input} value={contactDraft.status || 'new'} onChange={(e) => setContactDraft((d) => ({ ...d, status: e.target.value }))}>
                  {STATUS_SHORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </InputField>
            </div>
            <InputField label="How we know them">
              <textarea style={{ ...styles.input, minHeight: 48 }} value={contactDraft.howWeKnow || ''} onChange={(e) => setContactDraft((d) => ({ ...d, howWeKnow: e.target.value }))} />
            </InputField>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={styles.primaryButton} disabled={savingContact} onClick={() => void saveContactEdit()}>
                {savingContact ? 'Saving…' : 'Save contact'}
              </button>
              <button type="button" style={styles.button} onClick={() => setEditingContactId(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <PanelHeading
          title={`Offers (${offers.filter((o) => o.status !== 'paused').length} active)`}
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
                    style={styles.input}
                    defaultValue={offer.oneLiner || ''}
                    placeholder="One-liner, as said on a call"
                    onBlur={(e) => {
                      if (e.target.value !== (offer.oneLiner || '')) void saveOfferField(offer, 'oneLiner', e.target.value)
                    }}
                  />
                  <input
                    style={styles.input}
                    defaultValue={offer.priceBand || ''}
                    placeholder='Price band, e.g. "Fixed fee, $40–80K"'
                    onBlur={(e) => {
                      if (e.target.value !== (offer.priceBand || '')) void saveOfferField(offer, 'priceBand', e.target.value)
                    }}
                  />
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

  const [evidence, setEvidence] = useState<WorkEvidence[]>([])
  const [caseStudyCount, setCaseStudyCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState<{ done: number; total: number } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [docs, count] = await Promise.all([
        outreachClient.fetch<WorkEvidence[]>(
          `*[_type == "marketingWorkEvidence"]|order(title asc){
            _id, sourceId, sourceType, title, slug, client, url, status, manuallyEdited,
            summary, segments, techniques, skills, frameworks, technicalImplementation,
            domainExpertise, businessOutcomes, highlights[]{_key, metric, detail},
            extractedAt, extractionModel
          }`,
        ),
        client.fetch<number>(`count(*[_type == "caseStudy"])`),
      ])
      setEvidence(docs)
      setCaseStudyCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load evidence.')
    } finally {
      setLoading(false)
    }
  }, [client, outreachClient])

  useEffect(() => {
    void load()
  }, [load])

  const extractAll = async (force = false) => {
    setError(null)
    setNotice(null)
    const total = caseStudyCount || 0
    // A forced sweep re-does every case study, so the counter starts at 0 —
    // starting at evidence.length would show done=N/N for the whole run.
    setExtracting({ done: force ? 0 : evidence.length, total })
    try {
      // Loop until the sweep reports nothing remaining — each call processes a
      // small batch inside the serverless window.
      for (let round = 0; round < 20; round += 1) {
        const result = await outreachApi<{ extracted: number; failed: number; remaining: number }>(
          '/api/marketing/outreach/extract-evidence',
          { limit: 3, force },
        )
        await load()
        setExtracting((prev) => (prev ? { ...prev, done: Math.min(total, prev.done + result.extracted) } : prev))
        if (result.remaining === 0) break
        if (result.extracted === 0 && result.failed > 0) {
          throw new Error(`Extraction stalled — ${result.failed} failures in the last batch.`)
        }
      }
      setNotice('Evidence extraction complete. Research now matches contacts against this work.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.')
    } finally {
      setExtracting(null)
    }
  }

  const toggleStatus = async (doc: WorkEvidence) => {
    if (!doc._id) return
    try {
      await outreachClient
        .patch(doc._id)
        .set({ status: doc.status === 'excluded' ? 'active' : 'excluded' })
        .commit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the record.')
    }
  }

  const reExtractOne = async (doc: WorkEvidence) => {
    if (!doc.sourceId) return
    setError(null)
    setNotice(`Re-extracting "${doc.title}"…`)
    try {
      await outreachApi('/api/marketing/outreach/extract-evidence', {
        id: doc.sourceId,
        force: true,
        forceEdited: true,
        limit: 1,
      })
      await load()
      setNotice(`Re-extracted "${doc.title}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-extraction failed.')
    }
  }

  if (loading)
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={styles.panel}>
          <PanelHeading
            title="Work evidence"
            description="Techniques, outcomes, and quantified highlights extracted from our real case studies — the corpus research uses to pick 'show them THIS work' for each contact and to ground tailored offers."
          />
          <EmptyInline title="Loading evidence…" />
        </section>
      </div>
    )

  const listPreview = (items?: string[]) => (items && items.length ? items.slice(0, 4).join(', ') + (items.length > 4 ? '…' : '') : '—')

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {(notice || error) && (
        <div
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
          title={`Work evidence (${evidence.length}${caseStudyCount !== null ? ` of ${caseStudyCount} case studies` : ''})`}
          description="Techniques, outcomes, and quantified highlights extracted from our real case studies — the corpus research uses to pick 'show them THIS work' for each contact and to ground tailored offers. Re-run after new work ships."
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <button type="button" style={styles.primaryButton} disabled={extracting !== null} onClick={() => void extractAll(false)}>
            <SearchIcon style={{ width: 15, height: 15 }} />
            {extracting ? `Extracting… ${extracting.done}/${extracting.total}` : 'Extract from case studies'}
          </button>
          {evidence.length > 0 && (
            <button type="button" style={styles.button} disabled={extracting !== null} onClick={() => void extractAll(true)}>
              Re-extract everything
            </button>
          )}
          <span style={{ ...styles.small, ...styles.muted, alignSelf: 'center' }}>
            ~20–30s per case study
            {caseStudyCount ? ` — all ${caseStudyCount} takes roughly ${Math.ceil((caseStudyCount * 25) / 60)} min` : ''}.
            Progress saves as it goes — safe to leave and come back.
          </span>
        </div>

        {evidence.length === 0 ? (
          <EmptyInline title="No evidence extracted yet. Run the extraction — it reads every case study and builds the matching corpus." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Project', 'Client', 'Techniques', 'Highlights', 'Status', ''].map((heading) => (
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
                {evidence.map((doc) => (
                  <Fragment key={doc._id}>
                    <tr>
                      <td style={{ padding: '8px 10px 8px 0', fontWeight: 700 }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          onClick={() => setExpandedId(expandedId === doc._id ? null : (doc._id as string))}
                        >
                          {expandedId === doc._id ? '▾ ' : '▸ '}
                          {doc.title || 'Untitled'}
                        </button>
                      </td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{doc.client || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0', maxWidth: 300 }}>
                        <span style={styles.muted}>{listPreview(doc.techniques)}</span>
                      </td>
                      <td style={{ padding: '8px 10px 8px 0' }}>{(doc.highlights || []).length || '—'}</td>
                      <td style={{ padding: '8px 10px 8px 0' }}>
                        {doc.status === 'excluded' ? <Pill text="Excluded" colors={AMBER} /> : <Pill text="Active" colors={TEAL} />}
                      </td>
                      <td style={{ padding: '8px 0', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} onClick={() => void toggleStatus(doc)}>
                            {doc.status === 'excluded' ? 'Include' : 'Exclude'}
                          </button>
                          <button type="button" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }} disabled={extracting !== null} onClick={() => void reExtractOne(doc)}>
                            Re-extract
                          </button>
                          {doc.url && (
                            <a href={doc.url} target="_blank" rel="noreferrer" style={{ ...styles.button, padding: '5px 9px', fontSize: 12 }}>
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
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
