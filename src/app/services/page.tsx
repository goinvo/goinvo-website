import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Quote } from '@/components/ui/Quote'
import { Reveal } from '@/components/ui/Reveal'
import { Divider } from '@/components/ui/Divider'
import { Button } from '@/components/ui/Button'
import { CalendlyEmbed } from '@/components/forms/CalendlyEmbed'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'UX Design Services in Boston - GoInvo',
  description:
    'Our UX design process is tailored to your project. Contact GoInvo today to get started in designing a beautiful UX for your product!',
}

const services = [
  {
    title: 'Design for Healthcare',
    description:
      'We design software that improves care, reduces friction, and drives better outcomes — from clinical decision support to policy-driven health data systems. With 20+ years of experience, we navigate clinical complexity, policy constraints, and stakeholder needs to make health systems work better for everyone.',
    methods: [
      'Clinical decision support design',
      'EHR integrations & patient workflows',
      'Public health dashboards',
      'Data visualization for policy and advocacy',
    ],
    image: '/images/services/hgraph-gold.jpg',
    color: '#EEE0CA',
    exampleLink: '/work?category=healthcare',
    exampleTitle: 'Explore our healthcare work',
  },
  {
    title: 'Design for Government',
    description:
      'We design public services that are more modern, usable, equitable, and human. We partner with federal, state, and local agencies to transform services that matter — from applications that help residents get the benefits they need to digital tools for policy makers.',
    methods: [
      'Public benefits service design',
      'Inclusive research & accessibility audits',
      'Prototyping for civic tech and policy',
      'Legacy system UX modernization',
    ],
    image: '/images/services/gov_snap.jpg',
    color: '#CBE7F4',
    exampleLink: '/work?category=government',
    exampleTitle: 'Explore our government work',
  },
  {
    title: 'Design for Enterprise',
    description:
      'We streamline internal tools and systems that power big organizations for better alignment, efficiency, and insight. We work with large teams to improve internal platforms, streamline complex workflows, and align business and user goals — delivering better tools quickly and collaboratively to reduce friction and boost efficiency.',
    methods: [
      'Internal platforms & dashboards',
      'Enterprise UX audits & redesigns',
      'Workflow optimization & team alignment',
      'Strategic design for regulated environments',
    ],
    image: '/images/services/enterprise_cotiviti.jpg',
    color: '#C0EEEC',
    exampleLink: '/work?category=enterprise',
    exampleTitle: 'Explore our enterprise work',
  },
  {
    title: 'Design for AI',
    description:
      'We design AI-powered tools that connect humans and machines, ensuring they work together seamlessly. We create human-centered interactions that make intelligent tools clear, explainable, and usable, aligned with human needs from day one.',
    methods: [
      'UX for ML-powered products',
      'Human-AI interaction design',
      'Explainability & trust-building interfaces',
      'Ethical frameworks & transparency in design',
    ],
    image: '/images/services/ai_augment.jpg',
    color: '#CFD6FF',
    exampleLink: '/work?category=AI',
    exampleTitle: 'Explore our AI work',
  },
]

const whatWeDo = [
  {
    title: 'Clarify Product Strategy & Vision',
    descriptionHtml: true,
    description:
      'We help teams <strong>align around a clear product direction, providing experienced, unbiased input</strong> — whether you\'re evolving what exists, envisioning a new concept, or clarifying long-term goals.',
    links: [
      { href: '/work/mitre-shr', title: 'Standard health record' },
      { href: '/vision/national-cancer-navigation', title: 'National Cancer Navigation' },
    ],
  },
  {
    title: 'De-risking projects',
    descriptionHtml: true,
    description:
      'We keep projects moving through the mess — <strong>navigating org changes, tight timelines, and shifting priorities</strong> so good ideas don\'t die on the whiteboard.',
    links: [
      { href: '/work/mitre-flux-notes', title: 'MITRE Flux Notes' },
      { href: '/work/insidetracker-nutrition-science', title: 'InsideTracker' },
    ],
  },
  {
    title: 'Find the right problems to solve',
    descriptionHtml: true,
    description:
      'Through <strong>user research, system mapping, and insight synthesis,</strong> we uncover real-world needs — guiding smarter investment and more focused solutions.',
    links: [
      { href: '/work/3m-coderyte', title: '3M Coderyte' },
      { href: '/work/mass-snap', title: 'Massachusetts SNAP' },
    ],
  },
  {
    title: 'Move fast and test often',
    descriptionHtml: true,
    description:
      'We <strong>rapidly prototype and frequently test with real users and data</strong> — reducing risk, and informing decision-making for real-world use.',
    links: [
      { href: '/work/partners-insight', title: 'Mass General Brigham IRB Insight' },
      { href: '/work/wuxi-nextcode-familycode', title: 'WuXi NextCODE FamilyCode' },
    ],
  },
  {
    title: 'Deliver & ship',
    descriptionHtml: true,
    description:
      'Our dedicated team will <strong>integrate seamlessly with yours to ship better tools, improve performance, and keep strategy evolving</strong> — from concept to launch to impact.',
    links: [
      { href: '/work/all-of-us', title: 'All of Us Research Program' },
      { href: '/work/3m-coderyte', title: '3M Coderyte' },
    ],
  },
]

export default function ServicesPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-center bg-top"
        style={{
          backgroundImage: `url(${cloudfrontImage('/images/services/hand-drawing.jpg')})`,
          viewTransitionName: 'hero-image',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-white" style={{ viewTransitionName: 'page-title' }}>
            Disrupt from within,<br />
            Reinvent your product,<br />
            Change the market<span className="text-primary font-serif">.</span>
          </h1>
        </div>
      </section>

      {/* Why Hire */}
      <Reveal style="slide-up">
        <section className="py-16 md:py-24">
          <div className="max-width content-padding">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h2 className="font-serif text-2xl mb-4">Why hire GoInvo</h2>
              <p className="text-gray mb-4">
                We help you move fast, reduce risk, and deliver better systems — across
                healthcare, government, enterprise, and AI. Let&apos;s talk about your project
                and how GoInvo can help.
              </p>
              <p className="text-gray mb-4">
                Drop us an email at{' '}
                <a href="mailto:info@goinvo.com" className="text-primary">
                  info@goinvo.com
                </a>
              </p>
              <p className="text-gray mb-8">Or, talk to us live on Zoom.</p>
              <Button href="#calendly" variant="secondary" size="lg">
                Schedule a chat
              </Button>
            </div>
          </div>
        </div>
        </section>
      </Reveal>

      {/* What We Do */}
      <Reveal style="slide-up">
        <section className="py-16">
          <div className="max-width content-padding">
            <h2 className="font-serif text-2xl mb-2">What We Do</h2>
          <p className="text-gray mb-12">
            We design and deliver digital systems — from idea to execution. Our team joins
            where we&apos;re needed most, offering end-to-end product design or focused support
            to move things forward.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {whatWeDo.map((item) => (
              <div key={item.title}>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-gray text-md mb-3" dangerouslySetInnerHTML={{ __html: item.description }} />
                <div className="flex flex-wrap gap-4">
                  {item.links.map((link) => (
                    <Link key={link.href} href={link.href} className="text-primary text-sm">
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Divider className="mt-16" />
        </div>
        </section>
      </Reveal>

      {/* Service Areas */}
      <section className="py-16">
        <div className="max-width content-padding">
          {services.map((service) => (
            <div key={service.title} className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
              <div>
                <h3 className="font-semibold text-lg mb-1">{service.title}</h3>
                <div className="h-1 w-16 mb-4" style={{ backgroundColor: service.color }} />
                <p className="text-gray mb-4">{service.description}</p>
                <ul className="space-y-1 text-gray text-md mb-4">
                  {service.methods.map((method) => (
                    <li key={method} className="flex items-start gap-2">
                      <span className="text-primary mt-1">-</span>
                      {method}
                    </li>
                  ))}
                </ul>
                <Link href={service.exampleLink} className="text-primary text-sm">
                  {service.exampleTitle} &rarr;
                </Link>
              </div>
              <div>
                <Image
                  src={cloudfrontImage(service.image)}
                  alt={service.title}
                  width={800}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <Reveal style="slide-up">
        <section className="bg-gray-light py-16">
          <div className="max-width content-padding">
            <Quote
              text="With Invo, design wasn't just design. It impacted our IP portfolio. It changed our business."
              author="Serban Georgescu, MD"
              role="InfoBionic Director of Clinical Development"
            />
          </div>
        </section>
      </Reveal>

      {/* Calendly */}
      <section className="py-16" id="calendly">
        <div className="max-width content-padding text-center">
          <h2 className="font-serif text-2xl mb-8">Choose a time to talk about your project.</h2>
          <CalendlyEmbed />
        </div>
      </section>

      {/* Contact Form */}
      <section className="bg-gray-light py-16">
        <div className="max-width-md content-padding mx-auto">
          <ContactFormEmbed />
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Image
                src={cloudfrontImage('/images/services/emerging-tech-shr-layers.jpg')}
                alt="Emerging technology"
                width={400}
                height={300}
                className="w-full h-auto mb-4"
              />
              <h4 className="font-semibold mb-2">Emerging technology</h4>
              <p className="text-gray text-md mb-3">We&apos;ve worked on projects across the spectrum of emerging technology from artificial intelligence for medical coding to self-documenting voice encounters and wearable devices.</p>
              <div className="flex flex-col gap-1">
                <Link href="/vision/from-bathroom-to-healthroom" className="text-primary text-sm">
                  From bathroom to healthroom
                </Link>
                <Link href="/work/wuxi-nextcode" className="text-primary text-sm">
                  WuXi NextCODE
                </Link>
              </div>
            </div>
            <div>
              <Image
                src={cloudfrontImage('/images/services/doh-preview.jpg')}
                alt="Information visualizations"
                width={400}
                height={300}
                className="w-full h-auto mb-4"
              />
              <h4 className="font-semibold mb-2">Information visualizations</h4>
              <p className="text-gray text-md mb-3">We create beautiful printed and interactive health-related data visualizations that span payment dashboards to visualizing the social determinants of health to clinical practice guidelines for Zika.</p>
              <div className="flex flex-col gap-1">
                <Link href="/vision/determinants-of-health" className="text-primary text-sm">
                  Determinants of Health
                </Link>
                <Link href="/vision/clinical-practice-guidelines-for-zika" className="text-primary text-sm">
                  Clinical Practice Guidelines for Zika
                </Link>
              </div>
            </div>
            <div>
              <Image
                src={cloudfrontImage('/images/services/inspired-ehrs-book.jpg')}
                alt="Open source healthcare products"
                width={400}
                height={300}
                className="w-full h-auto mb-4"
              />
              <h4 className="font-semibold mb-2">Open source healthcare products</h4>
              <p className="text-gray text-md mb-3">We&apos;ve built 10 of our own open source products and integrated open source code with a range of clients. Our services range from guidance to design and development.</p>
              <div className="flex flex-col gap-1">
                <Link href="/work/inspired-ehrs" className="text-primary text-sm">
                  Inspired EHRs
                </Link>
                <Link href="/work/paintrackr" className="text-primary text-sm">
                  PainTrackr
                </Link>
                <Link href="/open-source-health-design" className="text-primary text-sm">
                  See our open source design
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
