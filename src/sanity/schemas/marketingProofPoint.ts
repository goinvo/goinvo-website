import { defineField, defineType } from 'sanity'
import { researchConfidenceOptions } from './marketingResearchPlan'

const proofTypeOptions = [
  { title: 'Statistic', value: 'statistic' },
  { title: 'Quote', value: 'quote' },
  { title: 'Case Evidence', value: 'caseEvidence' },
  { title: 'Research Finding', value: 'researchFinding' },
  { title: 'Visual Artifact', value: 'visualArtifact' },
  { title: 'Team Knowledge', value: 'teamKnowledge' },
  { title: 'Other', value: 'other' },
]

export default defineType({
  name: 'marketingProofPoint',
  title: 'Marketing Proof Point',
  type: 'document',
  groups: [
    { name: 'proof', title: 'Proof', default: true },
    { name: 'fit', title: 'Audience / Topic Fit' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Proof Name',
      type: 'string',
      group: 'proof',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'claim',
      title: 'Evidence / Claim',
      type: 'text',
      rows: 4,
      group: 'proof',
      description: 'The reusable claim designers can cite or turn into a visual.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'proofType',
      title: 'Proof Type',
      type: 'string',
      group: 'proof',
      options: { list: proofTypeOptions },
      initialValue: 'researchFinding',
    }),
    defineField({
      name: 'sourceTitle',
      title: 'Source Title',
      type: 'string',
      group: 'proof',
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      group: 'proof',
    }),
    defineField({
      name: 'confidence',
      title: 'Confidence',
      type: 'string',
      group: 'proof',
      options: { list: researchConfidenceOptions },
      initialValue: 'medium',
      description: 'How safe this proof is to use without additional validation.',
    }),
    defineField({
      name: 'researchResults',
      title: 'Related Research Results',
      type: 'array',
      group: 'proof',
      of: [{ type: 'reference', to: [{ type: 'marketingResearchResult' }] }],
    }),
    defineField({
      name: 'audiences',
      title: 'Audience Fit',
      type: 'array',
      group: 'fit',
      of: [{ type: 'reference', to: [{ type: 'marketingAudienceProfile' }] }],
    }),
    defineField({
      name: 'topicCluster',
      title: 'Topic / Keyword Cluster',
      type: 'string',
      group: 'fit',
    }),
    defineField({
      name: 'usageNotes',
      title: 'Usage Notes',
      type: 'text',
      rows: 4,
      group: 'fit',
      description: 'How to use this proof safely in posts, pages, talks, or campaigns.',
    }),
  ],
  preview: {
    select: { title: 'title', proofType: 'proofType', confidence: 'confidence' },
    prepare({ title, proofType, confidence }) {
      const typeLabel = proofTypeOptions.find((option) => option.value === proofType)?.title || 'Proof'
      return {
        title: title || 'Untitled proof point',
        subtitle: [typeLabel, confidence].filter(Boolean).join(' / '),
      }
    },
  },
})

export { proofTypeOptions }
