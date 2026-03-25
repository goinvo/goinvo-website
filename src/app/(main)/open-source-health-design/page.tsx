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
  { value: '$1.8M', label: 'GoInvo investment\nin open source projects' },
  { value: '$2.5M', label: "Clients' investment\nin open source projects" },
  { value: '65+', label: 'Sponsored open source\nprojects since 2010' },
]

const fundingBenefits = [
  {
    image: '/images/open_source/trust.png',
    description:
      'Build trust and make healthcare truly accessible and open to a large community.',
  },
  {
    image: '/images/open_source/innovation.png',
    description:
      'Innovate by leveraging validated, user-centric design that has been improving for years.',
  },
  {
    image: '/images/open_source/public-good.png',
    description:
      'Invest in projects in public health and pioneer cutting-edge design for the common good.',
  },
]

const fundedProjects = [
  {
    title: 'Living Health Lab',
    description:
      'Living Health Lab is a tool that combines personal science, data visualization, and community to empower individuals as they explore their own health questions and pursue their healthiest lives.',
    image: '/images/open_source/health-lab.png',
    link: '/vision/living-health-lab',
    imagePosition: 'right' as const,
  },
  {
    title: 'Health Manager',
    description:
      'Rosie is an open source health manager to support people aggregate all their health data into a single location and share that data with their care team to meet their health goals.',
    image: '/images/open_source/health-manager.png',
    link: 'https://open-health-manager.github.io/Design/',
    imagePosition: 'left' as const,
  },
  {
    title: 'Health Picture',
    description:
      'hGraph can help healthcare professionals closely monitor their patient population while giving their patients a meaningful picture of their health.',
    image: '/images/open_source/health-picture.png',
    link: '/work/hgraph',
    imagePosition: 'right' as const,
  },
  {
    title: 'Health Data Ownership',
    description:
      "Establishing data ownership rights is critical to protecting patient care. We've mapped out the changes that need to happen and illustrated them to be accessible for both policy makers and the general public.",
    image: '/images/open_source/health-data-ownership.png',
    link: '/vision/own-your-health-data',
    imagePosition: 'left' as const,
  },
]

const conversations = [
  {
    title: "It's Time for Open Source Healthcare",
    description:
      'Designers can and should shape the future of healthcare, from how products and systems work to the underlying infrastructure and standards these products and services are built upon.',
    image: '/images/open_source/Artboard-1_4-techtalks.jpg',
    link: 'https://designmuseumfoundation.org/open-source-healthcare/',
  },
  {
    title: 'NEHIMSS 2019 ANNUAL CONFERENCE Juhan Sonin',
    description:
      'We demand open source healthcare. Because healthcare is too important to be closed. We, the atomic units of the health system, can bend it back to the light.',
    image: '/images/open_source/Artboard-1_3-techtalks.jpg',
    link: 'https://www.youtube.com/watch?v=vvnE6HyMY3E',
  },
  {
    title: 'Open Source Healthcare Journal',
    description:
      'Here is the debut issue of our Open Source Health Journal, advocating open source ideas to change healthcare for the better.',
    image: '/images/features/open-source-healthcare/open-source-healthcare-featured.jpg',
    link: 'https://opensourcehealthcare.org/static/open-source-healthcare-journal-557dd9ec213f654508564592e1ec74e8.pdf',
  },
]

function ProjectCard({
  project,
}: {
  project: (typeof fundedProjects)[number]
}) {
  const isExternal = project.link.startsWith('http')
  const textBlock = (
    <div className="flex flex-col justify-center p-8 lg:p-12">
      <h4 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary mb-4">
        {project.title}
      </h4>
      <p className="text-tertiary">{project.description}</p>
    </div>
  )
  const imageBlock = (
    <div className="flex items-center justify-center p-8">
      <Image
        src={cloudfrontImage(project.image)}
        alt={project.title}
        width={500}
        height={400}
        className="w-full h-auto"
      />
    </div>
  )

  const inner =
    project.imagePosition === 'left' ? (
      <div className="grid grid-cols-1 md:grid-cols-2">
        {imageBlock}
        {textBlock}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2">
        {textBlock}
        {imageBlock}
      </div>
    )

  if (isExternal) {
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-white shadow-card hover:shadow-card-hover transition-shadow no-underline mt-8"
      >
        {inner}
      </a>
    )
  }

  return (
    <Link
      href={project.link}
      className="block bg-white shadow-card hover:shadow-card-hover transition-shadow no-underline mt-8"
    >
      {inner}
    </Link>
  )
}

export default function OpenSourceHealthDesignPage() {
  return (
    <div>
      {/* Vision Statement + Stats */}
      <section style={{ backgroundColor: '#faf6f4' }} className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary">
                We envision a world where patients can be cared for with
                technology that can be trusted
                <span className="font-serif text-primary">.</span>
              </h1>
              <Button href="/contact" variant="primary" size="lg" className="mt-6">
                Get Involved
              </Button>
            </div>
            <div className="text-tertiary">
              <p className="mb-4">
                Our open source health design mission is to make our patterns,
                code, scripts, graphics, ideas, documents available to any
                designer, to any engineer, to any world citizen, to use and
                modify without restriction.
              </p>
              <p className="mb-4">
                We demand Open Source Health Design.
                <br />
                Because healthcare is too important to be closed.
                <br />
                When you use a healthcare service,
                <br />
                you don&apos;t know how it works,
                <br />
                why it works,
                <br />
                who it works best for, or if the results are true.
              </p>
              <p>It&apos;s our health. Our very lives are at stake.</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-[32px] leading-tight font-semibold text-primary mb-2">
                  {stat.value}
                </div>
                <p className="text-tertiary text-sm whitespace-pre-line">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source Projects Chart */}
      <section className="py-16">
        <div className="max-width content-padding text-center">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary mb-4">
            Open Source Health Design Projects
          </h2>
          <p className="text-gray mb-8 max-w-2xl mx-auto">
            In the past 10 years, we&apos;ve partnered with federal and
            nonprofit organizations to address the most pressing healthcare
            issues—with over 65 open source projects.
          </p>
          <OpenSourceChart />
        </div>
      </section>

      {/* Initiative Description + Client Logos */}
      <section style={{ backgroundColor: '#faf6f4' }} className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
            <div>
              <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary">
                Open Source Health Design is an initiative to drive transparency
                and innovation in healthcare
                <span className="font-serif text-primary">.</span>
              </h2>
            </div>
            <div className="text-tertiary">
              <p className="mb-4">
                Open Source Health Design is the design, testing, and deployment
                of healthcare services
                <br />
                from strategy to user interfaces to operational code,
                <br />
                open to inspection,
                <br />
                open to critique,
                <br />
                and open to continuous improvement.
              </p>
              <p>
                Open Source Healthcare Design
                <br />
                drives software transparency,
                <br />
                builds greater trust,
                <br />
                creates more reliable healthcare services,
                <br />
                and generates higher quality health outcomes for all.
              </p>
            </div>
          </div>

          {/* Client Logos */}
          <div>
            <h4 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.1875rem] lg:leading-[1.375rem] mb-4">
              We&apos;ve worked with...
            </h4>
            <ClientLogos />
          </div>
        </div>
      </section>

      {/* Eric Topol Quote */}
      <Quote
        text="The GoInvo studio is one of the most talented groups of designers I have ever met in the healthcare space. Not only are their ideas, designs, and graphics remarkable, but I haven't yet figured out how they know so much about medicine and its future."
        author="Eric Topol"
        role="MD, Director, Scripps Translational Science Institute"
      />

      {/* Funding Section */}
      <section style={{ backgroundColor: '#faf6f4' }} className="py-16">
        <div className="max-width content-padding text-center">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary mb-8">
            We&apos;re looking for funding
            <span className="font-serif text-primary">.</span>
          </h2>

          {/* Benefits with icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {fundingBenefits.map((benefit) => (
              <div key={benefit.image} className="px-4">
                <div className="mx-auto mb-4 w-[80%] max-w-[200px]">
                  <Image
                    src={cloudfrontImage(benefit.image)}
                    alt={benefit.description}
                    width={200}
                    height={200}
                    className="w-full h-auto"
                  />
                </div>
                <p className="text-tertiary">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Full-width project cards */}
          {fundedProjects.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}

          {/* Get in touch button */}
          <div className="mt-12">
            <Button href="/contact" variant="outline" size="lg">
              Get in touch
            </Button>
          </div>
        </div>
      </section>

      {/* Open Source Work */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary">
                Our design work, health research, and code are open source
                <span className="font-serif text-primary">.</span>
              </h2>
            </div>
            <div>
              <p className="text-tertiary">
                They are freely available for anyone to see, download, change,
                and redistribute (licensed under Creative Commons Attribution v4
                or Apache v2). Just as the Internet is built on open source
                technologies, open source healthcare democratizes the
                infrastructure of healthcare (healthIT) and allows for a global
                healthcare operating system.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Conversations */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-xl lg:text-2xl text-tertiary mb-8">
            Open Source Health Design conversations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {conversations.map((item) => (
              <a
                key={item.title}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow no-underline"
              >
                <div className="relative h-[200px] overflow-hidden">
                  <Image
                    src={cloudfrontImage(item.image)}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-[var(--transition-card)]"
                  />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-tertiary mb-1">{item.title}</p>
                  <p className="text-gray">{item.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16" style={{ backgroundColor: '#faf6f4' }}>
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-tertiary mb-4">
                Let&apos;s build better care together!
              </h2>
              <p className="text-tertiary mb-6">
                Interested in using, contributing to, or funding these projects?
                <br />
                We help organizations and individuals set up and use our open
                source work.
                <br />
                Reach out to know more about the current partnership
                opportunities available!
              </p>
              <Button href="/contact" variant="primary" size="lg">
                Get Involved
              </Button>
            </div>
            <div className="hidden md:block">
              <Image
                src={cloudfrontImage('/images/open_source/cta-community.png')}
                alt="Open source community"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
