'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { BostonCostComparisonChart } from './BostonCostComparisonChart'

/* ── Image helpers ──────────────────────────────── */
const IMG = 'https://www.goinvo.com/old/images/features/us-healthcare'

export function UsHealthcareContent() {
  /* ── Interactive state ─────────────────────────── */
  const [slidePanels, setSlidePanels] = useState<Record<string, boolean>>({})
  const [decisions, setDecisions] = useState<Record<number, 'positive' | 'negative'>>({})
  const [activeTab, setActiveTab] = useState('tab-1')
  const [activePerspective, setActivePerspective] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<string | null>(null)

  /* ── Medical bill visibility ───────────────────── */
  const billRef = useRef<HTMLDivElement>(null)
  const [billVisible, setBillVisible] = useState(false)

  useEffect(() => {
    const handler = () => {
      if (window.scrollY > 600) {
        setBillVisible(true)
      } else {
        setBillVisible(false)
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  /* ── Handlers ──────────────────────────────────── */
  const toggleSlide = useCallback((index: string) => {
    setSlidePanels((prev) => ({ ...prev, [index]: !prev[index] }))
  }, [])

  const handleDecision = useCallback((index: number, outcome: 'positive' | 'negative') => {
    setDecisions((prev) => ({ ...prev, [index]: outcome }))
  }, [])

  const scrollTo = useCallback((selector: string) => {
    const el = document.querySelector(selector)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleActionClick = useCallback((key: string) => {
    setActiveAction(key)
  }, [])

  const handlePerspectiveClick = useCallback((key: string) => {
    setActivePerspective(key)
    setActiveAction(null)
  }, [])

  return (
    <div className="us-healthcare-legacy">
      {/* ── Medical Bill (fixed sidebar) ──────────── */}
      <div
        id="medical-bill"
        ref={billRef}
        className={billVisible ? 'is-visible' : ''}
      >
        <h3>Medical Bill</h3>
        <table border={1}>
          <tbody className="all_costs">
            <tr data-reason="clinic"><td>Clinic Visit</td><td>$150</td></tr>
            <tr data-reason="xray"><td>X-ray</td><td>$100</td></tr>
            <tr data-reason="ct1"><td>CT Scan #1</td><td>$785</td></tr>
            <tr data-reason="ct2"><td>CT Scan #2</td><td>$785</td></tr>
            <tr data-reason="hospital"><td>Hospital Stay</td><td>$14,000</td></tr>
            <tr data-reason="total"><td>Total</td><td>$15,820</td></tr>
          </tbody>
        </table>
      </div>

      {/* ── Article Navigation (sticky) ──────────── */}
      <nav id="article-nav">
        <ul>
          <li><a onClick={() => scrollTo('#symptoms')}>1. Symptoms</a></li>
          <li><a onClick={() => scrollTo('#history')}>2. History</a></li>
          <li><a onClick={() => scrollTo('#diagnosis')}>3. Diagnosis</a></li>
          <li><a onClick={() => scrollTo('#prescription')}>4. Prescription</a></li>
          <li><a onClick={() => scrollTo('#participate')}>5. Participate</a></li>
          <li><a onClick={() => scrollTo('#authors')}>6. Authors</a></li>
          <li><a onClick={() => scrollTo('#bibliography')}>7. References</a></li>
        </ul>
      </nav>

      {/* ── Jumbotron / Hero ─────────────────────── */}
      <header className="jumbotron">
        <div className="layer">
          <div className="footnote">
            <a href="#s1" id="s1_ref"><sup>[1]</sup></a>
          </div>
          <h1>Healing U.S. Healthcare</h1>
          <h3>How do we save an ailing system?</h3>
          <h3>By Cecile Lu and Neil Rens</h3>
          <h3>September 2015</h3>
        </div>
      </header>

      <div className="content-wrapper">
        {/* ══════════════════════════════════════════
            BACKGROUND / INTRO
            ══════════════════════════════════════════ */}
        <article id="background">
          <p className="p-slide">
            $9,255. That&apos;s how much your health costs the U.S. every year.
            <a href="#s2" id="s2_ref"><sup>[2]</sup></a>{' '}
            You probably don&apos;t pay that amount, let alone use that amount in
            health services. In fact, 90% of Americans account for less than 33%
            of healthcare consumption
            <a href="#s3" id="s3_ref"><sup>[3]</sup></a>.
          </p>
          <p className="p-slide">
            Nonetheless, you are entangled in the $2.9 trillion
            <a href="#s4" id="s4_ref"><sup>[4]</sup></a>{' '}
            our country spends on healthcare. 24%
            <a href="#s5" id="s5_ref"><sup>[5]</sup></a>{' '}
            of the federal budget&mdash;your tax dollars&mdash;is part of this
            $2.9 trillion. You pay a lot. But what do you get, and how good is
            it?
          </p>
          <p className="p-slide">
            Consider David. He just left his job as a high school teacher to
            launch an education-technology startup. With the change, he lost his
            health coverage and must decide whether to purchase new insurance.
            He&apos;s healthy&mdash;does he really need health coverage?
          </p>
          <p className="p-slide">
            David is just one of the thousands of Americans facing tough choices
            like this one. He could be any one of us. What happens if
            David&apos;s gamble of good health fails him? Read on to follow
            David&apos;s healthcare journey as he navigates the current system.
            Then, discover our vision for better healthcare in the U.S. and
            contribute your own ideas.
          </p>
        </article>

        {/* ══════════════════════════════════════════
            SYMPTOMS
            ══════════════════════════════════════════ */}
        <article id="symptoms">
          <h2>Symptoms</h2>
          <p className="p-slide">
            Two weeks ago, David was going about his daily life. Yesterday he was
            bedridden in a hospital, battling an infection he contracted in that
            hospital. Now he&apos;s back at home, trying to figure out how to
            pay off his massive{' '}
            <span
              className="slide"
              onClick={() => toggleSlide('1')}
            >
              medical debt
            </span>
            . How did he get here?
          </p>

          {/* Slide panel: medical debt */}
          <div className={`slide-panel${slidePanels['1'] ? ' is-open' : ''}`}>
            <p>
              Medical debt refers to individual debt due to healthcare costs and
              related expenses. It is different from other debts because it is
              almost never accumulated by choice, and can add up quickly and
              unexpectedly. It can stem from any medical expenses, ranging from
              regular checkups to emergency room visits. Medical debt varies
              depending on insurance coverage and personal medical needs.
              <a href="#s6" id="s6_ref"><sup>[6]</sup></a>
            </p>
            <p>
              In the U.S., medical debt accounts for more than 50% of all
              overdue debt that appears on credit reports. For 15 million people,
              medical debt is the only debt they have in collections in their
              credit report.
              <a href="#s7" id="s7_ref"><sup>[7]</sup></a>
            </p>
          </div>

          <p className="p-slide">
            The process was set in motion when David had to decide whether or
            not to buy health insurance. With the passage of the{' '}
            <span
              className="slide"
              onClick={() => toggleSlide('5')}
            >
              Patient Protection and Affordable Care Act (ACA)
            </span>
            , every American has to either purchase health insurance or pay a
            penalty tax each year.
          </p>

          {/* Slide panel: ACA */}
          <div className={`slide-panel${slidePanels['5'] ? ' is-open' : ''}`}>
            <p>
              The purpose of the Patient Protection and Affordable Care Act
              (also known as ACA or Obamacare) is to &ldquo;increase the number
              of Americans covered by health insurance and decrease the cost of
              healthcare.&rdquo; Insurance companies are no longer allowed to
              deny people coverage and they can no longer revoke coverage when
              people get sick. People are no longer forced to pay extra for
              insurance because of pre-existing conditions.
              <a href="#s8" id="s8_ref"><sup>[8]</sup></a>
            </p>
            <p>
              To make insurance more accessible, the Affordable Care Act
              implemented Health Insurance Exchanges. The exchanges function as
              marketplaces for health insurance plans.
              <a href="#s9" id="s9_ref"><sup>[9]</sup></a>{' '}
              Americans can use their state&apos;s marketplace to obtain
              coverage from competing private healthcare providers. People can
              now compare prices of qualified health plans to choose the best
              fit in terms of coverage, premiums, and deductibles.
            </p>
            <p>
              The Affordable Care Act also implemented pay-for-performance
              incentives, which pays healthcare providers for outcomes instead
              of for services. While there have not been any adverse effects,
              the system has yet to show much evidence of success in improving
              patient outcomes.
              <a href="#s10" id="s10_ref"><sup>[10]</sup></a>
            </p>
          </div>

          {/* ── Decision Point 0: Insurance ──────── */}
          <p className="p-slide">What should David do?</p>
          <div className="decision-point">
            <div className="decision-container">
              <div
                className="decision"
                data-selected={
                  decisions[0] === 'positive'
                    ? 'yes'
                    : decisions[0] === 'negative'
                    ? 'no'
                    : undefined
                }
                onClick={() => handleDecision(0, 'positive')}
              >
                <h3>Buy Health Insurance</h3>
                <p className="description">
                  The cheapest plan on the Massachusetts healthcare exchange is
                  the{' '}
                  <span className="slide" onClick={(e) => { e.stopPropagation(); toggleSlide('2'); }}>
                    bronze plan
                  </span>
                  , which costs $180 per month ($2,160 per year). It covers
                  doctor visits, home visits, ambulatory care, hospitalization,
                  vision exams, and hearing exams.
                </p>
              </div>
              <div
                className="decision"
                data-selected={
                  decisions[0] === 'negative'
                    ? 'yes'
                    : decisions[0] === 'positive'
                    ? 'no'
                    : undefined
                }
                onClick={() => handleDecision(0, 'negative')}
              >
                <h3>Pay Tax, No Coverage</h3>
                <p className="description">
                  David is healthy, so why buy insurance? The penalty for not
                  buying insurance is either 2% of yearly income or $325,
                  whichever is greater. This is much less expensive than the
                  $2,160 per year bronze plan.
                </p>
              </div>
            </div>

            {/* Positive outcome */}
            <div
              className={`outcome-container${decisions[0] === 'positive' ? ' is-open done-transitioning' : ''}`}
              data-outcome="positive"
            >
              <p className="outcome">
                Good choice! David can get preventative care for free. He also
                can afford to keep seeing his primary care physician. Equally
                important, in case anything unexpected happens David can get
                affordable access to the care he needs.
              </p>
              <p className="next">
                But what if he had opted to pay the tax instead?
              </p>
            </div>

            {/* Negative outcome */}
            <div
              className={`outcome-container${decisions[0] === 'negative' ? ' is-open done-transitioning' : ''}`}
              data-outcome="negative"
            >
              <p className="outcome">
                At the time, David thought opting out would save him money.
                Initially, it did because the penalty tax is less than the least
                expensive insurance plan. But even healthy people can become
                sick.
              </p>
              <p className="next">Here&apos;s what happens next.</p>
            </div>
          </div>

          {/* Slide panel: Bronze plan */}
          <div className={`slide-panel${slidePanels['2'] ? ' is-open' : ''}`}>
            <p>
              Bronze Plan coverage typically means that insurance companies pay
              for around 60% of covered healthcare expenses and the consumer
              pays for the rest. The Affordable Care Act requires insurance
              companies to offer Gold, Silver, and Platinum plans along with
              Bronze.
              <a href="#s11" id="s11_ref"><sup>[11]</sup></a>{' '}
              Each offers a tradeoff between premiums and deductibles.
            </p>
            <p>
              When the Affordable Care Act was first implemented, users spent
              hours on healthcare.gov before being able to purchase their
              insurance. Not only was the server overwhelmed by the massive
              influx of information,
              <a href="#s12" id="s12_ref"><sup>[12]</sup></a>{' '}
              but also the user interface was poorly designed
              <a href="#s13" id="s13_ref"><sup>[13]</sup></a>{' '}
              and the cost calculator sometimes provided inaccurate information
              about subsidies.
              <a href="#s14" id="s14_ref"><sup>[14]</sup></a>{' '}
              The poor implementation may have caused some people, like David,
              to opt out of the plans in favor of the 2%* penalty tax.
              <a href="#s15" id="s15_ref"><sup>[15]</sup></a>
            </p>
            <p>
              Despite the slow start, 9 out of 10 Americans now have insurance.
              Prior to the implementation of the Affordable Care Act, only 8 out
              of 10 Americans were insured.
              <a href="#s16" id="s16_ref"><sup>[16]</sup></a>
            </p>
            <p>
              *Starting in 2016, the tax will increase to 2.5% or $695,
              whichever is higher.
            </p>
          </div>

          <p className="p-slide">
            Without health insurance, David stops seeing his primary care
            physician. Not only does he lose his first point of contact for
            health concerns, but he also stops receiving preventative treatments
            like vaccines.
          </p>
          <p className="p-slide">
            One day, David begins having coughing fits. He assumes he will get
            better in a few days, but he doesn&apos;t. After a week, the
            symptoms continue to persist.
          </p>

          {/* ── Decision Point 1: Telemedicine ───── */}
          <p className="p-slide">What should David do?</p>
          <div className="decision-point">
            <div className="decision-container">
              <div
                className="decision"
                data-selected={
                  decisions[1] === 'positive'
                    ? 'yes'
                    : decisions[1] === 'negative'
                    ? 'no'
                    : undefined
                }
                onClick={() => handleDecision(1, 'positive')}
              >
                <h3>Use Telemedicine</h3>
                <p className="description">
                  David video chats with a doctor using his smartphone.
                </p>
              </div>
              <div
                className="decision"
                data-selected={
                  decisions[1] === 'negative'
                    ? 'yes'
                    : decisions[1] === 'positive'
                    ? 'no'
                    : undefined
                }
                onClick={() => handleDecision(1, 'negative')}
              >
                <h3>Get Some Rest</h3>
                <p className="description">
                  David has some soup and lies down for a nap. Maybe the
                  symptoms will resolve on their own.
                </p>
              </div>
            </div>

            <div
              className={`outcome-container${decisions[1] === 'positive' ? ' is-open done-transitioning' : ''}`}
              data-outcome="positive"
            >
              <p className="outcome">
                Good choice! The doctor prescribes antiviral therapy and David
                is back to normal within a few days.
              </p>
              <p className="next">
                But what if he did not have access to telemedicine services?
              </p>
            </div>
            <div
              className={`outcome-container${decisions[1] === 'negative' ? ' is-open done-transitioning' : ''}`}
              data-outcome="negative"
            >
              <p className="outcome">
                When David wakes up, his symptoms are worse.
              </p>
              <p className="next">Here&apos;s what happens next.</p>
            </div>
          </div>

          <p className="p-slide">
            The cough continues to worsen so David decides to go to a walk-in
            clinic. It&apos;s hard to{' '}
            <span className="slide" onClick={() => toggleSlide('6')}>
              compare the quality and cost of care
            </span>{' '}
            at different places because the information is not always readily
            available.
            <a href="#s17" id="s17_ref"><sup>[17]</sup></a>
            <a href="#s18" id="s18_ref"><sup>[18]</sup></a>{' '}
            David simply picks the one closest to his home.
          </p>

          {/* Slide panel: cost comparison */}
          <div className={`slide-panel${slidePanels['6'] ? ' is-open' : ''}`}>
            <p>
              In 2014, Massachusetts became the first state to require price
              information for different health procedures. For the first time,
              insurance companies were required to tell their customers how
              much the company pays for a given procedure or test.
              <a href="#s19" id="s19_ref"><sup>[19]</sup></a>{' '}
              However, it is still difficult to find accurate pricing
              information for people without insurance.
            </p>
          </div>
        </article>

        {/* ── Cost Comparison Chart ──────────────── */}
        <div className="chart-container" id="cost-comparison-boston-container">
          <p>
            Pneumonia treatment costs in Boston range from $10,000 to $31,000
            <a href="#s20" id="s20_ref"><sup>[20]</sup></a>
          </p>
          <BostonCostComparisonChart />
        </div>

        {/* ── Symptoms continued ─────────────────── */}
        <article>
          <p className="p-slide">
            After a physical examination, the doctor decides to X-ray
            David&apos;s chest. The radiologist who reads the scan notices a
            small nodule that cannot be characterized. He decides to look at
            David&apos;s health record to see if the nodule was previously
            documented.
          </p>
          <p className="p-slide">
            Does the doctor have access to David&apos;s{' '}
            <span className="slide" onClick={() => toggleSlide('3')}>
              Electronic Health Record
            </span>
            ?
          </p>

          {/* Slide panel: EHR */}
          <div className={`slide-panel${slidePanels['3'] ? ' is-open' : ''}`}>
            <p>
              An Electronic Health Record (EHR) contains the medical and
              treatment histories of patients and is designed to be inclusive of
              a broader view of a patient&apos;s care. EHRs enable the sharing
              of information between multiple healthcare providers and
              organizations. They contain information from all clinicians
              involved in a patient&apos;s care.
              <a href="#s21" id="s21_ref"><sup>[21]</sup></a>{' '}
              However, when EHRs became more widely implemented in 2004, the
              industry built hundreds of standalone systems to create and
              maintain EHRs.
              <a href="#s22" id="s22_ref"><sup>[22]</sup></a>{' '}
              Within each system data is shared, but there is little to no data
              flow between different systems.
            </p>
            <p>
              Problems arise with the lack of interoperability between EHR
              systems. Approximately 40% of medical errors are directly related
              to information omissions and miscommunications. EHR systems do not
              share information with each other and they all present information
              in different ways. This causes misread charts, forgotten results,
              and untimely information during life-threatening crises.
              <a href="#s23" id="s23_ref"><sup>[23]</sup></a>{' '}
              Other hospitals hesitate to transfer data in fear of incurring
              liability for sharing private information.
              <a href="#s24" id="s24_ref"><sup>[24]</sup></a>
            </p>
            <p>
              The 2009 Health Information Technology for Economic and Clinical
              Health (HITECH) Act promotes the adoption and meaningful use of
              health information technology such as EHRs.
              <a href="#s25" id="s25_ref"><sup>[25]</sup></a>{' '}
              Using money from the HITECH Act, the Centers for Medicare and
              Medicaid Services (CMS) provide incentive payments to eligible
              professionals and hospitals. The CMS Medicare and Medicaid EHR
              Incentive Programs encourage adoption, implementation, upgrades,
              and demonstration of meaningful use of certified EHR technology.
              <a href="#s26" id="s26_ref"><sup>[26]</sup></a>
            </p>
          </div>

          {/* ── Decision Point 2: EHR ────────────── */}
          <div className="decision-point">
            <div className="decision-container">
              <div
                className="decision"
                data-selected={
                  decisions[2] === 'positive'
                    ? 'yes'
                    : decisions[2] === 'negative'
                    ? 'no'
                    : undefined
                }
                onClick={() => handleDecision(2, 'positive')}
              >
                <h3>Of Course!</h3>
                <p className="description">
                  Electronic health records make it easy for doctors to access a
                  patient&apos;s medical information.
                </p>
              </div>
              <div
                className="decision"
                data-selected={
                  decisions[2] === 'negative'
                    ? 'yes'
                    : decisions[2] === 'positive'
                    ? 'no'
                    : undefined
                }
                onClick={() => handleDecision(2, 'negative')}
              >
                <h3>No</h3>
                <p className="description">
                  Even though David&apos;s previous doctor used an electronic
                  health record, it was a different system than this clinic
                  uses. Since the systems do not communicate with each other,
                  the doctor does not have instant access to David&apos;s
                  medical information.
                </p>
              </div>
            </div>

            <div
              className={`outcome-container${decisions[2] === 'positive' ? ' is-open done-transitioning' : ''}`}
              data-outcome="positive"
            >
              <p className="outcome">
                The doctor sees that David&apos;s nodule was previously
                characterized as scar tissue. With this information, there is
                no need for further imaging to investigate the nodule.
              </p>
              <p className="next">
                But what if the doctor didn&apos;t have access?
              </p>
            </div>
            <div
              className={`outcome-container${decisions[2] === 'negative' ? ' is-open done-transitioning' : ''}`}
              data-outcome="negative"
            >
              <p className="outcome">
                The doctor does not know that David&apos;s nodule is benign scar
                tissue.
              </p>
              <p className="next">Here&apos;s what happens next.</p>
            </div>
          </div>

          <p className="p-slide">
            Worried that the nodule could be malignant, the doctor advises David
            to have a CT scan so that the nodule can be examined in more detail.
            David is not told about the cost of the CT scan, only that it is
            important to keep him healthy. He agrees to the scan, which
            ultimately shows that the nodule is old and benign. The scan also
            uncovers a mass on David&apos;s left adrenal gland. Although there
            is a low suspicion for cancer, the doctors order another
            scan&mdash;this time with contrast&mdash;just to be sure the lesion
            is benign.
          </p>
        </article>

        {/* ── Waste Chart ────────────────────────── */}
        <div className="chart-container" id="waste-container">
          <div className="toggle-btn-grp cssonly">
            <div className="row">
              <div className="col-sm-4">
                <div className="toggle-rect">
                  <input
                    defaultChecked
                    id="dollarsWasted"
                    name="group4"
                    type="radio"
                  />
                  <label className="toggle-btn" htmlFor="dollarsWasted">
                    Dollars Wasted
                  </label>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="toggle-rect">
                  <input
                    id="unnecessaryProcedures"
                    name="group4"
                    type="radio"
                  />
                  <label className="toggle-btn" htmlFor="unnecessaryProcedures">
                    Nonrecommended
                  </label>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="toggle-rect">
                  <input
                    id="totalProcedures"
                    name="group4"
                    type="radio"
                  />
                  <label className="toggle-btn" htmlFor="totalProcedures">
                    Total Procedures
                  </label>
                </div>
              </div>
            </div>
          </div>
          <p className="note1">
            Nonrecommended statins cost more than $5 billion each year
            <a href="#s27" id="s27_ref"><sup>[27]</sup></a>
          </p>
          <p className="note2">*data are presented on a log scale</p>
          <div className="chart-placeholder">
            Interactive chart: Healthcare waste by category (requires D3.js)
          </div>
        </div>

        {/* ── Symptoms continued (hospital) ──────── */}
        <article>
          <p className="p-slide">
            Thankfully, the scan showed the mass to be benign. Unfortunately,
            David suffered a severe allergic reaction to the dye used for
            contrast.
          </p>
          <p className="p-slide">
            David is admitted to a nearby hospital for treatment. His condition
            improves after a few days, but suddenly David&apos;s temperature
            spikes and his coughing exacerbates. The diagnosis:{' '}
            <span className="slide" onClick={() => toggleSlide('4')}>
              hospital-acquired pneumonia
            </span>
            .
          </p>

          {/* Slide panel: hospital-acquired pneumonia */}
          <div className={`slide-panel${slidePanels['4'] ? ' is-open' : ''}`}>
            <p>
              Hospital-acquired pneumonia is a lung infection that occurs during
              a hospital stay. Infections contracted at a hospital can be
              especially dangerous because of two reasons. First, patients are
              often already very sick, making it difficult for them to fight an
              infection. Second, the types of bacteria in hospitals are often
              more resistant to antibiotics.
              <a href="#s28" id="s28_ref"><sup>[28]</sup></a>{' '}
              Pneumonia is one of the most common hospital-acquired infections,
              after urinary tract infections and wound infections. It has a 33%
              mortality rate, although the cause of death can be a combination
              of the pneumonia and other presenting illnesses.
              <a href="#s29" id="s29_ref"><sup>[29]</sup></a>
            </p>
            <p>
              440,000 patients die every year from preventable medical errors.
              <a href="#s30" id="s30_ref"><sup>[30]</sup></a>{' '}
              Medical errors are the third leading cause of death in the U.S.,
              following cancer and heart disease.
              <a href="#s31" id="s31_ref"><sup>[31]</sup></a>{' '}
              Studies show that up to 12% of people going to a hospital will
              suffer severe harm as a result.
              <a href="#s32" id="s32_ref"><sup>[32]</sup></a>
            </p>
            <p>
              Medicare is now punishing hospitals with high rates of infections
              and other medical errors in an attempt to increase patient safety.
              Publicly funded hospitals have been penalized the most because
              they take care of sicker populations and deal with more complex
              cases.
              <a href="#s33" id="s33_ref"><sup>[33]</sup></a>
            </p>
          </div>

          <p className="p-slide">
            After a week in the hospital, David&apos;s initial cough, allergic
            reaction, and pneumonia are successfully treated. But he isn&apos;t
            sent home empty-handed: he has a bill that says he owes $15,820.
          </p>
          <p className="p-slide">
            It doesn&apos;t have to be this way. If David had insurance, he
            would have had access to a primary care physician. More
            opportunities for self-care would have saved David time and money.
            If the two EHRs had talked to each other, David likely would not
            have had the second and third CT scans, preventing his allergic
            reaction and hospital-acquired pneumonia.
          </p>
          <p className="p-slide">
            <em>
              The account of David is fictional, but it&apos;s well within the
              realm of possibility.
            </em>
          </p>
        </article>

        {/* ══════════════════════════════════════════
            HISTORY
            ══════════════════════════════════════════ */}
        <article id="history">
          <h2>History</h2>
          <p className="p-slide">
            In the past century, there have been numerous attempts to reform the
            U.S. healthcare system. To understand why the reforms were proposed,
            it is important to examine how healthcare evolved in the U.S..
          </p>
        </article>

        {/* Timeline placeholder */}
        <div className="timeline-wrapper">
          <div className="chart-placeholder">
            Interactive timeline: History of U.S. Healthcare Reform (requires
            Knight Lab Timeline JS)
          </div>
        </div>

        <article>
          <p className="p-slide">
            This history of healthcare in the U.S. is by no means comprehensive,
            but it sheds light on how the healthcare system came to be what it
            is today.
            <a href="#s34" id="s34_ref"><sup>[34]</sup></a>
            <a href="#s35" id="s35_ref"><sup>[35]</sup></a>
            <a href="#s36" id="s36_ref"><sup>[36]</sup></a>
            <a href="#s37" id="s37_ref"><sup>[37]</sup></a>
            <a href="#s38" id="s38_ref"><sup>[38]</sup></a>
            <a href="#s39" id="s39_ref"><sup>[39]</sup></a>
          </p>
        </article>

        {/* ══════════════════════════════════════════
            DIAGNOSIS
            ══════════════════════════════════════════ */}
        <article id="diagnosis">
          <h2>Diagnosis</h2>
          <p className="p-slide">
            The healthcare system in the U.S. needs improvement. While
            healthcare is complex and nuanced, other industrialized countries
            are performing much better than the U.S.. In 2012, we spent more
            than $8,700 per capita
            <a href="#s40" id="s40_ref"><sup>[40]</sup></a>, far more than any
            other nation.
          </p>
        </article>

        {/* ── Triple Graph Tabs ──────────────────── */}
        <div id="triple-graph">
          <div className="tabs">
            <div className="row">
              <div className="col-sm-4">
                <div className="toggle-rect">
                  <div
                    className={`tab-link${activeTab === 'tab-1' ? ' current' : ''}`}
                    onClick={() => setActiveTab('tab-1')}
                  >
                    Spending Over Time
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="toggle-rect">
                  <div
                    className={`tab-link${activeTab === 'tab-2' ? ' current' : ''}`}
                    onClick={() => setActiveTab('tab-2')}
                  >
                    Spending vs. GDP
                  </div>
                </div>
              </div>
              <div className="col-sm-4">
                <div className="toggle-rect">
                  <div
                    className={`tab-link${activeTab === 'tab-3' ? ' current' : ''}`}
                    onClick={() => setActiveTab('tab-3')}
                  >
                    Quality
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`tab-content${activeTab === 'tab-1' ? ' current' : ''}`} id="tab-1">
            <p className="tab_p">
              Not only does the U.S. spend more, but healthcare spending is
              growing at a faster rate than in other countries.
              <a href="#s41" id="s41_ref"><sup>[41]</sup></a>
            </p>
            <div className="chart-placeholder">
              Interactive chart: Health spending per capita over time by country
              (requires D3.js)
            </div>
          </div>

          <div className={`tab-content${activeTab === 'tab-2' ? ' current' : ''}`} id="tab-2">
            <p className="tab_p">
              In 2012, the U.S. spent nearly 17% of its GDP on healthcare. The
              UK spent less than 10%.
              <a href="#s42" id="s42_ref"><sup>[42]</sup></a>
            </p>
            <div className="chart-placeholder">
              Interactive chart: GDP vs health spending per capita (requires
              D3.js)
            </div>
          </div>

          <div className={`tab-content${activeTab === 'tab-3' ? ' current' : ''}`} id="tab-3">
            <p className="tab_p">
              The U.S. spends the most money but ranks last in quality.
              <a href="#s43" id="s43_ref"><sup>[43]</sup></a>
            </p>
            <div className="chart-placeholder">
              Interactive chart: Quality vs health spending per capita (requires
              D3.js)
            </div>
          </div>
        </div>

        <article>
          <p className="p-slide">
            Despite this, we have lower quality and less access. The Patient
            Protection and Affordable Care Act initiated much needed
            comprehensive reforms. However, significant work remains. As the ACA
            continues to be implemented, it will need to be evaluated and
            adjusted. Some areas like malpractice reform were not addressed by
            the ACA and still need reform. But policymakers are not the only ones
            responsible for improving American healthcare. Patients, providers,
            payers, and inventors all play a role in changing the status quo.
          </p>
        </article>

        {/* ══════════════════════════════════════════
            PRESCRIPTION
            ══════════════════════════════════════════ */}
        <article id="prescription">
          <h2>Prescription</h2>
          <p className="p-slide">
            A successful healthcare system provides everyone with access to
            affordable, high quality care. This means that everyone has health
            insurance and can get care when they need it. It means information
            about quality and costs is readily available, and people can make
            informed decisions about the care they purchase.
          </p>
          <p className="p-slide">
            These are ambitious goals that will take years to achieve, but
            technology can expedite the process. Apps and wearables are already
            enabling more self-monitoring and self-care. Simultaneously,
            information about your DNA sequence allows for personalized
            medicine. In the future, people will only receive the treatments
            that will work for them.
          </p>
          <p className="p-slide">
            Other challenges like reforming malpractice laws, incentivizing
            outcomes, and improving EHR interoperability require legislative
            action. Some changes will be cultural. For example, why do we spend
            so much money on end-of-life care that reduces quality of life?
            Likewise, medical culture needs to be more patient-centered, which
            involves giving people access to their own health data.
          </p>
          <p className="p-slide">
            Ultimately, everyone has a role in healing the U.S. healthcare
            system. Below we explore the different actions that will lead to an
            improved system. Each is interconnected and influenced by patients,
            providers, policy makers, and payers. Discover the ways you can make
            a difference, and join the discussion by contributing your own
            ideas.
          </p>
        </article>

        {/* ── Sankey Diagram + Action Menu ────────── */}
        <div className="sankey-wrapper">
          <div id="sankeyGUI">
            <div className="sankey-menu">
              <div className="sankey-menu-wrapper">
                I am a
                <ul className="perspectives">
                  {['patient', 'provider', 'policymaker', 'payer'].map(
                    (key) => (
                      <li key={key} onClick={() => handlePerspectiveClick(key)}>
                        <div
                          className={`perspective${activePerspective === key ? ' selected' : ''}`}
                        >
                          <span>
                            {key === 'policymaker'
                              ? 'Policy Maker'
                              : key.charAt(0).toUpperCase() + key.slice(1)}
                          </span>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Patient actions */}
              {activePerspective === 'patient' && (
                <div className="sankey-menu-wrapper">
                  I want to change
                  <ul className="action-container">
                    {[
                      { key: 'everyone_covered', label: 'Everyone Gets Covered' },
                      { key: 'take_charge_of_health', label: 'Patients Take Charge of Their Own Health' },
                      { key: 'self_care', label: 'Self Care' },
                      { key: 'shop_quality_cost', label: 'People Shop for Quality and Cost' },
                      { key: 'destigmatize_death', label: 'Destigmatize Death' },
                    ].map(({ key, label }) => (
                      <li key={key} onClick={() => handleActionClick(key)}>
                        <div className={`individual-action${activeAction === key ? ' selected' : ''}`}>
                          <span>{label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Provider actions */}
              {activePerspective === 'provider' && (
                <div className="sankey-menu-wrapper">
                  I want to change
                  <ul className="action-container">
                    {[
                      { key: 'give_patients_data', label: 'Give Patients Their Data' },
                      { key: 'on_demand_care', label: 'Enable On-Demand Care' },
                      { key: 'primary_care_workers', label: 'Train More Primary Care Workers' },
                      { key: 'coordinate_care', label: 'Coordinate Care' },
                      { key: 'destigmatize_death', label: 'Destigmatize Death' },
                      { key: 'doctor_training', label: 'Improve Doctor Training' },
                      { key: 'tailored_treatment', label: 'Tailored Treatment Plans' },
                      { key: 'communicate_better', label: 'Clinicians Communicate Better with Patients' },
                      { key: 'less_malpractice_liability', label: 'Doctors who Follow Best Practices Shielded from Liability' },
                    ].map(({ key, label }) => (
                      <li key={key} onClick={() => handleActionClick(key)}>
                        <div className={`individual-action${activeAction === key ? ' selected' : ''}`}>
                          <span>{label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Policymaker actions */}
              {activePerspective === 'policymaker' && (
                <div className="sankey-menu-wrapper">
                  I want to change
                  <ul className="action-container">
                    {[
                      { key: 'public_option', label: 'Offer Public Option' },
                      { key: 'health_data_standard', label: 'Create Health Data Standard' },
                      { key: 'primary_care_workers', label: 'Train More Primary Care Workers' },
                      { key: 'interoperability', label: 'Improve Interoperability' },
                      { key: 'destigmatize_death', label: 'Destigmatize Death' },
                      { key: 'doctor_training', label: 'Improve Doctor Training' },
                      { key: 'transparent_prices', label: 'Make Prices Transparent' },
                      { key: 'incentivize_outcomes', label: 'Incentivize Outcomes' },
                      { key: 'reform_malpractice', label: 'Reform Malpractice Laws' },
                    ].map(({ key, label }) => (
                      <li key={key} onClick={() => handleActionClick(key)}>
                        <div className={`individual-action${activeAction === key ? ' selected' : ''}`}>
                          <span>{label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Payer actions */}
              {activePerspective === 'payer' && (
                <div className="sankey-menu-wrapper">
                  I want to change
                  <ul className="action-container">
                    {[
                      { key: 'public_option', label: 'Offer Public Option' },
                      { key: 'on_demand_care', label: 'Enable On-Demand Care' },
                      { key: 'coordinate_care', label: 'Coordinate Care' },
                      { key: 'destigmatize_death', label: 'Destigmatize Death' },
                      { key: 'transparent_prices', label: 'Make Prices Transparent' },
                      { key: 'incentivize_outcomes', label: 'Incentivize Outcomes' },
                    ].map(({ key, label }) => (
                      <li key={key} onClick={() => handleActionClick(key)}>
                        <div className={`individual-action${activeAction === key ? ' selected' : ''}`}>
                          <span>{label}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Individual Results (expanded details) ── */}
        <article id="results">
          <ul>
            <ResultItem dataKey="public_option" activeAction={activeAction} title="Offer Public Option" description="Universal coverage is crucial to ensuring that everyone has affordable access to healthcare. If health insurance is made optional, healthy people will be unlikely to buy insurance. This skews the risk pool and drives up the cost of a given insurance policy. The increased cost results in even fewer healthy people purchasing insurance, and the 'death spiral' continues. A public option ('Medicare for all') would guarantee that everyone has a base insurance plan. People could voluntarily purchase expanded coverage through private insurers." acaAnswer="Following the ACA's insurance mandate, 13% of Americans still lack health insurance (down from 17% before the ACA)." refs={[44]} />
            <ResultItem dataKey="everyone_covered" activeAction={activeAction} title="Everyone Gets Covered" description="Universal coverage is crucial to ensuring everyone has affordable access to healthcare. If health insurance is made optional, healthy people will be unlikely to buy insurance. This skews the risk pool and drives up the cost of a given insurance policy. The increased cost results in even fewer healthy people purchasing insurance, and the 'death spiral' continues. A public option ('Medicare for all') would guarantee that everyone has a base insurance plan. People could voluntarily purchase expanded coverage through private insurers." acaAnswer="Following the ACA's insurance mandate, 13% of Americans still lack health insurance (down from 17% before the ACA)." refs={[44]} />
            <ResultItem dataKey="give_patients_data" activeAction={activeAction} title="Give Patients Their Data" description="Patients who have access to their personal health information (lab tests, health record, etc.) can better engage with their health. Increasingly, health systems are offering 'patient portals' that enable people to view their health information. A recent study examined the results of giving patients access to their doctors' notes. More than two thirds of people reported better understanding their health and medical conditions, taking better care of themselves, doing better with taking their medications, or feeling more in control of their care." acaAnswer="The Health Insurance Portability and Accountability Act of 1996 (HIPAA) ensured a person's legal right to their health information. While the ACA did nothing to facilitate a person's access to their information, HITECH gives people the right to request electronic access to their health information." refs={[45, 46]} />
            <ResultItem dataKey="health_data_standard" activeAction={activeAction} title="Create Health Data Standard" description="When people have information about prices and quality, they can make informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers. Creating a health data standard will improve interoperability, which is the transmission of information between two different EHR systems. This would guarantee that no matter where a patient goes for care, their provider will be able to access their medical information." acaAnswer="The ACA does not address interoperability, but HITECH was passed just before the ACA and incentivizes better communication between EHR systems." />
            <ResultItem dataKey="on_demand_care" activeAction={activeAction} title="Enable On-Demand Care" description="New technologies allow patients to care for themselves from the comfort of their own homes. Care delivered outside of the hospital is much less expensive, and patients who can care for themselves may also be less likely to let symptoms exacerbate before addressing them." acaAnswer="Under the ACA, Medicare will begin testing new models of patient care, including the use of home-based primary care teams. Additionally, the ACA allocates grant money for training community health workers." refs={[46]} />
            <ResultItem dataKey="primary_care_workers" activeAction={activeAction} title="Train More Primary Care Workers" description="The U.S. has an abundance of specialists but a much lower number of primary care workers. This drives up costs. It can be addressed by training more primary care workers, not just doctors but nurses and home-health providers as well." acaAnswer="The ACA attempts to incentivize more people to work in primary care through a variety of student loans and loan repayment initiatives." refs={[46]} />
            <ResultItem dataKey="take_charge_of_health" activeAction={activeAction} title="Patients Take Charge of Their Own Health" description="Patients who have access to their personal health information (lab tests, health record, etc.) can better engage with their health. Increasingly, health systems are offering 'patient portals' that enable people to view their health information. A recent study examined the results of giving patients access to their doctors' notes. More than two thirds of people reported better understanding their health and medical conditions, taking better care of themselves, doing better with taking their medications, or feeling more in control of their care." acaAnswer="The Health Insurance Portability and Accountability Act of 1996 (HIPAA) ensured a person's legal right to their health information. While the ACA did nothing to facilitate a person's access to their information, HITECH gives people the right to request electronic access to their health information." refs={[45]} />
            <ResultItem dataKey="self_care" activeAction={activeAction} title="Self Care" description="New technologies allow patients to care for themselves from the comfort of their own homes. Not only is care delivered outside of the hospital much less expensive, but patients who can care for themselves may also be less likely to let symptoms exacerbate before addressing them." acaAnswer="Under the ACA, Medicare will begin testing new models of patient care, including the use of home-based primary care teams." refs={[46]} />
            <ResultItem dataKey="interoperability" activeAction={activeAction} title="Improve Interoperability" description="Creating a health data standard will improve interoperability, which is the transmission of information between two different EHR systems. This would guarantee that no matter where a patient goes for care, their provider will be able to access their medical information." acaAnswer="The ACA does not address interoperability, but HITECH was passed just before the ACA and incentivizes better communication between EHR systems." />
            <ResultItem dataKey="shop_quality_cost" activeAction={activeAction} title="People Shop for Quality and Cost" description="When people have information about prices and quality, they can make more informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers." acaAnswer="The exchanges created by the ACA enable some degree of shopping. However, price and quality information for individual procedures is not widely accessible." refs={[46]} />
            <ResultItem dataKey="coordinate_care" activeAction={activeAction} title="Coordinate Care" description="People with chronic conditions (heart disease, diabetes, cancer, etc.) often need many different types of care. For example, someone with diabetes may suffer from dietary challenges, ulcers, damaged nerves, and many other conditions. Coordinating care will increase quality and ultimately save money." acaAnswer="The ACA encourages the development of new patient care models through financial incentives. For example, Accountable Care Organizations (ACOs) that take responsibility for the cost and quality of caring for patients can receive a share of the savings they achieve for Medicare." refs={[46]} />
            <ResultItem dataKey="destigmatize_death" activeAction={activeAction} title="Destigmatize Death" description="Many people spend their final days undergoing intensive treatments. Patients with advanced cancers often opt for intensive treatment that decreases their quality of life and barely increases (or in some cases decreases) their remaining time. Yet, most people want to pass peacefully in their own homes surrounded by loved ones. There is a disconnect between how we want to spend the end of our lives, how we are capable of spending that time, and how we actually spend that time." acaAnswer="No parts of the ACA directly deal with end-of-life care. Originally, a portion of the act was supposed to enable physicians to be reimbursed for having advanced care planning discussions with their patients. However, this portion was removed from the bill before it was passed because it was publicized as something that would result in a 'death panel.'" refs={[46]} />
            <ResultItem dataKey="doctor_training" activeAction={activeAction} title="Improve Doctor Training" description="Doctors have been trained according to a model developed over a century ago. Medical education should be less expensive and shorter. Doctors should be learning skills within the same care teams that they will eventually be operating (including nurses, social workers, and others). Most healthcare is delivered outside of the hospital, yet most medical training occurs within hospitals." acaAnswer="Although it provides support for workforce training programs, the ACA does not significantly revamp medical education." refs={[46]} />
            <ResultItem dataKey="tailored_treatment" activeAction={activeAction} title="Tailored Treatment Plans" description="As sequencing costs continue to drop below $1000 per genome, it will soon become normal for every person to have their genome analyzed. The information that results enables tailored treatment plans where medication type and dosage are adapted to a person's genetic makeup." acaAnswer="The ACA does not address personalized medicine. However, President Obama's Precision Medicine Initiative seeks to generate scientific evidence to move personalized medicine into every day clinical practice." />
            <ResultItem dataKey="communicate_better" activeAction={activeAction} title="Clinicians Communicate Better with Patients" description="The amount of time doctors spend with patients is decreasing. The time that they do spend with patients is often dominated by clicking and typing in the EHR. As new technology enters the care paradigm, it is important that doctors receive training on how to maintain a strong doctor-patient relationship." acaAnswer="The ACA does not directly address patient-communication. However, it does include support for enhanced cultural competency, prevention/public health, and individuals with disabilities training." refs={[46]} />
            <ResultItem dataKey="transparent_prices" activeAction={activeAction} title="Make Prices Transparent" description="When people have information about prices and quality, they can make more informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers." acaAnswer="The exchanges created by the ACA enable some degree of shopping. However, price and quality information for individual procedures is not widely accessible." refs={[46]} />
            <ResultItem dataKey="incentivize_outcomes" activeAction={activeAction} title="Incentivize Outcomes" description="Currently, most providers are paid for each service they provide. This means that a clinician receives payment whenever they order a test or perform a procedure, regardless of whether the procedure was necessary or the outcome was positive. By reimbursing based on outcomes, payers can incentivize better quality while simultaneously decreasing costs." acaAnswer="The ACA explores new payment models to incentivize outcomes and reduce costs. These include approaches like shared savings (for ACOs) and bundled payments." refs={[46]} />
            <ResultItem dataKey="reform_malpractice" activeAction={activeAction} title="Reform Malpractice Laws" description="The current malpractice system fails both patients and physicians. A 1991 study in New York showed that 97% of physician and hospital mistakes that result in harm do not lead to a lawsuit. At the same time, of all malpractice suits filed, 80% were not related to an adverse event caused by a physician or hospital. That means that patients are not being reimbursed when they deserve to be, and doctors are being sued when they should not be. Additionally, in order to protect them against malpractice lawsuits, some suggest that doctors practice defensive medicine by ordering exhaustive testing. Health Affairs estimated the costs of defensive medicine to be $55 billion." acaAnswer="The ACA does not address malpractice reform. Most reforms will have to take place at the state level, but the ACA did nothing to incentivize such reforms." refs={[46, 47, 48]} />
            <ResultItem dataKey="less_malpractice_liability" activeAction={activeAction} title="Doctors who Follow Best Practices Shielded from Liability" description="The current malpractice system fails both patients and physicians. A 1991 study in New York showed that 97% of physician and hospital mistakes that result in harm do not lead to a lawsuit. At the same time, of all malpractice suits filed, 80% were not related to an adverse event caused by a physician or hospital. That means that patients are not being reimbursed when they deserve to be, and doctors are being sued when they should not be. Additionally, in order to protect them against malpractice lawsuits, some suggest that doctors practice defensive medicine by ordering exhaustive testing. Health Affairs estimated the costs of defensive medicine to be $55 billion." acaAnswer="The ACA does not address malpractice reform. Most reforms will have to take place at the state level, but the ACA did nothing to incentivize such reforms." refs={[46, 47, 48]} />
          </ul>
        </article>

        {/* ══════════════════════════════════════════
            PARTICIPATE
            ══════════════════════════════════════════ */}
        <article id="participate">
          <h2>Participate</h2>
          <div id="open-table">
            <div className="row-item">
              <h3>1. Give Feedback</h3>
              <p>
                Send us an email at{' '}
                <a href="mailto:feedback-ushealthcare@goinvo.com?subject=Healing%20U.S.%20Healthcare%20Feedback">
                  feedback-ushealthcare@goinvo.com
                </a>
              </p>
            </div>
            <div className="row-item">
              <h3>2. Remix and Reuse</h3>
              <p>
                Contribute to the project with new data and insights at{' '}
                <a
                  href="https://github.com/goinvo/ushealthcare"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com
                </a>
              </p>
            </div>
            <div className="row-item">
              <h3>3. Share</h3>
              <p>
                <span className="social-buttons end">
                  <a
                    className="fb"
                    href="https://www.facebook.com/sharer/sharer.php?u=http://www.goinvo.com/vision/healing-us-healthcare/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Share on Facebook"
                  >
                    Facebook
                  </a>{' '}
                  <a
                    className="twitter"
                    href="https://twitter.com/intent/tweet?url=http%3A%2F%2Fgoinvo.com%2Fvision%2Fhealing-us-healthcare%2F&hashtags=healthcare,design&via=goinvo"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Share on Twitter"
                  >
                    Twitter
                  </a>{' '}
                  <a
                    className="in"
                    href="http://www.linkedin.com/shareArticle?mini=true&url=http%3A%2F%2Fgoinvo.com%2Fvision%2Fhealing-us-healthcare%2F&title=Healing%20U.S.%20Healthcare"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Share on LinkedIn"
                  >
                    LinkedIn
                  </a>
                </span>
              </p>
            </div>
          </div>
        </article>

        {/* ══════════════════════════════════════════
            AUTHORS
            ══════════════════════════════════════════ */}
        <article id="authors">
          <h2>Creators</h2>
          <div id="authors-table">
            <div className="row">
              <div className="col-sm-6 author-col">
                <div className="box">
                  <img
                    width="100%"
                    className="centeredImage"
                    src={`${IMG}/Cecile.jpg`}
                    alt="Cecile Lu"
                  />
                  <h3>Cecile Lu</h3>
                  <p>
                    Architect and Designer at the Massachusetts Institute of
                    Technology.
                  </p>
                </div>
              </div>
              <div className="col-sm-6 author-col">
                <div className="box">
                  <img
                    width="100%"
                    className="centeredImage"
                    src={`${IMG}/Neil.jpg`}
                    alt="Neil Rens"
                  />
                  <h3>Neil Rens</h3>
                  <p>
                    Biomedical Engineer and Entrepreneur at Johns Hopkins
                    University.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <h2>Contributors</h2>
          <div id="contributors-table">
            <div className="contributors-row">
              <div className="contributor-col">
                <div className="contributor">
                  <div className="image">
                    <img src={`${IMG}/craig_mcginley.jpg`} alt="Craig McGinley" />
                  </div>
                  <div className="info">
                    <h3>Contributing Engineer</h3>
                    <p>Craig McGinley</p>
                  </div>
                </div>
                <div className="contributor">
                  <div className="image">
                    <img src={`${IMG}/adam_pere.jpg`} alt="Adam Pere" />
                  </div>
                  <div className="info">
                    <h3>Contributing Engineer</h3>
                    <p>Adam Pere</p>
                  </div>
                </div>
                <div className="contributor">
                  <div className="image">
                    <img src={`${IMG}/ben_salinas.jpg`} alt="Ben Salinas" />
                  </div>
                  <div className="info">
                    <h3>Contributing Engineer</h3>
                    <p>Ben Salinas</p>
                  </div>
                </div>
              </div>
              <div className="contributor-col">
                <div className="contributor">
                  <div className="image">
                    <img src={`${IMG}/juhan_sonin.jpg`} alt="Juhan Sonin" />
                  </div>
                  <div className="info">
                    <h3>Contributing Author</h3>
                    <p>Juhan Sonin</p>
                  </div>
                </div>
                <div className="contributor">
                  <div className="image">
                    <img src={`${IMG}/emily_twaddell.jpg`} alt="Emily Twaddell" />
                  </div>
                  <div className="info">
                    <h3>Editor</h3>
                    <p>Emily Twaddell</p>
                  </div>
                </div>
                <div className="contributor">
                  <div className="info">
                    <p className="small">
                      With inspiration and feedback from Gigi Peterkin, Harry
                      Sleeper, and Kenneth Zonies, MD.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* ══════════════════════════════════════════
            REFERENCES
            ══════════════════════════════════════════ */}
        <article id="bibliography">
          <h2>References</h2>
          <ol className="references">
            <li><a className="up_link" href="#s1_ref">^</a> <a id="s1" href="https://www.flickr.com/photos/seattlemunicipalarchives/4058808950/" target="_blank" rel="noopener noreferrer">Image,</a> <em>Seattle Municipal Archives</em>. Flickr, 10 Nov. 1999. Web.</li>
            <li><a className="up_link" href="#s2_ref">^</a> <a id="s2" href="http://www.cdc.gov/nchs/fastats/health-expenditures.htm" target="_blank" rel="noopener noreferrer">Health Expenditures,</a> <em>Centers for Disease Control and Prevention</em>. Web.</li>
            <li><a className="up_link" href="#s3_ref">^</a> <a id="s3" href="http://www.nihcm.org/images/Health_Care_Spending_Highly_Concentrated_CS2F2.png" target="_blank" rel="noopener noreferrer">The Concentration of Health Care Spending,</a> <em>NIHCM Foundation</em>. Web.</li>
            <li><a className="up_link" href="#s4_ref">^</a> <a id="s4" href="http://www.cdc.gov/nchs/fastats/health-expenditures.htm" target="_blank" rel="noopener noreferrer">Health Expenditures,</a> <em>Centers for Disease Control and Prevention</em>. Web.</li>
            <li><a className="up_link" href="#s5_ref">^</a> <a id="s5" href="http://www.cbpp.org/research/policy-basics-where-do-our-federal-tax-dollars-go" target="_blank" rel="noopener noreferrer">Policy Basics: Where Do Our Federal Tax Dollars Go?,</a> <em>Center on Budget and Policy Priorities</em>. 11 Mar. 2015. Web.</li>
            <li><a className="up_link" href="#s6_ref">^</a> <a id="s6" href="https://www.debt.org/medical/" target="_blank" rel="noopener noreferrer">Medical Debt Advice,</a> <em>Debtorg News</em>. Web.</li>
            <li><a className="up_link" href="#s7_ref">^</a> <a id="s7" href="http://www.washingtonpost.com/news/get-there/wp/2014/12/11/medical-debt-is-ruining-the-credit-score-of-millions-of-americans/" target="_blank" rel="noopener noreferrer">Medical Debt Is Ruining the Credit Scores of Millions of Americans,</a> <em>Washington Post</em>. 11 Dec. 2014. Web.</li>
            <li><a className="up_link" href="#s8_ref">^</a> <a id="s8" href="http://www.theatlantic.com/health/archive/2013/04/what-is-obamacare/274509/" target="_blank" rel="noopener noreferrer">What Is Obamacare,</a> <em>Hamblin, James</em>. The Atlantic, 2 Apr. 2013. Web.</li>
            <li><a className="up_link" href="#s9_ref">^</a> <a id="s9" href="http://obamacarefacts.com/obamacare-health-insurance-exchange/" target="_blank" rel="noopener noreferrer">ObamaCare Health Insurance Exchange,</a> <em>Obamacare Facts</em>. Web.</li>
            <li><a className="up_link" href="#s10_ref">^</a> <a id="s10" href="https://hbr.org/2013/10/doubts-about-pay-for-performance-in-health-care" target="_blank" rel="noopener noreferrer">Doubts About Pay-for-Performance in Healthcare,</a> <em>Ryan, Werner</em>. Harvard Business Review, 2013. Web.</li>
            <li><a className="up_link" href="#s11_ref">^</a> <a id="s11" href="http://www.healthpocket.com/individual-health-insurance/bronze-health-plans" target="_blank" rel="noopener noreferrer">Bronze Plan,</a> <em>HealthPocket</em>. Web.</li>
            <li><a className="up_link" href="#s12_ref">^</a> <a id="s12" href="https://www.washingtonpost.com/blogs/the-switch/wp/2013/10/09/heres-everything-you-need-to-know-about-obamacares-error-plagued-web-sites/" target="_blank" rel="noopener noreferrer">Obamacare&apos;s Error-plagued Websites,</a> <em>Washington Post</em>. 9 Oct. 2013. Web.</li>
            <li><a className="up_link" href="#s13_ref">^</a> <a id="s13" href="http://www.thefiscaltimes.com/Articles/2014/07/31/Healthcaregov-Not-Fully-Ready-Round-Two" target="_blank" rel="noopener noreferrer">Not Fully Ready for Round Two,</a> <em>Brianna Ehley</em>. The Fiscal Times, 2014. Web.</li>
            <li><a className="up_link" href="#s14_ref">^</a> <a id="s14" href="http://www.thefiscaltimes.com/Articles/2014/03/21/Yet-Another-Obamacare-Glitch-Was-Just-Discovered" target="_blank" rel="noopener noreferrer">Yet Another Obamacare Glitch,</a> <em>Brianna Ehley</em>. The Fiscal Times, 2014. Web.</li>
            <li><a className="up_link" href="#s15_ref">^</a> <a id="s15" href="https://www.healthcare.gov/fees-exemptions/fee-for-not-being-covered/" target="_blank" rel="noopener noreferrer">Individual Mandate Penalty,</a> <em>HealthCare.gov</em>. Web.</li>
            <li><a className="up_link" href="#s16_ref">^</a> <a id="s16" href="http://money.cnn.com/2015/04/13/news/economy/obamacare-uninsured-gallup/" target="_blank" rel="noopener noreferrer">Nearly 90% of Americans Now Have Health Insurance,</a> <em>CNNMoney</em>. Web.</li>
            <li><a className="up_link" href="#s17_ref">^</a> <a id="s17" href="http://www.nytimes.com/2013/05/08/business/hospital-billing-varies-wildly-us-data-shows.html" target="_blank" rel="noopener noreferrer">Hospital Billing Varies Wildly,</a> <em>NY Times</em>. 2013. Web.</li>
            <li><a className="up_link" href="#s18_ref">^</a> <a id="s18" href="http://www.nerdwallet.com/health/hospitals/compare" target="_blank" rel="noopener noreferrer">Compare Hospitals Tool,</a> <em>NerdWallet Health</em>. Web.</li>
            <li><a className="up_link" href="#s19_ref">^</a> <a id="s19" href="http://commonhealth.wbur.org/2014/10/mass-first-price-tags-health-care" target="_blank" rel="noopener noreferrer">Mass. First State To Require Price Tags For Health Care,</a> <em>WBUR</em>. 2014. Web.</li>
            <li><a className="up_link" href="#s20_ref">^</a> <a id="s20" href="http://www.opscost.com/search?location=Boston%2C%20Massachusetts&drg_procedure_code=194" target="_blank" rel="noopener noreferrer">Boston Pneumonia Treatment Costs,</a> <em>OpsCost</em>. Web.</li>
            <li><a className="up_link" href="#s21_ref">^</a> <a id="s21" href="http://www.healthit.gov/providers-professionals/faqs/what-electronic-health-record-ehr" target="_blank" rel="noopener noreferrer">What is an EHR,</a> <em>HealthIT</em>. Web.</li>
            <li><a className="up_link" href="#s22_ref">^</a> <a id="s22" href="http://www.cio.com/article/2386750/vertical-industries/is-healthcare-it-interoperability-almost-here.html" target="_blank" rel="noopener noreferrer">Is Healthcare IT Interoperability Here,</a> <em>CIO</em>. 2013. Web.</li>
            <li><a className="up_link" href="#s23_ref">^</a> <a id="s23" href="http://hitconsultant.net/2015/03/23/why-i-hope-to-help-end-ehrs-lack-of-interoperability/" target="_blank" rel="noopener noreferrer">EHRs Lack of Interoperability,</a> <em>HIT Consultant</em>. 2015. Web.</li>
            <li><a className="up_link" href="#s24_ref">^</a> <a id="s24" href="http://www.elxrhealth.com/lack-of-interoperability/" target="_blank" rel="noopener noreferrer">Lack of Interoperability in Healthcare,</a> <em>ELXR Health</em>. 2015. Web.</li>
            <li><a className="up_link" href="#s25_ref">^</a> <a id="s25" href="http://healthaffairs.org/blog/2015/03/04/where-is-hitechs-35-billion-dollar-investment-going/" target="_blank" rel="noopener noreferrer">HITECH&apos;s $35 Billion Investment,</a> <em>Health Affairs</em>. 2015. Web.</li>
            <li><a className="up_link" href="#s26_ref">^</a> <a id="s26" href="http://www.cms.gov/Regulations-and-Guidance/Legislation/EHRIncentivePrograms/index.html" target="_blank" rel="noopener noreferrer">EHR Incentive Programs,</a> <em>CMS.gov</em>. Web.</li>
            <li><a className="up_link" href="#s27_ref">^</a> <a id="s27" href="http://archinte.jamanetwork.com/article.aspx?articleid=1106007" target="_blank" rel="noopener noreferrer">&ldquo;Top 5&rdquo; Lists Top $5 Billion,</a> <em>Kale MS, et al.</em>. Arch Intern Med. 2011. Web.</li>
            <li><a className="up_link" href="#s28_ref">^</a> <a id="s28" href="http://www.nlm.nih.gov/medlineplus/ency/article/000146.html" target="_blank" rel="noopener noreferrer">Hospital-acquired Pneumonia,</a> <em>MedlinePlus</em>. Web.</li>
            <li><a className="up_link" href="#s29_ref">^</a> <a id="s29" href="http://www.webmd.com/a-to-z-guides/features/before-surgery-your-top-six-hospital-risks?page=3" target="_blank" rel="noopener noreferrer">Hospital Risks,</a> <em>WebMD</em>. Web.</li>
            <li><a className="up_link" href="#s30_ref">^</a> <a id="s30" href="https://www.justice.org/what-we-do/advocate-civil-justice-system/issue-advocacy/medical-errors" target="_blank" rel="noopener noreferrer">Medical Errors,</a> <em>American Association for Justice</em>. Web.</li>
            <li><a className="up_link" href="#s31_ref">^</a> <a id="s31" href="http://www.hospitalsafetyscore.org/newsroom/display/hospitalerrors-thirdleading-causeofdeathinus-improvementstooslow" target="_blank" rel="noopener noreferrer">Hospital Errors Third Leading Cause of Death,</a> <em>Hospital Safety Score</em>. 2013. Web.</li>
            <li><a className="up_link" href="#s32_ref">^</a> <a id="s32" href="http://www.vox.com/2015/1/29/7878731/medical-errors-statistics" target="_blank" rel="noopener noreferrer">Medical Errors in America,</a> <em>Kliff, Sarah</em>. Vox, 2015. Web.</li>
            <li><a className="up_link" href="#s33_ref">^</a> <a id="s33" href="http://www.npr.org/sections/health-shots/2014/12/19/371862146/teaching-hospitals-hit-hardest-by-medicare-fines-for-patient-safety" target="_blank" rel="noopener noreferrer">Teaching Hospitals Hit Hardest By Medicare Fines,</a> <em>Rau, Jordan</em>. NPR. 2014. Web.</li>
            <li><a className="up_link" href="#s34_ref">^</a> <a id="s34" href="http://eh.net/encyclopedia/health-insurance-in-the-united-states/" target="_blank" rel="noopener noreferrer">Health Insurance in the United States,</a> <em>EHnet</em>. Web.</li>
            <li><a className="up_link" href="#s35_ref">^</a> <a id="s35" href="http://www.amazon.com/gp/product/1610395425" target="_blank" rel="noopener noreferrer">Reinventing American Health Care,</a> <em>Emanuel, Ezekiel J</em>. PublicAffairs, 2014.</li>
            <li><a className="up_link" href="#s36_ref">^</a> <a id="s36" href="http://www.encyclopedia.com/doc/1G2-3407400156.html" target="_blank" rel="noopener noreferrer">Hill-Burton Act (1946),</a> <em>Newman, Roger K.</em>. 2004. Web.</li>
            <li><a className="up_link" href="#s37_ref">^</a> <a id="s37" href="https://www.cms.gov/About-CMS/Agency-Information/History/index.html" target="_blank" rel="noopener noreferrer">History,</a> <em>Centers for Medicare &amp; Medicaid Services</em>. Web.</li>
            <li><a className="up_link" href="#s38_ref">^</a> <a id="s38" href="http://www.forbes.com/sites/theapothecary/2012/02/07/the-tortuous-conservative-history-of-the-individual-mandate/" target="_blank" rel="noopener noreferrer">Tortuous History of the Individual Mandate,</a> <em>Forbes</em>. Web.</li>
            <li><a className="up_link" href="#s39_ref">^</a> <a id="s39" href="https://kaiserfamilyfoundation.files.wordpress.com/2011/03/5-02-13-history-of-health-reform.pdf" target="_blank" rel="noopener noreferrer">Timeline: History of Health Reform,</a> <em>Kaiser Family Foundation</em>.</li>
            <li><a className="up_link" href="#s40_ref">^</a> <a id="s40" href="https://data.oecd.org/healthres/health-spending.html" target="_blank" rel="noopener noreferrer">Health Spending,</a> <em>OECD Data</em>. Web.</li>
            <li><a className="up_link" href="#s41_ref">^</a> <a id="s41" href="https://data.oecd.org/healthres/health-spending.html" target="_blank" rel="noopener noreferrer">Health Spending per Capita,</a> <em>OECD Statistics</em>. Web.</li>
            <li><a className="up_link" href="#s42_ref">^</a> <a id="s42" href="https://data.oecd.org/healthres/health-spending.html" target="_blank" rel="noopener noreferrer">Health Spending Total 2013,</a> <em>OECD Statistics</em>. Web.</li>
            <li><a className="up_link" href="#s43_ref">^</a> <a id="s43" href="http://www.commonwealthfund.org/~/media/files/publications/fund-report/2014/jun/1755_davis_mirror_mirror_2014.pdf" target="_blank" rel="noopener noreferrer">Mirror, Mirror On The Wall,</a> <em>Davis, Karen, et al.</em>. Commonwealth Fund, 2014. Web.</li>
            <li><a className="up_link" href="#bibliography">^</a> <a id="s44" href="http://www.gallup.com/poll/180425/uninsured-rate-sinks.aspx" target="_blank" rel="noopener noreferrer">Uninsured Rate Sinks to 12.9%.</a> <span className="ref">Gallup.com. Web.</span></li>
            <li><a className="up_link" href="#bibliography">^</a> <a id="s45" href="http://www.bmj.com/content/350/bmj.g7785" target="_blank" rel="noopener noreferrer">Doctors and patients sharing clinical notes.</a> <span className="ref">Walker, Meltsner, Delbanco. BMJ 2015.</span></li>
            <li><a className="up_link" href="#bibliography">^</a> <a id="s46" href="http://www.dpc.senate.gov/healthreformbill/healthbill04.pdf" target="_blank" rel="noopener noreferrer">The Patient Protection and Affordable Care Act.</a> <span className="ref">Adkinson, Chung. Hand Clinics 30.3 (2014).</span></li>
            <li><a className="up_link" href="#bibliography">^</a> <a id="s47" href="http://www.nejm.org/doi/full/10.1056/NEJM199107253250405" target="_blank" rel="noopener noreferrer">Malpractice claims and adverse events.</a> <span className="ref">Localio et al. NEJM 325.4 (1991).</span></li>
            <li><a className="up_link" href="#bibliography">^</a> <a id="s48" href="http://content.healthaffairs.org/content/29/9/1569.full" target="_blank" rel="noopener noreferrer">National Costs Of Medical Liability.</a> <span className="ref">Health Affairs. Web.</span></li>
          </ol>
        </article>
      </div>

      {/* ── Newsletter ───────────────────────────── */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '2rem 0' }}>
        <div style={{ maxWidth: 840, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <NewsletterForm />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ResultItem helper component ─────────────────── */
function ResultItem({
  dataKey,
  activeAction,
  title,
  description,
  acaAnswer,
  refs,
}: {
  dataKey: string
  activeAction: string | null
  title: string
  description: string
  acaAnswer: string
  refs?: number[]
}) {
  return (
    <li>
      <div
        className={`individual-result${activeAction === dataKey ? ' is-open' : ''}`}
        data-key={dataKey}
      >
        <h3>{title}</h3>
        <p>{description}</p>
        <h3>What does the ACA do?</h3>
        <p>{acaAnswer}</p>
        {refs?.map((ref) => (
          <a key={ref} href={`#s${ref}`}>
            [{ref}]
          </a>
        ))}
      </div>
    </li>
  )
}
