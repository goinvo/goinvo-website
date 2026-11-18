/**
 * The contact form's note, as Marqueta posts it in Slack. Pure: the sending is
 * src/lib/contactNotify.server.ts, called by src/app/api/contact/route.ts.
 *
 * Everything in it was typed by a stranger, so every piece is escaped: a note can never
 * mention a channel, a person, or carry a link of its own making.
 */
import { clipSlackText, escapeSlackText } from '@/lib/marketing/slackText'
import type { ContactFields } from '@/lib/contactSubmit'

type Env = Record<string, string | undefined>

/**
 * Where the note goes: its own channel when one is set, otherwise Marqueta's room.
 * Never the website-chat channel, which holds live conversations with visitors.
 */
export function contactSlackChannel(env: Env = process.env): string {
  return String(env.SLACK_CONTACT_CHANNEL_ID || env.SLACK_MARKETING_CHANNEL_ID || '').trim()
}

const emailLink = (email: string) => (/^[^\s<>|&]+$/.test(email) ? `<mailto:${email}|${email}>` : escapeSlackText(email))

/** `delivered` says whether JotForm took the note too; when it did not, this is the only copy. */
export function contactSlackMessage(fields: ContactFields, delivered: boolean) {
  const name = escapeSlackText(fields.name)
  const quoted = clipSlackText(escapeSlackText(fields.message), 2600).split('\n').map((line) => `> ${line}`).join('\n')
  const status = delivered
    ? 'Also in the JotForm inbox, as before.'
    : ':warning: JotForm did not take this, so it is the only copy. They were shown the form itself and may send it again.'
  return {
    text: `New note from the website's contact form: ${name}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*New note from the website's contact form*\n*${name}* · ${emailLink(fields.email)}` } },
      { type: 'section', text: { type: 'mrkdwn', text: quoted } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: status }] },
    ],
  }
}
