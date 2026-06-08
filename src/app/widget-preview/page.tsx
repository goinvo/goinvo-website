import { IpsosWorkflowWidget } from '@/components/portable-text/IpsosWorkflowWidget'

// Local-only preview page for visually checking the Ipsos workflow widget
// against its design reference. Not linked anywhere; safe to delete.
export const metadata = { title: 'Ipsos Workflow Widget — preview' }

export default function WidgetPreviewPage() {
  return (
    <main style={{ padding: '48px 0', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 24px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Ipsos Workflow Widget — local preview</h1>
        <p style={{ color: '#6a6560', marginTop: 4 }}>
          Toggle Overview / Detailed stages and open the Legend to compare against the reference table.
        </p>
      </div>
      <IpsosWorkflowWidget />
    </main>
  )
}
