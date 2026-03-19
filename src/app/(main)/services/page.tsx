import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Quote } from '@/components/ui/Quote'
import { Divider } from '@/components/ui/Divider'
import { CalendlyEmbed } from '@/components/forms/CalendlyEmbed'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'UX Design Services in Boston',
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
    example: {
      link: '/work?category=healthcare',
      title: 'Explore our healthcare work \u2192',
    },
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
    example: {
      link: '/work?category=government',
      title: 'Explore our government work \u2192',
    },
  },
  {
    title: 'Design for Enterprise',
    description:
      'We redesign the internal tools and systems that power big organizations. We work with large teams to improve platforms, simplify workflows, and align business and user goals. Better tools, faster.',
    methods: [
      'Internal platforms & dashboards',
      'Enterprise UX audits & redesigns',
      'Workflow optimization & team alignment',
      'Strategic design for regulated environments',
    ],
    image: '/images/services/enterprise_cotiviti.jpg',
    color: '#C0EEEC',
    example: {
      link: '/work?category=enterprise',
      title: 'Explore our enterprise work \u2192',
    },
  },
  {
    title: 'Design for AI',
    description:
      'We design AI-powered tools that people actually trust and use. Our focus: making intelligent systems clear, explainable, and useful. Not just technically impressive.',
    methods: [
      'UX for ML-powered products',
      'Human-AI interaction design',
      'Explainability & trust-building interfaces',
      'Ethical frameworks & transparency in design',
    ],
    image: '/images/services/ai_augment.jpg',
    color: '#CFD6FF',
    example: {
      link: '/work?category=AI',
      title: 'Explore our AI work \u2192',
    },
  },
]

const whatWeDo = [
  {
    title: 'Clarify Product Strategy & Vision',
    description:
      'We help teams <strong>align around a clear product direction, providing experienced, unbiased input</strong> — whether you\'re evolving what exists, envisioning a new concept, or clarifying long-term goals.',
    links: [
      { href: '/work/mitre-shr', title: 'Standard health record' },
      { href: '/vision/national-cancer-navigation', title: 'National Cancer Navigation' },
    ],
  },
  {
    title: 'De-risking projects',
    description:
      'We keep projects moving through the mess — <strong>navigating org changes, tight timelines, and shifting priorities</strong> so good ideas don\'t die on the whiteboard.',
    links: [
      { href: '/work/mitre-flux-notes', title: 'MITRE Flux Notes' },
      { href: '/work/insidetracker-nutrition-science', title: 'InsideTracker' },
    ],
  },
  {
    title: 'Find the right problems to solve',
    description:
      'Through <strong>user research, system mapping, and insight synthesis,</strong> we uncover real-world needs — guiding smarter investment and more focused solutions.',
    links: [
      { href: '/work/3m-coderyte', title: '3M Coderyte' },
      { href: '/work/mass-snap', title: 'Massachusetts SNAP' },
    ],
  },
  {
    title: 'Move fast and test often',
    description:
      'We <strong>rapidly prototype and frequently test with real users and data</strong> — reducing risk, and informing decision-making for real-world use.',
    links: [
      { href: '/work/partners-insight', title: 'Mass General Brigham IRB Insight' },
      { href: '/work/wuxi-nextcode-familycode', title: 'WuXi NextCODE FamilyCode' },
    ],
  },
  {
    title: 'Deliver & ship',
    description:
      'Our team <strong>embeds with yours to ship better tools, improve performance, and keep strategy on track</strong>. Through launch and beyond.',
    links: [
      { href: '/work/all-of-us', title: 'All of Us Research Program' },
      { href: '/work/3m-coderyte', title: '3M Coderyte' },
    ],
  },
]

export default function ServicesPage() {
  return (
    <div>
      {/* Main content wrapper — matches Gatsby single max-width block */}
      <div className="max-width content-padding lg:py-8">

        {/* Why hire GoInvo */}
        <div className="flex flex-col items-center py-8">
          <div className="w-full lg:w-1/2">
            <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light mb-2">
              Why hire GoInvo
            </p>
            <p className="text-gray">
              We help you move fast, reduce risk, and deliver better systems — across
              healthcare, government, enterprise, and AI. Let&apos;s talk about your project
              and how GoInvo can help.
            </p>
            <p className="text-gray">
              Drop us an email at{' '}
              <a href="mailto:info@goinvo.com">info@goinvo.com</a>
            </p>
            <p className="text-gray">Or, talk to us live on Zoom.</p>
            <Link
              href="#calendly-open-office-hours"
              className="block w-full text-center bg-primary text-white font-semibold uppercase tracking-wider no-underline py-3 px-6 mt-8 mb-8 hover:bg-primary-dark transition-colors"
            >
              Schedule a chat
            </Link>
          </div>
        </div>

        {/* What We Do */}
        <div>
          <h3 className="font-serif text-[1.5rem] leading-[2.125rem] font-light mt-8 mb-0">
            What We Do
          </h3>
          <p className="text-gray">
            We design and deliver digital systems — from idea to execution. Our team joins
            where we&apos;re needed most, offering end-to-end product design or focused support
            to move things forward.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 pb-8">
            {whatWeDo.map((item) => (
              <div key={item.title} className="lg:pr-8 mb-8 lg:py-8 first:lg:py-8">
                <h4 className="font-sans font-semibold text-base mt-0 mb-2">
                  {item.title}
                </h4>
                <p
                  className="text-gray text-md mt-2"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
                <div className="flex flex-wrap gap-x-8">
                  {item.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Divider />
        </div>

        {/* Service Categories */}
        <div>
          {services.map((service) => (
            <div key={service.title} className="grid grid-cols-1 lg:grid-cols-2">
              <div className="lg:pr-8 mb-4">
                <div className="lg:pb-8">
                  <h4 className="font-sans font-semibold text-base mb-0">
                    {service.title}
                  </h4>
                  <hr
                    className="border-0 h-[2px] w-full my-4"
                    style={{ backgroundColor: service.color }}
                  />
                  <p className="text-gray mb-2">{service.description}</p>
                  <ul className="ul text-gray mt-2 mb-4">
                    {service.methods.map((method) => (
                      <li key={method}>{method}</li>
                    ))}
                  </ul>
                  <p className="text-gray">
                    <Link href={service.example.link}>
                      {service.example.title}
                    </Link>
                  </p>
                </div>
              </div>
              <div className="lg:pl-8">
                <div className="py-8">
                  <Image
                    src={cloudfrontImage(service.image)}
                    alt={service.title}
                    width={800}
                    height={500}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Certifications */}
        <div className="py-8">
          <Divider />
          <h3 className="font-serif text-[1.5rem] leading-[2.125rem] font-light mt-8 mb-2">
            Our certifications and contracts
          </h3>
          <p className="text-gray text-md">
            Our contracts prequalify us for IT professional services as a
            trusted vendor for state and federal agencies.
          </p>
          <ul className="ul text-gray mb-8">
            <li>State of MA: <strong>ITS81</strong></li>
            <li>Federal: <strong>GSA 47QTCA26D001W</strong></li>
          </ul>
          <p className="text-gray text-md">
            <Link href="/government">Learn more about our government work</Link>.
          </p>
          <Divider />
        </div>
      </div>

      {/* Quote */}
      <Quote
        text="With Invo, design wasn&rsquo;t just design. It impacted our IP portfolio. It changed our business."
        author="Serban Georgescu, MD"
        role="InfoBionic Director of Clinical Development"
        background="gray"
      />

      {/* Calendly */}
      <div className="max-width content-padding py-8 mb-8">
        <div className="max-width content-padding py-8">
          <h2
            className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center"
            id="calendly-open-office-hours"
            style={{ marginBottom: '-50px' }}
          >
            Choose a time to talk about your project.
          </h2>
          <CalendlyEmbed />
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-gray-light">
        <div className="py-8">
          <div className="max-width max-width-md content-padding">
            <ContactFormEmbed />
          </div>
        </div>
      </div>

      {/* Bottom 3-column features */}
      <div className="max-width content-padding py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <div className="relative h-[250px] overflow-hidden mb-4">
              <Image
                src={cloudfrontImage('/images/services/emerging-tech-shr-layers.jpg')}
                alt="Emerging technology"
                fill
                className="object-cover"
              />
            </div>
            <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light mb-1">Emerging technology</p>
            <p className="text-gray mb-3">We&apos;ve worked on projects across the spectrum of emerging technology from artificial intelligence for medical coding to self-documenting voice encounters and wearable devices.</p>
            <div className="space-y-1">
              <div><Link href="/vision/from-bathroom-to-healthroom" >From bathroom to healthroom</Link></div>
              <div><Link href="/work/wuxi-nextcode">WuXi NextCODE</Link></div>
            </div>
          </div>
          <div>
            <div className="relative h-[250px] overflow-hidden mb-4">
              <Image
                src={cloudfrontImage('/images/services/doh-preview.jpg')}
                alt="Information visualizations"
                fill
                className="object-cover"
              />
            </div>
            <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light mb-1">Information visualizations</p>
            <p className="text-gray mb-3">We create beautiful printed and interactive health-related data visualizations that span payment dashboards to visualizing the social determinants of health to clinical practice guidelines for Zika.</p>
            <div className="space-y-1">
              <div><Link href="/vision/determinants-of-health">Determinants of Health</Link></div>
              <div><Link href="/vision/clinical-practice-guidelines-for-zika">Clinical Practice Guidelines for Zika</Link></div>
            </div>
          </div>
          <div>
            <div className="relative h-[250px] overflow-hidden mb-4">
              <Image
                src={cloudfrontImage('/images/services/inspired-ehrs-book.jpg')}
                alt="Open source healthcare products"
                fill
                className="object-cover"
              />
            </div>
            <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light mb-1">Open source healthcare products</p>
            <p className="text-gray mb-3">We&apos;ve built 10 of our own open source products and integrated open source code with a range of clients. Our services range from guidance to design and development.</p>
            <div className="space-y-1">
              <div><Link href="/work/inspired-ehrs">Inspired EHRs</Link></div>
              <div><Link href="/work/paintrackr">PainTrackr</Link></div>
              <div><Link href="/open-source-health-design">See our open source design</Link></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
