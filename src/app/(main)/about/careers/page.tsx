import type { Metadata } from 'next'
import Image from 'next/image'
import { sanityFetch } from '@/sanity/lib/live'
import { activeJobsQuery } from '@/sanity/lib/queries'
import { Quote } from '@/components/ui/Quote'
import { cloudfrontImage } from '@/lib/utils'
import type { Job } from '@/types'

export const metadata: Metadata = {
  title: 'Join our team of UX designers & engineers',
  description:
    "If you're an independent thinker and passionate maker hunting for meaningful work, give us a holler.",
}

const values = [
  {
    title: 'We are open source',
    description:
      'We operate as an open company. Our finances are open. You own a part of the company the moment you walk in the door. And all of our products are licensed under open source licenses.',
  },
  {
    title: 'Design for action',
    description:
      'Design is not a theoretical exercise. Design like you give a damn and ship. Shippers change the world.',
  },
  {
    title: 'Demand truth and justice',
    description:
      'Hunting for systemic problems, popping political blisters, and fighting for the right idea are parts of finding truth... and key to how we design.',
  },
]

const perks = [
  {
    image: '/images/about/careers/group-lunch.jpg',
    title: 'Break Bread',
    caption:
      'We cook for one another and share meals together. Cooking and eating as a tribe makes us a closer, better tribe.',
  },
  {
    image: '/images/about/careers/7-years-beards.jpg',
    title: 'Work & Play',
    caption:
      "Design can be a grind. So is Life. Plan yours as you see fit. We don't track vacation or sick days. Just be responsible.",
  },
  {
    image: '/images/about/careers/drone-hands.jpg',
    title: 'Makers & Shippers',
    caption:
      'We explore with our hands, heads, and hearts. Tinkering with, building, and shipping things is part of our DNA.',
  },
]

export default async function CareersPage() {
  const { data: jobs } = await sanityFetch({ query: activeJobsQuery }) as { data: Job[] }

  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/about/careers/jen-journeymap-2.jpg')})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-white">
            This is our job<span className="text-primary font-serif">!</span>
          </h1>
        </div>
      </section>

      {/* Values */}
      <section className="bg-blue-light py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {values.map((value) => (
              <div key={value.title}>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-gray text-md">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">
            Experiencing GoInvo for<span className="text-primary font-serif">...</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div>
              <Image
                src={cloudfrontImage('/images/about/careers/lily-lunch.jpg')}
                alt="Lily Fan"
                width={400}
                height={300}
                className="w-full h-auto mb-4"
              />
              <p className="font-semibold mb-1">A summer internship</p>
              <p className="text-gray text-md italic mb-3">
                &ldquo;Interning at Invo made me realize the importance of not only working at an
                awesome company to help transform software in healthcare but the value of spending
                your every day in an extremely inclusive environment with a diverse range of people
                who genuinely want to see you succeed.&rdquo;
              </p>
              <p className="text-sm font-semibold">Lily Fan</p>
              <p className="text-gray text-sm">Design Intern</p>
            </div>
            <div>
              <Image
                src={cloudfrontImage('/images/about/bai-laughing.jpg')}
                alt="Eric Bai"
                width={400}
                height={300}
                className="w-full h-auto mb-4"
              />
              <p className="font-semibold mb-1">1 year</p>
              <p className="text-gray text-md italic mb-3">
                &ldquo;I started working at Invo as an engineer and gradually took on a
                greater design focus. My friends at Invo mentored and supported me
                as I learned design basics. But beyond just aiming for design
                competency, I was also challenged to consider the broader impact
                of the work &mdash;its effect on patients, on access to
                healthcare, and on health as a whole. If you want to work at a
                place that challenges you, supports you, and infuses your work
                with a sense of purpose, come to Invo.&rdquo;
              </p>
              <p className="text-sm font-semibold">Eric Bai</p>
              <p className="text-gray text-sm">Designer & Engineer</p>
            </div>
            <div>
              <Image
                src={cloudfrontImage('/images/about/careers/beckett-presentation.jpg')}
                alt="Beckett Rucker"
                width={400}
                height={300}
                className="w-full h-auto mb-4"
              />
              <p className="font-semibold mb-1">3 years</p>
              <p className="text-gray text-md italic mb-3">
                &ldquo;GoInvo provided a incubator-like space to expand my toolbox of
                skills and practices while also giving me a kick in the pants to
                cultivate my own design principles, passions, and ethics. It was
                an inspiring environment to do meaningful work with a family of
                driven, talented people.&rdquo;
              </p>
              <p className="text-sm font-semibold">Beckett Rucker</p>
              <p className="text-gray text-sm">Designer</p>
            </div>
          </div>
        </div>
      </section>

      {/* Job Description */}
      <section
        className="relative py-16 bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/contact/studio.jpg')})` }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-width-md content-padding mx-auto">
          <div className="bg-gray-light p-8 md:p-12">
            <h2 className="font-serif text-2xl mb-4">
              Working together towards a healthy groove
            </h2>
            <p className="mb-4">
              We&apos;re looking for a designer and an engineer to join our intimate studio.
            </p>
            <p className="text-gray mb-4">
              If you&apos;re familiar with our work, you know we design, build, and
              ship beautiful software for companies of all sizes, from
              Apple, Johnson & Johnson, NIH (National Institutes of Health),
              and Walgreens, to micro startups. We are hyper-concerned about
              guiding people through tough decisions and producing
              eyebrow-raising results.
            </p>

            <p className="text-gray mb-4">Our idealized candidate can be described in this way:</p>

            <p className="mb-2">
              <strong>First and foremost, you need to be exceptional:</strong>
            </p>
            <p className="text-gray mb-4">
              love designing and building software, making is in your DNA,
              and solving crazy problems with 50 different crazy solutions. You
              need to have a proven track record of designing and shipping healthcare
              software.
            </p>

            <p className="mb-2">
              <strong>Second, you need to be a system thinker and serial do&apos;er:</strong>
            </p>
            <p className="text-gray mb-4">
              to see beyond the design and production tasks to the
              entire product ecosystem and to have a firm grasp of engineering
              principles and business practices. You will need to lead not
              just yourself but other studio&apos;ites and clients. Your
              responsibilities include leading projects and, over time,
              learning how to manage the entire service to designing software
              that is destined to ship. You will not be a cog in a machine.
              Your ideas will directly shape the experiences you create.
              Ultimately, you will be your own business unit within the studio
              and grappling with the holy trinity: design, technology, and
              business.
            </p>

            <p className="mb-2">
              <strong>Third, you have to really care about Design, your fellow staff, and Spaceship Earth:</strong>
            </p>
            <p className="text-gray mb-4">
              being adrenalized about doing good, healthcare, business, writing, open
              source, innovation, craftsmanship, and fun. You are given great
              freedom and responsibility for managing your own work program while
              mentoring staff and driving company goals. Taking pride in and
              feeling responsible for a high degree of personal ownership in
              your work is critical because thousands to millions of people
              will immediately interact with your finished designs. We are
              looking for a passionate, inspiring, design-obsessed apostle who
              can increase our IQs (as well as dramatically increase your
              own).
            </p>

            <p className="text-gray mb-4">
              That&apos;s the kind of person we want. If you have those three
              qualities, just about anything else is negotiable.
            </p>

            <p className="text-gray mb-4">
              If you have any questions about the position, please email me.
            </p>
            <p className="text-gray mb-4">
              You can apply below, or send me your resume, portfolio, and
              phone number so we can chat.
            </p>
            <p className="text-gray">
              Looking forward,<br />
              Juhan Sonin, Director<br />
              <a href="mailto:juhan@goinvo.com">juhan@goinvo.com</a>
            </p>
          </div>
        </div>
      </section>

      {/* Apply */}
      <section className="bg-blue-light py-16">
        <div className="max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mb-6">Apply</h2>
          <iframe
            id="JotFormIFrame-251193306087052"
            title="Application"
            src="https://form.jotform.com/251193306087052"
            className="w-full border-0"
            style={{ minHeight: '600px' }}
            allowTransparency
          />
        </div>
      </section>

      {/* Perks */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {perks.map((perk) => (
              <div key={perk.title}>
                <Image
                  src={cloudfrontImage(perk.image)}
                  alt={perk.title}
                  width={400}
                  height={300}
                  className="w-full h-auto mb-4"
                />
                <h4 className="font-semibold mb-2">{perk.title}</h4>
                <p className="text-gray text-md">{perk.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
