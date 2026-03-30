import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
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
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-4">Real-time clinical guidance for mobile health workers</h1>
          <p className="leading-relaxed mb-4">
            Across the rural US, healthcare is<br />
            sometimes overlooked,<br />
            often understaffed,<br />
            always vital,<br />
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

          <ul className="ul space-y-2 mb-8 leading-relaxed">
            <li>lives on the mobile health truck, phone, and AR goggles,</li>
            <li>works with healthcare workers in real-time to co-diagnose, co-treat patients for better health outcomes,</li>
            <li>and provides in-encounter training, through visual and aural clinical decision support nudges to up-skill staff.</li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 mb-8 mt-8">
            <Button
              href="https://github.com/goinvo/arpa-h/blob/main/TA5/arpa-h-paradigm-field-guider-proposal.pdf"
              variant="secondary"
              external
            >
              Download ARPHA-H Proposal
            </Button>
            <Button
              href="https://github.com/goinvo/arpa-h"
              variant="secondary"
              external
            >
              Github
            </Button>
          </div>

          <h2 className="header-lg mt-12 mb-4">
            The future of rural healthcare is...
          </h2>
          <ul className="ul space-y-2 mb-8 leading-relaxed">
            <li>Care at home, in your neighborhood</li>
            <li>The clinician comes to you</li>
            <li>Worry-free, urgent care</li>
            <li>Clinic on wheels w/CT, imaging</li>
            <li>Realtime augmented CDS support tools (for mobile clinic clinicians and community healthcare workers)</li>
            <li>With a phone, 24-365 access to primary care, broadband everywhere</li>
          </ul>

          <h2 className="header-lg mt-12 mb-4">
            Primary Care Process
          </h2>
          <a
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-primary-care.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage(
                '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-primary-care.jpg'
              )}
              alt="Primary care process map"
              width={1200}
              height={800}
              className="w-full h-auto mb-4"
            />
          </a>
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-primary-care.pdf"
            variant="secondary"
            external
          >
            Download Primary Care Process
          </Button>

          <h2 className="header-lg mt-12 mb-4">
            Clinical Task Guidance System Diagram
          </h2>
          <a
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-clinical-task-guidance-system-diagram.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage(
                '/images/features/augmented-clinical-decision-support/clinical-task-guidance-system-diagram-2.jpg'
              )}
              alt="Clinical task guidance system diagram"
              width={1200}
              height={800}
              className="w-full h-auto mb-4"
            />
          </a>
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-clinical-task-guidance-system-diagram.pdf"
            variant="secondary"
            external
          >
            Download Clinical Task Guidance System Diagram
          </Button>

          <h2 className="header-lg mt-12 mb-4">
            Pregnancy Storyboard
          </h2>
        </div>

        {/* Pregnancy Carousel */}
        <PregnancyCarousel />

        <div className="max-width max-width-md content-padding mx-auto">
          <div className="mt-4 mb-8">
            <Button
              href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-pregnancy-storyboard.pdf"
              variant="secondary"
              external
            >
              Download Pregnancy Storyboard
            </Button>
          </div>

          <h2 className="header-lg mt-12 mb-4">Process Maps</h2>

          <h3 className="header-md mt-6 mb-4">Pregnancy Process Map</h3>
          <a
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-pregnancy.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage(
                '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-pregnancy.jpg'
              )}
              alt="Pregnancy process map"
              width={1200}
              height={800}
              className="w-full h-auto mb-4"
            />
          </a>
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-pregnancy.pdf"
            variant="secondary"
            external
          >
            Download Pregnancy Process Map
          </Button>

          <h3 className="header-md mt-8 mb-4">
            Head Injury Process Map
          </h3>
          <a
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-head-injury.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage(
                '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-head-injury.jpg'
              )}
              alt="Head injury process map"
              width={1200}
              height={800}
              className="w-full h-auto mb-4"
            />
          </a>
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-head-injury.pdf"
            variant="secondary"
            external
          >
            Download Head Injury Process Map
          </Button>

          <h3 className="header-md mt-8 mb-4">Cancer Process Map</h3>
          <a
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-cancer.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage(
                '/images/features/augmented-clinical-decision-support/augmented-cds-process-map-cancer.jpg'
              )}
              alt="Cancer process map"
              width={1200}
              height={800}
              className="w-full h-auto mb-4"
            />
          </a>
          <Button
            href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-cancer.pdf"
            variant="secondary"
            external
          >
            Download Cancer Process Map
          </Button>

          <h2 className="header-lg mt-8 mb-2">
            Let&apos;s build the future of healthcare together!
          </h2>
          <p className="text-gray">
            We can help you design and ship your own version of augmented clinical decision support.<br />
            Contact us to discuss your project.<br />
            <a href="mailto:hello@goinvo.com">hello@goinvo.com</a>
          </p>

          <AboutGoInvo />
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] text-center mt-8 mb-4">Authors</h2>
          <Author name="Katerina Labrou" company="GoInvo" />
          <Author name="Mandy Liu" company="GoInvo" />
          <Author name="Jonathan Follett" company="GoInvo" />
          <Author name="Cagri Zaman" company="Mediate">
            Dr. Cagri Hakan Zaman is the Director of Virtual Collaboration Research (Mediate Labs) as well as the founder and former director of the MIT Virtual Experience Design Lab at the Massachusetts Institute of Technology. His research is highly interdisciplinary, focusing on developing immersive media tools for engineering and design by studying human spatial experiences in both virtual and physical environments. Dr. Zaman&apos;s innovative approach to spatial experience from a story-understanding perspective is showcased in his dissertation titled &quot;Spatial Experience in Humans and Machines.&quot; With extensive research experience in embodied intelligence, computational design, and immersive media, Dr. Zaman has conducted research at both the MIT Computer Science and Artificial Intelligence Laboratory (CSAIL) and the MIT Design Lab (formerly MIT Mobile Experience Lab).
          </Author>
          <Author name="Mollie Williams" company="Harvard Medical School">
            Mollie is a visionary and purposeful leader dedicated to advancing health equity and justice. Strategic thinker who gracefully transitions between big picture impact and day-to-day operations. Trusted collaborator and champion of high-performing, inclusive teams. Thought-leader, ambassador, and influencer in local, national, and international conversations about equitable access to compassionate, high-quality care for all.
          </Author>
          <Author name="Juhan Sonin" company="GoInvo" />

          <div className="mt-8">
            <h3 className="header-md mt-6 mb-3">Contributors</h3>
            <p className="text-gray">
              Massachusetts General Hospital Family Van<br />
              John Brownstein and Sarah Scalia, Boston Children&apos;s Hospital<br />
              Eric Benoit, GoInvo
            </p>
          </div>
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
