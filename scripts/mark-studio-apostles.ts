/**
 * Mark "studio apostles" — people super-bought-into GoInvo — as hot contacts
 * in the private outreach dataset, so the call plan surfaces them first
 * (warmth beats model score in the ranking).
 *
 *   npx tsx scripts/mark-studio-apostles.ts a@x.com b@y.com …
 *   npx tsx scripts/mark-studio-apostles.ts --file apostles.txt   # one email/line
 *
 * Works whether or not the person is already a contact: existing contacts are
 * patched (warmth → hot + an apostle note); unknown emails become new hot
 * contacts with the same email-first identity hashing as every other source,
 * so a later import/intake of the same person converges on this row.
 * Idempotent: re-running never duplicates notes or docs.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@sanity/client'
import {
  buildContactCreateDoc,
  contactIdentityKeys,
  normalizeOutreachEmail,
} from '../src/lib/marketing/outreach'
import { buildMarketingContactIdentityClaims } from '../src/lib/marketing/outreachIdentityClaims'
import { OUTREACH_DATASET } from '../src/lib/marketing/outreachEnums'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const writeToken = (process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN || '').trim()
if (!projectId || !writeToken) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or a Sanity write token.')
  process.exit(1)
}

const APOSTLE_NOTE = 'studio apostle'

const args = process.argv.slice(2)
const emails: string[] = []
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--file') {
    const file = args[i + 1]
    if (!file || !existsSync(file)) {
      console.error(`--file requires a readable path (got ${file || 'nothing'}).`)
      process.exit(1)
    }
    emails.push(...readFileSync(file, 'utf8').split(/\r?\n/))
    i += 1
  } else emails.push(args[i])
}

const normalized = [...new Set(emails.map((value) => normalizeOutreachEmail(value)).filter(Boolean))] as string[]
if (!normalized.length) {
  console.error('No valid emails given. Usage: npx tsx scripts/mark-studio-apostles.ts a@x.com … or --file <path>')
  process.exit(1)
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

function contactDocId(identity: { name: string; email: string }): string {
  const key = contactIdentityKeys(identity).find((k) => k.startsWith('email:'))
  if (!key) throw new Error('No email identity key.')
  return `marketingContact-${createHash('sha256').update(key).digest('hex').slice(0, 40)}`
}

async function main() {
  const client = createClient({ projectId, dataset: OUTREACH_DATASET, token: writeToken, apiVersion: '2024-01-01', useCdn: false })

  for (const email of normalized) {
    // Match by normalized email regardless of which source created the row.
    const existing = await client.fetch<{ _id: string; sourceNotes?: string } | null>(
      `*[_type == "marketingContact" && lower(email) == $email][0]{ _id, sourceNotes }`,
      { email },
    )

    if (existing) {
      const notes = existing.sourceNotes || ''
      await client
        .patch(existing._id)
        .set({
          warmth: 'hot',
          ...(notes.includes(APOSTLE_NOTE) ? {} : { sourceNotes: notes ? `${notes} · ${APOSTLE_NOTE}` : APOSTLE_NOTE }),
        })
        .commit()
      console.log(JSON.stringify({ email: maskEmail(email), action: 'marked-hot', id: existing._id }))
      continue
    }

    const identity = { name: email, email }
    const id = contactDocId(identity)
    const doc = {
      ...buildContactCreateDoc({
        name: email,
        email,
        warmth: 'hot',
        howWeKnow: 'Studio apostle — long-time GoInvo supporter',
        sourceLine: `${APOSTLE_NOTE} · added ${new Date().toISOString().slice(0, 10)}`,
      }),
      _id: id,
    }
    let transaction = client.transaction().createIfNotExists(doc as { _id: string; _type: string })
    for (const claim of await buildMarketingContactIdentityClaims(identity, id)) {
      transaction = transaction.createIfNotExists(claim)
    }
    await transaction.commit()
    console.log(JSON.stringify({ email: maskEmail(email), action: 'created-hot', id }))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
