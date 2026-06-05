import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { SanityClient } from '@sanity/client'

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
}
type SeoData = {
  configured?: boolean
  message?: string
  error?: string
  range?: { startDate: string; endDate: string }
  pages?: PageOpp[]
  queries?: QueryOpp[]
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

type SeoWorkspaceProps = { client?: SanityClient }

const FIX_COLORS: Record<string, string> = { ranking: '#2276fc', ctr: '#d98a00', maintain: '#7d8694' }
const VERDICT_COLORS: Record<string, string> = {
  supported: '#1f9d55',
  needsCitation: '#d98a00',
  questionable: '#e0463c',
  unverifiable: '#7d8694',
}
const STATUS_COLORS: Record<string, string> = { idea: '#7d8694', exploring: '#2276fc', planned: '#2276fc', inProgress: '#d98a00', shipped: '#1f9d55', dropped: '#9aa0a6' }
const PRIORITY_COLORS: Record<string, string> = { high: '#e0463c', medium: '#d98a00', low: '#7d8694' }
const STATUS_ORDER = ['idea', 'exploring', 'planned', 'inProgress', 'shipped', 'dropped']

// §7 severity colors: red error / yellow warning / blue notice.
const SEVERITY_COLORS: Record<FindingSeverity, string> = { error: '#e0463c', warning: '#d98a00', notice: '#2276fc' }
const SEVERITY_LABELS: Record<FindingSeverity, string> = { error: 'Errors', warning: 'Warnings', notice: 'Notices' }
const SEVERITY_ORDER: FindingSeverity[] = ['error', 'warning', 'notice']
const SEVERITY_RANK: Record<FindingSeverity, number> = { error: 0, warning: 1, notice: 2 }
// Band → color (Weak/Fair red, Fair orange, Good/Excellent green per the brief).
const BAND_COLORS: Record<HealthScore['band'], string> = {
  Weak: '#e0463c',
  Fair: '#d98a00',
  Good: '#1f9d55',
  Excellent: '#1f9d55',
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
  link: { color: '#2276fc', cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', textAlign: 'left' },
  input: { flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 6, border: '1px solid var(--card-border-color)', background: 'var(--card-bg-color)', color: 'var(--card-fg-color)', fontSize: 12.5 },
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const isQuestion = (q: string) => /^(what|how|why|which|when|who|where|is|are|do|does|can|should)\b/i.test(q) || q.includes('?')
const badge = (c: string): CSSProperties => ({
  display: 'inline-block',
  padding: '1px 7px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  color: '#fff',
  background: c,
})

export function SeoWorkspace({ client }: SeoWorkspaceProps) {
  const [data, setData] = useState<SeoData | null>(null)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideaSort, setIdeaSort] = useState<'priority' | 'category' | 'status'>('priority')
  const [openIdea, setOpenIdea] = useState<string | null>(null)
  const [openPage, setOpenPage] = useState<string | null>(null)
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/marketing/seo')
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
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/marketing/seo-audit${qs}`)
      setAudit((await res.json()) as AuditData)
    } catch {
      setAudit({ error: 'Could not run the page audit.' })
    } finally {
      setAuditLoading(false)
    }
  }, [])

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
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
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
                borderTopColor: '#2276fc',
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
                          <span style={badge('#7b2ff7')} title="One of the top quick wins — do these first">
                            ⚡ Quick win
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...badge('#7d8694'),
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
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#2276fc' }}>
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

      {!!ideas.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Ideas &amp; findings ({ideas.length})</div>
          <div style={{ ...s.sub, marginBottom: 8, fontSize: 11 }}>Click a column to sort, click a row for the details.</div>
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
                              <a href={idea.relatedUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2276fc' }}>
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
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Page (click for a guided plan)</th>
                <th style={{ ...s.th, ...s.num }}>Impr</th>
                <th style={{ ...s.th, ...s.num }}>CTR</th>
                <th style={{ ...s.th, ...s.num }}>Pos</th>
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
                      <td style={{ ...s.td, ...s.num }}>{p.score.toLocaleString()}</td>
                      <td style={s.td}>
                        <span style={badge(FIX_COLORS[p.fix] || FIX_COLORS.maintain)}>{p.fix}</span>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td style={{ ...s.td, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.08))' }} colSpan={6}>
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

      {!!data?.queries?.length && (
        <div style={s.card}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Query opportunities (non-brand)</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Query</th>
                <th style={{ ...s.th, ...s.num }}>Impr</th>
                <th style={{ ...s.th, ...s.num }}>CTR</th>
                <th style={{ ...s.th, ...s.num }}>Pos</th>
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
