'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn, cloudfrontImage } from '@/lib/utils'

/**
 * Each prototype frame defines:
 * - id: frame number (1-28)
 * - image: which room image to show (maps to a .jpg file)
 * - transform: CSS transform for zooming/panning the room image
 * - backgroundPosition: CSS background-position override
 * - overlay: 'enter' | 'exit' | 'default' | undefined — controls overlay transition timing
 */
interface PrototypeFrame {
  id: number
  image: string
  transform?: string
  backgroundPosition?: string
  overlay?: 'enter' | 'exit' | 'default'
}

const prototypeFrames: PrototypeFrame[] = [
  { id: 1, image: 'entry', transform: 'scale(1)' },
  { id: 2, image: 'entry', transform: 'scale(2.5) translate(0px, -8%)', overlay: 'enter' },
  { id: 3, image: 'entry', transform: 'scale(2.5) translate(0px, -8%)', overlay: 'default' },
  { id: 4, image: 'entry', transform: 'scale(2.5) translate(0px, -8%)', overlay: 'exit' },
  { id: 5, image: 'entry', transform: 'scale(1) translate(0px, 0px)' },
  { id: 6, image: 'entry-open-door' },
  { id: 7, image: 'entry-lidar' },
  { id: 8, image: 'body-scan', overlay: 'default' },
  { id: 9, image: 'body-scan-active' },
  { id: 10, image: 'body-scan', overlay: 'default' },
  { id: 11, image: 'body-scan-open-door' },
  { id: 12, image: 'toilet', backgroundPosition: 'right 10% bottom 0vw', transform: 'scale(1)' },
  { id: 13, image: 'toilet', backgroundPosition: 'right 40% bottom 2vw', transform: 'scale(1.5)' },
  { id: 14, image: 'using-toilet' },
  { id: 15, image: 'toilet', backgroundPosition: 'left 30% top 3vw', transform: 'scale(1.2)', overlay: 'default' },
  { id: 16, image: 'toilet', backgroundPosition: 'left 0% bottom 0vw', transform: 'scale(2) translate(0%, -24%)' },
  { id: 17, image: 'toilet-door-open' },
  { id: 18, image: 'blood-vision' },
  { id: 19, image: 'blood-vision' },
  { id: 20, image: 'blood-vision', backgroundPosition: 'right -75% top -3vw', transform: 'scale(1.8)' },
  { id: 21, image: 'blood-vision', backgroundPosition: 'right 31% top 0vw', transform: 'scale(1.8)' },
  { id: 22, image: 'blood-vision', backgroundPosition: 'left -40% top -5vw', transform: 'scale(1.8)' },
  { id: 23, image: 'blood-vision', backgroundPosition: 'left -40% top -5vw', transform: 'scale(1.8)' },
  { id: 24, image: 'blood-vision', backgroundPosition: 'left -66% top -3vw', transform: 'scale(1.8)', overlay: 'enter' },
  { id: 25, image: 'exit' },
  { id: 26, image: 'exit', transform: 'scale(3) translate(-32%, -9%)', overlay: 'default' },
  { id: 27, image: 'exit' },
  { id: 28, image: 'none', overlay: 'default' },
]

/** Unique room images in order (used for preloading) */
const uniqueRoomImages = [
  'entry',
  'entry-open-door',
  'entry-lidar',
  'body-scan',
  'body-scan-active',
  'body-scan-open-door',
  'toilet',
  'using-toilet',
  'toilet-door-open',
  'blood-vision',
  'exit',
]

export function PrototypeViewer() {
  const [currentFrame, setCurrentFrame] = useState<PrototypeFrame>(prototypeFrames[0])
  const [prevFrameId, setPrevFrameId] = useState(1)
  const frameRefs = useRef<(HTMLLIElement | null)[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isBackwards = currentFrame.id < prevFrameId

  // Determine overlay transition class
  const getOverlayTimingClass = useCallback(() => {
    if (!currentFrame.overlay) return ''
    if (currentFrame.overlay === 'default') return ''
    if (currentFrame.overlay === 'enter') {
      return isBackwards ? 'exit-timing' : 'enter-timing'
    }
    if (currentFrame.overlay === 'exit') {
      return isBackwards ? 'enter-timing' : 'exit-timing'
    }
    return ''
  }, [currentFrame, isBackwards])

  // Setup IntersectionObserver to detect which logic frame is in the viewport center
  useEffect(() => {
    // Calculate rootMargin so that the "trigger line" is at ~50% of viewport on desktop,
    // ~75% on mobile (matching Gatsby's offset calculation)
    const isLarge = window.innerWidth >= 864
    const percentage = isLarge ? 0.5 : 0.75
    const topMargin = -Math.round(window.innerHeight * percentage)
    const bottomMargin = -(window.innerHeight - Math.round(window.innerHeight * percentage) - 1)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const frameId = parseInt(entry.target.getAttribute('data-frame-id') || '1', 10)
            const frame = prototypeFrames.find((f) => f.id === frameId)
            if (frame) {
              setCurrentFrame((prev) => {
                setPrevFrameId(prev.id)
                return frame
              })
            }
          }
        }
      },
      {
        rootMargin: `${topMargin}px 0px ${bottomMargin}px 0px`,
        threshold: 0,
      }
    )

    const currentRefs = frameRefs.current
    currentRefs.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => {
      currentRefs.forEach((el) => {
        if (el) observer.unobserve(el)
      })
    }
  }, [])

  // Build the room image URL
  const roomImageUrl =
    currentFrame.image === 'none'
      ? ''
      : cloudfrontImage(`/images/features/public-healthroom/${currentFrame.image}.jpg`)

  // Build inline styles for the room image div
  const roomImageStyle: React.CSSProperties = {
    backgroundImage: roomImageUrl ? `url(${roomImageUrl})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: currentFrame.backgroundPosition || 'center',
    transform: currentFrame.transform || 'scale(1) translate(0, 0)',
    transition: 'all 0.5s',
    width: '100%',
    height: '100%',
  }

  const overlayTimingClass = getOverlayTimingClass()
  const frameId = currentFrame.id

  return (
    <div className="mt-12">
      {/* Preload room images */}
      <div className="hidden">
        {uniqueRoomImages.map((img) => (
          <Image
            key={img}
            src={cloudfrontImage(`/images/features/public-healthroom/${img}.jpg`)}
            alt=""
            width={1}
            height={1}
            priority
          />
        ))}
      </div>

      {/* Scrollspy wrapper: side-by-side on large screens */}
      <div ref={wrapperRef} className="relative p-4 lg:flex">
        {/* LEFT: Sticky room image */}
        <div
          className={cn(
            'sticky z-[1] bg-white flex items-center justify-center',
            'top-[var(--spacing-header-height,50px)] h-[calc(50vh-var(--spacing-header-height,50px))]',
            'w-full lg:w-1/2 lg:h-[calc(100vh-var(--spacing-header-height,50px))]',
            overlayTimingClass
          )}
        >
          {/* Room image container - square aspect ratio with overflow hidden */}
          <div
            className={cn(
              'relative overflow-hidden mx-auto aspect-square',
              'w-full max-w-[calc(50vh-var(--spacing-header-height,50px))]',
              'lg:w-[90%] lg:max-w-[75vh]'
            )}
          >
            <div style={roomImageStyle} />

            {/* Overlay container */}
            <div
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-full aspect-square transition-colors duration-500',
                'lg:w-[90%] lg:max-w-[75vh]',
                frameId === 28 ? 'bg-black/20' : 'bg-transparent'
              )}
              style={{ maxWidth: '100%' }}
            >
              {/* Entry menu overlays */}
              <div
                className={cn(
                  'absolute transition-opacity',
                  'w-[44.2%] top-1/2 left-[51.5%] -translate-x-1/2 -translate-y-1/2',
                  frameId === 2 ? 'opacity-100' : 'opacity-0',
                  overlayTimingClass === 'enter-timing' ? 'duration-250 delay-500' : 'duration-250'
                )}
              >
                <Image
                  src={cloudfrontImage('/images/features/public-healthroom/menu-1.png')}
                  alt="Entry menu step 1"
                  width={400}
                  height={400}
                  className="block w-full h-auto"
                />
              </div>
              <div
                className={cn(
                  'absolute transition-opacity',
                  'w-[44.2%] top-1/2 left-[51.5%] -translate-x-1/2 -translate-y-1/2',
                  frameId === 3 ? 'opacity-100' : 'opacity-0',
                  overlayTimingClass === 'enter-timing' ? 'duration-250 delay-500' : 'duration-250'
                )}
              >
                <Image
                  src={cloudfrontImage('/images/features/public-healthroom/menu-2.png')}
                  alt="Entry menu step 2"
                  width={400}
                  height={400}
                  className="block w-full h-auto"
                />
              </div>
              <div
                className={cn(
                  'absolute transition-opacity',
                  'w-[44.2%] top-1/2 left-[51.5%] -translate-x-1/2 -translate-y-1/2',
                  frameId === 4 ? 'opacity-100' : 'opacity-0',
                  overlayTimingClass === 'enter-timing' ? 'duration-250 delay-500' : 'duration-250'
                )}
              >
                <Image
                  src={cloudfrontImage('/images/features/public-healthroom/menu-3.png')}
                  alt="Entry menu step 3"
                  width={400}
                  height={400}
                  className="block w-full h-auto"
                />
              </div>

              {/* Holding phone overlay */}
              <div
                className={cn(
                  'absolute transition-opacity bottom-0 right-0 w-[40%]',
                  [4, 8, 10, 15, 26, 28].includes(frameId) ? 'opacity-100' : 'opacity-0',
                  frameId === 28 ? 'right-auto left-1/2 -translate-x-1/2' : '',
                  overlayTimingClass === 'enter-timing' ? 'duration-250 delay-500' : 'duration-250'
                )}
              >
                <Image
                  src={cloudfrontImage('/images/features/public-healthroom/holding-phone.png')}
                  alt="Holding phone"
                  width={400}
                  height={600}
                  className="block w-full h-auto"
                />
              </div>

              {/* Vision results overlay */}
              <div
                className={cn(
                  'absolute transition-opacity w-[55%] top-[9%] left-[-8%]',
                  frameId === 24 ? 'opacity-100' : 'opacity-0',
                  overlayTimingClass === 'enter-timing' ? 'duration-250 delay-500' : 'duration-250'
                )}
              >
                <Image
                  src={cloudfrontImage('/images/features/public-healthroom/vision-results.png')}
                  alt="Vision test results"
                  width={500}
                  height={400}
                  className="block w-full h-auto"
                />
              </div>

              {/* Health message overlay */}
              <div
                className={cn(
                  'absolute transition-opacity w-[32%] top-[23%] left-1/2 -translate-x-1/2',
                  frameId === 28 ? 'opacity-100' : 'opacity-0',
                  overlayTimingClass === 'enter-timing' ? 'duration-250 delay-500' : 'duration-250'
                )}
              >
                <Image
                  src={cloudfrontImage('/images/features/public-healthroom/message-2.png')}
                  alt="Health message"
                  width={300}
                  height={400}
                  className="block w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Scrolling logic frames */}
        <div className="relative z-0 w-full lg:w-1/2 lg:ml-auto mt-[8vh]">
          {/* Indicator line showing the scroll trigger point */}
          <div className="sticky top-[75vh] lg:top-[50vh] w-full h-0 border-b border-dashed border-black/25 z-[2]" />

          <ul className="list-none p-0 m-0">
            {prototypeFrames.map((frame, i) => (
              <li
                key={frame.id}
                data-frame-id={frame.id}
                ref={(el) => {
                  frameRefs.current[i] = el
                }}
              >
                <Image
                  src={cloudfrontImage(
                    `/images/features/public-healthroom/logic/${frame.id}.jpg`
                  )}
                  alt={`System logic step ${frame.id}`}
                  width={800}
                  height={600}
                  className="block w-full h-auto"
                  sizes="(max-width: 864px) 100vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
