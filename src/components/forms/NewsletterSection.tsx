import { getSectionBandClassName, type SectionBackground } from '@/lib/sectionBackgrounds'
import { cn } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'

interface NewsletterSectionProps {
  background?: SectionBackground
  cardWidth?: 'standard' | 'narrow'
  forceBand?: boolean
  sectionClassName?: string
  shadowClassName?: string
}

export function NewsletterSection({
  background = 'white',
  cardWidth = 'standard',
  forceBand = false,
  sectionClassName,
  shadowClassName = 'shadow-card',
}: NewsletterSectionProps) {
  const bandClassName = background === 'white'
    ? (forceBand ? 'bg-white' : '')
    : getSectionBandClassName(background)
  const containerClassName = cardWidth === 'narrow'
    ? 'max-w-[711px] px-8 mx-auto'
    : 'max-w-[775px] px-8 mx-auto'

  return (
    <section className={cn('py-8', bandClassName, sectionClassName)}>
      <div className={containerClassName}>
        <div className={cn('bg-white py-6 px-4 md:px-8', shadowClassName)}>
          <NewsletterForm />
        </div>
      </div>
    </section>
  )
}
