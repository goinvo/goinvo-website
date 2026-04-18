'use client'

/**
 * Loads the unmodified Gatsby microsite scripts that render the
 * D3 charts on this page. We vendor the original files (jQuery
 * is globally present via the Studio/dev bundle; we only load
 * D3 v3 + sankey plugin + each chart script) under
 * /public/features/us-healthcare/ so the scripts can fetch their
 * CSV/JSON data at the exact paths they hard-code.
 *
 * The scripts are jQuery-document-ready patterns — once injected
 * they look for their #id DOM targets and draw. Every target
 * (#spending-capita-chart, #gdp-vs-capita-chart,
 * #quality-vs-capita-chart, #waste-chart, #cost-comparison-boston-chart,
 * #sankey-chart) must already be in the DOM before this mounts.
 */

import Script from 'next/script'

const BASE = '/features/us-healthcare/js'

// Stylesheet the Gatsby microsite uses alongside these scripts.
// Loaded once at the top of the article body in UsHealthcareContent.

export function VerbatimChartScripts() {
  return (
    <>
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
    </>
  )
}
