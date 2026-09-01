import { describe, expect, it } from 'vitest'

import {
  addressesMarqueta,
  captureConfirmation,
  marquetaHelpText,
  parseMarquetaIntent,
  stripMention,
} from '@/lib/marketing/marquetaChat'

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
