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
  'principal-outreach-call',
  'principal-outreach-log',
] as const

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
      'outreach:call',
      'outreach:log',
    ])
    expect(plan.steps.map((step) => step.status)).toEqual([
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
    expect(plan.currentStepId).toBe(PRINCIPAL_STEP_IDS[0])
    expect(plan.coachOpen).toBe(true)
    expect(plan.steps.find((step) => step.id === 'principal-outreach-call')?.targetId).toBe('outreach-progress-tracker')
  })

  it('uses the progress tracker name consistently and puts scripted advancement in the footer', () => {
    const plan = buildPrincipalOutreachPlan()
    const planCopy = plan.steps
      .flatMap((step) => [step.title, step.instruction, step.why, step.requiredAction, step.nextAfter])
      .join('\n')

    expect(planCopy).toContain('Outreach progress tracker')
    expect(MARKETING_TOOL_SOURCE).not.toMatch(/This week's calls|\bcall list\b|follow-ups strip/i)
    expect(getPrincipalAutopilotNextLabel(PRINCIPAL_STEP_IDS[0])).toBe('Add Contacts')
    expect(getPrincipalAutopilotNextLabel(PRINCIPAL_STEP_IDS[1])).toBe('Check Names')
    expect(getPrincipalAutopilotNextLabel(PRINCIPAL_STEP_IDS[5])).toBe('Finish')
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

  it('uses Check Names as the empty-intake action before a preview exists', () => {
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

    expect(html).toContain('Check Names')
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
    const noOffers = { contactCount: 0, callReadyOfferCount: 0 }

    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[0], noOffers)).toContain('real currency amount')
    expect(advanceScriptedAutopilotPlan(initial, PRINCIPAL_STEP_IDS[0], noOffers)).toBe(initial)

    const preflightComplete = advanceScriptedAutopilotPlan(initial, PRINCIPAL_STEP_IDS[0], {
      contactCount: 0,
      callReadyOfferCount: 1,
    })
    expect(preflightComplete.currentStepId).toBe(PRINCIPAL_STEP_IDS[1])
    expect(getPrincipalOutreachPrerequisiteBlocker(PRINCIPAL_STEP_IDS[1], {
      contactCount: 0,
      callReadyOfferCount: 1,
    })).toContain('Add at least one contact')
    expect(advanceScriptedAutopilotPlan(preflightComplete, PRINCIPAL_STEP_IDS[1], {
      contactCount: 0,
      callReadyOfferCount: 1,
    })).toBe(preflightComplete)

    const contactsComplete = advanceScriptedAutopilotPlan(preflightComplete, PRINCIPAL_STEP_IDS[1], {
      contactCount: 1,
      callReadyOfferCount: 1,
    })
    expect(contactsComplete.currentStepId).toBe(PRINCIPAL_STEP_IDS[2])
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
