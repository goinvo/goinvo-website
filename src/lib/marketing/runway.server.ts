/**
 * Reading and updating the runway record.
 *
 * Server-only: it touches the private dataset. The arithmetic all lives in
 * `runway.ts` and is tested there — this file is only the storage around it, so
 * the rules stay verifiable without a Sanity connection.
 *
 * Every write stamps `confirmedAt`. That is the whole mechanism behind "ask
 * before the number stops being true": the check-in is a function of when a
 * human last said something, so any update — even one that changes nothing —
 * quiets it for another month, and silence eventually speaks up.
 */
import { getMarketingWriteClientFor } from './client'
import { FINANCIAL_POSTURE_DOC_ID, FINANCIAL_POSTURE_DOC_TYPE } from './financialPosture'
import {
  addMonths,
  applyCommitment,
  describeRunway,
  monthsOfRunway,
  resolveRunwayPosture,
  runwayCheckIn,
  type ResolvedRunway,
  type RunwayCheckIn,
  type RunwayRecord,
  type StoredPosture,
} from './runway'

const client = () => getMarketingWriteClientFor(FINANCIAL_POSTURE_DOC_TYPE)

export type RunwayState = {
  stored: StoredPosture
  resolved: ResolvedRunway
  checkIn: RunwayCheckIn
  summary: string
}

function state(stored: StoredPosture, now = new Date()): RunwayState {
  return {
    stored,
    resolved: resolveRunwayPosture(stored, now),
    checkIn: runwayCheckIn(stored, now),
    summary: describeRunway(stored, now),
  }
}

export async function readRunway(now = new Date()): Promise<RunwayState> {
  const stored = await client().fetch<StoredPosture | null>(`*[_id == $id][0]{ posture, setAt, runway }`, {
    id: FINANCIAL_POSTURE_DOC_ID,
  })
  return state(stored || {}, now)
}

async function writeRunway(runway: RunwayRecord, now: Date): Promise<RunwayState> {
  await client()
    .createIfNotExists({ _id: FINANCIAL_POSTURE_DOC_ID, _type: FINANCIAL_POSTURE_DOC_TYPE })
    .then(() => client().patch(FINANCIAL_POSTURE_DOC_ID).set({ runway }).commit())

  const stored = await client().fetch<StoredPosture | null>(`*[_id == $id][0]{ posture, setAt, runway }`, {
    id: FINANCIAL_POSTURE_DOC_ID,
  })
  return state(stored || { runway }, now)
}

/**
 * "Still right" — the answer that changes no numbers.
 *
 * Worth its own path rather than making someone re-enter a date they have not
 * changed. A confirmation is real information: it is the difference between a
 * number nobody has looked at and one somebody just checked.
 */
export async function confirmRunway(input: { personName?: string; now?: Date }): Promise<RunwayState> {
  const now = input.now || new Date()
  const current = await readRunway(now)
  const runway: RunwayRecord = {
    ...(current.stored.runway || {}),
    confirmedAt: now.toISOString(),
  }
  if (input.personName) runway.basis = appendConfirmation(runway.basis, input.personName, now)
  return writeRunway(runway, now)
}

/** Set the runway outright, by months from today or by an explicit end date. */
export async function setRunway(input: {
  months?: number
  certainUntil?: string
  basis?: string
  personName?: string
  now?: Date
}): Promise<RunwayState> {
  const now = input.now || new Date()
  const certainUntil =
    input.certainUntil || (typeof input.months === 'number' ? addMonths(input.months, now) : undefined)
  if (!certainUntil) throw new Error('Give either months or an end date.')

  const current = await readRunway(now)
  const runway: RunwayRecord = {
    ...(current.stored.runway || {}),
    certainUntil,
    confirmedAt: now.toISOString(),
    basis: input.basis || current.stored.runway?.basis,
  }
  if (input.personName) runway.basis = appendConfirmation(runway.basis, input.personName, now)
  return writeRunway(runway, now)
}

/**
 * Record signed work, which extends the runway rather than replacing it.
 *
 * The extension rule lives in `applyCommitment` and is tested there: three
 * months signed in August against a runway that already reaches January means
 * April, not November.
 */
export async function recordSignedWork(input: {
  label: string
  monthsAdded: number
  note?: string
  personName?: string
  now?: Date
}): Promise<RunwayState> {
  const now = input.now || new Date()
  const current = await readRunway(now)
  const runway = applyCommitment(
    current.stored.runway || {},
    {
      label: input.label,
      signedAt: now.toISOString().slice(0, 10),
      monthsAdded: input.monthsAdded,
      recordedBy: input.personName,
      note: input.note,
    },
    now,
  )
  return writeRunway(runway, now)
}

/**
 * A short note of who last confirmed the number and when.
 *
 * Kept to the most recent confirmation: the commitments array is the log, and
 * `basis` is meant to stay one readable line.
 */
function appendConfirmation(basis: string | undefined, personName: string, now: Date): string {
  const stamp = `Confirmed by ${personName} on ${now.toISOString().slice(0, 10)}.`
  const existing = String(basis || '')
    .replace(/Confirmed by [^.]+\./g, '')
    .trim()
  return existing ? `${existing} ${stamp}` : stamp
}

/** Months left, for callers that only need the number. */
export async function runwayMonths(now = new Date()): Promise<number | null> {
  const { stored } = await readRunway(now)
  return monthsOfRunway(stored.runway?.certainUntil, now)
}
