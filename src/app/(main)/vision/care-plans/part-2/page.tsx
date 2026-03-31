import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import '../careplans.css'

const IMG = 'https://www.goinvo.com/old/images/features/careplans'

export const metadata: Metadata = {
  title: 'Care Plans Part 2: The Current Landscape',
  description: 'How are care plans being used?',
}

export default function CarePlansPart2Page() {
  return (
    <div>
      {/* Hero */}
      <div className="careplans-hero" style={{ minHeight: 480, background: '#8DB8C6' }}>
        <div className="hero-bg">
          <Image
            src={`${IMG}/part2/hero_bg.jpg`}
            alt="Care Plans Part 2 background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="hero-content">
          <Link href="/vision/care-plans" className="no-underline hover:opacity-80 transition-opacity">
            <p className="big-title">CARE</p>
            <p className="big-title">PLANS</p>
          </Link>
          <p className="sub-title">PART 2: THE CURRENT LANDSCAPE</p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="careplans-nav">
        <nav>
          <a href="#process">Process</a>
          <a href="#product">Product</a>
          <a href="#barriers">Barriers</a>
          <a href="#next-steps">Next Steps</a>
        </nav>
      </div>

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <p className="text-gray leading-relaxed mb-4">
            This piece is a continuation of the Care Plan series. While{' '}
            <Link href="/vision/care-plans" className="text-primary hover:underline">Part 1</Link>{' '}
            focused on what care plans are and how they came about, this article will explore how care plans are currently being used in the health space.
          </p>
        </div>
      </section>

      {/* ===== SECTION 1: Process ===== */}
      <section id="process" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            The Process of a Care Plan
          </h1>
          <p className="text-gray leading-relaxed mb-4">
            There is not yet any clinically recognized universal standard for care plan creation and implementation. But using elements derived from CMS&apos;s Meaningful Use Stage 2 requirements,<span className="superscript">1,2</span> the Coordinated Care Plan documentation from the Ontario Medical Association,<span className="superscript">3</span> the traditional nursing care plan structure,<span className="superscript">4</span> and the Care Plan Glossary from the ONC&apos;s Standards and Interoperability Framework,<span className="superscript">5</span> we have created a generalized care plan journey map below.
          </p>
          <p className="text-gray leading-relaxed mb-8">
            The journey begins with a patient visiting his primary care doctor.
          </p>

          {/* Journey Map Images (Desktop) */}
          <div className="hidden md:block space-y-1 mb-8">
            <Image src={`${IMG}/part2/careplan_journey_health_history_web.png`} alt="Understand Health History" width={1000} height={200} className="w-full h-auto" />
            <Image src={`${IMG}/part2/careplan_journey_identify_health_concerns_web.png`} alt="Identify Health Concerns" width={1000} height={200} className="w-full h-auto" />
            <Image src={`${IMG}/part2/careplan_journey_set_goals_web.png`} alt="Set Goals" width={1000} height={200} className="w-full h-auto" />
            <Image src={`${IMG}/part2/careplan_journey_instruct_web.png`} alt="Instruct and Intervene" width={1000} height={200} className="w-full h-auto" />
            <Image src={`${IMG}/part2/careplan_journey_care_team_web.png`} alt="Enlist Care Team" width={1000} height={200} className="w-full h-auto" />
            <Image src={`${IMG}/part2/careplan_journey_specify_review_web.png`} alt="Specify Outcomes to Review" width={1000} height={200} className="w-full h-auto" />
            <Image src={`${IMG}/part2/careplan_journey_live_care_plan_web.png`} alt="Live the Care Plan" width={1000} height={200} className="w-full h-auto" />
          </div>

          {/* Process Steps */}
          <div className="process-journey">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Understand Health History</h3>
                <Image src={`${IMG}/part2/careplan_journey_health_history_mobile.png`} alt="Understand Health History" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>The beginning of any care plan process, whether creation or review, requires an understanding of the patient&apos;s health history. This should be summative in nature, and include basic information such as demographics, care team, vitals, problems, allergies, medications, therapies, notable encounters or procedures, and an indication of whether an advance care plan is in place. It is important to keep a patient summary up to date so that any care professional can reference it in an emergency.</p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Identify Health Concerns</h3>
                <Image src={`${IMG}/part2/careplan_journey_identify_health_concerns_mobile.png`} alt="Identify Health Concerns" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>The next step is to identify what the current problems or health concerns are. This can involve reviewing symptomology, eating habits, physical activity, sleep habits, psychological issues, management of medication, sexual health, cessation of bad habits, management of any other daily activity, or any social or environmental factors on health. Collection of vitals might also be involved in the identification of health concerns.</p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Set Goals</h3>
                <Image src={`${IMG}/part2/careplan_journey_set_goals_mobile.png`} alt="Set Goals" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>Goals are set to improve or resolve the identified health problems by the next review period. SMART goals (specific, measurable, achievable, realistic, time oriented) help break down goals into smaller specific steps. Goals should also be measured in a way that&apos;s quantifiable so that changes can be seen over a practice timeframe. These can include both patient defined goals such as longevity, function, comfort, etc., and clinician defined goals.</p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Instruct and Intervene</h3>
                <Image src={`${IMG}/part2/careplan_journey_instruct_mobile.png`} alt="Instruct and Intervene" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>After the desired outcomes are specified, the interventions and instructions on how to achieve those goals can be delivered. Instructions are educational directions to the patient/other providers about how to care for the patient&apos;s condition, what to do at home, when to call for help, additional appointments, testing, medication changes/instructions, among others. Interventions are specified actions taken as steps toward achieving care plan goals. This can include administration of physical treatment, creation or adjustment to the medication plan, prescribed activities or community/social services, or removal of barriers to success.</p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">5</div>
              <div className="step-content">
                <h3>Enlist Care Team</h3>
                <Image src={`${IMG}/part2/careplan_journey_care_team_mobile.png`} alt="Enlist Care Team" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>A team of individuals should be enlisted in the care of the patient. The care team includes both professional parties who manage and/or provide care, including medical practitioners, nurses, allied health practitioners (physiotherapist, speech therapist psychologist, pharmacist, etc.), social workers, and care managers; as well as non-professional members such as caregivers, family, friends, and the patient themselves. It should be determined by the patient which care team members are granted access to his or her health information.</p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">6</div>
              <div className="step-content">
                <h3>Specify Outcomes to Review</h3>
                <Image src={`${IMG}/part2/careplan_journey_specify_review_mobile.png`} alt="Specify Outcomes to Review" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>It is important to set a specific time for review of the care plan to determine whether patient needs are being met and if adjustments need to be made. Low level, relatively healthy individuals may only need an annual review of the care plan, whereas those with more severe chronic illnesses may need a much more frequent checkup. Specific metrics for followup should be determined based on the health concerns and goals set.</p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">7</div>
              <div className="step-content">
                <h3>Live the Care Plan</h3>
                <Image src={`${IMG}/part2/careplan_journey_live_care_plan_mobile.png`} alt="Live the Care Plan" width={600} height={150} className="w-full h-auto mb-3 md:hidden" />
                <p>The most important part of the care plan process is how the patient implements it. They must translate guidance from their brief interactions with clinicians into sustained lifestyle behaviors to improve their own health. Self care makes up over 99% of healthcare, and it is only successful with a good care plan.</p>
              </div>
            </div>

            <div className="text-center mt-4">
              <Image src={`${IMG}/part2/careplan_journey_arrow.png`} alt="Cycle arrow" width={100} height={50} className="inline-block h-auto w-16 mb-2" />
              <p className="text-gray text-sm italic">The process is a cycle. Patients live the care plan until the next medical encounter.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 2: Product Landscape ===== */}
      <section id="product" className="py-12">
        <div className="max-width content-padding mx-auto">
          <div className="max-width-md mx-auto">
            <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
              The Care Plan Product Landscape
            </h1>
            <p className="text-gray leading-relaxed mb-4">
              As of January 2015, CMS transitioned Medicare to the more quality-based practice of reimbursing for care management of eligible patients with 2 or more chronic conditions. Now, physicians, certified nurse specialists, nurse practitioners, and physician assistants are incentivized to perform 20 minutes of non-face-to-face care coordination services for every Medicare-qualifying patient each month. This can include tasks such as recording and coordinating patient health information (even from outside their own practice), managing care transitions (such as discharge from a hospitalization), coordinating clinical home or community services, systematic assessments of patient needs, and finally, the creation and review of a perpetually accessible comprehensive care plan. Now that Medicare has begun this transition, other private insurance companies are beginning to follow suit to prioritize consistent, preventative care facilitated by patient-accessible care plans. As a result, many care planning services have emerged to address the software needs of care management.
            </p>
            <p className="text-gray leading-relaxed mb-8">
              This matrix aims to explore the effectiveness of current care plan services based on defined criteria. Each service was scored based on the percentage of criteria met in each of the eleven topic areas. A 0 means that none of the criteria points were fulfilled. The final score, out of 100, is the average of the service&apos;s scores in each criteria area.
            </p>
          </div>

          {/* Product Matrix Table */}
          <div className="product-matrix-wrapper">
            <table className="product-matrix">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Interoperability</th>
                  <th>Patient Summary</th>
                  <th>Education</th>
                  <th>Goal Setting</th>
                  <th>Vitals Tracking</th>
                  <th>Dynamic Intervention</th>
                  <th>Data Ownership</th>
                  <th>Prof. Team Comm.</th>
                  <th>Non-prof. Team Comm.</th>
                  <th>Clinical Validity</th>
                  <th>Content Breadth</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_wellframe.png`} alt="Wellframe" width={100} height={40} className="h-auto" /></td>
                  <td>50</td><td>50</td><td>80</td><td>60</td><td>25</td><td>50</td><td>75</td><td>43</td><td>0</td><td>100</td><td>50</td><td><strong>53.00</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_healarium.png`} alt="Healarium" width={100} height={40} className="h-auto" /></td>
                  <td>33</td><td>25</td><td>60</td><td>80</td><td>50</td><td>50</td><td>75</td><td>0</td><td>0</td><td>75</td><td>75</td><td><strong>47.55</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_healthtap.png`} alt="HealthTap" width={100} height={40} className="h-auto" /></td>
                  <td>20</td><td>25</td><td>60</td><td>80</td><td>0</td><td>0</td><td>75</td><td>86</td><td>17</td><td>50</td><td>100</td><td><strong>46.64</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_amwell.png`} alt="Amwell" width={100} height={40} className="h-auto" /></td>
                  <td>40</td><td>75</td><td>20</td><td>0</td><td>25</td><td>0</td><td>75</td><td>71</td><td>0</td><td>75</td><td>100</td><td><strong>43.73</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_carezone.png`} alt="CareZone" width={100} height={40} className="h-auto" /></td>
                  <td>20</td><td>50</td><td>0</td><td>40</td><td>0</td><td>0</td><td>50</td><td>14</td><td>66</td><td>0</td><td>30</td><td><strong>24.55</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_caresync.png`} alt="CareSync" width={100} height={40} className="h-auto" /></td>
                  <td>80</td><td>100</td><td>20</td><td>40</td><td>50</td><td>0</td><td>100</td><td>29</td><td>83</td><td>25</td><td>100</td><td><strong>57.00</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_caringinplace.png`} alt="Caring in Place" width={100} height={40} className="h-auto" /></td>
                  <td>80</td><td>50</td><td>20</td><td>80</td><td>0</td><td>0</td><td>75</td><td>0</td><td>100</td><td>25</td><td>30</td><td><strong>34.55</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_bridge.png`} alt="Bridge" width={100} height={40} className="h-auto" /></td>
                  <td>100</td><td>75</td><td>40</td><td>20</td><td>0</td><td>0</td><td>75</td><td>57</td><td>0</td><td>50</td><td>70</td><td><strong>44.27</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_inxite.png`} alt="Inxite" width={100} height={40} className="h-auto" /></td>
                  <td>40</td><td>100</td><td>25</td><td>20</td><td>0</td><td>0</td><td>75</td><td>29</td><td>0</td><td>0</td><td>70</td><td><strong>32.64</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_medfusionplus.png`} alt="Medfusion Plus" width={100} height={40} className="h-auto" /></td>
                  <td>80</td><td>75</td><td>40</td><td>0</td><td>25</td><td>0</td><td>50</td><td>43</td><td>0</td><td>0</td><td>70</td><td><strong>34.82</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_intelichart.png`} alt="InteliChart" width={100} height={40} className="h-auto" /></td>
                  <td>80</td><td>50</td><td>0</td><td>0</td><td>25</td><td>0</td><td>75</td><td>29</td><td>0</td><td>50</td><td>80</td><td><strong>35.36</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_healthvault.png`} alt="HealthVault" width={100} height={40} className="h-auto" /></td>
                  <td>80</td><td>50</td><td>20</td><td>60</td><td>100</td><td>0</td><td>100</td><td>29</td><td>0</td><td>50</td><td>100</td><td><strong>53.55</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_askmd.png`} alt="AskMD" width={100} height={40} className="h-auto" /></td>
                  <td>0</td><td>25</td><td>40</td><td>0</td><td>25</td><td>50</td><td>75</td><td>29</td><td>0</td><td>0</td><td>80</td><td><strong>29.45</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_patientFusion.png`} alt="Patient Fusion" width={100} height={40} className="h-auto" /></td>
                  <td>83</td><td>75</td><td>20</td><td>20</td><td>25</td><td>0</td><td>100</td><td>29</td><td>0</td><td>50</td><td>70</td><td><strong>42.91</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_mychart.png`} alt="MyChart" width={100} height={40} className="h-auto" /></td>
                  <td>60</td><td>50</td><td>0</td><td>0</td><td>50</td><td>0</td><td>75</td><td>29</td><td>0</td><td>0</td><td>70</td><td><strong>30.36</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_happify.png`} alt="Happify" width={100} height={40} className="h-auto" /></td>
                  <td>83</td><td>0</td><td>60</td><td>60</td><td>25</td><td>0</td><td>50</td><td>0</td><td>0</td><td>25</td><td>10</td><td><strong>20.91</strong></td>
                </tr>
                <tr>
                  <td><Image src={`${IMG}/part2/careplan_matrix_healthkit.png`} alt="HealthKit" width={100} height={40} className="h-auto" /></td>
                  <td>33</td><td>25</td><td>0</td><td>0</td><td>75</td><td>0</td><td>50</td><td>0</td><td>0</td><td>0</td><td>100</td><td><strong>25.73</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="max-width-md mx-auto mt-8">
            <p className="text-gray leading-relaxed mb-4">
              There is a clear distinction between patient portal services (Bridge, Patient Fusion, InteliChart) focused on data interoperability, health history, and professional care team communication; and the less clinical services (CareZone, HealthTap, Wellframe, Healarium) focused on patient engagement, goal setting, and non-professional care team communication. Wellframe, CareSync, and HealthVault are the few services that attempt to bridge the gap between those two focuses, putting them at the top of ranking as the more successful care plan services.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              However, certain deficits seem to be shared by almost all of these services. While interoperability is a growing focus, there still seems to be trouble in adopting a universal data standard for content and holding services to consistent clinical quality metrics. Many services successfully incorporate data tracking and visualizations, though there is virtually no presence of actual insight from this data. Users are not receiving projected outcomes or recommendations for behavior change based on collected data. Similarly, while users can access all of their health data, they rarely get to &quot;own&quot; it. This means being presented the raw data for export, sharing, and personal documentation.
            </p>
            <p className="text-gray leading-relaxed mb-4">
              These limitations, and others collected through secondary literature research are explored further below.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SECTION 3: Barriers ===== */}
      <section id="barriers" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            The Barriers to Care Planning
          </h1>

          <Image
            src={`${IMG}/part2/barriers_to_care_planning_web_and_mobile.jpg`}
            alt="Barriers to care planning infographic"
            width={1000}
            height={600}
            className="w-full h-auto mb-8 rounded"
          />

          <div className="barriers-grid">
            <div className="barrier-card">
              <h3>Episodic Review</h3>
              <p>Implementation of care plans are not always straightforward, and information must be updated in a fluid manner in order for it to be an effective plan. However, difficulties can arise when there is a lack of ability within a patient&apos;s circle of care providers to access and update care plans. One factor can include difficulty in using the tool or application to update care plans.<span className="superscript">3</span></p>
            </div>

            <div className="barrier-card">
              <h3>Inaccurate Information</h3>
              <p>The Change Foundation in Ontario found that up to a 1/3 of providers regularly relied on the caregiver and client to pass along information that was relevant to building the care plan.<span className="superscript">3</span> This can be an issue when human error, both on the client and care provider side, may cause inaccurate recording of an individual&apos;s information. Patients at times may give inaccurate information regarding medications currently being taken. Care providers also oftentimes misjudge a patient&apos;s capacity to manage themselves within a home environment.<span className="superscript">7</span></p>
            </div>

            <div className="barrier-card">
              <h3>Creation in Isolation</h3>
              <p>There is no current standardization of care plan content across health and social care organizations, as each functions under their own methods for care plan creation.<span className="superscript">9</span> This creates a lack of consistency across the medical community, and increases the potential for medical error when organizations must interface on behalf of a patient. Not to mention patients receiving different medical advice and instruction for the same illnesses across organizations will likely struggle with understanding and consequently, compliance.<span className="superscript">10</span></p>
            </div>

            <div className="barrier-card">
              <h3>Communication Issues</h3>
              <p>Patients and their medical providers suffer from poor information transfer, due to issues such as lack of time, lack of a standardized communication tool, the need to incorporate care planning and communication into the workflow, lack of compatible information technology across organizations, and privacy concerns of caregivers and patients. As healthcare IT systems are still in a relatively nascent stage and must adhere to a variety of patient confidentiality regulations, effective communication is still a crucial limitation.<span className="superscript">8</span></p>
            </div>

            <div className="barrier-card">
              <h3>Privacy Concerns</h3>
              <p>Many situations can arise where it&apos;s difficult to know who to share the patient&apos;s information with without causing privacy issues. An issue that causes problems in communication is that the caregivers themselves are sometimes reluctant to share information with care providers due to privacy concerns.<span className="superscript">6</span></p>
            </div>

            <div className="barrier-card">
              <h3>Patient Noncompliance</h3>
              <p>Patient compliance is a difficult issue to address, and may be part of the reason that new roles such as grand-aides are beginning to appear in the healthcare landscape.<span className="superscript">11</span> Some patients are not motivated to set goals. Others have issues complying with their medication and diet requirements. Those with mental illnesses are even more prone to discontinue medications without consulting a care provider.<span className="superscript">3</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SECTION 4: Next Steps ===== */}
      <section id="next-steps" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] lg:text-[2.25rem] font-light mb-6">
            The Next Steps for Care Plans
          </h1>
          <p className="text-gray leading-relaxed mb-8">
            Care plans have come a long way since their conception. We have created a somewhat systematic approach to a patient health guide, yet have not standardized it for consistent communication and delivery of care. We have established appropriate intervention steps for a variety of diagnosed conditions, yet have not mastered the format and delivery of these steps so that they are effective and engaging to patients. We have figured out how to collect massive amounts of crucial patient health data, yet we have not offered that data to the patient to carry with them and seamlessly share throughout their diverse medical encounters. We are only on the cusp of the health technology wave, and care plans have a bright future ahead of them. Want a glimpse? Check out our next feature.
          </p>

          {/* Navigation Links */}
          <div className="coming-soon-links">
            <Link href="/vision/care-plans" className="coming-soon-link">
              <span className="text-2xl">&larr;</span>
              <div>
                <div className="link-title">Care Plans Part 1:</div>
                <div className="link-subtitle">An Overview</div>
              </div>
            </Link>
            <Link href="/vision/care-plans/part-3" className="coming-soon-link">
              <div>
                <div className="link-title">Care Plans Part 3:</div>
                <div className="link-subtitle">The Future</div>
              </div>
              <span className="text-2xl">&rarr;</span>
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
              <a href="https://www.cms.gov/Regulations-and-Guidance/Legislation/EHRIncentivePrograms/downloads/Stage2_EPCore_15_SummaryCare.pdf">&quot;Stage 2 Meaningful Use Core Measures&quot;.</a>{' '}
              (2015, August). Retrieved from CMS.gov
            </li>
            <li>
              United States, Department of Health and Human Services.{' '}
              <a href="https://www.cms.gov/Outreach-and-Education/Medicare-Learning-Network-MLN/MLNProducts/Downloads/ChronicCareManagement.pdf">&quot;Chronic Care Management Services&quot;.</a>{' '}
              (2015, May). Centers for Medicare and Medicaid Services.
            </li>
            <li>
              <a href="https://www.oma.org/Resources/Documents/CoordinatedCarePlan_June2014.pdf">&quot;Key Elements to Include in a Coordinated Care Plan&quot;.</a>{' '}
              OMA. (2014, June).
            </li>
            <li>
              <a href="http://www.nhs.uk/Planners/Yourhealth/Pages/Careplan.aspx">&quot;NHS Guide to long-term conditions and self care: What is a care plan?&quot;</a>{' '}
              (n.d.).
            </li>
            <li>
              <a href="http://wiki.siframework.org/LCC+Longitudinal+Care+Plan+%28LCP%29+SWG">General Information.</a>{' '}
              (n.d.). S&amp;I Framework.
            </li>
            <li>
              <a href="https://www.ipc.on.ca/images/Resources/circle-of-care.pdf">Circle of Care.</a>{' '}
              (2015, August).
            </li>
            <li>
              Palmieri, J. J., &amp; Stern, T. A. (2009). Lies in the Doctor-Patient Relationship. Prim. Care Companion J. Clin. Psychiatry, 11(4), 163-168.
            </li>
            <li>
              <a href="https://med.stanford.edu/news/all-news/2014/12/better-communication-between-caregivers-reduces-medical-errors.html">Better communication between caregivers reduces medical errors, study finds.</a>{' '}
              (n.d.). Stanford Medicine.
            </li>
            <li>
              <a href="https://www.hl7.org/fhir/careplan.html">Resource Careplan.</a>{' '}
              (n.d.). HL7 FHIR.
            </li>
            <li>
              <a href="http://www.brainline.org/content/2009/06/how-to-deal-with-conflicting-advice-from-healthcare-professionals.html">How to Deal with Conflicting Advice from Healthcare Professionals.</a>{' '}
              (n.d.).
            </li>
            <li>
              Garson, A., Green, D. M., Rodriguez, L., Beech, R., &amp; Nye, C. (2012). A New Corps Of Trained Grand-Aides Has The Potential To Extend Reach Of Primary Care Workforce And Save Money. Health Affairs, 31(5), 1016-1021.
            </li>
            <li>
              <a href="http://www.wellframe.com/">Wellframe.</a> (n.d.).
            </li>
            <li>
              <a href="http://www.healarium.com/">Healarium.</a> (n.d.).
            </li>
            <li>
              <a href="https://www.healthtap.com/">HealthTap.</a> (n.d.).
            </li>
            <li>
              <a href="https://amwell.com/">Amwell.</a> (n.d.).
            </li>
            <li>
              <a href="https://carezone.com/home">CareZone | Easily organize health information in one place.</a> (n.d.).
            </li>
            <li>
              <a href="http://www.caresync.com/">CareSync.</a> (n.d.).
            </li>
            <li>
              <a href="http://caringinplace.com/website/index.html">Caring in Place.</a> (n.d.).
            </li>
            <li>
              <a href="http://www.bridgepatientportal.com/">Patient Portal Software for Hospitals and Physicians :: Bridge Patient Portal.</a> (n.d.).
            </li>
            <li>
              <a href="https://www.inxitehealth.com/">Inxite Health Systems.</a> (n.d.).
            </li>
            <li>
              <a href="http://www.journeyforward.org/planning-tools/my-care-plan">My Care Plan.</a> (n.d.).
            </li>
            <li>
              <a href="http://www.intelichart.com/">Online Patient Portal Software - InteliChart.</a> (n.d.).
            </li>
            <li>
              <a href="https://www.healthvault.com/us/en">Microsoft HealthVault.</a> (n.d.).
            </li>
            <li>
              <a href="https://www.patientfusion.com/">Patient Fusion.</a> (n.d.).
            </li>
            <li>
              <a href="https://www.epic.com/software-phr.php">Epic: Mobile Applications and Portals.</a> (n.d.).
            </li>
            <li>
              <a href="https://www.sharecare.com/askmd/get-started">AskMD.</a> (n.d.).
            </li>
            <li>
              <a href="http://www.medfusion.com/solutions/medfusion-plus/">Medfusion Plus - Medfusion.</a> (n.d.).
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
