import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { References } from '@/components/ui/References'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { PrototypeViewer } from './PrototypeViewer'

export const metadata: Metadata = {
  title: 'Public Restroom to Public Healthroom - GoInvo',
  description:
    'Preventative Health Infrastructure for cities and towns.',
}

const prototypeRoomImages = [
  { id: 'entry', label: 'Entry' },
  { id: 'entry-open-door', label: 'Entry - Open Door' },
  { id: 'entry-lidar', label: 'Entry - LiDAR Scan' },
  { id: 'body-scan', label: 'Body Scan' },
  { id: 'body-scan-active', label: 'Body Scan - Active' },
  { id: 'body-scan-open-door', label: 'Body Scan - Open Door' },
  { id: 'toilet', label: 'Toilet Area' },
  { id: 'using-toilet', label: 'Using Toilet' },
  { id: 'toilet-door-open', label: 'Toilet - Door Open' },
  { id: 'blood-vision', label: 'Blood / Vision Test' },
  { id: 'exit', label: 'Exit' },
]

const prototypeLogicFrames = Array.from({ length: 28 }, (_, i) => i + 1)

export default function PublicHealthroomPage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/public-healthroom/pubhrm-hero-1.jpg'
        )}
      />

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Public Restroom to Public Healthroom
          </h1>
          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light mt-4 mb-6">
            As part of GoInvo&apos;s Design Vision Series on Health Futures, we
            explore preventative health infrastructure for cities and towns.
          </h2>
          <p className="leading-relaxed mb-4">
            Infrastructure is public health, preventive health, and personal
            health. Historically, we see this relationship in everything from
            the reduction of waterborne disease through water sanitation
            systems to the one-year extension to New York City citizens&apos;
            lifespan with added bike lanes.<sup><a href="#references">1</a></sup>{' '}
            As healthcare shifts from a focus on treatment to prevention, from
            quantity to quality, and from mega-medical campuses to local
            community centers, new infrastructural opportunities continue to
            arise.
          </p>

          <h3 className="header-md mt-8 mb-3">The Public Healthroom Concept</h3>
          <p className="leading-relaxed mb-4">
            One such opportunity is the screening and prevention of chronic
            illnesses—specifically by evolving the role of public restrooms in
            health. The public healthroom is a one-stop shop for US residents
            to access basic health screening through daily encounters. The
            room is composed of devices and communication tools that provide
            screening and risk assessment for common chronic diseases like
            diabetes and heart attacks. These devices collect the resident&apos;s
            biometric data to generate a personal health &quot;receipt&quot; that can
            indicate health abnormalities, suggest further testing, and
            provide useful information for follow-up with a primary care
            physician.
          </p>

          <h3 className="header-md mt-8 mb-3">
            The public healthroom follows four primary principles:
          </h3>
          <div className="max-w-[80%]">
            <ol className="list-decimal list-outside pl-6 space-y-3 mb-8 leading-relaxed">
              <li>
                Residents own their health data. The public healthroom is a
                means for individuals to access and understand their key
                physical health indicators, but it protects your privacy and
                does not sell historical data to third-parties.
              </li>
              <li>
                All residents should have easy access to preventive care. No
                one should have to ignore health concerns because of
                geographic or socioeconomic barriers.
              </li>
              <li>
                Preventive care must meet residents where they are. The public
                healthroom bridges the gap between complete self-care and
                professional hospital care. Based on analysis of a resident&apos;s
                biometrics across time, the healthroom provides detailed
                recommendations on seeking the appropriate level of care.
              </li>
              <li>
                Personal health is relative. The public healthroom helps each
                individual detect abnormalities in the context of their own
                history (e.g., sudden weight fluctuation, height loss, vision
                loss). Uncovering hidden signals can help prevent
                deterioration of various diseases (e.g., changes to the skin
                indicating risk for skin cancer).
              </li>
            </ol>
          </div>

          <Divider />

          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center max-w-sm mx-auto mt-8 mb-6">
            Who benefits from a Public Healthroom?
          </h2>

          <h3 className="header-md mt-8 mb-3">Individuals</h3>
          <p className="leading-relaxed mb-4">
            In 2015, only 8% of Americans age 35 or older received all
            high-priority preventive services recommended by providers, and
            nearly 5% received none. The year before, 60% of US residents had
            at least one chronic disease. (CDC)
          </p>
          <p className="leading-relaxed mb-4">
            Lack of preventive care use is a long-established issue in the US,
            and little has changed despite increased coverage through the
            Affordable Care Act. A 2018 survey identified lack of trust in
            physicians, long wait times, and work and family obligations as
            reasons for missing care (Borsky et. al, 2018). The public
            healthroom can provide residents with easy access to health
            screening and assistance as they attempt to navigate the complex
            healthcare system and receive necessary care.
          </p>

          <h3 className="header-md mt-8 mb-3">Cities/Towns</h3>
          <p className="leading-relaxed mb-4">
            Instead of being a strictly clinical effort, preventive primary
            care should be integrated into the community.
          </p>
          <p className="leading-relaxed mb-4">
            It is time to &quot;shift delivery into the community, reaching people
            where they live, work, learn, and play.&quot; (Krist et. al, 2015)
          </p>

          <h3 className="header-md mt-8 mb-3">State/Federal Government</h3>
          <p className="leading-relaxed mb-4">
            Responsible for setting data-driven national health objectives for
            the decade, Healthy People 2030 reported little progress when it
            came to increasing preventive care delivery and access. The target
            is to provide evidence-based preventive care to 11.5% of the
            population by 2030.<sup><a href="#references">2</a></sup>
          </p>
          <p className="leading-relaxed mb-4">Currently, it is at 6.5%.</p>

          <Divider />

          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center max-w-sm mx-auto mt-8 mb-6">
            How does the Public Healthroom help?
          </h2>

          <h3 className="header-md mt-8 mb-3">
            Health Screening as Daily Encounters:
          </h3>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed">
            <li>
              Conducts primary care checkups in adherence to state guidelines
            </li>
            <li>Provides each patient with a snapshot of their health</li>
            <li>
              Increases access to screenings and further assistance when
              necessary
            </li>
          </ul>

          <h3 className="header-md mt-8 mb-3">
            Increase Awareness for Preventative Health:
          </h3>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed">
            <li>
              Informs individuals about next steps after health screening
            </li>
            <li>
              Promotes relevant, micro-lifestyle changes that could prevent
              illnesses
            </li>
          </ul>

          <Divider />

          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center max-w-sm mx-auto mt-8 mb-6">
            What should the Public Healthroom measure?
          </h2>
        </div>

        {/* Google Sheets Embed */}
        <div className="pt-4 px-8 max-width mx-auto">
          <iframe
            width="100%"
            height="600"
            title="Public Healthroom Measurements Database"
            src="https://docs.google.com/spreadsheets/d/e/2PACX-1vTPI3YSZRKH6QSzM5DO5oGjdAePOLgJK_Dx4_ehEyQjF9pi9Ed6EUj2JInu3tjr59yzEvBiEl0oy2Yy/pubhtml?widget=true&amp;headers=false"
            className="border-0"
          />
        </div>

        {/* Design Vision section */}
        <div className="max-width max-width-sm content-padding mx-auto mt-12 pt-4">
          <Divider />
          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center max-w-sm mx-auto mt-8 mb-6">
            Exploring Health Futures: Public Healthroom Design Vision
          </h2>
          <p className="leading-relaxed mb-4">
            Among the various methods to accomplish measurement goals detailed
            above, the following is one possible version of the screening
            episode: a fully-guided, automated sequence. The room itself is
            built modularly, so components can be replaced after extended use
            or updated with newer technology. As a thought experiment, this
            focuses less on limitations and logistics and explores a
            futuristic, ideal experience.
          </p>
        </div>

        {/* Floor plan image */}
        <div className="max-width mx-auto">
          <Image
            src={cloudfrontImage(
              '/images/features/public-healthroom/pubhrm-plan.png'
            )}
            alt="Public Healthroom floor plan"
            width={1600}
            height={900}
            className="w-full h-auto"
          />
        </div>

        {/* Interactive Prototype Viewer */}
        <PrototypeViewer
          roomImages={prototypeRoomImages}
          logicFrames={prototypeLogicFrames}
        />

        {/* Final Thoughts */}
        <div className="max-width max-width-md content-padding mx-auto mt-12 pt-4">
          <Divider />
          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center max-w-sm mx-auto mt-8 mb-6">
            Final Thoughts
          </h2>
          <p className="leading-relaxed mb-4">
            In the fiscal year 2021-2022, the operation cost of San Francisco
            Public Works was $12.7 million or $113,000 per year per public
            portable toilet open 40 hours/week.<sup><a href="#references">3</a></sup>{' '}
            With this as a baseline, the costs to engineer, build, and operate the
            public healthroom would be much higher—however, there is
            significant potential value in developing a preventive health
            infrastructure that transitions US healthcare spendings from
            quantity to quality. The next step would be developing a minimum
            viable product (MVP) with analysis on potential funding structures
            (private vs. public vs. hybrid).
          </p>
          <p className="leading-relaxed mb-4">
            One possible MVP approach is to develop the lowest-cost version
            that aggregates current off-the-shelf technologies but maximizes
            ease of use. Another is to develop each tool separately:
          </p>
          <ul className="list-disc list-outside pl-6 space-y-3 mb-8 leading-relaxed">
            <li>
              Refurbish public or community center (YMCA, Student Centers,
              retail toilets) restrooms with urine/stool analysis toilets
            </li>
            <li>
              Develop a software for screening recommendations based on age
              and sex for retail healthcare (CVS MinuteClinic, Walgreens
              Health, Walmart Health Center), and integrating with their
              screening/lab test services
            </li>
            <li>
              Aggregate at-home test/finger-prick test vendors into one
              physical vending machine at retailers and community health
              centers
            </li>
          </ul>
          <p className="leading-relaxed mb-4">
            By promoting lifestyle changes and increasing preventive care
            awareness and access, policy makers and care providers are
            constantly striving to support better health outcomes for all—the
            Public Healthroom opens up a conversation around seamlessly
            integrating health into our daily encounters via the built
            environment. As emergent technologies develop and preventive care
            needs increase in the next five years, success in implementation
            and public utilization will rely heavily on design, and on how
            thoroughly we consider how the experience of engaging with one&apos;s
            health can be seamless and timely without over-complications in
            technology.
          </p>
        </div>

        {/* Authors */}
        <div className="py-16">
          <div className="max-width max-width-md content-padding mx-auto">
            <Divider />
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mt-8 mb-4">
              Authors
            </h2>
            <Author name="Jenny Yi" company="GoInvo" />
            <Author name="Juhan Sonin" company="GoInvo" />

            <h3 className="header-md mt-12 mb-3">Contributors</h3>
            <p className="text-gray">Samantha Wuu</p>
            <p className="text-gray">Craig McGinley</p>
          </div>
        </div>

        {/* Newsletter */}
        <section className="bg-gray-lightest py-8">
          <div className="max-width max-width-md content-padding mx-auto">
            <div className="bg-white shadow-card py-6 px-4 md:px-8">
              <NewsletterForm />
            </div>
          </div>
        </section>

        {/* References */}
        <div className="py-16">
          <div className="max-width max-width-md content-padding mx-auto">
            <References
              items={[
                {
                  title: 'Bike lanes are a sound public health investment',
                  link: 'https://www.reuters.com/article/us-health-costbenefit-bike-lanes/bike-lanes-are-a-sound-public-health-investment-idUSKCN11Z23A',
                },
                {
                  title: 'Healthy People 2030',
                  link: 'https://health.gov/healthypeople/objectives-and-data/browse-objectives/preventive-care',
                },
                {
                  title: "Two cities' approaches to increasing public bathrooms",
                  link: 'https://www.smartcitiesdive.com/news/two-cities-approaches-to-increasing-public-bathrooms/628387/',
                },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
