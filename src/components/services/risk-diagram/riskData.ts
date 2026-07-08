// Shared data for the five-risk section design experiments.
export const RISKS = [
  {
    key: 'clinical',
    title: 'Clinical risk',
    question: 'Does it fit how clinicians actually think, decide, and act?',
  },
  {
    key: 'operational',
    title: 'Operational complexity',
    question: 'Can your organization run it without drowning in complexity?',
  },
  {
    key: 'workflow',
    title: 'Workflow failures',
    question: 'Does it survive the messy reality of day-to-day care?',
  },
  {
    key: 'adoption',
    title: 'Adoption problems',
    question: 'Will clinicians and patients believe what it tells them?',
  },
  {
    key: 'strategy',
    title: 'Product strategy',
    question: 'Are you building the right product and not just building it right?',
  },
] as const

export type Risk = (typeof RISKS)[number]
