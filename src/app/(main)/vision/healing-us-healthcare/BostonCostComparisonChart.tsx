'use client'

/**
 * Boston Pneumonia Treatment Cost Comparison
 *
 * Replicates the D3 chart from the legacy Gatsby page (CloudFront archives):
 * a Boston-area map with each major hospital as a circle, sized proportionally
 * to its pneumonia treatment cost.
 *
 * Data source: boston-hospitals.csv extracted from Wayback Machine snapshot
 * (originally /features/us-healthcare/data/boston_hospitals.csv).
 *
 * Range: $9,736 (St Elizabeth's) to $31,168 (Mass General)
 *
 * Implementation uses inline SVG with hand-rolled equirectangular projection
 * (no D3 dependency) since the data set is small and fixed.
 */

import { useState, useMemo } from 'react'

interface Hospital {
  name: string
  price_visit: number
  price_imaging: number
  price_pneumonia: number
  lat: number
  lon: number
}

const HOSPITALS: Hospital[] = [
  { name: 'Massachusetts General Hospital', price_visit: 198, price_imaging: 3900, price_pneumonia: 31168, lat: 42.3628, lon: -71.0686 },
  { name: 'Tufts Medical Center', price_visit: 304, price_imaging: 1375, price_pneumonia: 14007, lat: 42.3495, lon: -71.0633 },
  { name: 'Boston Medical Center', price_visit: 153, price_imaging: 2652, price_pneumonia: 12238, lat: 42.3349, lon: -71.0735 },
  { name: 'Beth Israel Deaconess Medical Center', price_visit: 148, price_imaging: 2315, price_pneumonia: 14440, lat: 42.3366, lon: -71.1094 },
  { name: "Brigham and Women's Hospital", price_visit: 206, price_imaging: 3867, price_pneumonia: 29926, lat: 42.3359, lon: -71.1037 },
  { name: 'Cambridge Health Alliance', price_visit: 121, price_imaging: 2236, price_pneumonia: 13956, lat: 42.3748, lon: -71.1048 },
  { name: "St Elizabeth's Medical Center", price_visit: 161, price_imaging: 1193, price_pneumonia: 9736, lat: 42.3491, lon: -71.1486 },
  { name: 'Faulkner Hospital', price_visit: 144, price_imaging: 3443, price_pneumonia: 19732, lat: 42.3008, lon: -71.1282 },
  { name: 'Carney Hospital', price_visit: 207, price_imaging: 1348, price_pneumonia: 12014, lat: 42.2774, lon: -71.0653 },
]

const fmt$ = (n: number) => `$${n.toLocaleString('en-US')}`

export function BostonCostComparisonChart() {
  const [hovered, setHovered] = useState<string | null>(null)

  // Compute bounds with a margin
  const { minLat, maxLat, minLon, maxLon } = useMemo(() => {
    const lats = HOSPITALS.map((h) => h.lat)
    const lons = HOSPITALS.map((h) => h.lon)
    return {
      minLat: Math.min(...lats) - 0.015,
      maxLat: Math.max(...lats) + 0.015,
      minLon: Math.min(...lons) - 0.015,
      maxLon: Math.max(...lons) + 0.015,
    }
  }, [])

  const width = 800
  const height = 600

  // Equirectangular-ish projection: latitude → y, longitude → x
  // Account for cosine of mean latitude so distances aren't distorted
  const meanLat = (minLat + maxLat) / 2
  const lonScale = Math.cos((meanLat * Math.PI) / 180)
  const lonRange = (maxLon - minLon) * lonScale
  const latRange = maxLat - minLat
  const dataAspect = lonRange / latRange
  const viewAspect = width / height
  // Fit dataset inside viewport preserving aspect
  let scale: number
  if (dataAspect > viewAspect) {
    scale = width / lonRange
  } else {
    scale = height / latRange
  }
  // Padding so circles aren't clipped at edges
  scale *= 0.85

  const project = (lat: number, lon: number): [number, number] => {
    const x = (lon - minLon) * lonScale * scale
    const y = (maxLat - lat) * scale
    const offsetX = (width - lonRange * scale) / 2
    const offsetY = (height - latRange * scale) / 2
    return [x + offsetX, y + offsetY]
  }

  // Circle radius scaled by pneumonia cost
  const minCost = Math.min(...HOSPITALS.map((h) => h.price_pneumonia))
  const maxCost = Math.max(...HOSPITALS.map((h) => h.price_pneumonia))
  const radiusFor = (cost: number) => {
    const norm = (cost - minCost) / (maxCost - minCost)
    return 18 + norm * 60 // 18px to 78px
  }

  const hoveredHospital = hovered ? HOSPITALS.find((h) => h.name === hovered) : null

  return (
    <div className="my-8">
      <div className="relative w-full max-w-4xl mx-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label="Boston-area hospitals showing pneumonia treatment cost variation"
        >
          {/* Background rectangle for the Boston area */}
          <rect x="0" y="0" width={width} height={height} fill="#f5f5f5" />

          {/* Subtle grid lines (latitude/longitude) */}
          {[42.30, 42.32, 42.34, 42.36, 42.38].map((lat) => {
            const [, y] = project(lat, minLon)
            return <line key={`lat-${lat}`} x1="0" y1={y} x2={width} y2={y} stroke="#e0e0e0" strokeWidth="1" />
          })}

          {/* Hospital circles */}
          {HOSPITALS.map((h) => {
            const [cx, cy] = project(h.lat, h.lon)
            const r = radiusFor(h.price_pneumonia)
            const isHovered = hovered === h.name
            return (
              <g key={h.name}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={isHovered ? '#8589BA' : 'rgba(154, 154, 154, 0.65)'}
                  stroke={isHovered ? '#5a5e8e' : 'none'}
                  strokeWidth="2"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHovered(h.name)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            )
          })}

          {/* Always-visible labels for the largest 2 (Mass General, Brigham) */}
          {HOSPITALS.filter((h) => h.price_pneumonia > 25000).map((h) => {
            const [cx, cy] = project(h.lat, h.lon)
            const r = radiusFor(h.price_pneumonia)
            return (
              <text
                key={`label-${h.name}`}
                x={cx}
                y={cy + r + 16}
                textAnchor="middle"
                fontSize="13"
                fill="#444"
                fontWeight="600"
              >
                {fmt$(h.price_pneumonia)}
              </text>
            )
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredHospital && (
          <div className="absolute top-2 right-2 bg-white border border-gray-300 rounded shadow-lg p-3 text-xs max-w-[260px]">
            <p className="font-semibold mb-2">{hoveredHospital.name}</p>
            <p className="text-base text-primary font-semibold m-0">{fmt$(hoveredHospital.price_visit)}</p>
            <p className="text-gray text-xs m-0 mb-1">Clinic Visit</p>
            <p className="text-base text-primary font-semibold m-0">{fmt$(hoveredHospital.price_imaging)}</p>
            <p className="text-gray text-xs m-0 mb-1">MRI Without Contrast</p>
            <p className="text-base text-primary font-semibold m-0">{fmt$(hoveredHospital.price_pneumonia)}</p>
            <p className="text-gray text-xs m-0">Pneumonia Treatment</p>
          </div>
        )}
      </div>

      {/* Hospital list (accessibility / no-hover devices) */}
      <details className="mt-4">
        <summary className="text-sm text-gray cursor-pointer">View all 9 hospitals</summary>
        <table className="w-full mt-3 text-sm">
          <thead>
            <tr className="text-gray text-xs">
              <th className="text-left p-2">Hospital</th>
              <th className="text-right p-2">Clinic Visit</th>
              <th className="text-right p-2">MRI w/o Contrast</th>
              <th className="text-right p-2">Pneumonia Treatment</th>
            </tr>
          </thead>
          <tbody>
            {HOSPITALS.slice()
              .sort((a, b) => b.price_pneumonia - a.price_pneumonia)
              .map((h) => (
                <tr key={h.name} className="border-t border-gray-200">
                  <td className="p-2">{h.name}</td>
                  <td className="p-2 text-right">{fmt$(h.price_visit)}</td>
                  <td className="p-2 text-right">{fmt$(h.price_imaging)}</td>
                  <td className="p-2 text-right font-semibold">{fmt$(h.price_pneumonia)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
