'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { trackExperimentConversion } from '@/lib/analytics'

/**
 * The section's call-to-action. On click it records a per-variant conversion for
 * the `home-shop-section` experiment — the "did it guide people to the
 * collection" signal. When no experiment is active (no context set),
 * trackExperimentConversion is a no-op, so the link behaves as an ordinary link.
 */
export function HomeGoinvoAtHomeCta({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        try {
          trackExperimentConversion({ conversion_type: 'goinvo_home_section' })
        } catch {
          // Tracking must never block the navigation.
        }
      }}
    >
      {children}
    </Link>
  )
}
