import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/patient-centered-consent/references.json'

export const metadata: Metadata = {
  title: 'A Guide to Patient-Centered Consent - GoInvo',
  description:
    'Guidelines for designing patient-centered, meaningful consent in healthcare using best practices for eConsent.',
}

export default function PatientCenteredConsentPage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/patient-centered-consent/consent-hero2.jpg'
        )}
      />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            A Guide to Patient-Centered Consent
          </h1>

          <p className="leading-relaxed mb-4">
            We spoke to leading experts in the field and borrowed best practices
            on the management of patient health information (PHI) to outline an
            open and ethical approach for designing patient-centered, meaningful
            consent. The wisdom and guidance of Jane Sarasohn-Kahn, Joyce Lee,
            Ernesto Ramirez, Gabriel Martinez-Santibañez, Charles Schick, and
            Woody MacDuffie helped immensely on this journey.
          </p>

          {/* Background */}
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center mt-16 mb-2">
            Background
          </h2>
          <h2 className="header-lg mb-2">
            What is Informed Consent?
          </h2>
          <p className="leading-relaxed mb-4">
            &quot;Informed consent: The process by which a patient learns about
            and understands the purpose, benefits, and potential risks of a
            medical or surgical intervention, including clinical trials, and then
            agrees to receive the treatment or participate in the trial
            <sup>
              <a href="#references">1</a>
            </sup>
            .&quot;
          </p>
          <p className="leading-relaxed mb-4">
            At a baseline, meaningful consent requires
            <sup>
              <a href="#references">2</a>
            </sup>
            :
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>informedness</li>
            <li>comprehension, AND</li>
            <li>voluntariness</li>
          </ul>
          <p className="leading-relaxed mb-4">
            Consent materials should cover both <strong>benefits</strong> and{' '}
            <strong>risks</strong> of participation
            <sup>
              <a href="#references">2</a>
            </sup>
            .
          </p>
          <p className="leading-relaxed mb-4">
            When patient health data is involved, meaningful consent should also
            effectively communicate
            <sup>
              <a href="#references">3</a>
            </sup>
            :
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>how patient data will be used,</li>
            <li>who will have access,</li>
            <li>how it will be protected, and</li>
            <li>what rights the patient has over the shared data.</li>
          </ul>

          {/* The gap in comprehension */}
          <h2 className="font-serif text-2xl mt-16 mb-2">
            The gap in comprehension
          </h2>
          <p className="leading-relaxed mb-4">
            Informed consent is especially important in medicine and health
            related services. Patients need to adequately weigh the pros and cons
            of their involvement to make the best choice for their health.
            Unfortunately, three issues with traditional consent can prevent
            patients from fully understanding what they are agreeing to.
          </p>
          <ol className="list-decimal pl-6 mb-4 space-y-3">
            <li>
              <strong>
                Consent documents are usually filled with complex legal language
                <sup>
                  <a href="#references">4</a>
                </sup>
                .
              </strong>
            </li>
            <li>
              <strong>
                The consent process is usually rushed
                <sup>
                  <a href="#references">4</a>
                </sup>
                .
              </strong>
            </li>
            <li>
              <strong>
                It has become the norm to accept documents without fully
                understanding them.
              </strong>{' '}
              The documents themselves are usually not designed with a focused
              effort to promote patient understanding
              <sup>
                <a href="#references">4</a>
              </sup>
              . One group of researchers found that over 90% of adults agreed to
              a terms of services and privacy policy that included multiple
              &apos;gotcha clauses&apos; including &quot;providing a first-born
              child as payment for SNS access
              <sup>
                <a href="#references">5</a>
              </sup>
              &quot;.
            </li>
            <li>
              <strong>Comprehension is rarely measured.</strong> In other words,
              most consent processes don&apos;t track what patients understand.
            </li>
          </ol>

          {/* An opportunity for re-design */}
          <h2 className="font-serif text-2xl mt-16 mb-2">
            An opportunity for re-design
          </h2>
          <p className="leading-relaxed mb-4">
            Pew Research Center found that 77% of Americans have smartphones as
            of 2018
            <sup>
              <a href="#references">6</a>
            </sup>
            . Despite this, many patient consent processes are still filled out
            on paper. From a survey conducted in 2017 with 146 respondents from
            top biotech, pharma, CRO, and IRB organizations, 53% reported their
            organizations still didn&apos;t use electronic consent
            <sup>
              <a href="#references">7</a>
            </sup>
            .
          </p>

          <p className="leading-relaxed mb-4">
            Paper consent often requires extra steps of downloading PDFs,
            printing, signing in separate software, and then scanning, mailing,
            or emailing it in. A mobile consent process allows patients to work
            through consent whenever and wherever they want
            <sup>
              <a href="#references">2</a>
            </sup>
            . It allows them to complete the consent process in their own time,
            supports the patients&apos; future reference of the agreement, and
            can allow patients to manage or revoke their consent as the terms
            allow.
          </p>

          <p className="leading-relaxed mb-4">
            As researchers, healthcare providers, and healthcare companies shift
            to eConsent, a few researchers have explored best practices for their
            design. Groups, including Sage BioNetworks and AllofUs, are pushing
            the needle away from lengthy, complex terms and conditions and
            towards truly meaningful consent.
          </p>

          <p className="leading-relaxed mb-8">
            We hope that this list of guidelines to improve patient comprehension
            can help to inform eConsent design.
          </p>

          <Divider />

          {/* 9 Guidelines */}
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center mt-16">
            9 Guidelines for eConsent Design
          </h2>

          {/* 1 */}
          <h4 className="header-md mt-16 mb-2">
            1. Meet Accessibility Standards
          </h4>
          <p className="leading-relaxed mb-4">
            At the most basic level, the consent process must meet the needs of
            those with disabilities (see{' '}
            <a
              href="https://www.w3.org/TR/WCAG21/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary"
            >
              WCAG2.1 guidelines
            </a>
            ).
          </p>

          {/* 2 */}
          <h4 className="header-md mt-16 mb-2">
            2. Make Consent Front and Center
          </h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-resilient-proj.jpg'
            )}
            alt="Resilience Project consent process"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            The gateway to involvement in the Resilience Project is a 10 minute
            screening + consent process (
            <a
              href="https://www.goinvo.com/work/mount-sinai-consent"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary"
            >
              Goinvo designs with Mount Sinai and Sage Bionetworks from 2015
            </a>
            ).
          </p>
          <p className="leading-relaxed mb-4">
            Beyond this, we must remove other barriers to access, such as
            burying consent documents under numerous links or only supporting
            paper consent.
          </p>

          {/* 3 */}
          <h4 className="header-md mt-16 mb-2">
            3. Use Plain, Concise Language
          </h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-pdua.jpg'
            )}
            alt="Patient Health Data Manager consent design"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            These initial designs for (
            <a
              href="https://github.com/patient-data-manager/pdm-designs/blob/master/pdm_data_use_agreement_storyboard.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary"
            >
              Patient Health Data Manager
            </a>{' '}
            (an opensource project by MITRE and GoInvo) use familiar language and
            a non-intimidating format.
          </p>
          <p className="leading-relaxed mb-4">
            Legalese can sound like a foreign language to patients. Plain,
            concise language can be read quickly and understood, making it more
            accessible
            <sup>
              <a href="#references">8</a>
            </sup>
            . Plain language should be at or below a 5th grade reading level in
            order to support the comprehension of those with low literacy
            <sup>
              <a href="#references">9</a>
            </sup>
            .
          </p>

          {/* 4 */}
          <h4 className="header-md mt-16 mb-2">4. Set Time Expectations</h4>
          <p className="leading-relaxed mb-4">
            Consent can feel like an endless stream of content. Cue patients in
            on how long it will take them through a comment at the start, a
            progress bar, or other. This allows patients to evaluate whether they
            currently have enough time to complete the consent process and can
            help prevent patients from rushing to the end.
          </p>

          {/* 5 */}
          <h4 className="header-md mt-16 mb-2">
            5. Organize Content into Bite-sized Sections
          </h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-wilbanks-informed-consent.jpg'
            )}
            alt="Table 1 from Developing a transparent, participant-navigated electronic informed consent"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            Above is Table 1 from &quot;
            <a
              href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2769129"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary"
            >
              Developing a transparent, participant-navigated electronic informed
              consent for mobile-mediated research
            </a>
            ,&quot; which illustrates how sections can be paired down to their
            essence and organized by topic
            <sup>
              <a href="#references">10</a>
            </sup>
            .
          </p>
          <p className="leading-relaxed mb-4">
            In a &quot;novel multi-media approach to addressing transparency and
            comprehension within electronic informed consent,&quot; Sage
            Bionetworks suggest focussing on the essential and organizing content
            deliberately
            <sup>
              <a href="#references">10</a>
            </sup>
            . Breaking the consent document into bite-sized, topic-focused chunks
            can help the participant better grasp the sections. Keeping content
            succinct can help prevent the reader from skimming.
          </p>

          {/* 6 */}
          <h4 className="header-md mt-16 mb-2">6. Use Visual Storytelling</h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-allofus-consent.jpg'
            )}
            alt="AllofUs consent process screens"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            Above are select screens from the{' '}
            <a
              href="https://participant.joinallofus.org/#/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary"
            >
              AllofUs consent process
            </a>
            , which uses animated and narrated videos to inform the patient.
          </p>
          <p className="leading-relaxed mb-4">
            Humans are visual and aural communicators. Adding straight forward
            icons, illustrations, animations, or even videos can help to engage
            the reader. Visuals serve as a memorable indicator of topic that can
            help bolster understanding
            <sup>
              <a href="#references">10</a>
            </sup>
            . One research group found that using friendly comic strip visuals
            improved &quot;patient comprehension, anxiety, and satisfaction
            <sup>
              <a href="#references">11</a>
            </sup>
            .&quot;
          </p>

          {/* 7 */}
          <h4 className="header-md mt-16 mb-2">7. Provide Real-Time Help</h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-mpower.jpg'
            )}
            alt="mPower consent process with Need Help button"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            The{' '}
            <a
              href="https://parkinsonmpower.org/study/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:text-primary"
            >
              mPower consent process
            </a>{' '}
            features a &quot;Need Help?&quot; button throughout the entire
            consent process. It provides the patient with a thorough FAQ section
            as well as a toll free number for additional support.
          </p>
          <p className="leading-relaxed mb-4">
            Supporting comprehension takes more than just clear wording and
            accessibility. It means providing help and resources to patients when
            and where they need it. Resources and support can take many forms
            such as a &apos;Learn More&apos; or &apos;Help&apos; button, a
            support chat, a toll-free phone number with a helpful human resource
            on the other end, and more
            <sup>
              <a href="#references">10</a>
            </sup>
            .
          </p>

          {/* 8 */}
          <h4 className="header-md mt-16 mb-2">
            8. Use &quot;Repeat Back&quot; to Engage the Brain
          </h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-mpower-quiz.jpg'
            )}
            alt="mPower consent quiz"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            After reviewing the consent documents but before signing, the mPower
            consent process gives the patient a short 5 question quiz.
          </p>
          <p className="leading-relaxed mb-4">
            The National Quality Forum developed an approach called Safe Practice
            10 with in-person patient consent to improve comprehension. Part of
            this practice includes a &quot;teach back&quot; or &quot;repeat
            back&quot; technique where the patient is asked to recall primary
            details from consent that has just been discussed with them. Multiple
            studies have found that having the patient recall the information
            improves comprehension
            <sup>
              <a href="#references">12</a>
            </sup>
            . Similarly with eConsent, a short quiz can help engage the
            patient&apos;s mind in a new way and help them retain the major
            takeaways of the agreement.
          </p>

          {/* 9 */}
          <h4 className="header-md mt-16 mb-2">
            Bonus: 9. Keep Measuring + Iterating!
          </h4>
          <Image
            src={cloudfrontImage(
              '/images/features/patient-centered-consent/consent-resilient-expression.jpg'
            )}
            alt="Concept for adjusting content based on facial expressions"
            width={1200}
            height={800}
            className="w-full h-auto"
          />
          <p className="text-sm text-gray mt-1 mb-4">
            A concept explored to adjust content and interaction in real-time
            based on facial expressions (from our Resilience Project designs).
          </p>
          <p className="leading-relaxed mb-4">
            There is always room for improvement in consent design. Before
            releasing the consent process, set lofty goals for your designs and
            test them with representative users. Are users able to answer
            questions on the primary consent take-aways after going through the
            process? After releasing your consent process, are there systems in
            place to continue receiving feedback and measuring comprehension?
          </p>

          {/* Recap */}
          <h2 className="font-serif text-2xl mt-16 mb-2">Recap</h2>
          <ol className="list-decimal pl-6 mb-8 space-y-1">
            <li>Meet Accessibility Standards</li>
            <li>Make Consent Front and Center</li>
            <li>Use Plain, Concise Language</li>
            <li>Set Time Expectations</li>
            <li>Organize Content into Bite-sized Sections</li>
            <li>Use Visual Storytelling</li>
            <li>Provide Real-Time Help</li>
            <li>Use &quot;Repeat Back&quot; to Engage the Brain</li>
            <li>Bonus: Keep Measuring + iterating!</li>
          </ol>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-100 py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <NewsletterForm />
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author name="Sharon Lee" />
          <Author name="Jen Patel" />

          <h3 className="header-md">Contributors</h3>
          <Author name="Parsuree Vatanasirisuk" />
          <Author name="Juhan Sonin" />

          <Divider />

          <References items={refs} />
        </div>
      </section>
    </div>
  )
}
