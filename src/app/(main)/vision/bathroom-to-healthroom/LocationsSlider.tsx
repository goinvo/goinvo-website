'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Location {
  key: string
  label: string
  scene: string
  card?: string
}

interface LocationsSliderProps {
  headImage: string
  locations: Location[]
}

// Per-button widths (cumulative offsets) matching the legacy CSS:
//   .slide0, .slide1 { width: 12% }
//   .slide2, .slide3, .slide4 { width: 18% }
//   .slide5 { width: 22% }
// Buttons total 100% across the slider-controls row.
const BUTTON_WIDTHS = [12, 12, 18, 18, 18, 22] as const

/**
 * "Health sensing locations" interactive slider, recovered from the original
 * Gatsby/legacy from-bathroom-to-healthroom.js (CloudFront archive).
 *
 * Layout:
 *   - Head illustration at top (full width)
 *   - Horizontal row of location buttons (variable widths matching legacy)
 *   - Below the active button: a popover "card" image that slides horizontally
 *     to anchor under the active button (Gatsby's moveCard behavior)
 *   - Below that: a large "scene" image showing the active location
 */
export function LocationsSlider({ headImage, locations }: LocationsSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [cardLeftPx, setCardLeftPx] = useState<number | null>(null)
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const active = locations[activeIndex]

  // Move the popover card to align with the active button. Uses the actual
  // rendered offsetLeft so it stays correct even if the controls row resizes.
  const recomputeCardPosition = () => {
    const btn = buttonsRef.current[activeIndex]
    if (!btn) return
    setCardLeftPx(btn.offsetLeft)
  }

  useLayoutEffect(() => {
    recomputeCardPosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  useEffect(() => {
    const onResize = () => recomputeCardPosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex])

  return (
    <div className="full" id="locations">
      {/* Head illustration */}
      <div className="slider-graphic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={headImage} alt="Health sensing locations" />
      </div>

      {/* Button row — variable widths matching legacy */}
      <div className="slider-controls" role="tablist">
        {locations.map((loc, i) => (
          <button
            key={loc.key}
            ref={(el) => { buttonsRef.current[i] = el }}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => setActiveIndex(i)}
            style={{ flex: `0 0 ${BUTTON_WIDTHS[i] ?? 16.66}%` }}
            className={`slide-button slide${i}${i === activeIndex ? ' active' : ''}`}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Popover card — anchored to the left edge of the active button */}
      <div className="calendar-graphics">
        {locations.map((loc, i) => (
          loc.card ? (
            <div
              key={loc.key}
              className={`position-${i}${i === activeIndex ? ' active' : ''}`}
              style={i === activeIndex && cardLeftPx !== null ? { left: cardLeftPx } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={loc.card} alt={`${loc.label} detail`} />
            </div>
          ) : null
        ))}
      </div>

      {/* Active scene */}
      <div className="slider-contents">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.scene} alt={`${active.label} health sensing`} />
      </div>
    </div>
  )
}
