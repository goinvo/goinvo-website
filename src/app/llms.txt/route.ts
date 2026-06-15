import { siteConfig } from '@/lib/config'
import { client } from '@/sanity/lib/client'
import { allCaseStudiesQuery, allFeaturesQuery } from '@/sanity/lib/queries'
import type { CaseStudy, Feature } from '@/types'

/**
 * /llms.txt — the emerging "AEO/GEO" convention (llmstxt.org): a concise,
 * curated, plain-markdown map of the site for AI answer engines and LLM
 * crawlers (ChatGPT, Perplexity, Claude, Google AI Overviews, …). It gives them
 * an authoritative entity summary + the highest-value links so generated answers
 * cite GoInvo accurately. Mirrors the content the human sitemap exposes, but
 * curated and described in prose rather than a bare URL list.
 *
 * Regenerated hourly; falls back to the static sections if Sanity is unavailable.
 */
export const revalidate = 3600

const { url } = siteConfig

function section(title: string, lines: string[]): string {
  if (lines.length === 0) return ''
  return `## ${title}\n\n${lines.join('\n')}\n`
}

export async function GET() {
  let caseStudies: string[] = []
  let features: string[] = []

  try {
    const studies = await client.fetch<CaseStudy[]>(allCaseStudiesQuery)
    caseStudies = (studies ?? [])
      .filter((s) => s?.slug?.current && s?.title)
      .slice(0, 40)
      .map((s) => `- [${s.title}](${url}/work/${s.slug.current})`)

    const feats = await client.fetch<Feature[]>(allFeaturesQuery)
    features = (feats ?? [])
      .filter((f) => f?.slug?.current && f?.title && !f.externalLink)
      .slice(0, 60)
      .map((f) => `- [${f.title}](${url}/vision/${f.slug.current})`)
  } catch {
    // Sanity not configured — emit the curated sections only.
  }

  const body = [
    `# GoInvo`,
    ``,
    `> GoInvo is a healthcare-focused user-experience design and engineering studio in Arlington, Massachusetts (Greater Boston). We design and build software for patients, clinicians, researchers, and administrators, with a particular focus on open-source health design.`,
    ``,
    `GoInvo (formerly Involution Studios) has delivered 110+ healthcare products for partners including the U.S. Department of Health & Human Services, 3M, Partners HealthCare, and Walgreens. Our work spans electronic health records and clinical software, genomics, public health, the social determinants of health, AI in healthcare, and open-source healthcare design. We pair strategy, design, and engineering in-house.`,
    ``,
    `- Founded: 2004 (Boston, Massachusetts)`,
    `- Location: 661 Massachusetts Ave, 3rd Floor, Arlington, MA 02476, USA`,
    `- Contact: ${siteConfig.email.info}`,
    ``,
    section('Services', [
      `- [Services overview](${url}/services): healthcare UX strategy, design, and engineering.`,
      `- [Enterprise healthcare design](${url}/enterprise): design systems and software for large health organizations.`,
      `- [Government](${url}/government): public-sector and public-health design.`,
      `- [AI in healthcare](${url}/ai): designing trustworthy clinical and patient-facing AI.`,
      `- [Patient engagement](${url}/patient-engagement): tools that help patients manage their own health.`,
      `- [Why hire a healthcare design studio](${url}/why-hire-healthcare-design-studio): how GoInvo works and why specialization matters.`,
    ]),
    section('Selected work (case studies)', caseStudies),
    section('Vision, research & open-source design', [
      `- [Vision](${url}/vision): essays, research, and visualizations on the future of healthcare.`,
      `- [Open Source Health Design](${url}/open-source-health-design): GoInvo's open-source healthcare projects and philosophy.`,
      ...features,
    ]),
    section('About', [
      `- [About GoInvo](${url}/about): team, studio, and code of ethics.`,
      `- [Careers](${url}/about/careers): join the team.`,
      `- [Contact](${url}/contact): start a project or ask a question.`,
    ]),
    section('More', [`- [Full sitemap](${url}/sitemap.xml)`]),
  ]
    .filter(Boolean)
    .join('\n')

  return new Response(body.trimEnd() + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
