import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/healthcare-dollars/references.json'

export const metadata: Metadata = {
  title: 'Where Your Health Dollars Go',
  description:
    'Tracking the allocation and flow of money in the US healthcare system to reveal connections within.',
}

export default function HealthcareDollarsPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/healthcare-dollars/healthcare-dollars-hero.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Where Your Health Dollars Go
          </h1>
          <h3 className="header-md">
            To Understand the Healthcare system, follow the money
          </h3>
          <p className="text-gray">
            &ldquo;Where your Health Dollars Go&rdquo; is a map of the US healthcare
            system and its components. By following the allocation and flow
            of money in healthcare, the thread of how the organizations,
            departments, and major players are connected becomes apparent.
          </p>
          <p className="text-gray">
            The visualization serves two purposes. The first is to provide
            the public and professionals interested in the healthcare space
            a way to increase understanding and explore how all the pieces
            fit together. The second is to give providers, patient advocacy
            groups, health policymakers, and health economists a visual
            communication tool to discuss issues at the higher health
            systems level.
          </p>
        </div>

        {/* Poster Preview */}
        <div className="my-8">
          <a
            href={cloudfrontImage('/pdf/vision/healthcare-dollars/healthcare-dollars-visualization.pdf')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage('/images/features/healthcare-dollars/healthcare-dollars-preview-4.jpg')}
              alt="Where Your Health Dollars Go visualization preview"
              width={1600}
              height={900}
              className="w-full h-auto"
            />
          </a>
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          {/* Download / Buy Buttons */}
          <div className="flex flex-col lg:flex-row gap-4 my-8">
            <Button
              href={cloudfrontImage('/pdf/vision/healthcare-dollars/healthcare-dollars-visualization.pdf')}
              variant="secondary"
              size="lg"
              external
            >
              Download
            </Button>
            <Button
              href="https://www.amazon.com/dp/B07S3WT7ZR/"
              variant="secondary"
              size="lg"
              external
            >
              Buy Print
            </Button>
          </div>

          {/* Footnotes */}
          <div className="text-sm text-gray">
            <p>
              *Tax exclusion $ amount is not added into the $3,500B national
              health expenditure. Though it is a part of expenditure, it is
              not included in many data sources and is unclear how it should
              be best organized without causing contradictions in the
              expenditure breakdowns.
            </p>
            <p>
              *$168B in research is a higher $ amount than the category
              breakdowns within it, as the $ amounts are taken from sources
              from differing years.
            </p>
            <p>
              *All $ amounts have been rounded to the nearest billionth for
              readability and scanning purposes.
            </p>
          </div>

          <Divider />

          <p className="mt-8 text-gray">
            The US healthcare system is extremely convoluted. To call it
            &ldquo;spaghetti&rdquo; would be an understatement. Because of the
            complexity, accurately capturing and following associative and
            financial relationships is difficult. The wider picture of how
            organizations are connected, how money flows through the US
            healthcare system is difficult to see. As a result, public
            discourse around US healthcare issues and reforms are often too
            narrow in context. Many consumer services and products developed
            in the health technology space don&apos;t consider long term,
            primary, secondary or tertiary, downstream effects they will
            have on the market or for patients in this wider view.
          </p>
          <p className="text-gray">
            &ldquo;Where your Health Dollars Go&rdquo; provides a detailed high-level
            view of major components within the US healthcare system and how
            they interact. The map serves as a communication tool for health
            professionals, organizations, groups, and policymakers to
            develop services and policies with the context of the larger
            picture of how their plans may impact the nation from the
            government to individual patients. The visualization also
            provides a canvas for professionals to use, projecting their
            services and products on the map, to more effectively drive
            development that aligns with our patient health values.
          </p>

          <h2 className="header-lg mt-8 mb-4 text-center">
            We&apos;d love your feedback
          </h2>
          <p className="text-gray">
            The current draft of the visualization maps some of the major
            players. However, there are many parts of the system that have
            yet to be incorporated, and there may yet be improved ways to
            represent those relationships than the approach taken here.
          </p>
          <p className="text-gray">
            Send feedback on this draft to{' '}
            <a
              href="mailto:hello@goinvo.com?subject=Healthcare%20Dollars"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              hello@goinvo.com
            </a>
            , and help us, as well as others, gain a better understanding of
            the often convoluted, and complex, system that is our
            healthcare.
          </p>
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

      {/* Methodology - Blue Section */}
      <section className="bg-blue text-white py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <div id="methodology">
            <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
              Methodology
            </h2>
            <p className="text-white/80 mb-4">
              Below is a description of the methodology used in creating the
              &ldquo;Where your Health Dollars Go&rdquo; visualization. It is updated
              based on continuing research and feedback.
            </p>

            <h3 className="header-md mt-8 mb-2 !text-white/70">
              v1 - 30.Jan.2019
            </h3>
            <p className="text-white/80 mb-4">
              The components of the healthcare system to include in the
              visualization were primarily based on what public data was
              available. Some expenditures were based on older estimates due
              to difficulty in finding up to date data (such as
              administrative costs for private health insurance).
            </p>
            <p className="text-white/80 mb-4">
              Other expenditures, such as numbers on fraud, waste, and abuse
              for health insurance programs, are best guesses based on a
              range of estimates as referenced below.
            </p>

            {/* Column 1, National health expenditure */}
            <p className="text-white/60 text-sm mt-8">
              Column 1, National health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$3,500B</strong>, 2017 National Health Expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
              </li>
            </ul>

            {/* Column 2, National health expenditure */}
            <p className="text-white/60 text-sm">
              Column 2, National health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$2,600B</strong>, 2017 National health insurance
                <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
              </li>
              <li>
                <strong>$366B</strong>, 2017 Out of pocket
                <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
              </li>
              <li>
                <strong>$355B</strong>, 2017 Other third party payers and
                public health activity
                <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
              </li>
              <li>
                <strong>$250B</strong>, 2017 Tax exclusion, employee
                health insurance subsidy
                <sup><a href="#references" className="text-white/60 hover:text-white">2</a></sup>
              </li>
              <li>
                <strong>$168B</strong>, 2017 Research
                <sup><a href="#references" className="text-white/60 hover:text-white">3</a></sup>
              </li>
            </ul>

            {/* Column 3, National health expenditure */}
            <p className="text-white/60 text-sm">
              Column 3, National health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$1,200B</strong>, 2017 Private health insurance
                <sup><a href="#references" className="text-white/60 hover:text-white">4</a></sup>
              </li>
              <li>
                <strong>$1,400B</strong>, 2017 Public health insurance
                <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
              </li>
              <li>
                <strong>$103B</strong>, 2015 Private funds
                <sup><a href="#references" className="text-white/60 hover:text-white">4</a></sup>
              </li>
              <li>
                <strong>$36B</strong>, 2017 Public funds
                <sup><a href="#references" className="text-white/60 hover:text-white">4</a></sup>
              </li>
              <li>
                <strong>$5B</strong>, 2017 Nonprofit foundations
                <sup><a href="#references" className="text-white/60 hover:text-white">4</a></sup>
              </li>
            </ul>

            {/* Column 4, National health expenditure */}
            <p className="text-white/60 text-sm">
              Column 4, National health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$1,030.8B</strong>, 2017 Patient benefits
                <sup><a href="#references" className="text-white/60 hover:text-white">5</a></sup>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>$3,500B</strong>, 2017 private health
                    insurance expenditure
                    <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
                    {' '}minus <strong>$169.2B</strong> 2017 estimated
                    administrative costs in private health insurance.
                  </li>
                </ul>
              </li>
              <li>
                <strong>$169.2B</strong>, 2017 Administrative costs,
                private health insurance
                <sup><a href="#references" className="text-white/60 hover:text-white">5</a></sup>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>14.1%</strong> in private health insurance
                    administrative costs
                    <sup><a href="#references" className="text-white/60 hover:text-white">5</a></sup>
                    , multiplied by <strong>$3,500B</strong> 2017
                    expenditure
                    <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
                  </li>
                </ul>
              </li>
              <li>
                <strong>$804.51B</strong>, 2017 Medicare expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">6</a></sup>
              </li>
              <li>
                <strong>$582B</strong>, 2017 Medicaid expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">7</a></sup>
              </li>
              <li>
                <strong>$133B</strong>, 2017 Other health insurance
                programs
                <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
              </li>
              <li>
                <strong>$72B</strong>, 2015 Pharmaceutical private funds
                <sup><a href="#references" className="text-white/60 hover:text-white">3</a></sup>
              </li>
              <li>
                <strong>$17B</strong>, 2015 Medical technology private
                funds
                <sup><a href="#references" className="text-white/60 hover:text-white">3</a></sup>
              </li>
              <li>
                <strong>$6B</strong>, 2015 Biotechnology private funds
                <sup><a href="#references" className="text-white/60 hover:text-white">3</a></sup>
              </li>
              <li>
                <strong>$7B</strong>, 2015 Other sectors
                <sup><a href="#references" className="text-white/60 hover:text-white">3</a></sup>
              </li>
            </ul>

            {/* Column 5, National health expenditure */}
            <p className="text-white/60 text-sm">
              Column 5, National health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$534.64B</strong>, 2018 Insurance claims &amp;
                indemnities for Medicare
                <sup><a href="#references" className="text-white/60 hover:text-white">6</a></sup>
              </li>
              <li>
                <strong>$203.73B</strong>, 2018 Grants, subsidies,
                contributions for Medicare
                <sup><a href="#references" className="text-white/60 hover:text-white">6</a></sup>
              </li>
              <li>
                <strong>$66.13B</strong>, 2018 Other expenses for Medicare
                <sup><a href="#references" className="text-white/60 hover:text-white">6</a></sup>
              </li>
              <li>
                <strong>$71B</strong>, 2017 Administrative costs of
                Medicaid
                <sup><a href="#references" className="text-white/60 hover:text-white">8</a></sup>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>12.2%</strong> is mean administrative loss %
                    for MCOs, multiplied by
                    <strong> $582B</strong> 2017 Medicaid expenditure
                    <sup><a href="#references" className="text-white/60 hover:text-white">7</a></sup>
                  </li>
                </ul>
              </li>
              <li>
                <strong>$511B</strong>, 2017 Patient benefits from
                Medicaid
                <sup><a href="#references" className="text-white/60 hover:text-white">8</a></sup>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>$582B</strong>, 2017 Medicaid expenditure
                    <sup><a href="#references" className="text-white/60 hover:text-white">7</a></sup>
                    , minus <strong>$71B</strong> 2017 administrative
                    costs of Medicaid
                    <sup><a href="#references" className="text-white/60 hover:text-white">8</a></sup>
                    , minus <strong>$46B</strong> 2017 administrative
                    costs of Medicaid
                    <sup><a href="#references" className="text-white/60 hover:text-white">9</a></sup>
                  </li>
                </ul>
              </li>
              <li>
                <strong>$45.8B</strong>, 2014 Fraud, waste, and abuse
                within Medicaid
                <sup><a href="#references" className="text-white/60 hover:text-white">9</a></sup>
              </li>
              <li>
                <strong>$52.55B</strong>, 2017 TRICARE expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">10</a></sup>
              </li>
              <li>
                <strong>$17.52B</strong>, 2017 CHIP expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">11</a></sup>
              </li>
              <li>
                <strong>$62B</strong>, 2017 Other health insurance
                programs not listed here
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>$133B</strong>, 2017 Other health insurance
                    programs
                    <sup><a href="#references" className="text-white/60 hover:text-white">1</a></sup>
                    , minus <strong>$63B</strong> 2017 TRICARE
                    <sup><a href="#references" className="text-white/60 hover:text-white">10</a></sup>
                    , minus <strong>$18B</strong> 2017 CHIP
                    <sup><a href="#references" className="text-white/60 hover:text-white">11</a></sup>
                  </li>
                </ul>
              </li>
            </ul>

            {/* Column 6, National health expenditure */}
            <p className="text-white/60 text-sm">
              Column 6, National health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$454.14B</strong>, 2018 Patient benefits for
                Medicare
                <sup><a href="#references" className="text-white/60 hover:text-white">12</a></sup>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>$534.64B</strong>, Insurance claims &amp;
                    indemnities, minus
                    <strong> $80.5B</strong> 2018 fraud, waste, and abuse
                    <sup><a href="#references" className="text-white/60 hover:text-white">12</a></sup>
                  </li>
                </ul>
              </li>
              <li>
                <strong>$80.5B</strong>, 2018 Fraud, waste, and abuse for
                Medicare
                <sup><a href="#references" className="text-white/60 hover:text-white">12</a></sup>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    <strong>10%</strong> estimated fraud, waste, and abuse
                    in 2012
                    <sup><a href="#references" className="text-white/60 hover:text-white">12</a></sup>
                    , multiplied by <strong>$804.51B</strong> Medicare
                    expenditure
                    <sup><a href="#references" className="text-white/60 hover:text-white">6</a></sup>
                  </li>
                </ul>
              </li>
            </ul>

            {/* Column 1, Personal health expenditure */}
            <p className="text-white/60 text-sm mt-8">
              Column 1, Personal health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$2,800B</strong>, 2016 Personal health expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
            </ul>

            {/* Column 2, Personal health expenditure */}
            <p className="text-white/60 text-sm">
              Column 2, Personal health expenditure section
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$1,070B</strong>, 2016 Hospital, personal health
                expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
              <li>
                <strong>$658B</strong>, 2016 Physician and clinical,
                personal health expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
              <li>
                <strong>$325B</strong>, 2016 Prescription drugs, personal
                health expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
              <li>
                <strong>$160B</strong>, 2016 Nursing care facilities &amp;
                continuing care, personal health expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
              <li>
                <strong>$123B</strong>, 2016 Dental, personal health
                expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
              <li>
                <strong>$375B</strong>, 2016 Other personal health
                expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">13</a></sup>
              </li>
            </ul>

            {/* Column 1, Health and human services expenditure */}
            <p className="text-white/60 text-sm mt-8">
              Column 1, Health and human services expenditure
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$1,110B</strong>, 2018 Health and human services
                expenditure
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
            </ul>

            {/* Column 2, Health and human services expenditure */}
            <p className="text-white/60 text-sm">
              Column 2, Health and human services expenditure
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-6 text-white/80">
              <li>
                <strong>$1T</strong>, 2018 Centers for Medicare &amp; Medicaid
                Services
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
              <li>
                <strong>$47B</strong>, 2018 Administration for children &amp;
                families
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
              <li>
                <strong>$26B</strong>, 2018 National Institutes of Health
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
              <li>
                <strong>$6B</strong>, 2018 Centers for Disease Control &amp;
                Prevention
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
              <li>
                <strong>$5B</strong>, 2018 Indian Health Service
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
              <li>
                <strong>$4B</strong>, 2018 Substance abuse and mental
                health services administration
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
              <li>
                <strong>$2B</strong>, 2018 Food and drug administration
                <sup><a href="#references" className="text-white/60 hover:text-white">14</a></sup>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Author */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Author
          </h2>
          <Author name="Edwin Choi" company="GoInvo" />

          <Divider />

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
