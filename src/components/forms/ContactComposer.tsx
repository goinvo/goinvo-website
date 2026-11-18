'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ease, useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { COMPOSER_GROUPS, atPause, isAnswered, nextGroup, presetSentence, previewAddition, toggleSentence } from '@/lib/contactComposer'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'

/**
 * "How can we help?" without a blank box. Under the field one small question is offered at
 * a time, when the field is empty or the last sentence is finished; each answer writes a
 * sentence into the field, and hovering an answer shows the sentence in place before it is
 * written. The text stays the visitor's to edit. "Next" carries it into the contact form,
 * already filled in, where they add their name and email. Rules: src/lib/contactComposer.ts.
 *
 * `preset` is a choice made elsewhere on the page (a service pressed on the services page):
 * its sentence is written into the box and the options open. `key` changes on every press,
 * so pressing the same service again after editing puts its sentence back.
 */
export interface ComposerPreset { sentence: string; replaces?: string[]; key: number }

export function ContactComposer({ className, preset }: { className?: string; preset?: ComposerPreset }) {
  const low = useReducedMotion() ?? false
  const id = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const form = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  /** Questions they passed over, and the answer under the pointer (shown in the field, not yet written). */
  const [skipped, setSkipped] = useState<string[]>([])
  const [pointed, setPointed] = useState<string | null>(null)
  /** What was carried into the form; null until they press Next. */
  const [sent, setSent] = useState<string | null>(null)
  // Applied while rendering, once per press: the box is the visitor's, so a preset is an
  // edit to it, not a value that keeps overwriting what they type.
  const [applied, setApplied] = useState(0)
  if (preset && preset.key !== applied) {
    setApplied(preset.key)
    setText((current) => presetSentence(current, preset.sentence, preset.replaces))
    setOpen(true)
  }

  const next = (event: FormEvent) => {
    event.preventDefault()
    setSent(text.trim())
    requestAnimationFrame(() => form.current?.scrollIntoView({ behavior: low ? 'auto' : 'smooth', block: 'start' }))
  }

  const group = open ? nextGroup(text, skipped) : null
  const option = group?.options.find((item) => item.label === pointed)
  const addition = group && option ? previewAddition(text, option, group) : ''
  const asked = COMPOSER_GROUPS.filter((item) => skipped.includes(item.key) || isAnswered(text, item)).length
  const hint = !open
    ? 'No need to write an essay: a few clicks is enough.'
    : group
      ? 'Pick one, skip it, or keep typing.'
      : atPause(text) ? 'That’s plenty to start. Add anything else, or go on.' : 'Finish the sentence and the next question appears.'

  return (
    <div data-contact-composer className={className}>
      <form onSubmit={next}>
        <label htmlFor={`${id}-field`} className={cn('block', type.title)}>How can we help?</label>
        {/* One box: the visitor's words at the top, the current question's answers along its
            bottom edge. A press anywhere in the box puts the caret in the field. */}
        <div data-composer-box onClick={(event) => { if (event.target === event.currentTarget) field.current?.focus() }} className="mt-5 cursor-text border border-black/25 bg-white focus-within:border-black focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-secondary">
         <div className="relative">
          <textarea
            ref={field}
            id={`${id}-field`}
            data-composer-field
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => setOpen(true)}
            aria-describedby={`${id}-hint`}
            placeholder={addition ? '' : 'Click here for a few quick questions, or just type.'}
            className={cn('block w-full resize-none border-0 bg-transparent p-4 text-black outline-none placeholder:text-gray', type.body)}
          />
          {/* The answer under the pointer, shown where it would land. Same box, padding and type
              as the field, so the grey words sit exactly after the visitor's own. */}
          {addition && (
            <div aria-hidden="true" data-composer-preview className={cn('pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-4', type.body)}>
              <span className="invisible">{text.trimEnd()}</span><span className="text-gray">{addition}</span>
            </div>
          )}
         </div>
         <div aria-live="polite" data-composer-options onClick={(event) => { if (event.target === event.currentTarget) field.current?.focus() }} className={cn('px-4 pb-4', open && 'min-h-[6.5rem]')}>
          {group && (
            <motion.fieldset key={group.key} data-composer-group={group.key} initial={low ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: low ? 0 : 0.35, ease: ease.outExpo }} className="m-0 min-w-0 border-0 p-0">
              <legend className={cn('mb-2.5 flex w-full items-baseline justify-between gap-4 p-0 text-gray', type.caption)}>
                <span>{group.prompt}</span>
                <span className="tabular-nums">{asked + 1} of {COMPOSER_GROUPS.length}</span>
              </legend>
              <div className="flex flex-wrap items-center gap-2.5">
                {group.options.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    data-composer-option={item.label}
                    // Keep the caret in the field: the box never loses focus to a press.
                    onMouseDown={(event) => event.preventDefault()}
                    // Only a pointer that actually moved counts as pointing: after a press the next
                    // question's answers appear under a still cursor, and must not preview themselves.
                    onMouseMove={(event) => { if ((event.movementX || event.movementY) && pointed !== item.label) setPointed(item.label) }}
                    onMouseLeave={() => setPointed(null)}
                    onFocus={() => setPointed(item.label)}
                    onBlur={() => setPointed(null)}
                    onClick={() => { setText((current) => toggleSentence(current, item, group)); setPointed(null) }}
                    className={cn('cursor-pointer rounded-full border border-black/25 bg-white px-3.5 py-1.5 text-black transition-colors hover:border-black hover:bg-black hover:text-white motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label)}
                  >
                    {item.label}
                  </button>
                ))}
                <button type="button" data-composer-skip onMouseDown={(event) => event.preventDefault()} onClick={() => { setSkipped((current) => [...current, group.key]); setPointed(null) }} className={cn('cursor-pointer border-0 bg-transparent px-2 py-2 text-gray underline-offset-4 hover:text-black hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label)}>Skip</button>
              </div>
            </motion.fieldset>
          )}
         </div>
        </div>
        <p id={`${id}-hint`} className={cn('mb-0 mt-3 text-gray', type.caption)}>{hint}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
          <button type="submit" data-composer-next className={cn('group inline-flex cursor-pointer items-center gap-3 bg-black px-6 py-3.5 text-white hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label)}>
            {sent === null ? 'Next: your name and email' : 'Update the form below'}<Arrow />
          </button>
        </div>
      </form>

      {sent !== null && (
        <div ref={form} data-composer-form className="mt-14 scroll-mt-28 border-t border-black/15 pt-10">
          <p className={cn('mb-6 mt-0', type.label)}>{sent ? 'Your note is filled in. Add your name and email, then send.' : 'Add your name, email and a note, then send.'}</p>
          <ContactFormEmbed showHeader={false} variant="inline" message={sent || undefined} />
        </div>
      )}
    </div>
  )
}
