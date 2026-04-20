'use client'

import type { CSSProperties, ReactNode } from 'react'

interface Props {
  documentType: 'caseStudy' | 'feature'
  documentId: string
  /**
   * Dot-path of the field to focus when the Presentation tool opens,
   * e.g. "image" or "content". Navigates to
   * `/studio/presentation/<type>/<id>/<fieldPath>` so the right field
   * lights up in the edit panel.
   */
  fieldPath: string
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  children: ReactNode
}

/**
 * Wrapper button that navigates the Presentation preview's top window
 * to the Sanity Presentation tool focused on a specific field of the
 * current document. Preserves the current preview URL as the
 * `?preview=` parameter so the iframe keeps rendering the same page
 * the editor was looking at.
 *
 * The parent decides whether to render this at all — it should only
 * appear when draftMode is enabled, so Studio affordances never ship
 * to public visitors.
 */
export function EditInStudioLink({
  documentType,
  documentId,
  fieldPath,
  className,
  style,
  ariaLabel,
  children,
}: Props) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (typeof window === 'undefined') return
    const target = window.top || window
    const currentUrl = window.location.href
    const studioUrl = `/studio/presentation/${documentType}/${documentId}/${fieldPath}?preview=${encodeURIComponent(
      currentUrl,
    )}`
    target.location.href = studioUrl
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
