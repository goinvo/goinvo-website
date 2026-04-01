import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { CarePlansCarousel } from '../CarePlansCarousel'
import '../careplans.css'

const IMG = 'https://www.goinvo.com/old/images/features/careplans'

export const metadata: Metadata = {
  title: 'Care Plans Part 3: The Future',
  description: 'What is the future of care plans?',
}

export default function CarePlansPart3Page() {
  return (
    <div>
      {/* Hero */}
      <div className="careplans-hero" style={{ minHeight: 480, background: '#2a3a4a' }}>
        <div className="hero-bg">
          <Image
            src={`${IMG}/part3/hero_bg.jpg`}
            alt="Care Plans Part 3 background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="hero-content">
          <Link href="/vision/care-plans" className="no-underline hover:opacity-80 transition-opacity">
            <h1 className="big-title" style={{ margin: 0 }}>CARE</h1>
            <h1 className="big-title" style={{ margin: 0 }}>PLANS</h1>
          </Link>
          <p className="sub-title">PART 3: The Future</p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="careplans-nav">
        <nav>
          <a href="#digitized">Digitized</a>
          <a href="#standardized">Standardized</a>
          <a href="#data-rich">Data-Rich</a>
          <a href="#empowering">Empowering</a>
          <a href="#dynamic">Dynamic</a>
          <a href="#care-team">Care Team</a>
          <a href="#health-shift">Health Shift</a>
          <a href="#conclusions">Conclusions</a>
        </nav>
      </div>

      {/* ===== SECTION 1: Digital is Better ===== */}
      <section id="digitized" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            <strong className="font-bold">Digital</strong> is Better
          </h1>

          {/* Carousel: 5 slides matching legacy Bootstrap carousel */}
          <CarePlansCarousel>
            <div className="slide-card">
              <Image src={`${IMG}/part3/part1_slide1.png`} alt="Magic Mirror health monitoring" width={500} height={400} className="w-full h-auto mb-4" />
              <p className="text-gray leading-relaxed text-sm">
                The &quot;Magic Mirror&quot; on the wall is not just a fantasy anymore. Using facial recognition and mood sensing, blood pressure and heart rate sensing through skin pigmentation, and other technology, we can imbue the ordinary bathroom mirror with interactive qualities to help monitor our health.
              </p>
              <a href="http://mobihealthnews.com/content/digital-healthcare-services-2016-and-beyond" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">Learn More &rarr;</a>
            </div>

            <div className="slide-card">
              <Image src={`${IMG}/part3/part1_slide2.png`} alt="Conversational user interfaces" width={500} height={400} className="w-full h-auto mb-4" />
              <p className="text-gray leading-relaxed text-sm">
                Conversational user interfaces, driven by advances in voice recognition technology and artificial intelligence, are capable of understanding the content and context of patient concerns. These can be incorporated into mHealth apps for motivating health and fitness engagement, digital prescription treatment plans, or interactive systems for outpatient education.
              </p>
              <a href="http://mobihealthnews.com/content/digital-healthcare-services-2016-and-beyond" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">Learn More &rarr;</a>
            </div>

            <div className="slide-card">
              <Image src={`${IMG}/part3/part1_slide3.png`} alt="Contextual engagement sensors" width={500} height={400} className="w-full h-auto mb-4" />
              <p className="text-gray leading-relaxed text-sm">
                Contextual engagement breeds adherence to self care goals. Using mobile phone sensors like the gyroscope, accelerometer, light sensor, camera, microphone, GPS, wifi, and other connected devices, we can start to provide realtime education and recommendations based on current behavior and the environment.
              </p>
              <a href="http://mobihealthnews.com/content/digital-healthcare-services-2016-and-beyond" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">Learn More &rarr;</a>
            </div>

            <div className="slide-card">
              <Image src={`${IMG}/part3/part1_slide4.png`} alt="Virtual helpers and AI coaching" width={500} height={400} className="w-full h-auto mb-4" />
              <p className="text-gray leading-relaxed text-sm">
                Virtual helpers will leverage human-modeled artificial intelligence to provide both health coaching and resources to motivate patients. Such mHealth companions will assist people in adhering to their care plans, their prescription regimens, and even outpatient treatment for complex, chronic conditions. These helpers might expand past the 2D mobile platform, seeping into other more physical services such as Echo, Nest, and Jibo.
              </p>
              <a href="http://mobihealthnews.com/content/digital-healthcare-services-2016-and-beyond" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">Learn More &rarr;</a>
            </div>

            <div className="slide-card">
              <Image src={`${IMG}/part3/part1_slide5.png`} alt="Digital medication adherence" width={500} height={400} className="w-full h-auto mb-4" />
              <p className="text-gray leading-relaxed text-sm">
                Solving the complex problem of medication adherence could have a huge impact on lowering cost of care. The basics of digital adherence -- self-reporting, tracking refills and chronic disease outcomes, etc. -- will receive a boost from the use of sensors to collect confirming data, whether it&apos;s via breath analysis, urine sampling, or another non-invasive method.
              </p>
              <a href="http://mobihealthnews.com/content/digital-healthcare-services-2016-and-beyond" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">Learn More &rarr;</a>
            </div>
          </CarePlansCarousel>

          <p className="text-gray leading-relaxed mb-4">
            Distance and remote based care is growing with the continuing expansion of smartphone device consumption and installation of broadband services into homes and businesses.<span className="superscript">1,2</span> Expansion of free internet services, such as in the UK, where the National Health Service (NHS) will be converted into a free wi-fi zone, are also a driver of this digitization trend.<span className="superscript">3</span> With better connectivity, internet speeds, and smart monitoring devices, there may soon be a shift from the traditionally episodic, face-to-face care to a model where the immediate, remote, and individualized care plan is possible.<span className="superscript">4</span> Patients will be able to more consistently access, collaborate on, and adjust their care plans at home, work, school, while traveling, and in mobile clinics.<span className="superscript">5</span> This shift is especially important for less mobile and more vulnerable demographics such as new borns, physically disabled people, or seniors.<span className="superscript">6,7</span>
          </p>
        </div>
      </section>

      {/* ===== SECTION 2: Standardized ===== */}
      <section id="standardized" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            <strong className="font-bold">Standardized</strong>, Interoperable Content
          </h1>

          <a href="https://github.com/intervention-engine" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold inline-block mb-4">
            MITRE Engine &rarr;
          </a>

          <Image
            src={`${IMG}/part3/part2.jpg`}
            alt="Standardized care plan content"
            width={1000}
            height={500}
            className="w-full h-auto mb-6 rounded"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="part3-quote">
                There must be more consensus on care plan content. All this variation leads to miscommunication and errors in the transfer of care.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray leading-relaxed">
                Standardization of care plans throughout the spectrum of health concerns will aid in communication and collaboration across care team members over time, providing high-quality longitudinal care with reduced risk for medical error.<span className="superscript">2,8,9</span> If medical community leaders converge to develop clinical pathways into a library of robust care plan templates, they can then be customized to each patient&apos;s needs while still being interoperable among all care organizations.<span className="superscript">10,11,12</span> Using consistent quality metrics, the effectiveness of these templates can be assessed to identify how they must evolve and improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: Data-Rich ===== */}
      <section id="data-rich" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="text-xs text-gray mb-1">Photo by Philips Communications</p>
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            &quot;Give <em>Me</em> <em>My</em> <strong className="font-bold">Data</strong>&quot;
          </h1>

          <Image
            src={`${IMG}/part3/part3.png`}
            alt="Data-rich care plans and personal health data"
            width={1000}
            height={500}
            className="w-full h-auto mb-6 rounded"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <p className="part3-quote mb-4">
                There needs to be an EMR system that can aggregate medical records, lab tests and scans, genomic data, and all other health data (including patient-generated) and analyze them in a meaningful way.
              </p>
              <p className="text-gray leading-relaxed">
                Patients will have an unlimited and ever-evolving reservoir of data collected from embedded devices, mobile phones, and other sensors that is then synthesized into an understandable personal health score.<span className="superscript">13</span> Predictive analytics will help identify patterns in this data to create actionable insights and recommendations for care plan adjustments. With the advent of human genome mapping, we can further fine tune care plans according to patient&apos;s family medical history and genetic predispositions. In a broader context, we can look at the population&apos;s genetic data comparatively to differentially diagnose various health conditions.<span className="superscript">14</span> Once we can move past the stigma of sharing health record information with patients and the complexity of securing the information from harm, we can approach the ideal world where patients are the rightful owner of their health data, using it to maintain a holistic view of their health.<span className="superscript">6,13,15</span>
              </p>
            </div>
            <div className="hidden md:block" />
          </div>
        </div>
      </section>

      {/* ===== SECTION 4: Empowering ===== */}
      <section id="empowering" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            Empowered Patients are<br /><strong className="font-bold">Activated</strong> Patients
          </h1>

          {/* Goal Setting / Execution / Adjustment carousel */}
          <CarePlansCarousel>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part3_goal_setting.png`} alt="Goal Setting" width={400} height={500} className="w-full max-w-md h-auto mx-auto mb-3" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">Goal Setting</h3>
            </div>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part3_goal_exec.png`} alt="Goal Execution" width={400} height={500} className="w-full max-w-md h-auto mx-auto mb-3" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">Goal Execution</h3>
            </div>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part3_adjustment.png`} alt="Insight & Adjustment" width={400} height={500} className="w-full max-w-md h-auto mx-auto mb-3" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">Insight &amp; Adjustment</h3>
            </div>
          </CarePlansCarousel>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="part3-quote">
                We need care plans to be more than list of instructions. They need to serve as a continuous source of diagnosis, relevant education, informative insights, and encouragement to take action.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray leading-relaxed">
                Patients should never leave a doctor&apos;s office empty handed. Building an accessible digital care plan together with their provider will allow for both a more active discussion and a more empowered patient. When the patient feels a part of the decision making process and concludes a medical encounter feeling valued, knowledgeable, and supported by an accessible digital care plan, their likelihood of compliance to healthier &quot;self care&quot; behaviors will grow.<span className="superscript">13</span> Similar engagement of caregivers will grow compliance even further as these more consistently present care team members are informed and empowered to help implement the care plan.<span className="superscript">10</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 5: Care Team ===== */}
      <section id="care-team" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
                Expanding the Meaning of <strong className="font-bold">Care Team</strong>
              </h1>
              <p className="part3-quote mb-4">
                A more holistic approach to care planning suggests a greater need for cohesive inclusion of the patient&apos;s direct network into their care team.
              </p>
              <p className="text-gray leading-relaxed mb-4">
                In order to achieve better engagement and adherence to care plans, non-professional caregivers (friends and family) will be incorporated into the care team.<span className="superscript">16,17</span> These team members have the highest degree of access to the patient, and the most incentive to provide care. Services that expand education and engagement to both the patient AND these members will emerge to fully utilize this component of the care team.<span className="superscript">18</span>
              </p>
              <p className="text-gray leading-relaxed mb-4">
                Another important presence in this expanding care team is the online community. We will start to see services that incorporate community forums and population analytics to take advantage of the wealth of knowledge and experience of similar patients.<span className="superscript">18</span>
              </p>
              <p className="text-gray leading-relaxed">
                The advancement of digital care plans has surfaced the need for new healthcare roles that bridge the gap between providers and patient-facing technology. One emerging role, the nurse extender clinical aide, or grand-aide, interacts more frequently with patients to ensure adherence to the care plan and keeps the more highly-trained providers informed about the status of the patient.<span className="superscript">19</span>
              </p>
            </div>
            <div>
              <Image
                src={`${IMG}/part3/careteam.gif`}
                alt="Expanding care team visualization"
                width={500}
                height={500}
                className="w-full h-auto rounded"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 6: Dynamic ===== */}
      <section id="dynamic" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-4">
            Dynamic Plans Evolve<br /><strong className="font-bold">With the Patient</strong>
          </h1>

          <a
            href={`${IMG}/part3/intervention_engine_poster_final.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-charcoal px-4 py-2 rounded text-sm font-semibold mb-6 transition-colors"
          >
            Download Full Poster
          </a>

          {/* Intervention System carousel */}
          <CarePlansCarousel>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part6_intervention_system.png`} alt="Intervention System" width={500} height={400} className="w-full max-w-lg h-auto mx-auto mb-2" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">Intervention System</h3>
            </div>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part6_patient_intervention.png`} alt="Patient Intervention" width={500} height={400} className="w-full max-w-lg h-auto mx-auto mb-2" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">Patient Intervention</h3>
            </div>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part6_clinician_intervention.png`} alt="Clinician Intervention" width={500} height={400} className="w-full max-w-lg h-auto mx-auto mb-2" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">Clinician Intervention</h3>
            </div>
            <div className="slide-image-card">
              <Image src={`${IMG}/part3/part6_national_intervention.png`} alt="National Intervention" width={500} height={400} className="w-full max-w-lg h-auto mx-auto mb-2" />
              <h3 className="font-sans font-bold text-sm uppercase tracking-wide">National Intervention</h3>
            </div>
          </CarePlansCarousel>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="part3-quote">
                Patients need more diagnosis, goal setting, and guidance than an annual check up with their doctor in order to engage in effective, preventative self care.
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray leading-relaxed">
                As digital care plans gain the ability to deliver personalized health content (including goals) and collect relevant metrics, the opportunity arises to coalesce these functions into a feedback loop.<span className="superscript">15</span> This means the care plan will facilitate a prescribed or selected care plan with specified goals, assess relevant data from vitals sensors, the environment, or behaviors, to determine if the goal criteria is met, and then auto-adjust the care plan goals and education accordingly. Health scores and predictive analytics will be used to aid engagement and understanding of the care plan and any changes to it. The use of patient health projections and relevant recommendations creates a kind of intervention engine that could behave autonomously from medical providers, though it could always be augmented and further personalized when clinician input is available. However, the concept of an intervention engine is dependent on a clinically-validated database of interoperable care plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 7: Health Shift ===== */}
      <section id="health-shift" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            Health Care is <strong className="font-bold">Shifting</strong>
          </h1>

          <Image
            src={`${IMG}/part3/part7_desktop.png`}
            alt="Healthcare shifting infographic"
            width={1000}
            height={500}
            className="w-full h-auto mb-6 rounded hidden md:block"
          />
          <Image
            src={`${IMG}/part3/part7_mobile.png`}
            alt="Healthcare shifting infographic"
            width={600}
            height={800}
            className="w-full h-auto mb-6 rounded md:hidden"
          />

          <p className="text-gray leading-relaxed mb-4">
            The expansion of health coverage and the growing influx of patients will force a significant shift in the way healthcare is provided.<span className="superscript">21,22</span> More patients means a need for more providers. This will expand the roles and responsibilities of nurses, physician&apos;s assistants, and other lesser-trained professionals, to provide more continuous care to more patients at one time.<span className="superscript">21</span> It also illuminates the benefit of utilizing the non-professional side of the care team, such as family caregivers and the online community in the care plan.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Healthcare payers are transitioning from a volume-based to value-based payment model, meaning that medical professionals will only get paid for the success of care, rather than for conducting the care itself.<span className="superscript">23</span> This shift requires quality metrics to assess outcomes, which can only be achieved through consistently delivered care plans and comprehensive health data tracking. When the feedback loop of an intervention engine is achieved, effectiveness of standardized interventions can be understood to accurately provide reimbursement and improve national healthcare as a whole.
          </p>
          <p className="text-gray leading-relaxed">
            Digital, standardized, dynamic, care plans will both augment effectiveness of our limited supply of medical professionals, and empower patients to engage in cost-effective, preventive self care behaviors.<span className="superscript">24</span>
          </p>
        </div>
      </section>

      {/* ===== SECTION 8: Conclusions ===== */}
      <section id="conclusions" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            So... How Do We <strong className="font-bold">Get There?</strong>
          </h1>
          <p className="text-gray leading-relaxed mb-8">
            It is unreasonable to expect to implement all of these care plan elements at once. Cost, both in conducting and implementing the future of care plans, also require further consideration. Below is a strategic view of what needs to be done.
          </p>

          <Image
            src={`${IMG}/part3/part8_image.png`}
            alt="Strategic view infographic"
            width={1000}
            height={400}
            className="w-full h-auto mb-8 rounded"
          />

          <div className="three-col-grid">
            <div>
              <p className="col-title">Culture Shift</p>
              <ul>
                <li>Patients are the most important part of their care team, include them in the care planning process.</li>
                <li>Transparency in all medical encounters, give patients their data.</li>
                <li>The non-clinical part of the care team such as health coaches, family caregivers, and other networks are just as important. Rope them into the process more.</li>
              </ul>
            </div>
            <div>
              <p className="col-title">National Standards</p>
              <ul>
                <li>Synthesize research in the medical community and nationally establish a library of condition-specific care plans which can be consistently implemented in a patient-clinician encounter, and independently by the patient and other care team members.</li>
              </ul>
            </div>
            <div>
              <p className="col-title">Technology &amp; Accessibility</p>
              <ul>
                <li>Make digital health sensors and devices that help track complex chronic conditions more affordable.</li>
                <li>Grow engaging health software solutions that improve accessibility and quality of care and actually get people to change behavior.</li>
                <li>Utilize payers&apos; risk scoring to create clinically valid patient-facing health score.</li>
              </ul>
            </div>
          </div>

          <div className="text-center my-8">
            <Image
              src={`${IMG}/part3/gears.png`}
              alt="Gears"
              width={120}
              height={120}
              className="inline-block h-auto w-20 mb-3"
            />
            <h2 className="font-serif text-xl font-light mb-4">Create an Intervention Engine</h2>
          </div>
          <p className="text-gray leading-relaxed">
            In conjunction with the development of these technological advancements and national standards, we can start to create an autonomous engine that collects data relevant to chronic conditions, synthesizes it into meaningful information, interfaces with the national care plan library to select appropriate adjustments and recommendations, and delivers these recommendations along with any manual clinician input in an engaging way to patient and their care team. This engine is not meant to replace interaction with clinicians, but rather, augment it by providing continuous care in between medical encounters. Crucial to such an engine is the ability to compare assessed outcomes with interventions made to understand effectiveness across the entire population of patients. This will allow the engine to &quot;learn&quot; and evolve, providing better and better care.
          </p>
        </div>
      </section>

      {/* ===== SECTION 9: Call to Action ===== */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-4">
            A Call to <strong className="font-bold">Action</strong>
          </h1>
          <p className="text-gray leading-relaxed mb-8">
            To be successful on our journey towards digital care plans, we need your help.
          </p>

          <div className="cta-card">
            <div className="cta-icon">
              <Image src={`${IMG}/part3/part9_card1.png`} alt="Patients icon" width={80} height={80} className="w-full h-auto" />
            </div>
            <div>
              <h3>Patients, Otherwise Known as &quot;People&quot;</h3>
              <ul>
                <li>Take part in building your care plan with your doctor. You&apos;re the most knowledgeable part of your care team.</li>
                <li>Ask questions. Be informed.</li>
                <li>Take responsibility for your own health. Live your care plan.</li>
              </ul>
            </div>
          </div>

          <div className="cta-card">
            <div className="cta-icon">
              <Image src={`${IMG}/part3/part9_card2.png`} alt="Designers icon" width={80} height={80} className="w-full h-auto" />
            </div>
            <div>
              <h3>Healthcare Designers &amp; Entrepreneurs</h3>
              <ul>
                <li>Adopt <a href="https://www.hl7.org/fhir/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">FHIR</a>. It&apos;s the lesser of all evils for now. Data MUST be interoperable.</li>
                <li>Know the clinical workflow. Your product should be a no-brainer for doctors, patients, and proxies.</li>
                <li>Give patients and their team authorship in the care plan process.</li>
              </ul>
            </div>
          </div>

          <div className="cta-card">
            <div className="cta-icon">
              <Image src={`${IMG}/part3/part9_card3.png`} alt="Medical community icon" width={80} height={80} className="w-full h-auto" />
            </div>
            <div>
              <h3>Medical Community</h3>
              <ul>
                <li>Patient engagement is worth the investment. Activated patients behave in healthier ways.</li>
                <li>Transparent communication and complete accessibility to data make for more informed, healthier patients.</li>
                <li>Consider building a broader care team for the patient that leverages the expertise of health coaches, family, and community networks, and facilitates communication between clinic visits.</li>
                <li>Collect evidence and adjust care to get better outcomes. Value-based care is taking over Medicare payments (50% by 2018).</li>
              </ul>
            </div>
          </div>

          <div className="cta-card">
            <div className="cta-icon">
              <Image src={`${IMG}/part3/part9_card4.png`} alt="Policy makers icon" width={80} height={80} className="w-full h-auto" />
            </div>
            <div>
              <h3>Policy Makers</h3>
              <ul>
                <li>Single payer - We can&apos;t better health until there is equal accessibility to care.</li>
                <li>Single standard - Meaningful Use 4 (or the next ONC health guidance as MU might be replaced) needs to dictate a national health data standard.</li>
                <li>National Care Plan Database - There should be clinical standards of care.</li>
                <li>Cost of Care Plans - Determine cost of ownership and creation of these future Care Plans, to contribute a standardized financial benchmark within a national care plan database.</li>
              </ul>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="coming-soon-links mt-8">
            <Link href="/vision/care-plans" className="coming-soon-link">
              <span className="text-2xl">&larr;</span>
              <div>
                <div className="link-title">Care Plans Part 1:</div>
                <div className="link-subtitle">An Overview</div>
              </div>
            </Link>
            <Link href="/vision/care-plans/part-2" className="coming-soon-link">
              <span className="text-2xl">&larr;</span>
              <div>
                <div className="link-title">Care Plans Part 2:</div>
                <div className="link-subtitle">The Current Landscape</div>
              </div>
            </Link>
          </div>

          <Divider />
        </div>
      </section>

      {/* ===== Authors ===== */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mb-8">Authors</h2>

          <Author
            name="Beckett Rucker"
            company="GoInvo"
            image={`${IMG}/contrib/beckett.jpg`}
          >
            <p>
              <strong>Beckett Rucker, MPD</strong> is designer, product strategist, and researcher. She concentrates on designing beautiful and surprising health services and systems from the skintop to celltop to desktop. She holds bachelors of arts in psychology and studio art from Rice University and a master of product development from Carnegie Mellon University. She has worked on design and service strategy for companies such as Seniorlink, Johnson &amp; Johnson, and Updox Patient Portals.
            </p>
          </Author>

          <Author
            name="Edwin Choi"
            company="GoInvo"
            image={`${IMG}/contrib/edwin.jpg`}
          >
            <p>
              <strong>Edwin Choi, MA</strong> is a biologist turned designer. Combining the sciences and art, he orchestrates healthcare software experiences to be beautiful and clinically refined. Edwin is a graduate of Washington University, and has a masters in biomedical design from Johns Hopkins University. He has worked on projects for companies including Partners Healthcare and Notovox.
            </p>
          </Author>

          <Author
            name="Danny van Leeuwen"
            company="Health Hats"
            image={`${IMG}/contrib/danny.jpg`}
          >
            <p>
              <strong>Danny van Leeuwen, RN, MPH, CPHQ</strong> is an action catalyst empowering people traveling together toward best health (patients, caregivers, clinicians). He wears many hats in healthcare: patient with MS, care partner for several family members&apos; end-of-life journeys, a nurse for 40+ years, an informaticist and a QI leader. Danny&apos;s current work focuses on communication at transitions of care, person-centered health planning, informed decision-making, and technology supporting solutions created with and for people at the center. He has collaborated with PCORI, AHRQ, and MassHealth among others.
            </p>
          </Author>

          <Divider />

          <h3 className="header-md mt-6 mb-3">Contributors</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/yanyang.jpg`} alt="Yanyang Zhou" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Yanyang Zhou</p>
                <p className="text-gray text-xs">Web Designer &amp; Developer</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/jenn.jpg`} alt="Jennifer Patel" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Jennifer Patel</p>
                <p className="text-gray text-xs">Web Designer &amp; Developer</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/juhan.jpg`} alt="Juhan Sonin" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Juhan Sonin</p>
                <p className="text-gray text-xs">GoInvo, MIT</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/jeffbelden.jpg`} alt="Jeff Belden, MD" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Jeff Belden, MD</p>
                <p className="text-gray text-xs">University of Missouri</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/joycelee.jpeg`} alt="Joyce Lee, MD, MPH" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Joyce Lee, MD, MPH</p>
                <p className="text-gray text-xs">University of Michigan</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/janesarasohnkahn.jpg`} alt="Jane Sarasohn-Kahn" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Jane Sarasohn-Kahn, MA, MHSA</p>
                <p className="text-gray text-xs">THINK-Health, Health Populi</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Image src={`${IMG}/contrib/harrysleeper.jpg`} alt="Harry Sleeper" width={64} height={64} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Harry Sleeper</p>
                <p className="text-gray text-xs">Healthcare Provocateur</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== References ===== */}
      <section className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto careplans-references">
          <h2>References</h2>
          <ol>
            <li>
              <a href="http://www.pewinternet.org/data-trend/mobile/device-ownership/">Device Ownership Over Time.</a>{' '}
              (2013). Pew Research Center.
            </li>
            <li>
              <a href="http://www.pewinternet.org/2015/04/01/us-smartphone-use-in-2015/">U.S. Smartphone Use in 2015.</a>{' '}
              (2015). Pew Research Center.
            </li>
            <li>
              <a href="http://www.nhsconfed.org/~/media/Confederation/Files/Publications/Documents/the-futures-digital.pdf">Mental Health Network. (2014).</a>{' '}
              NHS Confederation.
            </li>
            <li>
              Aronson, L., Bautista, C. A., &amp; Covinsky, K. (2015). Medicare and Care Coordination. JAMA, 313(8), 797.
            </li>
            <li>
              Lee, V. C. (2014). Mobile Devices and Apps for Health Care Professionals: Uses and Benefits. Pharmacy and Therapeutics, 39(4), 356-364.
            </li>
            <li>
              <a href="https://www.england.nhs.uk/2015/06/tim-kelsey-10/">NHS England: Putting digital to work for patients.</a>{' '}
              Tim Kelsey. (n.d.).
            </li>
            <li>
              Center for Technology and Aging. (2009). Technologies for Remote Patient Monitoring in Older Adults [Brochure].
            </li>
            <li>
              <a href="http://wiki.siframework.org/LCC+Longitudinal+Care+Plan+%28LCP%29+SWG">&quot;LCC Longitudinal Care Plan (LCP) SWG&quot;.</a>{' '}
              S&amp;I Framework.
            </li>
            <li>
              <a href="http://nursingworld.org/DocumentVault/NursingPractice/Life-Care-Planning-Scope-and-Standards.pdf">American Association of Nurse Life Care Planners.</a>{' '}
              (2015). Scope and Standards of Practice.
            </li>
            <li>
              <a href="https://www.oma.org/Resources/Documents/CoordinatedCarePlan_June2014.pdf">Key Elements to Include in a Coordinated Care Plan.</a>{' '}
              (2014). OMA.
            </li>
            <li>
              <a href="https://www.gov.uk/government/uploads/system/uploads/attachment_data/file/384650/NIB_Report.pdf">National Information Board of the UK.</a>{' '}
              (2014). Personalised Health and Care 2020.
            </li>
            <li>
              <a href="http://www.healthworkscollective.com/charles-settles/317786/most-innovative-patient-portal-features">The Most Innovative Patient Portal Features.</a>{' '}
              (n.d.).
            </li>
            <li>
              Topol, E. J. (n.d.). The patient will see you now: The future of medicine is in your hands.
            </li>
            <li>
              Winslow, R. (2015, May 10).{' '}
              <a href="http://www.wsj.com/articles/SB10001424052702303404704577311421888663472">The Wireless Revolution Hits Medicine.</a>{' '}
              The Wall Street Journal.
            </li>
            <li>
              Kish, L. J., &amp; Topol, E. J. (2015). Unpatients -- why patients should own their medical data. Nat Biotechnol Nature Biotechnology, 33(9), 921-924.
            </li>
            <li>
              <a href="http://wiki.hl7.org/index.php?title=Care_Plan_Project_2012">Care Plan Project 2012.</a>{' '}
              (2012). HL7.
            </li>
            <li>
              <a href="http://www.nga.org/files/live/sites/NGA/files/pdf/2015/1501TheExpandingRoleOfPharmacists.pdf">The Expanding Role of Pharmacists in a Transformed Health Care System.</a>{' '}
              (n.d.).
            </li>
            <li>
              Neal, L. (2007). Online health Communities. Proceedings of the Conference on Human Computer Interaction, 444-447.
            </li>
            <li>
              Phillips, L. (2015, April 21).{' '}
              <a href="http://www.hfma.org/Leadership/E-Bulletins/2015/April/What_Will_Health_Care_Look_Like_in_5-15_Years_/">What Will Health Care Look Like in 5-15 Years?</a>{' '}
              HFMA.
            </li>
            <li>
              <a href="http://www.healthaffairs.org/healthpolicybriefs/brief.php?brief_id=79">Nurse Practitioners and Primary Care.</a>{' '}
              Health Affairs. (n.d.).
            </li>
            <li>
              Heyworth, L., et al. (2014). Influence of Shared Medical Appointments on Patient Satisfaction: A Retrospective 3-Year Study. The Annals of Family Medicine, 12(4), 324-330.
            </li>
            <li>
              <a href="http://health.usnews.com/health-news/patient-advice/articles/2015/03/09/is-a-medical-home-in-your-future">Is a medical home in your future.</a>{' '}
              U.S. News &amp; World Report. (n.d.).
            </li>
            <li>
              <a href="http://www.modernhealthcare.com/article/20150128/NEWS/301289952">Where healthcare is now on march to value-based pay.</a>{' '}
              Modern Healthcare. (n.d.).
            </li>
            <li>
              Benjamin, R. M. (n.d.).{' '}
              <a href="http://www.ncbi.nlm.nih.gov/pmc/articles/PMC3185312/">The National Prevention Strategy: Shifting the Nation&apos;s Health-Care System.</a>{' '}
              Public Health Rep.
            </li>
            <li>
              GoInvo.{' '}
              <a href="http://www.carecards.me">&quot;Care Cards&quot;</a>{' '}
              (2016).
            </li>
          </ol>
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
