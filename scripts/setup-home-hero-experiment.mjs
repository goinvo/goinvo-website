// Registers the readout without fabricating data or changing historical tests.
// Run with --write to create; reruns preserve any subsequent Studio edits.
import 'dotenv/config'
import { config } from 'dotenv'
import { createClient } from '@sanity/client'

config({ path: '.env.local', quiet: true })

const doc = {
  _id: 'experiment-home-hero-runway',
  _type: 'marketingExperiment',
  title: 'Homepage hero: Ipsos vs Everything is designed',
  status: 'idea',
  hypothesis: 'The handwritten claim and animated runway of shipped work will increase discovery-call interest compared with the current Ipsos hero.',
  expectedSignal: 'Higher qualified discovery-call click rate, supported by booked calls and work exploration.',
  targetType: 'homepage',
  targetPath: '/',
  flagKey: 'home-hero-runway-variant',
  variants: [
    { _key: 'control', _type: 'experimentVariant', key: 'control', label: 'Current Ipsos hero', notes: '50% of visitors. Existing homepage hero.', previewUrl: '/?home-hero-runway-variant=control' },
    { _key: 'runway', _type: 'experimentVariant', key: 'runway', label: 'Everything is designed runway', notes: '50% of visitors. Hero from PR #57; all other homepage content is shared.', previewUrl: '/?home-hero-runway-variant=runway' },
  ],
  primaryMetric: 'Qualified discovery-call clicks',
  trackedMetrics: [
    ['qualified-discovery-call-clicks', 'Qualified discovery-call clicks', 'qualified_discovery_call_click', 'secondary'],
    ['discovery-calls-booked', 'Discovery calls booked', 'discovery_call_booked', 'secondary'],
    ['work-exploration-clicks', 'Work exploration clicks', 'view_work_click', 'guardrail'],
    ['discovery-form-starts', 'Discovery form starts', 'discovery_form_start', 'diagnostic'],
  ].map(([key, label, eventName, role]) => ({ _key: key, _type: 'experimentMetric', key, label, eventName, role, comparison: 'comparative', source: 'vercelEvent', unit: 'events' })),
  successTrackers: [
    { _key: 'cta-lift', _type: 'experimentSuccessTracker', title: 'Discovery-call interest', trackerType: 'metricRule', condition: 'increase', metricKeys: ['qualified-discovery-call-clicks'], successWhen: 'Runway improves qualified discovery-call click rate over control.' },
    { _key: 'work-guardrail', _type: 'experimentSuccessTracker', title: 'Work exploration', trackerType: 'metricRule', condition: 'notDecrease', metricKeys: ['work-exploration-clicks'], successWhen: 'Work exploration rate does not decrease.' },
  ],
  qaNotes: 'Prepared for deployment. Set status to Running and measurementStart to deployment time when the code ships. Server-rendered 50/50 assignment; sticky visitor cookie; forced preview links excluded from measurement. FLAGS_SECRET is required on Vercel; no new FLAGS toggle is required. Measurement key: 2026-09-08-initial-v1. Existing first-party KV collector and drain cron provide readouts.',
}

if (!process.argv.includes('--write')) {
  console.log(JSON.stringify(doc, null, 2))
} else {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) throw new Error('Sanity project and write token are required')
  const client = createClient({ projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach', token: process.env.SANITY_WRITE_TOKEN, apiVersion: '2026-09-08', useCdn: false })
  const existing = await client.fetch('*[_type == "marketingExperiment" && flagKey == $flagKey][0]{_id}', { flagKey: doc.flagKey })
  const result = existing || await client.createIfNotExists(doc)
  console.log(`Experiment readout ready: ${result._id}`)
}
