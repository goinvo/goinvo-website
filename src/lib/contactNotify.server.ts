import 'server-only'
import { postSlackMessage } from '@/lib/chat/slack'
import { MARQUETA_IDENTITY } from '@/lib/marketing/marquetaStyle'
import type { ContactFields } from '@/lib/contactSubmit'
import { contactSlackChannel, contactSlackMessage } from '@/lib/contactNotify'

/**
 * Marqueta posts the note in Slack. Fail-closed (no channel set: nothing is posted, and it
 * never falls back to the website-chat channel) and it never throws: the visitor's answer
 * does not depend on Slack.
 */
export async function sendContactToSlack(fields: ContactFields, delivered: boolean): Promise<boolean> {
  const channel = contactSlackChannel()
  if (!channel) return false
  try {
    const message = contactSlackMessage(fields, delivered)
    const posted = await postSlackMessage({ channel, text: message.text, blocks: message.blocks as never, unfurl: false, username: MARQUETA_IDENTITY.username, iconEmoji: MARQUETA_IDENTITY.iconEmoji })
    if (!posted) console.warn('[contact] the note was not posted in Slack.')
    return Boolean(posted)
  } catch (error) {
    console.warn('[contact] the note was not posted in Slack.', error instanceof Error ? error.name : '')
    return false
  }
}
