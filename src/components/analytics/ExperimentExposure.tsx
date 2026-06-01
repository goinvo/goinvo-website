'use client'

import { useEffect } from 'react'
import {
  setExperimentContext,
  trackExperimentExposure,
  type ExperimentAnalyticsParams,
} from '@/lib/analytics'

interface ExperimentExposureProps {
  experiment: ExperimentAnalyticsParams
}

export function ExperimentExposure({ experiment }: ExperimentExposureProps) {
  useEffect(() => {
    setExperimentContext(experiment)
    trackExperimentExposure(experiment)

    return () => {
      setExperimentContext(null)
    }
  }, [experiment.experiment_id, experiment.flag_key, experiment.variant, experiment.page_path])

  return null
}

