'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ease, useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { COMPOSER_GROUPS, hasSentence, toggleSentence } from '@/lib/contactComposer'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'

/**
 * "How can we help?" without a blank box: clicking into the field offers options, and
 * each one writes a sentence into it (press again to take it out). The text stays the
 * visitor's to edit. "Next" carries it into the contact form, already filled in, where
 * they add their name and email. Rules: src/lib/contactComposer.ts.
 */
export function ContactComposer({ className }: { className?: string }) {
  const low = useReducedMotion() ?? false
  const id = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const form = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  /** What was carried into the form; null until they press Next. */
  const [sent, setSent] = useState<string | null>(null)

  const next = (event: FormEvent) => {
    event.preventDefault()
    setSent(text.trim())
    requestAnimationFrame(() => form.current?.scrollIntoView({ behavior: low ? 'auto' : 'smooth', block: 'start' }))
  }

  return (
    <div data-contact-composer className={className}>
      <form onSubmit={next}>
        <label htmlFor={`${id}-field`} className={cn('block', type.title)}>How can we help?</label>
        <textarea
          ref={field}
          id={`${id}-field`}
          data-composer-field
          rows={4}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={() => setOpen(true)}
          aria-describedby={`${id}-hint`}
          placeholder="Click here to pick a few options, or just type."
          className={cn('mt-5 block w-full resize-y border border-black/25 bg-white p-4 text-black placeholder:text-gray focus:border-black focus:outline-2 focus:outline-offset-2 focus:outline-secondary', type.body)}
        />
        <p id={`${id}-hint`} className={cn('mb-0 mt-3 text-gray', type.caption)}>{open ? 'Press any that fit. Each one writes a line you can edit.' : 'No need to write an essay: a few clicks is enough.'}</p>

        {open && (
          <motion.div data-composer-options initial={low ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: low ? 0 : 0.4, ease: ease.outExpo }} className="mt-8 grid gap-7">
            {COMPOSER_GROUPS.map((group) => (
              <fieldset key={group.key} data-composer-group={group.key} className="m-0 min-w-0 border-0 p-0">
                <legend className={cn('mb-3 p-0', type.label)}>{group.prompt}</legend>
                <div className="flex flex-wrap gap-2.5">
                  {group.options.map((option) => {
                    const on = hasSentence(text, option)
                    return (
                      <button
                        key={option.label}
                        type="button"
                        aria-pressed={on}
                        data-composer-option={option.label}
                        // Keep the caret in the field: the box never loses focus to a press.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setText((current) => toggleSentence(current, option, group))}
                        className={cn('cursor-pointer rounded-full border px-4 py-2 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label, on ? 'border-black bg-black text-white' : 'border-black/25 bg-white text-black hover:border-black')}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            ))}
          </motion.div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
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
