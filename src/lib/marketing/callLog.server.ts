/**
 * Logging a call from Slack, and taking it back.
 *
 * The rules for what a log writes live in `callLog.ts` and are shared with the
 * Studio's own form; this file is only the read-modify-write around them. It
 * exists as its own module because two Slack paths reach it — the "How did it
 * go?" modal and a message like "called Jane, left a voicemail" — and both have
 * to survive the same three things:
 *
 * - **Slack retries.** A slow response makes Slack send the same submission
 *   again. The interaction key is derived from the Slack view (or the message),
 *   and a contact that already carries an interaction with that key is left
 *   alone: the second delivery is a no-op, not a second touch in the history
 *   and the pulse.
 * - **Somebody else writing at the same moment.** The write is conditional on
 *   the revision it was built from (`ifRevisionId`). If the contact moved in
 *   between, it is read again ONCE, re-checked for the key (the other writer
 *   may have been our own retry), rebuilt from the fresh record and retried.
 *   Rebuilding matters: the prior values Undo carries must be the ones the
 *   write actually replaced.
 * - **A mis-press.** Every quick log returns the Undo that puts the contact
 *   back, and Undo refuses — with a reason — when anything has been logged
 *   since, rather than restoring over somebody else's work.
 *
 * Contacts are read and written through `getOutreachClient`, pinned to the
 * private dataset: a call log is a prospect's name next to what they said.
 */
import 'server-only'
import { isRevisionConflict } from './apiBoundary'
import {
  alreadyLogged,
  buildCallLogUndoWrite,
  buildQuickCallLog,
  type CallOutcomeKey,
  type ContactLogContact,
} from './callLog'
import { followUpPersonLabel, followUpStatusLabel } from './followUps'
import type { CallLogUndo } from './marquetaActions'
import { getOutreachClient } from './outreachClient.server'

type LoggedContact = ContactLogContact & {
  _rev?: string | null
  name?: string | null
  email?: string | null
  organization?: string | null
}

/** Everything a quick log and its Undo read, and nothing else. */
const CONTACT_FOR_LOG = `*[_type == "marketingContact" && _id == $id][0]{
  _id, _rev, name, email, organization, status, closedAt, closedValue, closeReason,
  followUpAt, lastContactedAt, attributionChannel, nextStep,
  "interactions": interactions[]{ _key }
}`

export type CallLogResult = {
  ok: boolean
  /** One plain-text line for the thread (the caller escapes it). */
  message: string
  /** Who the log is about — never an email address. */
  label: string
  statusAfter?: string
  followUpAt?: string
  undo?: CallLogUndo
  /** True when this exact log was already on the record (a retry), so nothing was written. */
  skipped?: boolean
  /**
   * True when `onlyIfReversible` stopped the write: the Undo button could not
   * carry enough to put the contact back, so the caller should open the form.
   */
  needsForm?: boolean
}

const STUDIO_TIME_ZONE = 'America/New_York'

/** "Mon 28 Sep", in the studio's zone — the day the caller will actually ring back. */
function weekdayDate(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  return `${pick('weekday')} ${pick('day')} ${pick('month')}`
}

function labelFor(contact: LoggedContact): string {
  return followUpPersonLabel({ name: contact.name, email: contact.email, organization: contact.organization })
}

async function readContact(contactId: string): Promise<LoggedContact | null> {
  return getOutreachClient().fetch<LoggedContact | null>(CONTACT_FOR_LOG, { id: contactId })
}

/**
 * Log one call outcome from Slack.
 *
 * `key` must be deterministic for the press or message it came from
 * (`slack-<view id>`, `slack-msg-<channel>-<ts>`): it is the interaction's
 * `_key`, and it is what makes a retry a no-op.
 *
 * `onlyIfReversible` is for the conversation path, which logs straight from a
 * message with an Undo button as the only safety net: when that button could
 * not carry enough to put the contact back exactly, nothing is written and
 * `needsForm` tells the caller to offer the form instead.
 *
 * Never throws: every failure comes back as `ok: false` with a sentence.
 */
export async function logCallFromSlack(input: {
  contactId: string
  outcomeKey: CallOutcomeKey
  notes?: string
  followUp?: string
  byName: string
  key: string
  now: Date
  onlyIfReversible?: boolean
}): Promise<CallLogResult> {
  const contactId = String(input.contactId || '').trim()
  if (!contactId) return { ok: false, message: 'I don’t know which contact that was.', label: 'them' }

  try {
    const client = getOutreachClient()
    let contact = await readContact(contactId)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!contact) return { ok: false, message: 'That contact is no longer on file.', label: 'them' }
      const label = labelFor(contact)
      if (alreadyLogged(contact, input.key)) {
        return {
          ok: true,
          skipped: true,
          message: `Already logged for ${label}.`,
          label,
          ...(contact.status ? { statusAfter: contact.status } : {}),
        }
      }

      const write = buildQuickCallLog({
        contact,
        outcomeKey: input.outcomeKey,
        notes: input.notes,
        followUp: input.followUp,
        by: input.byName,
        now: input.now,
        key: input.key,
      })
      if (input.onlyIfReversible && !write.reversible) {
        return {
          ok: false,
          needsForm: true,
          message: `I’d rather you logged that one with the form — I couldn’t undo it cleanly from here.`,
          label,
        }
      }

      let patch = client.patch(contact._id).setIfMissing({ interactions: [] }).set(write.set)
      if (write.unset.length) patch = patch.unset(write.unset)
      if (write.ifRevisionId) patch = patch.ifRevisionId(write.ifRevisionId)
      try {
        await patch.insert('after', 'interactions[-1]', [write.entry]).commit()
      } catch (error) {
        if (!isRevisionConflict(error)) throw error
        if (attempt === 0) {
          // Somebody (possibly our own retry) wrote in between: start again
          // from what is there now, so the Undo carries the true prior values.
          contact = await readContact(contactId)
          continue
        }
        break
      }

      const followUp = weekdayDate(write.followUpAt)
      return {
        ok: true,
        message: `Logged: ${write.outcomeLabel} with ${label}${followUp ? ` · follow-up ${followUp}` : ''}.`,
        label,
        statusAfter: write.statusAfter,
        ...(write.followUpAt ? { followUpAt: write.followUpAt } : {}),
        undo: write.undo,
      }
    }
    return {
      ok: false,
      message: 'Somebody else was updating that contact at the same moment. Try again, or log it in the Studio.',
      label: contact ? labelFor(contact) : 'them',
    }
  } catch (error) {
    console.error('[marqueta] call log failed', error)
    return { ok: false, message: 'I couldn’t save that. The Studio’s Outreach tab can log it.', label: 'them' }
  }
}

/** Interaction keys are ours (`slack-…`, `int-…`); anything else never reaches a GROQ path. */
const SAFE_KEY = /^[A-Za-z0-9._-]{1,120}$/

/**
 * Take back a quick log.
 *
 * `buildCallLogUndoWrite` decides whether it is safe (only the LAST touch, only
 * when the close travelled with the button) and what to restore; this removes
 * that exact interaction by its key, conditional on the revision it read.
 * A conflict is re-read and re-checked once — if something was logged in the
 * meantime the rule says no, and the answer is no.
 */
export async function undoCallLog(undo: CallLogUndo, byName: string): Promise<{ ok: boolean; message: string }> {
  const contactId = String(undo?.contactId || '').trim()
  if (!contactId || !SAFE_KEY.test(String(undo?.interactionKey || ''))) {
    return { ok: false, message: 'That undo button is no longer valid — change it in the Studio.' }
  }
  try {
    const client = getOutreachClient()
    let contact = await readContact(contactId)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!contact) return { ok: false, message: 'That contact is no longer on file.' }
      const result = buildCallLogUndoWrite(contact, undo)
      if (!result.ok) return { ok: false, message: result.reason }
      if (!SAFE_KEY.test(result.removeKey)) {
        return { ok: false, message: 'That undo button is no longer valid — change it in the Studio.' }
      }

      let patch = client.patch(contact._id)
      if (Object.keys(result.set).length) patch = patch.set(result.set)
      patch = patch.unset([...result.unset, `interactions[_key=="${result.removeKey}"]`])
      if (contact._rev) patch = patch.ifRevisionId(contact._rev)
      try {
        await patch.commit()
      } catch (error) {
        if (!isRevisionConflict(error)) throw error
        if (attempt === 0) {
          contact = await readContact(contactId)
          continue
        }
        break
      }

      const label = labelFor(contact)
      const back = undo.prior.status ? ` — back to ${followUpStatusLabel(undo.prior.status)}` : ''
      const who = String(byName || '').trim()
      return { ok: true, message: `Undone${who ? ` by ${who}` : ''}: the call with ${label} is off the record${back}.` }
    }
    return { ok: false, message: 'Somebody else was updating that contact at the same moment. Change it in the Studio.' }
  } catch (error) {
    console.error('[marqueta] call log undo failed', error)
    return { ok: false, message: 'I couldn’t undo that. The Studio’s Outreach tab can.' }
  }
}
