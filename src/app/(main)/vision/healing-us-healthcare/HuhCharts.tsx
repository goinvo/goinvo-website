'use client'

/**
 * Healing US Healthcare — restored interactive charts.
 *
 * Replaces 4 D3.js chart placeholders in the static page:
 *   1. <SpendingOverTimeChart>  — multi-line chart, $/capita over time by country
 *   2. <GdpVsCapitaChart>       — scatter, % GDP vs $/capita, circle size = pop
 *   3. <QualityVsCapitaChart>   — scatter, $/capita vs quality rank, circle size = pop
 *   4. <HealthcareWasteChart>   — bar chart with 3 toggles (Wasted/Nonrecommended/Total)
 *
 * Data sources (real, not fabricated): public/data/healing-us-healthcare/
 *   - data_capita.csv     — 55 years × 43 countries (CR-only line endings)
 *   - gdpvcapita.csv      — 39 countries
 *   - qualityvcapita.csv  — 11 countries (Commonwealth Fund 2014 ranking)
 *   - data-waste.csv      — 10 procedures
 *
 * No D3 dependency — hand-rolled SVG with shared scale helpers.
 */

import { useEffect, useMemo, useRef, useState } from 'react'

/* ─────────── Shared helpers ─────────── */

function parseCSV(text: string): Record<string, string>[] {
  // Handle CR-only (Mac classic), CRLF, and LF line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  const lines = normalized.split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

function useCSV(url: string): Record<string, string>[] | null {
  const [data, setData] = useState<Record<string, string>[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setData(parseCSV(text))
      })
      .catch(() => {
        if (!cancelled) setData([])
      })
    return () => {
      cancelled = true
    }
  }, [url])
  return data
}

const fmt$ = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const fmtN = (n: number) => Math.round(n).toLocaleString('en-US')

/* ─────────── 1. SPENDING OVER TIME ─────────── */

/**
 * Multi-line chart of healthcare spending per capita over time, by country.
 * One line per country (43 total). Hovering a line highlights it and shows
 * the country name + label; other lines fade.
 *
 * Default highlight: United States.
 */
export function SpendingOverTimeChart() {
  const data = useCSV('/data/healing-us-healthcare/data_capita.csv')
  const [hovered, setHovered] = useState<string | null>('United States')

  const chart = useMemo(() => {
    if (!data || data.length === 0) return null

    // Extract country list (all columns except 'date')
    const headers = Object.keys(data[0])
    const countries = headers.filter((h) => h !== 'date')

    // Build lines: { country, points: [{ year, capita }] }
    const lines = countries.map((country) => ({
      country,
      points: data
        .map((row) => ({ year: parseInt(row.date), capita: parseFloat(row[country]) }))
        .filter((p) => !isNaN(p.year) && !isNaN(p.capita)),
    })).filter((l) => l.points.length > 0)

    const allYears = data.map((r) => parseInt(r.date)).filter((y) => !isNaN(y))
    const minYear = Math.min(...allYears)
    const maxYear = Math.max(...allYears)
    const allCapitas = lines.flatMap((l) => l.points.map((p) => p.capita))
    const maxCapita = Math.max(...allCapitas)

    return { lines, minYear, maxYear, maxCapita }
  }, [data])

  if (!data) return <ChartLoading />
  if (!chart || chart.lines.length === 0) return <ChartError name="spending" />

  const W = 900
  const H = 500
  const M = { top: 25, right: 20, bottom: 50, left: 60 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  const xScale = (year: number) => ((year - chart.minYear) / (chart.maxYear - chart.minYear)) * innerW
  const yScale = (capita: number) => innerH - (capita / chart.maxCapita) * innerH

  // Y-axis ticks (round to thousands)
  const yTickCount = 6
  const yTickStep = Math.ceil(chart.maxCapita / yTickCount / 1000) * 1000
  const yTicks: number[] = []
  for (let v = 0; v <= chart.maxCapita; v += yTickStep) yTicks.push(v)

  // X-axis ticks (every 10 years)
  const xTicks: number[] = []
  for (let y = Math.ceil(chart.minYear / 10) * 10; y <= chart.maxYear; y += 10) xTicks.push(y)

  // Build path string for a country line
  const pathFor = (points: { year: number; capita: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.year).toFixed(1)},${yScale(p.capita).toFixed(1)}`).join(' ')

  const hoveredLine = chart.lines.find((l) => l.country === hovered)

  return (
    <div className="my-6 w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Health spending per capita over time by country">
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Y gridlines + labels */}
          {yTicks.map((v) => {
            const y = yScale(v)
            return (
              <g key={v}>
                <line x1="0" x2={innerW} y1={y} y2={y} stroke="#eee" strokeWidth="1" />
                <text x="-8" y={y + 4} textAnchor="end" fontSize="11" fill="#666">{fmt$(v)}</text>
              </g>
            )
          })}
          {/* X axis line + ticks */}
          <line x1="0" x2={innerW} y1={innerH} y2={innerH} stroke="#999" strokeWidth="1" />
          {xTicks.map((y) => (
            <g key={y}>
              <line x1={xScale(y)} x2={xScale(y)} y1={innerH} y2={innerH + 4} stroke="#999" />
              <text x={xScale(y)} y={innerH + 18} textAnchor="middle" fontSize="11" fill="#666">{y}</text>
            </g>
          ))}

          {/* Country lines */}
          {chart.lines.map((line) => {
            const isHovered = hovered === line.country
            const isOther = hovered && !isHovered
            return (
              <path
                key={line.country}
                d={pathFor(line.points)}
                fill="none"
                stroke={isHovered ? '#5a5e8e' : '#9a9a9a'}
                strokeWidth={isHovered ? 3 : 1}
                strokeOpacity={isOther ? 0.2 : 1}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHovered(line.country)}
              />
            )
          })}

          {/* Highlighted country label at end of line */}
          {hoveredLine && hoveredLine.points.length > 0 && (() => {
            const last = hoveredLine.points[hoveredLine.points.length - 1]
            return (
              <text
                x={xScale(last.year) - 4}
                y={yScale(last.capita) - 8}
                textAnchor="end"
                fontSize="13"
                fontWeight="600"
                fill="#5a5e8e"
              >
                {hoveredLine.country} — {fmt$(last.capita)} ({last.year})
              </text>
            )
          })()}

          {/* Y axis label */}
          <text transform={`rotate(-90)`} x={-innerH / 2} y="-45" textAnchor="middle" fontSize="12" fill="#444">Dollars per Capita</text>
          {/* X axis label */}
          <text x={innerW / 2} y={innerH + 40} textAnchor="middle" fontSize="12" fill="#444">Year</text>
        </g>
      </svg>
      <p className="text-xs text-gray text-center mt-2">Hover any line to highlight a country. Default: {hovered || 'none'}</p>
    </div>
  )
}

/* ─────────── 2. GDP VS CAPITA SCATTER ─────────── */

/**
 * Scatter plot: % GDP (x) vs $/capita (y), with circle size proportional to population.
 * Default highlight: United States.
 */
export function GdpVsCapitaChart() {
  const data = useCSV('/data/healing-us-healthcare/gdpvcapita.csv')
  return <ScatterChart
    data={data}
    xKey="gdp"
    yKey="capita"
    xLabel="% GDP"
    yLabel="Dollars per Capita"
    xFormat={(v) => `${v.toFixed(1)}%`}
    yFormat={fmt$}
    defaultHighlight="United States"
    chartId="gdp-vs-capita"
    tooltipExtra={(row) => (
      <>
        <p className="text-base text-primary font-semibold m-0">{`${parseFloat(row.gdp).toFixed(1)}%`}</p>
        <p className="text-gray text-xs m-0">of GDP</p>
      </>
    )}
  />
}

/* ─────────── 3. QUALITY VS CAPITA SCATTER ─────────── */

/**
 * Scatter plot: $/capita (x) vs quality_ranking (y, INVERTED — 1 is best).
 * Default highlight: United States.
 */
export function QualityVsCapitaChart() {
  const data = useCSV('/data/healing-us-healthcare/qualityvcapita.csv')
  return <ScatterChart
    data={data}
    xKey="capita"
    yKey="quality_ranking"
    xLabel="Dollars per Capita"
    yLabel="Overall Quality Ranking (1 = best)"
    xFormat={fmt$}
    yFormat={(v) => `#${Math.round(v)}`}
    defaultHighlight="United States"
    chartId="quality-vs-capita"
    yInvert
    yIntegerTicks
    tooltipExtra={(row) => (
      <>
        <p className="text-base text-primary font-semibold m-0">
          {row.quality_ranking}<sup>{ordinalSuffix(parseInt(row.quality_ranking))}</sup>
        </p>
        <p className="text-gray text-xs m-0">quality rank</p>
      </>
    )}
  />
}

function ordinalSuffix(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/* Generic scatter plot with population-sized circles, used by GDP and Quality charts */

interface ScatterProps {
  data: Record<string, string>[] | null
  xKey: string
  yKey: string
  xLabel: string
  yLabel: string
  xFormat: (v: number) => string
  yFormat: (v: number) => string
  defaultHighlight: string
  chartId: string
  yInvert?: boolean
  /** Force ticks to be integers (for quality ranking 1-11) */
  yIntegerTicks?: boolean
  tooltipExtra: (row: Record<string, string>) => React.ReactNode
}

function ScatterChart({ data, xKey, yKey, xLabel, yLabel, xFormat, yFormat, defaultHighlight, chartId, yInvert, yIntegerTicks, tooltipExtra }: ScatterProps) {
  const [hovered, setHovered] = useState<string | null>(defaultHighlight)

  if (!data) return <ChartLoading />
  if (data.length === 0) return <ChartError name={chartId} />

  const xs = data.map((d) => parseFloat(d[xKey])).filter((v) => !isNaN(v))
  const ys = data.map((d) => parseFloat(d[yKey])).filter((v) => !isNaN(v))
  const pops = data.map((d) => parseFloat(d.population)).filter((v) => !isNaN(v))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const minPop = Math.min(...pops)
  const maxPop = Math.max(...pops)

  const W = 900
  const H = 500
  const M = { top: 25, right: 30, bottom: 60, left: 70 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  // Pad domain by 5% on each side
  const xPad = (maxX - minX) * 0.05
  const yPad = (maxY - minY) * 0.05
  const xRange = [minX - xPad, maxX + xPad]
  const yRange = [minY - yPad, maxY + yPad]

  const xScale = (v: number) => ((v - xRange[0]) / (xRange[1] - xRange[0])) * innerW
  const yScale = (v: number) => {
    const norm = (v - yRange[0]) / (yRange[1] - yRange[0])
    return yInvert ? norm * innerH : innerH - norm * innerH
  }
  const rScale = (pop: number) => 4 + ((pop - minPop) / (maxPop - minPop)) * 22

  const xTickCount = 6
  const yTickCount = 6
  const xTicks: number[] = []
  for (let i = 0; i <= xTickCount; i++) xTicks.push(xRange[0] + (i / xTickCount) * (xRange[1] - xRange[0]))
  const yTicks: number[] = []
  if (yIntegerTicks) {
    // Force integer ticks within the data range (e.g. quality ranking 1-11)
    const lo = Math.ceil(Math.min(...ys))
    const hi = Math.floor(Math.max(...ys))
    for (let v = lo; v <= hi; v++) yTicks.push(v)
  } else {
    for (let i = 0; i <= yTickCount; i++) yTicks.push(yRange[0] + (i / yTickCount) * (yRange[1] - yRange[0]))
  }

  const hoveredRow = hovered ? data.find((d) => d.name === hovered) : null

  return (
    <div className="my-6 w-full relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${xLabel} vs ${yLabel}`}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* gridlines */}
          {xTicks.map((v, i) => (
            <line key={`xg-${i}`} x1={xScale(v)} x2={xScale(v)} y1="0" y2={innerH} stroke="#eee" />
          ))}
          {yTicks.map((v, i) => (
            <line key={`yg-${i}`} x1="0" x2={innerW} y1={yScale(v)} y2={yScale(v)} stroke="#eee" />
          ))}

          {/* axis labels (ticks) */}
          {xTicks.map((v, i) => (
            <text key={`xt-${i}`} x={xScale(v)} y={innerH + 18} textAnchor="middle" fontSize="11" fill="#666">{xFormat(v)}</text>
          ))}
          {yTicks.map((v, i) => (
            <text key={`yt-${i}`} x="-8" y={yScale(v) + 4} textAnchor="end" fontSize="11" fill="#666">{yFormat(v)}</text>
          ))}

          {/* axis lines */}
          <line x1="0" x2={innerW} y1={innerH} y2={innerH} stroke="#999" />
          <line x1="0" x2="0" y1="0" y2={innerH} stroke="#999" />

          {/* data points */}
          {data.map((row) => {
            const x = parseFloat(row[xKey])
            const y = parseFloat(row[yKey])
            const pop = parseFloat(row.population)
            if (isNaN(x) || isNaN(y) || isNaN(pop)) return null
            const isHovered = hovered === row.name
            return (
              <g key={row.name}>
                <circle
                  cx={xScale(x)}
                  cy={yScale(y)}
                  r={rScale(pop)}
                  fill={isHovered ? '#8589BA' : 'rgba(154, 154, 154, 0.6)'}
                  stroke={isHovered ? '#5a5e8e' : 'none'}
                  strokeWidth="2"
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHovered(row.name)}
                />
                {isHovered && (
                  <text
                    x={xScale(x)}
                    y={yScale(y) - rScale(pop) - 6}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill="#5a5e8e"
                  >
                    {row.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* axis labels */}
          <text transform="rotate(-90)" x={-innerH / 2} y="-50" textAnchor="middle" fontSize="12" fill="#444">{yLabel}</text>
          <text x={innerW / 2} y={innerH + 45} textAnchor="middle" fontSize="12" fill="#444">{xLabel}</text>
        </g>
      </svg>

      {/* Tooltip card */}
      {hoveredRow && (
        <div className="absolute top-2 right-2 bg-white border border-gray-300 rounded shadow-lg p-3 text-xs max-w-[240px]">
          <p className="font-semibold mb-2">{hoveredRow.name}</p>
          <p className="text-base text-primary font-semibold m-0">{fmt$(parseFloat(hoveredRow.capita))}</p>
          <p className="text-gray text-xs m-0 mb-1">per capita</p>
          {tooltipExtra(hoveredRow)}
          <p className="text-base text-primary font-semibold m-0 mt-1">{fmtN(parseFloat(hoveredRow.population))}</p>
          <p className="text-gray text-xs m-0">population</p>
        </div>
      )}
    </div>
  )
}

/* ─────────── 4. HEALTHCARE WASTE BAR CHART ─────────── */

/**
 * Bar chart with log-scale y-axis showing wasted dollars / nonrecommended
 * count / total procedures per healthcare procedure. Three toggles control
 * which metric is displayed.
 *
 * The static page already provides 3 radio buttons (#dollarsWasted,
 * #unnecessaryProcedures, #totalProcedures). This component subscribes to
 * their change events.
 */
export function HealthcareWasteChart() {
  const data = useCSV('/data/healing-us-healthcare/data-waste.csv')
  const [metric, setMetric] = useState<'Waste' | 'Unnecessary' | 'NumberProcedures'>('Waste')
  const [hovered, setHovered] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Subscribe to the static page's existing radio toggles
  useEffect(() => {
    const handlers: { el: HTMLInputElement; fn: () => void }[] = []
    const wire = (id: string, value: 'Waste' | 'Unnecessary' | 'NumberProcedures') => {
      const el = document.getElementById(id) as HTMLInputElement | null
      if (!el) return
      const fn = () => { if (el.checked) setMetric(value) }
      el.addEventListener('change', fn)
      handlers.push({ el, fn })
    }
    wire('dollarsWasted', 'Waste')
    wire('unnecessaryProcedures', 'Unnecessary')
    wire('totalProcedures', 'NumberProcedures')
    // Default highlight after data loads
    if (data && data.length > 0) {
      setTimeout(() => setHovered('Brand-Name Statins'), 800)
    }
    return () => handlers.forEach(({ el, fn }) => el.removeEventListener('change', fn))
  }, [data])

  if (!data) return <ChartLoading />
  if (data.length === 0) return <ChartError name="waste" />

  const W = 900
  const H = 500
  const M = { top: 30, right: 20, bottom: 90, left: 70 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  const values = data.map((d) => parseFloat(d[metric]))
  const maxValue = Math.max(...values)

  // Log scale on y axis
  const logMax = Math.log10(maxValue)
  const yScale = (v: number) => {
    if (v <= 1) return innerH
    return innerH - (Math.log10(v) / logMax) * innerH
  }

  // Bar layout
  const barCount = data.length
  const barPad = 0.2
  const bandWidth = innerW / barCount
  const barWidth = bandWidth * (1 - barPad)

  // Log axis ticks: 1, 10, 100, 1k, 10k, 100k, 1M, 10M, 100M, 1B
  const allTicks = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9]
  const yTicks = allTicks.filter((t) => t <= maxValue * 1.5)

  const fmtTick = (v: number) => {
    if (v >= 1e9) return `${v / 1e9}B`
    if (v >= 1e6) return `${v / 1e6}M`
    if (v >= 1e3) return `${v / 1e3}k`
    return `${v}`
  }

  const fmtMetric = (v: number) => (metric === 'Waste' ? fmt$(Math.round(v)) : fmtN(Math.round(v)))

  // Wrap long procedure names onto two lines
  const wrap = (text: string): string[] => {
    const words = text.split(' ')
    const half = Math.ceil(words.length / 2)
    if (words.length <= 2) return [text]
    return [words.slice(0, half).join(' '), words.slice(half).join(' ')]
  }

  return (
    <div className="my-6 w-full relative" ref={containerRef}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Healthcare waste by procedure (${metric})`}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Y gridlines + labels */}
          {yTicks.map((v) => {
            const y = yScale(v)
            return (
              <g key={v}>
                <line x1="0" x2={innerW} y1={y} y2={y} stroke="#eee" strokeWidth="1" />
                <text x="-8" y={y + 4} textAnchor="end" fontSize="11" fill="#666">{fmtTick(v)}</text>
              </g>
            )
          })}
          <line x1="0" x2={innerW} y1={innerH} y2={innerH} stroke="#999" />

          {/* Bars */}
          {data.map((row, i) => {
            const v = parseFloat(row[metric])
            const x = i * bandWidth + (bandWidth * barPad) / 2
            const y = yScale(v)
            const isHovered = hovered === row.Procedure
            return (
              <g key={row.Procedure}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={innerH - y}
                  fill={isHovered ? '#8589BA' : '#9a9a9a'}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHovered(row.Procedure)}
                />
                {/* Procedure label */}
                {(() => {
                  const lines = wrap(row.Procedure)
                  return lines.map((line, j) => (
                    <text
                      key={j}
                      x={x + barWidth / 2}
                      y={innerH + 14 + j * 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#666"
                    >
                      {line}
                    </text>
                  ))
                })()}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hovered && (() => {
        const row = data.find((d) => d.Procedure === hovered)
        if (!row) return null
        const pct = (parseInt(row.Unnecessary) / parseInt(row.NumberProcedures)) * 100
        return (
          <div className="absolute top-2 right-2 bg-white border border-gray-300 rounded shadow-lg p-3 text-xs max-w-[240px]">
            <p className="font-semibold mb-2">{row.Procedure}</p>
            <p className="text-base text-primary font-semibold m-0">{pct.toFixed(0)}%</p>
            <p className="text-gray text-xs m-0 mb-1">Nonrecommended</p>
            <p className="text-base text-primary font-semibold m-0">{fmt$(parseInt(row.Waste))}</p>
            <p className="text-gray text-xs m-0">Wasted</p>
          </div>
        )
      })()}
    </div>
  )
}

/* ─────────── Loading / error states ─────────── */

function ChartLoading() {
  return <div className="my-8 p-8 bg-gray-100 rounded text-center text-sm text-gray italic">Loading chart…</div>
}

function ChartError({ name }: { name: string }) {
  return <div className="my-8 p-8 bg-red-50 border border-red-200 rounded text-center text-sm text-red-700">Failed to load chart data: {name}</div>
}
