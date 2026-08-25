#!/usr/bin/env tsx
/**
 * Check every researched claim's quote against the page it cites — with NO
 * model, and therefore no API spend.
 *
 * This is possible because the research prompt now requires the model to hand
 * back the exact passage it relied on and the URL it came from. Verifying the
 * evidence a model NAMED is a fetch and a string comparison. The earlier
 * verifier paid a model to go and re-find a supporting passage in each source,
 * which was both the expensive half and a worse question to ask.
 *
 * What this cannot do is judge whether a true quote actually supports the claim.
 * That is a judgement, and it is left to a person (or to an in-session pass)
 * rather than bought per-claim: `--out` writes the surviving pairs to a file for
 * exactly that.
 *
 *   npx tsx scripts/check-org-quotes.ts                       # dry run
 *   npx tsx scripts/check-org-quotes.ts --apply
 *   npx tsx scripts/check-org-quotes.ts --apply --out c:/tmp/pending-entailment.json
 */
import path from 'node:path'
import { writeFileSync } from 'node:fs'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import {
  buildTextFragmentUrl,
  extractReadableText,
  quoteAppearsIn,
} from '@/lib/marketing/sourceVerification'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const outIndex = args.indexOf('--out')
const outPath = outIndex >= 0 ? args[outIndex + 1] : null
const limitIndex = args.indexOf('--limit')
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity

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

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GoInvoResearch/1.0; +https://www.goinvo.com) verification-bot',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!response.ok) return null
    return extractReadableText(await response.text()).slice(0, 80_000)
  } catch {
    return null
  }
}

async function main() {
  const docs = await client.fetch(
    `*[_type == "marketingOrgResearch" && defined(quote) && quote != ""]{
       _id, organization, recentSignal, quote, quoteUrl, sources[]{title, url}, verification
     }`,
  )

  const targets = docs.slice(0, Number.isFinite(limit) ? limit : docs.length)
  console.log(`${docs.length} claims carry a quote · checking ${targets.length} · no model, no API spend`)
  console.log('')

  const pending = []
  let present = 0
  let absent = 0
  let unreachable = 0

  for (const doc of targets) {
    // Prefer the URL the model actually attributed the quote to; fall back to its
    // other cited sources, since a quote in the wrong-labelled source is a
    // mis-citation rather than a fabrication.
    const candidates = [doc.quoteUrl, ...(doc.sources || []).map((source) => source?.url)]
      .filter((url) => typeof url === 'string' && url.startsWith('http'))
    const tried = [...new Set(candidates)].slice(0, 4)

    let found = null
    let anyReadable = false
    for (const url of tried) {
      const text = await fetchPageText(url)
      if (!text || text.length < 200) continue
      anyReadable = true
      if (quoteAppearsIn(text, doc.quote)) {
        found = url
        break
      }
    }

    const status = found ? 'quote-present' : anyReadable ? 'quote-absent' : 'unreachable'
    if (found) present += 1
    else if (anyReadable) absent += 1
    else unreachable += 1

    const mislabelled = found && doc.quoteUrl && found !== doc.quoteUrl
    console.log(
      `  ${String(doc.organization).slice(0, 26).padEnd(26)} ${status}` +
        (mislabelled ? '  (found in another cited source, not the one named)' : ''),
    )

    if (found) {
      pending.push({
        _id: doc._id,
        organization: doc.organization,
        claim: doc.recentSignal,
        quote: doc.quote,
        url: found,
      })
    }

    if (apply) {
      await client
        .patch(doc._id)
        .set({
          quoteCheck: {
            status,
            foundAt: found || '',
            mislabelled: Boolean(mislabelled),
            checkedAt: new Date().toISOString(),
            textFragmentUrl: found ? buildTextFragmentUrl(found, doc.quote) : '',
          },
        })
        .commit()
    }
  }

  console.log('')
  console.log(`quote present in the cited page   ${present}`)
  console.log(`quote NOT in any cited page       ${absent}`)
  console.log(`no cited page could be read       ${unreachable}`)

  if (outPath) {
    writeFileSync(outPath, JSON.stringify(pending, null, 2))
    console.log('')
    console.log(`${pending.length} verified-quote pairs written to ${outPath} for the entailment pass.`)
  }
  if (!apply) console.log('\nDry run — nothing written. Re-run with --apply.')

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})