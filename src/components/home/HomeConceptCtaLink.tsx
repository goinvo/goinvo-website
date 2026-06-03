'use client'

import { Button } from '@/components/ui/Button'
import { trackCtaClick, trackQualifiedDiscoveryCallClick } from '@/lib/analytics'

interface HomeConceptCtaLinkProps {
  href: string
  label: string
  location: string
  variant?: 'primary' | 'secondary' | 'outline' | 'tertiary' | 'transparent'
  className?: string
  // When true, also emit the specific qualified_discovery_call_click event used
  // as the homepage test's primary metric. Defaults to the generic cta_click.
  qualifiedDiscoveryCall?: boolean
  children: React.ReactNode
}

export function HomeConceptCtaLink({
  href,
  label,
  location,
  variant = 'primary',
  className,
  qualifiedDiscoveryCall = false,
  children,
}: HomeConceptCtaLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    const params = { cta_text: label, cta_location: location, cta_url: href }
    if (qualifiedDiscoveryCall) {
      trackQualifiedDiscoveryCallClick(params)
    } else {
      trackCtaClick(params)
    }

    // Smoothly slide to the in-page target (e.g. the #book scheduler) instead of
    // the browser's instant hash jump. Next's Link bails on navigation once the
    // click's default is prevented, so we own the scroll here.
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1))
      if (target) {
        event.preventDefault()
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
        window.history.replaceState(null, '', href)
      }
    }
  }

  return (
    <Button
      href={href}
      variant={variant}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Button>
  )
}
