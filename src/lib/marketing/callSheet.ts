/**
 * The call sheet: who to contact this week, and what to say to them.
 *
 * Everything needed for an outreach conversation already existed, in three
 * places that never met. The weekly plan said "call the top-ranked ten warm
 * contacts". The verified research knew that Mass General Brigham spun out
 * AIwithCare last December. The contact list knew nine people work there. Nobody
 * had to do the joining until someone sat down to make a call, at which point
 * they had a task with no names and a pile of records with no task.
 *
 * This joins them, and it is deliberately strict about what earns a place:
 * only research whose quote was found in the page it cites. An unverified
 * signal on a call sheet is worse than an empty call sheet, because it will be
 * read out to a customer.
 */

export type CallSheetContactInput = {
  _id?: string
  name?: string | null
  role?: string | null
  organization?: string | null
  email?: string | null
  status?: string | null
  owner?: string | null
}

export type CallSheetResearchInput = {
  organization: string
  recentSignal?: string
  reachableAbout?: string
  suggestedOfferKey?: string
  context?: string
  verification?: {
    status?: string
    evidence?: { url?: string; quote?: string; textFragmentUrl?: string }[]
  }
}

export type CallSheetOfferInput = { key?: string; title?: string; oneLiner?: string }

export type CallSheetEntry = {
  organization: string
  contacts: CallSheetContactInput[]
  /** Only what the cited quote proves. */
  signal: string
  quote: string
  /** Deep link that highlights the quote in the source. */
  sourceUrl: string
  /** The concrete opening this justifies. */
  opening: string
  offer: CallSheetOfferInput | null
  /** Background that is NOT verified and must not be repeated as fact. */
  context: string
}

const normalise = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/**
 * Build the week's call sheet.
 *
 * Ordered by how much of a foothold we have: an organisation where several
 * people already know us is a warmer start than a single unknown contact, and
 * it is the same reasoning the audience brief uses to pick a lead segment.
 */
export function buildOutreachCallSheet(input: {
  research: CallSheetResearchInput[]
  contacts: CallSheetContactInput[]
  offers?: CallSheetOfferInput[]
  limit?: number
  maxContactsPerOrg?: number
}): CallSheetEntry[] {
  const limit = input.limit ?? 5
  const maxContacts = input.maxContactsPerOrg ?? 4
  const offers = input.offers || []

  const contactsByOrg = new Map<string, CallSheetContactInput[]>()
  for (const contact of input.contacts) {
    const key = normalise(contact.organization)
    if (!key) continue
    if (!contactsByOrg.has(key)) contactsByOrg.set(key, [])
    contactsByOrg.get(key)!.push(contact)
  }

  const entries: CallSheetEntry[] = []
  for (const research of input.research) {
    // Verified only. An unverified signal read out to a customer is the exact
    // failure the whole verification pipeline exists to prevent, so it does not
    // get to appear on the page where someone picks up the phone.
    if (research.verification?.status !== 'verified') continue
    const evidence = research.verification?.evidence?.[0]
    if (!research.recentSignal || !research.reachableAbout || !evidence?.quote) continue

    const contacts = (contactsByOrg.get(normalise(research.organization)) || [])
      // Someone already in conversation is not a cold-outreach target.
      .filter((contact) => !['contacted', 'responded', 'meeting', 'opportunity'].includes(String(contact.status || '')))

    if (contacts.length === 0) continue

    entries.push({
      organization: research.organization,
      contacts: contacts.slice(0, maxContacts),
      signal: research.recentSignal,
      quote: evidence.quote,
      sourceUrl: evidence.textFragmentUrl || evidence.url || '',
      opening: research.reachableAbout,
      offer: offers.find((offer) => offer.key && offer.key === research.suggestedOfferKey) || null,
      context: research.context || '',
    })
  }

  return entries
    .sort((a, b) => b.contacts.length - a.contacts.length || a.organization.localeCompare(b.organization))
    .slice(0, limit)
}

/**
 * A person's first name, when we can get one honestly.
 *
 * The newsletter import put the email address into `name` for most records, so
 * a naive greeting produces "Hi scott.shreeve@crossoverhealth.com," — which
 * tells the recipient immediately that a machine wrote it. A first.last local
 * part is a safe inference; anything else is not, and gets no name at all.
 */
export function firstNameFor(contact: { name?: string | null; email?: string | null }): string {
  const name = String(contact.name || '').trim()
  if (name && !name.includes('@')) {
    const first = name.split(/\s+/)[0]
    if (first.length > 1) return first
  }
  const local = String(contact.email || name || '').split('@')[0]
  // Only a separated local part is safe. "nate.murray" is clearly a first name
  // followed by a surname; "lgartley" is an initial glued to one, and guessing
  // gives you "Lgartley" — which is worse than not using a name at all.
  if (!/[._-]/.test(local)) return ''
  const part = local.split(/[._-]/)[0]
  if (part.length < 3 || /\d/.test(part)) return ''
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
}

/**
 * A first message that offers help rather than a pitch.
 *
 * The studio's position is that it ships things, so the opening that fits is
 * "I saw what you are doing and here is a thought", not "here is our capability
 * deck". The draft leads with THEIR news, then what we noticed about it, then a
 * small concrete offer. It is a starting point to edit, never something to send
 * unread.
 *
 * The opening line is written by research as a noun phrase as often as a
 * sentence, so it is introduced rather than dropped in — otherwise it reads as
 * a fragment glued onto the news.
 */
export function draftOutreachNote(entry: CallSheetEntry, senderName = 'Juhan'): string {
  const firstName = firstNameFor(entry.contacts[0] || {})
  const greeting = firstName ? 'Hi ' + firstName + ',' : 'Hi,'
  const signal = entry.signal.trim().replace(/\.$/, '')
  const opening = entry.opening.trim().replace(/\s+/g, ' ')

  const offerLine = entry.offer?.title
    ? 'If it would help, we do a short fixed-scope piece of work called ' +
      entry.offer.title +
      (entry.offer.oneLiner ? ' — ' + entry.offer.oneLiner.trim().replace(/[.\s]+$/, '').toLowerCase() : '') +
      '. Happy to just talk it through either way.'
    : 'Happy to talk it through if it would be useful — no pitch attached.'

  return [
    greeting,
    '',
    'I saw that ' + signal + '.',
    '',
    'What caught my eye: ' + opening,
    '',
    offerLine,
    '',
    '— ' + senderName + ', GoInvo',
  ].join('\n')
}
