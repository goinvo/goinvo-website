import { getPrecomputed, type Flag } from 'flags/next'
import {
  getMarketingFlagsSecret,
  home2026Variant,
  marketingExperimentFlags,
  type Home2026Variant,
} from '@/flags'

export type ExperimentPageKind = 'homepage' | 'vision'
export type ExperimentStatus = 'running' | 'paused' | 'draft'

export type PageExperiment<Variant extends string = string> = {
  id: string
  code: string
  kind: ExperimentPageKind
  targetPath: string
  status: ExperimentStatus
  flagKey: string
  flag: Flag<Variant>
  variants: Array<{
    key: Variant
    label: string
  }>
}

export type ExperimentExposure = {
  experiment_id: string
  flag_key: string
  variant: string
  page_path: string
}

export type ForcedExperimentVariant = {
  experiment: PageExperiment
  variant: string
  source: 'variant-param' | 'assignment-param' | 'flag-key-param'
}

export const EXPERIMENT_FORCE_VARIANT_PARAM = 'goinvo_ab_variant'
export const EXPERIMENT_FORCE_ASSIGNMENT_PARAM = 'goinvo_ab'

export const home2026Experiment: PageExperiment<Home2026Variant> = {
  id: 'home-2026',
  code: 'home-2026',
  kind: 'homepage',
  targetPath: '/',
  status: 'running',
  flagKey: home2026Variant.key,
  flag: home2026Variant,
  variants: [
    { key: 'control', label: 'Current homepage' },
    { key: 'concept', label: '2026 concept homepage' },
  ],
}

export const pageExperiments = [home2026Experiment] as const

export function normalizeExperimentPath(pathname: string) {
  if (!pathname || pathname === '/') return '/'
  const withoutQuery = pathname.split('?')[0] || '/'
  const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
  return normalized.replace(/\/+$/, '') || '/'
}

export function getPageExperimentForPath(pathname: string) {
  const targetPath = normalizeExperimentPath(pathname)
  return pageExperiments.find(
    (experiment) =>
      experiment.status === 'running' &&
      normalizeExperimentPath(experiment.targetPath) === targetPath,
  )
}

export function isAllowedExperimentVariant(
  experiment: PageExperiment,
  variant: unknown,
): variant is string {
  return typeof variant === 'string' && experiment.variants.some((entry) => entry.key === variant)
}

export function getExperimentExposure(
  experiment: PageExperiment,
  variant: string,
  pagePath: string,
): ExperimentExposure {
  return {
    experiment_id: experiment.id,
    flag_key: experiment.flagKey,
    variant,
    page_path: normalizeExperimentPath(pagePath),
  }
}

export function getForcedExperimentVariant(
  pathname: string,
  searchParams: URLSearchParams,
): ForcedExperimentVariant | null {
  const experiment = getPageExperimentForPath(pathname)
  if (!experiment) return null

  const flagKeyValue = searchParams.get(experiment.flagKey)
  if (isAllowedExperimentVariant(experiment, flagKeyValue)) {
    return {
      experiment,
      variant: flagKeyValue,
      source: 'flag-key-param',
    }
  }

  const forcedVariant = searchParams.get(EXPERIMENT_FORCE_VARIANT_PARAM)
  if (isAllowedExperimentVariant(experiment, forcedVariant)) {
    return {
      experiment,
      variant: forcedVariant,
      source: 'variant-param',
    }
  }

  const forcedAssignment = searchParams.get(EXPERIMENT_FORCE_ASSIGNMENT_PARAM)
  if (forcedAssignment) {
    const [selector, selectedVariant] = forcedAssignment.includes(':')
      ? forcedAssignment.split(':', 2)
      : ['', forcedAssignment]
    const selectorMatches =
      !selector ||
      selector === experiment.id ||
      selector === experiment.code ||
      selector === experiment.flagKey

    if (selectorMatches && isAllowedExperimentVariant(experiment, selectedVariant)) {
      return {
        experiment,
        variant: selectedVariant,
        source: 'assignment-param',
      }
    }
  }

  return null
}

export function getForcedExperimentUrl(
  href: string,
  variant: string,
  origin = 'https://www.goinvo.com',
) {
  const url = new URL(href || '/', origin)
  url.searchParams.set(EXPERIMENT_FORCE_VARIANT_PARAM, variant)
  return url.toString()
}

export async function getPrecomputedExperimentVariant(pathname: string, code: string) {
  const experiment = getPageExperimentForPath(pathname)
  if (!experiment) return null

  let variant: unknown
  try {
    variant = await getPrecomputed(experiment.flag, marketingExperimentFlags, code, getMarketingFlagsSecret())
  } catch {
    variant = 'control'
  }
  const safeVariant = isAllowedExperimentVariant(experiment, variant) ? variant : 'control'

  return {
    experiment,
    variant: safeVariant,
  }
}

export function validatePageExperimentRegistry(experiments: readonly PageExperiment[] = pageExperiments) {
  const errors: string[] = []
  const flagKeys = new Set<string>()
  const activeTargets = new Map<string, string>()

  for (const experiment of experiments) {
    if (flagKeys.has(experiment.flagKey)) {
      errors.push(`Duplicate experiment flag key: ${experiment.flagKey}`)
    }
    flagKeys.add(experiment.flagKey)

    if (!experiment.variants.some((variant) => variant.key === 'control')) {
      errors.push(`Experiment ${experiment.id} is missing a control variant`)
    }

    if (experiment.status === 'running') {
      const targetPath = normalizeExperimentPath(experiment.targetPath)
      const existing = activeTargets.get(targetPath)
      if (existing) {
        errors.push(`Running experiments ${existing} and ${experiment.id} both target ${targetPath}`)
      }
      activeTargets.set(targetPath, experiment.id)
    }
  }

  return errors
}
