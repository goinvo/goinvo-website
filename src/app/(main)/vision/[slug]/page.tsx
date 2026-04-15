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
import { stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
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
        if (feature.authors && feature.authors.length > 0) {
          content = stripAuthorHeading(content, {
            stripContributors: (feature.contributors?.length ?? 0) > 0,
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
                    variant={authorVariant}
                    background={authorBackground}
                  />
                </div>
              </section>
            )}

            {/* Contributors */}
            {feature.contributors && feature.contributors.length > 0 && (
              <section className="pb-12">
                <div className={articleContainerClassName} style={articleContainerStyle}>
                  <AuthorSection
                    authors={feature.contributors}
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
                  <h3 className="header-md mt-8 mb-4">{(feature as any).specialThanksHeading || (feature.contributors && feature.contributors.length > 0 ? 'Special thanks to...' : 'Contributors')}</h3>
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
