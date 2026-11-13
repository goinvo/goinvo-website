/**
 * The services page, told from the buyer's side: the question they are facing, then
 * what working with us on it looks like, step by step, and what they hold at the end.
 *
 * Every line is already published somewhere on the site; nothing here is new copy
 * about how we work. Sources, by field:
 * - concern / title / description: the homepage study's offerings (storyContent.ts humanOfferings)
 * - steps for "the right problem": the Design Diagnostic's phases (services/design-diagnostic)
 * - steps for the other two: the services page's reasons (services/content.ts REASONS)
 * - you hold: the Diagnostic's Product Blueprint; the services offerings and AI sector lists
 * - engagement, team, length, investment: services/content.ts TIERS
 * - outcome: the homepage study's evidence (storyContent.ts peopleScenes)
 * Which engagement each question usually starts as is our reading, not a published rule.
 */
import { TIERS } from '@/app/(main)/services/content'

const tier = (name: string) => {
  const found = TIERS.find((entry) => entry.name === name)
  if (!found) throw new Error(`No engagement named ${name}`)
  return found
}

export interface JourneyStep {
  name: string
  does: string[]
}

export interface Journey {
  id: string
  concern: string
  title: string
  description: string
  /** What happens, in order. */
  steps: JourneyStep[]
  /** What the buyer holds at the end. */
  youHold: string[]
  youHoldLabel: string
  engagement: { name: string; length: string; team: string; investment: string; href: string; cta: string }
  outcome?: { figure: string; result: string; client: string; href: string; link: string }
}

const diagnostic = tier('Design Diagnostic')
const launch = tier('Product Launch')

export const JOURNEYS: Journey[] = [
  {
    id: 'direction',
    concern: 'Are we solving the right problem?',
    title: 'Find the product direction.',
    description: 'Research with your users, map the system, and test the choices before committing to a build.',
    steps: [
      { name: 'Reality check', does: ['Stakeholder interviews', 'Workflow review', 'Product teardown'] },
      { name: 'Design to learn', does: ['Rapid concepts', 'Alternative workflows', 'Prototypes'] },
      { name: 'Design the future', does: ['Future-state product', 'Roadmap', 'Leadership decisions'] },
    ],
    youHoldLabel: 'A Product Blueprint',
    youHold: [
      'Product thesis and vision',
      'Future-state prototype of your most important workflows',
      'Reality map: where clinical, operational, regulatory, and adoption risks are',
      'Product priorities: what to build, what to defer, and what to stop',
      'Leadership decisions to make next',
    ],
    engagement: { name: diagnostic.name, length: diagnostic.rows[0], team: diagnostic.rows[1], investment: diagnostic.price, href: diagnostic.href, cta: 'How the Design Diagnostic works' },
  },
  {
    id: 'usable',
    concern: 'Will people trust and use it?',
    title: 'Make complexity usable.',
    description: 'Shape AI interactions and connected workflows around clear evidence, human context, and the decisions people make.',
    steps: [
      { name: 'Find the right problems', does: ['Research with the people who use it', 'System mapping', 'Synthesis'] },
      { name: 'Prototype and test', does: ['Prototype quickly', 'Test with real users and data', 'Refine the design'] },
      { name: 'Ship with your team', does: ['Work alongside your team', 'Ship better tools', 'Keep improving'] },
    ],
    youHoldLabel: 'Interactions people can trust',
    youHold: [
      'Human-AI interaction design',
      'Explainability and trust-building interfaces',
      'Redesigned workflows, tested with real users',
      'Design refinement your team can build',
    ],
    engagement: { name: launch.name, length: launch.rows[0], team: launch.rows[1], investment: launch.price, href: '#book', cta: 'Talk about your product' },
    outcome: {
      figure: '90+%',
      result: 'of Ipsos analysts adopted the AI research platform, because it fit how they already worked.',
      client: 'Ipsos',
      href: '/work/ipsos-facto',
      link: 'Read the Ipsos Facto case study',
    },
  },
  {
    id: 'ship',
    concern: 'Can this ship with our team?',
    title: 'Design through delivery.',
    description: 'Turn tested prototypes into working software, with your team involved from early decisions through implementation.',
    steps: [
      { name: 'Research and discovery', does: ['Research with your users', 'Market validation', 'Your team in the early decisions'] },
      { name: 'Prototype and test', does: ['Tested prototypes', 'Real users, real data', 'Risk found before it gets expensive'] },
      { name: 'Build and ship', does: ['Design with your engineers', 'Shipped product', 'Strategy that keeps evolving'] },
    ],
    youHoldLabel: 'Working software',
    youHold: [
      'A shipped product, from concept through launch',
      'Your team involved from early decisions through implementation',
      'Research and validation behind every decision',
    ],
    engagement: { name: launch.name, length: launch.rows[0], team: launch.rows[1], investment: launch.price, href: '#book', cta: 'Talk about a launch' },
    outcome: {
      figure: '7% → 70%',
      result: 'of SNAP applications now online, once the form fit the people filling it out.',
      client: 'State of Massachusetts',
      href: '/work/mass-snap',
      link: 'Read the SNAP case study',
    },
  },
]

/** For work that outlasts one launch: the third engagement, offered under every journey. */
export const LONG_TERM = tier('Embedded Partnership')
