import {
  marketingOperationFingerprint,
  normalizeMarketingOperationInput,
  type MarketingOperationInput,
} from '@/lib/marketing/operations'

export const MARKETER_BRIEF_UNSAVED_ID = 'marketing-coworker-work-update'
export const MARKETER_BRIEF_MAX_LENGTH = 1800
export const MARKETER_BRIEF_AUTOMATIC_METHODS = ['cmsScan'] as const

const RESEARCH_TYPES = new Set(['topic', 'competitor', 'strategy'])
const CAMPAIGN_OBJECTIVES = new Set([
  'awareness',
  'audienceGrowth',
  'serviceInterest',
  'qualifiedConversations',
  'launchSupport',
  'adoption',
])
const RESEARCH_METHODS = new Set([
  'deskResearch',
  'seoReview',
  'cmsScan',
  'analyticsReview',
  'competitiveScan',
  'audienceInterview',
  'stakeholderInterview',
  'survey',
  'socialListening',
  'sourceReview',
  'other',
])
const QUESTION_STATUSES = new Set(['idea', 'needsSource', 'readyToBrief', 'readyToMake', 'scheduled', 'shipped'])
const LANGUAGES = new Set(['en', 'es', 'other'])
const COLLABORATOR_RELATIONSHIPS = new Set([
  'universityIntern',
  'advisor',
  'partnerOrg',
  'guest',
  'community',
  'clientPartner',
  'other',
])
const CONTRIBUTION_TYPES = new Set([
  'subjectExpertise',
  'research',
  'writing',
  'visualDesign',
  'dataAnalysis',
  'distribution',
  'review',
  'other',
])
const COLLABORATOR_STATUSES = new Set(['idea', 'invited', 'confirmed', 'inProgress', 'complete', 'paused'])

export type MarketerBriefResearchQuestion = {
  _key?: string
  _type?: 'researchQuestion'
  question?: string
  whyItMatters?: string
  method?: string
  decisionNeeded?: string
  status?: string
}

export type MarketerBriefCollaborator = {
  _key?: string
  _type?: 'researchCollaborator'
  name?: string
  organization?: string
  relationshipType?: string
  topicArea?: string
  availabilityStart?: string
  availabilityEnd?: string
  contributionType?: string
  capacity?: string
  expectedContribution?: string
  status?: string
  notes?: string
}

export type MarketerBriefProject = {
  _id?: string
  _rev?: string
  title?: string
  status?: string
  researchType?: string
  brief?: string
  audience?: string
  goals?: string[]
  campaignObjective?: string
  positioning?: string
  canonicalUrl?: string
  seedKeywords?: string[]
  seedUrls?: string[]
  targetGeography?: string
  language?: string
  methods?: string[]
  researchQuestions?: MarketerBriefResearchQuestion[]
  collaborators?: MarketerBriefCollaborator[]
  internalNotes?: string
}

export type MarketerBriefProposal = {
  summary?: string
  rationale?: string[]
  siteReferences?: Array<{ title?: string; url?: string; note?: string }>
  researchProject?: MarketerBriefProject
}

export type MarketerBriefAssistResponse = {
  suggestion?: MarketerBriefProposal
  error?: string
  usedAi?: boolean
  aiError?: string | null
  context?: {
    features?: number
    caseStudies?: number
    campaigns?: number
    references?: number
  }
}

export type MarketerBriefReuseMatch = {
  project: MarketerBriefProject & { _id: string }
  reason: string
}

export type MarketerBriefHandoffResult = {
  operationId: string
  projectId?: string
  title: string
  reused: boolean
  createdResults: number
  scanWarning?: string
}

/** Build the reviewed, private queue record; the rough note is never an input. */
export function buildMarketerBriefOperationInput(
  proposal: MarketerBriefProposal,
  reuseMatch: MarketerBriefReuseMatch | null,
): MarketingOperationInput {
  const normalized = normalizeMarketerBriefProject(proposal)
  const identity = reuseMatch?.project._id || comparableUrl(normalized.canonicalUrl) || comparableTitle(normalized.title)
  const sourceKey = reuseMatch?.project._id
    ? `work-update:research:${reuseMatch.project._id}`
    : `work-update:${marketingOperationFingerprint(identity || normalized.title)}`
  const linkedRecords = reuseMatch?.project._id
    ? [{
        _key: `linked-research-${marketingOperationFingerprint(reuseMatch.project._id)}`,
        dataset: 'production' as const,
        type: 'marketingResearchProject',
        id: reuseMatch.project._id,
        title: text(reuseMatch.project.title, 180) || normalized.title,
        relationship: 'related existing research',
      }]
    : []

  return normalizeMarketingOperationInput({
    title: normalized.title.replace(/ research project$/i, ''),
    summary: normalized.brief,
    whyNow: text(proposal.summary, 640) || normalized.brief,
    nextAction: 'Check existing GoInvo work, then surface only the decision a person needs to make.',
    status: 'queued',
    priority: 'normal',
    kind: 'update',
    origin: 'workUpdate',
    autonomy: 'safeInternal',
    targetView: reuseMatch ? 'research' : 'dashboard',
    sourceKey,
    sourceFingerprint: marketingOperationFingerprint({
      title: normalized.title,
      brief: normalized.brief,
      audience: normalized.audience,
      goals: normalized.goals,
      questions: normalized.researchQuestions.map((question) => question.question),
      canonicalUrl: normalized.canonicalUrl,
      linkedProjectId: reuseMatch?.project._id || '',
    }),
    linkedRecords,
  })
}

function text(value: unknown, maxLength = 640) {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function multilineText(value: unknown, maxLength = 1600) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

function stringList(value: unknown, maxItems = 12, maxLength = 240) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .map((item) => text(item, maxLength))
    .filter((item) => {
      const key = item.toLowerCase()
      if (!item || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, maxItems)
}

function safeUrl(value: unknown) {
  const candidate = text(value, 500)
  if (!candidate) return ''
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    if (parsed.username || parsed.password) return ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return ''
  }
}

function urlList(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .map(safeUrl)
    .filter((item) => {
      const key = comparableUrl(item)
      if (!item || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, maxItems)
}

function stableKey(prefix: string, value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return `${prefix}-${slug || index + 1}-${index + 1}`
}

function safeArrayKey(value: unknown, prefix: string, identity: string, index: number) {
  const candidate = text(value, 96)
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  return candidate || stableKey(prefix, identity, index)
}

function uniqueArrayKey(preferredKey: string, keys: Set<string>, index: number) {
  let candidate = preferredKey
  let suffix = index + 1
  while (keys.has(candidate)) {
    const suffixText = `-${suffix}`
    candidate = `${preferredKey.slice(0, 96 - suffixText.length)}${suffixText}`
    suffix += 1
  }
  keys.add(candidate)
  return candidate
}

function safeDate(value: unknown) {
  const candidate = text(value, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return ''
  const date = new Date(`${candidate}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== candidate ? '' : candidate
}

function normalizeQuestions(value: unknown) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const keys = new Set<string>()
  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as MarketerBriefResearchQuestion) : {}
      const question = text(record.question, 300)
      const key = question.toLowerCase()
      if (!question || seen.has(key)) return null
      seen.add(key)
      const preferredKey = safeArrayKey(record._key, 'work-update-question', question, index)
      const arrayKey = uniqueArrayKey(preferredKey, keys, index)
      return {
        _key: arrayKey,
        _type: 'researchQuestion' as const,
        question,
        whyItMatters: multilineText(record.whyItMatters, 600),
        method: RESEARCH_METHODS.has(record.method || '') ? record.method : 'deskResearch',
        decisionNeeded: multilineText(record.decisionNeeded, 600),
        status: QUESTION_STATUSES.has(record.status || '') ? record.status : 'idea',
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 10)
}

function normalizeCollaborators(value: unknown) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const keys = new Set<string>()
  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as MarketerBriefCollaborator) : {}
      const name = text(record.name, 120)
      const organization = text(record.organization, 160)
      const topicArea = text(record.topicArea, 180)
      const identity = `${name}|${organization}|${topicArea}`.toLowerCase()
      if ((!name && !organization) || seen.has(identity)) return null
      seen.add(identity)
      const preferredKey = safeArrayKey(record._key, 'work-update-collaborator', identity, index)
      const arrayKey = uniqueArrayKey(preferredKey, keys, index)
      return {
        _key: arrayKey,
        _type: 'researchCollaborator' as const,
        name,
        organization,
        relationshipType: COLLABORATOR_RELATIONSHIPS.has(record.relationshipType || '') ? record.relationshipType : '',
        topicArea,
        availabilityStart: safeDate(record.availabilityStart),
        availabilityEnd: safeDate(record.availabilityEnd),
        contributionType: CONTRIBUTION_TYPES.has(record.contributionType || '') ? record.contributionType : '',
        capacity: text(record.capacity, 160),
        expectedContribution: multilineText(record.expectedContribution, 500),
        status: COLLABORATOR_STATUSES.has(record.status || '') ? record.status : 'idea',
        notes: multilineText(record.notes, 500),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 10)
}

function comparableTitle(value: unknown) {
  return text(value, 180)
    .toLowerCase()
    .replace(/\bresearch project\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function comparableUrl(value: unknown) {
  const normalized = safeUrl(value)
  if (!normalized) return ''
  try {
    const parsed = new URL(normalized)
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/$/, '') || '/'}`
  } catch {
    return ''
  }
}

function mergeLists(left: unknown, right: unknown, maxItems = 16, maxLength = 300) {
  return stringList([...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])], maxItems, maxLength)
}

function mergeUrls(left: unknown, right: unknown, maxItems = 12) {
  return urlList([...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])], maxItems)
}

function mergeParagraphs(left: unknown, right: unknown) {
  const existing = multilineText(left, 1800)
  const incoming = multilineText(right, 1200)
  if (!existing) return incoming
  if (!incoming || existing.toLowerCase().includes(incoming.toLowerCase())) return existing
  return `${existing}\n\nNew work context: ${incoming}`.slice(0, 3000)
}

export function buildMarketerBriefAssistPayload(update: string) {
  const prompt = multilineText(update, MARKETER_BRIEF_MAX_LENGTH)
  return {
    kind: 'researchProject',
    draft: {
      title: '',
      status: 'draft',
      researchType: 'topic',
      intakeMode: 'coworkerUpdate',
      brief: 'Infer the smallest useful, research-first marketing handoff from this unstructured coworker update. Preserve facts, turn uncertainty into research questions, and reuse strong existing site or marketing context when available.',
    },
    prompt,
  }
}

export function normalizeMarketerBriefProject(proposal: MarketerBriefProposal) {
  const project = proposal.researchProject || {}
  const rawTitle = text(project.title, 120) || 'New work research project'
  const title = /research project$/i.test(rawTitle) ? rawTitle : `${rawTitle} research project`
  const canonicalUrl = safeUrl(project.canonicalUrl)
  const methods = mergeLists(['cmsScan'], project.methods, 8, 60).filter((method) => RESEARCH_METHODS.has(method))

  return {
    title,
    status: 'researching',
    researchType: RESEARCH_TYPES.has(project.researchType || '') ? project.researchType : 'topic',
    brief: multilineText(project.brief, 1400) || text(proposal.summary, 640) || 'Investigate this new work before creating downstream marketing records.',
    audience: multilineText(project.audience, 700),
    goals: stringList(project.goals, 8, 360),
    campaignObjective: CAMPAIGN_OBJECTIVES.has(project.campaignObjective || '') ? project.campaignObjective : 'awareness',
    positioning: multilineText(project.positioning, 900),
    canonicalUrl,
    seedKeywords: stringList(project.seedKeywords, 12, 120),
    seedUrls: mergeUrls(canonicalUrl ? [canonicalUrl] : [], project.seedUrls, 8),
    targetGeography: text(project.targetGeography, 20) || 'us',
    language: LANGUAGES.has(project.language || '') ? project.language : 'en',
    methods,
    researchQuestions: normalizeQuestions(project.researchQuestions),
    collaborators: normalizeCollaborators(project.collaborators),
  }
}

export function buildMarketerBriefResearchDocument(proposal: MarketerBriefProposal) {
  return {
    _type: 'marketingResearchProject',
    ...normalizeMarketerBriefProject(proposal),
    internalNotes: 'Created through Tell Marketing after a coworker reviewed the normalized brief. The raw coworker note was not saved. An internal CMS scan may run automatically; approve findings before creating downstream records.',
  }
}

export function findReusableMarketerBriefProject(
  existingProjects: MarketerBriefProject[],
  proposal: MarketerBriefProposal,
): MarketerBriefReuseMatch | null {
  const incoming = normalizeMarketerBriefProject(proposal)
  const incomingUrl = comparableUrl(incoming.canonicalUrl)
  const incomingSeedUrls = new Set(incoming.seedUrls.map(comparableUrl).filter(Boolean))
  const incomingTitle = comparableTitle(incoming.title)
  const candidates = existingProjects.filter(
    (project): project is MarketerBriefProject & { _id: string } =>
      Boolean(project._id) && !['archived', 'converted'].includes(project.status || ''),
  )

  let canonicalMatch: (MarketerBriefProject & { _id: string }) | null = null
  let canonicalMatches = 0
  let sourceMatch: (MarketerBriefProject & { _id: string }) | null = null
  let sourceMatches = 0
  let titleMatch: (MarketerBriefProject & { _id: string }) | null = null
  let titleMatches = 0

  for (const project of candidates) {
    if (incomingUrl && comparableUrl(project.canonicalUrl) === incomingUrl) {
      canonicalMatch = project
      canonicalMatches += 1
    }
    if (
      incomingSeedUrls.size > 0
      && (project.seedUrls || []).some((url) => incomingSeedUrls.has(comparableUrl(url)))
    ) {
      sourceMatch = project
      sourceMatches += 1
    }
    if (incomingTitle && comparableTitle(project.title) === incomingTitle) {
      titleMatch = project
      titleMatches += 1
    }
  }

  if (canonicalMatches === 1 && canonicalMatch) return { project: canonicalMatch, reason: 'same canonical destination' }
  if (sourceMatches === 1 && sourceMatch) return { project: sourceMatch, reason: 'same source URL' }
  if (titleMatches === 1 && titleMatch) return { project: titleMatch, reason: 'same project title' }

  return null
}

function mergeQuestions(existing: unknown, incoming: unknown) {
  const all = normalizeQuestions([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])])
  return all.map((question, index) => ({
    ...question,
    _key: question._key || stableKey('work-update-question', question.question, index),
  }))
}

function mergeCollaborators(existing: unknown, incoming: unknown) {
  return normalizeCollaborators([...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])])
}

export function buildMarketerBriefResearchPatch(
  existing: MarketerBriefProject,
  proposal: MarketerBriefProposal,
) {
  const incoming = normalizeMarketerBriefProject(proposal)
  return {
    status: existing.status === 'draft' || !existing.status ? 'researching' : existing.status,
    brief: mergeParagraphs(existing.brief, incoming.brief),
    audience: multilineText(existing.audience, 700) || incoming.audience,
    goals: mergeLists(existing.goals, incoming.goals, 12, 360),
    campaignObjective: CAMPAIGN_OBJECTIVES.has(existing.campaignObjective || '')
      ? existing.campaignObjective
      : incoming.campaignObjective,
    positioning: multilineText(existing.positioning, 900) || incoming.positioning,
    canonicalUrl: safeUrl(existing.canonicalUrl) || incoming.canonicalUrl,
    seedKeywords: mergeLists(existing.seedKeywords, incoming.seedKeywords, 16, 120),
    seedUrls: mergeUrls(existing.seedUrls, incoming.seedUrls, 12),
    targetGeography: text(existing.targetGeography, 20) || incoming.targetGeography,
    language: LANGUAGES.has(existing.language || '') ? existing.language : incoming.language,
    methods: mergeLists(existing.methods, incoming.methods, 10, 60).filter((method) => RESEARCH_METHODS.has(method)),
    researchQuestions: mergeQuestions(existing.researchQuestions, incoming.researchQuestions),
    collaborators: mergeCollaborators(existing.collaborators, incoming.collaborators),
    internalNotes: mergeParagraphs(
      existing.internalNotes,
      'Updated through Tell Marketing from a reviewed, normalized coworker update. The raw note was not saved; approve fresh findings before creating downstream records.',
    ),
  }
}
