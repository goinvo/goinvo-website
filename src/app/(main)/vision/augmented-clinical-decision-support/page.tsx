import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { PregnancyCarousel } from './PregnancyCarousel'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Augmented Clinical Decision Support',
  description:
    'Real-time, augmented decision support and guidance for mobile health workers, to better training and repeatable health outcomes.',
}

export default function AugmentedClinicalDecisionSupportPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/augmented-clinical-decision-support/augmented-clinical-decision-support-hero-1.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Augmented Clinical Decision Support</h1>
          <p className="leading-relaxed mb-1">
            Across the rural US, healthcare is
          </p>
          <p className="leading-relaxed mb-1">
            sometimes overlooked,
          </p>
          <p className="leading-relaxed mb-1">
            often understaffed,
          </p>
          <p className="leading-relaxed mb-1">
            always vital,
          </p>
          <p className="leading-relaxed mb-4">
            and mostly stretched thin.
          </p>

          <p className="leading-relaxed mb-4">
            Rural healthcare needs an adrenaline shot.
          </p>

          <p className="leading-relaxed mb-4">
            <a href="https://arpa-h.gov/research-and-funding/programs/paradigm" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ARPA-H&apos;s Paradigm</a> program takes one bite of the problem by funding a high-tech mobile health truck, armed with skilled staff, advanced technology, and new healthcare funding models to get better care to the people that need it.
          </p>

          <p className="leading-relaxed mb-4">
            Our concept for an onboard truck assistant is <strong>Field Guider</strong>, an open source software service that:
          </p>

          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed">
            <li>lives on the mobile health truck, phone, and AR goggles,</li>
            <li>works with healthcare workers in real-time to co-diagnose, co-treat patients for better health outcomes,</li>
            <li>and provides in-encounter training, through visual and aural clinical decision support nudges to up-skill staff.</li>
          </ul>

          <h3 className="font-serif text-xl mt-8 mb-4">
            The future of rural healthcare is...
          </h3>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed">
            <li>Care at home, in your neighborhood</li>
            <li>The clinician comes to you</li>
            <li>Worry-free, urgent care</li>
            <li>Clinic on wheels w/CT, imaging</li>
            <li>Realtime augmented CDS support tools (for mobile clinic clinicians and community healthcare workers)</li>
            <li>With a phone, 24-365 access to primary care, broadband everywhere</li>
          </ul>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Downloads</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              href="https://github.com/goinvo/arpa-h/blob/main/TA5/arpa-h-paradigm-field-guider-proposal.pdf"
              variant="secondary"
              external
            >
              ARPA-H Proposal (PDF)
            </Button>
            <Button
              href="https://github.com/goinvo/arpa-h"
              variant="secondary"
              external
            >
              Github
            </Button>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Primary Care Process
          </h2>
          <Image
            src={cloudfrontImage(
              '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-primary-care.jpg'
            )}
            alt="Primary care process map"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-primary-care.pdf"
            variant="secondary"
            external
            size="sm"
          >
            Download Process Map (PDF)
          </Button>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Clinical Task Guidance System Diagram
          </h2>
          <Image
            src={cloudfrontImage(
              '/images/features/augmented-clinical-decision-support/clinical-task-guidance-system-diagram-2.jpg'
            )}
            alt="Clinical task guidance system diagram"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-clinical-task-guidance-system-diagram.pdf"
            variant="secondary"
            external
            size="sm"
          >
            Download Diagram (PDF)
          </Button>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Pregnancy Storyboard
          </h2>
          <p className="leading-relaxed mb-4">
            A 21-panel storyboard illustrating how augmented clinical decision
            support could guide a frontline health worker through a prenatal
            care visit.
          </p>
        </div>

        {/* Pregnancy Carousel */}
        <PregnancyCarousel />

        <div className="max-width max-width-md content-padding mx-auto">
          <div className="mt-4 mb-8">
            <Button
              href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-pregnancy-storyboard.pdf"
              variant="secondary"
              external
              size="sm"
            >
              Download Storyboard (PDF)
            </Button>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Process Maps</h2>

          <h3 className="header-md mt-6 mb-4">Pregnancy Process</h3>
          <Image
            src={cloudfrontImage(
              '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-pregnancy.jpg'
            )}
            alt="Pregnancy process map"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-pregnancy.pdf"
            variant="secondary"
            external
            size="sm"
          >
            Download (PDF)
          </Button>

          <h3 className="header-md mt-8 mb-4">
            Head Injury Process
          </h3>
          <Image
            src={cloudfrontImage(
              '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-head-injury.jpg'
            )}
            alt="Head injury process map"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-head-injury.pdf"
            variant="secondary"
            external
            size="sm"
          >
            Download (PDF)
          </Button>

          <h3 className="header-md mt-8 mb-4">Cancer Process</h3>
          <Image
            src={cloudfrontImage(
              '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-cancer.jpg'
            )}
            alt="Cancer process map"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-cancer.pdf"
            variant="secondary"
            external
            size="sm"
          >
            Download (PDF)
          </Button>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Katerina Labrou" company="GoInvo" />
          <Author name="Mandy Liu" company="GoInvo" />
          <Author name="Jonathan Follett" company="GoInvo" />
          <Author name="Cagri Zaman" company="Mediate" />
          <Author name="Mollie Williams" company="Harvard Medical School" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            Massachusetts General Hospital Family Van, John Brownstein and Sarah
            Scalia (Boston Children&apos;s Hospital), Eric Benoit (GoInvo)
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Let&apos;s build the future of healthcare together!
          </h2>
          <p className="text-gray mb-4">
            Interested in working with us on augmented clinical decision
            support?{' '}
            <a href="mailto:hello@goinvo.com">Reach out to us</a> to learn
            more.
          </p>

          <AboutGoInvo />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card px-10 py-4">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
