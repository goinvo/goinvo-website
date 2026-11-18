/**
 * Sending the contact form in ONE step: name, email and the note together, from our own
 * page, into the same JotForm the site has always used (so the studio gets the same email
 * and the same inbox as before). Pure; the route that does the sending is
 * src/app/api/contact/route.ts, and the form is src/components/forms/ContactComposer.tsx.
 *
 * The rule that matters: never tell a visitor their note was sent unless JotForm said so.
 * Anything else (a refusal, a changed page, a timeout) is "not sent", and the form then
 * shows the JotForm itself with everything already filled in, so nothing typed is lost.
 */

export interface ContactFields { name: string; email: string; message: string }
export type ContactErrors = Partial<Record<keyof ContactFields, string>>

export const CONTACT_LIMITS = { name: 120, email: 200, message: 1000 }

const tidy = (value: unknown, limit: number) => (typeof value === 'string' ? value.trim().slice(0, limit) : '')

/** What they typed, trimmed and bounded. */
export function readContactFields(input: unknown): ContactFields {
  const record = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  return { name: tidy(record.name, CONTACT_LIMITS.name), email: tidy(record.email, CONTACT_LIMITS.email), message: tidy(record.message, CONTACT_LIMITS.message) }
}

/** One line per field that stops the note being sent; empty when it can go. */
export function contactErrors(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {}
  if (fields.name.length < 2) errors.name = 'Add your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) errors.email = 'Add an email we can reply to.'
  if (fields.message.length < 3) errors.message = 'Say a little about what you’re working on.'
  return errors
}

/**
 * The fields as the JotForm expects them (read from the live form, 2026-11-18):
 * q7_yourName, q4_yourEmail, q5_howCan; `website` is its trap for robots and stays empty;
 * `simple_spc` is the form's id twice, which the form's own script sets before it submits.
 */
export function jotformBody(formId: string, fields: ContactFields): URLSearchParams {
  return new URLSearchParams({ formID: formId, simple_spc: `${formId}-${formId}`, q7_yourName: fields.name, q4_yourEmail: fields.email, q5_howCan: fields.message, website: '' })
}
export const jotformSubmitUrl = (formId: string) => `https://submit.jotform.com/submit/${formId}`

/**
 * Did JotForm accept it? Only a thank-you counts: its thank-you page, or a redirect to one.
 * An error page, a captcha, or anything we do not recognise is NOT sent.
 */
export function jotformAccepted(status: number, body: string, location = ''): boolean {
  if (status >= 300 && status < 400) return /thank/i.test(location)
  if (status !== 200) return false
  if (/captcha|incomplete|there (was|were) (an )?error|not (be )?submitted|invalid/i.test(body)) return false
  return /thank\s*you|submission (has been|was) received/i.test(body)
}
