'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface BackgroundVideoProps {
  mp4Src: string
  webmSrc?: string
  posterSrc: string
  className?: string
}

export function BackgroundVideo({
  mp4Src,
  webmSrc,
  posterSrc,
  className = '',
}: BackgroundVideoProps) {
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const check = () => setShowVideo(window.innerWidth > 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!showVideo) {
    return (
      <Image
        src={posterSrc}
        alt=""
        fill
        className={`object-cover ${className}`}
        unoptimized
        priority
      />
    )
  }

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      className={className}
      poster={posterSrc}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
      }}
    >
      {webmSrc && <source src={webmSrc} type="video/webm" />}
      <source src={mp4Src} type="video/mp4" />
    </video>
  )
}
