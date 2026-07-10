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
export { getMarketingWriteClient } from './client'

// API authentication.
export { MarketingAuthError, assertMarketingApiKey, assertStudioOrApiKey } from './auth'

// Channel seeding (DEFAULT_CHANNELS + ensureMarketingChannel).
export { DEFAULT_CHANNELS, ensureMarketingChannel } from './seed'
export type {
  MarketingChannelDef,
  ChannelContentTypeDef,
  MarketingChannelDocument,
} from './seed'

// Clone / derive builders (link-from-post, proof-from-result).
export { buildLinkFromPost, buildProofPointFromResult } from './clone'
export type {
  CalendarItemForLink,
  ResearchResultForProof,
  ResearchProjectForProof,
  MarketingFieldBag,
} from './clone'

// Social auto-publishing: adapters, registry, content mapping, worker, scheduling.
export {
  getPublisher,
  getPublishers,
  connectionStatus,
  instagramPublisher,
  linkedInPublisher,
  DUE_ITEMS_QUERY,
  DUE_SINGLE_ITEM_QUERY,
  SINGLE_ITEM_QUERY,
  resolveSocialPlatform,
  buildCaption,
  buildMedia,
  buildPublishContent,
  buildClaimPatch,
  buildProcessingPatch,
  buildPublishedPatch,
  buildFailedPatch,
  runPublish,
  isQStashConfigured,
  notBeforeSeconds,
  buildCallbackUrl,
  buildFinalizeCallbackUrl,
  schedulePublish,
  scheduleFinalize,
  SOCIAL_PLATFORMS,
} from './publishers'
export type {
  PlatformConnection,
  PublishableItem,
  ItemPatch,
  RunPublishOptions,
  PublishResultEntry,
  PublishRunSummary,
  FinalizeSignal,
  SchedulePublishParams,
  ScheduleFinalizeParams,
  ScheduleResult,
  SocialPlatform,
  SocialPublisher,
  PublishContent,
  PublishMedia,
  PublishSuccess,
  PublishOutcome,
} from './publishers'

// Outreach: contact intake, per-contact research, work-evidence extraction,
// offer catalog + on-the-fly offer drafts, call plan + follow-ups.
export {
  DEFAULT_OFFERS,
  offerDocId,
  evidenceDocId,
  buildIntakePrompts,
  normalizeParsedContacts,
  contactDedupeKey,
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
} from './outreach'
export type {
  OutreachOfferDef,
  ParsedIntakeContact,
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

// Linked-draft cascade (create-linked-drafts from a research project).
export { createResearchProjectRecords } from './cascades'
export type {
  CascadeResearchProject,
  CascadeResearchResult,
  CascadeRefSummary,
  CreateResearchProjectRecordsOptions,
  CreatedResearchProjectRecords,
} from './cascades'
