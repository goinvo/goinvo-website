import { defineField, defineType } from 'sanity'

// AI-citation share-of-voice snapshot (marketingIdea seo-ai-citation-tracking).
// One document per panel run: did AI answer engines (v1: OpenAI web-search)
// mention and cite goinvo.com for GoInvo's topics? Stored over time so the suite
// can chart mention-rate / citation-rate as a trend (share-of-voice).
//
// Written by POST /api/marketing/ai-citation (the route stamps runDate); read
// back as the most-recent snapshots for the trend. Aggregate fields are
// denormalized onto the document so the trend chart never has to recompute from
// the per-prompt results array.

const competitorTallyFields = [
  defineField({
    name: 'name',
    title: 'Competitor / Firm',
    type: 'string',
  }),
  defineField({
    name: 'count',
    title: 'Times Mentioned',
    type: 'number',
    description: 'How many panel prompts surfaced this firm in the AI answer.',
  }),
]

const promptResultFields = [
  defineField({
    name: 'prompt',
    title: 'Prompt',
    type: 'text',
    rows: 2,
  }),
  defineField({
    name: 'goinvoMentioned',
    title: 'GoInvo Mentioned',
    type: 'boolean',
    description: 'The answer text named GoInvo (case-insensitive "goinvo" / "go invo").',
  }),
  defineField({
    name: 'goinvoCited',
    title: 'GoInvo Cited',
    type: 'boolean',
    description: 'At least one citation URL pointed at goinvo.com.',
  }),
  defineField({
    name: 'citedGoinvoUrls',
    title: 'Cited GoInvo URLs',
    type: 'array',
    of: [{ type: 'url' }],
  }),
  defineField({
    name: 'competitorsMentioned',
    title: 'Competitors Mentioned',
    type: 'array',
    of: [{ type: 'string' }],
  }),
  defineField({
    name: 'error',
    title: 'Error',
    type: 'string',
    description: 'Set when this prompt failed; the panel still ran the rest.',
  }),
  defineField({
    name: 'answerText',
    title: 'Answer Text',
    type: 'text',
    rows: 6,
    description: 'The AI answer engine response (stored for auditability).',
  }),
]

export default defineType({
  name: 'aiCitationSnapshot',
  title: 'AI Citation Snapshot',
  type: 'document',
  groups: [
    { name: 'run', title: 'Run', default: true },
    { name: 'aggregate', title: 'Aggregate' },
    { name: 'results', title: 'Results' },
  ],
  fields: [
    defineField({
      name: 'runDate',
      title: 'Run Date',
      type: 'datetime',
      group: 'run',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'model',
      title: 'Model',
      type: 'string',
      group: 'run',
      description: 'The AI answer engine / model used for the panel (v1: OpenAI web-search).',
    }),
    defineField({
      name: 'promptCount',
      title: 'Prompt Count',
      type: 'number',
      group: 'run',
      description: 'How many fixed-panel prompts were run.',
    }),
    defineField({
      name: 'answeredCount',
      title: 'Answered Count',
      type: 'number',
      group: 'run',
      description: 'Prompts that returned an answer (the denominator for the rates).',
    }),
    defineField({
      name: 'unavailable',
      title: 'Unavailable',
      type: 'boolean',
      group: 'run',
      description: 'True when the panel could not run at all (e.g. missing API key).',
    }),
    defineField({
      name: 'mentionRate',
      title: 'Mention Rate',
      type: 'number',
      group: 'aggregate',
      description: 'Share of answered prompts where GoInvo was mentioned (0–1).',
    }),
    defineField({
      name: 'citationRate',
      title: 'Citation Rate',
      type: 'number',
      group: 'aggregate',
      description: 'Share of answered prompts that cited goinvo.com (0–1).',
    }),
    defineField({
      name: 'mentionedCount',
      title: 'Mentioned Count',
      type: 'number',
      group: 'aggregate',
    }),
    defineField({
      name: 'citedCount',
      title: 'Cited Count',
      type: 'number',
      group: 'aggregate',
    }),
    defineField({
      name: 'topCompetitors',
      title: 'Top Competitors',
      type: 'array',
      group: 'aggregate',
      of: [
        {
          name: 'competitorTally',
          title: 'Competitor Tally',
          type: 'object',
          fields: competitorTallyFields,
          preview: { select: { title: 'name', subtitle: 'count' } },
        },
      ],
    }),
    defineField({
      name: 'results',
      title: 'Prompt Results',
      type: 'array',
      group: 'results',
      of: [
        {
          name: 'aiCitationPromptResult',
          title: 'Prompt Result',
          type: 'object',
          fields: promptResultFields,
          preview: {
            select: { title: 'prompt', mentioned: 'goinvoMentioned', cited: 'goinvoCited' },
            prepare({ title, mentioned, cited }) {
              const flags = [mentioned ? 'mentioned' : null, cited ? 'cited' : null].filter(Boolean)
              return {
                title: title || 'Prompt',
                subtitle: flags.length ? flags.join(' + ') : 'not mentioned',
              }
            },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      runDate: 'runDate',
      mentionRate: 'mentionRate',
      citationRate: 'citationRate',
      model: 'model',
    },
    prepare({ runDate, mentionRate, citationRate, model }) {
      const date = typeof runDate === 'string' ? runDate.slice(0, 10) : 'unknown date'
      const pct = (n: unknown) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : '—')
      return {
        title: `AI citation snapshot ${date}`,
        subtitle: `mention ${pct(mentionRate)} / cite ${pct(citationRate)}${model ? ` · ${model}` : ''}`,
      }
    },
  },
  orderings: [
    {
      title: 'Run date, newest first',
      name: 'runDateDesc',
      by: [{ field: 'runDate', direction: 'desc' }],
    },
  ],
})

export { competitorTallyFields, promptResultFields }
