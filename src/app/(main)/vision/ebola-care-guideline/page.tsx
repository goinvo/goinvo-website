import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Ebola Care Guideline',
  description:
    'An illustrated process on Personal Protective Equipment (PPE) for healthcare workers in Ebola treatment areas.',
}

export default function EbolaCareGuidelinePage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/ebola-care-guideline/ebola-care-guideline-featured.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Ebola Care Guideline
          </h1>
          <h4 className="font-serif text-base font-light mb-6">
            An Illustrated Process on Personal Protective Equipment
          </h4>

          <p className="text-gray leading-relaxed mb-4">
            The recommended Personal Protective Equipment (PPE) that healthcare workers wear in Ebola treatment areas&mdash;waterproof apron, surgical gown, surgical cap, respirator, face shield, boots, and two layers of gloves&mdash;significantly reduces the body&apos;s normal way of getting rid of heat by sweating.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The PPE holds excess heat and moisture inside, making the worker&apos;s body even hotter. In addition, the increased physical effort to perform duties while carrying the extra weight of the PPE can lead to the healthcare worker getting hotter faster. Wearing PPE increases the risk for heat-related illnesses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              href="http://goinvo.com/features/ebola-care-guideline/files/ebola_care_guideline.pdf"
              variant="secondary"
              external
            >
              Download PDF
            </Button>
          </div>

          <p className="text-gray leading-relaxed mb-6">
            Email{' '}
            <a href="mailto:stopebola@goinvo.com" className="text-primary hover:underline">
              stopebola@goinvo.com
            </a>{' '}
            to provide feedback and help evolve this document.
          </p>

          <Divider />
        </div>
      </section>

      {/* Related: Understanding Ebola */}
      <section className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mb-4 text-center">Related</h2>
          <Link href="/vision/understanding-ebola" className="block group">
            <div className="bg-white p-6 rounded shadow-card hover:shadow-lg transition-shadow">
              <h3 className="font-serif text-xl mb-2 text-primary group-hover:underline">
                Understanding Ebola: A Visual Guide
              </h3>
              <p className="text-gray text-sm">
                A comprehensive infographic covering the Ebola virus, its history, transmission, symptoms, diagnosis, treatment, and prevention.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-2">Authors</h2>

          <Author
            name="Xinyu Liu"
            company="GoInvo"
            image={cloudfrontImage('/old/images/team_photos/xinyu_liu.jpg')}
          >
            Xinyu is a designer with a background in crafting physical objects, conducting research, and influencing human behavior. She leverages invisible sensing tech, composes emotional feedback loops, and creates powerful experiences to enhance daily life.
          </Author>

          <h3 className="header-md mt-6 mb-3">Editor</h3>
          <Author
            name="Emily Twaddell"
            company="GoInvo"
            image={cloudfrontImage('/old/images/features/democracy/contrib/emily.jpg')}
          />

          <h3 className="header-md mt-6 mb-3">Contributing Author</h3>
          <Author
            name="Juhan Sonin"
            company="GoInvo, MIT"
            image={cloudfrontImage('/old/images/features/democracy/contrib/juhan.jpg')}
          />

          <h3 className="header-md mt-6 mb-3">Illustrator</h3>
          <Author
            name="Sarah Kaiser"
            company="GoInvo"
            image={cloudfrontImage('/old/images/features/ebola/contrib/sarah.jpeg')}
          />

          <h3 className="header-md mt-6 mb-3">Developer</h3>
          <Author
            name="Adam Pere"
            company="GoInvo"
            image={cloudfrontImage('/old/images/features/ebola/contrib/adam.jpeg')}
          />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
