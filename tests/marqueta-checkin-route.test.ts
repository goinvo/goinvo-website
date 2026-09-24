/**
 * The Thursday check-in's route: who may run it, how the flags are read, and
 * how the answer is reported. The run itself (claim, post once, record) is
 * tested in marqueta-server.test.ts; this pins the thin layer around it — and
 * the pieces of the schedule that live outside TypeScript (the cron entry, the
 * watchdog script), which nothing else would notice drifting.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  runWeeklyCheckIn: vi.fn(),
  getSlackBotUserId: vi.fn(),
  isOutreachClientConfigured: vi.fn(() => true),
}))

vi.mock('@/lib/marketing/weeklyCheckIn.server', () => ({ runWeeklyCheckIn: mocks.runWeeklyCheckIn }))
vi.mock('@/lib/chat/slack', () => ({ getSlackBotUserId: mocks.getSlackBotUserId }))
vi.mock('@/lib/marketing/outreachClient.server', () => ({
  isOutreachClientConfigured: mocks.isOutreachClientConfigured,
  getOutreachClient: () => {
    throw new Error('the route must not read Sanity itself')
  },
}))

import { GET, POST } from '@/app/api/marketing/checkin/route'
import { GET as TICK_GET } from '@/app/api/marketing/tick/route'
import { CHECKIN_HEARTBEAT_DOC_ID, HEARTBEAT_STALE_DAYS } from '@/lib/marketing/heartbeat'

const SECRET = 'cron-secret-for-tests'
const ENV_KEYS = ['CRON_SECRET', 'MARKETING_API_KEY'] as const
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

const request = (query = '', init: { method?: string; auth?: string | null } = {}) => {
  const headers: Record<string, string> = {}
  const auth = init.auth === undefined ? `Bearer ${SECRET}` : init.auth
  if (auth) headers.authorization = auth
  return new NextRequest(`https://www.goinvo.com/api/marketing/checkin${query}`, { method: init.method || 'GET', headers })
}

const ranResult = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  posted: true,
  week: '2026-W39',
  blocks: [{ type: 'header', text: { type: 'plain_text', text: 'Thursday check-in' } }],
  text: 'Thursday check-in.',
  taskCount: 3,
  followUpCount: 2,
  detail: 'Check-in posted for the week of Mon 21 Sep: 3 tasks and 2 follow-ups across 2 people.',
  ...overrides,
})

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  process.env.CRON_SECRET = SECRET
  delete process.env.MARKETING_API_KEY
  mocks.runWeeklyCheckIn.mockReset().mockResolvedValue(ranResult())
  mocks.getSlackBotUserId.mockReset().mockResolvedValue('UBOT')
  mocks.isOutreachClientConfigured.mockReset().mockReturnValue(true)
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('who may run the check-in', () => {
  it('refuses a request without the cron secret, and runs nothing', async () => {
    for (const auth of [null, 'Bearer wrong', `bearer ${SECRET}`, SECRET]) {
      const response = await GET(request('', { auth }))
      expect(response.status).toBe(401)
      expect(response.headers.get('cache-control')).toBe('private, no-store')
    }
    expect(mocks.runWeeklyCheckIn).not.toHaveBeenCalled()
  })

  it('fails closed with 503 when no secret is configured at all', async () => {
    delete process.env.CRON_SECRET
    const response = await GET(request('', { auth: 'Bearer ' }))
    expect(response.status).toBe(503)
    expect((await response.json()).error).toMatch(/check-in cannot authenticate/)
    expect(mocks.runWeeklyCheckIn).not.toHaveBeenCalled()
  })

  it('accepts MARKETING_API_KEY in place of the cron secret, so a person can run it by hand', async () => {
    delete process.env.CRON_SECRET
    process.env.MARKETING_API_KEY = 'hand-key'
    const response = await POST(request('?dryRun=1', { method: 'POST', auth: 'Bearer hand-key' }))
    expect(response.status).toBe(200)
    expect(mocks.runWeeklyCheckIn).toHaveBeenCalledTimes(1)
  })

  it('never runs without Sanity — there would be nowhere to record the failure', async () => {
    mocks.isOutreachClientConfigured.mockReturnValue(false)
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(mocks.runWeeklyCheckIn).not.toHaveBeenCalled()
  })
})

describe('running it', () => {
  it('GET runs for real — Vercel crons issue GET, and a read-only GET is how a cron persists nothing', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    const input = mocks.runWeeklyCheckIn.mock.calls[0][0]
    expect(input).toEqual({ dryRun: false, force: false, now: expect.any(Date) })
    const body = await response.json()
    expect(body).toMatchObject({ ok: true, posted: true, week: '2026-W39', dryRun: false, force: false })
  })

  it('reads dryRun and force only when they are exactly 1', async () => {
    await POST(request('?dryRun=1&force=1', { method: 'POST' }))
    expect(mocks.runWeeklyCheckIn.mock.calls[0][0]).toMatchObject({ dryRun: true, force: true })

    await POST(request('?dryRun=true&force=0', { method: 'POST' }))
    expect(mocks.runWeeklyCheckIn.mock.calls[1][0]).toMatchObject({ dryRun: false, force: false })
  })

  // Her hints are phrases people type ("Marqueta, my calls"), not a mention
  // of her, so a run no longer depends on Slack saying who the bot is.
  it('never asks Slack who the bot is — one less call that can fail before the post', async () => {
    mocks.getSlackBotUserId.mockRejectedValue(new Error('auth.test down'))
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(mocks.getSlackBotUserId).not.toHaveBeenCalled()
    expect(mocks.runWeeklyCheckIn.mock.calls[0][0]).not.toHaveProperty('botUserId')
  })

  it('reports a stand-down as success: the claim doing its job is not a failure', async () => {
    mocks.runWeeklyCheckIn.mockResolvedValue(
      ranResult({ posted: false, skipped: true, skipReason: 'alreadyPosted', detail: 'The check-in for the week of Mon 21 Sep was already posted.' }),
    )
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, skipped: true, skipReason: 'alreadyPosted' })
  })

  it('reports a run that should have posted and did not as a failure', async () => {
    mocks.runWeeklyCheckIn.mockResolvedValue(
      ranResult({ ok: false, posted: false, detail: 'Slack refused the check-in for the week of Mon 21 Sep.' }),
    )
    const response = await GET(request())
    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body.ok).toBe(false)
    expect(body.detail).toContain('Slack refused')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
})

describe('the tick shares the same gate', () => {
  it('answers a wrong secret and a missing one exactly as the check-in does', async () => {
    const tick = (auth: string) =>
      TICK_GET(new NextRequest('https://www.goinvo.com/api/marketing/tick', { headers: { authorization: auth } }))

    const wrong = await tick('Bearer wrong')
    expect(wrong.status).toBe(401)
    expect((await wrong.json()).error).toBe('Unauthorized.')

    delete process.env.CRON_SECRET
    const missing = await tick('Bearer ')
    expect(missing.status).toBe(503)
    // The tick keeps its own wording.
    expect((await missing.json()).error).toBe('CRON_SECRET is not configured, so the tick cannot authenticate.')
  })
})

describe('the schedule outside TypeScript', () => {
  const root = path.resolve(__dirname, '..')

  it('schedules the check-in on Thursdays, after the Monday tick', () => {
    const vercel = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
      crons: { path: string; schedule: string }[]
    }
    const checkin = vercel.crons.filter((cron) => cron.path === '/api/marketing/checkin')
    expect(checkin).toEqual([{ path: '/api/marketing/checkin', schedule: '0 14 * * 4' }])
    expect(vercel.crons.some((cron) => cron.path === '/api/marketing/tick')).toBe(true)
  })

  it('has the watchdog read the check-in record the run writes, on the same staleness rule', () => {
    const script = readFileSync(path.join(root, 'scripts/check-heartbeat.mjs'), 'utf8')
    expect(script).toContain(`const CHECKIN_DOC_ID = '${CHECKIN_HEARTBEAT_DOC_ID}'`)
    expect(script).toContain(`const STALE_DAYS = ${HEARTBEAT_STALE_DAYS}`)
    expect(script).toContain('Thursday check-in')
    // Both jobs are checked before exiting, so a broken Thursday is not hidden
    // behind a broken Monday.
    expect(script).toMatch(/if \(!checkTick\(\)\) unhealthy = true\s+if \(!checkCheckIn\(\)\) unhealthy = true/)
  })

  it('does not hold the check-in to the tick’s all-zero rule — a quiet week is not an inert job', () => {
    const script = readFileSync(path.join(root, 'scripts/check-heartbeat.mjs'), 'utf8')
    const checkIn = script.slice(script.indexOf('function checkCheckIn'))
    expect(checkIn).not.toMatch(/moved nothing|every\(\(step\) => !step\.count\)/)
  })
})
