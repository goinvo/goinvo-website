'use client'

/**
 * Loads the unmodified Gatsby microsite scripts that render the
 * D3 charts on this page. We vendor the original files under
 * /public/features/us-healthcare/ so the scripts can fetch their
 * CSV/JSON data at the exact paths they hard-code.
 *
 * The scripts are jQuery-document-ready patterns — once injected
 * they look for their #id DOM targets and draw. Every target
 * (#spending-capita-chart, #gdp-vs-capita-chart,
 * #quality-vs-capita-chart, #waste-chart, #cost-comparison-boston-chart,
 * #sankey-chart, #health-history) must already be in the DOM.
 *
 * Also boots Knight Lab TimelineJS against our vendored JSON
 * (data/timeline.json) for the "History of US Healthcare" timeline.
 */

import Script from 'next/script'

const BASE = '/features/us-healthcare/js'
const KNIGHTLAB_TIMELINE = 'https://cdn.knightlab.com/libs/timeline3/latest'

declare global {
  interface Window {
    TL?: { Timeline: new (id: string, source: string, opts: unknown) => unknown }
    __heal_timeline_init?: boolean
  }
}

export function VerbatimChartScripts() {
  return (
    <>
      {/* Knight Lab TimelineJS stylesheet (loaded globally by next/head) */}
      <link
        rel="stylesheet"
        href={`${KNIGHTLAB_TIMELINE}/css/timeline.css`}
      />
      <Script
        src="https://code.jquery.com/jquery-3.6.0.min.js"
        strategy="beforeInteractive"
      />
      <Script src={`${BASE}/d3.min.js`} strategy="beforeInteractive" />
      <Script src={`${BASE}/d3-sankey.js`} strategy="beforeInteractive" />
      {/* Chart scripts run their own $(document).ready bodies. Load them
          after interactive so the target divs exist by the time each
          callback fires. */}
      <Script src={`${BASE}/spending.js`} strategy="afterInteractive" />
      <Script src={`${BASE}/gdpvcapita.js`} strategy="afterInteractive" />
      <Script src={`${BASE}/qualityvcapita.js`} strategy="afterInteractive" />
      <Script src={`${BASE}/waste.js`} strategy="afterInteractive" />
      <Script src={`${BASE}/cost_comparison_boston.js`} strategy="afterInteractive" />
      <Script src={`${BASE}/sankey.js`} strategy="afterInteractive" />
      {/* Knight Lab TimelineJS — init once ready. Matches the
          legacy Gatsby options (full-width, 600px tall). */}
      <Script
        src={`${KNIGHTLAB_TIMELINE}/js/timeline.js`}
        strategy="afterInteractive"
        onReady={() => {
          if (typeof window === 'undefined' || !window.TL) return
          if (window.__heal_timeline_init) return
          const target = document.getElementById('health-history')
          if (!target) return
          window.__heal_timeline_init = true
          new window.TL.Timeline(
            'health-history',
            '/features/us-healthcare/data/timeline.json',
            { width: '100%', height: '600' },
          )
        }}
      />
    </>
  )
}
