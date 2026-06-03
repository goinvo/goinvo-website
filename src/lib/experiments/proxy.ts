import { getPageExperimentForPath, normalizeExperimentPath } from '@/lib/experiments/registry'

export function shouldProxyMarketingExperiment(pathname: string, method = 'GET') {
  if (method !== 'GET' && method !== 'HEAD') return false

  const normalized = normalizeExperimentPath(pathname)
  if (normalized.startsWith('/__exp')) return false

  return Boolean(getPageExperimentForPath(normalized))
}

export function getExperimentRewritePath(pathname: string, code: string) {
  const normalized = normalizeExperimentPath(pathname)
  if (normalized === '/') return `/__exp/${code}`
  return `/__exp/${code}${normalized}`
}

