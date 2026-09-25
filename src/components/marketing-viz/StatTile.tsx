'use client'

import type { ReactNode } from 'react'

import { Sparkline, type SparkPoint } from './Sparkline'

export type StatusLevel = 'good' | 'warning' | 'serious' | 'critical'

const STATUS_ICON: Record<StatusLevel, string> = { good: '✓', warning: '!', serious: '!', critical: '×' }

/**
 * label · value · delta · trend — the figure contract. The value is the chart.
 * A status (if any) is an icon + word beside it, never colour alone, and the
 * delta says what it is compared with.
 */
export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaTone = 'neutral',
  detail,
  trend,
  trendUnit,
  status,
  statusLabel,
  children,
}: {
  label: string
  value: string
  unit?: string
  delta?: string
  /** Whether the delta is good news, bad news, or neither — not its sign. */
  deltaTone?: 'good' | 'bad' | 'neutral'
  detail?: ReactNode
  trend?: SparkPoint[]
  trendUnit?: string
  status?: StatusLevel
  statusLabel?: string
  children?: ReactNode
}) {
  const deltaColor =
    deltaTone === 'good'
      ? 'var(--viz-delta-good, var(--viz-secondary))'
      : deltaTone === 'bad'
        ? 'var(--viz-ink)'
        : 'var(--viz-secondary)'
  return (
    <div
      style={{
        minWidth: 0,
        padding: '14px 16px',
        borderRadius: 8,
        border: '1px solid var(--viz-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--viz-secondary)' }}>{label}</div>
      <div
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px 10px', flexWrap: 'wrap' }}
      >
        <div style={{ lineHeight: 1 }}>
          <span style={{ fontSize: /\d/.test(value) ? 30 : 22, fontWeight: 650, letterSpacing: -0.5, color: 'var(--viz-ink)' }}>{value}</span>
          {unit ? <span style={{ fontSize: 14, marginLeft: 4, color: 'var(--viz-secondary)' }}>{unit}</span> : null}
        </div>
        {/* The status sits beside the figure it qualifies, not in the label row, where it squeezed the label. */}
        {status ? (
          <span style={{ paddingBottom: 3 }}>
            <StatusChip level={status} label={statusLabel ?? status} />
          </span>
        ) : null}
        {trend && trend.length > 1 ? <Sparkline points={trend} unit={trendUnit} /> : null}
      </div>
      {delta ? (
        <div style={{ fontSize: 12, color: deltaColor, fontWeight: deltaTone === 'neutral' ? 400 : 600 }}>{delta}</div>
      ) : null}
      {detail ? <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--viz-muted)' }}>{detail}</div> : null}
      {children}
    </div>
  )
}

export function StatusChip({ level, label }: { level: StatusLevel; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 12,
        color: 'var(--viz-ink)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: `var(--viz-${level})`,
          color: level === 'warning' ? '#1d1b1a' : '#ffffff',
          fontSize: 10,
          fontWeight: 800,
          display: 'inline-grid',
          placeItems: 'center',
          lineHeight: 1,
        }}
      >
        {STATUS_ICON[level]}
      </span>
      {label}
    </span>
  )
}
