import type { SectionBackground } from './sectionBackgrounds'

// Code-side defaults only: a Studio value always wins. Fields editors can set (page meta, author and contributor
// layouts) live on the document, never here; tests/feature-fallbacks.test.ts holds that line.
export interface FeatureSectionBackgroundFallback {
  authorBackground: SectionBackground
  newsletterBackground: SectionBackground
  newsletterCardWidth?: 'standard' | 'narrow'
  peopleSectionPosition?: 'beforeNewsletter' | 'afterNewsletter'
  contributorsBackground?: SectionBackground
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
    peopleSectionPosition: 'afterNewsletter',
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
    peopleSectionPosition: 'afterNewsletter',
    portableTextVariant: 'gray-body',
  },
  'healthcare-ai': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
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
    newsletterBackground: 'gray',
  },
  'virtual-care': {
    authorBackground: 'white',
    newsletterBackground: 'gray',
  },
  'open-source-healthcare': {
    authorBackground: 'gray',
    newsletterBackground: 'gray',
    portableTextVariant: 'gray-body',
  },
  'open-pro': {
    authorBackground: 'gray',
    newsletterBackground: 'white',
    contributorsBackground: 'gray',
    portableTextVariant: 'gray-body',
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
