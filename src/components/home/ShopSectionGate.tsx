'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { ExperimentExposure } from '@/components/analytics/ExperimentExposure'

/**
 * Presence/absence A/B gate for the "bring GoInvo home" section (experiment
 * `home-shop-section`, flag `home-shop-section-variant`).
 *
 * The section renders ONLY for the "present" cohort. The edge (src/proxy.ts)
 * assigns a variant and writes it to a JS-readable cookie; this reads that
 * cookie after hydration, shows the section to the assigned half, and fires the
 * exposure + per-variant engagement beacon so we can see whether the section
 * repels visitors or helps them.
 *
 * Showing it is deliberately opt-in rather than opt-out (Shirley, 2026-08-10):
 * with the old default, any visitor the experiment had not assigned, including
 * every visitor when the flags secret is unset, saw the section. That is not an
 * A/B test, it is a launch. Absent an assignment the homepage stays as it was.
 *
 * Consequence: the section and its #goinvo-at-home anchor do not exist in the
 * server HTML, so they need JS. That is correct for an experiment surface; when
 * the studio decides to keep the section, render it unconditionally instead of
 * loosening this gate.
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

/**
 * Review override: `?home-shop-section-variant=present` shows the section on
 * any deploy.
 *
 * The edge normally assigns the cohort, but it needs FLAGS_SECRET, which only
 * Production and one preview branch have. Without this a reviewer on a preview
 * URL cannot see the section at all. Reading the param here costs nothing and
 * is not a security boundary: the section is public content either way.
 */
function readForcedVariant(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const value = new URLSearchParams(window.location.search).get(FLAG_KEY)
  return value || undefined
}

export function ShopSectionGate({ children }: { children: ReactNode }) {
  // null until the cookie is read. SSR and the first client render both show
  // nothing, so there is no hydration mismatch; the assigned "present" cohort
  // gains the section one tick later, below the fold.
  const [variant, setVariant] = useState<string | null>(null)
  // A forced view is a human looking at the page, not a sampled visitor, so it
  // must never emit an exposure beacon and skew the results.
  const [forced, setForced] = useState(false)

  useEffect(() => {
    const override = readForcedVariant()
    if (override && ALLOWED_VARIANTS.includes(override)) {
      setForced(true)
      setVariant(override)
      return
    }
    const value = readCookie(FLAG_KEY)
    setVariant(value && ALLOWED_VARIANTS.includes(value) ? value : '')
  }, [])

  const inExperiment = !forced && (variant === 'control' || variant === 'present')
  // 'control' is the baseline homepage with no section.
  const visible = variant === 'present'

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
      {visible && children}
    </>
  )
}
