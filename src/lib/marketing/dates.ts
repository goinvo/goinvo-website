/**
 * Pure, dependency-free date utilities shared between the Sanity Studio
 * marketing tool and the Next.js marketing API routes / UI.
 *
 * Ported VERBATIM from src/sanity/tools/marketingTool.tsx so the Studio and any
 * consumer stay byte-for-byte consistent. Do not change their behavior — only
 * the surrounding module/export boilerplate is new.
 *
 * These helpers operate purely on Date/string values and have no dependency on
 * React, the Sanity client, or any tool-local state/types.
 */

/** Returns a new Date at midnight on the first day of the given date's month. */
export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Returns the first day of the month `months` away from the given date. */
export function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Returns a new Date `days` away from the given date. */
export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

/** Localized "Month YYYY" label for the given date. */
export function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Normalizes a string/Date to a `YYYY-MM-DD` value suitable for a date input.
 * Returns '' for blank or unparseable input. String inputs already beginning
 * with a `YYYY-MM-DD` prefix are returned as-is (no timezone shift).
 */
export function toDateInputValue(value?: string | Date) {
  if (!value) return ''
  if (typeof value === 'string') {
    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
    if (dateOnly) return dateOnly
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Converts a `YYYY-MM-DD` date-input value to a noon-anchored ISO string, or
 * undefined when the input is blank. Anchoring at T12:00:00 avoids day-boundary
 * timezone drift.
 */
export function dateInputToIso(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : undefined
}

/** Formats an ISO/date value for an HTML datetime-local control in local time. */
export function toDateTimeInputValue(value?: string | Date) {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/** Converts an HTML datetime-local value to the corresponding ISO instant. */
export function dateTimeInputToIso(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
