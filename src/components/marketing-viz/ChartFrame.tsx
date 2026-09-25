'use client'

import { useId, useState, type ReactNode } from 'react'

export type TableView = {
  caption?: string
  columns: string[]
  rows: Array<Array<string | number>>
  /** Columns (by index) that hold numbers: right-aligned, tabular figures. */
  numeric?: number[]
}

/**
 * The container every chart sits in: a title that names what is plotted, one
 * sentence that says what to DO about it, the chart, and a "Show as table"
 * twin that holds every value (the accessible equivalent, and the place a
 * value lives when its label did not fit on the mark).
 *
 * `data-viz-frame` is the positioning context the tooltip measures against.
 */
export function ChartFrame({
  title,
  insight,
  children,
  table,
  aside,
  compact = false,
}: {
  title: string
  insight?: ReactNode
  children: ReactNode
  table?: TableView
  aside?: ReactNode
  compact?: boolean
}) {
  const [showTable, setShowTable] = useState(false)
  const tableId = useId()
  return (
    <figure data-viz-frame style={{ position: 'relative', margin: 0, minWidth: 0 }}>
      <figcaption style={{ marginBottom: compact ? 6 : 12 }}>
        <span style={{ display: 'flex', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ minWidth: 0, fontSize: compact ? 13 : 14, fontWeight: 650, color: 'var(--viz-ink)' }}>
            {title}
          </span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '0 0 auto' }}>
            {aside}
            {table ? (
              <button
                type="button"
                aria-expanded={showTable}
                aria-controls={tableId}
                onClick={() => setShowTable((value) => !value)}
                style={{
                  font: 'inherit',
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--viz-border)',
                  background: 'transparent',
                  color: 'var(--viz-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {showTable ? 'Show chart' : 'Show as table'}
              </button>
            ) : null}
          </span>
        </span>
        {insight ? (
          <span
            style={{
              display: 'block',
              marginTop: 3,
              maxWidth: 720,
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--viz-secondary)',
            }}
          >
            {insight}
          </span>
        ) : null}
      </figcaption>
      <div hidden={showTable}>{children}</div>
      {table && showTable ? <DataTable id={tableId} table={table} /> : null}
    </figure>
  )
}

export function DataTable({ table, id }: { table: TableView; id?: string }) {
  const numeric = new Set(table.numeric ?? [])
  const cell = { padding: '6px 10px', borderBottom: '1px solid var(--viz-grid)', fontSize: 13 } as const
  return (
    <div id={id} style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        {table.caption ? (
          <caption style={{ textAlign: 'left', fontSize: 12, color: 'var(--viz-muted)', paddingBottom: 6 }}>
            {table.caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            {table.columns.map((column, index) => (
              <th
                key={column}
                scope="col"
                style={{
                  ...cell,
                  textAlign: numeric.has(index) ? 'right' : 'left',
                  color: 'var(--viz-secondary)',
                  fontWeight: 600,
                  borderBottomColor: 'var(--viz-baseline)',
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r}>
              {row.map((value, c) => (
                <td
                  key={c}
                  style={{
                    ...cell,
                    textAlign: numeric.has(c) ? 'right' : 'left',
                    fontVariantNumeric: numeric.has(c) ? 'tabular-nums' : undefined,
                  }}
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A legend entry: the mark's own shape beside ink-coloured text. */
export function LegendItem({
  color,
  label,
  shape = 'rect',
  value,
}: {
  color: string
  label: string
  shape?: 'rect' | 'line' | 'dot' | 'track' | 'diamond'
  value?: string
}) {
  const swatch =
    shape === 'line'
      ? { width: 12, height: 2, borderRadius: 1 }
      : shape === 'dot'
        ? { width: 8, height: 8, borderRadius: 999 }
        : shape === 'diamond'
          ? { width: 8, height: 8, borderRadius: 1, transform: 'rotate(45deg)' }
          : { width: 10, height: 10, borderRadius: 2 }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--viz-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          ...swatch,
          background: color,
          boxShadow: shape === 'track' ? 'inset 0 0 0 1px var(--viz-baseline)' : undefined,
          flex: '0 0 auto',
        }}
      />
      {label}
      {value ? <strong style={{ color: 'var(--viz-ink)', fontWeight: 600 }}>{value}</strong> : null}
    </span>
  )
}

export function Legend({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>{children}</div>
}
