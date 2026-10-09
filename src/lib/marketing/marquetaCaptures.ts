/**
 * Marqueta in action, as data: short Slack scenes built from her REAL message
 * builders, for intro and help videos (Rendomat draws them as a Slack-like
 * window; see scripts/export-marqueta-captures.ts).
 *
 * Every message here is produced by the same function the live routes call,
 * and every press is redrawn by the same function the interactions route uses,
 * so a capture shows what she actually posts. tests/marqueta-captures.test.ts
 * holds the rules: each typed command parses to the intent the scene shows,
 * each pressed label exists on the message it presses, every message is valid
 * Block Kit, and only the fictional people below appear.
 *
 * Fixtures are fictional on purpose: this repo is public and the videos may be
 * shared beyond the studio. Nothing here is read from Sanity or Slack.
 */
import { approveIntent, buildIntentBlocks, normalizeIntent, type StrategyIntent } from './strategyIntent'
import { buildCallLogReceiptBlocks, buildCallLogView, CALL_OUTCOMES, FOLLOW_UP_CHOICES } from './callLog'
import {
  buildCallOutlineMessages,
  composeCallOutline,
  parsePrepRequest,
  resolvePrepTarget,
  type PrepContact,
  type PrepEvidence,
  type PrepOffer,
  type PrepResearch,
} from './callPrep'
import { formatCitationsForSlack, type ResearchCitation } from './marquetaCitations'
import { encodeCallLogMetadata, encodeContactRef, MARQUETA_ACTION } from './marquetaActions'
import { captureConfirmation, marquetaHelpText, parseMarquetaIntent, type MarquetaIntent } from './marquetaChat'
import { chunkForSlack, detectGenerationRequest, FORMAT_LABEL, parseGeneration } from './marquetaGenerate'
import { LABEL, MARQUETA_IDENTITY, stateNote, weekOfLabel } from './marquetaStyle'
import type { Suggestion } from './marquetaSuggest'
import { buildSitrepBlocks, type Sitrep } from './sitrep'
import {
  buildGenerationResultBlocks,
  buildIdeaCaptureBlocks,
  buildSuggestionBlocks,
  buildWeeklyDigestBlocks,
  ideaJudgementReceipt,
  redrawSuggestion,
  withIdeaJudgement,
  withRendomatMade,
} from './slackDelegation'
import { classifyMessage, ideaCategoryFrom, ideaTitleFrom } from './ideaCapture'
import { slackMention } from './slackText'
import { studioViewUrl } from './taskLinks'
import { DEFAULT_TEAM_ACCESS } from './teamAccess'
import { buildTaskCard, buildWeeklyCheckInBlocks, replaceCheckInTask, type CheckInTask } from './weeklyCheckIn'

type Block = Record<string, unknown>

// ── The contract Rendomat reads (captures.json, version 1) ──────────────────

export type CapturePerson = { id: string; name: string; slackUserId: string; color: string }

/** One thing that happens on screen, in order. */
export type CaptureStep =
  /** A message appears. `typed`: it is typed into the composer first. `threadOf`: a reply in that message's thread. */
  | { id: string; kind: 'post'; from: string; text: string; blocks?: Block[]; typed?: boolean; threadOf?: string }
  /** Someone presses the button labelled `label` on message `target`; the message redraws in place, or a form opens. */
  | { id: string; kind: 'press'; by: string; target: string; label: string; replace?: Block[]; modal?: Block }
  /** The open form is filled in (each field by its label, with the option shown) and submitted. */
  | { id: string; kind: 'submit'; by: string; modal: string; fill: { label: string; value: string }[] }

export type Capture = {
  id: string
  title: string
  /** One line a help page or a caption can use. */
  summary: string
  channel: string
  /** The command it teaches, exactly as typed, when it teaches one. */
  command?: string
  /** What the typed command must parse to (the guard test checks it). */
  intent?: MarquetaIntent['kind']
  steps: CaptureStep[]
}

export type CaptureFile = {
  version: 1
  source: { repo: 'goinvo-website'; script: 'scripts/export-marqueta-captures.ts'; generatedAt: string }
  /** Shown on every capture: these are made-up people and records. */
  disclaimer: string
  workspace: { name: string; channels: { id: string; name: string }[] }
  people: CapturePerson[]
  marqueta: { id: 'marqueta'; name: string; iconEmoji: string; botUserId: string }
  captures: Capture[]
}

// ── Fictional cast ──────────────────────────────────────────────────────────

export const CAPTURE_PEOPLE: CapturePerson[] = [
  { id: 'jules', name: 'Jules Soren', slackUserId: 'U0JULES01', color: '#2f7d6d' },
  { id: 'ezra', name: 'Ezra Park', slackUserId: 'U0EZRA001', color: '#b4532a' },
  { id: 'shay', name: 'Shay Lin', slackUserId: 'U0SHAY001', color: '#5a4fa3' },
]
/** Names a capture may contain. The guard test fails on any other capitalised person name it can recognise. */
export const CAPTURE_FICTIONAL_NAMES = ['Jules', 'Soren', 'Ezra', 'Park', 'Shay', 'Lin', 'Jane', 'Doe', 'Marqueta']

const CHANNEL = { id: 'C0MKTBOT01', name: 'marketing-bot' }
const STUDIO = 'https://studio.example.org'
const person = (id: string) => CAPTURE_PEOPLE.find((entry) => entry.id === id)!
const mention = (id: string) => slackMention(person(id).slackUserId, person(id).name.split(' ')[0])
const first = (id: string) => person(id).name.split(' ')[0]
const ts = (n: number) => `1792000000.${String(n).padStart(6, '0')}`

// Fixed clocks: a Monday plan, a Tuesday of calls, a Thursday check-in (New York time).
const MONDAY = new Date('2026-10-12T13:05:00Z')
const TUESDAY = new Date('2026-10-13T15:30:00Z')
const THURSDAY = new Date('2026-10-15T14:05:00Z')

// ── Scenes ──────────────────────────────────────────────────────────────────

function helpScene(): Capture {
  const command = 'Marqueta, help'
  return {
    id: 'help',
    title: 'Say hello',
    summary: 'Start a message with “Marqueta,” and she answers in a thread. “help” lists what she does.',
    channel: CHANNEL.id,
    command,
    intent: 'help',
    steps: [
      { id: 'ask', kind: 'post', from: 'jules', text: command, typed: true },
      { id: 'reply', kind: 'post', from: 'marqueta', threadOf: 'ask', text: marquetaHelpText({}) },
    ],
  }
}

const IDEA_TEXT = 'What about stickers for the Town Day booth? Cheap, and people actually keep them.'

function ideaScene(): Capture {
  const verdict = classifyMessage(IDEA_TEXT)
  if (verdict.kind !== 'idea') throw new Error(`the idea scene's message no longer reads as an idea (${verdict.kind})`)
  const title = ideaTitleFrom(IDEA_TEXT)
  const blocks = buildIdeaCaptureBlocks({ title, category: ideaCategoryFrom(IDEA_TEXT), channel: CHANNEL.id, ts: ts(200), studioUrl: STUDIO })
  const keepValue = buttonValue(blocks, LABEL.IDEA_KEEP)
  return {
    id: 'idea',
    title: 'Float an idea',
    summary: 'Say an idea out loud in her channel and she files it, so it doesn’t scroll away. Keep it, or say it isn’t one.',
    channel: CHANNEL.id,
    steps: [
      { id: 'idea', kind: 'post', from: 'shay', text: IDEA_TEXT, typed: true },
      {
        id: 'caught',
        kind: 'post',
        from: 'marqueta',
        threadOf: 'idea',
        text: captureConfirmation({ kind: 'idea', title, explicit: false }),
        blocks,
      },
      {
        id: 'keep',
        kind: 'press',
        by: 'jules',
        target: 'caught',
        label: LABEL.IDEA_KEEP,
        replace: withIdeaJudgement(blocks, ideaJudgementReceipt(true, slackMention(person('jules').slackUserId)), keepValue),
      },
    ],
  }
}

const NEWSLETTER: CheckInTask = {
  _id: 'demo-newsletter',
  title: 'Draft the October newsletter',
  kind: 'content',
  priority: 'high',
  status: 'not-started',
  dueAt: '2026-10-16',
  minutes: 90,
}
const TOWN_DAY_CALLS: CheckInTask = {
  _id: 'demo-town-day-calls',
  title: 'Call three people from the Town Day list',
  kind: 'outreach',
  status: 'working',
  ownerName: 'Ezra',
  slackUserId: person('ezra').slackUserId,
  dueAt: '2026-10-15',
  minutes: 60,
}

function mondayScene(): Capture {
  const card = buildTaskCard(NEWSLETTER, {
    now: MONDAY,
    mode: 'plan',
    ask: { slackUserId: person('jules').slackUserId, name: 'Jules', reason: 'suggested' },
    studioBaseUrl: STUDIO,
  })
  const blocks = buildWeeklyDigestBlocks({
    now: MONDAY,
    weekStart: '2026-10-12',
    budgetMinutes: 240,
    plan: { plannedMinutes: 210, theme: 'Get the newsletter out and start the Town Day calls' },
    planRecorded: true,
    lastWeek: 'Last week: 3 tasks done · Outreach: 4 calls logged',
    needsOwner: { asked: [{ taskId: NEWSLETTER._id, blocks: card }] },
    taken: [
      { name: 'Ezra', slackUserId: person('ezra').slackUserId, count: 2 },
      { name: 'Shay', slackUserId: person('shay').slackUserId, count: 1 },
    ],
    ideas: [{ title: 'Stickers for the Town Day booth' }],
    studioBaseUrl: STUDIO,
  })
  const taken = replaceCheckInTask(
    blocks,
    NEWSLETTER._id,
    { ...NEWSLETTER, ownerName: 'Jules', slackUserId: person('jules').slackUserId },
    { now: MONDAY, note: stateNote('taken', mention('jules'), MONDAY), mode: 'plan', studioBaseUrl: STUDIO },
  )
  return {
    id: 'monday-plan',
    title: 'The Monday plan',
    summary: 'Every Monday she posts the week that fits in our hours, and asks (never assigns) someone to take each piece.',
    channel: CHANNEL.id,
    steps: [
      { id: 'plan', kind: 'post', from: 'marqueta', text: 'This week in marketing', blocks },
      { id: 'take', kind: 'press', by: 'jules', target: 'plan', label: LABEL.TAKE, replace: taken },
    ],
  }
}

const JANE: PrepContact = {
  _id: 'marketingContact.demo-jane-doe',
  name: 'Jane Doe',
  organization: 'Example Health',
  role: 'Director of Clinical Informatics',
  warmth: 'warm',
  status: 'not-contacted',
  howWeKnow: 'Met at a conference panel last spring',
  suggestedOfferKey: 'design-diagnostic',
}
const EXAMPLE_RESEARCH: PrepResearch[] = [
  {
    organization: 'Example Health',
    recentSignal: 'Example Health is rolling out a new patient portal this winter.',
    reachableAbout: 'getting patients to actually use the new portal',
    suggestedOfferKey: 'design-diagnostic',
    verification: {
      status: 'verified',
      evidence: [{ url: 'https://example.org/news/portal', quote: 'We are rolling out a new patient portal this winter.' }],
    },
  },
]
const EXAMPLE_OFFERS: PrepOffer[] = [
  { key: 'design-diagnostic', title: 'Design Diagnostic', oneLiner: 'A two-week look at where your clinical software loses people.' },
]
const EXAMPLE_EVIDENCE: PrepEvidence[] = [
  { _id: 'demo-case-portal', title: 'A patient portal people came back to', client: 'A regional health system', businessOutcomes: ['More patients finished setup'] },
]

function callPrepScene(): Capture {
  const command = 'Marqueta, prep Jane Doe at Example Health'
  const request = parsePrepRequest(command.replace(/^Marqueta,\s*/, ''))
  const match = resolvePrepTarget(request, [JANE], EXAMPLE_RESEARCH)
  if (match.kind !== 'contact') throw new Error(`the call-prep scene should find Jane on file (got ${match.kind})`)
  const composed = composeCallOutline({
    match,
    research: EXAMPLE_RESEARCH,
    offers: EXAMPLE_OFFERS,
    evidence: EXAMPLE_EVIDENCE,
    senderName: 'Jules',
    includeContactDetails: false,
    now: TUESDAY,
    request,
  })
  const { contactDetails: _hidden, ...outline } = composed
  const logRef = encodeContactRef({ contactId: JANE._id, organization: outline.organization, name: outline.personLabel })
  const messages = buildCallOutlineMessages(outline, { studioUrl: studioViewUrl(STUDIO, 'outreach'), logRef })

  const voicemail = CALL_OUTCOMES.find((outcome) => outcome.key === 'voicemail')!
  const followUp = FOLLOW_UP_CHOICES.find((choice) => choice.value === 'default')!
  const modal = buildCallLogView({
    contactLabel: 'Jane Doe',
    metadata: encodeCallLogMetadata({ contactId: JANE._id, channel: CHANNEL.id, threadTs: ts(300), label: 'Jane Doe' }),
  })
  const followUpAt = new Date(TUESDAY.getTime() + (voicemail.defaultFollowUpDays || 0) * 86_400_000).toISOString().slice(0, 10)
  const receipt = buildCallLogReceiptBlocks({
    presserId: person('jules').slackUserId,
    contactLabel: 'Jane Doe',
    outcomeKey: 'voicemail',
    statusBefore: 'not-contacted',
    statusAfter: voicemail.status,
    followUpAt,
    undoValue: 'demo-undo',
    now: TUESDAY,
  })
  return {
    id: 'call-prep',
    title: 'Prep a call, then log it',
    summary: 'Ask her to prep a call and you get a ten-second cheat sheet. Afterwards, Log it… and she remembers the follow-up.',
    channel: CHANNEL.id,
    command,
    intent: 'prep',
    steps: [
      { id: 'ask', kind: 'post', from: 'jules', text: command, typed: true },
      { id: 'outline', kind: 'post', from: 'marqueta', threadOf: 'ask', text: messages.text, blocks: messages.first },
      ...(messages.second.length
        ? [{ id: 'more', kind: 'post' as const, from: 'marqueta', threadOf: 'ask', text: messages.threadText, blocks: messages.second }]
        : []),
      { id: 'log', kind: 'press', by: 'jules', target: 'outline', label: LABEL.LOG, modal: modal as Block },
      {
        id: 'logged',
        kind: 'submit',
        by: 'jules',
        modal: 'log',
        fill: [
          { label: modalLabelFor(modal as Block, voicemail.label), value: voicemail.label },
          { label: modalLabelFor(modal as Block, followUp.label), value: followUp.label },
        ],
      },
      { id: 'receipt', kind: 'post', from: 'marqueta', threadOf: 'ask', text: 'Logged', blocks: receipt },
    ],
  }
}

const SUGGESTIONS: Suggestion[] = [
  {
    title: 'Why patients give up on portals in the first five minutes',
    format: 'post',
    angle: 'The setup screen is where most portal relationships end — and it is a design problem, not a patient problem.',
    whyUs: 'Our portal work found the drop-off was in setup, not in the features.',
    whyNow: 'Portal rollouts are on a lot of winter roadmaps.',
    work: [{ id: 'W1', title: 'A patient portal people came back to', url: 'https://example.org/work/portal', kind: 'case study' }],
    research: [],
    documents: [],
    sources: [],
  },
  {
    title: 'A one-page checklist for a clinical AI pilot',
    format: 'outline',
    angle: 'Five questions to answer before a pilot starts, from the projects where they were skipped.',
    whyUs: 'We have watched pilots stall for reasons a checklist would have caught.',
    work: [{ id: 'W2', title: 'Designing for the people who use it at 3 a.m.', url: 'https://example.org/work/night-shift', kind: 'essay' }],
    research: [],
    documents: [],
    sources: [],
  },
]

const DRAFT_TITLE = 'Most patients quit a portal before they see a single feature'
const DRAFT_BODY = [
  'Most patients never see what a portal can do. They stop at the setup screen.',
  '',
  'When we watched people sign up for a new portal, the drop-off was not in messaging or bills. It was in the first five minutes: a code sent to an old phone, a password rule nobody could guess, a form asking for a number on a card they did not have with them.',
  '',
  'Three small changes kept people going: one screen per step, a way to finish later, and words a tired parent understands.',
  '',
  'If your portal is launching this winter, test the setup with five real patients before you test anything else.',
].join('\n')
const DRAFT_CITATION: ResearchCitation = {
  organization: 'Example Health',
  signal: 'Example Health is rolling out a new patient portal this winter.',
  quote: 'We are rolling out a new patient portal this winter.',
  sourceUrl: 'https://example.org/news/portal#:~:text=rolling%20out%20a%20new%20patient%20portal',
  sourceTitle: 'Example Health news',
  opening: 'Portal setup is the first thing to test.',
  offerKey: 'design-diagnostic',
  verified: true,
  context: '',
}

function suggestScene(): Capture {
  const command = 'Marqueta, suggest from our work'
  const card = buildSuggestionBlocks({ sourceLabel: 'from our work', suggestions: SUGGESTIONS, channel: CHANNEL.id })
  const pressed = redrawSuggestion(card, { index: 0, pressed: 'draft', note: `${mention('jules')} asked for a draft — it’s coming in this thread` })
  const draft = buildGenerationResultBlocks({
    formatLabel: FORMAT_LABEL.post,
    title: DRAFT_TITLE,
    bodyChunks: chunkForSlack(DRAFT_BODY),
    citationChunks: chunkForSlack(formatCitationsForSlack([DRAFT_CITATION])),
    sourceCount: 1,
    brandVoiceName: 'GoInvo',
    channel: CHANNEL.id,
    ts: ts(410),
    studioUrl: studioViewUrl(STUDIO, 'calendar'),
  })
  return {
    id: 'suggest',
    title: 'Ask what to make',
    summary: 'She suggests things to make from our real work. Draft it, and a first draft with its sources lands on the calendar with no date.',
    channel: CHANNEL.id,
    command,
    intent: 'suggest',
    steps: [
      { id: 'ask', kind: 'post', from: 'jules', text: command, typed: true },
      { id: 'ideas', kind: 'post', from: 'marqueta', threadOf: 'ask', text: 'Suggestions from our work', blocks: card },
      { id: 'draft', kind: 'press', by: 'jules', target: 'ideas', label: LABEL.SUGGEST_DRAFT, replace: pressed },
      { id: 'drafted', kind: 'post', from: 'marqueta', threadOf: 'ask', text: `Drafted a social post: ${DRAFT_TITLE}`, blocks: draft },
    ],
  }
}

function checkInScene(): Capture {
  const mine: CheckInTask = { ...NEWSLETTER, ownerName: 'Jules', slackUserId: person('jules').slackUserId, status: 'working' }
  const blocks = buildWeeklyCheckInBlocks({
    weekLabel: weekOfLabel('2026-10-12', THURSDAY),
    groups: [
      { ownerName: 'Jules', slackUserId: person('jules').slackUserId, tasks: [mine], hidden: 0, followUps: [] },
      { ownerName: 'Ezra', slackUserId: person('ezra').slackUserId, tasks: [TOWN_DAY_CALLS], hidden: 0, followUps: [] },
    ],
    unowned: [],
    pulse: null,
    now: THURSDAY,
    studioBaseUrl: STUDIO,
  })
  const done = replaceCheckInTask(blocks, mine._id, { ...mine, status: 'done' }, {
    now: THURSDAY,
    note: stateNote('done', mention('jules'), THURSDAY),
    mode: 'mine',
    studioBaseUrl: STUDIO,
  })
  return {
    id: 'checkin',
    title: 'The Thursday check-in',
    summary: 'On Thursdays she checks in on what each of us took. Press Done, or Stuck… if something is in the way. Silence means still on it.',
    channel: CHANNEL.id,
    steps: [
      { id: 'checkin', kind: 'post', from: 'marqueta', text: 'Thursday check-in', blocks },
      { id: 'done', kind: 'press', by: 'jules', target: 'checkin', label: LABEL.DONE, replace: done },
    ],
  }
}

const EXAMPLE_INTENT = normalizeIntent({
  status: 'draft',
  version: 1,
  endState: 'Example: a studio people call first when health software has to work for real patients.',
  horizon: '2027-03-31',
  objectives: [
    {
      key: 'discovery-calls',
      statement: 'Have more first conversations with the people we can help',
      measure: 'discovery calls held',
      target: 6,
      by: '2026-12-18',
      current: 1,
      currentAsOf: '2026-10-09',
      leadingIndicators: ['calls logged each week'],
    },
  ],
  notDoing: ['Paid ads'],
  assumptions: [{ statement: 'Portal and AI-pilot work stay on roadmaps this winter', checkBy: '2026-12-01' }],
  draftedBy: 'Marqueta',
  draftedAt: '2026-10-09T15:00:00Z',
  history: [{ version: 1, status: 'draft', by: 'Marqueta', at: '2026-10-09T15:00:00Z', note: 'First draft.' }],
}) as StrategyIntent

const EXAMPLE_SITREP: Sitrep = {
  see: [
    'Complaints about patient portal sign-up are up again this week: codes to old phones and passwords nobody can set.',
    'Clinicians keep describing AI pilots that worked in the demo and stalled on the ward.',
  ],
  recommend: [
    { text: 'Post the portal set-up piece this week; it answers the loudest complaint with work we have shown.', serves: 'discovery-calls' },
    { text: 'Call two people from last month’s list before adding anyone new.', serves: 'flank' },
  ],
  watch: ['If portal complaints stop rising, move the set-up piece out of the newsletter lead.'],
  blindSpots: ['No calls are logged against the discovery-call goal yet this month.'],
  by: 'model',
  at: TUESDAY.toISOString(),
}

function sitrepScene(): Capture {
  const command = 'Marqueta, sitrep'
  const approved = approveIntent(EXAMPLE_INTENT, { by: 'Jules', at: '2026-10-09T16:00:00Z', now: new Date('2026-10-09T16:00:00Z') })
  if (!approved) throw new Error('the example intent no longer passes approval')
  return {
    id: 'sitrep',
    title: 'The big picture',
    summary: 'Ask for a sitrep: what she sees in our field this week, what she recommends, and what we might be missing.',
    channel: CHANNEL.id,
    command,
    intent: 'sitrep',
    steps: [
      { id: 'ask', kind: 'post', from: 'jules', text: command, typed: true },
      {
        id: 'sitrep',
        kind: 'post',
        from: 'marqueta',
        threadOf: 'ask',
        text: 'Sitrep',
        blocks: buildSitrepBlocks({ sitrep: EXAMPLE_SITREP, intent: approved, week: '2026-W42', now: TUESDAY }),
      },
    ],
  }
}

function intentScene(): Capture {
  const command = 'Marqueta, intent'
  const ids = { approve: MARQUETA_ACTION.intentApprove, change: MARQUETA_ACTION.intentChange }
  const draft = buildIntentBlocks({ intent: EXAMPLE_INTENT, now: TUESDAY, access: DEFAULT_TEAM_ACCESS, viewerCanApprove: true, actionIds: ids })
  const approved = approveIntent(EXAMPLE_INTENT, { by: 'Jules', at: TUESDAY.toISOString(), now: TUESDAY })
  if (!approved) throw new Error('the example intent no longer passes approval')
  return {
    id: 'intent',
    title: 'Agree where we’re headed',
    summary: 'Our intent is the goal she judges everything against. She drafts it; any of us can approve it or ask for a change.',
    channel: CHANNEL.id,
    command,
    intent: 'intent',
    steps: [
      { id: 'ask', kind: 'post', from: 'jules', text: command, typed: true },
      { id: 'card', kind: 'post', from: 'marqueta', threadOf: 'ask', text: 'Our intent (draft)', blocks: draft },
      {
        id: 'approve',
        kind: 'press',
        by: 'jules',
        target: 'card',
        label: LABEL.INTENT_APPROVE,
        replace: buildIntentBlocks({ intent: approved, now: TUESDAY, access: DEFAULT_TEAM_ACCESS, viewerCanApprove: true, actionIds: ids }),
      },
    ],
  }
}

/** What the model returns for a script, in the shape it is asked for: spoken lines plus a short line per slide. */
const SCRIPT_REPLY = JSON.stringify({
  title: 'The five minutes that lose a patient',
  hook: 'Most patients never see what your portal can do. They quit at the setup screen.',
  hookOnScreen: 'They quit at setup',
  beats: [
    {
      label: 'Where they stop',
      body: 'A code sent to an old phone. A password rule nobody can guess. A number on a card they left at home.',
      onScreen: 'Old phone. Bad password rule.',
    },
    {
      label: 'What kept them going',
      body: 'One screen per step, a way to finish later, and words a tired parent understands.',
      onScreen: 'One step per screen',
    },
  ],
  close: 'Launching a portal this winter? Test the setup with five real patients first.',
  closeOnScreen: 'Test setup with five patients',
})
const RENDOMAT_PROJECT_URL = 'https://rendomat.example.org/videos/1201'

function makeVideoScene(): Capture {
  const command = 'Marqueta, draft script: why patients quit portal setup'
  const request = detectGenerationRequest(command.replace(/^Marqueta,\s*/, ''))
  if (request?.format !== 'script') throw new Error('the video scene’s command no longer asks for a script')
  const generated = parseGeneration('script', SCRIPT_REPLY)
  if (!generated?.frames?.length) throw new Error('the video scene’s script no longer keeps its frames')
  const card = buildGenerationResultBlocks({
    formatLabel: FORMAT_LABEL.script,
    title: generated.title,
    bodyChunks: chunkForSlack(generated.body),
    citationChunks: chunkForSlack(formatCitationsForSlack([DRAFT_CITATION])),
    sourceCount: 1,
    brandVoiceName: 'GoInvo',
    channel: CHANNEL.id,
    ts: ts(500),
    studioUrl: studioViewUrl(STUDIO, 'calendar'),
    format: 'script',
    rendomat: { configured: true },
  })
  const made = withRendomatMade(card, {
    note: stateNote('exportedToRendomat', mention('jules'), TUESDAY),
    projectUrl: RENDOMAT_PROJECT_URL,
    pressedValue: buttonValue(card, LABEL.MAKE_IN_RENDOMAT),
  })
  return {
    id: 'make-video',
    title: 'Turn a script into a video',
    summary: 'Ask for a video script and press Export to Rendomat: it exports the script as a Rendomat project with the slides laid out in our brand, ready to edit and render.',
    channel: CHANNEL.id,
    command,
    intent: 'generate',
    steps: [
      { id: 'ask', kind: 'post', from: 'jules', text: command, typed: true },
      { id: 'script', kind: 'post', from: 'marqueta', threadOf: 'ask', text: `Drafted a script: ${generated.title}`, blocks: card },
      { id: 'make', kind: 'press', by: 'jules', target: 'script', label: LABEL.MAKE_IN_RENDOMAT, replace: made },
    ],
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type Element = { type?: string; text?: { text?: string }; value?: string; label?: { text?: string } }

/** Every button on a message, in order. */
export function buttonsOn(blocks: Block[] | undefined): Element[] {
  const out: Element[] = []
  for (const block of blocks || []) {
    const elements = (block as { elements?: Element[] }).elements || []
    for (const element of elements) if (element?.type === 'button') out.push(element)
    const accessory = (block as { accessory?: Element }).accessory
    if (accessory?.type === 'button') out.push(accessory)
  }
  return out
}

function buttonValue(blocks: Block[], label: string): string | undefined {
  return buttonsOn(blocks).find((element) => element.text?.text === label)?.value
}

/** The label of the form field that offers `option`, so a submit step can name the field it fills. */
function modalLabelFor(view: Block, option: string): string {
  for (const block of ((view as { blocks?: Block[] }).blocks || []) as Array<{ type?: string; label?: { text?: string }; element?: { options?: { text?: { text?: string } }[] } }>) {
    if (block.type !== 'input') continue
    if ((block.element?.options || []).some((entry) => entry.text?.text === option)) return block.label?.text || ''
  }
  throw new Error(`no field in the form offers “${option}”`)
}

// ── The whole set ───────────────────────────────────────────────────────────

/** The scenes in the order a beginner meets them. */
export function buildMarquetaCaptures(input: { generatedAt: string }): CaptureFile {
  return {
    version: 1,
    source: { repo: 'goinvo-website', script: 'scripts/export-marqueta-captures.ts', generatedAt: input.generatedAt },
    disclaimer: 'Example data: made-up people and records.',
    workspace: { name: 'GoInvo', channels: [CHANNEL] },
    people: CAPTURE_PEOPLE,
    marqueta: { id: 'marqueta', name: MARQUETA_IDENTITY.username, iconEmoji: MARQUETA_IDENTITY.iconEmoji, botUserId: 'U0MARQUETA' },
    captures: [helpScene(), ideaScene(), mondayScene(), callPrepScene(), suggestScene(), checkInScene(), sitrepScene(), intentScene(), makeVideoScene()],
  }
}

/** For the guard test: what each typed command parses to. */
export function parsedIntentOf(command: string): MarquetaIntent['kind'] {
  return parseMarquetaIntent(command).kind
}
