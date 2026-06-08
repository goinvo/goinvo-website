import {
  DEFAULT_PRIORITY_WEIGHTS,
  type SeoFinding,
  type SeoFindingSeverity,
} from './seoAudit'

// llms.txt layer for the SEO audit engine — the lowest-priority item on the
// §12 GEO backlog, and the brief is explicit that this module must be HONEST
// about how little it's worth. llms.txt is an emerging, proposed standard: a
// plain-text file at the site root that points an AI assistant at the pages
// worth reading. As of this writing NO major AI crawler (OpenAI, Anthropic,
// Perplexity, Google) reliably requests it, and there is NO evidence it lifts
// AI-answer citations. It is cheap to add and on-brand for a studio that
// publishes open data — but it is NOT a citation lever, and this module says so
// in plain terms rather than overselling it.
//
// So a MISSING or invalid llms.txt is only ever a `'notice'` (never a warning /
// error), framed as "nice-to-have, not a fix that will move anything".
//
// GRACEFUL like the rest of the engine: a fetch failure / non-2xx / timeout
// collapses to a single `notice`, never a throw. Wired behind the site-level
// opts.includeAiCrawlerAccess flag (it already runs once for the single ?url=
// mode), so it's checked once per site, not re-fetched per page.

// ---------------------------------------------------------------------------
// Finding builder — category 'geo', mirroring seoAuditGeo.ts so the model and
// copy conventions stay uniform.
// ---------------------------------------------------------------------------

const LLMS_TIMEOUT_MS = Number(
  process.env.MARKETING_SEO_FETCH_TIMEOUT_MS || 10000,
)

function findingId(check: string): string {
  return `geo:${check}`
}

function makeFinding(
  siteUrl: string,
  severity: SeoFindingSeverity,
  check: string,
  what: string,
  why: string,
  howToFix: string,
): SeoFinding {
  return {
    id: findingId(check),
    category: 'geo',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0,
    indexable: true,
    what,
    why,
    howToFix,
    affectedUrls: [siteUrl],
    source: 'html-parse',
    status: 'open',
    detectedAt: new Date().toISOString(),
  }
}

// A llms.txt is "valid enough" if it's non-empty plain text that opens with a
// Markdown H1 (`# Title`) — the shape the proposed spec describes (an H1 title,
// an optional blockquote summary, then sections of `- [Title](url): note`
// links). We deliberately keep validation loose: the standard is young, and the
// point of this check is presence + basic shape, not strict conformance.
function looksLikeLlmsTxt(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  // Reject an HTML error page served as text (a common "soft 404" for a missing
  // file behind a SPA fallback).
  if (/^\s*<(?:!doctype|html|head|body)\b/i.test(trimmed)) return false
  // The first non-blank line should be a Markdown H1.
  const firstLine = trimmed.split(/\r?\n/).find((l) => l.trim().length > 0) || ''
  return /^#\s+\S/.test(firstLine.trim())
}

// The honest copy, factored out so the missing-vs-invalid notices share one
// truthful framing.
function missingFinding(siteUrl: string, detail: string): SeoFinding {
  return makeFinding(
    siteUrl,
    'notice',
    'llms-txt-missing',
    `This site has no usable llms.txt file at its root (${detail}). llms.txt is a proposed plain-text file that points AI assistants at the pages worth reading.`,
    'Honest assessment: llms.txt is an emerging standard, and no major AI crawler (OpenAI, Anthropic, Perplexity, Google) reliably requests it yet, with no evidence it improves how often a site is cited in AI answers. It is NOT a citation lever — do not expect it to move AI visibility. It is, however, cheap to add and on-brand for a studio that publishes open data, so it is offered here as a low-effort nice-to-have, not a fix.',
    'Optional, low priority: add an llms.txt file at the site root with a one-line H1 title, a short summary of what GoInvo publishes, and a curated list of the most citation-worthy pages (the open datasets and research essays) as Markdown links. Treat it as a courtesy to AI tools, not as something that will measurably change citations — the AI-crawler-access (robots.txt) and on-page AI-readiness findings are where the real GEO leverage is.',
  )
}

// ---------------------------------------------------------------------------
// auditLlmsTxt — the public entry point. Fetches <siteUrl>llms.txt and flags a
// missing or invalid file as a single honest `notice`; a present, valid file
// emits NO finding (it's already done). NEVER throws.
// ---------------------------------------------------------------------------

export async function auditLlmsTxt(
  siteUrl = 'https://www.goinvo.com/',
): Promise<SeoFinding[]> {
  let llmsUrl: string
  try {
    llmsUrl = new URL('/llms.txt', siteUrl).href
  } catch {
    return [missingFinding(siteUrl, `"${siteUrl}" is not a valid site URL`)]
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLMS_TIMEOUT_MS)
  try {
    const res = await fetch(llmsUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoInvo marketing SEO audit (+https://www.goinvo.com)',
        Accept: 'text/plain,text/markdown,*/*;q=0.8',
      },
    })
    if (!res.ok) {
      return [missingFinding(siteUrl, `requesting it returned ${res.status}`)]
    }
    const text = await res.text()
    if (!looksLikeLlmsTxt(text)) {
      return [
        missingFinding(
          siteUrl,
          'a file was returned but it is empty or not in the expected Markdown shape (it should open with an "# H1" title)',
        ),
      ]
    }
    // Present and valid — nothing to flag.
    return []
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    return [missingFinding(siteUrl, `it could not be fetched: ${reason}`)]
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// generateLlmsTxt — build a curated llms.txt body from a list of pages. Pure +
// exported so a designer (or a future "copy this file" button) can generate the
// file content, and so it's trivially unit-testable. Produces the proposed
// spec's shape: an H1 title, a blockquote summary, then a "## Pages" section of
// `- [Title](url): description` links. Pages with no title are skipped (a link
// with no label is useless to an AI reader).
// ---------------------------------------------------------------------------

export type LlmsTxtPage = { url: string; title: string; description?: string }

export function generateLlmsTxt(
  pages: LlmsTxtPage[],
  opts: { siteName?: string; summary?: string } = {},
): string {
  const siteName = opts.siteName || 'GoInvo'
  const summary =
    opts.summary ||
    'GoInvo is a healthcare design studio that publishes open-source datasets, data visualizations, and human-centered research on healthcare. The pages below are the most citation-worthy.'

  const lines: string[] = []
  lines.push(`# ${siteName}`)
  lines.push('')
  lines.push(`> ${summary}`)
  lines.push('')
  lines.push('## Pages')
  lines.push('')

  for (const page of pages) {
    const title = (page.title || '').trim()
    const url = (page.url || '').trim()
    if (!title || !url) continue // a link with no label/url is useless
    const description = (page.description || '').trim()
    lines.push(`- [${title}](${url})${description ? `: ${description}` : ''}`)
  }

  // Trailing newline so the file ends cleanly.
  return lines.join('\n') + '\n'
}
