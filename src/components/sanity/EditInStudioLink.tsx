'use client'

import { createDataAttribute } from 'next-sanity'
import type { CSSProperties, ReactNode } from 'react'
import { dataset, projectId, studioUrl } from '@/sanity/env'

interface Props {
  documentType: 'caseStudy' | 'feature'
  documentId: string
  /**
   * Dot-path of the field to focus when Presentation opens, e.g.
   * "image" or "content". Used by Sanity's Visual Editing overlay
   * to focus the field in the Studio's right-hand panel.
   */
  fieldPath: string
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  children: ReactNode
}

/**
 * Draft-mode-only wrapper that tags its child element with the Sanity
 * Visual Editing data attribute. When the preview is embedded in the
 * Presentation tool (which mounts <VisualEditing />, see
 * SafeVisualEditing), hovering shows an edit affordance and clicking
 * focuses the field in the right-hand Studio panel — no full reload.
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
  // `createDataAttribute` generates the data-sanity string that
  // @sanity/visual-editing recognises to wire up click-to-edit via
  // postMessage to the parent Studio.
  const attr = createDataAttribute({
    baseUrl: studioUrl,
    projectId,
    dataset,
    id: documentId,
    type: documentType,
    path: fieldPath,
  }).toString()

  return (
    <div
      data-sanity={attr}
      role="button"
      aria-label={ariaLabel}
      tabIndex={0}
      className={className}
      style={{ cursor: 'pointer', ...style }}
    >
      {children}
    </div>
  )
}
