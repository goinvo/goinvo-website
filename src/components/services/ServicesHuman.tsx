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
import { JOURNEYS, SECTOR_PICTURES, type Journey } from '@/components/services/servicesJourneys'
import { FAR_PROOF, PLACES, WHAT_WE_DO, WORKDAY, WORKING_WAYS, clock, hoursInEastern, sharedCount, sharedHours } from '@/components/services/servicesWorking'

/**
 * The services page in the homepage study's design, told from the buyer's side, in the
 * order a buyer asks: what do you do (one sentence and the three services, each with what
 * you get, how long and how much, on the first screen); what is it like to work with you
 * (who, in the room, between sessions, and across time zones); how does an engagement go
 * (the steps and what you hold); then proof, sectors and a time to talk. servicesJourneys.ts
 * and servicesWorking.ts say where each line comes from, and which lines are new.
 * Shown under the review switch (?design=human); see src/app/(main)/services/page.tsx.
 */

/** The booking section's anchor. The classic page keeps #book; both are in the DOM
 * while the switch can show either, so they need different ids. */
const TALK = 'talk'
const HOW = 'how'

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

/** What we do, in one sentence, and the three services with the facts a buyer decides on. */
function Opening({ choose }: { choose: (index: number) => void }) {
  return (
    <Section spacing="none" aria-labelledby="services-title" className="pb-20 pt-[calc(var(--spacing-header-height)+1.25rem)] md:pb-28 md:pt-[calc(var(--spacing-header-height)+3rem)]">
      <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-end md:gap-16">
        <h1 id="services-title" className="m-0 font-serif text-page-title font-normal md:whitespace-nowrap">Design for impact.</h1>
        <p data-what-we-do className={cn('m-0 max-w-[50ch] max-md:text-[1.0625rem] max-md:leading-[1.4] md:pb-2', type.lead)}>{WHAT_WE_DO}</p>
      </div>

      <ul data-service-rows aria-label="What we do" className="m-0 mt-5 grid list-none border-t border-black/15 p-0 md:mt-12 md:grid-cols-3">
        {JOURNEYS.map((item, index) => (
          <li key={item.id} className={cn('border-b border-black/15 md:border-b-0', index > 0 && 'md:border-l md:border-black/15')}>
            <a
              href={`#${HOW}`}
              data-service-row={item.id}
              onClick={(event) => { event.preventDefault(); choose(index); document.getElementById(HOW)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={cn('group relative flex h-full flex-col items-start py-5 text-left text-black no-underline max-md:pr-28 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary md:py-8 md:pr-10', index > 0 && 'md:pl-10')}
            >
              <span aria-hidden="true" className="absolute -top-px left-0 h-[3px] w-0 bg-black transition-[width] duration-500 group-hover:w-full group-focus-visible:w-full motion-reduce:transition-none" />
              {/* Its picture: a strip across the column on a desktop, a thumbnail beside the
                  words on a phone, so the three services still fit one screen. */}
              <span className="overflow-hidden max-md:absolute max-md:right-0 max-md:top-5 max-md:h-24 max-md:w-24 md:relative md:mb-6 md:block md:h-[clamp(110px,9vw,140px)] md:w-full">
                <Image src={item.image.src} alt="" fill priority sizes="(min-width:768px) 30vw, 96px" className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04] motion-reduce:transition-none" style={{ objectPosition: item.image.focus }} />
              </span>
              <span className={cn('block max-md:text-[1.5rem] max-md:leading-[1.15]', type.title)}>{item.concern}</span>
              <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 md:mt-5 md:grid md:w-full md:grid-cols-2 md:gap-x-6 md:gap-y-4">
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
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Two working days on one clock: ours, theirs, and the hours they share. */
function HoursBand() {
  const [selected, setSelected] = useState(0)
  const place = PLACES[selected]
  const theirs = hoursInEastern(place.offset)
  const shared = sharedHours(place.offset)
  const count = sharedCount(place.offset)
  const span = ([a, b]: [number, number]) => ({ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%` })
  const slide = 'absolute inset-y-0 transition-[left,width] duration-700 ease-out-expo motion-reduce:transition-none'
  const summary = count === 0
    ? 'No shared office hours.'
    : count === WORKDAY.end - WORKDAY.start
      ? 'All eight working hours shared.'
      : `About ${count} shared hours a day: ${clock(shared[0][0])} to ${clock(shared[0][1])} Eastern, ${clock(shared[0][0] + place.offset)} to ${clock(shared[0][1] + place.offset)} for you.`
  return (
    <div data-hours-band className="mt-16 border-t border-black/25 pt-10 md:mt-24 md:pt-12">
      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
        <p id="hours-where" className={cn('m-0', type.quote)}>Where is your team?</p>
        <div role="group" aria-labelledby="hours-where" className="flex flex-wrap gap-2">
          {PLACES.map((item, index) => (
            <button key={item.id} type="button" data-place={item.id} aria-pressed={index === selected} onClick={() => setSelected(index)} className={cn('cursor-pointer rounded-full border px-4 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label, index === selected ? 'border-black bg-black text-tertiary' : 'border-black/40 bg-transparent text-black hover:border-black')}>{item.label}</button>
          ))}
        </div>
      </div>

      <div role="img" aria-label={`Our working day and yours on one clock. ${summary}`} className="mt-10 grid grid-cols-[4.5rem_1fr] items-center gap-x-4 gap-y-3 md:grid-cols-[6rem_1fr]">
        <span className={cn('text-gray', type.caption)}>Our day</span>
        <div className="relative h-7 bg-black/10">
          <span className="absolute inset-y-0 bg-black/45" style={span([WORKDAY.start, WORKDAY.end])} />
          {shared.map((range, index) => <span key={index} data-shared className={cn(slide, 'bg-primary')} style={span(range)} />)}
        </div>
        <span className={cn('text-gray', type.caption)}>Your day</span>
        <div className="relative h-7 bg-black/10">
          {theirs.map((range, index) => <span key={index} className={cn(slide, 'bg-secondary')} style={span(range)} />)}
          {shared.map((range, index) => <span key={index} className={cn(slide, 'bg-primary')} style={span(range)} />)}
        </div>
        <span />
        <div aria-hidden="true" className={cn('relative h-5 text-gray', type.caption)}>
          {[[0, 'midnight'], [6, '6am'], [12, 'noon'], [18, '6pm']].map(([hour, label]) => <span key={label} className={cn('absolute top-0', hour === 6 || hour === 18 ? 'max-sm:hidden' : '')} style={{ left: `${(Number(hour) / 24) * 100}%` }}>{label}</span>)}
          <span className="absolute right-0 top-0">Eastern</span>
        </div>
      </div>

      <div aria-live="polite" className="mt-8 grid gap-3 md:grid-cols-2 md:gap-16">
        <p data-hours-summary className={cn('m-0', type.lead)}><span aria-hidden="true" className="mr-3 inline-block h-3 w-3 bg-primary align-baseline" />{summary}</p>
        <p data-hours-means className={cn('m-0 max-w-[44ch] text-gray', type.body)}>{place.means}</p>
      </div>
    </div>
  )
}

/** What it is like to work with us: who, in the room, between sessions, and across time zones. */
function Working() {
  return (
    <Section tone="dark" aria-labelledby="services-working" data-working>
      <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-24">
        <div>
          <SectionHeading id="services-working" text="What it’s like to work with us." className="max-w-[14ch]" />
          <ol className="m-0 mt-12 grid list-none gap-10 p-0 md:mt-16">
            {WORKING_WAYS.map((way, index) => (
              <li key={way.id} data-working-way={way.id} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-black/25 pt-6">
                <span aria-hidden="true" className={cn('tabular-nums text-gray', type.label)}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className={cn('m-0', type.quote)}>{way.title}</h3>
                  <p className={cn('mb-0 mt-2 max-w-[46ch] text-gray', type.body)}>{way.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <figure className="relative m-0 min-h-[320px] overflow-hidden lg:min-h-0">
          <Image src="/images/services/working-together.jpg" alt="Four GoInvo designers gathered around a phone, testing a design together at a studio desk" fill sizes="(min-width:1024px) 38vw, 100vw" className="object-cover" style={{ objectPosition: '42% 35%' }} />
        </figure>
      </div>
      <HoursBand />
      <p className={cn('mb-0 mt-10 max-w-[60ch]', type.body)}>{FAR_PROOF.text}<ActionLink href={FAR_PROOF.href} className="mt-2">{FAR_PROOF.link}</ActionLink></p>
    </Section>
  )
}

/** How an engagement goes: choose a service, see its steps and what you hold at the end. */
function Engagements({ selected, choose, low }: { selected: number; choose: (index: number) => void; low: boolean }) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const id = useId()
  const move = (index: number) => {
    const next = (index + JOURNEYS.length) % JOURNEYS.length
    choose(next)
    tabs.current[next]?.focus()
  }
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const to = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: JOURNEYS.length - 1 }[event.key]
    if (to === undefined) return
    event.preventDefault()
    move(to)
  }
  const journey = JOURNEYS[selected]
  return (
    <Section id={HOW} aria-labelledby="services-how" className="scroll-mt-24">
      <SectionHeading id="services-how" text="How an engagement goes." className="max-w-[14ch]" />
      <div role="tablist" aria-label="The question you’re facing" data-journey-tabs className="mt-10 grid border-t border-black/15 md:mt-14 md:grid-cols-3">
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
              className={cn('group relative cursor-pointer border-b border-black/15 bg-transparent py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-secondary md:border-b-0 md:pr-8', index > 0 && 'md:border-l md:pl-8')}
            >
              <span aria-hidden="true" className={cn('absolute -top-px left-0 h-[3px] bg-black transition-[width] duration-500 motion-reduce:transition-none', on ? 'w-full' : 'w-0 group-hover:w-8')} />
              <span className={cn('block transition-colors', type.quote, on ? 'text-black' : 'text-black/55 group-hover:text-black')}>{item.concern}</span>
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${journey.id}`} data-journey-panel={journey.id} className="mt-14 md:mt-20">
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
                <Image src={SECTOR_PICTURES[sector.k] ?? sector.img} alt="" fill sizes="(min-width:1024px) 22vw, 45vw" className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04] motion-reduce:transition-none" />
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
  const [selected, setSelected] = useState(0)
  return (
    <div className="bg-white text-black">
      <Opening choose={setSelected} />
      <Working />
      <Engagements selected={selected} choose={setSelected} low={low} />
      <Proof />
      <Sectors />
      <Testimonial />
      <Talk booking={booking} />
    </div>
  )
}
