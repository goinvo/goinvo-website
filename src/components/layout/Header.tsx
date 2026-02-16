'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { navItems } from '@/lib/config'
import { cn } from '@/lib/utils'

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileNavOpen])

  const toggleMobileNav = () => setMobileNavOpen((prev) => !prev)
  const closeMobileNav = () => setMobileNavOpen(false)

  const isHomepage = pathname === '/'

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[var(--z-header)] flex items-center justify-between px-4 md:px-8 transition-all duration-[var(--transition-nav)]',
        'h-[var(--spacing-header-height)]',
        scrolled || !isHomepage
          ? 'bg-white shadow-sm'
          : 'bg-transparent'
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center" aria-label="GoInvo Home">
        <GoInvoLogo />
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden lg:flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-sm font-semibold uppercase tracking-wider transition-colors duration-[var(--transition-button)]',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'text-primary'
                : 'text-black hover:text-primary'
            )}
          >
            {item.title}
          </Link>
        ))}
        <Link
          href="/contact"
          className="bg-primary text-white text-sm font-semibold uppercase tracking-wider px-5 py-2 hover:bg-primary-dark transition-colors duration-[var(--transition-button)]"
        >
          Contact
        </Link>
      </nav>

      {/* Mobile Hamburger */}
      <button
        className="lg:hidden p-2 text-black"
        onClick={toggleMobileNav}
        aria-label="Open navigation menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-[var(--z-overlay)] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileNav}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-72 bg-white z-[var(--z-mobile-nav)] shadow-xl lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex justify-end p-4">
                <button
                  onClick={closeMobileNav}
                  aria-label="Close navigation menu"
                  className="p-2 text-black"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col px-6">
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/"
                      className={cn(
                        'block py-3 text-lg font-serif',
                        pathname === '/' ? 'text-primary' : 'text-black'
                      )}
                      onClick={closeMobileNav}
                    >
                      Home
                    </Link>
                  </li>
                  {navItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'block py-3 text-lg font-serif',
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'text-primary'
                            : 'text-black'
                        )}
                        onClick={closeMobileNav}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/contact"
                      className={cn(
                        'block py-3 text-lg font-serif',
                        pathname === '/contact' ? 'text-primary' : 'text-black'
                      )}
                      onClick={closeMobileNav}
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
                <div className="border-t border-gray-medium my-4" />
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/about/careers"
                      className="block py-2 text-md text-gray"
                      onClick={closeMobileNav}
                    >
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/about/open-office-hours"
                      className="block py-2 text-md text-gray"
                      onClick={closeMobileNav}
                    >
                      Open Office Hours
                    </Link>
                  </li>
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}

function GoInvoLogo() {
  return (
    <svg
      width="100"
      height="24"
      viewBox="0 0 100 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="GoInvo"
    >
      <text
        x="0"
        y="18"
        fontFamily="adobe-jenson-pro, Georgia, serif"
        fontSize="20"
        fontWeight="400"
        letterSpacing="1"
      >
        GoInvo
      </text>
    </svg>
  )
}
