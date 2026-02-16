import { cn } from '@/lib/utils'

interface StickyProps {
  className?: string
  top?: string
  children: React.ReactNode
}

export function Sticky({ className, top = '60px', children }: StickyProps) {
  return (
    <div className={cn('sticky', className)} style={{ top }}>
      {children}
    </div>
  )
}
