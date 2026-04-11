'use client'

import { useState } from 'react'

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

/**
 * "Health sensing locations" interactive slider, recovered from the original
 * Gatsby/legacy from-bathroom-to-healthroom.js (CloudFront archive).
 *
 * Layout:
 *   - Head illustration at top (full width)
 *   - Horizontal row of location buttons
 *   - Below each active button: a popover "card" image with extra detail
 *   - Below that: a large "scene" image showing the active location
 *
 * Replaces the previous static grid-of-6 layout in page.tsx.
 */
export function LocationsSlider({ headImage, locations }: LocationsSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = locations[activeIndex]

  return (
    <div className="full" id="locations">
      {/* Head illustration */}
      <div className="slider-graphic">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={headImage} alt="Health sensing locations" />
      </div>

      {/* Button row */}
      <div className="slider-controls" role="tablist">
        {locations.map((loc, i) => (
          <button
            key={loc.key}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => setActiveIndex(i)}
            className={`slide-button slide${i}${i === activeIndex ? ' active' : ''}`}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Popover card aligned with the active button (CSS handles the column placement) */}
      {active.card && (
        <div className="calendar-graphics">
          <div className={`active position-${activeIndex}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.card} alt={`${active.label} detail`} />
          </div>
        </div>
      )}

      {/* Active scene */}
      <div className="slider-contents">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.scene} alt={`${active.label} health sensing`} />
      </div>
    </div>
  )
}
