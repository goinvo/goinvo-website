'use client'

/**
 * Boston Pneumonia Treatment Cost Comparison
 *
 * Replicates the D3 chart from the legacy Gatsby page: a Boston-area map
 * with each major hospital drawn as a circle sized by its pneumonia
 * treatment cost. Hovering a circle shows a tooltip with the three prices.
 *
 * Uses d3-geo's Albers projection with the same parameters as the legacy
 * script (rotate [71.057, 0], center [0, 42.313]) and renders each
 * neighborhood polygon from boston-neighborhoods.json, then places the
 * 9 hospitals by their (lat, lon) through the same projection.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { geoAlbers, geoPath, type GeoProjection } from 'd3-geo'

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

type GeoJSONFeature = { type: 'Feature'; geometry: GeoJSON.Geometry; properties: Record<string, unknown> }
type GeoJSONFC = { type: 'FeatureCollection'; features: GeoJSONFeature[] }

export function BostonCostComparisonChart() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [geoData, setGeoData] = useState<GeoJSONFC | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load Boston neighborhoods GeoJSON
  useEffect(() => {
    let cancelled = false
    fetch('/data/healing-us-healthcare/neighborhoods.json')
      .then((r) => r.json())
      .then((data: GeoJSONFC) => {
        if (!cancelled) setGeoData(data)
      })
      .catch(() => {
        if (!cancelled) setGeoData({ type: 'FeatureCollection', features: [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const width = 1000
  const height = 650

  // Albers projection matching the legacy script:
  //   d3.geo.albers().scale(215*i).rotate([71.057,0]).center([0,42.313]).translate([i/2,o/2])
  const projection: GeoProjection = useMemo(() => {
    return geoAlbers()
      .rotate([71.057, 0])
      .center([0, 42.313])
      .scale(215 * width)
      .translate([width / 2, height / 2])
  }, [width, height])

  const pathGen = useMemo(() => geoPath(projection), [projection])

  // Circle radius scaled by pneumonia cost (tuned to match Gatsby's visual weight)
  const minCost = Math.min(...HOSPITALS.map((h) => h.price_pneumonia))
  const maxCost = Math.max(...HOSPITALS.map((h) => h.price_pneumonia))
  const radiusFor = (cost: number) => {
    const norm = (cost - minCost) / (maxCost - minCost)
    return 18 + norm * 60
  }

  const hoveredHospital = hovered ? HOSPITALS.find((h) => h.name === hovered) : null

  return (
    <div className="my-8" ref={containerRef}>
      <div className="relative w-full max-w-5xl mx-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Boston-area hospitals showing pneumonia treatment cost variation"
        >
          {/* Neighborhood polygons */}
          {geoData &&
            geoData.features.map((feature, i) => {
              const d = pathGen(feature)
              if (!d) return null
              return (
                <path
                  key={i}
                  d={d}
                  fill="#dedede"
                  stroke="#ffffff"
                  strokeWidth="0.75"
                />
              )
            })}

          {/* Hospital circles */}
          {HOSPITALS.map((h) => {
            const projected = projection([h.lon, h.lat])
            if (!projected) return null
            const [cx, cy] = projected
            const r = radiusFor(h.price_pneumonia)
            const isHovered = hovered === h.name
            return (
              <g key={h.name}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={isHovered ? 'rgba(133, 137, 186, 0.9)' : 'rgba(154, 154, 154, 0.65)'}
                  stroke={isHovered ? '#5a5e8e' : 'none'}
                  strokeWidth="2"
                  className="cursor-pointer transition-[fill,stroke] duration-200"
                  onMouseEnter={(e) => {
                    setHovered(h.name)
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left + 12,
                        y: e.clientY - rect.top + 12,
                      })
                    }
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left + 12,
                        y: e.clientY - rect.top + 12,
                      })
                    }
                  }}
                  onMouseLeave={() => {
                    setHovered(null)
                    setTooltipPos(null)
                  }}
                />
              </g>
            )
          })}
        </svg>

        {/* Hover tooltip — positioned near cursor */}
        {hoveredHospital && tooltipPos && (
          <div
            className="absolute bg-white border border-gray-300 rounded shadow-lg p-3 text-xs max-w-[260px] pointer-events-none z-10"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
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
