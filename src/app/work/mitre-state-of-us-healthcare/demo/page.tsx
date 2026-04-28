import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open Health Dashboard Demo',
  description:
    'Interactive Open Health Dashboard demo for the MITRE State of U.S. Healthcare case study.',
}

export default function OpenHealthDashboardDemoPage() {
  return (
    <main style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: '#071c2c' }}>
      <iframe
        src="/demos/open-health-dashboard/index.html"
        title="Open Health Dashboard demo"
        style={{ display: 'block', height: '100%', width: '100%', border: 0 }}
      />
    </main>
  )
}
