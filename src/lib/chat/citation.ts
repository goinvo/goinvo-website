/**
 * Citations for a GoInvo web piece in the formats people ask the chat for. Pure: the
 * piece and "today" come in, styled segments come out (italic where the style wants it),
 * so the widget can show italics and copy both rich and plain text.
 */
import type { CitationAuthor } from '@/lib/chat/pieceRights'

export const CITATION_FORMATS = [
  { id: 'apa', label: 'APA', name: 'APA (7th edition)' },
  { id: 'mla', label: 'MLA', name: 'MLA (9th edition)' },
  { id: 'chicago', label: 'Chicago', name: 'Chicago (author-date)' },
  { id: 'harvard', label: 'Harvard', name: 'Harvard' },
  { id: 'ama', label: 'AMA', name: 'AMA (11th edition)' },
  { id: 'vancouver', label: 'Vancouver', name: 'Vancouver' },
  { id: 'bibtex', label: 'BibTeX', name: 'BibTeX' },
] as const

export type CitationFormat = (typeof CITATION_FORMATS)[number]['id']

export interface CitablePiece {
  title: string
  /** APA's sentence-case title, when the heuristic would get a proper noun wrong. */
  sentenceTitle?: string
  url: string
  authors: CitationAuthor[]
  year?: string
  publisher: string
}

export interface CitationSegment {
  text: string
  italic?: boolean
}

export function citationFormatName(format: CitationFormat) {
  return CITATION_FORMATS.find((entry) => entry.id === format)?.name ?? format
}

export function citationPlainText(segments: CitationSegment[]) {
  return segments.map((segment) => segment.text).join('')
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Today's date parts in Boston, so a late-evening visitor is not cited "tomorrow". */
function today(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** "Edwin Choi" -> { given: "Edwin", family: "Choi" }; keeps "van Woerden" together. */
export function personFromName(name: string): CitationAuthor {
  const words = name.trim().split(/\s+/)
  if (words.length < 2) return { org: name.trim() }
  let familyStart = words.length - 1
  while (familyStart > 1 && /^(van|von|de|der|den|del|da|di|du|la|le|st\.?)$/i.test(words[familyStart - 1])) familyStart--
  return { given: words.slice(0, familyStart).join(' '), family: words.slice(familyStart).join(' ') }
}

const isOrg = (author: CitationAuthor): author is { org: string } => 'org' in author

/** "Ernst-Jan" -> "E.-J.", "Annie Lakey" -> "A. L." */
function initials(given: string, withDots = true) {
  return given
    .split(/\s+/)
    .map((part) =>
      part
        .split('-')
        .map((piece) => piece.charAt(0).toUpperCase() + (withDots ? '.' : ''))
        .join('-'),
    )
    .join(withDots ? ' ' : '')
}

function ensurePeriod(text: string) {
  return /[.?!]$/.test(text) ? text : `${text}.`
}

/** APA sentence case: keep acronyms and inner-capital words (US, AI, GoInvo), capitalise after a colon. */
export function sentenceCase(title: string) {
  let capitaliseNext = true
  return title
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s+$/.test(word)) return word
      // Any capital or digit after the first letter marks a name or acronym: GoInvo, US, COVID-19.
      const keep = /[A-Z\d]/.test(word.slice(1))
      const out = capitaliseNext
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : keep
          ? word
          : word.toLowerCase()
      capitaliseNext = /:$/.test(word)
      return out
    })
    .join('')
}

function stripScheme(url: string) {
  return url.replace(/^https?:\/\//, '')
}

export function formatCitation(piece: CitablePiece, format: CitationFormat, now: Date): CitationSegment[] {
  const people = piece.authors.filter((author) => !isOrg(author)) as { given: string; family: string }[]
  const orgAuthor = people.length === 0
  const authorIsPublisher = orgAuthor && piece.authors.every((author) => isOrg(author) && author.org === piece.publisher)
  const orgName = orgAuthor ? (piece.authors[0] as { org: string } | undefined)?.org || piece.publisher : ''
  const { year: ty, month: tm, day: td } = today(now)
  const year = piece.year

  switch (format) {
    case 'apa': {
      const apa = people.map((p) => `${p.family}, ${initials(p.given)}`)
      const names = orgAuthor
        ? orgName
        : apa.length === 1
          ? apa[0]
          : apa.length <= 20
            ? `${apa.slice(0, -1).join(', ')}, & ${apa.at(-1)}`
            : `${apa.slice(0, 19).join(', ')}, . . . ${apa.at(-1)}`
      const title = piece.sentenceTitle || sentenceCase(piece.title)
      const site = authorIsPublisher ? '' : ` ${piece.publisher}.`
      const tail = year ? ` ${piece.url}` : ` Retrieved ${MONTHS[tm - 1]} ${td}, ${ty}, from ${piece.url}`
      return [{ text: `${ensurePeriod(names)} (${year || 'n.d.'}). ` }, { text: title, italic: true }, { text: `.${site}${tail}` }]
    }
    case 'mla': {
      const names = orgAuthor
        ? authorIsPublisher ? '' : `${orgName}. `
        : people.length === 1
          ? `${ensurePeriod(`${people[0].family}, ${people[0].given}`)} `
          : people.length === 2
            ? `${people[0].family}, ${people[0].given}, and ${people[1].given} ${people[1].family}. `
            : `${people[0].family}, ${people[0].given}, et al. `
      const accessed = `Accessed ${td} ${MONTHS[tm - 1].slice(0, 3)}${tm === 5 ? '' : '.'} ${ty}.`
      return [
        { text: `${names}“${piece.title}.” ` },
        { text: piece.publisher, italic: true },
        { text: `, ${year ? `${year}, ` : ''}${stripScheme(piece.url)}. ${accessed}` },
      ]
    }
    case 'chicago': {
      // Up to ten authors are listed; more than ten, the first seven then "et al."
      const list = people.length > 10 ? people.slice(0, 7) : people
      const rest = list.slice(1).map((p) => `${p.given} ${p.family}`)
      const names = orgAuthor
        ? orgName
        : people.length > 10
          ? `${list[0].family}, ${list[0].given}, ${rest.join(', ')}, et al`
          : rest.length === 0
            ? `${list[0].family}, ${list[0].given}`
            : `${list[0].family}, ${list[0].given}, ${rest.length > 1 ? `${rest.slice(0, -1).join(', ')}, ` : ''}and ${rest.at(-1)}`
      const accessed = year ? '' : ` Accessed ${MONTHS[tm - 1]} ${td}, ${ty}.`
      return [{ text: `${ensurePeriod(names)} ${year || 'n.d.'}. “${piece.title}.” ${piece.publisher}.${accessed} ${piece.url}.` }]
    }
    case 'harvard': {
      const short = (p: { given: string; family: string }) => `${p.family}, ${initials(p.given)}`
      const names = orgAuthor
        ? orgName
        : people.length >= 4
          ? `${short(people[0])} et al.`
          : people.length === 1
            ? short(people[0])
            : `${people.slice(0, -1).map(short).join(', ')} and ${short(people.at(-1)!)}`
      return [
        { text: `${names} (${year || 'no date'}) ` },
        { text: piece.title, italic: true },
        { text: `. ${piece.publisher}. Available at: ${piece.url} (Accessed: ${td} ${MONTHS[tm - 1]} ${ty}).` },
      ]
    }
    case 'ama': {
      const short = (p: { given: string; family: string }) => `${p.family} ${initials(p.given, false)}`
      const names = orgAuthor ? orgName : people.length > 6 ? `${people.slice(0, 3).map(short).join(', ')}, et al` : people.map(short).join(', ')
      return [{ text: `${names}. ${piece.title}. ${piece.publisher}. ${year ? `Published ${year}. ` : ''}Accessed ${MONTHS[tm - 1]} ${td}, ${ty}. ${piece.url}` }]
    }
    case 'vancouver': {
      const short = (p: { given: string; family: string }) => `${p.family} ${initials(p.given, false)}`
      const names = orgAuthor ? orgName : people.length > 6 ? `${people.slice(0, 6).map(short).join(', ')}, et al` : people.map(short).join(', ')
      const cited = `${ty} ${MONTHS[tm - 1].slice(0, 3)} ${td}`
      return [{ text: `${names}. ${piece.title} [Internet]. ${piece.publisher}; ${year || '[date unknown]'} [cited ${cited}]. Available from: ${piece.url}` }]
    }
    case 'bibtex': {
      const firstWord = piece.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').find((word) => word.length > 3 && !/^(the|understanding|about|with|from)$/.test(word)) || 'piece'
      const keyName = orgAuthor ? orgName.toLowerCase().replace(/[^a-z0-9]/g, '') : people[0].family.toLowerCase().replace(/[^a-z0-9]/g, '')
      const author = orgAuthor ? `{${orgName}}` : people.map((p) => `${p.family}, ${p.given}`).join(' and ')
      const iso = `${ty}-${String(tm).padStart(2, '0')}-${String(td).padStart(2, '0')}`
      const lines = [
        `@misc{${keyName}${year || ''}${firstWord},`,
        `  author = {${author}},`,
        `  title = {{${piece.title}}},`,
        ...(year ? [`  year = {${year}},`] : []),
        `  publisher = {${piece.publisher}},`,
        `  howpublished = {\\url{${piece.url}}},`,
        `  note = {Accessed: ${iso}}`,
        '}',
      ]
      return [{ text: lines.join('\n') }]
    }
  }
}
