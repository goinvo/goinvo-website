import { describe, expect, it } from 'vitest'

import {
  isAnswerableInSlack,
  MARKETING_TASK_QUERY_PARAM,
  resolveTaskView,
  studioTaskUrl,
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
