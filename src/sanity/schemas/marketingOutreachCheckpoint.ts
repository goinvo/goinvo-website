import { defineField, defineType } from 'sanity'

/**
 * Private, metadata-only progress marker for contact intake. Contact names,
 * spreadsheet rows, and files must never be stored on this document.
 */
export default defineType({
  name: 'marketingOutreachCheckpoint',
  title: 'Outreach Intake Checkpoint (Private)',
  type: 'document',
  fields: [
    defineField({ name: 'ownerName', title: 'Team member', type: 'string', readOnly: true }),
    defineField({ name: 'ownerSanityUserId', title: 'Sanity user ID', type: 'string', hidden: true, readOnly: true }),
    defineField({
      name: 'stage',
      title: 'Last stage',
      type: 'string',
      readOnly: true,
      options: {
        list: [
          { title: 'Drafting contacts', value: 'drafting' },
          { title: 'Reviewed; not added', value: 'reviewed' },
          { title: 'Saved', value: 'saved' },
          { title: 'Discarded', value: 'discarded' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'stagedCount', title: 'Staged count', type: 'number', readOnly: true, validation: (Rule) => Rule.integer().min(0) }),
    defineField({ name: 'readyCount', title: 'Reviewed count', type: 'number', readOnly: true, validation: (Rule) => Rule.integer().min(0) }),
    defineField({ name: 'savedCount', title: 'Saved count', type: 'number', readOnly: true, validation: (Rule) => Rule.integer().min(0) }),
    defineField({ name: 'updatedAt', title: 'Last activity', type: 'datetime', readOnly: true, validation: (Rule) => Rule.required() }),
  ],
  preview: {
    select: { title: 'ownerName', stage: 'stage', updatedAt: 'updatedAt' },
    prepare: ({ title, stage, updatedAt }) => ({
      title: title || 'Studio user',
      subtitle: [stage, updatedAt].filter(Boolean).join(' - '),
    }),
  },
})
