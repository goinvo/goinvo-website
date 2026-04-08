import type { Metadata } from 'next'
import { Author } from '@/components/ui/Author'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { Divider } from '@/components/ui/Divider'
import { References } from '@/components/ui/References'
import { PrototypeViewer } from './PrototypeViewer'
import { cloudfrontImage } from '@/lib/utils'
import './public-healthroom.css'
import './healthroom.css'

const heroImage = '/images/features/public-healthroom/pubhrm-hero-1.jpg'

export const metadata: Metadata = {
  title: 'Public Restroom to Public Healthroom - GoInvo',
  description: 'Preventative Health Infrastructure for cities and towns.',
}

export default function PublicHealthroomPage() {
  return (
    <>
      <SetCaseStudyHero image={cloudfrontImage(heroImage)} />
      <div className="public-healthroom">
        <div className="max-width--md pad-horizontal margin-top pad-top margin-auto">
          <h1 className="header--xl">Public Restroom to Public Healthroom</h1>
          <h2 className="header--lg">
            As part of GoInvo&apos;s Design Vision Series on Health Futures, we
            explore preventative health infrastructure for cities and towns.
          </h2>
          <p>
            Infrastructure is public health, preventive health, and personal
            health. Historically, we see this relationship in everything from
            the reduction of waterborne disease through water sanitation
            systems to the one-year extension to New York City citizens&apos;
            lifespan with added bike lanes.<sup><a href="#references">1</a></sup> As
            healthcare shifts from a focus on treatment to prevention, from
            quantity to quality, and from mega-medical campuses to local
            community centers, new infrastructural opportunities continue to
            arise.
          </p>
          <h3 className="header--md">The Public Healthroom Concept</h3>
          <p>
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
          <h3 className="header--md">
            The public healthroom follows four primary principles:
          </h3>
          <div className="max-width--80">
            <ol>
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
          <h2 className="max-width--sm header--lg text--center margin-auto">
            Who benefits from a Public Healthroom?
          </h2>
          <h3 className="header--md">Individuals</h3>
          <p>
            In 2015, only 8% of Americans age 35 or older received all
            high-priority preventive services recommended by providers, and
            nearly 5% received none. The year before, 60% of US residents had
            at least one chronic disease. (CDC)
          </p>
          <p>
            Lack of preventive care use is a long-established issue in the US,
            and little has changed despite increased coverage through the
            Affordable Care Act. A 2018 survey identified lack of trust in
            physicians, long wait times, and work and family obligations as
            reasons for missing care (Borsky et. al, 2018). The public
            healthroom can provide residents with easy access to health
            screening and assistance as they attempt to navigate the complex
            healthcare system and receive necessary care.
          </p>
          <h3 className="header--md">Cities/Towns</h3>
          <p>
            Instead of being a strictly clinical effort, preventive primary
            care should be integrated into the community.
          </p>
          <p>
            It is time to &quot;shift delivery into the community, reaching people
            where they live, work, learn, and play.&quot; (Krist et. al, 2015)
          </p>
          <h3 className="header--md">State/Federal Government</h3>
          <p>
            Responsible for setting data-driven national health objectives for
            the decade, Healthy People 2030 reported little progress when it
            came to increasing preventive care delivery and access. The target
            is to provide evidence-based preventive care to 11.5% of the
            population by 2030.<sup><a href="#references">2</a></sup>
          </p>
          <p>Currently, it is at 6.5%.</p>
          <Divider />
          <h2 className="max-width--sm header--lg text--center margin-auto">
            How does the Public Healthroom help?
          </h2>
          <h3 className="header--md">
            Health Screening as Daily Encounters:
          </h3>
          <ul>
            <li>
              Conducts primary care checkups in adherence to state guidelines
            </li>
            <li>Provides each patient with a snapshot of their health</li>
            <li>
              Increases access to screenings and further assistance when
              necessary
            </li>
          </ul>
          <h3 className="header--md">
            Increase Awareness for Preventative Health:
          </h3>
          <ul>
            <li>
              Informs individuals about next steps after health screening
            </li>
            <li>
              Promotes relevant, micro-lifestyle changes that could prevent
              illnesses
            </li>
          </ul>
          <Divider />
          <h2 className="max-width--sm header--lg text--center margin-auto">
            What should the Public Healthroom measure?
          </h2>
        </div>
        <div className="pad-top pad-horizontal--double max-width--">
          <div className="max-width">
            <iframe
              width="100%"
              height="600px"
              title="Public Healthroom Measurements Database"
              src="https://docs.google.com/spreadsheets/d/e/2PACX-1vTPI3YSZRKH6QSzM5DO5oGjdAePOLgJK_Dx4_ehEyQjF9pi9Ed6EUj2JInu3tjr59yzEvBiEl0oy2Yy/pubhtml?widget=true&amp;headers=false"
            ></iframe>
          </div>
        </div>
        <div className="max-width--sm pad-horizontal margin-top pad-top margin-auto">
          <Divider />
          <h2 className="max-width--sm header--lg text--center margin-auto">
            Exploring Health Futures: Public Healthroom Design Vision
          </h2>
          <p>
            Among the various methods to accomplish measurement goals detailed
            above, the following is one possible version of the screening
            episode: a fully-guided, automated sequence. The room itself is
            built modularly, so components can be replaced after extended use
            or updated with newer technology. As a thought experiment, this
            focuses less on limitations and logistics and explores a
            futuristic, ideal experience.
          </p>
        </div>
        <div className="max-width">
          <img
            src={cloudfrontImage('/images/features/public-healthroom/pubhrm-plan.png')}
            className="image--max-width"
            alt="Public Healthroom floor plan"
          />
        </div>
        <PrototypeViewer />
        <div className="max-width--md pad-horizontal margin-top pad-top margin-auto">
          <Divider />
          <h2 className="max-width--sm header--lg text--center margin-auto">
            Final Thoughts
          </h2>
          <p>
            In the fiscal year 2021-2022, the operation cost of San Francisco
            Public Works was $12.7 million or $113,000 per year per public
            portable toilet open 40 hours/week.<sup><a href="#references">3</a></sup> With
            this as a baseline, the costs to engineer, build, and operate the
            public healthroom would be much higher—however, there is
            significant potential value in developing a preventive health
            infrastructure that transitions US healthcare spendings from
            quantity to quality. The next step would be developing a minimum
            viable product (MVP) with analysis on potential funding structures
            (private vs. public vs. hybrid).
          </p>
          <p>
            One possible MVP approach is to develop the lowest-cost version
            that aggregates current off-the-shelf technologies but maximizes
            ease of use. Another is to develop each tool separately:
          </p>
          <ul>
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
          <p>
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
        <div className="pad-vertical--double">
          <div className="max-width max-width--md content-padding">
            <Divider />
            <h2 className="header--lg text--center">Authors</h2>
            <Author name="Jenny Yi" company="GoInvo" />
            <Author name="Juhan Sonin" company="GoInvo" />

            <h3 className="header--md margin-top--double">Contributors</h3>
            <p>Samantha Wuu</p>
            <p>Craig McGinley</p>
          </div>
        </div>

        <div className="background--gray pad-vertical--double">
          <div className="max-width max-width--md content-padding">
            <NewsletterForm />
          </div>
        </div>

        <div className="pad-vertical--double">
          <div className="max-width max-width--md content-padding">
            <div id="references">
              <References
                items={[
                  {
                    title: 'Bike lanes are a sound public health investment',
                    link:
                      'https://www.reuters.com/article/us-health-costbenefit-bike-lanes/bike-lanes-are-a-sound-public-health-investment-idUSKCN11Z23A',
                  },
                  {
                    title: 'Healthy People 2030',
                    link:
                      'https://health.gov/healthypeople/objectives-and-data/browse-objectives/preventive-care',
                  },
                  {
                    title:
                      'Two cities\' approaches to increasing public bathrooms',
                    link:
                      'https://www.smartcitiesdive.com/news/two-cities-approaches-to-increasing-public-bathrooms/628387/',
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
