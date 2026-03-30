'use client'

import { Video } from '@/components/ui/Video'
import { cloudfrontImage } from '@/lib/utils'

const features = [
  {
    title: 'Proactive Service Recommendations',
    description:
      'The system would actively analyze the information about residents in the database. By doing so, it could identify and suggest benefits they might be eligible for but haven\'t yet applied to. This saves residents the time and effort of having to search for programs themselves.',
    poster: '/images/features/eligibility/feature-1.jpg',
    mp4: '/videos/features/eligibility/feature-1.mp4',
    webm: '/videos/features/eligibility/feature-1.webm',
  },
  {
    title: 'Simplified Application Process',
    description:
      'When a resident wants to apply for a benefit, the system would pre-populate the application form with their data already stored in the database. Residents would then only need to provide additional information specific to that particular program. This significantly simplifies the application process.',
    poster: '/images/features/eligibility/feature-2.jpg',
    mp4: '/videos/features/eligibility/feature-2.mp4',
    webm: '/videos/features/eligibility/feature-2.webm',
  },
  {
    title: 'Renew your benefits in a snap',
    description:
      'The platform could automate the process of renewing benefits, sending timely reminders to residents and handling re-enrollment paperwork, thus reducing administrative work and preventing lapses in coverage.',
    poster: '/images/features/eligibility/feature-3.jpg',
    mp4: '/videos/features/eligibility/feature-3.mp4',
    webm: '/videos/features/eligibility/feature-3.webm',
  },
]

export function EligibilityVideos() {
  return (
    <div className="max-width content-padding mx-auto space-y-12 my-8">
      {features.map((feat) => (
        <div key={feat.title}>
          <p className="leading-relaxed mb-4 max-width-md"><strong>{feat.title}</strong></p>
          <p className="leading-relaxed mb-4 max-width-md">{feat.description}</p>
          <Video
            sources={[
              { src: cloudfrontImage(feat.webm), format: 'webm' },
              { src: cloudfrontImage(feat.mp4), format: 'mp4' },
            ]}
            poster={cloudfrontImage(feat.poster)}
            autoPlay={false}
            controls
          />
        </div>
      ))}
    </div>
  )
}
