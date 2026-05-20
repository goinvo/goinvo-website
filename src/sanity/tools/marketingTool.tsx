import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { definePlugin, type Tool, useClient } from 'sanity'
import {
  CalendarIcon,
  CloseIcon,
  DashboardIcon,
  LaunchIcon,
  LinkIcon,
  MasterDetailIcon,
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
import { marketingTemplateKindOptions, marketingTemplateStatusOptions } from '../schemas/marketingTemplate'

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
    "campaign": campaign->{_id, title, status},
    "funnel": funnel->{_id, title, status},
    "analyticsSource": analyticsSource->{_id, title, provider, status},
    "channelRef": channelRef->{_id, title, key, status, platform, contentTypes[]{_key, label, value, description}}
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
    successMetrics[]{label, target, "source": source->{_id, title, provider, status}}
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
    "analyticsSources": analyticsSources[]->{_id, title, provider, status}
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
    "calendarItems": calendarItems[]->{_id, title, status, publishAt, workingUrl, publishedUrl, channel}
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
  | 'calendar'
  | 'campaigns'
  | 'funnels'
  | 'templates'
  | 'channels'
  | 'analytics'
  | 'linkTree'
type MarketingAssistKind = 'campaign' | 'funnel' | 'calendarItem' | 'channel' | 'analyticsSource' | 'linkItem' | 'template'

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
  workingUrl?: string
  publishedUrl?: string
  linkItems?: MarketingLinkItem[]
  callToAction?: string
  utmCampaign?: string
  funnelStage?: string
  campaign?: RefSummary
  funnel?: RefSummary
  channelRef?: MarketingChannel
  analyticsSource?: RefSummary
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
  channels?: string[]
  successMetrics?: Array<{ _key?: string; label?: string; target?: string }>
  designerGuidance?: string[]
  notes?: string
  conversionGoal?: string
  stages?: FunnelStage[]
}

interface MarketingData {
  calendarItems: MarketingCalendarItem[]
  campaigns: MarketingCampaign[]
  funnels: MarketingFunnel[]
  analyticsSources: MarketingAnalyticsSource[]
  channels: MarketingChannel[]
  linkItems: MarketingLinkItem[]
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

const EMPTY_DATA: MarketingData = {
  calendarItems: [],
  campaigns: [],
  funnels: [],
  analyticsSources: [],
  channels: [],
  linkItems: [],
  templates: [],
}

const statusColors: Record<string, { bg: string; fg: string; border: string }> = {
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
    background: 'rgba(0, 115, 133, 0.08)',
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

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const nextData = await client.fetch<MarketingData>(MARKETING_QUERY)
      setData({
        calendarItems: nextData.calendarItems || [],
        campaigns: nextData.campaigns || [],
        funnels: nextData.funnels || [],
        analyticsSources: nextData.analyticsSources || [],
        channels: nextData.channels || [],
        linkItems: nextData.linkItems || [],
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

  const activeView = MARKETING_TOOL_VIEWS.find((candidate) => candidate.id === view) || MARKETING_TOOL_VIEWS[0]

  return (
    <div data-marketing-tool="true" style={styles.shell}>
      <style>{MARKETING_CONTROL_CSS}</style>
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.h1}>Marketing</h1>
            <p style={styles.subtitle}>
              Plan content, campaigns, funnels, channels, and analytics from one operational workspace.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {lastLoaded && <span style={{ ...styles.muted, ...styles.small }}>Updated {lastLoaded}</span>}
            <a href="/studio/getting-started?article=marketing.overview" style={styles.button}>
              <LaunchIcon style={{ width: 15, height: 15 }} />
              Marketing guide
            </a>
            <button type="button" style={styles.button} onClick={() => void loadData()}>
              Refresh
            </button>
          </div>
        </div>

        <nav style={styles.nav} aria-label="Marketing sections">
          {MARKETING_TOOL_VIEWS.map((candidate) => (
            <MarketingNavButton
              key={candidate.id}
              view={candidate}
              active={candidate.id === activeView.id}
              onClick={() => setView(candidate.id)}
            />
          ))}
        </nav>

        {!loading && <MarketingGuidanceWidget data={data} onOpenView={setView} />}

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

function MarketingGuidanceWidget({
  data,
  onOpenView,
}: {
  data: MarketingData
  onOpenView: (view: MarketingViewId) => void
}) {
  const [open, setOpen] = useState(false)
  const items = getMarketingAttentionItems(data)
  const attentionCount = items.length
  const openViewFromGuide = (view: MarketingViewId) => {
    onOpenView(view)
    setOpen(false)
  }

  return (
    <div style={styles.guideWidget}>
      {open && (
        <section style={{ ...styles.guidePanel, ...styles.guidePopover }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ ...styles.kicker, marginBottom: 6 }}>Designer workflow</div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Set up the system, then make the content.</h2>
            </div>
            <button
              type="button"
              aria-label="Close designer workflow"
              style={{ ...styles.button, width: 34, height: 34, padding: 0 }}
              onClick={() => setOpen(false)}
            >
              <CloseIcon style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <p style={{ ...styles.muted, margin: '0 0 12px', lineHeight: 1.55 }}>
            The workflow should make the marketing decisions explicit enough that designers only need to create the actual post, page, image, or email.
          </p>
          <DesignerSetupPath steps={workflowSetupSteps} onOpenView={openViewFromGuide} />
          <WorkflowHelpSection items={workflowHelpItems} onOpenView={openViewFromGuide} />
          <div style={{ ...styles.card, boxShadow: 'none', padding: 12 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>Needs attention</h3>
            {items.length === 0 ? (
              <div style={{ ...styles.small, ...styles.muted }}>Nothing is flagged right now.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {items.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      openViewFromGuide(item.view)
                    }}
                    style={{
                      ...styles.templateButton,
                      borderColor: item.severity === 'content' ? 'rgba(227, 98, 22, 0.45)' : 'var(--card-border-color)',
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{item.title}</strong>
                    <span style={{ ...styles.small, ...styles.muted }}>{item.detail}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        style={styles.guideToggle}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <DashboardIcon style={{ width: 18, height: 18 }} />
        Designer workflow
        {attentionCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              minWidth: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              background: '#E36216',
              color: '#fff',
              fontSize: 12,
            }}
          >
            {attentionCount}
          </span>
        )}
      </button>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState<MarketingAiSuggestion | null>(null)
  const [usedAi, setUsedAi] = useState<boolean | null>(null)
  const [context, setContext] = useState<MarketingAiAssistResponse['context'] | null>(null)
  const [applied, setApplied] = useState(false)
  const copy = marketingAiAssistCopy[kind]
  const section = suggestion ? getAiSuggestionSection(suggestion, kind) : null
  const suggestedFields = section ? getAiSuggestedFieldLabels(section).slice(0, 8) : []

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
          draft,
          prompt,
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
          <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>AI setup assistant</h3>
          <p style={{ ...styles.small, ...styles.muted, margin: 0, lineHeight: 1.5 }}>
            Creates a starter {copy.target} from the current draft, GoInvo site context, analytics takeaways, and best-practice prompts for designers.
          </p>
        </div>
        <button
          type="button"
          data-testid={`marketing-ai-suggest-${kind}`}
          style={{ ...styles.button, whiteSpace: 'nowrap' }}
          disabled={loading}
          onClick={() => void requestSuggestion()}
        >
          {loading ? 'Thinking...' : 'Suggest setup'}
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
        aria-label={`Describe what this ${copy.target} should support`}
        rows={2}
        style={{ ...styles.input, marginTop: 10 }}
        value={prompt}
        onChange={(event) => setPrompt(event.currentTarget.value)}
        placeholder={copy.prompt}
      />
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
              {usedAi ? 'AI generated' : 'Starter rules'}
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
                  {dayItems.slice(0, 4).map((item) => (
                    <CalendarChip key={item._id} item={item} channels={channels} active={item._id === selectedId} />
                  ))}
                  {dayItems.length > 4 && (
                    <div style={{ ...styles.small, ...styles.muted }}>+{dayItems.length - 4} more</div>
                  )}
                </div>
              </button>
            )
          })}
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
}: {
  item: MarketingCalendarItem
  channels: MarketingChannel[]
  active: boolean
}) {
  const colors = getStatusColor(item.status)
  const channel = getChannelByKey(channels, item.channel) || item.channelRef
  const contentTypeOptionsForChannel = getContentTypeOptionsForChannel(item.channel, channels)

  return (
    <div
      style={{
        padding: '6px 7px',
        border: `1px solid ${active ? '#007385' : colors.border}`,
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
      callToAction: draft.callToAction,
      workingUrl: draft.workingUrl,
      publishedUrl: draft.publishedUrl,
      utmCampaign: draft.utmCampaign,
      funnelStage: draft.funnelStage,
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
