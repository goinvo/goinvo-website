import { describe, expect, it } from 'vitest'

import {
  addressesMarqueta,
  captureConfirmation,
  damerauLevenshtein,
  isAcknowledgement,
  marquetaHelpText,
  parseMarquetaIntent,
  removeMention,
  stripAddress,
  stripMention,
  suggestCommand,
  unknownReplyText,
  type MarquetaIntent,
} from '@/lib/marketing/marquetaChat'
import { parsePrepRequest, resolvePrepTarget, type PrepContact, type PrepTargetMatch } from '@/lib/marketing/callPrep'
import { decodeSlackText } from '@/lib/marketing/slackText'

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

  it('greets a greeting, and gives help only when asked for it', () => {
    for (const text of ['hi', 'hello', 'hey', 'hey there', 'morning', 'good morning', 'are you there?', 'Marqueta?', '']) {
      expect(parseMarquetaIntent(text).kind, text).toBe('greeting')
    }
    for (const text of ['help', 'help?', 'what can you do', 'commands']) {
      expect(parseMarquetaIntent(text).kind, text).toBe('help')
    }
    expect(parseMarquetaIntent('help more')).toEqual({ kind: 'help', more: true })
    // "help" at the start of a request is still the request.
    expect(parseMarquetaIntent('help me call Jane at Acme').kind).toBe('prep')
  })
})

describe('acknowledgements', () => {
  it('says nothing to a thank-you, an ok or an emoji', () => {
    // Every "thanks!" used to get 1,285 characters of help back.
    for (const text of ['thanks!', 'thank you', 'ty', 'cheers', 'ok', 'okay', 'cool', 'great', 'got it', 'perfect', 'nice', 'great, thanks!', 'ok thanks', 'thanks Marqueta', 'Marqueta, cheers', ':+1:', '👍', '🙏 thanks', 'nice one', 'will do', 'sounds good']) {
      expect(parseMarquetaIntent(text), text).toEqual({ kind: 'ack' })
      expect(isAcknowledgement(text), text).toBe(true)
    }
  })

  it('still hears a request that starts with one', () => {
    expect(parseMarquetaIntent('ok, prep Jane Doe at Acme').kind).toBe('prep')
    expect(parseMarquetaIntent('thanks — how’s the runway looking?').kind).toBe('runway')
    expect(parseMarquetaIntent('great, we should do a reel about the Heard project').kind).toBe('capture')
    for (const text of ['ok prep Jane', 'thanks for the list, but who is Jane Doe', 'good morning', 'the booth went great yesterday']) {
      expect(isAcknowledgement(text), text).toBe(false)
    }
  })

  it('says nothing to a thank-you with a hello in front of it', () => {
    // "hey" was neither a thank-you word nor filler, so these fell through to
    // the typo check — which read "thanks" as a slip of "tasks" and asked
    // "Did you mean `Marqueta, my tasks`?" in front of the room.
    for (const text of [
      'hey Marqueta, thanks!',
      `Hey <@${BOT}> thanks`,
      'hi Marqueta, thank you',
      'yo Marqueta, cheers',
      'Thanks Marqueta, that helps',
      `hey <@${BOT}> :+1:`,
      'thanks for the help',
      'hello, thanks so much',
    ]) {
      expect(parseMarquetaIntent(decodeSlackText(removeMention(text, BOT))), text).toEqual({ kind: 'ack' })
    }
    // A hello is still a hello — with a wave, too — and "ok help" still asks.
    expect(parseMarquetaIntent('hey').kind).toBe('greeting')
    expect(parseMarquetaIntent('hi :wave:').kind).toBe('greeting')
    expect(parseMarquetaIntent('hi 👋').kind).toBe('greeting')
    expect(parseMarquetaIntent('ok help').kind).toBe('help')
    // …and a thank-you is never offered back as a typo of a command.
    for (const text of ['thanks', 'thanks!', 'cheers', 'hello']) expect(suggestCommand(text), text).toBeUndefined()
  })

  it('reads the text as the server hands it over: her mention off, the rest decoded', () => {
    expect(parseMarquetaIntent(decodeSlackText(removeMention(`<@${BOT}> thanks!`, BOT)))).toEqual({ kind: 'ack' })
    expect(parseMarquetaIntent(decodeSlackText(removeMention(`<@${BOT}> ok`, BOT)))).toEqual({ kind: 'ack' })
    expect(parseMarquetaIntent(decodeSlackText(removeMention(`hey <@${BOT}>`, BOT)))).toEqual({ kind: 'greeting' })
  })
})

describe('captureConfirmation', () => {
  it('says plainly when the filing was her guess', () => {
    const guessed = captureConfirmation({ kind: 'idea', title: 'A thing', explicit: false })
    expect(guessed).toMatch(/my guess/i)
    expect(guessed).toMatch(/nothing happens until someone keeps it/)
  })

  it('does not hedge when it was asked for', () => {
    const asked = captureConfirmation({ kind: 'idea', title: 'A thing', explicit: true })
    expect(asked).toMatch(/as you asked/i)
    expect(asked).not.toMatch(/my guess/i)
  })

  it('says where a draft went, since it is not the list of ideas', () => {
    const draft = captureConfirmation({ kind: 'draft', title: 'Newsletter', explicit: true })
    expect(draft).toContain('calendar')
    expect(draft).toContain('*Unscheduled*')
  })
})

describe('marquetaHelpText', () => {
  it('says that she listens quietly, one page in, so nobody is surprised by it', () => {
    // A bot reading a channel without saying so is the kind of thing people
    // are right to object to after the fact. The short help points at it.
    const more = marquetaHelpText({ more: true })
    expect(more).toMatch(/listen/i)
    expect(more).toMatch(/never post there uninvited/i)
    expect(marquetaHelpText()).toMatch(/what I listen for/)
  })

  it('names the things she can actually do', () => {
    const help = marquetaHelpText()
    for (const command of ['week', 'runway', 'my calls', 'my tasks', 'prep', 'called', 'strategy', 'pipeline', 'away next week']) {
      expect(help).toContain(command)
    }
    const more = marquetaHelpText({ more: true })
    for (const command of ['ideas', 'capture', 'who’s Jane Doe', 'we signed']) {
      expect(more).toContain(command)
    }
  })

  it('is at most six lines and 600 characters — one phone screen', () => {
    for (const help of [marquetaHelpText(), marquetaHelpText({ dms: true }), marquetaHelpText({ more: true }), marquetaHelpText({ guest: true })]) {
      expect(help.split('\n').length).toBeLessThanOrEqual(6)
      expect(help.length).toBeLessThanOrEqual(600)
    }
  })

  it('never advertises DMs unless they are wired up, and never "tick"', () => {
    expect(marquetaHelpText()).not.toMatch(/DM/)
    expect(marquetaHelpText({ dms: true })).toMatch(/DM me/)
    expect(marquetaHelpText()).not.toMatch(/\btick\b/)
  })

  it('tells a guest what she is without telling them what she holds', () => {
    const guest = marquetaHelpText({ guest: true })
    expect(guest).toMatch(/for the GoInvo team/)
    expect(guest).toContain('`Marqueta, capture')
    expect(guest).not.toMatch(/runway|prep|my calls/)
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

  it('hears "off", "out" and "sick" as time off only in the sender’s own sentence, with a day straight after', () => {
    // These used to be "I’m not sure what to do with that".
    for (const text of ['I’m off Friday', 'I’m sick today', 'I’ll be out until Mon', 'I’m off on Fri 2 Oct', 'fyi I’m out tomorrow', 'I am off next week']) {
      expect(kindOf(text), text).toBe('availability')
    }
    // Ordinary uses of the same words never reach the path that writes.
    for (const text of ['I’m off to call Jane tomorrow', 'I’m out of ideas', 'I’m out with 2 kids', 'Eric is off Friday', 'we should be out at Town Day with a table']) {
      expect(kindOf(text), text).not.toBe('availability')
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
  it('shows the phrase people can copy, never the literal "@Marqueta"', () => {
    for (const help of [marquetaHelpText(), marquetaHelpText({ more: true }), marquetaHelpText({ guest: true })]) {
      expect(help).toContain('`Marqueta, ')
      expect(help).not.toMatch(/@marqueta/i)
    }
  })

  it('has no stray angle brackets for Slack to swallow, and fits a section block', () => {
    for (const help of [marquetaHelpText(), marquetaHelpText({ more: true }), marquetaHelpText({ guest: true })]) {
      expect(help).not.toMatch(/[<>]/)
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

// ── The UX pass: typos, the bare name, new intents, synonyms ─────────────────

describe('typos — suggested, never run', () => {
  const TYPOS: Array<[string, string]> = [
    ['runwya', 'runway'],
    ['rnway', 'runway'],
    ['stratgy', 'strategy'],
    ['strategey', 'strategy'],
    ['pipline', 'pipeline'],
    ['piepline', 'pipeline'],
    ['weeek', 'week'],
    ['ideass', 'ideas'],
    ['hlep', 'help'],
    ['clals', 'my calls'],
  ]

  it('offers the command a typo looks like — and does not answer it', () => {
    for (const [typed, command] of TYPOS) {
      const intent = parseMarquetaIntent(typed)
      // Never the command itself: a wrong guess answers a different question in a shared channel.
      expect(intent, typed).toEqual({ kind: 'unknown', question: false, suggestion: command })
      expect(unknownReplyText(intent as Extract<MarquetaIntent, { kind: 'unknown' }>)).toBe(`Did you mean \`Marqueta, ${command}\`?`)
    }
  })

  it('does not take real words, short words or long messages for typos', () => {
    for (const text of ['we', 'week', 'ok', 'the booth went great yesterday', 'rnway is the thing we should look at next month']) {
      expect(suggestCommand(text), text).toBeUndefined()
    }
  })

  it('counts a transposition as one slip', () => {
    expect(damerauLevenshtein('runwya', 'runway')).toBe(1)
    expect(damerauLevenshtein('hlep', 'help')).toBe(1)
    expect(damerauLevenshtein('week', 'week')).toBe(0)
  })
})

describe('what she cannot answer', () => {
  it('points at the nearest thing she does, in one line', () => {
    const intent = parseMarquetaIntent('what is our Q4 revenue target?')
    expect(intent).toEqual({ kind: 'unknown', question: true, closest: 'pipeline' })
    expect(unknownReplyText(intent as Extract<MarquetaIntent, { kind: 'unknown' }>)).toBe(
      'I don’t have that — I keep calls, tasks and the runway. Closest: `Marqueta, pipeline`.',
    )
  })

  it('falls back to the help hint, never the whole help page', () => {
    const intent = parseMarquetaIntent('the booth went great yesterday') as Extract<MarquetaIntent, { kind: 'unknown' }>
    expect(intent.kind).toBe('unknown')
    const reply = unknownReplyText(intent)
    expect(reply.split('\n')).toHaveLength(1)
    expect(reply).toContain('`Marqueta, help`')
  })
})

describe('addressesMarqueta — the bare name before one of her commands', () => {
  it('hears "Marqueta prep Jane" without the comma', () => {
    for (const text of [
      'Marqueta prep Jane Doe at Acme',
      'Marqueta my calls',
      'marqueta runway?',
      'Marqueta what’s on',
      'Marqueta whats on this week',
      'Marqueta away next week',
      'Marqueta called Jane, left a voicemail',
      'hey Marqueta help',
      'Marqueta capture a booth at Town Day',
    ]) {
      expect(addressesMarqueta(text, BOT), text).toBe(true)
    }
  })

  it('still ignores people talking about her', () => {
    for (const text of [
      'Marqueta caught two ideas',
      'Marqueta posted the digest',
      'Marqueta weekly report is late',
      'Marqueta mypage is broken',
      'Marqueta’s runway numbers look off',
      'I asked Marqueta runway questions',
    ]) {
      expect(addressesMarqueta(text, BOT), text).toBe(false)
    }
  })

  it('parses what follows the bare name', () => {
    expect(parseMarquetaIntent('Marqueta prep Jane Doe at Acme')).toMatchObject({ kind: 'prep', target: 'Jane Doe at Acme' })
    expect(parseMarquetaIntent('Marqueta my calls').kind).toBe('prepList')
  })
})

describe('the new intents', () => {
  it('"who’s Jane Doe" looks one contact up', () => {
    for (const [text, target] of [
      ['who’s Jane Doe', 'Jane Doe'],
      ['who is Jane Doe at MGB?', 'Jane Doe at MGB'],
      ['status of Priya Patel', 'Priya Patel'],
      ['what’s the status of Jane', 'Jane'],
      ['when did we last talk to Sam Rivera?', 'Sam Rivera'],
      ['last talked to Jane', 'Jane'],
    ] as const) {
      expect(parseMarquetaIntent(text), text).toEqual({ kind: 'contact', target })
    }
  })

  it('does not look up a phrase that is not a name', () => {
    expect(parseMarquetaIntent('who’s free this week?').kind).toBe('week')
    expect(parseMarquetaIntent('status of the pipeline').kind).toBe('pipeline')
    expect(parseMarquetaIntent('who is doing the newsletter?').kind).not.toBe('contact')
    // These were answered "Nobody by that name is on file" in front of the room.
    for (const text of ['who’s got the newsletter', 'who’s behind on tasks', 'who has the booth permit?', 'who’s handling Town Day?']) {
      expect(parseMarquetaIntent(text).kind, text).not.toBe('contact')
    }
  })

  it('looks up a name typed in lower case, but keeps what else the message could mean', () => {
    // Typed like a name: a contact, nothing else.
    expect(parseMarquetaIntent('status of Town Day merch')).toEqual({ kind: 'contact', target: 'Town Day merch' })
    expect(parseMarquetaIntent('who’s Sterling Archer')).toEqual({ kind: 'contact', target: 'Sterling Archer' })
    // Not typed like one: looked up, and answered as the rest of the ladder
    // would have answered it when nobody on file matches.
    expect(parseMarquetaIntent('who’s jane doe')).toEqual({ kind: 'contact', target: 'jane doe', otherwise: { kind: 'unknown', question: true } })
    expect(parseMarquetaIntent('status of town day merch plan')).toEqual({
      kind: 'contact',
      target: 'town day merch plan',
      otherwise: { kind: 'week' },
    })
  })

  it('"we signed Acme for 3 months" is signed work — heard, never written from the sentence', () => {
    expect(parseMarquetaIntent('we signed Acme for 3 months')).toEqual({ kind: 'signed', text: 'we signed Acme for 3 months', label: 'Acme', months: 3 })
    // This used to be answered with the help page.
    expect(parseMarquetaIntent('tell me we signed something')).toMatchObject({ kind: 'signed', label: '' })
    expect(parseMarquetaIntent('we’ve just signed the Beacon pilot')).toMatchObject({ kind: 'signed', label: 'the Beacon pilot' })
    expect(parseMarquetaIntent('we signed a contract with Beacon')).toMatchObject({ kind: 'signed', label: 'Beacon' })
    // A question about it is not a report of it.
    expect(parseMarquetaIntent('have we signed Acme yet?').kind).not.toBe('signed')
  })

  it('does not take every "signed" for signed work — the proposal behind it is filed', () => {
    // "Signed up for" was a proposal, and came back as "Signed work — record it".
    expect(parseMarquetaIntent('we signed up for a table at Arlington Town Day, we should do stickers and a tote')).toMatchObject({
      kind: 'capture',
      explicit: false,
    })
    for (const text of ['I signed off on the newsletter draft', 'we signed the NDA with Acme', 'I signed the form for the booth', 'we signed in to LinkedIn', 'we signed acme']) {
      expect(parseMarquetaIntent(text).kind, text).not.toBe('signed')
    }
  })

  it('knows the week by the names people give it', () => {
    for (const text of ['digest', 'check-in', 'agenda', 'status', 'show me the board', "what's on the board?"]) {
      expect(parseMarquetaIntent(text).kind, text).toBe('week')
    }
  })

  it('knows the call list by the names people give it', () => {
    for (const text of ['follow ups', 'follow-ups', 'my follow-ups', 'what are my follow-ups', 'who do I owe a call', 'who do we owe a reply?']) {
      expect(parseMarquetaIntent(text).kind, text).toBe('prepList')
    }
    // …but "follow up with Jane" is not a request for the list.
    expect(parseMarquetaIntent('follow up with Jane at Acme').kind).not.toBe('prepList')
  })

  it('answers a question about one of her topics before reading a time-off word in it', () => {
    // These used to be read as the asker saying they were away.
    expect(parseMarquetaIntent('what does the pipeline look like with Eric away?').kind).toBe('pipeline')
    expect(parseMarquetaIntent('who’s away this week?').kind).toBe('week')
    expect(parseMarquetaIntent('how’s the runway with Juhan on holiday?').kind).toBe('runway')
    // A statement is still a statement, and a question with no topic still goes to availability (which asks back).
    expect(parseMarquetaIntent('I’m away next week').kind).toBe('availability')
    expect(parseMarquetaIntent('away next week').kind).toBe('availability')
    expect(parseMarquetaIntent('is anyone on holiday?').kind).toBe('availability')
  })
})

/**
 * Replay the real channel through the old and the new addressing rules — the
 * only way to learn whether the bare-name rule answers people who were not
 * talking to her. Prints only, and only with SLACK_BOT_TOKEN (and
 * SLACK_REPLAY_CHANNEL_ID, default #marketing): nothing here runs in CI.
 */
describe.skipIf(!process.env.SLACK_BOT_TOKEN)('replay check — #marketing history (prints only)', () => {
  /** The rule before the bare-name form: name + comma/colon, or a typed "@Marqueta". */
  const OLD_NAME_ADDRESS = /^\s*(?:(?:hey|hi|hello|hiya|ok|okay|yo)[\s,!]+)?(?:@marqueta\b(?![’'])|marqueta\s*(?:[,:!?]|$))/i

  it('prints every message the new rule addresses that the old one did not', async () => {
    const channel = process.env.SLACK_REPLAY_CHANNEL_ID || 'CE4AA4BHP'
    let body: { ok?: boolean; error?: string; messages?: { text?: string }[] }
    try {
      const response = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=1000`, {
        headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
      })
      body = JSON.parse(await response.text())
    } catch (error) {
      // Prints only: no network (or no access) is reported, never a failure.
      console.log(`[replay] could not read the channel: ${String(error).slice(0, 160)}`)
      return
    }
    const messages = (body.messages || []).map((message) => String(message.text || ''))
    const newlyAddressed = messages.filter((text) => addressesMarqueta(text, undefined) && !OLD_NAME_ADDRESS.test(text))
    console.log(`[replay] ${body.ok ? messages.length : `failed: ${body.error}`} messages; newly addressed: ${newlyAddressed.length}`)
    for (const text of newlyAddressed) console.log(`[replay]   ${text.slice(0, 160)}`)
  })
})
