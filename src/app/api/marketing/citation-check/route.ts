import { createClient, type SanityClient } from '@sanity/client'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

// Citation / fact-check route for the marketing software. Given a page URL (or
// raw text), it extracts the page's factual + statistical claims and flags any
// that look inaccurate or that need a citation. Results are cached in Sanity
// keyed by a hash of the page content, so re-checking an unchanged page returns
// instantly and spends zero AI tokens (pass { refresh: true } to force a re-run).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Claim = {
  claim: string
  verdict: 'supported' | 'needsCitation' | 'questionable' | 'unverifiable' | string
  confidence: number
  note: string
  hasOnPageCitation: boolean
}
type CitationReport = { summary: string; claims: Claim[] }

let sanityClient: SanityClient | null = null
function getSanityClient(): SanityClient | null {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  return sanityClient
}

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|li|h[1-6]|section|article|div|blockquote)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractOutputText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const p = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: string }> }> }
  if (typeof p.output_text === 'string') return p.output_text
  for (const item of p.output || []) {
    for (const c of item.content || []) {
      if (typeof c.text === 'string') return c.text
    }
  }
  return ''
}

async function checkClaims(text: string, pageUrl: string): Promise<CitationReport> {
  const system = [
    'You are a meticulous fact-checker reviewing a web page for factual accuracy and citation integrity.',
    'Extract the specific factual and statistical claims: numbers, percentages, dollar amounts, named studies or organizations, dates, and superlatives ("most", "highest", "only"). Ignore opinions, calls to action, and navigation text.',
    'For each claim set verdict to one of: "supported" (well-established consensus fact), "needsCitation" (plausible but should cite a source), "questionable" (appears inaccurate, outdated, internally inconsistent, or disputed), or "unverifiable".',
    'Set hasOnPageCitation true only if the page text shows a source, footnote, or reference supporting that specific claim.',
    'Be strict about questionable and needsCitation so a human reviews them; do not rubber-stamp.',
    'Return ONLY a JSON object: {"summary": string, "claims": [{"claim": string, "verdict": string, "confidence": number between 0 and 1, "note": string, "hasOnPageCitation": boolean}]}. Include at most 25 claims, most important first.',
  ].join('\n')

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.MARKETING_AI_MODEL || 'gpt-4o-mini',
      input: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify({ pageUrl, pageText: text.slice(0, 14000) }) },
      ],
      text: { format: { type: 'json_object' } },
      temperature: 0,
      max_output_tokens: 2600,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI returned ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const parsed = JSON.parse(extractOutputText(await res.json())) as CitationReport
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    claims: Array.isArray(parsed.claims) ? parsed.claims.slice(0, 25) : [],
  }
}

function countFlagged(claims: Claim[]): number {
  return claims.filter((c) => c.verdict === 'questionable' || c.verdict === 'needsCitation').length
}

export async function POST(request: Request) {
  let body: { pageUrl?: string; text?: string; refresh?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const pageUrl = (body.pageUrl || '').trim()
  let text = (body.text || '').trim()
  if (!pageUrl && !text) {
    return NextResponse.json({ error: 'Provide pageUrl or text.' }, { status: 400 })
  }

  if (!text && pageUrl) {
    try {
      const res = await fetch(pageUrl, {
        headers: { 'User-Agent': 'GoInvo marketing citation-check (+https://www.goinvo.com)' },
        cache: 'no-store',
      })
      if (!res.ok) return NextResponse.json({ error: `Could not fetch ${pageUrl} (${res.status}).` }, { status: 502 })
      text = htmlToText(await res.text())
    } catch {
      return NextResponse.json({ error: `Could not fetch ${pageUrl}.` }, { status: 502 })
    }
  }

  const contentHash = createHash('sha256').update(`${pageUrl}\n${text}`).digest('hex').slice(0, 40)
  const cacheId = `citationCheck.${contentHash}`
  const sanity = getSanityClient()

  // Cache hit: identical page content was already checked → no tokens spent.
  if (sanity && !body.refresh) {
    const cached = await sanity
      .fetch<{ pageUrl?: string; contentHash?: string; checkedAt?: string; summary?: string; claims?: Claim[]; model?: string } | null>(
        `*[_id == $id][0]{ pageUrl, contentHash, checkedAt, summary, claims, model }`,
        { id: cacheId },
      )
      .catch(() => null)
    if (cached) {
      return NextResponse.json({ cached: true, flagged: countFlagged(cached.claims || []), ...cached })
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      cached: false,
      configured: false,
      error: 'OPENAI_API_KEY is not configured, so claims could not be checked.',
      pageUrl,
      claims: [],
    })
  }

  let report: CitationReport
  try {
    report = await checkClaims(text, pageUrl)
  } catch (error) {
    console.error('Marketing citation check failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Citation check failed.', pageUrl, claims: [] },
      { status: 500 },
    )
  }

  const model = process.env.MARKETING_AI_MODEL || 'gpt-4o-mini'
  const result = {
    _type: 'marketingCitationCheck',
    pageUrl,
    contentHash,
    checkedAt: new Date().toISOString(),
    summary: report.summary,
    claims: report.claims,
    model,
  }
  // Best-effort cache write so the same content is not re-checked.
  if (sanity) {
    try {
      await sanity.createOrReplace({ _id: cacheId, ...result })
    } catch (cacheError) {
      console.error('Citation check cache write failed:', cacheError)
    }
  }

  return NextResponse.json({ cached: false, flagged: countFlagged(report.claims), ...result })
}
