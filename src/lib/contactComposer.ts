/**
 * The contact composer: instead of a blank "How can we help?" box, a visitor can press a
 * few options and each one writes a plain sentence into the box, which stays theirs to
 * edit. The box's text is the only state: an option is "on" when its sentence is in the
 * text, so typing over a sentence turns its option off, and nothing is hidden from them.
 * Pure, so the rules are unit-tested (tests/contact-composer.test.ts).
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

/** The result comes first: it is what the studio is hired for. */
export const COMPOSER_GROUPS: ComposerGroup[] = [
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
