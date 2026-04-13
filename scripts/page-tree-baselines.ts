/**
 * Known-good baseline pages transcribed from the 2026-04-13 audit screenshot.
 *
 * Assumption:
 * - Green thumbs indicate approved / known-good parity.
 * - Yellow thumbs indicate review-needed pages that are visible in the same list.
 */

export type BaselineSection = 'vision' | 'work' | 'main'
export type BaselineStatus = 'approved' | 'review'

export interface PageTreeBaselinePage {
  slug: string
  label: string
  path: string
  section: BaselineSection
  status: BaselineStatus
  source: string
}

const SCREENSHOT_SOURCE = 'Screenshot 2026-04-13 130351'

const VISION_SCREENSHOT_BASELINES: PageTreeBaselinePage[] = [
  { slug: 'ai-design-certification', label: 'AI Design Certification', path: '/vision/ai-design-certification', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'rethinking-ai-beyond-chat', label: 'Rethinking AI Beyond Chat', path: '/vision/rethinking-ai-beyond-chat', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'human-centered-design-for-ai', label: 'Human Centered Design for AI', path: '/vision/human-centered-design-for-ai', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'visual-storytelling-with-genai', label: 'Visual Storytelling with GenAI', path: '/vision/visual-storytelling-with-genai', section: 'vision', status: 'review', source: SCREENSHOT_SOURCE },
  { slug: 'healthcare-dollars-redux', label: 'Healthcare Dollars Redux', path: '/vision/healthcare-dollars-redux', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'eligibility-engine', label: 'Eligibility Engine', path: '/vision/eligibility-engine', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'fraud-waste-abuse-in-healthcare', label: 'Fraud Waste Abuse', path: '/vision/fraud-waste-abuse-in-healthcare', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'augmented-clinical-decision-support', label: 'Augmented Clinical Decision Support', path: '/vision/augmented-clinical-decision-support', section: 'vision', status: 'review', source: SCREENSHOT_SOURCE },
  { slug: 'health-design-thinking', label: 'Health Design Thinking', path: '/vision/health-design-thinking', section: 'vision', status: 'review', source: SCREENSHOT_SOURCE },
  { slug: 'national-cancer-navigation', label: 'National Cancer Navigation', path: '/vision/national-cancer-navigation', section: 'vision', status: 'review', source: SCREENSHOT_SOURCE },
  { slug: 'history-of-health-design', label: 'History of Health Design', path: '/vision/history-of-health-design', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'living-health-lab', label: 'Living Health Lab', path: '/vision/living-health-lab', section: 'vision', status: 'review', source: SCREENSHOT_SOURCE },
  { slug: 'virtual-diabetes-care', label: 'Virtual Diabetes Care', path: '/vision/virtual-diabetes-care', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'public-healthroom', label: 'Public Healthroom', path: '/vision/public-healthroom', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'primary-self-care-algorithms', label: 'Primary Self Care Algorithms', path: '/vision/primary-self-care-algorithms', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
  { slug: 'digital-health-trends-2022', label: 'Digital Health Trends 2022', path: '/vision/digital-health-trends-2022', section: 'vision', status: 'approved', source: SCREENSHOT_SOURCE },
]

export const PAGE_TREE_BASELINE_SETS: Record<string, PageTreeBaselinePage[]> = {
  'vision-visible': VISION_SCREENSHOT_BASELINES,
  'vision-approved': VISION_SCREENSHOT_BASELINES.filter(page => page.status === 'approved'),
  'vision-review': VISION_SCREENSHOT_BASELINES.filter(page => page.status === 'review'),
}

export function getPageTreeBaselineSet(name: string): PageTreeBaselinePage[] {
  return PAGE_TREE_BASELINE_SETS[name] ?? []
}

export function listPageTreeBaselineSets(): string[] {
  return Object.keys(PAGE_TREE_BASELINE_SETS).sort()
}
