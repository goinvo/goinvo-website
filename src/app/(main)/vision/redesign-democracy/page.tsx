import type { Metadata } from 'next'
import Image from 'next/image'
import { GovernmentCarousel } from './GovernmentCarousel'
import { VotingCarousel } from './VotingCarousel'
import './redesign-democracy.css'

const IMG = (path: string) =>
  `https://www.goinvo.com/old/images/features/democracy/${path}`

export const metadata: Metadata = {
  title: 'Redesign Democracy',
  description: 'A better solution for the digital era.',
}

/* ------------------------------------------------------------------ */
/*  Government-type data for the tabbed slider                        */
/* ------------------------------------------------------------------ */
const govtTypes = [
  {
    id: 'theocracy',
    label: 'Theocracy',
    color: 'slide0',
    description:
      'A deity was recognized as the official ruler and policy was set by officials who claimed divine guidance. These leaders largely came from privileged groups and families.',
    strength:
      'Spiritual basis for rules and decisions encouraged compliance and minimized dissatisfaction.',
    weakness:
      'Abstraction of divinity broke down quickly in the absence of clear religious hegemony.',
    example:
      'Chinese Shang Dynasty, 1600\u20131046 BCE. The emperor, descended from a continuous male line, was treated as God-like. Both a political and religious leader, his written declarations were considered as \u201Cdirectives from above\u201D and the actions of the state as divinely influenced.',
    downfall:
      'The Shang dynasty weakened over time. Debauched emperor Shang Di Xin poorly managed his holdings and lead his army to destruction, ushering in the Zhou dynasty, which maintained the Shang religious lineage.',
    lessons:
      'While a single-religion state seems impossible in the modern world, yoking the rule of state to spirituality in such a case can create stability and\u2014assuming reasonable civil rights\u2014relative harmony.',
  },
  {
    id: 'oligarchy',
    label: 'Oligarchy',
    color: 'slide1',
    description:
      'Control was exercised by a small group of people whose authority was based on special status related to power, wealth, education, or family.',
    strength: 'Efficient application of power by a theoretically enlightened group.',
    weakness: 'Participation in governance was restricted to the anointed few.',
    example:
      'Ancient Sparta, 7th century to 4th century BCE. Twenty-eight men over 60 years of age, along with two kings, made up the \u201Ccouncil of elders.\u201D They formulated proposals for acceptance or rejection by all free males.',
    downfall:
      'Wars killed citizens and weakened the Spartan geopolitical position. Spartan citizenship was inherited along family lines, so Spartans increasingly became a minority. By the time citizenship and wealth were spread to a broader base the decline was well underway.',
    lessons:
      'The Spartan oligarchy was generally an effective governing body. The underlying societal structure\u2014only a privileged and distinctly minority class were considered citizens\u2014was the primary issue.',
  },
  {
    id: 'feudalism',
    label: 'Feudalism',
    color: 'slide2',
    description:
      'Powerful regional families lorded over their territory and the people therein, with sovereignty a product of military might.',
    strength: 'Civilians had a high degree of social security and stability.',
    weakness:
      'Rigid caste structure trapped most people into lives over which they had little control and may not have wanted.',
    example:
      'Medieval Japan, 12th century to 16th century BCE. While Japan was nominally ruled by a weak emperor, regional daimyo served as absolute rulers of their territorial holdings, passed down within the same family.',
    downfall:
      'The period of \u201Cwarring states\u201D consolidated power to a strong emperor, breaking feudal decentralization for good.',
    lessons:
      'The combination of decentralization with perpetual military conflict between regional powers meant the emphasis of citizen effort was on subsistence and security. Quality of life, as well as progress in arts and sciences, was minimal.',
  },
  {
    id: 'a-monarchy',
    label: 'Absolute Monarchy',
    color: 'slide3',
    description: 'A single individual held most of the power over a nation-state.',
    strength:
      'A single ruler was able to act decisively, set a vision, and execute it without compromise.',
    weakness:
      'No checks and balances. If the monarch was weak or corrupt the nation and citizens could suffer terribly.',
    example:
      'France, 8th century to 18th century CE. Over 1,000 years just five powerful dynasties provided hereditary monarchs that led France to be the dominant power in continental Europe.',
    downfall:
      'Indulgences by the nobility contrasted with the misery of the common people during a period where theories of civil and political rights transformed popular expectations. The result was the French Revolution which famously ended the millenium-long tradition of hereditary rule.',
    lessons:
      'French contributions to humanity and the arts and sciences continue to reverberate, notably those originating in Louis XIV\u2019s reign of so-called enlightened rule. However, the absolute rulers ultimately neglected their people to the point of their own destruction.',
  },
  {
    id: 'p-monarchy',
    label: 'Parliamentary Monarchy',
    color: 'slide4',
    description:
      'A ruling monarch worked with a democratically elected parliament, all within a code of laws.',
    strength:
      'Democratic nature of parliament represents the common person although the monarch retains many benefits and powers of an absolute ruler.',
    weakness:
      'Dysfunction between the monarch and parliament can lead to gridlock; ineffectiveness on the part of either the monarch or parliament can unbalance the government.',
    example:
      'England/United Kingdom, 17th century CE to present. In the early days, a king or queen presided in conjunction with a parliament and prime minister. By the 20th century the monarch was reduced to a figurehead and the nation was functionally a democracy.',
    downfall:
      'The United Kingdom remains the pre-eminent European power. The monarchy has evolved with the times, to the point where it has only token monarchical authority. When the monarchy was strong the U.K. became the largest empire in human history; since then, they have evolved with the times to remain one of a handful of leading nations of the modern world.',
    lessons:
      'The U.K. now functions as a monarchy in name only. During the reign of Queen Victoria it was the largest empire in history. Thanks to their flexibility the empire declined in a somewhat intentional and controlled way and today the U.K. is still one of the few leading world powers.',
  },
  {
    id: 'sps',
    label: 'Single-Party State',
    color: 'slide5',
    description:
      'Most western dictatorships of the 20th century were established where a single political party took control of the government and, to varying degrees, independently made decisions relating to rulers and laws.',
    strength:
      'Similar ideology and platform shared by those in control creates efficiency and sidesteps the friction inherent in multi-party systems.',
    weakness:
      'Civil rights generally take a back seat to maintaining and expanding power, leading to a relatively closed society of a sort that has historically proven unsustainable.',
    example:
      'Communist Russia, 1918\u20131991 CE. The bloody overthrow of the last Russian Tsar saw Russia, a middling European power, rise within 40 years to take eastern Europe under their federal control and become one of the first global superpowers.',
    downfall:
      'The difficulty of lording over many culturally diverse nations, the economic pressure of challenging the United States for supremacy as a global superpower, and increasing demands for civil rights and the freedoms of the West, combined to bring about the dissolution of communist Russia seemingly overnight.',
    lessons:
      'Concentrated power and government control enabled the mechanization of powerful forces; closed, controlling society and over-reach of influence on a global level left communist Russia ripe for ignominious collapse.',
  },
]

/* ------------------------------------------------------------------ */
/*  Congress composition data                                          */
/* ------------------------------------------------------------------ */
const congressCol1 = [
  { label: 'Lawyers', pct: '32.5%', size: 'one' },
  { label: 'Businesspeople', pct: '24.4%', size: 'one' },
  { label: 'Career Politicians/Government Employees', pct: '12.0%', size: 'two' },
  { label: 'Educators', pct: '9.6%', size: 'three' },
  { label: 'Medical Professionals', pct: '6.0%', size: 'four' },
  { label: 'Career Military/Law Enforcement', pct: '4.1%', size: 'five' },
  { label: 'Farmers & Ranchers', pct: '2.8%', size: 'five' },
  { label: 'Nonprofit & Community Workers', pct: '2.6%', size: 'five' },
  { label: 'Entertainment & Media', pct: '1.9%', size: 'five' },
  { label: 'Accountants', pct: '1.3%', size: 'five' },
]

const congressCol2 = [
  { label: 'Engineers', pct: '0.6%', size: 'five' },
  { label: 'Social Workers', pct: '0.6%', size: 'five' },
  { label: 'Clergy', pct: '0.4%', size: 'five' },
  { label: 'Carpenter', pct: '0.2%', size: 'five' },
  { label: 'Legal Secretary', pct: '0.2%', size: 'five' },
  { label: 'Microbiologist', pct: '0.2%', size: 'five' },
  { label: 'Mill Supervisor', pct: '0.2%', size: 'five' },
  { label: 'Physicist', pct: '0.2%', size: 'five' },
  { label: 'Union Rep', pct: '0.2%', size: 'five' },
  { label: 'Youth Camp Director', pct: '0.2%', size: 'five' },
]

/* ------------------------------------------------------------------ */
/*  Voting system slides data                                          */
/* ------------------------------------------------------------------ */
const votingSlides = [
  {
    title: 'Handheld Voting System',
    subtitle: 'Overview',
    text: 'While a direct voting system is easily illustrated via the various screens that follow, the totality of the infrastructure would be immense. Such a system would likely fall under the auspices of the United States Department of Justice, incurring the bureaucratic trappings inherent in major government initiatives aimed at some 315 million people.',
    images: [] as string[],
  },
  {
    title: 'Bill Introduction',
    text: 'Citizens would periodically receive a bill to consider. Along with an overview of the bill, the first screen would display a graph showing the opinions of a personalized group of analysts, while \u201Cautomagically\u201D mapping each voter\u2019s personal preferences to the content. While all voters would be encouraged to conduct their own research, the system would make it dead simple to see how the things they care about map to the specific legislation.',
    text2:
      'All information within the voting system would be available via written and audio means. Voters would have access to live helpers as well as brick-and-mortar voting centers for additional assistance.',
    images: ['voting/screenshots/p1.1.jpg', 'voting/screenshots/p1.2.jpg'],
  },
  {
    title: 'Bill Overview',
    text: 'Protecting the integrity of the vote is a first-order priority, requiring the latest in identity recognition software. From a software development perspective, such security features would likely demand more ongoing investment than the entire rest of the system combined. This technology could also help customize the delivery and structure of information depending on its interpretation of a voter\u2019s mood, attention, or other factors.',
    images: ['voting/screenshots/p2.1.jpg', 'voting/screenshots/p2.2.jpg'],
  },
  {
    title: 'Simplified Overview Based on Comprehension',
    text: 'To further encourage voters\u2019 critical thinking, the system would provide an interactive table of contents along with key statistics and graphs to aid understanding of essential aspects of the legislation.',
    text2:
      'The fine details of any national bill are bound to be complicated and potentially difficult to parse. A plain-language overview of the salient points would help citizens to understand what is at stake.',
    images: [
      'voting/screenshots/p3.1.jpg',
      'voting/screenshots/p3.2.jpg',
      'voting/face-detect.jpg',
    ],
  },
  {
    title: "Analyst's Response",
    text: 'While most citizens might be unable to read the entirety of bills, support would come from a new breed of political analysts. These individuals and organizations would read, interpret, and make recommendations on legislation based on their specific platforms and interests and provide citizens with their unique perspectives and voting recommendations.',
    images: ['voting/screenshots/p4.1.jpg', 'voting/screenshots/p4.2.jpg'],
  },
  {
    title: 'Vote on the Bill',
    text: 'Voting time! The citizens would input their votes and let their voices be heard. The democratic process, as close to the ideal intention of this system, could be possible in a large, modern nation-state.',
    images: ['voting/p5.ui.jpg', 'voting/p5.phone.jpg'],
  },
]

/* ------------------------------------------------------------------ */
/*  Contributors data                                                  */
/* ------------------------------------------------------------------ */
const contributors = [
  {
    image: 'contrib/emily.jpg',
    name: 'Emily Twaddell',
    role: 'Editor',
    twitter: 'mimitwaddell',
  },
  {
    image: 'contrib/basecraft.jpg',
    name: 'Basecraft',
    role: 'Design Team',
    twitter: 'basecraftagency',
  },
  {
    image: 'contrib/juhan.jpg',
    name: 'Juhan Sonin',
    role: 'Voting System UIs',
    twitter: 'jsonin',
  },
  {
    image: 'contrib/noel.jpg',
    name: 'Noel Fort\u00E9',
    role: 'Online Design',
    twitter: 'thenoelforte',
  },
  {
    image: 'contrib/brian.jpg',
    name: 'Brian Liston',
    role: 'Print & .epub Design',
    twitter: 'lliissttoonn',
  },
  {
    image: 'contrib/hermes.png',
    name: 'Michael Hermes',
    role: 'Audio Engineer',
    twitter: 'hermbot',
  },
]

/* ================================================================== */
/*  SVG Icons (for action section)                                     */
/* ================================================================== */
function PdfIcon() {
  return (
    <svg viewBox="0 0 256 256">
      <path d="M188.6,83.4c1.6,1.6,3,3.8,4.1,6.6c1.2,2.8,1.7,5.3,1.7,7.6v99.6c0,2.3-0.8,4.3-2.4,5.9c-1.6,1.6-3.6,2.4-5.9,2.4H69.9 c-2.3,0-4.3-0.8-5.9-2.4c-1.6-1.6-2.4-3.6-2.4-5.9V58.8c0-2.3,0.8-4.3,2.4-5.9c1.6-1.6,3.6-2.4,5.9-2.4h77.5c2.3,0,4.8,0.6,7.6,1.7 c2.8,1.2,5,2.5,6.6,4.1L188.6,83.4z M183.4,194.4v-88.6h-36c-2.3,0-4.3-0.8-5.9-2.4c-1.6-1.6-2.4-3.6-2.4-5.9v-36H72.6v132.9H183.4z M150.1,62.3v32.5h32.5c-0.6-1.7-1.2-2.9-1.9-3.6l-27.1-27.1C153,63.5,151.8,62.8,150.1,62.3z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 256 256">
      <path d="M209.4,85.8c2.7,3.8,3.3,8.2,1.8,13l-27.8,91.4c-1.3,4.3-3.8,7.9-7.7,10.8c-3.9,2.9-8,4.4-12.4,4.4H70.3 c-5.2,0-10.2-1.8-15-5.4c-4.8-3.6-8.2-8-10-13.3c-1.6-4.5-1.7-8.8-0.2-12.8c0-0.3,0.1-1.2,0.3-2.7c0.2-1.5,0.3-2.8,0.4-3.7 c0.1-0.5,0-1.3-0.3-2.2c-0.3-0.9-0.4-1.6-0.3-2c0.1-0.7,0.4-1.4,0.8-2.1c0.4-0.7,1-1.5,1.7-2.4c0.7-0.9,1.3-1.7,1.7-2.4 c1.5-2.6,3.1-5.6,4.5-9.2c1.5-3.6,2.5-6.7,3-9.2c0.2-0.7,0.2-1.7,0.1-3c-0.2-1.3-0.2-2.3-0.1-2.8c0.2-0.7,0.8-1.7,1.7-2.8 c0.9-1.1,1.5-1.9,1.7-2.3c1.4-2.4,2.8-5.5,4.2-9.3c1.4-3.8,2.3-6.8,2.5-9.1c0.1-0.6,0-1.7-0.3-3.2c-0.2-1.6-0.2-2.5,0-2.8 c0.3-0.9,1-1.9,2.2-3.1c1.2-1.2,1.9-1.9,2.2-2.3c1.3-1.8,2.7-4.6,4.3-8.5c1.6-3.9,2.5-7.2,2.8-9.7c0.1-0.5,0-1.4-0.3-2.6 c-0.3-1.2-0.3-2.1-0.2-2.7c0.1-0.5,0.4-1.1,0.9-1.8c0.5-0.7,1.1-1.4,1.8-2.3c0.7-0.9,1.3-1.6,1.7-2.1c0.5-0.8,1.1-1.8,1.7-3.1 c0.6-1.2,1.1-2.4,1.5-3.5c0.4-1.1,1-2.3,1.6-3.6c0.6-1.3,1.3-2.4,2-3.2c0.7-0.8,1.6-1.6,2.7-2.4c1.1-0.7,2.3-1.1,3.6-1.2 c1.3,0,2.9,0.2,4.8,0.6l-0.1,0.3c2.6-0.6,4.3-0.9,5.2-0.9H182c5,0,8.8,1.9,11.5,5.7c2.7,3.8,3.3,8.1,1.8,13.1l-27.7,91.4 c-2.4,8-4.8,13.2-7.2,15.5c-2.4,2.3-6.7,3.5-13,3.5H59.8c-1.8,0-3.1,0.5-3.8,1.5c-0.7,1.1-0.8,2.5-0.1,4.3c1.6,4.7,6.5,7.1,14.5,7.1 h93.1c1.9,0,3.8-0.5,5.7-1.6c1.8-1,3-2.4,3.5-4.2L203,87.2c0.5-1.5,0.6-3.4,0.5-5.7C206,82.5,208,83.9,209.4,85.8z M93.7,111.9 c-0.3,0.9-0.2,1.6,0.2,2.3s1.1,1,2,1h61.4c0.9,0,1.7-0.3,2.6-1c0.8-0.6,1.4-1.4,1.7-2.3l2.1-6.5c0.3-0.9,0.2-1.6-0.2-2.3 c-0.4-0.6-1.1-1-2-1H100c-0.9,0-1.7,0.3-2.6,1c-0.8,0.6-1.4,1.4-1.7,2.3L93.7,111.9z M102.1,86c-0.3,0.9-0.2,1.6,0.2,2.3 c0.4,0.6,1.1,1,2,1h61.4c0.9,0,1.7-0.3,2.6-1c0.8-0.6,1.4-1.4,1.7-2.3l2.1-6.5c0.3-0.9,0.2-1.6-0.2-2.3c-0.4-0.6-1.1-1-2-1h-61.4 c-0.9,0-1.7,0.3-2.6,1c-0.8,0.6-1.4,1.4-1.7,2.3L102.1,86z" />
    </svg>
  )
}

function MicrophoneIcon() {
  return (
    <svg viewBox="0 0 256 256">
      <path d="M181.7,116.1V128c0,13.7-4.6,25.7-13.7,35.8c-9.2,10.2-20.5,16-34,17.5v12.3h23.8c1.6,0,3,0.6,4.2,1.8 c1.2,1.2,1.8,2.6,1.8,4.2c0,1.6-0.6,3-1.8,4.2c-1.2,1.2-2.6,1.8-4.2,1.8H98.2c-1.6,0-3-0.6-4.2-1.8c-1.2-1.2-1.8-2.6-1.8-4.2 c0-1.6,0.6-3,1.8-4.2c1.2-1.2,2.6-1.8,4.2-1.8H122v-12.3c-13.5-1.5-24.8-7.3-34-17.5c-9.2-10.2-13.7-22.1-13.7-35.8v-11.9 c0-1.6,0.6-3,1.8-4.2c1.2-1.2,2.6-1.8,4.2-1.8c1.6,0,3,0.6,4.2,1.8c1.2,1.2,1.8,2.6,1.8,4.2V128c0,11.5,4.1,21.3,12.3,29.5 c8.2,8.2,18,12.2,29.5,12.2c11.5,0,21.3-4.1,29.5-12.2c8.2-8.2,12.2-18,12.2-29.5v-11.9c0-1.6,0.6-3,1.8-4.2 c1.2-1.2,2.6-1.8,4.2-1.8s3,0.6,4.2,1.8C181.1,113.1,181.7,114.5,181.7,116.1z M157.8,80.3V128c0,8.2-2.9,15.2-8.8,21.1 c-5.8,5.8-12.9,8.8-21.1,8.8c-8.2,0-15.2-2.9-21-8.8c-5.8-5.8-8.8-12.9-8.8-21.1V80.3c0-8.2,2.9-15.2,8.8-21 c5.8-5.8,12.9-8.8,21-8.8c8.2,0,15.2,2.9,21.1,8.8C154.9,65.1,157.8,72.1,157.8,80.3z" />
    </svg>
  )
}

/* ================================================================== */
/*  Action CTA Section Component                                       */
/* ================================================================== */
function ActionSection() {
  return (
    <div className="action-section">
      <div className="icons">
        <PdfIcon />
        <BookIcon />
        <MicrophoneIcon />
      </div>
      <p>
        This article is also available as PDF, eBook, and spoken by the author
        free of charge.
      </p>
      <a className="action-button" href="mailto:info@goinvo.com">
        Request a Copy
      </a>
    </div>
  )
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */
export default function RedesignDemocracyPage() {
  return (
    <div className="redesign-democracy pt-[var(--spacing-header-height)]">
      {/* ============================================================ */}
      {/*  HERO HEADER                                                  */}
      {/* ============================================================ */}
      <header className="hero-header">
        <div className="headline">
          <h1 className="font-serif text-[2.75rem] leading-tight sm:text-[3.75rem]">
            Redesign Democracy
          </h1>
          <hr />
          <h2 className="font-serif">A Better Solution for the Digital Era</h2>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  SECTION 1: INTRODUCTION                                      */}
      {/* ============================================================ */}
      <div className="max-w-[60%] mx-auto px-[5rem] max-[860px]:max-w-full max-[540px]:px-[2rem]">
        <section id="section1" className="content-section pt-4 mb-12">
          {/* Social Sharing */}
          <div className="social-buttons mb-8">
            <p className="mb-2">Share this article:</p>
            <a
              className="fb"
              href="https://www.facebook.com/sharer/sharer.php?u=http://www.goinvo.com/features/redesign-democracy/index.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>
            <a
              className="twitter"
              href="https://twitter.com/intent/tweet?url=http%3A%2F%2Fgoinvo.com%2Ffeatures%2Fredesign-democracy%2F&hashtags=redesigndemocracy&via=goinvo"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
            <a
              className="in"
              href="http://www.linkedin.com/shareArticle?mini=true&url=http%3A%2F%2Fgoinvo.com%2Ffeatures%2Fredesign-democracy%2F&title=Redesign%20Democracy"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              className="mail"
              href="mailto:?body=http%3A%2F%2Fgoinvo.com%2Ffeatures%2Fredesign-democracy%2F"
            >
              Mail
            </a>
          </div>

          <header>
            <h3 className="font-serif text-[1.25rem] leading-tight sm:text-[1.75rem]">
              Introduction
            </h3>
            <hr className="section-hr orange" />
          </header>

          <p>
            Older generations seem to chronically lament that the world of the
            young is new, unprecedented, and terrible. Nostalgia and familiarity
            combine to create a &ldquo;They don&rsquo;t make &lsquo;em like they
            used to&hellip;&rdquo; mentality, one that ignores the fact preceding
            generations were saying exactly the same thing about them. The reality
            is that things are the way they are, each of us typically being more
            comfortable with and connected to that which we know the best and
            identify most closely with ourselves.
          </p>

          <p>
            However, it is just possible that we are reaching the nadir of the
            existing democratic process in the United States, an environment of
            toxicity and partisanship that shows no sign of softening.
            Coincidentally we are also at a moment where technology enables the
            tantalizing potential to reconsider the way our government is
            structured.
          </p>

          <p>
            Democracy in the United States has over 200 years of history behind
            it; democracy as a government system has more than 2,000 years of
            precedent. It may be the best system going but it sure doesn&rsquo;t
            seem to be doing a very good job. It might even be obsolete in this
            world that looks so very different than the one which produced it.
          </p>

          <p>
            This is the moment - our moment, together, yours and mine - to create
            a better system. So read on, see what I have in mind, and why. And if
            it sounds good to enough of us, maybe we can really change the world.
          </p>

          <p>
            Dirk Knemeyer
            <br />
            Granville, Ohio, U.S.
            <br />
            September 8, 2014
          </p>
        </section>
      </div>

      {/* Action / Request a Copy */}
      <ActionSection />

      {/* ============================================================ */}
      {/*  SECTION 2: THE ORIGINS OF DEMOCRACY                          */}
      {/* ============================================================ */}
      <div className="max-w-[60%] mx-auto px-[5rem] max-[860px]:max-w-full max-[540px]:px-[2rem]">
        <section id="section2" className="content-section pt-4 mb-12">
          <header>
            <h3 className="font-serif text-[1.25rem] leading-tight sm:text-[1.75rem]">
              The Origins of Democracy
            </h3>
            <hr className="section-hr red" />
          </header>

          <p>
            Today&rsquo;s U.S. government is built on principles and practices
            established more than 2,000 years ago. Can digital technology help us
            realize a better way?
          </p>

          <p>
            Democracy first took root around 508 BCE in Athens, Greece, the
            cultural cradle of antiquity. From 508 to 146 BCE Greece, particularly
            Athens, set the foundation upon which western civilization was to
            develop. Much of modern science, art, and architecture traces directly
            back to this place and time, building off of or reacting to the
            achievements of this period over the subsequent 2,160 years. This is
            certainly the case with modern democracy.
          </p>

          <p>
            Of course, the Athenians had a very different conception than we do of
            who was eligible to rule, to say nothing of who could vote. According
            to A.W. Gomme, of the estimated 315,500 people in Athens during the
            height of their civilization, there were:
          </p>

          <div className="my-6">
            <Image
              src={IMG('population.jpg')}
              alt="Population chart showing 25000 male citizens, 46500 menial laborers, 115000 slaves, and 129000 women and children that were living in ancient Greece."
              width={800}
              height={400}
              className="w-full h-auto"
            />
          </div>

          {/* Greek tech aside */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('greek.jpg')}
              alt="Key technologies from ancient Greece: thermometers, coin money, and catapults."
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <p className="caption-box teal mt-0 text-sm">
              Key technologies from ancient Greece: thermometers, coin money, and
              catapults.
            </p>
          </div>

          <p>
            Only the 25,000 male citizens of Athens could vote, meaning that fewer
            than 13% of the population had the privilege to choose their leaders.
          </p>

          <p>
            The lack of universal representation was obviously a problem, but a
            more subtle issue with Athenian democracy was the scale. In their very
            different and dispersed representational model - with dozens of roles -
            more than half of the 25,000 male citizens served in some official
            governing capacity at all times. The consequence was that most of this
            privileged class participated in government or had direct relationships
            and access to those who did.
          </p>

          <p>
            We continue to model our government systems on the same democratic
            approach, established more than 2,000 years ago, which represented
            only a small, privileged minority. Is democracy a mistake?
          </p>
        </section>
      </div>

      {/* Government Types Slides (carousel) */}
      <div className="my-8">
        <GovernmentCarousel govtTypes={govtTypes} />
      </div>

      <div className="max-w-[60%] mx-auto px-[5rem] max-[860px]:max-w-full max-[540px]:px-[2rem]">
        <p>
          Systems of government are characterized by a broad and complicated
          range of characteristics. This complexity can make it difficult to
          consider new political systems. Over the last 3,000 years the
          developing world has tried hundreds of different systems of government,
          many of which fall under the archetypes presented here. It is valuable
          to consider them in thinking about how we can re-imagine our own
          governance. However, we live in a moment when human rights are of
          paramount importance, so governments that minimize citizen involvement
          in determining laws and leadership present a less attractive choice.
        </p>

        <p>
          The reality is, at our current evolutionary stage, people must advocate
          for themselves. Time and time again we&rsquo;ve learned that trusting
          someone or something else with our own well-being generally leads to
          its degrading. It is, after all, human nature to value one&rsquo;s own
          needs over those of society at large.
        </p>

        <p>The way we take care of our needs can be described by a series of concentric rings.</p>

        <div className="my-6">
          <Image
            src={IMG('circle.jpg')}
            alt="Chart showing rings depicting 'Myself and family' at center, through 'Friends', interests, community, geography, national identity, and finally 'All of humanity'."
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>

        {/* Winston Churchill aside */}
        <div className="aside-image clearfix">
          <div
            className="w-full h-48 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${IMG('winston.jpg')})` }}
            role="img"
            aria-label="A photograph of Winston Churchill."
          />
          <p className="caption-box orange mt-0 text-sm">
            &ldquo;It has been said that democracy is the worst form of
            government except all the others that have been tried.&rdquo;{' '}
            <strong>&mdash; Sir Winston Churchill</strong>
          </p>
        </div>

        <p>
          Each ring out from the center gets less of my care and interest. I am
          just one person who has an intricate life to manage, one that precludes
          me from impacting the world far beyond my own immediate interests.
          Extrapolate that to the leader of a nation-state needing to care for
          all citizens equally. It is a literal impossibility. At its extreme,
          such natural self-interest may manifest as corruption, but for most
          managing that self-interest is simply one of the challenges that leaders
          must face.
        </p>

        <p>
          Given that people are naturally self-focused, and that human rights are
          an essential aspect to a modern government system, I will focus on
          redesigning democracy as opposed to changing to a different form of
          government. By giving citizens direct influence over their laws and
          leaders we give them the greatest degree of control over their own
          well-being. Perhaps our redesign of democracy can extend the degree of
          self-control and agency afforded by the US government of today. The
          question is, how can we move the government decisions that influence us
          closer to the centers of our own circles?
        </p>

        {/* ============================================================ */}
        {/*  SECTION 3: ELEMENTS OF A BETTER DEMOCRACY                    */}
        {/* ============================================================ */}
        <section id="section3" className="content-section pt-4 mb-12">
          <header>
            <h3 className="font-serif text-[1.25rem] leading-tight sm:text-[1.75rem]">
              Elements of a Better Democracy
            </h3>
            <hr className="section-hr teal" />
          </header>

          <p>
            One of the inherent flaws in modern democracies is the large size of
            contemporary nation-states. The bigger a group of people, the more
            removed those at the top will be from best serving some significant
            percentage of those at the bottom. There is too diverse a set of
            needs, values, beliefs, and affiliations for everyone to be properly
            taken care of. In the United States, this problem is exacerbated by a
            highly heterogeneous population. While there are many benefits to the
            &ldquo;melting pot&rdquo; &mdash;social, genetic, and philosophical,
            to name a few&mdash; the very diversity that provides strength also
            makes it harder for each individual to be properly governed. In a
            perfect world our society would cater to each of us as a unique person
            with idiosyncratic needs, woven nicely into the larger social fabric.
            The reality of a nation with hundreds of millions of people is that
            the larger and more diverse it is, the less customized to individual
            needs and desires the experience of being a citizen will be.
          </p>

          <p>
            <em>These ideas are built on four basic premises:</em>
          </p>

          {/* Aside: hands */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('hands.jpg')}
              alt="A graphic of a heart being held by two hands."
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <p className="caption-box yellow mt-0 text-sm">
              Other first-world nations with similar civil rights but higher well
              being and happiness than the United States have a much healthier
              fiscal outlook. For example, their citizens may pay more than 50% of
              their income in taxes, or provide mandatory military service, or save
              significant proportions of their income instead of spending beyond
              their means. Meanwhile, citizens of the United States spend more
              minutes per day on average watching television than any other nation.
              Instead of exercising our right to watch the most minutes of
              television per citizen each day than any other nation, perhaps we
              could do more to give back to the country and system that provides
              our many liberties and benefits. Each dollar contributed in taxes, or
              each hour spent in some form of civil service, strengthens the nation
              as a whole. It creates a cycle of success.
            </p>
          </div>

          <ol>
            <li>
              <p>
                Citizenship should provide major benefits and carry significant
                responsibilities. In the United States, the benefits of
                citizenship have never been more uncertain. We have the most
                extensive national security in the world, a clear benefit even if
                it is an order of magnitude larger than it needs to be. The recent
                adoption of &ldquo;Obamacare&rdquo; begins to move us closer to
                our first-world brethren from a health and wellness perspective.
                Social security and other social welfare programs are under threat
                both financially and legislatively, possibly removing a key
                personal security perk from our lives. US citizens enjoy benefits
                well beyond most of the world, but no better than the top half of
                first-world nations. Though some might argue that Athenian
                citizens had a more lavish lifestyle, relatively speaking, than
                most Americans do today, the cost of that lifestyle was borne by
                the majority of Athenian residents&mdash;all considered
                non-citizens. By contrast, even the vast majority of Americans
                who are not 1%&rsquo;ers enjoy the status of citizenship
                regardless of gender, race, age, or place of origin, and can
                aspire to nearly all of the same privileges.
              </p>
              <p>
                However, our nation asks very little of us in return. Other than
                pay taxes, which are among the lowest in the wealthy first world,
                and follow the laws, which are among the most liberal and
                individual-freedoms-friendly for a large nation-state in human
                history, we have little responsibility to our nation, state,
                community, or fellow citizens. All we need to do is be born and
                try not become a fringe part of the society, such as a felon.
                Those not born as United States citizens have a process to follow,
                but one that is barely more rigorous than simply moving here and
                living a good, normal life.
              </p>
              <p>
                Getting a lot for a little might seem like a good deal, but it is
                not good for our country nor for ourselves. From a pragmatic
                perspective, our low taxes contribute to what is now over $17
                trillion in debt. Our general lack of other societal
                responsibilities not only contribute to that debt - we could be
                contributing time or effort in small ways that would mitigate our
                collective debt) - they also give us a sense of entitlement.
                Feeling entitled can lead to selfish, lazy, and even anti-social
                behavior. These negatively impact health and well being, plus
                contribute to societal waste and personally motivated short-term
                thinking.
              </p>
              <p>
                By injecting more citizen responsibility, or at least productive
                participation, into our democracy we can curb unhealthy individual
                and collective behaviors while increasing prosperity for everyone.
              </p>
            </li>
          </ol>

          {/* Aside: Stalin */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('stalin.jpg')}
              alt="Josef Stalin"
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <p className="caption-box blue mt-0 text-sm">
              Josef Stalin famously instituted five-year plans, a model that saw
              the Soviet Union centralize and modernize at a prodigious rate.
              Copied by Nazi Germany (successfully) as well as Communist China
              (less successfully) this set of strategies and tactics enabled rapid
              growth. While these successes were admittedly reached through
              brutality and civil rights abuses, it is indisputable that by
              setting a broad agenda that strategically brings together many
              disparate elements of a nation for single purpose, profound change
              can be achieved.
            </p>
          </div>

          <ol start={2}>
            <li>
              <p>
                We need unifying initiatives to guide our government. From a
                philosophical perspective we already have these: the Declaration
                of Independence, the Constitution, and the Bill of Rights.
                However, on an operational level we do not. Every four years there
                is a new presidential election. Every two years we elect our
                representatives, every six, our senators and state governors. By
                the time any of these civil servants gets comfortable in office
                there is little time to think broadly; before long they need to
                worry about earning future votes to win the next election and
                maintain their position.
              </p>
              <p>
                Each time there is a change it potentially stops and even reverses
                the initiatives instigated by the previous regime. In part this is
                good: it provides the checks-and-balances so essential to
                democratic law. However, it also creates significant inefficiency.
                The trillion-dollar initiative of the current Administration will
                be the first target for the opposition party if control changes
                hands after the next national election. If there were a list of
                initiatives that gave us mandates over longer periods of time, a
                decade, two decades, or even more, we could borrow some of the
                key executive benefits of monarchical or dictatorial regimes while
                maintaining a true democracy.
              </p>
            </li>
            <li>
              <p>
                Citizens should have a closer, more direct relationship with
                their leaders and laws. While the majority of residents of ancient
                Athens were likely not citizens, those who were had a direct
                relationship to the workings of their &ldquo;national&rdquo;
                government. This is an ideal that gives people the greatest input
                into their government&rsquo;s functioning, necessarily putting the
                individual&rsquo;s rights and perspectives close to the decisions
                being made for and about them. It means participation.
              </p>
            </li>
          </ol>

          <div className="my-6">
            <Image
              src={IMG('citizens.jpg')}
              alt="Chart depicting the ratio of citizens participating in government: one-half in Ancient Athens, 1 in ten-thousand in the 1790 United States, and 1 in three-hundred eighty-four thousand in the 2014 United States."
              width={800}
              height={400}
              className="w-full h-auto"
            />
          </div>

          {/* Aside: Moon */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('moon.jpg')}
              alt="An astronaut on the moon, waving at the photographer."
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <p className="caption-box teal mt-0 text-sm">
              What if an amendment to the U.S. Constitution required an audacious,
              strategic long-term goal that we would commit to achieving
              regardless of whatever else might happen? President John F. Kennedy
              tried this on an ad hoc basis and - seemingly beyond the bounds of
              reason - we found ourselves on the moon less than a decade later.
            </p>
          </div>

          <ol start={4}>
            <li>
              <p>
                Laws and leadership should have a proper balance of long-term and
                short-term planning. China&rsquo;s emphasis on long-term planning
                turned them into a global superpower around the turn of the 20th
                century. By contrast, for decades the US government has pursued
                plans that are painfully overbalanced toward short-term thinking.
                This is reflected in everything from our financial position to our
                energy policy. While the reasons for this are complicated, one key
                aspect concerns politicians pandering to their voter base,
                advocating the knee-jerk whims of a limited constituency to the
                detriment of the nation as a whole. As well, there is the binary
                nature of compromise in an entrenched two-party system. How can we
                shift to a model that values long-term planning in ways more
                similar to our Chinese friends?
              </p>
            </li>
          </ol>
        </section>

        {/* ============================================================ */}
        {/*  SECTION 4: ISSUES WITH THE LEGISLATURE                      */}
        {/* ============================================================ */}
        <section id="section4" className="content-section pt-4 mb-12">
          <header>
            <h3 className="font-serif text-[1.25rem] leading-tight sm:text-[1.75rem]">
              Issues with the Legislature
            </h3>
            <hr className="section-hr green" />
          </header>

          <p>
            Our democratic system features a separation of powers on the national
            level, split between executive (the President), legislative (Senate
            and House of Representatives) and judicial (Supreme Court) branches.
          </p>

          <p>
            A nation ultimately needs one empowered decision maker. While
            theoretically it could be a group of people instead of an individual,
            historically this &ldquo;decision by committee&rdquo; model has not
            worked well. The separation of powers is designed to allow the
            executive branch some appropriate degree of autonomous control. Each
            citizen votes individually on the President. The outcome of the vote
            is intended to represent the majority&rsquo;s choice.
          </p>

          <p>
            Appointees to the Supreme Court are nominated by the President,
            confirmed by the Senate, and serve for life. The idea of a Supreme
            Court and life appointment are sensible. While my broader ideas would
            impact this process somewhat the existence and role of the Supreme
            Court&mdash;determining the rule of law at the highest judicial
            level&mdash; is an important foundational one. They can stay.
          </p>

          <p>
            Which brings us to the problem of this particular solution: the
            legislative branch. Each state is represented by two Senators and a
            variable number of State Representatives, ranging from 53
            (California) to just one (six states). This configuration goes back
            to the original U.S. Constitution, some 227 years ago.
          </p>

          <div className="my-6">
            <Image
              src={IMG('states-chart.jpg')}
              alt="Chart showing states that have vastly different numbers of representatives: 1 each for Colorado, North and South Dakota, Vermont, Delaware and Alaska, yet 53 representatives for the state of California."
              width={800}
              height={400}
              className="w-full h-auto"
            />
          </div>

          {/* Aside: legislators caption (no image in original) */}
          <div className="aside-image clearfix">
            <p className="caption-box red text-sm">
              With legislators like Eliot Spitzer, John Edwards, and Charles
              Keating, who needs enemies?
            </p>
          </div>

          <p className="emphasized italic">
            While the numerical structure of the legislature is problematic, there
            are bigger issues:
          </p>

          <ol>
            <li>
              <p>
                Senators and Representatives are not necessarily qualified to
                participate in making laws. Their only qualification is having
                been picked by constituencies made up of people who, for the most
                part, know them only from advertising and marketing and what their
                local paper chooses to write. So, the lawmakers may have
                questionable qualifications and the people who choose them are
                largely ignorant as to their efficacy for the position.
              </p>
            </li>
          </ol>

          {/* Congress Composition Chart */}
          <div className="congress-chart">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <table>
                  <tbody>
                    {congressCol1.map((row) => (
                      <tr key={row.label} className={row.size}>
                        <td>{row.label}</td>
                        <td>{row.pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4>
                  Composition of 113<sup>th</sup> Congress
                </h4>
                <table>
                  <tbody>
                    {congressCol2.map((row) => (
                      <tr key={row.label} className={row.size}>
                        <td>{row.label}</td>
                        <td>{row.pct}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <small>*Source: Washington Post</small>
              </div>
            </div>
          </div>

          {/* Aside: Boehner funding */}
          <div className="aside-image clearfix">
            <p className="caption-box blue text-sm">
              As of Wednesday, March 19, 2014 House Majority Leader John Boehner
              had raised $5,408,271 toward his re-election from contributions
              outside the state of Ohio. This equates to a whopping 87.9% of his
              total contributions being from people and organizations other than
              those he is geographically elected to represent. Source:
              OpenSecrets.org
            </p>
          </div>

          <ol start={2}>
            <li>
              <p>
                Legislators are incentivized to focus their lawmaking efforts on
                decisions that will feed into their re-election. That means they
                may be rewarded to ignore questions of the whole for pandering to
                their few. While the few may need an advocate in the arena of the
                many, legislators must remain mindful of the bigger picture.
              </p>
            </li>
            <li>
              <p>
                Legislators can put a great deal of space between the individual
                citizen and themselves. Remember the concentric circles I talked
                about? The random citizen is of very little practical concern to
                the legislator. They may genuinely intend to advocate for all of
                their people but it is only human nature that we privilege those
                to whom we have more connection. In the case of legislators, that
                can often be special interests and big companies as opposed to
                individual citizens.
              </p>
            </li>
          </ol>

          <p>
            I&rsquo;m actually sympathetic to much of government corruption. Are
            you going to try and get that big contract over to your friend, or to
            a stranger at your friend&rsquo;s expense? Some certainly have the
            discipline to adjudicate these situations fairly, but they are the
            exceptional ones in acting contrary to human nature. Would you, truly,
            risk hurting people you know and care about in such a situation? So
            long as the legislators are representing tens of thousands of people
            some will be privileged to the detriment of others.
          </p>

          <div className="my-6">
            <Image
              src={IMG('legislature.jpg')}
              alt="Chart showing how special interest groups and big business can get in the way of citizens access to legislature and therefore overall democratization of the law-making process."
              width={800}
              height={500}
              className="w-full h-auto"
            />
          </div>

          <p>
            The bottom line is that this is no way for the legislative branch of
            our government to be organized. No other alternative seemed possible
            in the 18th century because there was no practical way for the
            average citizen to participate directly in government.
          </p>

          <p>Today, thanks to digital technology, that is no longer true.</p>
        </section>
      </div>

      {/* ============================================================ */}
      {/*  FADED SECTION: Basic model of current legislature            */}
      {/* ============================================================ */}
      <div className="faded-section">
        <div className="max-w-[60%] mx-auto px-[5rem] max-[860px]:max-w-full max-[540px]:px-[2rem] clearfix">
          {/* Aside: Capitol + two-states */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('capitol.jpg')}
              alt="US Capitol Building"
              width={400}
              height={300}
              className="w-full h-auto mb-4"
            />
            <Image
              src={IMG('two-states.jpg')}
              alt="Map showing Robert F. Kennedy's home state vs. the state he was a senator in."
              width={400}
              height={200}
              className="w-full h-auto"
            />
            <p className="caption-box tan mt-0 text-sm">
              National politicians routinely &ldquo;carpetbag&rdquo;: owning a
              residence in a district or state in which they do not reside in
              order to run for Congress or, particularly, the Senate. Prominent
              examples include Robert F. Kennedy (New York Senate, 1964); Rick
              Santorum (Pennsylvania 18th Congressional District, 1990); Hillary
              Rodham Clinton (New York Senate, 2000)
            </p>
          </div>

          <p className="emphasized">
            Here is the basic model of the current legislature.
          </p>

          <ul>
            <li>
              <p>
                A few citizens in a voting district of thousands or millions of
                people compete to be elected as Representatives and Senators.
                There is a strong correlation between the amount of money a
                campaign spends on advertising and whether the candidate is able
                to win the election. At times national special interest groups
                spend tremendous amounts of money to control the outcome in local
                elections.
              </p>
            </li>
            <li>
              <p>
                All citizens in a voting district have the opportunity to choose
                their Senators and Representatives. Their choices are generally
                based on minimal information, primarily advertising and local
                media endorsements as well as the political party of the
                candidate. Less than 1% of voting citizens will ever meet these
                legislators, much less have an in-depth conversation with them.
              </p>
            </li>
            <li>
              <p>
                Senators and Representatives write and vote on laws. They are
                influenced by their constituents, special interests, and
                lobbyists, as well as by other members of their political party
                who have little investment in the constituency of others. Over
                $3.3 billion dollars are spent on lobbying to influence policy in
                the United States each year. (Source: Center for Responsive
                Politics) And less than 10% of bills introduced in the 112th U.S.
                Congress&mdash;561 of 6,845&mdash;actually passed into law.
                (Source: Brookings)
              </p>
            </li>
            <li>
              <p>
                Every six years (Senators) or two years (Representatives) the
                legislators are up for re-election. Since 1964 the House of
                Representatives has boasted a re-election rate of over 90%. While
                serving as Senators and Representatives, our legislators spend
                substantial time and effort attempting to get re-elected in lieu
                of performing their duties.
              </p>
            </li>
          </ul>

          <p>
            There&rsquo;s a lot that is broken about this system, and that is
            only an overview that doesn&rsquo;t get into its more limited but far
            darker underbelly of scandals and graft.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 5: THE DIGITAL SOLUTION                              */}
      {/* ============================================================ */}
      <div className="max-w-[60%] mx-auto px-[5rem] max-[860px]:max-w-full max-[540px]:px-[2rem]">
        <section id="section5" className="content-section pt-4 mb-0">
          <header>
            <h3 className="font-serif text-[1.25rem] leading-tight sm:text-[1.75rem]">
              The Digital Solution
            </h3>
            <hr className="section-hr blue" />
          </header>

          {/* Aside: Phones */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('phones.jpg')}
              alt="Graphic of different smartphones fanned out."
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <p className="caption-box orange mt-0 text-sm">
              As of January 2014 58% of U.S. adults already own a smartphone.
            </p>
          </div>

          <p>
            It all starts with the smartphone. This miraculous device gives us
            the power of a computer in our hand, pocket or purse at all times. It
            enables any citizen to receive information in and communicate out,
            both in real-time while running software applications far more
            powerful than those being run on desktop computers just a decade ago.
            The easy availability to such powerful, real-time technology empowers
            us to radically re-think each individual&rsquo;s role in our
            collective governance. No longer is there a limitation of space and
            time to prevent our getting high-resolution information on our
            government and legislators. There is no barrier to our placing a
            secure, verified vote on a candidate or law from the comfort of our
            home. The majority of Americans now hold in our hand the power to do
            everything that our legislators do when they vote on a bill: read the
            text. Consider outside information. Engage in debate or conversation.
            Place the vote. It&rsquo;s no different from a use case perspective
            than how we use Facebook. The difference is, rather than our time
            being spent on pleasant conveniences we are able to influence our
            nation as the self-representational government that democracy purports
            to be.
          </p>

          <p>
            We&rsquo;re not accustomed to thinking about having visibility into
            and knowledge of the inner workings of our nation, state, and
            locality, much less direct impact on decisions. But we can. And we
            should.
          </p>

          {/* AVB link */}
          <a
            href="http://arlingtonvisualbudget.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="block my-6"
          >
            <div className="flex flex-col md:flex-row items-stretch border border-gray-300">
              <div
                className="w-full md:w-[65%] h-48 md:h-auto bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${IMG('avb.jpg')})` }}
                role="img"
                aria-label="A screenshot of the Arlington Visual Budget."
              />
              <p className="caption-box gray w-full md:w-[35%] text-sm m-0">
                The award-winning Arlington Visual Budget, conceived and designed
                by GoInvo, is an exemplar of a progressive local community
                providing transparency into key aspects of their government.
                <br />
                <span className="italic text-gray-400">Click to learn more</span>
              </p>
            </div>
          </a>

          <p>
            Given the unprecedented ability our citizens now have to be more
            actively and directly engaged in our government, here is my
            suggestion for reconceiving the legislature into one more reflective
            of the philosophies underpinning democracy:
          </p>

          {/* Flow icons aside (desktop) */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('flow-icons.jpg')}
              alt="Flowchart showing how legislation could be voted on by being proposed by governments, but then being passed along to the citizens for voting through their handheld devices."
              width={400}
              height={600}
              className="w-full h-auto"
            />
          </div>

          <ol>
            <li>
              <p>
                The current senators and representatives would all be removed and
                replaced with exceptional individuals chosen for their potential
                to contribute to an enlightened government. Economists, physicists,
                biologists. Experts in well-being, personality, healthy
                communities. Labor leaders. Structural engineers. Agriculturists.
                Basically, if you look at every Presidential cabinet role, and all
                of the different aspects of life that bills under current
                consideration touch, experts that pertain to all of those things
                would be represented. So instead of the key qualification for
                participating being to influence voters and pacify lobbyists, our
                legislative branch would be filled with the brightest minds, the
                most insightful souls, and our leading experts. Yes, there would
                need to be some &ldquo;politicians&rdquo; among them&mdash;people
                who can build consensus and write legislative actions. But they
                should simply be one of the many roles being filled in this group
                of experts, not the vast majority of the chamber. While the
                initial group would need some kind of blanket appointment -
                nominated by the president, confirmed by popular vote? -
                eventually they would stay or go based on their statistics: are
                they contributing to successful legislation? If yes, then great.
                If not, then the executive branch would nominate new candidates
                who would be confirmed via the general voting system.
              </p>
              <p>
                Similar to the legislators of old, these people would introduce
                ideas and work together to bring bills forward. However they would
                not be doing the voting: we, the people, would. And, they would be
                engaged in far more valuable long-term strategic planning. This
                collection of the best and brightest tasked with leading the
                future of the country would not be thinking about pacifying Joe
                Smith in Tuscaloosa. They would need to consider and care for all
                of our citizens, and lead us down a path that took care of Joe
                Smith in more indirect ways. They would impact our lives by moving
                us away from the immediate chatter and into systems and
                trajectories intended to make the most of our potential. So not
                only would we be replacing potentially unqualified people with
                supremely qualified people, their charter would change. They would
                be far more motivated by the greater and collective good than the
                politicians in Washington who, as of this writing, have a 10.8%
                approval rating. (Source: RealClearPolitics)
              </p>
            </li>
            <li>
              <p>
                Independent of the government itself, a new profession of
                &ldquo;analysts&rdquo; would be required. Many of these would
                likely come from the current ranks of political commentators but
                would surely attract a new breed of personalities as well. Their
                role would be to represent a very specific position&mdash;it could
                be as narrow as &ldquo;Protect the second amendment at all
                costs&rdquo; or as broad as &ldquo;Advocate for individual
                liberties.&rdquo; They would review every bill, comment on it, and
                make a recommendation to vote for or against. Voters would
                &ldquo;subscribe&rdquo; to them. That subscription might be free,
                or the analyst might charge for it. But they, and whatever staff
                they developed, would be helping to guide people as to what bills
                deserve to be voted on or not, based on the beliefs and interests
                of each voter. Instead of blasting their platform out in a
                broadband way their platform would be taken for granted and they
                would be informing voters as to how they should vote based on
                their stated beliefs and interests.
              </p>
              <p>
                Now, it is unavoidable that the same lobbyists and special
                interests that infect our legislators and media will also play a
                big role with the analysts, as well as the experts who are the
                actual legislators. This is unavoidable. However, experts who are
                already successful, recognized, and accomplished in their
                particular fields will be far less susceptible to lobbying
                influence than the politician who gets through the voting gauntlet.
                The analysts are may be a different story, but the beauty is that
                the system as a whole comes back to the voters in a fully
                democratic way. It is responsive. Analysts may be corrupted in all
                kinds of ways, but if the voters stop subscribing to them they
                will not be relevant anymore. It is far harder for special
                interests to invest in this kind of brittle resource than putting
                millions into a senator who, excepting a scandal, will be around
                for six years.
              </p>
            </li>
            <li>
              <p>
                Voting currently done by legislators would instead be conducted
                directly by citizens. People could choose to use their existing
                smartphone, or be issued a very basic device for just the purpose
                of democratic participation. There would be small local voting
                centers also available in cases of lost or damaged voting devices.
                Each day, or week, or whatever the correct frequency is, citizens
                would receive a digital packet to review. Each bill would include
                a summary and the recommendation of all the analysts they
                subscribe to. Drilling in would let them see the entire bill with
                annotations from their analysts, or longer analysis about the
                bill. Citizens would have, at their fingertips, everything
                required to vote on their own behalf.
              </p>
            </li>
          </ol>

          <p>
            This is true democracy. The abstractions in the current process that
            leave us with a stable of professional politicians sporting a wide
            variety of qualifications is a relic of the analog world. Well, thanks
            to digital technology, that system is redundant. We can share
            information in real time. We can provide a secure vote via our
            devices. We can easily evaluate success via an objective system and
            judge the actors in democratic rule with those metrics. It seems so
            radical, yet the only thing that is radical to me is why we
            aren&rsquo;t already talking about it.
          </p>

          {/* Aside: Leaders */}
          <div className="aside-image clearfix">
            <Image
              src={IMG('leaders.jpg')}
              alt="Photographs of Stephen Hawking, Carl Sagan, Clara Barton, and Henry Ford."
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <p className="caption-box green mt-0 text-sm">
              Would our legislature have benefited from Stephen Hawking
              participating? Carl Sagan? Clara Barton? Henry Ford? We should
              empower leaders who actually lead.
            </p>
          </div>

          <p>
            The reason that an elite group of brilliant experts has historically
            been antithetical to democracy is that it amounts to an elite of the
            few ruling the many. This model is like that of Ancient Sparta,
            empowering wise and accomplished people to come together and chart
            the course that would be best for all of us collectively. Our current
            democracy also has an &ldquo;elite&rdquo; but they do not boast the
            sort of qualifications that the people leading a nation that often
            fashions itself as the greatest in the world really deserves. Our
            tech-accelerated conception makes this irrelevant. Citizens vote on
            the bills directly, and the elite only keep their positions in the
            legislature if they are contributing to good (read: acceptable to the
            majority, as a democracy should be) legislation.
          </p>

          <p>
            Now, for this solution to work would require some investments. 100%
            of all citizens who have the right to vote would need to own
            smartphones. The government would then need to provide comparable
            devices that are capable of properly handling the information review
            and secure voting process for those citizens who do not provide such
            devices for themselves. Additionally, there would need to be small,
            central voting stations in some geographic frequency to enable those
            with accessibility issues for whom the smartphone would not work to
            vote. While these represent significant new costs we would be
            retiring a myriad of old costs that, while I have been unable to find
            all of the data to provide a total cost rollup, is well into the
            billions of dollars each year spent by cities, counties, states and
            the federal government. The barrier to making this happen is not the
            cost; it is the collective will of those with vested interests who
            would lose their personal advantages for making this happen.
          </p>

          <h3 className="font-serif big-line">Let&rsquo;s make it together.</h3>

          <p>
            Like many radical ideas, it may be seductive to focus on some
            vulnerability in it and try to pull it apart. Go ahead. This probably
            isn&rsquo;t the exact right idea. But it&rsquo;s a start down the
            right path. The digital world is nothing like the world that came
            before it, and we deserve it to ourselves and the future to rethink
            everything. Regardless of any issues with this system, I challenge
            you to make the case that, in their respective totalities, the
            current system is better than what&rsquo;s proposed here. It
            isn&rsquo;t.
          </p>
        </section>
      </div>

      {/* ============================================================ */}
      {/*  VOTING SYSTEM SLIDES (carousel)                              */}
      {/* ============================================================ */}
      <div className="my-8">
        <VotingCarousel slides={votingSlides} />
      </div>

      {/* ============================================================ */}
      {/*  SECOND ACTION / CTA                                          */}
      {/* ============================================================ */}
      <ActionSection />

      {/* Social buttons centered */}
      <div className="social-buttons centered py-8">
        <p className="mb-2">Share this article:</p>
        <a
          className="fb"
          href="https://www.facebook.com/sharer/sharer.php?u=http://www.goinvo.com/features/redesign-democracy/index.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Facebook
        </a>
        <a
          className="twitter"
          href="https://twitter.com/intent/tweet?url=http%3A%2F%2Fgoinvo.com%2Ffeatures%2Fredesign-democracy%2F&hashtags=redesigndemocracy&via=goinvo"
          target="_blank"
          rel="noopener noreferrer"
        >
          Twitter
        </a>
        <a
          className="in"
          href="http://www.linkedin.com/shareArticle?mini=true&url=http%3A%2F%2Fgoinvo.com%2Ffeatures%2Fredesign-democracy%2F&title=Redesign%20Democracy"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          className="mail"
          href="mailto:?body=http%3A%2F%2Fgoinvo.com%2Ffeatures%2Fredesign-democracy%2F"
        >
          Mail
        </a>
      </div>

      {/* ============================================================ */}
      {/*  CREDITS: Author & Contributors                               */}
      {/* ============================================================ */}
      <section className="bg-white py-8 mt-8">
        <div className="credits-section px-8 max-[978px]:px-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Author */}
            <div className="md:w-[65%]">
              <Image
                src="https://www.goinvo.com/old/images/people/dirk/dk_nofilter.jpg"
                alt="Dirk Knemeyer"
                width={600}
                height={400}
                className="w-full h-auto"
              />
              <div className="author-content">
                <h3>Author</h3>
                <h2 className="font-serif text-[1.75rem] sm:text-[2.25rem] font-light mb-2">
                  Dirk Knemeyer
                </h2>
                <p className="text-[20px] leading-snug">
                  Dirk Knemeyer is a social futurist and a founder of GoInvo. He
                  has provided consulting, design, and technology to some of the
                  best companies in the world including Apple, Microsoft, Oracle,
                  PayPal, and Shutterfly. Dirk&rsquo;s writings have been published
                  in places like Business Week and Core77. He has keynoted
                  conferences in Europe and the U.S. and spoken at venues like TEDx,
                  Humanity+, and South by Southwest. Dirk has participated on 15
                  boards in industries including healthcare, publishing, and
                  education. He holds a Master of Arts in Popular Culture from
                  Bowling Green State University and a Bachelor of Arts in English
                  from The University of Toledo.
                </p>
              </div>
            </div>

            {/* Contributors */}
            <div className="md:w-[35%]">
              <div className="contributors-box">
                {contributors.map((c, idx) => (
                  <div key={c.name}>
                    <div className="contributor">
                      <div className="contributor-image">
                        <Image
                          src={IMG(c.image)}
                          alt={c.name}
                          width={80}
                          height={80}
                          className="w-full h-auto"
                        />
                      </div>
                      <div className="contributor-info">
                        <h3>{c.role}</h3>
                        <p>
                          {c.name}
                          <br />
                          <small>
                            <a
                              href={`https://twitter.com/${c.twitter}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              @{c.twitter}
                            </a>
                          </small>
                        </p>
                      </div>
                    </div>
                    {idx < contributors.length - 1 && (
                      <hr className="contributor-hr" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
