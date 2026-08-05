/**
 * Generate a per-contact outreach brief card: AI copy under the personalization
 * policy (briefCard.ts) → designed HTML (briefCardTemplate.ts) → Puppeteer →
 * PNG (+ PDF) → uploaded to Sanity, URL stored on the contact.
 *
 *   npx tsx scripts/generate-brief-card.ts --email=person@org.com
 *   npx tsx scripts/generate-brief-card.ts --id=marketingContact-… --no-upload
 *
 * Local copies always land in --out-dir (default .brief-cards/, gitignored by
 * being untracked) so the design can be reviewed file-by-file.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@sanity/client'
import puppeteer from 'puppeteer'
import {
  generateClaudeText,
  isAnthropicConfigured,
  parseJsonObject,
  resolveMarketingModel,
} from '../src/lib/marketing/anthropicJson'
import {
  assembleBriefCardReceipts,
  assertBriefCardSafe,
  buildBriefCardPrompts,
  normalizeBriefCardCopy,
  type BriefCardData,
} from '../src/lib/marketing/briefCard'
import { renderBriefCardHtml } from '../src/lib/marketing/briefCardTemplate'
import type { WorkEvidence } from '../src/lib/marketing/outreach'
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
const email = argValue('--email')?.toLowerCase()
const id = argValue('--id')
const outDir = argValue('--out-dir') || '.brief-cards'
const upload = !args.includes('--no-upload')

if ((!email && !id) || !projectId || !writeToken) {
  console.error('Usage: npx tsx scripts/generate-brief-card.ts --email=<addr> | --id=<contactId> [--no-upload] [--out-dir=dir]')
  process.exit(1)
}
if (!isAnthropicConfigured()) {
  console.error('ANTHROPIC_API_KEY is not configured.')
  process.exit(1)
}

const outreachClient = createClient({ projectId, dataset: OUTREACH_DATASET, token: writeToken, apiVersion: '2024-01-01', useCdn: false })
const settingsClient = createClient({ projectId, dataset: productionDataset, token: writeToken, apiVersion: '2024-01-01', useCdn: false })

interface CardContact {
  _id: string
  name?: string
  role?: string
  organization?: string
  segment?: string
  researchSummary?: string
  suggestedOfferKey?: string
  proposedOffers?: Array<{ title?: string; oneLiner?: string }>
  relevantEvidence?: Array<{ evidenceId?: string; title?: string }>
}

async function main() {
  const contact = await outreachClient.fetch<CardContact | null>(
    id
      ? `*[_type == "marketingContact" && _id == $key][0]{ _id, name, role, organization, segment, researchSummary, suggestedOfferKey, proposedOffers[]{title, oneLiner}, relevantEvidence[]{evidenceId, title} }`
      : `*[_type == "marketingContact" && lower(email) == $key][0]{ _id, name, role, organization, segment, researchSummary, suggestedOfferKey, proposedOffers[]{title, oneLiner}, relevantEvidence[]{evidenceId, title} }`,
    { key: id || email },
  )
  if (!contact) throw new Error('Contact not found.')
  if (!contact.researchSummary) throw new Error('Contact has no research — run research first (the card is built from it).')

  const evidenceIds = (contact.relevantEvidence || []).map((entry) => entry.evidenceId).filter(Boolean)
  const evidenceDocs = evidenceIds.length
    ? await outreachClient.fetch<WorkEvidence[]>(
        `*[_type == "marketingWorkEvidence" && _id in $ids]{ _id, title, client, summary, highlights[]{metric, detail} }`,
        { ids: evidenceIds },
      )
    : []

  const model = await resolveMarketingModel(settingsClient)
  const prompts = buildBriefCardPrompts(contact)
  let copy
  let lastError: unknown
  for (let attempt = 1; attempt <= 2 && !copy; attempt += 1) {
    try {
      const result = await generateClaudeText({ system: prompts.system, user: prompts.user, model, maxTokens: 1500 })
      copy = normalizeBriefCardCopy(parseJsonObject(result.text))
    } catch (error) {
      lastError = error
      console.error(`Copy generation attempt ${attempt} rejected: ${error instanceof Error ? error.message : error}`)
    }
  }
  if (!copy) throw lastError instanceof Error ? lastError : new Error('Copy generation failed twice.')

  const offer = (contact.proposedOffers || [])[0]
  if (!offer?.title || !offer.oneLiner) throw new Error('Contact has no proposed offer to feature.')
  assertBriefCardSafe(`${offer.title} ${offer.oneLiner}`, 'offer line')

  // Pricing is CMS-owned: the matched base offer's priceBand, editable in the
  // Studio (Outreach offers). Absent band → the card simply omits the chip.
  const offerPriceBand = contact.suggestedOfferKey
    ? await outreachClient.fetch<string | null>(
        `*[_type == "marketingOffer" && key == $key][0].priceBand`,
        { key: contact.suggestedOfferKey },
      )
    : null
  if (offerPriceBand) assertBriefCardSafe(offerPriceBand, 'price band')

  const data: BriefCardData = {
    name: contact.name || 'Unknown',
    role: contact.role,
    organization: contact.organization,
    copy,
    receipts: assembleBriefCardReceipts(contact.relevantEvidence, evidenceDocs),
    offerTitle: offer.title,
    offerLine: offer.oneLiner,
    offerPriceBand: offerPriceBand || undefined,
    preparedLabel: `Briefing · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
  }
  const html = renderBriefCardHtml(data)

  mkdirSync(outDir, { recursive: true })
  const slug = (contact.name || contact._id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  writeFileSync(join(outDir, `${slug}.html`), html)

  const browser = await puppeteer.launch()
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1000, height: 800, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pngPath = join(outDir, `${slug}.png`)
    await page.screenshot({ path: pngPath as `${string}.png`, fullPage: true })
    const height = await page.evaluate(() => document.body.scrollHeight)
    await page.pdf({ path: join(outDir, `${slug}.pdf`), printBackground: true, width: '1000px', height: `${height + 2}px` })

    let briefCardUrl: string | null = null
    if (upload) {
      const asset = await outreachClient.assets.upload('image', readFileSync(pngPath), {
        filename: `brief-card-${slug}.png`,
        contentType: 'image/png',
      })
      briefCardUrl = asset.url
      await outreachClient
        .patch(contact._id)
        .set({ briefCardUrl, briefCardGeneratedAt: new Date().toISOString() })
        .commit()
    }

    console.log(JSON.stringify({
      contact: contact.name,
      model,
      radarModes: copy.radarModes,
      local: { html: `${outDir}/${slug}.html`, png: `${outDir}/${slug}.png`, pdf: `${outDir}/${slug}.pdf` },
      uploaded: briefCardUrl,
    }, null, 1))
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
