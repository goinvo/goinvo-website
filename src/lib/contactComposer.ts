/**
 * The contact composer: instead of a blank "How can we help?" box, a visitor is offered ONE
 * small question at a time under the box, and each answer writes a plain sentence into it,
 * which stays theirs to edit. A question appears only at a pause (the box is empty, or the
 * last sentence is finished), never mid-sentence, and the questions come in order from the
 * one that tells us most to the one that tells us least. Hovering an answer shows what it
 * would write. The box's text is the only record: a question counts as answered when one of
 * its sentences is in the text. Arrows on the count move back and forward through the
 * questions, so none has to be answered. Pure, so the rules are unit-tested
 * (tests/contact-composer.test.ts).
 */

export interface ComposerOption {
  /** The words on the button. */
  label: string
  /** The sentence it writes. Whole sentences, so any mix of them reads as a note. */
  sentence: string
}

export interface ComposerGroup {
  key: string
  prompt: string
  /** One answer only (timing): choosing another replaces it. */
  single?: boolean
  options: ComposerOption[]
}

/** In the order they are asked: what tells us most, and is answered most often, comes first. */
export const COMPOSER_GROUPS: ComposerGroup[] = [
  {
    key: 'need',
    prompt: 'What you need',
    options: [
      { label: 'A product direction', sentence: 'We need a clear product direction.' },
      { label: 'A product designed and shipped', sentence: 'We need a product designed and shipped.' },
      { label: 'An AI tool people trust', sentence: 'We need an AI tool people will trust and use.' },
      { label: 'An expert review', sentence: 'We need an expert review of our product.' },
      { label: 'A long-term design team', sentence: 'We need a long-term design team.' },
    ],
  },
  {
    key: 'result',
    prompt: 'The result you’re after',
    options: [
      { label: 'More people using it', sentence: 'We want more people using our product.' },
      { label: 'Fewer errors', sentence: 'We want fewer errors in the work it supports.' },
      { label: 'Faster work', sentence: 'We want the work to take less time.' },
      { label: 'A launch we can hit', sentence: 'We want a launch date we can hit.' },
      { label: 'Buy-in or funding', sentence: 'We want buy-in or funding for the idea.' },
    ],
  },
  {
    key: 'sector',
    prompt: 'Where you work',
    options: [
      { label: 'Healthcare', sentence: 'We work in healthcare.' },
      { label: 'Government', sentence: 'We work in government.' },
      { label: 'Enterprise', sentence: 'We work in enterprise software.' },
      { label: 'AI', sentence: 'We work in AI.' },
    ],
  },
  {
    key: 'timing',
    prompt: 'When',
    single: true,
    options: [
      { label: 'This quarter', sentence: 'We’d like to start this quarter.' },
      { label: 'In the next six months', sentence: 'We’d like to start in the next six months.' },
      { label: 'Just exploring', sentence: 'We’re exploring for now.' },
    ],
  },
]

export const hasSentence = (text: string, option: ComposerOption) => text.includes(option.sentence)

/** Take a sentence out and close the gap it leaves, keeping the visitor's own line breaks. */
function without(text: string, sentence: string) {
  return text.split(sentence).join('').replace(/[ \t]{2,}/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Press an option: its sentence goes in, or comes out if it was already there. */
export function toggleSentence(text: string, option: ComposerOption, group?: ComposerGroup): string {
  if (hasSentence(text, option)) return without(text, option.sentence)
  let next = text
  if (group?.single) for (const other of group.options) next = without(next, other.sentence)
  next = next.trimEnd()
  if (!next) return option.sentence
  return `${next}${/[\n]$/.test(text) ? '\n' : ' '}${option.sentence}`
}

/**
 * A choice made elsewhere on the page (pressing a service) arrives in the box as a sentence.
 * It replaces the sentence an earlier such choice put there, never anything the visitor
 * typed, and it is never written twice.
 */
export function presetSentence(text: string, sentence: string, replaces: string[] = []): string {
  let next = text
  for (const other of replaces) if (other !== sentence) next = without(next, other)
  if (next.includes(sentence)) return next
  next = next.trimEnd()
  return next ? `${next} ${sentence}` : sentence
}

/** A pause in the writing: nothing yet, or the last sentence is finished, or a new line. */
export const atPause = (text: string) => text.trim() === '' || /[.!?…]["’”)]?\s*$/.test(text) || /\n\s*$/.test(text)

/** A question is answered once one of its sentences is in the box. */
export const isAnswered = (text: string, group: ComposerGroup) => group.options.some((option) => hasSentence(text, option))

/**
 * The question to show: the one the visitor is on, but only at a pause, never mid-sentence.
 * Past the last question there is none.
 */
export function groupAt(text: string, at: number): ComposerGroup | null {
  if (!atPause(text)) return null
  return COMPOSER_GROUPS[at] ?? null
}

/** Where to start: the first question the text has not already answered (all answered: past the end). */
export function firstUnanswered(text: string): number {
  const at = COMPOSER_GROUPS.findIndex((group) => !isAnswered(text, group))
  return at === -1 ? COMPOSER_GROUPS.length : at
}

/** The arrows on the count: back and forward one question, never before the first or past the end. */
export const stepQuestion = (at: number, by: 1 | -1) => Math.min(COMPOSER_GROUPS.length, Math.max(0, at + by))

/** What pressing an answer would add to the box, for showing before they press. */
export function previewAddition(text: string, option: ComposerOption, group?: ComposerGroup): string {
  const base = text.trimEnd()
  const after = toggleSentence(text, option, group)
  return after.startsWith(base) ? after.slice(base.length) : ` ${option.sentence}`
}
