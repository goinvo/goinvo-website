'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ExperimentExposure } from '@/components/analytics/ExperimentExposure'

/**
 * Presence/absence A/B gate for the "bring GoInvo home" section (experiment
 * `home-shop-section`, flag `home-shop-section-variant`).
 *
 * The section is server-rendered by default, so it — and its anchor — exist
 * without JS and for every visitor who is NOT in the experiment. When the
 * experiment is live, the edge (src/proxy.ts) writes a JS-readable variant
 * cookie; this reads it after hydration and, for the "absent" cohort, removes
 * the section. Either way it fires the exposure + per-variant engagement beacon
 * so we can see whether the section repels visitors or helps them.
 *
 * Keep the id/flag/variant literals in sync with homeShopSectionExperiment in
 * lib/experiments/registry and homeShopSectionVariant in flags.ts.
 */

const EXPERIMENT_ID = 'home-shop-section'
const FLAG_KEY = 'home-shop-section-variant'
const ALLOWED_VARIANTS = ['control', 'present']

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

export function ShopSectionGate({ children }: { children: ReactNode }) {
  // null until the cookie is read. Initial (SSR + first client) render shows the
  // section, matching the server HTML, so there is no hydration mismatch; the
  // "absent" cohort loses it one tick later, below the fold.
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    const value = readCookie(FLAG_KEY)
    setVariant(value && ALLOWED_VARIANTS.includes(value) ? value : '')
  }, [])

  const inExperiment = variant === 'control' || variant === 'present'
  // 'control' is the baseline homepage with no section.
  const hidden = variant === 'control'

  return (
    <>
      {inExperiment && (
        <ExperimentExposure
          experiment={{
            experiment_id: EXPERIMENT_ID,
            flag_key: FLAG_KEY,
            variant: variant as string,
            page_path: '/',
          }}
        />
      )}
      {!hidden && children}
    </>
  )
}
