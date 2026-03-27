import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/living-health-lab/references.json'
import { LivingHealthLabCarousels, LivingHealthLabAppendixCarousel } from './LivingHealthLabCarousels'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Living Health Lab',
  description:
    'An open source project to help people examine, understand, and improve their day-to-day health through guided exploration, self-tracking, and behavior change.',
}

function Img({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <Image
      src={cloudfrontImage(`/images/features/living-health-lab/${src}`)}
      alt={alt}
      width={1200}
      height={800}
      className={`w-full h-auto ${className}`}
    />
  )
}

export default function LivingHealthLabPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/living-health-lab/hero.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Living Health Lab</h1>
          <h4 className="font-serif text-lg leading-relaxed mb-6">
            An open source project to help people examine, understand, and
            improve their day-to-day health through guided exploration,
            self-tracking, and behavior change.
          </h4>

          <p className="leading-relaxed mb-4">
            <em>Design</em>
            <br />
            With over 350,000 digital health applications available worldwide,
            there&apos;s no shortage of options when it comes to individual health
            data tracking. However, accurately
            interpreting this data to address specific questions and create an
            effective health plan can be a challenge. Individuals within the
            Quantified Self community have established a systematic approach
            to self-tracking and self-research called Personal Science.
            Through Living Health Lab, we aim to extend the personal science
            process to anyone with access to a smartphone.
          </p>

          <p className="leading-relaxed mb-4">
            <em>Development</em>
            <br />
            Living Health Lab will be an open source tool that helps
            individuals notice a health problem, identify possible
            contributing or alleviating factors, and test any causality. The
            process will be guided by the individual&apos;s goals and what phase of
            their Health Journey they are in. They will also be encouraged to
            designate a health buddy (e.g., a partner, clinician, or friend)
            to accompany them in their explorations and analyze findings
            together.
          </p>

          <p className="leading-relaxed mb-8">
            <em>Dream</em>
            <br />
            Our goal is to make Living Health Lab available to anyone who asks
            &quot;How can I pursue a healthier life?&quot;, as a tool that empowers
            every patient, supplements the care of all medical providers, and
            promotes a holistic approach to healthcare. This resource will be
            an open source design project that is freely shared with the
            public. As we are still in the early stages of the design process,
            we would welcome any feedback: please reach out to us at{' '}
            <a href="mailto:LivingHealthLab@goinvo.com" className="text-primary hover:underline">
              LivingHealthLab@goinvo.com
            </a>
            .
          </p>

          {/* Workbook CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8">
            <Img src="living-health-lab-workbook.jpg" alt="Living Health Lab Workbook" />
            <div>
              <h3 className="header-md mb-3">Get the Workbook</h3>
              <p className="leading-relaxed mb-4">
                We created this printable to demonstrate what a Living
                Health Lab app could support in the future. The workbook
                is designed to guide you through identifying, tracking,
                and better understanding your health concerns.
              </p>
              <Button
                href="https://www.dropbox.com/s/rw3u29f73v0wfpk/living-health-lab-workbook.pdf?dl=0"
                variant="secondary"
                external
              >
                View The Workbook
              </Button>
            </div>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Introduction</h2>

          <p className="leading-relaxed mb-4">
            Chronic pain is a condition that affects over 50 million adults in
            the United States. For many, managing
            chronic conditions is a difficult process that involves a complex
            jumble of biological, physical, emotional, mental, social, and
            cultural factors. With more than 350,000 health and
            wellness-related applications available to download worldwide,
            patients can easily monitor their health, yet very few of these
            services help patients with chronic health problems interpret
            their data or offer insights to improve everyday health.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8">
            <Img src="viz_one_in_five.png" alt="1 in 5 adults experience chronic pain" />
            <div>
              <h3 className="font-serif text-xl">
                At least 1 in 5 adults in the U.S. live with chronic pain
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-8">
            <div>
              <Img src="viz_migraines.png" alt="Migraines statistics" className="mb-2" />
              <p className="leading-relaxed">
                <span className="text-xl font-semibold">3-4</span>% globally experience{' '}
                <strong>chronic daily headaches</strong>
              </p>
            </div>
            <div>
              <Img src="viz_arthritis.png" alt="Arthritis statistics" className="mb-2" />
              <p className="leading-relaxed">
                <span className="text-xl font-semibold">15</span> million experience{' '}
                <strong>arthritis pain</strong>
              </p>
            </div>
            <div>
              <Img src="viz_ibs.png" alt="IBS statistics" className="mb-2" />
              <p className="leading-relaxed">
                <span className="text-xl font-semibold">24-45</span> million experience{' '}
                <strong>IBS symptoms</strong>
              </p>
            </div>
          </div>

          <p className="leading-relaxed mb-4">
            Out of all chronic pain patients, one in three individuals faces
            frequent limitations in daily life due to the severity and
            frequency of their symptoms. These
            patients often undergo repeated attempts to manage their
            conditions. This can mean frequent visits to the doctor&apos;s office
            and ER, several trials of different medications, and multiple days
            of missed work due to disability, all of which take a toll on
            their interpersonal relationships, financial stability, and
            overall quality of life. Members of a
            community called Quantified Self found inspiration in this
            disheartening cycle through a self-tracking approach now known as
            personal science: they became &quot;active investigators&quot; of their own
            health. This method encourages patients to
            seek answers to their own difficult health questions and concerns
            through five key actions of self-research:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <Img src="step-1-b.png" alt="Step 1: Question" className="mb-2" />
              <p className="leading-relaxed">
                1. <strong>Question</strong> experiences, emotions, observations about
                one&apos;s own life
              </p>
            </div>
            <div className="text-center">
              <Img src="step-2-b.png" alt="Step 2: Design" className="mb-2" />
              <p className="leading-relaxed">
                2. <strong>Design</strong> the exploration
              </p>
            </div>
            <div className="text-center">
              <Img src="step-3-b.png" alt="Step 3: Observe" className="mb-2" />
              <p className="leading-relaxed">
                3. <strong>Observe</strong> the data collected, manually self-reported
                or collected by smart devices
              </p>
            </div>
            <div className="text-center">
              <Img src="step-4-b.png" alt="Step 4: Reason" className="mb-2" />
              <p className="leading-relaxed">
                4. <strong>Reason</strong> through the findings
              </p>
            </div>
            <div className="text-center">
              <Img src="step-5-b.png" alt="Step 5: Discover" className="mb-2" />
              <p className="leading-relaxed">
                5. <strong>Discover</strong> practical actions to improve daily life and
                share with others
              </p>
            </div>
          </div>

          <p className="leading-relaxed mb-8">
            In our review of published work in the fields of personal science
            and self-tracking, we found that this approach has helped
            individuals with specific chronic conditions, including patients
            with Parkinson&apos;s disease in identifying personalized sleep and
            medication routines to improve symptoms of rigidity,
            patients with irritable bowel syndrome
            in determining possible food triggers,
            and patients trying to understand and
            better manage their migraines. Living
            Health Lab&apos;s mission is to build on this research and broadly
            apply the process of personal science to patients with all types
            of health conditions, habits, and concerns. It will help anyone
            with a smartphone discover how to improve their day-to-day health
            through guided, thoughtfully-designed explorations.
          </p>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Design</h2>

          <Img src="LHL_project_timeline.jpg" alt="Living Health Lab project timeline" className="mb-8" />

          <h3 className="header-md mt-6 mb-3">1) Design Principles</h3>

          <p className="leading-relaxed mb-4">
            The following design principles are based on findings and
            reflections from the Quantified Self and broader self-tracking
            communities, combined with lessons from our own experiences
            designing for patients. These principles serve as a compass as we
            begin designing and prototyping Living Health Lab.
          </p>

          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed">
            <li>
              Purposeful Exploration
              <ul className="list-disc list-outside pl-6 mt-1 space-y-1">
                <li>
                  Figure out where the individual is in their Health Journey
                  and where they want to go
                </li>
                <li>
                  Align the exploration with their goals, limitations, and
                  needs
                </li>
                <li>Reduce the burden of tracking as much as possible</li>
              </ul>
            </li>
            <li>
              Guided, Informed Experience
              <ul className="list-disc list-outside pl-6 mt-1 space-y-1">
                <li>
                  Ensure that designing the exploration is a clear, easy
                  process
                </li>
                <li>
                  Give people knowledge and control over what they commit to
                </li>
                <li>
                  Use storytelling and visualization to bring the content to
                  life
                </li>
                <li>
                  Design an accessible personal science learning experience
                </li>
              </ul>
            </li>
            <li>
              Collaborative Health
              <ul className="list-disc list-outside pl-6 mt-1 space-y-1">
                <li>
                  &quot;Do health together&quot; with a network of support by including
                  the person&apos;s care team: PCP, other providers, accountability
                  buddy, and friend/family &quot;cheerleaders&quot;
                </li>
              </ul>
            </li>
            <li>
              Actionable Insights
              <ul className="list-disc list-outside pl-6 mt-1 space-y-1">
                <li>Identify factors impacting their health</li>
                <li>Provide meaningful data visualization</li>
                <li>
                  Offer insights that enable patients to make improvements to
                  their health
                </li>
              </ul>
            </li>
            <li>
              Sense of Agency
              <ul className="list-disc list-outside pl-6 mt-1 space-y-1">
                <li>Support self-reflection and self-learning</li>
                <li>
                  Empower patients to be in the driver&apos;s seat of their own
                  health
                </li>
                <li>
                  Recognize the value of all new insights, irrespective of
                  &quot;success&quot;
                </li>
              </ul>
            </li>
          </ul>

          <h3 className="header-md mt-6 mb-3">
            2) Visualizing the Patient Experience
          </h3>
          <p className="leading-relaxed mb-4">
            Storytelling is a powerful tool to represent the patient
            experience. Here we use Patty&apos;s Story as a way to begin
            conceptualizing and defining the Living Health Lab service. This
            is just one illustration of how an individual could discover
            Living Health Lab and begin taking ownership of their health
            through the service.
          </p>
        </div>

        {/* Carousels Section */}
        <LivingHealthLabCarousels />

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">
            Making Living Health Lab Real
          </h2>

          <h3 className="header-md mt-6 mb-3">
            Broader application for patients and providers
          </h3>
          <p className="leading-relaxed mb-4">
            We believe this empowered approach to managing one&apos;s health is
            beneficial for every human. Initially, we plan to target those
            living with chronic conditions that can make everyday life
            difficult, like fibromyalgia, arthritis, and migraines. Research
            has shown those with chronic conditions are often the most
            motivated to start the tracking process as any insight can
            directly affect their day-to-day health.{' '}
            Patients who are <strong>highly motivated</strong> to answer their health
            questions and have <strong>much to gain</strong> may be the easiest to
            reach, but many others could also benefit from Living Health Lab:
          </p>

          <Img src="user-chart.png" alt="User tracking chart" className="mb-4" />

          <p className="leading-relaxed mb-4">
            Living Health Lab will be a collaborative tool for patients and
            their doctors as they &quot;identify new trends, hypothesize about
            symptom contributors, generate action plans, and identify new
            information needs&quot; for chronic condition management and healthy
            lifestyle promotion. This type of
            collaboration is most successful when both parties share their
            clearly defined goals. Access to high-quality, patient-generated
            data might free up the office visit to discuss more targeted
            concerns as patients come in to share their findings and receive
            personalized interpretation and direction.
            We see the opportunity for Living Health
            Lab to facilitate higher levels of patient engagement in their
            healthcare and make it easier for providers to obtain data on
            their patients&apos; day-to-day health.
          </p>

          <p className="leading-relaxed mb-4">
            Living Health Lab will guide people in identifying and
            understanding their unique, necessary lifestyle changes and the
            ideal way to implement them. Lifestyle changes could prevent one
            out of every three premature deaths related to heart disease,
            stroke, and chronic lung disease. &quot;Eat
            better,&quot; &quot;Move more,&quot; and &quot;Smoke less&quot; are just a few of the most
            common generic lifestyle recommendations. Though accurate, simply
            dispensing this advice is rarely sufficient in effecting change.
            So how can we set people up for success in each person&apos;s unique
            context? Providing concrete, actionable steps based on their lived
            experience is the key. In several observational studies and
            clinical trials, non-medicine approaches like exercise,
            mindfulness, and mind-body practices have demonstrated improvement
            in chronic pain experienced by people (see appendix i -
            Non-medicine Pain Relief Research Summary). Our work builds on
            these findings to apply it in real world terms. Living Health Lab
            takes the recommendation to eat better and prompts the individual
            to determine the specifics of what that looks like for them. These
            guided self-tracking strategies give structure to the process of
            watching, measuring, and investigating choices. Living Health Lab
            will show people how capable they are of taking control of their
            own health.
          </p>

          <p className="leading-relaxed mb-4">
            We hope to serve everyone from the student in a high school health
            class to the retiree trying to improve their heart health to the
            single parent struggling with their newborn&apos;s skin sensitivities.
            Living Health Lab reaches those with medical diagnoses and extends
            to everyone who asks &quot;How can I pursue a healthier life?&quot; Some
            will ask that question on their own, while others will be advised
            by their doctor, nurse, or others on their care team. Living
            Health Lab can be an extension of those conversations as it leads
            people to explore their own health and seek answers.
          </p>

          <h3 className="header-md mt-6 mb-3">Open Source Health Design</h3>
          <p className="leading-relaxed mb-4">
            As an Open Source Health Design project, Living Health Lab content
            will be available to the public for free use under the Creative
            Commons Attribution 4.0 International License. Transparency
            affords us the benefits of external input and engagement. By
            making all research, design, and ultimately code publicly
            available, we hope to spread good ideas and accelerate innovation
            for the public good.
          </p>

          <h3 className="header-md mt-6 mb-3">Get Involved</h3>
          <p className="leading-relaxed mb-4">
            We are in the early stages of design and funding will be a vital
            component for continuing this project. If you&apos;re interested in
            contributing, partnering, sponsoring, or simply sharing feedback,
            please reach out to us at{' '}
            <a href="mailto:LivingHealthLab@goinvo.com" className="text-primary hover:underline">
              LivingHealthLab@goinvo.com
            </a>
            .
          </p>

          <div className="text-center mt-8 mb-8">
            <Button
              href="https://forms.gle/HjmSWjHKZS9zHsrz6"
              variant="primary"
              external
            >
              How would you use Living Health Lab?
            </Button>
          </div>
        </div>

        {/* Appendix */}
        <div className="bg-secondary/10 py-12 mt-8">
          <div className="max-width content-padding mx-auto">
            <h2 className="font-serif text-2xl mb-4 text-center">Appendix</h2>

            <h2 className="header-md mt-6 mb-4">
              i - Non-medicine Pain Relief
            </h2>

            <LivingHealthLabAppendixCarousel />

            <h2 className="font-serif text-xl mt-8 mb-4">
              ii - Research Table
            </h2>
            <iframe
              src="https://docs.google.com/spreadsheets/d/e/2PACX-1vQCH-qmx5UMmEqMI74LUNS8rhSKT9mi1pjqDGrkNPLdOXyRQTZVYCjlmwpzxDdq1ZMqdgE2F1XeoqrE/pubhtml?widget=true&headers=false"
              className="w-full border border-gray-medium rounded"
              style={{ height: 600 }}
              loading="lazy"
              title="Living Health Lab Research Table"
            />
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Sharon Lee" company="GoInvo" />
          <Author name="Shayla Nettey" company="GoInvo" />
          <Author name="Huahua Zhu" company="GoInvo" />
          <Author name="Megan Hirsch" company="GoInvo" />
          <Author name="Chloe Ma" company="GoInvo" />
          <Author name="Samantha Wuu" company="GoInvo" />
          <Author name="Arpna Ghanshani" company="GoInvo" />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>
          <p className="text-gray">Jenny Yi</p>
        </div>
      </section>

      {/* References */}
      <section className="py-12">
        <div className="max-width content-padding mx-auto">
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
