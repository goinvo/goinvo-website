import { defineField, defineType } from 'sanity'
import {
  OUTREACH_CHANNEL_OVERRIDE_STATE_OPTIONS,
  OUTREACH_CHANNEL_OPTIONS,
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
      name: 'brandVoiceKey',
      title: 'Brand Voice Override',
      type: 'string',
      group: 'identity',
      description:
        'Stable key of the shared Marketing Settings voice profile. Leave empty to inherit the active suite default.',
    }),
    defineField({
      name: 'warmth',
      title: 'Warmth',
      type: 'string',
      group: 'identity',
      options: { list: OUTREACH_WARMTH_OPTIONS },
      initialValue: 'unknown',
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
    defineField({
      name: 'identityHistory',
      title: 'Identity correction history',
      type: 'array',
      group: 'identity',
      readOnly: true,
      description:
        'Previous identity values retained when a contact with interaction or attribution history is corrected.',
      of: [
        {
          name: 'outreachIdentitySnapshot',
          title: 'Previous identity',
          type: 'object',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'organization', title: 'Organization', type: 'string' }),
            defineField({ name: 'role', title: 'Role / Title', type: 'string' }),
            defineField({ name: 'changedAt', title: 'Corrected At', type: 'datetime' }),
            defineField({ name: 'changedBy', title: 'Corrected By', type: 'string' }),
          ],
          preview: { select: { title: 'name', subtitle: 'organization' } },
        },
      ],
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
      name: 'researchReviewedAt',
      title: 'Research Reviewed At',
      type: 'datetime',
      group: 'research',
      readOnly: true,
      description: 'Human approval timestamp for the current AI brief. Re-research clears it.',
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
      name: 'researchSuggestedSegment',
      title: 'AI-Suggested Segment',
      type: 'string',
      group: 'research',
      readOnly: true,
      options: { list: OUTREACH_SEGMENT_OPTIONS },
      description: 'Research suggestion only. It never overwrites the human-owned Segment field.',
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
        'Offer drafts generated for THIS contact — review, edit, and choose one. Re-research preserves these human-curated drafts unless replacement is explicitly requested.',
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
      description: 'AI draft. Edit it safely in the Outreach workspace; saving new wording clears prior approval.',
    }),
    defineField({
      name: 'callBrief',
      title: 'Call Brief',
      type: 'text',
      rows: 6,
      group: 'research',
      readOnly: true,
      description: 'AI draft for the call: context, what to present, and the ask. Edit it safely in the Outreach workspace.',
    }),
    defineField({
      name: 'researchModel',
      title: 'Research Model',
      type: 'string',
      group: 'research',
      readOnly: true,
    }),
    defineField({
      name: 'researchBrandVoiceKey',
      title: 'Applied Brand Voice Key',
      type: 'string',
      group: 'research',
      readOnly: true,
    }),
    defineField({
      name: 'researchBrandVoiceName',
      title: 'Applied Brand Voice',
      type: 'string',
      group: 'research',
      readOnly: true,
      description: 'Voice used for the generated opener, offer wording, and call ask. Facts remain voice-neutral.',
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
      name: 'channelOverrides',
      title: 'Channel Overrides',
      type: 'array',
      group: 'outreach',
      description:
        'Optional exceptions to automatic channel advice. With no entry, a channel stays automatic. Email, Phone, and LinkedIn URL in the Who group remain the canonical contact details.',
      of: [
        {
          name: 'outreachChannelOverride',
          title: 'Channel Override',
          type: 'object',
          fields: [
            defineField({
              name: 'channel',
              title: 'Channel',
              type: 'string',
              options: { list: OUTREACH_CHANNEL_OPTIONS },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'state',
              title: 'Override',
              type: 'string',
              options: { list: OUTREACH_CHANNEL_OVERRIDE_STATE_OPTIONS },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'note',
              title: 'Reason (optional)',
              type: 'string',
              description:
                'Explain the exception briefly. Do not copy an email address, phone number, or profile URL here; edit the canonical fields in Who instead.',
              validation: (Rule) => Rule.max(240),
            }),
          ],
          preview: {
            select: { channel: 'channel', state: 'state', subtitle: 'note' },
            prepare: ({ channel, state, subtitle }) => ({
              title: [channel, state].filter(Boolean).join(' — ') || 'Channel override',
              subtitle,
            }),
          },
        },
      ],
      validation: (Rule) => [
        Rule.max(OUTREACH_CHANNEL_OPTIONS.length),
        Rule.custom((value) => {
          if (!Array.isArray(value)) return true
          const overrides = value as Array<{ channel?: string; state?: string }>
          const channels = overrides
            .map((override) => override.channel)
            .filter((channel): channel is string => Boolean(channel))
          if (new Set(channels).size !== channels.length) {
            return 'Keep only one override per channel. Remove an override to return that channel to automatic mode.'
          }
          if (overrides.filter((override) => override.state === 'preferred').length > 1) {
            return 'Only one channel can be preferred. Leave all channels without a Preferred override to use automatic mode.'
          }
          return true
        }),
      ],
    }),
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
      name: 'estimatedValue',
      title: 'Estimated Opportunity Value',
      type: 'number',
      group: 'outreach',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'closedValue',
      title: 'Closed Value',
      type: 'number',
      group: 'outreach',
      description: 'Actual value when the contact reaches Won or Lost.',
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: 'currency',
      title: 'Value Currency',
      type: 'string',
      group: 'outreach',
      initialValue: 'USD',
      description: 'ISO 4217 currency code used by estimated and closed values.',
      validation: (Rule) => Rule.regex(/^[A-Z]{3}$/).warning('Use a three-letter ISO currency code, e.g. USD.'),
    }),
    defineField({
      name: 'attributionChannel',
      title: 'Attributed Channel',
      type: 'string',
      group: 'outreach',
      options: { list: OUTREACH_CHANNEL_OPTIONS },
      description: 'The channel that sourced or materially advanced this opportunity.',
    }),
    defineField({
      name: 'attributedOfferKey',
      title: 'Attributed Offer Key',
      type: 'string',
      group: 'outreach',
      description: 'Catalog or tailored offer key presented in the successful/terminal outcome.',
    }),
    defineField({
      name: 'attributedOfferTitle',
      title: 'Attributed Offer Title',
      type: 'string',
      group: 'outreach',
      description: 'Human-readable snapshot of the offer presented at the time of the interaction.',
    }),
    defineField({
      name: 'attributedEvidenceIds',
      title: 'Attributed Evidence IDs',
      type: 'array',
      group: 'outreach',
      description: 'Work-evidence records that materially supported the conversation or close.',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'closedAt',
      title: 'Closed At',
      type: 'datetime',
      group: 'outreach',
    }),
    defineField({
      name: 'closeReason',
      title: 'Win / Loss Reason',
      type: 'text',
      rows: 2,
      group: 'outreach',
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
            defineField({
              name: 'channel',
              title: 'Channel',
              type: 'string',
              options: { list: OUTREACH_CHANNEL_OPTIONS },
            }),
            defineField({ name: 'offerKey', title: 'Offer Key Presented', type: 'string' }),
            defineField({ name: 'offerTitle', title: 'Offer Title Presented', type: 'string' }),
            defineField({
              name: 'evidenceIds',
              title: 'Evidence IDs Presented',
              type: 'array',
              of: [{ type: 'string' }],
            }),
            defineField({
              name: 'value',
              title: 'Value at This Interaction',
              type: 'number',
              validation: (Rule) => Rule.min(0),
            }),
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
