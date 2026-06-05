import { Fragment, useCallback, useEffect, useState, type CSSProperties } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [citeUrl, setCiteUrl] = useState('https://www.goinvo.com/')
  const [cite, setCite] = useState<CiteData | null>(null)
  const [citeLoading, setCiteLoading] = useState(false)

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
                return (
                  <Fragment key={p.path}>
                    <tr style={{ cursor: 'pointer' }} onClick={() => setOpenPage(open ? null : p.path)}>
                      <td style={s.td}>
                        {open ? '▾ ' : '▸ '}
                        {p.path}
                        {p.legacy ? (
                          <span style={{ marginLeft: 6, color: 'var(--card-muted-fg-color)', fontSize: 11 }}>(legacy → redirect)</span>
                        ) : null}
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
