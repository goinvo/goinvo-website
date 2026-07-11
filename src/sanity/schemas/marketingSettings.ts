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
    }),
  ],
  preview: { prepare: () => ({ title: 'Marketing Settings', subtitle: 'AI model + suite preferences' }) },
})
