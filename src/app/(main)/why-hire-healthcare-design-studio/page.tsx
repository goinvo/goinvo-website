import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Quote } from '@/components/ui/Quote'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Why hire a Healthcare design studio? - GoInvo',
  description:
    "For over a decade, GoInvo's design approach to digital health has incorporated a deep understanding of clinicians, patients, and administrators.",
}

export default function WhyHirePage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[50vh] flex items-center bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/homepage/open-source-bgd-9.jpg')})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </section>

      {/* Article Body */}
      <section className="py-16">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl mb-6">
            Hiring a Digital Health Design Firm
          </h1>

          <p>
            As you and your organization begin the process of finding the
            right design partner for your health software project, there are
            several factors to be considered.
          </p>

          <ul className="list-disc pl-6 space-y-3 my-6">
            <li>
              One element of particular importance is the design firm&apos;s
              ability to understand an often-complex problem space and user
              base, then translate features into a product experience that is
              usable, efficient, even beautiful.
            </li>
            <li>
              You&apos;ll need a vision to drive the product design, one that is
              compelling enough to earn buy-in from your executives and
              product team, and realizable in a buildable user experience
              within a realistic timeframe.
            </li>
            <li>
              Equipped with an in-depth understanding of digital
              transformation in healthcare and insight into trends and tech
              advances, GoInvo can guide and inform your product design.
            </li>
          </ul>

          <h2 className="font-serif text-2xl mt-12 mb-4">
            A multi-disciplinary approach to digital health design
          </h2>

          <p className="text-gray">
            GoInvo is a unique firm with multiple areas of expertise necessary
            for digital health product design. Our multidisciplinary approach
            to clinical software leverages our skills in user experience
            design, engineering, medical illustration, and behavior change,
            among many others. We understand the complexities of both software
            creation and healthcare practice, the real-world implications of
            health policy changes, and the intricacies of health data.
          </p>

          <h2 className="font-serif text-2xl mt-12 mb-4">
            Practical experience and technical expertise
          </h2>

          <p className="text-gray">
            As patients and clinicians demand more from their software-driven
            healthcare experiences, human-centered design is essential to the
            future of digital health. GoInvo has the practical experience and
            technical expertise, with experience designing across the spectrum
            of digital health — from mobile medical apps and digital
            therapeutics to clinical decision support and electronic health
            records. Our designers have helped create software for digital
            health technologies spanning artificial intelligence, genomics,
            and advanced analytics. We have a proven track record of
            delivering innovative digital health projects and products on time
            and within budget.
          </p>

          <h1 className="font-serif text-3xl md:text-4xl mt-16 mb-6">
            Why hire a design firm focused on digital health?
          </h1>

          <h2 className="font-serif text-2xl mb-4">
            Deep design experience across the digital health continuum
          </h2>

          <p className="text-gray mb-4">
            For over a decade, GoInvo&apos;s design approach to digital health has
            incorporated a deep understanding of clinicians, patients, and
            administrators, with technical knowledge of health IT, integrated
            with UX design best practice and software engineering. Our
            knowledge of the health field is tightly paired with our design
            practice: our staff have backgrounds in engineering,
            bioinformatics, and medical design.
          </p>

          <p className="text-gray">
            We&apos;ve had the privilege of working with organizations as
            far-reaching as AstraZeneca, Becton Dickinson, Johnson & Johnson,
            3M Health Information Services, and the U.S. Department of Health
            and Human Services. Working across the healthcare system — from
            patient-facing experiences to life-saving clinical software, to
            government health IT and patient-data policy — has not only been
            rewarding, it has given us the right experiences to help digital
            health clients realize their vision. More than 80% of GoInvo&apos;s
            customers are enthusiastic about our work and return for repeat
            engagements.
          </p>

          <h2 className="font-serif text-2xl mt-12 mb-4">
            Understanding of users and use cases
          </h2>

          <p className="text-gray">
            We have extensive knowledge of healthcare specific user types and
            roles — from clinicians to patients, administrators to analysts —
            having conducted dozens of usability research studies, spoken with
            hundreds of users, and shipped digital healthcare software. We
            understand the spectrum of audiences, what they&apos;re looking for,
            their workflows, and context of use.
          </p>

          <h2 className="font-serif text-2xl mt-12 mb-4">
            The benefits of working together
          </h2>

          <p className="text-gray">
            Hiring a design firm that specializes in digital health, like
            GoInvo, substantially mitigates the risk that comes with designing
            new products and services. Our design approach is health-specific,
            but more importantly realistic, informed, and seasoned. In the
            end, this means a high-quality overall design solution for digital
            health clients, resulting in beautiful, usable software that is
            tailor fit to the patient&apos;s needs and highly engaging for users.
          </p>
        </div>
      </section>

      {/* Quote */}
      <Quote
        text="With Invo, design wasn't just design. It impacted our IP portfolio. It changed our business."
        author="Serban Georgescu, MD"
        role="InfoBionic Director of Clinical Development"
        background="gray"
      />

      {/* Contact Form */}
      <section className="py-16">
        <div className="max-width max-width-md content-padding mx-auto">
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
                <a href="https://www.goinvo.com/features/from-bathroom-to-healthroom/" className="text-sm">
                  From bathroom to healthroom
                </a>
                <Link href="/work/wuxi-nextcode-familycode" className="text-sm">
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
                <Link href="/vision/determinants-of-health" className="text-sm">
                  Determinants of Health
                </Link>
                <Link href="/vision/clinical-practice-guidelines-for-zika" className="text-sm">
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
                <Link href="/work/inspired-ehrs" className="text-sm">
                  Inspired EHRs
                </Link>
                <Link href="/work/paintrackr" className="text-sm">
                  PainTrackr
                </Link>
                <Link href="/work?category=open-source" className="text-sm">
                  See all open source products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
