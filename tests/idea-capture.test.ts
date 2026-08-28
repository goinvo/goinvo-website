import { describe, expect, it } from 'vitest'

import {
  buildCapturedDraft,
  buildCapturedIdea,
  bulletsIn,
  classifyMessage,
  draftBodyFrom,
  draftContentTypeFrom,
  draftTitleFrom,
  ideaCategoryFrom,
  ideaDocIdForMessage,
  ideaTitleFrom,
  looksLikeAnIdea,
  messageProse,
  quotedBlockIn,
  slackPermalink,
} from '@/lib/marketing/ideaCapture'

/**
 * The two real messages Marqueta missed on 2026-08-27, verbatim.
 *
 * Pinned as fixtures because they are the reason the filter changed: the first
 * set of markers was written from imagination rather than from how this team
 * actually talks, and a regression here means she stops catching the exact
 * thing she was built for.
 */
const JUHAN_MERCH = [
  [
    'What about:',
    '• custom printed patch of Kindness is Power',
    '• custom tattoos of Sugar Kills',
    '• custom iron-on decal for shirts, Kindness is Power',
    '... for Arlington Town Day',
  ].join('\n'),
  "Yup, we'll have some tshirts... but this might be a good compliment.",
  'any other ideas or designs or...?',
  'custom patches and stickers are good, inexpensive experiments!',
]

const JUHAN_NEWSLETTER = [
  'Next newsletter is for <https://TheBlanding.com|TheBlanding.com>.',
  '',
  'Here’s a draft:',
  '> Look across a parking lot.',
  '>',
  '> It’s a sea of black, blue, and grey.',
  '> A bruise on our brains.',
  '>',
  '> We’ve designed the fun out of everything.',
  '> Let’s get the fun gene back into expression.',
].join('\n')

describe('the messages Marqueta actually missed', () => {
  it('catches every part of the merch burst', () => {
    for (const text of JUHAN_MERCH) {
      expect(classifyMessage(text).kind, text).toBe('idea')
    }
  })

  it('reads the newsletter as a draft, not an idea', () => {
    // Filing this as an "idea" would throw away the copy, which is the only
    // part that took any effort.
    expect(classifyMessage(JUHAN_NEWSLETTER).kind).toBe('draft')
  })

  it('titles the bulleted list by its subject, not its first bullet', () => {
    // "custom printed patch of Kindness is Power" as a title hides the other
    // two ideas and the occasion that made them worth having.
    const title = ideaTitleFrom(JUHAN_MERCH[0])
    expect(title).toContain('Arlington Town Day')
    expect(title).toContain('3 ideas')
  })

  it('keeps all three merch ideas, each on its own line', () => {
    const idea = buildCapturedIdea({ text: JUHAN_MERCH[0], personName: 'Juhan', channel: 'C1', ts: '1.1' })
    expect(bulletsIn(JUHAN_MERCH[0])).toHaveLength(3)
    expect(idea.summary).toContain('Sugar Kills')
    expect(idea.summary).toContain('iron-on decal')
    expect(idea.category).toBe('product')
  })

  it('files the newsletter with its copy, dateless and unable to post itself', () => {
    const draft = buildCapturedDraft({ text: JUHAN_NEWSLETTER, personName: 'Juhan', channel: 'C1', ts: '1.1' })
    expect(draft.title).toContain('TheBlanding.com')
    expect(draft.contentType).toBe('newsletter')
    expect(draft.contentDraft).toContain('A bruise on our brains.')
    expect(draft.contentDraft).toContain('fun gene back into expression')
    // The announcement is not part of the copy.
    expect(draft.contentDraft).not.toContain('Next newsletter is for')
    expect(draft.status).toBe('drafting')
    // Nothing Marqueta catches may ever post itself.
    expect(draft.autoPublish).toBe(false)
  })
})

describe('quotedBlockIn', () => {
  it('reads the pasted copy out of a Slack blockquote', () => {
    expect(quotedBlockIn(JUHAN_NEWSLETTER)).toContain('Look across a parking lot.')
  })

  it('ignores a single stray quoted line', () => {
    // One "> yes" is somebody quoting a colleague, not sharing a draft.
    expect(quotedBlockIn('> yes\nagreed')).toBe('')
  })
})

describe('draftContentTypeFrom', () => {
  it('uses what the message says it is', () => {
    expect(draftContentTypeFrom(JUHAN_NEWSLETTER)).toBe('newsletter')
    expect(draftContentTypeFrom("here's a draft of the reel script")).toBe('reel')
  })

  it('falls back to other rather than guessing a channel', () => {
    expect(draftContentTypeFrom("here's a draft:\n> some words\n> and more of them")).toBe('other')
  })
})

describe('draftTitleFrom and draftBodyFrom', () => {
  it('names the thing from the line that announced it', () => {
    expect(draftTitleFrom(JUHAN_NEWSLETTER)).toBe('Next newsletter is for TheBlanding.com')
  })

  it('separates the copy from the preamble when there is no blockquote', () => {
    const text = "Here's a draft:\nThe first line of the actual copy goes here and runs on a while."
    expect(draftBodyFrom(text)).toBe('The first line of the actual copy goes here and runs on a while.')
  })
})

describe('looksLikeAnIdea', () => {
  it('catches somebody proposing work', () => {
    const proposals = [
      'we should do a reel about the Heard project before the intern leaves',
      'what if we turned the determinants poster into a short explainer video?',
      'Idea: a one-pager comparing our pilot pre-mortem to the usual vendor checklist',
      "let's write up the Ipsos migration as a case study, it keeps coming up on calls",
      'could we send a short note to everyone who downloaded the poster last year?',
    ]
    for (const text of proposals) {
      expect(looksLikeAnIdea(text).capture, text).toBe(true)
    }
  })

  it('ignores ordinary chatter', () => {
    // A board full of chatter costs more than a missed idea: the idea is still
    // in the channel and somebody can say it again, but a board people stop
    // trusting is worse than no board.
    const chatter = [
      'morning all',
      'thanks!',
      'yes that works for me',
      'ok',
      'sounds good, I will pick it up tomorrow',
      'the deploy finished',
    ]
    for (const text of chatter) {
      expect(looksLikeAnIdea(text).capture, text).toBe(false)
    }
  })

  it('ignores questions about work that already exists', () => {
    // "Should we still do the reel?" is about something already on the board.
    // Capturing it creates a duplicate of the thing being asked about.
    expect(looksLikeAnIdea('any update on the reel? should we still do it this week').capture).toBe(false)
    expect(looksLikeAnIdea("what's the status on the email funnel, can we ship it friday").capture).toBe(false)
  })

  it('leaves availability alone, since that has its own path', () => {
    expect(looksLikeAnIdea('I am away next week, we should pick this up after').capture).toBe(false)
  })

  it('treats a dropped link as sharing, not proposing', () => {
    expect(looksLikeAnIdea('https://example.com/article we should read this').capture).toBe(false)
  })

  it('still captures a link with a real proposal around it', () => {
    const text =
      'https://example.com/report we should do our own version of this for health systems, ' +
      'the data is public and nobody has visualised it'
    expect(looksLikeAnIdea(text).capture).toBe(true)
  })

  it('explains itself either way', () => {
    // The reason is what makes the filter tunable rather than mysterious.
    expect(looksLikeAnIdea('we should ship a newsletter about the shop launch').reason).toContain('we should')
    expect(looksLikeAnIdea('ok').reason).toBeTruthy()
  })
})

describe('ideaTitleFrom', () => {
  it('takes the sentence that carried the proposal, not the first one', () => {
    // The first sentence is usually throat-clearing.
    const text = 'hey all, quick one. we should do a reel about the Blandening before term ends.'
    expect(ideaTitleFrom(text)).toBe('we should do a reel about the Blandening before term ends')
  })

  it('cuts long messages on a word boundary', () => {
    const text = `we should ${'build something quite elaborate '.repeat(10)}`
    const title = ideaTitleFrom(text)
    expect(title.length).toBeLessThanOrEqual(91)
    expect(title.endsWith('…')).toBe(true)
    expect(title).not.toMatch(/\s…$/)
  })

  it('never returns an empty title', () => {
    expect(ideaTitleFrom('')).toBe('Idea from Slack')
  })
})

describe('ideaCategoryFrom', () => {
  it('labels what it is confident about', () => {
    expect(ideaCategoryFrom('we should do a reel about the intern work')).toBe('content')
    expect(ideaCategoryFrom('we should look at our search console rankings')).toBe('seo')
    expect(ideaCategoryFrom('custom patches and stickers are good, cheap experiments')).toBe('product')
  })

  it('returns nothing rather than guessing', () => {
    // A wrong label is worse than none: it silently sorts the idea into a
    // bucket nobody is looking at.
    expect(ideaCategoryFrom('we should talk to the board about next year')).toBeUndefined()
  })
})

describe('ideaDocIdForMessage', () => {
  it('is deterministic, so a Slack retry cannot double-post the idea', () => {
    const first = ideaDocIdForMessage({ channel: 'C0BSFACJY6T', ts: '1756300000.123456' })
    const second = ideaDocIdForMessage({ channel: 'C0BSFACJY6T', ts: '1756300000.123456' })
    expect(first).toBe(second)
    expect(first).toMatch(/^marketingIdea\.slack-/)
  })

  it('has no dot beyond the type prefix, so it cannot collide oddly', () => {
    const id = ideaDocIdForMessage({ channel: 'C0B', ts: '1756300000.123456' })
    expect(id.split('.').length).toBe(2)
  })
})

describe('messageProse', () => {
  it('strips Slack markup so the filter reads what a person typed', () => {
    expect(messageProse('<@U123> we should *definitely* do this <#C456|general>')).toBe(
      'we should definitely do this',
    )
  })

  it('keeps the label out of a Slack link, not the url', () => {
    // "Next newsletter is for TheBlanding.com" must survive; the raw href
    // would otherwise take the title's place.
    expect(messageProse('Next newsletter is for <https://TheBlanding.com|TheBlanding.com>.')).toBe(
      'Next newsletter is for TheBlanding.com.',
    )
  })
})

describe('slackPermalink', () => {
  it('points back at the conversation', () => {
    expect(slackPermalink({ workspace: 'goinvo', channel: 'C0BSFACJY6T', ts: '1756300000.123456' })).toBe(
      'https://goinvo.slack.com/archives/C0BSFACJY6T/p1756300000123456',
    )
  })

  it('returns nothing rather than a broken link when the workspace is unknown', () => {
    expect(slackPermalink({ workspace: '', channel: 'C0B', ts: '1.2' })).toBeUndefined()
  })
})

describe('buildCapturedIdea', () => {
  const idea = buildCapturedIdea({
    text: 'we should do a reel about the Heard project before the intern leaves',
    personName: 'Shirley',
    channel: 'C0BSFACJY6T',
    ts: '1756300000.123456',
    workspace: 'goinvo',
  })

  it('marks itself as a guess awaiting review', () => {
    // Without this a filter's guess looks exactly like an idea somebody entered
    // deliberately, and the board stops meaning anything.
    expect(idea.needsReview).toBe(true)
    expect(idea.source).toContain('not yet reviewed')
  })

  it('keeps the whole message, not just the title', () => {
    // The title is a summary, and summaries lose the caveat that made the idea
    // worth having.
    expect(idea.summary).toContain('before the intern leaves')
  })

  it('says who said it and links back to where', () => {
    expect(idea.source).toContain('Shirley')
    expect(idea.relatedUrl).toContain('goinvo.slack.com')
  })

  it('lands on the board as an idea, not as planned work', () => {
    expect(idea.status).toBe('idea')
  })
})
