import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { DeterminantsChart } from './DeterminantsChart'

export const metadata: Metadata = {
  title: 'Determinants of Health Visualized - GoInvo',
  description:
    'A comprehensive open source visualization of the social determinants of health. Order your poster today!',
}

export default function DeterminantsOfHealthPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-end">
        <Image
          src={cloudfrontImage('/images/services/doh-preview.jpg')}
          alt="Determinants of Health"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
            Healthcare / Open Source
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-white mt-2">
            Determinants of Health
          </h1>
          <p className="text-white/80 text-md mt-2">
            Health is more than medical care
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="leading-relaxed mb-4">
            89% of health occurs outside of the clinical space through our
            genetics, behavior, environment and social circumstances. These
            factors are known as the social determinants of health. Despite
            their importance, attempts to integrate the determinants into a
            single visualization have been limited.
          </p>
          <p className="leading-relaxed mb-4">
            GoInvo identified this gap based on their extensive work as a
            healthcare design studio and conducted a literature review of
            sources (World Health Organization and the Kaiser Family
            Foundation) and face to face interviews with public policy
            analysts, health IT experts, and clinical professionals. Relying
            on their experience of mapping complex systems within
            healthcare, GoInvo created a comprehensive open source
            visualization of the social determinants of health.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              href="https://github.com/goinvo/HealthDeterminants/raw/master/poster/health_determinants_poster_42x50.pdf"
              variant="secondary"
              external
            >
              Download Poster (PDF)
            </Button>
            <Button
              href="https://www.amazon.com/Determinants-Health-Poster-24-35-75/dp/B06X1GFDH1/"
              variant="secondary"
              external
            >
              Order Print on Amazon
            </Button>
            <Button
              href="https://www.goinvo.com/pdf/vision/posters/determinantes_de_la_salud_42x50.pdf"
              variant="secondary"
              external
            >
              Spanish Version (PDF)
            </Button>
          </div>

          <Divider />
        </div>

        {/* Interactive Chart */}
        <DeterminantsChart />

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">The Poster</h2>
          <div className="border-[15px] border-[#ffeee4] mb-8">
            <Image
              src={cloudfrontImage(
                '/images/features/determinants-of-health/determinants-of-health-poster.jpg'
              )}
              alt="Determinants of Health poster"
              width={1200}
              height={1500}
              className="w-full h-auto"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Image
              src={cloudfrontImage(
                '/images/features/determinants-of-health/determinants-of-health-mitre-poster.jpg'
              )}
              alt="Poster at MITRE"
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage(
                '/images/features/determinants-of-health/determinants-of-health-sxsw-poster3.jpg'
              )}
              alt="Poster at SXSW"
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage(
                '/images/features/determinants-of-health/determinants-of-health-studio-poster.jpg'
              )}
              alt="Poster in studio"
              width={400}
              height={300}
              className="w-full h-auto"
            />
          </div>
          <p className="text-gray mb-8">
            The Determinants of Health is available as a poster, an
            installation, a download, and an interactive visualization.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Determinants Compared to Spending
          </h2>
          <Image
            src={cloudfrontImage(
              '/images/features/determinants-of-health/sdoh-spend-mockup.jpg'
            )}
            alt="Determinants compared to spending"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              href="https://github.com/goinvo/HealthDeterminants/raw/master/sdoh-spend/SDOH_to_spend_v12-01.png"
              variant="secondary"
              external
              size="sm"
            >
              Full Size Poster
            </Button>
            <Button
              href="https://github.com/goinvo/HealthDeterminants/blob/master/sdoh-spend/sdoh_to_spend.xlsx"
              variant="secondary"
              external
              size="sm"
            >
              References (Excel)
            </Button>
          </div>

          <h2 className="font-serif text-2xl mt-8 mb-4">
            We&apos;d Like Your Feedback
          </h2>
          <p className="leading-relaxed mb-4 text-gray">
            We&apos;ve mapped the most recent available federal, state, and
            relevant private intervention spending to the determinants of
            health. Where data is available, we&apos;ve also compared United
            States performance to a group of comparable countries (OECD
            countries). Explore the poster and references then send your
            feedback on this draft to{' '}
            <a href="mailto:hello@goinvo.com" className="text-primary hover:underline">hello@goinvo.com</a>
          </p>
          <p className="leading-relaxed mb-4 text-gray">
            Note: Intervention spending is money spent to address the
            problem. It is not total money spent in that area. For example,
            we list reentry and education program spending for incarcerated
            individuals and not the total cost of incarceration. Where data
            is not available it is not displayed.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4" id="methodology">Methodology</h2>
          <p className="leading-relaxed mb-4">
            The percentages assigned to each determinant are derived from a
            meta-analysis of existing research. We analyzed data from multiple
            sources including the WHO, Kaiser Family Foundation, NCHHSTP, NEJM,
            and others to arrive at consensus figures.
          </p>

          <h3 className="font-serif text-xl mt-6 mb-3">
            Version 3 (Nov 2018) — Current
          </h3>
          <p className="leading-relaxed mb-4">
            Final percentages derived from averaging 15 source estimates:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-1 mb-8">
            <li>Individual Behavior: <strong>36%</strong></li>
            <li>Social Circumstances: <strong>24%</strong></li>
            <li>Genetics and Biology: <strong>22%</strong></li>
            <li>Medical Care: <strong>11%</strong></li>
            <li>Environment: <strong>7%</strong></li>
          </ul>

          <p className="leading-relaxed mb-8">
            Source code and full methodology available on{' '}
            <a
              href="https://github.com/goinvo/HealthDeterminants"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
            .
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Edwin Choi" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo, MIT" />

          <h3 className="font-serif text-xl mt-6 mb-3">Contributors</h3>
          <Author name="Hrothgar" company="GoInvo" />
          <Author name="Kelsey Kittelsen" company="Dartmouth College" />
          <p className="text-gray mt-4">
            Daniel Reeves, Bryson Wong
          </p>
          <p className="text-gray">
            <strong>Spanish translation:</strong> Roberto Laureles
          </p>
        </div>
      </section>
    </div>
  )
}
