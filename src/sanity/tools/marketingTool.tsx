import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react'
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
  RefreshIcon,
  RocketIcon,
  SearchIcon,
  UsersIcon,
} from '@sanity/icons'
import { analyticsStatusOptions } from '../schemas/marketingAnalyticsSource'
import { calendarStatusOptions, contentTypeOptions } from '../schemas/marketingCalendarItem'
import { campaignObjectiveOptions, campaignStatusOptions } from '../schemas/marketingCampaign'
import { channelStatusOptions } from '../schemas/marketingChannel'
import { funnelStatusOptions } from '../schemas/marketingFunnel'
import { GuidedTutorialOverlay } from '../components/GuidedTutorialOverlay'
import { SeoWorkspace } from '../components/SeoWorkspace'
import { StrategyBriefWorkspace } from '../components/StrategyBriefWorkspace'
import { AbTestingWorkspace } from '../components/marketing/AbTestingWorkspace'
import { AnalyticsWorkspace } from '../components/marketing/AnalyticsWorkspace'
import { MarketingAiModelSetting } from '../components/marketing/MarketingAiModelSetting'
import { MarketingBrandVoiceSetting } from '../components/marketing/MarketingBrandVoiceSetting'
import { BrandVoiceLearningReview } from '../components/marketing/BrandVoiceLearningReview'
import { authenticatedMarketingRequest } from '../components/marketing/authenticatedMarketingRequest'
import { MarketingFinancialPostureSetting } from '../components/marketing/MarketingFinancialPostureSetting'
import { CalendarWorkspace } from '../components/marketing/CalendarWorkspace'
import { CampaignWorkspace } from '../components/marketing/CampaignWorkspace'
import { ChannelWorkspace } from '../components/marketing/ChannelWorkspace'
import { OutreachWorkspace, OutreachEvidenceWorkspace } from '../components/marketing/OutreachWorkspace'
import { FunnelWorkspace } from '../components/marketing/FunnelWorkspace'
import { LinkTreeWorkspace } from '../components/marketing/LinkTreeWorkspace'
import { ResearchWorkspace } from '../components/marketing/ResearchWorkspace'
import { StrategyWorkspace } from '../components/marketing/StrategyWorkspace'
import { TemplateWorkspace } from '../components/marketing/TemplateWorkspace'
import type {
  ChannelContentType,
  WorkflowTerm,
} from '../components/marketing/types'
import {
  defaultDesignerWorkflowTutorial,
  getDesignerWorkflowTutorial,
} from '../tutorials/designerWorkflowTutorials'
import {
  hasPricedOffer,
  slugify,
  randomKey,
} from '@/lib/marketing'
import {
  normalizeMarketingBrandVoices,
  type MarketingBrandVoice,
} from '@/lib/marketing/brandVoice'
import {
  hasMaterialVoiceEdit,
  type BrandVoiceLearningProposal,
  type BrandVoiceLearningSelection,
} from '@/lib/marketing/brandVoiceLearning'
import {
  OUTREACH_DATASET,
  type OutreachChannelOverride,
} from '@/lib/marketing/outreachEnums'
import {
  DEFAULT_FINANCIAL_POSTURE_ID,
  type FinancialPostureId,
} from '@/lib/marketing/financialPosture'

import {
  MARKETING_SURFACES,
  MARKETING_TOOL_VIEWS,
  advancedEditHref,
  applyAutopilotCompletion,
  autopilotPlanFingerprint,
  autopilotTargetForStep,
  buildAnalyticsInterpretations,
  buildCarouselFramePlan,
  buildDesignerWorkflowDemoRecommendation,
  buildDesignerWorkflowDemoResult,
  buildFallbackWizardStrategySuggestion,
  buildMarketingAssistantActions,
  buildMarketingAutopilotPlan,
  buildStrategistChatDraft,
  buildWizardStrategyDraft,
  buildWizardStrategyPrompt,
  createDesignerWorkflowSession,
  defaultMarketingPlanQuestionnaire,
  filterMarketingAssistantActions,
  formatDashboardDate,
  formatWorkflowSessionTime,
  generateInstagramCarouselSetup,
  generateQuestionnaireMarketingPlan,
  getAiSuggestedFieldLabels,
  getAiSuggestionSection,
  getAnalyticsReadinessStats,
  getAutopilotCurrentIndex,
  getCampaignChannelKeys,
  getChannelOptions,
  getCurrentAutopilotStep,
  getDashboardGapTone,
  getLatestActiveResearchProject,
  getMarketingDashboardGaps,
  getMarketingDashboardStats,
  getMarketingSurfaceForView,
  getMarketingViewTabLabel,
  getStatusColor,
  getStrategyAssistantRecommendation,
  getWizardCreationSummary,
  hasDesignerWorkflowTutorialBeenSeen,
  hasDesignerWorkflowTutorialCompleted,
  labelFor,
  loadActiveDesignerWorkflowSessionId,
  loadDesignerWorkflowSessions,
  markDesignerWorkflowTutorialComplete,
  markDesignerWorkflowTutorialSeen,
  normalizeAutopilotStepStatuses,
  normalizeMarketingPlanQuestionnaire,
  prepareDesignerWorkflowSession,
  questionnaireFromStrategistSuggestion,
  questionnaireFromStrategySuggestion,
  refreshMarketingAutopilotPlan,
  saveActiveDesignerWorkflowSessionId,
  saveDesignerWorkflowSessions,
  setAutopilotCoachOpen,
  strategistSuggestionToAutopilotSuggestion,
  type MarketingSurface,
  type StrategySectionConfig,
} from '../components/marketing/domain'
export * from '../components/marketing/domain'

type CSSPropertiesWithVariables = CSSProperties & Record<`--${string}`, string | number>

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
    /* clip (not hidden): hidden creates a scroll container that breaks position:sticky
       Save bars in the workspace editors; clip gives the same horizontal clipping without one. */
    overflow-x: clip;
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

  [data-marketing-tool] button:focus-visible,
  [data-marketing-tool] a:focus-visible,
  [data-marketing-tool] input:focus-visible,
  [data-marketing-tool] select:focus-visible,
  [data-marketing-tool] textarea:focus-visible {
    outline: 2px solid #4dc4d6;
    outline-offset: 2px;
  }

  [data-marketing-tool] [data-marketing-subtabs="true"] {
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

    [data-marketing-tool] [data-mobile-tap-target="true"] {
      min-width: 24px !important;
      min-height: 24px !important;
    }

    [data-marketing-tool] [data-ab-summary-cell="true"] {
      border-right: none !important;
      border-bottom: 1px solid var(--card-border-color);
    }

    [data-marketing-tool] [data-ab-summary-cell="true"][data-last="true"] {
      border-bottom: none;
    }

    [data-marketing-tool] [data-marketing-subtabs="true"] {
      flex-wrap: nowrap !important;
      overflow-x: auto !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-gutter: stable;
    }

    [data-marketing-tool] [data-marketing-subtab="true"] {
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
const MARKETING_ACTIVE_VIEW_STORAGE_KEY = 'goinvo.marketing.activeView.v1'
// Deep-link query param: /studio/marketing?view=<viewId|surfaceId> opens that
// tab regardless of the recipient's last-stored view — so a link one teammate
// sends another lands where intended (e.g. ?view=outreach).
const MARKETING_VIEW_QUERY_PARAM = 'view'
export const MARKETING_TUTORIAL_QUERY_PARAM = 'designerWorkflowTutorial'
const MARKETING_TUTORIAL_HANDOFF_STORAGE_KEY = 'goinvo.marketing.autopilot.tutorialHandoff.v1'
const MARKETING_TUTORIAL_HANDOFF_TTL_MS = 30_000
const MARKETING_TUTORIAL_HANDOFF_SETTLE_MS = 1_200
const MARKETING_ACTIVE_ROLE_STORAGE_KEY = 'goinvo.marketing.activeRole.v1'
// Deep-link query param: /studio/marketing?role=<principal|coworker> tailors the
// Autopilot guided flow to the reader — so a principal can be handed a link that
// opens the warm-network outreach path. A suggestion, not identity: nothing
// sensitive gates on it.
const MARKETING_ROLE_QUERY_PARAM = 'role'
const MARKETING_AUTOPILOT_TARGET_STORAGE_KEY = 'goinvo.marketing.autopilotTarget.v1'
const STRATEGY_WORKING_DRAFTS_STORAGE_KEY = 'goinvo.marketing.strategyWorkingDrafts.v1'

// One dereferenced analyticsSource projection, shared by the calendar + experiments
// queries so they can't drift. The A/B dashboard reads dashboardUrl / vercelProject /
// lastSyncedAt off this — the experiments query used to omit them, silently hiding
// the "Open Vercel dashboard" link and the "synced …" line. Keep in sync with the
// fields consumers read (getAbTestingDashboardUrl / getAbTestingVercelSource).
const ANALYTICS_SOURCE_PROJECTION = `analyticsSource->{_id, title, provider, status, propertyId, measurementId, containerId, vercelProject, vercelProjectId, vercelTeamSlug, productionUrl, lastSyncedAt, dashboardUrl, reportingCadence, targetSites[]{_key, label, url}, keyMetrics[]{_key, label, definition}}`

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
    draftFrames[]{_key, title, body, visualDirection, altText, image},
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
    autoPublish,
    publishState,
    publishError,
    "owner": owner->{_id, "title": name},
    "campaign": campaign->{_id, title, status},
    "funnel": funnel->{_id, title, status},
    "analyticsSource": ${ANALYTICS_SOURCE_PROJECTION},
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
    stages[]{_key, _type, stage, goal, offer, callToAction, destinationUrl, content, metrics},
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
    measurementStart,
    variants[]{_key, key, label, notes, previewUrl},
    primaryMetric,
    trackedMetrics[]{_key, key, label, role, comparison, source, eventName, unit, notes},
    successTrackers[]{_key, title, trackerType, metricKeys, condition, threshold, successWhen, notes},
    "analyticsSource": ${ANALYTICS_SOURCE_PROJECTION},
    qaNotes,
    rolloutStart,
    rolloutEnd,
    vercelDashboardUrl,
    "campaign": campaign->{_id, title, status},
    "calendarItem": calendarItem->{_id, title, status, publishAt},
    "performanceSignals": performanceSignals[]->{_id, title, provider, status, signalType, "experiment": experiment->{_id, title, status}, metricDate, periodStart, periodEnd, metrics[]{_key, label, value, unit, change, variantKey, eventName}, variantEngagement[]{_key, variantKey, sessions, bounceRate, averageSessionDuration}, interpretation, recommendation},
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
    "experiment": experiment->{_id, title, status},
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
    contentTypes[]{_key, label, value, description},
    recommendedPostingTimes[]{_key, dayOfWeek, time, timezone, label, contentType, confidence}
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
  },
  "teamMembers": *[_type == "teamMember" && coalesce(isAlumni, false) != true]|order(name asc) {
    _id,
    "title": name
  }
}`

export type StudioClient = ReturnType<typeof useClient>
export type MarketingDocumentInput = { _type: string } & Record<string, unknown>

export type MarketingViewId =
  | 'dashboard'
  | 'strategy'
  | 'strategyBrief'
  | 'abTesting'
  | 'research'
  | 'outreach'
  | 'workEvidence'
  | 'calendar'
  | 'campaigns'
  | 'funnels'
  | 'templates'
  | 'channels'
  | 'analytics'
  | 'linkTree'
  | 'seo'
export type MarketingViewOpener = (view: MarketingViewId) => boolean | void

export const MARKETING_GUIDE_ARTICLE_BY_VIEW: Record<MarketingViewId, string> = {
  dashboard: 'marketing.dashboard',
  strategy: 'marketing.strategy',
  strategyBrief: 'marketing.strategy-brief',
  abTesting: 'marketing.measure',
  research: 'marketing.research',
  outreach: 'marketing.outreach',
  workEvidence: 'marketing.evidence',
  calendar: 'marketing.calendar',
  campaigns: 'marketing.campaigns',
  funnels: 'marketing.funnels',
  templates: 'marketing.templates',
  channels: 'marketing.channels',
  analytics: 'marketing.analytics',
  linkTree: 'marketing.quick-links',
  seo: 'marketing.seo',
}
export type MarketingAssistKind =
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
  hasUnsavedChange: (id: string) => boolean
  markUnsavedChange: (id?: string, label?: string) => void
  clearUnsavedChanges: (id?: string) => void
  confirmDiscardUnsavedChange: (id: string, message?: string) => boolean
  confirmDiscardUnsavedChanges: (message?: string) => boolean
}

const MarketingUnsavedChangesContext = createContext<MarketingUnsavedChangesContextValue>({
  hasUnsavedChanges: false,
  hasUnsavedChange: () => false,
  markUnsavedChange: () => undefined,
  clearUnsavedChanges: () => undefined,
  confirmDiscardUnsavedChange: () => true,
  confirmDiscardUnsavedChanges: () => true,
})

export function useMarketingUnsavedGuard() {
  return useContext(MarketingUnsavedChangesContext)
}

export function shouldGuardMarketingNavigationClick({
  href,
  target,
  download,
  button,
  metaKey,
  ctrlKey,
  shiftKey,
  altKey,
}: {
  href: string
  target?: string
  download?: boolean
  button: number
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}) {
  if (button !== 0 || metaKey || ctrlKey || shiftKey || altKey) return false
  return Boolean(href && !href.startsWith('#') && target !== '_blank' && !download)
}

function isMarketingViewId(value: unknown): value is MarketingViewId {
  return typeof value === 'string' && MARKETING_TOOL_VIEWS.some((view) => view.id === value)
}

function loadStoredMarketingView(fallback: MarketingViewId = 'dashboard'): MarketingViewId {
  if (typeof window === 'undefined') return fallback
  const storedView = window.localStorage.getItem(MARKETING_ACTIVE_VIEW_STORAGE_KEY)
  return isMarketingViewId(storedView) ? storedView : fallback
}

// Resolve a `?view=` param value to a MarketingViewId. Accepts a view id
// directly (e.g. "outreach", "workEvidence") OR a surface id (e.g. "plan" →
// its landing view), so both a precise tab link and a friendlier section link
// work. Returns null when absent/unrecognized. Pure (no DOM) so it's unit-tested.
export function resolveMarketingViewParam(param: string | null | undefined): MarketingViewId | null {
  if (!param) return null
  if (isMarketingViewId(param)) return param
  const surface = MARKETING_SURFACES.find((candidate) => candidate.id === param)
  return surface ? surface.landingView : null
}

// The view requested by the current URL's ?view= param, if any. This is what
// makes a shared link land on the right tab; it takes precedence over the
// recipient's last-stored view.
function viewFromLocation(): MarketingViewId | null {
  if (typeof window === 'undefined') return null
  return resolveMarketingViewParam(new URLSearchParams(window.location.search).get(MARKETING_VIEW_QUERY_PARAM))
}

// Reflect the active view in the URL (?view=…) WITHOUT a history entry, so a
// user can copy the address bar mid-session and share the exact tab. Preserves
// other query params; no-ops silently if the embedding router disallows it
// (localStorage still remembers the view, so navigation is unaffected).
function syncViewToUrl(view: MarketingViewId) {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get(MARKETING_VIEW_QUERY_PARAM) === view) return
    url.searchParams.set(MARKETING_VIEW_QUERY_PARAM, view)
    window.history.replaceState(window.history.state, '', url.toString())
  } catch {
    // Router owns the URL — fall back to localStorage-only persistence.
  }
}

function saveStoredMarketingView(view: MarketingViewId) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MARKETING_ACTIVE_VIEW_STORAGE_KEY, view)
}

// Reader role. `principal` (boss/founder) gets a warm-network outreach-first
// guided flow; `coworker` (default — designer/teammate) gets today's content
// pipeline. Kept deliberately tiny; extend only when a real third role appears.
export const MARKETING_ROLES = ['coworker', 'principal'] as const
export type MarketingRole = (typeof MARKETING_ROLES)[number]

export function isMarketingRole(value: unknown): value is MarketingRole {
  return typeof value === 'string' && (MARKETING_ROLES as readonly string[]).includes(value)
}

// Resolve a `?role=` param to a MarketingRole. Pure (no DOM) so it's unit-tested,
// mirroring resolveMarketingViewParam.
export function resolveMarketingRoleParam(param: string | null | undefined): MarketingRole | null {
  return isMarketingRole(param) ? param : null
}

export function marketingUrlWithoutTutorialParam(currentUrl: string) {
  const url = new URL(currentUrl)
  url.searchParams.delete(MARKETING_TUTORIAL_QUERY_PARAM)
  return url.toString()
}

export type MarketingTutorialHandoff = {
  token: string
  tutorialId: string
  demoRecommendation: boolean
  createdAt: number
  acknowledgedAt?: number
}

let volatileMarketingTutorialHandoff: MarketingTutorialHandoff | null = null

export function createMarketingTutorialHandoff(
  tutorialId: string,
  demoRecommendation: boolean,
  createdAt = Date.now(),
  token = createMarketingTutorialHandoffToken(),
): MarketingTutorialHandoff {
  return { token, tutorialId, demoRecommendation, createdAt }
}

export function parseMarketingTutorialHandoff(value: unknown, now = Date.now()): MarketingTutorialHandoff | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const candidate = parsed as Partial<MarketingTutorialHandoff>
    if (
      typeof candidate.token !== 'string' || !candidate.token ||
      typeof candidate.tutorialId !== 'string' || !candidate.tutorialId ||
      typeof candidate.demoRecommendation !== 'boolean' ||
      typeof candidate.createdAt !== 'number' || !Number.isFinite(candidate.createdAt)
    ) return null
    const age = now - candidate.createdAt
    if (age < -5_000 || age > MARKETING_TUTORIAL_HANDOFF_TTL_MS) return null
    if (candidate.acknowledgedAt !== undefined && (
      typeof candidate.acknowledgedAt !== 'number' || !Number.isFinite(candidate.acknowledgedAt)
    )) return null
    return {
      token: candidate.token,
      tutorialId: candidate.tutorialId,
      demoRecommendation: candidate.demoRecommendation,
      createdAt: candidate.createdAt,
      acknowledgedAt: candidate.acknowledgedAt,
    }
  } catch {
    return null
  }
}

export function acknowledgeMarketingTutorialHandoff(
  handoff: MarketingTutorialHandoff,
  acknowledgedAt = Date.now(),
): MarketingTutorialHandoff {
  return { ...handoff, acknowledgedAt }
}

export function shouldClearMarketingTutorialHandoff(
  current: MarketingTutorialHandoff | null,
  token: string,
  acknowledgedAt: number,
) {
  return current?.token === token && current.acknowledgedAt === acknowledgedAt
}

function createMarketingTutorialHandoffToken() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function loadStoredMarketingTutorialHandoff() {
  if (typeof window === 'undefined') return null
  let stored: MarketingTutorialHandoff | null = null
  try {
    const raw = window.sessionStorage.getItem(MARKETING_TUTORIAL_HANDOFF_STORAGE_KEY)
    stored = parseMarketingTutorialHandoff(raw)
    if (raw && !stored) window.sessionStorage.removeItem(MARKETING_TUTORIAL_HANDOFF_STORAGE_KEY)
  } catch {
    // Some privacy modes disable sessionStorage. The module-level fallback still
    // survives the Studio's in-place route remount.
  }
  const volatile = parseMarketingTutorialHandoff(volatileMarketingTutorialHandoff)
  return stored || volatile
}

function saveMarketingTutorialHandoff(handoff: MarketingTutorialHandoff) {
  volatileMarketingTutorialHandoff = handoff
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(MARKETING_TUTORIAL_HANDOFF_STORAGE_KEY, JSON.stringify(handoff))
  } catch {
    // The module-level fallback above is enough for an in-place Studio remount.
  }
}

function clearMarketingTutorialHandoff(token: string) {
  if (volatileMarketingTutorialHandoff?.token === token) volatileMarketingTutorialHandoff = null
  if (typeof window === 'undefined') return
  try {
    const stored = parseMarketingTutorialHandoff(window.sessionStorage.getItem(MARKETING_TUTORIAL_HANDOFF_STORAGE_KEY))
    if (stored?.token === token) window.sessionStorage.removeItem(MARKETING_TUTORIAL_HANDOFF_STORAGE_KEY)
  } catch {
    // No sessionStorage cleanup is needed when storage is unavailable.
  }
}

function acknowledgeStoredMarketingTutorialHandoff(token: string) {
  const current = loadStoredMarketingTutorialHandoff()
  if (!current || current.token !== token) return
  const acknowledged = acknowledgeMarketingTutorialHandoff(current)
  saveMarketingTutorialHandoff(acknowledged)
  window.setTimeout(() => {
    const latest = loadStoredMarketingTutorialHandoff()
    if (shouldClearMarketingTutorialHandoff(latest, token, acknowledged.acknowledgedAt!)) {
      clearMarketingTutorialHandoff(token)
    }
  }, MARKETING_TUTORIAL_HANDOFF_SETTLE_MS)
}

export function buildMarketingShareUrl(currentUrl: string, view: MarketingViewId, role: MarketingRole) {
  const url = new URL(currentUrl)
  url.searchParams.set(MARKETING_VIEW_QUERY_PARAM, view)
  url.searchParams.delete(MARKETING_TUTORIAL_QUERY_PARAM)
  if (role === 'coworker') url.searchParams.delete(MARKETING_ROLE_QUERY_PARAM)
  else url.searchParams.set(MARKETING_ROLE_QUERY_PARAM, role)
  return url.toString()
}

// The role requested by the current URL's ?role= param, if any (wins over the
// recipient's stored role, so a sent link tailors their experience).
function roleFromLocation(): MarketingRole | null {
  if (typeof window === 'undefined') return null
  return resolveMarketingRoleParam(new URLSearchParams(window.location.search).get(MARKETING_ROLE_QUERY_PARAM))
}

function loadStoredMarketingRole(): MarketingRole {
  if (typeof window === 'undefined') return 'coworker'
  const stored = window.localStorage.getItem(MARKETING_ACTIVE_ROLE_STORAGE_KEY)
  return isMarketingRole(stored) ? stored : 'coworker'
}

function saveStoredMarketingRole(role: MarketingRole) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MARKETING_ACTIVE_ROLE_STORAGE_KEY, role)
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

// Header map that authenticates a Studio→/api/marketing request as the logged-in
// Studio user (so auth-gated routes like /assist accept it). Empty when no token.
export function studioSessionHeader(): Record<string, string> {
  const token = studioSessionToken()
  return token ? { 'x-sanity-session': token } : {}
}

export interface RefSummary {
  _id: string
  title?: string
  status?: string
  provider?: string
}

export type ReferenceValue = { _type: 'reference'; _ref: string }
export type SuccessMetric = { _key?: string; _type?: 'successMetric'; label?: string; target?: string; source?: RefSummary | ReferenceValue }

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
  recommendedPostingTimes?: Array<{
    _key?: string
    dayOfWeek?: string
    time?: string
    timezone?: string
    label?: string
    contentType?: string
    confidence?: string
  }>
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
  autoPublish?: boolean
  publishState?: string
  publishError?: string
  owner?: RefSummary
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

export type DraftContentFrame = {
  _key?: string
  title?: string
  body?: string
  visualDirection?: string
  altText?: string
  image?: Record<string, unknown>
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
  content?: Array<{ _key?: string; _type?: 'reference'; _ref?: string }>
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
  targetSites?: Array<{ _key?: string; _type?: 'targetSite'; label?: string; url?: string }>
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
  measurementStart?: string
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
  experiment?: RefSummary
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
      _ref?: string
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

export interface ResearchContentPillar {
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

export interface ResearchEvidenceNote {
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

export interface ResearchAssumption {
  _key?: string
  _type?: 'researchAssumption'
  assumption?: string
  risk?: string
  validationSignal?: string
  confidence?: string
}

export interface ResearchSeoTarget {
  _key?: string
  _type?: 'seoTarget'
  query?: string
  intent?: string
  priority?: string
  canonicalUrl?: string
  contentGap?: string
  notes?: string
}

export interface ResearchRecommendedChannel {
  _key?: string
  _type?: 'recommendedChannel'
  channelKey?: string
  rationale?: string
  cadence?: string
  priority?: string
}

export interface ResearchCollaboration {
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

export interface ResearchReleaseWindow {
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

export interface ResearchMeasurementGoal {
  _key?: string
  _type?: 'measurementGoal'
  label?: string
  target?: string
  source?: RefSummary | ReferenceValue
}

export interface ResearchStrategyAdjustment {
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

export interface ResearchProjectCollaborator {
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

export interface MarketingContact {
  _id: string
  _rev?: string
  _updatedAt?: string
  name?: string
  organization?: string
  role?: string
  segment?: string
  owner?: string
  brandVoiceKey?: string
  warmth?: string
  status?: string
  email?: string
  phone?: string
  linkedinUrl?: string
  howWeKnow?: string
  sourceNotes?: string
  researchedAt?: string
  researchReviewedAt?: string
  researchSummary?: string
  personVerified?: boolean
  identityConfidence?: string
  opportunities?: Array<{ _key?: string; offerKey?: string; headline?: string; rationale?: string }>
  relevantEvidence?: Array<{ _key?: string; evidenceId: string; title?: string; why?: string }>
  proposedOffers?: Array<{
    _key?: string
    title: string
    oneLiner?: string
    priceBand?: string
    rationale?: string
    evidenceIds?: string[]
    chosen?: boolean
  }>
  feasibilityScore?: number | null
  feasibilityReasoning?: string
  suggestedOfferKey?: string
  suggestedOpener?: string
  callBrief?: string
  researchModel?: string
  researchBrandVoiceKey?: string
  researchBrandVoiceName?: string
  researchSources?: Array<{ _key?: string; title?: string; url?: string }>
  /** Human exceptions to auto channel advice; missing entries remain automatic. */
  channelOverrides?: OutreachChannelOverride[]
  lastContactedAt?: string
  followUpAt?: string
  nextStep?: string
  outcomeNotes?: string
  intelGathered?: string
  estimatedValue?: number
  closedValue?: number
  currency?: string
  attributionChannel?: string
  attributedOfferKey?: string
  attributedOfferTitle?: string
  attributedEvidenceIds?: string[]
  closedAt?: string
  closeReason?: string
  interactions?: Array<{
    _key?: string
    at?: string
    by?: string
    outcome?: string
    intel?: string
    nextStep?: string
    statusAfter?: string
    channel?: string
    offerKey?: string
    offerTitle?: string
    evidenceIds?: string[]
    value?: number
  }>
}

export interface MarketingOffer {
  _id: string
  _rev?: string
  _updatedAt?: string
  title?: string
  key?: string
  status?: string
  oneLiner?: string
  description?: string
  priceBand?: string
  idealBuyer?: string
  proofPoints?: string
  order?: number
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
  teamMembers?: RefSummary[]
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

export type MarketingStrategistActionKind = 'test' | 'saveForLater' | 'followUp' | 'useForSetup'

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

export type MarketingStrategistMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  /** True for AI replies, false for rule-based fallbacks, absent for local or legacy messages. */
  usedAi?: boolean
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
  aiError?: string | null
  context?: {
    features?: number
    caseStudies?: number
    campaigns?: number
    analyticsTakeaways?: number
    brandVoice?: { key: string; name: string; selection: 'requested' | 'default' | 'firstActive' } | null
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
  severity: 'urgent' | 'setup' | 'content' | 'measurement'
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

export type ExperimentTrackedMetric = NonNullable<MarketingExperiment['trackedMetrics']>[number]
export type ExperimentSuccessTracker = NonNullable<MarketingExperiment['successTrackers']>[number]
export type PerformanceSignalMetric = NonNullable<MarketingPerformanceSignal['metrics']>[number]
export type AbTestingMetricOutcome = 'positive' | 'negative' | 'neutral'

export type AbTestingMetricEvidence = {
  experiment: MarketingExperiment
  tracker: ExperimentSuccessTracker
  trackedMetric: ExperimentTrackedMetric
  signal: MarketingPerformanceSignal
  signalMetric: PerformanceSignalMetric
  outcome: AbTestingMetricOutcome
  changeValue: number | null
}

export type AbTestingSignalMetricRecord = {
  signal: MarketingPerformanceSignal
  metric: PerformanceSignalMetric
}

export type AbTestingComparisonStatus = 'variant' | 'control' | 'even' | 'needsComparison'

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

export type AbTestingComparisonScoreboard = {
  controlLabel: string
  variantLabel: string
  controlWins: number
  variantWins: number
  evenCount: number
  pendingCount: number
  total: number
}

export type AbTestingVariantOption = {
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

export type AbTestingVariantEventRow = {
  key: string
  label: string
  role?: string
  comparison?: string
  isExposure?: boolean
  cells: AbTestingVariantEventCell[]
}

export type MarketingDashboardGap = {
  id: string
  title: string
  why: string
  action: string
  view: MarketingViewId
  severity: MarketingAttentionItem['severity'] | AnalyticsInterpretationSeverity
  affected?: string[]
}

export type CarouselWizardResult = {
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

export type DesignerWizardMode = 'singleItem' | 'plan' | 'strategist'
type AutopilotInteractionMode = 'highlight' | 'chat'

export type AutopilotStepStatus = 'done' | 'current' | 'upcoming' | 'blocked'
export type AutopilotCompletionAction =
  | 'research:createProject'
  | 'research:run'
  | 'research:approve'
  | 'research:generateRecords'
  | `strategy:save:${StrategyAssetKind}`
  | 'calendar:createDraft'
  | 'calendar:saveDraft'
  | 'link:save'
  | 'outreach:preflight'
  | 'outreach:addContacts'
  | 'outreach:research'
  | 'outreach:review'
  | 'outreach:call'
  | 'outreach:log'

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
    console.error('Autopilot target could not load:', err)
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

export type AutopilotCompletionSignal = {
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

export type StrategyAssetAutopilotFit = {
  sectionId: StrategyAssetKind
  complete: boolean
  existingCount: number
  matchedId?: string
  matchedTitle?: string
  reason: string
}

export type RecordAutopilotFit<T extends { _id: string; title?: string }> = {
  complete: boolean
  existingCount: number
  matched?: T
  reason: string
}

export type MarketingPlanQuestionnaire = {
  topic: string
  objective: string
  audience: string
  destinationUrl: string
  runway: 'oneWeek' | 'twoWeeks' | 'oneMonth'
  contentCapacity: 'oneItem' | 'weeklyCarousel' | 'multiChannel'
  primaryMetric: string
  notes: string
}

export type DesignerWorkflowSession = {
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

export type StrategyAssistantRecommendation = {
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
  teamMembers: [],
}

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
    url: 'https://github.com/alirezarezvani/claude-skills/blob/main/marketing-skill/skills/marketing-strategy-pmm/SKILL.md',
    lesson: 'Use positioning, ICP, launch planning, and GTM structure without exposing designers to jargon.',
  },
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
    color: '#4dc4d6',
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
    color: '#4dc4d6',
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
    color: '#f7f9fc',
    colorScheme: 'dark',
    '--card-bg-color': MARKETING_OPAQUE_CARD_BG,
    '--card-fg-color': '#f7f9fc',
    '--card-muted-fg-color': '#c5ccda',
    '--card-border-color': 'rgba(255, 255, 255, 0.22)',
    border: '1px solid rgba(0, 115, 133, 0.28)',
    borderRadius: 8,
    padding: 16,
    boxShadow: '0 18px 46px rgba(0, 0, 0, 0.18)',
  } as CSSPropertiesWithVariables,
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
  // Precedence: a ?view= deep link wins over the autopilot target and the
  // last-stored view, so a shared link always lands where it points.
  const [view, setView] = useState<MarketingViewId>(
    () => viewFromLocation() || loadStoredMarketingView(loadStoredAutopilotTarget()?.view || 'dashboard'),
  )
  // Role tailors the Autopilot guided flow. Precedence mirrors view: a ?role=
  // deep link wins over the last-stored role, else the 'coworker' default.
  const [role, setRole] = useState<MarketingRole>(() => roleFromLocation() || loadStoredMarketingRole())
  const [financialPostureId, setFinancialPostureId] = useState<FinancialPostureId>(DEFAULT_FINANCIAL_POSTURE_ID)
  useEffect(() => {
    saveStoredMarketingRole(role)
  }, [role])
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
  const [workflowTutorialHandoffToken, setWorkflowTutorialHandoffToken] = useState<string | null>(null)
  const tutorialLaunchHandledRef = useRef(false)
  const [workflowOpenRequest, setWorkflowOpenRequest] = useState(0)
  const [autopilotTarget, setAutopilotTarget] = useState<AutopilotWorkspaceTarget | null>(() => loadStoredAutopilotTarget())
  const [autopilotCompletionSignal, setAutopilotCompletionSignal] = useState<AutopilotCompletionSignal | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, string>>({})
  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0
  const hasUnsavedChange = useCallback((id: string) => Boolean(unsavedChanges[id]), [unsavedChanges])

  const markUnsavedChange = useCallback((id = MARKETING_UNSAVED_FORM_ID, label = 'form fields you edited') => {
    setUnsavedChanges((current) => (current[id] === label ? current : { ...current, [id]: label }))
  }, [])

  const clearUnsavedChanges = useCallback((id?: string) => {
    setUnsavedChanges((current) => {
      if (!id) return {}
      if (!(id in current)) return current
      const next = { ...current }
      delete next[id]
      return next
    })
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

  const confirmDiscardUnsavedChange = useCallback(
    (id: string, message = 'Opening another record will discard this unsaved draft. Continue?') => {
      if (!unsavedChanges[id] || typeof window === 'undefined') return true
      return window.confirm(`${message}\n\nUnsaved: ${unsavedChanges[id]}`)
    },
    [unsavedChanges],
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
        teamMembers: nextData.teamMembers || [],
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
    syncViewToUrl(view)
  }, [view])

  useEffect(() => {
    saveStoredAutopilotTarget(autopilotTarget)
  }, [autopilotTarget])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (tutorialLaunchHandledRef.current) return
    tutorialLaunchHandledRef.current = true
    const requestedTutorial = new URLSearchParams(window.location.search).get(MARKETING_TUTORIAL_QUERY_PARAM)
    if (requestedTutorial) {
      const tutorial = getDesignerWorkflowTutorial(requestedTutorial)
      const handoff = createMarketingTutorialHandoff(
        tutorial.id,
        requestedTutorial === 'designer-workflow-recommendation',
      )
      saveMarketingTutorialHandoff(handoff)
      setWorkflowTutorialId(handoff.tutorialId)
      setWorkflowTutorialDemoRecommendation(handoff.demoRecommendation)
      setWorkflowTutorialHandoffToken(handoff.token)
      setWorkflowTutorialRequest((current) => current + 1)
      window.history.replaceState(window.history.state, '', marketingUrlWithoutTutorialParam(window.location.href))
      return
    }

    const pendingHandoff = loadStoredMarketingTutorialHandoff()
    if (pendingHandoff) {
      setWorkflowTutorialId(pendingHandoff.tutorialId)
      setWorkflowTutorialDemoRecommendation(pendingHandoff.demoRecommendation)
      setWorkflowTutorialHandoffToken(pendingHandoff.token)
      setWorkflowTutorialRequest((current) => current + 1)
      return
    }

    if (
      !hasDesignerWorkflowTutorialCompleted(defaultDesignerWorkflowTutorial.id) &&
      !hasDesignerWorkflowTutorialBeenSeen(defaultDesignerWorkflowTutorial.id)
    ) {
      setWorkflowTutorialId(defaultDesignerWorkflowTutorial.id)
      setWorkflowTutorialDemoRecommendation(false)
      setWorkflowTutorialHandoffToken(null)
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
    (event: MouseEvent) => {
      if (!hasUnsavedChanges) return
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute('href') || ''
      if (!shouldGuardMarketingNavigationClick({
        href,
        target: link.target,
        download: link.hasAttribute('download'),
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      })) return
      if (confirmDiscardUnsavedChanges()) {
        clearUnsavedChanges()
        return
      }
      event.preventDefault()
      event.stopPropagation()
    },
    [clearUnsavedChanges, confirmDiscardUnsavedChanges, hasUnsavedChanges],
  )

  useEffect(() => {
    if (!hasUnsavedChanges || typeof document === 'undefined') return undefined
    document.addEventListener('click', handleMarketingLinkCapture, true)
    return () => document.removeEventListener('click', handleMarketingLinkCapture, true)
  }, [handleMarketingLinkCapture, hasUnsavedChanges])

  const unsavedGuardValue = useMemo<MarketingUnsavedChangesContextValue>(
    () => ({
      hasUnsavedChanges,
      hasUnsavedChange,
      markUnsavedChange,
      clearUnsavedChanges,
      confirmDiscardUnsavedChange,
      confirmDiscardUnsavedChanges,
    }),
    [
      clearUnsavedChanges,
      confirmDiscardUnsavedChange,
      confirmDiscardUnsavedChanges,
      hasUnsavedChange,
      hasUnsavedChanges,
      markUnsavedChange,
    ],
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
  const guideArticle = MARKETING_GUIDE_ARTICLE_BY_VIEW[view]
  const attentionCount = useMemo(
    () => (loading ? 0 : getMarketingDashboardGaps(data, financialPostureId).length),
    [data, financialPostureId, loading],
  )
  // Both layouts reserve bottom space so the fixed Autopilot button never covers content (e.g. Save rows).
  const shellStyle: CSSProperties = compactLayout ? { ...styles.shell, padding: 12, paddingBottom: 92 } : { ...styles.shell, paddingBottom: 92 }
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
    <div data-marketing-tool="true" style={shellStyle}>
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
            <CopyViewLinkButton view={view} role={role} />
            <a href={`/studio/getting-started?article=${guideArticle}`} style={styles.button}>
              Marketing guide
              <LaunchIcon style={{ width: 15, height: 15 }} />
            </a>
            <button
              type="button"
              aria-label={`${attentionCount} marketing item${attentionCount === 1 ? '' : 's'} need attention`}
              title="Open your next actions on the dashboard"
              style={{
                ...styles.button,
                position: 'relative',
                width: 38,
                height: 38,
                padding: 0,
              }}
              onClick={() => {
                if (requestMarketingView('dashboard')) setActionsOpen(false)
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
                  {/* Only actions that have no home in the top nav live here — the sub-tabs
                      already cover every section, so no duplicate view shortcuts. */}
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
          {MARKETING_SURFACES.map((surface) => (
            <MarketingNavButton
              key={surface.id}
              view={surface}
              active={surface.tabs.some((tab) => tab.view === activeView.id)}
              onClick={() => {
                // Re-clicking the surface you're already in must NOT jump you back to its landing
                // tab (and trigger a spurious unsaved-changes prompt) — guard on surface identity.
                if (getMarketingSurfaceForView(activeView.id).id !== surface.id) {
                  requestMarketingView(surface.landingView)
                }
              }}
            />
          ))}
        </nav>

        {!loading && (
          <MarketingGuidanceWidget
            activeView={view}
            data={data}
            financialPostureId={financialPostureId}
            savingId={savingId}
            tutorialRequest={workflowTutorialRequest}
            tutorialLibraryRequest={workflowTutorialLibraryRequest}
            tutorialId={workflowTutorialId}
            tutorialDemoRecommendation={workflowTutorialDemoRecommendation}
            tutorialHandoffToken={workflowTutorialHandoffToken}
            openRequest={workflowOpenRequest}
            completionSignal={autopilotCompletionSignal}
            role={role}
            onRoleChange={setRole}
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
            <MarketingSurfaceHeader surface={getMarketingSurfaceForView(view)} />
            <MarketingSubTabs
              surface={getMarketingSurfaceForView(view)}
              activeView={view}
              onSelect={requestMarketingView}
            />
            {view === 'dashboard' && (
              <>
                <MarketingFinancialPostureSetting
                  compact
                  onOpenSettings={() => requestMarketingView('channels')}
                  onPostureChange={setFinancialPostureId}
                />
                <MarketingDashboard
                  data={data}
                  financialPostureId={financialPostureId}
                  onOpenView={requestMarketingView}
                  onOpenWorkflow={() => setWorkflowOpenRequest((current) => current + 1)}
                />
              </>
            )}
            {view === 'strategy' && (
              <StrategyWorkspace
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
                onOpenView={requestMarketingView}
                autopilotTarget={autopilotTarget}
                onAutopilotComplete={reportAutopilotCompletion}
              />
            )}
            {view === 'strategyBrief' && <StrategyBriefWorkspace />}
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
            {view === 'analytics' && (
              <AnalyticsWorkspace
                data={data}
                savingId={savingId}
                createDocument={createDocument}
                commitPatch={commitPatch}
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
                data={data}
                savingId={savingId}
                createDocument={createDocument}
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
              <>
                <nav aria-label="Settings sections" style={{ ...styles.panel, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, boxShadow: 'none' }}>
                  <a href="#marketing-settings-business" style={styles.button}>Business context</a>
                  <a href="#marketing-settings-voice" style={styles.button}>Brand voices</a>
                  <a href="#marketing-settings-ai" style={styles.button}>AI model</a>
                  <a href="#marketing-settings-channels" style={styles.button}>Channels & formats</a>
                </nav>
                <div style={{ marginBottom: 16, display: 'grid', gap: 12 }}>
                  <div id="marketing-settings-business" style={{ scrollMarginTop: 16 }}>
                    <MarketingFinancialPostureSetting onPostureChange={setFinancialPostureId} />
                  </div>
                  <div id="marketing-settings-voice" style={{ scrollMarginTop: 16 }}>
                    <MarketingBrandVoiceSetting />
                  </div>
                  <div id="marketing-settings-ai" style={{ scrollMarginTop: 16 }}>
                    <MarketingAiModelSetting />
                  </div>
                </div>
                <div id="marketing-settings-channels" style={{ scrollMarginTop: 16 }}>
                  <ChannelWorkspace
                    client={client}
                    data={data}
                    savingId={savingId}
                    createDocument={createDocument}
                    loadData={reloadWorkspaceData}
                    commitPatch={commitPatch}
                  />
                </div>
              </>
            )}
            {view === 'outreach' && (
              <div data-tour-id="autopilot-outreach-workflow">
                <OutreachWorkspace
                  client={client}
                  onOpenEvidence={() => requestMarketingView('workEvidence')}
                  onOpenSettings={() => requestMarketingView('channels')}
                />
              </div>
            )}
            {view === 'workEvidence' && <OutreachEvidenceWorkspace client={client} />}
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

// Copies a deep link to the currently-open tab (…/studio/marketing?view=<view>)
// so a teammate who opens it lands on this exact section. Rebuilds the URL on
// each click, so it works even if the embedding router dropped the synced param.
function CopyViewLinkButton({ view, role }: { view: MarketingViewId; role: MarketingRole }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (typeof window === 'undefined') return
    try {
      await navigator.clipboard.writeText(buildMarketingShareUrl(window.location.href, view, role))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (no gesture / insecure context) — silently no-op.
    }
  }
  const principalLink = role !== 'coworker'
  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={
        principalLink
          ? `Copy a link that opens this tab in the ${role} guided flow — send it to them`
          : 'Copy a link that opens this exact tab — share it with a teammate'
      }
      style={{ ...styles.button, minHeight: 38 }}
    >
      <LinkIcon style={{ width: 15, height: 15 }} />
      {copied ? 'Link copied' : principalLink ? `Copy ${role} link` : 'Copy link'}
    </button>
  )
}

function MarketingNavButton({
  view,
  active,
  onClick,
}: {
  view: { title: string; description: string; icon: typeof CalendarIcon }
  active: boolean
  onClick: () => void
}) {
  const Icon = view.icon

  return (
    <button
      type="button"
      onClick={onClick}
      title={view.description}
      aria-current={active ? 'page' : undefined}
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

// Sub-tab bar for a surface that fronts more than one underlying view (Plan, Make, Measure).
// Tabs can be visually clustered by `group` (e.g. Make: Content vs Plans).
function MarketingSubTabs({
  surface,
  activeView,
  onSelect,
}: {
  surface: MarketingSurface
  activeView: MarketingViewId
  onSelect: (view: MarketingViewId) => void
}) {
  if (surface.tabs.length <= 1) return null
  const groups = Array.from(new Set(surface.tabs.map((tab) => tab.group || '')))
  return (
    // These sub-tabs NAVIGATE (they re-render the surface via requestMarketingView), so this is
    // a nav landmark, not an ARIA tablist/tabpanel. The active tab is marked aria-current="page".
    <nav
      data-marketing-subtabs="true"
      data-mobile-scroll="true"
      aria-label={`${surface.title} sections`}
      style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}
    >
      {groups.map((group, groupIndex) => (
        <div
          key={group || `group-${groupIndex}`}
          role={group ? 'group' : undefined}
          aria-label={group || undefined}
          style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
        >
          {group && (
            <span
              aria-hidden="true"
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                color: 'var(--card-muted-fg-color)',
              }}
            >
              {group}
            </span>
          )}
          {surface.tabs
            .filter((tab) => (tab.group || '') === group)
            .map((tab) => {
              const isActive = activeView === tab.view
              return (
                <button
                  key={tab.view}
                  type="button"
                  data-marketing-subtab="true"
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    ...styles.button,
                    background: isActive ? '#102932' : MARKETING_OPAQUE_CARD_BG,
                    borderColor: isActive ? '#007385' : 'var(--card-border-color)',
                    color: isActive ? '#fff' : 'var(--card-fg-color)',
                    fontWeight: 800,
                  }}
                  onClick={() => onSelect(tab.view)}
                >
                  {tab.label}
                </button>
              )
            })}
        </div>
      ))}
    </nav>
  )
}

// A compact orientation header for non-Home surfaces: the surface name + its one-line purpose.
// (Home has its own hero, so it opts out.) Reuses the authored MARKETING_SURFACES copy.
function MarketingSurfaceHeader({ surface }: { surface: MarketingSurface }) {
  if (surface.id === 'home') return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...styles.kicker, marginBottom: 4 }}>{surface.title}</div>
      <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5, maxWidth: 760 }}>
        {surface.description}
      </p>
    </div>
  )
}

function MarketingDashboard({
  data,
  financialPostureId,
  onOpenView,
  onOpenWorkflow,
}: {
  data: MarketingData
  financialPostureId: FinancialPostureId
  onOpenView: MarketingViewOpener
  onOpenWorkflow: () => void
}) {
  const stats = useMemo(() => getMarketingDashboardStats(data), [data])
  const fastRevenuePosture = financialPostureId === 'survival' || financialPostureId === 'rebuild'
  const gaps = useMemo(() => getMarketingDashboardGaps(data, financialPostureId), [data, financialPostureId])
  const analyticsStats = useMemo(() => getAnalyticsReadinessStats(data), [data])
  const upcomingItems = stats.executionReadyItems.slice(0, 6)
  const assistantActions = useMemo(
    () => buildMarketingAssistantActions(data, null, financialPostureId),
    [data, financialPostureId],
  )
  const [actionQuery, setActionQuery] = useState('')
  const handleAssistantSelect = (action: MarketingAssistantAction) => {
    if (action.view) onOpenView(action.view)
    else onOpenWorkflow()
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, maxWidth: 760 }}>
            <div style={{ ...styles.kicker, marginBottom: 6 }}>Start here</div>
            <h2 style={{ margin: 0, fontSize: 26 }}>What should we work on next?</h2>
            <p style={{ ...styles.muted, margin: '6px 0 0', lineHeight: 1.55 }}>
              Two ways in: let Autopilot guide you through one confirmed step at a time, or pick from the ranked list yourself.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" style={styles.primaryButton} onClick={onOpenWorkflow}>
              Open Autopilot
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 16 }}>
          <AnalyticsMetricCard
            label="Ready content runway"
            value={fastRevenuePosture ? 'Deprioritized' : `${stats.contentRunwayDays} day${stats.contentRunwayDays === 1 ? '' : 's'}`}
            tone={fastRevenuePosture ? 'ok' : stats.contentRunwayDays === 0 ? 'risk' : stats.contentRunwayDays < 7 ? 'warn' : 'ok'}
            detail={
              fastRevenuePosture
                ? `${financialPostureId === 'survival' ? 'survival' : 'rebuild'} posture puts warm outreach first`
                : stats.lastUpcomingDate
                ? `continuous weekly coverage through ${formatDashboardDate(stats.lastUpcomingDate)}`
                : 'no review-ready or scheduled items'
            }
          />
          <AnalyticsMetricCard
            label="Ready items"
            value={`${stats.upcoming30Items.length}`}
            tone={fastRevenuePosture ? 'ok' : stats.coveredDaysNext30 < 4 ? 'warn' : 'ok'}
            detail={`next 30 dates · ${stats.coveredDaysNext30} publishing date${stats.coveredDaysNext30 === 1 ? '' : 's'}`}
          />
          <AnalyticsMetricCard
            label="Active campaigns"
            value={`${stats.activeCampaigns}/${data.campaigns.length}`}
            tone={stats.activeCampaigns === 0 ? 'warn' : 'ok'}
            detail={`${stats.campaignsWithUpcomingContent} with upcoming content`}
          />
          <AnalyticsMetricCard
            label="Measurement"
            value={`${analyticsStats.readinessScore}%`}
            tone={analyticsStats.readinessScore === 0 ? 'risk' : analyticsStats.readinessScore < 50 ? 'warn' : 'ok'}
            detail={`${analyticsStats.connectedMeasurementTargets}/${analyticsStats.measurementTargets} campaigns, funnels, channels, posts & links connected`}
          />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        <section style={styles.panel}>
          <PanelHeading
            title="Next actions"
            description="The highest-priority fixes, ranked. Work top-down, or jump straight to any section."
          />
          {gaps.length === 0 ? (
            <EmptyInline title="No strategic gaps are flagged right now." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {gaps.slice(0, 8).map((gap) => {
                const tone = getDashboardGapTone(gap.severity)
                const viewTitle = getMarketingViewTabLabel(gap.view)

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
                        {gap.affected.slice(0, 3).join(', ')}
                        {gap.affected.length > 3 ? ` and ${gap.affected.length - 3} more` : ''}
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
            description="The next review-ready or scheduled items that make up the continuous runway."
          />
          {upcomingItems.length === 0 ? (
            <EmptyInline title="No execution-ready calendar items yet." />
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
                  <span style={{ ...styles.small, color: '#4dc4d6', fontWeight: 800 }}>
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
                  <span style={{ justifySelf: 'start' }}>
                    <StatusPill status={item.status} options={calendarStatusOptions} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={styles.panel}>
        <MarketingAssistantActionList
          actions={assistantActions}
          query={actionQuery}
          onQueryChange={setActionQuery}
          onSelect={handleAssistantSelect}
          title="Jump to any tool"
          description="Every marketing surface, searchable — open the one you need. The ranked fixes are up in Next actions."
          launcherMode
        />
      </section>

      <section style={styles.panel}>
        <PanelHeading
          title="Channel coverage"
          description="A quick read on whether active channels have review-ready or scheduled work in the next 30 dates."
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
                  {channel.upcoming30Count} ready item{channel.upcoming30Count === 1 ? '' : 's'} in the next 30 dates
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
  activeView,
  data,
  financialPostureId,
  savingId,
  tutorialRequest,
  tutorialLibraryRequest,
  tutorialId,
  tutorialDemoRecommendation,
  tutorialHandoffToken,
  openRequest,
  completionSignal,
  role,
  onRoleChange,
  onOpenView,
  onOpenAutopilotTarget,
  onGenerateInstagramCarousel,
  onGenerateMarketingPlan,
}: {
  activeView: MarketingViewId
  data: MarketingData
  financialPostureId: FinancialPostureId
  savingId: string | null
  tutorialRequest: number
  tutorialLibraryRequest: number
  tutorialId: string
  tutorialDemoRecommendation: boolean
  tutorialHandoffToken: string | null
  openRequest: number
  completionSignal: AutopilotCompletionSignal | null
  role: MarketingRole
  onRoleChange: (role: MarketingRole) => void
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

  useEffect(() => {
    if (roleFromLocation() === 'principal') setOpen(true)
    // A shared principal hand-off opens Autopilot only on arrival.
  }, [])

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
    markDesignerWorkflowTutorialSeen(nextTutorial.id)
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
    if (tutorialHandoffToken) acknowledgeStoredMarketingTutorialHandoff(tutorialHandoffToken)
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
                    Main menu
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
                aria-label="Close Autopilot"
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
            financialPostureId={financialPostureId}
            saving={savingId?.startsWith('carousel-') || savingId?.startsWith('marketing-plan-') || false}
            sessionsOpen={sessionsOpen}
            backSignal={backSignal}
            actionListSignal={actionListSignal}
            completionSignal={completionSignal}
            role={role}
            onRoleChange={onRoleChange}
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
      {/* Home's hero "Open Autopilot" button owns this job on the dashboard, so hide the floating
          button there — unless a guided tutorial is running and needs it as a highlight target. */}
      {!autopilotCoachActive && (activeView !== 'dashboard' || tutorialOpen) && (
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
              advanceTutorialForAction('open-workflow')
            }
            setOpen(nextOpen)
          }}
        >
          <DashboardIcon style={{ width: 18, height: 18 }} />
          Autopilot
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
          <h3 style={{ margin: 0, fontSize: 17 }}>Autopilot tutorials</h3>
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

// One big choice on the Autopilot home menu. Icon tile + title + one line of help.
function AutopilotHomeChoice({
  icon: Icon,
  title,
  description,
  onClick,
  tone = 'default',
  tourId,
}: {
  icon: ComponentType<{ style?: CSSProperties }>
  title: string
  description: string
  onClick: () => void
  tone?: 'default' | 'primary'
  tourId?: string
}) {
  const primary = tone === 'primary'
  return (
    <button
      type="button"
      data-tour-id={tourId}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        textAlign: 'left',
        width: '100%',
        padding: 14,
        borderRadius: 8,
        cursor: 'pointer',
        border: primary ? '1px solid #007385' : '1px solid var(--card-border-color)',
        background: primary ? 'rgba(0, 115, 133, 0.10)' : 'var(--card-bg-color)',
        color: 'var(--card-fg-color)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 8,
          flex: '0 0 auto',
          background: primary ? '#007385' : 'rgba(0, 115, 133, 0.12)',
          color: primary ? '#fff' : '#007385',
        }}
      >
        <Icon style={{ width: 18, height: 18 }} />
      </span>
      <span style={{ display: 'grid', gap: 2 }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{title}</span>
        <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>{description}</span>
      </span>
    </button>
  )
}

// The Autopilot home: a "continuing where we left off" card when a guided setup
// is in progress, plus the three-choice main menu. The exhaustive action
// directory lives one click away behind "I want to do something specific".
function AutopilotHomeMenu({
  role,
  onRoleChange,
  continueTitle,
  continueStepTitle,
  onResume,
  onGuide,
  onBrowse,
  onTalk,
}: {
  role: MarketingRole
  onRoleChange: (role: MarketingRole) => void
  continueTitle: string | null
  continueStepTitle: string | null
  onResume: () => void
  onGuide: () => void
  onBrowse: () => void
  onTalk: () => void
}) {
  const resuming = Boolean(continueTitle)
  const principal = role === 'principal'
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {resuming && (
        <section style={{ ...styles.panel, padding: 16, borderColor: 'rgba(0, 115, 133, 0.5)' }}>
          <div style={styles.kicker}>Continuing where we left off…</div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{continueTitle}</div>
          {continueStepTitle && (
            <div style={{ ...styles.small, ...styles.muted, marginTop: 4 }}>Next decision: {continueStepTitle}</div>
          )}
          <button
            type="button"
            data-tour-id="designer-workflow-path-single"
            style={{ ...styles.primaryButton, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={onResume}
          >
            <RefreshIcon style={{ width: 16, height: 16 }} />
            Resume
          </button>
        </section>
      )}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={styles.kicker}>{resuming ? 'Or start something else' : 'Autopilot'}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title="Tailors the guided flow. A ?role= link sets this for whoever you send it to.">
            <span style={{ ...styles.small, ...styles.muted }}>Viewing as</span>
            <div style={{ display: 'inline-flex', border: '1px solid var(--card-border-color)', borderRadius: 6, overflow: 'hidden' }}>
              {MARKETING_ROLES.map((r) => {
                const active = r === role
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRoleChange(r)}
                    style={{
                      border: 'none',
                      padding: '5px 11px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: active ? '#007385' : 'transparent',
                      color: active ? '#fff' : 'var(--card-fg-color)',
                    }}
                  >
                    {r === 'principal' ? 'Principal' : 'Coworker'}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <h2 style={{ margin: '0 0 4px', fontSize: 19 }}>What would you like to do?</h2>
        <p style={{ ...styles.small, ...styles.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
          {principal
            ? 'Start with a plan for reaching out to people you already know, then add the ones worth a call.'
            : 'Pick a direction — you can always dig into a specific tool.'}
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <AutopilotHomeChoice
            icon={RocketIcon}
            title="Guide me along"
            description={
              principal
                ? 'Make a plan for finding work through people you already know, then add who to call.'
                : 'Autopilot inspects the suite and walks you through one reviewable step at a time.'
            }
            onClick={onGuide}
            tone="primary"
            tourId="designer-workflow-path-plan"
          />
          <AutopilotHomeChoice
            icon={SearchIcon}
            title="I want to do something specific"
            description="Search and jump straight to any tool or action."
            onClick={onBrowse}
          />
          <AutopilotHomeChoice
            icon={UsersIcon}
            title="Talk it through"
            description={
              principal
                ? 'Talk to the strategist about who to reach and what to offer.'
                : 'Chat with the strategist before changing anything.'
            }
            onClick={onTalk}
          />
        </div>
      </div>
    </div>
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
  launcherMode = false,
}: {
  actions: MarketingAssistantAction[]
  query: string
  onQueryChange: (query: string) => void
  onSelect: (action: MarketingAssistantAction) => void
  title?: string
  description?: string
  compact?: boolean
  // Launcher mode = an exhaustive "jump to any tool" directory: drop the Recommended
  // pill/fill/chip and the gap-derived reason line, so it complements (not duplicates) a
  // separate ranked "Next actions" list on the same surface.
  launcherMode?: boolean
}) {
  const [areaFilter, setAreaFilter] = useState<string>('all')
  const hasRecommended = actions.some((action) => action.recommended)
  const availableSurfaces = useMemo(() => {
    const ids = new Set<string>()
    for (const action of actions) {
      if (action.view) ids.add(getMarketingSurfaceForView(action.view).id)
    }
    return MARKETING_SURFACES.filter((surface) => surface.id !== 'home' && ids.has(surface.id))
  }, [actions])
  const filterChips = useMemo(
    () => [
      { id: 'all', label: 'All' },
      ...(hasRecommended && !launcherMode ? [{ id: 'recommended', label: 'Recommended' }] : []),
      ...availableSurfaces.map((surface) => ({ id: surface.id, label: surface.title })),
    ],
    [availableSurfaces, hasRecommended, launcherMode],
  )
  // A stale chip (e.g. the filtered area emptied out) silently falls back to "all".
  const activeChip = filterChips.some((chip) => chip.id === areaFilter) ? areaFilter : 'all'
  const areaFilteredActions = useMemo(() => {
    if (activeChip === 'all') return actions
    if (activeChip === 'recommended') return actions.filter((action) => action.recommended)
    return actions.filter((action) => action.view && getMarketingSurfaceForView(action.view).id === activeChip)
  }, [actions, activeChip])
  const visibleActions = filterMarketingAssistantActions(areaFilteredActions, query)
  const limitedActions = compact ? visibleActions.slice(0, 6) : visibleActions

  return (
    <section style={{ display: 'grid', gap: 10 }} data-tour-id="designer-workflow-action-list">
      <div>
        <h3 style={{ margin: 0, fontSize: compact ? 15 : 17 }}>{title}</h3>
        {description && <p style={{ ...styles.small, ...styles.muted, margin: '4px 0 0', lineHeight: 1.45 }}>{description}</p>}
      </div>
      {!compact && filterChips.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Filter actions by area">
          {filterChips.map((chip) => {
            const isActive = activeChip === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setAreaFilter(chip.id)}
                style={{
                  ...styles.small,
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '4px 11px',
                  fontWeight: 800,
                  border: `1px solid ${isActive ? '#007385' : 'var(--card-border-color)'}`,
                  background: isActive ? 'rgba(0, 115, 133, 0.2)' : MARKETING_OPAQUE_CARD_BG,
                  color: isActive ? '#4dc4d6' : 'var(--card-fg-color)',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      )}
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
                  ? `Open ${getMarketingViewTabLabel(action.view)}`
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
                  background: !launcherMode && action.recommended ? '#102932' : MARKETING_OPAQUE_CARD_BG,
                  borderColor: !launcherMode && action.recommended ? '#007385' : 'var(--card-border-color)',
                  padding: compact ? 9 : 11,
                }}
                onClick={() => onSelect(action)}
              >
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: compact ? 13 : 14 }}>{action.title}</strong>
                  {!launcherMode && action.recommended && (
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
                {!launcherMode && (
                  <span style={{ ...styles.small, color: action.recommended ? '#b6e8ee' : 'var(--card-muted-fg-color)', lineHeight: 1.35 }}>
                    {action.reason}
                  </span>
                )}
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
  financialPostureId,
  saving,
  sessionsOpen,
  backSignal,
  actionListSignal,
  completionSignal,
  tutorialPrepareSignal,
  role,
  onRoleChange,
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
  financialPostureId: FinancialPostureId
  saving: boolean
  sessionsOpen: boolean
  backSignal: number
  actionListSignal: number
  completionSignal: AutopilotCompletionSignal | null
  tutorialPrepareSignal: DesignerWorkflowTutorialPrepareSignal
  role: MarketingRole
  onRoleChange: (role: MarketingRole) => void
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
  // Home has two faces: the minimal 3-choice menu (default) and the full
  // searchable action directory, revealed only via "I want to do something specific".
  const [browseOpen, setBrowseOpen] = useState(false)
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
    () => buildMarketingAssistantActions(data, latestSetupSession, financialPostureId),
    [data, financialPostureId, latestSetupSession],
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
    setBrowseOpen(false)
    returnToPathSelection()
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
    // Scripted plans are hand-authored, but refresh against the latest scripted
    // definition so an in-progress hand-off gains new steps without losing work.
    const refreshedPlan = isScriptedAutopilotPlan(activeSession.autopilotPlan)
      ? refreshPrincipalOutreachPlan(activeSession.autopilotPlan)
      : refreshMarketingAutopilotPlan(
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
        headers: { 'Content-Type': 'application/json', ...studioSessionHeader() },
        body: JSON.stringify({
          kind: 'strategistChat',
          draft: buildStrategistChatDraft(data, activeSession, questionnaire, financialPostureId),
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
        usedAi: !!payload.usedAi,
      }
      updateActiveSession({
        strategistMessages: [...nextMessages, assistantMessage].slice(-30),
        strategistSuggestion: payload.suggestion,
        strategyUsedAi: !!payload.usedAi,
      })
      onTutorialAction('strategist-recommendation-ready')
    } catch (requestError) {
      console.error('Autopilot chat failed:', requestError)
      setStrategyError(requestError instanceof Error ? requestError.message : 'Autopilot could not create a recommendation.')
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
        headers: { 'Content-Type': 'application/json', ...studioSessionHeader() },
        body: JSON.stringify({
          kind: 'researchProject',
          draft: buildWizardStrategyDraft(data, questionnaire, financialPostureId),
          prompt: buildWizardStrategyPrompt(data, questionnaire, strategyPrompt, financialPostureId),
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
      if (financialPostureId === 'survival' || financialPostureId === 'rebuild') {
        const outreachPlan = buildPrincipalOutreachPlan()
        const nextStep = getCurrentAutopilotStep(outreachPlan)
        const guidedPlan = nextStep ? setAutopilotCoachOpen(outreachPlan, true) : outreachPlan
        updateActiveSession({
          strategySuggestion: null,
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
        return
      }
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
        onPlanChange={(nextPlan) => {
          updateActiveSession({
            autopilotPlan: nextPlan,
            strategyStepIndex: getAutopilotCurrentIndex(nextPlan),
          })
        }}
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
        {browseOpen ? (
          <>
            <button
              type="button"
              style={{ ...styles.inlineLink, padding: 0, border: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer' }}
              onClick={() => setBrowseOpen(false)}
            >
              <ChevronLeftIcon style={{ width: 16, height: 16 }} />
              Back to menu
            </button>
            <MarketingAssistantActionList
              actions={assistantActions}
              query={actionSearch}
              onQueryChange={setActionSearch}
              onSelect={selectAssistantAction}
              title="Find a tool or action"
              description="Search in plain language: test a page, plan posts, prove a claim, choose a next step, or review what needs attention."
            />
          </>
        ) : (
          <AutopilotHomeMenu
            role={role}
            onRoleChange={onRoleChange}
            continueTitle={latestSetupSession ? latestSetupSession.title || 'Guided setup in progress' : null}
            continueStepTitle={getCurrentAutopilotStep(latestSetupSession?.autopilotPlan)?.title ?? null}
            onResume={continueLatestSetup}
            onGuide={() => {
              onTutorialAction('choose-plan')
              if (role === 'principal') {
                // Boss path: seed the hand-authored warm-network plan and open
                // its first step (the marketing plan), coach up.
                const plan = buildPrincipalOutreachPlan()
                startSession('plan', { autopilotPlan: plan })
                const step = getCurrentAutopilotStep(plan)
                if (step) {
                  onInteractionModeChange('highlight')
                  onOpenAutopilotTarget(autopilotTargetForStep(step))
                  onAutopilotCoachActiveChange(true)
                }
                return
              }
              startSession('plan')
            }}
            onBrowse={() => setBrowseOpen(true)}
            onTalk={() => {
              startSession(
                'strategist',
                role === 'principal'
                  ? { strategistDirection: 'Help me find work through people I already know — who to reach out to, what to offer, and who to call.' }
                  : {},
              )
              onTutorialAction('choose-strategist')
            }}
          />
        )}
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
          onAutopilotPlanChange={(nextPlan) => {
            updateActiveSession({
              autopilotPlan: nextPlan,
              strategyStepIndex: getAutopilotCurrentIndex(nextPlan),
            })
          }}
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
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  const fallbackReply = latestAssistant?.usedAi === false
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
        <h3 style={{ margin: 0, fontSize: 18 }}>Chat with Autopilot</h3>
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
          {loading ? 'Asking Autopilot...' : 'Ask Autopilot'}
        </button>
        <div style={{ ...styles.small, ...styles.muted }}>
          Reusable strategy inputs ready: {readyCount}/6. Autopilot will reuse what fits before asking for anything new.
        </div>
      </section>

      {error && <div style={{ ...styles.small, color: '#E36216', fontWeight: 800 }}>{error}</div>}

      {fallbackReply && (
        <div style={{ ...styles.panel, boxShadow: 'none', padding: '8px 10px', borderColor: 'rgba(214, 169, 63, 0.55)', display: 'grid', gap: 2 }}>
          <strong style={{ ...styles.small, color: '#d6a93f' }}>Fallback answer — AI unavailable</strong>
          <span style={{ ...styles.small, ...styles.muted, lineHeight: 1.45 }}>
            The AI could not be reached, so this reply came from generic rules — it is not tailored advice. Ask again to retry.
          </span>
        </div>
      )}

      {recommendation && (
        <section style={{ ...styles.panel, boxShadow: 'none', padding: 12, background: MARKETING_OPAQUE_PANEL_BG, display: 'grid', gap: 12 }}>
          <div>
            <div style={{ ...styles.small, color: '#4dc4d6', fontWeight: 900 }}>Autopilot recommendation</div>
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
                <strong style={{ color: 'var(--card-fg-color)' }}>
                  {message.role === 'assistant' ? 'Autopilot' : 'You'}
                  {message.role === 'assistant' && message.usedAi === false && (
                    <span style={{ color: '#d6a93f' }}> (fallback — AI unavailable)</span>
                  )}
                  {': '}
                </strong>
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
  onAutopilotPlanChange,
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
  onAutopilotPlanChange: (plan: MarketingAutopilotPlan) => void
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
              <div style={{ ...styles.small, color: !demoRecommendation && usedAi === false ? '#d6a93f' : '#4dc4d6', fontWeight: 800 }}>
                {demoRecommendation ? 'Tutorial sample' : usedAi ? 'AI recommendation' : 'Fallback — rule-based next step (AI unavailable)'}
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
                Open {getMarketingViewTabLabel(recommendation.view)}
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
                    <strong style={{ ...styles.small, color: '#4dc4d6', display: 'block', marginBottom: 6 }}>{item.title}</strong>
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
        onPlanChange={onAutopilotPlanChange}
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

// Hand-authored (scripted) plans use this id prefix so the refresh effect uses
// their stable definition instead of rebuilding them from content-pipeline data.
const SCRIPTED_AUTOPILOT_PLAN_ID_PREFIX = 'principal-outreach-'
function isScriptedAutopilotPlan(plan: MarketingAutopilotPlan | null | undefined): boolean {
  return Boolean(plan?.id?.startsWith(SCRIPTED_AUTOPILOT_PLAN_ID_PREFIX))
}

export type PrincipalOutreachPrerequisites = {
  /** `null` means the private outreach dataset has not been checked yet. */
  contactCount: number | null
  /** Active offers whose price band contains a real currency amount. */
  callReadyOfferCount: number | null
}

export function getPrincipalOutreachPrerequisiteBlocker(
  stepId: string,
  prerequisites?: PrincipalOutreachPrerequisites | null,
): string | null {
  if (!prerequisites || !stepId.startsWith('principal-')) return null
  const missing: string[] = []
  if (stepId !== 'principal-plan-warm-network' && prerequisites.contactCount === 0) {
    missing.push('Add at least one contact before confirming this step.')
  }
  if (prerequisites.callReadyOfferCount === 0) {
    missing.push('Set a real currency amount on at least one active offer before continuing.')
  }
  return missing.length > 0 ? `Stay on this step: ${missing.join(' ')}` : null
}

async function loadPrincipalOutreachPrerequisites(
  outreachClient: StudioClient,
): Promise<PrincipalOutreachPrerequisites> {
  const result = await outreachClient.fetch<{
    contactCount?: number
    offers?: Array<{ priceBand?: string }>
  }>(`{
    "contactCount": count(*[_type == "marketingContact" && !(_id in path("drafts.**"))]),
    "offers": *[_type == "marketingOffer" && status == "active" && !(_id in path("drafts.**"))]{priceBand}
  }`)
  const contactCount = typeof result.contactCount === 'number' && Number.isFinite(result.contactCount)
    ? Math.max(0, result.contactCount)
    : 0
  const callReadyOfferCount = (result.offers || []).filter((offer) => hasPricedOffer(offer.priceBand)).length
  return { contactCount, callReadyOfferCount }
}

// A principal/founder gets a hand-authored end-to-end guided plan: preflight the
// offer/evidence setup, add contacts, research, review, call, and log. It's a
// normal MarketingAutopilotPlan, so the coach overlay, resume card, and target-
// opening all work unchanged. Confirming a coach choice advances the persisted
// plan; the smaller Next control remains a non-destructive preview.
export function buildPrincipalOutreachPlan(): MarketingAutopilotPlan {
  const steps: MarketingAutopilotStep[] = [
    {
      id: 'principal-plan-warm-network',
      view: 'outreach',
      targetId: 'autopilot-plan-warm-network',
      title: 'Preflight the call plan',
      instruction: 'Read the highlighted plan and check the evidence and priced-offer counts before spending time on research.',
      why: 'A direct, specific ask to people who already know our work is the fastest path to new work, but research cannot produce an approvable call brief without active evidence and a real price to present.',
      requiredAction: 'Confirm the plan has work evidence and at least one offer with a real dollar band; fix either blocker before continuing.',
      nextAfter: 'Add the people worth a call.',
      expectedAction: 'outreach:preflight',
      status: 'upcoming',
    },
    {
      id: 'principal-outreach-intake',
      view: 'outreach',
      targetId: 'autopilot-outreach-intake',
      title: 'Add your contacts',
      instruction: 'Paste anyone worth a call — one per line, name + company is enough.',
      why: 'We research each person against your work and rank who to call first, warmth-first, with a tailored offer.',
      requiredAction: 'Paste names, then Check names and Add.',
      nextAfter: 'Run research to build your ranked call plan.',
      expectedAction: 'outreach:addContacts',
      status: 'upcoming',
    },
    {
      id: 'principal-outreach-research',
      view: 'outreach',
      targetId: 'autopilot-outreach-workflow',
      title: 'Research the new contacts',
      instruction: 'In Contacts, run Research all new and let each completed person save before reviewing.',
      why: 'Research verifies identity, checks the organization now, matches shipped work, and drafts a priced offer plus call brief. It takes about 1–2 minutes per person and saves after each one.',
      requiredAction: 'Run Research all new, or research a single priority contact, and wait for the result to enter Research awaiting review.',
      nextAfter: 'Review every generated brief before it can enter the call plan.',
      expectedAction: 'outreach:research',
      status: 'upcoming',
    },
    {
      id: 'principal-outreach-review',
      view: 'outreach',
      targetId: 'autopilot-outreach-workflow',
      title: 'Review and tweak the briefs',
      instruction: 'Review identity, relationship, linked work, wording, and price; choose or edit the offer, then approve each ready brief.',
      why: 'AI research never enters the Outreach progress tracker as ready by itself. This is where you keep the facts honest and make the pitch sound like something you would actually say.',
      requiredAction: 'Resolve every readiness warning and select Approve for call plan on the contacts you are willing to call.',
      nextAfter: 'Use the Outreach progress tracker to make the calls.',
      expectedAction: 'outreach:review',
      status: 'upcoming',
    },
    {
      id: 'principal-outreach-call',
      view: 'outreach',
      targetId: 'outreach-progress-tracker',
      title: 'Call from the Outreach progress tracker',
      instruction: 'Start with Recommended next in the Outreach progress tracker; use the linked proof, priced offer, opener, and intelligence question.',
      why: 'The list ranks relationship warmth before model fit, so the fastest credible conversations stay at the top.',
      requiredAction: 'Call or message the approved contacts, adapting the suggested opener in your own voice.',
      nextAfter: 'Log what happened and set the next touch.',
      expectedAction: 'outreach:call',
      status: 'upcoming',
    },
    {
      id: 'principal-outreach-log',
      view: 'outreach',
      targetId: 'autopilot-outreach-workflow',
      title: 'Log outcomes before you leave',
      instruction: 'Open Log interaction for every touch, record what happened, and save the follow-up date.',
      why: 'A short outcome note keeps the team from repeating work while the default seven-day follow-up makes the next action resurface automatically.',
      requiredAction: 'Save an outcome for each call; add intelligence, opportunity value, offer, evidence, or next step when known.',
      nextAfter: 'The outreach loop is complete; follow-ups will resurface when due.',
      expectedAction: 'outreach:log',
      status: 'upcoming',
    },
  ]
  return normalizeAutopilotStepStatuses({
    id: `${SCRIPTED_AUTOPILOT_PLAN_ID_PREFIX}${randomKey()}`,
    title: 'Reach out to people you know',
    currentStepId: steps[0].id,
    coachOpen: true,
    steps,
  })
}

export function refreshPrincipalOutreachPlan(plan: MarketingAutopilotPlan): MarketingAutopilotPlan {
  if (!isScriptedAutopilotPlan(plan)) return plan
  const latest = buildPrincipalOutreachPlan()
  const priorSteps = new Map(plan.steps.map((step) => [step.id, step]))
  return normalizeAutopilotStepStatuses({
    ...latest,
    id: plan.id,
    coachOpen: plan.coachOpen,
    createdRefs: plan.createdRefs,
    steps: latest.steps.map((step) => {
      const prior = priorSteps.get(step.id)
      if (!prior || prior.status !== 'done') return step
      return {
        ...step,
        status: 'done',
        completedRefId: prior.completedRefId,
      }
    }),
  })
}

export function advanceScriptedAutopilotPlan(
  plan: MarketingAutopilotPlan,
  stepId: string,
  prerequisites?: PrincipalOutreachPrerequisites | null,
): MarketingAutopilotPlan {
  if (!isScriptedAutopilotPlan(plan)) return plan
  const currentStep = getCurrentAutopilotStep(plan)
  if (!currentStep || currentStep.id !== stepId) return plan
  if (getPrincipalOutreachPrerequisiteBlocker(stepId, prerequisites)) return plan
  return normalizeAutopilotStepStatuses({
    ...plan,
    coachOpen: true,
    steps: plan.steps.map((step) =>
      step.id === stepId
        ? { ...step, status: 'done' as const }
        : step,
    ),
  })
}

// Tailored coach copy for the principal steps. Overrides the content-pipeline
// prompts (which key off expectedAction), so a warm-network step never shows
// link/research copy.
function getPrincipalCoachPrompt(step: MarketingAutopilotStep): AutopilotCoachPrompt | null {
  if (step.id === 'principal-plan-warm-network') {
    return {
      question: 'Clear the blockers first',
      shortReason: 'The highlighted plan shows the live evidence and priced-offer counts. Evidence must be present and at least one offer needs a real dollar band before a researched brief can become call-ready.',
      choices: [
        { label: 'Preflight checked — add contacts', detail: 'The evidence and offer setup are ready enough to continue.', tone: 'primary' },
        { label: 'Keep setup open', detail: 'Fix evidence or price bands before spending time on research.' },
      ],
    }
  }
  if (step.id === 'principal-outreach-intake') {
    return {
      question: "Who's worth a call?",
      shortReason: 'Paste names — one per line, name + company is enough. We research each and rank who to call first.',
      choices: [
        { label: 'Contacts added — research them', detail: 'I checked the preview and added the contacts I want researched.', tone: 'primary' },
        { label: 'Keep adding', detail: 'Leave this step current while I finish the contact list.' },
      ],
    }
  }
  if (step.id === 'principal-outreach-research') {
    return {
      question: 'Build the briefs',
      shortReason: 'Use Research all new in Contacts, or research one priority person. Results save one contact at a time and move into Research awaiting review.',
      choices: [
        { label: 'Research finished — review briefs', detail: 'The contacts I need now have research results waiting for review.', tone: 'primary' },
        { label: 'Research is still running', detail: 'Keep this step current until the batch finishes.' },
      ],
    }
  }
  if (step.id === 'principal-outreach-review') {
    return {
      question: 'Make each brief call-worthy',
      shortReason: 'Verify the person and relationship, check the linked work, choose or edit a real priced offer, and adjust the wording before approval.',
      choices: [
        { label: 'Briefs approved — show progress tracker', detail: 'The contacts I will call are approved and appear in the Outreach progress tracker.', tone: 'primary' },
        { label: 'Keep reviewing', detail: 'Leave this step current while I resolve readiness warnings.' },
      ],
    }
  }
  if (step.id === 'principal-outreach-call') {
    return {
      question: 'Work down the Outreach progress tracker',
      shortReason: 'The Outreach progress tracker ranks relationship warmth first. Start with Recommended next and use the proof, price, opener, and intelligence question on each approved contact.',
      choices: [
        { label: 'Calls made — log outcomes', detail: 'Move on to recording what happened and what comes next.', tone: 'primary' },
        { label: 'Keep the progress tracker open', detail: 'Leave this step current while I finish the calls.' },
      ],
    }
  }
  if (step.id === 'principal-outreach-log') {
    return {
      question: 'Leave the team a clean handoff',
      shortReason: 'Log each touch with at least the outcome. The default follow-up is seven days; add the offer, proof, value, intelligence, or next step when known.',
      choices: [
        { label: 'Outcomes saved — finish', detail: 'The calls are logged and follow-ups can resurface without me.', tone: 'primary' },
        { label: 'Keep logging', detail: 'Leave the final step current until every touch is recorded.' },
      ],
    }
  }
  return null
}

function getAutopilotCoachPrompt(step: MarketingAutopilotStep): AutopilotCoachPrompt {
  const principalPrompt = getPrincipalCoachPrompt(step)
  if (principalPrompt) return principalPrompt
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
  onPlanChange,
  onChoice,
  onStepPreview,
}: {
  plan: MarketingAutopilotPlan | null
  onClose: () => void
  onOpenChat: () => void
  onPlanChange: (plan: MarketingAutopilotPlan) => void
  onChoice: (step: MarketingAutopilotStep, choice: AutopilotCoachChoice, choiceIndex: number) => void
  onStepPreview: (step: MarketingAutopilotStep) => void
}) {
  const step = getCurrentAutopilotStep(plan)
  const currentIndex = getAutopilotCurrentIndex(plan)
  const settingsClient = useClient({ apiVersion: API_VERSION })
  const principalOutreachClient = useMemo(
    () => settingsClient.withConfig({ dataset: OUTREACH_DATASET }),
    [settingsClient],
  )
  const [visibleStepIndex, setVisibleStepIndex] = useState(currentIndex)
  const [principalPrerequisites, setPrincipalPrerequisites] = useState<PrincipalOutreachPrerequisites | null>(null)
  const [prerequisiteNotice, setPrerequisiteNotice] = useState<string | null>(null)
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(false)
  const scriptedPlan = isScriptedAutopilotPlan(plan)

  const refreshPrincipalPrerequisites = useCallback(
    () => loadPrincipalOutreachPrerequisites(principalOutreachClient),
    [principalOutreachClient],
  )

  useEffect(() => {
    setVisibleStepIndex(currentIndex)
  }, [plan?.id, currentIndex])

  useEffect(() => {
    let disposed = false
    if (!plan?.coachOpen || !step || !scriptedPlan) {
      setPrincipalPrerequisites(null)
      setPrerequisiteNotice(null)
      setCheckingPrerequisites(false)
      return () => {
        disposed = true
      }
    }

    setCheckingPrerequisites(true)
    setPrerequisiteNotice(null)
    void refreshPrincipalPrerequisites()
      .then((snapshot) => {
        if (disposed) return
        setPrincipalPrerequisites(snapshot)
        setPrerequisiteNotice(getPrincipalOutreachPrerequisiteBlocker(step.id, snapshot))
      })
      .catch((error) => {
        if (disposed) return
        console.error('Principal outreach prerequisites could not load:', error)
        setPrerequisiteNotice('Stay on this step: Outreach readiness could not be verified. Try again.')
      })
      .finally(() => {
        if (!disposed) setCheckingPrerequisites(false)
      })

    return () => {
      disposed = true
    }
  }, [plan?.coachOpen, plan?.id, refreshPrincipalPrerequisites, scriptedPlan, step])

  if (!plan?.coachOpen || !step) return null
  const safeVisibleStepIndex = Math.min(Math.max(0, visibleStepIndex), Math.max(0, plan.steps.length - 1))

  const handleStepChange = (nextIndex: number) => {
    if (nextIndex >= plan.steps.length) return
    const nextSafeIndex = Math.min(Math.max(0, nextIndex), Math.max(0, plan.steps.length - 1))
    setVisibleStepIndex(nextSafeIndex)
    const nextStep = plan.steps[nextSafeIndex]
    if (nextStep) onStepPreview(nextStep)
  }

  // Scripted (principal) steps use explicit human confirmations instead of
  // workspace completion events. Persist each primary confirmation so closing
  // and resuming returns to the next unfinished step; Next remains preview-only.
  const handleCoachChoice = async (
    choiceStep: MarketingAutopilotStep,
    choice: AutopilotCoachChoice,
    choiceIndex: number,
  ) => {
    const isPrimaryChoice = choiceIndex === 0 || choice.tone === 'primary'
    let verifiedPrerequisites = principalPrerequisites
    if (isPrimaryChoice && scriptedPlan) {
      setCheckingPrerequisites(true)
      setPrerequisiteNotice(null)
      try {
        verifiedPrerequisites = await refreshPrincipalPrerequisites()
        setPrincipalPrerequisites(verifiedPrerequisites)
        const blocker = getPrincipalOutreachPrerequisiteBlocker(choiceStep.id, verifiedPrerequisites)
        setPrerequisiteNotice(blocker)
        if (blocker) return
      } catch (error) {
        console.error('Principal outreach prerequisites could not be verified:', error)
        setPrerequisiteNotice('Stay on this step: Outreach readiness could not be verified. Try again.')
        return
      } finally {
        setCheckingPrerequisites(false)
      }
    }

    onChoice(choiceStep, choice, choiceIndex)
    if (!isPrimaryChoice || !scriptedPlan) return
    const nextPlan = advanceScriptedAutopilotPlan(plan, choiceStep.id, verifiedPrerequisites)
    if (nextPlan === plan) return
    onPlanChange(nextPlan)
    const nextStep = getCurrentAutopilotStep(nextPlan)
    if (!nextStep) return
    const nextIndex = plan.steps.findIndex((candidate) => candidate.id === nextStep.id)
    if (nextIndex >= 0) handleStepChange(nextIndex)
  }

  return (
    <GuidedTutorialOverlay
      active
      compact
      tutorial={buildAutopilotCoachTutorial(plan, onOpenChat, handleCoachChoice, {
        checkingPrerequisites,
        prerequisiteNotice,
      })}
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
  onChoice: (step: MarketingAutopilotStep, choice: AutopilotCoachChoice, choiceIndex: number) => void | Promise<void>,
  prerequisiteState: { checkingPrerequisites: boolean; prerequisiteNotice: string | null } = {
    checkingPrerequisites: false,
    prerequisiteNotice: null,
  },
) {
  return {
    id: `marketing-autopilot-${plan.id}`,
    title: 'Autopilot',
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
            {step.id === plan.currentStepId && (prerequisiteState.checkingPrerequisites || prerequisiteState.prerequisiteNotice) && (
              <div
                role="status"
                style={{
                  border: '1px solid rgba(255, 209, 102, 0.5)',
                  background: 'rgba(255, 209, 102, 0.1)',
                  borderRadius: 7,
                  color: '#fff1bd',
                  padding: '8px 10px',
                }}
              >
                {prerequisiteState.checkingPrerequisites
                  ? 'Checking live Outreach readiness…'
                  : prerequisiteState.prerequisiteNotice}
              </div>
            )}
            <div style={{ display: 'grid', gap: 7 }}>
              {prompt.choices.map((choice, choiceIndex) => {
                const isPrimaryChoice = choiceIndex === 0 || choice.tone === 'primary'
                const checkingThisChoice = step.id === plan.currentStepId && isPrimaryChoice && prerequisiteState.checkingPrerequisites
                const blockedPrimaryChoice =
                  step.id === plan.currentStepId
                  && isPrimaryChoice
                  && Boolean(prerequisiteState.prerequisiteNotice)
                const presentedChoice = checkingThisChoice
                  ? {
                      ...choice,
                      label: 'Checking live readiness…',
                      detail: 'Autopilot is verifying the saved Outreach data before it advances.',
                    }
                  : blockedPrimaryChoice
                    ? {
                        ...choice,
                        label: 'Recheck after fixing this step',
                        detail: 'Resolve the blocker above, then recheck. Autopilot advances only when the live readiness check passes.',
                      }
                    : choice
                return (
                  <button
                    key={`${step.id}-${choice.label}`}
                    type="button"
                    data-tour-id={`autopilot-coach-choice-${step.id}-${choiceIndex}`}
                    disabled={checkingThisChoice}
                    aria-busy={checkingThisChoice || undefined}
                    style={{
                      border: `1px solid ${choice.tone === 'primary' ? 'rgba(0, 166, 184, 0.58)' : 'rgba(160, 171, 197, 0.24)'}`,
                      background: choice.tone === 'primary' ? 'rgba(0, 115, 133, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: '#fff',
                      borderRadius: 7,
                      padding: '8px 10px',
                      display: 'grid',
                      gap: 3,
                      cursor: checkingThisChoice ? 'wait' : 'pointer',
                      opacity: checkingThisChoice ? 0.68 : 1,
                      font: 'inherit',
                      textAlign: 'left',
                    }}
                    onClick={() => void onChoice(step, choice, choiceIndex)}
                  >
                    <strong style={{ color: '#fff', fontSize: 13 }}>{presentedChoice.label}</strong>
                    <span style={{ color: 'rgba(255, 255, 255, 0.72)' }}>{presentedChoice.detail}</span>
                  </button>
                )
              })}
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

type BrandVoiceLearningContentSnapshot = {
  headline?: string
  caption?: string
  callToAction?: string
  frames?: Array<{ title?: string; body?: string }>
}

type BrandVoiceLearningBaseline = {
  voiceKey: string
  voiceName: string
  before: BrandVoiceLearningContentSnapshot
}

function voiceLearningText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function voiceLearningTextList(value: unknown) {
  return Array.isArray(value)
    ? value.map(voiceLearningText).filter((item): item is string => Boolean(item))
    : []
}

function voiceLearningFrames(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .map((item) => ({
      title: voiceLearningText(item.offer),
      body: voiceLearningText(item.callToAction),
    }))
    .filter((item) => item.title || item.body)
}

function hasVoiceLearningCopy(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.some(hasVoiceLearningCopy)
  return Boolean(
    value &&
      typeof value === 'object' &&
      Object.values(value as Record<string, unknown>).some(hasVoiceLearningCopy),
  )
}

/**
 * Convert only the assistant fields that are already approved for brand-voice
 * generation into the learning route's narrow, copy-only contract. This keeps
 * goals, research, evidence, URLs, metrics, prices, and notes out of edit review.
 */
export function buildBrandVoiceLearningSnapshot(
  kind: MarketingAssistKind,
  value: unknown,
): BrandVoiceLearningContentSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>

  if (kind === 'campaign') return { caption: voiceLearningText(record.positioning) }
  if (kind === 'funnel') return { frames: voiceLearningFrames(record.stages) }
  if (kind === 'calendarItem') {
    return {
      headline: voiceLearningText(record.title),
      callToAction: voiceLearningText(record.callToAction),
    }
  }
  if (kind === 'linkItem') {
    return {
      headline: voiceLearningText(record.title),
      caption: voiceLearningText(record.description),
    }
  }
  if (kind === 'template') {
    return {
      caption: voiceLearningText(record.positioning),
      frames: voiceLearningFrames(record.stages),
    }
  }
  if (kind !== 'strategyAsset') return {}

  if (record.assetType === 'cta') return { callToAction: voiceLearningText(record.ctaLabel) }
  if (record.assetType !== 'message') return {}

  const approvedPhrases = voiceLearningTextList(record.approvedPhrases)
  return {
    // coreClaim/supportingClaims are evidence-bearing claims, not style data.
    frames: approvedPhrases.map((title) => ({ title })),
  }
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
  const settingsClient = useClient({ apiVersion: API_VERSION })
  const voiceLearningProofClient = useMemo(
    () => settingsClient.withConfig({ dataset: OUTREACH_DATASET }),
    [settingsClient],
  )
  const [prompt, setPrompt] = useState('')
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState<MarketingAiSuggestion | null>(null)
  const [usedAi, setUsedAi] = useState<boolean | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [context, setContext] = useState<MarketingAiAssistResponse['context'] | null>(null)
  const [brandVoices, setBrandVoices] = useState<MarketingBrandVoice[]>([])
  const [brandVoiceKey, setBrandVoiceKey] = useState('')
  const [applied, setApplied] = useState(false)
  const [voiceLearningBaseline, setVoiceLearningBaseline] = useState<BrandVoiceLearningBaseline | null>(null)
  const [voiceLearningProposal, setVoiceLearningProposal] = useState<BrandVoiceLearningProposal | null>(null)
  const [voiceLearningProposalFingerprint, setVoiceLearningProposalFingerprint] = useState<string | null>(null)
  const [voiceLearningLoading, setVoiceLearningLoading] = useState(false)
  const [voiceLearningApplying, setVoiceLearningApplying] = useState(false)
  const [voiceLearningError, setVoiceLearningError] = useState<string | null>(null)
  const [voiceLearningNotice, setVoiceLearningNotice] = useState<string | null>(null)
  const copy = marketingAiAssistCopy[kind]
  const section = suggestion ? getAiSuggestionSection(suggestion, kind) : null
  const suggestedFields = section ? getAiSuggestedFieldLabels(section).slice(0, 8) : []
  const guidedQuestions = getMarketingAutofillQuestions(kind)
  const usesBrandVoice =
    ['campaign', 'funnel', 'calendarItem', 'linkItem', 'template'].includes(kind) ||
    (kind === 'strategyAsset' && ['message', 'cta'].includes(String(draft.assetType || '')))
  const activeBrandVoices = brandVoices.filter((voice) => voice.status === 'active')
  const defaultBrandVoice = activeBrandVoices.find((voice) => voice.isDefault) || activeBrandVoices[0] || null
  const voiceLearningAfter = voiceLearningBaseline
    ? buildBrandVoiceLearningSnapshot(kind, draft)
    : null
  const hasVoiceLearningEdits = Boolean(
    voiceLearningBaseline &&
      voiceLearningAfter &&
      hasMaterialVoiceEdit('contentDraft', voiceLearningBaseline.before, voiceLearningAfter),
  )
  const voiceLearningAfterFingerprint = voiceLearningAfter ? JSON.stringify(voiceLearningAfter) : null

  useEffect(() => {
    if (
      !voiceLearningProposal ||
      !voiceLearningProposalFingerprint ||
      voiceLearningAfterFingerprint === voiceLearningProposalFingerprint
    ) {
      return
    }
    setVoiceLearningProposal(null)
    setVoiceLearningProposalFingerprint(null)
    setVoiceLearningError(null)
    setVoiceLearningNotice('The draft changed after comparison. Compare it again for a fresh proposal.')
  }, [voiceLearningAfterFingerprint, voiceLearningProposal, voiceLearningProposalFingerprint])

  useEffect(() => {
    if (!usesBrandVoice) {
      setBrandVoices([])
      setBrandVoiceKey('')
      return
    }
    let active = true
    void settingsClient
      .fetch<unknown[]>(
        `*[_id == "marketingSettings"][0].brandVoices[]{_key, name, purpose, guidance, do, avoid, examples, status, isDefault}`,
      )
      .then((value) => {
        if (!active) return
        const found = normalizeMarketingBrandVoices(value)
        setBrandVoices(found)
        setBrandVoiceKey((current) =>
          current && !found.some((voice) => voice.status === 'active' && voice._key === current) ? '' : current,
        )
      })
      .catch(() => {
        if (active) setBrandVoices([])
      })
    return () => {
      active = false
    }
  }, [settingsClient, usesBrandVoice])

  const requestSuggestion = async () => {
    setLoading(true)
    setError('')
    setAiError(null)
    setApplied(false)
    setVoiceLearningBaseline(null)
    setVoiceLearningProposal(null)
    setVoiceLearningProposalFingerprint(null)
    setVoiceLearningError(null)
    setVoiceLearningNotice(null)
    try {
      const response = await fetch('/api/marketing/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...studioSessionHeader() },
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
          ...(usesBrandVoice && brandVoiceKey ? { brandVoiceKey } : {}),
        }),
      })
      const payload = (await response.json()) as MarketingAiAssistResponse
      if (!response.ok || !payload.suggestion) throw new Error(payload.error || 'The assistant could not create a suggestion.')
      setSuggestion(payload.suggestion)
      setUsedAi(!!payload.usedAi)
      setAiError(payload.usedAi ? null : payload.aiError || null)
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
    setVoiceLearningProposal(null)
    setVoiceLearningProposalFingerprint(null)
    setVoiceLearningError(null)
    setVoiceLearningNotice(null)
    const before = buildBrandVoiceLearningSnapshot(kind, section)
    setVoiceLearningBaseline(
      context?.brandVoice && hasVoiceLearningCopy(before)
        ? {
            voiceKey: context.brandVoice.key,
            voiceName: context.brandVoice.name,
            before,
          }
        : null,
    )
  }

  const requestVoiceLearningProposal = async () => {
    if (!voiceLearningBaseline || !voiceLearningAfter || !hasVoiceLearningEdits) return
    setVoiceLearningLoading(true)
    setVoiceLearningError(null)
    setVoiceLearningNotice(null)
    setVoiceLearningProposalFingerprint(null)
    try {
      const payload = await authenticatedMarketingRequest<{
        proposal?: BrandVoiceLearningProposal
        error?: string
      }>(
        '/api/marketing/brand-voice/learn',
        {
          action: 'propose',
          voiceKey: voiceLearningBaseline.voiceKey,
          surface: 'contentDraft',
          before: voiceLearningBaseline.before,
          after: voiceLearningAfter,
        },
        'POST',
        voiceLearningProofClient,
      )
      if (!payload.proposal) {
        throw new Error(payload.error || 'The voice-learning proposal could not be prepared.')
      }
      if (payload.proposal.voice.key !== voiceLearningBaseline.voiceKey) {
        throw new Error('The learning service returned a proposal for the wrong voice.')
      }
      setVoiceLearningProposal(payload.proposal)
      setVoiceLearningProposalFingerprint(voiceLearningAfterFingerprint)
    } catch (requestError) {
      setVoiceLearningError(
        requestError instanceof Error
          ? requestError.message
          : 'The voice-learning proposal could not be prepared.',
      )
    } finally {
      setVoiceLearningLoading(false)
    }
  }

  const applyVoiceLearning = async (selection: BrandVoiceLearningSelection) => {
    if (!voiceLearningProposal || voiceLearningApplying) return
    setVoiceLearningApplying(true)
    setVoiceLearningError(null)
    try {
      const payload = await authenticatedMarketingRequest<{
        applied?: boolean
        voice?: { key: string; name: string }
        error?: string
      }>(
        '/api/marketing/brand-voice/learn',
        { action: 'apply', proposal: voiceLearningProposal, selection },
        'POST',
        voiceLearningProofClient,
      )
      if (!payload.applied || payload.voice?.key !== voiceLearningProposal.voice.key) {
        throw new Error(payload.error || 'The selected voice learning could not be applied.')
      }
      setVoiceLearningNotice(
        `${payload.voice.name} was updated. This draft did not change; the approved learning will guide future drafts.`,
      )
      setVoiceLearningProposal(null)
      setVoiceLearningProposalFingerprint(null)
      setVoiceLearningBaseline(null)
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'The selected voice learning could not be applied.'
      const proposalIsStale =
        /revision|settings changed|conflict|stale|expired|was modified/i.test(message)
      if (proposalIsStale) {
        setVoiceLearningProposal(null)
        setVoiceLearningProposalFingerprint(null)
      }
      setVoiceLearningError(
        proposalIsStale
          ? 'The brand voice changed after this proposal was prepared. Compare the edited draft again for a fresh proposal.'
          : message,
      )
    } finally {
      setVoiceLearningApplying(false)
    }
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
      {usesBrandVoice && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <label style={{ ...styles.small, fontWeight: 800 }}>
            Writing voice{' '}
            <select
              aria-label={`Writing voice for ${copy.target} autofill`}
              style={{ ...styles.input, width: 'auto', minWidth: 190, marginLeft: 6 }}
              value={brandVoiceKey}
              onChange={(event) => setBrandVoiceKey(event.currentTarget.value)}
            >
              <option value="">
                Suite default{defaultBrandVoice ? ` — ${defaultBrandVoice.name}` : ' — neutral fallback'}
              </option>
              {activeBrandVoices.map((voice) => (
                <option key={voice._key} value={voice._key}>
                  {voice.name}{voice.purpose ? ` — ${voice.purpose}` : ''}
                </option>
              ))}
            </select>
          </label>
          <span style={{ ...styles.small, ...styles.muted }}>
            Style only; evidence, claims, URLs, metrics, and rationale stay neutral.
          </span>
        </div>
      )}
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
                color: '#4dc4d6',
                fontWeight: 800,
              }}
            >
              {usedAi ? 'AI generated' : 'Rule-based draft'}
            </span>
            {context?.brandVoice && (
              <span style={{ ...styles.small, ...styles.muted }}>
                Voice: {context.brandVoice.name}{context.brandVoice.selection === 'requested' ? ' (selected)' : ' (suite default)'}
              </span>
            )}
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
            <div style={{ ...styles.small, lineHeight: 1.45 }}>
              <strong style={{ color: '#d6a93f' }}>Fallback — AI unavailable.</strong>{' '}
              <span style={styles.muted}>
                This is not researched evidence. It is a deterministic draft from the current CMS state and should be
                reviewed before saving. Try again for an AI draft.
                {aiError ? ` (Reason: ${aiError})` : ''}
              </span>
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
            <div style={{ ...styles.small, color: '#4dc4d6', fontWeight: 800 }}>
              Applied. Review the filled fields, then save this item.
            </div>
          )}
          {applied && voiceLearningBaseline && !voiceLearningProposal && (
            <div
              data-brand-voice-learning-entry="true"
              style={{ ...styles.guidePanel, boxShadow: 'none', padding: 10 }}
            >
              <strong style={{ fontSize: 13 }}>Teach {voiceLearningBaseline.voiceName} from your edits</strong>
              <div style={{ ...styles.small, ...styles.muted, lineHeight: 1.45, marginTop: 4 }}>
                Edit the outward-facing fields first, then compare them with the generated version. You will review
                any reusable principles before the voice changes; factual fields are excluded.
              </div>
              <button
                type="button"
                data-testid={`marketing-voice-learning-compare-${kind}`}
                style={{ ...styles.button, marginTop: 8 }}
                disabled={!hasVoiceLearningEdits || voiceLearningLoading}
                onClick={() => void requestVoiceLearningProposal()}
              >
                {voiceLearningLoading
                  ? 'Comparing edits…'
                  : hasVoiceLearningEdits
                    ? 'Compare edits with generated copy'
                    : 'Make a wording edit to compare'}
              </button>
            </div>
          )}
          {voiceLearningProposal && (
            <BrandVoiceLearningReview
              proposal={voiceLearningProposal}
              applying={voiceLearningApplying}
              error={voiceLearningError}
              onApply={applyVoiceLearning}
              onDismiss={() => {
                setVoiceLearningProposal(null)
                setVoiceLearningProposalFingerprint(null)
                setVoiceLearningBaseline(null)
                setVoiceLearningError(null)
                setVoiceLearningNotice('Voice-learning proposal dismissed. The current draft was not changed.')
              }}
            />
          )}
          {voiceLearningError && !voiceLearningProposal && (
            <div role="alert" style={{ ...styles.small, color: '#d98a8a', lineHeight: 1.45 }}>
              {voiceLearningError}
            </div>
          )}
          {voiceLearningNotice && (
            <div role="status" style={{ ...styles.small, color: '#4dc4d6', fontWeight: 800, lineHeight: 1.45 }}>
              {voiceLearningNotice}
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
      <div style={{ ...styles.small, color: '#4dc4d6', fontWeight: 900, marginBottom: 8 }}>
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


export function AnalyticsMetricCard({
  label,
  value,
  detail,
  tone = 'ok',
}: {
  label: string
  value: string
  detail: string
  tone?: 'ok' | 'warn' | 'risk'
}) {
  const accent = tone === 'risk' ? '#E36216' : tone === 'warn' ? '#b8860b' : null
  return (
    <div
      style={{
        ...styles.card,
        padding: 14,
        boxShadow: 'none',
        ...(accent ? { borderLeft: `4px solid ${accent}` } : null),
      }}
    >
      <div style={{ ...styles.small, ...styles.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4, ...(accent ? { color: accent } : null) }}>{value}</div>
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
    <div
      id={id}
      aria-label={`${title}: ${done} of ${items.length} complete`}
      role="group"
      style={{ ...styles.panel, boxShadow: 'none', padding: 12, borderColor: done === items.length ? 'rgba(54, 139, 87, 0.35)' : 'var(--card-border-color)', scrollMarginTop: 18 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
        <span style={{ ...styles.small, ...styles.muted }}>{done}/{items.length}</span>
      </div>
      <div role="list" style={{ display: 'grid', gap: 7 }}>
        {items.map((item) => (
          <div key={item.label} role="listitem" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
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
                color: item.done ? '#fff' : 'var(--card-muted-fg-color)',
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              {item.done ? '✓' : '–'}
            </span>
            <span style={item.done ? styles.muted : undefined}>
              <strong style={{ color: item.done ? '#368b57' : 'var(--card-muted-fg-color)', fontSize: 11 }}>
                {item.done ? 'Done' : 'To do'}:
              </strong>{' '}
              {item.label}
            </span>
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
  unsavedId = MARKETING_UNSAVED_FORM_ID,
  unsavedLabel = 'form fields you edited',
  trackUnsaved = true,
  children,
}: {
  label: string
  help?: string
  unsavedId?: string
  unsavedLabel?: string
  trackUnsaved?: boolean
  children: React.ReactNode
}) {
  const { markUnsavedChange } = useMarketingUnsavedGuard()

  return (
    <label
      style={{ display: 'block', minWidth: 0 }}
      onChangeCapture={() => {
        if (trackUnsaved) markUnsavedChange(unsavedId, unsavedLabel)
      }}
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
  ariaLabel,
}: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select
      aria-label={ariaLabel}
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
