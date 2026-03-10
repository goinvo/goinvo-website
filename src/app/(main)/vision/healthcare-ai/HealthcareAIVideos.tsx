'use client'

import { Video } from '@/components/ui/Video'
import { cloudfrontImage } from '@/lib/utils'

const videos = [
  {
    title: 'Melanoma Mobile Assistant',
    description:
      'An AI-powered mobile tool that helps patients monitor skin changes and communicate concerns to their dermatologist.',
    poster:
      '/images/features/healthcare-ai/melanoma_mobile_assistant_goinvo_aug2024.jpg',
    mp4: '/videos/features/healthcare-ai/melanoma_mobile_assistant_goinvo_aug2024.mp4',
    webm: '/videos/features/healthcare-ai/melanoma_mobile_assistant_goinvo_aug2024.webm',
  },
  {
    title: 'Pearl Health — Ankle Pain',
    description:
      'An AI clinical assistant that supports primary care physicians with real-time diagnostic guidance during patient encounters.',
    poster:
      '/images/features/healthcare-ai/pearl-health-ankle-pain-2023-08-29.jpg',
    mp4: '/videos/features/healthcare-ai/pearl-health-ankle-pain-2023-08-29.mp4',
    webm: '/videos/features/healthcare-ai/pearl-health-ankle-pain-2023-08-29.webm',
  },
]

export function HealthcareAIVideos() {
  return (
    <div className="max-width content-padding mx-auto space-y-12 my-8">
      {videos.map((vid) => (
        <div key={vid.title}>
          <h3 className="font-serif text-xl mb-2">{vid.title}</h3>
          <p className="leading-relaxed mb-4 max-width-md">
            {vid.description}
          </p>
          <Video
            sources={[
              { src: cloudfrontImage(vid.webm), format: 'webm' },
              { src: cloudfrontImage(vid.mp4), format: 'mp4' },
            ]}
            poster={cloudfrontImage(vid.poster)}
            autoPlay={false}
            controls
            loop
          />
        </div>
      ))}
    </div>
  )
}
