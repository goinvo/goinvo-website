import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import './digital-healthcare.css'

const IMG_BASE = 'https://www.goinvo.com/old/images/features/digital-healthcare'

export const metadata: Metadata = {
  title: 'Digital Healthcare: 2016 and Beyond',
  description:
    '8 health tech trends to look for in the upcoming year.',
  keywords:
    'design future emerging technologies health mobile careplans care plan ui ux user experience medical records predictive health',
  openGraph: {
    title: 'Digital Healthcare: 2016 and Beyond',
    description: '8 health tech trends to look for in the upcoming year.',
    images: [`${IMG_BASE}/digital_health_cover_transp.gif`],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@goinvo',
    title: 'Digital Healthcare: 2016 and Beyond',
    description: '8 health tech trends to look for in the upcoming year.',
    images: [`${IMG_BASE}/digital_health_cover_transp.gif`],
  },
}

export default function DigitalHealthcarePage() {
  return (
    <div className="digital-healthcare">
      <SetCaseStudyHero
        image={`${IMG_BASE}/digital_health_cover_transp.gif`}
      />

      {/* ===== HERO ===== */}
      <div className="overall-header">
        <div className="title">
          Digital Healthcare: 2016 and Beyond
          <h4 className="header-quote">
            Your business will be obsolete if you aren&apos;t engaging in these
            8 things next year.
          </h4>
        </div>
      </div>

      {/* Small-screen cover images (tablet shows desktop gif, phone shows mobile gif) */}
      <div className="small-screen-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="desktop-cover"
          src={`${IMG_BASE}/digital_health_cover_transp.gif`}
          alt="Digital Healthcare cover"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="mobile-cover"
          src={`${IMG_BASE}/digital_health_cover_mobile.gif`}
          alt="Digital Healthcare cover mobile"
        />
      </div>

      {/* ===== SECTION NAV ===== */}
      <nav className="nav-wrapper">
        <a href="#section1-medication">1. Medication</a>
        <a href="#section2-interfaces">2. Talking to Tech</a>
        <a href="#section3-predictive">3. Prediction</a>
        <a href="#section4-disease">4. Detection</a>
        <a href="#section5-careplan">5. Care Planning</a>
        <a href="#section6-records">6. Computable Records</a>
        <a href="#section7-patient">7. Engagement</a>
        <a href="#section8-companion">8. Virtual Helpers</a>
      </nav>

      {/* ===== 1. MEDICATION ADHERENCE ===== */}
      <div className="item one" id="section1-medication">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_1.jpg`}
                  alt="Medication adherence illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>1. Medication Adherence</div>
                </div>
                <h4 className="intro-quote">
                  ...gets a boost from sensor tech
                </h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_1.jpg`}
                    alt="Medication adherence illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    Solving the complex problem of medication adherence could
                    have a huge impact on lowering cost of care; It&apos;s no
                    surprise that millions of dollars have already been invested
                    in digital health software to guide the process. In 2016,
                    expect the basics of digital adherence &mdash;
                    self-reporting, tracking refills and chronic disease
                    outcomes, etc. &mdash; will receive a boost from the use of
                    sensors to collect confirming data, whether it&apos;s via
                    breath analysis, urine sampling, or another non-invasive
                    method.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 2. TALKING TO TECHNOLOGY ===== */}
      <div className="item two" id="section2-interfaces">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_2_v02.jpg`}
                  alt="Conversational interfaces illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>2. Talking to Technology</div>
                </div>
                <h4 className="intro-quote">
                  Conversational interfaces go mainstream.
                </h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_2_v02.jpg`}
                    alt="Conversational interfaces illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    The conversational user interface &mdash; driven by advances
                    in voice recognition technology in conjunction with
                    artificial intelligence, capable of understanding the
                    content and context of patient concerns &mdash; has already
                    found its way into digital health software systems. Whether
                    incorporated into mHealth apps for motivating health and
                    fitness engagement, as a part of the digital prescription
                    adherence user experience, or incorporated into interactive
                    systems for outpatient education, expect the conversational
                    user interface to gain traction and become mainstream in
                    2016.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 3. PREDICTING HEALTH ===== */}
      <div className="item three" id="section3-predictive">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_3.jpg`}
                  alt="Predicting health analytics illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>3. Predicting Health</div>
                </div>
                <h4 className="intro-quote">
                  Analytics debut for patients and clinicians, not just payers.
                </h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_3.jpg`}
                    alt="Predicting health analytics illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    While payers have had patient health analytics software for a
                    few years already, in 2016, we can expect patient scoring and
                    health analysis to make its way into the hands of the
                    clinicians and patients. Software tools for visualizing a
                    patient&apos;s complete range of health metrics, along with
                    clinically validated algorithms for scoring a holistic view
                    of patient health will make their debut. These will provide
                    clinicians with at-a-glance analytics of a patient&apos;s
                    overall health, allowing doctors to spot patterns and red
                    flags by comparing a person&apos;s health data against
                    targeted health ranges, based on factors like age and gender.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 4. DISEASE DETECTION ===== */}
      <div className="item four" id="section4-disease">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_4.jpg`}
                  alt="Disease detection on smartphone illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>4. Disease Detection</div>
                </div>
                <h4 className="intro-quote">...on your smart phone</h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_4.jpg`}
                    alt="Disease detection on smartphone illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    Imagine your smart phone as a non-invasive health sniffer, a
                    feat of which it is already technically capable. It can view
                    you, via its cameras; listen to you via its microphone; and
                    even pick up your gait, via its accelerometer. Such
                    information can ultimately be used to help diagnose such
                    diseases as depression and Parkinson&apos;s. The current
                    confluence of sensor tech, data analytics maturity, hardware
                    durability, miniaturization, and industrial evolution has
                    created a perfect storm for capturing biologic metrics and
                    determining trends. In 2016, we&apos;ll have a good first
                    cut at a disease detection model that is personally
                    meaningful and changes behavior.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 5. DIGITAL CARE PLANNING ===== */}
      <div className="item five" id="section5-careplan">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_5.jpg`}
                  alt="Digital care planning illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>5. Digital Care Planning</div>
                </div>
                <h4 className="intro-quote">
                  It&apos;s how to get better patient outcomes in a tech driven
                  world.
                </h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_5.jpg`}
                    alt="Digital care planning illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    Digital care planning will be a key factor driving better
                    health outcomes and prices. The personal care plan will serve
                    as a contract between patient and physician to commit to
                    improving and maintaining patient health. The care plan will
                    include patient / physician goals and the rationale for those
                    goals, as well as a plan for case management and
                    rehabilitation, psychological health, exercise, nutrition,
                    birth / sexual health, and advance care / death.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 6. COMPUTABLE RECORDS ===== */}
      <div className="item six" id="section6-records">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_6.jpg`}
                  alt="Computable medical records illustration"
                  width={430}
                  height={430}
                />
                <div className="caption">
                  <span>Data and images taken from </span>
                  <a href="http://projectcrucible.org/">projectcrucible.org.</a>
                </div>
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  6. Computable Records
                </div>
                <h4 className="intro-quote right">
                  The next generation of the EMR conversation.
                </h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_6.jpg`}
                    alt="Computable medical records illustration"
                    width={800}
                    height={800}
                  />
                  <div className="caption">
                    <span>Data and images taken from </span>
                    <a href="http://projectcrucible.org/">
                      projectcrucible.org.
                    </a>
                  </div>
                </div>
                <div className="item-text">
                  <span>In 2016 and onward, </span>
                  <a href="http://computablemedicalrecords.org/">
                    computable medical records
                  </a>
                  <span>
                    {' '}
                    will fuel the next generation of EHRs, as the quest for
                    interoperable, portable, and comprehensive health data
                    continues. Computable medical records, readable by both
                    human and machine, will house a patient&apos;s entire record
                    from conception to death. Importantly, such records will
                    declare their fidelity level &mdash; their degree of
                    completeness and accuracy &mdash; so that users can not only
                    identify what data is there, but also what&apos;s missing.
                  </span>
                  <br />
                  <span>
                    The computable medical record will be unique, enabling users
                    to find the right record for the right person; will support a
                    health status scoring system; and will ideally be open source
                    to drive adoption across software vendors, hospital systems,
                    and government.
                  </span>
                  <br />
                  <span>
                    FHIR (HL7&apos;s latest attempt at a health data exchange)
                    is a step in the right direction.{' '}
                  </span>
                  <a href="http://hl7.org/implement/standards/fhir/2015Jan/argonauts.html">
                    The Argonauts
                  </a>
                  <span>
                    {' '}
                    are working on a handful of profiles and core data services,{' '}
                  </span>
                  <a href="http://geekdoctor.blogspot.com/2014/12/kindling-fhir.html">
                    according to John Halamka,
                  </a>
                  <span>
                    {' '}
                    CIO of Beth Israel Deaconess Hospital. They&apos;re
                    implementing the API as recommended by the MITRE JASON
                    report (see{' '}
                  </span>
                  <a href="http://healthit.gov/sites/default/files/ptp13-700hhs_white.pdf">
                    here
                  </a>
                  <span> and </span>
                  <a href="http://healthit.ahrq.gov/sites/default/files/docs/publication/2014-jason-data-for-individual-health.pdf">
                    here
                  </a>
                  <span>
                    ). While a far cry from a &lsquo;computable medical
                    record&rsquo;, it&apos;s a hopeful signal flare for U.S.
                    progress in digital healthcare.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 7. PATIENT ENGAGEMENT ===== */}
      <div className="item seven" id="section7-patient">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_7.jpg`}
                  alt="Patient engagement illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>7. Patient Engagement</div>
                </div>
                <h4 className="intro-quote">Most care is self care.</h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_7.jpg`}
                    alt="Patient engagement illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    The startling truth is that 99% of healthcare is self care
                    and that the actions of individuals rather than institutions
                    are key to improving our healthcare system. Patients who are
                    actively engaged in the management of their own healthcare
                    increase the likelihood of having improved outcomes, reduced
                    costs, and a better overall experience. In 2016, we can
                    expect to see a rise in digital systems with a deep focus on
                    patient engagement and interventions. These could include
                    software like digital coaching and coordinated outpatient
                    education &mdash; well-architected services that direct the
                    right information to patients outside the clinical
                    environment, especially for mental health.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== 8. VIRTUAL HELPERS ===== */}
      <div className="item eight" id="section8-companion">
        <section>
          <div className="row">
            <div className="item-wrapper">
              <div className="item-img-container left computer-image">
                <Image
                  src={`${IMG_BASE}/digital_health_8.jpg`}
                  alt="Virtual helpers illustration"
                  width={430}
                  height={430}
                />
              </div>
              <div className="item-content right">
                <div className="section-header right">
                  <div>8. Virtual Helpers</div>
                </div>
                <h4 className="intro-quote">
                  The digital health companion in your pocket: Siri meets Dr.
                  Watson.
                </h4>
                <div className="item-img-container phone-image">
                  <Image
                    src={`${IMG_BASE}/digital_health_8.jpg`}
                    alt="Virtual helpers illustration"
                    width={800}
                    height={800}
                  />
                </div>
                <div className="item-text">
                  <span>
                    Virtual helpers will leverage human-modeled artificial
                    intelligence to provide both health coaching and resources to
                    motivate patients. Such mHealth companions will assist people
                    in adhering to their care plans, their prescription regimens,
                    and even outpatient treatment for complex, chronic
                    conditions. These helpers might expand past the 2D mobile
                    platform, seeping into other more physical services such as
                    Echo, Nest, and Jibo.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== CREDITS / CONTRIBUTORS ===== */}
      <div className="credit-wrapper">
        <div className="row" />
        <div className="credits">
          <div className="contributors-box">
            {/* Contributor 1: Beckett Rucker */}
            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${IMG_BASE}/contrib/beckett.jpg`}
                  alt="Beckett Rucker"
                />
              </div>
              <div className="contributor-info">
                <h3>Contributing Author &amp; Illustrator</h3>
                <p>
                  Beckett Rucker
                  <br />
                  <small>
                    <a href="https://twitter.com/beckettrucker">
                      @beckettrucker
                    </a>
                  </small>
                </p>
              </div>
            </div>

            <hr />

            {/* Contributor 2: Jon Follett */}
            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${IMG_BASE}/contrib/jon.jpg`}
                  alt="Jon Follett"
                />
              </div>
              <div className="contributor-info">
                <h3>Contributing Author</h3>
                <p>
                  Jon Follett
                  <br />
                  <small>
                    <a href="https://twitter.com/jonfollett">@jonfollett</a>
                  </small>
                </p>
              </div>
            </div>

            <hr />

            {/* Contributor 3: Courtney McGorrill */}
            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${IMG_BASE}/contrib/courtney.jpg`}
                  alt="Courtney McGorrill"
                />
              </div>
              <div className="contributor-info">
                <h3>Web Developer &amp; Designer</h3>
                <p>
                  Courtney McGorrill
                  <br />
                  <small>
                    <a href="http://twitter.com/court_mcgort">@court_mcgort</a>
                  </small>
                </p>
              </div>
            </div>

            <hr />

            {/* Contributor 4: Juhan Sonin */}
            <div className="contributor">
              <div className="contributor-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://www.goinvo.com/old/images/features/democracy/contrib/juhan.jpg"
                  alt="Juhan Sonin"
                />
              </div>
              <div className="contributor-info">
                <h3>Contributing Author</h3>
                <p>
                  Juhan Sonin
                  <br />
                  <small>
                    <a href="http://twitter.com/jsonin">@jsonin</a>
                  </small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== NEWSLETTER ===== */}
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
