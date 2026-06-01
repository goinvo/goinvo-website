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
  const handleClick = () => {
    const params = { cta_text: label, cta_location: location, cta_url: href }
    if (qualifiedDiscoveryCall) {
      trackQualifiedDiscoveryCallClick(params)
    } else {
      trackCtaClick(params)
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
