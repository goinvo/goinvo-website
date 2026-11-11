/**
 * Instant replies the website chat gives before a person answers: a greeting back, a
 * citation in the format someone asks for, and what a piece's license lets them do.
 *
 * No model call: every answer is a lookup (the piece's record, its sourced license),
 * so it is instant, free and never invents a license. The team still sees every
 * conversation in Slack. Pure; the server resolves pieces in presets.server.ts.
 */
import {
  CITATION_FORMATS,
  citationFormatName,
  citationPlainText,
  formatCitation,
  type CitablePiece,
  type CitationFormat,
  type CitationSegment,
} from '@/lib/chat/citation'
import {
  LICENSES,
  PERMISSION_ROWS,
  type LicenseId,
  type PermissionId,
  type PermissionMark,
  type PieceRights,
} from '@/lib/chat/pieceRights'

export type PresetKind = 'greeting' | 'citationAsk' | 'citation' | 'license' | 'licenseUnknown' | 'pieceAsk'

export interface PieceRef {
  title: string
  url: string
}

export interface ChatChip {
  label: string
  /** What is sent when the chip is pressed. */
  message: string
}

export type ChatCard =
  | { kind: 'greeting'; lead: string; chips: ChatChip[] }
  | { kind: 'pieceAsk'; lead: string; intent: 'citation' | 'license' }
  | { kind: 'citationAsk'; lead: string; piece: PieceRef; chips: ChatChip[] }
  | {
      kind: 'citation'
      lead: string
      piece: PieceRef
      format: CitationFormat
      segments: CitationSegment[]
      note: string
      chips: ChatChip[]
    }
  | {
      kind: 'license'
      lead: string
      piece: PieceRef
      columns: { id: LicenseId; heading: string; url: string; relevant: boolean }[]
      rows: { id: PermissionId; label: string; relevant: boolean; cells: { mark: PermissionMark; text: string }[] }[]
      source: { label: string; url?: string }
      chips: ChatChip[]
    }
  | { kind: 'licenseUnknown'; lead: string; piece: PieceRef; chips: ChatChip[] }

/** A reply that answers the visitor; anything else is still waiting on a person. */
export function presetAwaitsTeam(kind: PresetKind) {
  return kind === 'licenseUnknown'
}

// ---------------------------------------------------------------- detection

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const GREETING_WORD =
  "(?:hi+|hello+|hell?o there|hey+|heya|hiya|howdy|yo|sup|hola|greetings|good (?:morning|afternoon|evening|day)|what'?s up|whats? up|wh?at'?s good|wassup|test(?:ing)?|anyone (?:there|here|around|home)|anybody (?:there|here|around)|is (?:anyone|anybody) (?:there|here|around|home)|hello world)"
const GREETING_TAIL = "(?:there|chat|team|everyone|everybody|all|folks|guys|friends?|goinvo|y'?all|again|1 ?2 ?3|123|one two three|test)"
const GREETING = new RegExp(`^(?:${GREETING_WORD} ?)+(?:${GREETING_TAIL} ?)*$`)

/** A message that is only a hello or a test: "Hi", "Testing", "What's up, chat?". */
export function isGreeting(text: string) {
  const plain = normalise(text)
  if (!plain) return /^[\p{Extended_Pictographic}\s‍️]+$/u.test(text.trim()) // 👋 on its own
  return plain.split(' ').length <= 6 && GREETING.test(plain)
}

const CITATION = /\b(cite|cites|citing|cited|citation|citations|bibliography|bibtex|works cited)\b|\breference (?:it|this|that|your|the)\b.*\b(paper|thesis|dissertation|essay|article|report|bibliography|work)\b/i
const LICENSE =
  /\b(licen[cs]e[ds]?|licensing|copyright(?:ed)?|creative commons|cc[- ]?by|public domain|permission|permitted|allowed to|ok to|okay to|free to (?:use|share|print)|reuse|re-use|redistribut\w*|distribut\w*|reproduc\w*|reprint\w*|(?:can|may) (?:i|we) (?:use|share|print|post|publish|copy|include|adapt|modify|translate|sell|put|reproduce))\b|\bcc\b(?! me\b)/i

/** Formats named outright. Chicago/Harvard/Vancouver also name places, so a first message needs "style" or "format" next to them. */
const FORMAT_WORDS: { format: CitationFormat; bare: RegExp; strict: RegExp }[] = [
  { format: 'apa', bare: /\bapa\b/i, strict: /\bapa\b/i },
  { format: 'mla', bare: /\bmla\b/i, strict: /\bmla\b/i },
  { format: 'bibtex', bare: /\b(bibtex|bib tex|latex|\.bib)\b/i, strict: /\b(bibtex|bib tex|latex)\b/i },
  { format: 'ama', bare: /\b(ama|american medical)\b/i, strict: /\b(ama (?:style|format|citation)|american medical association)\b/i },
  { format: 'chicago', bare: /\b(chicago|turabian)\b/i, strict: /\b(chicago|turabian) (?:style|format|citation|manual)|\bturabian\b/i },
  { format: 'harvard', bare: /\bharvard\b/i, strict: /\bharvard (?:style|format|citation|referencing|reference)/i },
  { format: 'vancouver', bare: /\b(vancouver|nlm|icmje)\b/i, strict: /\bvancouver (?:style|format|citation|referencing)|\bnlm\b/i },
]

export function formatNamedIn(text: string, strict: boolean): CitationFormat | undefined {
  return FORMAT_WORDS.find((entry) => (strict ? entry.strict : entry.bare).test(text))?.format
}

/** What the visitor wants to do, so those rows of the license table come first. */
const WANTS: { id: PermissionId; pattern: RegExp }[] = [
  { id: 'share', pattern: /\b(distribut\w*|redistribut\w*|share|sharing|send|hand(?:ing)? (?:it )?out|handouts?|post|upload|circulat\w*|publish\w*|put (?:it|this) (?:in|on))\b/i },
  { id: 'academic', pattern: /\b(academic\w*|reference|references|cite|citing|citation|paper|thesis|dissertation|journal|class|course|teach\w*|lecture|students?|research|school|universit\w*|textbook|curriculum|presentation|slides?)\b/i },
  { id: 'print', pattern: /\b(print\w*|posters?|reprint\w*|reproduc\w*|cop(?:y|ies)|photocop\w*|frame|wall)\b/i },
  { id: 'adapt', pattern: /\b(adapt\w*|modif\w*|change|changing|edit\w*|remix\w*|translat\w*|derivative|alter\w*|crop|build on|customi[sz]\w*)\b/i },
  { id: 'commercial', pattern: /\b(commercial\w*|sell|selling|sale|profit|business|company|clients?|products?|paid|monetiz\w*)\b/i },
  { id: 'credit', pattern: /\b(credit|attribut\w*|acknowledg\w*)\b/i },
  { id: 'endorse', pattern: /\b(logo|brand|endorse\w*|partner\w*|affiliat\w*)\b/i },
]

export function wantedPermissions(text: string): PermissionId[] {
  return WANTS.filter((want) => want.pattern.test(text)).map((want) => want.id)
}

export type PresetIntent =
  | { kind: 'greeting' }
  | { kind: 'citation'; format?: CitationFormat }
  | { kind: 'license'; wants: PermissionId[]; alsoCite: boolean }

/** What a fresh visitor message asks for, or null for anything a person should answer. */
export function detectPresetIntent(text: string): PresetIntent | null {
  if (isGreeting(text)) return { kind: 'greeting' }
  const cites = CITATION.test(text)
  if (LICENSE.test(text)) {
    // "use it as an academic reference" is a licensing question that mentions citing;
    // only an explicit "cite"/"citation" also earns the citation offer.
    return { kind: 'license', wants: wantedPermissions(text), alsoCite: /\b(cite|citing|citation)\b/i.test(text) }
  }
  if (cites) return { kind: 'citation', format: formatNamedIn(text, true) }
  return null
}

// ---------------------------------------------------------------- conversation state

export interface PresetHistoryMessage {
  authorType: 'visitor' | 'team' | 'system'
  fallbackKind?: string
  presetKind?: PresetKind
  presetCard?: string
}

export function parseCard(json: string | undefined): ChatCard | undefined {
  if (!json) return undefined
  try {
    const card = JSON.parse(json) as ChatCard
    return card && typeof card === 'object' && typeof card.kind === 'string' && typeof card.lead === 'string' ? card : undefined
  } catch {
    return undefined
  }
}

/** A person from GoInvo has answered in this thread (presets and the no-response note are not people). */
export function humanHasReplied(history: PresetHistoryMessage[]) {
  return history.some((message) => message.authorType === 'team' && !message.fallbackKind)
}

/** The reply the visitor's message answers, when the last thing said was a preset asking them something. */
export function pendingPreset(history: PresetHistoryMessage[]) {
  const last = history.at(-1)
  if (!last || last.fallbackKind !== 'preset') return undefined
  return parseCard(last.presetCard)
}

// ---------------------------------------------------------------- composing replies

export interface ResolvedPiece extends CitablePiece {
  rights?: PieceRights
}

export const pieceRef = (piece: ResolvedPiece): PieceRef => ({ title: piece.title, url: piece.url })

const quoteTitle = (title: string) => `“${title}”`

export function formatChips(except?: CitationFormat): ChatChip[] {
  return CITATION_FORMATS.filter((format) => format.id !== except).map((format) => ({ label: format.label, message: format.label }))
}

export interface PresetReply {
  kind: PresetKind
  card: ChatCard
  /** Plain text for the thread record, Slack and email, where cards do not render. */
  text: string
}

export function greetingReply(piece?: ResolvedPiece): PresetReply {
  const lead = piece
    ? `Hi there! Thanks for reaching out. Do you have any questions? Ask away and someone from GoInvo will reply here. I can also pull up how to cite ${quoteTitle(piece.title)} or what you're free to do with it.`
    : 'Hi there! Thanks for reaching out. Do you have any questions? Ask away and someone from GoInvo will reply here.'
  const chips = piece
    ? [
        { label: 'How do I cite this?', message: `How do I cite ${piece.title}?` },
        { label: 'Can I reuse this?', message: `What license is ${piece.title} under? Can I reuse it?` },
      ]
    : []
  return { kind: 'greeting', card: { kind: 'greeting', lead, chips }, text: lead }
}

export function pieceAskReply(intent: 'citation' | 'license'): PresetReply {
  const lead =
    intent === 'citation'
      ? "Happy to help with a citation. Which piece is it? Paste its link or type its name, and I'll format it for you."
      : "Happy to check. Which piece is it? Paste its link or type its name, and I'll pull up its license."
  return { kind: 'pieceAsk', card: { kind: 'pieceAsk', lead, intent }, text: lead }
}

export function citationAskReply(piece: ResolvedPiece): PresetReply {
  const lead = `It looks like you're asking for a citation for ${quoteTitle(piece.title)}. Which format would you prefer?`
  return {
    kind: 'citationAsk',
    card: { kind: 'citationAsk', lead, piece: pieceRef(piece), chips: formatChips() },
    text: `${lead} (${CITATION_FORMATS.map((format) => format.label).join(', ')})`,
  }
}

export function citationReply(piece: ResolvedPiece, format: CitationFormat, now: Date): PresetReply {
  const segments = formatCitation(piece, format, now)
  const lead = `Here's ${quoteTitle(piece.title)} in ${citationFormatName(format)}:`
  const note = /Accessed|cited|Retrieved/.test(citationPlainText(segments))
    ? "The access date is today's. Check it against your style guide before you submit."
    : 'Check it against your style guide before you submit.'
  return {
    kind: 'citation',
    card: { kind: 'citation', lead, piece: pieceRef(piece), format, segments, note, chips: formatChips(format) },
    text: `${lead}\n\n${citationPlainText(segments)}`,
  }
}

function licenseList(piece: ResolvedPiece) {
  const grants = piece.rights!.licenses
  const phrase = (grant: (typeof grants)[number]) => `${LICENSES[grant.license].name} (${LICENSES[grant.license].short})`
  if (grants.length === 1) return `${quoteTitle(piece.title)} is under ${phrase(grants[0])}.`
  // "The content and poster of “X” are under …, and its code is under Apache 2.0."
  const verb = (covers: string) => (/ and |s$/.test(covers) ? 'are' : 'is')
  const [first, ...rest] = grants
  return `The ${first.covers} of ${quoteTitle(piece.title)} ${verb(first.covers)} under ${phrase(first)}, and its ${rest
    .map((grant) => `${grant.covers} ${verb(grant.covers)} under ${LICENSES[grant.license].short}`)
    .join(', ')}.`
}

export function licenseReply(piece: ResolvedPiece, request: string, alsoCite: boolean): PresetReply {
  const rights = piece.rights!
  const wants = wantedPermissions(request)
  // The column the question is about: the grant whose keywords it uses, else the content's.
  const asked = rights.licenses.findIndex((grant) => grant.coversKeywords?.test(request))
  const column = asked === -1 ? 0 : asked
  const columns = rights.licenses.map((grant, index) => ({
    id: grant.license,
    heading: `${grant.covers.charAt(0).toUpperCase()}${grant.covers.slice(1)} (${LICENSES[grant.license].short})`,
    url: LICENSES[grant.license].url,
    relevant: rights.licenses.length > 1 && index === column,
  }))

  const all = PERMISSION_ROWS.map((row) => ({
    id: row.id,
    label: row.label,
    relevant: wants.includes(row.id),
    cells: rights.licenses.map((grant) => LICENSES[grant.license].cells[row.id]),
  }))
  // What they asked about first, then the condition that comes with it (credit), then the rest.
  const relevant = all.filter((row) => row.relevant)
  const credit = all.filter((row) => row.id === 'credit' && !row.relevant && relevant.length)
  const rows = [...relevant, ...credit, ...all.filter((row) => !relevant.includes(row) && !credit.includes(row))]

  const answers = relevant.map((row) => row.cells[column].mark)
  const opener = answers.length && answers.every((mark) => mark === 'yes') ? 'Yes, you can. ' : ''
  const lead = `${opener}${licenseList(piece)} Here's what you can and cannot do with it:`
  const source = { label: rights.source.label, ...('url' in rights.source ? { url: rights.source.url } : {}) }
  const chips: ChatChip[] = alsoCite || relevant.some((row) => row.id === 'academic') ? [{ label: 'Cite it for me', message: `How do I cite ${piece.title}?` }] : []

  const plainRows = rows.map((row) => `${row.relevant ? '* ' : ''}${row.label}: ${row.cells.map((cell) => cell.text).join(' / ')}`)
  return {
    kind: 'license',
    card: { kind: 'license', lead, piece: pieceRef(piece), columns, rows, source, chips },
    text: [lead, '', ...plainRows, '', `Source: ${source.label}${source.url ? ` (${source.url})` : ''}`].join('\n'),
  }
}

export function licenseUnknownReply(piece: ResolvedPiece): PresetReply {
  const lead = `I couldn't find a license stated for ${quoteTitle(piece.title)}, so I won't guess. Someone from GoInvo will confirm here. In the meantime I can format a citation for it.`
  return {
    kind: 'licenseUnknown',
    card: { kind: 'licenseUnknown', lead, piece: pieceRef(piece), chips: [{ label: 'Cite it for me', message: `How do I cite ${piece.title}?` }] },
    text: lead,
  }
}

/** One line for the team in Slack: what the chat already said, and whether a person is needed. */
export function presetSlackSummary(reply: PresetReply) {
  const card = reply.card
  switch (card.kind) {
    case 'greeting':
      return 'greeted them and asked what they need.'
    case 'pieceAsk':
      return `asked which piece they want ${card.intent === 'citation' ? 'a citation' : 'the license'} for.`
    case 'citationAsk':
      return `asked which citation format they want for “${card.piece.title}”.`
    case 'citation':
      return `sent the ${citationFormatName(card.format)} citation for “${card.piece.title}”.`
    case 'license':
      return `sent the license table for “${card.piece.title}” (${card.columns.map((column) => column.heading).join('; ')}).`
    case 'licenseUnknown':
      return `no license is on file for “${card.piece.title}”, so I told them someone will confirm. Please reply in this thread.`
  }
}
