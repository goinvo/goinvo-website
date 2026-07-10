import { defineField, defineType } from 'sanity'
import {
  OUTREACH_SEGMENT_OPTIONS,
  OUTREACH_STATUS_OPTIONS,
  OUTREACH_WARMTH_OPTIONS,
} from '@/lib/marketing/outreachEnums'

/**
 * A warm-network contact in the outreach pipeline. Created by pasting names into
 * the Outreach tab (AI intake parses the dump); the research pass fills the
 * read-only Research group (opportunities, feasibility, call brief); principals
 * work the ranked call plan and log outcomes in the Outreach group.
 */
export default defineType({
  name: 'marketingContact',
  title: 'Outreach Contact',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Who', default: true },
    { name: 'research', title: 'Research' },
    { name: 'outreach', title: 'Outreach' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'role',
      title: 'Role / Title',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'segment',
      title: 'Segment',
      type: 'string',
      group: 'identity',
      options: { list: OUTREACH_SEGMENT_OPTIONS },
    }),
    defineField({
      name: 'owner',
      title: 'Relationship Owner',
      type: 'string',
      group: 'identity',
      description: 'Who at GoInvo holds this relationship (e.g. Juhan, Jon).',
    }),
    defineField({
      name: 'warmth',
      title: 'Warmth',
      type: 'string',
      group: 'identity',
      options: { list: OUTREACH_WARMTH_OPTIONS },
      initialValue: 'warm',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'identity',
      options: { list: OUTREACH_STATUS_OPTIONS },
      initialValue: 'new',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'identity',
    }),
    defineField({
      name: 'linkedinUrl',
      title: 'LinkedIn URL',
      type: 'url',
      group: 'identity',
    }),
    defineField({
      name: 'howWeKnow',
      title: 'How We Know Them',
      type: 'text',
      rows: 2,
      group: 'identity',
      description: 'Shared history: past project, conference, former colleague…',
    }),
    defineField({
      name: 'sourceNotes',
      title: 'Intake Source Line',
      type: 'text',
      rows: 2,
      group: 'identity',
      description: 'The raw line from the pasted contact dump this record came from.',
    }),

    // ---- Research group (worker-owned; filled by the outreach research run) ----
    defineField({
      name: 'researchedAt',
      title: 'Researched At',
      type: 'datetime',
      group: 'research',
      readOnly: true,
    }),
    defineField({
      name: 'personVerified',
      title: 'Person Verified',
      type: 'boolean',
      group: 'research',
      readOnly: true,
      description: 'False when research could not confirm THIS person (org-level research only).',
    }),
    defineField({
      name: 'identityConfidence',
      title: 'Identity Confidence',
      type: 'string',
      group: 'research',
      readOnly: true,
    }),
    defineField({
      name: 'researchSummary',
      title: 'Research Summary',
      type: 'text',
      rows: 4,
      group: 'research',
      readOnly: true,
      description: 'What the contact and their org are doing now (cited web research).',
    }),
    defineField({
      name: 'opportunities',
      title: 'Opportunity Hypotheses',
      type: 'array',
      group: 'research',
      readOnly: true,
      of: [
        {
          name: 'outreachOpportunity',
          title: 'Opportunity',
          type: 'object',
          fields: [
            defineField({ name: 'offerKey', title: 'Offer Key', type: 'string' }),
            defineField({ name: 'headline', title: 'Headline', type: 'string' }),
            defineField({ name: 'rationale', title: 'Rationale', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'headline', subtitle: 'offerKey' } },
        },
      ],
    }),
    defineField({
      name: 'feasibilityScore',
      title: 'Feasibility Score (0–100)',
      type: 'number',
      group: 'research',
      readOnly: true,
      description: 'How likely a well-aimed approach converts to a real conversation.',
    }),
    defineField({
      name: 'feasibilityReasoning',
      title: 'Feasibility Reasoning',
      type: 'text',
      rows: 3,
      group: 'research',
      readOnly: true,
    }),
    defineField({
      name: 'suggestedOfferKey',
      title: 'Suggested Offer',
      type: 'string',
      group: 'research',
      readOnly: true,
      description: 'Key of the marketingOffer that best fits this contact.',
    }),
    defineField({
      name: 'relevantEvidence',
      title: 'Relevant Work Evidence',
      type: 'array',
      group: 'research',
      readOnly: true,
      description: 'The shipped GoInvo work most relevant to this contact — the "show them" list.',
      of: [
        {
          name: 'outreachEvidenceRef',
          title: 'Evidence',
          type: 'object',
          fields: [
            defineField({ name: 'evidenceId', title: 'Evidence Doc ID', type: 'string' }),
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'why', title: 'Why It Matters Here', type: 'text', rows: 2 }),
          ],
          preview: { select: { title: 'title', subtitle: 'why' } },
        },
      ],
    }),
    defineField({
      name: 'proposedOffers',
      title: 'Proposed Offers (drafts)',
      type: 'array',
      group: 'research',
      description:
        'Offer drafts generated for THIS contact — review, edit, and choose one; the chosen offer drives the call brief.',
      of: [
        {
          name: 'outreachProposedOffer',
          title: 'Proposed Offer',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'oneLiner', title: 'One-Liner', type: 'text', rows: 2 }),
            defineField({ name: 'priceBand', title: 'Price Band', type: 'string' }),
            defineField({ name: 'rationale', title: 'Rationale', type: 'text', rows: 2 }),
            defineField({
              name: 'evidenceIds',
              title: 'Backing Evidence IDs',
              type: 'array',
              of: [{ type: 'string' }],
            }),
            defineField({ name: 'chosen', title: 'Chosen', type: 'boolean', initialValue: false }),
          ],
          preview: {
            select: { title: 'title', subtitle: 'priceBand', chosen: 'chosen' },
            prepare: ({ title, subtitle, chosen }) => ({
              title: `${chosen ? '✓ ' : ''}${title || 'Untitled offer'}`,
              subtitle,
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'suggestedOpener',
      title: 'Suggested Opener',
      type: 'text',
      rows: 3,
      group: 'research',
      readOnly: true,
      description: 'A first message/voicemail the relationship owner can adapt.',
    }),
    defineField({
      name: 'callBrief',
      title: 'Call Brief',
      type: 'text',
      rows: 6,
      group: 'research',
      readOnly: true,
      description: 'The one-pager for the call: context, what to present, the ask.',
    }),
    defineField({
      name: 'researchModel',
      title: 'Research Model',
      type: 'string',
      group: 'research',
      readOnly: true,
    }),
    defineField({
      name: 'researchSources',
      title: 'Research Sources',
      type: 'array',
      group: 'research',
      readOnly: true,
      of: [
        {
          name: 'outreachSource',
          title: 'Source',
          type: 'object',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string' }),
            defineField({ name: 'url', title: 'URL', type: 'url' }),
          ],
          preview: { select: { title: 'title', subtitle: 'url' } },
        },
      ],
    }),

    // ---- Outreach group (filled by whoever makes the call) ----
    defineField({
      name: 'lastContactedAt',
      title: 'Last Contacted At',
      type: 'datetime',
      group: 'outreach',
    }),
    defineField({
      name: 'followUpAt',
      title: 'Follow Up At',
      type: 'datetime',
      group: 'outreach',
      description: 'When this contact should resurface in the "Follow-ups due" strip.',
    }),
    defineField({
      name: 'interactions',
      title: 'Interaction History',
      type: 'array',
      group: 'outreach',
      description: 'Append-only log of every call/message — never overwritten.',
      of: [
        {
          name: 'outreachInteraction',
          title: 'Interaction',
          type: 'object',
          fields: [
            defineField({ name: 'at', title: 'When', type: 'datetime' }),
            defineField({ name: 'by', title: 'By', type: 'string' }),
            defineField({ name: 'outcome', title: 'Outcome', type: 'text', rows: 2 }),
            defineField({ name: 'intel', title: 'Intelligence', type: 'text', rows: 2 }),
            defineField({ name: 'nextStep', title: 'Next Step', type: 'string' }),
            defineField({ name: 'statusAfter', title: 'Status After', type: 'string' }),
          ],
          preview: {
            select: { at: 'at', outcome: 'outcome', statusAfter: 'statusAfter' },
            prepare: ({ at, outcome, statusAfter }) => ({
              title: `${at ? new Date(at).toLocaleDateString() : '?'} · ${statusAfter || ''}`,
              subtitle: outcome,
            }),
          },
        },
      ],
    }),
    defineField({
      name: 'nextStep',
      title: 'Next Step',
      type: 'string',
      group: 'outreach',
    }),
    defineField({
      name: 'outcomeNotes',
      title: 'Outcome Notes',
      type: 'text',
      rows: 3,
      group: 'outreach',
      description: 'What happened on the call/message.',
    }),
    defineField({
      name: 'intelGathered',
      title: 'Intelligence Gathered',
      type: 'text',
      rows: 3,
      group: 'outreach',
      description: 'Market intel from the conversation — e.g. what got funded in their org this year.',
    }),
  ],
  preview: {
    select: { title: 'name', organization: 'organization', status: 'status', score: 'feasibilityScore' },
    prepare({ title, organization, status, score }) {
      const statusLabel = OUTREACH_STATUS_OPTIONS.find((o) => o.value === status)?.title || status
      return {
        title: title || 'Unnamed contact',
        subtitle: [organization, statusLabel, typeof score === 'number' ? `score ${score}` : '']
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
