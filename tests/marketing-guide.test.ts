import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { GuidedTutorialOverlay, nextGuidedTutorialFocusIndex } from '@/sanity/components/GuidedTutorialOverlay'
import { defaultDesignerWorkflowTutorial } from '@/sanity/tutorials/designerWorkflowTutorials'
import {
  Select,
  acknowledgeMarketingTutorialHandoff,
  buildMarketingShareUrl,
  createMarketingTutorialHandoff,
  marketingUrlWithoutTutorialParam,
  parseMarketingTutorialHandoff,
  shouldGuardMarketingNavigationClick,
  shouldClearMarketingTutorialHandoff,
} from '@/sanity/tools/marketingTool'
import { metadata as studioMetadata } from '@/app/studio/[[...tool]]/layout'

describe('marketing guide and tutorial behavior', () => {
  it('renders the guided tutorial as a labelled, keyboard-addressable dialog', () => {
    const html = renderToStaticMarkup(
      createElement(GuidedTutorialOverlay, {
        active: true,
        tutorial: defaultDesignerWorkflowTutorial,
        stepIndex: 0,
        onStepChange: vi.fn(),
        onClose: vi.fn(),
        onRestart: vi.fn(),
        onShowLibrary: vi.fn(),
      }),
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('aria-labelledby=')
    expect(html).toContain('aria-describedby=')
    expect(html).toContain('aria-label="Close tutorial"')
    expect(html).toContain('aria-label="Tutorial progress"')
  })

  it('cycles focus in both directions through the tutorial and highlighted action', () => {
    expect(nextGuidedTutorialFocusIndex(-1, 4)).toBe(0)
    expect(nextGuidedTutorialFocusIndex(3, 4)).toBe(0)
    expect(nextGuidedTutorialFocusIndex(0, 4, true)).toBe(3)
    expect(nextGuidedTutorialFocusIndex(2, 4, true)).toBe(1)
  })

  it('renders an accessible label on the shared select when supplied', () => {
    const html = renderToStaticMarkup(
      createElement(Select, {
        value: 'one',
        options: [{ value: 'one', title: 'One' }],
        onChange: vi.fn(),
        ariaLabel: 'Choose a test option',
      }),
    )

    expect(html).toContain('aria-label="Choose a test option"')
  })

  it('removes transient tutorial state from synced and copied URLs', () => {
    const current = 'https://www.goinvo.com/studio/marketing?view=seo&role=principal&designerWorkflowTutorial=marketing-view-tour'
    const consumed = new URL(marketingUrlWithoutTutorialParam(current))
    expect(consumed.searchParams.has('designerWorkflowTutorial')).toBe(false)
    expect(consumed.searchParams.get('view')).toBe('seo')

    const shared = new URL(buildMarketingShareUrl(current, 'research', 'coworker'))
    expect(shared.searchParams.get('view')).toBe('research')
    expect(shared.searchParams.has('role')).toBe(false)
    expect(shared.searchParams.has('designerWorkflowTutorial')).toBe(false)
  })

  it('keeps an explicit tutorial handoff alive across the URL-consumption remount', () => {
    const firstMount = createMarketingTutorialHandoff(
      'marketing-view-tour',
      false,
      1_000,
      'explicit-tour-token',
    )
    const firstAcknowledgement = acknowledgeMarketingTutorialHandoff(firstMount, 1_100)

    const remounted = parseMarketingTutorialHandoff(JSON.stringify(firstAcknowledgement), 1_150)
    expect(remounted).toMatchObject({
      token: 'explicit-tour-token',
      tutorialId: 'marketing-view-tour',
      acknowledgedAt: 1_100,
    })

    const stableAcknowledgement = acknowledgeMarketingTutorialHandoff(remounted!, 1_200)
    expect(shouldClearMarketingTutorialHandoff(stableAcknowledgement, 'explicit-tour-token', 1_100)).toBe(false)
    expect(shouldClearMarketingTutorialHandoff(stableAcknowledgement, 'explicit-tour-token', 1_200)).toBe(true)
  })

  it('guards only same-tab navigation that can discard the current workspace', () => {
    const baseClick = { href: '/studio/structure', button: 0 }
    expect(shouldGuardMarketingNavigationClick(baseClick)).toBe(true)
    expect(shouldGuardMarketingNavigationClick({ ...baseClick, ctrlKey: true })).toBe(false)
    expect(shouldGuardMarketingNavigationClick({ ...baseClick, target: '_blank' })).toBe(false)
    expect(shouldGuardMarketingNavigationClick({ ...baseClick, download: true })).toBe(false)
    expect(shouldGuardMarketingNavigationClick({ ...baseClick, href: '#section' })).toBe(false)
  })

  it('covers every marketing workspace with an exact deep link', () => {
    const source = readFileSync(new URL('../src/sanity/tools/gettingStarted.tsx', import.meta.url), 'utf8')
    const expectedLinks = [
      ['marketing.dashboard', 'dashboard'],
      ['marketing.research', 'research'],
      ['marketing.seo', 'seo'],
      ['marketing.strategy', 'strategy'],
      ['marketing.strategy-brief', 'strategyBrief'],
      ['marketing.outreach', 'outreach'],
      ['marketing.evidence', 'workEvidence'],
      ['marketing.measure', 'abTesting'],
      ['marketing.calendar', 'calendar'],
      ['marketing.campaigns', 'campaigns'],
      ['marketing.funnels', 'funnels'],
      ['marketing.templates', 'templates'],
      ['marketing.channels', 'channels'],
      ['marketing.analytics', 'analytics'],
      ['marketing.quick-links', 'linkTree'],
    ] as const

    for (const [articleId, view] of expectedLinks) {
      expect(source, `Missing guide article ${articleId}`).toContain(`id: '${articleId}'`)
      expect(source, `Missing exact deep link for ${view}`).toContain(`path: '/marketing?view=${view}'`)
    }
  })

  it('keeps Studio metadata private and Studio-specific', () => {
    expect(studioMetadata.title).toBe('GoInvo Studio')
    expect(studioMetadata.description).toContain('Internal GoInvo')
    expect(studioMetadata.robots).toMatchObject({ index: false, follow: false, nocache: true })
  })
})
