import { cn } from '@/lib/utils'

interface AboutGoInvoProps {
  className?: string
  variant?: 'default' | 'practice'
}

export function AboutGoInvo({ className, variant = 'default' }: AboutGoInvoProps) {
  return (
    <div className={cn(className)}>
      <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mt-8 mb-2">
        About GoInvo
      </h4>
      <p className="text-gray mt-4 mb-4">
        {variant === 'practice'
          ? (
              <>
                GoInvo&apos;s human centered design practice is dedicated to
                innovation in healthcare - to improve people&apos;s lives and enable
                us all to live a healthier future. Over the past 15 years,
                GoInvo has created digital health products and services for
                patients, clinicians, researchers, and administrators - working
                with organizations as far-reaching as AstraZeneca, Johnson and
                Johnson, 3M, and the U.S. Department of Health and Human
                Services.
              </>
            )
          : (
              <>
                GoInvo is a healthcare design company that crafts innovative
                digital and physical solutions. Our deep expertise in Health IT,
                Genomics, and Open Source health has delivered results for the
                National Institutes of Health, Walgreens, Mount Sinai, and
                Partners Healthcare.
              </>
            )}
      </p>
    </div>
  )
}
