'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const ALGORITHMS = {
  VACCINE_DECISION_AIDS: 'vaccine-decision-aids',
  BLOOD_PRESSURE_MONITORING: 'blood-pressure-monitoring',
  AT_HOME_URINALYSIS: 'at-home-urinalysis',
  MENTAL_HEALTH_ASSESSMENTS: 'mental-health-assessments',
  VISION_TESTS: 'vision-tests',
  BLOOD_GLUCOSE_MONITORING: 'blood-glucose-monitoring',
  BREAST_SELF_EXAM: 'breast-self-exam',
  BIRTH_CONTROL_DECISION_AID: 'birth-control-decision-aid',
  AIR_QUALITY_MONITOR: 'air-quality-monitor',
  PULSE_OXIMETRY: 'pulse-oximetry',
}

const algorithms = [
  { id: ALGORITHMS.VACCINE_DECISION_AIDS, title: 'Vaccine Decision Aids', icon: '/images/vision/primary-self-care-algorithms/vaccine-decision-aids.svg' },
  { id: ALGORITHMS.BLOOD_PRESSURE_MONITORING, title: 'Blood Pressure Monitoring', icon: '/images/vision/primary-self-care-algorithms/blood-pressure-monitoring.svg' },
  { id: ALGORITHMS.AT_HOME_URINALYSIS, title: 'At-Home Urinalysis', icon: '/images/vision/primary-self-care-algorithms/at-home-urinalysis.svg' },
  { id: ALGORITHMS.MENTAL_HEALTH_ASSESSMENTS, title: 'Mental Health Assessments', icon: '/images/vision/primary-self-care-algorithms/mental-health-assessments.svg' },
  { id: ALGORITHMS.VISION_TESTS, title: 'Vision Tests', icon: '/images/vision/primary-self-care-algorithms/vision-tests.svg' },
  { id: ALGORITHMS.BLOOD_GLUCOSE_MONITORING, title: 'Blood Glucose Monitoring', icon: '/images/vision/primary-self-care-algorithms/blood-glucose-monitoring.svg' },
  { id: ALGORITHMS.BREAST_SELF_EXAM, title: 'Breast Self-Exam', icon: '/images/vision/primary-self-care-algorithms/breast-self-exam.svg' },
  { id: ALGORITHMS.BIRTH_CONTROL_DECISION_AID, title: 'Birth Control Decision Aid', icon: '/images/vision/primary-self-care-algorithms/birth-control-decision-aid.svg' },
  { id: ALGORITHMS.AIR_QUALITY_MONITOR, title: 'Air Quality Monitor', icon: '/images/vision/primary-self-care-algorithms/air-quality-monitor.svg' },
  { id: ALGORITHMS.PULSE_OXIMETRY, title: 'Pulse Oximetry', icon: '/images/vision/primary-self-care-algorithms/pulse-oximetry.svg' },
]

export function PscaAlgorithms() {
  const [activeId, setActiveId] = useState<string | null>(ALGORITHMS.VACCINE_DECISION_AIDS)
  const [allExpanded, setAllExpanded] = useState(false)

  useEffect(() => {
    const checkSize = () => {
      const isSmall = window.innerWidth < 864
      if (isSmall) {
        setAllExpanded(true)
        setActiveId(null)
      }
    }
    checkSize()
    window.addEventListener('resize', checkSize)
    return () => window.removeEventListener('resize', checkSize)
  }, [])

  const handleSelect = (id: string) => {
    setActiveId(id)
    setAllExpanded(false)
  }

  const toggleExpandAll = () => {
    if (allExpanded) {
      setActiveId(ALGORITHMS.VACCINE_DECISION_AIDS)
      setAllExpanded(false)
    } else {
      setActiveId(null)
      setAllExpanded(true)
    }
  }

  const isVisible = (id: string) => activeId === id || allExpanded

  return (
    <div className="max-width max-width-md content-padding mx-auto">
      <div className="flex justify-between items-baseline">
        <span />
        <button
          className="text-primary underline cursor-pointer hidden lg:inline"
          onClick={toggleExpandAll}
        >
          {allExpanded ? 'collapse' : 'expand all'}
        </button>
      </div>

      {/* Icon Grid - desktop only */}
      <div className="hidden lg:grid grid-cols-5 gap-3 mb-8">
        {algorithms.map((alg) => (
          <button
            key={alg.id}
            onClick={() => handleSelect(alg.id)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all text-center',
              activeId === alg.id
                ? 'border-primary bg-primary-lightest'
                : 'border-gray-light bg-white hover:border-gray-medium'
            )}
          >
            <Image src={alg.icon} alt="" width={60} height={60} className="w-[60px] h-[60px]" />
            <span className="text-sm font-medium leading-tight">
              {alg.title}
            </span>
          </button>
        ))}
      </div>

      {/* Algorithm Content */}
      <div className={cn(!isVisible(ALGORITHMS.VACCINE_DECISION_AIDS) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          1. Vaccine Decision Aids
        </h2>
        <p className="mt-0">
          The global response to the COVID-19 pandemic highlighted just
          how critical vaccination efforts are in mitigating the spread
          and severity of infectious diseases. In 2020, COVID-19 rose to
          the third leading cause of death in the US and caused 6.26
          million deaths globally<sup><a href="#references">2</a></sup>. In the decade, vaccine-preventable diseases like measles and
          pertussis have begun to rise as vaccine hesitancy spreads<sup><a href="#references">3</a></sup>. Despite the safety and efficacy of vaccines, getting people
          vaccinated has proven challenging due to a combination of
          mistrust in the scientific community, lack of education, and
          insufficient access.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            COVID-19: Vaccine Options (Original source no longer available)<sup><a href="#references">5</a></sup>
            <ul>
              <li>Copyright &copy; 2022 EBSCO Publishing, Inc.</li>
            </ul>
          </li>
          <li>
            <a href="https://cds.ahrq.gov/cdsconnect/artifact/immunization-calculation-engine-ice-0" className="text-primary underline">
              Immunization Calculation Engine (ICE)
            </a><sup><a href="#references">39</a></sup>
            <ul>
              <li>LGPLv3, open source</li>
            </ul>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/32163307/" className="text-primary underline">
              Patient decision aid in vaccination: a systematic review
              of the literature
            </a><sup><a href="#references">4</a></sup>
            <ul>
              <li>License not found, likely closed</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.BLOOD_PRESSURE_MONITORING) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          2. Blood Pressure Monitoring
        </h2>
        <p className="mt-0">
          Heart disease is the leading cause of death in the United
          States with more than 659,000 lives lost each year. Coronary
          heart disease, heart attacks, and other related heart
          conditions make up one in every four deaths, which amounts to
          spending $363 billion a year on healthcare services and
          medication<sup><a href="#references">10</a></sup>. The key risk factors of heart disease are behavior based:
          poor nutrition, physical inactivity, and high alcohol or drug
          consumption; early detection and promotion of healthy
          behaviors can prevent 34% of deaths due to heart disease<sup><a href="#references">11</a></sup>.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/hypertension-in-adults-screening" className="text-primary underline">
              The USPSTF provides an A grade recommendation for
              screening for hypertension in adults 18 years or older
              without hypertension
            </a><sup><a href="#references">12</a></sup>
            <ul>
              <li>
                Copyright Notice. U.S. Preventative Task Force.
                September 2017
              </li>
            </ul>
          </li>
          <li>
            <a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5604965/" className="text-primary underline">
              Self monitoring blood pressure in conjunction with
              clinical support in patients with hypertension yields
              significant BP reductions
            </a><sup><a href="#references">13</a></sup>
            <ul>
              <li>Copyright &copy; 2017 Tucker et al.</li>
              <li>Creative Commons Attribution License, open source</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.AT_HOME_URINALYSIS) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          3. At-Home Urinalysis
        </h2>
        <p className="mt-0">
          Kidney disease affects more than 15% of the US population, or
          1 in 7 people. However, 90% of affected individuals are
          unaware of their condition as symptoms typically don&apos;t appear
          until the late stages<sup><a href="#references">14</a></sup>. Key risk factors for kidney disease are comorbidities such
          as diabetes, hypertension, and obesity. Minority groups are at
          highest risk of developing severe kidney disease and kidney
          failure due to a higher prevalence of associated comorbidities
          and disparities in primary care access; as a result, these
          groups are less likely to receive pre-dialysis care and must
          wait longer for kidney transplants. Early detection of kidney
          disease is essential to ensuring that individuals can take
          preventative care measures or receive pre-dialysis treatment
          options.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://link.springer.com/article/10.1007/s00467-022-05556-8" className="text-primary underline">
              Healthy.io home-based urinalysis test kit and smartphone
              app
            </a><sup><a href="#references">15</a></sup>
            <ul>
              <li>
                <a href="https://old.healthy.io/licenses" className="text-primary underline">
                  Alamofire, version number 4.7.3, under the MIT License
                </a>, Open source
              </li>
            </ul>
          </li>
          <li>
            <a href="https://www.diagnoxhealth.com/blog/10-parameter-urinalysis-test-at-home" className="text-primary underline">
              10 parameter urinalysis dipstick test
            </a><sup><a href="#references">16</a></sup>
            <ul>
              <li>Lab Tests Online&reg;</li>
              <li>Copyright &copy; 2022 Regenstrief Institute, Inc</li>
            </ul>
          </li>
          <li>
            <a href="https://www.olive.earth/" className="text-primary underline">
              Toilet mountable at-home urinalysis
            </a><sup><a href="#references">17</a></sup>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.MENTAL_HEALTH_ASSESSMENTS) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          4. Mental Health Assessments
        </h2>
        <p className="mt-0">
          In the United States, 1 in 5 individuals live with a mental
          illness, with a higher prevalence among minorities and young
          adults; in 2020, only half of the 52.9 million affected people
          received any sort of treatment or counseling<sup><a href="#references">6</a></sup>. The stigmatization and poor education surrounding mental
          illness make it difficult for those seeking diagnosis and
          treatment. Suicide was the twelfth leading cause of death in
          the US in 2020 and most common in middle-aged white men<sup><a href="#references">7</a></sup>. Since three-fourths of mental illnesses begin before the age
          of 24, early identification and treatment are essential to
          lowering suicide and suicide attempt rates.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://www.psychiatrist.com/jcp/bipolar/computer-assisted-self-assessment-persons-severe-mental/" className="text-primary underline">
              Computer Assisted Self Assessment (CART) in persons with
              severe mental illness (SMI)
            </a><sup><a href="#references">8</a></sup>
            <ul>
              <li>License not found, likely closed</li>
            </ul>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/27489457/" className="text-primary underline">
              Ecological momentary assessment (EMA) to assess and
              support self-management in serious mental illness
            </a><sup><a href="#references">9</a></sup>
            <ul>
              <li>Copyright &copy; 2006 CMA Media Inc.</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.VISION_TESTS) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          5. Vision Tests
        </h2>
        <p className="mt-0">
          Vision impairment and blindness impact 2.2 billion people
          around the world, and more than half of these have not yet
          been diagnosed<sup><a href="#references">21</a></sup>. The most common vision loss diseases and leading causes of
          blindness are age-related macular degeneration, diabetic
          retinopathy, and glaucoma. Vision loss is also highly
          correlated to comorbidities like hearing impairment, kidney
          disease, stroke, arthritis, and heart disease<sup><a href="#references">22</a></sup>. Early screening and diagnosis of vision loss are key to
          correcting vision acuity before disease progression, and
          self-management of comorbidities can prevent further vision
          loss.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/6175935/" className="text-primary underline">
              A modified Amsler Grid test: self-assessment test for
              patients with macular disease
            </a><sup><a href="#references">23</a></sup>
          </li>
          <li>
            <a href="https://www.homeacuitytest.org/" className="text-primary underline">
              Home Acuity Test
            </a><sup><a href="#references">24</a></sup>
            <ul>
              <li>License not found</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.BLOOD_GLUCOSE_MONITORING) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          6. Blood Glucose Monitoring
        </h2>
        <p className="mt-0">
          One of the most prevalent chronic conditions in the US,
          diabetes is the seventh leading cause of death. There are 37.3
          million people currently living with diabetes in the country,
          and 38% of the adult population lives with pre-diabetes, which
          often goes undiagnosed until it progresses to Type 2 diabetes<sup><a href="#references">25</a></sup>. Early diagnosis and lifestyle changes can be effective in
          preventing diabetes progression, particularly for individuals
          with pre-diabetes. Comorbidities of diabetes include
          hypertension, chronic kidney disease, and cardiovascular
          disease, which means that early diagnosis, treatment, and
          lifestyle interventions are crucial.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/33441946/" className="text-primary underline">
              Self monitored blood glucose in association with glycemic
              control in newly diagnosed non-insulin treated diabetes
              patients
            </a><sup><a href="#references">26</a></sup>
          </li>
          <li>
            <a href="https://nightscout.github.io/#:~:text=Nightscout" className="text-primary underline">
              Nightscout, &quot;CGM in the Cloud&quot;
            </a><sup><a href="#references">27</a></sup>
            <ul>
              <li>Open source</li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.BREAST_SELF_EXAM) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          7. Breast Self-Exam
        </h2>
        <p className="mt-0">
          Breast cancer is the most prevalent cancer in the US and the
          second leading cause of cancer death in women. One in eight
          women (13%) are at risk of developing breast cancer during
          their lifetime. Black women in particular have the highest
          risk of developing breast cancer earlier than white women and
          experience a higher mortality rate than any other group. The
          incidence of breast cancer has been trending up in the past
          years, though deaths have been slowly decreasing, likely due
          to improved screening and early detection<sup><a href="#references">18</a></sup>.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://www.breastcancer.org/screening-testing/breast-self-exam-bse" className="text-primary underline">
              Breast Self-Exam (BSE)
            </a><sup><a href="#references">19</a></sup>
            <ul>
              <li>Copyright &copy; 2022. BreastCancer.org</li>
            </ul>
          </li>
          <li>
            <a href="https://bcrisktool.cancer.gov/index.html" className="text-primary underline">
              Breast Cancer Risk Assessment Tool
            </a><sup><a href="#references">20</a></sup>
            <ul>
              <li>
                <a href="https://dceg.cancer.gov/tools/risk-assessment/bcrasasmacro/license" className="text-primary underline">
                  BrCa RAM License Agreement
                </a>, Open source
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.BIRTH_CONTROL_DECISION_AID) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          8. Birth Control Decision Aid
        </h2>
        <p className="mt-0">
          Globally, more than 200 million women face an unmet need for
          family planning options and contraceptives, and 1.4 million
          unplanned pregnancies occur each year<sup><a href="#references">28</a></sup>. Inadequate access to contraception is directly related to
          higher rates of unintended pregnancies and births, higher
          rates of STDs, and poorer educational and economic outcomes.
          There are lower rates of contraception usage among racial and
          ethnic minorities, a reflection of inequities in healthcare
          access and insufficient education around reproductive health.
          Contraceptive access and education are effective in reducing
          unintended pregnancies and in turn increasing high school
          graduation rates<sup><a href="#references">29</a></sup>. Women who want to avoid pregnancy often cite lack of access
          as a reason for not using contraception, but concerns about
          side effects and lack of knowledge are also barriers to access<sup><a href="#references">30</a></sup>.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://www.pcori.org/research-results/2013/decision-aid-help-women-choose-and-use-method-birth-control" className="text-primary underline">
              A Decision Aid to Help Women Choose and Use a Method of
              Birth Control, PCORI
            </a><sup><a href="#references">31</a></sup>
            <ul>
              <li>
                Copyright 2019. University of California San Francisco
              </li>
            </ul>
          </li>
          <li>
            <a href="https://www.reproductiveaccess.org/wp-content/uploads/2014/06/2020-09-contra-choices.pdf" className="text-primary underline">
              Your Birth Control Choices
            </a><sup><a href="#references">32</a></sup>
            <ul>
              <li>
                Creative Commons Attribution-NonCommercial-ShareAlike
                4.0 International License, Open source
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.AIR_QUALITY_MONITOR) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          9. Air Quality Monitor
        </h2>
        <p className="mt-0">
          Chronic respiratory diseases are the third leading cause of
          death in the US and account for 7.5 million deaths worldwide
          each year<sup><a href="#references">33</a></sup>. These respiratory illnesses include chronic obstructive
          pulmonary disease (COPD), asthma, bronchitis, and other lung
          diseases. These conditions often start early in life and are
          exacerbated by environmental pollutants, poor nutrition,
          obesity, and lack of physical activity. Onset of these
          diseases can be determined by environmental factors such as
          irritants or allergens like smoke as well as lifestyle habits
          formed in adolescence, making it especially crucial that CRD
          risk factors are addressed early on.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://sustainenvironres.biomedcentral.com/articles/10.1186/s42834-020-0047-y" className="text-primary underline">
              Indoor air quality monitoring systems for public health
            </a><sup><a href="#references">34</a></sup>
            <ul>
              <li>
                Creative Commons Attribution 4.0 International License,
                Open source
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <div className={cn(!isVisible(ALGORITHMS.PULSE_OXIMETRY) && 'hidden')}>
        <h2 className="font-serif text-2xl mt-0 mb-0">
          10. Pulse Oximetry
        </h2>
        <p className="mt-0">
          A pulse oximeter is an electronic device that clips onto a
          patient&apos;s fingertip or ear to measure the saturation of oxygen
          in their blood. The reading is noninvasive and painless, and
          results take less than a minute<sup><a href="#references">35</a></sup>. Pulse oximetry is often considered the &quot;fifth vital sign&quot; as
          it is used for routine screenings of pulmonary health,
          diabetes, and sleep disorders.
        </p>
        <h4 className="font-serif text-base font-semibold mb-0">Models</h4>
        <ul className="mt-0 mb-8">
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/25880649/" className="text-primary underline">
              Overnight Pulse Oximetry to diagnose patients with
              moderate to severe obstructive sleep apnea
            </a><sup><a href="#references">36</a></sup>
          </li>
          <li>
            <a href="https://pubmed.ncbi.nlm.nih.gov/32521167/" className="text-primary underline">
              Pulse Oximetry for Monitoring Patients with COVID-19 at
              home
            </a><sup><a href="#references">37</a></sup>
          </li>
        </ul>
      </div>
    </div>
  )
}
