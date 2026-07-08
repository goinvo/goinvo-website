'use client'

import { useRef, useState } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useReducedMotion } from '@/lib/motion'
import { RISKS, type Risk } from './riskData'

const C = 200 // center
const SECONDS_PER_SWEEP = 5
const SWEEP_R = 190 // scope radius
const TAIL_DEG = 120 // length of the afterglow trailing the beam
const TAIL_SEGMENTS = 30
const PING_FADE = 70 // how many degrees behind the beam a blip stays lit

// angle (deg, 0 = right, clockwise) + radius for each blip, in RISKS order
const PLACEMENT = [
  { angle: -90, radius: 150 }, // clinical (top)
  { angle: -18, radius: 118 }, // operational
  { angle: 54, radius: 162 }, // workflow
  { angle: 126, radius: 120 }, // adoption
  { angle: 198, radius: 150 }, // strategy
]

function polar(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return { x: C + radius * Math.cos(rad), y: C + radius * Math.sin(rad) }
}

// Greedy word-wrap into lines of at most `maxChars` characters.
function wrapText(text: string, maxChars: number) {
  const lines: string[] = []
  let cur = ''
  for (const word of text.split(' ')) {
    const next = cur ? `${cur} ${word}` : word
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = word
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// A thin wedge (center → arc a1..a2) used to build the fading sweep tail.
function wedge(a1: number, a2: number, r: number) {
  const p1 = polar(a1, r)
  const p2 = polar(a2, r)
  return `M${C},${C} L${p1.x},${p1.y} A${r},${r} 0 0 ${a2 > a1 ? 1 : 0} ${p2.x},${p2.y} Z`
}

// Afterglow tail: leading edge at local angle 0, fading back to -TAIL_DEG.
// The parent <g> is rotated by the sweep angle, so it circles the center.
const SWEEP_TAIL = Array.from({ length: TAIL_SEGMENTS }, (_, i) => {
  const step = TAIL_DEG / TAIL_SEGMENTS
  const t = i / TAIL_SEGMENTS
  return { d: wedge(-i * step, -(i + 1) * step, SWEEP_R), opacity: 0.34 * Math.pow(1 - t, 1.4) }
})

function Blip({
  risk,
  angle,
  radius,
  sweep,
  reduced,
  active,
  onActivate,
  onDeactivate,
}: {
  risk: Risk
  angle: number
  radius: number
  sweep: MotionValue<number>
  reduced: boolean
  active: boolean
  onActivate: () => void
  onDeactivate: () => void
}) {
  const { x, y } = polar(angle, radius)
  // Directional ping: the blip lights the instant the beam passes it (delta≈0),
  // then fades over PING_FADE degrees as the beam moves on — like real radar.
  const glow = useTransform(sweep, (s) => {
    const delta = (((s - angle) % 360) + 360) % 360
    return delta <= PING_FADE ? 1 - delta / PING_FADE : 0
  })
  const glowOpacity = useTransform(glow, (g) => (reduced ? 0.5 : 0.12 + g * 0.8))
  const glowR = useTransform(glow, (g) => (reduced ? 11 : 5 + g * 11))

  // Label offset outward from the blip
  const lab = polar(angle, radius + 16)
  const anchor = lab.x < C - 8 ? 'end' : lab.x > C + 8 ? 'start' : 'middle'

  return (
    <g
      onMouseEnter={onActivate}
      onMouseLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
      tabIndex={0}
      role="button"
      aria-label={`${risk.title}: ${risk.question}`}
      style={{ cursor: 'pointer', outline: 'none' }}
    >
      {/* ping glow */}
      <motion.circle cx={x} cy={y} r={glowR} fill="var(--color-primary)" style={{ opacity: glowOpacity }} />
      {/* solid blip */}
      <circle
        cx={x}
        cy={y}
        r={4}
        fill={active ? 'var(--color-primary)' : 'var(--color-primary)'}
        stroke="#fff"
        strokeWidth={1}
      />
      <text
        x={lab.x}
        y={lab.y}
        textAnchor={anchor}
        dominantBaseline="middle"
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fill: active ? 'var(--color-primary)' : 'var(--color-black)',
        }}
      >
        {risk.title}
        {active &&
          wrapText(risk.question, 30).map((line, i) => (
            <tspan
              key={i}
              x={lab.x}
              dy={i === 0 ? 26 : 21}
              style={{
                fontSize: 16.5,
                fontWeight: 400,
                letterSpacing: 'normal',
                textTransform: 'none',
                fill: 'var(--color-gray)',
              }}
            >
              {line}
            </tspan>
          ))}
      </text>
    </g>
  )
}

export function RadarRisks() {
  const prefersReducedMotion = useReducedMotion()
  const sweep = useMotionValue(0)
  const lastRef = useRef<number | null>(null)
  const sweepGroupRef = useRef<SVGGElement>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  useAnimationFrame((t) => {
    if (prefersReducedMotion) return
    if (lastRef.current == null) {
      lastRef.current = t
      return
    }
    const dt = t - lastRef.current
    lastRef.current = t
    const next = (sweep.get() + (dt * 360) / (SECONDS_PER_SWEEP * 1000)) % 360
    sweep.set(next) // drives the blip pings
    // Rotate the beam with SVG's native rotate(angle cx cy) so it always
    // pivots around the scope center (200,200), independent of the viewBox.
    sweepGroupRef.current?.setAttribute('transform', `rotate(${next} ${C} ${C})`)
  })

  return (
    <div className="mx-auto" style={{ width: 'min(94vw, 640px)' }}>
      <svg viewBox="-230 -25 860 450" className="w-full h-auto" role="img" aria-label="Radar of product risks">
        {/* range rings */}
        {[60, 110, 160, 190].map((r) => (
          <circle
            key={r}
            cx={C}
            cy={C}
            r={r}
            fill="none"
            stroke="var(--color-gray-medium)"
            strokeWidth={1}
            opacity={0.6}
          />
        ))}
        {/* crosshairs */}
        <line x1={C} y1={10} x2={C} y2={390} stroke="var(--color-gray-medium)" strokeWidth={1} opacity={0.5} />
        <line x1={10} y1={C} x2={390} y2={C} stroke="var(--color-gray-medium)" strokeWidth={1} opacity={0.5} />

        {/* rotating sweep beam + afterglow tail (hidden under reduced motion) */}
        {!prefersReducedMotion && (
          <g ref={sweepGroupRef}>
            {SWEEP_TAIL.map((seg, i) => (
              <path key={i} d={seg.d} fill="var(--color-primary)" opacity={seg.opacity} />
            ))}
            {/* bright leading edge */}
            <line x1={C} y1={C} x2={C + SWEEP_R} y2={C} stroke="var(--color-primary)" strokeWidth={1.6} opacity={0.9} />
            <circle cx={C + SWEEP_R} cy={C} r={2.5} fill="var(--color-primary)" />
          </g>
        )}

        {/* center product */}
        <circle cx={C} cy={C} r={6} fill="var(--color-primary)" />
        <circle cx={C} cy={C} r={11} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} opacity={0.5} />

        {/* blips */}
        {RISKS.map((risk, i) => (
          <Blip
            key={risk.key}
            risk={risk}
            angle={PLACEMENT[i].angle}
            radius={PLACEMENT[i].radius}
            sweep={sweep}
            reduced={prefersReducedMotion ?? false}
            active={activeKey === risk.key}
            onActivate={() => setActiveKey(risk.key)}
            onDeactivate={() => setActiveKey((k) => (k === risk.key ? null : k))}
          />
        ))}
      </svg>
    </div>
  )
}
