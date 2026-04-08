import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { CovidChart } from './CovidChart'
import references from '@/data/vision/coronavirus/references.json'

export const metadata: Metadata = {
  title: 'Understanding the Novel Coronavirus (COVID-19) - GoInvo',
  description:
    'Learn about COVID-19, what it means for U.S. residents, and how you can protect yourself. Updated as new information emerges.',
}

/* ---------- helper sub-components ---------- */

function NumberListItem({
  number,
  children,
}: {
  number: number | string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 my-4 items-start">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#563C8D] text-white flex items-center justify-center font-semibold text-sm">
        {number}
      </div>
      <div className="flex-1 text-base leading-relaxed">{children}</div>
    </div>
  )
}

function SectionHero({ title }: { title: string }) {
  return (
    <div className="relative w-full h-[200px] md:h-[260px] overflow-hidden">
      <Image
        src={cloudfrontImage('/images/features/coronavirus/section-header-2.jpg')}
        alt=""
        fill
        className="object-cover"
        unoptimized
      />
      <div className="absolute inset-0 flex items-end">
        <div className="max-width content-padding mx-auto w-full pb-6">
          <h2>{title}</h2>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3>
      <span className="inline-block font-semibold text-xl md:text-2xl uppercase tracking-wider">
        {children}
      </span>
    </h3>
  )
}

/* ---------- timeline data ---------- */

const timelineEvents = [
  {
    date: '1 Dec 2019',
    content: 'First patient confirmed in Wuhan, China',
  },
  {
    date: '31 Dec 2019',
    content:
      'China sends urgent notice to WHO of unknown respiratory illness cause',
  },
  {
    date: '7 Jan 2020',
    items: [
      'New virus identified as a coronavirus',
      "Europe's first case confirmed in France",
    ],
  },
  {
    date: '11 Jan 2020',
    content: 'First death is announced in China',
  },
  {
    date: '21 Jan 2020',
    content:
      'First case in the US is confirmed; Snohomish County, Washington',
  },
  {
    date: '24 Jan 2020',
    content:
      'First case of human-to-human transmission is confirmed outside of China in Vietnam',
  },
  {
    date: '30 Jan 2020',
    items: [
      'WHO declares the outbreak a global public-health emergency (PHE)',
      'The US reports the first confirmed instance of person-to-person spread',
    ],
  },
  {
    date: '31 Jan 2020',
    items: [
      'HHS Secretary declares a PHE for the US',
      'President Trump enforces a 14-day quarantine preceding the entry of travelers from mainland China into the US',
    ],
  },
  {
    date: '11 Feb 2020',
    content:
      'WHO announces a new official name for the disease as "COVID-19"',
  },
  {
    date: '25 Feb 2020',
    content:
      'CDC warns community to prepare for the spread of COVID-19 in the US',
  },
  {
    date: '29 Feb 2020',
    content: 'First death in the US in King County, Washington',
  },
  {
    date: '1 Mar 2020',
    content:
      'UN releases $15 million USD from the Central Emergency Response Fund (CERF) to fund global efforts to contain the virus',
  },
  {
    date: '11 Mar 2020',
    content:
      'WHO announces that the COVID-19 outbreak is a global pandemic',
  },
  {
    date: '13 Mar 2020',
    content:
      'President Trump declares a National Emergency, allowing those in charge to act faster in response to an emergency',
  },
]

/* ---------- page component ---------- */

export default function CoronavirusPage() {
  return (
    <div className="font-coronavirus">
      <SetCaseStudyHero image={cloudfrontImage('/images/features/coronavirus/hero-2.jpg')} />

      {/* ========== HERO ========== */}
      <div className="relative w-full min-h-[60vh] overflow-hidden bg-[#1a1a2e]">
        <Image
          src={cloudfrontImage('/images/features/coronavirus/hero-2.jpg')}
          alt="Understanding the Novel Coronavirus hero illustration"
          fill
          className="object-cover opacity-60"
          priority
          unoptimized
        />
        <div className="absolute inset-0 flex items-end">
          <div className="max-width content-padding mx-auto w-full pb-12 text-white">
            <h1 className="text-3xl md:text-5xl font-semibold leading-tight mb-2">
              Understanding
              <br />
              the Novel Coronavirus
            </h1>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-wider mb-4">
              COVID-19
            </h2>
            <p className="text-sm opacity-80">last update 31 March 2020</p>
          </div>
        </div>
      </div>

      {/* ========== WHAT IS COVID-19? ========== */}
      <section>
        <div className="max-width content-padding mx-auto py-12">
          <SectionHeader>What is COVID-19?</SectionHeader>
          <p className="my-4 leading-relaxed">
            The 2019 Novel Coronavirus, also known as{' '}
            <strong>SARS-CoV-2</strong>, caused an outbreak of respiratory
            illness called <strong>COVID-19</strong>, in Wuhan, China. It has
            since spread to other parts of China and the world. Coronaviruses
            are a family of viruses that infect birds and mammals (this
            includes humans!). Typically, they cause mild respiratory symptoms
            similar to the common cold, but can lead to death, often in those
            that are already immunocompromised.
          </p>

          <h4 className="mt-8 mb-4">
            Quick look: How does COVID-19 compare to the other coronaviruses?
          </h4>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
            {/* SARS */}
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <p className="text-lg font-semibold text-[#563C8D] mb-1">SARS</p>
              <p className="text-sm text-gray-600 mb-3">2002</p>
              <p className="text-2xl font-bold mb-0">
                In <strong>8 mo</strong>
              </p>
              <p className="text-2xl font-bold">8,000</p>
              <p className="text-sm text-gray-600 mb-3">confirmed cases</p>
              <p className="text-2xl font-bold">9.6%</p>
              <p className="text-sm text-gray-600">death rate</p>
            </div>

            {/* MERS */}
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-200">
              <p className="text-lg font-semibold text-[#563C8D] mb-1">MERS</p>
              <p className="text-sm text-gray-600 mb-3">2012</p>
              <p className="text-2xl font-bold mb-0">
                In <strong>36 mo</strong>
              </p>
              <p className="text-2xl font-bold">2,484</p>
              <p className="text-sm text-gray-600 mb-3">confirmed cases</p>
              <p className="text-2xl font-bold">34.4%</p>
              <p className="text-sm text-gray-600">death rate</p>
            </div>

            {/* COVID-19 */}
            <div className="bg-[#563C8D]/10 rounded-lg p-6 text-center border-2 border-[#563C8D]">
              <p className="text-lg font-semibold text-[#563C8D] mb-1">
                COVID-19
              </p>
              <p className="text-sm text-gray-600 mb-3">2019 &ndash; Present</p>
              <p className="text-2xl font-bold mb-0">
                In <strong>~73 mo</strong>
              </p>
              <p className="text-2xl font-bold">704M+</p>
              <p className="text-sm text-gray-600 mb-3">confirmed cases</p>
              <p className="text-2xl font-bold">~1.0%</p>
              <p className="text-sm text-gray-600">death rate</p>
            </div>
          </div>

          {/* Chart */}
          <div className="my-12">
            <h4 className="mb-4">COVID-19 numbers</h4>
            <CovidChart />
          </div>

          {/* How deadly */}
          <h4 className="mt-12 mb-4">
            How deadly is COVID-19?<sup>19,20</sup>
          </h4>
          <p className="my-4 leading-relaxed">
            While COVID-19 is much more infectious, it appears to be less
            deadly than SARS or MERS right now. However, it is more deadly than
            the annual flu, which has a death rate of less than 1%. This is why
            it is even more important that if you experience mild symptoms, you
            should seek medical care right away, and practice hygienic habits
            to slow the spread of germs and COVID-19 to the people around you.
          </p>

          <h4 className="mt-8 mb-4">
            China&apos;s COVID-19 death rate by age as of 11 Feb 2020
            <sup>19,20</sup>
          </h4>
          <Image
            src={cloudfrontImage('/images/features/coronavirus/mortality-by-age.jpg')}
            alt="Chart showing COVID-19 mortality rates by age group in China as of February 2020"
            width={1200}
            height={600}
            className="w-full h-auto my-4"
            unoptimized
          />
          <p className="my-4 text-sm text-gray-600 italic">
            Note: Diseases do not have a single case fatality rate; it depends
            on context, and changes with time and location.
          </p>

          {/* ========== TIMELINE ========== */}
          <div className="mt-16">
            <SectionHeader>
              The first few months of COVID-19<sup>18</sup>
            </SectionHeader>
          </div>

          <div className="border-l-2 border-gray-300 ml-4 pl-8 my-8 space-y-6">
            {timelineEvents.map((event, idx) => (
              <div key={idx} className="relative">
                {/* Dot */}
                <div className="absolute -left-[calc(2rem+5px)] top-1.5 w-3 h-3 rounded-full bg-[#563C8D]" />
                <p className="font-semibold mb-1">{event.date}</p>
                {'content' in event && event.content && (
                  <p className="text-gray-700">{event.content}</p>
                )}
                {'items' in event && event.items && (
                  <ul className="list-disc ml-5 text-gray-700 space-y-1">
                    {event.items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <h4 className="mt-12 mb-4">What happens now?</h4>
          <p className="my-4 leading-relaxed">
            COVID-19 has spread from Asia to North America, South America,
            Europe, Oceania, and Africa. The world continues to work towards
            treating the sick and containing the disease as we learn more about
            it. For now, the public is encouraged to practice social distancing
            and hygienic practices.
          </p>
        </div>

        {/* ========== HOW IS IT SPREADING? ========== */}
        <div className="max-width content-padding mx-auto py-8">
          <div className="mt-8">
            <SectionHeader>
              How is it spreading?<sup>6</sup>
            </SectionHeader>
          </div>
          <p className="my-4 leading-relaxed">
            At this time, we don&apos;t know how fast or easily this virus is
            spreading between people. More information is discovered everyday,
            but here&apos;s what we know so far.
          </p>

          <h4 className="mt-8 mb-4">Human-to-human transmission is possible</h4>
          <p className="my-4 leading-relaxed">
            The virus first came from an animal source, but it is now able to
            spread from human to human.
          </p>

          <h4 className="mt-8 mb-4">It travels through droplets in the air</h4>
          <p className="mb-4">It can infect humans through...</p>

          {/* Mobile: individual spread images */}
          <div className="lg:hidden">
            <Image
              src={cloudfrontImage('/images/features/coronavirus/mobile-spread-2.jpg')}
              alt="Illustration of close contact transmission"
              width={800}
              height={500}
              className="w-full h-auto"
              unoptimized
            />
            <NumberListItem number={1}>
              ...close contact of 6 feet or less, including touching and
              shaking hands.
            </NumberListItem>
            <Image
              src={cloudfrontImage('/images/features/coronavirus/mobile-spread-1.jpg')}
              alt="Illustration of airborne droplet transmission"
              width={800}
              height={500}
              className="w-full h-auto"
              unoptimized
            />
            <NumberListItem number={2}>
              ...the air by coughing and sneezing. People nearby may inhale
              droplets from coughs and sneezes into their lungs.
            </NumberListItem>
            <Image
              src={cloudfrontImage('/images/features/coronavirus/mobile-spread-3.jpg')}
              alt="Illustration of surface contamination transmission"
              width={800}
              height={500}
              className="w-full h-auto"
              unoptimized
            />
            <NumberListItem number={3}>
              ...and by touching an object or surface contaminated by the
              virus, then touching one&apos;s mouth, nose, or eyes.
            </NumberListItem>
          </div>
        </div>

        {/* Desktop: full spread illustration */}
        <div className="hidden lg:block">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/spread-2.jpg')}
            alt="How COVID-19 spreads: close contact within 6 feet, airborne droplets from coughs and sneezes, and contaminated surfaces"
            width={1920}
            height={800}
            className="w-full h-auto"
            unoptimized
          />
        </div>

        <div className="max-width content-padding mx-auto py-8">
          <h4 className="mt-8 mb-4">
            Incubation Period<sup>9</sup>
          </h4>
          <p className="my-4 leading-relaxed">
            The time between exposure to the virus and the start of symptoms is
            between 5.2 &ndash; 12.5 days.
          </p>
        </div>
      </section>

      {/* ========== YOUR PART ========== */}
      <section className="mt-16">
        <SectionHero title="Your Part" />

        <div className="max-width content-padding mx-auto py-8">
          <p className="my-4 leading-relaxed">
            Outbreaks at this scale can be scary, but besides staying up to
            date on the news, there are still a lot of things that you can do
            to stay healthy and help stop the spread of disease!
          </p>

          <div className="mt-12">
            <SectionHeader>
              Prevention<sup>4</sup>
            </SectionHeader>
          </div>
          <p className="my-4 leading-relaxed">
            Here&apos;s what you can do{' '}
            <strong>to prevent COVID-19 from spreading to others:</strong>
          </p>
        </div>

        {/* Mobile: prevention items */}
        <div className="lg:hidden">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/mobile-prevention.jpg')}
            alt="Illustration of prevention measures in a subway scene"
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
          <div className="max-width content-padding mx-auto">
            <NumberListItem number={1}>
              <strong>Stay home</strong> when you are sick.
            </NumberListItem>
            <NumberListItem number={2}>
              <strong>Wash your hands</strong> often with soap and warm water.
              If unable to wash your hands, use alcohol-based hand sanitizer.
            </NumberListItem>
            <NumberListItem number={3}>
              <strong>Avoid close contact</strong> with people who are sick.
            </NumberListItem>
            <NumberListItem number={4}>
              <strong>Clean and disinfect</strong> frequently touched objects
              and surfaces.
            </NumberListItem>
            <NumberListItem number={5}>
              <strong>Cover coughs and sneezes</strong> with your elbow or a
              tissue. Throw tissues in the trash.
            </NumberListItem>
            <NumberListItem number={6}>
              Get your annual <strong>flu vaccine.</strong>
            </NumberListItem>
            <NumberListItem number={7}>
              <strong>Take flu antivirals</strong> if prescribed.
            </NumberListItem>
            <NumberListItem number={8}>
              <strong>Avoid touching</strong> your eyes, nose, and mouth with
              unwashed hands.
            </NumberListItem>
            <NumberListItem number={9}>
              Check CDC&apos;s COVID-19 <strong>travel health notices</strong>{' '}
              often and <strong>avoid</strong> nonessential travel.
            </NumberListItem>
          </div>
        </div>

        {/* Desktop: full prevention illustration */}
        <div className="hidden lg:block">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/prevention-2.jpg')}
            alt="Illustration of prevention measures: stay home when sick, wash hands, avoid close contact, clean surfaces, cover coughs, get flu vaccine, take antivirals, avoid touching face, check travel notices"
            width={1920}
            height={800}
            className="w-full h-auto"
            unoptimized
          />
        </div>

        {/* ========== CLOSE CONTACT ========== */}
        <div className="max-width content-padding mx-auto py-8">
          <div className="mt-12">
            <SectionHeader>
              Close Contact<sup>3</sup>
            </SectionHeader>
          </div>
          <p className="my-4 leading-relaxed">
            If you come into close contact with someone who is confirmed to
            have COVID-19,
            <br />
            <strong>here&apos;s what you can do to stay well:</strong>
          </p>
          <ul className="list-disc ml-6 space-y-2 my-4">
            <li>
              <strong>Monitor your health</strong> for at least{' '}
              <strong>14 days</strong> after your last contact with the
              infected person.
            </li>
            <li>
              Watch for these signs and symptoms.
              <br />
              <strong>Contact your healthcare provider</strong> right away if
              you notice these signs:
            </li>
          </ul>
        </div>

        {/* Mobile: close contact */}
        <div className="lg:hidden">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/mobile-close-contact.jpg')}
            alt="Illustration of a person showing symptoms of COVID-19"
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
          <div className="max-width content-padding mx-auto">
            <NumberListItem number={1}>Fever</NumberListItem>
            <NumberListItem number={2}>Coughing</NumberListItem>
            <NumberListItem number={3}>Shortness of breath</NumberListItem>
            <p className="my-4">
              If you have any of these symptoms,{' '}
              <strong>call your doctor ahead of time</strong> to tell
              them...
            </p>
            <p className="my-2">
              ...you&apos;ve had <strong>close contact</strong> with someone
              with the COVID-19 infection
            </p>
            <p className="my-2">
              ...to call the <strong>local</strong> or{' '}
              <strong>state health department</strong>
            </p>
            <p className="my-4">
              This helps your provider prevent other people from being
              infected.
            </p>
          </div>
        </div>

        {/* Desktop: close contact */}
        <div className="hidden lg:block">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/close-contact-2.jpg')}
            alt="Illustration showing symptoms to watch for (fever, coughing, shortness of breath) and instructions to call your doctor ahead of time"
            width={1920}
            height={800}
            className="w-full h-auto"
            unoptimized
          />
        </div>

        {/* ========== STAY CALM ========== */}
        <div className="max-width content-padding mx-auto py-8">
          <div className="bg-[#563C8D]/10 border-l-4 border-[#563C8D] p-8 my-8 rounded-r-lg">
            <p className="text-[#563C8D] uppercase text-lg font-bold mb-4">
              Stay Calm, Take Care
            </p>
            <p className="my-2">
              Remember, <strong>don&apos;t panic!</strong>
            </p>
            <p className="my-2">
              Take care of yourself{' '}
              <strong>
                just like you would during the annual flu season.
              </strong>
            </p>
            <p className="my-2">
              <strong>Stay on top of the news</strong> and other credible
              sources to keep updated on if you need to do anything different.
            </p>
          </div>

          {/* ========== CARING FOR PATIENTS ========== */}
          <div className="mt-12">
            <SectionHeader>
              Caring for Patients<sup>5</sup>
            </SectionHeader>
          </div>
          <p className="my-4 leading-relaxed">
            If you or someone you know becomes sick with COVID-19 and does not
            require hospitalization or is told they are medically stable to go
            home,{' '}
            <strong>
              here&apos;s what you can do to take care and prevent further
              spread of the disease
            </strong>{' '}
            for <strong>patients</strong> and for{' '}
            <strong>caregivers</strong>.
          </p>
        </div>

        {/* Mobile: caring for patients */}
        <div className="lg:hidden">
          <div className="max-width content-padding mx-auto">
            <p className="text-[#563C8D] font-semibold text-lg mb-2">
              For <strong>Patients</strong>
            </p>
          </div>
          <Image
            src={cloudfrontImage('/images/features/coronavirus/mobile-care-1.jpg')}
            alt="Illustration of a patient in home care, isolated in their room"
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
          <div className="max-width content-padding mx-auto">
            <NumberListItem number={1}>
              <strong>Stay home</strong> except to get medical care.
            </NumberListItem>
            <NumberListItem number={2}>
              Stay in a <strong>different room</strong> from other people in
              your home and use a separate bathroom, if available.
            </NumberListItem>
            <NumberListItem number={3}>
              <strong>Call ahead</strong> before visiting your doctor.
            </NumberListItem>
            <NumberListItem number={4}>
              <strong>Wear a facemask.</strong>
            </NumberListItem>
            <NumberListItem number={5}>
              <strong>Cover coughs and sneezes</strong> with your elbow or a
              tissue. Throw tissues in the trash and then wash your hands.
            </NumberListItem>
            <p className="my-4">
              Follow these precautions until you are fully recovered from
              COVID-19, to prevent the spread of disease and ensure you get
              better!
            </p>

            <p className="text-[#563C8D] font-semibold text-lg mt-8 mb-2">
              For <strong>Caregivers</strong>
            </p>
          </div>
          <Image
            src={cloudfrontImage('/images/features/coronavirus/mobile-care-2.jpg')}
            alt="Illustration of a caregiver doing laundry and cleaning for the patient"
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
          <div className="max-width content-padding mx-auto">
            <NumberListItem number={1}>
              Ensure shared spaces have <strong>good air flow.</strong>
            </NumberListItem>
            <NumberListItem number={2}>
              Only have <strong>people essential for providing care</strong>{' '}
              for the person in the home. Keep the elderly and those likely to
              get sick away from the patient.
            </NumberListItem>
            <NumberListItem number={3}>
              Clean all <strong>&quot;high touch&quot;</strong> surfaces.
            </NumberListItem>
            <NumberListItem number={4}>
              Understand and help the person{' '}
              <strong>follow the healthcare provider&apos;s instructions</strong>{' '}
              for medication and care.
            </NumberListItem>
            <NumberListItem number={5}>
              <strong>Dispose of contaminated items</strong> in a lined
              container before disposing them with other household waste.
            </NumberListItem>
            <NumberListItem number={6}>
              Wear at least a disposable <strong>facemask and gloves</strong>{' '}
              when you touch or have contact with the person&apos;s blood,
              body fluids, and/or secretions.
            </NumberListItem>
            <NumberListItem number={7}>
              <strong>Wash laundry thoroughly.</strong> Immediately remove and
              wash clothes or bedding that have any body fluids and/or
              secretions or excretions on them.
            </NumberListItem>

            <p className="text-[#563C8D] font-semibold text-lg mt-8 mb-2">
              For <strong>Both Patients and Caregivers</strong>
            </p>
            <NumberListItem number={1}>
              <strong>Wash your hands often</strong> with soap and water for
              20 seconds. If unable to and your hands are not visibly dirty,
              use an alcohol-based hand sanitizer (&gt;60% alcohol). Avoid
              touching your face with unwashed hands.
            </NumberListItem>
            <NumberListItem number={2}>
              <strong>Avoid sharing</strong> household items.
            </NumberListItem>
            <NumberListItem number={3}>
              <strong>Monitor</strong> your symptoms, and{' '}
              <strong>seek medical attention</strong> as soon as possible if
              you notice any symptoms and/or if your illness worsens.
            </NumberListItem>
            <p className="my-4 leading-relaxed">
              <strong>
                Healthcare providers and state/local health departments must be
                consulted
              </strong>{' '}
              to get permission to end home isolation. They will give their
              permission when the patient&apos;s risk of spreading COVID-19 to
              others is low; the timing differs from patient to patient.
            </p>
            <p className="my-4">
              <strong>Contact your state or local health department</strong>{' '}
              if you still have any questions.
            </p>
          </div>
        </div>

        {/* Desktop: caring for patients */}
        <div className="hidden lg:block">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/care.jpg')}
            alt="Comprehensive illustration showing care instructions for both patients and caregivers during COVID-19 home isolation"
            width={1920}
            height={800}
            className="w-full h-auto"
            unoptimized
          />
          <div className="max-width content-padding mx-auto py-8">
            <p className="my-4 leading-relaxed">
              <strong>
                Stay home and follow these precautions until you are fully
                recovered from COVID-19,
              </strong>{' '}
              to prevent the spread of disease and ensure that you get better!
            </p>
            <p className="my-4 leading-relaxed">
              <strong>
                Healthcare providers and state/local health departments must be
                consulted
              </strong>{' '}
              to get permission to end home isolation. They will give their
              permission when the patient&apos;s risk of spreading COVID-19 to
              others is low; the timing differs from patient-to-patient.
            </p>
            <p className="my-4">
              <strong>Contact your state or local health department</strong>{' '}
              if you still have any questions.
            </p>
          </div>
        </div>

        {/* ========== END THE PREJUDICE ========== */}
        <div className="bg-[#f5f0ff] py-12">
          <div className="max-width content-padding mx-auto">
            <h3 className="text-[#563C8D] uppercase">
              <span className="text-2xl md:text-3xl font-semibold">
                End the prejudice!<sup>4</sup>
              </span>
            </h3>
            <p className="my-4 leading-relaxed">
              Asian people <strong>are not</strong> at a higher risk than other
              people from becoming sick with COVID-19.
            </p>
            <p className="my-4 leading-relaxed">
              Only people who have{' '}
              <strong>traveled to high-risk areas</strong> or{' '}
              <strong>been in contact</strong> with someone confirmed or
              suspected to have COVID-19 in the last 14 days are at a higher
              risk of being infected.
            </p>
            <p className="font-bold my-4">
              Just because someone is of Asian descent does not mean that they
              have COVID-19!
            </p>
          </div>
        </div>

        {/* ========== MASKS ========== */}
        <div className="bg-[#f0f0f8] py-12">
          <div className="max-width content-padding mx-auto">
            <h3 className="text-[#563C8D] uppercase">
              Hospitals desperately need masks
              <br />
              <span className="text-2xl md:text-3xl font-semibold">
                Save the masks for those who need them most!<sup>1</sup>
              </span>
            </h3>
            <p className="my-4 leading-relaxed">
              In light of the outbreak, two kinds of facemasks have been flying
              off American shelves:
            </p>

            {/* Mobile: masks */}
            <div className="lg:hidden">
              <Image
                src={cloudfrontImage('/images/features/coronavirus/mobile-masks-2.jpg')}
                alt="Illustration of a surgical mask and an N95 respirator"
                width={800}
                height={400}
                className="w-full h-auto my-4"
                unoptimized
              />
              <p className="my-4 leading-relaxed">
                Surgical masks filter the wearer&apos;s sprays from sneezes and
                mucus from coughs, which will help{' '}
                <strong>
                  prevent the spread of COVID-19 if you are sick,
                </strong>{' '}
                but <strong>does not effectively prevent catching</strong>{' '}
                COVID-19.
              </p>
              <p className="my-4 leading-relaxed">
                N95 respirators filter out at least 95% of small airborne
                particles. These will help{' '}
                <strong>prevent against catching and spreading</strong>{' '}
                COVID-19, but{' '}
                <strong>
                  if it has a breathing valve, it does not effectively prevent
                  the spread
                </strong>{' '}
                of COVID-19 if you are sick.
              </p>
            </div>

            {/* Desktop: masks comparison */}
            <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 my-8">
              <div>
                <h4 className="mb-2">Surgical Masks</h4>
                <div className="text-center">
                  <Image
                    src={cloudfrontImage('/images/features/coronavirus/surgical-mask-3.png')}
                    alt="Illustration of a surgical mask showing filter protection"
                    width={400}
                    height={300}
                    className="mx-auto h-auto max-w-full"
                    unoptimized
                  />
                </div>
                <div className="flex gap-3 items-start my-3">
                  <span className="text-green-600 text-xl flex-shrink-0">&#10003;</span>
                  <p>
                    Will help <strong>prevent the spread</strong> of COVID-19
                    if you are sick
                  </p>
                </div>
                <div className="flex gap-3 items-start my-3">
                  <span className="text-red-600 text-xl flex-shrink-0">&#10007;</span>
                  <p>
                    <strong>Does not effectively prevent catching</strong>{' '}
                    COVID-19
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2">N95 Respirators</h4>
                <div className="text-center">
                  <Image
                    src={cloudfrontImage('/images/features/coronavirus/n95-respirator-4.png')}
                    alt="Illustration of an N95 respirator showing particle filter"
                    width={400}
                    height={300}
                    className="mx-auto h-auto max-w-full"
                    unoptimized
                  />
                </div>
                <div className="flex gap-3 items-start my-3">
                  <span className="text-green-600 text-xl flex-shrink-0">&#10003;</span>
                  <p>
                    Will help{' '}
                    <strong>prevent against catching and spreading</strong>{' '}
                    COVID-19
                  </p>
                </div>
                <div className="flex gap-3 items-start my-3">
                  <span className="text-red-600 text-xl flex-shrink-0">&#10007;</span>
                  <p>
                    <strong>
                      If it has a breathing valve, does not effectively prevent
                      the spread
                    </strong>{' '}
                    of COVID-19 if you are sick
                  </p>
                </div>
              </div>
            </div>

            <p className="text-lg my-4 leading-relaxed">
              For now, the CDC recommends only{' '}
              <strong>healthcare providers</strong> to wear surgical grade masks
              and N95 respirators, but{' '}
              <strong>this equipment is in short supply</strong>.
            </p>
            <p className="my-4 leading-relaxed">
              In order to maintain supply for the people who need it most,{' '}
              <strong>please do not hoard masks.</strong> If you do not already
              have surgical masks or respirators,{' '}
              <strong>do not buy them.</strong>
            </p>
            <p className="my-4 leading-relaxed">
              Instead, the CDC recommends the <strong>public</strong> to make
              their own <strong>cloth masks</strong> at home as an alternative
              to these masks to prevent the spread of germs.
            </p>
          </div>
        </div>

        {/* ========== CLOTH MASKS ========== */}
        <div className="bg-[#f0f0f8] py-12">
          <div className="max-width content-padding mx-auto">
            <h3 className="text-[#563C8D] uppercase">
              Stay safe, stay well
              <br />
              <span className="text-2xl md:text-3xl font-semibold">
                Making your own mask to wear in public<sup>21</sup>
              </span>
            </h3>
            <p className="my-4 leading-relaxed">
              If you <strong>need to go out in public</strong>, the CDC
              recommends wearing a <strong>cloth face covering</strong> which
              can be easily made with household items like t-shirts, bandanas,
              rubber bands, and coffee filters.
            </p>

            {/* Mobile: cloth masks materials */}
            <div className="lg:hidden">
              <Image
                src={cloudfrontImage('/images/features/coronavirus/mobile-cloth-masks-1.png')}
                alt="Illustration of homemade mask materials: t-shirt, bandana, coffee filter, rubber bands"
                width={800}
                height={400}
                className="w-full h-auto my-4"
                unoptimized
              />
            </div>

            {/* Desktop: cloth masks */}
            <div className="hidden lg:block">
              <Image
                src={cloudfrontImage('/images/features/coronavirus/cloth-masks.png')}
                alt="Illustration of people wearing masks made from t-shirts, bandanas, and coffee filters with rubber bands"
                width={1200}
                height={500}
                className="w-full h-auto my-4"
                unoptimized
              />
            </div>

            <p className="my-4 leading-relaxed">
              For instructions on how to make different variations of the
              masks, see the CDC&apos;s official instructions{' '}
              <strong>
                <a
                  href="https://www.cdc.gov/coronavirus/2019-ncov/prevent-getting-sick/diy-cloth-face-coverings.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#563C8D] underline"
                >
                  here
                </a>
                .
              </strong>
            </p>

            <p className="my-4 leading-relaxed">
              When making these coverings, keep in mind that they must...
              <br />
              1. ...fit <strong>snugly but comfortably</strong> against the
              side of the face
              <br />
              2. ...be secured with <strong>ties or ear loops</strong>
              <br />
              3. ...include <strong>multiple layers</strong> of fabric
              <br />
              4. ...allow for <strong>breathing without restriction</strong>
              <br />
              5. ...be <strong>machine washable and dryable</strong> without
              damage or change to shape
            </p>

            {/* Mobile: cloth masks people */}
            <div className="lg:hidden">
              <Image
                src={cloudfrontImage('/images/features/coronavirus/mobile-cloth-masks-2.png')}
                alt="Illustration of people wearing homemade masks"
                width={800}
                height={400}
                className="w-full h-auto my-4"
                unoptimized
              />
            </div>

            <p className="my-4 leading-relaxed">
              For safety reasons, cloth face coverings{' '}
              <strong>should not be used</strong> by children{' '}
              <strong>under age 2</strong>, people with{' '}
              <strong>trouble breathing</strong>, or others that may not be
              able to take off the covering{' '}
              <strong>without assistance</strong>.
            </p>
            <p className="my-4 leading-relaxed">
              Make sure you{' '}
              <strong>
                wash these face coverings thoroughly and often
              </strong>{' '}
              after use, and that when you remove them from your face, you{' '}
              <strong>do not touch your eyes, mouth, or face</strong> with
              your hands.
            </p>
          </div>
        </div>
      </section>

      {/* ========== ACTION PLAN ========== */}
      <section>
        <SectionHero title="Action Plan" />

        {/* World response + line of command */}
        <div
          className="relative bg-cover bg-center py-12"
          style={{
            backgroundImage: `url(${cloudfrontImage('/images/features/coronavirus/line-of-command.jpg')})`,
          }}
        >
          <div className="absolute inset-0 bg-white/80" />
          <div className="relative max-width content-padding mx-auto">
            {/* Mobile header */}
            <div className="lg:hidden mt-8">
              <SectionHeader>
                How does the world respond to a pandemic?<sup>16</sup>
              </SectionHeader>
            </div>
            {/* Desktop header */}
            <div className="hidden lg:block">
              <h3 className="text-[#563C8D] text-2xl font-normal">
                How does the world respond to a pandemic?<sup>16</sup>
              </h3>
            </div>

            <p className="my-4 leading-relaxed">
              A pandemic in the world is pretty scary. But the good news is
              that we have a plan on how to deal with situations like these.
            </p>

            {/* Mobile: line of command */}
            <div className="lg:hidden my-6">
              <Image
                src={cloudfrontImage('/images/features/coronavirus/mobile-line-of-command.jpg')}
                alt="An illustration of the Earth with a focus on the U.S."
                width={800}
                height={500}
                className="w-full h-auto"
                unoptimized
              />
            </div>

            <div className="space-y-6 my-8">
              <div>
                <p className="text-[#563C8D] font-bold mb-1">
                  World Health Organization (WHO)
                </p>
                <p className="text-gray-700">
                  Their primary role is to direct international health and
                  provide global leadership and guidance on how to manage. Its
                  headquarters are located in Geneva, Switzerland.
                </p>
              </div>
              <div>
                <p className="text-[#563C8D] font-bold mb-1">
                  Each country has a Regional WHO Office
                </p>
                <p className="text-gray-700">
                  The US Regional Office is in Washington, DC. Here, teams can
                  communicate with the WHO headquarters and get up-to-date
                  information about the emerging situation and consequently
                  manage the outbreak response.
                </p>
              </div>
              <div>
                <p className="text-[#563C8D] font-bold mb-1">
                  The WHO uses its international network of collaborating
                  centers to collect information
                </p>
                <p className="text-gray-700">
                  In the US, the Centers for Disease and Control (CDC) in
                  Atlanta, Georgia collects international and national data,
                  analyzes that data, and synthesizes recommendations.
                </p>
              </div>
              <div>
                <p className="text-[#563C8D] font-bold mb-1">
                  Our world is more connected than ever
                </p>
                <p className="text-gray-700">
                  This means that there are plenty of ways for diseases to
                  spread to other people and places. There is a fine balance
                  between protecting borders by quarantine and overreactions
                  (that cause panic).
                </p>
              </div>
              <div>
                <p className="text-[#563C8D] font-bold mb-1">
                  Local Emergency Operations Centers
                </p>
                <p className="text-gray-700">
                  Day-to-day operations are managed by a local ground team.
                  These centers have a set of experts that work together to
                  control the local situation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Local ground team */}
        <div className="lg:hidden">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/mobile-local-ground-team.jpg')}
            alt="Illustration of a local ground team working together to manage the outbreak"
            width={800}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
          <div className="max-width content-padding mx-auto py-4">
            <NumberListItem number={1}>
              <strong>Communications</strong> oversee how information is being
              disseminated to the public to ensure a strong unified voice.
            </NumberListItem>
            <NumberListItem number={2}>
              <strong>Environment experts</strong> study the environmental
              causes related to the disease.
            </NumberListItem>
            <NumberListItem number={3}>
              <strong>Epidemiologists</strong> analyze the distribution and
              patterns of the disease so that we can understand how it is
              affecting the population.
            </NumberListItem>
            <NumberListItem number={4}>
              <strong>Incident Manager</strong> oversees the entire EOC,
              provides leadership to ensure coordination between the team, and
              is a liaison to the regional office.
            </NumberListItem>
            <NumberListItem number={5}>
              <strong>Policy makers</strong> ensure we have the regulations and
              permissions necessary to control the situation and may create new
              ones as needed.
            </NumberListItem>
            <NumberListItem number={6}>
              <strong>Scientists</strong> analyze lab samples, research, and
              learn about the disease.
            </NumberListItem>
          </div>
        </div>

        <div className="hidden lg:block">
          <Image
            src={cloudfrontImage('/images/features/coronavirus/local-ground-team-2.jpg')}
            alt="Illustration of a local ground team working together to manage the outbreak, showing Communications, Environment experts, Epidemiologists, Incident Manager, Policy makers, and Scientists"
            width={1920}
            height={800}
            className="w-full h-auto"
            unoptimized
          />
        </div>

        {/* ========== RESPONSE SCENARIOS ========== */}
        <div className="max-width content-padding mx-auto py-8">
          {/* Mobile header */}
          <div className="lg:hidden mt-8">
            <SectionHeader>
              So what does this look like in practice?
            </SectionHeader>
          </div>
          {/* Desktop header */}
          <div className="hidden lg:block text-center">
            <h3 className="text-[#563C8D] text-2xl font-normal">
              So what does this look like in practice?
            </h3>
          </div>
        </div>

        {/* Airport Response */}
        <Image
          src={cloudfrontImage('/images/features/coronavirus/response-airport.jpg')}
          alt="A comic about how we protect our airports and borders during COVID-19, showing the three-step process of determining risk, checking symptoms, and taking action"
          width={1920}
          height={1200}
          className="w-full h-auto"
          unoptimized
        />
        <div className="max-width content-padding mx-auto text-center my-8">
          <Button
            href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_airports.pdf"
            size="sm"
            external
          >
            Download PDF
          </Button>
        </div>

        <div className="max-width content-padding mx-auto">
          <p className="my-4 leading-relaxed">
            <span className="text-[#563C8D] font-bold">
              At the national level, our first line of defense is monitoring
              ports-of-entry<sup>11,14</sup>
            </span>
            <br />
            Since the virus outbreak began outside of the US, the first line of
            defense is to manage places where the disease could enter. The CDC
            has ordered airlines to find out which passengers have traveled to
            China in the last 14 days and for major international airports to
            screen all incoming travelers.
          </p>
          <p className="my-4 mb-12 leading-relaxed">
            The three-part process begins with Customs and Border Protection
            agents questioning travelers. Next, those at-risk are sent to a
            secondary screening by health workers where their temperature is
            taken. Then, those showing symptoms are evaluated and monitored by
            the CDC &mdash; which may involve a 14-day quarantine. Travelers
            who have been to China in the last 14 days are advised to stay home
            and monitor their symptoms.
          </p>
        </div>

        {/* Hospital Response */}
        <Image
          src={cloudfrontImage('/images/features/coronavirus/response-hospital-2.jpg')}
          alt="A comic about how hospitals respond to COVID-19, showing preparation protocols, isolation procedures, and the importance of educating all hospital staff"
          width={1920}
          height={1200}
          className="w-full h-auto"
          unoptimized
        />
        <div className="max-width content-padding mx-auto text-center my-8">
          <Button
            href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_hospitals.pdf"
            size="sm"
            external
          >
            Download PDF
          </Button>
        </div>

        <div className="max-width content-padding mx-auto">
          <p className="my-4 leading-relaxed">
            <span className="text-[#563C8D] font-bold">
              If the virus enters a state, hospitals need to be prepared to
              respond<sup>2,12,15</sup>
            </span>
            <br />
            If there is a suspected case of COVID-19 in the region, hospitals
            and local clinics should be trained in how to deal with the virus.
            Massachusetts General Hospital (MGH) is 1 of 10 CDC designated
            &quot;regional ebola and special pathogen treatment centers&quot; in
            the US &mdash; meaning that they have expert knowledge in how to
            deal with something like an outbreak. Many other hospitals have
            turned to MGH as they update their emergency plans.
          </p>

          <p className="my-8 leading-relaxed">
            <span className="text-[#563C8D] font-bold">
              If a city shuts down, what happens?<sup>10,7</sup>
            </span>
            <br />
            In the US, it is very unlikely that the CDC would mandate an entire
            city be quarantined. US policy is actually to avoid location-based
            mass quarantines. Many experts have noted that the effectiveness of
            a mass quarantine for disease may not be worth the significant
            psychological and economic costs. However, in the case that a mass
            quarantine is ordered, cities have a plan to manage the situation.
          </p>
        </div>

        {/* City Quarantine Response */}
        <Image
          src={cloudfrontImage('/images/features/coronavirus/response-city-2.jpg')}
          alt="A comic about how a city would respond to a quarantine order, showing the plan for shutting down public places, restricting transit, creating checkpoints, and keeping the public updated"
          width={1920}
          height={1200}
          className="w-full h-auto"
          unoptimized
        />
        <div className="max-width content-padding mx-auto text-center my-8">
          <Button
            href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_cities.pdf"
            size="sm"
            external
          >
            Download PDF
          </Button>
        </div>

        {/* ========== CONCLUSION ========== */}
        <div className="relative">
          {/* Mobile conclusion */}
          <div className="lg:hidden">
            <Image
              src={cloudfrontImage('/images/features/coronavirus/mobile-conclusion.jpg')}
              alt="Conclusion illustration"
              width={800}
              height={600}
              className="w-full h-auto"
              unoptimized
            />
          </div>
          {/* Desktop conclusion */}
          <div className="hidden lg:block">
            <Image
              src={cloudfrontImage('/images/features/coronavirus/conclusion.jpg')}
              alt="Conclusion illustration"
              width={1920}
              height={600}
              className="w-full h-auto"
              unoptimized
            />
          </div>
          <div className="max-width content-padding mx-auto py-8">
            <p className="my-4 leading-relaxed">
              However, more extreme measures like this have not been required
              to deal with COVID-19 in the US.
            </p>
            <p className="my-4 leading-relaxed">
              For now, <strong>keep calm</strong>, follow regular flu season{' '}
              <strong>preventative measures</strong>, and{' '}
              <strong>keep up to date</strong> on the news for updates on
              protocols and treatment development.
            </p>
            <p className="my-4 leading-relaxed">
              While you may not see it, a lot of people are working to contain
              this virus so you can stay well.
            </p>
          </div>
        </div>
      </section>

      {/* ========== IMPORTANT RESOURCES ========== */}
      <section>
        <SectionHero title="Important Resources" />

        <div className="max-width content-padding mx-auto py-12">
          <div className="space-y-8">
            {/* WHO */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <a
                href="https://www.who.int/emergencies/diseases/novel-coronavirus-2019"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[120px]"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-who.jpg')}
                  alt="World Health Organization logo"
                  width={120}
                  height={120}
                  className="w-full h-auto"
                  unoptimized
                />
              </a>
              <div className="hidden lg:block">
                <p className="text-[#563C8D] font-bold mb-1">
                  World Health Organization
                </p>
                <p className="text-gray-700">
                  Information and guidance for the general public.
                  <br />
                  <a
                    href="https://www.who.int/emergencies/diseases/novel-coronavirus-2019"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#563C8D] underline break-all"
                  >
                    https://www.who.int/emergencies/diseases/novel-coronavirus-2019
                  </a>
                </p>
              </div>
            </div>

            {/* CDC */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <a
                href="https://www.cdc.gov/coronavirus/2019-nCoV/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[120px]"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-cdc.jpg')}
                  alt="CDC logo"
                  width={120}
                  height={120}
                  className="w-full h-auto"
                  unoptimized
                />
              </a>
              <div className="hidden lg:block">
                <p className="text-[#563C8D] font-bold mb-1">
                  Centers for Disease Control and Prevention
                </p>
                <p className="text-gray-700">
                  Information and guidance for the general public and
                  healthcare professionals.
                  <br />
                  <a
                    href="https://www.cdc.gov/coronavirus/2019-nCoV/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#563C8D] underline break-all"
                  >
                    https://www.cdc.gov/coronavirus/2019-nCoV/
                  </a>
                </p>
              </div>
            </div>

            {/* NIH/NIAID */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <a
                href="https://www.niaid.nih.gov/diseases-conditions/coronaviruses"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[120px]"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-nih.jpg')}
                  alt="NIH logo"
                  width={120}
                  height={120}
                  className="w-full h-auto"
                  unoptimized
                />
              </a>
              <div className="hidden lg:block">
                <p className="text-[#563C8D] font-bold mb-1">
                  National Institute of Allergy and Infectious Diseases
                </p>
                <p className="text-gray-700">
                  <a
                    href="https://www.niaid.nih.gov/diseases-conditions/coronaviruses"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#563C8D] underline break-all"
                  >
                    https://www.niaid.nih.gov/diseases-conditions/coronaviruses
                  </a>
                </p>
              </div>
            </div>

            {/* FDA */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <a
                href="https://web.archive.org/web/20200318045606/https://www.fda.gov/emergency-preparedness-and-response/mcm-issues/coronavirus-disease-2019-covid-19"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[120px]"
              >
                <Image
                  src={cloudfrontImage('/images/features/coronavirus/logo-fda.jpg')}
                  alt="FDA logo"
                  width={120}
                  height={120}
                  className="w-full h-auto"
                  unoptimized
                />
              </a>
              <div className="hidden lg:block">
                <p className="text-[#563C8D] font-bold mb-1">
                  US Food and Drug Administration
                </p>
                <p className="text-gray-700">
                  <a
                    href="https://web.archive.org/web/20200318045606/https://www.fda.gov/emergency-preparedness-and-response/mcm-issues/coronavirus-disease-2019-covid-19"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#563C8D] underline break-all"
                  >
                    https://www.fda.gov/emergency-preparedness-and-response/mcm-issues/novel-coronavirus-2019-ncov
                    (archived link)
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Downloads */}
          <div className="text-center mt-12 space-y-4">
            <div>
              <Button
                href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_booklet.pdf"
                external
              >
                Download Booklet PDF
              </Button>
            </div>
            <div>
              <Button
                href="https://github.com/goinvo/COVID19/raw/master/understandingcoronavirus_poster.pdf"
                external
              >
                Download Poster PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== REFERENCES ========== */}
      <section>
        <SectionHero title="References" />
        <div className="max-width content-padding mx-auto py-12">
          <ol className="list-decimal ml-6 space-y-3 text-sm text-gray-700">
            {references.map(
              (ref: { title: string; link?: string }, idx: number) => (
                <li key={idx}>
                  {ref.link ? (
                    <a
                      href={ref.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#563C8D] hover:underline"
                    >
                      {ref.title}
                    </a>
                  ) : (
                    ref.title
                  )}
                </li>
              )
            )}
          </ol>
        </div>
      </section>

      {/* ========== AUTHORS ========== */}
      <section>
        <SectionHero title="Authors" />
        <div className="max-width mx-auto max-w-3xl content-padding py-12">
          <Author name="Patricia Nguyen" />
          <Author name="Colleen Tang Poy" />
          <Author name="Parsuree Vatanasirisuk" />
          <Author name="Craig McGinley" />

          <h3 className="font-sans text-sm font-semibold uppercase tracking-[2px] mt-12 mb-6">
            Contributors
          </h3>

          <Author name="Jen Patel" />
          <Author name="Meghana Karande" />
          <Author name="Juhan Sonin" />
        </div>
      </section>

      {/* ========== SPECIAL THANKS ========== */}
      <section>
        <SectionHero title="Special Thanks" />
        <div className="max-width mx-auto max-w-3xl content-padding py-12">
          <p className="text-gray-600 mb-4">Additional feedback provided by</p>
          <p className="text-gray-600 leading-loose">
            Jan Benway
            <br />
            Grace Cordovano
            <br />
            Dorian Freeman
            <br />
            Eric Moreno
            <br />
            Joey Nichols, MD
            <br />
            Martin Pitt
            <br />
            Corinne Pritchard
            <br />
            James Rini, MD
            <br />
            Ernst-Jan van Woerden
          </p>

          <p className="text-gray-500 text-sm mt-12">
            Licensed under Creative Commons Attribution 4.0 license | Created
            by GoInvo
            <br />
            <a
              href="mailto:coronavirus@goinvo.com"
              className="text-[#563C8D] hover:underline"
            >
              Send us Feedback
            </a>{' '}
            |{' '}
            <a
              href="https://github.com/goinvo/COVID19"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#563C8D] hover:underline"
            >
              Check out the GitHub repo
            </a>
          </p>

          <div className="text-center mt-12 mb-8">
            <p className="mb-4">Have feedback? Reach us at</p>
            <a
              href="mailto:coronavirus@goinvo.com"
              className="text-xl font-bold text-[#563C8D]"
            >
              coronavirus@goinvo.com
            </a>
          </div>
        </div>
      </section>

      {/* ========== NEWSLETTER ========== */}
      <Divider />
      <NewsletterForm />
    </div>
  )
}
