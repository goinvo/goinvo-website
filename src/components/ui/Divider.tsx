import { cn } from '@/lib/utils'

interface DividerProps {
  variant?: 'default' | 'thick'
  className?: string
}

export function Divider({ variant = 'default', className }: DividerProps) {
  return (
    <hr
      className={cn(
        'border-0 my-8',
        variant === 'default' ? 'border-t border-gray-medium' : 'border-t-2 border-primary',
        className
      )}
    />
  )
}
