// Shared UI primitives, the `styles` object, and helpers that remain owned by
// the marketing tool (used across all workspaces) are imported back from it.
// This is a deliberate circular import: the tool imports
// MarketingAttentionWorkspace only for JSX rendering, and this file touches the
// tool exports only at runtime (inside the component body), so no binding is
// read before it is initialized.
import {
  EmptyInline,
  getDashboardGapTone,
  getMarketingViewTitle,
  styles,
  type MarketingAttentionItem,
  type MarketingViewOpener,
} from '../../tools/marketingTool'

interface MarketingAttentionWorkspaceProps {
  items: MarketingAttentionItem[]
  onOpenView: MarketingViewOpener
}

export function MarketingAttentionWorkspace({
  items,
  onOpenView,
}: MarketingAttentionWorkspaceProps) {
  const severitySummary: Array<{ severity: MarketingAttentionItem['severity']; label: string }> = [
    { severity: 'content', label: 'Content tasks' },
    { severity: 'measurement', label: 'Measurement tasks' },
    { severity: 'setup', label: 'Setup tasks' },
  ]

  return (
    <section style={{ display: 'grid', gap: 16 }}>
      <div style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={styles.kicker}>Needs attention</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>What is blocking easy content work?</h2>
            <p style={{ ...styles.subtitle, marginTop: 8 }}>
              These are the places where a designer would otherwise have to stop and ask what to do next.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {severitySummary.map(({ severity, label }) => {
              const count = items.filter((item) => item.severity === severity).length
              const tone = getDashboardGapTone(severity)
              return (
                <span
                  key={severity}
                  style={{
                    border: `1px solid ${tone.border}`,
                    background: tone.bg,
                    color: tone.fg,
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {count} {label}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyInline title="Nothing needs attention right now." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => {
            const tone = getDashboardGapTone(item.severity)
            return (
              <article
                key={item.id}
                style={{
                  ...styles.card,
                  borderColor: tone.border,
                  background: tone.bg,
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ ...styles.small, color: tone.fg, fontWeight: 800, textTransform: 'capitalize', marginBottom: 4 }}>
                      {item.severity}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 17 }}>{item.title}</h3>
                    <p style={{ ...styles.small, ...styles.muted, margin: '6px 0 0' }}>{item.detail}</p>
                  </div>
                  <button type="button" style={styles.button} onClick={() => onOpenView(item.view)}>
                    Open {getMarketingViewTitle(item.view)}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
