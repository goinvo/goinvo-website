import { cn } from '@/lib/utils'

interface ColumnsProps {
  layout?: '2' | '3' | '4'
  className?: string
  children: React.ReactNode
}

export function Columns({ layout = '2', className, children }: ColumnsProps) {
  const gridClasses = {
    '2': 'grid-cols-1 md:grid-cols-2',
    '3': 'grid-cols-1 md:grid-cols-3',
    '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-8 my-8', gridClasses[layout], className)}>
      {children}
    </div>
  )
}
