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
  MARKETING_GUIDE_ARTICLE_BY_VIEW,
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

  it('routes contextual Marketing help to the active workspace article', () => {
    expect(MARKETING_GUIDE_ARTICLE_BY_VIEW).toEqual({
      dashboard: 'marketing.dashboard',
      research: 'marketing.research',
      seo: 'marketing.seo',
      strategy: 'marketing.strategy',
      strategyBrief: 'marketing.strategy-brief',
      outreach: 'marketing.outreach',
      workEvidence: 'marketing.evidence',
      abTesting: 'marketing.measure',
      calendar: 'marketing.calendar',
      campaigns: 'marketing.campaigns',
      funnels: 'marketing.funnels',
      templates: 'marketing.templates',
      channels: 'marketing.channels',
      analytics: 'marketing.analytics',
      linkTree: 'marketing.quick-links',
    })
    expect(new Set(Object.values(MARKETING_GUIDE_ARTICLE_BY_VIEW)).size).toBe(15)
  })

  it('documents the reviewed Outreach workflow, limits, recovery, and AI privacy boundary', () => {
    const source = readFileSync(new URL('../src/sanity/tools/gettingStarted.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain("id: 'marketing.outreach.scope'")
    expect(source).toContain('Use the 60-second principal path')
    expect(source).toContain('Add → Research → Review and tune the')
    expect(source).toContain('does not discover external prospects')
    expect(source).toContain('web search enabled')
    expect(source).toContain('<strong>Needs review</strong>')
    expect(source).toContain('<strong>Make this sound like me</strong>')
    expect(source).toContain('including voice edits')
    expect(source).toContain("id: 'marketing.outreach.tracker'")
    expect(source).toContain('due and overdue')
    expect(source).toContain('<strong>Why next</strong>')
    expect(source).toContain("id: 'marketing.outreach.modality'")
    expect(source).toContain('Preferred, Unavailable, Unresponsive, or Do not use')
    expect(source).toContain('<strong>Edit contact info</strong>')
    expect(source).toContain('never sends anything')
    expect(source).toContain("id: 'marketing.outreach.recover'")
    expect(source).toContain("id: 'marketing.evidence.reextract'")
    expect(source).toContain('Bulk re-extraction advances through every published case study')
  })

  it('documents the shared voice library, factual boundary, and Outreach override', () => {
    const source = readFileSync(new URL('../src/sanity/tools/gettingStarted.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const voiceGuide = source.slice(
      source.indexOf("id: 'marketing.channels.voice-library'"),
      source.indexOf("id: 'marketing.channels.first'"),
    )
    const normalizedVoiceGuide = voiceGuide.replace(/\s+/g, ' ')

    expect(voiceGuide).toContain("id: 'marketing.channels.voice-library'")
    expect(voiceGuide).toContain('publish-safe guidance only')
    expect(voiceGuide).toContain("id: 'marketing.channels.voice-default'")
    expect(voiceGuide).toContain('choose one active default')
    expect(voiceGuide).toContain('generation across the Marketing Suite')
    expect(voiceGuide).toContain('<strong>Archive</strong>')
    expect(voiceGuide).toContain("id: 'marketing.channels.voice-boundary'")
    expect(voiceGuide).toContain('never changes verified facts, evidence, identity checks')
    expect(voiceGuide).toContain('feasibility scores, citations, URLs, prices, metrics, statuses')
    expect(voiceGuide).toContain("id: 'marketing.channels.voice-learning'")
    expect(voiceGuide).toContain('Nothing changes the voice automatically')
    expect(voiceGuide).toContain('ignores factual corrections')
    expect(voiceGuide).toContain("id: 'marketing.channels.voice-examples'")
    expect(voiceGuide).toContain('at most six')
    expect(voiceGuide).toContain('near-duplicates encourage overfitting')
    expect(normalizedVoiceGuide).toContain('affects future drafts only')
    expect(normalizedVoiceGuide).toContain('does not rewrite the document you just edited')
    expect(voiceGuide).toContain("id: 'marketing.channels.voice-outreach'")
    expect(voiceGuide).toContain('per-contact selection overrides the suite default')
    expect(voiceGuide).toContain('<strong>Make this sound like me</strong>')
    expect(voiceGuide).toContain('clears approval')
    expect(normalizedVoiceGuide).toContain('never applies that proposal automatically')
  })

  it('documents the Marketing safety boundaries found in the principal audit', () => {
    const source = readFileSync(new URL('../src/sanity/tools/gettingStarted.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const normalizedSource = source.replace(/\s+/g, ' ')

    expect(source).toContain("id: 'marketing.research.review'")
    expect(normalizedSource).toContain('an Idea far in the future does not make the intervening calendar healthy')
    expect(normalizedSource).toContain('due relationship and revenue work ranks ahead')
    expect(source).toContain('Only explicitly trusted findings')
    expect(source).toContain('Conversion is one reviewable operation')
    expect(source).toContain('use limited provider credits')
    expect(normalizedSource).toContain('Static claims in the brief do not carry per-claim verification')
    expect(source).toContain('<strong>Add A/B test</strong>')
    expect(normalizedSource).toContain('Signals from another experiment never belong in this result')
    expect(source).toContain("id: 'marketing.channels.posture'")
    expect(source).toContain("id: 'marketing.channels.ai-model'")
    expect(normalizedSource).toContain('Working URL is for')
    expect(source).toContain("id: 'marketing.calendar.preview-publish'")
    expect(normalizedSource).toContain('only verified Connected sources')
    expect(normalizedSource).toContain('Internal Working URLs are')
    expect(normalizedSource).toContain('intentionally empty rather than filled with hidden fallbacks')
  })

  it('keeps Studio metadata private and Studio-specific', () => {
    expect(studioMetadata.title).toBe('GoInvo Studio')
    expect(studioMetadata.description).toContain('Internal GoInvo')
    expect(studioMetadata.robots).toMatchObject({ index: false, follow: false, nocache: true })
  })
})
