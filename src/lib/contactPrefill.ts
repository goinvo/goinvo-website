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

/** The form's address, with the message filled in when there is one. */
export function contactFormUrl(formId: string, message?: string): string {
  const base = `https://form.jotform.com/${formId}`
  const text = message?.trim().slice(0, MAX_MESSAGE)
  return text ? `${base}?${CONTACT_MESSAGE_FIELD}=${encodeURIComponent(text)}` : base
}

/** The "send a project note by email" link, with what they are working on filled in. */
export function projectNoteHref(email: string, challenge: string, message?: string): string {
  const subject = `A project with GoInvo: ${challenge}`
  const body = `What I'm working on:\n${message?.trim() ? `${message.trim()}\n` : ''}\nWhat I'd like to change:\n\n`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
