import type { Metadata } from 'next'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { cloudfrontImage } from '@/lib/utils'

const heroImage = '/images/features/posters/health-visualizations-hero-2.jpg'

export const metadata: Metadata = {
  title: 'Open Source Healthcare Visualizations',
  description:
    'A repo of open source health visualizations and graphics available to all for use or modification, under a Creative Commons Attribution v3 license or MIT license.',
}

const posters = [
  { id: 'own-your-health-data', title: 'Own Your Health Data', image: '/images/features/own-your-health-data/patient-data-ownership.jpg', downloadLink: '/pdf/vision/own-your-health-data/OwnYourHealthData.pdf', learnMoreLink: '/vision/own-your-health-data/' },
  { id: 'how-to-vote-early', title: 'How To Vote Early', image: '/images/features/posters/how-to-vote-early.jpg', downloadLink: '/pdf/vision/posters/how-to-vote-early.pdf', learnMoreLink: '' },
  { id: 'precision-autism', title: 'Precision Autism', image: '/images/features/precision-autism/precision-autism.jpg', downloadLink: '/pdf/vision/precision-autism/Precision-Autism-25.Aug.2020.pdf', learnMoreLink: '/vision/precision-autism/' },
  { id: 'test-treat-trace', title: 'Test. Treat. Trace.', image: '/images/features/test-treat-trace/test-treat-trace-2.jpg', downloadLink: '/pdf/vision/test-treat-trace/Test-Treat-Trace-18Jun2020.pdf', learnMoreLink: '/vision/test-treat-trace/' },
  { id: 'washhands', title: 'Wash Your Hands', image: '/images/features/coronavirus/wash-hands.jpg', downloadLink: '/pdf/vision/posters/understandingcoronavirus_wash-hands-poster.pdf', learnMoreLink: '/vision/coronavirus/' },
  { id: 'vapepocolypse', title: 'Vapepocolypse', image: '/images/features/vapepocolypse/vapepocolypse-hero.jpg', downloadLink: '/pdf/vision/vapepocolypse/Vapepocolypse.pdf', learnMoreLink: '/vision/vapepocolypse/' },
  { id: 'who-uses-my-health-data', title: 'Who Uses My Health Data?', image: '/images/features/health-data-use/health-data-use-hero-2.jpg', downloadLink: '/pdf/vision/health-data-use/health-data-use-poster-medium.pdf', learnMoreLink: '/vision/who-uses-my-health-data/' },
  { id: 'health-payment-system-complexity', title: 'Health Payment System Complexity', image: '/images/features/posters/health-payment-system-complexity-hero.jpg', downloadLink: '/pdf/vision/posters/health-payment-system-complexity.pdf', learnMoreLink: '' },
  { id: 'insuring-price-increase', title: 'Insuring Price Increase', image: '/images/features/posters/insuring-price-increase-hero.jpg', downloadLink: '/pdf/vision/posters/insuring-price-increase.pdf', learnMoreLink: '' },
  { id: 'healthcare-dollars', title: 'Where Your Health Dollars Go', image: '/images/features/healthcare-dollars/healthcare-dollars-hero.jpg', downloadLink: '/pdf/vision/healthcare-dollars/healthcare-dollars-visualization.pdf', learnMoreLink: '/vision/healthcare-dollars/' },
  { id: 'determinants-of-health-spanish', title: 'Determinantes de la Salud', image: '/images/features/posters/determinantes_de_la_salud.jpg', downloadLink: '/pdf/vision/posters/determinantes_de_la_salud_42x50.pdf', learnMoreLink: '/vision/determinants-of-health/' },
  { id: 'determinants-of-health', title: 'Determinants of Health', image: '/images/features/determinants-of-health/determinants-of-health-poster.jpg', downloadLink: '/pdf/vision/posters/health-determinants.pdf', learnMoreLink: '/vision/determinants-of-health/' },
  { id: 'open-healthcare-systems', title: 'Open Healthcare Systems Model', image: '/images/features/posters/precision-prism-architecture-diagram.jpg', downloadLink: '/pdf/vision/posters/precision-prism-architecture-diagram.pdf', learnMoreLink: '' },
  { id: 'virtual-care-encounters', title: 'Virtual Care Encounters', image: '/images/features/posters/virtual-care-encounters.jpg', downloadLink: '/pdf/vision/posters/virtual-care-encounters.pdf', learnMoreLink: '/vision/virtual-care/' },
  { id: 'open-source-healthcare', title: 'Open Source Healthcare Journal', image: '/images/features/posters/oshc-book.jpg', downloadLink: '/pdf/vision/open-source-healthcare/open-source-healthcare-journal.pdf', learnMoreLink: '/vision/open-source-healthcare/' },
  { id: 'hie-data-access', title: 'HIE Data Access Workflow', image: '/images/features/posters/hie-data-access-workflow.jpg', downloadLink: '/pdf/vision/posters/hie-data-access-workflow.pdf', learnMoreLink: '' },
  { id: 'sources-of-clinical-data', title: 'Sources of Clinical Health Data', image: '/images/features/posters/sources-of-clinical-health-data-2.jpg', downloadLink: '/pdf/vision/posters/sources-of-clinical-health-data.pdf', learnMoreLink: '/work/fastercures-health-data-basics' },
  { id: 'sources-of-data', title: 'Sources of Your Personal Health Data', image: '/images/features/posters/sources-of-data.jpg', downloadLink: '/pdf/vision/posters/sources-of-data.pdf', learnMoreLink: '/work/fastercures-health-data-basics' },
  { id: 'sdoh-spend', title: 'Spending within the Determinants of Health', image: '/images/features/determinants-of-health/sdoh-spend-mockup.jpg', downloadLink: '/pdf/vision/posters/sdoh-spend-v12.pdf', learnMoreLink: '/vision/determinants-of-health/#determinants-spending' },
  { id: 'critical-mass', title: 'Critical MASS', image: '/images/features/posters/critical-mass.jpg', downloadLink: '/pdf/vision/posters/critical-mass.pdf', learnMoreLink: '' },
  { id: 'ebola', title: 'Ebola Care Guideline', image: '/images/features/posters/ebola-care-guideline.jpg', downloadLink: '/pdf/vision/posters/ebola-care-guideline.pdf', learnMoreLink: '/vision/ebola-care-guideline/' },
  { id: 'data-interop', title: 'Standardized Data for Interoperability', image: '/images/features/posters/standard-health-data.jpg', downloadLink: '/pdf/vision/posters/standard-health-data.pdf', learnMoreLink: '' },
  { id: 'healthcare-is-a-human-right', title: 'Healthcare is a Human Right', image: '/images/features/posters/care-card-healthcare-is-a-human-right.jpg', downloadLink: '/pdf/vision/posters/care-card-healthcare-is-a-human-right.pdf', learnMoreLink: '' },
  { id: 'examine-yourself', title: 'Examine Yourself', image: '/images/features/posters/care-card-examine-yourself-2.jpg', downloadLink: '/pdf/vision/posters/care-card-examine-yourself.pdf', learnMoreLink: '' },
  { id: 'sugar-kills', title: 'Sugar Kills', image: '/images/features/posters/care-card-sugar-kills.jpg', downloadLink: '/pdf/vision/posters/care-card-sugar-kills-2.pdf', learnMoreLink: '' },
  { id: 'make-things', title: 'Make Things', image: '/images/features/posters/design-axiom-make-things.jpg', downloadLink: '/pdf/vision/posters/design-axiom-make-things.pdf', learnMoreLink: '' },
  { id: 'let-data-scream', title: 'Let Data Scream', image: '/images/features/posters/design-axiom-let-data-scream.jpg', downloadLink: '/pdf/vision/posters/design-axiom-let-data-scream.pdf', learnMoreLink: '' },
  { id: 'prototype-like-crazy', title: 'Prototype Like Crazy', image: '/images/features/posters/design-axiom-prototype-like-crazy.jpg', downloadLink: '/pdf/vision/posters/design-axiom-prototype-like-crazy-2.pdf', learnMoreLink: '' },
  { id: 'care-plans-process', title: 'Care Planning Process', image: '/images/features/posters/careplans-process.jpg', downloadLink: '/pdf/vision/posters/careplans-process.pdf', learnMoreLink: '' },
  { id: 'shr-medical-encounter', title: 'SHR Medical Encounter Journey Map', image: '/images/features/posters/shr-medical-encounter-journey-map.jpg', downloadLink: '/pdf/vision/posters/shr-medical-encounter-journey-map.pdf', learnMoreLink: '/work/mitre-shr' },
  { id: 'care-plans-ecosystem', title: 'Care Plans Ecosystem', image: '/images/features/posters/careplans-ecosystem.jpg', downloadLink: '/pdf/vision/posters/careplans-ecosystem.pdf', learnMoreLink: '' },
]

export default function HealthVisualizationsPage() {
  return (
    <>
      <SetCaseStudyHero image={cloudfrontImage(heroImage)} />
      <div className="poster-feature">
        <div className="pad-vertical--double">
          <div className="max-width max-width--md content-padding">
            <h1 className="header--xl margin-bottom--none">
              Health Visualizations
            </h1>
            <p className="text--gray text--sm margin-top--none margin-bottom--double">
              These infographics are open source, available to all under a{' '}
              <a
                href="https://creativecommons.org/licenses/by/3.0/us/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Creative Commons Attribution v3
              </a>{' '}
              license or for the SHR Journey Map and HIE diagram, under a{' '}
              <a
                href="https://opensource.org/licenses/MIT"
                target="_blank"
                rel="noopener noreferrer"
              >
                MIT
              </a>{' '}
              license.
            </p>

            <div className="pure-g">
              {posters.map((poster) => (
                <div key={poster.id} className="pure-u-1 pure-u-md-1-2 pure-u-lg-1-3">
                  <div className="poster-card margin-top--double content-padding">
                    <div className="poster-preview">
                      <a href={cloudfrontImage(poster.downloadLink)}>
                        <div className="image-block image-block--hoverable margin-top--none">
                          <div className="image-block__image-container">
                            <img
                              src={cloudfrontImage(poster.image)}
                              className="image--max-width"
                              alt={poster.title}
                            />
                          </div>
                        </div>
                      </a>
                    </div>
                    <div className="posterInfo">
                      <h4 className="header--sm margin-top--none">{poster.title}</h4>
                      <a
                        href={cloudfrontImage(poster.downloadLink)}
                        className="button button--secondary button--block"
                      >
                        Download
                      </a>
                      <p className="text--center">
                        {poster.learnMoreLink ? <a href={poster.learnMoreLink}>Learn More</a> : null}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="background--gray pad-vertical--double">
          <div className="max-width max-width--md content-padding">
            <NewsletterForm />
          </div>
        </div>
      </div>
    </>
  )
}
