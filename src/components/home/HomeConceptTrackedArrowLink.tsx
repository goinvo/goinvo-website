'use client'

import Link from 'next/link'
import { ConceptReferenceArrow } from '@/components/home/ConceptReferenceArrow'
import { trackEvent } from '@/lib/analytics'

interface HomeConceptTrackedArrowLinkProps {
  href: string
  label: string
  location: string
  className?: string
  children: React.ReactNode
}

export function HomeConceptTrackedArrowLink({
  href,
  label,
  location,
  className = '',
  children,
}: HomeConceptTrackedArrowLinkProps) {
  return (
    <Link
      href={href}
      className={`home-concept-link-text group/arrowlink relative inline-flex items-center gap-2 pb-[3px] font-semibold leading-[18px] no-underline transition-opacity after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-current ${className}`}
      style={{ color: 'inherit' }}
      onClick={() => trackEvent('view_work_click', { link_text: label, click_location: location, destination: href })}
    >
      {children}
      <ConceptReferenceArrow className="shrink-0 group-hover/arrowlink:translate-x-[5px]" />
    </Link>
  )
}
