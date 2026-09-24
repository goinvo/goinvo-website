/**
 * Walk a Block Kit payload and assert it would not be rejected by Slack.
 *
 * Slack refuses a whole message for one empty text object or one over-long
 * section, and the refusal is a log line nobody reads. Every builder that emits
 * blocks should pass through this in its tests.
 */
import { expect } from 'vitest'

import { SLACK_LIMITS } from '@/lib/marketing/slackText'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

function checkText(text: any, max: number, where: string) {
  expect(text, `${where}: missing text object`).toBeTruthy()
  const value = String(text?.text ?? '')
  expect(value.length, `${where}: empty text (Slack requires at least 1 character)`).toBeGreaterThan(0)
  expect(value.length, `${where}: ${value.length} chars exceeds ${max}`).toBeLessThanOrEqual(max)
}

function checkElement(element: Block, where: string) {
  if (element.type === 'button') {
    checkText(element.text, SLACK_LIMITS.buttonText, `${where} button text`)
    if (element.value !== undefined) {
      expect(String(element.value).length, `${where} button value`).toBeLessThanOrEqual(SLACK_LIMITS.buttonValue)
    }
    if (element.url !== undefined) expect(String(element.url), `${where} button url`).toMatch(/^https?:\/\//)
    if (element.action_id !== undefined) {
      expect(String(element.action_id).length).toBeLessThanOrEqual(SLACK_LIMITS.actionId)
    }
    expect(element.url || element.action_id, `${where}: a button needs a url or an action_id`).toBeTruthy()
  }
  if (element.type === 'static_select') {
    const options = element.options || []
    expect(options.length, `${where}: select needs options`).toBeGreaterThan(0)
    expect(options.length).toBeLessThanOrEqual(100)
    for (const option of options) checkText(option.text, SLACK_LIMITS.optionText, `${where} option`)
    if (element.initial_option) {
      expect(
        options.some((option: Block) => JSON.stringify(option) === JSON.stringify(element.initial_option)),
        `${where}: initial_option must exactly equal one of the options`,
      ).toBe(true)
    }
  }
  if (element.type === 'mrkdwn' || element.type === 'plain_text') {
    checkText(element, SLACK_LIMITS.sectionText, `${where} context element`)
  }
}

export function expectValidSlackBlocks(blocks: Block[], opts: { maxBlocks?: number } = {}) {
  const max = opts.maxBlocks ?? SLACK_LIMITS.blocksPerMessage
  expect(Array.isArray(blocks)).toBe(true)
  expect(blocks.length, `${blocks.length} blocks exceeds ${max}`).toBeLessThanOrEqual(max)
  const ids = new Set<string>()
  blocks.forEach((block, index) => {
    const where = `block ${index} (${block.type})`
    if (block.block_id !== undefined) {
      expect(String(block.block_id).length).toBeLessThanOrEqual(SLACK_LIMITS.blockId)
      expect(ids.has(block.block_id), `${where}: duplicate block_id ${block.block_id}`).toBe(false)
      ids.add(block.block_id)
    }
    switch (block.type) {
      case 'header':
        checkText(block.text, SLACK_LIMITS.headerText, where)
        expect(block.text.type).toBe('plain_text')
        break
      case 'section':
        if (block.text) checkText(block.text, SLACK_LIMITS.sectionText, where)
        if (block.fields) {
          expect(block.fields.length).toBeLessThanOrEqual(10)
          for (const field of block.fields) checkText(field, 2000, `${where} field`)
        }
        expect(block.text || block.fields, `${where}: section needs text or fields`).toBeTruthy()
        if (block.accessory) checkElement(block.accessory, `${where} accessory`)
        break
      case 'context':
        expect(block.elements?.length, `${where}: context needs elements`).toBeGreaterThan(0)
        expect(block.elements.length).toBeLessThanOrEqual(SLACK_LIMITS.contextElements)
        for (const element of block.elements) checkElement(element, where)
        break
      case 'actions':
        expect(block.elements?.length, `${where}: actions needs elements`).toBeGreaterThan(0)
        expect(block.elements.length).toBeLessThanOrEqual(25)
        for (const element of block.elements) checkElement(element, where)
        break
      case 'input':
        checkText(block.label, 2000, `${where} label`)
        checkElement(block.element, `${where} element`)
        break
      case 'divider':
        break
      default:
        throw new Error(`${where}: unexpected block type`)
    }
  })
}

/** A modal Slack will actually open. */
export function expectValidSlackModal(view: Block) {
  expect(view.type).toBe('modal')
  checkText(view.title, SLACK_LIMITS.modalTitle, 'modal title')
  const hasInput = (view.blocks || []).some((block: Block) => block.type === 'input')
  if (hasInput) checkText(view.submit, SLACK_LIMITS.modalButton, 'modal submit (required with inputs)')
  if (view.close) checkText(view.close, SLACK_LIMITS.modalButton, 'modal close')
  if (view.private_metadata !== undefined) {
    expect(String(view.private_metadata).length).toBeLessThanOrEqual(SLACK_LIMITS.privateMetadata)
  }
  expectValidSlackBlocks(view.blocks || [], { maxBlocks: 100 })
}
