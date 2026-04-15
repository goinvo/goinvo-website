import type { SectionBackground } from './sectionBackgrounds'

export interface FeatureSectionBackgroundFallback {
  authorBackground: SectionBackground
  authorLayout?: 'equal' | 'stacked' | 'stacked-subheading' | 'primary-sidebar' | 'plain-list' | 'legacy-text-list'
  newsletterBackground: SectionBackground
  newsletterCardWidth?: 'standard' | 'narrow'
  contributorsBackground?: SectionBackground
  contributorsLayout?: 'equal' | 'stacked' | 'stacked-subheading' | 'primary-sidebar' | 'plain-list' | 'legacy-text-list'
  showPageMeta?: boolean
  portableTextVariant?: 'case-study' | 'gray-body'
  referencesBackground?: SectionBackground
  forceNewsletterBand?: boolean
}

export const featureSectionBackgroundFallbacks: Record<string, FeatureSectionBackgroundFallback> = {
  'ai-design-certification': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'eligibility-engine': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'fraud-waste-abuse-in-healthcare': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'national-cancer-navigation': {
    authorBackground: 'white',
    authorLayout: 'legacy-text-list',
    contributorsLayout: 'legacy-text-list',
    newsletterBackground: 'gray',
  },
  'history-of-health-design': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'virtual-diabetes-care': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'digital-health-trends-2022': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'faces-in-health-communication': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'test-treat-trace': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'physician-burnout': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'patient-centered-consent': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  vapepocolypse: {
    authorBackground: 'white',
    newsletterBackground: 'white',
    newsletterCardWidth: 'narrow',
  },
  'who-uses-my-health-data': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'healthcare-dollars': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'healthcare-ai': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
    showPageMeta: false,
  },
  'healthcare-dollars-redux': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'human-centered-design-for-ai': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'loneliness-in-our-human-code': {
    authorBackground: 'white',
    contributorsBackground: 'white',
    contributorsLayout: 'stacked-subheading',
    newsletterBackground: 'gray',
  },
  'virtual-care': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'open-source-healthcare': {
    authorBackground: 'gray',
    newsletterBackground: 'gray',
    showPageMeta: false,
    portableTextVariant: 'gray-body',
  },
  'open-pro': {
    authorBackground: 'gray',
    newsletterBackground: 'white',
    contributorsBackground: 'gray',
    referencesBackground: 'gray',
    forceNewsletterBand: true,
  },
  'own-your-health-data': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'precision-autism': {
    authorBackground: 'white',
    newsletterBackground: 'white',
  },
  'rethinking-ai-beyond-chat': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
}
