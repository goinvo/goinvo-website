import { siteConfig } from './config'

export function cloudfrontImage(path: string): string {
  if (path.startsWith('http')) return path
  return `${siteConfig.cloudfrontUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

const portableHeadingStyles = [
  'h1',
  'h2',
  'h2Center',
  'h2Large',
  'h2SpaciousTop',
  'sectionTitle',
  'h3',
  'h3Centered',
  'h3Orange',
  'h4',
  'h4Bullet',
  'h4LegacySm',
  'h4NoBottom',
]

type PortableTextBlockLike = {
  _type?: unknown
  style?: unknown
  children?: unknown[]
}

function isPortableTextBlockLike(block: unknown): block is PortableTextBlockLike {
  return Boolean(block && typeof block === 'object' && '_type' in block)
}

function textFromPortableBlock(block: PortableTextBlockLike): string {
  return (block.children || [])
    .map((child) => {
      if (!child || typeof child !== 'object' || !('text' in child)) {
        return ''
      }

      const text = child.text
      return typeof text === 'string' ? text : ''
    })
    .join('')
    .trim()
}

export function findPortableHeading(
  blocks: unknown[] | undefined,
  labels: string[],
): string | undefined {
  for (const block of blocks || []) {
    if (!isPortableTextBlockLike(block) || block._type !== 'block') continue

    if (typeof block.style !== 'string' || !portableHeadingStyles.includes(block.style)) continue

    const text = textFromPortableBlock(block)

    if (labels.includes(text)) {
      return text
    }
  }

  return undefined
}

/**
 * Remove an "Authors" or "Author" h2 heading from portable text blocks
 * to avoid duplication when AuthorSection renders its own heading.
 */
export function stripAuthorHeading<T>(
  blocks: T[],
  opts?: { stripContributors?: boolean },
): T[] {
  let skipNextNormal = false
  const stripContrib = opts?.stripContributors ?? false
  return blocks.filter((block) => {
    if (!isPortableTextBlockLike(block) || block._type !== 'block') { skipNextNormal = false; return true }
    // Strip "Authors"/"Author" heading in any heading style
    // These are rendered separately by the template from the authors field
    if (typeof block.style === 'string' && portableHeadingStyles.includes(block.style)) {
      const text = textFromPortableBlock(block)
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
export function stripTitleHeading<T>(blocks: T[], title: string): T[] {
  if (!blocks.length || !title) return blocks
  const first = blocks[0]
  if (
    !isPortableTextBlockLike(first) ||
    first._type !== 'block' ||
    typeof first.style !== 'string' ||
    !['h1', 'h2', 'h2Large', 'sectionTitle'].includes(first.style)
  ) {
    return blocks
  }
  const text = textFromPortableBlock(first)
    .toLowerCase()
  // Word-overlap match: only strip near-exact duplicates.
  // Threshold 0.85 avoids stripping subtly different sub-headings
  // (e.g. "Fraud, Waste, and Abuse in Healthcare" vs title "Fraud, Waste, Abuse in US Healthcare")
  const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
  const textWords = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2)
  const overlap = titleWords.filter((w: string) => textWords.includes(w)).length
  const overlapRatio = overlap / Math.max(titleWords.length, textWords.length)
  if (overlapRatio >= 0.6) {
    return blocks.slice(1)
  }
  return blocks
}
