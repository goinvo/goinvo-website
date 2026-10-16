import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { assignHomeHeroVariant, getMarketingFlagsSecret, marketingExperimentFlags } from '@/flags'
import { serialize } from 'flags/next'
import { getExperimentExposure, getPrecomputedExperimentVariant, homeHeroExperiment } from '@/lib/experiments/registry'
import { validateExperimentBeacon } from '@/lib/marketing/beaconValidation'
import { HomeConceptContent } from '@/components/home/HomeConceptContent'

/**
 * The component's props parameter is optional (`= {}`), which makes
 * createElement infer an empty props type and reject `heroVariant`. Naming the
 * props explicitly keeps the test honest without changing the component.
 */
const renderHome = (heroVariant: 'control' | 'runway') =>
  renderToStaticMarkup(
    React.createElement(HomeConceptContent as (props: Parameters<typeof HomeConceptContent>[0] & object) => React.ReactElement, {
      heroVariant,
    }),
  )

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

  it('renders the new positioning in both heroes and keeps the shared sections identical', () => {
    const control = renderHome('control')
    const runway = renderHome('runway')
    for (const [variant, html] of [['control', control], ['runway', runway]] as const) {
      expect(html.match(/<h1\b/g)).toHaveLength(1)
      expect(html.match(/data-experiment-section="hero"/g)).toHaveLength(1)
      expect(html).toContain(`data-hero-variant="${variant}"`)
      const hero = html.match(/<section\b[^>]*data-experiment-section="hero"[\s\S]*?<\/section>/)?.[0]
      expect(hero).toBeDefined()
      expect(hero).toContain('Better business by Design.')
      expect(hero).toContain('GoInvo is a business and systems reinvention studio.')
      expect(hero).toContain('better-business-by-design.webp')
      const heading = hero!.match(/<h1\b[\s\S]*?<\/h1>/)?.[0]
      expect(heading).toContain('class="sr-only"')
      expect(heading).toContain('alt=""')
      expect(heading).toContain('width="1200"')
      expect(heading).toContain('height="688"')
      expect(hero).toContain('href="#book"')
      expect(hero).toContain('Book a discovery call')
      expect(hero).toContain('href="/work"')
      expect(hero).toContain('Or see the work')
      expect(hero).not.toContain('Complex software that ships, and moves the numbers.')
      expect(hero).not.toContain('Everything is designed')
      expect(hero).not.toContain('Little of it is designed well.')
      const sections = Array.from(html.matchAll(/data-experiment-section="([^"]+)"/g), (match) => match[1])
      expect(sections.slice(0, 4)).toEqual(['hero', 'selected-work', 'client-proof', 'services'])
      expect(sections.filter((section) => section === 'selected-work')).toHaveLength(1)
    }
    expect(control).toContain('ipsosherodark.jpg')
    expect(control).toContain('Enterprise adoption')
    expect(control).not.toContain('class="eid-runway-belt"')
    expect(runway).toContain('class="eid-runway-belt"')
    expect(runway).not.toContain('ipsosherodark.jpg')
    const belowHero = (html: string) => {
      const work = html.indexOf('data-experiment-section="selected-work"')
      expect(work).toBeGreaterThan(0)
      return html.slice(html.lastIndexOf('<section', work))
    }
    expect(belowHero(control).length).toBeGreaterThan(1000)
    expect(belowHero(runway)).toBe(belowHero(control))
    expect(belowHero(control)).toContain('href="/work/ipsos-facto"')
    expect(belowHero(control)).toContain('href="/work/3m-coderyte"')
  })

  it('replaces the Focus and Range copy with the requested business and systems description', () => {
    const html = renderHome('control')
    const about = html.match(/<section\b[^>]*data-experiment-section="why-goinvo"[\s\S]*?<\/section>/)?.[0]
    expect(about).toBeDefined()
    const text = about!
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&rsquo;/g, '’')
      .replace(/\s+/g, ' ')
    for (const sentence of [
      'We design businesses, systems, products, and software.',
      'Sometimes the problem is the business model.',
      'Sometimes it’s the organization, the technology, or the 17 systems that refuse to talk to each other.',
      'We work across all of it.',
      'From Fortune 500s to federal agencies.',
      'From healthcare to enterprise systems.',
      'From strategy to working software used by millions.',
      'We find the problems, create multiple right answers, and build the best ones.',
      'Small teams. Senior humans. Shipped.',
    ]) expect(text.replace(/'/g, '’')).toContain(sentence)
    expect(about).not.toContain('Focus and Range.')
    expect(about).not.toContain('The generalist agencies')
    expect(about).not.toContain('That depth is the moat')
    for (const reason of ['Software, not slides', 'We meet you at any stage', 'Built for regulation', 'The proof is public']) {
      expect(about).toContain(reason)
    }
    console.log('Checked both hero variants, shared section order, 9 requested copy sentences, and 4 retained reasons')
  })
})
