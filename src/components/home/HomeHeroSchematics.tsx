import type { CSSProperties } from 'react'

/**
 * The faint layer behind the hero lettering: hairline schematics of things
 * somebody designed — an intake form, a vitals trace, a wristband, a blister
 * pack, a sequence track, a drawing's own dimension marks.
 *
 * They are the argument the headline is making, so they stay at the threshold
 * of visible: ~7% opacity, non-scaling hairlines, a slow drift. Decorative
 * only, and hidden from assistive tech.
 */

type Schematic = {
  id: string
  /** viewBox of the drawing */
  box: string
  body: React.ReactNode
  /** placement + drift, as CSS custom properties */
  style: CSSProperties
  /** hidden below this breakpoint to keep the mobile hero calm */
  className?: string
}

// fill/stroke/stroke-width are inherited SVG properties, so setting them on the
// wrapping <g> is enough. vector-effect is NOT inherited — the hero stylesheet
// applies it to descendants directly so the hairlines stay hairlines at any size.
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1,
}

/** The 14-page intake form. */
const IntakeForm = (
  <g {...stroke}>
    <rect x="0.5" y="0.5" width="99" height="129" />
    <line x1="9" y1="15" x2="52" y2="15" />
    <line x1="9" y1="21" x2="38" y2="21" />
    {[34, 52, 70, 88].map((y) => (
      <g key={y}>
        <line x1="9" y1={y - 4} x2="30" y2={y - 4} />
        <rect x="9" y={y} width="82" height="9" />
      </g>
    ))}
    {[106, 115].map((y) => (
      <g key={y}>
        <rect x="9" y={y} width="6" height="6" />
        <line x1="20" y1={y + 3} x2="66" y2={y + 3} />
      </g>
    ))}
  </g>
)

/** A vitals trace. */
const VitalsTrace = (
  <g {...stroke}>
    <line x1="0" y1="30" x2="180" y2="30" strokeDasharray="1 5" opacity="0.5" />
    <polyline
      points={[0, 1, 2]
        .flatMap((beat) => {
          const x = beat * 60
          return [
            [x + 0, 30], [x + 11, 30], [x + 15, 25], [x + 19, 30],
            [x + 24, 30], [x + 26, 34], [x + 29, 9], [x + 32, 45], [x + 35, 30],
            [x + 40, 30], [x + 46, 21], [x + 52, 30], [x + 59, 30],
          ]
        })
        .map(([x, y]) => `${x},${y}`)
        .join(' ')}
    />
  </g>
)

/** A hospital wristband. */
const Wristband = (
  <g {...stroke}>
    <rect x="0.5" y="8.5" width="149" height="23" rx="11" />
    <line x1="14" y1="15" x2="52" y2="15" />
    <line x1="14" y1="20" x2="40" y2="20" />
    <line x1="14" y1="25" x2="46" y2="25" />
    {[70, 74, 76, 81, 85, 87, 92, 96, 98, 103, 107, 112, 114, 119, 123, 128].map((x, i) => (
      <line key={x} x1={x} y1="13" x2={x} y2="27" strokeWidth={i % 3 === 0 ? 1.6 : 1} />
    ))}
  </g>
)

/** A blister pack and a capsule. */
const BlisterPack = (
  <g {...stroke}>
    <rect x="0.5" y="0.5" width="69" height="59" rx="4" />
    {[15, 30, 45].map((y) =>
      [18, 52].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="8.5" />),
    )}
    <line x1="35" y1="6" x2="35" y2="54" strokeDasharray="2 4" />
    <rect x="84" y="20" width="46" height="20" rx="10" />
    <line x1="107" y1="20" x2="107" y2="40" />
  </g>
)

/** A sequence / genome track. */
const SequenceTrack = (
  <g {...stroke}>
    <line x1="0" y1="46" x2="170" y2="46" />
    {[4, 12, 19, 27, 31, 40, 48, 55, 63, 70, 78, 86, 91, 99, 107, 114, 122, 130, 137, 145, 153, 161].map(
      (x, i) => <line key={x} x1={x} y1={46 - (6 + ((i * 7) % 22))} x2={x} y2="46" />,
    )}
    <rect x="26" y="4" width="34" height="8" />
    <rect x="86" y="4" width="22" height="8" />
    {[0, 42, 84, 126, 168].map((x) => <line key={x} x1={x} y1="46" x2={x} y2="52" />)}
  </g>
)

/** The drawing's own redlines — because this is designed too. */
const DimensionMarks = (
  <g {...stroke}>
    <line x1="0" y1="8" x2="0" y2="72" />
    <line x1="72" y1="8" x2="72" y2="72" />
    <line x1="0" y1="40" x2="72" y2="40" />
    <polyline points="6,35 0,40 6,45" />
    <polyline points="66,35 72,40 66,45" />
    <circle cx="36" cy="40" r="15" strokeDasharray="3 4" />
    <line x1="36" y1="18" x2="36" y2="62" strokeDasharray="3 4" opacity="0.7" />
  </g>
)

const schematics: Schematic[] = [
  {
    id: 'form',
    box: '0 0 100 130',
    body: IntakeForm,
    style: { top: '12%', left: '3%', width: 'clamp(70px, 7vw, 104px)', '--dx': '0px', '--dy': '-14px', '--dur': '19s' } as CSSProperties,
  },
  {
    id: 'vitals',
    box: '0 0 180 54',
    body: VitalsTrace,
    style: { top: '18%', right: '4%', width: 'clamp(120px, 14vw, 210px)', '--dx': '-12px', '--dy': '8px', '--dur': '23s' } as CSSProperties,
  },
  {
    id: 'wristband',
    box: '0 0 150 40',
    body: Wristband,
    style: { bottom: '13%', left: '6%', width: 'clamp(110px, 13vw, 190px)', '--dx': '14px', '--dy': '-6px', '--dur': '27s' } as CSSProperties,
    className: 'hidden sm:block',
  },
  {
    id: 'blister',
    box: '0 0 132 60',
    body: BlisterPack,
    style: { bottom: '16%', right: '7%', width: 'clamp(96px, 11vw, 156px)', '--dx': '-9px', '--dy': '-11px', '--dur': '21s' } as CSSProperties,
    className: 'hidden sm:block',
  },
  // These two hug the left and right edges at mid-height. They stay out of the
  // centre column entirely — a hairline drifting behind the opaque lettering is
  // invisible, but one crossing the thin kicker text reads as a collision.
  {
    id: 'sequence',
    box: '0 0 170 54',
    body: SequenceTrack,
    style: { top: '50%', left: '1.5%', width: 'clamp(120px, 13vw, 190px)', '--dx': '10px', '--dy': '9px', '--dur': '25s' } as CSSProperties,
    className: 'hidden xl:block',
  },
  {
    id: 'dimensions',
    box: '0 0 72 80',
    body: DimensionMarks,
    style: { top: '44%', right: '2%', width: 'clamp(52px, 5vw, 76px)', '--dx': '-7px', '--dy': '10px', '--dur': '17s' } as CSSProperties,
    className: 'hidden xl:block',
  },
]

export function HomeHeroSchematics() {
  return (
    <div className="eid-schematics pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {schematics.map((item) => (
        <svg
          key={item.id}
          className={`eid-schematic absolute text-white ${item.className ?? ''}`}
          style={item.style}
          viewBox={item.box}
          focusable="false"
        >
          {item.body}
        </svg>
      ))}
    </div>
  )
}
