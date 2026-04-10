import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { BackgroundVideo } from './BackgroundVideo'
import { DateSlider } from './DateSlider'
import './healthroom.css'

const IMG_BASE =
  'https://www.goinvo.com/old/images/features/design-for-life'
const VID_BASE = 'https://www.goinvo.com/old/videos/dfl'

const legacyImage = (path: string) => `${IMG_BASE}/${path}`

export const metadata: Metadata = {
  title: 'From Bathroom to Healthroom - GoInvo',
  description:
    'How magical technology will revolutionize human health.',
}

function Img({
  src,
  alt,
  className = '',
  width = 1200,
  height = 800,
}: {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
}) {
  return (
    <Image
      src={legacyImage(src)}
      alt={alt}
      width={width}
      height={height}
      className={`w-full h-auto ${className}`}
      unoptimized
    />
  )
}

export default function BathroomToHealthroomPage() {
  return (
    <div className="healthroom-legacy pt-[var(--spacing-header-height)]">
      <article className="design-for-life" id="feature-article">
        {/* Title section with background video matching legacy header */}
        <header className="bathroom-header relative overflow-hidden flex items-center justify-center text-white text-center"
          style={{ minHeight: '70vh' }}
        >
          <BackgroundVideo
            mp4Src={`${VID_BASE}/header.mp4`}
            webmSrc={`${VID_BASE}/header.webm`}
            posterSrc="https://www.goinvo.com/old/videos/dfl/header.jpg"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="relative z-[2] max-width max-width-md content-padding mx-auto py-8">
            <h1 className="header-xl mb-2" style={{ color: '#fff' }}>From Bathroom to Healthroom</h1>
            <p className="font-serif text-lg mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>How magical technology will revolutionize human health</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>By Juhan Sonin · <a href="mailto:juhan@goinvo.com" style={{ color: '#E36216' }}>juhan@goinvo.com</a></p>
          </div>
        </header>

        {/* ============================================================
            Section 1 — Bloodletting to bloodless
        ============================================================ */}
        <section className="article-section one" id="section-one">
          <header className="sec-header">
            <div className="title">
              <h3 className="sec-title">Bloodletting to bloodless.</h3>
              <h4 className="sub-title">
                Technological and societal trends are converging and pushing
                design to the forefront of health.
              </h4>
            </div>
            <div className="number">
              <span>1</span>
            </div>
          </header>
          <div className="section-content">
            <p>
              Health, as an experience and idea, is undergoing an epic shift. For
              millennia, humans have treated health as the rare spike that
              requires intervention. At a very basic level, when it comes to
              health, we humans experience our physical condition today much as
              our more furry ancestors did. We roam around. We eat mostly green
              stuff with the occasional indulgence in a tasty snack of
              fresh-killed meat. We drink water&mdash;well, some of us
              hydrate&mdash;and have sex and procreate. We stick with our tribe
              and try to steer clear of hostile marauders.
            </p>

            {/* Timeline graphic */}
            <div className="expanded-graphic seamless" id="timechart">
              <Img src="svg/timeline.svg" alt="Timeline" />
            </div>

            {/* Timeline slides — static rendering of the 8 slides */}
            <div id="timeline">
              <span className="byline">Illustration By Sarah Kaiser</span>

              <div className="slide one">
                <div className="slide-content">
                  <p>
                    10,000 B.C.: The transition to agriculture was made necessary
                    by gradually increasing population pressures due to the
                    success of Homo sapiens&apos; prior hunting and gathering way
                    of life. Also, at about the time population pressures were
                    increasing, the last Ice Age ended, and many species of large
                    game became extinct. Wild grasses and cereals began
                    flourishing, making them prime candidates for the staple
                    foods to be domesticated, given our previous familiarity with
                    them.
                  </p>
                  <p className="source">
                    Resource:{' '}
                    <a href="http://www.beyondveg.com/nicholson-w/hb/hb-interview1c.shtml">
                      beyondveg.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="slide two">
                <div className="slide-content">
                  <p>
                    4000 B.C.: Environmental opportunities and challenges led to
                    the formation of human groups. Sharing food, caring for
                    infants, and building social networks helped our ancestors
                    meet the daily challenges of their environments.
                  </p>
                  <p className="source">
                    Resource:{' '}
                    <a href="http://www2.sunysuffolk.edu/westn/humangroups.html">
                      sunysuffolk.edu
                    </a>
                  </p>
                </div>
              </div>

              <div className="slide three">
                <div className="slide-content">
                  <p>
                    3000 B.C.: The earliest reports of surgical suture date back
                    to 3000 BC in ancient Egypt, where physicians used stitches
                    to close injuries, incisions and mummies.
                  </p>
                  <p className="source">
                    Resource:{' '}
                    <a href="http://en.wikipedia.org/wiki/Surgical_suture">
                      wikipedia.org
                    </a>
                  </p>
                </div>
              </div>

              <div className="slide four">
                <div className="slide-content">
                  <p>
                    400 B.C.: Hippocrates emphasizes the importance of water
                    quality to health and recommends boiling and straining water.
                  </p>
                  <p className="source">
                    Resource:{' '}
                    <a href="http://dec.alaska.gov/eh/dw/publications/historic.html">
                      dec.alaska.gov
                    </a>
                  </p>
                </div>
              </div>

              <div className="slide five">
                <div className="slide-content">
                  <h6 className="bold-title">1920: Modern medicine begins</h6>
                  <p>
                    Physicians no longer needed to ask permission of the church
                    before starting their practice or performing surgery. Finally,
                    reliable prescription drugs, and penicillin began to curb
                    sickness before surgery or other last resorts were necessary.
                    Modern surgery was coming of age. The last lobotomy to treat
                    schizophrenia was done in 1970.
                  </p>
                  <p className="source">
                    Resource:{' '}
                    <a href="http://blog.soliant.com/careers-in-healthcare/the-history-of-physicians-doctors/">
                      soliant.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="slide six">
                <div className="slide-content">
                  <h6 className="bold-title">The modern doctor</h6>
                  <p>
                    To be sure, modern medicine is all the things people expect
                    when they visit a hospital, but a modern doctor in the
                    developed world is as much of a super hero or science fiction
                    character as friendly sawbones. The &ldquo;utility
                    belt&rdquo; of tools at a modern doctor&rsquo;s disposal
                    includes surgical lasers and robots, high-powered magnetic
                    imagers and networked data streams.
                  </p>
                  <p className="source">
                    Resource:{' '}
                    <a href="http://blog.soliant.com/careers-in-healthcare/the-history-of-physicians-doctors/">
                      soliant.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="slide seven">
                <div className="slide-content">
                  <p>
                    2018: EHR data on subdermal chip (standard care plan option).
                  </p>
                  <p className="source">
                    Design For Life: Next 25 years of Healthcare
                  </p>
                </div>
              </div>

              <div className="slide eight">
                <div className="slide-content">
                  <p>2019: Bathroom becomes Healthroom</p>
                  <p className="source">
                    Design For Life: Next 25 years of Healthcare
                  </p>
                </div>
              </div>
            </div>

            <p>
              And as long as we&rsquo;re feeling okay, we think we&rsquo;re
              okay. Generally, that&rsquo;s true. Then health happens, usually
              when we least want or expect it. We stumble on the trail or travel
              far from home and come back with dysentery. One of these health
              happenings prompts a visit, so you go to a tribal elder who sets
              bones or you seek out the town doc to ease your intestinal
              disturbance or, after catching your son flying off the living room
              couch, you get an MRI to reveal a bicep tendon rupture.
            </p>

            <p>
              What we call health is made up of these episodic issues and
              interventions. Even periodic exams are events that we bathe and
              dress up for. In fact, we are most conscious of our health during
              these moments. For the average person&mdash;one without chronic
              pain or illness&mdash;health is conceived of and managed as an
              exception.
            </p>

            <p>
              Few would deny that health is the single most important factor for
              any human, at any age, living anywhere on Spaceship Earth. The
              potential impact of a health setback on a person&rsquo;s life may
              reach into all other areas of his life&mdash;work, finances, love,
              and hobbies&mdash;and even affect the community. The stakes of
              dealing with health are significantly high. For example, a high
              school math teacher with a kidney stone calls in sick, the
              principal hires a per diem substitute teacher, and the learning of
              20 high school kids dwindles. In our era, the complexity of health
              has surged dramatically. Remarkable things have transpired over the
              past 100 years, the past 40 years, and the past 5. In 1909, for
              example, hospitals treated third-degree burn patients with opiates,
              frequent application of moist antiseptic dressings, and sometimes
              baths; today, clinics spray-paint new skin based on the burn
              victim&rsquo;s cells. The jump in technology and our understanding
              of biology and the health sciences is startling, which has
              ratcheted up both the system complexity and awareness of it.
              What&apos;s good for one patient may not be quite right for the
              patient in the next bed over.
            </p>

            <p>
              Yet, same as 1,000 years ago, humans don&rsquo;t want to think
              about health until health happens&mdash;or a health event happens.
              This state of denial is evidenced by the declining health rankings
              of the United States compared to 33 other wealthy nations. From
              1990 to 2010, although Americans&rsquo; life expectancy increased,
              our health rank decreased notably across six key health measures.
              <sup>3</sup> While there may be social and cultural forces at play
              in these disheartening statistics, the continued decline of the
              health of the U.S. population suggests that we&rsquo;re still
              stuck in the land of episodic medical care, in not only treatment
              but also thinking, engineering, and designing for health.
            </p>

            <p>
              There is a way out of this, and the remedy is not just a pill,
              diet, or implant. To illustrate the possibilities available to us
              right now, I propose a quickie thought experiment:
            </p>

            <p>
              Suppose your data are simply and automatically collected&mdash;all
              of your numbers surrounding your existence from the financial
              (which we&rsquo;re nearly doing today) to travel (again, captured
              today) to habits to eating to exercise to examining your daily
              biome. It&rsquo;s captured. It just happens, in the background.
            </p>

            <p>
              And your captured data are visible: you can see the data points,
              see the trends, and even see the data of your close friends and
              family so you can help them make decisions and make change.
            </p>

            {/* hGraph aside */}
            <div className="aside-media">
              <div className="caption" id="hgraphCaption">
                <p className="light">
                  hGraph: Your health in one picture. It&rsquo;s an open source,
                  standardized visual representation of a patient&rsquo;s health
                  status, designed to increase awareness of the individual
                  factors that can affect one&rsquo;s overall health.
                </p>
                <p className="light">
                  hGraph users can easily identify which metrics exist in a
                  normal range versus those that may be too high or low. It
                  effectively conveys important data at sizes both large and
                  small, and enables people to recognize patterns.
                </p>
              </div>
              <div className="video relative overflow-hidden" id="hgraph">
                <BackgroundVideo
                  mp4Src={`${VID_BASE}/hgraph.mp4`}
                  posterSrc={legacyImage('hgraph-poster.jpg')}
                />
                {/* Spacer to maintain aspect ratio */}
                <div className="relative z-[1]" style={{ paddingTop: '66.67%' }} />
              </div>
            </div>

            <p>
              The foundations of this new paradigm are in place. The structure is
              ours to make.
            </p>

            <p>
              Our thought experiment provides a stark contrast to the current
              state of design thinking on life, on health, and on data. We have
              minimal transparency into key health metrics. For the data we do
              have, the overhead required to collect it is enormous. People have
              a hard enough time changing their Facebook privacy settings or
              figuring out mortgage refinancing. The systems we deal with are
              increasingly complex, and the user interfaces are more puzzles than
              designs. And as decision-makers, we are swamped with conflicting
              data.
            </p>

            <p>
              As designers and engineers, our work is increasingly
              multi-dimensional (not a flat-decision space), and linear-thinking
              human beings are not good at non-linear thinking. Seeing every
              variable and doing the mental calculus to orchestrate better
              decision-making is not our species&apos; forte. We fly by the seat
              of our pants until we get tired and land, thump, not always in the
              right or best place. One major variable in the everyday behavior
              change game is sensors... invisible sensors.
            </p>
          </div>
        </section>

        {/* ============================================================
            Section 2 — The surveillance invasion
        ============================================================ */}
        <section className="article-section two" id="section-two">
          <header className="sec-header">
            <div className="title">
              <h3 className="sec-title">The surveillance invasion.</h3>
              <h4 className="sub-title">
                Wearable sensors impressively track personal health metrics, but
                the bands are still as easy to take off as they are to put on.
              </h4>
            </div>
            <div className="number">
              <span>2</span>
            </div>
          </header>
          <div className="section-content">
            {/* Blade Runner eye-tracking overlay */}
            <div className="relative overflow-hidden" id="eye-tracking">
              <BackgroundVideo
                mp4Src={`${VID_BASE}/blade_runner.mp4`}
                posterSrc={legacyImage('blade-runner-poster.jpg')}
              />
              <p className="caption relative z-[1]">
                These days, my thoughts turn pretty frequently to the image of
                the Voight-Kampff interrogation machine in the movie Blade Runner
                (1982). It was a tabletop apparatus with a mechanical eye that
                peered into a human (or robot) eye to non-invasively determine
                his/her/its &ldquo;health&rdquo; status. It&rsquo;s either
                really creepy or really practical.
              </p>
            </div>

            <p>
              The current confluence of sensor tech, data analytics maturity,
              hardware durability, miniaturization, and industrial evolution
              create a perfect storm for capturing biologic metrics and
              determining trends. In a year, we&apos;ll have a good first cut at
              a human prediction model that is personally meaningful and changes
              behavior (and is only 5% wrong).
            </p>

            <p>
              In the{' '}
              <a href="http://goinvo.com/">GoInvo design studio</a>, I count a
              half-dozen different wearable health devices on the limbs of our
              staff, from a Basis watch to Fitbit pedometer to a BodyMedia band
              to a Jawbone up to a Philips pedometer. Digital scales, AliveCor
              EKG iPhone cases, cameras that detect blood pressure through your
              face&mdash;we&rsquo;re not only surrounded by sensors, we&rsquo;re
              adorned with them.
            </p>

            <p>
              One problem with the current batch of wearables is just that:
              they&rsquo;re wearable, and engaging with them requires a ton of
              mental overhead. For example, take the very cool Withings Pulse. It
              tracks steps, general activity, sleep, and heart rate on demand. It
              has a touch screen, solid form factor, and decent contrast
              UI/screen. Yet I forget to put it in my running shorts pocket only
              to realize later that I&rsquo;m device-less and data-less.
            </p>

            <p>
              The biggest beef with all the micro-wearables is that most users
              are not wearing their sensors 24/7. Sticking them in your pocket is
              easy, but it requires pants; when I&apos;m at home, I&apos;m often
              pantless. Furthermore, I don&apos;t wear it at night. The switch to
              turn it to &ldquo;night-time&rdquo; mode, which then requires a
              flip back to daytime usage, is one switch too many for me. Even my
              BodyMedia armband isn&rsquo;t set-it-and-forget-it. I have to take
              it off when I shower and when the device needs charging. So even
              slick new devices like the Misfit Shine&mdash;a wireless, wearable
              activity tracker&mdash;all suffer from the same issue:
              they&rsquo;re a branch of devices called the
              &ldquo;non-forgettables.&rdquo;
            </p>

            <p>
              Now for the flip argument: from a wellness point of view, do
              &ldquo;off times&rdquo; really matter?
            </p>
          </div>

          {/* Device lineup */}
          <div className="media-block inline">
            <Img src="inlines/lineup.png" alt="Device lineup" />
            <p className="caption">
              My device lineup includes the BodyMedia armband, the Jawbone Up,
              Fitbit, and the Withings Pulse.
            </p>
            <p>
              I often forget to wear devices. During the first few months
              wearing a new health monitor, I&rsquo;m exposed to new data. Once
              I understand the patterns, the hardware becomes less and less
              useful (other than to have a bead on those metrics). I want the
              little health plug to strap on when sickness is coming that
              reduces symptoms and duration by 70%. Now that&rsquo;s a helpful
              micro device.
            </p>
            <p>
              Form factor isn&apos;t really The Question because no form factor
              really hits it on the head. Maybe it&apos;s the implant. Or the
              invisible.
            </p>
            <p>
              Hardware is the gateway drug to services and data. (If you&apos;re
              planning to get into health hardware, you&apos;re too late.) The
              current device line-up has little to do with the commodity of
              hardware&mdash;it&rsquo;s all about your information and
              decision-making.
            </p>
          </div>
        </section>

        {/* ============================================================
            Section 3 — Life first. Health a distant second
        ============================================================ */}
        <section className="article-section three" id="section-three">
          <header className="sec-header">
            <div className="title">
              <h3 className="sec-title">Life first. Health a distant second.</h3>
              <h4 className="sub-title">
                The next challenges for designers and engineers in healthcare
                involve data&hellip; collected invisibly.
              </h4>
            </div>
            <div className="number">
              <span>3</span>
            </div>
          </header>
          <div className="section-content">
            <p>
              Designers and engineers have demonstrated that they can make cool
              sensors. Next, we are going to re-design those products and create
              new ones that capture data beautifully, and usually that will mean
              invisibly. Picture this: As I walk around my house, stand at my
              desk at work, and go pee, all of that physiological data will be
              snagged to do DSP analysis that signals &ldquo;getting
              worse&rdquo; or &ldquo;getting better&rdquo; on a defined timeline
              (based on known prior results). This is where machine learning, big
              data, and design crash together.
            </p>

            {/* Sensor date images — interactive slider matching legacy */}
            <DateSlider
              caption="Sensors are exploding. They’re everywhere and proliferating in my house. The DARPA line from the 1980s is catching up: smart dust is all around us."
              slides={[
                { year: '1985', src: legacyImage('dates/1985.png'), alt: 'Sensors in 1985' },
                { year: '2015', src: legacyImage('dates/2015.png'), alt: 'Sensors in 2015' },
                { year: '2025', src: legacyImage('dates/2025.png'), alt: 'Sensors in 2025' },
              ]}
            />

            <p>
              What we learn from the design of personal wearable sensors will
              ultimately be applied to in-hospital devices.
            </p>

            <p>
              There are still massive amounts of pain and mistakes in
              institutional and corporate healthcare:
            </p>

            <ul>
              <li>
                Patient safety is a monster issue. There are 180,000 deaths by
                accident per year in US hospitals. That&rsquo;s 500 deaths per
                day.
              </li>
              <li>
                There are scores of classic examples like anesthesia gone wrong
                during surgery and known allergies overlooked. Go to the ECRI
                Institute website if you want to deep dive into improving
                patient safety and quality.
              </li>
              <li>
                Cullen Care was sued over a claim that the pharmacy made a
                dosing error, dispensing 150mg of morphine for a kid, which is
                10 times the required dose. Their mistake came down to human
                error, inputting 150 instead of the prescribed 15mg. Sadly, this
                type of human error happens daily.
              </li>
            </ul>

            <p>
              More people die annually from overdosing by prescription drugs like
              oxycontin than car accidents. Humans and machines need to be points
              in the same loop, each checking and amplifying each other&apos;s
              work and output, because both, especially humans, make mistakes.
              One way to audit and be exposed to near-real-time care data
              analysis is a natural extension of Hal 2000: the recording of all
              procedures within the walls of hospitals. Every injection, every
              surgery, every patient-clinician encounter will be on camera,
              microphoned, and recorded. Clinicians wearing Google-glass-esque
              monitors that automagically capture the patient&rsquo;s mood, tiny
              facial triggers pointing to emotional state and potential
              conditions, and other metrics, will be whispered hints and
              diagnosis by the cloud-based Dr. Watson. Longer-term hospital
              visits will require patients to wear individual trackers. Then when
              conflicts occur, or right before a tragic maneuver, the hospital
              and patient trackers will run &ldquo;interference.&rdquo;
            </p>

            <p>
              Machines and humans are about to synchronize in a whole new way at
              home. Let&apos;s talk about... the bathroom.
            </p>

            <p>Your bathroom will be an invisible sensor haven.</p>

            <p>
              Consider what that room collects and how it could be assessed,
              sooner rather than later. Hair follicles collected in the shower
              drain. GI samples and urinalysis from the toilet. Your biome
              sloughing off into the sink. Weight, heart rate, blood flow, and
              facial expressions recorded automatically. It just happens, with
              regular feedback loops but no mental or physical overhead. It
              isn&rsquo;t the bathroom anymore; it&rsquo;s the health room.
            </p>

            <div className="caption">
              <p>
                How do you get a pulse on key health metrics without a single
                tear? Your bathroom will turn into a healthroom, complete with
                non-invasive diagnostics for early detection of chronic diseases.
              </p>
              <p>
                The Healthrooms will proliferate and scale as they turn into
                ready-made, all-in-one, drop-in units. Illustration by Quentin
                Stipp.
              </p>
            </div>

            {/* Crane / healthroom video */}
            <div className="full relative overflow-hidden" id="crane" style={{ margin: '2em 0' }}>
              <BackgroundVideo
                mp4Src={`${VID_BASE}/crane.mp4`}
                posterSrc={legacyImage('crane-poster.jpg')}
              />
              {/* Spacer to maintain aspect ratio */}
              <div className="relative z-[1]" style={{ paddingTop: '50%' }} />
            </div>

            <p>
              Hospitals are rolling out patient portals and insurance companies
              are experimenting with electronic health records, but the
              usefulness of those repositories is limited to patients. More
              critical are teachable moments in data that signal potential
              outcomes and prompt micro behavior shifts that in turn will offer
              feedback and affirm new behaviors or nudge new ones.
            </p>

            <p>
              In the bathroom and, eventually, in other environments like the
              hospital room, the majority of your physiologic signs will be
              snagged non-invasively, through sensors that passively sniff you.
              No blood draws. No awkward stool sample cards. Just whiffs and
              sniffs and the occasional photograph. All of this must be designed
              to feel wonderful, so that you think more about LIFE and less about
              &ldquo;health&rdquo; and &ldquo;security.&rdquo; Background,
              automatic health sensing will let us focus our consciousness on the
              dream life we want to live.
            </p>

            {/* Sleeper aside */}
            <div className="aside-media">
              <div className="caption" id="sleeper-caption">
                <p>
                  Talking about passive sensors, I always picture the
                  orgasmatron from Woody Allen&apos;s movie, Sleeper (1973),
                  which was set in the year 2173. This fictional device, a
                  cylinder large enough to contain one or two people, rapidly
                  induced orgasms. A character would walk in, have a blast, and
                  walk out only seconds later. That&rsquo;s how I want
                  healthcare delivered. That&apos;s where engineering and design
                  can really have impact.
                </p>
                <p>Sign me up.</p>
                <p className="light">
                  Image from Woody Allen&rsquo;s movie, Sleeper, 1973
                </p>
              </div>
              <div className="video relative overflow-hidden" id="sleeper-video">
                <BackgroundVideo
                  mp4Src={`${VID_BASE}/sleeper.mp4`}
                  posterSrc={legacyImage('sleeper-poster.jpg')}
                />
                {/* Spacer to maintain aspect ratio */}
                <div className="relative z-[1]" style={{ paddingTop: '66.67%' }} />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            Section 4 — Stage Zero Detection
        ============================================================ */}
        <section className="article-section four" id="section-four">
          <header className="sec-header">
            <div className="title">
              <h3 className="sec-title">Stage Zero Detection.</h3>
              <h4 className="sub-title">
                Continuous assessments make real-time adjustments not only
                possible but desirable and doable.
              </h4>
            </div>
            <div className="number">
              <span>4</span>
            </div>
          </header>
          <div className="section-content">
            <p className="margin-bottom">
              We get biome analysis, emotional analysis, breath evaluation, and
              voice analysis. Bots (some with cameras) are in our stomachs and
              blood streams, churning through our bodies and molecules, gathering
              intelligence. We are able to detect disease and conditions as they
              erupt at the cellular level, and not have to wait until they
              physically manifest so our eyes and bodies can &ldquo;see&rdquo;
              them. (By the time we can see it with our own eyes, it&apos;s too
              goddamn late.)
            </p>

            <div className="media-block wide">
              <Img src="inlines/aging.jpg" alt="Aging progression" />
            </div>

            <p>
              That&rsquo;s the future, and it is near. If health is beautifully
              integrated into our daily life, so that we&rsquo;re getting
              continuous assessments, we&rsquo;ll be able to adjust in near-real
              time.
            </p>

            <p>Next, here&rsquo;s what&rsquo;s on the horizon:</p>

            <ul>
              <li>
                Scanadu, a hockey-puck-sized, 10-major-metric, non-invasive data
                collector;
              </li>
              <li>
                Make-my-pill (based on my dynamic careplan, biology, conditions,
                geo, etc) vending machine by Walgreens;
              </li>
              <li>
                Adamant, a breath sensor out of Penn State that detects differing
                signatures in 25 variables of your breath; and
              </li>
              <li>
                One-nanometer resolution spectrometers, priced at $20, for
                instant food analysis at the molecular level. &ldquo;Does this
                food have any peanuts in it?&rdquo; Check it with a smartphone.
              </li>
            </ul>

            {/* Locations interactive — static version */}
            <div className="full" id="locations">
              <div className="slider-graphic">
                <Img
                  src="locations/location-head.png"
                  alt="Health sensing locations"
                />
              </div>
              <div
                id="locations-slider-controls"
                style={{
                  overflow: 'hidden',
                  border: '2px solid black',
                  borderLeft: 0,
                  borderRight: 0,
                  display: 'flex',
                }}
              >
                {[
                  'Market',
                  'Bathroom',
                  'Bedroom',
                  'Dining Room',
                  'Living Room',
                  'Work',
                ].map((label, i) => (
                  <span
                    key={label}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '4px',
                      textTransform: 'uppercase',
                      borderRight:
                        i < 5 ? '2px solid #000' : 'none',
                      fontSize: '0.8em',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1em',
                  marginTop: '1em',
                }}
              >
                <Img src="locations/market.png" alt="Market health sensing" />
                <Img
                  src="locations/bathroom.png"
                  alt="Bathroom health sensing"
                />
                <Img src="locations/bedroom.png" alt="Bedroom health sensing" />
                <Img
                  src="locations/dining_room.png"
                  alt="Dining room health sensing"
                />
                <Img
                  src="locations/living_room.png"
                  alt="Living room health sensing"
                />
                <Img src="locations/work.png" alt="Work health sensing" />
              </div>
              {/* Location cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1em',
                  marginTop: '1em',
                }}
              >
                <Img
                  src="locations/cards/market.png"
                  alt="Market card"
                  width={300}
                  height={200}
                />
                <Img
                  src="locations/cards/bathroom.png"
                  alt="Bathroom card"
                  width={300}
                  height={200}
                />
                <Img
                  src="locations/cards/bedroom.png"
                  alt="Bedroom card"
                  width={300}
                  height={200}
                />
                <Img
                  src="locations/cards/diningroom.png"
                  alt="Dining room card"
                  width={300}
                  height={200}
                />
                <div>{/* Living room has no card in original */}</div>
                <Img
                  src="locations/cards/work.png"
                  alt="Work card"
                  width={300}
                  height={200}
                />
              </div>
            </div>

            <p>
              These are neat. Designers and engineers, we can do more, and we
              should. It won&rsquo;t be until our digital health
              &ldquo;guards&rdquo;&mdash;the digital services that pound on
              those massive data sets and prior patterns in order to keep us
              healthier&mdash;can identify trends and thereby exponentially
              reduce our sickness rates that we&rsquo;ll reach Phase Two. My
              health and my family&apos;s health will be actively guarded. The
              technology is already widely used. For instance, for $10 per month
              I subscribe to CitiBank&rsquo;s so-called fraud security net,
              which monitors any transaction that didn&apos;t appear to come from
              me or my family, across the planet. If there is any suspicious
              action, the bot notifies me immediately, and together we deconflict
              the issue in near-real time. An analogous (and currently fictitious)
              product service is LifeLock&reg;, a Netflix-type model where I pay
              $10, $20, or $30 per month for the service to look over and protect
              my data, know who is touching it, predict behaviors, and tease me
              to change my behaviors. This cloud guard will auto-detect and alert
              me to the make-my-pill vending machine getting hacked = protecting
              all the trains of trust.
            </p>

            <p>
              In the future, we&apos;ll eat our medicine and lookout bots. They
              will monitor and command seek-and-destroy missions at the cellular
              level in conjunction with external readings and decision-support
              tools. We won&apos;t feel or notice a thing.
            </p>

            <p>
              I&rsquo;ll be notified that my biome composition has shifted and
              that a cold is coming on in a day. My day-treat&mdash;concocted
              specifically for me based on my genomic and personal data
              set&mdash;can be ready in 60 minutes at my local pharmacy. The
              Skittle&reg;-sized gel tab, a living set of custom organisms ready
              to swim into my blood stream, is taken orally, melts away
              immediately, and within several dozen minutes I am back to my
              unique, diverse, healthy biome. No stuffy head, no aching muscles,
              no fever, no sign of &ldquo;health,&rdquo; good or bad. I simply
              am.
            </p>

            <p>
              This design space needs to chew on the massive volume of data and
              massive volume of human factors and their interrelationships. I
              mean taking every connecting piece of information from what
              we&rsquo;re eating, how we&rsquo;re moving (or not), how we work,
              and what makes up our genome, and expanding that out to the entire
              system-picture of a human living on planet earth. All of that
              interconnecting and interlocked information tissue needs to be
              condensed into a single decision space that&apos;s not a data dump
              but a highly personalized, insight crystal ball.
            </p>

            <p>
              That insight service is getting close on the research and science
              side.
            </p>

            <p>Sound scary? It is&hellip; a little.</p>
          </div>
        </section>

        {/* ============================================================
            Section 5 — From protein to pixel to policy
        ============================================================ */}
        <section className="article-section five" id="section-five">
          <header className="sec-header">
            <div className="title">
              <h3 className="sec-title">From protein to pixel to policy.</h3>
              <h4 className="sub-title">
                Design-for-health possibilities and responsibilities are
                immense.
              </h4>
            </div>
            <div className="number">
              <span>5</span>
            </div>
          </header>
          <div className="section-content">
            <p>
              Our medical records, our life records, will be available for
              computational use like we currently have with social data on
              Facebook and Google. Machine learning and prediction will vastly
              improve our ability to live life, to see conditions at their
              earliest manifestation as we get fabulous, personalized, medical
              diagnostics and advice.
            </p>

            <p>
              This sensor cloud will monitor my physical activity and my online
              activity too. It will observe, for example, that 90% of my
              bandwidth is porn and propose that the erectile dysfunction I
              experience when faced with a live boyfriend is correlated with
              online activity. (Note: data are starting to trickle in on this,
              even though the researchers are having a hard time finding a
              control group.)
            </p>

            <p>
              The power of the data and tools is impressive. The implications are
              daunting to the same degree. Designers and engineers will need to
              deliver products that are functional and invisible, but also make
              designs that are inviting not intimidating, reassuring and not
              anxiety-producing. We want to improve humanity, not put it under
              house arrest.
            </p>

            <p>
              What Orbitz did to travel agents, medical technology, design, and
              culture shifts will do to doctors and the traditional practice of
              episodic medicine.
            </p>

            <p>
              As a designer, I want my fingers, hands, and eyes on all the
              moving parts of a product, no matter how small or big. I want to
              influence the world from protein, to policy, to pixels. That means
              expanding our skills and knowledge to have impact at levels of
              science and society as well as design and engineering. That degree
              of immersion into problem solving and the holistic context of my
              clients enables our design studio to make extraordinary impact, at
              a level that transcends the important issues of our clients but get
              into issues of meaning and the longer future.
            </p>

            <p>
              And at some point in our careers, designers and engineers need to
              be involved in policy... in the crafting, in the designing or
              development of guidelines or law that drive how we as a people,
              operate together (or not). Some efforts are grassroots, like the
              open source Inspired EHR Guide (inspiredehrs.org), which starts
              with just a few people. This is attacking at the fringe, from the
              outside in. Data standards and policy-making and advising mafia
              (like HL7 or HIMSS) need good engineers and designers to
              participate. This is not super-sexy work. While the pace of
              sculpting governance is enormously slow (these kinds of efforts
              take years and are often frustrating experiences), the ultimate
              outcome and impact can be long-lasting. And making this kind of
              change is why I&rsquo;m in business.
            </p>
          </div>
        </section>

        {/* ============================================================
            Section 6 — Final Thoughts
        ============================================================ */}
        <section className="article-section six" id="section-six">
          <header className="sec-header">
            <div className="title">
              <h3 className="sec-title">Final Thoughts</h3>
            </div>
            <div className="number">
              <span>6</span>
            </div>
          </header>
          <div className="section-content">
            <p>
              Data let us live aware of our health. For example, when we are
              messaged that ice cream is high in fat, high in sugar, and high in
              cow&rsquo;s milk, we process that as &ldquo;Okay, that&apos;s bad,
              but so what?&rdquo; As soon as it that message becomes quantified,
              and not by keeping annoying food diaries and looking up the
              nutrition content of every bite or sip, we get religion. Data take
              us by the shoulders and shake. We notice that eating this way, and
              continuing to do so, has taken days, or even a few years, off our
              precious life expectancy. That is when the entire world changes.
              But not before.
            </p>

            <p>It&rsquo;s up to us.</p>
          </div>

          {/* Mirror / Care Cards */}
          <div className="media-block full relative">
            <Img src="svg/mirror.png" alt="Healthroom mirror with care cards" />
            <div className="axiom-link">
              Learn more about Care Cards at
              <br />
              <a href="/vision/care-plans">www.goinvo.com/products/care-cards/</a>
            </div>
          </div>
        </section>
      </article>

      {/* ============================================================
          Contributions footer (dark background)
      ============================================================ */}
      <div className="contributions">
        <div className="cont-wrapper">
          <table>
            <tbody>
              <tr>
                <td>
                  <table className="column">
                    <tbody>
                      <tr>
                        <td className="label">Author:</td>
                        <td className="person">Juhan Sonin</td>
                      </tr>
                      <tr>
                        <td className="label">Editor:</td>
                        <td className="person">Emily Twaddell</td>
                      </tr>
                      <tr>
                        <td className="label"></td>
                        <td className="person">Jane Kokernak</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td>
                  <table className="column">
                    <tbody>
                      <tr>
                        <td className="label">Designer:</td>
                        <td className="person">Xinyu Liu</td>
                      </tr>
                      <tr>
                        <td className="label">Illustrator:</td>
                        <td className="person">Sarah Kaiser</td>
                      </tr>
                      <tr>
                        <td className="label"></td>
                        <td className="person">Quentin Stipp</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td>
                  <table className="column">
                    <tbody>
                      <tr>
                        <td className="label">Developer:</td>
                        <td className="person">Adam Pere</td>
                      </tr>
                      <tr>
                        <td className="label"></td>
                        <td className="person">Noel Forte</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="footer-logo">
            <div className="logo">
              <Image
                src="https://www.goinvo.com/old/images/logo_blue.png"
                alt="GoInvo logo"
                width={100}
                height={50}
                unoptimized
              />
            </div>
            <a href="/">goinvo.com</a>
          </div>
        </div>
      </div>

      {/* ============================================================
          Newsletter
      ============================================================ */}
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
