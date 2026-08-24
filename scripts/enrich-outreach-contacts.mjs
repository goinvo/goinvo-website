#!/usr/bin/env node
/**
 * Give the imported newsletter contacts enough structure to be segmented.
 *
 * The 1,965 marketingContact records came in from EmailOctopus with an email
 * and nothing else: no organisation, no segment, no owner. That is why the
 * outreach plan reads "call the top-ranked ten warm contacts" against a list
 * with nothing to rank.
 *
 * This fills in only what an email address can actually tell you:
 *
 *   organization              - from the domain, and only when it is empty.
 *   researchSuggestedSegment  - the sector the domain belongs to.
 *
 * What it deliberately does NOT touch:
 *
 *   segment   - human-owned. The schema is explicit that a research suggestion
 *               "never overwrites the human-owned Segment field", so a guess
 *               from a domain goes in the suggestion field and a person
 *               confirms it.
 *   warmth    - warmth is a fact about a relationship. Nobody on this list has
 *               ever been contacted (0 logged checkpoints), so marking anyone
 *               "warm" would be inventing the very thing the outreach plan is
 *               supposed to be built on.
 *   owner, status, howWeKnow - all human-owned.
 *
 * Free-mail addresses are skipped entirely: gmail.com tells you nothing about
 * where someone works, and writing "Gmail" into organization would be worse
 * than leaving it blank.
 *
 *   node scripts/enrich-outreach-contacts.mjs            # dry run, prints a summary
 *   node scripts/enrich-outreach-contacts.mjs --apply
 *   node scripts/enrich-outreach-contacts.mjs --apply --limit 50
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const limitArg = args.indexOf('--limit')
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity

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

const FREEMAIL = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com',
  'me.com', 'msn.com', 'live.com', 'comcast.net', 'verizon.net', 'att.net',
  'protonmail.com', 'proton.me', 'mac.com', 'ymail.com', 'googlemail.com',
  'sbcglobal.net', 'cox.net', 'earthlink.net', 'mail.com', 'gmx.com', 'gmx.de',
  'yandex.com', 'qq.com', '163.com', 'rocketmail.com', 'zoho.com', 'fastmail.com',
  'hey.com', 'duck.com', 'pm.me', 'web.de', 'orange.fr', 'free.fr', 'libero.it',
])
const isFreemail = (domain) =>
  FREEMAIL.has(domain) ||
  domain.startsWith('yahoo.') ||
  domain.startsWith('hotmail.') ||
  domain.startsWith('outlook.')

/**
 * Sector rules, most specific first: a university teaching hospital is a
 * provider even though it sits on a .edu, so the named lists have to beat the
 * TLD fallbacks underneath them.
 */
const SECTOR_RULES = [
  ['provider', ['partners.org', 'massgeneral', 'mgb.org', 'brighamandwomens', 'bidmc',
    'dfci', 'childrens.harvard', 'mayo.edu', 'urmc.rochester', 'clevelandclinic', 'jhmi',
    'hopkinsmedicine', 'kp.org', 'kaiser', 'sutterhealth', 'geisinger', 'intermountain',
    'ochsner', 'mountsinai', 'nyulangone', 'cedars-sinai', 'stanfordhealthcare',
    'uwmedicine', 'atriumhealth', 'advocate', 'crossoverhealth', 'cityblock',
    'onemedical', 'newclin', 'hospital', 'health.org', 'healthcare.org', 'clinic']],
  ['pharma', ['pfizer', 'novartis', 'roche', 'genentech', 'merck', 'astrazeneca', 'gsk.com',
    'glaxo', 'sanofi', 'bayer', 'lilly.com', 'abbvie', 'amgen', 'biogen', 'takeda',
    'moderna', 'modernatx', 'regeneron', 'vrtx', 'bms.com', 'bristol', 'boehringer',
    'novonordisk', 'teva', 'alexion', 'alnylam', 'ionis', 'jazzpharma', 'astellas',
    'daiichi', 'eisai', 'otsuka', 'ucb.com', 'servier', 'organon', 'viatris', 'incyte',
    'seagen', 'pharma', 'biotech', 'therapeutics', 'biosciences']],
  ['medDevice', ['medtronic', 'bostonscientific', 'stryker', 'abbott', 'baxter', 'zimmer',
    'edwards', 'teleflex', 'smith-nephew', 'hologic', 'intuitive', 'dexcom', 'insulet',
    'resmed', 'masimo', 'natus', 'integra', 'conmed', 'olympus', 'karlstorz', 'terumo',
    'coloplast', 'convatec', 'cochlear', 'alcon', 'becton', 'gehealthcare', 'siemens',
    'philips', 'draeger', 'getinge', 'nuvasive', 'globusmedical', 'penumbra', 'shockwave',
    'axonics', 'nevro', 'livanova', 'icumed', 'devices', 'diagnostics']],
  ['payer', ['unitedhealth', 'optum', 'uhg.com', 'cigna', 'aetna', 'humana', 'elevance',
    'anthem', 'bcbs', 'bluecross', 'centene', 'molina', 'unum', 'devoted.com', 'oscar',
    'clover', 'alignment', 'insurance']],
  ['healthtech', ['meditech', 'epic.com', 'cerner', 'athenahealth', 'allscripts', 'veradigm',
    'nextgen', 'eclinicalworks', 'greenway', 'redox', 'particlehealth', 'commure',
    'innovaccer', 'healthgorilla', 'medidata', 'iqvia', 'veeva', 'syneos', 'parexel',
    'flatiron', 'tempus', 'aetion', 'truveta', 'verily', 'insidetracker', 'segterra',
    'vibrenthealth', 'thecommonsproject', 'wellplay', 'health.com', 'healthtech', 'md.com']],
  ['government', ['.gov', '.mil', 'mitre.org', 'rand.org', 'noblis', 'navapbc', 'coforma',
    'state.ma.us', '.state.', 'nih.gov', 'cms.hhs']],
  ['research', ['.edu', '.ac.uk', '.ac.', 'research.org', 'institute.org']],
]

/** Names that a title-cased domain root would get wrong. */
const ORG_NAMES = {
  'partners.org': 'Mass General Brigham',
  'dfci.harvard.edu': 'Dana-Farber Cancer Institute',
  'childrens.harvard.edu': "Boston Children's Hospital",
  'mayo.edu': 'Mayo Clinic',
  'kp.org': 'Kaiser Permanente',
  'meditech.com': 'MEDITECH',
  'cms.hhs.gov': 'CMS (Centers for Medicare & Medicaid Services)',
  'mitre.org': 'MITRE',
  'mail.nih.gov': 'NIH',
  'mass.gov': 'Commonwealth of Massachusetts',
  'state.ma.us': 'Commonwealth of Massachusetts',
  'masenate.gov': 'Massachusetts Senate',
  'modernatx.com': 'Moderna',
  'novonordisk.com': 'Novo Nordisk',
  'boehringer-ingelheim.com': 'Boehringer Ingelheim',
  'ucb.com': 'UCB',
  'abbvie.com': 'AbbVie',
  'roche.com': 'Roche',
  'sanofi.com': 'Sanofi',
  'takeda.com': 'Takeda',
  'alnylam.com': 'Alnylam Pharmaceuticals',
  'medidata.com': 'Medidata',
  'verily.com': 'Verily',
  'resmed.com': 'ResMed',
  'resmed.com.au': 'ResMed',
  'philips.com': 'Philips',
  'epic.com': 'Epic Systems',
  'optum.com': 'Optum',
  'unum.com': 'Unum',
  'devoted.com': 'Devoted Health',
  'crossoverhealth.com': 'Crossover Health',
  'cityblock.com': 'Cityblock Health',
  'onemedical.com': 'One Medical',
  'stanfordhealthcare.org': 'Stanford Health Care',
  'atriumhealth.org': 'Atrium Health',
  'insidetracker.com': 'InsideTracker',
  'segterra.com': 'InsideTracker',
  'vibrenthealth.com': 'Vibrent Health',
  'thecommonsproject.org': 'The Commons Project',
  'navapbc.com': 'Nava PBC',
  'ideo.com': 'IDEO',
  'goinvo.com': 'GoInvo',
}

const MULTI_SUFFIXES = ['.co.uk', '.ac.uk', '.org.uk', '.com.au', '.org.au', '.net.au',
  '.com.br', '.org.br', '.co.il', '.co.nz', '.com.mx', '.co.za', '.com.ar']

/**
 * Organisation names that came out as a top-level domain.
 *
 * The first version of this took the last label that was not in a hardcoded TLD
 * list, so anything on a newer suffix kept it: wellplay.world became "World",
 * instride.health became "Health", uclm.es became "Es". Taking the label BEFORE
 * the public suffix is the rule that actually holds, and these values are
 * treated as placeholders so the 51 records already written get corrected.
 */
const TLD_WORDS = new Set(['world', 'es', 'cl', 'br', 'de', 'uk', 'au', 'io', 'ai', 'co',
  'me', 'tv', 'net', 'org', 'info', 'biz', 'ca', 'fr', 'it', 'nl', 'se', 'ch', 'in', 'us',
  'xyz', 'app', 'dev', 'life', 'care', 'health', 'group', 'solutions', 'agency', 'studio',
  'design', 'tech', 'online', 'site', 'club', 'space', 'cloud', 'digital'])

function organizationFor(domain) {
  if (ORG_NAMES[domain]) return ORG_NAMES[domain]
  let root = domain
  for (const suffix of MULTI_SUFFIXES) {
    if (root.endsWith(suffix)) {
      root = root.slice(0, -suffix.length)
      break
    }
  }
  const labels = root
    .split('.')
    .filter(Boolean)
    .filter((label) => !['www', 'mail', 'email', 'smtp', 'my'].includes(label))
  // The registrable name is the label immediately before the public suffix.
  const name = (labels.length >= 2 ? labels[labels.length - 2] : labels[0] || root).replace(/[-_]+/g, ' ')
  return name.replace(/\b[a-z]/g, (char) => char.toUpperCase())
}

function sectorFor(domain) {
  for (const [sector, needles] of SECTOR_RULES) {
    if (needles.some((needle) => domain.includes(needle))) return sector
  }
  return null
}

const contacts = await client.fetch(
  '*[_type == "marketingContact"]{_id, email, organization, researchSuggestedSegment}',
)

const planned = []
const skipped = { freemail: 0, noEmail: 0, unclassified: 0, alreadyDone: 0 }

for (const contact of contacts) {
  const email = String(contact.email || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 0) {
    skipped.noEmail += 1
    continue
  }
  const domain = email.slice(at + 1)
  if (isFreemail(domain)) {
    skipped.freemail += 1
    continue
  }
  const sector = sectorFor(domain)
  const set = {}
  // The EmailOctopus import dropped the bare domain into organization, so most
  // records read "sanofi.com" rather than "Sanofi". Replace that placeholder,
  // but never a name a person or the research route wrote — "Medidata (a
  // Dassault Systemes brand)" is better than anything derivable from a domain.
  const current = String(contact.organization || '').trim()
  const isPlaceholder =
    current === '' || current.toLowerCase() === domain || TLD_WORDS.has(current.toLowerCase())
  if (isPlaceholder) {
    const derived = organizationFor(domain)
    if (derived && derived.toLowerCase() !== current.toLowerCase()) set.organization = derived
  }
  if (sector && !contact.researchSuggestedSegment) set.researchSuggestedSegment = sector
  if (Object.keys(set).length === 0) {
    skipped[sector ? 'alreadyDone' : 'unclassified'] += 1
    continue
  }
  if (Object.keys(set).length === 0) {
    skipped.alreadyDone += 1
    continue
  }
  planned.push({ _id: contact._id, domain, set })
}

const bySector = planned.reduce((acc, row) => {
  const key = row.set.researchSuggestedSegment || '(org only, no sector)'
  acc[key] = (acc[key] || 0) + 1
  return acc
}, {})

console.log('dataset            ' + dataset)
console.log('contacts           ' + contacts.length)
console.log('skipped free-mail  ' + skipped.freemail + '  (an address tells us nothing about the org)')
console.log('skipped no email   ' + skipped.noEmail)
console.log('already enriched   ' + skipped.alreadyDone)
console.log('no sector rule     ' + skipped.unclassified + '  (org name already fine, domain matches no sector)')
console.log('to update          ' + planned.length)
console.log('')
console.log('suggested segments:')
for (const [sector, n] of Object.entries(bySector).sort((a, b) => b[1] - a[1])) {
  console.log('  ' + String(n).padStart(4) + '  ' + sector)
}
console.log('')
console.log('sample:')
for (const row of planned.slice(0, 8)) {
  console.log('  ' + row.domain.padEnd(26) + JSON.stringify(row.set))
}

if (!apply) {
  console.log('')
  console.log('Dry run - nothing written. Re-run with --apply.')
  process.exit(0)
}

const targets = planned.slice(0, Number.isFinite(limit) ? limit : planned.length)
const BATCH = 100
let written = 0
for (let i = 0; i < targets.length; i += BATCH) {
  let tx = client.transaction()
  for (const row of targets.slice(i, i + BATCH)) {
    tx = tx.patch(row._id, (patch) => patch.set(row.set))
  }
  await tx.commit()
  written += Math.min(BATCH, targets.length - i)
  console.log('  updated ' + written + '/' + targets.length)
}
console.log('')
console.log('Enriched ' + written + ' contacts. Segment, warmth and owner were not touched.')
