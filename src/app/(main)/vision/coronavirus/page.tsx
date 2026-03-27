import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { CovidChart } from './CovidChart'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/coronavirus/references.json'

export const metadata: Metadata = {
  title: 'Understanding the Novel Coronavirus (COVID-19)',
  description:
    'Learn about COVID-19, what it means for U.S. residents, and how you can protect yourself. Updated as new information emerges.',
}

function NumberItem({
  number,
  children,
}: {
  number: number
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#563C8D] text-white flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <p className="leading-relaxed flex-1">{children}</p>
    </div>
  )
}

function TimelineItem({
  date,
  children,
}: {
  date: string
  children: React.ReactNode
}) {
  return (
    <div className="relative pl-8 pb-8 border-l-2 border-[#563C8D] last:border-l-0 last:pb-0">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#563C8D]" />
      <p className="leading-relaxed">
        <strong>{date}</strong>
        <br />
        {children}
      </p>
    </div>
  )
}

export default function CoronavirusPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/coronavirus/hero-2.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          {/* 1. What is COVID-19? - exact Gatsby text */}
          <h2 className="header-lg mb-4">What is COVID-19?</h2>
          <p className="leading-relaxed mb-4">
            The 2019 Novel Coronavirus, also known as{' '}
            <strong>SARS-CoV-2</strong>, caused an outbreak of respiratory
            illness called <strong>COVID-19</strong>, in Wuhan, China. It has
            since spread to other parts of China and the world. Coronaviruses
            are a family of viruses that infect birds and mammals (this includes
            humans!). Typically, they cause mild respiratory symptoms similar to
            the common cold, but can lead to death, often in those that are
            already immunocompromised.
          </p>
          <h4 className="font-serif text-lg mb-4">
            Quick look : How does COVID-19 compare to the other coronaviruses?
          </h4>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <p className="text-[#563C8D] font-bold text-lg">SARS</p>
              <p>2002</p>
              <p className="text-lg">
                In <strong>8 mo</strong>
                <br />
                <strong>8,000</strong>
              </p>
              <p>confirmed cases</p>
              <p className="text-lg">
                <strong>9.6%</strong>
              </p>
              <p>death rate</p>
            </div>
            <div className="text-center">
              <p className="text-[#563C8D] font-bold text-lg">MERS</p>
              <p>2012</p>
              <p className="text-lg">
                In <strong>36 mo</strong>
                <br />
                <strong>2,484</strong>
              </p>
              <p>confirmed cases</p>
              <p className="text-lg">
                <strong>34.4%</strong>
              </p>
              <p>death rate</p>
            </div>
            <div className="text-center">
              <p className="text-[#563C8D] font-bold text-lg">COVID-19</p>
              <p>2019&ndash;Present</p>
              <p className="text-lg">
                <strong>680M+</strong>
              </p>
              <p>confirmed cases</p>
              <p className="text-lg">
                <strong>~1.2%</strong>
              </p>
              <p>death rate</p>
            </div>
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <h4 className="font-serif text-lg mb-4">Live update of COVID-19 numbers</h4>
        </div>

        {/* Comparison Chart */}
        <CovidChart />

        <div className="max-width max-width-md content-padding mx-auto">
          {/* 2. How deadly is COVID-19? */}
          <h4 className="font-serif text-lg mt-8 mb-4">
            How deadly is COVID-19?<sup>19,20</sup>
          </h4>
          <p className="leading-relaxed mb-4">
            While COVID-19 is much more infectious, it appears to be less deadly
            than SARS or MERS right now. However, it is more deadly than the
            annual flu, which has a death rate of less than 1%. This is why it is
            even more important that if you experience mild symptoms, you should
            seek medical care right away, and practice hygienic habits to slow
            the spread of germs and COVID-19 to the people around you.
          </p>
          <h4 className="font-serif text-lg mb-4">
            China&apos;s COVID-19 death rate by age as of 11 Feb 2020<sup>19,20</sup>
          </h4>
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mortality-by-age.jpg'
            )}
            alt="COVID-19 mortality rate by age"
            width={1200}
            height={600}
            className="w-full h-auto mb-4"
          />
          <p className="text-sm text-gray leading-relaxed mb-8">
            Note: Diseases do not have a single case fatality rate; it depends
            on context, and changes with time and location.
          </p>

          <Divider />

          {/* 3. COVID-19 Timeline */}
          <h2 className="font-serif text-2xl mt-8 mb-6">
            The first few months of COVID-19<sup>18</sup>
          </h2>
          <div className="ml-2 mb-8">
            <TimelineItem date="1 Dec 2019">
              First patient confirmed in Wuhan, China
            </TimelineItem>
            <TimelineItem date="31 Dec 2019">
              China sends urgent notice to WHO of unknown respiratory illness
              cause
            </TimelineItem>
            <TimelineItem date="7 Jan 2020">
              <>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>New virus identified as a coronavirus</li>
                  <li>Europe&apos;s first case confirmed in France</li>
                </ul>
              </>
            </TimelineItem>
            <TimelineItem date="11 Jan 2020">
              First death is announced in China
            </TimelineItem>
            <TimelineItem date="21 Jan 2020">
              First case in the US is confirmed; Snohomish County, Washington
            </TimelineItem>
            <TimelineItem date="24 Jan 2020">
              First case of human-to-human transmission is confirmed outside of
              China in Vietnam
            </TimelineItem>
            <TimelineItem date="30 Jan 2020">
              <>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>
                    WHO declares the outbreak a global public-health emergency
                    (PHE)
                  </li>
                  <li>
                    The US reports the first confirmed instance of
                    person-to-person spread
                  </li>
                </ul>
              </>
            </TimelineItem>
            <TimelineItem date="31 Jan 2020">
              <>
                <ul className="list-disc list-outside pl-6 mt-1">
                  <li>HHS Secretary declares a PHE for the US</li>
                  <li>
                    President Trump enforces a 14-day quarantine preceding the
                    entry of travelers from mainland China into the US
                  </li>
                </ul>
              </>
            </TimelineItem>
            <TimelineItem date="11 Feb 2020">
              WHO announces a new official name for the disease as
              &quot;COVID-19&quot;
            </TimelineItem>
            <TimelineItem date="25 Feb 2020">
              CDC warns community to prepare for the spread of COVID-19 in the
              US
            </TimelineItem>
            <TimelineItem date="29 Feb 2020">
              First death in the US in King County, Washington
            </TimelineItem>
            <TimelineItem date="1 Mar 2020">
              UN releases $15 million USD from the Central Emergency Response
              Fund (CERF) to fund global efforts to contain the virus
            </TimelineItem>
            <TimelineItem date="11 Mar 2020">
              WHO announces that the COVID-19 outbreak is a global pandemic
            </TimelineItem>
            <TimelineItem date="13 Mar 2020">
              President Trump declares a National Emergency, allowing those in
              charge to act faster in response to an emergency
            </TimelineItem>
          </div>

          {/* 4. What happens now? */}
          <h4 className="font-serif text-lg mb-4">What happens now?</h4>
          <p className="leading-relaxed mb-8">
            COVID-19 has spread from Asia to North America, South America,
            Europe, Oceania, and Africa. The world continues to work towards
            treating the sick and containing the disease as we learn more about
            it. For now, the public is encouraged to practice social distancing
            and hygienic practices.
          </p>

          <Divider />

          {/* 5. How is it spreading? - with full text */}
          <h2 className="header-lg mt-8 mb-4">
            How is it spreading?<sup>6</sup>
          </h2>
          <p className="leading-relaxed mb-4">
            At this time, we don&apos;t know how fast or easily this virus is
            spreading between people. More information is discovered everyday,
            but here&apos;s what we know so far.
          </p>
          <h4 className="font-serif text-lg mb-2">
            Human-to-human transmission is possible
          </h4>
          <p className="leading-relaxed mb-4">
            The virus first came from an animal source, but it is now able to
            spread from human to human.
          </p>
          <h4 className="font-serif text-lg mb-2">
            It travels through droplets in the air
          </h4>
          <p className="leading-relaxed mb-4">It can infect humans through...</p>

          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/spread-2.jpg'
            )}
            alt="How coronavirus spreads"
            width={1200}
            height={800}
            className="w-full h-auto mb-8 hidden md:block"
          />
          <div className="mb-8 md:hidden">
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-spread-2.jpg'
              )}
              alt="Close contact spread"
              width={600}
              height={400}
              className="w-full h-auto mb-2"
            />
            <NumberItem number={1}>
              ...close contact of 6 feet or less, including touching and shaking
              hands.
            </NumberItem>
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-spread-1.jpg'
              )}
              alt="Airborne spread"
              width={600}
              height={400}
              className="w-full h-auto mb-2"
            />
            <NumberItem number={2}>
              ...the air by coughing and sneezing. People nearby may inhale
              droplets from coughs and sneezes into their lungs.
            </NumberItem>
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-spread-3.jpg'
              )}
              alt="Surface spread"
              width={600}
              height={400}
              className="w-full h-auto mb-2"
            />
            <NumberItem number={3}>
              ...and by touching an object or surface contaminated by the virus,
              then touching one&apos;s mouth, nose, or eyes.
            </NumberItem>
          </div>

          <h4 className="font-serif text-lg mb-2">Incubation Period<sup>9</sup></h4>
          <p className="leading-relaxed mb-8">
            The time between exposure to the virus and the start of symptoms is
            between 5.2 - 12.5 days.
          </p>

          <Divider />

          {/* "Your Part" section header image */}
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/section-header-2.jpg'
            )}
            alt="Your Part"
            width={1200}
            height={300}
            className="w-full h-auto mb-8"
          />

          <h2 className="header-lg mb-4">Your Part</h2>
          <p className="leading-relaxed mb-4">
            Outbreaks at this scale can be scary, but besides staying up to date
            on the news, there are still a lot of things that you can do to stay
            healthy and help stop the spread of disease!
          </p>

          {/* 8. Prevention - exact Gatsby 9 steps */}
          <h2 className="header-lg mt-8 mb-4">Prevention<sup>4</sup></h2>
          <p className="leading-relaxed mb-4">
            Here&apos;s what you can do{' '}
            <strong>to prevent COVID-19 from spreading to others:</strong>
          </p>

          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/prevention-2.jpg'
            )}
            alt="COVID-19 prevention"
            width={1200}
            height={800}
            className="w-full h-auto mb-4 hidden md:block"
          />
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mobile-prevention.jpg'
            )}
            alt="COVID-19 prevention"
            width={600}
            height={800}
            className="w-full h-auto mb-4 md:hidden"
          />

          <NumberItem number={1}>
            <strong>Stay home</strong> when you are sick.
          </NumberItem>
          <NumberItem number={2}>
            <strong>Wash your hands</strong> often with soap and warm water. If
            unable to wash your hands, use alcohol-based hand sanitizer.
          </NumberItem>
          <NumberItem number={3}>
            <strong>Avoid close contact</strong> with people who are sick.
          </NumberItem>
          <NumberItem number={4}>
            <strong>Clean and disinfect</strong> frequently touched objects and
            surfaces.
          </NumberItem>
          <NumberItem number={5}>
            <strong>Cover coughs and sneezes</strong> with your elbow or a
            tissue. Throw tissues in the trash.
          </NumberItem>
          <NumberItem number={6}>
            Get your annual <strong>flu vaccine.</strong>
          </NumberItem>
          <NumberItem number={7}>
            <strong>Take flu antivirals</strong> if prescribed.
          </NumberItem>
          <NumberItem number={8}>
            <strong>Avoid touching</strong> your eyes, nose, and mouth with
            unwashed hands.
          </NumberItem>
          <NumberItem number={9}>
            Check CDC&apos;s COVID-19 <strong>travel health notices</strong>{' '}
            often and <strong>avoid</strong> nonessential travel.
          </NumberItem>

          <Divider />

          {/* 9. Close Contact - full original text */}
          <h2 className="header-lg mt-8 mb-4">Close Contact<sup>3</sup></h2>
          <p className="leading-relaxed mb-4">
            If you come into close contact with someone who is confirmed to have
            COVID-19,
            <br />
            <strong>here&apos;s what you can do to stay well:</strong>
          </p>
          <ul className="list-disc list-outside pl-6 mb-4 leading-relaxed">
            <li>
              <strong>Monitor your health</strong> for at least{' '}
              <strong>14 days</strong> after your last contact with the infected
              person.
            </li>
            <li>
              Watch for these signs and symptoms.
              <br />
              <strong>Contact your healthcare provider</strong> right away if you
              notice these signs:
            </li>
          </ul>

          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/close-contact-2.jpg'
            )}
            alt="Close contact guidelines"
            width={1200}
            height={800}
            className="w-full h-auto mb-4 hidden md:block"
          />
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mobile-close-contact.jpg'
            )}
            alt="Close contact guidelines"
            width={600}
            height={800}
            className="w-full h-auto mb-4 md:hidden"
          />

          <div className="md:hidden mb-4">
            <NumberItem number={1}>Fever</NumberItem>
            <NumberItem number={2}>Coughing</NumberItem>
            <NumberItem number={3}>Shortness of breath</NumberItem>
            <p className="leading-relaxed mb-2">
              If you have any of these symptoms,{' '}
              <strong>call your doctor ahead of time</strong> to tell them...
            </p>
            <p className="leading-relaxed mb-2">
              ...you&apos;ve had <strong>close contact</strong> with someone
              with the COVID-19 infection
            </p>
            <p className="leading-relaxed mb-2">
              ...to call the <strong>local</strong> or{' '}
              <strong>state health department</strong>
            </p>
            <p className="leading-relaxed mb-4">
              This helps your provider prevent other people from being infected.
            </p>
          </div>

          {/* Stay Calm callout */}
          <div className="bg-[#F3F0F9] rounded-lg p-6 mb-8">
            <p className="text-[#563C8D] uppercase text-lg font-bold mb-2">
              Stay Calm, Take Care
            </p>
            <p className="leading-relaxed mb-2">
              Remember, <strong>don&apos;t panic!</strong>
            </p>
            <p className="leading-relaxed mb-2">
              Take care of yourself{' '}
              <strong>
                just like you would during the annual flu season.
              </strong>
            </p>
            <p className="leading-relaxed">
              <strong>Stay on top of the news</strong> and other credible
              sources to keep updated on if you need to do anything different.
            </p>
          </div>

          <Divider />

          {/* 10. Caring for Patients - full text */}
          <h2 className="header-lg mt-8 mb-4">
            Caring for Patients<sup>5</sup>
          </h2>
          <p className="leading-relaxed mb-4">
            If you or someone you know becomes sick with COVID-19 and does not
            require hospitalization or is told they are medically stable to go
            home,{' '}
            <strong>
              here&apos;s what you can do to take care and prevent further
              spread of the disease
            </strong>{' '}
            for <strong>patients</strong> and for <strong>caregivers</strong>.
          </p>

          <Image
            src={cloudfrontImage('/images/features/coronavirus/care.jpg')}
            alt="Caring for COVID-19 patients"
            width={1200}
            height={800}
            className="w-full h-auto mb-8 hidden md:block"
          />

          <div className="md:hidden">
            <p className="font-serif text-xl text-[#563C8D] mb-4">
              For <strong>Patients</strong>
            </p>
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-care-1.jpg'
              )}
              alt="Patient care"
              width={600}
              height={400}
              className="w-full h-auto mb-4"
            />
            <NumberItem number={1}>
              <strong>Stay home</strong> except to get medical care.
            </NumberItem>
            <NumberItem number={2}>
              Stay in a <strong>different room</strong> from other people in your
              home and use a separate bathroom, if available.
            </NumberItem>
            <NumberItem number={3}>
              <strong>Call ahead</strong> before visiting your doctor.
            </NumberItem>
            <NumberItem number={4}>
              <strong>Wear a facemask.</strong>
            </NumberItem>
            <NumberItem number={5}>
              <strong>Cover coughs and sneezes</strong> with your elbow or a
              tissue. Throw tissues in the trash and then wash your hands.
            </NumberItem>
            <p className="leading-relaxed mb-6">
              Follow these precautions until you are fully recovered from
              COVID-19, to prevent the spread of disease and ensure you get
              better!
            </p>

            <p className="font-serif text-xl text-[#563C8D] mb-4">
              For <strong>Caregivers</strong>
            </p>
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-care-2.jpg'
              )}
              alt="Caregiver care"
              width={600}
              height={400}
              className="w-full h-auto mb-4"
            />
            <NumberItem number={1}>
              Ensure shared spaces have <strong>good air flow.</strong>
            </NumberItem>
            <NumberItem number={2}>
              Only have <strong>people essential for providing care</strong> for
              the person in the home. Keep the elderly and those likely to get
              sick away from the patient.
            </NumberItem>
            <NumberItem number={3}>
              Clean all <strong>&quot;high touch&quot;</strong> surfaces.
            </NumberItem>
            <NumberItem number={4}>
              Understand and help the person{' '}
              <strong>
                follow the healthcare provider&apos;s instructions
              </strong>{' '}
              for medication and care.
            </NumberItem>
            <NumberItem number={5}>
              <strong>Dispose of contaminated items</strong> in a lined
              container before disposing them with other household waste.
            </NumberItem>
            <NumberItem number={6}>
              Wear at least a disposable <strong>facemask and gloves</strong>{' '}
              when you touch or have contact with the person&apos;s blood, body
              fluids, and/or secretions.
            </NumberItem>
            <NumberItem number={7}>
              <strong>Wash laundry thoroughly.</strong> Immediately remove and
              wash clothes or bedding that have any body fluids and/or
              secretions or excretions on them.
            </NumberItem>
          </div>

          <p className="font-serif text-xl text-[#563C8D] mb-4">
            For <strong>Both Patients and Caregivers</strong>
          </p>
          <NumberItem number={1}>
            <strong>Wash your hands often</strong> with soap and water for 20
            seconds. If unable to and your hands are not visibly dirty, use an
            alcohol-based hand sanitizer (&gt;60% alcohol). Avoid touching your
            face with unwashed hands.
          </NumberItem>
          <NumberItem number={2}>
            <strong>Avoid sharing</strong> household items.
          </NumberItem>
          <NumberItem number={3}>
            <strong>Monitor</strong> your symptoms, and{' '}
            <strong>seek medical attention</strong> as soon as possible if you
            notice any symptoms and/or if your illness worsens.
          </NumberItem>
          <p className="leading-relaxed mb-4">
            <strong>
              Healthcare providers and state/local health departments must be
              consulted
            </strong>{' '}
            to get permission to end home isolation. They will give their
            permission when the patient&apos;s risk of spreading COVID-19 to
            others is low; the timing differs from patient to patient.
          </p>
          <p className="leading-relaxed mb-8">
            <strong>Contact your state or local health department</strong> if
            you still have any questions.
          </p>

          <Divider />

          {/* 6. End the prejudice! - highlighted callout */}
          <div className="bg-[#FFF3E0] border-l-4 border-[#E36216] rounded-lg p-6 my-8">
            <h3 className="font-serif text-xl text-[#E36216] uppercase mb-4">
              End the prejudice!<sup>4</sup>
            </h3>
            <p className="leading-relaxed mb-3">
              Asian people <strong>are not</strong> at a higher risk than other
              people from becoming sick with COVID-19.
            </p>
            <p className="leading-relaxed mb-3">
              Only people who have <strong>traveled to high-risk areas</strong>{' '}
              or <strong>been in contact</strong> with someone confirmed or
              suspected to have COVID-19 in the last 14 days are at a higher
              risk of being infected.
            </p>
            <p className="leading-relaxed font-bold">
              Just because someone is of Asian descent does not mean that they
              have COVID-19!
            </p>
          </div>

          <Divider />

          {/* 7. Masks section with pros/cons */}
          <h2 className="header-lg mt-8 mb-4">
            Hospitals Desperately Need Masks
          </h2>
          <p className="font-serif text-lg font-bold mb-4">
            Save the masks for those who need them most!<sup>1</sup>
          </p>
          <p className="leading-relaxed mb-4">
            In light of the outbreak, two kinds of facemasks have been flying
            off American shelves:
          </p>

          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mobile-masks-2.jpg'
            )}
            alt="Mask comparison"
            width={600}
            height={800}
            className="w-full h-auto mb-4 md:hidden"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="text-center">
              <h3 className="font-serif text-xl mb-2">Surgical Masks</h3>
              <Image
                src={cloudfrontImage(
                  '/images/features/coronavirus/surgical-mask-3.png'
                )}
                alt="Surgical mask"
                width={400}
                height={400}
                className="w-full h-auto max-w-[300px] mx-auto mb-4"
              />
              <div className="flex items-start gap-2 text-left mb-2">
                <span className="flex-shrink-0 text-green-600 font-bold text-lg">
                  +
                </span>
                <p className="text-sm leading-relaxed">
                  Will help <strong>prevent the spread</strong> of COVID-19 if
                  you are sick
                </p>
              </div>
              <div className="flex items-start gap-2 text-left">
                <span className="flex-shrink-0 text-red-600 font-bold text-lg">
                  -
                </span>
                <p className="text-sm leading-relaxed">
                  <strong>Does not effectively prevent catching</strong>{' '}
                  COVID-19
                </p>
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-serif text-xl mb-2">N95 Respirators</h3>
              <Image
                src={cloudfrontImage(
                  '/images/features/coronavirus/n95-respirator-4.png'
                )}
                alt="N95 respirator"
                width={400}
                height={400}
                className="w-full h-auto max-w-[300px] mx-auto mb-4"
              />
              <div className="flex items-start gap-2 text-left mb-2">
                <span className="flex-shrink-0 text-green-600 font-bold text-lg">
                  +
                </span>
                <p className="text-sm leading-relaxed">
                  Will help{' '}
                  <strong>prevent against catching and spreading</strong>{' '}
                  COVID-19
                </p>
              </div>
              <div className="flex items-start gap-2 text-left">
                <span className="flex-shrink-0 text-red-600 font-bold text-lg">
                  -
                </span>
                <p className="text-sm leading-relaxed">
                  <strong>
                    If it has a breathing valve, does not effectively prevent the
                    spread
                  </strong>{' '}
                  of COVID-19 if you are sick
                </p>
              </div>
            </div>
          </div>

          <p className="leading-relaxed text-lg mb-4">
            For now, the CDC recommends only{' '}
            <strong>healthcare providers</strong> to wear surgical grade masks
            and N95 respirators, but{' '}
            <strong>this equipment is in short supply</strong>.
          </p>
          <p className="leading-relaxed mb-4">
            In order to maintain supply for the people who need it most,{' '}
            <strong>please do not hoard masks.</strong> If you do not already
            have surgical masks or respirators,{' '}
            <strong>do not buy them.</strong>
          </p>
          <p className="leading-relaxed mb-8">
            Instead, the CDC recommends the <strong>public</strong> to make
            their own <strong>cloth masks</strong> at home as an alternative to
            these masks to prevent the spread of germs.
          </p>

          <p className="text-[#563C8D] uppercase font-bold mt-6 mb-2">
            Stay safe, stay well
          </p>
          <p className="font-serif text-lg font-bold mb-4">
            Making your own mask to wear in public<sup>21</sup>
          </p>
          <p className="leading-relaxed mb-4">
            If you <strong>need to go out in public</strong>, the CDC recommends
            wearing a <strong>cloth face covering</strong> which can be easily
            made with household items like t-shirts, bandanas, rubber bands, and
            coffee filters.
          </p>
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/cloth-masks.png'
            )}
            alt="DIY cloth masks"
            width={1200}
            height={600}
            className="w-full h-auto mb-4 hidden md:block"
          />
          <div className="grid grid-cols-1 gap-4 mb-4 md:hidden">
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-cloth-masks-1.png'
              )}
              alt="Cloth mask materials"
              width={600}
              height={400}
              className="w-full h-auto"
            />
          </div>
          <p className="leading-relaxed mb-4">
            For instructions on how to make different variations of the masks,
            see the CDC&apos;s official instructions{' '}
            <strong>
              <a
                href="https://www.cdc.gov/coronavirus/2019-ncov/prevent-getting-sick/diy-cloth-face-coverings.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                here
              </a>
              .
            </strong>
          </p>
          <p className="leading-relaxed mb-4">
            When making these coverings, keep in mind that they must...
            <br />
            1. ...fit <strong>snugly but comfortably</strong> against the side of
            the face
            <br />
            2. ...be secured with <strong>ties or ear loops</strong>
            <br />
            3. ...include <strong>multiple layers</strong> of fabric
            <br />
            4. ...allow for <strong>breathing without restriction</strong>
            <br />
            5. ...be <strong>machine washable and dryable</strong> without damage
            or change to shape
          </p>
          <div className="mb-4 md:hidden">
            <Image
              src={cloudfrontImage(
                '/images/features/coronavirus/mobile-cloth-masks-2.png'
              )}
              alt="Cloth mask people"
              width={600}
              height={400}
              className="w-full h-auto"
            />
          </div>
          <p className="leading-relaxed mb-4">
            For safety reasons, cloth face coverings{' '}
            <strong>should not be used</strong> by children{' '}
            <strong>under age 2</strong>, people with{' '}
            <strong>trouble breathing</strong>, or others that may not be able to
            take off the covering <strong>without assistance</strong>.
          </p>
          <p className="leading-relaxed mb-8">
            Make sure you{' '}
            <strong>wash these face coverings thoroughly and often</strong> after
            use, and that when you remove them from your face, you{' '}
            <strong>do not touch your eyes, mouth, or face</strong> with your
            hands.
          </p>

          <Divider />

          <h2 className="header-lg mt-8 mb-4">
            Action Plan: How the World Responds
          </h2>

          {/* Airport Response */}
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/response-airport.jpg'
            )}
            alt="Airport response comic showing border screening process"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <div className="text-center mb-4">
            <Button
              href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_airports.pdf"
              variant="secondary"
              external
              size="sm"
            >
              Download PDF
            </Button>
          </div>
          <p className="leading-relaxed mb-4">
            <strong className="text-[#563C8D]">
              At the national level, our first line of defense is monitoring
              ports-of-entry<sup>11,14</sup>
            </strong>
            <br />
            Since the virus outbreak began outside of the US, the first line
            of defense is to manage places where the disease could enter.
            The CDC has ordered airlines to find out which passengers have
            traveled to China in the last 14 days and for major
            international airports to screen all incoming travelers.
          </p>
          <p className="leading-relaxed mb-8">
            The three-part process begins with Customs and Border Protection
            agents questioning travelers. Next, those at-risk are sent to a
            secondary screening by health workers where their temperature is
            taken. Then, those showing symptoms are evaluated and monitored
            by the CDC &mdash;which may involve a 14-day quarantine. Travelers who
            have been to China in the last 14 days are advised to stay home
            and monitor their symptoms.
          </p>

          {/* Hospital Response */}
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/response-hospital-2.jpg'
            )}
            alt="Hospital response comic showing quarantine procedures"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <div className="text-center mb-4">
            <Button
              href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_hospitals.pdf"
              variant="secondary"
              external
              size="sm"
            >
              Download PDF
            </Button>
          </div>
          <p className="leading-relaxed mb-4">
            <strong className="text-[#563C8D]">
              If the virus enters a state, hospitals need to be prepared to
              respond<sup>2,12,15</sup>
            </strong>
            <br />
            If there is a suspected case of COVID-19 in the region,
            hospitals and local clinics should be trained in how to deal
            with the virus. Massachusetts General Hospital (MGH) is 1 of 10
            CDC designated &ldquo;regional ebola and special pathogen treatment
            centers&rdquo; in the US &mdash;meaning that they have expert knowledge in
            how to deal with something like an outbreak. Many other
            hospitals have turned to MGH as they update their emergency
            plans.
          </p>

          {/* City Response */}
          <p className="leading-relaxed mt-8 mb-4">
            <strong className="text-[#563C8D]">
              If a city shuts down, what happens?<sup>10,7</sup>
            </strong>
            <br />
            In the US, it is very unlikely that the CDC would mandate an
            entire city be quarantined. US policy is actually to avoid
            location-based mass quarantines. Many experts have noted that
            the effectiveness of a mass quarantine for disease may not be
            worth the significant psychological and economic costs. However,
            in the case that a mass quarantine is ordered, cities have a
            plan to manage the situation.
          </p>
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/response-city-2.jpg'
            )}
            alt="City lockdown response comic"
            width={1200}
            height={800}
            className="w-full h-auto mb-4"
          />
          <div className="text-center mb-8">
            <Button
              href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_cities.pdf"
              variant="secondary"
              external
              size="sm"
            >
              Download PDF
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button
              href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_booklet.pdf"
              variant="secondary"
              external
            >
              Download Booklet PDF
            </Button>
            <Button
              href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_poster.pdf"
              variant="secondary"
              external
            >
              Download Poster PDF
            </Button>
          </div>

          <Divider />

          <h3 className="font-serif text-xl mt-8 mb-4">
            How does the world respond to a pandemic?<sup>16</sup>
          </h3>
          <p className="leading-relaxed mb-4">
            A pandemic in the world is pretty scary. But the good news is
            that we have a plan on how to deal with situations like these.
          </p>
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/line-of-command.jpg'
            )}
            alt="Line of command"
            width={1200}
            height={800}
            className="w-full h-auto mb-4 hidden md:block"
          />
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mobile-line-of-command.jpg'
            )}
            alt="Line of command"
            width={600}
            height={800}
            className="w-full h-auto mb-4 md:hidden"
          />

          <div className="mb-8">
            <p className="leading-relaxed mb-4">
              <strong className="text-[#563C8D]">World Health Organization (WHO)</strong>
              <br />
              Their primary role is to direct international health and
              provide global leadership and guidance on how to manage. Its
              headquarters are located in Geneva, Switzerland.
            </p>
            <p className="leading-relaxed mb-4">
              <strong className="text-[#563C8D]">Each country has a Regional WHO Office</strong>
              <br />
              The US Regional Office is in Washington, DC. Here, teams
              can communicate with the WHO headquarters and get up-to-date
              information about the emerging situation and consequently
              manage the outbreak response.
            </p>
            <p className="leading-relaxed mb-4">
              <strong className="text-[#563C8D]">The WHO uses its international network of collaborating
              centers to collect information</strong>
              <br />
              In the US, the Centers for Disease and Control (CDC) in
              Atlanta, Georgia collects international and national data,
              analyzes that data, and synthesizes recommendations.
            </p>
            <p className="leading-relaxed mb-4">
              <strong className="text-[#563C8D]">Our world is more connected than ever</strong>
              <br />
              This means that there are plenty of ways for diseases to
              spread to other people and places. There is a fine balance
              between protecting borders by quarantine and overreactions
              (that cause panic).
            </p>
            <p className="leading-relaxed mb-4">
              <strong className="text-[#563C8D]">Local Emergency Operations Centers</strong>
              <br />
              Day-to-day operations are managed by a local ground team.
              These centers have a set of experts that work together to
              control the local situation.
            </p>
          </div>

          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/local-ground-team-2.jpg'
            )}
            alt="Local ground team"
            width={1200}
            height={800}
            className="w-full h-auto mb-4 hidden md:block"
          />
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mobile-local-ground-team.jpg'
            )}
            alt="Local ground team"
            width={600}
            height={800}
            className="w-full h-auto mb-4 md:hidden"
          />

          <h3 className="font-serif text-xl mt-8 mb-4 text-center">
            So what does this look like in practice?
          </h3>

          <Divider />
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/conclusion.jpg'
            )}
            alt="Conclusion"
            width={1200}
            height={800}
            className="w-full h-auto mb-4 hidden md:block"
          />
          <Image
            src={cloudfrontImage(
              '/images/features/coronavirus/mobile-conclusion.jpg'
            )}
            alt="Conclusion"
            width={600}
            height={800}
            className="w-full h-auto mb-4 md:hidden"
          />
          <div className="mb-8">
            <p className="leading-relaxed mb-4">
              However, more extreme measures like this have not been
              required to deal with COVID-19 in the US.
            </p>
            <p className="leading-relaxed mb-4">
              For now, <strong>keep calm</strong>, follow regular flu
              season <strong>preventative measures</strong>, and{' '}
              <strong>keep up to date</strong> on the news for updates on
              protocols and treatment development.
            </p>
            <p className="leading-relaxed mb-4">
              While you may not see it, a lot of people are working to
              contain this virus so you can stay well.
            </p>
          </div>

          <Divider />

          <h2 className="header-lg mt-8 mb-4">Important Resources</h2>
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-6">
              <a
                href="https://www.who.int/emergencies/diseases/novel-coronavirus-2019"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-24 md:w-32"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-who.jpg')}
                  alt="WHO"
                  width={200}
                  height={100}
                  className="w-full h-auto"
                />
              </a>
              <div className="hidden md:block">
                <p className="leading-relaxed">
                  <strong className="text-[#563C8D]">World Health Organization</strong>
                  <br />
                  Information and guidance for the general public.
                  <br />
                  <a
                    href="https://www.who.int/emergencies/diseases/novel-coronavirus-2019"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    https://www.who.int/emergencies/diseases/novel-coronavirus-2019
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <a
                href="https://www.cdc.gov/coronavirus/2019-ncov/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-24 md:w-32"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-cdc.jpg')}
                  alt="CDC"
                  width={200}
                  height={100}
                  className="w-full h-auto"
                />
              </a>
              <div className="hidden md:block">
                <p className="leading-relaxed">
                  <strong className="text-[#563C8D]">Centers for Disease Control and Prevention</strong>
                  <br />
                  Information and guidance for the general public and
                  healthcare professionals.
                  <br />
                  <a
                    href="https://www.cdc.gov/coronavirus/2019-ncov/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    https://www.cdc.gov/coronavirus/2019-ncov/
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <a
                href="https://www.niaid.nih.gov/diseases-conditions/coronaviruses"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-24 md:w-32"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-nih.jpg')}
                  alt="NIH"
                  width={200}
                  height={100}
                  className="w-full h-auto"
                />
              </a>
              <div className="hidden md:block">
                <p className="leading-relaxed">
                  <strong className="text-[#563C8D]">National Institute of Allergy and Infectious Diseases</strong>
                  <br />
                  <a
                    href="https://www.niaid.nih.gov/diseases-conditions/coronaviruses"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    https://www.niaid.nih.gov/diseases-conditions/coronaviruses
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <a
                href="https://www.fda.gov/emergency-preparedness-and-response/counterterrorism-and-emerging-threats/coronavirus-disease-2019-covid-19"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-24 md:w-32"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-fda.jpg')}
                  alt="FDA"
                  width={200}
                  height={100}
                  className="w-full h-auto"
                />
              </a>
              <div className="hidden md:block">
                <p className="leading-relaxed">
                  <strong className="text-[#563C8D]">US Food and Drug Administration</strong>
                  <br />
                  <a
                    href="https://www.fda.gov/emergency-preparedness-and-response/counterterrorism-and-emerging-threats/coronavirus-disease-2019-covid-19"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    https://www.fda.gov/emergency-preparedness-and-response/mcm-issues/novel-coronavirus-2019-ncov
                  </a>
                </p>
              </div>
            </div>
          </div>

          <Divider />

          <h2 className="header-lg mt-8 mb-4">Authors</h2>
          <Author name="Patricia Nguyen" company="GoInvo" />
          <Author name="Colleen Tang Poy" company="GoInvo" />
          <Author name="Parsuree Vatanasirisuk" company="GoInvo" />
          <Author name="Craig McGinley" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray">
            Jen Patel, Meghana Karande, Juhan Sonin
          </p>

          <h3 className="header-md mt-6 mb-3">Special Thanks</h3>
          <p className="text-gray text-sm">
            Jan Benway, Grace Cordovano, Dorian Freeman, Eric Moreno, Joey
            Nichols MD, Martin Pitt, Corinne Pritchard, James Rini MD,
            Ernst-Jan van Woerden
          </p>

          <p className="text-sm text-gray mt-8">
            Licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Creative Commons Attribution 4.0
            </a>
            . Source on{' '}
            <a
              href="https://github.com/goinvo/COVID19"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub
            </a>
            .
          </p>
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
