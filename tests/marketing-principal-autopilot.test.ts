import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { GuidedTutorialOverlay } from '@/sanity/components/GuidedTutorialOverlay'
import {
  advanceScriptedAutopilotPlan,
  buildAutopilotCoachTutorial,
  buildPrincipalOutreachPlan,
  getPrincipalAutopilotNextLabel,
  getPrincipalOutreachPrerequisiteBlocker,
  refreshPrincipalOutreachPlan,
  type MarketingAutopilotPlan,
} from '@/sanity/tools/marketingTool'

const MARKETING_TOOL_SOURCE = readFileSync(
  new URL('../src/sanity/tools/marketingTool.tsx', import.meta.url),
  'utf8',
)
const PRINCIPAL_STEP_IDS = [
  'principal-plan-warm-network',
  'principal-outreach-intake',
  'principal-outreach-research',
  'principal-outreach-review',
  'principal-outreach-contact-log',
] as const

const READY_PREREQUISITES = {
  contactCount: 1,
  evidenceCount: 1,
  callReadyOfferCount: 1,
  researchedContactCount: 1,
  reviewedContactCount: 1,
  interactionCount: 1,
}

describe('principal outreach Autopilot', () => {
  it('builds a truthful end-to-end plan in execution order', () => {
    const plan = buildPrincipalOutreachPlan()

    expect(plan.id).toMatch(/^principal-outreach-/)
    expect(plan.steps.map((step) => step.id)).toEqual(PRINCIPAL_STEP_IDS)
    expect(plan.steps.map((step) => step.expectedAction)).toEqual([
      'outreach:preflight',
      'outreach:addContacts',
      'outreach:research',
      'outreach:review',
      'outreach:log',
    ])
    expect(plan.steps.map((step) => step.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
    expect(plan.currentStepId).toBe(PRINCIPAL_STEP_IDS[0])
    expect(plan.coachOpen).toBe(true)
    expect(plan.steps.find((step) => step.id === 'principal-outreach-contact-log')?.targetId).toBe('outreach-progress-tracker')
  })

  it('uses the progress tracker name consistently and puts scripted advancement in the footer', () => {
    const plan = buildPrincipalOutreachPlan()
    const planCopy = plan.steps
      .flatMap((step) => [step.title, step.instruction, step.why, step.requiredAction, step.nextAfter])
      .join('\n')

    expect(planCopy).toContain('Outreach progress tracker')
    expect(MARKETING_TOOL_SOURCE).not.toMatch(/This week's calls|\bcall list\b|follow-ups strip/i)
    expect(getPrincipalAutopilotNextLabel(PRINCIPAL_STEP_IDS[0])).toBe('Add Contacts')
    expect(getPrincipalAutopilotNextLabel(PRINCIPAL_STEP_IDS[1])).toBe('Enter a Contact Above')
    expect(getPrincipalAutopilotNextLabel(PRINCIPAL_STEP_IDS[4], READY_PREREQUISITES)).toBe('Finish Outreach Setup')
    expect(MARKETING_TOOL_SOURCE).toContain('!scriptedPlan && <div')
    expect(MARKETING_TOOL_SOURCE).toContain('? () => onChoice(step, primaryChoice, 0)')
    expect(MARKETING_TOOL_SOURCE).toContain('Checking live readiness…')
    expect(MARKETING_TOOL_SOURCE).toContain('Recheck after fixing this step')
    expect(MARKETING_TOOL_SOURCE).toContain('Autopilot advances only when the live readiness check passes.')
  })

  it('renders one purposeful footer action instead of redundant scripted choices', () => {
    const plan = buildPrincipalOutreachPlan()
    const tutorial = buildAutopilotCoachTutorial(plan, () => undefined, () => undefined)
    const html = renderToStaticMarkup(
      createElement(GuidedTutorialOverlay, {
        active: true,
        tutorial,
        stepIndex: 0,
        onStepChange: () => undefined,
        onClose: () => undefined,
        onRestart: () => undefined,
        onShowLibrary: () => undefined,
      }),
    )

    expect(html).toContain('Add Contacts')
    expect(html).not.toContain('Preflight checked — add contacts')
    expect(html).not.toContain('Keep setup open')
    expect(html).not.toContain('autopilot-coach-choice-principal-plan-warm-network')
  })

  it('names the missing work and disables advancement instead of offering a no-op next action', () => {
    const plan = buildPrincipalOutreachPlan()
    const blocked = {
      ...READY_PREREQUISITES,
      evidenceCount: 0,
    }
    const tutorial = buildAutopilotCoachTutorial(
      plan,
      () => undefined,
      () => undefined,
      {
        checkingPrerequisites: false,
        prerequisiteNotice: getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[0], blocked),
        contactCount: blocked.contactCount,
        principalPrerequisites: blocked,
      },
    )
    const html = renderToStaticMarkup(
      createElement(GuidedTutorialOverlay, {
        active: true,
        tutorial,
        stepIndex: 0,
        onStepChange: () => undefined,
        onClose: () => undefined,
        onRestart: () => undefined,
        onShowLibrary: () => undefined,
      }),
    )

    expect(html).toContain('Extract Work Evidence Above')
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('>Add Contacts<')
  })

  it('explains that an empty intake needs a contact before review', () => {
    const intakePlan = advanceScriptedAutopilotPlan(
      buildPrincipalOutreachPlan(),
      PRINCIPAL_STEP_IDS[0],
    )
    const tutorial = buildAutopilotCoachTutorial(intakePlan, () => undefined, () => undefined)
    const html = renderToStaticMarkup(
      createElement(GuidedTutorialOverlay, {
        active: true,
        tutorial,
        stepIndex: 1,
        onStepChange: () => undefined,
        onClose: () => undefined,
        onRestart: () => undefined,
        onShowLibrary: () => undefined,
      }),
    )

    expect(html).toContain('Enter a Contact Above')
    expect(html).toContain('disabled=""')
  })

  it('lets a returning principal continue when contacts already satisfy intake', () => {
    const intakePlan = advanceScriptedAutopilotPlan(
      buildPrincipalOutreachPlan(),
      PRINCIPAL_STEP_IDS[0],
    )
    const tutorial = buildAutopilotCoachTutorial(
      intakePlan,
      () => undefined,
      () => undefined,
      { checkingPrerequisites: false, prerequisiteNotice: null, contactCount: 2 },
    )
    const html = renderToStaticMarkup(
      createElement(GuidedTutorialOverlay, {
        active: true,
        tutorial,
        stepIndex: 1,
        onStepChange: () => undefined,
        onClose: () => undefined,
        onRestart: () => undefined,
        onShowLibrary: () => undefined,
      }),
    )

    expect(html).toContain('Research Contacts')
    expect(html).not.toContain('disabled=""')
  })

  it('does not confirm scripted work when known live prerequisites are missing', () => {
    const initial = buildPrincipalOutreachPlan()
    const noOffers = {
      ...READY_PREREQUISITES,
      contactCount: 0,
      evidenceCount: 0,
      callReadyOfferCount: 0,
      researchedContactCount: 0,
      reviewedContactCount: 0,
      interactionCount: 0,
    }

    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[0], noOffers)).toContain('real currency amount')
    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[0], noOffers)).toContain('Extract work evidence')
    expect(advanceScriptedAutopilotPlan(initial, PRINCIPAL_STEP_IDS[0], noOffers)).toBe(initial)

    const preflightComplete = advanceScriptedAutopilotPlan(initial, PRINCIPAL_STEP_IDS[0], {
      ...READY_PREREQUISITES,
      contactCount: 0,
    })
    expect(preflightComplete.currentStepId).toBe(PRINCIPAL_STEP_IDS[1])
    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[1], {
      ...READY_PREREQUISITES,
      contactCount: 0,
    })).toContain('Add at least one contact')
    expect(advanceScriptedAutopilotPlan(preflightComplete, PRINCIPAL_STEP_IDS[1], {
      ...READY_PREREQUISITES,
      contactCount: 0,
    })).toBe(preflightComplete)

    const contactsComplete = advanceScriptedAutopilotPlan(preflightComplete, PRINCIPAL_STEP_IDS[1], {
      ...READY_PREREQUISITES,
    })
    expect(contactsComplete.currentStepId).toBe(PRINCIPAL_STEP_IDS[2])
  })

  it('refuses to skip research, human review, or durable interaction logging', () => {
    let plan = buildPrincipalOutreachPlan()
    plan = advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[0], READY_PREREQUISITES)
    plan = advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[1], READY_PREREQUISITES)

    const withoutResearch = { ...READY_PREREQUISITES, researchedContactCount: 0 }
    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[2], withoutResearch)).toContain('Research at least one contact')
    expect(advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[2], withoutResearch)).toBe(plan)
    plan = advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[2], READY_PREREQUISITES)

    const withoutReview = { ...READY_PREREQUISITES, reviewedContactCount: 0 }
    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[3], withoutReview)).toContain('Approve at least one')
    expect(advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[3], withoutReview)).toBe(plan)
    plan = advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[3], READY_PREREQUISITES)

    const withoutInteraction = { ...READY_PREREQUISITES, interactionCount: 0 }
    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[4], withoutInteraction)).toContain('save the result')
    expect(advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[4], withoutInteraction)).toBe(plan)
  })

  it('persists every confirmed step so resume opens the next unfinished decision', () => {
    let plan = buildPrincipalOutreachPlan()

    for (let index = 0; index < PRINCIPAL_STEP_IDS.length; index += 1) {
      plan = advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[index])
      expect(plan.steps.slice(0, index + 1).every((step) => step.status === 'done')).toBe(true)

      const nextStepId = PRINCIPAL_STEP_IDS[index + 1]
      if (nextStepId) {
        expect(plan.currentStepId).toBe(nextStepId)
        expect(plan.steps[index + 1]?.status).toBe('current')
        expect(plan.coachOpen).toBe(true)
      }
    }

    expect(plan.steps.every((step) => step.status === 'done')).toBe(true)
    expect(plan.coachOpen).toBe(false)
  })

  it('does not skip ahead from a preview or mutate a non-scripted plan', () => {
    const plan = buildPrincipalOutreachPlan()
    expect(advanceScriptedAutopilotPlan(plan, PRINCIPAL_STEP_IDS[2])).toBe(plan)

    const nonScripted: MarketingAutopilotPlan = {
      ...plan,
      id: 'content-pipeline-example',
    }
    expect(advanceScriptedAutopilotPlan(nonScripted, PRINCIPAL_STEP_IDS[0])).toBe(nonScripted)
  })

  it('upgrades a saved two-step hand-off without losing completed work', () => {
    const current = buildPrincipalOutreachPlan()
    const legacy: MarketingAutopilotPlan = {
      ...current,
      id: 'principal-outreach-legacy-session',
      currentStepId: PRINCIPAL_STEP_IDS[1],
      steps: current.steps.slice(0, 2).map((step, index) => ({
        ...step,
        status: index === 0 ? 'done' : 'current',
      })),
    }

    const refreshed = refreshPrincipalOutreachPlan(legacy)

    expect(refreshed.id).toBe(legacy.id)
    expect(refreshed.steps.map((step) => step.id)).toEqual(PRINCIPAL_STEP_IDS)
    expect(refreshed.steps[0]?.status).toBe('done')
    expect(refreshed.steps[1]?.status).toBe('current')
    expect(refreshed.currentStepId).toBe(PRINCIPAL_STEP_IDS[1])
  })
})
