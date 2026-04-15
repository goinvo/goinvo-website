'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import determinants from '@/data/vision/determinants-of-health/chart-data.json'

const GoogleChart = dynamic(
  () => import('react-google-charts').then(mod => mod.Chart),
  { ssr: false }
)

const icons = [
  '/images/vision/determinants-of-health/individual-behavior.svg',
  '/images/vision/determinants-of-health/social-circumstances.svg',
  '/images/vision/determinants-of-health/genetics-biology.svg',
  '/images/vision/determinants-of-health/medical-care.svg',
  '/images/vision/determinants-of-health/environment.svg',
]

const baseOptions = {
  chartArea: { left: 0, top: '10%', width: '100%', height: '85%' },
  legend: 'none',
  pieHole: 0.25,
  pieSliceText: 'none',
  pieSliceTextStyle: { color: '#444', fontSize: 12 },
  fontName: 'Open Sans',
  fontColor: '#444',
  tooltip: { trigger: 'none' },
  colors: ['#F9D7A7', '#B2E5E9', '#E8ED9D', '#F8CBC5', '#90EED4'],
}

function getResponsiveChartOptions() {
  if (typeof window !== 'undefined' && window.innerWidth > 800) {
    return { legend: { position: 'labeled' }, pieSliceText: 'none' }
  }

  return { legend: { position: 'none' }, pieSliceText: 'percentage' }
}

export function DeterminantsChart({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  const chartRef = useRef<any>(null)
  const [chartOptions, setChartOptions] = useState(() => ({
    ...baseOptions,
    ...getResponsiveChartOptions(),
  }))

  const chartData = useMemo(
    () => [
      ['Determinant', 'Percentage'],
      ...determinants.map(determinant => [
        determinant.title,
        determinant.percentage,
      ]),
    ],
    []
  )

  useEffect(() => {
    const syncChartOptions = () => {
      setChartOptions({
        ...baseOptions,
        ...getResponsiveChartOptions(),
      })
    }

    syncChartOptions()
    window.addEventListener('resize', syncChartOptions)

    return () => window.removeEventListener('resize', syncChartOptions)
  }, [])

  useEffect(() => {
    const chart = chartRef.current?.getChart?.()
    if (!chart) return

    chart.setSelection([{ row: selectedIndex, column: null }])
  }, [selectedIndex, chartOptions])

  return (
    <div>
      <ul className="list--unstyled doh__chart-legend">
        {determinants.map((determinant, index) => (
          <li key={determinant.id}>
            <button
              type="button"
              className="button button--transparent doh__determinant-button"
              onClick={() => onSelect(index)}
            >
              <img src={icons[index]} alt={determinant.title} />
              <span className="doh__chart-legend__label text--gray text--sm">
                {determinant.shortTitle}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <GoogleChart
        chartType="PieChart"
        width="100%"
        height="300px"
        data={chartData}
        options={chartOptions}
        chartEvents={[
          {
            eventName: 'ready',
            callback: ({ chartWrapper }: { chartWrapper: any }) => {
              chartRef.current = chartWrapper
              chartWrapper
                ?.getChart?.()
                ?.setSelection([{ row: selectedIndex, column: null }])
            },
          },
          {
            eventName: 'select',
            callback: ({ chartWrapper }: { chartWrapper: any }) => {
              const selectedRow = chartWrapper
                ?.getChart?.()
                ?.getSelection?.()?.[0]?.row

              if (typeof selectedRow === 'number') {
                onSelect(selectedRow)
              }
            },
          },
        ]}
      />
    </div>
  )
}
