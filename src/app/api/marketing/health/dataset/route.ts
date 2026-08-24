import type { NextRequest } from 'next/server'
import { createClient } from '@sanity/client'
import { apiVersion, dataset as PUBLIC_DATASET, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import {
  INTERNAL_DATASET,
  INTERNAL_MARKETING_TYPES,
  assertSplitIsReal,
  datasetForType,
} from '@/lib/marketing/datasetRouting'
import { MANAGED_MARKETING_TYPES } from '@/lib/marketing/types'

/**
 * Is the dataset split actually doing what it claims?
 *
 * Almost every way this migration can fail is silent. A repointed query that
 * misses returns an empty array, not an error: "0 due items" looks exactly like
 * "nothing scheduled", a dedupe check that finds nothing re-ingests every
 * render, and a delete against the wrong dataset reports success. None of that
 * shows up in a log.
 *
 * This turns all of it into one number per type. For each managed type it
 * reports where it is configured to live, how many documents are actually
 * there, and — the number that matters — how many are still readable by an
 * anonymous stranger. A type that had documents and now reads zero is an
 * unambiguous alarm.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EXTRA_TYPES = ['cmsFeedback', 'previewShareLink', 'chatThread', 'aiCitationSnapshot']

export async function GET(request: NextRequest) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  if (!projectId || !writeToken) {
    return privateMarketingJson({ error: 'Sanity is not configured.' }, { status: 503 })
  }

  try {
    assertSplitIsReal(PUBLIC_DATASET)
  } catch (error) {
    return privateMarketingJson(
      { error: error instanceof Error ? error.message : 'Split misconfigured.' },
      { status: 500 },
    )
  }

  const types = Array.from(new Set([...MANAGED_MARKETING_TYPES, ...EXTRA_TYPES])).sort()
  const authed = (ds: string) =>
    createClient({ projectId, dataset: ds, apiVersion, token: writeToken, useCdn: false, perspective: 'published' })

  const countsQuery = `{${types.map((type) => `"${type}": count(*[_type == "${type}"])`).join(',')}}`

  // The anonymous probe is the whole point: it is what a stranger with the
  // project id can see, which is the thing the split exists to change.
  const anonUrl =
    `https://${projectId}.api.sanity.io/v${apiVersion.replace(/^v/, '')}/data/query/${PUBLIC_DATASET}` +
    `?query=${encodeURIComponent(countsQuery)}`

  const [internalCounts, publicCounts, anonCounts] = await Promise.all([
    authed(INTERNAL_DATASET)
      .fetch<Record<string, number>>(countsQuery)
      .catch(() => ({}) as Record<string, number>),
    authed(PUBLIC_DATASET)
      .fetch<Record<string, number>>(countsQuery)
      .catch(() => ({}) as Record<string, number>),
    fetch(anonUrl)
      .then((response) => (response.ok ? response.json() : { result: {} }))
      .then((body) => (body.result || {}) as Record<string, number>)
      .catch(() => ({} as Record<string, number>)),
  ])

  const rows = types.map((type) => {
    const configured = datasetForType(type, PUBLIC_DATASET)
    const inInternal = internalCounts[type] ?? 0
    const inPublic = publicCounts[type] ?? 0
    const anon = anonCounts[type] ?? 0
    const where = configured === INTERNAL_DATASET ? inInternal : inPublic
    const stray = configured === INTERNAL_DATASET ? inPublic : inInternal
    return {
      type,
      configuredDataset: configured,
      countInConfiguredDataset: where,
      countInOtherDataset: stray,
      anonymouslyReadable: anon,
      // The two states worth alarming on, named rather than left to the reader.
      missing: where === 0 && stray > 0,
      leaking: configured === INTERNAL_DATASET && anon > 0,
    }
  })

  const missing = rows.filter((row) => row.missing)
  const leaking = rows.filter((row) => row.leaking)

  return privateMarketingJson({
    publicDataset: PUBLIC_DATASET,
    internalDataset: INTERNAL_DATASET,
    internalTypeCount: INTERNAL_MARKETING_TYPES.length,
    ok: missing.length === 0 && leaking.length === 0,
    missing: missing.map((row) => row.type),
    leaking: leaking.map((row) => row.type),
    rows,
  })
}
