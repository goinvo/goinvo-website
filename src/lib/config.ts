export const siteConfig = {
  title: 'GoInvo',
  description:
    'GoInvo is a Boston user experience design firm specializing in healthcare innovation.',
  url: 'https://www.goinvo.com',
  address: {
    street: '661 Mass Ave',
    city: 'Arlington',
    state: 'MA',
    zip: '02476',
    mapUrl:
      'https://www.google.com/maps/place/661+Massachusetts+Ave,+Arlington,+MA+02476/@42.4161234,-71.1563006,17z/',
  },
  email: {
    info: 'info@goinvo.com',
    hello: 'hello@goinvo.com',
    careers: 'careers@goinvo.com',
  },
  social: {
    linkedin: 'https://www.linkedin.com/company/goinvo/',
    twitter: 'https://twitter.com/goinvo',
    medium: 'https://medium.com/@goinvo',
    flickr: 'https://www.flickr.com/photos/juhansonin/',
    soundcloud: 'https://soundcloud.com/involution-studios',
  },
  cloudfrontUrl: 'https://dd17w042cevyt.cloudfront.net',
  typekitId: 'luw8hiq',
  jotformId: '251276832519159',
  mailerlite: {
    formId: '25168203',
    accountId: '1457992',
    formEndpoint:
      'https://assets.mailerlite.com/jsonp/1457992/forms/152494406199412364/subscribe',
  },
  hubspot: {
    portalId: '356419',
    contactFormId: '888955e3-1618-46d8-b553-c06a855723be',
    newsletterFormId: '7bb39794-e6f9-4c94-9b26-e7de3a81f716',
    newsletterFullFormId: '42f0daf8-2815-4436-9f44-8e70fd91bd7a',
    applicationFormId: '953741a9-2774-4205-9b72-16f551c1139d',
  },
  analytics: {
    ga4Id: 'G-P00K4KL2Y9',
    googleAdsId: 'AW-973476681',
    googleAdsConversionLabel: 'oygPCN6t2W4QyaaY0AM',
  },
  chatlio: {
    widgetId: '413f13c1-0a3b-447f-45a6-f99b340d8c78',
    allowedHosts: ['goinvo.com', 'www.goinvo.com'],
  },
  blogFeedUrl: 'https://yes.goinvo.com/articles/rss.xml',
  maxWidth: {
    default: 1020,
    sm: 600,
    md: 775,
  },
  imageDimensions: [600, 900, 1200, 1500, 2000],
} as const

export const navItems = [
  { href: '/work', title: 'Work' },
  { href: '/services', title: 'Services', hideOnMobile: true },
  { href: '/about', title: 'About', hideOnMobile: true },
  { href: '/vision', title: 'Vision' },
  { href: '/open-source-health-design', title: 'Open Design', hideOnMobile: true },
] as const

export const footerLinks = {
  primary: [
    { href: '/', title: 'Home' },
    { href: '/work', title: 'Work' },
    { href: '/services', title: 'Services' },
  ],
  secondary: [
    { href: '/about', title: 'About' },
    { href: '/about/careers', title: 'Careers' },
    { href: '/about/open-office-hours', title: 'Open Office Hours' },
  ],
  tertiary: [
    { href: '/vision', title: 'Vision' },
  ],
  contact: [
    { href: '/contact', title: 'Contact Us' },
  ],
} as const
