'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const algorithms = [
  {
    id: 'vaccine',
    name: 'Vaccine Decision Aids',
    icon: '💉',
    description:
      'Vaccine decision aids help individuals make informed choices about immunizations. Tools like the EBSCO COVID-19 Vaccine Options guide and ICE (open source, LGPLv3) provide evidence-based information to support vaccination decisions across all age groups.',
  },
  {
    id: 'blood-pressure',
    name: 'Blood Pressure Monitoring',
    icon: '❤️',
    description:
      'Home blood pressure monitoring is recommended by the USPSTF for hypertension screening. Self-monitoring has been shown in meta-analyses to improve blood pressure control and reduce cardiovascular risk.',
  },
  {
    id: 'urinalysis',
    name: 'At-Home Urinalysis',
    icon: '🔬',
    description:
      'At-home urinalysis using smartphone apps (like Healthy.io) and 10-parameter dipstick tests can detect kidney disease, UTIs, and other conditions early. Emerging toilet-mountable sensors (like Olive) promise passive monitoring.',
  },
  {
    id: 'mental-health',
    name: 'Mental Health Assessments',
    icon: '🧠',
    description:
      'Digital mental health assessments, including Computer Assisted Self Assessment (CART) and Ecological Momentary Assessment (EMA), enable ongoing monitoring of mood, anxiety, and well-being outside clinical settings.',
  },
  {
    id: 'vision',
    name: 'Vision Tests',
    icon: '👁️',
    description:
      'Home vision tests like the Modified Amsler Grid (for macular degeneration) and the Home Acuity Test provide accessible ways to monitor visual health between optometry visits.',
  },
  {
    id: 'glucose',
    name: 'Blood Glucose Monitoring',
    icon: '🩸',
    description:
      'Self-monitored blood glucose (SMBG) is essential for diabetes management. Open-source continuous glucose monitoring platforms like Nightscout ("CGM in the Cloud") democratize access to real-time glucose data.',
  },
  {
    id: 'breast-exam',
    name: 'Breast Self-Exam',
    icon: '🎀',
    description:
      'Regular breast self-examination helps individuals become familiar with normal breast tissue and detect changes early. Open-source tools like the Breast Cancer Risk Assessment Tool (BrCa RAM) support personalized risk evaluation.',
  },
  {
    id: 'birth-control',
    name: 'Birth Control Decision Aid',
    icon: '📋',
    description:
      'Decision aids like the PCORI tool (UC San Francisco) and "Your Birth Control Choices" (CC BY-NC-SA) help individuals evaluate contraceptive options based on personal priorities and health factors.',
  },
  {
    id: 'air-quality',
    name: 'Air Quality Monitor',
    icon: '🌬️',
    description:
      'Indoor air quality monitoring systems track particulates, VOCs, CO2, and humidity. Open-source platforms enable communities to monitor environmental health and take protective action.',
  },
  {
    id: 'pulse-ox',
    name: 'Pulse Oximetry',
    icon: '📊',
    description:
      'Pulse oximetry measures blood oxygen saturation. Applications include overnight monitoring for sleep apnea diagnosis and COVID-19 home monitoring to detect silent hypoxia.',
  },
]

export function PscaAlgorithms() {
  const [activeId, setActiveId] = useState(algorithms[0].id)

  return (
    <div className="max-width content-padding mx-auto my-8">
      {/* Icon Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
        {algorithms.map((alg) => (
          <button
            key={alg.id}
            onClick={() => setActiveId(alg.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all text-center',
              activeId === alg.id
                ? 'border-primary bg-primary-lightest'
                : 'border-gray-light bg-white hover:border-gray-medium'
            )}
          >
            <span className="text-3xl">{alg.icon}</span>
            <span className="text-sm font-medium leading-tight">
              {alg.name}
            </span>
          </button>
        ))}
      </div>

      {/* Active Algorithm Detail */}
      {algorithms.map((alg) =>
        alg.id === activeId ? (
          <div
            key={alg.id}
            className="max-width-md mx-auto bg-gray-lightest p-6 rounded-lg"
          >
            <h3 className="font-serif text-xl mb-2">{alg.name}</h3>
            <p className="leading-relaxed text-gray-dark">{alg.description}</p>
          </div>
        ) : null
      )}
    </div>
  )
}
