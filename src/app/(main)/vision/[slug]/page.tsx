import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { featureBySlugQuery, allFeaturesQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import { NewsletterSection } from '@/components/forms/NewsletterSection'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'
import { resolveSectionBackground } from '@/lib/sectionBackgrounds'
import { featureSectionBackgroundFallbacks } from '@/lib/featureSectionBackgroundFallbacks'
import { findPortableHeading, stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
import type { Feature } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

function textFromPortableBlock(block: any): string { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (block?._type !== 'block') return ''
  return (block.children || []).map((child: any) => child.text || '').join('') // eslint-disable-line @typescript-eslint/no-explicit-any
}

function createBulletBlock(key: string, text: string, level = 2) {
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
    level,
    listItem: 'bullet',
    markDefs: [],
    style: 'normal',
  }
}

function normalizeSupFollowerSpacing(block: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (block?._type !== 'block' || !Array.isArray(block.children)) {
    return block
  }

  let changed = false
  const children = block.children.map((child: any, index: number, source: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (index === 0 || typeof child?.text !== 'string') {
      return child
    }

    const previousChild = source[index - 1]
    const followsSupCitation = Array.isArray(previousChild?.marks) && previousChild.marks.includes('sup')
    if (!followsSupCitation) {
      return child
    }

    if (/^\s/.test(child.text) || /^[,.;:!?)]/.test(child.text)) {
      return child
    }

    changed = true
    return {
      ...child,
      text: ` ${child.text}`,
    }
  })

  return changed ? { ...block, children } : block
}

function transformFeatureContentForSlug(slug: string, content: any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (slug === 'healthcare-ai') {
    const transformed: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any

    for (const block of content) {
      if (block?._type === 'videoEmbed' && typeof block.url === 'string' && block.url.includes('/videos/features/healthcare-ai/')) {
        transformed.push({
          ...block,
          poster: block.poster || block.url
            .replace('/videos/features/healthcare-ai/', '/images/features/healthcare-ai/')
            .replace(/\.(mp4|webm|mov|ogv)(\?|$)/i, '.jpg$2'),
        })
        continue
      }

      if (
        block?._type === 'columns' &&
        block?.layout === '2' &&
        Array.isArray(block.content) &&
        block.content.length === 2 &&
        block.content[0]?._type === 'image' &&
        block.content[1]?._type === 'block'
      ) {
        const [imageBlock, textBlock] = block.content
        const text = textFromPortableBlock(textBlock)

        if ((textBlock.children || []).some((child: any) => child?.marks?.includes('em'))) { // eslint-disable-line @typescript-eslint/no-explicit-any
          transformed.push(
            { ...imageBlock, _key: `${imageBlock._key || block._key}-image` },
            { ...textBlock, _key: `${textBlock._key || block._key}-text` },
          )
          continue
        }

        if (text === "At the end AiHealth asks if they'd like any help or suggestions to feel better.") {
          transformed.push(
            {
              ...imageBlock,
              _key: `${imageBlock._key || block._key}-image`,
              caption: imageBlock.caption || imageBlock.alt || '',
            },
            { ...textBlock, _key: `${textBlock._key || block._key}-text` },
          )
          continue
        }
      }

      transformed.push(block)
    }

    const missingLiveSupportBullet = "Helps the patient keep track of to-do lists and care plans"
    if (!transformed.some((block) => textFromPortableBlock(block) === missingLiveSupportBullet)) {
      const liveSupportTailIndex = transformed.findIndex(
        (block) => textFromPortableBlock(block) === 'Helps identify missing information needed for optimal care'
      )

      if (liveSupportTailIndex >= 0) {
        transformed.splice(
          liveSupportTailIndex + 1,
          0,
          createBulletBlock('healthcare-ai-live-support-care-plans', missingLiveSupportBullet)
        )
      }
    }

    const missingEmergencyBullet = 'Helps during emergencies, like suggesting who to call'
    if (!transformed.some((block) => textFromPortableBlock(block) === missingEmergencyBullet)) {
      const justInTimeTailIndex = transformed.findIndex(
        (block) => textFromPortableBlock(block) === "Reaches out if it identifies that I'm in crisis"
      )

      if (justInTimeTailIndex >= 0) {
        transformed.splice(
          justInTimeTailIndex + 1,
          0,
          createBulletBlock('healthcare-ai-just-in-time-emergency', missingEmergencyBullet)
        )
      }
    }

    return transformed
  }

  if (slug === 'national-cancer-navigation') {
    return content.map((block) => {
      if (
        block?._type === 'buttonGroup' &&
        Array.isArray(block.buttons) &&
        block.buttons.some((button: any) => button?.label?.includes('Cancer Navigation Process')) // eslint-disable-line @typescript-eslint/no-explicit-any
      ) {
        return {
          ...block,
          layout: 'textLinks',
        }
      }

      return block
    })
  }

  if (slug === 'open-pro') {
    const regularGrayParagraphs = new Set([
      'The patient can initiate communication of relevant medical data with the doctor to send outcomes, align priorities, and arrange the care they need.',
      'The patient records her own experiences and pushes it to the health record. Her doctor can then spend more face-to-face time discussing her care, rather than conducting time-consuming interviews and performing data entry.',
      'PRO tools allow the patient to report clinically relevant information at the point of pain, when it is most reliable, to inform the most appropriate treatments. Over the course of treatment, the PRO promotes accurate recordings of outcomes to advance changes when needed.',
      'The patient provides invaluable data on treatment outcomes. The data is accurate, timely, and multi-dimensional. These qualities of data are possible only with many patients’ voices.',
    ])
    const grayNoTopParagraphs = new Set([
      'Design and Development v1.0: 8 weeks, 1.0FTE',
      'Development v1.0: 6 weeks, 1.0FTE',
      'Development of minimal service: 6 weeks, 1.0FTE',
    ])

    return content.map((block) => {
      const normalizedBlock = normalizeSupFollowerSpacing(block)
      const text = textFromPortableBlock(normalizedBlock)

      if (normalizedBlock?._type === 'block' && text === 'Your Patient Reported Outcome is a direct connection between you, the source of critical medical data, and the decisions regarding your care and the future of the health system.') {
        return {
          ...normalizedBlock,
          style: 'h4Bold',
        }
      }

      if (
        normalizedBlock?._type === 'block' &&
        (
          regularGrayParagraphs.has(text) ||
          text.startsWith('The patient is able choose treatments, personalized to their needs')
        )
      ) {
        return {
          ...normalizedBlock,
          style: 'normalGrayStandard',
        }
      }

      if (normalizedBlock?._type === 'block' && grayNoTopParagraphs.has(text)) {
        return {
          ...normalizedBlock,
          style: 'normalGrayNoTop',
        }
      }

      if (
        normalizedBlock?._type === 'buttonGroup' &&
        Array.isArray(normalizedBlock.buttons) &&
        normalizedBlock.buttons.some((button: any) => button?.label === 'Contribute on GitHub') // eslint-disable-line @typescript-eslint/no-explicit-any
      ) {
        return {
          ...normalizedBlock,
          layout: 'fullWidth',
        }
      }

      return normalizedBlock
    })
  }

  if (slug === 'virtual-care') {
    if (content.some((block: any) => block?._type === 'results')) { // eslint-disable-line @typescript-eslint/no-explicit-any
      return content
    }

    const faceToFaceText = 'face-to-face clinical office visits every year'
    const virtualText = 'can be conducted virtually'
    const nextContent = [...content]
    const blockText = (block: any) => textFromPortableBlock(block) // eslint-disable-line @typescript-eslint/no-explicit-any

    const resultsBlock = {
      _key: 'virtual-care-results-band',
      _type: 'results',
      variant: 'statBand',
      background: 'none',
      items: [
        {
          _key: 'virtual-care-results-face-to-face',
          _type: 'object',
          stat: '990',
          unit: 'M',
          description: faceToFaceText,
          refNumber: '1',
          refTarget: 'references',
        },
        {
          _key: 'virtual-care-results-virtual',
          _type: 'object',
          stat: '459',
          unit: 'M',
          annotation: '(46%)',
          description: virtualText,
        },
      ],
    }

    const introIndex = nextContent.findIndex((block) =>
      blockText(block) === 'Half of face-to-face clinical office visits can be conducted virtually.'
    )

    const faceToFaceIndex = introIndex >= 0 && blockText(nextContent[introIndex + 1]).startsWith(faceToFaceText)
      ? introIndex + 1
      : nextContent.findIndex((block) => blockText(block).startsWith(faceToFaceText))
    const virtualIndex = faceToFaceIndex >= 0 && blockText(nextContent[faceToFaceIndex + 1]) === virtualText
      ? faceToFaceIndex + 1
      : nextContent.findIndex((block) => blockText(block) === virtualText)

    if (faceToFaceIndex >= 0 && virtualIndex === faceToFaceIndex + 1) {
      nextContent.splice(faceToFaceIndex, 2, resultsBlock as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      return nextContent
    }

    if (introIndex >= 0) {
      nextContent.splice(introIndex + 1, 0, resultsBlock as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      return nextContent
    }

    return [resultsBlock as any, ...nextContent] // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  if (slug !== 'open-source-healthcare') {
    return content
  }

  const cloned = content.map((block) => {
    if (block?._type === 'buttonGroup') {
      return {
        ...block,
        buttons: Array.isArray(block.buttons) ? block.buttons.map((button: any) => ({ ...button })) : [], // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    }
    return { ...block }
  })

  const readNowGroupIndex = cloned.findIndex((block) => block._type === 'buttonGroup' && block.buttons?.some((button: any) => button.label === 'Read now')) // eslint-disable-line @typescript-eslint/no-explicit-any
  const downloadGroupIndex = cloned.findIndex((block) => block._type === 'buttonGroup' && block.buttons?.some((button: any) => button.label === 'Download 25 MB PDF')) // eslint-disable-line @typescript-eslint/no-explicit-any

  const readNowGroup = readNowGroupIndex >= 0 ? cloned[readNowGroupIndex] : null
  const downloadGroup = downloadGroupIndex >= 0 ? cloned[downloadGroupIndex] : null
  const readNowButton = readNowGroup?.buttons?.find((button: any) => button.label === 'Read now') // eslint-disable-line @typescript-eslint/no-explicit-any
  const blurbButton = readNowGroup?.buttons?.find((button: any) => button.label === '$12 Blurb Magazine') // eslint-disable-line @typescript-eslint/no-explicit-any
  const downloadButton = downloadGroup?.buttons?.find((button: any) => button.label === 'Download 25 MB PDF') // eslint-disable-line @typescript-eslint/no-explicit-any

  const contentWithoutOriginalButtons = cloned.filter((_, index) => index !== readNowGroupIndex && index !== downloadGroupIndex)
  const transformed = contentWithoutOriginalButtons.map((block) => {
    const text = textFromPortableBlock(block)

    if (block._type === 'block' && text === 'We must set healthcare free') {
      return { ...block, style: 'h4LegacySm' }
    }

    if (block._type === 'block' && (
      text === 'We have open standards for finance' ||
      text === 'We have open standards for transportation' ||
      text === 'We need open standards for healthcare'
    )) {
      return { ...block, style: 'h4NoBottom' }
    }

    if (block._type === 'block' && (
      text === 'because we value our money more than our health.' ||
      text === 'because getting to your destination is a necessity.' ||
      text === 'because our lives depend on it.'
    )) {
      return { ...block, style: 'normalNoTopSpacious' }
    }

    if (block._type === 'block' && text === 'Open Source Healthcare Missionette') {
      return { ...block, style: 'h2SpaciousTop' }
    }

    return block
  })

  if (readNowButton) {
    const firstHeadingIndex = transformed.findIndex((block) => textFromPortableBlock(block) === 'We must set healthcare free')
    if (firstHeadingIndex >= 0) {
      transformed.splice(firstHeadingIndex + 1, 0, {
        _type: 'buttonGroup',
        _key: `${readNowGroup?._key || 'oshc-read'}-inline`,
        layout: 'inline',
        spacing: 'legacyDouble',
        buttons: [{ ...readNowButton }],
      })
    }
  }

  if (downloadButton || blurbButton) {
    const ethosIndex = transformed.findIndex((block) => textFromPortableBlock(block).includes('Read our open source ethos'))
    const combinedButtons = [downloadButton, blurbButton].filter(Boolean).map((button) => ({ ...button }))
    if (ethosIndex >= 0 && combinedButtons.length > 0) {
      transformed.splice(ethosIndex + 1, 0, {
        _type: 'buttonGroup',
        _key: `${downloadGroup?._key || 'oshc-download'}-fullwidth`,
        layout: 'fullWidth',
        spacing: 'legacyDouble',
        buttons: combinedButtons,
      })
    }
  }

  return transformed
}

function transformFeatureContributorsForSlug(slug: string, contributors: any[] | undefined) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!contributors) {
    return contributors
  }

  if (slug === 'open-pro') {
    return contributors.map((credit) => {
      if (credit?.author?.name === 'Juhan Sonin' && !credit.roleOverride) {
        return {
          ...credit,
          roleOverride: 'GoInvo, MIT',
        }
      }

      return credit
    })
  }

  return contributors
}

export async function generateStaticParams() {
  try {
    const features = await client.fetch<Feature[]>(allFeaturesQuery)
    return features
      .filter((f) => !f.externalLink)
      .map((f) => ({
        slug: f.slug.current,
      }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: feature } = (await sanityFetch({
    query: featureBySlugQuery,
    params: { slug },
  })) as { data: Feature | null }

  if (!feature) {
    return { title: 'Vision Project Not Found' }
  }

  const ogImage = feature.image
    ? urlForImage(feature.image).width(1200).height(630).url()
    : undefined

  return {
    title: feature.title,
    description: feature.metaDescription || feature.description,
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
    twitter: ogImage ? { images: [ogImage] } : undefined,
  }
}

export default async function VisionFeaturePage({ params }: Props) {
  const { slug } = await params

  const { data: feature } = (await sanityFetch({
    query: featureBySlugQuery,
    params: { slug },
  })) as { data: Feature | null }

  if (!feature) {
    notFound()
  }

  // Hero is 1280x450 (~2.84:1) so use a closer aspect than 16:9 to
  // minimize top/bottom cropping at desktop widths
  const heroImageUrl = feature.image
    ? urlForImage(feature.image).width(1600).height(564).url()
    : null

  // Full image cover: show the complete image as page content, no hero crop
  const fullCoverUrl = feature.fullImageCover && feature.image
    ? urlForImage(feature.image).width(1920).url()
    : null

  const widthClass = feature.contentWidth === 'wide' ? '' : feature.contentWidth === 'narrow' ? 'max-width-sm' : 'max-width-md'
  const useLegacyFacesLayout = slug === 'faces-in-health-communication'
  const articleContainerClassName = useLegacyFacesLayout
    ? 'mx-auto px-4 lg:px-4'
    : `max-width ${widthClass} content-padding mx-auto`
  const articleContainerStyle = useLegacyFacesLayout ? { maxWidth: '680px' } : undefined
  const backgroundFallbacks = featureSectionBackgroundFallbacks[slug]
  const titleClassName = useLegacyFacesLayout ? 'header-xl mt-6 mb-6' : 'header-xl mt-8 mb-6'
  const showPageMeta = backgroundFallbacks?.showPageMeta ?? (feature.showPageMeta !== false)
  const transformedContributors = transformFeatureContributorsForSlug(slug, feature.contributors as any)
  const authorVariant = (backgroundFallbacks?.authorLayout || feature.authorLayout) as 'equal' | 'stacked' | 'stacked-subheading' | 'primary-sidebar' | 'plain-list' | 'legacy-text-list' | undefined
  const contributorsVariant = (backgroundFallbacks?.contributorsLayout || feature.contributorsLayout) as 'equal' | 'stacked' | 'stacked-subheading' | 'primary-sidebar' | 'plain-list' | 'legacy-text-list' | undefined
  const authorBackground = resolveSectionBackground(feature.authorBackground, backgroundFallbacks?.authorBackground || 'gray')
  const contributorsBackground = resolveSectionBackground(
    feature.contributorsBackground,
    backgroundFallbacks?.contributorsBackground || 'white'
  )
  const newsletterBackground = resolveSectionBackground(feature.newsletterBackground, backgroundFallbacks?.newsletterBackground || 'white')
  const aboutGoInvoSection = feature.showAboutGoInvo ? (
    <section className="pb-12">
      <div className={articleContainerClassName} style={articleContainerStyle}>
        <AboutGoInvo variant={feature.aboutGoInvoVariant} />
      </div>
    </section>
  ) : null
  const renderAboutAfterNewsletter = feature.aboutGoInvoPosition === 'afterNewsletter'

  return (
    <div className={slug === 'coronavirus' ? 'font-coronavirus' : undefined}>
      {/* Standard hero (cropped 16:9) — only for non-fullImageCover pages */}
      {!feature.fullImageCover && heroImageUrl && (
        <SetCaseStudyHero image={heroImageUrl} bgPosition={feature.heroPosition} />
      )}

      {/* Full image cover — render inline so the full image shows without cropping */}
      {fullCoverUrl && (
        <div className="pt-[var(--spacing-header-height)]">
          <Image
            src={fullCoverUrl}
            alt={feature.title}
            width={1920}
            height={992}
            className="w-full h-auto"
            priority
          />
        </div>
      )}

      {/* Title + meta — hidden for fullImageCover pages where the image IS the content */}
      {!feature.fullImageCover && (
        <Reveal style="slide-up" duration={0.5}>
          <div className={articleContainerClassName} style={articleContainerStyle}>
            <h1
              className={titleClassName}
              style={{ viewTransitionName: 'page-title' }}
            >
              {feature.title}
            </h1>
            {!useLegacyFacesLayout && showPageMeta && (feature.categories?.length || feature.date) && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
                {feature.categories && feature.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {feature.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs uppercase tracking-wider text-gray bg-gray-light px-3 py-1"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                {feature.date && (
                  <span className="text-gray text-sm">{feature.date}</span>
                )}
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* Content (without references — rendered separately after newsletter) */}
      {feature.content && (() => {
        let content = feature.content
        content = stripTitleHeading(content, feature.title)
        const authorHeading = feature.authors && feature.authors.length > 0
          ? findPortableHeading(content as any[], ['Authors', 'Author'])
          : undefined
        if (feature.authors && feature.authors.length > 0) {
          content = stripAuthorHeading(content, {
            stripContributors: (transformedContributors?.length ?? 0) > 0,
          })
        }
        content = transformFeatureContentForSlug(slug, content as any)
        const mainContent = content.filter((b: any) => b._type !== 'references')
        const referencesContent = content
          .filter((b: any) => b._type === 'references')
          .map((block: any) => (
            backgroundFallbacks?.referencesBackground && !block.background
              ? { ...block, background: backgroundFallbacks.referencesBackground }
              : block
          ))
        const portableTextVariant = backgroundFallbacks?.portableTextVariant || (slug === 'virtual-care' ? 'gray-body' : undefined)

        return (
          <>
            <section className="pb-12">
              <div className={articleContainerClassName} style={articleContainerStyle}>
                <PortableTextRenderer
                  content={mainContent}
                  variant={portableTextVariant}
                  bulletStyle={feature.bulletStyle as 'star' | 'disc' | undefined}
                />
              </div>
            </section>

            {/* Authors */}
            {feature.authors && feature.authors.length > 0 && (
              <section className="pb-12">
                <div className={articleContainerClassName} style={articleContainerStyle}>
                  <AuthorSection
                    authors={feature.authors}
                    heading={authorHeading}
                    variant={authorVariant}
                    background={authorBackground}
                  />
                </div>
              </section>
            )}

            {/* Contributors */}
            {transformedContributors && transformedContributors.length > 0 && (
              <section className="pb-12">
                <div className={articleContainerClassName} style={articleContainerStyle}>
                  <AuthorSection
                    authors={transformedContributors}
                    heading="Contributors"
                    variant={contributorsVariant}
                    background={contributorsBackground}
                  />
                </div>
              </section>
            )}

            {/* Special Thanks / Contributors (plain text) */}
            {feature.specialThanks && feature.specialThanks.length > 0 && (
              <section className="pb-12">
                <div className={articleContainerClassName} style={articleContainerStyle}>
                  <h3 className="header-md mt-8 mb-4">{(feature as any).specialThanksHeading || (transformedContributors && transformedContributors.length > 0 ? 'Special thanks to...' : 'Contributors')}</h3>
                  <PortableTextRenderer content={feature.specialThanks} />
                </div>
              </section>
            )}

            {/* About GoInvo (after Special Thanks) */}
            {!renderAboutAfterNewsletter && aboutGoInvoSection}

            {/* Newsletter */}
            <NewsletterSection
              background={newsletterBackground}
              cardWidth={backgroundFallbacks?.newsletterCardWidth || 'standard'}
              forceBand={Boolean(backgroundFallbacks?.forceNewsletterBand)}
            />

            {renderAboutAfterNewsletter && aboutGoInvoSection}

            {/* References (after newsletter, matching Gatsby order) */}
            {referencesContent.length > 0 && (
              <section className="pb-12">
                <div className={articleContainerClassName} style={articleContainerStyle}>
                  <PortableTextRenderer content={referencesContent} />
                </div>
              </section>
            )}
          </>
        )
      })()}
    </div>
  )
}
