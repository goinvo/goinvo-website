/**
 * Per-contact outreach brief card — data assembly + copy generation under the
 * personalization policy. The TEMPLATE lives in briefCardTemplate.ts (edit that
 * for design); this module owns what is ALLOWED onto a card.
 *
 * Personalization policy (enforced here, not just hoped for):
 *  - Sources: the recipient's public professional work + their org's public
 *    announcements + GoInvo's shipped case studies. Nothing else.
 *  - NEVER on a card: email engagement (opens/clicks/subscriber behavior),
 *    org distress (layoffs, funding pressure), personal life, anything
 *    login-gated, inferred attributes. `assertBriefCardSafe` hard-fails copy
 *    that mentions any of it — the internal research DOES contain these.
 *  - Every claim cites its provenance on-card; one substantive hook per card.
 */

import type { OutreachContact, WorkEvidence } from './outreach'

/** The eight failure modes, public names (same taxonomy as the pre-mortem). */
export const BRIEF_CARD_FAILURE_MODES = [
  { key: 'workflow-reality', label: 'Workflow reality' },
  { key: 'route-around', label: 'Route-around' },
  { key: 'black-box', label: 'Black box' },
  { key: 'patient-burden', label: 'Patient burden' },
  { key: 'ops-complexity', label: 'Ops complexity' },
  { key: 'org-chart', label: 'Org-chart' },
  { key: 'shippable-path', label: 'Shippable path' },
  { key: 'data-layer', label: 'Data layer' },
] as const

export type BriefCardFailureModeKey = (typeof BRIEF_CARD_FAILURE_MODES)[number]['key']

const FAILURE_MODE_KEYS = new Set<string>(BRIEF_CARD_FAILURE_MODES.map((mode) => mode.key))

/**
 * Content that exists in the internal research but must never reach a card.
 * Deliberately broad: a false positive costs a regeneration; a false negative
 * costs trust with a prospect.
 */
const BANNED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /click(ed|s|ing)?\b/i, reason: 'email engagement (clicks)' },
  { pattern: /\bopen(ed|s)?\s+(our|the|this)?\s*(email|newsletter)/i, reason: 'email engagement (opens)' },
  { pattern: /newsletter\s+(reader|subscriber|engagement|item)/i, reason: 'subscriber behavior' },
  { pattern: /unsubscrib/i, reason: 'subscriber behavior' },
  { pattern: /layoff|laid off|headcount|staff cut|downsiz/i, reason: 'org distress' },
  { pattern: /funding (pressure|cut|squeeze)|budget (pressure|constraint|scrutin)/i, reason: 'org distress' },
  { pattern: /feasibility|warmth|call brief|our crm|lead score/i, reason: 'internal apparatus' },
]

export interface BriefCardReceipt {
  project: string
  metric: string
  detail: string
}

export interface BriefCardCopy {
  /** 1–2 short paragraphs: THEIR public situation, the single hook. */
  seeing: string[]
  /** On-card provenance line, e.g. "Sources: MITRE & CHAI public announcements". */
  sources: string
  /** The personalized pre-mortem question ("it's 18 months out…"). */
  premortemQuestion: string
  /** One-line "our bet" following the question. */
  premortemBet: string
  /** Exactly three failure-mode keys to elevate on the radar. */
  radarModes: BriefCardFailureModeKey[]
  /** One line under the radar tying the three modes to their situation. */
  radarCaption: string
}

export interface BriefCardData {
  name: string
  role?: string
  organization?: string
  copy: BriefCardCopy
  receipts: BriefCardReceipt[]
  offerTitle: string
  offerLine: string
  preparedLabel: string
}

/** Throws when text contains anything the policy bans from recipient-facing artifacts. */
export function assertBriefCardSafe(text: string, where: string): void {
  for (const { pattern, reason } of BANNED_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      throw new Error(
        `Brief card copy for ${where} contains banned content (${reason}: "${match[0]}"). Regenerate.`,
      )
    }
  }
}

export function buildBriefCardPrompts(
  contact: Pick<OutreachContact, 'name' | 'role' | 'organization' | 'segment'> & {
    researchSummary?: string
    proposedOffers?: Array<{ title?: string; oneLiner?: string }>
  },
): { system: string; user: string } {
  const modeList = BRIEF_CARD_FAILURE_MODES.map((mode) => `${mode.key} (${mode.label})`).join(', ')
  const system = [
    'You write recipient-facing copy for a designed one-page outreach brief card from GoInvo, a healthcare UX design studio. The recipient will read this page directly.',
    'HARD RULES — the personalization policy:',
    '- Use ONLY: the recipient\'s public professional work, their organization\'s public announcements/initiatives, and widely reported public facts. All of these appear in the research notes you are given.',
    '- NEVER mention or allude to: email/newsletter behavior (opens, clicks, subscriptions), organizational distress (layoffs, funding pressure, budget cuts), personal life, or how GoInvo gathered any information.',
    '- One substantive hook: pick the single most relevant public initiative/context and build everything around it. Do not stack multiple hooks.',
    '- Cite provenance in the `sources` line (organization names of the public sources, not URLs).',
    '- Voice: GoInvo — short declarative sentences, quiet confidence, zero flattery, zero urgency. Address the situation, not the person\'s ego.',
    '- If the research is too thin for a specific hook, write at the segment level ("organizations building X") — never guess specifics.',
    'Reply with ONLY a JSON object:',
    '{"seeing": [1-2 short paragraphs, strings], "sources": "Sources: …", "premortemQuestion": "It\'s 18 months out, and … What killed it?", "premortemBet": one line, "radarModes": [exactly 3 keys], "radarCaption": one line tying the three modes to their situation}',
    `Valid radarModes keys: ${modeList}.`,
  ].join('\n')

  const offers = (contact.proposedOffers || [])
    .map((offer) => `- ${offer.title}: ${offer.oneLiner}`)
    .join('\n')
  const user = [
    `Recipient: ${contact.name}${contact.role ? `, ${contact.role}` : ''}${contact.organization ? ` at ${contact.organization}` : ''}. Segment: ${contact.segment || 'unknown'}.`,
    '',
    'Internal research notes (contains material the policy bans from the card — extract only what is allowed):',
    contact.researchSummary || '(none)',
    '',
    'Tailored offers already drafted for this contact (the card will feature the first):',
    offers || '(none)',
  ].join('\n')

  return { system, user }
}

/** Validate + narrow the model's JSON into BriefCardCopy; throws on any violation. */
export function normalizeBriefCardCopy(parsed: unknown): BriefCardCopy {
  if (!parsed || typeof parsed !== 'object') throw new Error('Brief card copy must be a JSON object.')
  const record = parsed as Record<string, unknown>
  const seeing = Array.isArray(record.seeing)
    ? record.seeing.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).slice(0, 2)
    : []
  if (!seeing.length) throw new Error('Brief card copy needs at least one "seeing" paragraph.')
  const sources = typeof record.sources === 'string' ? record.sources.trim() : ''
  if (!sources) throw new Error('Brief card copy needs a sources line.')
  const premortemQuestion = typeof record.premortemQuestion === 'string' ? record.premortemQuestion.trim() : ''
  const premortemBet = typeof record.premortemBet === 'string' ? record.premortemBet.trim() : ''
  if (!premortemQuestion) throw new Error('Brief card copy needs a premortem question.')
  const radarModes = Array.isArray(record.radarModes)
    ? record.radarModes.filter((key): key is BriefCardFailureModeKey =>
        typeof key === 'string' && FAILURE_MODE_KEYS.has(key))
    : []
  if (radarModes.length !== 3) throw new Error('Brief card copy needs exactly 3 valid radarModes.')
  const radarCaption = typeof record.radarCaption === 'string' ? record.radarCaption.trim() : ''

  const copy: BriefCardCopy = { seeing, sources, premortemQuestion, premortemBet, radarModes, radarCaption }
  assertBriefCardSafe(JSON.stringify(copy), 'generated copy')
  return copy
}

/**
 * Receipts come from the research's evidence match, but the TEXT comes from the
 * published case-study extraction (public), never from the internal "why this
 * matters for them" reasoning.
 */
export function assembleBriefCardReceipts(
  relevantEvidence: Array<{ evidenceId?: string; title?: string }> | undefined,
  evidenceDocs: WorkEvidence[],
  max = 3,
): BriefCardReceipt[] {
  const byId = new Map(evidenceDocs.map((doc) => [doc._id, doc]))
  const receipts: BriefCardReceipt[] = []
  for (const entry of relevantEvidence || []) {
    if (receipts.length >= max) break
    const doc = entry.evidenceId ? byId.get(entry.evidenceId) : undefined
    if (!doc) continue
    const highlight = (doc.highlights || [])[0]
    receipts.push({
      project: [doc.title, doc.client].filter(Boolean).join(' · '),
      metric: highlight?.metric || '',
      detail: highlight?.detail || doc.summary?.split('. ')[0] || '',
    })
  }
  return receipts
}
