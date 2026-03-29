/**
 * Migration Script: Redesign Democracy → Sanity Portable Text
 *
 * Reads the static override TSX to extract ALL text content, headings, quotes,
 * and links. Uploads ALL images to Sanity's asset pipeline. Creates complete
 * Portable Text content matching the Gatsby structure. Patches the existing
 * feature document with slug.current == 'redesign-democracy'.
 *
 * Usage:
 *   node scripts/migrate-redesign-democracy.mjs
 *   node scripts/migrate-redesign-democracy.mjs --dry-run   # preview without writing
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import { resolve } from 'path'
import https from 'https'
import http from 'http'

// ─── Load env ───────────────────────────────────────────────────────────────
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

// ─── Image base URL ─────────────────────────────────────────────────────────
const IMG_BASE = 'https://www.goinvo.com/old/images/features/democracy/'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod.get(url, { headers: { 'User-Agent': 'sanity-migration/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function randomKey() {
  return Math.random().toString(36).slice(2, 14)
}

// Upload cache to avoid re-uploading the same URL
const uploadCache = new Map()

async function uploadImage(relPath) {
  const url = relPath.startsWith('http') ? relPath : IMG_BASE + relPath
  if (uploadCache.has(url)) return uploadCache.get(url)

  try {
    console.log(`  [image] Uploading: ${url}`)
    const buffer = await fetchBuffer(url)
    const filename = url.split('/').pop().split('?')[0]
    const ext = filename.split('.').pop().toLowerCase()
    const contentType =
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'webp' ? 'image/webp' :
      ext === 'svg' ? 'image/svg+xml' :
      'image/jpeg'
    const asset = await client.assets.upload('image', buffer, {
      contentType,
      filename,
    })
    const ref = asset._id
    uploadCache.set(url, ref)
    console.log(`  [image] OK -> ${ref}`)
    return ref
  } catch (err) {
    console.error(`  [image] FAILED ${url}: ${err.message}`)
    uploadCache.set(url, null)
    return null
  }
}

// ─── Portable Text Block Builders ───────────────────────────────────────────

/**
 * Creates a text block with plain text content.
 * @param {string} text
 * @param {string} style - 'normal', 'h1', 'h2', 'h3', 'h4', 'sectionTitle', 'h2Center', 'callout', 'blockquote'
 * @returns {object} Portable Text block
 */
function textBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: randomKey(),
    style,
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: randomKey(),
        text,
        marks: [],
      },
    ],
  }
}

/**
 * Creates a text block with rich inline children (bold, italic, links).
 * @param {Array} children - Array of { text, marks, markKey? } objects
 * @param {string} style
 * @param {Array} markDefs - Array of link mark definitions
 * @returns {object} Portable Text block
 */
function richBlock(children, style = 'normal', markDefs = []) {
  return {
    _type: 'block',
    _key: randomKey(),
    style,
    markDefs,
    children: children.map((c) => ({
      _type: 'span',
      _key: randomKey(),
      text: c.text,
      marks: c.marks || [],
    })),
  }
}

/**
 * Creates a link mark definition and returns its key and def.
 */
function linkMark(href, blank = true) {
  const markKey = randomKey()
  return {
    markKey,
    markDef: {
      _type: 'link',
      _key: markKey,
      href,
      blank,
    },
  }
}

function dividerBlock() {
  return {
    _type: 'divider',
    _key: randomKey(),
    style: 'default',
  }
}

function ctaButton(label, url, variant = 'primary', external = true) {
  return {
    _type: 'ctaButton',
    _key: randomKey(),
    label,
    url,
    variant,
    external,
  }
}

function quoteBlock(text, author, role) {
  return {
    _type: 'quote',
    _key: randomKey(),
    text,
    author: author || undefined,
    role: role || undefined,
  }
}

function imageBlock(assetRef, alt, size = 'large') {
  if (!assetRef) return null
  return {
    _type: 'image',
    _key: randomKey(),
    asset: { _type: 'reference', _ref: assetRef },
    alt: alt || '',
    size,
  }
}

function imageBlockWithCaption(assetRef, alt, caption, size = 'large') {
  if (!assetRef) return null
  return {
    _type: 'image',
    _key: randomKey(),
    asset: { _type: 'reference', _ref: assetRef },
    alt: alt || '',
    caption: caption || undefined,
    size,
  }
}

/**
 * Creates a background section block wrapping inner content blocks.
 */
function backgroundSection(color, innerBlocks) {
  return {
    _type: 'backgroundSection',
    _key: randomKey(),
    color,
    content: innerBlocks,
  }
}

/**
 * Creates a columns block.
 */
function columnsBlock(layout, cols) {
  return {
    _type: 'columns',
    _key: randomKey(),
    layout,
    content: cols,
  }
}

// ─── Build All Content ──────────────────────────────────────────────────────

async function buildContent() {
  const blocks = []

  // ═══════════════════════════════════════════════════════════════════════════
  // HERO IMAGE — phones.jpg (set at document level, not inline)
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Redesign Democracy', 'h1'))
  blocks.push(textBlock('A better solution for the digital era.', 'h3'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: INTRODUCTION
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Introduction', 'h2'))

  blocks.push(textBlock(
    'Older generations seem to chronically lament that the world of the young is new, unprecedented, and terrible. Nostalgia and familiarity combine to create a \u201cThey don\u2019t make \u2018em like they used to\u2026\u201d mentality, one that ignores the fact preceding generations were saying exactly the same thing about them. The reality is that things are the way they are, each of us typically being more comfortable with and connected to that which we know the best and identify most closely with ourselves.'
  ))

  blocks.push(textBlock(
    'However, it is just possible that we are reaching the nadir of the existing democratic process in the United States, an environment of toxicity and partisanship that shows no sign of softening. Coincidentally we are also at a moment where technology enables the tantalizing potential to reconsider the way our government is structured.'
  ))

  blocks.push(textBlock(
    'Democracy in the United States has over 200 years of history behind it; democracy as a government system has more than 2,000 years of precedent. It may be the best system going but it sure doesn\u2019t seem to be doing a very good job. It might even be obsolete in this world that looks so very different than the one which produced it.'
  ))

  blocks.push(textBlock(
    'This is the moment \u2014 our moment, together, yours and mine \u2014 to create a better system. So read on, see what I have in mind, and why. And if it sounds good to enough of us, maybe we can really change the world.'
  ))

  // Author sign-off (callout style)
  blocks.push(textBlock('Dirk Knemeyer\nGranville, Ohio, U.S.\nSeptember 8, 2014', 'blockquote'))

  blocks.push(richBlock(
    [{ text: 'This article is also available as PDF, eBook, and spoken by the author free of charge.', marks: ['em'] }],
    'normal',
    []
  ))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: THE ORIGINS OF DEMOCRACY
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('The Origins of Democracy', 'h2'))

  blocks.push(richBlock(
    [{ text: 'Today\u2019s U.S. government is built on principles and practices established more than 2,000 years ago. Can digital technology help us realize a better way?', marks: ['em'] }],
    'normal',
    []
  ))

  blocks.push(textBlock(
    'Democracy first took root around 508 BCE in Athens, Greece, the cultural cradle of antiquity. From 508 to 146 BCE Greece, particularly Athens, set the foundation upon which western civilization was to develop. Much of modern science, art, and architecture traces directly back to this place and time, building off of or reacting to the achievements of this period over the subsequent 2,160 years. This is certainly the case with modern democracy.'
  ))

  blocks.push(textBlock(
    'Of course, the Athenians had a very different conception than we do of who was eligible to rule, to say nothing of who could vote. According to A.W. Gomme, of the estimated 315,500 people in Athens during the height of their civilization, there were:'
  ))

  // Image: population.jpg
  const populationRef = await uploadImage('population.jpg')
  blocks.push(imageBlock(populationRef, 'Population chart of Ancient Athens showing 25,000 male citizens, 46,500 menial laborers, 115,000 slaves, and 129,000 women and children'))

  blocks.push(textBlock(
    'Only the 25,000 male citizens of Athens could vote, meaning that fewer than 13% of the population had the privilege to choose their leaders.'
  ))

  // Image: greek.jpg with caption
  const greekRef = await uploadImage('greek.jpg')
  blocks.push(imageBlockWithCaption(greekRef, 'Some ancient Greek technologies: thermometers, coin money, and catapults', 'Key technologies from ancient Greece: thermometers, coin money, and catapults.'))

  blocks.push(textBlock(
    'The lack of universal representation was obviously a problem, but a more subtle issue with Athenian democracy was the scale. In their very different and dispersed representational model \u2014 with dozens of roles \u2014 more than half of the 25,000 male citizens served in some official governing capacity at all times. The consequence was that most of this privileged class participated in government or had direct relationships and access to those who did.'
  ))

  blocks.push(textBlock(
    'We continue to model our government systems on the same democratic approach, established more than 2,000 years ago, which represented only a small, privileged minority. Is democracy a mistake?'
  ))

  // ── Alternative Forms of Government ──
  blocks.push(textBlock('Alternative Forms of Government', 'h3'))

  // -- Theocracy --
  blocks.push(backgroundSection('gray', [
    textBlock('Theocracy', 'h4'),
    textBlock('A deity was recognized as the official ruler and policy was set by officials who claimed divine guidance. These leaders largely came from privileged groups and families.'),
    richBlock([
      { text: 'Key Strength: ', marks: ['strong'] },
      { text: 'Spiritual basis for rules and decisions encouraged compliance and minimized dissatisfaction.', marks: [] },
    ]),
    richBlock([
      { text: 'Crippling Weakness: ', marks: ['strong'] },
      { text: 'Abstraction of divinity broke down quickly in the absence of clear religious hegemony.', marks: [] },
    ]),
    richBlock([
      { text: 'Historical Example: ', marks: ['strong'] },
      { text: 'Chinese Shang Dynasty, 1600\u20131046 BCE. The emperor, descended from a continuous male line, was treated as God-like. Both a political and religious leader, his written declarations were considered as \u201cdirectives from above\u201d and the actions of the state as divinely influenced.', marks: [] },
    ]),
    richBlock([
      { text: 'Downfall: ', marks: ['strong'] },
      { text: 'The Shang dynasty weakened over time. Debauched emperor Shang Di Xin poorly managed his holdings and lead his army to destruction, ushering in the Zhou dynasty.', marks: [] },
    ]),
    richBlock([
      { text: 'Lessons Learned: ', marks: ['strong'] },
      { text: 'While a single-religion state seems impossible in the modern world, yoking the rule of state to spirituality in such a case can create stability and\u2014assuming reasonable civil rights\u2014relative harmony.', marks: [] },
    ]),
  ]))

  // -- Oligarchy --
  blocks.push(backgroundSection('gray', [
    textBlock('Oligarchy', 'h4'),
    textBlock('Control was exercised by a small group of people whose authority was based on special status related to power, wealth, education, or family.'),
    richBlock([
      { text: 'Key Strength: ', marks: ['strong'] },
      { text: 'Efficient application of power by a theoretically enlightened group.', marks: [] },
    ]),
    richBlock([
      { text: 'Crippling Weakness: ', marks: ['strong'] },
      { text: 'Participation in governance was restricted to the anointed few.', marks: [] },
    ]),
    richBlock([
      { text: 'Historical Example: ', marks: ['strong'] },
      { text: 'Ancient Sparta, 7th century to 4th century BCE. Twenty-eight men over 60 years of age, along with two kings, made up the \u201ccouncil of elders.\u201d They formulated proposals for acceptance or rejection by all free males.', marks: [] },
    ]),
    richBlock([
      { text: 'Downfall: ', marks: ['strong'] },
      { text: 'Wars killed citizens and weakened the Spartan geopolitical position. Spartan citizenship was inherited along family lines, so Spartans increasingly became a minority.', marks: [] },
    ]),
    richBlock([
      { text: 'Lessons Learned: ', marks: ['strong'] },
      { text: 'The Spartan oligarchy was generally an effective governing body. The underlying societal structure\u2014only a privileged and distinctly minority class were considered citizens\u2014was the primary issue.', marks: [] },
    ]),
  ]))

  // -- Feudalism --
  blocks.push(backgroundSection('gray', [
    textBlock('Feudalism', 'h4'),
    textBlock('Powerful regional families lorded over their territory and the people therein, with sovereignty a product of military might.'),
    richBlock([
      { text: 'Key Strength: ', marks: ['strong'] },
      { text: 'Civilians had a high degree of social security and stability.', marks: [] },
    ]),
    richBlock([
      { text: 'Crippling Weakness: ', marks: ['strong'] },
      { text: 'Rigid caste structure trapped most people into lives over which they had little control and may not have wanted.', marks: [] },
    ]),
    richBlock([
      { text: 'Historical Example: ', marks: ['strong'] },
      { text: 'Medieval Japan, 12th century to 16th century. While Japan was nominally ruled by a weak emperor, regional daimyo served as absolute rulers of their territorial holdings, passed down within the same family.', marks: [] },
    ]),
    richBlock([
      { text: 'Downfall: ', marks: ['strong'] },
      { text: 'The period of \u201cwarring states\u201d consolidated power to a strong emperor, breaking feudal decentralization for good.', marks: [] },
    ]),
    richBlock([
      { text: 'Lessons Learned: ', marks: ['strong'] },
      { text: 'The combination of decentralization with perpetual military conflict between regional powers meant the emphasis of citizen effort was on subsistence and security. Quality of life, as well as progress in arts and sciences, was minimal.', marks: [] },
    ]),
  ]))

  // -- Absolute Monarchy --
  blocks.push(backgroundSection('gray', [
    textBlock('Absolute Monarchy', 'h4'),
    textBlock('A single individual held most of the power over a nation-state.'),
    richBlock([
      { text: 'Key Strength: ', marks: ['strong'] },
      { text: 'A single ruler was able to act decisively, set a vision, and execute it without compromise.', marks: [] },
    ]),
    richBlock([
      { text: 'Crippling Weakness: ', marks: ['strong'] },
      { text: 'No checks and balances. If the monarch was weak or corrupt the nation and citizens could suffer terribly.', marks: [] },
    ]),
    richBlock([
      { text: 'Historical Example: ', marks: ['strong'] },
      { text: 'France, 8th century to 18th century CE. Over 1,000 years just five powerful dynasties provided hereditary monarchs that led France to be the dominant power in continental Europe.', marks: [] },
    ]),
    richBlock([
      { text: 'Downfall: ', marks: ['strong'] },
      { text: 'Indulgences by the nobility contrasted with the misery of the common people during a period where theories of civil and political rights transformed popular expectations. The result was the French Revolution which famously ended the millennium-long tradition of hereditary rule.', marks: [] },
    ]),
    richBlock([
      { text: 'Lessons Learned: ', marks: ['strong'] },
      { text: 'French contributions to humanity and the arts and sciences continue to reverberate, notably those originating in Louis XIV\u2019s reign of so-called enlightened rule. However, the absolute rulers ultimately neglected their people to the point of their own destruction.', marks: [] },
    ]),
  ]))

  // -- Parliamentary Monarchy --
  blocks.push(backgroundSection('gray', [
    textBlock('Parliamentary Monarchy', 'h4'),
    textBlock('A ruling monarch worked with a democratically elected parliament, all within a code of laws.'),
    richBlock([
      { text: 'Key Strength: ', marks: ['strong'] },
      { text: 'Democratic nature of parliament represents the common person although the monarch retains many benefits and powers of an absolute ruler.', marks: [] },
    ]),
    richBlock([
      { text: 'Crippling Weakness: ', marks: ['strong'] },
      { text: 'Dysfunction between the monarch and parliament can lead to gridlock; ineffectiveness on the part of either the monarch or parliament can unbalance the government.', marks: [] },
    ]),
    richBlock([
      { text: 'Historical Example: ', marks: ['strong'] },
      { text: 'England/United Kingdom, 17th century CE to present. In the early days, a king or queen presided in conjunction with a parliament and prime minister. By the 20th century the monarch was reduced to a figurehead and the nation was functionally a democracy.', marks: [] },
    ]),
    richBlock([
      { text: 'Lessons Learned: ', marks: ['strong'] },
      { text: 'The U.K. now functions as a monarchy in name only. During the reign of Queen Victoria it was the largest empire in history. Thanks to their flexibility the empire declined in a somewhat intentional and controlled way and today the U.K. is still one of the few leading world powers.', marks: [] },
    ]),
  ]))

  // -- Single-Party State --
  blocks.push(backgroundSection('gray', [
    textBlock('Single-Party State', 'h4'),
    textBlock('Most western dictatorships of the 20th century were established where a single political party took control of the government and, to varying degrees, independently made decisions relating to rulers and laws.'),
    richBlock([
      { text: 'Key Strength: ', marks: ['strong'] },
      { text: 'Similar ideology and platform shared by those in control creates efficiency and sidesteps the friction inherent in multi-party systems.', marks: [] },
    ]),
    richBlock([
      { text: 'Crippling Weakness: ', marks: ['strong'] },
      { text: 'Civil rights generally take a back seat to maintaining and expanding power, leading to a relatively closed society of a sort that has historically proven unsustainable.', marks: [] },
    ]),
    richBlock([
      { text: 'Historical Example: ', marks: ['strong'] },
      { text: 'Communist Russia, 1918\u20131991 CE. The bloody overthrow of the last Russian Tsar saw Russia, a middling European power, rise within 40 years to take eastern Europe under their federal control and become one of the first global superpowers.', marks: [] },
    ]),
    richBlock([
      { text: 'Lessons Learned: ', marks: ['strong'] },
      { text: 'Concentrated power and government control enabled the mechanization of powerful forces; closed, controlling society and over-reach of influence on a global level left communist Russia ripe for ignominious collapse.', marks: [] },
    ]),
  ]))

  // Post-government-types paragraphs
  blocks.push(textBlock(
    'Systems of government are characterized by a broad and complicated range of characteristics. This complexity can make it difficult to consider new political systems. Over the last 3,000 years the developing world has tried hundreds of different systems of government, many of which fall under the archetypes presented here. It is valuable to consider them in thinking about how we can re-imagine our own governance. However, we live in a moment when human rights are of paramount importance, so governments that minimize citizen involvement in determining laws and leadership present a less attractive choice.'
  ))

  blocks.push(textBlock(
    'The reality is, at our current evolutionary stage, people must advocate for themselves. Time and time again we\u2019ve learned that trusting someone or something else with our own well-being generally leads to its degrading. It is, after all, human nature to value one\u2019s own needs over those of society at large.'
  ))

  // Image: circle.jpg with caption
  const circleRef = await uploadImage('circle.jpg')
  blocks.push(imageBlockWithCaption(circleRef, 'Concentric circles showing rings from \u201cMyself and family\u201d at center through \u201cAll of humanity\u201d', 'The way we take care of our needs can be described by a series of concentric rings, from \u201cMyself and family\u201d at center to \u201cAll of humanity\u201d at the outermost ring.'))

  // Churchill quote
  blocks.push(quoteBlock(
    'It has been said that democracy is the worst form of government except all the others that have been tried.',
    'Sir Winston Churchill'
  ))

  blocks.push(textBlock(
    'Each ring out from the center gets less of my care and interest. I am just one person who has an intricate life to manage, one that precludes me from impacting the world far beyond my own immediate interests. Extrapolate that to the leader of a nation-state needing to care for all citizens equally. It is a literal impossibility. At its extreme, such natural self-interest may manifest as corruption, but for most managing that self-interest is simply one of the challenges that leaders must face.'
  ))

  blocks.push(textBlock(
    'Given that people are naturally self-focused, and that human rights are an essential aspect to a modern government system, I will focus on redesigning democracy as opposed to changing to a different form of government. By giving citizens direct influence over their laws and leaders we give them the greatest degree of control over their own well-being. Perhaps our redesign of democracy can extend the degree of self-control and agency afforded by the US government of today. The question is, how can we move the government decisions that influence us closer to the centers of our own circles?'
  ))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: ELEMENTS OF A BETTER DEMOCRACY
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Elements of a Better Democracy', 'h2'))

  blocks.push(textBlock(
    'One of the inherent flaws in modern democracies is the large size of contemporary nation-states. The bigger a group of people, the more removed those at the top will be from best serving some significant percentage of those at the bottom. There is too diverse a set of needs, values, beliefs, and affiliations for everyone to be properly taken care of. In the United States, this problem is exacerbated by a highly heterogeneous population. While there are many benefits to the \u201cmelting pot\u201d \u2014 social, genetic, and philosophical, to name a few \u2014 the very diversity that provides strength also makes it harder for each individual to be properly governed. In a perfect world our society would cater to each of us as a unique person with idiosyncratic needs, woven nicely into the larger social fabric. The reality of a nation with hundreds of millions of people is that the larger and more diverse it is, the less customized to individual needs and desires the experience of being a citizen will be.'
  ))

  blocks.push(textBlock('These ideas are built on four basic premises:', 'h3'))

  // Premise 1: Citizenship Benefits and Responsibilities
  const handsRef = await uploadImage('hands.jpg')
  blocks.push(imageBlock(handsRef, 'A heart being held by two hands'))

  blocks.push(textBlock('1. Citizenship Benefits and Responsibilities', 'h4'))

  blocks.push(textBlock(
    'Citizenship should provide major benefits and carry significant responsibilities. In the United States, the benefits of citizenship have never been more uncertain. We have the most extensive national security in the world, a clear benefit even if it is an order of magnitude larger than it needs to be. The recent adoption of \u201cObamacare\u201d begins to move us closer to our first-world brethren from a health and wellness perspective. Social security and other social welfare programs are under threat both financially and legislatively, possibly removing a key personal security perk from our lives.'
  ))

  blocks.push(textBlock(
    'However, our nation asks very little of us in return. Other than pay taxes, which are among the lowest in the wealthy first world, and follow the laws, which are among the most liberal and individual-freedoms-friendly for a large nation-state in human history, we have little responsibility to our nation, state, community, or fellow citizens.'
  ))

  blocks.push(textBlock(
    'Getting a lot for a little might seem like a good deal, but it is not good for our country nor for ourselves. From a pragmatic perspective, our low taxes contribute to what is now over $17 trillion in debt. Our general lack of other societal responsibilities not only contribute to that debt \u2014 they also give us a sense of entitlement. Feeling entitled can lead to selfish, lazy, and even anti-social behavior.'
  ))

  blocks.push(textBlock(
    'By injecting more citizen responsibility, or at least productive participation, into our democracy we can curb unhealthy individual and collective behaviors while increasing prosperity for everyone.'
  ))

  // Premise 2: Unifying Initiatives
  blocks.push(textBlock('2. Unifying Initiatives', 'h4'))

  const stalinRef = await uploadImage('stalin.jpg')
  blocks.push(imageBlockWithCaption(stalinRef, 'Josef Stalin', 'Josef Stalin famously instituted five-year plans, a model that saw the Soviet Union centralize and modernize at a prodigious rate. While these successes were admittedly reached through brutality and civil rights abuses, it is indisputable that by setting a broad agenda that strategically brings together many disparate elements of a nation for single purpose, profound change can be achieved.'))

  blocks.push(textBlock(
    'We need unifying initiatives to guide our government. From a philosophical perspective we already have these: the Declaration of Independence, the Constitution, and the Bill of Rights. However, on an operational level we do not. Every four years there is a new presidential election. Every two years we elect our representatives, every six, our senators and state governors. By the time any of these civil servants gets comfortable in office there is little time to think broadly; before long they need to worry about earning future votes to win the next election and maintain their position.'
  ))

  blocks.push(textBlock(
    'Each time there is a change it potentially stops and even reverses the initiatives instigated by the previous regime. If there were a list of initiatives that gave us mandates over longer periods of time, a decade, two decades, or even more, we could borrow some of the key executive benefits of monarchical or dictatorial regimes while maintaining a true democracy.'
  ))

  // Premise 3: Direct Relationship with Leaders and Laws
  blocks.push(textBlock('3. Direct Relationship with Leaders and Laws', 'h4'))

  blocks.push(textBlock(
    'Citizens should have a closer, more direct relationship with their leaders and laws. While the majority of residents of ancient Athens were likely not citizens, those who were had a direct relationship to the workings of their \u201cnational\u201d government. This is an ideal that gives people the greatest input into their government\u2019s functioning, necessarily putting the individual\u2019s rights and perspectives close to the decisions being made for and about them. It means participation.'
  ))

  const citizensRef = await uploadImage('citizens.jpg')
  blocks.push(imageBlock(citizensRef, 'Chart depicting the ratio of citizens participating in government: 1 in 2 in Ancient Athens, 1 in 10,000 in 1790 US, and 1 in 384,000 in 2014 US'))

  // Premise 4: Balance of Long-term and Short-term Planning
  blocks.push(textBlock('4. Balance of Long-term and Short-term Planning', 'h4'))

  const moonRef = await uploadImage('moon.jpg')
  blocks.push(imageBlockWithCaption(moonRef, 'An astronaut on the moon', 'What if an amendment to the U.S. Constitution required an audacious, strategic long-term goal that we would commit to achieving regardless of whatever else might happen? President John F. Kennedy tried this on an ad hoc basis and \u2014 seemingly beyond the bounds of reason \u2014 we found ourselves on the moon less than a decade later.'))

  blocks.push(textBlock(
    'Laws and leadership should have a proper balance of long-term and short-term planning. China\u2019s emphasis on long-term planning turned them into a global superpower around the turn of the 20th century. By contrast, for decades the US government has pursued plans that are painfully overbalanced toward short-term thinking. This is reflected in everything from our financial position to our energy policy. How can we shift to a model that values long-term planning in ways more similar to our Chinese friends?'
  ))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: ISSUES WITH THE LEGISLATURE
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Issues with the Legislature', 'h2'))

  blocks.push(textBlock(
    'Our democratic system features a separation of powers on the national level, split between executive (the President), legislative (Senate and House of Representatives) and judicial (Supreme Court) branches.'
  ))

  blocks.push(textBlock(
    'A nation ultimately needs one empowered decision maker. While theoretically it could be a group of people instead of an individual, historically this \u201cdecision by committee\u201d model has not worked well. The separation of powers is designed to allow the executive branch some appropriate degree of autonomous control. Each citizen votes individually on the President. The outcome of the vote is intended to represent the majority\u2019s choice.'
  ))

  blocks.push(textBlock(
    'Appointees to the Supreme Court are nominated by the President, confirmed by the Senate, and serve for life. The idea of a Supreme Court and life appointment are sensible. The existence and role of the Supreme Court\u2014determining the rule of law at the highest judicial level\u2014is an important foundational one. They can stay.'
  ))

  blocks.push(textBlock(
    'Which brings us to the problem of this particular solution: the legislative branch. Each state is represented by two Senators and a variable number of State Representatives, ranging from 53 (California) to just one (six states). This configuration goes back to the original U.S. Constitution, some 227 years ago.'
  ))

  const statesChartRef = await uploadImage('states-chart.jpg')
  blocks.push(imageBlock(statesChartRef, 'Chart showing states with wildly divergent representation: 1 representative each for several small states, yet 53 for California'))

  // Callout quote
  blocks.push(richBlock(
    [{ text: 'With legislators like Eliot Spitzer, John Edwards, and Charles Keating, who needs enemies?', marks: ['em'] }],
    'callout',
    []
  ))

  blocks.push(textBlock('Legislative Problems', 'h3'))

  blocks.push(textBlock('1. Lack of Qualifications', 'h4'))

  blocks.push(textBlock(
    'Senators and Representatives are not necessarily qualified to participate in making laws. Their only qualification is having been picked by constituencies made up of people who, for the most part, know them only from advertising and marketing and what their local paper chooses to write. So, the lawmakers may have questionable qualifications and the people who choose them are largely ignorant as to their efficacy for the position.'
  ))

  const legislatureRef = await uploadImage('legislature.jpg')
  blocks.push(imageBlockWithCaption(legislatureRef, '113th Congress composition chart: Lawyers 32.5%, Businesspeople 24.4%, Career Politicians 12%, Educators 9.6%, Medical Professionals 6%, and others', 'Composition of 113th Congress. Source: Washington Post'))

  blocks.push(textBlock('2. Re-election Incentives', 'h4'))

  blocks.push(textBlock(
    'Legislators are incentivized to focus their lawmaking efforts on decisions that will feed into their re-election. That means they may be rewarded to ignore questions of the whole for pandering to their few. While the few may need an advocate in the arena of the many, legislators must remain mindful of the bigger picture.'
  ))

  blocks.push(textBlock('3. Distance from Citizens', 'h4'))

  blocks.push(textBlock(
    'Legislators can put a great deal of space between the individual citizen and themselves. Remember the concentric circles I talked about? The random citizen is of very little practical concern to the legislator. They may genuinely intend to advocate for all of their people but it is only human nature that we privilege those to whom we have more connection. In the case of legislators, that can often be special interests and big companies as opposed to individual citizens.'
  ))

  const capitolRef = await uploadImage('capitol.jpg')
  blocks.push(imageBlock(capitolRef, 'US Capitol Building'))

  // Carpetbagging callout
  blocks.push(backgroundSection('gray', [
    textBlock('National politicians routinely \u201ccarpetbag\u201d: owning a residence in a district or state in which they do not reside in order to run for Congress or, particularly, the Senate. Prominent examples include Robert F. Kennedy (New York Senate, 1964); Rick Santorum (Pennsylvania 18th Congressional District, 1990); Hillary Rodham Clinton (New York Senate, 2000).'),
  ]))

  blocks.push(textBlock(
    'Over $3.3 billion dollars are spent on lobbying to influence policy in the United States each year (Source: Center for Responsive Politics). And less than 10% of bills introduced in the 112th U.S. Congress\u2014561 of 6,845\u2014actually passed into law (Source: Brookings).'
  ))

  blocks.push(textBlock(
    'Since 1964 the House of Representatives has boasted a re-election rate of over 90%. While serving as Senators and Representatives, our legislators spend substantial time and effort attempting to get re-elected in lieu of performing their duties.'
  ))

  blocks.push(textBlock(
    'There\u2019s a lot that is broken about this system, and that is only an overview that doesn\u2019t get into its more limited but far darker underbelly of scandals and graft.'
  ))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: THE DIGITAL SOLUTION
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('The Digital Solution', 'h2'))

  const phonesRef = await uploadImage('phones.jpg')
  blocks.push(imageBlockWithCaption(phonesRef, 'Different smartphones fanned out', 'As of January 2014, 58% of U.S. adults already own a smartphone.'))

  blocks.push(textBlock(
    'It all starts with the smartphone. This miraculous device gives us the power of a computer in our hand, pocket or purse at all times. It enables any citizen to receive information in and communicate out, both in real-time while running software applications far more powerful than those being run on desktop computers just a decade ago. The easy availability to such powerful, real-time technology empowers us to radically re-think each individual\u2019s role in our collective governance.'
  ))

  blocks.push(textBlock(
    'No longer is there a limitation of space and time to prevent our getting high-resolution information on our government and legislators. There is no barrier to our placing a secure, verified vote on a candidate or law from the comfort of our home. The majority of Americans now hold in our hand the power to do everything that our legislators do when they vote on a bill: read the text. Consider outside information. Engage in debate or conversation. Place the vote. It\u2019s no different from a use case perspective than how we use Facebook. The difference is, rather than our time being spent on pleasant conveniences we are able to influence our nation as the self-representational government that democracy purports to be.'
  ))

  blocks.push(textBlock(
    'We\u2019re not accustomed to thinking about having visibility into and knowledge of the inner workings of our nation, state, and locality, much less direct impact on decisions. But we can. And we should.'
  ))

  const flowIconsRef = await uploadImage('flow-icons.jpg')
  blocks.push(imageBlock(flowIconsRef, 'Flowchart showing how legislation could be voted on by being proposed by governments, then passed to citizens for voting through handheld devices'))

  // Proposal 1
  blocks.push(textBlock('Proposal 1: Expert Legislature', 'h3'))

  blocks.push(textBlock(
    'The current senators and representatives would all be removed and replaced with exceptional individuals chosen for their potential to contribute to an enlightened government. Economists, physicists, biologists. Experts in well-being, personality, healthy communities. Labor leaders. Structural engineers. Agriculturists. Basically, if you look at every Presidential cabinet role, and all of the different aspects of life that bills under current consideration touch, experts that pertain to all of those things would be represented.'
  ))

  blocks.push(textBlock(
    'So instead of the key qualification for participating being to influence voters and pacify lobbyists, our legislative branch would be filled with the brightest minds, the most insightful souls, and our leading experts. While the initial group would need some kind of blanket appointment \u2014 nominated by the president, confirmed by popular vote? \u2014 eventually they would stay or go based on their statistics: are they contributing to successful legislation?'
  ))

  // Proposal 2
  blocks.push(textBlock('Proposal 2: Professional Political Analysts', 'h3'))

  blocks.push(textBlock(
    'Independent of the government itself, a new profession of \u201canalysts\u201d would be required. Many of these would likely come from the current ranks of political commentators but would surely attract a new breed of personalities as well. Their role would be to represent a very specific position\u2014it could be as narrow as \u201cProtect the second amendment at all costs\u201d or as broad as \u201cAdvocate for individual liberties.\u201d They would review every bill, comment on it, and make a recommendation to vote for or against. Voters would \u201csubscribe\u201d to them.'
  ))

  // Proposal 3
  blocks.push(textBlock('Proposal 3: Direct Citizen Voting', 'h3'))

  blocks.push(textBlock(
    'Voting currently done by legislators would instead be conducted directly by citizens. People could choose to use their existing smartphone, or be issued a very basic device for just the purpose of democratic participation. Each day, or week, or whatever the correct frequency is, citizens would receive a digital packet to review. Each bill would include a summary and the recommendation of all the analysts they subscribe to. Drilling in would let them see the entire bill with annotations from their analysts, or longer analysis about the bill. Citizens would have, at their fingertips, everything required to vote on their own behalf.'
  ))

  blocks.push(richBlock(
    [{ text: 'This is true democracy. The abstractions in the current process that leave us with a stable of professional politicians sporting a wide variety of qualifications is a relic of the analog world. Well, thanks to digital technology, that system is redundant.', marks: ['strong'] }],
    'normal',
    []
  ))

  const leadersRef = await uploadImage('leaders.jpg')
  blocks.push(imageBlockWithCaption(leadersRef, 'Photographs of Stephen Hawking, Carl Sagan, Clara Barton, and Henry Ford', 'Would our legislature have benefited from Stephen Hawking participating? Carl Sagan? Clara Barton? Henry Ford? We should empower leaders who actually lead.'))

  // ── Handheld Voting System ──
  blocks.push(textBlock('Handheld Voting System', 'h3'))

  blocks.push(textBlock(
    'While a direct voting system is easily illustrated via the various screens that follow, the totality of the infrastructure would be immense. Such a system would likely fall under the auspices of the United States Department of Justice.'
  ))

  // Voting screenshots: Bill Introduction (p1.1 + p1.2)
  const p11Ref = await uploadImage('voting/screenshots/p1.1.jpg')
  const p12Ref = await uploadImage('voting/screenshots/p1.2.jpg')
  if (p11Ref) blocks.push(imageBlock(p11Ref, 'Voting system: Bill introduction screen', 'medium'))
  if (p12Ref) blocks.push(imageBlock(p12Ref, 'Voting system: Bill introduction detail', 'medium'))

  blocks.push(richBlock([
    { text: '1. Bill Introduction: ', marks: ['strong'] },
    { text: 'Citizens would periodically receive a bill to consider. Along with an overview of the bill, the first screen would display a graph showing the opinions of a personalized group of analysts, while \u201cautomagically\u201d mapping each voter\u2019s personal preferences to the content.', marks: [] },
  ]))

  // Voting screenshots: Bill Overview (p2.1 + p2.2)
  const p21Ref = await uploadImage('voting/screenshots/p2.1.jpg')
  const p22Ref = await uploadImage('voting/screenshots/p2.2.jpg')
  if (p21Ref) blocks.push(imageBlock(p21Ref, 'Voting system: Bill overview screen', 'medium'))
  if (p22Ref) blocks.push(imageBlock(p22Ref, 'Voting system: Bill overview detail', 'medium'))

  blocks.push(richBlock([
    { text: '2. Bill Overview: ', marks: ['strong'] },
    { text: 'Protecting the integrity of the vote is a first-order priority, requiring the latest in identity recognition software. This technology could also help customize the delivery and structure of information depending on its interpretation of a voter\u2019s mood, attention, or other factors.', marks: [] },
  ]))

  // Voting screenshots: Simplified Overview (p3.1 + p3.2)
  const p31Ref = await uploadImage('voting/screenshots/p3.1.jpg')
  const p32Ref = await uploadImage('voting/screenshots/p3.2.jpg')
  if (p31Ref) blocks.push(imageBlock(p31Ref, 'Voting system: Simplified overview', 'medium'))
  if (p32Ref) blocks.push(imageBlock(p32Ref, 'Voting system: Simplified overview detail', 'medium'))

  blocks.push(richBlock([
    { text: '3. Simplified Overview: ', marks: ['strong'] },
    { text: 'To further encourage voters\u2019 critical thinking, the system would provide an interactive table of contents along with key statistics and graphs to aid understanding of essential aspects of the legislation.', marks: [] },
  ]))

  // Face detect image
  const faceDetectRef = await uploadImage('voting/face-detect.jpg')
  if (faceDetectRef) blocks.push(imageBlock(faceDetectRef, 'Face detection technology for voter identity verification', 'medium'))

  // Voting screenshots: Analyst's Response (p4.1 + p4.2)
  const p41Ref = await uploadImage('voting/screenshots/p4.1.jpg')
  const p42Ref = await uploadImage('voting/screenshots/p4.2.jpg')
  if (p41Ref) blocks.push(imageBlock(p41Ref, 'Voting system: Analyst response', 'medium'))
  if (p42Ref) blocks.push(imageBlock(p42Ref, 'Voting system: Analyst response detail', 'medium'))

  blocks.push(richBlock([
    { text: '4. Analyst\u2019s Response: ', marks: ['strong'] },
    { text: 'While most citizens might be unable to read the entirety of bills, support would come from a new breed of political analysts. These individuals and organizations would read, interpret, and make recommendations on legislation based on their specific platforms and interests.', marks: [] },
  ]))

  // Voting screenshots: Vote on the Bill (p5.ui + p5.phone)
  const p5uiRef = await uploadImage('voting/p5.ui.jpg')
  const p5phoneRef = await uploadImage('voting/p5.phone.jpg')
  if (p5uiRef) blocks.push(imageBlock(p5uiRef, 'Voting system: Vote screen', 'medium'))
  if (p5phoneRef) blocks.push(imageBlock(p5phoneRef, 'Voting system: Vote on phone', 'medium'))

  blocks.push(richBlock([
    { text: '5. Vote on the Bill: ', marks: ['strong'] },
    { text: 'Voting time! The citizens would input their votes and let their voices be heard. The democratic process, as close to the ideal intention of this system, could be possible in a large, modern nation-state.', marks: [] },
  ]))

  // Conclusion
  blocks.push(textBlock('Conclusion', 'h3'))

  blocks.push(textBlock(
    'Like many radical ideas, it may be seductive to focus on some vulnerability in it and try to pull it apart. Go ahead. This probably isn\u2019t the exact right idea. But it\u2019s a start down the right path. The digital world is nothing like the world that came before it, and we deserve it to ourselves and the future to rethink everything. Regardless of any issues with this system, I challenge you to make the case that, in their respective totalities, the current system is better than what\u2019s proposed here. It isn\u2019t.'
  ))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHOR & CONTRIBUTORS
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Author & Contributors', 'h2'))

  // Author: Dirk Knemeyer
  const dirkRef = await uploadImage('https://www.goinvo.com/old/images/people/dirk/dk_nofilter.jpg')
  if (dirkRef) blocks.push(imageBlock(dirkRef, 'Dirk Knemeyer', 'medium'))

  blocks.push(richBlock([
    { text: 'Dirk Knemeyer', marks: ['strong'] },
  ], 'h3', []))

  blocks.push(textBlock(
    'Dirk Knemeyer is a social futurist and a founder of GoInvo. He has provided consulting, design, and technology to some of the best companies in the world including Apple, Microsoft, Oracle, PayPal, and Shutterfly. Dirk\u2019s writings have been published in places like Business Week and Core77. He has keynoted conferences in Europe and the U.S. and spoken at venues like TEDx, Humanity+, and South by Southwest. Dirk has participated on 15 boards in industries including healthcare, publishing, and education. He holds a Master of Arts in Popular Culture from Bowling Green State University and a Bachelor of Arts in English from The University of Toledo.'
  ))

  // Contributors
  blocks.push(textBlock('Contributors', 'h3'))

  const emilyRef = await uploadImage('contrib/emily.jpg')
  if (emilyRef) blocks.push(imageBlock(emilyRef, 'Emily Twaddell', 'small'))
  blocks.push(richBlock([
    { text: 'Emily Twaddell', marks: ['strong'] },
    { text: ' \u2014 Editor', marks: [] },
  ]))

  const basecraftRef = await uploadImage('contrib/basecraft.jpg')
  if (basecraftRef) blocks.push(imageBlock(basecraftRef, 'Basecraft', 'small'))
  blocks.push(richBlock([
    { text: 'Basecraft', marks: ['strong'] },
    { text: ' \u2014 Design', marks: [] },
  ]))

  const juhanRef = await uploadImage('contrib/juhan.jpg')
  if (juhanRef) blocks.push(imageBlock(juhanRef, 'Juhan Sonin', 'small'))
  blocks.push(richBlock([
    { text: 'Juhan Sonin', marks: ['strong'] },
    { text: ' \u2014 Voting System UIs', marks: [] },
  ]))

  const noelRef = await uploadImage('contrib/noel.jpg')
  if (noelRef) blocks.push(imageBlock(noelRef, 'Noel Fort\u00e9', 'small'))
  blocks.push(richBlock([
    { text: 'Noel Fort\u00e9', marks: ['strong'] },
    { text: ' \u2014 Online Design', marks: [] },
  ]))

  const brianRef = await uploadImage('contrib/brian.jpg')
  if (brianRef) blocks.push(imageBlock(brianRef, 'Brian Liston', 'small'))
  blocks.push(richBlock([
    { text: 'Brian Liston', marks: ['strong'] },
    { text: ' \u2014 Print & .epub Design', marks: [] },
  ]))

  const hermesRef = await uploadImage('contrib/hermes.png')
  if (hermesRef) blocks.push(imageBlock(hermesRef, 'Michael Hermes', 'small'))
  blocks.push(richBlock([
    { text: 'Michael Hermes', marks: ['strong'] },
    { text: ' \u2014 Audio Engineer', marks: [] },
  ]))

  // Filter out any null blocks (from failed image uploads)
  return blocks.filter(Boolean)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Redesign Democracy Migration ===')
  console.log(`Project: ${PROJECT_ID}, Dataset: ${DATASET}`)
  console.log(`Dry run: ${DRY_RUN}`)
  console.log()

  // 1. Find the existing document
  const query = `*[_type == "feature" && slug.current == "redesign-democracy"][0]`
  const doc = await client.fetch(query)

  if (!doc) {
    console.error('No feature document found with slug "redesign-democracy".')
    console.error('Create the document in Sanity Studio first, then re-run this script.')
    process.exit(1)
  }

  console.log(`Found document: ${doc._id} (rev: ${doc._rev})`)
  console.log()

  // 2. Upload hero image
  console.log('--- Uploading hero image ---')
  const heroRef = await uploadImage('phones.jpg')
  console.log()

  // 3. Build all Portable Text content
  console.log('--- Building Portable Text content ---')
  const content = await buildContent()
  console.log()
  console.log(`Total blocks: ${content.length}`)
  console.log(`Total images uploaded: ${uploadCache.size}`)

  if (DRY_RUN) {
    console.log()
    console.log('--- DRY RUN: Content preview ---')
    for (const block of content) {
      if (block._type === 'block') {
        const text = block.children?.map(c => c.text).join('') || ''
        const preview = text.length > 80 ? text.slice(0, 80) + '...' : text
        console.log(`  [${block.style}] ${preview}`)
      } else if (block._type === 'image') {
        console.log(`  [image] alt="${block.alt}" size=${block.size}`)
      } else if (block._type === 'quote') {
        console.log(`  [quote] "${block.text?.slice(0, 60)}..." — ${block.author}`)
      } else if (block._type === 'divider') {
        console.log(`  [divider]`)
      } else if (block._type === 'backgroundSection') {
        const innerCount = block.content?.length || 0
        console.log(`  [backgroundSection color=${block.color}] ${innerCount} inner blocks`)
      } else {
        console.log(`  [${block._type}]`)
      }
    }
    console.log()
    console.log('Dry run complete. No changes were written to Sanity.')
    console.log('Run without --dry-run to apply changes.')
    return
  }

  // 4. Patch the document
  console.log('--- Patching Sanity document ---')
  const patch = client.patch(doc._id)

  // Set the content
  patch.set({ content })

  // Set hero image if uploaded
  if (heroRef) {
    patch.set({
      heroImage: {
        _type: 'image',
        asset: { _type: 'reference', _ref: heroRef },
      },
    })
  }

  const result = await patch.commit()
  console.log(`Patched document ${result._id} (new rev: ${result._rev})`)
  console.log()
  console.log('Migration complete!')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
