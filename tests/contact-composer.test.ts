import { describe, expect, it } from 'vitest'
import { COMPOSER_GROUPS, atPause, firstUnanswered, groupAt, hasSentence, presetSentence, previewAddition, stepQuestion, toggleSentence } from '@/lib/contactComposer'

const group = (key: string) => COMPOSER_GROUPS.find((entry) => entry.key === key)!
const result = group('result')
const timing = group('timing')

describe('the contact composer', () => {
  it('writes an option’s sentence into an empty box', () => {
    expect(toggleSentence('', result.options[0], result)).toBe(result.options[0].sentence)
  })

  it('adds to what is there and never rewrites the visitor’s own words', () => {
    const typed = 'Our intake form loses half its applicants.'
    const next = toggleSentence(typed, result.options[0], result)
    expect(next).toBe(`${typed} ${result.options[0].sentence}`)
  })

  it('pressing an option again takes its sentence back out, and only that', () => {
    const typed = 'Call me after 3pm.'
    const added = toggleSentence(toggleSentence(typed, result.options[0], result), result.options[1], result)
    const removed = toggleSentence(added, result.options[0], result)
    expect(removed).toBe(`${typed} ${result.options[1].sentence}`)
    expect(hasSentence(removed, result.options[0])).toBe(false)
  })

  it('an option is on only while its sentence is in the text', () => {
    const added = toggleSentence('', result.options[2], result)
    expect(hasSentence(added, result.options[2])).toBe(true)
    expect(hasSentence(added.replace('less time', 'no time'), result.options[2])).toBe(false)
  })

  it('timing takes one answer: a second choice replaces the first', () => {
    const first = toggleSentence('We need help.', timing.options[0], timing)
    const second = toggleSentence(first, timing.options[2], timing)
    expect(second).toBe(`We need help. ${timing.options[2].sentence}`)
  })

  it('other groups take several answers', () => {
    const both = toggleSentence(toggleSentence('', result.options[0], result), result.options[1], result)
    expect(hasSentence(both, result.options[0]) && hasSentence(both, result.options[1])).toBe(true)
  })

  it('keeps the visitor’s line breaks when a sentence comes out', () => {
    const typed = 'First line.\nSecond line.'
    const added = toggleSentence(typed, result.options[0], result)
    expect(toggleSentence(added, result.options[0], result)).toBe(typed)
  })

  it('no sentence is part of another, so one option can never switch on two', () => {
    const all = COMPOSER_GROUPS.flatMap((entry) => entry.options)
    for (const a of all) for (const b of all) if (a !== b) expect(a.sentence.includes(b.sentence)).toBe(false)
    expect(new Set(all.map((option) => option.sentence)).size).toBe(all.length)
  })
})

describe('a choice made elsewhere on the page (a service) fills the box', () => {
  const [direction, shipped, trusted] = ['We need a clear product direction.', 'We need a product designed and shipped.', 'We need an AI tool people will trust and use.']
  const all = [direction, shipped, trusted]

  it('writes the sentence into an empty box, and lights the matching option', () => {
    const text = presetSentence('', direction, all)
    expect(text).toBe(direction)
    expect(hasSentence(text, group('need').options.find((option) => option.sentence === direction)!)).toBe(true)
  })

  it('choosing another service replaces the first choice, and keeps what the visitor typed', () => {
    const typed = `Our intake form loses half its applicants. ${direction}`
    expect(presetSentence(typed, shipped, all)).toBe(`Our intake form loses half its applicants. ${shipped}`)
  })

  it('the same service twice is written once', () => {
    expect(presetSentence(presetSentence('', trusted, all), trusted, all)).toBe(trusted)
  })
})

describe('one question at a time', () => {
  const need = group('need')

  it('rule: the first question is the one that tells us most (what they need), then result, sector, timing', () => {
    expect(COMPOSER_GROUPS.map((entry) => entry.key)).toEqual(['need', 'result', 'sector', 'timing'])
    expect(groupAt('', firstUnanswered(''))?.key).toBe('need')
  })

  it('rule: no question is offered mid-sentence, only at a pause', () => {
    expect(atPause('')).toBe(true)
    expect(atPause('Our intake form loses half its applicants.')).toBe(true)
    expect(atPause('Is this something you do?')).toBe(true)
    expect(atPause('First line.\n')).toBe(true)
    expect(atPause('Our intake form loses')).toBe(false)
    expect(groupAt('Our intake form loses', 0)).toBeNull()
    expect(groupAt('Our intake form loses half.', 0)?.key).toBe('need')
  })

  it('answering moves on to the next question', () => {
    const one = toggleSentence('', need.options[0], need)
    expect(firstUnanswered(one)).toBe(1)
    expect(groupAt(one, 1)?.key).toBe('result')
    const two = toggleSentence(one, result.options[0], result)
    expect(groupAt(two, firstUnanswered(two))?.key).toBe('sector')
  })

  it('rule: the arrows step one question back or forward, and stop at the first and past the last', () => {
    expect(stepQuestion(0, 1)).toBe(1)
    expect(stepQuestion(1, -1)).toBe(0)
    expect(stepQuestion(0, -1)).toBe(0)
    const end = COMPOSER_GROUPS.length
    expect(stepQuestion(end - 1, 1)).toBe(end)
    expect(stepQuestion(end, 1)).toBe(end)
    expect(groupAt('', end)).toBeNull()
    // Going back shows a question again, answered or not.
    const one = toggleSentence('', need.options[0], need)
    expect(groupAt(one, stepQuestion(1, -1))?.key).toBe('need')
  })

  it('a service pressed elsewhere counts as the first answer', () => {
    expect(firstUnanswered(presetSentence('', 'We need a clear product direction.'))).toBe(1)
  })

  it('rule: the preview is exactly what a press would add', () => {
    const typed = 'Call me after 3pm.'
    for (const option of need.options) expect(`${typed}${previewAddition(typed, option, need)}`).toBe(toggleSentence(typed, option, need))
    expect(previewAddition('', need.options[0], need)).toBe(need.options[0].sentence)
  })
})
