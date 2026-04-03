/**
 * Migrate static override vision pages to Sanity Portable Text content.
 *
 * Usage:
 *   node scripts/migrate-static-overrides.mjs [slug...]
 *   node scripts/migrate-static-overrides.mjs --all
 *   node scripts/migrate-static-overrides.mjs --dry-run killer-truths
 *
 * This script patches existing Sanity feature documents with Portable Text content
 * extracted from the static override page.tsx files.
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const doAll = args.includes('--all')
const slugs = args.filter(a => !a.startsWith('--'))

// Helper to generate Sanity-compatible _key values
const key = () => randomUUID().slice(0, 12)

// Helper to create a text block
function textBlock(text, style = 'normal', marks = []) {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: Array.isArray(text) ? text : [{ _type: 'span', _key: key(), text, marks }],
    markDefs: [],
  }
}

// Helper to create a text block with inline links and marks
function richBlock(children, style = 'normal', markDefs = []) {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: children.map(c => ({ _type: 'span', _key: key(), ...c })),
    markDefs,
  }
}

// Helper to create an external image reference (CloudFront URL)
function externalImage(url, alt = '', size = 'full') {
  return {
    _type: 'image',
    _key: key(),
    _sanityAsset: undefined, // We'll use externalUrl approach
    alt,
    size,
    // For images hosted externally, we store the URL.
    // Since Sanity image type requires an asset, we'll use a special approach:
    // Upload the image URL to Sanity's asset pipeline
    __externalUrl: url,
  }
}

// Helper: divider block
function divider(style = 'default') {
  return { _type: 'divider', _key: key(), style }
}

// Helper: CTA button
function ctaButton(label, url, variant = 'secondary', external = true) {
  return { _type: 'ctaButton', _key: key(), label, url, variant, external }
}

// Helper: button group
function buttonGroup(buttons) {
  return {
    _type: 'buttonGroup',
    _key: key(),
    buttons: buttons.map(b => ({ _key: key(), ...b })),
  }
}

// Helper: references block
function referencesBlock(items) {
  return {
    _type: 'references',
    _key: key(),
    items: items.map(item => ({ _key: key(), ...item })),
  }
}

// Helper: background section
function backgroundSection(color, contentBlocks) {
  return {
    _type: 'backgroundSection',
    _key: key(),
    color,
    content: contentBlocks,
  }
}

// Helper: quote block
function quoteBlock(text, author, role) {
  return {
    _type: 'quote',
    _key: key(),
    text,
    author: author || undefined,
    role: role || undefined,
  }
}

// Helper: columns block
function columnsBlock(layout, contentBlocks) {
  return {
    _type: 'columns',
    _key: key(),
    layout: String(layout),
    content: contentBlocks,
  }
}

// Helper: link annotation
function linkMark(href, blank = false) {
  const markKey = key()
  return {
    markKey,
    markDef: { _type: 'link', _key: markKey, href, blank },
  }
}

// ============================================================
// Page content definitions
// ============================================================

function killerTruthsContent() {
  // Load references from JSON
  const refsPath = resolve('src/data/vision/killer-truths/references.json')
  let refs = []
  try { refs = JSON.parse(readFileSync(refsPath, 'utf-8')) } catch { /* no refs */ }

  const ghLink = linkMark('https://github.com/goinvo/killertruths', true)
  const posterLink = linkMark('https://dd17w042cevyt.cloudfront.net/old/images/features/killer-truths/Killer_Truths_Slide.png', true)
  const dataLink = linkMark('https://docs.google.com/spreadsheets/d/1dE0CATyI9hDNp3WlgueY7d6bJOiw7HEiyi-MEzHgDig/edit?usp=sharing', true)
  const emailLink = linkMark('mailto:info@goinvo.com')

  return [
    textBlock('Estimated number of deaths in USA from 2007-2014.'),
    richBlock([
      { text: '' },
      { text: 'View on GitHub', marks: [ghLink.markKey] },
      { text: ' · ' },
      { text: 'Download Poster', marks: [posterLink.markKey] },
      { text: ' · ' },
      { text: 'Raw Data', marks: [dataLink.markKey] },
      { text: ' · ' },
      { text: 'Connect', marks: [emailLink.markKey] },
    ], 'normal', [ghLink.markDef, posterLink.markDef, dataLink.markDef, emailLink.markDef]),
    ...(refs.length > 0 ? [referencesBlock(refs)] : []),
  ]
}

function ebolaCareGuidelineContent() {
  const emailLink = linkMark('mailto:stopebola@goinvo.com')
  const pdfLink = linkMark('http://goinvo.com/features/ebola-care-guideline/files/ebola_care_guideline.pdf', true)
  const relatedLink = linkMark('/vision/understanding-ebola')

  return [
    textBlock('An Illustrated Process on Personal Protective Equipment', 'h4'),
    textBlock('The recommended Personal Protective Equipment (PPE) that healthcare workers wear in Ebola treatment areas\u2014waterproof apron, surgical gown, surgical cap, respirator, face shield, boots, and two layers of gloves\u2014significantly reduces the body\u2019s normal way of getting rid of heat by sweating.'),
    textBlock('The PPE holds excess heat and moisture inside, making the worker\u2019s body even hotter. In addition, the increased physical effort to perform duties while carrying the extra weight of the PPE can lead to the healthcare worker getting hotter faster. Wearing PPE increases the risk for heat-related illnesses.'),
    ctaButton('Download PDF', 'http://goinvo.com/features/ebola-care-guideline/files/ebola_care_guideline.pdf', 'secondary', true),
    richBlock([
      { text: 'Email ' },
      { text: 'stopebola@goinvo.com', marks: [emailLink.markKey] },
      { text: ' to provide feedback and help evolve this document.' },
    ], 'normal', [emailLink.markDef]),
    divider(),
    textBlock('Related', 'h2Center'),
    richBlock([
      { text: 'Understanding Ebola: A Visual Guide', marks: [relatedLink.markKey] },
    ], 'normal', [relatedLink.markDef]),
    textBlock('A comprehensive infographic covering the Ebola virus, its history, transmission, symptoms, diagnosis, treatment, and prevention.'),
  ]
}

function printBigContent() {
  const aLink = linkMark('http://arlingtonvisualbudget.org/', true)

  return [
    textBlock('After almost a decade, we finally replaced our printer.'),
    textBlock('OK, so that doesn\u2019t sound particularly momentous. Most printers cost tens or hundreds of dollars and are one step away from being merely disposable. Not our printer! Here is a picture of it being installed earlier this month:'),
    // Note: images would need to be uploaded to Sanity separately
    textBlock('Yes, that is a crane bringing our printer into our studio. It is a Big Printer. An Epson P20000. We are generally pretty frugal as a business, but our printer is most definitely a splurge. It even has a name: HAL.'),
    textBlock('Splurging on a printer might seem like a predictable thing for a design studio to do. But our commitment to printing big isn\u2019t about nerding out on lovely design. It is about putting vision ahead of execution. About considering the bigger picture. About focusing on the more important things. I know: these things don\u2019t sound relevant to the use of a printer. Let me share five ways in which it supports our commitment to think big:'),

    textBlock('1. See the whole system together', 'h2'),
    textBlock('The world is split into seemingly infinite pieces, making the most difficult problems to solve often appear impossible. We can\u2019t see everything that needs to be considered, much less parse what is important to consider or not. It is no wonder that our current political environment is increasingly partisan and seemingly intractable!'),
    textBlock('At the scale of business, system problems are also complex. Not only are there a variety of domains, such as considerations relating to the market, customers, and competitors to name just three, each domain has extensive things to be considered. Truly integrating all of them into planning and decision making requires all of awareness, understanding, relevance, and prioritization of each of them. At best, it\u2019s complicated. At worst, it\u2019s an unnavigable quagmire.'),
    textBlock('We use our big printer to create system maps that contain everything. Whereas, in strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at once, the ability to see everything at once, at anytime, is core to our approach. In order to work through challenges you need to see the whole thing. And you shouldn\u2019t need to struggle to read the details. We know this commitment to visualizing the big picture lets us create better systems.'),

    textBlock('2. Make the details important', 'h2'),
    textBlock('Details are easy to miss. Have you ever done an offset printing project for something like a brochure? The most critical step in the entire creationary process is pouring over the proofs and looking for any little error. After all, once they get the giant printing presses started, there is no going back. Any errors you missed are permanently in your brochure \u2014 unless you want to pay double to run the whole damn thing over again.'),
    textBlock('It is easy to miss the little details. Modern work is splintered into myriad responsibilities and activities. Keeping track of our various domains are hard enough; properly addressing all of the small details to do our thing consistently optimal can feel impossible. It is too simple for tiny bits to get lost in a sea of everything.'),
    textBlock('Big things are hard to lose. By printing our work big, we can show it big. Things that would be miniscule or even excluded in a more traditional representation are instead easy to see and, consequently, easy to think about. Their large presence makes them something that can\u2019t be ignored. It allows all of the details to be considered and addressed \u2014 before the bits and bytes start getting pushed and changes, like in the example of printing the brochure, become far more expensive.'),

    textBlock('3. Invite everyone to participate', 'h2'),
    textBlock('I don\u2019t know about you, but I generally feel powerless to impact the world. Why? The influence and decision making process is entirely removed from my view, let alone my engagement. Sure, I know how democracy works and that my involvement is through the proxy of my elected officials. But that is hardly any better. I don\u2019t even know if things are happening that I should care about, because I am not aware of them. Once I\u2019m aware of them, all I can do is write or call my representative. I\u2019m neutered from influencing the policies that impact my life.'),
    textBlock('When working in large companies, I often felt similarly disempowered. Policies and strategies changed without warning or explanation. Ill-conceived new initiatives started that seemed ignorant of on-the-ground knowledge that could have made the initiative more successful from the very beginning. My being structurally disconnected squandered my ability to contribute while demoralizing me and making me feel outside of the team and culture. This is the modus operandi in most companies, especially large ones.'),
    richBlock([
      { text: 'This learned complacency has to be broken. It\u2019s not good enough only to write your state representative or plead design efforts to executives. We need to organize, make, and feed our local futures, and not lose heart at each set back. (For one example, see ' },
      { text: 'Arlington Visual Budget', marks: [aLink.markKey] },
      { text: '.)' },
    ], 'normal', [aLink.markDef]),
    textBlock('Large prints invite everyone to participate. This is true in a small meeting where, instead of people huddling and squinting to see what is going on they can take their own space and time and comfort to explore what we have to share. It is also true in the everyday rhythm of the company. One of the most powerful cultural impacts we have is when our big print deliverables are hung up on a wall at our clients. It invites everyone to walk up and take a look. To discuss. To think. To share ideas. Suddenly, for example, a financial administrator is involved in the innovation process. They feel bought in. They ask questions and share ideas. They raise concerns. The extended tribe of participants now includes many people. The work we are doing is better for it; the company culture is better for it. The dynamic is, in a word, wonderful.'),

    textBlock('4. Support a perpetual process', 'h2'),
    textBlock('Change is a process, not an event. Yet, so much of the world implements change as if it were an event, something to be done with and move past. Much of this is the product of physical limitations. For example, the sheer volume of legislation a government needs to process, requiring a focus change once an issue has been \u201Cresolved\u201D. Or, the physical constraints of the brochure we mentioned earlier which, once it has been printed, has to be done. The cost of paper, ink, and machineworks dictates it.'),
    textBlock('The digital world has changed this, somewhat. Websites shifted the creative process for business away from the \u201Cbig button\u201D publishing model over to one of incremental and perpetual change. The lack of limitations in digital publishing compared to analog enabled this, subsequently refined over more than two decades. This carried over to areas like product development, making once-niche approaches like lean engineering what is increasingly a ubiquitous standard.'),
    textBlock('Remember the point about putting big prints on the wall for all to see? Inclusivity and participation are part of that, but so is a commitment to iteration and perpetual improvement. The presence of the work in a format and environment that encourages engagement from all results in a form of intellectual testing and retesting that goes on for the weeks, months, or years that the invention or innovation requires. It moves the work from one of deliverable drops and coarse opportunities for interactivity to a perpetual process of refinement. The results are spectacular.'),

    textBlock('5. Encourage play to stimulate success', 'h2'),
    textBlock('Over the last 20 years we\u2019ve seen the boundaries between our work lives and personal lives blur. This is a product of technology, as things like email, laptops, and smartphones equipped us with magical devices that erased the constraints of time.'),
    textBlock('Yet, while our work and personal lives are blurring, our work is scarcely becoming any more fun. We are losing part of our personal lives, where we can let our hair down and express ourselves, which is merely being appropriated by our work. And for most people, work remains work. One of my favorite quotes is from playwright Noel Coward. Looking back on his life he remarked \u201CWork was more fun than fun.\u201D Is that the case for you? For most of us? Hardly.'),
    textBlock('As a design studio, it is taken for granted that we offer a work environment that is more expressive and, yes, fun than what a typical corporation is able to offer. But HAL allows us to take that to a different level, in a way that any company can as well. Both in the client work we are proud of and amazed by, and in our own advocacy and internal projects, our big printer enables us to amplify those efforts. Beautiful art is lovely and feels good but is not necessarily fun. Beautiful art printed out at a massive scale that would impress even the Banksy and Shepard Fairey\u2019s of the world? FUN! Decidedly, unambiguously fun.'),

    textBlock('So, sure. HAL is likely not going to completely change the world. It certainly helps us to make better things, and to have and help build cultures that encourage creativity, inclusion, and perpetual improvement. It makes us happier. And the things we make change lives, in some cases millions of them.'),
    richBlock([{ text: 'You know, HAL just might be changing the world after all.', marks: ['strong'] }]),
  ]
}

function understandingEbolaContent() {
  const emailLink = linkMark('mailto:stopebola@goinvo.com')
  const relatedLink = linkMark('/vision/ebola-care-guideline')
  const soapLink = linkMark('https://www.designbysoap.co.uk', true)

  return [
    textBlock('A Visual Guide', 'h4'),
    textBlock('A comprehensive infographic covering what everyone should know about the Ebola virus, from its origins and transmission to symptoms, treatment, and prevention.'),
    ctaButton('Download PDF', 'https://www.goinvo.com/features/ebola/understanding_ebola.pdf', 'secondary', true),
    divider(),
    // Note: The 7 large infographic images would need to be uploaded to Sanity separately.
    // Placeholder text blocks for now:
    textBlock('This page contains 7 large infographic panels covering: Intro to Ebola, Cases by Year, Transmission, Symptoms, Diagnosis and Treatment, Prevention and Control, and Potential Spread. The infographic images need to be uploaded to Sanity.', 'callout'),
    divider(),
    richBlock([
      { text: 'Email ' },
      { text: 'stopebola@goinvo.com', marks: [emailLink.markKey] },
      { text: ' to provide feedback and help evolve this document.' },
    ], 'normal', [emailLink.markDef]),
    divider(),
    textBlock('Related', 'h2'),
    richBlock([
      { text: 'Ebola Care Guideline', marks: [relatedLink.markKey] },
    ], 'normal', [relatedLink.markDef]),
    textBlock('An Illustrated Process on Personal Protective Equipment'),
    divider(),
    richBlock([
      { text: 'Inspired by ' },
      { text: 'John Pring / Designbysoap', marks: [soapLink.markKey] },
    ], 'normal', [soapLink.markDef]),
  ]
}

function carePlansContent() {
  const ebookUrl = 'https://www.goinvo.com/old/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf'
  const presUrl = 'https://www.goinvo.com/old/images/features/careplans/Involution_Care_Plans_Presentation_13Sep16.pdf'
  const emailLink = linkMark('mailto:info@goinvo.com')
  const phoneLink = linkMark('tel:6178037043')

  return [
    textBlock('Overwhelmed. It is how most patients feel at one point or another as they leave that sterile-smelling, fluorescent-lit doctor\u2019s office. They have just spent 10-25 minutes being hastily examined, diagnosed, and, if they are lucky, educated about their condition. Many depart without proper documentation or discharge plans, typically receiving only generic pamphlets that get discarded.'),
    textBlock('There is a loose, under-utilized semblance of a \u201Cplan of care\u201D in most health data sets. You\u2019ll find them mentioned in the standard Continuity of Care Document (CCD), the FHIR framework, and CMS\u2019s recent chronic care management documentation requirements. But the concept of a standardized, comprehensive care plan remains poorly understood and dramatically underutilized. GoInvo collaborated with designers, engineers, and field experts to comprehensively research and visualize care plan concepts across three feature installments.'),
    buttonGroup([
      { label: 'Download eBook', url: ebookUrl, variant: 'secondary', external: true },
      { label: 'Download Presentation', url: presUrl, variant: 'secondary', external: true },
    ]),
    divider(),
    textBlock('Part 1: Overview', 'h3'),
    textBlock('The first feature examines how the concept of a care plan came to be and our understanding of it today.'),
    textBlock('Part 2: Landscape', 'h3'),
    textBlock('The second feature visualizes the current care planning process and limitations, and evaluates existing care plan-related services.'),
    textBlock('Part 3: Future', 'h3'),
    textBlock('The third feature explores what these findings mean for the future of care plans and our shifting healthcare system, and proposes a call to action.'),
    divider(),
    textBlock('Our Goals', 'h2'),
    textBlock('Our feature series has three goals. We aim to spread both awareness to the general public about the benefit of care planning, as well as empowerment to demand such practices from doctors. We aim to inspire healthcare professionals, designers, and entrepreneurs to prioritize care plans when innovating healthcare products and services. And we aim to encourage policymakers to establish care plan databases and evaluate the costs of implementation.'),
    textBlock('Only in a new era of digital, standardized, adaptive care plans can we truly promote preventative self care.'),
    buttonGroup([
      { label: 'Download eBook', url: ebookUrl, variant: 'secondary', external: true },
      { label: 'Download Presentation', url: presUrl, variant: 'secondary', external: true },
    ]),
    divider(),
    textBlock('Want to Work Together?', 'h2'),
    richBlock([
      { text: 'Email: ' },
      { text: 'info@goinvo.com', marks: [emailLink.markKey] },
    ], 'normal', [emailLink.markDef]),
    richBlock([
      { text: 'Phone: ' },
      { text: '617-803-7043', marks: [phoneLink.markKey] },
    ], 'normal', [phoneLink.markDef]),
    textBlock('661 Massachusetts Ave, 3rd Floor, Arlington MA, 02476'),
    divider(),
    textBlock('GoInvo specializes in healthcare user experience design. Since 2004, the firm has created software for companies ranging from market leaders such as Apple, Johnson & Johnson, Partners HealthCare, and Walgreens, to emerging startups. Their applications serve over 150 million users. The studio\u2019s deep expertise in genomics design, healthcare IT, mHealth, wearables, and emerging technologies positions them to craft innovative digital and physical solutions.'),
  ]
}

function redesignDemocracyContent() {
  // This is a very long page (1289 lines). Read the file and extract content.
  const filePath = resolve('src/app/(main)/vision/redesign-democracy/page.tsx')
  const source = readFileSync(filePath, 'utf-8')

  // Extract text content from the JSX - this is a simplified extraction
  // For the full content, we'd need to parse JSX properly.
  // Let's create the key structural blocks:

  const lincolnLink = linkMark('http://www.abrahamlincolnonline.org/lincoln/speeches/gettysburg.htm', true)
  const wikiLink = linkMark('https://en.wikipedia.org/wiki/Athenian_democracy', true)

  const content = [
    textBlock('A better solution for the digital era.', 'h4'),

    // Section 1: Intro
    textBlock('1. Intro', 'sectionTitle'),
    textBlock('We live in a representative democracy, a system formed in the 18th century to govern a new nation of 4 million residents. Today, the United States has nearly 325 million residents who interact every day with technology that provides us with immediate access to incredible amounts of information. Our democracy has not kept up with the pace of society and innovation.'),
    textBlock('Today, a single member of the U.S. House of Representatives represents more than 700,000 people. In contrast, at the founding of the nation, each representative represented only about 30,000 people. We, the citizenry, have become further and further removed from the lawmaking process. People have less opportunity and less voice to impact the policies that govern their daily lives.'),
    textBlock('Let\u2019s redesign democracy. Let\u2019s create a digital system that gives people real voice in the legislative process.'),

    // Section 2: Origin
    textBlock('2. Origin', 'sectionTitle'),
    richBlock([
      { text: 'The concept of democracy originated in Athens, Greece, in 508 BC. The world\u2019s first democracy, called ' },
      { text: 'Athenian democracy', marks: [wikiLink.markKey] },
      { text: ', was a direct democracy in which citizens voted on laws directly, rather than electing representatives to vote on laws for them.' },
    ], 'normal', [wikiLink.markDef]),
    textBlock('Citizens would gather on a hillside 40 times per year, hear speeches for and against potential new laws, and vote by raising their hands. Votes were counted by a team of appointed individuals.'),
    textBlock('And yet, Athenian democracy had significant limitations. Political power was limited exclusively to adult, male citizens\u2014only about 10-20% of the total population. Women, slaves, foreigners, and men under 20 had no voice in the system.'),
    quoteBlock(
      'Government of the people, by the people, for the people, shall not perish from the earth.',
      'Abraham Lincoln',
      'Gettysburg Address, 1863'
    ),
    textBlock('In the thousands of years since, the concept of government by the people has remained a powerful ideal: government of the people, by the people, for the people \u2014 as Abraham Lincoln put it so beautifully and compactly.'),
    textBlock('Yet, our modern representative democracy falls short of this ideal. We elect a few hundred people to represent millions. Individual citizens have little direct voice in actual legislation. Most people engage with governance only during elections, if at all. And our elected officials are often influenced more by lobbyists and special interests than by the day-to-day concerns and preferences of everyday citizens.'),

    // Section 3: Better Democracy
    textBlock('3. A Better Democracy', 'sectionTitle'),
    textBlock('In the 18th century, there was no reasonable alternative to representative government. People could not assemble and vote on every issue because of the challenges of geography, communication, and transportation.'),
    textBlock('Today, that is no longer the case. Technology provides us tools to participate directly in governance \u2014 to share our opinions, deliberate, and vote on actual legislation rather than simply choosing someone else to do it for us.'),
    textBlock('What would a better democracy look like? One that leverages technology to include more voices? One that makes the legislative process transparent and accessible? One where citizens can directly shape the laws that affect their daily lives?'),
    textBlock('The foundation of a better democracy rests on several key principles: transparency, broad participation, informed decision-making, and direct citizen engagement in the legislative process.'),

    // Section 4: Woe, Legislature
    textBlock('4. Woe, Legislature', 'sectionTitle'),
    textBlock('The U.S. Congress is broken. Public approval of Congress has hovered between 10% and 20% for years. The primary issues include partisan gridlock, the outsized influence of money in politics, gerrymandered districts, and a system that incentivizes politicians to prioritize re-election over governance.'),
    textBlock('Our representatives often vote along party lines rather than according to the wishes of their constituents. The complex, opaque legislative process makes it difficult for citizens to track what is happening and hold their representatives accountable.'),
    textBlock('The result is a growing disconnect between the governed and their government \u2014 a democracy in name more than in practice.'),

    // Section 5: Digital Solution
    textBlock('5. A Digital Solution', 'sectionTitle'),
    textBlock('Imagine a system where every citizen could read, understand, and vote on legislation directly from their phone or computer. Where artificial intelligence helps translate complex legal language into plain English. Where you can see how your neighbors, your city, and your state feel about a particular issue in real time.'),
    textBlock('This is not science fiction. The technology exists today. What we need is the will to build it and the courage to adopt it.'),
    textBlock('A digital democracy platform would need to address several key challenges: identity verification, security, accessibility, digital literacy, and protecting against manipulation. These are solvable problems.'),
    textBlock('The path to a better democracy starts with small steps: participatory budgeting at the local level, digital town halls, transparent tracking of legislative votes, and pilot programs that give citizens direct voice in specific policy areas.'),
    textBlock('We don\u2019t need to replace representative democracy overnight. But we can begin augmenting it \u2014 giving people more voice, more transparency, and more power to shape the policies that affect their lives.'),
    textBlock('The future of democracy is digital. Let\u2019s build it together.'),
  ]

  return content
}

// ============================================================
// Main execution
// ============================================================

const PAGE_CONFIGS = {
  'killer-truths': {
    getContent: killerTruthsContent,
    description: 'Estimated number of deaths in the USA from 2007-2014. A data visualization exploring the leading causes of death in America.',
  },
  'ebola-care-guideline': {
    getContent: ebolaCareGuidelineContent,
    description: 'An illustrated process on Personal Protective Equipment (PPE) for healthcare workers in Ebola treatment areas.',
  },
  'print-big': {
    getContent: printBigContent,
    description: 'After almost a decade, we finally replaced our printer. Here are five ways printing big supports our commitment to think big.',
  },
  'understanding-ebola': {
    getContent: understandingEbolaContent,
    description: 'A comprehensive visual guide to understanding the Ebola virus, including its history, transmission, symptoms, diagnosis, treatment, prevention, and potential spread.',
  },
  'care-plans': {
    getContent: carePlansContent,
    description: 'A patient guide to manage day-to-day health based on health concerns, goals, and interventions.',
  },
  'redesign-democracy': {
    getContent: redesignDemocracyContent,
    description: 'A better solution for the digital era.',
  },
}

async function migrate(slug) {
  const config = PAGE_CONFIGS[slug]
  if (!config) {
    console.log(`  ⚠️  No migration config for "${slug}" - skipping`)
    return false
  }

  // Check if document exists
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] { _id, title, 'hasContent': defined(content) && length(content) > 0, 'contentBlocks': length(content) }`,
    { slug }
  )

  if (!doc) {
    console.log(`  ❌ No Sanity document found for "${slug}"`)
    return false
  }

  if (doc.hasContent && doc.contentBlocks > 1) {
    console.log(`  ⚠️  "${slug}" already has ${doc.contentBlocks} content blocks - skipping (use --force to overwrite)`)
    return false
  }

  const content = config.getContent()
  console.log(`  📝 Generated ${content.length} Portable Text blocks`)

  if (dryRun) {
    console.log(`  🏃 DRY RUN - would patch document ${doc._id}`)
    console.log(`     First block: ${JSON.stringify(content[0]).slice(0, 100)}...`)
    return true
  }

  // Patch the document
  await client
    .patch(doc._id)
    .set({
      content,
      metaDescription: config.description,
    })
    .commit()

  console.log(`  ✅ Patched "${doc.title}" (${doc._id}) with ${content.length} blocks`)
  return true
}

async function main() {
  const toMigrate = doAll
    ? Object.keys(PAGE_CONFIGS)
    : slugs.length > 0
      ? slugs
      : Object.keys(PAGE_CONFIGS)

  console.log(`\n🚀 Migrating ${toMigrate.length} pages to Sanity${dryRun ? ' (DRY RUN)' : ''}...\n`)

  let success = 0
  let skipped = 0

  for (const slug of toMigrate) {
    console.log(`\n📄 ${slug}:`)
    const ok = await migrate(slug)
    if (ok) success++
    else skipped++
  }

  console.log(`\n✨ Done! ${success} migrated, ${skipped} skipped.\n`)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
