import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
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
  RocketIcon,
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
import { experimentTargetTypeOptions } from '../schemas/marketingExperiment'
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
import { SeoWorkspace } from '../components/SeoWorkspace'
import { StrategyBriefWorkspace } from '../components/StrategyBriefWorkspace'
import { AbTestingWorkspace } from '../components/marketing/AbTestingWorkspace'
import { AnalyticsWorkspace } from '../components/marketing/AnalyticsWorkspace'
import { CalendarWorkspace } from '../components/marketing/CalendarWorkspace'
import { CampaignWorkspace } from '../components/marketing/CampaignWorkspace'
import { ChannelWorkspace } from '../components/marketing/ChannelWorkspace'
import { FunnelWorkspace } from '../components/marketing/FunnelWorkspace'
import { LinkTreeWorkspace } from '../components/marketing/LinkTreeWorkspace'
import { MarketingAttentionWorkspace } from '../components/marketing/MarketingAttentionWorkspace'
import { ResearchWorkspace } from '../components/marketing/ResearchWorkspace'
import { StrategyWorkspace } from '../components/marketing/StrategyWorkspace'
import { TemplateWorkspace } from '../components/marketing/TemplateWorkspace'
import type {
  AbTestingEditorTab,
  ChannelContentType,
  WorkflowHelpItem,
  WorkflowSetupStep,
  WorkflowTerm,
} from '../components/marketing/types'
import { getChannelUsage, normalizeContentTypes } from '../components/marketing/shared'
import {
  DESIGNER_WORKFLOW_TUTORIAL_STORAGE_KEY,
  defaultDesignerWorkflowTutorial,
  getDesignerWorkflowTutorial,
} from '../tutorials/designerWorkflowTutorials'
import {
  slugify,
  optionalSlug,
  stringListFromText,
  randomKey,
  refsFromIds,
  uniqueById,
  startOfMonth,
  addMonths,
  addDays,
  monthLabel,
  toDateInputValue,
  dateInputToIso,
  inferResearchProjectType,
  inferTopicCluster,
  inferTargetQueries,
} from '@/lib/marketing'

const API_VERSION = '2024-01-01'
export const ADD_CHANNEL_VALUE = '__add_new_channel__'
export const EXPERIMENT_FORCE_VARIANT_PARAM = 'goinvo_ab_variant'
const MARKETING_CONTROL_CSS = `
  [data-marketing-tool],
  [data-marketing-tool] * {
    box-sizing: border-box;
  }

  [data-marketing-tool] {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
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

  [data-marketing-tool] [role="tablist"] {
    max-width: 100%;
  }

  @media (max-width: 760px) {
    [data-marketing-tool] [data-mobile-stack="true"] {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    [data-marketing-tool] [data-mobile-scroll="true"] {
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
    }

    [data-marketing-tool] [data-mobile-fill="true"] {
      width: 100% !important;
      justify-content: center !important;
    }

    [data-marketing-tool] [data-ab-summary-cell="true"] {
      border-right: none !important;
      border-bottom: 1px solid var(--card-border-color);
    }

    [data-marketing-tool] [data-ab-summary-cell="true"][data-last="true"] {
      border-bottom: none;
    }

    [data-marketing-tool] [role="tablist"] {
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-gutter: stable;
    }

    [data-marketing-tool] [role="tab"] {
      flex: 0 0 auto;
    }

    [data-marketing-tool] input,
    [data-marketing-tool] select,
    [data-marketing-tool] textarea {
      font-size: 16px !important;
    }

    [data-marketing-tool] button,
    [data-marketing-tool] a {
      touch-action: manipulation;
    }
  }
`

export const MARKETING_OPAQUE_CARD_BG = '#11141f'
const MARKETING_OPAQUE_PANEL_BG = '#151a26'
const DESIGNER_WORKFLOW_SESSIONS_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.sessions.v2'
const DESIGNER_WORKFLOW_ACTIVE_SESSION_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.activeSession.v2'
const MARKETING_ACTIVE_VIEW_STORAGE_KEY = 'goinvo.marketing.activeView.v1'
const MARKETING_AUTOPILOT_TARGET_STORAGE_KEY = 'goinvo.marketing.autopilotTarget.v1'
const STRATEGY_WORKING_DRAFTS_STORAGE_KEY = 'goinvo.marketing.strategyWorkingDrafts.v1'

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
    "analyticsSource": analyticsSource->{_id, title, provider, status, vercelProject, vercelProjectId, vercelTeamSlug, productionUrl, lastSyncedAt, dashboardUrl, reportingCadence, keyMetrics[]{_key, label, definition}},
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
    "researchResults": researchResults[]->{_id, title, resultType, status, keyword, sourceMethod, sourceTitle, sourceUrl, claim, contentGap},
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
    targetType,
    targetPath,
    "targetFeature": targetFeature->{_id, title, slug},
    flagKey,
    variants[]{_key, key, label, notes, previewUrl},
    primaryMetric,
    trackedMetrics[]{_key, key, label, role, comparison, source, eventName, unit, notes},
    successTrackers[]{_key, title, trackerType, metricKeys, condition, threshold, successWhen, notes},
    "analyticsSource": analyticsSource->{_id, title, provider, status},
    qaNotes,
    rolloutStart,
    rolloutEnd,
    vercelDashboardUrl,
    "campaign": campaign->{_id, title, status},
    "calendarItem": calendarItem->{_id, title, status, publishAt},
    "performanceSignals": performanceSignals[]->{_id, title, provider, status, signalType, metricDate, periodStart, periodEnd, metrics[]{_key, label, value, unit, change, variantKey, eventName}, variantEngagement[]{_key, variantKey, sessions, bounceRate, averageSessionDuration}, interpretation, recommendation},
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
    metrics[]{_key, label, value, unit, change, variantKey, eventName},
    variantEngagement[]{_key, variantKey, sessions, bounceRate, averageSessionDuration},
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
    collaborationStatus,
    "proofPoints": proofPoints[]->{_id, title, claim, confidence}
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

export type StudioClient = ReturnType<typeof useClient>
export type MarketingDocumentInput = { _type: string } & Record<string, unknown>

export type MarketingViewId =
  | 'dashboard'
  | 'attention'
  | 'strategy'
  | 'strategyBrief'
  | 'abTesting'
  | 'research'
  | 'calendar'
  | 'campaigns'
  | 'funnels'
  | 'templates'
  | 'channels'
  | 'analytics'
  | 'linkTree'
  | 'seo'
export type MarketingViewOpener = (view: MarketingViewId) => boolean | void
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
  | 'experiment'
  | 'strategyAsset'

const MARKETING_UNSAVED_CHANGES_MESSAGE = 'You have unsaved marketing edits. Leaving now will discard the fields you have not saved.'
export const MARKETING_UNSAVED_FORM_ID = 'marketing-form-fields'

type MarketingUnsavedChangesContextValue = {
  hasUnsavedChanges: boolean
  markUnsavedChange: (id?: string, label?: string) => void
  clearUnsavedChanges: () => void
  confirmDiscardUnsavedChanges: (message?: string) => boolean
}

const MarketingUnsavedChangesContext = createContext<MarketingUnsavedChangesContextValue>({
  hasUnsavedChanges: false,
  markUnsavedChange: () => undefined,
  clearUnsavedChanges: () => undefined,
  confirmDiscardUnsavedChanges: () => true,
})

export function useMarketingUnsavedGuard() {
  return useContext(MarketingUnsavedChangesContext)
}

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
    id: 'seo',
    title: 'SEO',
    description: 'Live Search Console + GA4 opportunities and a cached citation checker.',
    icon: TrendUpwardIcon,
  },
  {
    id: 'strategy',
    title: 'Strategy',
    description: 'Answer the reusable questions content needs before design work starts.',
    icon: TargetIcon,
  },
  {
    id: 'strategyBrief',
    title: 'Strategy Brief',
    description: 'The positioning + plan: who we are, the money terms, AI visibility, and the Red Team play',
    icon: RocketIcon,
  },
  {
    id: 'abTesting',
    title: 'A/B Tests',
    description: 'Compare page design choices, QA them, and keep the decision trail.',
    icon: TrendUpwardIcon,
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
  'seo',
  'strategy',
  'strategyBrief',
  'abTesting',
  'calendar',
  'channels',
  'linkTree',
]

function isMarketingViewId(value: unknown): value is MarketingViewId {
  return typeof value === 'string' && MARKETING_TOOL_VIEWS.some((view) => view.id === value)
}

function loadStoredMarketingView(fallback: MarketingViewId = 'dashboard'): MarketingViewId {
  if (typeof window === 'undefined') return fallback
  const storedView = window.localStorage.getItem(MARKETING_ACTIVE_VIEW_STORAGE_KEY)
  return isMarketingViewId(storedView) ? storedView : fallback
}

function saveStoredMarketingView(view: MarketingViewId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MARKETING_ACTIVE_VIEW_STORAGE_KEY, view)
}

// Reads the logged-in Studio user's auth token so WRITE routes can authenticate
// the request as a real Studio session. Studio stores it under
// `__studio_auth_token_<projectId>` as either a raw string or a {"token":"..."}
// JSON envelope. Returns null when absent (callers then omit the header).
export function studioSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  if (!projectId) return null
  try {
    const raw = window.localStorage.getItem(`__studio_auth_token_${projectId}`)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as { token?: unknown } | string
      if (typeof parsed === 'string') return parsed.trim() || null
      if (parsed && typeof parsed.token === 'string') return parsed.token.trim() || null
    } catch {
      // Not JSON — treat the stored value as the raw token.
    }
    return raw.trim() || null
  } catch {
    return null
  }
}

export interface RefSummary {
  _id: string
  title?: string
  status?: string
  provider?: string
}

export type ReferenceValue = { _type: 'reference'; _ref: string }
type SuccessMetric = { _key?: string; _type?: 'successMetric'; label?: string; target?: string; source?: RefSummary | ReferenceValue }

// ChannelContentType is imported from ../components/marketing/types (shared by
// the channel workspace + analytics workspace + AI mapping + channel defaults).

export interface MarketingChannel {
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

export interface MarketingCalendarItem {
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

export interface MarketingCampaign {
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

export interface FunnelStage {
  _key: string
  _type?: 'funnelStage'
  stage?: string
  goal?: string
  offer?: string
  callToAction?: string
  destinationUrl?: string
  metrics?: string[]
}

export interface MarketingFunnel {
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

export interface MarketingAnalyticsSource {
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

export interface MarketingAudienceProfile {
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

export interface MarketingMessagePillar {
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

export interface MarketingProofPoint {
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

export interface MarketingCta {
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

export interface MarketingTrackingRule {
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

export interface MarketingQualityGate {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  whenToUse?: string
  checks?: Array<{ _key?: string; label?: string; category?: string; guidance?: string; required?: boolean }>
  notes?: string
}

export interface MarketingExperiment {
  _id: string
  _updatedAt?: string
  title?: string
  status?: string
  hypothesis?: string
  expectedSignal?: string
  targetType?: string
  targetPath?: string
  targetFeature?: RefSummary & { slug?: { current?: string } }
  flagKey?: string
  variants?: Array<{ _key?: string; key?: string; label?: string; notes?: string; previewUrl?: string }>
  primaryMetric?: string
  trackedMetrics?: Array<{ _key?: string; key?: string; label?: string; role?: string; comparison?: string; source?: string; eventName?: string; unit?: string; notes?: string }>
  successTrackers?: Array<{ _key?: string; title?: string; trackerType?: string; metricKeys?: string[]; condition?: string; threshold?: number; successWhen?: string; notes?: string }>
  analyticsSource?: RefSummary & Partial<MarketingAnalyticsSource>
  qaNotes?: string
  rolloutStart?: string
  rolloutEnd?: string
  vercelDashboardUrl?: string
  campaign?: RefSummary
  calendarItem?: MarketingCalendarItem
  performanceSignals?: MarketingPerformanceSignal[]
  result?: string
  decision?: string
  decisionDate?: string
  notes?: string
}

export interface MarketingPerformanceSignal {
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
  metrics?: Array<{ _key?: string; label?: string; value?: number; unit?: string; change?: string; variantKey?: string; eventName?: string }>
  variantEngagement?: Array<{ _key?: string; variantKey?: string; sessions?: number; bounceRate?: number; averageSessionDuration?: number }>
  interpretation?: string
  recommendation?: string
  rawImport?: string
}

export interface MarketingLinkItem {
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

export interface MarketingTemplate {
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

export interface ResearchQuestion {
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

export interface ResearchContentOpportunity {
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

export interface MarketingResearchPlan {
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

export interface MarketingResearchProject {
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

export type ResearchInspirationDraft = {
  sourceKind: string
  action: string
  title: string
  url: string
  note: string
}

export interface MarketingResearchResult {
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

export interface MarketingData {
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

export type MarketingAiSuggestion = {
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
  experiment?: Partial<MarketingExperiment>
  strategyAsset?: MarketingStrategyAssetSuggestion
  strategistChat?: MarketingStrategistChatSuggestion
}

type MarketingStrategistActionKind = 'test' | 'saveForLater' | 'followUp' | 'useForSetup'

type MarketingStrategistAction = {
  id?: string
  label?: string
  kind?: MarketingStrategistActionKind | string
  description?: string
}

type MarketingStrategistRecommendation = {
  title?: string
  opportunityType?: string
  recommendation?: string
  summary?: string
  rationale?: string[]
  fitScores?: {
    effort?: number
    confidence?: number
    proofStrength?: number
    upside?: number
    maintenanceBurden?: number
  }
  proposedActions?: MarketingStrategistAction[]
  setupPrompt?: string
  experimentHypothesis?: string
}

type MarketingStrategistChatSuggestion = {
  assistantMessage?: string
  primaryRecommendation?: MarketingStrategistRecommendation
  alternatives?: Array<{
    title?: string
    recommendation?: string
    reason?: string
  }>
}

type MarketingStrategistMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type MarketingStrategyAssetSuggestion = Partial<MarketingAudienceProfile> &
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

export type StrategyAssetKind =
  | 'audiences'
  | 'messages'
  | 'proof'
  | 'ctas'
  | 'tracking'
  | 'quality'
  | 'experiments'
  | 'performance'

export type StrategyWorkspaceMode = 'foundation' | 'campaigns' | 'funnels'
export type StrategyAssistAssetType =
  | 'audience'
  | 'message'
  | 'proof'
  | 'cta'
  | 'trackingRule'
  | 'qualityGate'
  | 'experiment'
  | 'performanceSynthesis'

export type GuidedAutofillQuestion = {
  id: string
  label: string
  choices: Array<{
    value: string
    label: string
    description: string
  }>
}

export type MarketingAiAssistResponse = {
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

export type SelectOption = {
  title: string
  value: string
}

export type CalendarItemTemplate = {
  id: string
  title: string
  description: string
  channel: string
  contentType: string
  funnelStage: string
  brief: string
  callToAction: string
}

export type CalendarDisplayGroup = 'preview' | 'draft' | 'final'
export type SavedCalendarDisplayGroup = Exclude<CalendarDisplayGroup, 'preview'>

export type CampaignTemplate = {
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

export type FunnelTemplate = {
  id: string
  title: string
  description: string
  audience: string
  conversionGoal: string
  stages: Array<Omit<FunnelStage, '_key' | '_type'>>
}

export type MarketingAttentionItem = {
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

export type AbTestingInsight = AnalyticsInterpretation & {
  experimentId?: string
}

type ExperimentTrackedMetric = NonNullable<MarketingExperiment['trackedMetrics']>[number]
type ExperimentSuccessTracker = NonNullable<MarketingExperiment['successTrackers']>[number]
type PerformanceSignalMetric = NonNullable<MarketingPerformanceSignal['metrics']>[number]
type AbTestingMetricOutcome = 'positive' | 'negative' | 'neutral'

type AbTestingMetricEvidence = {
  experiment: MarketingExperiment
  tracker: ExperimentSuccessTracker
  trackedMetric: ExperimentTrackedMetric
  signal: MarketingPerformanceSignal
  signalMetric: PerformanceSignalMetric
  outcome: AbTestingMetricOutcome
  changeValue: number | null
}

type AbTestingSignalMetricRecord = {
  signal: MarketingPerformanceSignal
  metric: PerformanceSignalMetric
}

type AbTestingComparisonStatus = 'variant' | 'control' | 'even' | 'needsComparison'

export type AbTestingComparisonResult = {
  key: string
  metricLabel: string
  metricRole?: string
  winnerLabel: string
  detail: string
  status: AbTestingComparisonStatus
  changeValue: number | null
  score: number
}

export type AbTestingComparisonSummary = {
  label: string
  detail: string
  status: AbTestingComparisonStatus
}

type AbTestingComparisonScoreboard = {
  controlLabel: string
  variantLabel: string
  controlWins: number
  variantWins: number
  evenCount: number
  pendingCount: number
  total: number
}

type AbTestingVariantOption = {
  key: string
  label: string
}

export type AbTestingVariantEventCell = {
  variant: AbTestingVariantOption
  value: number | null
  denominator: number | null
  rate: number | null
  unit?: string
}

type AbTestingVariantEventRow = {
  key: string
  label: string
  role?: string
  comparison?: string
  isExposure?: boolean
  cells: AbTestingVariantEventCell[]
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

type DesignerWizardMode = 'singleItem' | 'plan' | 'strategist'
type AutopilotInteractionMode = 'highlight' | 'chat'

type AutopilotStepStatus = 'done' | 'current' | 'upcoming' | 'blocked'
type AutopilotCompletionAction =
  | 'research:createProject'
  | 'research:run'
  | 'research:approve'
  | 'research:generateRecords'
  | `strategy:save:${StrategyAssetKind}`
  | 'calendar:createDraft'
  | 'calendar:saveDraft'
  | 'link:save'

export type AutopilotWorkspaceTarget = {
  view: MarketingViewId
  targetId: string
  strategySection?: StrategyAssetKind
  recordId?: string
}

function isStrategyAssetKind(value: unknown): value is StrategyAssetKind {
  return (
    value === 'audiences' ||
    value === 'messages' ||
    value === 'proof' ||
    value === 'ctas' ||
    value === 'tracking' ||
    value === 'quality' ||
    value === 'experiments' ||
    value === 'performance'
  )
}

function normalizeStoredAutopilotTarget(value: unknown): AutopilotWorkspaceTarget | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<AutopilotWorkspaceTarget>
  if (!isMarketingViewId(record.view) || typeof record.targetId !== 'string' || !record.targetId.trim()) return null
  return {
    view: record.view,
    targetId: record.targetId,
    strategySection: isStrategyAssetKind(record.strategySection) ? record.strategySection : undefined,
    recordId: typeof record.recordId === 'string' && record.recordId.trim() ? record.recordId : undefined,
  }
}

function loadStoredAutopilotTarget(): AutopilotWorkspaceTarget | null {
  if (typeof window === 'undefined') return null
  try {
    return normalizeStoredAutopilotTarget(JSON.parse(window.localStorage.getItem(MARKETING_AUTOPILOT_TARGET_STORAGE_KEY) || 'null'))
  } catch (err) {
    console.error('Marketing autopilot target could not load:', err)
    return null
  }
}

function saveStoredAutopilotTarget(target: AutopilotWorkspaceTarget | null) {
  if (typeof window === 'undefined') return
  if (!target) {
    window.localStorage.removeItem(MARKETING_AUTOPILOT_TARGET_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(MARKETING_AUTOPILOT_TARGET_STORAGE_KEY, JSON.stringify(target))
}

type AutopilotCoachChoice = {
  label: string
  detail: string
  tone?: 'primary' | 'secondary' | 'quiet'
}

type AutopilotCoachPrompt = {
  question: string
  shortReason: string
  choices: AutopilotCoachChoice[]
}

type AutopilotCompletionSignal = {
  action: AutopilotCompletionAction
  recordId?: string
  token: number
}

export type AutopilotCompletionPayload = Omit<AutopilotCompletionSignal, 'token'>

export type MarketingAutopilotStep = AutopilotWorkspaceTarget & {
  id: string
  title: string
  instruction: string
  why: string
  requiredAction: string
  nextAfter: string
  expectedAction: AutopilotCompletionAction
  status: AutopilotStepStatus
  recordId?: string
  completedRefId?: string
}

export type MarketingAutopilotPlan = {
  id: string
  title: string
  currentStepId: string
  coachOpen: boolean
  steps: MarketingAutopilotStep[]
  createdRefs?: Record<string, string>
}

export const MARKETING_AUTOPILOT_ACTION_EVENT = 'marketing-autopilot-action'
const MARKETING_AUTOPILOT_STATUS_EVENT = 'marketing-autopilot-status'

export type MarketingAutopilotActionDetail = {
  intent: 'confirm' | 'dependency'
  step: Pick<MarketingAutopilotStep, 'id' | 'view' | 'targetId' | 'strategySection' | 'expectedAction' | 'recordId'>
}

type MarketingAutopilotStatusDetail = {
  activity: 'idle' | 'drafting-current' | 'prefetching-next' | 'restored-local-draft' | 'autosaved-local-draft'
  busy: boolean
  message: string
  sectionId?: StrategyAssetKind
  recordId?: string
  token: number
}

type StrategyWorkingDraftEntry = {
  sectionId: StrategyAssetKind
  recordId: string
  sourceUpdatedAt?: string
  draft: Record<string, unknown>
  savedAt: string
}

type StrategyAssetAutopilotFit = {
  sectionId: StrategyAssetKind
  complete: boolean
  existingCount: number
  matchedId?: string
  matchedTitle?: string
  reason: string
}

type RecordAutopilotFit<T extends { _id: string; title?: string }> = {
  complete: boolean
  existingCount: number
  matched?: T
  reason: string
}

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
  strategistMessages: MarketingStrategistMessage[]
  strategistDirection: string
  strategistSuggestion: MarketingAiSuggestion | null
  strategistAcceptedActionRefs: string[]
  autopilotPlan: MarketingAutopilotPlan | null
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

export type MarketingAssistantSessionSummary = {
  id: string
  title: string
  autopilotPlan: MarketingAutopilotPlan | null
}

export type MarketingAssistantAction = {
  id: string
  title: string
  description: string
  reason: string
  tags: string[]
  recommended: boolean
  score: number
  view?: MarketingViewId
  mode?: DesignerWizardMode
  prompt?: string
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
  running: { bg: 'rgba(0, 115, 133, 0.18)', fg: '#4dc4d6', border: 'rgba(77, 196, 214, 0.35)' },
  blocked: { bg: 'rgba(185, 64, 48, 0.18)', fg: '#ff9a85', border: 'rgba(255, 154, 133, 0.45)' },
  reviewing: { bg: 'rgba(148, 90, 172, 0.16)', fg: '#d6a1f0', border: 'rgba(214, 161, 240, 0.35)' },
  decided: { bg: 'rgba(54, 139, 87, 0.18)', fg: '#7dd69e', border: 'rgba(125, 214, 158, 0.35)' },
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

export const CALENDAR_ITEM_TEMPLATES: CalendarItemTemplate[] = [
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

export const workflowTerms: WorkflowTerm[] = [
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
    definition: 'Call to action. The specific action we ask someone to take, such as read the article or contact GoInvo.',
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
    action: { label: 'Open campaign plans', view: 'campaigns' },
  },
  {
    question: 'What is a funnel doing here?',
    answer: [
      'A ',
      workflowTerms[2],
      ' keeps each artifact from becoming a dead end. It connects awareness, consideration, and conversion so every post or page has a useful next step.',
    ],
    action: { label: 'Open funnel paths', view: 'funnels' },
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
    action: { label: 'Open content calendar', view: 'calendar' },
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
    action: { label: 'Open public Quick Links', view: 'linkTree' },
  },
]

const workflowSetupSteps: WorkflowSetupStep[] = [
  {
    label: '1',
    title: 'Choose the outcome',
    outcome: 'A campaign draft with objective, audience, topic/intent, message, KPI, UTM name, timing, and channels.',
    designerAction: 'Pick the closest campaign template, then replace the strategy prompts with plain-language specifics.',
    view: 'campaigns',
    terms: [workflowTerms[0], workflowTerms[5], workflowTerms[6], workflowTerms[7]],
  },
  {
    label: '2',
    title: 'Choose the path',
    outcome: 'A funnel with stages, CTA language, and destination links.',
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
    title: 'Create the content draft',
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
    title: 'Set the publishing draft',
    detail: 'Choose where the content points, what we ask people to do, and how we will know it worked.',
  },
  {
    title: 'Create research project',
    detail: 'Create the research project first; campaign, funnel, calendar, and Quick Link drafts come from trusted findings later.',
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
    detail: 'Create the editable research project first, then turn trusted findings into drafts the team can use.',
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
  experiment: {
    target: 'A/B test',
    prompt: 'Example: Test the homepage concept against the current homepage and watch qualified discovery-call clicks.',
    fills: ['design bet', 'public page', 'traffic split key', 'page versions', 'success signal', 'QA notes', 'decision fields'],
  },
  strategyAsset: {
    target: 'reusable strategy inputs',
    prompt: 'Example: Create an audience profile, proof point, CTA, or tracking rule designers can reuse before making content.',
    fills: ['audience', 'message', 'proof', 'CTA', 'tracking rule', 'quality gate', 'experiment', 'performance signal'],
  },
}

export const styles = {
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
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 18,
    padding: '0 0 1px',
    borderBottom: '1px solid var(--card-border-color)',
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
  guideCoachHost: {
    position: 'fixed',
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    padding: 0,
    border: 0,
    background: 'transparent',
    boxShadow: 'none',
    overflow: 'visible',
    pointerEvents: 'none',
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

export function useMarketingCompactLayout(breakpoint = 760) {
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setCompact(window.innerWidth < breakpoint)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [breakpoint])

  return compact
}

function marketingActionError(prefix: string, err: unknown) {
  const detail = err instanceof Error && err.message ? err.message : 'Please try again or refresh the marketing workspace.'
  return `${prefix} ${detail}`
}

function MarketingComponent() {
  const client = useClient({ apiVersion: API_VERSION })
  const compactLayout = useMarketingCompactLayout()
  const [view, setView] = useState<MarketingViewId>(() => loadStoredMarketingView(loadStoredAutopilotTarget()?.view || 'dashboard'))
  const [data, setData] = useState<MarketingData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [workflowTutorialRequest, setWorkflowTutorialRequest] = useState(0)
  const [workflowTutorialLibraryRequest, setWorkflowTutorialLibraryRequest] = useState(0)
  const [workflowTutorialId, setWorkflowTutorialId] = useState(defaultDesignerWorkflowTutorial.id)
  const [workflowTutorialDemoRecommendation, setWorkflowTutorialDemoRecommendation] = useState(false)
  const [workflowOpenRequest, setWorkflowOpenRequest] = useState(0)
  const [autopilotTarget, setAutopilotTarget] = useState<AutopilotWorkspaceTarget | null>(() => loadStoredAutopilotTarget())
  const [autopilotCompletionSignal, setAutopilotCompletionSignal] = useState<AutopilotCompletionSignal | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({})
  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0

  const markUnsavedChange = useCallback((id = MARKETING_UNSAVED_FORM_ID, label = 'form fields you edited') => {
    setUnsavedChanges((current) => (current[id] === label ? current : { ...current, [id]: label }))
  }, [])

  const clearUnsavedChanges = useCallback(() => {
    setUnsavedChanges({})
  }, [])

  const confirmDiscardUnsavedChanges = useCallback(
    (message = MARKETING_UNSAVED_CHANGES_MESSAGE) => {
      if (!hasUnsavedChanges || typeof window === 'undefined') return true
      const labels = Object.values(unsavedChanges)
      const detail = labels.length > 0 ? `\n\nUnsaved: ${labels.slice(0, 4).join(', ')}${labels.length > 4 ? ', and more' : ''}` : ''
      return window.confirm(`${message}${detail}`)
    },
    [hasUnsavedChanges, unsavedChanges],
  )

  useEffect(() => {
    if (!hasUnsavedChanges || typeof window === 'undefined') return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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
      return true
    } catch (err) {
      console.error('Failed to load marketing data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load marketing data.')
      return false
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!notice || typeof window === 'undefined') return
    const timeout = window.setTimeout(() => setNotice(null), 4200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    saveStoredMarketingView(view)
  }, [view])

  useEffect(() => {
    saveStoredAutopilotTarget(autopilotTarget)
  }, [autopilotTarget])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const requestedTutorial = new URLSearchParams(window.location.search).get('designerWorkflowTutorial')
    if (requestedTutorial) {
      setWorkflowTutorialId(getDesignerWorkflowTutorial(requestedTutorial).id)
      setWorkflowTutorialDemoRecommendation(requestedTutorial === 'designer-workflow-recommendation')
      setWorkflowTutorialRequest((current) => current + 1)
    }
  }, [])

  const requestMarketingView = useCallback(
    (nextView: MarketingViewId) => {
      if (nextView === view) return true
      if (!confirmDiscardUnsavedChanges()) return false
      clearUnsavedChanges()
      setView(nextView)
      return true
    },
    [clearUnsavedChanges, confirmDiscardUnsavedChanges, view],
  )

  const handleMarketingLinkCapture = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!hasUnsavedChanges) return
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (!href || href.startsWith('#') || link.target === '_blank' || link.hasAttribute('download')) return
      if (confirmDiscardUnsavedChanges()) {
        clearUnsavedChanges()
        return
      }
      event.preventDefault()
      event.stopPropagation()
    },
    [clearUnsavedChanges, confirmDiscardUnsavedChanges, hasUnsavedChanges],
  )

  const unsavedGuardValue = useMemo<MarketingUnsavedChangesContextValue>(
    () => ({
      hasUnsavedChanges,
      markUnsavedChange,
      clearUnsavedChanges,
      confirmDiscardUnsavedChanges,
    }),
    [clearUnsavedChanges, confirmDiscardUnsavedChanges, hasUnsavedChanges, markUnsavedChange],
  )

  const commitPatch = useCallback(
    async (id: string, set: Record<string, unknown>, unset: string[] = []) => {
      setSavingId(id)
      setError(null)
      setNotice(null)
      try {
        let patch = client.patch(id)
        if (Object.keys(set).length > 0) patch = patch.set(set)
        if (unset.length > 0) patch = patch.unset(unset)
        await patch.commit()
        if (await loadData()) {
          clearUnsavedChanges()
          setNotice('Saved changes.')
        }
      } catch (err) {
        const message = marketingActionError('Could not save the change.', err)
        console.error(message, err)
        setError(message)
        throw err
      } finally {
        setSavingId(null)
      }
    },
    [clearUnsavedChanges, client, loadData],
  )

  const createDocument = useCallback(
    async (document: MarketingDocumentInput) => {
      setSavingId('new')
      setError(null)
      setNotice(null)
      try {
        const created = await client.create(document)
        if (await loadData()) {
          clearUnsavedChanges()
          setNotice('Created a new marketing record.')
        }
        return created._id
      } catch (err) {
        const message = marketingActionError('Could not create the marketing record.', err)
        console.error(message, err)
        setError(message)
        throw err
      } finally {
        setSavingId(null)
      }
    },
    [clearUnsavedChanges, client, loadData],
  )

  const generateCarouselSetup = useCallback(
    async (questionnaire: MarketingPlanQuestionnaire) => {
      setSavingId(`carousel-${slugify(questionnaire.topic || 'item')}`)
      setError(null)
      setNotice(null)
      try {
        const result = await generateInstagramCarouselSetup(client, data, questionnaire)
        if (await loadData()) {
          clearUnsavedChanges()
          setNotice('Created the suggested marketing setup.')
        }
        return result
      } catch (err) {
        const message = marketingActionError('Could not create the suggested setup.', err)
        console.error(message, err)
        setError(message)
        throw err
      } finally {
        setSavingId(null)
      }
    },
    [clearUnsavedChanges, client, data, loadData],
  )

  const generateMarketingPlan = useCallback(
    async (questionnaire: MarketingPlanQuestionnaire) => {
      setSavingId(`marketing-plan-${slugify(questionnaire.topic || 'plan')}`)
      setError(null)
      setNotice(null)
      try {
        const result = await generateQuestionnaireMarketingPlan(client, data, questionnaire)
        if (await loadData()) {
          clearUnsavedChanges()
          setNotice('Created the suggested marketing plan.')
        }
        return result
      } catch (err) {
        const message = marketingActionError('Could not create the suggested marketing plan.', err)
        console.error(message, err)
        setError(message)
        throw err
      } finally {
        setSavingId(null)
      }
    },
    [clearUnsavedChanges, client, data, loadData],
  )

  const reportAutopilotCompletion = useCallback((signal: AutopilotCompletionPayload) => {
    setAutopilotCompletionSignal({ ...signal, token: Date.now() })
  }, [])

  const openAutopilotTarget = useCallback((target: AutopilotWorkspaceTarget) => {
    if (!requestMarketingView(target.view)) return
    setAutopilotTarget(target)
    saveStoredAutopilotTarget(target)
    saveStoredMarketingView(target.view)
  }, [requestMarketingView])

  const refreshMarketingData = useCallback(async () => {
    setError(null)
    setNotice(null)
    if (await loadData()) setNotice('Marketing data refreshed.')
  }, [loadData])

  const reloadWorkspaceData = useCallback(async () => {
    await loadData()
  }, [loadData])

  const activeView = MARKETING_TOOL_VIEWS.find((candidate) => candidate.id === view) || MARKETING_TOOL_VIEWS[0]
  const attentionItems = useMemo(() => (loading ? [] : getMarketingAttentionItems(data)), [data, loading])
  const attentionCount = attentionItems.length
  const shellStyle: CSSProperties = compactLayout ? { ...styles.shell, padding: 12, paddingBottom: 92 } : styles.shell
  const headerStyle: CSSProperties = compactLayout
    ? { ...styles.header, flexDirection: 'column', gap: 12, marginBottom: 16 }
    : styles.header
  const headerActionsStyle: CSSProperties = compactLayout
    ? { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start', width: '100%' }
    : { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }
  const headingStyle: CSSProperties = compactLayout ? { ...styles.h1, fontSize: 28 } : styles.h1
  const navStyle: CSSProperties = compactLayout
    ? {
        ...styles.nav,
        flexWrap: 'nowrap',
        marginLeft: -12,
        marginRight: -12,
        overflowX: 'auto',
        paddingBottom: 6,
        paddingLeft: 12,
        paddingRight: 12,
        WebkitOverflowScrolling: 'touch',
      }
    : styles.nav

  return (
    <MarketingUnsavedChangesContext.Provider value={unsavedGuardValue}>
    <div data-marketing-tool="true" style={shellStyle} onClickCapture={handleMarketingLinkCapture}>
      <style>{MARKETING_CONTROL_CSS}</style>
      <div style={styles.page}>
        <div style={headerStyle}>
          <div>
            <h1 style={headingStyle}>Marketing</h1>
            <p style={styles.subtitle}>
              Plan strategy, research, publishing, channels, and public links from one operational workspace.
            </p>
          </div>
          <div style={headerActionsStyle}>
            {hasUnsavedChanges && <span style={{ ...styles.small, color: '#E36216', fontWeight: 800 }}>Unsaved edits</span>}
            {lastLoaded && <span style={{ ...styles.muted, ...styles.small }}>Updated {lastLoaded}</span>}
            <a href="/studio/getting-started?article=marketing.overview" style={styles.button}>
              Marketing guide
              <LaunchIcon style={{ width: 15, height: 15 }} />
            </a>
            <button
              type="button"
              aria-label={`${attentionCount} marketing item${attentionCount === 1 ? '' : 's'} need attention`}
              title="Open marketing items that need attention"
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
                if (requestMarketingView('attention')) setActionsOpen(false)
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
                aria-label="Open more marketing sections and actions"
                aria-expanded={actionsOpen}
                title="Open more marketing sections and actions"
                style={{ ...styles.button, minHeight: 38, padding: '8px 11px', fontSize: 14, lineHeight: 1 }}
                onClick={() => setActionsOpen((current) => !current)}
              >
                <EllipsisHorizontalIcon style={{ width: 18, height: 18 }} />
                More
              </button>
              {actionsOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: compactLayout ? 'auto' : 0,
                    left: compactLayout ? 0 : 'auto',
                    zIndex: 20,
                    minWidth: 180,
                    maxWidth: compactLayout ? 'calc(100vw - 24px)' : undefined,
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
                      if (requestMarketingView('abTesting')) setActionsOpen(false)
                    }}
                  >
                    A/B Tests
                    <TrendUpwardIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      if (requestMarketingView('campaigns')) setActionsOpen(false)
                    }}
                  >
                    Campaign plans
                    <TargetIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      if (requestMarketingView('funnels')) setActionsOpen(false)
                    }}
                  >
                    Funnel paths
                    <MasterDetailIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      if (requestMarketingView('analytics')) setActionsOpen(false)
                    }}
                  >
                    Performance analytics
                    <TrendUpwardIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      if (requestMarketingView('templates')) setActionsOpen(false)
                    }}
                  >
                    Reusable templates
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
                    Guided tutorials
                    <SearchIcon style={{ width: 15, height: 15 }} />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    style={{ ...styles.templateButton, border: 'none', boxShadow: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => {
                      if (!confirmDiscardUnsavedChanges('Refreshing marketing data will reload this workspace and discard unsaved fields. Continue?')) return
                      clearUnsavedChanges()
                      setActionsOpen(false)
                      void refreshMarketingData()
                    }}
                  >
                    Refresh marketing data
                    <RefreshIcon style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav data-mobile-scroll="true" style={navStyle} aria-label="Marketing sections">
          {MARKETING_TOOL_VIEWS.filter((candidate) => PRIMARY_MARKETING_VIEW_IDS.includes(candidate.id)).map((candidate) => (
            <MarketingNavButton
              key={candidate.id}
              view={candidate}
              active={candidate.id === activeView.id}
              onClick={() => requestMarketingView(candidate.id)}
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
            openRequest={workflowOpenRequest}
            completionSignal={autopilotCompletionSignal}
            onOpenView={requestMarketingView}
            onOpenAutopilotTarget={openAutopilotTarget}
            onGenerateInstagramCarousel={generateCarouselSetup}
            onGenerateMarketingPlan={generateMarketingPlan}
          />
        )}

        {(error || notice) && (
          <div
            role={error ? 'alert' : 'status'}
            aria-live={error ? 'assertive' : 'polite'}
            style={{
              ...styles.panel,
              borderColor: error ? 'rgba(227, 98, 22, 0.45)' : 'rgba(54, 139, 87, 0.38)',
              background: error ? 'rgba(227, 98, 22, 0.08)' : 'rgba(54, 139, 87, 0.08)',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
              <div>
                <strong>{error ? 'Marketing workspace needs attention.' : notice}</strong>
                {error && <div style={{ ...styles.muted, marginTop: 4 }}>{error}</div>}
              </div>
              <button
                type="button"
                aria-label="Dismiss marketing status message"
                style={{ ...styles.button, width: 32, height: 32, padding: 0, flexShrink: 0 }}
                onClick={() => {
                  setError(null)
                  setNotice(null)
                }}
              >
                <CloseIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={styles.panel}>Loading marketing workspace...</div>
        ) : (
          <>
            {view === 'dashboard' && (
              <MarketingDashboard
                data={data}
                onOpenView={requestMarketingView}
                onOpenWorkflow={() => setWorkflowOpenRequest((current) => current + 1)}
              />
            )}
            {view === 'attention' && <MarketingAttentionWorkspace items={attentionItems} onOpenView={requestMarketingView} />}
            {view === 'strategy' && (
              <StrategyWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={reloadWorkspaceData}
                commitPatch={commitPatch}
                onOpenView={requestMarketingView}
                autopilotTarget={autopilotTarget}
                onAutopilotComplete={reportAutopilotCompletion}
              />
            )}
            {view === 'strategyBrief' && <StrategyBriefWorkspace client={client} />}
            {view === 'research' && (
              <ResearchWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={reloadWorkspaceData}
                commitPatch={commitPatch}
                onOpenView={requestMarketingView}
                autopilotTarget={autopilotTarget}
                onAutopilotComplete={reportAutopilotCompletion}
              />
            )}
            {view === 'seo' && <SeoWorkspace client={client} />}
            {view === 'abTesting' && (
              <AbTestingWorkspace
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
                onOpenView={requestMarketingView}
              />
            )}
            {view === 'calendar' && (
              <CalendarWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
                onOpenChannels={() => requestMarketingView('channels')}
                autopilotTarget={autopilotTarget}
                onAutopilotComplete={reportAutopilotCompletion}
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
                loadData={reloadWorkspaceData}
                commitPatch={commitPatch}
              />
            )}
            {view === 'templates' && (
              <TemplateWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={reloadWorkspaceData}
                commitPatch={commitPatch}
              />
            )}
            {view === 'channels' && (
              <ChannelWorkspace
                client={client}
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                loadData={reloadWorkspaceData}
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
                autopilotTarget={autopilotTarget}
                onAutopilotComplete={reportAutopilotCompletion}
              />
            )}
          </>
        )}
      </div>
    </div>
    </MarketingUnsavedChangesContext.Provider>
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
      title={view.description}
      style={{
        border: 0,
        borderBottom: `3px solid ${active ? '#007385' : 'transparent'}`,
        borderRadius: 0,
        padding: '9px 12px 10px',
        minHeight: 40,
        cursor: 'pointer',
        color: 'var(--card-fg-color)',
        background: active ? 'rgba(0, 115, 133, 0.1)' : 'transparent',
        boxShadow: 'none',
        font: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
      }}
    >
      <Icon style={{ width: 16, height: 16, color: active ? '#007385' : 'var(--card-muted-fg-color)' }} />
      <span style={{ fontWeight: 800 }}>{view.title}</span>
    </button>
  )
}

function MarketingDashboard({
  data,
  onOpenView,
  onOpenWorkflow,
}: {
  data: MarketingData
  onOpenView: MarketingViewOpener
  onOpenWorkflow: () => void
}) {
  const stats = useMemo(() => getMarketingDashboardStats(data), [data])
  const gaps = useMemo(() => getMarketingDashboardGaps(data), [data])
  const analyticsStats = useMemo(() => getAnalyticsReadinessStats(data), [data])
  const runwayCopy =
    stats.contentRunwayDays > 0
      ? `We have ${stats.contentRunwayDays} day${stats.contentRunwayDays === 1 ? '' : 's'} of content mapped.`
      : 'We do not have upcoming content mapped yet.'
  const upcomingItems = stats.upcomingItems.slice(0, 6)
  const setupPathSteps: Array<{ step: string; title: string; detail: string; view: MarketingViewId }> = [
    { step: '1', title: 'Research', detail: 'Find evidence before making drafts.', view: 'research' },
    { step: '2', title: 'Strategy', detail: 'Answer who it is for, what to say, why to believe it, and what to do next.', view: 'strategy' },
    { step: '3', title: 'A/B Tests', detail: 'Turn uncertain page changes into measured experiments.', view: 'abTesting' },
    { step: '4', title: 'Calendar', detail: 'Turn trusted setup into draft or scheduled content.', view: 'calendar' },
    { step: '5', title: 'Quick Links', detail: 'Connect social posts to the right public destinations.', view: 'linkTree' },
  ]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, maxWidth: 760 }}>
            <div style={{ ...styles.kicker, marginBottom: 6 }}>Next action</div>
            <h2 style={{ margin: 0, fontSize: 26 }}>What should we set up next?</h2>
            <p style={{ ...styles.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
              Start with Marketing autopilot when you are not sure. It looks at research, strategy, the calendar, channels, Quick Links, and measurement, then walks you through one confirmed step at a time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" style={styles.primaryButton} onClick={onOpenWorkflow}>
              Open Marketing autopilot
            </button>
            <button type="button" style={styles.button} onClick={() => onOpenView('research')}>
              Find evidence
            </button>
            <button type="button" style={styles.button} onClick={() => onOpenView('calendar')}>
              Open content calendar
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8, marginTop: 14 }}>
          {setupPathSteps.map((pathStep) => (
            <button
              key={pathStep.title}
              type="button"
              style={{ ...styles.templateButton, background: MARKETING_OPAQUE_CARD_BG, minHeight: 94 }}
              onClick={() => onOpenView(pathStep.view)}
            >
              <span style={{ ...styles.small, color: '#007385', fontWeight: 900 }}>Step {pathStep.step}</span>
              <strong style={{ fontSize: 14 }}>{pathStep.title}</strong>
              <span style={{ ...styles.small, ...styles.muted }}>{pathStep.detail}</span>
            </button>
          ))}
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
            title="What needs a decision?"
            description="The smallest next fixes that make content easier to create without guessing."
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
                          <strong style={{ color: 'var(--card-fg-color)' }}>Why: </strong>
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
                      <strong style={{ color: 'var(--card-fg-color)' }}>Do this: </strong>
                      {gap.action}
                    </div>
                    {gap.affected && gap.affected.length > 0 && (
                      <div style={{ ...styles.small, ...styles.muted }}>
                        <strong style={{ color: 'var(--card-fg-color)' }}>Helps with: </strong>
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

export type StrategyDocument =
  | MarketingAudienceProfile
  | MarketingMessagePillar
  | MarketingProofPoint
  | MarketingCta
  | MarketingTrackingRule
  | MarketingQualityGate
  | MarketingExperiment
  | MarketingPerformanceSignal

export type StrategySectionConfig = {
  id: StrategyAssetKind
  title: string
  singular: string
  documentType: string
  why: string
  when: string
  affects: string
}

export const STRATEGY_SECTIONS: StrategySectionConfig[] = [
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
    why: 'Message pillars give designers durable claims and reusable wording so each post is not a blank strategy exercise.',
    when: 'Use when a topic should repeat across multiple assets, channels, or release windows.',
    affects: 'Campaign positioning, content briefs, captions, page copy, and AI draft generation.',
  },
  {
    id: 'proof',
    title: 'Proof',
    singular: 'proof point',
    documentType: 'marketingProofPoint',
    why: 'Proof points keep claims source-aware and reusable, which is especially important before visual content is published.',
    when: 'Use when a message needs evidence, a statistic, a quote, a case artifact, or a trusted finding.',
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
    why: 'Performance signals store manually reviewed first-party evidence before it becomes a finding or strategy update.',
    when: 'Use when GSC, GA4, Instagram, Vercel, or manual observations suggest the plan should change.',
    affects: 'Research analytics review, dashboard gaps, experiments, and strategy adjustments.',
  },
]

type StrategySectionQuestion = {
  question: string
  reason: string
  when: string
  helps: string
  addLabel: string
  shortLabel: string
}

export function getStrategySectionQuestion(sectionId: StrategyAssetKind): StrategySectionQuestion {
  if (sectionId === 'audiences') {
    return {
      question: 'Who is this for?',
      reason: 'Save the kind of person this work should speak to so the tone, examples, proof, and CTA stop being guesses.',
      when: 'Answer this when a post, campaign, research project, or content draft needs a clear person in mind.',
      helps: 'Research questions, messages, proof, CTAs, Quick Links, and content drafts.',
      addLabel: 'Create reusable audience',
      shortLabel: 'Audience',
    }
  }
  if (sectionId === 'messages') {
    return {
      question: 'What should people understand?',
      reason: 'Save the main claim and supporting themes so each asset has one clear point instead of a pile of disconnected facts.',
      when: 'Answer this when a topic should repeat across posts, pages, channels, or release windows.',
      helps: 'Campaign positioning, briefs, captions, page copy, and AI drafts.',
      addLabel: 'Create reusable message',
      shortLabel: 'Message',
    }
  }
  if (sectionId === 'proof') {
    return {
      question: 'What makes the claim believable?',
      reason: 'Save the source, fact, example, or finding a designer can safely cite or turn into visual evidence.',
      when: 'Answer this before a visual, caption, page, or email makes a claim.',
      helps: 'Research synthesis, campaign claims, source checks, content review, and inspiration follow-up.',
      addLabel: 'Create proof point',
      shortLabel: 'Proof',
    }
  }
  if (sectionId === 'ctas') {
    return {
      question: 'What should someone do after this?',
      reason: 'Save the next useful action and destination so content does not end with a vague learn-more path.',
      when: 'Answer this whenever a post, page, email, or Quick Link should move someone forward.',
      helps: 'Funnels, calendar items, Quick Links, campaign measurement, and content drafts.',
      addLabel: 'Create reusable CTA',
      shortLabel: 'CTA',
    }
  }
  if (sectionId === 'tracking') {
    return {
      question: 'Will this use links we need to measure?',
      reason: 'Save the naming pattern once so promoted links, social links, and campaign URLs can be compared later.',
      when: 'Answer this before publishing promoted links, Quick Links, campaign URLs, or multi-channel content.',
      helps: 'Campaign UTMs, Quick Links, analytics review, and performance signals.',
      addLabel: 'Create tracking rule',
      shortLabel: 'Tracking',
    }
  }
  if (sectionId === 'quality') {
    return {
      question: 'What has to be checked before this goes live?',
      reason: 'Save a small review checklist so claims, sources, accessibility, CTA, tracking, and readiness are visible.',
      when: 'Answer this before scheduled or published content. V1 warns and guides; it does not block publishing.',
      helps: 'Calendar readiness, content drafts, campaign review, source checks, and accessibility.',
      addLabel: 'Create review checklist',
      shortLabel: 'Checklist',
    }
  }
  if (sectionId === 'experiments') {
    return {
      question: 'Are we testing a bigger bet?',
      reason: 'Save the hypothesis and success signal before investing heavily in a course, workshop, VSL, channel, or format.',
      when: 'Answer this when trying a new hook, CTA, channel, destination, or content format.',
      helps: 'Campaign decisions, calendar iteration, analytics interpretation, and future templates.',
      addLabel: 'Create test hypothesis',
      shortLabel: 'Test',
    }
  }
  return {
    question: 'What did the audience already tell us?',
    reason: 'Save a performance signal from search, analytics, social, Vercel, or a manual observation before it changes the plan.',
    when: 'Answer this when real performance suggests a plan, topic, channel, CTA, or destination should change.',
    helps: 'Research analytics review, dashboard gaps, experiments, and strategy adjustments.',
    addLabel: 'Create performance signal',
    shortLabel: 'Signal',
  }
}

export function strategySectionActionLabel(sectionId: StrategyAssetKind) {
  return getStrategySectionQuestion(sectionId).addLabel
}

export const experimentStatusOptions: SelectOption[] = [
  { title: 'Idea', value: 'idea' },
  { title: 'Running', value: 'running' },
  { title: 'Reviewing', value: 'reviewing' },
  { title: 'Decided', value: 'decided' },
  { title: 'Archived', value: 'archived' },
]
export const experimentDecisionOptions: SelectOption[] = [
  { title: 'Keep', value: 'keep' },
  { title: 'Iterate', value: 'iterate' },
  { title: 'Stop', value: 'stop' },
  { title: 'Inconclusive', value: 'inconclusive' },
]
export const inspirationKindOptions: SelectOption[] = [
  { title: 'Loose idea', value: 'idea' },
  { title: 'Article or report', value: 'article' },
  { title: 'Resource or dataset', value: 'resource' },
  { title: 'Website or page', value: 'website' },
  { title: 'Competitor or peer example', value: 'competitor' },
]
export const inspirationActionOptions: SelectOption[] = [
  { title: 'Respond to it', value: 'respond' },
  { title: 'Use as evidence', value: 'evidence' },
  { title: 'Contrast with it', value: 'contrast' },
  { title: 'Learn from the format', value: 'model' },
  { title: 'Save as a topic idea', value: 'topic' },
]

export function GuidedAutofillControls({
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

export function buildAutofillGuidedPrompt({
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
    label: 'What should guide the draft most?',
    choices: [
      { value: 'approved', label: 'Trusted findings', description: 'Prefer items already marked as safe enough to use.' },
      { value: 'seo', label: 'Search demand', description: 'Prefer keyword scores, search intent, and content gaps.' },
      { value: 'evidence', label: 'Sources and proof', description: 'Prefer claims, source links, examples, and validation notes.' },
      { value: 'signals', label: 'Audience behavior', description: 'Prefer analytics and first-party performance signals.' },
    ],
  }
  const useQuestion: GuidedAutofillQuestion = {
    id: 'use',
    label: 'What are we setting up?',
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

export function getStrategyResearchResults(data: MarketingData) {
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

export function getStrategySectionItems(data: MarketingData, sectionId: StrategyAssetKind): StrategyDocument[] {
  if (sectionId === 'audiences') return data.audienceProfiles
  if (sectionId === 'messages') return data.messagePillars
  if (sectionId === 'proof') return data.proofPoints
  if (sectionId === 'ctas') return data.ctas
  if (sectionId === 'tracking') return data.trackingRules
  if (sectionId === 'quality') return data.qualityGates
  if (sectionId === 'experiments') return data.experiments
  return data.performanceSignals
}

export function buildEmptyStrategyDocument(section: StrategySectionConfig): MarketingDocumentInput {
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

export function strategyDraftNeedsResearchFill(sectionId: StrategyAssetKind, draft: Record<string, unknown>) {
  const hasText = (name: string) => textFieldValue(draft[name]).trim().length > 0
  const hasList = (name: string) => stringListValue(draft[name]).trim().length > 0 || textFieldValue(draft[`${name}Text`]).trim().length > 0
  const hasTrackingList = (name: string) => trackingValueText(draft[name]).trim().length > 0 || textFieldValue(draft[`${name}Text`]).trim().length > 0
  const hasQualityChecks = qualityCheckText(draft.checks).trim().length > 0 || textFieldValue(draft.checksText).trim().length > 0
  const hasExperimentVariants = experimentVariantText(draft.variants).trim().length > 0 || textFieldValue(draft.variantsText).trim().length > 0
  const hasMetrics = performanceMetricText(draft.metrics).trim().length > 0 || textFieldValue(draft.metricsText).trim().length > 0

  if (sectionId === 'audiences') return ![hasText('audience'), hasList('needs'), hasList('pains'), hasList('trustTriggers')].some(Boolean)
  if (sectionId === 'messages') return ![hasText('coreClaim'), hasList('supportingClaims'), hasList('approvedPhrases'), hasText('topicCluster')].some(Boolean)
  if (sectionId === 'proof') return ![hasText('claim'), hasText('sourceTitle'), hasText('sourceUrl'), hasText('usageNotes')].some(Boolean)
  if (sectionId === 'ctas') return ![hasText('label'), hasText('destination'), hasText('successSignal')].some(Boolean)
  if (sectionId === 'tracking') return ![hasText('utmSourceRule'), hasText('utmMediumRule'), hasText('utmCampaignPattern'), hasTrackingList('allowedSources')].some(Boolean)
  if (sectionId === 'quality') return ![hasText('whenToUse'), hasQualityChecks, hasText('notes')].some(Boolean)
  if (sectionId === 'experiments') return ![hasText('hypothesis'), hasText('expectedSignal'), hasText('targetPath'), hasText('flagKey'), hasExperimentVariants, hasText('result')].some(Boolean)
  return ![hasText('signalType'), hasText('sourceLabel'), hasText('interpretation'), hasText('recommendation'), hasMetrics].some(Boolean)
}

export function strategyPrefetchCacheKey(sectionId: StrategyAssetKind, recordId: string) {
  return `${sectionId}:${recordId}`
}

export function strategyWorkingDraftStorageKey(sectionId: StrategyAssetKind, recordId: string) {
  return `${sectionId}:${recordId}`
}

function loadStrategyWorkingDrafts(): Record<string, StrategyWorkingDraftEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STRATEGY_WORKING_DRAFTS_STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (err) {
    console.error('Strategy working drafts could not load:', err)
    return {}
  }
}

function saveStrategyWorkingDrafts(entries: Record<string, StrategyWorkingDraftEntry>) {
  if (typeof window === 'undefined') return
  try {
    const trimmedEntries = Object.fromEntries(
      Object.entries(entries)
        .sort(([, first], [, second]) => new Date(second.savedAt).getTime() - new Date(first.savedAt).getTime())
        .slice(0, 60),
    )
    window.localStorage.setItem(STRATEGY_WORKING_DRAFTS_STORAGE_KEY, JSON.stringify(trimmedEntries))
  } catch (err) {
    console.error('Strategy working drafts could not save:', err)
  }
}

export function loadStrategyWorkingDraft(sectionId: StrategyAssetKind, recordId: string, sourceUpdatedAt?: string) {
  const entry = loadStrategyWorkingDrafts()[strategyWorkingDraftStorageKey(sectionId, recordId)]
  if (!entry || entry.sectionId !== sectionId || entry.recordId !== recordId) return null
  if (sourceUpdatedAt && entry.sourceUpdatedAt && entry.sourceUpdatedAt !== sourceUpdatedAt) {
    const sourceTime = new Date(sourceUpdatedAt).getTime()
    const savedTime = new Date(entry.savedAt).getTime()
    if (!Number.isFinite(sourceTime) || !Number.isFinite(savedTime) || savedTime < sourceTime) return null
  }
  return entry
}

export function saveStrategyWorkingDraft(sectionId: StrategyAssetKind, recordId: string, draft: Record<string, unknown>, sourceUpdatedAt?: string) {
  const key = strategyWorkingDraftStorageKey(sectionId, recordId)
  saveStrategyWorkingDrafts({
    ...loadStrategyWorkingDrafts(),
    [key]: {
      sectionId,
      recordId,
      sourceUpdatedAt,
      draft,
      savedAt: new Date().toISOString(),
    },
  })
}

export function clearStrategyWorkingDraft(sectionId: StrategyAssetKind, recordId: string) {
  const entries = loadStrategyWorkingDrafts()
  delete entries[strategyWorkingDraftStorageKey(sectionId, recordId)]
  saveStrategyWorkingDrafts(entries)
}

export function getNextStrategySectionForPrefetch(sectionId: StrategyAssetKind): StrategyAssetKind | null {
  const order: StrategyAssetKind[] = ['audiences', 'messages', 'proof', 'ctas', 'tracking', 'quality', 'experiments', 'performance']
  const currentIndex = order.indexOf(sectionId)
  return currentIndex >= 0 ? order[currentIndex + 1] || null : null
}

export function getStrategyDependencyTarget(sectionId: StrategyAssetKind, data: MarketingData): AutopilotWorkspaceTarget {
  const firstProof = data.proofPoints[0]
  const firstMessage = data.messagePillars[0]
  const firstCta = data.ctas[0]
  const firstLink = data.linkItems[0]
  const firstCalendarItem = data.calendarItems[0]
  const firstPerformanceSignal = data.performanceSignals[0]

  if (sectionId === 'messages') {
    return firstProof
      ? { view: 'strategy', targetId: 'autopilot-strategy-section-proof', strategySection: 'proof', recordId: firstProof._id }
      : { view: 'research', targetId: 'autopilot-research-review' }
  }

  if (sectionId === 'proof' || sectionId === 'audiences') return { view: 'research', targetId: 'autopilot-research-review' }

  if (sectionId === 'ctas') {
    if (firstLink) return { view: 'linkTree', targetId: 'autopilot-link-editor', recordId: firstLink._id }
    if (firstCalendarItem) return { view: 'calendar', targetId: 'autopilot-calendar-editor', recordId: firstCalendarItem._id }
    return { view: 'research', targetId: 'autopilot-research-create-setup' }
  }

  if (sectionId === 'tracking') {
    if (firstLink) return { view: 'linkTree', targetId: 'autopilot-link-editor', recordId: firstLink._id }
    return firstCalendarItem
      ? { view: 'calendar', targetId: 'autopilot-calendar-editor', recordId: firstCalendarItem._id }
      : { view: 'calendar', targetId: 'autopilot-calendar-add' }
  }

  if (sectionId === 'quality') {
    if (firstProof) return { view: 'strategy', targetId: 'autopilot-strategy-section-proof', strategySection: 'proof', recordId: firstProof._id }
    if (firstMessage) return { view: 'strategy', targetId: 'autopilot-strategy-section-messages', strategySection: 'messages', recordId: firstMessage._id }
    return { view: 'research', targetId: 'autopilot-research-review' }
  }

  if (sectionId === 'experiments') {
    if (firstPerformanceSignal) return { view: 'strategy', targetId: 'autopilot-strategy-section-performance', strategySection: 'performance', recordId: firstPerformanceSignal._id }
    return { view: 'research', targetId: 'autopilot-research-review' }
  }

  if (firstCta) return { view: 'strategy', targetId: 'autopilot-strategy-section-ctas', strategySection: 'ctas', recordId: firstCta._id }
  return { view: 'research', targetId: 'autopilot-research-review' }
}

export function buildStrategyPatch(sectionId: StrategyAssetKind, draft: Record<string, unknown>): Record<string, unknown> {
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
      targetPath: textFieldValue(draft.targetPath),
      flagKey: textFieldValue(draft.flagKey),
      variants: experimentVariantsFromDraft(draft),
      primaryMetric: textFieldValue(draft.primaryMetric),
      qaNotes: textFieldValue(draft.qaNotes),
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

export function textFieldValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function editedTextValue(draft: Record<string, unknown>, name: string, fallback: string) {
  return typeof draft[name] === 'string' ? (draft[name] as string) : fallback
}

export function stringListValue(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join('\n')
    : ''
}

export function trackingValueText(value: unknown) {
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

export function qualityCheckText(value: unknown) {
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

export function experimentVariantText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object' ? (item as { key?: string; label?: string; notes?: string; previewUrl?: string }) : {}
          return [record.key, record.label, record.notes, record.previewUrl].filter(Boolean).join(' | ')
        })
        .filter(Boolean)
        .join('\n')
    : ''
}

export function experimentTrackedMetricText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object'
            ? (item as { key?: string; label?: string; eventName?: string; unit?: string; role?: string; notes?: string })
            : {}
          return [record.key, record.label, record.eventName, record.unit, record.role, record.notes].filter(Boolean).join(' | ')
        })
        .filter(Boolean)
        .join('\n')
    : ''
}

export function experimentSuccessTrackerText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object'
            ? (item as { title?: string; metricKeys?: string[]; condition?: string; threshold?: number; successWhen?: string; notes?: string })
            : {}
          return [
            record.title,
            Array.isArray(record.metricKeys) ? record.metricKeys.join(', ') : '',
            record.condition,
            typeof record.threshold === 'number' ? record.threshold : '',
            record.successWhen || record.notes,
          ].filter((part) => part !== undefined && part !== '').join(' | ')
        })
        .filter(Boolean)
        .join('\n')
    : ''
}

export function performanceMetricText(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item && typeof item === 'object' ? (item as { label?: string; value?: number; unit?: string; change?: string; variantKey?: string; eventName?: string }) : {}
          return [record.label, typeof record.value === 'number' ? record.value : '', record.unit, record.change, record.variantKey, record.eventName].filter((part) => part !== undefined && part !== '').join(' | ')
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

export function experimentVariantsFromDraft(draft: Record<string, unknown>) {
  const edited = textFieldValue(draft.variantsText)
  return splitLines(edited || experimentVariantText(draft.variants)).map((line) => {
    const [key, label, notes, previewUrl] = line.split('|').map((part) => part.trim())
    return {
      _key: randomKey(),
      _type: 'experimentVariant',
      key: key || slugify(label),
      label: label || key,
      notes: notes || '',
      previewUrl: previewUrl || '',
    }
  })
}

export function experimentTrackedMetricsFromDraft(draft: Record<string, unknown>) {
  const edited = textFieldValue(draft.trackedMetricsText)
  return splitLines(edited || experimentTrackedMetricText(draft.trackedMetrics)).map((line) => {
    const [keyOrLabel, label, eventName, unit, role, notes] = line.split('|').map((part) => part.trim())
    const metricLabel = label || keyOrLabel
    return {
      _key: randomKey(),
      _type: 'experimentMetric',
      key: slugify(keyOrLabel || metricLabel),
      label: metricLabel,
      eventName: eventName || '',
      unit: unit || '',
      role: role || 'secondary',
      source: eventName ? 'vercelEvent' : 'manual',
      notes: notes || '',
    }
  }).filter((metric) => metric.key && metric.label)
}

export function experimentSuccessTrackersFromDraft(draft: Record<string, unknown>) {
  const edited = textFieldValue(draft.successTrackersText)
  return splitLines(edited || experimentSuccessTrackerText(draft.successTrackers)).map((line) => {
    const [title, metricKeysText, condition, threshold, successWhen] = line.split('|').map((part) => part.trim())
    const metricKeys = metricKeysText
      ? metricKeysText.split(',').map((key) => slugify(key.trim())).filter(Boolean)
      : []
    const numericThreshold = threshold ? Number(threshold) : Number.NaN
    return {
      _key: randomKey(),
      _type: 'experimentSuccessTracker',
      title: title || 'Success tracker',
      trackerType: metricKeys.length > 1 ? 'composite' : metricKeys.length === 1 ? 'metricRule' : 'boolean',
      metricKeys,
      condition: condition || (metricKeys.length > 0 ? 'increase' : 'manual'),
      threshold: Number.isFinite(numericThreshold) ? numericThreshold : undefined,
      successWhen: successWhen || '',
    }
  }).filter((tracker) => tracker.title)
}

function performanceMetricsFromDraft(draft: Record<string, unknown>) {
  const edited = textFieldValue(draft.metricsText)
  return splitLines(edited || performanceMetricText(draft.metrics)).map((line) => {
    const [label, value, unit, change, variantKey, eventName] = line.split('|').map((part) => part.trim())
    const numeric = Number(value)
    return {
      _key: randomKey(),
      _type: 'performanceMetric',
      label,
      value: Number.isFinite(numeric) ? numeric : undefined,
      unit: unit || '',
      change: change || '',
      variantKey: variantKey || '',
      eventName: eventName || '',
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
  openRequest,
  completionSignal,
  onOpenView,
  onOpenAutopilotTarget,
  onGenerateInstagramCarousel,
  onGenerateMarketingPlan,
}: {
  data: MarketingData
  savingId: string | null
  tutorialRequest: number
  tutorialLibraryRequest: number
  tutorialId: string
  tutorialDemoRecommendation: boolean
  openRequest: number
  completionSignal: AutopilotCompletionSignal | null
  onOpenView: MarketingViewOpener
  onOpenAutopilotTarget: (target: AutopilotWorkspaceTarget) => void
  onGenerateInstagramCarousel: (questionnaire: MarketingPlanQuestionnaire) => Promise<CarouselWizardResult>
  onGenerateMarketingPlan: (questionnaire: MarketingPlanQuestionnaire) => Promise<CarouselWizardResult>
}) {
  const compactLayout = useMarketingCompactLayout()
  const [open, setOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [autopilotCoachActive, setAutopilotCoachActive] = useState(false)
  const [autopilotInteractionMode, setAutopilotInteractionMode] = useState<AutopilotInteractionMode>('highlight')
  const [hasWorkflowBack, setHasWorkflowBack] = useState(false)
  const [backSignal, setBackSignal] = useState(0)
  const [actionListSignal, setActionListSignal] = useState(0)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialLibraryOpen, setTutorialLibraryOpen] = useState(false)
  const [activeTutorialId, setActiveTutorialId] = useState(tutorialId || defaultDesignerWorkflowTutorial.id)
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0)
  const [tutorialPrepareSignal, setTutorialPrepareSignal] = useState<DesignerWorkflowTutorialPrepareSignal>(null)
  const activeTutorial = getDesignerWorkflowTutorial(activeTutorialId)
  const openViewFromGuide = (view: MarketingViewId) => {
    const opened = onOpenView(view)
    if (opened !== false) setOpen(false)
  }

  const setAutopilotCoachMode = (active: boolean) => {
    setAutopilotCoachActive(active)
    if (active) {
      setAutopilotInteractionMode('highlight')
      setOpen(false)
      setSessionsOpen(false)
      setTutorialOpen(false)
      setTutorialLibraryOpen(false)
    }
  }

  const openAutopilotInteractionMode = (mode: AutopilotInteractionMode) => {
    setAutopilotInteractionMode(mode)
    setAutopilotCoachActive(false)
    setOpen(true)
    setSessionsOpen(false)
    setTutorialOpen(false)
    setTutorialLibraryOpen(false)
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
      return
    }
    if (!tutorialOpen) return
    const currentStep = activeTutorial.steps[tutorialStepIndex]
    const actionByStep: Record<string, string[]> = {
      'open-widget': ['open-workflow'],
      sessions: ['open-sessions'],
      'choose-path': ['choose-plan', 'choose-single-item', 'choose-strategist'],
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

  useEffect(() => {
    if (openRequest <= 0) return
    setOpen(true)
  }, [openRequest])

  const renderWorkflowHost = open || autopilotCoachActive
  const coachOnly = autopilotCoachActive && !open
  const guideWidgetStyle: CSSProperties = compactLayout
    ? { ...styles.guideWidget, left: 12, right: 12, bottom: 12, maxWidth: 'none', justifyItems: 'stretch' }
    : styles.guideWidget
  const guidePopoverStyle: CSSProperties = compactLayout
    ? { ...styles.guidePanel, ...styles.guidePopover, width: '100%', maxWidth: 'none', maxHeight: 'calc(100vh - 92px)', padding: 12 }
    : { ...styles.guidePanel, ...styles.guidePopover }
  const guideToggleStyle: CSSProperties = compactLayout
    ? { ...styles.guideToggle, width: '100%', minHeight: 44 }
    : styles.guideToggle
  const guideHeaderStyle: CSSProperties = compactLayout
    ? { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap' }
    : { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }

  return (
    <div style={guideWidgetStyle}>
      {renderWorkflowHost && (
        <section
          style={coachOnly ? styles.guideCoachHost : guidePopoverStyle}
          data-tour-id={coachOnly ? undefined : 'designer-workflow-panel'}
        >
          {!coachOnly && (
            <div style={guideHeaderStyle}>
            <div>
              {hasWorkflowBack && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                  <button
                    type="button"
                    style={{ ...styles.inlineLink, padding: 0, border: 'none', background: 'transparent', fontSize: 12 }}
                    onClick={() => setBackSignal((current) => current + 1)}
                  >
                    <ChevronLeftIcon style={{ width: 15, height: 15 }} />
                    Back to previous step
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.inlineLink, padding: 0, border: 'none', background: 'transparent', fontSize: 12 }}
                  onClick={() => setActionListSignal((current) => current + 1)}
                  >
                    Browse all actions
                  </button>
                </div>
              )}
              <h2 style={{ margin: 0, fontSize: 20 }}>Choose a marketing action</h2>
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
                Saved sessions
              </button>
              <button
                type="button"
                aria-label="Close marketing autopilot"
                style={{ ...styles.button, width: 34, height: 34, padding: 0 }}
                onClick={() => setOpen(false)}
              >
                <CloseIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>
          )}
          <CarouselWorkflowWizard
            coachOnly={coachOnly}
            interactionMode={autopilotInteractionMode}
            data={data}
            saving={savingId?.startsWith('carousel-') || savingId?.startsWith('marketing-plan-') || false}
            sessionsOpen={sessionsOpen}
            backSignal={backSignal}
            actionListSignal={actionListSignal}
            completionSignal={completionSignal}
            onBackAvailableChange={setHasWorkflowBack}
            onOpenView={openViewFromGuide}
            onOpenAutopilotTarget={onOpenAutopilotTarget}
            onAutopilotCoachActiveChange={setAutopilotCoachMode}
            onInteractionModeChange={setAutopilotInteractionMode}
            onOpenInteractionMode={openAutopilotInteractionMode}
            onGenerateSingleItem={onGenerateInstagramCarousel}
            onGenerateMarketingPlan={onGenerateMarketingPlan}
            tutorialPrepareSignal={tutorialPrepareSignal}
            onTutorialAction={advanceTutorialForAction}
          />
          {!coachOnly && tutorialLibraryOpen && (
          <DesignerWorkflowTutorialLibrary
              onStart={(nextTutorialId) => startTutorial(nextTutorialId, { demoRecommendation: nextTutorialId === 'designer-workflow-recommendation' })}
              onClose={() => setTutorialLibraryOpen(false)}
            />
          )}
        </section>
      )}
      {!autopilotCoachActive && (
        <button
          type="button"
          style={guideToggleStyle}
          aria-expanded={open}
          data-tour-id="designer-workflow-toggle"
          onClick={() => {
            const nextOpen = !open
            if (nextOpen) {
              setAutopilotCoachActive(false)
              setActionListSignal((current) => current + 1)
            }
            setOpen(nextOpen)
          }}
        >
          <DashboardIcon style={{ width: 18, height: 18 }} />
          Marketing autopilot
        </button>
      )}
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
          <h3 style={{ margin: 0, fontSize: 17 }}>Marketing autopilot tutorials</h3>
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
          Open tutorial guide
        </a>
      </div>
    </section>
  )
}

function MarketingAssistantActionList({
  actions,
  query,
  onQueryChange,
  onSelect,
  title = 'Recommended actions',
  description = 'Search the marketing suite by job, section, or signal.',
  compact = false,
}: {
  actions: MarketingAssistantAction[]
  query: string
  onQueryChange: (query: string) => void
  onSelect: (action: MarketingAssistantAction) => void
  title?: string
  description?: string
  compact?: boolean
}) {
  const visibleActions = filterMarketingAssistantActions(actions, query)
  const limitedActions = compact ? visibleActions.slice(0, 6) : visibleActions

  return (
    <section style={{ display: 'grid', gap: 10 }} data-tour-id="designer-workflow-action-list">
      <div>
        <h3 style={{ margin: 0, fontSize: compact ? 15 : 17 }}>{title}</h3>
        {description && <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>{description}</p>}
      </div>
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ ...styles.small, color: 'var(--card-muted-fg-color)', fontWeight: 850 }}>Search by task</span>
        <div style={{ position: 'relative' }}>
          <SearchIcon
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 15,
              height: 15,
              color: 'var(--card-muted-fg-color)',
              pointerEvents: 'none',
            }}
          />
          <input
            data-tour-id="designer-workflow-action-search"
            aria-label="Search marketing assistant actions"
            style={{ ...styles.input, paddingLeft: 34 }}
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Try: test homepage, plan a post, prove a claim..."
          />
        </div>
      </label>
      {limitedActions.length === 0 ? (
        <div style={{ ...styles.small, ...styles.muted, border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10 }}>
          No matching actions. Try "test homepage", "prove a claim", "plan posts", or "results".
        </div>
      ) : (
        <div style={{ display: 'grid', gap: compact ? 7 : 9 }}>
          {limitedActions.map((action) => {
            const actionLabel =
              action.id === 'continue-current-setup'
                ? 'Resume'
                : action.view
                  ? `Open ${getMarketingViewTitle(action.view)}`
                  : action.mode === 'strategist'
                    ? 'Start chat'
                    : 'Start setup'
            const tourId =
              action.id === 'suggest-next-step'
                ? 'designer-workflow-path-plan'
                : action.id === 'continue-current-setup'
                  ? 'designer-workflow-path-single'
                  : undefined

            return (
              <button
                key={action.id}
                type="button"
                data-tour-id={tourId}
                style={{
                  ...styles.templateButton,
                  background: action.recommended ? '#102932' : MARKETING_OPAQUE_CARD_BG,
                  borderColor: action.recommended ? '#007385' : 'var(--card-border-color)',
                  padding: compact ? 9 : 11,
                }}
                onClick={() => onSelect(action)}
              >
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: compact ? 13 : 14 }}>{action.title}</strong>
                  {action.recommended && (
                    <span
                      style={{
                        ...styles.small,
                        borderRadius: 999,
                        padding: '2px 7px',
                        background: 'rgba(0, 115, 133, 0.2)',
                        color: '#4dc4d6',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Recommended
                    </span>
                  )}
                </span>
                <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.4 }}>{action.description}</span>
                <span style={{ ...styles.small, color: action.recommended ? '#b6e8ee' : 'var(--card-muted-fg-color)', lineHeight: 1.35 }}>
                  {action.reason}
                </span>
                <span style={{ ...styles.small, color: '#E36216', fontWeight: 900 }}>{actionLabel}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function CarouselWorkflowWizard({
  coachOnly,
  interactionMode,
  data,
  saving,
  sessionsOpen,
  backSignal,
  actionListSignal,
  completionSignal,
  tutorialPrepareSignal,
  onBackAvailableChange,
  onOpenView,
  onOpenAutopilotTarget,
  onAutopilotCoachActiveChange,
  onInteractionModeChange,
  onOpenInteractionMode,
  onGenerateSingleItem,
  onGenerateMarketingPlan,
  onTutorialAction,
}: {
  coachOnly: boolean
  interactionMode: AutopilotInteractionMode
  data: MarketingData
  saving: boolean
  sessionsOpen: boolean
  backSignal: number
  actionListSignal: number
  completionSignal: AutopilotCompletionSignal | null
  tutorialPrepareSignal: DesignerWorkflowTutorialPrepareSignal
  onBackAvailableChange: (available: boolean) => void
  onOpenView: (view: MarketingViewId) => void
  onOpenAutopilotTarget: (target: AutopilotWorkspaceTarget) => void
  onAutopilotCoachActiveChange: (active: boolean) => void
  onInteractionModeChange: (mode: AutopilotInteractionMode) => void
  onOpenInteractionMode: (mode: AutopilotInteractionMode) => void
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
  const [actionSearch, setActionSearch] = useState('')
  const activeSession = sessions.find((session) => session.id === activeSessionId) || null
  const mode = activeSession?.mode || null
  const stepIndex = activeSession?.stepIndex || 0
  const strategyStepIndex = activeSession?.strategyStepIndex || 0
  const questionnaire = activeSession?.questionnaire || defaultMarketingPlanQuestionnaire()
  const strategyPrompt = activeSession?.strategyPrompt || ''
  const strategySuggestion = activeSession?.strategySuggestion || null
  const strategyUsedAi = activeSession?.strategyUsedAi ?? null
  const strategistMessages = activeSession?.strategistMessages || []
  const strategistDirection = activeSession?.strategistDirection || ''
  const strategistSuggestion = activeSession?.strategistSuggestion || null
  const autopilotPlan = activeSession?.autopilotPlan || null
  const result = activeSession?.result || null
  const latestSetupSession = sessions.find((session) => !session.ephemeral && session.autopilotPlan && getCurrentAutopilotStep(session.autopilotPlan))
  const hasInstagram = data.channels.some((channel) => channel.key === 'instagram' && channel.status !== 'archived')
  const hasAnalytics = data.analyticsSources.some((source) => source.status === 'connected')
  const currentCampaignCount = data.campaigns.filter((campaign) => getCampaignChannelKeys(campaign).includes('instagram')).length
  const steps = mode === 'plan' ? CAMPAIGN_PLAN_WIZARD_STEPS : SINGLE_ITEM_WIZARD_STEPS
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]
  const preparedQuestionnaire = normalizeMarketingPlanQuestionnaire(questionnaire)
  const assistantActions = useMemo(
    () => buildMarketingAssistantActions(data, latestSetupSession),
    [data, latestSetupSession],
  )

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

  useEffect(() => {
    if (actionListSignal <= 0) return
    returnToPathSelection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionListSignal])

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

  useEffect(() => {
    if (!activeSession || (activeSession.mode !== 'plan' && activeSession.mode !== 'strategist') || !activeSession.strategySuggestion || activeSession.autopilotPlan) return
    const restoredPlan = buildMarketingAutopilotPlan(data, activeSession.strategySuggestion, activeSession.questionnaire)
    updateActiveSession({
      autopilotPlan: restoredPlan,
      strategyStepIndex: getAutopilotCurrentIndex(restoredPlan),
    })
    const nextStep = getCurrentAutopilotStep(restoredPlan)
    if (nextStep) onOpenAutopilotTarget(autopilotTargetForStep(nextStep))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, activeSession?.strategySuggestion, activeSession?.autopilotPlan, activeSession?.mode])

  useEffect(() => {
    if (!activeSession?.autopilotPlan) return
    const refreshedPlan = refreshMarketingAutopilotPlan(
      activeSession.autopilotPlan,
      data,
      activeSession.strategySuggestion,
      activeSession.questionnaire,
    )
    if (autopilotPlanFingerprint(refreshedPlan) === autopilotPlanFingerprint(activeSession.autopilotPlan)) return
    updateActiveSession({
      autopilotPlan: refreshedPlan,
      strategyStepIndex: getAutopilotCurrentIndex(refreshedPlan),
    })
    const nextStep = getCurrentAutopilotStep(refreshedPlan)
    if (nextStep) onOpenAutopilotTarget(autopilotTargetForStep(nextStep))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeSession?.id, activeSession?.autopilotPlan, activeSession?.strategySuggestion])

  useEffect(() => {
    if (actionListSignal > 0) return
    if (!activeSession?.autopilotPlan?.coachOpen) return
    const step = getCurrentAutopilotStep(activeSession.autopilotPlan)
    if (!step) {
      onAutopilotCoachActiveChange(false)
      return
    }
    onInteractionModeChange('highlight')
    onOpenAutopilotTarget(autopilotTargetForStep(step))
    onAutopilotCoachActiveChange(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionListSignal, activeSession?.id, activeSession?.autopilotPlan?.coachOpen, activeSession?.autopilotPlan?.currentStepId])

  const openCurrentAutopilotStep = (plan = activeSession?.autopilotPlan || null) => {
    const step = getCurrentAutopilotStep(plan)
    if (!step || !plan) return
    onInteractionModeChange('highlight')
    updateActiveSession({ autopilotPlan: setAutopilotCoachOpen(plan, true) })
    onOpenAutopilotTarget(autopilotTargetForStep(step))
    onAutopilotCoachActiveChange(true)
  }

  const openAutopilotChatMode = () => {
    if (activeSession?.autopilotPlan) {
      updateActiveSession({ autopilotPlan: setAutopilotCoachOpen(activeSession.autopilotPlan, false) })
    }
    onOpenInteractionMode('chat')
  }

  const closeCurrentAutopilotCoach = () => {
    if (!activeSession?.autopilotPlan) {
      onAutopilotCoachActiveChange(false)
      return
    }
    updateActiveSession({ autopilotPlan: setAutopilotCoachOpen(activeSession.autopilotPlan, false) })
    onAutopilotCoachActiveChange(false)
  }

  useEffect(() => {
    if (!completionSignal?.token || !activeSession?.autopilotPlan) return
    const nextPlan = applyAutopilotCompletion(activeSession.autopilotPlan, completionSignal)
    updateActiveSession({
      autopilotPlan: nextPlan,
      strategyStepIndex: getAutopilotCurrentIndex(nextPlan),
    })
    const nextStep = getCurrentAutopilotStep(nextPlan)
    if (nextStep) {
      onOpenAutopilotTarget(autopilotTargetForStep(nextStep))
      if (nextPlan.coachOpen) onInteractionModeChange('highlight')
      onAutopilotCoachActiveChange(nextPlan.coachOpen)
    } else {
      onAutopilotCoachActiveChange(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionSignal?.token])

  const startSession = (nextMode: DesignerWizardMode, patch: Partial<DesignerWorkflowSession> = {}) => {
    const session = prepareDesignerWorkflowSession({ ...createDesignerWorkflowSession(nextMode), ...patch, mode: nextMode })
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
      autopilotPlan: buildMarketingAutopilotPlan(data, demoSuggestion, demoQuestionnaire),
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
      autopilotPlan: null,
    })
    setError('')
    setStrategyError('')
  }

  const returnToPathSelection = () => {
    setActiveSessionId(null)
    setError('')
  }

  const continueLatestSetup = () => {
    if (!latestSetupSession?.autopilotPlan) return
    setActiveSessionId(latestSetupSession.id)
    const plan = setAutopilotCoachOpen(latestSetupSession.autopilotPlan, true)
    setSessions((current) =>
      current.map((session) =>
        session.id === latestSetupSession.id
          ? prepareDesignerWorkflowSession({ ...session, autopilotPlan: plan, updatedAt: new Date().toISOString() })
          : session,
      ),
    )
    const step = getCurrentAutopilotStep(plan)
    if (step) {
      onInteractionModeChange('highlight')
      onOpenAutopilotTarget(autopilotTargetForStep(step))
      onAutopilotCoachActiveChange(true)
    }
  }

  const selectAssistantAction = (action: MarketingAssistantAction) => {
    if (action.id === 'continue-current-setup') {
      continueLatestSetup()
      return
    }
    if (action.mode) {
      startSession(action.mode, {
        strategyPrompt: action.mode === 'plan' ? action.prompt || '' : '',
        strategistDirection: action.mode === 'strategist' ? action.prompt || '' : '',
      })
      onTutorialAction(action.mode === 'strategist' ? 'choose-strategist' : action.mode === 'plan' ? 'choose-plan' : 'choose-single-item')
      return
    }
    if (action.view) onOpenView(action.view)
  }

  const updateStrategistDirection = (nextDirection: string) => {
    updateActiveSession({ strategistDirection: nextDirection })
    setStrategyError('')
  }

  const requestStrategistChat = async () => {
    setStrategyLoading(true)
    setStrategyError('')
    const userText = strategistDirection.trim() || 'What should we grow or clarify next?'
    const now = new Date().toISOString()
    const userMessage: MarketingStrategistMessage = {
      id: `strategist-user-${Date.now()}-${randomKey()}`,
      role: 'user',
      content: userText,
      createdAt: now,
    }
    const nextMessages = [...strategistMessages, userMessage].slice(-30)
    updateActiveSession({
      strategistMessages: nextMessages,
      strategistDirection: '',
      strategistSuggestion: null,
      strategySuggestion: activeSession?.autopilotPlan ? activeSession.strategySuggestion : null,
      autopilotPlan: activeSession?.autopilotPlan || null,
      result: null,
    })
    try {
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'strategistChat',
          draft: buildStrategistChatDraft(data, activeSession, questionnaire),
          prompt: userText,
          messages: nextMessages.map((message) => ({ role: message.role, content: message.content })),
          analyticsTakeaways: serializeAnalyticsTakeawaysForAi(buildAnalyticsInterpretations(data)),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      if (!response.ok || !payload.suggestion?.strategistChat) throw new Error(payload.error || 'The strategist could not create a recommendation.')
      const assistantText =
        payload.suggestion.strategistChat.assistantMessage ||
        payload.suggestion.strategistChat.primaryRecommendation?.summary ||
        payload.suggestion.summary ||
        'I found a next move. Review it before creating a checklist.'
      const assistantMessage: MarketingStrategistMessage = {
        id: `strategist-assistant-${Date.now()}-${randomKey()}`,
        role: 'assistant',
        content: assistantText,
        createdAt: new Date().toISOString(),
      }
      updateActiveSession({
        strategistMessages: [...nextMessages, assistantMessage].slice(-30),
        strategistSuggestion: payload.suggestion,
        strategyUsedAi: !!payload.usedAi,
      })
      onTutorialAction('strategist-recommendation-ready')
    } catch (requestError) {
      console.error('Marketing autopilot chat failed:', requestError)
      setStrategyError(requestError instanceof Error ? requestError.message : 'Marketing Autopilot could not create a recommendation.')
    } finally {
      setStrategyLoading(false)
    }
  }

  const acceptStrategistAction = (actionKind: MarketingStrategistActionKind | string) => {
    if (!strategistSuggestion?.strategistChat?.primaryRecommendation) return
    const actionId = `${actionKind}-${Date.now()}-${randomKey()}`
    if (actionKind === 'saveForLater') {
      updateActiveSession({
        strategistAcceptedActionRefs: [...(activeSession?.strategistAcceptedActionRefs || []), actionId].slice(-24),
        strategistMessages: [
          ...strategistMessages,
          ({
            id: `strategist-saved-${Date.now()}-${randomKey()}`,
            role: 'assistant',
            content: 'Saved for later in this local session. Nothing was published or changed in the CMS.',
            createdAt: new Date().toISOString(),
          } satisfies MarketingStrategistMessage),
        ].slice(-30),
      })
      return
    }
    if (actionKind === 'followUp') {
      updateStrategistDirection('What should we compare this against, and what would make it worth doing now?')
      return
    }

    const nextQuestionnaire = questionnaireFromStrategistSuggestion(strategistSuggestion, questionnaire, data, actionKind)
    const setupSuggestion = strategistSuggestionToAutopilotSuggestion(strategistSuggestion, data, nextQuestionnaire, actionKind)
    const nextAutopilotPlan = buildMarketingAutopilotPlan(data, setupSuggestion, nextQuestionnaire)
    const nextStep = getCurrentAutopilotStep(nextAutopilotPlan)
    const guidedPlan = nextStep ? setAutopilotCoachOpen(nextAutopilotPlan, true) : nextAutopilotPlan
    updateActiveSession({
      questionnaire: nextQuestionnaire,
      strategyPrompt: setupSuggestion.researchProject?.brief || strategistSuggestion.strategistChat.primaryRecommendation.setupPrompt || '',
      strategySuggestion: setupSuggestion,
      strategyUsedAi: strategyUsedAi,
      strategyStepIndex: 0,
      strategistAcceptedActionRefs: [...(activeSession?.strategistAcceptedActionRefs || []), actionId].slice(-24),
      autopilotPlan: guidedPlan,
      result: null,
    })
    if (nextStep) {
      onInteractionModeChange('highlight')
      onOpenAutopilotTarget(autopilotTargetForStep(nextStep))
      onAutopilotCoachActiveChange(true)
    }
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
      const nextAutopilotPlan = buildMarketingAutopilotPlan(data, payload.suggestion, questionnaire)
      const nextStep = getCurrentAutopilotStep(nextAutopilotPlan)
      const guidedPlan = nextStep ? setAutopilotCoachOpen(nextAutopilotPlan, true) : nextAutopilotPlan
      updateActiveSession({
        strategySuggestion: payload.suggestion,
        strategyUsedAi: !!payload.usedAi,
        strategyStepIndex: 0,
        autopilotPlan: guidedPlan,
        result: null,
      })
      if (nextStep) {
        onInteractionModeChange('highlight')
        onOpenAutopilotTarget(autopilotTargetForStep(nextStep))
        onAutopilotCoachActiveChange(true)
      }
    } catch (requestError) {
      console.error('Strategy assistant used rule-based fallback:', requestError)
      const fallbackSuggestion = buildFallbackWizardStrategySuggestion(data, questionnaire, strategyPrompt)
      const fallbackAutopilotPlan = buildMarketingAutopilotPlan(data, fallbackSuggestion, questionnaire)
      const nextStep = getCurrentAutopilotStep(fallbackAutopilotPlan)
      const guidedPlan = nextStep ? setAutopilotCoachOpen(fallbackAutopilotPlan, true) : fallbackAutopilotPlan
      updateActiveSession({
        strategySuggestion: fallbackSuggestion,
        strategyUsedAi: false,
        strategyStepIndex: 0,
        autopilotPlan: guidedPlan,
        result: null,
      })
      if (nextStep) {
        onInteractionModeChange('highlight')
        onOpenAutopilotTarget(autopilotTargetForStep(nextStep))
        onAutopilotCoachActiveChange(true)
      }
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
      updateActiveSession({
        questionnaire: nextQuestionnaire,
        result: created,
        autopilotPlan: activeSession?.autopilotPlan
          ? applyAutopilotCompletion(activeSession.autopilotPlan, { action: 'research:createProject', recordId: created.researchProjectId || created.researchPlanId })
          : null,
      })
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

  if (coachOnly) {
    return (
      <AutopilotCoachOverlay
        plan={autopilotPlan}
        onClose={closeCurrentAutopilotCoach}
        onOpenChat={openAutopilotChatMode}
        onChoice={(step, choice, choiceIndex) => {
          onOpenAutopilotTarget(autopilotTargetForStep(step))
          window.setTimeout(() => {
            dispatchMarketingAutopilotAction({
              intent: choiceIndex === 0 || choice.tone === 'primary' ? 'confirm' : 'dependency',
              step: {
                id: step.id,
                view: step.view,
                targetId: step.targetId,
                strategySection: step.strategySection,
                expectedAction: step.expectedAction,
                recordId: step.recordId || step.completedRefId,
              },
            })
          }, 120)
        }}
        onStepPreview={(step) => onOpenAutopilotTarget(autopilotTargetForStep(step))}
      />
    )
  }

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
        <MarketingAssistantActionList
          actions={assistantActions}
          query={actionSearch}
          onQueryChange={setActionSearch}
          onSelect={selectAssistantAction}
          title="What are you trying to make easier?"
          description="Search in plain language: test a page, plan posts, prove a claim, choose a next step, or review what needs attention."
        />
      </div>
    )
  }

  if (autopilotPlan && interactionMode === 'chat') {
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
        <StrategistChatStep
          data={data}
          direction={strategistDirection}
          messages={strategistMessages}
          suggestion={strategistSuggestion}
          loading={strategyLoading}
          error={strategyError || error}
          autopilotPlan={autopilotPlan}
          interactionMode="chat"
          onDirectionChange={updateStrategistDirection}
          onAsk={() => void requestStrategistChat()}
          onAcceptAction={acceptStrategistAction}
          onContinueAutopilot={() => openCurrentAutopilotStep()}
          onResetRecommendation={() => updateActiveSession({ strategistSuggestion: null })}
          onOpenChatMode={openAutopilotChatMode}
          onOpenHighlightMode={() => openCurrentAutopilotStep()}
        />
      </div>
    )
  }

  if (mode === 'strategist') {
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
        <StrategistChatStep
          data={data}
          direction={strategistDirection}
          messages={strategistMessages}
          suggestion={strategistSuggestion}
          loading={strategyLoading}
          error={strategyError || error}
          autopilotPlan={autopilotPlan}
          interactionMode="chat"
          onDirectionChange={updateStrategistDirection}
          onAsk={() => void requestStrategistChat()}
          onAcceptAction={acceptStrategistAction}
          onContinueAutopilot={() => openCurrentAutopilotStep()}
          onResetRecommendation={() => updateActiveSession({ strategistSuggestion: null })}
          onOpenChatMode={openAutopilotChatMode}
          onOpenHighlightMode={() => openCurrentAutopilotStep()}
        />
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
        {autopilotPlan && (
          <AutopilotModeSwitch
            activeMode="highlight"
            onOpenChat={openAutopilotChatMode}
            onOpenHighlight={() => openCurrentAutopilotStep()}
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
          autopilotPlan={autopilotPlan}
          demoRecommendation={!!activeSession?.tutorialDemo}
          creatingSuggestion={suggestedPlanCreating}
          strategyStepIndex={strategyStepIndex}
          assistantActions={assistantActions}
          onPromptChange={(nextPrompt) => {
            onTutorialAction('fill-optional-direction')
            updateActiveSession({
              strategyPrompt: nextPrompt,
              strategySuggestion: null,
              strategyUsedAi: null,
              strategyStepIndex: 0,
              autopilotPlan: null,
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
              autopilotPlan: null,
              result: null,
            })
            setStrategyError('')
          }}
          onOpenRecommendationView={(targetView, nextStepIndex) => {
            updateActiveSession({ strategyStepIndex: nextStepIndex })
            onOpenView(targetView)
          }}
          onContinueAutopilot={() => openCurrentAutopilotStep()}
          onCloseAutopilotCoach={closeCurrentAutopilotCoach}
          onOpenChatMode={openAutopilotChatMode}
          onPreviewAutopilotStep={(step) => onOpenAutopilotTarget(autopilotTargetForStep(step))}
          onSelectAssistantAction={selectAssistantAction}
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
            Choose different path
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
                  Review the findings first. When useful findings are trusted and selected, generate the campaign, funnel, calendar items, and Quick Links from Research.
                </div>
                <div data-tour-id="designer-workflow-created-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(result.researchProjectId || result.researchPlanId) && (
                    <button type="button" style={styles.button} onClick={() => onOpenView('research')}>
                      Continue in Research
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
          Start new session
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
                      {session.mode === 'strategist' ? 'Chat' : session.mode === 'plan' ? 'Planning' : 'One item'} / {formatWorkflowSessionTime(session.updatedAt)}
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

function AutopilotModeSwitch({
  activeMode,
  onOpenChat,
  onOpenHighlight,
}: {
  activeMode: AutopilotInteractionMode
  onOpenChat: () => void
  onOpenHighlight: () => void
}) {
  return (
    <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG, display: 'grid', gap: 10 }}>
      <div>
        <div style={{ ...styles.kicker, marginBottom: 4 }}>Autopilot mode</div>
        <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
          Switch between asking questions in chat and highlighting the exact field or action to complete next.
        </p>
      </div>
      <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <button
          type="button"
          aria-pressed={activeMode === 'chat'}
          style={{
            ...(activeMode === 'chat' ? styles.primaryButton : styles.button),
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onOpenChat}
        >
          Chat with Autopilot
        </button>
        <button
          type="button"
          aria-pressed={activeMode === 'highlight'}
          style={{
            ...(activeMode === 'highlight' ? styles.primaryButton : styles.button),
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={onOpenHighlight}
        >
          Highlight current step
        </button>
      </div>
    </section>
  )
}

function StrategistChatStep({
  data,
  direction,
  messages,
  suggestion,
  loading,
  error,
  autopilotPlan,
  interactionMode,
  onDirectionChange,
  onAsk,
  onAcceptAction,
  onContinueAutopilot,
  onResetRecommendation,
  onOpenChatMode,
  onOpenHighlightMode,
}: {
  data: MarketingData
  direction: string
  messages: MarketingStrategistMessage[]
  suggestion: MarketingAiSuggestion | null
  loading: boolean
  error: string
  autopilotPlan: MarketingAutopilotPlan | null
  interactionMode?: AutopilotInteractionMode
  onDirectionChange: (direction: string) => void
  onAsk: () => void
  onAcceptAction: (actionKind: MarketingStrategistActionKind | string) => void
  onContinueAutopilot: () => void
  onResetRecommendation: () => void
  onOpenChatMode?: () => void
  onOpenHighlightMode?: () => void
}) {
  const recommendation = suggestion?.strategistChat?.primaryRecommendation || null
  const assistantMessage = suggestion?.strategistChat?.assistantMessage || messages.filter((message) => message.role === 'assistant').at(-1)?.content
  const alternatives = suggestion?.strategistChat?.alternatives || []
  const actions = recommendation?.proposedActions?.length ? recommendation.proposedActions : defaultStrategistUiActions()
  const recentHistory = [...messages].reverse()
  const strategyCounts = [
    data.audienceProfiles.length,
    data.messagePillars.length,
    data.proofPoints.length,
    data.ctas.length,
    data.trackingRules.length,
    data.qualityGates.length,
  ]
  const readyCount = strategyCounts.filter((count) => count > 0).length

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12, display: 'grid', gap: 12, background: MARKETING_OPAQUE_CARD_BG }}>
      {autopilotPlan && onOpenChatMode && onOpenHighlightMode && (
        <AutopilotModeSwitch
          activeMode={interactionMode || 'chat'}
          onOpenChat={onOpenChatMode}
          onOpenHighlight={onOpenHighlightMode}
        />
      )}
      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Chat with Marketing Autopilot</h3>
        <textarea
          data-tour-id="designer-workflow-optional-direction"
          aria-label="Strategist direction"
          style={{ ...styles.input, minHeight: 92, resize: 'vertical' }}
          value={direction}
          onChange={(event) => onDirectionChange(event.currentTarget.value)}
          placeholder="Example: Should we test a course, workshop, or VSL around healthcare design?"
        />
        <button
          type="button"
          data-tour-id="designer-workflow-suggest-button"
          style={{ ...styles.primaryButton, width: '100%' }}
          disabled={loading}
          onClick={onAsk}
        >
          {loading ? 'Asking Marketing Autopilot...' : 'Ask Marketing Autopilot'}
        </button>
        <div style={{ ...styles.small, ...styles.muted }}>
          Reusable strategy inputs ready: {readyCount}/6. Autopilot will reuse what fits before asking for anything new.
        </div>
      </section>

      {error && <div style={{ ...styles.small, color: '#E36216', fontWeight: 800 }}>{error}</div>}

      {recommendation && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG, display: 'grid', gap: 12 }}>
          <div>
            <div style={{ ...styles.small, color: '#007385', fontWeight: 900 }}>Autopilot recommendation</div>
            <h3 style={{ margin: '4px 0', fontSize: 18 }}>{recommendation.title || 'Test the next move'}</h3>
            {assistantMessage && <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>{assistantMessage}</p>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...styles.small, borderRadius: 999, padding: '4px 8px', fontWeight: 850, background: 'rgba(0, 115, 133, 0.14)', color: '#4dc4d6' }}>
              {formatStrategistDecision(recommendation.recommendation)}
            </span>
            {recommendation.opportunityType && (
              <span style={{ ...styles.small, borderRadius: 999, padding: '4px 8px', fontWeight: 850, background: 'rgba(160, 171, 197, 0.12)', color: 'var(--card-muted-fg-color)' }}>
                {formatStrategistOpportunityType(recommendation.opportunityType)}
              </span>
            )}
          </div>

          <div data-tour-id="designer-workflow-recommendation-steps" style={{ display: 'grid', gap: 8 }}>
            {actions.map((action) => (
              <button
                key={`${action.kind}-${action.label}`}
                type="button"
                style={{
                  ...styles.templateButton,
                  background: action.kind === 'useForSetup' || action.kind === 'test' ? '#102932' : MARKETING_OPAQUE_CARD_BG,
                  borderColor: action.kind === 'useForSetup' || action.kind === 'test' ? '#007385' : 'var(--card-border-color)',
                }}
                onClick={() => onAcceptAction(action.kind || 'followUp')}
              >
                <strong style={{ fontSize: 14 }}>{action.label}</strong>
                <span style={{ ...styles.small, ...styles.muted }}>{action.description}</span>
              </button>
            ))}
          </div>

          <details>
            <summary style={{ ...styles.small, cursor: 'pointer', fontWeight: 850 }}>Why this recommendation?</summary>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              {(recommendation.rationale || suggestion?.rationale || []).slice(0, 5).map((reason) => (
                <div key={reason} style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
                  {reason}
                </div>
              ))}
              {recommendation.fitScores && (
                <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {Object.entries(recommendation.fitScores).map(([label, value]) => (
                    <div key={label} style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 6 }}>
                      <strong style={{ ...styles.small, display: 'block' }}>{formatStrategistScoreLabel(label)}</strong>
                      <span style={{ ...styles.small, ...styles.muted }}>{typeof value === 'number' ? `${value}/100` : 'Not scored'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {alternatives.length > 0 && (
            <details>
              <summary style={{ ...styles.small, cursor: 'pointer', fontWeight: 850 }}>Other options</summary>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {alternatives.map((alternative) => (
                  <div key={`${alternative.title}-${alternative.reason}`} style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--card-fg-color)' }}>{alternative.title}</strong>: {alternative.reason}
                  </div>
                ))}
              </div>
            </details>
          )}

          <button type="button" style={{ ...styles.inlineLink, justifySelf: 'start', fontSize: 12 }} onClick={onResetRecommendation}>
            Ask about something else
          </button>
        </section>
      )}

      {autopilotPlan && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
          <AutopilotItineraryV2
            plan={autopilotPlan}
            onContinue={onContinueAutopilot}
            onReset={onResetRecommendation}
          />
        </section>
      )}

      {recentHistory.length > 0 && (
        <details>
          <summary style={{ ...styles.small, cursor: 'pointer', color: 'var(--card-muted-fg-color)', fontWeight: 850 }}>
            Conversation history
          </summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
            {recentHistory.map((message) => (
              <div
                key={message.id}
                style={{
                  borderLeft: `3px solid ${message.role === 'assistant' ? '#007385' : '#E36216'}`,
                  paddingLeft: 9,
                  ...styles.small,
                  color: 'var(--card-muted-fg-color)',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: 'var(--card-fg-color)' }}>{message.role === 'assistant' ? 'Autopilot' : 'You'}: </strong>
                {message.content}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function defaultStrategistUiActions(): MarketingStrategistAction[] {
  return [
    {
      id: 'test-this',
      label: 'Test this',
      kind: 'test',
      description: 'Turn this into a small confirmed checklist.',
    },
    {
      id: 'save-for-later',
      label: 'Save for later',
      kind: 'saveForLater',
      description: 'Keep the idea in this session without changing saved CMS content.',
    },
    {
      id: 'ask-follow-up',
      label: 'Ask a follow-up',
      kind: 'followUp',
      description: 'Put a refinement question in the field above.',
    },
    {
      id: 'use-for-setup',
      label: 'Use this for setup',
      kind: 'useForSetup',
      description: 'Build the confirm-each-step Autopilot itinerary.',
    },
  ]
}

function formatStrategistDecision(value: unknown) {
  if (value === 'doNow') return 'Do now'
  if (value === 'testSmall') return 'Test small'
  if (value === 'later') return 'Later'
  if (value === 'no') return 'Not now'
  return 'Recommendation'
}

function formatStrategistOpportunityType(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function formatStrategistScoreLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
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
  autopilotPlan,
  demoRecommendation,
  creatingSuggestion,
  strategyStepIndex,
  assistantActions,
  onPromptChange,
  onSuggest,
  onGenerate,
  onResetSuggestion,
  onOpenRecommendationView,
  onContinueAutopilot,
  onCloseAutopilotCoach,
  onOpenChatMode,
  onPreviewAutopilotStep,
  onSelectAssistantAction,
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
  autopilotPlan: MarketingAutopilotPlan | null
  demoRecommendation: boolean
  creatingSuggestion: boolean
  strategyStepIndex: number
  assistantActions: MarketingAssistantAction[]
  onPromptChange: (prompt: string) => void
  onSuggest: () => void
  onGenerate: () => void
  onResetSuggestion: () => void
  onOpenRecommendationView: (view: MarketingViewId, nextStepIndex: number) => void
  onContinueAutopilot: () => void
  onCloseAutopilotCoach: () => void
  onOpenChatMode: () => void
  onPreviewAutopilotStep: (step: MarketingAutopilotStep) => void
  onSelectAssistantAction: (action: MarketingAssistantAction) => void
}) {
  const [relatedActionSearch, setRelatedActionSearch] = useState('')
  const recommendation = getStrategyAssistantRecommendation(data, suggestion, questionnaire, prompt, demoRecommendation)
  const safeStrategyStepIndex = Math.min(strategyStepIndex, Math.max(0, recommendation.steps.length - 1))
  const hasExistingPlan = !!getLatestActiveResearchProject(data)
  const canCreateResearchProject = !hasExistingPlan || demoRecommendation

  return (
    <div style={{ ...styles.card, boxShadow: 'none', padding: 12, display: 'grid', gap: 12, background: MARKETING_OPAQUE_CARD_BG }}>
      {!suggestion && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" data-tour-id="designer-workflow-suggest-button" style={{ ...styles.primaryButton, width: '100%' }} disabled={loading} onClick={onSuggest}>
            {loading ? 'Thinking...' : 'Suggest next step'}
          </button>

          <details data-tour-id="designer-workflow-optional-direction" open={prompt.trim().length > 0}>
            <summary style={{ ...styles.small, cursor: 'pointer', color: 'var(--card-muted-fg-color)', fontWeight: 850 }}>
              Add direction
            </summary>
            <div style={{ marginTop: 8 }}>
              <textarea
                aria-label="Optional direction"
                style={{ ...styles.input, minHeight: 68, resize: 'vertical' }}
                value={prompt}
                onChange={(event) => onPromptChange(event.currentTarget.value)}
                placeholder={'Example: Plan Instagram content about Housing Truths'}
              />
            </div>
          </details>
        </div>
      )}

      {error && (
        <div style={{ ...styles.small, color: '#E36216' }}>
          {error}
        </div>
      )}

      {suggestion && autopilotPlan && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
          <AutopilotItineraryV2
            plan={autopilotPlan}
            onContinue={onContinueAutopilot}
            onReset={onResetSuggestion}
          />
        </section>
      )}

      {suggestion && !autopilotPlan && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG }}>
          {!autopilotPlan && recommendation.steps.length > 1 && (
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
                  This was generated from CMS state and deterministic rules only. Get evidence before treating it as proof.
                </p>
              )}
            </div>
            {!autopilotPlan && (
              <button
                type="button"
                data-tour-id="designer-workflow-open-next-step"
                style={styles.button}
                onClick={() => onOpenRecommendationView(recommendation.view, Math.min(1, Math.max(0, recommendation.steps.length - 1)))}
              >
                Open {getMarketingViewTitle(recommendation.view)}
              </button>
            )}
            <button type="button" style={styles.button} onClick={onResetSuggestion}>
              Change what I asked for
            </button>
          </div>
          {assistantActions.length > 0 && (
            <MarketingAssistantActionList
              actions={assistantActions.filter((action) => action.id !== 'suggest-next-step')}
              query={relatedActionSearch}
              onQueryChange={setRelatedActionSearch}
              onSelect={onSelectAssistantAction}
              title="Other actions"
              description="Search if this recommendation is not the right move."
              compact
            />
          )}
          {autopilotPlan && (
            <AutopilotItineraryV2
              plan={autopilotPlan}
              onContinue={onContinueAutopilot}
            />
          )}
          {recommendation.strategicContext.length > 0 && (
            <details open={!autopilotPlan} style={{ borderTop: '1px solid var(--card-border-color)', marginTop: 12, paddingTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                Why this matters over time
              </summary>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
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
          {!autopilotPlan && recommendation.steps.length > 0 && (
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
              Nothing was saved to the CMS. Closing or replacing this tutorial removes the demo effect.
            </p>
          )}
          <div data-tour-id="designer-workflow-created-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button
              type="button"
              style={styles.button}
              onClick={() => {
                if (autopilotPlan) {
                  onContinueAutopilot()
                  return
                }
                onOpenRecommendationView('research', Math.max(0, recommendation.steps.length - 1))
              }}
            >
              {autopilotPlan ? 'Continue guided setup' : 'Open Research'}
            </button>
          </div>
        </section>
      )}
      <AutopilotCoachOverlay
        plan={autopilotPlan}
        onClose={onCloseAutopilotCoach}
        onOpenChat={onOpenChatMode}
        onChoice={(step, choice, choiceIndex) => {
          onPreviewAutopilotStep(step)
          window.setTimeout(() => {
            dispatchMarketingAutopilotAction({
              intent: choiceIndex === 0 || choice.tone === 'primary' ? 'confirm' : 'dependency',
              step: {
                id: step.id,
                view: step.view,
                targetId: step.targetId,
                strategySection: step.strategySection,
                expectedAction: step.expectedAction,
                recordId: step.recordId || step.completedRefId,
              },
            })
          }, 120)
        }}
        onStepPreview={onPreviewAutopilotStep}
      />
    </div>
  )
}

function AutopilotItinerary({
  plan,
  onContinue,
}: {
  plan: MarketingAutopilotPlan
  onContinue: () => void
}) {
  const completed = plan.steps.filter((step) => step.status === 'done').length

  return (
    <section data-tour-id="designer-workflow-recommendation-steps" style={{ borderTop: '1px solid var(--card-border-color)', marginTop: 12, paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }}>
        <div>
          <strong style={{ fontSize: 14 }}>Autopilot itinerary</strong>
          <div style={{ ...styles.small, ...styles.muted, marginTop: 3 }}>
            {completed}/{plan.steps.length} confirmed. I will keep moving one step at a time.
          </div>
        </div>
      </div>
      <ol style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
        {plan.steps.map((step, index) => {
          const tone = getAutopilotStepTone(step.status)
          const prompt = getAutopilotCoachPrompt(step)
          return (
            <li
              key={step.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px minmax(0, 1fr) auto',
                gap: 10,
                alignItems: 'start',
                border: `1px solid ${tone.border}`,
                borderRadius: 8,
                background: tone.bg,
                padding: 10,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: tone.badge,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {step.status === 'done' ? '✓' : index + 1}
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 13, color: tone.fg }}>{prompt.question}</strong>
                <span style={{ ...styles.small, ...styles.muted, display: 'block', marginTop: 3, lineHeight: 1.45 }}>
                  {step.status === 'current' ? prompt.shortReason : step.instruction}
                </span>
              </span>
              {step.status === 'current' ? (
                <button
                  type="button"
                  data-tour-id="designer-workflow-open-next-step"
                  style={{ ...styles.primaryButton, padding: '7px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                  onClick={onContinue}
                >
                  Continue guided setup
                </button>
              ) : (
                <span
                  style={{
                    ...styles.small,
                    color: tone.fg,
                    border: `1px solid ${tone.border}`,
                    borderRadius: 999,
                    padding: '3px 8px',
                    textTransform: 'capitalize',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {step.status === 'blocked' ? 'After current' : step.status}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function AutopilotItineraryV2({
  plan,
  onContinue,
  onReset,
}: {
  plan: MarketingAutopilotPlan
  onContinue: () => void
  onReset?: () => void
}) {
  const currentStep = getCurrentAutopilotStep(plan)
  const completed = plan.steps.filter((step) => step.status === 'done').length
  const currentIndex = currentStep ? Math.max(0, plan.steps.findIndex((step) => step.id === currentStep.id)) : plan.steps.length - 1
  const progress = Math.round((completed / Math.max(1, plan.steps.length)) * 100)
  const currentDecision = currentStep ? getAutopilotStepDecision(currentStep) : null
  const currentPrompt = currentStep ? getAutopilotCoachPrompt(currentStep) : null
  const [autopilotStatus, setAutopilotStatus] = useState<MarketingAutopilotStatusDetail | null>(null)

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<MarketingAutopilotStatusDetail>).detail
      setAutopilotStatus(detail?.activity === 'idle' ? null : detail)
    }
    window.addEventListener(MARKETING_AUTOPILOT_STATUS_EVENT, handleStatus)
    return () => window.removeEventListener(MARKETING_AUTOPILOT_STATUS_EVENT, handleStatus)
  }, [])

  useEffect(() => {
    if (!autopilotStatus || autopilotStatus.busy) return
    const timer = window.setTimeout(() => setAutopilotStatus((current) => (current?.token === autopilotStatus.token ? null : current)), 4500)
    return () => window.clearTimeout(timer)
  }, [autopilotStatus])

  const handleChoice = (choice: AutopilotCoachChoice, choiceIndex: number) => {
    if (!currentStep) return
    onContinue()
    window.setTimeout(() => {
      dispatchMarketingAutopilotAction({
        intent: choiceIndex === 0 || choice.tone === 'primary' ? 'confirm' : 'dependency',
        step: {
          id: currentStep.id,
          view: currentStep.view,
          targetId: currentStep.targetId,
          strategySection: currentStep.strategySection,
          expectedAction: currentStep.expectedAction,
          recordId: currentStep.recordId,
        },
      })
    }, 120)
  }

  return (
    <section
      data-tour-id="designer-workflow-recommendation-steps"
      style={{
        borderTop: '1px solid var(--card-border-color)',
        marginTop: 12,
        paddingTop: 12,
        display: 'grid',
        gap: 12,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <strong style={{ fontSize: 14 }}>Current checklist</strong>
          <span style={{ ...styles.small, ...styles.muted }}>{completed}/{plan.steps.length}</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: 'rgba(160, 171, 197, 0.18)', marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 999, background: '#007385' }} />
        </div>
        {autopilotStatus?.message && (
          <div
            style={{
              marginTop: 8,
              border: `1px solid ${autopilotStatus.busy ? 'rgba(0, 166, 184, 0.42)' : 'rgba(54, 139, 87, 0.34)'}`,
              background: autopilotStatus.busy ? 'rgba(0, 115, 133, 0.12)' : 'rgba(54, 139, 87, 0.12)',
              borderRadius: 7,
              padding: '7px 9px',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              color: autopilotStatus.busy ? '#4dc4d6' : '#7dd69e',
              fontSize: 12,
              fontWeight: 850,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: autopilotStatus.busy ? '#00A0B6' : '#368b57',
                flex: '0 0 auto',
              }}
            />
            <span>{autopilotStatus.message}</span>
          </div>
        )}
      </div>

      {currentStep ? (
        <article
          style={{
            borderLeft: '3px solid #007385',
            background: 'rgba(0, 115, 133, 0.1)',
            padding: '12px 12px 12px 14px',
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ ...styles.small, color: '#4dc4d6', fontWeight: 900 }}>
              Next question
            </div>
            {currentDecision && (
              <span
                style={{
                  ...styles.small,
                  color: currentDecision.color,
                  border: `1px solid ${currentDecision.border}`,
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontWeight: 850,
                  whiteSpace: 'nowrap',
                }}
              >
                {currentDecision.label}
              </span>
            )}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>{currentPrompt?.question || currentStep.title}</h3>
            <p style={{ ...styles.small, ...styles.muted, margin: '5px 0 0', lineHeight: 1.5 }}>{currentPrompt?.shortReason || currentStep.requiredAction}</p>
          </div>
          {currentPrompt && (
            <div style={{ display: 'grid', gap: 6 }}>
              {currentPrompt.choices.map((choice, choiceIndex) => (
                <button
                  key={`${currentStep.id}-${choice.label}`}
                  type="button"
                  style={{
                    border: `1px solid ${choice.tone === 'primary' ? 'rgba(0, 166, 184, 0.5)' : 'rgba(160, 171, 197, 0.22)'}`,
                    background: choice.tone === 'primary' ? 'rgba(0, 115, 133, 0.14)' : 'rgba(255, 255, 255, 0.035)',
                    borderRadius: 7,
                    padding: '8px 10px',
                    display: 'grid',
                    gap: 3,
                    color: 'var(--card-fg-color)',
                    cursor: 'pointer',
                    font: 'inherit',
                    textAlign: 'left',
                  }}
                  onClick={() => handleChoice(choice, choiceIndex)}
                >
                  <strong style={{ fontSize: 13 }}>{choice.label}</strong>
                  <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>{choice.detail}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            data-tour-id="designer-workflow-open-next-step"
            style={{ ...styles.primaryButton, width: '100%' }}
            onClick={onContinue}
          >
            Continue guided setup
          </button>
          <details>
            <summary style={{ ...styles.small, cursor: 'pointer', fontWeight: 850 }}>Why this question?</summary>
            <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
              {currentDecision?.detail && <p style={{ ...styles.small, color: currentDecision.color, margin: 0, lineHeight: 1.45 }}>{currentDecision.detail}</p>}
              <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>{currentStep.why}</p>
              <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
                <strong>After this: </strong>
                {currentStep.nextAfter}
              </p>
            </div>
          </details>
        </article>
      ) : (
        <div style={{ ...styles.small, color: '#7dd69e', fontWeight: 850 }}>Setup is ready for content writing.</div>
      )}

      <details>
        <summary style={{ ...styles.small, cursor: 'pointer', fontWeight: 850, color: 'var(--card-muted-fg-color)' }}>
          Show full path
        </summary>
        <ol style={{ display: 'grid', gap: 6, margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
          {plan.steps.map((step, index) => {
            const tone = getAutopilotStepTone(step.status)
            return (
              <li
                key={step.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px minmax(0, 1fr) auto',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: index === plan.steps.length - 1 ? 'none' : '1px solid rgba(160, 171, 197, 0.14)',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: tone.badge,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {step.status === 'done' ? 'OK' : index + 1}
                </span>
                <span
                  style={{
                    minWidth: 0,
                    color: step.status === 'current' ? 'var(--card-fg-color)' : 'var(--card-muted-fg-color)',
                    fontSize: 12,
                    fontWeight: step.status === 'current' ? 850 : 650,
                  }}
                >
                  {step.title}
                </span>
                <span style={{ ...styles.small, color: tone.fg, whiteSpace: 'nowrap' }}>
                  {getAutopilotStepDecision(step).shortLabel}
                </span>
              </li>
            )
          })}
        </ol>
      </details>
      {onReset && (
        <button type="button" style={{ ...styles.inlineLink, justifySelf: 'start', fontSize: 12 }} onClick={onReset}>
          Change what I asked for
        </button>
      )}
    </section>
  )
}

function dispatchMarketingAutopilotAction(detail: MarketingAutopilotActionDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<MarketingAutopilotActionDetail>(MARKETING_AUTOPILOT_ACTION_EVENT, { detail }))
}

export function dispatchMarketingAutopilotStatus(detail: Omit<MarketingAutopilotStatusDetail, 'token'>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<MarketingAutopilotStatusDetail>(MARKETING_AUTOPILOT_STATUS_EVENT, {
      detail: { ...detail, token: Date.now() },
    }),
  )
}

function getAutopilotCoachPrompt(step: MarketingAutopilotStep): AutopilotCoachPrompt {
  const prompt = getAutopilotCoachPromptBase(step)
  if (step.status !== 'done') return prompt
  return {
    ...prompt,
    shortReason: `Filled previously. ${prompt.shortReason}`,
  }
}

function getAutopilotCoachPromptBase(step: MarketingAutopilotStep): AutopilotCoachPrompt {
  if (step.status === 'blocked') {
    return {
      question: `Should we come back to ${step.title} later?`,
      shortReason: 'This step depends on the current question being answered first.',
      choices: [
        { label: 'Yes, later', detail: 'Finish the current step first; Autopilot will come back here automatically.', tone: 'primary' },
        { label: 'Preview it', detail: 'Use the arrows to peek ahead, but do not create or save records yet.' },
      ],
    }
  }

  if (step.expectedAction === 'research:createProject') {
    return {
      question: 'What do we need to learn before making anything?',
      shortReason: 'Start with a research project so the rest of the setup is based on evidence instead of guesses.',
      choices: [
        { label: 'We know the topic', detail: 'Use the highlighted research fields to name the topic, audience, and source material.', tone: 'primary' },
        { label: 'We only have a loose idea', detail: 'Capture the idea or link as inspiration first, then review it.' },
      ],
    }
  }

  if (step.expectedAction === 'research:run') {
    return {
      question: 'Are these the right things to research?',
      shortReason: 'This is the step where we collect actual inputs: sources, site context, SEO signals, and content gaps.',
      choices: [
        { label: 'Yes, get evidence', detail: 'Click Get evidence at the bottom of the setup page.', tone: 'primary' },
        { label: 'Not yet', detail: 'Add missing keywords, source URLs, or questions before running.' },
      ],
    }
  }

  if (step.expectedAction === 'research:approve') {
    return {
      question: 'Which findings are trustworthy enough to use?',
      shortReason: 'Approval means “this can influence our setup.” It does not publish content.',
      choices: [
        { label: 'Useful and credible', detail: 'Mark it trusted so it can feed proof, messages, campaigns, and calendar drafts.', tone: 'primary' },
        { label: 'Weak or irrelevant', detail: 'Reject it or leave it alone so it does not steer the plan.' },
      ],
    }
  }

  if (step.expectedAction === 'research:generateRecords') {
    return {
      question: 'Are the trusted findings ready to become setup drafts?',
      shortReason: 'This turns reviewed research into editable records. It still does not publish anything.',
      choices: [
        { label: 'Yes, create drafts', detail: 'Create the linked campaign, funnel, calendar, and Quick Link drafts.', tone: 'primary' },
        { label: 'Need more evidence', detail: 'Go back and trust stronger findings first.' },
      ],
    }
  }

  if (step.strategySection) return getStrategyAutopilotCoachPrompt(step)

  if (step.expectedAction === 'calendar:createDraft') {
    const hasDraft = Boolean(step.recordId || step.completedRefId)
    return {
      question: 'Do we have a place to write the actual content?',
      shortReason: 'A calendar draft is the handoff point where the designer writes the post, page, carousel, or email.',
      choices: [
        { label: 'Use an existing draft', detail: 'Review the highlighted draft and save it if it fits.', tone: hasDraft ? 'primary' : 'secondary' },
        { label: 'Make a new draft', detail: 'Click Add if no current draft matches this work.', tone: hasDraft ? 'secondary' : 'primary' },
      ],
    }
  }

  if (step.expectedAction === 'calendar:saveDraft') {
    return {
      question: 'Is the content draft ready for writing?',
      shortReason: 'Saving confirms the setup has enough context for someone to make the artifact without redoing strategy.',
      choices: [
        { label: 'Yes, save it', detail: 'Check the brief, channel, date, and connected records, then save.', tone: 'primary' },
        { label: 'Not yet', detail: 'Fill the missing brief or destination details first.' },
      ],
    }
  }

  if (step.expectedAction === 'link:save') {
    return {
      question: 'Will people need a public link to get from social to the work?',
      shortReason: 'Quick Links keep “link in bio” posts from becoming dead ends.',
      choices: [
        { label: 'Yes, use Quick Links', detail: 'Save the highlighted link so the public page points to the right destination.', tone: 'primary' },
        { label: 'No public destination yet', detail: 'Leave this for later until the post has somewhere useful to send people.' },
      ],
    }
  }

  return {
    question: `What should we decide for ${step.title}?`,
    shortReason: 'Autopilot picked the next place that needs a small designer decision.',
    choices: [
      { label: 'Continue here', detail: step.requiredAction, tone: 'primary' },
      { label: 'Need context', detail: 'Open “Why this question?” for the background before saving anything.' },
    ],
  }
}

function getStrategyAutopilotCoachPrompt(step: MarketingAutopilotStep): AutopilotCoachPrompt {
  const hasExisting = Boolean(step.recordId || step.completedRefId)
  const defaultChoices: AutopilotCoachChoice[] = [
    {
      label: hasExisting ? 'Use what we already have' : 'Create it if missing',
      detail: hasExisting ? 'Review the highlighted record and save it if it fits this work.' : 'Use Draft from research, edit the draft, then save it.',
      tone: 'primary',
    },
    {
      label: hasExisting ? 'It does not fit' : 'Not sure yet',
      detail: hasExisting ? 'Only add a new record if the saved one is clearly wrong for this work.' : 'Use the question to decide whether this is really needed before adding more records.',
    },
  ]

  if (step.strategySection === 'audiences') {
    return {
      question: 'Who is this for?',
      shortReason: 'If we cannot name the audience, every caption and visual has to guess.',
      choices: [
        { label: hasExisting ? 'This audience fits' : 'We know the audience', detail: hasExisting ? 'Save the highlighted audience to confirm it.' : 'Add or fill one audience profile from research.', tone: 'primary' },
        { label: 'Wrong audience', detail: 'Create a new one only if the saved audience would make the content sound off.' },
      ],
    }
  }

  if (step.strategySection === 'messages') {
    return {
      question: 'What should people understand after seeing this?',
      shortReason: 'A message pillar keeps the content from becoming a collection of nice-looking but disconnected facts.',
      choices: [
        { label: hasExisting ? 'This message fits' : 'Draft the message', detail: hasExisting ? 'Save the highlighted message if it matches the research.' : 'Use Draft from research to create the main claim and themes.', tone: 'primary' },
        { label: 'The claim is unclear', detail: 'Go back to research or proof before saving a message.' },
      ],
    }
  }

  if (step.strategySection === 'proof') {
    return {
      question: 'What makes the claim believable?',
      shortReason: 'Proof is the source, fact, example, or research item the designer can safely cite.',
      choices: [
        { label: hasExisting ? 'This proof fits' : 'Create proof from research', detail: hasExisting ? 'Save the highlighted proof if the source supports the claim.' : 'Use trusted findings or captured inspiration to create a proof draft.', tone: 'primary' },
        { label: 'Not strong enough', detail: 'Do not reuse it; trust better findings first.' },
      ],
    }
  }

  if (step.strategySection === 'ctas') {
    return {
      question: 'What should someone do after this?',
      shortReason: 'A CTA is just the next useful action: read, save, reply, visit, or contact.',
      choices: [
        { label: hasExisting ? 'This action fits' : 'Choose the action', detail: hasExisting ? 'Save the highlighted CTA if it points to the right destination.' : 'Use research to draft the label and destination.', tone: 'primary' },
        { label: 'No clear destination', detail: 'Create or confirm the destination before saving the CTA.' },
      ],
    }
  }

  if (step.strategySection === 'tracking') {
    return {
      question: 'Will this use links we need to measure?',
      shortReason: 'Tracking matters when a post, email, Quick Link, or campaign link sends people somewhere and we need to compare results later.',
      choices: [
        { label: 'Yes, or not sure', detail: hasExisting ? 'Review and save the highlighted tracking answer.' : 'Add a simple answer for how promoted links should be measured.', tone: 'primary' },
        { label: 'No external link yet', detail: 'Leave this for later until there is a link people can click from outside the site.' },
      ],
    }
  }

  if (step.strategySection === 'quality') {
    return {
      question: 'What has to be true before this goes live?',
      shortReason: 'Quality gates are lightweight checks for claims, sources, accessibility, CTA, and tracking.',
      choices: [
        { label: hasExisting ? 'This checklist fits' : 'Make a checklist', detail: hasExisting ? 'Save the highlighted checklist if it covers this work.' : 'Use Draft from research to create the checks designers should verify.', tone: 'primary' },
        { label: 'Too much right now', detail: 'Keep the checklist small: source, claim, CTA, accessibility, tracking.' },
      ],
    }
  }

  if (step.strategySection === 'experiments') {
    return {
      question: 'Are we testing a bigger bet?',
      shortReason: 'Experiments keep big ideas like courses, workshops, or VSLs from becoming expensive guesses.',
      choices: [
        { label: 'Yes, test small', detail: 'Save the bet and the signal that would make the idea worth expanding.', tone: 'primary' },
        { label: 'No test needed', detail: 'Skip this until the work is meant to validate a larger marketing move.' },
      ],
    }
  }

  if (step.strategySection === 'performance') {
    return {
      question: 'What did the audience already tell us?',
      shortReason: 'Performance signals keep real behavior from getting lost when the plan changes.',
      choices: [
        { label: hasExisting ? 'This signal matters' : 'Save the signal', detail: hasExisting ? 'Save the highlighted signal if it should influence the setup.' : 'Add the useful observation, metric, or source before turning it into research.', tone: 'primary' },
        { label: 'Not relevant', detail: 'Leave it out if it does not change the plan, audience, message, CTA, or timing.' },
      ],
    }
  }

  return {
    question: `Do we need ${step.title.toLowerCase()} for this?`,
    shortReason: 'This reusable input helps future content avoid repeated decisions.',
    choices: defaultChoices,
  }
}

function getAutopilotStepDecision(step: MarketingAutopilotStep) {
  const decision = getAutopilotStepDecisionBase(step)
  if (step.status !== 'done') return decision
  return {
    ...decision,
    shortLabel: 'filled',
    detail: `${decision.detail} This was filled previously; review it with the same choices if you open this step.`,
  }
}

function getAutopilotStepDecisionBase(step: MarketingAutopilotStep) {
  const createDecision = (label: string, shortLabel: string, detail: string, color = '#4dc4d6', border = 'rgba(0, 115, 133, 0.48)') => ({
    label,
    shortLabel,
    detail,
    color,
    border,
  })

  if (step.status === 'blocked') {
    return createDecision('Ready later', 'after current', 'This is already available, but Autopilot will wait for the current prerequisite first.', 'var(--card-muted-fg-color)', 'rgba(160, 171, 197, 0.24)')
  }

  if (step.expectedAction === 'research:run') {
    return createDecision('Get evidence', 'gather', 'This is where real inputs get collected before anything is planned.')
  }
  if (step.expectedAction === 'research:approve') {
    return createDecision('Choose trusted findings', 'trust', 'Mark only the findings that are strong enough to guide setup drafts.')
  }
  if (step.expectedAction === 'research:generateRecords') {
    return createDecision('Create setup drafts', 'create', 'This turns trusted findings into campaign, funnel, calendar, and Quick Link drafts.')
  }
  if (step.completedRefId) {
    return createDecision('Check saved answer', 'review', 'Autopilot has a saved record for this step, but it should still be reviewed with the normal choices before it is reused.', '#ffd166', 'rgba(255, 209, 102, 0.44)')
  }
  if (step.targetId.includes('add')) {
    return createDecision('Answer only if needed', 'answer', 'Autopilot did not find a usable saved answer, so this is the first place a new draft may be needed.', '#ffd166', 'rgba(255, 209, 102, 0.44)')
  }
  if (step.targetId.includes('section') || /^There (is|are) /.test(step.instruction) || /^Review /.test(step.requiredAction)) {
    return createDecision('Check saved answer', 'review', 'Autopilot found saved material, but it needs your confirmation before it reuses it.', '#ffd166', 'rgba(255, 209, 102, 0.44)')
  }
  if (step.targetId.includes('save')) {
    return createDecision('Save answer', 'confirm', 'Autopilot found something usable. Save it to confirm this setup can keep moving.')
  }

  return createDecision('Continue', 'current', 'Autopilot has picked the next question that needs a designer decision.')
}

function AutopilotCoachOverlay({
  plan,
  onClose,
  onOpenChat,
  onChoice,
  onStepPreview,
}: {
  plan: MarketingAutopilotPlan | null
  onClose: () => void
  onOpenChat: () => void
  onChoice: (step: MarketingAutopilotStep, choice: AutopilotCoachChoice, choiceIndex: number) => void
  onStepPreview: (step: MarketingAutopilotStep) => void
}) {
  const step = getCurrentAutopilotStep(plan)
  const currentIndex = getAutopilotCurrentIndex(plan)
  const [visibleStepIndex, setVisibleStepIndex] = useState(currentIndex)

  useEffect(() => {
    setVisibleStepIndex(currentIndex)
  }, [plan?.id, currentIndex])

  if (!plan?.coachOpen || !step) return null
  const safeVisibleStepIndex = Math.min(Math.max(0, visibleStepIndex), Math.max(0, plan.steps.length - 1))

  const handleStepChange = (nextIndex: number) => {
    if (nextIndex >= plan.steps.length) return
    const nextSafeIndex = Math.min(Math.max(0, nextIndex), Math.max(0, plan.steps.length - 1))
    setVisibleStepIndex(nextSafeIndex)
    const nextStep = plan.steps[nextSafeIndex]
    if (nextStep) onStepPreview(nextStep)
  }

  return (
    <GuidedTutorialOverlay
      active
      tutorial={buildAutopilotCoachTutorial(plan, onOpenChat, onChoice)}
      stepIndex={safeVisibleStepIndex}
      onStepChange={handleStepChange}
      onClose={onClose}
      onRestart={() => handleStepChange(currentIndex)}
      onShowLibrary={() => undefined}
      onComplete={onClose}
    />
  )
}

function buildAutopilotCoachTutorial(
  plan: MarketingAutopilotPlan,
  onOpenChat: () => void,
  onChoice: (step: MarketingAutopilotStep, choice: AutopilotCoachChoice, choiceIndex: number) => void,
) {
  return {
    id: `marketing-autopilot-${plan.id}`,
    title: 'Marketing autopilot',
    description: plan.title,
    steps: plan.steps.map((step, index) => {
      const decision = getAutopilotStepDecision(step)
      const prompt = getAutopilotCoachPrompt(step)
      return {
        id: step.id,
        targetId: step.targetId,
        instruction: prompt.question,
        nextLabel: index === plan.steps.length - 1 ? 'Close coach' : 'Next step',
        previousLabel: 'Previous step',
        description: (
          <div style={{ display: 'grid', gap: 10 }}>
            <button
              type="button"
              style={{ ...styles.button, justifySelf: 'start', padding: '7px 10px', fontSize: 12 }}
              onClick={onOpenChat}
            >
              Switch to chat mode
            </button>
            <div style={{ color: 'rgba(255, 255, 255, 0.82)' }}>{prompt.shortReason}</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {prompt.choices.map((choice, choiceIndex) => (
                <button
                  key={`${step.id}-${choice.label}`}
                  type="button"
                  data-tour-id={`autopilot-coach-choice-${step.id}-${choiceIndex}`}
                  style={{
                    border: `1px solid ${choice.tone === 'primary' ? 'rgba(0, 166, 184, 0.58)' : 'rgba(160, 171, 197, 0.24)'}`,
                    background: choice.tone === 'primary' ? 'rgba(0, 115, 133, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    color: '#fff',
                    borderRadius: 7,
                    padding: '8px 10px',
                    display: 'grid',
                    gap: 3,
                    cursor: 'pointer',
                    font: 'inherit',
                    textAlign: 'left',
                  }}
                  onClick={() => onChoice(step, choice, choiceIndex)}
                >
                  <strong style={{ color: '#fff', fontSize: 13 }}>{choice.label}</strong>
                  <span style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{choice.detail}</span>
                </button>
              ))}
            </div>
            <details>
              <summary style={{ cursor: 'pointer', color: '#fff', fontWeight: 800 }}>Why this question?</summary>
              <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
                <div>
                  <strong style={{ color: '#fff' }}>{decision.label}: </strong>
                  {step.requiredAction}
                </div>
                <div>{step.why}</div>
                <div>
                  <strong style={{ color: '#fff' }}>Then: </strong>
                  {step.nextAfter}
                </div>
              </div>
            </details>
          </div>
        ),
      }
    }),
  }
}

function getAutopilotStepTone(status: AutopilotStepStatus) {
  if (status === 'done') {
    return {
      bg: 'rgba(54, 139, 87, 0.12)',
      fg: '#7dd69e',
      border: 'rgba(54, 139, 87, 0.34)',
      badge: '#368b57',
    }
  }
  if (status === 'current') {
    return {
      bg: 'rgba(0, 115, 133, 0.14)',
      fg: '#4dc4d6',
      border: 'rgba(0, 115, 133, 0.55)',
      badge: '#007385',
    }
  }
  if (status === 'blocked') {
    return {
      bg: 'rgba(95, 102, 117, 0.12)',
      fg: 'var(--card-muted-fg-color)',
      border: 'rgba(160, 171, 197, 0.24)',
      badge: '#5f6675',
    }
  }
  return {
    bg: MARKETING_OPAQUE_CARD_BG,
    fg: 'var(--card-muted-fg-color)',
    border: 'var(--card-border-color)',
    badge: '#5f6675',
  }
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

export function MarketingAiAssistPanel({
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
            basePrompt: `Auto-fill this ${copy.target} from existing GoInvo site content, saved strategy answers, research, analytics notes, and the current draft.`,
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
            Auto-fills a starter {copy.target} from existing GoInvo site content, saved strategy answers, research, analytics notes, and the current draft.
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
      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
          Guide the autofill
          <span style={{ ...styles.small, ...styles.muted, marginLeft: 6 }}>(optional)</span>
        </summary>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          <textarea
            aria-label={`Optional notes for this ${copy.target} autofill`}
            rows={2}
            style={styles.input}
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            placeholder={`${copy.prompt} Optional: add a constraint, example, or direction.`}
          />
          <GuidedAutofillControls questions={guidedQuestions} values={guidedAnswers} onChange={setGuidedAnswers} />
        </div>
      </details>
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
                Checked {context.features || 0} articles, {context.caseStudies || 0} case studies, {context.campaigns || 0} campaigns, and {context.analyticsTakeaways || 0} analytics notes.
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
            Fill current draft
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
      { value: 'site', label: 'Existing site content', description: 'Prefer published pages, articles, case studies, links, and saved content.' },
      { value: 'research', label: 'Trusted findings', description: 'Prefer selected findings and source checks from Research.' },
      { value: 'strategy', label: 'Saved answers', description: 'Prefer existing audiences, messages, proof, CTAs, and quality checks.' },
      { value: 'analytics', label: 'Audience behavior', description: 'Prefer analytics notes and performance signals.' },
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

  if (kind === 'experiment') {
    return [
      sourceQuestion,
      {
        id: 'target',
        label: 'What page is being tested?',
        choices: [
          { value: 'homepage', label: 'Homepage', description: 'Set up a root-path test such as the current homepage versus the concept variant.' },
          { value: 'vision', label: 'Vision article', description: 'Set up a test for an article page while preserving canonical content.' },
          { value: 'otherPage', label: 'Other page', description: 'Set up a page test for work, services, landing pages, or another public path.' },
        ],
      },
      {
        id: 'measurement',
        label: 'What should decide the test?',
        choices: [
          { value: 'qualifiedCta', label: 'Qualified CTA', description: 'Use discovery-call, contact, download, or other high-intent clicks.' },
          { value: 'exploration', label: 'Work exploration', description: 'Use related work, services, or case-study exploration signals.' },
          { value: 'engagement', label: 'Article engagement', description: 'Use engaged reads, scroll depth, or follow-through from article content.' },
        ],
      },
      scopeQuestion,
    ]
  }

  return [sourceQuestion, scopeQuestion]
}

export function ResearchOpportunityPreviewList({ opportunities }: { opportunities: ResearchContentOpportunity[] }) {
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


export function AnalyticsMetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
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

export function getAnalyticsInterpretationTone(severity: AnalyticsInterpretationSeverity) {
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
    label: 'Opportunity',
    bg: 'rgba(0, 115, 133, 0.08)',
    fg: '#007385',
    border: 'rgba(0, 115, 133, 0.30)',
  }
}

export function serializeAnalyticsTakeawaysForAi(takeaways: AnalyticsInterpretation[]) {
  return takeaways.slice(0, 8).map((takeaway) => ({
    severity: takeaway.severity,
    title: takeaway.title,
    interpretation: takeaway.interpretation,
    action: takeaway.action,
    affected: takeaway.affected.slice(0, 5),
  }))
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
    <div style={{ borderTop: '1px solid var(--card-border-color)', borderBottom: '1px solid var(--card-border-color)' }}>
      {items.map((item, index) => {
        const selected = item._id === selectedId
        return (
          <button
            key={item._id}
            type="button"
            onClick={() => onSelect(item._id)}
            style={{
              appearance: 'none',
              width: '100%',
              border: 0,
              borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--card-border-color)',
              borderRadius: 0,
              boxShadow: selected ? 'inset 3px 0 0 #007385' : 'none',
              padding: '11px 0 11px 10px',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--card-fg-color)',
              background: selected ? 'rgba(0, 115, 133, 0.08)' : 'transparent',
              font: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong>{item.title || 'Untitled'}</strong>
              <StatusPill status={item.status} />
            </div>
            <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>{renderMeta(item) || 'No details yet'}</div>
          </button>
        )
      })}
    </div>
  )
}

export function FunnelTabButton({
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
        borderTop: '1px solid var(--card-border-color)',
        borderRight: '1px solid var(--card-border-color)',
        borderBottom: `1px solid ${active ? 'var(--card-bg-color)' : 'var(--card-border-color)'}`,
        borderLeft: '1px solid var(--card-border-color)',
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

export function TemplateRail<T extends { id: string; title: string; description: string }>({
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

export function GuidanceChecklist({
  id,
  title,
  items,
}: {
  id?: string
  title: string
  items: Array<{ label: string; done: boolean }>
}) {
  const done = items.filter((item) => item.done).length

  return (
    <div id={id} style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: done === items.length ? 'rgba(54, 139, 87, 0.35)' : 'var(--card-border-color)', scrollMarginTop: 18 }}>
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

export function RelationshipChecklist<T extends { _id: string; title?: string }>({
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

export function RelationshipUsagePanel<T extends { _id: string; title?: string }>({
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

export function PanelTitle({ title, type, id }: { title: string; type: string; id: string }) {
  void type
  void id
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
    </div>
  )
}

export function AdvancedFieldsDropdown({ type, id }: { type: string; id: string }) {
  return (
    <details style={{ ...styles.panel, boxShadow: 'none', padding: 12 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced fields</summary>
      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
          Use the full Sanity document only when this workflow form does not expose the field you need.
        </p>
        <a href={advancedEditHref(type, id)} style={styles.inlineLink}>
          <LaunchIcon style={{ width: 15, height: 15 }} />
          Open full Sanity document
        </a>
      </div>
    </details>
  )
}

export function PanelHeading({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
      <p style={{ ...styles.muted, margin: '4px 0 0', lineHeight: 1.55 }}>{description}</p>
    </div>
  )
}

export function EmptyPanel({
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

export function EmptyInline({ title }: { title: string }) {
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

export function InputField({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) {
  const { markUnsavedChange } = useMarketingUnsavedGuard()

  return (
    <label
      style={{ display: 'block', minWidth: 0 }}
      onChangeCapture={() => markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'form fields you edited')}
    >
      <span style={styles.label}>{label}</span>
      {help && <span style={{ ...styles.small, ...styles.muted, display: 'block', margin: '3px 0 6px', lineHeight: 1.4 }}>{help}</span>}
      {children}
    </label>
  )
}

export function Select({
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

export function Stack({ children, gap }: { children: React.ReactNode; gap: number }) {
  return <div style={{ display: 'grid', gap, minWidth: 0 }}>{children}</div>
}

export function StatusPill({ status, options }: { status?: string; options?: SelectOption[] }) {
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

export function MetricSummary({
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
  if (kind === 'experiment') return suggestion.experiment
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

export function aiString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function aiOption(value: unknown, options: Array<{ value: string }>) {
  const candidate = aiString(value)
  return candidate && options.some((option) => option.value === candidate) ? candidate : undefined
}

export function aiChannelPlatform(value: unknown) {
  const candidate = aiString(value)?.toLowerCase()
  if (candidate === 'instagram' || candidate === 'linkedin' || candidate === 'socialmedia') return 'social'
  return aiOption(value, channelPlatformOptions)
}

export function aiStringList(value: unknown) {
  if (!Array.isArray(value)) return undefined
  const strings = Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)))
  return strings.length > 0 ? strings : undefined
}

function aiRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    : []
}

export function aiFunnelStages(value: unknown) {
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

export function aiContentTypes(value: unknown) {
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

export function aiKeyMetrics(value: unknown) {
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

export function aiExperimentVariants(value: unknown) {
  const variants: Array<{ _key: string; _type: 'experimentVariant'; key: string; label: string; notes?: string }> = []
  aiRecords(value).forEach((variant) => {
    const label = aiString(variant.label) || aiString(variant.key)
    const key = slugify(aiString(variant.key) || label || '')
    if (!key || !label) return
    variants.push({
      _key: aiString(variant._key) || randomKey(),
      _type: 'experimentVariant',
      key,
      label,
      notes: aiString(variant.notes),
    })
  })
  if (variants.length > 0 && !variants.some((variant) => variant.key === 'control')) {
    variants.unshift({
      _key: randomKey(),
      _type: 'experimentVariant',
      key: 'control',
      label: 'Control',
      notes: 'Current public experience.',
    })
  }
  return variants.length > 0 ? variants : undefined
}

export function aiExperimentTrackedMetrics(value: unknown) {
  const metrics: Array<{
    _key: string
    _type: 'experimentMetric'
    key: string
    label: string
    role?: string
    comparison?: string
    source?: string
    eventName?: string
    unit?: string
    notes?: string
  }> = []
  aiRecords(value).forEach((metric) => {
    const label = aiString(metric.label) || aiString(metric.key)
    const key = slugify(aiString(metric.key) || label || '')
    if (!key || !label) return
    metrics.push({
      _key: aiString(metric._key) || randomKey(),
      _type: 'experimentMetric',
      key,
      label,
      role: aiString(metric.role) || 'secondary',
      comparison: aiString(metric.comparison) === 'conceptual' ? 'conceptual' : 'comparative',
      source: aiString(metric.source) || 'manual',
      eventName: aiString(metric.eventName),
      unit: aiString(metric.unit),
      notes: aiString(metric.notes),
    })
  })
  return metrics.length > 0 ? metrics : undefined
}

export function aiExperimentSuccessTrackers(value: unknown) {
  const trackers: Array<{
    _key: string
    _type: 'experimentSuccessTracker'
    title: string
    trackerType?: string
    metricKeys?: string[]
    condition?: string
    threshold?: number
    successWhen?: string
    notes?: string
  }> = []
  aiRecords(value).forEach((tracker) => {
    const title = aiString(tracker.title)
    if (!title) return
    const metricKeys = Array.isArray(tracker.metricKeys)
      ? tracker.metricKeys.map((key) => slugify(aiString(key) || '')).filter(Boolean)
      : (aiStringList(tracker.metricKeys) || []).map((key) => slugify(key)).filter(Boolean)
    const numericThreshold = Number(aiString(tracker.threshold))
    trackers.push({
      _key: aiString(tracker._key) || randomKey(),
      _type: 'experimentSuccessTracker',
      title,
      trackerType: aiString(tracker.trackerType) || (metricKeys.length > 1 ? 'composite' : metricKeys.length === 1 ? 'metricRule' : 'boolean'),
      metricKeys,
      condition: aiString(tracker.condition) || (metricKeys.length > 0 ? 'increase' : 'manual'),
      threshold: Number.isFinite(numericThreshold) ? numericThreshold : undefined,
      successWhen: aiString(tracker.successWhen),
      notes: aiString(tracker.notes),
    })
  })
  return trackers.length > 0 ? trackers : undefined
}

export function aiTemplateSuccessMetrics(value: unknown) {
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

export function getStatusColor(status?: string) {
  return statusColors[status || ''] || {
    bg: 'rgba(128, 128, 128, 0.12)',
    fg: 'var(--card-muted-fg-color)',
    border: 'var(--card-border-color)',
  }
}

export function getPostLinkedLinks(item: MarketingCalendarItem, linkItems: MarketingLinkItem[]) {
  const explicitLinks = item.linkItems || []
  const linkedByReference = linkItems.filter(
    (link) =>
      link.calendarItem?._id === item._id ||
      (link.calendarItems || []).some((calendarItem) => calendarItem._id === item._id),
  )
  return uniqueById([...explicitLinks, ...linkedByReference])
}

export function isCalendarItemPublishReady(item: MarketingCalendarItem) {
  if (!['scheduled', 'published'].includes(item.status || '')) return false
  if (!item.publishAt) return true
  return new Date(item.publishAt).getTime() <= Date.now()
}

export function getAbTestingStats(data: MarketingData) {
  // Active tests exclude archived AND 'idea' drafts, mirroring the main list so
  // the summary chips count the same tests the dashboard shows.
  const activeTests = data.experiments.filter(
    (experiment) => experiment.status !== 'archived' && experiment.status !== 'idea',
  )
  const pageTests = activeTests.filter(isPageExperiment)
  const runningTests = pageTests.filter((experiment) => getAbTestingDisplayStatus(experiment) === 'running')
  const blockedTests = pageTests.filter((experiment) => getAbTestingDisplayStatus(experiment) === 'blocked')
  const readyTests = pageTests.filter(
    (experiment) =>
      Boolean(experiment.targetPath?.trim()) &&
      Boolean(experiment.flagKey?.trim()) &&
      experimentHasControlVariant(experiment) &&
      Boolean(experiment.primaryMetric?.trim()) &&
      experimentHasTrackedMetric(experiment) &&
      experimentHasSuccessTracker(experiment),
  )

  return {
    total: data.experiments.length,
    active: activeTests.length,
    pageTests: pageTests.length,
    running: runningTests.length,
    blocked: blockedTests.length,
    ready: readyTests.length,
    withAnalyticsSource: pageTests.filter((experiment) => Boolean(experiment.analyticsSource?._id)).length,
    withSignals: pageTests.filter((experiment) => experimentSignalIds(experiment).length > 0).length,
    decided: pageTests.filter((experiment) => getAbTestingDisplayStatus(experiment) === 'decided').length,
  }
}

export function buildAbTestingInsights(data: MarketingData): AbTestingInsight[] {
  const insights: AbTestingInsight[] = []
  // Active tests exclude archived AND 'idea' drafts, mirroring the main list.
  const activeTests = data.experiments.filter(
    (experiment) => experiment.status !== 'archived' && experiment.status !== 'idea',
  )
  const pageTests = activeTests.filter(isPageExperiment)
  const runningTests = pageTests.filter((experiment) => getAbTestingDisplayStatus(experiment) === 'running')
  const connectedSources = data.analyticsSources.filter((source) => source.status !== 'disabled' && isConnectedAnalyticsSource(source))

  if (data.experiments.length === 0) {
    insights.push({
      id: 'abtest-no-experiments',
      severity: 'opportunity',
      title: 'Create the first A/B test',
      interpretation: 'There is no test record yet, so designers cannot see what page is being tested, what changed, or how success will be judged.',
      action: 'Use the Add A/B test flow once it is available; existing homepage and article tests will appear here as dashboard cards.',
      affected: [],
    })
    return insights
  }

  const missingFlagSetup = pageTests.filter(
    (experiment) =>
      !experiment.targetPath?.trim() ||
      !experiment.flagKey?.trim() ||
      !experimentHasControlVariant(experiment) ||
      !experiment.primaryMetric?.trim() ||
      !experimentHasTrackedMetric(experiment) ||
      !experimentHasSuccessTracker(experiment),
  )
  if (missingFlagSetup.length > 0) {
    insights.push({
      id: 'abtest-missing-flag-setup',
      severity: 'warning',
      title: `${formatAbTestingCount(missingFlagSetup.length, 'page test')} ${abTestingNeedVerb(missingFlagSetup.length)} setup before launch`,
      interpretation: 'Do not split traffic until the page path, flag key, control version, primary metric, tracked metrics, and success rule are filled.',
      action: 'Open Test setup and complete the missing launch-readiness items before starting or expanding traffic.',
      affected: titleList(missingFlagSetup, marketingExperimentTitle, 5),
    })
  }

  const missingAnalyticsSource = pageTests.filter((experiment) => !experiment.analyticsSource?._id)
  if (missingAnalyticsSource.length > 0) {
    insights.push({
      id: 'abtest-missing-analytics-source',
      severity: connectedSources.length > 0 ? 'opportunity' : 'warning',
      title: `${formatAbTestingCount(missingAnalyticsSource.length, 'page test')} ${abTestingNeedVerb(missingAnalyticsSource.length)} a results source`,
      interpretation: 'The test needs one named place where designers will review exposure, conversion, and result data.',
      action: connectedSources.length > 0
        ? 'Attach the GA4 or Vercel Analytics source used for this test review.'
        : 'Create or connect a GA4 or Vercel Analytics source, then attach it to this test.',
      affected: titleList(missingAnalyticsSource, marketingExperimentTitle, 5),
    })
  }

  const measurementBlockedTests = pageTests.filter(isAbTestingMeasurementBlocked)
  if (measurementBlockedTests.length > 0) {
    insights.push({
      id: 'abtest-measurement-blocked',
      severity: 'urgent',
      title: `${formatAbTestingCount(measurementBlockedTests.length, 'active test')} ${abTestingNeedVerb(measurementBlockedTests.length)} variant visits and event counts`,
      interpretation: 'Do not call the test running until the readout has per-version visits or exposures plus event counts for every tracked metric.',
      action: 'Open Results evidence and add variant-keyed exposure and event-count metrics before reviewing, expanding traffic, or reporting a winner.',
      affected: titleList(measurementBlockedTests, marketingExperimentTitle, 5),
    })
  }

  const runningWithoutSignals = runningTests.filter((experiment) => experimentSignalIds(experiment).length === 0)
  if (runningWithoutSignals.length > 0) {
    insights.push({
      id: 'abtest-running-without-signals',
      severity: 'warning',
      title: `${formatAbTestingCount(runningWithoutSignals.length, 'running test')} ${abTestingNeedVerb(runningWithoutSignals.length)} result evidence now`,
      interpretation: 'Traffic is already split, but the test has no linked signal for the final readout.',
      action: 'Open Results evidence and link the GA4, Vercel, or manual signal before the review meeting.',
      affected: titleList(runningWithoutSignals, marketingExperimentTitle, 5),
    })
  }

  const nonRunningWithoutSignals = pageTests.filter(
    (experiment) => experiment.status !== 'running' && experimentSignalIds(experiment).length === 0,
  )
  if (nonRunningWithoutSignals.length > 0) {
    insights.push({
      id: 'abtest-missing-readout-signals',
      severity: 'opportunity',
      title: `${formatAbTestingCount(nonRunningWithoutSignals.length, 'page test')} ${abTestingNeedVerb(nonRunningWithoutSignals.length)} evidence before decision review`,
      interpretation: 'The test can be planned before traffic starts, but the decision needs linked evidence so the team can see what changed.',
      action: data.performanceSignals.length > 0
        ? 'Link the relevant GA4, Vercel, or manual signal before moving the test to review.'
        : 'Create or import a GA4, Vercel, or manual signal, then link it before review.',
      affected: titleList(nonRunningWithoutSignals, marketingExperimentTitle, 5),
    })
  }

  const targetCounts = runningTests.reduce<Record<string, string[]>>((acc, experiment) => {
    const path = normalizeMarketingExperimentPath(experiment.targetPath)
    if (!path) return acc
    acc[path] = [...(acc[path] || []), experiment.title || experiment._id]
    return acc
  }, {})
  const overlappingTargets = Object.entries(targetCounts).filter(([, titles]) => titles.length > 1)
  if (overlappingTargets.length > 0) {
    insights.push({
      id: 'abtest-overlapping-running-targets',
      severity: 'urgent',
      title: 'More than one running test targets the same page',
      interpretation: 'Visitors can be assigned to more than one change on the same page, so the result will not clearly belong to one design.',
      action: 'Pause all but one running test on that page, or combine the versions into one traffic split.',
      affected: overlappingTargets.map(([path, titles]) => `${path}: ${titles.join(', ')}`),
    })
  }

  const reviewingWithoutDecision = pageTests.filter(
    (experiment) => experiment.status === 'reviewing' && (!experiment.result?.trim() || !experiment.decision?.trim()),
  )
  if (reviewingWithoutDecision.length > 0) {
    insights.push({
      id: 'abtest-reviewing-without-decision',
      severity: 'opportunity',
      title: `${formatAbTestingCount(reviewingWithoutDecision.length, 'test')} ${abTestingNeedVerb(reviewingWithoutDecision.length)} a result and decision`,
      interpretation: 'The test is in review, but the result summary or decision is still blank.',
      action: 'Write what happened, choose keep, iterate, stop, or inconclusive, then add the decision date.',
      affected: titleList(reviewingWithoutDecision, marketingExperimentTitle, 5),
    })
  }

  const decidedWithoutDate = pageTests.filter((experiment) => experiment.decision && !experiment.decisionDate)
  if (decidedWithoutDate.length > 0) {
    insights.push({
      id: 'abtest-decision-date-gap',
      severity: 'opportunity',
      title: `${formatAbTestingCount(decidedWithoutDate.length, 'decided test')} ${abTestingNeedVerb(decidedWithoutDate.length)} the decision date`,
      interpretation: 'The decision is recorded, but the team will not know when it was made.',
      action: 'Add the decision date to each completed test review.',
      affected: titleList(decidedWithoutDate, marketingExperimentTitle, 5),
    })
  }

  insights.push(...buildAbTestingDataInsights(data, pageTests))

  if (insights.length === 0 && pageTests.length > 0) {
    insights.push({
      id: 'abtest-ready',
      severity: 'healthy',
      title: 'A/B tests are ready to monitor',
      interpretation: 'Each page test has the page, traffic split key, versions, result owner, and linked evidence needed for review.',
      action: 'Check the results dashboard on each reporting cadence, then save the result and decision here.',
      affected: titleList(pageTests, marketingExperimentTitle, 4),
    })
  }

  return insights
}

function formatAbTestingCount(count: number, singular: string) {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function abTestingNeedVerb(count: number) {
  return count === 1 ? 'needs' : 'need'
}

function buildAbTestingDataInsights(data: MarketingData, pageTests: MarketingExperiment[]): AbTestingInsight[] {
  const insights: AbTestingInsight[] = []

  pageTests.forEach((experiment) => {
    const signals = getExperimentPerformanceSignals(experiment, data)
    if (signals.length === 0) return

    const evidence = collectAbTestingMetricEvidence(experiment, signals)
    const experimentTitle = marketingExperimentTitle(experiment)

    if (evidence.length === 0) {
      const signalsWithMetrics = signals.filter((signal) => (signal.metrics || []).some((metric) => metric.label?.trim() || Number.isFinite(metric.value)))
      if (signalsWithMetrics.length > 0 && experimentHasTrackedMetric(experiment) && experimentHasSuccessTracker(experiment)) {
        insights.push({
          id: `abtest-data-unmapped-${experiment._id}`,
          severity: 'opportunity',
          title: `${experimentTitle} has result data that is not matched to a metric`,
          interpretation: 'A result signal is linked, but its metric labels do not match the test metric keys, labels, or event names.',
          action: 'Rename the signal metric or tracked metric so they use the same key, then check the insight again.',
          affected: titleList(signalsWithMetrics, abTestingSignalTitle, 4),
          experimentId: experiment._id,
        })
      }
      return
    }

    const negativeEvidence = evidence.filter((item) => item.outcome === 'negative')
    const positiveEvidence = evidence.filter((item) => item.outcome === 'positive')
    const neutralEvidence = evidence.filter((item) => item.outcome === 'neutral')
    const hasGuardrailRisk = negativeEvidence.some(isAbTestingGuardrailEvidence)
    const hasPrimaryLift = positiveEvidence.some((item) => !isAbTestingGuardrailEvidence(item))
    const sampleAffected = (items: AbTestingMetricEvidence[]) => items.slice(0, 4).map(formatAbTestingEvidence)

    if (negativeEvidence.length > 0) {
      insights.push({
        id: `abtest-data-negative-${experiment._id}`,
        severity: hasGuardrailRisk ? 'urgent' : 'warning',
        title: hasGuardrailRisk
          ? `${experimentTitle} has a guardrail failing`
          : `${experimentTitle} has a success metric moving the wrong way`,
        interpretation: `${sampleAffected(negativeEvidence).join('; ')} ${negativeEvidence.length === 1 ? 'does' : 'do'} not meet the rule for this test.`,
        action: hasGuardrailRisk
          ? 'Do not expand traffic. Review the guardrail and decide whether to iterate, narrow rollout, or stop the variant.'
          : 'Review the variant with the linked evidence before increasing traffic or recording a positive decision.',
        affected: sampleAffected(negativeEvidence),
        experimentId: experiment._id,
      })
      return
    }

    if (positiveEvidence.length > 0) {
      insights.push({
        id: `abtest-data-positive-${experiment._id}`,
        severity: hasPrimaryLift ? 'healthy' : 'opportunity',
        title: hasPrimaryLift
          ? `${experimentTitle} has evidence supporting the variant`
          : `${experimentTitle} guardrails are stable`,
        interpretation: hasPrimaryLift
          ? `${sampleAffected(positiveEvidence).join('; ')} ${positiveEvidence.length === 1 ? 'is' : 'are'} moving in the intended direction.`
          : `${sampleAffected(positiveEvidence).join('; ')} ${positiveEvidence.length === 1 ? 'is' : 'are'} stable, but the primary success metric still needs a comparison value.`,
        action: experiment.status === 'reviewing' || experiment.status === 'decided'
          ? 'Use this readout when writing the result summary and decision notes.'
          : 'Keep monitoring until the readout window is complete, then record the result and decision here.',
        affected: sampleAffected(positiveEvidence),
        experimentId: experiment._id,
      })
      return
    }

    if (neutralEvidence.length > 0) {
      insights.push({
        id: `abtest-data-neutral-${experiment._id}`,
        severity: 'opportunity',
        title: `${experimentTitle} needs a clearer result comparison`,
        interpretation: `${sampleAffected(neutralEvidence).join('; ')} ${neutralEvidence.length === 1 ? 'has' : 'have'} evidence attached, but no change value or threshold comparison.`,
        action: 'Add variant-keyed visits/exposures and event counts to the linked signal. Include a percent change, baseline comparison, or threshold when the event count should decide the winner.',
        affected: sampleAffected(neutralEvidence),
        experimentId: experiment._id,
      })
    }
  })

  return insights
}

function getExperimentPerformanceSignals(experiment: MarketingExperiment, data: MarketingData) {
  const fullSignalsById = new Map(data.performanceSignals.map((signal) => [signal._id, signal]))
  return uniqueById((experiment.performanceSignals || []).filter(Boolean)).map((signal) => ({
    ...signal,
    ...(fullSignalsById.get(signal._id) || {}),
  }))
}

function collectAbTestingMetricEvidence(experiment: MarketingExperiment, signals: MarketingPerformanceSignal[]): AbTestingMetricEvidence[] {
  const evidence: AbTestingMetricEvidence[] = []
  const trackers = (experiment.successTrackers || []).filter((tracker) => tracker.title?.trim())
  const seenEvidence = new Set<string>()

  trackers.forEach((tracker) => {
    const trackedMetrics = getAbTestingTrackerMetrics(experiment, tracker)
    trackedMetrics.forEach((trackedMetric) => {
      const match = findAbTestingSignalMetric(trackedMetric, signals)
      if (!match) return

      const key = [
        tracker._key || tracker.title,
        trackedMetric.key || trackedMetric.label,
        match.signal._id,
        match.metric._key || match.metric.label,
      ].join(':')
      if (seenEvidence.has(key)) return
      seenEvidence.add(key)

      const changeValue = parseAbTestingMetricChange(match.metric.change)
      evidence.push({
        experiment,
        tracker,
        trackedMetric,
        signal: match.signal,
        signalMetric: match.metric,
        outcome: evaluateAbTestingMetricOutcome(tracker, match.metric),
        changeValue,
      })
    })
  })

  return evidence
}

function getAbTestingTrackerMetrics(experiment: MarketingExperiment, tracker: ExperimentSuccessTracker) {
  const trackedMetrics = (experiment.trackedMetrics || []).filter((metric) => metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim())
  const trackerKeys = (tracker.metricKeys || []).map(normalizeAbTestingMetricKey).filter(Boolean)

  if (trackerKeys.length > 0) {
    return trackedMetrics.filter((metric) => {
      const metricKeys = getAbTestingMetricCandidateKeys(metric)
      return trackerKeys.some((trackerKey) => metricKeys.has(trackerKey))
    })
  }

  const primaryMetricKey = normalizeAbTestingMetricKey(experiment.primaryMetric)
  const primaryMetrics = trackedMetrics.filter((metric) => metric.role === 'primary' || getAbTestingMetricCandidateKeys(metric).has(primaryMetricKey))
  return primaryMetrics.length > 0 ? primaryMetrics : trackedMetrics.slice(0, 1)
}

function findAbTestingSignalMetric(trackedMetric: ExperimentTrackedMetric, signals: MarketingPerformanceSignal[]) {
  const trackedKeys = getAbTestingMetricCandidateKeys(trackedMetric)
  const matches: Array<{ signal: MarketingPerformanceSignal; metric: PerformanceSignalMetric }> = []

  for (const signal of signals) {
    for (const metric of signal.metrics || []) {
      const signalKeys = [metric.label, metric.eventName].map(normalizeAbTestingMetricKey).filter(Boolean)
      if (signalKeys.length === 0) continue
      const exactMatch = signalKeys.some((signalKey) => trackedKeys.has(signalKey))
      const fuzzyMatch = signalKeys.some((signalKey) => Array.from(trackedKeys).some((trackedKey) =>
        trackedKey.length > 5 && (signalKey.includes(trackedKey) || trackedKey.includes(signalKey)),
      ))
      if (exactMatch || fuzzyMatch) matches.push({ signal, metric })
    }
  }

  if (matches.length === 0) return null

  // When several signals match (e.g. a stale QA placeholder linked alongside the
  // real Vercel drain readout), prefer the metric that carries a usable
  // comparison value, then one with an explicit variant key, over a metric that
  // matched only by label. This keeps the winner readout on the real data.
  return (
    matches.find((match) => parseAbTestingMetricChange(match.metric.change) !== null) ||
    matches.find((match) => normalizeAbTestingMetricKey(match.metric.variantKey)) ||
    matches[0]
  )
}

function getAbTestingMetricCandidateKeys(metric: ExperimentTrackedMetric) {
  return new Set([metric.key, metric.label, metric.eventName].map(normalizeAbTestingMetricKey).filter(Boolean))
}

function evaluateAbTestingMetricOutcome(tracker: ExperimentSuccessTracker, metric: PerformanceSignalMetric): AbTestingMetricOutcome {
  const condition = normalizeAbTestingCondition(tracker.condition)
  const change = parseAbTestingMetricChange(metric.change)
  const threshold = typeof tracker.threshold === 'number' && Number.isFinite(tracker.threshold) ? tracker.threshold : null
  const metricValue = typeof metric.value === 'number' && Number.isFinite(metric.value) ? metric.value : null
  const comparisonValue = change !== null ? change : metricValue

  if (threshold !== null && comparisonValue !== null) {
    if (isAbTestingNotIncreaseCondition(condition) || isAbTestingDecreaseCondition(condition) || isAbTestingAtMostCondition(condition)) {
      return comparisonValue <= threshold ? 'positive' : 'negative'
    }
    if (isAbTestingNotDecreaseCondition(condition) || isAbTestingIncreaseCondition(condition) || isAbTestingAtLeastCondition(condition)) {
      return comparisonValue >= threshold ? 'positive' : 'negative'
    }
  }

  if (change === null) return 'neutral'

  if (isAbTestingNotDecreaseCondition(condition)) return change >= 0 ? 'positive' : 'negative'
  if (isAbTestingNotIncreaseCondition(condition)) return change <= 0 ? 'positive' : 'negative'
  if (isAbTestingDecreaseCondition(condition)) return change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral'
  if (isAbTestingIncreaseCondition(condition)) return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'

  return 'neutral'
}

function isAbTestingGuardrailEvidence(evidence: AbTestingMetricEvidence) {
  const metricRole = normalizeAbTestingCondition(evidence.trackedMetric.role)
  const trackerText = normalizeAbTestingCondition(`${evidence.tracker.title || ''} ${evidence.tracker.condition || ''}`)
  return metricRole === 'guardrail' || trackerText.includes('guardrail') || isAbTestingNotDecreaseCondition(trackerText) || isAbTestingNotIncreaseCondition(trackerText)
}

function formatAbTestingEvidence(evidence: AbTestingMetricEvidence) {
  const label = evidence.trackedMetric.label || evidence.signalMetric.label || evidence.trackedMetric.key || 'Metric'
  const value = Number.isFinite(evidence.signalMetric.value)
    ? `${formatOptionalNumber(evidence.signalMetric.value)}${evidence.signalMetric.unit ? ` ${evidence.signalMetric.unit}` : ''}`
    : ''
  const change = evidence.signalMetric.change?.trim()
  const details = [value, change].filter(Boolean).join(', ')
  return `${label}${details ? ` (${details})` : ''}`
}

function abTestingSignalTitle(signal: MarketingPerformanceSignal) {
  return signal.title || signal.signalType || signal.provider || 'Result signal'
}

export function labelForAnalyticsProvider(provider?: string) {
  if (provider === 'vercel') return 'Vercel Analytics'
  return labelFor(analyticsProviderOptions, provider)
}

function isVercelAnalyticsProvider(provider?: string) {
  return provider === 'vercel' || provider === 'vercelAnalytics' || provider === 'vercelSpeedInsights'
}

export function getAbTestingVercelSource(experiment: MarketingExperiment) {
  const source = experiment.analyticsSource
  if (!source) return null
  if (isVercelAnalyticsProvider(source.provider) || source.vercelProject || source.dashboardUrl?.includes('vercel.com')) return source
  return null
}

export function getAbTestingDashboardUrl(experiment: MarketingExperiment) {
  return experiment.vercelDashboardUrl?.trim() || experiment.analyticsSource?.dashboardUrl?.trim() || ''
}

export function getAbTestingTrackedVercelEvents(experiment: MarketingExperiment) {
  const events = new Set<string>()
  if (experiment.flagKey?.trim()) events.add('experiment_exposure')
  ;(experiment.trackedMetrics || []).forEach((metric) => {
    if (metric.source === 'vercelEvent' && metric.eventName?.trim()) events.add(metric.eventName.trim())
  })
  return Array.from(events)
}

export function getAbTestingComparativeResults(experiment: MarketingExperiment, limit = 4): AbTestingComparisonResult[] {
  const signals = uniqueById((experiment.performanceSignals || []).filter(Boolean))
  const trackedMetrics = getAbTestingComparableMetrics(experiment)
  const controlLabel = getAbTestingControlVariantLabel(experiment)
  const variantLabel = getAbTestingTreatmentVariantLabel(experiment)

  return trackedMetrics.slice(0, limit).map((trackedMetric, index) => {
    const match = findAbTestingSignalMetric(trackedMetric, signals)
    const tracker = findAbTestingTrackerForMetric(experiment, trackedMetric)
    const condition = getAbTestingMetricComparisonCondition(trackedMetric, tracker)
    const metricLabel = trackedMetric.label || trackedMetric.key || trackedMetric.eventName || experiment.primaryMetric || 'Success metric'
    const metricRole = getAbTestingMetricRoleLabel(trackedMetric, tracker)
    const key = trackedMetric._key || trackedMetric.key || trackedMetric.label || `${metricLabel}-${index}`

    if (!match) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'Needs comparison',
        detail: `Link ${controlLabel} vs ${variantLabel} data for this metric.`,
        status: 'needsComparison',
        changeValue: null,
        score: 0,
      }
    }

    const changeValue = parseAbTestingMetricChange(match.metric.change)
    if (changeValue === null) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'No winner yet',
        detail: `The linked signal exists, but it does not say how ${variantLabel} compares with ${controlLabel}.`,
        status: 'needsComparison',
        changeValue: null,
        score: 0,
      }
    }

    if (Math.abs(changeValue) < 0.01) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'Even',
        detail: `${controlLabel} and ${variantLabel} are even on this metric.`,
        status: 'even',
        changeValue,
        score: 12,
      }
    }

    const lowerIsBetter = isAbTestingDecreaseCondition(condition) || isAbTestingNotIncreaseCondition(condition)
    const variantWins = lowerIsBetter ? changeValue < 0 : changeValue > 0
    const status: AbTestingComparisonStatus = variantWins ? 'variant' : 'control'
    const winnerLabel = variantWins ? `${variantLabel} leading` : `${controlLabel} leading`
    const movement = formatAbTestingComparisonChange(match.metric.change, changeValue)
    const position = changeValue > 0 ? 'above' : 'below'

    return {
      key,
      metricLabel,
      metricRole,
      winnerLabel,
      detail: variantWins
        ? `${variantLabel} is ${movement} ${position} ${controlLabel}.`
        : `${variantLabel} is ${movement} ${position} ${controlLabel}, which favors ${controlLabel} for this rule.`,
      status,
      changeValue,
      score: Math.min(100, Math.max(14, Math.abs(changeValue))),
    }
  })
}

export function getAbTestingVariantEventRows(experiment: MarketingExperiment): AbTestingVariantEventRow[] {
  const variants = getAbTestingVariantOptions(experiment)
  const metricRecords = getAbTestingSignalMetricRecords(experiment)
  const exposureMetric: ExperimentTrackedMetric = {
    _key: 'experiment-exposure',
    key: 'experiment-exposure',
    label: 'Visits / exposures',
    eventName: 'experiment_exposure',
    unit: 'visits',
  }

  const exposureCells = variants.map((variant) => {
    const metric = findAbTestingMetricForVariant(metricRecords, variant, exposureMetric, true)
    const value = numericPerformanceMetricValue(metric?.metric)
    return {
      variant,
      value,
      denominator: null,
      rate: null,
      unit: metric?.metric.unit || 'visits',
    }
  })
  const exposureByVariant = new Map(exposureCells.map((cell) => [cell.variant.key, cell.value]))

  // Show every tracked metric in the table — including conceptual (single-variant)
  // ones — so the readout captures them. Conceptual rows are tagged so the
  // measurement-gap check below can exclude them from "blocked" status.
  const explicitMetrics = (experiment.trackedMetrics || []).filter(
    (metric) => metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim(),
  )
  const rowMetrics = explicitMetrics.length > 0 ? explicitMetrics : getAbTestingComparableMetrics(experiment)
  const trackedRows = rowMetrics
    .filter((metric) => !isAbTestingExposureMetric(metric))
    .map((trackedMetric, index) => {
      const role = getAbTestingMetricRoleLabel(trackedMetric, findAbTestingTrackerForMetric(experiment, trackedMetric))
      const cells = variants.map((variant) => {
        const metric = findAbTestingMetricForVariant(metricRecords, variant, trackedMetric, false)
        const value = numericPerformanceMetricValue(metric?.metric)
        const denominator = exposureByVariant.get(variant.key) ?? null
        const rate = value !== null && denominator !== null && denominator > 0 ? (value / denominator) * 100 : null
        return {
          variant,
          value,
          denominator,
          rate,
          unit: metric?.metric.unit || trackedMetric.unit || 'events',
        }
      })

      return {
        key: trackedMetric._key || trackedMetric.key || trackedMetric.eventName || trackedMetric.label || `metric-${index}`,
        label: trackedMetric.label || trackedMetric.eventName || trackedMetric.key || 'Tracked event',
        role,
        comparison: trackedMetric.comparison === 'conceptual' ? 'conceptual' : 'comparative',
        cells,
      }
    })

  return [
    {
      key: 'visits-exposures',
      label: 'Visits / exposures',
      isExposure: true,
      comparison: 'comparative',
      cells: exposureCells,
    },
    ...trackedRows,
  ]
}

// Minimum per-variant exposures before a readout is trusted to show a rate or
// declare a winner. A low bar to prevent "winner on 1 visit" / >100% rates from
// tiny samples — not a statistical-significance test.
const AB_MIN_EXPOSURES_PER_VARIANT = 30

function getAbTestingMeasurementGaps(experiment: MarketingExperiment) {
  const variants = getAbTestingVariantOptions(experiment)
  const rows = getAbTestingVariantEventRows(experiment)
  const exposureRow = rows.find((row) => row.isExposure)
  // Only comparative metrics gate measurement readiness. Conceptual metrics are
  // single-variant captures (e.g. concept-only discovery form starts) and must
  // never block the test from being called measurable.
  const metricRows = rows.filter((row) => !row.isExposure && row.comparison !== 'conceptual')
  const missingVariantBreakout = variants.length < 2
  const missingExposure = !exposureRow || exposureRow.cells.some((cell) => cell.value === null)
  const missingEvents = metricRows.length === 0 || metricRows.some((row) => row.cells.some((cell) => cell.value === null))
  const missingRates = metricRows.some((row) => row.cells.some((cell) => cell.value !== null && cell.denominator === null))
  // Too few exposures per variant to trust any rate or winner.
  const lowSample =
    !exposureRow ||
    exposureRow.cells.length === 0 ||
    exposureRow.cells.some((cell) => (cell.value ?? 0) < AB_MIN_EXPOSURES_PER_VARIANT)

  return {
    missingVariantBreakout,
    missingExposure,
    missingEvents,
    missingRates,
    lowSample,
    ready: !missingVariantBreakout && !missingExposure && !missingEvents && !missingRates && !lowSample,
  }
}

function isAbTestingMeasurementReady(experiment: MarketingExperiment) {
  return getAbTestingMeasurementGaps(experiment).ready
}

export function isAbTestingMeasurementBlocked(experiment: MarketingExperiment) {
  if (experiment.decision || experiment.status === 'archived') return false
  if (experiment.status !== 'running' && experiment.status !== 'reviewing') return false
  return !isAbTestingMeasurementReady(experiment)
}

export function getAbTestingComparisonSummary(experiment: MarketingExperiment, results = getAbTestingComparativeResults(experiment)): AbTestingComparisonSummary {
  if (results.length === 0) {
    return {
      label: 'No metrics yet',
      detail: 'Add the metrics this test should compare.',
      status: 'needsComparison',
    }
  }

  const pendingCount = results.filter((result) => result.status === 'needsComparison').length
  const variantCount = results.filter((result) => result.status === 'variant').length
  const controlCount = results.filter((result) => result.status === 'control').length
  const evenCount = results.filter((result) => result.status === 'even').length
  const controlLabel = getAbTestingControlVariantLabel(experiment)
  const variantLabel = getAbTestingTreatmentVariantLabel(experiment)

  if (pendingCount === results.length) {
    return {
      label: 'No winner yet',
      detail: 'No comparison values are ready yet.',
      status: 'needsComparison',
    }
  }

  if (variantCount > controlCount && variantCount >= evenCount) {
    return {
      label: `${variantLabel} leading`,
      detail: `${variantCount} of ${results.length} metric${results.length === 1 ? '' : 's'} favor the test version.`,
      status: 'variant',
    }
  }

  if (controlCount > variantCount && controlCount >= evenCount) {
    return {
      label: `${controlLabel} leading`,
      detail: `${controlCount} of ${results.length} metric${results.length === 1 ? '' : 's'} favor the current version.`,
      status: 'control',
    }
  }

  if (pendingCount > 0) {
    return {
      label: 'Partial readout',
      detail: `${results.length - pendingCount} compared, ${pendingCount} still need control-vs-variant data.`,
      status: 'needsComparison',
    }
  }

  return {
    label: 'Mixed result',
    detail: evenCount === results.length ? 'The compared metrics are even.' : 'No version has a clear lead across the tracked metrics.',
    status: 'even',
  }
}

export function getAbTestingComparisonScoreboard(experiment: MarketingExperiment, results: AbTestingComparisonResult[]): AbTestingComparisonScoreboard {
  return {
    controlLabel: getAbTestingControlVariantLabel(experiment),
    variantLabel: getAbTestingTreatmentVariantLabel(experiment),
    controlWins: results.filter((result) => result.status === 'control').length,
    variantWins: results.filter((result) => result.status === 'variant').length,
    evenCount: results.filter((result) => result.status === 'even').length,
    pendingCount: results.filter((result) => result.status === 'needsComparison').length,
    total: results.length,
  }
}

function getAbTestingLeaderFootnote(scoreboard: AbTestingComparisonScoreboard) {
  if (scoreboard.total === 0) return 'Add tracked metrics before the suite can compare page performance.'
  if (scoreboard.pendingCount > 0) {
    return `${scoreboard.pendingCount} metric${scoreboard.pendingCount === 1 ? '' : 's'} still need a comparison value before the winner is clear.`
  }
  if (scoreboard.evenCount === scoreboard.total) return 'All compared metrics are even.'
  if (scoreboard.evenCount > 0) return `${scoreboard.evenCount} metric${scoreboard.evenCount === 1 ? ' is' : 's are'} even; use the remaining wins before deciding.`
  return 'All tracked metrics have a comparison value.'
}

function getAbTestingComparableMetrics(experiment: MarketingExperiment): ExperimentTrackedMetric[] {
  // Only comparative metrics decide the winner. Conceptual (single-variant)
  // metrics are captured in the readout but excluded here.
  const trackedMetrics = (experiment.trackedMetrics || []).filter(
    (metric) => (metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim()) && metric.comparison !== 'conceptual',
  )
  if (trackedMetrics.length > 0) return trackedMetrics
  // Only synthesize a primary metric from the name when there are NO explicit
  // tracked metrics at all. If the test has only conceptual metrics, return none
  // so a phantom "needs comparison" row never inflates the winner scoreboard.
  const hasAnyExplicitMetric = (experiment.trackedMetrics || []).some(
    (metric) => metric.key?.trim() || metric.label?.trim() || metric.eventName?.trim(),
  )
  if (!hasAnyExplicitMetric && experiment.primaryMetric?.trim()) {
    return [{
      _key: 'primary',
      key: slugify(experiment.primaryMetric),
      label: experiment.primaryMetric,
      role: 'primary',
    }]
  }
  return []
}

function findAbTestingTrackerForMetric(experiment: MarketingExperiment, trackedMetric: ExperimentTrackedMetric) {
  const metricKeys = getAbTestingMetricCandidateKeys(trackedMetric)
  return (experiment.successTrackers || []).find((tracker) => {
    const trackerKeys = (tracker.metricKeys || []).map(normalizeAbTestingMetricKey).filter(Boolean)
    if (trackerKeys.length === 0) return false
    return trackerKeys.some((trackerKey) => metricKeys.has(trackerKey))
  }) || null
}

function getAbTestingMetricComparisonCondition(trackedMetric: ExperimentTrackedMetric, tracker: ExperimentSuccessTracker | null) {
  const trackerCondition = normalizeAbTestingCondition(tracker?.condition)
  if (trackerCondition) return trackerCondition
  const role = normalizeAbTestingCondition(trackedMetric.role)
  if (role.includes('guardrail')) return 'not-decrease'
  return 'increase'
}

function getAbTestingMetricRoleLabel(trackedMetric: ExperimentTrackedMetric, tracker: ExperimentSuccessTracker | null) {
  const role = trackedMetric.role?.trim()
  if (role) return labelFor([
    { title: 'Primary', value: 'primary' },
    { title: 'Guardrail', value: 'guardrail' },
    { title: 'Diagnostic', value: 'diagnostic' },
  ], role) || role
  return tracker?.title || undefined
}

function getAbTestingControlVariantLabel(experiment: MarketingExperiment) {
  const control = (experiment.variants || []).find((variant) => variant.key === 'control')
  return control?.label?.trim() || 'Control'
}

function getAbTestingTreatmentVariantLabel(experiment: MarketingExperiment) {
  const treatment = (experiment.variants || []).find((variant) => variant.key && variant.key !== 'control')
  return treatment?.label?.trim() || 'Variant'
}

export function getAbTestingVariantPairLabel(experiment: MarketingExperiment) {
  const labels = getAbTestingVariantOptions(experiment).map((variant) => variant.label)
  if (labels.length >= 2) return labels.slice(0, 3).join(' vs ')
  return `${getAbTestingControlVariantLabel(experiment)} vs ${getAbTestingTreatmentVariantLabel(experiment)}`
}

export function getAbTestingVariantOptions(experiment: MarketingExperiment): AbTestingVariantOption[] {
  const variants = (experiment.variants || [])
    .map((variant, index) => {
      const label = variant.label?.trim() || variant.key?.trim() || `Variant ${index + 1}`
      const key = variant.key?.trim() || normalizeAbTestingMetricKey(label) || `variant-${index + 1}`
      return { key, label }
    })
    .filter((variant) => variant.key || variant.label)

  if (variants.length > 0) return variants
  return [
    { key: 'control', label: 'Control' },
    { key: 'variant', label: 'Variant' },
  ]
}

function getAbTestingSignalMetricRecords(experiment: MarketingExperiment): AbTestingSignalMetricRecord[] {
  return uniqueById((experiment.performanceSignals || []).filter(Boolean)).flatMap((signal) =>
    (signal.metrics || []).map((metric) => ({ signal, metric })),
  )
}

function findAbTestingMetricForVariant(
  records: AbTestingSignalMetricRecord[],
  variant: AbTestingVariantOption,
  trackedMetric: ExperimentTrackedMetric,
  exposureMetric: boolean,
) {
  let best: { score: number; record: AbTestingSignalMetricRecord } | null = null
  for (const record of records) {
    const variantScore = getAbTestingMetricVariantScore(record.metric, variant)
    if (variantScore <= 0) continue
    const metricScore = getAbTestingMetricMatchScore(record.metric, trackedMetric, exposureMetric)
    if (metricScore <= 0) continue
    const score = variantScore + metricScore
    if (!best || score > best.score) best = { score, record }
  }
  return best?.record || null
}

function getAbTestingMetricVariantScore(metric: PerformanceSignalMetric, variant: AbTestingVariantOption) {
  const variantKey = normalizeAbTestingMetricKey(variant.key)
  const variantLabel = normalizeAbTestingMetricKey(variant.label)
  const explicitVariant = normalizeAbTestingMetricKey(metric.variantKey)

  if (explicitVariant) {
    return explicitVariant === variantKey || explicitVariant === variantLabel ? 100 : 0
  }

  const metricText = normalizeAbTestingMetricKey([metric.label, metric.eventName, metric.unit].filter(Boolean).join(' '))
  if (!metricText) return 0
  if (variantKey && metricText.includes(variantKey)) return 35
  if (variantLabel && metricText.includes(variantLabel)) return 30
  if (variantKey === 'control' && (metricText.includes('current') || metricText.includes('baseline'))) return 25
  return 0
}

function getAbTestingMetricMatchScore(metric: PerformanceSignalMetric, trackedMetric: ExperimentTrackedMetric, exposureMetric: boolean) {
  const labelKey = normalizeAbTestingMetricKey(metric.label)
  const eventKey = normalizeAbTestingMetricKey(metric.eventName)

  if (exposureMetric) {
    const exposureKeys = ['experiment-exposure', 'page-view', 'page-views', 'visit', 'visits', 'visitor', 'visitors', 'session', 'sessions']
    if (exposureKeys.includes(eventKey) || exposureKeys.includes(labelKey)) return 90
    if (exposureKeys.some((key) => labelKey.includes(key) || eventKey.includes(key))) return 45
    return 0
  }

  const trackedKeys = getAbTestingMetricCandidateKeys(trackedMetric)
  const metricKeys = [labelKey, eventKey].filter(Boolean)
  if (metricKeys.some((metricKey) => trackedKeys.has(metricKey))) return 90
  if (metricKeys.some((metricKey) => Array.from(trackedKeys).some((trackedKey) =>
    trackedKey.length > 5 && (metricKey.includes(trackedKey) || trackedKey.includes(metricKey)),
  ))) return 45
  return 0
}

function numericPerformanceMetricValue(metric?: PerformanceSignalMetric) {
  if (!metric || typeof metric.value !== 'number' || !Number.isFinite(metric.value)) return null
  return metric.value
}

export type AbTestingVariantEngagement = {
  sessions: number | null
  bounceRate: number | null
  averageSessionDuration: number | null
}

/**
 * Reads per-variant session engagement (visits, bounce rate, avg time on page)
 * off the experiment's linked signals. Optional + backward-compatible: signals
 * without a variantEngagement field simply yield empty cells (rendered as '—').
 * Matches a variant by its key (case-insensitive) so it lines up with the same
 * variant columns the event table renders.
 */
export function getAbTestingVariantEngagement(
  experiment: MarketingExperiment,
  variant: AbTestingVariantOption,
): AbTestingVariantEngagement {
  const target = normalizeAbTestingMetricKey(variant.key)
  const targetLabel = normalizeAbTestingMetricKey(variant.label)
  for (const signal of uniqueById((experiment.performanceSignals || []).filter(Boolean))) {
    for (const entry of signal.variantEngagement || []) {
      const entryKey = normalizeAbTestingMetricKey(entry.variantKey)
      if (!entryKey || (entryKey !== target && entryKey !== targetLabel)) continue
      return {
        sessions: typeof entry.sessions === 'number' && Number.isFinite(entry.sessions) ? entry.sessions : null,
        bounceRate: typeof entry.bounceRate === 'number' && Number.isFinite(entry.bounceRate) ? entry.bounceRate : null,
        averageSessionDuration:
          typeof entry.averageSessionDuration === 'number' && Number.isFinite(entry.averageSessionDuration)
            ? entry.averageSessionDuration
            : null,
      }
    }
  }
  return { sessions: null, bounceRate: null, averageSessionDuration: null }
}

/** Formats a 0–1 fraction or 0–100 percent bounce rate as a whole-ish percent. */
export function formatAbTestingBounceRate(value: number | null): string {
  if (value === null) return '—'
  const percent = value <= 1 ? value * 100 : value
  const rounded = Math.round(percent * 10) / 10
  return `${rounded}%`
}

/** Formats average session duration (seconds) as m:ss. */
export function formatAbTestingAvgTime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '—'
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function isAbTestingExposureMetric(metric: ExperimentTrackedMetric) {
  const keys = getAbTestingMetricCandidateKeys(metric)
  return Array.from(keys).some((key) => ['experiment-exposure', 'page-view', 'page-views', 'visit', 'visits', 'visitor', 'visitors', 'session', 'sessions'].includes(key))
}

export function formatAbTestingEventCount(value: number | null, unit?: string) {
  if (value === null) return 'No data'
  return `${formatOptionalNumber(value)}${unit ? ` ${unit}` : ''}`
}

export function formatAbTestingEventRate(cell: AbTestingVariantEventCell) {
  if (cell.value === null) return 'Event count missing'
  if (cell.denominator === null) return 'Visit count missing'
  if (cell.denominator <= 0) return '0 visits'
  const rate = cell.rate || 0
  // A rate above 100% means more events than exposures (a sample/instrumentation
  // artifact). Show the honest ratio instead of a misleading "500% of visits".
  if (rate > 100) return `${formatOptionalNumber(cell.value)} events / ${formatOptionalNumber(cell.denominator)} visits`
  return `${formatAbTestingPercent(rate)} of visits`
}

function formatAbTestingPercent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  if (Math.abs(value) >= 10) return `${value.toFixed(0)}%`
  if (Math.abs(value) >= 1) return `${value.toFixed(1)}%`
  return `${value.toFixed(2)}%`
}

function formatAbTestingComparisonChange(rawChange: string | undefined, changeValue: number) {
  const trimmed = rawChange?.trim()
  if (trimmed && /%/.test(trimmed)) return trimmed
  const sign = changeValue > 0 ? '+' : ''
  return `${sign}${changeValue}%`
}

export function getAbTestingComparisonTone(status: AbTestingComparisonStatus) {
  if (status === 'variant') {
    return {
      fg: '#7dd69e',
      bg: 'rgba(54, 139, 87, 0.18)',
      border: 'rgba(125, 214, 158, 0.35)',
      bar: 'linear-gradient(90deg, #007385, #7dd69e)',
    }
  }
  if (status === 'control') {
    return {
      fg: '#d6a93f',
      bg: 'rgba(124, 101, 39, 0.16)',
      border: 'rgba(214, 169, 63, 0.35)',
      bar: 'linear-gradient(90deg, #d6a93f, #d86f4d)',
    }
  }
  if (status === 'even') {
    return {
      fg: '#b8d9df',
      bg: 'rgba(77, 196, 214, 0.1)',
      border: 'rgba(77, 196, 214, 0.28)',
      bar: 'linear-gradient(90deg, #607985, #4dc4d6)',
    }
  }
  return {
    fg: 'var(--card-muted-fg-color)',
    bg: 'rgba(255,255,255,0.04)',
    border: 'var(--card-border-color)',
    bar: 'rgba(255,255,255,0.18)',
  }
}

function getAbTestingInsightForExperiment(insights: AbTestingInsight[], experiment: MarketingExperiment) {
  const title = marketingExperimentTitle(experiment)
  return (
    insights.find((insight) => insight.experimentId === experiment._id && insight.severity !== 'healthy') ||
    insights.find((insight) => insight.affected.includes(title) && insight.severity !== 'healthy') ||
    insights.find((insight) => insight.experimentId === experiment._id) ||
    insights.find((insight) => insight.affected.includes(title)) ||
    null
  )
}

export function getAbTestingLaunchChecklistItems(experiment: MarketingExperiment, linkedSignalCount = experimentSignalIds(experiment).length) {
  const items = [
    { label: 'Public page chosen', done: Boolean(experiment.targetPath?.trim()) },
    { label: 'Traffic split key set', done: Boolean(experiment.flagKey?.trim()) },
    { label: 'Control version included', done: experimentHasControlVariant(experiment) },
    { label: 'Primary success metric named', done: Boolean(experiment.primaryMetric?.trim()) },
    { label: 'Tracked metrics listed', done: experimentHasTrackedMetric(experiment) },
    { label: 'Success rule set', done: experimentHasSuccessTracker(experiment) },
    { label: 'Results source linked', done: Boolean(experiment.analyticsSource?._id) },
    { label: 'Decision evidence linked', done: linkedSignalCount > 0 },
  ]

  if (experiment.status === 'running' || experiment.status === 'reviewing') {
    items.push({ label: 'Variant visits and event counts captured', done: isAbTestingMeasurementReady(experiment) })
  }

  return items
}

export function getAbTestingDisplayStatus(experiment: MarketingExperiment) {
  if (experiment.status === 'archived') return 'archived'
  if (experiment.decision) return 'decided'
  if (isAbTestingMeasurementBlocked(experiment)) return 'blocked'
  if (experiment.status === 'running' || experiment.status === 'reviewing' || experiment.status === 'decided') return experiment.status
  if (experimentSignalIds(experiment).length > 0 || experiment.result?.trim()) return 'reviewing'
  return experiment.status || 'idea'
}

export function getAbTestingDisplayStatusLabel(experiment: MarketingExperiment) {
  const displayStatus = getAbTestingDisplayStatus(experiment)
  if (displayStatus === 'blocked') return 'Measurement blocked'
  return labelFor(experimentStatusOptions, displayStatus) || 'Idea'
}

export function getAbTestingDashboardStatusDetail(experiment: MarketingExperiment) {
  const displayStatus = getAbTestingDisplayStatus(experiment)
  if (displayStatus === 'archived') return 'Archived for reference.'
  if (experiment.decision) return `Decision recorded: ${labelFor(experimentDecisionOptions, experiment.decision)}.`
  if (displayStatus === 'blocked') return 'Traffic may be split, but visits and event counts are not ready.'
  if (displayStatus === 'reviewing') return 'Evidence is ready for a final readout.'
  if (displayStatus === 'running') return experimentSignalIds(experiment).length > 0
    ? 'Traffic is split and result evidence is linked.'
    : 'Traffic is split; link result evidence next.'

  const missingItems = getAbTestingLaunchChecklistItems(experiment)
    .filter((item) => !item.done)
    .map((item) => item.label.toLowerCase())
  if (missingItems.length > 0) return `Needs ${missingItems.slice(0, 2).join(', ')}${missingItems.length > 2 ? ', and more' : ''}.`
  return 'Setup is ready for launch or monitoring.'
}

function normalizeAbTestingMetricKey(value?: string) {
  if (!value?.trim() || !/[a-z0-9]/i.test(value)) return ''
  return slugify(value)
}

function normalizeAbTestingCondition(value?: string) {
  return (value || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseAbTestingMetricChange(value?: string) {
  const match = value?.match(/[-+]?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function isAbTestingIncreaseCondition(condition: string) {
  return ['increase', 'lift', 'improve', 'higher', 'greater-than', 'above'].some((token) => condition.includes(token))
}

function isAbTestingDecreaseCondition(condition: string) {
  return ['decrease', 'lower', 'less-than', 'below'].some((token) => condition.includes(token)) && !isAbTestingNotDecreaseCondition(condition)
}

function isAbTestingNotDecreaseCondition(condition: string) {
  return condition.includes('not-decrease') || condition.includes('no-drop') || condition.includes('hold-steady')
}

function isAbTestingNotIncreaseCondition(condition: string) {
  return condition.includes('not-increase')
}

function isAbTestingAtLeastCondition(condition: string) {
  return condition.includes('at-least') || condition.includes('minimum')
}

function isAbTestingAtMostCondition(condition: string) {
  return condition.includes('at-most') || condition.includes('maximum')
}

export function getAbTestingDesignerNextStep(experiment: MarketingExperiment | null): {
  title: string
  detail: string
  actionLabel: string
  reason: string
  targetId: string
  primary: boolean
} {
  if (!experiment) {
    return {
      title: 'Create the homepage test record',
      detail: 'Start with the homepage template. It fills the path, Vercel flag key, control and concept versions, and starter metrics.',
      actionLabel: 'Create homepage test',
      reason: 'No test is selected yet.',
      targetId: 'ab-test-create',
      primary: true,
    }
  }

  const missingLaunchFields = [
    !experiment.hypothesis?.trim() ? 'design bet' : '',
    !experiment.targetPath?.trim() ? 'public page' : '',
    !experiment.flagKey?.trim() ? 'traffic split key' : '',
    !experimentHasControlVariant(experiment) ? 'control version' : '',
    !experiment.primaryMetric?.trim() ? 'primary success metric' : '',
    !experimentHasTrackedMetric(experiment) ? 'tracked metrics' : '',
    !experimentHasSuccessTracker(experiment) ? 'success rule' : '',
    !experiment.analyticsSource?._id ? 'results source' : '',
  ].filter(Boolean)

  if (missingLaunchFields.length > 0) {
    return {
      title: 'Finish setup before launch',
      detail: `Fill these fields for "${marketingExperimentTitle(experiment)}": ${missingLaunchFields.slice(0, 4).join(', ')}${missingLaunchFields.length > 4 ? ', and more' : ''}.`,
      actionLabel: 'Configure test',
      reason: 'Traffic should not split until the test can be measured.',
      targetId: 'ab-test-configuration',
      primary: true,
    }
  }

  if (isAbTestingMeasurementBlocked(experiment)) {
    const gaps = getAbTestingMeasurementGaps(experiment)
    const missingPieces = [
      gaps.missingVariantBreakout ? 'two page versions' : '',
      gaps.missingExposure ? 'visits or exposures for each version' : '',
      gaps.missingEvents ? 'event counts for each tracked metric' : '',
      gaps.missingRates ? 'visit counts for event rates' : '',
    ].filter(Boolean)

    return {
      title: 'Fix measurement before calling this running',
      detail: `Add ${missingPieces.slice(0, 3).join(', ')}${missingPieces.length > 3 ? ', and more' : ''} for "${marketingExperimentTitle(experiment)}".`,
      actionLabel: 'Fix result evidence',
      reason: 'The traffic split may exist, but the suite cannot report a winner without variant-level visits and events.',
      targetId: 'ab-test-results-evidence',
      primary: true,
    }
  }

  if (experiment.status === 'running' && experimentSignalIds(experiment).length === 0) {
    return {
      title: 'Link result evidence now',
      detail: 'Attach the GA4, Vercel, or manual result signal while the test is running.',
      actionLabel: 'Link result evidence',
      reason: 'Traffic is split, but the readout has no linked evidence.',
      targetId: 'analytics',
      primary: true,
    }
  }

  if (experiment.status === 'reviewing' || experimentSignalIds(experiment).length > 0) {
    if (!experiment.result?.trim() || !experiment.decision?.trim()) {
      return {
        title: 'Write the result and decision',
        detail: 'Summarize what happened, choose keep, iterate, stop, or inconclusive, and add the decision date.',
        actionLabel: 'Open result review',
        reason: 'Evidence exists; now capture the decision.',
        targetId: 'ab-test-decision-review',
        primary: true,
      }
    }
  }

  if (experiment.decision) {
    return {
      title: 'Decision is recorded',
      detail: 'The test has a decision. Keep the evidence attached so future page updates can reuse the context.',
      actionLabel: 'Open saved decision',
      reason: 'The decision trail is ready.',
      targetId: 'ab-test-decision-review',
      primary: false,
    }
  }

  return {
    title: 'Ready to launch or monitor',
    detail: 'Setup is complete. Confirm QA, start or monitor the Vercel traffic split, and link result evidence here.',
    actionLabel: 'Open launch checklist',
    reason: 'Core launch fields are filled.',
    targetId: 'ab-test-launch-checklist',
    primary: false,
  }
}

export function getAbTestingInsightActionTarget(insight: AbTestingInsight): { label: string; tab: AbTestingEditorTab; sectionId: string } {
  const text = `${insight.id || ''} ${insight.title} ${insight.action}`
  if (/missing-flag-setup|setup-before/i.test(text)) {
    return {
      label: 'Open setup fields',
      tab: 'setup',
      sectionId: 'ab-test-configuration',
    }
  }

  if (/data-|signals|analytics-source|decision|result|evidence|comparison|signal/i.test(text)) {
    return {
      label: 'Fix result evidence',
      tab: 'results',
      sectionId: 'ab-test-results-evidence',
    }
  }

  if (/launch|overlapping|traffic/i.test(text)) {
    return {
      label: 'Open launch checks',
      tab: 'launch',
      sectionId: 'ab-test-launch-checklist',
    }
  }

  return {
    label: 'Open setup fields',
    tab: 'setup',
    sectionId: 'ab-test-configuration',
  }
}

function isPageExperiment(experiment: MarketingExperiment) {
  return Boolean(experiment.targetPath?.trim() || ['homepage', 'vision', 'page'].includes(experiment.targetType || ''))
}

export function experimentHasControlVariant(experiment: MarketingExperiment) {
  return (experiment.variants || []).some((variant) => variant.key === 'control')
}

export function experimentHasTrackedMetric(experiment: MarketingExperiment) {
  return (experiment.trackedMetrics || []).some((metric) => Boolean(metric.key?.trim() && metric.label?.trim()))
}

export function experimentHasSuccessTracker(experiment: MarketingExperiment) {
  return (experiment.successTrackers || []).some((tracker) =>
    Boolean(tracker.title?.trim() && (tracker.successWhen?.trim() || tracker.condition?.trim() || (tracker.metricKeys || []).length > 0)),
  )
}

export function experimentSignalIds(experiment: MarketingExperiment) {
  return (experiment.performanceSignals || []).filter(Boolean).map((signal) => signal._id).filter(Boolean)
}

export function marketingExperimentTitle(experiment: MarketingExperiment) {
  return experiment.title || experiment.flagKey || experiment.targetPath || 'Untitled experiment'
}

export function experimentListMeta(experiment: MarketingExperiment) {
  const targetType = labelFor(experimentTargetTypeOptions, experiment.targetType)
  const path = normalizeMarketingExperimentPath(experiment.targetPath)
  if (experiment.targetType === 'homepage' || path === '/') return 'Homepage test'
  if (path) return `${targetType || 'Page test'}: ${path}`
  return targetType ? `${targetType} test` : 'Page test'
}

export function normalizeMarketingExperimentPath(path?: string) {
  const trimmed = (path || '').split('?')[0]?.trim()
  if (!trimmed) return ''
  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return prefixed.replace(/\/+$/, '') || '/'
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
      interpretation: 'Every source is still planned or needs review, so dashboards and campaign summaries should be treated as setup placeholders.',
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

export function getAnalyticsReadinessStats(data: MarketingData) {
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
    const hasResearchItems = data.researchResults.length > 0
    gaps.push({
      id: 'dashboard-strategy-foundation-gap',
      title: 'Some setup questions are unanswered',
      why: `The assistant still needs reusable answers for ${missingStrategy.join(', ')}, so designers may have to guess while making content.`,
      action: hasResearchItems
        ? 'Open Strategy and answer the missing questions from trusted research.'
        : 'Open Research first, gather useful evidence, then answer the missing Strategy questions from that evidence.',
      view: hasResearchItems ? 'strategy' : 'research',
      severity: 'setup',
      affected: missingStrategy,
    })
  }

  if (stats.upcomingItems.length === 0) {
    gaps.push({
      id: 'dashboard-no-upcoming-content',
      title: 'No upcoming content is planned',
      why: 'Designers cannot tell what should be made next, and the public channels will look quiet even if there is active project work happening.',
      action: 'Add a few draft posts, emails, or pages to the calendar so there is a visible runway.',
      view: 'calendar',
      severity: 'urgent',
    })
  } else if (stats.contentRunwayDays < 14) {
    gaps.push({
      id: 'dashboard-short-runway',
      title: 'There are fewer than two weeks of content ahead',
      why: 'A short runway turns content into a last-minute production task instead of a steady design workflow.',
      action: 'Plan at least two weeks of calendar items, even if the early drafts are only titles and channels.',
      view: 'calendar',
      severity: 'warning',
    })
  }

  if (stats.upcoming30Items.length > 0 && stats.coveredDaysNext30 < 4) {
    gaps.push({
      id: 'dashboard-thin-cadence',
      title: 'The next 30 days look too quiet',
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
      title: 'Upcoming content does not show what comes after awareness',
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
  const abTestingGaps = buildAbTestingInsights(data)
    .filter((insight) => insight.severity !== 'healthy')
    .map(
      (insight): MarketingDashboardGap => ({
        id: `abtest-${insight.id}`,
        title: insight.title,
        why: insight.interpretation,
        action: insight.action,
        view: 'abTesting',
        severity: insight.severity,
        affected: insight.affected,
      }),
    )

  return uniqueDashboardGaps([...gaps, ...attentionGaps, ...analyticsGaps, ...abTestingGaps]).sort(
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

export function getDashboardGapTone(severity: MarketingDashboardGap['severity']) {
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

export function buildMarketingAssistantActions(
  data: MarketingData,
  latestSetupSession?: MarketingAssistantSessionSummary | null,
): MarketingAssistantAction[] {
  const dashboardStats = getMarketingDashboardStats(data)
  const dashboardGaps = getMarketingDashboardGaps(data)
  const missingStrategy = getMissingFoundationalStrategyInputs(data)
  const analyticsStats = getAnalyticsReadinessStats(data)
  const abTestingStats = getAbTestingStats(data)
  const abTestingInsights = buildAbTestingInsights(data).filter((insight) => insight.severity !== 'healthy')
  const gapViews = new Set(dashboardGaps.map((gap) => gap.view))
  const activeChannels = data.channels.filter((channel) => channel.status !== 'archived')
  const activeLinks = data.linkItems.filter(isMarketingLinkActive)
  const currentSetupStep = getCurrentAutopilotStep(latestSetupSession?.autopilotPlan)
  const actions: MarketingAssistantAction[] = []
  const addAction = (action: MarketingAssistantAction) => {
    actions.push(action)
  }

  if (latestSetupSession?.autopilotPlan) {
    addAction({
      id: 'continue-current-setup',
      title: 'Continue current setup',
      description: latestSetupSession.title || 'Pick up the guided checklist where you left off.',
      reason: currentSetupStep ? `Next decision: ${currentSetupStep.title}` : 'A checklist is already in progress.',
      tags: ['continue', 'resume', 'autopilot', 'checklist', 'session'],
      recommended: true,
      score: 110,
    })
  }

  addAction({
    id: 'ask-strategist',
    title: 'Ask strategist',
    description: 'Talk through choices before changing saved marketing content.',
    reason:
      missingStrategy.length > 0
        ? `Reusable strategy still needs ${missingStrategy.join(', ')}.`
        : dashboardGaps.length > 0
          ? 'There are multiple possible fixes, so a strategist pass can choose the right one.'
          : 'Use this when the next move needs judgment before setup.',
    tags: ['strategy', 'strategist', 'chat', 'decision', 'recommendation', 'assistant'],
    recommended: missingStrategy.length > 0 || dashboardGaps.length > 0 || !latestSetupSession,
    score: missingStrategy.length > 0 ? 96 : dashboardGaps.length > 0 ? 88 : 64,
    mode: 'strategist',
  })

  addAction({
    id: 'suggest-next-step',
    title: 'Get a guided checklist',
    description: 'Let Autopilot inspect the suite and suggest one reviewable step at a time.',
    reason:
      dashboardGaps.length > 0
        ? `Autopilot can start from ${dashboardGaps.length} thing${dashboardGaps.length === 1 ? '' : 's'} that need a decision.`
        : 'Use this when you want a guided path instead of jumping directly to one section.',
    tags: ['next', 'autopilot', 'checklist', 'plan', 'recommendation', 'workflow'],
    recommended: true,
    score: latestSetupSession ? 78 : 92,
    mode: 'plan',
  })

  addAction({
    id: 'set-up-ab-test',
    title: 'Set up an A/B test',
    description: 'Create a page test, confirm launch readiness, and record the result.',
    reason:
      abTestingInsights[0]?.title ||
      (abTestingStats.pageTests === 0
        ? 'Create the first homepage test before splitting traffic.'
        : `${abTestingStats.ready}/${Math.max(1, abTestingStats.pageTests)} page tests are ready for launch.`),
    tags: ['ab', 'a/b', 'test', 'experiment', 'flags', 'vercel', 'homepage', 'vision', 'metrics'],
    recommended: abTestingStats.pageTests === 0 || abTestingInsights.length > 0 || gapViews.has('abTesting'),
    score: abTestingStats.pageTests === 0 ? 94 : abTestingInsights.length > 0 ? 86 : 66,
    view: 'abTesting',
  })

  addAction({
    id: 'find-evidence',
    title: 'Find evidence',
    description: 'Create or review research before content, strategy, or experiments depend on it.',
    reason:
      data.researchProjects.length === 0
        ? 'No research projects exist yet.'
        : data.researchResults.length === 0
          ? 'Research exists, but there are no findings ready to use.'
          : 'Open Research when a claim, topic, or campaign needs stronger support.',
    tags: ['research', 'evidence', 'sources', 'seo', 'keywords', 'inspiration', 'findings'],
    recommended: data.researchProjects.length === 0 || data.researchResults.length === 0 || gapViews.has('research'),
    score: data.researchProjects.length === 0 ? 90 : data.researchResults.length === 0 ? 84 : 62,
    view: 'research',
  })

  addAction({
    id: 'fill-strategy',
    title: 'Fill strategy inputs',
    description: 'Answer reusable audience, message, proof, next-step, measurement, and quality questions.',
    reason:
      missingStrategy.length > 0
        ? `Missing: ${missingStrategy.join(', ')}.`
        : 'Strategy has the basics; open it when the positioning needs refinement.',
    tags: ['strategy', 'audience', 'message', 'proof', 'cta', 'tracking', 'quality'],
    recommended: missingStrategy.length > 0 || gapViews.has('strategy'),
    score: missingStrategy.length > 0 ? 88 : 58,
    view: 'strategy',
  })

  addAction({
    id: 'plan-calendar',
    title: 'Plan the calendar',
    description: 'Create draft posts, emails, pages, or social updates across the next runway.',
    reason:
      dashboardStats.upcomingItems.length === 0
        ? 'No upcoming content is planned.'
        : dashboardStats.contentRunwayDays < 14
          ? `The content runway is only ${dashboardStats.contentRunwayDays} day${dashboardStats.contentRunwayDays === 1 ? '' : 's'}.`
          : 'Open Calendar when a campaign needs publish dates and owners.',
    tags: ['calendar', 'content', 'schedule', 'runway', 'publishing', 'posts'],
    recommended: dashboardStats.upcomingItems.length === 0 || dashboardStats.contentRunwayDays < 14 || gapViews.has('calendar'),
    score: dashboardStats.upcomingItems.length === 0 ? 87 : dashboardStats.contentRunwayDays < 14 ? 80 : 56,
    view: 'calendar',
  })

  addAction({
    id: 'set-up-analytics',
    title: 'Set up analytics',
    description: 'Choose where success signals come from and who reviews them.',
    reason:
      analyticsStats.connectedSources === 0
        ? 'No connected analytics source is available yet.'
        : analyticsStats.readinessScore < 100
          ? `Measurement readiness is ${analyticsStats.readinessScore}%.`
          : 'Measurement is connected; open Analytics when source ownership or cadence changes.',
    tags: ['analytics', 'measurement', 'ga4', 'vercel', 'dashboard', 'conversion', 'readout'],
    recommended: analyticsStats.readinessScore < 100 || gapViews.has('analytics'),
    score: analyticsStats.connectedSources === 0 ? 86 : analyticsStats.readinessScore < 100 ? 78 : 55,
    view: 'analytics',
  })

  addAction({
    id: 'create-quick-link',
    title: 'Create a Quick Link',
    description: 'Prepare public /links destinations for Instagram, social posts, and next-step buttons.',
    reason:
      activeLinks.length === 0
        ? 'No active Quick Links exist yet.'
        : 'Open Quick Links when a post needs a public destination or context.',
    tags: ['quick links', 'linktree', 'links', 'instagram', 'destination', 'cta'],
    recommended: activeLinks.length === 0 || gapViews.has('linkTree'),
    score: activeLinks.length === 0 ? 82 : 54,
    view: 'linkTree',
  })

  addAction({
    id: 'manage-channels',
    title: 'Manage channels',
    description: 'Set defaults for Instagram, LinkedIn, email, website, and other publishing surfaces.',
    reason:
      activeChannels.length === 0
        ? 'No active channels are configured.'
        : 'Open Channels when coverage, formats, or analytics defaults need cleanup.',
    tags: ['channels', 'instagram', 'linkedin', 'email', 'website', 'formats'],
    recommended: activeChannels.length === 0 || gapViews.has('channels'),
    score: activeChannels.length === 0 ? 80 : 52,
    view: 'channels',
  })

  addAction({
    id: 'review-attention',
    title: 'Review needs attention',
    description: 'Scan the highest-risk setup, content, measurement, and experiment gaps.',
    reason:
      dashboardGaps.length > 0
        ? `${dashboardGaps.length} marketing gap${dashboardGaps.length === 1 ? '' : 's'} need review.`
        : 'Use this as a quick health check when the suite looks quiet.',
    tags: ['attention', 'gaps', 'review', 'health', 'dashboard'],
    recommended: dashboardGaps.length > 0,
    score: dashboardGaps.length > 0 ? 83 : 50,
    view: 'attention',
  })

  addAction({
    id: 'shape-campaign',
    title: 'Shape a campaign',
    description: 'Name the initiative, audience, timing, channels, and success signals.',
    reason:
      dashboardStats.activeCampaigns === 0
        ? 'No active campaigns are planned.'
        : 'Open Campaigns when the work needs a named initiative instead of one-off content.',
    tags: ['campaign', 'campaigns', 'objective', 'audience', 'timing', 'kpi'],
    recommended: dashboardStats.activeCampaigns === 0 || gapViews.has('campaigns'),
    score: dashboardStats.activeCampaigns === 0 ? 76 : 51,
    view: 'campaigns',
  })

  addAction({
    id: 'map-funnel',
    title: 'Map a funnel',
    description: 'Sketch what someone sees next after a post, article, or page.',
    reason:
      data.funnels.length === 0
        ? 'No reusable funnels exist yet.'
        : 'Open Funnels when content needs a next step beyond awareness.',
    tags: ['funnel', 'funnels', 'awareness', 'consideration', 'conversion', 'journey'],
    recommended: data.funnels.length === 0 || gapViews.has('funnels'),
    score: data.funnels.length === 0 ? 74 : 49,
    view: 'funnels',
  })

  addAction({
    id: 'manage-templates',
    title: 'Manage templates',
    description: 'Reuse starting patterns for campaigns, funnels, and repeated content work.',
    reason:
      data.templates.length === 0
        ? 'Templates can speed up repeated campaign and funnel setup.'
        : 'Open Templates when the suite needs a reusable pattern.',
    tags: ['templates', 'reusable', 'campaign', 'funnel', 'patterns'],
    recommended: data.templates.length === 0,
    score: data.templates.length === 0 ? 68 : 45,
    view: 'templates',
  })

  return actions.sort((first, second) => {
    if (first.recommended !== second.recommended) return first.recommended ? -1 : 1
    if (first.score !== second.score) return second.score - first.score
    return first.title.localeCompare(second.title)
  })
}

export function filterMarketingAssistantActions(actions: MarketingAssistantAction[], query: string) {
  return searchMarketingAssistantActions(actions, query).map((result) => result.action)
}

export function searchMarketingAssistantActions(actions: MarketingAssistantAction[], query: string) {
  const queryEmbedding = buildMarketingAssistantSearchEmbedding(query, [{ text: query, weight: 1.4 }])
  const queryTerms = baseMarketingAssistantSearchTokens(query)
  if (queryTerms.length === 0) {
    return actions.map((action) => ({ action, relevance: action.score }))
  }

  const normalizedQuery = normalizeMarketingAssistantSearch(query)
  return actions
    .map((action) => {
      const fields = marketingAssistantActionSearchFields(action)
      const actionEmbedding = buildMarketingAssistantSearchEmbedding(fields.map((field) => field.text).join(' '), fields)
      const actionTerms = Object.keys(actionEmbedding)
      const normalizedAction = normalizeMarketingAssistantSearch(fields.map((field) => field.text).join(' '))
      const semanticScore = cosineSimilarity(queryEmbedding, actionEmbedding)
      const directCoverage = queryTerms.filter((term) => actionEmbedding[term] > 0 || normalizedAction.includes(term)).length / queryTerms.length
      const fuzzyCoverage = fuzzyTokenCoverage(queryTerms, actionTerms)
      const phraseBoost = normalizedQuery.length > 2 && normalizedAction.includes(normalizedQuery) ? 0.3 : 0
      const relevance =
        semanticScore * 70 +
        directCoverage * 28 +
        fuzzyCoverage * 18 +
        phraseBoost * 25 +
        action.score * 0.04 +
        (action.recommended ? 2 : 0)

      return {
        action,
        relevance,
        semanticScore,
        directCoverage,
        fuzzyCoverage,
        phraseBoost,
      }
    })
    .filter((result) => result.semanticScore >= 0.08 || result.directCoverage > 0 || result.fuzzyCoverage >= 0.5 || result.phraseBoost > 0)
    .sort((first, second) => {
      if (Math.abs(first.relevance - second.relevance) > 0.001) return second.relevance - first.relevance
      if (first.action.recommended !== second.action.recommended) return first.action.recommended ? -1 : 1
      if (first.action.score !== second.action.score) return second.action.score - first.action.score
      return first.action.title.localeCompare(second.action.title)
    })
    .map(({ action, relevance }) => ({ action, relevance }))
}

function normalizeMarketingAssistantSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/\ba\s*[/-]\s*b\b/g, 'ab')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

type MarketingAssistantSearchEmbedding = Record<string, number>

const MARKETING_ASSISTANT_SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'into',
  'is',
  'it',
  'no',
  'of',
  'on',
  'or',
  'our',
  'the',
  'this',
  'to',
  'up',
  'use',
  'with',
])

const MARKETING_ASSISTANT_SEMANTIC_GROUPS: Record<string, string[]> = {
  analytics: ['analysis', 'attribution', 'conversion', 'dashboard', 'ga4', 'measurement', 'metrics', 'performance', 'readout', 'reporting', 'signal'],
  attention: ['audit', 'gap', 'gaps', 'health', 'issue', 'missing', 'problem', 'review', 'risk'],
  calendar: ['content', 'date', 'draft', 'post', 'publish', 'publishing', 'runway', 'schedule', 'scheduled', 'timeline'],
  campaign: ['campaigns', 'initiative', 'kpi', 'launch', 'objective', 'plan', 'promotion'],
  channel: ['channels', 'email', 'instagram', 'linkedin', 'platform', 'social', 'website'],
  continue: ['current', 'resume', 'session', 'setup', 'unfinished'],
  experiment: ['ab', 'a/b', 'experiment', 'experiments', 'flag', 'flags', 'homepage', 'rollout', 'split', 'test', 'testing', 'traffic', 'variant', 'variants', 'vercel', 'vision'],
  funnel: ['consideration', 'conversion', 'funnel', 'funnels', 'journey', 'stage', 'stages'],
  link: ['bio', 'destination', 'ig', 'instagram', 'link', 'links', 'linktree', 'quicklink', 'url'],
  research: ['claim', 'claims', 'evidence', 'finding', 'findings', 'keyword', 'proof', 'seo', 'source', 'sources', 'validate'],
  strategy: ['audience', 'cta', 'decision', 'message', 'positioning', 'proof', 'quality', 'strategist', 'tracking'],
  template: ['pattern', 'patterns', 'reusable', 'template', 'templates'],
}

const MARKETING_ASSISTANT_SEARCH_ALIASES = buildMarketingAssistantSearchAliases()

function marketingAssistantActionSearchFields(action: MarketingAssistantAction) {
  return [
    { text: action.title, weight: 4 },
    { text: action.description, weight: 2.1 },
    { text: action.reason, weight: 1.9 },
    { text: action.view ? getMarketingViewTitle(action.view) : '', weight: 3 },
    { text: action.mode || '', weight: 1.4 },
    { text: action.tags.join(' '), weight: 3.2 },
    { text: action.id.replace(/-/g, ' '), weight: 2.4 },
  ].filter((field) => field.text.trim())
}

function buildMarketingAssistantSearchEmbedding(
  fallbackText: string,
  fields: Array<{ text: string; weight: number }>,
): MarketingAssistantSearchEmbedding {
  const embedding: MarketingAssistantSearchEmbedding = {}
  const usableFields = fields.length > 0 ? fields : [{ text: fallbackText, weight: 1 }]
  usableFields.forEach((field) => {
    expandedMarketingAssistantSearchTokens(field.text).forEach(({ token, weight }) => {
      embedding[token] = (embedding[token] || 0) + weight * field.weight
    })
  })
  return normalizeEmbedding(embedding)
}

function buildMarketingAssistantSearchAliases() {
  const aliases: Record<string, Set<string>> = {}
  Object.entries(MARKETING_ASSISTANT_SEMANTIC_GROUPS).forEach(([canonical, values]) => {
    const groupTokens = Array.from(new Set([canonical, ...values].flatMap(baseMarketingAssistantSearchTokens)))
    groupTokens.forEach((token) => {
      aliases[token] = aliases[token] || new Set<string>()
      groupTokens.forEach((candidate) => {
        if (candidate !== token) aliases[token].add(candidate)
      })
    })
  })
  return aliases
}

function expandedMarketingAssistantSearchTokens(value: string) {
  const weightedTokens = new Map<string, number>()
  baseMarketingAssistantSearchTokens(value).forEach((token) => {
    weightedTokens.set(token, Math.max(weightedTokens.get(token) || 0, 1))
    MARKETING_ASSISTANT_SEARCH_ALIASES[token]?.forEach((alias) => {
      weightedTokens.set(alias, Math.max(weightedTokens.get(alias) || 0, 0.58))
    })
  })
  return Array.from(weightedTokens.entries()).map(([token, weight]) => ({ token, weight }))
}

function baseMarketingAssistantSearchTokens(value: string) {
  return normalizeMarketingAssistantSearch(value)
    .split(' ')
    .map(stemMarketingAssistantSearchToken)
    .filter((token) => token.length > 0 && !MARKETING_ASSISTANT_SEARCH_STOP_WORDS.has(token))
}

function stemMarketingAssistantSearchToken(token: string) {
  if (token === 'analytics' || token === 'news' || token.length <= 3) return token
  if (token.endsWith('ies') && token.length > 5) return `${token.slice(0, -3)}y`
  if (token.endsWith('ing') && token.length > 6) return token.slice(0, -3)
  if (token.endsWith('ed') && token.length > 5) return token.slice(0, -2)
  if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('ics') && token.length > 4) return token.slice(0, -1)
  return token
}

function normalizeEmbedding(embedding: MarketingAssistantSearchEmbedding) {
  const magnitude = Math.sqrt(Object.values(embedding).reduce((sum, value) => sum + value * value, 0))
  if (magnitude === 0) return embedding
  return Object.fromEntries(Object.entries(embedding).map(([key, value]) => [key, value / magnitude]))
}

function cosineSimilarity(first: MarketingAssistantSearchEmbedding, second: MarketingAssistantSearchEmbedding) {
  const [smaller, larger] = Object.keys(first).length < Object.keys(second).length ? [first, second] : [second, first]
  return Object.entries(smaller).reduce((sum, [key, value]) => sum + value * (larger[key] || 0), 0)
}

function fuzzyTokenCoverage(queryTerms: string[], actionTerms: string[]) {
  if (queryTerms.length === 0 || actionTerms.length === 0) return 0
  const matched = queryTerms.filter((term) => actionTerms.some((candidate) => tokenSimilarity(term, candidate) >= 0.76))
  return matched.length / queryTerms.length
}

function tokenSimilarity(first: string, second: string) {
  if (first === second) return 1
  if (Math.min(first.length, second.length) > 3 && (first.includes(second) || second.includes(first))) return 0.88
  const distance = levenshteinDistance(first, second)
  return 1 - distance / Math.max(first.length, second.length)
}

function levenshteinDistance(first: string, second: string) {
  if (first === second) return 0
  if (first.length === 0) return second.length
  if (second.length === 0) return first.length
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index)
  const current = new Array<number>(second.length + 1)
  for (let i = 1; i <= first.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= second.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (first[i - 1] === second[j - 1] ? 0 : 1),
      )
    }
    for (let j = 0; j <= second.length; j += 1) previous[j] = current[j]
  }
  return previous[second.length]
}

export function createResearchProjectDocument(data: MarketingData): MarketingDocumentInput {
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

export function emptyResearchInspirationDraft(): ResearchInspirationDraft {
  return {
    sourceKind: 'idea',
    action: 'respond',
    title: '',
    url: '',
    note: '',
  }
}

export function hasInspirationDraftContent(inspiration: ResearchInspirationDraft) {
  return Boolean(inspiration.title.trim() || inspiration.url.trim() || inspiration.note.trim())
}

export function buildInspirationResearchResultDocument(
  project: Pick<MarketingResearchProject, '_id' | 'title'>,
  inspiration: ResearchInspirationDraft,
): MarketingDocumentInput {
  const sourceUrl = normalizeInspirationUrl(inspiration.url)
  const title = deriveInspirationTitle(inspiration, sourceUrl)
  const actionLabel = inspirationActionLabel(inspiration.action)
  const note = inspiration.note.trim()
  const resultType = inspirationResultType(inspiration)
  const claim = note || `${actionLabel} ${title}.`
  const contentGap = inspirationContentGap(inspiration, title)
  const implication = inspirationImplication(inspiration, title)

  return {
    _type: 'marketingResearchResult',
    title,
    resultType,
    status: 'needsReview',
    project: referenceFromId(project._id),
    selectedForSynthesis: false,
    priority: 'medium',
    provider: 'manual',
    sourceMethod: 'manualInspiration',
    scoreSource: 'none',
    fetchedAt: new Date().toISOString(),
    ...(sourceUrl ? { sourceUrl } : {}),
    sourceTitle: title,
    ...(resultType === 'competitorExample'
      ? {
          competitorName: title,
          ...(sourceUrl ? { competitorUrl: sourceUrl } : {}),
        }
      : {}),
    claim,
    evidenceType: inspirationEvidenceType(inspiration),
    confidence: 'needsValidation',
    implication,
    contentGap,
    rawProviderMetadata: JSON.stringify(
      {
        sourceKind: inspiration.sourceKind || 'idea',
        action: inspiration.action || 'respond',
        note,
        capturedFrom: 'marketingResearchInspirationInbox',
        projectTitle: project.title || '',
      },
      null,
      2,
    ),
  }
}

export function buildProofPointFromResearchResult(
  result: MarketingResearchResult,
  project?: Pick<MarketingResearchProject, '_id' | 'title'>,
): MarketingDocumentInput {
  const titleBasis = result.sourceTitle || result.competitorName || result.title || result.keyword || 'Research item'
  const sourceUrl = normalizeInspirationUrl(result.sourceUrl || result.competitorUrl || result.canonicalUrl || '')
  const sourceTitle = result.sourceTitle || result.competitorName || result.title || result.keyword || ''
  const claim = result.claim || result.implication || result.contentGap || describeResearchResult(result)
  const notes = [
    result.sourceMethod === 'manualInspiration'
      ? 'Created from captured inspiration. Confirm the source, claim, and framing before using it in content.'
      : `Created from ${researchResultKindLabel(result).toLowerCase()}.`,
    project?.title ? `Research project: ${project.title}.` : '',
    isResearchResultApproved(result) ? 'This finding was marked trusted for setup use.' : 'This proof still needs review before it should guide published work.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    _type: 'marketingProofPoint',
    title: `${titleBasis} proof`,
    claim,
    proofType: proofTypeFromResearchResult(result),
    sourceTitle,
    ...(sourceUrl ? { sourceUrl } : {}),
    confidence: result.confidence || (isResearchResultApproved(result) ? 'medium' : 'needsValidation'),
    researchResults: refsFromIds([result._id]),
    topicCluster: result.keyword || result.topicArea || project?.title || '',
    usageNotes: notes,
  }
}

export function proofTypeFromResearchResult(result: MarketingResearchResult) {
  if (result.resultType === 'seoKeyword') return 'researchFinding'
  if (result.resultType === 'competitorExample' || result.evidenceType === 'competitorExample') return 'caseEvidence'
  if (result.evidenceType === 'teamKnowledge' || result.resultType === 'collaborationSignal') return 'teamKnowledge'
  if (result.evidenceType === 'visualArtifact') return 'visualArtifact'
  if (result.resultType === 'contentGap') return 'researchFinding'
  if (result.evidenceType === 'quote') return 'quote'
  if (result.evidenceType === 'statistic') return 'statistic'
  return 'researchFinding'
}

export function mergeInspirationIntoResearchProject(
  project: MarketingResearchProject,
  inspiration: ResearchInspirationDraft,
): MarketingResearchProject {
  const sourceUrl = normalizeInspirationUrl(inspiration.url)
  const title = deriveInspirationTitle(inspiration, sourceUrl)
  const nextSeedUrls = sourceUrl
    ? normalizeStringList([...(project.seedUrls || []), sourceUrl])
    : normalizeStringList(project.seedUrls || [])
  const nextQuestions = [
    ...(project.researchQuestions || []),
    buildInspirationResearchQuestion(inspiration, title),
  ]
  const nextMethods = normalizeStringList([
    ...(project.methods || defaultResearchMethodsForType(project.researchType)),
    inspiration.sourceKind === 'competitor' ? 'competitiveScan' : 'sourceReview',
  ])

  return {
    ...project,
    status: project.status === 'draft' ? 'reviewing' : project.status || 'reviewing',
    seedUrls: nextSeedUrls,
    methods: nextMethods,
    researchQuestions: nextQuestions,
  }
}

function buildInspirationResearchQuestion(inspiration: ResearchInspirationDraft, title: string): ResearchQuestion {
  const action = inspiration.action || 'respond'
  const questionByAction: Record<string, string> = {
    respond: `What should GoInvo say in response to ${title}?`,
    evidence: `Is ${title} credible and relevant enough to use as evidence?`,
    contrast: `What should GoInvo clarify, correct, or contrast with ${title}?`,
    model: `What useful format or presentation pattern can we learn from ${title}?`,
    topic: `What content opportunity does ${title} suggest?`,
  }
  const decisionByAction: Record<string, string> = {
    respond: 'Decide whether to make a response, explainer, or point-of-view content item.',
    evidence: 'Decide whether this source can support a proof point, message, or content draft.',
    contrast: 'Decide whether the content should clarify a misconception or show a stronger framing.',
    model: 'Decide whether the format is worth adapting for GoInvo content.',
    topic: 'Decide whether this belongs in the release plan.',
  }

  return {
    _key: randomKey(),
    _type: 'researchQuestion',
    question: questionByAction[action] || questionByAction.respond,
    whyItMatters: 'Inspiration should become reviewed source material before it drives a campaign, funnel, calendar item, or Quick Link.',
    method: inspiration.sourceKind === 'competitor' ? 'competitiveScan' : 'sourceReview',
    decisionNeeded: decisionByAction[action] || decisionByAction.respond,
    status: 'idea',
  }
}

function normalizeInspirationUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    return new URL(trimmed).toString()
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(trimmed)) {
      try {
        return new URL(`https://${trimmed}`).toString()
      } catch {
        return ''
      }
    }
    return ''
  }
}

function deriveInspirationTitle(inspiration: ResearchInspirationDraft, sourceUrl: string) {
  const explicitTitle = inspiration.title.trim()
  if (explicitTitle) return explicitTitle
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl)
      const path = url.pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop()
      return path ? `${url.hostname} / ${path.replace(/[-_]/g, ' ')}` : url.hostname
    } catch {
      return sourceUrl
    }
  }
  return 'Captured content inspiration'
}

function inspirationResultType(inspiration: ResearchInspirationDraft) {
  if (inspiration.sourceKind === 'competitor' || inspiration.action === 'model') return 'competitorExample'
  if (inspiration.sourceKind === 'idea' && !normalizeInspirationUrl(inspiration.url)) return 'contentGap'
  return 'sourceEvidence'
}

function inspirationEvidenceType(inspiration: ResearchInspirationDraft) {
  if (inspiration.sourceKind === 'competitor' || inspiration.action === 'model') return 'competitorExample'
  if (inspiration.sourceKind === 'idea') return 'teamKnowledge'
  if (inspiration.sourceKind === 'website') return 'siteContent'
  return 'sourceArticle'
}

function inspirationActionLabel(action: string) {
  return labelFor(inspirationActionOptions, action) || 'Review'
}

function inspirationContentGap(inspiration: ResearchInspirationDraft, title: string) {
  if (inspiration.action === 'evidence') return `Check whether ${title} actually supports a reusable claim before citing it.`
  if (inspiration.action === 'contrast') return `Identify what GoInvo should clarify, correct, or frame differently from ${title}.`
  if (inspiration.action === 'model') return `Identify the reusable format pattern without copying the source.`
  if (inspiration.action === 'topic') return `Decide whether this idea is strong enough to become a research-backed content opportunity.`
  return `Decide whether this is worth a response, explainer, or point-of-view content item.`
}

function inspirationImplication(inspiration: ResearchInspirationDraft, title: string) {
  const note = inspiration.note.trim()
  const base = `${inspirationActionLabel(inspiration.action)}: ${title}.`
  return note ? `${base} ${note}` : base
}

export function createResearchProjectQuestion(project: MarketingResearchProject): ResearchQuestion {
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
    decisionNeeded: 'Trust useful findings and choose whether to create setup drafts.',
    status: 'idea',
  }
}

export function defaultResearchMethodsForType(researchType?: string) {
  if (researchType === 'competitor') return ['competitiveScan', 'seoReview', 'cmsScan', 'sourceReview']
  if (researchType === 'strategy') return ['cmsScan', 'deskResearch', 'analyticsReview', 'sourceReview']
  return ['seoReview', 'cmsScan', 'sourceReview']
}

export function defaultResearchQuestionsForType(researchType: string | undefined, title: string): ResearchQuestion[] {
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
        decisionNeeded: 'Trust credible source findings before synthesis.',
      status: 'needsSource',
    },
  ]
}

export function createResearchProjectCollaborator(): ResearchProjectCollaborator {
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

export function buildResearchProjectSavePayload(project: MarketingResearchProject): Record<string, unknown> {
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

export function mergeResearchProjectSuggestion(
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

export async function migrateLegacyResearchPlanToProject(client: StudioClient, plan: MarketingResearchPlan) {
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

export function createResearchQuestion(plan: MarketingResearchPlan): ResearchQuestion {
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

export function createResearchEvidenceNote(plan: MarketingResearchPlan): ResearchEvidenceNote {
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

export function createResearchAssumption(plan: MarketingResearchPlan): ResearchAssumption {
  return {
    _key: randomKey(),
    _type: 'researchAssumption',
    assumption: plan.audience ? `${plan.audience} will recognize the value of this topic from a short content artifact.` : '',
    risk: 'The content may be clear to the team but not to the intended audience.',
    validationSignal: 'Useful visits, saves, shares, replies, or follow-up conversations after publishing.',
    confidence: 'needsValidation',
  }
}

export function createResearchSeoTarget(plan: MarketingResearchPlan): ResearchSeoTarget {
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

export function createResearchCollaboration(): ResearchCollaboration {
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

export function createResearchReleaseWindow(plan: MarketingResearchPlan): ResearchReleaseWindow {
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

export function createResearchContentOpportunity(plan: MarketingResearchPlan, data: MarketingData): ResearchContentOpportunity {
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

export function createResearchStrategyAdjustment(): ResearchStrategyAdjustment {
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

export function updateResearchArrayItem<T extends { _key?: string; _type?: string }>(
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

export function removeResearchArrayItem<T>(items: T[] | undefined, index: number) {
  return (items || []).filter((_, itemIndex) => itemIndex !== index)
}

export function getResearchChannelOptions(data: MarketingData): SelectOption[] {
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

export function buildResearchPlanSavePayload(plan: MarketingResearchPlan): Record<string, unknown> {
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

export function mergeResearchPlanSuggestion(current: MarketingResearchPlan, suggestion: Partial<MarketingResearchPlan>): MarketingResearchPlan {
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

export function normalizeDraftContentFrames(values: DraftContentFrame[] | undefined): DraftContentFrame[] {
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

export async function createResearchProjectGeneratedRecords(
  client: StudioClient,
  data: MarketingData,
  project: MarketingResearchProject,
  selectedResultIds: string[],
) {
  const selected = getResearchResultsForProject(data, project._id).filter((result) =>
    selectedResultIds.includes(result._id) && isResearchResultApproved(result),
  )
  if (selected.length === 0) throw new Error('No selected trusted findings were found.')

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
        goal: 'Use a trusted finding as the first visible hook.',
        offer: primaryKeyword,
        callToAction: 'Open the source',
        destinationUrl,
        metrics: ['Reach', 'Saves', 'Profile visits'],
      },
      {
        stage: 'interest',
        goal: 'Show enough evidence for the audience to understand why the topic matters.',
        offer: 'Trusted finding',
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
    primaryGoal: project.brief || `Turn trusted ${title} findings into a small content runway.`,
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
      { label: 'Saved or shared content', target: 'The audience signals the research-backed idea was useful enough to keep or pass along.' },
    ]),
    researchProject: referenceFromId(project._id),
    researchResults: resultRefs,
    notes: 'Generated from trusted Research findings. Edit before publishing if strategy changes.',
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
    ...results.map((result) => `Trusted finding: ${describeResearchResult(result)}`),
    'Designer task: make the content from the trusted finding without inventing scores or unsupported claims.',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildResearchResultEvidenceSummary(project: MarketingResearchProject, results: MarketingResearchResult[]) {
  return [
    `Generated from research project: ${project.title || 'Untitled project'}`,
    project.brief ? `Directive: ${project.brief}` : '',
    'Trusted findings:',
    ...results.map((result) => `- ${describeResearchResult(result)}`),
  ]
    .filter(Boolean)
    .join('\n')
}

export async function createResearchPlanGeneratedRecords(
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
          trigger: 'Created linked drafts from selected research opportunities',
          reason: 'The plan had enough SEO, release timing, or contributor context to start production.',
          recommendation: 'Review the generated campaign, funnel, calendar items, and Quick Links before publishing.',
          affectedItems: selected.map((opportunity) => opportunity.title || 'Content opportunity'),
          decision: 'Generated linked CMS drafts.',
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

export function getResearchResultsForProject(data: MarketingData, projectId: string) {
  const project = data.researchProjects.find((candidate) => candidate._id === projectId)
  const referencedIds = new Set([
    ...(project?.selectedResults || []).map((result) => result._id),
    ...(project?.approvedResults || []).map((result) => result._id),
  ].filter(Boolean))
  return data.researchResults.filter((result) => result.project?._id === projectId || referencedIds.has(result._id))
}

export function getResearchRunsForProject(data: MarketingData, projectId: string) {
  return data.researchRuns.filter((run) => run.project?._id === projectId)
}

export function getLatestActiveResearchProject(data: MarketingData) {
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

export function isResearchResultApproved(result: MarketingResearchResult) {
  return result.status === 'approved' || result.status === 'selected'
}

function isResearchResultSelectedForSynthesis(result: MarketingResearchResult, selectedIds: Set<string>) {
  return result.status === 'selected' || selectedIds.has(result._id) || result.selectedForSynthesis
}

export function researchResultKindLabel(result: MarketingResearchResult) {
  if (result.sourceMethod === 'manualInspiration') return result.resultType === 'competitorExample' ? 'Inspiration example' : 'Captured inspiration'
  if (result.resultType === 'sourceEvidence') {
    return result.confidence === 'needsValidation' || /source check needed/i.test(result.title || '')
      ? 'Source candidate'
      : 'Source finding'
  }
  if (result.resultType === 'seoKeyword') return result.scoreSource === 'provider' ? 'Keyword score' : 'Keyword idea'
  if (result.resultType === 'contentGap') return 'Content gap'
  if (result.resultType === 'analyticsSignal') return 'Analytics signal'
  if (result.resultType === 'competitorExample') return 'Example to review'
  if (result.resultType === 'collaborationSignal') return 'Collaborator signal'
  return labelFor(researchResultTypeOptions, result.resultType) || 'Research item'
}

export function researchResultReviewerInstruction(result: MarketingResearchResult) {
  if (result.sourceMethod === 'manualInspiration') {
    return 'This was saved because it inspired a content idea. Trust it only if it is credible, relevant, and worth using as source material or a prompt for a response.'
  }
  if (result.resultType === 'sourceEvidence') {
    if (result.confidence === 'needsValidation' || /source check needed/i.test(result.title || '')) {
      return 'This is a source candidate, not proof yet. Open it, decide whether it actually supports the project, then trust it only if it is worth using.'
    }
    return 'This is evidence from a source. Trust it if the claim is accurate enough to shape the setup.'
  }
  if (result.resultType === 'seoKeyword') {
    if (result.scoreSource === 'provider') return 'This is a provider-scored keyword signal. Trust it if it is relevant to the project, even if the score is not perfect.'
    return 'This is a keyword idea without trusted provider scoring. Use it as a prompt, not as SEO evidence, unless it matches the project well.'
  }
  if (result.resultType === 'contentGap') return 'This points to something missing from the current content or plan. Trust it if the gap should influence what we make next.'
  if (result.resultType === 'analyticsSignal') return 'This is a performance signal. Trust it if it should influence the next campaign, funnel, or calendar decision.'
  if (result.resultType === 'competitorExample') return 'This is an example to learn from, not copy. Trust it if it helps clarify positioning, format, or timing.'
  if (result.resultType === 'collaborationSignal') return 'This is collaborator or contributor input. Trust it if their topic, timing, or capacity should change the release plan.'
  return 'Trust this only if it should be allowed to influence marketing drafts.'
}

function researchResultClaimLabel(result: MarketingResearchResult) {
  if (result.sourceMethod === 'manualInspiration') return 'Why this inspired us'
  if (result.resultType === 'sourceEvidence') {
    return result.confidence === 'needsValidation' || /source check needed/i.test(result.title || '')
      ? 'What to check'
      : 'What this source says'
  }
  if (result.resultType === 'seoKeyword') return 'Keyword signal'
  if (result.resultType === 'contentGap') return 'What is missing'
  if (result.resultType === 'analyticsSignal') return 'What the data suggests'
  if (result.resultType === 'competitorExample') return 'What to learn from'
  if (result.resultType === 'collaborationSignal') return 'Contributor signal'
  return 'What this tells us'
}

export function describeResearchResult(result: MarketingResearchResult) {
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

export function summarizeResearchResultForAi(result: MarketingResearchResult) {
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

export function formatOptionalNumber(value?: number) {
  return value === undefined || Number.isNaN(value) ? 'n/a' : new Intl.NumberFormat().format(value)
}

export function formatOptionalMoney(value?: number) {
  return value === undefined || Number.isNaN(value) ? 'n/a' : `$${value.toFixed(2)}`
}

export function stringListToText(items?: string[]) {
  return (items || []).join('\n')
}

export function textToStringList(value: string) {
  return normalizeStringList(value.split(/\r?\n|,/))
}

export function getRecordId(record?: { _id?: string } | ReferenceValue) {
  if (!record) return ''
  if ('_ref' in record) return record._ref
  return record._id || ''
}

export function referenceFromId(id: string): ReferenceValue {
  return { _type: 'reference', _ref: id }
}

function refsFromRecords(records: Array<{ _id?: string } | ReferenceValue> | undefined) {
  return refsFromIds(refIdsFromRecords(records))
}

export function refIdsFromRecords(records: Array<{ _id?: string } | ReferenceValue> | undefined) {
  return (records || []).map((record) => getRecordId(record)).filter(Boolean)
}

export function mergeIds(existing: string[], next: string[]) {
  return Array.from(new Set([...existing, ...next].filter(Boolean)))
}

export function getMarketingViewTitle(viewId: MarketingViewId) {
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
    const hasResearchItems = data.researchResults.length > 0
    items.push({
      id: 'strategy-foundation',
      title: 'Some setup questions need answers',
      detail: hasResearchItems
        ? `Answer ${missingStrategy.join(', ')} from trusted findings before creating more drafts.`
        : `Get evidence first, then use trusted findings to answer ${missingStrategy.join(', ')}.`,
      view: hasResearchItems ? 'strategy' : 'research',
      severity: 'setup',
    })
  }

  if (data.channels.length === 0) {
    items.push({
      id: 'setup-channels',
      title: 'Add the places we publish',
      detail: 'Channels let the calendar offer useful formats like Instagram carousel or email newsletter.',
      view: 'channels',
      severity: 'setup',
    })
  }

  if (data.analyticsSources.length === 0) {
    items.push({
      id: 'setup-analytics',
      title: 'Add one place to check results',
      detail: 'This gives campaigns and calendar items somewhere concrete to look after launch.',
      view: 'analytics',
      severity: 'measurement',
    })
  }

  if (data.linkItems.length === 0) {
    items.push({
      id: 'setup-link-tree',
      title: 'Set up Quick Links for social posts',
      detail: 'Create managed links, then connect social posts to the article, project, or resource they mention.',
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
          title: `${campaign.title || 'Campaign'} has no content yet`,
          detail: 'Add at least one calendar item so designers know what to make for this campaign.',
          view: 'calendar',
          severity: 'content',
        })
      }
      if ((campaign.channels || []).length === 0 && (campaign.channelRefs || []).length === 0) {
        items.push({
          id: `campaign-channel-${campaign._id}`,
          title: `${campaign.title || 'Campaign'} needs a publishing place`,
          detail: 'Choose where this campaign will show up before designing assets.',
          view: 'campaigns',
          severity: 'setup',
        })
      }
      if ((campaign.funnels || []).length === 0) {
        items.push({
          id: `campaign-funnel-${campaign._id}`,
          title: `${campaign.title || 'Campaign'} needs a funnel`,
          detail: 'Attach a funnel so each content item has a clear role in the larger path.',
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
          title: `${campaign.title || 'Campaign'} has unanswered setup questions`,
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
          title: `${item.title || 'Calendar item'} is missing ${missing[0]}`,
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
          title: `${link.title || 'Quick Link'} needs a clearer purpose`,
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
          title: `${project.title || 'Research project'} needs a reusable answer`,
          detail: 'Connect at least one audience, message, proof point, or performance signal so the research has a clear purpose.',
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
          title: `${funnel.title || 'Funnel'} needs clearer stages`,
          detail: 'Use a funnel template or add stage goals and CTAs so designers know what each asset should do.',
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

export function getCampaignTemplates(data?: Pick<MarketingData, 'templates'>) {
  const managed = (data?.templates || [])
    .filter((template) => template.kind === 'campaign' && template.status !== 'archived')
    .map(marketingTemplateToCampaignTemplate)
    .filter((template): template is CampaignTemplate => !!template)
  return [...managed, ...CAMPAIGN_TEMPLATES]
}

function getCampaignTemplate(id: string, data?: Pick<MarketingData, 'templates'>) {
  return getCampaignTemplates(data).find((template) => template.id === id)
}

export function getFunnelTemplates(data?: Pick<MarketingData, 'templates'>) {
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

export function getChannelOptions(channels: MarketingChannel[]) {
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
      'The demo is local-only and does not save CMS content when created.',
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

export function buildMarketingAutopilotPlan(
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
): MarketingAutopilotPlan {
  const researchProjectFit = getAutopilotResearchProjectFit(data, suggestion, questionnaire)
  const project = researchProjectFit.matched || null
  const projectResults = project ? getResearchResultsForProject(data, project._id) : []
  const projectRuns = project ? getResearchRunsForProject(data, project._id) : []
  const approvedResults = projectResults.filter(isResearchResultApproved)
  const selectedIds = project ? getSelectedResearchResultIds(project) : new Set<string>()
  const selectedApprovedResults = approvedResults.filter((result) => isResearchResultSelectedForSynthesis(result, selectedIds))
  const completedRunsWithFindings = projectRuns.filter((run) =>
    (run.status === 'complete' || run.status === 'completed') && ((run.createdResults || []).length > 0 || projectResults.some((result) => result.run?._id === run._id)),
  )
  const generatedCount = project ? countGeneratedRecordsForResearchProject(data, project) : 0
  const relatedCalendarItems = project ? getCalendarItemsForResearchProject(data, project) : data.calendarItems
  const draftCalendarItems = relatedCalendarItems.filter((item) => getCalendarItemDisplayGroup(item) === 'draft')
  const needsQuickLink = shouldAutopilotIncludeQuickLink(data, suggestion, questionnaire)
  const downstreamFit = getAutopilotDownstreamFit(data, project, suggestion, questionnaire)
  const calendarFit = getAutopilotCalendarFit(data, draftCalendarItems, suggestion, questionnaire)
  const quickLinkFit = getAutopilotQuickLinkFit(data, suggestion, questionnaire)
  const strategyFits = {
    audiences: getAutopilotStrategyFit('audiences', data, suggestion, questionnaire),
    messages: getAutopilotStrategyFit('messages', data, suggestion, questionnaire),
    proof: getAutopilotStrategyFit('proof', data, suggestion, questionnaire),
    ctas: getAutopilotStrategyFit('ctas', data, suggestion, questionnaire),
    tracking: getAutopilotStrategyFit('tracking', data, suggestion, questionnaire),
    quality: getAutopilotStrategyFit('quality', data, suggestion, questionnaire),
    experiments: getAutopilotStrategyFit('experiments', data, suggestion, questionnaire),
  }
  const needsExperiment = shouldAutopilotIncludeExperiment(suggestion)
  const title =
    stripResearchProjectSuffix(
      suggestion?.researchProject?.title ||
        suggestion?.researchPlan?.title ||
        suggestion?.summary ||
        questionnaire.topic ||
        project?.title ||
        'Marketing setup',
    ) || 'Marketing setup'

  const rawSteps: Array<MarketingAutopilotStep & { complete: boolean }> = [
    {
      id: 'research-project',
      title: researchProjectFit.matched ? `Research project: ${researchProjectFit.matched.title || 'Untitled project'}` : 'Research project',
      instruction: researchProjectFit.matched ? researchProjectFit.reason : 'Create the research project.',
      why: 'Research keeps the setup from becoming invented marketing guesses. The project stores the question, audience, seed keywords, URLs, and collaborators before records are generated.',
      requiredAction: researchProjectFit.matched
        ? 'Review the existing research project. Save it to confirm, and only create a new one if it does not fit.'
        : 'Click Add research project, then review the starter fields.',
      nextAfter: 'Autopilot will get or review findings next.',
      view: 'research',
      targetId: researchProjectFit.matched ? 'autopilot-research-project-editor' : 'autopilot-research-add-project',
      recordId: researchProjectFit.matched?._id,
      expectedAction: 'research:createProject',
      status: 'upcoming',
      complete: researchProjectFit.complete,
      completedRefId: researchProjectFit.complete ? researchProjectFit.matched?._id : undefined,
    },
    {
      id: 'research-run',
      title: 'Get evidence',
      instruction: 'Get evidence.',
      why: 'This gathers reviewable findings such as SEO scores, source candidates, content gaps, analytics signals, competitor examples, and collaborator signals.',
      requiredAction: 'Check the seed inputs, then click Get evidence.',
      nextAfter: 'Autopilot will move to the review page so you can trust what is strong enough to use.',
      view: 'research',
      targetId: 'autopilot-research-run-panel',
      recordId: project?._id,
      expectedAction: 'research:run',
      status: 'upcoming',
      complete: projectResults.length > 0 || completedRunsWithFindings.length > 0,
      completedRefId: completedRunsWithFindings[0]?._id || projectResults[0]?._id,
    },
    {
      id: 'research-approve',
      title: 'Choose trusted findings',
      instruction: 'Trust useful findings.',
      why: 'Only trusted and selected findings should justify campaigns, funnels, calendar items, Quick Links, and content drafts.',
      requiredAction: 'Open Choose useful evidence and trust at least one credible finding.',
      nextAfter: 'Autopilot will use the selected findings to create setup drafts.',
      view: 'research',
      targetId: 'autopilot-research-review',
      recordId: project?._id,
      expectedAction: 'research:approve',
      status: 'upcoming',
      complete: selectedApprovedResults.length > 0,
      completedRefId: selectedApprovedResults[0]?._id,
    },
    {
      id: 'research-generate',
      title: downstreamFit.matched ? `Setup drafts: ${downstreamFit.matched.title || 'Existing setup'}` : 'Create setup drafts',
      instruction: downstreamFit.matched ? downstreamFit.reason : 'Create setup drafts from the trusted findings.',
      why: 'The campaign, funnel, calendar draft, and optional Quick Link should stay tied to the evidence that made them worth doing.',
      requiredAction: downstreamFit.matched
        ? 'Review the existing setup drafts. Create new drafts only if the current setup does not fit.'
        : 'Open Create setup, then create the linked drafts.',
      nextAfter: 'Autopilot will help fill the reusable strategy answers designers need before writing content.',
      view: 'research',
      targetId: 'autopilot-research-create-setup',
      recordId: project?._id,
      expectedAction: 'research:generateRecords',
      status: 'upcoming',
      complete: generatedCount > 0 || downstreamFit.complete,
      completedRefId: generatedCount > 0 || downstreamFit.complete ? downstreamFit.matched?._id : undefined,
    },
    strategyAutopilotStep('audiences', 'Audience', strategyFits.audiences),
    strategyAutopilotStep('messages', 'Message', strategyFits.messages),
    strategyAutopilotStep('proof', 'Proof', strategyFits.proof),
    strategyAutopilotStep('ctas', 'CTA', strategyFits.ctas),
    strategyAutopilotStep('tracking', 'Tracking', strategyFits.tracking),
    strategyAutopilotStep('quality', 'Checklist', strategyFits.quality),
    ...(needsExperiment ? [strategyAutopilotStep('experiments', 'Test', strategyFits.experiments)] : []),
    {
      id: 'calendar-draft',
      title: calendarFit.matched ? `Calendar draft: ${calendarFit.matched.title || 'Untitled draft'}` : 'Calendar draft',
      instruction: calendarFit.matched ? calendarFit.reason : 'Create a calendar draft.',
      why: 'The calendar draft gives the designer a concrete place to write the artifact after research and strategy have enough structure.',
      requiredAction: calendarFit.matched
        ? 'Review the existing calendar draft. Save it to confirm, and only add a new draft if it does not fit.'
        : 'Click Add to create a draft calendar item.',
      nextAfter: 'Autopilot will ask you to save the draft so the setup is ready for content writing.',
      view: 'calendar',
      targetId: calendarFit.matched ? 'autopilot-calendar-editor' : 'autopilot-calendar-add',
      recordId: calendarFit.matched?._id,
      expectedAction: 'calendar:createDraft',
      status: 'upcoming',
      complete: calendarFit.complete,
      completedRefId: calendarFit.complete ? calendarFit.matched?._id : undefined,
    },
    {
      id: 'calendar-save-draft',
      title: 'Confirm calendar draft',
      instruction: 'Save the calendar draft.',
      why: 'Saving confirms the setup is no longer just a recommendation. The next person can open the draft and write content with the needed context nearby.',
      requiredAction: 'Review the draft fields, then click Save calendar item.',
      nextAfter: needsQuickLink ? 'Autopilot will check whether this needs a public Quick Link.' : 'Autopilot will stop here so the designer can write the content.',
      view: 'calendar',
      targetId: 'autopilot-calendar-editor',
      recordId: calendarFit.matched?._id,
      expectedAction: 'calendar:saveDraft',
      status: 'upcoming',
      complete: Boolean(calendarFit.matched && calendarFit.complete && calendarFit.matched.title?.trim() && (calendarFit.matched.brief?.trim() || calendarFit.matched.channel || calendarFit.matched.contentType)),
      completedRefId: Boolean(calendarFit.matched && calendarFit.complete && calendarFit.matched.title?.trim() && (calendarFit.matched.brief?.trim() || calendarFit.matched.channel || calendarFit.matched.contentType))
        ? calendarFit.matched?._id
        : undefined,
    },
  ]

  if (needsQuickLink) {
    rawSteps.push({
      id: 'quick-link',
      title: quickLinkFit.matched ? `Quick Link: ${quickLinkFit.matched.title || 'Saved link'}` : 'Quick Link',
      instruction: quickLinkFit.matched ? quickLinkFit.reason : 'Create or confirm the public Quick Link.',
      why: 'Social posts need a public destination so "link in bio" points to the right work without manual cleanup later.',
      requiredAction: quickLinkFit.matched
        ? 'Review the existing Quick Link. Save it to confirm, and only add a new link if it does not fit.'
        : 'Add or save the Quick Link that points to the planned destination.',
      nextAfter: 'Autopilot will stop with the setup ready for content writing.',
      view: 'linkTree',
      targetId: quickLinkFit.matched ? 'autopilot-link-editor' : 'autopilot-link-add',
      recordId: quickLinkFit.matched?._id,
      expectedAction: 'link:save',
      status: 'upcoming',
      complete: quickLinkFit.complete,
      completedRefId: quickLinkFit.complete ? quickLinkFit.matched?._id : undefined,
    })
  }

  return normalizeAutopilotStepStatuses({
    id: `autopilot-${Date.now()}-${randomKey()}`,
    title: `${title} setup`,
    currentStepId: rawSteps[0]?.id || '',
    coachOpen: false,
    steps: rawSteps.map(({ complete, ...step }) => ({ ...step, status: complete ? 'done' : 'upcoming' })),
  })
}

function strategyAutopilotStep(
  sectionId: StrategyAssetKind,
  title: string,
  fit: StrategyAssetAutopilotFit,
): MarketingAutopilotStep & { complete: boolean } {
  const hasExistingItems = fit.existingCount > 0
  const sectionQuestion = getStrategySectionQuestion(sectionId)
  const editorTargetId = `autopilot-strategy-editor-${sectionId}`
  return {
    id: `strategy-${sectionId}`,
    title: fit.matchedTitle ? `${title}: ${fit.matchedTitle}` : title,
    instruction: hasExistingItems
      ? fit.reason
      : sectionQuestion.question,
    why: sectionQuestion.reason,
    requiredAction: hasExistingItems
      ? 'Review the saved answer. If it fits, save it to confirm; only add a new one if it does not.'
      : `Use ${strategySectionActionLabel(sectionId)}, draft from research if helpful, then save the answer.`,
    nextAfter: 'Autopilot will move to the next unanswered setup question.',
    view: 'strategy',
    targetId: hasExistingItems || fit.complete ? editorTargetId : 'autopilot-strategy-add',
    strategySection: sectionId,
    recordId: fit.matchedId,
    expectedAction: `strategy:save:${sectionId}`,
    status: 'upcoming',
    complete: fit.complete,
    completedRefId: fit.complete ? fit.matchedId : undefined,
  }
}

function getAutopilotStrategyFit(
  sectionId: StrategyAssetKind,
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
): StrategyAssetAutopilotFit {
  const section = STRATEGY_SECTIONS.find((candidate) => candidate.id === sectionId)
  const singular = section?.singular || sectionId
  const sectionQuestion = getStrategySectionQuestion(sectionId)
  const items = getStrategySectionItems(data, sectionId).filter((item) => getStrategyDocumentStatus(item) !== 'archived')
  if (items.length === 0) {
    return {
      sectionId,
      complete: false,
      existingCount: 0,
      reason: `No saved answer exists yet for "${sectionQuestion.question}"`,
    }
  }

  if (sectionId === 'tracking' || sectionId === 'quality') {
    const reusable = items.find((item) => getStrategyDocumentStatus(item) === 'active') || items[0]
    return {
      sectionId,
      complete: true,
      existingCount: items.length,
      matchedId: reusable._id,
      matchedTitle: reusable.title || `Saved ${singular}`,
      reason: `Reusing ${reusable.title || `the saved answer`} because this usually applies across content unless a special rule is needed.`,
    }
  }

  const intentTokens = getAutopilotIntentTokens(suggestion, questionnaire)
  const fallbackItem = getPreferredStrategyItem(sectionId, items)

  if (intentTokens.size < 2) {
    return {
      sectionId,
      complete: true,
      existingCount: items.length,
      matchedId: fallbackItem._id,
      matchedTitle: fallbackItem.title || `Saved ${singular}`,
      reason: `Reusing ${fallbackItem.title || `the saved answer`} because there is not enough specific context to justify creating a new one.`,
    }
  }

  const scored = items
    .map((item) => {
      const itemTokens = tokenizeAutopilotFitText(getStrategyDocumentFitText(sectionId, item))
      const overlap = Array.from(intentTokens).filter((token) => itemTokens.has(token))
      const score = overlap.length + getStrategyDocumentPriorityBoost(sectionId, item, overlap.length)
      return { item, overlap, score }
    })
    .sort((left, right) => right.score - left.score)
  const best = scored[0]

  if (best && best.score >= 2) {
    return {
      sectionId,
      complete: true,
      existingCount: items.length,
      matchedId: best.item._id,
      matchedTitle: best.item.title || `Saved ${singular}`,
      reason: `Reusing ${best.item.title || `the saved answer`} because it matches ${best.overlap.slice(0, 3).join(', ')}.`,
    }
  }

  return {
    sectionId,
    complete: false,
    existingCount: items.length,
    matchedId: fallbackItem._id,
    matchedTitle: fallbackItem.title || `Saved ${singular}`,
    reason: `There ${items.length === 1 ? 'is' : 'are'} ${items.length} saved answer${items.length === 1 ? '' : 's'} for "${sectionQuestion.question}", but none clearly match this setup yet. Review existing answers before creating a new one.`,
  }
}

function getAutopilotResearchProjectFit(
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
): RecordAutopilotFit<MarketingResearchProject> {
  return getAutopilotRecordFit({
    label: 'research project',
    items: data.researchProjects.filter((project) => (project.status || 'draft') !== 'archived'),
    suggestion,
    questionnaire,
    textForItem: (project) => [
      project.title,
      project.researchType,
      project.brief,
      project.audience,
      project.campaignObjective,
      project.positioning,
      project.canonicalUrl,
      ...(project.goals || []),
      ...(project.seedKeywords || []),
      ...(project.seedUrls || []),
      ...(project.researchQuestions || []).map((question) => [question.question, question.whyItMatters, question.method, question.decisionNeeded].filter(Boolean).join(' ')),
      ...(project.collaborators || []).map((collaborator) =>
        [collaborator.name, collaborator.organization, collaborator.topicArea, collaborator.contributionType, collaborator.expectedContribution, collaborator.notes].filter(Boolean).join(' '),
      ),
      project.internalNotes,
    ]
      .filter(Boolean)
      .join(' '),
  })
}

function getAutopilotDownstreamFit(
  data: MarketingData,
  project: MarketingResearchProject | null,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
): RecordAutopilotFit<{ _id: string; title?: string }> {
  if (project && countGeneratedRecordsForResearchProject(data, project) > 0) {
    const linked =
      data.campaigns.find((campaign) => campaign.researchProject?._id === project._id) ||
      data.funnels.find((funnel) => funnel.researchProject?._id === project._id) ||
      data.calendarItems.find((item) => item.researchProject?._id === project._id) ||
      data.linkItems.find((item) => item.researchProject?._id === project._id)
    return {
      complete: true,
      existingCount: countGeneratedRecordsForResearchProject(data, project),
      matched: linked ? { _id: linked._id, title: linked.title } : { _id: project._id, title: project.title },
      reason: 'Reusing the drafts already connected to this research project.',
    }
  }

  const items: Array<{ _id: string; title?: string; fitText: string }> = [
    ...data.campaigns.filter((item) => (item.status || 'idea') !== 'archived').map((item) => ({
      _id: item._id,
      title: item.title || 'Campaign',
      fitText: [
        item.title,
        item.primaryGoal,
        item.campaignObjective,
        item.audience,
        item.topicCluster,
        item.searchIntent,
        ...(item.targetQueries || []),
        item.positioning,
        item.canonicalUrl,
        ...(item.channels || []),
        item.notes,
      ]
        .filter(Boolean)
        .join(' '),
    })),
    ...data.funnels.filter((item) => (item.status || 'draft') !== 'archived').map((item) => ({
      _id: item._id,
      title: item.title || 'Funnel',
      fitText: [
        item.title,
        item.audience,
        item.conversionGoal,
        item.notes,
        ...(item.stages || []).map((stage) => [stage.stage, stage.goal, stage.offer, stage.callToAction, stage.destinationUrl, ...(stage.metrics || [])].filter(Boolean).join(' ')),
      ]
        .filter(Boolean)
        .join(' '),
    })),
  ]

  return getAutopilotRecordFit({
    label: 'paired campaign or funnel',
    items,
    suggestion,
    questionnaire,
    textForItem: (item) => item.fitText,
  })
}

function getAutopilotCalendarFit(
  data: MarketingData,
  relatedDrafts: MarketingCalendarItem[],
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
): RecordAutopilotFit<MarketingCalendarItem> {
  const draftItems = relatedDrafts.length > 0
    ? relatedDrafts
    : data.calendarItems.filter((item) => getCalendarItemDisplayGroup(item) === 'draft')
  return getAutopilotRecordFit({
    label: 'calendar draft',
    items: draftItems.filter((item) => (item.status || 'draft') !== 'archived'),
    suggestion,
    questionnaire,
    textForItem: (item) => [
      item.title,
      item.status,
      item.contentType,
      item.channel,
      item.brief,
      item.contentDraft,
      item.contentProductionNotes,
      item.workingUrl,
      item.publishedUrl,
      item.callToAction,
      item.utmCampaign,
      item.funnelStage,
      item.topicCluster,
      item.searchIntent,
      ...(item.targetQueries || []),
    ]
      .filter(Boolean)
      .join(' '),
  })
}

function getAutopilotQuickLinkFit(
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
): RecordAutopilotFit<MarketingLinkItem> {
  return getAutopilotRecordFit({
    label: 'Quick Link',
    items: data.linkItems.filter((link) => (link.status || 'active') !== 'archived' && Boolean(link.url?.trim())),
    suggestion,
    questionnaire,
    textForItem: (link) => [
      link.title,
      link.url,
      link.description,
      link.type,
      link.sourceChannel,
      link.campaign?.title,
      link.calendarItem?.title,
      ...(link.calendarItems || []).map((item) => item.title).join(' '),
      link.cta?.label,
      link.cta?.destination,
    ]
      .filter(Boolean)
      .join(' '),
  })
}

function getAutopilotRecordFit<T extends { _id: string; title?: string }>({
  label,
  items,
  suggestion,
  questionnaire,
  textForItem,
}: {
  label: string
  items: T[]
  suggestion: MarketingAiSuggestion | null
  questionnaire: MarketingPlanQuestionnaire
  textForItem: (item: T) => string
}): RecordAutopilotFit<T> {
  if (items.length === 0) {
    return {
      complete: false,
      existingCount: 0,
      reason: `No saved ${label} exists yet.`,
    }
  }

  const intentTokens = getAutopilotIntentTokens(suggestion, questionnaire)
  const fallback = items[0]
  if (intentTokens.size < 2) {
    return {
      complete: true,
      existingCount: items.length,
      matched: fallback,
      reason: `Reusing ${fallback.title || `the saved ${label}`} because there is not enough specific context to justify creating a new one.`,
    }
  }

  const scored = items
    .map((item) => {
      const itemTokens = tokenizeAutopilotFitText(textForItem(item))
      const overlap = Array.from(intentTokens).filter((token) => itemTokens.has(token))
      return { item, overlap, score: overlap.length }
    })
    .sort((left, right) => right.score - left.score)
  const best = scored[0]

  if (best && best.score >= 2) {
    return {
      complete: true,
      existingCount: items.length,
      matched: best.item,
      reason: `Reusing ${best.item.title || `the saved ${label}`} because it matches ${best.overlap.slice(0, 3).join(', ')}.`,
    }
  }

  return {
    complete: false,
    existingCount: items.length,
    matched: fallback,
    reason: `There ${items.length === 1 ? 'is' : 'are'} ${items.length} saved ${label}${items.length === 1 ? '' : 's'}, but none clearly match this setup yet. Review existing items before creating a new one.`,
  }
}

function getAutopilotIntentTokens(suggestion: MarketingAiSuggestion | null, questionnaire: MarketingPlanQuestionnaire) {
  return tokenizeAutopilotFitText(
    [
      questionnaire.topic,
      questionnaire.audience,
      questionnaire.objective,
      suggestion?.summary,
      suggestion?.campaign?.audience,
      suggestion?.campaign?.topicCluster,
      suggestion?.campaign?.primaryGoal,
      suggestion?.campaign?.campaignObjective,
      suggestion?.campaign?.positioning,
      suggestion?.calendarItem?.title,
      suggestion?.calendarItem?.brief,
      suggestion?.calendarItem?.callToAction,
      suggestion?.researchProject?.audience,
      suggestion?.researchProject?.brief,
      suggestion?.researchProject?.goals?.join(' '),
      suggestion?.researchPlan?.audience,
      suggestion?.researchPlan?.positioning,
      suggestion?.researchPlan?.summary,
      ...(suggestion?.researchPlan?.seoTargets || []).map((target) => [target.query, target.intent, target.contentGap, target.notes].filter(Boolean).join(' ')),
      ...(suggestion?.researchPlan?.contentOpportunities || []).map((opportunity) =>
        [opportunity.title, opportunity.format, opportunity.callToAction, opportunity.sourceMaterial, opportunity.seoQuery].filter(Boolean).join(' '),
      ),
      ...(suggestion?.rationale || []),
    ]
      .filter(Boolean)
      .join(' '),
  )
}

function tokenizeAutopilotFitText(text: string) {
  const stopwords = new Set([
    'about',
    'after',
    'and',
    'are',
    'for',
    'from',
    'have',
    'into',
    'our',
    'that',
    'the',
    'their',
    'this',
    'with',
    'work',
    'content',
    'marketing',
    'plan',
    'setup',
  ])
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map(normalizeAutopilotFitToken)
      .filter((token) => token.length >= 3 && !stopwords.has(token)),
  )
}

function normalizeAutopilotFitToken(token: string) {
  if (token.startsWith('design')) return 'design'
  if (token.startsWith('health') || token === 'care' || token === 'clinical' || token === 'medical') return 'health'
  if (token.startsWith('govern') || token === 'civic' || token === 'public' || token === 'policy') return 'civic'
  if (token.startsWith('leader') || token === 'executive' || token === 'stakeholder' || token === 'decision') return 'leader'
  if (token.startsWith('housing') || token === 'home' || token === 'homes') return 'housing'
  if (token.startsWith('student') || token.startsWith('intern') || token.startsWith('universit')) return 'university'
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`
  if (token.endsWith('ers') && token.length > 5) return token.slice(0, -1)
  if (token.endsWith('s') && token.length > 4) return token.slice(0, -1)
  return token
}

function getStrategyDocumentStatus(item: StrategyDocument) {
  return 'status' in item ? item.status || 'active' : 'active'
}

function getPreferredStrategyItem(sectionId: StrategyAssetKind, items: StrategyDocument[]) {
  if (sectionId === 'audiences') {
    return items.find((item) => (item as MarketingAudienceProfile).priority === 'primary') || items[0]
  }
  if (sectionId === 'ctas') {
    return items.find((item) => (item as MarketingCta).priority === 'primary') || items[0]
  }
  return items.find((item) => getStrategyDocumentStatus(item) === 'active') || items[0]
}

function getStrategyDocumentPriorityBoost(sectionId: StrategyAssetKind, item: StrategyDocument, overlapCount: number) {
  if (overlapCount <= 0) return 0
  if (sectionId === 'audiences' && (item as MarketingAudienceProfile).priority === 'primary') return 1
  if (sectionId === 'ctas' && (item as MarketingCta).priority === 'primary') return 1
  if (getStrategyDocumentStatus(item) === 'active') return 0.5
  return 0
}

function getStrategyDocumentFitText(sectionId: StrategyAssetKind, item: StrategyDocument) {
  if (sectionId === 'audiences') {
    const audience = item as MarketingAudienceProfile
    return [
      audience.title,
      audience.audience,
      ...(audience.needs || []),
      ...(audience.pains || []),
      ...(audience.misconceptions || []),
      ...(audience.trustTriggers || []),
      ...(audience.desiredActions || []),
      ...(audience.objections || []),
      audience.notes,
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (sectionId === 'messages') {
    const message = item as MarketingMessagePillar
    return [
      message.title,
      message.coreClaim,
      ...(message.supportingClaims || []),
      ...(message.approvedPhrases || []),
      ...(message.phrasesToAvoid || []),
      message.topicCluster,
      ...(message.audiences || []).map((audience) => [audience.title, audience.audience].filter(Boolean).join(' ')).join(' '),
      ...(message.proofPoints || []).map((proof) => [proof.title, proof.claim].filter(Boolean).join(' ')).join(' '),
      message.notes,
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (sectionId === 'proof') {
    const proof = item as MarketingProofPoint
    return [
      proof.title,
      proof.claim,
      proof.proofType,
      proof.sourceTitle,
      proof.topicCluster,
      proof.usageNotes,
      ...(proof.researchResults || []).map((result) => [result.title, result.keyword, result.claim, result.contentGap, result.sourceTitle].filter(Boolean).join(' ')).join(' '),
      ...(proof.audiences || []).map((audience) => [audience.title, audience.audience].filter(Boolean).join(' ')).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (sectionId === 'ctas') {
    const cta = item as MarketingCta
    return [
      cta.title,
      cta.label,
      cta.funnelStage,
      cta.destination,
      cta.successSignal,
      cta.priority,
      ...(cta.audiences || []).map((audience) => [audience.title, audience.audience].filter(Boolean).join(' ')).join(' '),
      cta.notes,
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (sectionId === 'tracking') {
    const tracking = item as MarketingTrackingRule
    return [
      tracking.title,
      tracking.utmSourceRule,
      tracking.utmMediumRule,
      tracking.utmCampaignPattern,
      tracking.utmContentPattern,
      ...(tracking.allowedSources || []).map((source) => [source.label, source.value, source.whenToUse].filter(Boolean).join(' ')).join(' '),
      ...(tracking.allowedMediums || []).map((medium) => [medium.label, medium.value, medium.whenToUse].filter(Boolean).join(' ')).join(' '),
      ...(tracking.examples || []).map((example) => [example.label, example.url, example.notes].filter(Boolean).join(' ')).join(' '),
      tracking.notes,
    ]
      .filter(Boolean)
      .join(' ')
  }
  if (sectionId === 'quality') {
    const gate = item as MarketingQualityGate
    return [
      gate.title,
      gate.whenToUse,
      ...(gate.checks || []).map((check) => [check.label, check.category, check.guidance].filter(Boolean).join(' ')).join(' '),
      gate.notes,
    ]
      .filter(Boolean)
      .join(' ')
  }
  return item.title || ''
}

export function applyAutopilotCompletion(
  plan: MarketingAutopilotPlan,
  signal: Pick<AutopilotCompletionSignal, 'action' | 'recordId'>,
): MarketingAutopilotPlan {
  const matchedIndex = plan.steps.findIndex((step) => step.expectedAction === signal.action && step.status !== 'done')
  if (matchedIndex < 0) return plan
  const completedStep = plan.steps[matchedIndex]
  return normalizeAutopilotStepStatuses({
    ...plan,
    coachOpen: true,
    createdRefs: {
      ...(plan.createdRefs || {}),
      ...(signal.recordId ? { [completedStep.id]: signal.recordId } : {}),
    },
    steps: plan.steps.map((step, index) =>
      index === matchedIndex
        ? {
            ...step,
            status: 'done',
            completedRefId: signal.recordId || step.completedRefId,
          }
        : step,
    ),
  })
}

function refreshMarketingAutopilotPlan(
  plan: MarketingAutopilotPlan,
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
) {
  const nextPlan = buildMarketingAutopilotPlan(data, suggestion, questionnaire)
  const completedById = new Map(plan.steps.filter((step) => step.status === 'done').map((step) => [step.id, step]))
  return normalizeAutopilotStepStatuses({
    ...nextPlan,
    id: plan.id,
    coachOpen: plan.coachOpen,
    createdRefs: {
      ...(nextPlan.createdRefs || {}),
      ...(plan.createdRefs || {}),
    },
    steps: nextPlan.steps.map((step) => {
      const completed = completedById.get(step.id)
      if (!completed) return step
      return {
        ...step,
        status: 'done',
        completedRefId: completed.completedRefId || step.completedRefId,
      }
    }),
  })
}

function autopilotPlanFingerprint(plan: MarketingAutopilotPlan) {
  return JSON.stringify({
    currentStepId: plan.currentStepId,
    coachOpen: plan.coachOpen,
    steps: plan.steps.map((step) => ({
      id: step.id,
      title: step.title,
      status: step.status,
      targetId: step.targetId,
      recordId: step.recordId,
      completedRefId: step.completedRefId,
      requiredAction: step.requiredAction,
    })),
  })
}

export function getCurrentAutopilotStep(plan?: MarketingAutopilotPlan | null) {
  if (!plan) return null
  return plan.steps.find((step) => step.status === 'current') || plan.steps.find((step) => step.status !== 'done') || null
}

function getAutopilotCurrentIndex(plan: MarketingAutopilotPlan | null) {
  if (!plan) return 0
  const currentIndex = plan.steps.findIndex((step) => step.id === plan.currentStepId)
  return Math.max(0, currentIndex)
}

function autopilotTargetForStep(step: MarketingAutopilotStep): AutopilotWorkspaceTarget {
  return {
    view: step.view,
    targetId: step.targetId,
    strategySection: step.strategySection,
    recordId: step.recordId || step.completedRefId,
  }
}

function setAutopilotCoachOpen(plan: MarketingAutopilotPlan, coachOpen: boolean): MarketingAutopilotPlan {
  return {
    ...plan,
    coachOpen,
  }
}

function normalizeAutopilotStepStatuses(plan: MarketingAutopilotPlan): MarketingAutopilotPlan {
  let currentAssigned = false
  const steps = plan.steps.map((step) => {
    const hasConfirmedRecord = step.status === 'done' || step.status === 'blocked' || Boolean(step.completedRefId)
    if (!currentAssigned && hasConfirmedRecord) return { ...step, status: 'done' as const }
    if (!currentAssigned) {
      currentAssigned = true
      return { ...step, status: 'current' as const }
    }
    return { ...step, status: hasConfirmedRecord ? 'blocked' as const : 'upcoming' as const }
  })
  const current = steps.find((step) => step.status === 'current')
  const allDone = !current
  return {
    ...plan,
    currentStepId: current?.id || steps[steps.length - 1]?.id || '',
    coachOpen: allDone ? false : plan.coachOpen,
    steps,
  }
}

function shouldAutopilotIncludeQuickLink(
  data: MarketingData,
  suggestion: MarketingAiSuggestion | null,
  questionnaire: MarketingPlanQuestionnaire,
) {
  const suggestedOpportunities = suggestion?.researchPlan?.contentOpportunities || []
  const plannedChannelText = [
    questionnaire.notes,
    questionnaire.topic,
    suggestion?.summary,
    suggestion?.researchProject?.brief,
    ...suggestedOpportunities.map((opportunity) => `${opportunity.channel || ''} ${opportunity.format || ''}`),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const namesSocialChannel = /\b(instagram|linkedin|social|bio|carousel)\b/.test(plannedChannelText)
  const hasSocialChannel = data.channels.some((channel) => ['instagram', 'linkedin'].includes(channel.key || channel.platform || '') && channel.status !== 'archived')
  return Boolean(questionnaire.destinationUrl?.trim() || namesSocialChannel || hasSocialChannel)
}

function shouldAutopilotIncludeExperiment(suggestion: MarketingAiSuggestion | null) {
  const recommendation = suggestion?.strategistChat?.primaryRecommendation
  if (!recommendation) return false
  if (recommendation.experimentHypothesis?.trim()) return true
  return recommendation.recommendation === 'testSmall' || recommendation.recommendation === 'doNow'
}

function normalizeMarketingAutopilotPlan(value: unknown): MarketingAutopilotPlan | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<MarketingAutopilotPlan>
  if (!record.id || !Array.isArray(record.steps)) return null
  const steps = record.steps
    .map((step): MarketingAutopilotStep | null => {
      if (!step || typeof step !== 'object') return null
      const item = step as Partial<MarketingAutopilotStep>
      if (!item.id || !item.title || !item.view || !item.targetId || !item.expectedAction) return null
      const status: AutopilotStepStatus =
        item.status === 'done' || item.status === 'current' || item.status === 'blocked' || item.status === 'upcoming'
          ? item.status
          : 'upcoming'
      return {
        id: String(item.id),
        title: String(item.title),
        instruction: typeof item.instruction === 'string' ? item.instruction : String(item.title),
        why: typeof item.why === 'string' ? item.why : '',
        requiredAction: typeof item.requiredAction === 'string' ? item.requiredAction : 'Confirm this setup step.',
        nextAfter: typeof item.nextAfter === 'string' ? item.nextAfter : 'Autopilot will continue to the next setup step.',
        view: item.view as MarketingViewId,
        targetId: String(item.targetId),
        strategySection: item.strategySection,
        recordId: typeof item.recordId === 'string' ? item.recordId : undefined,
        expectedAction: item.expectedAction as AutopilotCompletionAction,
        status,
        completedRefId: typeof item.completedRefId === 'string' ? item.completedRefId : undefined,
      }
    })
    .filter((step): step is MarketingAutopilotStep => !!step)
  if (steps.length === 0) return null
  return normalizeAutopilotStepStatuses({
    id: String(record.id),
    title: typeof record.title === 'string' ? record.title : 'Marketing autopilot setup',
    currentStepId: typeof record.currentStepId === 'string' ? record.currentStepId : steps[0].id,
    coachOpen: Boolean(record.coachOpen),
    createdRefs: record.createdRefs && typeof record.createdRefs === 'object' ? record.createdRefs : undefined,
    steps,
  })
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
  const mode = record.mode === 'singleItem' || record.mode === 'plan' || record.mode === 'strategist' ? record.mode : null
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
    strategistMessages: normalizeStoredStrategistMessages(record.strategistMessages),
    strategistDirection: typeof record.strategistDirection === 'string' ? record.strategistDirection : '',
    strategistSuggestion: record.strategistSuggestion && typeof record.strategistSuggestion === 'object' ? record.strategistSuggestion : null,
    strategistAcceptedActionRefs: Array.isArray(record.strategistAcceptedActionRefs)
      ? record.strategistAcceptedActionRefs.filter((item): item is string => typeof item === 'string').slice(0, 24)
      : [],
    autopilotPlan: normalizeMarketingAutopilotPlan(record.autopilotPlan),
    result: record.result && typeof record.result === 'object' ? record.result : null,
    tutorialDemo: Boolean(record.tutorialDemo),
    ephemeral: Boolean(record.ephemeral),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  })
}

function normalizeStoredStrategistMessages(value: unknown): MarketingStrategistMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Partial<MarketingStrategistMessage>
      const content = typeof record.content === 'string' ? record.content.trim() : ''
      if (!content) return null
      return {
        id: typeof record.id === 'string' ? record.id : `strategist-message-${Date.now()}-${randomKey()}`,
        role: record.role === 'assistant' ? 'assistant' : 'user',
        content: content.slice(0, 1800),
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
      }
    })
    .filter((item): item is MarketingStrategistMessage => !!item)
    .slice(-30)
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
    strategistMessages: [],
    strategistDirection: '',
    strategistSuggestion: null,
    strategistAcceptedActionRefs: [],
    autopilotPlan: null,
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
    session.strategistSuggestion?.strategistChat?.primaryRecommendation?.title?.trim() ||
    session.strategistMessages.filter((message) => message.role === 'user').at(-1)?.content.trim().slice(0, 80) ||
    session.strategistDirection?.trim().slice(0, 80) ||
    session.questionnaire.topic?.trim() ||
    inferPromptTitle(session.strategyPrompt) ||
    (session.mode === 'strategist' ? 'New strategist chat' : session.mode === 'plan' ? 'New planning session' : 'New content item session')
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
      'Treat research projects as the planning wrapper; campaigns and funnels are setup drafts paired to that project.',
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
    ? `Latest research project: ${latestProject.title || 'Untitled research project'} with ${getResearchResultsForProject(data, latestProject._id).length} findings and ${countGeneratedRecordsForResearchProject(data, latestProject)} linked setup drafts.`
    : 'Latest research project: none. The next step may be creating the first research project.'

  return [
    'Act like a marketing strategist for designers. Review the current GoInvo marketing state and suggest the next setup step.',
    'Return a researchProject setup only when no usable current project exists. If a current project exists, explain the next action inside it instead of creating another project.',
    'Treat the research project as the planning wrapper. Campaigns, funnels, calendar items, and Quick Links are created as linked drafts after selected trusted findings justify them.',
    'Do not ask the designer to invent marketing strategy from scratch. Pick the best next move and make the fields or action reviewable.',
    'Make the long-term thinking obvious: why this work matters, how it builds a durable topic thread, and what signal should be checked next.',
    direction ? `User direction: ${direction}` : 'User direction: none. Choose the most useful next planning move from the current state.',
    `Current state: ${stats.contentRunwayDays} runway days, ${stats.upcomingItems.length} upcoming items, ${stats.activeCampaigns} active campaigns, ${data.channels.length} channels, ${data.linkItems.length} Quick Links.`,
    latestProjectLine,
    gaps.length > 0 ? `Known gaps: ${gaps.map((gap) => `${gap.title}: ${gap.action}`).join(' | ')}` : 'Known gaps: no critical gaps detected.',
  ].join('\n')
}

function buildStrategistChatDraft(
  data: MarketingData,
  session: DesignerWorkflowSession | null,
  questionnaire: MarketingPlanQuestionnaire,
): Record<string, unknown> {
  const stats = getMarketingDashboardStats(data)
  const latestProject = getLatestActiveResearchProject(data)
  const dashboardGaps = getMarketingDashboardGaps(data).slice(0, 6)
  return {
    title: questionnaire.topic,
    userDirection: session?.strategistDirection || session?.strategyPrompt || '',
    currentSession: session
      ? {
          mode: session.mode,
          title: session.title,
          hasAutopilotPlan: Boolean(session.autopilotPlan),
          autopilotCurrentStep: getCurrentAutopilotStep(session.autopilotPlan)?.title,
        }
      : null,
    dashboard: {
      contentRunwayDays: stats.contentRunwayDays,
      upcomingItems: stats.upcomingItems.length,
      activeCampaigns: stats.activeCampaigns,
      activeChannels: data.channels.filter((channel) => channel.status !== 'archived').length,
      quickLinks: data.linkItems.filter((link) => link.status !== 'archived').length,
      gaps: dashboardGaps.map((gap) => ({ title: gap.title, action: gap.action, severity: gap.severity })),
    },
    strategyFoundation: {
      audiences: data.audienceProfiles.map((item) => ({ title: item.title, priority: item.priority, audience: item.audience })).slice(0, 6),
      messages: data.messagePillars.map((item) => ({ title: item.title, coreClaim: item.coreClaim, topicCluster: item.topicCluster })).slice(0, 6),
      proof: data.proofPoints.map((item) => ({ title: item.title, claim: item.claim, confidence: item.confidence })).slice(0, 6),
      ctas: data.ctas.map((item) => ({ title: item.title, label: item.label, destination: item.destination, funnelStage: item.funnelStage })).slice(0, 6),
      trackingRules: data.trackingRules.map((item) => ({ title: item.title, status: item.status })).slice(0, 4),
      qualityGates: data.qualityGates.map((item) => ({ title: item.title, status: item.status, whenToUse: item.whenToUse })).slice(0, 4),
      experiments: data.experiments.map((item) => ({ title: item.title, status: item.status, hypothesis: item.hypothesis })).slice(0, 4),
    },
    research: {
      latestProject: latestProject
        ? {
            title: latestProject.title,
            status: latestProject.status,
            researchType: latestProject.researchType,
            resultCount: getResearchResultsForProject(data, latestProject._id).length,
            approvedResultCount: getResearchResultsForProject(data, latestProject._id).filter(isResearchResultApproved).length,
          }
        : null,
      approvedResults: data.researchResults.filter(isResearchResultApproved).map((result) => ({
        title: result.title,
        resultType: result.resultType,
        keyword: result.keyword,
        scoreSource: result.scoreSource,
        claim: result.claim,
      })).slice(0, 8),
    },
    destinations: [
      ...data.linkItems.filter((link) => link.status !== 'archived' && link.url).map((link) => ({ title: link.title, url: link.url, type: link.type })).slice(0, 8),
      ...data.ctas.filter((cta) => cta.destination).map((cta) => ({ title: cta.title || cta.label, url: cta.destination, type: 'cta' })).slice(0, 4),
    ],
    constraints: [
      'Do not auto-save CMS content.',
      'Reuse good enough existing records before suggesting new ones.',
      'Recommend small tests before courses, workshops, VSLs, or other high-effort assets unless proof, offer, destination, and measurement are strong.',
    ],
  }
}

function questionnaireFromStrategistSuggestion(
  suggestion: MarketingAiSuggestion,
  current: MarketingPlanQuestionnaire,
  data: MarketingData,
  actionKind: MarketingStrategistActionKind | string,
): MarketingPlanQuestionnaire {
  const recommendation = suggestion.strategistChat?.primaryRecommendation
  const setupPrompt = recommendation?.setupPrompt || recommendation?.summary || suggestion.summary || current.notes
  const topic = normalizeResearchProjectTopic(
    inferPromptTitle(setupPrompt || '') ||
      inferPromptTitle(recommendation?.title || '') ||
      recommendation?.title ||
      current.topic,
    current.topic || 'Marketing strategy test',
  )
  const destination =
    data.ctas.find((cta) => cta.destination)?.destination ||
    data.linkItems.find((link) => link.status !== 'archived' && link.url)?.url ||
    current.destinationUrl
  const audience =
    data.audienceProfiles.find((profile) => profile.priority === 'primary')?.audience ||
    data.audienceProfiles[0]?.audience ||
    current.audience
  const notes = [
    recommendation?.summary,
    setupPrompt,
    recommendation?.experimentHypothesis ? `Experiment: ${recommendation.experimentHypothesis}` : '',
    suggestion.rationale?.length ? `Strategist rationale: ${suggestion.rationale.slice(0, 3).join(' ')}` : '',
    actionKind === 'test' ? 'User chose to test this before committing to a larger marketing asset.' : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    topic,
    objective: inferStrategistObjective(recommendation?.opportunityType, current.objective),
    audience,
    destinationUrl: destination || current.destinationUrl,
    runway: current.runway || 'twoWeeks',
    contentCapacity: inferStrategistContentCapacity(recommendation?.opportunityType, actionKind),
    primaryMetric: inferStrategistPrimaryMetric(recommendation?.opportunityType, current.primaryMetric),
    notes: notes || current.notes,
  }
}

function strategistSuggestionToAutopilotSuggestion(
  suggestion: MarketingAiSuggestion,
  data: MarketingData,
  questionnaire: MarketingPlanQuestionnaire,
  actionKind: MarketingStrategistActionKind | string,
): MarketingAiSuggestion {
  const recommendation = suggestion.strategistChat?.primaryRecommendation
  const topic = normalizeResearchProjectTopic(questionnaire.topic, 'Marketing strategy test')
  const canonicalUrl = questionnaire.destinationUrl || data.linkItems.find((link) => link.status !== 'archived' && link.url)?.url || ''
  const startDate = toDateInputValue(addDays(new Date(), 7))
  const endDate = toDateInputValue(addDays(new Date(), 21))
  const seedKeywords = inferTargetQueries(`${topic} ${recommendation?.opportunityType || ''}`).slice(0, 8)
  const researchType = recommendation?.opportunityType === 'collaboration' ? 'strategy' : inferResearchProjectType(`${recommendation?.setupPrompt || ''} ${topic}`)
  const setupPrompt = recommendation?.setupPrompt || recommendation?.summary || suggestion.summary || `Research ${topic} before planning release records.`
  const contentFormat = recommendation?.opportunityType === 'videoSalesLetter'
    ? 'video'
    : recommendation?.opportunityType === 'course' || recommendation?.opportunityType === 'workshop'
      ? 'landingPage'
      : recommendation?.opportunityType === 'leadMagnet'
        ? 'quickLink'
        : 'carousel'

  return {
    summary: recommendation?.summary || suggestion.summary || `Set up ${topic} as a strategist-guided small test.`,
    rationale: [
      ...(recommendation?.rationale || []),
      ...(suggestion.rationale || []),
      actionKind === 'test' ? 'The designer accepted this as a small test, so Autopilot will create an experiment step before final scheduling.' : '',
    ].filter(Boolean).slice(0, 6),
    siteReferences: suggestion.siteReferences || [],
    strategistChat: suggestion.strategistChat,
    researchProject: {
      title: `${stripResearchProjectSuffix(topic)} research project`,
      status: 'draft',
      researchType,
      brief: setupPrompt,
      audience: questionnaire.audience,
      positioning: recommendation?.summary || `Use reviewed evidence to decide whether ${topic} is worth turning into a campaign.`,
      campaignObjective: questionnaire.objective,
      canonicalUrl,
      seedKeywords,
      seedUrls: [canonicalUrl, ...(suggestion.siteReferences || []).map((reference) => reference.url || '')].filter(Boolean).slice(0, 6),
      targetGeography: 'us',
      language: 'en',
      methods: recommendation?.opportunityType === 'collaboration'
        ? ['deskResearch', 'stakeholderInterview', 'sourceReview']
        : defaultResearchMethodsForType(researchType),
      researchQuestions: buildResearchQuestionsForType(researchType, topic),
      collaborators: recommendation?.opportunityType === 'collaboration'
        ? [
            {
              name: '',
              organization: '',
              relationshipType: 'universityIntern',
              topicArea: topic,
              contributionType: 'research',
              availabilityStart: startDate,
              availabilityEnd: endDate,
              expectedContribution: 'Help gather source material or shape one reviewed content opportunity.',
              status: 'idea',
            },
          ]
        : [],
      internalNotes: 'Created from a local strategist recommendation. Confirm each record before saving; no records were auto-saved.',
    },
    researchPlan: {
      title: `${stripResearchProjectSuffix(topic)} test plan`,
      status: 'draft',
      summary: recommendation?.summary || `Small test plan for ${topic}.`,
      audience: questionnaire.audience,
      positioning: recommendation?.summary || `Use ${topic} to test whether the audience wants a bigger follow-up asset.`,
      campaignObjective: questionnaire.objective,
      canonicalUrl,
      releaseCadence: 'campaignBased',
      seoTargets: seedKeywords.slice(0, 3).map((query, index) => ({
        query,
        intent: index === 0 ? 'learn' : 'compare',
        priority: index === 0 ? 'high' : 'medium',
        canonicalUrl,
        contentGap: 'Needs checked source proof before release records are created.',
        notes: 'Use for research, titles, captions, and alt text after scores are checked.',
      })),
      releaseWindows: [
        {
          label: 'Small test window',
          startDate,
          endDate,
          goal: recommendation?.recommendation === 'doNow' ? 'Confirm setup and ship the first useful asset.' : 'Test the promise before building a larger marketing asset.',
          priority: 'high',
        },
      ],
      contentOpportunities: [
        {
          title: topic,
          channel: recommendation?.opportunityType === 'emailNurture' ? 'email' : recommendation?.opportunityType === 'seoPillar' ? 'website' : 'instagram',
          format: contentFormat,
          owner: 'Designer',
          releaseWindow: 'Small test window',
          callToAction: data.ctas[0]?.label || 'Open the source',
          sourceMaterial: setupPrompt,
          destinationUrl: canonicalUrl,
          readiness: 'needsSource',
          seoQuery: seedKeywords[0] || '',
          priority: 'high',
          notes: recommendation?.experimentHypothesis || 'Trust useful findings before converting this opportunity.',
          selected: true,
        },
      ],
      measurementGoals: [
        {
          label: questionnaire.primaryMetric || 'Useful response',
          target: recommendation?.experimentHypothesis || 'The first small test produces enough signal to decide whether to continue.',
        },
      ],
      internalNotes: 'Strategist recommendation converted to a local Autopilot setup suggestion. Review research first.',
    },
  }
}

function inferStrategistObjective(opportunityType: string | undefined, fallback: string): string {
  if (opportunityType === 'course' || opportunityType === 'workshop' || opportunityType === 'videoSalesLetter' || opportunityType === 'productizedOffer') return 'qualifiedConversations'
  if (opportunityType === 'leadMagnet' || opportunityType === 'emailNurture') return 'audienceGrowth'
  if (opportunityType === 'seoPillar' || opportunityType === 'caseStudyPackage') return 'serviceInterest'
  return fallback || 'awareness'
}

function inferStrategistContentCapacity(opportunityType: string | undefined, actionKind: MarketingStrategistActionKind | string): MarketingPlanQuestionnaire['contentCapacity'] {
  if (actionKind === 'test') return 'oneItem'
  if (opportunityType === 'emailNurture' || opportunityType === 'caseStudyPackage') return 'multiChannel'
  if (opportunityType === 'collaboration' || opportunityType === 'seoPillar') return 'weeklyCarousel'
  return 'oneItem'
}

function inferStrategistPrimaryMetric(opportunityType: string | undefined, fallback: string) {
  if (opportunityType === 'course' || opportunityType === 'workshop' || opportunityType === 'videoSalesLetter') return 'Qualified replies or form starts'
  if (opportunityType === 'leadMagnet' || opportunityType === 'emailNurture') return 'Signups or saved contacts'
  if (opportunityType === 'seoPillar') return 'Useful visits from search or social'
  if (opportunityType === 'collaboration') return 'Contributor-ready content shipped on time'
  return fallback || 'Useful visits or replies'
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
      'The setup should collect SEO scores, source checks, and content gaps before campaign or funnel records are created.',
      'The campaign and funnel should stay paired to this plan once research has enough reviewed results.',
    ],
    siteReferences: [],
    researchProject: {
      title: `${stripResearchProjectSuffix(title)} research project`,
      status: 'draft',
      researchType,
      brief: `Research ${stripResearchProjectSuffix(title)} before generating campaigns, funnels, calendar items, or Quick Links. Focus first on SEO demand, source checks, and content gaps for the ${startDate} to ${endDate} release window.`,
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
      internalNotes: 'Rule-based fallback from Marketing Autopilot. Get evidence and trust useful findings before creating campaign, funnel, calendar, or Quick Link drafts.',
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

export function stripResearchProjectSuffix(value: string) {
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
  const selectedApprovedResults = approvedResults.filter((result) => isResearchResultSelectedForSynthesis(result, selectedIds))
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
      title: `Get evidence for ${topic}`,
      detail: runs.length > 0
        ? 'The latest research project ran, but no findings are ready yet. Get evidence again or inspect the run before making drafts.'
        : 'The latest research project exists. Next, gather SEO, CMS, and source findings before creating any campaign, funnel, calendar, or Quick Link drafts.',
      view: 'research',
      strategicContext,
      steps: [
        'Open Research and confirm the seed keywords, URLs, and collaborators.',
        'Get Semrush, CMS, and source checks for the current project.',
        'Review the findings before creating drafts.',
      ],
    }
  }

  if (approvedResults.length === 0) {
    return {
      title: `Choose trusted findings for ${topic}`,
      detail: `${projectResults.length} finding${projectResults.length === 1 ? ' is' : 's are'} stored, but none are trusted yet. Mark only the credible and relevant findings that should shape content.`,
      view: 'research',
      strategicContext,
      steps: [
        'Open Choose useful evidence for the latest project.',
        'Trust credible SEO, source, analytics, or collaborator findings.',
        'Select the trusted findings that should guide the drafts.',
      ],
    }
  }

  if (selectedApprovedResults.length === 0) {
    return {
      title: `Select the strongest evidence for ${topic}`,
      detail: `${approvedResults.length} trusted finding${approvedResults.length === 1 ? ' is' : 's are'} available. Select the ones that should justify the campaign, funnel, calendar, and Quick Link drafts.`,
      view: 'research',
      strategicContext,
      steps: [
        'Open the latest Research project.',
        'Select the trusted findings that support a real release.',
        'Use those selected items to create setup drafts.',
      ],
    }
  }

  if (generatedCount === 0) {
    return {
      title: `Create setup drafts for ${topic}`,
      detail: `${selectedApprovedResults.length} trusted finding${selectedApprovedResults.length === 1 ? ' is' : 's are'} selected. Now the research project is ready to create linked campaign, funnel, draft calendar, and Quick Link records.`,
      view: 'research',
      strategicContext,
      steps: [
        'Open the latest Research project.',
        'Create drafts from selected trusted findings.',
        'Review the campaign and funnel drafts before writing the content.',
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
      title: `Review the setup drafts for ${topic}`,
      detail: 'This research project has created setup drafts, but no calendar item is clearly draft or final. Check the Research links before adding more.',
    view: 'research',
    strategicContext,
      steps: [
        'Open the latest Research project.',
        'Confirm the campaign and funnel drafts still match the trusted findings.',
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
        detail: `${strategyResearchResults.length} finding${strategyResearchResults.length === 1 ? ' is' : 's are'} available. Use trusted findings to draft the missing ${missingStrategy.join(', ')} setup answers, then save only the drafts that feel right.`,
        view: 'strategy',
        strategicContext: [
          {
            title: 'Why research first',
            detail: 'Reusable strategy inputs should use evidence we have already gathered instead of asking designers to invent audiences, messages, proof, and CTAs from scratch.',
          },
          {
            title: 'How to use it',
            detail: 'Open Strategy, choose a missing question, add or select an answer, then use Draft from research to fill it from trusted findings.',
          },
          {
            title: 'Review standard',
            detail: approvedCount > 0 ? `${approvedCount} trusted finding${approvedCount === 1 ? ' is' : 's are'} ready to use as stronger source material.` : 'No findings are trusted yet, so treat the filled fields as a draft and trust the strongest credible findings when possible.',
          },
          {
            title: 'Designer impact',
            detail: 'Once saved, these strategy inputs can carry into campaigns, funnels, calendar items, Quick Links, and content drafts.',
          },
        ],
        steps: [
          'Open Strategy and choose Reusable inputs.',
          `Add or select a missing answer: ${missingStrategy.join(', ')}.`,
          'Click Draft from research, review the draft, then save it.',
        ],
      }
    }

    return {
      title: 'Start with research',
      detail: `Reusable setup answers are missing ${missingStrategy.join(', ')}, but there are no trusted findings to draw from yet. Create or run a Research project first, then use trusted findings to fill Strategy.`,
      view: 'research',
      strategicContext: [
        {
          title: 'Why research first',
          detail: 'Research gives reusable setup answers real evidence: SEO demand, source checks, content gaps, competitor examples, analytics signals, and collaborator notes.',
        },
        {
          title: 'Designer impact',
          detail: 'Designers should be able to fill Strategy from trusted findings, then focus on making the actual content.',
        },
        {
          title: 'Next move',
          detail: 'Open Research, define the project, get evidence, trust useful findings, then return to Strategy to fill the reusable answers.',
        },
        {
          title: 'Scope',
          detail: 'A small research project is enough. You only need the findings that justify the next audience, message, proof point, CTA, tracking rule, and quality gate.',
        },
      ],
      steps: [
        'Open Research from the top navigation.',
        'Create or get evidence for the topic.',
        'Trust the useful findings, then fill Strategy from those findings.',
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
      detail: 'The idea needs a publishing place before the calendar can offer the right formats.',
      view: 'channels',
      strategicContext,
      steps: [
        `Add or confirm ${channelKey} as a channel.`,
        'Create the first research project with that channel in mind.',
        'Get and review evidence before creating campaign and funnel drafts.',
      ],
    }
  }

  if (project || prompt.toLowerCase().includes('plan') || (plan?.contentOpportunities?.length || 0) > 1) {
    return {
      title: `Create the first research project for ${lowercaseGenericPlanningPhrase(recommendationTopic)}`,
      detail: 'No reusable research project exists yet. Start in Research; campaigns, funnels, calendar items, and Quick Links should be created from selected trusted findings after review.',
      view: 'research',
      strategicContext,
      steps: [
        'Create the first research project from this recommendation.',
        'Get Semrush/source checks and trust the findings worth using.',
        'Create campaign, funnel, calendar, and Quick Link drafts from selected trusted findings.',
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
        'Generate the calendar item and Quick Link only after findings are trusted.',
      ],
    }
  }

  return {
    title: 'Start in Research',
    detail: 'The next move is to create a Research project, then let trusted findings drive any campaign, funnel, calendar, or link drafts.',
    view: 'research',
    strategicContext,
    steps: [
      'Create the first research project.',
      'Get and review SEO/source checks.',
      'Create setup drafts only from selected trusted findings.',
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
      'Keep the calendar empty until someone gets evidence, trusts useful findings, and creates linked drafts from Research.',
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
    'Keep campaign, funnel, calendar, and Quick Link drafts uncreated until trusted findings are converted from Research.',
    hasAnalytics ? 'Include measurement context so the created drafts can connect to analytics later.' : 'Record what should be measured once an analytics source is connected.',
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
    brief: `Research ${topic} before generating a release plan. Use ${destinationUrl || sourceLabel} as the source context, then confirm SEO scores, source checks, and content gaps for the ${startDate} to ${endDate} window.`,
    audience: questionnaire.audience,
    goals: normalizeStringList([
      `Determine whether ${topic} is ready for an Instagram or multi-channel content runway.`,
      'Gather provider-backed keyword scores rather than using AI estimates as scores.',
      'Trust useful source findings before any campaign, funnel, calendar item, or Quick Link is created.',
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
    internalNotes: 'Created by Marketing Autopilot. Get evidence and trust useful findings before creating setup drafts.',
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
    summary: `Research-first planning scaffold for ${questionnaire.topic}. Review the audience, SEO targets, release window, and opportunities before creating campaign, funnel, calendar, or link drafts.`,
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
        implication: 'Create the initial content draft, then validate with engagement and click signals.',
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
    internalNotes: 'Created by the Designer Workflow research-first setup. Create linked campaign, funnel, calendar, and Quick Link drafts from selected Research opportunities when ready.',
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

export function getChannelByKey(channels: MarketingChannel[], key?: string) {
  if (!key) return undefined
  return channels.find((channel) => channel.key === key)
}

export function getContentTypeOptionsForChannel(channelKey: string | undefined, channels: MarketingChannel[]) {
  const channel = getChannelByKey(channels, channelKey)
  const channelTypes = (channel?.contentTypes || []).filter((type) => type.label || type.value)
  if (channelTypes.length === 0) return contentTypeOptions

  return channelTypes.map((type) => ({
    title: type.label || type.value || 'Untitled type',
    value: type.value || slugify(type.label || 'content-type'),
  }))
}

export function getCampaignCalendarCount(data: MarketingData, campaignId: string) {
  return data.calendarItems.filter((item) => item.campaign?._id === campaignId).length
}

export function getFunnelCampaignCount(data: MarketingData, funnelId: string) {
  return data.campaigns.filter((campaign) => (campaign.funnels || []).some((ref) => ref._id === funnelId)).length
}

export function getCampaignChannelKeys(campaign: MarketingCampaign) {
  return Array.from(
    new Set([
      ...(campaign.channels || []),
      ...((campaign.channelRefs || []).map((channel) => channel.key).filter(Boolean) as string[]),
    ]),
  )
}

export function labelFor(options: SelectOption[], value?: string) {
  return options.find((option) => option.value === value)?.title || value || ''
}

export function emptyKeys(record: Record<string, unknown>) {
  return Object.keys(record).filter((key) => record[key] === undefined || record[key] === '')
}

export function nextLinkOrder(items: MarketingLinkItem[]) {
  const highest = items.reduce((max, item) => Math.max(max, item.order || 0), 0)
  return highest + 10
}

export function trimDescription(value?: string) {
  const trimmed = (value || '').replace(/\s+/g, ' ').trim()
  if (!trimmed) return undefined
  return trimmed.length > 150 ? `${trimmed.slice(0, 147)}...` : trimmed
}

export function calendarContentTypeToLinkType(contentType?: string) {
  if (contentType === 'caseStudy') return 'caseStudy'
  if (['article', 'newsletter', 'socialPost', 'carousel', 'reel', 'post', 'video'].includes(contentType || '')) return 'article'
  if (contentType === 'event') return 'event'
  if (contentType === 'landingPage') return 'site'
  return 'other'
}

export function normalizeSuccessMetrics(metrics: Array<{ _key?: string; label?: string; target?: string; source?: RefSummary | ReferenceValue }>): SuccessMetric[] {
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

export function normalizeFunnelStages(stages: Array<Omit<FunnelStage, '_key' | '_type'> | FunnelStage>): FunnelStage[] {
  return stages.map((stage): FunnelStage => ({
    ...stage,
    _key: '_key' in stage && stage._key ? stage._key : randomKey(),
    _type: 'funnelStage',
  }))
}

export function normalizeStringList(items: string[]) {
  return Array.from(new Set((items || []).map((item) => item.trim()).filter(Boolean)))
}

export function advancedEditHref(type: string, id: string) {
  return `/studio/content/intent/edit/id=${encodeURIComponent(id)};type=${encodeURIComponent(type)}`
}

export function formatDateOnly(value?: string | Date) {
  const dateOnly = toDateInputValue(value)
  if (!dateOnly) return ''
  const [year, month, day] = dateOnly.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function dateRange(start?: string, end?: string) {
  if (start && end) return `${start} to ${end}`
  return start || end || ''
}

export function formatDateTime(value?: string) {
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

export function buildCalendarCells(month: Date) {
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

export function groupCalendarItemsByDay(items: MarketingCalendarItem[]) {
  const map = new Map<string, MarketingCalendarItem[]>()
  items.forEach((item) => {
    if (!item.publishAt) return
    const key = toDateInputValue(item.publishAt)
    map.set(key, [...(map.get(key) || []), item])
  })
  return map
}

export function getCalendarItemDisplayGroup(item: Pick<MarketingCalendarItem, 'status'>): SavedCalendarDisplayGroup {
  return ['scheduled', 'published'].includes(item.status || '') ? 'final' : 'draft'
}

export function getCalendarGroupLabel(group: CalendarDisplayGroup) {
  if (group === 'preview') return 'Preview'
  if (group === 'final') return 'Final'
  return 'Draft'
}

export function getCalendarItemsByDisplayGroup(items: MarketingCalendarItem[]) {
  const grouped = items.map((item) => ({ item, group: getCalendarItemDisplayGroup(item) }))
  return [
    ...grouped.filter((record) => record.group === 'final'),
    ...grouped.filter((record) => record.group === 'draft'),
  ]
}

export function getSavedCalendarGroups(items: MarketingCalendarItem[]) {
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
