import type { Metadata } from 'next'
import Image from 'next/image'
import { Divider } from '@/components/ui/Divider'
import { Quote } from '@/components/ui/Quote'
import { Author } from '@/components/ui/Author'
import { References } from '@/components/ui/References'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { cloudfrontImage } from '@/lib/utils'
import refs from '@/data/vision/fraud-waste-abuse-in-healthcare/references.json'

export const metadata: Metadata = {
  title: 'Fraud, Waste, and Abuse in Healthcare - GoInvo',
  description:
    'The $1 Trillion yearly burden on the US Healthcare system.',
}

export default function FraudWasteAbuseHealthcarePage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/fraud-waste-abuse-in-healthcare/fwa-hero1.png'
        )}
      />

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Fraud, Waste, and Abuse in Healthcare
          </h1>
          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light mt-8 mb-0">
            30% of US Healthcare spending is lost to Fraud, Waste, and
            Abuse.
            <sup>
              <a href="#methodology">A1</a>
            </sup>
          </h2>
          <p className="leading-relaxed mb-4">
            Fraud, Waste, and Abuse (FWA) is a challenge in every industry.
            <br />
            In healthcare, FWA leads to significant financial losses, estimated
            to cost the U.S. healthcare system billions of dollars annually. This
            misuse of resources drives up healthcare costs and impacts the
            quality of care that patients receive.
          </p>
          <p className="leading-relaxed mb-4">
            Our research in 2024 explores identifying the size of FWA in
            Healthcare, setting a common vocabulary of definitions and
            categories, and potential solutions.
          </p>
          <p className="leading-relaxed mb-4">
            We looked into FWA a decade ago. Sadly, there is still no national
            effort on tracking with rigor, and little publicly reported data.
          </p>

          <Divider />

          {/* What is FWA? */}
          <div className="pt-4 pb-4 px-4 mb-8">
            <h2 className="font-serif text-2xl mt-12 mb-4 text-center max-w-sm mx-auto">
              What is Fraud, Waste, and Abuse?
            </h2>
          </div>
          <h3 className="header-md">Crafting a common definition</h3>
          <p className="leading-relaxed mb-4">
            Healthcare organizations have varying definitions of FWA.
            We&apos;ve taken the FWA definition from several organizations and
            have distilled each into a single sentence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="leading-relaxed mb-4">
                <strong className="text-secondary">Fraud:</strong> intentional
                misuse of healthcare system resources.
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-secondary">Waste:</strong> unintentional
                misuse of healthcare system resources.
              </p>
              <p className="leading-relaxed mb-4">
                <strong className="text-secondary">Abuse:</strong> misuse of
                healthcare system resources independent of intention.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <Image
                src={cloudfrontImage(
                  '/images/features/fraud-waste-abuse-in-healthcare/fwa-definition1.jpg'
                )}
                alt="FWA definition pie chart"
                width={500}
                height={500}
                className="w-full max-w-sm h-auto"
              />
            </div>
          </div>
          <p className="leading-relaxed mb-4">
            Based on these definitions, the focus is on the intent to determine
            Fraud or Waste. While Abuse becomes the umbrella for all misuse of
            healthcare resources regardless of intent.
          </p>

          <Divider />

          {/* The Cost of FWA */}
          <div className="pt-4 pb-4 px-4 mb-8">
            <h2 className="font-serif text-2xl mt-12 mb-4 text-center max-w-sm mx-auto">
              The Cost of FWA, $1 Trillion
            </h2>
          </div>
          <h3 className="header-md">Estimating FWA</h3>
          <p className="leading-relaxed mb-4">
            Finding the total amount of Fraud, Waste, and Abuse is a challenge.
            <br />
            In our research, we found an estimate of 10% fraud and 20% waste,
            totaling 30%.
            <sup>
              <a href="#methodology">A1</a>
            </sup>{' '}
            While the data below is from 2009, today in 2024, it is still the
            most recent estimate of total FWA in US Healthcare.
          </p>

          <Quote
            text="30 percent of U.S. health spending (public and private) in 2009 — roughly $750 billion — was wasted on unnecessary services, excessive administrative costs, fraud, and other problems."
            author="United States Department of Health and Human Services (HHS)"
          />
          <p className="text-right text-sm text-gray -mt-4 mb-8">
            <sup>
              <a href="#references">5</a>
            </sup>
          </p>

          <h3 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center">
            30% FWA
          </h3>
          <div className="flex justify-center my-4">
            <Image
              src={cloudfrontImage(
                '/images/features/fraud-waste-abuse-in-healthcare/fwa-high-pie2.jpg'
              )}
              alt="30% FWA pie chart"
              width={600}
              height={400}
              className="w-full max-w-md h-auto"
            />
          </div>
          <h3 className="header-md text-center">
            Fraud 10% + Waste 20%
            <sup>
              <a href="#methodology"> A2</a>
            </sup>
          </h3>

          <Quote
            text="Estimates of fraudulent billings to health care programs, both public and private, are estimated between 3 and 10 percent of total health care expenditures."
            author="Federal Bureau of Investigation (FBI)"
          />
          <p className="text-right text-sm text-gray -mt-4 mb-8">
            <sup>
              <a href="#references">3</a>
            </sup>
          </p>

          {/* Recovering FWA */}
          <div className="pt-4 pb-4 px-4 mb-8">
            <h2 className="font-serif text-2xl mt-12 mb-4 text-center max-w-sm mx-auto">
              Recovering FWA
            </h2>
          </div>
          <h3 className="header-md">
            For every $1 Invested, $4 Recovered
          </h3>
          <div className="flex justify-center my-4">
            <Image
              src={cloudfrontImage(
                '/images/features/fraud-waste-abuse-in-healthcare/roi.jpg'
              )}
              alt="ROI of FWA recovery efforts"
              width={700}
              height={400}
              className="w-full max-w-lg h-auto"
            />
          </div>
          <p className="leading-relaxed mb-4">
            The Department of Health and Human Services (HHS) and the Department
            of Justice (DOJ) have a joint Health Care Fraud and Abuse Control
            (HCFAC) Program. The HCFAC protects consumers and taxpayers by
            combating healthcare fraud.
          </p>
          <p className="leading-relaxed mb-4">
            Over the last three years, they returned $4 for every $1 invested in
            recovery efforts.
            <sup>
              <a href="#references">4</a>
            </sup>
          </p>
          <p className="leading-relaxed mb-4">
            Below, we can look deeper into FY2021 spending and recovery.
          </p>

          {/* 4-column stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
            <div className="flex flex-col items-center">
              <div className="bg-gray-light w-full py-6 px-4 text-center font-serif text-2xl">
                $1.1B
              </div>
              <p className="text-center text-sm mt-2">
                Dollars Invested In FWA Recovery
                <sup>
                  <a href="#references"> 4</a>
                </sup>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-gray-light w-full py-6 px-4 text-center font-serif text-2xl">
                $1.9B
              </div>
              <p className="text-center text-sm mt-2">
                Dollars
                <br />
                Recovered
                <sup>
                  <a href="#references"> 4</a>
                </sup>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-gray-light w-full py-6 px-4 text-center font-serif text-2xl">
                0.14%
              </div>
              <p className="text-center text-sm mt-2">
                Percent of loss Recovered
                <sup>
                  <a href="#methodology"> A3</a>
                </sup>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-gray-light w-full py-6 px-4 text-center font-serif text-2xl">
                0.026%
              </div>
              <p className="text-center text-sm mt-2">
                Percent of Spending Put Towards Recovery
                <sup>
                  <a href="#methodology"> A4</a>
                </sup>
              </p>
            </div>
          </div>

          <p className="leading-relaxed mb-4">
            While FY2021 was on the lower end of success during the three year
            rolling average, the HCFAC made $0.9B from their efforts. Only 0.14%
            of loss to fraud, waste, and abuse was recovered, leaving tons of
            money intended for healthcare use unrecovered. The $0.9B success,
            paired with the low 0.026% of US Healthcare spending allocated to the
            HCFAC for recovery efforts, makes us question why not invest more?
          </p>

          <Divider />

          {/* Proposed Solutions */}
          <div className="pt-4 pb-4 px-4 mb-8">
            <h2 className="font-serif text-2xl mt-12 mb-4 text-center max-w-sm mx-auto">
              Proposed Solutions
            </h2>
          </div>

          {/* Concept 1: Health Accuracy Receipt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8">
            <div>
              <h3 className="header-md">
                Concept 1: Health Accuracy Receipt
              </h3>
              <p className="leading-relaxed mb-4">
                The Health Accuracy Receipt uses the patient as the fraud
                detection system.
              </p>
              <p className="leading-relaxed mb-4">
                The receipt is sent to patients after an encounter to confirm
                what happened during their visit.
              </p>
              <p className="leading-relaxed mb-4">
                It makes reporting fraud, waste, and abuse available to anyone.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <Image
                src={cloudfrontImage(
                  '/images/features/fraud-waste-abuse-in-healthcare/phone.png'
                )}
                alt="Health Accuracy Receipt phone mockup"
                width={400}
                height={700}
                className="w-full max-w-xs h-auto"
              />
            </div>
          </div>

          {/* Concept 2: FWA Tracker */}
          <h3 className="header-md">Concept 2: FWA Tracker</h3>
          <p className="leading-relaxed mb-4">
            The FWA Tracker is a real-time fraud, waste, and abuse detection
            dashboard. It is built from a database which collects data from
            numerous sources, such as the Health Accuracy Receipt.
          </p>
          <div className="my-4">
            <Image
              src={cloudfrontImage(
                '/images/features/fraud-waste-abuse-in-healthcare/map-view.jpg'
              )}
              alt="FWA Tracker map view"
              width={1000}
              height={600}
              className="w-full h-auto"
            />
          </div>
          <div className="mt-12">
            <Image
              src={cloudfrontImage(
                '/images/features/fraud-waste-abuse-in-healthcare/tree-view-v02.jpg'
              )}
              alt="FWA Tracker tree view"
              width={1000}
              height={600}
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Methodology - blue background */}
      <section className="bg-blue text-white py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <div id="methodology">
            <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
              Methodology
            </h2>
            <p className="text-white/80 mb-4">
              Below is a description of the methodology used in creating the
              Fraud, Waste, and Abuse in US Healthcare report. Calculations are
              based on expert estimates, therefore final percentages are an
              estimate and should not be viewed as absolute numbers.
            </p>

            <h3 className="header-md mt-8 mb-2 !text-white/70">
              v1 - 1.Jul.2024
            </h3>

            <h3 className="header-md mt-8 mb-2 !text-white">Calculations</h3>

            <p className="text-white/80 mb-4">
              A1 - 30% of US healthcare spending lost to FWA
              <br />
              Total value:{' '}
              <strong className="text-secondary">
                10%{' '}
                <sup>
                  <a href="#references" className="text-secondary">
                    3
                  </a>
                </sup>{' '}
                + 20%{' '}
                <sup>
                  <a href="#references" className="text-secondary">
                    2
                  </a>
                </sup>{' '}
                = 30%
              </strong>
            </p>
            <p className="text-white/80 mb-4">
              A2 - $1.32T of US healthcare spending lost to FWA
              <br />
              Total value:{' '}
              <strong className="text-secondary">
                $4.4T{' '}
                <sup>
                  <a href="#references" className="text-secondary">
                    1
                  </a>
                </sup>{' '}
                x 30%{' '}
                <sup>
                  <a href="#methodology" className="text-secondary">
                    A1
                  </a>
                </sup>{' '}
                = $1.32T
              </strong>
            </p>
            <p className="text-white/80 mb-4">
              A3 - 0.14% of loss to FWA is recovered
              <br />
              Total value:{' '}
              <strong className="text-secondary">
                $1.9B{' '}
                <sup>
                  <a href="#references" className="text-secondary">
                    4
                  </a>
                </sup>{' '}
                / $1.32T{' '}
                <sup>
                  <a href="#methodology" className="text-secondary">
                    A2
                  </a>
                </sup>{' '}
                = 0.1439%
              </strong>
            </p>
            <p className="text-white/80 mb-4">
              A4 - 0.0257% of total healthcare spending is put towards recovery
              <br />
              Total value:{' '}
              <strong className="text-secondary">
                $1.129B{' '}
                <sup>
                  <a href="#references" className="text-secondary">
                    4
                  </a>
                </sup>{' '}
                / $4.4T{' '}
                <sup>
                  <a href="#references" className="text-secondary">
                    1
                  </a>
                </sup>{' '}
                = 0.0257%
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author name="Michelle Bourdon" />
          <Author name="Eric Benoit" />
          <Author name="Juhan Sonin" />
        </div>
      </section>

      {/* Contributors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h3 className="header-md mt-0 mb-3">Contributors</h3>
          <p className="text-gray">
            Edwin Choi, GoInvo
            <br />
            Anesu Machoko, MetaDigital
            <br />
            Philip Mattera, Good Jobs First
            <br />
            Siobhan Standaert, Good Jobs First
            <br />
            Jung Hoon Son, Clinicians.fyi
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

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
        </div>
      </section>
    </div>
  )
}
