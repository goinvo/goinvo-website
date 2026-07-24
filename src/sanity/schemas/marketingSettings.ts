import { CogIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'

// The marketing suite reads ONE singleton (`_id == "marketingSettings"`).
// NOTE: the financial posture is deliberately NOT a field here — this singleton
// lives in the world-readable production dataset, and the runway bin is candid
// feasibility data. It is stored in the PRIVATE outreach dataset instead (see
// src/lib/marketing/financialPosture.ts).
export const MARKETING_SETTINGS_ID = 'marketingSettings'

export const MARKETING_AI_MODEL_OPTIONS = [
  { title: 'Best quality — Claude Opus 4.8 (default)', value: 'claude-opus-4-8' },
  { title: 'Cheaper, near-equal quality — Claude Sonnet 4.6', value: 'claude-sonnet-4-6' },
  { title: 'Cheapest, rougher — Claude Haiku 4.5', value: 'claude-haiku-4-5' },
]

export default defineType({
  name: 'marketingSettings',
  title: 'Marketing Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'aiModel',
      title: 'AI model for the marketing suite',
      description:
        'Which Claude model powers the assistant, research, and AI-citation checks. Opus = best quality; Sonnet = ~3× cheaper with near-equal quality; Haiku = cheapest but rougher. Cost is only a few dollars/month at typical volume, so the default is best-quality.',
      type: 'string',
      options: { list: MARKETING_AI_MODEL_OPTIONS, layout: 'radio' },
      initialValue: 'claude-opus-4-8',
      validation: (rule) => rule.custom((value) =>
        !value || MARKETING_AI_MODEL_OPTIONS.some((option) => option.value === value)
          ? true
          : 'Choose one of the approved marketing-suite models.',
      ),
    }),
    defineField({
      name: 'brandVoices',
      title: 'Brand voices',
      description:
        'Reusable writing styles for outward-facing marketing copy. Keep client names, private facts, and unapproved claims out of voice profiles because this settings document lives in the public production dataset.',
      type: 'array',
      validation: (rule) => rule.max(20),
      of: [
        {
          type: 'object',
          name: 'marketingBrandVoice',
          title: 'Brand voice',
          fields: [
            defineField({
              name: 'name',
              title: 'Name',
              type: 'string',
              validation: (rule) => rule.required().max(80),
            }),
            defineField({
              name: 'purpose',
              title: 'Best used for',
              description: 'For example: principal outreach, public essays, or product announcements.',
              type: 'string',
              validation: (rule) => rule.max(280),
            }),
            defineField({
              name: 'guidance',
              title: 'Voice guidance',
              description: 'Describe the cadence, point of view, level of formality, and personality in plain language.',
              type: 'text',
              rows: 5,
              validation: (rule) => rule.max(2400),
            }),
            defineField({
              name: 'do',
              title: 'Do',
              type: 'array',
              of: [{ type: 'string' }],
              validation: (rule) => rule.max(12),
            }),
            defineField({
              name: 'avoid',
              title: 'Avoid',
              type: 'array',
              of: [{ type: 'string' }],
              validation: (rule) => rule.max(12),
            }),
            defineField({
              name: 'examples',
              title: 'Representative snippets',
              description:
                'Up to 6 short, diverse snippets that demonstrate different voice principles. Prefer range over near-duplicates; examples never override factual evidence.',
              type: 'array',
              of: [{ type: 'string' }],
              validation: (rule) => rule.max(6),
            }),
            defineField({
              name: 'status',
              title: 'Status',
              type: 'string',
              options: {
                list: [
                  { title: 'Active', value: 'active' },
                  { title: 'Archived', value: 'archived' },
                ],
                layout: 'radio',
              },
              initialValue: 'active',
            }),
            defineField({
              name: 'isDefault',
              title: 'Default voice',
              description: 'The Marketing Suite uses one active default unless a workflow selects another voice.',
              type: 'boolean',
              initialValue: false,
            }),
          ],
          preview: {
            select: { title: 'name', purpose: 'purpose', status: 'status', isDefault: 'isDefault' },
            prepare: ({ title, purpose, status, isDefault }) => ({
              title: title || 'Untitled voice',
              subtitle: `${isDefault ? 'Default · ' : ''}${status === 'archived' ? 'Archived' : purpose || 'Active'}`,
            }),
          },
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Marketing Settings', subtitle: 'Brand voices + AI model + suite preferences' }) },
})
