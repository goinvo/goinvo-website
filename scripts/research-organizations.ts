#!/usr/bin/env tsx
/**
 * Research what each buyer-side organisation is reachable about, using Claude
 * with live web search.
 *
 * The registries answer WHO an organisation is (scripts/resolve-outreach-
 * organizations.mjs). They cannot answer what it is working on right now, which
 * is the part that gives a designer a reason to call. That is live, it changes,
 * and it is the one job here genuinely worth a model.
 *
 * One record per ORGANISATION, not per contact: nine people at Mass General
 * Brigham share one answer, and duplicating it across their records would mean
 * nine things to correct when it goes stale.
 *
 * Fail-closed: without ANTHROPIC_API_KEY nothing runs. Nothing is stored unless
 * the model actually cited a source — an uncited "recent signal" is a guess, and
 * somebody will read it out on a call.
 *
 *   npx tsx scripts/research-organizations.ts                    # dry run, 5 orgs
 *   npx tsx scripts/research-organizations.ts --limit 12
 *   npx tsx scripts/research-organizations.ts --apply --limit 12
 *   npx tsx scripts/research-organizations.ts --apply --segment pharma
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '@/lib/marketing/anthropicJson'
import {
  buildOrgResearchPrompt,
  isUsableOrgResearch,
  normaliseOrgResearch,
  ORG_RESEARCH_SYSTEM,
  ORG_RESEARCH_TYPE,
  orgResearchDocId,
} from '@/lib/marketing/orgResearch'
import { BUYER_SEGMENTS } from '@/lib/marketing/audienceBrief'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const valueFor = (name: string) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
const limit = Number(valueFor('limit') || 5)
const onlySegment = valueFor('segment')
const refresh = args.includes('--refresh')
// Live web search is slow (~1 min/org). Raising this is the difference between
// a coffee break and an afternoon; past ~4 the API starts queueing anyway.
const concurrency = Math.max(1, Math.min(6, Number(valueFor('concurrency') || 2)))

if (!isAnthropicConfigured()) {
  throw new Error('ANTHROPIC_API_KEY is not set. This script does nothing without it.')
}

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
  type ContactRow = { organization?: string; researchSuggestedSegment?: string; segment?: string }
  type OfferRow = { key?: string; title?: string; oneLiner?: string }

  const [contacts, offers, existing] = await Promise.all([
    client.fetch<ContactRow[]>(
      '*[_type == "marketingContact" && defined(organization)]{organization, researchSuggestedSegment, segment}',
    ),
    client.fetch<OfferRow[]>('*[_type == "marketingOffer" && status == "active"]{key, title, oneLiner}'),
    client.fetch<{ _id: string; quote?: string }[]>(
      `*[_type == "${ORG_RESEARCH_TYPE}"]{_id, quote}`,
    ),
  ])

  // A record with no quote was written under the old prompt, which asserted more
  // than its sources supported and failed verification every time. Those are
  // re-researched automatically rather than left to rot behind a flag nobody
  // remembers; --refresh redoes even the good ones.
  const settled = new Set(
    existing.filter((doc) => refresh === false && String(doc.quote || '').trim()).map((doc) => doc._id),
  )
  const stale = existing.length - settled.size

  // Group by organisation, keeping the segment and how many people we have there.
  const byOrg = new Map<string, { segment: string; count: number }>()
  for (const contact of contacts) {
    const name = String(contact.organization || '').trim()
    const segment = String(contact.segment || contact.researchSuggestedSegment || '').trim()
    if (!name) continue
    if (!(BUYER_SEGMENTS as readonly string[]).includes(segment)) continue
    if (onlySegment && segment !== onlySegment) continue
    const entry = byOrg.get(name) || { segment, count: 0 }
    entry.count += 1
    byOrg.set(name, entry)
  }

  // Densest first: those are the names on the brief, and the ones worth a call.
  const targets = [...byOrg.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .filter(([name]) => !settled.has(orgResearchDocId(name)))
    .slice(0, limit)

  const model = await resolveMarketingModel(client)
  console.log(
    `dataset ${dataset} · ${byOrg.size} buyer-side organisations · researching ${targets.length}` +
      (stale > 0 ? ` (${stale} re-done: written before the quote was required)` : ''),
  )
  console.log(`model ${model} · web search on · ${concurrency} at a time${apply ? '' : ' · DRY RUN'}`)
  console.log('')

  let stored = 0
  let thin = 0

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async ([organization, meta]) => {
        try {
          // NO thinking here: thinking + web_search 500s server-side. Web search
          // alone is the reliable combination.
          const result = await generateClaudeText({
            system: ORG_RESEARCH_SYSTEM,
            user: buildOrgResearchPrompt({
              organization,
              segment: meta.segment,
              contactCount: meta.count,
              offers,
            }),
            webSearch: true,
            maxTokens: 1200,
            timeoutMs: 180000,
            model,
          })
          const parsed = parseJsonObject(result.text)
          return {
            organization,
            meta,
            research: normaliseOrgResearch({ organization, parsed, sources: result.sources }),
          }
        } catch (error) {
          console.log(`  ${organization} — FAILED: ${error instanceof Error ? error.message : error}`)
          return null
        }
      }),
    )

    for (const entry of results) {
      if (!entry) continue
      const { organization, meta, research } = entry
      const usable = isUsableOrgResearch(research)
      console.log(`  ${organization}  [${meta.segment}, ${meta.count} contact(s)] — ${research.confidence}`)
      if (research.recentSignal) console.log(`     signal:    ${research.recentSignal}`)
      if (research.reachableAbout) console.log(`     opening:   ${research.reachableAbout}`)
      if (research.suggestedOfferKey) console.log(`     offer:     ${research.suggestedOfferKey}`)
      console.log(`     sources:   ${research.sources.length}`)
      if (!usable) {
        thin += 1
        console.log('     -> not stored (no citable signal)')
        continue
      }
      if (apply) {
        await client.createOrReplace({
          _id: orgResearchDocId(organization),
          _type: ORG_RESEARCH_TYPE,
          ...research,
          model,
          researchedAt: new Date().toISOString(),
        })
        stored += 1
      } else {
        stored += 1
      }
    }
  }

  console.log('')
  console.log(`usable      ${stored}`)
  console.log(`too thin    ${thin}  (no citable signal — deliberately not stored)`)
  if (!apply) console.log('\nDry run — nothing written. Re-run with --apply.')

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})