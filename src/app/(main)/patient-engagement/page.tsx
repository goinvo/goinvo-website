import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { ClientLogos } from '@/components/ui/ClientLogos'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Designing patient engagement experiences that connect, educate, and empower',
  description:
    'We craft impactful communication that drive adoption, trust, and outcomes.',
}

const approaches = [
  {
    title: 'Human-Centered from the Start',
    description:
      'We embed ourselves in the patient experience, becoming participants in the programs we design. We interview patients, caregivers, clinicians, and researchers to understand not just what people need, but why they need it and what barriers stand in their way.',
  },
  {
    title: 'Designing for Inclusivity',
    description:
      'We design for the full spectrum of health literacy, cultural backgrounds, physical abilities, and life circumstances. Whether creating experiences for underrepresented populations in biomedical research or developing educational tools for the 88% of US adults who lack health literacy, we ensure our solutions work for everyone.',
  },
  {
    title: 'Evidence-Based Design',
    description:
      "Our work is grounded in behavioral science frameworks like the Health Belief Model, educational research, and accessibility standards. We don't guess. We design based on what research tells us will create genuine behavior change and engagement.",
  },
  {
    title: 'Collaborative Partnership',
    description:
      'We work alongside clinical teams, program offices, research groups, and technology partners to translate complex requirements into human-friendly experiences. We advocate for the patient voice in every decision, balancing user needs with policy constraints, technical feasibility, and program goals.',
  },
]

const caseStudies = [
  {
    title: "NIH's All of Us Research Program",
    description:
      'Through participant-focused design leadership and research, we delivered experiences and strategies that impacted an NIH research program, aiming to build the largest medical data repository for research.',
    image: '/images/case-studies/aou/01-hero-image-2.jpg',
    link: '/work/all-of-us',
  },
  {
    title: 'Understanding Health Data to Drive Patient Engagement',
    description:
      'We helped FasterCures define what health data is and launch a patient-engagement experience that blends behavioral science and inclusive design to educate patients about their health data. Working closely with clinical and research teams, including patient advocacy groups, we created communication experiences that meet users where they are\u2014regardless of literacy, language, or background.',
    image: '/images/patient-engagement/fastercures.jpg',
    link: '/work/fastercures-health-data-basics',
  },
  {
    title: 'Gently Communicating Carrier Status to New Parents',
    description:
      "For genetic services, we've simplified highly technical content for audiences with varying levels of health literacy. Our carrier screening service for WuXi NextCODE transformed industry jargon and ambiguous clinical reports into clear, human-friendly information that both patients and clinicians could understand without requiring a genomics degree.",
    image: '/images/patient-engagement/wuxi-carrier-code.jpg',
    link: '/work/wuxi-nextcode-familycode',
  },
]

export default function PatientEngagementPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative h-[450px] bg-cover bg-top"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/patient-engagement/patient_hero.jpg')})` }}
      >
        <div className="relative h-full max-width">
          <div className="absolute bottom-0 left-0 w-full lg:w-[385px] bg-white content-padding py-8">
            <h1 className="header-xl m-0">
              Designing patient engagement experiences that connect, educate, and empower<span className="text-primary font-serif">.</span>
            </h1>
            <p className="text-gray mt-4 mb-4">
              We craft impactful communication that drive adoption, trust, and outcomes.
            </p>
            <Button href="/contact" variant="primary" size="md">
              Let&apos;s discuss your project
            </Button>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding">
          <p className="max-w-3xl">
            At GoInvo, we focus on patient engagement through human-centered experiences
            that meet people where they are, whether they&rsquo;re navigating a chronic condition,
            participating in medical research, or simply trying to better understand their
            health data. Our approach combines empathy and research to make complex healthcare
            information accessible. We create digital tools and resources that empower patients,
            caregivers, and healthcare providers to make informed decisions and take meaningful action.
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-16 text-tertiary">
        <div className="max-width content-padding">
          <h2 className="header-xl text-black text-center mt-0 mb-8">Our Approach</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {approaches.map((approach) => (
              <div key={approach.title}>
                <h3 className="font-sans text-base font-semibold text-black mb-2">{approach.title}</h3>
                <p className="mt-2">{approach.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-16 text-tertiary">
        <div className="max-width content-padding">
          <hr className="border-0 border-t border-gray-medium mb-12 mx-auto max-w-full" />
          <div className="text-center">
            <h3 className="font-sans text-base font-bold mb-6">
              Trusted by ambitious startups, Fortune 500&apos;s, and government agencies
            </h3>
            <ClientLogos variant="patient-engagement" />
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding text-center">
          <h2 className="header-xl text-tertiary mt-0 mb-8">
            Driving results for patient engagement<span className="text-primary font-serif">.</span>
          </h2>
          <Button href="/contact" variant="primary" size="md" className="mb-12">
            Let&apos;s discuss your project
          </Button>

          {caseStudies.map((study) => (
            <Link
              key={study.title}
              href={study.link}
              className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-500 ease-out mb-8 text-left no-underline"
            >
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
                <div className="p-8 lg:p-12">
                  <h4 className="header-xl text-tertiary mt-0 mb-4">
                    {study.title}
                  </h4>
                  <p className="header-lg text-tertiary mt-0 mb-4">
                    {study.description}
                  </p>
                  <p className="text-secondary mt-4 mb-0">Read Case Study</p>
                </div>
                <div className="flex items-center justify-center px-8 py-10 lg:px-0 lg:py-0">
                  <Image
                    src={cloudfrontImage(study.image)}
                    alt={study.title}
                    width={400}
                    height={270}
                    className="h-auto w-full max-w-[400px] object-contain"
                  />
                </div>
              </div>
            </Link>
          ))}
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
