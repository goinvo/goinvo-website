import type { Metadata } from 'next'
import Image from 'next/image'
import { sanityFetch } from '@/sanity/lib/live'
import { activeJobsQuery } from '@/sanity/lib/queries'
import { cloudfrontImage } from '@/lib/utils'
import { TestimonialCarousel } from './TestimonialCarousel'
import { ApplicationFormEmbed } from './ApplicationFormEmbed'
import type { Job } from '@/types'

export const metadata: Metadata = {
  alternates: { canonical: '/about/careers' },
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
  await sanityFetch({ query: activeJobsQuery }) as { data: Job[] }

  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative h-[450px] bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/about/careers/jen-journeymap-2.jpg')})` }}
      >
        <div className="relative h-full max-width">
          <div className="absolute bottom-0 left-0 w-full lg:w-[385px] bg-white/80 content-padding py-8">
            <h1 className="header-xl m-0">
              This is our job<span className="text-primary font-serif">!</span>
            </h1>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-blue-light py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {values.map((value) => (
              <div key={value.title}>
                <h3 className="font-sans text-base font-semibold text-black mb-2">
                  {value.title}
                </h3>
                <p className="text-gray mt-2">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experiencing GoInvo for... section heading */}
      <div className="max-width content-padding pt-16">
        <h2 className="header-xl mb-0">
          Experiencing GoInvo for<span className="text-primary font-serif">...</span>
        </h2>
      </div>

      {/* Testimonials carousel */}
      <section className="pt-8 pb-16">
        <TestimonialCarousel />
      </section>

      {/* Job Description + Apply form (matches Gatsby BackgroundImage w/ gradient) */}
      <section
        className="relative py-16"
        style={{
          background: `linear-gradient(
            to top,
            #F3F1F0 0%,
            rgba(237, 233, 230, 0.9932) 20%,
            rgba(234, 228, 225, 0.9893) 25%,
            rgba(234, 228, 225, 0.8979) 40%,
            rgba(234, 228, 225, 0.82) 55%,
            rgba(234, 228, 225, 0.538) 70%,
            rgba(234, 228, 225, 0) 100%
          ), url(${cloudfrontImage('/images/contact/studio.jpg')}) top center / cover no-repeat`,
        }}
      >
        <div className="relative z-10 max-width-md content-padding mx-auto">
          <div className="bg-gray-light p-8 md:p-12">
            <h2 className="header-xl mt-0 mb-4">
              Working together towards a healthy groove
            </h2>
            <p className="mb-4">
              We&rsquo;re looking for a designer and an engineer to join our intimate studio.
            </p>
            <p className="mb-4">
              If you&rsquo;re familiar with our work, you know we design, build, and
              ship beautiful software for companies of all sizes, from
              Apple, Johnson &amp; Johnson, NIH (National Institutes of Health),
              and Walgreens, to micro startups. We are hyper-concerned about
              guiding people through tough decisions and producing
              eyebrow-raising results.
            </p>

            <p className="mb-4">Our idealized candidate can be described in this way:</p>

            <p className="mb-4">
              <strong>First and foremost, you need to be exceptional:</strong>
              <br />
              love designing and building software, making is in your DNA,
              and solving crazy problems with 50 different crazy solutions. You
              need to have a proven track record of designing and shipping healthcare
              software.
            </p>

            <p className="mb-4">
              <strong>Second, you need to be a system thinker and serial do&rsquo;er:</strong>
              <br />
              to see beyond the design and production tasks to the
              entire product ecosystem and to have a firm grasp of engineering
              principles and business practices. You will need to lead not
              just yourself but other studio&rsquo;ites and clients. Your
              responsibilities include leading projects and, over time,
              learning how to manage the entire service to designing software
              that is destined to ship. You will not be a cog in a machine.
              Your ideas will directly shape the experiences you create.
              Ultimately, you will be your own business unit within the studio
              and grappling with the holy trinity: design, technology, and
              business.
            </p>

            <p className="mb-4">
              <strong>Third, you have to really care about Design, your fellow staff, and Spaceship Earth:</strong>
              <br />
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

            <p className="mb-4">
              That&rsquo;s the kind of person we want. If you have those three
              qualities, just about anything else is negotiable.
            </p>

            <p className="mb-4">
              If you have any questions about the position, please email me.
            </p>
            <p className="mb-4">
              You can apply below, or send me your resume, portfolio, and
              phone number so we can chat.
            </p>
            <p className="mb-0">
              Looking forward,
              <br />
              Juhan Sonin, Director
              <br />
              <a href="mailto:juhan@goinvo.com">juhan@goinvo.com</a>
            </p>

            <div className="pt-8">
              <h2 className="header-xl mb-6">Apply</h2>
              <ApplicationFormEmbed />
            </div>
          </div>
        </div>
      </section>

      {/* Studio image band (Gatsby: background--gray pad-vertical) */}
      <section className="bg-gray-light py-8">
        <Image
          src={cloudfrontImage('/images/contact/studio.jpg')}
          alt="GoInvo studio space"
          width={1920}
          height={400}
          className="w-full h-[400px] object-cover"
        />
      </section>

      {/* Perks */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {perks.map((perk) => (
              <div key={perk.title}>
                <div className="relative w-full aspect-[308/260] mb-4">
                  <Image
                    src={cloudfrontImage(perk.image)}
                    alt={perk.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <p className="font-semibold mb-2">{perk.title}</p>
                <p className="text-gray text-md">{perk.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
