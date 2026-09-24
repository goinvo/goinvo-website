import { describe, expect, it } from 'vitest'

import {
  addressesMarqueta,
  captureConfirmation,
  marquetaHelpText,
  parseMarquetaIntent,
  stripAddress,
  stripMention,
  type MarquetaIntent,
} from '@/lib/marketing/marquetaChat'
import { parsePrepRequest, resolvePrepTarget, type PrepContact, type PrepTargetMatch } from '@/lib/marketing/callPrep'
import { decodeSlackText, marquetaHandle } from '@/lib/marketing/slackText'

import { expectValidSlackBlocks } from './support/slackBlocks'

const BOT = 'U0B4DQ2B5D1'

describe('addressesMarqueta', () => {
  it('knows when she is spoken to rather than merely present', () => {
    expect(addressesMarqueta(`<@${BOT}> what's on this week?`, BOT)).toBe(true)
    expect(addressesMarqueta('we should do a reel about Heard', BOT)).toBe(false)
  })

  it('is not fooled by someone else being mentioned', () => {
    // Answering when a colleague is tagged is the fastest way to become the
    // thing everyone mutes.
    expect(addressesMarqueta('<@U05SDK0J8QP> can you look at this?', BOT)).toBe(false)
  })

  it('stays silent rather than guessing when it does not know its own id', () => {
    expect(addressesMarqueta(`<@${BOT}> hello`, undefined)).toBe(false)
  })
})

describe('stripMention', () => {
  it('leaves the actual question behind', () => {
    expect(stripMention(`<@${BOT}> runway`, BOT)).toBe('runway')
    expect(stripMention(`hey <@${BOT}>, capture this: do a reel`, BOT)).toBe('hey , capture this: do a reel')
  })
})

describe('parseMarquetaIntent', () => {
  it('answers questions about the week', () => {
    for (const text of ['week', 'this week', 'plan', "what's on", 'what should i do']) {
      expect(parseMarquetaIntent(text).kind, text).toBe('week')
    }
  })

  it('answers questions about money', () => {
    expect(parseMarquetaIntent('runway').kind).toBe('runway')
    expect(parseMarquetaIntent('how is the runway looking').kind).toBe('runway')
  })

  it('files what it is told to file, whatever it sounds like', () => {
    // An explicit instruction must beat her own opinion — being told to put
    // something on the board is not an invitation to judge whether it is one.
    const intent = parseMarquetaIntent('capture: order more poster tubes before Town Day')
    expect(intent.kind).toBe('capture')
    if (intent.kind === 'capture') {
      expect(intent.explicit).toBe(true)
      expect(intent.text).toBe('order more poster tubes before Town Day')
    }
  })

  it('does not file an empty thought', () => {
    // "capture" alone is somebody who has not finished typing.
    expect(parseMarquetaIntent('capture').kind).toBe('help')
    expect(parseMarquetaIntent('note:').kind).toBe('help')
  })

  it('routes availability to the parser that owns it', () => {
    expect(parseMarquetaIntent('away 2026-09-01 2026-09-05').kind).toBe('availability')
    expect(parseMarquetaIntent("i'm back").kind).toBe('availability')
  })

  it('treats a substantial message as something worth keeping', () => {
    // Said directly to her, so it was meant for her — and it reuses the shared
    // classifier rather than inventing a second definition of "an idea".
    const intent = parseMarquetaIntent('we should do a reel about the Heard project before the intern leaves')
    expect(intent.kind).toBe('capture')
    if (intent.kind === 'capture') expect(intent.explicit).toBe(false)
  })

  it('offers help rather than filing a greeting', () => {
    for (const text of ['hi', 'hello', 'hey', 'help', 'what can you do']) {
      expect(parseMarquetaIntent(text).kind, text).toBe('help')
    }
  })
})

describe('captureConfirmation', () => {
  it('says plainly when the filing was her guess', () => {
    const guessed = captureConfirmation({ kind: 'idea', title: 'A thing', explicit: false })
    expect(guessed).toMatch(/my guess/i)
    expect(guessed).toMatch(/bin it/i)
  })

  it('does not hedge when it was asked for', () => {
    const asked = captureConfirmation({ kind: 'idea', title: 'A thing', explicit: true })
    expect(asked).toMatch(/because you asked/i)
    expect(asked).not.toMatch(/my guess/i)
  })

  it('says where a draft went, since it is not the board', () => {
    expect(captureConfirmation({ kind: 'draft', title: 'Newsletter', explicit: true })).toContain('calendar')
  })
})

describe('marquetaHelpText', () => {
  it('states that she listens quietly, so nobody is surprised by it', () => {
    // A bot reading a channel without saying so is the kind of thing people
    // are right to object to after the fact.
    const help = marquetaHelpText()
    expect(help).toMatch(/listen/i)
    expect(help).toMatch(/never post there uninvited/i)
  })

  it('names the things she can actually do', () => {
    const help = marquetaHelpText()
    for (const command of ['week', 'runway', 'ideas', 'capture']) {
      expect(help).toContain(command)
    }
  })
})

// ── Marqueta v2: addressing by name, prep, call logging, new questions ───────

const kindOf = (text: string) => parseMarquetaIntent(text).kind

/** What the events route will actually hand the parser: decoded, address removed. */
const fromSlack = (raw: string) => parseMarquetaIntent(stripAddress(decodeSlackText(raw), BOT))

function expectIntent<K extends MarquetaIntent['kind']>(text: string, kind: K): Extract<MarquetaIntent, { kind: K }> {
  const intent = parseMarquetaIntent(text)
  expect(intent.kind, text).toBe(kind)
  return intent as Extract<MarquetaIntent, { kind: K }>
}

describe('addressesMarqueta — by name', () => {
  it('hears her name followed by a comma or colon, without knowing her id', () => {
    // The mention is not something people can type: she posts under a
    // per-message name, so "@Marqueta" typed by hand is plain text.
    for (const text of ['Marqueta, prep Jane', 'marqueta: what is on', 'MARQUETA , runway', 'Marqueta?', 'marqueta']) {
      expect(addressesMarqueta(text, undefined), text).toBe(true)
    }
  })

  it('does not answer people talking ABOUT her', () => {
    for (const text of [
      'Marqueta caught two ideas last week',
      'Marqueta’s list is long',
      "Marqueta's digest was late",
      'I think Marqueta, honestly, is useful', // not at the start
      'thanks @Marqueta',
      '@marquetabot hello',
    ]) {
      expect(addressesMarqueta(text, BOT), text).toBe(false)
    }
  })

  it('takes a typed @Marqueta and a greeting in front of the name', () => {
    expect(addressesMarqueta('@Marqueta prep Jane', undefined)).toBe(true)
    expect(addressesMarqueta('hey Marqueta, runway?', undefined)).toBe(true)
    expect(addressesMarqueta('hi @marqueta what is on', undefined)).toBe(true)
    // A greeting does not make the bare name an address: this could be anyone
    // telling a colleague what she did.
    expect(addressesMarqueta('hey marqueta caught my idea', undefined)).toBe(false)
  })

  it('still hears her real mention anywhere, including the older <@U|name> form', () => {
    expect(addressesMarqueta(`thanks <@${BOT}> — what is on?`, BOT)).toBe(true)
    expect(addressesMarqueta(`<@${BOT}|goinvo_website_chat> runway`, BOT)).toBe(true)
  })

  it('works on raw Slack text as well as decoded text', () => {
    const raw = 'Marqueta, prep a call with AT&amp;T'
    expect(addressesMarqueta(raw, BOT)).toBe(true)
    expect(addressesMarqueta(decodeSlackText(raw), BOT)).toBe(true)
  })
})

describe('stripAddress', () => {
  it('removes her mention and the punctuation it leaves behind', () => {
    expect(stripAddress(`<@${BOT}> runway`, BOT)).toBe('runway')
    expect(stripAddress(`hey <@${BOT}>, capture this: do a reel`, BOT)).toBe('capture this: do a reel')
    expect(stripAddress(`<@${BOT}|marqueta>: prep Jane`, BOT)).toBe('prep Jane')
  })

  it('removes a leading "Marqueta," and "@Marqueta"', () => {
    expect(stripAddress('Marqueta, prep Jane Doe at Acme')).toBe('prep Jane Doe at Acme')
    expect(stripAddress('@Marqueta what is on')).toBe('what is on')
    expect(stripAddress('hey Marqueta: runway?')).toBe('runway?')
  })

  it('keeps line breaks, because a bulleted list IS the idea', () => {
    expect(stripAddress(`<@${BOT}> capture:\n- a patch\n- a sticker`, BOT)).toBe('capture:\n- a patch\n- a sticker')
  })

  it('leaves a colleague alone when it knows her id', () => {
    expect(stripAddress(`<@${BOT}> ask <@U05SDK0J8QP> about it`, BOT)).toBe('ask <@U05SDK0J8QP> about it')
  })

  it('does not eat the name mid-sentence or a possessive', () => {
    expect(stripAddress('Marqueta’s list is long')).toBe('Marqueta’s list is long')
    expect(stripAddress('prep Jane, Marqueta')).toBe('prep Jane, Marqueta')
  })
})

describe('parseMarquetaIntent — prep', () => {
  it('understands every way people ask to be got ready for a call', () => {
    const phrasings = [
      'prep Jane Doe at Acme',
      'prep me for Jane Doe',
      'prepare for my call with Jane at Acme',
      'prepping for Acme',
      'call prep for Jane Doe, CMIO at Acme — met her at HIMSS',
      'outline for calling Jane at MGB',
      'brief me on Jane at Acme',
      'script for Acme',
      'write a call script for Sam Rivera',
      'help me call Jane at Acme',
      'get me ready for my call with Jane',
      'can you prep Jane',
      'could you please prepare me for Acme',
      'would you prep Sam at Acme tomorrow at 3pm',
      'please prep Jane Doe',
      'I need you to prep Sam at Acme',
      'i need to prep for Acme on Friday',
      'help me prep for Jane',
      'prep jane@mgb.org',
      'prep Great Plains Health', // a compliment-shaped word that is a name
      'prep Emily Post', // a thing-shaped word that is a name
    ]
    for (const text of phrasings) {
      const intent = expectIntent(text, 'prep')
      expect(intent.format, text).toBe('call')
      // `text` is the request as typed; `target` is who it is for (the
      // round-trip through the parser and resolver is tested below).
      expect(intent.text, text).toBe(text)
      expect(intent.target, text).not.toBe('')
    }
  })

  it('knows when the thing wanted is an email', () => {
    for (const text of [
      'draft an email to Jane at Acme',
      'draft me a first email to Sam',
      'write an email to jane@mgb.org',
      'email draft for Sam at Acme',
      'prep an email to Jane',
      'can you draft a follow-up email to Priya at MGB',
    ]) {
      expect(expectIntent(text, 'prep').format, text).toBe('email')
    }
  })

  it('answers "who should I call" with the list, not an outline', () => {
    for (const text of [
      'prep my calls',
      'prep me for my calls this week',
      'get me ready for this week’s calls',
      'prep my outreach calls',
      'who should I call today?',
      'so who do I call next',
      'who’s on my call list',
      "what's on my call list",
      'my calls',
      'my calls this week',
      'calls this week',
      'show me my calls',
      'what are my calls this week',
      'can you list my calls',
      'prep list',
    ]) {
      expect(kindOf(text), text).toBe('prepList')
    }
  })

  it('gives the list for a bare verb rather than an outline for nobody', () => {
    for (const text of ['prep', 'prepare', 'get me ready', 'prep me for tomorrow', 'prep an email', 'call prep']) {
      expect(kindOf(text), text).toBe('prepList')
    }
  })

  it('does not prep a call when the verb sits inside a proposal', () => {
    // The spec's traps: both belong on the board.
    const script = expectIntent('we should prep a script for payers', 'capture')
    expect(script.explicit).toBe(false)
    expect(kindOf('what if we emailed everyone who downloaded the kit')).toBe('capture')
    expect(kindOf('can we outline a call script for payers?')).toBe('capture')
  })

  it('answers the question when the object is one of her own topics', () => {
    expect(kindOf('brief me on the runway')).toBe('runway')
    expect(kindOf('brief me on my tasks')).toBe('mine')
    expect(kindOf('brief me on the pipeline this week')).toBe('pipeline')
    expect(kindOf('outline the plan for next week')).toBe('week')
    // …but a person after the topic word is still a person.
    expect(kindOf('prep outreach to Jane at Acme')).toBe('prep')
  })

  it('does not prep a call when the verb was a noun or the object is a thing', () => {
    for (const text of ['prep was great, thanks', 'outline looks good', 'script worked!', 'prep, thanks!']) {
      expect(kindOf(text), text).not.toBe('prep')
    }
    for (const text of ['prepare the newsletter for Friday', 'prep the booth for Town Day', 'prep our holiday post']) {
      expect(kindOf(text), text).not.toBe('prep')
    }
  })

  it('prep beats availability words about the person being called', () => {
    // "away" is about Jane, not the person asking — it must not mark them away.
    expect(kindOf('prep Jane — she is away until Monday')).toBe('prep')
    expect(kindOf('prep Sam at Acme, back on Tuesday')).toBe('prep')
  })

  it('an explicit capture still beats prep', () => {
    const intent = expectIntent('idea: prep a script for payers', 'capture')
    expect(intent.explicit).toBe(true)
    expect(intent.text).toBe('prep a script for payers')
  })
})

describe('parseMarquetaIntent — the prep target reaches the right person', () => {
  // The contract that matters is not the intent but what happens next: the
  // target goes through parsePrepRequest and resolvePrepTarget, and a target
  // that still carries a command word resolves to NOBODY — and "nobody" posts
  // an "Add <that phrase> to outreach" button that files a junk contact.
  // When `text` was handed on whole, every one of the flagged phrasings below
  // resolved to `none` with the contact on file.
  const DIRECTORY: PrepContact[] = [
    { _id: 'c-jane', name: 'Jane Doe', organization: 'Acme Health', email: 'jane.doe@acmehealth.org' },
    { _id: 'c-sam', name: 'Sam Rivera', organization: 'Acme Health' },
    { _id: 'c-priya', name: 'Priya Patel', organization: 'Mass General Brigham', email: 'priya@mgb.org' },
    { _id: 'c-jane-mgb', name: 'Jane Smith', organization: 'Mass General Brigham', email: 'jane@mgb.org' },
    { _id: 'c-lee', name: 'Lee Chen', organization: 'AT&T' },
  ]

  const resolved = (match: PrepTargetMatch) =>
    match.kind === 'contact'
      ? match.contact._id
      : match.kind === 'organization'
        ? `org:${match.organization}`
        : match.kind === 'ambiguous'
          ? `ambiguous:${match.candidates.map((candidate) => candidate.contactId).join(',')}`
          : 'none'

  // [what was typed, target, name, organization, who it resolves to]
  const CASES: Array<[string, string, string, string, string]> = [
    ['prep Jane Doe at Acme', 'Jane Doe at Acme', 'Jane Doe', 'Acme', 'c-jane'],
    ['prep me for Jane Doe', 'Jane Doe', 'Jane Doe', '', 'c-jane'],
    ['prepare for my call with Jane at Acme', 'Jane at Acme', 'Jane', 'Acme', 'c-jane'],
    ['prepping for Acme', 'Acme', '', 'Acme', 'org:Acme Health'],
    // Flagged in review: each of these used to reach the resolver with the verb still on.
    ['prepping for Priya Patel', 'Priya Patel', 'Priya Patel', '', 'c-priya'],
    ['write a call script for Sam Rivera', 'Sam Rivera', 'Sam Rivera', '', 'c-sam'],
    ['help us prepare for Priya Patel', 'Priya Patel', 'Priya Patel', '', 'c-priya'],
    ['draft a quick message to Sam at Acme Health', 'Sam at Acme Health', 'Sam', 'Acme Health', 'c-sam'],
    ['prep outreach to Jane at Acme Health', 'Jane at Acme Health', 'Jane', 'Acme Health', 'c-jane'],
    ['call prep for Jane Doe, CMIO at Acme — met her at HIMSS', 'Jane Doe, CMIO at Acme — met her at HIMSS', 'Jane Doe', 'Acme', 'c-jane'],
    ['outline for calling Jane at MGB', 'Jane at MGB', 'Jane', 'MGB', 'c-jane-mgb'],
    ['brief me on Jane at Acme', 'Jane at Acme', 'Jane', 'Acme', 'c-jane'],
    ['script for Acme', 'Acme', '', 'Acme', 'org:Acme Health'],
    ['help me call Jane at Acme', 'Jane at Acme', 'Jane', 'Acme', 'c-jane'],
    // A first name alone is two people here — asking which is the right answer.
    ['get me ready for my call with Jane', 'Jane', '', 'Jane', 'ambiguous:c-jane,c-jane-mgb'],
    ['can you prep Jane', 'Jane', '', 'Jane', 'ambiguous:c-jane,c-jane-mgb'],
    ['help me prep for Jane', 'Jane', '', 'Jane', 'ambiguous:c-jane,c-jane-mgb'],
    ['could you please prepare me for Acme', 'Acme', '', 'Acme', 'org:Acme Health'],
    ['would you prep Sam at Acme tomorrow at 3pm', 'Sam at Acme tomorrow at 3pm', 'Sam', 'Acme', 'c-sam'],
    ['please prep Jane Doe', 'Jane Doe', 'Jane Doe', '', 'c-jane'],
    ['I need you to prep Sam at Acme', 'Sam at Acme', 'Sam', 'Acme', 'c-sam'],
    ['i need to prep for Acme on Friday', 'Acme on Friday', '', 'Acme', 'org:Acme Health'],
    ['prep jane@mgb.org', 'jane@mgb.org', 'jane@mgb.org', '', 'c-jane-mgb'],
    ['prep a call with AT&T', 'AT&T', '', 'AT&T', 'org:AT&T'],
    ['prep my pitch to Sam at Acme', 'Sam at Acme', 'Sam', 'Acme', 'c-sam'],
    ['prep an intro to Priya Patel', 'Priya Patel', 'Priya Patel', '', 'c-priya'],
    ['prep a follow-up with Jane Doe', 'Jane Doe', 'Jane Doe', '', 'c-jane'],
    // Nobody on file: `none` is right, and the name it would add is clean.
    ['prep Great Plains Health', 'Great Plains Health', '', 'Great Plains Health', 'none'],
    ['prep Emily Post', 'Emily Post', 'Emily Post', '', 'none'],
    ['draft an email to Jane at Acme', 'Jane at Acme', 'Jane', 'Acme', 'c-jane'],
    ['draft me a first email to Sam', 'Sam', '', 'Sam', 'c-sam'],
    ['write an email to jane@mgb.org', 'jane@mgb.org', 'jane@mgb.org', '', 'c-jane-mgb'],
    ['email draft for Sam at Acme', 'Sam at Acme', 'Sam', 'Acme', 'c-sam'],
    ['prep an email to Jane', 'Jane', '', 'Jane', 'ambiguous:c-jane,c-jane-mgb'],
    ['can you draft a follow-up email to Priya at MGB', 'Priya at MGB', 'Priya', 'MGB', 'c-priya'],
  ]

  it('hands the parser only the "who", which then resolves to the person on file', () => {
    for (const [text, target, name, organization, who] of CASES) {
      const intent = expectIntent(text, 'prep')
      expect(intent.target, text).toBe(target)
      const request = parsePrepRequest(intent.target)
      expect({ name: request.name, organization: request.organization }, text).toEqual({ name, organization })
      expect(resolved(resolvePrepTarget(request, DIRECTORY)), text).toBe(who)
    }
  })

  it('never leaves a command word where a name or organisation should be', () => {
    // The failure is a contact called "prepping for Priya Patel" — catch the
    // whole class, not only the phrasings anybody thought to list.
    const COMMAND_WORD = /\b(?:prep|prepare|prepping|draft|write|script|outline|brief|help|outreach|message|email|calling|pitch|intro|follow-up)\b/i
    for (const [text] of CASES) {
      const request = parsePrepRequest(expectIntent(text, 'prep').target)
      expect(request.name, text).not.toMatch(COMMAND_WORD)
      expect(request.organization, text).not.toMatch(COMMAND_WORD)
    }
  })

  it('still answers the question when "outreach" is the topic rather than the kind of contact', () => {
    // "outreach for" is only taken off AFTER the topic check, or "this week"
    // would be all that is left and read as a request for the call list.
    expect(kindOf('brief me on outreach for this week')).toBe('pipeline')
    expect(kindOf('prep outreach for this week')).toBe('pipeline')
    expect(kindOf('prep outreach for tomorrow')).toBe('prepList')
    expect(kindOf('prep outreach to the newsletter')).not.toBe('prep')
  })

  it('reads a line break after the name as the start of a note', () => {
    const intent = expectIntent('prep Jane Doe at Acme\nmet her at HIMSS', 'prep')
    expect(intent.target).toBe('Jane Doe at Acme — met her at HIMSS')
    const request = parsePrepRequest(intent.target)
    expect(request).toMatchObject({ name: 'Jane Doe', organization: 'Acme', note: 'met her at HIMSS' })
    // What is returned as `text` is still what was typed.
    expect(intent.text).toBe('prep Jane Doe at Acme\nmet her at HIMSS')
  })

  it('keeps a name exactly as typed', () => {
    expect(expectIntent('prep O’Brien at Acme', 'prep').target).toBe('O’Brien at Acme')
    // "pitch" and "intro" only come off with the preposition after them: here they are the company.
    expect(expectIntent('prep Pitch Health', 'prep').target).toBe('Pitch Health')
    expect(expectIntent('prep Intro Labs at 3pm', 'prep').target).toBe('Intro Labs at 3pm')
    // …and "my pitch" on its own is a thing to prepare, not somebody to add to outreach.
    expect(kindOf('prep my pitch')).not.toBe('prep')
  })

  it('log targets make the same round trip', () => {
    for (const [text, who] of [
      ['left Sam Rivera at Acme a message', 'c-sam'],
      ['called Jane at Acme\nno answer', 'c-jane'],
      ['spoke with Priya at MGB, interested', 'c-priya'],
      ['i emailed Sam at Acme', 'c-sam'],
    ] as const) {
      const intent = expectIntent(text, 'logCall')
      expect(resolved(resolvePrepTarget(parsePrepRequest(intent.target), DIRECTORY)), text).toBe(who)
    }
  })
})

describe('parseMarquetaIntent — logging a call', () => {
  it('recognises first-person past tense at the start, and finds who', () => {
    const cases: Array<[string, string]> = [
      ['called Jane Doe at Acme, no answer', 'Jane Doe at Acme'],
      ['I called Sam', 'Sam'],
      ['just called Sam at Acme yesterday, interested', 'Sam at Acme'],
      ['i just called Jane — left a voicemail', 'Jane'],
      ["I've just called Priya at MGB: she's keen", 'Priya at MGB'],
      ['spoke to Jane at MGB about the pilot', 'Jane at MGB'],
      ['I spoke with Sam Rivera', 'Sam Rivera'],
      ['talked to Jane this morning, not right now', 'Jane'],
      ['talked with Priya Patel, CMIO at Acme; she wants a meeting', 'Priya Patel, CMIO at Acme'],
      ['left a voicemail for Jane Doe', 'Jane Doe'],
      ['left Jane a voicemail', 'Jane'],
      ['left Sam Rivera at Acme a message', 'Sam Rivera at Acme'],
      ['emailed jane@mgb.org', 'jane@mgb.org'],
      ['i emailed Sam at Acme', 'Sam at Acme'],
      ['we met with the CMIO at Acme', 'the CMIO at Acme'],
      ['no answer from Jane', 'Jane'],
      ['had a call with Sam at Acme and booked a meeting', 'Sam at Acme'],
      ['had a great chat with Jane', 'Jane'],
      ['tried calling Jane at Acme - no luck', 'Jane at Acme'],
      ['sent Jane an email', 'Jane'],
      ['log a call with Jane at Acme', 'Jane at Acme'],
      ['log: called Jane, no answer', 'Jane'],
      ['log that I emailed Sam at Acme', 'Sam at Acme'],
    ]
    for (const [text, target] of cases) {
      const intent = expectIntent(text, 'logCall')
      // The whole message is the note, and what the outcome is guessed from.
      expect(intent.text, text).toBe(text)
      expect(intent.target, text).toBe(target)
    }
  })

  it('a line break ends the "who", like a comma before "no answer" does', () => {
    // Otherwise "no answer" on the next line is glued onto the organisation.
    expect(expectIntent('called Jane at Acme\nno answer', 'logCall').target).toBe('Jane at Acme')
    expect(expectIntent('spoke to Sam Rivera\n\n  wants a meeting in October', 'logCall').target).toBe('Sam Rivera')
    // …and a name captured inside "left … a voicemail" never spans lines.
    expect(expectIntent('left Jane\na voicemail', 'logCall').target).toBe('Jane')
    expect(kindOf('left the office early\nJane a voicemail?')).not.toBe('logCall')
  })

  it('leaves the target empty rather than guessing who "her" is', () => {
    expect(expectIntent('called her back, no answer', 'logCall').target).toBe('')
    expect(expectIntent('left a voicemail', 'logCall').target).toBe('')
  })

  it('"called in sick" is availability, not a call', () => {
    expect(kindOf('called in sick')).toBe('availability')
    expect(kindOf('I called in sick today')).toBe('availability')
    expect(kindOf('called out sick')).toBe('availability')
    expect(kindOf('called it — the reel did great')).not.toBe('logCall')
  })

  it('a call report beats the availability words in it', () => {
    // Somebody else's time off, reported in a log, must not mark the
    // reporter as away — availability is the one path that writes on a word.
    const intent = expectIntent('called Jane, she is away until October', 'logCall')
    expect(intent.target).toBe('Jane')
    expect(kindOf('left Sam a voicemail, he is on vacation')).toBe('logCall')
  })

  it('does not treat past tense in the middle of a sentence as a log', () => {
    expect(kindOf('what if we emailed everyone who downloaded the kit')).toBe('capture')
    expect(kindOf('has anyone called Acme?')).not.toBe('logCall')
    expect(kindOf('log the runway')).not.toBe('logCall')
    expect(kindOf('logo ideas for the booth')).not.toBe('logCall')
  })

  it('an explicit capture still beats a log', () => {
    expect(expectIntent('note: called Jane, no answer', 'capture').explicit).toBe(true)
  })
})

describe('parseMarquetaIntent — the new questions and their order', () => {
  it('answers "what is mine" before "what is on"', () => {
    for (const text of ['my tasks', "what's mine", 'what am i on this week', "what's on my plate", 'my list', 'mine?', 'my to-dos']) {
      expect(kindOf(text), text).toBe('mine')
    }
    // …while the bare opener is still the week.
    expect(kindOf("what's on")).toBe('week')
    expect(kindOf("what's on?")).toBe('week')
  })

  it('"my call list" is the call list, "my list" is the tasks', () => {
    expect(kindOf('my call list')).toBe('prepList')
    expect(kindOf('my list')).toBe('mine')
  })

  it('keeps "plan" meaning the week', () => {
    expect(kindOf('plan')).toBe('week')
    expect(kindOf("what's the plan for outreach this week?")).toBe('week')
  })

  it('answers money questions with the runway', () => {
    for (const text of ['runway', 'money', 'how are our finances', 'finances?', 'how much cash runway is left', 'runway this week']) {
      expect(kindOf(text), text).toBe('runway')
    }
  })

  it('answers strategy questions', () => {
    for (const text of ['strategy', 'are we on track?', 'is the direction right', 'what are the priorities', 'how are we doing', 'how’re we doing this week']) {
      expect(kindOf(text), text).toBe('strategy')
    }
  })

  it('answers pipeline questions', () => {
    for (const text of ['pipeline', "how's outreach", 'how’s outreach this week?', 'scoreboard', 'any new leads', 'how are we doing on outreach']) {
      expect(kindOf(text), text).toBe('pipeline')
    }
  })

  it('lets a named topic beat the bare word "week"', () => {
    // "how's outreach this week?" wants the numbers, not the task list.
    expect(kindOf('pipeline this week')).toBe('pipeline')
    expect(kindOf('strategy for this week')).toBe('strategy')
    expect(kindOf('week')).toBe('week')
  })

  it('still reaches ideas, heartbeat and help after the new kinds', () => {
    expect(kindOf('ideas')).toBe('ideas')
    expect(kindOf('did the tick run')).toBe('heartbeat')
    expect(kindOf('help')).toBe('help')
    expect(kindOf('what can you do?')).toBe('help')
  })

  it('files a proposal instead of answering it, even when it names a topic', () => {
    expect(kindOf('we should review the pipeline every Monday morning')).toBe('capture')
    expect(kindOf("let's rethink the strategy for payers next quarter")).toBe('capture')
  })
})

describe('parseMarquetaIntent — availability traps', () => {
  it('does not mark anybody away for a question that merely contains the word', () => {
    // Availability WRITES a record on the strength of a keyword; these used to.
    expect(kindOf('are we back on track?')).toBe('strategy')
    expect(kindOf("what's our holiday campaign strategy?")).toBe('strategy')
    expect(kindOf('we should give away posters at Town Day')).not.toBe('availability')
  })

  it('still hears real time off', () => {
    for (const text of ['away next week', 'I’m back', 'out sick today', 'on vacation 2026-10-01 2026-10-05', 'back on Monday', 'ooo friday']) {
      expect(kindOf(text), text).toBe('availability')
    }
  })
})

describe('parseMarquetaIntent — addressed by name, decoded Slack text', () => {
  it('parses what follows her name', () => {
    expect(expectIntent('Marqueta, prep Jane Doe at Acme', 'prep').text).toBe('prep Jane Doe at Acme')
    expect(kindOf('hey Marqueta: my calls')).toBe('prepList')
    expect(kindOf('@Marqueta runway?')).toBe('runway')
  })

  it('reads curly apostrophes the way Slack on a phone sends them', () => {
    expect(kindOf('what’s on?')).toBe('week')
    expect(kindOf('what’s mine')).toBe('mine')
    expect(kindOf('who’s on my call list')).toBe('prepList')
    // What is returned is what was typed.
    expect(expectIntent('let’s do a reel about the Heard project next month', 'capture').text).toContain('let’s')
  })

  it('handles entities and links once decoded', () => {
    const att = fromSlack(`<@${BOT}> prep a call with AT&amp;T`)
    expect(att.kind).toBe('prep')
    if (att.kind === 'prep') expect(att.text).toBe('prep a call with AT&T')

    const email = fromSlack('Marqueta, prep <mailto:jane@mgb.org|jane@mgb.org>')
    expect(email).toEqual({ kind: 'prep', text: 'prep jane@mgb.org', target: 'jane@mgb.org', format: 'call' })

    const logged = fromSlack(`<@${BOT}> spoke with Sam at AT&amp;T, interested`)
    expect(logged).toEqual({ kind: 'logCall', text: 'spoke with Sam at AT&T, interested', target: 'Sam at AT&T' })

    const domain = fromSlack(`<@${BOT}> called someone at <http://mgb.org|mgb.org> - no answer`)
    expect(domain.kind).toBe('logCall')
    if (domain.kind === 'logCall') expect(domain.target).toBe('someone at mgb.org')
  })

  it('never throws on hostile or enormous input', () => {
    for (const text of ['', '   ', '<!here>', '&amp;&lt;&gt;', '<5% of pilots & >3%', 'x'.repeat(5000), 'prep ' + 'Jane '.repeat(1000), 'called ' + ','.repeat(4000)]) {
      expect(() => parseMarquetaIntent(text)).not.toThrow()
      expect(() => stripAddress(text, BOT)).not.toThrow()
      expect(() => addressesMarqueta(text, BOT)).not.toThrow()
    }
  })

  it('reads the longest message Slack allows in linear time', () => {
    // Slack allows 40,000 characters and any member can DM her. Over a raw run
    // of line breaks several patterns backtracked quadratically — "left" and
    // 39k line breaks took 43 s, "called Jane" and 39k took 5 s — and Slack
    // retries an event it had no 200 for, so one message could hold the
    // function for minutes. Measured through the pipeline the events route
    // uses; the best of three runs, so a busy machine cannot fail it but a
    // quadratic pattern (seconds, every run) always will.
    const RUN = 40_000
    const hostile = [
      'left' + '\n'.repeat(RUN) + 'x',
      'sent' + '\n'.repeat(RUN) + 'x',
      'called Jane' + '\n'.repeat(RUN) + 'x',
      'prep great' + '\n'.repeat(RUN) + 'x',
      'left ' + ' \n\t'.repeat(RUN / 3) + 'a voicemail',
      'called Jane' + ' — '.repeat(RUN / 3) + 'x',
      `<@${BOT}> left Jane ` + '\r\n'.repeat(RUN / 2) + 'x',
      'Marqueta, ' + 'called '.repeat(RUN / 7),
    ]
    const fastest = (text: string) => {
      let best = Infinity
      for (let run = 0; run < 3; run += 1) {
        const started = performance.now()
        addressesMarqueta(text, BOT)
        parseMarquetaIntent(stripAddress(decodeSlackText(text), BOT))
        best = Math.min(best, performance.now() - started)
      }
      return best
    }
    for (const text of hostile) {
      expect(fastest(text), JSON.stringify(text.slice(0, 24))).toBeLessThan(50)
    }
  })

  it('returns what was typed: a long idea whole, a call note clipped to what the log form holds', () => {
    // Matching reads only the first 2,000 characters, flattened. What comes
    // back must not be that copy: a newsletter draft sent to her IS the copy.
    const draft = 'we should do a reel about the Heard project before the intern leaves\n' + '- another shot of the studio\n'.repeat(120)
    expect(draft.length).toBeGreaterThan(2000)
    expect(expectIntent(draft, 'capture').text).toBe(draft.trim())

    const note = 'called Jane at Acme, ' + 'she talked about the pilot. '.repeat(200)
    const logged = expectIntent(note, 'logCall')
    expect(logged.target).toBe('Jane at Acme')
    expect(logged.text.length).toBeLessThanOrEqual(2000)
    expect(note.startsWith(logged.text)).toBe(true)

    // Clipped between characters, never through the middle of an emoji.
    const emoji = expectIntent('called Jane at Acme, ' + '🎉'.repeat(2000), 'logCall')
    expect(emoji.text.length).toBeLessThanOrEqual(2000)
    expect(emoji.text).not.toMatch(/[\uD800-\uDBFF]$/)
  })
})

describe('marquetaHelpText — v2', () => {
  it('shows her working mention when it knows her id, and never the literal "@Marqueta"', () => {
    const help = marquetaHelpText(marquetaHandle(BOT))
    expect(help).toContain(`<@${BOT}>`)
    expect(help).not.toMatch(/@marqueta/i)
  })

  it('falls back to the two ways in that always work', () => {
    for (const help of [marquetaHelpText(), marquetaHelpText(marquetaHandle(undefined)), marquetaHelpText('not a mention')]) {
      expect(help).toMatch(/DM me/)
      expect(help).toContain('"Marqueta,"')
      expect(help).not.toMatch(/@marqueta/i)
      expect(help).not.toContain('not a mention')
    }
  })

  it('lists everything she can now do', () => {
    const help = marquetaHelpText(marquetaHandle(BOT))
    for (const command of ['prep', 'my calls', 'called', 'my tasks', 'week', 'runway', 'strategy', 'pipeline', 'ideas', 'tick', 'capture', 'away']) {
      expect(help, command).toContain(command)
    }
    // Still says out loud that she listens.
    expect(help).toMatch(/never post there uninvited/i)
  })

  it('has no stray angle brackets for Slack to swallow, and fits a section block', () => {
    for (const help of [marquetaHelpText(marquetaHandle(BOT)), marquetaHelpText()]) {
      expect(help.replace(/<@[UW][A-Z0-9]+>/g, '')).not.toMatch(/[<>]/)
      expectValidSlackBlocks([{ type: 'section', text: { type: 'mrkdwn', text: help } }])
    }
  })
})

describe('captureConfirmation — escaping', () => {
  it('escapes what somebody typed, now that it arrives decoded', () => {
    const confirmation = captureConfirmation({ kind: 'idea', title: '<!here> AT&T pilots <5%', explicit: true })
    expect(confirmation).toContain('&lt;!here&gt; AT&amp;T pilots &lt;5%')
    expect(confirmation).not.toContain('<!here>')
  })

  it('stays inside a section block however long the title', () => {
    const confirmation = captureConfirmation({ kind: 'draft', title: '&<>'.repeat(2000), explicit: false })
    expectValidSlackBlocks([{ type: 'section', text: { type: 'mrkdwn', text: confirmation } }])
    expect(captureConfirmation({ kind: 'idea', title: '', explicit: true })).toContain('*Untitled*')
  })
})
