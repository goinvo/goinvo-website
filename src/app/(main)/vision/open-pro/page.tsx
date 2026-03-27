import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'openPRO: Your health. Your voice.',
  description:
    "The patient's unique and indispensible voice is too often lost in the complexity of modern healthcare. Open Source Patient Reported Outcome (openPRO) is promoting ways to help her be heard!",
}

export default function OpenProPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/open-pro/open-pro-hero-v2.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            openPRO: Your health. Your voice.
          </h1>
          <h4 className="header-md">
            Open source services for patients to capture and report their
            health outcomes.
          </h4>

          <p className="text-gray leading-relaxed mb-4">
            True patient-focused care requires listening to the VOICE of the
            patient herself. As she travels from health to sickness and
            hopefully back to health again, we must record and value her own
            words as she describes her pains, her values, and her needs.
          </p>

          <Divider />

          <h2 className="header-lg mt-8 mb-4 text-center">
            What is PRO and why is it important?
          </h2>

          <p className="text-gray leading-relaxed mb-4">
            <em>Patient-Reported Outcome (PRO): </em>
            Any report on the status of a patient&apos;s health coming directly
            from the patient without any interpretation or interference.
          </p>

          <h4 className="header-md">
            The Patient-Reported Outcome is the platform for the patient to
            be heard. Why must we listen?
          </h4>

          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed text-gray">
            <li>
              Our health system is moving toward focus on quality of care
              from quantity of care. Quality is measured as a combination of
              lives saved, readmission, medical outcomes, as well as quality
              of life measures such as pain and mobility. However, the very
              words of the patient that define quality in the patient&apos;s
              interest are too often ignored. We must center our care and
              attention on the patient&apos;s needs, values, and experiences.
            </li>
            <li>
              A curious thing about pain is how easily we forget it after
              the fact. When, where, how much... these are all important
              details the doctor wants to know, and we find ourselves
              struggling to recall, filling in the gaps with maybe-truths.
              It certainly would be helpful to record pain{' '}
              <em>when it happens, where it happens</em>. At the doctor&apos;s
              office, that record should already be in the doctor&apos;s hand to
              be used that much more easily to diagnose and treat the
              patient.
            </li>
          </ul>

          <h4 className="font-serif text-lg mb-6">
            Your Patient Reported Outcome is a direct connection between
            you, the source of critical medical data, and the decisions
            regarding your care and the future of the health system.
          </h4>

          {/* PRO Enables icons section */}
          <div className="mb-8">
            <h4 className="header-md">The PRO enables...</h4>

            <div className="my-6">
              <Image
                src={cloudfrontImage('/images/vision/open-pro/communication.svg')}
                alt="Icon of chat bubbles showing communication"
                width={80}
                height={80}
                className="mb-3"
              />
              <h4 className="header-md">Improved communication</h4>
              <p className="text-gray leading-relaxed">
                The patient can initiate communication of relevant medical
                data with the doctor to send outcomes, align priorities, and
                arrange the care they need.
              </p>
            </div>

            <div className="my-6">
              <Image
                src={cloudfrontImage('/images/vision/open-pro/patient.svg')}
                alt="Icon showing patient and doctor conversing"
                width={80}
                height={80}
                className="mb-3"
              />
              <h4 className="header-md">
                Less time on data entry and better time with the patient
              </h4>
              <p className="text-gray leading-relaxed">
                The patient records her own experiences and pushes it to the
                health record. Her doctor can then spend more face-to-face
                time discussing her care, rather than conducting
                time-consuming interviews and performing data entry.
              </p>
            </div>

            <div className="my-6">
              <Image
                src={cloudfrontImage('/images/vision/open-pro/treatment.svg')}
                alt="Icon showing healthcare with a line graph trending upwards"
                width={80}
                height={80}
                className="mb-3"
              />
              <h4 className="header-md">Improved quality of treatment</h4>
              <p className="text-gray leading-relaxed">
                PRO tools allow the patient to report clinically relevant
                information at the point of pain, when it is most reliable, to
                inform the most appropriate treatments. Over the course of
                treatment, the PRO promotes accurate recordings of outcomes to
                advance changes when needed.
              </p>
            </div>

            <div className="my-6">
              <Image
                src={cloudfrontImage('/images/vision/open-pro/personalized-care.svg')}
                alt="Icon showing a patient moving customization sliders"
                width={80}
                height={80}
                className="mb-3"
              />
              <h4 className="header-md">Personalized care</h4>
              <p className="text-gray leading-relaxed">
                The patient is able choose treatments, personalized to their
                needs, by drawing on the past successes, experiences, and
                self-reported outcomes of many similar patients who came
                before them.
              </p>
            </div>

            <div className="my-6">
              <Image
                src={cloudfrontImage('/images/vision/open-pro/healthcare.svg')}
                alt="Icon of the world surrounded by a stethoscope"
                width={80}
                height={80}
                className="mb-3"
              />
              <h4 className="header-md">Improved healthcare for all</h4>
              <p className="text-gray leading-relaxed">
                The patient provides invaluable data on treatment outcomes.
                The data is accurate, timely, and multi-dimensional. These
                qualities of data are possible only with many patients&apos;
                voices.
              </p>
            </div>
          </div>

          <Divider />

          <h2 className="header-lg mt-8 mb-4 text-center">The current landscape</h2>
          <p className="text-gray leading-relaxed mb-4">
            <em>Patient portals</em> offer communication between the patient
            and care team. Some EHR vendors offer the ability to send PRO
            questionnaires to patients, and few (e.g. Partners HealthCare)
            support structured data collection back into the EHR from those
            questionnaires. However, patient portals have some severe
            limitations and shortcomings which lead to limited use. Portals are only available to one in
            two patients, and of the half with access, half again don&apos;t use
            them. In total, 25% of all patients use portals and under 15% of
            all patients use them to communicate with their care team.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            <em>Patient-reported outcome measures (PROMs)</em> are
            instruments developed to measure a particular condition or
            outcome of a patient. They take the form of questionnaires,
            administered on paper or electronically (ePROMs), consisting of
            about 10-15 scale based questions. The instruments are heavily
            vetted and studied and accurately collect targeted data and associate that data
            with clinically relevant measures via a single score. More
            sophisticated electronic versions use an adaptive format that
            selects questions in response to answers.
          </p>

          <h4 className="header-md">Progress</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>Application to patient screening and monitoring.</li>
            <li>Cohort-specific treatment studies and drug trials.</li>
            <li>
              Queries of populations to identify unmet needs in
              pharmaceutical development and to align care with the needs of
              the local patient community.
            </li>
            <li>
              A growing community of initiatives such as{' '}
              <a
                href="http://www.esymcancermoonshot.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                SIMPRO
              </a>{' '}
              and strategic workshops such as the FasterCures 2017 workshop.
            </li>
            <li>
              <a
                href="http://www.healthmeasures.net/explore-measurement-systems/promis"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                PROMIS
              </a>
              &reg; (Patient-Reported Outcomes Measurement Information System)
              is a set of person-centered measures that evaluate and monitor
              physical, mental, and social health. It includes a wide range
              of measures that have been vetted and studied. The project
              also supplies administration platforms.
            </li>
          </ul>

          <h4 className="header-md">Limitations</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Limited portal integration of PROMs, with few exceptions.
            </li>
            <li>
              Siloed stand-alone PRO platforms (LifeData, WellBe, OutcomeMD,
              Ortech) are poorly connected to the patient&apos;s other health
              data.
            </li>
            <li>
              No data standards, although FHIR PRO promises to ease the
              implementation and integration into EHRs.
            </li>
          </ul>

          <h4 className="header-md">Challenges</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Lack of annotated libraries. Difficult to identify measures
              appropriate for a particular patient.
            </li>
            <li>
              Patient wariness. Without seeing personal advantages and
              becoming invested, a patient can be wary of sharing more
              information via forms.
            </li>
            <li>
              Patient weariness. Patients grow tired of filling out forms.
            </li>
            <li>
              Lack of resources to administer electronic PROs. Neil W.
              Wagle, at Brigham and Women&apos;s Hospital in Boston:
              <blockquote className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray">
                &ldquo;The platform must also be integrated into the electronic
                health record (EHR) system so that results flow into the
                point of care in real time in order to be actionable. And it
                must work nearly perfectly because neither patients nor
                providers have the patience for glitches.&rdquo;
              </blockquote>
            </li>
          </ul>

          <Divider />

          <h2 className="header-lg mt-8 mb-4 text-center">Our solution: openPRO</h2>

          <h4 className="header-md text-center">
            An open source project capturing the patient&apos;s voice,
            beautifully and simply.
          </h4>

          <Image
            src={cloudfrontImage('/images/features/open-pro/main-graphic.jpg')}
            alt="openPRO main graphic showing the platform concept"
            width={1200}
            height={800}
            className="w-full h-auto my-8"
          />

          <div className="flex justify-center my-8">
            <a
              href="https://github.com/goinvo/openPRO"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-current text-secondary hover:bg-secondary hover:text-white transition-colors"
            >
              Contribute on GitHub
            </a>
          </div>

          <p className="text-gray leading-relaxed mb-4">
            We&apos;ve conceived several projects seeking to overcome these
            challenges and push PROs to realize their potential.
          </p>

          <ol className="list-decimal list-outside pl-6 space-y-1 mb-8 leading-relaxed text-gray">
            <li>VoicePROM</li>
            <li>Symptom Reporter</li>
            <li>ROS Reporter</li>
            <li>openPRO Platform</li>
          </ol>

          <p className="text-gray leading-relaxed mb-4">
            The benefits of being open source are three-fold. First, the
            extended community provides verification, support, and feedback,
            improving the quality and relevance of the process and product.
            Second, the mature product will provide services as well as an
            open source repository of resources, designs, and code for other
            developers and teams to utilize. Third, the open process has a
            positive impact on medicine by building community and interest
            in improving the state of PROs.
          </p>

          {/* 1. voicePROM */}
          <h3 className="header-md mt-8 mb-4">1. voicePROM</h3>
          <p className="text-gray leading-relaxed mb-4">
            <a
              href="https://github.com/goinvo/openPRO/tree/master/voicePROM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              VoicePROM
            </a>{' '}
            is a voice-first platform that collects short, scheduled, and
            structured data from the patient with convenient low-burden
            methods. The collected elements are drawn from a pre-built set
            of care-plan adherence measures and standard questionnaire
            formats.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Voice-first solutions in the medical space are making slow but
            focused progress. Much of this progress is in the clinical
            documentation realm, allowing clinicians to not only dictate
            medical notes, but capture the structure data needed in the EHRs
            by voice (Nuance, Winscribe, and more). These however are
            confined to the clinic and do not help patients in their
            home-care and care plan adherence. On the other hand, there are
            Alexa Skills available that can help with medication reminders
            or with tracking symptoms, but they do not provide reporting and
            they are awkward to configure and use. To our knowledge, there
            are no publically available voice interfaces for collecting
            PROMs or questionnaires.
          </p>

          <Image
            src={cloudfrontImage('/images/features/open-pro/voice-pro.jpg')}
            alt="voicePROM concept showing voice-first patient reporting"
            width={800}
            height={600}
            className="w-full max-w-xl mx-auto h-auto my-8"
          />

          <h4 className="header-md">Feature roadmap</h4>
          <ol className="list-decimal list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Establish and demonstrate voice capture for a fixed set of
              requests: medication adherence, sleep, daily Quality of Life
              (QoL) check-in.
            </li>
            <li>Simple user management and database.</li>
            <li>Scheduler and reminder system.</li>
            <li>
              Multimodal input and output (voice, small display, button,
              etc).
            </li>
            <li>
              Web configuration tool to customize reminders and create
              periodic reports.
            </li>
            <li>Deliver custom and standard questionnaires to patient.</li>
            <li>Integration into other openPRO products.</li>
            <li>Reports are delivered as FHIR bundles.</li>
          </ol>

          <h4 className="header-md">Current state: gestating</h4>
          <p className="text-gray leading-relaxed mb-4">
            Using the Alexa and AWS services from the Amazon ecosystem,
            we&apos;ve developed a simple smart speaker application. The patient
            reports medication adherence and sleep, and the platform records
            that data. We are currently working on a scheduling and reminder
            system to ensure daily reporting and to alert the user if a
            questionnaire is waiting completion.
          </p>

          <h4 className="header-md mb-0">
            Estimated Level of Effort
          </h4>
          <p className="text-gray leading-relaxed mb-0">
            Minimal Prototype:{' '}
            <span className="text-black">8 weeks, 1.0FTE</span>
          </p>
          <p className="text-gray leading-relaxed mt-0">
            Design and Development v1.0:{' '}
            <span className="text-black">8 weeks, 1.0FTE</span>
          </p>

          {/* 2. Symptom Reporter */}
          <h3 className="header-md mt-8 mb-4">2. Symptom Reporter</h3>
          <p className="text-gray leading-relaxed mb-4">
            <a
              href="https://github.com/goinvo/openPRO/tree/master/SymptomReporter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              The Symptom Reporter
            </a>{' '}
            helps a patient distill and clarify subjective symptoms and
            experiences into structured data that can be conveniently and
            consistently shared with clinicians in person, via email/text,
            or the Electronic Medical Record. Foreign language support will
            help patients prepare a report in English before an appointment
            so they can be more comfortable and confident in communicating
            their experiences and needs.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Similar products exist, but there are important differences.
            There are many online symptom checking tools (WebMD.com, Isabel
            symptomchecker.isabelhealthcare.com) that focus on providing a
            home diagnosis. Symptom trackers are popular mobile apps that
            allow a patient to keep tabs on a chronic or recurring symptom
            over time. Neither of these types of application focuses on
            aiding communication or creating a detailed and medically
            relevant report at the point of pain. The most similar app
            available is AHRQuestionBuilder, developed by U.S. Department of
            Health and Human Services. Some patient portals integrate a
            symptom checker (Epic - Mayo Clinic&apos;s MyChart), but again, it
            does not provide any way to begin a conversation with a
            clinician regarding those symptoms. Hopefully, an open source
            tool such as openPRO - Symptom Reporter would help encourage
            such integration.
          </p>

          <Image
            src={cloudfrontImage('/images/features/open-pro/symptom.jpg')}
            alt="Symptom Reporter interface concept"
            width={800}
            height={600}
            className="w-full max-w-xl mx-auto h-auto my-8"
          />

          <h4 className="header-md">Goals</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>Improve communication between the patient and care team.</li>
            <li>
              Improve fidelity of information by recording events closer to
              the relevant time and place (point of pain).
            </li>
            <li>
              Lower stress on the patient by improving the fidelity of data
              during transfers of care.
            </li>
            <li>Provide foreign language support within the interface.</li>
          </ul>

          <h4 className="header-md">Components</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Web interface to help identify symptoms and collect relevant
              information: onset, intensity, location, etc.
            </li>
            <li>
              Receipt for the patient in both plain English and medical
              language for sharing, easy reference, printing, etc.
            </li>
            <li>
              FHIR resources enumerating the captured conditions using
              standard coding schema. This is a first step in importing the
              data into a health record.
            </li>
          </ul>

          <h4 className="header-md mb-0">
            Estimated Level of Effort
          </h4>
          <p className="text-gray leading-relaxed mb-0">
            Design: <span className="text-black">4 weeks, 1.0FTE</span>
          </p>
          <p className="text-gray leading-relaxed mt-0">
            Development v1.0:{' '}
            <span className="text-black">6 weeks, 1.0FTE</span>
          </p>

          {/* 3. ROS Reporter */}
          <h3 className="header-md mt-8 mb-4">3. ROS Reporter</h3>
          <p className="text-gray leading-relaxed mb-4">
            A review of systems (ROS) is a gathering of targeted medical
            information such as symptoms from a patient. Reimbursement
            models push doctors to ask more and more particular sets of
            questions, consuming precious in-encounter time. In the interest
            of time, issues that are medically relevant or important to the
            patient may not be addressed, creating an incomplete picture from which the doctor assesses
            and plans treatment.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            The{' '}
            <a
              href="https://github.com/goinvo/openPRO/tree/master/ROSReporter"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ROS Reporter
            </a>{' '}
            is an interactive web application will allow the patient to
            submit responses in privacy and comfort outside the encounter,
            either at home before a visit or while waiting at the office.
            Some clinics and offices distribute ROS forms, either by paper
            or electronically to patients when they arrive at reception or
            by a nurse. These questionnaires have several deficiencies:
          </p>

          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              They feel irrelevant. The patient answers in the negative for
              row after row of questions that are not related to the purpose
              of the visit. The forms are one-size-fits all.
            </li>
            <li>
              They are often tedious and inefficient. Paper questionnaires
              are often poorly designed and require manual entry into the
              EHR. Electronic questionnaires are often time consuming as
              they ask many sequential questions with negative responses.
            </li>
            <li>
              The data collected is insufficient. The doctor or nurse asks
              the relevant questions again, with multiple follow-up
              questions such as frequency, severity, and timing.
            </li>
          </ul>

          <Image
            src={cloudfrontImage('/images/features/open-pro/ros.jpg')}
            alt="ROS Reporter interface concept"
            width={800}
            height={600}
            className="w-full max-w-xl mx-auto h-auto my-8"
          />

          <h4 className="header-md">Goals</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>Improve communication between the patient and care team.</li>
            <li>
              Improve the fidelity and relevance of information from the
              patient, by recording events and pains closer to relevant time
              and place (point of pain).
            </li>
            <li>
              Provide designs that minimize survey fatigue and maximize the
              collection of relevant data.
            </li>
            <li>
              Lower stress on the patient and improve the fidelity of data
              during transfers of care.
            </li>
            <li>Provide language and accessibility support.</li>
          </ul>

          <h4 className="header-md">Components</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Web interface to identify symptoms and collect relevant info
              (onset, intensity, location, etc.). The questionnaire is
              responsive and intelligent, focusing on systems and lines of
              questions relevant to the patient&apos;s conditions.
            </li>
            <li>
              Receipt for the patient in both plain English and medical
              language for sharing, easy reference, printing, etc.
            </li>
            <li>
              FHIR resources enumerating the captured conditions using
              standard coding schema. This is a first step in importing the
              data into a health record.
            </li>
          </ul>

          <h4 className="header-md mb-0">
            Estimated Level of Effort
          </h4>
          <p className="text-gray leading-relaxed mb-0">
            Design: <span className="text-black">4 weeks, 1.0FTE</span>
          </p>
          <p className="text-gray leading-relaxed mt-0">
            Development v1.0:{' '}
            <span className="text-black">6 weeks, 1.0FTE</span>
          </p>

          {/* 4. openPRO Platform */}
          <h3 className="header-md mt-8 mb-4">4. openPRO Platform</h3>
          <p className="text-gray leading-relaxed mb-4">
            The{' '}
            <a
              href="https://github.com/goinvo/openPRO/tree/master/proPlatform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              openPRO web service
            </a>{' '}
            will offer low-effort administration of PROs for clinicians and
            patients. Any party can, ad hoc, initiate a PRO. The patient
            sends to the doctor via the service a de-identified PRO, which
            is assigned to the patient using separate established secure
            channels. The clinic can then insert the new data in the EHR,
            either by hand or by an import function implemented at the
            clinic&apos;s side.
          </p>

          <h4 className="header-md">Goals</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Empower patients to administer and initiate their own PROs and
              PROMs.
            </li>
            <li>
              Make administration and completion of PROs more convenient for
              both patients and administrative staff.
            </li>
            <li>
              Satisfy patient privacy by anonymizing the communication of
              the data. The data is then associated with the patient&apos;s
              identity within the office&apos;s established secure system.
            </li>
            <li>
              Provide a platform for distributing the Symptom Identifier,
              ROS reporter, and Voice PROMs.
            </li>
          </ul>

          <Image
            src={cloudfrontImage('/images/features/open-pro/platform.jpg')}
            alt="openPRO Platform interface concept"
            width={800}
            height={600}
            className="w-full max-w-xl mx-auto h-auto my-8"
          />

          <h4 className="header-md">Components</h4>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed text-gray">
            <li>
              Front-end services:
              <ul className="list-disc list-outside pl-6 space-y-1 mt-2">
                <li>
                  Website for requesting, completing, and receiving PROs.
                </li>
                <li>
                  Request interface
                  <ul className="list-disc list-outside pl-6 space-y-1 mt-1">
                    <li>Request a PRO to be filled out by self or other.</li>
                    <li>
                      Receive a unique key that identifies the incomplete
                      PRO.
                    </li>
                    <li>
                      PRO/questionnaire is one of: custom designed
                      questionnaire, established questionnaire from PROM
                      library (PROMIS), openPRO product such as ROS capture
                      or Symptom Reporter.
                    </li>
                  </ul>
                </li>
                <li>
                  Capture interface
                  <ul className="list-disc list-outside pl-6 space-y-1 mt-1">
                    <li>
                      User submits unique key to access and complete PRO.
                    </li>
                    <li>
                      Provide interface to complete custom questionnaire.
                    </li>
                    <li>Provide interfaces from PROMIS or openPRO tools.</li>
                  </ul>
                </li>
                <li>
                  View interface
                  <ul className="list-disc list-outside pl-6 space-y-1 mt-1">
                    <li>
                      User submits unique key to view or download completed
                      PRO.
                    </li>
                    <li>
                      Visualization tools for questionnaires, Symptom
                      Reporter, and ROS Reporter.
                    </li>
                    <li>
                      Ability to produce associated FHIR Condition resources
                      from questionnaires.
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
            <li>
              Back-end services:
              <ul className="list-disc list-outside pl-6 space-y-1 mt-2">
                <li>
                  Key manager. Generates, distributes, and processes keys
                  associated with incomplete and complete PROs.
                </li>
                <li>Storage for pending and complete PROs.</li>
              </ul>
            </li>
            <li>
              SMART on FHIR app that fetches the anonymous responses and
              attaches the patient&apos;s identity to the PRO for insertion into
              EHR.
            </li>
          </ul>

          <h4 className="header-md mb-0">
            Estimated Level of Effort
          </h4>
          <p className="text-gray leading-relaxed mb-0">
            Design: <span className="text-black">3 weeks, 1.0FTE</span>
          </p>
          <p className="text-gray leading-relaxed mt-0">
            Development of minimal service:{' '}
            <span className="text-black">6 weeks, 1.0FTE</span>
          </p>
        </div>
      </section>

      {/* Authors */}
      <section className="bg-gray-100 py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">Authors</h2>
          <Author name="Daniel Reeves" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <Author name="Sharon Lee" company="GoInvo" />
          <Author name="Jen Patel" company="GoInvo" />
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
