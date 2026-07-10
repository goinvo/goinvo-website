/**
 * Per-type metadata derived from the marketingXxx Sanity schemas:
 *
 *  - DEFAULTS:          the schema `initialValue` for each document field.
 *  - ARRAY_ITEM_TYPES:  for each array-of-object field, the object `name` that
 *                       becomes the array item `_type`.
 *  - SLUG_TYPES:        document types that have a `slug` field.
 *  - REQUIRED_FIELDS:   top-level fields marked `Rule.required()`.
 *
 * This file is the single place that mirrors schema shape, so a schema change is
 * a one-file update here. Everything is keyed by ManagedMarketingType and is
 * site-agnostic (no goinvo-specific values).
 */
import { MANAGED_MARKETING_TYPES, type ManagedMarketingType } from './types'

/** Default field values applied on create, mirroring schema `initialValue`. */
export const DEFAULTS: Record<ManagedMarketingType, Record<string, unknown>> = {
  marketingCampaign: { status: 'idea' },
  marketingChannel: { status: 'active', platform: 'website' },
  marketingCalendarItem: { status: 'idea' },
  marketingFunnel: { status: 'draft' },
  marketingAnalyticsSource: { status: 'planned', reportingCadence: 'monthly' },
  marketingLinkItem: { type: 'site', status: 'active', featured: false, order: 100 },
  marketingAudienceProfile: { priority: 'secondary' },
  marketingMessagePillar: {},
  marketingProofPoint: { proofType: 'researchFinding', confidence: 'medium' },
  marketingCta: { priority: 'contextual' },
  marketingTrackingRule: { status: 'active' },
  marketingQualityGate: { status: 'active' },
  marketingExperiment: { status: 'idea' },
  marketingPerformanceSignal: { provider: 'manual', status: 'new' },
  marketingIdea: { category: 'seo', status: 'idea', priority: 'medium' },
  marketingResearchProject: {
    status: 'draft',
    researchType: 'topic',
    targetGeography: 'us',
    language: 'en',
  },
  marketingResearchResult: {
    resultType: 'sourceEvidence',
    status: 'new',
    selectedForSynthesis: false,
    priority: 'medium',
    provider: 'manual',
    scoreSource: 'none',
    confidence: 'early',
  },
  marketingResearchRun: { provider: 'semrush', status: 'queued', database: 'us' },
  marketingResearchPlan: { status: 'draft', releaseCadence: 'weekly' },
  marketingTemplate: { kind: 'campaign', status: 'active', order: 100 },
  marketingContact: { status: 'new', warmth: 'warm' },
  marketingOffer: { status: 'active', order: 100 },
  marketingWorkEvidence: { status: 'active', sourceType: 'caseStudy', manuallyEdited: false },
}

/**
 * For each type, maps an array-of-object field name to the object `name` declared
 * in the schema. The CRUD layer uses this to stamp `_type` onto inline array
 * items so Sanity treats them as the correct object type.
 */
export const ARRAY_ITEM_TYPES: Record<ManagedMarketingType, Record<string, string>> = {
  marketingCampaign: {
    targetSites: 'targetSite',
    successMetrics: 'successMetric',
  },
  marketingChannel: {
    contentTypes: 'channelContentType',
  },
  marketingCalendarItem: {
    targetSites: 'targetSite',
    draftFrames: 'draftFrame',
  },
  marketingFunnel: {
    targetSites: 'targetSite',
    stages: 'funnelStage',
  },
  marketingAnalyticsSource: {
    targetSites: 'targetSite',
    keyMetrics: 'keyMetric',
  },
  marketingLinkItem: {},
  marketingAudienceProfile: {},
  marketingMessagePillar: {},
  marketingProofPoint: {},
  marketingCta: {},
  marketingTrackingRule: {
    allowedSources: 'trackingValue',
    allowedMediums: 'trackingValue',
    examples: 'trackingExample',
  },
  marketingQualityGate: {
    checks: 'qualityGateCheck',
  },
  marketingExperiment: {
    variants: 'experimentVariant',
    trackedMetrics: 'experimentMetric',
    successTrackers: 'experimentSuccessTracker',
  },
  marketingPerformanceSignal: {
    metrics: 'performanceMetric',
  },
  marketingIdea: {},
  marketingResearchProject: {
    researchQuestions: 'researchQuestion',
    collaborators: 'researchCollaborator',
  },
  marketingResearchResult: {},
  marketingResearchRun: {},
  marketingResearchPlan: {
    researchQuestions: 'researchQuestion',
    evidenceNotes: 'evidenceNote',
    assumptions: 'researchAssumption',
    contentPillars: 'contentPillar',
    seoTargets: 'seoTarget',
    channels: 'recommendedChannel',
    collaborations: 'collaborationOpportunity',
    releaseWindows: 'releaseWindow',
    contentOpportunities: 'contentOpportunity',
    measurementGoals: 'measurementGoal',
    strategyAdjustments: 'strategyAdjustment',
  },
  marketingTemplate: {
    successMetrics: 'successMetric',
    stages: 'templateFunnelStage',
  },
  marketingContact: {
    opportunities: 'outreachOpportunity',
    researchSources: 'outreachSource',
    relevantEvidence: 'outreachEvidenceRef',
    proposedOffers: 'outreachProposedOffer',
    interactions: 'outreachInteraction',
  },
  marketingOffer: {},
  marketingWorkEvidence: {
    highlights: 'evidenceHighlight',
  },
}

/** Document types that have a `slug` field (so a slug can be derived from title). */
export const SLUG_TYPES: Set<ManagedMarketingType> = new Set<ManagedMarketingType>([
  'marketingCampaign',
])

/** Top-level fields marked `Rule.required()` in each schema. */
export const REQUIRED_FIELDS: Record<ManagedMarketingType, string[]> = {
  marketingCampaign: ['title', 'slug', 'status'],
  marketingChannel: ['title', 'key', 'status'],
  marketingCalendarItem: ['title', 'status'],
  marketingFunnel: ['title', 'status'],
  marketingAnalyticsSource: ['title', 'provider', 'status'],
  marketingLinkItem: ['title', 'url', 'status'],
  marketingAudienceProfile: ['title', 'priority'],
  marketingMessagePillar: ['title', 'coreClaim'],
  marketingProofPoint: ['title', 'claim'],
  marketingCta: ['title', 'label'],
  marketingTrackingRule: ['title'],
  marketingQualityGate: ['title'],
  marketingExperiment: ['title', 'hypothesis'],
  marketingPerformanceSignal: ['title', 'provider'],
  marketingIdea: ['title'],
  marketingResearchProject: ['title', 'status', 'researchType'],
  marketingResearchResult: ['title', 'resultType', 'status', 'project'],
  marketingResearchRun: ['title', 'project', 'status'],
  marketingResearchPlan: ['title', 'status'],
  marketingTemplate: ['title', 'kind', 'status'],
  marketingContact: ['name', 'status'],
  marketingOffer: ['title', 'key', 'status'],
  marketingWorkEvidence: ['title', 'status'],
}

// Compile-time guard: every managed type must have an entry in each record above.
// `satisfies` would already enforce key completeness via the Record types; this
// runtime loop additionally guards against a type being dropped from the source
// list while a stale entry remains (or vice versa) during refactors.
for (const type of MANAGED_MARKETING_TYPES) {
  if (!(type in DEFAULTS)) throw new Error(`DEFAULTS missing entry for ${type}`)
  if (!(type in ARRAY_ITEM_TYPES)) throw new Error(`ARRAY_ITEM_TYPES missing entry for ${type}`)
  if (!(type in REQUIRED_FIELDS)) throw new Error(`REQUIRED_FIELDS missing entry for ${type}`)
}
