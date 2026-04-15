'use client'

import { useState } from 'react'
import determinants from '@/data/vision/determinants-of-health/chart-data.json'
import { DeterminantDetails } from './DeterminantDetails'
import { DeterminantsChart } from './DeterminantsChart'

export function DeterminantsExplorer() {
  const [selectedDeterminantIndex, setSelectedDeterminantIndex] = useState(0)

  return (
    <>
      <div id="determinants-chart">
        <DeterminantsChart
          selectedIndex={selectedDeterminantIndex}
          onSelect={setSelectedDeterminantIndex}
        />
      </div>
      <div className="chart-details">
        <DeterminantDetails
          determinant={determinants[selectedDeterminantIndex]}
        />
      </div>
    </>
  )
}
