'use client'

import { LegacyCarousel } from './LegacyCarousel'

interface GovtType {
  id: string
  label: string
  color: string
  image: string
  description: string
  strength: string
  weakness: string
  example: string
  downfall: string
  lessons: string
}

export function GovernmentCarousel({ govtTypes }: { govtTypes: GovtType[] }) {
  return (
    <LegacyCarousel
      tabs={govtTypes.map((g) => g.label)}
      tabColors={govtTypes.map((g) => g.color)}
      className="govt-carousel"
    >
      {govtTypes.map((govt) => (
        <div key={govt.id} className={`govt-slide ${govt.id}`}>
          <div className="slide-text">
            <header>
              <h4>{govt.label}</h4>
              <p>{govt.description}</p>
            </header>
            <hr className={`section-hr ${govt.id}`} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Key Strength</h5>
                  <p>{govt.strength}</p>
                </div>
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Crippling Weakness</h5>
                  <p>{govt.weakness}</p>
                </div>
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Historical Example</h5>
                  <p>{govt.example}</p>
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Downfall</h5>
                  <p>{govt.downfall}</p>
                </div>
                <div className="mb-4">
                  <h5 className="font-semibold mb-1">Lessons Learned</h5>
                  <p>{govt.lessons}</p>
                </div>
              </div>
            </div>
          </div>
          <div
            className="slide-image"
            style={{ backgroundImage: `url(${govt.image})` }}
            role="img"
            aria-label={`${govt.label} historical illustration`}
          />
        </div>
      ))}
    </LegacyCarousel>
  )
}
