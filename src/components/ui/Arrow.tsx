import { cn } from '@/lib/utils'

/** The site's arrow: a thin line arrow that inherits the text colour. */
export function Arrow({ direction = 'right', className }: { direction?: 'right' | 'down'; className?: string }) {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" className={cn('shrink-0', direction === 'down' && 'rotate-90', className)}>
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
