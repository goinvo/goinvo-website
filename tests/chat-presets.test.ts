import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { siteConfig } from '@/lib/config'
import { citationPlainText, formatCitation, personFromName, sentenceCase, type CitablePiece } from '@/lib/chat/citation'
import { getNoResponseFallback } from '@/lib/chat/noResponse'
import { LICENSES, PIECE_RIGHTS, rightsForPath, rightsNamedIn, sitePath } from '@/lib/chat/pieceRights'
import { detectPresetIntent, isGreeting, licenseReply, parseCard, type ResolvedPiece } from '@/lib/chat/presets'
import { planPresetReply, presetMessage, resolvePiece } from '@/lib/chat/presets.server'
import { toPublicMessages, type SanityChatMessage } from '@/lib/chat/validation'

/**
 * Rules: the website chat greets a hello back, formats a citation in the format asked
 * for, and states a piece's license ONLY from a source GoInvo publishes, with the
 * permissions the visitor asked about first. A person answers everything else.
 */

const NOW = new Date('2026-11-10T15:00:00.000Z')
const DOH_PAGE = 'https://www.goinvo.com/vision/determinants-of-health'

// The CMS as the chat reads it: title, month.year date, author names.
const CMS: Record<string, { title: string; date?: string; authors?: string[] }> = {
  'determinants-of-health': { title: 'Determinants of Health', date: 'Apr.2020', authors: ['Edwin Choi', 'Juhan Sonin'] },
  'us-healthcare-problems': { title: 'US Healthcare Problems', date: 'Apr.2021', authors: ['Hannah Sennik', 'Juhan Sonin', 'Eric Benoit'] },
  'eligibility-engine': { title: 'Eligibility Engine', date: 'Jan.2025', authors: ['Jane Doe'] },
}
const client = {
  fetch: async (_query: string, params: { slug: string }) => CMS[params.slug] ?? null,
} as never

describe('greetings', () => {
  it.each(['Hi', 'Testing', "What's up, chat?", 'Hello', 'hey there!', 'Good morning', 'test 123', 'Is anyone there?', '👋', 'Hiiii', 'hello hello', 'What’s up chat', 'Yo GoInvo'])(
    'greets back "%s"',
    (text) => expect(isGreeting(text)).toBe(true),
  )

  it.each(['Hi, how do I cite this?', 'hey can you help with a project', 'testing your product for accessibility', 'Hello, I am a researcher at MGH', 'thanks!', ''])(
    'leaves "%s" for a person (or another rule)',
    (text) => expect(isGreeting(text)).toBe(false),
  )
})

describe('what a message asks', () => {
  it("reads the owner's example as a license question about academic use and distribution", () => {
    expect(detectPresetIntent('DOES THIS DOCUMENT HAVE CC to use as academic reference and distribute?')).toEqual({
      kind: 'license',
      wants: ['share', 'academic'],
      alsoCite: false,
    })
  })

  it('reads a citation request, with a format only when one is named outright', () => {
    expect(detectPresetIntent('How do I cite the Determinants of Health')).toEqual({ kind: 'citation', format: undefined })
    expect(detectPresetIntent('How do I cite this in APA?')).toEqual({ kind: 'citation', format: 'apa' })
    // "Harvard" here is a place, not a format.
    expect(detectPresetIntent("I'm at Harvard, how do I cite this?")).toEqual({ kind: 'citation', format: undefined })
    expect(detectPresetIntent('Can you give me a Harvard style citation?')).toEqual({ kind: 'citation', format: 'harvard' })
  })

  it('leaves ordinary questions for a person', () => {
    expect(detectPresetIntent('Do you take on new clients?')).toBeNull()
    expect(detectPresetIntent('Please cc me on the email')).toBeNull()
    expect(detectPresetIntent('We need help redesigning our patient portal')).toBeNull()
  })
})

const doh: CitablePiece = {
  title: 'Determinants of Health',
  url: 'https://www.goinvo.com/vision/determinants-of-health',
  authors: [
    { given: 'Edwin', family: 'Choi' },
    { given: 'Juhan', family: 'Sonin' },
  ],
  year: '2019',
  publisher: 'GoInvo',
}
const cite = (piece: CitablePiece, format: Parameters<typeof formatCitation>[1]) => citationPlainText(formatCitation(piece, format, NOW))

describe('citations', () => {
  it("matches GoInvo's own suggested citation for Determinants of Health (Chicago)", () => {
    // From github.com/goinvo/HealthDeterminants README, with the site's canonical URL (no trailing slash).
    expect(cite(doh, 'chicago')).toBe('Choi, Edwin, and Juhan Sonin. 2019. “Determinants of Health.” GoInvo. https://www.goinvo.com/vision/determinants-of-health.')
  })

  it('formats every offered style', () => {
    expect(cite(doh, 'apa')).toBe('Choi, E., & Sonin, J. (2019). Determinants of health. GoInvo. https://www.goinvo.com/vision/determinants-of-health')
    expect(formatCitation(doh, 'apa', NOW).find((segment) => segment.italic)?.text).toBe('Determinants of health')
    expect(cite(doh, 'mla')).toBe('Choi, Edwin, and Juhan Sonin. “Determinants of Health.” GoInvo, 2019, www.goinvo.com/vision/determinants-of-health. Accessed 10 Nov. 2026.')
    expect(cite(doh, 'harvard')).toBe('Choi, E. and Sonin, J. (2019) Determinants of Health. GoInvo. Available at: https://www.goinvo.com/vision/determinants-of-health (Accessed: 10 November 2026).')
    expect(cite(doh, 'ama')).toBe('Choi E, Sonin J. Determinants of Health. GoInvo. Published 2019. Accessed November 10, 2026. https://www.goinvo.com/vision/determinants-of-health')
    expect(cite(doh, 'vancouver')).toBe('Choi E, Sonin J. Determinants of Health [Internet]. GoInvo; 2019 [cited 2026 Nov 10]. Available from: https://www.goinvo.com/vision/determinants-of-health')
    expect(cite(doh, 'bibtex')).toBe(
      [
        '@misc{choi2019determinants,',
        '  author = {Choi, Edwin and Sonin, Juhan},',
        '  title = {{Determinants of Health}},',
        '  year = {2019},',
        '  publisher = {GoInvo},',
        '  howpublished = {\\url{https://www.goinvo.com/vision/determinants-of-health}},',
        '  note = {Accessed: 2026-11-10}',
        '}',
      ].join('\n'),
    )
  })

  it('lists three authors the way each style wants', () => {
    const three = { ...doh, authors: ['Hannah Sennik', 'Juhan Sonin', 'Eric Benoit'].map(personFromName) }
    expect(cite(three, 'apa').startsWith('Sennik, H., Sonin, J., & Benoit, E. (2019).')).toBe(true)
    expect(cite(three, 'mla').startsWith('Sennik, Hannah, et al. “')).toBe(true)
    expect(cite(three, 'chicago').startsWith('Sennik, Hannah, Juhan Sonin, and Eric Benoit. 2019.')).toBe(true)
    expect(cite(three, 'harvard').startsWith('Sennik, H., Sonin, J. and Benoit, E. (2019)')).toBe(true)
  })

  it('cites GoInvo itself when no person is credited, and says when there is no date', () => {
    const zika: CitablePiece = { title: 'Understanding Zika', sentenceTitle: 'Understanding Zika', url: 'https://www.goinvo.com/vision/understanding-zika', authors: [{ org: 'GoInvo' }], publisher: 'GoInvo' }
    expect(cite(zika, 'apa')).toBe('GoInvo. (n.d.). Understanding Zika. Retrieved November 10, 2026, from https://www.goinvo.com/vision/understanding-zika')
    expect(cite(zika, 'mla')).toBe('“Understanding Zika.” GoInvo, www.goinvo.com/vision/understanding-zika. Accessed 10 Nov. 2026.')
  })

  it('reads names and titles carefully', () => {
    expect(personFromName('Ernst-Jan van Woerden')).toEqual({ given: 'Ernst-Jan', family: 'van Woerden' })
    expect(cite({ ...doh, authors: [personFromName('Ernst-Jan van Woerden')] }, 'apa').startsWith('van Woerden, E.-J. (2019).')).toBe(true)
    expect(sentenceCase('AI Design for US Healthcare: A GoInvo Guide')).toBe('AI design for US healthcare: A GoInvo guide')
  })
})

describe('licenses', () => {
  const piece: ResolvedPiece = { ...doh, rights: rightsForPath('/vision/determinants-of-health') }

  it("puts what the owner's example asks about first, highlighted, then the condition that comes with it", () => {
    const reply = licenseReply(piece, 'DOES THIS DOCUMENT HAVE CC to use as academic reference and distribute?', false)
    if (reply.card.kind !== 'license') throw new Error('expected a license card')
    expect(reply.card.lead).toBe(
      'Yes, you can. The content and poster of “Determinants of Health” are under Creative Commons Attribution 4.0 (CC BY 4.0), and its code is under Apache 2.0. Here\'s what you can and cannot do with it:',
    )
    expect(reply.card.rows.slice(0, 3).map((row) => [row.id, row.relevant])).toEqual([
      ['share', true],
      ['academic', true],
      ['credit', false],
    ])
    expect(reply.card.rows.filter((row) => row.relevant)).toHaveLength(2)
    // A document is the content, so the content's column is the one highlighted.
    expect(reply.card.columns.map((column) => [column.id, column.relevant])).toEqual([
      ['CC-BY-4.0', true],
      ['Apache-2.0', false],
    ])
    expect(reply.card.source.url).toBe('https://github.com/goinvo/HealthDeterminants#license')
  })

  it('highlights the code license when the question is about the code', () => {
    const reply = licenseReply(piece, 'Can I use the code from the repo in our commercial app?', false)
    if (reply.card.kind !== 'license') throw new Error('expected a license card')
    expect(reply.card.columns.find((column) => column.relevant)?.id).toBe('Apache-2.0')
    expect(reply.card.rows[0]).toMatchObject({ id: 'commercial', relevant: true })
  })

  it('does not say "yes" when what they asked is not allowed', () => {
    const reply = licenseReply(piece, 'Can I put the GoInvo logo on our product to show you endorse it?', false)
    expect(reply.card.lead.startsWith('Yes')).toBe(false)
  })

  it('takes every stated license from a source, and a page source really says it', () => {
    const repoRoot = path.resolve(__dirname, '..')
    for (const piece of PIECE_RIGHTS) {
      expect(piece.source.quote.length, piece.path).toBeGreaterThan(5)
      expect(piece.source.label, piece.path).toBeTruthy()
      for (const grant of piece.licenses) expect(LICENSES[grant.license], piece.path).toBeDefined()
      if (piece.source.kind === 'page') {
        const file = fs.readFileSync(path.join(repoRoot, piece.source.file), 'utf8').replace(/\s+/g, ' ')
        expect(file.includes(piece.source.quote), `${piece.path}: "${piece.source.quote}" not in ${piece.source.file}`).toBe(true)
      }
      expect(piece.names.every((name) => name === name.toLowerCase()), piece.path).toBe(true)
    }
    expect(new Set(PIECE_RIGHTS.map((piece) => piece.path)).size).toBe(PIECE_RIGHTS.length)
  })

  it('finds a piece by its link or its name', () => {
    expect(sitePath('https://www.goinvo.com/vision/determinants-of-health/?ref=x')).toBe('/vision/determinants-of-health')
    expect(sitePath('https://evil.example/vision/determinants-of-health')).toBeUndefined()
    expect(rightsForPath('/vision/determinantes-de-la-salud')?.path).toBe('/vision/determinants-of-health')
    expect(rightsNamedIn('can I share the Social Determinants of Health poster?')?.path).toBe('/vision/determinants-of-health')
    expect(rightsNamedIn('the zika guide')?.path).toBe('/vision/understanding-zika')
    expect(rightsNamedIn('zikavirus')).toBeUndefined()
  })
})

const visitor = (text: string, at = '2026-11-10T14:00:00.000Z'): SanityChatMessage => ({ _key: text, _type: 'chatMessage', authorType: 'visitor', text, createdAt: at })
const person = (text: string): SanityChatMessage => ({ _key: text, _type: 'chatMessage', authorType: 'team', authorName: 'Shirley Xu', text, createdAt: '2026-11-10T14:01:00.000Z' })

async function plan(text: string, history: SanityChatMessage[] = [], pageUrl = DOH_PAGE) {
  return planPresetReply({ client, text, history, page: { url: pageUrl, title: 'Page | GoInvo' }, now: NOW })
}

describe('the conversation', () => {
  it('greets back once, with the two questions it can answer on a piece of work', async () => {
    const first = await plan('Hi')
    expect(first?.reply.kind).toBe('greeting')
    expect(first?.reply.card.kind === 'greeting' && first.reply.card.chips.map((chip) => chip.label)).toEqual(['How do I cite this?', 'Can I reuse this?'])
    const greeted = presetMessage(first!, '2026-11-10T14:00:00.000Z')
    expect(await plan('hello?', [visitor('Hi'), greeted])).toBeNull()
    // Never over a person who is already talking to them.
    expect(await plan('Hi', [visitor('question'), person('Happy to help!')])).toBeNull()
    // Off a piece of work there is nothing to offer but the question.
    const home = await plan('Hi', [], 'https://www.goinvo.com/')
    expect(home?.reply.card.kind === 'greeting' && home.reply.card.chips).toEqual([])
  })

  it('asks for a format, then answers the format picked, without pinging the team for it', async () => {
    const ask = await plan('How do I cite the Determinants of Health?', [], 'https://www.goinvo.com/')
    expect(ask?.reply.card.lead).toBe("It looks like you're asking for a citation for “Determinants of Health”. Which format would you prefer?")
    const history = [visitor('How do I cite the Determinants of Health?'), presetMessage(ask!, '2026-11-10T14:00:00.000Z')]
    const answer = await plan('APA', history, 'https://www.goinvo.com/')
    expect(answer?.answersPreset).toBe(true)
    expect(answer?.reply.card.kind === 'citation' && citationPlainText(answer.reply.card.segments)).toBe(
      'Choi, E., & Sonin, J. (2019). Determinants of health. GoInvo. https://www.goinvo.com/vision/determinants-of-health',
    )
    // A word that is not a format right after the question goes to a person.
    expect(await plan('APA is fine but is there a PDF?', history)).toBeNull()
  })

  it('asks which piece when the page is not one, and follows a link to it', async () => {
    const ask = await plan('How do I cite this?', [], 'https://www.goinvo.com/about')
    expect(ask?.reply.kind).toBe('pieceAsk')
    const history = [visitor('How do I cite this?'), presetMessage(ask!, '2026-11-10T14:00:00.000Z')]
    const next = await plan('https://www.goinvo.com/vision/us-healthcare-problems', history, 'https://www.goinvo.com/about')
    expect(next?.reply.kind).toBe('citationAsk')
    expect(next?.answersPreset).toBe(true)
  })

  it('never guesses a license: an unlisted piece is handed to a person', async () => {
    const reply = await plan('What license is this under?', [], 'https://www.goinvo.com/vision/eligibility-engine')
    expect(reply?.reply.kind).toBe('licenseUnknown')
    expect(reply?.reply.text).toContain('I couldn\'t find a license stated for “Eligibility Engine”')
  })

  it("takes title and authors from the CMS, and the publisher's citation year over the CMS card", async () => {
    const usp = await resolvePiece(client, { path: '/vision/us-healthcare-problems' })
    expect(usp).toMatchObject({ title: 'US Healthcare Problems', year: '2021' })
    expect(usp?.authors).toHaveLength(3)
    expect((await resolvePiece(client, { path: '/vision/determinants-of-health' }))?.year).toBe('2019')
    expect(await resolvePiece(client, { path: '/services' })).toBeUndefined()
  })

  it('shows the card to the visitor through the public message', async () => {
    const reply = await plan('Can I distribute this poster in my class?')
    const message = presetMessage(reply!, '2026-11-10T14:00:00.000Z')
    expect(message.fallbackKind).toBe('preset')
    const [publicMessage] = toPublicMessages([message])
    expect(publicMessage.card?.kind).toBe('license')
    expect(parseCard('{not json')).toBeUndefined()
  })
})

describe('the "nobody has responded" note', () => {
  const later = (minutes: number) => new Date(Date.parse('2026-11-10T14:00:00.000Z') + minutes * 60_000)
  const due = siteConfig.chat.noResponse.delayMs / 60_000 + 1

  it('stays quiet when the instant reply answered them', async () => {
    const reply = await plan('Can I distribute this?')
    const thread = { status: 'new', messages: [visitor('Can I distribute this?'), presetMessage(reply!, '2026-11-10T14:00:00.000Z')] }
    expect(getNoResponseFallback(thread, later(due))).toBeNull()
  })

  it('still comes when the instant reply handed the question to a person', async () => {
    const reply = await plan('What license is this under?', [], 'https://www.goinvo.com/vision/eligibility-engine')
    const thread = { status: 'new', messages: [visitor('What license is this under?'), presetMessage(reply!, '2026-11-10T14:00:00.000Z')] }
    expect(getNoResponseFallback(thread, later(due))).not.toBeNull()
  })

  it('times a real question asked after a greeting from the question, not the hello', async () => {
    const greeting = await plan('Hi')
    const messages = [visitor('Hi'), presetMessage(greeting!, '2026-11-10T14:00:00.000Z'), visitor('Can you redesign our portal?', later(5).toISOString())]
    expect(getNoResponseFallback({ status: 'open', messages }, later(5.5))).toBeNull()
    expect(getNoResponseFallback({ status: 'open', messages }, later(5 + due))).not.toBeNull()
  })
})
