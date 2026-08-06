import type { ManagedMarketingType } from './types'

/**
 * Closed top-level write surface mirrored from each managed Sanity schema's
 * `fields`. Update this record alongside schema changes; routes never accept
 * system fields or free-form Sanity paths.
 */
export const MARKETING_FIELDS: Record<ManagedMarketingType, readonly string[]> = {
  marketingCampaign: ['title', 'slug', 'status', 'owner', 'primaryGoal', 'campaignObjective', 'audience', 'audienceProfiles', 'topicCluster', 'searchIntent', 'targetQueries', 'positioning', 'messagePillars', 'proofPoints', 'ctas', 'canonicalUrl', 'targetSites', 'channels', 'channelRefs', 'startDate', 'endDate', 'funnels', 'successMetrics', 'primaryKpi', 'utmCampaign', 'trackingRule', 'analyticsSources', 'qualityGates', 'experiments', 'performanceSignals', 'researchProject', 'researchResults', 'notes'],
  marketingChannel: ['title', 'key', 'status', 'platform', 'description', 'defaultFunnelStage', 'analyticsSources', 'contentTypes', 'recommendedPostingTimes', 'postingTimesResearch'],
  marketingCalendarItem: ['title', 'status', 'publishAt', 'contentType', 'channel', 'channelRef', 'owner', 'campaign', 'funnel', 'funnelStage', 'topicCluster', 'searchIntent', 'targetQueries', 'targetSites', 'researchProject', 'researchResults', 'audienceProfiles', 'messagePillars', 'proofPoints', 'ctas', 'canonicalContent', 'workingUrl', 'publishedUrl', 'linkItems', 'brief', 'contentDraft', 'draftFrames', 'socialImage', 'socialVideo', 'draftAltText', 'draftHashtags', 'contentProductionNotes', 'callToAction', 'utmCampaign', 'trackingRule', 'analyticsSource', 'qualityGates', 'experiments', 'performanceSignals', 'performanceNotes', 'autoPublish', 'publishState', 'externalPostId', 'externalContainerId', 'publishAttempts', 'rendomatVideoId', 'rendomatIngestState', 'rendomatIngestClaim', 'rendomatIngestClaimedAt', 'rendomatScheduledAt', 'rendomatScheduleError', 'publishAttemptedAt', 'publishError', 'publishLockAt'],
  marketingFunnel: ['title', 'status', 'audience', 'audienceProfiles', 'conversionGoal', 'targetSites', 'messagePillars', 'proofPoints', 'ctas', 'stages', 'analyticsSources', 'qualityGates', 'experiments', 'researchProject', 'researchResults', 'notes'],
  marketingAnalyticsSource: ['title', 'provider', 'status', 'propertyId', 'measurementId', 'containerId', 'vercelProject', 'vercelProjectId', 'vercelTeamSlug', 'productionUrl', 'lastSyncedAt', 'dashboardUrl', 'reportingCadence', 'targetSites', 'keyMetrics', 'implementationNotes'],
  marketingLinkItem: ['title', 'url', 'description', 'type', 'image', 'status', 'featured', 'order', 'publishAt', 'expiresAt', 'sourceChannel', 'campaign', 'calendarItem', 'calendarItems', 'researchProject', 'researchResults', 'audienceProfiles', 'messagePillars', 'proofPoints', 'cta', 'trackingRule', 'qualityGates', 'experiments', 'performanceSignals'],
  marketingAudienceProfile: ['title', 'priority', 'audience', 'needs', 'pains', 'misconceptions', 'trustTriggers', 'desiredActions', 'objections', 'notes'],
  marketingMessagePillar: ['title', 'coreClaim', 'supportingClaims', 'approvedPhrases', 'phrasesToAvoid', 'topicCluster', 'audiences', 'proofPoints', 'notes'],
  marketingProofPoint: ['title', 'claim', 'proofType', 'sourceTitle', 'sourceUrl', 'confidence', 'researchResults', 'audiences', 'topicCluster', 'usageNotes'],
  marketingCta: ['title', 'label', 'funnelStage', 'destination', 'successSignal', 'audiences', 'priority', 'notes'],
  marketingTrackingRule: ['title', 'status', 'utmSourceRule', 'utmMediumRule', 'utmCampaignPattern', 'utmContentPattern', 'allowedSources', 'allowedMediums', 'examples', 'notes'],
  marketingQualityGate: ['title', 'status', 'whenToUse', 'checks', 'notes'],
  marketingExperiment: ['title', 'status', 'measurementStart', 'hypothesis', 'expectedSignal', 'targetType', 'targetPath', 'targetFeature', 'flagKey', 'variants', 'primaryMetric', 'trackedMetrics', 'successTrackers', 'analyticsSource', 'qaNotes', 'rolloutStart', 'rolloutEnd', 'vercelDashboardUrl', 'campaign', 'calendarItem', 'performanceSignals', 'result', 'decision', 'decisionDate', 'notes'],
  marketingPerformanceSignal: ['title', 'provider', 'status', 'signalType', 'sourceLabel', 'query', 'pageUrl', 'experiment', 'campaign', 'channel', 'linkItem', 'calendarItem', 'researchProject', 'metricDate', 'periodStart', 'periodEnd', 'metrics', 'variantEngagement', 'sectionEngagement', 'interpretation', 'recommendation', 'rawImport'],
  marketingIdea: ['title', 'summary', 'category', 'status', 'priority', 'effort', 'nextAction', 'relatedUrl', 'source'],
  marketingResearchProject: ['title', 'status', 'researchType', 'owner', 'brief', 'audience', 'audienceProfiles', 'goals', 'campaignObjective', 'positioning', 'messagePillars', 'proofPoints', 'canonicalUrl', 'seedKeywords', 'seedUrls', 'targetGeography', 'language', 'methods', 'researchQuestions', 'collaborators', 'performanceSignals', 'selectedResults', 'approvedResults', 'generatedCampaigns', 'generatedFunnels', 'generatedCalendarItems', 'generatedLinkItems', 'legacyPlan', 'internalNotes'],
  marketingResearchResult: ['title', 'resultType', 'status', 'project', 'run', 'selectedForSynthesis', 'proofPoints', 'performanceSignals', 'approvedAt', 'priority', 'provider', 'sourceMethod', 'scoreSource', 'database', 'fetchedAt', 'rawProviderMetadata', 'keyword', 'searchIntent', 'volume', 'difficulty', 'cpc', 'competition', 'resultsCount', 'canonicalUrl', 'contentGap', 'sourceTitle', 'sourceUrl', 'claim', 'evidenceType', 'confidence', 'implication', 'competitorName', 'competitorUrl', 'collaboratorName', 'organization', 'relationshipType', 'topicArea', 'availabilityStart', 'availabilityEnd', 'contributionType', 'capacity', 'expectedContribution', 'collaborationStatus'],
  marketingResearchRun: ['title', 'project', 'provider', 'status', 'startedAt', 'completedAt', 'methods', 'seedKeywords', 'seedUrls', 'database', 'rawInput', 'requestFingerprint', 'createdResults', 'warnings', 'errors', 'rawOutputSummary'],
  marketingResearchPlan: ['title', 'status', 'owner', 'summary', 'audience', 'positioning', 'campaignObjective', 'canonicalUrl', 'releaseCadence', 'researchQuestions', 'evidenceNotes', 'assumptions', 'contentPillars', 'seoTargets', 'channels', 'collaborations', 'releaseWindows', 'contentOpportunities', 'measurementGoals', 'strategyAdjustments', 'generatedCampaigns', 'generatedFunnels', 'generatedCalendarItems', 'generatedLinkItems', 'generatedAnalyticsSources', 'internalNotes'],
  marketingTemplate: ['title', 'kind', 'status', 'description', 'whenToUse', 'order', 'campaignObjective', 'primaryGoal', 'primaryKpi', 'audience', 'audienceProfiles', 'topicCluster', 'searchIntent', 'targetQueries', 'positioning', 'messagePillars', 'proofPoints', 'ctas', 'trackingRule', 'qualityGates', 'channels', 'successMetrics', 'designerGuidance', 'notes', 'conversionGoal', 'stages'],
  marketingContact: ['name', 'organization', 'role', 'segment', 'owner', 'brandVoiceKey', 'warmth', 'status', 'email', 'phone', 'linkedinUrl', 'howWeKnow', 'sourceNotes', 'identityHistory', 'researchedAt', 'researchReviewedAt', 'personVerified', 'identityConfidence', 'researchSummary', 'researchSuggestedSegment', 'opportunities', 'feasibilityScore', 'feasibilityReasoning', 'suggestedOfferKey', 'relevantEvidence', 'proposedOffers', 'suggestedOpener', 'callBrief', 'researchModel', 'researchBrandVoiceKey', 'researchBrandVoiceName', 'researchSources', 'channelOverrides', 'lastContactedAt', 'followUpAt', 'estimatedValue', 'closedValue', 'currency', 'attributionChannel', 'attributedOfferKey', 'attributedOfferTitle', 'attributedEvidenceIds', 'closedAt', 'closeReason', 'interactions', 'nextStep', 'outcomeNotes', 'intelGathered'],
  marketingOffer: ['title', 'key', 'status', 'oneLiner', 'description', 'priceBand', 'idealBuyer', 'proofPoints', 'order'],
  marketingProduct: ['title', 'slug', 'sourceVisualization', 'status', 'kind', 'description', 'image', 'featured', 'displayOrder', 'sku', 'trackInventory', 'inventoryQuantity', 'lowStockThreshold', 'allowBackorder', 'price', 'currency', 'checkoutUrl', 'stripeProductId', 'stripePriceId', 'stripePriceUnitAmount', 'stripePriceCurrency', 'stripeSyncedAt', 'campaign', 'audiences', 'notes'],
  marketingOrder: ['orderNumber', 'status', 'placedAt', 'items', 'subtotal', 'shipping', 'donation', 'tax', 'total', 'currency', 'contact', 'customerName', 'customerEmail', 'shippingAddress', 'processor', 'processorPaymentId', 'paymentUrl', 'campaign', 'utmSource', 'utmMedium', 'utmCampaign', 'notes', 'processorChargeId', 'settlementState', 'amountCaptured', 'amountRefunded', 'amountDisputeHeld', 'amountLostToDispute', 'netCollected', 'ledgerSyncedAt', 'ledgerSyncError'],
  marketingDispute: ['disputeId', 'status', 'stage', 'reason', 'amount', 'currency', 'chargeId', 'paymentIntentId', 'order', 'orderNumber', 'customerEmail', 'customerName', 'openedAt', 'dueBy', 'canRespond', 'submissionCount', 'evidenceSubmittedAt', 'evidenceSubmittedBy', 'notes', 'slack', 'syncedAt', 'livemode'],
  marketingShopSettings: ['storeName', 'headline', 'description', 'storefrontEnabled', 'supportEmail', 'provider', 'connectionStatus', 'accountLabel', 'dashboardUrl', 'webhookStatus', 'syncContacts', 'contactSegment', 'contactSourceNote'],
  marketingWorkEvidence: ['title', 'sourceId', 'sourceType', 'slug', 'client', 'url', 'status', 'summary', 'segments', 'techniques', 'skills', 'frameworks', 'technicalImplementation', 'domainExpertise', 'businessOutcomes', 'highlights', 'manuallyEdited', 'editedAt', 'editedBy', 'extractedAt', 'extractionModel'],
}

const fieldSets: Record<ManagedMarketingType, ReadonlySet<string>> = Object.create(null)
for (const type of Object.keys(MARKETING_FIELDS) as ManagedMarketingType[]) {
  fieldSets[type] = new Set(MARKETING_FIELDS[type])
}

export function assertAllowedMarketingFields(
  type: ManagedMarketingType,
  fields: Record<string, unknown>,
): void {
  const unknown = Object.keys(fields).filter((field) => !fieldSets[type].has(field))
  if (unknown.length) throw new Error(`Unknown field${unknown.length === 1 ? '' : 's'} for ${type}: ${unknown.join(', ')}`)
}

export function assertAllowedMarketingUnsetPaths(
  type: ManagedMarketingType,
  paths: readonly string[],
): void {
  // Only exact top-level schema fields are accepted. This deliberately excludes
  // Sanity path expressions, array selectors, and system fields.
  const unknown = paths.filter((path) => !fieldSets[type].has(path))
  if (unknown.length) throw new Error(`Unknown unset path${unknown.length === 1 ? '' : 's'} for ${type}: ${unknown.join(', ')}`)
}
