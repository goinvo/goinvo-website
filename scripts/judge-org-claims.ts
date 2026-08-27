#!/usr/bin/env tsx
/**
 * Decide whether each claim stays within its verified quote — deterministically.
 *
 * `check-org-quotes.ts` proves the quote is really in the page. This answers the
 * second question: does the claim assert anything the quote does not contain?
 * The research prompt's rule is "no date, number or proper name unless it is in
 * the quote", which is a rule about tokens, so no model is needed and none is
 * called. The verdict names the offending specific, so a person can audit it
 * instead of trusting it.
 *
 * It does not judge meaning. A claim with no uncited specifics can still misread
 * its source; this narrows the reviewer's job rather than replacing it.
 *
 *   npx tsx scripts/judge-org-claims.ts c:/tmp/pending.json
 *   npx tsx scripts/judge-org-claims.ts c:/tmp/pending.json --apply
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { buildTextFragmentUrl, findUncitedSpecifics } from '@/lib/marketing/sourceVerification'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

type Pair = { _id: string; organization: string; claim: string; quote: string; url: string }

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const inputPath = args.find((arg) => !arg.startsWith('--'))
if (!inputPath) throw new Error('Pass the pending-pairs JSON written by check-org-quotes.ts.')

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

async function main() {
  const pairs = JSON.parse(readFileSync(inputPath!, 'utf8')) as Pair[]
  let verified = 0
  const flagged: string[] = []

  for (const pair of pairs) {
    // The organisation's own name is excluded: a first-person quote on a
    // company's own site ("We have 38 locations") never repeats it.
    const uncited = findUncitedSpecifics(pair.claim, pair.quote, { ignore: [pair.organization] })
    const status = uncited.length === 0 ? 'verified' : 'overreach'
    if (status === 'verified') verified += 1
    else flagged.push(`  ${pair.organization.slice(0, 28).padEnd(29)}${uncited.slice(0, 4).join(' | ')}`)

    if (apply) {
      await client
        .patch(pair._id)
        .set({
          verification: {
            status,
            entailment: status === 'verified' ? 'supported' : 'partial',
            reason: uncited.length
              ? `Claim asserts specifics the quote does not contain: ${uncited.join(', ')}`
              : '',
            checkedAt: new Date().toISOString(),
            model: 'deterministic:findUncitedSpecifics',
            evidence: [
              {
                url: pair.url,
                title: pair.url,
                quote: pair.quote,
                textFragmentUrl: buildTextFragmentUrl(pair.url, pair.quote),
              },
            ],
          },
        })
        .commit()
    }
  }

  console.log(`verified (every specific cited)  ${verified} of ${pairs.length}`)
  if (flagged.length) {
    console.log('')
    console.log('overreach — the quote does not contain:')
    flagged.forEach((line) => console.log(line))
  }
  if (!apply) console.log('\nDry run — nothing written. Re-run with --apply.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
