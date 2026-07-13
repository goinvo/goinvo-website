import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const crawlSiteMock = vi.hoisted(() => vi.fn(async (options: { maxPages?: number }) => ({
  findings: [],
  stats: { maxPages: options.maxPages ?? 120 },
})))

vi.mock('@/lib/marketing/seoCrawl', () => ({
  SEO_CRAWL_HARD_MAX_PAGES: 120,
  crawlSite: crawlSiteMock,
}))

vi.mock('@/sanity/env', () => ({
  projectId: 'security-test-project',
  dataset: 'production',
  apiVersion: '2025-02-19',
  writeToken: '',
  previewToken: '',
}))

import { GET as getSeoAudit } from '@/app/api/marketing/seo-audit/route'
import { GET as getSeoCrawl } from '@/app/api/marketing/seo-crawl/route'
import { GET as getSeo } from '@/app/api/marketing/seo/route'
import { GET as getAiCitation } from '@/app/api/marketing/ai-citation/route'
import { validateExperimentBeacon } from '@/lib/marketing/beaconValidation'
import {
  MARKETING_PLAN_SESSION_MAX_AGE,
  marketingPlanSessionValue,
  verifyMarketingPlanSession,
} from '@/lib/marketing/marketingPlanAuth'
import {
  assertPublicNetworkUrl,
  fetchSeoResource,
  readResponseTextLimited,
  SeoTargetError,
  validateSeoTargetUrl,
} from '@/lib/marketing/seoTarget'

const API_KEY = 'security-boundary-test-key'

function apiRequest(path: string) {
  return new Request(`https://www.goinvo.com${path}`, {
    headers: { 'x-marketing-api-key': API_KEY },
  })
}

describe('marketing API authentication boundaries', () => {
  beforeEach(() => {
    vi.stubEnv('MARKETING_API_KEY', API_KEY)
    crawlSiteMock.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it.each([
    ['SEO audit', getSeoAudit, '/api/marketing/seo-audit?url=https://www.goinvo.com/'],
    ['SEO crawl', getSeoCrawl, '/api/marketing/seo-crawl'],
    ['SEO opportunities', getSeo, '/api/marketing/seo'],
    ['AI citation snapshots', getAiCitation, '/api/marketing/ai-citation'],
  ])('returns 401 for an unauthenticated %s GET', async (_label, handler, path) => {
    const response = await handler(new Request(`https://www.goinvo.com${path}`))
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('accepts the API key, rejects private targets, and performs no audit fetch', async () => {
    const response = await getSeoAudit(apiRequest('/api/marketing/seo-audit?url=http://127.0.0.1/admin'))
    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/private-network|IP-address|approved hosts/i),
    })
  })

  it('accepts a validated Studio session before applying target validation', async () => {
    vi.stubEnv('MARKETING_API_KEY', '')
    const sanityFetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'studio-user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', sanityFetch)

    const response = await getSeoAudit(
      new Request('https://www.goinvo.com/api/marketing/seo-audit?url=http://169.254.169.254/latest', {
        headers: { 'x-sanity-session': 'valid-studio-token' },
      }),
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(sanityFetch).toHaveBeenCalledWith(
      'https://security-test-project.api.sanity.io/v2021-06-07/users/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer valid-studio-token' } }),
    )
  })

  it('hard-clamps a crawl request before invoking the crawler', async () => {
    const response = await getSeoCrawl(apiRequest('/api/marketing/seo-crawl?maxPages=999999'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(crawlSiteMock).toHaveBeenCalledWith({ seedUrl: undefined, maxPages: 120 })
  })
})

describe('SEO outbound target policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('accepts the owned production origins', () => {
    expect(validateSeoTargetUrl('https://www.goinvo.com/vision/example#section')).toBe(
      'https://www.goinvo.com/vision/example',
    )
    expect(validateSeoTargetUrl('https://goinvo.com/')).toBe('https://goinvo.com/')
  })

  it.each([
    'http://127.0.0.1:3000/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.8/admin',
    'http://[::1]/',
    'https://metadata.google.internal/',
    'https://example.com/',
    'file:///etc/passwd',
    'https://user:secret@www.goinvo.com/',
    'https://www.goinvo.com:8443/',
  ])('rejects unsafe or unapproved target %s', (target) => {
    expect(() => validateSeoTargetUrl(target)).toThrow(SeoTargetError)
  })

  it('allows localhost only behind the explicit non-production opt-in', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('MARKETING_SEO_ALLOW_LOCALHOST', 'true')
    expect(validateSeoTargetUrl('http://localhost:3000/vision/test')).toBe(
      'http://localhost:3000/vision/test',
    )
  })

  it('blocks private browser subresources before DNS or navigation', async () => {
    await expect(assertPublicNetworkUrl('http://169.254.169.254/latest')).rejects.toThrow(
      /private-network/i,
    )
  })

  it('validates redirect destinations before following them', async () => {
    const network = vi.fn(async () =>
      new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/admin' } }),
    )
    vi.stubGlobal('fetch', network)
    await expect(fetchSeoResource('https://www.goinvo.com/start')).rejects.toThrow(
      /private-network|IP-address/i,
    )
    expect(network).toHaveBeenCalledTimes(1)
  })

  it('stops reading response bodies at the configured byte limit', async () => {
    const response = new Response('0123456789abcdef')
    await expect(readResponseTextLimited(response, 8)).rejects.toThrow(/larger than/i)
  })
})

describe('marketing-plan session signatures', () => {
  beforeEach(() => vi.stubEnv('MARKETING_PLAN_KEY', 'a-long-plan-access-key'))
  afterEach(() => vi.unstubAllEnvs())

  it('accepts a fresh signed session but rejects expiry and tampering', () => {
    const issuedAt = Date.UTC(2026, 6, 13, 12, 0, 0)
    const session = marketingPlanSessionValue(issuedAt)
    expect(session).toBeTruthy()
    expect(verifyMarketingPlanSession(session || undefined, issuedAt + 1000)).toBe(true)
    expect(
      verifyMarketingPlanSession(
        session || undefined,
        issuedAt + MARKETING_PLAN_SESSION_MAX_AGE * 1000 + 1000,
      ),
    ).toBe(false)
    expect(verifyMarketingPlanSession(`${session}tampered`, issuedAt + 1000)).toBe(false)
    expect(session).not.toContain('a-long-plan-access-key')
  })
})

describe('public experiment beacon validation', () => {
  const valid = {
    experiment_id: 'home-2026',
    flag_key: 'home-2026-variant',
    variant: 'concept',
    page_path: '/',
  }

  it('accepts only a registry-backed experiment, variant, path, and known event', () => {
    expect(validateExperimentBeacon({ ...valid, eventName: 'qualified_discovery_call_click' })).toMatchObject({
      kind: 'event',
      eventName: 'qualified_discovery_call_click',
    })
    expect(validateExperimentBeacon({ ...valid, type: 'engagement' })).toMatchObject({ kind: 'engagement' })
  })

  it.each([
    { flag_key: 'attacker-flag' },
    { experiment_id: 'attacker-experiment' },
    { variant: 'attacker-variant' },
    { page_path: '/admin' },
    { eventName: 'attacker_event' },
  ])('rejects a forged experiment dimension: %o', (override) => {
    expect(validateExperimentBeacon({ ...valid, eventName: 'experiment_exposure', ...override })).toBeNull()
  })
})
