/**
 * Obvious robot spam in a contact note. Pure, free, and deliberately narrow: it decides only
 * whether Marqueta posts the note in Slack. The note still goes to the JotForm inbox either
 * way, so a wrong guess here loses nothing; it just keeps the channel quiet.
 *
 * Each rule is something a person describing a project does not do. One link is normal
 * ("our site is ..."), so links only count from the second.
 */
import type { ContactFields } from '@/lib/contactSubmit'

const LINK = /(?:https?:\/\/|www\.)[^\s<>"']+/gi
const LINK_MARKUP = /<a\s[^>]*href|\[(?:url|link)[=\]]/i
// Whole words only: "essay" must not find "seo" inside "seoul", nor "loan" inside "reloaned".
const SELLING = ['casino', 'viagra', 'cialis', 'backlinks', 'guest post', 'guest posting', 'seo services', 'seo package', 'crypto investment', 'forex', 'payday loan', 'escort', 'porn', 'sex dating', 'betting', 'buy followers', 'web traffic']
const sells = (text: string) => SELLING.find((phrase) => new RegExp(`(^|[^a-z])${phrase.replace(/ /g, '[ ]+')}s?([^a-z]|$)`, 'i').test(text))

/** Why this looks like a robot, or null when it does not. The reason never quotes the note. */
export function contactSpamReason(fields: ContactFields): string | null {
  if (LINK_MARKUP.test(fields.message) || LINK_MARKUP.test(fields.name)) return 'link markup'
  if (fields.name.match(LINK)) return 'a link in the name'
  if ((fields.message.match(LINK) || []).length >= 2) return 'several links'
  if (sells(fields.message) || sells(fields.name)) return 'a sales phrase'
  return null
}
