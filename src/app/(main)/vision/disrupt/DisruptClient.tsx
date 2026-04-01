'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Color pairs for each part's scroll-based background gradient.
 * Translated from the legacy disrupt.js `I` array.
 */
const COLOR_PAIRS = [
  { top: '#0282C1', bottom: '#E68B35' },  // Part 1
  { top: '#E68B35', bottom: '#DD2E64' },  // Part 2
  { top: '#DD2E64', bottom: '#82659B' },  // Part 3
  { top: '#82659B', bottom: '#0282C1' },  // Part 4
  { top: '#0282C1', bottom: '#0396AA' },  // Part 5
  { top: '#0396AA', bottom: '#82659B' },  // Part 6
]

/**
 * Section color themes (for headings and links within each section).
 */
export const SECTION_COLORS: Record<number, { heading: string; link: string }> = {
  1: { heading: '#0282c1', link: '#0282c1' },
  2: { heading: '#e68b35', link: '#e68b35' },
  3: { heading: '#82659b', link: '#dd2e64' },
  4: { heading: '#82659b', link: '#82659b' },
  5: { heading: '#0396aa', link: '#0282c1' },
  6: { heading: '#82659b', link: '#0396aa' },
}

/**
 * Interpolate between two hex colors.
 * Translated from the legacy jquery.colorscroll.min.js `h` function.
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

// ── ColorScroll: scroll-based background color transition ──────────────

interface ColorScrollProps {
  /** 0-based part index (0=Part 1, 5=Part 6) */
  partIndex: number
  children: React.ReactNode
}

/**
 * Wraps the page content and transitions the background color as the user scrolls.
 * Translated from the legacy colorScroll jQuery plugin.
 *
 * Legacy JS behavior:
 * - Top of page: solid top color
 * - As you scroll past the article content: transitions to white
 * - As you approach the bottom hero: transitions to bottom color
 */
export function ColorScrollWrapper({ partIndex, children }: ColorScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topHeroRef = useRef<HTMLDivElement>(null)
  const bottomHeroRef = useRef<HTMLDivElement>(null)
  const colors = COLOR_PAIRS[partIndex] || COLOR_PAIRS[0]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Start with the top color
    container.style.backgroundColor = colors.top

    function onScroll() {
      if (!container) return

      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      const topHero = topHeroRef.current
      const bottomHero = bottomHeroRef.current

      // Calculate color stops (matching legacy behavior)
      const topEnd = topHero ? topHero.offsetTop + topHero.offsetHeight : 400
      const bottomStart = bottomHero ? bottomHero.offsetTop - windowHeight : docHeight - windowHeight * 2

      if (window.innerWidth <= 800) {
        // Mobile: solid white background (legacy behavior)
        container.style.backgroundColor = 'white'
        return
      }

      if (scrollY <= 0) {
        container.style.backgroundColor = colors.top
      } else if (scrollY < topEnd) {
        // Transition from top color to white
        const t = scrollY / topEnd
        container.style.backgroundColor = interpolateColor(colors.top, '#ffffff', t)
      } else if (scrollY < bottomStart) {
        // White in the article area
        container.style.backgroundColor = '#ffffff'
      } else if (scrollY < docHeight - windowHeight) {
        // Transition from white to bottom color
        const t = (scrollY - bottomStart) / (docHeight - windowHeight - bottomStart)
        container.style.backgroundColor = interpolateColor('#ffffff', colors.bottom, Math.min(1, t))
      } else {
        container.style.backgroundColor = colors.bottom
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [colors])

  return (
    <div ref={containerRef} id="disrupt-legacy">
      <div ref={topHeroRef} data-role="top-hero" />
      {children}
      <div ref={bottomHeroRef} data-role="bottom-hero" />
    </div>
  )
}

// ── HeroSection: full-width video/image with parallax opacity ──────────

interface HeroSectionProps {
  partNumber: number
  position: 'top' | 'bottom'
  children?: React.ReactNode
}

/**
 * Full-width hero with video (desktop) or fallback image.
 * On scroll, the opacity fades based on distance from viewport.
 * Translated from the legacy disrupt.js scroll handler.
 */
export function HeroSection({ partNumber, position, children }: HeroSectionProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onScroll() {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const windowHeight = window.innerHeight

      if (position === 'top') {
        // Legacy: opacity = (heroBottom - scrollTop) / heroBottom
        const bottom = el.offsetTop + el.offsetHeight
        const ratio = Math.max(0, Math.min(1, (bottom - window.scrollY) / bottom))
        el.style.opacity = String(ratio)
      } else {
        // Legacy: opacity = (viewportBottom - heroTop) / (docHeight - heroTop)
        const viewportBottom = window.scrollY + windowHeight
        const docHeight = document.documentElement.scrollHeight
        const heroTop = el.offsetTop
        const ratio = Math.max(0, Math.min(1, (viewportBottom - heroTop) / (docHeight - heroTop) + 0.1))
        el.style.opacity = String(ratio)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => window.removeEventListener('scroll', onScroll)
  }, [position])

  const imageSrc = `https://www.goinvo.com/old/images/features/disrupt/video_fallbacks/section-${partNumber}-${position}.jpg`

  return (
    <div ref={ref} className="video-container" style={{ position: 'relative' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="placeholder"
        src={imageSrc}
        alt={`Section ${partNumber} ${position}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      {children}
    </div>
  )
}

// ── DisruptHeroVideo: video on desktop, image on mobile ─────────────────

interface DisruptHeroVideoProps {
  partNumber: number
  position: 'top' | 'bottom'
}

/**
 * Renders a <video> (autoplay, muted, loop) on desktop (>800px).
 * Falls back to the placeholder image on mobile.
 * Translated from the legacy disrupt.js video injection.
 */
export function DisruptHeroVideo({ partNumber, position }: DisruptHeroVideoProps) {
  const [isDesktop, setIsDesktop] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Check if video is supported (legacy: canPlayType mp4 or webm)
    const video = document.createElement('video')
    const canPlay = video.canPlayType('video/mp4') || video.canPlayType('video/webm')
    const wide = window.innerWidth > 800
    setIsDesktop(!!(canPlay && wide))

    const onResize = () => setIsDesktop(!!(canPlay && window.innerWidth > 800))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const videoBase = `https://www.goinvo.com/old/videos/disrupt/section-${partNumber}-${position}`
  const posterSrc = `https://www.goinvo.com/old/images/features/disrupt/video_posters/section-${partNumber}-${position}.jpg`
  const fallbackSrc = `https://www.goinvo.com/old/images/features/disrupt/video_fallbacks/section-${partNumber}-${position}.jpg`

  if (isDesktop) {
    return (
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      >
        <source src={`${videoBase}.mp4`} type="video/mp4" />
        <source src={`${videoBase}.webm`} type="video/webm" />
      </video>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="placeholder"
      src={fallbackSrc}
      alt={`Section ${partNumber} ${position}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    />
  )
}

// ── AnimatedTitle: letter-spacing animation on mount ────────────────────

export function AnimatedTitle() {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    // Legacy: delay 2s, then animate letter-spacing over 12s
    const timer = setTimeout(() => setAnimated(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="title-container">
      <h1
        style={{
          fontFamily: '"proxima-nova", sans-serif',
          fontSize: '8vw',
          color: 'white',
          letterSpacing: animated ? '0.7em' : '0.3em',
          opacity: animated ? 1 : 0,
          margin: 0,
          paddingLeft: '0.5em',
          textAlign: 'center',
          textTransform: 'uppercase',
          transition: 'letter-spacing 12s ease-out, opacity 12s ease-out',
        }}
      >
        Disrupt!
      </h1>
    </div>
  )
}

// ── DisruptNav: fixed teal navigation bar ──────────────────────────────

interface DisruptNavProps {
  currentPart: number
}

export function DisruptNavBar({ currentPart }: DisruptNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const parts = [
    { num: 1, label: '1. Emerging Technologies', href: '/vision/disrupt' },
    { num: 2, label: '2. From Horse to Horsepower', href: '/vision/disrupt/part-2' },
    { num: 3, label: '3. The Coming Disruption', href: '/vision/disrupt/part-3' },
    { num: 4, label: '4. Crowdsourcing Innovation', href: '/vision/disrupt/part-4' },
    { num: 5, label: '5. The Future of Design', href: '/vision/disrupt/part-5' },
    { num: 6, label: '6. Fukushima and Fragility', href: '/vision/disrupt/part-6' },
  ]

  return (
    <div id="article-nav">
      <div className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>
        <div className="title">Disrupt!</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`toggle-arrow ${mobileOpen ? 'open' : ''}`}
          src="https://www.goinvo.com/old/images/features/disrupt/mobilenavutil.png"
          alt="Toggle navigation"
        />
      </div>
      <ol className={mobileOpen ? 'open' : ''}>
        {parts.map((p) => (
          <li key={p.num}>
            <a
              href={p.href}
              style={p.num === currentPart ? { color: 'white', fontWeight: 600 } : undefined}
            >
              {p.label}
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── BottomNav: "next part" link at bottom of page ──────────────────────

interface BottomNavProps {
  nextHref: string
  nextTitle: string
  color: string
}

export function BottomNav({ nextHref, nextTitle, color }: BottomNavProps) {
  return (
    <div id="bottom-nav">
      <a href={nextHref}>
        <span className="link-fill">
          <div className="text-container">
            <div className="next-part">next part</div>
            <div className="title" style={{ color }}>{nextTitle}</div>
          </div>
        </span>
      </a>
    </div>
  )
}
