import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  crawl: vi.fn(),
}))

vi.mock('@/lib/marketing/auth', () => ({
  assertStudioOrApiKey: vi.fn(async () => {}),
  MarketingAuthError: class MarketingAuthError extends Error {},
}))

vi.mock('@/lib/marketing/seoAudit', () => ({
  auditPage: mocks.audit,
  computeHealthScore: () => ({ score: 100, label: 'Healthy', errors: 0, warnings: 0, notices: 0 }),
}))

vi.mock('@/lib/marketing/seoCrawl', () => ({
  SEO_CRAWL_HARD_MAX_PAGES: 120,
  crawlSite: mocks.crawl,
}))

import { GET as getAudit } from '@/app/api/marketing/seo-audit/route'
import { GET as getCrawl } from '@/app/api/marketing/seo-crawl/route'

function auditResult(url: string) {
  return {
    url,
    findings: [],
    healthScore: { score: 100, label: 'Healthy', errors: 0, warnings: 0, notices: 0 },
  }
}

describe('SEO expensive-work replay protection', () => {
  beforeEach(() => {
    mocks.audit.mockReset().mockImplementation(async (url: string) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return auditResult(url)
    })
    mocks.crawl.mockReset().mockImplementation(async (options: { seedUrl?: string; maxPages?: number }) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return {
        findings: [],
        stats: { seedUrl: options.seedUrl, maxPages: options.maxPages ?? 120 },
      }
    })
  })

  it('coalesces concurrent identical paid audits and reuses the short replay result', async () => {
    const url = 'https://www.goinvo.com/vision/replay-boundary'
    const requestUrl = `https://www.goinvo.com/api/marketing/seo-audit?url=${encodeURIComponent(url)}&paid=1&keyword=healthcare&lang=en-US`

    const [first, second] = await Promise.all([
      getAudit(new Request(requestUrl)),
      getAudit(new Request(requestUrl)),
    ])
    const replay = await getAudit(new Request(requestUrl))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(replay.status).toBe(200)
    expect(mocks.audit).toHaveBeenCalledTimes(1)
    expect(mocks.audit).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ includeSemanticGap: true, semanticKeyword: 'healthcare', semanticLang: 'en-US' }),
    )
  })

  it('coalesces concurrent identical crawls', async () => {
    const requestUrl = 'https://www.goinvo.com/api/marketing/seo-crawl?maxPages=25'
    const [first, second] = await Promise.all([
      getCrawl(new Request(requestUrl)),
      getCrawl(new Request(requestUrl)),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mocks.crawl).toHaveBeenCalledTimes(1)
    expect(mocks.crawl).toHaveBeenCalledWith({ seedUrl: undefined, maxPages: 25 })
  })
})
