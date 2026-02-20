import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Quote } from '@/components/ui/Quote'
import { ClientLogos } from '@/components/ui/ClientLogos'
import { OpenSourceChart } from '@/components/open-source/OpenSourceChart'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Open Source Health Design',
  description:
    "Healthcare needs to be open. We've built 10 of our own open source products and integrated open source code with a range of clients. Our services range from guidance to design and development.",
}

const stats = [
  { value: '$1.8M', label: 'GoInvo investment in open source projects' },
  { value: '$2.5M', label: "Clients' investment in open source projects" },
  { value: '65+', label: 'Sponsored open source projects since 2010' },
]

const fundingBenefits = [
  {
    title: 'Trust & Accessibility',
    description:
      'Build trust and make healthcare truly accessible and open to a large community.',
  },
  {
    title: 'Innovation',
    description:
      'Innovate by leveraging validated, user-centric design that has been improving for years.',
  },
  {
    title: 'Public Good',
    description:
      'Invest in projects in public health and pioneer cutting-edge design for the common good.',
  },
]

const fundedProjects = [
  {
    title: 'Living Health Lab',
    description: 'Living Health Lab is a tool that combines personal science, data visualization, and community to empower individuals as they explore their own health questions and pursue their healthiest lives.',
    image: '/images/open_source/health-lab.png',
    link: '/vision/living-health-lab',
  },
  {
    title: 'Health Manager',
    description: 'Rosie is an open source health manager to support people aggregate all their health data into a single location and share that data with their care team to meet their health goals.',
    image: '/images/open_source/health-manager.png',
    link: 'https://github.com/goinvo',
  },
  {
    title: 'Health Picture (hGraph)',
    description: 'hGraph can help healthcare professionals closely monitor their patient population while giving their patients a meaningful picture of their health.',
    image: '/images/open_source/health-picture.png',
    link: '/work/hgraph',
  },
  {
    title: 'Health Data Ownership',
    description: "Establishing data ownership rights is critical to protecting patient care. We've mapped out the changes that need to happen and illustrated them to be accessible for both policy makers and the general public.",
    image: '/images/open_source/health-data-ownership.png',
    link: '/vision/own-your-health-data',
  },
]

const conversations = [
  {
    title: "It's Time for Open Source Healthcare",
    description: 'Designers can and should shape the future of healthcare, from how products and systems work to the underlying infrastructure and standards these products and services are built upon.',
    link: 'https://designmuseumfoundation.org',
  },
  {
    title: 'NEHIMSS 2019 Annual Conference',
    description: 'We demand open source healthcare. Because healthcare is too important to be closed. We, the atomic units of the health system, can bend it back to the light.',
    link: 'https://www.youtube.com',
  },
  {
    title: 'Open Source Healthcare Journal',
    description: 'Here is the debut issue of our Open Source Health Journal, advocating open source ideas to change healthcare for the better.',
    link: 'https://opensourcehealthcare.org',
  },
]

export default function OpenSourceHealthDesignPage() {
  return (
    <div>
      {/* Vision Statement */}
      <section className="py-16 md:py-24">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-serif text-2xl mb-4">
                We envision a world where patients can be cared for with technology that can be trusted.
              </h2>
            </div>
            <div>
              <p className="text-gray mb-4">
                Our open source health design mission is to make our patterns, code,
                scripts, graphics, ideas, documents available to any designer, to any
                engineer, to any world citizen, to use and modify without restriction.
              </p>
              <p className="text-gray mb-4">
                Because healthcare is too important to be closed. When you use a healthcare
                service, you don&apos;t know how it works, why it works, who it works best for,
                or if the results are true. It&apos;s our health. Our very lives are at stake.
              </p>
              <p className="text-gray font-semibold">
                We demand Open Source Health Design.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-3xl text-primary mb-2">{stat.value}</div>
                <p className="text-gray text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source Projects Chart */}
      <section className="py-16">
        <div className="max-width content-padding text-center">
          <h2 className="font-serif text-2xl mb-4 text-secondary">
            Open Source Health Design Projects
          </h2>
          <p className="text-gray mb-8 max-w-2xl mx-auto">
            In the past 10 years, we&apos;ve partnered with federal and nonprofit
            organizations to address the most pressing healthcare issues — with
            over 65 open source projects.
          </p>
          <OpenSourceChart />
        </div>
      </section>

      {/* Initiative Description */}
      <section className="py-16">
        <div className="max-width-md content-padding mx-auto">
          <p className="text-gray text-lg text-center mb-6">
            Open Source Healthcare Design is the design, testing, and deployment of
            healthcare services — from strategy to user interfaces to operational code —
            open to inspection, open to critique, and open to continuous improvement.
          </p>
          <p className="text-gray text-md text-center">
            Open Source Healthcare Design drives software transparency, builds greater
            trust, creates more reliable healthcare services, and generates higher quality
            health outcomes for all.
          </p>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-8">
        <div className="max-width content-padding text-center">
          <p className="font-semibold mb-4">We&apos;ve worked with...</p>
          <ClientLogos />
        </div>
      </section>

      {/* Eric Topol Quote */}
      <Quote
        text="The GoInvo studio is one of the most talented groups of designers I have ever met in the healthcare space. Not only are their ideas, designs, and graphics remarkable, but I haven't yet figured out how they know so much about medicine and its future."
        author="Eric Topol"
        role="MD, Director, Scripps Translational Science Institute"
      />

      {/* Funding Section */}
      <section className="bg-gray-light py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-4 text-center">
            We&apos;re looking for funding
          </h2>
          <p className="text-gray text-center mb-12 max-w-2xl mx-auto">
            Help us build the future of open source healthcare.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {fundingBenefits.map((benefit) => (
              <div key={benefit.title} className="text-center">
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-gray text-md">{benefit.description}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {fundedProjects.map((project) => (
              <Link
                key={project.title}
                href={project.link}
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
              >
                <div className="aspect-square overflow-hidden">
                  <Image
                    src={cloudfrontImage(project.image)}
                    alt={project.title}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover image--interactive"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-sm transition-colors">
                    {project.title}
                  </h4>
                  <p className="text-gray text-sm mt-1">{project.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source Conversations */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">Open Source Health Design conversations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {conversations.map((item) => (
              <a
                key={item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-6 bg-gray-light hover:shadow-card-hover transition-shadow no-underline"
              >
                <h3 className="font-semibold mb-2 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray text-md">{item.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-secondary py-16 text-center">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl text-white mb-4">
            Let&apos;s build better care together!
          </h2>
          <p className="text-white/80 mb-4">
            Interested in using, contributing to, or funding these projects?
          </p>
          <p className="text-white/80 mb-4">
            We help organizations and individuals set up and use our open source work.
          </p>
          <p className="text-white/80 mb-8">
            Reach out to know more about the current partnership opportunities available!
          </p>
          <Button href="/contact" variant="primary" size="lg">
            Get Involved
          </Button>
        </div>
      </section>
    </div>
  )
}
