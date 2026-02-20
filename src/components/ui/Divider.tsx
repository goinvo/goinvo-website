import { cn } from '@/lib/utils'

interface DividerProps {
  variant?: 'default' | 'thick'
  className?: string
}

export function Divider({ variant = 'default', className }: DividerProps) {
  if (variant === 'thick') {
    return (
      <hr className={cn('border-0 border-t-2 border-primary my-4', className)} />
    )
  }

  return (
    <div className={cn('my-4', className)}>
      <svg
        viewBox="0 0 2040 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full h-[30px]"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path
          vectorEffect="non-scaling-stroke"
          d="M2 30L992.356 30.6667L996.28 25.4815L1000.2 30.6667H1003.15L1006.09 34.3704L1016.88 4L1029.62 44L1033.54 30.6667L2039 30"
          stroke="#d0cfce"
          strokeLinecap="square"
        />
      </svg>
    </div>
  )
}
