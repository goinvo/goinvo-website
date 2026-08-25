#!/usr/bin/env tsx
/**
 * Write researched claims that were gathered by hand rather than by the API.
 *
 * The research script calls Claude with web_search, which costs money per
 * organisation. When the research is done in-session instead, this is how the
 * result gets persisted in the same shape, so the verification pipeline
 * (check-org-quotes -> judge-org-claims) treats it identically. Hand-gathered
 * evidence gets exactly the same scrutiny as generated evidence: it is written
 * with the quote it rests on, and it is not trusted until checked.
 *
 * Input is a JSON array of:
 *   { organization, recentSignal, quote, quoteUrl, reachableAbout,
 *     context?, suggestedOfferKey?, sources? }
 *
 *   npx tsx scripts/set-org-claim.ts c:/tmp/claims.json
 *   npx tsx scripts/set-org-claim.ts c:/tmp/claims.json --apply
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { ORG_RESEARCH_TYPE, orgResearchDocId } from '@/lib/marketing/orgResearch'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

type Input = {
  organization: string
  recentSignal: string
  quote: string
  quoteUrl: string
  reachableAbout: string
  context?: string
  suggestedOfferKey?: string
  sources?: { title: string; url: string }[]
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const inputPath = args.find((arg) => !arg.startsWith('--'))
if (!inputPath) throw new Error('Pass a JSON file of claims.')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:
    process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

async function main() {
  const claims = JSON.parse(readFileSync(inputPath!, 'utf8')) as Input[]
  console.log(`${claims.length} hand-researched claims${apply ? '' : ' · DRY RUN'}`)
  console.log('')

  for (const claim of claims) {
    const id = orgResearchDocId(claim.organization)
    console.log(`  ${claim.organization.slice(0, 26).padEnd(27)}${id}`)
    console.log(`     claim: ${claim.recentSignal.slice(0, 100)}`)
    console.log(`     quote: ${claim.quote.slice(0, 100)}`)
    if (!apply) continue

    // Clear the previous verification: this is a NEW claim and inherits nothing
    // from the one it replaces. Leaving a stale "verified" on it would be the
    // worst possible bug in a pipeline whose whole purpose is trust.
    await client
      .patch(id)
      .set({
        recentSignal: claim.recentSignal,
        quote: claim.quote,
        quoteUrl: claim.quoteUrl,
        reachableAbout: claim.reachableAbout,
        context: claim.context || '',
        suggestedOfferKey: claim.suggestedOfferKey || '',
        confidence: 'medium',
        sources: claim.sources || [{ title: claim.quoteUrl, url: claim.quoteUrl }],
        researchedAt: new Date().toISOString(),
        model: 'in-session research',
      })
      .unset(['verification', 'quoteCheck'])
      .commit()
  }

  console.log('')
  if (apply) {
    console.log('Written. Now verify them like any other claim:')
    console.log('  npx tsx scripts/check-org-quotes.ts --render --only-absent --apply --out <file>')
    console.log('  npx tsx scripts/judge-org-claims.ts <file> --apply')
  } else {
    console.log('Dry run — nothing written. Re-run with --apply.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
