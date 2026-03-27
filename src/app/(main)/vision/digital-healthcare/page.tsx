import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Digital Healthcare: 2016 and Beyond',
  description:
    'Your business will be obsolete if you aren\'t engaging in these 8 things next year. From medication adherence to virtual helpers, explore the future of digital health.',
}

export default function DigitalHealthcarePage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_cover_transp.gif')} />

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Digital Healthcare: 2016 and Beyond
          </h1>
          <h4 className="font-serif text-base font-light mb-8">
            Your business will be obsolete if you aren&apos;t engaging in these 8 things next year.
          </h4>

          {/* Table of Contents */}
          <div className="flex flex-wrap gap-4 mb-12 text-sm">
            <a href="#medication" className="text-primary hover:underline">1. Medication</a>
            <a href="#talking-to-tech" className="text-primary hover:underline">2. Talking to Tech</a>
            <a href="#prediction" className="text-primary hover:underline">3. Prediction</a>
            <a href="#detection" className="text-primary hover:underline">4. Detection</a>
            <a href="#care-planning" className="text-primary hover:underline">5. Care Planning</a>
            <a href="#computable-records" className="text-primary hover:underline">6. Computable Records</a>
            <a href="#engagement" className="text-primary hover:underline">7. Engagement</a>
            <a href="#virtual-helpers" className="text-primary hover:underline">8. Virtual Helpers</a>
          </div>
        </div>
      </section>

      {/* Section 1: Medication Adherence */}
      <section id="medication" className="py-12">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_1.jpg')}
            alt="Medication adherence illustration showing sensor technology and digital tracking"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            1. Medication Adherence
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            ...gets a boost from sensor tech
          </h4>
          <p className="leading-relaxed mb-4">
            Solving the complex problem of medication adherence could have a huge impact on lowering cost of care; it&apos;s no surprise that millions of dollars have already been invested in digital health software to guide the process. In 2016, expect the basics of digital adherence &mdash; self-reporting, tracking refills and chronic disease outcomes, etc. &mdash; will receive a boost from the use of sensors to collect confirming data, whether it&apos;s via breath analysis, urine sampling, or another non-invasive method.
          </p>
        </div>
      </section>

      {/* Section 2: Talking to Technology */}
      <section id="talking-to-tech" className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_2_v02.jpg')}
            alt="Conversational interfaces illustration showing voice recognition and AI interaction"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            2. Talking to Technology
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            Conversational interfaces go mainstream.
          </h4>
          <p className="leading-relaxed mb-4">
            The conversational user interface &mdash; driven by advances in voice recognition technology in conjunction with artificial intelligence, capable of understanding the content and context of patient concerns &mdash; has already found its way into digital health software systems. Whether incorporated into mHealth apps for motivating health and fitness engagement, as part of the digital prescription adherence user experience, or incorporated into interactive systems for outpatient education, expect the conversational user interface to gain traction and become mainstream in 2016.
          </p>
        </div>
      </section>

      {/* Section 3: Predicting Health */}
      <section id="prediction" className="py-12">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_3.jpg')}
            alt="Health prediction analytics illustration showing patient scoring and data visualization"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            3. Predicting Health
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            Analytics debut for patients and clinicians, not just payers.
          </h4>
          <p className="leading-relaxed mb-4">
            While payers have had patient health analytics software for a few years already, in 2016, we can expect patient scoring and health analysis to make its way into the hands of the clinicians and patients. Software tools for visualizing a patient&apos;s complete range of health metrics, along with clinically validated algorithms for scoring a holistic view of patient health will make their debut. These will provide clinicians with at-a-glance analytics of a patient&apos;s overall health, allowing doctors to spot patterns and red flags by comparing a person&apos;s health data against targeted health ranges, based on factors like age and gender.
          </p>
        </div>
      </section>

      {/* Section 4: Disease Detection */}
      <section id="detection" className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_4.jpg')}
            alt="Disease detection illustration showing smartphone as a health diagnostic tool"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            4. Disease Detection
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            ...on your smart phone
          </h4>
          <p className="leading-relaxed mb-4">
            Imagine your smart phone as a non-invasive health sniffer, a feat of which it is already technically capable. It can view you, via its cameras; listen to you via its microphone; and even pick up your gait, via its accelerometer. Such information can ultimately be used to help diagnose such diseases as depression and Parkinson&apos;s. The current confluence of sensor tech, data analytics maturity, hardware durability, miniaturization, and industrial evolution has created a perfect storm for capturing biologic metrics and determining trends. In 2016, we&apos;ll have a good first cut at a disease detection model that is personally meaningful and changes behavior.
          </p>
        </div>
      </section>

      {/* Section 5: Digital Care Planning */}
      <section id="care-planning" className="py-12">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_5.jpg')}
            alt="Digital care planning illustration showing patient-physician collaboration"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            5. Digital Care Planning
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            It&apos;s how to get better patient outcomes in a tech driven world.
          </h4>
          <p className="leading-relaxed mb-4">
            Digital care planning will be a key factor driving better health outcomes and prices. The personal care plan will serve as a contract between patient and physician to commit to improving and maintaining patient health. The care plan will include patient / physician goals and the rationale for those goals, as well as a plan for case management and rehabilitation, psychological health, exercise, nutrition, birth / sexual health, and advance care / death.
          </p>
        </div>
      </section>

      {/* Section 6: Computable Records */}
      <section id="computable-records" className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_6.jpg')}
            alt="Computable medical records illustration showing next-generation EHR concepts"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            6. Computable Records
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            The next generation of the EMR conversation.
          </h4>
          <p className="leading-relaxed mb-4">
            In 2016 and onward, computable medical records will fuel the next generation of EHRs, as the quest for interoperable, portable, and comprehensive health data continues. Computable medical records, readable by both human and machine, will house a patient&apos;s entire record from conception to death. Importantly, such records will declare their fidelity level &mdash; their degree of completeness and accuracy &mdash; so that users can not only identify what data is there, but also what&apos;s missing.
          </p>
          <p className="leading-relaxed mb-4">
            The computable medical record will be unique, enabling users to find the right record for the right person; will support a health status scoring system; and will ideally be open source to drive adoption across software vendors, hospital systems, and government.
          </p>
          <p className="leading-relaxed mb-4">
            FHIR (HL7&apos;s latest attempt at a health data exchange) is a step in the right direction. The Argonauts are working on a handful of profiles and core data services, according to John Halamka, CIO of Beth Israel Deaconess Hospital. They&apos;re implementing the API as recommended by the{' '}
            <a
              href="http://healthit.gov/sites/default/files/ptp13-700hhs_white.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MITRE JASON report
            </a>
            . While a far cry from a &ldquo;computable medical record&rdquo;, it&apos;s a hopeful signal flare for U.S. progress in digital healthcare.
          </p>
          <p className="text-sm text-gray mb-4">
            Data and images taken from{' '}
            <a
              href="http://projectcrucible.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              projectcrucible.org
            </a>
          </p>
        </div>
      </section>

      {/* Section 7: Patient Engagement */}
      <section id="engagement" className="py-12">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_7.jpg')}
            alt="Patient engagement illustration showing self-care and digital health tools"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            7. Patient Engagement
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            Most care is self care.
          </h4>
          <p className="leading-relaxed mb-4">
            The startling truth is that <strong>99% of healthcare is self care</strong> and that the actions of individuals rather than institutions are key to improving our healthcare system. Patients who are actively engaged in the management of their own healthcare increase the likelihood of having improved outcomes, reduced costs, and a better overall experience. In 2016, we can expect to see a rise in digital systems with a deep focus on patient engagement and interventions. These could include software like digital coaching and coordinated outpatient education &mdash; well-architected services that direct the right information to patients outside the clinical environment, especially for mental health.
          </p>
        </div>
      </section>

      {/* Section 8: Virtual Helpers */}
      <section id="virtual-helpers" className="py-12 bg-gray-lightest">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/digital-healthcare/digital_health_8.jpg')}
            alt="Virtual helpers illustration showing AI health companions and digital assistants"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-2">
            8. Virtual Helpers
          </h2>
          <h4 className="font-serif text-base font-light text-gray mb-4">
            The digital health companion in your pocket: Siri meets Dr. Watson.
          </h4>
          <p className="leading-relaxed mb-4">
            Virtual helpers will leverage human-modeled artificial intelligence to provide both health coaching and resources to motivate patients. Such mHealth companions will assist people in adhering to their care plans, their prescription regimens, and even outpatient treatment for complex, chronic conditions. These helpers might expand past the 2D mobile platform, seeping into other more physical services such as Echo, Nest, and Jibo.
          </p>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Authors
          </h2>

          <Author name="Beckett Rucker" company="GoInvo">
            Contributing Author &amp; Illustrator
          </Author>
          <Author name="Jonathan Follett" company="GoInvo" />
          <Author name="Courtney McGorrill" company="GoInvo">
            Web Developer &amp; Designer
          </Author>
          <Author name="Juhan Sonin" company="GoInvo, MIT" />
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
