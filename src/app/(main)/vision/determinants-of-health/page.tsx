import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { DeterminantsChart } from './DeterminantsChart'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/determinants-of-health/references.json'

export const metadata: Metadata = {
  title: 'Determinants of Health Visualized',
  description:
    'A comprehensive open source visualization of the social determinants of health. Order your poster today!',
}

export default function DeterminantsOfHealthPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/services/doh-preview.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Determinants of Health</h1>
          <h4 className="font-serif text-base font-light mb-4">Health is more than medical care</h4>
          <p className="leading-relaxed mb-4 text-gray">
            89% of health occurs outside of the clinical space through our
            genetics, behavior, environment and social circumstances. These
            factors are known as the social determinants of health. Despite
            their importance, attempts to integrate the determinants into a
            single visualization have been limited.
          </p>
          <p className="leading-relaxed mb-4 text-gray">
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

          <div className="flex justify-center gap-8 mb-8 text-sm">
            <a
              href="https://github.com/goinvo/HealthDeterminants"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              On Github
            </a>
            <a href="#methodology" className="text-primary hover:underline">
              Methodology
            </a>
            <a href="#references" className="text-primary hover:underline">
              References
            </a>
          </div>

          <Divider />
        </div>

        {/* Interactive Chart */}
        <DeterminantsChart />

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <div className="border-[15px] border-[#ffeee4] mb-8 mt-8">
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

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Button
              href="https://www.amazon.com/Determinants-Health-Poster-24-35-75/dp/B06X1GFDH1/"
              variant="secondary"
              external
            >
              Buy Print
            </Button>
            <Button
              href="https://github.com/goinvo/HealthDeterminants"
              variant="secondary"
              external
            >
              On Github
            </Button>
            <Button
              href="#methodology"
              variant="secondary"
            >
              Methodology
            </Button>
          </div>

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

        </div>
      </section>

      {/* Methodology */}
      <section className="bg-[#d6eef2] py-12" id="methodology">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">Methodology</h2>
          <p className="text-gray leading-relaxed mb-4">
            Below is a description of the methodology used in creating the
            Determinants of Health visualization. It is also a record of
            versioned updates to the methodology and visualization based
            on continuing research and feedback. Thank you to those who
            have reached out and helped identify areas to improve.
          </p>

          <h3 className="header-md mt-8 mb-2">
            v1 - 26.Jul.2017
          </h3>
          <p className="text-gray leading-relaxed mb-4">
            The 5 main determinants of health (genetics, medical care,
            social circumstances, environment, and individual behavior)
            were chosen due to their consistency across the following 7
            out of 8 organizations:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
            <li>NCHHSTP<sup><a href="#references">1</a></sup></li>
            <li>WHO<sup><a href="#references">2</a></sup></li>
            <li>Healthy People<sup><a href="#references">3</a></sup></li>
            <li>Kaiser Family Foundation<sup><a href="#references">4</a></sup></li>
            <li>NEJM<sup><a href="#references">5</a></sup></li>
            <li>Health Affairs<sup><a href="#references">6</a></sup></li>
            <li>Institute of Medicine<sup><a href="#references">7</a></sup></li>
            <li>New South Wales Department of Health<sup><a href="#references">8</a></sup></li>
          </ul>
          <p className="text-gray leading-relaxed mb-4">
            The lists of determinants published from each of the
            previously mentioned organizations were compiled and compared<sup><a href="#references">1 - 8</a></sup>. There was no standard in terms of the number of
            determinants, hierarchical organization of the determinants,
            and the naming for the determinants (for example, quality of
            housing<sup><a href="#references">3</a></sup>{' '}
            vs residence quality<sup><a href="#references">7</a></sup>). The most thorough publication for the determinants came
            from the Institute of Medicine report<sup><a href="#references">7</a></sup>. Therefore this was the primary source from which the list of
            95 determinants within the visualization originated.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The section below documents our analysis of the data and how
            we calculated the final impact percentages for the 5 main
            categories of determinants.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The relative contribution of each of the determinant
            categories to one&apos;s health was found using the estimated
            values referenced by the seven primary sources listed below.
          </p>
          <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
            <li>DHHS<sup><a href="#references">9</a></sup></li>
            <li>JAMA<sup><a href="#references">10, 12</a></sup></li>
            <li>Health Affairs<sup><a href="#references">11</a></sup></li>
            <li>PLoS<sup><a href="#references">13</a></sup></li>
            <li>WHO<sup><a href="#references">14</a></sup></li>
            <li>U.Wisconsin<sup><a href="#references">15</a></sup></li>
          </ul>
          <p className="text-gray leading-relaxed mb-4">
            Each determinant category was then averaged based on the
            values from each of the aforementioned sources (the
            methodology in the primary sources were different depending on
            the source. The final percentages should therefore be an
            estimate and not be viewed as absolute numbers).
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavior:{' '}
            <strong className="text-black">(50 + 38 + 40 + 39 + 36 + 45 + 30) / 7 = 39.71*</strong>
            <br />
            Social:{' '}
            <strong className="text-black">(15 + 40) / 2 = 27.5</strong>
            <br />
            Genetics:{' '}
            <strong className="text-black">(20 + 30) / 2 = 25</strong>
            <br />
            Medical care:{' '}
            <strong className="text-black">(10 + 10 + 20) / 3 = 13.33</strong>
            <br />
            Environment:{' '}
            <strong className="text-black">(20 + 7 + 5 + 5.4 + 3 + 10) / 6 = 8.4</strong>
          </p>
          <p className="text-gray text-sm leading-relaxed mb-4">
            *An original miscalculation of &apos;Behavior&apos; has been rectified.
            The following values have subsequently been updated.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The ratio for each determinant was then found by taking the
            average values found for each of the determinant categories
            and dividing them by the total determinant value.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavior:{' '}
            <strong className="text-black">39.71 / 113.94 = 34.85%</strong>
            <br />
            Social:{' '}
            <strong className="text-black">27.5 / 113.94 = 24.14%</strong>
            <br />
            Genetics:{' '}
            <strong className="text-black">25 / 113.94 = 21.94%</strong>
            <br />
            Medical care:{' '}
            <strong className="text-black">13.33 / 113.94 = 11.70%</strong>
            <br />
            Environment:{' '}
            <strong className="text-black">8.4 / 113.94 = 7.37%</strong>
            <br />
            Total:{' '}
            <strong className="text-black">34.85 + 24.14 + 21.94 + 11.70 + 7.37 = 100%</strong>
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The final percentages are as follows.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavioral determinants at{' '}
            <strong className="text-black">35%.</strong>
            <br />
            Social determinants at{' '}
            <strong className="text-black">24%.</strong>
            <br />
            Genetic determinants at{' '}
            <strong className="text-black">22%.</strong>
            <br />
            Medical care determinants at{' '}
            <strong className="text-black">12%.</strong>
            <br />
            Environmental determinants at{' '}
            <strong className="text-black">7%.</strong>
          </p>

          <h3 className="header-md mt-8 mb-2">
            v2 - 30.Aug.2017
          </h3>
          <p className="text-gray leading-relaxed mb-4">
            The following are updated calculations for the relative
            contributions of each of the determinant categories. The
            relative contribution of each of the determinant categories to
            one&apos;s health was found using the values referenced from the
            six sources listed below.
          </p>
          <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
            <li>DHHS<sup><a href="#references">9</a></sup></li>
            <li>JAMA<sup><a href="#references">10, 12</a></sup></li>
            <li>Health Affairs<sup><a href="#references">11</a></sup></li>
            <li>WHO<sup><a href="#references">14</a></sup></li>
            <li>U.Wisconsin<sup><a href="#references">15</a></sup></li>
          </ul>
          <p className="text-gray leading-relaxed mb-4">
            Each determinant category value is an average based on adding
            the values from each of the aforementioned sources.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavior:{' '}
            <strong className="text-black">(50% [9] + 42% [10] + 40% [11] + 45% [12] + 30% [15]) / 5 = 41.4%</strong>
            <br />
            Social:{' '}
            <strong className="text-black">(15% [11] + 40% [15]) / 2 = 27.5%</strong>
            <br />
            Genetics:{' '}
            <strong className="text-black">(20% [9] + 30% [11]) / 2 = 25%</strong>
            <br />
            Medical care:{' '}
            <strong className="text-black">(10% [9] + 10% [11] + 20% [15]) / 3 = 13.33...%</strong>
            <br />
            Environment:{' '}
            <strong className="text-black">(20% [9] + 3% [10] + 5% [11] + 3.9% [14] + 10% [15]) / 5 = 8.38%</strong>
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Additional notes on the determinant category values: For
            source<sup><a href="#references">10</a></sup>, The environmental value of ~3% was based on dividing toxic
            agent deaths (60,000 deaths. Toxic agents were defined as
            occupational hazards, environmental pollutants, contaminants
            of food and water supplies, and components of commercial
            products) divided by total deaths for that year (2,120,000).
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The average values found for each of the determinant
            categories were each divided by the total determinant value.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Total value:{' '}
            <strong className="text-black">41.4% + 27.5% + 25% + 13.33...% + 8.38% = 115.6133</strong>
            <br />
            Behavior:{' '}
            <strong className="text-black">41.4% / 115.6133... = 35.81%</strong>
            <br />
            Social:{' '}
            <strong className="text-black">27.5% / 115.6133... = 23.79%</strong>
            <br />
            Genetics:{' '}
            <strong className="text-black">25% / 115.6133... = 21.62%</strong>
            <br />
            Medical care:{' '}
            <strong className="text-black">13.33...% / 115.6133... = 11.53%</strong>
            <br />
            Environment:{' '}
            <strong className="text-black">8.38% / 115.6133... = 7%</strong>
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The final percentages are as follows.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavioral determinants at{' '}
            <strong className="text-black">36%</strong>
            <br />
            Social determinants at{' '}
            <strong className="text-black">24%</strong>
            <br />
            Genetic determinants at{' '}
            <strong className="text-black">22%</strong>
            <br />
            Medical care determinants at{' '}
            <strong className="text-black">11%</strong> (rounded down)
            <br />
            Environmental determinants at{' '}
            <strong className="text-black">7%</strong>
          </p>

          <h3 className="header-md mt-8 mb-2">
            v3 - 15.Nov.2018
          </h3>
          <p className="text-gray leading-relaxed mb-4">
            The following is a more detailed explanation of the values
            used to find the relative contributions of each of the
            determinant categories.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Each determinant category value is an average based on adding
            the values from each of the aforementioned sources.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavior:{' '}
            <strong className="text-black">(50% [9] + 43% [10] + 40% [11] + 43% [12] + 30% [15]) / 5 = 41.20%</strong>
            <br />
            Social:{' '}
            <strong className="text-black">(15% [11] + 40% [15]) / 2 = 27.50%</strong>
            <br />
            Genetics:{' '}
            <strong className="text-black">(20% [9] + 30% [11]) / 2 = 25.00%</strong>
            <br />
            Medical care:{' '}
            <strong className="text-black">(10% [9] + 10% [11] + 20% [15]) / 3 = 13.33...%</strong>
            <br />
            Environment:{' '}
            <strong className="text-black">(20% [9] + 3% [10] + 5% [11] + 4% [14] + 10% [15]) / 5 = 8.40%</strong>
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The environmental value of ~3%<sup><a href="#references">10</a></sup>{' '}
            was based on taking toxic agent deaths (60,000, defined as
            occupational hazards, environmental pollutants, contaminants
            of food and water supplies, and components of commercial
            products) and dividing by total deaths for the year of 1990
            (2,120,000).
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The behavior value of 42%<sup><a href="#references">10</a></sup>{' '}
            was based on taking the causes of death in 1990 due to
            behavior (50%, page 2208) and subtracting deaths caused by
            microbial &amp; toxic agents (4% + 3%, page 2208) = 43%.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The behavior value of 45%<sup><a href="#references">12</a></sup>{' '}
            was based on taking the causes of death in 2000 (48.2%, page
            1240), and subtracting deaths caused by microbial &amp; toxic
            agents (3.1% + 2.3%, page 1240) = 42.8% → 43%.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The environment value of 4%<sup><a href="#references">14</a></sup>{' '}
            was based on global risk for burden of disease due to unsafe
            water, sanitation and hygiene (4%, page V).
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The average values found for each of the determinant
            categories were each divided by the total determinant value.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Total value:{' '}
            <strong className="text-black">41.2% + 27.5% + 25% + 13.33...% + 8.38% = 115.413...</strong>
            <br />
            Behavior:{' '}
            <strong className="text-black">41.2% / 115.413... = 35.70%</strong>
            <br />
            Social:{' '}
            <strong className="text-black">27.5% / 115.413... = 23.83%</strong>
            <br />
            Genetics:{' '}
            <strong className="text-black">25% / 115.413... = 21.66%</strong>
            <br />
            Medical care:{' '}
            <strong className="text-black">13.33...% / 115.413... = 11.55%</strong>
            <br />
            Environment:{' '}
            <strong className="text-black">8.4% / 115.413... = 7.28%</strong>
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The final percentages are unchanged from v2.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Behavioral determinants at{' '}
            <strong className="text-black">36%</strong>
            <br />
            Social determinants at{' '}
            <strong className="text-black">24%</strong>
            <br />
            Genetic determinants at{' '}
            <strong className="text-black">22%</strong>
            <br />
            Medical care determinants at{' '}
            <strong className="text-black">11%</strong> (rounded down)
            <br />
            Environmental determinants at{' '}
            <strong className="text-black">7%</strong> (rounded down)
          </p>

          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mt-8">
            Additional Change
          </h2>
          <h3 className="header-md mt-4 mb-2">14.Feb.2018</h3>
          <p className="text-gray leading-relaxed mb-4">
            Race and ethnicity have been removed from the biology section
            due to a lack of standard objective criteria in the scientific
            community surrounding the use of genetics to define race and
            ethnicity. It has been added to the Social Circumstance
            section due to its continued social importance in describing
            groups based on similar characteristics. View the following
            literature for additional detail:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
            <li>
              Fujimura, J. H., &amp; Rajagopalan, R. (2010). Different
              differences: The use of &apos;genetic ancestry&apos; versus race in
              biomedical human genetic research. Social Studies of
              Science, 41(1), 5-30. doi:10.1177/0306312710379170
            </li>
            <li>
              Long, J. C., &amp; Kittles, R. A. (2003). Human Genetic
              Diversity and the Nonexistence of Biological Races. Human
              Biology, 75(4), 449-471. doi:10.1353/hub.2003.0058
            </li>
            <li>
              AR, T. (2013). Biological races in humans. [Abstract]. Stud
              Hist Philos Biol Biomed Sci, 262-271. Retrieved February 14,
              2018, from{' '}
              <a
                href="https://www.ncbi.nlm.nih.gov/pubmed/23684745"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                https://www.ncbi.nlm.nih.gov/pubmed/23684745
              </a>
              .
            </li>
            <li>
              Caprio, S., Daniels, S. R., Drewnowski, A., Kaufman, F. R.,
              Palinkas, L. A., Rosenbloom, A. L.,... Kirkman, M. S.
              (2008). Influence of Race, Ethnicity, and Culture on
              Childhood Obesity: Implications for Prevention and
              Treatment. Obesity, 16(12), 2566-2577.
              doi:10.1038/oby.2008.398
            </li>
          </ul>
          <p className="text-gray leading-relaxed mb-4">
            Discrimination can be further subdivided into racial, ethnic,
            gender, sexuality, and age based discrimination.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Poster images have been updated based on the updated Aug 2017
            calculations.
          </p>
          <h3 className="header-md mt-4 mb-2">14.Apr.2020</h3>
          <p className="leading-relaxed mb-4">
            Spanish poster version added, based on the updated Aug 2017
            calculations. Translation by Roberto Laureles.
          </p>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">Authors</h2>
          <Author name="Edwin Choi" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo, MIT" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray mb-4">
            Spanish poster translation by{' '}
            <strong>Roberto Laureles</strong>
          </p>
          <Author name="Daniel Reeves" />
          <Author name="Bryson Wong" />
          <Author name="Hrothgar" company="GoInvo" />
          <Author name="Kelsey Kittelsen" company="Dartmouth College" />

          <AboutGoInvo className="mt-12" />
        </div>
      </section>

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
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
