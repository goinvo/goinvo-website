'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const NAV_ITEMS = [
  { id: 'what-is-zika', label: 'Overview' },
  { id: 'where-is-zika', label: 'Infected Areas' },
  { id: 'transmission', label: 'Transmission' },
  { id: 'prevention', label: 'Prevention' },
  { id: 'zika-symptoms', label: 'Symptoms' },
  { id: 'guillain-barre-syndrome', label: 'Guillain Barr\u00e9 Syndrome' },
  { id: 'treatments', label: 'Treatment' },
  { id: 'action-plan', label: 'Action Plan' },
]

export function ZikaNav() {
  const [scrolled, setScrolled] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement | null>(null)

  // Detect when user scrolls past the header to show the nav
  useEffect(() => {
    const header = document.querySelector('#feature-article .header') as HTMLDivElement | null
    headerRef.current = header

    const handleScroll = () => {
      if (!header) return
      const headerBottom = header.getBoundingClientRect().bottom
      // Show nav when header scrolls out of view (past the site header at ~50px)
      setScrolled(headerBottom <= 50)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll-spy: track which section is currently in view
  useEffect(() => {
    const sectionEls = NAV_ITEMS.map(item => document.getElementById(item.id)).filter(
      Boolean
    ) as HTMLElement[]

    if (sectionEls.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        // Find the topmost visible section
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        // Offset for the site header (50px) + nav bar (~40px)
        rootMargin: '-90px 0px -60% 0px',
        threshold: 0,
      }
    )

    sectionEls.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault()
      const el = document.getElementById(id)
      if (!el) return
      // Offset for site header + nav bar
      const offset = 90
      const y = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: y, behavior: 'smooth' })
      setActiveId(id)
      setMenuOpen(false)
    },
    []
  )

  return (
    <nav
      ref={navRef}
      className={`inner${scrolled ? ' scrolled' : ''}`}
    >
      <div className="menu">
        <ul className={menuOpen ? 'opened' : ''}>
          <li
            id="expand"
            onClick={() => setMenuOpen(prev => !prev)}
          >
            &#8801;
          </li>
          <li id="page-title">ZIKA</li>
          {NAV_ITEMS.map(item => (
            <li
              key={item.id}
              className={activeId === item.id ? 'active' : ''}
            >
              <a
                href={`#${item.id}`}
                onClick={e => handleClick(e, item.id)}
              >
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://www.goinvo.com/old/images/features/zika/understanding_zika.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </li>
          <li>
            <a href="mailto:zika@goinvo.com?subject=Feedback for Understanding Zika">
              Feedback
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}
