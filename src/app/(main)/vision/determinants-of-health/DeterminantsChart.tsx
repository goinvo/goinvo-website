'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import determinants from '@/data/vision/determinants-of-health/chart-data.json'

const colors = ['#F9D7A7', '#B2E5E9', '#E8ED9D', '#F8CBC5', '#90EED4']
const iconPaths = [
  '/images/vision/determinants-of-health/individual-behavior.svg',
  '/images/vision/determinants-of-health/social-circumstances.svg',
  '/images/vision/determinants-of-health/genetics-biology.svg',
  '/images/vision/determinants-of-health/medical-care.svg',
  '/images/vision/determinants-of-health/environment.svg',
]

interface Division {
  title: string
  factors?: string[]
}

interface Determinant {
  id: string
  title: string
  shortTitle: string
  percentage: number
  description: string
  divisions: Division[]
}

function DonutChart({
  data,
  activeIndex,
  onSelect,
}: {
  data: Determinant[]
  activeIndex: number
  onSelect: (i: number) => void
}) {
  const total = data.reduce((sum, d) => sum + d.percentage, 0)
  const cx = 150
  const cy = 150
  const outerR = 130
  const innerR = 35
  let cumulative = 0

  const slices = data.map((d, i) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    cumulative += d.percentage
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    const midAngle = (startAngle + endAngle) / 2

    const largeArc = d.percentage / total > 0.5 ? 1 : 0

    const x1Outer = cx + outerR * Math.cos(startAngle)
    const y1Outer = cy + outerR * Math.sin(startAngle)
    const x2Outer = cx + outerR * Math.cos(endAngle)
    const y2Outer = cy + outerR * Math.sin(endAngle)
    const x1Inner = cx + innerR * Math.cos(endAngle)
    const y1Inner = cy + innerR * Math.sin(endAngle)
    const x2Inner = cx + innerR * Math.cos(startAngle)
    const y2Inner = cy + innerR * Math.sin(startAngle)

    const path = [
      `M ${x1Outer} ${y1Outer}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
      `L ${x1Inner} ${y1Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
      'Z',
    ].join(' ')

    // Label position
    const labelR = outerR + 18
    const labelX = cx + labelR * Math.cos(midAngle)
    const labelY = cy + labelR * Math.sin(midAngle)

    return (
      <g key={d.id}>
        <path
          d={path}
          fill={colors[i]}
          stroke="white"
          strokeWidth="2"
          opacity={activeIndex === i ? 1 : 0.6}
          className="cursor-pointer transition-opacity duration-200"
          onClick={() => onSelect(i)}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[10px] fill-gray-dark pointer-events-none"
        >
          {d.shortTitle}
        </text>
      </g>
    )
  })

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[400px] mx-auto">
      {slices}
    </svg>
  )
}

export function DeterminantsChart() {
  const [activeIndex, setActiveIndex] = useState(0)
  const data = determinants as Determinant[]
  const selected = data[activeIndex]

  return (
    <div className="max-width max-width--md content-padding mx-auto my-12">
      <h2 className="header-lg text-center mb-4">
        Tap the categories to explore
      </h2>

      {/* Legend buttons (vertical list, matching Gatsby) */}
      <div className="flex flex-col sm:flex-row sm:justify-center gap-1 mb-6">
        {data.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActiveIndex(i)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border-0 cursor-pointer transition-all bg-transparent',
              activeIndex === i ? 'opacity-100' : 'opacity-60 hover:opacity-80'
            )}
          >
            <img src={iconPaths[i]} alt={d.title} className="w-8 h-8" />
            <span className="text-gray text-sm" style={{ textTransform: 'none', letterSpacing: 0 }}>
              {d.shortTitle}
            </span>
          </button>
        ))}
      </div>

      {/* Donut chart (full-width centered, matching Gatsby) */}
      <DonutChart
        data={data}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
      />

      {/* Details panel (below chart, not side-by-side) */}
      <div className="mt-8">
        <h3 className="font-sans text-[1.17em] font-bold mb-2">{selected.title}</h3>
        <p className="leading-relaxed mb-6">{selected.description}</p>

        {selected.divisions && selected.divisions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {selected.divisions.map((div) => (
              <div key={div.title}>
                <h4 className="font-sans text-base font-bold mb-1">{div.title}</h4>
                {div.factors && div.factors.length > 0 && (
                  <ul className="ul list-outside pl-4 text-sm text-gray-dark space-y-0.5">
                    {div.factors.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
