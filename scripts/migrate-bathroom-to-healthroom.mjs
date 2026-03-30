/**
 * Migrate bathroom-to-healthroom content to Sanity.
 *
 * Uploads ~20 images from CloudFront, builds Portable Text blocks for the full
 * article (7 major sections, timeline entries, bullet lists, callout asides,
 * contributor grid, etc.), sets subtitle, links author (Juhan Sonin), and
 * patches the existing feature document.
 *
 * Usage:
 *   node scripts/migrate-bathroom-to-healthroom.mjs
 *   node scripts/migrate-bathroom-to-healthroom.mjs --dry-run
 */

import { createClient } from 'next-sanity'
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

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2024-01-01',
  token: TOKEN,
  useCdn: false,
})

const CDN = 'https://dd17w042cevyt.cloudfront.net'
const dryRun = process.argv.includes('--dry-run')
const key = () => randomUUID().slice(0, 12)

// ---------------------------------------------------------------------------
// Block helpers
// ---------------------------------------------------------------------------

async function uploadImage(url, filename) {
  console.log(`    Uploading: ${filename}`)
  const response = await fetch(url)
  if (!response.ok) {
    console.log(`    WARN: Failed to fetch ${url} (${response.status})`)
    return null
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const asset = await client.assets.upload('image', buffer, { filename, contentType })
  console.log(`    OK: ${asset._id}`)
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

function imageBlock(assetRef, alt = '', size = 'full', caption = '') {
  const block = {
    _type: 'image',
    _key: key(),
    asset: assetRef.asset,
    alt,
    size,
  }
  if (caption) block.caption = caption
  return block
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
    children: children.map((c) => ({ _type: 'span', _key: key(), ...c })),
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

function bulletList(items, markDefs = []) {
  return items.map((item) => ({
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children:
      typeof item === 'string'
        ? [{ _type: 'span', _key: key(), text: item, marks: [] }]
        : item,
    markDefs: typeof item === 'string' ? [] : markDefs,
  }))
}

function quoteBlock(text, author = '', role = '') {
  const block = { _type: 'quote', _key: key(), text }
  if (author) block.author = author
  if (role) block.role = role
  return block
}

function dividerBlock() {
  return { _type: 'divider', _key: key(), style: 'default' }
}

function referencesBlock(items) {
  return {
    _type: 'references',
    _key: key(),
    items: items.map((item) => ({ _key: key(), title: item.title, link: item.link || '' })),
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

function ctaButton(label, url, variant = 'secondary', external = false) {
  return { _type: 'ctaButton', _key: key(), label, url, variant, external }
}

function columnsBlock(layout, contentItems) {
  return {
    _type: 'columns',
    _key: key(),
    layout: String(layout),
    content: contentItems.map((item) => ({ ...item, _key: item._key || key() })),
  }
}

// ---------------------------------------------------------------------------
// Build content blocks
// ---------------------------------------------------------------------------

async function buildContent() {
  const images = {}

  // ── Upload all images ──────────────────────────────────────────────────
  console.log('\n  Uploading images...\n')

  // Hero is set separately on the document; images from design-for-life path
  const DFL = `${CDN}/images/features/design-for-life`
  const BTH = `${CDN}/images/features/bathroom-to-healthroom`

  const imageMap = {
    hero:        { url: `${BTH}/bathroom-to-healthroom-featured.jpg`, file: 'bathroom-to-healthroom-featured.jpg' },
    timeline:    { url: `${DFL}/svg/timeline.svg`, file: 'timeline.svg' },
    lineup:      { url: `${DFL}/inlines/lineup.png`, file: 'lineup.png' },
    '1985':      { url: `${DFL}/dates/1985.png`, file: '1985.png' },
    '2015':      { url: `${DFL}/dates/2015.png`, file: '2015.png' },
    '2025':      { url: `${DFL}/dates/2025.png`, file: '2025.png' },
    aging:       { url: `${DFL}/inlines/aging.jpg`, file: 'aging.jpg' },
    mirror:      { url: `${DFL}/svg/mirror.png`, file: 'mirror.png' },
    // Location cards (small)
    cardMarket:     { url: `${DFL}/locations/cards/market.png`, file: 'card-market.png' },
    cardBathroom:   { url: `${DFL}/locations/cards/bathroom.png`, file: 'card-bathroom.png' },
    cardBedroom:    { url: `${DFL}/locations/cards/bedroom.png`, file: 'card-bedroom.png' },
    cardDiningroom: { url: `${DFL}/locations/cards/diningroom.png`, file: 'card-diningroom.png' },
    cardWork:       { url: `${DFL}/locations/cards/work.png`, file: 'card-work.png' },
    // Location detail images
    locHead:        { url: `${DFL}/locations/location-head.png`, file: 'location-head.png' },
    locMarket:      { url: `${DFL}/locations/market.png`, file: 'loc-market.png' },
    locBathroom:    { url: `${DFL}/locations/bathroom.png`, file: 'loc-bathroom.png' },
    locBedroom:     { url: `${DFL}/locations/bedroom.png`, file: 'loc-bedroom.png' },
    locDiningRoom:  { url: `${DFL}/locations/dining_room.png`, file: 'loc-dining-room.png' },
    locLivingRoom:  { url: `${DFL}/locations/living_room.png`, file: 'loc-living-room.png' },
    locWork:        { url: `${DFL}/locations/work.png`, file: 'loc-work.png' },
  }

  if (!dryRun) {
    for (const [name, { url, file }] of Object.entries(imageMap)) {
      images[name] = await uploadImage(url, file)
    }
  } else {
    console.log('    [DRY-RUN] Skipping image uploads')
    for (const name of Object.keys(imageMap)) {
      images[name] = { _type: 'image', asset: { _type: 'reference', _ref: `placeholder-${name}` } }
    }
  }

  // ── Build content blocks ───────────────────────────────────────────────
  console.log('\n  Building content blocks...\n')
  const content = []

  // ═══════════════════════════════════════════════════════════════════════
  // INTRO
  // ═══════════════════════════════════════════════════════════════════════
  // Title comes from document title field, subtitle from subtitle field.
  // The "By Juhan Sonin" byline is handled via authors array.

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 1: Bloodletting to bloodless
  // ═══════════════════════════════════════════════════════════════════════

  content.push(textBlock('1. Bloodletting to bloodless.', 'h2'))
  content.push(
    textBlock(
      'Technological and societal trends are converging and pushing design to the forefront of health.',
      'h3'
    )
  )

  content.push(
    textBlock(
      'Health, as an experience and idea, is undergoing an epic shift. For millennia, humans have treated health as the rare spike that requires intervention. At a very basic level, when it comes to health, we humans experience our physical condition today much as our more furry ancestors did. We roam around. We eat mostly green stuff with the occasional indulgence in a tasty snack of fresh-killed meat. We drink water\u2014well, some of us hydrate\u2014and have sex and procreate. We stick with our tribe and try to steer clear of hostile marauders.'
    )
  )

  // Timeline image
  if (images.timeline) {
    content.push(imageBlock(images.timeline, 'Health timeline from 10,000 B.C. to the present', 'full', 'Illustration by Sarah Kaiser'))
  }

  // Timeline entries in a background section
  content.push(
    backgroundSection('gray', [
      richBlock(
        [
          { text: '10,000 B.C.: ', marks: ['strong'] },
          { text: 'The transition to agriculture was made necessary by gradually increasing population pressures due to the success of Homo sapiens\u2019 prior hunting and gathering way of life. Also, at about the time population pressures were increasing, the last Ice Age ended, and many species of large game became extinct. Wild grasses and cereals began flourishing, making them prime candidates for the staple foods to be domesticated, given our previous familiarity with them.', marks: [] },
        ],
        'normal',
        []
      ),
      richBlock(
        [
          { text: '4000 B.C.: ', marks: ['strong'] },
          { text: 'Environmental opportunities and challenges led to the formation of human groups. Sharing food, caring for infants, and building social networks helped our ancestors meet the daily challenges of their environments.', marks: [] },
        ],
        'normal',
        []
      ),
      richBlock(
        [
          { text: '3000 B.C.: ', marks: ['strong'] },
          { text: 'The earliest reports of surgical suture date back to 3000 BC in ancient Egypt, where physicians used stitches to close injuries, incisions and mummies.', marks: [] },
        ],
        'normal',
        []
      ),
      richBlock(
        [
          { text: '400 B.C.: ', marks: ['strong'] },
          { text: 'Hippocrates emphasizes the importance of water quality to health and recommends boiling and straining water.', marks: [] },
        ],
        'normal',
        []
      ),
      richBlock(
        [
          { text: '1920: Modern medicine begins. ', marks: ['strong'] },
          { text: 'Physicians no longer needed to ask permission of the church before starting their practice or performing surgery. Finally, reliable prescription drugs, and penicillin began to curb sickness before surgery or other last resorts were necessary. Modern surgery was coming of age. The last lobotomy to treat schizophrenia was done in 1970.', marks: [] },
        ],
        'normal',
        []
      ),
      richBlock(
        [
          { text: 'The modern doctor. ', marks: ['strong'] },
          { text: 'To be sure, modern medicine is all the things people expect when they visit a hospital, but a modern doctor in the developed world is as much of a super hero or science fiction character as friendly sawbones. The \u201cutility belt\u201d of tools at a modern doctor\u2019s disposal includes surgical lasers and robots, high-powered magnetic imagers and networked data streams.', marks: [] },
        ],
        'normal',
        []
      ),
      richBlock(
        [
          { text: '2018: ', marks: ['strong'] },
          { text: 'EHR data on subdermal chip (standard care plan option).', marks: [] },
        ],
        'normal',
        []
      ),
      textBlock('Design For Life: Next 25 years of Healthcare', 'normal'),
      richBlock(
        [
          { text: '2019: ', marks: ['strong'] },
          { text: 'Bathroom becomes Healthroom.', marks: [] },
        ],
        'normal',
        []
      ),
      textBlock('Design For Life: Next 25 years of Healthcare', 'normal'),
    ])
  )

  content.push(
    textBlock(
      'And as long as we\u2019re feeling okay, we think we\u2019re okay. Generally, that\u2019s true. Then health happens, usually when we least want or expect it. We stumble on the trail or travel far from home and come back with dysentery. One of these health happenings prompts a visit, so you go to a tribal elder who sets bones or you seek out the town doc to ease your intestinal disturbance or, after catching your son flying off the living room couch, you get an MRI to reveal a bicep tendon rupture.'
    )
  )

  content.push(
    textBlock(
      'What we call health is made up of these episodic issues and interventions. Even periodic exams are events that we bathe and dress up for. In fact, we are most conscious of our health during these moments. For the average person\u2014one without chronic pain or illness\u2014health is conceived of and managed as an exception.'
    )
  )

  content.push(
    textBlock(
      'Few would deny that health is the single most important factor for any human, at any age, living anywhere on Spaceship Earth. The potential impact of a health setback on a person\u2019s life may reach into all other areas of his life\u2014work, finances, love, and hobbies\u2014and even affect the community. The stakes of dealing with health are significantly high. For example, a high school math teacher with a kidney stone calls in sick, the principal hires a per diem substitute teacher, and the learning of 20 high school kids dwindles. In our era, the complexity of health has surged dramatically. Remarkable things have transpired over the past 100 years, the past 40 years, and the past 5. In 1909, for example, hospitals treated third-degree burn patients with opiates, frequent application of moist antiseptic dressings, and sometimes baths; today, clinics spray-paint new skin based on the burn victim\u2019s cells. The jump in technology and our understanding of biology and the health sciences is startling, which has ratcheted up both the system complexity and awareness of it. What\u2019s good for one patient may not be quite right for the patient in the next bed over.'
    )
  )

  content.push(
    textBlock(
      'Yet, same as 1,000 years ago, humans don\u2019t want to think about health until health happens\u2014or a health event happens. This state of denial is evidenced by the declining health rankings of the United States compared to 33 other wealthy nations. From 1990 to 2010, although Americans\u2019 life expectancy increased, our health rank decreased notably across six key health measures. While there may be social and cultural forces at play in these disheartening statistics, the continued decline of the health of the U.S. population suggests that we\u2019re still stuck in the land of episodic medical care, in not only treatment but also thinking, engineering, and designing for health.'
    )
  )

  content.push(
    textBlock(
      'There is a way out of this, and the remedy is not just a pill, diet, or implant. To illustrate the possibilities available to us right now, I propose a quickie thought experiment:'
    )
  )

  content.push(
    textBlock(
      'Suppose your data are simply and automatically collected\u2014all of your numbers surrounding your existence from the financial (which we\u2019re nearly doing today) to travel (again, captured today) to habits to eating to exercise to examining your daily biome. It\u2019s captured. It just happens, in the background.'
    )
  )

  content.push(
    textBlock(
      'And your captured data are visible: you can see the data points, see the trends, and even see the data of your close friends and family so you can help them make decisions and make change.'
    )
  )

  // hGraph aside
  content.push(
    backgroundSection('gray', [
      textBlock(
        'hGraph: Your health in one picture. It\u2019s an open source, standardized visual representation of a patient\u2019s health status, designed to increase awareness of the individual factors that can affect one\u2019s overall health.',
        'blockquote'
      ),
      textBlock(
        'hGraph users can easily identify which metrics exist in a normal range versus those that may be too high or low. It effectively conveys important data at sizes both large and small, and enables people to recognize patterns.',
        'blockquote'
      ),
    ])
  )

  content.push(
    textBlock(
      'The foundations of this new paradigm are in place. The structure is ours to make.'
    )
  )

  content.push(
    textBlock(
      'Our thought experiment provides a stark contrast to the current state of design thinking on life, on health, and on data. We have minimal transparency into key health metrics. For the data we do have, the overhead required to collect it is enormous. People have a hard enough time changing their Facebook privacy settings or figuring out mortgage refinancing. The systems we deal with are increasingly complex, and the user interfaces are more puzzles than designs. And as decision-makers, we are swamped with conflicting data.'
    )
  )

  content.push(
    textBlock(
      'As designers and engineers, our work is increasingly multi-dimensional (not a flat-decision space), and linear-thinking human beings are not good at non-linear thinking. Seeing every variable and doing the mental calculus to orchestrate better decision-making is not our species\u2019 forte. We fly by the seat of our pants until we get tired and land, thump, not always in the right or best place. One major variable in the everyday behavior change game is sensors... invisible sensors.'
    )
  )

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 2: The surveillance invasion
  // ═══════════════════════════════════════════════════════════════════════

  content.push(
    backgroundSection('gray', [
      textBlock('2. The surveillance invasion.', 'h2'),
      textBlock(
        'Wearable sensors impressively track personal health metrics, but the bands are still as easy to take off as they are to put on.',
        'h3'
      ),

      // Blade Runner dark aside — quote block
      quoteBlock(
        'These days, my thoughts turn pretty frequently to the image of the Voight-Kampff interrogation machine in the movie Blade Runner (1982). It was a tabletop apparatus with a mechanical eye that peered into a human (or robot) eye to non-invasively determine his/her/its \u201chealth\u201d status. It\u2019s either really creepy or really practical.'
      ),

      richBlock(
        [
          { text: 'The current confluence of sensor tech, data analytics maturity, hardware durability, miniaturization, and industrial evolution create a perfect storm for capturing biologic metrics and determining trends. In a year, we\u2019ll have a good first cut at a human prediction model that is personally meaningful and changes behavior (and is only 5% wrong).', marks: [] },
        ]
      ),

      richBlock(
        [
          { text: 'In the ', marks: [] },
          { text: 'GoInvo design studio', marks: ['lnk1'] },
          { text: ', I count a half-dozen different wearable health devices on the limbs of our staff, from a Basis watch to Fitbit pedometer to a BodyMedia band to a Jawbone up to a Philips pedometer. Digital scales, AliveCor EKG iPhone cases, cameras that detect blood pressure through your face\u2014we\u2019re not only surrounded by sensors, we\u2019re adorned with them.', marks: [] },
        ],
        'normal',
        [{ _type: 'link', _key: 'lnk1', href: '/', blank: false }]
      ),

      textBlock(
        'One problem with the current batch of wearables is just that: they\u2019re wearable, and engaging with them requires a ton of mental overhead. For example, take the very cool Withings Pulse. It tracks steps, general activity, sleep, and heart rate on demand. It has a touch screen, solid form factor, and decent contrast UI/screen. Yet I forget to put it in my running shorts pocket only to realize later that I\u2019m device-less and data-less.'
      ),

      textBlock(
        'The biggest beef with all the micro-wearables is that most users are not wearing their sensors 24/7. Sticking them in your pocket is easy, but it requires pants; when I\u2019m at home, I\u2019m often pantless. Furthermore, I don\u2019t wear it at night. The switch to turn it to \u201cnight-time\u201d mode, which then requires a flip back to daytime usage, is one switch too many for me. Even my BodyMedia armband isn\u2019t set-it-and-forget-it. I have to take it off when I shower and when the device needs charging. So even slick new devices like the Misfit Shine\u2014a wireless, wearable activity tracker\u2014all suffer from the same issue: they\u2019re a branch of devices called the \u201cnon-forgettables.\u201d'
      ),

      textBlock(
        'Now for the flip argument: from a wellness point of view, do \u201coff times\u201d really matter?'
      ),

      // Device lineup image
      ...(images.lineup
        ? [imageBlock(images.lineup, 'Device lineup: BodyMedia armband, Jawbone Up, Fitbit, and Withings Pulse', 'full', 'My device lineup includes the BodyMedia armband, the Jawbone Up, Fitbit, and the Withings Pulse.')]
        : []),

      textBlock(
        'I often forget to wear devices. During the first few months wearing a new health monitor, I\u2019m exposed to new data. Once I understand the patterns, the hardware becomes less and less useful (other than to have a bead on those metrics). I want the little health plug to strap on when sickness is coming that reduces symptoms and duration by 70%. Now that\u2019s a helpful micro device.'
      ),

      textBlock(
        'Form factor isn\u2019t really The Question because no form factor really hits it on the head. Maybe it\u2019s the implant. Or the invisible.'
      ),

      textBlock(
        'Hardware is the gateway drug to services and data. (If you\u2019re planning to get into health hardware, you\u2019re too late.) The current device line-up has little to do with the commodity of hardware\u2014it\u2019s all about your information and decision-making.'
      ),
    ])
  )

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 3: Life first. Health a distant second.
  // ═══════════════════════════════════════════════════════════════════════

  content.push(textBlock('3. Life first. Health a distant second.', 'h2'))
  content.push(
    textBlock(
      'The next challenges for designers and engineers in healthcare involve data\u2026 collected invisibly.',
      'h3'
    )
  )

  content.push(
    textBlock(
      'Designers and engineers have demonstrated that they can make cool sensors. Next, we are going to re-design those products and create new ones that capture data beautifully, and usually that will mean invisibly. Picture this: As I walk around my house, stand at my desk at work, and go pee, all of that physiological data will be snagged to do DSP analysis that signals \u201cgetting worse\u201d or \u201cgetting better\u201d on a defined timeline (based on known prior results). This is where machine learning, big data, and design crash together.'
    )
  )

  // Sensor dates — 3-column grid as columns block
  if (images['1985'] && images['2015'] && images['2025']) {
    content.push(
      columnsBlock('3', [
        imageBlock(images['1985'], 'Sensors in the home, 1985', 'full', '1985'),
        imageBlock(images['2015'], 'Sensors in the home, 2015', 'full', '2015'),
        imageBlock(images['2025'], 'Sensors in the home, 2025', 'full', '2025'),
      ])
    )
  }

  content.push(
    textBlock(
      'Sensors are exploding. They\u2019re everywhere and proliferating in my house. The DARPA line from the 1980s is catching up: smart dust is all around us.',
      'blockquote'
    )
  )

  content.push(
    textBlock(
      'What we learn from the design of personal wearable sensors will ultimately be applied to in-hospital devices.'
    )
  )

  content.push(
    textBlock(
      'There are still massive amounts of pain and mistakes in institutional and corporate healthcare:'
    )
  )

  // Bullet list
  content.push(
    ...bulletList([
      'Patient safety is a monster issue. There are 180,000 deaths by accident per year in US hospitals. That\u2019s 500 deaths per day.',
      'There are scores of classic examples like anesthesia gone wrong during surgery and known allergies overlooked. Go to the ECRI Institute website if you want to deep dive into improving patient safety and quality.',
      'Cullen Care was sued over a claim that the pharmacy made a dosing error, dispensing 150mg of morphine for a kid, which is 10 times the required dose. Their mistake came down to human error, inputting 150 instead of the prescribed 15mg. Sadly, this type of human error happens daily.',
    ])
  )

  content.push(
    textBlock(
      'More people die annually from overdosing by prescription drugs like oxycontin than car accidents. Humans and machines need to be points in the same loop, each checking and amplifying each other\u2019s work and output, because both, especially humans, make mistakes. One way to audit and be exposed to near-real-time care data analysis is a natural extension of Hal 2000: the recording of all procedures within the walls of hospitals. Every injection, every surgery, every patient-clinician encounter will be on camera, microphoned, and recorded. Clinicians wearing Google-glass-esque monitors that automagically capture the patient\u2019s mood, tiny facial triggers pointing to emotional state and potential conditions, and other metrics, will be whispered hints and diagnosis by the cloud-based Dr. Watson. Longer-term hospital visits will require patients to wear individual trackers. Then when conflicts occur, or right before a tragic maneuver, the hospital and patient trackers will run \u201cinterference.\u201d'
    )
  )

  content.push(
    textBlock(
      'Machines and humans are about to synchronize in a whole new way at home. Let\u2019s talk about... the bathroom.'
    )
  )

  content.push(
    richBlock(
      [{ text: 'Your bathroom will be an invisible sensor haven.', marks: ['strong'] }],
    )
  )

  content.push(
    textBlock(
      'Consider what that room collects and how it could be assessed, sooner rather than later. Hair follicles collected in the shower drain. GI samples and urinalysis from the toilet. Your biome sloughing off into the sink. Weight, heart rate, blood flow, and facial expressions recorded automatically. It just happens, with regular feedback loops but no mental or physical overhead. It isn\u2019t the bathroom anymore; it\u2019s the health room.'
    )
  )

  // Healthroom callout
  content.push(
    backgroundSection('gray', [
      textBlock(
        'How do you get a pulse on key health metrics without a single tear? Your bathroom will turn into a healthroom, complete with non-invasive diagnostics for early detection of chronic diseases.',
        'blockquote'
      ),
      textBlock(
        'The Healthrooms will proliferate and scale as they turn into ready-made, all-in-one, drop-in units. Illustration by Quentin Stipp.',
        'blockquote'
      ),
    ])
  )

  content.push(
    textBlock(
      'Hospitals are rolling out patient portals and insurance companies are experimenting with electronic health records, but the usefulness of those repositories is limited to patients. More critical are teachable moments in data that signal potential outcomes and prompt micro behavior shifts that in turn will offer feedback and affirm new behaviors or nudge new ones.'
    )
  )

  content.push(
    textBlock(
      'In the bathroom and, eventually, in other environments like the hospital room, the majority of your physiologic signs will be snagged non-invasively, through sensors that passively sniff you. No blood draws. No awkward stool sample cards. Just whiffs and sniffs and the occasional photograph. All of this must be designed to feel wonderful, so that you think more about LIFE and less about \u201chealth\u201d and \u201csecurity.\u201d Background, automatic health sensing will let us focus our consciousness on the dream life we want to live.'
    )
  )

  // Sleeper aside
  content.push(
    backgroundSection('gray', [
      textBlock(
        'Talking about passive sensors, I always picture the orgasmatron from Woody Allen\u2019s movie, Sleeper (1973), which was set in the year 2173. This fictional device, a cylinder large enough to contain one or two people, rapidly induced orgasms. A character would walk in, have a blast, and walk out only seconds later. That\u2019s how I want healthcare delivered. That\u2019s where engineering and design can really have impact.'
      ),
      textBlock('Sign me up.'),
      textBlock('Image from Woody Allen\u2019s movie, Sleeper, 1973', 'normal'),
    ])
  )

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 4: Stage Zero Detection
  // ═══════════════════════════════════════════════════════════════════════

  content.push(
    backgroundSection('gray', [
      textBlock('4. Stage Zero Detection.', 'h2'),
      textBlock(
        'Continuous assessments make real-time adjustments not only possible but desirable and doable.',
        'h3'
      ),

      textBlock(
        'We get biome analysis, emotional analysis, breath evaluation, and voice analysis. Bots (some with cameras) are in our stomachs and blood streams, churning through our bodies and molecules, gathering intelligence. We are able to detect disease and conditions as they erupt at the cellular level, and not have to wait until they physically manifest so our eyes and bodies can \u201csee\u201d them. (By the time we can see it with our own eyes, it\u2019s too goddamn late.)'
      ),

      // Aging image
      ...(images.aging
        ? [imageBlock(images.aging, 'The progression of aging', 'full')]
        : []),

      textBlock(
        'That\u2019s the future, and it is near. If health is beautifully integrated into our daily life, so that we\u2019re getting continuous assessments, we\u2019ll be able to adjust in near-real time.'
      ),

      textBlock('Next, here\u2019s what\u2019s on the horizon:'),

      // Bullet list inside background section
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{ _type: 'span', _key: key(), text: 'Scanadu, a hockey-puck-sized, 10-major-metric, non-invasive data collector;', marks: [] }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{ _type: 'span', _key: key(), text: 'Make-my-pill (based on my dynamic careplan, biology, conditions, geo, etc) vending machine by Walgreens;', marks: [] }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{ _type: 'span', _key: key(), text: 'Adamant, a breath sensor out of Penn State that detects differing signatures in 25 variables of your breath; and', marks: [] }],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: key(),
        style: 'normal',
        listItem: 'bullet',
        level: 1,
        children: [{ _type: 'span', _key: key(), text: 'One-nanometer resolution spectrometers, priced at $20, for instant food analysis at the molecular level. \u201cDoes this food have any peanuts in it?\u201d Check it with a smartphone.', marks: [] }],
        markDefs: [],
      },

      // Location card images — 5 across, using columns
      ...(images.cardMarket
        ? [columnsBlock('3', [
            imageBlock(images.cardMarket, 'Market', 'full', 'Market'),
            imageBlock(images.cardBathroom, 'Bathroom', 'full', 'Bathroom'),
            imageBlock(images.cardBedroom, 'Bedroom', 'full', 'Bedroom'),
          ])]
        : []),
      ...(images.cardDiningroom
        ? [columnsBlock('2', [
            imageBlock(images.cardDiningroom, 'Dining Room', 'full', 'Dining Room'),
            imageBlock(images.cardWork, 'Work', 'full', 'Work'),
          ])]
        : []),

      // Location detail images
      ...(images.locHead
        ? [imageBlock(images.locHead, 'Health sensing locations overview', 'full')]
        : []),
      ...(images.locMarket
        ? [columnsBlock('3', [
            imageBlock(images.locMarket, 'Health sensing at the market', 'full', 'Market'),
            imageBlock(images.locBathroom, 'Health sensing in the bathroom', 'full', 'Bathroom'),
            imageBlock(images.locBedroom, 'Health sensing in the bedroom', 'full', 'Bedroom'),
          ])]
        : []),
      ...(images.locDiningRoom
        ? [columnsBlock('3', [
            imageBlock(images.locDiningRoom, 'Health sensing in the dining room', 'full', 'Dining Room'),
            imageBlock(images.locLivingRoom, 'Health sensing in the living room', 'full', 'Living Room'),
            imageBlock(images.locWork, 'Health sensing at work', 'full', 'Work'),
          ])]
        : []),

      textBlock(
        'These are neat. Designers and engineers, we can do more, and we should. It won\u2019t be until our digital health \u201cguards\u201d\u2014the digital services that pound on those massive data sets and prior patterns in order to keep us healthier\u2014can identify trends and thereby exponentially reduce our sickness rates that we\u2019ll reach Phase Two. My health and my family\u2019s health will be actively guarded. The technology is already widely used. For instance, for $10 per month I subscribe to CitiBank\u2019s so-called fraud security net, which monitors any transaction that didn\u2019t appear to come from me or my family, across the planet. If there is any suspicious action, the bot notifies me immediately, and together we deconflict the issue in near-real time. An analogous (and currently fictitious) product service is LifeLock, a Netflix-type model where I pay $10, $20, or $30 per month for the service to look over and protect my data, know who is touching it, predict behaviors, and tease me to change my behaviors. This cloud guard will auto-detect and alert me to the make-my-pill vending machine getting hacked = protecting all the trains of trust.'
      ),

      textBlock(
        'In the future, we\u2019ll eat our medicine and lookout bots. They will monitor and command seek-and-destroy missions at the cellular level in conjunction with external readings and decision-support tools. We won\u2019t feel or notice a thing.'
      ),

      textBlock(
        'I\u2019ll be notified that my biome composition has shifted and that a cold is coming on in a day. My day-treat\u2014concocted specifically for me based on my genomic and personal data set\u2014can be ready in 60 minutes at my local pharmacy. The Skittle-sized gel tab, a living set of custom organisms ready to swim into my blood stream, is taken orally, melts away immediately, and within several dozen minutes I am back to my unique, diverse, healthy biome. No stuffy head, no aching muscles, no fever, no sign of \u201chealth,\u201d good or bad. I simply am.'
      ),

      textBlock(
        'This design space needs to chew on the massive volume of data and massive volume of human factors and their interrelationships. I mean taking every connecting piece of information from what we\u2019re eating, how we\u2019re moving (or not), how we work, and what makes up our genome, and expanding that out to the entire system-picture of a human living on planet earth. All of that interconnecting and interlocked information tissue needs to be condensed into a single decision space that\u2019s not a data dump but a highly personalized, insight crystal ball.'
      ),

      textBlock(
        'That insight service is getting close on the research and science side.'
      ),

      textBlock('Sound scary? It is\u2026 a little.'),
    ])
  )

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 5: From protein to pixel to policy
  // ═══════════════════════════════════════════════════════════════════════

  content.push(textBlock('5. From protein to pixel to policy.', 'h2'))
  content.push(
    textBlock(
      'Design-for-health possibilities and responsibilities are immense.',
      'h3'
    )
  )

  content.push(
    textBlock(
      'Our medical records, our life records, will be available for computational use like we currently have with social data on Facebook and Google. Machine learning and prediction will vastly improve our ability to live life, to see conditions at their earliest manifestation as we get fabulous, personalized, medical diagnostics and advice.'
    )
  )

  content.push(
    textBlock(
      'This sensor cloud will monitor my physical activity and my online activity too. It will observe, for example, that 90% of my bandwidth is porn and propose that the erectile dysfunction I experience when faced with a live boyfriend is correlated with online activity. (Note: data are starting to trickle in on this, even though the researchers are having a hard time finding a control group.)'
    )
  )

  content.push(
    textBlock(
      'The power of the data and tools is impressive. The implications are daunting to the same degree. Designers and engineers will need to deliver products that are functional and invisible, but also make designs that are inviting not intimidating, reassuring and not anxiety-producing. We want to improve humanity, not put it under house arrest.'
    )
  )

  content.push(
    textBlock(
      'What Orbitz did to travel agents, medical technology, design, and culture shifts will do to doctors and the traditional practice of episodic medicine.'
    )
  )

  content.push(
    textBlock(
      'As a designer, I want my fingers, hands, and eyes on all the moving parts of a product, no matter how small or big. I want to influence the world from protein, to policy, to pixels. That means expanding our skills and knowledge to have impact at levels of science and society as well as design and engineering. That degree of immersion into problem solving and the holistic context of my clients enables our design studio to make extraordinary impact, at a level that transcends the important issues of our clients but get into issues of meaning and the longer future.'
    )
  )

  content.push(
    textBlock(
      'And at some point in our careers, designers and engineers need to be involved in policy... in the crafting, in the designing or development of guidelines or law that drive how we as a people, operate together (or not). Some efforts are grassroots, like the open source Inspired EHR Guide (inspiredehrs.org), which starts with just a few people. This is attacking at the fringe, from the outside in. Data standards and policy-making and advising mafia (like HL7 or HIMSS) need good engineers and designers to participate. This is not super-sexy work. While the pace of sculpting governance is enormously slow (these kinds of efforts take years and are often frustrating experiences), the ultimate outcome and impact can be long-lasting. And making this kind of change is why I\u2019m in business.'
    )
  )

  // ═══════════════════════════════════════════════════════════════════════
  // SECTION 6: Final Thoughts
  // ═══════════════════════════════════════════════════════════════════════

  content.push(
    backgroundSection('gray', [
      textBlock('6. Final Thoughts', 'h2'),

      textBlock(
        'Data let us live aware of our health. For example, when we are messaged that ice cream is high in fat, high in sugar, and high in cow\u2019s milk, we process that as \u201cOkay, that\u2019s bad, but so what?\u201d As soon as it that message becomes quantified, and not by keeping annoying food diaries and looking up the nutrition content of every bite or sip, we get religion. Data take us by the shoulders and shake. We notice that eating this way, and continuing to do so, has taken days, or even a few years, off our precious life expectancy. That is when the entire world changes. But not before.'
      ),

      richBlock(
        [{ text: 'It\u2019s up to us.', marks: ['strong'] }],
      ),

      // Mirror image
      ...(images.mirror
        ? [imageBlock(images.mirror, 'Healthroom mirror concept with care cards', 'full')]
        : []),

      richBlock(
        [
          { text: 'Learn more about Care Cards at ', marks: [] },
          { text: 'goinvo.com/products/care-cards', marks: ['lnkCare'] },
        ],
        'normal',
        [{ _type: 'link', _key: 'lnkCare', href: '/vision/care-plans', blank: false }]
      ),
    ])
  )

  // ═══════════════════════════════════════════════════════════════════════
  // CONTRIBUTORS
  // ═══════════════════════════════════════════════════════════════════════

  content.push(dividerBlock())
  content.push(textBlock('Contributors', 'h2Center'))

  // Contributors grid as rich text
  content.push(
    richBlock([
      { text: 'Editor', marks: ['strong'] },
    ])
  )
  content.push(textBlock('Emily Twaddell'))
  content.push(textBlock('Jane Kokernak'))

  content.push(
    richBlock([
      { text: 'Designer', marks: ['strong'] },
    ])
  )
  content.push(textBlock('Xinyu Liu'))

  content.push(
    richBlock([
      { text: 'Illustrator', marks: ['strong'] },
    ])
  )
  content.push(textBlock('Sarah Kaiser'))
  content.push(textBlock('Quentin Stipp'))

  content.push(
    richBlock([
      { text: 'Developer', marks: ['strong'] },
    ])
  )
  content.push(textBlock('Adam Pere'))
  content.push(textBlock('Noel Forte'))

  console.log(`  Total content blocks: ${content.length}`)
  return { content, heroImage: images.hero }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  Migrate: bathroom-to-healthroom → Sanity               ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  if (dryRun) console.log('\n  *** DRY RUN — no writes ***\n')

  // 1. Look up the existing document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "bathroom-to-healthroom"][0]{_id, title}`
  )
  if (!doc) {
    console.error('  ERROR: No feature document found with slug "bathroom-to-healthroom".')
    console.error('  Create the document in Sanity Studio first, then re-run.')
    process.exit(1)
  }
  console.log(`  Found document: ${doc._id} — "${doc.title}"`)

  // 2. Build content
  const { content, heroImage } = await buildContent()

  // 3. Patch the document
  if (dryRun) {
    console.log('\n  [DRY-RUN] Would patch document with:')
    console.log(`    - subtitle: "How magical technology will revolutionize human health"`)
    console.log(`    - ${content.length} content blocks`)
    console.log(`    - authors: [team-juhan-sonin]`)
    console.log(`    - hero image: ${heroImage ? 'yes' : 'no'}`)
    console.log('\n  Done (dry run).')
    return
  }

  console.log('\n  Patching document...')
  const patchData = {
    subtitle: 'How magical technology will revolutionize human health',
    content,
    authors: [
      {
        _type: 'reference',
        _ref: 'team-juhan-sonin',
        _key: key(),
      },
    ],
  }

  // Set hero image if uploaded
  if (heroImage) {
    patchData.image = heroImage
  }

  await client.patch(doc._id).set(patchData).commit()
  console.log('  Document patched successfully!')

  // 4. Summary
  console.log('\n  ════════════════════════════════════════════════════════')
  console.log(`  Content blocks: ${content.length}`)
  console.log('  Subtitle: How magical technology will revolutionize human health')
  console.log('  Authors: Juhan Sonin (team-juhan-sonin)')
  console.log('  ════════════════════════════════════════════════════════')
  console.log('\n  Next steps:')
  console.log('    1. Delete src/app/(main)/vision/bathroom-to-healthroom/page.tsx')
  console.log('    2. rm -rf .next && npx next build')
  console.log('    3. npx tsx scripts/compare-pages.ts bathroom-to-healthroom --verbose')
  console.log()
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
