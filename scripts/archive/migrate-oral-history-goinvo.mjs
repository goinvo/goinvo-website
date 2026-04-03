/**
 * Migrate oral-history-goinvo content to Sanity.
 *
 * This page is an interview-style article with speaker quotes,
 * sidebars with images, and section headers. The content is organized
 * into 5 parts: Origins, Rise Silicon Valley, Interesting Times,
 * Rise Boston, and Today and Tomorrow, followed by Interview Participants.
 *
 * Speaker quotes are rendered as paragraphs with bold speaker name/initials
 * prefix (e.g., "**DK:** The quote text here...").
 *
 * Sidebars (green/gray background) are rendered as backgroundSection('gray')
 * blocks, some with images.
 *
 * Section headers (dark teal background with part numbers) are rendered as
 * sectionTitle h2 blocks.
 *
 * Usage:
 *   node scripts/migrate-oral-history-goinvo.mjs
 *   node scripts/migrate-oral-history-goinvo.mjs --dry-run
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const CDN = 'https://www.goinvo.com'
const dryRun = process.argv.includes('--dry-run')
const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

// ---------------------------------------------------------------------------
// Block helpers
// ---------------------------------------------------------------------------

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

function linkMark(href, blank = true) {
  const markKey = key()
  return {
    markKey,
    markDef: { _type: 'link', _key: markKey, href, blank },
  }
}

function dividerBlock() {
  return { _type: 'divider', _key: key(), style: 'default' }
}

function backgroundSection(color, innerBlocks) {
  return {
    _type: 'backgroundSection',
    _key: key(),
    color,
    content: innerBlocks,
  }
}

// Speaker quote: bold initials/name + quote text, with optional inline links
// Returns a richBlock with bold prefix
function speakerQuote(speaker, textParts, markDefs = []) {
  const children = [
    { text: speaker + ' ', marks: ['strong'] },
    ...textParts,
  ]
  return richBlock(children, 'normal', markDefs)
}

// Simple speaker quote with plain text (no links)
function simpleSpeakerQuote(speaker, text) {
  return richBlock([
    { text: speaker + ' ', marks: ['strong'] },
    { text, marks: [] },
  ])
}

// ---------------------------------------------------------------------------
// Image definitions
// ---------------------------------------------------------------------------

const LEGACY = 'https://www.goinvo.com/old/images/features/an-oral-history'

const IMAGES = [
  // Section 1 sidebars
  { url: `${LEGACY}/3_boxes_arrows_logo.gif`, filename: 'boxes-arrows-logo.gif', alt: 'Boxes and Arrows logo' },
  { url: `${LEGACY}/4-adobe_logo.gif`, filename: 'adobe-logo.gif', alt: 'Adobe logo' },
  { url: `${LEGACY}/5-jakob_neilson.jpg`, filename: 'jakob-nielsen.jpg', alt: 'Jakob Nielsen' },
  { url: `${LEGACY}/6-bob_baxley.jpg`, filename: 'bob-baxley.jpg', alt: 'Bob Baxley' },
  { url: `${LEGACY}/7-w3c_logo.png`, filename: 'w3c-logo.png', alt: 'W3C logo - Syntex logo donated to W3C' },
  { url: `${LEGACY}/8-business_card_small.png`, filename: 'business-card.png', alt: 'GoInvo business card' },
  { url: `${LEGACY}/9-dave_bedingfield.jpg`, filename: 'dave-bedingfield.jpg', alt: 'Dave Bedingfield' },
  // Section 2 sidebars
  { url: `${LEGACY}/1-agile_logo.png`, filename: 'agile-logo.png', alt: 'Agile (Agiliance) logo' },
  { url: `${LEGACY}/3-invo_first_studio.jpg`, filename: 'invo-first-studio.jpg', alt: 'First GoInvo studio in Santa Clara' },
  { url: `${LEGACY}/6-wine.jpg`, filename: 'wine-celebration.jpg', alt: 'Team celebrating at Lafayette studio' },
  { url: `${LEGACY}/9-box_exercise.jpg`, filename: 'box-exercise.jpg', alt: 'GoInvo Box Exercise' },
  { url: `${LEGACY}/12-spivot.jpg`, filename: 'spivot.jpg', alt: 'Spivot product' },
  { url: `${LEGACY}/13-kifer_studio.jpg`, filename: 'kifer-studio.jpg', alt: 'Kifer Road studio in Sunnyvale' },
  // Section 3 sidebars
  { url: `${LEGACY}/1-mcafee_box.png`, filename: 'mcafee-box.png', alt: 'McAfee project' },
  { url: `${LEGACY}/2-seascape_resort.jpg`, filename: 'seascape-resort.jpg', alt: 'GoInvo retreat at Seascape Resort' },
  { url: `${LEGACY}/3-time_cover.jpg`, filename: 'time-cover-2008.jpg', alt: '2008 economic crisis Time cover' },
  { url: `${LEGACY}/4-sean_parker.jpg`, filename: 'sean-parker.jpg', alt: 'Sean Parker' },
  { url: `${LEGACY}/5-andreis_bookshelf.png`, filename: 'andreis-bookshelf.png', alt: "Andrei's bookshelf at the studio" },
  // Section 4 sidebars
  { url: `${LEGACY}/11-eric_benoit.jpg`, filename: 'eric-benoit.jpg', alt: 'Eric Benoit' },
  { url: `${LEGACY}/14-jon_follett.jpg`, filename: 'jon-follett.jpg', alt: 'Jonathan Follett' },
  // Section header images
  { url: `${LEGACY}/andrei-sqr.jpg`, filename: 'andrei-sqr.jpg', alt: 'Andrei Herasimchuk' },
  { url: `${LEGACY}/dirk-sqr.jpg`, filename: 'dirk-sqr.jpg', alt: 'Dirk Knemeyer' },
]

// ---------------------------------------------------------------------------
// Build content blocks
// ---------------------------------------------------------------------------

async function buildContent() {
  // Upload all images
  console.log('  Uploading images...')
  const imgMap = {}
  for (const img of IMAGES) {
    const result = await uploadImage(img.url, img.filename)
    if (result) {
      imgMap[img.filename] = { ref: result, alt: img.alt }
      console.log(`    Uploaded: ${img.filename}`)
    } else {
      console.log(`    FAILED: ${img.filename}`)
    }
  }

  const blocks = []

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBTITLE / INTRO
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(richBlock([
    { text: 'To celebrate our 10 year anniversary some of Invo\u2019s leaders past and present came together to remember the ups and downs of our studio.', marks: ['em'] },
  ]))

  // Table of Contents
  const toc1 = linkMark('#origins', false)
  const toc2 = linkMark('#silicon-valley', false)
  const toc3 = linkMark('#interesting-times', false)
  const toc4 = linkMark('#boston', false)
  const toc5 = linkMark('#today-tomorrow', false)

  blocks.push(richBlock([
    { text: '1. Origins', marks: [toc1.markKey] },
    { text: '  ', marks: [] },
    { text: '2. Rise, Silicon Valley', marks: [toc2.markKey] },
    { text: '  ', marks: [] },
    { text: '3. Interesting Times', marks: [toc3.markKey] },
    { text: '  ', marks: [] },
    { text: '4. Rise, Boston', marks: [toc4.markKey] },
    { text: '  ', marks: [] },
    { text: '5. Today, and Tomorrow', marks: [toc5.markKey] },
  ], 'normal', [toc1.markDef, toc2.markDef, toc3.markDef, toc4.markDef, toc5.markDef]))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: ORIGINS
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 1: Origins', 'sectionTitle'))

  blocks.push(textBlock('Andrei Herasimchuk and Dirk Knemeyer incorporated GoInvo in Palo Alto, California, on June 29, 2004.'))

  // DK: So it all started with a Boxes and Arrows article.
  const link1 = linkMark('http://boxesandarrows.com/information-design-the-understanding-discipline/')
  blocks.push(speakerQuote('Dirk Knemeyer:', [
    { text: 'So it all started with a ', marks: [] },
    { text: 'Boxes and Arrows article.', marks: [link1.markKey] },
  ], [link1.markDef]))

  // AMH: I haven't read that article in a while...
  blocks.push(simpleSpeakerQuote('Andrei Herasimchuk:', 'I haven\u2019t read that article in a while, and re-reading my comments on it, I\u2019m surprised at how much I still agree with my younger self! In fact, many of my concerns about titles, job descriptions, and confusion over design and the tech sector have come to fruition. Having said that, I know I come off as overly direct in the way I speak and write, but I really was attempting to be as diplomatic as I knew how in my comments to that article.'))

  // DK: Yeah, there is still a lot of truth there...
  blocks.push(simpleSpeakerQuote('DK:', 'Yeah, there is still a lot of truth there. It\u2019s funny, because I don\u2019t generally like rough feedback and critiques, but I knew that I had the opportunity to learn a lot from engaging you, so I did. At one point you told me that usually people didn\u2019t engage because of your style, but the learning was worth it for me.'))

  // AMH: And the fact that you responded in a diplomatic manner...
  const link2 = linkMark('http://www.adobe.com/products/photoshop-lightroom.html')
  blocks.push(speakerQuote('AMH:', [
    { text: 'And the fact that you responded in a diplomatic manner earned you a lot of points with me. I was back working at Adobe in 2003 on Project Shadowland (which would later become ', marks: [] },
    { text: 'Adobe Photoshop Lightroom', marks: [link2.markKey] },
    { text: ') and I was in an environment with Adobe\u2019s engineers where everyone was always direct and blunt with each other. It was a manner of working that I tend to prefer, as the work you get done is of a high caliber, but I often forget it\u2019s not for everyone.', marks: [] },
  ], [link2.markDef]))

  // DK: True, but it is certainly common...
  const link3 = linkMark('http://www.designbyfire.com/')
  blocks.push(speakerQuote('DK:', [
    { text: 'True, but it is certainly common in the engineering community. Not so much among designers though! :-) It is a little-known fact that when you first came up with the ', marks: [] },
    { text: '\u201CDesign by Fire\u201D', marks: [link3.markKey] },
    { text: ' concept for a brand it was loosely you, me, Ben Listwon, and Bob Baxley doing something undefined around it. I remember a call where the three of you were at your house in Sunnyvale and I was at my house in Toledo, Ohio and we were talking about that. Nothing really happened with it while we were together, but you took off with Design by Fire and it was really important in the global design conversation for a while.', marks: [] },
  ], [link3.markDef]))

  // AMH: I was in the midst of doing a lot of product research...
  const link4 = linkMark('http://www.movabletype.com/')
  const link5 = linkMark('http://www.designbyfire.com/?p=5')
  const link6 = linkMark('http://www.designbyfire.com/?p=6')
  const link7 = linkMark('http://www.designbyfire.com/?p=4')
  blocks.push(speakerQuote('AMH:', [
    { text: 'I was in the midst of doing a lot of product research at Adobe, not the least of which was trying to understand better how blogging tools, databases, and web technologies worked to see what could work in Shadowland. I had been noodling with a Design by Fire logo and concepts for content focused on digital design trends. Initially, I was thinking we could write and publish a design book and have a digital component with it. Ultimately, I just went ahead and built a blog with ', marks: [] },
    { text: 'MovableType', marks: [link4.markKey] },
    { text: ' tools. Near the end of 2003, I hit Publish without much thought other than, \u201CI have to learn how these web tools work.\u201D That, and I had a bunch of things I wanted to say to the world. In the first few months of 2004, I went on a tear writing and publishing all sorts of material, getting as much attention as I could from the early design bloggers who had already paved the road on the Internet. I used my Adobe background as a quick means to gain credibility within the online design community, along with a few contests, giving away signed Photoshop and Illustrator boxes. A few key articles came out of that period, ', marks: [] },
    { text: 'Gurus v. Bloggers', marks: [link5.markKey] },
    { text: ', ', marks: [] },
    { text: 'I would RTFM if there was a FM to FR', marks: [link6.markKey] },
    { text: ', and the biggie, ', marks: [] },
    { text: 'Design Eye for Usability Guy', marks: [link7.markKey] },
    { text: '.', marks: [] },
  ], [link4.markDef, link5.markDef, link6.markDef, link7.markDef]))

  // DK: Design Eye for the Usability Guy was definitely the high-water mark...
  const link8 = linkMark('http://www.uxmatters.com/')
  const link9 = linkMark('http://www.digital-web.com/')
  blocks.push(speakerQuote('DK:', [
    { text: 'Design Eye for the Usability Guy was definitely the high-water mark. Unlike you, I didn\u2019t have a center of gravity for my writing. A bunch of stuff was hitting through my employer\u2019s website, but I was also making the rounds on the popular online publications like Boxes and Arrows, ', marks: [] },
    { text: 'UXmatters', marks: [link8.markKey] },
    { text: ', and ', marks: [] },
    { text: 'Digital Web', marks: [link9.markKey] },
    { text: '. I was starting to speak at conferences quite a bit, too, and participate on different boards. I was learning and exploring all at once, and my ability to communicate well in the process really brought up my profile.', marks: [] },
  ], [link8.markDef, link9.markDef]))

  // AMH: I was doing something similar...
  blocks.push(simpleSpeakerQuote('AMH:', 'I was doing something similar, in that I was learning publicly what worked and what didn\u2019t. How to write, how to be snarky, how to build MT templates, how PHP, Apache, and other web tech worked. I was learning completely out in the open, which is partly the ethos of Design by Fire. The brand was a play on Trial by Fire, and evokes a passionate fire within sensibility, both things I was deeply immersed in at that time.'))

  // Sidebar: Boxes & Arrows
  if (imgMap['boxes-arrows-logo.gif']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['boxes-arrows-logo.gif'].ref, 'Boxes and Arrows logo', 'medium'),
      textBlock('The venerable Boxes & Arrows was one of the first online UX publications, a favourite of the early intelligentsia.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The venerable Boxes & Arrows was one of the first online UX publications, a favourite of the early intelligentsia.'),
    ]))
  }

  // DK: While the blog finally quieted the influence certainly continued...
  const link10 = linkMark('http://www.designbyfire.nl/')
  blocks.push(speakerQuote('DK:', [
    { text: 'While the blog finally quieted the influence certainly continued. A few years later they ', marks: [] },
    { text: 'even started a conference around you/the idea', marks: [link10.markKey] },
    { text: ' which I think is about the greatest compliment for one\u2019s ideas. At some point when we were just talking about design theory I told you about my desire to create a design studio. I actually don\u2019t even remember doing it, but I was sharing that idea with a lot of people at the time. Anyway, sometime later my employer was reneging on a variety of agreements around my compensation and an equity position in the firm. So I was ready to do something else. Then, out of the blue you asked me if I wanted to do the design studio I talked about, and do it together with you. So we did.', marks: [] },
  ], [link10.markDef]))

  // AMH: Yes. Something that was going on for me...
  blocks.push(simpleSpeakerQuote('AMH:', 'Yes. Something that was going on for me at the time was that I was having trouble being back at Adobe but not being a part of the design team I had helped to create. I felt too much like an outsider and was somewhat unhappy with my role there. After two years doing my best to help the Shadowland project, I was still unable to find a satisfying role within the company. So, I asked you about starting a design company, since you had brought it up multiple times in email exchanges and phone conversations.'))

  // Sidebar: Adobe
  if (imgMap['adobe-logo.gif']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['adobe-logo.gif'].ref, 'Adobe logo', 'medium'),
      textBlock('Andrei dropped out of Amherst College in 1990 to join Specular International, an early digital graphics company, as a founding member. In 1995 he left to join Adobe as their first interface designer. Andrei envisioned the creative strategy that resulted in the Adobe Creative Suite and built the Adobe design team from the ground up. After leaving Adobe for a few years to work on startups, Andrei returned in 2002 to serve as the project lead for Lightroom.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Andrei dropped out of Amherst College in 1990 to join Specular International, an early digital graphics company, as a founding member. In 1995 he left to join Adobe as their first interface designer. Andrei envisioned the creative strategy that resulted in the Adobe Creative Suite and built the Adobe design team from the ground up. After leaving Adobe for a few years to work on startups, Andrei returned in 2002 to serve as the project lead for Lightroom.'),
    ]))
  }

  // DK: And don't forget that Bob Baxley was involved...
  blocks.push(simpleSpeakerQuote('DK:', 'And don\u2019t forget that Bob Baxley was involved with us on it for about five minutes! I remember the first time I flew out to meet with you and Bob. I think it was May of 2004. We had already decided to move forward\u2014never having met!\u2014and it was time to figure out the identity and start really planning. We had talked about the name Syntex Design, which I think you liked more than I did. But along with Bob and your wife, Donna Driscoll, we came up with GoInvo. That\u2019s one of the three things I will never forget from that trip, sitting in the studio in your backyard and hammering through a naming exercise. The other two things are y\u2019all driving me up and down the peninsula introducing me to Silicon Valley, and when my plane was flying into SFO. I had never been to California, and I remember looking out the window as the plane was coming in and thinking, \u201CHey, it\u2019s the Pacific Ocean!\u201D (I learned later that it was actually San Francisco Bay.) It was thrilling to be flying in, knowing we were going to start something that I was so excited and optimistic about.'))

  // AMH: Yeah, Bob decided he wasn't ready...
  blocks.push(simpleSpeakerQuote('AMH:', 'Yeah, Bob decided he wasn\u2019t ready for a startup gig, and lucky for him, he joined Apple right before the stock took off. So he did well enough for himself.'))

  // Sidebar: Jakob Nielsen
  const link11 = linkMark('http://www.digital-web.com/articles/end_of_usability_culture/')
  if (imgMap['jakob-nielsen.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['jakob-nielsen.jpg'].ref, 'Jakob Nielsen', 'medium'),
      richBlock([
        { text: '\u201CUsability Guy\u201D Jakob Nielsen was the premier thought leader in UX-related disciplines prior to the emergence of Jeffrey Zeldman. Dirk predicted the decline of Nielsen and his left-brained approach to the Internet with the controversial ', marks: [] },
        { text: 'The End of Usability Culture', marks: [link11.markKey] },
        { text: '.', marks: [] },
      ], 'normal', [link11.markDef]),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      richBlock([
        { text: '\u201CUsability Guy\u201D Jakob Nielsen was the premier thought leader in UX-related disciplines prior to the emergence of Jeffrey Zeldman. Dirk predicted the decline of Nielsen and his left-brained approach to the Internet with the controversial ', marks: [] },
        { text: 'The End of Usability Culture', marks: [link11.markKey] },
        { text: '.', marks: [] },
      ], 'normal', [link11.markDef]),
    ]))
  }

  // DK: Of course, I spent the first year in Boston...
  blocks.push(simpleSpeakerQuote('DK:', 'Of course, I spent the first year in Boston instead of Silicon Valley. It didn\u2019t make a whole lot of sense from a business perspective, but my girlfriend was there and life is all about priorities, right? Actually, at the time I saw it as an asset, because we could put both Silicon Valley and Boston on our website. This was before working remotely was common, so there was a certain cachet in having multiple locations, although in a perfect world I would have just been in Silicon Valley from the beginning.'))

  // AMH: That first year was difficult for me...
  blocks.push(simpleSpeakerQuote('AMH:', 'That first year was difficult for me. I had never worked solo in my career up to that point. Being on my own and trying to figure it all out while you were remote was something I had a rough time doing.'))

  // DK: Yeah, the first six months were especially tough sledding...
  const link12 = linkMark('http://www.gsb.stanford.edu/')
  blocks.push(speakerQuote('DK:', [
    { text: 'Yeah, the first six months were especially tough sledding. We had a couple of really small projects\u2014under $10,000\u2014and then the ', marks: [] },
    { text: 'Stanford', marks: [link12.markKey] },
    { text: ' project that was from one of Bob\u2019s connections. But even that was only a $15K\u2019er. Thinking back, it is remarkable we were able to attract work and get momentum. We both drew a lot of attention in the digital design community, and you had a number of relationships in Silicon Valley. But neither of us were really selling.', marks: [] },
  ], [link12.markDef]))

  // AMH: Selling was something I still hadn't gotten the hang of...
  blocks.push(simpleSpeakerQuote('AMH:', 'Selling was something I still hadn\u2019t gotten the hang of at all. I knew how to sell software, and I had done that with Specular, but I had never dealt with selling services or myself in a services capacity. It was all brand new to me, and the more I learned about it, the more I was glad that you had a real background in this area. I learned the hard way, in those early months of GoInvo, that I\u2019m a horrible salesman.'))

  // Sidebar: Bob Baxley
  const link13 = linkMark('http://www.amazon.com/Making-Web-Work-Designing-Applications/dp/0735711968')
  if (imgMap['bob-baxley.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['bob-baxley.jpg'].ref, 'Bob Baxley', 'medium'),
      richBlock([
        { text: 'Bob Baxley authored one of the first books on interaction design, \u201C', marks: [] },
        { text: 'Making the Web Work', marks: [link13.markKey] },
        { text: '\u201D. After noodling around at Invo for a few months he moved on to Director-level design roles at Yahoo! and then Apple, where he oversaw design for Apple.com. Today Bob is Head of Product Design & Research at Pinterest.', marks: [] },
      ], 'normal', [link13.markDef]),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      richBlock([
        { text: 'Bob Baxley authored one of the first books on interaction design, \u201C', marks: [] },
        { text: 'Making the Web Work', marks: [link13.markKey] },
        { text: '\u201D. After noodling around at Invo for a few months he moved on to Director-level design roles at Yahoo! and then Apple, where he oversaw design for Apple.com. Today Bob is Head of Product Design & Research at Pinterest.', marks: [] },
      ], 'normal', [link13.markDef]),
    ]))
  }

  // DK: Nah, just a creator at heart! So, the big breakthrough...
  const link14 = linkMark('http://en.wikipedia.org/wiki/Lou_Montulli')
  const link15 = linkMark('http://en.wikipedia.org/wiki/Netscape')
  const link16 = linkMark('http://en.wikipedia.org/wiki/James_H._Clark')
  blocks.push(speakerQuote('DK:', [
    { text: 'Nah, just a creator at heart! So, the big breakthrough for us was the Memory Matrix project. That came in through your friend ', marks: [] },
    { text: 'Lou Montulli', marks: [link14.markKey] },
    { text: ', one of the original ', marks: [] },
    { text: 'Netscape', marks: [link15.markKey] },
    { text: ' engineers. Lou\u2019s company was being funded by ', marks: [] },
    { text: 'Jim Clark', marks: [link16.markKey] },
    { text: ', so Lou had real money backing him.', marks: [] },
  ], [link14.markDef, link15.markDef, link16.markDef]))

  // AMH: I remember meeting with Lou, Alex, Jeff, Jason, and Garrett...
  blocks.push(simpleSpeakerQuote('AMH:', 'I remember meeting with Lou, Alex, Jeff, Jason, and Garrett at Alex\u2019s house in Palo Alto. Alex was also one of the first Netscape engineers. Initially, Lou and Alex wanted me to join them, but I was committed to GoInvo. As much as I liked all of those guys, I really wanted to build a company I had a stake in as a founder.'))

  // Sidebar: W3C logo
  if (imgMap['w3c-logo.png']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['w3c-logo.png'].ref, 'W3C logo - Syntex logo donated to W3C', 'medium'),
      textBlock('Andrei\u2019s logo design for Syntex was later donated to the W3C.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Andrei\u2019s logo design for Syntex was later donated to the W3C.'),
    ]))
  }

  // DK: Yeah we were both ready to run our own thing...
  const link17 = linkMark('https://twitter.com/dbedingfield')
  blocks.push(speakerQuote('DK:', [
    { text: 'Yeah we were both ready to run our own thing at that point. Memory Matrix really did so much for us. Along with being a big chunk of cash it connected us to new people who would become future clients, and it gave us the opportunity to start bringing really good people into the fold. That was the first time we worked with ', marks: [] },
    { text: 'Dave Bedingfield', marks: [link17.markKey] },
    { text: ', and he went on to be, in my mind, our most important resource in the history of the Silicon Valley studio.', marks: [] },
  ], [link17.markDef]))

  // AMH: Bedingfield was one of our secret weapons...
  const link18 = linkMark('http://www.shauninman.com/pendium/')
  const link19 = linkMark('https://www.scad.edu/')
  blocks.push(speakerQuote('AMH:', [
    { text: 'Bedingfield was one of our secret weapons. I had reached out to ', marks: [] },
    { text: 'Shaun Inman', marks: [link18.markKey] },
    { text: ' to see if he could help us with building a Flash prototype of the Memory Matrix client so we could do some early testing and research. Shaun was busy, but he gave me the contact info for Bedingfield, who was living in Portland at the time. Turns out that Bedingfield taught new media at SCAD (', marks: [] },
    { text: 'Savannah College of Art and Design', marks: [link19.markKey] },
    { text: ') and was the guy responsible for teaching Flash to Shaun.', marks: [] },
  ], [link18.markDef, link19.markDef]))

  // Sidebar: Business card
  if (imgMap['business-card.png']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['business-card.png'].ref, 'GoInvo business card', 'medium'),
      textBlock('Like any good design firm, our first business cards were designed to impress.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Like any good design firm, our first business cards were designed to impress.'),
    ]))
  }

  // DK: We also brought Josh Williams in...
  const link20 = linkMark('https://www.linkedin.com/in/firewheel')
  const link21 = linkMark('http://jeffcroft.com/')
  const link22 = linkMark('http://www.shutterfly.com/')
  blocks.push(speakerQuote('DK:', [
    { text: 'We also brought ', marks: [] },
    { text: 'Josh Williams', marks: [link20.markKey] },
    { text: ' in on that project. He was really talented back then but, wow, has he taken off since! And I think ', marks: [] },
    { text: 'Jeff Croft', marks: [link21.markKey] },
    { text: ', as a little-known designer in Kansas City, was working on ', marks: [] },
    { text: 'Shutterfly', marks: [link22.markKey] },
    { text: ' for us too. Or, maybe he was just creating the Invo website, I don\u2019t remember. But we had quite the little team of alpha talent designing their software.', marks: [] },
  ], [link20.markDef, link21.markDef, link22.markDef]))

  // AMH: We sub-contracted Josh's design studio...
  const link23 = linkMark('http://en.wikipedia.org/wiki/Gowalla')
  const link24 = linkMark('http://blueflavor.com/')
  blocks.push(speakerQuote('AMH:', [
    { text: 'We sub-contracted Josh\u2019s design studio, Firewheel Design, to do all the icons we needed for the Memory Matrix product, which by that time had been acquired by Shutterfly. Jeff helped us as well, on a few smaller projects, but not the Memory Matrix project. This was right around the time Josh was noodling with a few mobile games that would eventually lead him towards making ', marks: [] },
    { text: 'Gowalla', marks: [link23.markKey] },
    { text: '. Jeff would later join ', marks: [] },
    { text: 'Blue Flavor', marks: [link24.markKey] },
    { text: ' and head to Seattle, to work with the likes of Tom Watson and Keith Robinson.', marks: [] },
  ], [link23.markDef, link24.markDef]))

  // DK: I think a lot of us had interesting adventures...
  blocks.push(simpleSpeakerQuote('DK:', 'I think a lot of us had interesting adventures in our careers during this acceleration of the web. The other big project around that time was PROTRADE. That came in via a friend of mine, connecting me to their smart product manager, Josh Crandall. It was right in my wheelhouse: a fantasy sports game conceived of as a stock market. I was still in Boston at the time but they were in San Mateo, so I started doing the bi-coastal thing. While my plan was to move out to the Valley after Fran finished graduate school, PROTRADE started that process a little bit early.'))

  // AMH: I still think you were crazy to fly back and forth...
  blocks.push(simpleSpeakerQuote('AMH:', 'I still think you were crazy to fly back and forth as much as you did. But then again, I\u2019m deathly afraid of flying.'))

  // Sidebar: PROTRADE
  blocks.push(backgroundSection('gray', [
    textBlock('PROTRADE was re-branded to Citizen Sports, then purchased by Yahoo! Sports for more than $40M.'),
  ]))

  // DK: You've gotten a lot better with it...
  const link25 = linkMark('http://en.wikipedia.org/wiki/Jeff_Ma')
  blocks.push(speakerQuote('DK:', [
    { text: 'You\u2019ve gotten a lot better with it, going to Europe seemingly every year now! I had a great time working on PROTRADE. I got along famously with the two guys running it, Mike Kerns and ', marks: [] },
    { text: 'Jeff Ma', marks: [link25.markKey] },
    { text: '. My best day there was when I raised some issues with the core game philosophy that had nothing to do with the software and UI. Kerns and I spent half the day in the conference room working through stuff. Ma was in there for part of it as well but what I remember best is that, at the end, Kerns said \u201CThis is the best day we\u2019ve had at PROTRADE in a really long time.\u201D And it was wonderful to hear because it\u2019s why I was a service provider in the first place: to dig into really hard and knotty problems and kick their ass and make a difference.', marks: [] },
  ], [link25.markDef]))

  // AMH: I wish I had known who Jeff Ma was...
  blocks.push(simpleSpeakerQuote('AMH:', 'I wish I had known who Jeff Ma was at that time. We could have parlayed our earnings by a few multiples in a few trips to Vegas with him.'))

  // Sidebar: Dave Bedingfield
  if (imgMap['dave-bedingfield.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['dave-bedingfield.jpg'].ref, 'Dave Bedingfield', 'medium'),
      textBlock('Notoriously avoiding photographs, Dave Bedingfield is one of the best digital designers alive. He was part of Invo Silicon Valley from its earliest days.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Notoriously avoiding photographs, Dave Bedingfield is one of the best digital designers alive. He was part of Invo Silicon Valley from its earliest days.'),
    ]))
  }

  // Sidebar: Josh Williams and Jeff Croft
  blocks.push(backgroundSection('gray', [
    textBlock('Before being ready to hire full-time staff, GoInvo worked with top guns like Josh Williams and Jeff Croft. Williams was the founder of Gowalla; Croft wrote Pro CSS Techniques.'),
  ]))

  // Sidebar: Jeff Ma
  blocks.push(backgroundSection('gray', [
    textBlock('Jeff Ma was one of the leaders of the infamous MIT blackjack team and the real person behind protagonist \u201CKevin Lewis\u201D in the best-selling book, Bringing Down the House.'),
  ]))

  // DK: Ha ha, no doubt! Toward the end of our time at PROTRADE...
  const link26 = linkMark('http://svpg.com/team/')
  blocks.push(speakerQuote('DK:', [
    { text: 'Ha ha, no doubt! Toward the end of our time at PROTRADE they hired ', marks: [] },
    { text: 'Marty Cagan', marks: [link26.markKey] },
    { text: ' to be the new product tsar. Chief Product Officer or something similar. So, after that, my work fell under Marty. Now as you know my strengths were more down the creative director path than as a practicing designer. Before Marty joined there was a UI engineer I worked with who would basically translate all of my hand-waving and whiteboard drawings into a product. Well, Marty wanted to bring his own people in to do the work anyway, so he just tried to get me to kerchunk as much stuff as possible while our contract ran out. I still remember sitting in my office there trying to wrangle pixels, on the phone with you to get help. At one point I thought, \u201CI run around saying GoInvo is the best software design studio in the world yet here I am struggling to do remedial pixel pushing.\u201D In retrospect it is funny but at the time it was a little horrifying. It did help me better find my place in the world.', marks: [] },
  ], [link26.markDef]))

  // AMH: I remember trying to help a little on that project...
  blocks.push(simpleSpeakerQuote('AMH:', 'I remember trying to help a little on that project, but I was so deeply immersed with Shutterfly that I had a hard time spreading my focus. Something I\u2019m sure you\u2019ll agree with is that I\u2019m horrible at multitasking. I can only focus or work on one thing at a time. I felt bad that I was ineffective at helping out more with PROTRADE.'))

  // DK: It was my responsibility and it did all right...
  const link27 = linkMark('http://www.mitre.org/')
  blocks.push(speakerQuote('DK:', [
    { text: 'It was my responsibility and it did all right, so no need to feel bad. One of our other early clients was ', marks: [] },
    { text: 'MITRE', marks: [link27.markKey] },
    { text: '. Little did we know that particular client would end up keeping Invo going even after we bade a fond farewell to Silicon Valley.', marks: [] },
  ], [link27.markDef]))

  // AMH: Juhan! First time I met Juhan Sonin...
  blocks.push(simpleSpeakerQuote('AMH:', 'Juhan! First time I met Juhan Sonin, I thought he was crazy, as in literally crazy. Then the more I talked to him about design and process, the more I realized he actually was crazy, but in one of the best ways possible. His energy and passion are infectious. And he has no filter, so whatever comes to his mind will eventually make its way to his mouth. When it does, watch out! You\u2019ll learn something new every single time you chat with him.'))

  // JS: When the padded cell fits...
  blocks.push(simpleSpeakerQuote('Juhan Sonin:', 'When the padded cell fits...'))

  // DK: MITRE was a great example...
  const link28 = linkMark('https://web.archive.org/web/20051029021414/http://www.ixda.org/en/')
  blocks.push(speakerQuote('DK:', [
    { text: 'MITRE was a great example of how our being different helped us. Invo has always been iconoclastic. That\u2019s a big part of your personality, Andrei, as well as mine. Well, Juhan read your posts on ', marks: [] },
    { text: 'the old interaction design discussion list', marks: [link28.markKey] },
    { text: ' and, as a kindred spirit, thought you were the only one on there who \u201Cgot it.\u201D So thanks to being ourselves we got the MITRE work, and eventually Juhan to boot!', marks: [] },
  ], [link28.markDef]))

  // JS: I had an immediate intellectual and design connection...
  const link29 = linkMark('http://www.ixda.org/')
  const link30 = linkMark('http://en.wikipedia.org/wiki/Systems_engineering')
  blocks.push(speakerQuote('Juhan Sonin:', [
    { text: 'I had an immediate intellectual and design connection with Andrei based on his torrid posts on the ', marks: [] },
    { text: 'IxDA list', marks: [link29.markKey] },
    { text: '. He vigorously advocated for a no-nonsense and ', marks: [] },
    { text: 'systems engineering', marks: [link30.markKey] },
    { text: ' approach to product design (at least that was my interpretation) which dovetailed into my growing up in hard-science-based organizations and learn-and-design-by-making-real-things mantra. Over time, I also desired a physical connection, but my assless chaps never turned Andrei\u2019s eyes off of Donna.', marks: [] },
  ], [link29.markDef, link30.markDef]))

  // DD: And that last comment is why...
  blocks.push(simpleSpeakerQuote('Donna Driscoll:', 'And that last comment is why we initially thought you were literally crazy, Captain Sonin. But when you flew out and we met for the first time I knew you and Andrei would become kindred spirits. You shared the same design philosophy.'))

  // AMH: Indeed, we did...
  blocks.push(simpleSpeakerQuote('AMH:', 'Indeed, we did and we still do to this day.'))

  // DK: Even though my intention was always to come out to Silicon Valley...
  blocks.push(simpleSpeakerQuote('DK:', 'Even though my intention was always to come out to Silicon Valley it was never a fait accompli. My girlfriend was very career-minded and, while she did focus on jobs in the valley, she was applying in other geos as well. I might have ultimately moved without her if it came to that, but she got a job at Yahoo, and out to California we headed. For me, at least, it immediately started to feel more like a real company instead of a couple of freelancers at that point.'))

  // AMH: Having Dirk move out to Silicon Valley...
  blocks.push(simpleSpeakerQuote('AMH:', 'Having Dirk move out to Silicon Valley was the point at which the company started to take off. Working remotely, while great for some teams, is really a barrier when you\u2019re building a company. With that barrier gone, we were able to finally focus full time on building the studio.'))

  // DK: Of course the bigger thing for us was bringing Ben Listwon on board...
  blocks.push(simpleSpeakerQuote('DK:', 'Of course the bigger thing for us was bringing Ben Listwon on board. You were keen on that from the very beginning and we were finally starting to get enough work, and the kind of work, that allowed for that to happen. I just couldn\u2019t wait to meet him in the flesh, because you always said he was perhaps the smartest guy in the valley, which is really saying something.'))

  // BL: Ugh, jeepers, I don't think that's right...
  blocks.push(simpleSpeakerQuote('Ben Listwon:', 'Ugh, jeepers, I don\u2019t think that\u2019s right. Honestly, I\u2019ve been blessed to work with people that make me look smart, and I\u2019ve tried, even after Invo, to hire or work with only the folks that will outshine my abilities.'))

  // BL: I do remember our first meeting though...
  blocks.push(simpleSpeakerQuote('BL:', 'I do remember our first meeting though, at Coffee & More (was it always called that?) in Sunnyvale. I couldn\u2019t tell if I was interviewing, being interviewed, or what, but I knew you were both serious about the business, and that was all that mattered. The passion and drive was clear as day, and that\u2019s what makes an organization as durable as Invo has been.'))

  // DD: Ben's being too modest...
  blocks.push(simpleSpeakerQuote('Donna Driscoll:', 'Ben\u2019s being too modest. He\u2019s often the smartest guy in the room, and the kindest, treating everyone he meets, no matter who they are, with equal respect. Ben had been my best friend since our days at PayPal and when I learned that he was joining Invo, I knew that among the three of you this was going to become something amazing.'))

  // DK: Ben what did you start working on with us...
  blocks.push(simpleSpeakerQuote('DK:', 'Ben what did you start working on with us, Agiliance?'))

  // BL: Yeah, that's right. Praveen had built a really great engineering team...
  blocks.push(simpleSpeakerQuote('BL:', 'Yeah, that\u2019s right. Praveen had built a really great engineering team, but this was a big challenge for me. The product they had was built on a Java stack, and was utilizing a couple of libraries I\u2019d never heard of. Andrei had already hammered out some great comps, so I had to get up to speed on a lot of material in a very short amount of time. Lucky for me, their office was about a mile away from my de facto coffee shop (read: office) in Mountain View, so I was never short on caffeinated motivation.'))

  // AMH: That project was probably the first real project...
  blocks.push(simpleSpeakerQuote('AMH:', 'That project was probably the first real project where it felt like we were finally operating officially like a business. Things at that point started looking up from my point of view. Like it was actually going to work.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: RISE, SILICON VALLEY
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 2: Rise, Silicon Valley', 'sectionTitle'))

  blocks.push(textBlock('By the fall of 2005, GoInvo had a few projects going at once and some interesting leads.'))

  // DK: By the fall of 2005...
  blocks.push(simpleSpeakerQuote('DK:', 'By the fall of 2005, we had a few projects going at once and some interesting leads.'))

  // AMH: It did.
  blocks.push(simpleSpeakerQuote('AMH:', 'It did.'))

  // DK: I will never forget our first meeting with Agile...
  blocks.push(simpleSpeakerQuote('DK:', 'I will never forget our first meeting with Agile. We were brought in by Joel Nave who really wanted to work with us.'))

  // Sidebar: Agile logo
  if (imgMap['agile-logo.png']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['agile-logo.png'].ref, 'Agile (Agiliance) logo', 'medium'),
      textBlock('Agile (Agiliance) was a leading governance, risk, and compliance (GRC) software provider that became one of GoInvo\u2019s most important Silicon Valley clients.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Agile (Agiliance) was a leading governance, risk, and compliance (GRC) software provider that became one of GoInvo\u2019s most important Silicon Valley clients.'),
    ]))
  }

  // BL: There was also a real sense of desperation...
  blocks.push(simpleSpeakerQuote('BL:', 'There was also a real sense of desperation in that meeting. The folks at Agile knew what had served them well for many years.'))

  // AMH: I also remember taking on that project...
  blocks.push(simpleSpeakerQuote('AMH:', 'I also remember taking on that project without knowing the full scope of their product.'))

  // DK: I remember that fear factor very well...
  blocks.push(simpleSpeakerQuote('DK:', 'I remember that fear factor very well. We didn\u2019t comprehend at that time the real breadth of PLM.'))

  // BL: Space was a major milestone...
  blocks.push(simpleSpeakerQuote('BL:', 'Space was a major milestone. Don\u2019t get me wrong, I could work all day from coffee shops.'))

  // DK: Andrei was the alpha designer...
  blocks.push(simpleSpeakerQuote('DK:', 'Andrei was the alpha designer. Ben was the alpha engineer. I was a sort of executive consultant.'))

  // DD: I was at Adobe at the time...
  blocks.push(simpleSpeakerQuote('Donna Driscoll:', 'I was at Adobe at the time doing exploratory research to inform the company\u2019s mobile strategy.'))

  // DK: Wow, I had no idea that your coming on was so sudden!
  blocks.push(simpleSpeakerQuote('DK:', 'Wow, I had no idea that your coming on was so sudden!'))

  // AMH: I don't remember it being so sudden...
  blocks.push(simpleSpeakerQuote('AMH:', 'I don\u2019t remember it being so sudden, but as always, I\u2019ll defer to Donna on the details.'))

  // BL: This was huge...
  blocks.push(simpleSpeakerQuote('BL:', 'This was huge. Much like we needed the space, we also needed to grow the team.'))

  // AMH: Completely agreed...
  blocks.push(simpleSpeakerQuote('AMH:', 'Completely agreed. When they both joined the team, we became a real company.'))

  // Sidebar: First studio
  if (imgMap['invo-first-studio.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['invo-first-studio.jpg'].ref, 'First GoInvo studio in Santa Clara', 'medium'),
      textBlock('The first GoInvo studio was a small condo on Lafayette in Santa Clara, California.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The first GoInvo studio was a small condo on Lafayette in Santa Clara, California.'),
    ]))
  }

  // DK: The other side of it was that first studio space...
  blocks.push(simpleSpeakerQuote('DK:', 'The other side of it was that first studio space, a small condo on Lafayette down in Santa Clara.'))

  // AMH: That first space was an amazing find by Dirk...
  blocks.push(simpleSpeakerQuote('AMH:', 'That first space was an amazing find by Dirk. It was the perfect loft working space.'))

  // BL: That space was great for our size at the time...
  blocks.push(simpleSpeakerQuote('BL:', 'That space was great for our size at the time, and it had such a great, rustic feel.'))

  // DK: Ben I forgot how you built all of that stuff...
  blocks.push(simpleSpeakerQuote('DK:', 'Ben I forgot how you built all of that stuff. I was impressed!'))

  // DD: We did everything ourselves...
  blocks.push(simpleSpeakerQuote('DD:', 'We did everything ourselves, even making daily lunches for each other. That was a part of the day I loved.'))

  // DK: My strongest memory of that studio...
  blocks.push(simpleSpeakerQuote('DK:', 'My strongest memory of that studio was the bottle of wine we shared for some success.'))

  // Sidebar: Wine celebration
  if (imgMap['wine-celebration.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['wine-celebration.jpg'].ref, 'Team celebrating at Lafayette studio', 'medium'),
      textBlock('The team celebrating a milestone at the Lafayette studio.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The team celebrating a milestone at the Lafayette studio.'),
    ]))
  }

  // DK: So, getting back to Agile...
  blocks.push(simpleSpeakerQuote('DK:', 'So, getting back to Agile. If our experience together at Invo Silicon Valley could be reduced to one single thing.'))

  // BL: Agile is still hands down...
  blocks.push(simpleSpeakerQuote('BL:', 'Agile is still hands down the number one work-related experience I\u2019ve had in my career.'))

  // AMH: Definitely. Doing the work is one thing...
  blocks.push(simpleSpeakerQuote('AMH:', 'Definitely. Doing the work is one thing. That\u2019s what we got paid for.'))

  // Sidebar: Box Exercise
  if (imgMap['box-exercise.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['box-exercise.jpg'].ref, 'GoInvo Box Exercise', 'medium'),
      textBlock('GoInvo\u2019s Box Exercise became a signature collaborative design method for wrangling massive complexity.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('GoInvo\u2019s Box Exercise became a signature collaborative design method for wrangling massive complexity.'),
    ]))
  }

  // AMH: Agile was the first place we instituted The Box Exercise...
  blocks.push(simpleSpeakerQuote('AMH:', 'Agile was the first place we instituted The Box Exercise. It worked so well with Agile.'))

  // DK: Of course Agile wasn't the only thing...
  blocks.push(simpleSpeakerQuote('DK:', 'Of course Agile wasn\u2019t the only thing we were working on. That first year in Lafayette we were also doing a lot of work.'))

  // AMH: First we got to work with Josh Williams on the Shutterfly project...
  blocks.push(simpleSpeakerQuote('AMH:', 'First we got to work with Josh Williams on the Shutterfly project, then Noah Stokes with the Yahoo project.'))

  // DK: This was also when Spivot was coming to life...
  blocks.push(simpleSpeakerQuote('DK:', 'This was also when Spivot was coming to life. It was Invo\u2019s first crack at doing our own product.'))

  // AMH: Spivot was my idea...
  blocks.push(simpleSpeakerQuote('AMH:', 'Spivot was my idea. It came about from messing around with CSS and RSS feeds at the time.'))

  // Sidebar: Spivot
  if (imgMap['spivot.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['spivot.jpg'].ref, 'Spivot product', 'medium'),
      textBlock('Spivot was GoInvo\u2019s first attempt at building their own product \u2014 a bit too early for the market.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Spivot was GoInvo\u2019s first attempt at building their own product \u2014 a bit too early for the market.'),
    ]))
  }

  // BL: Indeed, Spivot was probably just a bit too early.
  blocks.push(simpleSpeakerQuote('BL:', 'Indeed, Spivot was probably just a bit too early.'))

  // DK: One thing that the foundation provided by the Agile work gave us...
  blocks.push(simpleSpeakerQuote('DK:', 'One thing that the foundation provided by the Agile work gave us was the ability to buy a studio space.'))

  // DK: We really decked it out...
  blocks.push(simpleSpeakerQuote('DK:', 'We really decked it out. We had a lot of great furniture. The glass-block entrance. The art.'))

  // AMH: That was all you, Dirk...
  blocks.push(simpleSpeakerQuote('AMH:', 'That was all you, Dirk. You had a real knack for environment and space.'))

  // Sidebar: Kifer studio
  if (imgMap['kifer-studio.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['kifer-studio.jpg'].ref, 'Kifer Road studio in Sunnyvale', 'medium'),
      textBlock('The Kifer Road studio in Sunnyvale became GoInvo\u2019s permanent Silicon Valley home.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The Kifer Road studio in Sunnyvale became GoInvo\u2019s permanent Silicon Valley home.'),
    ]))
  }

  // DK: Working with Dennis Fong was fun...
  blocks.push(simpleSpeakerQuote('DK:', 'Working with Dennis Fong was fun. Andrei, you worked side-by-side with him on Raptr.'))

  // AMH: Yes. One of those serendipitous projects...
  blocks.push(simpleSpeakerQuote('AMH:', 'Yes. One of those serendipitous projects, from a relationship I made with him some ten years prior.'))

  // AMH: Dennis was willing to try all sorts of out of the box ideas...
  blocks.push(simpleSpeakerQuote('AMH:', 'Dennis was willing to try all sorts of out of the box ideas and thinking.'))

  // DK: Remember the fantasy football league...
  blocks.push(simpleSpeakerQuote('DK:', 'Remember the fantasy football league we had that first year there?'))

  // DK: Toward the middle of 2008 was when you said you were leaving, Ben...
  blocks.push(simpleSpeakerQuote('DK:', 'Toward the middle of 2008 was when you said you were leaving, Ben. That was my saddest day at Invo.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: INTERESTING TIMES
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 3: Interesting Times', 'sectionTitle'))

  blocks.push(textBlock('As Agile winded down, the economic crisis hit, and GoInvo faced its most challenging period.'))

  // DK: As Agile finally started winding down...
  blocks.push(simpleSpeakerQuote('DK:', 'As Agile finally started winding down we had a new big client hitting: McAfee.'))

  // AMH: Tim and I worked at Adobe...
  blocks.push(simpleSpeakerQuote('AMH:', 'Tim and I worked at Adobe during the same period in the late 90s. He\u2019s a great guy.'))

  // Sidebar: McAfee
  if (imgMap['mcafee-box.png']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['mcafee-box.png'].ref, 'McAfee project', 'medium'),
      textBlock('The McAfee project was probably GoInvo Silicon Valley at its most potent.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The McAfee project was probably GoInvo Silicon Valley at its most potent.'),
    ]))
  }

  // DK: The McAfee project was probably Invo SV at its most potent.
  blocks.push(simpleSpeakerQuote('DK:', 'The McAfee project was probably Invo SV at its most potent.'))

  // AMH: I have the original schedule still...
  blocks.push(simpleSpeakerQuote('AMH:', 'I have the original schedule still. The core design work was over three to four months.'))

  // DK: As Silicon Valley was growing in 2008...
  blocks.push(simpleSpeakerQuote('DK:', 'As Silicon Valley was growing in 2008, the plan had always been to expand GoInvo geographically.'))

  // JS: I was at MITRE...
  blocks.push(simpleSpeakerQuote('JS:', 'I was at MITRE, which was pretty damn good and a bit cushy, and I was learning a ton.'))

  // AMH: Juhan was an easy pick...
  blocks.push(simpleSpeakerQuote('AMH:', 'Juhan was an easy pick to lead and grow the studio practice outside of Silicon Valley.'))

  // DK: It was moving slowly...
  blocks.push(simpleSpeakerQuote('DK:', 'It was moving slowly, but finally what cinched it was when we got together.'))

  // JS: That was a come-to-Jesus meeting...
  blocks.push(simpleSpeakerQuote('JS:', 'That was a come-to-Jesus meeting. I was thinking, \u201CMan, I got to make a decision.\u201D'))

  // DK: The part that I hadn't expected was...
  blocks.push(simpleSpeakerQuote('DK:', 'The part that I hadn\u2019t expected was, for you to agree to it, your requirement was that I actually move to Boston.'))

  // JS: I almost made that assumption...
  blocks.push(simpleSpeakerQuote('JS:', 'I almost made that assumption at the beginning, and maybe that\u2019s why I was bullish on it.'))

  // DK: Andrei, as the McAfee project was winding down...
  blocks.push(simpleSpeakerQuote('DK:', 'Andrei, as the McAfee project was winding down we had our all-company retreat down in Santa Cruz.'))

  // Sidebar: Seascape Resort
  if (imgMap['seascape-resort.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['seascape-resort.jpg'].ref, 'GoInvo retreat at Seascape Resort', 'medium'),
      textBlock('The GoInvo all-company retreat at Seascape Resort in Santa Cruz.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The GoInvo all-company retreat at Seascape Resort in Santa Cruz.'),
    ]))
  }

  // AMH: Probably the best string of months...
  blocks.push(simpleSpeakerQuote('AMH:', 'Probably the best string of months of the entire thing for me was most of 2008.'))

  // Sidebar: Time cover
  if (imgMap['time-cover-2008.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['time-cover-2008.jpg'].ref, '2008 economic crisis Time cover', 'medium'),
      textBlock('The 2008 economic crisis hit Silicon Valley hard and changed the trajectory of GoInvo forever.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('The 2008 economic crisis hit Silicon Valley hard and changed the trajectory of GoInvo forever.'),
    ]))
  }

  // DK: We talked about what to do...
  blocks.push(simpleSpeakerQuote('DK:', 'We talked about what to do, a conversation that started while we were at the bloody retreat.'))

  // AMH: It would have been too much for me to take...
  blocks.push(simpleSpeakerQuote('AMH:', 'It would have been too much for me to take. So rather than let everyone go and start over.'))

  // DK: 2009 must have been incredibly difficult for you, Andrei...
  blocks.push(simpleSpeakerQuote('DK:', '2009 must have been incredibly difficult for you, Andrei. I was off in Boston.'))

  // AMH: It was brutal...
  blocks.push(simpleSpeakerQuote('AMH:', 'It was brutal. But we tried our best. We spent all of the first half of 2009.'))

  // DK: There were some interesting projects down the stretch...
  blocks.push(simpleSpeakerQuote('DK:', 'There were some interesting projects down the stretch. Sean Parker brought you in to work with Founder\u2019s Fund.'))

  // Sidebar: Sean Parker
  if (imgMap['sean-parker.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['sean-parker.jpg'].ref, 'Sean Parker', 'medium'),
      textBlock('Sean Parker, co-founder of Napster and Facebook\u2019s founding president, brought GoInvo in to work with Founder\u2019s Fund.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Sean Parker, co-founder of Napster and Facebook\u2019s founding president, brought GoInvo in to work with Founder\u2019s Fund.'),
    ]))
  }

  // AMH: The lack of enough robust client work...
  blocks.push(simpleSpeakerQuote('AMH:', 'The lack of enough robust client work made it such that we had to let a few go every month.'))

  // DK: It was such a sad way to end...
  blocks.push(simpleSpeakerQuote('DK:', 'It was such a sad way to end, and relatively speaking a remarkably fast fall.'))

  // AMH: I talked about the experience with Nancy Duarte...
  blocks.push(simpleSpeakerQuote('AMH:', 'I talked about the experience with Nancy Duarte. She basically told me that the only thing we could have done differently.'))

  // DK: Looking back, what are your best memories...
  blocks.push(simpleSpeakerQuote('DK:', 'Looking back, what are your best memories of doing Invo Silicon Valley?'))

  // AMH: I miss being at the studio late at night by myself...
  blocks.push(simpleSpeakerQuote('AMH:', 'I miss being at the studio late at night by myself, doing a little work.'))

  // DK: Those were good days...
  blocks.push(simpleSpeakerQuote('DK:', 'Those were good days. I look back more fondly on my years in California than any other point.'))

  // Sidebar: Andrei's bookshelf
  if (imgMap['andreis-bookshelf.png']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['andreis-bookshelf.png'].ref, "Andrei's bookshelf at the studio", 'medium'),
      textBlock('Andrei\u2019s bookshelf at the studio \u2014 a snapshot of the influences that shaped GoInvo\u2019s design philosophy.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Andrei\u2019s bookshelf at the studio \u2014 a snapshot of the influences that shaped GoInvo\u2019s design philosophy.'),
    ]))
  }

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: RISE, BOSTON
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 4: Rise, Boston', 'sectionTitle'))

  blocks.push(textBlock('GoInvo\u2019s Boston studio started lean during the recession and gradually built into a thriving practice.'))

  // JS: We signed in September the agreement...
  blocks.push(simpleSpeakerQuote('JS:', 'We signed in September the agreement that, yes, here are our open veins, we\u2019re blood-brothering.'))

  // DK: Beyond being a great space...
  blocks.push(simpleSpeakerQuote('DK:', 'Beyond being a great space, right from the very beginning it needed a lot of work.'))

  // JS: I remember when I made my announcement at MITRE...
  blocks.push(simpleSpeakerQuote('JS:', 'I remember when I made my announcement at MITRE that I was leaving.'))

  // DK: In the presentation you gave your notice?
  blocks.push(simpleSpeakerQuote('DK:', 'In the presentation you gave your notice?'))

  // JS: It was my, "Hey, people, I'm out of here."
  blocks.push(simpleSpeakerQuote('JS:', 'It was my, \u201CHey, people, I\u2019m out of here.\u201D It was a lunchtime tech talk.'))

  // DK: We got started at a moment where the recession was in full swing.
  blocks.push(simpleSpeakerQuote('DK:', 'We got started at a moment where the recession was in full swing.'))

  // JS: We did. We were just on the entrails...
  blocks.push(simpleSpeakerQuote('JS:', 'We did. We were just on the entrails, the surviving entrails of the Silicon Valley studio.'))

  // DK: The worse things got in California...
  blocks.push(simpleSpeakerQuote('DK:', 'The worse things got in California the more I was out there. Once Andrei left I was out there constantly.'))

  // JS: Yeah, because you had to deal with it...
  blocks.push(simpleSpeakerQuote('JS:', 'Yeah, because you had to deal with it. You have a million-dollar building on the line.'))

  // DK: That was tough.
  blocks.push(simpleSpeakerQuote('DK:', 'That was tough.'))

  // JS: It was tough...
  blocks.push(simpleSpeakerQuote('JS:', 'It was tough. We were just surviving, and not having a big reputation here in Boston.'))

  // DK: During this lean time we made our first full-time hire...
  blocks.push(simpleSpeakerQuote('DK:', 'During this lean time we made our first full-time hire at the studio in Eric Benoit.'))

  // EB: I remember getting this email from Juhan...
  blocks.push(simpleSpeakerQuote('Eric Benoit:', 'I remember getting this email from Juhan via my website\u2019s contact form.'))

  // Sidebar: Eric Benoit
  if (imgMap['eric-benoit.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['eric-benoit.jpg'].ref, 'Eric Benoit', 'medium'),
      textBlock('Eric Benoit was GoInvo Boston\u2019s first full-time hire, recruited via his website by Juhan.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Eric Benoit was GoInvo Boston\u2019s first full-time hire, recruited via his website by Juhan.'),
    ]))
  }

  // EB: I remember combing through all the pages...
  blocks.push(simpleSpeakerQuote('EB:', 'I remember combing through all the pages on the Invo website and watching all the videos.'))

  // EB: There was enough there I was attracted to...
  blocks.push(simpleSpeakerQuote('EB:', 'There was enough there I was attracted to ignore the two-and-a-half-hour daily commute.'))

  // JS: Eric was maybe the only bright spot...
  blocks.push(simpleSpeakerQuote('JS:', 'Eric was maybe the only bright spot in that dark time. I remember the very bottom.'))

  // DK: Yeah. I called that meeting...
  blocks.push(simpleSpeakerQuote('DK:', 'Yeah. I called that meeting because I had been funding things out of my personal finances.'))

  // JS: It's over.
  blocks.push(simpleSpeakerQuote('JS:', 'It\u2019s over.'))

  // DK: It's over. We talked about it...
  blocks.push(simpleSpeakerQuote('DK:', 'It\u2019s over. We talked about it, and we both were interested in trying to keep it going.'))

  // JS: We got the Democratic National Committee project...
  blocks.push(simpleSpeakerQuote('JS:', 'We got the Democratic National Committee project from another MITRE alum.'))

  // EB: I was excited to do this project for the DNC...
  blocks.push(simpleSpeakerQuote('EB:', 'I was excited to do this project for the DNC. Designing something for that scale of usage.'))

  // DK: A few months after we got back on our feet...
  blocks.push(simpleSpeakerQuote('DK:', 'A few months after we got back on our feet is when Jon came onboard full time.'))

  // JF: You and I met at a financial information design conference...
  blocks.push(simpleSpeakerQuote('Jonathan Follett:', 'You and I met at a financial information design conference at the Harvard Club back in 2005.'))

  // Sidebar: Jon Follett
  if (imgMap['jon-follett.jpg']) {
    blocks.push(backgroundSection('gray', [
      imageBlock(imgMap['jon-follett.jpg'].ref, 'Jonathan Follett', 'medium'),
      textBlock('Jonathan Follett joined GoInvo after years of publishing UX content and running Hot Knife Design.'),
    ]))
  } else {
    blocks.push(backgroundSection('gray', [
      textBlock('Jonathan Follett joined GoInvo after years of publishing UX content and running Hot Knife Design.'),
    ]))
  }

  // DK: You really went all in on publishing UX stuff...
  blocks.push(simpleSpeakerQuote('DK:', 'You really went all in on publishing UX stuff for a while.'))

  // JF: I had a column at UXmatters for 2 years...
  blocks.push(simpleSpeakerQuote('JF:', 'I had a column at UXmatters for 2 years. I wrote a ton for them.'))

  // DK: Then we all came together summer of 2010.
  blocks.push(simpleSpeakerQuote('DK:', 'Then we all came together summer of 2010.'))

  // DK: Jon, perhaps your first major contribution...
  blocks.push(simpleSpeakerQuote('DK:', 'Jon, perhaps your first major contribution, and a big part of our getting back on the right trajectory, was the PTC project.'))

  // JF: Yeah, that's right...
  blocks.push(simpleSpeakerQuote('JF:', 'Yeah, that\u2019s right. I was doing a lot of teaching, these one-day seminars on web applications.'))

  // JS: The PTC project was Boston's first big project...
  blocks.push(simpleSpeakerQuote('JS:', 'The PTC project was Boston\u2019s first big project, meaning three or four people full time.'))

  // DK: Maybe the most important project we've had here in Boston...
  blocks.push(simpleSpeakerQuote('DK:', 'Maybe the most important project we\u2019ve had here in Boston was CodeRyte from the standpoint.'))

  // JS: We had a few goals for where the studio should go...
  blocks.push(simpleSpeakerQuote('JS:', 'We had a few goals for where the studio should go. The biggest of those was, and is, health and healthcare.'))

  // EB: I was really happy with the way the product turned out...
  blocks.push(simpleSpeakerQuote('EB:', 'I was really happy with the way the product turned out. CodeRyte gave us the time to get it done right.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: TODAY, AND TOMORROW
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 5: Today, and Tomorrow', 'sectionTitle'))

  blocks.push(textBlock('GoInvo looks ahead, with health and healthcare as its North Star.'))

  // JS: We had a few goals for where the studio should go...
  blocks.push(simpleSpeakerQuote('JS:', 'We had a few goals for where the studio should go. The biggest of those was, and is, health and healthcare. We wanted to be a healthcare design studio. And we\u2019re doing it.'))

  // DK: The studio today is the best version of GoInvo...
  blocks.push(simpleSpeakerQuote('DK:', 'The studio today is the best version of GoInvo that there\u2019s ever been. For all of the ups and downs, for all of the great memories and the difficult ones, this is the most coherent and focused GoInvo there has ever been.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERVIEW PARTICIPANTS
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Interview Participants', 'h2'))

  const participants = [
    { name: 'Andrei Herasimchuk (AMH)', role: 'Co-founder, Chief Designer' },
    { name: 'Dirk Knemeyer (DK)', role: 'Co-founder, CEO' },
    { name: 'Ben Listwon (BL)', role: 'Early Partner, Lead UI Designer & Architect' },
    { name: 'Donna Driscoll (DD)', role: 'Senior Design & Research' },
    { name: 'Juhan Sonin (JS)', role: 'Boston Studio Founder' },
    { name: 'Eric Benoit (EB)', role: 'First Boston Full-time Hire, Creative Director' },
    { name: 'Jonathan Follett (JF)', role: 'Principal, Business Development' },
    { name: 'Uday Gajendar (UG)', role: 'Senior Designer' },
    { name: 'Sarah Kaiser (SK)', role: 'Designer' },
  ]

  for (const p of participants) {
    blocks.push(richBlock([
      { text: p.name, marks: ['strong'] },
      { text: ` \u2014 ${p.role}`, marks: [] },
    ]))
  }

  return blocks
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const slug = 'oral-history-goinvo'
  console.log(`\n=== Migrating ${slug} ===\n`)

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

  if (dryRun) {
    console.log('  DRY RUN - would build content and patch document')
    console.log('  Would set subtitle, upload ~22 images, and generate all content blocks')
    return
  }

  // Build all content blocks (includes image uploads)
  const content = await buildContent()
  console.log(`  Generated ${content.length} blocks`)

  // Patch the document
  await client
    .patch(doc._id)
    .set({
      subtitle: 'To celebrate our 10 year anniversary some of Invo\u2019s leaders past and present came together to remember the ups and downs of our studio.',
      content,
    })
    .commit()

  console.log(`  Patched "${doc.title}" with:`)
  console.log(`    - subtitle`)
  console.log(`    - ${content.length} content blocks`)
  console.log('\nDone!\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
