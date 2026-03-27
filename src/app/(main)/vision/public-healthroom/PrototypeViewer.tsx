'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, cloudfrontImage } from '@/lib/utils'

interface RoomImage {
  id: string
  label: string
}

interface PrototypeViewerProps {
  roomImages: RoomImage[]
  logicFrames: number[]
}

export function PrototypeViewer({
  roomImages,
  logicFrames,
}: PrototypeViewerProps) {
  const [activeRoomIndex, setActiveRoomIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const goToRoom = (index: number) => {
    setDirection(index > activeRoomIndex ? 1 : -1)
    setActiveRoomIndex(index)
  }

  const goNext = () => {
    setDirection(1)
    setActiveRoomIndex((prev) => (prev + 1) % roomImages.length)
  }

  const goPrev = () => {
    setDirection(-1)
    setActiveRoomIndex(
      (prev) => (prev - 1 + roomImages.length) % roomImages.length
    )
  }

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  return (
    <div className="mt-12">
      {/* Room Prototype Carousel */}
      <div className="max-width mx-auto px-4">
        {/* Main carousel view */}
        <div className="relative overflow-hidden bg-gray-light rounded-lg aspect-[16/10]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeRoomIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="w-full h-full"
            >
              {roomImages[activeRoomIndex].id !== 'none' && (
                <Image
                  src={cloudfrontImage(
                    `/images/features/public-healthroom/${roomImages[activeRoomIndex].id}.jpg`
                  )}
                  alt={roomImages[activeRoomIndex].label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1020px) 100vw, 1020px"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Prev/Next arrows */}
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-card cursor-pointer transition-colors z-10"
            aria-label="Previous room view"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-card cursor-pointer transition-colors z-10"
            aria-label="Next room view"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Label overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
            <p className="text-white text-sm font-semibold">
              {roomImages[activeRoomIndex].label}
            </p>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {roomImages.map((img, i) => (
            <button
              key={img.id}
              onClick={() => goToRoom(i)}
              className={cn(
                'shrink-0 w-20 h-14 relative rounded overflow-hidden cursor-pointer border-2 transition-all',
                i === activeRoomIndex
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent opacity-70 hover:opacity-100'
              )}
              aria-label={`View ${img.label}`}
            >
              <Image
                src={cloudfrontImage(
                  `/images/features/public-healthroom/${img.id}.jpg`
                )}
                alt={img.label}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Overlay UI images */}
      <div className="max-width mx-auto px-4 mt-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { src: 'menu-1.png', label: 'Entry Menu - Step 1' },
            { src: 'menu-2.png', label: 'Entry Menu - Step 2' },
            { src: 'menu-3.png', label: 'Entry Menu - Step 3' },
            { src: 'holding-phone.png', label: 'Holding Phone' },
            { src: 'vision-results.png', label: 'Vision Results' },
            { src: 'message-2.png', label: 'Health Message' },
          ].map((overlay) => (
            <div
              key={overlay.src}
              className="bg-gray-light rounded-lg overflow-hidden"
            >
              <Image
                src={cloudfrontImage(
                  `/images/features/public-healthroom/${overlay.src}`
                )}
                alt={overlay.label}
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <p className="text-xs text-gray text-center py-2">
                {overlay.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* System Logic Frames */}
      <div className="max-width mx-auto px-4 mt-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {logicFrames.map((frameId) => (
            <div
              key={frameId}
              className="bg-gray-light rounded-lg overflow-hidden"
            >
              <Image
                src={cloudfrontImage(
                  `/images/features/public-healthroom/logic/${frameId}.jpg`
                )}
                alt={`System logic frame ${frameId}`}
                width={400}
                height={300}
                className="w-full h-auto"
              />
              <p className="text-xs text-gray text-center py-1">
                Step {frameId}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
