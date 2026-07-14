import {
  MAX_BRAND_VOICE_EXAMPLES,
  MAX_BRAND_VOICE_RULES,
  type MarketingBrandVoice,
} from '@/lib/marketing/brandVoice'

export const BRAND_VOICE_LEARNING_SURFACES = ['contentDraft', 'outreach'] as const
export type BrandVoiceLearningSurface = (typeof BRAND_VOICE_LEARNING_SURFACES)[number]
export type BrandVoiceLearningConfidence = 'high' | 'medium' | 'low'

export interface BrandVoiceLearningExample {
  text: string
  principles: string[]
  reason: string
}

export interface BrandVoiceLearningProposal {
  voice: { key: string; name: string }
  surface: BrandVoiceLearningSurface
  settingsRevision: string
  summary: string
  confidence: BrandVoiceLearningConfidence
  changedFields: string[]
  guidanceReplacement?: string
  doAdditions: string[]
  avoidAdditions: string[]
  curatedExamples: BrandVoiceLearningExample[]
}

export interface BrandVoiceLearningSelection {
  guidance: boolean
  do: string[]
  avoid: string[]
  examples: boolean
}

export interface BrandVoiceLearningCopyDiff {
  before: Record<string, string>
  after: Record<string, string>
  changedFields: string[]
}

export interface BrandVoiceLearningApplication {
  fields: Partial<Pick<MarketingBrandVoice, 'guidance' | 'do' | 'avoid' | 'examples'>>
  changes: {
    guidance: boolean
    do: string[]
    avoid: string[]
    examples: string[]
  }
}

const MAX_COPY_FIELD_LENGTH = 6_000
const MAX_COPY_FIELDS = 40
const MAX_PROJECTION_DEPTH = 8
const MAX_PROJECTION_ARRAY_ITEMS = 24
const MAX_PROJECTION_KEYS = 80

const CONTENT_DRAFT_FIELDS = ['headline', 'caption', 'callToAction'] as const
const CONTENT_DRAFT_FRAME_FIELDS = ['title', 'body'] as const
// callBrief intentionally stays out: it mixes private person/org context,
// pricing, evidence, an ask, and a question in one unstructured string.
const OUTREACH_FIELDS = ['suggestedOpener'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function cleanKey(value: unknown): string {
  const key = cleanText(value, 96)
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : ''
}

function cleanRevision(value: unknown): string {
  const revision = cleanText(value, 160)
  return /^[A-Za-z0-9._-]+$/.test(revision) ? revision : ''
}

function cleanList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value) {
    const text = cleanText(item, maxLength)
    if (!text || result.some((existing) => isNearDuplicate(existing, text))) continue
    result.push(text)
    if (result.length >= maxItems) break
  }
  return result
}

/**
 * Restrict an edited document to the exact key/array shape that was generated.
 * This browser-safe projection prevents pre-existing or newly-added fields from
 * being treated as feedback. The surface extractor below applies the stricter
 * server-owned copy allowlist after projection.
 */
export function projectAfterToBeforeShape(before: unknown, after: unknown): unknown {
  const project = (template: unknown, candidate: unknown, depth: number): unknown => {
    if (depth > MAX_PROJECTION_DEPTH) return undefined
    if (typeof template === 'string') {
      return typeof candidate === 'string' ? cleanText(candidate, MAX_COPY_FIELD_LENGTH) : undefined
    }
    if (Array.isArray(template)) {
      if (!Array.isArray(candidate)) return []
      return template.slice(0, MAX_PROJECTION_ARRAY_ITEMS).map((item, index) =>
        project(item, candidate[index], depth + 1),
      )
    }
    if (!isRecord(template)) return undefined

    const source = isRecord(candidate) ? candidate : {}
    const projected: Record<string, unknown> = {}
    for (const key of Object.keys(template).slice(0, MAX_PROJECTION_KEYS)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue
      const value = project(template[key], source[key], depth + 1)
      if (value !== undefined) projected[key] = value
    }
    return projected
  }

  return project(before, after, 0)
}

function addCopyField(
  result: Record<string, string>,
  source: Record<string, unknown>,
  key: string,
  path = key,
) {
  if (Object.keys(result).length >= MAX_COPY_FIELDS || typeof source[key] !== 'string') return
  result[path] = cleanText(source[key], MAX_COPY_FIELD_LENGTH)
}

function extractAllowedCopy(surface: BrandVoiceLearningSurface, value: unknown) {
  const source = isRecord(value) ? value : {}
  const result: Record<string, string> = {}

  if (surface === 'outreach') {
    for (const field of OUTREACH_FIELDS) addCopyField(result, source, field)
    return result
  }

  for (const field of CONTENT_DRAFT_FIELDS) addCopyField(result, source, field)
  const frames = Array.isArray(source.frames)
    ? source.frames.slice(0, MAX_PROJECTION_ARRAY_ITEMS)
    : []
  frames.forEach((frame, index) => {
    if (!isRecord(frame)) return
    for (const field of CONTENT_DRAFT_FRAME_FIELDS) {
      addCopyField(result, frame, field, `frames[${index}].${field}`)
    }
  })
  return result
}

export function isBrandVoiceLearningSurface(value: unknown): value is BrandVoiceLearningSurface {
  return BRAND_VOICE_LEARNING_SURFACES.includes(value as BrandVoiceLearningSurface)
}

/** Extract only server-approved copy fields, after projecting edits to the generated shape. */
export function extractBrandVoiceLearningDiff(
  surface: BrandVoiceLearningSurface,
  before: unknown,
  after: unknown,
): BrandVoiceLearningCopyDiff {
  const projectedAfter = projectAfterToBeforeShape(before, after)
  const beforeCopy = extractAllowedCopy(surface, before)
  const afterCopy = extractAllowedCopy(surface, projectedAfter)
  const changedFields = [...new Set([...Object.keys(beforeCopy), ...Object.keys(afterCopy)])]
    .filter((path) => (beforeCopy[path] || '') !== (afterCopy[path] || ''))
    .slice(0, MAX_COPY_FIELDS)
  return { before: beforeCopy, after: afterCopy, changedFields }
}

export function hasMaterialVoiceEdit(
  surface: BrandVoiceLearningSurface,
  before: unknown,
  after: unknown,
): boolean {
  return extractBrandVoiceLearningDiff(surface, before, after).changedFields.length > 0
}

function comparisonFingerprint(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function wordSet(value: string): Set<string> {
  return new Set(comparisonFingerprint(value).split(' ').filter(Boolean))
}

/** Deterministic similarity check used for both rules and example curation. */
export function isNearDuplicate(left: string, right: string): boolean {
  const a = comparisonFingerprint(left)
  const b = comparisonFingerprint(right)
  if (!a || !b) return false
  if (a === b) return true
  const shorter = a.length <= b.length ? a : b
  const longer = a.length > b.length ? a : b
  if (shorter.length >= 30 && longer.includes(shorter) && shorter.length / longer.length >= 0.78) {
    return true
  }

  const aWords = wordSet(a)
  const bWords = wordSet(b)
  if (Math.min(aWords.size, bWords.size) < 3) return false
  const intersection = [...aWords].filter((word) => bWords.has(word)).length
  const union = new Set([...aWords, ...bWords]).size
  return union > 0 && intersection / union >= 0.8
}

/** Preserve existing approved examples, remove near duplicates, then add diverse candidates. */
export function curateBrandVoiceExamples(
  existing: unknown,
  candidates: unknown,
): string[] {
  const result: string[] = []
  const append = (items: unknown) => {
    if (!Array.isArray(items)) return
    for (const item of items) {
      const text = cleanText(item, 600)
      if (!text || result.some((approved) => isNearDuplicate(approved, text))) continue
      result.push(text)
      if (result.length >= MAX_BRAND_VOICE_EXAMPLES) return
    }
  }
  append(existing)
  if (result.length < MAX_BRAND_VOICE_EXAMPLES) append(candidates)
  return result
}

const SPELLED_METRIC_PATTERN =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|double|triple)(?:[\s-]+(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|double|triple))*[\s-]+(?:percent(?:age)?|basis[\s-]+points?|dollars?|euros?|pounds?|users?|patients?|members?|visits?|hours?|minutes?|days?|weeks?|months?|years?)\b/i

function containsSpecificOrUnsafeDetail(value: string): boolean {
  return (
    /(?:https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i.test(value) ||
    /[$€£¥]|\d/.test(value) ||
    /\b[A-Z]+[a-z]+[A-Z][A-Za-z]*\b/.test(value) ||
    /\b[A-Z][a-z]{1,}\s+[A-Z][a-z]{1,}\b/.test(value) ||
    SPELLED_METRIC_PATTERN.test(value)
  )
}

const SOURCE_PHRASE_GENERIC_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'as', 'at', 'avoid', 'be', 'because', 'but',
  'cite', 'do', 'for', 'from', 'give', 'in', 'is', 'it', 'lead', 'make', 'mention',
  'of', 'on', 'open', 'or', 'our', 'say', 'so', 'start', 'that', 'the', 'their',
  'this', 'to', 'use', 'we', 'when', 'with', 'without', 'write', 'you', 'your',
])

/**
 * Outreach copy can contain lowercase names that capitalization heuristics
 * cannot recognize. Reject rules that repeat even one distinctive source
 * word, while allowing generic writing principles that do not quote the
 * contact-specific opener.
 */
function containsSourceSpecificPhrase(value: string, sourceCorpus: string[]): boolean {
  const candidateWords = comparisonFingerprint(value)
    .split(' ')
    .filter((word) => word && !SOURCE_PHRASE_GENERIC_WORDS.has(word))
  if (!candidateWords.length) return false

  return sourceCorpus.some((source) => {
    const sourceWords = new Set(
      comparisonFingerprint(source)
        .split(' ')
        .filter((word) => word && !SOURCE_PHRASE_GENERIC_WORDS.has(word)),
    )
    return candidateWords.some((word) => sourceWords.has(word))
  })
}

const GENERAL_PRINCIPLE_OPENERS = new Set([
  'a', 'address', 'an', 'answer', 'ask', 'avoid', 'balance', 'be', 'begin', 'choose',
  'close', 'combine', 'concise', 'conversational', 'direct', 'do', 'emphasize', 'end',
  'explain', 'favor', 'focus', 'follow', 'frame', 'give', 'how', 'if', 'include', 'keep',
  'lead', 'let', 'limit', 'make', 'match', 'name', 'open', 'our', 'people', 'plainspoken',
  'prefer', 'preserve', 'put', 'remove', 'replace', 'short', 'show', 'sound', 'speak',
  'start', 'state', 'stay', 'teams', 'that', 'the', 'this', 'treat', 'use', 'vary', 'warm',
  'what', 'when', 'why', 'write', 'you', 'your',
])
const GENERAL_PRINCIPLE_ALLOWED_CAPITALS = new Set(['I', 'We', 'You'])

/** Conservative proper-name screen for data that would enter public settings. */
function containsLikelySpecificName(value: string): boolean {
  for (const match of value.matchAll(/\b\p{Lu}[\p{L}’'’-]*\b/gu)) {
    const word = match[0]
    if (GENERAL_PRINCIPLE_ALLOWED_CAPITALS.has(word)) continue
    const index = match.index || 0
    const prefix = value.slice(0, index)
    const startsSentence = !prefix.trim() || /[.!?]\s*$/.test(prefix)
    if (startsSentence && GENERAL_PRINCIPLE_OPENERS.has(word.toLocaleLowerCase('en-US'))) continue
    return true
  }
  return false
}

function cleanGeneralPrinciple(value: unknown, maxLength: number): string {
  const text = cleanText(value, maxLength)
  if (!text || containsSpecificOrUnsafeDetail(text) || containsLikelySpecificName(text)) return ''
  return text
}

function copyCorpus(diff: BrandVoiceLearningCopyDiff): string[] {
  return diff.changedFields.map((field) => diff.after[field]).filter(Boolean)
}

function isFinalCopySnippet(value: string, corpus: string[]): boolean {
  const needle = comparisonFingerprint(value)
  return Boolean(
    needle &&
      needle.length >= 12 &&
      corpus.some((copy) => comparisonFingerprint(copy).includes(needle)),
  )
}

function normalizeModelExamples(
  value: unknown,
  diff: BrandVoiceLearningCopyDiff,
  existingExamples: string[],
): BrandVoiceLearningExample[] {
  if (!Array.isArray(value)) return []
  const result: BrandVoiceLearningExample[] = []
  const corpus = copyCorpus(diff)
  for (const item of value) {
    if (!isRecord(item)) continue
    const text = cleanText(item.text, 600)
    const principles = cleanList(item.principles, 3, 180)
      .map((principle) => cleanGeneralPrinciple(principle, 180))
      .filter(Boolean)
    const reason = cleanText(item.reason, 320)
    const retainsExistingExample = existingExamples.some(
      (existing) => cleanText(existing, 600) === text,
    )
    const priorPrinciples = result.flatMap((example) => example.principles)
    const addsDistinctPrinciple = principles.some(
      (principle) =>
        !priorPrinciples.some((priorPrinciple) => isNearDuplicate(priorPrinciple, principle)),
    )
    if (
      !text ||
      !reason ||
      principles.length === 0 ||
      !addsDistinctPrinciple ||
      containsSpecificOrUnsafeDetail(text) ||
      containsLikelySpecificName(text) ||
      (!retainsExistingExample && !isFinalCopySnippet(text, corpus)) ||
      result.some((existing) => isNearDuplicate(existing.text, text))
    ) {
      continue
    }
    result.push({ text, principles, reason })
    if (result.length >= MAX_BRAND_VOICE_EXAMPLES) break
  }
  return result
}

const RULE_TOPIC_STOP_WORDS = new Set([
  'a', 'always', 'an', 'and', 'avoid', 'be', 'begin', 'do', 'dont', 'end', 'favor',
  'for', 'from', 'include', 'into', 'keep', 'lead', 'make', 'never', 'not', 'of',
  'omit', 'or', 'place', 'prefer', 'put', 'remove', 'say', 'start', 'the', 'to',
  'use', 'using', 'with', 'without', 'write',
])

const RULE_TOPIC_ALIASES: Record<string, string> = {
  approachable: 'warm',
  brief: 'short',
  casual: 'conversational',
  compact: 'short',
  concise: 'short',
  concrete: 'specific',
  explicit: 'clear',
  friendly: 'warm',
  human: 'warm',
  informal: 'conversational',
  lengthy: 'long',
  personable: 'warm',
  plain: 'clear',
  precise: 'specific',
  rambling: 'long',
  simple: 'clear',
  straightforward: 'clear',
  succinct: 'short',
  terse: 'short',
  verbose: 'long',
  wordy: 'long',
}

function canonicalRuleTopicWord(word: string): string {
  const singular = word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word
  return RULE_TOPIC_ALIASES[singular] || singular
}

function ruleTopicWords(value: string): Set<string> {
  return new Set(
    comparisonFingerprint(value)
      .split(' ')
      .filter((word) => word && !RULE_TOPIC_STOP_WORDS.has(word))
      .map(canonicalRuleTopicWord),
  )
}

/** A Do and an Avoid must not issue opposing instructions about the same topic. */
function rulesConflictAcrossPolarity(left: string, right: string): boolean {
  if (isNearDuplicate(left, right)) return true
  const leftTopic = ruleTopicWords(left)
  const rightTopic = ruleTopicWords(right)
  const smallerSize = Math.min(leftTopic.size, rightTopic.size)
  const largerSize = Math.max(leftTopic.size, rightTopic.size)
  if (!smallerSize) return false
  const overlap = [...leftTopic].filter((word) => rightTopic.has(word)).length
  return overlap === smallerSize && (smallerSize >= 2 || largerSize <= 2)
}

function normalizeRuleAdditions(
  value: unknown,
  existing: string[],
  oppositeRules: string[] = [],
  sourceCorpus: string[] = [],
): string[] {
  if (!Array.isArray(value)) return []
  const result: string[] = []
  for (const item of value) {
    const rule = cleanGeneralPrinciple(item, 320)
    if (
      !rule ||
      containsSourceSpecificPhrase(rule, sourceCorpus) ||
      existing.some((current) => isNearDuplicate(current, rule)) ||
      oppositeRules.some((current) => rulesConflictAcrossPolarity(current, rule)) ||
      result.some((current) => isNearDuplicate(current, rule))
    ) {
      continue
    }
    result.push(rule)
    if (result.length >= 2) break
  }
  return result
}

function hasProposalChanges(proposal: BrandVoiceLearningProposal): boolean {
  return Boolean(
    proposal.guidanceReplacement ||
      proposal.doAdditions.length ||
      proposal.avoidAdditions.length ||
      proposal.curatedExamples.length,
  )
}

/**
 * Convert untrusted model JSON into a bounded, server-owned proposal envelope.
 * Identity, revision, surface, and changed fields always come from server data.
 */
export function createBrandVoiceLearningProposal(input: {
  modelOutput: unknown
  voice: MarketingBrandVoice
  surface: BrandVoiceLearningSurface
  settingsRevision: string
  diff: BrandVoiceLearningCopyDiff
}): BrandVoiceLearningProposal {
  const output = isRecord(input.modelOutput) ? input.modelOutput : {}
  const existingExamples = input.voice.examples || []
  const availableDoSlots = Math.max(0, MAX_BRAND_VOICE_RULES - (input.voice.do || []).length)
  const availableAvoidSlots = Math.max(0, MAX_BRAND_VOICE_RULES - (input.voice.avoid || []).length)
  const outreachSourceCorpus =
    input.surface === 'outreach'
      ? input.diff.changedFields.flatMap((field) => [input.diff.before[field], input.diff.after[field]])
      : []
  const doAdditions = normalizeRuleAdditions(
    output.doAdditions,
    input.voice.do || [],
    input.voice.avoid || [],
    outreachSourceCorpus,
  ).slice(0, availableDoSlots)
  const avoidAdditions = normalizeRuleAdditions(
    output.avoidAdditions,
    input.voice.avoid || [],
    [...(input.voice.do || []), ...doAdditions],
    outreachSourceCorpus,
  ).slice(0, availableAvoidSlots)
  const proposal: BrandVoiceLearningProposal = {
    voice: { key: input.voice._key, name: cleanText(input.voice.name, 80) },
    surface: input.surface,
    settingsRevision: input.settingsRevision,
    summary: cleanText(output.summary, 600) || 'No reusable voice principle was found in this edit.',
    // One edit is weak evidence and can never authorize a high-confidence
    // or destructive full-guidance change.
    confidence:
      input.surface === 'outreach'
        ? 'low'
        : output.confidence === 'high' || output.confidence === 'medium'
          ? 'medium'
          : 'low',
    changedFields: [...input.diff.changedFields],
    doAdditions,
    avoidAdditions,
    // Outreach edits can contain private contact data. Never copy exact
    // Outreach snippets into the public Marketing Settings document.
    curatedExamples:
      input.surface === 'outreach'
        ? []
        : normalizeModelExamples(output.curatedExamples, input.diff, existingExamples),
  }

  if (!hasProposalChanges(proposal)) {
    proposal.confidence = 'low'
    proposal.changedFields = []
  }
  return proposal
}

export function createEmptyBrandVoiceLearningProposal(input: {
  voice: MarketingBrandVoice
  surface: BrandVoiceLearningSurface
  settingsRevision: string
  summary?: string
}): BrandVoiceLearningProposal {
  return {
    voice: { key: input.voice._key, name: cleanText(input.voice.name, 80) },
    surface: input.surface,
    settingsRevision: input.settingsRevision,
    summary: input.summary || 'No eligible outward-facing copy changed, so there is nothing to learn.',
    confidence: 'low',
    changedFields: [],
    doAdditions: [],
    avoidAdditions: [],
    curatedExamples: [],
  }
}

function isAllowedChangedField(surface: BrandVoiceLearningSurface, field: string): boolean {
  if (surface === 'outreach') return OUTREACH_FIELDS.includes(field as (typeof OUTREACH_FIELDS)[number])
  return (
    CONTENT_DRAFT_FIELDS.includes(field as (typeof CONTENT_DRAFT_FIELDS)[number]) ||
    /^frames\[\d{1,2}\]\.(?:title|body)$/.test(field)
  )
}

/** Validate a client-returned proposal before an authenticated apply request. */
export function parseBrandVoiceLearningProposal(value: unknown): BrandVoiceLearningProposal | null {
  if (!isRecord(value) || !isRecord(value.voice) || !isBrandVoiceLearningSurface(value.surface)) {
    return null
  }
  const key = cleanKey(value.voice.key)
  const name = cleanText(value.voice.name, 80)
  const settingsRevision = cleanRevision(value.settingsRevision)
  const summary = cleanText(value.summary, 600)
  const confidence = value.confidence
  if (
    !key ||
    !name ||
    !settingsRevision ||
    !summary ||
    (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low')
  ) {
    return null
  }

  const guidanceReplacement = cleanGeneralPrinciple(value.guidanceReplacement, 2_400)
  const doAdditions = cleanList(value.doAdditions, 2, 320)
    .map((item) => cleanGeneralPrinciple(item, 320))
    .filter(Boolean)
  const avoidAdditions = cleanList(value.avoidAdditions, 2, 320)
    .map((item) => cleanGeneralPrinciple(item, 320))
    .filter(Boolean)
  const changedFields = cleanList(value.changedFields, MAX_COPY_FIELDS, 120).filter((field) =>
    isAllowedChangedField(value.surface as BrandVoiceLearningSurface, field),
  )
  const curatedExamples = Array.isArray(value.curatedExamples)
    ? value.curatedExamples
        .slice(0, MAX_BRAND_VOICE_EXAMPLES)
        .map((item): BrandVoiceLearningExample | null => {
          if (!isRecord(item)) return null
          const text = cleanText(item.text, 600)
          const principles = cleanList(item.principles, 3, 180)
            .map((principle) => cleanGeneralPrinciple(principle, 180))
            .filter(Boolean)
          const reason = cleanText(item.reason, 320)
          if (
            !text ||
            !reason ||
            principles.length === 0 ||
            containsSpecificOrUnsafeDetail(text) ||
            containsLikelySpecificName(text)
          ) {
            return null
          }
          return { text, principles, reason }
        })
        .filter((item): item is BrandVoiceLearningExample => Boolean(item))
    : []

  return {
    voice: { key, name },
    surface: value.surface,
    settingsRevision,
    summary,
    confidence,
    changedFields,
    ...(guidanceReplacement ? { guidanceReplacement } : {}),
    doAdditions,
    avoidAdditions,
    curatedExamples,
  }
}

function selectedOfferedRules(selected: unknown, offered: string[], label: string): string[] {
  if (!Array.isArray(selected) || selected.length > 2) {
    throw new Error(`${label} selections must be a list of at most 2 proposed rules.`)
  }
  const result: string[] = []
  for (const item of selected) {
    const rule = cleanText(item, 320)
    const offeredRule = offered.find((candidate) => candidate === rule)
    if (!offeredRule) throw new Error(`${label} selections must come from this proposal.`)
    if (!result.includes(offeredRule)) result.push(offeredRule)
  }
  return result
}

function sameList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function approvedRulesVerbatim(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function appendRuleCandidates(
  current: string[],
  selected: string[],
): { next: string[]; added: string[] } {
  const added: string[] = []
  for (const candidate of selected) {
    if (
      current.length + added.length >= MAX_BRAND_VOICE_RULES ||
      current.some((approved) => isNearDuplicate(approved, candidate)) ||
      added.some((approved) => isNearDuplicate(approved, candidate))
    ) {
      continue
    }
    added.push(candidate)
  }
  return { next: [...current, ...added], added }
}

/** Apply only explicitly selected, bounded proposal fields to one active voice. */
export function applyBrandVoiceLearningSelection(
  voice: MarketingBrandVoice,
  proposalValue: unknown,
  selectionValue: unknown,
): BrandVoiceLearningApplication {
  const proposal = parseBrandVoiceLearningProposal(proposalValue)
  if (!proposal) throw new Error('The learning proposal is invalid or incomplete.')
  if (!isRecord(selectionValue)) throw new Error('Choose which proposed voice changes to apply.')
  if (proposal.voice.key !== voice._key || voice.status !== 'active') {
    throw new Error('The selected active voice no longer matches this proposal.')
  }

  const selection: BrandVoiceLearningSelection = {
    guidance: selectionValue.guidance === true,
    do: selectedOfferedRules(selectionValue.do, proposal.doAdditions, 'Do'),
    avoid: selectedOfferedRules(selectionValue.avoid, proposal.avoidAdditions, 'Avoid'),
    examples: selectionValue.examples === true,
  }
  const currentDo = approvedRulesVerbatim(voice.do)
  const currentAvoid = approvedRulesVerbatim(voice.avoid)
  const hasPolarityConflict =
    selection.do.some((rule) =>
      [...currentAvoid, ...selection.avoid].some((opposite) =>
        rulesConflictAcrossPolarity(rule, opposite),
      ),
    ) ||
    selection.avoid.some((rule) =>
      currentDo.some((opposite) => rulesConflictAcrossPolarity(rule, opposite)),
    )
  if (hasPolarityConflict) {
    throw new Error('Selected Do and Avoid principles cannot conflict about the same topic.')
  }
  const fields: BrandVoiceLearningApplication['fields'] = {}
  const changes: BrandVoiceLearningApplication['changes'] = {
    guidance: false,
    do: [],
    avoid: [],
    examples: [],
  }

  if (selection.guidance) {
    throw new Error(
      'One edited draft cannot replace the voice guidance. Apply a proposed Do or Avoid principle instead.',
    )
  }

  if (selection.do.length) {
    const { next, added } = appendRuleCandidates(currentDo, selection.do)
    if (added.length) {
      fields.do = next
      changes.do = added
    }
  }

  if (selection.avoid.length) {
    const { next, added } = appendRuleCandidates(currentAvoid, selection.avoid)
    if (added.length) {
      fields.avoid = next
      changes.avoid = added
    }
  }

  if (selection.examples) {
    if (!proposal.curatedExamples.length) throw new Error('This proposal has no curated examples to apply.')
    const current = curateBrandVoiceExamples(voice.examples, [])
    const curatedSet = curateBrandVoiceExamples(
      [],
      proposal.curatedExamples.map((example) => example.text),
    )
    if (!sameList(current, curatedSet)) {
      fields.examples = curatedSet
      changes.examples = curatedSet
    }
  }

  if (!Object.keys(fields).length) {
    throw new Error('Select at least one new proposed change to apply.')
  }
  return { fields, changes }
}
