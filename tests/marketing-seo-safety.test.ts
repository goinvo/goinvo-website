import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { seoBacklogIdeaId } from '@/sanity/components/SeoWorkspace'

const WORKSPACE_SOURCE = readFileSync(
  new URL('../src/sanity/components/SeoWorkspace.tsx', import.meta.url),
  'utf8',
)
const OPPORTUNITY_ROUTE_SOURCE = readFileSync(
  new URL('../src/app/api/marketing/seo/route.ts', import.meta.url),
  'utf8',
)
const AUDIT_ROUTE_SOURCE = readFileSync(
  new URL('../src/app/api/marketing/seo-audit/route.ts', import.meta.url),
  'utf8',
)

describe('SEO quota and authentication safety', () => {
  it('keeps paid TextFocus work behind explicit query flags and labels the cost', () => {
    expect(OPPORTUNITY_ROUTE_SOURCE).toContain("searchParams.get('enrich') === '1'")
    expect(OPPORTUNITY_ROUTE_SOURCE).toContain('if (includeKeywordMetrics && queries.length > 0)')
    expect(AUDIT_ROUTE_SOURCE).toContain("searchParams.get('paid') === '1'")
    expect(AUDIT_ROUTE_SOURCE).toContain('Boolean(single && includePaidChecks)')
    expect(WORKSPACE_SOURCE).toContain('Add keyword metrics (1 TextFocus credit)')
    expect(WORKSPACE_SOURCE).toContain('uses 1 paid TextFocus credit')
  })

  it('uses the shared token/cookie fallback for SEO APIs', () => {
    expect(WORKSPACE_SOURCE).toContain('authenticatedMarketingRequest')
    expect(WORKSPACE_SOURCE).toContain("client?.withConfig({ dataset: OUTREACH_DATASET })")
    expect(WORKSPACE_SOURCE).not.toContain('studioSessionHeader')
  })

  it('uses a stable document ID so repeated backlog promotion is idempotent', () => {
    expect(seoBacklogIdeaId('audit|/|missing-title')).toBe(seoBacklogIdeaId('audit|/|missing-title'))
    expect(seoBacklogIdeaId('audit|/|missing-title')).not.toBe(seoBacklogIdeaId('audit|/work|missing-title'))
    expect(WORKSPACE_SOURCE).toContain('client.createIfNotExists')
  })
})
