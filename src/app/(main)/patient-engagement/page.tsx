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
        className="relative min-h-[60vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/patient-engagement/patient_hero.jpg')})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-white mb-4">
            Designing patient engagement experiences that connect, educate, and empower<span className="text-primary font-serif">.</span>
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl">
            We craft impactful communication that drive adoption, trust, and outcomes.
          </p>
          <Button href="/contact" variant="primary" size="lg">
            Let&apos;s discuss your project
          </Button>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16">
        <div className="max-width content-padding">
          <p className="text-gray text-lg max-w-3xl">
            At GoInvo, we focus on patient engagement through human-centered experiences
            that meet people where they are, whether they&apos;re navigating a chronic condition,
            participating in medical research, or simply trying to better understand their
            health data. Our approach combines empathy and research to make complex healthcare
            information accessible. We create digital tools and resources that empower patients,
            caregivers, and healthcare providers to make informed decisions and take meaningful action.
          </p>
        </div>
      </section>

      {/* Our Approach */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">Our approach</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {approaches.map((approach) => (
              <div key={approach.title}>
                <h3 className="font-semibold mb-2">{approach.title}</h3>
                <p className="text-gray text-md">{approach.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-8">
        <div className="max-width content-padding text-center">
          <h3 className="font-semibold mb-4">Trusted by ambitious startups, Fortune 500&apos;s, and government agencies</h3>
          <ClientLogos />
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-4">Driving results for patient engagement.</h2>
          <Button href="/contact" variant="primary" size="lg" className="mb-8">
            Let&apos;s discuss your project
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {caseStudies.map((study) => (
              <Link
                key={study.title}
                href={study.link}
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <Image
                    src={cloudfrontImage(study.image)}
                    alt={study.title}
                    width={500}
                    height={312}
                    className="w-full h-full object-cover image--interactive"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-semibold mb-2 transition-colors">
                    {study.title}
                  </h3>
                  <p className="text-gray text-md">{study.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-blue-light py-16">
        <div className="max-width-md content-padding mx-auto text-center">
          <p className="font-serif text-2xl mb-2">
            We ship software that works.<br />
            Let&apos;s build together!
          </p>
          <p className="text-gray mb-8">Reach out to learn how GoInvo can help.</p>
          <ContactFormEmbed />
        </div>
      </section>
    </div>
  )
}
