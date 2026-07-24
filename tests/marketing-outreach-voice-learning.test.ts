import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'
import { createOutreachVoiceLearningRequestTracker } from '@/sanity/components/marketing/OutreachWorkspace'

const outreachSource = readFileSync(
  new URL('../src/sanity/components/marketing/OutreachWorkspace.tsx', import.meta.url),
  'utf8',
).replace(/\r\n/g, '\n')

function sourceBetween(start: string, end: string): string {
  const startIndex = outreachSource.indexOf(start)
  const endIndex = outreachSource.indexOf(end, startIndex)
  expect(startIndex, `Expected Outreach source to contain ${start}`).toBeGreaterThanOrEqual(0)
  expect(endIndex, `Expected Outreach source to contain ${end} after ${start}`).toBeGreaterThan(
    startIndex,
  )
  return outreachSource.slice(startIndex, endIndex)
}

describe('Outreach brand-voice learning review', () => {
  it('prevents a late request A from overwriting a newer request B for the same contact', () => {
    const requests = createOutreachVoiceLearningRequestTracker()
    const requestA = requests.begin('contact-1')
    const requestB = requests.begin('contact-1')
    let renderedProposal = 'none'
    const settle = (requestId: string, proposal: string) => {
      if (requests.isCurrent('contact-1', requestId)) renderedProposal = proposal
    }

    settle(requestB, 'proposal B')
    settle(requestA, 'late proposal A')

    expect(requests.isCurrent('contact-1', requestA)).toBe(false)
    expect(requests.isCurrent('contact-1', requestB)).toBe(true)
    expect(renderedProposal).toBe('proposal B')
  })

  it('prevents dismissal from resurrecting an in-flight proposal', () => {
    const requests = createOutreachVoiceLearningRequestTracker()
    const request = requests.begin('contact-1')
    let renderedProposal = 'dismissed'
    requests.invalidate('contact-1')

    if (requests.isCurrent('contact-1', request)) renderedProposal = 'late proposal'

    expect(requests.isCurrent('contact-1', request)).toBe(false)
    expect(renderedProposal).toBe('dismissed')
  })

  it('requests a proposal only after a material opener edit generated with a known voice', () => {
    const materialComparison = sourceBetween(
      'function hasMaterialOutreachVoiceEdit(',
      'function voiceLearningFailureMessage(',
    )
    expect(materialComparison).toContain('normalizeVoiceEditText(before.suggestedOpener)')
    expect(materialComparison).toContain('normalizeVoiceEditText(after.suggestedOpener)')
    expect(materialComparison).not.toContain('before.callBrief')
    expect(materialComparison).not.toContain('after.callBrief')

    const saveFlow = sourceBetween('const saveBriefEdit = async', 'const saveLog = async')
    expect(saveFlow).toContain("const unset = ['researchReviewedAt']")
    expect(saveFlow).toContain('contact.researchBrandVoiceKey && hasMaterialOutreachVoiceEdit(before, after)')
    expect(saveFlow).toContain('await patch.commit()')
    expect(saveFlow.indexOf('await patch.commit()')).toBeLessThan(
      saveFlow.indexOf('void requestVoiceLearningProposal('),
    )
    expect(saveFlow).toContain('contact.researchBrandVoiceKey')
    expect(outreachSource).toContain('call-brief edits do not train the voice')
  })

  it('uses the authenticated marketing request boundary for proposal and explicit apply actions', () => {
    const proposalFlow = sourceBetween(
      'const requestVoiceLearningProposal = async',
      'const dismissVoiceLearning =',
    )
    expect(proposalFlow).toContain("'/api/marketing/brand-voice/learn'")
    expect(proposalFlow).toContain("action: 'propose'")
    expect(proposalFlow).toContain("surface: 'outreach'")
    expect(proposalFlow).toContain('before,')
    expect(proposalFlow).toContain('after,')
    expect(proposalFlow).toContain("'POST',\n        outreachClient")
    expect(proposalFlow).toContain('voiceLearningRequests.begin(contactId)')
    expect(
      proposalFlow.match(/voiceLearningRequests\.isCurrent\(contactId, requestId\)/g),
    ).toHaveLength(2)

    const dismissFlow = sourceBetween('const dismissVoiceLearning =', 'const applyVoiceLearning =')
    expect(dismissFlow).toContain('voiceLearningRequests.invalidate(contactId)')

    const applyFlow = sourceBetween('const applyVoiceLearning = async', 'const startEditBrief =')
    expect(applyFlow).toContain('examples: false')
    expect(applyFlow).toContain("action: 'apply', proposal, selection: outreachSelection")
    expect(applyFlow).toContain("'POST',\n        outreachClient")
    expect(applyFlow).toContain('await loadOutreach()')
    expect(applyFlow).toContain('selected learning will guide future drafts')
    expect(applyFlow).toContain('voiceLearningRequests.begin(contactId)')
    expect(applyFlow).toContain('voiceLearningRequests.isCurrent(contactId, requestId)')
  })

  it('keeps learning proposal-only until the human reviews selected principles', () => {
    expect(outreachSource).toContain('<BrandVoiceLearningReview')
    expect(outreachSource).toContain('onApply={(selection) => applyVoiceLearning(contact._id, selection)}')
    expect(outreachSource).toContain('onDismiss={() => dismissVoiceLearning(contact._id)}')
    expect(outreachSource).toContain('will not update the voice without your review')
    expect(outreachSource).toContain('nothing is learned until you approve it')
    expect(outreachSource).toContain('The saved opener and brief did not change')
    expect(outreachSource).toContain('{ ...voiceLearning.proposal, curatedExamples: [] }')
    expect(outreachSource).toContain('proposal={outreachLearningProposal}')
    expect(outreachSource).not.toContain('voiceLearningBefore')
    expect(outreachSource).not.toContain('voiceLearningAfter')
    expect(outreachSource).not.toContain('retryInput')
  })

  it('recognizes expired, modified, and stale signed proposals without retaining the old diff', () => {
    const failureCopy = sourceBetween(
      'function needsFreshVoiceLearningProposal(',
      'function canManagePrivateOutreach(',
    )
    expect(failureCopy).toContain('expired|modified|invalid|incomplete')
    expect(failureCopy).toContain('This voice-learning proposal expired or was modified')
    expect(failureCopy).toContain('The brand voice changed after this proposal was prepared')
    expect(failureCopy).toContain('Edit and save the suggested opener')

    const applyFlow = sourceBetween('const applyVoiceLearning = async', 'const startEditBrief =')
    expect(applyFlow).toContain('needsFreshVoiceLearningProposal(err)')
    expect(applyFlow).toContain("{ status: 'error', error, needsFreshProposal: true }")

    const stateType = sourceBetween(
      'type OutreachVoiceLearningState =',
      'function normalizeVoiceEditText(',
    )
    expect(stateType).not.toContain('before')
    expect(stateType).not.toContain('after')
    expect(stateType).not.toContain('retry')
  })

  it('offers a new opener-edit flow instead of replaying an unsigned raw diff', () => {
    const freshFlow = sourceBetween(
      'const startFreshVoiceLearningProposal =',
      'const saveBriefEdit = async',
    )
    expect(freshFlow).toContain('startEditBrief(contact)')
    expect(freshFlow).toContain('Edit the suggested opener, then save it')
    const startEditFlow = sourceBetween('const startEditBrief =', 'const startFreshVoiceLearningProposal =')
    expect(startEditFlow).toContain('dismissVoiceLearning(contact._id)')
    expect(outreachSource).toContain('Edit opener for fresh proposal')
    expect(outreachSource).not.toContain('Try proposal again')
    expect(outreachSource).not.toContain('voiceLearningRetry.before')
    expect(outreachSource).not.toContain('voiceLearningRetry.after')
  })

  it('keeps the prior revision-conflict recovery copy explicit', () => {
    const failureCopy = sourceBetween(
      'function voiceLearningFailureMessage(',
      'function canManagePrivateOutreach(',
    )
    expect(failureCopy).toContain('The brand voice changed after this proposal was prepared')
    expect(failureCopy).toContain('nothing was applied')
  })
})
