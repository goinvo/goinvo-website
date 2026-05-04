import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { ClientLogos } from '@/components/ui/ClientLogos'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Software Design for AI Services',
  description:
    'Beautiful software design for AI experiences, bridging human-centered design with AI capabilities.',
}

const results = [
  { label: 'Efficiency & savings:', text: 'Streamline workflows, reduce manual effort, and drive measurable cost reductions.' },
  { label: 'Innovation:', text: 'Quickly generate more out-of-the-box ideas that work and elevate product vision.' },
  { label: 'Rapid experimentation:', text: 'Validate ideas quickly before committing major resources.' },
  { label: 'Risk Reduction:', text: 'Early-stage design and testing uncover challenges before they escalate.' },
  { label: 'Seamless integration:', text: 'AI experiences for real-world use.' },
]

const caseStudies = [
  {
    title: 'Ipsos Facto',
    subtitle: 'The Future of Research Intelligence',
    description:
      'Designing AI-powered platform that transforms siloed data into actionable insights using deep research and advanced models.',
    image: '/images/ai/ai_hero.jpg',
    link: '/work/ipsos-facto',
  },
  {
    title: 'National Cancer Navigation',
    subtitle: 'Rewriting the Cancer Journey',
    description:
      'How AI and human navigators are reshaping patient and family support for the nation.',
    image: '/images/features/national-cancer-navigation/hero.png',
    link: '/vision/national-cancer-navigation',
  },
  {
    title: 'Augmented Clinical Decision Support',
    subtitle: 'Real-time Clinical Guidance for Mobile Health Workers',
    description:
      'Augmented decision support and guidance for mobile health workers, to better training and repeatable health outcomes.',
    image: '/images/features/augmented-clinical-decision-support/augmented-clinical-decision-support-hero-1.jpg',
    link: '/vision/augmented-clinical-decision-support',
  },
  {
    title: 'Healthcare AI',
    subtitle: 'The AI Healthcare Future We Need',
    description:
      'Exploring the AI healthcare opportunities and unexpected outcomes.',
    image: '/images/features/healthcare-ai/healthcare-ai-hero-5.jpg',
    link: '/vision/healthcare-ai',
  },
  {
    title: 'Eligibility Engine',
    subtitle: 'Transforming Service Access in Massachusetts',
    description:
      'A centralized MA resident database for better service accessibility.',
    image: '/images/features/eligibility/hero-image.jpg',
    link: '/vision/eligibility-engine',
  },
]

function Arrow({ split }: { split: '80' | '20' }) {
  return (
    <div className={`arrow arrow-${split}`} aria-hidden="true">
      <div className="arrow-line" />
      <div className="arrow-vtop-left" />
      <div className="arrow-vtop-right" />
    </div>
  )
}

function ArrowVertical({ split }: { split: '80' | '20' }) {
  return (
    <div className={`arrow-vert arrow-${split}`} aria-hidden="true">
      <div className="arrow-line" />
      <div className="arrow-vtop-left" />
      <div className="arrow-vtop-right" />
    </div>
  )
}

export default function AIPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative h-[450px] bg-cover bg-top"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/ai/ai_hero_2_sm.jpg')})` }}
      >
        <div className="relative h-full max-width">
          <div className="absolute bottom-0 left-0 w-full lg:w-[385px] bg-white/90 content-padding py-8">
            <h1 className="header-xl m-0 mb-4">
              Designing AI-Powered Experiences for People and Organizations<span className="text-primary font-serif">.</span>
            </h1>
            <p className="text-gray mb-6">
              We design tools and experiences with AI so people and machines can
              skillfully work together.
            </p>
            <Button href="/contact" variant="primary" size="md">
              Let&apos;s discuss your project
            </Button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding">
          <h2 className="header-xl mt-0 mb-8">What results are you looking for?</h2>
          <ul className="ul grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {results.map((result) => (
              <li key={result.label}>
                <strong>{result.label}</strong> {result.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding">
          <h2 className="header-xl mt-0 mb-8">
            Driving results with AI<span className="text-primary font-serif">.</span>
          </h2>
          <div className="space-y-8">
            {caseStudies.map((study) => (
              <Link
                key={study.title}
                href={study.link}
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out no-underline"
              >
                <div className="flex flex-wrap-reverse">
                  <div className="flex flex-[1_1_300px] flex-col justify-center p-6 text-tertiary md:p-8">
                    <h4 className="header-xl mb-0">
                      {study.subtitle}
                    </h4>
                    <p className="header-lg text-tertiary mt-6 mb-0">
                      {study.description}
                    </p>
                    <p className="mt-4 mb-0">
                      <span className="text-secondary underline">Read Case Study</span>
                    </p>
                  </div>
                  <div className="relative min-h-[220px] flex-[1_1_300px] overflow-hidden">
                    <Image
                      src={cloudfrontImage(study.image)}
                      alt={study.title}
                      fill
                      sizes="(max-width: 767px) calc(100vw - 2rem), 510px"
                      quality={95}
                      className="object-cover image--interactive"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 80/20 AI Fit Diagram */}
      <section className="goinvo-ai-fit py-16">
        <div className="max-width content-padding">
          <div className="fit-text-top text--serif">
            <div className="row text-row">
              <div className="col width-80">
                <p className="margin-bottom--none text--lg">
                  In the land of AI products, designers will split time between problem solving, facilitation, and bending AI services
                </p>
              </div>
            </div>
            <div className="row text-row">
              <div className="col width-80">
                <p className="margin-top--none margin-bottom--none text--lg">versus</p>
              </div>
              <div className="col width-20">
                <p className="margin-top--none text--lg">tooling the individual GenAI and agentic services.</p>
              </div>
            </div>
          </div>

          <div className="diagram-desktop">
            <div className="stat-stack">
              <div className="row text-row stat-text">
                <div className="col width-80">
                  <p className="text--lg text--serif">
                    Most design will live here in the <span className="inline-number">80<span className="inline-percentage">%</span></span>
                    <br />
                    using AI services to facilitate, problem solve, drive better decisions, and productionize products
                  </p>
                </div>
                <div className="col width-20">
                  <p className="text--lg text--serif">
                    <span className="inline-number">20<span className="inline-percentage">%</span></span> Tooling
                  </p>
                </div>
              </div>
            </div>

            <div className="row arrow-row">
              <div className="col width-80">
                <Arrow split="80" />
              </div>
              <div className="col width-20">
                <Arrow split="20" />
              </div>
            </div>

            <div className="goinvo-lives-container">
              <div className="goinvo-lives">
                <div className="row bracket-row">
                  <div className="bracket">
                    <Image
                      className="bracket-icon"
                      src="/images/bracket-down.svg"
                      alt="bracket pointed down"
                      width={187}
                      height={54}
                    />
                  </div>
                </div>

                <div className="goinvo-lives-text">
                  <div className="row lg-only">
                    <p className="text--lg text--serif">GoInvo lives here as toolmakers and service shapers.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="diagram-mobile">
            <div className="arrow-stack">
              <div className="arrow-column-80">
                <ArrowVertical split="80" />
              </div>
              <div className="arrow-column-20">
                <ArrowVertical split="20" />
              </div>
            </div>

            <div className="goinvo-lives-container">
              <div className="goinvo-lives">
                <div className="row bracket-row">
                  <div className="bracket">
                    <Image
                      className="bracket-icon"
                      src="/images/bracket-down.svg"
                      alt="bracket pointed down"
                      width={187}
                      height={54}
                    />
                  </div>
                </div>

                <div className="stat-stack">
                  <div className="row text-row stat-text">
                    <div className="col width-80">
                      <p className="text--lg text--serif">
                        Most design will live here in the <span className="inline-number">80<span className="inline-percentage">%</span></span>
                        <br />
                        using AI services to facilitate, problem solve, drive better decisions, and productionize products
                      </p>
                    </div>
                    <div className="goinvo-lives-text">
                      <div className="row">
                        <p className="text--lg text--serif">GoInvo lives here as toolmakers and service shapers.</p>
                      </div>
                    </div>
                    <div className="col width-20">
                      <p className="text--lg text--serif">
                        <span className="inline-number">20<span className="inline-percentage">%</span></span> Tooling
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Storytelling Featured Project */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding">
          <Link
            href="/vision/visual-storytelling-with-genai"
            className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out no-underline"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-6 md:p-8 flex flex-col justify-center text-tertiary">
                <h4 className="header-xl mb-0">
                  Reimagining Visual Storytelling with GenAI
                </h4>
                <p className="header-lg text-tertiary mt-6 mb-0">
                  GenAI accelerates our design process and enhances our ability to tell compelling stories through visuals.
                </p>
                <p className="mt-4 mb-0">
                  <span className="text-secondary underline">Read Case Study</span>
                </p>
              </div>
              <div className="aspect-[16/10] md:aspect-auto overflow-hidden">
                <Image
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-hero-3.jpg')}
                  alt="Visual Storytelling with GenAI"
                  width={600}
                  height={375}
                  className="w-full h-full object-cover image--interactive"
                />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-16 text-tertiary">
        <div className="max-width content-padding">
          <hr className="border-0 border-t border-gray-medium mb-12 mx-auto max-w-full" />
          <div className="text-center">
            <p className="mb-6">
              <strong>Trusted by ambitious startups, Fortune 500&apos;s, and government agencies</strong>
            </p>
            <ClientLogos variant="ai" />
          </div>
        </div>
      </section>

      {/* CTA + Contact Form */}
      <section className="bg-blue-light py-16">
        <div className="max-width-md content-padding mx-auto text-center text-tertiary">
          <p className="header-xl text-tertiary mb-2">
            We ship software that works.
            <br />
            Let&apos;s build together!
          </p>
          <p className="text-gray mb-8">Reach out to learn how GoInvo can help.</p>
          <ContactFormEmbed />
        </div>
      </section>
    </div>
  )
}
