import type { Metadata } from 'next'
import { cloudfrontImage } from '@/lib/utils'
import { Author } from '@/components/ui/Author'
import { References } from '@/components/ui/References'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'

export const metadata: Metadata = {
  title: 'Clinical visits better suited for Virtual Care',
  description:
    '46% of face-to-face clinical office visits can be conducted virtually.',
}

const references = [
  {
    title:
      'National Ambulatory Medical Care Survey: 2015 State and National Summary Tables. (2015). Retrieved January 24, 2019. (archived link)',
    link: 'https://web.archive.org/web/20190111060429/https://www.cdc.gov/nchs/data/ahcd/namcs_summary/2015_namcs_web_tables.pdf',
  },
  {
    title:
      'Why You Have to Wait Longer to Get a Doctor\'s Appointment. (2017). Healthline. Retrieved January 24, 2019. (archived link)',
    link: 'https://web.archive.org/web/20180210005621/https://www.healthline.com/health-news/why-you-have-to-wait-longer-to-get-a-doctors-appointment',
  },
  {
    title:
      '2017 Survey of Physician Appointment Wait Times. (2017). Retrieved January 24, 2019 (archived link)',
    link: 'https://web.archive.org/web/20190323075759/https://www.merritthawkins.com/news-and-insights/thought-leadership/survey/survey-of-physician-appointment-wait-times/',
  },
  {
    title:
      'BA Ahmad, K Khairatul, and A Farnaza. An assessment of patient waiting and consultation time in a primary healthcare clinic. (2017). Retrieved January 24, 2019',
    link: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5420318/',
  },
  {
    title:
      'Jennifer M. Taber, Ph.D., Bryan Leyva, B.A, and Alexander Persoskie, Ph.D. Why do People Avoid Medical Care? A Qualitative Study Using National Data. (2015). Retrieved January 24, 2019',
    link: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4351276/',
  },
]

// Table cell icons as text placeholders (can be replaced with SVG icons later)
const SMARTPHONE = '📱'
const CLINIC = '🏥'
const REQUIRED = '☑'
const OPTIONAL = '☐'
const EKG = '💓'
const BP_CUFF = '🩺'

type EncounterRow = {
  reason: string
  device: string
  text: string
  image: string
  audio: string
  video: string
  vitals: string
  labs: string
  imaging: string
  other: string
  percent: string
}

const encounterData: EncounterRow[] = [
  {
    reason: 'Routine checkup',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: '',
    percent: '24.5%',
  },
  {
    reason: 'Medication, other and unspecified kinds',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: '',
    percent: '3.6%',
  },
  {
    reason: 'Joint pain (knee, shoulder, etc.)',
    device: SMARTPHONE,
    text: REQUIRED,
    image: OPTIONAL,
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: OPTIONAL,
    other: '',
    percent: '2.9%',
  },
  {
    reason: 'Postoperative visit',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: '',
    percent: '2.6%',
  },
  {
    reason: 'Cough',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: '',
    percent: '2.1%',
  },
  {
    reason: 'Gynecological examination',
    device: CLINIC,
    text: '',
    image: '',
    audio: '',
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: 'Gynecologic exam (specialist)',
    percent: '2.1%',
  },
  {
    reason: 'Prenatal examination, routine',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: `${OPTIONAL}\nUltrasound`,
    other: '',
    percent: '1.8%',
  },
  {
    reason: 'Back pain',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: OPTIONAL,
    other: '',
    percent: '1.6%',
  },
  {
    reason: 'Hypertension',
    device: `${SMARTPHONE}\n${BP_CUFF}`,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: OPTIONAL,
    vitals: `${REQUIRED}\nBlood pressure`,
    labs: '',
    imaging: OPTIONAL,
    other: '',
    percent: '1.6%',
  },
  {
    reason: 'Stomach and abdominal pain, cramps, and spasms',
    device: `${SMARTPHONE}\n${EKG}`,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: OPTIONAL,
    vitals: OPTIONAL,
    labs: OPTIONAL,
    imaging: OPTIONAL,
    other: '',
    percent: '1.5%',
  },
  {
    reason: 'Well baby examination',
    device: CLINIC,
    text: '',
    image: '',
    audio: '',
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: 'Milestones exam (specialist)',
    percent: '1.3%',
  },
  {
    reason: 'Diabetes mellitus',
    device: SMARTPHONE,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: `${OPTIONAL}\nEvery 3 months Hemoglobin A1C. Every year fasting lipid profile, liver function tests, urine albumin excretion, serum creatinine.`,
    imaging: '',
    other: '',
    percent: '1.3%',
  },
  {
    reason: 'Skin rash, lesion',
    device: SMARTPHONE,
    text: REQUIRED,
    image: `${REQUIRED}\nPhoto of rash/lesion`,
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: '',
    percent: '1.0%',
  },
  {
    reason: 'Preoperative visit',
    device: `${SMARTPHONE}\n${EKG}`,
    text: REQUIRED,
    image: '',
    audio: OPTIONAL,
    video: '',
    vitals: REQUIRED,
    labs: '',
    imaging: '',
    other: 'EKG',
    percent: '1.0%',
  },
  {
    reason: 'Symptoms referable to throat',
    device: SMARTPHONE,
    text: REQUIRED,
    image: OPTIONAL,
    audio: OPTIONAL,
    video: '',
    vitals: '',
    labs: '',
    imaging: '',
    other: 'Strep test',
    percent: '0.9%',
  },
]

function EncounterCell({ value }: { value: string }) {
  if (!value) return null
  // Handle multi-line cells (icon + description)
  const parts = value.split('\n')
  return (
    <span className="flex flex-col items-center text-center gap-0.5">
      {parts.map((part, i) => (
        <span key={i} className={i === 0 ? 'text-lg' : 'text-[0.65rem] leading-tight'}>{part}</span>
      ))}
    </span>
  )
}

export default function VirtualCarePage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/virtual-primary-care/virtual-primary-care-hero-2.jpg'
        )}
      />

      {/* Title and Stats */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Virtual Care
          </h1>
          <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mb-8">
            Half of face-to-face clinical office visits can be conducted
            virtually.
          </h4>

          {/* Stat Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="mb-1">
                <span className="font-serif text-[2.25rem] lg:text-[3rem] font-light">
                  990
                </span>
                <span className="font-serif text-[1.5rem] lg:text-[2rem] font-light">
                  M
                </span>
              </div>
              <p className="text-gray">
                face-to-face clinical office visits every year
                <sup>
                  <a href="#references">1</a>
                </sup>
              </p>
            </div>
            <div>
              <div className="mb-1">
                <span className="font-serif text-[2.25rem] lg:text-[3rem] font-light">
                  459
                </span>
                <span className="font-serif text-[1.5rem] lg:text-[2rem] font-light">
                  M
                </span>
                <span className="font-serif text-[2.25rem] lg:text-[3rem] font-light">
                  {' '}
                  (46%)
                </span>
              </div>
              <p className="text-gray">can be conducted virtually</p>
            </div>
          </div>

          <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mb-2">
            The top 15 types of encounters (like routine checkup, medication
            refill, joint pain) account for 50% of face-to-face clinical office
            visits.
          </h4>
          <p className="text-gray mt-0">
            Armed with a smartphone or device, 13 of the top 15 encounters can
            be virtual visits.
            <br />
            The other two visits that remain face-to-face are Gynecological
            examinations and Well baby examinations.
          </p>
          <p className="text-gray">
            The table below documents whether an encounter can be virtual or
            face-to-face, how it would be conducted using a spectrum of tools,
            and what health information is necessary to collect.
          </p>

          <h3 className="header-md mt-12 mb-0">
            The Top 15 Encounters Breakdown
          </h3>
        </div>
      </section>

      {/* Encounters Table */}
      <section className="py-8">
        <div className="max-width content-padding mx-auto overflow-x-auto">
          <table className="w-full border-collapse text-sm min-w-[900px]">
            <thead>
              <tr className="text-gray border-b border-gray-200">
                <th className="text-left py-3 px-2 font-normal w-[20%]">
                  Reason for Visit
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Encounter &amp; Device
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Text
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Image
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Audio
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Video
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Vitals
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Labs
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Imaging
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  Other
                </th>
                <th className="text-center py-3 px-2 font-normal w-[8%]">
                  % of Visits
                </th>
              </tr>
            </thead>
            <tbody>
              {encounterData.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-3 px-2 text-left">{row.reason}</td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.device} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.text} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.image} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.audio} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.video} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.vitals} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.labs} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <EncounterCell value={row.imaging} />
                  </td>
                  <td className="py-3 px-2 text-center text-xs">
                    {row.other}
                  </td>
                  <td className="py-3 px-2 text-center font-semibold">
                    {row.percent}
                  </td>
                </tr>
              ))}
              {/* All other reasons row */}
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2 text-left">All other reasons</td>
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
                <td className="py-3 px-2 text-center font-semibold">50.2%</td>
              </tr>
            </tbody>
          </table>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-6 text-gray text-sm justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{SMARTPHONE}</span>
              <span>Virtual Visit</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{CLINIC}</span>
              <span>Face-to-face Visit</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{EKG}</span>
              <span>EKG Monitor</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{BP_CUFF}</span>
              <span>Blood Pressure Cuff</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{REQUIRED}</span>
              <span>Required</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">{OPTIONAL}</span>
              <span>Optional</span>
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare Delayed Section */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mb-4">
            &ldquo;Healthcare delayed is healthcare denied&rdquo;
            <sup>
              <a href="#references">2</a>
            </sup>
          </h4>
          <p className="text-gray">
            On average, it takes 24 days and 59.21 minutes for a patient to
            complete an office visit with their clinician.
          </p>

          {/* Time-to-diagnosis Table */}
          <table className="w-full text-gray text-sm my-6 border-collapse">
            <thead>
              <tr>
                <th
                  colSpan={2}
                  className="text-left py-2 px-3 font-semibold border-b border-gray-200"
                >
                  Time-to-diagnosis
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">Waiting for appointment</td>
                <td className="py-2 px-3 text-right">
                  24 days
                  <sup>
                    <a href="#references">3</a>
                  </sup>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">Waiting for clinician in office</td>
                <td className="py-2 px-3 text-right">
                  41 minutes
                  <sup>
                    <a href="#references">4</a>
                  </sup>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">Consultation with clinician</td>
                <td className="py-2 px-3 text-right">
                  18.21 minutes
                  <sup>
                    <a href="#references">4</a>
                  </sup>
                </td>
              </tr>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-2 px-3">Total</td>
                <td className="py-2 px-3 text-right">
                  24 days and 59.21 minutes
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-gray">
            Given the time investment for receiving care, it&apos;s no surprise
            that 15.6%
            <sup>
              <a href="#references">5</a>
            </sup>{' '}
            of patients avoid medical care due to time constraints.
          </p>

          <p className="text-gray">
            Physicians don&apos;t scale.
            <br />
            Patients and software scales.
          </p>

          <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mt-8 mb-4">
            Care must go virtual
          </h4>

          <ul className="list-disc list-outside pl-6 space-y-3 mb-6 text-gray">
            <li>
              For patients to have better access, cost, and outcomes.
            </li>
            <li>
              For clinicians to provide timely care for more people.
            </li>
            <li>For personalized medicine and services.</li>
          </ul>
        </div>
      </section>

      {/* Methodology (Blue Background) */}
      <section className="bg-secondary/10 py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <div id="methodology">
            <h2 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light text-center mb-6">
              Methodology
            </h2>
            <p className="text-gray">
              The Virtual Care diagram documents which clinical office visits
              could be virtual, how they could be conducted, and what health
              information is necessary. The diagram examines the top 15 reasons
              for clinical office visits from Table 11 in the{' '}
              <a
                href="https://web.archive.org/web/20190111060429/https://www.cdc.gov/nchs/data/ahcd/namcs_summary/2015_namcs_web_tables.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                National Ambulatory Medical Care Survey in 2015 (archived link)
              </a>
              .
            </p>
            <p className="text-gray">
              Our{' '}
              <a
                href="https://docs.google.com/spreadsheets/d/1pez_Wy8TnsMmifLU1xFrJ87b1SoH65OnwL6eQUiNy_A/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
              >
                working document of research
              </a>{' '}
              is available for review and comment.
            </p>

            <h4 className="font-sans text-base font-semibold leading-[1.1875rem] mb-2">
              v1 - 31.Jan.2019
            </h4>
            <p className="text-gray">
              The section below documents how we consolidated the 20 reasons for
              office visits down to 15.
            </p>
            <p className="text-gray">
              &lsquo;Routine checkup&rsquo; label is new and represents:
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
              <li>Progress visit, not otherwise specified</li>
              <li>General medical examination</li>
              <li>Counseling, not otherwise specified.</li>
            </ul>
            <p className="text-gray">
              &lsquo;Joint pain&rsquo; label is new and represents:
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
              <li>Knee symptoms</li>
              <li>Shoulder symptoms</li>
            </ul>
            <p className="text-gray">
              &lsquo;All other reasons&rsquo; label existed but now also
              represents:
            </p>
            <ul className="list-disc list-outside pl-6 space-y-1 mb-4 text-gray">
              <li>For other and unspecified test results</li>
              <li>Other special examination</li>
            </ul>
            <p className="text-gray">
              The section below documents how we calculated the &lsquo;Percent
              distribution&rsquo; due to the consolidation of reasons for office
              visits.
            </p>
            <p className="text-gray text-sm">
              Routine checkup (24.4% | 242,782,000) = Progress visit, not
              otherwise specified (14.1% | 140,842,000) + General medical
              examination (7.6% | 75,412,000) + Counseling, not otherwise
              specified (2.7% | 26,528,000)
            </p>
            <p className="text-gray text-sm">
              Joint pain (2.9% | 28,860,000) = Knee symptoms (1.6% |
              16,241,000) + Shoulder symptoms (1.3% | 12,619,000)
            </p>
            <p className="text-gray text-sm">
              All other reasons (50.2% | 498,058,000) = For other and
              unspecified test results (1.5% | 15,159,000) + Other special
              examination (0.9% | 9,092,000) + All other reasons (47.8% |
              473,807,000)
            </p>
            <p className="text-gray">
              The section below documents how we calculated the 46% (rounded
              down) and 459M (rounded up) of office visits that can be conducted
              virtually.
            </p>
            <p className="text-gray text-sm">
              Virtual office visits (46.4% | 458,798,000) = Routine checkup
              (24.5% | 242,782,000) + Medication, other and unspecified kinds
              (3.6% | 35,232,000) + Joint pain (2.9% | 28,860,000) +
              Postoperative visit (2.6% | 25,441,000) + Cough (2.1% |
              20,984,000) + Prenatal examination, routine (1.8% | 18,152,000) +
              Back pain (1.6% | 15,875,000) + Hypertension (1.6% | 15,762,000)
              + Stomach and abdominal pain, cramps, and spasms (1.5% |
              15,026,000) + Diabetes mellitus (1.3% | 12,432,000) + Skin rash,
              lesion (1.0% | 9,464,000) + Preoperative visit (1.0% | 9,443,000)
              + Symptoms referable to throat (0.9% | 9,346,000)
            </p>
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light text-center mb-6">
            Authors
          </h2>
          <Author
            name="Cameron Gettel"
            company="Resident Physician, Brown University"
            image={cloudfrontImage(
              '/images/about/headshot-cameron-gettel.jpg'
            )}
          >
            Cameron Gettel is an Emergency Medicine physician with interests in
            improving healthcare through evidence-based practices, quality
            improvement, and clinical research.
          </Author>
          <Author name="Eric Benoit" />

          <h3 className="font-serif text-[1.5rem] font-light text-center mt-8 mb-4">
            Contributors
          </h3>
          <Author name="Juhan Sonin" company="GoInvo, MIT" />

          <AboutGoInvo className="mt-12" />
          <p className="text-gray">
            <a href="/contact">Reach out with feedback.</a>
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
          <References items={references} />
        </div>
      </section>
    </div>
  )
}
