import { cn } from '@/lib/utils'

interface AboutGoInvoProps {
  className?: string
}

export function AboutGoInvo({ className }: AboutGoInvoProps) {
  return (
    <div className={cn('mt-8 mb-4', className)}>
      <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mb-2">
        About GoInvo
      </h4>
      <p className="text-gray">
        GoInvo is a healthcare design company that crafts innovative digital and
        physical solutions. Our deep expertise in Health IT, Genomics, and Open
        Source health has delivered results for the National Institutes of Health,
        Walgreens, Mount Sinai, and Partners Healthcare.
      </p>
    </div>
  )
}
