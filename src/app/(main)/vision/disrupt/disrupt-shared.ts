/**
 * Shared utilities and data for the Disrupt! multi-part article.
 */

export const legacyImage = (path: string) =>
  `https://www.goinvo.com/old/images/features/disrupt/${path}`

export const parts = [
  {
    number: 1,
    id: 'emerging-tech',
    label: 'Emerging Technologies',
    href: '/vision/disrupt',
  },
  {
    number: 2,
    id: 'horse-to-horsepower',
    label: 'From Horse to Horsepower',
    href: '/vision/disrupt/part-2',
  },
  {
    number: 3,
    id: 'coming-disruption',
    label: 'The Coming Disruption',
    href: '/vision/disrupt/part-3',
  },
  {
    number: 4,
    id: 'crowdsourcing',
    label: 'Crowdsourcing Innovation',
    href: '/vision/disrupt/part-4',
  },
  {
    number: 5,
    id: 'future-of-design',
    label: 'The Future of Design',
    href: '/vision/disrupt/part-5',
  },
  {
    number: 6,
    id: 'fukushima',
    label: 'Fukushima and Fragility',
    href: '/vision/disrupt/part-6',
  },
] as const
