import Image from 'next/image'
import { cn } from '@/lib/utils'

interface GradientImageColumnsProps {
  image: string
  imageAlt?: string
  reverse?: boolean
  gradient?: boolean
  backgroundColor?: string
  className?: string
  children: React.ReactNode
}

export function GradientImageColumns({
  image,
  imageAlt = '',
  reverse = false,
  gradient = false,
  backgroundColor,
  className,
  children,
}: GradientImageColumnsProps) {
  return (
    <div
      className={cn(
        'py-12 md:py-16',
        backgroundColor && `bg-${backgroundColor}`,
        className
      )}
    >
      <div className="max-width content-padding">
        <div
          className={cn(
            'grid grid-cols-1 lg:grid-cols-2 gap-8 items-center',
            reverse && 'direction-rtl'
          )}
          style={reverse ? { direction: 'rtl' } : undefined}
        >
          <div className="relative overflow-hidden" style={{ direction: 'ltr' }}>
            <Image
              src={image}
              alt={imageAlt}
              width={800}
              height={600}
              className="w-full h-full object-cover"
            />
            {gradient && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to top, #F3F1F0 0%, rgba(237,233,230,0.99) 20%, rgba(234,228,225,0.99) 25%, rgba(234,228,225,0.90) 40%, rgba(234,228,225,0.82) 55%, rgba(234,228,225,0.54) 70%, rgba(234,228,225,0) 100%)',
                }}
              />
            )}
          </div>
          <div style={{ direction: 'ltr' }}>{children}</div>
        </div>
      </div>
    </div>
  )
}
