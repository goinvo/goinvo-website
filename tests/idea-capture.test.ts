import { describe, expect, it } from 'vitest'

import { decodeSlackText } from '@/lib/marketing/slackText'
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
 * The two messages Marqueta missed on 2026-08-27 — SYNTHETIC stand-ins.
 *
 * These are NOT the original messages. They are rewritten in the same SHAPE:
 * the same proposal markers in the same positions, the same bullet count, the
 * same statement-then-blockquote structure. The shape is what the filter keys
 * on, so the regression value survives while a colleague’s actual words are
 * not committed to a public repository. If you edit these, keep the markers:
 * "What about:" over bullets, "might be a good", "any other ideas",
 * "inexpensive experiments", and a draft that announces itself then quotes.
 *
 * Pinned as fixtures because they are the reason the filter changed: the first
 * set of markers was written from imagination rather than from how this team
 * actually talks, and a regression here means she stops catching the exact
 * thing she was built for.
 */
const MERCH_BURST = [
  [
    'What about:',
    '• custom printed patch of Open Data Wins',
    '• custom enamel pins of Charts Not Dogma',
    '• custom iron-on decal for shirts, Open Data Wins',
    '... for the autumn street fair',
  ].join('\n'),
  "Yup, we'll have some tshirts... but this might be a good compliment.",
  'any other ideas or designs or...?',
  'custom patches and stickers are good, inexpensive experiments!',
]

const NEWSLETTER_DRAFT = [
  'Next newsletter is for <https://example.org|example.org>.',
  '',
  'Here’s a draft:',
  '> Look at any discharge form.',
  '>',
  '> It’s a wall of grey eight-point type.',
  '> A shrug, printed on paper.',
  '>',
  '> We’ve designed the care out of the paperwork.',
  '> Let’s put it back in.',
].join('\n')

describe('the messages Marqueta actually missed', () => {
  it('catches every part of the merch burst', () => {
    for (const text of MERCH_BURST) {
      expect(classifyMessage(text).kind, text).toBe('idea')
    }
  })

  it('reads the newsletter as a draft, not an idea', () => {
    // Filing this as an "idea" would throw away the copy, which is the only
    // part that took any effort.
    expect(classifyMessage(NEWSLETTER_DRAFT).kind).toBe('draft')
  })

  it('titles the bulleted list by its subject, not its first bullet', () => {
    // "custom printed patch of Open Data Wins" as a title hides the other
    // two ideas and the occasion that made them worth having.
    const title = ideaTitleFrom(MERCH_BURST[0])
    expect(title).toContain('the autumn street fair')
    expect(title).toContain('3 ideas')
  })

  it('keeps all three merch ideas, each on its own line', () => {
    const idea = buildCapturedIdea({ text: MERCH_BURST[0], personName: 'Ada', channel: 'C1', ts: '1.1' })
    expect(bulletsIn(MERCH_BURST[0])).toHaveLength(3)
    expect(idea.summary).toContain('Charts Not Dogma')
    expect(idea.summary).toContain('iron-on decal')
    expect(idea.category).toBe('product')
  })

  it('files the newsletter with its copy, dateless and unable to post itself', () => {
    const draft = buildCapturedDraft({ text: NEWSLETTER_DRAFT, personName: 'Ada', channel: 'C1', ts: '1.1' })
    expect(draft.title).toContain('example.org')
    expect(draft.contentType).toBe('newsletter')
    expect(draft.contentDraft).toContain('A shrug, printed on paper.')
    expect(draft.contentDraft).toContain('put it back in')
    // The announcement is not part of the copy.
    expect(draft.contentDraft).not.toContain('Next newsletter is for')
    expect(draft.status).toBe('drafting')
    // Nothing Marqueta catches may ever post itself.
    expect(draft.autoPublish).toBe(false)
  })
})

/**
 * The same messages as Slack DELIVERS them: a typed quote arrives as `&gt;`,
 * an ampersand as `&amp;`, a link as `<url|label>`. The events route decodes
 * before it classifies (`decodeSlackText`); these pin that the decoded form
 * reads the way the typed one does — a short pasted draft was classified as
 * nothing, and a long one kept a literal "&gt;" in the calendar copy.
 */
describe('the delivered form, decoded', () => {
  const SHORT_DRAFT = 'Here’s a draft:\n&gt; Look at any discharge form.\n&gt; A shrug, printed on paper.'

  it('reads a short pasted draft as a draft once decoded — and as nothing before', () => {
    expect(classifyMessage(SHORT_DRAFT).kind).toBe('none')
    expect(classifyMessage(decodeSlackText(SHORT_DRAFT)).kind).toBe('draft')
  })

  it('keeps no escaping in the copy it files', () => {
    const delivered = NEWSLETTER_DRAFT.replace(/^>/gm, '&gt;')
    const draft = buildCapturedDraft({ text: decodeSlackText(delivered), personName: 'Ada', channel: 'C1', ts: '1.1' })
    expect(draft.contentDraft).toContain('A shrug, printed on paper.')
    expect(draft.contentDraft).not.toContain('&gt;')
    expect(draft.title).toBe('Next newsletter is for example.org')
    const idea = buildCapturedIdea({ text: decodeSlackText('we should do a R&amp;D webinar with AT&amp;T'), personName: 'Ada', channel: 'C1', ts: '1.2' })
    expect(idea.title).toBe('we should do a R&D webinar with AT&T')
  })
})

describe('quotedBlockIn', () => {
  it('reads the pasted copy out of a Slack blockquote', () => {
    expect(quotedBlockIn(NEWSLETTER_DRAFT)).toContain('Look at any discharge form.')
  })

  it('ignores a single stray quoted line', () => {
    // One "> yes" is somebody quoting a colleague, not sharing a draft.
    expect(quotedBlockIn('> yes\nagreed')).toBe('')
  })
})

describe('draftContentTypeFrom', () => {
  it('uses what the message says it is', () => {
    expect(draftContentTypeFrom(NEWSLETTER_DRAFT)).toBe('newsletter')
    expect(draftContentTypeFrom("here's a draft of the reel script")).toBe('reel')
  })

  it('falls back to other rather than guessing a channel', () => {
    expect(draftContentTypeFrom("here's a draft:\n> some words\n> and more of them")).toBe('other')
  })
})

describe('draftTitleFrom and draftBodyFrom', () => {
  it('names the thing from the line that announced it', () => {
    expect(draftTitleFrom(NEWSLETTER_DRAFT)).toBe('Next newsletter is for example.org')
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

  it('files a table at an event as growth, not product — the idea is being there', () => {
    // Was "Filed under product" because it mentions stickers.
    expect(ideaCategoryFrom('we should do a merch table at the autumn street fair, stickers and a tote')).toBe('growth')
    expect(ideaCategoryFrom('what about a booth at the HIMSS conference')).toBe('growth')
    // A table that is not at an event is not a presence.
    expect(ideaCategoryFrom('we should add a table of offers to the report')).toBeUndefined()
    // …and "every day" is not an event: bare "day" filed this under growth.
    expect(ideaCategoryFrom('add a table of numbers to the report every day')).toBeUndefined()
    expect(ideaCategoryFrom('a table in town for the market data')).toBeUndefined()
    // A named place still is one.
    expect(ideaCategoryFrom('a booth at HIMSS next spring')).toBe('growth')
    expect(ideaCategoryFrom('a table at the farmers market')).toBe('growth')
  })

  it('still knows the longer words that whole-word matching stopped catching', () => {
    // Substring matching found "measure" in measurement and "merch" in
    // merchandise; whole words need them listed.
    expect(ideaCategoryFrom('we need better measurement of the funnel')).toBe('measurement')
    expect(ideaCategoryFrom('we should sell merchandise at cost')).toBe('product')
    expect(ideaCategoryFrom('we should start blogging again')).toBe('content')
  })

  it('matches whole words, so a workshop is not a shop and a sprint is not a print', () => {
    expect(ideaCategoryFrom('we should run a workshop on clinical AI')).toBeUndefined()
    expect(ideaCategoryFrom('let’s sprint on the offer page')).toBeUndefined()
    expect(ideaCategoryFrom('we should print posters for the lobby')).toBe('product')
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
    // "Next newsletter is for example.org" must survive; the raw href
    // would otherwise take the title's place.
    expect(messageProse('Next newsletter is for <https://example.org|example.org>.')).toBe(
      'Next newsletter is for example.org.',
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
    personName: 'Ada',
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
    expect(idea.source).toContain('Ada')
    expect(idea.relatedUrl).toContain('goinvo.slack.com')
  })

  it('lands on the board as an idea, not as planned work', () => {
    expect(idea.status).toBe('idea')
  })
})

describe('markers must match whole words', () => {
  /**
   * Both of these were found by running the filter over 189 real messages from
   * #marketing rather than over examples I had written myself — which is the
   * only way this class of mistake ever shows up.
   */
  it('does not find "lets" inside "bullets"', () => {
    // A bug report about the Determinants page — "all the bullet lists have
    // duplicate bullets on them" — was captured as a proposal, because
    // "bul-LETS ON them" contains the marker "lets ".
    const bugReport =
      'could you look at the "Determinants of Health" page? I just noticed that all the ' +
      'bullet lists on the page have duplicate bullets on them.'
    expect(classifyMessage(bugReport).kind).toBe('none')
  })

  it('does not find "ooo" inside "mooooore"', () => {
    // The costlier direction: "no need to say it mooooore" matched the
    // availability marker "ooo", so a real page-feedback message was thrown
    // away as though somebody had announced a holiday.
    const feedback =
      'quick hits on the home page: the heading repeats itself, no need to say it mooooore. ' +
      'ps: how about just "browse" for the button?'
    expect(classifyMessage(feedback).kind).toBe('idea')
  })

  it('still matches a marker that is genuinely there', () => {
    expect(classifyMessage("lets do a reel about the intern projects this month").kind).toBe('idea')
    expect(classifyMessage('I am away next week, we should pick this up after').kind).toBe('none')
  })
})
