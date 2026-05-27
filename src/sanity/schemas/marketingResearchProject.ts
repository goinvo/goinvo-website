import { defineField, defineType } from 'sanity'
import { campaignObjectiveOptions } from './marketingCampaign'
import {
  collaborationRelationshipOptions,
  collaborationStatusOptions,
  contributionTypeOptions,
  opportunityReadinessOptions,
  researchMethodOptions,
} from './marketingResearchPlan'

const researchProjectStatusOptions = [
  { title: 'Draft', value: 'draft' },
  { title: 'Researching', value: 'researching' },
  { title: 'Reviewing Results', value: 'reviewing' },
  { title: 'Ready to Synthesize', value: 'readyToSynthesize' },
  { title: 'Converted', value: 'converted' },
  { title: 'Archived', value: 'archived' },
]

const researchProjectTypeOptions = [
  { title: 'Topic research', value: 'topic' },
  { title: 'Competitor research', value: 'competitor' },
  { title: 'Strategy research', value: 'strategy' },
]

const researchLanguageOptions = [
  { title: 'English', value: 'en' },
  { title: 'Spanish', value: 'es' },
  { title: 'Other', value: 'other' },
]

export default defineType({
  name: 'marketingResearchProject',
  title: 'Marketing Research Project',
  type: 'document',
  groups: [
    { name: 'brief', title: 'Brief', default: true },
    { name: 'inputs', title: 'Research Inputs' },
    { name: 'review', title: 'Result Review' },
    { name: 'generated', title: 'Generated Objects' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Project Title',
      type: 'string',
      group: 'brief',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'brief',
      options: { list: researchProjectStatusOptions, layout: 'radio' },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'researchType',
      title: 'Research Type',
      type: 'string',
      group: 'brief',
      options: { list: researchProjectTypeOptions, layout: 'radio' },
      initialValue: 'topic',
      validation: (Rule) => Rule.required(),
      description: 'Topic research studies what to say, competitor research studies what others are doing, and strategy research studies what direction to take.',
    }),
    defineField({
      name: 'owner',
      title: 'Owner',
      type: 'reference',
      group: 'brief',
      to: [{ type: 'teamMember' }],
    }),
    defineField({
      name: 'brief',
      title: 'Research Directive',
      type: 'text',
      rows: 4,
      group: 'brief',
      description: 'What the research is trying to learn before content, campaigns, or calendar items are generated.',
    }),
    defineField({
      name: 'audience',
      title: 'Audience',
      type: 'text',
      rows: 3,
      group: 'brief',
    }),
    defineField({
      name: 'audienceProfiles',
      title: 'Audience Profiles',
      type: 'array',
      group: 'brief',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
      description: 'Strategy audiences this research should inform.',
    }),
    defineField({
      name: 'goals',
      title: 'Research Goals',
      type: 'array',
      group: 'brief',
      of: [{ type: 'string' }],
      description: 'Decisions this research should enable.',
    }),
    defineField({
      name: 'campaignObjective',
      title: 'Likely Campaign Objective',
      type: 'string',
      group: 'brief',
      options: { list: campaignObjectiveOptions },
    }),
    defineField({
      name: 'positioning',
      title: 'Positioning Hypothesis',
      type: 'text',
      rows: 3,
      group: 'brief',
      description: 'A hypothesis, not a final plan. Update it as results come in.',
    }),
    defineField({
      name: 'messagePillars',
      title: 'Message Pillars',
      type: 'array',
      group: 'brief',
      of: [{ type: 'reference', to: [{ type: 'marketingMessagePillar' }] }],
      description: 'Existing message strategy this research should validate, refine, or challenge.',
    }),
    defineField({
      name: 'proofPoints',
      title: 'Proof Points',
      type: 'array',
      group: 'brief',
      of: [{ type: 'reference', to: [{ type: 'marketingProofPoint' }] }],
      description: 'Existing proof this research should validate or build on.',
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Likely Canonical Destination',
      type: 'url',
      group: 'brief',
    }),
    defineField({
      name: 'seedKeywords',
      title: 'Seed Keywords',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'string' }],
      description: 'Starting phrases for Semrush or source scans. Scores are stored on research result records.',
    }),
    defineField({
      name: 'seedUrls',
      title: 'Seed URLs',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'url' }],
      description: 'Starting pages, competitor examples, source articles, or canonical destinations to inspect.',
    }),
    defineField({
      name: 'targetGeography',
      title: 'Target Geography / Database',
      type: 'string',
      group: 'inputs',
      initialValue: 'us',
      description: 'Default Semrush database is us. Use another regional database when the audience is elsewhere.',
    }),
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      group: 'inputs',
      options: { list: researchLanguageOptions },
      initialValue: 'en',
    }),
    defineField({
      name: 'methods',
      title: 'Research Methods',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'string', options: { list: researchMethodOptions } }],
      description: 'Which scans or human inputs should be run for this project.',
    }),
    defineField({
      name: 'researchQuestions',
      title: 'Research Questions',
      type: 'array',
      group: 'inputs',
      of: [
        {
          name: 'researchQuestion',
          title: 'Research Question',
          type: 'object',
          fields: [
            defineField({ name: 'question', title: 'Question', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'whyItMatters', title: 'Why It Matters', type: 'text', rows: 2 }),
            defineField({ name: 'method', title: 'Best Method', type: 'string', options: { list: researchMethodOptions } }),
            defineField({ name: 'decisionNeeded', title: 'Decision It Supports', type: 'text', rows: 2 }),
            defineField({ name: 'status', title: 'Status', type: 'string', options: { list: opportunityReadinessOptions } }),
          ],
          preview: { select: { title: 'question', subtitle: 'method' } },
        },
      ],
    }),
    defineField({
      name: 'collaborators',
      title: 'Collaborators / Contributors',
      type: 'array',
      group: 'inputs',
      of: [
        {
          name: 'researchCollaborator',
          title: 'Research Collaborator',
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'organization', title: 'Organization', type: 'string' }),
            defineField({ name: 'relationshipType', title: 'Relationship Type', type: 'string', options: { list: collaborationRelationshipOptions } }),
            defineField({ name: 'topicArea', title: 'Topic Area', type: 'string' }),
            defineField({ name: 'availabilityStart', title: 'Available Starting', type: 'date' }),
            defineField({ name: 'availabilityEnd', title: 'Available Until', type: 'date' }),
            defineField({ name: 'contributionType', title: 'Contribution Type', type: 'string', options: { list: contributionTypeOptions } }),
            defineField({ name: 'capacity', title: 'Capacity', type: 'string', description: 'Example: 4 hours/week, one interview, or one data pull.' }),
            defineField({ name: 'expectedContribution', title: 'Expected Contribution', type: 'text', rows: 2 }),
            defineField({ name: 'status', title: 'Status', type: 'string', options: { list: collaborationStatusOptions } }),
            defineField({
              name: 'relatedResults',
              title: 'Related Result Signals',
              type: 'array',
              of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
            }),
            defineField({ name: 'notes', title: 'Notes', type: 'text', rows: 3 }),
          ],
          preview: {
            select: { name: 'name', organization: 'organization', topicArea: 'topicArea' },
            prepare({ name, organization, topicArea }) {
              return {
                title: [name, organization].filter(Boolean).join(' / ') || 'Collaborator',
                subtitle: topicArea,
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'performanceSignals',
      title: 'Performance Signals',
      type: 'array',
      group: 'inputs',
      of: [{ type: 'reference', to: [{ type: 'marketingPerformanceSignal' }] }],
      description: 'Manual or imported analytics signals this research should review.',
    }),
    defineField({
      name: 'selectedResults',
      title: 'Selected Results For Synthesis',
      type: 'array',
      group: 'review',
      of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
      description: 'Only selected and approved results should feed generated opportunities.',
    }),
    defineField({
      name: 'approvedResults',
      title: 'Approved Results',
      type: 'array',
      group: 'review',
      of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
    }),
    defineField({
      name: 'generatedCampaigns',
      title: 'Generated Campaigns',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingCampaign' }] }],
    }),
    defineField({
      name: 'generatedFunnels',
      title: 'Generated Funnels',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingFunnel' }] }],
    }),
    defineField({
      name: 'generatedCalendarItems',
      title: 'Generated Calendar Items',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingCalendarItem' }] }],
    }),
    defineField({
      name: 'generatedLinkItems',
      title: 'Generated Quick Links',
      type: 'array',
      group: 'generated',
      of: [{ type: 'reference', to: [{ type: 'marketingLinkItem' }] }],
    }),
    defineField({
      name: 'legacyPlan',
      title: 'Legacy Research Plan',
      type: 'reference',
      group: 'generated',
      to: [{ type: 'marketingResearchPlan' }],
      description: 'Set when this project was migrated from the old plan-centered model.',
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
      rows: 5,
      group: 'generated',
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', geo: 'targetGeography', researchType: 'researchType' },
    prepare({ title, status, geo, researchType }) {
      const statusLabel = researchProjectStatusOptions.find((option) => option.value === status)?.title || 'Draft'
      const typeLabel = researchProjectTypeOptions.find((option) => option.value === researchType)?.title || 'Topic research'
      return {
        title: `${statusLabel}: ${title || 'Untitled research project'}`,
        subtitle: [typeLabel, geo ? `Database: ${geo}` : 'No database set'].filter(Boolean).join(' / '),
      }
    },
  },
  orderings: [
    {
      title: 'Updated, newest first',
      name: 'updatedDesc',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
  ],
})

export { researchLanguageOptions, researchProjectStatusOptions, researchProjectTypeOptions }
