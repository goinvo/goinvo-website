import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface HeroProps {
  title: string
  subtitle?: string
  backgroundImage?: string
  backgroundVideo?: string
  ctaText?: string
  ctaHref?: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  overlay?: boolean
  fullHeight?: boolean
  className?: string
  children?: React.ReactNode
}

export function Hero({
  title,
  subtitle,
  backgroundImage,
  backgroundVideo,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  overlay = true,
  fullHeight = false,
  className,
  children,
}: HeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        fullHeight ? 'min-h-screen' : 'min-h-[60vh]',
        className
      )}
    >
      {/* Background Image */}
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt=""
          fill
          className="object-cover"
          priority
        />
      )}

      {/* Background Video */}
      {backgroundVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
      )}

      {/* Content - bottom-left positioned overlay */}
      <div className="absolute inset-0 flex items-end">
        <div className="max-width content-padding pb-12 md:pb-16 w-full">
          <div
            className={cn(
              'p-6 md:p-8',
              backgroundImage || backgroundVideo
                ? 'bg-white/80 w-full md:w-[385px]'
                : ''
            )}
          >
            <h1 className="font-serif text-2xl md:text-3xl mb-2 text-black">
              {title}
            </h1>

            {subtitle && (
              <p className="text-gray text-md mb-4">
                {subtitle}
              </p>
            )}

            {(ctaText || secondaryCtaText) && (
              <div className="flex flex-col sm:flex-row gap-3">
                {ctaText && ctaHref && (
                  <Button href={ctaHref} variant="primary" size="md">
                    {ctaText}
                  </Button>
                )}
                {secondaryCtaText && secondaryCtaHref && (
                  <Button href={secondaryCtaHref} variant="outline" size="md">
                    {secondaryCtaText}
                  </Button>
                )}
              </div>
            )}

            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
