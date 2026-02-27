type EventParams = Record<string, string | number | boolean>

declare global {
  interface Window {
    gtag?: (...args: [string, string, EventParams?]) => void
  }
}

export function trackEvent(name: string, params?: EventParams) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params)
  }
}

// CTA button interactions
export function trackCtaClick(params: {
  cta_text: string
  cta_location: string
  cta_url?: string
}) {
  trackEvent('cta_click', params)
}

// Case study card clicks on /work
export function trackCaseStudyClick(params: {
  case_study_title: string
  case_study_slug: string
  click_location: string
}) {
  trackEvent('case_study_click', params)
}

// Form completions
export function trackFormSubmit(params: {
  form_name: string
  form_location: string
}) {
  trackEvent('form_submit', params)
}

// Header nav interactions
export function trackNavClick(params: {
  nav_item: string
  nav_type: 'desktop' | 'mobile'
  nav_location: string
}) {
  trackEvent('nav_click', params)
}

// Scroll depth milestones
export function trackScrollDepth(params: {
  percent: number
  page_path: string
}) {
  trackEvent('scroll_depth', params)
}

// Outbound link clicks
export function trackExternalLink(params: {
  url: string
  text: string
  location: string
}) {
  trackEvent('external_link_click', params)
}
