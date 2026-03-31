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

export default function AIPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/ai/ai_hero_2_sm.jpg')})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-white mb-4">
            Designing AI-Powered Experiences for People and Organizations<span className="text-primary font-serif">.</span>
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl">
            We design tools and experiences with AI so people and machines can
            skillfully work together.
          </p>
          <Button href="/contact" variant="primary" size="lg">
            Let&apos;s discuss your project
          </Button>
        </div>
      </section>

      {/* Results */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">What results are you looking for?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result) => (
              <p key={result.label} className="font-semibold">
                <strong>{result.label}</strong> {result.text}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">Driving results services with AI</h2>
          <div className="space-y-8">
            {caseStudies.map((study) => (
              <Link
                key={study.title}
                href={study.link}
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="aspect-[16/10] md:aspect-auto overflow-hidden">
                    <Image
                      src={cloudfrontImage(study.image)}
                      alt={study.title}
                      width={600}
                      height={375}
                      className="w-full h-full object-cover image--interactive"
                    />
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <p className="text-xs uppercase tracking-wider text-gray font-semibold mb-1">
                      {study.title}
                    </p>
                    <h3 className="font-serif text-xl mb-2 transition-colors">
                      {study.subtitle}
                    </h3>
                    <p className="text-gray text-md">{study.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 80/20 AI Fit Diagram */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="max-w-3xl mx-auto mb-8">
            <p className="font-serif text-lg mb-6">
              In the land of AI products, designers will split time between problem solving, facilitation, and bending AI services versus tooling the individual GenAI and agentic services.
            </p>
          </div>
          <div className="grid grid-cols-[4fr_1fr] gap-4 max-w-3xl mx-auto mb-4">
            <div className="border-t-2 border-primary pt-4">
              <p className="font-serif text-lg">
                Most design will live here in the <span className="font-serif text-3xl text-primary">80<span className="text-xl">%</span></span>
                <br />using AI services to facilitate, problem solve, drive better decisions, and productionize products
              </p>
            </div>
            <div className="border-t-2 border-secondary pt-4">
              <p className="font-serif text-lg">
                <span className="font-serif text-3xl text-secondary">20<span className="text-xl">%</span></span> Tooling
              </p>
            </div>
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-serif text-lg">
              GoInvo lives here as toolmakers and service shapers.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Storytelling Featured Project */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <Link
            href="/vision/visual-storytelling-with-genai"
            className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="aspect-[16/10] md:aspect-auto overflow-hidden">
                <Image
                  src={cloudfrontImage('/images/features/visual-storytelling-with-genai/genai-hero-3.jpg')}
                  alt="Visual Storytelling with GenAI"
                  width={600}
                  height={375}
                  className="w-full h-full object-cover image--interactive"
                />
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-center">
                <p className="text-xs uppercase tracking-wider text-gray font-semibold mb-1">
                  Featured
                </p>
                <h3 className="font-serif text-xl mb-2 transition-colors">
                  Reimagining Visual Storytelling with GenAI
                </h3>
                <p className="text-gray text-md">
                  GenAI accelerates our design process and enhances our ability to tell compelling stories through visuals.
                </p>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-8">
        <div className="max-width content-padding text-center">
          <p className="font-semibold mb-4">Trusted by ambitious startups, Fortune 500&apos;s, and government agencies</p>
          <ClientLogos variant="ai" />
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="max-width-md content-padding mx-auto">
          <ContactFormEmbed />
        </div>
      </section>
    </div>
  )
}
