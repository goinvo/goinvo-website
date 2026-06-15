import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/config'

const DISALLOW = ['/studio/', '/api/', '/thank-you']

// AI answer-engine / LLM crawlers we explicitly welcome (GEO/AEO): being cited
// by ChatGPT, Perplexity, Claude, Google AI Overviews, etc. is the goal, so we
// allow them the same access as a normal search crawler. `*` already permits
// them — naming them is an explicit, durable signal of intent.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
