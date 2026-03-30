/**
 * Migrate healing-us-healthcare content to Sanity.
 *
 * Builds Portable Text blocks for the full article from the static override,
 * including background sections, quotes with reference citations,
 * rich text with bold/sup marks, columns, and a references block.
 * Creates team members for Cecile Lu and Neil Rens if they don't exist.
 * Sets subtitle, links authors, and patches the existing feature document.
 *
 * This page has NO images to upload — it is entirely text, quotes, and
 * structured sections (medical bill box, decision points, participate grid).
 *
 * Usage:
 *   node scripts/migrate-healing-us-healthcare.mjs
 *   node scripts/migrate-healing-us-healthcare.mjs --dry-run
 */

import { createClient } from 'next-sanity'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!PROJECT_ID || !TOKEN) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// ─── Helpers ────────────────────────────────────────────────────────────────

const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

function textBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: key(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function richBlock(children, style = 'normal', markDefs = []) {
  return {
    _type: 'block',
    _key: key(),
    style,
    markDefs,
    children: children.map(c => ({
      _type: 'span',
      _key: key(),
      text: c.text,
      marks: c.marks || [],
    })),
  }
}

function linkMark(href, blank = true) {
  const markKey = key()
  return {
    markKey,
    markDef: { _type: 'link', _key: markKey, href, blank },
  }
}

function quoteBlock(text, author, role, refNumber, refTarget) {
  const block = {
    _type: 'quote',
    _key: key(),
    text,
  }
  if (author) block.author = author
  if (role) block.role = role
  if (refNumber) block.refNumber = refNumber
  if (refTarget) block.refTarget = refTarget
  return block
}

function backgroundSection(color, innerBlocks) {
  return {
    _type: 'backgroundSection',
    _key: key(),
    color,
    content: innerBlocks,
  }
}

function columnsBlock(layout, cols) {
  return {
    _type: 'columns',
    _key: key(),
    layout,
    content: cols,
  }
}

function referencesBlock(items) {
  return {
    _type: 'references',
    _key: key(),
    items: items.map(r => ({
      _type: 'object',
      _key: key(),
      title: r.title,
      link: r.link || undefined,
    })),
  }
}

// ─── Build Content ──────────────────────────────────────────────────────────

function buildContent(refs) {
  const blocks = []

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE OF CONTENTS (as a normal paragraph with links)
  // ═══════════════════════════════════════════════════════════════════════════
  const tocLink1 = linkMark('#symptoms', false)
  const tocLink2 = linkMark('#history', false)
  const tocLink3 = linkMark('#diagnosis', false)
  const tocLink4 = linkMark('#prescription', false)
  const tocLink5 = linkMark('#participate', false)
  const tocLink6 = linkMark('#authors-section', false)
  const tocLink7 = linkMark('#references', false)

  blocks.push(richBlock([
    { text: '1. Symptoms', marks: [tocLink1.markKey] },
    { text: '  ', marks: [] },
    { text: '2. History', marks: [tocLink2.markKey] },
    { text: '  ', marks: [] },
    { text: '3. Diagnosis', marks: [tocLink3.markKey] },
    { text: '  ', marks: [] },
    { text: '4. Prescription', marks: [tocLink4.markKey] },
    { text: '  ', marks: [] },
    { text: '5. Participate', marks: [tocLink5.markKey] },
    { text: '  ', marks: [] },
    { text: '6. Authors', marks: [tocLink6.markKey] },
    { text: '  ', marks: [] },
    { text: '7. References', marks: [tocLink7.markKey] },
  ], 'normal', [
    tocLink1.markDef, tocLink2.markDef, tocLink3.markDef, tocLink4.markDef,
    tocLink5.markDef, tocLink6.markDef, tocLink7.markDef,
  ]))

  // ═══════════════════════════════════════════════════════════════════════════
  // INTRO PARAGRAPHS
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(richBlock([
    { text: '$9,255.', marks: ['strong'] },
    { text: ' That\u2019s how much your health costs the U.S. every year. You probably don\u2019t pay that amount, let alone use that amount in health services. In fact, 90% of Americans account for less than 33% of healthcare consumption.', marks: [] },
    { text: '3', marks: ['sup'] },
    { text: ' Nonetheless, you are entangled in the $2.9 trillion', marks: [] },
    { text: '4', marks: ['sup'] },
    { text: ' our country spends on healthcare. 24%', marks: [] },
    { text: '5', marks: ['sup'] },
    { text: ' of the federal budget \u2014 your tax dollars \u2014 is part of this $2.9 trillion. You pay a lot. But what do you get, and how good is it?', marks: [] },
  ]))

  blocks.push(textBlock('Consider David. He just left his job as a high school teacher to launch an education-technology startup. With the change, he lost his health coverage and must decide whether to purchase new insurance. He\u2019s healthy \u2014 does he really need health coverage?'))

  blocks.push(textBlock('David is just one of the thousands of Americans facing tough choices like this one. He could be any one of us. What happens if David\u2019s gamble of good health fails him? Read on to follow David\u2019s healthcare journey as he navigates the current system. Then, discover our vision for better healthcare in the U.S. and contribute your own ideas.'))

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: SYMPTOMS
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Symptoms', 'h2'))

  blocks.push(textBlock('Two weeks ago, David was going about his daily life. Yesterday he was bedridden in a hospital, battling an infection he contracted in that hospital. Now he\u2019s back at home, trying to figure out how to pay off his massive medical debt. How did he get here?'))

  // Medical Bill box
  blocks.push(backgroundSection('gray', [
    textBlock('Medical Bill', 'h3'),
    textBlock('Clinic Visit \u2014 $150'),
    textBlock('X-ray \u2014 $100'),
    textBlock('CT Scan #1 \u2014 $785'),
    textBlock('CT Scan #2 \u2014 $785'),
    textBlock('Hospital Stay \u2014 $14,000'),
    richBlock([
      { text: 'Total \u2014 $15,820', marks: ['strong'] },
    ]),
  ]))

  blocks.push(textBlock('Medical debt refers to individual debt due to healthcare costs and related expenses. It is different from other debts because it is almost never accumulated by choice, and can add up quickly and unexpectedly. It can stem from any medical expenses, ranging from regular checkups to emergency room visits. Medical debt varies depending on insurance coverage and personal medical needs.'))

  blocks.push(richBlock([
    { text: 'In the U.S., medical debt accounts for more than ', marks: [] },
    { text: '50% of all overdue debt', marks: ['strong'] },
    { text: ' that appears on credit reports.', marks: [] },
    { text: '6', marks: ['sup'] },
    { text: ' For ', marks: [] },
    { text: '15 million people', marks: ['strong'] },
    { text: ', medical debt is the only debt they have in collections in their credit report.', marks: [] },
    { text: '7', marks: ['sup'] },
  ]))

  blocks.push(textBlock('How do we save an ailing system?', 'h3'))

  blocks.push(textBlock('The process was set in motion when David had to decide whether or not to buy health insurance. With the passage of the Patient Protection and Affordable Care Act (ACA), every American has to either purchase health insurance or pay a penalty tax each year.'))

  blocks.push(richBlock([
    { text: 'The purpose of the Patient Protection and Affordable Care Act (also known as ACA or Obamacare) is to \u201Cincrease the number of Americans covered by health insurance and decrease the cost of healthcare.\u201D', marks: [] },
    { text: '8', marks: ['sup'] },
    { text: ' Insurance companies are no longer allowed to deny people coverage and they can no longer revoke coverage when people get sick. People are no longer forced to pay extra for insurance because of pre-existing conditions.', marks: [] },
  ]))

  blocks.push(richBlock([
    { text: 'To make insurance more accessible, the Affordable Care Act implemented Health Insurance Exchanges.', marks: [] },
    { text: '9', marks: ['sup'] },
    { text: ' The exchanges function as marketplaces for health insurance plans. Americans can use their state\u2019s marketplace to obtain coverage from competing private healthcare providers. People can now compare prices of qualified health plans to choose the best fit in terms of coverage, premiums, and deductibles.', marks: [] },
  ]))

  blocks.push(richBlock([
    { text: 'The Affordable Care Act also implemented pay-for-performance incentives, which pays healthcare providers for outcomes instead of for services. While there have not been any adverse effects, the system has yet to show much evidence of success in improving patient outcomes.', marks: [] },
    { text: '10', marks: ['sup'] },
  ]))

  // Choice Point 1 — teal background
  blocks.push(backgroundSection('teal', [
    textBlock('What should David do?', 'h3'),
    richBlock([
      { text: 'The cheapest plan on the Massachusetts healthcare exchange is the bronze plan, which costs $180 per month ($2,160 per year).', marks: [] },
      { text: '11', marks: ['sup'] },
      { text: ' It covers doctor visits, home visits, ambulatory care, hospitalization, vision exams, and hearing exams.', marks: [] },
    ]),
    richBlock([
      { text: 'David is healthy, so why buy insurance? The penalty for not buying insurance is either 2% of yearly income or $325, whichever is greater.', marks: [] },
      { text: '15', marks: ['sup'] },
      { text: ' This is much less expensive than the $2,160 per year bronze plan.', marks: [] },
    ]),
  ]))

  blocks.push(textBlock('Good choice! David can get preventative care for free. He also can afford to keep seeing his primary care physician. Equally important, in case anything unexpected happens David can get affordable access to the care he needs.'))

  blocks.push(textBlock('But what if he had opted to pay the tax instead? At the time, David thought opting out would save him money. Initially, it did because the penalty tax is less than the least expensive insurance plan. But even healthy people can become sick.'))

  blocks.push(textBlock('Bronze Plan coverage typically means that insurance companies pay for around 60% of covered healthcare expenses and the consumer pays for the rest. The Affordable Care Act requires insurance companies to offer Gold, Silver, and Platinum plans along with Bronze. Each offers a tradeoff between premiums and deductibles.'))

  blocks.push(richBlock([
    { text: 'When the Affordable Care Act was first implemented, users spent hours on healthcare.gov before being able to purchase their insurance.', marks: [] },
    { text: '12,13,14', marks: ['sup'] },
    { text: ' Not only was the server overwhelmed by the massive influx of information, but also the user interface was poorly designed and the cost calculator sometimes provided inaccurate information about subsidies. The poor implementation may have caused some people, like David, to opt out of the plans in favor of the 2% penalty tax.', marks: [] },
  ]))

  blocks.push(richBlock([
    { text: 'Despite the slow start, ', marks: [] },
    { text: '9 out of 10 Americans', marks: ['strong'] },
    { text: ' now have insurance.', marks: [] },
    { text: '16', marks: ['sup'] },
    { text: ' Prior to the implementation of the Affordable Care Act, only 8 out of 10 Americans were insured.', marks: [] },
  ]))

  blocks.push(textBlock('*Starting in 2016, the tax will increase to 2.5% or $695, whichever is higher.'))

  blocks.push(textBlock('Without health insurance, David stops seeing his primary care physician. Not only does he lose his first point of contact for health concerns, but he also stops receiving preventative treatments like vaccines.'))

  blocks.push(textBlock('One day, David begins having coughing fits. He assumes he will get better in a few days, but he doesn\u2019t. After a week, the symptoms continue to persist.'))

  // Choice Point 2 — teal background
  blocks.push(backgroundSection('teal', [
    textBlock('What should David do?', 'h3'),
    richBlock([
      { text: 'Option A:', marks: ['strong'] },
      { text: ' David video chats with a doctor using his smartphone.', marks: [] },
    ]),
    richBlock([
      { text: 'Option B:', marks: ['strong'] },
      { text: ' David has some soup and lies down for a nap. Maybe the symptoms will resolve on their own.', marks: [] },
    ]),
  ]))

  blocks.push(textBlock('Good choice! The doctor prescribes antiviral therapy and David is back to normal within a few days.'))

  blocks.push(textBlock('But what if he did not have access to telemedicine services? When David wakes up, his symptoms are worse.'))

  blocks.push(textBlock('The cough continues to worsen so David decides to go to a walk-in clinic. It\u2019s hard to compare the quality and cost of care at different places because the information is not always readily available. David simply picks the one closest to his home.'))

  blocks.push(richBlock([
    { text: 'In 2014, Massachusetts became the first state to require price information for different health procedures.', marks: [] },
    { text: '19', marks: ['sup'] },
    { text: ' For the first time, insurance companies were required to tell their customers how much the company pays for a given procedure or test. However, it is still difficult to find accurate pricing information for people without insurance.', marks: [] },
  ]))

  blocks.push(quoteBlock(
    'Pneumonia treatment costs in Boston range from $10,000 to $31,000',
    undefined, undefined, '20', 'references'
  ))

  blocks.push(textBlock('After a physical examination, the doctor decides to X-ray David\u2019s chest. The radiologist who reads the scan notices a small nodule that cannot be characterized. He decides to look at David\u2019s health record to see if the nodule was previously documented.'))

  // Choice Point 3 — teal background
  blocks.push(backgroundSection('teal', [
    textBlock('Does the doctor have access to David\u2019s Electronic Health Record?', 'h3'),
    richBlock([
      { text: 'An Electronic Health Record (EHR) contains the medical and treatment histories of patients and is designed to be inclusive of a broader view of a patient\u2019s care.', marks: [] },
      { text: '21', marks: ['sup'] },
      { text: ' EHRs enable the sharing of information between multiple healthcare providers and organizations. They contain information from all clinicians involved in a patient\u2019s care. However, when EHRs became more widely implemented in 2004, the industry built hundreds of standalone systems to create and maintain EHRs. Within each system data is shared, but there is little to no data flow between different systems.', marks: [] },
      { text: '22', marks: ['sup'] },
    ]),
  ]))

  blocks.push(richBlock([
    { text: 'Problems arise with the lack of interoperability between EHR systems. Approximately ', marks: [] },
    { text: '40% of medical errors', marks: ['strong'] },
    { text: ' are directly related to information omissions and miscommunications.', marks: [] },
    { text: '23,24', marks: ['sup'] },
    { text: ' EHR systems do not share information with each other and they all present information in different ways. This causes misread charts, forgotten results, and untimely information during life-threatening crises. Other hospitals hesitate to transfer data in fear of incurring liability for sharing private information.', marks: [] },
  ]))

  blocks.push(richBlock([
    { text: 'The 2009 Health Information Technology for Economic and Clinical Health (HITECH) Act promotes the adoption and meaningful use of health information technology such as EHRs.', marks: [] },
    { text: '25', marks: ['sup'] },
    { text: ' Using money from the HITECH Act, the Centers for Medicare and Medicaid Services (CMS) provide incentive payments to eligible professionals and hospitals.', marks: [] },
    { text: '26', marks: ['sup'] },
    { text: ' The CMS Medicare and Medicaid EHR Incentive Programs encourage adoption, implementation, upgrades, and demonstration of meaningful use of certified EHR technology.', marks: [] },
  ]))

  blocks.push(textBlock('Electronic health records make it easy for doctors to access a patient\u2019s medical information. Even though David\u2019s previous doctor used an electronic health record, it was a different system than this clinic uses. Since the systems do not communicate with each other, the doctor does not have instant access to David\u2019s medical information.'))

  blocks.push(textBlock('The doctor sees that David\u2019s nodule was previously characterized as scar tissue. With this information, there is no need for further imaging to investigate the nodule.'))

  blocks.push(textBlock('But what if the doctor didn\u2019t have access? The doctor does not know that David\u2019s nodule is benign scar tissue.'))

  blocks.push(textBlock('Worried that the nodule could be malignant, the doctor advises David to have a CT scan so that the nodule can be examined in more detail. David is not told about the cost of the CT scan, only that it is important to keep him healthy. He agrees to the scan, which ultimately shows that the nodule is old and benign. The scan also uncovers a mass on David\u2019s left adrenal gland. Although there is a low suspicion for cancer, the doctors order another scan \u2014 this time with contrast \u2014 just to be sure the lesion is benign.'))

  blocks.push(textBlock('Thankfully, the scan showed the mass to be benign. Unfortunately, David suffered a severe allergic reaction to the dye used for contrast.'))

  blocks.push(richBlock([
    { text: 'David is admitted to a nearby hospital for treatment. His condition improves after a few days, but suddenly David\u2019s temperature spikes and his coughing exacerbates. The diagnosis: ', marks: [] },
    { text: 'hospital-acquired pneumonia', marks: ['strong'] },
    { text: '.', marks: [] },
  ]))

  // Hospital-acquired pneumonia info box
  blocks.push(backgroundSection('gray', [
    richBlock([
      { text: 'Hospital-acquired pneumonia', marks: ['strong'] },
      { text: ' is a lung infection that occurs during a hospital stay. Infections contracted at a hospital can be especially dangerous because of two reasons. First, patients are often already very sick, making it difficult for them to fight an infection. Second, the types of bacteria in hospitals are often more resistant to antibiotics.', marks: [] },
      { text: '28', marks: ['sup'] },
      { text: ' Pneumonia is one of the most common hospital-acquired infections, after urinary tract infections and wound infections. It has a ', marks: [] },
      { text: '33% mortality rate', marks: ['strong'] },
      { text: ', although the cause of death can be a combination of the pneumonia and other presenting illnesses.', marks: [] },
    ]),
  ]))

  blocks.push(quoteBlock(
    '440,000 patients die every year from preventable medical errors. Medical errors are the third leading cause of death in the U.S., following cancer and heart disease.',
    undefined, undefined, '30,31', 'references'
  ))

  blocks.push(richBlock([
    { text: 'Studies show that up to ', marks: [] },
    { text: '12% of people', marks: ['strong'] },
    { text: ' going to a hospital will suffer severe harm as a result.', marks: [] },
    { text: '32', marks: ['sup'] },
  ]))

  blocks.push(richBlock([
    { text: 'Medicare is now punishing hospitals with high rates of infections and other medical errors in an attempt to increase patient safety. Publicly funded hospitals have been penalized the most because they take care of sicker populations and deal with more complex cases.', marks: [] },
    { text: '33', marks: ['sup'] },
  ]))

  blocks.push(richBlock([
    { text: 'After a week in the hospital, David\u2019s initial cough, allergic reaction, and pneumonia are successfully treated. But he isn\u2019t sent home empty-handed: he has a bill that says he owes ', marks: [] },
    { text: '$15,820', marks: ['strong'] },
    { text: '.', marks: [] },
  ]))

  blocks.push(textBlock('It doesn\u2019t have to be this way. If David had insurance, he would have had access to a primary care physician. More opportunities for self-care would have saved David time and money. If the two EHRs had talked to each other, David likely would not have had the second and third CT scans, preventing his allergic reaction and hospital-acquired pneumonia.'))

  blocks.push(richBlock([
    { text: 'The account of David is fictional, but it\u2019s well within the realm of possibility.', marks: ['em'] },
  ]))

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: HISTORY (gray background)
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(backgroundSection('gray', [
    textBlock('History', 'h2'),
    richBlock([
      { text: 'In the past century, there have been numerous attempts to reform the U.S. healthcare system. To understand why the reforms were proposed, it is important to examine how healthcare evolved in the U.S.', marks: [] },
      { text: '34,35,36,37,38,39', marks: ['sup'] },
    ]),
    textBlock('This history of healthcare in the U.S. is by no means comprehensive, but it sheds light on how the healthcare system came to be what it is today.'),
  ]))

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: DIAGNOSIS
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Diagnosis', 'h2'))

  blocks.push(richBlock([
    { text: 'The healthcare system in the U.S. needs improvement. While healthcare is complex and nuanced, other industrialized countries are performing much better than the U.S. In 2012, we spent more than ', marks: [] },
    { text: '$8,700 per capita', marks: ['strong'] },
    { text: ', far more than any other nation.', marks: [] },
    { text: '40', marks: ['sup'] },
  ]))

  blocks.push(richBlock([
    { text: 'Not only does the U.S. spend more, but healthcare spending is growing at a faster rate than in other countries.', marks: [] },
    { text: '41', marks: ['sup'] },
  ]))

  blocks.push(quoteBlock(
    'In 2012, the U.S. spent nearly 17% of its GDP on healthcare. The UK spent less than 10%.',
    undefined, undefined, '42', 'references'
  ))

  blocks.push(quoteBlock(
    'The U.S. spends the most money but ranks last in quality.',
    undefined, undefined, '43', 'references'
  ))

  blocks.push(textBlock('Despite this, we have lower quality and less access. The Patient Protection and Affordable Care Act initiated much needed comprehensive reforms. However, significant work remains. As the ACA continues to be implemented, it will need to be evaluated and adjusted. Some areas like malpractice reform were not addressed by the ACA and still need reform. But policymakers are not the only ones responsible for improving American healthcare. Patients, providers, payers, and inventors all play a role in changing the status quo.'))

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: PRESCRIPTION (gray background)
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(backgroundSection('gray', [
    textBlock('Prescription', 'h2'),

    textBlock('A successful healthcare system provides everyone with access to affordable, high quality care. This means that everyone has health insurance and can get care when they need it. It means information about quality and costs is readily available, and people can make informed decisions about the care they purchase.'),

    textBlock('These are ambitious goals that will take years to achieve, but technology can expedite the process. Apps and wearables are already enabling more self-monitoring and self-care. Simultaneously, information about your DNA sequence allows for personalized medicine. In the future, people will only receive the treatments that will work for them.'),

    textBlock('Other challenges like reforming malpractice laws, incentivizing outcomes, and improving EHR interoperability require legislative action. Some changes will be cultural. For example, why do we spend so much money on end-of-life care that reduces quality of life? Likewise, medical culture needs to be more patient-centered, which involves giving people access to their own health data.'),

    textBlock('Ultimately, everyone has a role in healing the U.S. healthcare system. Below we explore the different actions that will lead to an improved system. Each is interconnected and influenced by patients, providers, policy makers, and payers. Discover the ways you can make a difference, and join the discussion by contributing your own ideas.'),

    // --- Universal Access ---
    textBlock('Universal Access', 'h3'),
    textBlock('Everyone Gets Covered', 'h4'),
    textBlock('Universal coverage is crucial to ensuring that everyone has affordable access to healthcare. If health insurance is made optional, healthy people will be unlikely to buy insurance. This skews the risk pool and drives up the cost of a given insurance policy. The increased cost results in even fewer healthy people purchasing insurance, and the \u201Cdeath spiral\u201D continues. A public option (\u201CMedicare for all\u201D) would guarantee that everyone has a base insurance plan. People could voluntarily purchase expanded coverage through private insurers.'),
    richBlock([
      { text: 'Following the ACA\u2019s insurance mandate, 13% of Americans still lack health insurance (down from 17% before the ACA).', marks: [] },
      { text: '44', marks: ['sup'] },
    ]),

    // --- Near Perfect Quality ---
    textBlock('Near Perfect Quality', 'h3'),

    textBlock('Give Patients Their Data', 'h4'),
    richBlock([
      { text: 'Patients who have access to their personal health information (lab tests, health record, etc.) can better engage with their health. Increasingly, health systems are offering \u201Cpatient portals\u201D that enable people to view their health information. A recent study examined the results of giving patients access to their doctors\u2019 notes. More than two thirds of people reported better understanding their health and medical conditions, taking better care of themselves, doing better with taking their medications, or feeling more in control of their care.', marks: [] },
      { text: '45', marks: ['sup'] },
    ]),
    textBlock('The Health Insurance Portability and Accountability Act of 1996 (HIPAA) ensured a person\u2019s legal right to their health information. While the ACA did nothing to facilitate a person\u2019s access to their information, HITECH gives people the right to request electronic access to their health information.'),

    textBlock('Create Health Data Standard', 'h4'),
    textBlock('When people have information about prices and quality, they can make informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers. Creating a health data standard will improve interoperability, which is the transmission of information between two different EHR systems. This would guarantee that no matter where a patient goes for care, their provider will be able to access their medical information.'),
    textBlock('The ACA does not address interoperability, but HITECH was passed just before the ACA and incentivizes better communication between EHR systems.'),

    textBlock('Enable On-Demand Care', 'h4'),
    textBlock('New technologies allow patients to care for themselves from the comfort of their own homes. Care delivered outside of the hospital is much less expensive, and patients who can care for themselves may also be less likely to let symptoms exacerbate before addressing them.'),
    textBlock('Under the ACA, Medicare will begin testing new models of patient care, including the use of home-based primary care teams. Additionally, the ACA allocates grant money for training community health workers.'),

    textBlock('Train More Primary Care Workers', 'h4'),
    textBlock('The U.S. has an abundance of specialists but a much lower number of primary care workers. This drives up costs. It can be addressed by training more primary care workers, not just doctors but nurses and home-health providers as well.'),
    textBlock('The ACA attempts to incentivize more people to work in primary care through a variety of student loans and loan repayment initiatives.'),

    // --- Much Better Prices ---
    textBlock('Much Better Prices', 'h3'),

    textBlock('Patients Take Charge of Their Own Health', 'h4'),
    richBlock([
      { text: 'Patients who have access to their personal health information (lab tests, health record, etc.) can better engage with their health. Increasingly, health systems are offering \u201Cpatient portals\u201D that enable people to view their health information. A recent study examined the results of giving patients access to their doctors\u2019 notes. More than two thirds of people reported better understanding their health and medical conditions, taking better care of themselves, doing better with taking their medications, or feeling more in control of their care.', marks: [] },
      { text: '45', marks: ['sup'] },
    ]),
    textBlock('The Health Insurance Portability and Accountability Act of 1996 (HIPAA) ensured a person\u2019s legal right to their health information. While the ACA did nothing to facilitate a person\u2019s access to their information, HITECH gives people the right to request electronic access to their health information.'),

    textBlock('Self Care', 'h4'),
    textBlock('New technologies allow patients to care for themselves from the comfort of their own homes. Not only is care delivered outside of the hospital much less expensive, but patients who can care for themselves may also be less likely to let symptoms exacerbate before addressing them.'),
    textBlock('Under the ACA, Medicare will begin testing new models of patient care, including the use of home-based primary care teams.'),

    textBlock('Improve Interoperability', 'h4'),
    textBlock('Creating a health data standard will improve interoperability, which is the transmission of information between two different EHR systems. This would guarantee that no matter where a patient goes for care, their provider will be able to access their medical information.'),
    textBlock('The ACA does not address interoperability, but HITECH was passed just before the ACA and incentivizes better communication between EHR systems.'),

    textBlock('People Shop for Quality and Cost', 'h4'),
    textBlock('When people have information about prices and quality, they can make more informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers.'),
    textBlock('The exchanges created by the ACA enable some degree of shopping. However, price and quality information for individual procedures is not widely accessible.'),

    textBlock('Personalize Medicine', 'h4'),
    textBlock('As sequencing costs continue to drop below $1000 per genome, it will soon become normal for every person to have their genome analyzed. The information that results enables tailored treatment plans where medication type and dosage are adapted to a person\u2019s genetic makeup.'),
    textBlock('The ACA does not address personalized medicine. However, President Obama\u2019s Precision Medicine Initiative seeks to generate scientific evidence to move personalized medicine into every day clinical practice.'),

    textBlock('Coordinate Care', 'h4'),
    textBlock('People with chronic conditions (heart disease, diabetes, cancer, etc.) often need many different types of care. For example, someone with diabetes may suffer from dietary challenges, ulcers, damaged nerves, and many other conditions. Coordinating care will increase quality and ultimately save money.'),
    textBlock('The ACA encourages the development of new patient care models through financial incentives. For example, Accountable Care Organizations (ACOs) that take responsibility for the cost and quality of caring for patients can receive a share of the savings they achieve for Medicare.'),

    textBlock('Destigmatize Death', 'h4'),
    textBlock('Many people spend their final days undergoing intensive treatments. Patients with advanced cancers often opt for intensive treatment that decreases their quality of life and barely increases (or in some cases decreases) their remaining time. Yet, most people want to pass peacefully in their own homes surrounded by loved ones. There is a disconnect between how we want to spend the end of our lives, how we are capable of spending that time, and how we actually spend that time.'),
    textBlock('No parts of the ACA directly deal with end-of-life care. Originally, a portion of the act was supposed to enable physicians to be reimbursed for having advanced care planning discussions with their patients. However, this portion was removed from the bill before it was passed because it was publicized as something that would result in a \u201Cdeath panel.\u201D'),

    textBlock('Improve Doctor Training', 'h4'),
    textBlock('Doctors have been trained according to a model developed over a century ago. Medical education should be less expensive and shorter. Doctors should be learning skills within the same care teams that they will eventually be operating (including nurses, social workers, and others). Most healthcare is delivered outside of the hospital, yet most medical training occurs within hospitals.'),
    textBlock('Although it provides support for workforce training programs, the ACA does not significantly revamp medical education.'),

    textBlock('Clinicians Communicate Better with Patients', 'h4'),
    textBlock('The amount of time doctors spend with patients is decreasing. The time that they do spend with patients is often dominated by clicking and typing in the EHR. As new technology enters the care paradigm, it is important that doctors receive training on how to maintain a strong doctor-patient relationship.'),
    textBlock('The ACA does not directly address patient-communication. However, it does include support for enhanced cultural competency, prevention/public health, and individuals with disabilities training.'),

    textBlock('Make Prices Transparent', 'h4'),
    textBlock('When people have information about prices and quality, they can make more informed purchasing decisions. This will put downward pressure on costs and upward pressure on quality due to increased competition. In addition to transparency, this requires a health data standard so that patients can easily move between providers.'),
    textBlock('The exchanges created by the ACA enable some degree of shopping. However, price and quality information for individual procedures is not widely accessible.'),

    textBlock('Incentivize Outcomes', 'h4'),
    textBlock('Currently, most providers are paid for each service they provide. This means that a clinician receives payment whenever they order a test or perform a procedure, regardless of whether the procedure was necessary or the outcome was positive. By reimbursing based on outcomes, payers can incentivize better quality while simultaneously decreasing costs.'),
    textBlock('The ACA explores new payment models to incentivize outcomes and reduce costs. These include approaches like shared savings (for ACOs) and bundled payments.'),

    textBlock('Reform Malpractice Laws', 'h4'),
    richBlock([
      { text: 'The current malpractice system fails both patients and physicians. A 1991 study in New York showed that 97% of physician and hospital mistakes that result in harm do not lead to a lawsuit.', marks: [] },
      { text: '47', marks: ['sup'] },
      { text: ' At the same time, of all malpractice suits filed, 80% were not related to an adverse event caused by a physician or hospital. That means that patients are not being reimbursed when they deserve to be, and doctors are being sued when they should not be. Additionally, in order to protect them against malpractice lawsuits, some suggest that doctors practice defensive medicine by ordering exhaustive testing. Health Affairs estimated the costs of defensive medicine to be ', marks: [] },
      { text: '$55 billion', marks: ['strong'] },
      { text: '.', marks: [] },
      { text: '48', marks: ['sup'] },
    ]),
    textBlock('The ACA does not address malpractice reform. Most reforms will have to take place at the state level, but the ACA did nothing to incentivize such reforms.'),
  ]))

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: PARTICIPATE
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Participate', 'h2'))

  // Use a 3-column layout for the participate section
  const emailLink = linkMark('mailto:feedback-ushealthcare@goinvo.com')
  const githubLink = linkMark('https://github.com/goinvo/ushealthcare', true)

  blocks.push(columnsBlock('3', [
    textBlock('Give Feedback', 'h3'),
    richBlock([
      { text: 'Send us an email at ', marks: [] },
      { text: 'feedback-ushealthcare@goinvo.com', marks: [emailLink.markKey] },
    ], 'normal', [emailLink.markDef]),
    textBlock('Remix and Reuse', 'h3'),
    richBlock([
      { text: 'Contribute to the project with new data and insights at ', marks: [] },
      { text: 'github.com/goinvo/ushealthcare', marks: [githubLink.markKey] },
    ], 'normal', [githubLink.markDef]),
    textBlock('Share', 'h3'),
    textBlock('Help spread the word by sharing this article with your network.'),
  ]))

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCES
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(referencesBlock(refs))

  return blocks
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const slug = 'healing-us-healthcare'
  console.log(`\n=== Migrating ${slug} ===\n`)

  // Load references JSON
  const refsPath = resolve(process.cwd(), 'src/data/vision/healing-us-healthcare/references.json')
  const refs = JSON.parse(readFileSync(refsPath, 'utf8'))
  console.log(`  Loaded ${refs.length} references`)

  // Fetch the existing document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] { _id, title }`,
    { slug }
  )

  if (!doc) {
    console.error(`  ERROR: Feature document not found for slug "${slug}"`)
    process.exit(1)
  }

  console.log(`  Found document: ${doc.title} (${doc._id})`)

  // Create team members for Cecile Lu and Neil Rens if they don't exist
  const teamMembers = [
    {
      _id: 'alumni-cecile-lu',
      _type: 'teamMember',
      name: 'Cecile Lu',
      role: 'Architect, Designer',
    },
    {
      _id: 'alumni-neil-rens',
      _type: 'teamMember',
      name: 'Neil Rens',
      role: 'Biomedical Engineer',
    },
  ]

  if (DRY_RUN) {
    console.log('  DRY RUN - would build content and patch document')
    const content = buildContent(refs)
    console.log(`  Would generate ${content.length} blocks`)
    console.log('  Would createIfNotExists team members: Cecile Lu, Neil Rens')
    console.log('  Would set subtitle, link 2 authors (Cecile Lu, Neil Rens)')
    return
  }

  // Create team members if they don't exist
  for (const member of teamMembers) {
    await client.createIfNotExists(member)
    console.log(`  Ensured team member: ${member.name} (${member._id})`)
  }

  // Build all content blocks
  const content = buildContent(refs)
  console.log(`  Generated ${content.length} blocks`)

  // Author references — Cecile Lu and Neil Rens
  const authors = [
    { _type: 'reference', _ref: 'alumni-cecile-lu', _key: key() },
    { _type: 'reference', _ref: 'alumni-neil-rens', _key: key() },
  ]

  // Patch the document
  await client
    .patch(doc._id)
    .set({
      subtitle: '$9,255. That\u2019s how much your health costs the U.S. every year. Follow David\u2019s healthcare journey and discover our vision for better healthcare.',
      content,
      authors,
    })
    .commit()

  console.log(`  Patched "${doc.title}" with:`)
  console.log(`    - subtitle`)
  console.log(`    - ${content.length} content blocks`)
  console.log(`    - 2 authors (Cecile Lu, Neil Rens)`)
  console.log('\nDone!\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
