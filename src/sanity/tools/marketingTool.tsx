import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { definePlugin, type Tool, useClient } from 'sanity'
import {
  BellIcon,
  CalendarIcon,
  ChevronLeftIcon,
  CloseIcon,
  DashboardIcon,
  EllipsisHorizontalIcon,
  LaunchIcon,
  LinkIcon,
  MasterDetailIcon,
  RefreshIcon,
  SearchIcon,
  TagIcon,
  TargetIcon,
  TrendUpwardIcon,
} from '@sanity/icons'
import { analyticsProviderOptions, analyticsStatusOptions } from '../schemas/marketingAnalyticsSource'
import { calendarStatusOptions, contentTypeOptions } from '../schemas/marketingCalendarItem'
import { campaignObjectiveOptions, campaignStatusOptions, searchIntentOptions } from '../schemas/marketingCampaign'
import { channelPlatformOptions, channelStatusOptions } from '../schemas/marketingChannel'
import { funnelStageOptions, funnelStatusOptions } from '../schemas/marketingFunnel'
import { linkItemStatusOptions, linkItemTypeOptions } from '../schemas/marketingLinkItem'
import {
  collaborationRelationshipOptions,
  collaborationStatusOptions,
  contentFormatOptions,
  contributionTypeOptions,
  opportunityReadinessOptions,
  researchConfidenceOptions,
  researchEvidenceTypeOptions,
  researchMethodOptions,
  researchPlanCadenceOptions,
  researchPlanStatusOptions,
  researchPriorityOptions,
} from '../schemas/marketingResearchPlan'
import { researchProjectStatusOptions, researchProjectTypeOptions } from '../schemas/marketingResearchProject'
import { researchResultStatusOptions, researchResultTypeOptions } from '../schemas/marketingResearchResult'
import { researchRunStatusOptions } from '../schemas/marketingResearchRun'
import { marketingTemplateKindOptions, marketingTemplateStatusOptions } from '../schemas/marketingTemplate'
import { GuidedTutorialOverlay } from '../components/GuidedTutorialOverlay'
import {
  DESIGNER_WORKFLOW_TUTORIAL_STORAGE_KEY,
  defaultDesignerWorkflowTutorial,
  getDesignerWorkflowTutorial,
} from '../tutorials/designerWorkflowTutorials'

const API_VERSION = '2024-01-01'
const ADD_CHANNEL_VALUE = '__add_new_channel__'
const MARKETING_CONTROL_CSS = `
  [data-marketing-tool],
  [data-marketing-tool] * {
    box-sizing: border-box;
  }

  [data-marketing-tool] div,
  [data-marketing-tool] section,
  [data-marketing-tool] aside,
  [data-marketing-tool] label {
    min-width: 0;
  }

  [data-marketing-tool] input,
  [data-marketing-tool] select,
  [data-marketing-tool] textarea,
  [data-marketing-tool] button {
    max-width: 100%;
  }

  [data-marketing-tool] button:disabled,
  [data-marketing-tool] select:disabled,
  [data-marketing-tool] input:disabled {
    cursor: not-allowed !important;
    opacity: 0.48 !important;
    filter: saturate(0.55);
  }

  [data-marketing-tool] button:not(:disabled),
  [data-marketing-tool] select:not(:disabled),
  [data-marketing-tool] input[type="checkbox"]:not(:disabled) {
    cursor: pointer;
  }
`

const MARKETING_OPAQUE_CARD_BG = '#11141f'
const MARKETING_OPAQUE_PANEL_BG = '#151a26'
const DESIGNER_WORKFLOW_SESSIONS_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.sessions.v2'
const DESIGNER_WORKFLOW_ACTIVE_SESSION_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.activeSession.v2'

const MARKETING_QUERY = `{
  "calendarItems": *[_type == "marketingCalendarItem"]|order(publishAt asc, _updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    publishAt,
    contentType,
    channel,
    brief,
    contentDraft,
    draftFrames[]{_key, title, body, visualDirection, altText},
    draftAltText,
    draftHashtags,
    contentProductionNotes,
    workingUrl,
    publishedUrl,
    "linkItems": linkItems[]->{
      _id,
      _updatedAt,
      title,
      url,
      description,
      type,
      status,
      featured,
      order,
      publishAt,
      expiresAt,
      sourceChannel,
      image{
        _type,
        asset->{_id, url}
      }
    },
    callToAction,
    utmCampaign,
    funnelStage,
    topicCluster,
    searchIntent,
    targetQueries,
    "campaign": campaign->{_id, title, status},
    "funnel": funnel->{_id, title, status},
    "analyticsSource": analyticsSource->{_id, title, provider, status},
    "channelRef": channelRef->{_id, title, key, status, platform, contentTypes[]{_key, label, value, description}},
    "researchProject": researchProject->{_id, title, status},
    "researchResults": researchResults[]->{_id, title, resultType, status, keyword, volume, difficulty, provider},
    "audienceProfiles": audienceProfiles[]->{_id, title, priority, status},
    "messagePillars": messagePillars[]->{_id, title, coreClaim, topicCluster},
    "proofPoints": proofPoints[]->{_id, title, claim, confidence},
    "ctas": ctas[]->{_id, title, label, funnelStage},
    "trackingRule": trackingRule->{_id, title, status},
    "qualityGates": qualityGates[]->{_id, title, status},
    "experiments": experiments[]->{_id, title, status},
    "performanceSignals": performanceSignals[]->{_id, title, provider, status}
  },
  "campaigns": *[_type == "marketingCampaign"]|order(startDate desc, _updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    startDate,
    endDate,
    primaryGoal,
    campaignObjective,
    audience,
    topicCluster,
    searchIntent,
    targetQueries,
    positioning,
    canonicalUrl,
    channels,
    "channelRefs": channelRefs[]->{_id, title, key, status, platform, contentTypes[]{_key, label, value, description}},
    "funnels": funnels[]->{_id, title, status},
    "analyticsSources": analyticsSources[]->{_id, title, provider, status},
    notes,
    primaryKpi,
    utmCampaign,
    successMetrics[]{label, target, "source": source->{_id, title, provider, status}},
    "researchProject": researchProject->{_id, title, status},
    "researchResults": researchResults[]->{_id, title, resultType, status, keyword, volume, difficulty, provider},
    "audienceProfiles": audienceProfiles[]->{_id, title, priority, status},
    "messagePillars": messagePillars[]->{_id, title, coreClaim, topicCluster},
    "proofPoints": proofPoints[]->{_id, title, claim, confidence},
    "ctas": ctas[]->{_id, title, label, funnelStage},
    "trackingRule": trackingRule->{_id, title, status},
    "qualityGates": qualityGates[]->{_id, title, status},
    "experiments": experiments[]->{_id, title, status},
    "performanceSignals": performanceSignals[]->{_id, title, provider, status}
  },
  "funnels": *[_type == "marketingFunnel"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    audience,
    conversionGoal,
    notes,
    stages[]{_key, _type, stage, goal, offer, callToAction, destinationUrl, metrics},
    "analyticsSources": analyticsSources[]->{_id, title, provider, status},
    "researchProject": researchProject->{_id, title, status},
    "researchResults": researchResults[]->{_id, title, resultType, status, keyword, volume, difficulty, provider},
    "audienceProfiles": audienceProfiles[]->{_id, title, priority, status},
    "messagePillars": messagePillars[]->{_id, title, coreClaim, topicCluster},
    "proofPoints": proofPoints[]->{_id, title, claim, confidence},
    "ctas": ctas[]->{_id, title, label, funnelStage},
    "qualityGates": qualityGates[]->{_id, title, status},
    "experiments": experiments[]->{_id, title, status}
  },
  "analyticsSources": *[_type == "marketingAnalyticsSource"]|order(title asc) {
    _id,
    _updatedAt,
    title,
    provider,
    status,
    propertyId,
    measurementId,
    containerId,
    vercelProject,
    vercelProjectId,
    vercelTeamSlug,
    productionUrl,
    lastSyncedAt,
    dashboardUrl,
    reportingCadence,
    implementationNotes,
    targetSites[]{_key, label, url},
    keyMetrics[]{_key, label, definition}
  },
  "audienceProfiles": *[_type == "marketingAudienceProfile"]|order(priority asc, _updatedAt desc) {
    _id,
    _updatedAt,
    title,
    priority,
    audience,
    needs,
    pains,
    misconceptions,
    trustTriggers,
    desiredActions,
    objections,
    notes
  },
  "messagePillars": *[_type == "marketingMessagePillar"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    coreClaim,
    supportingClaims,
    approvedPhrases,
    phrasesToAvoid,
    topicCluster,
    "audiences": audiences[]->{_id, title, priority},
    "proofPoints": proofPoints[]->{_id, title, confidence},
    notes
  },
  "proofPoints": *[_type == "marketingProofPoint"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    claim,
    proofType,
    sourceTitle,
    sourceUrl,
    confidence,
    "researchResults": researchResults[]->{_id, title, resultType, status, keyword},
    "audiences": audiences[]->{_id, title, priority},
    topicCluster,
    usageNotes
  },
  "ctas": *[_type == "marketingCta"]|order(priority asc, _updatedAt desc) {
    _id,
    _updatedAt,
    title,
    label,
    funnelStage,
    destination,
    successSignal,
    "audiences": audiences[]->{_id, title, priority},
    priority,
    notes
  },
  "trackingRules": *[_type == "marketingTrackingRule"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    utmSourceRule,
    utmMediumRule,
    utmCampaignPattern,
    utmContentPattern,
    allowedSources[]{_key, label, value, whenToUse},
    allowedMediums[]{_key, label, value, whenToUse},
    examples[]{_key, label, url, notes},
    notes
  },
  "qualityGates": *[_type == "marketingQualityGate"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    whenToUse,
    checks[]{_key, label, category, guidance, required},
    notes
  },
  "experiments": *[_type == "marketingExperiment"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    hypothesis,
    expectedSignal,
    "campaign": campaign->{_id, title, status},
    "calendarItem": calendarItem->{_id, title, status, publishAt},
    "performanceSignals": performanceSignals[]->{_id, title, provider, status},
    result,
    decision,
    decisionDate,
    notes
  },
  "performanceSignals": *[_type == "marketingPerformanceSignal"]|order(coalesce(metricDate, _updatedAt) desc) {
    _id,
    _updatedAt,
    title,
    provider,
    status,
    signalType,
    sourceLabel,
    query,
    pageUrl,
    "campaign": campaign->{_id, title, status},
    "channel": channel->{_id, title, key, status},
    "linkItem": linkItem->{_id, title, url, status},
    "calendarItem": calendarItem->{_id, title, status, publishAt},
    "researchProject": researchProject->{_id, title, status},
    metricDate,
    periodStart,
    periodEnd,
    metrics[]{_key, label, value, unit, change},
    interpretation,
    recommendation,
    rawImport
  },
  "channels": *[_type == "marketingChannel"]|order(title asc) {
    _id,
    _updatedAt,
    title,
    key,
    status,
    platform,
    description,
    defaultFunnelStage,
    "analyticsSources": analyticsSources[]->{_id, title, provider, status},
    contentTypes[]{_key, label, value, description}
  },
  "linkItems": *[_type == "marketingLinkItem"]|order(coalesce(order, 100) asc, _updatedAt desc) {
    _id,
    _updatedAt,
    title,
    url,
    description,
    type,
    status,
    featured,
    order,
    publishAt,
    expiresAt,
    sourceChannel,
    image{
      _type,
      asset->{_id, url}
    },
    "campaign": campaign->{_id, title, status},
    "calendarItem": calendarItem->{_id, title, status, publishAt, workingUrl, publishedUrl, channel},
    "calendarItems": calendarItems[]->{_id, title, status, publishAt, workingUrl, publishedUrl, channel},
    "researchProject": researchProject->{_id, title, status},
    "researchResults": researchResults[]->{_id, title, resultType, status, keyword, volume, difficulty, provider},
    "audienceProfiles": audienceProfiles[]->{_id, title, priority, status},
    "messagePillars": messagePillars[]->{_id, title, coreClaim, topicCluster},
    "proofPoints": proofPoints[]->{_id, title, claim, confidence},
    "cta": cta->{_id, title, label, funnelStage},
    "trackingRule": trackingRule->{_id, title, status},
    "qualityGates": qualityGates[]->{_id, title, status},
    "experiments": experiments[]->{_id, title, status},
    "performanceSignals": performanceSignals[]->{_id, title, provider, status}
  },
  "researchProjects": *[_type == "marketingResearchProject"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    researchType,
    brief,
    audience,
    goals,
    campaignObjective,
    positioning,
    canonicalUrl,
    "audienceProfiles": audienceProfiles[]->{_id, title, priority, status},
    "messagePillars": messagePillars[]->{_id, title, coreClaim, topicCluster},
    "proofPoints": proofPoints[]->{_id, title, claim, confidence},
    seedKeywords,
    seedUrls,
    targetGeography,
    language,
    methods,
    researchQuestions[]{_key, question, whyItMatters, method, decisionNeeded, status},
    collaborators[]{
      _key,
      name,
      organization,
      relationshipType,
      topicArea,
      availabilityStart,
      availabilityEnd,
      contributionType,
      capacity,
      expectedContribution,
      status,
      "relatedResults": relatedResults[]->{_id, title, resultType, status, keyword},
      notes
    },
    "performanceSignals": performanceSignals[]->{_id, title, provider, status, signalType, interpretation, recommendation},
    "selectedResults": selectedResults[]->{_id, title, resultType, status, keyword, volume, difficulty, provider},
    "approvedResults": approvedResults[]->{_id, title, resultType, status, keyword, volume, difficulty, provider},
    "generatedCampaigns": generatedCampaigns[]->{_id, title, status},
    "generatedFunnels": generatedFunnels[]->{_id, title, status},
    "generatedCalendarItems": generatedCalendarItems[]->{_id, title, status, publishAt, workingUrl, publishedUrl, channel},
    "generatedLinkItems": generatedLinkItems[]->{_id, title, url, status},
    "legacyPlan": legacyPlan->{_id, title, status},
    internalNotes
  },
  "researchResults": *[_type == "marketingResearchResult"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    resultType,
    status,
    "project": project->{_id, title, status},
    "run": run->{_id, title, status, provider, startedAt},
    selectedForSynthesis,
    approvedAt,
    priority,
    provider,
    sourceMethod,
    scoreSource,
    database,
    fetchedAt,
    rawProviderMetadata,
    keyword,
    searchIntent,
    volume,
    difficulty,
    cpc,
    competition,
    resultsCount,
    canonicalUrl,
    contentGap,
    sourceTitle,
    sourceUrl,
    claim,
    evidenceType,
    confidence,
    implication,
    competitorName,
    competitorUrl,
    collaboratorName,
    organization,
    relationshipType,
    topicArea,
    availabilityStart,
    availabilityEnd,
    contributionType,
    capacity,
    expectedContribution,
    collaborationStatus
  },
  "researchRuns": *[_type == "marketingResearchRun"]|order(startedAt desc, _updatedAt desc) {
    _id,
    _updatedAt,
    title,
    "project": project->{_id, title, status},
    provider,
    status,
    startedAt,
    completedAt,
    methods,
    seedKeywords,
    seedUrls,
    database,
    warnings,
    errors,
    "createdResults": createdResults[]->{_id, title, resultType, status, keyword}
  },
  "researchPlans": *[_type == "marketingResearchPlan"]|order(_updatedAt desc) {
    _id,
    _updatedAt,
    title,
    status,
    summary,
    audience,
    positioning,
    campaignObjective,
    canonicalUrl,
    releaseCadence,
    contentPillars[]{_key, title, audienceNeed, angle, exampleFormats},
    researchQuestions[]{_key, question, whyItMatters, method, decisionNeeded, status},
    evidenceNotes[]{_key, claim, sourceTitle, sourceUrl, evidenceType, confidence, implication, gap},
    assumptions[]{_key, assumption, risk, validationSignal, confidence},
    seoTargets[]{_key, query, intent, priority, canonicalUrl, contentGap, notes},
    channels[]{_key, channelKey, rationale, cadence, priority},
    collaborations[]{
      _key,
      name,
      organization,
      relationshipType,
      topicArea,
      availabilityStart,
      availabilityEnd,
      contributionType,
      expectedContribution,
      status,
      notes
    },
    releaseWindows[]{_key, label, startDate, endDate, goal, priority},
    contentOpportunities[]{
      _key,
      title,
      channel,
      format,
      owner,
      releaseWindow,
      callToAction,
      sourceMaterial,
      destinationUrl,
      readiness,
      seoQuery,
      priority,
      notes,
      "generatedCalendarItem": generatedCalendarItem->{_id, title, status, publishAt, workingUrl, publishedUrl, channel},
      "generatedLinkItem": generatedLinkItem->{_id, title, url, status}
    },
    measurementGoals[]{_key, label, target, "source": source->{_id, title, provider, status}},
    strategyAdjustments[]{_key, decisionDate, trigger, reason, recommendation, affectedItems, decision},
    "generatedCampaigns": generatedCampaigns[]->{_id, title, status},
    "generatedFunnels": generatedFunnels[]->{_id, title, status},
    "generatedCalendarItems": generatedCalendarItems[]->{_id, title, status, publishAt, workingUrl, publishedUrl, channel},
    "generatedLinkItems": generatedLinkItems[]->{_id, title, url, status},
    "generatedAnalyticsSources": generatedAnalyticsSources[]->{_id, title, provider, status},
    internalNotes
  },
  "templates": *[_type == "marketingTemplate"]|order(coalesce(order, 100) asc, title asc) {
    _id,
    _updatedAt,
    title,
    kind,
    status,
    description,
    whenToUse,
    order,
    campaignObjective,
    primaryGoal,
    primaryKpi,
    audience,
    topicCluster,
    searchIntent,
    targetQueries,
    positioning,
    "audienceProfiles": audienceProfiles[]->{_id, title, priority, status},
    "messagePillars": messagePillars[]->{_id, title, coreClaim, topicCluster},
    "proofPoints": proofPoints[]->{_id, title, claim, confidence},
    "ctas": ctas[]->{_id, title, label, funnelStage},
    "trackingRule": trackingRule->{_id, title, status},
    "qualityGates": qualityGates[]->{_id, title, status},
    channels,
    successMetrics[]{_key, label, target},
    designerGuidance,
    notes,
    conversionGoal,
    stages[]{_key, _type, stage, goal, offer, callToAction, destinationUrl, metrics}
  }
}`

type StudioClient = ReturnType<typeof useClient>
type MarketingDocumentInput = { _type: string } & Record<string, unknown>

type MarketingViewId =
  | 'dashboard'
  | 'attention'
  | 'strategy'
  | 'research'
  | 'calendar'
  | 'campaigns'
  | 'funnels'
  | 'templates'
  | 'channels'
  | 'analytics'
  | 'linkTree'
type MarketingAssistKind =
  | 'campaign'
  | 'funnel'
  | 'calendarItem'
  | 'channel'
  | 'analyticsSource'
  | 'linkItem'
  | 'template'
  | 'researchProject'
  | 'researchSynthesis'
  | 'researchPlan'
  | 'strategyAsset'

export const MARKETING_TOOL_VIEWS: Array<{
  id: MarketingViewId
  title: string
  description: string
  icon: typeof CalendarIcon
}> = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'See content runway, strategy gaps, and the next best fixes.',
    icon: DashboardIcon,
  },
  {
    id: 'attention',
    title: 'Needs Attention',
    description: 'Review setup gaps, missing content fields, and measurement tasks.',
    icon: BellIcon,
  },
  {
    id: 'research',
    title: 'Research',
    description: 'Turn strategy inputs, SEO, and collaborators into release opportunities.',
    icon: SearchIcon,
  },
  {
    id: 'strategy',
    title: 'Strategy',
    description: 'Manage reusable audiences, messages, proof, CTAs, tracking rules, and quality gates.',
    icon: TargetIcon,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    description: 'Plan publishing dates, channels, owners, and campaign timing.',
    icon: CalendarIcon,
  },
  {
    id: 'campaigns',
    title: 'Campaigns',
    description: 'Edit strategy, audience, channels, timing, and success metrics.',
    icon: TargetIcon,
  },
  {
    id: 'funnels',
    title: 'Funnels',
    description: 'Manage reusable funnel stages and CTAs across sites.',
    icon: MasterDetailIcon,
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Manage reusable campaign and funnel setup patterns.',
    icon: DashboardIcon,
  },
  {
    id: 'channels',
    title: 'Channels',
    description: 'Manage Instagram, LinkedIn, email, and their content types.',
    icon: TagIcon,
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Track GA4, GTM, Vercel, and reporting connections.',
    icon: TrendUpwardIcon,
  },
  {
    id: 'linkTree',
    title: 'Quick Links',
    description: 'Manage the public /links page for Instagram and social posts.',
    icon: LinkIcon,
  },
]

export const PRIMARY_MARKETING_VIEW_IDS: MarketingViewId[] = [
  'dashboard',
  'research',
  'strategy',
  'calendar',
  'channels',
  'linkTree',
]

interface RefSummary {
  _id: string
  title?: string
  status?: string
  provider?: string
}

type ReferenceValue = { _type: 'reference'; _ref: string }
type SuccessMetric = { _key?: string; _type?: 'successMetric'; label?: string; target?: string; source?: RefSummary | ReferenceValue }

interface ChannelContentType {
  _key?: string
  _type?: 'channelContentType'
  label?: string
  value?: string
  description?: string
}

interface MarketingChannel {
  _id: string
  _updatedAt?: string
  title?: string
  key?: string
  status?: string
  platform?: string
  description?: string
  defaultFunnelStage?: string
  analyticsSources?: RefSummary[]
  contentTypes?: ChannelContentType[]
}

interface MarketingCalendarItem {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  publishAt?: string
  contentType?: string
  channel?: string
  brief?: string
  contentDraft?: string
  draftFrames?: DraftContentFrame[]
  draftAltText?: string
  draftHashtags?: string[]
  contentProductionNotes?: string
  workingUrl?: string
  publishedUrl?: string
  linkItems?: MarketingLinkItem[]
  callToAction?: string
  utmCampaign?: string
  funnelStage?: string
  topicCluster?: string
  searchIntent?: string
  targetQueries?: string[]
  campaign?: RefSummary
  funnel?: RefSummary
  channelRef?: MarketingChannel
  analyticsSource?: RefSummary
  researchProject?: RefSummary
  researchResults?: MarketingResearchResult[]
  audienceProfiles?: MarketingAudienceProfile[]
  messagePillars?: MarketingMessagePillar[]
  proofPoints?: MarketingProofPoint[]
  ctas?: MarketingCta[]
  trackingRule?: RefSummary
  qualityGates?: MarketingQualityGate[]
  experiments?: MarketingExperiment[]
  performanceSignals?: MarketingPerformanceSignal[]
}

type DraftContentFrame = {
  _key?: string
  title?: string
  body?: string
  visualDirection?: string
  altText?: string
}

interface MarketingCampaign {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  startDate?: string
  endDate?: string
  primaryGoal?: string
  campaignObjective?: string
  audience?: string
  topicCluster?: string
  searchIntent?: string
  targetQueries?: string[]
  positioning?: string
  canonicalUrl?: string
  channels?: string[]
  channelRefs?: MarketingChannel[]
  funnels?: RefSummary[]
  analyticsSources?: RefSummary[]
  notes?: string
  primaryKpi?: string
  utmCampaign?: string
  successMetrics?: SuccessMetric[]
  researchProject?: RefSummary
  researchResults?: MarketingResearchResult[]
  audienceProfiles?: MarketingAudienceProfile[]
  messagePillars?: MarketingMessagePillar[]
  proofPoints?: MarketingProofPoint[]
  ctas?: MarketingCta[]
  trackingRule?: RefSummary
  qualityGates?: MarketingQualityGate[]
  experiments?: MarketingExperiment[]
  performanceSignals?: MarketingPerformanceSignal[]
}

interface FunnelStage {
  _key: string
  _type?: 'funnelStage'
  stage?: string
  goal?: string
  offer?: string
  callToAction?: string
  destinationUrl?: string
  metrics?: string[]
}

interface MarketingFunnel {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  audience?: string
  conversionGoal?: string
  notes?: string
  stages?: FunnelStage[]
  analyticsSources?: RefSummary[]
  researchProject?: RefSummary
  researchResults?: MarketingResearchResult[]
  audienceProfiles?: MarketingAudienceProfile[]
  messagePillars?: MarketingMessagePillar[]
  proofPoints?: MarketingProofPoint[]
  ctas?: MarketingCta[]
  qualityGates?: MarketingQualityGate[]
  experiments?: MarketingExperiment[]
}

interface MarketingAnalyticsSource {
  _id: string
  _updatedAt?: string
  title?: string
  provider?: string
  status?: string
  propertyId?: string
  measurementId?: string
  containerId?: string
  vercelProject?: string
  vercelProjectId?: string
  vercelTeamSlug?: string
  productionUrl?: string
  lastSyncedAt?: string
  dashboardUrl?: string
  reportingCadence?: string
  implementationNotes?: string
  targetSites?: Array<{ _key?: string; label?: string; url?: string }>
  keyMetrics?: Array<{ _key?: string; _type?: 'keyMetric'; label?: string; definition?: string }>
}

interface MarketingAudienceProfile {
  _id: string
  _updatedAt?: string
  title?: string
  priority?: string
  audience?: string
  needs?: string[]
  pains?: string[]
  misconceptions?: string[]
  trustTriggers?: string[]
  desiredActions?: string[]
  objections?: string[]
  notes?: string
}

interface MarketingMessagePillar {
  _id: string
  _updatedAt?: string
  title?: string
  coreClaim?: string
  supportingClaims?: string[]
  approvedPhrases?: string[]
  phrasesToAvoid?: string[]
  topicCluster?: string
  audiences?: MarketingAudienceProfile[]
  proofPoints?: MarketingProofPoint[]
  notes?: string
}

interface MarketingProofPoint {
  _id: string
  _updatedAt?: string
  title?: string
  claim?: string
  proofType?: string
  sourceTitle?: string
  sourceUrl?: string
  confidence?: string
  researchResults?: MarketingResearchResult[]
  audiences?: MarketingAudienceProfile[]
  topicCluster?: string
  usageNotes?: string
}

interface MarketingCta {
  _id: string
  _updatedAt?: string
  title?: string
  label?: string
  funnelStage?: string
  destination?: string
  successSignal?: string
  audiences?: MarketingAudienceProfile[]
  priority?: string
  notes?: string
}

interface MarketingTrackingRule {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  utmSourceRule?: string
  utmMediumRule?: string
  utmCampaignPattern?: string
  utmContentPattern?: string
  allowedSources?: Array<{ _key?: string; label?: string; value?: string; whenToUse?: string }>
  allowedMediums?: Array<{ _key?: string; label?: string; value?: string; whenToUse?: string }>
  examples?: Array<{ _key?: string; label?: string; url?: string; notes?: string }>
  notes?: string
}

interface MarketingQualityGate {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  whenToUse?: string
  checks?: Array<{ _key?: string; label?: string; category?: string; guidance?: string; required?: boolean }>
  notes?: string
}

interface MarketingExperiment {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  hypothesis?: string
  expectedSignal?: string
  campaign?: RefSummary
  calendarItem?: MarketingCalendarItem
  performanceSignals?: MarketingPerformanceSignal[]
  result?: string
  decision?: string
  decisionDate?: string
  notes?: string
}

interface MarketingPerformanceSignal {
  _id: string
  _updatedAt?: string
  title?: string
  provider?: string
  status?: string
  signalType?: string
  sourceLabel?: string
  query?: string
  pageUrl?: string
  campaign?: RefSummary
  channel?: MarketingChannel
  linkItem?: MarketingLinkItem
  calendarItem?: MarketingCalendarItem
  researchProject?: RefSummary
  metricDate?: string
  periodStart?: string
  periodEnd?: string
  metrics?: Array<{ _key?: string; label?: string; value?: number; unit?: string; change?: string }>
  interpretation?: string
  recommendation?: string
  rawImport?: string
}

interface MarketingLinkItem {
  _id: string
  _updatedAt?: string
  title?: string
  url?: string
  description?: string
  type?: string
  status?: string
  featured?: boolean
  order?: number
  publishAt?: string
  expiresAt?: string
  sourceChannel?: string
  image?: {
    _type?: 'image'
    asset?: {
      _id?: string
      url?: string
    }
  }
  campaign?: RefSummary
  calendarItem?: MarketingCalendarItem
  calendarItems?: MarketingCalendarItem[]
  researchProject?: RefSummary
  researchResults?: MarketingResearchResult[]
  audienceProfiles?: MarketingAudienceProfile[]
  messagePillars?: MarketingMessagePillar[]
  proofPoints?: MarketingProofPoint[]
  cta?: MarketingCta
  trackingRule?: RefSummary
  qualityGates?: MarketingQualityGate[]
  experiments?: MarketingExperiment[]
  performanceSignals?: MarketingPerformanceSignal[]
}

interface MarketingTemplate {
  _id: string
  _updatedAt?: string
  title?: string
  kind?: string
  status?: string
  description?: string
  whenToUse?: string
  order?: number
  campaignObjective?: string
  primaryGoal?: string
  primaryKpi?: string
  audience?: string
  topicCluster?: string
  searchIntent?: string
  targetQueries?: string[]
  positioning?: string
  audienceProfiles?: MarketingAudienceProfile[]
  messagePillars?: MarketingMessagePillar[]
  proofPoints?: MarketingProofPoint[]
  ctas?: MarketingCta[]
  trackingRule?: RefSummary
  qualityGates?: MarketingQualityGate[]
  channels?: string[]
  successMetrics?: Array<{ _key?: string; label?: string; target?: string }>
  designerGuidance?: string[]
  notes?: string
  conversionGoal?: string
  stages?: FunnelStage[]
}

interface ResearchContentPillar {
  _key?: string
  _type?: 'contentPillar'
  title?: string
  audienceNeed?: string
  angle?: string
  exampleFormats?: string[]
}

interface ResearchQuestion {
  _key?: string
  _type?: 'researchQuestion'
  question?: string
  whyItMatters?: string
  method?: string
  decisionNeeded?: string
  status?: string
}

interface ResearchEvidenceNote {
  _key?: string
  _type?: 'evidenceNote'
  claim?: string
  sourceTitle?: string
  sourceUrl?: string
  evidenceType?: string
  confidence?: string
  implication?: string
  gap?: string
}

interface ResearchAssumption {
  _key?: string
  _type?: 'researchAssumption'
  assumption?: string
  risk?: string
  validationSignal?: string
  confidence?: string
}

interface ResearchSeoTarget {
  _key?: string
  _type?: 'seoTarget'
  query?: string
  intent?: string
  priority?: string
  canonicalUrl?: string
  contentGap?: string
  notes?: string
}

interface ResearchRecommendedChannel {
  _key?: string
  _type?: 'recommendedChannel'
  channelKey?: string
  rationale?: string
  cadence?: string
  priority?: string
}

interface ResearchCollaboration {
  _key?: string
  _type?: 'collaborationOpportunity'
  name?: string
  organization?: string
  relationshipType?: string
  topicArea?: string
  availabilityStart?: string
  availabilityEnd?: string
  contributionType?: string
  expectedContribution?: string
  status?: string
  notes?: string
}

interface ResearchReleaseWindow {
  _key?: string
  _type?: 'releaseWindow'
  label?: string
  startDate?: string
  endDate?: string
  goal?: string
  priority?: string
}

interface ResearchContentOpportunity {
  _key?: string
  _type?: 'contentOpportunity'
  title?: string
  channel?: string
  format?: string
  owner?: string
  releaseWindow?: string
  callToAction?: string
  sourceMaterial?: string
  destinationUrl?: string
  readiness?: string
  seoQuery?: string
  priority?: string
  notes?: string
  selected?: boolean
  generatedCalendarItem?: MarketingCalendarItem | ReferenceValue
  generatedLinkItem?: MarketingLinkItem | ReferenceValue
}

interface ResearchMeasurementGoal {
  _key?: string
  _type?: 'measurementGoal'
  label?: string
  target?: string
  source?: RefSummary | ReferenceValue
}

interface ResearchStrategyAdjustment {
  _key?: string
  _type?: 'strategyAdjustment'
  decisionDate?: string
  trigger?: string
  reason?: string
  recommendation?: string
  affectedItems?: string[]
  decision?: string
}

interface MarketingResearchPlan {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  summary?: string
  audience?: string
  positioning?: string
  campaignObjective?: string
  canonicalUrl?: string
  releaseCadence?: string
  contentPillars?: ResearchContentPillar[]
  researchQuestions?: ResearchQuestion[]
  evidenceNotes?: ResearchEvidenceNote[]
  assumptions?: ResearchAssumption[]
  seoTargets?: ResearchSeoTarget[]
  channels?: ResearchRecommendedChannel[]
  collaborations?: ResearchCollaboration[]
  releaseWindows?: ResearchReleaseWindow[]
  contentOpportunities?: ResearchContentOpportunity[]
  measurementGoals?: ResearchMeasurementGoal[]
  strategyAdjustments?: ResearchStrategyAdjustment[]
  generatedCampaigns?: RefSummary[]
  generatedFunnels?: RefSummary[]
  generatedCalendarItems?: MarketingCalendarItem[]
  generatedLinkItems?: MarketingLinkItem[]
  generatedAnalyticsSources?: RefSummary[]
  internalNotes?: string
}

interface MarketingResearchProject {
  _id: string
  _updatedAt?: string
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
  researchQuestions?: ResearchQuestion[]
  collaborators?: ResearchProjectCollaborator[]
  audienceProfiles?: MarketingAudienceProfile[]
  messagePillars?: MarketingMessagePillar[]
  proofPoints?: MarketingProofPoint[]
  performanceSignals?: MarketingPerformanceSignal[]
  selectedResults?: MarketingResearchResult[]
  approvedResults?: MarketingResearchResult[]
  generatedCampaigns?: RefSummary[]
  generatedFunnels?: RefSummary[]
  generatedCalendarItems?: MarketingCalendarItem[]
  generatedLinkItems?: MarketingLinkItem[]
  legacyPlan?: RefSummary
  internalNotes?: string
}

interface ResearchProjectCollaborator {
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
  relatedResults?: MarketingResearchResult[]
  notes?: string
}

interface MarketingResearchResult {
  _id: string
  _updatedAt?: string
  title?: string
  resultType?: string
  status?: string
  project?: RefSummary
  run?: RefSummary & { startedAt?: string }
  selectedForSynthesis?: boolean
  proofPoints?: MarketingProofPoint[]
  performanceSignals?: MarketingPerformanceSignal[]
  approvedAt?: string
  priority?: string
  provider?: string
  sourceMethod?: string
  scoreSource?: string
  database?: string
  fetchedAt?: string
  rawProviderMetadata?: string
  keyword?: string
  searchIntent?: string
  volume?: number
  difficulty?: number
  cpc?: number
  competition?: number
  resultsCount?: number
  canonicalUrl?: string
  contentGap?: string
  sourceTitle?: string
  sourceUrl?: string
  claim?: string
  evidenceType?: string
  confidence?: string
  implication?: string
  competitorName?: string
  competitorUrl?: string
  collaboratorName?: string
  organization?: string
  relationshipType?: string
  topicArea?: string
  availabilityStart?: string
  availabilityEnd?: string
  contributionType?: string
  capacity?: string
  expectedContribution?: string
  collaborationStatus?: string
}

interface MarketingResearchRun {
  _id: string
  _updatedAt?: string
  title?: string
  project?: RefSummary
  provider?: string
  status?: string
  startedAt?: string
  completedAt?: string
  methods?: string[]
  seedKeywords?: string[]
  seedUrls?: string[]
  database?: string
  warnings?: string[]
  errors?: string[]
  createdResults?: MarketingResearchResult[]
}

interface MarketingData {
  calendarItems: MarketingCalendarItem[]
  campaigns: MarketingCampaign[]
  funnels: MarketingFunnel[]
  analyticsSources: MarketingAnalyticsSource[]
  audienceProfiles: MarketingAudienceProfile[]
  messagePillars: MarketingMessagePillar[]
  proofPoints: MarketingProofPoint[]
  ctas: MarketingCta[]
  trackingRules: MarketingTrackingRule[]
  qualityGates: MarketingQualityGate[]
  experiments: MarketingExperiment[]
  performanceSignals: MarketingPerformanceSignal[]
  channels: MarketingChannel[]
  linkItems: MarketingLinkItem[]
  researchProjects: MarketingResearchProject[]
  researchResults: MarketingResearchResult[]
  researchRuns: MarketingResearchRun[]
  researchPlans: MarketingResearchPlan[]
  templates: MarketingTemplate[]
}

type MarketingAiSuggestion = {
  summary?: string
  rationale?: string[]
  siteReferences?: Array<{ title?: string; url?: string; note?: string }>
  campaign?: Partial<MarketingCampaign>
  funnel?: Partial<MarketingFunnel>
  calendarItem?: Partial<MarketingCalendarItem>
  channel?: Partial<MarketingChannel>
  analyticsSource?: Partial<MarketingAnalyticsSource>
  linkItem?: Partial<MarketingLinkItem>
  template?: Partial<MarketingTemplate>
  researchProject?: Partial<MarketingResearchProject>
  researchSynthesis?: MarketingResearchSynthesisSuggestion
  researchPlan?: Partial<MarketingResearchPlan>
  strategyAsset?: MarketingStrategyAssetSuggestion
}

type MarketingStrategyAssetSuggestion = Partial<MarketingAudienceProfile> &
  Partial<MarketingMessagePillar> &
  Partial<MarketingProofPoint> &
  Partial<MarketingCta> &
  Partial<MarketingTrackingRule> &
  Partial<MarketingQualityGate> &
  Partial<MarketingExperiment> &
  Partial<MarketingPerformanceSignal> & {
    assetType?: StrategyAssetKind | StrategyAssistAssetType
    summary?: string
    priority?: string
    ctaLabel?: string
    destination?: string
    qualityChecklist?: MarketingQualityGate['checks']
  }

type MarketingResearchSynthesisSuggestion = {
  summary?: string
  missingInputs?: string[]
  recommendedMethods?: string[]
  selectedResultIds?: string[]
  contentOpportunities?: ResearchContentOpportunity[]
  releaseRecommendation?: string
  internalNotes?: string
}

type StrategyAssetKind =
  | 'audiences'
  | 'messages'
  | 'proof'
  | 'ctas'
  | 'tracking'
  | 'quality'
  | 'experiments'
  | 'performance'

type StrategyWorkspaceMode = 'foundation' | 'campaigns' | 'funnels'
type StrategyAssistAssetType =
  | 'audience'
  | 'message'
  | 'proof'
  | 'cta'
  | 'trackingRule'
  | 'qualityGate'
  | 'experiment'
  | 'performanceSynthesis'

type GuidedAutofillQuestion = {
  id: string
  label: string
  choices: Array<{
    value: string
    label: string
    description: string
  }>
}

type MarketingAiAssistResponse = {
  suggestion?: MarketingAiSuggestion
  error?: string
  usedAi?: boolean
  context?: {
    features?: number
    caseStudies?: number
    campaigns?: number
    analyticsTakeaways?: number
  }
}

type SelectOption = {
  title: string
  value: string
}

type CalendarItemTemplate = {
  id: string
  title: string
  description: string
  channel: string
  contentType: string
  funnelStage: string
  brief: string
  callToAction: string
}

type CalendarDisplayGroup = 'preview' | 'draft' | 'final'
type SavedCalendarDisplayGroup = Exclude<CalendarDisplayGroup, 'preview'>

type CampaignTemplate = {
  id: string
  title: string
  description: string
  whenToUse: string
  campaignObjective: string
  primaryGoal: string
  primaryKpi: string
  audience: string
  topicCluster: string
  searchIntent: string
  targetQueries: string[]
  positioning: string
  channels: string[]
  successMetrics: Array<{ label: string; target: string }>
  designerGuidance: string[]
  notes: string
}

type FunnelTemplate = {
  id: string
  title: string
  description: string
  audience: string
  conversionGoal: string
  stages: Array<Omit<FunnelStage, '_key' | '_type'>>
}

type MarketingAttentionItem = {
  id: string
  title: string
  detail: string
  view: MarketingViewId
  severity: 'setup' | 'content' | 'measurement'
}

type AnalyticsInterpretationSeverity = 'urgent' | 'warning' | 'opportunity' | 'healthy'

export type AnalyticsInterpretation = {
  id: string
  severity: AnalyticsInterpretationSeverity
  title: string
  interpretation: string
  action: string
  affected: string[]
}

type MarketingDashboardGap = {
  id: string
  title: string
  why: string
  action: string
  view: MarketingViewId
  severity: MarketingAttentionItem['severity'] | AnalyticsInterpretationSeverity
  affected?: string[]
}

type WorkflowTerm = {
  label: string
  definition: string
}

type WorkflowHelpItem = {
  question: string
  answer: Array<string | WorkflowTerm>
  action?: {
    label: string
    view: MarketingViewId
  }
}

type WorkflowSetupStep = {
  label: string
  title: string
  outcome: string
  designerAction: string
  view: MarketingViewId
  terms?: WorkflowTerm[]
}

type CarouselWizardResult = {
  researchProjectId?: string
  researchPlanId?: string
  channelId?: string
  campaignId?: string
  funnelId?: string
  calendarItemId?: string
  linkItemId?: string
  title: string
  demo?: boolean
}

type DesignerWizardMode = 'singleItem' | 'plan'

type MarketingPlanQuestionnaire = {
  topic: string
  objective: string
  audience: string
  destinationUrl: string
  runway: 'oneWeek' | 'twoWeeks' | 'oneMonth'
  contentCapacity: 'oneItem' | 'weeklyCarousel' | 'multiChannel'
  primaryMetric: string
  notes: string
}

type DesignerWorkflowSession = {
  id: string
  title: string
  mode: DesignerWizardMode
  stepIndex: number
  strategyStepIndex: number
  questionnaire: MarketingPlanQuestionnaire
  strategyPrompt: string
  strategySuggestion: MarketingAiSuggestion | null
  strategyUsedAi: boolean | null
  result: CarouselWizardResult | null
  tutorialDemo?: boolean
  ephemeral?: boolean
  createdAt: string
  updatedAt: string
}

type StrategyAssistantRecommendation = {
  title: string
  detail: string
  view: MarketingViewId
  steps: string[]
  strategicContext: Array<{
    title: string
    detail: string
  }>
}

type DesignerWorkflowTutorialPrepareSignal = {
  stepId: string
  tutorialId: string
  demoRecommendation?: boolean
  token: number
} | null

type WizardStepDefinition = {
  title: string
  detail: string
}

const EMPTY_DATA: MarketingData = {
  calendarItems: [],
  campaigns: [],
  funnels: [],
  analyticsSources: [],
  audienceProfiles: [],
  messagePillars: [],
  proofPoints: [],
  ctas: [],
  trackingRules: [],
  qualityGates: [],
  experiments: [],
  performanceSignals: [],
  channels: [],
  linkItems: [],
  researchProjects: [],
  researchResults: [],
  researchRuns: [],
  researchPlans: [],
  templates: [],
}

const statusColors: Record<string, { bg: string; fg: string; border: string }> = {
  preview: { bg: 'rgba(0, 115, 133, 0.08)', fg: '#4dc4d6', border: 'rgba(77, 196, 214, 0.72)' },
  idea: { bg: 'rgba(124, 101, 39, 0.16)', fg: '#d6a93f', border: 'rgba(214, 169, 63, 0.35)' },
  drafting: { bg: 'rgba(55, 111, 173, 0.16)', fg: '#79b3f0', border: 'rgba(121, 179, 240, 0.35)' },
  review: { bg: 'rgba(148, 90, 172, 0.16)', fg: '#d6a1f0', border: 'rgba(214, 161, 240, 0.35)' },
  scheduled: { bg: 'rgba(0, 115, 133, 0.18)', fg: '#4dc4d6', border: 'rgba(77, 196, 214, 0.35)' },
  published: { bg: 'rgba(54, 139, 87, 0.18)', fg: '#7dd69e', border: 'rgba(125, 214, 158, 0.35)' },
  canceled: { bg: 'rgba(120, 120, 120, 0.14)', fg: '#b8b8b8', border: 'rgba(184, 184, 184, 0.26)' },
  planned: { bg: 'rgba(0, 115, 133, 0.18)', fg: '#4dc4d6', border: 'rgba(77, 196, 214, 0.35)' },
  active: { bg: 'rgba(54, 139, 87, 0.18)', fg: '#7dd69e', border: 'rgba(125, 214, 158, 0.35)' },
  paused: { bg: 'rgba(124, 101, 39, 0.16)', fg: '#d6a93f', border: 'rgba(214, 169, 63, 0.35)' },
  complete: { bg: 'rgba(54, 139, 87, 0.18)', fg: '#7dd69e', border: 'rgba(125, 214, 158, 0.35)' },
  archived: { bg: 'rgba(120, 120, 120, 0.14)', fg: '#b8b8b8', border: 'rgba(184, 184, 184, 0.26)' },
  draft: { bg: 'rgba(55, 111, 173, 0.16)', fg: '#79b3f0', border: 'rgba(121, 179, 240, 0.35)' },
  optimizing: { bg: 'rgba(148, 90, 172, 0.16)', fg: '#d6a1f0', border: 'rgba(214, 161, 240, 0.35)' },
  connected: { bg: 'rgba(54, 139, 87, 0.18)', fg: '#7dd69e', border: 'rgba(125, 214, 158, 0.35)' },
  needsReview: { bg: 'rgba(124, 101, 39, 0.16)', fg: '#d6a93f', border: 'rgba(214, 169, 63, 0.35)' },
  disabled: { bg: 'rgba(120, 120, 120, 0.14)', fg: '#b8b8b8', border: 'rgba(184, 184, 184, 0.26)' },
}

const CALENDAR_ITEM_TEMPLATES: CalendarItemTemplate[] = [
  {
    id: 'insight-carousel',
    title: 'Insight carousel',
    description: 'Turn one design insight into a concise visual sequence.',
    channel: 'instagram',
    contentType: 'carousel',
    funnelStage: 'awareness',
    brief: [
      'Audience: Who needs this design insight?',
      'Core point: What is the one thing they should remember?',
      'Frames: 1) hook, 2) context, 3) example, 4) takeaway, 5) next step.',
      'Asset needs: Source image, diagram, or quote to adapt.',
    ].join('\n'),
    callToAction: 'Read the full article',
  },
  {
    id: 'case-study-promo',
    title: 'Case study promo',
    description: 'Promote a work story without writing a campaign from scratch.',
    channel: 'linkedin',
    contentType: 'socialPost',
    funnelStage: 'consideration',
    brief: [
      'Project: Which case study or client story is this about?',
      'Problem: What challenge did the team solve?',
      'Proof: What visual, result, or quote makes it credible?',
      'Designer note: Link to the canonical case study or draft.',
    ].join('\n'),
    callToAction: 'See the case study',
  },
  {
    id: 'newsletter-roundup',
    title: 'Newsletter roundup',
    description: 'Collect useful recent work into a sendable email outline.',
    channel: 'email',
    contentType: 'newsletter',
    funnelStage: 'interest',
    brief: [
      'Theme: What connects the items in this issue?',
      'Items: Add 3-5 links, drafts, or recent projects.',
      'Lead: Why should a reader care this month?',
      'Closing: What should they do next?',
    ].join('\n'),
    callToAction: 'Explore the work',
  },
  {
    id: 'service-page-nudge',
    title: 'Service page nudge',
    description: 'Point people from a content piece toward a relevant service.',
    channel: 'website',
    contentType: 'landingPage',
    funnelStage: 'conversion',
    brief: [
      'Service: Which capability should this support?',
      'Trigger: What visitor problem does this answer?',
      'Evidence: Which article, case study, or artifact supports it?',
      'Page change: What needs to be added or updated?',
    ].join('\n'),
    callToAction: 'Talk with GoInvo',
  },
]

const workflowTerms: WorkflowTerm[] = [
  {
    label: 'Campaign',
    definition: 'The strategy container: goal, audience, message, timing, content, and measurement for one marketing effort.',
  },
  {
    label: 'Playbook',
    definition: 'A reusable execution pattern inside a campaign, such as a case study release or Instagram carousel series.',
  },
  {
    label: 'Funnel',
    definition: 'The path from attention to action. It explains what someone should do next after seeing a page, post, or link.',
  },
  {
    label: 'Channel',
    definition: 'A place we publish or promote work, such as Instagram, LinkedIn, email, the website, or a partner site.',
  },
  {
    label: 'CTA',
    definition: 'Call to action. The specific next step we ask someone to take, such as read the article or contact GoInvo.',
  },
  {
    label: 'KPI',
    definition: 'Key performance indicator. The metric that tells us whether the campaign helped, such as visits, inquiries, saves, or clicks.',
  },
  {
    label: 'UTM',
    definition: 'Tracking text added to URLs so analytics can identify the source, medium, campaign, creative, or keyword behind a visit.',
  },
  {
    label: 'Search intent',
    definition: 'What someone is trying to learn, compare, decide, or do when they search or click into content.',
  },
  {
    label: 'Quick Link',
    definition: 'A managed card on /links, used as the destination hub for Instagram and social posts.',
  },
]

const workflowHelpItems: WorkflowHelpItem[] = [
  {
    question: 'When am I ready to make the post content?',
    answer: [
      'When the ',
      workflowTerms[0],
      ', ',
      workflowTerms[2],
      ', channel, calendar item, and measurement are connected. Then the only creative task left should be the post, page, image, or email itself.',
    ],
    action: { label: 'Open Campaigns', view: 'campaigns' },
  },
  {
    question: 'What is a funnel doing here?',
    answer: [
      'A ',
      workflowTerms[2],
      ' keeps each artifact from becoming a dead end. It connects awareness, consideration, and conversion so every post or page has a useful next step.',
    ],
    action: { label: 'Open Funnels', view: 'funnels' },
  },
  {
    question: 'How do channels affect content types?',
    answer: [
      'The ',
      workflowTerms[3],
      ' controls the formats that make sense there. Instagram can use carousel, reel, story, or post; email can use newsletter or announcement; the website can use article, case study, or service page.',
    ],
    action: { label: 'Open Channels', view: 'channels' },
  },
  {
    question: 'What do I put in the brief?',
    answer: [
      'Write the audience problem, the useful idea, the artifact we need, and the ',
      workflowTerms[4],
      '. If the item supports search, include the ',
      workflowTerms[7],
      ' and phrases people might actually use.',
    ],
    action: { label: 'Open Calendar', view: 'calendar' },
  },
  {
    question: 'How do we know if it worked?',
    answer: [
      'Pick one primary ',
      workflowTerms[5],
      ', attach an analytics source, and use a consistent ',
      workflowTerms[6],
      ' name when the link is promoted outside the site.',
    ],
    action: { label: 'Open Analytics', view: 'analytics' },
  },
  {
    question: 'When should I use Quick Links?',
    answer: [
      'Use a ',
      workflowTerms[8],
      ' when social posts say link in bio or when a campaign needs a simple destination hub. Keep durable links always on, and let calendar items add timely links.',
    ],
    action: { label: 'Open Quick Links', view: 'linkTree' },
  },
]

const workflowSetupSteps: WorkflowSetupStep[] = [
  {
    label: '1',
    title: 'Choose the outcome',
    outcome: 'A campaign shell with objective, audience, topic/intent, message, KPI, UTM name, timing, and channels.',
    designerAction: 'Pick the closest campaign template, then replace the strategy prompts with plain-language specifics.',
    view: 'campaigns',
    terms: [workflowTerms[0], workflowTerms[5], workflowTerms[6], workflowTerms[7]],
  },
  {
    label: '2',
    title: 'Choose the path',
    outcome: 'A funnel with stages, next steps, CTA language, and destination links.',
    designerAction: 'Pick the visitor path that matches what someone should do after seeing the work.',
    view: 'funnels',
    terms: [workflowTerms[2], workflowTerms[4]],
  },
  {
    label: '3',
    title: 'Confirm the channel',
    outcome: 'The right formats are available, such as Instagram carousel, LinkedIn post, article, or email.',
    designerAction: 'Select or add the channel so the content type list is already constrained.',
    view: 'channels',
    terms: [workflowTerms[3]],
  },
  {
    label: '4',
    title: 'Create the content shell',
    outcome: 'A calendar item connected to the campaign, funnel, channel, brief, CTA, and working URL.',
    designerAction: 'Use a calendar template, then replace the prompts with artifact-specific details.',
    view: 'calendar',
    terms: [workflowTerms[1], workflowTerms[7]],
  },
  {
    label: '5',
    title: 'Attach measurement and links',
    outcome: 'Analytics, UTM naming, and any /links card are ready before the post goes live.',
    designerAction: 'Connect one analytics source and add a Quick Link when the post says link in bio.',
    view: 'analytics',
    terms: [workflowTerms[6], workflowTerms[8]],
  },
]

const MARKETING_SKILL_INSPIRATIONS = [
  {
    name: 'Content strategy',
    source: 'coreyhaines31/marketingskills',
    url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/content-strategy',
    lesson: 'Ask for business context, audience, content goals, and topic clusters before planning.',
  },
  {
    name: 'Social content',
    source: 'coreyhaines31/marketingskills',
    url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/social',
    lesson: 'Turn pillar content into platform-specific atoms, then schedule a realistic content calendar.',
  },
  {
    name: 'Analytics tracking',
    source: 'coreyhaines31/marketingskills',
    url: 'https://github.com/coreyhaines31/marketingskills/tree/main/skills/analytics',
    lesson: 'Start with the decision the data should inform, then pick one primary metric and consistent UTMs.',
  },
  {
    name: 'Marketing strategy and PMM',
    source: 'alirezarezvani/claude-skills',
    url: 'https://agent-skills.md/skills/alirezarezvani/claude-skills/marketing-strategy-pmm',
    lesson: 'Use positioning, ICP, launch planning, and GTM structure without exposing designers to jargon.',
  },
]

const WIZARD_RUNWAY_OPTIONS: SelectOption[] = [
  { title: 'One week', value: 'oneWeek' },
  { title: 'Two weeks', value: 'twoWeeks' },
  { title: 'One month', value: 'oneMonth' },
]

const WIZARD_CAPACITY_OPTIONS: SelectOption[] = [
  { title: 'Just one item', value: 'oneItem' },
  { title: 'Weekly carousel', value: 'weeklyCarousel' },
  { title: 'Multi-channel plan', value: 'multiChannel' },
]

const SINGLE_ITEM_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    title: 'Name the item',
    detail: 'Give the designer enough context to understand what they are making and who it should help.',
  },
  {
    title: 'Set the publishing shell',
    detail: 'Choose the destination, CTA, and success signal before anyone writes the post.',
  },
  {
    title: 'Create research project',
    detail: 'Create the research project first; campaign, funnel, calendar, and Quick Link records come from approved findings later.',
  },
]

const CAMPAIGN_PLAN_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    title: 'Set the strategy',
    detail: 'Name the campaign, audience, and objective in plain language.',
  },
  {
    title: 'Choose the runway',
    detail: 'Decide how much content the team can actually make and how long the plan should run.',
  },
  {
    title: 'Create research project',
    detail: 'Create the editable research project first, then convert approved findings into production records.',
  },
]

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'thought-leadership',
    title: 'Thought leadership push',
    description: 'For essays, frameworks, talks, and design POVs.',
    whenToUse: 'Use this when the work is idea-led: a point of view, design framework, research synthesis, talk, or artifact that helps people think differently.',
    campaignObjective: 'awareness',
    primaryGoal: 'Help the right audience understand a design idea clearly enough to share it, cite it, or ask us about related work.',
    primaryKpi: 'Qualified conversations or content engagement',
    audience: 'Design, product, healthcare, government, or enterprise leaders who need a clearer way to think about the topic.',
    topicCluster: 'Design point of view',
    searchIntent: 'learn',
    targetQueries: ['design framework', 'healthcare design ideas', 'service design examples'],
    positioning: 'Lead with the useful idea, show the artifact or example, then connect it to GoInvo experience without sounding salesy.',
    channels: ['website', 'linkedin', 'newsletter'],
    successMetrics: [
      { label: 'Qualified conversations', target: 'Track replies, inquiries, or direct follow-ups.' },
      { label: 'Content engagement', target: 'Track page views, scroll depth, clicks, saves, or shares.' },
    ],
    designerGuidance: [
      'Start with the artifact or diagram people should remember.',
      'Write the one-sentence idea before planning channels.',
      'Use social posts to expose the idea, then send people to the canonical article or resource.',
    ],
    notes: 'Designer prompt: collect the strongest visual artifact first, then write the campaign around what that artifact teaches.',
  },
  {
    id: 'case-study-release',
    title: 'Case study release',
    description: 'For publishing and promoting a new work story.',
    whenToUse: 'Use this when a project story is ready to become proof: a new case study, project update, client result, or portfolio-ready process story.',
    campaignObjective: 'qualifiedConversations',
    primaryGoal: 'Make a completed project easy to discover, understand, and reuse in sales or recruiting conversations.',
    primaryKpi: 'Case study visits from qualified channels',
    audience: 'Potential clients, partners, and peers who need evidence that GoInvo can solve this kind of problem.',
    topicCluster: 'Client proof and related capability',
    searchIntent: 'compare',
    targetQueries: ['case study', 'design case study', 'healthcare design case study'],
    positioning: 'Start with the client problem, show the design/system response, and end with the measurable or human result.',
    channels: ['website', 'linkedin', 'email'],
    successMetrics: [
      { label: 'Case study visits', target: 'Track visits to the canonical case study page.' },
      { label: 'Contact clicks', target: 'Track clicks from the case study or related posts to contact paths.' },
    ],
    designerGuidance: [
      'Choose one hero image, one process artifact, and one proof point.',
      'Make every promo asset answer the same client problem.',
      'Connect the case study to a related service, funnel, or contact path.',
    ],
    notes: 'Designer prompt: pick one hero image, one before/after or process image, and one concrete result before writing any promo copy.',
  },
  {
    id: 'service-awareness',
    title: 'Service awareness',
    description: 'For making a GoInvo capability easier to understand.',
    whenToUse: 'Use this when people need language for a capability: a service page, recurring client problem, capability refresh, or explanation of how design helps.',
    campaignObjective: 'serviceInterest',
    primaryGoal: 'Help visitors recognize a problem we can help with and move toward a relevant service page or conversation.',
    primaryKpi: 'Service page CTA engagement',
    audience: 'Decision makers and practitioners who know the problem but may not know the design approach or vocabulary yet.',
    topicCluster: 'GoInvo service capability',
    searchIntent: 'decide',
    targetQueries: ['healthcare service design', 'digital product design studio', 'complex systems design'],
    positioning: 'Name the problem plainly, show what good looks like, and provide a low-friction next step.',
    channels: ['website', 'linkedin', 'instagram'],
    successMetrics: [
      { label: 'Service page visits', target: 'Track traffic to the related service or landing page.' },
      { label: 'CTA engagement', target: 'Track clicks, replies, or consultation requests.' },
    ],
    designerGuidance: [
      'Name the practical problem before naming the service.',
      'Use examples, diagrams, and short explanations instead of sales language.',
      'Create a clear next step from content to service page to contact.',
    ],
    notes: 'Designer prompt: write this like a helpful explainer, not a pitch. Use sketches, diagrams, or snapshots where possible.',
  },
]

const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: 'content-to-conversation',
    title: 'Content to conversation',
    description: 'Default path from useful content to a real inquiry.',
    audience: 'People who find us through an article, case study, or shared social post.',
    conversionGoal: 'The visitor contacts GoInvo, joins an office-hours conversation, or shares enough context for follow-up.',
    stages: [
      {
        stage: 'awareness',
        goal: 'Make the idea visible and immediately useful.',
        offer: 'Article, carousel, short post, or talk clip',
        callToAction: 'Read more',
        metrics: ['Impressions', 'Page views', 'Engaged sessions'],
      },
      {
        stage: 'consideration',
        goal: 'Show evidence that GoInvo can solve this kind of problem.',
        offer: 'Case study, artifact, example, or framework',
        callToAction: 'See related work',
        metrics: ['Case study clicks', 'Time on page'],
      },
      {
        stage: 'conversion',
        goal: 'Give the visitor a clear, low-friction way to start a conversation.',
        offer: 'Contact, office hours, or short discovery prompt',
        callToAction: 'Talk with GoInvo',
        metrics: ['Contact clicks', 'Form starts', 'Replies'],
      },
    ],
  },
  {
    id: 'event-follow-up',
    title: 'Event follow-up',
    description: 'For talks, conferences, workshops, and open office hours.',
    audience: 'People who attended or saw a talk, workshop, or event mention.',
    conversionGoal: 'Turn event interest into saved content, a shared artifact, or a follow-up conversation.',
    stages: [
      {
        stage: 'awareness',
        goal: 'Remind people what the event covered.',
        offer: 'Recap post or slide takeaway',
        callToAction: 'Save the recap',
        metrics: ['Post engagement', 'Saves'],
      },
      {
        stage: 'interest',
        goal: 'Give attendees a concrete artifact they can use.',
        offer: 'Template, checklist, or annotated slides',
        callToAction: 'Use the resource',
        metrics: ['Resource clicks', 'Downloads'],
      },
      {
        stage: 'conversion',
        goal: 'Invite a direct follow-up while the topic is still fresh.',
        offer: 'Office hours or project discussion',
        callToAction: 'Book time',
        metrics: ['Booking clicks', 'Replies'],
      },
    ],
  },
  {
    id: 'link-in-bio-launch',
    title: 'Social post to link-in-bio',
    description: 'For Instagram or LinkedIn posts that need a clear path from post to source content.',
    audience: 'Social visitors who saw a post and need the right article, project, or resource without hunting for it.',
    conversionGoal: 'The visitor taps the relevant /links item, reaches the source content, and takes the next intended action.',
    stages: [
      {
        stage: 'awareness',
        goal: 'Make the post immediately understandable in-feed.',
        offer: 'Carousel, reel, story, or short social post',
        callToAction: 'Open Quick Links',
        metrics: ['Reach', 'Saves', 'Profile visits'],
      },
      {
        stage: 'interest',
        goal: 'Give the visitor a durable link that matches the post they just saw.',
        offer: 'Link-in-bio item connected to the calendar post',
        callToAction: 'Open the source',
        metrics: ['Link clicks', 'Click-through rate'],
      },
      {
        stage: 'consideration',
        goal: 'Help the visitor understand the deeper idea, project, or proof.',
        offer: 'Article, case study, project page, or external resource',
        callToAction: 'Read the full piece',
        metrics: ['Engaged sessions', 'Scroll depth', 'Outbound clicks'],
      },
      {
        stage: 'conversion',
        goal: 'Offer a natural next step if the topic matches a real need.',
        offer: 'Contact page, office hours, or related service page',
        callToAction: 'Talk with GoInvo',
        metrics: ['Contact clicks', 'Replies', 'Booked calls'],
      },
    ],
  },
  {
    id: 'case-study-proof',
    title: 'Case study proof path',
    description: 'For turning a work story into evidence that supports outreach and sales conversations.',
    audience: 'Prospective clients or partners who need proof that GoInvo can handle a similar challenge.',
    conversionGoal: 'The visitor understands the work, sees credible evidence, and starts a project conversation.',
    stages: [
      {
        stage: 'awareness',
        goal: 'Introduce the problem and why it matters.',
        offer: 'Launch post, visual teaser, or client problem snapshot',
        callToAction: 'See what changed',
        metrics: ['Impressions', 'Post engagement'],
      },
      {
        stage: 'consideration',
        goal: 'Show the design response and why it worked.',
        offer: 'Case study page, process artifact, before/after, or result visual',
        callToAction: 'View the case study',
        metrics: ['Case study visits', 'Time on page'],
      },
      {
        stage: 'consideration',
        goal: 'Connect the proof to a buyer problem or service need.',
        offer: 'Related service page, capability summary, or comparable work',
        callToAction: 'Explore this capability',
        metrics: ['Service page clicks', 'Related work clicks'],
      },
      {
        stage: 'conversion',
        goal: 'Make it easy to start a scoped conversation.',
        offer: 'Contact form, intro email, or project prompt',
        callToAction: 'Start a conversation',
        metrics: ['Contact starts', 'Qualified inquiries'],
      },
    ],
  },
  {
    id: 'service-education',
    title: 'Service education path',
    description: 'For explaining a GoInvo capability to people who know the problem but not the method.',
    audience: 'Teams who have a complex product, service, or systems problem and need language for how design helps.',
    conversionGoal: 'The visitor recognizes the capability, trusts the approach, and moves to a relevant service or contact path.',
    stages: [
      {
        stage: 'awareness',
        goal: 'Name the problem in plain language.',
        offer: 'Short explainer, diagram, or pain-point post',
        callToAction: 'Learn the approach',
        metrics: ['Reach', 'Page views'],
      },
      {
        stage: 'interest',
        goal: 'Give designers and decision makers a practical framework.',
        offer: 'Article, checklist, framework, or visual model',
        callToAction: 'Use the framework',
        metrics: ['Saves', 'Downloads', 'Engaged sessions'],
      },
      {
        stage: 'consideration',
        goal: 'Show examples that make the service concrete.',
        offer: 'Related case studies, sample artifacts, or process examples',
        callToAction: 'See examples',
        metrics: ['Related work clicks', 'Time on page'],
      },
      {
        stage: 'conversion',
        goal: 'Invite the visitor to bring a similar problem to GoInvo.',
        offer: 'Service page CTA, contact, or open office hours',
        callToAction: 'Discuss your problem',
        metrics: ['CTA clicks', 'Form starts'],
      },
    ],
  },
  {
    id: 'open-source-adoption',
    title: 'Open-source adoption',
    description: 'For moving someone from discovering a public tool or artifact to using or sharing it.',
    audience: 'Practitioners, designers, researchers, and civic/health teams who can reuse an open artifact.',
    conversionGoal: 'The visitor opens the resource, understands how to use it, and shares or adapts it.',
    stages: [
      {
        stage: 'awareness',
        goal: 'Expose the artifact and the problem it solves.',
        offer: 'Launch post, visual preview, or short demo',
        callToAction: 'Open the resource',
        metrics: ['Impressions', 'Resource visits'],
      },
      {
        stage: 'interest',
        goal: 'Make the artifact easy to evaluate quickly.',
        offer: 'Documentation, example use case, preview image, or demo video',
        callToAction: 'See how it works',
        metrics: ['Docs visits', 'Demo plays', 'Scroll depth'],
      },
      {
        stage: 'conversion',
        goal: 'Help someone adopt or adapt the work.',
        offer: 'Download, GitHub repo, template, or usage guide',
        callToAction: 'Use the tool',
        metrics: ['Downloads', 'Repo clicks', 'Template copies'],
      },
      {
        stage: 'advocacy',
        goal: 'Encourage reuse, citation, contribution, or direct feedback.',
        offer: 'Feedback prompt, contribution path, or related open work',
        callToAction: 'Share what you make',
        metrics: ['Shares', 'Feedback threads', 'Contributions'],
      },
    ],
  },
]

const marketingAiAssistCopy: Record<
  MarketingAssistKind,
  {
    target: string
    prompt: string
    fills: string[]
  }
> = {
  campaign: {
    target: 'campaign strategy',
    prompt: 'Example: Launch Housing Truths for civic design leaders, mostly through Instagram and the website.',
    fills: ['objective', 'audience', 'KPI', 'topic cluster', 'target queries', 'positioning', 'UTM name'],
  },
  funnel: {
    target: 'funnel path',
    prompt: 'Example: Move someone from an Instagram carousel to the source article, then to related work or contact.',
    fills: ['audience', 'conversion goal', 'stages', 'offers', 'CTAs', 'metrics'],
  },
  calendarItem: {
    target: 'calendar item',
    prompt: 'Example: Turn the Housing Truths article into a carousel for Instagram next Tuesday.',
    fills: ['title', 'channel', 'content type', 'funnel stage', 'brief', 'CTA', 'tracking name'],
  },
  channel: {
    target: 'channel setup',
    prompt: 'Example: Set up Instagram with the formats designers should be able to schedule.',
    fills: ['platform', 'default funnel stage', 'description', 'managed content types'],
  },
  analyticsSource: {
    target: 'analytics source',
    prompt: 'Example: Use Vercel Analytics to understand which campaigns and quick links send useful visits.',
    fills: ['provider', 'reporting cadence', 'setup notes', 'key metrics'],
  },
  linkItem: {
    target: 'Quick Link',
    prompt: 'Example: Add Housing Truths as the link-in-bio destination for the Instagram post.',
    fills: ['title', 'description', 'type', 'promoted-from channel'],
  },
  template: {
    target: 'campaign or funnel template',
    prompt: 'Example: Make a reusable Instagram-to-article campaign template for designers launching new visual essays.',
    fills: ['when to use', 'audience', 'starter fields', 'metrics', 'designer guidance', 'funnel stages'],
  },
  researchProject: {
    target: 'research project',
    prompt: 'Example: Research whether Housing Truths should become an Instagram content runway, starting with SEO and source scans.',
    fills: ['directive', 'audience', 'seed keywords', 'seed URLs', 'methods', 'research questions', 'collaborators'],
  },
  researchSynthesis: {
    target: 'research synthesis',
    prompt: 'Example: Use the selected SEO and source results to recommend the next content opportunity, but do not schedule it yet.',
    fills: ['missing inputs', 'selected result IDs', 'opportunities', 'release recommendation'],
  },
  researchPlan: {
    target: 'research and release plan',
    prompt: 'Example: Build a two-week release plan around a new housing data essay, with an intern helping on research and visuals.',
    fills: ['summary', 'SEO targets', 'collaborators', 'release windows', 'content opportunities', 'measurement goals'],
  },
  strategyAsset: {
    target: 'strategy foundation',
    prompt: 'Example: Create an audience profile, proof point, CTA, or tracking rule designers can reuse before making content.',
    fills: ['audience', 'message', 'proof', 'CTA', 'tracking rule', 'quality gate', 'experiment', 'performance signal'],
  },
}

const styles = {
  shell: {
    minHeight: '100%',
    padding: 24,
    color: 'var(--card-fg-color)',
    background: 'var(--card-bg-color)',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  page: {
    maxWidth: 1380,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  kicker: {
    color: '#007385',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  h1: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 800,
  },
  subtitle: {
    margin: '10px 0 0',
    maxWidth: 720,
    color: 'var(--card-muted-fg-color)',
    fontSize: 15,
    lineHeight: 1.6,
  },
  nav: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 18,
  },
  card: {
    background: 'var(--card-bg-color)',
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    boxShadow: '0 10px 26px rgba(0, 0, 0, 0.08)',
  },
  panel: {
    background: 'var(--card-bg-color)',
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    padding: 18,
  },
  muted: {
    color: 'var(--card-muted-fg-color)',
  },
  small: {
    fontSize: 12,
    lineHeight: 1.45,
  },
  input: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid var(--card-border-color)',
    background: 'var(--card-bg-color)',
    color: 'var(--card-fg-color)',
    font: 'inherit',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--card-muted-fg-color)',
    marginBottom: 6,
  },
  button: {
    border: '1px solid var(--card-border-color)',
    background: 'var(--card-bg-color)',
    color: 'var(--card-fg-color)',
    borderRadius: 6,
    padding: '9px 12px',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineLink: {
    color: '#007385',
    fontWeight: 800,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    justifySelf: 'start',
  },
  primaryButton: {
    border: '1px solid #007385',
    background: '#007385',
    color: '#fff',
    borderRadius: 6,
    padding: '10px 14px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  guidePanel: {
    background: MARKETING_OPAQUE_CARD_BG,
    border: '1px solid rgba(0, 115, 133, 0.28)',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 18px 46px rgba(0, 0, 0, 0.18)',
  },
  guideWidget: {
    position: 'fixed',
    right: 24,
    bottom: 24,
    zIndex: 50,
    display: 'grid',
    justifyItems: 'end',
    gap: 10,
    maxWidth: 'calc(100vw - 48px)',
  },
  guidePopover: {
    background: MARKETING_OPAQUE_CARD_BG,
    width: 520,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
  },
  guideToggle: {
    border: '1px solid rgba(0, 115, 133, 0.35)',
    background: '#007385',
    color: '#fff',
    borderRadius: 999,
    padding: '11px 16px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
  },
  templateButton: {
    border: '1px solid var(--card-border-color)',
    background: 'var(--card-bg-color)',
    color: 'var(--card-fg-color)',
    borderRadius: 6,
    padding: 10,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: 4,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'rgba(10, 12, 20, 0.64)',
  },
  modalPanel: {
    width: 720,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'calc(100vh - 48px)',
    overflow: 'auto',
    background: 'var(--card-bg-color)',
    color: 'var(--card-fg-color)',
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.32)',
    padding: 18,
  },
} satisfies Record<string, CSSProperties>

function MarketingComponent() {
  const client = useClient({ apiVersion: API_VERSION })
  const [view, setView] = useState<MarketingViewId>('dashboard')
  const [data, setData] = useState<MarketingData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [workflowTutorialRequest, setWorkflowTutorialRequest] = useState(0)
  const [workflowTutorialLibraryRequest, setWorkflowTutorialLibraryRequest] = useState(0)
  const [workflowTutorialId, setWorkflowTutorialId] = useState(defaultDesignerWorkflowTutorial.id)
  const [workflowTutorialDemoRecommendation, setWorkflowTutorialDemoRecommendation] = useState(false)

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const nextData = await client.fetch<MarketingData>(MARKETING_QUERY)
      setData({
        calendarItems: nextData.calendarItems || [],
        campaigns: nextData.campaigns || [],
        funnels: nextData.funnels || [],
        analyticsSources: nextData.analyticsSources || [],
        audienceProfiles: nextData.audienceProfiles || [],
        messagePillars: nextData.messagePillars || [],
        proofPoints: nextData.proofPoints || [],
        ctas: nextData.ctas || [],
        trackingRules: nextData.trackingRules || [],
        qualityGates: nextData.qualityGates || [],
        experiments: nextData.experiments || [],
        performanceSignals: nextData.performanceSignals || [],
        channels: nextData.channels || [],
        linkItems: nextData.linkItems || [],
        researchProjects: nextData.researchProjects || [],
        researchResults: nextData.researchResults || [],
        researchRuns: nextData.researchRuns || [],
        researchPlans: nextData.researchPlans || [],
        templates: nextData.templates || [],
      })
      setLastLoaded(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to load marketing data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load marketing data.')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const requestedTutorial = new URLSearchParams(window.location.search).get('designerWorkflowTutorial')
    if (requestedTutorial) {
      setWorkflowTutorialId(getDesignerWorkflowTutorial(requestedTutorial).id)
      setWorkflowTutorialDemoRecommendation(requestedTutorial === 'designer-workflow-recommendation')
      setWorkflowTutorialRequest((current) => current + 1)
      return
    }
    if (hasDesignerWorkflowTutorialCompleted(defaultDesignerWorkflowTutorial.id)) return
    const timer = window.setTimeout(() => {
      setWorkflowTutorialId(defaultDesignerWorkflowTutorial.id)
      setWorkflowTutorialDemoRecommendation(false)
      setWorkflowTutorialRequest((current) => current + 1)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [])

  const commitPatch = useCallback(
    async (id: string, set: Record<string, unknown>, unset: string[] = []) => {
      setSavingId(id)
      try {
        let patch = client.patch(id)
        if (Object.keys(set).length > 0) patch = patch.set(set)
        if (unset.length > 0) patch = patch.unset(unset)
        await patch.commit()
        await loadData()
      } finally {
        setSavingId(null)
      }
    },
    [client, loadData],
  )

  const createDocument = useCallback(
    async (document: MarketingDocumentInput) => {
      setSavingId('new')
      try {
        const created = await client.create(document)
        await loadData()
        return created._id
      } finally {
        setSavingId(null)
      }
    },
    [client, loadData],
  )

  const generateCarouselSetup = useCallback(
    async (questionnaire: MarketingPlanQuestionnaire) => {
      setSavingId(`carousel-${slugify(questionnaire.topic || 'item')}`)
      try {
        const result = await generateInstagramCarouselSetup(client, data, questionnaire)
        await loadData()
        return result
      } finally {
        setSavingId(null)
      }
    },
    [client, data, loadData],
  )

  const generateMarketingPlan = useCallback(
    async (questionnaire: MarketingPlanQuestionnaire) => {
      setSavingId(`marketing-plan-${slugify(questionnaire.topic || 'plan')}`)
      try {
        const result = await generateQuestionnaireMarketingPlan(client, data, questionnaire)
        await loadData()
        return result
      } finally {
        setSavingId(null)
      }
    },
    [client, data, loadData],
  )

  const activeView = MARKETING_TOOL_VIEWS.find((candidate) => candidate.id === view) || MARKETING_TOOL_VIEWS[0]
  const attentionItems = useMemo(() => (loading ? [] : getMarketingAttentionItems(data)), [data, loading])
  const attentionCount = attentionItems.length

  return (
    <div data-marketing-tool="true" style={styles.shell}>
      <style>{MARKETING_CONTROL_CSS}</style>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Marketing</h1>
            <p style={styles.subtitle}>
              Plan strategy, research, publishing, channels, and public links from one operational workspace.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {lastLoaded && <span style={{ ...styles.muted, ...styles.small }}>Updated {lastLoaded}</span>}
            <a href="/studio/getting-started?article=marketing.overview" style={styles.button}>
              Marketing guide
              <LaunchIcon style={{ width: 15, height: 15 }} />
            </a>
            <button
              type="button"
              aria-label={`${attentionCount} marketing item${attentionCount === 1 ? '' : 's'} need attention`}
              style={{
                ...styles.button,
                position: 'relative',
                width: 38,
                height: 38,
                padding: 0,
                borderColor: view === 'attention' ? '#E36216' : 'var(--card-border-color)',
                color: view === 'attention' ? '#E36216' : 'var(--card-fg-color)',
              }}
              onClick={() => {
                setView('attention')
                setActionsOpen(false)
              }}
            >
              <BellIcon style={{ width: 18, height: 18 }} />
              {attentionCount > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    minWidth: 20,
                    height: 20,
                    padding: '0 5px',
                    borderRadius: 999,
                    background: '#E36216',
                    color: '#fff',
                    border: '2px solid var(--card-bg-color)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {attentionCount}
                </span>
              )}
            </button>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="Open marketing actions"
                aria-expanded={actionsOpen}
                style={{ ...styles.button, width: 38, height: 38, padding: 0, fontSize: 20, lineHeight: 1 }}
                onClick={() => setActionsOpen((current) => !current)}
              >
                <EllipsisHorizontalIcon style={{ width: 20, height: 20 }} />
              </button>
              {actionsOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 20,
                    minWidth: 180,
                    ...styles.card,
                    padding: 6,
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      setView('analytics')
                      setActionsOpen(false)
                    }}
                  >
                    Analytics
                    <TrendUpwardIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      setView('templates')
                      setActionsOpen(false)
                    }}
                  >
                    Templates
                    <DashboardIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      setActionsOpen(false)
                      setWorkflowTutorialLibraryRequest((current) => current + 1)
                    }}
                  >
                    Designer Workflow tutorials
                    <SearchIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      setActionsOpen(false)
                      void loadData()
                    }}
                  >
                    Refresh
                    <RefreshIcon style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav style={styles.nav} aria-label="Marketing sections">
          {MARKETING_TOOL_VIEWS.filter((candidate) => PRIMARY_MARKETING_VIEW_IDS.includes(candidate.id)).map((candidate) => (
            <MarketingNavButton
              key={candidate.id}
              view={candidate}
              active={candidate.id === activeView.id}
              onClick={() => setView(candidate.id)}
            />
          ))}
        </nav>

        {!loading && (
          <MarketingGuidanceWidget
            data={data}
            savingId={savingId}
        tutorialRequest={workflowTutorialRequest}
        tutorialLibraryRequest={workflowTutorialLibraryRequest}
        tutorialId={workflowTutorialId}
        tutorialDemoRecommendation={workflowTutorialDemoRecommendation}
        onOpenView={setView}
            onGenerateInstagramCarousel={generateCarouselSetup}
            onGenerateMarketingPlan={generateMarketingPlan}
          />
        )}

        {error && (
          <div style={{ ...styles.panel, borderColor: 'rgba(227, 98, 22, 0.45)', marginBottom: 16 }}>
            <strong>Marketing data could not load.</strong>
            <div style={{ ...styles.muted, marginTop: 4 }}>{error}</div>
          </div>
        )}

        {loading ? (
          <div style={styles.panel}>Loading marketing workspace...</div>
        ) : (
          <>
            {view === 'dashboard' && <MarketingDashboard data={data} onOpenView={setView} />}
            {view === 'attention' && <MarketingAttentionWorkspace items={attentionItems} onOpenView={setView} />}
            {view === 'strategy' && (
              <StrategyWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={loadData}
                commitPatch={commitPatch}
              />
            )}
            {view === 'research' && (
              <ResearchWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={loadData}
                commitPatch={commitPatch}
                onOpenView={setView}
              />
            )}
            {view === 'calendar' && (
              <CalendarWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
                onOpenChannels={() => setView('channels')}
              />
            )}
            {view === 'campaigns' && (
              <CampaignWorkspace
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
              />
            )}
            {view === 'funnels' && (
              <FunnelWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={loadData}
                commitPatch={commitPatch}
              />
            )}
            {view === 'templates' && (
              <TemplateWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={loadData}
                commitPatch={commitPatch}
              />
            )}
            {view === 'channels' && (
              <ChannelWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={loadData}
                commitPatch={commitPatch}
              />
            )}
            {view === 'analytics' && (
              <AnalyticsWorkspace
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
              />
            )}
            {view === 'linkTree' && (
              <LinkTreeWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MarketingNavButton({
  view,
  active,
  onClick,
}: {
  view: (typeof MARKETING_TOOL_VIEWS)[number]
  active: boolean
  onClick: () => void
}) {
  const Icon = view.icon

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.card,
        textAlign: 'left',
        padding: 16,
        cursor: 'pointer',
        color: 'var(--card-fg-color)',
        background: active ? 'rgba(0, 115, 133, 0.12)' : 'var(--card-bg-color)',
        borderColor: active ? '#007385' : 'var(--card-border-color)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Icon style={{ width: 20, height: 20, color: active ? '#007385' : 'var(--card-muted-fg-color)' }} />
        <strong>{view.title}</strong>
      </div>
      <div style={{ ...styles.muted, ...styles.small }}>{view.description}</div>
    </button>
  )
}

function MarketingDashboard({
  data,
  onOpenView,
}: {
  data: MarketingData
  onOpenView: (view: MarketingViewId) => void
}) {
  const stats = useMemo(() => getMarketingDashboardStats(data), [data])
  const gaps = useMemo(() => getMarketingDashboardGaps(data), [data])
  const analyticsStats = useMemo(() => getAnalyticsReadinessStats(data), [data])
  const runwayCopy =
    stats.contentRunwayDays > 0
      ? `We have ${stats.contentRunwayDays} day${stats.contentRunwayDays === 1 ? '' : 's'} of content mapped.`
      : 'We do not have upcoming content mapped yet.'
  const upcomingItems = stats.upcomingItems.slice(0, 6)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, maxWidth: 760 }}>
            <div style={{ ...styles.kicker, marginBottom: 6 }}>Overview</div>
            <h2 style={{ margin: 0, fontSize: 26 }}>{runwayCopy}</h2>
            <p style={{ ...styles.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
              The dashboard translates the CMS into operational signals: how long the current plan lasts, where the strategy is thin, and which setup gaps will make content harder to judge later.
            </p>
          </div>
          <button type="button" style={styles.primaryButton} onClick={() => onOpenView('calendar')}>
            Open calendar
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 16 }}>
          <AnalyticsMetricCard
            label="Content runway"
            value={`${stats.contentRunwayDays}`}
            detail={
              stats.lastUpcomingDate
                ? `planned through ${formatDashboardDate(stats.lastUpcomingDate)}`
                : 'no future items scheduled'
            }
          />
          <AnalyticsMetricCard
            label="Scheduled items"
            value={`${stats.upcoming30Items.length}`}
            detail={`${stats.coveredDaysNext30}/30 days have content`}
          />
          <AnalyticsMetricCard
            label="Active campaigns"
            value={`${stats.activeCampaigns}/${data.campaigns.length}`}
            detail={`${stats.campaignsWithUpcomingContent} with upcoming content`}
          />
          <AnalyticsMetricCard
            label="Measurement"
            value={`${analyticsStats.readinessScore}%`}
            detail={`${analyticsStats.connectedMeasurementTargets}/${analyticsStats.measurementTargets} work items connected`}
          />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <section style={styles.panel}>
          <PanelHeading
            title="Strategy gaps and why they matter"
            description="Prioritized gaps from calendar coverage, campaign setup, funnels, Quick Links, and analytics."
          />
          {gaps.length === 0 ? (
            <EmptyInline title="No strategic gaps are flagged right now." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {gaps.slice(0, 8).map((gap) => {
                const tone = getDashboardGapTone(gap.severity)
                const viewTitle = getMarketingViewTitle(gap.view)

                return (
                  <article
                    key={gap.id}
                    style={{
                      border: `1px solid ${tone.border}`,
                      borderRadius: 8,
                      background: tone.bg,
                      padding: 12,
                      display: 'grid',
                      gap: 9,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', fontSize: 14 }}>{gap.title}</strong>
                        <div style={{ ...styles.small, ...styles.muted, marginTop: 4, lineHeight: 1.5 }}>
                          <strong style={{ color: 'var(--card-fg-color)' }}>Why it matters: </strong>
                          {gap.why}
                        </div>
                      </div>
                      <span
                        style={{
                          display: 'inline-flex',
                          flex: '0 0 auto',
                          border: `1px solid ${tone.border}`,
                          borderRadius: 999,
                          color: tone.fg,
                          background: 'var(--card-bg-color)',
                          padding: '3px 8px',
                          fontSize: 12,
                          fontWeight: 800,
                          textTransform: 'capitalize',
                        }}
                      >
                        {gap.severity}
                      </span>
                    </div>
                    <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.5 }}>
                      <strong style={{ color: 'var(--card-fg-color)' }}>Next: </strong>
                      {gap.action}
                    </div>
                    {gap.affected && gap.affected.length > 0 && (
                      <div style={{ ...styles.small, ...styles.muted }}>
                        <strong style={{ color: 'var(--card-fg-color)' }}>Affects: </strong>
                        {gap.affected.join(', ')}
                      </div>
                    )}
                    <button
                      type="button"
                      style={{ ...styles.button, justifySelf: 'start', padding: '6px 9px', fontSize: 12 }}
                      onClick={() => onOpenView(gap.view)}
                    >
                      Open {viewTitle}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section style={styles.panel}>
          <PanelHeading
            title="Upcoming content"
            description="The next planned items that make up the current content runway."
          />
          {upcomingItems.length === 0 ? (
            <EmptyInline title="No upcoming calendar items yet." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {upcomingItems.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  style={{
                    ...styles.templateButton,
                    borderColor: item.campaign?._id ? 'var(--card-border-color)' : 'rgba(227, 98, 22, 0.42)',
                  }}
                  onClick={() => onOpenView('calendar')}
                >
                  <span style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>
                    {formatDashboardDate(item.publishAt)}
                  </span>
                  <strong style={{ fontSize: 14 }}>{item.title || 'Untitled content item'}</strong>
                  <span style={{ ...styles.small, ...styles.muted }}>
                    {[
                      item.channelRef?.title || labelFor(getChannelOptions(data.channels), item.channel) || 'No channel',
                      labelFor(contentTypeOptions, item.contentType) || 'No type',
                      item.campaign?.title || 'No campaign',
                    ].join(' / ')}
                  </span>
                  <StatusPill status={item.status} options={calendarStatusOptions} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={styles.panel}>
        <PanelHeading
          title="Channel coverage"
          description="A quick read on whether active channels have visible work coming up in the next 30 days."
        />
        {stats.channelCoverage.length === 0 ? (
          <EmptyInline title="Add channels to see channel coverage." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {stats.channelCoverage.map((channel) => (
              <article
                key={channel.key}
                style={{
                  border: '1px solid var(--card-border-color)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'grid',
                  gap: 4,
                  background: channel.upcoming30Count === 0 ? 'rgba(227, 98, 22, 0.08)' : 'var(--card-bg-color)',
                }}
              >
                <strong>{channel.title}</strong>
                <div style={{ ...styles.small, ...styles.muted }}>
                  {channel.upcoming30Count} item{channel.upcoming30Count === 1 ? '' : 's'} in the next 30 days
                </div>
                <div style={{ ...styles.small, color: channel.upcoming30Count === 0 ? '#E36216' : '#007385', fontWeight: 800 }}>
                  {channel.upcoming30Count === 0 ? 'Coverage gap' : 'Covered'}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MarketingAttentionWorkspace({
  items,
  onOpenView,
}: {
  items: MarketingAttentionItem[]
  onOpenView: (view: MarketingViewId) => void
}) {
  const severitySummary: Array<{ severity: MarketingAttentionItem['severity']; label: string }> = [
    { severity: 'content', label: 'Content tasks' },
    { severity: 'measurement', label: 'Measurement tasks' },
    { severity: 'setup', label: 'Setup tasks' },
  ]

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={styles.kicker}>Needs Attention</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Open marketing tasks</h2>
            <p style={{ ...styles.subtitle, marginTop: 8 }}>
              These are the gaps that can block designers from getting straight to content writing.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {severitySummary.map(({ severity, label }) => {
              const count = items.filter((item) => item.severity === severity).length
              const tone = getDashboardGapTone(severity)
              return (
                <span
                  key={severity}
                  style={{
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    color: tone.fg,
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {count} {label}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyInline title="Nothing needs attention right now." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => {
            const tone = getDashboardGapTone(item.severity)
            return (
              <article
                key={item.id}
                style={{
                  ...styles.card,
                  borderColor: tone.border,
                  background: tone.bg,
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...styles.small, color: tone.fg, fontWeight: 800, textTransform: 'capitalize', marginBottom: 4 }}>
                      {item.severity}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 17 }}>{item.title}</h3>
                    <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0' }}>{item.detail}</p>
                  </div>
                  <button type="button" style={styles.button} onClick={() => onOpenView(item.view)}>
                    Open {getMarketingViewTitle(item.view)}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

type StrategyDocument =
  | MarketingAudienceProfile
  | MarketingMessagePillar
  | MarketingProofPoint
  | MarketingCta
  | MarketingTrackingRule
  | MarketingQualityGate
  | MarketingExperiment
  | MarketingPerformanceSignal

type StrategySectionConfig = {
  id: StrategyAssetKind
  title: string
  singular: string
  documentType: string
  why: string
  when: string
  affects: string
}

const STRATEGY_SECTIONS: StrategySectionConfig[] = [
  {
    id: 'audiences',
    title: 'Audiences',
    singular: 'audience',
    documentType: 'marketingAudienceProfile',
    why: 'Audience profiles prevent generic captions and help designers choose the right proof, CTA, and tone.',
    when: 'Use before research, campaigns, funnels, and content drafts when the work needs a clear person in mind.',
    affects: 'Research questions, campaign goals, message pillars, CTAs, Quick Links, and content drafts.',
  },
  {
    id: 'messages',
    title: 'Messages',
    singular: 'message pillar',
    documentType: 'marketingMessagePillar',
    why: 'Message pillars give designers durable claims and approved language so each post is not a blank strategy exercise.',
    when: 'Use when a topic should repeat across multiple assets, channels, or release windows.',
    affects: 'Campaign positioning, content briefs, captions, page copy, and AI draft generation.',
  },
  {
    id: 'proof',
    title: 'Proof',
    singular: 'proof point',
    documentType: 'marketingProofPoint',
    why: 'Proof points keep claims source-aware and reusable, which is especially important before visual content is published.',
    when: 'Use when a message needs evidence, a statistic, a quote, a case artifact, or a research result.',
    affects: 'Research synthesis, campaign claims, content quality checks, and alt text/source review.',
  },
  {
    id: 'ctas',
    title: 'CTAs',
    singular: 'CTA',
    documentType: 'marketingCta',
    why: 'A CTA ladder makes the next step explicit instead of ending every asset with a vague learn-more path.',
    when: 'Use whenever content should move someone from attention to a useful destination or conversation.',
    affects: 'Funnels, calendar items, Quick Links, campaign measurement, and content drafts.',
  },
  {
    id: 'tracking',
    title: 'Tracking',
    singular: 'tracking rule',
    documentType: 'marketingTrackingRule',
    why: 'Tracking rules keep UTM naming consistent so performance can be compared without rebuilding analytics each time.',
    when: 'Use before publishing promoted links, Quick Links, campaign URLs, or multi-channel content.',
    affects: 'Campaign UTMs, Quick Links, analytics review, and performance signals.',
  },
  {
    id: 'quality',
    title: 'Quality Gates',
    singular: 'quality gate',
    documentType: 'marketingQualityGate',
    why: 'Quality gates make review visible: source safety, claims, accessibility, CTA, tracking, and readiness.',
    when: 'Use before scheduled or published content. V1 warns and guides; it does not hard-block publishing.',
    affects: 'Calendar readiness, content drafts, campaign review, source checks, and accessibility.',
  },
  {
    id: 'experiments',
    title: 'Experiments',
    singular: 'experiment',
    documentType: 'marketingExperiment',
    why: 'Experiments turn uncertainty into a testable hypothesis instead of quietly changing strategy by taste.',
    when: 'Use when trying a new hook, CTA, channel, destination, or format and watching a specific signal.',
    affects: 'Campaign decisions, calendar iteration, analytics interpretation, and future templates.',
  },
  {
    id: 'performance',
    title: 'Performance Signals',
    singular: 'performance signal',
    documentType: 'marketingPerformanceSignal',
    why: 'Performance signals store manually reviewed first-party evidence before it becomes a research result or strategy update.',
    when: 'Use when GSC, GA4, Instagram, Vercel, or manual observations suggest the plan should change.',
    affects: 'Research analytics review, dashboard gaps, experiments, and strategy adjustments.',
  },
]

const audiencePriorityOptions: SelectOption[] = [
  { title: 'Primary', value: 'primary' },
  { title: 'Secondary', value: 'secondary' },
  { title: 'Niche / Experimental', value: 'niche' },
  { title: 'Paused', value: 'paused' },
]
const proofTypeOptions: SelectOption[] = [
  { title: 'Statistic', value: 'statistic' },
  { title: 'Quote', value: 'quote' },
  { title: 'Case Evidence', value: 'caseEvidence' },
  { title: 'Research Finding', value: 'researchFinding' },
  { title: 'Visual Artifact', value: 'visualArtifact' },
  { title: 'Team Knowledge', value: 'teamKnowledge' },
  { title: 'Other', value: 'other' },
]
const ctaPriorityOptions: SelectOption[] = [
  { title: 'Primary', value: 'primary' },
  { title: 'Secondary', value: 'secondary' },
  { title: 'Contextual', value: 'contextual' },
  { title: 'Experimental', value: 'experimental' },
]
const documentStatusOptions: SelectOption[] = [
  { title: 'Active', value: 'active' },
  { title: 'Draft', value: 'draft' },
  { title: 'Archived', value: 'archived' },
]
const experimentStatusOptions: SelectOption[] = [
  { title: 'Idea', value: 'idea' },
  { title: 'Running', value: 'running' },
  { title: 'Reviewing', value: 'reviewing' },
  { title: 'Decided', value: 'decided' },
  { title: 'Archived', value: 'archived' },
]
const experimentDecisionOptions: SelectOption[] = [
  { title: 'Keep', value: 'keep' },
  { title: 'Iterate', value: 'iterate' },
  { title: 'Stop', value: 'stop' },
  { title: 'Inconclusive', value: 'inconclusive' },
]
const performanceProviderOptions: SelectOption[] = [
  { title: 'Google Search Console', value: 'gsc' },
  { title: 'GA4', value: 'ga4' },
  { title: 'Instagram', value: 'instagram' },
  { title: 'Vercel Analytics', value: 'vercel' },
  { title: 'Manual', value: 'manual' },
  { title: 'Other', value: 'other' },
]
const performanceStatusOptions: SelectOption[] = [
  { title: 'New', value: 'new' },
  { title: 'Reviewed', value: 'reviewed' },
  { title: 'Suggests Strategy Update', value: 'suggestsUpdate' },
  { title: 'Archived', value: 'archived' },
]
const confidenceOptions = researchConfidenceOptions

function StrategyWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [workspaceMode, setWorkspaceMode] = useState<StrategyWorkspaceMode>('foundation')
  const [sectionId, setSectionId] = useState<StrategyAssetKind>('audiences')
  const section = STRATEGY_SECTIONS.find((candidate) => candidate.id === sectionId) || STRATEGY_SECTIONS[0]
  const items = getStrategySectionItems(data, section.id)
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?._id || null)
  const selected = items.find((item) => item._id === selectedId) || items[0] || null
  const [draft, setDraft] = useState<Record<string, unknown>>(selected ? { ...selected } : {})
  const [fillLoading, setFillLoading] = useState(false)
  const [fillMessage, setFillMessage] = useState('')
  const [fillError, setFillError] = useState('')
  const [fillGuidance, setFillGuidance] = useState<Record<string, string>>({})
  const [fillNotes, setFillNotes] = useState('')

  useEffect(() => {
    const nextItems = getStrategySectionItems(data, sectionId)
    const nextSelected = nextItems.find((item) => item._id === selectedId) || nextItems[0] || null
    setSelectedId(nextSelected?._id || null)
    setDraft(nextSelected ? { ...nextSelected } : {})
  }, [data, sectionId, selectedId])

  useEffect(() => {
    setFillMessage('')
    setFillError('')
  }, [sectionId, selectedId])

  const readiness = getStrategyReadiness(data)
  const researchResultsForFill = useMemo(() => getStrategyResearchResults(data), [data])
  const approvedResearchCount = useMemo(() => data.researchResults.filter(isResearchResultApproved).length, [data.researchResults])

  const handleAdd = async () => {
    const createdId = await createDocument(buildEmptyStrategyDocument(section))
    if (createdId) setSelectedId(createdId)
  }

  const handleSave = async () => {
    if (!selected) return
    await commitPatch(selected._id, buildStrategyPatch(section.id, draft))
  }

  const handleFillFromResearch = async () => {
    if (!selected) {
      setFillError(`Add or select a ${section.singular} before filling it from research.`)
      return
    }
    if (researchResultsForFill.length === 0) {
      setFillError('Run or approve research first, then use it to fill strategy fields.')
      return
    }

    setFillLoading(true)
    setFillMessage('')
    setFillError('')
    const fallbackDraft = buildStrategyDraftFromResearch(section.id, data, draft)

    try {
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'strategyAsset',
          draft: {
            ...buildStrategyResearchAssistDraft(section.id, draft, data),
            autofillGuidance: fillGuidance,
          },
          prompt: buildAutofillGuidedPrompt({
            basePrompt: `Fill the selected ${section.singular} from approved Research findings. Use the supplied research results as evidence and keep fields concise enough for designers to review before saving.`,
            guidance: fillGuidance,
            notes: fillNotes,
            questions: getStrategyFillQuestions(section.id),
          }),
          analyticsTakeaways: serializeAnalyticsTakeawaysForAi(buildAnalyticsInterpretations(data)),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      const suggestedDraft =
        response.ok && payload.usedAi && payload.suggestion?.strategyAsset
          ? strategyAssetSuggestionToDraft(section.id, payload.suggestion.strategyAsset, fallbackDraft)
          : fallbackDraft
      setDraft((current) => ({ ...current, ...suggestedDraft }))
      setFillMessage(
        payload.usedAi
          ? `Filled this draft from ${researchResultsForFill.length} research finding${researchResultsForFill.length === 1 ? '' : 's'} with AI. Review, then save.`
          : `Filled this draft from ${researchResultsForFill.length} stored research finding${researchResultsForFill.length === 1 ? '' : 's'} with the rule-based fallback. Review, then save.`,
      )
    } catch (requestError) {
      console.error('Strategy research fill used fallback:', requestError)
      setDraft((current) => ({ ...current, ...fallbackDraft }))
      setFillMessage(`Filled this draft from ${researchResultsForFill.length} stored research finding${researchResultsForFill.length === 1 ? '' : 's'} with the rule-based fallback. Review, then save.`)
    } finally {
      setFillLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ ...styles.panel, display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={styles.kicker}>Strategy foundation</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Reusable inputs before research and content</h2>
            <p style={{ ...styles.muted, margin: '8px 0 0', maxWidth: 780 }}>
              Designers should be able to pick the audience, message, proof, CTA, tracking rule, and review checklist before asking AI or the calendar to create work.
            </p>
          </div>
          <button type="button" style={styles.primaryButton} onClick={handleAdd} disabled={savingId === 'new'}>
            Add {section.singular}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {readiness.map((item) => (
            <div key={item.label} style={{ ...styles.card, padding: 12 }}>
              <div style={{ ...styles.small, ...styles.muted }}>{item.label}</div>
              <div style={{ fontSize: 24, fontWeight: 850, marginTop: 4 }}>{item.value}</div>
              <div style={{ ...styles.small, color: item.ready ? '#7dd69e' : '#d6a93f' }}>{item.ready ? 'Ready' : 'Needs setup'}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
          <StrategyModeButton active={workspaceMode === 'foundation'} onClick={() => setWorkspaceMode('foundation')}>
            Foundation
          </StrategyModeButton>
          <StrategyModeButton active={workspaceMode === 'campaigns'} onClick={() => setWorkspaceMode('campaigns')}>
            Campaign plans
          </StrategyModeButton>
          <StrategyModeButton active={workspaceMode === 'funnels'} onClick={() => setWorkspaceMode('funnels')}>
            Funnel paths
          </StrategyModeButton>
        </div>
      </div>

      {workspaceMode === 'campaigns' && (
        <CampaignWorkspace data={data} savingId={savingId} createDocument={createDocument} commitPatch={commitPatch} />
      )}

      {workspaceMode === 'funnels' && (
        <FunnelWorkspace
          client={client}
          data={data}
          savingId={savingId}
          createDocument={createDocument}
          loadData={loadData}
          commitPatch={commitPatch}
        />
      )}

      {workspaceMode === 'foundation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(0, 1.5fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ ...styles.panel, display: 'grid', gap: 10 }}>
          {STRATEGY_SECTIONS.map((candidate) => {
            const count = getStrategySectionItems(data, candidate.id).length
            const active = candidate.id === section.id
            return (
              <button
                key={candidate.id}
                type="button"
                style={{
                  ...styles.templateButton,
                  textAlign: 'left',
                  justifyContent: 'space-between',
                  borderColor: active ? '#007385' : 'var(--card-border-color)',
                  background: active ? 'rgba(0, 115, 133, 0.12)' : 'var(--card-bg-color)',
                }}
                onClick={() => {
                  setSectionId(candidate.id)
                  setSelectedId(getStrategySectionItems(data, candidate.id)[0]?._id || null)
                }}
              >
                <span>{candidate.title}</span>
                <span style={{ ...styles.small, ...styles.muted }}>{count}</span>
              </button>
            )
          })}
        </div>

        <div style={{ ...styles.panel, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.8fr) minmax(0, 1.2fr)', gap: 16 }}>
            <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{section.title}</h3>
                <p style={{ ...styles.muted, margin: '6px 0 0' }}>{section.why}</p>
              </div>
              <div style={{ ...styles.card, padding: 12 }}>
                <strong>When to use this</strong>
                <p style={{ ...styles.muted, margin: '6px 0 0' }}>{section.when}</p>
              </div>
              <div style={{ ...styles.card, padding: 12 }}>
                <strong>What this affects</strong>
                <p style={{ ...styles.muted, margin: '6px 0 0' }}>{section.affects}</p>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {items.length === 0 ? (
                  <div style={{ ...styles.card, padding: 14, ...styles.muted }}>
                    No {section.title.toLowerCase()} yet. Click Add to create an empty record and fill it in.
                  </div>
                ) : (
                  items.map((item) => {
                    const active = item._id === selected?._id
                    return (
                      <button
                        key={item._id}
                        type="button"
                        style={{
                          ...styles.templateButton,
                          textAlign: 'left',
                          borderColor: active ? '#007385' : 'var(--card-border-color)',
                          background: active ? 'rgba(0, 115, 133, 0.12)' : 'var(--card-bg-color)',
                        }}
                        onClick={() => setSelectedId(item._id)}
                      >
                        <strong>{item.title || `Untitled ${section.singular}`}</strong>
                        <span style={{ ...styles.small, ...styles.muted }}>{strategyDocumentSubtitle(section.id, item)}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              {selected ? (
                <>
                  <div style={{ ...styles.guidePanel, boxShadow: 'none', padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ fontSize: 14 }}>Fill from research</strong>
                        <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>
                          Draft this {section.singular} from approved or selected Research findings. Nothing is saved until you click Save.
                        </p>
                      </div>
                      <button
                        type="button"
                        style={styles.button}
                        disabled={fillLoading || researchResultsForFill.length === 0}
                        onClick={() => void handleFillFromResearch()}
                      >
                        {fillLoading ? 'Filling...' : 'Fill from research'}
                      </button>
                    </div>
                    <div style={{ ...styles.small, ...styles.muted, marginTop: 8 }}>
                      {approvedResearchCount > 0
                        ? `${approvedResearchCount} approved finding${approvedResearchCount === 1 ? '' : 's'} available.`
                        : researchResultsForFill.length > 0
                          ? `${researchResultsForFill.length} stored finding${researchResultsForFill.length === 1 ? '' : 's'} available; approve the strongest findings when possible.`
                          : 'No research findings yet.'}
                    </div>
                    <GuidedAutofillControls
                      questions={getStrategyFillQuestions(section.id)}
                      values={fillGuidance}
                      onChange={setFillGuidance}
                    />
                    <textarea
                      aria-label={`Optional notes for filling this ${section.singular}`}
                      rows={2}
                      style={{ ...styles.input, marginTop: 8 }}
                      value={fillNotes}
                      onChange={(event) => setFillNotes(event.currentTarget.value)}
                      placeholder="Optional: add a topic, audience, source, or constraint to guide the fill."
                    />
                    {fillMessage && <div style={{ ...styles.small, color: '#7dd69e', marginTop: 8 }}>{fillMessage}</div>}
                    {fillError && <div style={{ ...styles.small, color: '#E36216', marginTop: 8 }}>{fillError}</div>}
                  </div>
                  <StrategyEditorFields sectionId={section.id} draft={draft} onChange={setDraft} />
                  <details style={{ ...styles.card, padding: 12 }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced document details</summary>
                    <div style={{ ...styles.small, ...styles.muted, marginTop: 10 }}>
                      Sanity ID: {selected._id}
                      <br />
                      Updated: {selected._updatedAt || 'Unknown'}
                    </div>
                  </details>
                  <button type="button" style={{ ...styles.primaryButton, width: '100%' }} onClick={handleSave} disabled={savingId === selected._id}>
                    {savingId === selected._id ? 'Saving...' : `Save ${section.singular}`}
                  </button>
                </>
              ) : (
                <div style={{ ...styles.card, padding: 18, textAlign: 'center' }}>
                  <strong>Select or add a {section.singular}</strong>
                  <p style={{ ...styles.muted, margin: '8px 0 0' }}>The editor will appear here once there is a record to edit.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}

function StrategyModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.button,
        borderColor: active ? '#007385' : 'var(--card-border-color)',
        background: active ? 'rgba(0, 115, 133, 0.14)' : 'transparent',
        color: active ? '#f7feff' : 'var(--card-fg-color)',
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function GuidedAutofillControls({
  questions,
  values,
  onChange,
}: {
  questions: GuidedAutofillQuestion[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}) {
  if (questions.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      {questions.map((question) => (
        <div key={question.id} style={{ display: 'grid', gap: 6 }}>
          <div style={{ ...styles.small, fontWeight: 800 }}>{question.label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {question.choices.map((choice) => {
              const active = values[question.id] === choice.value
              return (
                <button
                  key={choice.value}
                  type="button"
                  title={choice.description}
                  style={{
                    ...styles.button,
                    padding: '6px 9px',
                    fontSize: 12,
                    borderColor: active ? '#007385' : 'var(--card-border-color)',
                    background: active ? 'rgba(0, 115, 133, 0.16)' : 'transparent',
                    color: active ? '#f7feff' : 'var(--card-fg-color)',
                  }}
                  onClick={() => {
                    onChange({
                      ...values,
                      [question.id]: active ? '' : choice.value,
                    })
                  }}
                >
                  {choice.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function buildAutofillGuidedPrompt({
  basePrompt,
  guidance,
  notes,
  questions,
}: {
  basePrompt: string
  guidance: Record<string, string>
  notes: string
  questions: GuidedAutofillQuestion[]
}) {
  const selected = questions
    .map((question) => {
      const value = guidance[question.id]
      const choice = question.choices.find((candidate) => candidate.value === value)
      return choice ? `${question.label}: ${choice.label} (${choice.description})` : ''
    })
    .filter(Boolean)
  const trimmedNotes = notes.trim()
  return [
    basePrompt,
    selected.length > 0 ? `Guided choices: ${selected.join(' | ')}` : '',
    trimmedNotes ? `Optional designer notes: ${trimmedNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function getStrategyFillQuestions(sectionId: StrategyAssetKind): GuidedAutofillQuestion[] {
  const sourceQuestion: GuidedAutofillQuestion = {
    id: 'source',
    label: 'Which research should matter most?',
    choices: [
      { value: 'approved', label: 'Approved findings', description: 'Prefer findings marked approved or selected for synthesis.' },
      { value: 'seo', label: 'SEO demand', description: 'Prefer keyword/search intent and content-gap findings.' },
      { value: 'evidence', label: 'Source evidence', description: 'Prefer claims, sources, proof, and validation notes.' },
      { value: 'signals', label: 'Performance signals', description: 'Prefer analytics and first-party signal findings.' },
    ],
  }
  const useQuestion: GuidedAutofillQuestion = {
    id: 'use',
    label: 'What should this support?',
    choices: [
      { value: 'oneItem', label: 'One item', description: 'Support a single post, carousel, link, or page update.' },
      { value: 'runway', label: 'Content runway', description: 'Support a repeatable thread across several releases.' },
      { value: 'campaign', label: 'Campaign plan', description: 'Support a campaign and connected funnel path.' },
    ],
  }
  if (sectionId === 'ctas') {
    return [
      sourceQuestion,
      {
        id: 'intent',
        label: 'What should the CTA do?',
        choices: [
          { value: 'read', label: 'Read/open', description: 'Send people to the source or canonical destination.' },
          { value: 'save', label: 'Save/share', description: 'Optimize for social usefulness and sharing.' },
          { value: 'contact', label: 'Contact', description: 'Move qualified visitors toward a conversation.' },
        ],
      },
    ]
  }
  if (sectionId === 'tracking' || sectionId === 'performance' || sectionId === 'experiments') {
    return [
      sourceQuestion,
      {
        id: 'measurement',
        label: 'What should we learn?',
        choices: [
          { value: 'traffic', label: 'Useful visits', description: 'Focus on visits to the destination or source.' },
          { value: 'engagement', label: 'Saves/replies', description: 'Focus on social proof and audience response.' },
          { value: 'conversion', label: 'Qualified action', description: 'Focus on contact, download, or meaningful follow-up.' },
        ],
      },
    ]
  }
  return [sourceQuestion, useQuestion]
}

function strategyAssistAssetType(sectionId: StrategyAssetKind): StrategyAssistAssetType {
  if (sectionId === 'audiences') return 'audience'
  if (sectionId === 'messages') return 'message'
  if (sectionId === 'proof') return 'proof'
  if (sectionId === 'ctas') return 'cta'
  if (sectionId === 'tracking') return 'trackingRule'
  if (sectionId === 'quality') return 'qualityGate'
  if (sectionId === 'experiments') return 'experiment'
  return 'performanceSynthesis'
}

function getStrategyResearchResults(data: MarketingData) {
  const preferred = data.researchResults.filter((result) => isResearchResultApproved(result) || result.selectedForSynthesis)
  const pool = preferred.length > 0 ? preferred : data.researchResults
  const rank = (result: MarketingResearchResult) => {
    if (isResearchResultApproved(result)) return 0
    if (result.selectedForSynthesis) return 1
    if (result.status === 'reviewed') return 2
    return 3
  }
  const seen = new Set<string>()
  return [...pool]
    .sort((a, b) => rank(a) - rank(b))
    .filter((result) => {
      if (!result._id || seen.has(result._id)) return false
      seen.add(result._id)
      return true
    })
    .slice(0, 10)
}

function buildStrategyResearchAssistDraft(sectionId: StrategyAssetKind, draft: Record<string, unknown>, data: MarketingData) {
  const project = getLatestActiveResearchProject(data)
  return {
    assetType: strategyAssistAssetType(sectionId),
    currentDraft: draft,
    researchProject: project
      ? {
          title: project.title,
          researchType: project.researchType,
          audience: project.audience,
          goals: project.goals,
          seedKeywords: project.seedKeywords,
          canonicalUrl: project.canonicalUrl,
          status: project.status,
        }
      : null,
    researchResults: getStrategyResearchResults(data).map(serializeStrategyResearchResultForDraft),
    channels: data.channels
      .filter((channel) => channel.status !== 'archived')
      .map((channel) => ({ title: channel.title, key: channel.key, platform: channel.platform }))
      .slice(0, 8),
    existingStrategyCounts: {
      audiences: data.audienceProfiles.length,
      messages: data.messagePillars.length,
      proof: data.proofPoints.length,
      ctas: data.ctas.length,
      tracking: data.trackingRules.length,
      quality: data.qualityGates.length,
      experiments: data.experiments.length,
      performance: data.performanceSignals.length,
    },
  }
}

function serializeStrategyResearchResultForDraft(result: MarketingResearchResult) {
  return {
    id: result._id,
    title: result.title,
    resultType: result.resultType,
    status: result.status,
    selectedForSynthesis: result.selectedForSynthesis,
    priority: result.priority,
    keyword: result.keyword,
    searchIntent: result.searchIntent,
    volume: result.volume,
    difficulty: result.difficulty,
    provider: result.provider,
    scoreSource: result.scoreSource,
    canonicalUrl: result.canonicalUrl,
    contentGap: result.contentGap,
    sourceTitle: result.sourceTitle,
    sourceUrl: result.sourceUrl,
    claim: result.claim,
    confidence: result.confidence,
    implication: result.implication,
    competitorName: result.competitorName,
    collaboratorName: result.collaboratorName,
    organization: result.organization,
    topicArea: result.topicArea,
    expectedContribution: result.expectedContribution,
  }
}

function buildStrategyDraftFromResearch(sectionId: StrategyAssetKind, data: MarketingData, currentDraft: Record<string, unknown> = {}) {
  const results = getStrategyResearchResults(data)
  const project = getLatestActiveResearchProject(data)
  const first = results[0]
  const topic = strategyResearchTopic(project, results)
  const claims = uniqueStrategyStrings(results.map((result) => result.claim || result.contentGap || result.implication || result.title)).slice(0, 6)
  const keywords = uniqueStrategyStrings(results.map((result) => result.keyword || result.topicArea || result.competitorName)).slice(0, 6)
  const destination = first?.canonicalUrl || first?.sourceUrl || project?.canonicalUrl || '/contact'
  const sourceTitle = first?.sourceTitle || first?.title || project?.title || ''
  const sourceUrl = first?.sourceUrl || first?.canonicalUrl || project?.canonicalUrl || ''
  const notes = strategyResearchBasisNote(results)
  const title = textFieldValue(currentDraft.title)

  if (sectionId === 'audiences') {
    const needs = claims.length > 0 ? claims.slice(0, 4) : [`Understand why ${topic} matters`, 'See the evidence behind the claim', 'Know what next step to take']
    const desiredActions = destination ? ['Open the source or destination', 'Save or share the useful finding', 'Explore related GoInvo work'] : ['Save or share the useful finding', 'Start a conversation']
    return withStrategyListText({
      title: title || `${topic} audience`,
      priority: data.audienceProfiles.length === 0 ? 'primary' : 'secondary',
      audience: project?.audience || `People who need a clear, evidence-backed explanation of ${topic}.`,
      needs,
      pains: ['The topic feels abstract or hard to trust', 'Relevant evidence is scattered across sources', 'The useful next step is unclear'],
      misconceptions: ['A strong visual is enough without a source destination', 'Everyone already understands the project context'],
      trustTriggers: ['Reviewed research findings', 'Concrete source links', 'Plain-language explanation', 'Visible proof or examples'],
      desiredActions,
      objections: ['Too abstract', 'Unsupported claim', 'No clear next step'],
      notes,
    })
  }

  if (sectionId === 'messages') {
    return withStrategyListText({
      title: title || `${topic} message pillar`,
      coreClaim: first?.claim || first?.contentGap || `${topic} needs an evidence-backed explanation people can understand and act on.`,
      supportingClaims: claims.length > 0 ? claims : ['Use approved research as the source of the claim', 'Connect the useful idea to a clear destination'],
      approvedPhrases: keywords.length > 0 ? keywords : ['evidence-backed', 'clear source path', 'useful explanation'],
      phrasesToAvoid: ['revolutionary', 'game-changing', 'world-class', 'trust us'],
      topicCluster: keywords[0] || topic,
      notes,
    })
  }

  if (sectionId === 'proof') {
    return {
      title: title || `${topic} proof point`,
      claim: first?.claim || first?.contentGap || describeResearchResult(first),
      proofType: first?.resultType === 'seoKeyword' ? 'researchFinding' : first?.evidenceType || 'researchFinding',
      sourceTitle,
      sourceUrl,
      confidence: first?.confidence || (first && isResearchResultApproved(first) ? 'medium' : 'needsValidation'),
      topicCluster: keywords[0] || topic,
      usageNotes: notes,
    }
  }

  if (sectionId === 'ctas') {
    return {
      title: title || `${topic} CTA`,
      label: destination && destination !== '/contact' ? 'Read the source' : 'Start a conversation',
      funnelStage: 'interest',
      destination,
      successSignal: destination && destination !== '/contact' ? 'People click through to the source or related work.' : 'People start a qualified conversation.',
      priority: 'contextual',
      notes,
    }
  }

  if (sectionId === 'tracking') {
    const sources = data.channels.map((channel) => channel.key || channel.title).filter(Boolean) as string[]
    const allowedSources = sources.length > 0 ? sources : ['instagram', 'linkedin', 'newsletter', 'website']
    return {
      title: title || `${topic} tracking rule`,
      status: 'active',
      utmSourceRule: 'Use the channel where the link is promoted.',
      utmMediumRule: 'Use social, email, referral, organic, or paid to group traffic consistently.',
      utmCampaignPattern: `${slugify(topic)}-research`,
      utmContentPattern: 'channel-format-angle',
      allowedSourcesText: allowedSources.join('\n'),
      allowedMediumsText: ['social', 'email', 'referral', 'organic'].join('\n'),
      notes,
    }
  }

  if (sectionId === 'quality') {
    const checks = [
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'Claim is backed by an approved research finding', category: 'claims', guidance: 'Reference the selected research result before final copy.', required: false },
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'CTA points to the intended destination', category: 'cta', guidance: 'Use one clear next step.', required: false },
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'Source and UTM links are present where needed', category: 'utm', guidance: 'Use the tracking rule before publishing.', required: false },
      { _key: randomKey(), _type: 'qualityGateCheck', label: 'Alt text explains the useful information', category: 'altText', guidance: 'Describe meaningful visuals in plain language.', required: false },
    ]
    return {
      title: title || `${topic} quality gate`,
      status: 'active',
      whenToUse: `Use before publishing content based on ${topic} research.`,
      checks,
      checksText: qualityCheckText(checks),
      notes,
    }
  }

  if (sectionId === 'experiments') {
    return {
      title: title || `${topic} experiment`,
      status: 'idea',
      hypothesis: `If ${topic} content leads with the strongest approved research finding and one clear CTA, more visitors will reach the intended destination because the value and next step are easier to understand.`,
      expectedSignal: 'Higher useful visits, saves, replies, or CTA clicks than a generic post.',
      decision: 'inconclusive',
      notes,
    }
  }

  const analyticsResult = results.find((result) => result.resultType === 'analyticsSignal' || result.provider === 'analytics')
  const signal = analyticsResult?.performanceSignals?.[0]
  const metrics = signal?.metrics || [{ _key: randomKey(), _type: 'performanceMetric', label: 'Useful visits', unit: 'visits', change: '' }]
  return {
    title: title || `${topic} performance signal`,
    provider: signal?.provider || 'manual',
    status: 'new',
    signalType: signal?.signalType || analyticsResult?.resultType || 'research-backed content',
    sourceLabel: signal?.sourceLabel || analyticsResult?.sourceTitle || sourceTitle || 'Research review',
    query: analyticsResult?.keyword || keywords[0] || '',
    pageUrl: signal?.pageUrl || analyticsResult?.canonicalUrl || destination,
    metrics,
    metricsText: performanceMetricText(metrics),
    interpretation: analyticsResult?.claim || analyticsResult?.implication || `Review whether ${topic} content is moving people toward the intended destination.`,
    recommendation: analyticsResult?.contentGap || 'Use this signal to decide whether the hook, CTA, destination, or channel should change.',
    rawImport: '',
  }
}

function strategyAssetSuggestionToDraft(
  sectionId: StrategyAssetKind,
  suggestion: MarketingStrategyAssetSuggestion,
  fallback: Record<string, unknown>,
) {
  const merged = { ...fallback }
  const title = textFieldValue(suggestion.title) || textFieldValue(merged.title)
  if (title) merged.title = title
  if (textFieldValue(suggestion.notes) || textFieldValue(suggestion.summary)) merged.notes = textFieldValue(suggestion.notes) || textFieldValue(suggestion.summary)

  if (sectionId === 'audiences') {
    copyStrategyText(merged, suggestion, ['priority', 'audience'])
    copyStrategyLists(merged, suggestion, ['needs', 'pains', 'misconceptions', 'trustTriggers', 'desiredActions', 'objections'])
    return merged
  }
  if (sectionId === 'messages') {
    copyStrategyText(merged, suggestion, ['coreClaim', 'topicCluster'])
    copyStrategyLists(merged, suggestion, ['supportingClaims', 'approvedPhrases', 'phrasesToAvoid'])
    return merged
  }
  if (sectionId === 'proof') {
    copyStrategyText(merged, suggestion, ['proofType', 'claim', 'sourceTitle', 'sourceUrl', 'confidence', 'topicCluster', 'usageNotes'])
    return merged
  }
  if (sectionId === 'ctas') {
    merged.label = textFieldValue(suggestion.label) || textFieldValue(suggestion.ctaLabel) || textFieldValue(merged.label)
    copyStrategyText(merged, suggestion, ['funnelStage', 'destination', 'successSignal', 'priority'])
    return merged
  }
  if (sectionId === 'tracking') {
    copyStrategyText(merged, suggestion, ['status', 'utmSourceRule', 'utmMediumRule', 'utmCampaignPattern', 'utmContentPattern'])
    const sources = strategyStringArray(suggestion.allowedSources)
    const mediums = strategyStringArray(suggestion.allowedMediums)
    if (sources.length > 0) merged.allowedSourcesText = sources.join('\n')
    if (mediums.length > 0) merged.allowedMediumsText = mediums.join('\n')
    return merged
  }
  if (sectionId === 'quality') {
    copyStrategyText(merged, suggestion, ['status', 'whenToUse'])
    const checks = Array.isArray(suggestion.qualityChecklist) && suggestion.qualityChecklist.length > 0 ? suggestion.qualityChecklist : suggestion.checks
    if (Array.isArray(checks) && checks.length > 0) {
      merged.checks = checks
      merged.checksText = qualityCheckText(checks)
    }
    return merged
  }
  if (sectionId === 'experiments') {
    copyStrategyText(merged, suggestion, ['status', 'hypothesis', 'expectedSignal', 'result', 'decision', 'decisionDate'])
    return merged
  }
  copyStrategyText(merged, suggestion, ['provider', 'status', 'signalType', 'sourceLabel', 'query', 'pageUrl', 'metricDate', 'interpretation', 'recommendation', 'rawImport'])
  if (Array.isArray(suggestion.metrics) && suggestion.metrics.length > 0) {
    merged.metrics = suggestion.metrics
    merged.metricsText = performanceMetricText(suggestion.metrics)
  }
  return merged
}

function copyStrategyText(target: Record<string, unknown>, source: Record<string, unknown>, fields: string[]) {
  fields.forEach((field) => {
    const value = textFieldValue(source[field])
    if (value) target[field] = value
  })
}

function copyStrategyLists(target: Record<string, unknown>, source: Record<string, unknown>, fields: string[]) {
  fields.forEach((field) => {
    const values = strategyStringArray(source[field])
    if (values.length > 0) {
      target[field] = values
      target[`${field}Text`] = values.join('\n')
    }
  })
}

function withStrategyListText<T extends Record<string, unknown>>(draft: T) {
  ;['needs', 'pains', 'misconceptions', 'trustTriggers', 'desiredActions', 'objections', 'supportingClaims', 'approvedPhrases', 'phrasesToAvoid'].forEach((field) => {
    const values = strategyStringArray(draft[field])
    if (values.length > 0) draft[`${field}Text` as keyof T] = values.join('\n') as T[keyof T]
  })
  return draft
}

function strategyStringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') {
        const record = item as { label?: string; title?: string; value?: string; guidance?: string }
        return (record.label || record.title || record.value || record.guidance || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function uniqueStrategyStrings(values: Array<string | undefined>) {
  const seen = new Set<string>()
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false
      seen.add(value.toLowerCase())
      return true
    })
}

function strategyResearchTopic(project: MarketingResearchProject | null, results: MarketingResearchResult[]) {
  const keyword = results.find((result) => result.keyword)?.keyword
  const topic = keyword || project?.seedKeywords?.[0] || project?.title || results[0]?.title || 'research-backed content'
  return stripResearchProjectSuffix(topic).replace(/\s+research\s*$/i, '').trim() || 'research-backed content'
}

function strategyResearchBasisNote(results: MarketingResearchResult[]) {
  if (results.length === 0) return 'Drafted before research findings were available. Review carefully before saving.'
  return `Drafted from ${results.length} Research finding${results.length === 1 ? '' : 's'}: ${results
    .slice(0, 3)
    .map((result) => result.title || result.keyword || result.sourceTitle || 'Untitled finding')
    .join('; ')}.`
}

function StrategyEditorFields({
  sectionId,
  draft,
  onChange,
}: {
  sectionId: StrategyAssetKind
  draft: Record<string, unknown>
  onChange: (draft: Record<string, unknown>) => void
}) {
  const setField = (name: string, value: unknown) => onChange({ ...draft, [name]: value })

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <StrategyTextField label="Title" value={textFieldValue(draft.title)} onChange={(value) => setField('title', value)} />

      {sectionId === 'audiences' && (
        <>
          <StrategySelectField label="Priority" value={textFieldValue(draft.priority) || 'secondary'} options={audiencePriorityOptions} onChange={(value) => setField('priority', value)} />
          <StrategyTextareaField label="Who they are" value={textFieldValue(draft.audience)} onChange={(value) => setField('audience', value)} />
          <StrategyTextareaField label="Needs" value={editedTextValue(draft, 'needsText', stringListValue(draft.needs))} onChange={(value) => setField('needsText', value)} />
          <StrategyTextareaField label="Pains" value={editedTextValue(draft, 'painsText', stringListValue(draft.pains))} onChange={(value) => setField('painsText', value)} />
          <StrategyTextareaField label="Misconceptions" value={editedTextValue(draft, 'misconceptionsText', stringListValue(draft.misconceptions))} onChange={(value) => setField('misconceptionsText', value)} />
          <StrategyTextareaField label="Trust triggers" value={editedTextValue(draft, 'trustTriggersText', stringListValue(draft.trustTriggers))} onChange={(value) => setField('trustTriggersText', value)} />
          <StrategyTextareaField label="Desired actions" value={editedTextValue(draft, 'desiredActionsText', stringListValue(draft.desiredActions))} onChange={(value) => setField('desiredActionsText', value)} />
          <StrategyTextareaField label="Objections" value={editedTextValue(draft, 'objectionsText', stringListValue(draft.objections))} onChange={(value) => setField('objectionsText', value)} />
          <StrategyTextareaField label="Designer notes" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'messages' && (
        <>
          <StrategyTextareaField label="Core claim" value={textFieldValue(draft.coreClaim)} onChange={(value) => setField('coreClaim', value)} />
          <StrategyTextareaField label="Supporting claims" value={editedTextValue(draft, 'supportingClaimsText', stringListValue(draft.supportingClaims))} onChange={(value) => setField('supportingClaimsText', value)} />
          <StrategyTextareaField label="Approved phrases" value={editedTextValue(draft, 'approvedPhrasesText', stringListValue(draft.approvedPhrases))} onChange={(value) => setField('approvedPhrasesText', value)} />
          <StrategyTextareaField label="Phrases to avoid" value={editedTextValue(draft, 'phrasesToAvoidText', stringListValue(draft.phrasesToAvoid))} onChange={(value) => setField('phrasesToAvoidText', value)} />
          <StrategyTextField label="Topic / keyword cluster" value={textFieldValue(draft.topicCluster)} onChange={(value) => setField('topicCluster', value)} />
          <StrategyTextareaField label="Designer notes" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'proof' && (
        <>
          <StrategyTextareaField label="Evidence / claim" value={textFieldValue(draft.claim)} onChange={(value) => setField('claim', value)} />
          <StrategySelectField label="Proof type" value={textFieldValue(draft.proofType) || 'researchFinding'} options={proofTypeOptions} onChange={(value) => setField('proofType', value)} />
          <StrategyTextField label="Source title" value={textFieldValue(draft.sourceTitle)} onChange={(value) => setField('sourceTitle', value)} />
          <StrategyTextField label="Source URL" value={textFieldValue(draft.sourceUrl)} onChange={(value) => setField('sourceUrl', value)} />
          <StrategySelectField label="Confidence" value={textFieldValue(draft.confidence) || 'medium'} options={confidenceOptions} onChange={(value) => setField('confidence', value)} />
          <StrategyTextField label="Topic / keyword cluster" value={textFieldValue(draft.topicCluster)} onChange={(value) => setField('topicCluster', value)} />
          <StrategyTextareaField label="Usage notes" value={textFieldValue(draft.usageNotes)} onChange={(value) => setField('usageNotes', value)} />
        </>
      )}

      {sectionId === 'ctas' && (
        <>
          <StrategyTextField label="CTA label" value={textFieldValue(draft.label)} onChange={(value) => setField('label', value)} />
          <StrategySelectField label="Funnel stage" value={textFieldValue(draft.funnelStage) || 'awareness'} options={funnelStageOptions} onChange={(value) => setField('funnelStage', value)} />
          <StrategyTextField label="Destination" value={textFieldValue(draft.destination)} onChange={(value) => setField('destination', value)} />
          <StrategyTextField label="Success signal" value={textFieldValue(draft.successSignal)} onChange={(value) => setField('successSignal', value)} />
          <StrategySelectField label="Priority" value={textFieldValue(draft.priority) || 'contextual'} options={ctaPriorityOptions} onChange={(value) => setField('priority', value)} />
          <StrategyTextareaField label="Designer notes" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'tracking' && (
        <>
          <StrategySelectField label="Status" value={textFieldValue(draft.status) || 'active'} options={documentStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextareaField label="UTM source rule" value={textFieldValue(draft.utmSourceRule)} onChange={(value) => setField('utmSourceRule', value)} />
          <StrategyTextareaField label="UTM medium rule" value={textFieldValue(draft.utmMediumRule)} onChange={(value) => setField('utmMediumRule', value)} />
          <StrategyTextField label="UTM campaign pattern" value={textFieldValue(draft.utmCampaignPattern)} onChange={(value) => setField('utmCampaignPattern', value)} />
          <StrategyTextField label="UTM content pattern" value={textFieldValue(draft.utmContentPattern)} onChange={(value) => setField('utmContentPattern', value)} />
          <StrategyTextareaField label="Allowed source values" value={editedTextValue(draft, 'allowedSourcesText', trackingValueText(draft.allowedSources))} onChange={(value) => setField('allowedSourcesText', value)} />
          <StrategyTextareaField label="Allowed medium values" value={editedTextValue(draft, 'allowedMediumsText', trackingValueText(draft.allowedMediums))} onChange={(value) => setField('allowedMediumsText', value)} />
          <StrategyTextareaField label="Designer notes" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'quality' && (
        <>
          <StrategySelectField label="Status" value={textFieldValue(draft.status) || 'active'} options={documentStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextareaField label="When to use" value={textFieldValue(draft.whenToUse)} onChange={(value) => setField('whenToUse', value)} />
          <StrategyTextareaField label="Checklist" value={editedTextValue(draft, 'checksText', qualityCheckText(draft.checks))} onChange={(value) => setField('checksText', value)} />
          <StrategyTextareaField label="Designer notes" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'experiments' && (
        <>
          <StrategySelectField label="Status" value={textFieldValue(draft.status) || 'idea'} options={experimentStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextareaField label="Hypothesis" value={textFieldValue(draft.hypothesis)} onChange={(value) => setField('hypothesis', value)} />
          <StrategyTextField label="Expected signal" value={textFieldValue(draft.expectedSignal)} onChange={(value) => setField('expectedSignal', value)} />
          <StrategyTextareaField label="Result" value={textFieldValue(draft.result)} onChange={(value) => setField('result', value)} />
          <StrategySelectField label="Decision" value={textFieldValue(draft.decision)} options={experimentDecisionOptions} onChange={(value) => setField('decision', value)} />
          <StrategyTextField label="Decision date" value={textFieldValue(draft.decisionDate)} type="date" onChange={(value) => setField('decisionDate', value)} />
          <StrategyTextareaField label="Notes" value={textFieldValue(draft.notes)} onChange={(value) => setField('notes', value)} />
        </>
      )}

      {sectionId === 'performance' && (
        <>
          <StrategySelectField label="Provider" value={textFieldValue(draft.provider) || 'manual'} options={performanceProviderOptions} onChange={(value) => setField('provider', value)} />
          <StrategySelectField label="Status" value={textFieldValue(draft.status) || 'new'} options={performanceStatusOptions} onChange={(value) => setField('status', value)} />
          <StrategyTextField label="Signal type" value={textFieldValue(draft.signalType)} onChange={(value) => setField('signalType', value)} />
          <StrategyTextField label="Source label" value={textFieldValue(draft.sourceLabel)} onChange={(value) => setField('sourceLabel', value)} />
          <StrategyTextField label="Query" value={textFieldValue(draft.query)} onChange={(value) => setField('query', value)} />
          <StrategyTextField label="Page URL" value={textFieldValue(draft.pageUrl)} onChange={(value) => setField('pageUrl', value)} />
          <StrategyTextField label="Metric date" value={textFieldValue(draft.metricDate)} type="date" onChange={(value) => setField('metricDate', value)} />
          <StrategyTextareaField label="Metrics" value={editedTextValue(draft, 'metricsText', performanceMetricText(draft.metrics))} onChange={(value) => setField('metricsText', value)} />
          <StrategyTextareaField label="Interpretation" value={textFieldValue(draft.interpretation)} onChange={(value) => setField('interpretation', value)} />
          <StrategyTextareaField label="Recommendation" value={textFieldValue(draft.recommendation)} onChange={(value) => setField('recommendation', value)} />
          <StrategyTextareaField label="Raw import data" value={textFieldValue(draft.rawImport)} onChange={(value) => setField('rawImport', value)} />
        </>
      )}
    </div>
  )
}

function StrategyTextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label>
      <span style={styles.label}>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} style={styles.input} />
    </label>
  )
}

function StrategyTextareaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span style={styles.label}>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.currentTarget.value)} style={{ ...styles.input, minHeight: 86, resize: 'vertical' }} />
    </label>
  )
}

function StrategySelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}) {
  return (
    <label>
      <span style={styles.label}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.currentTarget.value)} style={{ ...styles.input, paddingRight: 34 }}>
        <option value="">No selection</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.title}
          </option>
        ))}
      </select>
    </label>
  )
}

function getStrategyReadiness(data: MarketingData) {
  return [
    { label: 'Audiences', value: data.audienceProfiles.length, ready: data.audienceProfiles.length > 0 },
    { label: 'Messages', value: data.messagePillars.length, ready: data.messagePillars.length > 0 },
    { label: 'Proof', value: data.proofPoints.length, ready: data.proofPoints.length > 0 },
    { label: 'CTAs', value: data.ctas.length, ready: data.ctas.length > 0 },
    { label: 'Tracking', value: data.trackingRules.length, ready: data.trackingRules.length > 0 },
    { label: 'Quality', value: data.qualityGates.length, ready: data.qualityGates.length > 0 },
    { label: 'Experiments', value: data.experiments.length, ready: data.experiments.length > 0 },
    { label: 'Signals', value: data.performanceSignals.length, ready: data.performanceSignals.length > 0 },
  ]
}

function getStrategySectionItems(data: MarketingData, sectionId: StrategyAssetKind): StrategyDocument[] {
  if (sectionId === 'audiences') return data.audienceProfiles
  if (sectionId === 'messages') return data.messagePillars
  if (sectionId === 'proof') return data.proofPoints
  if (sectionId === 'ctas') return data.ctas
  if (sectionId === 'tracking') return data.trackingRules
  if (sectionId === 'quality') return data.qualityGates
  if (sectionId === 'experiments') return data.experiments
  return data.performanceSignals
}

function buildEmptyStrategyDocument(section: StrategySectionConfig): MarketingDocumentInput {
  const base = { _type: section.documentType, title: '' }
  if (section.id === 'audiences') return { ...base, priority: 'secondary' }
  if (section.id === 'messages') return { ...base, coreClaim: '' }
  if (section.id === 'proof') return { ...base, proofType: 'researchFinding', confidence: 'medium' }
  if (section.id === 'ctas') return { ...base, priority: 'contextual' }
  if (section.id === 'tracking') return { ...base, status: 'active' }
  if (section.id === 'quality') return { ...base, status: 'active', checks: [] }
  if (section.id === 'experiments') return { ...base, status: 'idea' }
  return { ...base, provider: 'manual', status: 'new' }
}

function buildStrategyPatch(sectionId: StrategyAssetKind, draft: Record<string, unknown>): Record<string, unknown> {
  const title = textFieldValue(draft.title)
  if (sectionId === 'audiences') {
    return {
      title,
      priority: textFieldValue(draft.priority) || 'secondary',
      audience: textFieldValue(draft.audience),
      needs: linesFromDraft(draft, 'needs'),
      pains: linesFromDraft(draft, 'pains'),
      misconceptions: linesFromDraft(draft, 'misconceptions'),
      trustTriggers: linesFromDraft(draft, 'trustTriggers'),
      desiredActions: linesFromDraft(draft, 'desiredActions'),
      objections: linesFromDraft(draft, 'objections'),
      notes: textFieldValue(draft.notes),
    }
  }
  if (sectionId === 'messages') {
    return {
      title,
      coreClaim: textFieldValue(draft.coreClaim),
      supportingClaims: linesFromDraft(draft, 'supportingClaims'),
      approvedPhrases: linesFromDraft(draft, 'approvedPhrases'),
      phrasesToAvoid: linesFromDraft(draft, 'phrasesToAvoid'),
      topicCluster: textFieldValue(draft.topicCluster),
      notes: textFieldValue(draft.notes),
    }
  }
  if (sectionId === 'proof') {
    return {
      title,
      claim: textFieldValue(draft.claim),
      proofType: textFieldValue(draft.proofType) || 'researchFinding',
      sourceTitle: textFieldValue(draft.sourceTitle),
      sourceUrl: textFieldValue(draft.sourceUrl),
      confidence: textFieldValue(draft.confidence) || 'medium',
      topicCluster: textFieldValue(draft.topicCluster),
      usageNotes: textFieldValue(draft.usageNotes),
    }
  }
  if (sectionId === 'ctas') {
    return {
      title,
      label: textFieldValue(draft.label),
      funnelStage: textFieldValue(draft.funnelStage),
      destination: textFieldValue(draft.destination),
      successSignal: textFieldValue(draft.successSignal),
      priority: textFieldValue(draft.priority) || 'contextual',
      notes: textFieldValue(draft.notes),
    }
  }
  if (sectionId === 'tracking') {
    return {
      title,
      status: textFieldValue(draft.status) || 'active',
      utmSourceRule: textFieldValue(draft.utmSourceRule),
      utmMediumRule: textFieldValue(draft.utmMediumRule),
      utmCampaignPattern: textFieldValue(draft.utmCampaignPattern),
      utmContentPattern: textFieldValue(draft.utmContentPattern),
      allowedSources: trackingValuesFromDraft(draft, 'allowedSources'),
      allowedMediums: trackingValuesFromDraft(draft, 'allowedMediums'),
      notes: textFieldValue(draft.notes),
    }
  }
  if (sectionId === 'quality') {
    return {
      title,
      status: textFieldValue(draft.status) || 'active',
      whenToUse: textFieldValue(draft.whenToUse),
      checks: qualityChecksFromDraft(draft),
      notes: textFieldValue(draft.notes),
    }
  }
  if (sectionId === 'experiments') {
    return {
      title,
      status: textFieldValue(draft.status) || 'idea',
      hypothesis: textFieldValue(draft.hypothesis),
      expectedSignal: textFieldValue(draft.expectedSignal),
      result: textFieldValue(draft.result),
      decision: textFieldValue(draft.decision),
      decisionDate: textFieldValue(draft.decisionDate),
      notes: textFieldValue(draft.notes),
    }
  }
  return {
    title,
    provider: textFieldValue(draft.provider) || 'manual',
    status: textFieldValue(draft.status) || 'new',
    signalType: textFieldValue(draft.signalType),
    sourceLabel: textFieldValue(draft.sourceLabel),
    query: textFieldValue(draft.query),
    pageUrl: textFieldValue(draft.pageUrl),
    metricDate: textFieldValue(draft.metricDate),
    metrics: performanceMetricsFromDraft(draft),
    interpretation: textFieldValue(draft.interpretation),
    recommendation: textFieldValue(draft.recommendation),
    rawImport: textFieldValue(draft.rawImport),
  }
}

function strategyDocumentSubtitle(sectionId: StrategyAssetKind, item: StrategyDocument) {
  if (sectionId === 'audiences') return [textFieldValue((item as MarketingAudienceProfile).priority), textFieldValue((item as MarketingAudienceProfile).audience)].filter(Boolean).join(' / ') || 'No audience detail'
  if (sectionId === 'messages') return textFieldValue((item as MarketingMessagePillar).topicCluster) || textFieldValue((item as MarketingMessagePillar).coreClaim) || 'No claim yet'
  if (sectionId === 'proof') return [textFieldValue((item as MarketingProofPoint).confidence), textFieldValue((item as MarketingProofPoint).sourceTitle)].filter(Boolean).join(' / ') || 'No source yet'
  if (sectionId === 'ctas') return [textFieldValue((item as MarketingCta).label), textFieldValue((item as MarketingCta).funnelStage)].filter(Boolean).join(' / ') || 'No CTA label yet'
  if (sectionId === 'tracking') return textFieldValue((item as MarketingTrackingRule).utmCampaignPattern) || textFieldValue((item as MarketingTrackingRule).status) || 'No pattern yet'
  if (sectionId === 'quality') return `${((item as MarketingQualityGate).checks || []).length} checks`
  if (sectionId === 'experiments') return textFieldValue((item as MarketingExperiment).hypothesis) || textFieldValue((item as MarketingExperiment).status) || 'No hypothesis yet'
  return [textFieldValue((item as MarketingPerformanceSignal).provider), textFieldValue((item as MarketingPerformanceSignal).signalType)].filter(Boolean).join(' / ') || 'No signal detail'
}

function textFieldValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function editedTextValue(draft: Record<string, unknown>, name: string, fallback: string) {
  return typeof draft[name] === 'string' ? (draft[name] as string) : fallback
}

function stringListValue(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join('\n')
    : ''
}

function trackingValueText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object' ? (item as { value?: string; label?: string }) : {}
          return record.value || record.label || ''
        })
        .filter(Boolean)
        .join('\n')
    : ''
}

function qualityCheckText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object' ? (item as { label?: string; category?: string; guidance?: string }) : {}
          return [record.label, record.category, record.guidance].filter(Boolean).join(' | ')
        })
        .filter(Boolean)
        .join('\n')
    : ''
}

function performanceMetricText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object' ? (item as { label?: string; value?: number; unit?: string; change?: string }) : {}
          return [record.label, typeof record.value === 'number' ? record.value : '', record.unit, record.change].filter((part) => part !== undefined && part !== '').join(' | ')
        })
        .filter(Boolean)
        .join('\n')
    : ''
}

function linesFromDraft(draft: Record<string, unknown>, name: string) {
  const edited = textFieldValue(draft[`${name}Text`])
  return splitLines(edited || stringListValue(draft[name]))
}

function trackingValuesFromDraft(draft: Record<string, unknown>, name: string) {
  const edited = textFieldValue(draft[`${name}Text`])
  return splitLines(edited || trackingValueText(draft[name])).map((value) => ({
    _key: randomKey(),
    _type: 'trackingValue',
    label: value,
    value: slugify(value),
  }))
}

function qualityChecksFromDraft(draft: Record<string, unknown>) {
  const edited = textFieldValue(draft.checksText)
  return splitLines(edited || qualityCheckText(draft.checks)).map((line) => {
    const [label, category, guidance] = line.split('|').map((part) => part.trim())
    return {
      _key: randomKey(),
      _type: 'qualityGateCheck',
      label,
      category: category || 'reviewReadiness',
      guidance: guidance || '',
      required: false,
    }
  })
}

function performanceMetricsFromDraft(draft: Record<string, unknown>) {
  const edited = textFieldValue(draft.metricsText)
  return splitLines(edited || performanceMetricText(draft.metrics)).map((line) => {
    const [label, value, unit, change] = line.split('|').map((part) => part.trim())
    const numeric = Number(value)
    return {
      _key: randomKey(),
      _type: 'performanceMetric',
      label,
      value: Number.isFinite(numeric) ? numeric : undefined,
      unit: unit || '',
      change: change || '',
    }
  })
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function MarketingGuidanceWidget({
  data,
  savingId,
  tutorialRequest,
  tutorialLibraryRequest,
  tutorialId,
  tutorialDemoRecommendation,
  onOpenView,
  onGenerateInstagramCarousel,
  onGenerateMarketingPlan,
}: {
  data: MarketingData
  savingId: string | null
  tutorialRequest: number
  tutorialLibraryRequest: number
  tutorialId: string
  tutorialDemoRecommendation: boolean
  onOpenView: (view: MarketingViewId) => void
  onGenerateInstagramCarousel: (questionnaire: MarketingPlanQuestionnaire) => Promise<CarouselWizardResult>
  onGenerateMarketingPlan: (questionnaire: MarketingPlanQuestionnaire) => Promise<CarouselWizardResult>
}) {
  const [open, setOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [hasWorkflowBack, setHasWorkflowBack] = useState(false)
  const [backSignal, setBackSignal] = useState(0)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialLibraryOpen, setTutorialLibraryOpen] = useState(false)
  const [activeTutorialId, setActiveTutorialId] = useState(tutorialId || defaultDesignerWorkflowTutorial.id)
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)
  const [tutorialPrepareSignal, setTutorialPrepareSignal] = useState<DesignerWorkflowTutorialPrepareSignal>(null)
  const activeTutorial = getDesignerWorkflowTutorial(activeTutorialId)
  const openViewFromGuide = (view: MarketingViewId) => {
    onOpenView(view)
    setOpen(false)
  }

  const startTutorial = (nextTutorialId = activeTutorialId, options: { demoRecommendation?: boolean } = {}) => {
    const nextTutorial = getDesignerWorkflowTutorial(nextTutorialId)
    setActiveTutorialId(nextTutorial.id)
    setTutorialLibraryOpen(false)
    setTutorialStepIndex(0)
    setTutorialOpen(true)
    prepareTutorialShell(nextTutorial.steps[0]?.id || '')
    setTutorialPrepareSignal({
      stepId: nextTutorial.steps[0]?.id || '',
      tutorialId: nextTutorial.id,
      demoRecommendation: options.demoRecommendation,
      token: Date.now(),
    })
  }

  const completeTutorial = () => {
    markDesignerWorkflowTutorialComplete(activeTutorial.id)
  }

  const closeTutorial = () => {
    markDesignerWorkflowTutorialComplete(activeTutorial.id)
    setTutorialOpen(false)
  }

  const changeTutorialStep = (nextStepIndex: number) => {
    setTutorialStepIndex(nextStepIndex)
    const nextStep = activeTutorial.steps[nextStepIndex]
    if (nextStep) {
      prepareTutorialShell(nextStep.id)
      setTutorialPrepareSignal({
        stepId: nextStep.id,
        tutorialId: activeTutorial.id,
        demoRecommendation: tutorialPrepareSignal?.demoRecommendation,
        token: Date.now(),
      })
    }
  }

  const prepareTutorialShell = (stepId: string) => {
    if (!stepId) return
    if (stepId === 'open-widget') {
      setOpen(false)
      setSessionsOpen(false)
      return
    }
    setOpen(true)
    if (stepId === 'sessions-list') {
      setSessionsOpen(true)
      return
    }
    if (['choose-path', 'suggest-next-step', 'optional-direction', 'recommendation-steps', 'open-next-step', 'create-suggested-setup'].includes(stepId)) {
      setSessionsOpen(false)
    }
  }

  const advanceTutorialForAction = (action: string) => {
    if (action === 'strategy-suggestion-ready') {
      if (!hasDesignerWorkflowTutorialCompleted('designer-workflow-recommendation')) {
        startTutorial('designer-workflow-recommendation', { demoRecommendation: false })
      }
      return
    }
    if (!tutorialOpen) return
    const currentStep = activeTutorial.steps[tutorialStepIndex]
    const actionByStep: Record<string, string[]> = {
      'open-widget': ['open-workflow'],
      sessions: ['open-sessions'],
      'choose-path': ['choose-plan', 'choose-single-item'],
      'suggest-next-step': ['suggest-next-step'],
      'optional-direction': ['fill-optional-direction'],
    }
    if (currentStep && actionByStep[currentStep.id]?.includes(action)) {
      const nextStepIndex = Math.min(activeTutorial.steps.length, tutorialStepIndex + 1)
      if (nextStepIndex >= activeTutorial.steps.length) completeTutorial()
      changeTutorialStep(nextStepIndex)
    }
  }

  useEffect(() => {
    if (tutorialRequest <= 0) return
    startTutorial(tutorialId, { demoRecommendation: tutorialDemoRecommendation })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialRequest])

  useEffect(() => {
    if (tutorialLibraryRequest <= 0) return
    setOpen(true)
    setTutorialOpen(false)
    setTutorialLibraryOpen(true)
  }, [tutorialLibraryRequest])

  return (
    <div style={styles.guideWidget}>
      {open && (
        <section style={{ ...styles.guidePanel, ...styles.guidePopover }} data-tour-id="designer-workflow-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              {hasWorkflowBack && (
                <button
                  type="button"
                  style={{ ...styles.inlineLink, padding: 0, border: 'none', background: 'transparent', fontSize: 12, marginBottom: 6 }}
                  onClick={() => setBackSignal((current) => current + 1)}
                >
                  <ChevronLeftIcon style={{ width: 15, height: 15 }} />
                  Back
                </button>
              )}
              <h2 style={{ margin: 0, fontSize: 20 }}>Let's see what needs to be done next!</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                style={{ ...styles.button, height: 34, padding: '0 10px', fontSize: 12 }}
                aria-expanded={sessionsOpen}
                data-tour-id="designer-workflow-sessions-button"
                onClick={() => {
                  setSessionsOpen((current) => !current)
                  advanceTutorialForAction('open-sessions')
                }}
              >
                Sessions
              </button>
              <button
                type="button"
                aria-label="Close designer workflow"
                style={{ ...styles.button, width: 34, height: 34, padding: 0 }}
                onClick={() => setOpen(false)}
              >
                <CloseIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>
          <CarouselWorkflowWizard
            data={data}
            saving={savingId?.startsWith('carousel-') || savingId?.startsWith('marketing-plan-') || false}
            sessionsOpen={sessionsOpen}
            backSignal={backSignal}
            onBackAvailableChange={setHasWorkflowBack}
            onOpenView={openViewFromGuide}
            onGenerateSingleItem={onGenerateInstagramCarousel}
            onGenerateMarketingPlan={onGenerateMarketingPlan}
            tutorialPrepareSignal={tutorialPrepareSignal}
            onTutorialAction={advanceTutorialForAction}
          />
          {tutorialLibraryOpen && (
          <DesignerWorkflowTutorialLibrary
              onStart={(nextTutorialId) => startTutorial(nextTutorialId, { demoRecommendation: nextTutorialId === 'designer-workflow-recommendation' })}
              onClose={() => setTutorialLibraryOpen(false)}
            />
          )}
        </section>
      )}
      <button
        type="button"
        style={styles.guideToggle}
        aria-expanded={open}
        data-tour-id="designer-workflow-toggle"
        onClick={() => {
          setOpen((current) => !current)
          advanceTutorialForAction('open-workflow')
        }}
      >
        <DashboardIcon style={{ width: 18, height: 18 }} />
        Designer workflow
      </button>
      <GuidedTutorialOverlay
        active={tutorialOpen}
        tutorial={activeTutorial}
        stepIndex={tutorialStepIndex}
        onStepChange={changeTutorialStep}
        onClose={closeTutorial}
        onRestart={() => startTutorial(activeTutorial.id)}
        onShowLibrary={() => {
          setTutorialOpen(false)
          setOpen(true)
          setTutorialLibraryOpen(true)
        }}
        onComplete={completeTutorial}
      />
    </div>
  )
}

function DesignerWorkflowTutorialLibrary({
  onStart,
  onClose,
}: {
  onStart: (tutorialId: string) => void
  onClose: () => void
}) {
  return (
    <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ ...styles.kicker, marginBottom: 6 }}>Tutorials</div>
          <h3 style={{ margin: 0, fontSize: 17 }}>Designer Workflow tutorials</h3>
        </div>
        <button type="button" aria-label="Close tutorial library" style={{ ...styles.button, width: 32, height: 32, padding: 0 }} onClick={onClose}>
          <CloseIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => onStart(defaultDesignerWorkflowTutorial.id)}
        >
          Start Marketing view tour
        </button>
        <a
          href="/studio/getting-started?article=marketing.designer-workflow-tutorials"
          style={{ ...styles.button, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
        >
          See more...
        </a>
      </div>
    </section>
  )
}

function CarouselWorkflowWizard({
  data,
  saving,
  sessionsOpen,
  backSignal,
  tutorialPrepareSignal,
  onBackAvailableChange,
  onOpenView,
  onGenerateSingleItem,
  onGenerateMarketingPlan,
  onTutorialAction,
}: {
  data: MarketingData
  saving: boolean
  sessionsOpen: boolean
  backSignal: number
  tutorialPrepareSignal: DesignerWorkflowTutorialPrepareSignal
  onBackAvailableChange: (available: boolean) => void
  onOpenView: (view: MarketingViewId) => void
  onGenerateSingleItem: (questionnaire: MarketingPlanQuestionnaire) => Promise<CarouselWizardResult>
  onGenerateMarketingPlan: (questionnaire: MarketingPlanQuestionnaire) => Promise<CarouselWizardResult>
  onTutorialAction: (action: string) => void
}) {
  const [sessions, setSessions] = useState<DesignerWorkflowSession[]>(() => loadDesignerWorkflowSessions())
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadActiveDesignerWorkflowSessionId())
  const [error, setError] = useState('')
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [suggestedPlanCreating, setSuggestedPlanCreating] = useState(false)
  const [strategyError, setStrategyError] = useState('')
  const activeSession = sessions.find((session) => session.id === activeSessionId) || null
  const mode = activeSession?.mode || null
  const stepIndex = activeSession?.stepIndex || 0
  const strategyStepIndex = activeSession?.strategyStepIndex || 0
  const questionnaire = activeSession?.questionnaire || defaultMarketingPlanQuestionnaire()
  const strategyPrompt = activeSession?.strategyPrompt || ''
  const strategySuggestion = activeSession?.strategySuggestion || null
  const strategyUsedAi = activeSession?.strategyUsedAi ?? null
  const result = activeSession?.result || null
  const hasInstagram = data.channels.some((channel) => channel.key === 'instagram' && channel.status !== 'archived')
  const hasAnalytics = data.analyticsSources.some((source) => source.status === 'connected')
  const currentCampaignCount = data.campaigns.filter((campaign) => getCampaignChannelKeys(campaign).includes('instagram')).length
  const steps = mode === 'plan' ? CAMPAIGN_PLAN_WIZARD_STEPS : SINGLE_ITEM_WIZARD_STEPS
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]
  const preparedQuestionnaire = normalizeMarketingPlanQuestionnaire(questionnaire)

  useEffect(() => {
    saveDesignerWorkflowSessions(sessions)
  }, [sessions])

  useEffect(() => {
    saveActiveDesignerWorkflowSessionId(activeSession?.ephemeral ? null : activeSessionId)
  }, [activeSessionId, activeSession?.ephemeral])

  useEffect(() => {
    if (activeSessionId && !sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(null)
    }
  }, [activeSessionId, sessions])

  useEffect(() => {
    onBackAvailableChange(!!mode)
  }, [mode, onBackAvailableChange])

  useEffect(() => {
    if (backSignal <= 0) return
    if (mode === 'singleItem' && stepIndex > 0) {
      updateActiveSession({ stepIndex: Math.max(0, stepIndex - 1) })
      return
    }
    returnToPathSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backSignal])

  const updateActiveSession = (patch: Partial<DesignerWorkflowSession>) => {
    if (!activeSessionId) return
    setSessions((current) => {
      const updated = current.map((session) =>
        session.id === activeSessionId
          ? prepareDesignerWorkflowSession({ ...session, ...patch, updatedAt: new Date().toISOString() })
          : session,
      )
      const active = updated.find((session) => session.id === activeSessionId)
      return active ? [active, ...updated.filter((session) => session.id !== activeSessionId)] : updated
    })
  }

  const startSession = (nextMode: DesignerWizardMode) => {
    const session = createDesignerWorkflowSession(nextMode)
    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)].slice(0, 24))
    setActiveSessionId(session.id)
    setError('')
    setStrategyError('')
  }

  const startDemoRecommendationSession = () => {
    const demoSuggestion = buildDesignerWorkflowDemoRecommendation()
    const demoQuestionnaire = questionnaireFromStrategySuggestion(demoSuggestion, defaultMarketingPlanQuestionnaire(), data)
    const session = prepareDesignerWorkflowSession({
      ...createDesignerWorkflowSession('plan'),
      id: `designer-demo-${Date.now()}-${randomKey()}`,
      questionnaire: demoQuestionnaire,
      strategyPrompt: 'Demo: plan Instagram content for a housing statistics story.',
      strategySuggestion: demoSuggestion,
      strategyUsedAi: null,
      result: null,
      tutorialDemo: true,
      ephemeral: true,
    })
    setSessions((current) => [session, ...current.filter((item) => !item.tutorialDemo)].slice(0, 24))
    setActiveSessionId(session.id)
    setError('')
    setStrategyError('')
  }

  const deleteSession = (sessionId: string) => {
    setSessions((current) => current.filter((session) => session.id !== sessionId))
    if (sessionId === activeSessionId) setActiveSessionId(null)
  }

  const updateQuestionnaire = (next: Partial<MarketingPlanQuestionnaire>) => {
    updateActiveSession({
      questionnaire: { ...questionnaire, ...next },
      result: null,
      strategySuggestion: null,
      strategyUsedAi: null,
    })
    setError('')
    setStrategyError('')
  }

  const chooseMode = (nextMode: DesignerWizardMode) => {
    startSession(nextMode)
    onTutorialAction(nextMode === 'plan' ? 'choose-plan' : 'choose-single-item')
  }

  const returnToPathSelection = () => {
    setActiveSessionId(null)
    setError('')
  }

  const requestStrategySuggestion = async () => {
    setStrategyLoading(true)
    setStrategyError('')
    updateActiveSession({ result: null })
    try {
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'researchProject',
          draft: buildWizardStrategyDraft(data, questionnaire),
          prompt: buildWizardStrategyPrompt(data, questionnaire, strategyPrompt),
          analyticsTakeaways: serializeAnalyticsTakeawaysForAi(buildAnalyticsInterpretations(data)),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      if (!response.ok || !payload.suggestion) throw new Error(payload.error || 'The strategy assistant could not create a suggestion.')
      updateActiveSession({ strategySuggestion: payload.suggestion, strategyUsedAi: !!payload.usedAi, strategyStepIndex: 0, result: null })
    } catch (requestError) {
      console.error('Strategy assistant used rule-based fallback:', requestError)
      updateActiveSession({
        strategySuggestion: buildFallbackWizardStrategySuggestion(data, questionnaire, strategyPrompt),
        strategyUsedAi: false,
        strategyStepIndex: 0,
        result: null,
      })
      setStrategyError('')
    } finally {
      setStrategyLoading(false)
      onTutorialAction('strategy-suggestion-ready')
    }
  }

  const generate = async () => {
    if (!mode) return
    setError('')
    updateActiveSession({ result: null })
    try {
      const normalized = normalizeMarketingPlanQuestionnaire(questionnaire)
      const created = mode === 'singleItem' ? await onGenerateSingleItem(normalized) : await onGenerateMarketingPlan(normalized)
      updateActiveSession({ questionnaire: normalized, result: created })
    } catch (err) {
      console.error('Carousel workflow generation failed:', err)
      setError(err instanceof Error ? err.message : 'Research project could not be created.')
    }
  }

  const generateSuggestedPlan = async () => {
    if (saving || suggestedPlanCreating || result) return
    const nextQuestionnaire = strategySuggestion
      ? questionnaireFromStrategySuggestion(strategySuggestion, questionnaire, data)
      : normalizeMarketingPlanQuestionnaire(questionnaire)
    setSuggestedPlanCreating(true)
    setError('')
    updateActiveSession({ questionnaire: nextQuestionnaire, result: null })
    try {
      if (activeSession?.tutorialDemo) {
        updateActiveSession({
          questionnaire: nextQuestionnaire,
          result: buildDesignerWorkflowDemoResult(nextQuestionnaire),
        })
        return
      }
      const created = await onGenerateMarketingPlan(nextQuestionnaire)
      updateActiveSession({ questionnaire: nextQuestionnaire, result: created })
    } catch (err) {
      console.error('Marketing plan generation failed:', err)
      setError(err instanceof Error ? err.message : 'Research project could not be created.')
    } finally {
      setSuggestedPlanCreating(false)
    }
  }

  useEffect(() => {
    if (!tutorialPrepareSignal?.stepId) return
    const stepId = tutorialPrepareSignal.stepId
    const tutorialId = tutorialPrepareSignal.tutorialId

    if (stepId === 'choose-path') {
      returnToPathSelection()
      return
    }

    if (tutorialId === 'designer-workflow-recommendation' && tutorialPrepareSignal.demoRecommendation && !activeSession?.tutorialDemo) {
      startDemoRecommendationSession()
      return
    }

    if (['suggest-next-step', 'optional-direction', 'recommendation-steps', 'open-next-step', 'create-suggested-setup'].includes(stepId)) {
      if (mode !== 'plan') {
        startSession('plan')
        return
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialPrepareSignal?.token])

  if (!mode) {
    return (
      <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        {sessionsOpen && (
          <WorkflowSessionManager
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={setActiveSessionId}
            onNew={() => setActiveSessionId(null)}
            onDelete={deleteSession}
          />
        )}
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
          <div style={{ ...styles.kicker, marginBottom: 6 }}>Guided wizard</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>What are we here to do?</h3>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.55 }}>
            Pick the scale of the work first. The next screen will walk through only the decisions needed for that path.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <button type="button" data-tour-id="designer-workflow-path-single" style={{ ...styles.templateButton, background: MARKETING_OPAQUE_CARD_BG }} onClick={() => chooseMode('singleItem')}>
            <strong style={{ fontSize: 14 }}>Add one content item</strong>
            <span style={{ ...styles.small, ...styles.muted }}>
              For a single carousel, post, email, or page update that needs research before scheduling.
            </span>
          </button>
          <button type="button" data-tour-id="designer-workflow-path-plan" style={{ ...styles.templateButton, background: MARKETING_OPAQUE_CARD_BG }} onClick={() => chooseMode('plan')}>
            <strong style={{ fontSize: 14 }}>Do larger-scale planning</strong>
            <span style={{ ...styles.small, ...styles.muted }}>
              For a small campaign with a goal, audience, funnel, content runway, links, and measurement.
            </span>
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'plan') {
    return (
      <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
        {sessionsOpen && (
          <WorkflowSessionManager
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={setActiveSessionId}
            onNew={() => setActiveSessionId(null)}
            onDelete={deleteSession}
          />
        )}
        <StrategyAgentStep
          data={data}
          questionnaire={questionnaire}
          prompt={strategyPrompt}
          loading={strategyLoading}
          saving={saving}
          error={strategyError || error}
          suggestion={strategySuggestion}
          usedAi={strategyUsedAi}
          result={result}
          demoRecommendation={!!activeSession?.tutorialDemo}
          creatingSuggestion={suggestedPlanCreating}
          strategyStepIndex={strategyStepIndex}
          onPromptChange={(nextPrompt) => {
            onTutorialAction('fill-optional-direction')
            updateActiveSession({
              strategyPrompt: nextPrompt,
              strategySuggestion: null,
              strategyUsedAi: null,
              strategyStepIndex: 0,
              result: null,
            })
            setStrategyError('')
          }}
          onSuggest={() => {
            onTutorialAction('suggest-next-step')
            void requestStrategySuggestion()
          }}
          onGenerate={() => void generateSuggestedPlan()}
          onResetSuggestion={() => {
            updateActiveSession({
              strategySuggestion: null,
              strategyUsedAi: null,
              strategyStepIndex: 0,
              result: null,
            })
            setStrategyError('')
          }}
          onOpenView={onOpenView}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
      {sessionsOpen && (
        <WorkflowSessionManager
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={setActiveSessionId}
          onNew={() => setActiveSessionId(null)}
          onDelete={deleteSession}
        />
      )}
      <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div>
            <div style={{ ...styles.kicker, marginBottom: 6 }}>{mode === 'singleItem' ? 'One item walkthrough' : 'Planning walkthrough'}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{currentStep.title}</h3>
          </div>
          <button
            type="button"
            style={{ ...styles.button, padding: '6px 9px', fontSize: 12 }}
            onClick={returnToPathSelection}
          >
            Change path
          </button>
        </div>
        <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.55 }}>
          {currentStep.detail}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 6 }}>
        {steps.map((step, index) => (
          <div
            key={step.title}
            style={{
              ...styles.templateButton,
              padding: 8,
              borderColor: index === stepIndex ? '#007385' : 'var(--card-border-color)',
              background: index === stepIndex ? '#102932' : MARKETING_OPAQUE_CARD_BG,
              cursor: 'default',
            }}
          >
            <span style={{ ...styles.small, fontWeight: 800 }}>Step {index + 1}</span>
            <span style={{ ...styles.small, ...styles.muted }}>{step.title}</span>
          </div>
        ))}
      </div>

      {stepIndex === 0 && (
        <div style={{ ...styles.card, boxShadow: 'none', padding: 12, display: 'grid', gap: 10 }}>
          <InputField label={mode === 'singleItem' ? 'What content item are we making?' : 'What is this plan about?'}>
            <input
              style={styles.input}
              value={questionnaire.topic}
              placeholder={mode === 'singleItem' ? 'Example: Instagram carousel about health data privacy' : 'Example: Housing affordability launch plan'}
              onChange={(event) => updateQuestionnaire({ topic: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Who should this reach?">
            <textarea
              style={{ ...styles.input, minHeight: 86, resize: 'vertical' }}
              value={questionnaire.audience}
              placeholder="Describe the people this should help, persuade, or invite."
              onChange={(event) => updateQuestionnaire({ audience: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Main objective">
            <Select
              value={questionnaire.objective}
              options={campaignObjectiveOptions}
              onChange={(value) => updateQuestionnaire({ objective: value })}
            />
          </InputField>
        </div>
      )}

      {stepIndex === 1 && (
        <div style={{ ...styles.card, boxShadow: 'none', padding: 12, display: 'grid', gap: 10 }}>
          <InputField label="Where should people go?">
            <input
              style={styles.input}
              value={questionnaire.destinationUrl}
              placeholder="https://..."
              onChange={(event) => updateQuestionnaire({ destinationUrl: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="How will we know it worked?">
            <input
              style={styles.input}
              value={questionnaire.primaryMetric}
              placeholder="Example: qualified visits, saves, replies, or link clicks"
              onChange={(event) => updateQuestionnaire({ primaryMetric: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Notes, constraints, or source material">
            <textarea
              style={{ ...styles.input, minHeight: 86, resize: 'vertical' }}
              value={questionnaire.notes}
              placeholder="Add source pages, examples, design constraints, or anything the planner should know."
              onChange={(event) => updateQuestionnaire({ notes: event.currentTarget.value })}
            />
          </InputField>
        </div>
      )}

      {stepIndex === 2 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <section style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Content questions to research</h3>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 5 }}>
                {buildCarouselFramePlan(preparedQuestionnaire).map((frame) => (
                  <li key={frame} style={{ ...styles.small, lineHeight: 1.45 }}>
                    {frame}
                  </li>
                ))}
              </ol>
            </section>

            <section style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>What the project stores now</h3>
              <div style={{ display: 'grid', gap: 7 }}>
                {getWizardCreationSummary({ mode, hasInstagram, hasAnalytics, questionnaire: preparedQuestionnaire }).map((item) => (
                  <div key={item} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr)', gap: 8, alignItems: 'start', ...styles.small }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: '#007385', marginTop: 5 }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div style={{ ...styles.card, boxShadow: 'none', padding: 12, display: 'grid', gap: 8 }}>
            <div style={{ ...styles.small, ...styles.muted }}>
              Current Instagram campaigns: {currentCampaignCount}.
            </div>
            <details style={{ ...styles.small, ...styles.muted }}>
              <summary style={{ cursor: 'pointer', color: 'var(--card-fg-color)', fontWeight: 800 }}>
                Planning skills this uses
              </summary>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {MARKETING_SKILL_INSPIRATIONS.map((skill) => (
                  <a
                    key={skill.name}
                    href={skill.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...styles.inlineLink, fontSize: 12, fontWeight: 700 }}
                  >
                    {skill.name}: {skill.lesson}
                  </a>
                ))}
              </div>
            </details>
            <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void generate()}>
              {saving
                ? 'Creating research project...'
                : mode === 'singleItem'
                  ? 'Create one-item research project'
                  : 'Create planning research project'}
            </button>
            {error && <div style={{ ...styles.small, color: '#E36216', fontWeight: 800 }}>{error}</div>}
            {result && (
              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  border: '1px solid rgba(54, 139, 87, 0.36)',
                  background: 'rgba(54, 139, 87, 0.12)',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <strong style={{ fontSize: 13 }}>Research project created: {result.title}</strong>
                <div style={{ ...styles.small, ...styles.muted }}>
                  Review the research findings first. When they are selected and approved, generate the campaign, funnel, calendar items, and Quick Links from Research.
                </div>
                <div data-tour-id="designer-workflow-created-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(result.researchProjectId || result.researchPlanId) && (
                    <button type="button" style={styles.button} onClick={() => onOpenView('research')}>
                      Open research project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          style={styles.primaryButton}
          disabled={stepIndex >= steps.length - 1}
          onClick={() => updateActiveSession({ stepIndex: Math.min(steps.length - 1, stepIndex + 1) })}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function WorkflowSessionManager({
  sessions,
  activeSessionId,
  onSelect,
  onNew,
  onDelete,
}: {
  sessions: DesignerWorkflowSession[]
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onNew: () => void
  onDelete: (sessionId: string) => void
}) {
  const visibleSessions = sessions.filter((session) => !session.ephemeral)

  return (
    <section style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10, background: MARKETING_OPAQUE_PANEL_BG }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Sessions {visibleSessions.length > 0 ? `(${visibleSessions.length})` : ''}</h3>
        <button type="button" style={{ ...styles.button, padding: '6px 9px', fontSize: 12 }} onClick={onNew}>
          New session
        </button>
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }} data-tour-id="designer-workflow-sessions-list">
        {visibleSessions.length === 0 ? (
          <div style={{ ...styles.small, ...styles.muted }}>No workflow sessions yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 6, maxHeight: 210, overflowY: 'auto' }}>
            {visibleSessions.map((session) => {
              const active = session.id === activeSessionId
              return (
                <div
                  key={session.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 6,
                    alignItems: 'stretch',
                  }}
                >
                  <button
                    type="button"
                    style={{
                      ...styles.templateButton,
                      background: active ? '#102932' : MARKETING_OPAQUE_CARD_BG,
                      borderColor: active ? '#007385' : 'var(--card-border-color)',
                    }}
                    onClick={() => onSelect(session.id)}
                  >
                    <strong style={{ fontSize: 13 }}>{session.title}</strong>
                    <span style={{ ...styles.small, ...styles.muted }}>
                      {session.mode === 'plan' ? 'Planning' : 'One item'} / {formatWorkflowSessionTime(session.updatedAt)}
                      {session.result ? ' / research created' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${session.title}`}
                    style={{ ...styles.button, width: 34, padding: 0 }}
                    onClick={() => onDelete(session.id)}
                  >
                    <CloseIcon style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function StrategyAgentStep({
  data,
  questionnaire,
  prompt,
  loading,
  saving,
  error,
  suggestion,
  usedAi,
  result,
  demoRecommendation,
  creatingSuggestion,
  strategyStepIndex,
  onPromptChange,
  onSuggest,
  onGenerate,
  onResetSuggestion,
  onOpenView,
}: {
  data: MarketingData
  questionnaire: MarketingPlanQuestionnaire
  prompt: string
  loading: boolean
  saving: boolean
  error: string
  suggestion: MarketingAiSuggestion | null
  usedAi: boolean | null
  result: CarouselWizardResult | null
  demoRecommendation: boolean
  creatingSuggestion: boolean
  strategyStepIndex: number
  onPromptChange: (prompt: string) => void
  onSuggest: () => void
  onGenerate: () => void
  onResetSuggestion: () => void
  onOpenView: (view: MarketingViewId) => void
}) {
  const recommendation = getStrategyAssistantRecommendation(data, suggestion, questionnaire, prompt, demoRecommendation)
  const safeStrategyStepIndex = Math.min(strategyStepIndex, Math.max(0, recommendation.steps.length - 1))
  const hasExistingPlan = !!getLatestActiveResearchProject(data)
  const canCreateResearchProject = !hasExistingPlan || demoRecommendation

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12, display: 'grid', gap: 12, background: MARKETING_OPAQUE_CARD_BG }}>
      {!suggestion && (
        <div style={{ display: 'grid', gap: 12 }}>
          <button type="button" data-tour-id="designer-workflow-suggest-button" style={{ ...styles.primaryButton, width: '100%' }} disabled={loading} onClick={onSuggest}>
            {loading ? 'Thinking...' : 'Suggest next step'}
          </button>

          <div data-tour-id="designer-workflow-optional-direction">
            <InputField label="Optional direction">
              <textarea
                style={{ ...styles.input, minHeight: 84, resize: 'vertical' }}
                value={prompt}
                onChange={(event) => onPromptChange(event.currentTarget.value)}
                placeholder={'Example: I want to make a plan for our Instagram content'}
              />
            </InputField>
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...styles.small, color: '#E36216' }}>
          {error}
        </div>
      )}

      {suggestion && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
          {recommendation.steps.length > 1 && (
            <WorkflowProgressMeter
              steps={recommendation.steps}
              currentIndex={safeStrategyStepIndex}
              complete={!!result}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>
                {demoRecommendation ? 'Tutorial sample' : usedAi ? 'AI recommendation' : 'Rule-based next step'}
              </div>
              <h3 style={{ margin: '4px 0', fontSize: 18 }}>{recommendation.title}</h3>
              <p style={{ ...styles.small, ...styles.muted, margin: 0 }}>{recommendation.detail}</p>
              {!demoRecommendation && usedAi === false && (
                <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0', lineHeight: 1.45 }}>
                  This was generated from CMS state and deterministic rules only. Run research before treating it as evidence.
                </p>
              )}
            </div>
            <button type="button" data-tour-id="designer-workflow-open-next-step" style={styles.button} onClick={() => onOpenView(recommendation.view)}>
              Open {getMarketingViewTitle(recommendation.view)}
            </button>
            <button type="button" style={styles.button} onClick={onResetSuggestion}>
              Change request
            </button>
          </div>
          {recommendation.strategicContext.length > 0 && (
            <details open style={{ borderTop: '1px solid var(--card-border-color)', marginTop: 12, paddingTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                Why this matters over time
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {recommendation.strategicContext.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      border: '1px solid var(--card-border-color)',
                      borderRadius: 8,
                      background: MARKETING_OPAQUE_CARD_BG,
                      padding: 10,
                      minHeight: 120,
                    }}
                  >
                    <strong style={{ ...styles.small, color: '#007385', display: 'block', marginBottom: 6 }}>{item.title}</strong>
                    <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>{item.detail}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
          {recommendation.steps.length > 0 && (
            <ol data-tour-id="designer-workflow-recommendation-steps" style={{ margin: '14px 0 0', paddingLeft: 0, display: 'grid', gap: 14, listStyle: 'none' }}>
              {recommendation.steps.map((step, index) => {
                const active = index === safeStrategyStepIndex && !result
                const done = index < safeStrategyStepIndex || !!result

                return (
                  <li
                    key={step}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '68px minmax(0, 1fr)',
                      gap: 12,
                      alignItems: 'start',
                      color: 'var(--card-fg-color)',
                      padding: '0 0 12px',
                      borderBottom: index === recommendation.steps.length - 1 ? 'none' : '1px solid var(--card-border-color)',
                    }}
                  >
                    <span
                      style={{
                        color: done || active ? '#007385' : 'var(--card-muted-fg-color)',
                        fontSize: 14,
                        fontWeight: 900,
                        letterSpacing: 0,
                      }}
                    >
                      Step {index + 1}
                    </span>
                    <span
                      style={{
                        color: active ? 'var(--card-fg-color)' : 'var(--card-muted-fg-color)',
                        fontSize: 15,
                        fontWeight: active ? 800 : 650,
                        lineHeight: 1.45,
                      }}
                    >
                      {step}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
          {!result && <ResearchOpportunityPreviewList opportunities={suggestion.researchPlan?.contentOpportunities || []} />}
          {!result && canCreateResearchProject && (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <button type="button" data-tour-id="designer-workflow-create-suggested-setup" style={{ ...styles.primaryButton, width: '100%' }} disabled={saving || creatingSuggestion || !!result} onClick={onGenerate}>
                {saving || creatingSuggestion
                  ? 'Creating...'
                  : demoRecommendation
                    ? 'Create demo research project'
                    : 'Create first research project'}
              </button>
            </div>
          )}
          {!result && !canCreateResearchProject && (
            <div style={{ ...styles.small, ...styles.muted, marginTop: 12, lineHeight: 1.5 }}>
              The latest research project already exists, so the assistant is pointing you to the next place to work instead of creating a duplicate.
            </div>
          )}
        </section>
      )}

      {result && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
          <strong>{result.demo ? 'Demo research project created locally' : 'Research project created'}: {result.title}</strong>
          {result.demo && (
            <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0' }}>
              No CMS records were saved. Closing or replacing this tutorial removes the demo effect.
            </p>
          )}
          <div data-tour-id="designer-workflow-created-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button type="button" style={styles.button} onClick={() => onOpenView('research')}>Open Research</button>
          </div>
        </section>
      )}
    </div>
  )
}

function WorkflowProgressMeter({
  steps,
  currentIndex,
  complete,
}: {
  steps: string[]
  currentIndex: number
  complete: boolean
}) {
  const safeIndex = Math.min(Math.max(currentIndex, 0), Math.max(0, steps.length - 1))
  const completedSteps = complete ? steps.length : Math.min(steps.length, safeIndex + 1)

  return (
    <div style={{ display: 'grid', gap: 6, marginBottom: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 10, alignItems: 'center' }}>
        <span style={{ ...styles.small, fontWeight: 800 }}>
          {complete ? 'Flow complete' : `Step ${safeIndex + 1} of ${steps.length}`}
        </span>
      </div>
      <div
        aria-label="Recommendation progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completedSteps}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 4 }}
      >
        {steps.map((step, index) => {
          const active = index === safeIndex && !complete
          const done = complete || index < safeIndex
          return (
            <div
              key={`${index}-${step}`}
              title={step}
              aria-label={`Recommendation step ${index + 1}: ${step}`}
              style={{
                height: 8,
                borderRadius: 999,
                background: done || active ? '#007385' : 'rgba(255, 255, 255, 0.14)',
                opacity: active ? 1 : done ? 0.75 : 0.45,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function MarketingAiAssistPanel({
  kind,
  draft,
  analyticsTakeaways = [],
  onApply,
}: {
  kind: MarketingAssistKind
  draft: Record<string, unknown>
  analyticsTakeaways?: AnalyticsInterpretation[]
  onApply: (suggestion: MarketingAiSuggestion) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState<MarketingAiSuggestion | null>(null)
  const [usedAi, setUsedAi] = useState<boolean | null>(null)
  const [context, setContext] = useState<MarketingAiAssistResponse['context'] | null>(null)
  const [applied, setApplied] = useState(false)
  const copy = marketingAiAssistCopy[kind]
  const section = suggestion ? getAiSuggestionSection(suggestion, kind) : null
  const suggestedFields = section ? getAiSuggestedFieldLabels(section).slice(0, 8) : []
  const guidedQuestions = getMarketingAutofillQuestions(kind)

  const requestSuggestion = async () => {
    setLoading(true)
    setError('')
    setApplied(false)
    try {
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          draft: {
            ...draft,
            autofillGuidance: guidedAnswers,
          },
          prompt: buildAutofillGuidedPrompt({
            basePrompt: `Auto-fill this ${copy.target} from existing GoInvo site/CMS content, strategy records, research, analytics takeaways, and the current draft.`,
            guidance: guidedAnswers,
            notes: prompt,
            questions: guidedQuestions,
          }),
          analyticsTakeaways: serializeAnalyticsTakeawaysForAi(analyticsTakeaways),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      if (!response.ok || !payload.suggestion) throw new Error(payload.error || 'The assistant could not create a suggestion.')
      setSuggestion(payload.suggestion)
      setUsedAi(!!payload.usedAi)
      setContext(payload.context || null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The assistant could not create a suggestion.')
    } finally {
      setLoading(false)
    }
  }

  const applySuggestion = () => {
    if (!suggestion || !section) return
    onApply(suggestion)
    setApplied(true)
  }

  return (
    <div data-testid={`marketing-ai-assist-${kind}`} style={{ ...styles.guidePanel, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Auto-fill from existing content</h3>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
            Auto-fills a starter {copy.target} from existing GoInvo site/CMS content, strategy records, research, analytics takeaways, and the current draft.
          </p>
        </div>
        <button
          type="button"
          data-testid={`marketing-ai-suggest-${kind}`}
          style={{ ...styles.button, whiteSpace: 'nowrap' }}
          disabled={loading}
          onClick={() => void requestSuggestion()}
        >
          {loading ? 'Thinking...' : 'Auto-fill draft'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {copy.fills.map((field) => (
          <span
            key={field}
            style={{
              ...styles.small,
              border: '1px solid rgba(0, 115, 133, 0.24)',
              borderRadius: 999,
              padding: '3px 8px',
              background: 'rgba(0, 115, 133, 0.08)',
            }}
          >
            {field}
          </span>
        ))}
        {analyticsTakeaways.length > 0 && (
          <span
            style={{
              ...styles.small,
              border: '1px solid rgba(227, 98, 22, 0.28)',
              borderRadius: 999,
              padding: '3px 8px',
              background: 'rgba(227, 98, 22, 0.08)',
              color: '#E36216',
              fontWeight: 800,
            }}
          >
            {analyticsTakeaways.length} analytics takeaway{analyticsTakeaways.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <textarea
        aria-label={`Optional notes for this ${copy.target} autofill`}
        rows={2}
        style={{ ...styles.input, marginTop: 10 }}
        value={prompt}
        onChange={(event) => setPrompt(event.currentTarget.value)}
        placeholder={`${copy.prompt} Optional: add a constraint, example, or direction.`}
      />
      <GuidedAutofillControls questions={guidedQuestions} values={guidedAnswers} onChange={setGuidedAnswers} />
      {error && (
        <div style={{ ...styles.small, color: '#E36216', marginTop: 8 }}>
          {error}
        </div>
      )}
      {suggestion && (
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <div style={{ ...styles.card, boxShadow: 'none', padding: 10 }}>
            <strong style={{ fontSize: 13 }}>{suggestion.summary || 'Suggested setup'}</strong>
            {suggestion.rationale && suggestion.rationale.length > 0 && (
              <div style={{ display: 'grid', gap: 5, marginTop: 8 }}>
                {suggestion.rationale.slice(0, 4).map((item) => (
                  <div key={item} style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span
              style={{
                ...styles.small,
                border: '1px solid rgba(0, 115, 133, 0.28)',
                borderRadius: 999,
                padding: '4px 9px',
                color: '#007385',
                fontWeight: 800,
              }}
            >
              {usedAi ? 'AI generated' : 'Rule-based draft'}
            </span>
            {context && (
              <span style={{ ...styles.small, ...styles.muted }}>
                Checked {context.features || 0} articles, {context.caseStudies || 0} case studies, {context.campaigns || 0} campaigns, and {context.analyticsTakeaways || 0} analytics takeaways.
              </span>
            )}
          </div>
          {suggestion.siteReferences && suggestion.siteReferences.length > 0 && (
            <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--card-fg-color)' }}>Site context: </strong>
              {suggestion.siteReferences
                .slice(0, 3)
                .map((reference) => reference.title)
                .filter(Boolean)
                .join(', ')}
            </div>
          )}
          {suggestedFields.length > 0 && (
            <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--card-fg-color)' }}>Will fill: </strong>
              {suggestedFields.join(', ')}
            </div>
          )}
          {usedAi === false && (
            <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
              This is not researched evidence. It is a deterministic draft from the current CMS state and should be reviewed before saving.
            </div>
          )}
          {section && (
            <details style={{ border: '1px solid var(--card-border-color)', borderRadius: 6, padding: 10 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>Preview exact fields</summary>
              <pre style={{ ...styles.small, whiteSpace: 'pre-wrap', margin: '8px 0 0', color: 'var(--card-muted-fg-color)' }}>
                {JSON.stringify(section, null, 2)}
              </pre>
            </details>
          )}
          <button
            type="button"
            data-testid={`marketing-ai-apply-${kind}`}
            style={styles.primaryButton}
            disabled={!section}
            onClick={applySuggestion}
          >
            Apply to draft
          </button>
          {applied && (
            <div style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>
              Applied. Review the filled fields, then save this item.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function getMarketingAutofillQuestions(kind: MarketingAssistKind): GuidedAutofillQuestion[] {
  const sourceQuestion: GuidedAutofillQuestion = {
    id: 'source',
    label: 'What should it use first?',
    choices: [
      { value: 'site', label: 'Site/CMS content', description: 'Prefer existing articles, case studies, links, and CMS records.' },
      { value: 'research', label: 'Research findings', description: 'Prefer approved/selected research results and source evidence.' },
      { value: 'strategy', label: 'Strategy records', description: 'Prefer existing audiences, messages, proof, CTAs, and quality gates.' },
      { value: 'analytics', label: 'Analytics signals', description: 'Prefer analytics takeaways and performance signals.' },
    ],
  }
  const scopeQuestion: GuidedAutofillQuestion = {
    id: 'scope',
    label: 'How much should it create?',
    choices: [
      { value: 'minimal', label: 'Minimal', description: 'Fill only the fields needed to keep moving.' },
      { value: 'complete', label: 'Complete draft', description: 'Fill as many relevant fields as possible for review.' },
      { value: 'repair', label: 'Repair gaps', description: 'Focus on missing or weak fields in the current draft.' },
    ],
  }

  if (kind === 'researchProject' || kind === 'researchSynthesis' || kind === 'researchPlan') {
    return [
      sourceQuestion,
      {
        id: 'researchType',
        label: 'What kind of research?',
        choices: [
          { value: 'topic', label: 'Topic', description: 'Understand one topic, source, keyword cluster, or content opportunity.' },
          { value: 'strategy', label: 'Strategy', description: 'Clarify positioning, audience, channels, and release direction.' },
          { value: 'competitor', label: 'Competitor', description: 'Compare peer examples, content patterns, and positioning gaps.' },
        ],
      },
      scopeQuestion,
    ]
  }

  if (kind === 'campaign' || kind === 'funnel' || kind === 'template') {
    return [
      sourceQuestion,
      {
        id: 'goal',
        label: 'What is the main goal?',
        choices: [
          { value: 'awareness', label: 'Awareness', description: 'Help more people understand the idea or artifact.' },
          { value: 'engagement', label: 'Engagement', description: 'Encourage saves, replies, shares, or repeat attention.' },
          { value: 'conversion', label: 'Conversion', description: 'Move qualified visitors to a source, contact, download, or action.' },
        ],
      },
      scopeQuestion,
    ]
  }

  if (kind === 'calendarItem') {
    return [
      sourceQuestion,
      {
        id: 'format',
        label: 'What are we making?',
        choices: [
          { value: 'instagramCarousel', label: 'IG carousel', description: 'Turn one idea into a slide-by-slide social artifact.' },
          { value: 'articleLink', label: 'Article/link post', description: 'Point people to a canonical source or deeper article.' },
          { value: 'email', label: 'Email/newsletter', description: 'Frame the content for a subscriber or relationship-building audience.' },
        ],
      },
      scopeQuestion,
    ]
  }

  if (kind === 'linkItem') {
    return [
      sourceQuestion,
      {
        id: 'destination',
        label: 'What should the link do?',
        choices: [
          { value: 'source', label: 'Open source', description: 'Send visitors to the primary article, project, or source.' },
          { value: 'campaign', label: 'Support campaign', description: 'Connect the link to a campaign or calendar item.' },
          { value: 'evergreen', label: 'Evergreen', description: 'Keep it useful beyond one social post.' },
        ],
      },
      scopeQuestion,
    ]
  }

  if (kind === 'channel') {
    return [
      sourceQuestion,
      {
        id: 'channelUse',
        label: 'How will the channel be used?',
        choices: [
          { value: 'social', label: 'Social publishing', description: 'Use formats like carousel, post, story, or short video.' },
          { value: 'owned', label: 'Owned audience', description: 'Use email, newsletter, website, or recurring updates.' },
          { value: 'partner', label: 'Partner/collab', description: 'Use collaborations, universities, guests, or partner orgs.' },
        ],
      },
      scopeQuestion,
    ]
  }

  if (kind === 'analyticsSource') {
    return [
      {
        ...sourceQuestion,
        choices: sourceQuestion.choices.filter((choice) => choice.value !== 'site'),
      },
      {
        id: 'measurement',
        label: 'What should it measure?',
        choices: [
          { value: 'traffic', label: 'Useful visits', description: 'Track destination visits, source clicks, and page engagement.' },
          { value: 'social', label: 'Social response', description: 'Track saves, shares, replies, and follower/content signals.' },
          { value: 'conversion', label: 'Qualified action', description: 'Track contact, downloads, signup, or other concrete action.' },
        ],
      },
      scopeQuestion,
    ]
  }

  return [sourceQuestion, scopeQuestion]
}

function ResearchWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
  onOpenView,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenView: (view: MarketingViewId) => void
}) {
  const [selectedId, setSelectedId] = useState(data.researchProjects[0]?._id || '')
  const [migrationMessage, setMigrationMessage] = useState('')

  useEffect(() => {
    if (selectedId && data.researchProjects.some((project) => project._id === selectedId)) return
    setSelectedId(data.researchProjects[0]?._id || '')
  }, [data.researchProjects, selectedId])

  const selectedProject = data.researchProjects.find((project) => project._id === selectedId) || null

  const createProject = async () => {
    const id = await createDocument(createResearchProjectDocument(data))
    setSelectedId(id)
  }

  const importLegacyPlan = async (plan: MarketingResearchPlan) => {
    setMigrationMessage('')
    const project = await migrateLegacyResearchPlanToProject(client, plan)
    await loadData()
    setSelectedId(project._id)
    setMigrationMessage(`Imported "${plan.title || 'legacy plan'}" as a research project. The original plan was left intact.`)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <section style={styles.panel}>
        <PanelHeading
          title="Research projects"
          description="Start with a directive, gather findings, then generate records only from reviewed results."
        />
        <button type="button" style={{ ...styles.primaryButton, width: '100%', marginBottom: 12 }} onClick={() => void createProject()}>
          Add research project
        </button>
        {data.researchProjects.length === 0 ? (
          <EmptyInline title="No research projects yet. Add one before generating release plans or records." />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.researchProjects.map((project) => {
              const resultCount = data.researchResults.filter((result) => result.project?._id === project._id).length
              const approvedCount = data.researchResults.filter((result) => result.project?._id === project._id && isResearchResultApproved(result)).length
              return (
              <button
                key={project._id}
                type="button"
                style={{
                  ...styles.templateButton,
                  borderColor: project._id === selectedId ? '#007385' : 'var(--card-border-color)',
                  background: project._id === selectedId ? 'rgba(0, 115, 133, 0.1)' : 'var(--card-bg-color)',
                }}
                onClick={() => setSelectedId(project._id)}
              >
                <span style={{ fontWeight: 800 }}>{project.title || 'Untitled research project'}</span>
                <span style={{ ...styles.small, ...styles.muted }}>
                  {labelFor(researchProjectStatusOptions, project.status) || 'Draft'} / {labelFor(researchProjectTypeOptions, project.researchType) || 'Topic research'} / {project.targetGeography || 'us'}
                </span>
                <span style={{ ...styles.small, ...styles.muted }}>
                  {approvedCount}/{resultCount} reviewed result{resultCount === 1 ? '' : 's'}
                </span>
              </button>
            )})}
          </div>
        )}
        {data.researchPlans.length > 0 && (
          <details style={{ marginTop: 14 }}>
            <summary style={{ ...styles.small, fontWeight: 800, cursor: 'pointer' }}>Legacy research plans ({data.researchPlans.length})</summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {migrationMessage && <div style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>{migrationMessage}</div>}
              {data.researchPlans.map((plan) => (
                <div key={plan._id} style={{ ...styles.card, boxShadow: 'none', padding: 10 }}>
                  <strong style={{ fontSize: 13 }}>{plan.title || 'Untitled legacy plan'}</strong>
                  <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 8px' }}>
                    Legacy plan docs are preserved. Import one to map its fields into project/results.
                  </p>
                  <button type="button" style={styles.button} onClick={() => void importLegacyPlan(plan)}>
                    Import as project
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <ResearchProjectEditor
        client={client}
        project={selectedProject}
        data={data}
        saving={!!selectedProject && savingId === selectedProject._id}
        onSave={commitPatch}
        loadData={loadData}
        onOpenView={onOpenView}
      />
    </div>
  )
}

function ResearchProjectEditor({
  client,
  project,
  data,
  saving,
  onSave,
  loadData,
  onOpenView,
}: {
  client: StudioClient
  project: MarketingResearchProject | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  loadData: () => Promise<void>
  onOpenView: (view: MarketingViewId) => void
}) {
  const [draft, setDraft] = useState<MarketingResearchProject | null>(project)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [converting, setConverting] = useState(false)
  const [researchPage, setResearchPage] = useState<'setup' | 'review' | 'synthesize'>('setup')
  const analyticsTakeaways = useMemo(() => buildAnalyticsInterpretations(data), [data])

  useEffect(() => {
    setDraft(project)
    setMessage('')
    setError('')
    setResearchPage('setup')
  }, [project])

  const projectResults = draft ? getResearchResultsForProject(data, draft._id) : []
  const projectRuns = draft ? getResearchRunsForProject(data, draft._id) : []
  const selectedRefIds = (draft?.selectedResults || []).map((result) => result._id).filter(Boolean)
  const selectedResultIds = Array.from(
    new Set([
      ...selectedRefIds,
      ...projectResults.filter((result) => result.selectedForSynthesis || result.status === 'selected').map((result) => result._id),
    ]),
  )
  const approvedResultIds = projectResults.filter(isResearchResultApproved).map((result) => result._id)
  const selectedApprovedIds = selectedResultIds.filter((id) => approvedResultIds.includes(id))
  const hasGeneratedResearch = projectRuns.length > 0 || projectResults.length > 0

  if (!draft) {
    return <EmptyPanel icon={SearchIcon} title="Select a research project" description="Create or reopen a project before making plans, campaigns, calendar items, or Quick Links." />
  }

  const updateDraft = <K extends keyof MarketingResearchProject>(key: K, value: MarketingResearchProject[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
    setMessage('')
    setError('')
  }

  const saveDraft = async () => {
    if (!draft._id) return
    await onSave(draft._id, buildResearchProjectSavePayload(draft))
    setMessage('Research project saved.')
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const projectSuggestion = suggestion.researchProject || {}
    setDraft((current) => (current ? mergeResearchProjectSuggestion(current, projectSuggestion) : current))
    setMessage('Suggested research setup applied. Review it, then run research.')
    setError('')
  }

  const regenerateResearchSetup = async () => {
    if (!draft._id) return
    if (!hasGeneratedResearch) {
      setMessage('Run research once before regenerating it.')
      return
    }
    setRegenerating(true)
    setError('')
    setMessage('')
    try {
      const prompt = [
        `Regenerate this as ${labelFor(researchProjectTypeOptions, draft.researchType) || 'topic research'}.`,
        'Use the current title, directive, audience, seed inputs, and GoInvo site context.',
        'Refresh the methods, seed keywords, seed URLs, and research questions so the project matches the selected research type.',
        'Preserve reviewed results and downstream records; only update the project setup.',
      ].join(' ')
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'researchProject',
          draft,
          prompt,
          analyticsTakeaways: serializeAnalyticsTakeawaysForAi(analyticsTakeaways),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      if (!response.ok || !payload.suggestion?.researchProject) throw new Error(payload.error || 'Research setup could not be regenerated.')
      const nextDraft = mergeResearchProjectSuggestion(draft, payload.suggestion.researchProject)
      setDraft(nextDraft)
      await onSave(draft._id, buildResearchProjectSavePayload(nextDraft))
      await loadData()
      setMessage(`Research setup regenerated${payload.usedAi ? ' with AI' : ' from rule-based drafting'}. Review the updated questions, then run research again when ready.`)
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : 'Research setup could not be regenerated.')
    } finally {
      setRegenerating(false)
    }
  }

  const runResearch = async () => {
    if (!draft._id) return
    setRunning(true)
    setError('')
    setMessage('')
    try {
      await onSave(draft._id, buildResearchProjectSavePayload(draft))
      const response = await fetch('/api/marketing/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: draft._id,
          methods: draft.methods && draft.methods.length > 0 ? draft.methods : defaultResearchMethodsForType(draft.researchType),
          seedKeywords: draft.seedKeywords || [],
          seedUrls: draft.seedUrls || [],
          database: draft.targetGeography || 'us',
        }),
      })
      const payload = (await response.json()) as { runId?: string; createdResults?: number; warnings?: string[]; errors?: string[]; error?: string }
      if (!response.ok) throw new Error(payload.error || payload.errors?.[0] || 'Research run failed.')
      await loadData()
      const warningText = payload.warnings && payload.warnings.length > 0 ? ` Warnings: ${payload.warnings.join(' ')}` : ''
      setMessage(`Research run complete. Created ${payload.createdResults || 0} finding${payload.createdResults === 1 ? '' : 's'}.${warningText}`)
      setResearchPage('review')
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Research run failed.')
    } finally {
      setRunning(false)
    }
  }

  const setResultSelected = async (result: MarketingResearchResult, selected: boolean) => {
    const nextSelected = selected
      ? Array.from(new Set([...selectedResultIds, result._id]))
      : selectedResultIds.filter((id) => id !== result._id)
    await client
      .patch(result._id)
      .set({
        selectedForSynthesis: selected,
        status: selected ? (result.status === 'approved' ? 'approved' : 'selected') : result.status === 'selected' ? 'needsReview' : result.status || 'needsReview',
      })
      .commit()
    await onSave(draft._id, { selectedResults: refsFromIds(nextSelected) }, nextSelected.length > 0 ? [] : ['selectedResults'])
    await loadData()
  }

  const approveResult = async (result: MarketingResearchResult) => {
    const nextSelected = Array.from(new Set([...selectedResultIds, result._id]))
    const nextApproved = Array.from(new Set([...approvedResultIds, result._id]))
    await client
      .patch(result._id)
      .set({
        status: 'approved',
        selectedForSynthesis: true,
        approvedAt: new Date().toISOString(),
      })
      .commit()
    await onSave(draft._id, {
      selectedResults: refsFromIds(nextSelected),
      approvedResults: refsFromIds(nextApproved),
    })
    await loadData()
  }

  const generateLinkedRecords = async () => {
    if (!draft._id) return
    setConverting(true)
    setError('')
    setMessage('')
    try {
      if (selectedApprovedIds.length === 0) throw new Error('Approve and select at least one research finding before generating records.')
      await onSave(draft._id, buildResearchProjectSavePayload(draft))
      const result = await createResearchProjectGeneratedRecords(client, data, draft, selectedApprovedIds)
      await loadData()
      setMessage(`Generated ${result.calendarItemIds.length} draft calendar item${result.calendarItemIds.length === 1 ? '' : 's'}, campaign, funnel, and Quick Link records from approved research findings.`)
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Could not generate linked records.')
    } finally {
      setConverting(false)
    }
  }

  const addQuestion = () => updateDraft('researchQuestions', [...(draft.researchQuestions || []), createResearchProjectQuestion(draft)])
  const addCollaborator = () => updateDraft('collaborators', [...(draft.collaborators || []), createResearchProjectCollaborator()])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={styles.kicker}>Research first</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{draft.title || 'Untitled research project'}</h2>
            <p style={{ ...styles.muted, margin: '5px 0 0', lineHeight: 1.55 }}>
              Projects direct the research. Results store the evidence. Campaigns, funnels, calendar items, and Quick Links come after review.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['converted', 'archived'].includes(draft.status || '') && (
              <button type="button" style={styles.button} onClick={() => updateDraft('status', 'reviewing')}>
                Reopen
              </button>
            )}
            <button type="button" style={styles.button} onClick={() => void saveDraft()} disabled={saving}>
              {saving ? 'Saving...' : 'Save project'}
            </button>
            <button
              type="button"
              style={{
                ...styles.button,
                opacity: hasGeneratedResearch ? 1 : 0.45,
                cursor: hasGeneratedResearch ? 'pointer' : 'not-allowed',
              }}
              title={hasGeneratedResearch ? 'Refresh this project setup from the latest research state.' : 'Run research once before regenerating it.'}
              onClick={() => void regenerateResearchSetup()}
              disabled={!hasGeneratedResearch || regenerating || running || saving}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate research'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {[
            ['1', 'Define project', draft.brief ? 'Ready' : 'Needs directive'],
            ['2', 'Run research', `${projectRuns.length} run${projectRuns.length === 1 ? '' : 's'}`],
            ['3', 'Review findings', `${selectedApprovedIds.length}/${projectResults.length} selected`],
            ['4', 'Generate records', selectedApprovedIds.length > 0 ? 'Ready' : 'Waiting'],
          ].map(([step, title, detail]) => (
            <div key={step} style={{ ...styles.card, boxShadow: 'none', padding: 10 }}>
              <div style={styles.kicker}>Step {step}</div>
              <strong>{title}</strong>
              <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>{detail}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {[
            { id: 'setup', label: 'Research setup', enabled: true },
            { id: 'review', label: 'Review findings', enabled: hasGeneratedResearch },
            { id: 'synthesize', label: 'Synthesize and generate', enabled: hasGeneratedResearch },
          ].map((page) => {
            const active = researchPage === page.id
            return (
              <button
                key={page.id}
                type="button"
                style={{
                  ...(active ? styles.primaryButton : styles.button),
                  opacity: page.enabled ? 1 : 0.45,
                  cursor: page.enabled ? 'pointer' : 'not-allowed',
                }}
                onClick={() => page.enabled && setResearchPage(page.id as 'setup' | 'review' | 'synthesize')}
                disabled={!page.enabled}
                title={page.enabled ? undefined : 'Run research before opening this page.'}
              >
                {page.label}
              </button>
            )
          })}
        </div>

        <MarketingAiAssistPanel
          kind="researchProject"
          draft={draft as unknown as Record<string, unknown>}
          analyticsTakeaways={analyticsTakeaways}
          onApply={applyAiSuggestion}
        />

        {message && <div style={{ ...styles.small, color: '#007385', fontWeight: 800, marginTop: 12 }}>{message}</div>}
        {error && <div style={{ ...styles.small, color: '#E36216', fontWeight: 800, marginTop: 12 }}>{error}</div>}
      </section>

      {researchPage === 'setup' && (
        <>
      <section style={styles.panel}>
        <PanelHeading title="Research project inputs" description="Give the research enough direction to know what to score, scan, and review." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <InputField label="Project title">
            <input style={styles.input} value={draft.title || ''} onChange={(event) => updateDraft('title', event.currentTarget.value)} />
          </InputField>
          <InputField label="Status">
            <Select value={draft.status || 'draft'} options={researchProjectStatusOptions} onChange={(value) => updateDraft('status', value)} />
          </InputField>
          <InputField label="Research type">
            <Select
              value={draft.researchType || 'topic'}
              options={researchProjectTypeOptions}
              onChange={(value) => {
                const nextType = value || 'topic'
                updateDraft('researchType', nextType)
                updateDraft('methods', defaultResearchMethodsForType(nextType))
                updateDraft('researchQuestions', defaultResearchQuestionsForType(nextType, draft.title || 'this research project'))
              }}
            />
          </InputField>
          <InputField label="Objective">
            <Select value={draft.campaignObjective || 'awareness'} options={campaignObjectiveOptions} onChange={(value) => updateDraft('campaignObjective', value)} />
          </InputField>
          <InputField label="Semrush database">
            <input style={styles.input} value={draft.targetGeography || 'us'} onChange={(event) => updateDraft('targetGeography', event.currentTarget.value)} />
          </InputField>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <InputField label="Research directive">
            <textarea rows={4} style={styles.input} value={draft.brief || ''} onChange={(event) => updateDraft('brief', event.currentTarget.value)} />
          </InputField>
          <InputField label="Audience">
            <textarea rows={3} style={styles.input} value={draft.audience || ''} onChange={(event) => updateDraft('audience', event.currentTarget.value)} />
          </InputField>
          <InputField label="Goals">
            <textarea rows={3} style={styles.input} value={stringListToText(draft.goals)} onChange={(event) => updateDraft('goals', textToStringList(event.currentTarget.value))} />
          </InputField>
          <InputField label="Positioning hypothesis">
            <textarea rows={3} style={styles.input} value={draft.positioning || ''} onChange={(event) => updateDraft('positioning', event.currentTarget.value)} />
          </InputField>
          <InputField label="Likely canonical URL">
            <input style={styles.input} value={draft.canonicalUrl || ''} onChange={(event) => updateDraft('canonicalUrl', event.currentTarget.value)} />
          </InputField>
        </div>
      </section>

      <section style={styles.panel}>
        <PanelHeading title="Run research" description="Semrush creates provider-scored keyword findings. CMS and source scans summarize evidence, implications, and gaps for review." />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
          <InputField label="Seed keywords">
            <textarea rows={5} style={styles.input} value={stringListToText(draft.seedKeywords)} onChange={(event) => updateDraft('seedKeywords', textToStringList(event.currentTarget.value))} />
          </InputField>
          <InputField label="Seed URLs">
            <textarea rows={5} style={styles.input} value={stringListToText(draft.seedUrls)} onChange={(event) => updateDraft('seedUrls', textToStringList(event.currentTarget.value))} />
          </InputField>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
          {[
            { title: 'Semrush keyword scores', value: 'seoReview' },
            { title: 'CMS / site scan', value: 'cmsScan' },
            { title: 'Source evidence review', value: 'sourceReview' },
            { title: 'Analytics review', value: 'analyticsReview' },
            { title: 'Competitive scan', value: 'competitiveScan' },
          ].map((method) => (
            <label key={method.value} style={{ display: 'inline-flex', gap: 7, alignItems: 'center', ...styles.small }}>
              <input
                type="checkbox"
                checked={(draft.methods || defaultResearchMethodsForType(draft.researchType)).includes(method.value)}
                onChange={(event) => {
                  const current = draft.methods || defaultResearchMethodsForType(draft.researchType)
                  updateDraft('methods', event.currentTarget.checked ? Array.from(new Set([...current, method.value])) : current.filter((item) => item !== method.value))
                }}
              />
              {method.title}
            </label>
          ))}
        </div>
        {projectRuns.length > 0 && (
          <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
            {projectRuns.slice(0, 4).map((run) => (
              <div key={run._id} style={{ ...styles.card, boxShadow: 'none', padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{run.title || 'Research run'}</strong>
                  <StatusPill status={run.status} options={researchRunStatusOptions} />
                </div>
                <div style={{ ...styles.small, ...styles.muted, marginTop: 5 }}>
                  {(run.methods || []).join(', ') || 'No methods'} / {(run.createdResults || []).length} finding{(run.createdResults || []).length === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <button type="button" style={styles.button} onClick={() => void saveDraft()} disabled={saving || running}>
            {saving ? 'Saving...' : 'Save project'}
          </button>
          <button type="button" style={styles.primaryButton} onClick={() => void runResearch()} disabled={running || saving}>
            {running ? 'Running...' : 'Run research'}
          </button>
        </div>
      </section>
        </>
      )}

      {researchPage === 'review' && (
      <section style={styles.panel}>
        <PanelHeading title="Review research findings" description="Approve only the findings that contain usable evidence, gaps, or keyword signals for downstream work." />
        {projectResults.length === 0 ? (
          <EmptyInline title="No research findings yet. Run research to fetch SEO scores, scan CMS content, and summarize source pages." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {projectResults.map((result) => {
              const selected = selectedResultIds.includes(result._id)
              return (
                <div key={result._id} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
                    <input type="checkbox" checked={selected} onChange={(event) => void setResultSelected(result, event.currentTarget.checked)} />
                    <div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>{result.title || result.keyword || 'Research finding'}</strong>
                        <StatusPill status={result.resultType} options={researchResultTypeOptions} />
                        <StatusPill status={result.status} options={researchResultStatusOptions} />
                      </div>
                      <div style={{ ...styles.small, ...styles.muted, marginTop: 6, lineHeight: 1.5 }}>
                        {describeResearchResult(result)}
                      </div>
                      {(result.sourceUrl || result.competitorUrl || result.canonicalUrl) && (
                        <a
                          href={result.sourceUrl || result.competitorUrl || result.canonicalUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ ...styles.small, color: '#00A0B6', display: 'inline-block', marginTop: 7, fontWeight: 800 }}
                        >
                          Open source
                        </a>
                      )}
                      {result.provider === 'semrush' && result.scoreSource === 'provider' && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          <MetricBadge label="Volume" value={formatOptionalNumber(result.volume)} />
                          <MetricBadge label="KD" value={formatOptionalNumber(result.difficulty)} />
                          <MetricBadge label="CPC" value={formatOptionalMoney(result.cpc)} />
                          <MetricBadge label="Competition" value={formatOptionalNumber(result.competition)} />
                        </div>
                      )}
                      {result.implication && <FindingDetail label="Content implication" text={result.implication} />}
                      {result.contentGap && <FindingDetail label={result.resultType === 'contentGap' ? 'Gap to resolve' : 'Gap / review check'} text={result.contentGap} />}
                    </div>
                    <button type="button" style={styles.button} onClick={() => void approveResult(result)} disabled={result.status === 'approved'}>
                      {result.status === 'approved' ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {researchPage === 'synthesize' && (
      <section style={styles.panel}>
        <PanelHeading title="Synthesize and generate" description="Use selected findings to generate downstream records with research provenance attached." />
        <MarketingAiAssistPanel
          kind="researchSynthesis"
          draft={{
            projectId: draft._id,
            title: draft.title,
            brief: draft.brief,
            selectedResultIds: selectedApprovedIds,
            selectedResults: projectResults.filter((result) => selectedApprovedIds.includes(result._id)).map(summarizeResearchResultForAi),
          }}
          analyticsTakeaways={analyticsTakeaways}
          onApply={(suggestion) => {
            const synthesis = suggestion.researchSynthesis
            setMessage(synthesis?.releaseRecommendation || synthesis?.summary || 'Research synthesis received. Review selected findings before generating records.')
          }}
        />
        <button
          type="button"
          style={{ ...styles.primaryButton, width: '100%', marginTop: 12 }}
          onClick={() => void generateLinkedRecords()}
          disabled={converting || selectedApprovedIds.length === 0}
        >
          {converting ? 'Generating...' : 'Generate records from approved findings'}
        </button>
        {selectedApprovedIds.length === 0 && (
          <p style={{ ...styles.small, ...styles.muted, margin: '8px 0 0' }}>
            Approve and select at least one finding before creating campaigns, funnels, calendar items, or Quick Links.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" style={styles.button} onClick={() => onOpenView('campaigns')}>Open Campaigns</button>
          <button type="button" style={styles.button} onClick={() => onOpenView('funnels')}>Open Funnels</button>
          <button type="button" style={styles.button} onClick={() => onOpenView('calendar')}>Open Calendar</button>
          <button type="button" style={styles.button} onClick={() => onOpenView('linkTree')}>Open Quick Links</button>
        </div>
      </section>
      )}

      {researchPage === 'setup' && (
        <>
      <ResearchArrayModule
        title="Research questions"
        description="Manual questions stay on the project; answers should become result records."
        actionLabel="Add question"
        onAdd={addQuestion}
      >
        {(draft.researchQuestions || []).length === 0 ? (
          <EmptyInline title="No research questions yet." />
        ) : (
          (draft.researchQuestions || []).map((question, index) => (
            <div key={question._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(150px, 0.4fr) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Question">
                  <input
                    style={styles.input}
                    value={question.question || ''}
                    onChange={(event) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { question: event.currentTarget.value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <InputField label="Method">
                  <Select
                    value={question.method || 'deskResearch'}
                    options={researchMethodOptions}
                    onChange={(value) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { method: value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('researchQuestions', removeResearchArrayItem(draft.researchQuestions, index))}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Collaborators and interns"
        description="Add people and capacity signals before research synthesis so timing can shift around real availability."
        actionLabel="Add collaborator"
        onAdd={addCollaborator}
      >
        {(draft.collaborators || []).length === 0 ? (
          <EmptyInline title="No collaborators yet." />
        ) : (
          (draft.collaborators || []).map((collaborator, index) => (
            <div key={collaborator._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <InputField label="Name">
                  <input
                    style={styles.input}
                    value={collaborator.name || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { name: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
                <InputField label="Organization">
                  <input
                    style={styles.input}
                    value={collaborator.organization || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { organization: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
                <InputField label="Topic area">
                  <input
                    style={styles.input}
                    value={collaborator.topicArea || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { topicArea: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
                <InputField label="Capacity">
                  <input
                    style={styles.input}
                    value={collaborator.capacity || ''}
                    onChange={(event) => updateDraft('collaborators', updateResearchArrayItem(draft.collaborators, index, { capacity: event.currentTarget.value, _type: 'researchCollaborator' }))}
                  />
                </InputField>
              </div>
              <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => updateDraft('collaborators', removeResearchArrayItem(draft.collaborators, index))}>
                Remove collaborator
              </button>
            </div>
          ))
        )}
      </ResearchArrayModule>
        </>
      )}
    </div>
  )
}

function ResearchPlanEditor({
  client,
  plan,
  data,
  saving,
  onSave,
  loadData,
  onOpenView,
}: {
  client: StudioClient
  plan: MarketingResearchPlan | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  loadData: () => Promise<void>
  onOpenView: (view: MarketingViewId) => void
}) {
  const [draft, setDraft] = useState<MarketingResearchPlan | null>(plan)
  const [selectedOpportunities, setSelectedOpportunities] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [converting, setConverting] = useState(false)
  const analyticsTakeaways = useMemo(() => buildAnalyticsInterpretations(data), [data])

  useEffect(() => {
    setDraft(plan)
    setSelectedOpportunities((plan?.contentOpportunities || []).map((opportunity) => opportunity._key || '').filter(Boolean))
    setMessage('')
    setError('')
  }, [plan])

  if (!draft) {
    return <EmptyPanel icon={SearchIcon} title="Select a research plan" description="Create or reopen a plan to turn research inputs into release timing." />
  }

  const updateDraft = <K extends keyof MarketingResearchPlan>(key: K, value: MarketingResearchPlan[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
    setMessage('')
    setError('')
  }

  const saveDraft = async () => {
    if (!draft._id) return
    await onSave(draft._id, buildResearchPlanSavePayload(draft))
    setMessage('Research plan saved.')
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const researchSuggestion = suggestion.researchPlan || {}
    setDraft((current) => (current ? mergeResearchPlanSuggestion(current, researchSuggestion) : current))
    setMessage('Suggested plan applied. Review the editable fields, then save.')
    setError('')
  }

  const generateLinkedRecords = async () => {
    if (!draft._id) return
    setConverting(true)
    setError('')
    setMessage('')
    try {
      const opportunityKeys = selectedOpportunities.length > 0 ? selectedOpportunities : (draft.contentOpportunities || []).map((item) => item._key || '').filter(Boolean)
      if (opportunityKeys.length === 0) throw new Error('Select or add at least one content opportunity first.')
      await onSave(draft._id, buildResearchPlanSavePayload(draft))
      const result = await createResearchPlanGeneratedRecords(client, data, draft, opportunityKeys)
      await loadData()
      setMessage(`Generated ${result.calendarItemIds.length} calendar item${result.calendarItemIds.length === 1 ? '' : 's'}, campaign, funnel, and Quick Link records.`)
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : 'Could not generate linked records.')
    } finally {
      setConverting(false)
    }
  }

  const addSeoTarget = () => updateDraft('seoTargets', [...(draft.seoTargets || []), createResearchSeoTarget(draft)])
  const addResearchQuestion = () => updateDraft('researchQuestions', [...(draft.researchQuestions || []), createResearchQuestion(draft)])
  const addEvidenceNote = () => updateDraft('evidenceNotes', [...(draft.evidenceNotes || []), createResearchEvidenceNote(draft)])
  const addAssumption = () => updateDraft('assumptions', [...(draft.assumptions || []), createResearchAssumption(draft)])
  const addCollaboration = () => updateDraft('collaborations', [...(draft.collaborations || []), createResearchCollaboration()])
  const addWindow = () => updateDraft('releaseWindows', [...(draft.releaseWindows || []), createResearchReleaseWindow(draft)])
  const addOpportunity = () => {
    const opportunity = createResearchContentOpportunity(draft, data)
    updateDraft('contentOpportunities', [...(draft.contentOpportunities || []), opportunity])
    setSelectedOpportunities((current) => [...current, opportunity._key || ''].filter(Boolean))
  }
  const addAdjustment = () => updateDraft('strategyAdjustments', [...(draft.strategyAdjustments || []), createResearchStrategyAdjustment()])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={styles.kicker}>Adaptive research</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{draft.title || 'Untitled research plan'}</h2>
            <p style={{ ...styles.muted, margin: '5px 0 0', lineHeight: 1.55 }}>
              Gather only the strategy inputs that affect release timing: audience, SEO, collaborators, source material, and what designers can make next.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['complete', 'archived'].includes(draft.status || '') && (
              <button type="button" style={styles.button} onClick={() => updateDraft('status', 'active')}>
                Reopen
              </button>
            )}
            <button type="button" style={styles.button} onClick={() => void saveDraft()} disabled={saving}>
              {saving ? 'Saving...' : 'Save plan'}
            </button>
            <button type="button" style={styles.primaryButton} onClick={() => void generateLinkedRecords()} disabled={converting}>
              {converting ? 'Generating...' : 'Generate linked records'}
            </button>
          </div>
        </div>

        <MarketingAiAssistPanel
          kind="researchPlan"
          draft={draft as unknown as Record<string, unknown>}
          analyticsTakeaways={analyticsTakeaways}
          onApply={applyAiSuggestion}
        />

        {message && <div style={{ ...styles.small, color: '#007385', fontWeight: 800, marginTop: 12 }}>{message}</div>}
        {error && <div style={{ ...styles.small, color: '#E36216', fontWeight: 800, marginTop: 12 }}>{error}</div>}
      </section>

      <section style={styles.panel}>
        <PanelHeading title="Strategy brief" description="The smallest useful strategy frame before content gets made." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <InputField label="Plan title">
            <input style={styles.input} value={draft.title || ''} onChange={(event) => updateDraft('title', event.currentTarget.value)} />
          </InputField>
          <InputField label="Status">
            <Select value={draft.status || 'draft'} options={researchPlanStatusOptions} onChange={(value) => updateDraft('status', value)} />
          </InputField>
          <InputField label="Release cadence">
            <Select value={draft.releaseCadence || 'weekly'} options={researchPlanCadenceOptions} onChange={(value) => updateDraft('releaseCadence', value)} />
          </InputField>
          <InputField label="Primary objective">
            <Select value={draft.campaignObjective || 'awareness'} options={campaignObjectiveOptions} onChange={(value) => updateDraft('campaignObjective', value)} />
          </InputField>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <InputField label="Research summary">
            <textarea rows={4} style={styles.input} value={draft.summary || ''} onChange={(event) => updateDraft('summary', event.currentTarget.value)} />
          </InputField>
          <InputField label="Audience">
            <textarea rows={3} style={styles.input} value={draft.audience || ''} onChange={(event) => updateDraft('audience', event.currentTarget.value)} />
          </InputField>
          <InputField label="Positioning">
            <textarea rows={3} style={styles.input} value={draft.positioning || ''} onChange={(event) => updateDraft('positioning', event.currentTarget.value)} />
          </InputField>
          <InputField label="Canonical destination URL">
            <input style={styles.input} value={draft.canonicalUrl || ''} onChange={(event) => updateDraft('canonicalUrl', event.currentTarget.value)} />
          </InputField>
        </div>
      </section>

      <ResearchArrayModule
        title="Research questions"
        description="Frame the decisions the plan needs to answer before content production starts."
        actionLabel="Add question"
        onAdd={addResearchQuestion}
      >
        {(draft.researchQuestions || []).length === 0 ? (
          <EmptyInline title="No research questions yet. Add the question that would change what designers make." />
        ) : (
          (draft.researchQuestions || []).map((question, index) => (
            <div key={question._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(2, minmax(140px, 0.8fr)) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Question">
                  <input
                    style={styles.input}
                    value={question.question || ''}
                    onChange={(event) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { question: event.currentTarget.value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <InputField label="Method">
                  <Select
                    value={question.method || 'deskResearch'}
                    options={researchMethodOptions}
                    onChange={(value) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { method: value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <InputField label="Status">
                  <Select
                    value={question.status || 'idea'}
                    options={opportunityReadinessOptions}
                    onChange={(value) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { status: value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('researchQuestions', removeResearchArrayItem(draft.researchQuestions, index))}>
                  Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
                <InputField label="Why it matters">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={question.whyItMatters || ''}
                    onChange={(event) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { whyItMatters: event.currentTarget.value, _type: 'researchQuestion' }))}
                  />
                </InputField>
                <InputField label="Decision it supports">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={question.decisionNeeded || ''}
                    onChange={(event) => updateDraft('researchQuestions', updateResearchArrayItem(draft.researchQuestions, index, { decisionNeeded: event.currentTarget.value, _type: 'researchQuestion' }))}
                  />
                </InputField>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Evidence log"
        description="Track claims, sources, confidence, and implications so AI output stays reviewable."
        actionLabel="Add evidence"
        onAdd={addEvidenceNote}
      >
        {(draft.evidenceNotes || []).length === 0 ? (
          <EmptyInline title="No evidence yet. Add the source, signal, or observation the plan relies on." />
        ) : (
          (draft.evidenceNotes || []).map((note, index) => (
            <div key={note._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) repeat(2, minmax(140px, 0.75fr)) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Claim / finding">
                  <input
                    style={styles.input}
                    value={note.claim || ''}
                    onChange={(event) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { claim: event.currentTarget.value, _type: 'evidenceNote' }))}
                  />
                </InputField>
                <InputField label="Evidence type">
                  <Select
                    value={note.evidenceType || 'siteContent'}
                    options={researchEvidenceTypeOptions}
                    onChange={(value) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { evidenceType: value, _type: 'evidenceNote' }))}
                  />
                </InputField>
                <InputField label="Confidence">
                  <Select
                    value={note.confidence || 'early'}
                    options={researchConfidenceOptions}
                    onChange={(value) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { confidence: value, _type: 'evidenceNote' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('evidenceNotes', removeResearchArrayItem(draft.evidenceNotes, index))}>
                  Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
                <InputField label="Source title">
                  <input
                    style={styles.input}
                    value={note.sourceTitle || ''}
                    onChange={(event) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { sourceTitle: event.currentTarget.value, _type: 'evidenceNote' }))}
                  />
                </InputField>
                <InputField label="Source URL">
                  <input
                    style={styles.input}
                    value={note.sourceUrl || ''}
                    onChange={(event) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { sourceUrl: event.currentTarget.value, _type: 'evidenceNote' }))}
                  />
                </InputField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
                <InputField label="Implication for content">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={note.implication || ''}
                    onChange={(event) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { implication: event.currentTarget.value, _type: 'evidenceNote' }))}
                  />
                </InputField>
                <InputField label="Still unknown">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={note.gap || ''}
                    onChange={(event) => updateDraft('evidenceNotes', updateResearchArrayItem(draft.evidenceNotes, index, { gap: event.currentTarget.value, _type: 'evidenceNote' }))}
                  />
                </InputField>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Assumptions to validate"
        description="Name the parts of the plan that might be wrong before they become expensive production work."
        actionLabel="Add assumption"
        onAdd={addAssumption}
      >
        {(draft.assumptions || []).length === 0 ? (
          <EmptyInline title="No assumptions yet. Add what needs to be true for this plan to work." />
        ) : (
          (draft.assumptions || []).map((assumption, index) => (
            <div key={assumption._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(140px, 0.35fr) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Assumption">
                  <input
                    style={styles.input}
                    value={assumption.assumption || ''}
                    onChange={(event) => updateDraft('assumptions', updateResearchArrayItem(draft.assumptions, index, { assumption: event.currentTarget.value, _type: 'researchAssumption' }))}
                  />
                </InputField>
                <InputField label="Confidence">
                  <Select
                    value={assumption.confidence || 'needsValidation'}
                    options={researchConfidenceOptions}
                    onChange={(value) => updateDraft('assumptions', updateResearchArrayItem(draft.assumptions, index, { confidence: value, _type: 'researchAssumption' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('assumptions', removeResearchArrayItem(draft.assumptions, index))}>
                  Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
                <InputField label="Risk if wrong">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={assumption.risk || ''}
                    onChange={(event) => updateDraft('assumptions', updateResearchArrayItem(draft.assumptions, index, { risk: event.currentTarget.value, _type: 'researchAssumption' }))}
                  />
                </InputField>
                <InputField label="Validation signal">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={assumption.validationSignal || ''}
                    onChange={(event) => updateDraft('assumptions', updateResearchArrayItem(draft.assumptions, index, { validationSignal: event.currentTarget.value, _type: 'researchAssumption' }))}
                  />
                </InputField>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="SEO targeting"
        description="Target queries, intent, canonical destinations, gaps, and priority."
        actionLabel="Add SEO target"
        onAdd={addSeoTarget}
      >
        {(draft.seoTargets || []).length === 0 ? (
          <EmptyInline title="No SEO targets yet. Add queries people might search or ask." />
        ) : (
          (draft.seoTargets || []).map((target, index) => (
            <div key={target._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.4fr) repeat(2, minmax(140px, 0.8fr)) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Keyword / query">
                  <input
                    style={styles.input}
                    value={target.query || ''}
                    onChange={(event) => updateDraft('seoTargets', updateResearchArrayItem(draft.seoTargets, index, { query: event.currentTarget.value, _type: 'seoTarget' }))}
                  />
                </InputField>
                <InputField label="Intent">
                  <Select
                    value={target.intent || 'learn'}
                    options={searchIntentOptions}
                    onChange={(value) => updateDraft('seoTargets', updateResearchArrayItem(draft.seoTargets, index, { intent: value, _type: 'seoTarget' }))}
                  />
                </InputField>
                <InputField label="Priority">
                  <Select
                    value={target.priority || 'medium'}
                    options={researchPriorityOptions}
                    onChange={(value) => updateDraft('seoTargets', updateResearchArrayItem(draft.seoTargets, index, { priority: value, _type: 'seoTarget' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('seoTargets', removeResearchArrayItem(draft.seoTargets, index))}>
                  Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginTop: 10 }}>
                <InputField label="Canonical destination">
                  <input
                    style={styles.input}
                    value={target.canonicalUrl || ''}
                    onChange={(event) => updateDraft('seoTargets', updateResearchArrayItem(draft.seoTargets, index, { canonicalUrl: event.currentTarget.value, _type: 'seoTarget' }))}
                  />
                </InputField>
                <InputField label="Content gap">
                  <input
                    style={styles.input}
                    value={target.contentGap || ''}
                    onChange={(event) => updateDraft('seoTargets', updateResearchArrayItem(draft.seoTargets, index, { contentGap: event.currentTarget.value, _type: 'seoTarget' }))}
                  />
                </InputField>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Collaborations"
        description="University interns, advisors, partner orgs, guests, and communities that can change the release plan."
        actionLabel="Add collaboration"
        onAdd={addCollaboration}
      >
        {(draft.collaborations || []).length === 0 ? (
          <EmptyInline title="No collaborators yet. Add interns, universities, advisors, or partners when they change capacity or topics." />
        ) : (
          (draft.collaborations || []).map((collaboration, index) => (
            <div key={collaboration._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <InputField label="Name">
                  <input
                    style={styles.input}
                    value={collaboration.name || ''}
                    onChange={(event) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { name: event.currentTarget.value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
                <InputField label="Organization">
                  <input
                    style={styles.input}
                    value={collaboration.organization || ''}
                    onChange={(event) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { organization: event.currentTarget.value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
                <InputField label="Relationship">
                  <Select
                    value={collaboration.relationshipType || 'universityIntern'}
                    options={collaborationRelationshipOptions}
                    onChange={(value) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { relationshipType: value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
                <InputField label="Contribution">
                  <Select
                    value={collaboration.contributionType || 'research'}
                    options={contributionTypeOptions}
                    onChange={(value) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { contributionType: value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
                <InputField label="Status">
                  <Select
                    value={collaboration.status || 'idea'}
                    options={collaborationStatusOptions}
                    onChange={(value) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { status: value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 10 }}>
                <InputField label="Topic area">
                  <input
                    style={styles.input}
                    value={collaboration.topicArea || ''}
                    onChange={(event) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { topicArea: event.currentTarget.value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
                <InputField label="Available starting">
                  <input
                    type="date"
                    style={styles.input}
                    value={collaboration.availabilityStart || ''}
                    onChange={(event) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { availabilityStart: event.currentTarget.value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
                <InputField label="Available until">
                  <input
                    type="date"
                    style={styles.input}
                    value={collaboration.availabilityEnd || ''}
                    onChange={(event) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { availabilityEnd: event.currentTarget.value, _type: 'collaborationOpportunity' }))}
                  />
                </InputField>
              </div>
              <InputField label="Expected contribution">
                <textarea
                  rows={2}
                  style={styles.input}
                  value={collaboration.expectedContribution || ''}
                  onChange={(event) => updateDraft('collaborations', updateResearchArrayItem(draft.collaborations, index, { expectedContribution: event.currentTarget.value, _type: 'collaborationOpportunity' }))}
                />
              </InputField>
              <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => updateDraft('collaborations', removeResearchArrayItem(draft.collaborations, index))}>
                Remove collaboration
              </button>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Release windows"
        description="Flexible date ranges centered on when content should go live, not fixed research phases."
        actionLabel="Add release window"
        onAdd={addWindow}
      >
        {(draft.releaseWindows || []).length === 0 ? (
          <EmptyInline title="No release windows yet. Add the next useful publishing windows." />
        ) : (
          (draft.releaseWindows || []).map((window, index) => (
            <div key={window._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) repeat(3, minmax(130px, 0.7fr)) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Label">
                  <input
                    style={styles.input}
                    value={window.label || ''}
                    onChange={(event) => updateDraft('releaseWindows', updateResearchArrayItem(draft.releaseWindows, index, { label: event.currentTarget.value, _type: 'releaseWindow' }))}
                  />
                </InputField>
                <InputField label="Start">
                  <input
                    type="date"
                    style={styles.input}
                    value={window.startDate || ''}
                    onChange={(event) => updateDraft('releaseWindows', updateResearchArrayItem(draft.releaseWindows, index, { startDate: event.currentTarget.value, _type: 'releaseWindow' }))}
                  />
                </InputField>
                <InputField label="End">
                  <input
                    type="date"
                    style={styles.input}
                    value={window.endDate || ''}
                    onChange={(event) => updateDraft('releaseWindows', updateResearchArrayItem(draft.releaseWindows, index, { endDate: event.currentTarget.value, _type: 'releaseWindow' }))}
                  />
                </InputField>
                <InputField label="Priority">
                  <Select
                    value={window.priority || 'medium'}
                    options={researchPriorityOptions}
                    onChange={(value) => updateDraft('releaseWindows', updateResearchArrayItem(draft.releaseWindows, index, { priority: value, _type: 'releaseWindow' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('releaseWindows', removeResearchArrayItem(draft.releaseWindows, index))}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Content opportunities"
        description="The editable backlog designers can convert into campaigns, funnels, calendar items, and Quick Links."
        actionLabel="Add opportunity"
        onAdd={addOpportunity}
      >
        {(draft.contentOpportunities || []).length === 0 ? (
          <EmptyInline title="No content opportunities yet. Use AI setup or add one manually." />
        ) : (
          (draft.contentOpportunities || []).map((opportunity, index) => {
            const key = opportunity._key || `${index}`
            const checked = selectedOpportunities.includes(key)
            return (
              <div key={key} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      setSelectedOpportunities((current) =>
                        event.currentTarget.checked ? Array.from(new Set([...current, key])) : current.filter((item) => item !== key),
                      )
                    }}
                  />
                  <strong>Generate from this opportunity</strong>
                  {getRecordId(opportunity.generatedCalendarItem) && <StatusPill status="scheduled" options={[{ title: 'Generated', value: 'scheduled' }]} />}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) repeat(3, minmax(140px, 0.8fr))', gap: 10 }}>
                  <InputField label="Proposed item">
                    <input
                      style={styles.input}
                      value={opportunity.title || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { title: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="Channel">
                    <Select
                      value={opportunity.channel || 'instagram'}
                      options={getResearchChannelOptions(data)}
                      onChange={(value) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { channel: value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="Format">
                    <Select
                      value={opportunity.format || 'carousel'}
                      options={contentFormatOptions}
                      onChange={(value) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { format: value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="Readiness">
                    <Select
                      value={opportunity.readiness || 'idea'}
                      options={opportunityReadinessOptions}
                      onChange={(value) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { readiness: value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
                  <InputField label="Owner / contributor">
                    <input
                      style={styles.input}
                      value={opportunity.owner || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { owner: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="Release window">
                    <input
                      style={styles.input}
                      value={opportunity.releaseWindow || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { releaseWindow: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="CTA">
                    <input
                      style={styles.input}
                      value={opportunity.callToAction || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { callToAction: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="SEO query">
                    <input
                      style={styles.input}
                      value={opportunity.seoQuery || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { seoQuery: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginTop: 10 }}>
                  <InputField label="Destination URL">
                    <input
                      style={styles.input}
                      value={opportunity.destinationUrl || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { destinationUrl: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                  <InputField label="Source material">
                    <input
                      style={styles.input}
                      value={opportunity.sourceMaterial || ''}
                      onChange={(event) => updateDraft('contentOpportunities', updateResearchArrayItem(draft.contentOpportunities, index, { sourceMaterial: event.currentTarget.value, _type: 'contentOpportunity' }))}
                    />
                  </InputField>
                </div>
                <button type="button" style={{ ...styles.button, marginTop: 10 }} onClick={() => updateDraft('contentOpportunities', removeResearchArrayItem(draft.contentOpportunities, index))}>
                  Remove opportunity
                </button>
              </div>
            )
          })
        )}
      </ResearchArrayModule>

      <ResearchArrayModule
        title="Strategy adjustments"
        description="When new collaborators, SEO opportunities, or analytics takeaways change the plan, document the why and the decision."
        actionLabel="Add adjustment"
        onAdd={addAdjustment}
      >
        {(draft.strategyAdjustments || []).length === 0 ? (
          <EmptyInline title="No plan changes recorded yet." />
        ) : (
          (draft.strategyAdjustments || []).map((adjustment, index) => (
            <div key={adjustment._key || index} style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) auto', gap: 10, alignItems: 'end' }}>
                <InputField label="Decision date">
                  <input
                    type="date"
                    style={styles.input}
                    value={adjustment.decisionDate || ''}
                    onChange={(event) => updateDraft('strategyAdjustments', updateResearchArrayItem(draft.strategyAdjustments, index, { decisionDate: event.currentTarget.value, _type: 'strategyAdjustment' }))}
                  />
                </InputField>
                <InputField label="Trigger">
                  <input
                    style={styles.input}
                    value={adjustment.trigger || ''}
                    onChange={(event) => updateDraft('strategyAdjustments', updateResearchArrayItem(draft.strategyAdjustments, index, { trigger: event.currentTarget.value, _type: 'strategyAdjustment' }))}
                  />
                </InputField>
                <button type="button" style={styles.button} onClick={() => updateDraft('strategyAdjustments', removeResearchArrayItem(draft.strategyAdjustments, index))}>
                  Remove
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10, marginTop: 10 }}>
                <InputField label="Why it changed">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={adjustment.reason || ''}
                    onChange={(event) => updateDraft('strategyAdjustments', updateResearchArrayItem(draft.strategyAdjustments, index, { reason: event.currentTarget.value, _type: 'strategyAdjustment' }))}
                  />
                </InputField>
                <InputField label="Recommendation">
                  <textarea
                    rows={2}
                    style={styles.input}
                    value={adjustment.recommendation || ''}
                    onChange={(event) => updateDraft('strategyAdjustments', updateResearchArrayItem(draft.strategyAdjustments, index, { recommendation: event.currentTarget.value, _type: 'strategyAdjustment' }))}
                  />
                </InputField>
              </div>
            </div>
          ))
        )}
      </ResearchArrayModule>

      <section style={styles.panel}>
        <PanelHeading title="Generated records" description="Objects created from this research plan stay linked back here for reopening and iteration." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <GeneratedRecordCard label="Campaigns" records={draft.generatedCampaigns || []} onOpen={() => onOpenView('campaigns')} />
          <GeneratedRecordCard label="Funnels" records={draft.generatedFunnels || []} onOpen={() => onOpenView('funnels')} />
          <GeneratedRecordCard label="Calendar items" records={draft.generatedCalendarItems || []} onOpen={() => onOpenView('calendar')} />
          <GeneratedRecordCard label="Quick Links" records={draft.generatedLinkItems || []} onOpen={() => onOpenView('linkTree')} />
        </div>
      </section>
    </div>
  )
}

function ResearchArrayModule({
  title,
  description,
  actionLabel,
  onAdd,
  children,
}: {
  title: string
  description: string
  actionLabel: string
  onAdd: () => void
  children: React.ReactNode
}) {
  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <PanelHeading title={title} description={description} />
        <button type="button" style={{ ...styles.button, whiteSpace: 'nowrap' }} onClick={onAdd}>
          {actionLabel}
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </section>
  )
}

function GeneratedRecordCard({
  label,
  records,
  onOpen,
}: {
  label: string
  records: Array<{ _id?: string; title?: string; status?: string }>
  onOpen: () => void
}) {
  return (
    <button type="button" style={{ ...styles.templateButton, minHeight: 108 }} onClick={onOpen}>
      <strong>{label}</strong>
      <span style={{ fontSize: 28, lineHeight: 1, fontWeight: 900 }}>{records.length}</span>
      <span style={{ ...styles.small, ...styles.muted }}>
        {records.length > 0 ? records.slice(0, 2).map((record) => record.title || 'Untitled').join(', ') : 'None generated yet'}
      </span>
    </button>
  )
}

function DesignerSetupPath({
  steps,
  onOpenView,
}: {
  steps: WorkflowSetupStep[]
  onOpenView: (view: MarketingViewId) => void
}) {
  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16 }}>No-marketing setup path</h3>
          <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.5 }}>
            Complete these in order before making the artifact.
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            border: '1px solid rgba(0, 115, 133, 0.24)',
            borderRadius: 999,
            background: 'rgba(0, 115, 133, 0.12)',
            color: '#007385',
            padding: '3px 8px',
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          5 steps
        </span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {steps.map((step) => {
          const viewTitle = MARKETING_TOOL_VIEWS.find((view) => view.id === step.view)?.title || 'Section'

          return (
            <div
              key={step.label}
              style={{
                border: '1px solid var(--card-border-color)',
                borderRadius: 6,
                background: 'var(--card-bg-color)',
                padding: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    width: 24,
                    height: 24,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                    borderRadius: 999,
                    background: '#007385',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {step.label}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{step.title}</strong>
                  <div style={{ ...styles.small, ...styles.muted, marginTop: 4, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--card-fg-color)' }}>Creates: </strong>
                    {step.outcome}
                  </div>
                  <div style={{ ...styles.small, ...styles.muted, marginTop: 3, lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--card-fg-color)' }}>Designer does: </strong>
                    {step.designerAction}
                  </div>
                  {step.terms && step.terms.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                      {step.terms.map((term) => (
                        <MarketingTerm key={`${step.label}-${term.label}`} term={term} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                style={{ ...styles.button, marginTop: 9, padding: '6px 9px', fontSize: 12 }}
                onClick={() => onOpenView(step.view)}
              >
                Open {viewTitle}
              </button>
            </div>
          )
        })}
      </div>
      <div
        style={{
          marginTop: 10,
          borderTop: '1px solid var(--card-border-color)',
          paddingTop: 10,
          ...styles.small,
          ...styles.muted,
          lineHeight: 1.5,
        }}
      >
        Done means the framework is connected. The designer's remaining work is the thing people will actually see.
      </div>
    </div>
  )
}

function WorkflowHelpSection({
  items,
  onOpenView,
}: {
  items: WorkflowHelpItem[]
  onOpenView: (view: MarketingViewId) => void
}) {
  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12, marginBottom: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Marketing questions</h3>
      <div style={{ display: 'grid', gap: 7 }}>
        {items.map((item, index) => (
          <details
            key={item.question}
            open={index === 0}
            style={{
              border: '1px solid var(--card-border-color)',
              borderRadius: 6,
              background: 'var(--card-bg-color)',
              padding: 0,
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                padding: '9px 10px',
                fontSize: 13,
                fontWeight: 800,
                listStylePosition: 'inside',
              }}
            >
              {item.question}
            </summary>
            <div style={{ padding: '0 10px 10px', display: 'grid', gap: 9 }}>
              <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.55 }}>
                <WorkflowAnswer parts={item.answer} />
              </div>
              {item.action && (
                <button
                  type="button"
                  style={{ ...styles.button, justifySelf: 'start', padding: '6px 9px', fontSize: 12 }}
                  onClick={() => onOpenView(item.action!.view)}
                >
                  {item.action.label}
                </button>
              )}
            </div>
          </details>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ ...styles.label, marginBottom: 6 }}>Hover glossary</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {workflowTerms.map((term) => (
            <MarketingTerm key={term.label} term={term} />
          ))}
        </div>
      </div>
    </div>
  )
}

function WorkflowAnswer({ parts }: { parts: Array<string | WorkflowTerm> }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? part : <MarketingTerm key={`${part.label}-${index}`} term={part} inline />,
      )}
    </>
  )
}

function MarketingTerm({ term, inline = false }: { term: WorkflowTerm; inline?: boolean }) {
  return (
    <span
      tabIndex={0}
      title={term.definition}
      aria-label={`${term.label}: ${term.definition}`}
      style={{
        display: inline ? 'inline' : 'inline-flex',
        alignItems: 'center',
        border: inline ? 'none' : '1px solid rgba(0, 115, 133, 0.24)',
        borderRadius: inline ? 0 : 999,
        background: inline ? 'transparent' : 'rgba(0, 115, 133, 0.08)',
        color: '#007385',
        padding: inline ? 0 : '3px 8px',
        fontSize: inline ? 'inherit' : 12,
        fontWeight: 800,
        cursor: 'help',
        textDecoration: inline ? 'underline dotted' : 'none',
        textUnderlineOffset: 3,
      }}
    >
      {term.label}
    </span>
  )
}

function CalendarWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
  onOpenChannels,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenChannels: () => void
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedId, setSelectedId] = useState<string | null>(data.calendarItems[0]?._id || null)

  useEffect(() => {
    if (!selectedId && data.calendarItems.length > 0) setSelectedId(data.calendarItems[0]._id)
  }, [data.calendarItems, selectedId])

  const channels = data.channels
  const selectedItem = data.calendarItems.find((item) => item._id === selectedId) || null
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth])
  const itemsByDay = useMemo(() => groupCalendarItemsByDay(data.calendarItems), [data.calendarItems])
  const unscheduled = data.calendarItems.filter((item) => !item.publishAt)
  const savedCalendarGroups = useMemo(() => getSavedCalendarGroups(data.calendarItems), [data.calendarItems])

  const createCalendarItem = async (publishDate?: Date) => {
    const createdId = await createDocument({
      _type: 'marketingCalendarItem',
      title: '',
      status: 'idea',
      ...(publishDate ? { publishAt: dateInputToIso(toDateInputValue(publishDate)) } : {}),
    })
    setSelectedId(createdId)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Content Calendar</h2>
            <p style={{ ...styles.muted, margin: '4px 0 0' }}>A month-by-month planning surface for upcoming work.</p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0 12px',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18 }}>{monthLabel(visibleMonth)}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={styles.button} onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}>
              Back
            </button>
            <button type="button" style={styles.button} onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
              Today
            </button>
            <button type="button" style={styles.button} onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}>
              Next
            </button>
            <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createCalendarItem()}>
              Add
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} style={{ ...styles.small, ...styles.muted, padding: '0 8px 8px', fontWeight: 800 }}>
              {day}
            </div>
          ))}
          {calendarCells.map((cell) => {
            const key = toDateInputValue(cell.date)
            const dayItems = itemsByDay.get(key) || []
            return (
              <button
                key={key}
                type="button"
                style={{
                  display: 'block',
                  width: '100%',
                  minHeight: 132,
                  padding: 8,
                  textAlign: 'left',
                  verticalAlign: 'top',
                  border: '1px solid var(--card-border-color)',
                  borderRadius: 0,
                  background: cell.inMonth ? 'var(--card-bg-color)' : 'rgba(128, 128, 128, 0.05)',
                  color: 'var(--card-fg-color)',
                  cursor: 'pointer',
                }}
                title={dayItems[0] ? 'Open first item on this day' : 'Add calendar item on this day'}
                onClick={() => {
                  if (dayItems[0]) {
                    setSelectedId(dayItems[0]._id)
                    return
                  }
                  void createCalendarItem(cell.date)
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    color: cell.inMonth ? 'var(--card-fg-color)' : 'var(--card-muted-fg-color)',
                    fontWeight: cell.isToday ? 800 : 700,
                    marginBottom: 6,
                  }}
                >
                  <span>{cell.date.getDate()}</span>
                  {cell.isToday && <span style={{ color: '#007385' }}>Today</span>}
                </div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {renderCalendarDayItems(dayItems, channels, selectedId)}
                  {dayItems.length > 4 && (
                    <div style={{ ...styles.small, ...styles.muted }}>+{dayItems.length - 4} more</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 16 }}>
          <CalendarGroupSummary
            group="draft"
            count={savedCalendarGroups.draft.length}
            description="Saved calendar items that still need content or review."
          />
          <CalendarGroupSummary
            group="final"
            count={savedCalendarGroups.final.length}
            description="Scheduled or published items with real release timing."
          />
        </div>

        {unscheduled.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Unscheduled</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {unscheduled.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => setSelectedId(item._id)}
                  style={{
                    ...styles.button,
                    borderColor: item._id === selectedId ? '#007385' : 'var(--card-border-color)',
                  }}
                >
                  {item.title || 'Untitled item'}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <CalendarItemEditor
        item={selectedItem}
        channels={channels}
        campaigns={data.campaigns}
        funnels={data.funnels}
        analyticsSources={data.analyticsSources}
        linkItems={data.linkItems}
        analyticsTakeaways={buildAnalyticsInterpretations(data)}
        saving={savingId === selectedItem?._id}
        createDocument={createDocument}
        onSave={commitPatch}
        onOpenChannels={onOpenChannels}
      />
    </div>
  )
}

function CalendarChip({
  item,
  channels,
  active,
  group = getCalendarItemDisplayGroup(item),
}: {
  item: MarketingCalendarItem
  channels: MarketingChannel[]
  active: boolean
  group?: CalendarDisplayGroup
}) {
  const colors = getStatusColor(group === 'preview' ? 'preview' : item.status)
  const channel = getChannelByKey(channels, item.channel) || item.channelRef
  const contentTypeOptionsForChannel = getContentTypeOptionsForChannel(item.channel, channels)

  return (
    <div
      style={{
        padding: '6px 7px',
        border: `1px solid ${active ? '#007385' : colors.border}`,
        borderStyle: group === 'preview' ? 'dotted' : 'solid',
        borderRadius: 6,
        background: colors.bg,
        color: colors.fg,
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.title || 'Untitled item'}
      </div>
      <div style={{ fontSize: 11, opacity: 0.82 }}>
        {[channel?.title || item.channel, labelFor(contentTypeOptionsForChannel, item.contentType), item.campaign?.title]
          .filter(Boolean)
          .join(' / ')}
      </div>
      <div style={{ fontSize: 10, opacity: 0.78, fontWeight: 800, marginTop: 3 }}>
        {getCalendarGroupLabel(group)}
      </div>
    </div>
  )
}

function renderCalendarDayItems(
  dayItems: MarketingCalendarItem[],
  channels: MarketingChannel[],
  selectedId: string | null,
) {
  return getCalendarItemsByDisplayGroup(dayItems)
    .slice(0, 4)
    .map(({ item, group }) => (
      <CalendarChip key={item._id} item={item} channels={channels} active={item._id === selectedId} group={group} />
    ))
}

function ResearchOpportunityPreviewList({ opportunities }: { opportunities: ResearchContentOpportunity[] }) {
  const previewOpportunities = opportunities.filter((opportunity) => opportunity.title).slice(0, 4)
  if (previewOpportunities.length === 0) return null

  const colors = getStatusColor('preview')

  return (
    <div style={{ borderTop: '1px solid var(--card-border-color)', marginTop: 12, paddingTop: 12 }}>
      <div style={{ ...styles.small, color: '#007385', fontWeight: 900, marginBottom: 8 }}>
        Research preview
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {previewOpportunities.map((opportunity, index) => (
          <div
            key={opportunity._key || `${opportunity.title}-${index}`}
            style={{
              border: `1px dotted ${colors.border}`,
              borderRadius: 6,
              background: colors.bg,
              color: colors.fg,
              padding: '8px 9px',
            }}
          >
            <strong style={{ display: 'block', fontSize: 13, lineHeight: 1.35 }}>
              {opportunity.title}
            </strong>
            <div style={{ fontSize: 11, opacity: 0.82, marginTop: 4 }}>
              {[opportunity.channel, opportunity.format, opportunity.releaseWindow].filter(Boolean).join(' / ')}
            </div>
            <div style={{ fontSize: 10, opacity: 0.78, fontWeight: 800, marginTop: 3 }}>
              Preview
            </div>
          </div>
        ))}
      </div>
      {opportunities.length > previewOpportunities.length && (
        <div style={{ ...styles.small, ...styles.muted, marginTop: 6 }}>
          +{opportunities.length - previewOpportunities.length} more preview item{opportunities.length - previewOpportunities.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}

function CalendarGroupSummary({
  group,
  count,
  description,
}: {
  group: CalendarDisplayGroup
  count: number
  description: string
}) {
  const colors = getStatusColor(group)
  return (
    <div
      style={{
        border: `1px ${group === 'preview' ? 'dotted' : 'solid'} ${colors.border}`,
        borderRadius: 8,
        background: colors.bg,
        color: colors.fg,
        padding: 10,
        minHeight: 98,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <strong>{getCalendarGroupLabel(group)}</strong>
        <span style={{ fontSize: 22, fontWeight: 900 }}>{count}</span>
      </div>
      <div style={{ ...styles.small, color: 'inherit', opacity: 0.82, lineHeight: 1.45, marginTop: 6 }}>
        {description}
      </div>
    </div>
  )
}

function CalendarItemEditor({
  item,
  channels,
  campaigns,
  funnels,
  analyticsSources,
  linkItems,
  analyticsTakeaways,
  saving,
  createDocument,
  onSave,
  onOpenChannels,
}: {
  item: MarketingCalendarItem | null
  channels: MarketingChannel[]
  campaigns: MarketingCampaign[]
  funnels: MarketingFunnel[]
  analyticsSources: MarketingAnalyticsSource[]
  linkItems: MarketingLinkItem[]
  analyticsTakeaways: AnalyticsInterpretation[]
  saving: boolean
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onOpenChannels: () => void
}) {
  const [draft, setDraft] = useState<MarketingCalendarItem | null>(item)
  const [campaignId, setCampaignId] = useState('')
  const [funnelId, setFunnelId] = useState('')
  const [analyticsSourceId, setAnalyticsSourceId] = useState('')
  const [linkedLinkIds, setLinkedLinkIds] = useState<string[]>([])
  const [linkToAddId, setLinkToAddId] = useState('')

  useEffect(() => {
    setDraft(item)
    setCampaignId(item?.campaign?._id || '')
    setFunnelId(item?.funnel?._id || '')
    setAnalyticsSourceId(item?.analyticsSource?._id || '')
    setLinkedLinkIds(item ? getPostLinkedLinks(item, linkItems).map((link) => link._id) : [])
    setLinkToAddId('')
  }, [item, linkItems])

  const channelKey = draft?.channel || draft?.channelRef?.key || ''
  const channelOptions = getChannelOptions(channels)
  const selectedChannel = getChannelByKey(channels, channelKey)
  const typeOptions = getContentTypeOptionsForChannel(channelKey, channels)
  const linkedLinks = linkedLinkIds
    .map((id) => linkItems.find((link) => link._id === id) || draft?.linkItems?.find((link) => link._id === id))
    .filter(Boolean) as MarketingLinkItem[]
  const availableLinks = linkItems.filter((link) => !linkedLinkIds.includes(link._id))
  const postUrl = draft?.publishedUrl || draft?.workingUrl || ''

  if (!draft || !item) {
    return (
      <EmptyPanel
        icon={CalendarIcon}
        title="Select a calendar item"
        description="Create or choose a content item to edit its plan."
      />
    )
  }

  const save = async () => {
    const unset: string[] = []
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled item',
      status: draft.status || 'idea',
      publishAt: draft.publishAt ? dateInputToIso(toDateInputValue(draft.publishAt)) : undefined,
      contentType: draft.contentType,
      channel: channelKey,
      brief: draft.brief,
      contentDraft: draft.contentDraft,
      draftFrames: normalizeDraftContentFrames(draft.draftFrames),
      draftAltText: draft.draftAltText,
      draftHashtags: draft.draftHashtags || [],
      contentProductionNotes: draft.contentProductionNotes,
      callToAction: draft.callToAction,
      workingUrl: draft.workingUrl,
      publishedUrl: draft.publishedUrl,
      utmCampaign: draft.utmCampaign,
      funnelStage: draft.funnelStage,
      topicCluster: draft.topicCluster,
      searchIntent: draft.searchIntent,
      targetQueries: draft.targetQueries || [],
    }

    if (linkedLinkIds.length > 0) {
      set.linkItems = refsFromIds(linkedLinkIds)
    } else {
      unset.push('linkItems')
    }

    if (campaignId) {
      set.campaign = { _type: 'reference', _ref: campaignId }
    } else {
      unset.push('campaign')
    }

    if (funnelId) {
      set.funnel = { _type: 'reference', _ref: funnelId }
    } else {
      unset.push('funnel')
    }

    if (analyticsSourceId) {
      set.analyticsSource = { _type: 'reference', _ref: analyticsSourceId }
    } else {
      unset.push('analyticsSource')
    }

    if (selectedChannel?._id && !selectedChannel._id.startsWith('default-')) {
      set.channelRef = { _type: 'reference', _ref: selectedChannel._id }
    } else {
      unset.push('channelRef')
    }

    Object.keys(set).forEach((key) => {
      if (set[key] === undefined || set[key] === '') {
        delete set[key]
        unset.push(key)
      }
    })

    await onSave(item._id, set, unset)
  }

  const applyTemplate = (template: CalendarItemTemplate) => {
    const channel = getChannelByKey(channels, template.channel)
    setDraft({
      ...draft,
      channel: channel?.key || draft.channel,
      channelRef: channel || draft.channelRef,
      contentType: template.contentType,
      funnelStage: template.funnelStage,
      brief: draft.brief || template.brief,
      callToAction: draft.callToAction || template.callToAction,
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const itemSuggestion = suggestion.calendarItem || {}
    const suggestedChannel = aiString(itemSuggestion.channel)
    const channel = getChannelByKey(channels, suggestedChannel)
    const typeOptionsForSuggestion = getContentTypeOptionsForChannel(channel?.key || suggestedChannel || channelKey, channels)
    const suggestedContentType = aiString(itemSuggestion.contentType)
    const validSuggestedContentType = suggestedContentType
      ? typeOptionsForSuggestion.some((option) => option.value === suggestedContentType)
      : false

    setDraft({
      ...draft,
      title: aiString(itemSuggestion.title) || draft.title,
      channel: channel?.key || suggestedChannel || draft.channel,
      channelRef: channel || draft.channelRef,
      contentType: validSuggestedContentType ? suggestedContentType : draft.contentType || typeOptionsForSuggestion[0]?.value,
      funnelStage: aiOption(itemSuggestion.funnelStage, funnelStageOptions) || draft.funnelStage,
      brief: aiString(itemSuggestion.brief) || draft.brief,
      callToAction: aiString(itemSuggestion.callToAction) || draft.callToAction,
      workingUrl: aiString(itemSuggestion.workingUrl) || draft.workingUrl,
      utmCampaign: aiString(itemSuggestion.utmCampaign) || draft.utmCampaign,
    })
  }

  const syncPostLinks = async (nextIds: string[]) => {
    const dedupedIds = Array.from(new Set(nextIds))
    setLinkedLinkIds(dedupedIds)
    await onSave(item._id, dedupedIds.length > 0 ? { linkItems: refsFromIds(dedupedIds) } : {}, dedupedIds.length > 0 ? [] : ['linkItems'])
  }

  const createLinkFromPost = async () => {
    if (!postUrl) return
    const linkIsPublishReady = isCalendarItemPublishReady(draft)
    const createdId = await createDocument({
      _type: 'marketingLinkItem',
      title: draft.title || 'Untitled post link',
      url: postUrl,
      description: trimDescription(draft.brief),
      type: calendarContentTypeToLinkType(draft.contentType),
      status: linkIsPublishReady ? 'active' : 'draft',
      publishAt: draft.publishAt ? dateInputToIso(toDateInputValue(draft.publishAt)) : undefined,
      sourceChannel: draft.channelRef?.key || draft.channel || 'instagram',
      order: nextLinkOrder(linkItems),
      calendarItem: { _type: 'reference', _ref: item._id },
      calendarItems: refsFromIds([item._id]),
      ...(campaignId ? { campaign: { _type: 'reference', _ref: campaignId } } : {}),
    })
    await syncPostLinks([...linkedLinkIds, createdId])
  }

  const addExistingLinkToPost = async () => {
    if (!linkToAddId) return
    const link = linkItems.find((candidate) => candidate._id === linkToAddId)
    const nextIds = Array.from(new Set([...linkedLinkIds, linkToAddId]))
    await syncPostLinks(nextIds)
    if (link) {
      const postIds = Array.from(new Set([...(link.calendarItems || []).map((post) => post._id), item._id]))
      const set: Record<string, unknown> = { calendarItems: refsFromIds(postIds) }
      if (!link.calendarItem?._id) set.calendarItem = { _type: 'reference', _ref: item._id }
      await onSave(link._id, set)
    }
    setLinkToAddId('')
  }

  const removeLinkFromPost = async (linkId: string) => {
    const link = linkItems.find((candidate) => candidate._id === linkId) || linkedLinks.find((candidate) => candidate._id === linkId)
    await syncPostLinks(linkedLinkIds.filter((id) => id !== linkId))
    if (!link) return

    const remainingPostIds = (link.calendarItems || []).map((post) => post._id).filter((id) => id !== item._id)
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    if (remainingPostIds.length > 0) {
      set.calendarItems = refsFromIds(remainingPostIds)
    } else {
      unset.push('calendarItems')
    }
    if (link.calendarItem?._id === item._id) unset.push('calendarItem')
    await onSave(link._id, set, unset)
  }

  return (
    <aside style={styles.panel}>
      <PanelTitle title="Calendar item" type="marketingCalendarItem" id={item._id} />
      <Stack gap={12}>
        <GuidanceChecklist
          title="Designer checklist"
          items={[
            { label: 'Date is set', done: !!draft.publishAt },
            { label: 'Channel and content type are chosen', done: !!channelKey && !!draft.contentType },
            { label: 'Brief has enough context to make the artifact', done: !!draft.brief?.trim() },
            { label: 'CTA says what the viewer should do next', done: !!draft.callToAction?.trim() },
            { label: 'Campaign or funnel connection is set', done: !!campaignId || !!funnelId },
            { label: 'Working URL points to the draft/design/source', done: !!draft.workingUrl?.trim() },
          ]}
        />
        <TemplateRail
          title="Content templates"
          description="Apply a prompt set, then replace the bracketed thinking with the actual artifact details."
          templates={CALENDAR_ITEM_TEMPLATES}
          onApply={applyTemplate}
        />
        <MarketingAiAssistPanel
          kind="calendarItem"
          draft={draft as unknown as Record<string, unknown>}
          analyticsTakeaways={analyticsTakeaways}
          onApply={applyAiSuggestion}
        />
        <InputField label="Title">
          <input
            style={styles.input}
            value={draft.title || ''}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
        </InputField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InputField label="Status">
            <Select
              value={draft.status || 'idea'}
              options={calendarStatusOptions}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </InputField>
          <InputField label="Publish date">
            <input
              type="date"
              style={styles.input}
              value={toDateInputValue(draft.publishAt)}
              onChange={(event) => setDraft({ ...draft, publishAt: event.currentTarget.value })}
            />
          </InputField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <InputField label="Channel">
            <Select
              value={channelKey}
              options={[
                { title: 'None', value: '' },
                ...channelOptions,
                { title: 'Add new channel...', value: ADD_CHANNEL_VALUE },
              ]}
              onChange={(channel) => {
                if (channel === ADD_CHANNEL_VALUE) {
                  onOpenChannels()
                  return
                }
                const nextTypes = getContentTypeOptionsForChannel(channel, channels)
                setDraft({
                  ...draft,
                  channel,
                  channelRef: getChannelByKey(channels, channel),
                  contentType: nextTypes[0]?.value || '',
                })
              }}
            />
          </InputField>
          <InputField label="Content type">
            <Select
              value={draft.contentType || ''}
              options={[{ title: 'None', value: '' }, ...typeOptions]}
              onChange={(contentType) => setDraft({ ...draft, contentType })}
            />
          </InputField>
        </div>
        <InputField label="Campaign">
          <Select
            value={campaignId}
            options={[{ title: 'No campaign', value: '' }, ...campaigns.map((campaign) => ({ title: campaign.title || 'Untitled campaign', value: campaign._id }))]}
            onChange={setCampaignId}
          />
        </InputField>
        <InputField label="Funnel">
          <Select
            value={funnelId}
            options={[{ title: 'No funnel', value: '' }, ...funnels.map((funnel) => ({ title: funnel.title || 'Untitled funnel', value: funnel._id }))]}
            onChange={setFunnelId}
          />
        </InputField>
        <InputField label="Funnel stage">
          <Select
            value={draft.funnelStage || ''}
            options={[{ title: 'None', value: '' }, ...funnelStageOptions]}
            onChange={(funnelStage) => setDraft({ ...draft, funnelStage })}
          />
        </InputField>
        <details style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>SEO and targeting</summary>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <InputField label="Topic / keyword cluster">
              <input
                style={styles.input}
                value={draft.topicCluster || ''}
                onChange={(event) => setDraft({ ...draft, topicCluster: event.currentTarget.value })}
              />
            </InputField>
            <InputField label="Search / visitor intent">
              <Select
                value={draft.searchIntent || ''}
                options={[{ title: 'None', value: '' }, ...searchIntentOptions]}
                onChange={(searchIntent) => setDraft({ ...draft, searchIntent })}
              />
            </InputField>
            <InputField label="Target queries / phrases">
              <textarea
                rows={3}
                style={styles.input}
                value={(draft.targetQueries || []).join('\n')}
                onChange={(event) => setDraft({ ...draft, targetQueries: stringListFromText(event.currentTarget.value) })}
                placeholder="One phrase per line"
              />
            </InputField>
          </div>
        </details>
        <InputField label="Analytics source">
          <Select
            value={analyticsSourceId}
            options={[
              { title: 'No analytics source', value: '' },
              ...analyticsSources.map((source) => ({
                title: source.title || 'Untitled analytics source',
                value: source._id,
              })),
            ]}
            onChange={setAnalyticsSourceId}
          />
        </InputField>
        <InputField label="Brief">
          <textarea
            rows={5}
            style={styles.input}
            value={draft.brief || ''}
            onChange={(event) => setDraft({ ...draft, brief: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Draft content / caption">
          <textarea
            rows={8}
            style={styles.input}
            value={draft.contentDraft || ''}
            onChange={(event) => setDraft({ ...draft, contentDraft: event.currentTarget.value })}
            placeholder="Write or generate the actual post, caption, newsletter section, or page copy here."
          />
        </InputField>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <label style={styles.label}>Draft frames / slides</label>
            <button
              type="button"
              style={styles.button}
              onClick={() =>
                setDraft({
                  ...draft,
                  draftFrames: [
                    ...(draft.draftFrames || []),
                    { _key: randomKey(), title: '', body: '', visualDirection: '', altText: '' },
                  ],
                })
              }
            >
              Add frame
            </button>
          </div>
          {(draft.draftFrames || []).length === 0 ? (
            <EmptyInline title="No frame copy yet." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {(draft.draftFrames || []).map((frame, index) => (
                <div key={frame._key || index} style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'center' }}>
                    <InputField label={`Frame ${index + 1} title`}>
                      <input
                        style={styles.input}
                        value={frame.title || ''}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                              itemIndex === index ? { ...item, title: event.currentTarget.value } : item,
                            ),
                          })
                        }
                      />
                    </InputField>
                    <button
                      type="button"
                      style={{ ...styles.button, width: 40, height: 40, padding: 0 }}
                      aria-label={`Remove frame ${index + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <InputField label="Body copy">
                    <textarea
                      rows={3}
                      style={styles.input}
                      value={frame.body || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, body: event.currentTarget.value } : item,
                          ),
                        })
                      }
                    />
                  </InputField>
                  <InputField label="Visual direction">
                    <textarea
                      rows={2}
                      style={styles.input}
                      value={frame.visualDirection || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, visualDirection: event.currentTarget.value } : item,
                          ),
                        })
                      }
                    />
                  </InputField>
                  <InputField label="Alt text">
                    <textarea
                      rows={2}
                      style={styles.input}
                      value={frame.altText || ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          draftFrames: (draft.draftFrames || []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, altText: event.currentTarget.value } : item,
                          ),
                        })
                      }
                    />
                  </InputField>
                </div>
              ))}
            </div>
          )}
        </div>
        <InputField label="Overall draft alt text">
          <textarea
            rows={3}
            style={styles.input}
            value={draft.draftAltText || ''}
            onChange={(event) => setDraft({ ...draft, draftAltText: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Draft hashtags / tags">
          <textarea
            rows={2}
            style={styles.input}
            value={(draft.draftHashtags || []).join('\n')}
            onChange={(event) => setDraft({ ...draft, draftHashtags: stringListFromText(event.currentTarget.value) })}
            placeholder="One tag per line"
          />
        </InputField>
        <InputField label="Content production notes">
          <textarea
            rows={4}
            style={styles.input}
            value={draft.contentProductionNotes || ''}
            onChange={(event) => setDraft({ ...draft, contentProductionNotes: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Call to action">
          <input
            style={styles.input}
            value={draft.callToAction || ''}
            onChange={(event) => setDraft({ ...draft, callToAction: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Working URL">
          <input
            style={styles.input}
            value={draft.workingUrl || ''}
            onChange={(event) => setDraft({ ...draft, workingUrl: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Published URL">
          <input
            style={styles.input}
            value={draft.publishedUrl || ''}
            onChange={(event) => setDraft({ ...draft, publishedUrl: event.currentTarget.value })}
          />
        </InputField>
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Quick Links</h3>
              <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
                Linked items appear on /links automatically when this post is published or its scheduled date arrives.
              </div>
            </div>
            <StatusPill status={isCalendarItemPublishReady(draft) ? 'active' : 'draft'} options={linkItemStatusOptions} />
          </div>
          {linkedLinks.length === 0 ? (
            <EmptyInline title="No links connected to this post yet." />
          ) : (
            <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
              {linkedLinks.map((link) => (
                <div
                  key={link._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 10,
                    alignItems: 'center',
                    border: '1px solid var(--card-border-color)',
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {link.title || 'Untitled link'}
                    </strong>
                    <div
                      style={{
                        ...styles.small,
                        color: '#007385',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 3,
                      }}
                    >
                      {link.url || 'No URL yet'}
                    </div>
                  </div>
                  <button type="button" style={styles.button} onClick={() => void removeLinkFromPost(link._id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, marginTop: 12 }}>
            <Select
              value={linkToAddId}
              options={[
                { title: availableLinks.length > 0 ? 'Choose existing link...' : 'No other links available', value: '' },
                ...availableLinks.map((link) => ({
                  title: link.title || link.url || 'Untitled link',
                  value: link._id,
                })),
              ]}
              onChange={setLinkToAddId}
            />
            <button type="button" style={styles.button} disabled={!linkToAddId} onClick={() => void addExistingLinkToPost()}>
              Add
            </button>
          </div>
          <button
            type="button"
            style={{ ...styles.primaryButton, width: '100%', marginTop: 8 }}
            disabled={!postUrl}
            onClick={() => void createLinkFromPost()}
          >
            Create link from this post
          </button>
          {!postUrl && (
            <div style={{ ...styles.small, ...styles.muted, marginTop: 8 }}>
              Add a Published URL or Working URL before creating a link from this post.
            </div>
          )}
        </div>
        <AdvancedFieldsDropdown type="marketingCalendarItem" id={item._id} />
        <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving...' : 'Save calendar item'}
        </button>
      </Stack>
    </aside>
  )
}

function CampaignWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
}: {
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.campaigns[0]?._id || null)
  const [openCampaignIds, setOpenCampaignIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('browser')
  const activeCampaign = activeTab === 'browser' ? null : data.campaigns.find((campaign) => campaign._id === activeTab) || null
  const campaignTemplates = useMemo(() => getCampaignTemplates(data), [data])

  useEffect(() => {
    if (!selectedId && data.campaigns.length > 0) setSelectedId(data.campaigns[0]._id)
  }, [data.campaigns, selectedId])

  useEffect(() => {
    setOpenCampaignIds((current) => current.filter((id) => data.campaigns.some((campaign) => campaign._id === id)))
    if (activeTab !== 'browser' && !data.campaigns.some((campaign) => campaign._id === activeTab)) {
      setActiveTab('browser')
    }
  }, [activeTab, data.campaigns])

  const openCampaign = (id: string) => {
    setOpenCampaignIds((current) => (current.includes(id) ? current : [...current, id]))
    setSelectedId(id)
    setActiveTab(id)
  }

  const closeCampaign = (id: string) => {
    setOpenCampaignIds((current) => current.filter((openId) => openId !== id))
    if (activeTab === id) setActiveTab('browser')
  }

  const createCampaign = async () => {
    const createdId = await createDocument({
      _type: 'marketingCampaign',
      title: '',
      slug: { _type: 'slug', current: `new-campaign-${Date.now()}` },
      status: 'idea',
    })
    openCampaign(createdId)
  }
  const showCampaignTabs = activeTab !== 'browser'

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <PanelHeading title="Campaigns" description="Organize campaign strategy, timing, content, funnels, and measurement." />
        <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createCampaign()}>
          Add campaign
        </button>
      </div>

      {showCampaignTabs && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            borderBottom: '1px solid var(--card-border-color)',
            marginBottom: 16,
            paddingBottom: 1,
          }}
        >
          <FunnelTabButton active={activeTab === 'browser'} onClick={() => setActiveTab('browser')}>
            All campaigns
          </FunnelTabButton>
          {openCampaignIds.map((id) => {
            const campaign = data.campaigns.find((candidate) => candidate._id === id)
            if (!campaign) return null
            return (
              <FunnelTabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {campaign.title || 'Untitled campaign'}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${campaign.title || 'campaign'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeCampaign(id)
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    display: 'inline-flex',
                    padding: 2,
                    cursor: 'pointer',
                  }}
                >
                  <CloseIcon style={{ width: 14, height: 14 }} />
                </button>
              </FunnelTabButton>
            )
          })}
        </div>
      )}

      {activeTab === 'browser' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {data.campaigns.map((campaign) => {
            const campaignCalendarItems = data.calendarItems.filter((item) => item.campaign?._id === campaign._id)
            return (
              <div
                key={campaign._id}
                style={{
                  ...styles.card,
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                  borderColor: selectedId === campaign._id ? '#007385' : 'var(--card-border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong>{campaign.title || 'Untitled campaign'}</strong>
                  <StatusPill status={campaign.status} options={campaignStatusOptions} />
                </div>
                <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
                  {trimDescription(campaign.primaryGoal) || 'No goal written yet.'}
                </p>
                <div style={{ ...styles.small, ...styles.muted }}>
                  {[
                    labelFor(campaignObjectiveOptions, campaign.campaignObjective) || 'No objective',
                    dateRange(campaign.startDate, campaign.endDate) || 'No dates',
                    campaign.primaryKpi || 'No KPI',
                    `${campaignCalendarItems.length} calendar item${campaignCalendarItems.length === 1 ? '' : 's'}`,
                    `${campaign.funnels?.length || 0} funnel link${(campaign.funnels?.length || 0) === 1 ? '' : 's'}`,
                  ].join(' / ')}
                </div>
                {getCampaignChannelKeys(campaign).length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {getCampaignChannelKeys(campaign).slice(0, 5).map((channel) => (
                      <span key={channel} style={{ ...styles.small, border: '1px solid var(--card-border-color)', borderRadius: 999, padding: '3px 8px' }}>
                        {getChannelByKey(data.channels, channel)?.title || channel}
                      </span>
                    ))}
                  </div>
                )}
                <button type="button" style={styles.primaryButton} onClick={() => openCampaign(campaign._id)}>
                  Open campaign
                </button>
              </div>
            )
          })}
          {data.campaigns.length === 0 && (
            <EmptyPanel
              icon={TargetIcon}
              title="No campaigns yet"
              description="Add a campaign, then fill its strategy in the editor."
            />
          )}
        </div>
      ) : (
        <CampaignEditor
          campaign={activeCampaign}
          channels={data.channels}
          funnels={data.funnels}
          analyticsSources={data.analyticsSources}
          calendarItems={data.calendarItems}
          campaignTemplates={campaignTemplates}
          analyticsTakeaways={buildAnalyticsInterpretations(data)}
          saving={savingId === activeCampaign?._id}
          onSave={commitPatch}
        />
      )}
    </section>
  )
}

function CampaignEditor({
  campaign,
  channels,
  funnels,
  analyticsSources,
  calendarItems,
  campaignTemplates,
  analyticsTakeaways,
  saving,
  onSave,
}: {
  campaign: MarketingCampaign | null
  channels: MarketingChannel[]
  funnels: MarketingFunnel[]
  analyticsSources: MarketingAnalyticsSource[]
  calendarItems: MarketingCalendarItem[]
  campaignTemplates: CampaignTemplate[]
  analyticsTakeaways: AnalyticsInterpretation[]
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingCampaign | null>(campaign)

  useEffect(() => setDraft(campaign), [campaign])

  if (!draft || !campaign) {
    return (
      <EmptyPanel
        icon={TargetIcon}
        title="Select a campaign"
        description="Create or choose a campaign to edit its strategy."
      />
    )
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled campaign',
      slug: { _type: 'slug', current: slugify(draft.title || 'untitled-campaign') },
      status: draft.status || 'idea',
      startDate: draft.startDate,
      endDate: draft.endDate,
      primaryGoal: draft.primaryGoal,
      campaignObjective: draft.campaignObjective,
      audience: draft.audience,
      topicCluster: draft.topicCluster,
      searchIntent: draft.searchIntent,
      targetQueries: draft.targetQueries || [],
      positioning: draft.positioning,
      canonicalUrl: draft.canonicalUrl,
      channels: draft.channels || [],
      channelRefs: refsFromIds((draft.channelRefs || []).map((channel) => channel._id)),
      funnels: refsFromIds((draft.funnels || []).map((funnel) => funnel._id)),
      analyticsSources: refsFromIds((draft.analyticsSources || []).map((source) => source._id)),
      successMetrics: normalizeSuccessMetrics(draft.successMetrics || []),
      primaryKpi: draft.primaryKpi,
      utmCampaign: draft.utmCampaign,
      notes: draft.notes,
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(campaign._id, set, unset)
  }

  const applyCampaignTemplate = (template: CampaignTemplate) => {
    const channelRefs = template.channels
      .map((key) => getChannelByKey(channels, key))
      .filter(Boolean) as MarketingChannel[]

    setDraft({
      ...draft,
      campaignObjective: draft.campaignObjective || template.campaignObjective,
      primaryGoal: draft.primaryGoal || template.primaryGoal,
      primaryKpi: draft.primaryKpi || template.primaryKpi,
      audience: draft.audience || template.audience,
      topicCluster: draft.topicCluster || template.topicCluster,
      searchIntent: draft.searchIntent || template.searchIntent,
      targetQueries: draft.targetQueries?.length ? draft.targetQueries : template.targetQueries,
      positioning: draft.positioning || template.positioning,
      utmCampaign: draft.utmCampaign || slugify(draft.title || template.title),
      channels: Array.from(new Set([...(draft.channels || []), ...template.channels])),
      channelRefs: uniqueById([...(draft.channelRefs || []), ...channelRefs]),
      successMetrics: draft.successMetrics?.length ? draft.successMetrics : normalizeSuccessMetrics(template.successMetrics),
      notes: draft.notes || template.notes,
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const campaignSuggestion = suggestion.campaign || {}
    setDraft({
      ...draft,
      title: aiString(campaignSuggestion.title) || draft.title,
      campaignObjective: aiOption(campaignSuggestion.campaignObjective, campaignObjectiveOptions) || draft.campaignObjective,
      primaryGoal: aiString(campaignSuggestion.primaryGoal) || draft.primaryGoal,
      primaryKpi: aiString(campaignSuggestion.primaryKpi) || draft.primaryKpi,
      audience: aiString(campaignSuggestion.audience) || draft.audience,
      topicCluster: aiString(campaignSuggestion.topicCluster) || draft.topicCluster,
      searchIntent: aiOption(campaignSuggestion.searchIntent, searchIntentOptions) || draft.searchIntent,
      targetQueries: aiStringList(campaignSuggestion.targetQueries) || draft.targetQueries,
      positioning: aiString(campaignSuggestion.positioning) || draft.positioning,
      canonicalUrl: aiString(campaignSuggestion.canonicalUrl) || draft.canonicalUrl,
      utmCampaign: aiString(campaignSuggestion.utmCampaign) || draft.utmCampaign,
      notes: aiString(campaignSuggestion.notes) || draft.notes,
    })
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Campaign editor" type="marketingCampaign" id={campaign._id} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <TemplateRail
            title="Campaign templates"
            description="Pick the closest pattern. It fills the strategy prompts, channels, and starter metrics."
            templates={campaignTemplates}
            onApply={applyCampaignTemplate}
          />
          <MarketingAiAssistPanel
            kind="campaign"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={analyticsTakeaways}
            onApply={applyAiSuggestion}
          />
          <GuidanceChecklist
            title="Strategy checklist"
            items={[
              { label: 'Objective is broader than one post', done: !!draft.campaignObjective },
              { label: 'Primary goal says what should change', done: !!draft.primaryGoal?.trim() },
              { label: 'Primary KPI names the main success signal', done: !!draft.primaryKpi?.trim() },
              { label: 'Audience is specific enough to design for', done: !!draft.audience?.trim() },
              {
                label: 'Topic, intent, or target phrases guide titles and captions',
                done: !!draft.topicCluster?.trim() || !!draft.searchIntent || (draft.targetQueries || []).length > 0,
              },
              { label: 'Positioning explains the useful idea', done: !!draft.positioning?.trim() },
              { label: 'Stable UTM campaign name is set', done: !!draft.utmCampaign?.trim() },
              { label: 'At least one channel is selected', done: (draft.channels || []).length > 0 || (draft.channelRefs || []).length > 0 },
              { label: 'A funnel or next-step path is attached', done: (draft.funnels || []).length > 0 },
            ]}
          />
          <InputField label="Campaign name">
            <input
              style={styles.input}
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
            />
          </InputField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Objective">
              <Select
                value={draft.campaignObjective || ''}
                options={[{ title: 'Choose objective...', value: '' }, ...campaignObjectiveOptions]}
                onChange={(campaignObjective) => setDraft({ ...draft, campaignObjective })}
              />
            </InputField>
            <InputField label="Primary KPI">
              <input
                style={styles.input}
                value={draft.primaryKpi || ''}
                onChange={(event) => setDraft({ ...draft, primaryKpi: event.currentTarget.value })}
                placeholder="e.g. qualified conversations"
              />
            </InputField>
          </div>
          <InputField label="Primary goal">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.primaryGoal || ''}
              onChange={(event) => setDraft({ ...draft, primaryGoal: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Audience">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.audience || ''}
              onChange={(event) => setDraft({ ...draft, audience: event.currentTarget.value })}
            />
          </InputField>
          <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Discovery and search cues</h3>
            <p style={{ ...styles.small, ...styles.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
              Optional, but useful when captions, titles, articles, or social posts need to meet how people actually describe the problem.
            </p>
            <Stack gap={10}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InputField label="Topic / keyword cluster">
                  <input
                    style={styles.input}
                    value={draft.topicCluster || ''}
                    onChange={(event) => setDraft({ ...draft, topicCluster: event.currentTarget.value })}
                    placeholder="e.g. healthcare service design"
                  />
                </InputField>
                <InputField label="Visitor intent">
                  <Select
                    value={draft.searchIntent || ''}
                    options={[{ title: 'No intent selected', value: '' }, ...searchIntentOptions]}
                    onChange={(searchIntent) => setDraft({ ...draft, searchIntent })}
                  />
                </InputField>
              </div>
              <InputField label="Target queries / phrases">
                <textarea
                  rows={3}
                  style={styles.input}
                  value={(draft.targetQueries || []).join('\n')}
                  onChange={(event) => setDraft({ ...draft, targetQueries: stringListFromText(event.currentTarget.value) })}
                  placeholder={'One phrase per line\ne.g. healthcare design case study'}
                />
              </InputField>
            </Stack>
          </div>
          <InputField label="Positioning / message">
            <textarea
              rows={5}
              style={styles.input}
              value={draft.positioning || ''}
              onChange={(event) => setDraft({ ...draft, positioning: event.currentTarget.value })}
            />
          </InputField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Canonical destination URL">
              <input
                style={styles.input}
                value={draft.canonicalUrl || ''}
                onChange={(event) => setDraft({ ...draft, canonicalUrl: event.currentTarget.value })}
                placeholder="https://..."
              />
            </InputField>
            <InputField label="UTM campaign name">
              <input
                style={styles.input}
                value={draft.utmCampaign || ''}
                onChange={(event) => setDraft({ ...draft, utmCampaign: optionalSlug(event.currentTarget.value) })}
                placeholder={slugify(draft.title || 'campaign-name')}
              />
            </InputField>
          </div>
          <InputField label="Internal notes">
            <textarea
              rows={5}
              style={styles.input}
              value={draft.notes || ''}
              onChange={(event) => setDraft({ ...draft, notes: event.currentTarget.value })}
            />
          </InputField>
        </Stack>

        <Stack gap={12}>
          <InputField label="Status">
            <Select
              value={draft.status || 'idea'}
              options={campaignStatusOptions}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </InputField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Start">
              <input
                type="date"
                style={styles.input}
                value={draft.startDate || ''}
                onChange={(event) => setDraft({ ...draft, startDate: event.currentTarget.value })}
              />
            </InputField>
            <InputField label="End">
              <input
                type="date"
                style={styles.input}
                value={draft.endDate || ''}
                onChange={(event) => setDraft({ ...draft, endDate: event.currentTarget.value })}
              />
            </InputField>
          </div>
          <InputField label="Channels">
            <div style={{ display: 'grid', gap: 8 }}>
              {getChannelOptions(channels).map((option) => {
                const checked = draft.channels?.includes(option.value) || false
                const channel = getChannelByKey(channels, option.value)
                return (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const current = draft.channels || []
                        const nextChannels = event.currentTarget.checked
                          ? [...current, option.value]
                          : current.filter((value) => value !== option.value)
                        const currentRefs = draft.channelRefs || []
                        const nextRefs = event.currentTarget.checked && channel
                          ? [...currentRefs.filter((ref) => ref._id !== channel._id), channel]
                          : currentRefs.filter((ref) => ref.key !== option.value)
                        setDraft({ ...draft, channels: nextChannels, channelRefs: nextRefs })
                      }}
                    />
                    {option.title}
                  </label>
                )
              })}
            </div>
          </InputField>
          <RelationshipChecklist
            title="Funnels"
            items={funnels}
            selectedIds={(draft.funnels || []).map((funnel) => funnel._id)}
            getSubtitle={(funnel) =>
              [
                labelFor(funnelStatusOptions, funnel.status),
                `${funnel.stages?.length || 0} stages`,
              ].filter(Boolean).join(' / ')
            }
            onChange={(ids) => setDraft({ ...draft, funnels: ids.map((id) => funnels.find((funnel) => funnel._id === id)).filter(Boolean) as RefSummary[] })}
          />
          <RelationshipChecklist
            title="Analytics sources"
            items={analyticsSources}
            selectedIds={(draft.analyticsSources || []).map((source) => source._id)}
            getSubtitle={(source) => labelFor(analyticsProviderOptions, source.provider)}
            onChange={(ids) =>
              setDraft({
                ...draft,
                analyticsSources: ids.map((id) => analyticsSources.find((source) => source._id === id)).filter(Boolean) as RefSummary[],
              })
            }
          />
          <RelationshipUsagePanel
            title="Calendar items in this campaign"
            items={calendarItems.filter((item) => item.campaign?._id === campaign._id)}
            emptyText="No calendar items are assigned to this campaign yet."
            renderMeta={(item) =>
              [
                toDateInputValue(item.publishAt),
                item.channelRef?.title || getChannelByKey(channels, item.channel)?.title || item.channel,
                item.funnel?.title,
              ].filter(Boolean).join(' / ')
            }
          />
          <MetricSummary metrics={draft.successMetrics || []} />
          <AdvancedFieldsDropdown type="marketingCampaign" id={campaign._id} />
          <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save campaign'}
          </button>
        </Stack>
      </div>
    </section>
  )
}

function FunnelWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.funnels[0]?._id || null)
  const [openFunnelIds, setOpenFunnelIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('browser')
  const activeFunnel = activeTab === 'browser' ? null : data.funnels.find((funnel) => funnel._id === activeTab) || null
  const funnelTemplates = useMemo(() => getFunnelTemplates(data), [data])

  useEffect(() => {
    if (!selectedId && data.funnels.length > 0) setSelectedId(data.funnels[0]._id)
  }, [data.funnels, selectedId])

  useEffect(() => {
    setOpenFunnelIds((current) => current.filter((id) => data.funnels.some((funnel) => funnel._id === id)))
    if (activeTab !== 'browser' && !data.funnels.some((funnel) => funnel._id === activeTab)) {
      setActiveTab('browser')
    }
  }, [activeTab, data.funnels])

  const openFunnel = (id: string) => {
    setOpenFunnelIds((current) => (current.includes(id) ? current : [...current, id]))
    setSelectedId(id)
    setActiveTab(id)
  }

  const closeFunnel = (id: string) => {
    setOpenFunnelIds((current) => current.filter((openId) => openId !== id))
    if (activeTab === id) setActiveTab('browser')
  }

  const createFunnel = async () => {
    const createdId = await createDocument({
      _type: 'marketingFunnel',
      title: '',
      status: 'draft',
      stages: [],
    })
    openFunnel(createdId)
  }

  const addStage = async (funnelId: string, stage: FunnelStage) => {
    await client
      .patch(funnelId)
      .setIfMissing({ stages: [] })
      .append('stages', [{ ...stage, _key: randomKey(), _type: 'funnelStage' }])
      .commit()
    await loadData()
  }
  const showFunnelTabs = activeTab !== 'browser'

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
        <PanelHeading title="Funnels" description="Build reusable stage maps for campaigns, pages, and CTAs." />
        <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createFunnel()}>
          Add funnel
        </button>
      </div>

      {showFunnelTabs && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            borderBottom: '1px solid var(--card-border-color)',
            marginBottom: 16,
            paddingBottom: 1,
          }}
        >
          <FunnelTabButton active={activeTab === 'browser'} onClick={() => setActiveTab('browser')}>
            All funnels
          </FunnelTabButton>
          {openFunnelIds.map((id) => {
            const funnel = data.funnels.find((candidate) => candidate._id === id)
            if (!funnel) return null
            return (
              <FunnelTabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)}>
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {funnel.title || 'Untitled funnel'}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${funnel.title || 'funnel'}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeFunnel(id)
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    display: 'inline-flex',
                    padding: 2,
                    cursor: 'pointer',
                  }}
                >
                  <CloseIcon style={{ width: 14, height: 14 }} />
                </button>
              </FunnelTabButton>
            )
          })}
        </div>
      )}

      {activeTab === 'browser' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {data.funnels.map((funnel) => (
            <div
              key={funnel._id}
              style={{
                ...styles.card,
                padding: 14,
                display: 'grid',
                gap: 10,
                borderColor: selectedId === funnel._id ? '#007385' : 'var(--card-border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{funnel.title || 'Untitled funnel'}</strong>
                <StatusPill status={funnel.status} options={funnelStatusOptions} />
              </div>
              <div style={{ ...styles.small, ...styles.muted }}>
                {[
                  `${funnel.stages?.length || 0} stage${(funnel.stages?.length || 0) === 1 ? '' : 's'}`,
                  `${data.campaigns.filter((campaign) => (campaign.funnels || []).some((ref) => ref._id === funnel._id)).length} campaign links`,
                  `${data.calendarItems.filter((item) => item.funnel?._id === funnel._id).length} calendar items`,
                ].join(' / ')}
              </div>
              <button type="button" style={styles.primaryButton} onClick={() => openFunnel(funnel._id)}>
                Open funnel
              </button>
            </div>
          ))}
          {data.funnels.length === 0 && (
            <EmptyPanel
              icon={MasterDetailIcon}
              title="No funnels yet"
              description="Add a funnel, then fill its stage map in the editor."
            />
          )}
        </div>
      ) : (
        <FunnelManager
          funnel={activeFunnel}
          data={data}
          funnelTemplates={funnelTemplates}
          saving={savingId === activeFunnel?._id}
          onSave={commitPatch}
          onAddStage={addStage}
        />
      )}
    </section>
  )
}

function FunnelManager({
  funnel,
  data,
  funnelTemplates,
  saving,
  onSave,
  onAddStage,
}: {
  funnel: MarketingFunnel | null
  data: MarketingData
  funnelTemplates: FunnelTemplate[]
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onAddStage: (funnelId: string, stage: FunnelStage) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingFunnel | null>(funnel)
  const [newStage, setNewStage] = useState<FunnelStage>({ _key: '', stage: 'awareness', goal: '', callToAction: '' })

  useEffect(() => setDraft(funnel), [funnel])

  if (!draft || !funnel) {
    return (
      <EmptyPanel
        icon={MasterDetailIcon}
        title="Select a funnel"
        description="Create or choose a funnel to manage its stage map."
      />
    )
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled funnel',
      status: draft.status || 'draft',
      audience: draft.audience,
      conversionGoal: draft.conversionGoal,
      notes: draft.notes,
      stages: normalizeFunnelStages(draft.stages || []),
      analyticsSources: refsFromIds((draft.analyticsSources || []).map((source) => source._id)),
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(funnel._id, set, unset)
  }

  const stagesByType = new Map<string, FunnelStage[]>()
  ;(draft.stages || []).forEach((stage) => {
    const key = stage.stage || 'awareness'
    stagesByType.set(key, [...(stagesByType.get(key) || []), stage])
  })

  const applyFunnelTemplate = (template: FunnelTemplate) => {
    setDraft({
      ...draft,
      audience: draft.audience || template.audience,
      conversionGoal: draft.conversionGoal || template.conversionGoal,
      stages: normalizeFunnelStages(template.stages),
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const funnelSuggestion = suggestion.funnel || {}
    setDraft({
      ...draft,
      title: aiString(funnelSuggestion.title) || draft.title,
      audience: aiString(funnelSuggestion.audience) || draft.audience,
      conversionGoal: aiString(funnelSuggestion.conversionGoal) || draft.conversionGoal,
      notes: aiString(funnelSuggestion.notes) || draft.notes,
      stages: aiFunnelStages(funnelSuggestion.stages) || draft.stages,
    })
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Funnels manager" type="marketingFunnel" id={funnel._id} />
      <GuidanceChecklist
        title="Funnel checklist"
        items={[
          { label: 'Audience is defined', done: !!draft.audience?.trim() },
          { label: 'Conversion goal is specific', done: !!draft.conversionGoal?.trim() },
          { label: 'Stages cover the path from awareness to action', done: (draft.stages || []).length >= 3 },
          { label: 'Each stage has a goal', done: (draft.stages || []).length > 0 && (draft.stages || []).every((stage) => !!stage.goal?.trim()) },
          { label: 'CTAs tell the visitor what to do next', done: (draft.stages || []).some((stage) => !!stage.callToAction?.trim()) },
          { label: 'Analytics sources are connected', done: (draft.analyticsSources || []).length > 0 },
        ]}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 18 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
            <InputField label="Funnel name">
              <input
                style={styles.input}
                value={draft.title || ''}
                onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
              />
            </InputField>
            <InputField label="Status">
              <Select
                value={draft.status || 'draft'}
                options={funnelStatusOptions}
                onChange={(status) => setDraft({ ...draft, status })}
              />
            </InputField>
            <div style={{ alignSelf: 'end' }}>
              <button type="button" style={{ ...styles.primaryButton, width: '100%' }} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving...' : 'Save funnel'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(160px, 1fr))', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {funnelStageOptions.map((option) => (
              <div key={option.value} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, minHeight: 300 }}>
                <div
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--card-border-color)',
                    fontWeight: 800,
                    background: 'rgba(0, 115, 133, 0.08)',
                  }}
                >
                  {option.title}
                </div>
                <div style={{ padding: 10, display: 'grid', gap: 10 }}>
                  {(stagesByType.get(option.value) || []).map((stage) => (
                    <StageCard key={stage._key} stage={stage} />
                  ))}
                  {(stagesByType.get(option.value) || []).length === 0 && (
                    <div style={{ ...styles.muted, ...styles.small }}>No step yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Stack gap={12}>
          <TemplateRail
            title="Funnel templates"
            description="Apply a complete stage map, then tune the audience, offers, and CTAs for this campaign."
            templates={funnelTemplates}
            onApply={applyFunnelTemplate}
          />
          <MarketingAiAssistPanel
            kind="funnel"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={buildAnalyticsInterpretations(data)}
            onApply={applyAiSuggestion}
          />
          <InputField label="Audience">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.audience || ''}
              onChange={(event) => setDraft({ ...draft, audience: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Conversion goal">
            <textarea
              rows={3}
              style={styles.input}
              value={draft.conversionGoal || ''}
              onChange={(event) => setDraft({ ...draft, conversionGoal: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Notes">
            <textarea
              rows={4}
              style={styles.input}
              value={draft.notes || ''}
              onChange={(event) => setDraft({ ...draft, notes: event.currentTarget.value })}
            />
          </InputField>
          <RelationshipChecklist
            title="Analytics sources"
            items={data.analyticsSources}
            selectedIds={(draft.analyticsSources || []).map((source) => source._id)}
            getSubtitle={(source) => labelFor(analyticsProviderOptions, source.provider)}
            onChange={(ids) =>
              setDraft({
                ...draft,
                analyticsSources: ids.map((id) => data.analyticsSources.find((source) => source._id === id)).filter(Boolean) as RefSummary[],
              })
            }
          />
          <RelationshipUsagePanel
            title="Campaigns using this funnel"
            items={data.campaigns.filter((campaign) => (campaign.funnels || []).some((ref) => ref._id === funnel._id))}
            emptyText="No campaigns are linked to this funnel yet."
            renderMeta={(campaign) =>
              [
                labelFor(campaignStatusOptions, campaign.status),
                dateRange(campaign.startDate, campaign.endDate),
              ].filter(Boolean).join(' / ')
            }
          />
          <RelationshipUsagePanel
            title="Calendar items in this funnel"
            items={data.calendarItems.filter((item) => item.funnel?._id === funnel._id)}
            emptyText="No calendar items are assigned to this funnel yet."
            renderMeta={(item) =>
              [
                toDateInputValue(item.publishAt),
                item.campaign?.title,
                item.channelRef?.title || item.channel,
              ].filter(Boolean).join(' / ')
            }
          />
          <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Add stage step</h3>
            <Stack gap={10}>
              <InputField label="Stage">
                <Select
                  value={newStage.stage || 'awareness'}
                  options={funnelStageOptions}
                  onChange={(stage) => setNewStage({ ...newStage, stage })}
                />
              </InputField>
              <InputField label="Goal">
                <textarea
                  rows={2}
                  style={styles.input}
                  value={newStage.goal || ''}
                  onChange={(event) => setNewStage({ ...newStage, goal: event.currentTarget.value })}
                />
              </InputField>
              <InputField label="CTA">
                <input
                  style={styles.input}
                  value={newStage.callToAction || ''}
                  onChange={(event) => setNewStage({ ...newStage, callToAction: event.currentTarget.value })}
                />
              </InputField>
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  void onAddStage(funnel._id, newStage)
                  setNewStage({ _key: '', stage: 'awareness', goal: '', callToAction: '' })
                }}
              >
                Add stage
              </button>
            </Stack>
          </div>
          <AdvancedFieldsDropdown type="marketingFunnel" id={funnel._id} />
        </Stack>
      </div>
    </section>
  )
}

function StageCard({ stage }: { stage: FunnelStage }) {
  return (
    <div style={{ border: '1px solid var(--card-border-color)', borderRadius: 6, padding: 10, background: 'var(--card-bg-color)' }}>
      {stage.goal && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{stage.goal}</div>}
      {stage.offer && <div style={{ ...styles.small, ...styles.muted }}>Offer: {stage.offer}</div>}
      {stage.callToAction && <div style={{ ...styles.small, color: '#007385', fontWeight: 800 }}>CTA: {stage.callToAction}</div>}
      {stage.destinationUrl && (
        <a href={stage.destinationUrl} target="_blank" rel="noreferrer" style={{ ...styles.small, color: '#007385' }}>
          Destination
        </a>
      )}
    </div>
  )
}

function TemplateWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.templates[0]?._id || null)
  const [kindFilter, setKindFilter] = useState('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const filteredTemplates = useMemo(
    () => data.templates.filter((template) => kindFilter === 'all' || template.kind === kindFilter),
    [data.templates, kindFilter],
  )
  const selected = data.templates.find((template) => template._id === selectedId) || null

  useEffect(() => {
    if (selectedId && data.templates.some((template) => template._id === selectedId)) return
    setSelectedId(filteredTemplates[0]?._id || data.templates[0]?._id || null)
  }, [data.templates, filteredTemplates, selectedId])

  const createTemplate = async (kind: 'campaign' | 'funnel') => {
    const createdId = await createDocument(defaultMarketingTemplateDocument(kind))
    setKindFilter(kind)
    setSelectedId(createdId)
  }

  const deleteTemplate = async (template: MarketingTemplate) => {
    const message = `Delete "${template.title || 'Untitled template'}"? Existing campaigns and funnels created from it will not change, but this template will disappear from future pickers.`
    if (!window.confirm(message)) return

    setDeletingId(template._id)
    try {
      await client.delete(template._id)
      setSelectedId(data.templates.find((candidate) => candidate._id !== template._id)?._id || null)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '390px minmax(0, 1fr)', gap: 16 }}>
      <section style={styles.panel}>
        <PanelHeading
          title="Templates"
          description="Create reusable campaign and funnel setup patterns that designers can pick from instead of rebuilding strategy every time."
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createTemplate('campaign')}>
            Add campaign template
          </button>
          <button type="button" style={styles.primaryButton} disabled={savingId === 'new'} onClick={() => void createTemplate('funnel')}>
            Add funnel template
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
          {[
            { title: 'All', value: 'all' },
            { title: 'Campaigns', value: 'campaign' },
            { title: 'Funnels', value: 'funnel' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              style={{
                ...styles.button,
                padding: '8px 10px',
                borderColor: kindFilter === option.value ? '#007385' : 'var(--card-border-color)',
                background: kindFilter === option.value ? 'rgba(0, 115, 133, 0.10)' : 'var(--card-bg-color)',
              }}
              onClick={() => setKindFilter(option.value)}
            >
              {option.title}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredTemplates.map((template) => (
            <button
              key={template._id}
              type="button"
              style={{
                ...styles.templateButton,
                borderColor: selectedId === template._id ? '#007385' : 'var(--card-border-color)',
                background: selectedId === template._id ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
              }}
              onClick={() => setSelectedId(template._id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <strong style={{ fontSize: 13 }}>{template.title || 'Untitled template'}</strong>
                <StatusPill status={template.status} options={marketingTemplateStatusOptions} />
              </div>
              <span style={{ ...styles.small, ...styles.muted }}>
                {labelFor(marketingTemplateKindOptions, template.kind)} / {template.description || 'No description yet'}
              </span>
            </button>
          ))}
          {filteredTemplates.length === 0 && (
            <EmptyInline title="No managed templates in this category yet. Built-in starter templates still appear in the campaign and funnel creation flows." />
          )}
        </div>
      </section>

      <TemplateEditor
        template={selected}
        data={data}
        saving={savingId === selected?._id || deletingId === selected?._id}
        onSave={commitPatch}
        onDelete={deleteTemplate}
      />
    </div>
  )
}

function TemplateEditor({
  template,
  data,
  saving,
  onSave,
  onDelete,
}: {
  template: MarketingTemplate | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onDelete: (template: MarketingTemplate) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingTemplate | null>(template)

  useEffect(() => setDraft(template), [template])

  if (!draft || !template) {
    return <EmptyPanel icon={DashboardIcon} title="Select a template" description="Create or choose a template to manage its reusable setup fields." />
  }

  const isCampaign = draft.kind !== 'funnel'

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const templateSuggestion = suggestion.template || {}
    const nextKind = aiOption(templateSuggestion.kind, marketingTemplateKindOptions) || draft.kind || 'campaign'
    const nextDraft: MarketingTemplate = {
      ...draft,
      title: aiString(templateSuggestion.title) || draft.title,
      kind: nextKind,
      status: aiOption(templateSuggestion.status, marketingTemplateStatusOptions) || draft.status || 'active',
      description: aiString(templateSuggestion.description) || draft.description,
      whenToUse: aiString(templateSuggestion.whenToUse) || draft.whenToUse,
      audience: aiString(templateSuggestion.audience) || draft.audience,
    }

    if (nextKind === 'funnel') {
      nextDraft.conversionGoal = aiString(templateSuggestion.conversionGoal) || draft.conversionGoal
      nextDraft.stages = aiFunnelStages(templateSuggestion.stages) || draft.stages
    } else {
      nextDraft.campaignObjective = aiOption(templateSuggestion.campaignObjective, campaignObjectiveOptions) || draft.campaignObjective
      nextDraft.primaryGoal = aiString(templateSuggestion.primaryGoal) || draft.primaryGoal
      nextDraft.primaryKpi = aiString(templateSuggestion.primaryKpi) || draft.primaryKpi
      nextDraft.topicCluster = aiString(templateSuggestion.topicCluster) || draft.topicCluster
      nextDraft.searchIntent = aiOption(templateSuggestion.searchIntent, searchIntentOptions) || draft.searchIntent
      nextDraft.targetQueries = aiStringList(templateSuggestion.targetQueries) || draft.targetQueries
      nextDraft.positioning = aiString(templateSuggestion.positioning) || draft.positioning
      nextDraft.channels = aiStringList(templateSuggestion.channels) || draft.channels
      nextDraft.successMetrics = aiTemplateSuccessMetrics(templateSuggestion.successMetrics) || draft.successMetrics
      nextDraft.designerGuidance = aiStringList(templateSuggestion.designerGuidance) || draft.designerGuidance
      nextDraft.notes = aiString(templateSuggestion.notes) || draft.notes
    }

    setDraft(nextDraft)
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled template',
      kind: isCampaign ? 'campaign' : 'funnel',
      status: draft.status || 'active',
      description: draft.description,
      whenToUse: draft.whenToUse,
      order: draft.order,
      audience: draft.audience,
    }
    const unset: string[] = []

    if (isCampaign) {
      Object.assign(set, {
        campaignObjective: draft.campaignObjective || 'awareness',
        primaryGoal: draft.primaryGoal,
        primaryKpi: draft.primaryKpi,
        topicCluster: draft.topicCluster,
        searchIntent: draft.searchIntent || 'learn',
        targetQueries: normalizeStringList(draft.targetQueries || []),
        positioning: draft.positioning,
        channels: normalizeStringList(draft.channels || []),
        successMetrics: normalizeSuccessMetrics(draft.successMetrics || []),
        designerGuidance: normalizeStringList(draft.designerGuidance || []),
        notes: draft.notes,
      })
      unset.push('conversionGoal', 'stages')
    } else {
      Object.assign(set, {
        conversionGoal: draft.conversionGoal,
        stages: normalizeFunnelStages(draft.stages || []),
      })
      unset.push('campaignObjective', 'primaryGoal', 'primaryKpi', 'topicCluster', 'searchIntent', 'targetQueries', 'positioning', 'channels', 'successMetrics', 'designerGuidance', 'notes')
    }

    const empty = emptyKeys(set)
    empty.forEach((key) => delete set[key])
    await onSave(template._id, set, [...unset, ...empty])
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Template editor" type="marketingTemplate" id={template._id} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', gap: 10 }}>
            <InputField label="Template title">
              <input style={styles.input} value={draft.title || ''} onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })} />
            </InputField>
            <InputField label="Type">
              <Select value={draft.kind || 'campaign'} options={marketingTemplateKindOptions} onChange={(kind) => setDraft({ ...draft, kind })} />
            </InputField>
            <InputField label="Status">
              <Select value={draft.status || 'active'} options={marketingTemplateStatusOptions} onChange={(status) => setDraft({ ...draft, status })} />
            </InputField>
          </div>
          <InputField label="Short description">
            <textarea rows={2} style={styles.input} value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })} />
          </InputField>
          <InputField label="When to use">
            <textarea rows={3} style={styles.input} value={draft.whenToUse || ''} onChange={(event) => setDraft({ ...draft, whenToUse: event.currentTarget.value })} />
          </InputField>
          <InputField label="Audience">
            <textarea rows={3} style={styles.input} value={draft.audience || ''} onChange={(event) => setDraft({ ...draft, audience: event.currentTarget.value })} />
          </InputField>

          {isCampaign ? (
            <CampaignTemplateFields draft={draft} onChange={setDraft} />
          ) : (
            <FunnelTemplateFields draft={draft} onChange={setDraft} />
          )}
        </Stack>

        <Stack gap={12}>
          <MarketingAiAssistPanel
            kind="template"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={buildAnalyticsInterpretations(data)}
            onApply={applyAiSuggestion}
          />
          <GuidanceChecklist
            title="Template checklist"
            items={[
              { label: 'Title is specific', done: !!draft.title?.trim() },
              { label: 'When to use is clear', done: !!draft.whenToUse?.trim() },
              { label: 'Audience is defined', done: !!draft.audience?.trim() },
              isCampaign
                ? { label: 'Campaign has KPI and goal', done: !!draft.primaryGoal?.trim() && !!draft.primaryKpi?.trim() }
                : { label: 'Funnel has stages and CTA', done: (draft.stages || []).length > 0 && (draft.stages || []).some((stage) => !!stage.callToAction?.trim()) },
            ]}
          />
          <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Used by creation flows</h3>
            <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
              Active managed templates appear before built-in fallbacks when designers create a new campaign or funnel.
            </p>
          </div>
          <AdvancedFieldsDropdown type="marketingTemplate" id={template._id} />
          <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save template'}
          </button>
          <button
            type="button"
            style={{ ...styles.button, borderColor: 'rgba(227, 98, 22, 0.45)', color: '#E36216' }}
            disabled={saving}
            onClick={() => void onDelete(template)}
          >
            Delete template
          </button>
        </Stack>
      </div>
    </section>
  )
}

function CampaignTemplateFields({
  draft,
  onChange,
}: {
  draft: MarketingTemplate
  onChange: (draft: MarketingTemplate) => void
}) {
  return (
    <Stack gap={12}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10 }}>
        <InputField label="Objective">
          <Select
            value={draft.campaignObjective || 'awareness'}
            options={campaignObjectiveOptions}
            onChange={(campaignObjective) => onChange({ ...draft, campaignObjective })}
          />
        </InputField>
        <InputField label="Search intent">
          <Select
            value={draft.searchIntent || 'learn'}
            options={searchIntentOptions}
            onChange={(searchIntent) => onChange({ ...draft, searchIntent })}
          />
        </InputField>
        <InputField label="Order">
          <input
            type="number"
            style={styles.input}
            value={draft.order ?? 100}
            onChange={(event) => onChange({ ...draft, order: Number(event.currentTarget.value) })}
          />
        </InputField>
      </div>
      <InputField label="Primary goal">
        <textarea rows={3} style={styles.input} value={draft.primaryGoal || ''} onChange={(event) => onChange({ ...draft, primaryGoal: event.currentTarget.value })} />
      </InputField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <InputField label="Primary KPI">
          <input style={styles.input} value={draft.primaryKpi || ''} onChange={(event) => onChange({ ...draft, primaryKpi: event.currentTarget.value })} />
        </InputField>
        <InputField label="Topic / keyword cluster">
          <input style={styles.input} value={draft.topicCluster || ''} onChange={(event) => onChange({ ...draft, topicCluster: event.currentTarget.value })} />
        </InputField>
      </div>
      <InputField label="Positioning">
        <textarea rows={3} style={styles.input} value={draft.positioning || ''} onChange={(event) => onChange({ ...draft, positioning: event.currentTarget.value })} />
      </InputField>
      <StringListEditor title="Target queries" items={draft.targetQueries || []} placeholder="Add a search phrase" onChange={(targetQueries) => onChange({ ...draft, targetQueries })} />
      <StringListEditor title="Starter channel keys" items={draft.channels || []} placeholder="website, instagram, linkedin..." onChange={(channels) => onChange({ ...draft, channels })} />
      <SuccessMetricListEditor metrics={draft.successMetrics || []} onChange={(successMetrics) => onChange({ ...draft, successMetrics })} />
      <StringListEditor title="Designer guidance" items={draft.designerGuidance || []} placeholder="Add a production note" onChange={(designerGuidance) => onChange({ ...draft, designerGuidance })} />
      <InputField label="Notes">
        <textarea rows={4} style={styles.input} value={draft.notes || ''} onChange={(event) => onChange({ ...draft, notes: event.currentTarget.value })} />
      </InputField>
    </Stack>
  )
}

function FunnelTemplateFields({
  draft,
  onChange,
}: {
  draft: MarketingTemplate
  onChange: (draft: MarketingTemplate) => void
}) {
  return (
    <Stack gap={12}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
        <InputField label="Conversion goal">
          <textarea rows={3} style={styles.input} value={draft.conversionGoal || ''} onChange={(event) => onChange({ ...draft, conversionGoal: event.currentTarget.value })} />
        </InputField>
        <InputField label="Order">
          <input
            type="number"
            style={styles.input}
            value={draft.order ?? 100}
            onChange={(event) => onChange({ ...draft, order: Number(event.currentTarget.value) })}
          />
        </InputField>
      </div>
      <FunnelStageListEditor stages={draft.stages || []} onChange={(stages) => onChange({ ...draft, stages })} />
    </Stack>
  )
}

function StringListEditor({
  title,
  items,
  placeholder,
  onChange,
}: {
  title: string
  items: string[]
  placeholder: string
  onChange: (items: string[]) => void
}) {
  const [newItem, setNewItem] = useState('')
  const normalized = normalizeStringList(items)

  const addItem = () => {
    if (!newItem.trim()) return
    onChange([...normalized, newItem.trim()])
    setNewItem('')
  }

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {normalized.map((item, index) => (
          <div key={`${item}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <input
              style={styles.input}
              value={item}
              onChange={(event) => onChange(normalized.map((value, valueIndex) => (valueIndex === index ? event.currentTarget.value : value)))}
            />
            <button type="button" style={styles.button} onClick={() => onChange(normalized.filter((_, valueIndex) => valueIndex !== index))}>
              Remove
            </button>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input style={styles.input} value={newItem} placeholder={placeholder} onChange={(event) => setNewItem(event.currentTarget.value)} />
          <button type="button" style={styles.button} onClick={addItem}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

function SuccessMetricListEditor({
  metrics,
  onChange,
}: {
  metrics: Array<{ _key?: string; label?: string; target?: string }>
  onChange: (metrics: Array<{ _key?: string; label?: string; target?: string }>) => void
}) {
  const normalized = (metrics || []).map((metric) => ({ ...metric, _key: metric._key || randomKey() }))
  const updateMetric = (key: string, patch: { label?: string; target?: string }) => {
    onChange(normalized.map((metric) => (metric._key === key ? { ...metric, ...patch } : metric)))
  }

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Success metrics</h3>
        <button type="button" style={styles.button} onClick={() => onChange([...normalized, { _key: randomKey(), label: '', target: '' }])}>
          Add metric
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {normalized.map((metric) => (
          <div key={metric._key} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
              <input style={styles.input} value={metric.label || ''} placeholder="Metric" onChange={(event) => updateMetric(metric._key || '', { label: event.currentTarget.value })} />
              <button type="button" style={styles.button} onClick={() => onChange(normalized.filter((candidate) => candidate._key !== metric._key))}>
                Remove
              </button>
            </div>
            <textarea rows={2} style={styles.input} value={metric.target || ''} placeholder="How should we judge it?" onChange={(event) => updateMetric(metric._key || '', { target: event.currentTarget.value })} />
          </div>
        ))}
        {normalized.length === 0 && <EmptyInline title="No metrics yet. Add the one or two signals designers should care about." />}
      </div>
    </div>
  )
}

function FunnelStageListEditor({
  stages,
  onChange,
}: {
  stages: FunnelStage[]
  onChange: (stages: FunnelStage[]) => void
}) {
  const normalized = normalizeFunnelStages(stages || [])
  const updateStage = (key: string, patch: Partial<FunnelStage>) => {
    onChange(normalized.map((stage) => (stage._key === key ? { ...stage, ...patch } : stage)))
  }

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Funnel stages</h3>
        <button
          type="button"
          style={styles.button}
          onClick={() => onChange([...normalized, { _key: randomKey(), _type: 'funnelStage', stage: 'awareness', goal: '', callToAction: '', metrics: [] }])}
        >
          Add stage
        </button>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {normalized.map((stage) => (
          <div key={stage._key} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 8, marginBottom: 8 }}>
              <Select value={stage.stage || 'awareness'} options={funnelStageOptions} onChange={(value) => updateStage(stage._key, { stage: value })} />
              <input style={styles.input} value={stage.callToAction || ''} placeholder="CTA" onChange={(event) => updateStage(stage._key, { callToAction: event.currentTarget.value })} />
              <button type="button" style={styles.button} onClick={() => onChange(normalized.filter((candidate) => candidate._key !== stage._key))}>
                Remove
              </button>
            </div>
            <textarea rows={2} style={{ ...styles.input, marginBottom: 8 }} value={stage.goal || ''} placeholder="Stage goal" onChange={(event) => updateStage(stage._key, { goal: event.currentTarget.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input style={styles.input} value={stage.offer || ''} placeholder="Offer" onChange={(event) => updateStage(stage._key, { offer: event.currentTarget.value })} />
              <input
                style={styles.input}
                value={(stage.metrics || []).join(', ')}
                placeholder="Metrics"
                onChange={(event) =>
                  updateStage(stage._key, {
                    metrics: event.currentTarget.value
                      .split(',')
                      .map((metric) => metric.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </div>
        ))}
        {normalized.length === 0 && <EmptyInline title="No stages yet. Add the path a visitor should move through." />}
      </div>
    </div>
  )
}

function ChannelWorkspace({
  client,
  data,
  savingId,
  createDocument,
  loadData,
  commitPatch,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  loadData: () => Promise<void>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.channels[0]?._id || null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const selected = data.channels.find((channel) => channel._id === selectedId) || null

  useEffect(() => {
    if (!selectedId && data.channels.length > 0) setSelectedId(data.channels[0]._id)
  }, [data.channels, selectedId])

  const createChannel = async () => {
    const createdId = await createDocument({
      _type: 'marketingChannel',
      title: '',
      key: `new-channel-${Date.now()}`,
      status: 'active',
      platform: 'social',
      contentTypes: [],
    })
    setSelectedId(createdId)
  }

  const deleteChannel = async (channel: MarketingChannel) => {
    const usage = getChannelUsage(data, channel)
    const usageText = [
      usage.calendarCount ? `${usage.calendarCount} calendar item${usage.calendarCount === 1 ? '' : 's'}` : '',
      usage.campaignCount ? `${usage.campaignCount} campaign${usage.campaignCount === 1 ? '' : 's'}` : '',
    ]
      .filter(Boolean)
      .join(' and ')

    const message = usage.total > 0
      ? `Delete "${channel.title || channel.key}"? It is currently used by ${usageText}. Calendar items will keep their saved channel key, but the managed channel and its content type options will be removed.`
      : `Delete "${channel.title || channel.key}"?`

    if (!window.confirm(message)) return

    setDeletingId(channel._id)
    try {
      const calendarItemsWithChannelRef = data.calendarItems.filter((item) => item.channelRef?._id === channel._id)
      await Promise.all(
        calendarItemsWithChannelRef.map((item) => client.patch(item._id).unset(['channelRef']).commit()),
      )
      await client.delete(channel._id)
      setSelectedId(data.channels.find((candidate) => candidate._id !== channel._id)?._id || null)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '390px minmax(0, 1fr)', gap: 16 }}>
      <section style={styles.panel}>
        <PanelHeading
          title="Channels"
          description="Manage where calendar content goes and which content types each channel supports."
        />
        <button
          type="button"
          style={{ ...styles.primaryButton, width: '100%', marginBottom: 16 }}
          disabled={savingId === 'new'}
          onClick={() => void createChannel()}
        >
          Add channel
        </button>

        <div style={{ display: 'grid', gap: 8 }}>
          {data.channels.map((channel) => (
            <button
              key={channel._id}
              type="button"
              onClick={() => setSelectedId(channel._id)}
              style={{
                ...styles.card,
                padding: 12,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--card-fg-color)',
                borderColor: channel._id === selectedId ? '#007385' : 'var(--card-border-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <strong>{channel.title || channel.key || 'Untitled channel'}</strong>
                <StatusPill status={channel.status} options={channelStatusOptions} />
              </div>
              <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
                {(channel.contentTypes || []).map((type) => type.label || type.value).filter(Boolean).join(', ') ||
                  'No content types yet'}
              </div>
            </button>
          ))}
          {data.channels.length === 0 && (
            <EmptyInline title="No channels yet. Add one here, then add its content types in the manager." />
          )}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <PanelHeading
            title="Channel manager"
            description="Calendar content type menus are generated from the selected channel's content types."
          />
          <div style={{ ...styles.small, ...styles.muted, textAlign: 'right' }}>
            {data.channels.length} channels available to calendar
          </div>
        </div>
        <ChannelEditor
          channel={selected}
          data={data}
          saving={savingId === selected?._id || deletingId === selected?._id}
          onSave={commitPatch}
          onDelete={deleteChannel}
        />
      </section>
    </div>
  )
}

function ChannelEditor({
  channel,
  data,
  saving,
  onSave,
  onDelete,
}: {
  channel: MarketingChannel | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onDelete: (channel: MarketingChannel) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingChannel | null>(channel)
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [newTypeValue, setNewTypeValue] = useState('')
  const [newTypeDescription, setNewTypeDescription] = useState('')

  useEffect(() => {
    setDraft(channel ? { ...channel, contentTypes: normalizeContentTypes(channel.contentTypes || []) } : null)
    setNewTypeLabel('')
    setNewTypeValue('')
    setNewTypeDescription('')
  }, [channel])

  if (!draft || !channel) {
    return <EmptyPanel icon={TagIcon} title="Select a channel" description="Add a channel, then choose it to edit." />
  }

  const updateContentType = (key: string, patch: Partial<ChannelContentType>) => {
    setDraft({
      ...draft,
      contentTypes: normalizeContentTypes(draft.contentTypes || []).map((type) =>
        type._key === key ? { ...type, ...patch } : type,
      ),
    })
  }

  const addContentType = () => {
    const label = newTypeLabel.trim()
    if (!label) return

    setDraft({
      ...draft,
      contentTypes: [
        ...normalizeContentTypes(draft.contentTypes || []),
        {
          _key: randomKey(),
          _type: 'channelContentType',
          label,
          value: slugify(newTypeValue || label),
          description: newTypeDescription.trim() || undefined,
        },
      ],
    })
    setNewTypeLabel('')
    setNewTypeValue('')
    setNewTypeDescription('')
  }

  const removeContentType = (contentType: ChannelContentType) => {
    const usage = getContentTypeUsage(data, channel, contentType)
    const message = usage > 0
      ? `Remove "${contentType.label || contentType.value}" from "${channel.title || channel.key}"? It is used by ${usage} calendar item${usage === 1 ? '' : 's'}. Existing items will keep the saved content type value, but it will no longer be a managed option.`
      : `Remove "${contentType.label || contentType.value}" from "${channel.title || channel.key}"?`

    if (!window.confirm(message)) return

    setDraft({
      ...draft,
      contentTypes: normalizeContentTypes(draft.contentTypes || []).filter((type) => type._key !== contentType._key),
    })
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const channelSuggestion = suggestion.channel || {}
    setDraft({
      ...draft,
      title: aiString(channelSuggestion.title) || draft.title,
      key: aiString(channelSuggestion.key) || draft.key,
      platform: aiChannelPlatform(channelSuggestion.platform) || draft.platform,
      description: aiString(channelSuggestion.description) || draft.description,
      defaultFunnelStage: aiOption(channelSuggestion.defaultFunnelStage, funnelStageOptions) || draft.defaultFunnelStage,
      contentTypes: aiContentTypes(channelSuggestion.contentTypes) || draft.contentTypes,
    })
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled channel',
      key: slugify(draft.key || draft.title || 'channel'),
      status: draft.status || 'active',
      platform: draft.platform || 'other',
      description: draft.description,
      defaultFunnelStage: draft.defaultFunnelStage,
      contentTypes: normalizeContentTypes(draft.contentTypes || []),
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(channel._id, set, unset)
  }

  const usage = getChannelUsage(data, channel)

  return (
    <Stack gap={12}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Channel setup</h2>
        <button
          type="button"
          style={{
            ...styles.button,
            borderColor: 'rgba(227, 98, 22, 0.6)',
            color: '#e36216',
            alignSelf: 'flex-start',
          }}
          disabled={saving}
          onClick={() => void onDelete(channel)}
        >
          Delete channel
        </button>
      </div>
      {usage.total > 0 && (
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: 'rgba(214, 169, 63, 0.35)' }}>
          <strong style={{ fontSize: 13 }}>Currently in use</strong>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
            {usage.calendarCount} calendar item{usage.calendarCount === 1 ? '' : 's'} and {usage.campaignCount} campaign
            {usage.campaignCount === 1 ? '' : 's'} reference this channel key.
          </div>
        </div>
      )}
      <MarketingAiAssistPanel
        kind="channel"
        draft={draft as unknown as Record<string, unknown>}
        analyticsTakeaways={buildAnalyticsInterpretations(data)}
        onApply={applyAiSuggestion}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 10 }}>
        <InputField label="Channel name">
          <input
            style={styles.input}
            value={draft.title || ''}
            onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
          />
        </InputField>
        <InputField label="Key">
          <input
            style={styles.input}
            value={draft.key || ''}
            onChange={(event) => setDraft({ ...draft, key: event.currentTarget.value })}
          />
        </InputField>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <InputField label="Status">
          <Select
            value={draft.status || 'active'}
            options={channelStatusOptions}
            onChange={(status) => setDraft({ ...draft, status })}
          />
        </InputField>
        <InputField label="Platform">
          <Select
            value={draft.platform || 'other'}
            options={channelPlatformOptions}
            onChange={(platform) => setDraft({ ...draft, platform })}
          />
        </InputField>
        <InputField label="Default funnel stage">
          <Select
            value={draft.defaultFunnelStage || ''}
            options={[{ title: 'None', value: '' }, ...funnelStageOptions]}
            onChange={(defaultFunnelStage) => setDraft({ ...draft, defaultFunnelStage })}
          />
        </InputField>
      </div>
      <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Content types</h3>
        <Stack gap={10}>
          {normalizeContentTypes(draft.contentTypes || []).map((contentType) => {
            const usageCount = getContentTypeUsage(data, channel, contentType)
            return (
              <div
                key={contentType._key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px 1fr auto',
                  gap: 8,
                  alignItems: 'start',
                  border: '1px solid var(--card-border-color)',
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <InputField label="Label">
                  <input
                    style={styles.input}
                    value={contentType.label || ''}
                    onChange={(event) => updateContentType(contentType._key || '', { label: event.currentTarget.value })}
                  />
                </InputField>
                <InputField label="Value">
                  <input
                    style={styles.input}
                    value={contentType.value || ''}
                    onChange={(event) => updateContentType(contentType._key || '', { value: slugify(event.currentTarget.value) })}
                  />
                  {usageCount > 0 && (
                    <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
                      Used by {usageCount} item{usageCount === 1 ? '' : 's'}
                    </div>
                  )}
                </InputField>
                <InputField label="Description">
                  <input
                    style={styles.input}
                    value={contentType.description || ''}
                    onChange={(event) =>
                      updateContentType(contentType._key || '', { description: event.currentTarget.value })
                    }
                  />
                </InputField>
                <button
                  type="button"
                  style={{
                    ...styles.button,
                    borderColor: usageCount > 0 ? 'rgba(227, 98, 22, 0.6)' : 'var(--card-border-color)',
                    color: usageCount > 0 ? '#e36216' : 'var(--card-fg-color)',
                    marginTop: 20,
                  }}
                  onClick={() => removeContentType(contentType)}
                >
                  Delete
                </button>
              </div>
            )
          })}
          {normalizeContentTypes(draft.contentTypes || []).length === 0 && (
            <EmptyInline title="No content types yet. Add each option as its own managed object." />
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 150px 1fr auto',
              gap: 8,
              alignItems: 'end',
              borderTop: '1px solid var(--card-border-color)',
              paddingTop: 12,
            }}
          >
            <InputField label="New label">
              <input
                style={styles.input}
                value={newTypeLabel}
                onChange={(event) => setNewTypeLabel(event.currentTarget.value)}
                placeholder="Carousel"
              />
            </InputField>
            <InputField label="New value">
              <input
                style={styles.input}
                value={newTypeValue}
                onChange={(event) => setNewTypeValue(event.currentTarget.value)}
                placeholder="carousel"
              />
            </InputField>
            <InputField label="Description">
              <input
                style={styles.input}
                value={newTypeDescription}
                onChange={(event) => setNewTypeDescription(event.currentTarget.value)}
              />
            </InputField>
            <button type="button" style={styles.button} disabled={!newTypeLabel.trim()} onClick={addContentType}>
              Add type
            </button>
          </div>
        </Stack>
      </div>
      <InputField label="Description">
        <textarea
          rows={3}
          style={styles.input}
          value={draft.description || ''}
          onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
        />
      </InputField>
      <details style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced fields</summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
            Use the full Sanity document only when this manager does not expose the field you need.
          </p>
          <a href={advancedEditHref('marketingChannel', channel._id)} style={styles.inlineLink}>
            <LaunchIcon style={{ width: 15, height: 15 }} />
            Open full channel document
          </a>
        </div>
      </details>
      <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving...' : 'Save channel'}
      </button>
    </Stack>
  )
}

function LinkTreeWorkspace({
  client,
  data,
  savingId,
  createDocument,
  commitPatch,
}: {
  client: StudioClient
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(data.linkItems[0]?._id || null)
  const selected = data.linkItems.find((item) => item._id === selectedId) || null
  const calendarCandidates = data.calendarItems.filter((item) => {
    const url = item.publishedUrl || item.workingUrl
    if (!url) return false
    return !data.linkItems.some((link) => link.calendarItem?._id === item._id || normalizeUrl(link.url) === normalizeUrl(url))
  })

  useEffect(() => {
    if (!selectedId && data.linkItems.length > 0) setSelectedId(data.linkItems[0]._id)
  }, [data.linkItems, selectedId])

  const createLink = async () => {
    const createdId = await createDocument({
      _type: 'marketingLinkItem',
      title: '',
      status: 'draft',
      type: 'other',
      order: nextLinkOrder(data.linkItems),
    })
    setSelectedId(createdId)
  }

  const addFromCalendarItem = async (item: MarketingCalendarItem) => {
    const url = item.publishedUrl || item.workingUrl
    if (!url) return

    const createdId = await createDocument({
      _type: 'marketingLinkItem',
      title: item.title || 'Untitled calendar link',
      url,
      description: trimDescription(item.brief),
      type: calendarContentTypeToLinkType(item.contentType),
      status: ['published', 'scheduled'].includes(item.status || '') ? 'active' : 'draft',
      sourceChannel: item.channelRef?.key || item.channel || 'instagram',
      order: nextLinkOrder(data.linkItems),
      publishAt: item.publishAt ? dateInputToIso(toDateInputValue(item.publishAt)) : undefined,
      calendarItem: { _type: 'reference', _ref: item._id },
      calendarItems: refsFromIds([item._id]),
      ...(item.campaign?._id ? { campaign: { _type: 'reference', _ref: item.campaign._id } } : {}),
    })
    await commitPatch(item._id, {
      linkItems: refsFromIds(Array.from(new Set([...(item.linkItems || []).map((link) => link._id), createdId]))),
    })
    setSelectedId(createdId)
  }

  const uploadCoverImage = async (file: File) => {
    if (!selected) return
    const asset = await client.assets.upload('image', file, { filename: file.name })
    await commitPatch(selected._id, {
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      },
    })
  }

  const removeCoverImage = async () => {
    if (!selected) return
    await commitPatch(selected._id, {}, ['image'])
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '430px minmax(0, 1fr)', gap: 16 }}>
        <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <PanelHeading
            title="Quick Links"
            description="Manage the public /links page for Instagram, social posts, and launch moments."
          />
          <button
            type="button"
            style={{ ...styles.primaryButton, whiteSpace: 'nowrap' }}
            disabled={savingId === 'new'}
            onClick={() => void createLink()}
          >
            Add link
          </button>
        </div>
        <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: 13 }}>Public page</strong>
            </div>
            <a
              href="/links"
              target="_blank"
              rel="noreferrer"
              aria-label="Open Quick Links page"
              title="/links is ready for the Instagram bio. /ig redirects there too."
              style={{
                ...styles.button,
                width: 48,
                height: 48,
                padding: 0,
                border: 'none',
                background: 'transparent',
                boxShadow: 'none',
                color: '#007385',
              }}
            >
              <LaunchIcon style={{ width: 26, height: 26 }} />
            </a>
          </div>
        </div>
        <LinkItemList
          items={data.linkItems}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <details style={{ ...styles.panel, boxShadow: 'none', padding: 12, marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Create from calendar</summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {calendarCandidates.length === 0 ? (
              <div style={{ ...styles.small, ...styles.muted }}>
                Calendar items with working or published URLs will appear here when they are not already on /links.
              </div>
            ) : (
              calendarCandidates.slice(0, 5).map((item) => (
                <button
                  key={item._id}
                  type="button"
                  style={styles.templateButton}
                  onClick={() => void addFromCalendarItem(item)}
                >
                  <strong style={{ fontSize: 13 }}>{item.title || 'Untitled calendar item'}</strong>
                  <span style={{ ...styles.small, ...styles.muted }}>
                    {[item.channelRef?.title || item.channel, item.publishedUrl ? 'published URL' : 'working URL'].filter(Boolean).join(' / ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </details>
        </section>

        <LinkItemEditor
          item={selected}
          campaigns={data.campaigns}
          calendarItems={data.calendarItems}
          analyticsTakeaways={buildAnalyticsInterpretations(data)}
          saving={savingId === selected?._id}
          onSave={commitPatch}
          onUploadCover={uploadCoverImage}
          onRemoveCover={removeCoverImage}
        />
      </div>
    </div>
  )
}

function LinkItemList({
  items,
  selectedId,
  onSelect,
}: {
  items: MarketingLinkItem[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <EmptyInline title="No managed links yet. Add a link above or create one from a calendar item to control what appears on /links." />
    )
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item) => {
        const imageUrl = getLinkImageUrl(item)
        const active = item._id === selectedId
        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect(item._id)}
            style={{
              ...styles.card,
              padding: 12,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--card-fg-color)',
              borderColor: active ? '#007385' : 'var(--card-border-color)',
              background: active ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
              display: 'grid',
              gridTemplateColumns: '64px minmax(0, 1fr)',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--card-border-color)',
                background: 'rgba(0, 115, 133, 0.08)',
                display: 'grid',
                placeItems: 'center',
                color: '#007385',
                fontWeight: 800,
              }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                item.title?.slice(0, 2).toUpperCase() || 'LI'
              )}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title || 'Untitled link'}
                </strong>
                <StatusPill status={item.status} options={linkItemStatusOptions} />
              </span>
              <span
                style={{
                  ...styles.small,
                  color: '#007385',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 4,
                }}
              >
                {item.url || 'No URL yet'}
              </span>
              {item.description && (
                <span
                  style={{
                    ...styles.small,
                    ...styles.muted,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    marginTop: 4,
                    lineHeight: 1.45,
                  }}
                >
                  {item.description}
                </span>
              )}
              <span style={{ ...styles.small, ...styles.muted, display: 'block', marginTop: 6 }}>
                {[labelFor(linkItemTypeOptions, item.type), item.featured ? 'Featured' : '', item.sourceChannel ? `Promoted from ${item.sourceChannel}` : '']
                  .filter(Boolean)
                  .join(' / ') || 'No metadata yet'}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LinkItemEditor({
  item,
  campaigns,
  calendarItems,
  analyticsTakeaways,
  saving,
  onSave,
  onUploadCover,
  onRemoveCover,
}: {
  item: MarketingLinkItem | null
  campaigns: MarketingCampaign[]
  calendarItems: MarketingCalendarItem[]
  analyticsTakeaways: AnalyticsInterpretation[]
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
  onUploadCover: (file: File) => Promise<void>
  onRemoveCover: () => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingLinkItem | null>(item)
  const [campaignId, setCampaignId] = useState('')
  const [calendarItemId, setCalendarItemId] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    setDraft(item)
    setCampaignId(item?.campaign?._id || '')
    setCalendarItemId(item?.calendarItem?._id || '')
  }, [item])

  if (!draft || !item) {
    return (
      <EmptyPanel
        icon={LinkIcon}
        title="Select a link"
        description="Add or choose a link to manage the public /links page."
      />
    )
  }

  const relationshipRequired = !['site', 'project', 'other'].includes(draft.type || 'other')

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const linkSuggestion = suggestion.linkItem || {}
    setDraft({
      ...draft,
      title: aiString(linkSuggestion.title) || draft.title,
      description: aiString(linkSuggestion.description) || draft.description,
      type: aiOption(linkSuggestion.type, linkItemTypeOptions) || draft.type,
      sourceChannel: aiString(linkSuggestion.sourceChannel) || draft.sourceChannel,
    })
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled link',
      url: draft.url,
      description: draft.description,
      type: draft.type || 'other',
      status: draft.status || 'active',
      featured: !!draft.featured,
      order: Number.isFinite(draft.order) ? draft.order : 100,
      publishAt: draft.publishAt ? dateInputToIso(toDateInputValue(draft.publishAt)) : undefined,
      expiresAt: draft.expiresAt ? dateInputToIso(toDateInputValue(draft.expiresAt)) : undefined,
      sourceChannel: draft.sourceChannel,
    }
    const unset: string[] = []

    if (campaignId) {
      set.campaign = { _type: 'reference', _ref: campaignId }
    } else {
      unset.push('campaign')
    }

    if (calendarItemId) {
      set.calendarItem = { _type: 'reference', _ref: calendarItemId }
      set.calendarItems = refsFromIds(Array.from(new Set([...(item.calendarItems || []).map((calendarItem) => calendarItem._id), calendarItemId])))
    } else {
      unset.push('calendarItem')
    }

    emptyKeys(set).forEach((key) => {
      delete set[key]
      unset.push(key)
    })

    await onSave(item._id, set, unset)
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Link editor" type="marketingLinkItem" id={item._id} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <GuidanceChecklist
            title="Link checklist"
            items={[
              { label: 'Title is clear without Instagram context', done: !!draft.title?.trim() },
              { label: 'URL is set', done: !!draft.url?.trim() },
              { label: 'Short description explains why to click', done: !!draft.description?.trim() },
              {
                label: 'Campaign or calendar item is connected for timed posts, events, or campaign links',
                done: !relationshipRequired || !!campaignId || !!calendarItemId,
              },
            ]}
          />
          <MarketingAiAssistPanel
            kind="linkItem"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={analyticsTakeaways}
            onApply={applyAiSuggestion}
          />
          <InputField label="Title">
            <input
              style={styles.input}
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="URL">
            <input
              style={styles.input}
              value={draft.url || ''}
              onChange={(event) => setDraft({ ...draft, url: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Description">
            <textarea
              rows={4}
              style={styles.input}
              value={draft.description || ''}
              onChange={(event) => setDraft({ ...draft, description: event.currentTarget.value })}
            />
          </InputField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Type">
              <Select
                value={draft.type || 'other'}
                options={linkItemTypeOptions}
                onChange={(type) => setDraft({ ...draft, type })}
              />
            </InputField>
            <InputField label="Promoted from (optional)">
              <input
                style={styles.input}
                value={draft.sourceChannel || ''}
                onChange={(event) => setDraft({ ...draft, sourceChannel: optionalSlug(event.currentTarget.value) })}
                placeholder="instagram"
              />
              <div style={{ ...styles.small, ...styles.muted, marginTop: 5, lineHeight: 1.45 }}>
                Only use this when a link is mainly promoted somewhere specific, like the Instagram bio. Evergreen links can leave it blank.
              </div>
            </InputField>
          </div>
        </Stack>
        <Stack gap={12}>
          <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>Cover image</h3>
            {draft.image?.asset?.url ? (
              <img
                src={draft.image.asset.url}
                alt=""
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--card-border-color)',
                  marginBottom: 10,
                }}
              />
            ) : (
              <div
                style={{
                  border: '1px dashed var(--card-border-color)',
                  borderRadius: 8,
                  aspectRatio: '1 / 1',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--card-muted-fg-color)',
                  marginBottom: 10,
                }}
              >
                No image
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading || saving}
              style={{ ...styles.input, padding: 8 }}
              onChange={(event) => {
                const input = event.currentTarget
                const file = input.files?.[0]
                if (!file) return
                setUploading(true)
                void onUploadCover(file).finally(() => {
                  setUploading(false)
                  input.value = ''
                })
              }}
            />
            {draft.image?.asset?.url && (
              <button
                type="button"
                style={{ ...styles.button, width: '100%', marginTop: 8 }}
                disabled={uploading || saving}
                onClick={() => void onRemoveCover()}
              >
                Remove image
              </button>
            )}
            <div style={{ ...styles.small, ...styles.muted, marginTop: 8 }}>
              {uploading ? 'Uploading image...' : 'Used as the thumbnail on /links.'}
            </div>
          </div>
          <InputField label="Status">
            <Select
              value={draft.status || 'active'}
              options={linkItemStatusOptions}
              onChange={(status) => setDraft({ ...draft, status })}
            />
          </InputField>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={!!draft.featured}
              onChange={(event) => setDraft({ ...draft, featured: event.currentTarget.checked })}
            />
            Featured
          </label>
          <InputField label="Order">
            <input
              type="number"
              style={styles.input}
              value={draft.order ?? 100}
              onChange={(event) => setDraft({ ...draft, order: Number(event.currentTarget.value) })}
            />
          </InputField>
          <InputField label="Show starting">
            <input
              type="date"
              style={styles.input}
              value={toDateInputValue(draft.publishAt)}
              onChange={(event) => setDraft({ ...draft, publishAt: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Hide after">
            <input
              type="date"
              style={styles.input}
              value={toDateInputValue(draft.expiresAt)}
              onChange={(event) => setDraft({ ...draft, expiresAt: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Campaign">
            <Select
              value={campaignId}
              options={[{ title: 'No campaign', value: '' }, ...campaigns.map((campaign) => ({ title: campaign.title || 'Untitled campaign', value: campaign._id }))]}
              onChange={setCampaignId}
            />
          </InputField>
          <InputField label="Calendar item">
            <Select
              value={calendarItemId}
              options={[{ title: 'No calendar item', value: '' }, ...calendarItems.map((calendarItem) => ({ title: calendarItem.title || 'Untitled item', value: calendarItem._id }))]}
              onChange={setCalendarItemId}
            />
          </InputField>
          <AdvancedFieldsDropdown type="marketingLinkItem" id={item._id} />
          <button type="button" style={styles.primaryButton} disabled={saving || !draft.url?.trim()} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save link'}
          </button>
        </Stack>
      </div>
    </section>
  )
}

function AnalyticsWorkspace({
  data,
  savingId,
  createDocument,
  commitPatch,
}: {
  data: MarketingData
  savingId: string | null
  createDocument: (document: MarketingDocumentInput) => Promise<string>
  commitPatch: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(data.analyticsSources[0]?._id || null)
  const vercelSources = data.analyticsSources.filter((source) =>
    source.provider === 'vercelAnalytics' || source.provider === 'vercelSpeedInsights',
  )
  const selectedSource = data.analyticsSources.find((source) => source._id === selectedSourceId) || null
  const campaignLinkedCount = data.campaigns.filter((campaign) => (campaign.analyticsSources || []).length > 0).length
  const funnelLinkedCount = data.funnels.filter((funnel) => (funnel.analyticsSources || []).length > 0).length
  const channelLinkedCount = data.channels.filter((channel) => (channel.analyticsSources || []).length > 0).length
  const connectedSourceCount = data.analyticsSources.filter((source) => source.status === 'connected').length
  const analyticsInterpretations = useMemo(() => buildAnalyticsInterpretations(data), [data])

  useEffect(() => {
    if (!selectedSourceId && data.analyticsSources.length > 0) setSelectedSourceId(data.analyticsSources[0]._id)
  }, [data.analyticsSources, selectedSourceId])

  const createSource = async () => {
    const createdId = await createDocument({
      _type: 'marketingAnalyticsSource',
      title: '',
      provider: 'ga4',
      status: 'planned',
      reportingCadence: 'monthly',
    })
    setSelectedSourceId(createdId)
  }

  const setAnalyticsSourcesForDocument = async (id: string, sourceIds: string[]) => {
    await commitPatch(id, { analyticsSources: refsFromIds(sourceIds) }, sourceIds.length > 0 ? [] : ['analyticsSources'])
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
      <section style={{ display: 'grid', gap: 16 }}>
        <section style={styles.panel}>
          <PanelHeading
            title="Analytics Dashboard"
            description="Connect measurement sources to marketing work once, then reuse those connections across campaigns, funnels, and channels."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            <AnalyticsMetricCard label="Sources" value={`${connectedSourceCount}/${data.analyticsSources.length}`} detail="connected" />
            <AnalyticsMetricCard label="Campaigns" value={`${campaignLinkedCount}/${data.campaigns.length}`} detail="linked to analytics" />
            <AnalyticsMetricCard label="Funnels" value={`${funnelLinkedCount}/${data.funnels.length}`} detail="linked to analytics" />
            <AnalyticsMetricCard label="Channels" value={`${channelLinkedCount}/${data.channels.length}`} detail="linked to analytics" />
          </div>
        </section>

        <AnalyticsInterpretationPanel data={data} interpretations={analyticsInterpretations} />

        <VercelAnalyticsSummary sources={vercelSources} />

        <AnalyticsEditor
          source={selectedSource}
          data={data}
          saving={savingId === selectedSource?._id}
          onSave={commitPatch}
        />

        <AnalyticsConnectionSection
          title="Campaign measurement"
          description="Attach sources to campaigns so success metrics, content, and reporting all point to the same measurement surface."
          emptyTitle="No campaigns yet"
          items={data.campaigns}
          sources={data.analyticsSources}
          savingId={savingId}
          getStatusOptions={() => campaignStatusOptions}
          getMeta={(campaign) =>
            [
              dateRange(campaign.startDate, campaign.endDate) || 'No dates',
              `${getCampaignCalendarCount(data, campaign._id)} calendar item${getCampaignCalendarCount(data, campaign._id) === 1 ? '' : 's'}`,
              `${campaign.funnels?.length || 0} funnel${(campaign.funnels?.length || 0) === 1 ? '' : 's'}`,
            ].join(' / ')
          }
          onChange={setAnalyticsSourcesForDocument}
        />

        <AnalyticsConnectionSection
          title="Funnel measurement"
          description="Attach sources to reusable funnel maps so every connected campaign inherits the same measurement logic."
          emptyTitle="No funnels yet"
          items={data.funnels}
          sources={data.analyticsSources}
          savingId={savingId}
          getStatusOptions={() => funnelStatusOptions}
          getMeta={(funnel) =>
            [
              `${funnel.stages?.length || 0} stage${(funnel.stages?.length || 0) === 1 ? '' : 's'}`,
              `${getFunnelCampaignCount(data, funnel._id)} campaign link${getFunnelCampaignCount(data, funnel._id) === 1 ? '' : 's'}`,
            ].join(' / ')
          }
          onChange={setAnalyticsSourcesForDocument}
        />

        <AnalyticsConnectionSection
          title="Channel measurement"
          description="Attach default analytics sources to channels so new campaigns and content know how each channel is measured."
          emptyTitle="No channels yet"
          items={data.channels}
          sources={data.analyticsSources}
          savingId={savingId}
          getStatusOptions={() => channelStatusOptions}
          getMeta={(channel) =>
            [
              labelFor(channelPlatformOptions, channel.platform),
              `${getChannelUsage(data, channel).calendarCount} calendar item${getChannelUsage(data, channel).calendarCount === 1 ? '' : 's'}`,
              `${getChannelUsage(data, channel).campaignCount} campaign${getChannelUsage(data, channel).campaignCount === 1 ? '' : 's'}`,
            ].filter(Boolean).join(' / ')
          }
          onChange={setAnalyticsSourcesForDocument}
        />
      </section>

      <aside style={{ ...styles.panel, position: 'sticky', top: 16 }}>
        <PanelHeading title="Sources" description="Small setup area for reporting surfaces. Most work happens in the connection dashboard." />
        <button
          type="button"
          style={{ ...styles.primaryButton, width: '100%', marginBottom: 16 }}
          disabled={savingId === 'new'}
          onClick={() => void createSource()}
        >
          Add source
        </button>
        <div style={{ display: 'grid', gap: 8 }}>
          {data.analyticsSources.map((source) => (
            <button
              key={source._id}
              type="button"
              onClick={() => setSelectedSourceId(source._id)}
              style={{
                ...styles.card,
                padding: 10,
                boxShadow: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--card-fg-color)',
                borderColor: source._id === selectedSourceId ? '#007385' : 'var(--card-border-color)',
                background: source._id === selectedSourceId ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 13 }}>{source.title || 'Untitled source'}</strong>
                  <div style={{ ...styles.small, ...styles.muted, marginTop: 3 }}>
                    {labelFor(analyticsProviderOptions, source.provider)}
                  </div>
                </div>
                <StatusPill status={source.status} options={analyticsStatusOptions} />
              </div>
              {source.dashboardUrl && (
                <div style={{ ...styles.small, color: '#007385', marginTop: 8 }}>Dashboard URL set</div>
              )}
            </button>
          ))}
          {data.analyticsSources.length === 0 && <EmptyInline title="No analytics sources yet" />}
        </div>
      </aside>
    </div>
  )
}

function AnalyticsMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{ ...styles.card, padding: 14, boxShadow: 'none' }}>
      <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{value}</div>
      <div style={{ ...styles.small, ...styles.muted, marginTop: 2 }}>{detail}</div>
    </div>
  )
}

function AnalyticsInterpretationPanel({
  data,
  interpretations,
}: {
  data: MarketingData
  interpretations: AnalyticsInterpretation[]
}) {
  const stats = getAnalyticsReadinessStats(data)
  const priorityCount = interpretations.filter((insight) => insight.severity === 'urgent' || insight.severity === 'warning').length

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ maxWidth: 720 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Interpretation and next actions</h2>
          <p style={{ ...styles.muted, margin: '4px 0 0', lineHeight: 1.55 }}>
            A plain-language readout of what the current analytics setup implies, where measurement will break, and what to do next.
          </p>
        </div>
        <div
          style={{
            border: '1px solid rgba(0, 115, 133, 0.35)',
            background: 'rgba(0, 115, 133, 0.08)',
            borderRadius: 8,
            padding: '10px 12px',
            minWidth: 160,
          }}
        >
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Readiness
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#007385', marginTop: 2 }}>{stats.readinessScore}%</div>
          <div style={{ ...styles.small, ...styles.muted }}>
            {stats.measurementTargets > 0
              ? `${stats.connectedMeasurementTargets}/${stats.measurementTargets} work items connected`
              : 'No active work yet'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
        <AnalyticsMetricCard
          label="Priority actions"
          value={`${priorityCount}`}
          detail={priorityCount === 1 ? 'fix first' : 'fix first'}
        />
        <AnalyticsMetricCard
          label="Connected sources"
          value={`${stats.connectedSources}/${stats.activeSources}`}
          detail="available for analysis"
        />
        <AnalyticsMetricCard
          label="Review rhythm"
          value={stats.reviewCadence}
          detail="suggested by sources"
        />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {interpretations.map((insight) => (
          <AnalyticsInterpretationCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  )
}

function AnalyticsInterpretationCard({ insight }: { insight: AnalyticsInterpretation }) {
  const tone = getAnalyticsInterpretationTone(insight.severity)

  return (
    <article
      style={{
        ...styles.card,
        boxShadow: 'none',
        padding: 14,
        borderColor: tone.border,
        background: tone.bg,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${tone.border}`,
              background: 'var(--card-bg-color)',
              color: tone.fg,
              borderRadius: 999,
              padding: '3px 8px',
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            {tone.label}
          </div>
          <h3 style={{ margin: 0, fontSize: 17 }}>{insight.title}</h3>
        </div>
        {insight.affected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 380 }}>
            {insight.affected.map((title) => (
              <span
                key={title}
                style={{
                  ...styles.small,
                  border: '1px solid var(--card-border-color)',
                  borderRadius: 999,
                  padding: '3px 8px',
                  background: 'var(--card-bg-color)',
                  color: 'var(--card-muted-fg-color)',
                  fontWeight: 700,
                }}
              >
                {title}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12, marginTop: 10 }}>
        <div>
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, marginBottom: 4 }}>What this means</div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{insight.interpretation}</p>
        </div>
        <div>
          <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, marginBottom: 4 }}>Do next</div>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{insight.action}</p>
        </div>
      </div>
    </article>
  )
}

function getAnalyticsInterpretationTone(severity: AnalyticsInterpretationSeverity) {
  if (severity === 'urgent') {
    return {
      label: 'Fix first',
      bg: 'rgba(227, 98, 22, 0.10)',
      fg: '#E36216',
      border: 'rgba(227, 98, 22, 0.42)',
    }
  }
  if (severity === 'warning') {
    return {
      label: 'Watch',
      bg: 'rgba(124, 101, 39, 0.12)',
      fg: '#d6a93f',
      border: 'rgba(214, 169, 63, 0.35)',
    }
  }
  if (severity === 'healthy') {
    return {
      label: 'Ready',
      bg: 'rgba(54, 139, 87, 0.10)',
      fg: '#368b57',
      border: 'rgba(54, 139, 87, 0.34)',
    }
  }
  return {
    label: 'Improve',
    bg: 'rgba(0, 115, 133, 0.08)',
    fg: '#007385',
    border: 'rgba(0, 115, 133, 0.30)',
  }
}

function serializeAnalyticsTakeawaysForAi(takeaways: AnalyticsInterpretation[]) {
  return takeaways.slice(0, 8).map((takeaway) => ({
    severity: takeaway.severity,
    title: takeaway.title,
    interpretation: takeaway.interpretation,
    action: takeaway.action,
    affected: takeaway.affected.slice(0, 5),
  }))
}

function AnalyticsConnectionSection<T extends { _id: string; title?: string; status?: string; analyticsSources?: RefSummary[] }>({
  title,
  description,
  emptyTitle,
  items,
  sources,
  savingId,
  getStatusOptions,
  getMeta,
  onChange,
}: {
  title: string
  description: string
  emptyTitle: string
  items: T[]
  sources: MarketingAnalyticsSource[]
  savingId: string | null
  getStatusOptions: (item: T) => SelectOption[]
  getMeta: (item: T) => string
  onChange: (id: string, sourceIds: string[]) => Promise<void>
}) {
  const connected = items.filter((item) => (item.analyticsSources || []).length > 0).length

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          <p style={{ ...styles.muted, margin: '4px 0 0', lineHeight: 1.5 }}>{description}</p>
        </div>
        <div style={{ ...styles.small, ...styles.muted, textAlign: 'right', minWidth: 100 }}>
          <strong style={{ color: 'var(--card-fg-color)', fontSize: 18 }}>{connected}/{items.length}</strong>
          <div>connected</div>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyInline title={emptyTitle} />
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <AnalyticsConnectionRow
              key={item._id}
              item={item}
              sources={sources}
              saving={savingId === item._id}
              statusOptions={getStatusOptions(item)}
              meta={getMeta(item)}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function AnalyticsConnectionRow<T extends { _id: string; title?: string; status?: string; analyticsSources?: RefSummary[] }>({
  item,
  sources,
  saving,
  statusOptions,
  meta,
  onChange,
}: {
  item: T
  sources: MarketingAnalyticsSource[]
  saving: boolean
  statusOptions: SelectOption[]
  meta: string
  onChange: (id: string, sourceIds: string[]) => Promise<void>
}) {
  const selectedIds = (item.analyticsSources || []).map((source) => source._id)
  const availableSources = sources.filter((source) => !selectedIds.includes(source._id))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1fr) minmax(260px, 1.3fr) 220px',
        gap: 12,
        alignItems: 'center',
        border: '1px solid var(--card-border-color)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>{item.title || 'Untitled'}</strong>
          <StatusPill status={item.status} options={statusOptions} />
        </div>
        <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>{meta}</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(item.analyticsSources || []).length === 0 && (
          <span style={{ ...styles.small, ...styles.muted }}>No analytics connected</span>
        )}
        {(item.analyticsSources || []).map((source) => (
          <button
            key={source._id}
            type="button"
            title={`Remove ${source.title || 'analytics source'}`}
            disabled={saving}
            onClick={() => void onChange(item._id, selectedIds.filter((id) => id !== source._id))}
            style={{
              border: '1px solid rgba(0, 115, 133, 0.35)',
              background: 'rgba(0, 115, 133, 0.08)',
              color: 'var(--card-fg-color)',
              borderRadius: 999,
              padding: '5px 8px',
              cursor: saving ? 'default' : 'pointer',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {source.title || 'Untitled source'}
            <CloseIcon style={{ width: 12, height: 12 }} />
          </button>
        ))}
      </div>
      <Select
        value=""
        options={[
          { title: sources.length === 0 ? 'Add analytics source first' : 'Connect source...', value: '' },
          ...availableSources.map((source) => ({
            title: `${source.title || 'Untitled source'} (${labelFor(analyticsProviderOptions, source.provider)})`,
            value: source._id,
          })),
        ]}
        disabled={saving || availableSources.length === 0}
        onChange={(sourceId) => {
          if (!sourceId) return
          void onChange(item._id, [...selectedIds, sourceId])
        }}
      />
    </div>
  )
}

function VercelAnalyticsSummary({ sources }: { sources: MarketingAnalyticsSource[] }) {
  if (sources.length === 0) return null

  const project = sources.find((source) => source.vercelProject)?.vercelProject || 'Vercel project'
  const productionUrl = sources.find((source) => source.productionUrl)?.productionUrl
  const team = sources.find((source) => source.vercelTeamSlug)?.vercelTeamSlug

  return (
    <section style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Vercel connection</h3>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
            {[project, team ? `Team ${team}` : '', productionUrl].filter(Boolean).join(' / ')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, flex: '1 1 520px' }}>
          {sources.map((source) => (
            <div key={source._id} style={{ ...styles.card, padding: 12, boxShadow: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <strong>{labelFor(analyticsProviderOptions, source.provider)}</strong>
                  <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>
                    Synced {formatDateTime(source.lastSyncedAt) || 'from Vercel CLI'}
                  </div>
                </div>
                <StatusPill status={source.status} options={analyticsStatusOptions} />
              </div>
              {source.dashboardUrl && (
                <a
                  href={source.dashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`Open ${labelFor(analyticsProviderOptions, source.provider)} dashboard`}
                  style={{ ...styles.button, marginTop: 10 }}
                >
                  <LaunchIcon style={{ width: 15, height: 15 }} />
                  Dashboard
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AnalyticsEditor({
  source,
  data,
  saving,
  onSave,
}: {
  source: MarketingAnalyticsSource | null
  data: MarketingData
  saving: boolean
  onSave: (id: string, set: Record<string, unknown>, unset?: string[]) => Promise<void>
}) {
  const [draft, setDraft] = useState<MarketingAnalyticsSource | null>(source)

  useEffect(() => setDraft(source), [source])

  if (!draft || !source) {
    return (
      <EmptyPanel
        icon={TrendUpwardIcon}
        title="Select an analytics source"
        description="Choose or create a source to manage its setup."
      />
    )
  }

  const save = async () => {
    const set: Record<string, unknown> = {
      title: draft.title || 'Untitled analytics source',
      provider: draft.provider || 'ga4',
      status: draft.status || 'planned',
      propertyId: draft.propertyId,
      measurementId: draft.measurementId,
      containerId: draft.containerId,
      vercelProject: draft.vercelProject,
      dashboardUrl: draft.dashboardUrl,
      reportingCadence: draft.reportingCadence,
      implementationNotes: draft.implementationNotes,
      keyMetrics: aiKeyMetrics(draft.keyMetrics),
    }
    const unset = emptyKeys(set)
    unset.forEach((key) => delete set[key])
    await onSave(source._id, set, unset)
  }

  const applyAiSuggestion = (suggestion: MarketingAiSuggestion) => {
    const analyticsSuggestion = suggestion.analyticsSource || {}
    setDraft({
      ...draft,
      title: aiString(analyticsSuggestion.title) || draft.title,
      provider: aiOption(analyticsSuggestion.provider, analyticsProviderOptions) || draft.provider,
      reportingCadence:
        aiOption(analyticsSuggestion.reportingCadence, [
          { value: 'daily' },
          { value: 'weekly' },
          { value: 'monthly' },
          { value: 'quarterly' },
          { value: 'asNeeded' },
        ]) || draft.reportingCadence,
      implementationNotes: aiString(analyticsSuggestion.implementationNotes) || draft.implementationNotes,
      keyMetrics: aiKeyMetrics(analyticsSuggestion.keyMetrics) || draft.keyMetrics,
    })
  }

  return (
    <section style={styles.panel}>
      <PanelTitle title="Analytics setup" type="marketingAnalyticsSource" id={source._id} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18 }}>
        <Stack gap={12}>
          <MarketingAiAssistPanel
            kind="analyticsSource"
            draft={draft as unknown as Record<string, unknown>}
            analyticsTakeaways={buildAnalyticsInterpretations(data)}
            onApply={applyAiSuggestion}
          />
          <InputField label="Source name">
            <input
              style={styles.input}
              value={draft.title || ''}
              onChange={(event) => setDraft({ ...draft, title: event.currentTarget.value })}
            />
          </InputField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <InputField label="Provider">
              <Select
                value={draft.provider || 'ga4'}
                options={analyticsProviderOptions}
                onChange={(provider) => setDraft({ ...draft, provider })}
              />
            </InputField>
            <InputField label="Status">
              <Select
                value={draft.status || 'planned'}
                options={analyticsStatusOptions}
                onChange={(status) => setDraft({ ...draft, status })}
              />
            </InputField>
          </div>
          {draft.provider === 'ga4' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <InputField label="GA4 Property ID">
                <input
                  style={styles.input}
                  value={draft.propertyId || ''}
                  onChange={(event) => setDraft({ ...draft, propertyId: event.currentTarget.value })}
                />
              </InputField>
              <InputField label="Measurement ID">
                <input
                  style={styles.input}
                  value={draft.measurementId || ''}
                  onChange={(event) => setDraft({ ...draft, measurementId: event.currentTarget.value })}
                />
              </InputField>
            </div>
          )}
          {draft.provider === 'gtm' && (
            <InputField label="GTM Container ID">
              <input
                style={styles.input}
                value={draft.containerId || ''}
                onChange={(event) => setDraft({ ...draft, containerId: event.currentTarget.value })}
              />
            </InputField>
          )}
          {(draft.provider === 'vercelAnalytics' || draft.provider === 'vercelSpeedInsights') && (
            <Stack gap={10}>
              <InputField label="Vercel project">
                <input
                  style={styles.input}
                  value={draft.vercelProject || ''}
                  onChange={(event) => setDraft({ ...draft, vercelProject: event.currentTarget.value })}
                />
              </InputField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InputField label="Project ID">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={draft.vercelProjectId || ''} readOnly />
                </InputField>
                <InputField label="Team">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={draft.vercelTeamSlug || ''} readOnly />
                </InputField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InputField label="Production URL">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={draft.productionUrl || ''} readOnly />
                </InputField>
                <InputField label="Last synced">
                  <input style={{ ...styles.input, color: 'var(--card-muted-fg-color)' }} value={formatDateTime(draft.lastSyncedAt)} readOnly />
                </InputField>
              </div>
            </Stack>
          )}
          <InputField label="Dashboard URL">
            <input
              style={styles.input}
              value={draft.dashboardUrl || ''}
              onChange={(event) => setDraft({ ...draft, dashboardUrl: event.currentTarget.value })}
            />
          </InputField>
          <InputField label="Implementation notes">
            <textarea
              rows={5}
              style={styles.input}
              value={draft.implementationNotes || ''}
              onChange={(event) => setDraft({ ...draft, implementationNotes: event.currentTarget.value })}
            />
          </InputField>
        </Stack>

        <Stack gap={12}>
          <InputField label="Reporting cadence">
            <Select
              value={draft.reportingCadence || 'monthly'}
              options={[
                { title: 'Daily', value: 'daily' },
                { title: 'Weekly', value: 'weekly' },
                { title: 'Monthly', value: 'monthly' },
                { title: 'Quarterly', value: 'quarterly' },
                { title: 'As needed', value: 'asNeeded' },
              ]}
              onChange={(reportingCadence) => setDraft({ ...draft, reportingCadence })}
            />
          </InputField>
          <MetricSummary metrics={draft.keyMetrics || []} title="Key metrics" />
          {draft.dashboardUrl && (
            <a href={draft.dashboardUrl} target="_blank" rel="noreferrer" style={{ ...styles.button, width: '100%' }}>
              <LaunchIcon style={{ width: 15, height: 15 }} />
              Open dashboard
            </a>
          )}
          <RelationshipUsagePanel
            title="Campaigns using this source"
            items={data.campaigns.filter((campaign) =>
              (campaign.analyticsSources || []).some((ref) => ref._id === source._id) ||
              (campaign.successMetrics || []).some((metric) => 'source' in metric && (metric as { source?: RefSummary }).source?._id === source._id),
            )}
            emptyText="No campaigns are linked to this analytics source yet."
            renderMeta={(campaign) =>
              [
                labelFor(campaignStatusOptions, campaign.status),
                dateRange(campaign.startDate, campaign.endDate),
              ].filter(Boolean).join(' / ')
            }
          />
          <RelationshipUsagePanel
            title="Funnels using this source"
            items={data.funnels.filter((funnel) => (funnel.analyticsSources || []).some((ref) => ref._id === source._id))}
            emptyText="No funnels are linked to this analytics source yet."
            renderMeta={(funnel) => [labelFor(funnelStatusOptions, funnel.status), `${funnel.stages?.length || 0} stages`].join(' / ')}
          />
          <RelationshipUsagePanel
            title="Calendar items using this source"
            items={data.calendarItems.filter((item) => item.analyticsSource?._id === source._id)}
            emptyText="No calendar items are linked to this analytics source yet."
            renderMeta={(item) =>
              [
                toDateInputValue(item.publishAt),
                item.campaign?.title,
                item.funnel?.title,
              ].filter(Boolean).join(' / ')
            }
          />
          <AdvancedFieldsDropdown type="marketingAnalyticsSource" id={source._id} />
          <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving...' : 'Save analytics source'}
          </button>
        </Stack>
      </div>
    </section>
  )
}

function DocumentList<T extends { _id: string; title?: string; status?: string }>({
  items,
  selectedId,
  emptyTitle,
  renderMeta,
  onSelect,
}: {
  items: T[]
  selectedId: string | null
  emptyTitle: string
  renderMeta: (item: T) => string
  onSelect: (id: string) => void
}) {
  if (items.length === 0) return <EmptyInline title={emptyTitle} />

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((item) => (
        <button
          key={item._id}
          type="button"
          onClick={() => onSelect(item._id)}
          style={{
            ...styles.card,
            padding: 12,
            textAlign: 'left',
            cursor: 'pointer',
            color: 'var(--card-fg-color)',
            borderColor: item._id === selectedId ? '#007385' : 'var(--card-border-color)',
            background: item._id === selectedId ? 'rgba(0, 115, 133, 0.08)' : 'var(--card-bg-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <strong>{item.title || 'Untitled'}</strong>
            <StatusPill status={item.status} />
          </div>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>{renderMeta(item) || 'No details yet'}</div>
        </button>
      ))}
    </div>
  )
}

function FunnelTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onClick()
      }}
      style={{
        border: '1px solid var(--card-border-color)',
        borderBottomColor: active ? 'var(--card-bg-color)' : 'var(--card-border-color)',
        background: active ? 'var(--card-bg-color)' : 'rgba(128, 128, 128, 0.08)',
        color: 'var(--card-fg-color)',
        borderRadius: '8px 8px 0 0',
        padding: '9px 12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: active ? 800 : 700,
        cursor: 'pointer',
        marginBottom: -1,
      }}
    >
      {children}
    </div>
  )
}

function TemplateRail<T extends { id: string; title: string; description: string }>({
  title,
  description,
  templates,
  onApply,
}: {
  title: string
  description: string
  templates: T[]
  onApply: (template: T) => void
}) {
  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{title}</h3>
      <p style={{ ...styles.small, ...styles.muted, margin: '0 0 10px' }}>{description}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {templates.map((template) => (
          <button key={template.id} type="button" style={styles.templateButton} onClick={() => onApply(template)}>
            <strong style={{ fontSize: 13 }}>{template.title}</strong>
            <span style={{ ...styles.small, ...styles.muted }}>{template.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function GuidanceChecklist({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; done: boolean }>
}) {
  const done = items.filter((item) => item.done).length

  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: done === items.length ? 'rgba(54, 139, 87, 0.35)' : 'var(--card-border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        <span style={{ ...styles.small, ...styles.muted }}>{done}/{items.length}</span>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 1,
                border: `1px solid ${item.done ? '#368b57' : 'var(--card-border-color)'}`,
                background: item.done ? '#368b57' : 'transparent',
                color: item.done ? '#368b57' : 'var(--card-muted-fg-color)',
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              {item.done ? '' : ''}
            </span>
            <span style={item.done ? styles.muted : undefined}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RelationshipChecklist<T extends { _id: string; title?: string }>({
  title,
  items,
  selectedIds,
  getSubtitle,
  onChange,
}: {
  title: string
  items: T[]
  selectedIds: string[]
  getSubtitle?: (item: T) => string
  onChange: (ids: string[]) => void
}) {
  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{title}</h3>
      {items.length === 0 ? (
        <div style={{ ...styles.small, ...styles.muted }}>Nothing to connect yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item) => {
            const checked = selectedIds.includes(item._id)
            return (
              <label key={item._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    const nextIds = event.currentTarget.checked
                      ? [...selectedIds, item._id]
                      : selectedIds.filter((id) => id !== item._id)
                    onChange(Array.from(new Set(nextIds)))
                  }}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <strong>{item.title || 'Untitled'}</strong>
                  {getSubtitle && <span style={{ ...styles.small, ...styles.muted, display: 'block' }}>{getSubtitle(item)}</span>}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RelationshipUsagePanel<T extends { _id: string; title?: string }>({
  title,
  items,
  emptyText,
  renderMeta,
}: {
  title: string
  items: T[]
  emptyText: string
  renderMeta: (item: T) => string
}) {
  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{title}</h3>
      {items.length === 0 ? (
        <div style={{ ...styles.small, ...styles.muted }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.slice(0, 6).map((item) => (
            <div key={item._id} style={{ borderBottom: '1px solid var(--card-border-color)', paddingBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>{item.title || 'Untitled'}</strong>
              <div style={{ ...styles.small, ...styles.muted }}>{renderMeta(item)}</div>
            </div>
          ))}
          {items.length > 6 && <div style={{ ...styles.small, ...styles.muted }}>+{items.length - 6} more</div>}
        </div>
      )}
    </div>
  )
}

function PanelTitle({ title, type, id }: { title: string; type: string; id: string }) {
  void type
  void id
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
    </div>
  )
}

function AdvancedFieldsDropdown({ type, id }: { type: string; id: string }) {
  return (
    <details style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced fields</summary>
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
          Use the full Sanity document only when this workflow form does not expose the field you need.
        </p>
        <a href={advancedEditHref(type, id)} style={styles.inlineLink}>
          <LaunchIcon style={{ width: 15, height: 15 }} />
          Open full document
        </a>
      </div>
    </details>
  )
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      <p style={{ ...styles.muted, margin: '4px 0 0', lineHeight: 1.55 }}>{description}</p>
    </div>
  )
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof DashboardIcon
  title: string
  description: string
}) {
  return (
    <section
      style={{
        ...styles.panel,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 260,
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 8, width: '100%', maxWidth: 520 }}>
        <Icon style={{ display: 'block', width: 34, height: 34, color: 'var(--card-muted-fg-color)' }} />
        <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>{title}</h2>
        <p style={{ ...styles.muted, margin: 0 }}>{description}</p>
      </div>
    </section>
  )
}

function EmptyInline({ title }: { title: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--card-border-color)',
        borderRadius: 8,
        padding: 18,
        color: 'var(--card-muted-fg-color)',
        textAlign: 'center',
      }}
    >
      {title}
    </div>
  )
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  )
}

function Select({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <select
      style={{
        ...styles.input,
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg width=\'14\' height=\'14\' viewBox=\'0 0 14 14\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M3.5 5.25L7 8.75L10.5 5.25\' stroke=\'%23BAC4D8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 16px center',
        backgroundSize: '14px 14px',
        paddingRight: 46,
      }}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {options.map((option) => (
        <option key={`${option.value}-${option.title}`} value={option.value}>
          {option.title}
        </option>
      ))}
    </select>
  )
}

function Stack({ children, gap }: { children: React.ReactNode; gap: number }) {
  return <div style={{ display: 'grid', gap, minWidth: 0 }}>{children}</div>
}

function StatusPill({ status, options }: { status?: string; options?: SelectOption[] }) {
  const colors = getStatusColor(status)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        padding: '3px 8px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.fg,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {labelFor(
        options || [
          ...calendarStatusOptions,
          ...campaignStatusOptions,
          ...funnelStatusOptions,
          ...channelStatusOptions,
          ...analyticsStatusOptions,
        ],
        status,
      ) || 'No status'}
    </span>
  )
}

function MetricSummary({
  metrics,
  title = 'Success metrics',
}: {
  metrics: Array<{ label?: string; target?: string; definition?: string }>
  title?: string
}) {
  return (
    <div style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{title}</h3>
      {metrics.length === 0 ? (
        <div style={{ ...styles.small, ...styles.muted }}>Add detailed metrics in advanced fields.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {metrics.map((metric, index) => (
            <div key={`${metric.label || 'metric'}-${index}`} style={{ ...styles.small }}>
              <strong>{metric.label || 'Metric'}</strong>
              {metric.target || metric.definition ? (
                <div style={styles.muted}>{metric.target || metric.definition}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getAiSuggestionSection(suggestion: MarketingAiSuggestion, kind: MarketingAssistKind) {
  if (kind === 'campaign') return suggestion.campaign
  if (kind === 'funnel') return suggestion.funnel
  if (kind === 'calendarItem') return suggestion.calendarItem
  if (kind === 'channel') return suggestion.channel
  if (kind === 'analyticsSource') return suggestion.analyticsSource
  if (kind === 'template') return suggestion.template
  if (kind === 'researchProject') return suggestion.researchProject
  if (kind === 'researchSynthesis') return suggestion.researchSynthesis
  if (kind === 'researchPlan') return suggestion.researchPlan
  if (kind === 'strategyAsset') return suggestion.strategyAsset
  return suggestion.linkItem
}

function getAiSuggestedFieldLabels(section: unknown) {
  if (!section || typeof section !== 'object') return []
  return Object.entries(section)
    .filter(([, value]) => hasAiSuggestionValue(value))
    .map(([key]) => labelizeAiField(key))
}

function hasAiSuggestionValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => hasAiSuggestionValue(item))
  if (value && typeof value === 'object') return Object.values(value).some((item) => hasAiSuggestionValue(item))
  if (typeof value === 'string') return value.trim().length > 0
  return value !== null && value !== undefined
}

function labelizeAiField(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\bcta\b/gi, 'CTA')
    .replace(/\butm\b/gi, 'UTM')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function aiString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function aiOption(value: unknown, options: Array<{ value: string }>) {
  const candidate = aiString(value)
  return candidate && options.some((option) => option.value === candidate) ? candidate : undefined
}

function aiChannelPlatform(value: unknown) {
  const candidate = aiString(value)?.toLowerCase()
  if (candidate === 'instagram' || candidate === 'linkedin' || candidate === 'socialmedia') return 'social'
  return aiOption(value, channelPlatformOptions)
}

function aiStringList(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const strings = Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)))
  return strings.length > 0 ? strings : undefined
}

function aiRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    : []
}

function aiFunnelStages(value: unknown) {
  const stages = aiRecords(value)
    .map((stage): FunnelStage => ({
      _key: aiString(stage._key) || randomKey(),
      _type: 'funnelStage',
      stage: aiOption(stage.stage, funnelStageOptions) || 'awareness',
      goal: aiString(stage.goal),
      offer: aiString(stage.offer),
      callToAction: aiString(stage.callToAction),
      destinationUrl: aiString(stage.destinationUrl),
      metrics: aiStringList(stage.metrics),
    }))
    .filter((stage) => stage.goal || stage.callToAction || stage.offer)
  return stages.length > 0 ? stages : undefined
}

function aiContentTypes(value: unknown) {
  const contentTypes = aiRecords(value)
    .map((contentType): ChannelContentType => {
      const label = aiString(contentType.label) || aiString(contentType.value) || 'Content type'
      return {
        _key: aiString(contentType._key) || randomKey(),
        _type: 'channelContentType',
        label,
        value: slugify(aiString(contentType.value) || label),
        description: aiString(contentType.description),
      }
    })
    .filter((contentType) => contentType.label || contentType.value)
  return contentTypes.length > 0 ? normalizeContentTypes(contentTypes) : undefined
}

function aiKeyMetrics(value: unknown) {
  const metrics: Array<{ _key: string; _type: 'keyMetric'; label: string; definition?: string }> = []
  aiRecords(value).forEach((metric) => {
    const label = aiString(metric.label)
    if (!label) return
    metrics.push({
      _key: aiString(metric._key) || randomKey(),
      _type: 'keyMetric',
      label,
      definition: aiString(metric.definition),
    })
  })
  return metrics.length > 0 ? metrics : undefined
}

function aiTemplateSuccessMetrics(value: unknown) {
  const metrics: Array<{ _key: string; label: string; target?: string }> = []
  aiRecords(value).forEach((metric) => {
    const label = aiString(metric.label)
    if (!label) return
    metrics.push({
      _key: aiString(metric._key) || randomKey(),
      label,
      target: aiString(metric.target),
    })
  })
  return metrics.length > 0 ? metrics : undefined
}

function getStatusColor(status?: string) {
  return statusColors[status || ''] || {
    bg: 'rgba(128, 128, 128, 0.12)',
    fg: 'var(--card-muted-fg-color)',
    border: 'var(--card-border-color)',
  }
}

function getLinkImageUrl(item: MarketingLinkItem) {
  return item.image?.asset?.url || ''
}

function getPostLinkedLinks(item: MarketingCalendarItem, linkItems: MarketingLinkItem[]) {
  const explicitLinks = item.linkItems || []
  const linkedByReference = linkItems.filter(
    (link) =>
      link.calendarItem?._id === item._id ||
      (link.calendarItems || []).some((calendarItem) => calendarItem._id === item._id),
  )
  return uniqueById([...explicitLinks, ...linkedByReference])
}

function isCalendarItemPublishReady(item: MarketingCalendarItem) {
  if (!['scheduled', 'published'].includes(item.status || '')) return false
  if (!item.publishAt) return true
  return new Date(item.publishAt).getTime() <= Date.now()
}

export function buildAnalyticsInterpretations(data: MarketingData): AnalyticsInterpretation[] {
  const insights: AnalyticsInterpretation[] = []
  const activeSources = data.analyticsSources.filter((source) => source.status !== 'disabled')
  const connectedSources = activeSources.filter(isConnectedAnalyticsSource)
  const activeCampaigns = data.campaigns.filter(isCampaignMeasurable)
  const activeFunnels = data.funnels.filter(isFunnelMeasurable)
  const activeChannels = data.channels.filter((channel) => channel.status !== 'archived')
  const measurableCalendarItems = data.calendarItems.filter(isCalendarItemMeasurable)
  const activeLinks = data.linkItems.filter(isMarketingLinkActive)

  if (activeSources.length === 0) {
    insights.push({
      id: 'no-analytics-source',
      severity: 'urgent',
      title: 'No analytics source is available yet',
      interpretation: 'The marketing system can plan work, but it has nowhere reliable to look when a designer asks whether that work helped.',
      action: 'Add one source for the main site first, then connect it to active campaigns, funnels, and channels.',
      affected: [],
    })
  } else if (connectedSources.length === 0) {
    insights.push({
      id: 'no-connected-analytics-source',
      severity: 'urgent',
      title: 'Analytics sources exist, but none are connected',
      interpretation: 'Every source is still planned or needs review, so dashboards and campaign readouts should be treated as setup placeholders.',
      action: 'Finish one source connection and mark it connected before relying on campaign or channel analysis.',
      affected: titleList(activeSources, (source) => source.title || labelFor(analyticsProviderOptions, source.provider), 4),
    })
  }

  const campaignsMissingMeasurement = activeCampaigns.filter((campaign) => !campaignHasAnalytics(campaign))
  if (campaignsMissingMeasurement.length > 0) {
    insights.push({
      id: 'campaign-measurement-gap',
      severity: 'warning',
      title: `${campaignsMissingMeasurement.length} active campaign${campaignsMissingMeasurement.length === 1 ? '' : 's'} lack measurement`,
      interpretation: 'These campaigns can publish content, but their results will be hard to compare against goals because no analytics source is attached.',
      action: 'Attach a connected source in Campaign measurement, then make sure each campaign has one primary KPI.',
      affected: titleList(campaignsMissingMeasurement, (campaign) => campaign.title || 'Untitled campaign', 5),
    })
  }

  const campaignsMissingPlan = activeCampaigns.filter(
    (campaign) => !campaign.primaryKpi?.trim() || !campaign.utmCampaign?.trim() || !campaign.campaignObjective?.trim(),
  )
  if (campaignsMissingPlan.length > 0) {
    insights.push({
      id: 'campaign-plan-gap',
      severity: 'warning',
      title: `${campaignsMissingPlan.length} campaign${campaignsMissingPlan.length === 1 ? '' : 's'} need a success definition`,
      interpretation: 'Analytics can only answer useful questions when the campaign names its objective, UTM campaign, and main KPI.',
      action: 'Fill the campaign objective, UTM campaign, and primary KPI before scheduling more content for these campaigns.',
      affected: titleList(campaignsMissingPlan, (campaign) => campaign.title || 'Untitled campaign', 5),
    })
  }

  const calendarMissingMeasurement = measurableCalendarItems.filter((item) => !item.analyticsSource?._id)
  if (calendarMissingMeasurement.length > 0) {
    insights.push({
      id: 'calendar-measurement-gap',
      severity: 'warning',
      title: `${calendarMissingMeasurement.length} near-publish item${calendarMissingMeasurement.length === 1 ? '' : 's'} are not measurable`,
      interpretation: 'These calendar items look close enough to publish that they should already point at the analytics source that will verify them later.',
      action: 'Attach an analytics source to each scheduled, reviewed, or published item that has a URL or UTM campaign.',
      affected: titleList(calendarMissingMeasurement, (item) => item.title || 'Untitled calendar item', 5),
    })
  }

  const funnelsMissingMeasurement = activeFunnels.filter((funnel) => !hasAnalyticsRefs(funnel.analyticsSources))
  if (funnelsMissingMeasurement.length > 0) {
    insights.push({
      id: 'funnel-measurement-gap',
      severity: 'opportunity',
      title: `${funnelsMissingMeasurement.length} funnel${funnelsMissingMeasurement.length === 1 ? '' : 's'} need measurement defaults`,
      interpretation: 'Funnels describe intent, but without a shared analytics source each campaign has to reinvent how stage performance is checked.',
      action: 'Connect a source to reusable funnels so campaigns inherit the same measurement surface.',
      affected: titleList(funnelsMissingMeasurement, (funnel) => funnel.title || 'Untitled funnel', 5),
    })
  }

  const funnelsMissingStageMetrics = activeFunnels.filter(
    (funnel) => (funnel.stages || []).length > 0 && !(funnel.stages || []).some((stage) => (stage.metrics || []).some((metric) => metric.trim())),
  )
  if (funnelsMissingStageMetrics.length > 0) {
    insights.push({
      id: 'funnel-stage-metric-gap',
      severity: 'opportunity',
      title: `${funnelsMissingStageMetrics.length} funnel${funnelsMissingStageMetrics.length === 1 ? '' : 's'} lack stage metrics`,
      interpretation: 'Designers can make assets for each stage, but the team will not know which stage is working unless the stage names what to watch.',
      action: 'Add one plain-language metric to each funnel stage, such as visits, link clicks, form starts, replies, or qualified conversations.',
      affected: titleList(funnelsMissingStageMetrics, (funnel) => funnel.title || 'Untitled funnel', 5),
    })
  }

  const channelsMissingMeasurement = activeChannels.filter((channel) => !hasAnalyticsRefs(channel.analyticsSources))
  if (channelsMissingMeasurement.length > 0) {
    insights.push({
      id: 'channel-measurement-gap',
      severity: 'opportunity',
      title: `${channelsMissingMeasurement.length} channel${channelsMissingMeasurement.length === 1 ? '' : 's'} need analytics defaults`,
      interpretation: 'Channel defaults help new posts inherit measurement instead of forcing designers to remember setup details every time.',
      action: 'Attach the most relevant connected analytics source to active channels like website, email, LinkedIn, and Instagram.',
      affected: titleList(channelsMissingMeasurement, (channel) => channel.title || channel.key || 'Untitled channel', 5),
    })
  }

  const linksMissingContext = activeLinks.filter((link) => !link.campaign?._id && !link.calendarItem?._id && (link.calendarItems || []).length === 0)
  if (linksMissingContext.length > 0) {
    insights.push({
      id: 'quick-links-context-gap',
      severity: 'opportunity',
      title: `${linksMissingContext.length} Quick Link${linksMissingContext.length === 1 ? '' : 's'} need marketing context`,
      interpretation: 'These public links can receive traffic, but the dashboard cannot explain which post or campaign created that interest.',
      action: 'Connect each link to the campaign or calendar item that will mention it; use channel labeling only when the link is truly channel-specific.',
      affected: titleList(linksMissingContext, (link) => link.title || link.url || 'Untitled link', 5),
    })
  }

  const sourcesMissingMetrics = activeSources.filter((source) => (source.keyMetrics || []).length === 0)
  if (sourcesMissingMetrics.length > 0) {
    insights.push({
      id: 'source-key-metric-gap',
      severity: 'opportunity',
      title: `${sourcesMissingMetrics.length} source${sourcesMissingMetrics.length === 1 ? '' : 's'} need key metrics`,
      interpretation: 'A connected dashboard is still too broad unless the source states which numbers matter for GoInvo marketing decisions.',
      action: 'Add 2-4 key metrics per source so designers know what evidence to check after a launch.',
      affected: titleList(sourcesMissingMetrics, (source) => source.title || labelFor(analyticsProviderOptions, source.provider), 5),
    })
  }

  const sourcesMissingCoverage = connectedSources.filter((source) => (source.targetSites || []).length === 0 && !source.productionUrl)
  if (sourcesMissingCoverage.length > 0) {
    insights.push({
      id: 'source-coverage-gap',
      severity: 'opportunity',
      title: `${sourcesMissingCoverage.length} connected source${sourcesMissingCoverage.length === 1 ? '' : 's'} need coverage notes`,
      interpretation: 'The source is connected, but the CMS does not say which site, property, or reporting surface it covers.',
      action: 'Add covered sites or a production URL so future campaigns can pick the right source without guessing.',
      affected: titleList(sourcesMissingCoverage, (source) => source.title || labelFor(analyticsProviderOptions, source.provider), 5),
    })
  }

  if (insights.length === 0 && connectedSources.length > 0) {
    insights.push({
      id: 'analytics-ready',
      severity: 'healthy',
      title: 'Measurement setup is ready for analysis',
      interpretation: 'Active marketing work is connected to sources, and the basic campaign and link attribution fields are in place.',
      action: 'Use the dashboards on the connected sources during the next reporting cadence, then capture what changed on the related campaign.',
      affected: titleList(connectedSources, (source) => source.title || labelFor(analyticsProviderOptions, source.provider), 4),
    })
  }

  return insights
}

function getAnalyticsReadinessStats(data: MarketingData) {
  const activeSources = data.analyticsSources.filter((source) => source.status !== 'disabled')
  const connectedSources = activeSources.filter(isConnectedAnalyticsSource)
  const activeCampaigns = data.campaigns.filter(isCampaignMeasurable)
  const activeFunnels = data.funnels.filter(isFunnelMeasurable)
  const activeChannels = data.channels.filter((channel) => channel.status !== 'archived')
  const measurableCalendarItems = data.calendarItems.filter(isCalendarItemMeasurable)
  const activeLinks = data.linkItems.filter(isMarketingLinkActive)
  const totalMeasurementTargets =
    activeCampaigns.length + activeFunnels.length + activeChannels.length + measurableCalendarItems.length + activeLinks.length
  const connectedMeasurementTargets =
    activeCampaigns.filter(campaignHasAnalytics).length +
    activeFunnels.filter((funnel) => hasAnalyticsRefs(funnel.analyticsSources)).length +
    activeChannels.filter((channel) => hasAnalyticsRefs(channel.analyticsSources)).length +
    measurableCalendarItems.filter((item) => !!item.analyticsSource?._id).length +
    activeLinks.filter((link) => !!link.campaign?._id || !!link.calendarItem?._id || (link.calendarItems || []).length > 0).length
  const readinessScore = totalMeasurementTargets > 0 ? Math.round((connectedMeasurementTargets / totalMeasurementTargets) * 100) : connectedSources.length > 0 ? 100 : 0

  return {
    readinessScore,
    connectedSources: connectedSources.length,
    activeSources: activeSources.length,
    measurementTargets: totalMeasurementTargets,
    connectedMeasurementTargets,
    reviewCadence: getRecommendedAnalyticsCadence(activeSources),
  }
}

function getMarketingDashboardStats(data: MarketingData) {
  const now = new Date()
  const today = startOfDayValue(now)
  const next30 = addDays(today, 30)
  const upcomingItems = data.calendarItems
    .filter((item) => {
      if (!item.publishAt || ['published', 'canceled'].includes(item.status || '')) return false
      const publishDate = new Date(item.publishAt)
      if (Number.isNaN(publishDate.getTime())) return false
      return startOfDayValue(publishDate).getTime() >= today.getTime()
    })
    .sort((first, second) => new Date(first.publishAt || '').getTime() - new Date(second.publishAt || '').getTime())
  const upcoming30Items = upcomingItems.filter((item) => {
    const publishDate = new Date(item.publishAt || '')
    return startOfDayValue(publishDate).getTime() <= next30.getTime()
  })
  const scheduledDays = Array.from(new Set(upcoming30Items.map((item) => toDateInputValue(item.publishAt)).filter(Boolean)))
  const lastUpcomingDate = upcomingItems[upcomingItems.length - 1]?.publishAt
  const lastDate = lastUpcomingDate ? startOfDayValue(new Date(lastUpcomingDate)) : null
  const contentRunwayDays = lastDate
    ? Math.max(1, Math.ceil((lastDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) + 1)
    : 0
  const activeCampaigns = data.campaigns.filter((campaign) => ['planned', 'active'].includes(campaign.status || ''))
  const campaignsWithUpcomingContent = activeCampaigns.filter((campaign) =>
    upcomingItems.some((item) => item.campaign?._id === campaign._id),
  ).length
  const channelCoverage = data.channels
    .filter((channel) => channel.status !== 'archived')
    .map((channel) => {
      const key = channel.key || channel._id
      const upcoming30Count = upcoming30Items.filter(
        (item) => item.channelRef?._id === channel._id || (!!channel.key && item.channel === channel.key),
      ).length

      return {
        key,
        title: channel.title || channel.key || 'Untitled channel',
        upcoming30Count,
      }
    })
    .sort((first, second) => first.upcoming30Count - second.upcoming30Count || first.title.localeCompare(second.title))

  return {
    upcomingItems,
    upcoming30Items,
    coveredDaysNext30: scheduledDays.length,
    contentRunwayDays,
    lastUpcomingDate,
    activeCampaigns: activeCampaigns.length,
    campaignsWithUpcomingContent,
    channelCoverage,
  }
}

function getMarketingDashboardGaps(data: MarketingData): MarketingDashboardGap[] {
  const stats = getMarketingDashboardStats(data)
  const gaps: MarketingDashboardGap[] = []
  const missingStrategy = getMissingFoundationalStrategyInputs(data)

  if (missingStrategy.length > 0) {
    const hasResearchFindings = data.researchResults.length > 0
    gaps.push({
      id: 'dashboard-strategy-foundation-gap',
      title: 'Strategy foundation is incomplete',
      why: `The assistant and designers are missing reusable ${missingStrategy.join(', ')} inputs, so content is more likely to be generated in a vacuum.`,
      action: hasResearchFindings
        ? 'Open Strategy and fill the missing foundation records from approved research.'
        : 'Open Research first, gather findings, then fill the missing Strategy records from those findings.',
      view: hasResearchFindings ? 'strategy' : 'research',
      severity: 'setup',
      affected: missingStrategy,
    })
  }

  if (stats.upcomingItems.length === 0) {
    gaps.push({
      id: 'dashboard-no-upcoming-content',
      title: 'No upcoming content is scheduled',
      why: 'Designers cannot tell what should be made next, and the public channels will look quiet even if there is active project work happening.',
      action: 'Add the next few posts, emails, or pages to the calendar so the content plan has a visible runway.',
      view: 'calendar',
      severity: 'urgent',
    })
  } else if (stats.contentRunwayDays < 14) {
    gaps.push({
      id: 'dashboard-short-runway',
      title: 'Content runway is under two weeks',
      why: 'A short runway turns content into a last-minute production task instead of a steady design workflow.',
      action: 'Plan at least two weeks of calendar items, even if the early drafts are only titles and channels.',
      view: 'calendar',
      severity: 'warning',
    })
  }

  if (stats.upcoming30Items.length > 0 && stats.coveredDaysNext30 < 4) {
    gaps.push({
      id: 'dashboard-thin-cadence',
      title: 'The next 30 days have a thin publishing cadence',
      why: 'A few isolated posts make it harder for audiences to recognize a pattern or follow a campaign idea over time.',
      action: 'Add supporting content across the next month so important ideas appear more than once.',
      view: 'calendar',
      severity: 'content',
    })
  }

  if (stats.activeCampaigns > 0 && stats.campaignsWithUpcomingContent < stats.activeCampaigns) {
    gaps.push({
      id: 'dashboard-campaign-runway-gap',
      title: `${stats.activeCampaigns - stats.campaignsWithUpcomingContent} active campaign${stats.activeCampaigns - stats.campaignsWithUpcomingContent === 1 ? '' : 's'} have no upcoming content`,
      why: 'A campaign without calendar items is a strategy note, not an actionable production plan for designers.',
      action: 'Attach at least one upcoming calendar item to each active campaign.',
      view: 'campaigns',
      severity: 'content',
    })
  }

  const channelsWithoutUpcoming = stats.channelCoverage.filter((channel) => channel.upcoming30Count === 0)
  if (channelsWithoutUpcoming.length > 0 && stats.upcoming30Items.length > 0) {
    gaps.push({
      id: 'dashboard-channel-coverage-gap',
      title: `${channelsWithoutUpcoming.length} active channel${channelsWithoutUpcoming.length === 1 ? '' : 's'} have no upcoming content`,
      why: 'Channel gaps hide reuse opportunities: one article, case study, or visual essay can often become multiple channel-specific assets.',
      action: 'Decide whether those channels should be paused, or add channel-specific versions of planned content.',
      view: 'channels',
      severity: 'setup',
      affected: channelsWithoutUpcoming.slice(0, 5).map((channel) => channel.title),
    })
  }

  const upcomingWithStages = stats.upcoming30Items.filter((item) => item.funnelStage)
  const hasConversionStage = upcomingWithStages.some((item) =>
    ['consideration', 'conversion', 'retention', 'advocacy'].includes(item.funnelStage || ''),
  )
  if (stats.upcoming30Items.length > 0 && !hasConversionStage) {
    gaps.push({
      id: 'dashboard-funnel-stage-gap',
      title: 'Upcoming content is not tied to later funnel stages',
      why: 'Awareness content can attract attention, but without consideration or conversion pieces people have fewer clear next steps.',
      action: 'Mark which items support consideration, conversion, retention, or advocacy, then add missing follow-up pieces.',
      view: 'funnels',
      severity: 'opportunity',
    })
  }

  const attentionGaps = getMarketingAttentionItems(data).map(
    (item): MarketingDashboardGap => ({
      id: `attention-${item.id}`,
      title: item.title,
      why: item.detail,
      action: `Open ${getMarketingViewTitle(item.view)} and fill the missing setup fields.`,
      view: item.view,
      severity: item.severity,
    }),
  )
  const analyticsGaps = buildAnalyticsInterpretations(data)
    .filter((insight) => insight.severity !== 'healthy')
    .map(
      (insight): MarketingDashboardGap => ({
        id: `analytics-${insight.id}`,
        title: insight.title,
        why: insight.interpretation,
        action: insight.action,
        view: getAnalyticsInsightView(insight),
        severity: insight.severity,
        affected: insight.affected,
      }),
    )

  return uniqueDashboardGaps([...gaps, ...attentionGaps, ...analyticsGaps]).sort(
    (first, second) => dashboardGapPriority(first.severity) - dashboardGapPriority(second.severity),
  )
}

function getAnalyticsInsightView(insight: AnalyticsInterpretation): MarketingViewId {
  if (insight.id.includes('campaign')) return 'campaigns'
  if (insight.id.includes('funnel')) return 'funnels'
  if (insight.id.includes('channel')) return 'channels'
  if (insight.id.includes('quick-links')) return 'linkTree'
  if (insight.id.includes('calendar')) return 'calendar'
  return 'analytics'
}

function uniqueDashboardGaps(gaps: MarketingDashboardGap[]) {
  const seen = new Set<string>()
  return gaps.filter((gap) => {
    const key = gap.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function dashboardGapPriority(severity: MarketingDashboardGap['severity']) {
  return (
    {
      urgent: 0,
      warning: 1,
      content: 2,
      measurement: 3,
      setup: 4,
      opportunity: 5,
      healthy: 6,
    } satisfies Record<MarketingDashboardGap['severity'], number>
  )[severity]
}

function getDashboardGapTone(severity: MarketingDashboardGap['severity']) {
  if (severity === 'urgent' || severity === 'warning' || severity === 'content') {
    return {
      bg: 'rgba(227, 98, 22, 0.08)',
      fg: '#E36216',
      border: 'rgba(227, 98, 22, 0.42)',
    }
  }

  if (severity === 'measurement' || severity === 'opportunity') {
    return {
      bg: 'rgba(0, 115, 133, 0.08)',
      fg: '#007385',
      border: 'rgba(0, 115, 133, 0.34)',
    }
  }

  return {
    bg: 'var(--card-bg-color)',
    fg: 'var(--card-muted-fg-color)',
    border: 'var(--card-border-color)',
  }
}

function createResearchProjectDocument(data: MarketingData): MarketingDocumentInput {
  const today = new Date()
  const firstUrl = data.linkItems.find((link) => link.status !== 'archived' && link.url)?.url || 'https://www.goinvo.com/'
  const researchType = 'topic'

  return {
    _type: 'marketingResearchProject',
    title: `Research project ${toDateInputValue(today)}`,
    status: 'draft',
    researchType,
    brief: 'Define what we need to learn before generating campaigns, funnels, calendar items, or Quick Links.',
    audience: 'People who can benefit from GoInvo work, articles, projects, or open resources.',
    goals: [
      'Find provider-backed keyword signals when SEO matters.',
      'Review source material before turning it into content.',
      'Identify what designers can safely make next.',
    ],
    campaignObjective: 'awareness',
    positioning: 'Treat this as a research hypothesis until results are reviewed.',
    canonicalUrl: firstUrl,
    seedKeywords: [],
    seedUrls: [firstUrl],
    targetGeography: 'us',
    language: 'en',
    methods: defaultResearchMethodsForType(researchType),
    researchQuestions: [createResearchProjectQuestion({ title: 'New research project', researchType } as MarketingResearchProject)],
    collaborators: [],
  }
}

function createResearchProjectQuestion(project: MarketingResearchProject): ResearchQuestion {
  const researchType = project.researchType || 'topic'
  const topic = stripResearchProjectSuffix(project.title || 'this research project')
  if (researchType === 'competitor') {
    return {
      _key: randomKey(),
      _type: 'researchQuestion',
      question: `What are comparable organizations publishing or ranking for around ${topic}?`,
      whyItMatters: 'Competitor research should reveal gaps, patterns, and positioning opportunities before we copy effort into production.',
      method: 'competitiveScan',
      decisionNeeded: 'Choose which gaps or examples are worth responding to in GoInvo content.',
      status: 'idea',
    }
  }
  if (researchType === 'strategy') {
    return {
      _key: randomKey(),
      _type: 'researchQuestion',
      question: `Which strategic direction should ${topic} support next?`,
      whyItMatters: 'Strategy research should decide the goal, audience, channel mix, and measurement before release work starts.',
      method: 'deskResearch',
      decisionNeeded: 'Choose the campaign/funnel direction and what evidence would change it.',
      status: 'idea',
    }
  }
  return {
    _key: randomKey(),
    _type: 'researchQuestion',
    question: `What evidence would make ${topic} worth scheduling?`,
    whyItMatters: 'Calendar items should be created from reviewed signals, not from topic guesses.',
    method: 'sourceReview',
    decisionNeeded: 'Approve results and choose whether to synthesize opportunities.',
    status: 'idea',
  }
}

function defaultResearchMethodsForType(researchType?: string) {
  if (researchType === 'competitor') return ['competitiveScan', 'seoReview', 'cmsScan', 'sourceReview']
  if (researchType === 'strategy') return ['cmsScan', 'deskResearch', 'analyticsReview', 'sourceReview']
  return ['seoReview', 'cmsScan', 'sourceReview']
}

function defaultResearchQuestionsForType(researchType: string | undefined, title: string): ResearchQuestion[] {
  return [createResearchProjectQuestion({ title, researchType } as MarketingResearchProject)]
}

function buildResearchQuestionsForType(researchType: string | undefined, topic: string): ResearchQuestion[] {
  const subject = stripResearchProjectSuffix(topic || 'this research project')
  if (researchType === 'competitor') {
    return [
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: `Who is already publishing, ranking, or getting attention around ${subject}?`,
        whyItMatters: 'This shows which competitors or peer examples are shaping audience expectations.',
        method: 'competitiveScan',
        decisionNeeded: 'Choose the examples worth learning from and the gaps GoInvo can own.',
        status: 'idea',
      },
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: `What content gaps or positioning openings exist around ${subject}?`,
        whyItMatters: 'Competitor research should produce a differentiated angle, not a duplicate post.',
        method: 'seoReview',
        decisionNeeded: 'Choose the first gap or contrast to turn into a content opportunity.',
        status: 'needsSource',
      },
    ]
  }
  if (researchType === 'strategy') {
    return [
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: `What strategic decision should ${subject} help us make next?`,
        whyItMatters: 'Strategy research should clarify direction before production starts.',
        method: 'deskResearch',
        decisionNeeded: 'Choose the goal, audience, channel mix, and measurement focus.',
        status: 'idea',
      },
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: `What signals would prove this strategy is worth turning into campaign, funnel, and calendar records?`,
        whyItMatters: 'This keeps planning tied to evidence instead of internal preference.',
        method: 'analyticsReview',
        decisionNeeded: 'Choose what evidence is enough to move from research into release planning.',
        status: 'needsSource',
      },
    ]
  }
  return [
    {
      _key: randomKey(),
      _type: 'researchQuestion',
      question: `Which audience-language queries should lead people to ${subject}?`,
      whyItMatters: 'This keeps titles, captions, and Quick Links grounded in audience language.',
      method: 'seoReview',
      decisionNeeded: 'Pick reviewed target queries and the first content angle.',
      status: 'idea',
    },
    {
      _key: randomKey(),
      _type: 'researchQuestion',
      question: `Which claims, visuals, examples, or proof points from ${subject} are strong enough to become reviewed content opportunities?`,
      whyItMatters: 'Content should not be generated until the evidence is reviewable.',
      method: 'sourceReview',
      decisionNeeded: 'Approve source findings before synthesis.',
      status: 'needsSource',
    },
  ]
}

function createResearchProjectCollaborator(): ResearchProjectCollaborator {
  return {
    _key: randomKey(),
    _type: 'researchCollaborator',
    name: '',
    organization: '',
    relationshipType: 'universityIntern',
    topicArea: '',
    contributionType: 'research',
    capacity: '',
    status: 'idea',
  }
}

function buildResearchProjectSavePayload(project: MarketingResearchProject): Record<string, unknown> {
  return {
    title: project.title || 'Untitled research project',
    status: project.status || 'draft',
    researchType: project.researchType || 'topic',
    brief: project.brief || '',
    audience: project.audience || '',
    goals: normalizeStringList(project.goals || []),
    campaignObjective: project.campaignObjective || 'awareness',
    positioning: project.positioning || '',
    canonicalUrl: project.canonicalUrl || '',
    seedKeywords: normalizeStringList(project.seedKeywords || []),
    seedUrls: normalizeStringList(project.seedUrls || []),
    targetGeography: project.targetGeography || 'us',
    language: project.language || 'en',
    methods: normalizeStringList(project.methods || defaultResearchMethodsForType(project.researchType)),
    researchQuestions: normalizeResearchQuestions(project.researchQuestions),
    collaborators: normalizeResearchProjectCollaborators(project.collaborators),
    selectedResults: refsFromRecords(project.selectedResults),
    approvedResults: refsFromRecords(project.approvedResults),
    generatedCampaigns: refsFromRecords(project.generatedCampaigns),
    generatedFunnels: refsFromRecords(project.generatedFunnels),
    generatedCalendarItems: refsFromRecords(project.generatedCalendarItems),
    generatedLinkItems: refsFromRecords(project.generatedLinkItems),
    ...(getRecordId(project.legacyPlan) ? { legacyPlan: referenceFromId(getRecordId(project.legacyPlan)) } : {}),
    internalNotes: project.internalNotes || '',
  }
}

function mergeResearchProjectSuggestion(
  current: MarketingResearchProject,
  suggestion: Partial<MarketingResearchProject>,
): MarketingResearchProject {
  const next: MarketingResearchProject = {
    ...current,
    title: aiString(suggestion.title) || current.title,
    status: aiOption(suggestion.status, researchProjectStatusOptions) || current.status || 'draft',
    researchType: aiOption(suggestion.researchType, researchProjectTypeOptions) || current.researchType || 'topic',
    brief: aiString(suggestion.brief) || current.brief,
    audience: aiString(suggestion.audience) || current.audience,
    campaignObjective: aiOption(suggestion.campaignObjective, campaignObjectiveOptions) || current.campaignObjective || 'awareness',
    positioning: aiString(suggestion.positioning) || current.positioning,
    canonicalUrl: aiString(suggestion.canonicalUrl) || current.canonicalUrl,
    targetGeography: aiString(suggestion.targetGeography) || current.targetGeography || 'us',
    language: aiString(suggestion.language) || current.language || 'en',
  }
  const goals = aiStringList(suggestion.goals)
  const seedKeywords = aiStringList(suggestion.seedKeywords)
  const seedUrls = aiStringList(suggestion.seedUrls)
  const methods = aiStringList(suggestion.methods)
  if (goals) next.goals = goals
  if (seedKeywords) next.seedKeywords = seedKeywords
  if (seedUrls) next.seedUrls = seedUrls
  if (methods) next.methods = methods
  if (Array.isArray(suggestion.researchQuestions)) next.researchQuestions = normalizeResearchQuestions(suggestion.researchQuestions)
  if (Array.isArray(suggestion.collaborators)) next.collaborators = normalizeResearchProjectCollaborators(suggestion.collaborators as ResearchProjectCollaborator[])
  if (aiString(suggestion.internalNotes)) next.internalNotes = aiString(suggestion.internalNotes)
  return next
}

function normalizeResearchProjectCollaborators(values: ResearchProjectCollaborator[] | undefined): ResearchProjectCollaborator[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'researchCollaborator' as const,
      name: item.name || '',
      organization: item.organization || '',
      relationshipType: item.relationshipType || 'other',
      topicArea: item.topicArea || '',
      availabilityStart: item.availabilityStart || '',
      availabilityEnd: item.availabilityEnd || '',
      contributionType: item.contributionType || 'research',
      capacity: item.capacity || '',
      expectedContribution: item.expectedContribution || '',
      status: item.status || 'idea',
      relatedResults: refsFromRecords(item.relatedResults) as unknown as MarketingResearchResult[],
      notes: item.notes || '',
    }))
    .filter((item) => item.name.trim() || item.organization.trim() || item.topicArea.trim() || item.capacity.trim())
}

async function migrateLegacyResearchPlanToProject(client: StudioClient, plan: MarketingResearchPlan) {
  const project = await client.create({
    _type: 'marketingResearchProject',
    title: `${plan.title || 'Legacy research plan'} project`,
    status: 'reviewing',
    researchType: 'strategy',
    brief: plan.summary || 'Imported from the legacy plan-centered research model.',
    audience: plan.audience || '',
    goals: normalizeStringList([
      plan.positioning || '',
      ...(plan.measurementGoals || []).map((goal) => goal.label || ''),
    ]),
    campaignObjective: plan.campaignObjective || 'awareness',
    positioning: plan.positioning || '',
    canonicalUrl: plan.canonicalUrl || '',
    seedKeywords: normalizeStringList((plan.seoTargets || []).map((target) => target.query || '')),
    seedUrls: normalizeStringList([
      plan.canonicalUrl || '',
      ...(plan.evidenceNotes || []).map((note) => note.sourceUrl || ''),
    ]),
    targetGeography: 'us',
    language: 'en',
    methods: normalizeStringList([
      ...(plan.seoTargets || []).length > 0 ? ['seoReview'] : [],
      ...(plan.evidenceNotes || []).length > 0 ? ['sourceReview'] : [],
    ]),
    researchQuestions: normalizeResearchQuestions(plan.researchQuestions),
    collaborators: normalizeResearchProjectCollaborators((plan.collaborations || []) as ResearchProjectCollaborator[]),
    legacyPlan: referenceFromId(plan._id),
    internalNotes: 'Imported from marketingResearchPlan. Original plan was preserved for compatibility.',
  })

  const resultIds: string[] = []
  for (const target of plan.seoTargets || []) {
    if (!target.query?.trim()) continue
    const result = await client.create({
      _type: 'marketingResearchResult',
      title: `${target.query} legacy SEO target`,
      resultType: 'seoKeyword',
      status: 'needsReview',
      project: referenceFromId(project._id),
      selectedForSynthesis: false,
      priority: target.priority || 'medium',
      provider: 'manual',
      sourceMethod: 'legacy-plan-migration',
      scoreSource: 'none',
      keyword: target.query,
      searchIntent: target.intent || 'learn',
      canonicalUrl: target.canonicalUrl || plan.canonicalUrl || '',
      contentGap: target.contentGap || '',
      claim: target.notes || `Legacy plan listed "${target.query}" as an SEO target.`,
      evidenceType: 'searchSignal',
      confidence: 'early',
      implication: target.notes || '',
    })
    resultIds.push(result._id)
  }

  for (const note of plan.evidenceNotes || []) {
    if (!note.claim?.trim()) continue
    const result = await client.create({
      _type: 'marketingResearchResult',
      title: note.sourceTitle || 'Legacy evidence note',
      resultType: note.evidenceType === 'competitorExample' ? 'competitorExample' : 'sourceEvidence',
      status: 'needsReview',
      project: referenceFromId(project._id),
      selectedForSynthesis: false,
      priority: 'medium',
      provider: 'manual',
      sourceMethod: 'legacy-plan-migration',
      scoreSource: 'none',
      sourceTitle: note.sourceTitle || '',
      sourceUrl: note.sourceUrl || '',
      claim: note.claim,
      evidenceType: note.evidenceType || 'teamKnowledge',
      confidence: note.confidence || 'early',
      implication: note.implication || '',
      contentGap: note.gap || '',
    })
    resultIds.push(result._id)
  }

  if (resultIds.length > 0) {
    await client.patch(project._id).set({ approvedResults: [], selectedResults: [] }).commit()
  }

  return project
}

function createResearchPlanDocument(data: MarketingData): MarketingDocumentInput {
  const today = new Date()
  const title = `Research plan ${toDateInputValue(today)}`
  const firstUrl = data.linkItems.find((link) => link.status !== 'archived' && link.url)?.url || 'https://www.goinvo.com/'

  return {
    _type: 'marketingResearchPlan',
    title,
    status: 'draft',
    summary: 'Use this plan to turn fast research inputs into a release schedule designers can execute.',
    audience: 'People who can benefit from GoInvo work, articles, projects, or open resources.',
    positioning: 'Lead with a useful insight, show evidence visually, and give people a clear next step.',
    campaignObjective: 'awareness',
    canonicalUrl: firstUrl,
    releaseCadence: 'weekly',
    researchQuestions: [
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: 'What audience need should this plan answer first?',
        whyItMatters: 'The strongest content plan starts with the decision or need the audience already has, not only the topic GoInvo wants to share.',
        method: 'deskResearch',
        decisionNeeded: 'Pick the first content opportunity and the message angle.',
        status: 'idea',
      },
    ],
    evidenceNotes: [
      {
        _key: randomKey(),
        _type: 'evidenceNote',
        claim: 'Existing GoInvo links and site pages can provide the first canonical destinations.',
        sourceTitle: 'Current Quick Links / site content',
        sourceUrl: firstUrl,
        evidenceType: 'siteContent',
        confidence: 'medium',
        implication: 'Start with a visual explanation that routes people to the most relevant source page.',
        gap: 'Confirm which source page best answers the audience question.',
      },
    ],
    assumptions: [
      {
        _key: randomKey(),
        _type: 'researchAssumption',
        assumption: 'A short visual post can make the source material easier to discover.',
        risk: 'If the source material is too broad, the post may attract attention without sending people to a clear next step.',
        validationSignal: 'Look for saves, shares, replies, or useful visits to the canonical destination.',
        confidence: 'early',
      },
    ],
    releaseWindows: [
      {
        _key: randomKey(),
        _type: 'releaseWindow',
        label: 'Upcoming release window',
        startDate: toDateInputValue(addDays(today, 7)),
        endDate: toDateInputValue(addDays(today, 14)),
        goal: 'Ship the first useful content artifact and learn what follow-up is needed.',
        priority: 'high',
      },
    ],
    seoTargets: [],
    collaborations: [],
    contentOpportunities: [],
    measurementGoals: [
      {
        _key: randomKey(),
        _type: 'measurementGoal',
        label: 'Useful visits',
        target: 'People reach the canonical destination from campaign links or Quick Links.',
      },
    ],
  }
}

function createResearchQuestion(plan: MarketingResearchPlan): ResearchQuestion {
  return {
    _key: randomKey(),
    _type: 'researchQuestion',
    question: plan.title ? `What should ${plan.title} help the audience decide or understand?` : 'What should this plan help the audience decide or understand?',
    whyItMatters: 'This keeps the plan tied to an audience need instead of turning research into a topic dump.',
    method: 'deskResearch',
    decisionNeeded: 'Choose the content angle, destination, and release priority.',
    status: 'idea',
  }
}

function createResearchEvidenceNote(plan: MarketingResearchPlan): ResearchEvidenceNote {
  return {
    _key: randomKey(),
    _type: 'evidenceNote',
    claim: '',
    sourceTitle: '',
    sourceUrl: plan.canonicalUrl || '',
    evidenceType: plan.canonicalUrl ? 'siteContent' : 'teamKnowledge',
    confidence: 'early',
    implication: '',
    gap: '',
  }
}

function createResearchAssumption(plan: MarketingResearchPlan): ResearchAssumption {
  return {
    _key: randomKey(),
    _type: 'researchAssumption',
    assumption: plan.audience ? `${plan.audience} will recognize the value of this topic from a short content artifact.` : '',
    risk: 'The content may be clear to the team but not to the intended audience.',
    validationSignal: 'Useful visits, saves, shares, replies, or follow-up conversations after publishing.',
    confidence: 'needsValidation',
  }
}

function createResearchSeoTarget(plan: MarketingResearchPlan): ResearchSeoTarget {
  const title = plan.title || 'GoInvo design work'
  return {
    _key: randomKey(),
    _type: 'seoTarget',
    query: title,
    intent: 'learn',
    priority: 'medium',
    canonicalUrl: plan.canonicalUrl || '',
    contentGap: 'Need a clear public destination or supporting post that answers this query.',
  }
}

function createResearchCollaboration(): ResearchCollaboration {
  return {
    _key: randomKey(),
    _type: 'collaborationOpportunity',
    name: '',
    organization: '',
    relationshipType: 'universityIntern',
    topicArea: '',
    contributionType: 'research',
    status: 'idea',
  }
}

function createResearchReleaseWindow(plan: MarketingResearchPlan): ResearchReleaseWindow {
  const count = (plan.releaseWindows || []).length
  const start = addDays(new Date(), 7 + count * 7)
  return {
    _key: randomKey(),
    _type: 'releaseWindow',
    label: `Window ${count + 1}`,
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(addDays(start, 7)),
    goal: 'Release the next planned content item and capture the follow-up signal.',
    priority: 'medium',
  }
}

function createResearchContentOpportunity(plan: MarketingResearchPlan, data: MarketingData): ResearchContentOpportunity {
  const firstChannel = data.channels.find((channel) => channel.status !== 'archived')?.key || 'instagram'
  const firstWindow = plan.releaseWindows?.[0]?.label || ''
  const firstSeo = plan.seoTargets?.[0]?.query || ''
  return {
    _key: randomKey(),
    _type: 'contentOpportunity',
    title: plan.title ? `${plan.title} content item` : 'New content opportunity',
    channel: firstChannel,
    format: firstChannel === 'instagram' ? 'carousel' : 'linkPost',
    releaseWindow: firstWindow,
    callToAction: plan.canonicalUrl ? 'Read the source' : 'Learn more',
    destinationUrl: plan.canonicalUrl || '',
    readiness: 'idea',
    seoQuery: firstSeo,
    priority: 'medium',
  }
}

function createResearchStrategyAdjustment(): ResearchStrategyAdjustment {
  return {
    _key: randomKey(),
    _type: 'strategyAdjustment',
    decisionDate: toDateInputValue(new Date()),
    trigger: '',
    reason: '',
    recommendation: '',
    decision: '',
  }
}

function updateResearchArrayItem<T extends { _key?: string; _type?: string }>(
  items: T[] | undefined,
  index: number,
  patch: Partial<T>,
) {
  return (items || []).map((item, itemIndex) =>
    itemIndex === index
      ? {
          ...item,
          ...patch,
          _key: item._key || randomKey(),
        }
      : item,
  )
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        ...styles.small,
        border: '1px solid rgba(0, 115, 133, 0.24)',
        borderRadius: 6,
        padding: '4px 7px',
        background: 'rgba(0, 115, 133, 0.08)',
        fontWeight: 800,
      }}
    >
      {label}: {value}
    </span>
  )
}

function FindingDetail({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ ...styles.small, marginTop: 8, lineHeight: 1.5 }}>
      <strong style={{ color: '#93A4C8' }}>{label}: </strong>
      <span style={styles.muted}>{text}</span>
    </div>
  )
}

function removeResearchArrayItem<T>(items: T[] | undefined, index: number) {
  return (items || []).filter((_, itemIndex) => itemIndex !== index)
}

function getResearchChannelOptions(data: MarketingData): SelectOption[] {
  const channelOptions = data.channels
    .filter((channel) => channel.status !== 'archived')
    .map((channel) => ({ title: channel.title || channel.key || 'Untitled channel', value: channel.key || channel._id }))
  const fallback = [
    { title: 'Instagram', value: 'instagram' },
    { title: 'LinkedIn', value: 'linkedin' },
    { title: 'Website', value: 'website' },
    { title: 'Email', value: 'email' },
    { title: 'Newsletter', value: 'newsletter' },
  ]

  return uniqueOptions([...channelOptions, ...fallback])
}

function uniqueOptions(options: SelectOption[]) {
  const seen = new Set<string>()
  return options.filter((option) => {
    if (seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
}

function buildResearchPlanSavePayload(plan: MarketingResearchPlan): Record<string, unknown> {
  return {
    title: plan.title || 'Untitled research plan',
    status: plan.status || 'draft',
    summary: plan.summary || '',
    audience: plan.audience || '',
    positioning: plan.positioning || '',
    campaignObjective: plan.campaignObjective || 'awareness',
    canonicalUrl: plan.canonicalUrl || '',
    releaseCadence: plan.releaseCadence || 'weekly',
    contentPillars: normalizeResearchContentPillars(plan.contentPillars),
    researchQuestions: normalizeResearchQuestions(plan.researchQuestions),
    evidenceNotes: normalizeResearchEvidenceNotes(plan.evidenceNotes),
    assumptions: normalizeResearchAssumptions(plan.assumptions),
    seoTargets: normalizeResearchSeoTargets(plan.seoTargets),
    channels: normalizeResearchChannels(plan.channels),
    collaborations: normalizeResearchCollaborations(plan.collaborations),
    releaseWindows: normalizeResearchReleaseWindows(plan.releaseWindows),
    contentOpportunities: normalizeResearchContentOpportunities(plan.contentOpportunities),
    measurementGoals: normalizeResearchMeasurementGoals(plan.measurementGoals),
    strategyAdjustments: normalizeResearchStrategyAdjustments(plan.strategyAdjustments),
    generatedCampaigns: refsFromRecords(plan.generatedCampaigns),
    generatedFunnels: refsFromRecords(plan.generatedFunnels),
    generatedCalendarItems: refsFromRecords(plan.generatedCalendarItems),
    generatedLinkItems: refsFromRecords(plan.generatedLinkItems),
    generatedAnalyticsSources: refsFromRecords(plan.generatedAnalyticsSources),
    internalNotes: plan.internalNotes || '',
  }
}

function mergeResearchPlanSuggestion(current: MarketingResearchPlan, suggestion: Partial<MarketingResearchPlan>): MarketingResearchPlan {
  const next: MarketingResearchPlan = {
    ...current,
    title: aiString(suggestion.title) || current.title,
    status: aiString(suggestion.status) || current.status || 'draft',
    summary: aiString(suggestion.summary) || current.summary,
    audience: aiString(suggestion.audience) || current.audience,
    positioning: aiString(suggestion.positioning) || current.positioning,
    campaignObjective: aiOption(suggestion.campaignObjective, campaignObjectiveOptions) || current.campaignObjective || 'awareness',
    canonicalUrl: aiString(suggestion.canonicalUrl) || current.canonicalUrl,
    releaseCadence: aiOption(suggestion.releaseCadence, researchPlanCadenceOptions) || current.releaseCadence || 'weekly',
  }

  if (Array.isArray(suggestion.contentPillars)) next.contentPillars = normalizeResearchContentPillars(suggestion.contentPillars)
  if (Array.isArray(suggestion.researchQuestions)) next.researchQuestions = normalizeResearchQuestions(suggestion.researchQuestions)
  if (Array.isArray(suggestion.evidenceNotes)) next.evidenceNotes = normalizeResearchEvidenceNotes(suggestion.evidenceNotes)
  if (Array.isArray(suggestion.assumptions)) next.assumptions = normalizeResearchAssumptions(suggestion.assumptions)
  if (Array.isArray(suggestion.seoTargets)) next.seoTargets = normalizeResearchSeoTargets(suggestion.seoTargets)
  if (Array.isArray(suggestion.channels)) next.channels = normalizeResearchChannels(suggestion.channels)
  if (Array.isArray(suggestion.collaborations)) next.collaborations = normalizeResearchCollaborations(suggestion.collaborations)
  if (Array.isArray(suggestion.releaseWindows)) next.releaseWindows = normalizeResearchReleaseWindows(suggestion.releaseWindows)
  if (Array.isArray(suggestion.contentOpportunities)) {
    next.contentOpportunities = normalizeResearchContentOpportunities(suggestion.contentOpportunities).map((opportunity) => ({
      ...opportunity,
      destinationUrl: opportunity.destinationUrl || next.canonicalUrl || '',
    }))
  }
  if (Array.isArray(suggestion.measurementGoals)) next.measurementGoals = normalizeResearchMeasurementGoals(suggestion.measurementGoals)
  if (Array.isArray(suggestion.strategyAdjustments)) next.strategyAdjustments = normalizeResearchStrategyAdjustments(suggestion.strategyAdjustments)

  return next
}

function normalizeResearchContentPillars(values: ResearchContentPillar[] | undefined): ResearchContentPillar[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'contentPillar' as const,
      title: item.title || '',
      audienceNeed: item.audienceNeed || '',
      angle: item.angle || '',
      exampleFormats: (item.exampleFormats || []).filter(Boolean),
    }))
    .filter((item) => item.title.trim())
}

function normalizeResearchQuestions(values: ResearchQuestion[] | undefined): ResearchQuestion[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'researchQuestion' as const,
      question: item.question || '',
      whyItMatters: item.whyItMatters || '',
      method: item.method || 'deskResearch',
      decisionNeeded: item.decisionNeeded || '',
      status: item.status || 'idea',
    }))
    .filter((item) => item.question.trim())
}

function normalizeResearchEvidenceNotes(values: ResearchEvidenceNote[] | undefined): ResearchEvidenceNote[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'evidenceNote' as const,
      claim: item.claim || '',
      sourceTitle: item.sourceTitle || '',
      sourceUrl: item.sourceUrl || '',
      evidenceType: item.evidenceType || 'teamKnowledge',
      confidence: item.confidence || 'early',
      implication: item.implication || '',
      gap: item.gap || '',
    }))
    .filter((item) => item.claim.trim())
}

function normalizeResearchAssumptions(values: ResearchAssumption[] | undefined): ResearchAssumption[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'researchAssumption' as const,
      assumption: item.assumption || '',
      risk: item.risk || '',
      validationSignal: item.validationSignal || '',
      confidence: item.confidence || 'needsValidation',
    }))
    .filter((item) => item.assumption.trim())
}

function normalizeResearchSeoTargets(values: ResearchSeoTarget[] | undefined): ResearchSeoTarget[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'seoTarget' as const,
      query: item.query || '',
      intent: item.intent || 'learn',
      priority: item.priority || 'medium',
      canonicalUrl: item.canonicalUrl || '',
      contentGap: item.contentGap || '',
      notes: item.notes || '',
    }))
    .filter((item) => item.query.trim())
}

function normalizeResearchChannels(values: ResearchRecommendedChannel[] | undefined): ResearchRecommendedChannel[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'recommendedChannel' as const,
      channelKey: item.channelKey || '',
      rationale: item.rationale || '',
      cadence: item.cadence || '',
      priority: item.priority || 'medium',
    }))
    .filter((item) => item.channelKey.trim())
}

function normalizeResearchCollaborations(values: ResearchCollaboration[] | undefined): ResearchCollaboration[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'collaborationOpportunity' as const,
      name: item.name || '',
      organization: item.organization || '',
      relationshipType: item.relationshipType || 'other',
      topicArea: item.topicArea || '',
      availabilityStart: item.availabilityStart || '',
      availabilityEnd: item.availabilityEnd || '',
      contributionType: item.contributionType || 'research',
      expectedContribution: item.expectedContribution || '',
      status: item.status || 'idea',
      notes: item.notes || '',
    }))
    .filter((item) => item.name.trim() || item.organization.trim() || item.topicArea.trim())
}

function normalizeResearchReleaseWindows(values: ResearchReleaseWindow[] | undefined): ResearchReleaseWindow[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'releaseWindow' as const,
      label: item.label || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      goal: item.goal || '',
      priority: item.priority || 'medium',
    }))
    .filter((item) => item.label.trim())
}

function normalizeResearchContentOpportunities(values: ResearchContentOpportunity[] | undefined): ResearchContentOpportunity[] {
  return (values || [])
    .map((item) => {
      const generatedCalendarId = getRecordId(item.generatedCalendarItem)
      const generatedLinkId = getRecordId(item.generatedLinkItem)
      return {
        _key: item._key || randomKey(),
        _type: 'contentOpportunity' as const,
        title: item.title || '',
        channel: item.channel || 'instagram',
        format: item.format || 'carousel',
        owner: item.owner || '',
        releaseWindow: item.releaseWindow || '',
        callToAction: item.callToAction || '',
        sourceMaterial: item.sourceMaterial || '',
        destinationUrl: item.destinationUrl || '',
        readiness: item.readiness || 'idea',
        seoQuery: item.seoQuery || '',
        priority: item.priority || 'medium',
        notes: item.notes || '',
        ...(generatedCalendarId ? { generatedCalendarItem: referenceFromId(generatedCalendarId) } : {}),
        ...(generatedLinkId ? { generatedLinkItem: referenceFromId(generatedLinkId) } : {}),
      }
    })
    .filter((item) => item.title.trim())
}

function normalizeResearchMeasurementGoals(values: ResearchMeasurementGoal[] | undefined): ResearchMeasurementGoal[] {
  return (values || [])
    .map((item) => {
      const sourceId = getRecordId(item.source)
      return {
        _key: item._key || randomKey(),
        _type: 'measurementGoal' as const,
        label: item.label || '',
        target: item.target || '',
        ...(sourceId ? { source: referenceFromId(sourceId) } : {}),
      }
    })
    .filter((item) => item.label.trim())
}

function normalizeResearchStrategyAdjustments(values: ResearchStrategyAdjustment[] | undefined): ResearchStrategyAdjustment[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'strategyAdjustment' as const,
      decisionDate: item.decisionDate || '',
      trigger: item.trigger || '',
      reason: item.reason || '',
      recommendation: item.recommendation || '',
      affectedItems: (item.affectedItems || []).filter(Boolean),
      decision: item.decision || '',
    }))
    .filter((item) => item.trigger.trim() || item.reason.trim() || item.recommendation.trim())
}

function normalizeDraftContentFrames(values: DraftContentFrame[] | undefined): DraftContentFrame[] {
  return (values || [])
    .map((item) => ({
      _key: item._key || randomKey(),
      _type: 'draftFrame' as const,
      title: item.title || '',
      body: item.body || '',
      visualDirection: item.visualDirection || '',
      altText: item.altText || '',
    }))
    .filter((item) => item.title.trim() || item.body.trim() || item.visualDirection.trim() || item.altText.trim())
}

async function createResearchProjectGeneratedRecords(
  client: StudioClient,
  data: MarketingData,
  project: MarketingResearchProject,
  selectedResultIds: string[],
) {
  const selected = getResearchResultsForProject(data, project._id).filter((result) =>
    selectedResultIds.includes(result._id) && isResearchResultApproved(result),
  )
  if (selected.length === 0) throw new Error('No approved selected research findings were found.')

  const today = new Date()
  const title = project.title || 'Research-backed marketing setup'
  const slug = slugify(title)
  const destinationUrl = project.canonicalUrl || selected.find((result) => result.canonicalUrl)?.canonicalUrl || selected.find((result) => result.sourceUrl)?.sourceUrl || 'https://www.goinvo.com/'
  const topicCluster = inferTopicCluster(title)
  const targetQueries = selected.map((result) => result.keyword || '').filter(Boolean)
  const primaryKeyword = targetQueries[0] || topicCluster
  const searchIntent = selected.find((result) => result.searchIntent)?.searchIntent || 'learn'
  const channels = ['instagram', 'linkedin', 'website']
  const channelIds: Record<string, string> = {}
  for (const channelKey of channels) {
    channelIds[channelKey] = await ensureMarketingChannel(client, data, channelKey)
  }

  const resultRefs = refsFromIds(selected.map((result) => result._id))
  const funnel = await client.create({
    _type: 'marketingFunnel',
    title: `${title} research path`,
    status: 'draft',
    audience: project.audience || 'People who need this topic explained through useful GoInvo content.',
    conversionGoal: `Move from a research-backed content artifact to ${destinationUrl}.`,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    stages: normalizeFunnelStages([
      {
        stage: 'awareness',
        goal: 'Use a reviewed finding as the first visible hook.',
        offer: primaryKeyword,
        callToAction: 'Open the source',
        destinationUrl,
        metrics: ['Reach', 'Saves', 'Profile visits'],
      },
      {
        stage: 'interest',
        goal: 'Show enough evidence for the audience to understand why the topic matters.',
        offer: 'Reviewed research result',
        callToAction: 'Read the source',
        destinationUrl,
        metrics: ['Engaged visits', 'Quick Link clicks'],
      },
      {
        stage: 'conversion',
        goal: 'Invite the right people to contact GoInvo, reuse the work, or explore related work.',
        offer: 'Canonical destination',
        callToAction: 'Start a conversation',
        destinationUrl,
        metrics: ['CTA clicks', 'Contact starts', 'Qualified conversations'],
      },
    ]),
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes: buildResearchResultEvidenceSummary(project, selected),
  })

  const campaign = await client.create({
    _type: 'marketingCampaign',
    title,
    slug: { _type: 'slug', current: slug },
    status: 'planned',
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(addDays(today, 21)),
    primaryGoal: project.brief || `Turn approved ${title} research into a small content runway.`,
    campaignObjective: project.campaignObjective || 'awareness',
    audience: project.audience || '',
    topicCluster,
    searchIntent,
    targetQueries,
    positioning: project.positioning || '',
    canonicalUrl: destinationUrl,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    channels,
    channelRefs: refsFromIds(Object.values(channelIds)),
    funnels: refsFromIds([funnel._id]),
    primaryKpi: 'Useful visits from reviewed research-backed content',
    utmCampaign: slug,
    successMetrics: normalizeSuccessMetrics([
      { label: 'Useful visits', target: 'People reach the canonical destination from promoted links.' },
      { label: 'Saved or shared content', target: 'The audience signals the finding was useful enough to keep or pass along.' },
    ]),
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes: 'Generated from approved Research findings. Edit before publishing if strategy changes.',
  })

  const opportunities = buildResearchResultOpportunities(project, selected, destinationUrl)
  const createdCalendarItems: string[] = []
  const createdLinkItems: string[] = []

  for (const [index, opportunity] of opportunities.entries()) {
    const publishDate = dateInputToIso(toDateInputValue(addDays(today, 7 + index * 4)))
    const createdCalendar = await client.create({
      _type: 'marketingCalendarItem',
      title: opportunity.title,
      status: 'drafting',
      publishAt: publishDate,
      contentType: opportunity.format,
      channel: opportunity.channel,
      channelRef: { _type: 'reference', _ref: channelIds[opportunity.channel] || channelIds.instagram },
      campaign: { _type: 'reference', _ref: campaign._id },
      funnel: { _type: 'reference', _ref: funnel._id },
      funnelStage: index === 0 ? 'awareness' : 'interest',
      workingUrl: opportunity.destinationUrl,
      brief: opportunity.notes,
      callToAction: opportunity.callToAction,
      utmCampaign: slug,
      topicCluster,
      searchIntent,
      targetQueries: Array.from(new Set([opportunity.seoQuery, ...targetQueries].filter(Boolean))),
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
    })
    createdCalendarItems.push(createdCalendar._id)

    const createdLink = await client.create({
      _type: 'marketingLinkItem',
      title: opportunity.title,
      url: opportunity.destinationUrl,
      description: opportunity.sourceMaterial || `Research-backed link for ${title}.`,
      type: 'article',
      status: 'draft',
      featured: index === 0,
      order: nextLinkOrder(data.linkItems) + index,
      publishAt: publishDate,
      sourceChannel: opportunity.channel,
      campaign: { _type: 'reference', _ref: campaign._id },
      calendarItem: { _type: 'reference', _ref: createdCalendar._id },
      calendarItems: refsFromIds([createdCalendar._id]),
      researchProject: referenceFromId(project._id),
      researchResults: refsFromIds(opportunity.resultIds),
    })
    createdLinkItems.push(createdLink._id)
    await client.patch(createdCalendar._id).set({ linkItems: refsFromIds([createdLink._id]) }).commit()
  }

  await client
    .patch(project._id)
    .set({
      status: 'converted',
      selectedResults: refsFromIds(selected.map((result) => result._id)),
      approvedResults: refsFromIds(selected.map((result) => result._id)),
      generatedCampaigns: refsFromIds(mergeIds(refIdsFromRecords(project.generatedCampaigns), [campaign._id])),
      generatedFunnels: refsFromIds(mergeIds(refIdsFromRecords(project.generatedFunnels), [funnel._id])),
      generatedCalendarItems: refsFromIds(mergeIds(refIdsFromRecords(project.generatedCalendarItems), createdCalendarItems)),
      generatedLinkItems: refsFromIds(mergeIds(refIdsFromRecords(project.generatedLinkItems), createdLinkItems)),
    })
    .commit()

  return {
    campaignId: campaign._id,
    funnelId: funnel._id,
    calendarItemIds: createdCalendarItems,
    linkItemIds: createdLinkItems,
  }
}

function buildResearchResultOpportunities(
  project: MarketingResearchProject,
  results: MarketingResearchResult[],
  destinationUrl: string,
) {
  const seoResults = results.filter((result) => result.resultType === 'seoKeyword')
  const evidenceResults = results.filter((result) => result.resultType !== 'seoKeyword')
  const primary = seoResults[0] || results[0]
  const secondary = seoResults[1] || evidenceResults[0] || results[1]
  const baseTitle = project.title || primary?.keyword || primary?.title || 'Research-backed content'
  const opportunities = [
    {
      title: `${baseTitle} Instagram carousel`,
      channel: 'instagram',
      format: 'carousel',
      callToAction: 'See link in bio',
      destinationUrl,
      sourceMaterial: primary ? describeResearchResult(primary) : '',
      seoQuery: primary?.keyword || '',
      notes: buildGeneratedCalendarBrief(project, [primary].filter(Boolean) as MarketingResearchResult[]),
      resultIds: [primary?._id].filter(Boolean) as string[],
    },
  ]

  if (secondary && secondary._id !== primary?._id) {
    opportunities.push({
      title: `${baseTitle} follow-up post`,
      channel: 'linkedin',
      format: 'linkPost',
      callToAction: 'Read the source',
      destinationUrl,
      sourceMaterial: describeResearchResult(secondary),
      seoQuery: secondary.keyword || primary?.keyword || '',
      notes: buildGeneratedCalendarBrief(project, [secondary]),
      resultIds: [secondary._id],
    })
  }

  return opportunities
}

function buildGeneratedCalendarBrief(project: MarketingResearchProject, results: MarketingResearchResult[]) {
  return [
    `Research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    project.audience ? `Audience: ${project.audience}` : '',
    ...results.map((result) => `Approved result: ${describeResearchResult(result)}`),
    'Designer task: make the content from the approved finding without inventing scores or unsupported claims.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildResearchResultEvidenceSummary(project: MarketingResearchProject, results: MarketingResearchResult[]) {
  return [
    `Generated from research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    'Approved findings:',
    ...results.map((result) => `- ${describeResearchResult(result)}`),
  ]
    .filter(Boolean)
    .join('\n')
}

async function createResearchPlanGeneratedRecords(
  client: StudioClient,
  data: MarketingData,
  plan: MarketingResearchPlan,
  selectedOpportunityKeys: string[],
) {
  const selected = (plan.contentOpportunities || []).filter((opportunity) =>
    selectedOpportunityKeys.includes(opportunity._key || ''),
  )
  if (selected.length === 0) throw new Error('No selected opportunities were found.')

  const today = new Date()
  const selectedChannels = Array.from(new Set(selected.map((opportunity) => opportunity.channel || 'instagram')))
  const channelIds: Record<string, string> = {}
  for (const channelKey of selectedChannels) {
    channelIds[channelKey] = await ensureMarketingChannel(client, data, channelKey)
  }

  const title = plan.title || 'Research release plan'
  const slug = slugify(title)
  const startDate = firstReleaseWindowDate(plan) || toDateInputValue(today)
  const endDate = lastReleaseWindowDate(plan) || toDateInputValue(addDays(today, 21))
  const destinationUrl = plan.canonicalUrl || selected.find((opportunity) => opportunity.destinationUrl)?.destinationUrl || 'https://www.goinvo.com/'
  const targetQueries = Array.from(
    new Set([
      ...(plan.seoTargets || []).map((target) => target.query || '').filter(Boolean),
      ...selected.map((opportunity) => opportunity.seoQuery || '').filter(Boolean),
    ]),
  )
  const topicCluster = inferTopicCluster(title)
  const searchIntent = plan.seoTargets?.[0]?.intent || 'learn'

  const funnel = await client.create({
    _type: 'marketingFunnel',
    title: `${title} release path`,
    status: 'active',
    audience: plan.audience || 'People who need this topic explained through useful GoInvo content.',
    conversionGoal: `Move from discovery to ${destinationUrl}, then to a useful next action.`,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    stages: normalizeFunnelStages([
      {
        stage: 'awareness',
        goal: 'Make the topic visible with a short, specific insight.',
        offer: selected[0]?.title || 'First content opportunity',
        callToAction: selected[0]?.callToAction || 'Learn more',
        destinationUrl,
        metrics: ['Reach', 'Saves', 'Profile visits'],
      },
      {
        stage: 'interest',
        goal: 'Give people enough context to understand why this matters.',
        offer: 'Source article, project page, or supporting post',
        callToAction: 'Read the source',
        destinationUrl,
        metrics: ['Engaged visits', 'Quick Link clicks'],
      },
      {
        stage: 'conversion',
        goal: 'Invite the right people to contact GoInvo, reuse the work, or explore related work.',
        offer: 'Canonical destination',
        callToAction: 'Start a conversation',
        destinationUrl,
        metrics: ['CTA clicks', 'Contact starts', 'Qualified conversations'],
      },
    ]),
    notes: [
      'Generated from a marketing research plan.',
      plan.summary ? `Research summary: ${plan.summary}` : '',
      selected.length > 0 ? `Generated from opportunities: ${selected.map((opportunity) => opportunity.title).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  })

  const campaign = await client.create({
    _type: 'marketingCampaign',
    title,
    slug: { _type: 'slug', current: slug },
    status: 'planned',
    startDate,
    endDate,
    primaryGoal: plan.summary || `Turn ${title} research into a timed content release plan.`,
    campaignObjective: plan.campaignObjective || 'awareness',
    audience: plan.audience || '',
    topicCluster,
    searchIntent,
    targetQueries,
    positioning: plan.positioning || '',
    canonicalUrl: destinationUrl,
    targetSites: [{ _key: randomKey(), _type: 'targetSite', label: title, url: destinationUrl }],
    channels: selectedChannels,
    channelRefs: refsFromIds(Object.values(channelIds)),
    funnels: refsFromIds([funnel._id]),
    primaryKpi: plan.measurementGoals?.[0]?.label || 'Useful visits',
    utmCampaign: slug,
    successMetrics: normalizeSuccessMetrics(
      (plan.measurementGoals || []).length > 0
        ? (plan.measurementGoals || []).map((goal) => ({ label: goal.label || 'Metric', target: goal.target || 'Review after launch.' }))
        : [
            { label: 'Useful visits', target: 'People reach the canonical destination from promoted links.' },
            { label: 'Content saves or replies', target: 'The audience signals the content helped clarify the topic.' },
          ],
    ),
    notes: 'Generated from the Research workspace. Edit the campaign before publishing if the target audience, KPI, or channels change.',
  })

  const createdCalendarItems: Array<{ _id: string; key: string }> = []
  const createdLinkItems: Array<{ _id: string; key: string }> = []

  for (const [index, opportunity] of selected.entries()) {
    const channelKey = opportunity.channel || 'instagram'
    const publishDate = dateInputToIso(resolveOpportunityDate(plan, opportunity, index))
    const contentType = opportunity.format || (channelKey === 'instagram' ? 'carousel' : 'linkPost')
    const url = opportunity.destinationUrl || destinationUrl
    const createdCalendar = await client.create({
      _type: 'marketingCalendarItem',
      title: opportunity.title || `${title} content item`,
      status: 'drafting',
      publishAt: publishDate,
      contentType,
      channel: channelKey,
      channelRef: { _type: 'reference', _ref: channelIds[channelKey] || channelIds.instagram },
      campaign: { _type: 'reference', _ref: campaign._id },
      funnel: { _type: 'reference', _ref: funnel._id },
      funnelStage: index === 0 ? 'awareness' : 'interest',
      workingUrl: url,
      brief: buildResearchOpportunityBrief(plan, opportunity),
      callToAction: opportunity.callToAction || 'See link in bio',
      utmCampaign: slug,
      topicCluster,
      searchIntent: opportunity.seoQuery ? searchIntent : 'learn',
      targetQueries: Array.from(new Set([opportunity.seoQuery || '', ...targetQueries].filter(Boolean))),
    })
    createdCalendarItems.push({ _id: createdCalendar._id, key: opportunity._key || '' })

    const createdLink = await client.create({
      _type: 'marketingLinkItem',
      title: opportunity.title || title,
      url,
      description: opportunity.notes || opportunity.sourceMaterial || plan.summary || `Follow-up link for ${title}.`,
      type: contentType === 'caseStudy' ? 'caseStudy' : contentType === 'event' ? 'event' : 'article',
      status: 'draft',
      featured: index === 0,
      order: nextLinkOrder(data.linkItems) + index,
      publishAt: publishDate,
      sourceChannel: channelKey,
      campaign: { _type: 'reference', _ref: campaign._id },
      calendarItem: { _type: 'reference', _ref: createdCalendar._id },
      calendarItems: refsFromIds([createdCalendar._id]),
    })
    createdLinkItems.push({ _id: createdLink._id, key: opportunity._key || '' })

    await client.patch(createdCalendar._id).set({ linkItems: refsFromIds([createdLink._id]) }).commit()
  }

  const nextOpportunities = normalizeResearchContentOpportunities(plan.contentOpportunities).map((opportunity) => {
    const calendar = createdCalendarItems.find((item) => item.key === opportunity._key)
    const link = createdLinkItems.find((item) => item.key === opportunity._key)
    return {
      ...opportunity,
      readiness: calendar ? 'scheduled' : opportunity.readiness,
      ...(calendar ? { generatedCalendarItem: referenceFromId(calendar._id) } : {}),
      ...(link ? { generatedLinkItem: referenceFromId(link._id) } : {}),
    }
  })

  await client
    .patch(plan._id)
    .set({
      generatedCampaigns: refsFromIds(mergeIds(refIdsFromRecords(plan.generatedCampaigns), [campaign._id])),
      generatedFunnels: refsFromIds(mergeIds(refIdsFromRecords(plan.generatedFunnels), [funnel._id])),
      generatedCalendarItems: refsFromIds(mergeIds(refIdsFromRecords(plan.generatedCalendarItems), createdCalendarItems.map((item) => item._id))),
      generatedLinkItems: refsFromIds(mergeIds(refIdsFromRecords(plan.generatedLinkItems), createdLinkItems.map((item) => item._id))),
      contentOpportunities: nextOpportunities,
      strategyAdjustments: normalizeResearchStrategyAdjustments([
        ...(plan.strategyAdjustments || []),
        {
          _key: randomKey(),
          _type: 'strategyAdjustment',
          decisionDate: toDateInputValue(new Date()),
          trigger: 'Generated linked records from selected research opportunities',
          reason: 'The plan had enough SEO, release timing, or contributor context to start production.',
          recommendation: 'Review the generated campaign, funnel, calendar items, and Quick Links before publishing.',
          affectedItems: selected.map((opportunity) => opportunity.title || 'Content opportunity'),
          decision: 'Generated linked CMS records.',
        },
      ]),
    })
    .commit()

  return {
    campaignId: campaign._id,
    funnelId: funnel._id,
    calendarItemIds: createdCalendarItems.map((item) => item._id),
    linkItemIds: createdLinkItems.map((item) => item._id),
  }
}

function buildResearchOpportunityBrief(plan: MarketingResearchPlan, opportunity: ResearchContentOpportunity) {
  const firstQuestion = plan.researchQuestions?.[0]
  const topEvidence = plan.evidenceNotes?.[0]
  const assumption = plan.assumptions?.[0]

  return [
    `Research plan: ${plan.title || 'Untitled plan'}`,
    plan.summary ? `Summary: ${plan.summary}` : '',
    plan.audience ? `Audience: ${plan.audience}` : '',
    firstQuestion?.question ? `Research question: ${firstQuestion.question}` : '',
    topEvidence?.claim ? `Evidence: ${topEvidence.claim}${topEvidence.confidence ? ` (${labelFor(researchConfidenceOptions, topEvidence.confidence) || topEvidence.confidence} confidence)` : ''}` : '',
    assumption?.assumption ? `Assumption to validate: ${assumption.assumption}` : '',
    opportunity.seoQuery ? `SEO target: ${opportunity.seoQuery}` : '',
    opportunity.sourceMaterial ? `Source material: ${opportunity.sourceMaterial}` : '',
    opportunity.owner ? `Owner/contributor: ${opportunity.owner}` : '',
    'Designer task: turn this opportunity into the selected format without re-solving the marketing strategy.',
  ]
    .filter(Boolean)
    .join('\n')
}

function firstReleaseWindowDate(plan: MarketingResearchPlan) {
  return (plan.releaseWindows || [])
    .map((window) => window.startDate)
    .filter(Boolean)
    .sort()[0]
}

function lastReleaseWindowDate(plan: MarketingResearchPlan) {
  return (plan.releaseWindows || [])
    .map((window) => window.endDate || window.startDate)
    .filter(Boolean)
    .sort()
    .at(-1)
}

function resolveOpportunityDate(plan: MarketingResearchPlan, opportunity: ResearchContentOpportunity, index: number) {
  const window = (plan.releaseWindows || []).find((candidate) => candidate.label === opportunity.releaseWindow)
  const base = window?.startDate || firstReleaseWindowDate(plan)
  if (base) return toDateInputValue(addDays(new Date(`${base}T12:00:00`), index * 3))
  return toDateInputValue(addDays(new Date(), 7 + index * 3))
}

function getResearchResultsForProject(data: MarketingData, projectId: string) {
  return data.researchResults.filter((result) => result.project?._id === projectId)
}

function getResearchRunsForProject(data: MarketingData, projectId: string) {
  return data.researchRuns.filter((run) => run.project?._id === projectId)
}

function getLatestActiveResearchProject(data: MarketingData) {
  return data.researchProjects.find((project) => (project.status || 'draft') !== 'archived') || null
}

function getCalendarItemsForResearchProject(data: MarketingData, project: MarketingResearchProject) {
  const generatedIds = new Set((project.generatedCalendarItems || []).map((item) => item._id).filter(Boolean))
  const related = data.calendarItems.filter((item) => item.researchProject?._id === project._id || generatedIds.has(item._id))
  return Array.from(new Map(related.map((item) => [item._id, item])).values())
}

function countGeneratedRecordsForResearchProject(data: MarketingData, project: MarketingResearchProject) {
  const ids = new Set<string>()
  for (const item of project.generatedCampaigns || []) if (item._id) ids.add(`campaign:${item._id}`)
  for (const item of project.generatedFunnels || []) if (item._id) ids.add(`funnel:${item._id}`)
  for (const item of project.generatedCalendarItems || []) if (item._id) ids.add(`calendar:${item._id}`)
  for (const item of project.generatedLinkItems || []) if (item._id) ids.add(`link:${item._id}`)
  data.campaigns.forEach((item) => item.researchProject?._id === project._id && ids.add(`campaign:${item._id}`))
  data.funnels.forEach((item) => item.researchProject?._id === project._id && ids.add(`funnel:${item._id}`))
  data.calendarItems.forEach((item) => item.researchProject?._id === project._id && ids.add(`calendar:${item._id}`))
  data.linkItems.forEach((item) => item.researchProject?._id === project._id && ids.add(`link:${item._id}`))
  return ids.size
}

function getSelectedResearchResultIds(project: MarketingResearchProject) {
  return new Set((project.selectedResults || []).map((result) => result._id).filter(Boolean))
}

function isResearchResultApproved(result: MarketingResearchResult) {
  return result.status === 'approved'
}

function describeResearchResult(result: MarketingResearchResult) {
  if (result.resultType === 'seoKeyword') {
    const scoreLabel =
      result.scoreSource === 'provider'
        ? [
            result.volume !== undefined ? `volume ${formatOptionalNumber(result.volume)}` : '',
            result.difficulty !== undefined ? `KD ${formatOptionalNumber(result.difficulty)}` : '',
          ]
            .filter(Boolean)
            .join(', ')
        : result.scoreSource === 'aiEstimate'
          ? 'AI-estimated keyword signal, not provider-scored'
          : 'keyword signal without provider scores'
    return `${result.keyword || result.title || 'Keyword'}${scoreLabel ? ` (${scoreLabel})` : ''}`
  }
  if (result.claim) return result.claim
  if (result.sourceTitle || result.sourceUrl) return [result.sourceTitle, result.sourceUrl].filter(Boolean).join(' / ')
  if (result.collaboratorName || result.organization) return [result.collaboratorName, result.organization, result.topicArea].filter(Boolean).join(' / ')
  return result.title || 'Research result'
}

function summarizeResearchResultForAi(result: MarketingResearchResult) {
  return {
    id: result._id,
    title: result.title,
    resultType: result.resultType,
    status: result.status,
    keyword: result.keyword,
    scoreSource: result.scoreSource,
    provider: result.provider,
    volume: result.scoreSource === 'provider' ? result.volume : undefined,
    difficulty: result.scoreSource === 'provider' ? result.difficulty : undefined,
    cpc: result.scoreSource === 'provider' ? result.cpc : undefined,
    competition: result.scoreSource === 'provider' ? result.competition : undefined,
    sourceTitle: result.sourceTitle,
    sourceUrl: result.sourceUrl,
    claim: result.claim,
    implication: result.implication,
    contentGap: result.contentGap,
  }
}

function formatOptionalNumber(value?: number) {
  return value === undefined || Number.isNaN(value) ? 'n/a' : new Intl.NumberFormat().format(value)
}

function formatOptionalMoney(value?: number) {
  return value === undefined || Number.isNaN(value) ? 'n/a' : `$${value.toFixed(2)}`
}

function stringListToText(items?: string[]) {
  return (items || []).join('\n')
}

function textToStringList(value: string) {
  return normalizeStringList(value.split(/\r?\n|,/))
}

function getRecordId(record?: { _id?: string } | ReferenceValue) {
  if (!record) return ''
  if ('_ref' in record) return record._ref
  return record._id || ''
}

function referenceFromId(id: string): ReferenceValue {
  return { _type: 'reference', _ref: id }
}

function refsFromRecords(records: Array<{ _id?: string } | ReferenceValue> | undefined) {
  return refsFromIds(refIdsFromRecords(records))
}

function refIdsFromRecords(records: Array<{ _id?: string } | ReferenceValue> | undefined) {
  return (records || []).map((record) => getRecordId(record)).filter(Boolean)
}

function mergeIds(existing: string[], next: string[]) {
  return Array.from(new Set([...existing, ...next].filter(Boolean)))
}

function getMarketingViewTitle(viewId: MarketingViewId) {
  return MARKETING_TOOL_VIEWS.find((view) => view.id === viewId)?.title || 'Section'
}

function formatDashboardDate(value?: string | Date) {
  if (!value) return 'No date'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function startOfDayValue(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function isConnectedAnalyticsSource(source: MarketingAnalyticsSource) {
  return source.status === 'connected'
}

function isCampaignMeasurable(campaign: MarketingCampaign) {
  return ['planned', 'active'].includes(campaign.status || '')
}

function isFunnelMeasurable(funnel: MarketingFunnel) {
  return ['draft', 'active', 'optimizing'].includes(funnel.status || '')
}

function isCalendarItemMeasurable(item: MarketingCalendarItem) {
  if (['idea', 'drafting', 'canceled'].includes(item.status || '')) return false
  return (
    ['review', 'scheduled', 'published'].includes(item.status || '') ||
    !!item.publishedUrl?.trim() ||
    !!item.workingUrl?.trim() ||
    !!item.utmCampaign?.trim()
  )
}

function isMarketingLinkActive(link: MarketingLinkItem) {
  return (link.status || 'active') === 'active'
}

function hasAnalyticsRefs(refs?: RefSummary[]) {
  return (refs || []).some((ref) => !!ref._id)
}

function campaignHasAnalytics(campaign: MarketingCampaign) {
  return hasAnalyticsRefs(campaign.analyticsSources) || (campaign.successMetrics || []).some((metric) => !!getRefId(metric.source))
}

function getRefId(ref?: RefSummary | ReferenceValue) {
  if (!ref) return ''
  if ('_id' in ref) return ref._id
  return ref._ref
}

function titleList<T>(items: T[], getTitle: (item: T) => string, limit: number) {
  const titles = Array.from(new Set(items.map(getTitle).map((title) => title.trim()).filter(Boolean)))
  const visible = titles.slice(0, limit)
  const remaining = Math.max(0, titles.length - visible.length)
  return remaining > 0 ? [...visible, `${remaining} more`] : visible
}

function getRecommendedAnalyticsCadence(sources: MarketingAnalyticsSource[]) {
  const cadenceRank = ['daily', 'weekly', 'monthly', 'quarterly', 'asNeeded']
  const currentCadence = sources
    .map((source) => source.reportingCadence)
    .filter((cadence): cadence is string => !!cadence)
    .sort((first, second) => cadenceRank.indexOf(first) - cadenceRank.indexOf(second))[0]

  return labelFor(
    [
      { title: 'Daily', value: 'daily' },
      { title: 'Weekly', value: 'weekly' },
      { title: 'Monthly', value: 'monthly' },
      { title: 'Quarterly', value: 'quarterly' },
      { title: 'As needed', value: 'asNeeded' },
    ],
    currentCadence || 'monthly',
  )
}

function getMarketingAttentionItems(data: MarketingData): MarketingAttentionItem[] {
  const now = new Date()
  const upcomingLimit = addDays(now, 30)
  const items: MarketingAttentionItem[] = []
  const missingStrategy = getMissingFoundationalStrategyInputs(data)

  if (missingStrategy.length > 0) {
    const hasResearchFindings = data.researchResults.length > 0
    items.push({
      id: 'strategy-foundation',
      title: 'Strategy foundation needs setup',
      detail: hasResearchFindings
        ? `Fill reusable ${missingStrategy.join(', ')} records from approved research before generating campaigns, funnels, calendar items, or drafts.`
        : `Run Research first, then use those findings to fill reusable ${missingStrategy.join(', ')} records.`,
      view: hasResearchFindings ? 'strategy' : 'research',
      severity: 'setup',
    })
  }

  if (data.channels.length === 0) {
    items.push({
      id: 'setup-channels',
      title: 'Add publishing channels',
      detail: 'Channels unlock useful content-type templates like Instagram carousel or email newsletter.',
      view: 'channels',
      severity: 'setup',
    })
  }

  if (data.analyticsSources.length === 0) {
    items.push({
      id: 'setup-analytics',
      title: 'Add at least one analytics source',
      detail: 'This gives campaigns and calendar items a place to point for measurement.',
      view: 'analytics',
      severity: 'measurement',
    })
  }

  if (data.linkItems.length === 0) {
    items.push({
      id: 'setup-link-tree',
      title: 'Set up /links for Instagram',
      detail: 'Create managed links, then connect recent social posts to their source content.',
      view: 'linkTree',
      severity: 'setup',
    })
  }

  data.campaigns
    .filter((campaign) => ['planned', 'active'].includes(campaign.status || ''))
    .forEach((campaign) => {
      const calendarCount = data.calendarItems.filter((item) => item.campaign?._id === campaign._id).length
      if (calendarCount === 0) {
        items.push({
          id: `campaign-content-${campaign._id}`,
          title: `${campaign.title || 'Campaign'} needs content items`,
          detail: 'Create at least one calendar item so the campaign has visible work attached.',
          view: 'calendar',
          severity: 'content',
        })
      }
      if ((campaign.channels || []).length === 0 && (campaign.channelRefs || []).length === 0) {
        items.push({
          id: `campaign-channel-${campaign._id}`,
          title: `${campaign.title || 'Campaign'} needs channels`,
          detail: 'Choose where this campaign will show up before designing assets.',
          view: 'campaigns',
          severity: 'setup',
        })
      }
      if ((campaign.funnels || []).length === 0) {
        items.push({
          id: `campaign-funnel-${campaign._id}`,
          title: `${campaign.title || 'Campaign'} needs a funnel`,
          detail: 'Attach a stage map so each content item has a clear next step.',
          view: 'campaigns',
          severity: 'setup',
        })
      }
      const missingStrategyRefs = [
        (campaign.audienceProfiles || []).length === 0 ? 'audience profile' : '',
        (campaign.ctas || []).length === 0 ? 'CTA' : '',
        (campaign.proofPoints || []).length === 0 ? 'proof point' : '',
        (campaign.experiments || []).length === 0 ? 'experiment' : '',
        !campaign.trackingRule?._id && !campaign.utmCampaign?.trim() ? 'tracking rule or UTM campaign' : '',
      ].filter(Boolean)
      if (missingStrategyRefs.length > 0) {
        items.push({
          id: `campaign-strategy-${campaign._id}`,
          title: `${campaign.title || 'Campaign'} needs strategy inputs`,
          detail: `Missing: ${missingStrategyRefs.join(', ')}.`,
          view: 'strategy',
          severity: 'setup',
        })
      }
    })

  data.calendarItems
    .filter((item) => {
      if (!item.publishAt || ['published', 'canceled'].includes(item.status || '')) return false
      const publishDate = new Date(item.publishAt)
      return publishDate >= now && publishDate <= upcomingLimit
    })
    .forEach((item) => {
      const missing = [
        !item.brief?.trim() ? 'brief' : '',
        !item.callToAction?.trim() ? 'CTA' : '',
        !item.workingUrl?.trim() ? 'working URL' : '',
        !item.campaign?._id && !item.funnel?._id ? 'campaign/funnel' : '',
        ['scheduled', 'published'].includes(item.status || '') && (item.qualityGates || []).length === 0 ? 'quality gate' : '',
      ].filter(Boolean)

      if (missing.length > 0) {
        items.push({
          id: `calendar-missing-${item._id}`,
          title: `${item.title || 'Calendar item'} needs ${missing[0]}`,
          detail: `Due ${toDateInputValue(item.publishAt)}. Missing: ${missing.join(', ')}.`,
          view: 'calendar',
          severity: 'content',
        })
      }
    })

  data.linkItems
    .filter(isMarketingLinkActive)
    .forEach((link) => {
      const missing = [
        !link.cta?._id ? 'CTA strategy' : '',
        !link.trackingRule?._id ? 'tracking rule' : '',
      ].filter(Boolean)
      if (missing.length > 0) {
        items.push({
          id: `link-strategy-${link._id}`,
          title: `${link.title || 'Quick Link'} needs destination strategy`,
          detail: `Missing: ${missing.join(', ')}.`,
          view: 'linkTree',
          severity: 'setup',
        })
      }
    })

  data.researchProjects
    .filter((project) => (project.status || 'draft') !== 'archived')
    .forEach((project) => {
      if ((project.audienceProfiles || []).length === 0 && (project.messagePillars || []).length === 0 && (project.proofPoints || []).length === 0 && (project.performanceSignals || []).length === 0) {
        items.push({
          id: `research-strategy-${project._id}`,
          title: `${project.title || 'Research project'} needs a strategy input`,
          detail: 'Connect at least one audience, message, proof point, or performance signal so research is directed by strategy rather than a generic topic.',
          view: 'research',
          severity: 'setup',
        })
      }
    })

  data.performanceSignals
    .filter((signal) => signal.status === 'suggestsUpdate')
    .forEach((signal) => {
      items.push({
        id: `performance-update-${signal._id}`,
        title: `${signal.title || 'Performance signal'} suggests a strategy update`,
        detail: signal.recommendation || signal.interpretation || 'Review this signal and decide whether audiences, messages, CTAs, channels, or timing should change.',
        view: 'strategy',
        severity: 'measurement',
      })
    })

  data.funnels
    .filter((funnel) => ['draft', 'active', 'optimizing'].includes(funnel.status || ''))
    .forEach((funnel) => {
      if ((funnel.stages || []).length < 3 || !(funnel.stages || []).some((stage) => stage.callToAction?.trim())) {
        items.push({
          id: `funnel-stage-${funnel._id}`,
          title: `${funnel.title || 'Funnel'} needs stage guidance`,
          detail: 'Use a funnel template or add goals and CTAs so designers know what each asset should do.',
          view: 'funnels',
          severity: 'setup',
        })
      }
    })

  return items
}

function getCalendarTemplate(id: string) {
  return CALENDAR_ITEM_TEMPLATES.find((template) => template.id === id)
}

function getCampaignTemplates(data?: Pick<MarketingData, 'templates'>) {
  const managed = (data?.templates || [])
    .filter((template) => template.kind === 'campaign' && template.status !== 'archived')
    .map(marketingTemplateToCampaignTemplate)
    .filter((template): template is CampaignTemplate => !!template)
  return [...managed, ...CAMPAIGN_TEMPLATES]
}

function getCampaignTemplate(id: string, data?: Pick<MarketingData, 'templates'>) {
  return getCampaignTemplates(data).find((template) => template.id === id)
}

function getFunnelTemplates(data?: Pick<MarketingData, 'templates'>) {
  const managed = (data?.templates || [])
    .filter((template) => template.kind === 'funnel' && template.status !== 'archived')
    .map(marketingTemplateToFunnelTemplate)
    .filter((template): template is FunnelTemplate => !!template)
  return [...managed, ...FUNNEL_TEMPLATES]
}

function getFunnelTemplate(id: string, data?: Pick<MarketingData, 'templates'>) {
  return getFunnelTemplates(data).find((template) => template.id === id)
}

function marketingTemplateToCampaignTemplate(template: MarketingTemplate): CampaignTemplate | null {
  if (template.kind !== 'campaign') return null
  return {
    id: template._id,
    title: template.title || 'Untitled campaign template',
    description: template.description || 'Managed campaign template.',
    whenToUse: template.whenToUse || 'Use this template when its goal, audience, and channel mix match the work.',
    campaignObjective: template.campaignObjective || 'awareness',
    primaryGoal: template.primaryGoal || '',
    primaryKpi: template.primaryKpi || '',
    audience: template.audience || '',
    topicCluster: template.topicCluster || '',
    searchIntent: template.searchIntent || 'learn',
    targetQueries: normalizeStringList(template.targetQueries || []),
    positioning: template.positioning || '',
    channels: normalizeStringList(template.channels || []),
    successMetrics: normalizeTemplateSuccessMetrics(template.successMetrics || []),
    designerGuidance: normalizeStringList(template.designerGuidance || []),
    notes: template.notes || '',
  }
}

function marketingTemplateToFunnelTemplate(template: MarketingTemplate): FunnelTemplate | null {
  if (template.kind !== 'funnel') return null
  return {
    id: template._id,
    title: template.title || 'Untitled funnel template',
    description: template.description || 'Managed funnel template.',
    audience: template.audience || '',
    conversionGoal: template.conversionGoal || '',
    stages: normalizeFunnelStages(template.stages || []),
  }
}

function normalizeTemplateSuccessMetrics(metrics: Array<{ label?: string; target?: string }>) {
  return metrics
    .map((metric) => ({
      label: metric.label?.trim() || '',
      target: metric.target?.trim() || '',
    }))
    .filter((metric) => metric.label || metric.target)
}

function getChannelOptions(channels: MarketingChannel[]) {
  return channels
    .filter((channel) => channel.key && channel.status !== 'archived')
    .map((channel) => ({
      title: channel.title || channel.key || 'Untitled channel',
      value: channel.key || '',
    }))
}

function defaultMarketingPlanQuestionnaire(): MarketingPlanQuestionnaire {
  return {
    topic: '',
    objective: 'awareness',
    audience: '',
    destinationUrl: '',
    runway: 'twoWeeks',
    contentCapacity: 'multiChannel',
    primaryMetric: '',
    notes: '',
  }
}

function buildDesignerWorkflowDemoRecommendation(): MarketingAiSuggestion {
  const today = new Date()
  const startDate = toDateInputValue(addDays(today, 7))
  const endDate = toDateInputValue(addDays(today, 21))

  return {
    summary: 'Demo recommendation for a Housing Truths Instagram carousel about Boston housing statistics.',
    rationale: [
      'The example shows how the assistant turns a broad content idea into an editable research plan first.',
      'A short release window keeps the work practical for designers while still delaying campaign, funnel, calendar, and Quick Link creation until Research is reviewed.',
      'The demo is local-only and does not save CMS records when created.',
    ],
    siteReferences: [
      {
        title: 'Housing Truths',
        url: 'https://housingtruths.org',
        note: 'Example destination for the demo Quick Link and calendar item.',
      },
    ],
    researchPlan: {
      title: 'Housing Truths Boston Instagram plan',
      status: 'draft',
      summary: 'Use one carousel to make Boston housing statistics legible, then point people to the Housing Truths site for deeper context.',
      audience: 'People in Boston who care about housing policy, civic data, and visual explanations.',
      positioning: 'Lead with one concrete statistic, show what it means visually, and give people a durable place to keep reading.',
      campaignObjective: 'awareness',
      canonicalUrl: 'https://housingtruths.org',
      releaseCadence: 'campaignBased',
      contentPillars: [
        {
          _key: 'demo-pillar-boston-housing',
          _type: 'contentPillar',
          title: 'Boston housing pressure',
          audienceNeed: 'Understand the scale of the housing problem without reading a policy brief.',
          angle: 'Use one memorable visual comparison as the entry point.',
          exampleFormats: ['carousel', 'linkPost'],
        },
      ],
      seoTargets: [
        {
          _key: 'demo-seo-boston-housing-statistics',
          _type: 'seoTarget',
          query: 'Boston housing statistics',
          intent: 'learn',
          priority: 'medium',
          canonicalUrl: 'https://housingtruths.org',
          contentGap: 'The linked page should clearly explain where the statistic comes from and why it matters.',
        },
      ],
      channels: [
        {
          _key: 'demo-channel-instagram',
          _type: 'recommendedChannel',
          channelKey: 'instagram',
          rationale: 'Best fit for a visual carousel that can point to the link page.',
          cadence: 'One carousel, then one follow-up story or post if the topic gets attention.',
          priority: 'high',
        },
      ],
      releaseWindows: [
        {
          _key: 'demo-window-two-week',
          _type: 'releaseWindow',
          label: 'Two-week demo release window',
          startDate,
          endDate,
          goal: 'Draft the carousel, publish it, and review whether people click through.',
          priority: 'medium',
        },
      ],
      contentOpportunities: [
        {
          _key: 'demo-opportunity-carousel',
          _type: 'contentOpportunity',
          title: 'Housing Truths Boston statistics carousel',
          channel: 'instagram',
          format: 'carousel',
          owner: 'Designer',
          releaseWindow: 'Two-week demo release window',
          callToAction: 'See the source on Housing Truths',
          sourceMaterial: 'Housing Truths public site and Boston housing data references.',
          destinationUrl: 'https://housingtruths.org',
          readiness: 'ready',
          seoQuery: 'Boston housing statistics',
          priority: 'high',
          selected: true,
          notes: 'Demo-only recommendation. Creating this from the tutorial does not save records.',
        },
      ],
      measurementGoals: [
        {
          _key: 'demo-measurement-clicks',
          _type: 'measurementGoal',
          label: 'Instagram profile/link clicks',
          target: 'Use as a directional signal that the carousel made people want the source.',
        },
      ],
    },
  }
}

function buildDesignerWorkflowDemoResult(questionnaire: MarketingPlanQuestionnaire): CarouselWizardResult {
  return {
    demo: true,
    researchProjectId: 'demo-research-project',
    title: `${normalizeMarketingPlanQuestionnaire(questionnaire).topic} demo research project`,
  }
}

function loadDesignerWorkflowTutorialCompletions(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DESIGNER_WORKFLOW_TUTORIAL_STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function hasDesignerWorkflowTutorialCompleted(tutorialId: string) {
  return Boolean(loadDesignerWorkflowTutorialCompletions()[tutorialId])
}

function markDesignerWorkflowTutorialComplete(tutorialId: string) {
  if (typeof window === 'undefined') return
  const completions = loadDesignerWorkflowTutorialCompletions()
  window.localStorage.setItem(DESIGNER_WORKFLOW_TUTORIAL_STORAGE_KEY, JSON.stringify({ ...completions, [tutorialId]: true }))
}

function loadDesignerWorkflowSessions(): DesignerWorkflowSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DESIGNER_WORKFLOW_SESSIONS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeDesignerWorkflowSession)
      .filter((session): session is DesignerWorkflowSession => !!session)
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
      .slice(0, 24)
  } catch (err) {
    console.error('Designer workflow sessions could not load:', err)
    return []
  }
}

function saveDesignerWorkflowSessions(sessions: DesignerWorkflowSession[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DESIGNER_WORKFLOW_SESSIONS_STORAGE_KEY, JSON.stringify(sessions.filter((session) => !session.ephemeral).slice(0, 24)))
  } catch (err) {
    console.error('Designer workflow sessions could not save:', err)
  }
}

function loadActiveDesignerWorkflowSessionId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(DESIGNER_WORKFLOW_ACTIVE_SESSION_STORAGE_KEY) || null
}

function saveActiveDesignerWorkflowSessionId(sessionId: string | null) {
  if (typeof window === 'undefined') return
  if (sessionId) {
    window.localStorage.setItem(DESIGNER_WORKFLOW_ACTIVE_SESSION_STORAGE_KEY, sessionId)
  } else {
    window.localStorage.removeItem(DESIGNER_WORKFLOW_ACTIVE_SESSION_STORAGE_KEY)
  }
}

function normalizeDesignerWorkflowSession(value: unknown): DesignerWorkflowSession | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<DesignerWorkflowSession>
  const mode = record.mode === 'singleItem' || record.mode === 'plan' ? record.mode : null
  if (!record.id || !mode) return null
  const questionnaire = normalizeStoredQuestionnaire(record.questionnaire)
  return prepareDesignerWorkflowSession({
    id: String(record.id),
    title: typeof record.title === 'string' ? record.title : '',
    mode,
    stepIndex: typeof record.stepIndex === 'number' ? Math.max(0, Math.min(2, record.stepIndex)) : 0,
    strategyStepIndex: typeof record.strategyStepIndex === 'number' ? Math.max(0, record.strategyStepIndex) : 0,
    questionnaire,
    strategyPrompt: typeof record.strategyPrompt === 'string' ? record.strategyPrompt : '',
    strategySuggestion: record.strategySuggestion && typeof record.strategySuggestion === 'object' ? record.strategySuggestion : null,
    strategyUsedAi: typeof record.strategyUsedAi === 'boolean' ? record.strategyUsedAi : null,
    result: record.result && typeof record.result === 'object' ? record.result : null,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  })
}

function normalizeStoredQuestionnaire(value: unknown): MarketingPlanQuestionnaire {
  const defaults = defaultMarketingPlanQuestionnaire()
  if (!value || typeof value !== 'object') return defaults
  const record = value as Partial<MarketingPlanQuestionnaire>
  return {
    topic: typeof record.topic === 'string' ? record.topic : defaults.topic,
    objective: typeof record.objective === 'string' ? record.objective : defaults.objective,
    audience: typeof record.audience === 'string' ? record.audience : defaults.audience,
    destinationUrl: typeof record.destinationUrl === 'string' ? record.destinationUrl : defaults.destinationUrl,
    runway: record.runway === 'oneWeek' || record.runway === 'twoWeeks' || record.runway === 'oneMonth' ? record.runway : defaults.runway,
    contentCapacity:
      record.contentCapacity === 'oneItem' || record.contentCapacity === 'weeklyCarousel' || record.contentCapacity === 'multiChannel'
        ? record.contentCapacity
        : defaults.contentCapacity,
    primaryMetric: typeof record.primaryMetric === 'string' ? record.primaryMetric : defaults.primaryMetric,
    notes: typeof record.notes === 'string' ? record.notes : defaults.notes,
  }
}

function createDesignerWorkflowSession(mode: DesignerWizardMode): DesignerWorkflowSession {
  const now = new Date().toISOString()
  const questionnaire = {
    ...defaultMarketingPlanQuestionnaire(),
    contentCapacity: mode === 'singleItem' ? 'oneItem' : 'multiChannel',
  } satisfies MarketingPlanQuestionnaire
  return prepareDesignerWorkflowSession({
    id: `designer-${Date.now()}-${randomKey()}`,
    title: '',
    mode,
    stepIndex: 0,
    strategyStepIndex: 0,
    questionnaire,
    strategyPrompt: '',
    strategySuggestion: null,
    strategyUsedAi: null,
    result: null,
    createdAt: now,
    updatedAt: now,
  })
}

function prepareDesignerWorkflowSession(session: DesignerWorkflowSession): DesignerWorkflowSession {
  return {
    ...session,
    title: designerWorkflowSessionTitle(session),
  }
}

function designerWorkflowSessionTitle(session: DesignerWorkflowSession) {
  return (
    session.result?.title ||
    session.questionnaire.topic?.trim() ||
    inferPromptTitle(session.strategyPrompt) ||
    (session.mode === 'plan' ? 'New planning session' : 'New content item session')
  )
}

function formatWorkflowSessionTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recently'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function normalizeMarketingPlanQuestionnaire(questionnaire: MarketingPlanQuestionnaire): MarketingPlanQuestionnaire {
  const topic = questionnaire.topic.trim() || 'Untitled marketing setup'
  return {
    topic,
    objective: questionnaire.objective || 'awareness',
    audience: questionnaire.audience.trim() || 'People who need a clear, useful explanation of this work.',
    destinationUrl: questionnaire.destinationUrl.trim() || 'https://www.goinvo.com',
    runway: questionnaire.runway || 'twoWeeks',
    contentCapacity: questionnaire.contentCapacity || 'multiChannel',
    primaryMetric: questionnaire.primaryMetric.trim() || 'Qualified visits or replies',
    notes: questionnaire.notes.trim(),
  }
}

function buildWizardStrategyDraft(data: MarketingData, questionnaire: MarketingPlanQuestionnaire): Record<string, unknown> {
  const stats = getMarketingDashboardStats(data)
  const gaps = getMarketingDashboardGaps(data).slice(0, 6)
  const latestProject = getLatestActiveResearchProject(data)
  const starterTitle = latestProject?.title || questionnaire.topic || ''
  const researchType = latestProject?.researchType || inferResearchProjectType(`${questionnaire.topic} ${questionnaire.notes || ''}`)

  return {
    title: starterTitle,
    status: 'draft',
    researchType,
    brief: latestProject?.brief || [
      `Content runway: ${stats.contentRunwayDays} days.`,
      `${stats.upcomingItems.length} upcoming calendar items; ${stats.coveredDaysNext30}/30 days covered.`,
      `${stats.activeCampaigns} active campaigns; ${stats.campaignsWithUpcomingContent} have upcoming content.`,
      `${data.channels.filter((channel) => channel.status !== 'archived').length} active channels.`,
      `${data.linkItems.filter((link) => link.status !== 'archived').length} Quick Links.`,
      `${data.researchProjects.filter((project) => project.status !== 'archived').length} research projects.`,
    ].join(' '),
    audience: questionnaire.audience,
    campaignObjective: questionnaire.objective || 'awareness',
    canonicalUrl: questionnaire.destinationUrl || '',
    planningNeed: stats.upcomingItems.length === 0 ? 'No upcoming content is scheduled.' : 'Find the next research-backed content opportunity.',
    currentResearchProject: latestProject
      ? {
          title: latestProject.title,
          status: latestProject.status,
          researchType: latestProject.researchType,
          brief: latestProject.brief,
          seedKeywords: latestProject.seedKeywords,
          resultCount: getResearchResultsForProject(data, latestProject._id).length,
          approvedResultCount: getResearchResultsForProject(data, latestProject._id).filter(isResearchResultApproved).length,
          generatedRecordCount: countGeneratedRecordsForResearchProject(data, latestProject),
        }
      : null,
    releaseCadence: 'campaignBased',
    internalNotes: [
      'Designer Workflow strategy agent should recommend the next setup move based on the full marketing state.',
      'If a current research project exists, recommend the next action inside it rather than creating a duplicate.',
      'Treat research projects as the planning wrapper; campaigns and funnels are downstream generated records paired to that project.',
      'If the optional prompt names a channel, topic, location, post, contributor, or project, use that as direction.',
      gaps.length > 0 ? `Current gaps: ${gaps.map((gap) => `${gap.title} (${gap.action})`).join('; ')}` : 'No urgent dashboard gaps found.',
      stats.channelCoverage.length > 0
        ? `Channel coverage: ${stats.channelCoverage.map((channel) => `${channel.title}: ${channel.upcoming30Count} upcoming`).join('; ')}`
        : 'No channel coverage data yet.',
    ].join('\n'),
  }
}

function buildWizardStrategyPrompt(data: MarketingData, questionnaire: MarketingPlanQuestionnaire, userPrompt: string) {
  const stats = getMarketingDashboardStats(data)
  const gaps = getMarketingDashboardGaps(data).slice(0, 5)
  const direction = userPrompt.trim()
  const latestProject = getLatestActiveResearchProject(data)
  const latestProjectLine = latestProject
    ? `Latest research project: ${latestProject.title || 'Untitled research project'} with ${getResearchResultsForProject(data, latestProject._id).length} research findings and ${countGeneratedRecordsForResearchProject(data, latestProject)} paired downstream records.`
    : 'Latest research project: none. The next step may be creating the first research project.'

  return [
    'Act like a marketing strategist for designers. Review the current GoInvo marketing state and suggest the next setup step.',
    'Return a researchProject setup only when no usable current project exists. If a current project exists, explain the next action inside it instead of creating another project.',
    'Treat the research project as the planning wrapper. Campaigns, funnels, calendar items, and Quick Links are paired downstream after selected research findings justify them.',
    'Do not ask the designer to invent marketing strategy from scratch. Pick the best next move and make the fields or action reviewable.',
    'Make the long-term thinking obvious: why this work matters, how it builds a durable topic thread, and what signal should be checked next.',
    direction ? `User direction: ${direction}` : 'User direction: none. Choose the most useful next planning move from the current state.',
    `Current state: ${stats.contentRunwayDays} runway days, ${stats.upcomingItems.length} upcoming items, ${stats.activeCampaigns} active campaigns, ${data.channels.length} channels, ${data.linkItems.length} Quick Links.`,
    latestProjectLine,
    gaps.length > 0 ? `Known gaps: ${gaps.map((gap) => `${gap.title}: ${gap.action}`).join(' | ')}` : 'Known gaps: no critical gaps detected.',
  ].join('\n')
}

function questionnaireFromStrategySuggestion(
  suggestion: MarketingAiSuggestion,
  current: MarketingPlanQuestionnaire,
  data: MarketingData,
): MarketingPlanQuestionnaire {
  const project = suggestion.researchProject || {}
  const plan = suggestion.researchPlan || {}
  const opportunity = plan.contentOpportunities?.find((item) => item.selected) || plan.contentOpportunities?.[0]
  const seoTarget = plan.seoTargets?.[0]
  const measurement = plan.measurementGoals?.[0]
  const releaseWindow = plan.releaseWindows?.[0]
  const destinationUrl =
    aiString(opportunity?.destinationUrl) ||
    aiString(project.canonicalUrl) ||
    aiString(plan.canonicalUrl) ||
    aiString(seoTarget?.canonicalUrl) ||
    data.linkItems.find((link) => link.status !== 'archived' && link.url)?.url ||
    current.destinationUrl
  const notes = [
    aiString(project.brief),
    aiString(project.positioning),
    project.seedKeywords?.length ? `Seed keywords: ${project.seedKeywords.join(', ')}` : '',
    aiString(plan.summary),
    aiString(plan.positioning),
    opportunity?.sourceMaterial ? `Source: ${opportunity.sourceMaterial}` : '',
    opportunity?.notes ? `Opportunity notes: ${opportunity.notes}` : '',
    seoTarget?.query ? `SEO/query target: ${seoTarget.query}` : '',
    suggestion.rationale?.length ? `Why this setup: ${suggestion.rationale.slice(0, 3).join(' ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    topic: stripResearchProjectSuffix(aiString(opportunity?.title) || aiString(project.title) || aiString(plan.title) || aiString(suggestion.summary) || current.topic),
    objective: aiOption(project.campaignObjective, campaignObjectiveOptions) || aiOption(plan.campaignObjective, campaignObjectiveOptions) || current.objective || 'awareness',
    audience: aiString(project.audience) || aiString(plan.audience) || current.audience,
    destinationUrl: destinationUrl || current.destinationUrl,
    runway: inferQuestionnaireRunway(releaseWindow) || current.runway,
    contentCapacity: inferQuestionnaireCapacity(plan) || current.contentCapacity,
    primaryMetric: [measurement?.label, measurement?.target].filter(Boolean).join(': ') || current.primaryMetric,
    notes: notes || current.notes,
  }
}

function inferQuestionnaireRunway(window?: ResearchReleaseWindow): MarketingPlanQuestionnaire['runway'] | undefined {
  if (!window?.startDate || !window.endDate) return undefined
  const start = new Date(window.startDate)
  const end = new Date(window.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))
  if (days <= 8) return 'oneWeek'
  if (days <= 17) return 'twoWeeks'
  return 'oneMonth'
}

function inferQuestionnaireCapacity(plan: Partial<MarketingResearchPlan>): MarketingPlanQuestionnaire['contentCapacity'] | undefined {
  const opportunityCount = plan.contentOpportunities?.length || 0
  const channelCount = new Set((plan.channels || []).map((channel) => channel.channelKey).filter(Boolean)).size
  if (opportunityCount > 2 || channelCount > 2) return 'multiChannel'
  if (opportunityCount === 2) return 'weeklyCarousel'
  if (opportunityCount === 1) return 'oneItem'
  return undefined
}

function buildFallbackWizardStrategySuggestion(
  data: MarketingData,
  questionnaire: MarketingPlanQuestionnaire,
  prompt: string,
): MarketingAiSuggestion {
  const stats = getMarketingDashboardStats(data)
  const today = new Date()
  const fallbackSource = data.linkItems.find((link) => link.status !== 'archived' && link.title && link.url)
  const title = stripResearchProjectSuffix(
    inferPromptTitle(prompt) ||
      (isDashboardGapTopic(questionnaire.topic) ? '' : questionnaire.topic) ||
      fallbackSource?.title ||
      (stats.upcomingItems.length === 0 ? 'GoInvo site content' : 'GoInvo marketing content'),
  )
  const destinationUrl =
    questionnaire.destinationUrl ||
    fallbackSource?.url ||
    data.linkItems.find((link) => link.status !== 'archived' && link.url)?.url ||
    ''
  const startDate = toDateInputValue(today)
  const endDate = toDateInputValue(addDays(today, 14))
  const seedKeywords = inferTargetQueries(title).slice(0, 6)
  const researchType = inferResearchProjectType(`${prompt} ${questionnaire.topic} ${questionnaire.notes || ''}`)

  return {
    summary: `Suggested ${title} as the next research project because release records should be generated from reviewed evidence, not from an empty plan.`,
    rationale: [
      stats.contentRunwayDays < 14
        ? 'The current content runway is short, so the next useful move is a scheduled, connected content item.'
        : 'The current plan has enough baseline coverage, so the next useful move should strengthen a clear topic opportunity.',
      'The setup should collect SEO scores, source evidence, and content gaps before campaign or funnel records are created.',
      'The campaign and funnel should stay paired to this plan once research has enough reviewed results.',
    ],
    siteReferences: [],
    researchProject: {
      title: `${stripResearchProjectSuffix(title)} research project`,
      status: 'draft',
      researchType,
      brief: `Research ${stripResearchProjectSuffix(title)} before generating campaigns, funnels, calendar items, or Quick Links. Focus first on SEO demand, source evidence, and content gaps for the ${startDate} to ${endDate} release window.`,
      audience: questionnaire.audience || 'People who need a clear, visual explanation of the topic.',
      positioning: 'Lead with a useful visual insight, support it with one concrete statistic or artifact, then point to the source destination.',
      campaignObjective: questionnaire.objective || 'awareness',
      canonicalUrl: destinationUrl,
      seedKeywords,
      seedUrls: [destinationUrl].filter(Boolean),
      targetGeography: 'us',
      language: 'en',
      methods: defaultResearchMethodsForType(researchType),
      researchQuestions: buildResearchQuestionsForType(researchType, stripResearchProjectSuffix(title)),
      collaborators: [],
      internalNotes: 'Rule-based fallback from Designer Workflow. Run research and approve results before generating downstream campaign, funnel, calendar, or Quick Link records.',
    },
  }
}

function inferPromptTitle(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, ' ')
  const quoted = normalized.match(/["']([^"']+)["']/)?.[1]?.trim()
  if (quoted) return quoted
  const called = normalized.match(/\bcalled\s+(.+)$/i)?.[1]?.trim()
  if (called) return called.replace(/[.!?]+$/, '')
  const planFor = normalized.match(/\b(?:plan|strategy|calendar)\s+for\s+(?:our\s+|the\s+)?(.+)$/i)?.[1]?.trim()
  if (planFor) return planFor.replace(/[.!?]+$/, '')
  const about = normalized.match(/\babout\s+(.+?)(?:\s+called\b|[.!?]?$)/i)?.[1]?.trim()
  if (about) return about.replace(/[.!?]+$/, '')
  return normalized ? normalized.slice(0, 90) : ''
}

function inferResearchProjectType(value: string | undefined) {
  const text = (value || '').toLowerCase()
  if (/\b(competitor|competitive|comparables?|benchmark|landscape|others?|peer|rival)\b/.test(text)) return 'competitor'
  if (/\b(strategy|strategic|positioning|goals?|funnel|campaign direction|roadmap|plan|planning|prioriti[sz]e)\b/.test(text)) return 'strategy'
  return 'topic'
}

function stripResearchProjectSuffix(value: string) {
  const stripped = value.trim().replace(/\s+research\s+(?:project|plan)$/i, '')
  return stripped || value
}

function normalizeResearchProjectTopic(value: string, fallback: string) {
  const stripped = stripResearchProjectSuffix(value)
    .replace(/\s+content\s+thread$/i, '')
    .trim()
  if (!stripped || isDashboardGapTopic(stripped)) return fallback || 'GoInvo site content'
  return stripped
}

function labelFromUrl(value: string) {
  if (!value) return 'GoInvo site content'
  try {
    const url = new URL(value)
    const pathParts = url.pathname.split('/').filter(Boolean)
    if (url.hostname.includes('housingtruths.org')) return 'Housing Truths'
    if (pathParts.length > 0) return labelizeAiField(pathParts[pathParts.length - 1])
    if (url.hostname.includes('goinvo.com')) return 'GoInvo site content'
    return url.hostname.replace(/^www\./, '')
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') || 'GoInvo site content'
  }
}

function getResearchProjectNextStepRecommendation(
  data: MarketingData,
  project: MarketingResearchProject,
  questionnaire: MarketingPlanQuestionnaire,
  prompt: string,
): StrategyAssistantRecommendation {
  const topic = stripResearchProjectSuffix(project.title || inferPromptTitle(prompt) || questionnaire.topic || 'the current plan')
  const projectResults = getResearchResultsForProject(data, project._id)
  const approvedResults = projectResults.filter(isResearchResultApproved)
  const selectedIds = getSelectedResearchResultIds(project)
  const selectedApprovedResults = approvedResults.filter((result) => selectedIds.has(result._id) || result.selectedForSynthesis)
  const generatedCount = countGeneratedRecordsForResearchProject(data, project)
  const relatedCalendarItems = getCalendarItemsForResearchProject(data, project)
  const draftCalendarItems = relatedCalendarItems.filter((item) => getCalendarItemDisplayGroup(item) === 'draft')
  const finalCalendarItems = relatedCalendarItems.filter((item) => getCalendarItemDisplayGroup(item) === 'final')
  const runs = getResearchRunsForProject(data, project._id)
  const strategicContext = buildStrategyAssistantContext({
    data,
    project,
    questionnaire,
    recommendationTopic: topic,
  })

  if (projectResults.length === 0) {
    return {
      title: `Run research for ${topic}`,
      detail: runs.length > 0
        ? 'The latest research project has a run, but no stored findings are ready yet. Re-run or inspect the run before making release records.'
        : 'The latest research project exists. The next step is to gather SEO, CMS, and source findings before generating any campaign, funnel, calendar, or Quick Link records.',
      view: 'research',
      strategicContext,
      steps: [
        'Open Research and confirm the seed keywords, URLs, and collaborators.',
        'Run Semrush, CMS, and source research for the current project.',
        'Review the findings before creating downstream records.',
      ],
    }
  }

  if (approvedResults.length === 0) {
    return {
      title: `Review research findings for ${topic}`,
      detail: `${projectResults.length} finding${projectResults.length === 1 ? '' : 's'} are stored, but none are approved yet. Designers should approve the findings that are strong enough to shape content.`,
      view: 'research',
      strategicContext,
      steps: [
        'Open the Research findings page for the latest project.',
        'Approve credible SEO, source, analytics, or collaborator findings.',
        'Select the approved findings that should drive the generated records.',
      ],
    }
  }

  if (selectedApprovedResults.length === 0) {
    return {
      title: `Select the strongest findings for ${topic}`,
      detail: `${approvedResults.length} approved finding${approvedResults.length === 1 ? '' : 's'} are available. Select the ones that should justify the paired campaign, funnel, calendar, and Quick Link records.`,
      view: 'research',
      strategicContext,
      steps: [
        'Open the latest Research project.',
        'Select the approved findings that support a real release.',
        'Use those selected findings to synthesize opportunities.',
      ],
    }
  }

  if (generatedCount === 0) {
    return {
      title: `Create paired records for ${topic}`,
      detail: `${selectedApprovedResults.length} approved finding${selectedApprovedResults.length === 1 ? ' is' : 's are'} selected. Now the research project is ready to generate its linked campaign, funnel, draft calendar items, and Quick Links.`,
      view: 'research',
      strategicContext,
      steps: [
        'Open the latest Research project.',
        'Generate records from selected approved findings.',
        'Review the paired campaign and funnel before writing the content.',
      ],
    }
  }

  if (draftCalendarItems.length > 0) {
    return {
      title: `Finish draft content for ${topic}`,
      detail: `${draftCalendarItems.length} draft item${draftCalendarItems.length === 1 ? '' : 's'} are paired to this research project. The next useful move is to assign dates and write the actual content.`,
      view: 'calendar',
      strategicContext,
      steps: [
        'Open Calendar and filter around the project draft items.',
        'Assign publish dates, working URLs, and owners.',
        'Move ready items to scheduled once the content is final.',
      ],
    }
  }

  if (finalCalendarItems.length > 0) {
    return {
      title: `Check signals for ${topic}`,
      detail: `${finalCalendarItems.length} item${finalCalendarItems.length === 1 ? ' is' : 's are'} scheduled or published. Look for early evidence before expanding the plan.`,
      view: 'analytics',
      strategicContext,
      steps: [
        'Review the connected analytics signals for the research-backed release.',
        'Note whether visits, saves, replies, or conversions are improving.',
        'Use the takeaway to decide whether to reuse, adjust, or pause the next release.',
      ],
    }
  }

  return {
    title: `Review the paired records for ${topic}`,
    detail: 'This research project has generated downstream records, but no calendar item is clearly draft or final. Check the Research links before adding more.',
    view: 'research',
    strategicContext,
    steps: [
      'Open the latest Research project.',
      'Confirm the paired campaign and funnel still match the approved findings.',
      'Create or repair draft calendar items from the selected research if needed.',
    ],
  }
}

function getStrategyAssistantRecommendation(
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
  prompt: string,
  preferSuggestion = false,
): StrategyAssistantRecommendation {
  const missingStrategy = getMissingFoundationalStrategyInputs(data)
  const latestProject = getLatestActiveResearchProject(data)
  const strategyResearchResults = getStrategyResearchResults(data)
  if (missingStrategy.length > 0 && !preferSuggestion) {
    if (strategyResearchResults.length > 0) {
      const approvedCount = data.researchResults.filter(isResearchResultApproved).length
      return {
        title: 'Fill strategy from research',
        detail: `${strategyResearchResults.length} research finding${strategyResearchResults.length === 1 ? ' is' : 's are'} available. Use them to draft the missing ${missingStrategy.join(', ')} strategy inputs, then save only the records that feel right.`,
        view: 'strategy',
        strategicContext: [
          {
            title: 'Why research first',
            detail: 'The strategy foundation should reuse evidence we have already gathered instead of asking designers to invent audiences, messages, proof, and CTAs from scratch.',
          },
          {
            title: 'How to use it',
            detail: 'Open Strategy, choose a missing foundation section, add or select a record, then use Fill from research to draft the fields from stored findings.',
          },
          {
            title: 'Review standard',
            detail: approvedCount > 0 ? `${approvedCount} approved finding${approvedCount === 1 ? ' is' : 's are'} ready to use as stronger source material.` : 'No findings are approved yet, so treat the filled fields as a draft and approve the strongest research when possible.',
          },
          {
            title: 'Designer impact',
            detail: 'Once saved, these strategy records can carry into campaigns, funnels, calendar items, Quick Links, and content drafts.',
          },
        ],
        steps: [
          'Open Strategy and choose Foundation.',
          `Add or select a missing record: ${missingStrategy.join(', ')}.`,
          'Click Fill from research, review the draft, then save it.',
        ],
      }
    }

    return {
      title: 'Start with research',
      detail: `The strategy foundation is missing ${missingStrategy.join(', ')}, but there are no research findings to draw from yet. Create or run a Research project first, then use those findings to fill strategy records.`,
      view: 'research',
      strategicContext: [
        {
          title: 'Why research first',
          detail: 'Research gives the strategy foundation real inputs: SEO demand, source evidence, content gaps, competitor examples, analytics signals, and collaborator notes.',
        },
        {
          title: 'Designer impact',
          detail: 'Designers should be able to fill strategy from reviewed findings, then focus on making the actual content.',
        },
        {
          title: 'Next move',
          detail: 'Open Research, define the project, run research, approve findings, then return to Strategy to fill the reusable records.',
        },
        {
          title: 'Scope',
          detail: 'A small research project is enough. You only need the findings that justify the next audience, message, proof point, CTA, tracking rule, and quality gate.',
        },
      ],
      steps: [
        'Open Research from the top navigation.',
        'Create or run the research project for the topic.',
        'Approve the useful findings, then fill Strategy from those findings.',
      ],
    }
  }

  if (latestProject && !preferSuggestion) {
    return getResearchProjectNextStepRecommendation(data, latestProject, questionnaire, prompt)
  }

  const project = suggestion?.researchProject
  const plan = suggestion?.researchPlan
  const opportunity = plan?.contentOpportunities?.find((item) => item.selected) || plan?.contentOpportunities?.[0]
  const suggestedQuestionnaire = suggestion ? questionnaireFromStrategySuggestion(suggestion, questionnaire, data) : questionnaire
  const channelKey = opportunity?.channel || plan?.channels?.[0]?.channelKey || (prompt.toLowerCase().includes('instagram') ? 'instagram' : undefined)
  const recommendationTopic = getStrategyRecommendationTopic({
    data,
    opportunityTitle: opportunity?.title,
    planTitle: project?.title || plan?.title,
    questionnaireTopic: suggestedQuestionnaire.topic,
    prompt,
    channelKey,
    format: opportunity?.format,
  })
  const channelExists = channelKey
    ? data.channels.some((channel) => channel.status !== 'archived' && (channel.key === channelKey || channel.title?.toLowerCase() === channelKey.toLowerCase()))
    : true
  const strategicContext = buildStrategyAssistantContext({
    data,
    project,
    plan,
    opportunity,
    questionnaire: suggestedQuestionnaire,
    recommendationTopic,
    channelKey,
  })

  if (channelKey && !channelExists) {
    return {
      title: `Set up ${labelFor(getChannelOptions(data.channels), channelKey) || channelKey} first`,
      detail: 'The idea needs a channel recommendation before the later calendar records can offer the right formats.',
      view: 'channels',
      strategicContext,
      steps: [
        `Add or confirm ${channelKey} as a channel.`,
        'Create the first research project with that channel in mind.',
        'Run and review research before generating paired campaign and funnel records.',
      ],
    }
  }

  if (project || prompt.toLowerCase().includes('plan') || (plan?.contentOpportunities?.length || 0) > 1) {
    return {
      title: `Create the first research project for ${lowercaseGenericPlanningPhrase(recommendationTopic)}`,
      detail: 'No reusable research project exists yet. Start in Research; campaigns, funnels, calendar items, and Quick Links should be generated from selected findings after review.',
      view: 'research',
      strategicContext,
      steps: [
        'Create the first research project from this recommendation.',
        'Run Semrush/source research and approve the findings worth using.',
        'Generate paired campaign, funnel, calendar, and Quick Link records from selected findings.',
      ],
    }
  }

  if (opportunity) {
    return {
      title: `Research ${recommendationTopic}`,
      detail: 'This looks like one content item, but the clean path is still to capture the research project before creating a calendar item.',
      view: 'research',
      strategicContext,
      steps: [
        'Create the first research project.',
        'Review the source material and SEO inputs in Research.',
        'Generate the calendar item and Quick Link only after findings are approved.',
      ],
    }
  }

  return {
    title: 'Start in Research',
    detail: 'The next move is to create a Research project, then let approved findings drive any campaign, funnel, calendar, or link records.',
    view: 'research',
    strategicContext,
    steps: [
      'Create the first research project.',
      'Run and review SEO/source research.',
      'Generate downstream records only from selected approved findings.',
    ],
  }
}

function buildStrategyAssistantContext({
  data,
  project,
  plan,
  opportunity,
  questionnaire,
  recommendationTopic,
  channelKey,
}: {
  data: MarketingData
  project?: Partial<MarketingResearchProject>
  plan?: Partial<MarketingResearchPlan>
  opportunity?: ResearchContentOpportunity
  questionnaire: MarketingPlanQuestionnaire
  recommendationTopic: string
  channelKey?: string
}): StrategyAssistantRecommendation['strategicContext'] {
  const stats = getMarketingDashboardStats(data)
  const channelLabel = channelKey ? labelFor(getChannelOptions(data.channels), channelKey) || labelizeAiField(channelKey) : 'the clearest channel'
  const destination = opportunity?.destinationUrl || project?.canonicalUrl || plan?.canonicalUrl || questionnaire.destinationUrl || 'the canonical page'
  const releaseWindow = plan?.releaseWindows?.[0]
  const windowText = releaseWindow?.label || (questionnaire.runway === 'oneMonth' ? 'the next month' : questionnaire.runway === 'oneWeek' ? 'the next week' : 'the next two weeks')
  const metric = plan?.measurementGoals?.[0]?.label || questionnaire.primaryMetric || 'clicks, saves, replies, and qualified visits'
  const opportunities = plan?.contentOpportunities?.length || (opportunity ? 1 : 0) || (project?.approvedResults?.length || 0)
  const topic = lowercaseGenericPlanningPhrase(recommendationTopic || questionnaire.topic || 'this topic')
  const releaseWindowText = lowercaseGenericPlanningPhrase(windowText)

  return [
    {
      title: 'Long-term',
      detail: `Use ${topic} as a repeatable topic thread, not a one-off post. Start with research so the later campaign, funnel, and destination path are based on reviewed opportunities.`,
    },
    {
      title: 'Relevance',
      detail: `${channelLabel} is the near-term surface, but the durable value is sending interested people to ${destination}. That gives the work a place to accumulate attention, evidence, and follow-up content.`,
    },
    {
      title: 'Over time',
      detail: `In ${releaseWindowText}, expect directional signals like ${metric}. If those improve, reuse the setup with another angle; if not, adjust the hook, CTA, or channel before adding more content.`,
    },
    {
      title: 'Cadence',
      detail:
        opportunities > 1
          ? `This plan has ${opportunities} opportunities, so review the release windows before turning them into calendar items. Current coverage is ${stats.contentRunwayDays} days.`
          : `Start with one reviewed research opportunity, then decide whether it deserves a calendar item based on the source, CTA, and content gap. Current coverage is ${stats.contentRunwayDays} days.`,
    },
  ]
}

function getStrategyRecommendationTopic({
  data,
  opportunityTitle,
  planTitle,
  questionnaireTopic,
  prompt,
  channelKey,
  format,
}: {
  data: MarketingData
  opportunityTitle?: string
  planTitle?: string
  questionnaireTopic?: string
  prompt: string
  channelKey?: string
  format?: string
}) {
  const channelLabel = channelKey ? labelFor(getChannelOptions(data.channels), channelKey) || labelizeAiField(channelKey) : ''
  const formatLabel = format ? labelFor(getContentTypeOptionsForChannel(channelKey, data.channels), format) || labelizeAiField(format) : ''
  const promptTopic = cleanStrategyTopic(inferPromptTitle(prompt))
  const candidates = [opportunityTitle, questionnaireTopic, planTitle].map((value) => cleanStrategyTopic(value || ''))
  const contentTopic = candidates.find((value) => value && !isDashboardGapTopic(value))

  if (contentTopic) return contentTopic
  if (promptTopic && !isDashboardGapTopic(promptTopic)) return promptTopic
  if (channelLabel && formatLabel) return `${channelLabel} ${formatLabel}`.trim()
  if (channelLabel) return `${channelLabel} content`
  return 'the next content push'
}

function cleanStrategyTopic(value: string) {
  let next = stripResearchProjectSuffix(value).trim().replace(/\s+/g, ' ')
  if (!next) return ''

  const replacements: RegExp[] = [
    /^make\s+a\s+plan\s+for\s+/i,
    /^plan\s+/i,
    /^schedule\s+/i,
    /^no\s+upcoming\s+content\s+is\s+scheduled\b[\s:,-]*/i,
    /^content\s+runway\s+is\s+under\s+two\s+weeks\b[\s:,-]*/i,
    /^the\s+next\s+30\s+days\s+have\s+a\s+thin\s+publishing\s+cadence\b[\s:,-]*/i,
    /^\d+\s+active\s+campaigns?\s+have\s+no\s+upcoming\s+content\b[\s:,-]*/i,
    /^\d+\s+active\s+channels?\s+have\s+no\s+upcoming\s+content\b[\s:,-]*/i,
    /^upcoming\s+content\s+is\s+not\s+tied\s+to\s+later\s+funnel\s+stages\b[\s:,-]*/i,
  ]

  for (const replacement of replacements) {
    next = next.replace(replacement, '').trim()
  }

  return next
}

function getMissingFoundationalStrategyInputs(data: MarketingData) {
  const missing: string[] = []
  if (data.audienceProfiles.length === 0) missing.push('audience')
  if (data.messagePillars.length === 0) missing.push('message')
  if (data.proofPoints.length === 0) missing.push('proof')
  if (data.ctas.length === 0) missing.push('CTA')
  if (data.trackingRules.length === 0) missing.push('tracking rule')
  if (data.qualityGates.length === 0) missing.push('quality gate')
  return missing
}

function isDashboardGapTopic(value: string) {
  const normalized = stripResearchProjectSuffix(value).trim().toLowerCase()
  if (!normalized) return true
  return [
    'untitled marketing setup',
    'next marketing setup',
    'next content runway',
    'next visible content plan',
    'content runway extension',
    'next content runway content thread',
    'no upcoming content is scheduled',
    'content runway is under two weeks',
    'the next 30 days have a thin publishing cadence',
    'upcoming content is not tied to later funnel stages',
  ].includes(normalized) ||
    /^\d+\s+active\s+campaigns?\s+have\s+no\s+upcoming\s+content$/i.test(value) ||
    /^\d+\s+active\s+channels?\s+have\s+no\s+upcoming\s+content$/i.test(value)
}

function formatStrategyPlanTitle(topic: string) {
  const cleanTopic = topic.trim() || 'the next content push'
  const lower = cleanTopic.toLowerCase()

  if (lower.startsWith('the ') || lower.startsWith('our ') || lower.startsWith('next ')) {
    return `Plan ${lowercaseFirstCharacter(cleanTopic)}`
  }

  if (/^(content|runway|campaign)\b/i.test(cleanTopic)) {
    return `Plan ${lowercaseFirstCharacter(cleanTopic)}`
  }

  if (lower.includes('content') || lower.includes('runway') || lower.includes('campaign')) {
    return `Plan ${cleanTopic}`
  }

  if (lower.includes('carousel') || lower.includes('post') || lower.includes('email') || lower.includes('page')) {
    return `Plan ${withIndefiniteArticle(cleanTopic)}`
  }

  return `Plan ${cleanTopic}`
}

function lowercaseFirstCharacter(value: string) {
  if (!value) return value
  return value.charAt(0).toLowerCase() + value.slice(1)
}

function lowercaseGenericPlanningPhrase(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed

  if (/^(next|the next|our next|content|runway|campaign)\b/i.test(trimmed)) {
    return lowercaseFirstCharacter(trimmed)
  }

  return trimmed
}

function withIndefiniteArticle(value: string) {
  const normalized = value.trim()
  if (!normalized) return value
  if (/^(a|an|the)\s+/i.test(normalized)) return normalized
  return `${/^[aeiou]/i.test(normalized) ? 'an' : 'a'} ${normalized}`
}

function buildCarouselFramePlan(questionnaire: MarketingPlanQuestionnaire) {
  const topic = questionnaire.topic || 'this idea'
  return [
    `Hook: name why ${topic} matters in one plain sentence.`,
    'Context: show the situation or problem without assuming prior knowledge.',
    'Evidence: introduce the strongest visual, quote, chart, or artifact.',
    'Breakdown: explain the evidence in smaller pieces.',
    'Meaning: say what someone should understand differently now.',
    'Next step: connect the idea to the destination link.',
    'CTA: invite people to use the link in bio or follow up.',
  ]
}

function inferTopicCluster(topic: string) {
  const normalized = topic.trim()
  if (!normalized) return 'Design insight'
  return normalized.length > 80 ? normalized.slice(0, 77).trim() + '...' : normalized
}

function inferTargetQueries(topic: string) {
  const normalized = topic.trim()
  if (!normalized) return ['design insight', 'visual explanation', 'healthcare design']
  return Array.from(new Set([normalized, `${normalized} design`, `${normalized} examples`]))
}

function getWizardCreationSummary({
  mode,
  hasInstagram,
  hasAnalytics,
  questionnaire,
}: {
  mode: DesignerWizardMode
  hasInstagram: boolean
  hasAnalytics: boolean
  questionnaire: MarketingPlanQuestionnaire
}) {
  if (mode === 'singleItem') {
    return [
      'Create one research project first, with the audience, destination, seed keywords, source URLs, and measurement goal kept editable.',
      'Store the research questions that must be answered before any calendar item is created.',
      hasInstagram ? 'Use Instagram as a channel assumption for the research brief.' : 'Flag Instagram as an intended channel without creating it automatically.',
      'Keep the calendar empty until someone runs research, approves findings, and generates linked records from Research.',
      hasAnalytics ? 'Include the measurement goal so it can be paired with analytics later.' : 'Record what should be measured once an analytics source is connected.',
    ]
  }

  const itemCount =
    questionnaire.contentCapacity === 'multiChannel' ? 4 : questionnaire.contentCapacity === 'weeklyCarousel' ? 2 : 1

  return [
    'Create a Research project first so the brief, audience, seed keywords, source URLs, and research questions stay editable.',
    hasInstagram ? 'Use Instagram as one channel assumption in the research brief.' : 'Flag Instagram as an intended channel without creating it automatically.',
    'Capture supporting website, LinkedIn, and newsletter ideas as research context, not permanent records yet.',
    `Estimate that this could become ${itemCount} content opportunit${itemCount === 1 ? 'y' : 'ies'} after findings are reviewed.`,
    'Keep campaign, funnel, calendar, and Quick Link records uncreated until approved findings are converted from Research.',
    hasAnalytics ? 'Include measurement context so the generated records can connect to analytics later.' : 'Record what should be measured once an analytics source is connected.',
  ]
}

async function generateQuestionnaireMarketingPlan(
  client: StudioClient,
  data: MarketingData,
  questionnaireInput: MarketingPlanQuestionnaire,
): Promise<CarouselWizardResult> {
  return createQuestionnaireResearchSetup(client, data, questionnaireInput)
}

async function createQuestionnaireResearchSetup(
  client: StudioClient,
  _data: MarketingData,
  questionnaireInput: MarketingPlanQuestionnaire,
): Promise<CarouselWizardResult> {
  const questionnaire = normalizeMarketingPlanQuestionnaire(questionnaireInput)
  const today = new Date()
  const startDate = toDateInputValue(today)
  const endDate = toDateInputValue(addDays(today, questionnaire.runway === 'oneMonth' ? 30 : questionnaire.runway === 'twoWeeks' ? 14 : 7))
  const destinationUrl = questionnaire.destinationUrl
  const researchProject = await client.create(buildQuestionnaireResearchProjectDocument(questionnaire, startDate, endDate, destinationUrl))

  return {
    researchProjectId: researchProject._id,
    title: String(researchProject.title || `${questionnaire.topic} research project`),
  }
}

function buildQuestionnaireResearchProjectDocument(
  questionnaire: MarketingPlanQuestionnaire,
  startDate: string,
  endDate: string,
  destinationUrl: string,
): MarketingDocumentInput {
  const sourceLabel = labelFromUrl(destinationUrl)
  const topic = normalizeResearchProjectTopic(questionnaire.topic, sourceLabel)
  const targetQueries = inferTargetQueries(topic)
  const researchType = inferResearchProjectType(`${questionnaire.topic} ${questionnaire.notes || ''}`)

  return {
    _type: 'marketingResearchProject',
    title: `${topic} research project`,
    status: 'researching',
    researchType,
    brief: `Research ${topic} before generating a release plan. Use ${destinationUrl || sourceLabel} as the source context, then confirm SEO scores, source evidence, and content gaps for the ${startDate} to ${endDate} window.`,
    audience: questionnaire.audience,
    goals: normalizeStringList([
      `Determine whether ${topic} is ready for an Instagram or multi-channel content runway.`,
      'Gather provider-backed keyword scores rather than using AI estimates as scores.',
      'Approve source evidence before any campaign, funnel, calendar item, or Quick Link is created.',
      questionnaire.primaryMetric ? `Decide how to measure ${questionnaire.primaryMetric}.` : '',
    ]),
    campaignObjective: questionnaire.objective,
    positioning: questionnaire.notes || `Lead with the useful idea, show evidence visually, and point people to ${destinationUrl}.`,
    canonicalUrl: destinationUrl,
    seedKeywords: targetQueries,
    seedUrls: normalizeStringList([destinationUrl]),
    targetGeography: 'us',
    language: 'en',
    methods: defaultResearchMethodsForType(researchType),
    researchQuestions: buildResearchQuestionsForType(researchType, topic),
    collaborators: [],
    internalNotes: 'Created by the Designer Workflow. Run research and approve results before generating downstream records.',
  }
}

function buildQuestionnaireResearchPlanDocument(
  questionnaire: MarketingPlanQuestionnaire,
  startDate: string,
  endDate: string,
  destinationUrl: string,
): MarketingDocumentInput {
  const targetQueries = inferTargetQueries(questionnaire.topic)
  const topicCluster = inferTopicCluster(questionnaire.topic)
  const windowLabel = `${questionnaire.topic} release window`

  return {
    _type: 'marketingResearchPlan',
    title: `${questionnaire.topic} research plan`,
    status: 'active',
    summary: `Research-first planning scaffold for ${questionnaire.topic}. Review the audience, SEO targets, release window, and opportunities before generating campaign, funnel, calendar, or link records.`,
    audience: questionnaire.audience,
    positioning: questionnaire.notes || `Lead with the useful idea, show evidence visually, and point people to ${destinationUrl}.`,
    campaignObjective: questionnaire.objective,
    canonicalUrl: destinationUrl,
    releaseCadence: questionnaire.contentCapacity === 'multiChannel' ? 'weekly' : 'campaignBased',
    contentPillars: [
      {
        _key: randomKey(),
        _type: 'contentPillar',
        title: topicCluster,
        audienceNeed: 'A clear explanation that makes the topic useful without marketing background.',
        angle: 'Use a concrete visual artifact, example, or source link as the center of the story.',
        exampleFormats: questionnaire.contentCapacity === 'multiChannel' ? ['carousel', 'linkPost', 'newsletter'] : ['carousel'],
      },
    ],
    researchQuestions: [
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: `What does ${questionnaire.audience || 'the audience'} need to understand before ${questionnaire.topic} is useful?`,
        whyItMatters: 'This keeps the release plan centered on audience need instead of internal topic interest.',
        method: 'deskResearch',
        decisionNeeded: 'Choose the hook, proof point, and first content opportunity.',
        status: 'readyToBrief',
      },
      {
        _key: randomKey(),
        _type: 'researchQuestion',
        question: `Which words would someone use to search for ${questionnaire.topic}?`,
        whyItMatters: 'Audience language should shape titles, captions, alt text, and Quick Link copy.',
        method: 'seoReview',
        decisionNeeded: 'Pick the strongest target query and canonical destination.',
        status: 'readyToBrief',
      },
    ],
    evidenceNotes: [
      {
        _key: randomKey(),
        _type: 'evidenceNote',
        claim: `${questionnaire.topic} has enough designer-provided context to create a first release scaffold.`,
        sourceTitle: 'Designer Workflow questionnaire',
        sourceUrl: destinationUrl,
        evidenceType: destinationUrl ? 'siteContent' : 'teamKnowledge',
        confidence: 'medium',
        implication: 'Create the initial content shell, then validate with engagement and click signals.',
        gap: 'Needs post-publication signal review before expanding the thread.',
      },
    ],
    assumptions: [
      {
        _key: randomKey(),
        _type: 'researchAssumption',
        assumption: `A visual sequence can make ${questionnaire.topic} understandable for ${questionnaire.audience || 'the intended audience'}.`,
        risk: 'The content may be visually polished but still too abstract to drive useful action.',
        validationSignal: `${questionnaire.primaryMetric || 'Useful visits'}, saves, shares, replies, and Quick Link clicks.`,
        confidence: 'early',
      },
    ],
    seoTargets: targetQueries.map((query, index) => ({
      _key: randomKey(),
      _type: 'seoTarget',
      query,
      intent: index === 0 ? 'learn' : 'compare',
      priority: index === 0 ? 'high' : 'medium',
      canonicalUrl: destinationUrl,
      contentGap: 'Use this phrase to shape titles, captions, alt text, and the canonical page copy.',
      notes: 'Generated from the Designer Workflow questionnaire.',
    })),
    channels: (questionnaire.contentCapacity === 'multiChannel' ? ['instagram', 'linkedin', 'newsletter', 'website'] : ['instagram']).map((channelKey, index) => ({
      _key: randomKey(),
      _type: 'recommendedChannel',
      channelKey,
      rationale: channelKey === 'instagram' ? 'Best fit for visual explanation and carousel production.' : 'Supports reuse of the same idea in another audience context.',
      cadence: index === 0 ? 'First release' : 'Supporting release',
      priority: index === 0 ? 'high' : 'medium',
    })),
    releaseWindows: [
      {
        _key: randomKey(),
        _type: 'releaseWindow',
        label: windowLabel,
        startDate,
        endDate,
        goal: 'Release the planned content sequence and learn which follow-up is needed.',
        priority: 'high',
      },
    ],
    contentOpportunities: buildQuestionnaireResearchOpportunities(questionnaire, destinationUrl, buildQuestionnaireCalendarPlan(questionnaire, destinationUrl), [], ''),
    measurementGoals: [
      {
        _key: randomKey(),
        _type: 'measurementGoal',
        label: questionnaire.primaryMetric,
        target: 'Review after the planned runway ends.',
      },
      {
        _key: randomKey(),
        _type: 'measurementGoal',
        label: 'Quick Link clicks',
        target: 'Watch whether social visitors reach the destination through /links.',
      },
    ],
    strategyAdjustments: [],
    internalNotes: 'Created by the Designer Workflow research-first setup. Generate linked campaign, funnel, calendar, and Quick Link records from selected Research opportunities when ready.',
  }
}

function buildQuestionnaireResearchOpportunities(
  questionnaire: MarketingPlanQuestionnaire,
  destinationUrl: string,
  calendarPlan: ReturnType<typeof buildQuestionnaireCalendarPlan>,
  createdCalendarItems: Array<{ _id: string }>,
  linkItemId: string,
): ResearchContentOpportunity[] {
  const queries = inferTargetQueries(questionnaire.topic)
  return calendarPlan.map((item, index) => ({
    _key: randomKey(),
    _type: 'contentOpportunity',
    title: item.title,
    channel: item.channel,
    format: item.contentType,
    owner: '',
    releaseWindow: `${questionnaire.topic} release window`,
    callToAction: item.callToAction,
    sourceMaterial: destinationUrl,
    destinationUrl,
    readiness: createdCalendarItems[index]?._id ? 'scheduled' : 'readyToBrief',
    seoQuery: queries[index] || queries[0] || questionnaire.topic,
    priority: index === 0 ? 'high' : 'medium',
    notes: item.brief,
    ...(createdCalendarItems[index]?._id ? { generatedCalendarItem: referenceFromId(createdCalendarItems[index]._id) } : {}),
    ...(linkItemId && index === 0 ? { generatedLinkItem: referenceFromId(linkItemId) } : {}),
  }))
}

function buildQuestionnaireCalendarPlan(
  questionnaire: MarketingPlanQuestionnaire,
  destinationUrl: string,
) {
  const carouselBrief = [
    buildCarouselBrief(questionnaire),
    '',
    'Questionnaire context:',
    `Topic: ${questionnaire.topic}`,
    `Audience: ${questionnaire.audience}`,
    `Metric: ${questionnaire.primaryMetric}`,
    questionnaire.notes ? `Notes: ${questionnaire.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const items = [
    {
      title: `${questionnaire.topic} Instagram carousel`,
      channel: 'instagram',
      contentType: 'carousel',
      funnelStage: 'awareness',
      offsetDays: 7,
      brief: carouselBrief,
      callToAction: 'See link in bio',
    },
  ]

  if (questionnaire.contentCapacity === 'weeklyCarousel') {
    items.push({
      title: `${questionnaire.topic} follow-up carousel`,
      channel: 'instagram',
      contentType: 'carousel',
      funnelStage: 'interest',
      offsetDays: questionnaire.runway === 'oneWeek' ? 6 : 14,
      brief: [
        'Create a second carousel that answers one question raised by the first carousel.',
        'Use the strongest comment, objection, or missing context as the hook.',
        `Destination: ${destinationUrl}`,
      ].join('\n'),
      callToAction: 'Read the full story',
    })
  }

  if (questionnaire.contentCapacity === 'multiChannel') {
    items.push(
      {
        title: `${questionnaire.topic} LinkedIn evidence post`,
        channel: 'linkedin',
        contentType: 'linkPost',
        funnelStage: 'interest',
        offsetDays: 10,
        brief: [
          'Repurpose the carousel into a short evidence-led LinkedIn post.',
          'Start with the strongest data point or visual claim.',
          'End by pointing readers to the full destination.',
          `Destination: ${destinationUrl}`,
        ].join('\n'),
        callToAction: 'Read the full piece',
      },
      {
        title: `${questionnaire.topic} newsletter note`,
        channel: 'newsletter',
        contentType: 'newsletter',
        funnelStage: 'consideration',
        offsetDays: questionnaire.runway === 'oneWeek' ? 6 : 14,
        brief: [
          'Write a short newsletter section that frames why this topic matters now.',
          'Include one image or quote from the carousel.',
          'Keep the copy useful without assuming the reader saw Instagram.',
          `Destination: ${destinationUrl}`,
        ].join('\n'),
        callToAction: 'Explore the full project',
      },
      {
        title: `${questionnaire.topic} destination check`,
        channel: 'website',
        contentType: 'landingPage',
        funnelStage: 'conversion',
        offsetDays: questionnaire.runway === 'oneMonth' ? 21 : 12,
        brief: [
          'Check that the destination page supports the social campaign.',
          'Make sure the title, intro, preview image, and next step match the carousel promise.',
          'Add or verify tracking links before publishing the social posts.',
          `Destination: ${destinationUrl}`,
        ].join('\n'),
        callToAction: 'Talk with GoInvo',
      },
    )
  }

  return items
}

async function ensureMarketingChannel(client: StudioClient, data: MarketingData, key: string): Promise<string> {
  const existing = data.channels.find((channel) => channel.key === key && channel.status !== 'archived')
  if (existing) return existing._id

  const defaults: Record<string, Omit<MarketingChannel, '_id'>> = {
    instagram: {
      title: 'Instagram',
      key: 'instagram',
      status: 'active',
      platform: 'social',
      description: 'Instagram content for visual explainers, carousels, reels, stories, and project updates.',
      defaultFunnelStage: 'awareness',
      contentTypes: [
        { label: 'Post', value: 'post' },
        { label: 'Carousel', value: 'carousel', description: 'Multi-slide visual story that can promote a deeper article or project.' },
        { label: 'Reel', value: 'reel' },
        { label: 'Story', value: 'story' },
      ],
    },
    linkedin: {
      title: 'LinkedIn',
      key: 'linkedin',
      status: 'active',
      platform: 'social',
      description: 'B2B and professional network posts for evidence, thought leadership, and project updates.',
      defaultFunnelStage: 'interest',
      contentTypes: [
        { label: 'Text Post', value: 'textPost' },
        { label: 'Link Post', value: 'linkPost' },
        { label: 'Carousel', value: 'carousel' },
        { label: 'Video', value: 'video' },
      ],
    },
    newsletter: {
      title: 'Newsletter',
      key: 'newsletter',
      status: 'active',
      platform: 'email',
      description: 'Owned audience updates that connect current work to durable articles, projects, and resources.',
      defaultFunnelStage: 'consideration',
      contentTypes: [
        { label: 'Newsletter', value: 'newsletter' },
        { label: 'Feature', value: 'feature' },
        { label: 'Announcement', value: 'announcement' },
      ],
    },
    website: {
      title: 'Website',
      key: 'website',
      status: 'active',
      platform: 'website',
      description: 'Durable GoInvo site content, landing pages, articles, and case studies.',
      defaultFunnelStage: 'conversion',
      contentTypes: [
        { label: 'Article', value: 'article' },
        { label: 'Case Study', value: 'caseStudy' },
        { label: 'Landing Page', value: 'landingPage' },
      ],
    },
  }

  const fallback = defaults[key] || {
    title: key,
    key,
    status: 'active',
    platform: 'other',
    contentTypes: [{ label: 'Post', value: 'post' }],
  }

  const created = await client.create({
    _type: 'marketingChannel',
    ...fallback,
    contentTypes: normalizeContentTypes(fallback.contentTypes || []),
  })

  return created._id
}

async function generateInstagramCarouselSetup(
  client: StudioClient,
  data: MarketingData,
  questionnaireInput: MarketingPlanQuestionnaire,
): Promise<CarouselWizardResult> {
  return createQuestionnaireResearchSetup(client, data, { ...questionnaireInput, contentCapacity: 'oneItem' })
}

function buildCarouselBrief(questionnaire: MarketingPlanQuestionnaire) {
  return [
    'What designers still need to make:',
    '- Final slide copy',
    '- Final visuals or chart exports',
    '- Instagram caption',
    '- Alt text for each slide',
    '',
    'Frame plan:',
    ...buildCarouselFramePlan(questionnaire).map((frame, index) => `${index + 1}. ${frame}`),
    '',
    `Destination: ${questionnaire.destinationUrl}`,
    'CTA: See link in bio',
  ].join('\n')
}

function getChannelByKey(channels: MarketingChannel[], key?: string) {
  if (!key) return undefined
  return channels.find((channel) => channel.key === key)
}

function getContentTypeOptionsForChannel(channelKey: string | undefined, channels: MarketingChannel[]) {
  const channel = getChannelByKey(channels, channelKey)
  const channelTypes = (channel?.contentTypes || []).filter((type) => type.label || type.value)
  if (channelTypes.length === 0) return contentTypeOptions

  return channelTypes.map((type) => ({
    title: type.label || type.value || 'Untitled type',
    value: type.value || slugify(type.label || 'content-type'),
  }))
}

function normalizeContentTypes(types: ChannelContentType[]): ChannelContentType[] {
  return types
    .filter((type) => type.label || type.value)
    .map((type): ChannelContentType => {
      const label = type.label || type.value || 'Untitled type'
      return {
        _key: type._key || randomKey(),
        _type: 'channelContentType',
        label,
        value: slugify(type.value || label),
        description: type.description || undefined,
      }
    })
}

function getChannelUsage(data: MarketingData, channel: MarketingChannel) {
  const channelKey = channel.key || ''
  const calendarCount = data.calendarItems.filter((item) => {
    return item.channelRef?._id === channel._id || (channelKey && item.channel === channelKey)
  }).length
  const campaignCount = data.campaigns.filter((campaign) => {
    return (
      (channelKey && (campaign.channels || []).includes(channelKey)) ||
      (campaign.channelRefs || []).some((ref) => ref._id === channel._id)
    )
  }).length

  return {
    calendarCount,
    campaignCount,
    total: calendarCount + campaignCount,
  }
}

function getCampaignCalendarCount(data: MarketingData, campaignId: string) {
  return data.calendarItems.filter((item) => item.campaign?._id === campaignId).length
}

function getFunnelCampaignCount(data: MarketingData, funnelId: string) {
  return data.campaigns.filter((campaign) => (campaign.funnels || []).some((ref) => ref._id === funnelId)).length
}

function getContentTypeUsage(data: MarketingData, channel: MarketingChannel, contentType: ChannelContentType) {
  const channelKey = channel.key || ''
  const typeValue = contentType.value || ''
  if (!channelKey || !typeValue) return 0

  return data.calendarItems.filter((item) => {
    const matchesChannel = item.channelRef?._id === channel._id || item.channel === channelKey
    return matchesChannel && item.contentType === typeValue
  }).length
}

function getCampaignChannelKeys(campaign: MarketingCampaign) {
  return Array.from(
    new Set([
      ...(campaign.channels || []),
      ...((campaign.channelRefs || []).map((channel) => channel.key).filter(Boolean) as string[]),
    ]),
  )
}

function labelFor(options: SelectOption[], value?: string) {
  return options.find((option) => option.value === value)?.title || value || ''
}

function emptyKeys(record: Record<string, unknown>) {
  return Object.keys(record).filter((key) => record[key] === undefined || record[key] === '')
}

function normalizeUrl(value?: string) {
  return (value || '').trim().replace(/\/+$/, '').toLowerCase()
}

function nextLinkOrder(items: MarketingLinkItem[]) {
  const highest = items.reduce((max, item) => Math.max(max, item.order || 0), 0)
  return highest + 10
}

function trimDescription(value?: string) {
  const trimmed = (value || '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return undefined
  return trimmed.length > 150 ? `${trimmed.slice(0, 147)}...` : trimmed
}

function calendarContentTypeToLinkType(contentType?: string) {
  if (contentType === 'caseStudy') return 'caseStudy'
  if (['article', 'newsletter', 'socialPost', 'carousel', 'reel', 'post', 'video'].includes(contentType || '')) return 'article'
  if (contentType === 'event') return 'event'
  if (contentType === 'landingPage') return 'site'
  return 'other'
}

function normalizeSuccessMetrics(metrics: Array<{ _key?: string; label?: string; target?: string; source?: RefSummary | ReferenceValue }>): SuccessMetric[] {
  return metrics
    .filter((metric) => metric.label || metric.target)
    .map((metric) => {
      const normalized: SuccessMetric = {
        _key: metric._key || randomKey(),
        _type: 'successMetric',
        label: metric.label || 'Metric',
      }
      if (metric.target) normalized.target = metric.target
      if (metric.source) {
        const sourceId = '_id' in metric.source ? metric.source._id : metric.source._ref
        if (sourceId) normalized.source = { _type: 'reference', _ref: sourceId }
      }
      return normalized
    })
}

function normalizeFunnelStages(stages: Array<Omit<FunnelStage, '_key' | '_type'> | FunnelStage>): FunnelStage[] {
  return stages.map((stage): FunnelStage => ({
    ...stage,
    _key: '_key' in stage && stage._key ? stage._key : randomKey(),
    _type: 'funnelStage',
  }))
}

function uniqueById<T extends { _id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item._id, item])).values())
}

function refsFromIds(ids: string[]) {
  return ids.map((id) => ({
    _key: id.replace(/[^a-zA-Z0-9_-]/g, ''),
    _type: 'reference',
    _ref: id,
  }))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'untitled'
}

function optionalSlug(value: string) {
  const trimmed = value.trim()
  return trimmed ? slugify(trimmed) : ''
}

function stringListFromText(value: string) {
  return Array.from(new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)))
}

function normalizeStringList(items: string[]) {
  return Array.from(new Set((items || []).map((item) => item.trim()).filter(Boolean)))
}

function defaultMarketingTemplateDocument(kind: 'campaign' | 'funnel'): MarketingDocumentInput {
  if (kind === 'campaign') {
    return {
      _type: 'marketingTemplate',
      title: '',
      kind: 'campaign',
      status: 'active',
      order: 100,
      campaignObjective: 'awareness',
      searchIntent: 'learn',
      targetQueries: [],
      channels: [],
      successMetrics: [],
      designerGuidance: [],
    }
  }

  return {
    _type: 'marketingTemplate',
    title: '',
    kind: 'funnel',
    status: 'active',
    order: 100,
    stages: [],
  }
}

function randomKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID().replace(/-/g, '')
  return Math.random().toString(36).slice(2)
}

function advancedEditHref(type: string, id: string) {
  return `/studio/content/intent/edit/id=${encodeURIComponent(id)};type=${encodeURIComponent(type)}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function toDateInputValue(value?: string | Date) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateInputToIso(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : undefined
}

function dateRange(start?: string, end?: string) {
  if (start && end) return `${start} to ${end}`
  return start || end || ''
}

function formatDateTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildCalendarCells(month: Date) {
  const first = startOfMonth(month)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    return {
      date,
      inMonth: date.getMonth() === month.getMonth(),
      isToday: toDateInputValue(date) === toDateInputValue(new Date()),
    }
  })
}

function groupCalendarItemsByDay(items: MarketingCalendarItem[]) {
  const map = new Map<string, MarketingCalendarItem[]>()
  items.forEach((item) => {
    if (!item.publishAt) return
    const key = toDateInputValue(item.publishAt)
    map.set(key, [...(map.get(key) || []), item])
  })
  return map
}

function getCalendarItemDisplayGroup(item: Pick<MarketingCalendarItem, 'status'>): SavedCalendarDisplayGroup {
  return ['scheduled', 'published'].includes(item.status || '') ? 'final' : 'draft'
}

function getCalendarGroupLabel(group: CalendarDisplayGroup) {
  if (group === 'preview') return 'Preview'
  if (group === 'final') return 'Final'
  return 'Draft'
}

function getCalendarItemsByDisplayGroup(items: MarketingCalendarItem[]) {
  const grouped = items.map((item) => ({ item, group: getCalendarItemDisplayGroup(item) }))
  return [
    ...grouped.filter((record) => record.group === 'final'),
    ...grouped.filter((record) => record.group === 'draft'),
  ]
}

function getSavedCalendarGroups(items: MarketingCalendarItem[]) {
  return items.reduce(
    (groups, item) => {
      groups[getCalendarItemDisplayGroup(item)].push(item)
      return groups
    },
    { draft: [] as MarketingCalendarItem[], final: [] as MarketingCalendarItem[] },
  )
}

export const marketingTool: Tool = {
  name: 'marketing',
  title: 'Marketing',
  icon: DashboardIcon,
  component: MarketingComponent,
}

export const marketingPlugin = definePlugin({
  name: 'marketing',
  tools: [marketingTool],
})
