'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { InlineLink, textLinkClass } from '@/components/ui/TextLink'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmoothScrollLink } from '@/components/ui/SmoothScrollLink'
import { ContactComposer, type ComposerPreset } from '@/components/forms/ContactComposer'
import { SECTORS, STATS } from '@/app/(main)/services/content'
import { JOURNEYS, SERVICES_TESTIMONIAL, WHAT_WE_DO, type Journey } from '@/components/services/servicesJourneys'

/**
 * The services page in the homepage study's design. It follows what other studios' services
 * pages do (docs/research/services-pages-2026-11-18.md): the first screen is one statement;
 * below it the page is ONE block repeated, once per service; proof and the way to act come
 * after. What it keeps that they lack: how long each service takes and what it costs.
 * servicesJourneys.ts says where each line comes from.
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

function Fact({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div data-service-fact={name}>
      <dt className={cn('text-gray', type.caption)}>{label}</dt>
      <dd className={cn('m-0', type.label)}>{value}</dd>
    </div>
  )
}

/** One service, as a column: the question, what it is, the four facts and one way to act. */
function Service({ journey, index, ask }: { journey: Journey; index: number; ask: (journey: Journey) => void }) {
  return (
    <article id={journey.id} data-service={journey.id} aria-labelledby={`service-${journey.id}`} className="flex scroll-mt-24 flex-col border-t border-black pt-5 lg:row-span-7 lg:grid lg:grid-rows-subgrid">
      <p className={cn('m-0 tabular-nums text-gray', type.caption)}>{String(index + 1).padStart(2, '0')} · {journey.title.replace(/\.$/, '')}</p>
      <h2 id={`service-${journey.id}`} className="mb-0 mt-2 font-serif text-[clamp(1.75rem,2.3vw,2.25rem)] font-normal leading-[1.08] tracking-[-0.02em]">{journey.concern}</h2>
      <p className={cn('mb-0 mt-3', type.body)}>{journey.description}</p>

      <dl className="m-0 mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-black/15 pt-4">
        <Fact name="hold" label="You get" value={journey.youHoldLabel} />
        <Fact name="team" label="You work with" value={journey.engagement.team} />
        <Fact name="length" label="Takes" value={journey.engagement.length} />
        <Fact name="investment" label="Typical investment" value={journey.engagement.investment} />
      </dl>

      {/* One line of evidence, or where to read more: every column has exactly one. */}
      <p data-service-outcome className={cn('mb-0 mt-4 text-gray', type.caption)}>
        {journey.outcome
          ? <><strong className="font-semibold text-black">{journey.outcome.figure}</strong> {journey.outcome.result} <InlineLink href={journey.outcome.href} className="!min-h-0">{journey.outcome.client} case study</InlineLink></>
          : <InlineLink href={journey.engagement.href} className="!min-h-0">{journey.engagement.cta}</InlineLink>}
      </p>

      <div className="mt-auto pt-5">
        <button type="button" data-service-ask={journey.id} onClick={() => ask(journey)} className={cn('group inline-flex w-full cursor-pointer items-center justify-between gap-3 bg-black px-5 py-3 text-white hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary', type.label)}>Ask us about this<Arrow /></button>
      </div>
      <div className="relative mt-5 aspect-[16/9] overflow-hidden">
        <Image src={journey.image.src} alt="" fill sizes="(min-width:1024px) 30vw, 100vw" className="object-cover" style={{ objectPosition: journey.image.focus }} />
      </div>
    </article>
  )
}

/**
 * The first screen IS the services: what we do in one sentence, then the three services
 * side by side, each complete (question, what you get, who, how long, the cost, one way
 * to act). Their pictures sit under the fold line; the other way in comes last.
 */
function Opening({ ask }: { ask: (journey: Journey) => void }) {
  return (
    <Section spacing="none" aria-labelledby="services-title" className="pb-16 pt-[calc(var(--spacing-header-height)+2rem)] md:pb-24 lg:pt-[calc(var(--spacing-header-height)+2.5rem)]">
      <div className="grid gap-x-16 gap-y-5 lg:grid-cols-[auto_1fr] lg:items-end">
        <h1 id="services-title" className="m-0 font-serif text-page-title font-normal">Design for impact.</h1>
        <p data-what-we-do className={cn('m-0 max-w-[58ch] lg:justify-self-end', type.lead)}>{WHAT_WE_DO}</p>
      </div>
      {/* Each column is seven rows of one shared grid, so the same part sits on the same line in all three. */}
      <div data-services className="mt-10 grid gap-x-10 gap-y-14 lg:mt-12 lg:grid-cols-3 lg:gap-y-0">
        {JOURNEYS.map((journey, index) => <Service key={journey.id} journey={journey} index={index} ask={ask} />)}
      </div>
      <p data-service-talk className="mb-0 mt-12 border-t border-black/15 pt-6">
        <ActionLink href={`#${TALK}`} className={type.lead}>…or tell us what you’re working on</ActionLink>
      </p>
    </Section>
  )
}

/** The published captions, cut to the few words that carry the number. */
const STAT_WORDS: Record<string, string> = { '20+yrs': 'designing complex software', '60+': 'products shipped', '91%': 'of clients return', '160M+': 'people impacted' }

/** Proof, in one place: what a client said, four numbers, and where we work. */
function Proof() {
  return (
    <Section tone="grey" aria-label="Proof">
      <figure data-testimonial className="m-0">
        <blockquote className="m-0">
          <p className="m-0 max-w-[34ch] font-serif text-[clamp(28px,3vw,46px)] leading-[1.16] tracking-[-0.02em]">“{SERVICES_TESTIMONIAL.quote}”</p>
        </blockquote>
        <figcaption className={cn('mt-8', type.label)}>{SERVICES_TESTIMONIAL.name}<br /><span className={type.caption}>{SERVICES_TESTIMONIAL.role}</span></figcaption>
      </figure>
      <ul aria-label="GoInvo in numbers" className="m-0 mt-16 grid list-none grid-cols-2 gap-x-8 gap-y-8 border-t border-black/15 p-0 pt-10 md:mt-24 lg:grid-cols-4">
        {STATS.map((stat) => (
          <li key={stat.v} data-stat>
            <p className={cn('m-0', type.title)}>{stat.v.replace(/yrs$/, ' years')}</p>
            <p className={cn('mb-0 mt-2 max-w-[24ch] text-gray', type.caption)}>{STAT_WORDS[stat.v] ?? stat.cap}</p>
          </li>
        ))}
      </ul>
      <p data-sectors className={cn('mb-0 mt-12 flex flex-wrap items-baseline gap-x-6 gap-y-2', type.label)}>
        <span className="text-gray">See the work in</span>
        {SECTORS.map((sector) => <InlineLink key={sector.k} href={sector.href}>{sector.k}</InlineLink>)}
      </p>
    </Section>
  )
}

/** The way to act: the contact composer, already holding the service they pressed. Booking a
 * call is the second way, folded away until asked for, so the section stays one thing. */
function Talk({ booking, preset }: { booking: ReactNode; preset?: ComposerPreset }) {
  const [calendar, setCalendar] = useState(false)
  return (
    <Section id={TALK} aria-labelledby="services-talk" className="scroll-mt-20">
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading id="services-talk" text="Tell us what you’re working on." className="text-balance" />
          <p className={cn('mb-0 mt-6 max-w-[34ch] text-pretty', type.lead)}>A principal reads it, not a salesperson.</p>
          <p className={cn('mb-0 mt-6', type.label)}>Prefer email? <InlineLink href="mailto:info@goinvo.com">info@goinvo.com</InlineLink></p>
        </div>
        <ContactComposer preset={preset} />
      </div>
      {/* One closing row: the other way to reach us on the left, the contract numbers on the right. */}
      <div data-rule className="mt-16 border-t border-black/15 pt-8 md:mt-24">
        <div className="flex flex-wrap items-center justify-between gap-x-12 gap-y-6">
          <button type="button" data-booking-toggle aria-expanded={calendar} onClick={() => setCalendar(!calendar)} className={cn('group inline-flex cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary', type.lead)}>
            <span data-link-label className="group-hover:underline group-focus-visible:underline">{calendar ? 'Hide the calendar' : 'Or choose a time to talk'}</span><Arrow />
          </button>
          <dl className="m-0 flex flex-wrap gap-x-10 gap-y-3">
            <div><dt className={cn('text-gray', type.caption)}>State of MA contract</dt><dd className={cn('m-0', type.label)}>ITS81</dd></div>
            <div><dt className={cn('text-gray', type.caption)}>Federal contract</dt><dd className={cn('m-0', type.label)}>GSA 47QTCA26D001W</dd></div>
          </dl>
        </div>
        {calendar && <div data-booking className="mt-10">{booking}</div>}
      </div>
    </Section>
  )
}

export function ServicesHuman({ booking }: { booking: ReactNode }) {
  const [preset, setPreset] = useState<ComposerPreset>()
  /** Press a service: its sentence goes into the form, and the page goes there. */
  const ask = (journey: Journey) => {
    setPreset((current) => ({ sentence: journey.ask, replaces: JOURNEYS.map((item) => item.ask), key: (current?.key ?? 0) + 1 }))
    const target = document.getElementById(TALK)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  }
  return (
    <div className="bg-white text-black">
      <Opening ask={ask} />
      <Proof />
      <Talk booking={booking} preset={preset} />
    </div>
  )
}
