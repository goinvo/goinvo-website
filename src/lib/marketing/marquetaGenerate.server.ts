/**
 * Running a generation: gather the grounding, call the model, hand back a draft.
 *
 * Server-only. It reads the VERIFIED research from the private outreach dataset
 * (the same records the call sheet is built from), the real case studies and
 * essays from the public dataset, and the studio's approved brand voice — then
 * asks Claude for a first draft grounded in exactly those. The citations are
 * built from our own verified set and returned alongside, so the caller shows
 * real links to the exact passages rather than trusting the model to echo URLs.
 *
 * Fail-closed: with no ANTHROPIC_API_KEY nothing is generated (she says the
 * Studio can), and any model or fetch error becomes an honest "I could not draft
 * that" rather than an empty card.
 */

import { client } from '@/sanity/lib/client'
import { generateClaudeText, isAnthropicConfigured, resolveMarketingModel } from './anthropicJson'
import { brandVoicePromptContext, resolveMarketingBrandVoice } from './brandVoice'
import { getMarketingWriteClientFor } from './client'
import {
  buildResearchCitations,
  citationsForPrompt,
  type ResearchCitation,
  type ResearchRecordInput,
} from './marquetaCitations'
import {
  buildGenerationUserMessage,
  FORMAT_LABEL,
  GENERATION_SYSTEM,
  parseGeneration,
  type GeneratedContent,
  type GenerationFormat,
} from './marquetaGenerate'

const ORG_RESEARCH_TYPE = 'marketingOrgResearch'

export type GenerationResult =
  | {
      ok: true
      generated: GeneratedContent
      /** Every verified citation offered to the model, for display beneath the draft. */
      citations: ResearchCitation[]
      brandVoiceName?: string
      model: string
    }
  | { ok: false; reason: 'not-configured' | 'no-topic' | 'failed'; message: string }

const SITE_REFERENCE_QUERY = `{
  "caseStudies": *[_type == "caseStudy" && !hidden && title != "Untitled" && !(slug.current match "untitled-*")]
    | order(orderRank asc)[0...10]{
      title,
      "slug": slug.current,
      "summary": coalesce(metaDescription, heading, description)
    },
  "features": *[_type == "feature" && title != "Untitled" && !(slug.current match "untitled-*")]
    | order(coalesce(date, _updatedAt) desc)[0...10]{
      title,
      "slug": slug.current,
      "summary": description
    }
}`

type SiteRefRow = { title?: string; slug?: string; summary?: string }

/** The public case studies and essays a draft may point at, as titles + real URLs. */
async function fetchSiteReferences(): Promise<{ title: string; url: string; summary?: string }[]> {
  try {
    const data = await client.fetch<{ caseStudies?: SiteRefRow[]; features?: SiteRefRow[] }>(
      SITE_REFERENCE_QUERY,
    )
    const map = (rows: SiteRefRow[] | undefined, prefix: string) =>
      (rows || [])
        .filter((row) => row.title && row.slug)
        .map((row) => ({
          title: String(row.title),
          url: `${prefix}/${row.slug}`,
          summary: row.summary ? String(row.summary).slice(0, 240) : undefined,
        }))
    return [...map(data.caseStudies, '/work'), ...map(data.features, '/vision')]
  } catch {
    return []
  }
}

/** Verified organisation research, newest strong signals first. */
async function fetchVerifiedResearch(): Promise<ResearchRecordInput[]> {
  try {
    const researchClient = getMarketingWriteClientFor(ORG_RESEARCH_TYPE)
    return await researchClient.fetch<ResearchRecordInput[]>(
      `*[_type == $type && verification.status == "verified"]
         | order(coalesce(_updatedAt, _createdAt) desc)[0...24]{
           organization, whatTheyDo, recentSignal, reachableAbout, quote, quoteUrl, context,
           suggestedOfferKey, confidence,
           sources[]{title, url},
           verification{status, evidence[]{url, quote, textFragmentUrl}}
         }`,
      { type: ORG_RESEARCH_TYPE },
    )
  } catch {
    return []
  }
}

/**
 * Put the research most likely to matter first.
 *
 * When the topic names an organisation we have verified research on — "an
 * outreach email to Mass General Brigham" — that record is the whole point, so
 * it leads. Otherwise the model gets the strongest verified signals to draw on.
 */
function prioritiseCitations(citations: ResearchCitation[], topic: string): ResearchCitation[] {
  const needle = topic.toLowerCase()
  const named = citations.filter((citation) => needle.includes(citation.organization.toLowerCase()))
  if (named.length === 0) return citations
  const rest = citations.filter((citation) => !named.includes(citation))
  return [...named, ...rest]
}

function maxTokensForFormat(format: GenerationFormat): number {
  return format === 'script' || format === 'email' ? 2200 : 1800
}

function generationTimeoutMs(): number {
  const configured = Number(process.env.MARKETING_AI_TIMEOUT_MS || 60_000)
  return Number.isFinite(configured) ? Math.max(5_000, Math.min(90_000, Math.round(configured))) : 60_000
}

/**
 * Draft one thing.
 *
 * The topic is required — "outline" on its own comes back as `no-topic` so the
 * caller can ask what it should be about rather than draft something vacant.
 */
export async function runMarquetaGeneration(input: {
  format: GenerationFormat
  topic: string
  brandVoiceKey?: string
}): Promise<GenerationResult> {
  const topic = String(input.topic || '').trim()
  if (!topic) {
    return {
      ok: false,
      reason: 'no-topic',
      message: `What should the ${FORMAT_LABEL[input.format]} be about?`,
    }
  }

  if (!isAnthropicConfigured()) {
    return {
      ok: false,
      reason: 'not-configured',
      message: 'I can’t draft right now — the AI key isn’t set. The Studio’s assistant can.',
    }
  }

  try {
    const [research, siteReferences, model, resolvedVoice] = await Promise.all([
      fetchVerifiedResearch(),
      fetchSiteReferences(),
      resolveMarketingModel(client),
      resolveMarketingBrandVoice(client, input.brandVoiceKey).catch(() => null),
    ])

    const citations = prioritiseCitations(buildResearchCitations(research, { limit: 6 }), topic)
    const brandVoice = brandVoicePromptContext(resolvedVoice)

    const { text } = await generateClaudeText({
      model,
      maxTokens: maxTokensForFormat(input.format),
      timeoutMs: generationTimeoutMs(),
      system: GENERATION_SYSTEM,
      user: buildGenerationUserMessage({
        format: input.format,
        topic,
        citations,
        siteReferences,
        brandVoice: brandVoice
          ? {
              name: brandVoice.name,
              guidance: brandVoice.guidance,
              do: brandVoice.do,
              avoid: brandVoice.avoid,
              examples: brandVoice.examples,
            }
          : null,
      }),
    })

    const generated = parseGeneration(input.format, text)
    if (!generated) {
      return { ok: false, reason: 'failed', message: 'I drafted something but it came back unreadable. Try again?' }
    }

    // Only the citations the draft could actually have used (verified with a
    // quote) are worth showing beneath it as "grounded in".
    const usable = citations.filter((citation) => citationsForPrompt([citation]).length > 0)

    return {
      ok: true,
      generated,
      citations: usable,
      brandVoiceName: brandVoice?.name,
      model,
    }
  } catch (error) {
    console.error('[marqueta] generation failed', error instanceof Error ? error.name : 'UnknownError')
    return { ok: false, reason: 'failed', message: 'Something went wrong drafting that. Try again in a moment.' }
  }
}
