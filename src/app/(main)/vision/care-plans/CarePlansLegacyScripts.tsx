'use client'

import { useEffect } from 'react'

/**
 * Re-activates the two legacy jQuery scripts that power the Part 1 article's
 * interactivity.
 *
 * In the original Involution Studios microsite these were loaded via `<script>`
 * tags embedded in the article HTML. Because that HTML is injected with
 * `dangerouslySetInnerHTML`, the browser never executes those embedded tags
 * (a long-standing innerHTML behavior), so the features were dead after the
 * Next.js port. We load jQuery once and then run the unmodified scripts
 * (served verbatim from `/public/javascripts`) after the legacy markup is in
 * the DOM. This mirrors the `VerbatimChartScripts` approach already used on
 * the healing-us-healthcare page.
 *
 *   - case_studies.js → "History of care planning" timeline popups (click a
 *     discipline span → positioned popup box). Self-contained DOM/CSS.
 *   - checkboxes.js   → interactive care-plan diagram (pick a patient persona +
 *     check health concerns → the plan adapts, persona image swaps). Its data +
 *     images were missing after the migration and have been recovered from the
 *     public `goinvo/goinvo.com-2018-old-features` repo into `public/`
 *     (`/features/careplans/data/conditions.json` + the `*_norm`/`*_obese`
 *     persona images). The script's hard-coded `/old/images/...` prefix was
 *     repointed to `/images/...` (the path this site serves) in checkboxes.js.
 */

const JQUERY_SRC = 'https://code.jquery.com/jquery-3.6.0.min.js'
const JS = '/javascripts/features/careplans'

type LegacyCarePlansPage = 'overview' | 'part1' | 'part2' | 'part3'

// Per-page legacy scripts (all require jQuery, loaded first; order between them
// is not significant). svg.js inlines the `img.svg` icons/arrows on every page
// (without it they render as raw, oversized images).
const SCRIPTS_BY_PAGE: Record<LegacyCarePlansPage, string[]> = {
  overview: [`${JS}/svg.js`],
  part1: [`${JS}/svg.js`, `${JS}/case_studies.js`, `${JS}/checkboxes.js`],
  // careplanII.js: barriers-carousel circle swap, score bars, circle7 +
  // coming-soon sizing (its Bootstrap .popover() call is guarded — popovers
  // are handled by CarePlansPopovers).
  part2: [`${JS}/svg.js`, `${JS}/case_studies.js`, `${JS}/careplanII.js`],
  // careplanIII.js: the 8-step "featureIII" circle progress nav (scroll-spy).
  part3: [`${JS}/svg.js`, `${JS}/careplanIII.js`],
}

declare global {
  interface Window {
    jQuery?: unknown
    __carePlansLegacyScriptsLoaded?: boolean
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-careplans-src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    // Preserve insertion order for dynamically added scripts.
    script.async = false
    script.dataset.careplansSrc = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

export function CarePlansLegacyScripts({
  page,
}: {
  page: LegacyCarePlansPage
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // The legacy scripts bind global, non-teardownable event handlers (clicks,
    // scroll, resize). Loading them more than once would double-bind and, e.g.,
    // toggle popups twice per click — so we guard against re-entry.
    if (window.__carePlansLegacyScriptsLoaded) return
    if (!document.querySelector('.legacy-careplans')) return
    window.__carePlansLegacyScriptsLoaded = true

    async function boot() {
      if (!window.jQuery) {
        await loadScript(JQUERY_SRC)
      }
      for (const src of SCRIPTS_BY_PAGE[page]) {
        await loadScript(src)
      }
    }

    boot().catch((err) => {
      // Allow a later mount to retry if the load failed (e.g. CDN blocked).
      window.__carePlansLegacyScriptsLoaded = false
      console.error('[care-plans] failed to load legacy scripts', err)
    })
  }, [page])

  return null
}
