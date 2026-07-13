import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { SanityClient } from '@sanity/client'
import { studioSessionHeader } from '@/sanity/lib/studioSession'

// Surfaces the SEO opportunities engine (/api/marketing/seo) and the cached
// citation checker (/api/marketing/citation-check) inside the marketing tool,
// so the team can see "what to fix next" and verify a page's claims without
// leaving the Studio. Self-contained (own styles via Sanity CSS variables).

type PageOpp = {
  path: string
  url: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  pageViews: number
  keyEvents?: number
  quality?: number
  topQuery?: string
  topQueries?: string[]
  legacy?: boolean
  score: number
  fix: string
  fixHint: string
}
type QueryOpp = {
  query: string
  impressions: number
  clicks: number
  ctr: number
  position: number
  score: number
  fix: string
  // TextFocus keyword enrichment (seo-keyword-enrichment). Present only when
  // TextFocus is healthy and returned this query; absent when it's down/capped,
  // in which case the row renders exactly as before. volume = monthly search
  // volume, difficulty = 0–100 keyword difficulty, cpc = paid cost-per-click.
  volume?: number
  difficulty?: number
  cpc?: number
}
// A page-1 query earning far fewer clicks than its position should — a
// title/meta-rewrite quick win (matches CtrGap in api/marketing/seo/route.ts).
type CtrGap = {
  query: string
  page: string
  url: string
  impressions: number
  clicks: number
  position: number
  ctr: number
  expectedCtr: number
  gap: number
  missedClicks: number
  score: number
  fixHint: string
}
// One query that multiple goinvo.com pages compete for (matches Cannibalization
// in the route) → consolidate or differentiate.
type Cannibalization = {
  query: string
  impressions: number
  clicks: number
  pages: Array<{ path: string; url: string; impressions: number; clicks: number; position: number }>
  bestPosition: number
  score: number
}
// A page losing search ground over the trailing 90d vs the prior 90d, with a
// recommended action (matches DecayWatch in api/marketing/seo/route.ts).
type DecayWatch = {
  path: string
  url: string
  recentImpressions: number
  priorImpressions: number
  recentClicks: number
  priorClicks: number
  recentPosition: number
  priorPosition: number
  impressionsDelta: number
  clicksDelta: number
  impressionsPctChange: number
  clicksPctChange: number
  positionDelta: number
  decliningSignals: number
  action: 'refresh' | 'consolidate' | 'leave'
  score: number
  fixHint: string
}
// A non-brand query classified into a search intent (matches IntentProfileEntry).
type IntentProfileEntry = {
  query: string
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  confidence: number
  signals: string[]
  impressions: number
  clicks: number
  position: number
}
// A query whose intent doesn't match its ranking page (matches IntentMismatch).
type IntentMismatch = {
  query: string
  queryIntent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  page: string
  url: string
  pageIntent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  impressions: number
  clicks: number
  position: number
  score: number
  fixHint: string
}
type SeoData = {
  configured?: boolean
  message?: string
  error?: string
  range?: { startDate: string; endDate: string }
  priorRange?: { startDate: string; endDate: string }
  keyEventsConfigured?: boolean
  pages?: PageOpp[]
  queries?: QueryOpp[]
  ctrGaps?: CtrGap[]
  cannibalization?: Cannibalization[]
  decay?: DecayWatch[]
  intentProfile?: IntentProfileEntry[]
  intentMismatches?: IntentMismatch[]
  warnings?: string[]
}
type Claim = { claim: string; verdict: string; confidence: number; note: string; hasOnPageCitation: boolean }
type CiteData = {
  configured?: boolean
  error?: string
  cached?: boolean
  flagged?: number
  summary?: string
  claims?: Claim[]
  pageUrl?: string
  checkedAt?: string
}
type Idea = {
  _id: string
  title?: string
  summary?: string
  category?: string
  status?: string
  priority?: string
  nextAction?: string
  relatedUrl?: string
  source?: string
}
// --- Page Audit (Phase 1 audit engine; see docs/seo-suite-revamp-plan.md) ---
// Mirrors the SeoFinding / HealthScore / route shapes from
// src/lib/marketing/seoAudit.ts + src/app/api/marketing/seo-audit/route.ts.
type FindingSeverity = 'error' | 'warning' | 'notice'
type Finding = {
  id: string
  category: string
  severity: FindingSeverity
  priorityWeight: number
  urlsAffected: number
  pctSite: number
  indexable: boolean
  what: string
  why: string
  howToFix: string
  affectedUrls: string[]
  source: string
  status: string
}
type HealthScore = {
  score: number
  band: 'Weak' | 'Fair' | 'Good' | 'Excellent'
  errors: number
  warnings: number
  notices: number
}
type PageResult = { url: string; findings: Finding[]; healthScore: HealthScore }
type AuditData = {
  error?: string
  results?: PageResult[]
  summary?: { byCategory?: Record<string, number>; bySeverity?: Record<string, number>; avgHealthScore?: number }
  warnings?: string[]
}

// --- Site crawl (Phase 2 crawl-graph; see docs/seo-suite-revamp-plan.md §12) ---
// Mirrors the CrawlStats shape from src/lib/marketing/seoCrawl.ts and the
// { generatedAt, findings, stats } response from
// src/app/api/marketing/seo-crawl/route.ts. Crawl findings reuse the same
// SeoFinding model (local `Finding` type) — all category 'technical'.
type CrawlStats = {
  seedUrl: string
  pagesCrawled: number
  pagesAttempted: number
  maxPages: number
  capped: boolean
  maxDepthReached: number
  sitemapUrlCount: number
  sitemapAvailable: boolean
  internalLinksSeen: number
  brokenLinks: number
  redirectChains: number
  orphanPages: number
  underLinkedPages: number
  genericAnchorLinks: number
  tooDeepPages: number
  sitemapNotCrawled: number
  crawledNotInSitemap: number
}
type CrawlData = {
  generatedAt?: string
  error?: string
  findings?: Finding[]
  stats?: CrawlStats | null
}

// --- AI citation share-of-voice (marketingIdea seo-ai-citation-tracking) ---
// Mirrors the STORED snapshot doc shape read back by GET /api/marketing/ai-citation
// (the list projection in src/app/api/marketing/ai-citation/route.ts), which
// flattens the aggregate onto the document and projects the heavy answerText out.
// Field names match src/lib/marketing/aiCitation.ts + the aiCitationSnapshot schema.
type CompetitorTally = { name: string; count: number }
type AiCitationPromptResult = {
  prompt: string
  goinvoMentioned: boolean
  goinvoCited: boolean
  citedGoinvoUrls?: string[]
  competitorsMentioned?: string[]
}
type AiCitationSnapshot = {
  _id?: string
  runDate?: string
  model?: string
  promptCount?: number
  answeredCount?: number
  // Rates are 0–1 over answered prompts; render as %.
  mentionRate?: number
  citationRate?: number
  mentionedCount?: number
  citedCount?: number
  unavailable?: boolean
  unavailableReason?: string
  topCompetitors?: CompetitorTally[]
  results?: AiCitationPromptResult[]
}
// GET list payload — { snapshots: [...] } (or { error, snapshots: [] } when the
// write token is missing). Newest first.
type AiCitationData = { error?: string; snapshots?: AiCitationSnapshot[] }
// POST run payload — { stored, snapshot, ... }; snapshot.aggregate is NESTED here
// (PanelSnapshot), unlike the flattened GET doc. We refresh via GET after a run,
// so we only need to read the run's status/warning off the POST response.
type AiCitationRunResult = { error?: string; stored?: boolean; storeWarning?: string }

type SeoWorkspaceProps = { client?: SanityClient }

// The marketing WRITE routes require either a server API key or a logged-in
// Studio session. Studio stores the user's auth token in localStorage under
// `__studio_auth_token_<projectId>`; the value is sometimes a raw string and
// sometimes a JSON envelope like {"token":"..."}. Returns null when there's no
// token (so callers can simply omit the header).
export function studioSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  if (!projectId) return null
  try {
    const raw = window.localStorage.getItem(`__studio_auth_token_${projectId}`)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as { token?: unknown } | string
      if (typeof parsed === 'string') return parsed.trim() || null
      if (parsed && typeof parsed.token === 'string') return parsed.token.trim() || null
    } catch {
      // Not JSON — treat the stored value as the raw token.
    }
    return raw.trim() || null
  } catch {
    return null
  }
}

const UI_COLOR = {
  link: 'var(--card-link-fg-color)',
  // Sanity guarantees card foreground/background contrast in every theme.
  // Meaning is also carried by labels/icons, never by color alone.
  positive: 'var(--card-fg-color)',
  caution: 'var(--card-fg-color)',
  critical: 'var(--card-fg-color)',
  muted: 'var(--card-muted-fg-color)',
} as const

const FIX_COLORS: Record<string, string> = { ranking: UI_COLOR.link, ctr: UI_COLOR.caution, maintain: UI_COLOR.muted }
const VERDICT_COLORS: Record<string, string> = {
  supported: UI_COLOR.positive,
  needsCitation: UI_COLOR.caution,
  questionable: UI_COLOR.critical,
  unverifiable: UI_COLOR.muted,
}
const STATUS_COLORS: Record<string, string> = { idea: UI_COLOR.muted, exploring: UI_COLOR.link, planned: UI_COLOR.link, inProgress: UI_COLOR.caution, shipped: UI_COLOR.positive, dropped: UI_COLOR.muted }
const PRIORITY_COLORS: Record<string, string> = { high: UI_COLOR.critical, medium: UI_COLOR.caution, low: UI_COLOR.muted }
const STATUS_ORDER = ['idea', 'exploring', 'planned', 'inProgress', 'shipped', 'dropped']

// Decay watch-list action → color (refresh = act, consolidate = redirect,
// leave = monitor) and the matching [page, query]-style intent palette.
const DECAY_ACTION_COLORS: Record<DecayWatch['action'], string> = {
  refresh: UI_COLOR.caution,
  consolidate: UI_COLOR.link,
  leave: UI_COLOR.muted,
}
const INTENT_COLORS: Record<IntentProfileEntry['intent'], string> = {
  informational: UI_COLOR.link,
  commercial: UI_COLOR.caution,
  transactional: UI_COLOR.positive,
  navigational: UI_COLOR.muted,
}

// §7 severity colors: red error / yellow warning / blue notice.
const SEVERITY_COLORS: Record<FindingSeverity, string> = { error: UI_COLOR.critical, warning: UI_COLOR.caution, notice: UI_COLOR.link }
const SEVERITY_LABELS: Record<FindingSeverity, string> = { error: 'Errors', warning: 'Warnings', notice: 'Notices' }
const SEVERITY_ORDER: FindingSeverity[] = ['error', 'warning', 'notice']
const SEVERITY_RANK: Record<FindingSeverity, number> = { error: 0, warning: 1, notice: 2 }
// Band → color (Weak/Fair red, Fair orange, Good/Excellent green per the brief).
const BAND_COLORS: Record<HealthScore['band'], string> = {
  Weak: UI_COLOR.critical,
  Fair: UI_COLOR.caution,
  Good: UI_COLOR.positive,
  Excellent: UI_COLOR.positive,
}
// Map a finding.category → a marketingIdea category option value.
const FINDING_CATEGORY_TO_IDEA: Record<string, string> = {
  technical: 'technical',
  indexation: 'technical',
  onpage: 'seo',
  content: 'content',
  'structured-data': 'seo',
  performance: 'technical',
  'internal-linking': 'seo',
  eeat: 'content',
  geo: 'seo',
}
// error→high / warning→medium / notice→low for the backlog priority field.
const SEVERITY_TO_PRIORITY: Record<FindingSeverity, string> = { error: 'high', warning: 'medium', notice: 'low' }

// Quick-wins lane: easiest high-value fixes first. Rank by severity, then by
// priorityWeight (desc), then favor single-page / low-spread (easy to fix).
function rankQuickWins(findings: Finding[]): Finding[] {
  return findings
    .slice()
    .sort(
      (a, b) =>
        SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        b.priorityWeight - a.priorityWeight ||
        a.urlsAffected - b.urlsAffected,
    )
}
// A concise title for the backlog from a finding's `what` headline.
function conciseTitle(what: string): string {
  const firstSentence = what.split(/(?<=[.?!])\s/)[0] || what
  return firstSentence.length > 90 ? `${firstSentence.slice(0, 87).trimEnd()}...` : firstSentence
}
function sortIdeas(list: Idea[], by: 'priority' | 'category' | 'status'): Idea[] {
  const rankP = (p?: string) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2)
  const copy = list.slice()
  if (by === 'category') copy.sort((a, b) => (a.category || '').localeCompare(b.category || '') || rankP(a.priority) - rankP(b.priority))
  else if (by === 'status') copy.sort((a, b) => STATUS_ORDER.indexOf(a.status || 'idea') - STATUS_ORDER.indexOf(b.status || 'idea') || rankP(a.priority) - rankP(b.priority))
  else copy.sort((a, b) => rankP(a.priority) - rankP(b.priority))
  return copy
}

const s: Record<string, CSSProperties> = {
  wrap: { padding: 16, color: 'var(--card-fg-color)', fontSize: 13 },
  h2: { fontSize: 16, fontWeight: 600, margin: '0 0 4px' },
  sub: { color: 'var(--card-muted-fg-color)', margin: '0 0 14px' },
  card: { border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 14, marginBottom: 18, background: 'var(--card-bg-color)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '6px 8px', color: 'var(--card-muted-fg-color)', borderBottom: '1px solid var(--card-border-color)', fontWeight: 500, whiteSpace: 'nowrap' },
  td: { padding: '6px 8px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top' },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  btn: { border: '1px solid var(--card-border-color)', background: 'var(--card-bg-color)', color: 'var(--card-fg-color)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12.5 },
  link: { color: UI_COLOR.link, cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', textAlign: 'left' },
  input: { flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border-color)', background: 'var(--card-bg-color)', color: 'var(--card-fg-color)', fontSize: 12.5 },
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
// TextFocus keyword difficulty (0–100, higher = harder) → a color so designers
// can spot the winnable keywords at a glance: low = green (easy), mid = orange,
// high = red (hard). Used by the keyword-enrichment columns.
const difficultyColor = (d: number): string => (d <= 30 ? UI_COLOR.positive : d <= 60 ? UI_COLOR.caution : UI_COLOR.critical)
const isQuestion = (q: string) => /^(what|how|why|which|when|who|where|is|are|do|does|can|should)\b/i.test(q) || q.includes('?')
const badge = (c: string): CSSProperties => ({
  display: 'inline-block',
  padding: '1px 7px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--card-bg-color)',
  background: c,
})

export function SeoWorkspace({ client }: SeoWorkspaceProps) {
  const [data, setData] = useState<SeoData | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideaSort, setIdeaSort] = useState<'priority' | 'category' | 'status'>('priority')
  const [openIdea, setOpenIdea] = useState<string | null>(null)
  const [openPage, setOpenPage] = useState<string | null>(null)
  // Expanded-row keys for the CTR-gap and cannibalization tables.
  const [openGap, setOpenGap] = useState<string | null>(null)
  const [openCannibal, setOpenCannibal] = useState<string | null>(null)
  // Expanded-row keys for the decay and intent-mismatch tables, plus the
  // intent-profile filter (null = all intents).
  const [openDecay, setOpenDecay] = useState<string | null>(null)
  const [openMismatch, setOpenMismatch] = useState<string | null>(null)
  const [intentFilter, setIntentFilter] = useState<IntentProfileEntry['intent'] | null>(null)
  // Per-row hovered key for the page-opportunity table — drives the hover-only
  // "Audit" button (inline styles, so no :hover available).
  const [hoveredOpp, setHoveredOpp] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [citeUrl, setCiteUrl] = useState('https://www.goinvo.com/')
  const [cite, setCite] = useState<CiteData | null>(null)
  const [citeLoading, setCiteLoading] = useState(false)

  // --- Page Audit state ---
  const [auditUrl, setAuditUrl] = useState('https://www.goinvo.com/')
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [auditLoading, setAuditLoading] = useState(false)
  const [openFinding, setOpenFinding] = useState<string | null>(null)
  // Track promote-to-backlog state per finding (keyed by url + finding id) so a
  // successful create disables that one button without affecting the others.
  const [promoted, setPromoted] = useState<Record<string, 'saving' | 'done' | 'error'>>({})
  // Ref on the Page-audit card so a row-level "Audit" can scroll it into view.
  const auditRef = useRef<HTMLDivElement | null>(null)

  // --- Site crawl state (Phase 2 crawl-graph findings) ---
  const [crawl, setCrawl] = useState<CrawlData | null>(null)
  const [crawlLoading, setCrawlLoading] = useState(false)
  // Expanded-finding key for the crawl section (separate from the audit's so
  // expanding a crawl finding never collapses an audit finding, and vice versa).
  const [openCrawlFinding, setOpenCrawlFinding] = useState<string | null>(null)

  // --- AI citation share-of-voice state ---
  // `aiCite` holds the GET list (cheap — reads stored snapshots, runs nothing).
  // `aiCiteLoading` = loading the list; `aiCiteRunning` = a live panel run (slow,
  // spends Claude credits). `aiCiteRunNote` carries a post-run store warning.
  const [aiCite, setAiCite] = useState<AiCitationData | null>(null)
  const [aiCiteLoading, setAiCiteLoading] = useState(true)
  const [aiCiteRunning, setAiCiteRunning] = useState(false)
  const [aiCiteRunNote, setAiCiteRunNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/seo', { headers: studioSessionHeader() })
      setData((await res.json()) as SeoData)
    } catch {
      setData({ error: 'Could not load SEO opportunities.' })
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!client) return
    void client
      .fetch<Idea[]>(
        '*[_type == "marketingIdea" && status != "dropped"]{ _id, title, summary, category, status, priority, nextAction, relatedUrl, source }',
      )
      .then((rows) => {
        const rank = (p?: string) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2)
        setIdeas((Array.isArray(rows) ? rows : []).slice().sort((a, b) => rank(a.priority) - rank(b.priority)))
      })
      .catch(() => setIdeas([]))
  }, [client])

  const runCitation = useCallback(async (url: string) => {
    const target = url.trim()
    if (!target) return
    setCiteUrl(target)
    setCiteLoading(true)
    setCite(null)
    try {
      const res = await fetch('/api/marketing/citation-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...studioSessionHeader(),
        },
        body: JSON.stringify({ pageUrl: target }),
      })
      setCite((await res.json()) as CiteData)
    } catch {
      setCite({ error: 'Citation check failed.' })
    } finally {
      setCiteLoading(false)
    }
  }, [])

  // Run the Phase-1 audit. With a URL → single-page mode (?url=, incl.
  // indexation); without → the multi-page sitemap sweep. Never crashes on a
  // failed fetch — a thrown error becomes an { error } payload.
  const runAudit = useCallback(async (url: string) => {
    const target = url.trim()
    setAuditLoading(true)
    setAudit(null)
    setOpenFinding(null)
    setPromoted({})
    try {
      const qs = target ? `?url=${encodeURIComponent(target)}` : ''
      const res = await fetch(`/api/marketing/seo-audit${qs}`, { headers: studioSessionHeader() })
      setAudit((await res.json()) as AuditData)
    } catch {
      setAudit({ error: 'Could not run the page audit.' })
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // Run the Phase-2 site crawl. Walks the internal link graph in one bounded
  // breadth-first pass (broken links, redirect chains, orphans, click-depth,
  // under-linked, generic anchors). Slow (~2 min) — the button shows a clear
  // loading state. Never crashes: a thrown error becomes an { error } payload.
  const runCrawl = useCallback(async () => {
    setCrawlLoading(true)
    setCrawl(null)
    setOpenCrawlFinding(null)
    setPromoted({})
    try {
      const res = await fetch('/api/marketing/seo-crawl', { headers: studioSessionHeader() })
      setCrawl((await res.json()) as CrawlData)
    } catch {
      setCrawl({ error: 'Could not run the site crawl.' })
    } finally {
      setCrawlLoading(false)
    }
  }, [])

  // Load the recent AI-citation snapshots. CHEAP: GET reads stored data and runs
  // NO live searches. Called on mount and from the section's Refresh button.
  // Never crashes — a thrown error becomes an { error } payload.
  const loadAiCitation = useCallback(async () => {
    setAiCiteLoading(true)
    try {
      const res = await fetch('/api/marketing/ai-citation', { headers: studioSessionHeader() })
      setAiCite((await res.json()) as AiCitationData)
    } catch {
      setAiCite({ error: 'Could not load AI-citation snapshots.' })
    } finally {
      setAiCiteLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadAiCitation()
  }, [loadAiCitation])

  // Run the live AI-citation panel. SLOW (~1–2 min) and spends Claude credits:
  // POST runs 12 live AI web-searches. On completion, refresh the list (GET) so
  // the new snapshot shows up. Never crashes — failures surface a clear note.
  const runAiCitation = useCallback(async () => {
    if (aiCiteRunning) return
    setAiCiteRunning(true)
    setAiCiteRunNote(null)
    try {
      const res = await fetch('/api/marketing/ai-citation', {
        method: 'POST',
        headers: studioSessionHeader(),
      })
      const payload = (await res.json()) as AiCitationRunResult
      if (payload.error) {
        setAiCiteRunNote(payload.error)
      } else if (payload.storeWarning) {
        // The run succeeded but the snapshot was not stored — it won't appear in
        // the refreshed list, so say so explicitly.
        setAiCiteRunNote(payload.storeWarning)
      }
      // Refresh the stored list either way so a successful run shows up.
      await loadAiCitation()
    } catch {
      setAiCiteRunNote('The AI-citation check failed to run.')
    } finally {
      setAiCiteRunning(false)
    }
  }, [aiCiteRunning, loadAiCitation])

  // Promote-to-backlog: write a finding straight into marketingIdea (closes the
  // engine ↔ backlog gap from the plan). Disables itself after a success.
  const promote = useCallback(
    async (key: string, finding: Finding) => {
      if (!client || promoted[key] === 'saving' || promoted[key] === 'done') return
      setPromoted((prev) => ({ ...prev, [key]: 'saving' }))
      try {
        await client.create({
          _type: 'marketingIdea',
          title: conciseTitle(finding.what),
          summary: finding.why,
          nextAction: finding.howToFix,
          relatedUrl: finding.affectedUrls[0],
          category: FINDING_CATEGORY_TO_IDEA[finding.category] || 'seo',
          priority: SEVERITY_TO_PRIORITY[finding.severity],
          effort: 'small',
          source: 'seo-audit',
          status: 'idea',
        })
        setPromoted((prev) => ({ ...prev, [key]: 'done' }))
      } catch {
        setPromoted((prev) => ({ ...prev, [key]: 'error' }))
      }
    },
    [client, promoted],
  )

  return (
    <div style={s.wrap}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={s.h2}>SEO Opportunities</h2>
          <p style={s.sub}>
            Live from Search Console + GA4{data?.range ? `, ${data.range.startDate} to ${data.range.endDate}` : ''}. Ranked by
            opportunity (impressions x page-2 position).
          </p>
        </div>
        <button type="button" style={s.btn} onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* --- Page Audit (Phase 1: fetch + parse → Health Score + findings) --- */}
      <div ref={auditRef} style={s.card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Page audit</div>
        <p style={{ ...s.sub, marginBottom: 10 }}>
          Fetch and parse a page for concrete, fixable issues. Audit one URL (incl. indexation), or run a sweep of the
          top key pages from the sitemap.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            aria-label="Page audit URL"
            style={s.input}
            value={auditUrl}
            onChange={(e) => setAuditUrl(e.target.value)}
            placeholder="https://www.goinvo.com/vision/..."
          />
          <button type="button" style={s.btn} onClick={() => void runAudit(auditUrl)} disabled={auditLoading}>
            {auditLoading ? 'Auditing...' : 'Audit page'}
          </button>
          <button type="button" style={s.btn} onClick={() => void runAudit('')} disabled={auditLoading}>
            {auditLoading ? 'Running...' : 'Run sweep'}
          </button>
        </div>
        <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 11, marginBottom: 12 }}>
          Run sweep audits the top 10 key pages (~30–60s); single-URL audits add indexation + render checks.
        </div>

        {auditLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--card-muted-fg-color)', padding: '4px 0' }}>
            <style>{'@keyframes seo-audit-spin{to{transform:rotate(360deg)}}'}</style>
            <span
              aria-hidden
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: '2px solid var(--card-border-color)',
                borderTopColor: UI_COLOR.link,
                display: 'inline-block',
                animation: 'seo-audit-spin 0.7s linear infinite',
              }}
            />
            <span>Auditing {auditUrl || 'the top key pages'}…</span>
          </div>
        )}

        {!auditLoading && audit?.error && <div style={{ color: SEVERITY_COLORS.error }}>{audit.error}</div>}

        {!auditLoading && audit && !audit.error && !audit.results?.length && (
          <div style={{ color: 'var(--card-muted-fg-color)' }}>No pages were audited.</div>
        )}

        {!auditLoading && audit && !audit.error && !!audit.results?.length && (
          (() => {
            const results = audit.results
            const isSweep = results.length > 1
            // Union of findings across the audited pages, then quick-wins ranked.
            const allFindings = results.flatMap((r) =>
              r.findings.map((f) => ({ finding: f, url: f.affectedUrls[0] || r.url, pageUrl: r.url })),
            )
            // Top-3 quick-win finding ids — surfaced inline as a ⚡ badge in the
            // severity groups (no standalone lane, so each finding renders once).
            const quickWinIds = new Set(
              rankQuickWins(allFindings.map((x) => x.finding))
                .slice(0, 3)
                .map((f) => f.id),
            )
            const avg = audit.summary?.avgHealthScore ?? results[0].healthScore.score
            const avgBand: HealthScore['band'] = avg <= 30 ? 'Weak' : avg <= 70 ? 'Fair' : avg <= 90 ? 'Good' : 'Excellent'
            const totals = SEVERITY_ORDER.map((sev) => ({
              sev,
              n: audit.summary?.bySeverity?.[sev] ?? results.reduce(
                (acc, r) => acc + r.findings.filter((f) => f.severity === sev).length,
                0,
              ),
            }))

            const findingRow = (finding: Finding, url: string, pageUrl: string, ctx: string) => {
              const key = `${ctx}|${pageUrl}|${finding.id}`
              const open = openFinding === key
              const state = promoted[key]
              return (
                <Fragment key={key}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setOpenFinding(open ? null : key)}>
                    <td style={s.td}>
                      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={badge(SEVERITY_COLORS[finding.severity])}>{finding.severity}</span>
                        {quickWinIds.has(finding.id) && (
                          <span style={badge(UI_COLOR.link)} title="One of the top quick wins — do these first">
                            ⚡ Quick win
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...badge(UI_COLOR.muted),
                          background: 'transparent',
                          color: 'var(--card-muted-fg-color)',
                          border: '1px solid var(--card-border-color)',
                        }}
                      >
                        {finding.category}
                      </span>
                    </td>
                    <td style={s.td}>
                      {open ? '▾ ' : '▸ '}
                      {finding.what}
                      {finding.urlsAffected > 1 ? (
                        <span style={{ marginLeft: 6, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                          ({finding.urlsAffected} pages · {finding.pctSite}%)
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={3}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                          <div style={{ marginBottom: 6 }}>
                            <strong>What.</strong> {finding.what}
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <strong>Why it matters.</strong> {finding.why}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>How to fix.</strong> {finding.howToFix}
                          </div>
                          <div style={{ marginBottom: 10, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                            Affected:{' '}
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                              {url}
                            </a>
                            {' · '}source: {finding.source}
                          </div>
                          <button
                            type="button"
                            style={{ ...s.btn, opacity: !client || state === 'done' ? 0.6 : 1 }}
                            disabled={!client || state === 'saving' || state === 'done'}
                            onClick={(e) => {
                              e.stopPropagation()
                              void promote(key, finding)
                            }}
                          >
                            {state === 'done'
                              ? 'Added to backlog ✓'
                              : state === 'saving'
                                ? 'Adding...'
                                : state === 'error'
                                  ? 'Retry — add to backlog'
                                  : 'Promote to backlog'}
                          </button>
                          {!client && (
                            <span style={{ marginLeft: 8, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                              (connect a client to enable)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            }

            return (
              <Fragment>
                {/* Health Score */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--card-border-color)',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ textAlign: 'center', minWidth: 92 }}>
                    <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: BAND_COLORS[avgBand] }}>
                      {avg}
                    </div>
                    <div style={{ ...badge(BAND_COLORS[avgBand]), marginTop: 6 }}>{avgBand}</div>
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    <div style={{ marginBottom: 4, color: 'var(--card-muted-fg-color)' }}>
                      {isSweep ? `Average health across ${results.length} pages` : 'Health score (only errors move it)'}
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {totals.map((t) => (
                        <span key={t.sev}>
                          <span style={{ ...badge(SEVERITY_COLORS[t.sev]), marginRight: 5 }}>{t.n}</span>
                          {SEVERITY_LABELS[t.sev]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Per-page scores for a sweep */}
                {isSweep && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Per-page scores</div>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Page</th>
                          <th style={{ ...s.th, ...s.num }}>Score</th>
                          <th style={{ ...s.th, ...s.num }}>Err</th>
                          <th style={{ ...s.th, ...s.num }}>Warn</th>
                          <th style={{ ...s.th, ...s.num }}>Notice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.url}>
                            <td style={s.td}>{r.url}</td>
                            <td style={{ ...s.td, ...s.num, color: BAND_COLORS[r.healthScore.band], fontWeight: 600 }}>
                              {r.healthScore.score}
                            </td>
                            <td style={{ ...s.td, ...s.num }}>{r.healthScore.errors}</td>
                            <td style={{ ...s.td, ...s.num }}>{r.healthScore.warnings}</td>
                            <td style={{ ...s.td, ...s.num }}>{r.healthScore.notices}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Findings grouped by severity (single source — quick wins are
                    surfaced inline via the ⚡ badge, not a separate lane). */}
                {SEVERITY_ORDER.map((sev) => {
                  const group = allFindings.filter((x) => x.finding.severity === sev)
                  if (!group.length) return null
                  return (
                    <div key={sev} style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        <span style={{ ...badge(SEVERITY_COLORS[sev]), marginRight: 6 }}>{group.length}</span>
                        {SEVERITY_LABELS[sev]}
                      </div>
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={s.th}>Severity</th>
                            <th style={s.th}>Category</th>
                            <th style={s.th}>Issue (click for the what / why / how)</th>
                          </tr>
                        </thead>
                        <tbody>{group.map((x) => findingRow(x.finding, x.url, x.pageUrl, sev))}</tbody>
                      </table>
                    </div>
                  )
                })}

                {!!audit.warnings?.length && (
                  <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 11, marginTop: 6 }}>
                    {audit.warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}
              </Fragment>
            )
          })()
        )}
      </div>

      {/* --- Site crawl (Phase 2: walk the internal link graph) --- */}
      <div style={s.card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Site crawl</div>
        <p style={{ ...s.sub, marginBottom: 10 }}>
          Walk the internal link graph from the sitemap + homepage to find graph-level issues a per-page audit can&apos;t
          see: broken internal links, redirect chains, orphan and under-linked pages, pages buried too deep, and generic
          link text.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={s.btn} onClick={() => void runCrawl()} disabled={crawlLoading}>
            {crawlLoading ? 'Crawling...' : 'Run crawl'}
          </button>
          <span style={{ color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
            Walks every internal link — takes ~2 min, free.
          </span>
        </div>

        {crawlLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--card-muted-fg-color)', padding: '4px 0' }}>
            <style>{'@keyframes seo-audit-spin{to{transform:rotate(360deg)}}'}</style>
            <span
              aria-hidden
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: '2px solid var(--card-border-color)',
                borderTopColor: UI_COLOR.link,
                display: 'inline-block',
                animation: 'seo-audit-spin 0.7s linear infinite',
              }}
            />
            <span>Crawling the site… this can take a couple of minutes.</span>
          </div>
        )}

        {!crawlLoading && crawl?.error && <div style={{ color: SEVERITY_COLORS.error }}>{crawl.error}</div>}

        {!crawlLoading && crawl && !crawl.error && !crawl.findings?.length && (
          <div style={{ color: SEVERITY_COLORS.notice }}>
            No internal-link issues found — the crawl reached the site cleanly.
          </div>
        )}

        {!crawlLoading && crawl && !crawl.error && !!crawl.findings?.length && (
          (() => {
            const findings = crawl.findings
            const stats = crawl.stats
            // Quick-wins ranked across all crawl findings — surfaced inline as
            // a ⚡ badge, exactly like the page-audit section (no separate lane).
            const quickWinIds = new Set(
              rankQuickWins(findings)
                .slice(0, 3)
                .map((f) => f.id),
            )
            const totals = SEVERITY_ORDER.map((sev) => ({
              sev,
              n: findings.filter((f) => f.severity === sev).length,
            }))

            const crawlFindingRow = (finding: Finding, sev: string) => {
              // Prefix the promote key so a crawl finding never collides with an
              // audit finding of the same id in the shared `promoted` map.
              const key = `crawl|${sev}|${finding.id}`
              const open = openCrawlFinding === key
              const state = promoted[key]
              const url = finding.affectedUrls[0] || stats?.seedUrl || ''
              return (
                <Fragment key={key}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setOpenCrawlFinding(open ? null : key)}>
                    <td style={s.td}>
                      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={badge(SEVERITY_COLORS[finding.severity])}>{finding.severity}</span>
                        {quickWinIds.has(finding.id) && (
                          <span style={badge(UI_COLOR.link)} title="One of the top quick wins — do these first">
                            ⚡ Quick win
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...badge(UI_COLOR.muted),
                          background: 'transparent',
                          color: 'var(--card-muted-fg-color)',
                          border: '1px solid var(--card-border-color)',
                        }}
                      >
                        {finding.category}
                      </span>
                    </td>
                    <td style={s.td}>
                      {open ? '▾ ' : '▸ '}
                      {finding.what}
                      {finding.urlsAffected > 1 ? (
                        <span style={{ marginLeft: 6, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                          ({finding.urlsAffected} pages)
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={3}>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                          <div style={{ marginBottom: 6 }}>
                            <strong>What.</strong> {finding.what}
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <strong>Why it matters.</strong> {finding.why}
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>How to fix.</strong> {finding.howToFix}
                          </div>
                          <div style={{ marginBottom: 10, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                            Affected:{' '}
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                {url}
                              </a>
                            ) : (
                              '—'
                            )}
                            {' · '}source: {finding.source}
                          </div>
                          <button
                            type="button"
                            style={{ ...s.btn, opacity: !client || state === 'done' ? 0.6 : 1 }}
                            disabled={!client || state === 'saving' || state === 'done'}
                            onClick={(e) => {
                              e.stopPropagation()
                              void promote(key, finding)
                            }}
                          >
                            {state === 'done'
                              ? 'Added to backlog ✓'
                              : state === 'saving'
                                ? 'Adding...'
                                : state === 'error'
                                  ? 'Retry — add to backlog'
                                  : 'Promote to backlog'}
                          </button>
                          {!client && (
                            <span style={{ marginLeft: 8, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                              (connect a client to enable)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            }

            return (
              <Fragment>
                {/* Compact coverage + counts summary from stats. */}
                {stats && (
                  <div
                    style={{
                      ...s.sub,
                      marginBottom: 14,
                      fontSize: 11,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--card-border-color)',
                      background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))',
                    }}
                  >
                    Crawled <strong>{stats.pagesCrawled.toLocaleString()}</strong> page
                    {stats.pagesCrawled === 1 ? '' : 's'} ({stats.internalLinksSeen.toLocaleString()} internal links,
                    max depth {stats.maxDepthReached}
                    {stats.capped ? ', capped' : ''}) · {stats.brokenLinks} broken link
                    {stats.brokenLinks === 1 ? '' : 's'} · {stats.redirectChains} redirect chain
                    {stats.redirectChains === 1 ? '' : 's'} · {stats.orphanPages} orphan
                    {stats.orphanPages === 1 ? '' : 's'} · {stats.underLinkedPages} under-linked ·{' '}
                    {stats.tooDeepPages} too deep · {stats.genericAnchorLinks} generic anchor
                    {stats.genericAnchorLinks === 1 ? '' : 's'}
                    {stats.sitemapAvailable
                      ? ` · ${stats.sitemapNotCrawled} sitemap page${stats.sitemapNotCrawled === 1 ? '' : 's'} not reached`
                      : ' · sitemap unavailable'}
                  </div>
                )}

                {/* Severity totals strip (mirrors the audit Health Score row). */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 14, fontSize: 12.5 }}>
                  {totals.map((t) => (
                    <span key={t.sev}>
                      <span style={{ ...badge(SEVERITY_COLORS[t.sev]), marginRight: 5 }}>{t.n}</span>
                      {SEVERITY_LABELS[t.sev]}
                    </span>
                  ))}
                </div>

                {/* Findings grouped by severity (quick wins inline via ⚡). */}
                {SEVERITY_ORDER.map((sev) => {
                  const group = findings.filter((f) => f.severity === sev)
                  if (!group.length) return null
                  return (
                    <div key={sev} style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        <span style={{ ...badge(SEVERITY_COLORS[sev]), marginRight: 6 }}>{group.length}</span>
                        {SEVERITY_LABELS[sev]}
                      </div>
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={s.th}>Severity</th>
                            <th style={s.th}>Category</th>
                            <th style={s.th}>Issue (click for the what / why / how)</th>
                          </tr>
                        </thead>
                        <tbody>{group.map((f) => crawlFindingRow(f, sev))}</tbody>
                      </table>
                    </div>
                  )
                })}
              </Fragment>
            )
          })()
        )}
      </div>

      {/* --- AI citation share-of-voice (do AI answer engines name + cite us?) --- */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>AI citation share-of-voice</div>
          <button type="button" style={s.btn} onClick={() => void loadAiCitation()} disabled={aiCiteLoading || aiCiteRunning}>
            {aiCiteLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <p style={{ ...s.sub, marginBottom: 10 }}>
          When a prospect asks an AI answer engine (live web search) about GoInvo&apos;s topics — best healthcare
          design firms, FHIR/EHR design, health data viz — does the answer <strong>name GoInvo</strong> and{' '}
          <strong>link goinvo.com</strong>? Tracked over time as a share-of-voice. The numbers below read stored snapshots
          (free); running a new check is what costs.
        </p>

        {/* Run button — the SLOW, paid action. Loading state + cost caveat are
            spelled out so designers know exactly what they're triggering. */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={s.btn} onClick={() => void runAiCitation()} disabled={aiCiteRunning}>
            {aiCiteRunning ? 'Running…' : 'Run AI-citation check'}
          </button>
          <span style={{ color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
            Runs 12 live AI web-searches — takes ~1–2 min and spends Claude credits. Run it occasionally to refresh the
            trend, not on every visit.
          </span>
        </div>

        {aiCiteRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--card-muted-fg-color)', padding: '4px 0', marginBottom: 10 }}>
            <style>{'@keyframes seo-audit-spin{to{transform:rotate(360deg)}}'}</style>
            <span
              aria-hidden
              style={{
                width: 13,
                height: 13,
                borderRadius: '50%',
                border: '2px solid var(--card-border-color)',
                borderTopColor: UI_COLOR.link,
                display: 'inline-block',
                animation: 'seo-audit-spin 0.7s linear infinite',
              }}
            />
            <span>Running 12 live AI searches… ~1–2 min, uses Claude credits.</span>
          </div>
        )}

        {aiCiteRunNote && !aiCiteRunning && (
          <div style={{ color: SEVERITY_COLORS.warning, fontSize: 12, marginBottom: 10 }}>{aiCiteRunNote}</div>
        )}

        {/* Loading the stored list (only when we have nothing to show yet). */}
        {aiCiteLoading && !aiCite && <div style={{ color: 'var(--card-muted-fg-color)' }}>Loading snapshots…</div>}

        {/* GET failed (e.g. no Sanity write token) → clear message, never crash. */}
        {!aiCiteLoading && aiCite?.error && <div style={{ color: SEVERITY_COLORS.error }}>{aiCite.error}</div>}

        {/* GET succeeded but there are no stored snapshots yet. */}
        {!aiCiteLoading && aiCite && !aiCite.error && !aiCite.snapshots?.length && (
          <div style={{ color: 'var(--card-muted-fg-color)' }}>
            No AI-citation snapshots yet. Run the check above to capture the first one.
          </div>
        )}

        {!aiCiteLoading && aiCite && !aiCite.error && !!aiCite.snapshots?.length && (
          (() => {
            const snapshots = aiCite.snapshots!
            const latest = snapshots[0]
            const fmtPct = (n?: number) => (typeof n === 'number' ? pct(n) : '—')
            const fmtDate = (d?: string) => (typeof d === 'string' && d ? d.slice(0, 10) : 'unknown')

            // Latest snapshot couldn't run (e.g. missing OPENAI_API_KEY) → say so
            // and fall back to the most recent snapshot that DID run, if any.
            const latestUnavailable = Boolean(latest.unavailable) || (latest.answeredCount ?? 0) === 0
            const headline = latestUnavailable
              ? snapshots.find((snap) => !snap.unavailable && (snap.answeredCount ?? 0) > 0)
              : latest

            return (
              <Fragment>
                {latestUnavailable && (
                  <div style={{ color: SEVERITY_COLORS.warning, fontSize: 12, marginBottom: 12 }}>
                    The latest run ({fmtDate(latest.runDate)}) couldn&apos;t complete
                    {latest.unavailableReason ? ` — ${latest.unavailableReason}` : ' (the AI engine returned no answers, e.g. ANTHROPIC_API_KEY is not set).'}
                    {headline ? ' Showing the most recent successful run below.' : ''}
                  </div>
                )}

                {headline ? (
                  <Fragment>
                    {/* Headline: mention rate + citation rate, big and labelled. */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 28,
                        flexWrap: 'wrap',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--card-border-color)',
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: UI_COLOR.link }}>
                          {fmtPct(headline.mentionRate)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--card-muted-fg-color)', marginTop: 4 }}>
                          Mention rate — % of AI answers that name GoInvo
                        </div>
                      </div>
                      <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: UI_COLOR.positive }}>
                          {fmtPct(headline.citationRate)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--card-muted-fg-color)', marginTop: 4 }}>
                          Citation rate — % that link goinvo.com
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--card-muted-fg-color)' }}>
                        <div>
                          Answered <strong style={{ color: 'var(--card-fg-color)' }}>{headline.answeredCount ?? 0}</strong> of{' '}
                          {headline.promptCount ?? 0} prompts
                        </div>
                        <div style={{ marginTop: 2 }}>
                          Run {fmtDate(headline.runDate)}
                          {headline.model ? ` · ${headline.model}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Top competitors named in the same answers. */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12.5 }}>
                        Top competitors — firms named alongside us (name · times mentioned across the panel)
                      </div>
                      {headline.topCompetitors?.length ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {headline.topCompetitors.slice(0, 12).map((c) => (
                            <span
                              key={c.name}
                              style={{
                                ...badge(UI_COLOR.muted),
                                background: 'transparent',
                                color: 'var(--card-fg-color)',
                                border: '1px solid var(--card-border-color)',
                                fontWeight: 500,
                              }}
                            >
                              {c.name}
                              <span style={{ color: 'var(--card-muted-fg-color)', marginLeft: 6 }}>{c.count}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 12 }}>
                          No competitors were detected in this run&apos;s answers.
                        </div>
                      )}
                    </div>

                    {/* Per-prompt breakdown: mentioned ✓/✗, cited ✓/✗, cited URLs. */}
                    {!!headline.results?.length && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12.5 }}>
                          Per-prompt breakdown — the {headline.results.length} fixed questions, latest run
                        </div>
                        <table style={s.table}>
                          <thead>
                            <tr>
                              <th style={s.th}>Prompt</th>
                              <th style={s.th} title="The AI answer named GoInvo">
                                Mentioned
                              </th>
                              <th style={s.th} title="The AI answer linked goinvo.com">
                                Cited
                              </th>
                              <th style={s.th}>Cited goinvo.com URL(s)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {headline.results.map((r, i) => (
                              <tr key={`${r.prompt}|${i}`}>
                                <td style={s.td}>{r.prompt}</td>
                                <td style={s.td}>
                                  <span style={badge(r.goinvoMentioned ? UI_COLOR.positive : UI_COLOR.muted)}>
                                    {r.goinvoMentioned ? '✓' : '✗'}
                                  </span>
                                </td>
                                <td style={s.td}>
                                  <span style={badge(r.goinvoCited ? UI_COLOR.positive : UI_COLOR.muted)}>
                                    {r.goinvoCited ? '✓' : '✗'}
                                  </span>
                                </td>
                                <td style={{ ...s.td, fontSize: 11 }}>
                                  {r.citedGoinvoUrls?.length ? (
                                    r.citedGoinvoUrls.map((u) => (
                                      <div key={u}>
                                        <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                          {u}
                                        </a>
                                      </div>
                                    ))
                                  ) : (
                                    <span style={{ color: 'var(--card-muted-fg-color)' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Fragment>
                ) : null}

                {/* Trend across the recent snapshots (newest first). */}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12.5 }}>
                    Trend — mention &amp; citation rate by run date (newest first)
                  </div>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Run date</th>
                        <th style={{ ...s.th, ...s.num }} title="% of answers that named GoInvo">
                          Mention rate
                        </th>
                        <th style={{ ...s.th, ...s.num }} title="% of answers that linked goinvo.com">
                          Citation rate
                        </th>
                        <th style={{ ...s.th, ...s.num }} title="Prompts answered / prompts run">
                          Answered
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((snap) => (
                        <tr key={snap._id || snap.runDate}>
                          <td style={s.td}>
                            {fmtDate(snap.runDate)}
                            {snap.unavailable || (snap.answeredCount ?? 0) === 0 ? (
                              <span style={{ marginLeft: 6, color: SEVERITY_COLORS.warning, fontSize: 11 }}>
                                (did not run)
                              </span>
                            ) : null}
                          </td>
                          <td style={{ ...s.td, ...s.num, color: UI_COLOR.link, fontWeight: 600 }}>{fmtPct(snap.mentionRate)}</td>
                          <td style={{ ...s.td, ...s.num, color: UI_COLOR.positive, fontWeight: 600 }}>{fmtPct(snap.citationRate)}</td>
                          <td style={{ ...s.td, ...s.num }}>
                            {snap.answeredCount ?? 0}/{snap.promptCount ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Fragment>
            )
          })()
        )}
      </div>

      {!!ideas.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Ideas &amp; findings ({ideas.length})</div>
          <div style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>Click a column to sort, click a row for the details.</div>
          <div data-mobile-scroll="true" style={{ maxWidth: '100%', overflowX: 'auto' }}>
            <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, cursor: 'pointer' }} onClick={() => setIdeaSort('priority')}>
                  Priority{ideaSort === 'priority' ? ' ▾' : ''}
                </th>
                <th style={s.th}>Idea</th>
                <th style={{ ...s.th, cursor: 'pointer' }} onClick={() => setIdeaSort('category')}>
                  Category{ideaSort === 'category' ? ' ▾' : ''}
                </th>
                <th style={{ ...s.th, cursor: 'pointer' }} onClick={() => setIdeaSort('status')}>
                  Status{ideaSort === 'status' ? ' ▾' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortIdeas(ideas, ideaSort).map((idea) => (
                <Fragment key={idea._id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setOpenIdea(openIdea === idea._id ? null : idea._id)}>
                    <td style={s.td}>
                      <span style={badge(PRIORITY_COLORS[idea.priority || 'low'] || PRIORITY_COLORS.low)}>
                        {idea.priority || 'low'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {openIdea === idea._id ? '▾ ' : '▸ '}
                      {idea.title}
                    </td>
                    <td style={s.td}>{idea.category}</td>
                    <td style={s.td}>
                      <span style={badge(STATUS_COLORS[idea.status || 'idea'] || STATUS_COLORS.idea)}>
                        {idea.status || 'idea'}
                      </span>
                    </td>
                  </tr>
                  {openIdea === idea._id && (
                    <tr>
                      <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={4}>
                        {idea.summary ? <div style={{ marginBottom: 6 }}>{idea.summary}</div> : null}
                        {idea.nextAction ? (
                          <div style={{ marginBottom: 6 }}>
                            <strong>Next:</strong> {idea.nextAction}
                          </div>
                        ) : null}
                        <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                          {idea.source ? `Source: ${idea.source}` : ''}
                          {idea.relatedUrl ? (
                            <Fragment>
                              {idea.source ? ' · ' : ''}
                              <a href={idea.relatedUrl} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                {idea.relatedUrl}
                              </a>
                            </Fragment>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.configured === false && (
        <div style={s.card}>
          {data.message || 'Set GOOGLE_SERVICE_ACCOUNT_JSON to enable live Search Console + GA4 opportunities.'}
        </div>
      )}
      {data?.error && <div style={{ ...s.card, color: VERDICT_COLORS.questionable }}>{data.error}</div>}

      {!!data?.pages?.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Page opportunities</div>
          {data.configured && data.keyEventsConfigured === false && (
            <div
              style={{
                ...s.sub,
                marginBottom: 10,
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--card-border-color)',
                background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))',
              }}
            >
              <strong style={{ color: UI_COLOR.caution }}>Leads column is off.</strong> GA4 key-events aren&apos;t configured, so the
              score uses search demand only. Mark the contact-form / RFP-CTA actions as GA4 key events to rank converting
              pages higher and light up this column.
            </div>
          )}
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Page (click for a guided plan)</th>
                <th style={{ ...s.th, ...s.num }}>Impr</th>
                <th style={{ ...s.th, ...s.num }}>CTR</th>
                <th style={{ ...s.th, ...s.num }}>Pos</th>
                <th style={{ ...s.th, ...s.num }} title="GA4 key-events (leads) attributed to this page">
                  Leads
                </th>
                <th style={{ ...s.th, ...s.num }}>Score</th>
                <th style={s.th}>Fix</th>
              </tr>
            </thead>
            <tbody>
              {data.pages.slice(0, 15).map((p) => {
                const open = openPage === p.path
                const queries = p.topQueries || []
                const questions = queries.filter(isQuestion)
                const briefQs = (questions.length ? questions : queries).slice(0, 6)
                const heading = questions[0] || p.topQuery || queries[0] || ''
                const hovered = hoveredOpp === p.path
                return (
                  <Fragment key={p.path}>
                    <tr
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenPage(open ? null : p.path)}
                      onMouseEnter={() => setHoveredOpp(p.path)}
                      onMouseLeave={() => setHoveredOpp((prev) => (prev === p.path ? null : prev))}
                    >
                      <td style={{ ...s.td, position: 'relative' }}>
                        {open ? '▾ ' : '▸ '}
                        {p.path}
                        {p.legacy ? (
                          <span style={{ marginLeft: 6, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>(legacy → redirect)</span>
                        ) : null}
                        {/* Hover-only: audit this exact page straight from the row. */}
                        <button
                          type="button"
                          style={{
                            ...s.btn,
                            position: 'absolute',
                            top: '50%',
                            right: 8,
                            transform: 'translateY(-50%)',
                            padding: '2px 8px',
                            fontSize: 11,
                            opacity: hovered ? 1 : 0,
                            pointerEvents: hovered ? 'auto' : 'none',
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setAuditUrl(p.url)
                            void runAudit(p.url)
                            auditRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                        >
                          Audit
                        </button>
                      </td>
                      <td style={{ ...s.td, ...s.num }}>{p.impressions.toLocaleString()}</td>
                      <td style={{ ...s.td, ...s.num }}>{pct(p.ctr)}</td>
                      <td style={{ ...s.td, ...s.num }}>{p.position}</td>
                      <td
                        style={{
                          ...s.td,
                          ...s.num,
                          color: p.keyEvents ? UI_COLOR.positive : UI_COLOR.muted,
                          fontWeight: p.keyEvents ? 600 : 400,
                        }}
                        title={
                          data?.keyEventsConfigured
                            ? 'GA4 key-events (leads) in the last 28 days'
                            : 'GA4 key-events not configured yet — see the note above'
                        }
                      >
                        {data?.keyEventsConfigured ? (p.keyEvents ?? 0).toLocaleString() : '—'}
                      </td>
                      <td style={{ ...s.td, ...s.num }}>{p.score.toLocaleString()}</td>
                      <td style={s.td}>
                        <span style={badge(FIX_COLORS[p.fix] || FIX_COLORS.maintain)}>{p.fix}</span>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={7}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 8 }}>
                              <strong>Diagnosis.</strong> Ranks #{p.position} for &ldquo;{p.topQuery}&rdquo; — {p.impressions.toLocaleString()} impressions/qtr at {pct(p.ctr)} click-through. {p.fixHint}
                            </div>
                            {briefQs.length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <strong>People search these — answer them on the page:</strong>
                                <ul style={{ margin: '4px 0 0 18px' }}>
                                  {briefQs.map((q) => (
                                    <li key={q}>{q}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div style={{ marginBottom: 10 }}>
                              <strong>Do this (leave the page title unchanged):</strong>
                              {p.legacy ? (
                                <ol style={{ margin: '4px 0 0 18px' }}>
                                  <li>This is a legacy/duplicate URL — 301-redirect it to the live page in redirects.json rather than optimizing it.</li>
                                </ol>
                              ) : (
                                <ol style={{ margin: '4px 0 0 18px' }}>
                                  <li>
                                    Add a short <em>answer block</em> near the top that directly answers{' '}
                                    <strong>{heading || 'the top question above'}</strong>.
                                  </li>
                                  <li>
                                    Add a visible <em>FAQ</em> answering the questions above, plus Article + FAQPage structured data via the
                                    &lt;JsonLd&gt; component.
                                  </li>
                                  <li>Add a canonical tag and OpenGraph/Twitter tags.</li>
                                  <li>Fix the heading order — one H1, then H2/H3 with no skipped levels.</li>
                                  <li>Link to this page from 2&ndash;3 related pages using descriptive anchor text.</li>
                                </ol>
                              )}
                            </div>
                            <button type="button" style={s.btn} onClick={() => void runCitation(p.url)}>
                              Verify facts (check citations)
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Title/meta rewrite quick wins (position-adjusted CTR gap) --- */}
      {!!data?.ctrGaps?.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            <span style={{ ...badge(UI_COLOR.link), marginRight: 6 }}>⚡ Quick wins</span>
            Title/meta rewrite — quick wins
          </div>
          <p style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>
            These queries already rank on page 1 but earn far fewer clicks than their position should. They aren&apos;t
            earning the click — rewrite the page title + meta description to match intent. Cheapest, highest-yield win (no
            re-ranking needed).
          </p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Query (click for the fix)</th>
                <th style={s.th}>Page</th>
                <th style={{ ...s.th, ...s.num }}>Pos</th>
                <th style={{ ...s.th, ...s.num }} title="Actual vs expected click-through at this position">
                  CTR / exp
                </th>
                <th style={{ ...s.th, ...s.num }} title="Clicks/quarter left on the table at the expected CTR">
                  Missed
                </th>
              </tr>
            </thead>
            <tbody>
              {data.ctrGaps.slice(0, 15).map((g) => {
                const key = `${g.page}|${g.query}`
                const open = openGap === key
                return (
                  <Fragment key={key}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setOpenGap(open ? null : key)}>
                      <td style={s.td}>
                        {open ? '▾ ' : '▸ '}
                        {g.query}
                      </td>
                      <td style={s.td}>{g.page}</td>
                      <td style={{ ...s.td, ...s.num }}>{g.position}</td>
                      <td style={{ ...s.td, ...s.num }}>
                        <span style={{ color: UI_COLOR.critical, fontWeight: 600 }}>{pct(g.ctr)}</span>
                        <span style={{ color: 'var(--card-muted-fg-color)' }}> / {pct(g.expectedCtr)}</span>
                      </td>
                      <td style={{ ...s.td, ...s.num, fontWeight: 600 }}>+{g.missedClicks.toLocaleString()}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={5}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 6 }}>
                              <strong>Why.</strong> {g.fixHint}
                            </div>
                            <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                              {g.impressions.toLocaleString()} impressions/qtr ·{' '}
                              <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                {g.url}
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Keyword cannibalization (multiple pages, one query) --- */}
      {!!data?.cannibalization?.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Keyword cannibalization</div>
          <p style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>
            Queries where several goinvo.com pages compete with each other. Google has to split the query across them, so
            none ranks as well as one focused page would. Consolidate the weaker pages into the strongest (301-redirect),
            or clearly differentiate their intent and cross-link.
          </p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Query (click for the competing pages)</th>
                <th style={{ ...s.th, ...s.num }}>Pages</th>
                <th style={{ ...s.th, ...s.num }}>Impr</th>
                <th style={{ ...s.th, ...s.num }} title="Best (lowest) position any of the competing pages reaches">
                  Best pos
                </th>
              </tr>
            </thead>
            <tbody>
              {data.cannibalization.slice(0, 12).map((c) => {
                const open = openCannibal === c.query
                return (
                  <Fragment key={c.query}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setOpenCannibal(open ? null : c.query)}>
                      <td style={s.td}>
                        {open ? '▾ ' : '▸ '}
                        {c.query}
                      </td>
                      <td style={{ ...s.td, ...s.num }}>
                        <span style={badge(UI_COLOR.caution)}>{c.pages.length}</span>
                      </td>
                      <td style={{ ...s.td, ...s.num }}>{c.impressions.toLocaleString()}</td>
                      <td style={{ ...s.td, ...s.num }}>{c.bestPosition}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={4}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 6 }}>
                              <strong>Competing pages</strong> for &ldquo;{c.query}&rdquo; — keep the strongest, consolidate
                              or differentiate the rest:
                            </div>
                            <table style={s.table}>
                              <thead>
                                <tr>
                                  <th style={s.th}>Page</th>
                                  <th style={{ ...s.th, ...s.num }}>Impr</th>
                                  <th style={{ ...s.th, ...s.num }}>Clicks</th>
                                  <th style={{ ...s.th, ...s.num }}>Pos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.pages.map((pg) => (
                                  <tr key={pg.path}>
                                    <td style={s.td}>
                                      <a href={pg.url} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                        {pg.path}
                                      </a>
                                    </td>
                                    <td style={{ ...s.td, ...s.num }}>{pg.impressions.toLocaleString()}</td>
                                    <td style={{ ...s.td, ...s.num }}>{pg.clicks.toLocaleString()}</td>
                                    <td style={{ ...s.td, ...s.num }}>{pg.position}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Losing ground — content decay watchlist (90d vs prior 90d) --- */}
      {!!data?.decay?.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Losing ground — decay watchlist</div>
          <p style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>
            Pages whose search performance has slipped over the trailing 90 days vs the prior 90 days
            {data.priorRange && data.range
              ? ` (${data.range.startDate}…${data.range.endDate} vs ${data.priorRange.startDate}…${data.priorRange.endDate})`
              : ''}
            . A sustained drop across impressions, clicks, or average position. Each row recommends whether to{' '}
            <strong>refresh</strong> (rework the content), <strong>consolidate</strong> (redirect a fading
            legacy/duplicate), or <strong>leave</strong> (monitor). Note: a real refresh means substantive content changes
            — Google detects and discounts date-only edits.
          </p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Page (click for the fix)</th>
                <th style={{ ...s.th, ...s.num }} title="Impressions: recent 90d vs prior 90d">
                  Impr Δ
                </th>
                <th style={{ ...s.th, ...s.num }} title="Average position change (negative = improved, positive = slipped)">
                  Pos Δ
                </th>
                <th style={{ ...s.th, ...s.num }} title="How many of impressions / clicks / position declined">
                  Signals
                </th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.decay.slice(0, 15).map((d) => {
                const open = openDecay === d.path
                return (
                  <Fragment key={d.path}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setOpenDecay(open ? null : d.path)}>
                      <td style={s.td}>
                        {open ? '▾ ' : '▸ '}
                        {d.path}
                      </td>
                      <td style={{ ...s.td, ...s.num, color: UI_COLOR.critical, fontWeight: 600 }}>
                        {(d.impressionsPctChange * 100).toFixed(0)}%
                      </td>
                      <td
                        style={{
                          ...s.td,
                          ...s.num,
                          color: d.positionDelta > 0 ? UI_COLOR.critical : UI_COLOR.muted,
                          fontWeight: d.positionDelta > 0 ? 600 : 400,
                        }}
                      >
                        {d.positionDelta > 0 ? '+' : ''}
                        {d.positionDelta}
                      </td>
                      <td style={{ ...s.td, ...s.num }}>{d.decliningSignals}/3</td>
                      <td style={s.td}>
                        <span style={badge(DECAY_ACTION_COLORS[d.action])}>{d.action}</span>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={5}>
                          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                            <div style={{ marginBottom: 6 }}>
                              <strong>Why.</strong> {d.fixHint}
                            </div>
                            <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                              Impressions {d.priorImpressions.toLocaleString()} → {d.recentImpressions.toLocaleString()} ·
                              clicks {d.priorClicks.toLocaleString()} → {d.recentClicks.toLocaleString()} · position{' '}
                              {d.priorPosition} → {d.recentPosition} ·{' '}
                              <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                {d.url}
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Search-intent profile + intent mismatches --- */}
      {(!!data?.intentProfile?.length || !!data?.intentMismatches?.length) && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Search intent</div>
          <p style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>
            Top non-brand queries classified by intent (a rule-based keyword heuristic). <strong>Mismatches</strong> are
            buy-stage queries (commercial/transactional) answered by a purely informational page, or research-stage
            queries landing on a hard-sell page — point each at the right kind of page.
          </p>

          {!!data?.intentMismatches?.length && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12.5 }}>
                <span style={{ ...badge(UI_COLOR.critical), marginRight: 6 }}>{data.intentMismatches.length}</span>
                Intent mismatches (query vs ranking page)
              </div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Query (click for the fix)</th>
                    <th style={s.th}>Ranking page</th>
                    <th style={s.th}>Query → page intent</th>
                    <th style={{ ...s.th, ...s.num }}>Impr</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intentMismatches.slice(0, 12).map((m) => {
                    const key = `${m.query}|${m.page}`
                    const open = openMismatch === key
                    return (
                      <Fragment key={key}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => setOpenMismatch(open ? null : key)}>
                          <td style={s.td}>
                            {open ? '▾ ' : '▸ '}
                            {m.query}
                          </td>
                          <td style={s.td}>{m.page}</td>
                          <td style={s.td}>
                            <span style={{ ...badge(INTENT_COLORS[m.queryIntent]), marginRight: 4 }}>{m.queryIntent}</span>
                            <span style={{ color: 'var(--card-muted-fg-color)' }}>→</span>{' '}
                            <span style={badge(INTENT_COLORS[m.pageIntent])}>{m.pageIntent}</span>
                          </td>
                          <td style={{ ...s.td, ...s.num }}>{m.impressions.toLocaleString()}</td>
                        </tr>
                        {open && (
                          <tr>
                            <td
                              style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }}
                              colSpan={4}
                            >
                              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                                <div style={{ marginBottom: 6 }}>
                                  <strong>Why.</strong> {m.fixHint}
                                </div>
                                <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                                  {m.impressions.toLocaleString()} impressions/qtr · ranks #{m.position} ·{' '}
                                  <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: UI_COLOR.link }}>
                                    {m.url}
                                  </a>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!!data?.intentProfile?.length && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: 'wrap',
                  fontSize: 12.5,
                }}
              >
                <span style={{ fontWeight: 600 }}>Intent profile</span>
                {/* Filter chips — click an intent to filter, click again to clear. */}
                {(['informational', 'commercial', 'transactional', 'navigational'] as const).map((it) => {
                  const n = data.intentProfile!.filter((e) => e.intent === it).length
                  if (!n) return null
                  const active = intentFilter === it
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => setIntentFilter(active ? null : it)}
                      style={{
                        ...badge(INTENT_COLORS[it]),
                        cursor: 'pointer',
                        border: 'none',
                        opacity: !intentFilter || active ? 1 : 0.4,
                      }}
                    >
                      {it} {n}
                    </button>
                  )
                })}
              </div>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Query</th>
                    <th style={s.th}>Intent</th>
                    <th style={s.th}>Signals</th>
                    <th style={{ ...s.th, ...s.num }}>Impr</th>
                    <th style={{ ...s.th, ...s.num }}>Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intentProfile
                    .filter((e) => !intentFilter || e.intent === intentFilter)
                    .slice(0, 20)
                    .map((e) => (
                      <tr key={e.query}>
                        <td style={s.td}>{e.query}</td>
                        <td style={s.td}>
                          <span style={badge(INTENT_COLORS[e.intent])}>{e.intent}</span>
                        </td>
                        <td style={{ ...s.td, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>
                          {e.signals.length ? e.signals.join(', ') : '—'}
                        </td>
                        <td style={{ ...s.td, ...s.num }}>{e.impressions.toLocaleString()}</td>
                        <td style={{ ...s.td, ...s.num }}>{e.position}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!!data?.queries?.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Query opportunities (non-brand)</div>
          {/* Volume / Difficulty come from TextFocus keyword enrichment — only
              populated when the service is reachable. Note that when it's down. */}
          {data.queries.some((q) => q.volume !== undefined || q.difficulty !== undefined) ? (
            <p style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>
              <strong>Search Volume</strong> (monthly searches) and <strong>Keyword Difficulty</strong> (0–100, higher =
              harder to rank) come from TextFocus — a query is worth pursuing when it has high volume <em>and</em> low
              difficulty.
            </p>
          ) : (
            <p style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>
              Ranked by Search Console demand. Search volume + keyword difficulty appear here when TextFocus is reachable.
            </p>
          )}
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Query</th>
                <th style={{ ...s.th, ...s.num }} title="Search Console impressions over the period">
                  Impressions
                </th>
                <th style={{ ...s.th, ...s.num }}>CTR</th>
                <th style={{ ...s.th, ...s.num }} title="Average Search Console position">
                  Position
                </th>
                <th style={{ ...s.th, ...s.num }} title="TextFocus monthly search volume (blank if unavailable)">
                  Search Volume
                </th>
                <th style={{ ...s.th, ...s.num }} title="TextFocus keyword difficulty, 0–100 (higher = harder to rank)">
                  Keyword Difficulty
                </th>
                <th style={s.th}>Fix</th>
              </tr>
            </thead>
            <tbody>
              {data.queries.slice(0, 15).map((q) => (
                <tr key={q.query}>
                  <td style={s.td}>{q.query}</td>
                  <td style={{ ...s.td, ...s.num }}>{q.impressions.toLocaleString()}</td>
                  <td style={{ ...s.td, ...s.num }}>{pct(q.ctr)}</td>
                  <td style={{ ...s.td, ...s.num }}>{q.position}</td>
                  <td style={{ ...s.td, ...s.num }} title={q.cpc !== undefined ? `~$${q.cpc.toFixed(2)} CPC` : undefined}>
                    {q.volume !== undefined ? q.volume.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...s.td, ...s.num }}>
                    {q.difficulty !== undefined ? (
                      <span style={badge(difficultyColor(q.difficulty))}>{Math.round(q.difficulty)}</span>
                    ) : (
                      <span style={{ color: 'var(--card-muted-fg-color)' }}>—</span>
                    )}
                  </td>
                  <td style={s.td}>
                    <span style={badge(FIX_COLORS[q.fix] || FIX_COLORS.maintain)}>{q.fix}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={s.card}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Citation check</div>
        <p style={{ ...s.sub, marginBottom: 10 }}>
          Fact-check a page&apos;s claims before/after editing. Results are cached by content, so re-checking an unchanged
          page is free.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            aria-label="Citation check URL"
            style={s.input}
            value={citeUrl}
            onChange={(e) => setCiteUrl(e.target.value)}
            placeholder="https://www.goinvo.com/vision/..."
          />
          <button type="button" style={s.btn} onClick={() => void runCitation(citeUrl)} disabled={citeLoading}>
            {citeLoading ? 'Checking...' : 'Check'}
          </button>
        </div>
        {cite?.error && <div style={{ color: VERDICT_COLORS.questionable }}>{cite.error}</div>}
        {cite && !cite.error && (
          <div>
            <div style={{ marginBottom: 8 }}>
              {cite.cached ? '(cached) ' : ''}
              <strong>{cite.flagged ?? 0}</strong> of {cite.claims?.length ?? 0} claims flagged.{' '}
              <span style={{ color: 'var(--card-muted-fg-color)' }}>{cite.summary}</span>
            </div>
            {!!cite.claims?.length && (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Verdict</th>
                    <th style={s.th}>Claim</th>
                    <th style={s.th}>Cited?</th>
                  </tr>
                </thead>
                <tbody>
                  {cite.claims.map((c, i) => (
                    <tr key={i}>
                      <td style={s.td}>
                        <span style={badge(VERDICT_COLORS[c.verdict] || VERDICT_COLORS.unverifiable)}>{c.verdict}</span>
                      </td>
                      <td style={s.td} title={c.note}>
                        {c.claim}
                      </td>
                      <td style={s.td}>{c.hasOnPageCitation ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
