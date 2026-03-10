'use client'

import { cn } from '@/lib/utils'

interface VideoSource {
  src: string
  format: string
}

interface VideoProps {
  sources: VideoSource[]
  poster?: string
  loop?: boolean
  autoPlay?: boolean
  muted?: boolean
  controls?: boolean
  className?: string
  style?: React.CSSProperties
}

export function Video({
  sources,
  poster,
  loop = false,
  autoPlay = true,
  muted = true,
  controls = false,
  className,
  style,
}: VideoProps) {
  return (
    <video
      className={cn('w-full', className)}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
      loop={loop}
      controls={controls}
      style={style}
    >
      {sources.map((src) => (
        <source key={src.format} src={src.src} type={`video/${src.format}`} />
      ))}
    </video>
  )
}
