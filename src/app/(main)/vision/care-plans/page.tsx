import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import './careplans.css'

export const metadata: Metadata = {
  title: 'The Care Plan Series',
  description:
    'A patient guide to manage day-to-day health based on health concerns, goals, and interventions. A three-part feature series on the past, present, and future of care plans.',
}

export default function CarePlansPage() {
  return (
    <div>
      {/* Hero Image with title overlay */}
      <section className="careplans-hero" style={{ minHeight: 480 }}>
        <div className="hero-bg">
          <Image
            src="https://www.goinvo.com/old/images/features/careplans/home_hero.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="hero-content">
          <p className="big-title">CARE</p>
          <p className="big-title">PLANS</p>
        </div>
      </section>

      {/* Series Navigation */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link href="/vision/care-plans" className="font-semibold text-primary hover:underline">Part 1: Overview</Link>
            <Link href="/vision/care-plans/part-2" className="font-semibold text-primary hover:underline">Part 2: Landscape</Link>
            <Link href="/vision/care-plans/part-3" className="font-semibold text-primary hover:underline">Part 3: Future</Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              href="https://www.goinvo.com/old/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf"
              variant="secondary"
              size="sm"
              external
            >
              Download eBook
            </Button>
            <Button
              href="https://www.goinvo.com/old/images/features/careplans/Involution_Care_Plans_Presentation_13Sep16.pdf"
              variant="secondary"
              size="sm"
              external
            >
              Download Presentation
            </Button>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            The Care Plan Series
          </h1>

          <p className="text-gray leading-relaxed mb-4">
            Overwhelmed. It is how most patients feel at one point or another as they leave that sterile-smelling, fluorescent-lit doctor&apos;s office. They have just spent 10-25 minutes being hastily examined, diagnosed, and, if they are lucky, educated about their condition. Many depart without proper documentation or discharge plans, typically receiving only generic pamphlets that get discarded.
          </p>

          <p className="text-gray leading-relaxed mb-4">
            There is a loose, under-utilized semblance of a &quot;plan of care&quot; in most health data sets. You&apos;ll find them mentioned in the standard Continuity of Care Document (CCD), the FHIR framework, and CMS&apos;s recent chronic care management documentation requirements. But the concept of a standardized, comprehensive care plan remains poorly understood and dramatically underutilized. GoInvo collaborated with designers, engineers, and field experts to comprehensively research and visualize care plan concepts across three feature installments.
          </p>

          <Divider />
        </div>
      </section>

      {/* Three Parts */}
      <section className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="part1">
            {/* Part 1 */}
            <div>
              <Image
                src="https://www.goinvo.com/old/images/features/careplans/twitter_CP1.jpg"
                alt="Care Plans Part 1: Overview"
                width={600}
                height={400}
                className="w-full h-auto mb-4 rounded"
              />
              <h3 className="font-serif text-xl mb-2">Part 1: Overview</h3>
              <p className="text-gray text-sm leading-relaxed">
                The first feature examines how the concept of a care plan came to be and our understanding of it today.
              </p>
            </div>

            {/* Part 2 */}
            <Link href="/vision/care-plans/part-2" id="part2" className="block group">
              <Image
                src="https://www.goinvo.com/old/images/features/careplans/twitter_CP2.jpg"
                alt="Care Plans Part 2: Landscape"
                width={600}
                height={400}
                className="w-full h-auto mb-4 rounded group-hover:opacity-90 transition-opacity"
              />
              <h3 className="font-serif text-xl mb-2 group-hover:text-primary transition-colors">Part 2: Landscape</h3>
              <p className="text-gray text-sm leading-relaxed">
                The second feature visualizes the current care planning process and limitations, and evaluates existing care plan-related services.
              </p>
            </Link>

            {/* Part 3 */}
            <Link href="/vision/care-plans/part-3" id="part3" className="block group">
              <Image
                src="https://www.goinvo.com/old/images/features/careplans/twitter_CP3.jpg"
                alt="Care Plans Part 3: Future"
                width={600}
                height={400}
                className="w-full h-auto mb-4 rounded group-hover:opacity-90 transition-opacity"
              />
              <h3 className="font-serif text-xl mb-2 group-hover:text-primary transition-colors">Part 3: Future</h3>
              <p className="text-gray text-sm leading-relaxed">
                The third feature explores what these findings mean for the future of care plans and our shifting healthcare system, and proposes a call to action.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="header-lg mb-4">Our Goals</h2>
          <p className="text-gray leading-relaxed mb-4">
            Our feature series has three goals. We aim to spread both awareness to the general public about the benefit of care planning, as well as empowerment to demand such practices from doctors. We aim to inspire healthcare professionals, designers, and entrepreneurs to prioritize care plans when innovating healthcare products and services. And we aim to encourage policymakers to establish care plan databases and evaluate the costs of implementation.
          </p>
          <p className="text-gray leading-relaxed mb-8">
            Only in a new era of digital, standardized, adaptive care plans can we truly promote preventative self care.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              href="https://www.goinvo.com/old/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf"
              variant="secondary"
              external
            >
              Download eBook
            </Button>
            <Button
              href="https://www.goinvo.com/old/images/features/careplans/Involution_Care_Plans_Presentation_13Sep16.pdf"
              variant="secondary"
              external
            >
              Download Presentation
            </Button>
          </div>

          <Divider />
        </div>
      </section>

      {/* Contact / Work Together */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mb-3">Want to Work Together?</h2>
          <p className="text-gray mb-6">
            Want to take your healthcare or care plan product to the next level? Contact the authors at GoInvo:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <Image
                src="https://www.goinvo.com/old/images/features/careplans/work_together.jpg"
                alt="GoInvo studio"
                width={600}
                height={400}
                className="w-full h-auto"
                loading="eager"
                unoptimized
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Image
                  src="https://www.goinvo.com/old/images/features/careplans/intro_icons/email.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-5 h-5 object-contain"
                  loading="eager"
                  unoptimized
                />
                <a href="mailto:info@goinvo.com" className="text-primary hover:underline">info@goinvo.com</a>
              </div>
              <div className="flex items-center gap-3">
                <Image
                  src="https://www.goinvo.com/old/images/features/careplans/intro_icons/phone.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-5 h-5 object-contain"
                  loading="eager"
                  unoptimized
                />
                <a href="tel:6178037043" className="text-primary hover:underline">617-803-7043</a>
              </div>
              <div className="flex items-start gap-3">
                <Image
                  src="https://www.goinvo.com/old/images/features/careplans/intro_icons/address.png"
                  alt=""
                  width={24}
                  height={24}
                  className="w-5 h-5 object-contain mt-1"
                  loading="eager"
                  unoptimized
                />
                <span className="text-gray">661 Massachusetts Ave, 3rd Floor, Arlington MA, 02476</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About GoInvo */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="text-gray leading-relaxed mb-4">
            GoInvo specializes in healthcare user experience design. Since 2004, the firm has created software for companies ranging from market leaders such as Apple, Johnson &amp; Johnson, Partners HealthCare, and Walgreens, to emerging startups. Their applications serve over 150 million users. The studio&apos;s deep expertise in genomics design, healthcare IT, mHealth, wearables, and emerging technologies positions them to craft innovative digital and physical solutions.
          </p>

          <Divider />
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-2">Authors</h2>

          <Author
            name="Beckett Rucker"
            company="GoInvo"
            image="https://www.goinvo.com/old/images/features/careplans/contrib/beckett.jpg"
          >
            <p>
              <strong>Beckett Rucker, MPD</strong> is a designer, product strategist, and researcher concentrating on health services and systems design. She holds a BA in psychology and studio art from Rice University and a Master of Product Development from Carnegie Mellon University. She has previously worked with Seniorlink, Johnson &amp; Johnson, and Updox Patient Portals.
            </p>
          </Author>

          <Author
            name="Edwin Choi"
            company="GoInvo"
            image="https://www.goinvo.com/old/images/features/careplans/contrib/edwin.jpg"
          >
            <p>
              <strong>Edwin Choi, MA</strong> is a biologist-turned-designer orchestrating beautiful, clinically refined healthcare software. He is a graduate of Washington University with a Master&apos;s in biomedical design from Johns Hopkins. His project experience includes Partners Healthcare and Notovox.
            </p>
          </Author>

          <Author
            name="Danny van Leeuwen"
            company="Health Hats"
            image="https://www.goinvo.com/old/images/features/careplans/contrib/danny.jpg"
          >
            <p>
              <strong>Danny van Leeuwen, RN, MPH, CPHQ</strong> is an action catalyst with 40+ years of nursing experience. He is a patient with MS and care partner for family end-of-life care. As an informaticist and quality improvement leader, he focuses on care transitions, person-centered health planning, and informed decision-making. He has collaborated with PCORI, AHRQ, and MassHealth.
            </p>
          </Author>

          <Divider />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/yanyang.jpg'}
                alt="Yanyang Zhou"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Yanyang Zhou</p>
                <p className="text-gray text-xs">Web Designer &amp; Developer</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/jenn.jpg'}
                alt="Jennifer Patel"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Jennifer Patel</p>
                <p className="text-gray text-xs">Web Designer &amp; Developer</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/juhan.jpg'}
                alt="Juhan Sonin"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Juhan Sonin</p>
                <p className="text-gray text-xs">GoInvo, MIT</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/jeffbelden.jpg'}
                alt="Jeff Belden, MD"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Jeff Belden, MD</p>
                <p className="text-gray text-xs">University of Missouri</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/joycelee.jpeg'}
                alt="Joyce Lee, MD, MPH"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Joyce Lee, MD, MPH</p>
                <p className="text-gray text-xs">University of Michigan</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/janesarasohnkahn.jpg'}
                alt="Jane Sarasohn-Kahn"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Jane Sarasohn-Kahn, MA, MHSA</p>
                <p className="text-gray text-xs">THINK-Health, Health Populi</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <Image
                src={'https://www.goinvo.com/old/images/features/careplans/contrib/harrysleeper.jpg'}
                alt="Harry Sleeper"
                width={64}
                height={64}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-sm">Harry Sleeper</p>
                <p className="text-gray text-xs">Healthcare Provocateur</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
