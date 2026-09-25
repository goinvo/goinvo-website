import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { SanityClient } from '@sanity/client'
import { useClient } from 'sanity'

import {
  getMarketingOperationCounts,
  isWeeklyPlanRecord,
  marketingOperationGroup,
  marketingOperationIsOverdue,
  operationInputFromDashboardSignal,
  rankMarketingOperations,
  type MarketingOperation,
  type MarketingOperationDashboardSignal,
  type MarketingOperationGroup,
  type MarketingOperationPatch,
  type MarketingOperationStatus,
  type MarketingOperationTargetView,
} from '@/lib/marketing/operations'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { LABEL } from '@/lib/marketing/marquetaStyle'
import { taskStatusWords } from '@/lib/marketing/weeklyCheckIn'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'

const API_VERSION = '2024-01-01'
export const MARKETING_OPERATIONS_PAGE_SIZE = 25
export const MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE = 4

export function getMarketingOperationsPage<T>(items: T[], requestedPage: number, pageSize: number) {
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1)
  const pageCount = Math.max(1, Math.ceil(items.length / safePageSize))
  const page = Math.min(Math.max(0, Math.floor(requestedPage) || 0), pageCount - 1)
  const start = page * safePageSize
  const end = Math.min(start + safePageSize, items.length)
  return { items: items.slice(start, end), page, pageCount, start, end }
}

type OwnerOption = { _id: string; title?: string }

/**
 * The desk's work: every operation except the planner's weekly records.
 *
 * Those are stored as operations so a past week can be looked up, but they are
 * notes about the work, not work — left in, every past week showed here as
 * "Marqueta working" and then as overdue, and the desk's counts disagreed with
 * Slack's, which already skipped them. They live on This week.
 */
export function deskOperations(items: MarketingOperation[]): MarketingOperation[] {
  return (items || []).filter((item) => item && !isWeeklyPlanRecord(item))
}

const cleanName = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const nameKey = (value: unknown) => cleanName(value).toLowerCase()
const firstNameKey = (value: unknown) => nameKey(value).split(' ')[0] || ''

/**
 * The one name in `names` that a website team member's title is, by first
 * name — "Juhan Sonin" is "Juhan" — or '' when none is, or when more than one
 * is (two Erics on the board: guessing would credit the wrong colleague).
 */
function nameForTitle(title: unknown, names: string[]): string {
  const exact = names.find((name) => nameKey(name) === nameKey(title))
  if (exact) return exact
  const first = firstNameKey(title)
  if (!first) return ''
  const matches = names.filter((name) => firstNameKey(name) === first)
  return matches.length === 1 ? matches[0] : ''
}

/**
 * The names the owner select offers, once each whatever the case: the team
 * roster, everyone who already owns something, and everyone the plan has
 * suggested.
 *
 * Names, because the name IS the owner everywhere else. Slack writes
 * `ownerName` when somebody presses "I’ll take it", the check-in and the
 * digest group by it, and `mine` finds work by it. A select bound to a Studio
 * user id showed a task taken in Slack as unassigned.
 *
 * And the ROSTER's names (`roster`, from `marketingTeamAvailability`), not the
 * website's team pages. Those are titled with full names, so offering them
 * put "Juhan" and "Juhan Sonin" side by side, and picking the second split one
 * person into two for every Slack surface: Slack resolves a presser only to a
 * roster name, exactly. A team page's title is used only to find a name here
 * it unambiguously belongs to (see `deskOwnerPatch`).
 *
 * A team member nobody on the board has a name for yet is still offered, by
 * first name — the way the roster, the one-time setup and every Slack surface
 * name people ("Eric", "Jon"). The roster only ever holds people who already
 * linked, and linking was offered only to people who already owned work, so
 * offering team pages only while the roster was empty dropped half the team
 * from this select the day the first person linked: nobody could hand Eric or
 * Jon anything from the Studio. A first name two team pages share is offered
 * as the full title instead — a guess would credit the wrong colleague.
 */
export function deskOwnerOptions(items: MarketingOperation[], owners: OwnerOption[], roster: string[] = []): string[] {
  const seen = new Map<string, string>()
  const add = (value: unknown) => {
    const name = cleanName(value)
    if (name && !seen.has(nameKey(name))) seen.set(nameKey(name), name)
  }
  for (const name of roster || []) add(name)
  for (const item of items || []) {
    add(item?.ownerName)
    add(item?.suggestedOwner)
  }
  const known = [...seen.values()]
  const pagesByFirstName = new Map<string, number>()
  for (const owner of owners || []) {
    const first = firstNameKey(owner?.title)
    if (first) pagesByFirstName.set(first, (pagesByFirstName.get(first) || 0) + 1)
  }
  for (const owner of owners || []) {
    if (nameForTitle(owner?.title, known)) continue
    const unique = pagesByFirstName.get(firstNameKey(owner?.title)) === 1
    add(unique ? cleanName(owner?.title).split(' ')[0] : owner?.title)
  }
  return [...seen.values()].sort((left, right) => left.localeCompare(right))
}

/**
 * The option the select shows for an owner: the offered spelling of their
 * name ("Juhan" for a task that says "juhan"), so a task is never displayed as
 * "Nobody has it" just because of how its owner's name was typed.
 */
export function deskOwnerValue(ownerName: string | undefined, options: string[]): string {
  const key = nameKey(ownerName)
  if (!key) return ''
  return (options || []).find((option) => nameKey(option) === key) || String(ownerName ?? '').trim()
}

/**
 * "Eric passed on this — who should pick it up?": the question the Slack
 * "Not me" leaves, and the one its "I’ll take it" clears (`take` in
 * taskActions.server.ts matches the same phrase).
 */
const PASSED_ON = /passed on this/i

/**
 * What choosing a name writes.
 *
 *   - The name, and the Studio id of the one team member it belongs to (by
 *     title, or unambiguously by first name among `options`); '' clears a
 *     stale id. The operations route also clears the Slack id stamped by the
 *     previous owner's "I’ll take it", so Slack re-resolves the new name
 *     against the roster rather than pinging whoever had it before.
 *   - For a task somebody passed on in Slack, the end of the owner search it
 *     was waiting on: back to not started with the "who should pick it up?"
 *     question cleared — the same write Slack's "I’ll take it" makes. Without
 *     it the desk showed an owner next to "Needs someone", and This week kept
 *     listing a task that already had one.
 */
export function deskOwnerPatch(
  name: string,
  owners: OwnerOption[],
  context: { options?: string[]; item?: Pick<MarketingOperation, 'status' | 'humanQuestion'> } = {},
): MarketingOperationPatch {
  const ownerName = cleanName(name)
  const options = context.options?.length ? context.options : ownerName ? [ownerName] : []
  const members = ownerName ? (owners || []).filter((owner) => nameKey(nameForTitle(owner?.title, options)) === nameKey(ownerName)) : []
  const patch: MarketingOperationPatch = { ownerName, ownerSanityUserId: members.length === 1 ? members[0]._id : '' }
  const item = context.item
  if (ownerName && item?.status === 'needsHuman' && PASSED_ON.test(String(item.humanQuestion ?? ''))) {
    patch.status = 'queued'
    patch.humanQuestion = ''
  }
  return patch
}

type OperationsResponse = {
  items?: MarketingOperation[]
  /** The team roster's names (see the operations route): who Slack knows. */
  team?: string[]
  item?: MarketingOperation
  checked?: number
  mode?: string
  error?: string
}

/**
 * "To do", not "In progress": the group holds work nobody has started as well
 * as work somebody has, and its pills already say which ("Not started", "In
 * progress", "Nobody has it"). Naming the group after one of them made the
 * same words mean two things on one screen.
 */
const GROUP_LABELS: Record<MarketingOperationGroup | 'all', string> = {
  needsHuman: 'Needs a person',
  marketingHandling: 'To do',
  comingUp: 'Coming up',
  history: 'Done / history',
  all: 'All active',
}

/**
 * The words for a status on THIS task — `taskStatusWords`, the function the
 * Slack card uses, so the pill, the select and the card never describe one
 * task two ways ("Nobody has it" rather than "Queued" when nobody does).
 */
function statusWordsFor(item: MarketingOperation, status: MarketingOperationStatus = item.status) {
  return taskStatusWords({ status, kind: item.kind, humanQuestion: item.humanQuestion, ownerName: item.ownerName })
}

/**
 * A status as the status select offers it. The same words as the pill, except
 * that unowned, not-started work is "Not started" here: "Nobody has it" is
 * about the owner, and it already heads the owner select right beside this one.
 */
function statusOptionWords(item: MarketingOperation, status: MarketingOperationStatus) {
  const words = statusWordsFor(item, status)
  return words === 'Nobody has it' ? 'Not started' : words
}

const STATUS_OPTIONS: MarketingOperationStatus[] = [
  'queued',
  'working',
  'needsHuman',
  'waiting',
  'blocked',
  'scheduled',
  'done',
  'dismissed',
]

const styles = {
  panel: {
    border: '1px solid var(--card-border-color)',
    borderRadius: 10,
    padding: 16,
    background: 'var(--card-bg-color)',
  },
  button: {
    minHeight: 44,
    border: '1px solid var(--card-border-color)',
    borderRadius: 7,
    padding: '8px 11px',
    background: 'transparent',
    color: 'var(--card-fg-color)',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 750,
  },
  primaryButton: {
    minHeight: 44,
    border: '1px solid #007385',
    borderRadius: 7,
    padding: '8px 11px',
    background: '#007385',
    color: '#fff',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 800,
  },
  control: {
    width: '100%',
    minHeight: 44,
    border: '1px solid var(--card-border-color)',
    borderRadius: 7,
    padding: '7px 9px',
    background: 'var(--card-bg-color)',
    color: 'var(--card-fg-color)',
    font: 'inherit',
    fontSize: 13,
  },
  small: { fontSize: 12, lineHeight: 1.5, color: 'var(--card-muted-fg-color)' },
} satisfies Record<string, CSSProperties>

function absoluteDate(value?: string) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function relativeDate(value?: string, now = new Date()) {
  if (!value) return ''
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''
  const days = Math.round((time - now.getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days overdue`
}

function dateInputValue(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

function dateFromInput(value: string) {
  return value ? `${value}T17:00:00.000Z` : ''
}

function statusTone(status: MarketingOperationStatus) {
  if (status === 'blocked') return { fg: '#ffb07a', bg: 'rgba(227, 98, 22, 0.12)', border: 'rgba(227, 98, 22, 0.46)' }
  if (status === 'needsHuman') return { fg: '#ffd166', bg: 'rgba(214, 169, 63, 0.12)', border: 'rgba(214, 169, 63, 0.44)' }
  if (status === 'working' || status === 'queued') return { fg: '#7ddbe8', bg: 'rgba(0, 115, 133, 0.12)', border: 'rgba(77, 196, 214, 0.36)' }
  if (status === 'done') return { fg: '#7dd69e', bg: 'rgba(54, 139, 87, 0.12)', border: 'rgba(54, 139, 87, 0.4)' }
  return { fg: 'var(--card-muted-fg-color)', bg: 'rgba(255,255,255,0.035)', border: 'var(--card-border-color)' }
}

function StatusPill({ item }: { item: MarketingOperation }) {
  const tone = statusTone(item.status)
  return (
    <span
      data-operation-status={item.status}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: `1px solid ${tone.border}`,
        borderRadius: 999,
        padding: '3px 8px',
        color: tone.fg,
        background: tone.bg,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{item.status === 'blocked' ? '!' : item.status === 'needsHuman' ? '?' : '•'}</span>
      {statusWordsFor(item)}
    </span>
  )
}

function ItemDetails({ item }: { item: MarketingOperation }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary style={{ minHeight: 30, cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
        Why, evidence, and recent activity
      </summary>
      <div style={{ display: 'grid', gap: 8, marginTop: 8, ...styles.small }}>
        {item.whyNow && <div><strong style={{ color: 'var(--card-fg-color)' }}>Why now: </strong>{item.whyNow}</div>}
        {item.lastOutcome && <div><strong style={{ color: 'var(--card-fg-color)' }}>Latest: </strong>{item.lastOutcome}</div>}
        {item.humanQuestion && <div><strong style={{ color: 'var(--card-fg-color)' }}>Needed from a person: </strong>{item.humanQuestion}</div>}
        {item.humanResponse && <div><strong style={{ color: 'var(--card-fg-color)' }}>Latest team answer: </strong>{item.humanResponse}</div>}
        {item.blocker && <div><strong style={{ color: '#E36216' }}>In the way: </strong>{item.blocker}</div>}
        {(item.evidence || []).length > 0 && (
          <div>
            <strong style={{ color: 'var(--card-fg-color)' }}>Internal CMS matches</strong>
            <ul style={{ margin: '5px 0 0', paddingLeft: 18, display: 'grid', gap: 3 }}>
              {(item.evidence || []).slice(0, 8).map((match) => (
                <li key={match._key}>
                  {match.url ? <a href={match.url} target="_blank" rel="noreferrer">{match.title}</a> : match.title}
                  {(match.matchedTerms || []).length > 0 ? ` — matched ${match.matchedTerms?.slice(0, 4).join(', ')}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(item.activity || []).length > 0 && (
          <div>
            <strong style={{ color: 'var(--card-fg-color)' }}>Recent activity</strong>
            <ul style={{ margin: '5px 0 0', paddingLeft: 18, display: 'grid', gap: 3 }}>
              {(item.activity || []).slice(-4).reverse().map((entry) => (
                <li key={entry._key}>
                  <time dateTime={entry.at}>{absoluteDate(entry.at)}</time> · {entry.action}{entry.outcome ? ` — ${entry.outcome}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}

type MarketingOperationsBoardProps = {
  gaps: MarketingOperationDashboardSignal[]
  owners: OwnerOption[]
  refreshToken: number
  focusOperationId?: string | null
  onOpenView: (view: MarketingOperationTargetView) => void
  onAttentionCountChange?: (count: number) => void
  onOpenGuide?: () => void
}

export function MarketingOperationsBoard(props: MarketingOperationsBoardProps) {
  const studioClient = useClient({ apiVersion: API_VERSION })
  const proofClient = useMemo(() => studioClient.withConfig({ dataset: OUTREACH_DATASET }), [studioClient])
  return <MarketingOperationsBoardContent {...props} proofClient={proofClient} />
}

export function MarketingOperationsBoardContent({
  gaps,
  owners,
  refreshToken,
  focusOperationId,
  onOpenView,
  onAttentionCountChange,
  onOpenGuide,
  proofClient,
  request = authenticatedMarketingRequest,
}: MarketingOperationsBoardProps & {
  proofClient?: Pick<SanityClient, 'create' | 'delete'>
  request?: typeof authenticatedMarketingRequest
}) {
  const [items, setItems] = useState<MarketingOperation[]>([])
  const [roster, setRoster] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set())
  const [filter, setFilter] = useState<MarketingOperationGroup | 'all'>('needsHuman')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [signalPage, setSignalPage] = useState(0)
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const lastFocusedId = useRef('')
  const loadGenerationRef = useRef(0)
  const pendingSaveIdsRef = useRef(new Set<string>())

  const beginSave = useCallback((id: string) => {
    if (pendingSaveIdsRef.current.has(id)) return false
    pendingSaveIdsRef.current.add(id)
    setSavingIds((current) => new Set(current).add(id))
    return true
  }, [])

  const finishSave = useCallback((id: string) => {
    pendingSaveIdsRef.current.delete(id)
    setSavingIds((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }, [])

  const load = useCallback(async (options: { preserveError?: boolean } = {}) => {
    const generation = ++loadGenerationRef.current
    setLoading(true)
    if (!options.preserveError) setError('')
    try {
      const response = await request<OperationsResponse>(
        '/api/marketing/operations',
        undefined,
        'GET',
        proofClient,
      )
      if (generation !== loadGenerationRef.current) return false
      // Before ranking and before any count: a weekly plan record is not work.
      setItems(rankMarketingOperations(deskOperations(response.items || [])))
      setRoster(Array.isArray(response.team) ? response.team : [])
      return true
    } catch (loadError) {
      if (generation !== loadGenerationRef.current) return false
      if (!options.preserveError) {
        setError(loadError instanceof Error ? loadError.message : 'Marketing’s desk could not load.')
      }
      return false
    } finally {
      if (generation === loadGenerationRef.current) setLoading(false)
    }
  }, [proofClient, request])

  useEffect(() => {
    void load()
  }, [load, refreshToken])

  const counts = useMemo(() => getMarketingOperationCounts(items), [items])
  const ownerOptions = useMemo(() => deskOwnerOptions(items, owners, roster), [items, owners, roster])
  useEffect(() => {
    onAttentionCountChange?.(counts.needsHuman)
  }, [counts.needsHuman, onAttentionCountChange])

  useEffect(() => {
    if (!focusOperationId || focusOperationId === lastFocusedId.current || loading) return
    const item = items.find((candidate) => candidate._id === focusOperationId)
    if (!item) return
    const group = marketingOperationGroup(item)
    const desiredFilter = group === 'history' ? 'all' : group
    if (group === 'history' && !historyOpen) {
      setHistoryOpen(true)
      return
    }
    if (filter !== desiredFilter) {
      setFilter(desiredFilter)
      setPage(0)
      return
    }
    const focusableItems = rankMarketingOperations(items).filter((candidate) => {
      const candidateGroup = marketingOperationGroup(candidate)
      return desiredFilter === 'all'
        ? candidateGroup !== 'history' || historyOpen
        : candidateGroup === desiredFilter
    })
    const itemIndex = focusableItems.findIndex((candidate) => candidate._id === focusOperationId)
    const desiredPage = itemIndex < 0 ? 0 : Math.floor(itemIndex / MARKETING_OPERATIONS_PAGE_SIZE)
    if (page !== desiredPage) {
      setPage(desiredPage)
      return
    }
    const matches = Array.from(document.querySelectorAll<HTMLElement>(`[data-operation-focus="${CSS.escape(focusOperationId)}"]`))
    const visible = matches.find((element) => element.offsetParent !== null)
    if (visible) {
      lastFocusedId.current = focusOperationId
      visible.focus()
      visible.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [filter, focusOperationId, historyOpen, items, loading, page])

  const activeItems = useMemo(
    () => rankMarketingOperations(items).filter((item) => {
      const group = marketingOperationGroup(item)
      if (group === 'history' && !historyOpen) return false
      return filter === 'all' ? group !== 'history' || historyOpen : group === filter
    }),
    [filter, historyOpen, items],
  )
  const operationsPage = useMemo(
    () => getMarketingOperationsPage(activeItems, page, MARKETING_OPERATIONS_PAGE_SIZE),
    [activeItems, page],
  )
  const { items: pagedItems, page: safePage, pageCount } = operationsPage
  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  const queuedSignals = useMemo(() => new Map(items.map((item) => [item.sourceKey, item])), [items])
  const availableSignals = useMemo(
    () => gaps
      .map(operationInputFromDashboardSignal)
      .filter((signal) => {
        const existing = queuedSignals.get(signal.sourceKey)
        if (!existing) return true
        return ['done', 'dismissed'].includes(existing.status) && existing.sourceFingerprint !== signal.sourceFingerprint
      }),
    [gaps, queuedSignals],
  )
  const signalsPage = useMemo(
    () => getMarketingOperationsPage(availableSignals, signalPage, MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE),
    [availableSignals, signalPage],
  )
  const { items: pagedSignals, page: safeSignalPage, pageCount: signalPageCount } = signalsPage
  useEffect(() => {
    if (signalPage !== safeSignalPage) setSignalPage(safeSignalPage)
  }, [safeSignalPage, signalPage])

  const updateItem = useCallback(async (item: MarketingOperation, patch: MarketingOperationPatch, note: string) => {
    if (!item._rev) {
      setError('Refresh Marketing’s desk before changing this item.')
      return false
    }
    if (!beginSave(item._id)) return false
    setError('')
    setNotice('')
    try {
      const response = await request<OperationsResponse>(
        '/api/marketing/operations',
        { action: 'update', id: item._id, expectedRevision: item._rev, patch, note },
        'POST',
        proofClient,
      )
      if (!response.item) throw new Error('The updated work item was not returned.')
      loadGenerationRef.current += 1
      setLoading(false)
      setItems((current) => rankMarketingOperations(current.map((candidate) => candidate._id === item._id ? response.item! : candidate)))
      setNotice(`${item.title} updated.`)
      return true
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Marketing’s desk could not save the change.'
      setError(message)
      await load({ preserveError: true })
      setError(message)
      return false
    } finally {
      finishSave(item._id)
    }
  }, [beginSave, finishSave, load, proofClient, request])

  const addSignal = useCallback(async (signal: ReturnType<typeof operationInputFromDashboardSignal>) => {
    const saveId = signal._id || signal.sourceKey
    if (!beginSave(saveId)) return
    setError('')
    setNotice('')
    try {
      const response = await request<OperationsResponse>(
        '/api/marketing/operations',
        { action: 'create', operation: signal },
        'POST',
        proofClient,
      )
      if (!response.item) throw new Error('The queued work item was not returned.')
      loadGenerationRef.current += 1
      setLoading(false)
      setItems((current) => rankMarketingOperations([
        response.item!,
        ...current.filter((item) => item._id !== response.item?._id),
      ]))
      setFilter('marketingHandling')
      setNotice(`${response.item.title} added to the shared queue.`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'The system check could not be queued.')
    } finally {
      finishSave(saveId)
    }
  }, [beginSave, finishSave, proofClient, request])

  const renderOwnerAndDue = (item: MarketingOperation) => (
    <div style={{ display: 'grid', gap: 7 }}>
      <select
        aria-label={`Accountable owner for ${item.title}`}
        style={styles.control}
        value={deskOwnerValue(item.ownerName, ownerOptions)}
        disabled={savingIds.has(item._id)}
        onChange={(event) => {
          const patch = deskOwnerPatch(event.currentTarget.value, owners, { options: ownerOptions, item })
          void updateItem(item, patch, patch.ownerName ? `Assigned to ${patch.ownerName}.` : 'Cleared the accountable owner.')
        }}
      >
        <option value="">Nobody has it</option>
        {ownerOptions.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      <input
        aria-label={`Due date for ${item.title}`}
        type="date"
        style={styles.control}
        value={dateInputValue(item.dueAt)}
        disabled={savingIds.has(item._id)}
        onChange={(event) => void updateItem(
          item,
          { dueAt: dateFromInput(event.currentTarget.value) },
          event.currentTarget.value ? `Due date changed to ${event.currentTarget.value}.` : 'Cleared the due date.',
        )}
      />
      {item.dueAt && (
        <span style={{ ...styles.small, color: marketingOperationIsOverdue(item) ? '#E36216' : undefined }}>
          <time dateTime={item.dueAt}>{absoluteDate(item.dueAt)}</time> · {relativeDate(item.dueAt)}
        </span>
      )}
    </div>
  )

  const renderActions = (item: MarketingOperation) => (
    <div style={{ display: 'grid', gap: 7 }}>
      {item.status === 'blocked' && (
        // Unstuck is the Slack card's Unstuck: back in progress, with what was
        // in the way cleared. The same label never means "go and look at it".
        <button
          type="button"
          style={styles.primaryButton}
          disabled={savingIds.has(item._id)}
          aria-label={`Unstuck ${item.title}`}
          onClick={() => void updateItem(item, { status: 'working', blocker: '' }, 'Unstuck from the desk.')}
        >
          {LABEL.UNSTUCK}
        </button>
      )}
      <button
        type="button"
        data-operation-focus={item._id}
        style={item.status === 'blocked' ? styles.button : styles.primaryButton}
        disabled={savingIds.has(item._id)}
        aria-label={`Open ${item.title} in ${item.targetView}`}
        onClick={() => onOpenView(item.targetView)}
      >
        {item.status === 'needsHuman' ? 'Review and continue' : 'Open work'}
      </button>
      <select
        aria-label={`Status for ${item.title}`}
        style={styles.control}
        value={item.status}
        disabled={savingIds.has(item._id)}
        onChange={(event) => {
          const status = event.currentTarget.value as MarketingOperationStatus
          void updateItem(item, { status }, `Changed status to ${statusOptionWords(item, status)}.`)
        }}
      >
        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusOptionWords(item, status)}</option>)}
      </select>
      {item.status !== 'done' && item.status !== 'dismissed' && (
        <button
          type="button"
          style={styles.button}
          disabled={savingIds.has(item._id)}
          aria-label={`Mark ${item.title} done`}
          onClick={() => void updateItem(item, { status: 'done' }, 'Marked this work complete.')}
        >
          Mark done
        </button>
      )}
    </div>
  )

  const renderHumanAnswer = (item: MarketingOperation) => {
    if (item.status !== 'needsHuman' && item.status !== 'blocked') return null
    const answer = responseDrafts[item._id] || ''
    return (
      <div style={{ display: 'grid', gap: 7, marginTop: 9 }}>
        <label style={{ ...styles.small, fontWeight: 800, color: 'var(--card-fg-color)' }}>
          Team answer
          <textarea
            aria-label={`Answer Marketing for ${item.title}`}
            rows={3}
            maxLength={900}
            style={{ ...styles.control, minHeight: 76, resize: 'vertical', marginTop: 4 }}
            value={answer}
            placeholder="Give the missing fact or decision in your own words."
            disabled={savingIds.has(item._id)}
            onChange={(event) => setResponseDrafts((current) => ({ ...current, [item._id]: event.currentTarget.value }))}
          />
        </label>
        <button
          type="button"
          style={styles.button}
          disabled={answer.trim().length < 2 || savingIds.has(item._id)}
          aria-label={`Save answer for ${item.title} and return it to Marketing`}
          onClick={() => void (async () => {
            const saved = await updateItem(
              item,
              { status: 'queued', humanResponse: answer.trim(), blocker: '' },
              'The team answered the current question and returned the work to Marketing.',
            )
            if (!saved) return
            setResponseDrafts((current) => ({ ...current, [item._id]: '' }))
            onOpenView(item.targetView)
          })()}
        >
          Save answer &amp; continue
        </button>
      </div>
    )
  }

  const emptyMessage = filter === 'needsHuman'
    ? 'You’re clear. Marqueta has no decisions waiting on the team.'
    : items.length === 0
      ? 'No shared work yet. Give Marqueta one rough update and it will build the queue.'
      : `No work in “${GROUP_LABELS[filter]}” right now.`

  return (
    <section
      id="marketing-operations-inbox"
      data-marketing-operations="true"
      style={styles.panel}
      aria-labelledby="marketing-operations-title"
      aria-busy={loading}
    >
      <style>{`
        [data-marketing-ops-mobile="true"] { display: none !important; }
        @media (max-width: 760px) {
          [data-marketing-ops-desktop="true"] { display: none !important; }
          [data-marketing-ops-mobile="true"] { display: grid !important; }
          [data-marketing-ops-filters="true"] { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
          [data-marketing-ops-summary="true"] { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; }
          [data-marketing-operation-signal="true"] { grid-template-columns: minmax(0, 1fr) !important; }
          [data-marketing-operation-signal="true"] button { width: 100%; }
          [data-marketing-operation-card="true"] select,
          [data-marketing-operation-card="true"] input { font-size: 16px !important; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 780 }}>
          <div style={{ ...styles.small, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: '#4dc4d6' }}>
            Shared operating loop
          </div>
          <h2 id="marketing-operations-title" style={{ margin: '5px 0 0', fontSize: 26 }}>Marketing’s desk</h2>
          <p style={{ ...styles.small, margin: '6px 0 0', fontSize: 13 }}>
            Marqueta handles safe internal work, keeps the next move visible, and stops when a person must decide, provide a fact, or approve an external action.
          </p>
          <button
            type="button"
            style={{ ...styles.button, minHeight: 44, border: 0, padding: '8px 0', color: '#4dc4d6' }}
            onClick={() => onOpenView('thisWeek')}
          >
            This week’s plan lives on This week →
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onOpenGuide && <button type="button" style={styles.button} onClick={onOpenGuide}>How this works</button>}
          <button type="button" style={styles.button} disabled={loading} onClick={() => void load()}>
            {loading ? 'Checking…' : 'Refresh desk'}
          </button>
        </div>
      </div>

      <div data-marketing-ops-summary="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginTop: 14 }}>
        {[
          ['Needs you', counts.needsHuman],
          [GROUP_LABELS.marketingHandling, counts.marketingHandling],
          ['Coming up', counts.comingUp],
          ['Overdue', counts.overdue],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10, background: 'rgba(255,255,255,0.025)' }}>
            <strong style={{ display: 'block', fontSize: 20 }}>{value}</strong>
            <span style={styles.small}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ ...styles.small, marginTop: 10 }}>
        Ready for Marqueta when this workspace is open. Shared assignments, dates, blockers, and outcomes persist privately for the team.
      </div>

      <div data-marketing-ops-filters="true" role="group" aria-label="Filter Marketing’s desk" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
        {(['needsHuman', 'marketingHandling', 'comingUp', 'all'] as const).map((group) => {
          const count = group === 'all' ? items.filter((item) => marketingOperationGroup(item) !== 'history').length : counts[group]
          const active = filter === group
          return (
            <button
              key={group}
              type="button"
              aria-pressed={active}
              style={{
                ...styles.button,
                borderColor: active ? '#007385' : 'var(--card-border-color)',
                background: active ? 'rgba(0, 115, 133, 0.16)' : 'transparent',
              }}
              onClick={() => {
                setFilter(group)
                setPage(0)
              }}
            >
              {GROUP_LABELS[group]} ({count})
            </button>
          )
        })}
        <button
          type="button"
          aria-pressed={historyOpen}
          style={styles.button}
          onClick={() => {
            const opening = !historyOpen
            setHistoryOpen(opening)
            setPage(0)
            if (opening) setFilter('all')
          }}
        >
          {historyOpen ? 'Hide history' : `Done / history (${counts.history})`}
        </button>
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" style={{ ...styles.small, minHeight: 18, marginTop: 8, color: notice ? '#7dd69e' : undefined }}>
        {notice || (loading ? 'Checking the private shared queue…' : '')}
      </div>
      {error && (
        <div role="alert" style={{ marginTop: 8, border: '1px solid rgba(227, 98, 22, 0.45)', borderRadius: 8, padding: 10, background: 'rgba(227, 98, 22, 0.08)', ...styles.small }}>
          <strong style={{ color: 'var(--card-fg-color)' }}>Marketing’s desk needs attention. </strong>{error}
          <div style={{ marginTop: 4 }}>Nothing was assumed saved. Retry below; if access keeps failing, confirm that you have an Editor, Developer, or Administrator role.</div>
          <button type="button" style={{ ...styles.button, marginTop: 8 }} disabled={loading} onClick={() => void load()}>
            {loading ? 'Retrying…' : 'Retry loading the desk'}
          </button>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div style={{ marginTop: 10, border: '1px dashed var(--card-border-color)', borderRadius: 8, padding: 14, ...styles.small }}>
          Loading the private shared queue…
        </div>
      ) : error && items.length === 0 ? null : activeItems.length === 0 ? (
        <div style={{ marginTop: 10, border: '1px dashed var(--card-border-color)', borderRadius: 8, padding: 14, ...styles.small }}>
          {emptyMessage}
        </div>
      ) : (
        <>
          <div
            data-marketing-ops-desktop="true"
            style={{ overflowX: 'auto', marginTop: 10 }}
            role="region"
            aria-label="Scrollable Marketing Operations table"
            tabIndex={0}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
              <caption style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Shared Marketing Operations work, owners, dates, and next actions
              </caption>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--card-border-color)' }}>
                  <th scope="col" style={{ width: '14%', padding: '9px 8px' }}>Status</th>
                  <th scope="col" style={{ width: '33%', padding: '9px 8px' }}>Work / why now</th>
                  <th scope="col" style={{ width: '22%', padding: '9px 8px' }}>Next move</th>
                  <th scope="col" style={{ width: '17%', padding: '9px 8px' }}>Owner / due</th>
                  <th scope="col" style={{ width: '14%', padding: '9px 8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top' }}>
                    <td style={{ padding: '12px 8px' }}><StatusPill item={item} /><div style={{ ...styles.small, marginTop: 5, textTransform: 'capitalize' }}>{item.priority}</div></td>
                    <td style={{ padding: '12px 8px', overflowWrap: 'anywhere' }}>
                      <strong style={{ display: 'block' }}>{item.title}</strong>
                      {item.summary && <div style={{ ...styles.small, marginTop: 4 }}>{item.summary}</div>}
                      <ItemDetails item={item} />
                    </td>
                    <td style={{ padding: '12px 8px', ...styles.small }}>
                      <strong style={{ color: 'var(--card-fg-color)' }}>{item.nextAction}</strong>
                      {item.humanQuestion && <div style={{ marginTop: 6 }}>Needs: {item.humanQuestion}</div>}
                      {renderHumanAnswer(item)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{renderOwnerAndDue(item)}</td>
                    <td style={{ padding: '12px 8px' }}>{renderActions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div data-marketing-ops-mobile="true" style={{ gap: 10, marginTop: 10 }}>
            {pagedItems.map((item) => (
              <article key={item._id} data-marketing-operation-card="true" style={{ border: `1px solid ${statusTone(item.status).border}`, borderRadius: 9, padding: 12, display: 'grid', gap: 10, background: statusTone(item.status).bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <StatusPill item={item} />
                  <span style={{ ...styles.small, textTransform: 'capitalize', fontWeight: 800 }}>{item.priority}</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{item.title}</h3>
                  {item.summary && <div style={{ ...styles.small, marginTop: 5 }}>{item.summary}</div>}
                </div>
                <div style={styles.small}><strong style={{ color: 'var(--card-fg-color)' }}>Next move: </strong>{item.nextAction}</div>
                {renderHumanAnswer(item)}
                {renderOwnerAndDue(item)}
                {renderActions(item)}
                <ItemDetails item={item} />
              </article>
            ))}
          </div>
          {activeItems.length > MARKETING_OPERATIONS_PAGE_SIZE && (
            <div
              data-marketing-operations-pagination="true"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}
            >
              <span style={styles.small}>
                Showing {safePage * MARKETING_OPERATIONS_PAGE_SIZE + 1}–{Math.min((safePage + 1) * MARKETING_OPERATIONS_PAGE_SIZE, activeItems.length)} of {activeItems.length}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={styles.button} disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                  Previous
                </button>
                <button type="button" style={styles.button} disabled={safePage >= pageCount - 1} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {availableSignals.length > 0 && (
        <details style={{ marginTop: 14, borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
          <summary style={{ minHeight: 36, cursor: 'pointer', fontWeight: 800 }}>
            System checks ready to queue ({availableSignals.length})
          </summary>
          <p style={{ ...styles.small, margin: '4px 0 10px' }}>
            These are live recommendations, not assignments. Add one only when the team wants Marqueta to own the follow-through.
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {pagedSignals.map((signal) => (
              <div key={signal.sourceKey} data-marketing-operation-signal="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 10 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 13 }}>{signal.title}</strong>
                  <span style={styles.small}>{signal.whyNow || signal.summary}</span>
                </div>
                <button
                  type="button"
                  style={styles.button}
                  disabled={savingIds.has(signal._id || signal.sourceKey)}
                  aria-label={`Add ${signal.title} to Marketing’s desk`}
                  onClick={() => void addSignal(signal)}
                >
                  Add to desk
                </button>
              </div>
            ))}
            {availableSignals.length > MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={styles.small}>
                  Showing {safeSignalPage * MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE + 1}–{Math.min((safeSignalPage + 1) * MARKETING_OPERATIONS_SIGNAL_PAGE_SIZE, availableSignals.length)} of {availableSignals.length}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" style={styles.button} disabled={safeSignalPage === 0} onClick={() => setSignalPage((current) => Math.max(0, current - 1))}>
                    Previous checks
                  </button>
                  <button type="button" style={styles.button} disabled={safeSignalPage >= signalPageCount - 1} onClick={() => setSignalPage((current) => Math.min(signalPageCount - 1, current + 1))}>
                    Next checks
                  </button>
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      <div style={{ marginTop: 14, border: '1px solid rgba(77, 196, 214, 0.3)', borderRadius: 8, padding: 10, background: 'rgba(0, 115, 133, 0.07)', ...styles.small }}>
        <strong style={{ color: 'var(--card-fg-color)' }}>Where Marqueta stops: </strong>
        It may inspect shared records, organize work, and prepare private drafts. Publishing, outreach, paid research, claim approval, deletion, and brand-voice changes always wait for a person.
      </div>
    </section>
  )
}
