import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Flag } from 'flags/next'
import { track as trackVercelEvent } from '@vercel/analytics'
import { config as proxyConfig } from '@/proxy'
import { ExperimentExposure } from '@/components/analytics/ExperimentExposure'
import { HomeConceptContent } from '@/components/home/HomeConceptContent'
import { HomeContent } from '@/components/home/HomeContent'
import {
  EXPERIMENT_FORCE_ASSIGNMENT_PARAM,
  EXPERIMENT_FORCE_VARIANT_PARAM,
  getForcedExperimentUrl,
  getForcedExperimentVariant,
  getExperimentExposure,
  home2026Experiment,
  normalizeExperimentPath,
  validatePageExperimentRegistry,
  type PageExperiment,
} from '@/lib/experiments/registry'
import {
  getExperimentRewritePath,
  shouldProxyMarketingExperiment,
} from '@/lib/experiments/proxy'
import {
  getOrGenerateMarketingVisitorId,
  MARKETING_VISITOR_COOKIE,
  MARKETING_VISITOR_HEADER,
} from '@/lib/experiments/visitor'
import { applyFeatureExperimentVariant } from '@/lib/experiments/featureVariants'
import {
  resetExperimentAnalyticsForTests,
  setExperimentContext,
  trackCtaClick,
  trackExperimentExposure,
  trackQualifiedDiscoveryCallClick,
} from '@/lib/analytics'
import type { Feature } from '@/types'

vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}))

vi.mock('@/sanity/lib/live', () => ({
  sanityFetch: vi.fn(async () => ({
    data: [
      {
        name: 'Ada GoInvo',
      },
    ],
  })),
}))

vi.mock('@/sanity/lib/image', () => ({
  urlForImage: () => ({
    width: () => ({
      height: () => ({
        url: () => '/team/ada.jpg',
      }),
    }),
  }),
}))

function mockFlag(key: string) {
  return { key } as unknown as Flag<string>
}

function experiment(overrides: Partial<PageExperiment> = {}): PageExperiment {
  return {
    id: 'test-experiment',
    code: 'test-experiment',
    kind: 'homepage',
    targetPath: '/',
    status: 'running',
    flagKey: 'test-flag',
    flag: mockFlag('test-flag'),
    variants: [
      { key: 'control', label: 'Control' },
      { key: 'variant', label: 'Variant' },
    ],
    ...overrides,
  }
}

function reactChildren(node: React.ReactNode) {
  expect(React.isValidElement(node)).toBe(true)
  return React.Children.toArray(
    (node as React.ReactElement<{ children?: React.ReactNode }>).props.children,
  ) as React.ReactElement[]
}

afterEach(() => {
  resetExperimentAnalyticsForTests()
  vi.mocked(trackVercelEvent).mockReset()
  vi.unstubAllGlobals()
})

describe('page experiment registry', () => {
  it('defines the homepage experiment with a control fallback', () => {
    expect(home2026Experiment).toMatchObject({
      id: 'home-2026',
      code: 'home-2026',
      targetPath: '/',
      flagKey: 'home-2026-variant',
      status: 'running',
    })
    expect(home2026Experiment.variants.map((variant) => variant.key)).toEqual([
      'control',
      'concept',
    ])
    expect(validatePageExperimentRegistry()).toEqual([])
  })

  it('reports duplicate flag keys, missing control variants, and overlapping active targets', () => {
    const errors = validatePageExperimentRegistry([
      experiment({ id: 'first', flagKey: 'shared-flag', targetPath: '/' }),
      experiment({
        id: 'second',
        flagKey: 'shared-flag',
        targetPath: '/',
        variants: [{ key: 'concept', label: 'Concept' }],
      }),
    ])

    expect(errors).toEqual(
      expect.arrayContaining([
        'Duplicate experiment flag key: shared-flag',
        'Experiment second is missing a control variant',
        'Running experiments first and second both target /',
      ]),
    )
  })

  it('normalizes paths and creates exposure payloads without raw visitor IDs', () => {
    expect(normalizeExperimentPath('vision/demo/?draft=1')).toBe('/vision/demo')
    expect(getExperimentExposure(home2026Experiment, 'concept', '/?utm=1')).toEqual({
      experiment_id: 'home-2026',
      flag_key: 'home-2026-variant',
      variant: 'concept',
      page_path: '/',
    })
  })

  it('validates forced preview variant query params for the current experiment path', () => {
    expect(getForcedExperimentVariant('/', new URLSearchParams(`${EXPERIMENT_FORCE_VARIANT_PARAM}=concept`))).toMatchObject({
      experiment: home2026Experiment,
      variant: 'concept',
      source: 'variant-param',
    })
    expect(getForcedExperimentVariant('/', new URLSearchParams('home-2026-variant=control'))).toMatchObject({
      experiment: home2026Experiment,
      variant: 'control',
      source: 'flag-key-param',
    })
    expect(getForcedExperimentVariant('/', new URLSearchParams(`${EXPERIMENT_FORCE_ASSIGNMENT_PARAM}=home-2026:concept`))).toMatchObject({
      experiment: home2026Experiment,
      variant: 'concept',
      source: 'assignment-param',
    })
    expect(getForcedExperimentVariant('/', new URLSearchParams(`${EXPERIMENT_FORCE_VARIANT_PARAM}=missing`))).toBeNull()
    expect(getForcedExperimentVariant('/studio', new URLSearchParams(`${EXPERIMENT_FORCE_VARIANT_PARAM}=concept`))).toBeNull()
  })

  it('builds shareable forced preview URLs while preserving custom query params', () => {
    expect(getForcedExperimentUrl('/?utm_source=qa', 'concept', 'http://localhost:3000')).toBe(
      'http://localhost:3000/?utm_source=qa&goinvo_ab_variant=concept',
    )
  })
})

describe('visitor IDs and proxy scope', () => {
  it('keeps cookie visitor IDs stable and falls back to the request header', async () => {
    const cookieBacked = await getOrGenerateMarketingVisitorId(
      {
        get: (name: string) => (name === MARKETING_VISITOR_COOKIE ? { value: 'cookie-id' } : undefined),
      } as never,
      {
        get: (name: string) => (name === MARKETING_VISITOR_HEADER ? 'header-id' : null),
      } as never,
    )
    const headerBacked = await getOrGenerateMarketingVisitorId(
      { get: () => undefined } as never,
      {
        get: (name: string) => (name === MARKETING_VISITOR_HEADER ? 'header-id' : null),
      } as never,
    )

    expect(cookieBacked).toBe('cookie-id')
    expect(headerBacked).toBe('header-id')
  })

  it('only proxies configured marketing experiment paths', () => {
    expect(proxyConfig.matcher).toEqual(['/', '/vision/:path*'])
    expect(shouldProxyMarketingExperiment('/')).toBe(true)
    expect(shouldProxyMarketingExperiment('/', 'HEAD')).toBe(true)
    expect(shouldProxyMarketingExperiment('/', 'POST')).toBe(false)

    for (const path of ['/api/hello', '/_next/static/app.js', '/studio', '/logo.svg', '/__exp/home-2026']) {
      expect(shouldProxyMarketingExperiment(path), path).toBe(false)
    }
  })

  it('builds internal noindex experiment rewrite paths', () => {
    expect(getExperimentRewritePath('/', 'abc123')).toBe('/__exp/abc123')
    expect(getExperimentRewritePath('/vision/healthcare-ai', 'abc123')).toBe('/__exp/abc123/vision/healthcare-ai')
  })
})

describe('experiment renderers and content variants', () => {
  it('defaults the homepage renderer to the control component', async () => {
    const { HomePageRenderer } = await import('@/components/home/HomePageRenderer')
    const children = reactChildren(await HomePageRenderer())

    expect(children).toHaveLength(1)
    const homeChild = children[0] as React.ReactElement<{ teamMembers?: unknown[] }>
    expect(homeChild.type).toBe(HomeContent)
    expect(homeChild.props.teamMembers).toHaveLength(1)
  })

  it('renders the concept homepage when the precomputed variant selects it', async () => {
    const { HomePageRenderer } = await import('@/components/home/HomePageRenderer')
    const exposure = getExperimentExposure(home2026Experiment, 'concept', '/')
    const children = reactChildren(await HomePageRenderer({ variant: 'concept', experiment: exposure }))

    expect(children).toHaveLength(2)
    expect(children[0].type).toBe(ExperimentExposure)
    expect(children[1].type).toBe(HomeConceptContent)
  })

  it('preserves article content unless a matching Sanity-authored variant is selected', () => {
    const canonicalContent = [{ _type: 'block', _key: 'canonical' }]
    const variantContent = [{ _type: 'block', _key: 'variant' }]
    const feature = {
      title: 'Canonical title',
      description: 'Canonical description',
      metaTitle: 'Canonical meta',
      metaDescription: 'Canonical SEO',
      content: canonicalContent,
      experimentVariants: [
        {
          key: 'short-cta',
          title: 'Variant title',
          content: variantContent,
        },
      ],
    } as unknown as Feature

    expect(applyFeatureExperimentVariant(feature, 'control')).toBe(feature)
    expect(applyFeatureExperimentVariant(feature, 'missing')).toBe(feature)
    expect(applyFeatureExperimentVariant(feature, 'short-cta')).toMatchObject({
      title: 'Variant title',
      description: 'Canonical description',
      metaTitle: 'Canonical meta',
      metaDescription: 'Canonical SEO',
      content: variantContent,
    })
  })
})

describe('experiment analytics', () => {
  it('fires one exposure per page and variant, then enriches later conversion events', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    vi.mocked(trackVercelEvent).mockImplementation((name, data) => {
      window.va?.('event', { name, data })
    })

    const exposure = getExperimentExposure(home2026Experiment, 'concept', '/')

    trackExperimentExposure(exposure)
    trackExperimentExposure(exposure)
    setExperimentContext(exposure)
    trackCtaClick({
      cta_text: 'Book a discovery call',
      cta_location: 'concept hero',
      cta_url: '/contact',
    })

    expect(gtag).toHaveBeenCalledTimes(3)
    expect(gtag).toHaveBeenNthCalledWith(1, 'event', 'experiment_exposure', exposure)
    expect(gtag).toHaveBeenNthCalledWith(
      2,
      'event',
      'cta_click',
      expect.objectContaining({
        experiment_id: 'home-2026',
        flag_key: 'home-2026-variant',
        variant: 'concept',
        page_path: '/',
        cta_text: 'Book a discovery call',
      }),
    )
    expect(gtag).toHaveBeenNthCalledWith(
      3,
      'event',
      'experiment_conversion',
      expect.objectContaining({
        experiment_id: 'home-2026',
        flag_key: 'home-2026-variant',
        variant: 'concept',
        page_path: '/',
        conversion_type: 'cta_click',
        conversion_name: 'Book a discovery call',
      }),
    )
    expect(trackVercelEvent).toHaveBeenCalledTimes(3)
    expect(trackVercelEvent).toHaveBeenNthCalledWith(1, 'experiment_exposure', exposure)
    expect(window.vaq).toContainEqual(['event', { name: 'experiment_exposure', data: exposure }])
    expect(trackVercelEvent).toHaveBeenNthCalledWith(
      3,
      'experiment_conversion',
      expect.objectContaining({
        experiment_id: 'home-2026',
        flag_key: 'home-2026-variant',
        variant: 'concept',
        page_path: '/',
        conversion_type: 'cta_click',
      }),
    )
    expect(gtag.mock.calls.flat().join(' ')).not.toContain('visitor')
    expect(vi.mocked(trackVercelEvent).mock.calls.flat().join(' ')).not.toContain('visitor')
  })

  it('fires the specific qualified event and cta_click but not the broad experiment_conversion', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    const exposure = getExperimentExposure(home2026Experiment, 'concept', '/')
    setExperimentContext(exposure)

    trackQualifiedDiscoveryCallClick({ cta_text: 'Book a discovery call', cta_location: 'concept hero', cta_url: '#book' })

    const firedEvents = gtag.mock.calls.filter((call) => call[0] === 'event').map((call) => call[1])
    expect(firedEvents).toContain('qualified_discovery_call_click')
    expect(firedEvents).toContain('cta_click')
    expect(firedEvents).not.toContain('experiment_conversion')

    const qualifiedCall = gtag.mock.calls.find((call) => call[1] === 'qualified_discovery_call_click')
    expect(qualifiedCall?.[2]).toMatchObject({ variant: 'concept', experiment_id: 'home-2026' })
  })
})
