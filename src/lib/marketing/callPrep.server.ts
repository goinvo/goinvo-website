/**
 * Call prep, joined to the records: the server half of "prep Jane at Acme".
 *
 * `callPrep.ts` decides what an outline says and never touches a client. This
 * file reads the private records it needs — contacts, verified organisation
 * research, the live offer catalogue, the work evidence the offers cite — in
 * ONE query, hands them to the pure composer, and turns the result into the
 * two messages a caller reads before dialling.
 *
 * Two things are deliberately decided here rather than in the composer:
 *
 * - Contact details are pulled OUT of the outline before anything is rendered
 *   and returned separately (`contactDetails`). The blocks go into a channel;
 *   an email address or a phone number goes to the caller alone — inline in a
 *   DM, or as an ephemeral message in a channel — and it is the route that
 *   knows which. Keeping them out of the blocks here means no route can put
 *   them in a channel by forgetting to.
 * - Which buttons an outline carries. "Log how it went" only when there is a
 *   contact on file to log against; "Add them to outreach" only when there is
 *   nobody on file AND the add would actually produce a record (a free-mail
 *   address with no name is neither a name nor an organisation, and a button
 *   that can only fail is worse than none).
 *
 * No model call anywhere: every line of an outline comes from a field somebody
 * reviewed or from copy a person wrote once. Reads go through
 * `getOutreachClient`, pinned to the private dataset with the published
 * perspective, so a contact open in the Studio editor is read once, not twice.
 */
import 'server-only'
import type { SanityClient } from '@sanity/client'
import {
  buildCallOutlineMessages,
  buildPrepCandidatesBlocks,
  buildPrepListBlocks,
  composeCallOutline,
  newContactDocument,
  parsePrepRequest,
  resolvePrepTarget,
  type PrepCandidate,
  type PrepContact,
  type PrepEvidence,
  type PrepListEntry,
  type PrepOffer,
  type PrepRequest,
  type PrepResearch,
  type PrepTargetMatch,
} from './callPrep'
import { buildOutreachCallSheet } from './callSheet'
import { followUpLine, followUpOrganization, followUpPersonLabel, listFollowUps, type FollowUpEntry } from './followUps'
import { encodeContactRef, type ContactRef } from './marquetaActions'
import { rankCallPlan, type OutreachContact } from './outreach'
import { getOutreachClient } from './outreachClient.server'
import { escapeSlackText } from './slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

export type PrepDataContact = PrepContact & { researchSummary?: string | null }

export type PrepData = {
  contacts: PrepDataContact[]
  research: PrepResearch[]
  offers: PrepOffer[]
  evidence: PrepEvidence[]
}

/**
 * Everything an outline can draw on, in one round trip.
 *
 * - Contacts carry only their last five interactions (`[-5..-1]`): the outline
 *   reads the most recent touch and whether there was one; the whole history is
 *   the Studio's job and would multiply the payload by the size of the log.
 * - Research is verified only. Unverified research is not "why now" material,
 *   and the composer already refuses to read it out; not loading it keeps it
 *   from arriving by any other route.
 * - Offers are the active catalogue; evidence is what research matching uses
 *   (`status == "active"`), so an excluded case study is never named as proof.
 */
export const PREP_DATA_QUERY = `{
  "contacts": *[_type == "marketingContact" && !(_id in path("drafts.**"))]{
    _id, name, organization, role, segment, researchSuggestedSegment, warmth, status, owner, howWeKnow,
    email, phone, suggestedOpener, callBrief, researchReviewedAt, researchSummary, suggestedOfferKey,
    "relevantEvidence": relevantEvidence[]{ evidenceId, title, why },
    personVerified, identityConfidence, feasibilityScore,
    "channelOverrides": channelOverrides[]{ channel, state },
    lastContactedAt, followUpAt, nextStep,
    "interactions": interactions[-5..-1]{ _key, at, by, outcome, nextStep, statusAfter, channel }
  },
  "research": *[_type == "marketingOrgResearch" && verification.status == "verified" && !(_id in path("drafts.**"))]{
    organization, recentSignal, reachableAbout, suggestedOfferKey, context,
    verification{ status, evidence[]{ url, quote, textFragmentUrl } }
  },
  "offers": *[_type == "marketingOffer" && status == "active" && !(_id in path("drafts.**"))]{
    key, title, oneLiner, proofPoints, priceBand
  },
  "evidence": *[_type == "marketingWorkEvidence" && status == "active" && !(_id in path("drafts.**"))]{
    _id, title, client, businessOutcomes, "highlights": highlights[]{ metric, detail }
  }
}`

/**
 * Read the prep records. THROWS on a failed read — the callers below turn that
 * into a plain sentence, because an outline built from half the records would
 * look complete and not be.
 */
export async function loadPrepData(client: Pick<SanityClient, 'fetch'> = getOutreachClient()): Promise<PrepData> {
  const data = await client.fetch<Partial<PrepData> | null>(PREP_DATA_QUERY)
  return {
    contacts: (data?.contacts || []).filter((contact) => contact && contact._id),
    research: (data?.research || []).filter((entry) => entry && entry.organization),
    offers: (data?.offers || []).filter(Boolean),
    evidence: (data?.evidence || []).filter((item) => item && item._id),
  }
}

export type PrepReply =
  | {
      kind: 'outline'
      /** The message read before dialling. Never contains contact details. */
      first: Block[]
      /** The threaded follow-up: offer, voicemail, email draft, background. */
      second: Block[]
      text: string
      /** "Email: …" / "Phone: …" lines, for the caller to deliver privately. Never rendered into blocks. */
      contactDetails: string[]
      /** The contact the outline is about, when there is one on file. */
      contactId?: string
    }
  | { kind: 'candidates'; blocks: Block[]; text: string }
  | { kind: 'text'; text: string }

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

const NEED_SOMEONE =
  'Who is the call with? Give me a name or an organisation — for example `prep Sam Rivera at Acme`.'
const READ_FAILED = 'I couldn’t reach the outreach records just now. The Studio’s Outreach tab has the same information.'

/** Where "Open in Studio" goes. MUST name a view: an unknown or missing one restores whatever was open last. */
function outreachStudioUrl(): string | undefined {
  const base = clean(process.env.MARKETING_PUBLIC_BASE_URL).replace(/\/+$/, '')
  return /^https?:\/\//i.test(base) ? `${base}/studio/marketing?view=outreach` : undefined
}

/**
 * "Which one did you mean?" candidates, fit to post in a channel.
 *
 * A candidate is built from the record's own `name` and `organization`, and the
 * newsletter import put email addresses in both: "Someone at jane@acme.org" was
 * the label of one real candidate, and the same address rode in its Prep
 * button's value. Both go into the channel message, so both are scrubbed here
 * with the follow-up helpers (the same rules as every other label she posts).
 *
 * A candidate left with nothing to go on — no contact id, and an organisation
 * that WAS only an address — is dropped: its button would re-resolve nothing,
 * and its label would be an address with the address taken out. One with a
 * contact id keeps its button (the id finds the record) under a label that
 * says plainly there is no name on file.
 */
export function scrubPrepCandidates(candidates: PrepCandidate[] | null | undefined): PrepCandidate[] {
  const scrubbed: PrepCandidate[] = []
  for (const candidate of candidates || []) {
    if (!candidate) continue
    const contactId = clean(candidate.contactId)
    const organization = followUpOrganization(candidate.organization)
    if (!contactId && !organization) continue
    // "someone at jd@x.org, CMIO" loses the address and must not keep the "at".
    let label = followUpOrganization(candidate.label).replace(/\s+at\s*(?=,|$)/i, '')
    if (/^someone(?=,|$)/i.test(label)) {
      const role = label.replace(/^someone/i, '')
      label = organization ? `Someone at ${organization}${role}` : contactId ? `Someone with no name on file${role}` : ''
    }
    if (!label) label = contactId ? 'Someone with no name on file' : `Someone at ${organization}`
    scrubbed.push({ label, organization, ...(contactId ? { contactId } : {}) })
  }
  return scrubbed
}

/** A button's typed fields, read back as a request — the only record of somebody not on file. */
function requestFromRef(ref: ContactRef): PrepRequest {
  return {
    name: clean(ref.name),
    organization: clean(ref.organization),
    role: clean(ref.role),
    note: clean(ref.note),
    raw: [clean(ref.name), clean(ref.organization)].filter(Boolean).join(' at '),
  }
}

/**
 * The value for "Add them to outreach", or undefined when adding would write
 * nothing (no usable name and no organisation). Asked of `newContactDocument`
 * itself, so the button and the write can never disagree.
 */
function addRefFor(typed: { name?: string; organization?: string; role?: string; note?: string }, now: Date): string | undefined {
  const fields = {
    name: clean(typed.name),
    organization: clean(typed.organization),
    role: clean(typed.role),
    note: clean(typed.note),
  }
  if (!newContactDocument({ ...fields, ownerName: '', now })) return undefined
  return encodeContactRef(fields)
}

/**
 * The outline for one call, from what somebody typed or from a button.
 *
 * From a button (`ref`): a contact id is that contact; otherwise the typed
 * name and organisation the button carried are resolved again — the records
 * may have changed since the button was drawn. The request is NOT passed to
 * the composer in that case: it reads a request only for booking words
 * ("my meeting with…"), and a button carries none.
 *
 * From text: parsed, resolved, and the parsed request passed through, so
 * "prep me for my 3pm with Jane" is prepared as the call it is.
 *
 * Never throws; a failed read is answered in words.
 */
export async function prepCallFor(input: {
  text?: string
  ref?: ContactRef | null
  senderName: string
  now: Date
  /** Records already loaded by the caller; read here when absent. */
  data?: PrepData
}): Promise<PrepReply> {
  let data: PrepData
  try {
    data = input.data || (await loadPrepData())
  } catch (error) {
    console.error('[marqueta] prep read failed', error)
    return { kind: 'text', text: READ_FAILED }
  }

  let request: PrepRequest | null = null
  let match: PrepTargetMatch
  if (input.ref) {
    const ref = input.ref
    const onFile = ref.contactId ? data.contacts.find((contact) => contact._id === ref.contactId) : undefined
    if (onFile) {
      match = { kind: 'contact', contact: onFile }
    } else {
      const typed = requestFromRef(ref)
      if (!typed.name && !typed.organization) {
        return { kind: 'text', text: 'That contact is no longer on file. Ask me again by name and I’ll put an outline together.' }
      }
      match = resolvePrepTarget(typed, data.contacts, data.research)
    }
  } else {
    request = parsePrepRequest(input.text || '')
    if (!request.name && !request.organization) return { kind: 'text', text: NEED_SOMEONE }
    match = resolvePrepTarget(request, data.contacts, data.research)
  }

  if (match.kind === 'ambiguous') {
    const heading = 'Which one did you mean?'
    const blocks = buildPrepCandidatesBlocks(scrubPrepCandidates(match.candidates), heading)
    if (!blocks.length) return { kind: 'text', text: NEED_SOMEONE }
    return { kind: 'candidates', blocks, text: heading }
  }

  const composed = composeCallOutline({
    match,
    research: data.research,
    offers: data.offers,
    evidence: data.evidence,
    senderName: input.senderName,
    includeContactDetails: true,
    now: input.now,
    request,
  })
  // Out of the outline before anything renders it — see the header.
  const { contactDetails = [], ...outline } = composed

  const logRef = outline.contactId
    ? encodeContactRef({ contactId: outline.contactId, organization: outline.organization, name: outline.personLabel })
    : undefined

  let addRef: string | undefined
  if (!outline.contactId) {
    // Nobody on file: offer to add whoever was typed. An organisation that only
    // our research knows gets the same offer — otherwise there is no way to
    // log the call that follows.
    const typed = match.kind === 'none' ? match.request : request || (input.ref ? requestFromRef(input.ref) : null)
    const organization = match.kind === 'organization' ? match.organization : typed?.organization
    addRef = addRefFor({ name: typed?.name, organization, role: typed?.role, note: typed?.note }, input.now)
  }

  const messages = buildCallOutlineMessages(outline, { studioUrl: outreachStudioUrl(), logRef, addRef })
  return {
    kind: 'outline',
    first: messages.first,
    second: messages.second,
    text: messages.text,
    contactDetails: contactDetails.filter((line) => clean(line)),
    ...(outline.contactId ? { contactId: outline.contactId } : {}),
  }
}

const REPLIED = new Set(['responded', 'meeting', 'opportunity'])
const KNOWS_US = new Set(['hot', 'warm', 'cool'])

function temperatureOf(contact: Pick<PrepContact, 'status' | 'warmth'> | undefined): PrepListEntry['temperature'] {
  if (REPLIED.has(clean(contact?.status))) return 'replied'
  if (KNOWS_US.has(clean(contact?.warmth).toLowerCase())) return 'knowsUs'
  return 'cold'
}

const TEMPERATURE_ORDER: Record<PrepListEntry['temperature'], number> = { replied: 0, knowsUs: 1, cold: 2 }

/** "Jane Doe (MGB)" or "someone at MGB" — scrubbed of contact details by the follow-up helpers. */
function listLabel(contact: { name?: string | null; email?: string | null; organization?: string | null }): {
  label: string
  organization: string
} {
  const organization = followUpOrganization(contact.organization)
  const person = followUpPersonLabel({ name: contact.name, email: contact.email, organization: contact.organization })
  const named = !/^someone\b/i.test(person)
  return { label: named && organization ? `${person} (${organization})` : person, organization }
}

/** A follow-up's detail line without its temperature, which the list renders itself. */
function followUpDetail(entry: FollowUpEntry, now: Date): string {
  const parts = followUpLine(entry, now).detail.split(' · ')
  parts.pop()
  return `Follow-up ${parts.join(' · ')}`.trim()
}

/**
 * "Who should I call?" — follow-ups first (the people who replied at the top),
 * then contacts whose research a person approved and who are ready for a first
 * call, then the organisations verified research gives us a reason to call.
 * One line per contact, however many lists they are on.
 *
 * With `personName`, it is that person's list: their own follow-ups and
 * contacts plus anything nobody owns — never a colleague's follow-up, which is
 * how two people end up ringing the same prospect in one afternoon.
 *
 * The list is passed whole to the builder, which shows eight and counts the
 * rest, so "and 12 more on file" is a true number. Never throws.
 */
export async function prepCallList(input: {
  now: Date
  resolveOwner?: (raw: string) => string
  personName?: string
  /** The working mention for Marqueta (`marquetaHandle(botUserId)`), used in the "not on file" hint. */
  handle?: string
  data?: PrepData
}): Promise<{ blocks: Block[]; text: string }> {
  let data: PrepData
  try {
    data = input.data || (await loadPrepData())
  } catch (error) {
    console.error('[marqueta] call list read failed', error)
    return { blocks: [], text: READ_FAILED }
  }

  const resolve = (raw: string) => clean(input.resolveOwner ? input.resolveOwner(raw) : raw)
  const person = clean(input.personName).toLowerCase()
  const mineOrNobody = (owner: string | null | undefined) => {
    if (!person) return true
    const name = clean(owner) ? resolve(clean(owner)).toLowerCase() : ''
    return !name || name === person
  }

  const entries: PrepListEntry[] = []
  const listed = new Set<string>()
  const add = (entry: PrepListEntry) => {
    if (!entry.contactId || listed.has(entry.contactId)) return
    listed.add(entry.contactId)
    entries.push(entry)
  }

  // 1. Follow-ups: promises already made. Warmest first, overdue first within each.
  const followUps = listFollowUps(data.contacts, { now: input.now, resolveOwner: input.resolveOwner })
    .filter((entry) => !person || !entry.ownerName || entry.ownerName.toLowerCase() === person)
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => TEMPERATURE_ORDER[a.entry.temperature] - TEMPERATURE_ORDER[b.entry.temperature] || a.index - b.index)
    .map(({ entry }) => entry)
  for (const entry of followUps) {
    const where = entry.organization
    const named = !/^someone\b/i.test(entry.personLabel)
    add({
      label: named && where ? `${entry.personLabel} (${where})` : entry.personLabel,
      temperature: entry.temperature,
      detail: followUpDetail(entry, input.now),
      contactId: entry.contactId,
      organization: where,
    })
  }

  // 2. Ready for a first call: research reviewed by a person, identity confirmed.
  const ready = rankCallPlan(data.contacts as unknown as OutreachContact[], { limit: 20 }) as unknown as PrepContact[]
  for (const contact of ready) {
    if (!mineOrNobody(contact.owner)) continue
    const { label, organization } = listLabel(contact)
    const role = followUpOrganization(contact.role)
    add({
      label,
      temperature: temperatureOf(contact),
      detail: [role, 'reviewed brief — ready for a first call'].filter(Boolean).join(' · '),
      contactId: contact._id,
      organization,
    })
  }

  // 3. A verified reason to call an organisation we have people at.
  const byId = new Map(data.contacts.map((contact) => [contact._id, contact]))
  const sheet = buildOutreachCallSheet({
    research: data.research,
    contacts: data.contacts.filter((contact) => mineOrNobody(contact.owner)),
    offers: data.offers,
    limit: 5,
  })
  for (const entry of sheet) {
    const first = entry.contacts.find((contact) => contact._id && !listed.has(contact._id))
    const contact = first?._id ? byId.get(first._id) : undefined
    if (!contact) continue
    const { label, organization } = listLabel(contact)
    add({
      label,
      temperature: temperatureOf(contact),
      detail: `Why now: ${clean(entry.signal).slice(0, 240)}`,
      contactId: contact._id,
      organization: organization || followUpOrganization(entry.organization),
    })
  }

  const who = clean(input.personName)
  const blocks = buildPrepListBlocks(entries, {
    heading: who ? `*Calls for ${who}*` : '*Calls worth making*',
    handle: clean(input.handle) || 'me',
  })
  const text = entries.length
    ? `${entries.length} ${entries.length === 1 ? 'call' : 'calls'} worth making${who ? ` for ${escapeSlackText(who)}` : ''}.`
    : 'Nobody is on the call list right now.'
  return { blocks, text }
}

export type AddContactResult =
  | { ok: true; contactId: string; label: string; created: boolean; message: string }
  | { ok: false; message: string }

/**
 * Put somebody first mentioned in Slack into outreach.
 *
 * `newContactDocument` decides what is stored (only what was typed; no email,
 * phone or segment) and the deterministic id, so a double press or a Slack
 * retry finds the record the first press made instead of writing a twin. The
 * record is looked up before it is created only so the reply can say "already
 * there" honestly; `createIfNotExists` is what makes the write safe.
 */
export async function addContactFromSlack(input: {
  ref: ContactRef
  ownerName: string
  now: Date
}): Promise<AddContactResult> {
  const { ref } = input
  try {
    const client = getOutreachClient()
    if (clean(ref.contactId)) {
      const existing = await client.fetch<{ _id: string; name?: string; email?: string; organization?: string } | null>(
        `*[_type == "marketingContact" && _id == $id][0]{ _id, name, email, organization }`,
        { id: clean(ref.contactId) },
      )
      if (existing) {
        const { label } = listLabel(existing)
        return { ok: true, contactId: existing._id, label, created: false, message: `${label} is already in outreach.` }
      }
    }

    const document = newContactDocument({
      name: ref.name,
      organization: ref.organization,
      role: ref.role,
      note: ref.note,
      ownerName: input.ownerName,
      now: input.now,
    })
    if (!document) return { ok: false, message: 'Tell me a name or an organisation.' }
    const contactId = String(document._id)
    const { label } = listLabel({ name: document.name as string, organization: document.organization as string })

    const existing = await client.fetch<{ _id: string } | null>(`*[_id == $id][0]{ _id }`, { id: contactId })
    if (existing) return { ok: true, contactId, label, created: false, message: `${label} is already in outreach.` }

    await client.createIfNotExists(document as { _id: string; _type: string })
    return { ok: true, contactId, label, created: true, message: `Added ${label} to outreach.` }
  } catch (error) {
    console.error('[marqueta] add contact failed', error)
    return { ok: false, message: 'I couldn’t add them just now. The Studio’s Outreach tab can.' }
  }
}
