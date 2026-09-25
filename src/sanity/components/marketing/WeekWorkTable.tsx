import { formatMinutes } from '../../../lib/marketing/effort'
import { GLANCE_SLOTS } from '../../../lib/marketing/viz/weekGlance'
import { taskStatusWords } from '../../../lib/marketing/weeklyCheckIn'

/**
 * This week's planned work as a table — no Sanity imports, so it renders the
 * same in the Studio, in a harness, and in a static preview.
 */

export type WorkRow = {
  id: string
  title: string
  kind: string
  minutes: number
  owner: string | null
  status?: string
  blocker?: string | null
  overdue?: boolean
  estimateSource?: string
  question?: string | null
}

/** What the columns are read from: a planned row, a decision, or anything shaped like one. */
export type WorkColumnInput = {
  owner?: string | null
  status?: string
  kind?: string
  minutes: number
  estimateSource?: string
  question?: string | null
}

/**
 * The work as a table: one line per task, columns that line up, and a bar in
 * the time cell so the week's hours read down the right edge. On a phone the
 * row folds to the title over its details.
 */
const WEEK_TABLE_CSS = `
  [data-week-table] { display: grid; font-size: 13px; }
  [data-week-row] {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) 96px minmax(56px, 110px) minmax(72px, 140px) 96px;
    gap: 10px;
    align-items: center;
    padding: 7px 0;
    border-top: 1px solid var(--card-border-color);
  }
  [data-week-row="head"] { border-top: 0; padding-top: 0; font-size: 11px; color: var(--card-muted-fg-color); text-transform: uppercase; letter-spacing: .04em; }
  [data-week-row] [data-muted] { color: var(--card-muted-fg-color); }
  [data-week-row] [data-title] { min-width: 0; }
  [data-week-row] [data-kind] { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12px; }
  [data-week-row] [data-num] { display: flex; align-items: center; justify-content: flex-end; gap: 8px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  [data-week-row] [data-bar] { width: 36px; height: 6px; border-radius: 3px; background: var(--viz-track); overflow: hidden; display: inline-flex; }
  [data-week-row] [data-bar] > span { height: 100%; border-radius: 3px; }
  @media (max-width: 720px) {
    /* A phone gets two lines per task: the title and its time, then kind · who · status. */
    [data-week-row] { display: flex; flex-wrap: wrap; column-gap: 8px; row-gap: 2px; }
    [data-week-row="head"] { display: none; }
    [data-week-row] > :nth-child(1) { width: 22px; }
    [data-week-row] > :nth-child(2) { flex: 1 1 calc(100% - 150px); }
    [data-week-row] > :nth-child(6) { order: 2; }
    [data-week-row] > :nth-child(3) { order: 3; margin-left: 30px; }
    [data-week-row] > :nth-child(n+3):nth-child(-n+5) { font-size: 12px; }
    [data-week-row] > :nth-child(4), [data-week-row] > :nth-child(5) { order: 4; }
    [data-week-row] > :nth-child(3)::after, [data-week-row] > :nth-child(4)::after { content: '·'; margin-left: 8px; color: var(--card-muted-fg-color); }
    [data-week-row] > :nth-child(3) { flex-basis: auto; }
    [data-week-row] > [data-empty] { display: none; }
    [data-week-row] > :nth-child(4):has(+ [data-empty])::after { content: none; }
  }
`

/**
 * A task's kind wears the same colour as its share of the hours in the meter
 * above (weekGlance's fixed slots), so "outreach" is one colour everywhere on
 * the page — the dot carries it, the word stays ink.
 */
function kindSlot(kind: string): number {
  if (kind === 'outreach') return GLANCE_SLOTS.outreach
  if (kind === 'decision') return GLANCE_SLOTS.decisions
  return GLANCE_SLOTS.other
}

/** "overdue", said with a status mark rather than red text alone. */
function OverdueMark({ label = 'overdue' }: { label?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        fontWeight: 600,
        marginLeft: 8,
        color: 'var(--card-fg-color)',
      }}
    >
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--viz-serious)' }} />
      {label}
    </span>
  )
}

const SAYS_NOBODY = new Set(['Nobody has it', 'Marqueta working', 'Needs someone'])

export function workColumns(
  row: WorkColumnInput,
): {
  who: string
  status: string
  time: string
} {
  const owner = String(row.owner ?? '').trim()
  const words = taskStatusWords({
    status: row.status,
    kind: row.kind,
    humanQuestion: row.question || undefined,
    ownerName: owner,
  })
  // "Not started" says nothing a list of planned work does not; everything else does.
  const status = words === 'Not started' ? '' : words
  const who = owner || (SAYS_NOBODY.has(status) ? '' : 'Nobody has it')
  const time =
    row.minutes > 0 ? `${formatMinutes(row.minutes)}${row.estimateSource === 'estimated' ? ' (est.)' : ''}` : ''
  return { who, status, time }
}

export function workMeta(
  row: WorkColumnInput,
): string {
  const { who, status, time } = workColumns(row)
  return [who, status, time].filter(Boolean).join(' · ')
}

export function WeekWorkTable({ rows }: { rows: WorkRow[] }) {
  const longest = rows.reduce((max, row) => Math.max(max, row.minutes || 0), 0)
  return (
    <div data-week-table role="table" aria-label="The work, in the order to do it">
      <style>{WEEK_TABLE_CSS}</style>
      <div role="row" data-week-row="head">
        <span role="columnheader">#</span>
        <span role="columnheader">Task</span>
        <span role="columnheader">For</span>
        <span role="columnheader">Who</span>
        <span role="columnheader">Status</span>
        <span role="columnheader" data-num>
          Time
        </span>
      </div>
      {rows.map((item, index) => {
        const columns = workColumns(item)
        // "Nobody has it" answers WHO, so it sits in that column, in ink.
        const unowned = !columns.who && SAYS_NOBODY.has(columns.status)
        const who = unowned ? columns.status : columns.who
        const status = unowned ? '' : columns.status
        const time = columns.time
        const loud = who === 'Nobody has it' || unowned
        const share = longest > 0 ? Math.max(0.04, item.minutes / longest) : 0
        return (
          <div role="row" key={item.id} data-week-row>
            <span role="cell" data-muted>
              {index + 1}
            </span>
            <span role="cell" data-title>
              <strong>{item.title}</strong>
              {item.overdue && <OverdueMark />}
            </span>
            <span role="cell" data-kind>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  flex: '0 0 auto',
                  background: `var(--viz-series-${kindSlot(item.kind) + 1})`,
                }}
              />
              {item.kind}
            </span>
            <span role="cell" data-muted={loud ? undefined : ''} style={loud ? { fontWeight: 600 } : undefined}>
              {who}
            </span>
            <span role="cell" data-muted data-empty={status ? undefined : ''}>
              {status || '—'}
            </span>
            <span role="cell" data-num>
              {/* A bar in the cell: where the week's hours go, task by task. */}
              <span aria-hidden data-bar>
                <span
                  style={{
                    width: `${Math.round(share * 100)}%`,
                    background: `var(--viz-series-${kindSlot(item.kind) + 1})`,
                  }}
                />
              </span>
              {time}
            </span>
          </div>
        )
      })}
    </div>
  )
}
