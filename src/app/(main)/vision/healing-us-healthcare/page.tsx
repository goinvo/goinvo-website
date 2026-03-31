import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/healing-us-healthcare/references.json'

export const metadata: Metadata = {
  title: 'Healing U.S. Healthcare',
  description:
    '$9,255. That\'s how much your health costs the U.S. every year. Follow David\'s healthcare journey and discover our vision for better healthcare.',
}

export default function HealingUsHealthcarePage() {
  return (
    <div>
      <SetCaseStudyHero image="https://www.goinvo.com/old/images/features/us-healthcare/jumbotron3.jpg" />

      {/* Intro */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Healing U.S. Healthcare
          </h1>
          <h4 className="font-serif text-base font-light mb-2">
            By Cecile Lu and Neil Rens
          </h4>
          <p className="text-sm text-gray mb-8">September 2015</p>

          {/* Table of Contents */}
          <div className="flex flex-wrap gap-4 mb-8 text-sm">
            <a href="#symptoms" className="text-primary hover:underline">1. Symptoms</a>
            <a href="#history" className="text-primary hover:underline">2. History</a>
            <a href="#diagnosis" className="text-primary hover:underline">3. Diagnosis</a>
            <a href="#prescription" className="text-primary hover:underline">4. Prescription</a>
            <a href="#participate" className="text-primary hover:underline">5. Participate</a>
            <a href="#authors-section" className="text-primary hover:underline">6. Authors</a>
            <a href="#references" className="text-primary hover:underline">7. References</a>
          </div>

          <p className="leading-relaxed mb-4">
            <strong>$9,255.</strong> That&apos;s how much your health costs the U.S. every year. You probably don&apos;t pay that amount, let alone use that amount in health services. In fact, 90% of Americans account for less than 33% of healthcare consumption.<sup><a href="#references">3</a></sup> Nonetheless, you are entangled in the $2.9 trillion<sup><a href="#references">4</a></sup> our country spends on healthcare. 24%<sup><a href="#references">5</a></sup> of the federal budget &mdash; your tax dollars &mdash; is part of this $2.9 trillion. You pay a lot. But what do you get, and how good is it?
          </p>
          <p className="leading-relaxed mb-4">
            Consider David. He just left his job as a high school teacher to launch an education-technology startup. With the change, he lost his health coverage and must decide whether to purchase new insurance. He&apos;s healthy &mdash; does he really need health coverage?
          </p>
          <p className="leading-relaxed mb-4">
            David is just one of the thousands of Americans facing tough choices like this one. He could be any one of us. What happens if David&apos;s gamble of good health fails him? Read on to follow David&apos;s healthcare journey as he navigates the current system. Then, discover our vision for better healthcare in the U.S. and contribute your own ideas.
          </p>
        </div>
      </section>

      {/* Symptoms */}
      <section id="symptoms" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">Symptoms</h2>

          <p className="leading-relaxed mb-4">
            Two weeks ago, David was going about his daily life. Yesterday he was bedridden in a hospital, battling an infection he contracted in that hospital. Now he&apos;s back at home, trying to figure out how to pay off his massive medical debt. How did he get here?
          </p>

          {/* Medical Bill */}
          <div className="bg-gray-lightest p-6 mb-8 rounded">
            <h3 className="header-md mt-0 mb-4">Medical Bill</h3>
            <ul className="space-y-2 mb-4">
              <li className="flex justify-between"><span>Clinic Visit</span><span className="font-semibold">$150</span></li>
              <li className="flex justify-between"><span>X-ray</span><span className="font-semibold">$100</span></li>
              <li className="flex justify-between"><span>CT Scan #1</span><span className="font-semibold">$785</span></li>
              <li className="flex justify-between"><span>CT Scan #2</span><span className="font-semibold">$785</span></li>
              <li className="flex justify-between"><span>Hospital Stay</span><span className="font-semibold">$14,000</span></li>
              <li className="flex justify-between border-t border-gray-light pt-2 text-lg font-bold"><span>Total</span><span>$15,820</span></li>
            </ul>
          </div>

          <p className="leading-relaxed mb-4">
            Medical debt refers to individual debt due to healthcare costs and related expenses. It is different from other debts because it is almost never accumulated by choice, and can add up quickly and unexpectedly. It can stem from any medical expenses, ranging from regular checkups to emergency room visits. Medical debt varies depending on insurance coverage and personal medical needs.
          </p>
          <p className="leading-relaxed mb-4">
            In the U.S., medical debt accounts for more than <strong>50% of all overdue debt</strong> that appears on credit reports.<sup><a href="#references">6</a></sup> For <strong>15 million people</strong>, medical debt is the only debt they have in collections in their credit report.<sup><a href="#references">7</a></sup>
          </p>

          <h3 className="header-md mt-8 mb-2">How do we save an ailing system?</h3>
          <p className="leading-relaxed mb-4">
            The process was set in motion when David had to decide whether or not to buy health insurance. With the passage of the Patient Protection and Affordable Care Act (ACA), every American has to either purchase health insurance or pay a penalty tax each year.
          </p>
          <p className="leading-relaxed mb-4">
            The purpose of the Patient Protection and Affordable Care Act (also known as ACA or Obamacare) is to &ldquo;increase the number of Americans covered by health insurance and decrease the cost of healthcare.&rdquo;<sup><a href="#references">8</a></sup> Insurance companies are no longer allowed to deny people coverage and they can no longer revoke coverage when people get sick. People are no longer forced to pay extra for insurance because of pre-existing conditions.
          </p>
          <p className="leading-relaxed mb-4">
            To make insurance more accessible, the Affordable Care Act implemented Health Insurance Exchanges.<sup><a href="#references">9</a></sup> The exchanges function as marketplaces for health insurance plans. Americans can use their state&apos;s marketplace to obtain coverage from competing private healthcare providers. People can now compare prices of qualified health plans to choose the best fit in terms of coverage, premiums, and deductibles.
          </p>
          <p className="leading-relaxed mb-4">
            The Affordable Care Act also implemented pay-for-performance incentives, which pays healthcare providers for outcomes instead of for services. While there have not been any adverse effects, the system has yet to show much evidence of success in improving patient outcomes.<sup><a href="#references">10</a></sup>
          </p>

          {/* Choice Point 1 */}
          <div className="bg-[#e8f4f6] p-6 my-8 rounded">
            <h3 className="header-md mt-0 mb-2">What should David do?</h3>
            <p className="leading-relaxed mb-4">
              The cheapest plan on the Massachusetts healthcare exchange is the bronze plan, which costs $180 per month ($2,160 per year).<sup><a href="#references">11</a></sup> It covers doctor visits, home visits, ambulatory care, hospitalization, vision exams, and hearing exams.
            </p>
            <p className="leading-relaxed mb-4">
              David is healthy, so why buy insurance? The penalty for not buying insurance is either 2% of yearly income or $325, whichever is greater.<sup><a href="#references">15</a></sup> This is much less expensive than the $2,160 per year bronze plan.
            </p>
          </div>

          <p className="leading-relaxed mb-4">
            Good choice! David can get preventative care for free. He also can afford to keep seeing his primary care physician. Equally important, in case anything unexpected happens David can get affordable access to the care he needs.
          </p>
          <p className="leading-relaxed mb-4">
            But what if he had opted to pay the tax instead? At the time, David thought opting out would save him money. Initially, it did because the penalty tax is less than the least expensive insurance plan. But even healthy people can become sick.
          </p>
          <p className="leading-relaxed mb-4">
            Bronze Plan coverage typically means that insurance companies pay for around 60% of covered healthcare expenses and the consumer pays for the rest. The Affordable Care Act requires insurance companies to offer Gold, Silver, and Platinum plans along with Bronze. Each offers a tradeoff between premiums and deductibles.
          </p>
          <p className="leading-relaxed mb-4">
            When the Affordable Care Act was first implemented, users spent hours on healthcare.gov before being able to purchase their insurance.<sup><a href="#references">12,13,14</a></sup> Not only was the server overwhelmed by the massive influx of information, but also the user interface was poorly designed and the cost calculator sometimes provided inaccurate information about subsidies. The poor implementation may have caused some people, like David, to opt out of the plans in favor of the 2% penalty tax.
          </p>
          <p className="leading-relaxed mb-4">
            Despite the slow start, <strong>9 out of 10 Americans</strong> now have insurance.<sup><a href="#references">16</a></sup> Prior to the implementation of the Affordable Care Act, only 8 out of 10 Americans were insured.
          </p>
          <p className="text-sm text-gray mb-4">
            *Starting in 2016, the tax will increase to 2.5% or $695, whichever is higher.
          </p>
          <p className="leading-relaxed mb-4">
            Without health insurance, David stops seeing his primary care physician. Not only does he lose his first point of contact for health concerns, but he also stops receiving preventative treatments like vaccines.
          </p>
          <p className="leading-relaxed mb-4">
            One day, David begins having coughing fits. He assumes he will get better in a few days, but he doesn&apos;t. After a week, the symptoms continue to persist.
          </p>

          {/* Choice Point 2 */}
          <div className="bg-[#e8f4f6] p-6 my-8 rounded">
            <h3 className="header-md mt-0 mb-2">What should David do?</h3>
            <p className="leading-relaxed mb-2">
              <strong>Option A:</strong> David video chats with a doctor using his smartphone.
            </p>
            <p className="leading-relaxed mb-2">
              <strong>Option B:</strong> David has some soup and lies down for a nap. Maybe the symptoms will resolve on their own.
            </p>
          </div>

          <p className="leading-relaxed mb-4">
            Good choice! The doctor prescribes antiviral therapy and David is back to normal within a few days.
          </p>
          <p className="leading-relaxed mb-4">
            But what if he did not have access to telemedicine services? When David wakes up, his symptoms are worse.
          </p>
          <p className="leading-relaxed mb-4">
            The cough continues to worsen so David decides to go to a walk-in clinic. It&apos;s hard to compare the quality and cost of care at different places because the information is not always readily available. David simply picks the one closest to his home.
          </p>
          <p className="leading-relaxed mb-4">
            In 2014, Massachusetts became the first state to require price information for different health procedures.<sup><a href="#references">19</a></sup> For the first time, insurance companies were required to tell their customers how much the company pays for a given procedure or test. However, it is still difficult to find accurate pricing information for people without insurance.
          </p>

          <blockquote className="border-l-4 border-primary pl-6 my-8 text-xl font-serif italic">
            Pneumonia treatment costs in Boston range from $10,000 to $31,000<sup><a href="#references">20</a></sup>
          </blockquote>

          <p className="leading-relaxed mb-4">
            After a physical examination, the doctor decides to X-ray David&apos;s chest. The radiologist who reads the scan notices a small nodule that cannot be characterized. He decides to look at David&apos;s health record to see if the nodule was previously documented.
          </p>

          {/* Choice Point 3 */}
          <div className="bg-[#e8f4f6] p-6 my-8 rounded">
            <h3 className="header-md mt-0 mb-2">Does the doctor have access to David&apos;s Electronic Health Record?</h3>
            <p className="leading-relaxed mb-4">
              An Electronic Health Record (EHR) contains the medical and treatment histories of patients and is designed to be inclusive of a broader view of a patient&apos;s care.<sup><a href="#references">21</a></sup> EHRs enable the sharing of information between multiple healthcare providers and organizations. They contain information from all clinicians involved in a patient&apos;s care. However, when EHRs became more widely implemented in 2004, the industry built hundreds of standalone systems to create and maintain EHRs. Within each system data is shared, but there is little to no data flow between different systems.<sup><a href="#references">22</a></sup>
            </p>
          </div>

          <p className="leading-relaxed mb-4">
            Problems arise with the lack of interoperability between EHR systems. Approximately <strong>40% of medical errors</strong> are directly related to information omissions and miscommunications.<sup><a href="#references">23,24</a></sup> EHR systems do not share information with each other and they all present information in different ways. This causes misread charts, forgotten results, and untimely information during life-threatening crises. Other hospitals hesitate to transfer data in fear of incurring liability for sharing private information.
          </p>
          <p className="leading-relaxed mb-4">
            The 2009 Health Information Technology for Economic and Clinical Health (HITECH) Act promotes the adoption and meaningful use of health information technology such as EHRs.<sup><a href="#references">25</a></sup> Using money from the HITECH Act, the Centers for Medicare and Medicaid Services (CMS) provide incentive payments to eligible professionals and hospitals.<sup><a href="#references">26</a></sup> The CMS Medicare and Medicaid EHR Incentive Programs encourage adoption, implementation, upgrades, and demonstration of meaningful use of certified EHR technology.
          </p>
          <p className="leading-relaxed mb-4">
            Electronic health records make it easy for doctors to access a patient&apos;s medical information. Even though David&apos;s previous doctor used an electronic health record, it was a different system than this clinic uses. Since the systems do not communicate with each other, the doctor does not have instant access to David&apos;s medical information.
          </p>
          <p className="leading-relaxed mb-4">
            The doctor sees that David&apos;s nodule was previously characterized as scar tissue. With this information, there is no need for further imaging to investigate the nodule.
          </p>
          <p className="leading-relaxed mb-4">
            But what if the doctor didn&apos;t have access? The doctor does not know that David&apos;s nodule is benign scar tissue.
          </p>
          <p className="leading-relaxed mb-4">
            Worried that the nodule could be malignant, the doctor advises David to have a CT scan so that the nodule can be examined in more detail. David is not told about the cost of the CT scan, only that it is important to keep him healthy. He agrees to the scan, which ultimately shows that the nodule is old and benign. The scan also uncovers a mass on David&apos;s left adrenal gland. Although there is a low suspicion for cancer, the doctors order another scan &mdash; this time with contrast &mdash; just to be sure the lesion is benign.
          </p>
          <p className="leading-relaxed mb-4">
            Thankfully, the scan showed the mass to be benign. Unfortunately, David suffered a severe allergic reaction to the dye used for contrast.
          </p>
          <p className="leading-relaxed mb-4">
            David is admitted to a nearby hospital for treatment. His condition improves after a few days, but suddenly David&apos;s temperature spikes and his coughing exacerbates. The diagnosis: <strong>hospital-acquired pneumonia</strong>.
          </p>

          <div className="bg-gray-lightest p-6 my-8 rounded">
            <p className="leading-relaxed mb-4">
              <strong>Hospital-acquired pneumonia</strong> is a lung infection that occurs during a hospital stay. Infections contracted at a hospital can be especially dangerous because of two reasons. First, patients are often already very sick, making it difficult for them to fight an infection. Second, the types of bacteria in hospitals are often more resistant to antibiotics.<sup><a href="#references">28</a></sup> Pneumonia is one of the most common hospital-acquired infections, after urinary tract infections and wound infections. It has a <strong>33% mortality rate</strong>, although the cause of death can be a combination of the pneumonia and other presenting illnesses.
            </p>
          </div>

          <blockquote className="border-l-4 border-primary pl-6 my-8 text-xl font-serif italic">
            440,000 patients die every year from preventable medical errors. Medical errors are the third leading cause of death in the U.S., following cancer and heart disease.<sup><a href="#references">30,31</a></sup>
          </blockquote>

          <p className="leading-relaxed mb-4">
            Studies show that up to <strong>12% of people</strong> going to a hospital will suffer severe harm as a result.<sup><a href="#references">32</a></sup>
          </p>
          <p className="leading-relaxed mb-4">
            Medicare is now punishing hospitals with high rates of infections and other medical errors in an attempt to increase patient safety. Publicly funded hospitals have been penalized the most because they take care of sicker populations and deal with more complex cases.<sup><a href="#references">33</a></sup>
          </p>
          <p className="leading-relaxed mb-4">
            After a week in the hospital, David&apos;s initial cough, allergic reaction, and pneumonia are successfully treated. But he isn&apos;t sent home empty-handed: he has a bill that says he owes <strong>$15,820</strong>.
          </p>
          <p className="leading-relaxed mb-4">
            It doesn&apos;t have to be this way. If David had insurance, he would have had access to a primary care physician. More opportunities for self-care would have saved David time and money. If the two EHRs had talked to each other, David likely would not have had the second and third CT scans, preventing his allergic reaction and hospital-acquired pneumonia.
          </p>
          <p className="leading-relaxed mb-4 italic">
            The account of David is fictional, but it&apos;s well within the realm of possibility.
          </p>
        </div>
      </section>

      {/* History */}
      <section id="history" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">History</h2>
          <p className="leading-relaxed mb-4">
            In the past century, there have been numerous attempts to reform the U.S. healthcare system. To understand why the reforms were proposed, it is important to examine how healthcare evolved in the U.S.<sup><a href="#references">34,35,36,37,38,39</a></sup>
          </p>
          <p className="leading-relaxed mb-4">
            This history of healthcare in the U.S. is by no means comprehensive, but it sheds light on how the healthcare system came to be what it is today.
          </p>
        </div>
      </section>

      {/* Diagnosis */}
      <section id="diagnosis" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">Diagnosis</h2>
          <p className="leading-relaxed mb-4">
            The healthcare system in the U.S. needs improvement. While healthcare is complex and nuanced, other industrialized countries are performing much better than the U.S. In 2012, we spent more than <strong>$8,700 per capita</strong>, far more than any other nation.<sup><a href="#references">40</a></sup>
          </p>
          <p className="leading-relaxed mb-4">
            Not only does the U.S. spend more, but healthcare spending is growing at a faster rate than in other countries.<sup><a href="#references">41</a></sup>
          </p>

          <blockquote className="border-l-4 border-primary pl-6 my-8 text-xl font-serif italic">
            In 2012, the U.S. spent nearly 17% of its GDP on healthcare. The UK spent less than 10%.<sup><a href="#references">42</a></sup>
          </blockquote>

          <blockquote className="border-l-4 border-primary pl-6 my-8 text-xl font-serif italic">
            The U.S. spends the most money but ranks last in quality.<sup><a href="#references">43</a></sup>
          </blockquote>

          <p className="leading-relaxed mb-4">
            Despite this, we have lower quality and less access. The Patient Protection and Affordable Care Act initiated much needed comprehensive reforms. However, significant work remains. As the ACA continues to be implemented, it will need to be evaluated and adjusted. Some areas like malpractice reform were not addressed by the ACA and still need reform. But policymakers are not the only ones responsible for improving American healthcare. Patients, providers, payers, and inventors all play a role in changing the status quo.
          </p>
        </div>
      </section>

      {/* Prescription */}
      <section id="prescription" className="py-12 bg-gray-lightest">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">Prescription</h2>
          <p className="leading-relaxed mb-4">
            A successful healthcare system provides everyone with access to affordable, high quality care. This means that everyone has health insurance and can get care when they need it. It means information about quality and costs is readily available, and people can make informed decisions about the care they purchase.
          </p>
          <p className="leading-relaxed mb-4">
            These are ambitious goals that will take years to achieve, but technology can expedite the process. Apps and wearables are already enabling more self-monitoring and self-care. Simultaneously, information about your DNA sequence allows for personalized medicine. In the future, people will only receive the treatments that will work for them.
          </p>
          <p className="leading-relaxed mb-4">
            Other challenges like reforming malpractice laws, incentivizing outcomes, and improving EHR interoperability require legislative action. Some changes will be cultural. For example, why do we spend so much money on end-of-life care that reduces quality of life? Likewise, medical culture needs to be more patient-centered, which involves giving people access to their own health data.
          </p>
          <p className="leading-relaxed mb-8">
            Ultimately, everyone has a role in healing the U.S. healthcare system. Below we explore the different actions that will lead to an improved system. Each is interconnected and influenced by patients, providers, policy makers, and payers. Discover the ways you can make a difference, and join the discussion by contributing your own ideas.
          </p>

          {/* Universal Access */}
          <h3 className="font-serif text-xl mt-8 mb-2 text-secondary">Universal Access</h3>
          <h4 className="header-md mt-0 mb-2">Everyone Gets Covered</h4>
          <p className="leading-relaxed mb-4">
            Universal coverage is crucial to ensuring that everyone has affordable access to healthcare. If health insurance is made optional, healthy people will be unlikely to buy insurance. This skews the risk pool and drives up the cost of a given insurance policy. The increased cost results in even fewer healthy people purchasing insurance, and the &ldquo;death spiral&rdquo; continues. A public option (&ldquo;Medicare for all&rdquo;) would guarantee that everyone has a base insurance plan. People could voluntarily purchase expanded coverage through private insurers.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            Following the ACA&apos;s insurance mandate, 13% of Americans still lack health insurance (down from 17% before the ACA).<sup><a href="#references">44</a></sup>
          </p>

          {/* Near Perfect Quality */}
          <h3 className="font-serif text-xl mt-8 mb-2 text-secondary">Near Perfect Quality</h3>

          <h4 className="header-md mt-4 mb-2">Give Patients Their Data</h4>
          <p className="leading-relaxed mb-4">
            Patients who have access to their personal health information (lab tests, health record, etc.) can better engage with their health. Increasingly, health systems are offering &ldquo;patient portals&rdquo; that enable people to view their health information. A recent study examined the results of giving patients access to their doctors&apos; notes. More than two thirds of people reported better understanding their health and medical conditions, taking better care of themselves, doing better with taking their medications, or feeling more in control of their care.<sup><a href="#references">45</a></sup>
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The Health Insurance Portability and Accountability Act of 1996 (HIPAA) ensured a person&apos;s legal right to their health information. While the ACA did nothing to facilitate a person&apos;s access to their information, HITECH gives people the right to request electronic access to their health information.
          </p>

          <h4 className="header-md mt-4 mb-2">Create Health Data Standard</h4>
          <p className="leading-relaxed mb-4">
            When people have information about prices and quality, they can make informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers. Creating a health data standard will improve interoperability, which is the transmission of information between two different EHR systems. This would guarantee that no matter where a patient goes for care, their provider will be able to access their medical information.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA does not address interoperability, but HITECH was passed just before the ACA and incentivizes better communication between EHR systems.
          </p>

          <h4 className="header-md mt-4 mb-2">Enable On-Demand Care</h4>
          <p className="leading-relaxed mb-4">
            New technologies allow patients to care for themselves from the comfort of their own homes. Care delivered outside of the hospital is much less expensive, and patients who can care for themselves may also be less likely to let symptoms exacerbate before addressing them.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            Under the ACA, Medicare will begin testing new models of patient care, including the use of home-based primary care teams. Additionally, the ACA allocates grant money for training community health workers.
          </p>

          <h4 className="header-md mt-4 mb-2">Train More Primary Care Workers</h4>
          <p className="leading-relaxed mb-4">
            The U.S. has an abundance of specialists but a much lower number of primary care workers. This drives up costs. It can be addressed by training more primary care workers, not just doctors but nurses and home-health providers as well.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA attempts to incentivize more people to work in primary care through a variety of student loans and loan repayment initiatives.
          </p>

          {/* Much Better Prices */}
          <h3 className="font-serif text-xl mt-8 mb-2 text-secondary">Much Better Prices</h3>

          <h4 className="header-md mt-4 mb-2">Patients Take Charge of Their Own Health</h4>
          <p className="leading-relaxed mb-4">
            Patients who have access to their personal health information (lab tests, health record, etc.) can better engage with their health. Increasingly, health systems are offering &ldquo;patient portals&rdquo; that enable people to view their health information. A recent study examined the results of giving patients access to their doctors&apos; notes. More than two thirds of people reported better understanding their health and medical conditions, taking better care of themselves, doing better with taking their medications, or feeling more in control of their care.<sup><a href="#references">45</a></sup>
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The Health Insurance Portability and Accountability Act of 1996 (HIPAA) ensured a person&apos;s legal right to their health information. While the ACA did nothing to facilitate a person&apos;s access to their information, HITECH gives people the right to request electronic access to their health information.
          </p>

          <h4 className="header-md mt-4 mb-2">Self Care</h4>
          <p className="leading-relaxed mb-4">
            New technologies allow patients to care for themselves from the comfort of their own homes. Not only is care delivered outside of the hospital much less expensive, but patients who can care for themselves may also be less likely to let symptoms exacerbate before addressing them.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            Under the ACA, Medicare will begin testing new models of patient care, including the use of home-based primary care teams.
          </p>

          <h4 className="header-md mt-4 mb-2">Improve Interoperability</h4>
          <p className="leading-relaxed mb-4">
            Creating a health data standard will improve interoperability, which is the transmission of information between two different EHR systems. This would guarantee that no matter where a patient goes for care, their provider will be able to access their medical information.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA does not address interoperability, but HITECH was passed just before the ACA and incentivizes better communication between EHR systems.
          </p>

          <h4 className="header-md mt-4 mb-2">People Shop for Quality and Cost</h4>
          <p className="leading-relaxed mb-4">
            When people have information about prices and quality, they can make more informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The exchanges created by the ACA enable some degree of shopping. However, price and quality information for individual procedures is not widely accessible.
          </p>

          <h4 className="header-md mt-4 mb-2">Personalize Medicine</h4>
          <p className="leading-relaxed mb-4">
            As sequencing costs continue to drop below $1000 per genome, it will soon become normal for every person to have their genome analyzed. The information that results enables tailored treatment plans where medication type and dosage are adapted to a person&apos;s genetic makeup.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA does not address personalized medicine. However, President Obama&apos;s Precision Medicine Initiative seeks to generate scientific evidence to move personalized medicine into every day clinical practice.
          </p>

          <h4 className="header-md mt-4 mb-2">Coordinate Care</h4>
          <p className="leading-relaxed mb-4">
            People with chronic conditions (heart disease, diabetes, cancer, etc.) often need many different types of care. For example, someone with diabetes may suffer from dietary challenges, ulcers, damaged nerves, and many other conditions. Coordinating care will increase quality and ultimately save money.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA encourages the development of new patient care models through financial incentives. For example, Accountable Care Organizations (ACOs) that take responsibility for the cost and quality of caring for patients can receive a share of the savings they achieve for Medicare.
          </p>

          <h4 className="header-md mt-4 mb-2">Destigmatize Death</h4>
          <p className="leading-relaxed mb-4">
            Many people spend their final days undergoing intensive treatments. Patients with advanced cancers often opt for intensive treatment that decreases their quality of life and barely increases (or in some cases decreases) their remaining time. Yet, most people want to pass peacefully in their own homes surrounded by loved ones. There is a disconnect between how we want to spend the end of our lives, how we are capable of spending that time, and how we actually spend that time.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            No parts of the ACA directly deal with end-of-life care. Originally, a portion of the act was supposed to enable physicians to be reimbursed for having advanced care planning discussions with their patients. However, this portion was removed from the bill before it was passed because it was publicized as something that would result in a &ldquo;death panel.&rdquo;
          </p>

          <h4 className="header-md mt-4 mb-2">Improve Doctor Training</h4>
          <p className="leading-relaxed mb-4">
            Doctors have been trained according to a model developed over a century ago. Medical education should be less expensive and shorter. Doctors should be learning skills within the same care teams that they will eventually be operating (including nurses, social workers, and others). Most healthcare is delivered outside of the hospital, yet most medical training occurs within hospitals.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            Although it provides support for workforce training programs, the ACA does not significantly revamp medical education.
          </p>

          <h4 className="header-md mt-4 mb-2">Clinicians Communicate Better with Patients</h4>
          <p className="leading-relaxed mb-4">
            The amount of time doctors spend with patients is decreasing. The time that they do spend with patients is often dominated by clicking and typing in the EHR. As new technology enters the care paradigm, it is important that doctors receive training on how to maintain a strong doctor-patient relationship.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA does not directly address patient-communication. However, it does include support for enhanced cultural competency, prevention/public health, and individuals with disabilities training.
          </p>

          <h4 className="header-md mt-4 mb-2">Make Prices Transparent</h4>
          <p className="leading-relaxed mb-4">
            When people have information about prices and quality, they can make more informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The exchanges created by the ACA enable some degree of shopping. However, price and quality information for individual procedures is not widely accessible.
          </p>

          <h4 className="header-md mt-4 mb-2">Incentivize Outcomes</h4>
          <p className="leading-relaxed mb-4">
            Currently, most providers are paid for each service they provide. This means that a clinician receives payment whenever they order a test or perform a procedure, regardless of whether the procedure was necessary or the outcome was positive. By reimbursing based on outcomes, payers can incentivize better quality while simultaneously decreasing costs.
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA explores new payment models to incentivize outcomes and reduce costs. These include approaches like shared savings (for ACOs) and bundled payments.
          </p>

          <h4 className="header-md mt-4 mb-2">Reform Malpractice Laws</h4>
          <p className="leading-relaxed mb-4">
            The current malpractice system fails both patients and physicians. A 1991 study in New York showed that 97% of physician and hospital mistakes that result in harm do not lead to a lawsuit.<sup><a href="#references">47</a></sup> At the same time, of all malpractice suits filed, 80% were not related to an adverse event caused by a physician or hospital. That means that patients are not being reimbursed when they deserve to be, and doctors are being sued when they should not be. Additionally, in order to protect them against malpractice lawsuits, some suggest that doctors practice defensive medicine by ordering exhaustive testing. Health Affairs estimated the costs of defensive medicine to be <strong>$55 billion</strong>.<sup><a href="#references">48</a></sup>
          </p>
          <p className="leading-relaxed mb-4 text-sm text-gray">
            The ACA does not address malpractice reform. Most reforms will have to take place at the state level, but the ACA did nothing to incentivize such reforms.
          </p>
        </div>
      </section>

      {/* Participate */}
      <section id="participate" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-2xl mt-0 mb-4">Participate</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="header-md mt-0 mb-2">Give Feedback</h3>
              <p className="leading-relaxed">
                Send us an email at{' '}
                <a
                  href="mailto:feedback-ushealthcare@goinvo.com"
                  className="text-primary hover:underline"
                >
                  feedback-ushealthcare@goinvo.com
                </a>
              </p>
            </div>
            <div>
              <h3 className="header-md mt-0 mb-2">Remix and Reuse</h3>
              <p className="leading-relaxed">
                Contribute to the project with new data and insights at{' '}
                <a
                  href="https://github.com/goinvo/ushealthcare"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/goinvo/ushealthcare
                </a>
              </p>
            </div>
            <div>
              <h3 className="header-md mt-0 mb-2">Share</h3>
              <p className="leading-relaxed">
                Help spread the word by sharing this article with your network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Authors */}
      <section id="authors-section" className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author name="Cecile Lu" company="Massachusetts Institute of Technology">
            Cecile is an architect and designer at the Massachusetts Institute of Technology.
          </Author>
          <Author name="Neil Rens" company="Johns Hopkins University">
            Neil is a biomedical engineer and entrepreneur at Johns Hopkins University.
          </Author>

          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mt-12">
            Contributors
          </h2>
          <Author name="Craig McGinley" company="GoInvo" />
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

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
        </div>
      </section>
    </div>
  )
}
