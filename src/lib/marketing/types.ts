/**
 * The set of Sanity document types the marketing CMS is allowed to create and
 * patch through the shared core. This list is derived from the marketingXxx
 * document types registered in src/sanity/schemas/index.ts.
 *
 * Keeping this as an explicit allowlist is the foundation of the fail-closed
 * design: the CRUD layer rejects any type that is not a managed marketing type,
 * so the API cannot be used to write arbitrary documents.
 */
export const MANAGED_MARKETING_TYPES = [
  'marketingCampaign',
  'marketingChannel',
  'marketingCalendarItem',
  'marketingFunnel',
  'marketingAnalyticsSource',
  'marketingLinkItem',
  'marketingAudienceProfile',
  'marketingMessagePillar',
  'marketingProofPoint',
  'marketingCta',
  'marketingTrackingRule',
  'marketingQualityGate',
  'marketingExperiment',
  'marketingPerformanceSignal',
  'marketingIdea',
  'marketingResearchProject',
  'marketingResearchResult',
  'marketingResearchRun',
  'marketingResearchPlan',
  'marketingTemplate',
] as const

/** A document type the marketing CMS manages. */
export type ManagedMarketingType = (typeof MANAGED_MARKETING_TYPES)[number]

const managedMarketingTypeSet: ReadonlySet<string> = new Set(MANAGED_MARKETING_TYPES)

/** Type guard: true when `t` is one of the managed marketing document types. */
export function isManagedMarketingType(t: string): t is ManagedMarketingType {
  return managedMarketingTypeSet.has(t)
}
