'use client'

import type { CSSProperties, ReactNode } from 'react'

interface Props {
  documentType: 'caseStudy' | 'feature'
  documentId: string
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  children: ReactNode
}

/**
 * Wrapper that navigates the Presentation preview's top window to the
 * Studio Structure editor for the referenced document. Used for
 * "click to edit" affordances inside the preview iframe (empty-content
 * placeholder, missing-image placeholder, etc).
 *
 * The parent decides whether to render this at all — it should only
 * appear when draftMode is enabled, to avoid shipping Studio links to
 * public visitors.
 */
export function EditInStudioLink({
  documentType,
  documentId,
  className,
  style,
  ariaLabel,
  children,
}: Props) {
  const handleClick = () => {
    const target = typeof window !== 'undefined' ? window.top || window : null
    if (!target) return
    target.location.href = `/studio/structure/${documentType};${documentId}`
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={className}
      style={{
        display: 'block',
        width: '100%',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'inherit',
        color: 'inherit',
        font: 'inherit',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
