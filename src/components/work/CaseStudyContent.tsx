'use client'

import { urlForImage } from '@/sanity/lib/image'
import { caseStudyBySlugQuery } from '@/sanity/lib/queries'
import { useLiveData } from '@/components/sanity/LiveData'
import { CaseStudyLayout } from '@/components/work/CaseStudyLayout'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import type { CaseStudy } from '@/types'
import type { PortableTextBlock } from '@portabletext/types'

interface Props {
  initialData: CaseStudy
  slug: string
}

interface BlockChild {
  _key?: string
  _type?: string
  marks?: string[]
  text?: string
}

type LoosePortableTextBlock = PortableTextBlock & {
  _type: string
  alt?: string
  caption?: string
  link?: string
  style?: string
  layout?: string
  size?: string
  variant?: string
  buttons?: Array<{ label?: string }>
}

function blockText(block?: PortableTextBlock): string {
  if (block?._type !== 'block') return ''

  return ((block.children as BlockChild[]) || [])
    .map((child) => child.text || '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function createSectionTitleBlock(key: string, text: string): PortableTextBlock {
  return {
    _key: key,
    _type: 'block',
    children: [
      {
        _key: `${key}-span`,
        _type: 'span',
        marks: [],
        text,
      },
    ],
    markDefs: [],
    style: 'sectionTitle',
  } as PortableTextBlock
}

function createDividerBlock(key: string): LoosePortableTextBlock {
  return {
    _key: key,
    _type: 'divider',
    style: 'default',
  } as LoosePortableTextBlock
}

function isLeadingClientSubtitle(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return normalized.length > 0 && normalized.length <= 80 && /^for(\s+the)?\s+/.test(normalized)
}

function stripDuplicatedSuperscriptParentheticals(block: LoosePortableTextBlock): LoosePortableTextBlock {
  if (block._type !== 'block' || !Array.isArray(block.children)) {
    return block
  }

  let changed = false
  const children = (block.children as BlockChild[]).map((child, index, source) => {
    const previousChild = source[index - 1]
    const previousSupText = previousChild?.marks?.includes('sup') ? previousChild.text?.trim() : ''

    if (!previousSupText || !/^\d+$/.test(previousSupText) || !child.text) {
      return child
    }

    const normalizedText = child.text.replace(new RegExp(`^\\(${previousSupText}\\)`), '')
    if (normalizedText === child.text) {
      return child
    }

    changed = true
    return {
      ...child,
      text: normalizedText,
    }
  })

  return changed
    ? {
        ...block,
        children,
      } as LoosePortableTextBlock
    : block
}

function transformCaseStudyForSlug(caseStudy: CaseStudy, slug: string): CaseStudy {
  if (!caseStudy.content?.length) {
    return caseStudy
  }

  const content = [...caseStudy.content] as LoosePortableTextBlock[]
  let changed = false

  if (slug === 'mitre-state-of-us-healthcare') {
    const largeScaleIndex = content.findIndex(
      (block) => blockText(block) === 'Large scale technical storytelling, for a technical audience'
    )
    const firstLargeScaleParagraphIndex = content.findIndex(
      (block, index) =>
        index > largeScaleIndex &&
        blockText(block).startsWith('A touchscreen data wall made up of 12 LCD panels side by side')
    )

    if (largeScaleIndex >= 0 && firstLargeScaleParagraphIndex > largeScaleIndex) {
      const duplicateImageIndex = content.findIndex(
        (block, index) => index > largeScaleIndex && index < firstLargeScaleParagraphIndex && block._type === 'image'
      )

      if (duplicateImageIndex >= 0) {
        content.splice(duplicateImageIndex, 1)
        changed = true
      }
    }

    const healthIndicatorsLink = 'https://docs.google.com/spreadsheets/d/1eef_1BK6gipOuhxpdXWnQ8eQdp1ZssjwUupKs7oITdc/edit?usp=sharing'
    const healthIndicatorsIndex = content.findIndex((block) => blockText(block) === 'Global Health Indicators List')
    if (healthIndicatorsIndex >= 0) {
      const imageIndex = content.findIndex((block, index) => {
        if (index <= healthIndicatorsIndex || block._type !== 'image') return false

        const alt = (block.alt || '').toLowerCase()
        const caption = (block.caption || '').toLowerCase()
        return alt.includes('health indicator') || caption.includes('health indicator')
      })

      if (imageIndex >= 0) {
        const imageBlock = content[imageIndex]
        if (imageBlock.link !== healthIndicatorsLink) {
          content[imageIndex] = { ...imageBlock, link: healthIndicatorsLink }
          changed = true
        }
      }
    }
  }

  if (slug === 'mitre-flux-notes') {
    const buttonGroupIndex = content.findIndex(
      (block) =>
        block._type === 'buttonGroup' &&
        Array.isArray(block.buttons) &&
        block.buttons.some((button) => button?.label === 'Designs on GitHub')
    )

    if (buttonGroupIndex >= 0) {
      const buttonGroup = content[buttonGroupIndex]
      if (buttonGroup.layout !== 'inline' || buttonGroup.size !== 'large') {
        content[buttonGroupIndex] = {
          ...buttonGroup,
          layout: 'inline',
          size: 'large',
        }
        changed = true
      }
    }

    const solutionMarkerIndex = content.findIndex(
      (block) => blockText(block) === 'Capture structured data during note authoring'
    )
    if (
      solutionMarkerIndex >= 0 &&
      blockText(content[solutionMarkerIndex - 1] as PortableTextBlock) !== 'Solution'
    ) {
      content.splice(solutionMarkerIndex, 0, createSectionTitleBlock('mitre-flux-solution-heading', 'Solution'))
      changed = true
    }

    const resultsMarkerIndex = content.findIndex(
      (block) => blockText(block) === 'Gained partners in exploring innovative data capture methods'
    )
    if (
      resultsMarkerIndex >= 0 &&
      blockText(content[resultsMarkerIndex - 1] as PortableTextBlock) !== 'Results'
    ) {
      content.splice(resultsMarkerIndex, 0, createSectionTitleBlock('mitre-flux-results-heading', 'Results'))
      changed = true
    }
  }

  if (slug === 'fastercures-health-data-basics') {
    const buttonGroupIndex = content.findIndex(
      (block) =>
        block._type === 'buttonGroup' &&
        Array.isArray(block.buttons) &&
        block.buttons.some((button) => button?.label === 'View on GitHub')
    )

    if (buttonGroupIndex >= 0) {
      const buttonGroup = content[buttonGroupIndex]
      if (buttonGroup.layout !== 'centered' || buttonGroup.size !== 'large') {
        content[buttonGroupIndex] = {
          ...buttonGroup,
          layout: 'centered',
          size: 'large',
        }
        changed = true
      }
    }

    const educationalPluginsIndex = content.findIndex(
      (block) => blockText(block) === 'Educational open source plugins'
    )
    if (educationalPluginsIndex >= 0) {
      let solutionInsertIndex = educationalPluginsIndex
      for (let index = educationalPluginsIndex - 1; index >= 0; index -= 1) {
        if (content[index]?._type === 'image') {
          solutionInsertIndex = index
          break
        }
      }

      if (blockText(content[solutionInsertIndex - 1] as PortableTextBlock) !== 'Solution') {
        content.splice(
          solutionInsertIndex,
          0,
          createSectionTitleBlock('fastercures-solution-heading', 'Solution')
        )
        changed = true
      }
    }

    const resultsIndex = content.findIndex((block) => block._type === 'results')
    if (resultsIndex >= 0) {
      const resultsBlock = content[resultsIndex]
      if (resultsBlock.variant !== 'legacyRow') {
        content[resultsIndex] = {
          ...resultsBlock,
          variant: 'legacyRow',
        }
        changed = true
      }

      if (blockText(content[resultsIndex - 1] as PortableTextBlock) !== 'Results') {
        content.splice(
          resultsIndex,
          0,
          createDividerBlock('fastercures-results-divider'),
          createSectionTitleBlock('fastercures-results-heading', 'Results')
        )
        changed = true
      }
    }
  }

  if (slug === 'mount-sinai-consent') {
    const normalizedContent = content.map(stripDuplicatedSuperscriptParentheticals)
    if (normalizedContent.some((block, index) => block !== content[index])) {
      content.splice(0, content.length, ...normalizedContent)
      changed = true
    }
  }

  return changed ? { ...caseStudy, content: content as PortableTextBlock[] } : caseStudy
}

export function CaseStudyContent({ initialData, slug }: Props) {
  const caseStudy = useLiveData(initialData, caseStudyBySlugQuery, { slug })

  if (!caseStudy) return null

  const firstContentBlock = caseStudy.content?.[0]
  const firstContentChildren: BlockChild[] =
    firstContentBlock?._type === 'block' ? (firstContentBlock.children as BlockChild[]) || [] : []
  const firstContentText = firstContentChildren
    .map((child) => child.text || '')
    .join('')
    .trim()
  const hasLeadingClientSubtitle = firstContentBlock?._type === 'block' && isLeadingClientSubtitle(firstContentText)
  const showClientSubtitle =
    (hasLeadingClientSubtitle || (!!caseStudy.client && caseStudy.client !== 'GoInvo')) &&
    !caseStudy.hideClientSubtitle
  const normalizedCaseStudy = hasLeadingClientSubtitle
    ? { ...caseStudy, content: caseStudy.content?.slice(1) }
    : caseStudy
  const transformedCaseStudy = transformCaseStudyForSlug(normalizedCaseStudy, slug)

  // Hero is 1280x450 (~2.84:1) so use a closer aspect than 16:9 to
  // minimize top/bottom cropping at desktop widths
  const heroImageUrl = caseStudy.image?.asset
    ? urlForImage(caseStudy.image).width(1600).height(564).url()
    : null

  return (
    <div>
      {heroImageUrl && <SetCaseStudyHero image={heroImageUrl} />}

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1
            className="header-xl mt-8 mb-2"
            style={{ viewTransitionName: 'page-title' }}
          >
            {caseStudy.heading || caseStudy.title}
          </h1>
          {showClientSubtitle && (
            <p className="text-gray mt-0 mb-8">
              {hasLeadingClientSubtitle
                ? firstContentChildren.map((child, index) => {
                    const text = child.text || ''
                    if (!text) return null

                    let content = <>{text}</>
                    if (child.marks?.includes('strong')) {
                      content = <strong>{content}</strong>
                    }
                    if (child.marks?.includes('em')) {
                      content = <em>{content}</em>
                    }

                    return <span key={child._key || `${index}-${text}`}>{content}</span>
                  })
                : <>for {caseStudy.client}</>}
            </p>
          )}
        </div>
      </Reveal>

      <CaseStudyLayout caseStudy={transformedCaseStudy} />
    </div>
  )
}
