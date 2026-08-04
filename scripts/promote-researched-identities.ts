/**
 * Promote AI-researched identities into the structured contact fields — ONLY
 * where the wrong-person guard's conditions hold:
 *
 *   - personVerified === true AND identityConfidence === 'high'
 *   - the current `name` is still the import placeholder (an email address),
 *     so no human-entered identity exists to overwrite
 *   - the extracted name/role/organization appear VERBATIM in that contact's
 *     own researchSummary (anti-hallucination check)
 *
 * The previous values are appended to `identityHistory` (outreachIdentitySnapshot)
 * so every promotion is auditable and reversible in the Studio.
 *
 *   npx tsx scripts/promote-researched-identities.ts          # dry run
 *   npx tsx scripts/promote-researched-identities.ts --live   # write
 *
 * Extraction uses a small fast model over the already-gathered summaries — no
 * new web research. Requires ANTHROPIC_API_KEY + Sanity write token.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@sanity/client'
import { generateClaudeText, isAnthropicConfigured, parseJsonObject } from '../src/lib/marketing/anthropicJson'
import { randomKey } from '../src/lib/marketing/derive'
import { OUTREACH_DATASET } from '../src/lib/marketing/outreachEnums'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const writeToken = (process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN || '').trim()
const LIVE = process.argv.includes('--live')
const EXTRACTION_MODEL = process.env.IDENTITY_EXTRACTION_MODEL || 'claude-haiku-4-5'

if (!projectId || !writeToken) {
  console.error('Missing Sanity project id or write token.')
  process.exit(1)
}
if (!isAnthropicConfigured()) {
  console.error('ANTHROPIC_API_KEY is not configured.')
  process.exit(1)
}

const client = createClient({ projectId, dataset: OUTREACH_DATASET, token: writeToken, apiVersion: '2024-01-01', useCdn: false })

interface Candidate {
  _id: string
  _rev: string
  name?: string
  email?: string
  organization?: string
  role?: string
  researchSummary?: string
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split('@')
  return `${(local || '').slice(0, 2)}***@${domain}`
}

const containsCI = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase())

const isBareDomain = (value: string | undefined) =>
  Boolean(value && value.includes('.') && !value.includes(' '))

async function main() {
  const candidates = await client.fetch<Candidate[]>(
    `*[_type == "marketingContact"
      && attributionChannel == "emailoctopus-import"
      && defined(researchedAt)
      && personVerified == true
      && identityConfidence == "high"
      && name match "*@*"
    ]{ _id, _rev, name, email, organization, role, researchSummary }`,
  )

  let promoted = 0
  let noExtract = 0
  let rejected = 0
  const preview: Array<Record<string, unknown>> = []

  for (const contact of candidates) {
    const summary = contact.researchSummary || ''
    if (!summary) { noExtract += 1; continue }

    let extracted: { name?: unknown; role?: unknown; organization?: unknown }
    try {
      const result = await generateClaudeText({
        system:
          'Extract the researched person\'s identity from the given research summary. Reply with ONLY a JSON object {"name": string|null, "role": string|null, "organization": string|null}. Use null for anything the summary does not explicitly state. Copy wording exactly from the summary — do not infer, rephrase, or guess.',
        user: summary,
        model: EXTRACTION_MODEL,
        maxTokens: 300,
      })
      extracted = parseJsonObject(result.text) as typeof extracted
    } catch {
      noExtract += 1
      continue
    }

    const name = typeof extracted.name === 'string' ? extracted.name.trim() : ''
    const role = typeof extracted.role === 'string' ? extracted.role.trim() : ''
    const organization = typeof extracted.organization === 'string' ? extracted.organization.trim() : ''

    // Anti-hallucination: every promoted value must appear in the summary itself.
    const validName = name && name.length <= 80 && name.split(/\s+/).length >= 2
      && !name.includes('@') && containsCI(summary, name)
    if (!validName) { rejected += 1; continue }
    const validRole = role && role.length <= 120 && containsCI(summary, role) ? role : undefined
    const replaceOrg = organization && organization.length <= 120 && containsCI(summary, organization)
      && (!contact.organization || isBareDomain(contact.organization))
      ? organization
      : undefined

    promoted += 1
    if (preview.length < 12) {
      preview.push({ email: maskEmail(contact.email || contact.name || ''), name, role: validRole || null, organization: replaceOrg || contact.organization || null })
    }

    if (LIVE) {
      const snapshot = {
        _key: randomKey(),
        _type: 'outreachIdentitySnapshot',
        name: contact.name,
        ...(contact.organization ? { organization: contact.organization } : {}),
        ...(contact.role ? { role: contact.role } : {}),
        changedAt: new Date().toISOString(),
        changedBy: 'research identity promotion (verified-high batch)',
      }
      await client
        .patch(contact._id)
        .ifRevisionId(contact._rev)
        .setIfMissing({ identityHistory: [] })
        .set({
          name,
          ...(validRole ? { role: validRole } : {}),
          ...(replaceOrg ? { organization: replaceOrg } : {}),
        })
        .append('identityHistory', [snapshot])
        .commit()
    }
  }

  console.log(JSON.stringify({
    mode: LIVE ? 'LIVE' : 'dry-run',
    candidates: candidates.length,
    promoted,
    rejectedByGuards: rejected,
    noUsableExtraction: noExtract,
    extractionModel: EXTRACTION_MODEL,
    preview,
  }, null, 1))
  if (!LIVE) console.log('Dry run — re-run with --live to write.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
