'use client'

import { useRef, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/motion'
import { type } from '@/components/ui/type'
import { Arrow } from '@/components/ui/Arrow'
import { InlineLink, textLinkClass } from '@/components/ui/TextLink'
import { Section } from '@/components/ui/Section'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { DrawnLine } from '@/components/ui/DrawnLine'
import { SmoothScrollLink } from '@/components/ui/SmoothScrollLink'
import { OFFERINGS, REASONS, SECTORS, STATS, TIERS } from '@/app/(main)/services/content'

/**
 * The services page in the homepage study's design: white, ink type on one scale,
 * serif headings, quiet scroll motion, links instead of buttons. Same content as the
 * classic page (content.ts). Shown under the review switch (?design=human); see
 * src/app/(main)/services/page.tsx.
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

function Opening({ low }: { low: boolean }) {
  const figure = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: figure, offset: ['start end', 'end start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1.12, 1])
  return (
    <>
      <Section spacing="none" className="pb-12 pt-[calc(var(--spacing-header-height)+3.5rem)] md:pb-16 md:pt-[calc(var(--spacing-header-height)+6rem)]">
        <p className={cn('mb-6 mt-0', type.label)}>Services</p>
        <h1 className="m-0 max-w-[16ch] font-serif text-page-title font-normal">Disrupt from within. Reinvent the product. Change the market.</h1>
        <div className="mt-10 grid items-end gap-8 md:mt-14 md:grid-cols-[1.3fr_0.7fr] md:gap-16">
          <p className={cn('m-0 max-w-[44ch]', type.lead)}>We help you move fast, reduce risk, and deliver better systems across healthcare, government, enterprise, and AI. Tell us about your project and where GoInvo can help.</p>
          <div className="flex flex-col items-start">
            <ActionLink href={`#${TALK}`} className={type.lead}>Schedule a chat</ActionLink>
            <InlineLink href="mailto:info@goinvo.com" className={type.label}>Or email info@goinvo.com</InlineLink>
          </div>
        </div>
      </Section>
      <div ref={figure} className="relative mx-5 aspect-[4/3] overflow-hidden md:mx-[6vw] md:aspect-[21/9]">
        <motion.div style={{ scale: low ? 1 : scale }} className="absolute inset-0">
          <Image src="/images/services/mitre-dashboard.jpg" alt="" fill priority sizes="(min-width:768px) 88vw, 100vw" className="object-cover" />
        </motion.div>
      </div>
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

function OfferingRow({ offering, index, low }: { offering: typeof OFFERINGS[number]; index: number; low: boolean }) {
  const row = useRef<HTMLLIElement>(null)
  const { scrollYProgress } = useScroll({ target: row, offset: ['start 0.9', 'start 0.3'] })
  const y = useTransform(scrollYProgress, [0, 0.85], [28, 0])
  return (
    <li ref={row} data-rule className="border-t border-black/15 py-10 md:py-14">
      <motion.div style={{ y: low ? 0 : y }}>
        <p data-hand-note className={cn('mb-4 mt-0 text-gray', type.label)}>{String(index + 1).padStart(2, '0')}</p>
        <h3 className={cn('m-0 mb-6', type.title)}><DrawnLine progress={scrollYProgress} low={low} start={0.15} end={0.9}>{offering.k}</DrawnLine></h3>
        <Dashes items={offering.bullets} columns={2} />
      </motion.div>
    </li>
  )
}

function WhatWeDo({ low }: { low: boolean }) {
  return (
    <Section aria-labelledby="services-what">
      <div className="grid items-start gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div className={cn(!low && 'md:sticky md:top-[16vh]')}>
          <SectionHeading id="services-what" sweep reduced={low} text="What we do." className="max-w-[12ch]" />
        </div>
        <ul className="m-0 list-none p-0">{OFFERINGS.map((offering, index) => <OfferingRow key={offering.k} offering={offering} index={index} low={low} />)}</ul>
      </div>
    </Section>
  )
}

function Reasons() {
  return (
    <Section tone="grey" aria-labelledby="services-why">
      <p className={cn('mb-6 mt-0', type.label)}>Why clients hire us</p>
      <h2 id="services-why" className={cn('m-0 max-w-[20ch]', type.heading)}>What you get is beautiful software. What you buy is certainty.</h2>
      <ul className="m-0 mt-14 grid list-none gap-x-16 p-0 md:mt-20 md:grid-cols-2">
        {REASONS.map((reason) => (
          <li key={reason.t} data-rule className="border-t border-black/15 py-8">
            <h3 className={cn('m-0', type.quote)}>{reason.t}</h3>
            <p className={cn('mb-0 mt-3 max-w-[46ch]', type.body)}>{reason.d}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Engagements() {
  return (
    <Section aria-labelledby="services-ways">
      <p className={cn('mb-6 mt-0', type.label)}>Engagement types</p>
      <SectionHeading id="services-ways" text="Ways to work with us." className="max-w-[20ch]" />
      <ul className="m-0 mt-14 grid list-none gap-12 p-0 md:mt-20 md:grid-cols-3 md:gap-0">
        {TIERS.map((tier, index) => (
          <li key={tier.name} className={cn('flex flex-col', index > 0 && 'md:border-l md:border-black/15 md:pl-10', index < TIERS.length - 1 && 'md:pr-10')}>
            <p className={cn('mb-3 mt-0 min-h-7 text-secondary', type.label)}>{tier.featured && <span data-hand-circle>Most common</span>}</p>
            <h3 className={cn('m-0', type.title)}>{tier.name}</h3>
            <p className={cn('mb-8 mt-4 md:min-h-[3lh]', type.body)}>{tier.lead}</p>
            <ul className="m-0 mb-10 list-none p-0">
              {tier.rows.map((row) => <li key={row} data-rule className={cn('border-t border-black/15 py-3', type.body)}>{row}</li>)}
            </ul>
            <div className="mt-auto">
              <p className={cn('m-0', type.label)}>Typical investment</p>
              <p className="mb-4 mt-2 font-serif text-[clamp(40px,3.6vw,56px)] leading-none tracking-[-0.03em]">{tier.price}</p>
              <ActionLink href={tier.href}>{tier.cta}</ActionLink>
            </div>
          </li>
        ))}
      </ul>
      <div data-rule className="mt-16 grid gap-6 border-t border-black/15 pt-8 md:grid-cols-[1fr_auto] md:items-end md:gap-16">
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
    </Section>
  )
}

export function ServicesHuman({ booking }: { booking: ReactNode }) {
  const low = useReducedMotion() ?? false
  return (
    <div className="bg-white text-black">
      <Opening low={low} />
      <Proof />
      <WhatWeDo low={low} />
      <Reasons />
      <Engagements />
      <Sectors low={low} />
      <Testimonial />
      <Talk booking={booking} />
    </div>
  )
}
