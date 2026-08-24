/**
 * Public API for the portable marketing CMS shared core.
 *
 * Import from `@/lib/marketing` (or the package root once extracted) rather than
 * the individual modules so the surface stays stable. This barrel intentionally
 * re-exports only the marketing-CMS core; the SEO audit / drain utilities that
 * also live in this folder are imported directly where needed.
 */

// Derivation helpers (ported verbatim + small additions).
export {
  slugify,
  optionalSlug,
  stringListFromText,
  randomKey,
  refsFromIds,
  referenceFromId,
  withArrayKeys,
  uniqueById,
} from './derive'
export type { SanityReference, KeyedItem } from './derive'

// Pure date utilities (ported verbatim).
export {
  startOfMonth,
  addMonths,
  addDays,
  monthLabel,
  toDateInputValue,
  dateInputToIso,
  toDateTimeInputValue,
  dateTimeInputToIso,
} from './dates'

// Pure free-text inference helpers (ported verbatim).
export { inferResearchProjectType, inferTopicCluster, inferTargetQueries } from './infer'

// Managed type registry.
export { MANAGED_MARKETING_TYPES, isManagedMarketingType } from './types'
export type { ManagedMarketingType } from './types'

// Per-type schema-derived metadata.
export { DEFAULTS, ARRAY_ITEM_TYPES, SLUG_TYPES, REQUIRED_FIELDS } from './defaults'

// CRUD payload builders + validation + cascade.
export {
  MarketingValidationError,
  buildCreatePayload,
  buildPatchPayload,
  channelDeleteCascade,
} from './crud'
export type {
  MarketingFields,
  MarketingCreatePayload,
  BuildPayloadOptions,
  SanitySlug,
} from './crud'

// Write client.
export { getMarketingWriteClient,
  getMarketingWriteClientFor } from './client'

// API authentication.
export { MarketingAuthError, assertMarketingApiKey, assertStudioOrApiKey, assertStudioWriterOrApiKey } from './auth'

// Channel seeding (DEFAULT_CHANNELS + ensureMarketingChannel).
export { DEFAULT_CHANNELS, ensureMarketingChannel } from './seed'
export type {
  MarketingChannelDef,
  ChannelContentTypeDef,
  MarketingChannelDocument,
} from './seed'

// Clone / derive builders (link-from-post, proof-from-result).
export { buildLinkFromPost, buildProofPointFromResult, marketingCloneDocumentId } from './clone'
export type {
  CalendarItemForLink,
  ResearchResultForProof,
  ResearchProjectForProof,
  MarketingFieldBag,
} from './clone'

// Social auto-publishing is intentionally not re-exported here. This barrel is
// consumed by the browser-rendered Sanity Studio, while the publisher registry
// performs server-only DNS/network validation. Server routes import
// `@/lib/marketing/publishers` directly so Node modules never enter the client
// dependency graph.

// Outreach: contact intake, per-contact research, work-evidence extraction,
// offer catalog + on-the-fly offer drafts, call plan + follow-ups.
export {
  DEFAULT_OFFERS,
  offerDocId,
  evidenceDocId,
  buildIntakePrompts,
  normalizeParsedContacts,
  contactDedupeKey,
  contactIdentityKeys,
  hasPricedOffer,
  normalizeOutreachUrl,
  buildContactCreateDoc,
  buildResearchPrompts,
  normalizeResearch,
  buildResearchPatch,
  buildInteractionEntry,
  buildEvidenceExtractionPrompts,
  normalizeEvidence,
  buildEvidenceDoc,
  compactEvidenceIndex,
  rankCallPlan,
  dueFollowUps,
  buildWarmStartSuggestions,
  appendIntakeDraftEntries,
  mergeWarmStartSuggestionsIntoIntake,
} from './outreach'
export type {
  OutreachOfferDef,
  ParsedIntakeContact,
  WarmStartSuggestion,
  OutreachOpportunity,
  OutreachSource,
  ContactResearch,
  OutreachContact,
  ResearchPatchOptions,
  RelevantEvidence,
  ProposedOffer,
  WorkEvidence,
  EvidenceSource,
  EvidenceIndexItem,
} from './outreach'

// Deterministic outreach queue, workflow progress, and channel advice.
export {
  OUTREACH_PROGRESS_CHANNELS,
  buildOutreachProgress,
  isUsableOutreachEmail,
  isUsableOutreachPhone,
} from './outreachProgress'
export type {
  OutreachProgressChannel,
  OutreachProgressInteraction,
  OutreachProgressContact,
  OutreachProgressUrgency,
  OutreachDueState,
  OutreachProgressAction,
  OutreachProgressRepairTarget,
  OutreachChannelAvailability,
  OutreachChannelRecommendation,
  OutreachProgressRow,
  OutreachProgressSummary,
  BuildOutreachProgressOptions,
} from './outreachProgress'

// Reusable, publish-safe voice profiles for outward-facing marketing copy.
export {
  BRAND_VOICE_SYSTEM_POLICY,
  brandVoicePromptContext,
  brandVoiceResponseContext,
  normalizeMarketingBrandVoice,
  normalizeMarketingBrandVoices,
  prepareMarketingBrandVoices,
  resolveBrandVoiceFromProfiles,
  resolveMarketingBrandVoice,
  validateMarketingBrandVoices,
} from './brandVoice'
export type { MarketingBrandVoice, ResolvedMarketingBrandVoice } from './brandVoice'

// Financial posture — runway bins that pick the marketing strategy (set by
// humans in Settings, read by the plan panel + the assist/strategist AI).
export {
  FINANCIAL_POSTURES,
  DEFAULT_FINANCIAL_POSTURE_ID,
  FINANCIAL_POSTURE_DOC_ID,
  FINANCIAL_POSTURE_DOC_TYPE,
  FINANCIAL_POSTURE_STALE_DAYS,
  isFinancialPostureId,
  getFinancialPosture,
  financialPostureAgeDays,
  isFinancialPostureStale,
  financialPostureAiContext,
} from './financialPosture'
export type { FinancialPosture, FinancialPostureId } from './financialPosture'

// Linked-draft cascade (create-linked-drafts from a research project).
export { createResearchProjectRecords } from './cascades'
export type {
  CascadeResearchProject,
  CascadeResearchResult,
  CascadeRefSummary,
  CreateResearchProjectRecordsOptions,
  CreatedResearchProjectRecords,
} from './cascades'
