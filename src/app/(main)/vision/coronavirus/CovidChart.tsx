'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

const data = [
  {
    id: 'sars',
    title: 'SARS',
    date: 'Nov 2002 - July 2003',
    cases: 8098,
    deaths: 774,
  },
  {
    id: 'mers',
    title: 'MERS',
    date: 'Sep 2012 - 2015',
    cases: 2494,
    deaths: 858,
  },
  {
    id: 'covid-19',
    title: 'COVID-19',
    date: 'Dec 2019 - 2024',
    cases: 704753890,
    deaths: 7010681,
  },
]

const xAxisRows = [
  { key: 'cases' as const, title: 'Confirmed cases' },
  { key: 'deaths' as const, title: 'Deaths' },
  { key: null, title: 'Death rate' },
]

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function formatCompact(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`
  if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M`
  if (n >= 10000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

function barColor(id: string, valueKey: 'cases' | 'deaths'): string {
  if (id === 'covid-19') {
    return valueKey === 'cases' ? '#D6D2EA' : '#563C8D'
  }
  return valueKey === 'cases' ? '#E2E2E2' : '#747070'
}

export function CovidChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)

  const fitContainer = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.getBoundingClientRect().width
      setContainerWidth(w)
    }
  }, [])

  useEffect(() => {
    fitContainer()
    window.addEventListener('resize', fitContainer)
    return () => window.removeEventListener('resize', fitContainer)
  }, [fitContainer])

  if (containerWidth === null) {
    return <div ref={containerRef} className="w-full" />
  }

  const isMobile = containerWidth < 500

  // Margins
  const margins = {
    top: isMobile ? 45 : 75,
    right: 20,
    bottom: 200,
    left: isMobile ? 80 : 140,
  }

  const width = containerWidth
  const height = isMobile ? 500 : 700

  const chartWidth = width - margins.left - margins.right
  const chartHeight = height - margins.top - margins.bottom

  // Compute scales
  const maxValue = Math.max(...data.map((d) => d.cases))
  // Round up to a clean order-of-magnitude tick boundary
  const orderOfMag = Math.pow(10, Math.floor(Math.log10(maxValue)))
  const yDomainMax = Math.ceil(maxValue / orderOfMag) * orderOfMag

  // Band scale: distribute disease groups across horizontal space
  const bandPadOuter = 0.25
  const bandPadInner = 0.5
  const totalBands = data.length
  const rangeWidth = chartWidth
  // Compute band positions manually (mimics d3 scaleBand)
  const step =
    rangeWidth / (totalBands + (totalBands - 1) * bandPadInner + 2 * bandPadOuter)
  const bandwidth = step * (1 - bandPadInner)

  function xScale(index: number): number {
    return margins.left + bandPadOuter * step + index * step * (1 + bandPadInner)
  }

  function yScale(value: number): number {
    return margins.top + chartHeight * (1 - value / yDomainMax)
  }

  // Y axis ticks
  const tickCount = 8
  const yTicks: number[] = []
  // Snap tick step to a "nice" round number based on order of magnitude
  const rawStep = yDomainMax / tickCount
  const stepMag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const tickStep = Math.ceil(rawStep / stepMag) * stepMag
  for (let v = 0; v <= yDomainMax; v += tickStep) {
    yTicks.push(v)
  }

  const rowHeight = 50
  const tableY = height - margins.bottom + 40

  return (
    <div ref={containerRef} className="max-width content-padding mx-auto my-8">
      <div className="w-full">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Bar chart comparing SARS, MERS, and COVID-19 confirmed cases and deaths"
          style={{ fontFamily: "'Open Sans', sans-serif" }}
        >
          {/* Y axis gridlines + labels */}
          {yTicks.map((val) => {
            const y = yScale(val)
            return (
              <g key={val}>
                <line
                  x1={margins.left}
                  x2={width - margins.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e2e2"
                  strokeWidth={1}
                />
                <text
                  x={margins.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="#747070"
                  fontSize={isMobile ? 12 : 14}
                >
                  {formatCompact(val)}
                </text>
              </g>
            )
          })}

          {/* Y axis line */}
          <line
            x1={margins.left}
            x2={margins.left}
            y1={margins.top}
            y2={margins.top + chartHeight}
            stroke="#e2e2e2"
            strokeWidth={1}
          />

          {/* Disease title labels above chart */}
          {data.map((d, i) => {
            const cx = xScale(i) + bandwidth / 2
            const isCovid = d.id === 'covid-19'
            return (
              <g key={d.id} textAnchor="middle">
                <text
                  x={cx}
                  y={30}
                  fill={isCovid ? '#563C8D' : '#424242'}
                  fontWeight={isCovid ? 600 : 400}
                  fontSize={isMobile ? 14 : 16}
                >
                  {d.title}
                </text>
                {!isMobile && (
                  <text
                    x={cx}
                    y={52}
                    fill={isCovid ? '#563C8D' : '#747070'}
                    fontSize={14}
                  >
                    {d.date}
                  </text>
                )}
              </g>
            )
          })}

          {/* Cases bars */}
          {data.map((d, i) => {
            const x = xScale(i)
            const barH = (d.cases / yDomainMax) * chartHeight
            const y = margins.top + chartHeight - barH
            return (
              <rect
                key={`cases-${d.id}`}
                x={x}
                y={y}
                width={bandwidth}
                height={barH}
                fill={barColor(d.id, 'cases')}
              />
            )
          })}

          {/* Deaths bars (drawn on top of cases bars, same x position) */}
          {data.map((d, i) => {
            const x = xScale(i)
            const barH = (d.deaths / yDomainMax) * chartHeight
            const y = margins.top + chartHeight - barH
            return (
              <rect
                key={`deaths-${d.id}`}
                x={x}
                y={y}
                width={bandwidth}
                height={barH}
                fill={barColor(d.id, 'deaths')}
              />
            )
          })}

          {/* Data table below chart */}
          {xAxisRows.map((row, ri) => {
            const gy = tableY + ri * rowHeight
            return (
              <g key={row.title} transform={`translate(0, ${gy})`}>
                {/* Row label */}
                {row.key === 'cases' && isMobile ? (
                  <g>
                    <text
                      x={margins.left - 12}
                      textAnchor="end"
                      dy="-0.2em"
                      fill="#424242"
                      fontSize={isMobile ? 12 : 14}
                    >
                      Confirmed
                    </text>
                    <text
                      x={margins.left - 12}
                      textAnchor="end"
                      dy="1em"
                      fill="#424242"
                      fontSize={isMobile ? 12 : 14}
                    >
                      cases
                    </text>
                  </g>
                ) : (
                  <text
                    x={margins.left - 12}
                    dy="0.4em"
                    textAnchor="end"
                    fill="#424242"
                    fontWeight={row.key === null ? 600 : 400}
                    fontSize={isMobile ? 12 : 14}
                  >
                    {row.title}
                  </text>
                )}

                {/* Colored cells + values */}
                {data.map((d, di) => {
                  const cellX = xScale(di) - bandwidth / 2
                  const cellW = bandwidth * 2
                  const cx = xScale(di) + bandwidth / 2

                  let cellFill = 'transparent'
                  let textFill = '#424242'

                  if (row.key === 'cases') {
                    cellFill = barColor(d.id, 'cases')
                  } else if (row.key === 'deaths') {
                    cellFill = barColor(d.id, 'deaths')
                    textFill = '#ffffff'
                  }

                  const displayValue =
                    row.key
                      ? formatNumber(d[row.key])
                      : ((d.deaths / d.cases) * 100).toFixed(1) + '%'

                  return (
                    <g key={d.id}>
                      <rect
                        x={cellX}
                        y={-(rowHeight / 2)}
                        width={cellW}
                        height={rowHeight}
                        fill={cellFill}
                      />
                      <text
                        x={cx}
                        dy="0.4em"
                        textAnchor="middle"
                        fill={textFill}
                        fontWeight={row.key === null ? 600 : 400}
                        fontSize={isMobile ? 12 : 14}
                      >
                        {displayValue}
                      </text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm inline-block" style={{ backgroundColor: '#D6D2EA' }} />
          <span className="text-gray">Confirmed Cases</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm inline-block" style={{ backgroundColor: '#563C8D' }} />
          <span className="text-gray">Deaths</span>
        </div>
      </div>

      {/* Source note */}
      <p className="text-sm text-gray text-center mt-4 italic">
        Data through 2024. Source: WHO COVID-19 Dashboard.
      </p>
    </div>
  )
}
