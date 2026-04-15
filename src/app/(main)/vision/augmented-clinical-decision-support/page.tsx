import type { Metadata } from 'next'
import { Author } from '@/components/ui/Author'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { NewsletterSection } from '@/components/forms/NewsletterSection'
import { PregnancyCarousel } from './PregnancyCarousel'
import { cloudfrontImage } from '@/lib/utils'
import './acds.css'

export const metadata: Metadata = {
  title: 'Augmented Clinical Decision Support - GoInvo',
  description:
    'Real-time, augmented decision support and guidance for mobile health workers, to better training and repeatable health outcomes.',
}

export default function AugmentedClinicalDecisionSupportFeature() {
    return (
      <>
        <SetCaseStudyHero image={cloudfrontImage('/images/features/augmented-clinical-decision-support/augmented-clinical-decision-support-hero-1.jpg')} />
        <div className="augmented-clinical-decision-support-feature">
          <div className="pad-vertical--double">
            <div className="max-width max-width--md content-padding">
              <h1 className="header--xl">
                Real-time clinical guidance for mobile health workers
              </h1>

              <p>
                Across the rural US, healthcare is<br />
                sometimes overlooked,<br />
                often understaffed,<br />
                always vital,<br />
                and mostly stretched thin.
              </p>

              <p>
                Rural healthcare needs an adrenaline shot.
              </p>

              <p>
                <a href="https://arpa-h.gov/research-and-funding/programs/paradigm" target="_blank">ARPA-H's Paradigm</a> program takes one bite of the problem by funding a high-tech mobile health truck, armed with skilled staff, advanced technology, and new healthcare funding models to get better care to the people that need it.
              </p>

              <p>
                Our concept for an onboard truck assistant is <strong>Field Guider</strong>, an open source software service that:
              </p>

              <ul>
                <li>lives on the mobile health truck, phone, and AR goggles,</li>
                <li>works with healthcare workers in real-time to co-diagnose, co-treat patients for better health outcomes,</li>
                <li>and provides in-encounter training, through visual and aural clinical decision support nudges to up-skill staff.</li>
              </ul>

              <div className="pure-g button-group margin-bottom">
                <div className="pure-u-1 pure-u-lg-1-2">
                  <a
                    href="https://github.com/goinvo/arpa-h/blob/main/TA5/arpa-h-paradigm-field-guider-proposal.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button--secondary button--block margin-top--double margin-bottom--half margin-right"
                  >
                    Download ARPHA-H Proposal
                  </a>
                </div>
                <div className="pure-u-1 pure-u-lg-1-2">
                  <a
                    href="https://github.com/goinvo/arpa-h"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button--secondary button--block margin-top--double margin-bottom--half margin-right"
                  >
                    Github
                  </a>
                </div>
              </div>

              <h2 className="header--lg margin-top--trip">
                The future of rural healthcare is...
              </h2>

              <ul>
                <li>Care at home, in your neighborhood</li>
                <li>The clinician comes to you</li>
                <li>Worry-free, urgent care</li>
                <li>Clinic on wheels w/CT, imaging </li>
                <li>Realtime augmented CDS support tools (for mobile clinic clinicians and community healthcare workers)</li>
                <li>With a phone, 24-365 access to primary care, broadband everywhere</li>
              </ul>

              <h2 className="header--lg margin-top--trip">
                Primary Care Process
              </h2>

              <a
                href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-primary-care.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={cloudfrontImage("/images/features/augmented-clinical-decision-support/augmented-cds-process-map-primary-care.jpg")}
                  className="image--max-width"
                />
              </a>

              <div>
                <a
                  href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-primary-care.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary margin-top--double margin-bottom--half margin-right"
                >
                  Download Primary Care Process
                </a>
              </div>

              <h2 className="header--lg margin-top--trip">
                Clinical Task Guidance System Diagram
              </h2>

              <a
                href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-clinical-task-guidance-system-diagram.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={cloudfrontImage("/images/features/augmented-clinical-decision-support/clinical-task-guidance-system-diagram-2.jpg")}
                  className="image--max-width"
                />
              </a>

              <div>
                <a
                  href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-clinical-task-guidance-system-diagram.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary margin-top--double margin-bottom--half margin-right"
                >
                  Download Clinical Task Guidance System Diagram
                </a>
              </div>

              <h2 className="header--lg margin-top--trip">
                Pregnancy Storyboard
              </h2>

              <PregnancyCarousel />

              <div>
                <a
                  href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-pregnancy-storyboard.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary margin-top--double margin-bottom--half margin-right"
                >
                  Download Pregnancy Storyboard
                </a>
              </div>

              <h2 className="header--lg margin-top--trip">
                Process Maps
              </h2>

              <h3 className="header--md">Pregnancy Process Map</h3>

              <a
                href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-pregnancy.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={cloudfrontImage("/images/features/augmented-clinical-decision-support/augmented-cds-process-map-pregnancy.jpg")}
                  className="image--max-width"
                />
              </a>

              <div>
                <a
                  href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-pregnancy.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary margin-top--double margin-bottom--half margin-right"
                >
                  Download Pregnancy Process Map
                </a>
              </div>

              <h3 className="header--md">Head Injury Process Map</h3>

              <a
                href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-head-injury.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={cloudfrontImage("/images/features/augmented-clinical-decision-support/augmented-cds-process-map-head-injury.jpg")}
                  className="image--max-width"
                />
              </a>

              <div>
                <a
                  href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-head-injury.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary margin-top--double margin-bottom--half margin-right"
                >
                  Download Head Injury Process Map
                </a>
              </div>

              <h3 className="header--md">Cancer Process Map</h3>

              <a
                href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-cancer.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={cloudfrontImage("/images/features/augmented-clinical-decision-support/augmented-cds-process-map-cancer.jpg")}
                  className="image--max-width"
                />
              </a>

              <div>
                <a
                  href="https://github.com/goinvo/arpa-h/blob/main/TA5/augmented-cds-process-map-cancer.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--secondary margin-top--double margin-bottom--half margin-right"
                >
                  Download Cancer Process Map
                </a>
              </div>

              <h2 className="header--lg margin-bottom--half margin-top--double">
                Let's build the future of healthcare together!
              </h2>
              <p className="text--gray">
                We can help you design and ship your own version of augmented clinical decision support.<br />
                Contact us to discuss your project.<br />
                <a href="mailto:hello@goinvo.com">hello@goinvo.com</a>
              </p>

              <h4 className="header--sm margin-bottom--half margin-top--double">
                About GoInvo
              </h4>
              <p className="text--gray">
                GoInvo is a healthcare design company that crafts innovative
                digital and physical solutions. Our deep expertise in Health IT,
                Genomics, and Open Source health has delivered results for the
                National Institutes of Health, Walgreens, Mount Sinai, and
                Partners Healthcare.
              </p>
            </div>
          </div>

          <div className="pad-vertical--double">
            <div className="max-width max-width--md content-padding">
              <div>
                <h2 className="header--xl text--center">Authors</h2>
                <Author name="Katerina Labrou" />
                <Author name="Mandy Liu" />
                <Author name="Jonathan Follett" />
                <Author
                  name="Cagri Zaman"
                  company="Mediate"
                  image={cloudfrontImage("/images/about/headshot-cagri-zaman.jpg")}
                >
                  Dr. Cagri Hakan Zaman is the Director of Virtual Collaboration Research (Mediate Labs) as well as the founder and former director of the MIT Virtual Experience Design Lab at the Massachusetts Institute of Technology. His research is highly interdisciplinary, focusing on developing immersive media tools for engineering and design by studying human spatial experiences in both virtual and physical environments. Dr. Zaman's innovative approach to spatial experience from a story-understanding perspective is showcased in his dissertation titled "Spatial Experience in Humans and Machines." With extensive research experience in embodied intelligence, computational design, and immersive media, Dr. Zaman has conducted research at both the MIT Computer Science and Artificial Intelligence Laboratory (CSAIL) and the MIT Design Lab (formerly MIT Mobile Experience Lab).
                </Author>
                <Author
                  name="Mollie Williams"
                  company="Harvard Medical School"
                  image={cloudfrontImage("/images/about/headshot-mollie-williams.jpg")}
                >
                  Mollie is a visionary and purposeful leader dedicated to advancing health equity and justice. Strategic thinker who gracefully transitions between big picture impact and day-to-day operations. Trusted collaborator and champion of high- performing, inclusive teams. Thought-leader, ambassador, and influencer in local, national, and international conversations about equitable access to compassionate, high-quality care for all.
                </Author>
                <Author name="Juhan Sonin" />
              </div>

              <div className="pad-vertical--double">
                <h3 className="header--md">Contributors</h3>
                <p>
                  Massachusetts General Hospital Family Van<br />
                  John Brownstein and Sarah Scalia, Boston Children's Hospital<br />
                  Eric Benoit, GoInvo
                </p>
              </div>

            </div>
          </div>

          <NewsletterSection background="gray" />
        </div>
      </>
    )
}
