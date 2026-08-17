import type { CSSProperties } from 'react'
import {
  LETTERING_PEN,
  LETTERING_STROKES,
  LETTERING_VIEWBOX,
} from '@/components/home/letteringData'

/**
 * The studio's hand-lettered "everything is designed" mark, as vector, that
 * writes itself.
 *
 * Each brush stroke is drawn through its OWN mask, and the mask is the path the
 * brush actually travelled (recovered by skeletonizing the stroke — see
 * scripts/trace-lettering.mjs). Animating that path's stroke-dashoffset sweeps a
 * brush-width disc along the real pen route, so the ink appears at a moving
 * pen tip, dry-brush texture and all, rather than fading in.
 *
 * One mask per stroke rather than one shared mask: the disc is sized to the
 * stroke's widest point, so a shared mask would let a fat brush reveal the
 * neighbouring letter before its turn.
 *
 * Inlined rather than loaded as an <img> so it is part of the first paint (it's
 * the hero's LCP element), so `currentColor` applies, and so the page's own
 * stylesheet can drive the timing.
 *
 * Deliberately aria-hidden: this renders inside a heading that already carries
 * the phrase as real text. Naming the SVG too would announce it twice, and text
 * in the heading is what crawlers read.
 */
export function EverythingIsDesignedMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox={LETTERING_VIEWBOX}
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {LETTERING_PEN.map((pen, index) => (
          <mask
            key={index}
            id={`eid-ink-${index}`}
            maskUnits="userSpaceOnUse"
            x={pen.box[0]}
            y={pen.box[1]}
            width={pen.box[2]}
            height={pen.box[3]}
          >
            <g className="eid-nib" strokeWidth={pen.width}>
              {pen.paths.map((sub, part) => (
                <path
                  key={part}
                  d={sub.d}
                  pathLength={1}
                  style={{ '--t0': `${sub.t0}ms`, '--dur': `${sub.dur}ms` } as CSSProperties}
                />
              ))}
            </g>
          </mask>
        ))}
      </defs>
      {LETTERING_STROKES.map((d, index) => (
        <path key={index} d={d} mask={`url(#eid-ink-${index})`} />
      ))}
    </svg>
  )
}
