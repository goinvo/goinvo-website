/**
 * Marqueta's suggestions: what to make next, from our work, from the field, or
 * from a brief with documents.
 *
 * The rules pinned here are the ones whose failure would be SILENT:
 *   - a suggestion may only link to work we hold — the model never sees a URL
 *     for our work, and an id it invents resolves to nothing;
 *   - an external source survives only if the web search really returned it;
 *   - a work/field suggestion left with no real anchor is dropped AND counted,
 *     never quietly shown as though it stood on something;
 *   - a saved idea and a drafted draft never share a key, because the one
 *     discard button tries the idea first;
 *   - a link is read from the RAW Slack text, because decoding loses the URL;
 *   - the server never fetches a private address, not even via a redirect.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ideaDocIdForMessage, draftDocIdForMessage } from '@/lib/marketing/ideaCapture'
import { parseMarquetaIntent } from '@/lib/marketing/marquetaChat'
import type { ResearchCitation } from '@/lib/marketing/marquetaCitations'
import { MAX_TOPIC_LENGTH } from '@/lib/marketing/marquetaGenerate'
import { LABEL } from '@/lib/marketing/marquetaStyle'
import {
  buildSuggestionUserMessage,
  comparableUrl,
  decodeSuggestionValue,
  detectSuggestionRequest,
  encodeSuggestionValue,
  isFetchableUrl,
  linksInSlackText,
  MAX_SUGGESTIONS,
  numberResearch,
  numberWork,
  parseSuggestions,
  readableDocumentUrl,
  suggestionDraftKey,
  suggestionIdeaKey,
  suggestionToIdea,
  suggestionTopic,
  suggestMenuText,
  withCardTs,
  type SuggestionValue,
} from '@/lib/marketing/marquetaSuggest'
import { buildSuggestionBlocks, decodeIdeaValue, encodeIdeaValue, redrawSuggestion } from '@/lib/marketing/slackDelegation'
import { decodeSlackText } from '@/lib/marketing/slackText'
import { expectValidSlackBlocks } from './support/slackBlocks'

const WORK = numberWork([
  { title: 'Determinants of Health', url: 'https://www.goinvo.com/vision/determinants-of-health', kind: 'essay', summary: 'A poster.' },
  { title: 'Hgraph', url: 'https://www.goinvo.com/work/hgraph', kind: 'case study', summary: 'Health at a glance.' },
])

const CITATION: ResearchCitation = {
  organization: 'Example Health',
  signal: 'Launched a clinical AI pilot.',
  quote: 'We launched a pilot this spring.',
  sourceUrl: 'https://example.org/news#:~:text=We%20launched',
  sourceTitle: 'News',
  opening: '',
  offerKey: '',
  verified: true,
  context: '',
}
const RESEARCH = numberResearch([CITATION])

const answer = (suggestions: unknown[]) => JSON.stringify({ suggestions })
const row = (overrides: Record<string, unknown> = {}) => ({
  title: 'Show the poster',
  format: 'post',
  angle: 'Why social determinants still decide outcomes.',
  whyUs: 'We drew the poster.',
  work: ['W1'],
  ...overrides,
})

// ── The trigger ──────────────────────────────────────────────────────────────

describe('detectSuggestionRequest', () => {
  it('picks the source from the words after "suggest"', () => {
    expect(detectSuggestionRequest('suggest from our work')).toEqual({ source: 'work', details: '' })
    expect(detectSuggestionRequest('suggest some content ideas from our work')).toEqual({ source: 'work', details: '' })
    expect(detectSuggestionRequest('suggest from our work: for HLTH week')).toEqual({ source: 'work', details: 'for HLTH week' })
    expect(detectSuggestionRequest('suggest from the field')).toEqual({ source: 'field', details: '' })
    expect(detectSuggestionRequest('can you suggest thought leadership')).toEqual({ source: 'field', details: '' })
    expect(detectSuggestionRequest('suggest trends — clinical AI')).toEqual({ source: 'field', details: 'clinical AI' })
  })

  it('reads anything else after the verb as the brief itself', () => {
    expect(detectSuggestionRequest('suggest: a post for our 15th birthday')).toEqual({
      source: 'custom',
      details: 'a post for our 15th birthday',
    })
    expect(detectSuggestionRequest('suggest a newsletter for October')).toEqual({
      source: 'custom',
      details: 'a newsletter for October',
    })
  })

  it('returns no source for a bare "suggest", so nothing is spent on a guess', () => {
    expect(detectSuggestionRequest('suggest')).toEqual({ source: null, details: '' })
    expect(detectSuggestionRequest('suggest something')).toEqual({ source: null, details: '' })
    expect(detectSuggestionRequest('suggest:')).toEqual({ source: null, details: '' })
  })

  it('is verb-led and anchored, so it never claims a sentence that merely contains the word', () => {
    for (const text of ['I’d suggest we wait', 'any suggestions?', 'suggestions from last week', 'we should suggest a booth']) {
      expect(detectSuggestionRequest(text), text).toBeNull()
    }
    // "work" must be the whole word, not the start of another.
    expect(detectSuggestionRequest('suggest working sessions')?.source).toBe('custom')
  })

  it('reaches the suggest intent through the parser, after her name', () => {
    const intent = parseMarquetaIntent('Marqueta, suggest from the field')
    expect(intent).toEqual({ kind: 'suggest', source: 'field', details: '' })
  })

  it('offers each way to ask in the menu, as phrases that themselves parse', () => {
    const menu = suggestMenuText((command) => `\`${command}\``)
    const commands = [...menu.matchAll(/`([^`]+)`/g)].map((match) => match[1])
    expect(commands).toHaveLength(3)
    for (const command of commands) expect(parseMarquetaIntent(command).kind, command).toBe('suggest')
  })
})

// ── Links and fetching ───────────────────────────────────────────────────────

describe('documents linked in a message', () => {
  it('reads links from the RAW text, because decoding drops the URL', () => {
    const raw = 'Marqueta, suggest: HLTH <https://docs.google.com/document/d/abc123/edit|our brief> and <https://example.org/a?x=1&amp;y=2>'
    expect(decodeSlackText(raw)).not.toContain('docs.google.com')
    expect(linksInSlackText(raw)).toEqual([
      'https://docs.google.com/document/d/abc123/edit',
      'https://example.org/a?x=1&y=2',
    ])
  })

  it('reads a Google Doc or Slides deck through its plain-text export', () => {
    expect(readableDocumentUrl('https://docs.google.com/document/d/abc123/edit#heading=h.1')).toBe(
      'https://docs.google.com/document/d/abc123/export?format=txt',
    )
    expect(readableDocumentUrl('https://docs.google.com/presentation/d/xyz/edit')).toBe(
      'https://docs.google.com/presentation/d/xyz/export/txt',
    )
    expect(readableDocumentUrl('https://example.org/report')).toBe('https://example.org/report')
  })

  it('never lets a chat message point the server at a private address', () => {
    for (const url of [
      'http://localhost:3000/api/marketing/runway',
      'http://127.0.0.1/',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/',
      'http://intranet/',
      'http://printer.local/',
      'https://user:pass@example.org/',
      'file:///etc/passwd',
      'ftp://example.org/x',
    ]) {
      expect(isFetchableUrl(url), url).toBe(false)
    }
    expect(isFetchableUrl('https://www.example.org/report.pdf')).toBe(true)
  })
})

// ── Parsing what the model said ──────────────────────────────────────────────

describe('parseSuggestions', () => {
  it('resolves ids against our records and ignores ids that are not ours', () => {
    const parsed = parseSuggestions(answer([row({ work: ['W1', 'W9', 'w2'], research: ['R1', 'R7'] })]), {
      source: 'work',
      work: WORK,
      research: RESEARCH,
    })!
    expect(parsed.suggestions).toHaveLength(1)
    expect(parsed.suggestions[0].work.map((item) => item.title)).toEqual(['Determinants of Health', 'Hgraph'])
    expect(parsed.suggestions[0].research.map((item) => item.organization)).toEqual(['Example Health'])
  })

  it('drops a work suggestion that names none of our work, and says so', () => {
    const parsed = parseSuggestions(answer([row({ work: ['W9'] }), row({ title: 'Kept' })]), {
      source: 'work',
      work: WORK,
      research: RESEARCH,
    })!
    expect(parsed.suggestions.map((suggestion) => suggestion.title)).toEqual(['Kept'])
    expect(parsed.dropped).toEqual([{ title: 'Show the poster', reason: 'it named none of our work' }])
  })

  it('keeps a field source only when the search really returned it', () => {
    const searched = ['https://www.example.org/report/']
    const parsed = parseSuggestions(
      answer([
        row({ title: 'Real', sources: [{ title: 'Report', url: 'https://WWW.example.org/report?utm_source=x#top' }] }),
        row({ title: 'Invented', sources: [{ title: 'Made up', url: 'https://example.org/never-searched' }] }),
      ]),
      { source: 'field', work: WORK, research: [], searchedUrls: searched },
    )!
    expect(parsed.suggestions.map((suggestion) => suggestion.title)).toEqual(['Real'])
    expect(parsed.dropped).toEqual([{ title: 'Invented', reason: 'its source was not one the search returned' }])
  })

  it('treats a field suggestion with no search at all as unsourced, not as trusted', () => {
    const parsed = parseSuggestions(answer([row({ sources: [{ title: 'X', url: 'https://example.org/x' }] })]), {
      source: 'field',
      work: WORK,
      research: [],
    })!
    expect(parsed.suggestions).toHaveLength(0)
    expect(parsed.dropped).toHaveLength(1)
  })

  it('lets verified research stand in for a web source in a field suggestion', () => {
    const parsed = parseSuggestions(answer([row({ research: ['R1'] })]), { source: 'field', work: WORK, research: RESEARCH, searchedUrls: [] })!
    expect(parsed.suggestions).toHaveLength(1)
  })

  it('does not demand our work for a custom brief', () => {
    const parsed = parseSuggestions(answer([row({ work: [] })]), { source: 'custom', work: WORK, research: [] })!
    expect(parsed.suggestions).toHaveLength(1)
  })

  it('caps the list, defaults an unknown format, and refuses garbage', () => {
    const many = Array.from({ length: 9 }, (_, index) => row({ title: `S${index}`, format: index === 0 ? 'podcast' : 'email' }))
    const parsed = parseSuggestions(answer(many), { source: 'work', work: WORK, research: [] })!
    expect(parsed.suggestions).toHaveLength(MAX_SUGGESTIONS)
    expect(parsed.suggestions[0].format).toBe('post')
    expect(parseSuggestions('not json at all', { source: 'work', work: WORK, research: [] })).toBeNull()
  })

  it('compares URLs by the page they name, not their spelling', () => {
    expect(comparableUrl('https://Example.org/a/?utm_medium=x#y')).toBe(comparableUrl('https://example.org/a'))
    expect(comparableUrl('https://example.org/a?id=1')).not.toBe(comparableUrl('https://example.org/a?id=2'))
  })
})

describe('the prompt', () => {
  it('never shows the model a URL for our work, so it can only cite by id', () => {
    const message = buildSuggestionUserMessage({ source: 'work', details: '', work: WORK, research: RESEARCH })
    expect(message).toContain('"W1"')
    for (const item of WORK) expect(message).not.toContain(item.url)
  })
})

// ── The buttons, and what they create ────────────────────────────────────────

const VALUE: SuggestionValue = {
  channel: 'C0MKTGEN000',
  cardTs: '1726000000.000300',
  index: 2,
  format: 'outline',
  title: 'Show the poster',
  angle: 'Why social determinants still decide outcomes.',
  why: 'We drew the poster.',
  workTitles: ['Determinants of Health'],
  sourceTitle: 'A report',
  sourceUrl: 'https://example.org/report',
}

describe('suggestion buttons', () => {
  it('round-trips a value, and fits Slack’s limit however long the fields are', () => {
    expect(decodeSuggestionValue(encodeSuggestionValue(VALUE))).toEqual(VALUE)
    const huge = { ...VALUE, title: 'T'.repeat(500), angle: 'A“'.repeat(2000), why: 'W'.repeat(2000), workTitles: ['x'.repeat(400), 'y'.repeat(400), 'z'.repeat(400)] }
    const encoded = encodeSuggestionValue(huge)
    expect(encoded.length).toBeLessThanOrEqual(1900)
    expect(decodeSuggestionValue(encoded)?.title.length).toBeGreaterThan(0)
  })

  it('takes the card’s ts from the press when the card was drawn before it had one', () => {
    const drawn = { ...VALUE, cardTs: '' }
    expect(withCardTs(drawn, '1726000000.000999').cardTs).toBe('1726000000.000999')
    expect(withCardTs(VALUE, '1726000000.000999').cardTs).toBe(VALUE.cardTs)
  })

  it('keys a saved idea and a drafted draft apart, so binning one can never bin the other', () => {
    const ideaKey = suggestionIdeaKey(VALUE.cardTs, VALUE.index)
    const draftKey = suggestionDraftKey(VALUE.cardTs, VALUE.index)
    expect(ideaKey).not.toBe(draftKey)
    // The discard button tries the IDEA id first; the draft card's key must not find the idea.
    expect(ideaDocIdForMessage({ channel: VALUE.channel, ts: draftKey })).not.toBe(
      ideaDocIdForMessage({ channel: VALUE.channel, ts: ideaKey }),
    )
    expect(draftDocIdForMessage({ channel: VALUE.channel, ts: draftKey })).toMatch(/^marketingCalendarItem\.slack-/)
  })

  it('saves an idea under the id the existing Not an idea button reverses', () => {
    const idea = suggestionToIdea({ value: VALUE, personName: 'Jules' })
    expect(idea._id).toBe(ideaDocIdForMessage({ channel: VALUE.channel, ts: suggestionIdeaKey(VALUE.cardTs, VALUE.index) }))
    expect(idea).toMatchObject({ _type: 'marketingIdea', category: 'content', status: 'idea', needsReview: false })
    expect(idea.summary).toContain('Determinants of Health')
    expect(idea.nextAction).toContain(LABEL.SUGGEST_DRAFT)
  })

  it('hands the drafter a topic inside its own length limit', () => {
    const topic = suggestionTopic({ title: 'T'.repeat(300), angle: 'A'.repeat(600), workTitles: ['W'.repeat(200)] })
    expect(topic.length).toBeLessThanOrEqual(MAX_TOPIC_LENGTH)
    expect(suggestionTopic({ title: 'Show the poster', angle: 'An angle.', workTitles: ['Hgraph'] })).toContain('Hgraph')
  })
})

// ── The card ─────────────────────────────────────────────────────────────────

describe('buildSuggestionBlocks', () => {
  const parsed = parseSuggestions(
    answer([row({ work: ['W1', 'W2'] }), row({ title: 'Second', format: 'email' }), row({ title: 'Dropped', work: [] })]),
    { source: 'work', work: WORK, research: RESEARCH },
  )!
  const blocks = buildSuggestionBlocks({
    sourceLabel: 'from our work',
    suggestions: parsed.suggestions,
    dropped: parsed.dropped,
    documentProblems: [{ name: 'deck.key', reason: 'I can’t read that yet' }],
    channel: 'C0MKTGEN000',
  })

  it('draws valid Slack', () => {
    expectValidSlackBlocks(blocks as never)
  })

  it('links each suggestion to our own records, and says what was dropped and unread', () => {
    const text = JSON.stringify(blocks)
    expect(text).toContain('<https://www.goinvo.com/work/hgraph|Hgraph>')
    expect(text).toContain('1 more dropped')
    expect(text).toContain('it named none of our work')
    expect(text).toContain('deck.key')
  })

  it('puts one green button per suggestion, leftmost', () => {
    const rows = blocks.filter((block) => block.type === 'actions')
    expect(rows).toHaveLength(2)
    for (const actions of rows) {
      const styles = actions.elements.map((element: { style?: string }) => element.style || '')
      expect(styles).toEqual(['primary', ''])
      expect(actions.elements.map((element: { text: { text: string } }) => element.text.text)).toEqual([
        LABEL.SUGGEST_DRAFT,
        LABEL.SUGGEST_SAVE,
      ])
    }
  })

  it('redraws only the pressed suggestion, and keeps every receipt', () => {
    const ideaValue = encodeIdeaValue({ channel: 'C0MKTGEN000', ts: suggestionIdeaKey('1.2', 1) })
    const saved = redrawSuggestion(blocks, { index: 1, pressed: 'save', note: 'Saved by A', ideaValue })
    const drafted = redrawSuggestion(saved, { index: 1, pressed: 'draft', note: 'Drafting for B' })
    expectValidSlackBlocks(drafted as never)

    const rowOf = (all: typeof blocks, index: number) => all.find((block) => block.block_id === `mq_suggest_actions_${index}`)!
    // The other suggestion is untouched.
    expect(rowOf(drafted, 0)).toEqual(rowOf(blocks, 0))
    // Save became Not an idea, pointing at the saved idea; Draft it is gone once pressed.
    const labels = rowOf(drafted, 1).elements.map((element: { text: { text: string } }) => element.text.text)
    expect(labels).toEqual([LABEL.IDEA_DISCARD])
    expect(decodeIdeaValue(rowOf(drafted, 1).elements[0].value)).toEqual({ channel: 'C0MKTGEN000', ts: '1.2-s1' })
    const note = drafted.find((block) => block.block_id === 'mq_suggest_note_1')!
    expect(note.elements[0].text).toBe('Saved by A  ·  Drafting for B')
    // The note sits directly under its suggestion.
    const at = drafted.findIndex((block) => block.block_id === 'mq_suggest_1')
    expect(drafted[at + 1].block_id).toBe('mq_suggest_note_1')
  })
})

// ── Reading documents (server) ───────────────────────────────────────────────

vi.mock('@/sanity/lib/client', () => ({ client: { fetch: vi.fn(async () => ({})) } }))
vi.mock('@/lib/marketing/client', () => ({ getMarketingWriteClientFor: () => ({ fetch: vi.fn(async () => []) }) }))
vi.mock('@/lib/chat/slack', () => ({ getSlackConfig: () => ({ botToken: 'xoxb-test' }) }))

describe('readSuggestionDocuments', () => {
  afterEach(() => vi.unstubAllGlobals())

  const respond = (body: string, init: { status?: number; type?: string; location?: string; url?: string } = {}) => {
    const response = new Response(body, {
      status: init.status || 200,
      headers: { 'content-type': init.type || 'text/plain', ...(init.location ? { location: init.location } : {}) },
    })
    if (init.url) Object.defineProperty(response, 'url', { value: init.url })
    return response
  }

  it('refuses a public link that redirects to a private address, without fetching it', async () => {
    const { readSuggestionDocuments } = await import('@/lib/marketing/marquetaSuggest.server')
    const fetched: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(String(url))
      return respond('', { status: 302, location: 'http://169.254.169.254/latest/meta-data' })
    }))
    const result = await readSuggestionDocuments([{ kind: 'url', url: 'https://example.org/brief' }])
    expect(result.documents).toEqual([])
    expect(result.problems[0].reason).toMatch(/public web links/)
    expect(fetched).toEqual(['https://example.org/brief'])
  })

  it('says Slack withheld an attachment when it answers with a sign-in page, instead of reading the page', async () => {
    const { readSuggestionDocuments } = await import('@/lib/marketing/marquetaSuggest.server')
    vi.stubGlobal('fetch', vi.fn(async () => respond('<html>Sign in to Slack</html>', { type: 'text/html' })))
    const result = await readSuggestionDocuments([
      { kind: 'slackFile', name: 'brief.md', mimetype: 'text/markdown', url: 'https://files.slack.com/files-pri/T1-F1/brief.md' },
    ])
    expect(result.documents).toEqual([])
    expect(result.problems[0].reason).toMatch(/files:read/)
  })

  it('reads a public page as text, and names an unshared Google Doc as unshared', async () => {
    const { readSuggestionDocuments } = await import('@/lib/marketing/marquetaSuggest.server')
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      String(url).includes('docs.google.com')
        ? respond('<html>Sign in – Google Accounts</html>', { type: 'text/html', url: 'https://accounts.google.com/ServiceLogin' })
        : respond('<html><body><h1>Our brief</h1><p>Plenty of detail about the HLTH booth and what we want to show.</p></body></html>', { type: 'text/html' }),
    ))
    const result = await readSuggestionDocuments([
      { kind: 'url', url: 'https://example.org/brief' },
      { kind: 'url', url: 'https://docs.google.com/document/d/abc/edit' },
    ])
    expect(result.documents).toHaveLength(1)
    expect(result.documents[0]).toMatchObject({ id: 'D1' })
    expect(result.documents[0].text).toContain('HLTH booth')
    expect(result.problems).toEqual([{ name: 'Google Doc', reason: expect.stringMatching(/isn’t shared/) }])
  })

  it('reads only the first four, and names the rest', async () => {
    const { readSuggestionDocuments } = await import('@/lib/marketing/marquetaSuggest.server')
    const docs = Array.from({ length: 6 }, (_, index) => ({ kind: 'text' as const, name: `n${index}`, text: 'enough words to be worth reading here' }))
    const result = await readSuggestionDocuments(docs)
    expect(result.documents).toHaveLength(4)
    expect(result.problems.map((problem) => problem.name)).toEqual(['n4', 'n5'])
  })
})
