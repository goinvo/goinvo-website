import type { Metadata } from 'next'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title:
    'We demand Open Source Healthcare! Healthcare is too important to be closed.',
  description:
    "Here in the US, healthcare is sometimes amazing, often lifesaving, always expensive, and mostly closed. It\u2019s our health. Our very lives are at stake.",
}

export default function OpenSourceHealthcarePage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/open-source-healthcare/open-source-healthcare-hero.jpg'
        )}
      />

      {/* Title & Introduction */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Open Source Healthcare
          </h1>
          <h4 className="header-sm">We must set healthcare free</h4>
          <div className="mt-8 mb-8">
            <Button
              href="https://opensourcehealthcare.org/"
              variant="secondary"
              external
            >
              Read now
            </Button>
          </div>
          <p className="text-gray leading-relaxed mb-4">
            Open source is something that anyone can change and share, because
            it&apos;s publicly available under a generous license. While it first
            began with computer code, open source now influences how projects and
            businesses work, and our lives benefit from this open sharing. Open
            source has grown into a way of participating with many others that
            asks for transparency, community-based collaboration, and
            meritocracy. The best ideas float to the top, and you earn trust by
            what you do and how you amplify the group.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Our internet is infused with open source ideas and services &mdash;
            from how cell phones communicate, to how e-mail is directed from one
            person to the next, to Linux. All of these technologies working
            together are the operating system of the internet.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Here in the US, healthcare is
            <br />
            sometimes amazing,
            <br />
            often lifesaving,
            <br />
            always expensive,
            <br />
            and mostly closed.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            It&apos;s tribal at its core &mdash; each hospital, each doc, each
            healthcare system invents its own way &mdash; to the detriment of our
            collective health.
          </p>
          <Divider />
        </div>
      </section>

      {/* Open Standards Comparison */}
      <section>
        <div className="max-width max-width-md content-padding mx-auto">
          <h4 className="header-sm mb-0">
            We have open standards for finance
          </h4>
          <p className="text-gray mt-0 mb-8">
            because we value our money more than our health.
          </p>

          <h4 className="header-sm mb-0">
            We have open standards for transportation
          </h4>
          <p className="text-gray mt-0 mb-8">
            because getting to your destination is a necessity.
          </p>

          <h4 className="header-sm mb-0">
            We need open standards for healthcare
          </h4>
          <p className="text-gray mt-0 mb-8">
            because our lives depend on it.
          </p>

          <p className="text-gray leading-relaxed mb-4">
            Read our open source ethos,
            <br />
            with contributing articles by{' '}
            <a
              href="https://www.healthpopuli.com/2018/10/11/open-source-health-care-will-liberate-patients/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Jane Sarasohn-Kahn
            </a>{' '}
            and{' '}
            <a
              href="https://twitter.com/EricTopol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Eric Topol
            </a>
          </p>

          {/* 2-column button grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 mb-8">
            <Button
              href={cloudfrontImage(
                '/pdf/vision/open-source-healthcare/open-source-healthcare-journal.pdf'
              )}
              variant="secondary"
              size="lg"
              external
            >
              Download 25 MB PDF
            </Button>
            <Button
              href="http://www.blurb.com/b/8980724-open-source-healthcare-journal"
              variant="secondary"
              size="lg"
              external
            >
              $12 Blurb Magazine
            </Button>
          </div>

          <Divider />
        </div>
      </section>

      {/* Missionette */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.5rem] leading-[1.875rem] lg:text-[1.75rem] lg:leading-[2.0625rem] font-light mt-8">
            Open Source Healthcare Missionette
          </h2>
          <p className="text-gray leading-relaxed mb-4">
            We live in a closed healthcare system.
            <br />
            The algorithms that drive our care,
            <br />
            to our clinical and life data,
            <br />
            to hospital and treatment pricing,
            <br />
            are governed by blackbox services.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            By using these closed systems,
            <br />
            we are actively designed out
            <br />
            of the decision-making process,
            <br />
            in favor of corporate &ldquo;optimized care&rdquo;
            <br />
            for optimized returns vs optimized health outcomes.
            <br />
            The crooked biases built into software,
            <br />
            implemented with intent or accidentally,
            <br />
            need interrogation, citizen collaboration, and correction.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            It&apos;s our health.
            <br />
            Our very lives are at stake.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            We demand that our healthcare services be open
            <br />
            to inspect and correct bias,
            <br />
            to be accessible for rapid innovation and evolution,
            <br />
            and to become more valuable as
            <br />
            more patients, clinicians, clinics, companies, and
            <br />
            governments engage in healthcare for all.
          </p>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-100 py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <NewsletterForm />
        </div>
      </section>
    </div>
  )
}
