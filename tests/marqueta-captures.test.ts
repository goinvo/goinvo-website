/**
 * Marqueta's capture scenes (intro and help videos) must show what she really
 * does, or the videos teach people things that don't work.
 *
 * Rules pinned here:
 *   - every command a scene types parses to the intent the scene shows;
 *   - every pressed label is a button on the message as it stands at that moment;
 *   - every form a scene fills names real fields and real options;
 *   - every message and form is valid Block Kit (Slack would accept it);
 *   - only the fictional cast appears: mentions, emails and links are fixtures.
 */
import { describe, expect, it } from 'vitest'

import {
  buildMarquetaCaptures,
  buttonsOn,
  CAPTURE_PEOPLE,
  parsedIntentOf,
  type Capture,
  type CaptureStep,
} from '@/lib/marketing/marquetaCaptures'
import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

const file = buildMarquetaCaptures({ generatedAt: '2026-10-05T00:00:00Z' })
type Block = Record<string, unknown>

/** The blocks each message holds after every step up to (not including) `upTo`. */
function messagesBefore(capture: Capture, upTo: number): Map<string, Block[]> {
  const live = new Map<string, Block[]>()
  capture.steps.slice(0, upTo).forEach((step) => {
    if (step.kind === 'post') live.set(step.id, step.blocks || [])
    if (step.kind === 'press' && step.replace) live.set(step.target, step.replace)
  })
  return live
}

describe('the capture set', () => {
  it('has the scenes a beginner needs, each with steps and the example-data disclaimer', () => {
    expect(file.captures.map((capture) => capture.id)).toEqual([
      'help',
      'idea',
      'monday-plan',
      'call-prep',
      'suggest',
      'checkin',
      'sitrep',
      'intent',
      'make-video',
    ])
    expect(file.disclaimer).toMatch(/made-up/)
    for (const capture of file.captures) expect(capture.steps.length, capture.id).toBeGreaterThan(1)
  })
})

describe.each(file.captures.map((capture) => [capture.id, capture] as const))('%s', (_id, capture) => {
  it('teaches a command that parses to what the scene shows', () => {
    if (!capture.command) return
    expect(parsedIntentOf(capture.command)).toBe(capture.intent)
    const typed = capture.steps.find((step): step is Extract<CaptureStep, { kind: 'post' }> => step.kind === 'post' && Boolean(step.typed))
    expect(typed?.text).toBe(capture.command)
  })

  it('only presses buttons that are on the message at that moment', () => {
    capture.steps.forEach((step, index) => {
      if (step.kind !== 'press') return
      const live = messagesBefore(capture, index).get(step.target)
      expect(live, `${step.id} presses a message that is not there yet`).toBeDefined()
      const labels = buttonsOn(live).map((button) => button.text?.text)
      expect(labels, `${step.id}`).toContain(step.label)
    })
  })

  it('fills real fields with real options, in a form that was opened', () => {
    capture.steps.forEach((step, index) => {
      if (step.kind !== 'submit') return
      const opened = capture.steps.slice(0, index).find((earlier) => earlier.id === step.modal)
      expect(opened?.kind === 'press' && opened.modal, `${step.id} submits a form nobody opened`).toBeTruthy()
      const inputs = (((opened as { modal: Block }).modal.blocks || []) as Array<{
        type?: string
        label?: { text?: string }
        element?: { options?: { text?: { text?: string } }[] }
      }>).filter((block) => block.type === 'input')
      for (const fill of step.fill) {
        const field = inputs.find((input) => input.label?.text === fill.label)
        expect(field, `${step.id}: no field “${fill.label}”`).toBeDefined()
        const options = (field?.element?.options || []).map((option) => option.text?.text)
        if (options.length) expect(options, `${step.id}: “${fill.label}”`).toContain(fill.value)
      }
    })
  })

  it('threads replies under, and presses, messages that came earlier', () => {
    const seen = new Set<string>()
    for (const step of capture.steps) {
      if (step.kind === 'post' && step.threadOf) expect(seen.has(step.threadOf), step.id).toBe(true)
      if (step.kind === 'press') expect(seen.has(step.target), step.id).toBe(true)
      seen.add(step.id)
    }
  })

  it('posts only valid Block Kit and valid forms', () => {
    for (const step of capture.steps) {
      if (step.kind === 'post' && step.blocks?.length) expectValidSlackBlocks(step.blocks as never)
      if (step.kind === 'press' && step.replace) expectValidSlackBlocks(step.replace as never)
      if (step.kind === 'press' && step.modal) expectValidSlackModal(step.modal as never)
    }
  })
})

describe('only the fictional cast appears', () => {
  const everything = JSON.stringify(file.captures)
  const cast = new Set(CAPTURE_PEOPLE.map((entry) => entry.slackUserId))

  it('mentions nobody outside the cast', () => {
    const mentioned = [...everything.matchAll(/<@([A-Z0-9]+)(?:\|[^>]*)?>/g)].map((match) => match[1])
    expect(mentioned.length).toBeGreaterThan(0)
    for (const id of mentioned) expect(cast.has(id), id).toBe(true)
  })

  it('links and emails only to example domains', () => {
    const hosts = [...everything.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((match) => match[1].toLowerCase())
    expect(hosts.length).toBeGreaterThan(0)
    for (const host of hosts) expect(host, host).toMatch(/(^|\.)example\.(org|com)$/)
    const emails = [...everything.matchAll(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi)].map((match) => match[1].toLowerCase())
    for (const domain of emails) expect(domain, domain).toMatch(/(^|\.)example\.(org|com)$/)
  })

  it('names only the cast as people who post or press', () => {
    const ids = new Set([...CAPTURE_PEOPLE.map((entry) => entry.id), 'marqueta'])
    for (const capture of file.captures) {
      for (const step of capture.steps) {
        const who = step.kind === 'post' ? step.from : step.by
        expect(ids.has(who), `${capture.id}/${step.id}: ${who}`).toBe(true)
      }
    }
  })
})
