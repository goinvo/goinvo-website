import { defineArrayMember, defineField, defineType } from 'sanity'

import {
  MARKETING_OPERATION_AUTONOMY,
  MARKETING_OPERATION_KINDS,
  MARKETING_OPERATION_ORIGINS,
  MARKETING_OPERATION_PRIORITIES,
  MARKETING_OPERATION_STATUSES,
  MARKETING_OPERATION_TARGET_VIEWS,
} from '@/lib/marketing/operations'

const labels: Record<string, string> = {
  needsHuman: 'Needs a person',
  safeInternal: 'Safe internal work',
  humanReview: 'Human review required',
  externalAction: 'External action — approval every time',
  paidAction: 'Paid action — approval every time',
  workUpdate: 'Coworker update',
  dashboardGap: 'Dashboard health check',
  abTesting: 'A/B testing',
  linkTree: 'Quick Links',
  workEvidence: 'Outreach evidence',
  shop: 'Shop',
}

const options = (values: readonly string[]) => values.map((value) => ({
  title: labels[value] || value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase()),
  value,
}))

/**
 * Private Marketing Operations record. The schema is registered so custom
 * Studio tools understand the document shape, but API routes must store this
 * type only in OUTREACH_DATASET (the default website dataset is public).
 */
export default defineType({
  name: 'marketingOperation',
  title: 'Marketing Operation (Private)',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Work', type: 'string', validation: (Rule) => Rule.required().max(180) }),
    defineField({ name: 'summary', title: 'Normalized summary', type: 'text', rows: 4, validation: (Rule) => Rule.max(1200) }),
    defineField({ name: 'whyNow', title: 'Why now', type: 'text', rows: 3, validation: (Rule) => Rule.max(900) }),
    defineField({ name: 'nextAction', title: 'Next move', type: 'text', rows: 3, validation: (Rule) => Rule.required().max(600) }),
    defineField({ name: 'humanQuestion', title: 'Needed from a person', type: 'text', rows: 3, validation: (Rule) => Rule.max(600) }),
    defineField({ name: 'humanResponse', title: 'Latest team answer', type: 'text', rows: 4, validation: (Rule) => Rule.max(900) }),
    defineField({ name: 'status', title: 'Status', type: 'string', options: { list: options(MARKETING_OPERATION_STATUSES) }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'priority', title: 'Priority', type: 'string', options: { list: options(MARKETING_OPERATION_PRIORITIES) }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'kind', title: 'Kind', type: 'string', options: { list: options(MARKETING_OPERATION_KINDS) }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'origin', title: 'Origin', type: 'string', options: { list: options(MARKETING_OPERATION_ORIGINS) }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'autonomy', title: 'Safety class', type: 'string', options: { list: options(MARKETING_OPERATION_AUTONOMY) }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'ownerName', title: 'Accountable owner', type: 'string', validation: (Rule) => Rule.max(120) }),
    defineField({ name: 'ownerSanityUserId', title: 'Owner Sanity user ID', type: 'string', hidden: true }),
    defineField({ name: 'dueAt', title: 'Due', type: 'datetime' }),
    defineField({ name: 'nextCheckAt', title: 'Next check', type: 'datetime' }),
    defineField({ name: 'blocker', title: 'Blocker', type: 'text', rows: 3, validation: (Rule) => Rule.max(600) }),
    defineField({ name: 'lastOutcome', title: 'Marketing already did', type: 'text', rows: 3, validation: (Rule) => Rule.max(700) }),
    defineField({ name: 'targetView', title: 'Open in', type: 'string', options: { list: options(MARKETING_OPERATION_TARGET_VIEWS) }, validation: (Rule) => Rule.required() }),
    defineField({ name: 'sourceKey', title: 'Idempotency source key', type: 'string', readOnly: true, validation: (Rule) => Rule.required() }),
    defineField({ name: 'sourceFingerprint', title: 'Source condition fingerprint', type: 'string', readOnly: true, validation: (Rule) => Rule.required() }),
    defineField({ name: 'sourceRevision', title: 'Source revision', type: 'string', readOnly: true }),
    defineField({
      name: 'linkedRecords',
      title: 'Linked records',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'dataset', title: 'Dataset', type: 'string', options: { list: ['production', 'outreach'] } }),
          defineField({ name: 'type', title: 'Type', type: 'string' }),
          defineField({ name: 'id', title: 'ID', type: 'string' }),
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'relationship', title: 'Relationship', type: 'string' }),
        ],
      })],
    }),
    defineField({
      name: 'evidence',
      title: 'Internal CMS matches',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'title', title: 'Title', type: 'string' }),
          defineField({ name: 'url', title: 'Public URL', type: 'url' }),
          defineField({ name: 'recordType', title: 'Record type', type: 'string' }),
          defineField({ name: 'recordId', title: 'Record ID', type: 'string' }),
          defineField({ name: 'matchedTerms', title: 'Matched terms', type: 'array', of: [{ type: 'string' }] }),
        ],
      })],
    }),
    defineField({
      name: 'activity',
      title: 'Recent activity',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'at', title: 'At', type: 'datetime' }),
          defineField({ name: 'actor', title: 'Actor', type: 'string', options: { list: ['marketing', 'person', 'system'] } }),
          defineField({ name: 'action', title: 'Action', type: 'string' }),
          defineField({ name: 'outcome', title: 'Outcome', type: 'text', rows: 2 }),
        ],
      })],
    }),
    defineField({ name: 'completedAt', title: 'Completed at', type: 'datetime' }),
    defineField({ name: 'dismissedUntil', title: 'Dismissed until', type: 'datetime' }),
    defineField({ name: 'lastEvaluatedAt', title: 'Last evaluated at', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'title', status: 'status', priority: 'priority', owner: 'ownerName' },
    prepare({ title, status, priority, owner }) {
      return { title, subtitle: [status, priority, owner].filter(Boolean).join(' · ') }
    },
  },
})
