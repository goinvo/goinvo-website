import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { assignHomeHeroVariant, getMarketingFlagsSecret, marketingExperimentFlags } from '@/flags'
import { serialize } from 'flags/next'
import { getExperimentExposure, getPrecomputedExperimentVariant, homeHeroExperiment } from '@/lib/experiments/registry'
import { validateExperimentBeacon } from '@/lib/marketing/beaconValidation'
import { HomeConceptContent } from '@/components/home/HomeConceptContent'

vi.mock('@/components/home/HomeConceptInteractions', () => ({ HomeConceptInteractions: () => null }))
vi.mock('@/components/home/HomeConceptCalendlyCta', () => ({ HomeConceptCalendlyCta: () => null }))

describe('homepage hero experiment', () => {
  it('assigns stable, balanced cohorts with a safe missing-visitor fallback', () => {
    const visitors = Array.from({ length: 10000 }, (_, index) => `visitor-${index}`)
    const treatment = visitors.filter((id) => assignHomeHeroVariant(id) === 'runway').length
    expect(treatment).toBeGreaterThan(4800)
    expect(treatment).toBeLessThan(5200)
    for (const id of visitors.slice(0, 100)) expect(assignHomeHeroVariant(id)).toBe(assignHomeHeroVariant(id))
    expect(assignHomeHeroVariant()).toBe('control')
    console.log(`Checked 10,000 assignments: ${10000 - treatment} control / ${treatment} runway`)
  })

  it.each(['control', 'runway'] as const)('decodes the server-rendered %s variant and accepts its analytics', async (variant) => {
    const code = await serialize(marketingExperimentFlags, ['control', 'present', variant], getMarketingFlagsSecret())
    expect(await getPrecomputedExperimentVariant('/', code)).toMatchObject({ variant, experiment: homeHeroExperiment })
    const payload = getExperimentExposure(homeHeroExperiment, variant, '/')
    expect(validateExperimentBeacon({ ...payload, eventName: 'experiment_exposure' })).toMatchObject({ variant })
    expect(validateExperimentBeacon({ ...payload, eventName: 'discovery_call_booked' })).toMatchObject({ variant })
    expect(validateExperimentBeacon({ ...payload, measurement_key: 'old', eventName: 'experiment_exposure' })).toBeNull()
  })

  it('renders exactly one hero and keeps everything below it identical', () => {
    const control = renderToStaticMarkup(React.createElement(HomeConceptContent, { heroVariant: 'control' }))
    const runway = renderToStaticMarkup(React.createElement(HomeConceptContent, { heroVariant: 'runway' }))
    for (const html of [control, runway]) {
      expect(html.match(/<h1\b/g)).toHaveLength(1)
      expect(html.match(/data-experiment-section="hero"/g)).toHaveLength(1)
      expect(html).toContain('Book a discovery call')
      expect(html).toContain('Or see the work')
    }
    expect(control).toContain('Complex software that ships, and moves the numbers.')
    expect(control).not.toContain('Everything is designed')
    expect(runway).toContain('Everything is designed')
    expect(runway).not.toContain('Complex software that ships, and moves the numbers.')
    const belowHero = (html: string) => html.slice(html.indexOf('<section data-experiment-section="client-proof"'))
    expect(belowHero(control).length).toBeGreaterThan(1000)
    expect(belowHero(runway)).toBe(belowHero(control))
  })
})
