/**
 * Import EmailOctopus list contacts into the PRIVATE outreach dataset as
 * marketingContact docs (Juhan's initial contact pool, 2026-08 — he asked for
 * the list to be pulled from EmailOctopus rather than imported by hand).
 *
 *   npx tsx scripts/import-emailoctopus-contacts.ts            # dry run
 *   npx tsx scripts/import-emailoctopus-contacts.ts --live     # write
 *
 * Rules:
 *  - only `subscribed` contacts (never the unsubscribed — they opted out)
 *  - team members excluded (same directory check as outreach intake)
 *  - ids + identity claims use the same email-first hashing as the intake
 *    route, so any source (signup, spreadsheet intake, this import) converges
 *    on one contact row
 *  - createIfNotExists everywhere: re-runs are no-ops, Studio edits never
 *    overwritten
 *  - attributionChannel `emailoctopus-import` keeps these distinct from
 *    lead-magnet/newsletter signups in the dashboard counts
 *
 * Env (from .env.local in the CWD): EMAIL_OCTOPUS_API_KEY / EMAILOCTOPUS_API_KEY,
 * EMAIL_OCTOPUS_LIST_ID / EMAILOCTOPUS_LIST_ID, NEXT_PUBLIC_SANITY_PROJECT_ID,
 * SANITY_API_WRITE_TOKEN (or SANITY_WRITE_TOKEN).
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

const LIVE = process.argv.includes('--live')
const eoKey = (process.env.EMAILOCTOPUS_API_KEY || process.env.EMAIL_OCTOPUS_API_KEY || '').trim()
const eoListId = (process.env.EMAILOCTOPUS_LIST_ID || process.env.EMAIL_OCTOPUS_LIST_ID || '').trim()
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const writeToken = (process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN || '').trim()
const productionDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
if (!eoKey || !eoListId || !projectId || !writeToken) {
  console.error('Missing env: need the EmailOctopus key + list id and Sanity project id + write token.')
  process.exit(1)
}

interface EoContact {
  id: string
  email_address?: string
  status?: string
  fields?: Record<string, unknown>
  tags?: string[]
  created_at?: string
}

async function fetchAllContacts(): Promise<EoContact[]> {
  const all: EoContact[] = []
  let url: string | null =
    `https://api.emailoctopus.com/lists/${encodeURIComponent(eoListId)}/contacts?limit=100`
  for (let page = 0; url && page < 200; page += 1) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${eoKey}` } })
    if (!res.ok) throw new Error(`EmailOctopus contacts fetch failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
    const body = (await res.json()) as { data?: EoContact[]; paging?: { next?: { url?: string; starting_after?: string } | null } }
    all.push(...(body.data || []))
    const next = body.paging?.next
    if (next?.url) url = next.url
    else if (next?.starting_after) {
      url = `https://api.emailoctopus.com/lists/${encodeURIComponent(eoListId)}/contacts?limit=100&starting_after=${encodeURIComponent(next.starting_after)}`
    } else url = null
  }
  return all
}

/** Same email-first derivation as the intake route's contactDocumentId. */
function contactDocId(identity: { name: string; email: string }): string {
  const key = contactIdentityKeys(identity).find((k) => k.startsWith('email:'))
  if (!key) throw new Error(`No email identity for ${identity.name}`)
  return `marketingContact-${createHash('sha256').update(key).digest('hex').slice(0, 40)}`
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 2)}***@${domain}`
}

async function main() {
  const raw = await fetchAllContacts()
  const subscribed = raw.filter((contact) => contact.status === 'subscribed')

  const teamClient = createClient({ projectId, dataset: productionDataset, token: writeToken, apiVersion: '2024-01-01', useCdn: false })
  const teamEmails = new Set(
    ((await teamClient.fetch<Array<string | null>>(
      `*[_type == "teamMember" && defined(social.email)].social.email`,
    )) || [])
      .map((value) => normalizeOutreachEmail(value || undefined))
      .filter(Boolean),
  )

  const importDate = new Date().toISOString().slice(0, 10)
  const seen = new Set<string>()
  let invalidEmails = 0
  let teamSkipped = 0
  let duplicatesInList = 0

  const prepared: Array<{ id: string; name: string; email: string; doc: Record<string, unknown> }> = []
  for (const contact of subscribed) {
    const email = normalizeOutreachEmail(contact.email_address)
    if (!email) {
      invalidEmails += 1
      continue
    }
    if (teamEmails.has(email)) {
      teamSkipped += 1
      continue
    }
    if (seen.has(email)) {
      duplicatesInList += 1
      continue
    }
    seen.add(email)

    const first = typeof contact.fields?.FirstName === 'string' ? contact.fields.FirstName.trim() : ''
    const last = typeof contact.fields?.LastName === 'string' ? contact.fields.LastName.trim() : ''
    const name = [first, last].filter(Boolean).join(' ') || email
    const tags = Array.isArray(contact.tags) ? contact.tags.filter((t) => typeof t === 'string').slice(0, 10) : []

    const id = contactDocId({ name, email })
    const doc: Record<string, unknown> = {
      ...buildContactCreateDoc({
        name,
        email,
        howWeKnow: 'GoInvo newsletter subscriber (imported from the EmailOctopus "Audience" list)',
        sourceLine: `emailoctopus-import ${importDate}${tags.length ? ` · tags: ${tags.join(', ')}` : ''}`,
      }),
      _id: id,
      attributionChannel: 'emailoctopus-import',
    }
    prepared.push({ id, name, email, doc })
  }

  console.log(JSON.stringify({
    mode: LIVE ? 'LIVE' : 'dry-run',
    fetched: raw.length,
    subscribed: subscribed.length,
    invalidEmails,
    teamSkipped,
    duplicatesInList,
    toImport: prepared.length,
    sample: prepared.slice(0, 5).map((p) => ({ name: p.name === p.email ? maskEmail(p.email) : p.name, email: maskEmail(p.email) })),
  }, null, 2))

  if (!LIVE) {
    console.log('Dry run only — re-run with --live to write.')
    return
  }

  const outreachClient = createClient({ projectId, dataset: OUTREACH_DATASET, token: writeToken, apiVersion: '2024-01-01', useCdn: false })
  const before = await outreachClient.fetch<number>(`count(*[_type == "marketingContact"])`)

  const BATCH = 25
  for (let i = 0; i < prepared.length; i += BATCH) {
    const batch = prepared.slice(i, i + BATCH)
    let transaction = outreachClient.transaction()
    for (const item of batch) {
      transaction = transaction.createIfNotExists(item.doc as { _id: string; _type: string })
      const claims = await buildMarketingContactIdentityClaims({ name: item.name, email: item.email }, item.id)
      for (const claim of claims) transaction = transaction.createIfNotExists(claim)
    }
    await transaction.commit()
    process.stdout.write(`\rcommitted ${Math.min(i + BATCH, prepared.length)}/${prepared.length}`)
  }
  process.stdout.write('\n')

  const after = await outreachClient.fetch<number>(`count(*[_type == "marketingContact"])`)
  console.log(JSON.stringify({ contactsBefore: before, contactsAfter: after, newlyCreated: after - before }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
