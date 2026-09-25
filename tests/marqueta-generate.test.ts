import { describe, expect, it } from 'vitest'

import {
  chunkForSlack,
  contentTypeForFormat,
  detectGenerationRequest,
  generatedToCalendarDraft,
  MAX_TOPIC_LENGTH,
  parseGeneration,
  sanitizeTopic,
  type GeneratedContent,
} from '@/lib/marketing/marquetaGenerate'
import { parseMarquetaIntent } from '@/lib/marketing/marquetaChat'
import type { ResearchCitation } from '@/lib/marketing/marquetaCitations'

describe('detectGenerationRequest', () => {
  it('recognises each format after an explicit "draft <format>:"', () => {
    expect(detectGenerationRequest('draft outline: clinical AI pre-mortems')).toEqual({
      format: 'outline',
      topic: 'clinical AI pre-mortems',
    })
    expect(detectGenerationRequest('draft a script: our Heard case study')).toEqual({
      format: 'script',
      topic: 'our Heard case study',
    })
    expect(detectGenerationRequest('draft a LinkedIn post: open-source health data')).toEqual({
      format: 'post',
      topic: 'open-source health data',
    })
    expect(detectGenerationRequest('can you draft an outreach email: Mass General Brigham')).toEqual(
      { format: 'email', topic: 'Mass General Brigham' },
    )
  })

  it('prefers the longer format phrase it is contained in', () => {
    // "social post" must not be read as a post about "social post".
    expect(detectGenerationRequest('draft social post: the new poster series')).toEqual({
      format: 'post',
      topic: 'the new poster series',
    })
  })

  it('returns an empty topic when the format is clear but the subject is not', () => {
    expect(detectGenerationRequest('draft outline:')).toEqual({ format: 'outline', topic: '' })
  })

  it('needs the colon, because without it the message belongs to call prep', () => {
    // Call prep owns the bare verbs. These are prep's, not hers, and the split
    // has to be total — see tests/marqueta-trigger-collision.test.ts.
    expect(detectGenerationRequest('outline the Q4 story')).toBeNull()
    expect(detectGenerationRequest('draft an email to Jane at MGB')).toBeNull()
    expect(detectGenerationRequest('script for the Heard call')).toBeNull()
  })

  it('needs the verb, so a bare "outline: x" is still prep’s', () => {
    expect(detectGenerationRequest('outline: the Q4 story')).toBeNull()
    // "write" is prep's verb; only "draft" opens generation.
    expect(detectGenerationRequest('write me a post: open-source health data')).toBeNull()
  })

  it('does not fire on a passing mention mid-sentence', () => {
    expect(detectGenerationRequest("I'll write a post later, remind me")).toBeNull()
    expect(detectGenerationRequest('we should do a reel about Heard')).toBeNull()
  })
})

describe('sanitizeTopic', () => {
  it('strips control characters, which is the whole reason it exists', () => {
    // Built from char codes on purpose: writing these literally in the source
    // is the bug tests/no-control-bytes.test.ts guards against.
    const nasty = `open${String.fromCharCode(0)}source${String.fromCharCode(31)}health${String.fromCharCode(127)}data`
    expect(sanitizeTopic(nasty)).toBe('open source health data')
  })

  it('collapses whitespace, trims, and refuses a non-string', () => {
    expect(sanitizeTopic('  remote   cardiac \n trials  ')).toBe('remote cardiac trials')
    expect(sanitizeTopic(undefined)).toBe('')
    expect(sanitizeTopic(42)).toBe('')
  })

  it('clips a paste to the topic limit', () => {
    expect(sanitizeTopic('x'.repeat(MAX_TOPIC_LENGTH + 50))).toHaveLength(MAX_TOPIC_LENGTH)
  })
})

describe('parseMarquetaIntent — generation', () => {
  it('routes a generation request to the generate intent with its format and topic', () => {
    const intent = parseMarquetaIntent('draft script: the AIwithCare spinout')
    expect(intent.kind).toBe('generate')
    if (intent.kind === 'generate') {
      expect(intent.format).toBe('script')
      expect(intent.topic).toContain('AIwithCare')
    }
  })

  it('leaves the same words without a colon to call prep', () => {
    // The whole reason the colon exists. "draft a script about X" reads as prep
    // material for a call; "draft script: X" asks her to write one.
    expect(parseMarquetaIntent('draft a script about the AIwithCare spinout').kind).toBe('prep')
  })

  it('still files a plain proposal rather than trying to generate it', () => {
    // "we should do a reel" is a proposal, not "write me a reel".
    expect(parseMarquetaIntent('we should do a reel about the Heard project').kind).toBe('capture')
  })

  it('lets an explicit capture still win over generation phrasing', () => {
    // Being told to file something is not an invitation to draft it.
    const intent = parseMarquetaIntent('capture: write a post about Town Day merch')
    expect(intent.kind).toBe('capture')
  })
})

describe('parseGeneration', () => {
  it('assembles an outline into one readable draft', () => {
    const generated = parseGeneration(
      'outline',
      JSON.stringify({
        title: 'The clinical AI pilot pre-mortem',
        angle: 'Most pilots fail for reasons you can name in advance.',
        sections: [
          { heading: 'Why pilots stall', points: ['Trust', 'Workflow fit'] },
          { heading: 'The eight failure modes', points: ['F1: no owner'] },
        ],
        callToAction: 'Download the scorecard.',
      }),
    )!
    expect(generated.title).toBe('The clinical AI pilot pre-mortem')
    expect(generated.body).toContain('*Angle:*')
    expect(generated.body).toContain('*Why pilots stall*')
    expect(generated.body).toContain('• Trust')
    expect(generated.body).toContain('*Call to action:* Download the scorecard.')
  })

  it('keeps the email subject separate so it can be surfaced', () => {
    const generated = parseGeneration(
      'email',
      JSON.stringify({
        subject: 'Saw the AIwithCare launch',
        greeting: 'Hi Jane,',
        body: ['I saw that you spun out AIwithCare.', 'We do a short pre-mortem — happy to talk.'],
        signoff: '— Juhan, GoInvo',
      }),
    )!
    expect(generated.subject).toBe('Saw the AIwithCare launch')
    expect(generated.body).toContain('Hi Jane,')
    expect(generated.body).toContain('— Juhan, GoInvo')
  })

  it('returns null on unparseable output rather than an empty draft', () => {
    expect(parseGeneration('outline', 'sorry, I could not do that')).toBeNull()
  })
})

describe('generatedToCalendarDraft', () => {
  const generated: GeneratedContent = {
    format: 'post',
    title: 'Open-source health data',
    body: 'A post about open data.',
  }
  const source: ResearchCitation = {
    organization: 'Mass General Brigham',
    signal: 'launched AIwithCare',
    quote: 'MGB announced the launch of AIwithCare.',
    sourceUrl: 'https://example.org/a#:~:text=announced',
    sourceTitle: 'example.org',
    opening: 'clinician trust',
    offerKey: '',
    verified: true,
    context: '',
  }

  it('mirrors the caught-draft id and shape so the existing discard button works', () => {
    const draft = generatedToCalendarDraft({
      generated,
      channel: 'C123',
      ts: '1712345678.000100',
      personName: 'Shirley',
      topic: 'open data',
      permalink: 'https://slack/x',
      sources: [source],
    })
    // Same deterministic id scheme as a caught draft — one calendar item, one bin.
    expect(draft._id).toBe('marketingCalendarItem.slack-C123-1712345678-000100')
    expect(draft.status).toBe('drafting')
    expect(draft.autoPublish).toBe(false)
    expect(draft.contentType).toBe('socialPost')
    // The verified source is kept on the brief, not thrown away.
    expect(draft.brief).toContain('Mass General Brigham')
    expect(draft.brief).toContain('example.org')
  })
})

describe('contentTypeForFormat', () => {
  it('maps each format to a valid calendar content type', () => {
    expect(contentTypeForFormat('outline')).toBe('article')
    expect(contentTypeForFormat('script')).toBe('video')
    expect(contentTypeForFormat('post')).toBe('socialPost')
    expect(contentTypeForFormat('email')).toBe('email')
  })
})

describe('chunkForSlack', () => {
  it('keeps a short draft as a single chunk', () => {
    expect(chunkForSlack('short enough')).toEqual(['short enough'])
  })

  it('splits a long draft on paragraph boundaries under the section cap', () => {
    const paragraph = 'x'.repeat(1500)
    const chunks = chunkForSlack([paragraph, paragraph, paragraph].join('\n\n'), 2900)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(2900)
  })
})
