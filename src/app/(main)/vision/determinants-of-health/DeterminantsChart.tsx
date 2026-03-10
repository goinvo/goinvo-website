'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import determinants from '@/data/vision/determinants-of-health/chart-data.json'

const colors = ['#F9D7A7', '#B2E5E9', '#E8ED9D', '#F8CBC5', '#90EED4']
const icons = ['🏃', '👥', '🧬', '🏥', '🌍']

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
  const cx = 100
  const cy = 100
  const outerR = 90
  const innerR = 55
  let cumulative = 0

  const slices = data.map((d, i) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
    cumulative += d.percentage
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2

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

    return (
      <path
        key={d.id}
        d={path}
        fill={colors[i]}
        stroke="white"
        strokeWidth="2"
        opacity={activeIndex === i ? 1 : 0.7}
        className="cursor-pointer transition-opacity duration-200"
        onClick={() => onSelect(i)}
      />
    )
  })

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[300px] mx-auto">
      {slices}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="text-[14px] font-bold fill-gray-dark"
      >
        {data[activeIndex].percentage}%
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        className="text-[8px] fill-gray"
      >
        {data[activeIndex].shortTitle}
      </text>
    </svg>
  )
}

export function DeterminantsChart() {
  const [activeIndex, setActiveIndex] = useState(0)
  const data = determinants as Determinant[]
  const selected = data[activeIndex]

  return (
    <div className="max-width content-padding mx-auto my-12">
      <h2 className="font-serif text-2xl mb-8 text-center">
        What Determines Our Health?
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Chart + Legend */}
        <div>
          <DonutChart
            data={data}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {data.map((d, i) => (
              <button
                key={d.id}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all text-sm',
                  activeIndex === i
                    ? 'border-gray-dark shadow-sm'
                    : 'border-transparent hover:border-gray-light'
                )}
              >
                <span
                  className="w-4 h-4 rounded-sm inline-block flex-shrink-0"
                  style={{ backgroundColor: colors[i] }}
                />
                <span className="hidden sm:inline">{icons[i]}</span>
                <span className="font-medium">{d.percentage}%</span>
                <span className="hidden md:inline text-gray">
                  {d.shortTitle}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div
          className="p-6 rounded-lg"
          style={{ backgroundColor: `${colors[activeIndex]}40` }}
        >
          <h3 className="font-serif text-xl mb-2">
            {icons[activeIndex]} {selected.title}
            <span className="text-gray ml-2">({selected.percentage}%)</span>
          </h3>
          <p className="leading-relaxed mb-6 text-sm">{selected.description}</p>

          {selected.divisions && selected.divisions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selected.divisions.map((div) => (
                <div key={div.title}>
                  <h4 className="font-semibold text-sm mb-1">{div.title}</h4>
                  {div.factors && div.factors.length > 0 && (
                    <ul className="list-disc list-outside pl-4 text-xs text-gray-dark space-y-0.5">
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
    </div>
  )
}
