import { defineField, defineType } from 'sanity'

const statusOptions = [
  { title: 'New', value: 'new' },
  { title: 'Open', value: 'open' },
  { title: 'Waiting on Visitor', value: 'waitingOnVisitor' },
  { title: 'Resolved', value: 'resolved' },
  { title: 'Spam', value: 'spam' },
  { title: 'Archived', value: 'archived' },
]

export default defineType({
  name: 'chatThread',
  title: 'Chat Thread',
  type: 'document',
  groups: [
    { name: 'summary', title: 'Summary', default: true },
    { name: 'messages', title: 'Messages' },
    { name: 'routing', title: 'Routing' },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'summary',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'summary',
      options: { list: statusOptions, layout: 'radio' },
      initialValue: 'new',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'lastMessagePreview',
      title: 'Last Message Preview',
      type: 'text',
      rows: 2,
      group: 'summary',
      readOnly: true,
    }),
    defineField({
      name: 'visitor',
      title: 'Visitor',
      type: 'object',
      group: 'summary',
      fields: [
        { name: 'name', title: 'Name', type: 'string' },
        {
          name: 'email',
          title: 'Email',
          type: 'string',
          validation: (Rule) => Rule.email().warning(),
        },
      ],
    }),
    defineField({
      name: 'messages',
      title: 'Messages',
      type: 'array',
      group: 'messages',
      of: [
        {
          name: 'chatMessage',
          title: 'Message',
          type: 'object',
          fields: [
            {
              name: 'authorType',
              title: 'Author Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Visitor', value: 'visitor' },
                  { title: 'Team', value: 'team' },
                  { title: 'System', value: 'system' },
                ],
                layout: 'radio',
              },
              validation: (Rule) => Rule.required(),
            },
            { name: 'authorName', title: 'Author Name', type: 'string' },
            {
              name: 'authorEmail',
              title: 'Author Email',
              type: 'string',
              validation: (Rule) => Rule.email().warning(),
            },
            {
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 4,
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'createdAt',
              title: 'Created At',
              type: 'datetime',
              validation: (Rule) => Rule.required(),
            },
            { name: 'slackUserId', title: 'Slack User ID', type: 'string' },
            { name: 'slackMessageTs', title: 'Slack Message Timestamp', type: 'string' },
            {
              name: 'attachments',
              title: 'Attachments',
              type: 'array',
              of: [
                {
                  name: 'chatAttachment',
                  title: 'Attachment',
                  type: 'object',
                  fields: [
                    { name: 'filename', title: 'Filename', type: 'string', validation: (Rule) => Rule.required() },
                    { name: 'contentType', title: 'Content Type', type: 'string', validation: (Rule) => Rule.required() },
                    { name: 'size', title: 'Size', type: 'number', validation: (Rule) => Rule.required() },
                    {
                      name: 'uploadStatus',
                      title: 'Upload Status',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Pending', value: 'pending' },
                          { title: 'Uploaded', value: 'uploaded' },
                          { title: 'Failed', value: 'failed' },
                        ],
                      },
                    },
                    { name: 'slackFileId', title: 'Slack File ID', type: 'string', readOnly: true },
                    { name: 'slackFileTitle', title: 'Slack File Title', type: 'string', readOnly: true },
                    { name: 'error', title: 'Error', type: 'text', rows: 2, readOnly: true },
                  ],
                  preview: {
                    select: {
                      title: 'filename',
                      contentType: 'contentType',
                      uploadStatus: 'uploadStatus',
                    },
                    prepare({ title, contentType, uploadStatus }) {
                      return {
                        title: title || 'Attachment',
                        subtitle: [contentType, uploadStatus].filter(Boolean).join(' - '),
                      }
                    },
                  },
                },
              ],
            },
            {
              name: 'fallbackKind',
              title: 'Fallback Kind',
              type: 'string',
              readOnly: true,
              hidden: true,
              options: {
                list: [{ title: 'No Response', value: 'noResponse' }],
              },
            },
          ],
          preview: {
            select: {
              authorType: 'authorType',
              authorName: 'authorName',
              text: 'text',
              createdAt: 'createdAt',
            },
            prepare({ authorType, authorName, text, createdAt }) {
              const author = authorName || authorType || 'Message'
              return {
                title: author,
                subtitle: `${createdAt || ''} ${text || ''}`.trim(),
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'slack',
      title: 'Slack',
      type: 'object',
      group: 'routing',
      fields: [
        { name: 'channelId', title: 'Channel ID', type: 'string', readOnly: true },
        { name: 'channelName', title: 'Channel Name', type: 'string', readOnly: true },
        { name: 'threadTs', title: 'Thread Timestamp', type: 'string', readOnly: true },
        { name: 'dedicatedChannel', title: 'Dedicated Channel', type: 'boolean', readOnly: true },
        { name: 'hubChannelId', title: 'Hub Channel ID', type: 'string', readOnly: true },
        { name: 'hubThreadTs', title: 'Hub Thread Timestamp', type: 'string', readOnly: true },
        { name: 'lastPostAt', title: 'Last Post At', type: 'datetime', readOnly: true },
      ],
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
      rows: 4,
      group: 'routing',
      description: 'Private notes for triage. These are never shown to the visitor.',
    }),
    defineField({
      name: 'visitorKey',
      title: 'Visitor Key',
      type: 'string',
      group: 'metadata',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'sessionId',
      title: 'Browser Session ID',
      type: 'string',
      group: 'metadata',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'object',
      group: 'metadata',
      fields: [
        { name: 'pageUrl', title: 'Page URL', type: 'url' },
        { name: 'pageTitle', title: 'Page Title', type: 'string' },
        { name: 'referrer', title: 'Referrer', type: 'url' },
        { name: 'userAgent', title: 'User Agent', type: 'string' },
        { name: 'language', title: 'Language', type: 'string' },
        { name: 'ipHash', title: 'IP Hash', type: 'string', readOnly: true },
      ],
    }),
    defineField({
      name: 'firstMessageAt',
      title: 'First Message At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'lastMessageAt',
      title: 'Last Message At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'lastVisitorMessageAt',
      title: 'Last Visitor Message At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'lastTeamMessageAt',
      title: 'Last Team Message At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'noResponseFallbackSentAt',
      title: 'No Response Fallback Sent At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'noResponseFallbackVariant',
      title: 'No Response Fallback Variant',
      type: 'string',
      group: 'metadata',
      readOnly: true,
      options: {
        list: [
          { title: 'Without Name or Email', value: 'withoutContact' },
          { title: 'Without Email', value: 'withoutEmail' },
          { title: 'With Email', value: 'withEmail' },
        ],
      },
    }),
    defineField({
      name: 'noResponseEmailSentAt',
      title: 'No Response Email Sent At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'noResponseEmailAttemptedAt',
      title: 'No Response Email Attempted At',
      type: 'datetime',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'noResponseEmailProviderId',
      title: 'No Response Email Provider ID',
      type: 'string',
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'noResponseEmailLastError',
      title: 'No Response Email Last Error',
      type: 'text',
      rows: 2,
      group: 'metadata',
      readOnly: true,
    }),
    defineField({
      name: 'readAt',
      title: 'Read At',
      type: 'datetime',
      group: 'metadata',
    }),
    defineField({
      name: 'resolvedAt',
      title: 'Resolved At',
      type: 'datetime',
      group: 'metadata',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      status: 'status',
      visitorName: 'visitor.name',
      visitorEmail: 'visitor.email',
      lastMessageAt: 'lastMessageAt',
    },
    prepare({ title, status, visitorName, visitorEmail, lastMessageAt }) {
      const visitor = visitorName || visitorEmail || 'Anonymous visitor'
      const statusLabel = statusOptions.find((option) => option.value === status)?.title || 'New'

      return {
        title: `${statusLabel}: ${title || visitor}`,
        subtitle: lastMessageAt || visitor,
      }
    },
  },
  orderings: [
    {
      title: 'Newest messages first',
      name: 'lastMessageAtDesc',
      by: [{ field: 'lastMessageAt', direction: 'desc' }],
    },
  ],
})
