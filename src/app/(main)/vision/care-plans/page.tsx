import type { Metadata } from 'next'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import './careplans.css'

const IMG = 'https://www.goinvo.com/old/images/features/careplans'

export const metadata: Metadata = {
  title: 'The Care Plan Series',
  description:
    'A patient guide to manage day-to-day health based on health concerns, goals, and interventions. A three-part feature series on the past, present, and future of care plans.',
}

export default function CarePlansPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/care-plans/care-plans-featured2.jpg')} />

      <div className="careplans-legacy" id="feature-article">
        {/* Hero Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-image" src={`${IMG}/home_hero.jpg`} alt="The Care Plan Series" />

        {/* Stuck Navigation */}
        <header className="nav-wrapper stuck intro">
          <div className="desktop">
            <nav className="main-nav">
              <a href="/vision/care-plans/part-1">
                <span>Part1</span>
                <h4>Overview</h4>
              </a>
              <a href="/vision/care-plans/part-2">
                <span>Part2</span>
                <h4>Landscape</h4>
              </a>
              <a href="/vision/care-plans/part-3">
                <span>Part3</span>
                <h4>Future</h4>
              </a>
              <a href={`${IMG}/CarePlans_Whitepaper_Involution_Studios.pdf`} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}/intro_icons/book_white.png`} alt="Download eBook" />
              </a>
            </nav>
          </div>
          <div className="mobile">
            <nav className="main-nav">
              <div>
                <a href="/vision/care-plans/part-1">
                  <span>Part1</span>
                  <h4>Overview</h4>
                </a>
                <a href="/vision/care-plans/part-2">
                  <span>Part2</span>
                  <h4>Landscape</h4>
                </a>
              </div>
              <div>
                <a href="/vision/care-plans/part-3">
                  <span>Part3</span>
                  <h4>Future</h4>
                </a>
                <a href={`${IMG}/CarePlans_Whitepaper_Involution_Studios.pdf`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/intro_icons/book_white.png`} alt="Download eBook" />
                  <p>Download<br />eBook</p>
                </a>
              </div>
            </nav>
          </div>
        </header>

        {/* Scroll Navigation (hidden by default, shown on scroll) */}
        <header className="nav-wrapper scroll-nav intro">
          <nav className="main-nav">
            <a href="/vision/care-plans/part-1">P1. Overview</a>
            <a href="/vision/care-plans/part-2">P2. Landscape</a>
            <a href="/vision/care-plans/part-3">P3. Future</a>
            <a href={`${IMG}/CarePlans_Whitepaper_Involution_Studios.pdf`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${IMG}/intro_icons/book_white.png`} alt="Download eBook" />
            </a>
          </nav>
        </header>

        {/* Main Content */}
        <div className="part">
          <a className="download-ebook" href={`${IMG}/CarePlans_Whitepaper_Involution_Studios.pdf`} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${IMG}/intro_icons/book_dark.png`} alt="Download eBook" />
            <p>Download<br />eBook</p>
          </a>
          <a className="download-ebook" href={`${IMG}/Involution_Care_Plans_Presentation_13Sep16.pdf`} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${IMG}/intro_icons/presentation.png`} alt="Download Presentation" />
            <p>Download<br />Presentation</p>
          </a>

          <h1>The Care Plan Series</h1>

          <p>
            Overwhelmed. It is how most patients feel at one point or another as they leave that sterile-smelling,
            fluorescent-lit doctor&apos;s office. They have just spent 10-25 minutes being hastily examined, diagnosed,
            and, if they are lucky, educated about how to address their medical problem. They either leave the office
            empty-handed, or they walk out holding a generic pamphlet, which will likely end up under an unmanageable
            pile of papers or in the trash. Unless there was a major change in their treatment plan, many patients go
            home, forget what the doctor ordered, and continue on their usual journey of whatever harmful behaviors
            landed them at the doctor&apos;s office in the first place. And without a clear, tangible plan for how to
            better their health, how are they supposed to behave any differently?
          </p>

          <p>
            There is a loose, under-utilized semblance of a &quot;plan of care&quot; in most health data sets. You&apos;ll
            find them mentioned in the standard Continuity of Care Document (CCD), the FHIR framework, and CMS&apos;s
            recent chronic care management code documentation. Yet, somehow no one really knows what you are talking
            about when you say the words &quot;care&quot; and &quot;plan&quot; together in a sentence. So, with the help
            of designers, engineers, and field experts, we set out to understand everything we could about care plans to
            then visualize our findings in a 3-part feature series.
          </p>

          {/* Three-part feature intro */}
          <div className="container-fluid feature-intro">
            <a href="/vision/care-plans/part-1">
              <div className="row">
                <div className="col-sm-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/twitter_CP1.jpg`} alt="Care Plans Part 1: Overview" />
                </div>
                <div className="col-sm-6">
                  <p>
                    <strong>The first feature</strong> examines how the concept of a care plan came to be and our
                    understanding of it today.
                  </p>
                </div>
              </div>
            </a>

            <a href="/vision/care-plans/part-2">
              <div className="row">
                <div className="col-sm-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/twitter_CP2.jpg`} alt="Care Plans Part 2: Landscape" />
                </div>
                <div className="col-sm-6">
                  <p>
                    <strong>The second feature</strong> visualizes the current care planning process and limitations,
                    and evaluates existing care plan-related services.
                  </p>
                </div>
              </div>
            </a>

            <a href="/vision/care-plans/part-3">
              <div className="row">
                <div className="col-sm-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/twitter_CP3.jpg`} alt="Care Plans Part 3: Future" />
                </div>
                <div className="col-sm-6">
                  <p>
                    <strong>The third feature</strong> explores what these findings mean for the future of care plans
                    and our shifting healthcare system, and proposes a call to action.
                  </p>
                </div>
              </div>
            </a>
          </div>

          <p>
            Our feature series has three goals. We aim to spread both awareness to the general public about the benefit
            of care planning, as well as empowerment to demand such practices from doctors. We aim to inspire healthcare
            designers, entrepreneurs, and providers to prioritize care plans in their innovative products and practices.
            And we aim to encourage health policymakers to both establish a care plan database, and examine the cost of
            incorporating care planning into standard practice. Only in a new era of digital, standardized, adaptive
            care plans can we truly promote preventative self care.
          </p>
        </div>

        {/* Want to Work Together? */}
        <div className="part">
          <h1>Want to Work Together?</h1>
          <p>Want to take your healthcare or care plan product to the next level? Contact the authors at GoInvo:</p>

          <div className="container-fluid work-with-us">
            <div className="row">
              <div className="col-sm-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}/work_together.jpg`} alt="GoInvo studio" />
              </div>
              <div className="col-sm-6">
                <div className="clearfix">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/intro_icons/email.png`} alt="" />
                  <p>info@goinvo.com</p>
                </div>
                <div className="clearfix">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/intro_icons/phone.png`} alt="" />
                  <p>617-803-7043</p>
                </div>
                <div className="clearfix">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${IMG}/intro_icons/address.png`} alt="" />
                  <p>661 Massachusetts Ave, 3rd Floor, Arlington MA, 02476</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${IMG}/work_together.jpg`} alt="GoInvo studio" />
              </div>
            </div>
          </div>

          <p>
            At GoInvo, we&apos;re known for our unique, industry-leading approach to healthcare user experience. We
            design, build, and ship beautiful software for companies of all sizes, from the market leaders of today
            &mdash; including Apple, Johnson and Johnson, Partners HealthCare, and Walgreens &mdash; to the micro
            startups that will create the markets of the future.
          </p>

          <p>
            Founded in 2004, we specialize in design for genomics, healthcare IT, mHealth, wearables, and other
            emerging technologies. We&apos;ve produced high-quality, usable, beautiful applications that are used every
            day by over 150 million users.
          </p>
        </div>

        {/* Credits: Authors + Contributors */}
        <div className="credit-wrapper">
          <div id="credits">
            <h1>Authors</h1>
            <div className="authors container-fluid">
              <div className="row">
                {/* Beckett Rucker */}
                <div className="author col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/beckett.jpg`} alt="Beckett Rucker" />
                  </div>
                  <div className="info">
                    <p>GoInvo</p>
                    <p className="name">
                      Beckett Rucker, MPD<br />
                      <small>
                        <a href="https://twitter.com/beckettrucker" target="_blank" rel="noopener noreferrer">
                          @beckettrucker
                        </a>
                      </small>
                    </p>
                    <p className="bio">
                      Beckett is designer, product strategist, and researcher. She concentrates on designing beautiful
                      and surprising health services and systems from the skintop to celltop to desktop. She holds
                      bachelors of arts in psychology and studio art from Rice University and a master of product
                      development from Carnegie Mellon University. She has worked on design and service strategy for
                      companies such as Seniorlink, Johnson &amp; Johnson, and Updox Patient Portals.
                    </p>
                  </div>
                </div>

                {/* Edwin Choi */}
                <div className="author col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/edwin.jpg`} alt="Edwin Choi" />
                  </div>
                  <div className="info">
                    <p>GoInvo</p>
                    <p className="name">Edwin Choi, MA</p>
                    <p className="bio">
                      Edwin is a biologist turned designer. Combining the sciences and art, he orchestrates healthcare
                      software experiences to be beautiful and clinically refined. Edwin is a graduate of Washington
                      University, and has a masters in biomedical design from Johns Hopkins University. He has worked on
                      projects for companies including Partners Healthcare and Notovox.
                    </p>
                  </div>
                </div>
              </div>

              <div className="row">
                {/* Danny van Leeuwen */}
                <div className="author col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/danny.jpg`} alt="Danny van Leeuwen" />
                  </div>
                  <div className="info">
                    <p>Health Hats</p>
                    <p className="name">
                      Danny van Leeuwen, RN, MPH, CPHQ<br />
                      <small>
                        <a href="https://twitter.com/HealthHats" target="_blank" rel="noopener noreferrer">
                          @HealthHats
                        </a>
                      </small>
                    </p>
                    <p className="bio">
                      Danny is an action catalyst empowering people traveling together toward best health (patients,
                      caregivers, clinicians). He wears many hats in healthcare: patient with MS, care partner for
                      several family members&apos; end-of-life journeys, a nurse for 40+ years, an informaticist and a
                      QI leader. Danny&apos;s current work focuses on communication at transitions of care,
                      person-centered health planning, informed decision-making, and technology supporting solutions
                      created with and for people at the center. He has collaborated with PCORI, AHRQ, and MassHealth
                      among others.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h1>Contributors</h1>
            <div className="contributors container-fluid">
              <div className="row">
                {/* Yanyang Zhou */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/yanyang.jpg`} alt="Yanyang Zhou" />
                  </div>
                  <div className="info">
                    <p>Web Designer &amp; Developer</p>
                    <p className="name">Yanyang Zhou</p>
                  </div>
                </div>

                {/* Jennifer Patel */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/jenn.jpg`} alt="Jennifer Patel" />
                  </div>
                  <div className="info">
                    <p>Web Designer &amp; Developer</p>
                    <p className="name">
                      Jennifer Patel<br />
                      <small>
                        <a href="https://twitter.com/catamariface" target="_blank" rel="noopener noreferrer">
                          @catamariface
                        </a>
                      </small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="row">
                {/* Juhan Sonin */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/juhan.jpg`} alt="Juhan Sonin" />
                  </div>
                  <div className="info">
                    <p>GoInvo, MIT</p>
                    <p className="name">
                      Juhan Sonin<br />
                      <small>
                        <a href="https://twitter.com/jsonin" target="_blank" rel="noopener noreferrer">
                          @jsonin
                        </a>
                      </small>
                    </p>
                  </div>
                </div>

                {/* Jeff Belden */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/jeffbelden.jpg`} alt="Jeff Belden, MD" />
                  </div>
                  <div className="info">
                    <p>
                      University of Missouri |{' '}
                      <a href="http://toomanyclicks.com" target="_blank" rel="noopener noreferrer">
                        toomanyclicks.com
                      </a>
                    </p>
                    <p className="name">
                      Jeff Belden, MD<br />
                      <small>
                        <a href="https://twitter.com/jeffbelden" target="_blank" rel="noopener noreferrer">
                          @jeffbelden
                        </a>
                      </small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="row">
                {/* Joyce Lee */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/joycelee.jpeg`} alt="Joyce Lee, MD, MPH" />
                  </div>
                  <div className="info">
                    <p>University of Michigan</p>
                    <p className="name">
                      Joyce Lee, MD, MPH<br />
                      <small>
                        <a href="https://twitter.com/joyclee" target="_blank" rel="noopener noreferrer">
                          @joyclee
                        </a>
                      </small>
                    </p>
                  </div>
                </div>

                {/* Jane Sarasohn-Kahn */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/janesarasohnkahn.jpg`} alt="Jane Sarasohn-Kahn, MA, MHSA" />
                  </div>
                  <div className="info">
                    <p>THINK-Health | Health Populi blog | Huffington Post</p>
                    <p className="name">
                      Jane Sarasohn-Kahn, MA, MHSA<br />
                      <small>
                        <a href="https://twitter.com/healthythinker" target="_blank" rel="noopener noreferrer">
                          @healthythinker
                        </a>
                      </small>
                    </p>
                  </div>
                </div>
              </div>

              <div className="row">
                {/* Harry Sleeper */}
                <div className="contributor col-md-6">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${IMG}/contrib/harrysleeper.jpg`} alt="Harry Sleeper" />
                  </div>
                  <div className="info">
                    <p>Healthcare Provocateur</p>
                    <p className="name">
                      Harry Sleeper<br />
                      <small>
                        <a href="https://twitter.com/harrysleeper" target="_blank" rel="noopener noreferrer">
                          @harrysleeper
                        </a>
                      </small>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    </div>
  )
}
