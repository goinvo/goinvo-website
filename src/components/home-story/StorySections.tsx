'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { CountOnView, EASE, ReadAlong, Reveal } from './storyMotion'
import { chapters, clients, openSource, services, stats, studio, testimonial } from './storyContent'

const delay = (ms: number) => ({ '--d': ms }) as CSSProperties

function Arrow() {
  return (
    <svg className="hs-arrow" width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <path d="M1 6h13M9.5 1.5 14 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * What we do, as FELINES' "what if" lines: three short sentences you can read in
 * one glance, each opening to its detail on demand. Only one is open at a time.
 */
export function StoryServices() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="services" data-story-chapter="services" className="bg-[var(--hs-paper)] py-24 lg:py-36">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-14">
        <div>
          <p className="hs-eyebrow text-[var(--hs-accent)]">{services.eyebrow}</p>
          <Reveal as="h2" className="hs-serif hs-wipe mt-5 text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.04] tracking-[-0.02em]">
            {services.heading}
          </Reveal>
        </div>
        <div>
          <p className="hs-serif text-[clamp(1.6rem,2.6vw,2.2rem)] italic text-[var(--hs-muted)]">{services.leadIn}</p>
          <ul className="mt-2">
            {services.lines.map((item, i) => {
              const isOpen = open === i
              const panelId = `hs-service-${i}`
              return (
                <Reveal as="li" key={item.line}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="hs-line-button hs-draw"
                    style={{ ...delay(i * 160), '--hs-from': i % 2 ? 'right' : 'left' } as CSSProperties}
                  >
                    <span className="hs-line-text hs-serif text-[clamp(1.8rem,3.2vw,2.8rem)] leading-[1.1] tracking-[-0.015em] transition-colors">
                      {item.line}
                    </span>
                    <svg className="hs-plus shrink-0" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                      <path d="M9 2v14M2 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="max-w-[52ch] pb-8 pt-5">
                          <p className="text-[18px] leading-[1.6] text-[var(--hs-ink-2)]">{item.description}</p>
                          <Link href={item.href} className="hs-link mt-4">
                            {item.link} <Arrow />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Reveal>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}

function MarqueeRow({ names, reverse }: { names: string[]; reverse?: boolean }) {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {names.map((name) => (
        <span key={name} className="hs-serif flex items-center whitespace-nowrap px-7 text-[clamp(1.6rem,2.6vw,2.4rem)] text-[var(--hs-ink)]">
          {name}
          <span className="ml-14 inline-block h-1.5 w-1.5 rounded-full bg-[var(--hs-accent-fill)]" aria-hidden="true" />
        </span>
      ))}
    </div>
  )
  return (
    <div className="hs-marquee overflow-hidden py-3">
      <div className="hs-marquee-track" data-reverse={reverse ? '' : undefined}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}

/** Who we do it for: counted facts, then the client names drifting past. */
export function StoryProof() {
  const half = Math.ceil(clients.length / 2)
  return (
    <section id="proof" data-story-chapter="proof" className="border-t border-[var(--hs-rule)] bg-[var(--hs-paper)] py-24 lg:py-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-14">
        <dl className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} className="hs-rise border-t border-[var(--hs-ink)] pt-6" style={delay(i * 120)}>
              <dt className="hs-serif text-[clamp(3.4rem,5vw,4.6rem)] leading-none tracking-[-0.03em]">
                <CountOnView to={stat.value} />
                <span className="text-[0.5em] text-[var(--hs-accent)]">{stat.suffix}</span>
              </dt>
              <dd className="m-0">
                <p className="mt-4 text-[15px] leading-[1.6] text-[var(--hs-ink-2)]">{stat.description}</p>
                <p className="hs-eyebrow mt-4 !text-[11px] text-[var(--hs-muted)]">{stat.label}</p>
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>

      <div className="mt-24">
        <p className="hs-eyebrow mb-6 text-center text-[var(--hs-muted)]">Trusted by teams at</p>
        <MarqueeRow names={clients.slice(0, half)} />
        <MarqueeRow names={clients.slice(half)} reverse />
      </div>
    </section>
  )
}

/** Open source, on night: one sentence read word by word, then the evidence. */
export function StoryOpenSource() {
  return (
    <section id="open" data-story-chapter="open" className="bg-[var(--hs-night)] py-24 text-white lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-14">
        <p className="hs-eyebrow text-[var(--hs-accent-night)]">{openSource.eyebrow}</p>
        <ReadAlong
          text={openSource.statement}
          className="hs-serif mt-6 max-w-[26ch] text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.1] tracking-[-0.02em]"
        />
        <div className="mt-20 grid gap-12 md:grid-cols-3">
          {openSource.items.map((item, i) => (
            <Reveal key={item.href} className="hs-rise" style={delay(i * 140)}>
              <Link href={item.href} className="hs-zoom group block text-white no-underline">
                <div className="relative aspect-[4/3] overflow-hidden bg-white/5">
                  <Image src={item.image} alt={item.alt} fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover" />
                </div>
                <p className="hs-eyebrow mt-6 !text-[11px] text-white/60">{item.eyebrow}</p>
                <h3 className="hs-serif mt-2 text-[1.75rem] leading-tight group-hover:text-[var(--hs-accent-night)]">{item.title}</h3>
                <p className="mt-2 text-[15px] text-white/75">{item.cite}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function StoryTestimonial() {
  return (
    <section className="bg-[var(--hs-cream)] py-24 lg:py-36">
      <figure className="mx-auto max-w-[1000px] px-5 text-center sm:px-8">
        <ReadAlong
          as="blockquote"
          text={`“${testimonial.quote}”`}
          className="hs-serif m-0 text-[clamp(2rem,4.4vw,3.8rem)] leading-[1.12] tracking-[-0.02em]"
        />
        <figcaption className="mt-10 flex items-center justify-center gap-4">
          <Image src={testimonial.image} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
          <span className="text-left text-sm text-[var(--hs-muted)]">
            <span className="block font-bold text-[var(--hs-ink)]">{testimonial.name}</span>
            {testimonial.role}
          </span>
        </figcaption>
      </figure>
    </section>
  )
}

/** The studio: the line, then the faces, arriving one after another. */
export function StoryStudio({ members }: { members: { name: string; image: string }[] }) {
  return (
    <section id="studio" data-story-chapter="studio" className="bg-[var(--hs-paper)] py-24 lg:py-36">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-14">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="hs-eyebrow text-[var(--hs-accent)]">{studio.eyebrow}</p>
            <h2 className="hs-serif mt-5 text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.02] tracking-[-0.025em]">
              {studio.heading.map((line, i) => (
                <Reveal as="span" key={line} className={`hs-wipe block ${i ? 'italic text-[var(--hs-accent)]' : ''}`} style={delay(i * 300)}>
                  {line}
                </Reveal>
              ))}
            </h2>
          </div>
          <div className="max-w-[420px]">
            <p className="text-[18px] leading-[1.6] text-[var(--hs-ink-2)]">{studio.body}</p>
            <Link href="/about" className="hs-link mt-5">
              Meet the team <Arrow />
            </Link>
          </div>
        </div>
        {members.length > 0 && (
          <ul className="mt-16 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {members.slice(0, 12).map((member, i) => (
              <Reveal as="li" key={member.name} className="hs-rise hs-zoom relative aspect-square overflow-hidden bg-[#ece7dc]" style={delay((i % 6) * 70)}>
                <Image src={member.image} alt={member.name} fill sizes="(min-width: 1024px) 15vw, 33vw" className="object-cover grayscale-[35%] transition-[filter] duration-500 hover:grayscale-0" />
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/**
 * Where am I: a hairline of reading progress under the header and, on wide
 * screens, a chapter rail on the right (FELINES' section indicator).
 */
export function StoryRail() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, mass: 0.4 })
  const [active, setActive] = useState(chapters[0].id)
  const [tone, setTone] = useState<'night' | 'day'>('night')

  useEffect(() => {
    const els = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setActive(entry.target.id)
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // The rail sits over whatever is behind it; read the ground at its height.
  useEffect(() => {
    const read = () => {
      const NIGHT = 'rgb(20, 18, 17)' // --hs-night
      const probe = document.elementsFromPoint(window.innerWidth - 30, window.innerHeight / 2)
      const ground = probe.find((el) => {
        const bg = getComputedStyle(el).backgroundColor
        return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !el.closest('.hs-rail')
      })
      setTone(ground && getComputedStyle(ground).backgroundColor === NIGHT ? 'night' : 'day')
    }
    read()
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [])

  return (
    <>
      <motion.div aria-hidden="true" className="hs-progress" style={{ scaleX }} />
      <nav aria-label="Page chapters" className={`hs-rail ${tone === 'night' ? 'text-white' : 'text-[var(--hs-ink)]'}`}>
        <ul>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <a href={`#${chapter.id}`} className="hs-rail-dot no-underline" aria-current={active === chapter.id ? 'true' : undefined} style={{ color: 'inherit' }}>
                <span className="hs-rail-label">{chapter.label}</span>
                <span className="hs-rail-mark" />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
