import { siteConfig } from './config'

export function cloudfrontImage(path: string): string {
  if (path.startsWith('http')) return path
  return `${siteConfig.cloudfrontUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Remove an "Authors" or "Author" h2 heading from portable text blocks
 * to avoid duplication when AuthorSection renders its own heading.
 */
export function stripAuthorHeading(blocks: any[]): any[] {
  return blocks.filter((block) => {
    if (block._type !== 'block' || block.style !== 'h2') return true
    const text = (block.children || [])
      .map((c: any) => c.text || '')
      .join('')
      .trim()
    return text !== 'Authors' && text !== 'Author'
  })
}
