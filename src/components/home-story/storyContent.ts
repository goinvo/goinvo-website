/**
 * Copy for the story homepage (direction D: "AI knows how software works. We know
 * how people do."). Every claim here is one the current homepage already publishes;
 * nothing new is asserted. Keep it that way: a number added here needs a case study
 * behind it first.
 */

const imageBase = '/images/experiments/home-2026'

export const opening = {
  eyebrow: 'Human-centered design for complex systems',
  line1: 'AI knows how software works.',
  line2: 'We know how people do.',
  lead: 'Anyone can generate software now.',
  body:
    'Knowing how coders work through a backlog of thousands of charts, or why most SNAP applicants still applied by fax, mail and walk-in, comes from watching people work.',
  coda: "We've done that for 20 years.",
  hint: 'Here is what we saw',
}

export interface PeopleScene {
  id: string
  client: string
  context: string
  observation: string
  shortObservation?: string
  detail: string
  /** The outcome is drawn as `prefix` + a number counted from `from` to `to` + `suffix`. */
  prefix?: string
  from: number
  to: number
  suffix: string
  result: string
  href: string
  image: string
  alt: string
}

export const peopleScenes: PeopleScene[] = [
  {
    id: 'snap',
    client: 'State of Massachusetts',
    context: 'Public benefits',
    observation: 'In 2017, only 7% of SNAP applicants applied online.',
    shortObservation: 'Food support. Ninety questions away.',
    detail: 'Fax, mail, and walk-ins carried the rest of a program ~1M people rely on.',
    prefix: '7% → ',
    from: 7,
    to: 70,
    suffix: '%',
    result: 'of SNAP applications now online, once the form fit the people filling it out.',
    href: '/work/mass-snap',
    image: `${imageBase}/snapcover.jpg`,
    alt: 'State of Massachusetts SNAP application work',
  },
  {
    id: 'coderyte',
    client: '3M CodeRyte',
    context: 'Hospital systems',
    observation: "Memorial Hermann's coders were buried under a backlog of thousands of charts.",
    shortObservation: 'A backlog of thousands of charts.',
    detail: 'Throughput, accuracy, and auditability all needed to move at once.',
    from: 0,
    to: 200,
    suffix: '%',
    result: 'increase in coding efficiency, for coders buried under a chart backlog.',
    href: '/work/3m-coderyte',
    image: `${imageBase}/coderyte1.jpg`,
    alt: '3M CodeRyte medical coding workspace',
  },
  {
    id: 'ipsos',
    client: 'Ipsos',
    context: 'Global market research',
    observation: "A global research firm's analyst workflows took weeks.",
    shortObservation: 'Weeks of work before the insight.',
    detail: 'Insight generation was bottlenecked behind manual coding and report-stitching.',
    from: 0,
    to: 90,
    suffix: '+%',
    result: 'of Ipsos analysts adopted the AI research platform, because it fit how they already worked.',
    href: '/work/ipsos-facto',
    image: `${imageBase}/facto2.jpg`,
    alt: 'Ipsos Facto product screens',
  },
]

export const services = {
  eyebrow: 'What we do',
  heading: 'We design and ship enterprise software.',
  leadIn: 'We help you…',
  lines: [
    {
      line: '…bring a product to life.',
      description:
        'We join at any stage, from a blank page to a stuck backlog, and design the product into shipped, adopted software.',
      href: '/work/wuxi-nextcode-familycode',
      link: 'See: WuXi NextCODE',
    },
    {
      line: '…make a regulated workflow usable.',
      description:
        'Clinical, payer, and patient software that satisfies HIPAA and FDA constraints without becoming unusable.',
      href: '/work/3m-coderyte',
      link: 'See: 3M CodeRyte',
    },
    {
      line: '…turn research and IP into a product.',
      description: 'From genomic data to AI tooling, we design the thing customers actually adopt.',
      href: '/work/ipsos-facto',
      link: 'See: Ipsos Facto',
    },
  ],
}

export const stats = [
  { value: 20, suffix: 'yrs', description: 'designing enterprise and healthcare software.', label: 'Founded 2009 · Boston, MA' },
  { value: 60, suffix: '+', description: 'shipped products across enterprises, hospitals, payers, federal agencies, and funded startups.', label: 'Full client list' },
  { value: 91, suffix: '%', description: 'of clients return for a second engagement without a pitch.', label: 'Retention since 2020' },
  { value: 65, suffix: '+', description: 'sponsored open source projects since 2009.', label: 'CC BY 4.0 or Apache 2.0' },
]

export const clients = [
  '3M',
  'Johnson & Johnson',
  'Mass General Hospital',
  'NIH',
  'BD',
  'Walgreens',
  'MITRE',
  'State of Massachusetts',
  'Mount Sinai',
  'Partners Healthcare',
  'WuXi NextCODE',
  'Personal Genome Project',
]

export const openSource = {
  eyebrow: 'The proof is public',
  statement:
    'Our open-source frameworks are used and cited across the field, including by organizations that later hired us.',
  items: [
    {
      href: '/vision/determinants-of-health',
      image: `${imageBase}/determinantsofhealth.jpg`,
      alt: 'Determinants of Health visualization',
      eyebrow: 'Open-source framework',
      title: 'Determinants of Health',
      cite: '2,174 citations, including Wikipedia',
    },
    {
      href: '/work/hgraph',
      image: `${imageBase}/hgraphipad.jpg`,
      alt: 'hGraph displayed on an iPad',
      eyebrow: 'Open health visualization',
      title: 'hGraph',
      cite: 'Used by Walgreens and many other organizations',
    },
    {
      href: '/vision/precision-autism',
      image: `${imageBase}/precisionautismhero.jpg`,
      alt: 'Precision Medicine for Autism vision artwork',
      eyebrow: 'Vision',
      title: 'Precision Medicine for Autism',
      cite: 'Read by industry, NIH, and academia',
    },
  ],
}

export const testimonial = {
  quote: "I haven't yet figured out how they know so much about medicine and its future.",
  name: 'Eric Topol, MD',
  role: 'Founder, Scripps Research Translational Institute',
  image: `${imageBase}/eric-topol.jpg`,
}

export const studio = {
  eyebrow: 'The studio',
  heading: ['Small by Design.', 'Heavy on Experience.'],
  body: 'The people who scope your project are the people who do it. Boston-based and deliberately small.',
}

/** Chapters, in page order, for the progress rail. */
export const chapters = [
  { id: 'opening', label: 'Opening' },
  { id: 'people', label: 'What we saw' },
  { id: 'services', label: 'What we do' },
  { id: 'proof', label: 'Who we do it for' },
  { id: 'open', label: 'The proof is public' },
  { id: 'studio', label: 'The studio' },
  { id: 'book', label: 'Book a call' },
]

/** Review-only Human homepage copy, paired with published capabilities. */
export const humanOfferings = [
  { concern: 'Are we solving the right problem?', title: 'Find the product direction.', description: 'Research with your users, map the system, and test the choices before committing to a build.', href: '/services', link: 'Product strategy & research' },
  { concern: 'Will people trust and use it?', title: 'Make complexity usable.', description: 'Shape AI interactions and connected workflows around clear evidence, human context, and the decisions people make.', href: '/ai', link: 'Interaction & experience design' },
  { concern: 'Can this ship with our team?', title: 'Design through delivery.', description: 'Turn tested prototypes into working software, with your team involved from early decisions through implementation.', href: '/services', link: 'Prototyping & development' },
]

export const humanProof = {
  experience: '20+',
  experienceLabel: 'years designing complex software',
  source: 'https://www.goinvo.com/services/',
  clients: [
    { name: '3M', file: 'logo-3m.svg' },
    { name: 'Johnson & Johnson', file: 'logo-jnj.svg' },
    { name: 'Mass General Hospital', file: 'logo-mgh.svg' },
    { name: 'NIH', file: 'logo-nih.svg' },
    { name: 'Ipsos', file: 'logo-ipsos.svg' },
    { name: 'Walgreens', file: 'logo-walgreens.svg' },
    { name: 'MITRE', file: 'logo-mitre.svg' },
    { name: 'Commonwealth of Massachusetts', file: 'logo-mass.svg' },
    { name: 'BD', file: 'logo-bd.svg' },
    { name: 'Mount Sinai', file: 'logo-mountsinai.svg' },
    { name: 'WuXi NextCODE', file: 'logo-wuxinextcode.svg' },
    { name: 'Partners Healthcare', file: 'logo-partners.svg' },
  ],
  testimonials: [
    { quote: "I haven't yet figured out how they know so much about medicine and its future.", name: 'Eric Topol, MD', organization: 'Scripps Research Translational Institute', source: 'https://www.goinvo.com/' },
    { quote: "With Invo, design wasn’t just design. It impacted our IP portfolio. It changed our business.", name: 'Serban Georgescu, MD', organization: 'InfoBionic', source: 'https://www.goinvo.com/services/' },
  ],
}

/** Work at the scale of big organizations (replaced "Small by design" on the
 * Human page). The same published cases and numbers as `peopleScenes`. */
export const humanEvidence = peopleScenes
export const humanEvidenceSummary = `${stats[1].value}${stats[1].suffix} ${stats[1].description}`
