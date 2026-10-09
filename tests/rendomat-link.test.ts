/**
 * A Marqueta script, the Rendomat video made from it, and the private copy of
 * the render: the rules, pinned.
 *
 *   - a script keeps its structure (frames) on the calendar item;
 *   - Export to Rendomat is drawn only for a script, only when Rendomat can
 *     make one, as the one green leftmost button of at most three;
 *   - slides come from the RECORD (Calendar edits count), with the flattened
 *     draft only as a fallback;
 *   - Rendomat is the only judge of what fits: its refusal is said in plain
 *     words naming the beat; this side keeps no character budget;
 *   - a render is attached only to the item it was made for, and the private
 *     copy writes privateVideo + clientSignOff and NOTHING else;
 *   - the publish_at ingest never takes a linked video;
 *   - a public copy needs the client's approval, recorded by a named person.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- fake clients and Block Kit fixtures are loosely shaped on purpose */
import { describe, expect, it } from 'vitest'

import { generatedToCalendarDraft, outputContractForFormat, parseGeneration } from '@/lib/marketing/marquetaGenerate'
import { MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { LABEL } from '@/lib/marketing/marquetaStyle'
import {
  buildCreateVideoBody,
  framesFromFlattenedScript,
  makeInRendomatRefusal,
  NEVER_WRITTEN_BY_A_RENDER,
  PRIVATE_COPY_FIELDS,
  privateCopyDecision,
  privateCopyPatch,
  privateVideoPathname,
  publicCopyRefusal,
  publishAtPassDecision,
  rendomatProjectUrlFor,
  rendomatRefusalLine,
  signOffPatch,
  slidesFromItem,
  type LinkableItem,
} from '@/lib/marketing/rendomatLink'
import { buildGenerationResultBlocks, withRendomatMade } from '@/lib/marketing/slackDelegation'
import { expectValidSlackBlocks } from './support/slackBlocks'

type Block = Record<string, any>

const SCRIPT_REPLY = JSON.stringify({
  title: 'The five minutes that lose a patient',
  hook: 'Most patients quit at the setup screen.',
  hookOnScreen: 'They quit at setup',
  beats: [
    { label: 'Where they stop', body: 'A code sent to an old phone.', onScreen: 'Old phone, lost code' },
    { label: 'What kept them going', body: 'One screen per step.', onScreen: 'One step per screen' },
  ],
  close: 'Test the setup with five real patients first.',
  closeOnScreen: 'Test setup with five patients',
})

const ITEM_ID = 'marketingCalendarItem.slack-C0MKT-1726000000-000400'

function item(overrides: Partial<LinkableItem> = {}): LinkableItem {
  return {
    _id: ITEM_ID,
    _rev: 'r1',
    title: 'The five minutes that lose a patient',
    status: 'drafting',
    contentType: 'video',
    draftFrames: [
      { title: 'Hook', body: 'Most patients quit at the setup screen.', visualDirection: 'They quit at setup' },
      { title: 'Where they stop', body: 'A code sent to an old phone.', visualDirection: 'Old phone, lost code' },
      { title: 'Close', body: 'Test the setup first.', visualDirection: 'Test setup first' },
    ],
    ...overrides,
  }
}

const buttons = (blocks: Block[]) => blocks.flatMap((block) => (block.type === 'actions' ? block.elements : []))

function scriptCard(configured: boolean, format: 'script' | 'post' = 'script') {
  return buildGenerationResultBlocks({
    formatLabel: format,
    title: 'Title',
    bodyChunks: ['Body'],
    channel: 'C0MKT',
    ts: '1726000000.000400',
    studioUrl: 'https://studio.example.org/studio/marketing?view=calendar',
    format,
    rendomat: { configured },
  })
}

describe('a drafted script keeps its structure', () => {
  it('asks the model for a short on-screen line per hook, beat and close, keeping the spoken body', () => {
    const contract = outputContractForFormat('script') as Record<string, any>
    expect(contract.hookOnScreen).toBeTruthy()
    expect(contract.closeOnScreen).toBeTruthy()
    expect(contract.beats[0]).toMatchObject({ body: expect.stringMatching(/spoken/), onScreen: expect.any(String) })
  })

  it('parses frames alongside the flattened body Slack shows', () => {
    const generated = parseGeneration('script', SCRIPT_REPLY)!
    expect(generated.body).toContain('*Hook:* Most patients quit at the setup screen.')
    expect(generated.frames).toEqual([
      { role: 'hook', label: 'Hook', spoken: 'Most patients quit at the setup screen.', onScreen: 'They quit at setup' },
      { role: 'beat', label: 'Where they stop', spoken: 'A code sent to an old phone.', onScreen: 'Old phone, lost code' },
      { role: 'beat', label: 'What kept them going', spoken: 'One screen per step.', onScreen: 'One step per screen' },
      { role: 'close', label: 'Close', spoken: 'Test the setup with five real patients first.', onScreen: 'Test setup with five patients' },
    ])
    // Other formats carry no frames.
    expect(parseGeneration('outline', JSON.stringify({ title: 't', sections: [{ heading: 'h', points: ['p'] }] }))?.frames).toBeUndefined()
  })

  it('files the frames as draftFrames, and records the Slack thread, on the calendar draft', () => {
    const generated = parseGeneration('script', SCRIPT_REPLY)!
    const draft = generatedToCalendarDraft({ generated, channel: 'C0MKT', ts: '1726000000.000400', threadTs: '1726000000.000100', personName: 'Jules', topic: 'portals' })
    expect(draft.contentDraft).toBe(generated.body)
    expect(draft.autoPublish).toBe(false)
    expect(draft.draftFrames?.map((frame) => [frame.title, frame.body, frame.visualDirection])).toEqual([
      ['Hook', 'Most patients quit at the setup screen.', 'They quit at setup'],
      ['Where they stop', 'A code sent to an old phone.', 'Old phone, lost code'],
      ['What kept them going', 'One screen per step.', 'One step per screen'],
      ['Close', 'Test the setup with five real patients first.', 'Test setup with five patients'],
    ])
    expect(draft).toMatchObject({ slackChannel: 'C0MKT', slackThreadTs: '1726000000.000100' })
  })
})

describe('Export to Rendomat on the card', () => {
  it('is drawn only for a script, and only when Rendomat can make one', () => {
    const ids = (blocks: Block[]) => buttons(blocks).map((element: Block) => element.action_id || element.url)
    expect(ids(scriptCard(true))).toContain(MARQUETA_ACTION.makeInRendomat)
    expect(ids(scriptCard(false))).not.toContain(MARQUETA_ACTION.makeInRendomat)
    expect(ids(scriptCard(true, 'post'))).not.toContain(MARQUETA_ACTION.makeInRendomat)
  })

  it('is the one green button, leftmost, of at most three in one row, carrying the discard’s value', () => {
    const card = scriptCard(true)
    expectValidSlackBlocks(card as never)
    const rows = card.filter((block) => block.type === 'actions')
    expect(rows).toHaveLength(1)
    const row = rows[0].elements as Block[]
    expect(row.length).toBeLessThanOrEqual(3)
    expect(row[0]).toMatchObject({ action_id: MARQUETA_ACTION.makeInRendomat, style: 'primary', text: { text: LABEL.MAKE_IN_RENDOMAT } })
    expect(row.filter((element) => element.style === 'primary')).toHaveLength(1)
    expect(row[1].value).toBe(row[0].value)
    expect(JSON.parse(row[0].value)).toEqual({ c: 'C0MKT', ts: '1726000000.000400' })
  })

  it('redraws the pressed row as a note over Open in Rendomat, with no reversing button', () => {
    const card = scriptCard(true)
    const made = withRendomatMade(card, { note: '_Exported to Rendomat by <@U1>_', projectUrl: 'https://rendomat.example.org/videos/7' })
    expectValidSlackBlocks(made as never)
    const row = buttons(made)
    expect(row.map((element: Block) => element.text.text)).toEqual([LABEL.OPEN_IN_RENDOMAT, LABEL.DRAFT_DISCARD, 'Open Calendar'])
    expect(row[0].url).toBe('https://rendomat.example.org/videos/7')
    expect(row.some((element: Block) => element.action_id === MARQUETA_ACTION.makeInRendomat)).toBe(false)
    expect(JSON.stringify(made)).toContain('Exported to Rendomat by <@U1>')
    // A card with no Make row (an older card) is returned unchanged, so the caller can tell.
    const older = scriptCard(false)
    expect(withRendomatMade(older, { note: 'n', projectUrl: 'https://rendomat.example.org/videos/7' })).toBe(older)
  })
})

describe('the slides come from the record', () => {
  it('maps the first frame to the cover, the last to the call to action, the rest to points', () => {
    expect(slidesFromItem(item())).toEqual([
      { role: 'cover', title: 'They quit at setup', narration: 'Most patients quit at the setup screen.' },
      { role: 'point', title: 'Old phone, lost code', kicker: 'Where they stop', narration: 'A code sent to an old phone.' },
      { role: 'cta', title: 'Test setup first', narration: 'Test the setup first.' },
    ])
  })

  it('never draws the same words twice: with no on-screen line, the beat label is the title and not also the kicker', () => {
    const bare = item({
      draftFrames: [
        { title: 'Hook', body: 'Most patients quit at the setup screen.', visualDirection: 'They quit at setup' },
        { title: 'Wrong metric', body: 'Downloads are not use.' },
        { title: 'Close', body: 'Test the setup first.', visualDirection: 'Test setup first' },
      ],
    })
    expect(slidesFromItem(bare)[1]).toEqual({ role: 'point', title: 'Wrong metric', narration: 'Downloads are not use.' })
  })

  it('uses Calendar edits: what is stored now, not what the card showed', () => {
    const edited = item({ draftFrames: [{ title: 'Hook', body: 'Edited hook.', visualDirection: 'Edited line' }, { title: 'Close', body: 'Bye.', visualDirection: 'Bye' }] })
    expect(slidesFromItem(edited).map((slide) => slide.title)).toEqual(['Edited line', 'Bye'])
  })

  it('falls back to the flattened draft only when there are no frames', () => {
    const flattened = '*Hook:* Quit at setup.\n\n*Where they stop*\nOld phone.\n\n*Close:* Test it.'
    expect(framesFromFlattenedScript(flattened)).toEqual([
      { title: 'Hook', body: 'Quit at setup.' },
      { title: 'Where they stop', body: 'Old phone.' },
      { title: 'Close', body: 'Test it.' },
    ])
    expect(slidesFromItem({ draftFrames: [], contentDraft: flattened }).map((slide) => slide.role)).toEqual(['cover', 'point', 'cta'])
  })

  it('builds the script-mode body Rendomat expects, bound to the item by external_ref', () => {
    expect(buildCreateVideoBody(item(), 12)).toMatchObject({
      mode: 'script',
      client_id: 12,
      aspect_ratio: '9:16',
      brand_kit_id: 'goinvo-health',
      external_ref: ITEM_ID,
      title: 'The five minutes that lose a patient',
    })
  })

  it('refuses a missing, binned or non-video item before anything is sent', () => {
    expect(makeInRendomatRefusal(null)).toMatch(/isn’t on the Calendar/)
    expect(makeInRendomatRefusal(item({ status: 'canceled' }))).toMatch(/binned/)
    expect(makeInRendomatRefusal(item({ contentType: 'article' }))).toMatch(/video script/)
    expect(makeInRendomatRefusal(item())).toBeNull()
  })

  it('says Rendomat’s refusal in plain words, naming the beat that is too long', () => {
    const slides = slidesFromItem(item())
    const line = rendomatRefusalLine([{ slide: 1, field: 'title', reason: 'The on-screen line is 96 characters; this slide fits 60.' }], slides)
    expect(line).toBe('The “Where they stop” beat is too long for a slide. The on-screen line is 96 characters; this slide fits 60. Shorten it on the Calendar and press again — nothing was made.')
    expect(rendomatRefusalLine([{ slide: 0, reason: 'Too long.' }], slides)).toMatch(/^The hook is too long/)
    // Rendomat's reasons may start lower-case; the sentence after the full stop starts with a capital.
    expect(rendomatRefusalLine([{ slide: 1, field: 'title', reason: 'the on-screen line is 139 characters; this slide fits 80.' }], slides)).toContain('too long for a slide. The on-screen line is 139 characters')
    expect(rendomatRefusalLine([{ slide: null, reason: 'Unknown client.' }], slides)).toMatch(/still on the Calendar/)
  })

  it('opens the project at Rendomat’s editor_url, else <base>/videos/<id>', () => {
    expect(rendomatProjectUrlFor({ id: 7, editor_url: 'https://rendomat.example.org/videos/7' }, 'https://other.example.org')).toBe('https://rendomat.example.org/videos/7')
    expect(rendomatProjectUrlFor({ id: 7, editor_url: null }, 'https://rendomat.example.org/')).toBe('https://rendomat.example.org/videos/7')
    expect(rendomatProjectUrlFor({ id: 7 }, '')).toBe('')
  })
})

describe('the private copy of a finished render', () => {
  const linked = item({ rendomatVideoId: '7', rendomatProjectUrl: 'https://rendomat.example.org/videos/7' })
  const done = { id: 7, status: 'completed', download_url: 'https://rendomat.example.org/api/files/x.mp4', external_ref: ITEM_ID }

  it('attaches only a completed render, with a file, made for THIS item', () => {
    expect(privateCopyDecision(linked, done)).toEqual({ attach: true })
    expect(privateCopyDecision(linked, { ...done, status: 'rendering' })).toMatchObject({ attach: false, reason: expect.stringMatching(/Not rendered/) })
    expect(privateCopyDecision(linked, { ...done, download_url: null })).toMatchObject({ attach: false })
    expect(privateCopyDecision(linked, { ...done, external_ref: 'marketingCalendarItem.someone-else' })).toMatchObject({ attach: false, reason: expect.stringMatching(/different calendar item/) })
    expect(privateCopyDecision(linked, { ...done, id: 8 })).toMatchObject({ attach: false })
    expect(privateCopyDecision({ ...linked, status: 'canceled' }, done)).toMatchObject({ attach: false })
    expect(privateCopyDecision({ ...linked, privateVideo: { pathname: 'p', contentType: 'video/mp4', size: 1, uploadedAt: 'x', rendomatVideoId: '7' } }, done)).toMatchObject({ attach: false })
  })

  it('writes privateVideo and clientSignOff and nothing else — never status, autoPublish, publishAt, title, contentDraft or socialVideo', () => {
    const patch = privateCopyPatch({ pathname: privateVideoPathname(ITEM_ID, 7), contentType: 'video/mp4', size: 3, uploadedAt: '2026-10-06T00:00:00Z', rendomatVideoId: '7' })
    expect(Object.keys(patch).sort()).toEqual([...PRIVATE_COPY_FIELDS].sort())
    for (const field of NEVER_WRITTEN_BY_A_RENDER) expect(Object.keys(patch), field).not.toContain(field)
    expect(patch.clientSignOff).toEqual({ status: 'pending' })
    expect(patch.privateVideo.pathname).toBe('marketing/rendomat/marketingCalendarItem.slack-C0MKT-1726000000-000400/7.mp4')
  })

  it('keeps the publish_at ingest away from any video made for a Marqueta draft', () => {
    expect(publishAtPassDecision({ external_ref: ITEM_ID }, null)).toMatchObject({ proceed: false })
    expect(publishAtPassDecision({ external_ref: null }, { rendomatProjectUrl: 'https://rendomat.example.org/videos/7' })).toMatchObject({ proceed: false })
    expect(publishAtPassDecision({ external_ref: null }, null, { autopost: true })).toEqual({ proceed: true })
    // Off by default: nothing auto-posts unless RENDOMAT_AUTOPOST_INGEST is "on".
    expect(publishAtPassDecision({ external_ref: null }, null, { autopost: false })).toMatchObject({ proceed: false, reason: expect.stringMatching(/off/) })
  })
})

describe('sign-off, and the copy to public media', () => {
  const withVideo = item({ privateVideo: { pathname: 'marketing/rendomat/x/7.mp4', contentType: 'video/mp4', size: 3, uploadedAt: 'x', rendomatVideoId: '7' } })
  const now = new Date('2026-10-06T15:00:00Z')

  it('records who answered for the client, and when', () => {
    expect(signOffPatch({ item: withVideo, status: 'approved', by: 'Jules', byUserId: 'p123', note: 'OK by email', now })).toEqual({
      ok: true,
      clientSignOff: { status: 'approved', by: 'Jules', byUserId: 'p123', at: '2026-10-06T15:00:00.000Z', note: 'OK by email' },
    })
    expect(signOffPatch({ item: withVideo, status: 'approved', by: '  ', now })).toMatchObject({ ok: false })
    expect(signOffPatch({ item: withVideo, status: 'shipped', by: 'Jules', now })).toMatchObject({ ok: false })
    expect(signOffPatch({ item: item(), status: 'approved', by: 'Jules', now })).toMatchObject({ ok: false })
    expect(signOffPatch({ item: withVideo, status: 'pending', by: '', now })).toEqual({ ok: true, clientSignOff: { status: 'pending' } })
  })

  it('allows a public copy only after the client approved, and only once', () => {
    expect(publicCopyRefusal(withVideo)).toMatch(/not signed off/)
    expect(publicCopyRefusal({ ...withVideo, clientSignOff: { status: 'changesRequested' } })).toMatch(/not signed off/)
    expect(publicCopyRefusal({ ...withVideo, clientSignOff: { status: 'approved', by: 'Jules' } })).toBeNull()
    expect(publicCopyRefusal({ ...withVideo, clientSignOff: { status: 'approved', by: 'Jules' }, hasSocialVideo: true })).toMatch(/already/)
    // An approval without a name was not recorded by the sign-off route.
    expect(publicCopyRefusal({ ...withVideo, clientSignOff: { status: 'approved' } })).toMatch(/who approved/)
    expect(publicCopyRefusal(item({ clientSignOff: { status: 'approved' } }))).toMatch(/no private video/)
  })
})
