import { renderVisionFeaturePage } from '@/app/(main)/vision/[slug]/page'
import {
  getExperimentExposure,
  getPrecomputedExperimentVariant,
} from '@/lib/experiments/registry'

interface Props {
  params: Promise<{ code: string; slug: string }>
}

export const revalidate = 3600
export const dynamicParams = true
// Served at /vision/<slug> via the A/B rewrite, so it must stay indexable;
// canonicalize to the real vision URL (Google's recommended A/B-test setup).
export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  return { alternates: { canonical: `/vision/${slug}` } }
}

export async function generateStaticParams() {
  return []
}

export default async function ExperimentVisionFeaturePage({ params }: Props) {
  const { code, slug } = await params
  const pagePath = `/vision/${slug}`
  const resolved = await getPrecomputedExperimentVariant(pagePath, code)
  const experiment = resolved
    ? getExperimentExposure(resolved.experiment, resolved.variant, pagePath)
    : undefined

  return renderVisionFeaturePage(slug, resolved?.variant || 'control', experiment)
}
