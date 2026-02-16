import { siteConfig } from './config'

export function cloudfrontImage(path: string): string {
  if (path.startsWith('http')) return path
  return `${siteConfig.cloudfrontUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
