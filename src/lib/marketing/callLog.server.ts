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
  CALL_OUTCOMES,
  type CallOutcomeKey,
  type ContactLogContact,
} from './callLog'
import { followUpPersonLabel, followUpStatusLabel } from './followUps'
import type { CallLogUndo } from './marquetaActions'
import { errorLine, formatSlackDay } from './marquetaStyle'
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
  "interactions": interactions[]{ _key, outcome }
}`

export type CallLogResult = {
  ok: boolean
  /** One plain-text line for the thread (the caller escapes it). */
  message: string
  /** Who the log is about — never an email address. */
  label: string
  /** The contact's status BEFORE this log — for the receipt's "(was Researched)". */
  statusBefore?: string
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

const SAVE_FAILED = errorLine('log that', 'The Studio’s Outreach tab can log it.')
const UNDO_FAILED = errorLine('undo that', 'The Studio’s Outreach tab can change it.')

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
  if (!contactId) return { ok: false, message: errorLine('log that', 'That button lost track of who it was for.'), label: 'them' }

  try {
    const client = getOutreachClient()
    let contact = await readContact(contactId)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!contact) return { ok: false, message: errorLine('log that', 'That contact is no longer on file.'), label: 'them' }
      const label = labelFor(contact)
      const statusBefore = String(contact.status || '').trim()
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
          message: 'That one needs the form — I couldn’t undo it cleanly from here.',
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

      const followUp = write.followUpAt ? formatSlackDay(write.followUpAt, input.now) : ''
      return {
        ok: true,
        // The plain-text fallback, in the shape the interactions route still
        // reads ("Logged: …", lowercased after a mention). The room's receipt
        // is `buildCallLogReceiptBlocks` / `callLogReceiptLine` in callLog.ts.
        message: `Logged: ${write.outcomeLabel} with ${label}${followUp ? ` · follow-up ${followUp}` : ''}.`,
        label,
        ...(statusBefore ? { statusBefore } : {}),
        statusAfter: write.statusAfter,
        ...(write.followUpAt ? { followUpAt: write.followUpAt } : {}),
        undo: write.undo,
      }
    }
    return {
      ok: false,
      message: errorLine('log that', 'Somebody else was updating that contact at the same moment — try again, or log it on Outreach.'),
      label: contact ? labelFor(contact) : 'them',
    }
  } catch (error) {
    console.error('[marqueta] call log failed', error)
    return { ok: false, message: SAVE_FAILED, label: 'them' }
  }
}

/** Interaction keys are ours (`slack-…`, `int-…`); anything else never reaches a GROQ path. */
const SAFE_KEY = /^[A-Za-z0-9._-]{1,120}$/

export type CallLogUndoResult = {
  ok: boolean
  message: string
  /** Who the call was with — for the struck-through receipt (`buildCallLogUndoneBlocks`). */
  label?: string
  /** What was logged, read back off the interaction it removed; absent for a hand-written outcome. */
  outcomeKey?: CallOutcomeKey
}

/**
 * Take back a quick log.
 *
 * `buildCallLogUndoWrite` decides whether it is safe (only the LAST touch, only
 * when the close travelled with the button) and what to restore; this removes
 * that exact interaction by its key, conditional on the revision it read.
 * A conflict is re-read and re-checked once — if something was logged in the
 * meantime the rule says no, and the answer is no.
 *
 * On success it also says who the call was with and what was logged, read off
 * the interaction it removed: the Undo button's value carries neither, and the
 * receipt it redraws ("~Logged a voicemail for Jane Doe~") needs both.
 */
export async function undoCallLog(undo: CallLogUndo, byName: string): Promise<CallLogUndoResult> {
  const contactId = String(undo?.contactId || '').trim()
  if (!contactId || !SAFE_KEY.test(String(undo?.interactionKey || ''))) {
    return { ok: false, message: errorLine('undo that', 'That Undo button is no longer valid — change it on Outreach.') }
  }
  try {
    const client = getOutreachClient()
    let contact = await readContact(contactId)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (!contact) return { ok: false, message: errorLine('undo that', 'That contact is no longer on file.') }
      const result = buildCallLogUndoWrite(contact, undo)
      if (!result.ok) return { ok: false, message: errorLine('undo that', result.reason) }
      if (!SAFE_KEY.test(result.removeKey)) {
        return { ok: false, message: errorLine('undo that', 'That Undo button is no longer valid — change it on Outreach.') }
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
      const removed = (contact.interactions || []).find((interaction) => interaction?._key === result.removeKey) as
        | { outcome?: string | null }
        | undefined
      const outcomeKey = CALL_OUTCOMES.find((outcome) => outcome.label === String(removed?.outcome || '').trim())?.key
      return {
        ok: true,
        message: `Undone${who ? ` by ${who}` : ''}: the call with ${label} is off the record${back}.`,
        label,
        ...(outcomeKey ? { outcomeKey } : {}),
      }
    }
    return { ok: false, message: errorLine('undo that', 'Somebody else was updating that contact at the same moment — change it on Outreach.') }
  } catch (error) {
    console.error('[marqueta] call log undo failed', error)
    return { ok: false, message: UNDO_FAILED }
  }
}
