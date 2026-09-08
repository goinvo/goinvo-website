'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'

/**
 * The layer behind the hero lettering: a tilted plane of real product work
 * gliding toward the horizon and fading into the black — the studio's shipped
 * screens as a runway receding behind the claim.
 *
 * Ported from the "A.m · The runway" variant in the Claude Design project
 * (GoInvo Homepage Design / variant-a-mask.jsx + its .gi-runway rules). The
 * geometry lives in the hero stylesheet next to the rest of the hero motion,
 * server-rendered so the plane is in place on first paint; the only thing this
 * component owns at runtime is the cursor tilt.
 *
 * Decorative — the phrase itself is real text in the <h1>, so the whole layer
 * is hidden from assistive tech.
 */

// One screen per row, ordered so the nearest (bottom, most legible) frames are
// the work we most want read. The belt is rendered twice; the glide keyframe
// travels exactly one copy, so the loop is seamless.
const RUNWAY_ROWS = [
  { src: '/images/experiments/home-2026/facto2.jpg', width: 2000, height: 1037 },
  { src: '/images/experiments/home-2026/coderyte1.jpg', width: 1000, height: 840 },
  { src: '/images/services/mitre-dashboard.jpg', width: 2000, height: 750 },
  { src: '/images/experiments/home-2026/determinantsofhealth.jpg', width: 2000, height: 2381 },
  { src: '/images/experiments/home-2026/hgraphipad.jpg', width: 2000, height: 1474 },
]

export function HomeHeroRunway() {
  const [tilt, setTilt] = useState(0)

  // Cursor nudges the plane a few degrees about its vertical axis. Rounded so a
  // pixel of mouse movement doesn't churn React with imperceptible re-renders.
  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const next = ((event.clientX - rect.left) / rect.width - 0.5) * 6
    setTilt(Math.round(next * 100) / 100)
  }

  return (
    <div
      className="eid-runway"
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt(0)}
      aria-hidden="true"
    >
      <div
        className="eid-runway-plane"
        style={{ transform: `rotateX(58deg) rotateZ(${tilt}deg)` } as CSSProperties}
      >
        <div className="eid-runway-belt">
          {[0, 1].map((half) => (
            <div key={half}>
              {RUNWAY_ROWS.map((row) => (
                <div key={row.src} className="eid-runway-row">
                  <Image
                    src={row.src}
                    alt=""
                    width={row.width}
                    height={row.height}
                    // Perspective magnifies the near end of the plane to ~3.5x
                    // the plane's own 860px, so an 860px-wide variant arrives
                    // visibly soft where the fade is clearest. Ask for the big one.
                    sizes="1920px"
                    // Eager, but yielded to the lettering (the LCP element).
                    // Not lazy: the belt glides new rows in without a scroll, and
                    // a row that decodes as it arrives pops.
                    loading="eager"
                    fetchPriority="low"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="eid-runway-fade" />
    </div>
  )
}
