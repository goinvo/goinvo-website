import {
  CalendarIcon,
  DashboardIcon,
  LinkIcon,
  MasterDetailIcon,
  RocketIcon,
  SearchIcon,
  TagIcon,
  TargetIcon,
  TrendUpwardIcon,
  UsersIcon,
} from '@sanity/icons'
import { analyticsProviderOptions } from '../../schemas/marketingAnalyticsSource'
import { contentTypeOptions } from '../../schemas/marketingCalendarItem'
import { campaignObjectiveOptions } from '../../schemas/marketingCampaign'
import { channelPlatformOptions } from '../../schemas/marketingChannel'
import { funnelStageOptions } from '../../schemas/marketingFunnel'
import { experimentTargetTypeOptions } from '../../schemas/marketingExperiment'
import {
  researchConfidenceOptions,
  researchPlanCadenceOptions,
} from '../../schemas/marketingResearchPlan'
import {
  researchProjectStatusOptions,
  researchProjectTypeOptions,
} from '../../schemas/marketingResearchProject'
import { researchResultTypeOptions } from '../../schemas/marketingResearchResult'
import { DESIGNER_WORKFLOW_TUTORIAL_STORAGE_KEY } from '../../tutorials/designerWorkflowTutorials'
import { normalizeContentTypes } from './shared'
import type { AbTestingEditorTab, ChannelContentType } from './types'
import {
  addDays,
  dateInputToIso,
  inferResearchProjectType,
  inferTargetQueries,
  inferTopicCluster,
  randomKey,
  refsFromIds,
  slugify,
  startOfMonth,
  toDateInputValue,
  uniqueById,
} from '@/lib/marketing'
import type {
  AbTestingComparisonResult,
  AbTestingComparisonScoreboard,
  AbTestingComparisonStatus,
  AbTestingComparisonSummary,
  AbTestingInsight,
  AbTestingMetricEvidence,
  AbTestingMetricOutcome,
  AbTestingSignalMetricRecord,
  AbTestingVariantEventCell,
  AbTestingVariantEventRow,
  AbTestingVariantOption,
  AnalyticsInterpretation,
  AutopilotCompletionAction,
  AutopilotCompletionSignal,
  AutopilotStepStatus,
  AutopilotWorkspaceTarget,
  CalendarDisplayGroup,
  CalendarItemTemplate,
  CampaignTemplate,
  CarouselWizardResult,
  DesignerWizardMode,
  DesignerWorkflowSession,
  DraftContentFrame,
  ExperimentSuccessTracker,
  ExperimentTrackedMetric,
  FunnelStage,
  FunnelTemplate,
  MarketingAiSuggestion,
  MarketingAnalyticsSource,
  MarketingAssistantAction,
  MarketingAssistantSessionSummary,
  MarketingAssistKind,
  MarketingAttentionItem,
  MarketingAudienceProfile,
  MarketingAutopilotPlan,
  MarketingAutopilotStep,
  MarketingCalendarItem,
  MarketingCampaign,
  MarketingChannel,
  MarketingCta,
  MarketingDashboardGap,
  MarketingData,
  MarketingDocumentInput,
  MarketingExperiment,
  MarketingFunnel,
  MarketingLinkItem,
  MarketingMessagePillar,
  MarketingPerformanceSignal,
  MarketingPlanQuestionnaire,
  MarketingProofPoint,
  MarketingQualityGate,
  MarketingResearchPlan,
  MarketingResearchProject,
  MarketingResearchResult,
  MarketingStrategistActionKind,
  MarketingStrategistMessage,
  MarketingTemplate,
  MarketingTrackingRule,
  MarketingViewId,
  PerformanceSignalMetric,
  RecordAutopilotFit,
  ReferenceValue,
  RefSummary,
  ResearchAssumption,
  ResearchCollaboration,
  ResearchContentOpportunity,
  ResearchContentPillar,
  ResearchEvidenceNote,
  ResearchInspirationDraft,
  ResearchMeasurementGoal,
  ResearchProjectCollaborator,
  ResearchQuestion,
  ResearchRecommendedChannel,
  ResearchReleaseWindow,
  ResearchSeoTarget,
  ResearchStrategyAdjustment,
  SavedCalendarDisplayGroup,
  SelectOption,
  StrategyAssetAutopilotFit,
  StrategyAssetKind,
  StrategyAssistantRecommendation,
  StudioClient,
  SuccessMetric,
} from '../../tools/marketingTool'


const DESIGNER_WORKFLOW_SESSIONS_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.sessions.v2'
const DESIGNER_WORKFLOW_ACTIVE_SESSION_STORAGE_KEY = 'goinvo.marketing.designerWorkflow.activeSession.v2'
const DESIGNER_WORKFLOW_TUTORIAL_SEEN_STORAGE_KEY = 'goinvo.marketing.autopilot.tutorials.seen.v1'

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
    id: 'outreach',
    title: 'Outreach',
    description: 'Dump warm contacts, research each for opportunity fit, and work a ranked call plan.',
    icon: UsersIcon,
  },
  {
    id: 'workEvidence',
    title: 'Evidence',
    description: 'Capability evidence extracted from real case studies — what research matches contacts against.',
    icon: SearchIcon,
  },
  {
    id: 'abTesting',
    title: 'Measure',
    description: 'A/B tests plus analytics sources and measurement readiness.',
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

// Top-level information architecture: the flat view list above collapses into 5 task-shaped
// surfaces. The top nav renders MARKETING_SURFACES (not the flat view list); each surface has a
// landing view plus sub-tabs that map back to the underlying views. The per-view render blocks
// and getMarketingViewTitle (deep links) keep using the full view list, so nothing downstream
// breaks. PRIMARY_MARKETING_VIEW_IDS is retained for the public export contract / tests.
export type MarketingSurfaceTab = { view: MarketingViewId; label: string; group?: string }
export type MarketingSurface = {
  id: string
  title: string
  description: string
  icon: typeof CalendarIcon
  landingView: MarketingViewId
  tabs: MarketingSurfaceTab[]
}

export const MARKETING_SURFACES: MarketingSurface[] = [
  {
    id: 'home',
    title: 'Home',
    description: 'Your next best actions, ranked. Start here.',
    icon: DashboardIcon,
    landingView: 'dashboard',
    tabs: [{ view: 'dashboard', label: 'Overview' }],
  },
  {
    id: 'plan',
    title: 'Plan',
    description: 'Research, SEO, and the strategy questions content needs before design.',
    icon: SearchIcon,
    landingView: 'research',
    tabs: [
      { view: 'research', label: 'Research' },
      { view: 'seo', label: 'SEO' },
      { view: 'strategy', label: 'Strategy Q&A' },
      { view: 'strategyBrief', label: 'Positioning' },
    ],
  },
  {
    id: 'outreach',
    title: 'Outreach',
    description: 'Reach out to people you already know — paste contacts, get a researched call plan.',
    icon: UsersIcon,
    landingView: 'outreach',
    tabs: [
      { view: 'outreach', label: 'Contacts & call plan' },
      { view: 'workEvidence', label: 'Evidence' },
    ],
  },
  {
    id: 'make',
    title: 'Make',
    description: 'Build and schedule content, plus the campaigns and funnels behind it.',
    icon: CalendarIcon,
    landingView: 'calendar',
    tabs: [
      { view: 'calendar', label: 'Calendar', group: 'Content' },
      { view: 'linkTree', label: 'Quick Links', group: 'Content' },
      { view: 'campaigns', label: 'Campaigns', group: 'Structure' },
      { view: 'funnels', label: 'Funnels', group: 'Structure' },
      { view: 'templates', label: 'Templates', group: 'Structure' },
    ],
  },
  {
    id: 'measure',
    title: 'Measure',
    description: 'A/B tests plus analytics sources and measurement readiness.',
    icon: TrendUpwardIcon,
    landingView: 'abTesting',
    tabs: [
      { view: 'abTesting', label: 'A/B tests' },
      { view: 'analytics', label: 'Analytics sources' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Channels, publishing defaults, and the AI model.',
    icon: TagIcon,
    landingView: 'channels',
    tabs: [{ view: 'channels', label: 'Channels' }],
  },
]

export function getMarketingSurfaceForView(view: MarketingViewId): MarketingSurface {
  return (
    MARKETING_SURFACES.find((surface) => surface.tabs.some((tab) => tab.view === view)) ||
    MARKETING_SURFACES[0]
  )
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
      const underpowered = getAbTestingUnderpoweredMetrics(experiment)
      const lowSample = underpowered.length > 0
      insights.push({
        id: `abtest-data-neutral-${experiment._id}`,
        severity: 'opportunity',
        title: lowSample
          ? `${experimentTitle} does not have enough events to call yet`
          : `${experimentTitle} needs a clearer result comparison`,
        interpretation: lowSample
          ? `Too few events so far on ${underpowered.slice(0, 4).join(', ')} to tell the versions apart — the difference is within normal variation.`
          : `${sampleAffected(neutralEvidence).join('; ')} ${neutralEvidence.length === 1 ? 'has' : 'have'} evidence attached, but no change value or threshold comparison.`,
        action: lowSample
          ? 'Keep the test running until each version has more events for the tracked metrics, then review the result here.'
          : 'Add variant-keyed visits/exposures and event counts to the linked signal. Include a percent change, baseline comparison, or threshold when the event count should decide the winner.',
        affected: lowSample ? underpowered.slice(0, 4) : sampleAffected(neutralEvidence),
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
      let outcome = evaluateAbTestingMetricOutcome(tracker, match.metric)
      // Too few events on either side to trust a winner OR (worse) a guardrail
      // FAILURE — a rate delta on a handful of events is denominator noise, so it
      // must not read as the variant harming a protected metric. Only applies when
      // per-variant counts are resolvable, so change-only signals are unaffected.
      if (abTestingMetricIsUnderpowered(getAbTestingMetricVariantCounts(experiment, trackedMetric))) {
        outcome = 'neutral'
      }
      evidence.push({
        experiment,
        tracker,
        trackedMetric,
        signal: match.signal,
        signalMetric: match.metric,
        outcome,
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

// Minimum per-variant EVENT count before a directional winner / guardrail call is
// trusted. Distinct from AB_MIN_EXPOSURES_PER_VARIANT (which gates visits): a test
// can have plenty of visits but only a handful of conversions, where a rate delta
// (e.g. 3 vs 3 events reading as "-14%") is just denominator variance, not signal.
// A low bar that kills single-digit noise without changing the call once a metric
// has a real number of events.
const AB_MIN_EVENTS_PER_VARIANT = 10

interface AbTestingMetricCounts {
  control: number | null
  variant: number | null
}

/** Per-variant event counts for one tracked metric (null when unresolved). */
function getAbTestingMetricVariantCounts(
  experiment: MarketingExperiment,
  trackedMetric: ExperimentTrackedMetric,
): AbTestingMetricCounts {
  const variants = getAbTestingVariantOptions(experiment)
  if (variants.length < 2) return { control: null, variant: null }
  const controlVariant = variants.find((v) => normalizeAbTestingMetricKey(v.key) === 'control') || variants[0]
  const treatmentVariant = variants.find((v) => v.key !== controlVariant.key) || variants[1]
  const records = getAbTestingSignalMetricRecords(experiment)
  const valueFor = (variant: AbTestingVariantOption) =>
    numericPerformanceMetricValue(findAbTestingMetricForVariant(records, variant, trackedMetric, false)?.metric)
  return { control: valueFor(controlVariant), variant: valueFor(treatmentVariant) }
}

/**
 * True when either variant has too few events to trust a directional call. Only
 * applies when both counts are resolvable (a change-only signal with no per-variant
 * counts keeps its existing behavior).
 */
function abTestingMetricIsUnderpowered(counts: AbTestingMetricCounts): boolean {
  return (
    counts.control !== null &&
    counts.variant !== null &&
    Math.min(counts.control, counts.variant) < AB_MIN_EVENTS_PER_VARIANT
  )
}

/** Comparative metrics whose per-variant event counts are too few to call yet. */
function getAbTestingUnderpoweredMetrics(experiment: MarketingExperiment): string[] {
  const labels: string[] = []
  for (const metric of getAbTestingComparableMetrics(experiment)) {
    if (abTestingMetricIsUnderpowered(getAbTestingMetricVariantCounts(experiment, metric))) {
      labels.push(metric.label || metric.key || metric.eventName || 'metric')
    }
  }
  return labels
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

    const counts = getAbTestingMetricVariantCounts(experiment, trackedMetric)
    // Control has no events for this metric → no baseline to compare against, so
    // there is no winner to call (a "+∞%" lift off a zero baseline is not meaningful).
    if (counts.control === 0) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'No winner yet',
        detail: `${controlLabel} has no events for this metric yet, so there is no baseline to compare ${variantLabel} against.`,
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

    // Too few events on either side to trust a directional call — a rate delta on a
    // handful of events (e.g. 3 vs 3) is denominator noise, not a real winner.
    if (abTestingMetricIsUnderpowered(counts)) {
      return {
        key,
        metricLabel,
        metricRole,
        winnerLabel: 'Too few events',
        detail: `Only ${counts.control} vs ${counts.variant} events so far — too few to call a winner on this metric.`,
        status: 'even',
        changeValue,
        score: 10,
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
      label: 'No winner yet',
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
  // Wait-state readouts (too few events / neutral so far): nothing is broken, the advice is
  // "keep it running" — so link to the readout instead of offering an evidence-repair CTA.
  if ((insight.id || '').startsWith('abtest-data-neutral')) {
    return {
      label: 'Open result readout',
      tab: 'results',
      sectionId: 'ab-test-results-evidence',
    }
  }

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
      action: `Open ${getMarketingViewTabLabel(item.view)} and fill the missing setup fields.`,
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
    title: 'Autopilot: ask the strategist',
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
    title: 'Autopilot: guided checklist',
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

  // Outreach data lives in the private dataset (not in MarketingData), so these two use a
  // static baseline score instead of a data-driven one.
  addAction({
    id: 'work-call-plan',
    title: 'Work the call plan',
    description: 'Paste warm contacts, research each one, and call in ranked order.',
    reason: 'Open Outreach to see follow-ups due, log calls, and pick tailored offers.',
    tags: ['outreach', 'calls', 'call plan', 'contacts', 'follow up', 'warm network', 'leads'],
    recommended: false,
    score: 72,
    view: 'outreach',
  })

  addAction({
    id: 'review-work-evidence',
    title: 'Review work evidence',
    description: 'See the shipped work outreach research points contacts at.',
    reason: 'Open Evidence to extract capabilities from case studies or tune the records.',
    tags: ['evidence', 'case studies', 'capabilities', 'outreach', 'work'],
    recommended: false,
    score: 60,
    view: 'workEvidence',
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

  // Scarce-recommendation override: rather than every action self-flagging `recommended`,
  // rank by score and mark only the few highest-scoring actions, so "Recommended" stays a
  // meaningful signal instead of appearing on nearly everything.
  const RECOMMEND_SCORE_THRESHOLD = 70
  const MAX_RECOMMENDED = 3
  const ranked = [...actions].sort((first, second) => {
    if (second.score !== first.score) return second.score - first.score
    return first.title.localeCompare(second.title)
  })
  let recommendedCount = 0
  for (const action of ranked) {
    action.recommended = recommendedCount < MAX_RECOMMENDED && action.score >= RECOMMEND_SCORE_THRESHOLD
    if (action.recommended) recommendedCount += 1
  }
  return ranked
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

// The label a user actually sees on the surface they land on. After the IA rework a view's
// flat title can differ from its sub-tab label (e.g. research → "Research" tab, abTesting →
// "A/B tests" tab, analytics → "Analytics sources"). "Open X" CTAs must use THIS so
// the destination word matches the tab, not the old flat title (which also collides with
// surface names like "Measure").
export function getMarketingViewTabLabel(viewId: MarketingViewId): string {
  const surface = getMarketingSurfaceForView(viewId)
  const tab = surface.tabs.find((candidate) => candidate.view === viewId)
  return tab?.label || getMarketingViewTitle(viewId)
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

export function getCampaignTemplates(data?: Pick<MarketingData, 'templates'>) {
  const managed = (data?.templates || [])
    .filter((template) => template.kind === 'campaign' && template.status !== 'archived')
    .map(marketingTemplateToCampaignTemplate)
    .filter((template): template is CampaignTemplate => !!template)
  return [...managed, ...CAMPAIGN_TEMPLATES]
}

export function getFunnelTemplates(data?: Pick<MarketingData, 'templates'>) {
  const managed = (data?.templates || [])
    .filter((template) => template.kind === 'funnel' && template.status !== 'archived')
    .map(marketingTemplateToFunnelTemplate)
    .filter((template): template is FunnelTemplate => !!template)
  return [...managed, ...FUNNEL_TEMPLATES]
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
      requiredAction: 'Open the "What can we trust?" step and trust at least one credible finding.',
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
    title: typeof record.title === 'string' ? record.title : 'Autopilot setup',
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

function loadDesignerWorkflowTutorialSeen(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DESIGNER_WORKFLOW_TUTORIAL_SEEN_STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function hasDesignerWorkflowTutorialBeenSeen(tutorialId: string) {
  return Boolean(loadDesignerWorkflowTutorialSeen()[tutorialId])
}

function markDesignerWorkflowTutorialSeen(tutorialId: string) {
  if (typeof window === 'undefined') return
  const seen = loadDesignerWorkflowTutorialSeen()
  window.localStorage.setItem(DESIGNER_WORKFLOW_TUTORIAL_SEEN_STORAGE_KEY, JSON.stringify({ ...seen, [tutorialId]: true }))
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
    console.error('Autopilot sessions could not load:', err)
    return []
  }
}

function saveDesignerWorkflowSessions(sessions: DesignerWorkflowSession[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DESIGNER_WORKFLOW_SESSIONS_STORAGE_KEY, JSON.stringify(sessions.filter((session) => !session.ephemeral).slice(0, 24)))
  } catch (err) {
    console.error('Autopilot sessions could not save:', err)
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
        ...(typeof record.usedAi === 'boolean' ? { usedAi: record.usedAi } : {}),
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
      'Autopilot strategy agent should recommend the next setup move based on the full marketing state.',
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
      internalNotes: 'Rule-based fallback from Autopilot. Get evidence and trust useful findings before creating campaign, funnel, calendar, or Quick Link drafts.',
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
        'Open the "What can we trust?" step for the latest project.',
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
    internalNotes: 'Created by Autopilot. Get evidence and trust useful findings before creating setup drafts.',
  }
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


export {
  autopilotPlanFingerprint,
  autopilotTargetForStep,
  buildCarouselFramePlan,
  buildDesignerWorkflowDemoRecommendation,
  buildDesignerWorkflowDemoResult,
  buildFallbackWizardStrategySuggestion,
  buildStrategistChatDraft,
  buildWizardStrategyDraft,
  buildWizardStrategyPrompt,
  createDesignerWorkflowSession,
  defaultMarketingPlanQuestionnaire,
  formatDashboardDate,
  formatWorkflowSessionTime,
  generateInstagramCarouselSetup,
  generateQuestionnaireMarketingPlan,
  getAiSuggestedFieldLabels,
  getAiSuggestionSection,
  getAutopilotCurrentIndex,
  getMarketingAttentionItems,
  getMarketingDashboardGaps,
  getMarketingDashboardStats,
  getStrategyAssistantRecommendation,
  getWizardCreationSummary,
  hasDesignerWorkflowTutorialBeenSeen,
  hasDesignerWorkflowTutorialCompleted,
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
}
