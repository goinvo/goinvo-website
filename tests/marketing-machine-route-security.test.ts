import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as runPublishGet } from '@/app/api/marketing/publish/run/route'
import { POST as schedulePublishPost } from '@/app/api/marketing/publish/schedule/route'
import { GET as drainCronGet } from '@/app/api/marketing/analytics/drain-cron/route'
import { POST as vercelDrainPost } from '@/app/api/marketing/analytics/vercel-drain/route'
import { POST as rendomatIngestPost } from '@/app/api/marketing/rendomat/ingest/route'

describe('marketing machine-to-machine route guards', () => {
  beforeEach(() => {
    vi.stubEnv('MARKETING_API_KEY', 'machine-api-key')
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('MARKETING_VERCEL_DRAIN_SECRET', 'drain-secret')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('rejects unauthenticated publish runs', async () => {
    const response = await runPublishGet(
      new Request('https://www.goinvo.com/api/marketing/publish/run'),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated schedule requests', async () => {
    const response = await schedulePublishPost(
      new Request('https://www.goinvo.com/api/marketing/publish/schedule', { method: 'POST' }),
    )
    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated cron and Rendomat calls', async () => {
    const cron = await drainCronGet(
      new NextRequest('https://www.goinvo.com/api/marketing/analytics/drain-cron'),
    )
    const rendomat = await rendomatIngestPost(
      new Request('https://www.goinvo.com/api/marketing/rendomat/ingest', { method: 'POST' }),
    )
    expect(cron.status).toBe(401)
    expect(rendomat.status).toBe(401)
  })

  it('does not accept the drain secret from a URL query parameter', async () => {
    const response = await vercelDrainPost(
      new NextRequest(
        'https://www.goinvo.com/api/marketing/analytics/vercel-drain?secret=drain-secret',
        { method: 'POST', body: JSON.stringify({ events: [] }) },
      ),
    )
    expect(response.status).toBe(401)
  })
})
