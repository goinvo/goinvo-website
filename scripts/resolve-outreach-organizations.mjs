#!/usr/bin/env node
/**
 * Resolve contact organisations against real registries instead of guessing.
 *
 * enrich-outreach-contacts.mjs derives a name by chopping up the email domain,
 * which produces "Carolinashealthcare", "Cherishhealth" and "Umd". Those are not
 * names, they are string manipulation, and they were about to be shown to a
 * colleague as findings. A company's legal name is a LOOKUP, not a judgement —
 * so it should come from a registry, not from a model asked to remember.
 *
 * Sources, all keyless and free:
 *
 *   Clearbit autocomplete  domain -> official company name.
 *   Wikidata               name -> short description + industry (P452).
 *
 * Neither is asked for an opinion. What they cannot answer is left alone rather
 * than filled in, and a model is never used to invent an identity.
 *
 *   node scripts/resolve-outreach-organizations.mjs                  # dry run
 *   node scripts/resolve-outreach-organizations.mjs --limit 40
 *   node scripts/resolve-outreach-organizations.mjs --apply --limit 200
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const verbose = args.includes('--verbose')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 60

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset =
  process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
if (!projectId || !token) throw new Error('Sanity project id and a write token are required.')

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token,
  useCdn: false,
})

const FREEMAIL = /^(gmail|yahoo|hotmail|outlook|aol|icloud|me|msn|live|comcast|verizon|att|protonmail|proton|mac|ymail|googlemail|sbcglobal|cox|earthlink|mail|gmx|yandex|qq|163|rocketmail|zoho|fastmail|hey|duck|pm|web|orange|free|libero)\./

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Clearbit returns FUZZY suggestions, which is a trap: querying partners.org
 * happily returns "Charleys Philly Steaks" as its best guess. Only a match whose
 * domain is exactly the one asked for can be trusted.
 */
async function officialName(domain) {
  try {
    const response = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(domain)}`,
      { signal: AbortSignal.timeout(12000) },
    )
    if (!response.ok) return null
    const suggestions = await response.json()
    if (!Array.isArray(suggestions)) return null
    const exact = suggestions.find(
      (item) => String(item?.domain || '').toLowerCase() === domain.toLowerCase(),
    )
    return exact?.name ? String(exact.name).trim() : null
  } catch {
    return null
  }
}

/** Wikidata's one-line description is a compact, human-written sector signal. */
async function wikidataDescription(name) {
  try {
    const url =
      'https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&limit=1' +
      `&search=${encodeURIComponent(name)}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'goinvo-outreach-research/1.0 (https://www.goinvo.com)' },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) return null
    const body = await response.json()
    const hit = body?.search?.[0]
    if (!hit) return null
    // Guard against a loose match on a short name: "Cherish" must not resolve to
    // an unrelated entity that merely starts the same way.
    const label = String(hit.label || '').toLowerCase()
    const target = name.toLowerCase()
    if (!label.includes(target) && !target.includes(label)) return null
    return hit.description ? String(hit.description) : null
  } catch {
    return null
  }
}

/**
 * Descriptions that prove the match is not an organisation at all.
 *
 * Wikidata's top hit for "MITRE" is the surname, described as "family name".
 * Without this the brief would carry a sector derived from a person's name.
 */
const NOT_AN_ORGANISATION = [
  'family name', 'given name', 'surname', 'disambiguation', 'wikimedia',
  'clinical trial', 'village', 'town in', 'city in', 'commune in', 'genus',
  'species', 'film', 'album', 'song', 'novel', 'river', 'mountain', 'unincorporated',
]

/**
 * Sector needles, deliberately narrow.
 *
 * A first pass mapped "software company" to healthtech, which made Salesforce a
 * health-technology company, and matched "clinic" inside "clinical trial", which
 * made a research platform a hospital. Every needle here therefore has to name
 * health explicitly or be unambiguous on its own — a generic industry word is
 * worse than no answer, because no answer leaves the record honestly blank.
 */
const SECTOR_FROM_DESCRIPTION = [
  ['pharma', ['pharmaceutic', 'biotechnolog', 'biopharma', 'vaccine manufactur']],
  ['medDevice', ['medical device', 'medical equipment', 'medical technolog']],
  ['provider', ['hospital', 'health system', 'medical center', 'medical centre',
    'healthcare provider', 'health care provider', 'cancer center', 'cancer centre',
    'health network']],
  ['payer', ['health insur', 'health plan', 'insurance company']],
  ['healthtech', ['health information', 'digital health', 'health technolog',
    'electronic health', 'health software', 'healthcare software']],
  ['research', ['university', 'college', 'research institute', 'research organization',
    'polytechnic', 'school of design']],
  ['government', ['government agency', 'federal agency', 'public agency',
    'executive agency', 'ministry of']],
]

function sectorFromDescription(description) {
  const text = String(description || '').toLowerCase()
  if (!text) return null
  if (NOT_AN_ORGANISATION.some((needle) => text.includes(needle))) return null
  for (const [sector, needles] of SECTOR_FROM_DESCRIPTION) {
    if (needles.some((needle) => text.includes(needle))) return sector
  }
  return null
}

const contacts = await client.fetch(
  '*[_type == "marketingContact" && defined(email)]{_id, email, organization, researchSuggestedSegment, segment}',
)

// One lookup per DOMAIN, not per contact: nine people at Mass General Brigham is
// one question, and the free endpoints deserve to be asked once.
const byDomain = new Map()
for (const contact of contacts) {
  const email = String(contact.email || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 0) continue
  const domain = email.slice(at + 1)
  if (FREEMAIL.test(domain)) continue
  if (!byDomain.has(domain)) byDomain.set(domain, [])
  byDomain.get(domain).push(contact)
}

// Busiest domains first: they are the names that appear on the brief.
const domains = [...byDomain.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, limit)

console.log(`dataset ${dataset} · ${byDomain.size} organisational domains · resolving ${domains.length}`)
console.log('')

const changes = []
let named = 0
let sectored = 0
let unresolved = 0

for (const [domain, group] of domains) {
  const resolvedName = await officialName(domain)
  await sleep(120)

  let description = null
  let sector = null
  if (resolvedName) {
    description = await wikidataDescription(resolvedName)
    sector = sectorFromDescription(description)
    await sleep(120)
  }

  if (!resolvedName) {
    unresolved += 1
    if (verbose) console.log(`  ${domain.padEnd(30)} (no registry match - leaving as is)`)
    continue
  }
  named += 1
  if (sector) sectored += 1

  const current = String(group[0].organization || '').trim()
  const nameChanged = current.toLowerCase() !== resolvedName.toLowerCase()
  console.log(
    `  ${domain.padEnd(30)} ${resolvedName}` +
      (nameChanged && current ? `   (was "${current}")` : '') +
      (sector ? `   [${sector}]` : '') +
      (description ? `   — ${description}` : ''),
  )

  for (const contact of group) {
    const set = {}
    if (String(contact.organization || '').trim().toLowerCase() !== resolvedName.toLowerCase()) {
      set.organization = resolvedName
    }
    // Never override a human-confirmed segment, and never downgrade an existing
    // suggestion unless the registry actually disagrees.
    if (sector && !contact.segment && contact.researchSuggestedSegment !== sector) {
      set.researchSuggestedSegment = sector
    }
    if (Object.keys(set).length > 0) changes.push({ _id: contact._id, set })
  }
}

console.log('')
console.log(`resolved names     ${named}/${domains.length}`)
console.log(`with a sector      ${sectored}`)
console.log(`no registry match  ${unresolved}  (left exactly as they were)`)
console.log(`contact updates    ${changes.length}`)

if (!apply) {
  console.log('')
  console.log('Dry run - nothing written. Re-run with --apply.')
  process.exit(0)
}

const BATCH = 100
let written = 0
for (let i = 0; i < changes.length; i += BATCH) {
  let tx = client.transaction()
  for (const change of changes.slice(i, i + BATCH)) {
    tx = tx.patch(change._id, (patch) => patch.set(change.set))
  }
  await tx.commit()
  written += Math.min(BATCH, changes.length - i)
  console.log(`  updated ${written}/${changes.length}`)
}
console.log('')
console.log(`Updated ${written} contacts from registry data. Confirmed segments were not touched.`)
