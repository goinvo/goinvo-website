'use client'

import { useState, type ReactNode } from 'react'

interface TimelineSliderProps {
  slides: { title?: string; body: ReactNode; source: ReactNode }[]
}

/**
 * Timeline slider for the From Bathroom to Healthroom "history of medicine"
 * section. Originally a jQuery slick slider with 8 slides paired to a custom
 * jQuery UI timeline scrubber. Reimplemented as a simple
 * prev/next/dot-navigation slider — the timeline scrubber's positioning data
 * lives outside this component (the SVG timeline graphic above).
 *
 * Recovered structure from from-bathroom-to-healthroom.js (CloudFront).
 */
export function TimelineSlider({ slides }: TimelineSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = slides[activeIndex]

  return (
    <div id="timeline" className="slider">
      <span className="byline">Illustration By Sarah Kaiser</span>
      <div className="slider-contents">
        <div className="slide active">
          <div className="slide-content">
            {active.title && <h6 className="bold-title">{active.title}</h6>}
            {active.body}
            <p className="source">{active.source}</p>
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="timeline-nav">
        <button
          type="button"
          className="timeline-arrow prev"
          aria-label="Previous slide"
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          disabled={activeIndex === 0}
        >
          ‹ Previous
        </button>
        <div className="timeline-dots" role="tablist">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === activeIndex}
              className={`timeline-dot${i === activeIndex ? ' active' : ''}`}
              onClick={() => setActiveIndex(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className="timeline-arrow next"
          aria-label="Next slide"
          onClick={() => setActiveIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={activeIndex === slides.length - 1}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
