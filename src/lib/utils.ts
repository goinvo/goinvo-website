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
export function stripAuthorHeading(blocks: any[], opts?: { stripContributors?: boolean }): any[] {
  let skipNextNormal = false
  const stripContrib = opts?.stripContributors ?? false
  return blocks.filter((block) => {
    if (block._type !== 'block') { skipNextNormal = false; return true }
    // Strip "Authors"/"Author" heading in any heading style
    // These are rendered separately by the template from the authors field
    const headingStyles = ['h2', 'h2Center', 'h2Large', 'sectionTitle', 'h3']
    if (headingStyles.includes(block.style)) {
      const text = (block.children || [])
        .map((c: any) => c.text || '')
        .join('')
        .trim()
      if (text === 'Authors' || text === 'Author') {
        skipNextNormal = true
        return false
      }
      // Only strip Contributors heading if the page has a contributors field
      if (stripContrib && text === 'Contributors') {
        skipNextNormal = true
        return false
      }
    }
    // Also strip the plain text block immediately after the author heading
    // (contains inline author names like "Claire Lin Tala Habbab...")
    if (skipNextNormal && block.style === 'normal') {
      skipNextNormal = false
      return false
    }
    skipNextNormal = false
    return true
  })
}

/**
 * Strip the first content block if it's a heading that duplicates the document title.
 * The [slug] route already renders feature.title as h1, so a matching heading
 * in the content creates a visual duplicate.
 */
export function stripTitleHeading(blocks: any[], title: string): any[] {
  if (!blocks.length || !title) return blocks
  const first = blocks[0]
  if (first._type !== 'block' || !['h1', 'h2', 'sectionTitle'].includes(first.style)) return blocks
  const text = (first.children || [])
    .map((c: any) => c.text || '')
    .join('')
    .trim()
    .toLowerCase()
  // Word-overlap match: only strip near-exact duplicates.
  // Threshold 0.85 avoids stripping subtly different sub-headings
  // (e.g. "Fraud, Waste, and Abuse in Healthcare" vs title "Fraud, Waste, Abuse in US Healthcare")
  const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
  const textWords = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
  const overlap = titleWords.filter((w: string) => textWords.includes(w)).length
  const overlapRatio = overlap / Math.max(titleWords.length, textWords.length)
  if (overlapRatio >= 0.85) {
    return blocks.slice(1)
  }
  return blocks
}
