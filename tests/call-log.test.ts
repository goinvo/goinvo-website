import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  alreadyLogged,
  buildCallLogReceiptBlocks,
  buildCallLogUndoneBlocks,
  buildCallLogUndoWrite,
  buildCallLogView,
  buildContactLogWrite,
  buildQuickCallLog,
  callLogReceiptLine,
  CALL_OUTCOMES,
  confirmationPrompt,
  needsConfirmation,
  FOLLOW_UP_CHOICES,
  guessCallOutcome,
  isCallOutcomeKey,
  quickLogIsReversible,
  readCallLogSubmission,
  resolveFollowUpDays,
  resolveStatusAfter,
  type CallOutcomeKey,
  type ContactLogContact,
  type ContactLogWrite,
} from '@/lib/marketing/callLog'
import {
  CALL_FOLLOW_UP_BLOCK,
  CALL_FOLLOW_UP_INPUT,
  CALL_LOG_CALLBACK,
  CALL_LOG_UNDO_CLOSE_REASON_MAX,
  CALL_NOTES_BLOCK,
  CALL_NOTES_INPUT,
  CALL_OUTCOME_BLOCK,
  CALL_OUTCOME_INPUT,
  decodeCallLogUndo,
  encodeCallLogMetadata,
  encodeCallLogUndo,
  MARQUETA_ACTION,
  type CallLogUndo,
} from '@/lib/marketing/marquetaActions'
import { buildInteractionEntry } from '@/lib/marketing/outreach'
import { LOG_STATUS_VALUES } from '@/lib/marketing/outreachEnums'

import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = { _id: string } & Record<string, any>

const NOW = new Date('2026-09-24T15:00:00.000Z')
const AT = NOW.toISOString()
const inDays = (days: number) => new Date(NOW.getTime() + days * 86400000).toISOString()

/**
 * The Studio's `saveLog` exactly as it was before the refactor (HEAD at
 * 384c452), with the component state lifted into arguments. `Date.now()` for
 * the follow-up became `now`, and the interaction key is passed so the two
 * entries can be compared byte for byte; nothing else changed. The refactored
 * builder must agree with this on every branch.
 */
function legacySaveLog(
  contact: ContactLogContact,
  form: {
    logStatus: string
    logOutcome: string
    logIntel: string
    logNextStep: string
    logFollowUpDays: number | null
    logChannel: string
    numericValue: number | undefined
    selectedOfferKey?: string
    selectedOfferTitle?: string
    evidenceIds: string[]
    by?: string
  },
  now: Date,
  key: string,
) {
  const { logStatus, logOutcome, logIntel, logNextStep, logFollowUpDays, logChannel, numericValue } = form
  const { selectedOfferKey, selectedOfferTitle, evidenceIds } = form
  const at = now.toISOString()
  const terminal = ['won', 'lost', 'closed'].includes(logStatus)
  const entry = buildInteractionEntry({
    key,
    at,
    by: form.by,
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
    set.followUpAt = new Date(now.getTime() + logFollowUpDays * 86400000).toISOString()
  }
  const unset: string[] = []
  if (terminal || !logNextStep.trim()) unset.push('nextStep')
  if (terminal || logFollowUpDays === null) unset.push('followUpAt')
  if (!terminal && (contact.closedAt || typeof contact.closedValue === 'number' || contact.closeReason)) {
    unset.push('closedAt', 'closedValue', 'closeReason')
  }
  return { set, unset, entry, ifRevisionId: contact._rev || undefined }
}

/** What Sanity does with setIfMissing → set → unset → insert after interactions[-1]. */
function applyWrite(doc: Doc, write: Pick<ContactLogWrite, 'set' | 'unset' | 'entry'>): Doc {
  const next: Doc = structuredClone(doc)
  if (!next.interactions) next.interactions = []
  Object.assign(next, structuredClone(write.set))
  for (const field of write.unset) delete next[field]
  next.interactions.push(structuredClone(write.entry))
  return next
}

function applyUndo(doc: Doc, undo: { set: Record<string, unknown>; unset: string[]; removeKey: string }): Doc {
  const next: Doc = structuredClone(doc)
  Object.assign(next, structuredClone(undo.set))
  for (const field of undo.unset) delete next[field]
  next.interactions = (next.interactions || []).filter((interaction: Doc) => interaction._key !== undo.removeKey)
  return next
}

const CLOSED_FIELDS = ['closedAt', 'closedValue', 'closeReason']
const pick = (doc: Doc, fields: string[]) => Object.fromEntries(fields.map((field) => [field, doc[field]]))

describe('the outcomes', () => {
  it('has the eight outcomes, with the status, channel and follow-up each implies', () => {
    expect(CALL_OUTCOMES.map((outcome) => [outcome.key, outcome.status, outcome.channel, outcome.defaultFollowUpDays, outcome.progress])).toEqual([
      ['noAnswer', 'contacted', 'phone', 2, true],
      ['voicemail', 'contacted', 'phone', 3, true],
      ['emailed', 'contacted', 'email', 5, true],
      ['referred', 'contacted', 'phone', null, true],
      ['notNow', 'dormant', 'phone', 60, false],
      ['interested', 'responded', 'phone', 3, true],
      ['meeting', 'meeting', 'phone', 1, true],
      ['notAFit', 'closed', 'phone', null, false],
    ])
    expect(CALL_OUTCOMES.map((outcome) => outcome.label)).toEqual([
      'No answer',
      'Left a voicemail',
      'Sent an email',
      'Pointed me to someone else',
      'Talked — not right now',
      'Talked — interested',
      'Meeting booked',
      'Not a fit',
    ])
    for (const outcome of CALL_OUTCOMES) {
      expect(outcome.label.length).toBeLessThanOrEqual(75)
      expect(LOG_STATUS_VALUES).toContain(outcome.status)
    }
  })

  it('recognises its own keys and nothing else', () => {
    for (const outcome of CALL_OUTCOMES) expect(isCallOutcomeKey(outcome.key)).toBe(true)
    for (const value of ['', 'NoAnswer', 'won', undefined, null, 3, {}]) expect(isCallOutcomeKey(value)).toBe(false)
  })

  it('offers follow-up choices whose default defers to the outcome', () => {
    expect(FOLLOW_UP_CHOICES.map((choice) => choice.value)).toEqual(['default', '2', '7', '14', '30', 'none'])
    expect(FOLLOW_UP_CHOICES[0].label).toBe('When the outcome suggests')
    expect(resolveFollowUpDays('voicemail', 'default')).toBe(3)
    expect(resolveFollowUpDays('voicemail', undefined)).toBe(3)
    expect(resolveFollowUpDays('voicemail', 'nonsense')).toBe(3)
    expect(resolveFollowUpDays('voicemail', '14')).toBe(14)
    expect(resolveFollowUpDays('voicemail', 'none')).toBeNull()
    expect(resolveFollowUpDays('referred', 'default')).toBeNull()
    expect(resolveFollowUpDays('referred', '7')).toBe(7)
  })
})

describe('resolveStatusAfter', () => {
  it('never moves a contact down the pipeline on a progress outcome', () => {
    expect(resolveStatusAfter('meeting', 'contacted', true)).toBe('meeting')
    expect(resolveStatusAfter('opportunity', 'responded', true)).toBe('opportunity')
    expect(resolveStatusAfter('responded', 'meeting', true)).toBe('meeting')
    expect(resolveStatusAfter('contacted', 'contacted', true)).toBe('contacted')
  })

  it('moves new, reviewed and unknown contacts up to the outcome', () => {
    for (const current of [undefined, '', 'new', 'needsReview', 'researched', 'briefed', 'somethingOdd']) {
      expect(resolveStatusAfter(current, 'contacted', true)).toBe('contacted')
    }
  })

  it('reopens lost, closed and dormant contacts on a progress outcome', () => {
    expect(resolveStatusAfter('lost', 'responded', true)).toBe('responded')
    expect(resolveStatusAfter('closed', 'contacted', true)).toBe('contacted')
    expect(resolveStatusAfter('dormant', 'meeting', true)).toBe('meeting')
  })

  it('takes an explicit disposition at its word', () => {
    expect(resolveStatusAfter('opportunity', 'dormant', false)).toBe('dormant')
    expect(resolveStatusAfter('meeting', 'closed', false)).toBe('closed')
    expect(resolveStatusAfter('lost', 'closed', false)).toBe('closed')
  })

  it('treats Won as absorbing for every outcome', () => {
    for (const outcome of CALL_OUTCOMES) {
      expect(resolveStatusAfter('won', outcome.status, outcome.progress)).toBe('won')
    }
  })
})

describe('buildContactLogWrite — the Studio log, byte for byte', () => {
  const base = (overrides: Partial<Parameters<typeof buildContactLogWrite>[0]> = {}) =>
    buildContactLogWrite({
      contact: { _id: 'c1', _rev: 'rev-1' },
      at: AT,
      by: 'Sam',
      statusAfter: 'contacted',
      channel: 'phone',
      outcome: '  Talked to Jane  ',
      intel: '',
      nextStep: '',
      followUpDays: 7,
      now: NOW,
      key: 'int-1',
      ...overrides,
    })

  it('closes a Won: value, date and reason set; next step and follow-up cleared', () => {
    const write = base({ statusAfter: 'won', value: 120000, nextStep: 'Send SOW', followUpDays: 7, outcome: ' Signed ' })
    expect(write.set).toEqual({
      status: 'won',
      lastContactedAt: AT,
      attributionChannel: 'phone',
      closedValue: 120000,
      closedAt: AT,
      closeReason: 'Signed',
    })
    expect(write.unset).toEqual(['nextStep', 'followUpAt'])
    expect(write.entry).toMatchObject({ _key: 'int-1', statusAfter: 'won', value: 120000, outcome: 'Signed', nextStep: undefined })
    expect(write.terminal).toBe(true)
    expect(write.followUpAt).toBeUndefined()
    expect(write.ifRevisionId).toBe('rev-1')
  })

  it('closes a Lost at a value of zero, keeping any estimate apart', () => {
    const write = base({ statusAfter: 'lost', value: 5000, outcome: 'Went with a vendor' })
    expect(write.set).toEqual({
      status: 'lost',
      lastContactedAt: AT,
      attributionChannel: 'phone',
      estimatedValue: 5000,
      closedValue: 0,
      closedAt: AT,
      closeReason: 'Went with a vendor',
    })
    expect(write.unset).toEqual(['nextStep', 'followUpAt'])
    expect(write.terminal).toBe(true)
  })

  it('closes a Closed with no value at all', () => {
    const write = base({ statusAfter: 'closed', outcome: 'No fit' })
    expect(write.set).toEqual({ status: 'closed', lastContactedAt: AT, attributionChannel: 'phone', closedAt: AT, closeReason: 'No fit' })
    expect(write.unset).toEqual(['nextStep', 'followUpAt'])
  })

  it('omits the close reason when there is no outcome text', () => {
    expect(base({ statusAfter: 'closed', outcome: '   ' }).set).not.toHaveProperty('closeReason')
  })

  it('sheds stale closed fields when a non-terminal log reopens a contact', () => {
    const write = base({
      contact: { _id: 'c1', status: 'lost', closedAt: '2026-01-01T00:00:00Z', closedValue: 0, closeReason: 'Budget' },
      statusAfter: 'responded',
    })
    expect(write.unset).toEqual(['nextStep', 'closedAt', 'closedValue', 'closeReason'])
    expect(write.terminal).toBe(false)
    expect(write.ifRevisionId).toBeUndefined()
    // A closed value of 0 alone is enough — it is a number, not a blank.
    expect(base({ contact: { _id: 'c1', closedValue: 0 } }).unset).toContain('closedValue')
    expect(base({ contact: { _id: 'c1' } }).unset).not.toContain('closedAt')
  })

  it('keeps a next step when one is given and clears it when the field is empty', () => {
    const withStep = base({ nextStep: '  Send the deck  ' })
    expect(withStep.set.nextStep).toBe('Send the deck')
    expect(withStep.unset).not.toContain('nextStep')
    expect(withStep.entry.nextStep).toBe('Send the deck')
    const without = base({ nextStep: '' })
    expect(without.set).not.toHaveProperty('nextStep')
    expect(without.unset).toContain('nextStep')
  })

  it('sets a follow-up N days out, or clears it for "no follow-up"', () => {
    const inAWeek = base({ followUpDays: 7 })
    expect(inAWeek.set.followUpAt).toBe(inDays(7))
    expect(inAWeek.followUpAt).toBe(inDays(7))
    expect(inAWeek.unset).not.toContain('followUpAt')
    const none = base({ followUpDays: null })
    expect(none.set).not.toHaveProperty('followUpAt')
    expect(none.unset).toContain('followUpAt')
    expect(none.followUpAt).toBeUndefined()
  })

  it('records offer and evidence attribution only when chosen, deduped and capped', () => {
    const ids = ['e1', 'e1', ...Array.from({ length: 12 }, (_, i) => `e${i + 2}`)]
    const write = base({ offerKey: 'ai-pilot-premortem', offerTitle: 'Pre-mortem', evidenceIds: ids })
    expect(write.set.attributedOfferKey).toBe('ai-pilot-premortem')
    expect(write.set.attributedOfferTitle).toBe('Pre-mortem')
    expect(write.set.attributedEvidenceIds).toEqual(['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10'])
    expect(base().set).not.toHaveProperty('attributedEvidenceIds')
  })

  it('uses a random interaction key when none is passed, as the Studio always has', () => {
    const write = base({ key: undefined })
    expect(String(write.entry._key)).toMatch(/^int-\d+-[a-z0-9]+$/)
  })

  it('agrees with the pre-refactor handler on every branch', () => {
    const contacts: ContactLogContact[] = [
      { _id: 'c1', _rev: 'r1', status: 'contacted' },
      { _id: 'c2', status: 'lost', closedAt: '2026-01-01T00:00:00Z', closedValue: 0, closeReason: 'Budget' },
      { _id: 'c3', status: 'dormant', closedValue: 0 },
    ]
    let compared = 0
    for (const contact of contacts) {
      for (const logStatus of LOG_STATUS_VALUES) {
        for (const logNextStep of ['', '  Send the deck  ']) {
          for (const logFollowUpDays of [null, 7]) {
            for (const numericValue of [undefined, 0, 50000]) {
              for (const offer of [{}, { selectedOfferKey: 'k', selectedOfferTitle: 'Offer' }]) {
                for (const evidenceIds of [[], ['e1', 'e2']]) {
                  const form = {
                    logStatus,
                    logOutcome: '  Talked it through  ',
                    logIntel: ' They run pilots quarterly ',
                    logNextStep,
                    logFollowUpDays,
                    logChannel: 'email',
                    numericValue,
                    evidenceIds,
                    by: 'Sam',
                    ...offer,
                  }
                  const legacy = legacySaveLog(contact, form, NOW, 'int-fixed')
                  const write = buildContactLogWrite({
                    contact,
                    at: AT,
                    by: form.by,
                    statusAfter: logStatus,
                    channel: form.logChannel,
                    outcome: form.logOutcome,
                    intel: form.logIntel,
                    nextStep: logNextStep,
                    offerKey: form.selectedOfferKey,
                    offerTitle: form.selectedOfferTitle,
                    evidenceIds,
                    value: numericValue,
                    followUpDays: logFollowUpDays,
                    now: NOW,
                    key: 'int-fixed',
                  })
                  expect(JSON.stringify(write.set)).toBe(JSON.stringify(legacy.set))
                  expect(write.unset).toEqual(legacy.unset)
                  expect(JSON.stringify(write.entry)).toBe(JSON.stringify(legacy.entry))
                  expect(write.ifRevisionId).toBe(legacy.ifRevisionId)
                  expect(write.terminal).toBe(['won', 'lost', 'closed'].includes(logStatus))
                  compared++
                }
              }
            }
          }
        }
      }
    }
    expect(compared).toBe(3 * 8 * 2 * 2 * 3 * 2 * 2)
  })
})

describe('the Studio calls the shared builder', () => {
  const source = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')
  const saveLog = source.slice(source.indexOf('const saveLog = async (contact'), source.indexOf('// ---- Contact editing'))

  it('builds its patch with buildContactLogWrite and keeps the patch chain in order', () => {
    expect(saveLog.length).toBeGreaterThan(100)
    expect(saveLog).toContain('buildContactLogWrite({')
    expect(saveLog).not.toContain('buildInteractionEntry(')
    const order = [
      ".setIfMissing({ interactions: [] })",
      '.set(write.set)',
      'patch.unset(write.unset)',
      'patch.ifRevisionId(write.ifRevisionId)',
      ".insert('after', 'interactions[-1]', [write.entry])",
      '.commit()',
    ].map((needle) => saveLog.indexOf(needle))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('keeps every validation message', () => {
    expect(saveLog).toContain('Describe what happened before saving this interaction.')
    expect(saveLog).toContain('Opportunity value must be a non-negative number.')
    expect(saveLog).toContain('Enter the actual closed value before marking an opportunity Won.')
    expect(saveLog).toContain("fail(err, 'Could not save the call log.')")
  })
})

describe('buildQuickCallLog', () => {
  const contact = (overrides: Partial<ContactLogContact> = {}): ContactLogContact => ({
    _id: 'marketingContact.jane',
    _rev: 'rev-9',
    status: 'contacted',
    lastContactedAt: '2026-09-10T14:00:00.000Z',
    followUpAt: '2026-09-20T14:00:00.000Z',
    attributionChannel: 'email',
    nextStep: 'Send the pre-mortem kit',
    interactions: [{ _key: 'int-earlier' }],
    ...overrides,
  })
  const quick = (outcomeKey: CallOutcomeKey, overrides: Partial<Parameters<typeof buildQuickCallLog>[0]> = {}) =>
    buildQuickCallLog({ contact: contact(), outcomeKey, by: 'Sam', now: NOW, key: 'slack-V123', ...overrides })

  it('logs a voicemail: contacted, phone, three days out (off the weekend), next step carried forward', () => {
    const write = quick('voicemail', { notes: '  Mentioned the kit  ' })
    expect(write.statusAfter).toBe('contacted')
    expect(write.outcomeLabel).toBe('Left a voicemail')
    // Three days from Thursday is Sunday: the follow-up lands on Monday.
    expect(write.set).toEqual({
      status: 'contacted',
      lastContactedAt: AT,
      attributionChannel: 'phone',
      nextStep: 'Send the pre-mortem kit',
      followUpAt: inDays(4),
    })
    expect(write.unset).toEqual([])
    expect(write.followUpAt).toBe(inDays(4))
    expect(write.ifRevisionId).toBe('rev-9')
    expect(write.entry).toMatchObject({
      _key: 'slack-V123',
      at: AT,
      by: 'Sam',
      outcome: 'Left a voicemail',
      intel: 'Mentioned the kit',
      statusAfter: 'contacted',
      channel: 'phone',
    })
  })

  it('records an email on the email channel', () => {
    const write = quick('emailed')
    expect(write.set.attributionChannel).toBe('email')
    expect(write.entry.channel).toBe('email')
    expect(write.followUpAt).toBe(inDays(5))
  })

  it('does not demote a contact already further along', () => {
    const write = quick('noAnswer', { contact: contact({ status: 'meeting' }) })
    expect(write.statusAfter).toBe('meeting')
    expect(write.set.status).toBe('meeting')
    // Two days from Thursday is Saturday: Monday.
    expect(write.followUpAt).toBe(inDays(4))
  })

  it('honours the follow-up choice over the outcome default', () => {
    expect(quick('voicemail', { followUp: '14' }).followUpAt).toBe(inDays(14))
    expect(quick('voicemail', { followUp: 'none' }).unset).toContain('followUpAt')
    expect(quick('voicemail', { followUp: 'none' }).set).not.toHaveProperty('followUpAt')
    expect(quick('referred').unset).toContain('followUpAt')
    expect(quick('notNow').statusAfter).toBe('dormant')
    expect(quick('notNow').followUpAt).toBe(inDays(60))
    expect(quick('meeting').followUpAt).toBe(inDays(1))
  })

  it('does not erase a next step it had no field to change', () => {
    const noStep = quick('voicemail', { contact: contact({ nextStep: undefined }) })
    expect(noStep.set).not.toHaveProperty('nextStep')
    expect(noStep.unset).toContain('nextStep')
  })

  it('closes on "Not a fit", saying who judged it and where', () => {
    const write = quick('notAFit', { notes: 'They build in-house' })
    expect(write.statusAfter).toBe('closed')
    expect(write.terminal).toBe(true)
    expect(write.set).toEqual({
      status: 'closed',
      lastContactedAt: AT,
      attributionChannel: 'phone',
      closedAt: AT,
      closeReason: 'Not a fit (logged in Slack by Sam): They build in-house',
    })
    expect(write.unset).toEqual(['nextStep', 'followUpAt'])
    expect(write.entry.outcome).toBe('Not a fit')
    expect(write.entry.intel).toBe('They build in-house')
    expect(quick('notAFit').set.closeReason).toBe('Not a fit (logged in Slack by Sam)')
  })

  it('leaves a Won untouched but for the touch itself, for all eight outcomes', () => {
    const won = contact({
      status: 'won',
      closedAt: '2026-08-01T12:00:00.000Z',
      closedValue: 120000,
      closeReason: 'Signed the SOW',
      followUpAt: undefined,
      nextStep: undefined,
    })
    for (const outcome of CALL_OUTCOMES) {
      const write = quick(outcome.key, { contact: won, notes: 'Checked in' })
      expect(write.statusAfter).toBe('won')
      expect(write.set).toEqual({ lastContactedAt: AT })
      expect(write.unset).toEqual([])
      expect(write.followUpAt).toBeUndefined()
      expect(write.entry).toMatchObject({ statusAfter: 'won', outcome: outcome.label, intel: 'Checked in', channel: outcome.channel })
      const after = applyWrite(won, write)
      expect(JSON.stringify(pick(after, CLOSED_FIELDS))).toBe(JSON.stringify(pick(won, CLOSED_FIELDS)))
      expect(after.status).toBe('won')
    }
  })

  it('records only the touch on a Closed contact that stays Closed', () => {
    const closed = contact({ status: 'closed', closedAt: '2026-06-01T00:00:00.000Z', closeReason: 'No budget' })
    const write = quick('notAFit', { contact: closed })
    expect(write.set).toEqual({ lastContactedAt: AT })
    expect(write.unset).toEqual([])
  })

  it('reopens a Lost contact on interest and sheds its closed fields', () => {
    const lost = contact({ status: 'lost', closedAt: '2026-05-01T00:00:00.000Z', closedValue: 0, closeReason: 'Budget' })
    const write = quick('interested', { contact: lost })
    expect(write.statusAfter).toBe('responded')
    expect(write.set.status).toBe('responded')
    expect(write.unset).toEqual(expect.arrayContaining(['closedAt', 'closedValue', 'closeReason']))
    expect(write.followUpAt).toBe(inDays(4))
    const after = applyWrite(lost, write)
    for (const field of CLOSED_FIELDS) expect(after).not.toHaveProperty(field)
    expect(quick('noAnswer', { contact: lost }).statusAfter).toBe('contacted')
  })

  it('carries the prior values and the entry key for Undo', () => {
    const write = quick('voicemail', { key: `  ${'k'.repeat(200)}  ` })
    expect(write.undo).toEqual({
      contactId: 'marketingContact.jane',
      interactionKey: 'k'.repeat(120),
      prior: {
        status: 'contacted',
        followUpAt: '2026-09-20T14:00:00.000Z',
        lastContactedAt: '2026-09-10T14:00:00.000Z',
        attributionChannel: 'email',
        nextStep: 'Send the pre-mortem kit',
      },
    })
    expect(write.entry._key).toBe(write.undo.interactionKey)
    const blank = quick('voicemail', { contact: { _id: 'c-blank' } }).undo.prior
    expect(blank).toEqual({ status: '', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' })
  })

  it('clips very long notes', () => {
    const write = quick('interested', { notes: 'x'.repeat(5000) })
    expect(String(write.entry.intel).length).toBe(2000)
  })

  it('accepts null fields straight from a GROQ projection', () => {
    const fromGroq = {
      _id: 'c1',
      _rev: null,
      status: null,
      closedAt: null,
      closedValue: null,
      closeReason: null,
      followUpAt: null,
      lastContactedAt: null,
      attributionChannel: null,
      nextStep: null,
      interactions: null,
    }
    const write = quick('voicemail', { contact: fromGroq })
    expect(write.statusAfter).toBe('contacted')
    expect(write.unset).toEqual(['nextStep'])
    expect(write.ifRevisionId).toBeUndefined()
  })
})

describe('follow-ups never land on a weekend (Slack only)', () => {
  const contact: ContactLogContact = { _id: 'c1', status: 'contacted' }
  const on = (iso: string, outcomeKey: CallOutcomeKey, followUp?: string) =>
    buildQuickCallLog({ contact, outcomeKey, followUp, by: 'Sam', now: new Date(iso), key: 'k' }).followUpAt

  it('moves a Saturday or Sunday to the Monday, in the studio’s time zone', () => {
    // Thursday voicemail → three days → Sunday → Monday 28 Sep.
    expect(on('2026-09-24T15:00:00.000Z', 'voicemail')).toBe('2026-09-28T15:00:00.000Z')
    // Thursday no answer → two days → Saturday → Monday.
    expect(on('2026-09-24T15:00:00.000Z', 'noAnswer')).toBe('2026-09-28T15:00:00.000Z')
    // Friday "in a week" is a Friday: left alone.
    expect(on('2026-09-25T15:00:00.000Z', 'voicemail', '7')).toBe('2026-10-02T15:00:00.000Z')
    // 11pm Thursday in Boston is 3am Friday UTC: three days on is Sunday night in Boston, so Monday.
    expect(on('2026-09-25T03:00:00.000Z', 'voicemail')).toBe('2026-09-29T03:00:00.000Z')
  })

  it('leaves the Studio’s own builder exactly as it was', () => {
    const write = buildContactLogWrite({ contact, at: AT, statusAfter: 'contacted', channel: 'phone', followUpDays: 3, now: NOW })
    expect(write.followUpAt).toBe(inDays(3))
  })
})

describe('needsConfirmation', () => {
  it('asks before an outcome sets a contact aside or back', () => {
    // "keen but after the budget" reads as not right now: a contact who
    // replied must not drop to Dormant in one press.
    expect(needsConfirmation({ status: 'responded' }, 'notNow')).toBe(true)
    expect(needsConfirmation({ status: 'new' }, 'notNow')).toBe(true)
    expect(needsConfirmation({ status: 'contacted' }, 'notAFit')).toBe(true)
    expect(needsConfirmation({ status: 'meeting' }, 'notAFit')).toBe(true)
  })

  it('does not ask when the log can only help, or changes nothing', () => {
    for (const outcome of ['noAnswer', 'voicemail', 'emailed', 'referred', 'interested', 'meeting'] as const) {
      expect(needsConfirmation({ status: 'researched' }, outcome), outcome).toBe(false)
      expect(needsConfirmation({ status: 'meeting' }, outcome), outcome).toBe(false)
    }
    expect(needsConfirmation({ status: 'dormant' }, 'notNow')).toBe(false)
    expect(needsConfirmation({ status: 'won' }, 'notAFit')).toBe(false)
  })

  it('says what the log would do, naming the contact — never a pronoun', () => {
    expect(confirmationPrompt({ contactLabel: 'Priya Patel', outcomeKey: 'notNow', statusBefore: 'responded' })).toBe(
      'Sounds like *not right now* — that moves Priya Patel from Responded to Dormant, with a follow-up in 2 months.',
    )
    expect(confirmationPrompt({ contactLabel: 'Sam <Rivera>', outcomeKey: 'notAFit', statusBefore: 'contacted' })).toBe(
      'Sounds like *not a fit* — that moves Sam &lt;Rivera&gt; from Contacted to Closed.',
    )
    expect(confirmationPrompt({ contactLabel: 'Priya', outcomeKey: 'notNow' })).not.toMatch(/\b(?:her|him|she|he)\b/)
  })
})

describe('the receipt a logged call leaves', () => {
  const undoValue = encodeCallLogUndo({
    contactId: 'marketingContact.jane',
    interactionKey: 'slack-msg-C1-1.1',
    prior: { status: 'researched', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
  })

  it('reads naturally, says the status move and the next follow-up, and carries Undo', () => {
    const blocks = buildCallLogReceiptBlocks({
      presserId: 'U1',
      contactLabel: 'Jane Doe (Mass General Brigham)',
      outcomeKey: 'voicemail',
      statusBefore: 'researched',
      statusAfter: 'contacted',
      followUpAt: '2026-09-28T15:00:00.000Z',
      undoValue,
      now: NOW,
    })
    expectValidSlackBlocks(blocks)
    expect(blocks[0].text.text).toBe(
      ':white_check_mark: <@U1> logged a voicemail for Jane Doe (Mass General Brigham). Status: Contacted (was Researched). Next follow-up Mon 28 Sep.',
    )
    expect(blocks[1].elements).toEqual([
      { type: 'button', action_id: MARQUETA_ACTION.callLogUndo, text: { type: 'plain_text', text: 'Undo', emoji: true }, value: undoValue },
    ])
  })

  it('leaves the status clause out when nothing moved, and the follow-up when there is none', () => {
    const line = callLogReceiptLine({ presserId: 'U1', contactLabel: 'Leo Park', outcomeKey: 'noAnswer', statusBefore: 'meeting', statusAfter: 'meeting', now: NOW })
    expect(line).toBe(':white_check_mark: <@U1> logged a call to Leo Park — no answer.')
    expect(callLogReceiptLine({ presserId: 'U1', contactLabel: 'Priya Patel', outcomeKey: 'notNow', statusBefore: 'responded', statusAfter: 'dormant', now: NOW })).toBe(
      ':white_check_mark: <@U1> logged that Priya Patel said not right now. Status: Dormant (was Responded).',
    )
  })

  it('has no Undo button without a value Slack would take', () => {
    const blocks = buildCallLogReceiptBlocks({ presserId: 'U1', contactLabel: 'Jane', outcomeKey: 'voicemail', undoValue: '', now: NOW })
    expect(blocks).toHaveLength(1)
    expectValidSlackBlocks(blocks)
  })

  it('is struck through once undone, with nothing left to press', () => {
    const blocks = buildCallLogUndoneBlocks({ contactLabel: 'Jane Doe', outcomeKey: 'voicemail', undoerId: 'U2' })
    expectValidSlackBlocks(blocks)
    expect(blocks).toEqual([{ type: 'section', block_id: 'mq_call_log', text: { type: 'mrkdwn', text: '~Logged a voicemail for Jane Doe~ — undone by <@U2>' } }])
    expect(JSON.stringify(blocks)).not.toContain('button')
  })

  it('still redraws when the outcome cannot be named — the Undo already happened', () => {
    // undoCallLog reads the outcome back off the interaction it removed; a
    // hand-written or renamed outcome matches no key. This used to throw
    // after the write, leaving a live Undo on a receipt already taken back.
    for (const outcomeKey of [undefined, 'somethingRenamed' as never]) {
      const blocks = buildCallLogUndoneBlocks({ contactLabel: 'Jane Doe', outcomeKey, undoerId: 'U2' })
      expectValidSlackBlocks(blocks)
      expect(blocks[0].text.text).toBe('~Logged the call with Jane Doe~ — undone by <@U2>')
      expect(JSON.stringify(blocks)).not.toContain('button')
    }
  })

  it('escapes the name and keeps it from ending the formatting it sits in', () => {
    const text = callLogReceiptLine({ presserId: 'U1', contactLabel: '<!here> ~Jane~ *Doe*', outcomeKey: 'voicemail', now: NOW })
    expect(text).toContain('&lt;!here&gt;')
    expect(text).not.toContain('<!here>')
    expect(buildCallLogUndoneBlocks({ contactLabel: 'Jane ~Doe~', outcomeKey: 'voicemail', undoerId: 'U2' })[0].text.text.match(/~/g)).toHaveLength(2)
  })

  it('has a confirmation phrase for every outcome, naming the contact', () => {
    for (const outcome of CALL_OUTCOMES) {
      expect(outcome.confirmation, outcome.key).toContain('{who}')
      expect(outcome.confirmation).not.toMatch(/\b(?:her|him|she|he)\b/)
    }
  })
})

describe('alreadyLogged', () => {
  it('spots a log that has already been written, so a Slack retry is a no-op', () => {
    const contact = { _id: 'c1', interactions: [{ _key: 'a' }, { _key: 'slack-V1' }] }
    expect(alreadyLogged(contact, 'slack-V1')).toBe(true)
    expect(alreadyLogged(contact, 'slack-V2')).toBe(false)
    expect(alreadyLogged(contact, '')).toBe(false)
    expect(alreadyLogged({ _id: 'c1' }, 'slack-V1')).toBe(false)
    expect(alreadyLogged({ _id: 'c1', interactions: null }, 'slack-V1')).toBe(false)
  })

  it('compares keys the way they were stored (trimmed, capped at 120)', () => {
    const long = 'k'.repeat(200)
    const write = buildQuickCallLog({ contact: { _id: 'c1' }, outcomeKey: 'voicemail', by: 'Sam', now: NOW, key: long })
    expect(alreadyLogged({ _id: 'c1', interactions: [write.entry as { _key: string }] }, long)).toBe(true)
  })
})

describe('buildCallLogUndoWrite', () => {
  const original: Doc = {
    _id: 'c1',
    status: 'contacted',
    lastContactedAt: '2026-09-10T14:00:00.000Z',
    followUpAt: '2026-09-20T14:00:00.000Z',
    attributionChannel: 'email',
    nextStep: 'Send the kit',
    interactions: [{ _key: 'int-earlier' }],
  }
  /** An Undo as buttons minted before the close travelled carried it. */
  const withoutClose = (undo: CallLogUndo): CallLogUndo => {
    const { status, followUpAt, lastContactedAt, attributionChannel, nextStep } = undo.prior
    return { ...undo, prior: { status, followUpAt, lastContactedAt, attributionChannel, nextStep } }
  }
  const logAndUndo = (doc: Doc, outcomeKey: CallOutcomeKey) => {
    const write = buildQuickCallLog({ contact: doc as ContactLogContact, outcomeKey, by: 'Sam', now: NOW, key: 'slack-V1' })
    const logged = applyWrite(doc, write)
    // Through the button and back, as it really travels.
    const undo = decodeCallLogUndo(encodeCallLogUndo(write.undo))!
    return { write, logged, undo, result: buildCallLogUndoWrite(logged, undo) }
  }

  it('puts every field back and removes exactly the logged interaction', () => {
    const { result, logged } = logAndUndo(original, 'voicemail')
    expect(result).toEqual({
      ok: true,
      set: {
        status: 'contacted',
        followUpAt: '2026-09-20T14:00:00.000Z',
        lastContactedAt: '2026-09-10T14:00:00.000Z',
        attributionChannel: 'email',
        nextStep: 'Send the kit',
      },
      unset: [],
      removeKey: 'slack-V1',
    })
    if (!result.ok) throw new Error('expected ok')
    expect(applyUndo(logged, result)).toEqual(original)
  })

  it('unsets a field that was empty before, rather than setting it to ""', () => {
    const bare: Doc = { _id: 'c1', status: 'researched', interactions: [] }
    const { result, logged } = logAndUndo(bare, 'interested')
    if (!result.ok) throw new Error('expected ok')
    expect(result.set).toEqual({ status: 'researched' })
    expect(result.unset).toEqual(['followUpAt', 'lastContactedAt', 'attributionChannel', 'nextStep'])
    expect(applyUndo(logged, result)).toEqual(bare)
  })

  it('takes back the close that "Not a fit" stamped on a live contact', () => {
    const { result, logged, write } = logAndUndo(original, 'notAFit')
    expect(write.undo.prior).toMatchObject({ closedAt: '', closedValue: null, closeReason: '' })
    if (!result.ok) throw new Error('expected ok')
    expect(result.unset).toEqual(expect.arrayContaining(['closedAt', 'closeReason']))
    expect(applyUndo(logged, result)).toEqual(original)
  })

  it('still takes back a "Not a fit" from a button minted before the close travelled', () => {
    const { logged, write } = logAndUndo(original, 'notAFit')
    const result = buildCallLogUndoWrite(logged, withoutClose(write.undo))
    if (!result.ok) throw new Error('expected ok')
    expect(result.unset).toEqual(['closedAt', 'closeReason'])
    expect(applyUndo(logged, result)).toEqual(original)
  })

  it('round-trips a touch on a Won contact without disturbing it', () => {
    const won: Doc = { _id: 'c1', status: 'won', closedAt: '2026-08-01T00:00:00.000Z', closedValue: 90000, closeReason: 'Signed', interactions: [] }
    const { result, logged } = logAndUndo(won, 'meeting')
    if (!result.ok) throw new Error('expected ok')
    expect(applyUndo(logged, result)).toEqual(won)
  })

  it('never overwrites a next step with the clipped copy the button carried', () => {
    const longStep: Doc = { ...original, nextStep: 'n'.repeat(900) }
    const { result, logged, undo } = logAndUndo(longStep, 'voicemail')
    expect(undo.prior.nextStep.length).toBeLessThan(900)
    if (!result.ok) throw new Error('expected ok')
    expect(result.set).not.toHaveProperty('nextStep')
    expect(applyUndo(logged, result).nextStep).toBe('n'.repeat(900))
  })

  it('refuses when something else was logged since', () => {
    const { logged, undo } = logAndUndo(original, 'voicemail')
    const later = { ...logged, interactions: [...logged.interactions, { _key: 'int-later' }] }
    expect(buildCallLogUndoWrite(later, undo)).toEqual({
      ok: false,
      reason: 'Something else was logged since — change it on Outreach',
    })
  })

  it('refuses a second press once the call is gone', () => {
    const { logged, undo, result } = logAndUndo(original, 'voicemail')
    if (!result.ok) throw new Error('expected ok')
    const undone = applyUndo(logged, result)
    const again = buildCallLogUndoWrite(undone, undo)
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.reason).toMatch(/already have been undone/)
  })

  it('refuses an undo addressed to a different contact', () => {
    const { logged, undo } = logAndUndo(original, 'voicemail')
    const result = buildCallLogUndoWrite({ ...logged, _id: 'c2' }, undo)
    expect(result.ok).toBe(false)
  })

  // Review finding: "called Jane, no answer" about somebody Lost last spring
  // reopened her, erased the loss date, reason and zero value, and Undo refused.
  it('puts a Lost or Closed contact back, close and all, after any outcome that changed it', () => {
    const lost: Doc = {
      _id: 'c1',
      status: 'lost',
      closedAt: '2026-05-01T00:00:00.000Z',
      closedValue: 0,
      closeReason: 'Went with an in-house team',
      interactions: [{ _key: 'int-earlier' }],
    }
    const closed: Doc = { _id: 'c1', status: 'closed', closedAt: '2026-06-01T00:00:00.000Z', closeReason: 'No budget', interactions: [] }
    let reopened = 0
    for (const doc of [lost, closed]) {
      for (const outcome of CALL_OUTCOMES) {
        const { write, logged, result } = logAndUndo(doc, outcome.key)
        expect(write.reversible).toBe(true)
        expect(quickLogIsReversible(doc as ContactLogContact, outcome.key)).toBe(true)
        if (!result.ok) throw new Error(`${doc.status} + ${outcome.key}: ${result.reason}`)
        expect(applyUndo(logged, result)).toEqual(doc)
        if (logged.status !== doc.status) reopened++
      }
    }
    // Every outcome but "Not a fit" on a Closed contact changed the status.
    expect(reopened).toBe(15)
    const { write } = logAndUndo(lost, 'noAnswer')
    expect(write.unset).toEqual(['nextStep', 'closedAt', 'closedValue', 'closeReason'])
    expect(write.undo.prior).toMatchObject({ closedAt: '2026-05-01T00:00:00.000Z', closedValue: 0, closeReason: 'Went with an in-house team' })
  })

  it('leaves the close off the button when the log did not change it', () => {
    const won: Doc = { _id: 'c1', status: 'won', closedAt: '2026-08-01T00:00:00.000Z', closedValue: 90000, closeReason: 'Signed', interactions: [] }
    expect(logAndUndo(won, 'voicemail').write.undo.prior).not.toHaveProperty('closedAt')
    expect(logAndUndo(original, 'voicemail').write.undo.prior).not.toHaveProperty('closedAt')
    // A live contact with a stale close still gets it back exactly.
    const stale: Doc = { ...original, status: 'dormant', closedValue: 0 }
    const { result, logged } = logAndUndo(stale, 'interested')
    if (!result.ok) throw new Error('expected ok')
    expect(applyUndo(logged, result)).toEqual(stale)
  })

  it('refuses to half-restore a reopened contact when the button could not carry the close', () => {
    const lost: Doc = { ...original, status: 'lost', closedAt: '2026-05-01T00:00:00.000Z', closedValue: 0, closeReason: 'Budget' }
    // A button minted before the close travelled.
    const { logged, write } = logAndUndo(lost, 'interested')
    const legacy = buildCallLogUndoWrite(logged, withoutClose(write.undo))
    expect(legacy.ok).toBe(false)
    if (!legacy.ok) expect(legacy.reason).toContain('marked Lost')

    // A close reason too long for the button: not carried, so the log says it
    // cannot be undone BEFORE anybody presses anything, and Undo refuses.
    const longReason: Doc = { ...lost, closeReason: 'r'.repeat(CALL_LOG_UNDO_CLOSE_REASON_MAX + 1) }
    const long = logAndUndo(longReason, 'noAnswer')
    expect(long.write.reversible).toBe(false)
    expect(quickLogIsReversible(longReason as ContactLogContact, 'noAnswer')).toBe(false)
    expect(long.write.undo.prior).not.toHaveProperty('closedAt')
    expect(long.result.ok).toBe(false)
    // …while an outcome that leaves that close alone stays reversible.
    const closedLong: Doc = { ...longReason, status: 'closed' }
    expect(quickLogIsReversible(closedLong as ContactLogContact, 'notAFit')).toBe(true)
    // Exactly at the cap still fits.
    const atCap: Doc = { ...lost, closeReason: 'r'.repeat(CALL_LOG_UNDO_CLOSE_REASON_MAX) }
    const fits = logAndUndo(atCap, 'noAnswer')
    expect(fits.write.reversible).toBe(true)
    if (!fits.result.ok) throw new Error('expected ok')
    expect(applyUndo(fits.logged, fits.result)).toEqual(atCap)
  })

  it('says a log is not reversible when it would erase a next step longer than the button carries', () => {
    const longStep: Doc = { ...original, nextStep: 'n'.repeat(900) }
    // Carried forward untouched: Undo keeps the full text, so this is fine.
    expect(quickLogIsReversible(longStep as ContactLogContact, 'voicemail')).toBe(true)
    // "Not a fit" clears it, and Undo could only put back the first 600 characters.
    expect(quickLogIsReversible(longStep as ContactLogContact, 'notAFit')).toBe(false)
    expect(quickLogIsReversible(original as ContactLogContact, 'notAFit')).toBe(true)
  })

  it('keeps the Undo button inside Slack’s value cap even when every field is hostile', () => {
    const nasty = '"\\\n'.repeat(2000)
    const doc: Doc = {
      _id: 'c1',
      status: 'lost',
      closedAt: '2026-05-01T00:00:00.000Z',
      closedValue: 0,
      closeReason: '"\n'.repeat(160),
      nextStep: nasty,
      interactions: [],
    }
    const { write } = logAndUndo(doc, 'noAnswer')
    const encoded = encodeCallLogUndo(write.undo)
    expect(encoded.length).toBeLessThanOrEqual(2000)
    expect(decodeCallLogUndo(encoded)?.interactionKey).toBe('slack-V1')
    // What does not fit is dropped, and the log knows it cannot be undone.
    expect(write.reversible).toBe(false)
    const huge = encodeCallLogUndo({
      contactId: 'c'.repeat(5000),
      interactionKey: 'k'.repeat(5000),
      prior: {
        status: '<!here>'.repeat(500),
        followUpAt: '&'.repeat(5000),
        lastContactedAt: '<5%'.repeat(2000),
        attributionChannel: '"'.repeat(5000),
        nextStep: '\u0001'.repeat(5000),
        closedAt: '"'.repeat(5000),
        closedValue: Number.POSITIVE_INFINITY,
        closeReason: '\u0002'.repeat(5000),
      },
    })
    expect(huge.length).toBeLessThanOrEqual(2000)
    expect(decodeCallLogUndo(huge)).not.toBeNull()
  })
})

describe('buildCallLogView', () => {
  const metadata = encodeCallLogMetadata({ contactId: 'c1', channel: 'C123', threadTs: '1726000000.000100', label: 'Jane Doe' })
  const blockById = (view: Doc, id: string) => view.blocks.find((block: Doc) => block.block_id === id)

  it('is a valid modal routed by its callback id', () => {
    const view = buildCallLogView({ contactLabel: 'Jane Doe', metadata }) as Doc
    expectValidSlackModal(view)
    expect(view.callback_id).toBe(CALL_LOG_CALLBACK)
    expect(view.title.text).toBe('How did it go?')
    expect(view.submit.text).toBe('Log it')
    expect(view.close.text).toBe('Cancel')
    expect(view.private_metadata).toBe(metadata)
    expect(view.blocks[0].text.text).toContain('*Jane Doe*')
  })

  it('requires an outcome, and leaves notes and follow-up optional', () => {
    const view = buildCallLogView({ contactLabel: 'Jane', metadata }) as Doc
    const outcome = blockById(view, CALL_OUTCOME_BLOCK)
    expect(outcome.optional).toBeUndefined()
    expect(outcome.element.action_id).toBe(CALL_OUTCOME_INPUT)
    expect(outcome.element.options.map((option: Doc) => option.value)).toEqual(CALL_OUTCOMES.map((o) => o.key))
    expect(outcome.element.initial_option).toBeUndefined()
    const notes = blockById(view, CALL_NOTES_BLOCK)
    expect(notes.optional).toBe(true)
    expect(notes.element).toMatchObject({ type: 'plain_text_input', action_id: CALL_NOTES_INPUT, multiline: true, max_length: 2000 })
    expect(notes.element).not.toHaveProperty('initial_value')
    const followUp = blockById(view, CALL_FOLLOW_UP_BLOCK)
    expect(followUp.element.action_id).toBe(CALL_FOLLOW_UP_INPUT)
    expect(followUp.element.initial_option).toBe(followUp.element.options[0])
    expect(followUp.element.initial_option).toEqual({ text: { type: 'plain_text', text: 'When the outcome suggests' }, value: 'default' })
  })

  it('opens pre-filled from what the person already said', () => {
    const view = buildCallLogView({ contactLabel: 'Jane', metadata, prefillOutcome: 'voicemail', prefillNotes: '  called Jane, left a voicemail  ' }) as Doc
    expectValidSlackModal(view)
    const outcome = blockById(view, CALL_OUTCOME_BLOCK).element
    expect(outcome.initial_option).toBe(outcome.options[1])
    expect(outcome.initial_option.value).toBe('voicemail')
    expect(blockById(view, CALL_NOTES_BLOCK).element.initial_value).toBe('called Jane, left a voicemail')
  })

  it('ignores a prefill outcome that is not one of its own', () => {
    const view = buildCallLogView({ contactLabel: 'Jane', metadata, prefillOutcome: 'won' as CallOutcomeKey }) as Doc
    expect(blockById(view, CALL_OUTCOME_BLOCK).element.initial_option).toBeUndefined()
  })

  it('survives hostile and enormous values', () => {
    const hostile = `<!here> AT&T <5% ${'z'.repeat(5000)}`
    const bigMetadata = encodeCallLogMetadata({ contactId: 'c'.repeat(5000), channel: 'C'.repeat(500), threadTs: '1'.repeat(500), label: hostile })
    const view = buildCallLogView({ contactLabel: hostile, metadata: bigMetadata, prefillNotes: hostile, prefillOutcome: 'notAFit' }) as Doc
    expectValidSlackModal(view)
    const heading = view.blocks[0].text.text
    expect(heading).not.toContain('<!here>')
    expect(heading).toContain('&lt;!here&gt; AT&amp;T &lt;5%')
    expect(blockById(view, CALL_NOTES_BLOCK).element.initial_value.length).toBe(2000)
    expect((buildCallLogView({ contactLabel: '   ', metadata }) as Doc).blocks[0].text.text).toContain('*this contact*')
    expectValidSlackModal(buildCallLogView({ contactLabel: '', metadata: '' }) as Doc)
  })
})

describe('readCallLogSubmission', () => {
  const values = (outcome?: string | null, notes?: string | null, followUp?: string | null) => ({
    [CALL_OUTCOME_BLOCK]: { [CALL_OUTCOME_INPUT]: { selected_option: outcome === null ? null : { value: outcome } } },
    [CALL_NOTES_BLOCK]: { [CALL_NOTES_INPUT]: { value: notes } },
    [CALL_FOLLOW_UP_BLOCK]: { [CALL_FOLLOW_UP_INPUT]: { selected_option: followUp === null ? null : { value: followUp } } },
  })

  it('reads a complete submission', () => {
    expect(readCallLogSubmission(values('meeting', '  Tuesday 2pm  ', '7'))).toEqual({ outcomeKey: 'meeting', notes: 'Tuesday 2pm', followUp: '7' })
  })

  it('reads anything malformed as not chosen, and an unknown follow-up as the default', () => {
    expect(readCallLogSubmission(undefined)).toEqual({ outcomeKey: null, notes: '', followUp: 'default' })
    expect(readCallLogSubmission({})).toEqual({ outcomeKey: null, notes: '', followUp: 'default' })
    expect(readCallLogSubmission(values(null, null, null))).toEqual({ outcomeKey: null, notes: '', followUp: 'default' })
    expect(readCallLogSubmission(values('won', 'x', '999'))).toEqual({ outcomeKey: null, notes: 'x', followUp: 'default' })
    expect(readCallLogSubmission(values('voicemail', 'y'.repeat(5000), 'none')).notes.length).toBe(2000)
  })
})

describe('guessCallOutcome', () => {
  const cases: [string, CallOutcomeKey | undefined][] = [
    ['left a voicemail', 'voicemail'],
    ['Called Jane at Acme, left her a voicemail', 'voicemail'],
    ['left vm', 'voicemail'],
    ['LEFT A MESSAGE with her assistant', 'voicemail'],
    ['no answer', 'noAnswer'],
    ["didn't pick up", 'noAnswer'],
    ['didn’t pick up', 'noAnswer'],
    ['did not pick up', 'noAnswer'],
    ['went to voicemail', 'noAnswer'],
    ['went to voicemail, left a message', 'voicemail'],
    ['went to voicemail so I left one', 'voicemail'],
    ['she left the company, no answer', 'noAnswer'],
    ['emailed her the kit', 'emailed'],
    ['sent an email to the CMIO', 'emailed'],
    ['dropped her a note', 'emailed'],
    ['booked a meeting for Tuesday', 'meeting'],
    ['meeting is set for Friday', 'meeting'],
    ['scheduled a call with their CMIO', 'meeting'],
    ['they are fully booked until October', undefined],
    ["haven't booked anything yet", undefined],
    ['she is interested', 'interested'],
    ['really keen on the pre-mortem', 'interested'],
    ['wants to talk next week', 'interested'],
    ['not interested', 'notAFit'],
    ["didn't seem that interested", 'notAFit'],
    ['not a fit', 'notAFit'],
    ['not a good fit for them', 'notAFit'],
    ['no interest in design work', 'notAFit'],
    ['not right now', 'notNow'],
    ['not now, maybe Q1', 'notNow'],
    ['call back next quarter', 'notNow'],
    ["let's circle back after the holidays", 'notNow'],
    ['after budget season', 'notNow'],
    ['interested, but not until next quarter', 'notNow'],
    ['booked a meeting for next quarter', 'meeting'],
    ['interested and booked a call', 'meeting'],
    ['she pointed me to their CTO', 'referred'],
    ['referred me to Sam Rivera', 'referred'],
    ['said to try reaching the VP of product', 'referred'],
    ["I'll try reaching her again tomorrow", undefined],
    ['the line sent me to voicemail', undefined],
    ['emailed her, she wants to talk', 'interested'],
    ['left a voicemail and she called back interested', 'interested'],
    ['no answer, so I emailed', undefined],
    ["asked if she'd be interested, no answer", 'noAnswer'],
    ["I'm keen to follow up", undefined],
    ['not sure she is interested', undefined],
    ['interested in the kit, pointed me to Sam', undefined],
    ['had a great chat', undefined],
    ['', undefined],
    ['   ', undefined],
  ]

  it.each(cases)('%j → %s', (text, expected) => {
    expect(guessCallOutcome(text)).toBe(expected)
  })

  // Review finding: an attempt plus a plan, a topic or a hunch used to log the
  // hunch. "No answer, will circle back" put a live contact to sleep for 60 days.
  const attemptsWithoutContact: [string, CallOutcomeKey | undefined][] = [
    ['no answer, will circle back next week', 'noAnswer'],
    ["no answer, I'll circle back Friday", 'noAnswer'],
    ['no answer, I’ll circle back Friday', 'noAnswer'],
    ['left a voicemail, need to circle back', 'voicemail'],
    ['emailed her about next quarter', undefined],
    ['left a voicemail about their next quarter pilot', undefined],
    ['left a voicemail, she might be interested', 'voicemail'],
    ["left a voicemail, think she'd be interested", 'voicemail'],
    ['left a voicemail, probably not interested', 'voicemail'],
    ['emailed her, no reply yet, she might be keen', 'emailed'],
    ['left a voicemail, not interested', undefined],
    ['emailed her to get a meeting booked', undefined],
    ['no answer at first but then booked a meeting', undefined],
    ['I called back, no answer', 'noAnswer'],
    ['left a voicemail, she never called back interested', undefined],
    // …and the same outcomes still win when somebody clearly answered.
    ['emailed and she replied: not interested', 'notAFit'],
    ['left a voicemail, she emailed back to say she is interested', 'interested'],
    ['no answer at first, then she called me back — not right now', 'notNow'],
    ['emailed him, he said circle back after the holidays', 'notNow'],
    ['left a voicemail, then spoke to her — booked a meeting', 'meeting'],
    ["she asked me to circle back in January", 'notNow'],
    ["let's circle back after the holidays", 'notNow'],
  ]

  it.each(attemptsWithoutContact)('an attempt beats a hunch: %j → %s', (text, expected) => {
    expect(guessCallOutcome(text)).toBe(expected)
  })

  // Review finding: negations and doubts a word or two further back.
  const negatedOrDoubtful: [string, CallOutcomeKey | undefined][] = [
    ["couldn't get a meeting booked", undefined],
    ['no meeting booked yet', undefined],
    ['not yet booked', undefined],
    ['nothing booked', undefined],
    ["didn't get anything booked", undefined],
    ['no meeting set yet', undefined],
    ["haven't scheduled a call", undefined],
    ['not sure if interested', undefined],
    ['not sure whether they are interested', undefined],
    ['might not be a fit', undefined],
    ['maybe not a fit', undefined],
    ['she may be interested', undefined],
    ['hoping she is interested', undefined],
    ['left a voicemail, try reaching her again next week', 'voicemail'],
    ['try reaching her again', undefined],
    ['told me to try reaching Sam in IT', 'referred'],
    ['suggested I try calling their VP', 'referred'],
    ['no answer, left no message', 'noAnswer'],
    ['left her no voicemail', undefined],
    ['never left a message', undefined],
    ["haven't emailed her yet", undefined],
    ['not yet emailed', undefined],
    ['no longer wants to talk', undefined],
    ["she doesn't want to talk", undefined],
    ['no one picked up', 'noAnswer'],
    ['nobody answered, left a voicemail', 'voicemail'],
    ['called Jane, not interested', 'notAFit'],
    ['talked to Will, interested', 'interested'],
    ['had a call with Jane, booked a follow-up meeting', 'meeting'],
  ]

  it.each(negatedOrDoubtful)('reads negation and doubt in the clause: %j → %s', (text, expected) => {
    expect(guessCallOutcome(text)).toBe(expected)
  })

  it('only matches whole words', () => {
    expect(guessCallOutcome('vmware demo')).toBeUndefined()
    expect(guessCallOutcome('keenly aware')).toBeUndefined()
    expect(guessCallOutcome('rebooked')).toBeUndefined()
  })
})
