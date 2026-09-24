/**
 * Text going into and coming out of Slack.
 *
 * Slack does not deliver what the person typed. It escapes `&`, `<` and `>`,
 * and it rewrites anything that looks like an address: "jane@mgb.org" arrives
 * as `<mailto:jane@mgb.org|jane@mgb.org>`, "mgb.org" as `<http://mgb.org|mgb.org>`,
 * a colleague as `<@U123>`. A parser tested against hand-typed phrases passes
 * every test and then fails on the first real message — "prep a call with AT&T"
 * reaches the server as `AT&amp;T` and matches nothing.
 *
 * Going the other way, Slack treats `<…>` as a control sequence and `&` as the
 * start of an entity, so a research quote like "<5% of pilots" renders broken,
 * and a stored `<!here>` would ping a whole channel. Everything interpolated
 * into mrkdwn from a record or a person goes through `escapeSlackText` first.
 *
 * Pure.
 */

const ENTITY: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>' }

/**
 * What the person actually typed, near enough.
 *
 * `<url|label>` and `<mailto:x|label>` become the label, a bare `<url>` the url
 * (without the mailto: scheme), user mentions become `@name` when a name is
 * supplied and are dropped otherwise, channel mentions become `#channel`, and
 * special mentions (`<!here>`) are dropped. Entities are decoded LAST, so an
 * escaped `&lt;` in the text cannot be mistaken for the start of a token.
 */
export function decodeSlackText(text: string, names: Record<string, string> = {}): string {
  return String(text || '')
    .replace(/<([^<>]*)>/g, (_whole, inner: string) => {
      const [target, label] = inner.split('|', 2)
      if (target.startsWith('@')) {
        const id = target.slice(1)
        return names[id] ? `@${names[id]}` : ' '
      }
      if (target.startsWith('#')) return label ? `#${label}` : ' '
      if (target.startsWith('!')) return ' '
      if (label) return label
      return target.replace(/^mailto:/i, '')
    })
    .replace(/&(amp|lt|gt);/g, (entity) => ENTITY[entity] || entity)
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Make a record's text safe to drop into mrkdwn. */
export function escapeSlackText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Shorten already-escaped mrkdwn without cutting an entity or a `<…>` link in
 * half, which Slack would render as garbage (or reject).
 */
export function clipSlackText(value: string, max: number): string {
  const text = String(value || '')
  if (text.length <= max) return text
  let cut = Math.max(0, max - 1)
  const openLink = text.lastIndexOf('<', cut)
  if (openLink !== -1 && text.indexOf('>', openLink) >= cut) cut = openLink
  const openEntity = text.lastIndexOf('&', cut)
  if (openEntity !== -1 && openEntity > cut - 5 && text.indexOf(';', openEntity) >= cut) cut = openEntity
  return text.slice(0, cut).trimEnd() + '…'
}

/** A clickable link, with the label escaped and the url left intact. */
export function slackLink(url: string, label: string): string {
  const safeUrl = String(url || '').replace(/[<>|\s]/g, encodeURIComponent)
  if (!/^https?:\/\//i.test(safeUrl)) return escapeSlackText(label)
  return `<${safeUrl}|${escapeSlackText(label).replace(/\|/g, '/')}>`
}

/** A real mention when we know the id; a plain name otherwise. */
export function slackMention(slackUserId: string | undefined, fallbackName?: string): string {
  if (slackUserId && /^[UW][A-Z0-9]+$/.test(slackUserId)) return `<@${slackUserId}>`
  return escapeSlackText(fallbackName || 'someone')
}

/**
 * How to address Marqueta, as text that Slack turns into a working mention.
 *
 * "@Marqueta" is NOT one: she posts as the website-chat app with a per-message
 * name, so typing "@Marqueta" produces plain text that never reaches her as a
 * mention. Her bot user id renders as the real, clickable thing.
 */
export function marquetaHandle(botUserId?: string): string {
  return botUserId ? `<@${botUserId}>` : 'Marqueta (DM me, or start your message with "Marqueta,")'
}

/**
 * Slack's hard limits for the things these builders emit. Exceeding any of them
 * makes Slack reject the whole message or modal, usually with nothing more than
 * a log line to show for it.
 */
export const SLACK_LIMITS = {
  blocksPerMessage: 50,
  headerText: 150,
  sectionText: 3000,
  contextElements: 10,
  buttonText: 75,
  buttonValue: 2000,
  optionText: 75,
  modalTitle: 24,
  modalButton: 24,
  privateMetadata: 3000,
  blockId: 255,
  actionId: 255,
  fallbackText: 4000,
} as const
