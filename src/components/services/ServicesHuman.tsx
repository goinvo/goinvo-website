'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ease, useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { InlineLink, textLinkClass } from '@/components/ui/TextLink'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmoothScrollLink } from '@/components/ui/SmoothScrollLink'
import { SECTORS, STATS } from '@/app/(main)/services/content'
import { JOURNEYS, type Journey } from '@/components/services/servicesJourneys'

/**
 * The services page in the homepage study's design, told from the buyer's side. The first
 * screen carries what a buyer needs to decide: the question each service answers, what
 * they get, how long it takes and what it costs. Choosing one shows how working with us
 * on it goes, step by step. The rest of the page is short: numbers, sectors, one quote. Every line is already published (servicesJourneys.ts names where).
 * Shown under the review switch (?design=human); see src/app/(main)/services/page.tsx.
 */

/** The booking section's anchor. The classic page keeps #book; both are in the DOM
 * while the switch can show either, so they need different ids. */
const TALK = 'talk'

function ActionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const body = <><span data-link-label className="group-hover:underline group-focus-visible:underline">{children}</span><Arrow /></>
  if (href.startsWith('#')) return <SmoothScrollLink href={href === '#book' ? `#${TALK}` : href} className={cn(textLinkClass, className)}>{body}</SmoothScrollLink>
  return <Link href={href} className={cn(textLinkClass, className)}>{body}</Link>
}

/** A dash-marked list, the page's one list style (the classic page used orange dots). */
function Dashes({ items, columns = 1 }: { items: string[]; columns?: 1 | 2 }) {
  return (
    <ul className={cn('m-0 grid list-none gap-x-8 gap-y-3 p-0', columns === 2 && 'sm:grid-cols-2')}>
      {items.map((item) => <li key={item} className={cn('relative pl-6', type.body)}><span aria-hidden="true" className="absolute left-0">–</span>{item}</li>)}
    </ul>
  )
}

/** "20+yrs": the figure at display size, its unit small beside it. */
function Figure({ value }: { value: string }) {
  const [, number, unit] = value.trim().match(/^(\d[\d,.]*)(.*)$/) ?? [value, value, '']
  return (
    <p className="m-0 font-serif text-[clamp(56px,6.5vw,104px)] leading-[0.9] tracking-[-0.04em]">
      {number}{unit && <span className="ml-1 align-top text-[0.36em] tracking-normal">{unit}</span>}
    </p>
  )
}

/** The services, first thing on screen: each question with what you get, how long, how much. */
function Opening({ low }: { low: boolean }) {
  const [selected, setSelected] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()
  const choose = (index: number, focus = false) => {
    const next = (index + JOURNEYS.length) % JOURNEYS.length
    setSelected(next)
    if (focus) tabs.current[next]?.focus()
  }
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const move = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: JOURNEYS.length - 1 }[event.key]
    if (move === undefined) return
    event.preventDefault()
    choose(move, true)
  }
  const journey = JOURNEYS[selected]
  return (
    <Section spacing="none" aria-labelledby="services-title" className="pb-24 pt-[calc(var(--spacing-header-height)+2rem)] md:pb-36 md:pt-[calc(var(--spacing-header-height)+3rem)]">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
        <h1 id="services-title" className="m-0 max-w-[19ch] font-serif text-page-title font-normal">What’s between you and software people use?</h1>
        <ActionLink href={`#${TALK}`} className={cn('max-md:hidden md:mb-2', type.lead)}>Schedule a chat</ActionLink>
      </div>

      <div role="tablist" aria-label="The question you’re facing" data-journey-tabs className="mt-8 grid border-t border-black/15 md:mt-14 md:grid-cols-3">
        {JOURNEYS.map((item, index) => {
          const on = index === selected
          return (
            <button
              key={item.id}
              ref={(node) => { tabs.current[index] = node }}
              role="tab"
              type="button"
              id={`${id}-tab-${item.id}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              tabIndex={on ? 0 : -1}
              data-journey-tab={item.id}
              onClick={() => choose(index)}
              onKeyDown={(event) => onKey(event, index)}
              className={cn('group relative flex cursor-pointer flex-col items-start border-b border-black/15 bg-transparent py-6 text-left text-black focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary md:border-b-0 md:py-8 md:pr-10', index > 0 && 'md:border-l md:pl-10')}
            >
              <span aria-hidden="true" className={cn('absolute -top-px left-0 h-[3px] bg-black transition-[width] duration-500 motion-reduce:transition-none', on ? 'w-full' : 'w-0 group-hover:w-8')} />
              <span className={cn('block transition-colors max-md:text-[1.5rem] max-md:leading-[1.15]', type.title, on ? 'text-black' : 'text-black/55 group-hover:text-black')}>{item.concern}</span>
              {/* The facts a buyer decides on. A desktop stacks them with their labels; a
                  phone runs the three values on a line, so all three services fit one screen. */}
              <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 md:mt-8 md:grid md:w-full md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <span data-journey-fact="hold" className="md:col-span-2">
                  <span className={cn('block text-gray max-md:hidden', type.caption)}>You get</span>
                  <span className={cn('block', type.body)}>{item.youHoldLabel}</span>
                </span>
                <span data-journey-fact="length">
                  <span className={cn('block text-gray max-md:hidden', type.caption)}>Takes</span>
                  <span className={cn('block max-md:text-gray', type.body)}>{item.engagement.length}</span>
                </span>
                <span data-journey-fact="investment">
                  <span className={cn('block text-gray max-md:hidden', type.caption)}>Typical investment</span>
                  <span className={cn('block max-md:text-gray', type.body)}>{item.engagement.investment}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${journey.id}`} data-journey-panel={journey.id} className="mt-16 md:mt-24">
        {/* Keyed, so a new choice mounts fresh and fades in; nothing waits on an exit. */}
        <motion.div key={journey.id} initial={low ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: low ? 0 : 0.35, ease: ease.outExpo }}>
          <JourneyView journey={journey} low={low} />
        </motion.div>
      </div>
    </Section>
  )
}

/** One journey: how it goes (the steps on a line that draws in), what you hold, and proof. */
function JourneyView({ journey, low }: { journey: Journey; low: boolean }) {
  const draw = low ? { initial: false as const } : { initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: { duration: 0.9, ease: ease.outExpo } }
  return (
    <>
      <div className="grid gap-16 lg:grid-cols-[1.4fr_0.6fr] lg:gap-24">
        <div>
          <p className={cn('m-0', type.label)}>How it goes</p>
          <ol data-journey-steps className="relative m-0 mt-10 grid list-none gap-10 p-0 md:grid-cols-3 md:gap-0">
            <motion.span aria-hidden="true" {...draw} className="absolute left-3 top-3 hidden h-px w-[calc(100%-1.5rem)] origin-left bg-black md:block" />
            {journey.steps.map((step, index) => (
              <motion.li
                key={step.name}
                data-journey-step
                initial={low ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: low ? 0 : 0.45, delay: low ? 0 : 0.15 + index * 0.12, ease: ease.outExpo }}
                className="relative pl-12 md:pl-0 md:pr-8"
              >
                <span aria-hidden="true" className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-white text-[13px] tabular-nums leading-none md:relative">{index + 1}</span>
                <h3 className={cn('mb-2 mt-0 md:mt-8', type.quote)}>{step.name}</h3>
                <p className={cn('m-0 max-w-[24ch] text-gray', type.body)}>{step.does.join(', ')}</p>
              </motion.li>
            ))}
          </ol>
          {journey.outcome && (
            <figure data-journey-outcome className="m-0 mt-16 grid gap-4 border-t border-black/15 pt-8 md:mt-20 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
              <p className="m-0 whitespace-nowrap font-serif text-[clamp(44px,4.4vw,72px)] leading-[0.9] tracking-[-0.04em]">{journey.outcome.figure}</p>
              <figcaption className={cn('max-w-[46ch]', type.body)}>{journey.outcome.result}<ActionLink href={journey.outcome.href} className="mt-2">{journey.outcome.link}</ActionLink></figcaption>
            </figure>
          )}
        </div>
        <aside aria-label="What you hold at the end" data-journey-hold className="relative self-start bg-tertiary-lightest p-8 md:p-12">
          <p className={cn('m-0', type.label)}>At the end, you hold</p>
          <h3 className={cn('mb-6 mt-3', type.title)}>{journey.youHoldLabel}</h3>
          <Dashes items={journey.youHold.slice(0, 3)} />
          <ActionLink href={journey.engagement.href} className="mt-8">{journey.engagement.cta}</ActionLink>
        </aside>
      </div>
    </>
  )
}

function Proof() {
  return (
    <Section spacing="none" className="py-24 md:py-36">
      <ul aria-label="GoInvo in numbers" className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-14 p-0 lg:grid-cols-4 lg:gap-x-12">
        {STATS.map((stat) => (
          <li key={stat.v} data-rule className="border-t border-black pt-5">
            <Figure value={stat.v} />
            <p className={cn('mb-0 mt-3 max-w-[26ch]', type.body)}>{stat.cap}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** The four sectors as pictures to click, not paragraphs to read: the work is behind each. */
function Sectors() {
  return (
    <Section aria-labelledby="services-where">
      <SectionHeading id="services-where" text="Four places where software can’t afford to fail." className="max-w-[18ch]" />
      <ul className="m-0 mt-12 grid list-none grid-cols-2 gap-x-5 gap-y-12 p-0 md:mt-20 lg:grid-cols-4 lg:gap-x-10">
        {SECTORS.map((sector) => (
          <li key={sector.k} data-sector>
            <Link href={sector.href} aria-label={sector.link} className="group block text-black no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary">
              <span className="relative block aspect-[4/3] overflow-hidden">
                <Image src={sector.img} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04] motion-reduce:transition-none" />
              </span>
              <span className={cn('mt-4 flex items-center gap-2', type.quote)}><span data-link-label className="group-hover:underline group-focus-visible:underline">{sector.k}</span><Arrow /></span>
              <span className={cn('mt-1 block text-gray', type.body)}>{sector.sub}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Testimonial() {
  return (
    <Section tone="grey" aria-label="What a client said">
      <figure className="m-0">
        <blockquote className="m-0">
          <p className="m-0 max-w-[26ch] font-serif text-[clamp(32px,3.8vw,60px)] leading-[1.12] tracking-[-0.02em]">“With Invo, design wasn’t just design. It impacted our IP portfolio. It changed our business.”</p>
        </blockquote>
        <figcaption className={cn('mt-8', type.label)}>Serban Georgescu, MD<br /><span className={type.caption}>Director of Clinical Development, InfoBionic</span></figcaption>
      </figure>
    </Section>
  )
}

function Talk({ booking }: { booking: ReactNode }) {
  return (
    <Section id={TALK} aria-labelledby="services-talk" className="scroll-mt-24">
      <div className="grid items-end gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
        <SectionHeading id="services-talk" text="Choose a time to talk about your project." className="max-w-[15ch]" />
        <div>
          <p className={cn('m-0 max-w-[44ch]', type.body)}>Thirty minutes with a principal, not a salesperson. No deck, no obligation.</p>
          <p className={cn('mb-0 mt-4', type.label)}>Prefer email? <InlineLink href="mailto:info@goinvo.com">info@goinvo.com</InlineLink></p>
        </div>
      </div>
      <div data-rule className="mt-16 border-t border-black/15 pt-10 md:mt-24">{booking}</div>
      <div data-rule className="mt-12 grid gap-6 border-t border-black/15 pt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
        <div>
          <p className={cn('m-0', type.label)}>Certified &amp; contracted</p>
        </div>
        <dl className="m-0 flex flex-wrap gap-x-12 gap-y-4">
          <div><dt className={type.caption}>State of MA</dt><dd className={cn('m-0', type.label)}>ITS81</dd></div>
          <div><dt className={type.caption}>Federal</dt><dd className={cn('m-0', type.label)}>GSA 47QTCA26D001W</dd></div>
        </dl>
      </div>
    </Section>
  )
}

export function ServicesHuman({ booking }: { booking: ReactNode }) {
  const low = useReducedMotion() ?? false
  return (
    <div className="bg-white text-black">
      <Opening low={low} />
      <Proof />
      <Sectors />
      <Testimonial />
      <Talk booking={booking} />
    </div>
  )
}
