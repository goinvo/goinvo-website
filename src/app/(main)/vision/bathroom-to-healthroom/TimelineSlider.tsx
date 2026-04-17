'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

interface TimelineSliderProps {
  slides: { title?: string; body: ReactNode; source: ReactNode }[]
}

// Position values (0–1000) of each of the 8 history-of-medicine slides.
// Matches the legacy from-bathroom-to-healthroom.js timelineValues array.
const SLIDE_POSITIONS = [0, 317, 376, 538, 722, 739, 910, 920] as const
const TIMELINE_MAX = 1000

// Year markers shown above the scrubber line (position is left% of the rail).
// Same percentages and labels as the legacy timelinePercents array.
const YEAR_MARKERS: { left: string; year: string; index: number }[] = [
  { left: '1%', year: '10000 BC', index: 0 },
  { left: '31.7%', year: '4000 BC', index: 1 },
  { left: '37.6%', year: '3000 BC', index: 2 },
  { left: '53.8%', year: '400 BC', index: 3 },
  { left: '72.2%', year: '1920', index: 4 },
  { left: '75.5%', year: '1926', index: 5 },
  { left: '91.0%', year: '2018', index: 6 },
  { left: '94.0%', year: '2019', index: 7 },
]

// Legacy slide-N class names — drive .slide.one … .slide.eight CSS in
// healthroom.css for the per-slide background illustration and slide-content
// positioning.
const SLIDE_CLASSES = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] as const

/**
 * Snap a scrubber position (0–1000) to the nearest slide index using midpoint
 * thresholds. Mirrors the legacy switchSlideAfter() logic from
 * from-bathroom-to-healthroom.js.
 */
function positionToSlide(position: number): number {
  for (let i = SLIDE_POSITIONS.length - 1; i > 0; i--) {
    const midpoint =
      SLIDE_POSITIONS[i] - (SLIDE_POSITIONS[i] - SLIDE_POSITIONS[i - 1]) / 2
    if (position > midpoint) return i
  }
  return 0
}

/**
 * History-of-medicine slider. Replaces the legacy jQuery UI scrubber with a
 * native pointer-driven one — a draggable handle on a horizontal rail with
 * 8 year labels above it. Dragging the handle snaps to the nearest slide on
 * release; clicking a year label jumps directly to that slide.
 */
export function TimelineSlider({ slides }: TimelineSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState<number>(SLIDE_POSITIONS[0])
  const [isDragging, setIsDragging] = useState(false)
  const railRef = useRef<HTMLDivElement>(null)
  const active = slides[activeIndex]

  // Convert a clientX coordinate to a 0–1000 scrubber position.
  const clientXToPosition = useCallback((clientX: number): number => {
    const rail = railRef.current
    if (!rail) return 0
    const rect = rail.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    return Math.round(Math.max(0, Math.min(1, ratio)) * TIMELINE_MAX)
  }, [])

  const goToSlide = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, idx))
    setActiveIndex(clamped)
    setPosition(SLIDE_POSITIONS[clamped])
  }, [slides.length])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)
    setIsDragging(true)
    setPosition(clientXToPosition(event.clientX))
  }

  // Track the live drag with native listeners so the handle keeps following the
  // pointer even when it leaves the rail bounds.
  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: PointerEvent) => {
      setPosition(clientXToPosition(e.clientX))
    }
    const onUp = (e: PointerEvent) => {
      setIsDragging(false)
      const finalPosition = clientXToPosition(e.clientX)
      goToSlide(positionToSlide(finalPosition))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [isDragging, clientXToPosition, goToSlide])

  const handlePercent = `${(position / TIMELINE_MAX) * 100}%`

  return (
    <>
      {/* Year labels positioned along the scrubber rail */}
      <div id="timeline-dates" aria-hidden="true">
        {YEAR_MARKERS.map((marker) => (
          <div
            key={marker.year}
            style={{ left: marker.left, cursor: 'pointer' }}
            onClick={() => goToSlide(marker.index)}
          >
            {marker.year}
          </div>
        ))}
      </div>

      {/* Draggable scrubber rail. The visible rail line itself is drawn by
          #timechart:after in the legacy CSS; this div hosts the handle. */}
      <div
        id="timeline-slider-controller"
        ref={railRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={slides.length - 1}
        aria-valuenow={activeIndex}
        aria-label="Timeline position"
        onPointerDown={handlePointerDown}
      >
        <span
          style={{
            left: handlePercent,
            transition: isDragging ? 'none' : undefined,
          }}
        />
      </div>

      <div id="timeline" className="slider">
        <span className="byline">Illustration By Sarah Kaiser</span>
        <div className="slider-contents">
          <button
            type="button"
            className="slick-prev"
            aria-label="Previous slide"
            onClick={() => goToSlide(activeIndex - 1)}
            disabled={activeIndex === 0}
          />
          <div className={`slide active ${SLIDE_CLASSES[activeIndex] ?? ''}`}>
            <div className="slide-content">
              {active.title && <h6 className="bold-title">{active.title}</h6>}
              {active.body}
              <p className="source">{active.source}</p>
            </div>
          </div>
          <button
            type="button"
            className="slick-next"
            aria-label="Next slide"
            onClick={() => goToSlide(activeIndex + 1)}
            disabled={activeIndex === slides.length - 1}
          />
        </div>
      </div>
    </>
  )
}
