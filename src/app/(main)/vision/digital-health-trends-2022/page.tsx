import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Digital Health Trends to Watch - GoInvo',
  description:
    'GoInvo breaks down significant digital health trends you should watch for.',
}

export default function DigitalHealthTrends2022Page() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/digital-health-trends-2022/digital-health-trends-2022-hero.jpg'
        )}
      />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Digital Health Trends to Watch
          </h1>

          <p className="leading-relaxed mb-4">
            We&apos;re at a major inflection point for digital health. The
            pandemic has created a unique set of factors that are accelerating
            existing trends in digital health and forcing change. While digital
            transformation in healthcare has happened slowly compared to other
            industries — the fax is making its last stand supporting healthcare
            communications — there&apos;s no turning back now.
          </p>

          <p className="leading-relaxed mb-4">
            The ongoing COVID pandemic has nearly exhausted the American
            healthcare system. Healthcare workers are leaving the industry in
            droves — down by 298,000 since February 2020, according to the{' '}
            <a
              href="https://www.bls.gov/news.release/archives/empsit_04012022.pdf"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              Bureau of Labor Statistics March 2022 report
            </a>
            .
          </p>

          <p className="leading-relaxed mb-4">
            The U.S. already has a significant shortage of doctors and nurses — a
            problem that is not going away anytime soon.{' '}
            <a
              href="https://web.archive.org/web/20220414202858/https://www.aamc.org/news-insights/press-releases/new-aamc-report-confirms-growing-physician-shortage"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              A report from the AAMC (Association of American Medical Colleges)
              (archived link, Apr 2022)
            </a>{' '}
            indicates that by 2033, the U.S. could see a projected shortfall of
            54,100 - 139,000 doctors in primary and specialty care.
          </p>

          <p className="leading-relaxed mb-4">
            Add to this an aging population — by 2030, 1 of 5 Americans will be
            at retirement age,{' '}
            <a
              href="https://www.census.gov/newsroom/press-releases/2018/cb18-41-population-projections.html"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              according to the U.S. Census Bureau
            </a>{' '}
            — and a lack of options for primary care, especially in rural areas,
            and you have the potential for a healthcare crisis of epic
            proportions.
          </p>

          <p className="leading-relaxed mb-4">
            The possibility for digital health solutions to mitigate some of
            these problems, among many other healthcare issues, is significant
            and much needed. These five digital health trends are
            patient-centric, including but not focused solely on a particular set
            of digital health technologies — mobile applications, telehealth,
            artificial intelligence, embedded sensors, connected medical devices,
            and the like. These trends are in many ways related and connected,
            but they do not encompass the entirety of digital health. They all
            speak, in different ways, to the future of care delivery and emerging
            models for delivering care at home via a virtual environment or
            outpatient care in a local, non-traditional setting. These digital
            health solutions hold the promise of better quality of care —
            increased accessibility, cost efficiency, and perhaps most
            importantly, improved patient experience and better outcomes.
          </p>

          {/* Trend 1 */}
          <div className="mx-auto">
            <Image
              src={cloudfrontImage(
                '/images/features/digital-health-trends-2022/1-digital-health-at-home-a.jpg'
              )}
              alt="Digital health at home"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>

          <h2 className="font-serif text-2xl mt-6 mb-2">
            1. The race for digital health at home
          </h2>
          <p className="leading-relaxed mb-4">
            Possibly the most exciting digital health trend is one that&apos;s
            still very early in the adoption curve. Digital health in the home
            will continue its bumpy progression towards adoption in 2022 onward
            as more companies attempt to leverage and expand their existing,
            connected footprint in your home with new software and service layers
            focused on healthcare.
          </p>
          <p className="leading-relaxed mb-4">
            Every company making products for the home — from bathroom fixtures
            to kitchen appliances to televisions — is now potentially a digital
            health company or aspires to be a part of the IoT (Internet of
            Things) network supporting your health.{' '}
            <a
              href="https://www.theverge.com/2022/1/4/22865640/lg-tv-telehealth-platform-independa"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              LG, for instance, has added a health platform to its smart TV
              models to enable telehealth visits and health education
            </a>
            .
          </p>

          <h4 className="header-md mb-0 mt-8">The bathroom of the future</h4>
          <p className="leading-relaxed mb-4">
            The COVID pandemic has changed what people expect of their homes,
            accelerating the trend towards multi-functional connected spaces that
            support a variety of living and working activities within them. In
            particular,{' '}
            <a
              href="https://www.wsj.com/articles/high-tech-bathroom-11642720799"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              the vision of the bathroom of the future is continually evolving
            </a>
            . Already equipped with advanced devices to create a spa-like
            atmosphere, the modern bathroom is well on its way to fully{' '}
            <a
              href="https://www.goinvo.com/features/from-bathroom-to-healthroom"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              transforming into a &quot;health room&quot; with the integration of
              more sophisticated, sensor-driven, connected devices that monitor
              our daily health metrics status
            </a>
            .
          </p>
          <p className="leading-relaxed mb-4">
            There will be increasing competition to be the home health hub, or at
            least one of many, as telehealth, fitness, and connected medical
            devices converge on a health-focused lifestyle integrated into your
            residence. In addition, adoption of these technologies will be driven
            by the need for healthcare as more Americans desire to age in place,
            remaining in their homes rather than moving elsewhere.
          </p>

          {/* Trend 2 */}
          <div className="mx-auto">
            <Image
              src={cloudfrontImage(
                '/images/features/digital-health-trends-2022/3-virtualizing-primary-care-a.jpg'
              )}
              alt="Advances in remote patient monitoring"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>

          <h2 className="font-serif text-2xl mt-6 mb-2">
            2. Advances in remote patient monitoring
          </h2>
          <p className="leading-relaxed mb-4">
            Advances in remote patient monitoring will make it not only possible,
            but routine to connect the hospital to at-home care. Services for
            remote care and monitoring will overlay and enhance digital health at
            home, collecting data from a patient via sensors and other digital
            technologies, like smart watches, connected medical devices, and{' '}
            <a
              href="https://www.goinvo.com/work/infobionic-heart-monitoring"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              on-body sensors
            </a>
            , and transmitting it securely to a provider for assessment and
            recommendations. This can help families and health providers monitor
            chronic conditions or symptoms.
          </p>
          <p className="leading-relaxed mb-4">
            Additionally, remote monitoring allows patients to more easily
            participate in clinical trials, opening up recruitment to more
            diverse patient populations. Digital platforms improve management and
            communication with patients in the home, enabling better patient
            engagement and retention for clinical trials. However, adoption is
            limited so far.
          </p>
          <p className="leading-relaxed mb-4">
            We can already see the strong connection between those companies that
            will supply the infrastructure for digital health at home and patient
            monitoring. For instance,{' '}
            <a
              href="https://www.cnbc.com/2021/10/12/best-buy-is-acquiring-british-health-care-company-current-health.html"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              technology retailer Best Buy recently acquired a UK company
              specializing in remote patient monitoring. Best Buy Health
            </a>{' '}
            will partner with providers to customize end-to-end care delivery
            solutions.
          </p>
          <p className="leading-relaxed mb-4">
            <a
              href="https://web.archive.org/web/20220223125817/https://www.amazon.com/Alexa-Together/b?ie=UTF8&node=21390531011"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              Alexa Together (archived link Apr 2022)
            </a>{' '}
            is Amazon&apos;s endeavor into remote monitoring and assistance for
            the family caring for their elderly relatives. Amazon incorporates
            AI-driven remote healthcare monitoring — particularly fall detection
            — care team tools to support the person aging in place, and an urgent
            response team to assist when needed.
          </p>
          <p className="leading-relaxed mb-4">
            Remote patient care and monitoring have many benefits, including deep
            personalization for each patient. These tools can reduce the use of
            hospital resources, and be used for both outpatient recovery and
            proactive management of patients dealing with long-term conditions.
            For chronic disease monitoring for conditions such as diabetes,
            remote patient monitoring will integrate with personalized health
            plans — recommendations for diet, exercise, etc.
          </p>

          {/* Trend 3 */}
          <div className="mx-auto">
            <Image
              src={cloudfrontImage(
                '/images/features/digital-health-trends-2022/5-managing-our-health-data-a.jpg'
              )}
              alt="Virtualizing primary care"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>

          <h2 className="font-serif text-2xl mt-6 mb-2">
            3. Virtualizing primary care
          </h2>
          <p className="leading-relaxed mb-4">
            We&apos;re at the start of a significant systemic shift to new care
            delivery models. Telehealth adoption took a big step forward during
            the pandemic, enabling virtual visits when in-person interactions
            were difficult, if not impossible, due to COVID. According to a
            research report from the HHS Office of the Assistant Secretary for
            Planning and Evaluation,{' '}
            <a
              href="https://aspe.hhs.gov/sites/default/files/documents/a1d5d810fe3433e18b192be42dbf2351/medicare-telehealth-report.pdf"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              Medicare Beneficiaries&apos; Use of Telehealth in 2020: Trends by
              Beneficiary Characteristics and Location
            </a>
            , &quot;the number of Medicare fee-for-service (FFS) beneficiary
            telehealth visits increased 63-fold in 2020, from approximately
            840,000 in 2019 to nearly 52.7 million in 2020.&quot;
          </p>
          <p className="leading-relaxed mb-4">
            Virtual primary care is convenient and saves time for patients and
            providers. You no longer need to see a doctor in person for many
            types of interactions. In fact,{' '}
            <Link
              href="/vision/virtual-care"
              className="text-secondary hover:text-primary"
            >
              half of face-to-face clinical office visits can be conducted
              virtually
            </Link>
            .
          </p>
          <p className="leading-relaxed mb-4">
            As patients adopt the technology and integrate it into their lives,
            telemedicine can reduce barriers and increase access, especially
            important for chronic disease management. With a lack of healthcare
            options, especially in rural areas of the U.S., virtualizing primary
            care will make a significant difference in overall health. Telehealth
            providers like{' '}
            <a
              href="https://www.wellviasolutions.com/"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              WellVia
            </a>{' '}
            are pioneering virtualized primary care while companies like{' '}
            <a
              href="https://www.onemedical.com/"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              One Medical
            </a>{' '}
            take a hybrid approach, with offerings that combine telehealth and
            in-person care.
          </p>
          <p className="leading-relaxed mb-4">
            However, integrating telehealth visits into regular, replicable
            outpatient routines as a mainstay of primary care interactions will
            be a journey that progresses in fits and starts. As the pandemic
            begins to wane and in-person visits are more feasible, the longevity
            of telehealth as a regular service for healthcare will be tested.
          </p>

          {/* Trend 4 */}
          <div className="mx-auto">
            <Image
              src={cloudfrontImage(
                '/images/features/digital-health-trends-2022/4-shift-to-local-a.jpg'
              )}
              alt="The shift to local health service delivery"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>

          <h2 className="font-serif text-2xl mt-6 mb-2">
            4. The shift to local health service delivery
          </h2>
          <p className="leading-relaxed mb-4">
            Much has been made of the need to shift the &quot;front door to
            health&quot;. Healthcare is no longer confined to the doctor&apos;s
            office, hospital, or urgent care clinics, but has expanded into
            non-traditional settings like retail and pharmacy. As we&apos;ve
            seen, the overstressed American healthcare system, further taxed by
            the COVID pandemic, lacks options for primary care, especially in
            rural areas. In response, retail outlets and pharmacies have begun to
            incorporate health services into their offerings for basic healthcare
            consultations and immunizations. CVS Health, Walgreens, RiteAid, and
            Walmart are leveraging their existing footprint in communities{' '}
            <a
              href="https://www.jaxdailyrecord.com/article/walgreens-walmart-adding-medical-clinics"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              to provide access to local, convenient care through a combination
              of in-person services and telehealth
            </a>
            .
          </p>
          <p className="leading-relaxed mb-4">
            Walmart, for instance, is investing heavily in building its network
            of clinics that offer primary care services and operate within the
            company&apos;s existing stores, with 105 locations currently
            available and more in development.
          </p>
          <p className="leading-relaxed mb-4">
            These clinics, co-located with retail and pharmacy, are particularly
            helpful for patients managing chronic conditions, who can benefit
            from more frequent visits with a healthcare provider and{' '}
            <a
              href="https://www.goinvo.com/work/hgraph"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              regular tracking and analysis of their health data
            </a>
            . It&apos;s local and less expensive. Further, these retail-based
            primary care clinics can combine in-person services and lower-cost
            telehealth consultations to deliver care at value to patients when
            and where they need it.
          </p>

          {/* Trend 5 */}
          <div className="mx-auto">
            <Image
              src={cloudfrontImage(
                '/images/features/digital-health-trends-2022/2-advances-in-remote-a.jpg'
              )}
              alt="Managing our health data"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>

          <h2 className="font-serif text-2xl mt-6 mb-2">
            5. Managing our health data
          </h2>
          <p className="leading-relaxed mb-4">
            Our{' '}
            <Link
              href="/vision/who-uses-my-health-data"
              className="text-secondary hover:text-primary"
            >
              health data
            </Link>{' '}
            is growing at a remarkable rate. With the increased prevalence of
            digital health services — from telehealth to connected medical
            devices to remote patient monitoring to sensors embedded in the home
            — and the ongoing usage of digital health records, EHRs, PHRs, etc.,
            the amount of health data contained in silos across hospital records,
            primary care, and personal devices, is unprecedented.
          </p>
          <p className="leading-relaxed mb-4">
            Ironically, we&apos;re simultaneously experiencing a data glut and
            yet have limited access to that information — with patient data
            stranded in various places and no one way to retrieve and manage it.
            Realizing the promise of digital health requires that we address this
            issue. The slow march to solve this problem of managing patient data
            across multiple sources will influence and shape the digital health
            landscape for years to come.
          </p>
          <p className="leading-relaxed mb-4">
            The healthcare industry struggles with data. We throw out or abandon
            too much of our health data, whether it be stored readings from an
            at-home blood pressure cuff, heart rate data from our smart watch, or
            test results we get from an urgent care clinic. The stored data is
            often owned by someone else and not parseable when we receive it. The
            promise of digital transformation has been hindered by siloed,
            hoarded, and ultimately stranded data, limiting the use of patient
            data for prevention, early diagnosis, and research.
          </p>
          <p className="leading-relaxed mb-4">
            And the healthcare data deluge will only continue. As social
            determinants of health integrate into healthcare evaluation and
            decision making, our day-to-day life data — from our food purchases
            to our leisure activities — will increasingly be considered a part of
            our health data.
          </p>
          <p className="leading-relaxed mb-4">
            Universally accepted and adopted data standards supporting
            interoperability between electronic health records, patient data use
            agreements that facilitate personal access and control, and
            patient-centric software that allows for{' '}
            <Link
              href="/vision/own-your-health-data"
              className="text-secondary hover:text-primary"
            >
              patient data management
            </Link>
            , are all examples of ways in which we&apos;ll move along the path, a
            trend that is often under-appreciated.
          </p>
          <p className="leading-relaxed mb-4">
            There is a massive opportunity in patient data management of their
            own medical records and health data. We&apos;ll begin seeing the
            potential, for instance, in the emergence of new digital services,
            allowing patients to more easily move medical records from one
            hospital to another.
          </p>
          <p className="leading-relaxed mb-4">
            But, it will be a long road to travel before we can{' '}
            <a
              href="https://www.statnews.com/2021/11/15/its-time-for-individuals-not-doctors-or-companies-to-own-their-health-data/"
              target="_blank"
              rel="noreferrer"
              className="text-secondary hover:text-primary"
            >
              manage our health data with confidence and ease
            </a>
            .
          </p>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">
            Author
          </h2>
          <Author name="Jonathan Follett" />
          <div className="py-8">
            <h3 className="header-md">Contributors</h3>
            <p className="leading-relaxed">
              Huahua Zhu
              <br />
              Jen Patel
              <br />
              Sharon Lee
              <br />
              Juhan Sonin
              <br />
              Eric Benoit
            </p>
          </div>
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
