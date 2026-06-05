'use client'

import { useEffect, useState } from 'react'
import { ExperimentExposure } from '@/components/analytics/ExperimentExposure'
import type { ExperimentAnalyticsParams } from '@/lib/analytics'

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

const ALLOWED_VARIANTS = ['control', 'concept']

// Cache-proof exposure for the homepage A/B test. The canonical `/` page is a
// static, CDN-cached asset that mounts no <ExperimentExposure>, so ~99% of
// visitors never fired the event. This reads the variant the proxy assigned
// (a JS-readable cookie) and fires experiment_exposure client-side regardless of
// caching. It dedupes against the server-rendered exposure on the rewrite path
// via the tracker guard in lib/analytics (same experiment_id:variant:path key),
// and never fires when the variant cookie is absent, so it can't mislabel a
// visitor's cohort. Keep these literals in sync with home2026Experiment /
// getExperimentExposure in lib/experiments/registry.
export function HomeExperimentExposure() {
  const [experiment, setExperiment] = useState<ExperimentAnalyticsParams | null>(null)

  useEffect(() => {
    const variant = readCookie('home-2026-variant')
    if (!variant || !ALLOWED_VARIANTS.includes(variant)) return
    setExperiment({ experiment_id: 'home-2026', flag_key: 'home-2026-variant', variant, page_path: '/' })
  }, [])

  if (!experiment) return null
  return <ExperimentExposure experiment={experiment} />
}
