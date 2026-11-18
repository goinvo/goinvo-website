'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ease, useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { InlineLink } from '@/components/ui/TextLink'
import { COMPOSER_GROUPS, atPause, firstUnanswered, groupAt, hasSentence, presetSentence, previewAddition, stepQuestion, toggleSentence } from '@/lib/contactComposer'
import { CONTACT_LIMITS, contactErrors, type ContactErrors } from '@/lib/contactSubmit'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { siteConfig } from '@/lib/config'

/**
 * The contact form, in one step: name and email at the top, then "How can we help?", then
 * Send. Nothing is asked for on a second screen, so nobody writes a note and leaves before
 * saying who they are.
 *
 * "How can we help?" is not a blank box. Inside it, one small question is offered at a time,
 * when the field is empty or the last sentence is finished; each answer writes a sentence
 * into the field, and hovering an answer shows the sentence in place before it is written.
 * The text stays the visitor's to edit. Rules: src/lib/contactComposer.ts.
 *
 * Send posts to /api/contact, which hands it to the site's JotForm. If that does not come
 * back as sent, the JotForm itself appears below with everything already filled in: a
 * visitor is never told a note was sent when it was not (src/lib/contactSubmit.ts).
 *
 * `preset` is a choice made elsewhere on the page (a service pressed on the services page):
 * its sentence is written into the box and the questions open. `key` changes on every press,
 * so pressing the same service again after editing puts its sentence back.
 */
export interface ComposerPreset { sentence: string; replaces?: string[]; key: number }

const inputClass = cn('block w-full border border-black/25 bg-white px-4 py-3 text-black placeholder:text-gray focus:border-black focus:outline-2 focus:outline-offset-2 focus:outline-secondary', type.body)

export function ContactComposer({ className, preset }: { className?: string; preset?: ComposerPreset }) {
  const low = useReducedMotion() ?? false
  const id = useId()
  const field = useRef<HTMLTextAreaElement>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  /** The question they are on, and the answer under the pointer (shown in the field, not yet written). */
  const [at, setAt] = useState(0)
  const [pointed, setPointed] = useState<string | null>(null)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [state, setState] = useState<'writing' | 'sending' | 'sent' | 'fallback'>('writing')
  // Applied while rendering, once per press: the box is the visitor's, so a preset is an
  // edit to it, not a value that keeps overwriting what they type.
  const [applied, setApplied] = useState(0)
  if (preset && preset.key !== applied) {
    setApplied(preset.key)
    const filled = presetSentence(text, preset.sentence, preset.replaces)
    setText(filled)
    setAt(firstUnanswered(filled))
    setOpen(true)
  }

  const send = async (event: FormEvent) => {
    event.preventDefault()
    const fields = { name: name.trim(), email: email.trim(), message: text.trim() }
    const found = contactErrors(fields)
    setErrors(found)
    if (Object.keys(found).length) {
      const first = (['name', 'email', 'message'] as const).find((key) => found[key])
      document.getElementById(`${id}-${first === 'message' ? 'field' : first}`)?.focus()
      return
    }
    setState('sending')
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, company }) })
      const data = await response.json().catch(() => ({}))
      if (response.status === 422 && data.errors) { setErrors(data.errors); setState('writing'); return }
      setState(response.ok && data.sent === true ? 'sent' : 'fallback')
    } catch {
      setState('fallback')
    }
  }

  const total = COMPOSER_GROUPS.length
  const group = open ? groupAt(text, at) : null
  const done = open && at >= total && atPause(text)
  const option = group?.options.find((item) => item.label === pointed)
  // An answer already in the text has nothing to preview: pressing it takes it out.
  const addition = group && option && !hasSentence(text, option) ? previewAddition(text, option, group) : ''
  const arrow = 'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-black hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-secondary disabled:cursor-default disabled:text-black/25 disabled:hover:bg-transparent'
  const stepper = (
    <span data-composer-stepper className="flex items-center gap-1">
      <button type="button" data-composer-back aria-label="Previous question" disabled={at <= 0} onMouseDown={(event) => event.preventDefault()} onClick={() => { setAt(stepQuestion(at, -1)); setPointed(null) }} className={arrow}><span aria-hidden="true">←</span></button>
      <span data-composer-count className="tabular-nums">{Math.min(at + 1, total)} of {total}</span>
      <button type="button" data-composer-forward aria-label="Next question" disabled={at >= total} onMouseDown={(event) => event.preventDefault()} onClick={() => { setAt(stepQuestion(at, 1)); setPointed(null) }} className={arrow}><span aria-hidden="true">→</span></button>
    </span>
  )
  // One hint only, for the one moment that needs explaining: the answers went away
  // because a sentence is unfinished. Everything else the form shows for itself.
  const hint = open && !group && !atPause(text) ? 'Finish the sentence for the next question.' : ''

  if (state === 'sent') {
    return (
      <div data-contact-composer data-composer-sent role="status" className={className}>
        <p className={cn('m-0', type.title)}>Thank you, {name.trim().split(/\s+/)[0]}.</p>
        <p className={cn('mb-0 mt-4 max-w-[40ch]', type.lead)}>Your note is with the studio. A principal will reply to {email.trim()}.</p>
      </div>
    )
  }

  return (
    // A column as tall as the space it is given, with Send at its foot: beside a taller
    // neighbour (the contact page's title and details) the button still ends level with it.
    <div data-contact-composer className={cn('flex flex-col', className)}>
      <form onSubmit={send} noValidate className="flex flex-1 flex-col">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-name`} className={cn('mb-2 block', type.label)}>Your name</label>
            <input id={`${id}-name`} data-composer-name type="text" autoComplete="name" maxLength={CONTACT_LIMITS.name} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} className={inputClass} />
            {errors.name && <p id={`${id}-name-error`} role="alert" className={cn('mb-0 mt-2 text-primary', type.caption)}>{errors.name}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={cn('mb-2 block', type.label)}>Your email</label>
            <input id={`${id}-email`} data-composer-email type="email" autoComplete="email" inputMode="email" maxLength={CONTACT_LIMITS.email} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? `${id}-email-error` : undefined} className={inputClass} />
            {errors.email && <p id={`${id}-email-error`} role="alert" className={cn('mb-0 mt-2 text-primary', type.caption)}>{errors.email}</p>}
          </div>
        </div>
        {/* A trap for robots: off screen, out of the tab order, and never announced. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Company<input type="text" name="company" tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} /></label></div>

        <label htmlFor={`${id}-field`} className={cn('mb-2 mt-6 block', type.label)}>How can we help?</label>
        {/* One box: the visitor's words at the top, the current question's answers along its
            bottom edge. A press anywhere in the box puts the caret in the field. */}
        <div data-composer-box onClick={(event) => { if (event.target === event.currentTarget) field.current?.focus() }} className="cursor-text border border-black/25 bg-white focus-within:border-black focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-secondary">
          {/* The field grows with what is written, up to a cap, then scrolls; it cannot be dragged.
              A hidden copy of the text gives the box its height and the field fills it. The same
              copy shows the answer under the pointer, in grey, exactly where it would land. */}
          <div data-composer-grow className="relative">
            <div aria-hidden="true" data-composer-preview={addition ? '' : undefined} className={cn('pointer-events-none max-h-[15rem] min-h-[7rem] overflow-hidden whitespace-pre-wrap break-words p-4', type.body)}>
              <span className="invisible">{addition ? text.trimEnd() : text}</span>{addition && <span className="text-gray">{addition}</span>}{/* A copy ending in a line break needs something after it, or the empty last line has no height. */}{!addition && text.endsWith('\n') && <br />}
            </div>
            <textarea
              ref={field}
              id={`${id}-field`}
              data-composer-field
              maxLength={CONTACT_LIMITS.message}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onFocus={() => setOpen(true)}
              aria-invalid={!!errors.message}
              aria-describedby={`${id}-hint`}
              placeholder={addition ? '' : 'Click for a few quick questions, or just type.'}
              className={cn('absolute inset-0 block h-full w-full resize-none overflow-y-auto border-0 bg-transparent p-4 text-black outline-none placeholder:text-gray', type.body)}
            />
          </div>
          <div aria-live="polite" data-composer-options onClick={(event) => { if (event.target === event.currentTarget) field.current?.focus() }} className="min-h-[6.5rem] px-4 pb-4">
            {group && (
              <motion.fieldset key={group.key} data-composer-group={group.key} initial={low ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: low ? 0 : 0.35, ease: ease.outExpo }} className="m-0 min-w-0 border-0 p-0">
                <legend className={cn('mb-2 flex w-full items-center justify-between gap-4 p-0 text-gray', type.caption)}>
                  <span>{group.prompt}</span>
                  {stepper}
                </legend>
                <div className="flex flex-wrap items-center gap-2.5">
                  {group.options.map((item) => {
                    const on = hasSentence(text, item)
                    return (
                      <button
                        key={item.label}
                        type="button"
                        aria-pressed={on}
                        data-composer-option={item.label}
                        // Keep the caret in the field: the box never loses focus to a press.
                        onMouseDown={(event) => event.preventDefault()}
                        // Only a pointer that actually moved counts as pointing: after a press the next
                        // question's answers appear under a still cursor, and must not preview themselves.
                        onMouseMove={(event) => { if ((event.movementX || event.movementY) && pointed !== item.label) setPointed(item.label) }}
                        onMouseLeave={() => setPointed(null)}
                        onFocus={() => setPointed(item.label)}
                        onBlur={() => setPointed(null)}
                        // An answer moves on to the next question; taking one back out stays put.
                        onClick={() => { setText(toggleSentence(text, item, group)); if (!on) setAt(stepQuestion(at, 1)); setPointed(null) }}
                        className={cn('cursor-pointer rounded-full border px-3.5 py-1.5 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label, on ? 'border-black bg-black text-white' : 'border-black/25 bg-white text-black hover:border-black hover:bg-black hover:text-white')}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </motion.fieldset>
            )}
            {done && <p data-composer-done className={cn('m-0 flex items-center justify-between gap-4 text-gray', type.caption)}><span>That’s all four.</span>{stepper}</p>}
          </div>
        </div>
        {errors.message
          ? <p id={`${id}-hint`} role="alert" className={cn('mb-0 mt-3 text-primary', type.caption)}>{errors.message}</p>
          : <p id={`${id}-hint`} className={cn('mb-0 mt-3 min-h-5 text-gray', type.caption)}>{hint}</p>}

        {state !== 'fallback' && (
          <div className="mt-auto pt-6">
            <button type="submit" data-composer-send disabled={state === 'sending'} className={cn('group flex w-full cursor-pointer items-center justify-center gap-3 bg-black px-6 py-4 text-white hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-wait disabled:opacity-60', type.label)}>
              {state === 'sending' ? 'Sending…' : 'Send'}<Arrow />
            </button>
          </div>
        )}
      </form>

      {state === 'fallback' && (
        <div data-composer-fallback role="alert" className="mt-10 border-t border-black/15 pt-8">
          <p className={cn('mb-6 mt-0 max-w-[52ch]', type.body)}>That didn’t go through from here. Everything you wrote is in the form below: press Submit there, or email <InlineLink href={`mailto:${siteConfig.email.info}`} className="min-h-0">{siteConfig.email.info}</InlineLink>.</p>
          <ContactFormEmbed showHeader={false} variant="inline" message={text.trim() || undefined} name={name.trim() || undefined} email={email.trim() || undefined} />
        </div>
      )}
    </div>
  )
}
