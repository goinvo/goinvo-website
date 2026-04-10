'use client'

import { useState } from 'react'

interface Slide {
  year: string
  src: string
  alt: string
}

interface DateSliderProps {
  caption: string
  slides: Slide[]
}

export function DateSlider({ caption, slides }: DateSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = slides[activeIndex]

  return (
    <div className="slider" id="dates">
      <div className="slider-aside caption">
        <p>{caption}</p>
        <div className="slider-controls">
          {slides.map((slide, i) => (
            <button
              key={slide.year}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`slide-button slide${i}${i === activeIndex ? ' active' : ''}`}
            >
              <span className="button" />
              <span>{slide.year}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="slider-contents">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.src} alt={active.alt} />
      </div>
    </div>
  )
}
