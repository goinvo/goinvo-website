/**
 * Carrying what a visitor already told us into the contact form, so they never type
 * their problem twice. The homepage study hands its last search here.
 *
 * The form is a JotForm embed, which fills a field from a URL parameter named after the
 * field: "How can we help?" is q5_howCan, so the parameter is howCan (checked against
 * the live form; scripts/verify-human-home-story.mjs reads the filled field back).
 */

export const CONTACT_MESSAGE_FIELD = 'howCan'
const MAX_MESSAGE = 1000

/** The same rule for the other two fields: q7_yourName and q4_yourEmail. */
export const CONTACT_NAME_FIELD = 'yourName'
export const CONTACT_EMAIL_FIELD = 'yourEmail'

/** The form's address, with whatever the visitor already gave us filled in. */
export function contactFormUrl(formId: string, message?: string, who: { name?: string; email?: string } = {}): string {
  const base = `https://form.jotform.com/${formId}`
  const params = new URLSearchParams()
  const text = message?.trim().slice(0, MAX_MESSAGE)
  if (text) params.set(CONTACT_MESSAGE_FIELD, text)
  if (who.name?.trim()) params.set(CONTACT_NAME_FIELD, who.name.trim().slice(0, 120))
  if (who.email?.trim()) params.set(CONTACT_EMAIL_FIELD, who.email.trim().slice(0, 200))
  // encodeURIComponent, as before: a space is %20, which the form reads back as typed.
  const query = [...params].map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
  return query ? `${base}?${query}` : base
}

/** The "send a project note by email" link, with what they are working on filled in. */
export function projectNoteHref(email: string, challenge: string, message?: string): string {
  const subject = `A project with GoInvo: ${challenge}`
  const body = `What I'm working on:\n${message?.trim() ? `${message.trim()}\n` : ''}\nWhat I'd like to change:\n\n`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
