'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ease, useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { InlineLink, textLinkClass } from '@/components/ui/TextLink'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmoothScrollLink } from '@/components/ui/SmoothScrollLink'
import { SECTORS, STATS } from '@/app/(main)/services/content'
import { JOURNEYS, LONG_TERM, type Journey } from '@/components/services/servicesJourneys'

/**
 * The services page in the homepage study's design, told from the buyer's side: the
 * services are the first thing on screen, each as the question a buyer is facing, and
 * choosing one shows what working with us on it looks like, step by step, and what they
 * hold at the end. Every line is already published (servicesJourneys.ts names where).
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
    <ul className={cn('m-0 grid list-none gap-x-8 gap-y-2 p-0', columns === 2 && 'sm:grid-cols-2')}>
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

/** The services, first thing on screen: the question each one answers, as tabs. */
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
    <Section spacing="none" aria-labelledby="services-title" className="pb-20 pt-[calc(var(--spacing-header-height)+1.75rem)] md:pb-28 md:pt-[calc(var(--spacing-header-height)+2.5rem)]">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
        <div>
          <p className={cn('mb-5 mt-0', type.label)}>Services</p>
          <h1 id="services-title" className="m-0 max-w-[19ch] font-serif text-page-title font-normal">What’s between you and software people use?</h1>
        </div>
        <ActionLink href={`#${TALK}`} className={cn('max-md:hidden md:mb-2', type.lead)}>Schedule a chat</ActionLink>
      </div>
      <p className={cn('mb-0 mt-4 max-w-[54ch] md:mt-5', type.lead)}>Choose the question you’re facing. See how working with us on it goes, step by step, and what you’ll hold at the end.</p>

      <div role="tablist" aria-label="The question you’re facing" data-journey-tabs className="mt-7 grid border-t border-black/15 md:mt-10 md:grid-cols-3">
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
              className={cn('group relative flex cursor-pointer flex-col items-start border-b border-black/15 bg-transparent py-4 text-left text-black focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary md:border-b-0 md:py-6 md:pr-8', index > 0 && 'md:border-l md:pl-8')}
            >
              <span aria-hidden="true" className={cn('absolute -top-px left-0 h-[3px] bg-black transition-[width] duration-500 motion-reduce:transition-none', on ? 'w-full' : 'w-0 group-hover:w-8')} />
              <span className={cn('flex items-center gap-3 text-gray', type.label)}>
                <span aria-hidden="true" className={cn('h-2.5 w-2.5 rounded-full border border-current transition-colors', on && 'border-secondary bg-secondary')} />
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={cn('mt-2 block transition-colors max-md:text-[1.5rem] max-md:leading-[1.15] md:mt-4', type.title, on ? 'text-black' : 'text-black/45 group-hover:text-black/75')}>{item.concern}</span>
              {/* On a phone only the chosen question carries its answer: three would push the third question off the first screen. */}
              <span className={cn('mt-2 transition-colors md:mt-3 md:block', on ? 'block' : 'hidden', type.body, on ? 'text-black' : 'text-gray')}>{item.title}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${journey.id}`} data-journey-panel={journey.id} className="mt-10 md:mt-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={journey.id} initial={low ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={low ? { opacity: 1 } : { opacity: 0, y: -6 }} transition={{ duration: low ? 0 : 0.35, ease: ease.outExpo }}>
            <JourneyView journey={journey} low={low} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Section>
  )
}

/** One journey: how it goes (the steps on a line that draws in), what you hold, and proof. */
function JourneyView({ journey, low }: { journey: Journey; low: boolean }) {
  const draw = low ? { initial: false as const } : { initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: { duration: 0.9, ease: ease.outExpo } }
  return (
    <>
      <div className="grid gap-12 lg:grid-cols-[1.4fr_0.6fr] lg:gap-16">
        <div>
          <p className={cn('m-0', type.label)}>How it goes</p>
          <p className={cn('mb-0 mt-3 max-w-[52ch]', type.lead)}>{journey.description}</p>
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
                <h3 className={cn('mb-3 mt-0 md:mt-6', type.quote)}>{step.name}</h3>
                <Dashes items={step.does} />
              </motion.li>
            ))}
          </ol>
        </div>
        <aside aria-label="What you hold at the end" data-journey-hold className="relative bg-tertiary-lightest p-7 md:p-9">
          <p className={cn('m-0', type.label)}>At the end, you hold</p>
          <h3 className={cn('mb-5 mt-2', type.title)}>{journey.youHoldLabel}</h3>
          <Dashes items={journey.youHold} />
          <dl className="m-0 mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-black/15 pt-6">
            <div className="col-span-2"><dt className={type.caption}>Usually starts as</dt><dd className={cn('m-0', type.body)}>{journey.engagement.name}</dd></div>
            <div><dt className={type.caption}>Length</dt><dd className={cn('m-0', type.body)}>{journey.engagement.length}</dd></div>
            <div><dt className={type.caption}>Who’s in the room</dt><dd className={cn('m-0', type.body)}>{journey.engagement.team}</dd></div>
            <div className="col-span-2"><dt className={type.caption}>Typical investment</dt><dd className="m-0 mt-1 font-serif text-[clamp(32px,2.6vw,44px)] leading-none tracking-[-0.03em]">{journey.engagement.investment}</dd></div>
          </dl>
          <ActionLink href={journey.engagement.href} className="mt-6">{journey.engagement.cta}</ActionLink>
        </aside>
      </div>
      {journey.outcome && (
        <figure data-journey-outcome className="m-0 mt-14 grid gap-4 border-t border-black/15 pt-8 md:grid-cols-[auto_1fr_auto] md:items-end md:gap-12">
          <p className="m-0 whitespace-nowrap font-serif text-[clamp(48px,5vw,80px)] leading-[0.9] tracking-[-0.04em]">{journey.outcome.figure}</p>
          <figcaption className={cn('max-w-[46ch]', type.body)}>{journey.outcome.result}<span className={cn('mt-1 block text-gray', type.caption)}>{journey.outcome.client}</span></figcaption>
          <ActionLink href={journey.outcome.href}>{journey.outcome.link}</ActionLink>
        </figure>
      )}
      <p className={cn('mb-0 mt-10 text-gray', type.body)}>
        Need a team for longer? An {LONG_TERM.name.toLowerCase()} runs {LONG_TERM.rows[0]} with a {LONG_TERM.rows[1].toLowerCase()}.{' '}
        <SmoothScrollLink href={`#${TALK}`} className="text-inherit underline underline-offset-4 hover:text-black">Talk about a partnership</SmoothScrollLink>
      </p>
    </>
  )
}

function Proof() {
  return (
    <Section spacing="none" className="py-16 md:py-24">
      <ul aria-label="GoInvo in numbers" className="m-0 grid list-none gap-x-10 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <li key={stat.v} data-rule className="border-t border-black pt-6">
            <Figure value={stat.v} />
            <p className={cn('mb-0 mt-4 max-w-[26ch]', type.body)}>{stat.cap}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** A sector, told like the homepage's evidence rows: the picture opens as it arrives. */
function SectorRow({ sector, index, low }: { sector: typeof SECTORS[number]; index: number; low: boolean }) {
  const row = useRef<HTMLLIElement>(null)
  const { scrollYProgress } = useScroll({ target: row, offset: ['start 0.95', 'start 0.45'] })
  // Through a JS transform: handed straight on, framer runs these on a native scroll
  // timeline, which stopped the crop short of open (measured 6% at the end of its range).
  const progress = useTransform(scrollYProgress, (v) => v)
  const crop = useTransform(progress, [0, 1], ['inset(14% 0 14% 0)', 'inset(0% 0 0% 0)'])
  const scale = useTransform(progress, [0, 1], [1.15, 1])
  return (
    <li ref={row} data-rule className="grid items-center gap-8 border-t border-black/15 py-12 md:grid-cols-2 md:gap-16 md:py-16">
      <motion.div style={{ clipPath: low ? 'inset(0)' : crop }} className={cn('relative aspect-[4/3] overflow-hidden', index % 2 === 1 && 'md:order-2')}>
        <motion.div style={{ scale: low ? 1 : scale }} className="absolute inset-0">
          <Image src={sector.img} alt={`Design for ${sector.k}`} fill sizes="(min-width:768px) 45vw, 90vw" className="object-cover" />
        </motion.div>
      </motion.div>
      <div>
        <h3 className={cn('m-0', type.title)}>{sector.k}</h3>
        <p data-hand-note className={cn('mb-0 mt-2 text-secondary', type.lead)}>{sector.sub}</p>
        <p className={cn('mb-6 mt-6 max-w-[52ch]', type.body)}>{sector.d}</p>
        <Dashes items={sector.bullets} columns={2} />
        <ActionLink href={sector.href} className="mt-4">{sector.link}</ActionLink>
      </div>
    </li>
  )
}

function Sectors({ low }: { low: boolean }) {
  return (
    <Section aria-labelledby="services-where">
      <p className={cn('mb-6 mt-0', type.label)}>Where we work</p>
      <SectionHeading id="services-where" sweep reduced={low} text="Four places where software can’t afford to fail." className="max-w-[18ch]" />
      <ul className="m-0 mt-12 list-none p-0 md:mt-16">{SECTORS.map((sector, index) => <SectorRow key={sector.k} sector={sector} index={index} low={low} />)}</ul>
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
          <p className={cn('m-0 max-w-[44ch]', type.body)}>Thirty minutes with a principal, not a salesperson. We’ll talk about your problem, what it will take to ship, and whether we’re the right firm. No deck, no obligation.</p>
          <p className={cn('mb-0 mt-4', type.label)}>Prefer email? <InlineLink href="mailto:info@goinvo.com">info@goinvo.com</InlineLink></p>
        </div>
      </div>
      <div data-rule className="mt-12 border-t border-black/15 pt-8 md:mt-16">{booking}</div>
      <div data-rule className="mt-12 grid gap-6 border-t border-black/15 pt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
        <div>
          <p className={cn('m-0', type.label)}>Certified &amp; contracted</p>
          <p className={cn('mb-0 mt-2 max-w-[52ch]', type.body)}>Prequalified for IT professional services as a trusted vendor for state and federal agencies.</p>
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
      <Sectors low={low} />
      <Testimonial />
      <Talk booking={booking} />
    </div>
  )
}
