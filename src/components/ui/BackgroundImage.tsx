import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BackgroundImageProps {
  src: string
  alt?: string
  overlay?: boolean
  overlayColor?: string
  className?: string
  children: React.ReactNode
}

export function BackgroundImage({
  src,
  alt = '',
  overlay = true,
  overlayColor = 'bg-black/40',
  className,
  children,
}: BackgroundImageProps) {
  return (
    <section className={cn('relative overflow-hidden', className)}>
      <Image src={src} alt={alt} fill className="object-cover" />
      {overlay && <div className={cn('absolute inset-0', overlayColor)} />}
      <div className="relative z-10">{children}</div>
    </section>
  )
}
