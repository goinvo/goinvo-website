import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BackgroundImageProps {
  src: string
  alt?: string
  position?: string
  overlay?: boolean
  overlayColor?: string
  gradient?: boolean
  priority?: boolean
  className?: string
  children: React.ReactNode
}

export function BackgroundImage({
  src,
  alt = '',
  position = 'center',
  overlay = false,
  overlayColor = 'bg-black/40',
  gradient = false,
  priority = false,
  className,
  children,
}: BackgroundImageProps) {
  return (
    <section className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        style={{ objectPosition: position }}
        priority={priority}
      />
      {overlay && <div className={cn('absolute inset-0', overlayColor)} />}
      {gradient && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, #F3F1F0 0%, rgba(237,233,230,0.99) 20%, rgba(234,228,225,0.99) 25%, rgba(234,228,225,0.90) 40%, rgba(234,228,225,0.82) 55%, rgba(234,228,225,0.54) 70%, rgba(234,228,225,0) 100%)',
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </section>
  )
}
