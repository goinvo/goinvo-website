/**
 * Batch-run the outreach per-contact AI research locally — the same research
 * the Studio's "Research" button and POST /api/marketing/outreach/research
 * perform (live web search → org intel, offer match, relevant evidence,
 * feasibility, call brief), composed from the identical core functions, so the
 * persisted fields are indistinguishable from a Studio-triggered run.
 *
 *   npx tsx scripts/research-contacts-batch.ts --ids-file <path> [--concurrency 3] [--limit N]
 *
 * The ids file is JSON: [{ "id": "marketingContact-…" }, …]. Resumable by
 * design: contacts with `researchedAt` already set are skipped. Respects the
 * suite's model setting (Studio picker > MARKETING_CLAUDE_MODEL > default).
 * Requires ANTHROPIC_API_KEY + Sanity write token in the environment/.env.local.
 */
import { existsSync, readFileSync, appendFileSync } from 'node:fs'
import { createClient } from '@sanity/client'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '../src/lib/marketing/anthropicJson'
import {
  brandVoicePromptContext,
  resolveMarketingBrandVoice,
} from '../src/lib/marketing/brandVoice'
import {
  buildResearchPatch,
  buildResearchPrompts,
  compactEvidenceIndex,
  DEFAULT_OFFERS,
  normalizeResearch,
  type OutreachContact,
  type OutreachOfferDef,
  type WorkEvidence,
} from '../src/lib/marketing/outreach'
import { OUTREACH_DATASET } from '../src/lib/marketing/outreachEnums'

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
const writeToken = (process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN || '').trim()
const productionDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

const args = process.argv.slice(2)
const argValue = (name: string) => args.find((a) => a.startsWith(`${name}=`))?.split('=')[1]
const idsFile = argValue('--ids-file')
const concurrency = Math.max(1, Math.min(6, Number(argValue('--concurrency') || 3)))
const limit = Number(argValue('--limit') || Infinity)
const logFile = argValue('--log') || 'research-batch-log.jsonl'

if (!idsFile || !existsSync(idsFile)) {
  console.error('Usage: npx tsx scripts/research-contacts-batch.ts --ids-file=<path> [--concurrency=3] [--limit=N]')
  process.exit(1)
}
if (!projectId || !writeToken) {
  console.error('Missing Sanity project id or write token.')
  process.exit(1)
}
if (!isAnthropicConfigured()) {
  console.error('ANTHROPIC_API_KEY is not configured — research cannot run.')
  process.exit(1)
}

const outreachClient = createClient({ projectId, dataset: OUTREACH_DATASET, token: writeToken, apiVersion: '2024-01-01', useCdn: false })
const settingsClient = createClient({ projectId, dataset: productionDataset, token: writeToken, apiVersion: '2024-01-01', useCdn: false })

const CONTACT_PROJECTION = `{
  _id, _rev, name, organization, role, segment, owner, warmth, status, howWeKnow,
  sourceNotes, linkedinUrl, brandVoiceKey, researchedAt
}`

const log = (entry: Record<string, unknown>) =>
  appendFileSync(logFile, `${JSON.stringify({ t: new Date().toISOString(), ...entry })}\n`)

async function main() {
  const ids: Array<{ id: string }> = JSON.parse(readFileSync(idsFile, 'utf8'))

  // Shared, fetched once: offers + evidence corpus (matches the route's per-call
  // fetches; the corpus is static during a batch).
  const cmsOffers = await outreachClient.fetch<OutreachOfferDef[]>(
    `*[_type == "marketingOffer" && status == "active"]|order(coalesce(order, 100) asc){
      key, title, oneLiner, description, priceBand, idealBuyer, proofPoints, order
    }`,
  )
  const offers = cmsOffers.length > 0 ? cmsOffers : DEFAULT_OFFERS
  const evidence = await outreachClient.fetch<WorkEvidence[]>(
    `*[_type == "marketingWorkEvidence" && status == "active"]|order(title asc){
      _id, sourceId, slug, url, manuallyEdited, extractedAt,
      title, client, summary, segments, techniques, domainExpertise,
      businessOutcomes, highlights[]{metric, detail}, status
    }`,
  )

  let done = 0
  let skipped = 0
  let failed = 0

  async function researchOne(id: string) {
    const contact = await outreachClient.fetch<OutreachContact & { _rev?: string; researchedAt?: string } | null>(
      `*[_type == "marketingContact" && _id == $id][0]${CONTACT_PROJECTION}`,
      { id },
    )
    if (!contact) { failed += 1; log({ id, ok: false, error: 'not found' }); return }
    if (contact.researchedAt) { skipped += 1; log({ id, ok: true, skipped: 'already researched' }); return }

    const evidenceIndex = compactEvidenceIndex(evidence, {
      max: 60,
      terms: [contact.segment, contact.organization, contact.role].filter(
        (value): value is string => Boolean(value),
      ),
    })
    const [model, brandVoice] = await Promise.all([
      resolveMarketingModel(settingsClient),
      resolveMarketingBrandVoice(settingsClient, contact.brandVoiceKey),
    ])
    const prompts = buildResearchPrompts(contact, offers, evidenceIndex, brandVoicePromptContext(brandVoice))
    const result = await generateClaudeText({
      system: prompts.system,
      user: prompts.user,
      model,
      maxTokens: 8192,
      webSearch: true,
      timeoutMs: Number(process.env.MARKETING_RESEARCH_TIMEOUT_MS || 240000),
    })
    const research = normalizeResearch(parseJsonObject(result.text), offers, evidenceIndex)
    if (!research.researchSummary && research.opportunities.length === 0) {
      failed += 1
      log({ id, ok: false, error: 'no usable result', model: result.model })
      return
    }
    const patch = buildResearchPatch(research, {
      model: result.model,
      researchedAt: new Date().toISOString(),
      currentStatus: contact.status,
      fallbackSources: result.sources,
      brandVoice: brandVoice ? { key: brandVoice._key, name: brandVoice.name } : null,
    })
    // Same lost-update guard as the route: nothing saves if a human edited the
    // contact while research ran.
    const latest = await outreachClient.fetch<{ _rev?: string } | null>(
      `*[_type == "marketingContact" && _id == $id][0]{_rev}`,
      { id },
    )
    if (!latest || !contact._rev || latest._rev !== contact._rev) {
      failed += 1
      log({ id, ok: false, error: 'contact changed during research — not saved' })
      return
    }
    await outreachClient.patch(id).ifRevisionId(contact._rev).set(patch).commit()
    done += 1
    log({ id, ok: true, model: result.model, feasibility: (research as { feasibilityScore?: number }).feasibilityScore ?? null })
  }

  const queue = ids.slice(0, limit).map((entry) => entry.id)
  const total = queue.length
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const id = queue.shift()
      if (!id) break
      try {
        await researchOne(id)
      } catch (error) {
        failed += 1
        log({ id, ok: false, error: String(error).slice(0, 200) })
      }
      console.log(`progress: ${done} ok, ${skipped} skipped, ${failed} failed, ${queue.length}/${total} remaining`)
    }
  }))
  console.log(JSON.stringify({ finished: true, done, skipped, failed, total }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
