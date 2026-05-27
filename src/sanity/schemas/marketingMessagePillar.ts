import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'marketingMessagePillar',
  title: 'Marketing Message Pillar',
  type: 'document',
  groups: [
    { name: 'message', title: 'Message', default: true },
    { name: 'relationships', title: 'Relationships' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Pillar Name',
      type: 'string',
      group: 'message',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'coreClaim',
      title: 'Core Claim',
      type: 'text',
      rows: 3,
      group: 'message',
      description: 'The main idea designers can repeat across posts, pages, and campaigns.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'supportingClaims',
      title: 'Supporting Claims',
      type: 'array',
      group: 'message',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'approvedPhrases',
      title: 'Approved Phrases',
      type: 'array',
      group: 'message',
      of: [{ type: 'string' }],
      description: 'Language that is safe to reuse in captions, headlines, and briefs.',
    }),
    defineField({
      name: 'phrasesToAvoid',
      title: 'Phrases To Avoid',
      type: 'array',
      group: 'message',
      of: [{ type: 'string' }],
      description: 'Words or claims that are too vague, risky, off-brand, or unsupported.',
    }),
    defineField({
      name: 'topicCluster',
      title: 'Topic / Keyword Cluster',
      type: 'string',
      group: 'relationships',
    }),
    defineField({
      name: 'audiences',
      title: 'Linked Audiences',
      type: 'array',
      group: 'relationships',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
    }),
    defineField({
      name: 'proofPoints',
      title: 'Linked Proof',
      type: 'array',
      group: 'relationships',
      of: [{ type: 'reference', to: [{ type: 'marketingProofPoint' }] }],
      description: 'Evidence that can support this message.',
    }),
    defineField({
      name: 'notes',
      title: 'Designer Notes',
      type: 'text',
      rows: 4,
      group: 'relationships',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'topicCluster' },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Untitled message pillar',
        subtitle,
      }
    },
  },
})
