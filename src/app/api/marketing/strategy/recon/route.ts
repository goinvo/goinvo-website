import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authorizeCron, cronDeniedStatus } from '@/lib/marketing/cronAuth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { runTerrainScan } from '@/lib/marketing/terrainRecon.server'

/**
 * Marqueta surveys the terrain: Sunday night, before Monday's sitrep.
 *
 *   GET  /api/marketing/strategy/recon         (Vercel cron: Authorization: Bearer CRON_SECRET)
 *   POST /api/marketing/strategy/recon?dryRun=1 (gathers, groups and writes the sitrep; stores nothing)
 *
 * Auth is the cron secret only (falling back to MARKETING_API_KEY, like the
 * tick): the run spends model credits and writes the week's private record.
 * Vercel crons send GET, so GET runs the real scan — unlike plan-week's GET,
 * which is a dry run, this route has no read-only use for a Studio to call.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Four sources, a web-search pass over them, page fetches to confirm quotes,
// and the sitrep: minutes, not seconds.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  return run(request)
}

export async function POST(request: NextRequest) {
  return run(request)
}

async function run(request: NextRequest) {
  const denied = authorizeCron(request, 'the terrain scan')
  if (denied) return NextResponse.json({ error: denied }, { status: cronDeniedStatus(denied) })
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1'
  try {
    const result = await runTerrainScan({ dryRun })
    return privateMarketingJson(
      {
        ok: result.ok,
        dryRun,
        week: result.week,
        stored: result.stored,
        steps: result.steps,
        sources: result.scan.sources,
        pains: result.scan.pains.map((pain) => ({
          key: pain.key,
          label: pain.label,
          trend: pain.trend,
          count: pain.count,
          history: pain.history,
          stance: pain.stance,
          segments: pain.segments,
          ourWork: pain.ourWork.map((work) => work.title),
        })),
        signals: result.scan.signals.length,
        droppedWeb: result.scan.droppedWeb,
        sitrep: result.sitrep,
      },
      { status: result.ok ? 200 : 500 },
    )
  } catch (error) {
    console.error('Terrain scan failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'The terrain scan failed.' }, { status: 500 })
  }
}
