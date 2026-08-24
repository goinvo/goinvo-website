#!/usr/bin/env tsx
/**
 * Verify the researched claims against the pages they cite.
 *
 * Adapted from the PLIG framework's two-stage split (quote existence, then
 * claim entailment) and the evidence-pipeline plan in
 * biopharma-stewardship-discovery. The rule those encode:
 *
 *   A claim becomes publishable because its evidence is inspectable — not
 *   because a model agreed with it.
 *
 * So, per claim, per cited page:
 *
 *   1. Fetch the page and reduce it to text.
 *   2. Ask a cheap model for the EXACT span that supports the claim.
 *   3. Check that span really occurs in the page. Plain containment, no fuzzy
 *      matching. A fabricated or paraphrased quote dies here, and this is the
 *      only stage that can catch it — a model asked to confirm its own quote
 *      will confirm it.
 *   4. Only for a surviving quote, ask whether it actually supports the claim
 *      or whether the claim reaches past it.
 *
 * The claim is then bound to the specific source that supports it, and the
 * other cited URLs are dropped. Storing one claim against a bag of six sources
 * is the "broadening a citation to every quote from a source" anti-pattern the
 * plan warns about, and it is what the research step was doing.
 *
 *   npx tsx scripts/verify-org-research.ts               # dry run
 *   npx tsx scripts/verify-org-research.ts --apply
 *   npx tsx scripts/verify-org-research.ts --apply --refresh   # re-check all
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { generateClaudeText, isAnthropicConfigured, parseJsonObject } from '@/lib/marketing/anthropicJson'
import { ORG_RESEARCH_TYPE } from '@/lib/marketing/orgResearch'
import {
  buildTextFragmentUrl,
  ENTAILMENT_SYSTEM,
  extractReadableText,
  quoteAppearsIn,
  QUOTE_EXTRACTION_SYSTEM,
  resolveVerificationStatus,
  type VerifiedEvidence,
} from '@/lib/marketing/sourceVerification'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const refresh = args.includes('--refresh')
const limitIndex = args.indexOf('--limit')
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 40

if (!isAnthropicConfigured()) throw new Error('ANTHROPIC_API_KEY is not set.')

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

// Cheap and strict is the right trade for both stages: this is extraction and
// judgement over text we supply, not open-ended reasoning.
const VERIFIER_MODEL = 'claude-haiku-4-5'
const MAX_SOURCES_PER_CLAIM = 4
const MAX_PAGE_CHARS = 60_000

type ResearchDoc = {
  _id: string
  organization: string
  recentSignal?: string
  sources?: { title?: string; url?: string }[]
  verification?: { status?: string }
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        // Plenty of publishers refuse an unidentified client outright.
        'User-Agent':
          'Mozilla/5.0 (compatible; GoInvoResearch/1.0; +https://www.goinvo.com) verification-bot',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!response.ok) return null
    const html = await response.text()
    return extractReadableText(html).slice(0, MAX_PAGE_CHARS)
  } catch {
    return null
  }
}

async function main() {
  const docs = await client.fetch<ResearchDoc[]>(
    `*[_type == "${ORG_RESEARCH_TYPE}" && defined(recentSignal) && recentSignal != ""]{
      _id, organization, recentSignal, sources[]{title, url}, verification
    }`,
  )

  const targets = docs
    .filter((doc) => refresh || !doc.verification?.status)
    .slice(0, limit)

  console.log(`dataset ${dataset} · ${docs.length} researched claims · verifying ${targets.length}`)
  console.log(`verifier ${VERIFIER_MODEL}${apply ? '' : ' · DRY RUN'}`)
  console.log('')

  const tally: Record<string, number> = {}
  let quotesRejected = 0
  let pagesUnreadable = 0

  for (const doc of targets) {
    const claim = String(doc.recentSignal || '')
    const sources = (doc.sources || []).filter((source) => source?.url).slice(0, MAX_SOURCES_PER_CLAIM)
    const evidence: VerifiedEvidence[] = []
    let fetchedAnySource = false

    for (const source of sources) {
      const text = await fetchPageText(source.url!)
      if (!text || text.length < 200) {
        pagesUnreadable += 1
        continue
      }
      fetchedAnySource = true

      let quote = ''
      try {
        const extraction = await generateClaudeText({
          system: QUOTE_EXTRACTION_SYSTEM,
          user: `CLAIM:\n${claim}\n\nTEXT OF ${source.url}:\n${text}`,
          model: VERIFIER_MODEL,
          maxTokens: 400,
          timeoutMs: 60000,
        })
        const parsed = parseJsonObject(extraction.text)
        quote = typeof parsed?.quote === 'string' ? parsed.quote : ''
      } catch {
        quote = ''
      }
      if (!quote) continue

      // THE gate. A quote the model produced but the page does not contain is
      // discarded, whatever the model claimed about it.
      if (!quoteAppearsIn(text, quote)) {
        quotesRejected += 1
        continue
      }

      evidence.push({
        url: source.url!,
        title: source.title || source.url!,
        quote: quote.replace(/\s+/g, ' ').trim(),
        textFragmentUrl: buildTextFragmentUrl(source.url!, quote),
      })
      // Do NOT stop at the first hit. The research claim is synthesised across
      // several pages, so judging it against one quote under-credits it by
      // construction — an earlier run called six claims "overreach" largely for
      // that reason. Gather what each source genuinely supports, then judge the
      // claim against all of it.
    }

    let entailment: 'supported' | 'partial' | 'unsupported' | null = null
    let reason = ''
    if (evidence.length > 0) {
      try {
        const judged = await generateClaudeText({
          system: ENTAILMENT_SYSTEM,
          // Every gathered quote, not just the first. Judging a claim that was
          // synthesised across several pages against one of them is how a true
          // claim gets marked overreach.
          user:
            'CLAIM:' +
            String.fromCharCode(10) +
            claim +
            String.fromCharCode(10, 10) +
            'QUOTES (each confirmed to appear verbatim in the page cited beside it):' +
            String.fromCharCode(10) +
            evidence
              .map((item) => '- from ' + item.url + String.fromCharCode(10) + '  "' + item.quote + '"')
              .join(String.fromCharCode(10)),
          model: VERIFIER_MODEL,
          maxTokens: 300,
          timeoutMs: 60000,
        })
        const parsed = parseJsonObject(judged.text)
        const verdict = String(parsed?.verdict || '')
        entailment =
          verdict === 'supported' || verdict === 'partial' || verdict === 'unsupported' ? verdict : null
        reason = typeof parsed?.reason === 'string' ? parsed.reason : ''
      } catch {
        entailment = null
      }
    }

    const status = resolveVerificationStatus({ fetchedAnySource, evidence, entailment })
    tally[status] = (tally[status] || 0) + 1

    console.log(`  ${doc.organization.padEnd(26)} ${status}${reason ? ` — ${reason}` : ''}`)
    if (evidence.length) console.log(`     ${evidence.length} verified quote(s) across ${evidence.length} source(s)`)

    if (apply) {
      await client
        .patch(doc._id)
        .set({
          verification: {
            status,
            entailment: entailment || '',
            reason,
            evidence,
            checkedAt: new Date().toISOString(),
            model: VERIFIER_MODEL,
          },
        })
        .commit()
    }
  }

  console.log('')
  for (const [status, count] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`${status.padEnd(14)} ${count}`)
  }
  console.log('')
  console.log(`quotes rejected as not present in the page: ${quotesRejected}`)
  console.log(`pages that could not be read:               ${pagesUnreadable}`)
  if (!apply) console.log('\nDry run — nothing written. Re-run with --apply.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
