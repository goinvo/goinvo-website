import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const sizes = {
  /** 14px, 15px from 864px up: the site's usual label. */
  responsive: 'text-sm lg:text-[15px]',
  fixed: 'text-[15px]',
  small: 'text-sm',
} as const

/**
 * A small section label ("Up next", "The business problem"). Classic: uppercase,
 * spaced, grey. Under the human design mode (design-human.css, via data-ds-label)
 * it becomes a sentence-case label in ink. One component, so every label changes
 * together.
 */
export function Label({ as: Tag = 'h3', size = 'responsive', className, children }: { as?: 'h2' | 'h3' | 'h4' | 'p' | 'span'; size?: keyof typeof sizes; className?: string; children: ReactNode }) {
  return <Tag data-ds-label className={cn('font-sans font-semibold uppercase tracking-[2px]', sizes[size], className)}>{children}</Tag>
}
