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
      subtitle: 'submittedAt',
    },
  },
})
