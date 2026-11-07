import { cn } from '@/lib/utils'

/** The site's arrow: a thin line arrow that inherits the text colour. The second
 * path is the same arrow drawn by hand, shown only in the hand-drawn review option. */
export function Arrow({ direction = 'right', className }: { direction?: 'right' | 'down'; className?: string }) {
  return (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" className={cn('shrink-0', direction === 'down' && 'rotate-90', className)}>
      <path data-hand-hide d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" />
      <path data-hand-only d="M3.6 12.7c4.2-.6 9.3-.9 15.4-.5M13.2 6.6c2 1.9 3.9 3.5 6 5.4-2.2 1.7-4.1 3.5-5.7 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
