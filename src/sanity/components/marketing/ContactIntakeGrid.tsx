'use client'

import { useEffect, useMemo, useState } from 'react'

import type { ParsedIntakeContact } from '@/lib/marketing'
import { OUTREACH_INTAKE_LIMITS } from '@/lib/marketing/outreachIntake'

export type ContactIntakeReviewState = 'draft' | 'ready' | 'duplicate'
export type ContactIntakeSort = 'added' | 'name' | 'organization' | 'state'
export const CONTACT_INTAKE_PAGE_SIZE = 50

export type ContactIntakeRow = {
  id: string
  entryIndex: number | null
  previewIndex: number | null
  rawText: string
  name: string
  organization: string
  role: string
  relationship: string
  contactDetails: string
  owner: string
  segment: string
  warmth: string
  source: 'Manual' | 'Past work' | 'Spreadsheet'
  state: ContactIntakeReviewState
  stateLabel: string
  duplicateReason?: string
}

type ParsedDraftLine = Pick<
  ContactIntakeRow,
  'name' | 'organization' | 'role' | 'relationship' | 'contactDetails' | 'owner' | 'segment' | 'warmth' | 'source'
>

const LABELED_PART = /^(organization|company|role|title|how we know|relationship|email|phone|linkedin|owner|segment|warmth|source)\s*:\s*(.+)$/i
const SEPARATOR = /\s+[—–]\s+/
const EMAIL_IN_TEXT = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const LINKEDIN_IN_TEXT = /https?:\/\/(?:www\.)?linkedin\.com\/\S+/i
const PHONE_IN_TEXT = /\+?\d[\d().\s-]{6,}\d/
const RELATIONSHIP_HINT = /\b(?:met|introduced|worked|thanked|past client|referred|knows?|friend|former|cold|warm)\b/i
const ROLE_HINT = /\b(?:ceo|cto|cio|cmo|chief|vp|vice president|director|head|manager|founder|president|lead|designer|engineer)\b/i

function compact(value: string | undefined | null) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

export function contactIntakeDraftLimitError(
  currentEntries: readonly string[],
  additionalText = '',
): string | null {
  const proposed = [...currentEntries, ...additionalText.split(/\r?\n/)]
    .map((entry) => entry.trim())
    .filter(Boolean)
  const unique = Array.from(
    new Map(proposed.map((entry) => [entry.toLowerCase().replace(/\s+/g, ' '), entry])).values(),
  )
  const tooLong = unique.find((entry) => entry.length > OUTREACH_INTAKE_LIMITS.lineCharacters)
  if (tooLong) {
    return `One contact row is ${tooLong.length.toLocaleString()} characters. Keep each row under ${OUTREACH_INTAKE_LIMITS.lineCharacters.toLocaleString()} characters.`
  }
  if (unique.length > OUTREACH_INTAKE_LIMITS.contacts) {
    return `Add at most ${OUTREACH_INTAKE_LIMITS.contacts} contacts in one batch. Save this batch, then start another.`
  }
  const combined = unique.join('\n')
  if (combined.length > OUTREACH_INTAKE_LIMITS.textCharacters) {
    return `This batch is too large. Keep it under ${OUTREACH_INTAKE_LIMITS.textCharacters.toLocaleString()} characters.`
  }
  return null
}

export function parseContactIntakeDraftLine(rawText: string): ParsedDraftLine {
  const raw = compact(rawText)
  const parts = raw.split(SEPARATOR).map(compact).filter(Boolean)
  const name = parts[0] || raw || 'Unnamed contact'
  let organization = ''
  let role = ''
  let relationship = ''
  let email = ''
  let phone = ''
  let linkedin = ''
  let owner = ''
  let segment = ''
  let warmth = ''
  let source: ParsedDraftLine['source'] | null = null

  for (const part of parts.slice(1)) {
    if (/^(?:account placeholder|person)$/i.test(part)) continue
    const labeled = part.match(LABELED_PART)
    if (labeled) {
      const label = labeled[1].toLowerCase()
      const value = compact(labeled[2])
      if (label === 'organization' || label === 'company') organization = value
      else if (label === 'role' || label === 'title') role = value
      else if (label === 'how we know' || label === 'relationship') relationship = value
      else if (label === 'email') email = value
      else if (label === 'phone') phone = value
      else if (label === 'linkedin') linkedin = value
      else if (label === 'owner') owner = value
      else if (label === 'segment') segment = value
      else if (label === 'warmth') warmth = value
      else if (label === 'source') {
        if (/spreadsheet|excel|csv/i.test(value)) source = 'Spreadsheet'
        else if (/past work/i.test(value)) source = 'Past work'
      }
      continue
    }

    const foundEmail = part.match(EMAIL_IN_TEXT)?.[0] || ''
    const foundLinkedin = part.match(LINKEDIN_IN_TEXT)?.[0] || ''
    const foundPhone = part.match(PHONE_IN_TEXT)?.[0] || ''
    if (!email && foundEmail) email = foundEmail
    if (!linkedin && foundLinkedin) linkedin = foundLinkedin
    if (!phone && foundPhone) phone = foundPhone
    const descriptivePart = compact(
      part
        .replace(EMAIL_IN_TEXT, '')
        .replace(LINKEDIN_IN_TEXT, '')
        .replace(PHONE_IN_TEXT, '')
        .replace(/^[,;·\s]+|[,;·\s]+$/g, ''),
    )
    if (!descriptivePart) continue

    const roleAtOrganization = descriptivePart.match(/^(.+?)\s+at\s+(.+)$/i)
    if (roleAtOrganization && !organization) {
      role = compact(roleAtOrganization[1])
      organization = compact(roleAtOrganization[2])
      continue
    }
    if (RELATIONSHIP_HINT.test(descriptivePart) && !relationship) relationship = descriptivePart
    else if (ROLE_HINT.test(descriptivePart) && !role) role = descriptivePart
    else if (!organization) organization = descriptivePart
    else if (!relationship) relationship = descriptivePart
  }

  const embeddedEmail = raw.match(EMAIL_IN_TEXT)?.[0]
  if (!email && embeddedEmail) email = embeddedEmail
  const details = [email, phone, linkedin].filter(Boolean).join(' · ')

  return {
    name,
    organization,
    role,
    relationship,
    contactDetails: details,
    owner,
    segment,
    warmth,
    source: source || (/(?:account placeholder|how we know\s*:)/i.test(raw) ? 'Past work' : 'Manual'),
  }
}

function matchPreviewToEntry(
  contact: ParsedIntakeContact,
  entries: readonly string[],
  claimedEntries: Set<number>,
) {
  const sourceLine = compact(contact.sourceLine).toLowerCase()
  if (sourceLine) {
    const exactIndex = entries.findIndex(
      (entry, index) => !claimedEntries.has(index) && compact(entry).toLowerCase() === sourceLine,
    )
    if (exactIndex >= 0) return exactIndex
  }
  return null
}

export function buildContactIntakeRows(
  entries: readonly string[],
  preview: readonly ParsedIntakeContact[] | null,
): ContactIntakeRow[] {
  if (!preview) {
    return entries.map((rawText, entryIndex) => {
      const draft = parseContactIntakeDraftLine(rawText)
      return {
        id: `draft-${entryIndex}-${compact(rawText).toLowerCase()}`,
        entryIndex,
        previewIndex: null,
        rawText,
        ...draft,
        state: 'draft',
        stateLabel: 'Needs review',
      }
    })
  }

  const claimedEntries = new Set<number>()
  const previewRows: ContactIntakeRow[] = preview.map((contact, previewIndex) => {
    const entryIndex = matchPreviewToEntry(contact, entries, claimedEntries)
    if (entryIndex !== null) claimedEntries.add(entryIndex)
    const rawText = entryIndex === null ? compact(contact.sourceLine) || contact.name : entries[entryIndex]
    const contactDetails = [contact.email, contact.phone, contact.linkedinUrl].map(compact).filter(Boolean).join(' · ')
    const duplicate = Boolean(contact.duplicate)
    const hasReviewedName = Boolean(compact(contact.name))
    return {
      id: `preview-${previewIndex}-${entryIndex ?? 'generated'}-${compact(contact.name).toLowerCase()}`,
      entryIndex,
      previewIndex,
      rawText,
      // Once contact review has returned, show exactly the fields in the payload
      // that will be committed. Falling back to the source-text heuristic here
      // can make a role or email look approved even though it will not be saved.
      name: compact(contact.name),
      organization: compact(contact.organization),
      role: compact(contact.role),
      relationship: compact(contact.howWeKnow),
      contactDetails,
      owner: compact(contact.owner),
      segment: compact(contact.segment),
      warmth: compact(contact.warmth),
      source: parseContactIntakeDraftLine(rawText).source,
      state: entryIndex === null || !hasReviewedName ? 'draft' : duplicate ? 'duplicate' : 'ready',
      stateLabel: entryIndex === null || !hasReviewedName
        ? 'Unmatched result · check'
        : duplicate
        ? /team member/i.test(contact.duplicateReason || '')
          ? 'Internal team · will skip'
          : 'Already exists · will skip'
        : 'Ready to add',
      duplicateReason: compact(contact.duplicateReason),
    }
  })

  const unparsedRows = entries.flatMap((rawText, entryIndex) => {
    if (claimedEntries.has(entryIndex)) return []
    const draft = parseContactIntakeDraftLine(rawText)
    return [{
      id: `unparsed-${entryIndex}-${compact(rawText).toLowerCase()}`,
      entryIndex,
      previewIndex: null,
      rawText,
      ...draft,
      state: 'draft' as const,
      stateLabel: 'Not parsed · check this row',
    }]
  })

  return [...previewRows, ...unparsedRows]
}

export function filterAndSortContactIntakeRows(
  rows: readonly ContactIntakeRow[],
  options: {
    query?: string
    state?: 'all' | ContactIntakeReviewState
    sort?: ContactIntakeSort
    direction?: 'asc' | 'desc'
  } = {},
) {
  const query = compact(options.query).toLowerCase()
  const state = options.state || 'all'
  const sort = options.sort || 'added'
  const direction = options.direction || 'asc'
  const filtered = rows.filter((row) => {
    if (state !== 'all' && row.state !== state) return false
    if (!query) return true
    return [
      row.name,
      row.organization,
      row.role,
      row.relationship,
      row.contactDetails,
      row.owner,
      row.segment,
      row.warmth,
      row.source,
      row.stateLabel,
      row.rawText,
    ].some((value) => value.toLowerCase().includes(query))
  })
  if (sort === 'added') return direction === 'asc' ? filtered : [...filtered].reverse()

  const stateRank: Record<ContactIntakeReviewState, number> = { draft: 0, ready: 1, duplicate: 2 }
  const valueFor = (row: ContactIntakeRow) => {
    if (sort === 'name') return row.name
    if (sort === 'organization') return row.organization || '\uffff'
    return String(stateRank[row.state])
  }
  return [...filtered].sort((left, right) => {
    const compared = valueFor(left).localeCompare(valueFor(right), undefined, { sensitivity: 'base' })
    return direction === 'asc' ? compared : -compared
  })
}

const STATE_COLORS: Record<ContactIntakeReviewState, { color: string; background: string; border: string }> = {
  draft: { color: '#b6c1cf', background: 'rgba(182, 193, 207, 0.08)', border: 'rgba(182, 193, 207, 0.28)' },
  ready: { color: '#64d2a1', background: 'rgba(31, 145, 95, 0.12)', border: 'rgba(100, 210, 161, 0.35)' },
  duplicate: { color: '#e5bd5c', background: 'rgba(214, 169, 63, 0.12)', border: 'rgba(229, 189, 92, 0.36)' },
}

const controlStyle = {
  minHeight: 36,
  minWidth: 0,
  border: '1px solid var(--card-border-color)',
  borderRadius: 5,
  padding: '7px 9px',
  background: 'var(--card-bg-color)',
  color: 'var(--card-fg-color)',
  font: 'inherit',
} as const

const boundedCellContentStyle = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  overflow: 'hidden',
  overflowWrap: 'anywhere',
} as const

export function ContactIntakeGrid({
  entries,
  preview,
  busy = false,
  onEdit,
  onRemove,
}: {
  entries: readonly string[]
  preview: readonly ParsedIntakeContact[] | null
  busy?: boolean
  onEdit: (row: ContactIntakeRow) => void
  onRemove: (row: ContactIntakeRow) => void
}) {
  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<'all' | ContactIntakeReviewState>('all')
  const [sort, setSort] = useState<ContactIntakeSort>('added')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const rows = useMemo(() => buildContactIntakeRows(entries, preview), [entries, preview])
  const visibleRows = useMemo(
    () => filterAndSortContactIntakeRows(rows, { query, state: stateFilter, sort, direction }),
    [direction, query, rows, sort, stateFilter],
  )
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / CONTACT_INTAKE_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageRows = visibleRows.slice(
    currentPage * CONTACT_INTAKE_PAGE_SIZE,
    (currentPage + 1) * CONTACT_INTAKE_PAGE_SIZE,
  )
  useEffect(() => setPage(0), [direction, query, rows.length, sort, stateFilter])

  if (rows.length === 0) return null

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div
        role="group"
        aria-label="Filter and sort contact drafts"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 7 }}
      >
        <input
          type="search"
          aria-label="Filter contact drafts"
          placeholder="Filter names, organizations, roles…"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          style={controlStyle}
        />
        <select
          aria-label="Filter contact drafts by review state"
          value={stateFilter}
          onChange={(event) => setStateFilter(event.currentTarget.value as 'all' | ContactIntakeReviewState)}
          style={controlStyle}
        >
          <option value="all">All review states</option>
          <option value="draft">Needs review</option>
          <option value="ready">Ready to add</option>
          <option value="duplicate">Already exists</option>
        </select>
        <select
          aria-label="Sort contact drafts"
          value={sort}
          onChange={(event) => setSort(event.currentTarget.value as ContactIntakeSort)}
          style={controlStyle}
        >
          <option value="added">Sort: Added order</option>
          <option value="name">Sort: Name</option>
          <option value="organization">Sort: Organization</option>
          <option value="state">Sort: Review state</option>
        </select>
        <button
          type="button"
          aria-label={`Sort contact drafts ${direction === 'asc' ? 'descending' : 'ascending'}`}
          title={`Currently ${direction === 'asc' ? 'ascending' : 'descending'}`}
          onClick={() => setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
          style={{ ...controlStyle, cursor: 'pointer', fontWeight: 800, paddingInline: 12 }}
        >
          {direction === 'asc' ? 'A→Z' : 'Z→A'}
        </button>
      </div>
      <div role="status" aria-live="polite" style={{ color: 'var(--card-muted-fg-color)', fontSize: 12 }}>
        Showing {visibleRows.length} of {rows.length} contact draft{rows.length === 1 ? '' : 's'}.
      </div>
      <div
        role="region"
        aria-label="Scrollable contact draft table"
        tabIndex={0}
        style={{ maxWidth: '100%', overflowX: 'auto', border: '1px solid var(--card-border-color)', borderRadius: 6 }}
      >
        <table aria-label="Contact drafts ready to check" style={{ width: '100%', minWidth: 1080, borderCollapse: 'collapse', fontSize: 13 }}>
          <caption style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
            Contact drafts with structured properties, review state, and row actions.
          </caption>
          <thead>
            <tr style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.035)' }}>
              {['Name', 'Organization', 'Role / relationship', 'Contact details', 'Owner / routing', 'Source', 'Review state', 'Actions'].map((heading) => (
                <th key={heading} scope="col" style={{ padding: '9px 10px', borderBottom: '1px solid var(--card-border-color)', whiteSpace: 'nowrap' }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIndex) => {
              const colors = STATE_COLORS[row.state]
              return (
                <tr key={row.id} style={{ opacity: row.state === 'duplicate' ? 0.72 : 1, background: rowIndex % 2 ? 'rgba(255, 255, 255, 0.018)' : 'transparent' }}>
                  <th scope="row" style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', textAlign: 'left', verticalAlign: 'top', maxWidth: 210, overflowWrap: 'anywhere' }}>
                    <span title={row.name} style={boundedCellContentStyle}>{row.name}</span>
                  </th>
                  <td style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', maxWidth: 190, overflowWrap: 'anywhere' }}><span title={row.organization} style={boundedCellContentStyle}>{row.organization || '—'}</span></td>
                  <td style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', maxWidth: 250, overflowWrap: 'anywhere' }}>
                    <span title={[row.role, row.relationship].filter(Boolean).join(' · ')} style={boundedCellContentStyle}>{[row.role, row.relationship].filter(Boolean).join(' · ') || '—'}</span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', maxWidth: 210, overflowWrap: 'anywhere' }}><span title={row.contactDetails} style={boundedCellContentStyle}>{row.contactDetails || '—'}</span></td>
                  <td style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', maxWidth: 190, overflowWrap: 'anywhere' }}>
                    <span title={[row.owner, row.segment, row.warmth].filter(Boolean).join(' · ')} style={boundedCellContentStyle}>
                      {[row.owner, row.segment, row.warmth].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{row.source}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top' }}>
                    <span title={row.duplicateReason} style={{ display: 'inline-flex', border: `1px solid ${colors.border}`, borderRadius: 999, padding: '3px 8px', color: colors.color, background: colors.background, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {row.stateLabel}
                    </span>
                  </td>
                  <td style={{ padding: '7px 9px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {row.entryIndex !== null && (
                      <button type="button" aria-label={`Edit ${row.name} in Add Contacts`} disabled={busy} onClick={() => onEdit(row)} style={{ ...controlStyle, minHeight: 40, padding: '7px 9px', marginRight: 6, cursor: busy ? 'not-allowed' : 'pointer' }}>
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Remove ${row.name} from Add Contacts`}
                      disabled={busy}
                      onClick={() => onRemove(row)}
                      style={{ ...controlStyle, minHeight: 40, padding: '7px 9px', cursor: busy ? 'not-allowed' : 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <div style={{ padding: 16, color: 'var(--card-muted-fg-color)', fontSize: 13 }}>No contact drafts match these filters.</div>
        )}
      </div>
      {visibleRows.length > CONTACT_INTAKE_PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: 'var(--card-muted-fg-color)', fontSize: 12 }}>
            Rows {currentPage * CONTACT_INTAKE_PAGE_SIZE + 1}–{Math.min((currentPage + 1) * CONTACT_INTAKE_PAGE_SIZE, visibleRows.length)} of {visibleRows.length}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} style={{ ...controlStyle, cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}>
              Previous rows
            </button>
            <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} style={{ ...controlStyle, cursor: currentPage >= pageCount - 1 ? 'not-allowed' : 'pointer' }}>
              Next rows
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
