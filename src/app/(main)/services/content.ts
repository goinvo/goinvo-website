/* The services page's content, shared by the classic page and the new design
   (ServicesHuman, behind the review switch), so the two always say the same thing. */

const IMG = '/images/experiments/home-2026'

export const OFFERINGS = [
  {
    k: 'Expert Review',
    bullets: ['Independent assessment', 'Product audits', 'Risk identification', 'Design refinement'],
    img: `${IMG}/hgraphipad.jpg`,
  },
  {
    k: 'Product Vision',
    bullets: ['Workflow redesign', 'Future state', 'Product strategy', 'Executive alignment'],
    img: `${IMG}/precisionautismhero.jpg`,
  },
  {
    k: 'Software Design',
    bullets: ['Ship product', 'Research & discovery', 'Market validation'],
    img: `${IMG}/ipsosherodark.jpg`,
  },
]

export const REASONS = [
  { t: 'De-risk the project', d: 'We keep work moving through org changes, tight timelines, and shifting priorities so good ideas don’t die on the whiteboard.' },
  { t: 'Find the right problems', d: 'Through research, system mapping, and synthesis, we uncover the real needs that guide smarter investment.' },
  { t: 'Move fast and test often', d: 'We prototype quickly and test with real users and data, reducing risk before it becomes expensive.' },
  { t: 'Deliver & ship', d: 'We integrate with your team to ship better tools, improve performance, and keep strategy evolving.' },
]

export const TIERS = [
  {
    name: 'Design Diagnostic',
    lead: 'A fixed-scope read on where your product stands and what to do next.',
    rows: ['4–8 weeks', 'Two senior designers', 'Fixed scope, fixed outputs'],
    price: '$50K–$90K',
    cta: 'Explore the Design Diagnostic',
    href: '/services/design-diagnostic',
  },
  {
    name: 'Product Launch',
    lead: 'Design and launch working software, end to end.',
    rows: ['2–4 months', 'Full design team', 'Concept through shipped product'],
    price: '$75K–$250K',
    cta: 'Talk about a launch',
    href: '#book',
    featured: true,
  },
  {
    name: 'Embedded Partnership',
    lead: 'We become your long-term product team.',
    rows: ['6–24 months', 'Dedicated embedded team', 'Custom engagement'],
    price: 'Custom',
    cta: 'Discuss a partnership',
    href: '#book',
  },
]

export const SECTORS = [
  {
    k: 'Healthcare',
    sub: 'People’s lives depend on it.',
    d: 'We design software that improves care, reduces friction, and drives better outcomes, from clinical decision support to policy-driven health data systems. Twenty years navigating clinical complexity, policy constraints, and stakeholder needs.',
    bullets: ['Clinical decision support design', 'EHR integrations & patient workflows', 'Public health dashboards', 'Data visualization for policy and advocacy'],
    link: 'Explore our healthcare work',
    href: '/work?category=healthcare',
    img: `${IMG}/hgraphipad.jpg`,
  },
  {
    k: 'Government',
    sub: 'Public trust depends on it.',
    d: 'We design public services that are more modern, usable, equitable, and human. We partner with federal, state, and local agencies to transform the services that matter, from benefits applications to tools for policy makers.',
    bullets: ['Public benefits service design', 'Inclusive research & accessibility audits', 'Prototyping for civic tech and policy', 'Legacy system UX modernization'],
    link: 'Explore our government work',
    href: '/work?category=government',
    img: `${IMG}/snapcover.jpg`,
  },
  {
    k: 'Enterprise',
    sub: 'Business operations depend on it.',
    d: 'We streamline the internal tools and systems that power big organizations, for better alignment, efficiency, and insight. We improve internal platforms, streamline complex workflows, and align business and user goals.',
    bullets: ['Internal platforms & dashboards', 'Enterprise UX audits & redesigns', 'Workflow optimization & team alignment', 'Strategic design for regulated environments'],
    link: 'Explore our enterprise work',
    href: '/work?category=enterprise',
    img: '/images/services/enterprise-dashboard-design.png',
  },
  {
    k: 'AI',
    sub: 'Human judgment depends on it.',
    d: 'We design AI-powered tools that connect humans and machines so they work together seamlessly. We create human-centered interactions that make intelligent tools clear, explainable, and usable, aligned with human needs from day one.',
    bullets: ['UX for ML-powered products', 'Human-AI interaction design', 'Explainability & trust-building interfaces', 'Ethical frameworks & transparency in design'],
    link: 'Explore our AI work',
    href: '/work?category=AI',
    img: `${IMG}/ipsosherodark.jpg`,
  },
]

export const STATS = [
  { v: '20+yrs', cap: 'designing complex software, one studio, deep specialism.' },
  { v: '60+', cap: 'shipped products across regulated enterprises and agencies.' },
  { v: '91%', cap: 'of clients return for more engagements.' },
  { v: '160M+', cap: 'people impacted by GoInvo designs.' },
]
