import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'cmsFeedback',
  title: 'CMS Feedback',
  type: 'document',
  fields: [
    defineField({
      name: 'submittedBy',
      title: 'Submitted By',
      type: 'string',
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
    }),
    defineField({
      name: 'status',
      title: 'Review Status',
      type: 'string',
      description: 'Inbox triage state for the feedback item.',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'Reviewed', value: 'reviewed' },
          { title: 'Resolved', value: 'resolved' },
          { title: 'No Action Needed', value: 'noAction' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'new',
    }),
    defineField({
      name: 'readAt',
      title: 'Read At',
      type: 'datetime',
      description: 'When this feedback was first reviewed.',
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime',
      description: 'When the latest review/status update happened.',
    }),
    defineField({
      name: 'resolutionNotes',
      title: 'Resolution Notes',
      type: 'text',
      rows: 3,
      description: 'Short note about what changed, what was already fixed, or why no action is needed.',
    }),
    defineField({
      name: 'tasks',
      title: 'Task Responses',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'taskId', title: 'Task ID', type: 'string' },
            { name: 'completed', title: 'Completed', type: 'boolean' },
            { name: 'difficulty', title: 'Difficulty (1-5)', type: 'number' },
            { name: 'comment', title: 'Comment', type: 'text' },
          ],
        },
      ],
    }),
    defineField({
      name: 'overallRating',
      title: 'Overall Rating',
      type: 'number',
    }),
    defineField({
      name: 'whatWorkedWell',
      title: 'What Worked Well',
      type: 'text',
    }),
    defineField({
      name: 'whatWasConfusing',
      title: 'What Was Confusing',
      type: 'text',
    }),
    defineField({
      name: 'suggestions',
      title: 'Suggestions',
      type: 'text',
    }),
  ],
  preview: {
    select: {
      title: 'submittedBy',
      submittedAt: 'submittedAt',
      status: 'status',
    },
    prepare({ title, submittedAt, status }) {
      const statusLabel =
        status === 'resolved'
          ? 'Resolved'
          : status === 'reviewed'
            ? 'Reviewed'
            : status === 'noAction'
              ? 'No action'
              : status === 'archived'
                ? 'Archived'
                : 'New'

      return {
        title: `${statusLabel}: ${title || 'Unknown submitter'}`,
        subtitle: submittedAt,
      }
    },
  },
  orderings: [
    {
      title: 'Newest submissions first',
      name: 'submittedAtDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
    {
      title: 'Unread first',
      name: 'unreadFirst',
      by: [
        { field: 'readAt', direction: 'asc' },
        { field: 'submittedAt', direction: 'desc' },
      ],
    },
  ],
})
