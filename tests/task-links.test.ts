import { describe, expect, it } from 'vitest'

import {
  isAnswerableInSlack,
  isDecisionTask,
  MARKETING_CONTACT_ACTION_QUERY_PARAM,
  MARKETING_CONTACT_QUERY_PARAM,
  MARKETING_FOCUS_QUERY_PARAM,
  MARKETING_OWNER_QUERY_PARAM,
  MARKETING_TASK_QUERY_PARAM,
  resolveTaskView,
  studioTaskUrl,
  studioViewUrl,
} from '@/lib/marketing/taskLinks'

describe('resolveTaskView', () => {
  it('uses the view the task names', () => {
    expect(resolveTaskView({ targetView: 'outreach' })).toBe('outreach')
    expect(resolveTaskView({ targetView: 'shop' })).toBe('shop')
  })

  it('falls back to the kind when the view is unusable', () => {
    // targetView is free text on the document, so it can be anything.
    expect(resolveTaskView({ targetView: 'nonsense', kind: 'content' })).toBe('calendar')
    expect(resolveTaskView({ kind: 'outreach' })).toBe('outreach')
  })

  it('lands somewhere real rather than nowhere', () => {
    expect(resolveTaskView({})).toBe('thisWeek')
    expect(resolveTaskView({ targetView: '', kind: 'unknown-kind' })).toBe('thisWeek')
  })

  it('sends a decision to This week first, whatever view the record names — that is where it can be answered', () => {
    expect(resolveTaskView({ kind: 'decision', targetView: 'outreach' })).toBe('thisWeek')
    expect(resolveTaskView({ kind: 'outreach', status: 'needsHuman', humanQuestion: 'Which offer first?', targetView: 'outreach' })).toBe(
      'thisWeek',
    )
  })

  it('does not treat a task somebody passed on as a decision', () => {
    const passed = { kind: 'outreach', status: 'needsHuman', humanQuestion: 'Eric passed on this — who should pick it up?', targetView: 'outreach' }
    expect(isDecisionTask(passed)).toBe(false)
    expect(resolveTaskView(passed)).toBe('outreach')
  })
})

describe('studioViewUrl', () => {
  const BASE = 'https://www.goinvo.com'
  const params = (url: string) => Object.fromEntries(new URL(url).searchParams)

  it('names the view, always — an unknown one becomes This week rather than the last tab opened', () => {
    expect(params(studioViewUrl(BASE, 'outreach'))).toEqual({ view: 'outreach' })
    expect(params(studioViewUrl(BASE, 'nonsense'))).toEqual({ view: 'thisWeek' })
    expect(studioViewUrl(`${BASE}/`, 'calendar')).toBe(`${BASE}/studio/marketing?view=calendar`)
  })

  it('lands on the thing: a task, a contact and what to do about them, a person, a section', () => {
    expect(params(studioViewUrl(BASE, 'thisWeek', { task: 'op1' }))).toEqual({ view: 'thisWeek', [MARKETING_TASK_QUERY_PARAM]: 'op1' })
    expect(params(studioViewUrl(BASE, 'outreach', { contact: 'marketingContact.jane', contactAction: 'log' }))).toEqual({
      view: 'outreach',
      [MARKETING_CONTACT_QUERY_PARAM]: 'marketingContact.jane',
      [MARKETING_CONTACT_ACTION_QUERY_PARAM]: 'log',
    })
    expect(params(studioViewUrl(BASE, 'thisWeek', { owner: 'Juhan', focus: 'followUps' }))).toEqual({
      view: 'thisWeek',
      [MARKETING_OWNER_QUERY_PARAM]: 'Juhan',
      [MARKETING_FOCUS_QUERY_PARAM]: 'followUps',
    })
  })

  it('leaves off what does not apply: an action with no contact, a focus the page has no section for', () => {
    expect(params(studioViewUrl(BASE, 'outreach', { contactAction: 'prep' }))).toEqual({ view: 'outreach' })
    expect(params(studioViewUrl(BASE, 'outreach', { contact: 'c1', contactAction: 'call' as 'prep' }))).toEqual({
      view: 'outreach',
      contact: 'c1',
    })
    expect(params(studioViewUrl(BASE, 'thisWeek', { focus: 'everything' as 'caught', owner: '  ' }))).toEqual({ view: 'thisWeek' })
  })

  it('pins the parameter names the Studio reads', () => {
    expect([MARKETING_CONTACT_QUERY_PARAM, MARKETING_CONTACT_ACTION_QUERY_PARAM, MARKETING_OWNER_QUERY_PARAM, MARKETING_FOCUS_QUERY_PARAM]).toEqual([
      'contact',
      'action',
      'owner',
      'focus',
    ])
  })

  it('escapes what it is given, and returns nothing without an absolute base', () => {
    expect(studioViewUrl(BASE, 'thisWeek', { owner: 'Jen & Co' })).toContain('owner=Jen+%26+Co')
    expect(studioViewUrl(undefined, 'thisWeek')).toBe('')
    expect(studioViewUrl('www.goinvo.com', 'thisWeek')).toBe('')
    expect(studioViewUrl('javascript:alert(1)', 'thisWeek')).toBe('')
  })
})

describe('studioTaskUrl', () => {
  it('deep-links to the view and names the task', () => {
    const url = studioTaskUrl({ baseUrl: 'https://www.goinvo.com', taskId: 'op1', targetView: 'outreach' })
    expect(url).toContain('/studio/marketing?')
    expect(url).toContain('view=outreach')
    expect(url).toContain(`${MARKETING_TASK_QUERY_PARAM}=op1`)
  })

  it('tolerates a trailing slash on the base', () => {
    expect(studioTaskUrl({ baseUrl: 'https://x.test/', taskId: 'op1' })).toContain('https://x.test/studio')
  })

  it('returns nothing without an absolute base, rather than a relative link', () => {
    // Slack silently drops a button whose url it cannot parse, which looks
    // exactly like the button being broken.
    expect(studioTaskUrl({ taskId: 'op1' })).toBe('')
    expect(studioTaskUrl({ baseUrl: 'https://x.test', taskId: '' })).toBe('')
  })

  it('escapes an id that would otherwise break the query string', () => {
    const url = studioTaskUrl({ baseUrl: 'https://x.test', taskId: 'op 1&x=2' })
    expect(url).toContain('op+1%26x%3D2')
  })

  it('links a decision to This week, where it can be answered', () => {
    const url = studioTaskUrl({ baseUrl: 'https://www.goinvo.com', taskId: 'op1', kind: 'decision', targetView: 'outreach' })
    expect(url).toBe('https://www.goinvo.com/studio/marketing?view=thisWeek&task=op1')
  })
})

describe('isAnswerableInSlack', () => {
  it('is true only for a decision that has a question', () => {
    expect(isAnswerableInSlack({ kind: 'decision', humanQuestion: 'Which bands?' })).toBe(true)
  })

  it('is false for work that needs a person and a keyboard elsewhere', () => {
    // Offering a text box for "write the article" would be a lie.
    expect(isAnswerableInSlack({ kind: 'content', humanQuestion: 'Which bands?' })).toBe(false)
    expect(isAnswerableInSlack({ kind: 'decision' })).toBe(false)
    expect(isAnswerableInSlack({})).toBe(false)
  })
})

describe('the plan link must name its view', () => {
  it('never links to the bare Studio path', () => {
    // Without ?view= the Studio restores the last view from localStorage, so
    // "Open the plan" landed on whatever page you happened to visit last.
    const url = studioTaskUrl({ baseUrl: 'https://www.goinvo.com', taskId: 'op1', targetView: 'outreach' })
    expect(url).toMatch(/[?&]view=/)
  })
})
