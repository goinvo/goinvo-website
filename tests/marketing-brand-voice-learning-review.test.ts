import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { BrandVoiceLearningProposal } from '@/lib/marketing/brandVoiceLearning'
import {
  BrandVoiceLearningReview,
  defaultBrandVoiceLearningSelection,
} from '@/sanity/components/marketing/BrandVoiceLearningReview'

function proposal(
  overrides: Partial<BrandVoiceLearningProposal> = {},
): BrandVoiceLearningProposal {
  return {
    voice: { key: 'principal', name: 'Principal voice' },
    surface: 'outreach',
    settingsRevision: 'settings-revision-1',
    summary: 'The edit made the opener direct, conversational, and easier to scan.',
    confidence: 'high',
    changedFields: ['suggestedOpener', 'callBrief'],
    guidanceReplacement: 'Lead with the useful point, then add just enough context.',
    doAdditions: ['Use short, concrete openings.', 'Make the next step explicit.'],
    avoidAdditions: ['Avoid throat-clearing.', 'Avoid generic superlatives.'],
    curatedExamples: [
      {
        text: 'Here is the decision in one sentence. The context follows if you need it.',
        principles: ['direct opening', 'layered detail'],
        reason: 'It demonstrates the concise lead without relying on a specific client or claim.',
      },
      {
        text: 'If this is useful, let us spend twenty minutes pressure-testing the approach.',
        principles: ['specific next step', 'plain language'],
        reason: 'It represents a low-pressure call to action in a different message position.',
      },
    ],
    ...overrides,
  }
}

describe('brand voice learning review defaults', () => {
  it('preselects only additive rules even when a proposal claims high confidence', () => {
    expect(defaultBrandVoiceLearningSelection(proposal())).toEqual({
      guidance: false,
      do: ['Use short, concrete openings.', 'Make the next step explicit.'],
      avoid: ['Avoid throat-clearing.', 'Avoid generic superlatives.'],
      examples: false,
    })
  })

  it('keeps medium-confidence guidance and examples opt-in', () => {
    expect(defaultBrandVoiceLearningSelection(proposal({ confidence: 'medium' }))).toEqual({
      guidance: false,
      do: ['Use short, concrete openings.', 'Make the next step explicit.'],
      avoid: ['Avoid throat-clearing.', 'Avoid generic superlatives.'],
      examples: false,
    })
  })

  it('starts low-confidence Outreach proposals with nothing selected', () => {
    expect(defaultBrandVoiceLearningSelection(proposal({ confidence: 'low' }))).toEqual({
      guidance: false,
      do: [],
      avoid: [],
      examples: false,
    })
  })
})

describe('BrandVoiceLearningReview', () => {
  it('explains the review boundary and gives each proposed principle its own control', () => {
    const markup = renderToStaticMarkup(
      createElement(BrandVoiceLearningReview, {
        proposal: proposal(),
        onApply: vi.fn(),
        onDismiss: vi.fn(),
      }),
    )

    expect(markup).toContain('Voice learning proposal for Principal voice')
    expect(markup).toContain('Only the items you select will affect future drafts')
    expect(markup).toContain('your current document will not change')
    expect(markup).toContain('publish-safe shared settings')
    expect(markup).toContain('never approve')
    expect(markup).toContain('aria-label="Use proposed voice guidance"')
    expect(markup).toContain('aria-label="Learn do principle: Use short, concrete openings."')
    expect(markup).toContain('aria-label="Learn avoid principle: Avoid throat-clearing."')
    expect(markup).toContain(
      'aria-label="Replace saved representative examples with exactly the displayed set"',
    )
    expect(markup).toContain('replaces the voice’s existing examples with exactly the set shown below')
    expect(markup).toContain('Saved snippets not shown here will be removed')
    expect(markup).toContain('Leave this unchecked to keep the current examples')
    expect(markup).toContain('Dismiss proposal')
    expect(markup).toContain('Apply selected learning')
  })

  it('treats examples as one curated set and renders at most six diverse snippets', () => {
    const curatedExamples = Array.from({ length: 7 }, (_, index) => ({
      text: `Representative snippet ${index + 1}`,
      principles: [`Principle ${index + 1}`, 'Second principle', 'Third principle', 'Hidden fourth'],
      reason: `This snippet covers use case ${index + 1}.`,
    }))
    const markup = renderToStaticMarkup(
      createElement(BrandVoiceLearningReview, {
        proposal: proposal({ curatedExamples }),
        onApply: vi.fn(),
        onDismiss: vi.fn(),
      }),
    )

    expect(markup.match(/data-representative-example="true"/g)).toHaveLength(6)
    expect(markup).toContain('Representative snippet 6')
    expect(markup).not.toContain('Representative snippet 7')
    expect(markup).not.toContain('Hidden fourth')
    expect(
      markup.match(/Replace saved representative examples with exactly the displayed set/g),
    ).toHaveLength(1)
  })

  it('makes low-confidence generalization cautious and non-actionable by default', () => {
    const markup = renderToStaticMarkup(
      createElement(BrandVoiceLearningReview, {
        proposal: proposal({ confidence: 'low' }),
        onApply: vi.fn(),
        onDismiss: vi.fn(),
      }),
    )

    expect(markup).toContain('Nothing is preselected')
    expect(markup).toContain('may be factual or too specific to generalize')
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Apply selected learning<\/button>/)
  })

  it('announces apply progress and errors without disabling review dismissal permanently', () => {
    const applyingMarkup = renderToStaticMarkup(
      createElement(BrandVoiceLearningReview, {
        proposal: proposal(),
        applying: true,
        onApply: vi.fn(),
        onDismiss: vi.fn(),
      }),
    )
    const errorMarkup = renderToStaticMarkup(
      createElement(BrandVoiceLearningReview, {
        proposal: proposal(),
        error: 'The voice changed. Review a fresh proposal.',
        onApply: vi.fn(),
        onDismiss: vi.fn(),
      }),
    )

    expect(applyingMarkup).toContain('role="status"')
    expect(applyingMarkup).toContain('Applying the selected learning to future drafts')
    expect(applyingMarkup).toContain('aria-busy="true"')
    expect(errorMarkup).toContain('role="alert"')
    expect(errorMarkup).toContain('The voice changed. Review a fresh proposal.')
    expect(errorMarkup).toContain('Dismiss proposal')
  })
})
