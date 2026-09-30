/**
 * Seed the lead-magnet registry documents (idempotent createIfNotExists — never
 * overwrites Studio edits). Run whenever a new capture point ships:
 *
 *   node scripts/seed-lead-magnets.mjs
 *
 * Reads NEXT_PUBLIC_SANITY_PROJECT_ID + SANITY_API_WRITE_TOKEN (or
 * SANITY_WRITE_TOKEN) from the environment or .env.local.
 */
import { readFileSync, existsSync } from 'node:fs'

for (const envPath of ['.env.local']) {
  if (!existsSync(envPath)) continue
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
if (!projectId || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or a Sanity write token.')
  process.exit(1)
}

/** One entry per shipped capture point. Deterministic _id keeps this idempotent. */
const LEAD_MAGNETS = [
  {
    _id: 'leadMagnet-doh-revisions',
    _type: 'marketingLeadMagnet',
    title: 'Determinants of Health — revision notices',
    slug: { _type: 'slug', current: 'doh-revisions' },
    status: 'live',
    description:
      'Post-download ask on the DoH poster downloads: one email when the poster/data is revised. No gated asset — the promise is the notification itself.',
    articlePath: '/vision/determinants-of-health',
    emailOctopusTag: 'doh-revisions',
    createOutreachContacts: true,
  },
]

const mutations = LEAD_MAGNETS.map((doc) => ({ createIfNotExists: doc }))
const res = await fetch(
  `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  },
)
if (!res.ok) {
  console.error('Seed failed:', res.status, await res.text())
  process.exit(1)
}
const result = await res.json()
console.log(`Seeded ${LEAD_MAGNETS.length} lead magnet(s):`, JSON.stringify(result.results?.map((r) => ({ id: r.id, operation: r.operation }))))
