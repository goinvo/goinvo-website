import { defineField, defineType } from 'sanity'
import { OUTREACH_SEGMENT_OPTIONS } from '@/lib/marketing/outreachEnums'

/**
 * Extracted capability evidence for one case study / project — the structured
 * "verify before you sign" asset outreach research matches contacts against.
 * Populated by /api/marketing/outreach/extract-evidence (categories ported from
 * the legacy Gatsby generate-embeddings.js); lives in the PRIVATE outreach
 * dataset alongside contacts. Set `manuallyEdited` after hand-tuning a record
 * so re-extraction sweeps skip it unless forced.
 */
export default defineType({
  name: 'marketingWorkEvidence',
  title: 'Work Evidence',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Project Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'sourceId', title: 'Source Document ID', type: 'string', readOnly: true }),
    defineField({
      name: 'sourceType',
      title: 'Source Type',
      type: 'string',
      initialValue: 'caseStudy',
      options: {
        list: [
          { title: 'Case Study', value: 'caseStudy' },
          { title: 'Feature / Vision piece', value: 'feature' },
          { title: 'Open Source', value: 'oss' },
          { title: 'Manual entry', value: 'manual' },
        ],
      },
    }),
    defineField({ name: 'slug', title: 'Slug', type: 'string' }),
    defineField({ name: 'client', title: 'Client', type: 'string' }),
    defineField({ name: 'url', title: 'Public URL', type: 'url' }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'active',
      options: {
        list: [
          { title: 'Active — used in research matching', value: 'active' },
          { title: 'Excluded — hidden from matching', value: 'excluded' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Buyer-Facing Summary',
      type: 'text',
      rows: 3,
      description: 'What was built, for whom, with what concrete result (2–3 sentences).',
    }),
    defineField({
      name: 'segments',
      title: 'Evidence For Segments',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: OUTREACH_SEGMENT_OPTIONS },
    }),
    defineField({ name: 'techniques', title: 'Techniques', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'skills', title: 'Skills', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'frameworks', title: 'Frameworks / Methods', type: 'array', of: [{ type: 'string' }] }),
    defineField({
      name: 'technicalImplementation',
      title: 'Technical Implementation',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({ name: 'domainExpertise', title: 'Domain Expertise', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'businessOutcomes', title: 'Business Outcomes', type: 'array', of: [{ type: 'string' }] }),
    defineField({
      name: 'highlights',
      title: 'Quantified Highlights',
      type: 'array',
      description: 'The verifiable numbers a buyer would check.',
      of: [
        {
          name: 'evidenceHighlight',
          title: 'Highlight',
          type: 'object',
          fields: [
            defineField({ name: 'metric', title: 'Metric', type: 'string' }),
            defineField({ name: 'detail', title: 'Detail', type: 'string' }),
          ],
          preview: { select: { title: 'metric', subtitle: 'detail' } },
        },
      ],
    }),
    defineField({
      name: 'manuallyEdited',
      title: 'Manually Edited',
      type: 'boolean',
      initialValue: false,
      description: 'When true, re-extraction sweeps skip this record (unless forced).',
    }),
    defineField({ name: 'editedAt', title: 'Last Manual Edit', type: 'datetime', readOnly: true }),
    defineField({ name: 'editedBy', title: 'Last Edited By', type: 'string', readOnly: true }),
    defineField({ name: 'extractedAt', title: 'Extracted At', type: 'datetime', readOnly: true }),
    defineField({ name: 'extractionModel', title: 'Extraction Model', type: 'string', readOnly: true }),
  ],
  preview: {
    select: { title: 'title', client: 'client', status: 'status' },
    prepare({ title, client, status }) {
      return {
        title: `${title || 'Untitled'}${status === 'excluded' ? ' (excluded)' : ''}`,
        subtitle: client,
      }
    },
  },
})
