/**
 * Running the weekly terrain scan.
 *
 * Server-only. Reads the four keyless sources in parallel (each one fails on
 * its own and is reported, never hidden), drops what earlier scans already saw,
 * asks the model to find web complaints and group everything into pains, keeps
 * only web findings the search really returned, confirms their quotes in the
 * fetched pages, computes each pain's trend from earlier scans, writes the
 * sitrep, and stores the lot as one private record per ISO week.
 *
 * Idempotent per week: a re-run replaces that week's record. Earlier weeks are
 * read, never written.
 */

import { generateClaudeText, isAnthropicConfigured, resolveMarketingModel } from './anthropicJson'
import { getMarketingWriteClientFor } from './client'
import { RECON_HEARTBEAT_DOC_ID, HEARTBEAT_DOC_TYPE, type HeartbeatStep } from './heartbeat'
import { fetchOurWork, fetchPublic } from './marquetaSuggest.server'
import { getOutreachClient } from './outreachClient.server'
import { readRunway } from './runway.server'
import { blindSpots, buildSitrepUserMessage, parseSitrep, rulesSitrep, SITREP_SYSTEM, type OwnSituation, type Sitrep } from './sitrep'
import { extractReadableText, quoteAppearsIn } from './sourceVerification'
import { readIntent } from './strategyIntent.server'
import {
  buildTerrainUserMessage,
  FDA_SEARCH,
  freshSignals,
  HN_QUERIES,
  LOOKBACK_DAYS,
  parseAppStoreReviews,
  parseFdaEvents,
  parseHnHits,
  parsePubmedSummaries,
  parseTerrain,
  PUBMED_TERM,
  TERRAIN_SCAN_TYPE,
  TERRAIN_SYSTEM,
  terrainScanDocId,
  WATCHED_PATIENT_APPS,
  withTrends,
  type TerrainScan,
  type TerrainSignal,
  type TerrainSource,
  type TerrainSourceRun,
} from './terrainRecon'
import { isoWeekKey } from './weeklyPlan'

const DAY_MS = 86_400_000
const SOURCE_TIMEOUT_MS = 20_000
/** At most this many fresh signals per structured source go to the model, so one noisy source cannot drown the rest. */
const PER_SOURCE_CAP = 20

const scanClient = () => getMarketingWriteClientFor(TERRAIN_SCAN_TYPE)

async function getJson(url: string, opts: { notFoundIsEmpty?: boolean } = {}): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
    headers: { 'user-agent': 'GoInvo-Marqueta/1.0 (+https://www.goinvo.com)', accept: 'application/json' },
  })
  // openFDA answers a search with no matches as 404. A quiet window is not a
  // broken source, and reporting it as one would cry wolf every quiet week.
  if (response.status === 404 && opts.notFoundIsEmpty) return {}
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const ymd = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '')

async function readFda(now: Date): Promise<TerrainSignal[]> {
  const from = new Date(now.getTime() - LOOKBACK_DAYS.fda * DAY_MS)
  const search = `date_received:[${ymd(from)} TO ${ymd(now)}] AND ${FDA_SEARCH}`
  return parseFdaEvents(
    await getJson(`https://api.fda.gov/device/event.json?search=${encodeURIComponent(search)}&sort=date_received:desc&limit=40`, {
      notFoundIsEmpty: true,
    }),
  )
}

async function readAppStore(now: Date): Promise<TerrainSignal[]> {
  const since = new Date(now.getTime() - LOOKBACK_DAYS.appstore * DAY_MS)
  const results = await Promise.all(
    WATCHED_PATIENT_APPS.map(async (name) => {
      const found = (await getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=software&country=us&limit=3`)) as {
        results?: { trackId?: number; trackName?: string }[]
      }
      const app = (found.results || []).find((entry) => entry.trackId && String(entry.trackName || '').toLowerCase().includes(name.toLowerCase()))
      if (!app?.trackId) return []
      const reviews = await getJson(`https://itunes.apple.com/us/rss/customerreviews/id=${app.trackId}/sortBy=mostRecent/json`)
      return parseAppStoreReviews(reviews, { appId: String(app.trackId), appName: String(app.trackName), since })
    }),
  )
  return results.flat()
}

async function readHn(now: Date): Promise<TerrainSignal[]> {
  const since = Math.floor((now.getTime() - LOOKBACK_DAYS.hn * DAY_MS) / 1000)
  const results = await Promise.all(
    HN_QUERIES.map(async (query) =>
      parseHnHits(
        await getJson(
          `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=comment&numericFilters=created_at_i>${since}&hitsPerPage=8`,
        ),
      ),
    ),
  )
  return results.flat()
}

async function readPubmed(): Promise<TerrainSignal[]> {
  const search = (await getJson(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=15&reldate=${LOOKBACK_DAYS.pubmed}&term=${encodeURIComponent(PUBMED_TERM)}`,
  )) as { esearchresult?: { idlist?: string[] } }
  const ids = search.esearchresult?.idlist || []
  if (!ids.length) return []
  return parsePubmedSummaries(await getJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`))
}

const READERS: Record<Exclude<TerrainSource, 'web'>, (now: Date) => Promise<TerrainSignal[]>> = {
  fda: readFda,
  appstore: readAppStore,
  hn: readHn,
  pubmed: () => readPubmed(),
}

/** All quote checks together get this long; whatever is still loading stays unverified. */
const VERIFY_DEADLINE_MS = 25_000

/**
 * Confirm each web quote in the page it cites. A page we cannot fetch in time
 * leaves the signal unverified, not dropped. The checks run together under one
 * deadline: one at a time, eight slow pages could add minutes and push the run
 * past the route's 300 s, losing the whole week.
 */
async function verifyWebQuotes(signals: TerrainSignal[]): Promise<TerrainSignal[]> {
  return Promise.all(
    signals.map(async (entry) => {
      const check = (async () => {
        try {
          const response = await fetchPublic(entry.url)
          if (!response?.ok) return entry
          const textValue = extractReadableText(await response.text())
          return { ...entry, verified: quoteAppearsIn(textValue, entry.quote) }
        } catch {
          return entry
        }
      })()
      const late = new Promise<TerrainSignal>((resolve) => setTimeout(() => resolve(entry), VERIFY_DEADLINE_MS))
      return Promise.race([check, late])
    }),
  )
}

type PreviousScan = { week: string; pains: { key: string; count: number; label: string; summary: string }[]; signalKeys: string[] }

async function readPreviousScans(week: string): Promise<PreviousScan[]> {
  const rows = await scanClient().fetch<{ week?: string; pains?: { key?: string; count?: number; label?: string; summary?: string }[]; signalKeys?: string[] }[]>(
    `*[_type == $type && week < $week] | order(week desc)[0...6]{ week, "pains": pains[]{ key, count, label, summary }, "signalKeys": signals[].key }`,
    { type: TERRAIN_SCAN_TYPE, week },
  )
  return (rows || []).map((row) => ({
    week: String(row.week || ''),
    pains: (row.pains || []).map((pain) => ({
      key: String(pain.key || ''),
      count: Number(pain.count) || 0,
      label: String(pain.label || ''),
      summary: String(pain.summary || ''),
    })),
    signalKeys: (row.signalKeys || []).map(String),
  }))
}


async function ownSituation(now: Date): Promise<OwnSituation> {
  const [runway, hours] = await Promise.all([
    readRunway(now).catch(() => null),
    getMarketingWriteClientFor('marketingSettings')
      .fetch<number | null>(`*[_id == "marketingSettings"][0].weeklyMarketingHours`)
      .catch(() => null),
  ])
  return {
    runwayLine: runway?.summary || null,
    postureId: runway?.resolved.id || null,
    weeklyHours: typeof hours === 'number' ? hours : null,
  }
}

export type TerrainRunResult = {
  ok: boolean
  week: string
  scan: TerrainScan
  sitrep: Sitrep
  steps: HeartbeatStep[]
  stored: boolean
}

/**
 * One weekly scan. Never throws for a source or model failure: each becomes a
 * step that says what went wrong, and the sitrep falls back to rules.
 */
export async function runTerrainScan(input: { now?: Date; dryRun?: boolean } = {}): Promise<TerrainRunResult> {
  const now = input.now || new Date()
  // Keyed to the week the scan INFORMS: it runs Sunday night, the last day of an
  // ISO week, and is read by Monday's sitrep — so it takes tomorrow's week.
  const week = isoWeekKey(new Date(now.getTime() + DAY_MS))
  const steps: HeartbeatStep[] = []

  const [previous, intent, work, own] = await Promise.all([
    readPreviousScans(week).catch(() => [] as PreviousScan[]),
    readIntent().catch(() => null),
    fetchOurWork().catch(() => []),
    ownSituation(now),
  ])

  const sources: TerrainSourceRun[] = []
  const gathered: TerrainSignal[] = []
  await Promise.all(
    (Object.keys(READERS) as Exclude<TerrainSource, 'web'>[]).map(async (source) => {
      try {
        const found = await READERS[source](now)
        sources.push({ source, ok: true, count: found.length })
        gathered.push(...found)
      } catch (error) {
        sources.push({ source, ok: false, count: 0, error: error instanceof Error ? error.message.slice(0, 160) : 'failed' })
      }
    }),
  )
  const seen = previous.flatMap((scan) => scan.signalKeys)
  const fresh = freshSignals(gathered, seen)
  const capped = (Object.keys(READERS) as TerrainSource[]).flatMap((source) =>
    fresh.filter((entry) => entry.source === source).slice(0, PER_SOURCE_CAP),
  )
  steps.push({
    name: 'sources',
    ok: sources.every((source) => source.ok),
    count: capped.length,
    detail: `${capped.length} fresh signals from ${sources.filter((source) => source.ok).length} of ${sources.length} sources.`,
  })

  const knownPains = [...new Map(previous.flatMap((scan) => scan.pains).map((pain) => [pain.key, pain])).values()].map((pain) => ({
    key: pain.key,
    label: pain.label,
    summary: pain.summary,
  }))

  let scan: TerrainScan = { week, ranAt: now.toISOString(), sources, signals: capped, pains: [], droppedWeb: 0, model: '' }

  if (!isAnthropicConfigured()) {
    steps.push({ name: 'pains', ok: false, count: 0, detail: 'ANTHROPIC_API_KEY is not set, so complaints were gathered but not grouped.' })
  } else {
    try {
      const model = await resolveMarketingModel(getOutreachClient())
      const result = await generateClaudeText({
        feature: 'marqueta-terrain',
        model,
        webSearch: true,
        // Room for 8 web quotes and 8 pains; the time limit leaves the sitrep and
        // the store inside the route's 300 s.
        maxTokens: 10_000,
        timeoutMs: 170_000,
        system: TERRAIN_SYSTEM,
        user: buildTerrainUserMessage({ signals: capped, knownPains, work, intent, today: now.toISOString().slice(0, 10) }),
      })
      const parsed =
        result.stopReason === 'max_tokens'
          ? null
          : parseTerrain(result.text, {
              signals: capped,
              work,
              searchedUrls: result.sources.map((source) => source.url),
              objectiveKeys: (intent?.objectives || []).map((objective) => objective.key),
            })
      if (!parsed) {
        steps.push({ name: 'pains', ok: false, count: 0, detail: result.stopReason === 'max_tokens' ? 'The grouping ran out of room and was cut off.' : 'The grouping came back unreadable.' })
      } else {
        const web = await verifyWebQuotes(parsed.webSignals)
        const webSource: TerrainSourceRun = { source: 'web', ok: true, count: web.length }
        scan = {
          ...scan,
          sources: [...sources, webSource],
          signals: [...capped, ...web],
          pains: withTrends(parsed.pains, previous),
          droppedWeb: parsed.droppedWeb,
          model,
        }
        steps.push({
          name: 'pains',
          ok: true,
          count: scan.pains.length,
          detail: `${scan.pains.length} pains from ${scan.signals.length} signals; ${web.filter((entry) => entry.verified).length} of ${web.length} web quotes confirmed in their pages; ${parsed.droppedWeb} web findings dropped.`,
        })
      }
    } catch (error) {
      steps.push({ name: 'pains', ok: false, count: 0, detail: `grouping failed: ${error instanceof Error ? error.name : 'UnknownError'}` })
    }
  }

  // The sitrep: model judgement over the stored records, rules when that fails.
  const spots = blindSpots({ intent, scan, now })
  let sitrep: Sitrep = rulesSitrep({ intent, scan, own, now })
  if (isAnthropicConfigured() && scan.pains.length) {
    try {
      const model = await resolveMarketingModel(getOutreachClient())
      const { text } = await generateClaudeText({
        feature: 'marqueta-sitrep',
        model,
        maxTokens: 1400,
        timeoutMs: 45_000,
        system: SITREP_SYSTEM,
        user: buildSitrepUserMessage({ intent, scan, own, spots, today: now.toISOString().slice(0, 10) }),
      })
      sitrep = parseSitrep(text, { objectiveKeys: (intent?.objectives || []).map((objective) => objective.key), spots, now }) || sitrep
    } catch {
      // The rules version stands; the step below says which one was used.
    }
  }
  steps.push({ name: 'sitrep', ok: true, count: sitrep.recommend.length, detail: `Sitrep written by ${sitrep.by}.` })

  let stored = false
  if (!input.dryRun) {
    try {
      await scanClient().createOrReplace({
        _id: terrainScanDocId(week),
        _type: TERRAIN_SCAN_TYPE,
        ...scan,
        sources: scan.sources.map((source, index) => ({ _key: `${source.source}-${index}`, ...source })),
        signals: scan.signals.map((entry) => ({ _key: entry.key, ...entry })),
        pains: scan.pains.map((pain) => ({ _key: pain.key, ...pain, ourWork: pain.ourWork.map((item, index) => ({ _key: `w${index}`, ...item })) })),
        sitrep: {
          ...sitrep,
          recommend: sitrep.recommend.map((entry, index) => ({ _key: `r${index}`, ...entry })),
        },
      })
      stored = true
    } catch (error) {
      steps.push({ name: 'store', ok: false, count: 0, detail: `could not store the scan: ${error instanceof Error ? error.name : 'UnknownError'}` })
    }
    await recordReconHeartbeat({ week, steps, ok: stored && steps.every((step) => step.ok || step.name === 'sources') })
  }

  // A partial picture is still a picture: one failed source does not fail the run.
  const ok = (input.dryRun || stored) && steps.filter((step) => step.name !== 'sources').every((step) => step.ok)
  return { ok, week, scan, sitrep, steps, stored }
}

async function recordReconHeartbeat(input: { week: string; steps: HeartbeatStep[]; ok: boolean }) {
  try {
    const client = getOutreachClient()
    const now = new Date().toISOString()
    await client.createIfNotExists({ _id: RECON_HEARTBEAT_DOC_ID, _type: HEARTBEAT_DOC_TYPE })
    await client
      .patch(RECON_HEARTBEAT_DOC_ID)
      .set({
        week: input.week,
        ranAt: now,
        steps: input.steps.map((step, index) => ({ _key: `${step.name}-${index}`, ...step })),
        ...(input.ok ? { lastHealthyAt: now, error: null } : { error: input.steps.find((step) => !step.ok)?.detail || 'the scan did not complete' }),
      })
      .commit()
  } catch (error) {
    console.error('[marqueta] recon heartbeat failed', error instanceof Error ? error.name : 'UnknownError')
  }
}
