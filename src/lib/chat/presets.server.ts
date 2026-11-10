import 'server-only'
import type { SanityClient } from '@sanity/client'
import { personFromName } from '@/lib/chat/citation'
import { createChatMessage, type SanityChatMessage } from '@/lib/chat/validation'
import { GOINVO, SITE_ORIGIN, rightsForPath, rightsNamedIn, sitePath, type PieceRights } from '@/lib/chat/pieceRights'
import {
  citationAskReply,
  citationReply,
  detectPresetIntent,
  formatNamedIn,
  greetingReply,
  humanHasReplied,
  licenseReply,
  licenseUnknownReply,
  pendingPreset,
  pieceAskReply,
  type PresetHistoryMessage,
  type PresetReply,
  type ResolvedPiece,
} from '@/lib/chat/presets'

/** Only pages that are a piece of work can be cited or licensed; anywhere else we ask which piece. */
const PIECE_PATH = /^\/(vision|work)\/([a-z0-9-]+)$/

interface CmsPiece {
  title?: string
  date?: string
  authors?: (string | null)[] | null
}

const CMS_PIECE_QUERY = `*[_type in ["feature", "caseStudy"] && slug.current == $slug][0]{
  title,
  date,
  "authors": authors[]{ "name": coalesce(author->name, @->name) }.name
}`

/** "Apr.2020" -> "2020" (the CMS stores month.year). */
function yearOf(date: string | undefined) {
  return date?.match(/\b(19|20)\d{2}\b/)?.[0]
}

function titleFromPageTitle(pageTitle: string | undefined) {
  return pageTitle?.replace(/\s*[|–-]\s*GoInvo\s*$/i, '').trim() || undefined
}

function titleFromSlug(slug: string) {
  return slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export async function resolvePiece(
  client: Pick<SanityClient, 'fetch'>,
  input: { path?: string; rights?: PieceRights; pageTitle?: string },
): Promise<ResolvedPiece | undefined> {
  const rights = input.rights ?? rightsForPath(input.path)
  const path = rights?.path ?? input.path
  const match = path ? PIECE_PATH.exec(path) : null
  if (!rights && !match) return undefined

  let cms: CmsPiece | null = null
  if (match) {
    try {
      cms = await client.fetch<CmsPiece | null>(CMS_PIECE_QUERY, { slug: match[2] })
    } catch (error) {
      console.error('Chat preset: piece lookup failed', error)
    }
  }

  const cmsAuthors = (cms?.authors || []).filter((name): name is string => Boolean(name)).map(personFromName)
  return {
    title: rights?.title || cms?.title || titleFromPageTitle(input.pageTitle) || titleFromSlug(match![2]),
    sentenceTitle: rights?.sentenceTitle,
    url: `${SITE_ORIGIN}${path}`,
    authors: rights?.authors || (cmsAuthors.length ? cmsAuthors : [GOINVO]),
    year: rights?.year || yearOf(cms?.date),
    publisher: 'GoInvo',
    rights,
  }
}

/** The piece a message points at: a link in it, a piece it names, else the page it was sent from. */
async function pieceFor(
  client: Pick<SanityClient, 'fetch'>,
  text: string,
  page: { url?: string; title?: string },
  allowPage = true,
) {
  const linked = text.match(/https?:\/\/[^\s)>\]]+|(?:www\.)?goinvo\.com\/[^\s)>\]]*/i)?.[0]
  const linkedPath = linked ? sitePath(linked.startsWith('http') ? linked : `https://${linked}`) : undefined
  if (linkedPath) {
    const piece = await resolvePiece(client, { path: linkedPath })
    if (piece) return piece
  }
  const named = rightsNamedIn(text)
  if (named) return resolvePiece(client, { rights: named })
  if (!allowPage) return undefined
  return resolvePiece(client, { path: sitePath(page.url), pageTitle: page.title })
}

/** The thread message for a preset reply, a moment after the visitor's so it sorts after it. */
export function presetMessage(plan: PresetPlan, after: string): SanityChatMessage {
  return createChatMessage({
    authorType: 'team',
    authorName: 'GoInvo',
    text: plan.reply.text,
    createdAt: new Date(Date.parse(after) + 1).toISOString(),
    fallbackKind: 'preset',
    presetKind: plan.reply.kind,
    presetCard: plan.reply.card,
  })
}

export interface PresetPlan {
  reply: PresetReply
  /** The visitor's message only answered our question (a format, which piece); the team need not be pinged. */
  answersPreset: boolean
}

/**
 * The instant reply to a visitor's message, or null when it is for a person to answer.
 * `history` is the thread BEFORE this message.
 */
export async function planPresetReply(input: {
  client: Pick<SanityClient, 'fetch'>
  text: string
  history: PresetHistoryMessage[]
  page: { url?: string; title?: string }
  now: Date
}): Promise<PresetPlan | null> {
  const { client, text, history, page, now } = input
  const pending = pendingPreset(history)

  // Answering a question we just asked: a format, or which piece.
  if (pending && (pending.kind === 'citationAsk' || pending.kind === 'citation') && text.trim().split(/\s+/).length <= 6) {
    const format = formatNamedIn(text, false)
    if (format) {
      const piece = await resolvePiece(client, { path: sitePath(pending.piece.url) })
      if (piece) return { reply: citationReply(piece, format, now), answersPreset: true }
    }
  }
  if (pending?.kind === 'pieceAsk') {
    const piece = await pieceFor(client, text, page, false)
    if (piece) {
      if (pending.intent === 'citation') return { reply: citationAskReply(piece), answersPreset: true }
      return { reply: piece.rights ? licenseReply(piece, text, false) : licenseUnknownReply(piece), answersPreset: true }
    }
  }

  const intent = detectPresetIntent(text)
  if (!intent) return null

  if (intent.kind === 'greeting') {
    // Once, and never over a person who is already talking to them.
    if (humanHasReplied(history) || history.some((message) => message.presetKind === 'greeting')) return null
    const piece = await resolvePiece(client, { path: sitePath(page.url), pageTitle: page.title })
    return { reply: greetingReply(piece), answersPreset: false }
  }

  const piece = await pieceFor(client, text, page)
  if (intent.kind === 'citation') {
    if (!piece) return { reply: pieceAskReply('citation'), answersPreset: false }
    return { reply: intent.format ? citationReply(piece, intent.format, now) : citationAskReply(piece), answersPreset: false }
  }

  if (!piece) return { reply: pieceAskReply('license'), answersPreset: false }
  return {
    reply: piece.rights ? licenseReply(piece, text, intent.alsoCite) : licenseUnknownReply(piece),
    answersPreset: false,
  }
}
