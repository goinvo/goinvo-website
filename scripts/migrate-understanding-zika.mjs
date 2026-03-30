/**
 * Migrate understanding-zika content to Sanity.
 *
 * Uploads ~53 images from the Gatsby CDN, builds Portable Text blocks
 * for the full article (What is Zika, How it Spreads, Prevention,
 * Symptoms, Timeline, Cases Map, Transmission Detail, Prevention Detail,
 * Bug Spray Guide, Symptoms Detail, Microcephaly, GBS, Treatment,
 * Flaviviruses, What We Don't Know, WHO Action Plan, References).
 *
 * Patches the existing feature document slug "understanding-zika".
 *
 * Usage:
 *   node scripts/migrate-understanding-zika.mjs
 *   node scripts/migrate-understanding-zika.mjs --dry-run
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const CDN = 'https://www.goinvo.com'
const IMG_BASE = '/old/images/features/zika'
const dryRun = process.argv.includes('--dry-run')
const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

// ─── Helpers ────────────────────────────────────────────────────────────────

async function uploadImage(url, filename) {
  const response = await fetch(url)
  if (!response.ok) {
    console.log(`    WARN: Failed to fetch ${url} (${response.status})`)
    return null
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType,
  })

  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
  }
}

function imageBlock(assetRef, alt = '', size = 'full') {
  return {
    _type: 'image',
    _key: key(),
    asset: assetRef.asset,
    alt,
    size,
  }
}

function textBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
    markDefs: [],
  }
}

function richBlock(children, style = 'normal', markDefs = []) {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: children.map(c => ({ _type: 'span', _key: key(), text: c.text, marks: c.marks || [] })),
    markDefs,
  }
}

function linkMark(href, blank = false) {
  const markKey = key()
  return {
    markKey,
    markDef: { _type: 'link', _key: markKey, href, blank },
  }
}

function dividerBlock() {
  return {
    _type: 'divider',
    _key: key(),
    style: 'default',
  }
}

function ctaButton(label, url, variant = 'primary', external = false) {
  return {
    _type: 'ctaButton',
    _key: key(),
    label,
    url,
    variant,
    external,
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

function backgroundSection(color, innerBlocks) {
  return {
    _type: 'backgroundSection',
    _key: key(),
    color,
    content: innerBlocks,
  }
}

function columnsBlock(layout, columns) {
  return {
    _type: 'columns',
    _key: key(),
    layout: String(layout),
    columns: columns.map(col => ({
      _type: 'column',
      _key: key(),
      content: col,
    })),
  }
}

// ─── Image definitions ──────────────────────────────────────────────────────

const IMAGES = {
  // Hero
  hero: { path: '/images/features/understanding-zika/understanding-zika-featured.jpg', filename: 'understanding-zika-hero.jpg', alt: 'Understanding Zika' },

  // Spread cards
  spreadMosquito: { path: `${IMG_BASE}/spread-mosquito.png`, filename: 'zika-spread-mosquito.png', alt: 'Person to mosquito to person transmission' },
  spreadMother: { path: `${IMG_BASE}/spread-mother.png`, filename: 'zika-spread-mother.png', alt: 'Mother to unborn child transmission' },
  spreadPartner: { path: `${IMG_BASE}/spread-partner.png`, filename: 'zika-spread-partner.png', alt: 'Man to sexual partner transmission' },
  spreadBloodbank: { path: `${IMG_BASE}/spread-bloodbank.png`, filename: 'zika-spread-bloodbank.png', alt: 'Person to blood bank to person transmission' },

  // Prevention grid
  preventTravel: { path: `${IMG_BASE}/prevent-travel-2.png`, filename: 'zika-prevent-travel.png', alt: 'Avoid travel to affected areas' },
  emptyWater: { path: `${IMG_BASE}/emptywater.png`, filename: 'zika-empty-water.png', alt: 'Remove standing water' },
  preventBugspray: { path: `${IMG_BASE}/prevent-bugspray.png`, filename: 'zika-prevent-bugspray.png', alt: 'Use insect repellent' },
  preventClose: { path: `${IMG_BASE}/prevent-close-2.png`, filename: 'zika-prevent-close.png', alt: 'Keep doors screened or closed' },

  // Symptoms section
  oneInFive: { path: `${IMG_BASE}/1in5.svg`, filename: 'zika-1in5.svg', alt: 'Only 1 in 5 infected people develop symptoms' },
  symptoms: { path: `${IMG_BASE}/zika-symptoms.png`, filename: 'zika-symptoms.png', alt: 'Zika symptoms: headache, fever, red eyes, joint pain, rash, muscle pain' },

  // Timeline images
  timeline1947: { path: `${IMG_BASE}/1947-zika-forest.jpg`, filename: 'zika-1947-forest.jpg', alt: 'Zika Forest in Uganda, 1947' },
  timeline1952: { path: `${IMG_BASE}/1952-first-case-zika.png`, filename: 'zika-1952-first-case.png', alt: 'First Zika case in human, 1952' },
  timeline1951: { path: `${IMG_BASE}/1951-map.png`, filename: 'zika-1951-map.png', alt: 'Zika spread through Africa to Asia, 1951-1981' },
  timeline2007: { path: `${IMG_BASE}/2007-yap-island-outbreak.jpg`, filename: 'zika-2007-yap-island.jpg', alt: 'Yap Island outbreak, 2007' },
  timeline2014: { path: `${IMG_BASE}/2014-world-cup.jpg`, filename: 'zika-2014-world-cup.jpg', alt: '2014 World Cup and Zika spread to Brazil' },
  timeline2015: { path: `${IMG_BASE}/2015-zika-mosquitoes.jpg`, filename: 'zika-2015-mosquitoes.jpg', alt: 'Zika pandemic spread, 2015' },
  timelineLevel2: { path: `${IMG_BASE}/level2alert.png`, filename: 'zika-level2-alert.png', alt: 'CDC Level 2 travel alert' },
  timelineGaviria: { path: `${IMG_BASE}/2016-minister-gaviria.jpg`, filename: 'zika-2016-gaviria.jpg', alt: 'South American countries advise postponing pregnancy' },
  timelineWHO: { path: `${IMG_BASE}/2016-who-representative.jpg`, filename: 'zika-2016-who.jpg', alt: 'WHO declares Public Health Emergency' },
  timelineWhiteHouse: { path: `${IMG_BASE}/2016-white-house.jpg`, filename: 'zika-2016-white-house.jpg', alt: 'White House requests emergency funding' },

  // Cases map
  casesMap: { path: `${IMG_BASE}/map.svg`, filename: 'zika-cases-map.svg', alt: 'Map of Zika virus cases worldwide' },

  // Prevention detail icons
  preventBugspray2: { path: `${IMG_BASE}/prevent-bugspray-2.png`, filename: 'zika-prevent-bugspray-2.png', alt: 'Apply insect repellent' },
  preventLongsleeves: { path: `${IMG_BASE}/prevent-longsleeves-2.png`, filename: 'zika-prevent-longsleeves.png', alt: 'Wear long sleeves' },
  preventCondom: { path: `${IMG_BASE}/wearcondom_360.png`, filename: 'zika-prevent-condom.png', alt: 'Wear a condom' },
  preventNet: { path: `${IMG_BASE}/prevent-net.png`, filename: 'zika-prevent-net.png', alt: 'Use bed net' },
  preventDirections: { path: `${IMG_BASE}/prevent-directions.png`, filename: 'zika-prevent-directions.png', alt: 'Follow directions on label' },
  preventBabyNet: { path: `${IMG_BASE}/prevent-baby-net.png`, filename: 'zika-prevent-baby-net.png', alt: 'Do not apply repellent to babies under 2 months' },
  preventSprayClothes: { path: `${IMG_BASE}/prevent-spray-clothes.png`, filename: 'zika-prevent-spray-clothes.png', alt: 'Treat clothing with permethrin' },

  // Bug spray brand logos
  off: { path: `${IMG_BASE}/off.png`, filename: 'zika-off.png', alt: 'OFF brand' },
  sawyer: { path: `${IMG_BASE}/Sawyer-logo1.jpg`, filename: 'zika-sawyer.jpg', alt: 'Sawyer brand' },
  cutter: { path: `${IMG_BASE}/cutter.png`, filename: 'zika-cutter.png', alt: 'Cutter brand' },
  ultrathon: { path: `${IMG_BASE}/ultrathon_logo.png`, filename: 'zika-ultrathon.png', alt: 'Ultrathon brand' },
  sss: { path: `${IMG_BASE}/sss.png`, filename: 'zika-sss.png', alt: 'SSS brand' },
  autan: { path: `${IMG_BASE}/autan_logo_m.png`, filename: 'zika-autan.png', alt: 'Autan brand' },
  repel: { path: `${IMG_BASE}/repel-logo.png`, filename: 'zika-repel.png', alt: 'Repel brand' },
  skinsmart: { path: `${IMG_BASE}/skinsmart.png`, filename: 'zika-skinsmart.png', alt: 'Skinsmart brand' },

  // Symptoms detail
  incubation: { path: `${IMG_BASE}/incubation.svg`, filename: 'zika-incubation.svg', alt: 'Incubation period illustration' },

  // Microcephaly
  microcephalySymptoms: { path: `${IMG_BASE}/symptoms-microcephaly.png`, filename: 'zika-symptoms-microcephaly.png', alt: 'Microcephaly symptoms' },
  microcephalyCases: { path: `${IMG_BASE}/microcephaly_cases_brazil.png`, filename: 'zika-microcephaly-cases.png', alt: 'Brazil microcephaly cases by year: 2010-2015' },

  // GBS
  gbsSymptoms: { path: `${IMG_BASE}/gbs_symptoms.png`, filename: 'zika-gbs-symptoms.png', alt: 'Guillain-Barr\u00e9 Syndrome symptoms' },

  // Treatment
  treatmentAdults: { path: `${IMG_BASE}/treatment-adults.png`, filename: 'zika-treatment-adults.png', alt: 'Treatment for adults' },
  treatmentPregnant: { path: `${IMG_BASE}/treatment-pregnant.png`, filename: 'zika-treatment-pregnant.png', alt: 'Treatment for pregnant women' },

  // Flaviviruses
  flavivirusGraph: { path: `${IMG_BASE}/FlavivirusGraph_v3.png`, filename: 'zika-flavivirus-graph.png', alt: 'Flavivirus prevalence comparison: Dengue, Zika, and Yellow Fever' },

  // What we don't know
  dontKnow: { path: `${IMG_BASE}/dontknow.png`, filename: 'zika-dont-know.png', alt: 'What we still don\'t know' },

  // WHO Action Plan icons
  whoPrioritize: { path: `${IMG_BASE}/PrioritizeResearch.png`, filename: 'zika-who-prioritize.png', alt: 'Prioritize research' },
  whoSurveillance: { path: `${IMG_BASE}/EnhanceSurveillance.png`, filename: 'zika-who-surveillance.png', alt: 'Enhance surveillance' },
  whoCommunication: { path: `${IMG_BASE}/communication.png`, filename: 'zika-who-communication.png', alt: 'Strengthen risk communication' },
  whoClinicalMgmt: { path: `${IMG_BASE}/ClinicalMgmt.png`, filename: 'zika-who-clinical-mgmt.png', alt: 'Provide training' },
  whoLabs: { path: `${IMG_BASE}/StrengethenLabs.png`, filename: 'zika-who-labs.png', alt: 'Strengthen laboratories' },
  whoCurbSpread: { path: `${IMG_BASE}/CurbSpread.png`, filename: 'zika-who-curb-spread.png', alt: 'Support health authorities' },
  whoClinicalCare: { path: `${IMG_BASE}/ClinicalCare.png`, filename: 'zika-who-clinical-care.png', alt: 'Collaborate on clinical care' },
}

// ─── References ─────────────────────────────────────────────────────────────

const REFERENCES = [
  { title: 'Roberts, M. (2016, Feb 1). "Zika-linked condition: WHO declares global emergency." BBC News Online.', link: 'http://www.bbc.com/news/health-35459797' },
  { title: 'Gallagher, J. (2015, Feb 5). "Zika outbreak: Travel advice." BBC News Online.', link: 'http://www.bbc.com/news/health-35441675' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika Virus."', link: 'http://www.cdc.gov/zika/' },
  { title: 'Wikipedia (2016). "Zika Virus."', link: 'https://en.wikipedia.org/wiki/Zika_virus' },
  { title: '"Zika virus triggers pregnancy delay calls." (2016, Jan 23). BBC News.' },
  { title: '"Microcephaly." (2016). Mayo Clinic.', link: 'http://www.mayoclinic.org/diseases-conditions/microcephaly/basics/symptoms/con-20034823' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika virus: clinical evaluation & disease."', link: 'http://www.cdc.gov/zika/hc-providers/clinicalevaluation.html' },
  { title: 'World Health Organization. (2016, Jan). "Zika virus."', link: 'http://www.who.int/mediacentre/factsheets/zika/en/' },
  { title: 'Swails, B., McKenzie, D. (2016, Feb 3). "Uganda\'s Zika Forest, birthplace of the Zika virus." CNN.', link: 'http://www.cnn.com/2016/02/02/health/zika-forest-viral-birthplace/' },
  { title: 'Szabo, Liz. (2016, Feb 5). "Zika Q&A: What you need to know about sex, saliva, sperm banks." USA Today.', link: 'http://www.usatoday.com/story/news/2016/02/03/zika-q-and-a/79751476/' },
  { title: 'March of Dimes. (2016, Feb). "Zika virus and pregnancy."', link: 'http://www.marchofdimes.org/complications/zika-virus-and-pregnancy.aspx' },
  { title: '"Zika virus: Three Britons infected, say health officials." (2016, Jan 23). BBC News.', link: 'http://www.bbc.com/news/uk-35391712' },
  { title: 'Dick, GWA, et al. (1952). "Zika virus isolations and serological specificity." Trans R Soc Trop Med Hyg 46(5): 509-520.' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika virus: prevention."' },
  { title: 'Carless, W. (2016, Feb 3). "On Brazil\'s Zika front lines, cases of microcephaly are actually dropping." USA Today.', link: 'http://www.usatoday.com/story/news/world/2016/02/03/brazil-zika-birth-defect-drop-hospital-microcephaly/79791768/' },
  { title: 'Centers for Disease Control and Prevention (2016). "Interim Guidelines for Pregnant Women During a Zika Virus Outbreak."', link: 'http://www.cdc.gov/mmwr/volumes/65/wr/mm6502e1.htm' },
  { title: 'Phillips, S. (2016, Feb 4). "Blood bank rejecting donors who visited Zika areas." Fox5 San Diego News.', link: 'http://fox5sandiego.com/2016/02/04/blood-bank-rejecting-donors-who-visited-zika-areas/' },
  { title: 'Withnall, A. (2016, Jan 28). "How the Zika virus spread around the world." The Independent.', link: 'http://www.independent.co.uk/life-style/health-and-families/health-news/zika-how-virus-spread-around-world-a6839101.html' },
  { title: 'Musso, D. (2015). "Zika Virus Transmission from French Polynesia to Brazil." Emerg Infect Dis 21(10): 1887.' },
  { title: 'Fox, M. (2016, Feb 2). "Dallas Reports First Case of Sexual Transmission of Zika Virus." NBC News.', link: 'http://www.nbcnews.com/storyline/zika-virus-outbreak/zika-virus-can-spread-sexual-contact-health-officials-dallas-confirm-n510076' },
  { title: 'Wilcox, E. (2010). "Lt Col Mark Duffy receives the 2010 James H. Nakano Citation."', link: 'http://www.wpafb.af.mil/news/story.asp?id=123219950' },
  { title: 'Parry, L. (2016, Feb 2). "Game-changing Zika virus is about as scary as it gets, warns expert." Daily Mail, UK.', link: 'http://www.dailymail.co.uk/health/article-3428938/Game-changing-Zika-virus-scary-gets-warns-expert.html' },
  { title: 'Seibel, M. (2016, Feb 4). "French researcher says Zika link to Guillain-Barr\u00e9 Syndrome is almost certain." Fort Worth Star-Telegram.', link: 'http://www.star-telegram.com/news/nation-world/world/article58432243.html' },
  { title: 'Photo by Miguel Discart.', link: 'https://www.flickr.com/photos/miguel_discart/' },
  { title: 'Photo by IAEA Imagebank.', link: 'https://www.flickr.com/photos/iaea_imagebank/' },
  { title: 'Image retrieved from Panam Post.', link: 'https://panampost.com/panam-staff/2015/02/25/colombias-price-controls-a-cure-worse-than-the-disease/' },
  { title: 'Image retrieved from Public Health Watch.', link: 'https://publichealthwatch.wordpress.com/2016/02/03/texas-reports-first-case-of-sexually-transmitted-zika-virus-in-u-s/' },
  { title: 'Roeder, A. (2016). "Zika virus in Brazil may be mutated strain." Harvard T.H. Chan School of Public Health.', link: 'http://www.hsph.harvard.edu/news/features/zika-virus-in-brazil-may-be-mutated-strain/' },
  { title: 'Wapps, J. (2016, Feb 5). "WHO: Local Zika cases in 33 nations as GBS numbers climb." University of Minnesota CIDRAP.', link: 'http://www.cidrap.umn.edu/news-perspective/2016/02/who-local-zika-cases-33-nations-gbs-numbers-climb' },
  { title: '"Zika virus outbreak (2015-present)." Wikipedia.', link: 'https://en.wikipedia.org/wiki/Zika_virus_outbreak_(2015%E2%80%93present)' },
  { title: 'Mackenzie, J. (2016, Feb 4). "Zika, dengue, yellow fever: what are flaviviruses?" The Conversation.', link: 'http://theconversation.com/zika-dengue-yellow-fever-what-are-flaviviruses-53969' },
  { title: '"Yellow Fever." (2014, March). World Health Organization.', link: 'http://www.who.int/mediacentre/factsheets/fs100/en/' },
  { title: '"Dengue and severe dengue." (2015, May). World Health Organization.', link: 'http://www.who.int/mediacentre/factsheets/fs117' },
  { title: '"Dengue is fastest-spreading tropical disease, WHO says." (2013). Fox News Health.', link: 'http://www.foxnews.com/health/2013/01/16/dengue-is-fastest-spreading-tropical-disease-who-says.html' },
  { title: 'World Economic Forum. (2016, Jan 4). "How close are we to beating dengue?"', link: 'http://www.weforum.org/agenda/2016/01/how-close-are-we-to-beating-dengue' },
  { title: 'Centers for Disease Control and Prevention (2016). "Zika virus: Guillain-Barr\u00e9 syndrome Q & A."', link: 'http://www.cdc.gov/zika/qa/gbs-qa.html' },
  { title: 'World Health Organization. (2016, Mar 7). "Guillain-Barr\u00e9 syndrome - France - French Polynesia."', link: 'http://www.who.int/csr/don/7-march-2016-gbs-french-polynesia/en/' },
  { title: 'European Centre for Disease Prevention and Control. (2015, Dec 10). "Zika virus epidemic in the Americas."', link: 'http://ecdc.europa.eu/en/publications/Publications/zika-virus-americas-association-with-microcephaly-rapid-risk-assessment.pdf' },
  { title: '"Guillain-Barr\u00e9 syndrome." Mayo Clinic. (2016).', link: 'http://www.mayoclinic.org/diseases-conditions/guillain-barre-syndrome/basics/symptoms/con-20025832' },
  { title: 'Sifferlin, A. (2016, Feb 8). "Here\'s the Other Zika Problem Experts Are Worried About." Time.', link: 'http://time.com/4209612/zika-guillain-barre-syndrome-cdc/' },
  { title: 'World Health Organization. (2016, Feb 1). "WHO statement on the first meeting of the IHR Emergency Committee on Zika virus."', link: 'http://www.who.int/mediacentre/news/statements/2016/1st-emergency-committee-zika/en/' },
  { title: 'White House. "Fact Sheet: Preparing and Responding to Zika Virus at Home and Abroad."', link: 'https://www.whitehouse.gov/the-press-office/2016/02/08/fact-sheet-preparing-and-responding-zika-virus-home-and-abroad' },
]

// ─── Build Content ──────────────────────────────────────────────────────────

async function buildContent() {
  // Upload all images
  console.log('  Uploading images...')
  const imgKeys = Object.keys(IMAGES)
  const imgs = {}
  for (let i = 0; i < imgKeys.length; i++) {
    const k = imgKeys[i]
    const { path, filename, alt } = IMAGES[k]
    const url = `${CDN}${path}`
    if (dryRun) {
      imgs[k] = { _type: 'image', asset: { _type: 'reference', _ref: `dry-run-${k}` } }
      console.log(`    [${i + 1}/${imgKeys.length}] DRY RUN: ${filename}`)
    } else {
      const img = await uploadImage(url, filename)
      if (img) {
        console.log(`    [${i + 1}/${imgKeys.length}] Uploaded: ${filename}`)
      } else {
        console.log(`    [${i + 1}/${imgKeys.length}] FAILED: ${filename}`)
      }
      imgs[k] = img
    }
  }

  const content = []

  // ─── Section: What is Zika ──────────────────────────────────────────────
  content.push(textBlock('Understanding Zika', 'h2'))
  content.push(textBlock('A virus spreading quickly throughout Latin America', 'h4'))
  content.push(
    textBlock(
      'Zika is a virus spreading quickly throughout Latin America that is carried by mosquitoes and causes mild illness. Unconfirmed links exist between infected pregnant women and microcephaly (underdeveloped brain), plus Guillain-Barr\u00e9 syndrome.'
    )
  )

  content.push(dividerBlock())

  // ─── Section: How it Spreads ────────────────────────────────────────────
  content.push(textBlock('How it Spreads', 'h2'))

  // SpreadCards as columns of image + bold caption
  if (imgs.spreadMosquito) content.push(
    columnsBlock(4, [
      [
        imgs.spreadMosquito ? imageBlock(imgs.spreadMosquito, 'Person to mosquito to person', 'small') : null,
        richBlock([{ text: 'Person \u2192 mosquito \u2192 person', marks: ['strong'] }]),
      ].filter(Boolean),
      [
        imgs.spreadMother ? imageBlock(imgs.spreadMother, 'Mother to unborn child', 'small') : null,
        richBlock([{ text: 'Mother \u2192 unborn child', marks: ['strong'] }]),
      ].filter(Boolean),
      [
        imgs.spreadPartner ? imageBlock(imgs.spreadPartner, 'Man to sexual partner', 'small') : null,
        richBlock([{ text: 'Man \u2192 sexual partner', marks: ['strong'] }]),
      ].filter(Boolean),
      [
        imgs.spreadBloodbank ? imageBlock(imgs.spreadBloodbank, 'Person to blood bank to person', 'small') : null,
        richBlock([{ text: 'Person \u2192 blood bank \u2192 person', marks: ['strong'] }]),
      ].filter(Boolean),
    ])
  )

  content.push(dividerBlock())

  // ─── Section: How to Prevent It ─────────────────────────────────────────
  content.push(textBlock('How to Prevent It', 'h2'))

  if (imgs.preventTravel) content.push(
    columnsBlock(4, [
      [
        imgs.preventTravel ? imageBlock(imgs.preventTravel, 'Avoid travel', 'small') : null,
        textBlock('Avoid travel to affected areas, especially if pregnant'),
      ].filter(Boolean),
      [
        imgs.emptyWater ? imageBlock(imgs.emptyWater, 'Remove standing water', 'small') : null,
        textBlock('Remove standing water in flowerpots, buckets, bowls, pools'),
      ].filter(Boolean),
      [
        imgs.preventBugspray ? imageBlock(imgs.preventBugspray, 'Use insect repellent', 'small') : null,
        textBlock('Use insect repellents (DEET/picaridin) or wear protective clothing'),
      ].filter(Boolean),
      [
        imgs.preventClose ? imageBlock(imgs.preventClose, 'Keep doors screened', 'small') : null,
        textBlock('Keep doors/windows screened or closed; use mosquito netting'),
      ].filter(Boolean),
    ])
  )

  content.push(dividerBlock())

  // ─── Section: When to Tell Your Doctor ──────────────────────────────────
  content.push(textBlock('When to Tell Your Doctor', 'h2'))
  content.push(
    textBlock('If you have been exposed to a Zika-infected area, watch for these signs of Zika Disease.')
  )
  if (imgs.oneInFive) content.push(imageBlock(imgs.oneInFive, 'Only 1 in 5 infected people develop symptoms', 'small'))
  content.push(
    richBlock([
      { text: 'Only about 1 in 5 infected people develop symptoms.', marks: ['strong'] },
    ])
  )
  content.push(
    textBlock('Incubation period is likely a few days to one week. Symptoms are usually mild and last several days to a week.')
  )
  if (imgs.symptoms) content.push(imageBlock(imgs.symptoms, 'Zika symptoms: headache, fever, red eyes, joint pain, rash, muscle pain', 'full'))

  // ─── Section: Zika Timeline (background gray) ──────────────────────────
  const timelineBlocks = []
  timelineBlocks.push(textBlock('Zika Timeline', 'h2Center'))

  // Timeline entries as h3 + image + text
  const timelineEntries = [
    { year: '1947', imgKey: 'timeline1947', text: 'The name comes from the Zika Forest in Uganda where the virus was first isolated. First identified in rhesus monkeys.' },
    { year: '1952', imgKey: 'timeline1952', text: 'A paper was published confirming the first case of Zika virus in a human \u2014 a 10-year-old Nigerian female.' },
    { year: '1951-1981', imgKey: 'timeline1951', text: 'The virus spread through Africa to Asia with only rare reported cases.' },
    { year: '2007', imgKey: 'timeline2007', text: 'In April of 2007, Zika made it outside of Africa and Asia for the first time when it spread to Yap Island in Micronesia. 49 confirmed cases, no deaths.' },
    { year: '2014', imgKey: 'timeline2014', text: 'The virus spread to French Polynesia. It is believed that the 2014 Soccer World Cup was responsible for the spread of Zika to Brazil.' },
    { year: '2015', imgKey: 'timeline2015', text: 'In April of 2015, Zika spread from the ongoing outbreak in Brazil to Mexico, Central America, Caribbean, and South America where it reached pandemic levels.' },
    { year: '15 Jan 2016', imgKey: 'timelineLevel2', text: 'CDC issued Level 2 travel alert for regions with active Zika transmission.' },
    { year: '23 Jan 2016', imgKey: 'timelineGaviria', text: 'Five South American countries advised women to postpone getting pregnant.' },
    { year: '1 Feb 2016', imgKey: 'timelineWHO', text: 'World Health Organization declared a Public Health Emergency of International Concern.' },
    { year: '2 Feb 2016', imgKey: null, text: '31 isolated cases in the US across 11 states plus DC; one sexual transmission case confirmed in Dallas.' },
    { year: '8 Feb 2016', imgKey: 'timelineWhiteHouse', text: 'The White House announced a request to Congress for more than $1.8 billion in emergency funding to combat Zika.' },
  ]

  for (const entry of timelineEntries) {
    timelineBlocks.push(textBlock(entry.year, 'h3'))
    if (entry.imgKey && imgs[entry.imgKey]) {
      timelineBlocks.push(imageBlock(imgs[entry.imgKey], `Zika timeline ${entry.year}`, 'large'))
    }
    timelineBlocks.push(textBlock(entry.text))
  }

  content.push(backgroundSection('gray', timelineBlocks))

  // ─── Section: Zika Virus Cases ──────────────────────────────────────────
  content.push(textBlock('Zika Virus Cases', 'h2Center'))
  content.push(
    richBlock([
      { text: 'There are an estimated ', marks: [] },
      { text: '1.6 million cases', marks: ['strong'] },
      { text: ' of Zika virus in ', marks: [] },
      { text: '33 countries', marks: ['strong'] },
      { text: '.', marks: [] },
    ])
  )
  if (imgs.casesMap) content.push(imageBlock(imgs.casesMap, 'Map of Zika virus cases worldwide', 'full'))

  content.push(textBlock('Americas (31 locations)', 'h3'))
  content.push(
    textBlock('Aruba, Barbados, Bonaire, Bolivia, Brazil, Colombia, Costa Rica, Curacao, Dominican Republic, Ecuador, El Salvador, French Guiana, Guadeloupe, Guatemala, Guyana, Haiti, Honduras, Jamaica, Martinique, Mexico, Nicaragua, Panama, Paraguay, Puerto Rico, Saint Martin, Saint Vincent & the Grenadines, Sint Martin, Suriname, Trinidad and Tobago, U.S Virgin Islands, Venezuela')
  )

  content.push(textBlock('Oceania / Pacific Islands (5 locations)', 'h3'))
  content.push(textBlock('American Samoa, Marshall Islands, New Caledonia, Samoa, Tonga'))

  content.push(textBlock('Africa (1 location)', 'h3'))
  content.push(textBlock('Cape Verde'))

  content.push(richBlock([{ text: 'Last Updated: 8 Feb 2016', marks: ['em'] }]))

  content.push(dividerBlock())

  // ─── Section: Transmission Detail ───────────────────────────────────────
  content.push(textBlock('Transmission', 'h2'))
  content.push(
    textBlock('The Zika virus is not yet fully understood. However, there are 4 known ways to transmit the Zika virus.')
  )

  // Each transmission method: image + h4 + text
  const transmissionMethods = [
    { imgKey: 'spreadMosquito', title: 'Person \u2192 Mosquito \u2192 Person', text: 'Zika is most commonly transmitted from person to person by the Aedes mosquito, which live in urban areas and are active during the day (usually mornings and late afternoons).' },
    { imgKey: 'spreadMother', title: 'Mother \u2192 Unborn Child', text: 'Zika virus can spread from an infected mother to the placenta and their unborn baby. The virus will not infect infants conceived after the virus has cleared from the blood. There is no evidence suggesting a risk for future birth defects.' },
    { imgKey: 'spreadPartner', title: 'Man \u2192 Sexual Partner', text: 'Transmission of Zika during sex is possible but rare. If an infected male partner has the virus in their blood stream, their semen can be contagious. It is unknown how long Zika can live in semen. Infected individuals should abstain from sex or use a condom for 6 months after the infection.' },
    { imgKey: 'spreadBloodbank', title: 'Person \u2192 Blood Bank \u2192 Person', text: 'There may also be a chance of transmission through blood transfusions, but no conclusive evidence has been found.' },
  ]

  for (const method of transmissionMethods) {
    if (imgs[method.imgKey]) content.push(imageBlock(imgs[method.imgKey], method.title, 'small'))
    content.push(textBlock(method.title, 'h4'))
    content.push(textBlock(method.text))
  }

  content.push(dividerBlock())

  // ─── Section: Prevention Detail ─────────────────────────────────────────
  content.push(textBlock('Prevention', 'h2'))
  content.push(
    textBlock('Currently no vaccinations exist to prevent Zika. The best way to prevent infection is to avoid mosquito bites.')
  )

  const preventionItems = [
    { imgKey: 'preventTravel', boldText: 'Avoid travel', rest: ' to areas with confirmed Zika cases, especially if you are pregnant.' },
    { imgKey: 'preventBugspray2', boldText: 'Apply insect repellent', rest: ' every few hours. Do not spray repellent on the skin under clothing. Insect repellent is safe for pregnant women.' },
    { imgKey: 'emptyWater', boldText: 'Remove still water', rest: ' in flowerpots, buckets, animal water bowls, and kid pools to prevent potential mosquito breeding grounds.' },
    { imgKey: 'preventLongsleeves', boldText: 'Wear long-sleeve shirts and pants', rest: ' to avoid mosquito bites.' },
    { imgKey: 'preventClose', boldText: 'Choose lodging', rest: ' that is air-conditioned, has screens on the doors and windows, or purchase a mosquito bed net.' },
    { imgKey: 'preventCondom', boldText: 'Wear a condom', rest: ' during sex or abstain from sex for 6 months if you have traveled to a Zika-infected area.' },
    { imgKey: 'preventNet', boldText: 'Choose a WHOPES-approved bed net', rest: ' with 156 holes per square inch that is long enough to tuck under the mattress. Permethrin-treated nets help kill mosquitoes; do not wash them or expose them to sunlight.' },
    { imgKey: 'preventDirections', boldText: 'Follow directions on the label', rest: ' when applying insect repellent to children. Spray repellent onto hands first to apply to a child\'s face. Avoid applying repellent to the child\'s hands, mouth, eyes, or open wounds.' },
    { imgKey: 'preventBabyNet', boldText: 'DO NOT apply insect repellent to babies younger than 2 months old.', rest: ' Instead, dress them in long sleeves and cover the stroller or carrier with mosquito netting.' },
    { imgKey: 'preventSprayClothes', boldText: 'Treat clothing and gear', rest: ' (boots, pants, socks, tents) with an insecticide called permethrin. Mosquitoes can bite through thin clothing. DO NOT apply permethrin directly to the skin.' },
  ]

  for (const item of preventionItems) {
    if (imgs[item.imgKey]) content.push(imageBlock(imgs[item.imgKey], item.boldText, 'small'))
    content.push(
      richBlock([
        { text: item.boldText, marks: ['strong'] },
        { text: item.rest, marks: [] },
      ])
    )
  }

  content.push(dividerBlock())

  // ─── Bug Spray Guide ────────────────────────────────────────────────────
  content.push(textBlock('Choosing the Right Bug Spray', 'h3'))

  content.push(textBlock('DEET-containing products', 'h4'))
  // Brand logo images in a row - render as small images
  for (const k of ['off', 'sawyer', 'cutter', 'ultrathon']) {
    if (imgs[k]) content.push(imageBlock(imgs[k], IMAGES[k].alt, 'small'))
  }

  content.push(textBlock('Picaridin / KBR 3023 / Bayrepel / Icaridin', 'h4'))
  for (const k of ['sss', 'autan']) {
    if (imgs[k]) content.push(imageBlock(imgs[k], IMAGES[k].alt, 'small'))
  }

  content.push(textBlock('Oil of Lemon Eucalyptus (OLE) or PMD', 'h4'))
  if (imgs.repel) content.push(imageBlock(imgs.repel, 'Repel brand', 'small'))

  content.push(textBlock('IR3535', 'h4'))
  for (const k of ['sss', 'skinsmart']) {
    if (imgs[k]) content.push(imageBlock(imgs[k], IMAGES[k].alt, 'small'))
  }

  content.push(
    richBlock([
      { text: 'Note: The EPA has not yet evaluated common natural insect repellents for effectiveness. Examples used in unregistered insect repellents include citronella oil, cedar oil, geranium oil, peppermint oil, soybean oil, and pure oil of lemon eucalyptus.', marks: ['em'] },
    ])
  )

  // ─── Section: Symptoms Detail (background gray) ────────────────────────
  const symptomsDetailBlocks = []
  symptomsDetailBlocks.push(textBlock('Symptoms of Zika Disease', 'h2Center'))

  if (imgs.oneInFive) symptomsDetailBlocks.push(imageBlock(imgs.oneInFive, '1 in 5 people', 'small'))
  symptomsDetailBlocks.push(
    richBlock([
      { text: 'About ', marks: [] },
      { text: '1 in 5', marks: ['strong'] },
      { text: ' people infected with Zika virus actually become ill.', marks: [] },
    ])
  )

  if (imgs.incubation) symptomsDetailBlocks.push(imageBlock(imgs.incubation, 'Incubation period', 'small'))
  symptomsDetailBlocks.push(
    textBlock('Incubation period is unknown but is likely a few days to one week. Symptoms are usually mild and last several days to a week.')
  )

  symptomsDetailBlocks.push(
    textBlock('Hospitalization is uncommon. Zika is not known to be deadly, but those with preexisting health problems can have fatal complications. There have also been cases of Guillain-Barr\u00e9 Syndrome following suspected Zika infection, but the relationship is not fully confirmed.')
  )

  if (imgs.symptoms) symptomsDetailBlocks.push(imageBlock(imgs.symptoms, 'Zika symptoms: headache, fever, painful or red eyes, joint pain, itching/rash, muscle pain', 'full'))

  symptomsDetailBlocks.push(
    richBlock([
      { text: 'If you have been to a Zika-infected area and have at least 2 symptoms, contact your doctor.', marks: ['strong'] },
    ])
  )
  symptomsDetailBlocks.push(
    textBlock('If you have been to a Zika-infected area and are pregnant or recently gave birth, contact your doctor.')
  )

  symptomsDetailBlocks.push({ _type: 'divider', _key: key(), style: 'default' })

  // ─── Microcephaly (inside symptoms bg section) ─────────────────────────
  symptomsDetailBlocks.push(textBlock('Symptoms of Microcephaly', 'h2'))
  symptomsDetailBlocks.push(
    textBlock('There is an unconfirmed link between birth complications such as microcephaly and Zika infection during pregnancy.')
  )
  if (imgs.microcephalySymptoms) symptomsDetailBlocks.push(imageBlock(imgs.microcephalySymptoms, 'Microcephaly symptoms', 'full'))

  symptomsDetailBlocks.push(
    richBlock([
      { text: 'There have been over ', marks: [] },
      { text: '4,700 reported cases', marks: ['strong'] },
      { text: ' of microcephaly in newborns in Brazil since October 2015. Brazil saw ', marks: [] },
      { text: '20 times more cases', marks: ['strong'] },
      { text: ' of microcephaly in 2015 than past years.', marks: [] },
    ])
  )
  if (imgs.microcephalyCases) symptomsDetailBlocks.push(imageBlock(imgs.microcephalyCases, 'Brazil microcephaly cases by year: 2010-2015', 'full'))

  content.push(backgroundSection('gray', symptomsDetailBlocks))

  // ─── Section: Guillain-Barr\u00e9 Syndrome ──────────────────────────────────
  content.push(textBlock('Guillain-Barr\u00e9 Syndrome (GBS)', 'h2'))
  content.push(
    textBlock('Guillain-Barr\u00e9 Syndrome (GBS) is an uncommon illness of the nervous system in which the person\'s own immune system damages nerve cells. It usually occurs after an infection.')
  )
  content.push(
    textBlock('There is strong evidence of a possible causal link between Zika virus infection and GBS. During the 2013-14 outbreak in French Polynesia, 42 out of 8,750 suspected Zika cases presented GBS (a 20-fold increase from the previous 4 years). 41 of the 42 GBS cases also showed antibodies against Zika virus.')
  )
  content.push(
    textBlock('A number of Latin American countries with current Zika outbreaks have started reporting higher prevalence of GBS cases. Between April and July of 2015, Salvador, Brazil saw a seven-fold increase in rates of GBS, and Colombia has already seen 3 GBS-related deaths.')
  )
  content.push(
    richBlock([
      { text: 'Symptoms last a few weeks to several months. Most people fully recover from GBS, but some have permanent damage, and ', marks: [] },
      { text: '1 out of 20 cases have led to death', marks: ['strong'] },
      { text: '.', marks: [] },
    ])
  )
  if (imgs.gbsSymptoms) content.push(imageBlock(imgs.gbsSymptoms, 'GBS symptoms', 'full'))
  content.push(
    richBlock([
      { text: 'If you have been to a Zika-infected area and have at least 2 symptoms, contact your doctor.', marks: ['strong'] },
    ])
  )

  content.push(dividerBlock())

  // ─── Section: Treatment ─────────────────────────────────────────────────
  content.push(textBlock('Treatment', 'h2'))

  // For Adults
  if (imgs.treatmentAdults) content.push(imageBlock(imgs.treatmentAdults, 'Treatment for adults', 'small'))
  content.push(textBlock('For Adults', 'h3'))
  content.push(textBlock('If you have Zika symptoms within 2 weeks of traveling to a Zika-infected area:'))
  // List block for adults
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'Contact your doctor.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'Take medicine (acetaminophen or paracetamol) to relieve fever and pain.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'To reduce the risk of bleeding, do NOT take aspirin, aspirin products, or other non-steroidal anti-inflammatory drugs such as ibuprofen until Dengue can be ruled out.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'Get rest and drink plenty of fluids.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'Prevent additional mosquito bites to avoid spreading the disease.', marks: [] }],
    markDefs: [],
  })

  // For Pregnant Women
  if (imgs.treatmentPregnant) content.push(imageBlock(imgs.treatmentPregnant, 'Treatment for pregnant women', 'small'))
  content.push(textBlock('For Pregnant Women', 'h3'))
  content.push(textBlock('There is no cure for Zika virus. If you are pregnant, your doctor will treat you for the virus, while also monitoring your baby. The next steps will most likely be:'))
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'An ultrasound to test for microcephaly or calcium deposits in your baby\'s brain.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'You may get an amniocentesis (also called amnio) to check the amniotic fluid that surrounds your baby in the womb for Zika.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'The placenta and umbilical cord may also be tested after birth.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'Your baby\'s growth should be monitored by ultrasound every 3-4 weeks. You may be referred to a maternal-fetal medicine specialist.', marks: [] }],
    markDefs: [],
  })

  content.push(dividerBlock())

  // ─── Section: Flaviviruses (background gray) ───────────────────────────
  const flaviBlocks = []
  flaviBlocks.push(textBlock('One of Many Flaviviruses', 'h2Center'))
  flaviBlocks.push(
    textBlock('Zika, like dengue, yellow fever, and others, is part of the flavivirus family. Flaviviruses are arboviruses, which means they are spread via infected arthropod vectors such as ticks and mosquitoes. Zika, yellow fever, and dengue grow very well in the human body, and easily reinfect mosquitoes. Flaviviruses enter the bloodstream, infect cells in the immune system, travel to the lymph nodes and target different organs.')
  )

  flaviBlocks.push(textBlock('Zika', 'h4'))
  flaviBlocks.push(
    textBlock('Induces fever, rash, joint and muscle pain, and red eyes. Fatal cases are rare and are usually due to complications from pre-existing health conditions. There is no vaccine for Zika.')
  )

  flaviBlocks.push(textBlock('Yellow Fever', 'h4'))
  flaviBlocks.push(
    textBlock('Infects the liver. It can cause fever, headache, nausea, and vomiting, and in serious cases may cause fatal heart, liver, and kidney conditions. The yellow fever vaccine has been in use for several decades.')
  )

  flaviBlocks.push(textBlock('Dengue', 'h4'))
  flaviBlocks.push(
    textBlock('Can cause high fever, rash, and muscle and joint pain, and in serious cases may cause fatal shock and hemorrhage. Dengue is one of the fastest spreading vector-borne viral diseases and has increased by 30 times in the past 50 years.')
  )

  if (imgs.flavivirusGraph) flaviBlocks.push(imageBlock(imgs.flavivirusGraph, 'Flavivirus prevalence comparison: Dengue, Zika, and Yellow Fever cases over time', 'full'))

  content.push(backgroundSection('gray', flaviBlocks))

  // ─── Section: What We Still Don't Know ──────────────────────────────────
  content.push(textBlock('What We Still Don\'t Know', 'h2'))
  if (imgs.dontKnow) content.push(imageBlock(imgs.dontKnow, 'What we still don\'t know', 'small'))

  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'We don\'t know for sure if Zika is the cause of the increased microcephaly in Brazil. We don\'t know for sure how many of the more than 4,700 reported cases of microcephaly in Brazil are related to Zika, as it is difficult to diagnose and can have other causes.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'Though we know that Zika was the cause of a Guillain-Barr\u00e9 Syndrome surge in French Polynesia in 2013-14, we don\'t yet know definitively if the current Zika outbreak is the cause of the increase of GBS in South American countries.', marks: [] }],
    markDefs: [],
  })
  content.push({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [{ _type: 'span', _key: key(), text: 'The possible connection of Zika with microcephaly and GBS suggest mutation in the virus to become more pathogenic to humans. We don\'t know what exactly has changed about Zika virus and why.', marks: [] }],
    markDefs: [],
  })

  content.push(dividerBlock())

  // ─── Section: WHO Action Plan ───────────────────────────────────────────
  content.push(textBlock('WHO Action Plan', 'h2'))

  const actionPlanItems = [
    { imgKey: 'whoPrioritize', boldText: 'Prioritize research', rest: ' into Zika virus disease by convening experts.' },
    { imgKey: 'whoSurveillance', boldText: 'Enhance surveillance', rest: ' of Zika virus and potential complications.' },
    { imgKey: 'whoCommunication', boldText: 'Strengthen risk communication', rest: ' to help countries meet International Health Regulations.' },
    { imgKey: 'whoClinicalMgmt', boldText: 'Provide training', rest: ' on clinical management, diagnosis and vector control at WHO Collaborating Centres.' },
    { imgKey: 'whoLabs', boldText: 'Strengthen the capacity', rest: ' of laboratories to detect the virus.' },
    { imgKey: 'whoCurbSpread', boldText: 'Support health authorities', rest: ' in curbing spread of infected mosquitoes by providing larvicide to treat standing water sites.' },
    { imgKey: 'whoClinicalCare', boldText: 'Collaborate', rest: ' with other health agencies to prepare recommendations for clinical care and follow-up of people with Zika virus.' },
  ]

  for (const item of actionPlanItems) {
    if (imgs[item.imgKey]) content.push(imageBlock(imgs[item.imgKey], item.boldText, 'small'))
    content.push(
      richBlock([
        { text: item.boldText, marks: ['strong'] },
        { text: item.rest, marks: [] },
      ])
    )
  }

  // ─── References ─────────────────────────────────────────────────────────
  content.push(referencesBlock(REFERENCES))

  return content
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Migrating understanding-zika to Sanity...')

  // Verify document exists
  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'understanding-zika'][0]{_id, title}`
  )

  if (!doc) {
    console.error('ERROR: No feature document with slug "understanding-zika" found in Sanity.')
    process.exit(1)
  }

  console.log(`  Found document: ${doc._id} (${doc.title})`)

  // Upload hero image
  console.log('  Uploading hero image...')
  let heroImage = null
  if (!dryRun) {
    heroImage = await uploadImage(
      `${CDN}${IMAGES.hero.path}`,
      IMAGES.hero.filename
    )
    if (heroImage) {
      console.log('    Hero image uploaded.')
    } else {
      console.log('    WARN: Hero image failed to upload.')
    }
  } else {
    heroImage = { _type: 'image', asset: { _type: 'reference', _ref: 'dry-run-hero' } }
    console.log('    DRY RUN: Hero image.')
  }

  // Build content
  console.log('  Building content blocks...')
  const content = await buildContent()
  console.log(`  Built ${content.length} content blocks.`)

  if (dryRun) {
    console.log('\n  DRY RUN — no changes written.')
    console.log(`  Would patch document ${doc._id} with:`)
    console.log(`    - heroImage: ${heroImage ? 'yes' : 'no'}`)
    console.log(`    - description: "There are an estimated 1.6 million cases..."`)
    console.log(`    - content: ${content.length} blocks`)
    return
  }

  // Patch document
  console.log('  Patching Sanity document...')
  const patch = client.patch(doc._id)
    .set({
      description: 'There are an estimated 1.6 million cases of Zika virus in 33 countries. Learn about how Zika spreads, its symptoms, prevention, and treatment.',
      content,
    })

  if (heroImage) {
    patch.set({ heroImage: heroImage })
  }

  await patch.commit()

  console.log('  Done! Document patched successfully.')
  console.log(`  Document ID: ${doc._id}`)
  console.log(`  Content blocks: ${content.length}`)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
